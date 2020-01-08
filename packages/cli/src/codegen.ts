import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import fs from "fs";
import path from "path";
import { genParser, LangType, ParserType ,adapter} from "@parser-generator/grammar-interpreter";

export type CodegenConfig = { parser: ParserType, lang: LangType, outputDir: string, file: string }

const TEMPLATE_PATH = path.resolve(__dirname, "./template/index.html");
const LR_ENTRY_PATH = path.resolve(__dirname, "./template/lr.js");
const LL_ENTRY_PATH = path.resolve(__dirname, "./template/ll.js");

export function codegen({ parser, lang, outputDir, file }: CodegenConfig) {
	/*************************************** 生成代码文件 ****************************************/
	let rawGrammar = fs.readFileSync(file, { encoding: "utf-8" });

	let { code, grammar, firstTable, followTable, lrTable, lrAutomata } = genParser(rawGrammar, { parser, lang });

	//1. 生成parser
	let ext = lang == "TS" ? ".ts" : ".js";
	fs.writeFileSync(path.resolve(outputDir, "parser" + ext), code);

	//2.生成模版
	let tmplData: any = { prods: grammar.productions(), first: undefined, follow: undefined, lrTable: undefined, lrAutomata: undefined };
	if (firstTable != undefined)
		tmplData.first = adapter.firstTableToDimArr(firstTable);
	if (followTable != undefined)
		tmplData.follow = adapter.followTableToDimArr(followTable);
	if (lrTable != undefined)
		tmplData.lrTable = adapter.lrTableToDimArr(lrTable);
	if (lrAutomata != undefined)
		tmplData.lrAutomata = JSON.stringify(adapter.lrAutomataToGraph(lrAutomata));
	let entry = parser == "LL" ? LL_ENTRY_PATH : LR_ENTRY_PATH;
	webpack({
		mode: "production",
		// stats: "verbose",
		entry,
		output: { path: outputDir },
		plugins: [
			new HtmlWebpackPlugin({
				inject: true,
				templateParameters: tmplData,
				template: TEMPLATE_PATH,
			}),
			new webpack.BannerPlugin(`Copyright (c) 2019 light
			Licensed under the MIT License (MIT), see
			https://github.com/light0x00/parser-generator`),
		]
	}, (err, stats) => {
		if (err) {
			console.error(err.stack || err);
		}
		if (stats.hasWarnings() || stats.hasErrors())
			console.log(stats.toString({ colors: true }));
	});
}