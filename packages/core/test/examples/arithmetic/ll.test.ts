import { LLParser } from "../../../src/ll-parser";
import { NonTerminal, ASTree, ASTElement } from "../../../src/definition";
import { Grammar, TokenPro, Production, SymbolWrapper, NIL } from "@/definition/syntax";
import { FirstCalculator, FollowCalculator } from "@/first-follow";
import { MockLexer, MockToken } from "../../toolkit";
import should from "should";

class ASTList implements ASTree {

	eles: ASTElement[]
	constructor(eles: ASTElement[]) {
		this.eles = eles;
	}
}
class Expr extends ASTList {
	get left(): Factor {
		return this.eles[0] as Factor;
	}
	get term(): Term | undefined {
		return this.eles.length == 2 ? this.eles[1] as Term : undefined;
	}
	eval(): number {
		let result = (this.left as Factor).eval();
		let term = this.term;
		while (term != undefined) {
			let op = term.op;
			let right = term.right!;
			switch (op) {
				case "+":
					result += right;
					break;
				case "-":
					result -= right;
					break;
			}
			term = term.subTerm;
		}
		return result;
	}
	toString() {
		return "E";
	}
}
class Term extends ASTList {
	get op(): string | undefined {
		return this.eles.length > 0 ? (this.eles[0] as MockToken).value as string : undefined;
	}
	get right(): number | undefined {
		return this.eles.length > 1 ? (this.eles[1] as Factor).eval() : undefined;
	}
	get subTerm(): Term | undefined {
		return this.eles.length > 2 ? (this.eles[2] as Term) : undefined;
	}
	toString() {
		return "T";
	}
}
class Factor extends ASTList {
	eval(): number {
		if (this.eles.length == 1) {
			return (this.eles[0] as MockToken).value as number;
		} else {
			return (this.eles[1] as Expr).eval();
		}
	}
	toString() {
		return "F";
	}
}

/*
E->FT
T->+FT | -FT |𝝴
F->digit | ( E )
*/

let digit = new TokenPro("digit");

let E = new NonTerminal("E");
let T = new NonTerminal("T");
let F = new NonTerminal("F");

let p0 = new Production(0, E, [new SymbolWrapper(F), new SymbolWrapper(T)], undefined, (e) => new Expr(e));
E.prods = [p0];

let p1 = new Production(1, T, [new SymbolWrapper("+"), new SymbolWrapper(F), new SymbolWrapper(T)], undefined, (e) => new Term(e));
let p2 = new Production(2, T, [new SymbolWrapper("-"), new SymbolWrapper(F), new SymbolWrapper(T)], undefined, (e) => new Term(e));
let p3 = new Production(3, T, [new SymbolWrapper(NIL)], undefined, (e) => new Term(e));
T.prods = [p1, p2, p3];

let p4 = new Production(4, F, [new SymbolWrapper(digit)], undefined, (e) => new Factor(e));
let p5 = new Production(5, F, [new SymbolWrapper("("), new SymbolWrapper(E), new SymbolWrapper(")")], undefined, (e) => new Factor(e));
F.prods = [p4, p5];

let g = new Grammar([E, T, F], [p0, p1, p2, p3, p4, p5], E);

let first = new FirstCalculator(g);
let firstTable = first.getFirstTable();
let follow = new FollowCalculator(g, first);
let followTable = follow.getFollowTable();

let p = new LLParser(g.startNT(), firstTable, followTable);

describe(`LL Parser Test`, function () {
	let ast = p.parse(new MockLexer([new MockToken(digit, 9), new MockToken("+"), new MockToken("("), new MockToken(digit, 5), new MockToken("-"), new MockToken(digit, 2), new MockToken(")")]));
	it(`9+(5-2) = 12`, function () {
		should((ast as Expr).eval()).eql(12);
	});
});
