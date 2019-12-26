import { NonTerminal, Production, TokenPro, AbstractRegexpLexer, NIL } from "./definition";
import { assert } from "@light0x00/shim";
import { cloneDeep, groupBy, Dictionary } from "lodash";
import { SymbolWrapper, SSymbol, SymbolTraits, SymbolTrait, Grammar, EOF } from "./definition/syntax";
import { FirstTable, FollowTable } from "./first-follow";

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
	private paNode: PrecAssocNode | undefined
	private blocks: ASTree[]
	constructor(gNode: GrammarNode, paNode: PrecAssocNode | undefined, blocks: ASTree[]) {
		super();
		this.grammarNode = gNode;
		this.paNode = paNode;
		this.blocks = blocks;
	}
	accpet(visitor: IVisitor): void {
		for (let c of this.blocks) {
			c.accpet(visitor);
		}
		visitor.visitProgramNode(this);
	}
	eval(): Grammar {
		let traits;
		if (this.paNode != undefined) {
			traits = this.paNode.eval();
		}
		return this.grammarNode.eval(traits);
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
	constructor(children: PrecassocItemNode[]) {
		super();
		this.children = children;

	}
	eval(): SymbolTraits {
		let traits = new Map<SSymbol, SymbolTrait>();
		for (let c of this.children) {
			traits.set(c.symbol.value as string, new SymbolTrait(c.prec, c.leftAssoc));
		}
		return traits;
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
		//此处不实现 在父节点统一生成
		throw new Error("Method not implemented.");
	}
}

class Env {
	private syms = new Map<string, TokenPro | NonTerminal>()
	//反向索引
	private rsyms = new Map<TokenPro | NonTerminal, string>(); //记录变量对应的对象 的变量名
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
	}
	getProdVarName(prod: Production): string | undefined {
		assert(this.rprods.has(prod));
		return this.rprods.get(prod);
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
	private nts: NonTerminal[] = []
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
			}
		}
	}

	accpet(visitor: IVisitor): void {
		for (let tpNode of this.tpNodes) {
			visitor.visitTokenProNode(tpNode);
		}
		for (let ntpNode of this.ntNodes) {
			visitor.visitNonterminalNode(ntpNode);
		}
		for (let pNode of this.prodNodes) {
			visitor.visitProductionNode(pNode);
		}
		visitor.visitGrammarNode(this);
	}

	eval(symbolTraits: SymbolTraits | undefined): Grammar {
		let prods = new Array<Production>();
		for (let key in this.prodNodeGroups) {
			let group = this.prodNodeGroups[key];
			let ntProds = new Array<Production>();
			for (let pNode of group) {
				let prod = pNode.eval(this.env);
				prods.push(prod);
				this.env.registerProd(prod, pNode.varName!);
				ntProds.push(prod);
			}
			let nt = this.env.getSym(key) as NonTerminal;
			nt.prods = ntProds;
		}
		return new Grammar(this.nts, prods, this.startSym, symbolTraits);
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

type RawSymbol = { symbol: Token; action: Token | undefined; }

class ProductionNode extends ASTree {

	preAction: Token | undefined
	postAction: Token | undefined
	left: Token
	ntVarName: string
	rawBody: RawSymbol[]
	prod: Production | undefined;
	//由父节点(GrammarNode)指派
	varName: string | undefined;
	pid: number | undefined
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
			this.rawBody.push({ symbol, action: action });
		}
	}
	eval(env: Env): Production {
		let nt = env.getSym(this.ntVarName) as NonTerminal;
		let body = new Array<SymbolWrapper>();
		for (let { symbol } of this.rawBody) {
			if (symbol.tag == Tag.STRING) {
				body.push(new SymbolWrapper(symbol.value as string));
			} else if (symbol.tag == Tag.ID) {
				let proto = env.getSym(symbol.value as string);
				assert(proto != undefined, `undeclared identifier ${symbol.value} at ` + pos(symbol));
				body.push(new SymbolWrapper(proto));
			} else if (symbol.tag == Tag.NIL) {
				body.push(new SymbolWrapper(NIL));
			}
		}
		let preAction = this.preAction == undefined ? undefined : eval(this.preAction.value as string);
		let postAction = this.postAction == undefined ? undefined : eval(this.postAction.value as string);
		assert(this.pid != undefined);
		return new Production(this.pid, nt, body, preAction, postAction);
	}

	accpet(visitor: IVisitor): void {
		visitor.visitProductionNode(this);
	}
	// gen(varName: string, pid: number) {
	// 	let code = `let ${varName} = new ${Production.name}(${pid},${this.left.value}`;
	// 	code += ",[";
	// 	for (let { symbol, action } of this.rawBody) {
	// 		let symbolStr = symbol.tag == Tag.STRING ? `"${symbol.value}"` : symbol.value;
	// 		let actionStr = (action == undefined ? "" : "," + action.value);
	// 		code += `\n\t\tnew ${SymbolWrapper.name}(${symbolStr}${actionStr}),`;
	// 	}
	// 	code = code.replace(/,$/, "");
	// 	code += "]";
	// 	if (this.preAction != undefined)
	// 		code += "," + this.preAction.value;
	// 	else
	// 		code += ",undefined";
	// 	if (this.postAction != undefined)
	// 		code += "," + this.postAction.value;
	// 	else
	// 		code += ",undefined";
	// 	code += ");";
	// 	this.emit(code);
	// }

}

class NonTerminalNode extends ASTree {

	varName: string
	token: Token;
	prods: ProductionNode[]
	constructor(token: Token, prods: ProductionNode[]) {
		super();
		this.varName = token.value as string;
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
		let scriptNodes = new Array<ASTree>();

		let grammarNode: GrammarNode | undefined;
		let precAssocNode: PrecAssocNode | undefined;
		let terminalProtoNodes: TokenProNode[] | undefined;

		while (lexer.peek().tag != Tag.EOF) {

			while (lexer.peek().tag == Tag.SCRIPT)
				scriptNodes.push(new ScriptNode(lexer.next()));
			if (lexer.peek().tag == Tag.EOF)
				break;

			if (terminalProtoNodes == undefined) {
				if (lexer.peek().value == TOKEN_KEY) {
					lexer.next();
					terminalProtoNodes = tokenDeclarationsBlock();
				} else {
					terminalProtoNodes = [];
				}
			} else if (grammarNode == undefined) {
				if (lexer.peek().value == GRAMMAR_KEY) {
					lexer.next();
					grammarNode = grammarBlock(terminalProtoNodes);
					scriptNodes.push(grammarNode);
				} else {
					misMatch(GRAMMAR_KEY, lexer.peek().value as string);
				}
			} else if (precAssocNode == undefined) {
				if (lexer.peek().value == SPA_KEY) {
					lexer.next();
					precAssocNode = precAssocBlock();
					if (precAssocNode != undefined)
						scriptNodes.push(precAssocNode);
				} else {
					precAssocNode = new PrecAssocNode([]);
				}
			} else {
				throw new Error(`Unexpected block "${lexer.peek().value}" at ` + pos(lexer.peek()));
			}
		}
		if (grammarNode == undefined)
			throw new Error(`grammar block is required`);
		return new ProgramNode(grammarNode, precAssocNode, scriptNodes);
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
		// assert(lookahead.tag == Tag.HEAD && lookahead.value == "precassoc");
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

/*************************************** Semantic Analysis ****************************************/

interface IVisitor {
	visitProgramNode(node: ProgramNode): void;
	visitScriptNode(node: ScriptNode): void;
	visitGrammarNode(node: GrammarNode): void;
	visitTokenProNode(node: TokenProNode): void;
	visitNonterminalNode(node: NonTerminalNode): void;
	visitProductionNode(node: ProductionNode): void;
	visitPrecAssocNode(node: PrecAssocNode): void;
}

type Context = {
	firstTable?: FirstTable;
	followTable?: FollowTable;
	parser?: "LL" | "SLR" | "LR1"
}

const DEFINITION_PACKAGE = "@/definition";
const LL_PARSER_PACKAGE = "@/ll-parser";
const FIRST_SET_VAR = "firstTable";
const FOLLOW_SET_VAR = "followTable";
const SYMBOL_TRAITS_VAR ="symbolTraits";

export class CodegenVisitor implements IVisitor {

	private _code: string = "";
	private context: Context
	constructor(context: Context) {
		this.context = context;
		this.emitln(`import { ${NonTerminal.name}, ${TokenPro.name}, ${Production.name}, ${SymbolWrapper.name}, ${SymbolTrait.name}, ` +
			`NIL, Terminal, EOF } from "${DEFINITION_PACKAGE}"`);
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
			this.emitln(`import {LLParser} from "${LL_PARSER_PACKAGE}"`);
			this.emitln(`export let parser = new LLParser(${env.getSymVarName(node.grammarNode.startSym)},${FIRST_SET_VAR},${FOLLOW_SET_VAR});`);
		} else if (this.context.parser == "SLR") {
			//TODO
		} else if (this.context.parser == "LR1") {
			//TODO
		}
	}
	visitScriptNode(node: ScriptNode): void {
		this.emit(node.script + "\n");
	}
	visitGrammarNode(node: GrammarNode): void {
		//prods
		for (let key in node.prodNodeGroups) {
			let group = node.prodNodeGroups[key];
			let pnames = new Array<string>();
			for (let pNode of group) {
				pnames.push(pNode.varName!);
			}
			this.emitln(`${key}.prods=[${pnames.join(",")}];`);
		}
		let env = node.env;
		//first table
		let { firstTable } = this.context;
		if (firstTable != undefined) {
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
		}
		//follow table
		let { followTable } = this.context;
		if (followTable != undefined) {
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
		}

	}
	visitTokenProNode(node: TokenProNode): void {
		this.emitln(`export let ${node.varName} = new ${TokenPro.name}("${node.varName}");`);
	}
	visitNonterminalNode(node: NonTerminalNode): void {
		this.emitln(`let ${node.varName} = new ${NonTerminal.name}("${node.varName}");`);
	}
	visitProductionNode(node: ProductionNode): void {
		let code = `let ${node.varName} = new ${Production.name}(${node.pid},${node.ntVarName}`;
		code += ",[";
		for (let { symbol, action } of node.rawBody) {
			let symbolStr = symbol.tag == Tag.STRING ? `"${symbol.value}"` : symbol.value;
			let actionStr = (action == undefined ? "" : "," + action.value);
			code += `\n\t\tnew ${SymbolWrapper.name}(${symbolStr}${actionStr}),`;
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