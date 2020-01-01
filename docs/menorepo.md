# yarn&lerna

```
操作指定模块
yarn workspace
e.g: yarn workspace foo-module add lodash
e.g: yarn workspace foo-module remove lodash

操作所有模块(没用)
yarn workspaces xx

操作根(一般是共享的构建期用的模块)
yarn xx -W
e.g: yarn add typescript -D -W

执行某个模块的npm-script
yarn workspace foo-module run test

对每个模块执行npm/yarn/其他命令
lerna exec -- npm run xx
lerna exec -- yarn run xx
e.g: lerna exec -- npm run test

按照依赖关系执行所有模块的npm-script
lerna run xx --stream --sort
e.g: lerna run build --stream --sort
```

# 发布流程

版本更新模式:

1. 统一更新版本,为每个package统一的版本,即使package没有修改.

	```
	//lerna.json
	"version": "x.x.x"
	```

2. 单独更新版本,每个package单独根据实际情况确定版本.

	```
	//lerna.json
	"version": "independent"
	```



一个完整的发布流程包含如下步骤:

1. 版本更新,git提交遵循`Conventional Commit`规范,版本号变更遵循`Semantic Versioning`规范. 这样,每当在发布时,根据conventional-commit-message,自动变更版本号:
- feat提交: 更新minor版本
- fix提交:  更新major版本
- BREAKING CHANGE提交: 需要更新大版本

2. 如果版本变更后,如果workspace里的package之间存在依赖,则还需将依赖版本与发布版本同步更新.考虑如下例子,如果module-b依赖于module-a,则module-a的版本变更时也需要将module-b的版本同步更新.

	```
	packages/
		module-a
		module-b
	```

3. changelog,每个package都有独立的`CHANGELOG.md`文件,该文件根据每一次conventional-commit-message自动维护.

4. milestone commit & tag & push,发布时自动生成一个"发布版本",并为该版本生成git tag,执行git push.

5. publish,发布到registry

## lerna version

`lerna version`用于完成上述1~4步,手工为每个package选择版本号:

```
$  compiler-tools git:(master) lerna version

? Select a new version for @light0x00/parser-definition (currently 0.0.2) Patch (0.0.3)
? Select a new version for @light0x00/parser-generator (currently 0.0.2) (Use arrow keys)
❯ Patch (0.0.3)
  Minor (0.1.0)
  Major (1.0.0)
  Prepatch (0.0.3-alpha.0)
  Preminor (0.1.0-alpha.0)
  Premajor (1.0.0-alpha.0)
  Custom Prerelease
  Custom Version
```

如果遵循`Conventional Commit`规范,则可附加选项`--conventional-commits`, lerna将遵循`Semantic Versioning`规则,自动为每个模块选择合适的版本号:

```
$  compiler-tools git:(master) lerna version --conventional-commits

Changes:
 - @light0x00/parser-definition: 0.0.2 => 0.1.0
 - @light0x00/parser-generator: 0.0.2 => 0.1.0
 - @light0x00/parser: 0.0.1 => 0.1.0 (private)
 - @light0x00/shim: 0.0.1 => 0.1.0

? Are you sure you want to create these versions? (ynH)
```

需要注意lerna生成的milestone commit默认不遵循`Conventional Commit`,需要附带`--message`设置,或在lerna.json里设置:

```
"command": {
	"publish": {
		"message": "chore: publish"
	}
}
```

> [官方文档](https://github.com/lerna/lerna/tree/master/commands/version#options)

## lerna publish

```
lerna publish          # publish packages that have changed since the last release
lerna publish from-git # explicitly publish packages tagged in current commit
lerna publish from-package # explicitly publish packages where the latest version is not present in the registry
```

> [官方文档](https://github.com/lerna/lerna/tree/master/commands/publish#readme)

# lint

## es-lint

- eslint
- @typescript-eslint/eslint-plugin
- @typescript-eslint/parser

```
//.vscode/setting.json
"eslint.validate": [
	"javascript",
	"typescript",
],
```

## git hook

- **husky**			,git hook
- **lint-staged**	,lint 暂存区的文件
- **@commitlint/cli**	,提交信息lint工具
- **@commitlint/config-conventional**,提交信息lint规则

# codecov&nyc

- codecov
- nyc
- mocha

# typescript

项目结构

```
├── packages
│   ├── foo
│   │   ├── tsconfig.foo.json
│   └── bar
│       └── tsconfig.bar.json
└── tsconfig.base.json
```

- foo的package name为: @light0x00/foo
- bar的package name为: @light0x00/bar

## 1. 重构问题

假如foo依赖了bar,正常的顺序是,先编译bar,然后foo依赖bar编译后的`d.ts`, 这样有一个问题是,如果bar产生了refactor,相应的foo无法同时变更,而需要手动更改.

通过路径映射可以解决这一问题. 将package name 映射到本地文件,这样ts就会把`import @light0x00/bar` 理解为本地ts文件,而不是一个npm package, 从而可以支持重构.

```
// tsconfig.base.json
"paths": {
	"@light0x00/foo": [
		"packages/foo/src"
	],
	"@light0x00/bar": [
		"packages/bar/src"
	]
},
```

如果你的package name和文件路径刚好一致,你也可以使用匹配符`"@light0x00/*"`去映射`packages/*/src`.

## 2. reference

上一步将带来一个新的问题,即foo会依赖rootDir之外的ts源码.

通常,我们会将package的编译结果放在lib目录中, 比如我们希望foo的编译结果放在`packages/foo/lib`中:

```
//tsconfig.foo.json
"compilerOptions": {
	"rootDir": "src",
	"outDir": "lib",
}
```

可是,这样在编译时会产生错误,即我们依赖了`packages/bar/src`中的ts源码,这个源码也是需要编译的,但是我们确告诉ts我们的源码根目录为`packages/foo/src`, 这让ts感觉有点矛盾.

这种情况,可以通过"reference"来为告诉ts,引用了哪些未经编译的ts文件,但这些文件并不位于rootDir中.

比如foo的rootDir为`packages/foo/src`,但是foo依赖了`@light0x00/bar`,这个模块在上一步被映射到了:`packages/bar/src`,可是这个目录不在foo的rootDir中,typescript会报错, 因此需要显式的告诉ts: "我有一个依赖的子模块在另一个文件夹,你去那儿看看,它有一个自己的tsconfig文件,你按照那个去编译它吧"

```
//tsconfig.foo.json
"reference": ["packages/bar"]
```

## 3. 编译

如果我们希望在根目录进行一次性编译(而不是在每个子模块分别编译),可在`tsconfig.base.json`添加子模块的`references`, 这就像在告诉ts, ”我有两个子模块需要编译,分别位于`packages/foo`和`packages/bar`,它们都有自己的tsconfig,你按照那个编译“.

```json
//tsconfig.base.json
"references": [
	{
		"path": "packages/foo"
	},
	{
		"path": "packages/bar"
	}
]
```

要注意`references` 特性需要配合 `--build`模式使用,因为tsc(v3.7)默认不识别该选项.

虽然我们理想中, `tsconfig.base.json` 只用于被继承,而不生成文件. 但是tsc并不这么认为, 如果我们在根目录执行`tsc --build`,
那么将得到一个如下结构,编译将输出两次文件,位于`package/*/lib`中的文件是根据子模块的`tsconfig.json`生成的,而`package/*/src/`中的文件是由`tsconfig.base.json` 生成的.

```
./packages
├── foo
│   ├── lib
│	│   ├── index.d.ts
│   │   ├── index.d.ts.map
│   │   ├── index.js
│   │   ├── index.js.map
│   │   └── index.ts
│   ├── package.json
│   ├── src
│   │   ├── index.d.ts
│   │   ├── index.d.ts.map
│   │   ├── index.js
│   │   ├── index.js.map
│   │   └── index.ts
│   └── tsconfig.json
└── bar
	....
```

解决这一问题,只需要在`tsconfig.base.json`中添加如下配置,这将告诉tsc:"tsconfig.base.json是用来被继承的,别生成文件!"

```json
//tsconfig.base.json
"include":[]
//或
"file":[]
```

现在,我只需要在根目录执行`tsc --build`即可一次性编译所有子模块. tsc会自动根据依赖关系决定编译顺序,如果模块间存在循环依赖,将产生如下错误:

```
error TS6202: Project references may not form a circular graph.
```

与lerna不同的是,tsc是根据tsconfig.json中的references来判断是否存在环,lerna是通过package.json里的依赖来判断的.

## 4. 调试

在单体应用中,ts-node是简单高效的选择,但是在聚合项目(monorepo)中,foo依赖了bar, 如果我们修改了bar,ts-node不会去编译bar,因此bar中的修改在运行时不会生效,甚至会出现错误.

因此,需要用一个后台任务对所有子模块做增量编译,只需在根目录执行`tsc --build --watch`, 这样对每一个子模块的修改都可以实时更新(编译到js).

下一步,配置ide,映射「源码」到「编译结果」的关系,如果是vscode,则只需添加`outFiles`选项即可.
这相当于告诉vscode:"每当我运行一个ts文件的时候,你就去packages/*/lib下找对应的js执行".

```json
//launch.json
{
	"type": "node",
	"name": "DEBUG",
	"request": "launch",
	"program":"${file}",
	"outFiles":["${workspaceFolder}/packages/*/lib/*.js"]
}
```

## 5. tsc+babel+lerna

在兼容旧的js版本上,tsc并不太专业,如果有兼容的需求,更好的选择是babel.babel负责编译js,而tsc负责生成d.ts文件. 因此,在每个子模块中,会有如下配置:

```json
"babel": "babel --extensions \".ts\" --copy-files --root-mode upward",
"prebuild": "rimraf rm lib",
"build": "tsc --emitDeclarationOnly && yarn run babel src --out-dir lib",
```

一般在开发阶段,我们可以全局运行`tsc -b -w`. 而在发布阶段,则需要使用lerna来自动的按依赖关系顺序构建,这里需要注意的是,`tsc -b`将会在每个子模块产生一个缓存文件`tsconfig.tsbuildinfo`(猜测该文件用于实现增量编译),我们需要运行`tsc -b --clean`删除这些缓存,否则后面的`tsc --emitDeclarationOnly`就会被缓存文件误导,而不生成d.ts

```
"build": "tsc -b --clean && lerna run --stream --sort build",
```
