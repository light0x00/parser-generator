import path from "path";
const ROOT = __dirname;
const resolve = (p) => path.resolve(ROOT, p);
import webpack from "webpack";
import merge from "webpack-merge";
import { cloneDeep } from "lodash";

const BABEL_CONFIG = {
	"extends": "./babel-ts.json",
	"presets": [

	],
	"sourceMaps": "inline",
	"ignore": []
};


const WEBPACK_CONFIG = {
	mode: "production",
	resolve: {
		extensions: [".ts"],
	},
	module: {
		rules: [

		]
	}
};

const BABEL_LOADER = {
	test: /\.(js)|(ts)$/,
	use: {
		loader: "babel-loader",
		options: {

		}
	},
	exclude: /node_modules/,
};

const builds = [
	{
		entry: resolve("packages/definition/src/index.ts"),
		output: {
			path: resolve("packages/definition/dist/"),
			name: "index",
			modules: ["cjs", "esm"]
		}
	}
];

for (let b of builds) {
	build(b);
}


function build(b) {
	let { entry, output: { path, name, modules } } = b;

	for (let m of modules) {
		let conf = merge(WEBPACK_CONFIG,
			{
				entry,
				output: {
					path,
					filename: name + "." + m + ".js"
				}
			});

		conf.module.rules.push(newBabelLoader(m));
		// newBabelLoader
	// webpack(conf, (err, stats) => {
	// 	if (err) {
	// 		console.error(err.stack || err);
	// 	}
	// 	if (stats.hasWarnings() || stats.hasErrors())
	// 		console.log(stats.toString({ colors: true }));
	// });
	}
}

function newBabelLoader(module) {
	let loader = cloneDeep(BABEL_LOADER);
	loader.use.options = newBabelConfig(module);
	return loader;
}

function newBabelConfig(module) {
	let conf = cloneDeep(BABEL_CONFIG);
	switch (module) {
		case "esm":
			conf.presets.push(
				[
					"@babel/env",
					{
						"targets": "> 0.25%, not dead",
						"spec": false,
						"modules": "amd",
					}
				]
			);
			break;
		case "cjs":
			conf.presets.push(
				[
					"@babel/env",
					{
						"targets": "node 8.12.0",
						"spec": false,
						"modules": "commonjs",
					}
				]
			);
			break;
		default:
			throw new Error("Unknown module:" + module);
	}
	return conf;
}
