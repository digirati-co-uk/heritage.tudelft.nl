import { readFile } from "node:fs/promises";

function loadTextFile(path: string) {
  return readFile(path, "utf-8");
}

export async function macro() {
  // const output = await Bun.build({
  //   entrypoints: ['./src/dev/client.ts'],
  //   sourcemap: 'inline',
  //   target: 'browser',
  // });

  // console.log(output.outputs[0]);

  // const client = await output.outputs[0].text();

  const index = await loadTextFile(import.meta.resolveSync("./dev/index.html"));
  const indexProd = await loadTextFile(
    import.meta.resolveSync("./dev/index.prod.html"),
  );
  const clover = await loadTextFile(
    import.meta.resolveSync("./dev/clover.html"),
  );
  const explorer = await loadTextFile(
    import.meta.resolveSync("./dev/explorer.html"),
  );
  const editor = await loadTextFile(
    import.meta.resolveSync("./dev/editor.html"),
  );

  return {
    index,
    indexProd,
    clover,
    explorer,
    editor,
  };
}
