import { parser } from "./parser";
import { ArithmeticLexer } from "./lexer";
import { Expr } from "./ast";
import should from "should";

describe(`LR Arithmetic Parser Test`, function () {
	it(`1+2-3*5/4=-0.75`,function(){
		let ast = parser.parse(new ArithmeticLexer("1+2-3*5/ 4"));
		let r = (ast as Expr).eval();
		should(r).eql(-0.75);
	});
});
