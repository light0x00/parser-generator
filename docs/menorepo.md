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



