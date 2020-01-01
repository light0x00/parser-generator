import { NonTerminal, Terminal, SSymbol as Symbol, EOF } from "@parser-generator/definition";
import { Item, ItemSet } from "../lr/definition";
import { LR1AutomataTools } from "../lr/lr1";
import { FirstCalculator as FirstSetCalculator } from "../first-follow";

import "should";
import { SimpleGrammar } from "./toolkit";


describe("============Calculation Of LR-Lookahead-Set Test============", function () {

	describe(`
    青铜
    S->A
    A->A𝜶 | A𝜷 | c
    `, function () {

		let S = new NonTerminal("S");
		let A = new NonTerminal("A");
		let grammar = new SimpleGrammar([
			[S, [A]],
			[A, [A, "a"], [A, "b"], ["c"]]
		]);
		let fir = new FirstSetCalculator(grammar);
		let automataTools = new LR1AutomataTools((sym) => fir.getFirstSet(sym));

		let item = new Item(S.prods[0], 0, new Set<Terminal>([EOF]));

		it(`Left-Recursion-Look-Set of ${item}`, function () {
			let expection = new Set<Symbol>(["a", "b"]);
			let actuality = automataTools.determineLeftRecursionLookSet(item);
			for (let v of expection)
				actuality.should.have.key(v);
		});

		it(`Non-Left-Recursion-Look-Set of ${item}`, function () {
			let expection = new Set<Symbol>([EOF]);
			let actuality = automataTools.determineNonLeftRecursionLookSet(item);
			for (let v of expection)
				actuality.should.have.key(v);
		});
	});

});


describe("============Calculation Of LR-Closure Test============", function () {
	describe(`
    黄金
    S->E
    E->E+F | E*F | F
    F->id
    `, function () {

		let S = new NonTerminal("S");
		let E = new NonTerminal("E");
		let F = new NonTerminal("F");
		let grammar = new SimpleGrammar([
			[S, [E]],
			[E, [E, "+", F], [E, "*", F], [F]],
			[F, ["id"]]
		]);
		let fir = new FirstSetCalculator(grammar);
		let automataTools = new LR1AutomataTools((sym) => fir.getFirstSet(sym));
		let item = new Item(S.prods[0], 0, new Set<Terminal>([EOF]));
		let I0 = new ItemSet(item);

		it(`LR-Closure of ${I0} should be:
        S->·E,{EOF}
        E->·E+F,{+,*,EOF}
        E->·E*F,{+,*,EOF}
        E->·F,{+,*,EOF}
        F->·id,{+,*,EOF}
        `, function () {
			let expection = new ItemSet(
				item,
				new Item(E.prods[0], 0, new Set<Terminal>(["+", "*", EOF])),
				new Item(E.prods[1], 0, new Set<Terminal>(["+", "*", EOF])),
				new Item(E.prods[2], 0, new Set<Terminal>(["+", "*", EOF])),
				new Item(F.prods[0], 0, new Set<Terminal>(["+", "*", EOF])),
			);
			let actuality = automataTools.closure(I0);
			actuality.equals(expection).should.true();
		});

	});
});

