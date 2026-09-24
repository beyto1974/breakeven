/**
 * Bundles prototype/main.ts with the real engine and inlines it into a single
 * HTML file: docs/artifacts/prototype.html (artefact 2).
 */
import { readFile, writeFile } from "node:fs/promises";

const result = await Bun.build({
  entrypoints: ["prototype/main.ts"],
  target: "browser",
  format: "iife",
  minify: true,
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const [output] = result.outputs;
if (!output) throw new Error("bundle produced no output");
const script = (await output.text()).replace(/<\/script/gi, "<\\/script");
const template = await readFile("prototype/template.html", "utf8");
await writeFile("docs/artifacts/prototype.html", template.replace("<!--SCRIPT-->", `<script>${script}</script>`));
console.log(`docs/artifacts/prototype.html written (${(script.length / 1024).toFixed(1)} KiB of script)`);
