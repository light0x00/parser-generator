
import { NonTerminal, TokenPro, Production, SymbolWrapper, SymbolTrait, NIL, Terminal, EOF, ParsingTable, Goto, Shift, Accept, Reduce, ILexer, IToken, ASTElement } from "@parser-generator/definition";
import { IfStmt } from "./test";

let S = new NonTerminal("S");
let Stmt = new NonTerminal("Stmt");
let If = new NonTerminal("If");
let Expr = new NonTerminal("Expr");
let Other = new NonTerminal("Other");
/* (0) S->Stmt */
let p0 = new Production(0,S,[
	new SymbolWrapper(Stmt)],undefined,undefined);
/* (1) Stmt->If<%(e)=>e[0]%> */
let p1 = new Production(1,Stmt,[
	new SymbolWrapper(If)],undefined, (e)=>e[0] );
/* (2) Stmt->Other<%(e)=>e[0]%> */
let p2 = new Production(2,Stmt,[
	new SymbolWrapper(Other)],undefined, (e)=>e[0] );
/* (3) If->ifExprStmt<%(e)=> new IfStmt(e)%> */
let p3 = new Production(3,If,[
	new SymbolWrapper("if"),
	new SymbolWrapper(Expr),
	new SymbolWrapper(Stmt)],undefined, (e)=> new IfStmt(e) );
/* (4) If->ifExprStmtelseStmt<%(e)=> new IfStmt(e)%> */
let p4 = new Production(4,If,[
	new SymbolWrapper("if"),
	new SymbolWrapper(Expr),
	new SymbolWrapper(Stmt),
	new SymbolWrapper("else"),
	new SymbolWrapper(Stmt)],undefined, (e)=> new IfStmt(e) );
/* (5) Expr->(Expr)<%(e)=>e[0]%> */
let p5 = new Production(5,Expr,[
	new SymbolWrapper("Expr")],undefined, (e)=>e[0] );
/* (6) Other->Other<%(e)=>e[0]%> */
let p6 = new Production(6,Other,[
	new SymbolWrapper("Other")],undefined, (e)=>e[0] );
S.prods=[p0];
Stmt.prods=[p1,p2];
If.prods=[p3,p4];
Expr.prods=[p5];
Other.prods=[p6];

let table = new ParsingTable();

table.put(0,Stmt,new Goto(1));
table.put(0,If,new Goto(2));
table.put(0,Other,new Goto(3));
table.put(0,"if",new Shift(4));
table.put(0,"Other",new Shift(5));
table.put(1,EOF,new Accept());
table.put(2,EOF,new Reduce(p1));
table.put(3,EOF,new Reduce(p2));
table.put(4,Expr,new Goto(6));
table.put(4,"Expr",new Shift(7));
table.put(5,EOF,new Reduce(p6));
table.put(6,Stmt,new Goto(8));
table.put(6,If,new Goto(9));
table.put(6,Other,new Goto(10));
table.put(6,"if",new Shift(11));
table.put(6,"Other",new Shift(12));
table.put(7,"if",new Reduce(p5));
table.put(7,"Other",new Reduce(p5));
table.put(8,EOF,new Reduce(p3));
table.put(8,"else",new Shift(13));
table.put(9,EOF,new Reduce(p1));
table.put(9,"else",new Reduce(p1));
table.put(10,EOF,new Reduce(p2));
table.put(10,"else",new Reduce(p2));
table.put(11,Expr,new Goto(14));
table.put(11,"Expr",new Shift(7));
table.put(12,EOF,new Reduce(p6));
table.put(12,"else",new Reduce(p6));
table.put(13,Stmt,new Goto(15));
table.put(13,If,new Goto(2));
table.put(13,Other,new Goto(3));
table.put(13,"if",new Shift(4));
table.put(13,"Other",new Shift(5));
table.put(14,Stmt,new Goto(16));
table.put(14,If,new Goto(9));
table.put(14,Other,new Goto(10));
table.put(14,"if",new Shift(11));
table.put(14,"Other",new Shift(12));
table.put(15,EOF,new Reduce(p4));
table.put(16,EOF,new Reduce(p3));
table.put(16,"else",new Shift(17));
table.put(17,Stmt,new Goto(18));
table.put(17,If,new Goto(9));
table.put(17,Other,new Goto(10));
table.put(17,"if",new Shift(11));
table.put(17,"Other",new Shift(12));
table.put(18,EOF,new Reduce(p4));
table.put(18,"else",new Reduce(p4));

export default table;