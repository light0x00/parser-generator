#!/usr/bin/env node
import getopts from "getopts";
import fs from "fs";
import path from "path";
import { codegen } from "./codegen";

const options = getopts(process.argv.slice(2), {
	alias: {
		help: "h",
		file: "f",
		output: "o",
		parser: "p",
		lang: "l"
	},
	default: {
		parser: "LR1",
		lang: "TS"
	}
});
if (options.help) {
	console.log("usage: pgen [-f|--file] [-o|--output] [-p|--parser] [-l|--lang]");
	process.exit(0);
}
let { file, output: outputDir, parser, lang } = options;
/* 校验 */
if (file == undefined) {
	console.log(`The option "file" is required`);
	process.exit(1);
} else if (!fs.statSync(file).isFile()) {
	console.log(`The path doesn't exists:` + file);
	process.exit(1);
}
if (outputDir == undefined) {
	console.log(`The option "output" is required`);
	process.exit(1);
} else if (!path.isAbsolute(outputDir)) {
	outputDir = path.resolve(process.cwd(), outputDir);
}
if (!fs.statSync(outputDir).isDirectory()) {
	console.log(`The output path doesn't exists,or isn't a directory:` + outputDir);
	process.exit(1);
}
parser = parser.toUpperCase();
let supposedParser = ["LL", "SLR", "LR1", "LALR"];
if (supposedParser.indexOf(parser) == -1) {
	console.log(`The value "${parser}" is invalid for option "parser",expected is one of ` + supposedParser.join(","));
	process.exit(1);
}
lang = lang.toUpperCase();
let supposedLang = ["TS", "JS"];
if (supposedLang.indexOf(lang) == -1) {
	console.log(`The value "${parser}" is invalid for option "parser",expected is one of ` + supposedLang.join(","));
	process.exit(1);
}

codegen({ parser, lang, outputDir, file });