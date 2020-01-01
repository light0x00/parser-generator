
import { MismatchError } from "../utils";
import { Stack } from "@light0x00/shim";
import { ILexer, ASTElement, IToken, ASTree, NonTerminal,ParsingTable } from "@parser-generator/definition";

import _debug from "debug";
let debug = _debug("PG:lr-parser");

export class LRParser {
	parsingTable: ParsingTable
	constructor( parsingTable: ParsingTable) {
		this.parsingTable = parsingTable;
	}

	parse(lexer: ILexer): ASTree {
		let stateStack = new Stack<number>();
		stateStack.push(0);
		let astStack = new Stack<ASTElement>();
		let lookahead: IToken | NonTerminal = lexer.peek();

		while (1) {
			let topSta = stateStack.peek();
			let op = this.parsingTable.get(topSta, lookahead.key());
			if (op == undefined)
				throw new MismatchError(this.parsingTable.getExpectedTokens(topSta), lookahead);
			if (op.isShift()) {
				astStack.push(lexer.next());
				stateStack.push(op.nextStateId);
				lookahead = lexer.peek();
			}
			else if (op.isGoto()) {
				stateStack.push(op.nextStateId);
				lookahead = lexer.peek();
			}
			else if (op.isReduce()) {
				/* 此次归约产生的AST节点所需的元素 */
				let eles: ASTElement[] = [];
				// 动作: 归约完成后将符号对应的状态弹出
				// 每个状态都由输入一个符号得到 因此每个状态都一个对应的符号  详见:P158
				for (let i = 0; i < op.prod.body.length; i++) {
					stateStack.pop();
					eles.unshift(astStack.pop()!);  //issue AST元素的顺序问题
				}
				astStack.push(op.prod.postAction(eles, astStack));  //issue ASTNode的元素的顺序问题
				debug(`reduce ${op.prod}, make ast: ${astStack.peek()}`);
				lookahead = op.prod.head;
			}
			else if (op.isAccept()) {
				debug(`accept!`);
				break;
			}
			debug(`${astStack.join(" ")}`);
		}
		return astStack.pop() as ASTree;
	}
}

/*
1. ASTNode的元素的顺序问题

考虑如下文法
	S->E
	E->E+T | E-T | T
	T->T*F | T/F |F
	F->(E) | NUM

假设输入:
1 + 2 / 3
必然在某一时刻 Ast Stack中的元素为:
ENode + TNode / FNode

此时,即将要执行的动作是将 TNode / FNode 归约为T,创建一个TNode:
	new TNode([TNode,'/',FNode])
这时要注意的是,传给TNode的集合应该保持与产生式中定义的符号顺序保持一致.
假如传入的是 [FNode,'/',TNode], 那么原本的2/3的含义将变为3/2
*/
