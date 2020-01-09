import { resolve } from "path";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import VueLoaderPlugin from "vue-loader/lib/plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
/*

*/
const ROOT = __dirname;
const ASSETS_PATHS = {
	js: "static/js/[name].[hash:8].js",
	jsChunk: "static/js/[name].[contenthash:8].js",
	css: "static/css/[name].[contenthash:8].css",
	cssChunk: "static/css/[name].[contenthash:8].css",
	font: "static/font/[name].[hash:8].[ext]",
	others: "static/others/[name].[hash:8].[ext]",
};

export default {
	entry: {
		main: resolve(ROOT, "src/main.js")
	},
	output: {
		path: resolve(ROOT, "dist/"),
		filename: ASSETS_PATHS.js,
		chunkFilename: ASSETS_PATHS.jsChunk
	},
	resolve: {
		extensions: [".vue", ".js", ".ts",".css"],
		alias: {
			"vue$": "vue/dist/vue.runtime.esm",
			"~": resolve(ROOT, "src"),
			"lodash":"lodash-es"
		},

	},
	externals: {
		"vis-network": "vis"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					{ loader: "style-loader" },
					{ loader: MiniCssExtractPlugin.loader },
					{ loader: "css-loader" },
				]
			},
			{
				test: /\.vue$/,
				loader: "vue-loader"
			},
			{
				test: /\.(js)|(ts)$/,
				loader: "babel-loader",
				exclude: /node_modules/,
				options: {
					// cacheDirectory: true
				},
			},
			{
				test: /\.(woff|woff2|eot|ttf|otf)$/,
				use: [{
					loader: "file-loader",
					options: { name: ASSETS_PATHS.font }
				}]
			},
		]
	},
	plugins: [
		new VueLoaderPlugin(),
		new MiniCssExtractPlugin({
			filename: ASSETS_PATHS.css,
			chunkFilename: ASSETS_PATHS.cssChunk
		}),
		new HtmlWebpackPlugin({
			template: resolve("src/index.html"),
			filename: `index.html`,
			chunks: ["main", "vendors", "ui", "default", "runtime"],
			favicon: resolve("public/favicon.ico"),
		}),
		new BundleAnalyzerPlugin({
			analyzerMode: "static",
			reportFilename: "../.dist/analyzer-report.html",
			openAnalyzer: false,
		}),
	],
	optimization: {
		/* webpack runtime独立打包 */
		runtimeChunk: {
			name: entrypoint => "runtime"
		},
		/* https://webpack.js.org/plugins/split-chunks-plugin/ */
		splitChunks: {
			chunks: "all",
			maxInitialRequests: 8,
			maxAsyncRequests: 5,
			minSize: 30000,
			maxSize: 0,
			minChunks: 1,
			automaticNameDelimiter: "-",
			name: true,
			cacheGroups: {
				/* ui库单独打包 */
				element_ui: {
					chunks: "initial",
					test: /[\\/]node_modules[\\/]_?element-ui(.*)/,
					name: "ui",
					// priority: 20,
				},
				element_css: {
					chunks: "initial",
					test: /src\/styles\/element-ui-theme/,
					name: "ui",
					// priority: 20,
				},
				/* 同步的第三方库 */
				vendors: {
					chunks: "initial",
					test: /[\\/]node_modules[\\/]/,
					// priority: 17,
					name: "vendors",
				},
			}
		}
	}
};