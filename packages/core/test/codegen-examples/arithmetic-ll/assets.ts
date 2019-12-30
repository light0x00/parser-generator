import { NonTerminal, TokenPro, Production, SymbolWrapper, SymbolTrait, NIL, Terminal, EOF } from "@parser-generator/definition";
import { Expr, Term, Factor } from "./ast";

//脚本片段1

export let digit = new TokenPro("digit");
let E = new NonTerminal("E");
let T = new NonTerminal("T");
let F = new NonTerminal("F");
let p0 = new Production(0, E, [
	new SymbolWrapper(F),
	new SymbolWrapper(T)], undefined, (e) => new Expr(e));
let p1 = new Production(1, T, [
	new SymbolWrapper("+"),
	new SymbolWrapper(F),
	new SymbolWrapper(T)], undefined, (e) => new Term(e));
let p2 = new Production(2, T, [
	new SymbolWrapper("-"),
	new SymbolWrapper(F),
	new SymbolWrapper(T)], undefined, (e) => new Term(e));
let p3 = new Production(3, T, [
	new SymbolWrapper(NIL)], undefined, (e) => new Term(e));
let p4 = new Production(4, F, [
	new SymbolWrapper(digit)], undefined, (e) => new Factor(e));
let p5 = new Production(5, F, [
	new SymbolWrapper("("),
	new SymbolWrapper(E),
	new SymbolWrapper(")")], undefined, (e) => new Factor(e));
E.prods = [p0];
T.prods = [p1, p2, p3];
F.prods = [p4, p5];
/* first set */
let firstTable = new Map<NonTerminal, Map<Terminal, Production>>();
firstTable.set(E, new Map<Terminal, Production>([[digit, p0], ["(", p0]]));
firstTable.set(T, new Map<Terminal, Production>([["+", p1], ["-", p2], [NIL, p3]]));
firstTable.set(F, new Map<Terminal, Production>([[digit, p4], ["(", p5]]));
/* follow set */
let followTable = new Map<NonTerminal, Set<Terminal>>();
followTable.set(E, new Set<Terminal>([EOF, ")"]));
followTable.set(T, new Set<Terminal>([EOF, ")"]));
followTable.set(F, new Set<Terminal>(["+", "-", EOF, ")"]));

//脚本片段2

let symbolTraits = new Map<string, SymbolTrait>();
symbolTraits.set("+", new SymbolTrait(0, true));
symbolTraits.set("-", new SymbolTrait(0, true));
symbolTraits.set("*", new SymbolTrait(1, true));
symbolTraits.set("/", new SymbolTrait(1, true));

//脚本片段3

import { LLParser } from "../../../src/ll/ll-parser";
export let parser = new LLParser(E, firstTable, followTable);

//脚本片段3