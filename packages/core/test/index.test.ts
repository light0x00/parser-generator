import should from "should";
import { SDDLexer, parse, ProgramNode } from "@/sdd-parser";
import { getMock } from "./toolkit";
import { EOF } from "@light0x00/parser-definition";


describe(`SDD Interpreter Test`, function () {

	describe(`Patterns Test`, function () {
		it(`script`, function () {
			let re = /<%(.+)?%>/;
			should(re.exec("aaa <%a<a%a>a>%%>")).has.property("1", "a<a%a>a>%");
		});

	});

	describe(`Tokenzier Test`, function () {
		it(`sdd.txt`, function () {
			should.doesNotThrow(function () {
				let t = new SDDLexer(getMock("./sdd.txt"));
				let token;
				while ((token = t.nextToken()).value != EOF) {
					// console.log(token);
				}
			});
		});

	});

	describe(`Parser Test`, function () {
		let t = new SDDLexer(getMock("./sdd.txt"));
		let program :ProgramNode;
		it(`parser`, function () {
			program  = parse(t);
		});

		it(`eval`, function () {
			should.doesNotThrow(function () {
				let g = program.eval();
				console.log(g+"");
			});
		});
		it(`gen`, function () {
			should.doesNotThrow(function () {
				program.gen();
			});
		});
	});

});