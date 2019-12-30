import shell from "shelljs";
import { resolve } from "path";

let bin = resolve(__dirname, "../src/index.ts");
let f = resolve(__dirname, "./grammar.txt");
let o = resolve(__dirname, "../dist");

shell.exec(`yarn ts-node ${bin} -p lr1 -l ts -f ${f} -o ${o}`);