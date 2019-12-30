import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";

import fs from "fs";
import path from "path";
import { parseGrammar, EvalVisitor, FirstCalculator, FollowCalculator, TSCodegenVisitor, getSLRParsingTable, getLR1ParsingTable, getLR1Automata, getSLRAutomata } from "@parser-generator/core";
import { AugmentedGrammar } from "@parser-generator/definition";
import { assert } from "@light0x00/shim";

import { parser, lang, outputDir, file } from "./getopts";
import { followTableToDimArr, firstTableToDimArr, lrTableToDimArr, lrAutomataToGraph } from "./shit";

/*************************************** 生成代码文件 ****************************************/
let rawGrammar = fs.readFileSync(file, { encoding: "utf-8" });
let pragram = parseGrammar(rawGrammar);

//1. 拿到grammar对象
let evalVisitor = new EvalVisitor({ parser });
pragram.accpet(evalVisitor);
let grammar = evalVisitor.grammar;

//2. 拿到分析表
let firstTable, followTable, lrParsingTable, lrAutomata;
if (parser == "LL") {
	let fir = new FirstCalculator(grammar);
	firstTable = fir.getFirstTable();
	let fol = new FollowCalculator(grammar, fir);
	followTable = fol.getFollowTable();
} else {
	assert(grammar instanceof AugmentedGrammar);
	if (parser == "SLR") {
		lrAutomata = getSLRAutomata(grammar);
		lrParsingTable = getSLRParsingTable(grammar, lrAutomata);
	} else if (parser == "LR1") {
		lrAutomata = getLR1Automata(grammar);
		lrParsingTable = getLR1ParsingTable(grammar, lrAutomata);
	} else if (parser == "LALR") {
		throw new Error("LALR parsing table is unimplemented!");
	}
}
//3. 生成代码
let codegenVisitor: TSCodegenVisitor;
let ext: ".ts" | ".js";
if (lang == "TS") {
	codegenVisitor = new TSCodegenVisitor({ parser, firstTable, followTable, lrParsingTable });
	ext = ".ts";
} else {
	ext = ".js";
	throw new Error("JS code generator is unimplemented");
}
pragram.accpet(codegenVisitor);
let code = codegenVisitor.code;
//4. 写入文件
// fs.writeFileSync(path.resolve(outputDir, "parser" + ext), code); //TODO

/*************************************** 可视化 ****************************************/

//1. 组装模版数据
let tmplData: any = { prods: grammar.productions(), first: undefined, follow: undefined, lrTable: undefined, lrAutomata: undefined };
if (firstTable != undefined)
	tmplData.first = firstTableToDimArr(firstTable);
if (followTable != undefined)
	tmplData.follow = followTableToDimArr(followTable);
if (lrParsingTable != undefined)
	tmplData.lrTable = lrTableToDimArr(lrParsingTable);
if (lrAutomata != undefined)
	tmplData.lrAutomata = JSON.stringify(lrAutomataToGraph(lrAutomata));

webpack({
	mode: "production",
	// stats: "verbose",
	entry: path.resolve(__dirname, "../template/main.js"),
	output: { path: outputDir },
	plugins: [
		new HtmlWebpackPlugin({
			inject: true,
			templateParameters: tmplData,
			template: path.resolve(__dirname, "../template/index.html"),

		})
	]
}, (err, stats) => {
	if (err) {
		console.error(err.stack || err);
	}
	// stats.hasWarnings() || stats.hasErrors()
	console.log(stats.toString({ colors: true }));
});
