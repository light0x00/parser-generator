import HtmlWebpackPlugin = require("html-webpack-plugin");
import webpack = require("webpack");
import path from "path";

let compiler = webpack({
	mode: "development",
	// stats: "verbose",
	entry: path.resolve(__dirname, "../template/main.js"),
	output: { path: path.resolve(__dirname, "../dist") },
	plugins: [
		new HtmlWebpackPlugin({
			inject: true,
			templateParameters: { "users": ["fred", "barney"] ,table :[["a1","a2"],["b1","<script>"]]},
			template: path.resolve(__dirname, "../template/index.html"),

		})
	]
});
//
compiler.run((err, stats) => { // Stats Obje
	// ...
	if (err) {
		console.error(err.stack || err);
		return;
	}
	console.log(stats.toString({ colors: true }));
	// const info = stats.toJson({});

	// if (stats.hasErrors()) {
	// 	console.error(info.errors.toString());
	// }

	// if (stats.hasWarnings()) {
	// 	console.warn(info.warnings.toString());
	// }


});
