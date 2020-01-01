
[![Build Status](https://travis-ci.com/light0x00/parser-generator.svg?branch=master)](https://travis-ci.com/light0x00/parser-generator)
[![codecov](https://codecov.io/gh/light0x00/parser-generator/branch/master/graph/badge.svg)](https://codecov.io/gh/light0x00/parser-generator)
[![CodeFactor](https://www.codefactor.io/repository/github/light0x00/parser-generator/badge/master)](https://www.codefactor.io/repository/github/light0x00/parser-generator/overview/master)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```
npm install @parser-generator/cli --save-dev
npm install @parser-generator/definition --save
```

## 1. Write your grammar

```
<!-- you can write your code snippet anywhere -->
<% import { Expr,Term, Factor } from "./ast"; %>

#TOKEN_PROTOTYPES
digit

#GRAMMAR
E->F T <% (e)=>new Expr(e)  %>;
T-> "+"F T| '-'F T | NIL <% (e)=>new Term(e) %>;
F->digit | '('E')' <% (e)=>new Factor(e)%>;

#SYMBOL_ASSOC_PREC
'+' left 0
'-' left 0
'*' left 1
'/' left 1
```

## 2. Generate Parser

```
npx pgen -f "path to grammar filename" -o [output path]
```

If all goes well, you'll see these files:

- **parser.ts**, It contains the code form for parsing-tables,and exports an available Parser.
- **index.html** ,It visualizes the parsing-table used by the parser.