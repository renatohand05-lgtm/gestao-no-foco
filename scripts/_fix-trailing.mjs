import { readFileSync, writeFileSync } from "node:fs";

const file = "lib/financeiro/actions.ts";
let source = readFileSync(file, "utf8");
source = source.replace(
  /toActionError\(error, "([^"]+)",\s*\);/g,
  'toActionError(error, "$1");',
);
writeFileSync(file, source);
const leftovers = source.match(/toActionError\(error, "[^"]+",\s*\);/g);
console.log("leftovers", leftovers?.length ?? 0);
