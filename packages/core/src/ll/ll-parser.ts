
/*******************************************************************************************************
关于积聚
LL分析是自顶向下的,这意味者其构造AST节点的顺序也是自顶向下.在实现过程存在的问题是: 构造父节点时,所需的子节点尚未构造.
因此,需要一种机制使父节点延迟构造,只有所依赖的子节点构造完成时才构造父节点. 我将这种机制称为`积聚`.
*******************************************************************************************************/

import {
	EOF, NIL, ASTree, ILexer,
	NonTerminal, SSymbol, isNonTerminal, ASTElement, IToken,PostAction
} from "@parser-generator/definition";
import { Stack, assert } from "@light0x00/shim";
import rootDebug from "debug";
import { FirstTable, FollowTable } from "../first-follow";
import { MismatchError } from "../utils";
let debug = rootDebug("PG:LLParser");

/**
 * len: 该节点所需积聚的子节点数量, 比如 E->FT 需要积聚两个才可以构造E, F->digit需要积聚1个可以构造F
 * accLen: 当前已经积聚的子节点数量
 * action: 积聚完成后执行的动作(生成AST节点)
 */
type ASTAction = { action: PostAction, len: number, accLen: number }
/**
 * 自定向下分析的积聚处理  #issue 关于积聚
 */
class ASTAccumulator {
	private astStack = new Stack<ASTElement>()
	private actionStack = new Stack<ASTAction>()
	private rootASTree : ASTree | undefined;
	get ast(){
		assert(this.rootASTree!=undefined,"尚未积聚完成,LL分析树尚未构造到根节点");
		return this.rootASTree;
	}
	add(action: PostAction, len: number) {
		assert(len > 0, "按照设计,不应该有长度为0的的产生式");
		this.actionStack.push({ action, len, accLen: 0 });
	}
	acc(token: IToken) {
		assert(this.actionStack.size() > 0,"动作栈为空!\n\t积聚的目的是为了确定何时触发动作(类似LR中确定句柄),如果没有动作,则积聚无意义,是为bug");

		this.astStack.push(token);
		let top = this.actionStack.peek();
		++top.accLen;
		while (top.accLen == top.len) {
			//子节已经积聚满 可以执动作构造父节点
			let { action, len } = this.actionStack.pop()!;
			let eles = [];
			for (let i = 0; i < len; i++)
				eles.unshift(this.astStack.pop()!); //栈中弹出顺序和产生式顺序相反,因此倒序添加
			let ast = action(eles, this.astStack);
			debug("make ast " + ast);
			this.astStack.push(ast);
			//由于当前节点积聚完成 将其父节点积聚点+1 (根节点除外,因为没有父节点)
			if(this.actionStack.size()==0){
				debug("已生成了根节点!");
				this.rootASTree = ast;
				break;
			}
			top = this.actionStack.peek();
			++top.accLen;
		}
	}
}

/*
Nonrecursive LL Predictive Parsing
*/
export class LLParser {

	private startNT: NonTerminal
	private firstTable: FirstTable
	private followTable: FollowTable

	constructor(startSymbol: NonTerminal, firstTable: FirstTable, followTable: FollowTable) {
		this.startNT = startSymbol;
		this.firstTable = firstTable;
		this.followTable = followTable;
		checkAmbiguity(firstTable, followTable);
	}

	parse(lexer: ILexer): ASTree {
		let astAcc = new ASTAccumulator();

		let symStack = new Stack<SSymbol>();
		symStack.push(EOF);
		symStack.push(this.startNT);

		let lookahead = lexer.next();
		while (symStack.size() > 0) {
			let symbol = symStack.pop()!;
			let lookaheadKey = lookahead.key();
			//非终结符
			if (isNonTerminal(symbol)) {

				let firstSet = this.firstTable.get(symbol)!;
				let followSet = this.followTable.get(symbol)!;

				let candidate_prod = firstSet.get(lookaheadKey);
				//如果当前非终结符存在 对lookahead的非ε推导
				if (candidate_prod != null) {
					//将候选式符号倒序压入栈
					for (let i = candidate_prod.body.length - 1; i >= 0; i--)
						symStack.push(candidate_prod.body[i]);
					astAcc.add(candidate_prod.postAction!, candidate_prod.body.length);
				}
				//否则
				else {
					//检查当前非终结符是否可推出ε, 并且lookahead存在于followSet
					if (firstSet.has(NIL) && followSet.has(lookaheadKey)) {
						astAcc.acc(NIL); //积聚
					} else {
						throw new MismatchError(firstSet.keys(), lookahead);
					}
				}
			}
			//终结符
			else {
				if (lookaheadKey != symbol)
					throw new MismatchError(symbol, lookahead);
				debug(`matched ${lookahead}`);
				if (lookahead.key() != EOF)
					astAcc.acc(lookahead); //积聚
				lookahead = lexer.next();
			}
		}
		debug("success!");
		return astAcc.ast;
	}

}

/*

1. 二义性
如果一个非终结符A可以推出ε,那么必须满足 First(A) ∩ Follow(A)=∅, 否则就存在二义性

S->Aa
A->a|ε

First(A)={a,ε}
Follow(A)={a}

预测表:
+------+--------------+
|      | a            |
+------+--------------+
|A     | A->a,A->ε    |
+------+--------------+

在输入串为「a」时,分别选择A->a,A->ε,前者将匹配失败,而后者匹配成功. 无法确定一个唯一的选择.
*/
function checkAmbiguity(firstTable: FirstTable, followTable: FollowTable) {
	/* issue: 1. 二义性 */
	for (let [pname, firstMap] of firstTable) {
		if (firstMap.has(NIL)) {
			let followSet = followTable.get(pname)!;
			for (let v of firstMap.keys()) {
				if (followSet.has(v))
					throw new Error(`Found ambiguity in grammar. There is conflict between the First-set(${pname}) and Follow-Set(${pname}) on ${v}`);
			}
		}
	}
}