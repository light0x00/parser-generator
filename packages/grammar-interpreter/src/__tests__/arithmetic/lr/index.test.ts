import should from "should";
import { Expr } from "./ast";
import {getLexer} from "../lexer";
import { genParser } from "../../../interp";
import { assert } from "@light0x00/shim";
import { LRParser } from "@parser-generator/core";
import { TokenPro } from "@parser-generator/definition";
import fs from "fs";

describe(`LR Arithmetic Parser Test`, function () {
	it(`1+2-3*5/4=-0.75`, function () {

		let { code } = genParser(`
		<% import { Expr } from "./ast"; %>
		#TOKEN_PROTOTYPES
		digit

		#GRAMMAR
		S->E;
		E->E '+' E | E '-' E |E'*'E |E'/'E | '(' E ')' | digit  <% (e)=>new Expr(e)  %>;

		#SYMBOL_ASSOC_PREC
		'+' left 0
		'-' left 0
		'*' left 1
		'/' left 1
		`, { parser: "LR1", lang: "TS" });
		fs.writeFileSync(__dirname + "/parser.tmp.ts", code, { encoding: "utf-8", flag: "w+" });

		import("./parser.tmp"!).then(
			({ parser, digit }) => {
				assert(parser instanceof LRParser);
				assert(digit instanceof TokenPro);

				it(`1+2-3*5/4`, function () {
					let ast = parser.parse(getLexer("1+2-3*5/ 4", digit));
					let r = (ast as Expr).eval();
					should(r).eql(-0.75);
				});

				it(`(1+2-3*4/5)+(6)-(7/8)`, function () {
					let ast = parser.parse(getLexer("(1+2-3*4/5)+(6)-(7/8)", digit));
					let r = (ast as Expr).eval();
					should(r).eql(5.725);
				});
			}
		);

	});
});
