import { GrammarLexer, EvalVisitor, parse } from "../interp";
import { getLR1ParsingTable } from "@parser-generator/core";
import { AugmentedGrammar } from "@parser-generator/definition";

describe(`Test`, () => {
	let g = `
	#GRAMMAR
	S -> Stmt ;
	Stmt -> If | Other <% (e)=>e[0] %> ;
	If ->
		'if' Expr Stmt |
		'if' Expr Stmt 'else' Stmt
		<% (e)=> new IfStmt(e) %>;
	Expr -> 'Expr' <% (e)=>e[0] %>;
	Other -> 'Other' <% (e)=>e[0] %>;

	#SYMBOL_ASSOC_PREC
	If left
	`;
	let p = parse(new GrammarLexer(g));
	let v = new EvalVisitor({ parser: "LR1" });
	p.accpet(v);
	let grammar = v.grammar;
	getLR1ParsingTable(grammar as AugmentedGrammar);
});