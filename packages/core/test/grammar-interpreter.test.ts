import should from "should";
import { GrammarLexer, parse, ProgramNode, CodegenVisitor } from "@/grammar-interpreter";
import { getMock } from "./toolkit";
import { Grammar } from "@/definition/syntax";
import { FirstCalculator, FollowCalculator } from "@/first-follow";

describe(`Grammar Interpreter Test`, function () {

	describe(`Patterns Test`, function () {
		it(`script`, function () {
			let re = /<%(.+)?%>/;
			should(re.exec("aaa <%a<a%a>a>%%>")).has.property("1", "a<a%a>a>%");
		});

	});

	describe(`Intergration Test`, function () {
		let t = new GrammarLexer(getMock(__dirname + "/grammar.txt"));
		let program: ProgramNode;
		it(`parser`, function () {
			should.doesNotThrow(function () {
				program = parse(t);
			});
		});
		let g: Grammar;
		it(`eval`, function () {
			should.doesNotThrow(function () {
				g = program.eval();
				console.log(g + "");
			});
		});
		it(`gen`, function () {
			should.doesNotThrow(function () {
				let first = new FirstCalculator(g);
				let firstTable = first.getFirstTable();
				let follow = new FollowCalculator(g, first);
				let followTable = follow.getFollowTable();
				let vi = new CodegenVisitor({ firstTable, followTable, parser: "LL" });
				program.accpet(vi);
				console.log(vi.code);
			});
		});
	});

});