import { NonTerminal, Production, TokenPro, AbstractRegexpLexer, NIL, IGrammar, AugmentedGrammar, SymbolWrapper, SSymbol, SymbolTrait, Grammar, EOF, ParsingTable, Shift, Accept, Goto, Reduce, SymbolTraits } from "@parser-generator/definition";
import { assert } from "@light0x00/shim";
import { cloneDeep, groupBy, Dictionary } from "lodash";
import { FirstTable, FollowTable } from "../first-follow";
import { LLParser } from "../ll/ll-parser";
import { LRParser } from "../lr/lr-parser";

/*************************************** Lexical Analysis  ****************************************/

export enum Tag {
	BLANK = "BLANK", CRLF = "CRLF", EOF = "EOF", NIL = "NIL",
	HEAD = "HEAD", SCRIPT = "SCRIPT", STRING = "STRING", NUMBER = "NUMBER", WORD = "WORD", SINGLE = "SINGLE",
	ID = "ID", KEYWORD = "KEYWORD", ASSOC = "ASSOC"
}

abstract class Token {
	protected _lineNo = -1;
	protected _colNo = -1;
	protected _tag: Tag;

	constructor(tag: Tag) {
		this._tag = tag;
	}
	setPos(lineNo: number, colNo: number) {
		this._lineNo = lineNo;
		this._colNo = colNo;
	}
	get lineNo() {
		return this._lineNo;
	}
	get colNo() {
		return this._colNo;
	}
	get tag(): Tag {
		return this._tag;
	}
	abstract get value(): Object;

	toString() {
		return this.value + `(${this._lineNo},${this._colNo})`;
	}
}

class Special extends Token {
	constructor(tag: Tag) {
		super(tag);
	}
	get value(): Object {
		return this._tag;
	}
}

class Word extends Token {
	lexeme: string
	constructor(tag: Tag, lexeme: string) {
		super(tag);
		this.lexeme = lexeme;
	}
	get value(): string {
		return this.lexeme;
	}
}

class Number extends Token {
	lexeme: number
	constructor(lexeme: number) {
		super(Tag.NUMBER);
		this.lexeme = lexeme;
	}

	get value(): number {
		return this.lexeme;
	}
}

export class GrammarLexer extends AbstractRegexpLexer<Token, Tag>{

	private lineNo = 1;
	private colNo = 0;
	private reserves = new Map<string, Token>()
	private eofToken: Special | undefined

	constructor(text: string) {
		super(text, [
			{ regexp: /\n+/y, type: Tag.CRLF, },
			{ regexp: /\s+/y, type: Tag.BLANK, },
			{ regexp: /#(?<value>\w+)/y, type: Tag.HEAD },
			{ regexp: /[A-Z_a-z]\w*/y, type: Tag.WORD },
			{ regexp: /<%(?<value>(.|\s)+?)%>/y, type: Tag.SCRIPT },
			{ regexp: /("|')(?<value>(\\"|\\'|[^"'])*)?(\1)/y, type: Tag.STRING },
			{ regexp: /([1-9]\d*\.\d+)|(0\.\d+)/y, type: Tag.NUMBER },
			{ regexp: /(0(?![0-9]))|([1-9]\d*(?!\.))/y, type: Tag.NUMBER },
			{ regexp: /(.)/y, type: Tag.SINGLE }
		]);
		this.reserves.set("left", new Word(Tag.ASSOC, "left"));
		this.reserves.set("right", new Word(Tag.ASSOC, "right"));
		this.reserves.set("NIL", new Special(Tag.NIL));
	}
	protected getEOF(): Token {
		if (this.eofToken == undefined) {
			this.eofToken = new Special(Tag.EOF);
			this.eofToken.setPos(this.lineNo, this.colNo);
		}
		return this.eofToken;
	}
	protected createToken(lexeme: string, type: Tag, match: RegExpExecArray): Token | undefined {
		let token: Token | undefined;
		switch (type) {
			case Tag.CRLF:
				this.lineNo += lexeme.length;
				this.colNo = 0;
				break;
			case Tag.BLANK:
				break;
			case Tag.WORD: {
				let re = this.reserves.get(lexeme);
				if (re == undefined)
					token = new Word(Tag.ID, lexeme);
				else
					token = cloneDeep(re)!;
				break;
			}
			case Tag.HEAD:
				token = new Word(Tag.HEAD, match.groups!["value"]);
				break;
			case Tag.SCRIPT: {
				token = new Word(Tag.SCRIPT, match.groups!["value"]);
				token.setPos(this.lineNo, this.colNo);
				//处理行列计数
				let { rows, cols } = shit(lexeme);
				this.lineNo += rows;
				this.colNo = (rows > 0) ? cols : this.colNo += cols;
				break;
			}
			case Tag.NUMBER:
				token = new Number(parseFloat(lexeme));
				break;
			case Tag.STRING:
				token = new Word(Tag.STRING, match.groups!["value"]);
				break;
			case Tag.SINGLE:
				token = new Word(Tag.SINGLE, lexeme);
				break;
			default:
				throw new Error(`unknown type ${type}`);
		}
		if (type != Tag.SCRIPT) { //script 类型单独处理
			if (token != undefined)
				token.setPos(this.lineNo, this.colNo);
			this.colNo += lexeme.length;
		}
		return token;
	}

	protected onMatchFaild(text: string, lastIndex: number): void {
		throw new Error(`unrecognized charactor(${this.lineNo},${this.colNo}):${text[lastIndex]} `);
	}
}

//返回指定字符串的换行符数量,最后一行的列数
function shit(str: string) {
	let rows = 0;
	let cols = 0;
	let isLastRow = true;
	for (let i = str.length - 1; i >= 0; i--) {
		if (str[i] == "\n") {
			rows++;
			isLastRow = false;
		}
		else if (isLastRow)
			cols++;
	}
	return { rows, cols };
}

/*************************************** AST ****************************************/

export abstract class ASTree {
	abstract accpet(visitor: IVisitor): void;
}

export class ProgramNode extends ASTree {
	grammarNode: GrammarNode;
	private blocks: ASTree[]
	traits: SymbolTraits;

	constructor(gNode: GrammarNode, paNode: PrecAssocNode | undefined, blocks: ASTree[]) {
		super();
		this.grammarNode = gNode;
		this.blocks = blocks;

		if (paNode == undefined)
			this.traits = new Map<SSymbol, SymbolTrait>();
		else
			this.traits = paNode.traits;
	}
	accpet(visitor: IVisitor): void {
		for (let c of this.blocks) {
			c.accpet(visitor);
		}
		visitor.visitProgramNode(this);
	}
}

class ScriptNode extends ASTree {
	script: string;
	constructor(t: Token) {
		super();
		this.script = t.value as string;
	}
	accpet(visitor: IVisitor): void {
		visitor.visitScriptNode(this);
	}
}

class PrecAssocNode extends ASTree {
	children: PrecassocItemNode[]
	traits: SymbolTraits = new Map<SSymbol, SymbolTrait>();
	constructor(children: PrecassocItemNode[]) {
		super();
		this.children = children;
		for (let c of this.children) {
			this.traits.set(c.symbol.value as string, new SymbolTrait(c.prec, c.leftAssoc));
		}
	}

	accpet(visitor: IVisitor): void {
		visitor.visitPrecAssocNode(this);
	}
}

class PrecassocItemNode extends ASTree {

	symbol: Token
	leftAssoc: boolean;
	prec: number
	constructor(tokens: Token[]) {
		super();
		this.symbol = tokens[0];
		this.leftAssoc = tokens[1].value == "left";
		this.prec = tokens[2].value as number;
	}
	accpet(visitor: IVisitor): void {
		throw new Error("Method not implemented.");
	}
}

class Env {
	private syms = new Map<string, TokenPro | NonTerminal>()
	//反向索引
	private rsyms = new Map<TokenPro | NonTerminal, string>(); //记录变量对应的对象 的变量名
	private prods = new Map<string, Production>();	//记录Production对象对应的变量名
	private rprods = new Map<Production, string>();	//记录Production对象对应的变量名
	constructor() {
		this.registerSym("NIL", NIL);
		this.registerSym("EOF", EOF);
	}
	//Symbol
	registerSym(varName: string, sym: TokenPro | NonTerminal) {
		this.syms.set(varName, sym);
		this.rsyms.set(sym, varName);
	}
	getSym(varName: string): TokenPro | NonTerminal {
		return this.syms.get(varName)!;
	}
	hasSym(varName: string): boolean {
		return this.syms.has(varName);
	}
	getSymVarName(sym: TokenPro | NonTerminal): string | undefined {
		return this.rsyms.get(sym);
	}
	//Production
	registerProd(prod: Production, varName: string) {
		this.rprods.set(prod, varName!);
		this.prods.set(varName, prod);
	}
	getProdVarName(prod: Production): string {
		assert(this.rprods.has(prod), `Undeclared production ${prod}`);
		return this.rprods.get(prod)!;
	}
	getProd(varName: string): Production {
		assert(this.prods.has(varName), `Undeclared productio ${varName}`);
		return this.prods.get(varName)!;
	}

}

class GrammarNode extends ASTree {
	private _env = new Env();
	get env() {
		return this._env;
	}
	//子节点
	private prodNodes: ProductionNode[] //产生式
	private ntNodes: NonTerminalNode[] //非终结符原型
	private tpNodes: TokenProNode[]	//终结符原型
	//属性
	nts: NonTerminal[] = []
	startSym!: NonTerminal;
	prodNodeGroups: Dictionary<ProductionNode[]>

	constructor(tNodes: TokenProNode[], ntNodes: NonTerminalNode[], prodNodes: ProductionNode[]) {
		super();
		this.tpNodes = tNodes;
		this.prodNodes = prodNodes;
		this.ntNodes = ntNodes;
		/* 初始化文法变量 */
		//terminal proto
		for (let { token: t } of tNodes) {
			let v = t.value as string;
			if (this.env.hasSym(v))
				throw new Error(`Duplicate declared variable ${v} at (${t.lineNo},${t.colNo})`);
			this.env.registerSym(v, new TokenPro(v));

		}
		//non-terminal
		for (let i = 0; i < ntNodes.length; i++) {
			let nt = ntNodes[i].token;
			let varName = ntNodes[i].varName;
			if (this.env.hasSym(varName))
				throw new Error(`Duplicate declared variable ${varName} at (${nt.lineNo},${nt.colNo})`);
			let ntProto;
			if (i == 0)
				this.startSym = ntProto = new NonTerminal(varName, true);
			else
				ntProto = new NonTerminal(varName);
			this.env.registerSym(varName, ntProto);
			this.nts.push(ntProto);
		}
		//产生式按所属非终结符分组
		this.prodNodeGroups = groupBy(this.prodNodes, (p) => p.ntVarName);
		//为产生式分配id和变量名
		let prodIdCount = 0;
		for (let key in this.prodNodeGroups) {
			let group = this.prodNodeGroups[key];
			for (let pNode of group) {
				pNode.pid = prodIdCount++;
				pNode.varName = "p" + pNode.pid;
				pNode.env = this.env;
			}
		}
	}

	accpet(visitor: IVisitor): void {
		for (let tpNode of this.tpNodes) {
			visitor.visitTokenProNode(tpNode);
		}
		for (let ntNode of this.ntNodes) {
			visitor.visitNonterminalNode(ntNode);
		}
		for (let pNode of this.prodNodes) {
			visitor.visitProductionNode(pNode);
		}
		visitor.visitGrammarNode(this);
	}

}

class TokenProNode extends ASTree {

	token: Token
	varName: string;
	constructor(token: Token) {
		super();
		this.token = token;
		this.varName = token.value as string;
	}
	accpet(visitor: IVisitor): void {
		visitor.visitTokenProNode(this);
	}

}

type RawSymbol = { symToken: Token; action: Token | undefined; }

class ProductionNode extends ASTree {

	preAction: Token | undefined
	postAction: Token | undefined
	left: Token
	rawBody: RawSymbol[]

	//由父节点(GrammarNode)指派
	varName!: string;
	ntVarName: string
	pid: number | undefined
	env!: Env
	constructor(nt: Token, body: Token[]) {
		super();
		this.left = nt;
		this.ntVarName = nt.value as string;
		//pre
		if (body[0].tag == Tag.SCRIPT)
			this.preAction = body[0];
		//post
		if (body[body.length - 1].tag == Tag.SCRIPT)
			this.postAction = body[body.length - 1];
		//body
		this.rawBody = new Array<RawSymbol>();
		let start = this.preAction == undefined ? 0 : 1;
		let end = this.postAction == undefined ? body.length - 1 : body.length - 2;
		for (let i = start; i <= end; i++) {
			let symbol = body[i];
			let action;
			if (i + 1 <= end && body[i + 1].tag == Tag.SCRIPT) {
				action = body[i + 1];
				i++;
			}
			this.rawBody.push({ symToken: symbol, action: action });
		}
	}
	accpet(visitor: IVisitor): void {
		visitor.visitProductionNode(this);
	}
}

class NonTerminalNode extends ASTree {
	_varName: string
	token: Token;
	prods: ProductionNode[]
	constructor(token: Token, prods: ProductionNode[]) {
		super();
		this._varName = token.value as string;
		this.token = token;
		this.prods = prods;
		//前置、后置动作的共享
		/*
		1. 如果一个产生式没有前置动作,而其兄弟有,则兄弟与其共享
		2. 后置动作遵循前置动作的逻辑
		3. 后置动作是必须的,一个非终结符的产生式至少应有一个产生式有后置动作
		*/
		let defaultPreAction: Token | undefined;
		let defaultPostAction: Token | undefined;
		for (let p of prods) {
			if (defaultPreAction == undefined && p.preAction != undefined)
				defaultPreAction = p.preAction;
			if (defaultPostAction == undefined && p.postAction != undefined)
				defaultPostAction = p.postAction;
			if (defaultPreAction != undefined && defaultPostAction != undefined)
				break;
		}
		if (defaultPostAction == undefined)
			console.error(`nonterminal ${this.varName} don't have post-action,it's required for parser!`);
		// assert(defaultPostAction != undefined, `productions of nonterminal ${this.name} should have at least one post action`);
		for (let p of prods) {
			if (p.preAction == undefined)
				p.preAction = defaultPreAction;
			if (p.postAction == undefined)
				p.postAction = defaultPostAction;
		}
	}
	get varName() {
		return this._varName;
	}
	accpet(visitor: IVisitor): void {
		visitor.visitNonterminalNode(this);
	}
}

function pos(t: Token) {
	return `(${t.lineNo},${t.colNo})`;
}

/*************************************** Syntax Analysis ****************************************/
const TOKEN_KEY = "TOKEN_PROTOTYPES";
const GRAMMAR_KEY = "GRAMMAR";
const SPA_KEY = "SYMBOL_ASSOC_PREC";

export function parse(lexer: GrammarLexer): ProgramNode {
	/****************************************
	文法草案

	{} 重复0次多多次
	[] 0次或一次

	program -> SCRIPT | HEAD { SCRIPT | HEAD }
	token -> ID {,ID}
	precassoc ->  precassoc_item { precassoc_item }
	precassoc_item -> symbol ('left' | 'right') NUMBER
	grammar -> nt { nt }
	nt -> ID '-' '>' prod { | prod } ';'
	prod -> [ SCRIPT ] symbol SCRIPT { symbol SCRIPT }
	symbol -> ID | token | string
	****************************************/
	return program();

	function misMatch(expection: string, actuality: string) {
		throw new Error(`Expected token is ${expection}, but actually ${actuality}`);
	}

	function program() {
		/*
		Block:
			- GRAMMAR (Required)
			- TOKEN_PROTO
			- SCRIPT
			- PREC_ASSOC
		*/
		//如果生成代码时需要保证每个块的顺序 则用链表存储顺序
		let blocks = new Array<ASTree>();

		let grammarNode: GrammarNode | undefined;
		let precAssocNode: PrecAssocNode | undefined;
		let terminalProtoNodes: TokenProNode[] | undefined;

		blocks.push(...scriptBlock());
		//token 声明
		if (lexer.peek().value == TOKEN_KEY) {
			lexer.next();
			terminalProtoNodes = tokenDeclarationsBlock();
		} else {
			terminalProtoNodes = [];
		}
		blocks.push(...scriptBlock());
		//文法
		if (lexer.peek().value == GRAMMAR_KEY) {
			lexer.next();
			grammarNode = grammarBlock(terminalProtoNodes);
			blocks.push(grammarNode);
		} else {
			misMatch(GRAMMAR_KEY, lexer.peek().value as string);
		}
		blocks.push(...scriptBlock());
		//优先级 结合性
		if (lexer.peek().value == SPA_KEY) {
			lexer.next();
			precAssocNode = precAssocBlock();
			if (precAssocNode != undefined)
				blocks.push(precAssocNode);
		} else {
			precAssocNode = new PrecAssocNode([]);
		}
		blocks.push(...scriptBlock());
		if (lexer.peek().tag != Tag.EOF) {
			throw new Error(`Unexpected block "${lexer.peek().value}" at ` + pos(lexer.peek()));
		}
		return new ProgramNode(grammarNode!, precAssocNode, blocks);
	}

	function scriptBlock(): ScriptNode[] {
		let scriptNodes = [];
		while (lexer.peek().tag == Tag.SCRIPT)
			scriptNodes.push(new ScriptNode(lexer.next()));
		return scriptNodes;
	}

	function tokenDeclarationsBlock(): TokenProNode[] {

		let protos: TokenProNode[] = [];
		while (1) {
			if (lexer.peek().tag != Tag.ID)
				break;
			protos.push(new TokenProNode(lexer.next()));
			if (lexer.peek().value != ",")
				break;
			lexer.next();
		}
		return protos;
	}

	function precAssocBlock(): PrecAssocNode | undefined {
		let items = new Array<PrecassocItemNode>();
		while (isSymbol(lexer.peek())) {
			let sym = lexer.next();
			if (lexer.peek().tag != Tag.ASSOC)
				throw new Error(`expect left or right at (${pos(lexer.peek())})`);
			let assoc = lexer.next();
			if (lexer.peek().tag != Tag.NUMBER)
				throw new Error(`expect a number at (${pos(lexer.peek())})`);
			let prec = lexer.next();
			items.push(new PrecassocItemNode([sym, assoc, prec]));
		}
		if (items.length > 0)
			return new PrecAssocNode(items);
	}

	function isSymbol(token: Token) {
		return token.tag == Tag.STRING || token.tag == Tag.ID;
	}

	function grammarBlock(terminalProtoNodes: TokenProNode[]): GrammarNode {
		let rawGrammar = new Array<{ key: Token, prods: Token[][] }>();
		let ntDecls = new Array<Token>(); //文法中声明的所有非终结符(左侧)
		let nt;
		while ((nt = nonTerminal()) != undefined) {
			rawGrammar.push(nt);
			ntDecls.push(nt.key);
		}
		assert(rawGrammar.length > 0, "The grammar should have at least one non-terminal ");
		let ntNodes = new Array<NonTerminalNode>();
		let prodNodes = new Array<ProductionNode>();
		//每一个非终结符
		for (let { key, prods } of rawGrammar) {
			let ntPNodes = new Array<ProductionNode>();
			//非终结符的每一个产生式
			for (let p of prods) {
				ntPNodes.push(new ProductionNode(key, p));
			}
			ntNodes.push(new NonTerminalNode(key, ntPNodes));
			prodNodes.push(...ntPNodes);
		}
		return new GrammarNode(terminalProtoNodes, ntNodes, prodNodes);
	}

	function matchNext(tag: Tag, val?: Object) {
		let look = lexer.next();
		let tagMis = look.tag != tag;
		let valMis = val != undefined && look.value != val;
		if (tagMis) {
			let msg = valMis ? `expect ${tag} ${val} at ${pos(look)}` : `expect ${tag} at ${pos(look)}`;
			throw new Error(msg);
		}
	}

	function nonTerminal(): { key: Token, prods: Token[][] } | undefined {
		if (lexer.peek().tag != Tag.ID)
			return undefined;
		//左侧
		let nt = lexer.next();
		//箭头
		matchNext(Tag.SINGLE, "-");
		matchNext(Tag.SINGLE, ">");
		//右侧
		let prods: Token[][] = [];
		while (1) {
			let curProd = production();
			//下一个是产生式
			if (lexer.peek().value == "|") {
				prods.push(curProd);
				curProd = [];
				lexer.next();
			}
			//已经到达当前非终结符末尾
			else if (lexer.peek().value == ";") {
				prods.push(curProd);
				lexer.next();
				break;
			} else {
				throw new Error(`Unexpected symbol "${lexer.peek().value}" at ` + pos(lexer.peek()));
			}
		}
		return { key: nt, prods };
	}

	function production(): Token[] {
		let body = new Array<Token>();

		let isScript = false;
		let isNil = false; //是否是空产生式体
		while (1) {
			if (lexer.peek().tag == Tag.ID || lexer.peek().tag == Tag.STRING) {
				if (isNil) {
					throw new Error("The NIL production can't have any symbol,expected \";\" at" + pos(lexer.peek()));
				}
				isScript = false;
				body.push(lexer.next());
			} else if (lexer.peek().tag == Tag.NIL) {
				isScript = false;
				isNil = true;
				body.push(lexer.next());
			} else if (lexer.peek().tag == Tag.SCRIPT) {
				if (isScript)
					throw new Error("The production body cannot have multiple continuous script," + pos(lexer.peek()));
				body.push(lexer.next());
				isScript = true;
			}
			else {
				break;
			}
		}
		return body;
	}
}

export function parseGrammar(grammar: string) {
	return parse(new GrammarLexer(grammar));
}
/*************************************** Semantic Analysis ****************************************/

export interface IVisitor {
	visitProgramNode(node: ProgramNode): void;
	visitScriptNode(node: ScriptNode): void;
	visitGrammarNode(node: GrammarNode): void;
	visitTokenProNode(node: TokenProNode): void;
	visitNonterminalNode(node: NonTerminalNode): void;
	visitProductionNode(node: ProductionNode): void;
	visitPrecAssocNode(node: PrecAssocNode): void;
}

export type EvalContext = {
	parser: "LL" | "SLR" | "LR1" | "LALR"
}

export class EvalVisitor implements IVisitor {

	private traits: SymbolTraits | undefined;
	private nts: NonTerminal[] = [];
	private startSym!: NonTerminal;
	private prods: Production[] = []

	private context: EvalContext;
	constructor(context: EvalContext) {
		this.context = context;
	}

	private _grammar: IGrammar | undefined
	get grammar() {
		if (this._grammar == undefined) {
			let { parser } = this.context;
			if (parser == "LL")
				this._grammar = new Grammar(this.nts, this.prods, this.startSym, this.traits); //根据配置决定初始化
			else
				this._grammar = new AugmentedGrammar(this.nts, this.prods, this.startSym, this.traits); //根据配置决定初始化
		}
		return this._grammar;
	}

	visitProgramNode(node: ProgramNode): void {
		//
	}
	visitScriptNode(node: ScriptNode): void {
		//
	}
	visitGrammarNode(node: GrammarNode): void {
		this.startSym = node.startSym;
		this.nts = node.nts;
	}
	visitTokenProNode(node: TokenProNode): void {
		//
	}
	visitNonterminalNode(node: NonTerminalNode): void {
		//
	}
	visitProductionNode(node: ProductionNode): void {
		let nt = node.env.getSym(node.ntVarName) as NonTerminal;
		let body = new Array<SymbolWrapper>();
		for (let { symToken } of node.rawBody) {
			if (symToken.tag == Tag.STRING) {
				body.push(new SymbolWrapper(symToken.value as string));
			} else if (symToken.tag == Tag.ID || symToken.tag == Tag.NIL) {
				let proto = node.env.getSym(symToken.value as string);
				assert(proto != undefined, `Undeclared identifier ${symToken.value} at ` + pos(symToken));
				body.push(new SymbolWrapper(proto));
			} else {
				throw new Error(`Unknow token ${symToken}!`);
			}
		}
		let preAction = node.preAction == undefined ? undefined : eval(node.preAction.value as string);
		let postAction = node.postAction == undefined ? undefined : eval(node.postAction.value as string);
		assert(node.pid != undefined);
		let prod = new Production(node.pid, nt, body, preAction, postAction);
		node.env.registerProd(prod, node.varName!); //对象到变量名的反向索引(用于代码生成)
		nt.prods.push(prod); //追加到所属的非终结符
		this.prods.push(prod);
	}
	visitPrecAssocNode(node: PrecAssocNode): void {
		this.traits = node.traits;
	}
}

export type CodegenContext = {
	firstTable?: FirstTable;
	followTable?: FollowTable;
	lrParsingTable?: ParsingTable;
	parser: "LL" | "SLR" | "LR1" | "LALR"
}

const DEFINITION_PACKAGE = "@parser-generator/definition";
const LL_PARSER_PACKAGE = "@parser-generator/core";
const LR_PARSER_PACKAGE = "@parser-generator/core";
const LR_PARSING_TABLE_VAR = "table";
const FIRST_SET_VAR = "first";
const FOLLOW_SET_VAR = "follow";
const SYMBOL_TRAITS_VAR = "traits";

export class TSCodegenVisitor implements IVisitor {

	private _code: string = "";
	private context: CodegenContext
	constructor(context: CodegenContext) {
		this.context = context;
		this.emit(`import { ${NonTerminal.name}, ${TokenPro.name}, ${Production.name}, ${SymbolWrapper.name}, ${SymbolTrait.name}, NIL, Terminal, EOF`);
		if (context.parser == "LL") {
			this.emit("}");
		} else {
			this.emit(`,${ParsingTable.name}, ${Goto.name}, ${Shift.name}, ${Accept.name}, ${Reduce.name} }`);
		}
		this.emitln(` from "${DEFINITION_PACKAGE}";`);
	}

	private emit(code: string) {
		this._code += code;
	}
	private emitln(code: string) {
		this.emit(code + "\n");
	}
	get code() {
		return this._code;
	}
	visitProgramNode(node: ProgramNode): void {
		let env = node.grammarNode.env;

		let { firstTable, followTable } = this.context;
		//parser
		if (this.context.parser == "LL") {
			assert(firstTable != undefined && followTable != undefined);
			this.emitln(`import {${LLParser.name}} from "${LL_PARSER_PACKAGE}";`);
			this.emitln(`export let parser = new ${LLParser.name}(${env.getSymVarName(node.grammarNode.startSym)},${FIRST_SET_VAR},${FOLLOW_SET_VAR});`);
		} else {
			this.emitln(`import {${LRParser.name}} from "${LR_PARSER_PACKAGE}";`);
			this.emitln(`export let parser = new ${LRParser.name}(${LR_PARSING_TABLE_VAR});`);
		}
	}
	visitScriptNode(node: ScriptNode): void {
		this.emit(node.script + "\n");
	}
	visitGrammarNode(node: GrammarNode): void {
		for (let key in node.prodNodeGroups) {
			let group = node.prodNodeGroups[key];
			let pnames = new Array<string>();
			for (let pNode of group) {
				pnames.push(pNode.varName!);
			}
			this.emitln(`${key}.prods=[${pnames.join(",")}];`);
		}
		let env = node.env;
		if (this.context.parser == "LL") {
			//first table
			let { firstTable, followTable } = this.context;
			assert(firstTable != undefined && followTable != undefined,"First-table and follow-table is required for lr-parser code generator");
			this.emitln("/* first set */");
			this.emitln(`let ${FIRST_SET_VAR} = new Map<${NonTerminal.name},Map<Terminal,${Production.name}>>();`);
			for (let [nt, fset] of firstTable) {
				let stmt = `${FIRST_SET_VAR}.set(${env.getSymVarName(nt)},`;
				stmt += `new Map<Terminal,${Production.name}>([`;
				for (let [sym, prod] of fset) {
					let k = typeof sym === "string" ? `"${sym}"` : env.getSymVarName(sym);
					let v = env.getProdVarName(prod);
					stmt += `[${k},${v}],`;
				}
				stmt = stmt.replace(/,$/, "");
				stmt += "])";
				stmt += ");";
				this.emitln(stmt);
			}
			//follow table
			this.emitln("/* follow set */");
			this.emitln(`let ${FOLLOW_SET_VAR} = new Map<${NonTerminal.name},Set<Terminal>>();`);
			for (let [nt, fset] of followTable) {
				let stmt = `${FOLLOW_SET_VAR}.set(${env.getSymVarName(nt)},`;
				stmt += "new Set<Terminal>([";
				for (let a of fset) {
					if (typeof a === "string")
						stmt += `"${a}",`;
					else
						stmt += env.getSymVarName(a) + ",";
				}
				stmt = stmt.replace(/,$/, "");
				stmt += "])";
				stmt += ");";
				this.emitln(stmt);
			}
		} else {
			//lr table
			let { lrParsingTable } = this.context;
			assert(lrParsingTable!=undefined,"LR parsing table is required for lr-parser code generator");
			this.emitln(`let ${LR_PARSING_TABLE_VAR} = new ${ParsingTable.name}();`);
			for (let [stateId, ops] of lrParsingTable.table) {
				for (let [sym, op] of ops) {
					if (typeof sym === "string") {
						this.emit(`${LR_PARSING_TABLE_VAR}.put(${stateId},"${sym}",`);
					} else {
						this.emit(`${LR_PARSING_TABLE_VAR}.put(${stateId},${env.getSymVarName(sym)},`);
					}
					if (op.isShift()) {
						this.emit(`new ${Shift.name}(${op.nextStateId})`);
					} else if (op.isReduce()) {
						this.emit(`new ${Reduce.name}(${env.getProdVarName(op.prod)})`);
					} else if (op.isGoto()) {
						this.emit(`new ${Goto.name}(${op.nextStateId})`);
					}
					else if (op.isAccept()) {
						this.emit(`new ${Accept.name}()`);
					}
					this.emitln(");");
				}
			}
		}

	}
	visitTokenProNode(node: TokenProNode): void {
		this.emitln(`export let ${node.varName} = new ${TokenPro.name}("${node.varName}");`);
	}
	visitNonterminalNode(node: NonTerminalNode): void {
		this.emitln(`let ${node.varName} = new ${NonTerminal.name}("${node.varName}");`);
	}
	visitProductionNode(node: ProductionNode): void {
		this.emitln(`/* ${node.env.getProd(node.varName).toString()} */`);

		let code = `let ${node.varName} = new ${Production.name}(${node.pid},${node.ntVarName}`;
		code += ",[";
		for (let { symToken: symbol, action } of node.rawBody) {
			let symbolStr = symbol.tag == Tag.STRING ? `"${symbol.value}"` : symbol.value;
			let actionStr = (action == undefined ? "" : "," + action.value);
			code += `\nnew ${SymbolWrapper.name}(${symbolStr}${actionStr}),`;
		}
		code = code.replace(/,$/, "");
		code += "]";
		if (node.preAction != undefined)
			code += "," + node.preAction.value;
		else
			code += ",undefined";
		if (node.postAction != undefined)
			code += "," + node.postAction.value;
		else
			code += ",undefined";
		code += ");";
		this.emit(code);
		this.emit("\n");
	}
	visitPrecAssocNode(node: PrecAssocNode): void {
		this.emit(`let ${SYMBOL_TRAITS_VAR} = new Map<string, ${SymbolTrait.name}>();`);
		for (let item of node.children) {
			this.emit("\n");
			let symStr = item.symbol.tag == Tag.STRING ? `"${item.symbol.value}"` : item.symbol.value;//区别字符串字面量与变量名
			this.emit(`${SYMBOL_TRAITS_VAR}.set(${symStr},new ${SymbolTrait.name}(${item.prec},${item.leftAssoc ? "true" : "false"}));`);
		}
		this.emit("\n");
	}
}

