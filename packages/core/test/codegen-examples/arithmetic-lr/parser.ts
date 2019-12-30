import { NonTerminal, TokenPro, Production, SymbolWrapper, SymbolTrait, NIL, Terminal, EOF, ParsingTable, Goto, Shift, Accept, Reduce } from "@parser-generator/definition";
import { Expr } from "./ast";

//脚本片段1

export let digit = new TokenPro("digit");
let S = new NonTerminal("S");
let E = new NonTerminal("E");
/* (0) S->E */
let p0 = new Production(0, S, [
	new SymbolWrapper(E)], undefined, undefined);
/* (1) E->E+E<%(e)=>new Expr(e)%> */
let p1 = new Production(1, E, [
	new SymbolWrapper(E),
	new SymbolWrapper("+"),
	new SymbolWrapper(E)], undefined, (e) => new Expr(e));
/* (2) E->E-E<%(e)=>new Expr(e)%> */
let p2 = new Production(2, E, [
	new SymbolWrapper(E),
	new SymbolWrapper("-"),
	new SymbolWrapper(E)], undefined, (e) => new Expr(e));
/* (3) E->E*E<%(e)=>new Expr(e)%> */
let p3 = new Production(3, E, [
	new SymbolWrapper(E),
	new SymbolWrapper("*"),
	new SymbolWrapper(E)], undefined, (e) => new Expr(e));
/* (4) E->E/E<%(e)=>new Expr(e)%> */
let p4 = new Production(4, E, [
	new SymbolWrapper(E),
	new SymbolWrapper("/"),
	new SymbolWrapper(E)], undefined, (e) => new Expr(e));
/* (5) E->(E)<%(e)=>new Expr(e)%> */
let p5 = new Production(5, E, [
	new SymbolWrapper("("),
	new SymbolWrapper(E),
	new SymbolWrapper(")")], undefined, (e) => new Expr(e));
/* (6) E->digit<%(e)=>new Expr(e)%> */
let p6 = new Production(6, E, [
	new SymbolWrapper(digit)], undefined, (e) => new Expr(e));
S.prods = [p0];
E.prods = [p1, p2, p3, p4, p5, p6];
let table = new ParsingTable();
table.put(0, E, new Goto(1));
table.put(0, "(", new Shift(2));
table.put(0, digit, new Shift(3));
table.put(1, EOF, new Accept());
table.put(1, "+", new Shift(4));
table.put(1, "-", new Shift(5));
table.put(1, "*", new Shift(6));
table.put(1, "/", new Shift(7));
table.put(2, E, new Goto(8));
table.put(2, "(", new Shift(9));
table.put(2, digit, new Shift(10));
table.put(3, "+", new Reduce(p6));
table.put(3, "-", new Reduce(p6));
table.put(3, "*", new Reduce(p6));
table.put(3, "/", new Reduce(p6));
table.put(3, EOF, new Reduce(p6));
table.put(4, E, new Goto(11));
table.put(4, "(", new Shift(2));
table.put(4, digit, new Shift(3));
table.put(5, E, new Goto(12));
table.put(5, "(", new Shift(2));
table.put(5, digit, new Shift(3));
table.put(6, E, new Goto(13));
table.put(6, "(", new Shift(2));
table.put(6, digit, new Shift(3));
table.put(7, E, new Goto(14));
table.put(7, "(", new Shift(2));
table.put(7, digit, new Shift(3));
table.put(8, ")", new Shift(15));
table.put(8, "+", new Shift(16));
table.put(8, "-", new Shift(17));
table.put(8, "*", new Shift(18));
table.put(8, "/", new Shift(19));
table.put(9, E, new Goto(20));
table.put(9, "(", new Shift(9));
table.put(9, digit, new Shift(10));
table.put(10, "+", new Reduce(p6));
table.put(10, "-", new Reduce(p6));
table.put(10, "*", new Reduce(p6));
table.put(10, "/", new Reduce(p6));
table.put(10, ")", new Reduce(p6));
table.put(11, "+", new Reduce(p1));
table.put(11, "-", new Reduce(p1));
table.put(11, "*", new Shift(6));
table.put(11, "/", new Shift(7));
table.put(11, EOF, new Reduce(p1));
table.put(12, "+", new Reduce(p2));
table.put(12, "-", new Reduce(p2));
table.put(12, "*", new Shift(6));
table.put(12, "/", new Shift(7));
table.put(12, EOF, new Reduce(p2));
table.put(13, "+", new Reduce(p3));
table.put(13, "-", new Reduce(p3));
table.put(13, "*", new Reduce(p3));
table.put(13, "/", new Reduce(p3));
table.put(13, EOF, new Reduce(p3));
table.put(14, "+", new Reduce(p4));
table.put(14, "-", new Reduce(p4));
table.put(14, "*", new Reduce(p4));
table.put(14, "/", new Reduce(p4));
table.put(14, EOF, new Reduce(p4));
table.put(15, "+", new Reduce(p5));
table.put(15, "-", new Reduce(p5));
table.put(15, "*", new Reduce(p5));
table.put(15, "/", new Reduce(p5));
table.put(15, EOF, new Reduce(p5));
table.put(16, E, new Goto(21));
table.put(16, "(", new Shift(9));
table.put(16, digit, new Shift(10));
table.put(17, E, new Goto(22));
table.put(17, "(", new Shift(9));
table.put(17, digit, new Shift(10));
table.put(18, E, new Goto(23));
table.put(18, "(", new Shift(9));
table.put(18, digit, new Shift(10));
table.put(19, E, new Goto(24));
table.put(19, "(", new Shift(9));
table.put(19, digit, new Shift(10));
table.put(20, ")", new Shift(25));
table.put(20, "+", new Shift(16));
table.put(20, "-", new Shift(17));
table.put(20, "*", new Shift(18));
table.put(20, "/", new Shift(19));
table.put(21, "+", new Reduce(p1));
table.put(21, "-", new Reduce(p1));
table.put(21, "*", new Shift(18));
table.put(21, "/", new Shift(19));
table.put(21, ")", new Reduce(p1));
table.put(22, "+", new Reduce(p2));
table.put(22, "-", new Reduce(p2));
table.put(22, "*", new Shift(18));
table.put(22, "/", new Shift(19));
table.put(22, ")", new Reduce(p2));
table.put(23, "+", new Reduce(p3));
table.put(23, "-", new Reduce(p3));
table.put(23, "*", new Reduce(p3));
table.put(23, "/", new Reduce(p3));
table.put(23, ")", new Reduce(p3));
table.put(24, "+", new Reduce(p4));
table.put(24, "-", new Reduce(p4));
table.put(24, "*", new Reduce(p4));
table.put(24, "/", new Reduce(p4));
table.put(24, ")", new Reduce(p4));
table.put(25, "+", new Reduce(p5));
table.put(25, "-", new Reduce(p5));
table.put(25, "*", new Reduce(p5));
table.put(25, "/", new Reduce(p5));
table.put(25, ")", new Reduce(p5));

//脚本片段2

let traits = new Map<string, SymbolTrait>();
traits.set("+", new SymbolTrait(0, true));
traits.set("-", new SymbolTrait(0, true));
traits.set("*", new SymbolTrait(1, true));
traits.set("/", new SymbolTrait(1, true));

//脚本片段3

import { LRParser } from "../../../src/index";
export let parser = new LRParser(table);