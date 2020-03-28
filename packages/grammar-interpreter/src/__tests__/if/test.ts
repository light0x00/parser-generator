import { TokenPro, Terminal, EOF, ILexer, IToken, ASTElement } from "@parser-generator/definition";

import { LRParser } from "@parser-generator/core";
import LTable from "./left";
import RTable from "./right";

/*

#GRAMMAR
S -> Stmt ;
Stmt -> If | Other <% (e)=>e[0] %> ;
If ->
	'if' Expr Stmt |
	'if' Expr Stmt 'else' Stmt
	<% (e)=> new IfStmt(e) %>;
Expr -> 'Expr' <% (e)=>e[0] %>;
Other -> 'Other' <% (e)=>e[0] %>;

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
*/
export class IfStmt {
	children: ASTElement[]
	constructor(children: ASTElement[]) {
		this.children = children;
	}

	toString() {
		return "(" + this.children.join(" ") + ")";
	}
}

class Token implements IToken {
	lexeme: string | TokenPro
	constructor(lexeme: string | TokenPro) {
		this.lexeme = lexeme;
	}
	key(): Terminal {
		return this.lexeme;
	}

	toString(){
		return this.lexeme;
	}
}
class Lexer implements ILexer {
	lexemes: string[]
	i = 0
	constructor(lexemes: string[]) {
		this.lexemes = lexemes;
	}
	peek(): IToken {
		return this.i >= this.lexemes.length ? new Token(EOF) : new Token(this.lexemes[this.i]);
	}
	next(): IToken {
		return this.i < this.lexemes.length ? new Token(this.lexemes[this.i++]) : new Token(EOF);
	}
}

export let parser1 = new LRParser(LTable);
let ast1 = parser1.parse(new Lexer(["if", "Expr", "if", "Expr", "Other" , "else", "Other"]));
console.log(ast1.toString());
//(if Expr (if Expr Other) else Other)

export let parser2 = new LRParser(RTable);
let ast2 = parser2.parse(new Lexer(["if", "Expr", "if", "Expr", "Other" , "else", "Other"]));
console.log(ast2.toString());
//(if Expr (if Expr Other else Other))