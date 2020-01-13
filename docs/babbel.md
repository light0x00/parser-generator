

# @babel/preset-env

preset-env是一个开箱即用的babel预设,使用它,你需要先安装以下3个库, 后文中,根据不同需求,你可需要额外安装不同的库.

```
	"@babel/cli": "^7.7.7",
    "@babel/core": "^7.7.7",
    "@babel/preset-env": "^7.7.7",
```

本文主要介绍该插件的主要配置,以及一些个人的理解.

# targets

Describes the environments you support/target for your project.

> 环境包含 chrome，opera，edge，firefox，safari，ie，ios，android，node，electron,详见[browserslist 官方文档](https://github.com/browserslist/browserslist)

**兼容旧的node**: ` "targets": "node 8.12.0"`

**兼容旧的browser**: `"targets": "> 0.25%, not dead"`,

**不需要兼容浏览器需求**: `"targets": { "esmodules": true }`,需要注意,即使这样,@babel/preset-env也有一些默认的转换,比如async/await语法会使用 `_asyncToGenerator`,该函数是babel自带的helper函数. 如果不希望启用这些默认的行为,可以参见后文的`exclude`

> babel默认会把helper函数在每一个文件copy一遍,使用 transform-runtime 可以让babel使用导入的方式引入helper函数, 避免无意义的增大编译出的文件. 后文会讲到.

如果不指定targets选项,@babel/preset-env 默认将转换所有2015+的代码,这也意味这你需要添加polyfill,参见后文的`useBuiltIns`

# modules

要转换的模块标准:

- 如果只希望在node环境运行,node标准, `modules: cjs`
- 如果希望能在browser、node环境均可运行,选择asm/umd标准, `"amd" | "umd"`
- 如果不希望转换模块, `modules:false`

> 如果源码是用cjs,但是想编译为esm,添加 ` "plugins": ["transform-commonjs-es2015-modules"]`

> 如果源码是esm,且使用webpack,并有tree-shaking的需求,设置`modules:false`,因为tree-shaking只对esm生效.

# useBuiltIns

用来控制polyfill的使用方式,包含`regenerator-runtime`、`core-js`, 前者在旧的js环境实现了async/await的polyfill, 后者则提供了对新版的api的polyfill.

**usage**

如果希望由babel自动按需引入polyfill, `"useBuiltIns":"usage"` (推荐的方式).

但需要确保,你已经`npm i regenerator-runtime`、`npm i core-js`.

**entry**

如果希望在入口处全量引入, `"useBuiltIns":"entry"` ,这种方式需要自行在入口文件处导入polyfill:

```
//your entry file
import "regenerator-runtime";
import "core-js";
```

如果没有添加polyfill,又希望适配旧的js,`ReferenceError: regeneratorRuntime is not defined`

**false**,什么事都不做,但是生成的代码仍旧可能包含上述polyfill的api.如果希望babel不使用polyfill,换句话说,你没有适配旧js的需求,后面会介绍如何告诉babel不要使用polyfill.

# core-js

如果你有polyfill的需求(设置了`useBuiltIns`的值为`usage`、`entry`), 则在此处设置你corejs版本`"corejs":3`

# include/exclude

`@preset/env`的目标是开箱即用,里面包含了很多默认行为,即包含很多plugin,[内置插件列表](https://github.com/babel/babel/blob/master/packages/babel-preset-env/data/plugin-features.js). 有时有些插件不是我们想要的,就可以通过exclude来排除.

设想一个场景,我们不需要兼容旧的js环境,而是为了用babel做一些其他事.举个例子,我们使用element-ui,这个库提供了一个 babel-component-plugin用于tree-shaking,并且有且只有这一种方式,因此,我们"被迫的"需要使用babel.(这大概前端社区的传统异能)

作为例子,我们的babel配置如下,`"esmodules": true`会让babel不使用来自core-js和regenerator-runtime的polyfill

```json
{
	"presets": [
		[
			"@babel/env",
			{
				"targets": {
					"esmodules": true
				},
				"modules": false,
			}
		]
	]
}
```

如下是一个使用async/await的代码

```js
export default async function hello(){
	return new Promise((rs,rj)=>{
		rs("ohayo")
	})
}
```

如下是babel的打包结果

```js
function asyncGeneratorStep(){...}  //省略
function _asyncToGenerator(fn) {...} //省略

export default function hello() {
  return _hello.apply(this, arguments);
}
function _hello() {
  _hello = _asyncToGenerator(function* () {
    return new Promise((rs, rj) => {
      rs("ohayo");
    });
  });
  return _hello.apply(this, arguments);
}
```

可以看到,async/await语法被转换为了`_asyncToGenerator`, 该方法来自`@babel/runtime`,通常被称为「babel的helper方法」.

但我们的目标是,不希望babel为我们的代码提供ployfill,为此,我们需要使用exclude排除一些不希望启用的plugin

```
"exclude":["transform-async-to-generator"]
```

排除后再次编译,我们将看见一个干净的输出文件:

```
export default async function hello() {
  return new Promise((rs, rj) => {
    rs("ohayo");
  });
}
```

exclude也可以支持正则,如下配置将禁用名称以`transform-`开头的plugin

```
"exclude":["transform-.*"]
```

# helpers 重用

大部分时候,我们还是需要babel来转换我们的代码的,转换的过程,其实就是用polyfill来作为「新的语法、api」的替代品. polyfill一部分来自与`core-js`、`regenerator-runtime`(上文已经讲过),另一部分则来自于`@babel-runtime`.

在上一个例子的编译结果中,我会看到babel-preset-env插入了下面两个函数:

```
function asyncGeneratorStep(){}

function _asyncToGenerator(fn) {}
```

通过上文`exclude`中的例子,我们应该直到,这些转换函数是preset-env内置plugin生成的. 默认情况下,这些转换函数会在每个需要它们的文件都copy一份.  按照期望,我们希望以 `import "@babel/runtime/xxx"`的方式引入,而不是copy.

完成这个工作,需要添加`"@babel/plugin-transform-runtime"`

```json
"plugins":[
		[
			"@babel/plugin-transform-runtime",
			{
				/* 按需导入bebel内置的helper函数 */
			  "helpers": true
			}
		]
	]
```

# ployfill总结

由上文可知,polyfill的组成:

- `core-js`
- `regenerator-runtime`
- `@babel-runtime`

在使用babel-preset-env的过程中,

- 如果你需要兼容旧的js,那么你最好导入上述3个依赖,并借助`@babel/plugin-transform-runtime`实现helper方法重用
	> 如果你嫌安装3个库麻烦,那么可以使用@babel/runtime-corejs2.
	> @babel/runtime-corejs2 is a library that contain's Babel modular runtime helpers and a version of regenerator-runtime as well as core-js.

- 如果你不用兼容旧的js,那么你需要做两件事,以确保编译出的文件运行时不会抛出`xxx is undefined`
	1. 禁用了core-js、regenerator-runtime `"targets": { "esmodules": true }`,
	2. 禁用了preset-env中的transform插件, `"exclude":["transform-.*"]`

# 最佳实践

需要兼容旧js

```
npm i core-js regenerator-runtime @babel/runtime
```

```json
{
	"presets": [
		[
			"@babel/env",
			{
				/* 兼容的环境  */
				"targets": "> 0.25%, not dead",
				/* 按需导入core-js、regenerator填充 */
				"useBuiltIns":"usage",
				/* corejs版本(取决于你实际安装的版本) */
				"corejs":3,
				/* 输出的模块标准(默认commonjs,如果你使用esm,且不希望转换为cjs,设置为false) */
				"modules": false,
				/* 编译是否严格遵守规范 */
				"loose":true,
				"spec":true
			}
		]
	],
	"plugins":[
		[
			"@babel/plugin-transform-runtime",
			{
			 /* 按需导入bebel内置的helper函数 */
			  "helpers": true
			}
		]
	]
}
```

> 如果是js环境是node,只需将上面的`"targets": "node 8.12.0"`


如果不需要兼容旧的js,也不需要转换模块标准,下面的设置相当于禁用了preset-env, 建议直接删除该预设

```json
{
	"presets": [
		[
			"@babel/env",
			{
				"targets": {
					"esmodules": true
				},
				"modules": false,
				"exclude":["transform-.*"],
			}
		]
	]
}
```

如果不需要兼容,源码为esm,希望输出为cjs

```json
{
	"plugins":[
		"@babel/plugin-transform-modules-commonjs"
	]
}
```

> 该插件将esm转换为cjs时,会在exports上挂一个`__esModule:true`

如果不需要兼容,源码为cjs,希望输出为esm

```json
{
	"plugins":[
		"transform-commonjs-es2015-modules"
	]
}
```

# typescript

```json
{
	"presets":[
		[
			"@babel/preset-typescript",
			{
				"isTSX": false
			}
		]
	],
	"plugins": [
		"@babel/plugin-proposal-numeric-separator",
		"@babel/proposal-class-properties",
		"@babel/proposal-object-rest-spread",
		"@babel/plugin-proposal-optional-chaining",
		"@babel/plugin-transform-named-capturing-groups-regex",
		"@babel/plugin-syntax-dynamic-import",
		[
			"module-resolver",
			{
				"root": [
					"./"
				],
				"alias": {
					"@": "./src",
					"test": "./test"
				}
			}
		]
	],
	"sourceMaps": "inline"
}
```
