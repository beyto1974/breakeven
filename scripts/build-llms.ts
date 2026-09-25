/**
 * Writes public/params.json and public/llms.txt from the query contract
 * (src/query/contract.ts) so an LLM — or any other tool — can learn the
 * report's query parameters and build a URL without reading the source.
 * Runs before `next build`, so `next export` copies both into out/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { buildQueryContract } from "../src/query/contract";

const basePath = (process.env.BASE_PATH ?? "/").replace(/\/+$/, "") || "/";
const root = basePath.endsWith("/") ? basePath : `${basePath}/`;
const contract = buildQueryContract(basePath);

await mkdir("public", { recursive: true });

await writeFile("public/params.json", `${JSON.stringify(contract, null, 2)}\n`);

const numericRows = contract.numeric
  .map((f) => `| \`${f.key}\` | ${f.default}${f.money ? " (money)" : ""}${f.integer ? " (integer)" : ""} | ${f.min} – ${f.max} |`)
  .join("\n");
const textRows = contract.text
  .map((f) => `| \`${f.key}\` | ${JSON.stringify(f.default)} | ${f.maxLength ? `1 – ${f.maxLength} chars` : "validated format"} |`)
  .join("\n");

const llmsTxt = `# Break-even

> A generic, stateless profitability projection. The query string is the report's
> only state: every setting is a query parameter, so a link *is* the report.
> There is no API, no login and nothing stored.

To generate a report URL, append query parameters to this site's root
(\`${root}\`). Unknown or out-of-range values fall back to their default
and are shown as warnings; omitted values use the default.

Example: \`${contract.exampleUrl}\`

Full machine-readable schema: [params.json](${root}params.json)

## Numeric parameters

| Param | Default | Range |
|---|---|---|
${numericRows}

## Text parameters

| Param | Default | Constraint |
|---|---|---|
${textRows}

## Choice parameters

- \`lang\`: ${contract.lang.choices.join(", ")} (default: ${contract.lang.default})
- \`goal\`: ${contract.goal.choices.join(", ")} (absent means the target solver is closed)
- \`solve\`: ${contract.solve.choices.join(", ")} (default: ${contract.solve.default}; only used while \`goal\` is set)

\`locale\`, \`customer\`, \`unit\` and \`title\` default to a per-language set (see
\`languageDefaults\` in params.json) rather than a single fixed value.
`;

await writeFile("public/llms.txt", llmsTxt);

console.log("public/params.json and public/llms.txt written");
