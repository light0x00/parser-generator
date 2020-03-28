
import { Terminal, SSymbol, Production, AugmentedGrammar, Shift, Reduce } from "@parser-generator/definition";
import { addAll_Set, assert } from "@light0x00/shim";

export class Item {

	private _prod: Production;
	private _dot: number = 0;
	lookaheadSet: Set<Terminal>
	constructor(production: Production, dot: number = 0, lookaheadSet: Set<Terminal> = new Set<Terminal>()) {
		this._prod = production;
		/* 对于空推导(形如A->𝝴). 直接将 dot 置于末尾(A->𝝴·) */
		this._dot = production.isEpsilon() ? production.body.length : dot;
		this.lookaheadSet = lookaheadSet;
	}
	get prod() {
		return this._prod;
	}
	/* TODO 更名为dot */
	get dotPos() {
		return this._dot;
	}

	hasNext(): boolean {
		return this._dot < this.prod.body.length;
	}

	nextSymbol(): SSymbol {
		if (!this.hasNext())
			throw new Error(`${this} has no next item!`);
		return this.prod.body[this._dot];
	}
	nextItem() {
		if (!this.hasNext())
			throw new Error(`${this} has no next item!`);
		/*
			😇New features to support LR

			为什么当前项展望集应该被后继项继承?

			考虑如下文法:
			S->As
			A->a

			I0
			S->·As ,$
			A->·a ,s

			I1
			A->a· ,s

			如上所示,I0输入a得到I1
			其中「A->a· ,s」继承了「 A->·a ,s」的展望符
			*/
		return new Item(this.prod, this._dot + 1, this.lookaheadSet);
	}
	toString() {
		let str = "";
		let symbols = this.prod.body;
		for (let i = 0; i < symbols.length; i++) {
			if (this._dot == i)
				str += "·";
			str += (typeof symbols[i] =="string"? `'${(symbols[i]as string).replace(/'/g,"\\'")}'` : symbols[i] ) +" ";
		}
		if (this._dot == symbols.length)
			str += "·";
		str +=" ❕" + Array.from(this.lookaheadSet).map((i)=>(typeof i==="string"? `'${i.replace(/'/g,"\\'")}'`:i )).join(" ") ;
		return `${this.prod.head.name}->${str}`;
	}
	equals(other: Item) {
		/*
			两个项是否相等,
			1. 所含产生式一样
			2. 「dot」所在位置一样

			😇New features to support LR
			3. 展望集(lookaheadSet)一样
			*/
		if (other.prod.id != this.prod.id)
			return false;
		if (other._dot != this._dot)
			return false;

		if (other.lookaheadSet.size != this.lookaheadSet.size)
			return false;
		for (let t of this.lookaheadSet) {
			if (!other.lookaheadSet.has(t)) {
				return false;
			}
		}
		return true;
	}
	/*

	*/
	/**
	 * 😇New features to support LALR
	 * 判断是否是同心项(prod、dot相等)
	 * @param other
	 */
	isSameCoreWith(other: Item) {
		if (other.prod.id != this.prod.id)
			return false;
		if (other._dot != this._dot)
			return false;
		return true;
	}
}
/* TODO 不再继承数组 */
export class ItemSet extends Array<Item> {
	/**
	 * 同心项是无意义的,此Map会记录每一个项的key(由项的 prodId、dot组成).
	 * 每当添加一个新项时,检查是否存在与之同心的项, 如果有,则只需合并即可.
	 */
	private added = new Map<string, Item>()
	constructor(...items: Item[]) {
		super(...items);
		for (let item of items)
			this.added.set(this.coreKey(item), item);
	}

	contains(item: Item) {
		return this.added.has(this.coreKey(item));
	}
	private coreKey(item: Item) {
		return item.prod.id + "" + item.dotPos;
	}
	pushOrMerge(item: Item) {
		let existing = this.added.get(this.coreKey(item));
		if (existing === undefined) {
			this.push(item);
		} else {
			//已经存在 则合并LR展望符集
			addAll_Set(existing.lookaheadSet, item.lookaheadSet);
		}
	}
	//最好的办法是 将数组作为内部对象 而不是继承
	push(item: Item) {
		this.added.set(this.coreKey(item), item);
		return super.push(item);
	}

	toString() {
		let str = "";
		for (let item of this) {
			str += item.toString() + "\n";
		}
		return str.replace(/\n$/, "");
	}
	equals(other: ItemSet) {
		/* 两个项集A、B是否相等,取决于
			  1. 它们所包含的项个数相等
			  2. A、B中的每一个项在对方集合中都存在相等的项
		   */
		if (other.length != this.length)
			return false;
		//又写出一个n2复杂度23333  !!更好的办法是用Set来存放
		for (let o1 of this) {
			let hasMatched = false;
			for (let o2 of other) {
				if (o1.equals(o2)) {
					hasMatched = true;
					break;
				}
			}
			if (!hasMatched)
				return false;
		}
		return true;
	}

	/*
    返回当前状态的后继符号集
    例: 对于下状态(项集),其后继符号为: {E,T,F,(,id}
    I0
        S->·E
        E->·E+T
        E->·T
        T->·T*F
        T->·F
        F->·(E)
        F->·id
     */
	getNextSymbols() {
		let nextSymbols = new Set<SSymbol>();
		for (let item of this) {
			if (item.hasNext()) {
				nextSymbols.add(item.nextSymbol());
			}
		}
		return nextSymbols;
	}

}
export class State extends ItemSet {
	id: number
	/* 描述当前状态在接受某个符号后去往的后继状态 */
	mapping = new Map<SSymbol, State>()
	constructor(id: number, items: Item[]) {
		super(...items);
		this.id = id;
	}

	toString() {
		return `<${this.id}>\n${super.toString()}`;
	}

	/**
     * 添加后继状态
     * 添加当前状态输入「指定符号」后去往的「后继状态」
     *
     * 原则上一个状态对于同一符号只能有一个后继状态,如果重复将抛出异常
     * @param symbol 输入符号
     * @param nextState 后继状态
     */
	addNextState(symbol: SSymbol, nextState: State) {
		assert(this.mapping.get(symbol) == null, `A state can only have one next state to the same symbol`);
		this.mapping.set(symbol, nextState);
	}

	getNextState(symbol: SSymbol) {
		return this.mapping.get(symbol);
	}

}
export class StateSet extends Array<State>{
	mapping = new Map<State, Map<SSymbol, State>>()
	/* 判断状态集中是否已经存在 相同性质(参见ItemSet的equals方法) 的状态(项集) */
	getExisting(state: ItemSet): null | State {
		for (let existing of this) {
			if (existing.equals(state)) {
				return existing;
			}
		}
		return null;
	}
	satrtState(): State {
		assert(this[0] != null);
		return this[0];
	}
}
/* SLR\LR1构造自动机的方式不同,此接口用于屏蔽差异 */
export interface AutomataTools {
	GOTO(I: ItemSet, inputSymbol: SSymbol): ItemSet
	closure(itemSet: ItemSet): ItemSet
	getStartState(grammar: AugmentedGrammar): State
}


export class ShiftExt extends Shift {
	public prec: number;
	public leftAssoc: boolean;
	constructor(nextStateId: number, prec: number = -1, assoc: boolean = false) {
		super(nextStateId);
		this.prec = prec;
		this.leftAssoc = assoc;
	}

	setIfLarger(prec: number, assoc: boolean) {
		if (prec > this.prec) {
			this.prec = prec;
			this.leftAssoc = assoc;
		}
	}

	isShift(): this is ShiftExt {
		return true;
	}
}


export class ReduceExt extends Reduce {
	prec: number;
	leftAssoc: boolean;
	item : Item;
	constructor( item : Item, prec: number = -1, leftAssoc: boolean = false) {
		super(item.prod);
		this.item =item;
		this.prec = prec;
		this.leftAssoc = leftAssoc;
	}

	equals(obj: Object) {
		return obj instanceof Reduce && obj.prod == this.prod;
	}

	isReduce(): this is ReduceExt {
		return true;
	}
}


// export type LRParsingTable = Map<number, Map<SSymbol, Operation>>;

// export class ParsingTable {
// 	private parsingTable = new Map<number, Map<SSymbol, Operation>>()

// 	get table() {
// 		return this.parsingTable;
// 	}

// 	put(state: number, symbol: SSymbol, op: Operation): void {
// 		let row = this.parsingTable.get(state);
// 		if (row == undefined) {
// 			row = new Map<SSymbol, Operation>();
// 			this.parsingTable.set(state, row);
// 		}
// 		row.set(symbol, op);
// 	}
// 	has(state: number, symbol: SSymbol, op: Operation): boolean {
// 		let row = this.parsingTable.get(state);
// 		if (row == undefined)
// 			return false;
// 		let exstingOp = row.get(symbol);
// 		if (exstingOp == null)
// 			return false;
// 		return exstingOp.equals(op);
// 	}
// 	get(state: number, symbol: SSymbol): Operation | undefined {
// 		let row = this.parsingTable.get(state);
// 		// assert(row != null, `state(${state.id}) is not found in parsing table!`)
// 		if (row == undefined)
// 			return undefined;
// 		return row.get(symbol);
// 	}

// 	getExpectedSymbols(state: number): SSymbol[] {
// 		let row = this.parsingTable.get(state);
// 		if (row == undefined)
// 			return [];
// 		return Array.from(row.keys());
// 	}

// 	getExpectedTokens(state: number) {
// 		let expS = this.getExpectedSymbols(state);
// 		return expS.filter(s => !(s instanceof NonTerminal));
// 	}
// }

