import { State, StateSet, AutomataTools } from "./definition";
import _debug from "debug";
import { AugmentedGrammar } from "@parser-generator/definition";

let debug = _debug("PG:automata");

/**
 * 构造一个由项集组成的状态机,(详见 #自动机的构造)
 * @param grammar
 * @param tools
 */
export function getAutomata(grammar: AugmentedGrammar, tools: AutomataTools): StateSet {
	//状态id计数
	let stateIdCounter = 1;
	// let I0 = new State(stateIdCounter++, closure(new ItemSet(new Item(grammar.prodOfStartNT))))
	let I0 = tools.getStartState(grammar);
	debug(`${I0}`);
	//存放状态集
	let stateSet = new StateSet();
	stateSet.push(I0);
	//状态集中待处理的 状态的索引
	let procssedIdx = 0;

	//每一个状态集中尚未处理的状态
	while (procssedIdx < stateSet.length) {
		let curState = stateSet[procssedIdx++];
		//得到当前状态的后继符号集
		let nextSymbols = curState.getNextSymbols();
		//对当前状态输入 符号集 中的每个符号
		for (let nextSymbol of nextSymbols) {
			//生成当前状态对输入(nextSymbol)的后继状态
			let nextItemSet = tools.GOTO(curState, nextSymbol);
			//检查生成的状态是否已经存在 (判断状态相等标准见:ItemSet.equals())
			let nextState = stateSet.getExisting(nextItemSet);
			if (nextState == null) {
				nextState = new State(stateIdCounter++, nextItemSet);
				stateSet.push(nextState);
				debug(`\n+Adding a new state:\n${nextState}\n`);
			}
			//记录当前状态 与 后继状态 的连接
			curState.addNextState(nextSymbol, nextState);
			debug(`mapping: ${curState.id} ----- ${nextSymbol} -----> ${nextState.id}`);
		}
	}
	return stateSet;
}
