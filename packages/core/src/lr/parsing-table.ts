import { assert } from "@light0x00/shim";
import { NonTerminal, Terminal, EOF, Operation, ParsingTable, Goto, Accept } from "@parser-generator/definition";
import { StateSet, Item, ReduceExt, ShiftExt } from "./definition";

import { IFunction } from "@light0x00/shim";

import rootDebug from "debug";
let debug = rootDebug("APP:LR:parsing-table");

export type AllowedFollowsWhenReducing = IFunction<Item, Set<Terminal>>
/*
输入: 一个由「项集族」和「项集间跳转关系」组成的状态机
输出: LR/SLR分析表

注: 用 stateA.next_state(input_symbol) 表示状态A输入符号后进入的下一个状态

遍历每一个状态S中的每一个项I
    - I为Reduce/Accpet项,形如 A->𝜶𝜷·
        - 若A是不是开始符号,则为Follow(T)中的每一个符号f填入: T[S][f] = Reduce A
        - 若A是开始符号,操作同上,不过填入得时 Accept A (本质上Accept项是一个特殊的归约项)
    - I为Shift/Goto, A->𝜶·𝜷
        - 若𝜷为非终结符,则产生 跳转项, T[S][𝜷] = Goto S.next_state(𝜷)
        - 若𝜷为终结符,则产生式 移入项, T[S][𝜷] = Shift S.next_state(𝜷)
*/
/**
 *
 * @param stateSet 状态机
 * @param startSymbol 开始符号
 * @param allowedFollowsWhenReducing 对于任意一个归约项,返回其允许的「归约展望符」(SLR/LR)
 */
export function getParsingTable(stateSet: StateSet, startSymbol: NonTerminal, allowedFollowsWhenReducing: AllowedFollowsWhenReducing): ParsingTable {

	let parsingTable = new ParsingTable();

	//状态集中的每一个状态
	for (let curState of stateSet) {
		//状态中的每一个项
		for (let curItem of curState) {
			let { prec: curPrec, leftAssoc: curLeftAssoc } = curItem.prod;
			// 移入项 形如: A->𝜶·𝜷
			if (curItem.hasNext()) {
				let followSymbol = curItem.nextSymbol();
				let existingOp = parsingTable.get(curState.id, followSymbol);
				if (existingOp != null) { //issue #关于冲突检查 1
					if (existingOp.isReduce()) { //issue #关于冲突检查 2. 移入-归约冲突
						if (!compareForShiftReduceConflict({ prec: curPrec, leftAssoc: curLeftAssoc }, { prec: (existingOp as ReduceExt).prec, leftAssoc: (existingOp as ReduceExt).leftAssoc }))
							continue;
					}
					else if (existingOp.isShift()) //issue #关于优先级与结合性 2
						(existingOp as ShiftExt).setIfLarger(curPrec, curLeftAssoc);
				}
				let nextState = curState.getNextState(followSymbol);
				assert(nextState != null);
				let op: Operation;
				//goto
				if (followSymbol instanceof NonTerminal)
					op = new Goto(nextState.id);
				//shift
				else
					op = new ShiftExt(nextState.id, curPrec, curLeftAssoc);
				debug(`state(${curState.id}) ${followSymbol} ${op}`);
				parsingTable.put(curState.id, followSymbol, op);
			}
			//归约项 形如: A->𝜶𝜷·
			else {
				let allowedFollows = allowedFollowsWhenReducing(curItem); //issue #关于lookahead的确定
				assert(allowedFollows != null);
				for (let followSymbol of allowedFollows) {
					let existingOp = parsingTable.get(curState.id, followSymbol);
					if (existingOp != null) { //issue #关于冲突检查
						if (existingOp.isReduce() && existingOp.prod.head != curItem.prod.head) { //issue #关于冲突检查 1. 归约-归约冲突
							if (!compareForReduceReduceConflict(
								{ prec: curPrec, leftAssoc: curLeftAssoc },
								{ prec: (existingOp as ReduceExt).prec, leftAssoc: curLeftAssoc })) {
								continue;
							}
						}
						else if (existingOp.isShift()) { //issue #关于冲突检查 2. 移入-归约冲突
							if (!compareForShiftReduceConflict(
								{ prec: curPrec, leftAssoc: curLeftAssoc },
								{ prec: (existingOp as ShiftExt).prec, leftAssoc: curLeftAssoc })) {
								continue;
							}
						}
					}
					let op;
					//accept
					if (followSymbol == EOF && curItem.prod.head == startSymbol)
						op = new Accept();
					//reduce
					else
						op = new ReduceExt(curItem.prod, curPrec, curLeftAssoc);
					debug(`state(${curState.id}) ${followSymbol} ${op}`);
					parsingTable.put(curState.id, followSymbol, op);
				}
			}
		}
	}
	return parsingTable;
}

//issue #关于优先级与结合性 3.1 移入归约冲突
function compareForShiftReduceConflict(cur: { prec: number, leftAssoc: boolean }, existing: { prec: number, leftAssoc: boolean }) {
	let { prec: curPrec, leftAssoc: curLeftAssoc } = cur;
	let { prec: existingPrec } = existing;

	if (curPrec > existingPrec) {
		//shift
		return true;
	} else if (curPrec == existingPrec) {
		// assert(curLeftAssoc == exisingAssoc, `Both ${existingOp.prod},${curItem.prod} contain the same priority ${curPrec} but assoc differently`);
		if (curLeftAssoc) {
			//reduce
			return false;
		} else {
			//shift
			return true;
		}
	} else {
		//reduce
		return false;
	}
}

//issue #关于优先级与结合性 3.2 归约归约冲突
function compareForReduceReduceConflict(cur: { prec: number, leftAssoc: boolean }, existing: { prec: number, leftAssoc: boolean }) {
	let { prec: curPrec } = cur;
	let { prec: existingPrec } = existing;

	if (curPrec > existingPrec) {
		return true;
	} else {
		return false;
	}
}

/*
关于Shift、GOTO、Reduce、Accept的产生时机
	- Shift/GOTO,每当遇到形如A->𝜶·𝜷的项时,如果𝜷是非终结符则产生GOTO动作,否则为Shift
	- Reduce/Accept,每当遇到形如A->𝜶·的项时,如果A是开始符号则Accpet,否则为Reduce

关于lookahead的确定
	- Shift/GOTO,对于一个形如A->𝜶·𝜷的项,其lookahead为𝜷
	- Reduce/Accept,取决于具体分析算法:
		- SLR,lookhead存在于「项对应的产生式的Follow集」
		- LR,lookhead存在于项的展望集(lookaheadSet)

关于冲突检查
1. 移入-归约冲突
	1.1 允许多个项移入同一符号,考虑如下两个项:
		S->·E
		E->·E+T
		它们的 nextSymbol 都是 E, 在处理第一个项时,已经计算了当前状态对输入E的后继状态,所以在当前状态第二次遇到E时,不必再重新处理.
	1.2 对同一lookahead,存在移入、归约操作,考虑如下项集:
		E->E+E·,{+,*,EOF}
		E->E·+E,{+,*,EOF}
		E->E·*E,{+,*,EOF}

		该项集对于输入{+,*,EOF},同时存在移入、归约操作.

2. 归约-归约冲突, 原则上同一个状态对同一符号只能有一个操作,若个一个状态中的多个归约项的Follow集存在交集,那么分为如下两种情况进行处理:
	2.1 允许状态中多个项归约为同一个符号. 如下例子中,虽然两个项的Follow集都为Follow(A),但是归约动作/结果都是相同的(都是A),因此允许该情况存在.
		A->𝜶·
		A->𝜶·
	2.2 不允许状态中多个项归约为不同符号. 如下例子中,Follow(A) ∩ Follow(B)不为空的情况下,无法预知归约为A还是B,因此如下情况不允许存在.
		A->𝜶·
		B->𝜶·

3. 其他冲突
	3.1 允许GOTO-GOTO冲突, 即: A->a·C B->b·C
	3.2 Accept和 GOTO、Shift、Reduce都不可能冲突,因为Accept具备以下特征:
		- EOF才可能触发Accept (Shift、GOTO不具备)
		- 归约项必须为开始符号 (Reduce不具备)

关于优先级与结合性
	1.每一个项都具有优先级、结合性属性.
		E->E+E·,{+,*,EOF}
		E->E·+E,{+,*,EOF}
		E->E·*E,{+,*,EOF}
		+: prec=1,assoc=left
		*: prec=2,assoc=left

	2. 如何确定一个项、操作的优先级、结合性?
		2.1 项的prec、assoc由产生式中的符号决定,例如 E->E+E中只有`+`会有优先级、结合性,因此该产生式的优先级、结合性取决于`+`;
			如果项中存在多个符号具有prec、assoc,则以prec最大的符号为准,例如 E->E+E*, 其优先级以`*`为准.
		2.2 操作的prec、assoc取决于产生式该移入操作的项,例如 E->E·+E,会产生式一个对+的`shift`操作,该操作的优先级、结合性取决于项E->E·+E;
			类似的,E->E+E·会产生式一个`reduce`操作,该操作的prec、assoc取决于E->E+E·

	3. 如何根据优先级、结合性决定解决冲突?
		通过比较两个操作的prec、assoc,
		3.1 移入归约冲突
			如果相同优先级
				结合方向相同
					- 左结合,优先归约
					- 右结合,优先移入
				结合方向不同
					抛出异常
			不同优先级
				以高优先级的操作的prec、assoc为准
		3.2 归约归约冲突
			以高优先级的操作的prec、assoc为准
		例1,E->E·+E产生一个`shift`,而E->E+E·产生一个`reduce`,两个操作的优先级相同,且为左结合,因此选择`reduce`
		例2,E->E·*E将产生一个`shift`, 而E->E+E·产生一个`reduce`,前者的优先级更高,因此选择`shift`
*/