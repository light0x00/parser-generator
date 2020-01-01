由社区带来的一些妥协

- [ ] babel文件ignore问题,构建生产模式时,需要手动删除__tests__, https://github.com/babel/babel/pull/10887
- [ ] 构建只能全局`tsc -b`或`tsc -b --clean && lerna build`. 由于ts的build-mode的缓存原因,如果单独的使用`tsc --emitDeclarationOnly && babel`构建某一个模块,无法生成声明文件, 而如果使用`tsc -b --clean`清除缓存,又将导致依赖的模块的构建也被删除. 因此,这个问题无解.
- [ ] 假如A依赖B,每当B重新编译,在A模块typescript总是报告`cannot found module B`, 目前monorepo在ts上体验极差.
- [ ] package.json无法继承,导致每个子模块都要复制粘贴大量重复内容,不利于维护.