import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const runCommand = promisify(execFile);
const EXAMPLES_DIR = join(process.cwd(), "examples");
const EXAMPLE_BUILD_DIR = ".vitest-dist";
const HASH_SEGMENT_PATTERN = /([._-])[A-Za-z0-9_-]{8,}(?=\.)/g;
const SEARCH_TIME_PATTERN =
  /"searchTime"\s*:\s*[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const DURATION_PATTERN = /"duration"\s*:\s*[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi;

const EXAMPLES_TO_BUILD = [
  "astro",
  "astro-save",
  "astro-config",
  "astro-routes",
] as const;

function normalizePathHashSegments(filePath: string) {
  return filePath.replace(HASH_SEGMENT_PATTERN, "$1[hash]");
}

function normalizeDynamicMetrics(content: string) {
  return content
    .replace(SEARCH_TIME_PATTERN, '"searchTime":"<normalized>"')
    .replace(DURATION_PATTERN, '"duration":"<normalized>"');
}

async function getAllFiles(directory: string, root = directory): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const allFiles = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return getAllFiles(absolutePath, root);
      }
      return [relative(root, absolutePath)];
    })
  );
  return allFiles.flat().sort((a, b) => a.localeCompare(b));
}

async function snapshotBuildOutput(outputDir: string) {
  const files = await getAllFiles(outputDir);
  const fingerprints = await Promise.all(
    files.map(async (file) => {
      const absolutePath = join(outputDir, file);
      const originalBuffer = await readFile(absolutePath);
      const fileContent = originalBuffer.toString("utf8");
      const isUtf8 = !fileContent.includes("\uFFFD");
      const normalizedContent = isUtf8
        ? normalizeDynamicMetrics(fileContent)
        : originalBuffer.toString("base64");
      const digest = createHash("sha256")
        .update(normalizedContent)
        .digest("hex")
        .slice(0, 16);
      return `${normalizePathHashSegments(file)} (${originalBuffer.byteLength}b) ${digest}`;
    })
  );

  return {
    fileCount: files.length,
    files: fingerprints,
  };
}

async function buildExample(exampleName: (typeof EXAMPLES_TO_BUILD)[number]) {
  const exampleDirectory = join(EXAMPLES_DIR, exampleName);
  const outputDirectory = join(exampleDirectory, EXAMPLE_BUILD_DIR);
  await rm(outputDirectory, { recursive: true, force: true });
  try {
    await runCommand(
      "pnpm",
      ["--dir", exampleDirectory, "exec", "astro", "build", "--outDir", EXAMPLE_BUILD_DIR],
      {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          ASTRO_TELEMETRY_DISABLED: "1",
          FORCE_COLOR: "0",
          NO_COLOR: "1",
        },
      }
    );
  } catch (error) {
    const failed = error as Error & { stdout?: string; stderr?: string };
    throw new Error(
      [
        `Failed to build examples/${exampleName}.`,
        failed.stdout?.trim() ? `stdout:\n${failed.stdout.trim()}` : "",
        failed.stderr?.trim() ? `stderr:\n${failed.stderr.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  }

  return outputDirectory;
}

describe.sequential("example build snapshots", () => {
  for (const exampleName of EXAMPLES_TO_BUILD) {
    test(
      `builds examples/${exampleName} and matches output snapshot`,
      async () => {
        const outputDirectory = await buildExample(exampleName);
        try {
          const buildSnapshot = await snapshotBuildOutput(outputDirectory);
          expect(buildSnapshot).toMatchSnapshot();
        } finally {
          await rm(outputDirectory, { recursive: true, force: true });
        }
      },
      180_000
    );
  }
});
