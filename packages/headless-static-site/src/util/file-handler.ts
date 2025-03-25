import { join, relative } from "node:path";
import { copy } from "fs-extra/esm";
import PQueue from "p-queue";
import type { IFS } from "unionfs";
import { parse as parseYaml } from "yaml";
import { isEmpty } from "./is-empty";
import { makeProgressBar } from "./make-progress-bar";

export class FileHandler {
  fs: IFS;
  toSave: Set<string> = new Set();
  openJsonMap: Map<string, object> = new Map();
  openJsonChanged: Map<string, boolean> = new Map();
  openBinaryMap: Map<string, Buffer> = new Map();
  openBinaryChanged: Map<string, boolean> = new Map();
  directories: Set<string> = new Set();
  root: string;
  copyTargets: Map<string, { from: string; options: any }> = new Map();
  ui: boolean;

  constructor(fs: IFS, root: string, ui = false) {
    this.fs = fs;
    this.root = root;
    this.ui = ui;
  }

  dirExists(path: string) {
    return this.fs.existsSync(path);
  }

  dirIsEmpty(path: string) {
    const resolvePath = this.resolve(path);
    const isEmptyOnDisk = isEmpty(resolvePath);

    if (!isEmptyOnDisk) {
      return false;
    }

    const allFiles = [...Array.from(this.openJsonMap.keys()), ...Array.from(this.openBinaryMap.keys())];
    return allFiles.filter((file) => file.startsWith(resolvePath)).length === 0;
  }

  resolve(path: string) {
    let out = "";
    if (path.startsWith("/")) {
      out = join(this.root, relative(this.root, path));
    } else {
      out = join(this.root, path);
    }

    // console.log({ in: path, out, root: this.root });

    return out;
  }

  exists(filePath: string) {
    if (this.openJsonMap.has(this.resolve(filePath))) {
      return true;
    }

    return this.fs.existsSync(filePath);
  }

  existsBinary(filePath: string) {
    if (this.openBinaryMap.has(this.resolve(filePath))) {
      return true;
    }

    return this.fs.existsSync(filePath);
  }

  async loadJson(path: string, fresh = false) {
    const filePath = this.resolve(path);
    // Returns empty object if not exists.
    if (!this.exists(filePath)) {
      return {};
    }
    return this.openJson(filePath, true, fresh);
  }

  async copy(from: string, to: string, options: any) {
    this.copyTargets.set(to, { from, options });
  }

  async readFile(path: string) {
    const filePath = this.resolve(path);
    if (this.openBinaryMap.has(filePath)) {
      return this.openBinaryMap.get(filePath) as Buffer;
    }

    const data = await this.fs.promises.readFile(filePath);
    this.openBinaryMap.set(filePath, data);
    return data;
  }

  async readYaml(path: string) {
    const filePath = this.resolve(path);
    const data = await this.readFile(filePath);

    return parseYaml(data.toString("utf-8"));
  }

  async openJson(path: string, allowEmpty = false, fresh = false) {
    const filePath = this.resolve(path);
    if (!fresh && this.openJsonMap.has(filePath)) {
      return this.openJsonMap.get(filePath);
    }

    try {
      const data = await this.fs.promises.readFile(filePath, "utf-8");
      if (!data && allowEmpty) {
        return {};
      }

      const json = JSON.parse(data);
      this.openJsonMap.set(filePath, json);
      this.openJsonChanged.set(filePath, false);
      return json;
    } catch (err) {
      if (allowEmpty) {
        return {};
      }
      console.log("Error loading: ", filePath);
      throw err;
    }
  }

  async mkdir(path: string) {
    await this.fs.promises.mkdir(path, { recursive: true });
  }

  async saveJson(path: string, data: object, force = false) {
    const filePath = this.resolve(path);
    const existing = this.openJsonMap.get(filePath);
    if (!existing) {
      // @todo maybe load file so we can check if we need to save it?
    } else {
      // If it does exist, we could check if its changed - although might be more compute than just saving it.
    }

    this.openJsonMap.set(filePath, data);

    if (force) {
      await this.writeFile(filePath, JSON.stringify(data, null, 2));
      return;
    }

    this.openJsonChanged.set(filePath, true);
  }

  async writeFile(path: string, data: any) {
    const filePath = this.resolve(path);
    await this.fs.promises.writeFile(filePath, data);
  }

  async saveAll(force = false) {
    const queue = new PQueue();

    // Open JSON
    const files = Array.from(this.openJsonMap.keys())
      .filter((k) => (force ? true : this.openJsonChanged.get(k)))
      .map((k) => [k, this.openJsonMap.get(k)] as const);

    // Open binary
    const binaryFiles = Array.from(this.openBinaryMap.keys())
      .filter((k) => (force ? true : this.openBinaryChanged.get(k)))
      .map((k) => [k, this.openBinaryMap.get(k)] as const);

    const progress = makeProgressBar("Writing files", files.length + binaryFiles.length, this.ui);

    for (const [filePath, data] of files) {
      queue.add(async () => await this.writeFile(filePath, JSON.stringify(data, null, 2)));
    }

    for (const [filePath, data] of binaryFiles) {
      queue.add(async () => await this.writeFile(filePath, data));
    }

    // Copy fields.
    const copyKeys = Array.from(this.copyTargets.keys());
    for (const key of copyKeys) {
      // biome-ignore lint/style/noNonNullAssertion: This is from the copyTargets map.
      const { from, options } = this.copyTargets.get(key)!;
      queue.add(async () => await copy(from, key, options));
    }

    queue.on("completed", () => progress.increment());

    await queue.onIdle();
    progress.stop();

    // Clear all copy targets.
    this.copyTargets.clear();
    this.openJsonChanged.clear();
    this.openBinaryChanged.clear();
  }

  async cachePathExists(to: string) {
    try {
      await this.fs.promises.stat(to);
      return true;
    } catch (e) {
      return false;
    }
  }
}
