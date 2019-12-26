
import "mocha";
import "should";
import { FirstCalculator } from "../src/first-follow";
import { NonTerminal } from "../src/definition/index";
import { SimpleGrammar } from "./toolkit";
import should from "should";

describe("============The calculation of first set============", function () {

	describe(`
	循环依赖
	`, function () {

		it(`
		A->B
		B->A
    	`, function () {
			let A = new NonTerminal("A");
			let B = new NonTerminal("B");
			let grammar = new SimpleGrammar([
				[A, [B]],
				[B, [A]]
			]);
			let firstSetCalculator = new FirstCalculator(grammar);
			should(firstSetCalculator.getFirstSet(A)).size(0);
			should(firstSetCalculator.getFirstSet(B)).size(0);
		});

		it(`
		A->B
		B->A | b
		`, function () {
			let A = new NonTerminal("A");
			let B = new NonTerminal("B");
			let grammar = new SimpleGrammar([
				[A, [B]],
				[B, [A], ["b"]]
			]);
			let firstSetCalculator = new FirstCalculator(grammar);
			should(firstSetCalculator.getFirstSet(A)).eql(new Set(["b"]));
			should(firstSetCalculator.getFirstSet(B)).eql(new Set(["b"]));
		});

		it(`
		A->B
		B->C
		C->D
		D->E
		E->A
		`, function () {
			let A = new NonTerminal("A");
			let B = new NonTerminal("B");
			let C = new NonTerminal("C");
			let D = new NonTerminal("D");
			let E = new NonTerminal("E");
			let grammar = new SimpleGrammar([
				[A, [B]],
				[B, [C]],
				[C, [D]],
				[D, [E]],
				[E, [A]],
			]);
			let firstSetCalculator = new FirstCalculator(grammar);
			should(firstSetCalculator.getFirstSet(A)).size(0);
			should(firstSetCalculator.getFirstSet(B)).size(0);
			should(firstSetCalculator.getFirstSet(C)).size(0);
			should(firstSetCalculator.getFirstSet(D)).size(0);
			should(firstSetCalculator.getFirstSet(E)).size(0);
		});

	});

});
