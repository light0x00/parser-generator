import { assert, Stack } from "@light0x00/shim";
import { IToken } from "@/definition/lexical";
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
export class NonTerminal {
	private _name: string
	private _prods: Production[] | undefined
	private _isStart: boolean
	constructor(name: string, isStart: boolean = false, prods?: Production[]) {
		this._name = name;
		this._isStart = isStart;
		this._prods = prods;
	}
	get name() {
		return this._name;
	}
	get prods() {
		assert(this._prods != undefined);
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

}
/**
 * token原型
 */
export class TokenPro implements IToken{

	private name: string  //just for debug
	constructor(name: string) {
		this.name = name;
	}
	toString() {
		return this.name;
	}
	key(): Terminal {
		throw new Error("Method not implemented.");
	}
}
export const NIL = new TokenPro("NIL");
export const EOF = new TokenPro("EOF");

export type SSymbol = string | NonTerminal | TokenPro;
export type Terminal = TokenPro | string;

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

	constructor(id: number, nt: NonTerminal, body: SymbolWrapper[], pre?: PreAction, post?: PostAction) {
		this._id = id;
		this._nt = nt;
		this._actionBody = body;
		this._preAction = pre;
		this._postAction = post;
		this._body = new Array<SSymbol>();
		for (let asym of body) {
			this._body.push(asym.value);
		}
	}
	get id() {
		return this._id;
	}
	get nt() {
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
		assert(this._postAction != undefined, "post action is required for Parser");
		return this._postAction;
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
	constructor(nts: NonTerminal[], prods: Production[], startSymbol: NonTerminal, traits?: SymbolTraits) {
		this.nts = nts;
		this.prods = prods;
		this.startSym = startSymbol;
		if (traits != undefined)
			this.traits = traits;
		else
			this.traits = new Map<SSymbol, SymbolTrait>();
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


/**
 * 构成ASTree节点的元素
 */
export type ASTElement = IToken | ASTree

export interface ASTree {
}

// export interface ILLASTree {
// 	appendElement(ele: ASTElement): void;
// }

// /**
//  * 文法符号抽象
//  */
// export abstract class ISymbol {
// 	protected _action: undefined | MidAction
// 	constructor(action: undefined | MidAction) {
// 		this._action = action;
// 	}
// 	isNonTerminal(): this is NonTerminalSymbol {
// 		return false;
// 	}
// 	isTerminal(): this is ValueSymbol | TerminalSymbol {
// 		return false;
// 	}
// 	isValueTerminal(): this is ValueSymbol {
// 		return false;
// 	}
// 	isProtoTerminal(): this is TerminalSymbol {
// 		return false;
// 	}
// 	abstract get value(): string | ISymbolPrototype;
// 	get action(): undefined | MidAction {
// 		return this._action;
// 	}
// }
// /**
//  * 文法中的值类型符号
//  */
// export class ValueSymbol extends ISymbol {
// 	private t: string

// 	constructor(t: string, action?: MidAction) {
// 		super(action);
// 		this.t = t;
// 	}
// 	get value(): string {
// 		return this.t;
// 	}
// 	toString() {
// 		return this.t;
// 	}
// 	isValueTerminal(): this is ValueSymbol {
// 		return true;
// 	}
// 	isTerminal() {
// 		return true;
// 	}
// }

// /**
//  * 文法中的原型类型符号
//  */
// export abstract class ProtoSymbol<T extends ISymbolPrototype> extends ISymbol {

// 	protected _proto: T
// 	constructor(proto: T, action?: MidAction) {
// 		super(action);
// 		this._proto = proto;
// 		this._action = action;
// 	}
// 	get value(): T {
// 		return this._proto;
// 	}
// 	get proto(): T {
// 		return this._proto;
// 	}
// 	toString() {
// 		return this._proto.toString();
// 	}
// 	isShit(): this is T {
// 		return false;
// 	}
// }

// export class TerminalSymbol extends ProtoSymbol<TokenPro>{
// 	isTerminal() {
// 		return true;
// 	}
// }
// export class NonTerminalSymbol extends ProtoSymbol<NonTerminalPro>{
// 	isNonTerminal() {
// 		return true;
// 	}
// }