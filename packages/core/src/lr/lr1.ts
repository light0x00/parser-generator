import { IFunction, addAll_Set, assert } from "@light0x00/shim";
import { Terminal, SSymbol, NonTerminal, NIL, Production, AugmentedGrammar, EOF } from "@parser-generator/definition";
import { AutomataTools, ItemSet, Item, State, StateSet } from "./definition";

import _debug from "debug";
import { FirstCalculator } from "../first-follow";
import { getAutomata } from "./automata";
import { getParsingTable } from "./parsing-table";
let debug = _debug("PG:LR1");

type FirstSetGetter = IFunction<SSymbol, Set<Terminal>>;

/* 构造自动机所需要的方法 */
export class LR1AutomataTools implements AutomataTools {
	getFirstSet: FirstSetGetter
	constructor(firstSetCalculator: FirstSetGetter) {
		this.getFirstSet = firstSetCalculator;
	}

	GOTO(I: ItemSet, inputSymbol: SSymbol): ItemSet {
		let nextItemSet = new ItemSet();
		for (let item of I) {
			if (!item.hasNext())
				continue;
			if (item.nextSymbol() == inputSymbol) {
				nextItemSet.push(item.nextItem());
			}
		}
		return this.closure(nextItemSet);
	}

	closure(itemSet: ItemSet): ItemSet {
		let itemSetClosure: ItemSet = itemSet;
		//项集的每一个项 item
		for (let processedIdx = 0; processedIdx < itemSetClosure.length; processedIdx++) {
			let item = itemSetClosure[processedIdx];
			if (!item.hasNext()) //issue 1.1
				continue;
			let expandSym = item.nextSymbol();
			if (!(expandSym instanceof NonTerminal)) //issue 1.2
				continue;
			if (item.prod.body[0] == item.prod.head && item.dotPos == 0) { //issue 1.4
				debug(`Stop expanding left recursion production ${expandSym}`);
				continue;
			}
			let lrps = this.getLeftRecursiveProds(expandSym); //issue 2.1.1.1 左递归产生式
			let nlrlookSet = this.determineNonLeftRecursionLookSet(item);
			//issue 2.1.1 展开符包含
			if (lrps.length > 0) {
				let lrLookSet = this.determineLeftRecursionLookSet(item); //由所有左递归项带来的展望符集
				for (let lrp of expandSym.prods) {
					let unionLookSet = new Set<Terminal>();
					addAll_Set(unionLookSet, lrLookSet);
					addAll_Set(unionLookSet, nlrlookSet);
					itemSetClosure.pushOrMerge(new Item(lrp, 0, unionLookSet));
				}
			}
			//issue 2.1.2 展开符不包含递归产生式的情况
			else {
				for (let prod of expandSym.prods) {
					let newItem = new Item(prod, 0, nlrlookSet);
					itemSetClosure.pushOrMerge(newItem);
				}
			}
		}
		return itemSetClosure;
	}

	/**
    ========展开符包含左递归产生式的处理========

    文法:
    S->A
    A->A𝜶 | A𝜷 | 𝝲

    状态:
    S->·A ,$
    A->·A𝜶,$
    A->·A𝜷,$
    A->·𝝲, ?

    如何求「 A->𝝲 」的展望集?

    若𝜶,𝜷不能推出𝝴,则 lookSet(A->·𝝲) = {𝜶,𝜷}
    否则 lookSet(A->·𝝲) ={𝜶,𝜷,$}

    形式化:
    加入在A中的每一个左递归产生式中的「第一非A的符号的First集」,记为First(!A), 如果该集内存在𝝴,则一路向后直到末尾,如果仍存在𝝴,则加入 Look(A)

    伪代码:
    for each lr-prod in A
        for each sym in lr-prod
            if sym != A
                add First(sym)
                if 𝝴 ∉ First(sym)
                    break
                else if sym is rightmost
                    add lookSet(S)

    注: Look(S) 表示S的lookeheadSet
    * @param curItem
    */
	determineLeftRecursionLookSet(curItem: Item): Set<Terminal> {
		let target = curItem.nextSymbol();
		assert(target instanceof NonTerminal);

		let lookaheadSet = new Set<Terminal>();
		//目标的所有左递归产生式
		let lrProds = this.getLeftRecursiveProds(target);
		//每一个左递归产生式
		for (let lr_prod of lrProds) {
			//每一个符号
			let searching = false;
			for (let j = 0; j < lr_prod.body.length; j++) {
				if (lr_prod.body[j] != target && !searching) {
					continue;
				}
				// right-most
				if (j == lr_prod.body.length - 1) {
					addAll_Set(lookaheadSet, curItem.lookaheadSet);
				} else {
					let follower = lr_prod.body[j + 1];
					let follower_first_set = this.getFirstSet(follower);
					addAll_Set(lookaheadSet, follower_first_set);
					// 𝝴 ∉ First(follower)
					if (!follower_first_set.has(NIL)) {
						break;
					}
					// 𝝴 ∈ First(follower)  scan next one
					else {
						lookaheadSet.delete(NIL);
						searching = true;
					}
				}
			}
		}
		return lookaheadSet;
	}
	/**
    ========展开符不包含左递归产生式的处理========

    约定
    - 将闭包项记为 closureItem ,例如S->·As
    - 将展开项计为 expandItem , 例如由展开符A得到的项 A->·a

    形式化计算规则如下:
    展开符位于item末端,形如A->·B
        lookSet(expandItem)=lookSet(prevItem)
    next非末端,形如A->·B𝜶𝜷
        lookSet(expandItem)=First(𝜶) ,
            如果𝜶可推出𝝴,则继续向后寻找𝜷,重复这个过程,
            如果𝜷为最末尾符号,且𝜷仍可推出𝝴,那么将lookSet(prevItem)放入lookSet(next)
    * @param prevItem
    */
	determineNonLeftRecursionLookSet(prevItem: Item): Set<Terminal> {
		let expandSym = prevItem.nextSymbol();
		assert(expandSym instanceof NonTerminal);

		let lookaheadSet = new Set<Terminal>();

		for (let i = prevItem.dotPos; i < prevItem.prod.body.length; i++) {
			if (i == prevItem.prod.body.length - 1) {
				addAll_Set(lookaheadSet, prevItem.lookaheadSet);
				break;
			} else {
				let firstSetOfFollow = this.getFirstSet(prevItem.prod.body[i + 1]);
				addAll_Set(lookaheadSet, firstSetOfFollow);
				if (firstSetOfFollow.has(NIL)) {
					lookaheadSet.delete(NIL);
				} else {
					break;
				}
			}
		}
		return lookaheadSet;
	}
	getLeftRecursiveProds(non_terminal: NonTerminal) {
		let lr_prods: Production[] = [];
		//每一个产生式
		for (let prod of non_terminal.prods) {
			//产生式中的每一个符号
			for (let symbol of prod.body) {
				//若相等,,则表示prod存在左递归
				if (symbol == non_terminal) {
					lr_prods.push(prod);
					break;
				}
				//若不相等 且First(symbol)不存在𝝴则中断,则表示prod没有左递归
				else if (!this.getFirstSet(symbol).has(NIL)) {
					break;
				}
			}
		}
		debug(lr_prods.join(","));
		return lr_prods;
	}
	getStartState(grammar: AugmentedGrammar) {
		return new State(0, this.closure(new ItemSet(new Item(grammar.startNT().prods[0], 0, new Set<Terminal>([EOF])))));
	}
}

export function getLR1Automata(grammar: AugmentedGrammar) {
	let fir = new FirstCalculator(grammar);
	return getAutomata(grammar, new LR1AutomataTools((i) => fir.getFirstSet(i)));
}

export function getLR1ParsingTable(grammar: AugmentedGrammar, autotama?: StateSet) {
	if (autotama == undefined)
		autotama = getLR1Automata(grammar);
	return getParsingTable(autotama, grammar.startNT(), (i) => i.lookaheadSet);
}
