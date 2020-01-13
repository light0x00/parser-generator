```
npm install @parser-generator/cli --save-dev
npm install @parser-generator/definition --save
```

## 1. Write grammar

```
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
npx pgen -f "path/to/grammar/filename" -o [output path]
```

If all goes well, you'll see these files:

- **parser.ts**, It contains the code form for parsing-tables,and exports an available Parser.
- **index.html** ,It visualizes the parsing-table used by the parser.