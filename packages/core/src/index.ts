import { GrammarLexer, parse, TSCodegenVisitor, EvalVisitor, CodegenContext } from "./codegen";
import { FirstCalculator, FollowCalculator } from "./first-follow";
import { assert } from "@light0x00/shim";
import { AugmentedGrammar, ParsingTable } from "@parser-generator/definition";

export { getSLRParsingTable, getSLRAutomata } from "./lr/slr";
export { getLR1ParsingTable, getLR1Automata } from "./lr/lr1";

export { FirstCalculator, FollowCalculator };
export { parseGrammar, EvalVisitor, TSCodegenVisitor, CodegenContext } from "./codegen";
export { StateSet } from "./lr/definition";
export { FirstTable, FollowTable } from "./first-follow";
export { LLParser } from "./ll/ll-parser";
export { LRParser } from "./lr/lr-parser";

// export function codegen(rawGrammar: string, conf: { parser: "LL" | "SLR" | "LR1" | "LALR" }): string {
// 	let t = new GrammarLexer(rawGrammar);
// 	let pragram = parse(t);
// 	//1. 拿到grammar对象
// 	let evalVisitor = new EvalVisitor({ parser: conf.parser });
// 	pragram.accpet(evalVisitor);
// 	let grammar = evalVisitor.grammar;
// 	//2. 拿到分析表
// 	let codegenContext: CodegenContext = { parser: conf.parser };
// 	if (conf.parser == "LL") {

// 		let fir = new FirstCalculator(grammar);
// 		let fol = new FollowCalculator(grammar, fir);
// 		codegenContext.firstTable = fir.getFirstTable();
// 		codegenContext.followTable = fol.getFollowTable();
// 	} else {
// 		assert(grammar instanceof AugmentedGrammar);
// 		let parsingTable: ParsingTable;

// 		if (conf.parser == "SLR") {
// 			parsingTable = getSLRParsingTable(grammar);
// 		} else if (conf.parser == "LR1") {
// 			parsingTable = getLR1ParsingTable(grammar);
// 		} else if (conf.parser == "LALR") {
// 			throw new Error("Unimplemented!");
// 		}
// 		codegenContext.lrParsingTable = parsingTable!;

// 	}
// 	//3. 代码生成
// 	let visitor = new TSCodegenVisitor(codegenContext);
// 	pragram.accpet(visitor);
// 	return visitor.code;
// }