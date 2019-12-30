import { parser, digit } from "./assets";
import { MockLexer, MockToken } from "test/toolkit";
import { Expr } from "./ast";
import should from "should";


describe(`Integration Test for LL`, function () {
	it(`9+(5-2)=12`, function () {
		let ast = parser.parse(new MockLexer([
			new MockToken(digit, 9),
			new MockToken("+"),
			new MockToken("("),
			new MockToken(digit, 5),
			new MockToken("-"),
			new MockToken(digit, 2),
			new MockToken(")")]));
		should((ast as Expr).eval()).eql(12);
	});
});