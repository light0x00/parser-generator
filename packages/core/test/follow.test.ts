import "mocha";
import "should";
import { FollowCalculator, FirstCalculator as FirstSetCalculator } from "@/first-follow";
import { NIL, EOF, NonTerminal } from "@/definition";
import { SimpleGrammar } from "./toolkit";

describe("============The calculation of follow set============", function () {

	describe("1. 后跟终结符", function () {
		let S = new NonTerminal("S");
		let A = new NonTerminal("A");

		let grammar = new SimpleGrammar([
			[S, [A, "s"]],
			[A, ["a"]]
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		let expectation = new Set(["s"]);
		it(``, function () {
			let actuality = calculator.getFollowSet(A);
			actuality.should.eqls(expectation);
		});
	});

	describe("2. 后跟非ε的非终结符 ", function () {
		let S = new NonTerminal("S");
		let A = new NonTerminal("A");
		let B = new NonTerminal("B");
		let C = new NonTerminal("C");

		let grammar = new SimpleGrammar([
			[S, [A, B, C]],
			[A, ["a"]],
			[B, ["b1"], ["b2"]],
			[C, ["c"]],
		]);
		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		let expectation = new Set(["b1", "b2"]);
		it(``, function () {
			let actuality = calculator.getFollowSet(A);
			actuality.should.eqls(expectation);
		});
	});

	describe("3. 后跟可ε的非终结符1", function () {
		/*
        S->ABC
        A->a
        B->b | 𝝴
        C->c
        */
		let S = new NonTerminal("S");
		let A = new NonTerminal("A");
		let B = new NonTerminal("B");
		let C = new NonTerminal("C");

		let grammar = new SimpleGrammar([
			[S, [A, B, C]],
			[A, ["a"]],
			[B, ["b"], [NIL]],
			[C, ["c"]]
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		let expectation = new Set(["b", "c"]);
		it(``, function () {
			let actuality = calculator.getFollowSet(A);
			actuality.should.eqls(expectation);
		});
	});

	describe("4. 后跟连续的可ε的非终结符", function () {
		/*
        S->ABC
        A->a
        B->b | 𝝴
        C->c | 𝝴
        */
		let S = new NonTerminal("S");
		let A = new NonTerminal("A");
		let B = new NonTerminal("B");
		let C = new NonTerminal("C");

		let grammar = new SimpleGrammar([
			[S, [A, B, C]],
			[A, ["a"]],
			[B, ["b"], [NIL]],
			[C, ["c"], [NIL]]
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		let expectation = new Set(["b", "c", EOF]);
		it(``, function () {
			let actuality = calculator.getFollowSet(A);
			actuality.should.eqls(expectation);
		});
	});

	describe("5. 连续重复", function () {
		/*
        S->AAB
        A->a
        B->b
        */
		let S = new NonTerminal("S");
		let A = new NonTerminal("A");
		let B = new NonTerminal("B");

		let grammar = new SimpleGrammar([
			[S, [A, A, B]],
			[A, ["a"]],
			[B, ["b"]]
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		let expectation = new Set(["a", "b"]);
		it(``, function () {
			let actuality = calculator.getFollowSet(A);
			actuality.should.eqls(expectation);
		});

	});

	describe("5. 连续重复(地狱级)", function () {
		/*
        S->AABAAACD
        A->a
        B->b
        C->c
        D->d
        */
		let S = new NonTerminal("S");
		let A = new NonTerminal("A");
		let B = new NonTerminal("B");
		let C = new NonTerminal("C");
		let D = new NonTerminal("D");

		let grammar = new SimpleGrammar([
			[S, [A, A, B, A, A, A, C, D]],
			[A, ["a"]],
			[B, ["b"]],
			[C, ["c"]],
			[D, ["d"]]
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		let expectation = new Set(["a", "b", "c"]);
		it(``, function () {
			let actuality = calculator.getFollowSet(A);
			actuality.should.eqls(expectation);
		});

	});

	describe("7. 自递归", function () {
		/*
        S->AB
        A->aA
        B->b
        */
		let S = new NonTerminal("S");
		let A = new NonTerminal("A");
		let B = new NonTerminal("B");

		let grammar = new SimpleGrammar([
			[S, [A, B]],
			[A, ["a", A]],
			[B, ["b"]],
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		let expectation = new Set(["b"]);
		it(``, function () {
			let actuality = calculator.getFollowSet(A);
			actuality.should.eqls(expectation);
		});
	});

	describe("8. 循环依赖(青铜)", function () {
		/*
        A->B
        B->A
        */
		let A = new NonTerminal("A");
		let B = new NonTerminal("B");

		let grammar = new SimpleGrammar([
			[A, [B]],
			[B, [A]]
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));
		it(``, function () {
			// should.throws(() => {
			calculator.getFollowSet(A);
			// });
		});
	});

	describe("8. 循环依赖(白银)", function () {
		/*
        A->B
        B->C
        C->A

        A:C
        C:B
        B:A
        */
		let A = new NonTerminal("A");
		let B = new NonTerminal("B");
		let C = new NonTerminal("C");

		let grammar = new SimpleGrammar([
			[A, [B]],
			[B, [C]],
			[C, [A]],
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		it(``, function () {
			// should.throws(() => {
			calculator.getFollowSet(A);
			// });
		});
	});

	describe("8. 循环依赖(黄金)", function () {

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
			[E, [A]]
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		it(``, function () {
			// should.throws(() => {
			calculator.getFollowSet(A);
			// });
		});
	});

	describe("8. 循环依赖(Faker!)", function () {

		let A = new NonTerminal("A");
		let B = new NonTerminal("B");
		let C = new NonTerminal("C");
		let D = new NonTerminal("D");
		let E = new NonTerminal("E");
		let F = new NonTerminal("F");

		let grammar = new SimpleGrammar([
			[A, [E]],
			[B, [A]],
			[C, [A], [B]],
			[D, [A]],
			[E, [D]],
			[F, [E]]
		]);

		let calculator = new FollowCalculator(grammar, new FirstSetCalculator(grammar));

		it(``, function () {
			// should.throws(() => {
			calculator.getFollowSet(A);
			// });
		});
	});

});

