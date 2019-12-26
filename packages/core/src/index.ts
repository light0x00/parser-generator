import { GrammarLexer, parse, CodegenVisitor } from "./grammar-interpreter";
import { FirstCalculator, FollowCalculator } from "./first-follow";

export function codegen(rawGrammar: string, conf: { parser: "LL" | "SLR" | "LR1" }): string {
	let t = new GrammarLexer(rawGrammar);
	let pragram = parse(t);
	let grammar = pragram.eval();
	let fir = new FirstCalculator(grammar);
	let fol = new FollowCalculator(grammar, fir);
	//根据不同的分析算法 传入不同的分析表
	let visitor = new CodegenVisitor({
		firstTable: fir.getFirstTable(),
		followTable: fol.getFollowTable(),
		parser: conf.parser
	});
	pragram.accpet(visitor);
	return visitor.code;
}