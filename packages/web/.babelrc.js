const path = require("path")
const fs = require("fs")
const ROOT = __dirname;

/* 目标: 如果有theme目录,就用自定义主题,否则使用ui库自带的 */
const STYLE_PATH = path.resolve(ROOT, "src/styles/theme");
const EXISTS_CUSTOM_STYLE = fs.existsSync(STYLE_PATH);

module.exports = {
	"presets": [
		[
			"@babel/env",
			{
				"targets": { "esmodules":true },
				"modules": false,
				"exclude":["transform-.*"]
			}
		]
	],
	"plugins": [
		"@babel/plugin-proposal-optional-chaining",
		"@babel/plugin-transform-runtime",
		[
			/* https://github.com/ant-design/babel-plugin-import */
			"import",
			{
				"libraryName": "element-ui",
				"libraryDirectory": "lib", /* js库的基路径 */
				"styleLibraryDirectory": EXISTS_CUSTOM_STYLE ? undefined : "lib/theme-chalk", /* css库的基路径 */
				"customStyleName": EXISTS_CUSTOM_STYLE ? ((compName) =>path.resolve(STYLE_PATH, compName)) : undefined /* css的路径 */
				// "customName": (compName)=>{console.log(compName);return `${STYLE_PATH}/${compName}`} /* js库的路径 */
			},
		],

	]
}