import { assert, Stack } from "@light0x00/shim";

interface TableKey {
	key(): Object
}

export interface IToken extends TableKey {
}

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
type PreAction = ((stack: Stack<ASTElement>) => void)
type MidAction = ((stack: Stack<ASTElement>) => void)
type PostAction = (eles: ASTElement[], stack: Stack<ASTElement>) => ASTree

export abstract class ISymbol {

	isPrototypeSymbol(): this is ProtoSymbol {
		return false;
	}
	abstract get value(): Object;
	abstract get action(): undefined | MidAction
}
/* 值类型符号 */
export class ValueSymbol extends ISymbol {

	private t: IToken
	private _action: undefined | ((stack: Stack<ASTElement>) => void)
	constructor(t: IToken) {
		super();
		this.t = t;
	}
	get value(): Object {
		return this.t.key();
	}
	get action() {
		return this._action;
	}
	toString() {
		return this.t.key();
	}
}

/* 原型类型符号 */
export class ProtoSymbol extends ISymbol {

	private _proto: ISymbolPrototype
	private _action: undefined | MidAction
	constructor(proto: ISymbolPrototype, action?: MidAction) {
		super();
		this._proto = proto;
		this._action = action;
	}
	get value(): ISymbolPrototype {
		return this._proto;
	}
	get prototype() {
		return this._proto;
	}
	get proto() {
		return this._proto;
	}
	get action() {
		return this._action;
	}
	isPrototypeSymbol() {
		return true;
	}
	toString() {
		return this._proto;
	}
}
/* 原型 */
export abstract class ISymbolPrototype {
	isNTPrototype(): this is NonTerminalPro {
		return false;
	}
}
/* 非终结符原型 */
export class NonTerminalPro extends ISymbolPrototype {
	private _name: string
	private _prods: Production[] | undefined
	private _isStart: boolean
	constructor(name: string, isStart: boolean = false, prods?: Production[]) {
		super();
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
	isNTPrototype(): this is NonTerminalPro {
		return true;
	}
	toString() {
		return this._name;
	}

}
/* 终结符原型*/
export class TerminalPro extends ISymbolPrototype {
	private name: string  //just for debug
	constructor(name: string) {
		super();
		this.name = name;
	}
	toString() {
		return this.name;
	}
}

export class Production {
	private _id: number
	private _nt: NonTerminalPro
	private _body: ISymbol[]
	private _preAction: PreAction | undefined
	private _postAction: PostAction | undefined
	constructor(id: number, nt: NonTerminalPro, body: ISymbol[], pre?: PreAction, post?: PostAction) {
		this._id = id;
		this._nt = nt;
		this._body = body;
		this._preAction = pre;
		this._postAction = post;
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
	get preAction() {
		return this._preAction;
	}
	get postAction() {
		return this._postAction;
	}
	toString() {
		return `(${this._id}) ${this._nt}->${this._body.map(o => o.toString()).join("")}`;
	}
}

export const NIL = Symbol("NIL");
export const EOF = Symbol("EOF");

export interface ILexer<T extends IToken> {
	peek(): T
	nextToken(): T
}

export { AbstractRegexpLexer } from "./lexer";

export type ASTElement = IToken | ASTree

export interface ASTree {

}

