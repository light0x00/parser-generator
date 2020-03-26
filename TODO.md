- [ ] 支持S-SDT,考虑LL的L-SDT
- [ ] 实现词法分析器的自动生成
- [x] 实现一个完整Json解释器,作为案例
- [ ] 文法解释器重写
- [ ] 将Parser放入definition,或直接生成到输出文件中

## 文法解释器重构草案

```
#!lang=ts
@script <% import {Expr,MinusTerm,AddTerm,Factor} from './ast'%>

@token ID
@token NUM,STR

@grammar
E -> F T <%= new Expr($element) %>
T -> '+' F T | '-' F T  <%
($element,$stack)=>{
	if($element[0]=='-')
		return new MinusTerm($element)
	else
		return new AddTerm($element)
}
%>
F -> ID <%= new Factor($children) %> ;

@error <% console.error($ERROR) %>

@ap left 1 '+'
@ap left 1 '-'
@ap left 2 '*','/'
@assoc right '='
@prec -1 '='
```

### 头声明

使用 `lang=ts`形式指定目标语言

```
#!lang=ts
```

### 保留字符

保留字符包括 `<`  `>` `'` `"`, 如果在代码片段中或token字面量中使用, 需使用`\`进行转义,例如: `\<` `\"`

### 词元

```
@token <token1>
@token <token1>,...,<tokenN>
```

- [语义] token 分为两种, 一种是字面量,用于精确匹配; 另一种是词元,表示一类token,比如 1 和 2值不同,但同属于 `NumberLiteral`

### 文法

```
@grammar
<SymbolX> -> <Symbol1> ... <SymbolN> | <Symbol1> ...<SymbolN> <NodeConstructor>;
<SymbolX> -> <Symbol1> ... <SymbolN> <NodeConstructor> | <Symbol1> ...<SymbolN> <NodeConstructor>;
不推荐的写法:
<SymbolX> -> <Symbol1> ... <SymbolN> <NodeConstructor>| <Symbol1> ...<SymbolN> ;
```

- [语法] 节点构造器可以有两种形式
	- 简写形式: `<%= new Expr($element) %>` ,默认会将构造器代码块放在一个函数中,并传入子节点 (`$element`),形如 `($element,$stack)=>Constructor_Code`
	- 多行形式: `<% (element)=>constructor code %>` , 多行模式不做额外处理.
- [语法] 产生式以 NodeConstructor 结尾,`则;`是可选的, 否则必须添加`;`
- [语义] 紧随第一个左侧非终结符被视为根非终结符,由于LR分析需要一个虚拟的起始符号,因此最终文法会插入一个虚拟非终结符,它指向根非终结符. `S -> E`
- [语法] 每个产生式应当至少有一个节点构造器,如果没有,输出警告信息; 如果某一个候选式未指定,则共享其他候选式的构造器,优先从其所在位置向后面找,后面没有则从最左边开始找, 例如 `<Prod1> <<NodeConstructor1> | <Prod2> | <Prod3> <NodeConstructor> | <Prod3>` ,`Prod2`将向后找,最终使用`NodeConstructor2`,而`Prod3`由于后面没有,所以从最左边开始找,使用所遇到的第一个`NodeConstructor1`.
- [语义] 节点构造器最终会放入函数块中,该函数接收子节点(`$E`)和栈上节点, `($E,$S)=>{ Block_Code }`

### 脚本块

```
@script <block>
```
- [语法] 脚本块可以有多个
- [语义] 最终会原样写入generator的输出文件中,且保证脚本块相对于其他元素的顺序, 例: 如果一个脚本块位于`@grammar`上,那么输出文件中也位于grammar对象之上

### 优先级&结合性

```
@assoc <associate> <token1>,<token2>,...,<tokenN>
@prec <priority> <token1>,<token2>,...,<tokenN>
@assoc&prec <associate> <priority> <token1>,<token2>,...,<tokenN>
```

- [语义] 默认结合性为左结合,默认优先级为-1
- [语法] `@assoc` 单独指定结合方向,`@prec` 单独指定优先级 ,`@assoc&prec` 同时指定优先级结合性
- [语义] 如果同一符号被指定多次 assoc、prec ,那么后面的覆盖前面


### 错误定位

当存在语法错误时,打印出相邻字符,并指出错误字符.

```
Undecalared symbol at xx,xx :
E -> E + T
         ^
```