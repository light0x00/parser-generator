import should from "should";
import { GrammarLexer, parse, ProgramNode, TSCodegenVisitor, EvalVisitor, genParser } from "../src/inter";
import { FirstCalculator, FollowCalculator, getLR1ParsingTable, parseGrammar } from "@parser-generator/core";
import { IGrammar, AugmentedGrammar } from "@parser-generator/definition";

describe(`Grammar Interpreter Test`, function () {

	describe(`Patterns Test`, function () {
		it(`script`, function () {
			let re = /<%(.+)?%>/;
			should(re.exec("aaa <%a<a%a>a>%%>")).has.property("1", "a<a%a>a>%");
		});

	});

	let rawGrammar = `
		<%
		//脚本片段1
		%>
		#TOKEN_PROTOTYPES
		digit
		<%
		//脚本片段2
		%>
		#GRAMMAR
		S->E;
		E->F T <% (e)=>new Expr(e)  %> | F;
		T-> "+"F T| '-'F T | NIL <% (e)=>new Term(e) %>;
		F->digit | '('E')' <% (e)=>new Factor(e)%>;
		<%
		//脚本片段3
		%>
		#SYMBOL_ASSOC_PREC
		'+' left 0
		'-' left 0
		'*' left 1
		'/' left 1
		<%
		//脚本片段4
		%>
		`;

	describe(`Generate LL Parser`, function () {
		let program: ProgramNode;
		it(`parser`, function () {
			should.doesNotThrow(function () {
				program = parse(new GrammarLexer(rawGrammar));
			});
		});
		let g: IGrammar;
		it(`eval`, function () {
			should.doesNotThrow(function () {
				let visitor = new EvalVisitor({ parser: "LL" });
				program.accpet(visitor);
				g = visitor.grammar;
				console.log(g + "");
			});
		});
		it(`gen`, function () {
			should.doesNotThrow(function () {
				let first = new FirstCalculator(g);
				let firstTable = first.getFirstTable();
				let follow = new FollowCalculator(g, first);
				let followTable = follow.getFollowTable();
				let vi = new TSCodegenVisitor({ firstTable, followTable, parser: "LL" });
				program.accpet(vi);
			});
		});
	});

	describe(`Generate LR Parser`, function () {
		let program: ProgramNode;
		it(`parser`, function () {
			should.doesNotThrow(function () {
				program = parse(new GrammarLexer(rawGrammar));
			});
		});
		let g: AugmentedGrammar;
		it(`eval`, function () {
			should.doesNotThrow(function () {
				let visitor = new EvalVisitor({ parser: "LR1" });
				program.accpet(visitor);
				g = visitor.grammar as AugmentedGrammar;
				console.log(g + "");
			});
		});
		it(`gen`, function () {
			should.doesNotThrow(function () {
				let t = getLR1ParsingTable(g);
				let vi = new TSCodegenVisitor({ lrTable: t, parser: "LR1" });
				program.accpet(vi);
			});
		});
	});

	describe(`Generate Parser Intergration Test`, function () {
		should.doesNotThrow(function () {
			genParser({ rawGrammar, parser: "SLR", lang: "TS" });
		});
	});
});