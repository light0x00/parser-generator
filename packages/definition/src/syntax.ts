import { assert, Stack } from "@light0x00/shim";
import { IToken, TableKey } from "./lexical";
/*******************************************************************************************************
符号的原型
	符号原型的作用是用于建立一种逻辑上的匹配关系.
	对于终结符而言:
		1. 值类型符号,对应于 比较值的token,比如 '==' ,没有原型, 分析过程中直接使用词素值匹配
		2. 原型类型符号,对应于 比较类型的token, 比如 NUMBER ,其原型是一个TerminalPro对象, 分析过程中使用该对象匹配
	对于非终结符:
		3. 文法中左侧符号都会对应一个NonterminalPro对象,而产生式体中出现的非终结符,比如 A->aA ,第二个
	例:
		E->E1+F1
		F->digit
	- 终结符‘+’没有原型,分析时匹配词素值.
	- 终结符 digit 的实例则不可枚举,1、2都digit,分析时不能以词素值为准,而是以原型为准,1、2的词素值不一样,但其原型一致,
		这是一种逻辑相等关系.
	- 非终结符E1的原型是E,F1的原型是F.
*******************************************************************************************************/

/**
 * 非终结符符号原型
 */
export class NonTerminal implements TableKey {

	private _name: string
	private _prods: Production[]
	private _isStart: boolean
	constructor(name: string, isStart: boolean = false, prods: Production[] = []) {
		this._name = name;
		this._isStart = isStart;
		this._prods = prods;
	}
	get name() {
		return this._name;
	}
	get prods() {
		return this._prods;
	}
	set prods(ps: Production[]) {
		this._prods = ps;
	}
	get isStart() {
		return this._isStart;
	}
	toString() {
		return this._name;
	}
	key(): SSymbol {
		return this;
	}
}
/**
 * token原型
 */
export class TokenPro implements IToken {

	private name: string  //just for debug
	constructor(name: string) {
		this.name = name;
	}
	toString() {
		return this.name;
	}
	key(): Terminal {
		return this;
	}
}
export const NIL = new TokenPro("NIL");
export const EOF = new TokenPro("EOF");

export type SSymbol = string | NonTerminal | TokenPro;
export type Terminal = TokenPro | string;  //还应该包含一些基础类型 所以还是设置为 Object最好

export function isNonTerminal(sym: Object): sym is NonTerminal {
	return sym instanceof NonTerminal;
}
export function isTerminal(sym: Object): sym is Terminal {
	return sym instanceof TokenPro || typeof sym === "string";
}

export type MidAction = ((stack: Stack<ASTElement>) => void)

export class SymbolWrapper {
	private _value: SSymbol
	private _action: MidAction | undefined
	constructor(sym: SSymbol, action?: MidAction) {
		this._value = sym;
		this._action = action;
	}
	get value(): string | NonTerminal | TokenPro {
		return this._value;
	}
	get action(): MidAction | undefined {
		return this.action;
	}
	isNonTerminal(): boolean {
		return isNonTerminal(this._value);
	}
	isTerminal(): boolean {
		return isTerminal(this._value);
	}
	isNIL(): boolean {
		return this._value == NIL;
	}
	toString() {
		return this._value.toString() + (this._action == undefined ? "" : `<%${this._action}%>`);
	}
}

/**
 * 产生式
 */
export class Production {
	private _id: number
	private _nt: NonTerminal
	private _actionBody: SymbolWrapper[]
	private _body: SSymbol[]
	private _preAction: PreAction | undefined
	private _postAction: PostAction | undefined

	private _leftAssoc: boolean;
	private _prec: number;

	constructor(id: number, nt: NonTerminal, body: SymbolWrapper[], preAction?: PreAction, postAction?: PostAction, leftAssoc = false, prec = -1) {
		this._id = id;
		this._nt = nt;
		this._actionBody = body;
		this._preAction = preAction;
		this._postAction = postAction;
		this._body = new Array<SSymbol>();
		this._leftAssoc = leftAssoc;
		this._prec = prec;
		for (let asym of body) {
			this._body.push(asym.value);
		}
	}

	get id() {
		return this._id;
	}
	get head() {
		return this._nt;
	}
	get body() {
		return this._body;
	}
	get actionBody() {
		return this._actionBody;
	}
	get preAction() {
		return this._preAction;
	}
	get postAction() {
		if (this._postAction == undefined)
			console.warn(`production(${this.id}) doesn't have post action, it is required for Parser`);
		return this._postAction!; //TODO
	}
	get action() {
		return this.postAction;
	}
	get prec() { return this._prec; }
	set prec(val) {
		this._prec = val;
	}
	get leftAssoc() {
		return this._leftAssoc;
	}
	set leftAssoc(val) {
		this._leftAssoc = val;
	}
	isEpsilon() {
		return this._body.length == 1 && this._body[0] === NIL;
	}
	toString() {
		return (this._preAction == undefined ? "" : "<%" + this.preAction + "%>") +
			`(${this._id}) ${this._nt}->${this._actionBody.map(o => o.toString()).join("")}`
			+ (this._postAction == undefined ? "" : "<%" + this.postAction + "%>");
	}
}

export type PreAction = (stack: Stack<ASTElement>) => void
export type PostAction = (eles: Array<ASTElement>, stack: Stack<ASTElement>) => ASTree

/**
 * 文法对象的api定义
 */
export interface IGrammar {
	/**
	 * 获得文法的所有非终结符
	 */
	nonTerminals(): NonTerminal[];
	/**
	 * 获得所有产生式
	 */
	productions(): Production[];
	/**
	 * 获得文法的开始符号
	 */
	startNT(): NonTerminal;
}

/**
 * 符号优先级、结合性
 */
export class SymbolTrait {
	private _prec: number;
	private _leftAssoc: boolean
	constructor(prec: number, leftAssoc: boolean) {
		this._prec = prec;
		this._leftAssoc = leftAssoc;
	}
	get prec() {
		return this._prec;
	}
	get leftAssoc() {
		return this._leftAssoc;
	}
	compareTo(other: SymbolTrait): boolean {
		//TODO
		return false;
	}
}
export type SymbolTraits = Map<SSymbol, SymbolTrait>

export class Grammar implements IGrammar {
	protected nts: NonTerminal[]
	protected prods: Production[]
	protected traits: SymbolTraits
	protected startSym: NonTerminal
	constructor(nts: NonTerminal[], prods: Production[], startSymbol: NonTerminal, traits: SymbolTraits = new Map<SSymbol, SymbolTrait>()) {

		this.nts = nts;
		this.prods = prods;
		this.startSym = startSymbol;
		this.traits = traits;
		//处理产生式的优先级与结合性
		for (let p of prods) {
			if(traits.has(p.head)){
				let trait = traits.get(p.head)!;
				p.prec = trait.prec;
				p.leftAssoc = trait.leftAssoc;
			}
			let prec =p.prec;
			let leftAssoc = p.leftAssoc;
			for (let s of p.body) {
				if (traits.has(s)) {
					let trait = traits.get(s)!;
					if (trait.prec > prec) {
						prec = trait.prec;
						leftAssoc = trait.leftAssoc;
					}
				}
			}
			p.prec = prec;
			p.leftAssoc = leftAssoc;
		}
		this.validate();
	}
	protected validate() {
	}
	nonTerminals(): NonTerminal[] {
		return this.nts;
	}
	productions(): Production[] {
		return this.prods;
	}
	startNT(): NonTerminal {
		return this.startSym;
	}
	toString() {
		return this.prods.join("\n");
	}
}

/*************************************** LR相关 ****************************************/

export class AugmentedGrammar extends Grammar {
	protected validate() {
		assert(this.startSym.prods.length == 1, `The start symbol of an augmented grammar has one and only one production! but ${this.startSym} has ${this.startSym.prods.length}:\n${this.startSym.prods.join("\n")}`);
	}
}

/* 表示LR语法分析表格的操作 */
export abstract class Operation {
	abstract equals(obj: Object): boolean

	isReduce(): this is Reduce {
		return false;
	}
	isShift(): this is Shift {
		return false;
	}

	isGoto(): this is Goto {
		return false;
	}

	isAccept(): this is Accept {
		return false;
	}
}

export class Shift extends Operation {
	private _nextStateId: number;
	constructor(nextStateId: number) {
		super();
		this._nextStateId = nextStateId;
	}

	get nextStateId() {
		return this._nextStateId;
	}

	toString() {
		return `shift ${this._nextStateId}`;
	}
	equals(obj: Object) {
		return obj instanceof Shift && obj._nextStateId == this._nextStateId;
	}
	isShift() {
		return true;
	}
}

export class Goto extends Operation {
	private _nextStateId: number;
	constructor(nextStateId: number) {
		super();
		this._nextStateId = nextStateId;
	}
	get nextStateId() {
		return this._nextStateId;
	}
	toString() {
		return `goto ${this._nextStateId}`;
	}
	equals(obj: Object) {
		return obj instanceof Goto && obj._nextStateId == this._nextStateId;
	}
	isGoto() {
		return true;
	}
}

export class Reduce extends Operation {
	/* 用于归约的产生式 */
	private _prod: Production;

	constructor(prod: Production) {
		super();
		this._prod = prod;
	}
	get prod() {
		return this._prod;
	}
	toString() {
		return `reduce ${this._prod.id}`;
	}
	equals(obj: Object) {
		return obj instanceof Reduce && obj._prod == this._prod;
	}
	isReduce() {
		return true;
	}
}

export class Accept extends Operation {
	constructor() {
		super();
	}
	equals(obj: Object) {
		return obj instanceof Accept;
	}
	toString() {
		return `accept`;
	}
	isAccept() {
		return true;
	}
}

/* TODO 考虑是否应该包装 Map */
// export type LRParsingTable = Map<number, Map<SSymbol, Operation>>;

export class ParsingTable {
	private parsingTable = new Map<number, Map<SSymbol, Operation>>()

	get table() {
		return this.parsingTable;
	}

	put(state: number, symbol: SSymbol, op: Operation): void {
		let row = this.parsingTable.get(state);
		if (row == undefined) {
			row = new Map<SSymbol, Operation>();
			this.parsingTable.set(state, row);
		}
		row.set(symbol, op);
	}
	has(state: number, symbol: SSymbol, op: Operation): boolean {
		let row = this.parsingTable.get(state);
		if (row == undefined)
			return false;
		let exstingOp = row.get(symbol);
		if (exstingOp == null)
			return false;
		return exstingOp.equals(op);
	}
	get(state: number, symbol: SSymbol): Operation | undefined {
		let row = this.parsingTable.get(state);
		if (row == undefined)
			return undefined;
		return row.get(symbol);
	}

	getExpectedSymbols(state: number): SSymbol[] {
		let row = this.parsingTable.get(state);
		if (row == undefined)
			return [];
		return Array.from(row.keys());
	}

	getExpectedTokens(state: number) {
		let expS = this.getExpectedSymbols(state);
		return expS.filter(s => !(s instanceof NonTerminal));
	}
}

/**
 * 构成ASTree节点的元素
 */
export type ASTElement = IToken | ASTree

export interface ASTree {
}
