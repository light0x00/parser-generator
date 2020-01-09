
import TerserPlugin from "terser-webpack-plugin";
import OptimizeCSSAssetsPlugin from "optimize-css-assets-webpack-plugin";
import {CleanWebpackPlugin} from "clean-webpack-plugin";
import merge from "webpack-merge";
import baseConfig from "./webpack.config";

export default merge(baseConfig,{
	mode: "production",
	output: {
		publicPath: "/",
	},
	devtool: false,
	// devtool: "nosources-source-map",
	optimization: {
		sideEffects: true,
		minimize: true,
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					compress: {
						drop_console: false,
					},
					output: {
						comments: false,
					},
				},
			}),
			new OptimizeCSSAssetsPlugin({})
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
	]
});
