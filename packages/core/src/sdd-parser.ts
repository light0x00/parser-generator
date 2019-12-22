import { IToken, EOF, NIL, ISymbolPrototype, NonTerminalPro, Production, TerminalPro, ProtoSymbol, ISymbol, ValueSymbol, AbstractRegexpLexer } from "@light0x00/parser-definition";
import { Queue, assert, Stack } from "@light0x00/shim";

import _debug from "debug";
let debug = _debug("PG:tokenzier");
import { cloneDeep, groupBy, Dictionary } from "lodash";

/*************************************** Lexer ****************************************/

enum Tag {
	BLANK = "BLANK", CRLF = "CRLF", EOF = "EOF", NIL = "NIL",
	HEAD = "HEAD", SCRIPT = "SCRIPT", STRING = "STRING", NUMBER = "NUMBER", WORD = "WORD", SINGLE = "SINGLE",
	ID = "ID", KEYWORD = "KEYWORD", ASSOC = "ASSOC"
}

abstract class Token implements IToken {
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
	abstract key(): Object;
	abstract get value(): Object;

	toString() {
		return this.value + `(${this._lineNo},${this._colNo})`;
	}
}

class Special extends Token {

	obj: Object
	constructor(tag: Tag, obj: Object) {
		super(tag);
		this.obj = obj;
	}
	key(): Object {
		return this.obj;
	}
	get value(): Object {
		return this.obj;
	}
}
class PToken extends Token {
	lexeme: string
	constructor(tag: Tag, lexeme: string) {
		super(tag);
		this.lexeme = lexeme;
	}
	key(): Object {
		return this.tag;
	}
	get value(): string {
		return this.lexeme as string;
	}
}

class VToken extends Token {
	lexeme: string
	constructor(tag: Tag, lexeme: string) {
		super(tag);
		this.lexeme = lexeme;
	}
	key(): Object {
		return this.lexeme;
	}
	get value(): string {
		return this.lexeme;
	}
}

class NumberToken extends Token {
	lexeme: number
	constructor(lexeme: number) {
		super(Tag.NUMBER);
		this.lexeme = lexeme;
	}
	key(): Object {
		return this.tag;
	}
	get value(): number {
		return this.lexeme;
	}
}

export class SDDLexer extends AbstractRegexpLexer<Token, Tag>{

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
		this.reserves.set("left", new VToken(Tag.ASSOC, "left"));
		this.reserves.set("right", new VToken(Tag.ASSOC, "right"));
		this.reserves.set("NIL", new Special(Tag.NIL, NIL));
	}
	protected getEOF(): Token {
		if (this.eofToken == undefined) {
			this.eofToken = new Special(Tag.EOF, EOF);
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
					token = new PToken(Tag.ID, lexeme);
				else
					token = cloneDeep(re)!;
				break;
			}
			case Tag.HEAD:
				token = new VToken(type, match.groups!["value"]);
				break;
			case Tag.SCRIPT: {
				token = new PToken(Tag.SCRIPT, match.groups!["value"]);
				token.setPos(this.lineNo, this.colNo);
				//处理行列计数
				let { rows, cols } = shit(lexeme);
				this.lineNo += rows;
				this.colNo = (rows > 0) ? cols : this.colNo += cols;
				break;
			}
			case Tag.NUMBER:
				token = new NumberToken(parseFloat(lexeme));
				break;
			case Tag.STRING:
				token = new VToken(Tag.STRING, match.groups!["value"]);
				break;
			case Tag.SINGLE:
				token = new VToken(Tag.SINGLE, lexeme);
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

type SymbolTraitTable = Map<ISymbolPrototype | string, SymbolTrait>

class Grammar {
	nts: NonTerminalPro[]
	prods: Production[]
	traits: SymbolTraitTable
	startSym: NonTerminalPro
	constructor(nts: NonTerminalPro[], prods: Production[], startSymbol: NonTerminalPro, traits?: SymbolTraitTable) {
		this.nts = nts;
		this.prods = prods;
		this.startSym = startSymbol;
		if (traits != undefined)
			this.traits = traits;
		else
			this.traits = new Map<ISymbolPrototype | string, SymbolTrait>();
	}

	toString() {
		return this.prods.join("\n");
	}
}

class SymbolTrait {
	prec: number;
	leftAssoc: boolean
	constructor(prec: number, leftAssoc: boolean) {
		this.prec = prec;
		this.leftAssoc = leftAssoc;
	}
	compareTo(other: SymbolTrait): boolean {
		//TODO
		return false;
	}
}


interface IBlockGenerator {
	gen(): void
}

/*************************************** AST ****************************************/

abstract class ASTree {
	/* 运行时 更改原型的方式实现输出的多策略 */
	emit(s: string) {
		process.stdout.write(s);
	}
}

export class ProgramNode extends ASTree {
	grammarNode: GrammarNode;
	paNode: PrecAssocNode | undefined
	blocks: IBlockGenerator[]
	constructor(gNode: GrammarNode, paNode: PrecAssocNode | undefined, blocks: IBlockGenerator[]) {
		super();
		this.grammarNode = gNode;
		this.paNode = paNode;
		this.blocks = blocks;
	}
	eval(): Grammar {
		let traits;
		if (this.paNode != undefined) {
			traits = this.paNode.eval();
		}
		return this.grammarNode.eval(traits);
	}
	gen() {
		for (let block of this.blocks) {
			block.gen();
		}
	}
}

class ScriptNode extends ASTree implements IBlockGenerator {
	script: string;
	constructor(t: Token) {
		super();
		this.script = t.value as string;
	}
	gen(): void {
		this.emit(this.script);
	}
}

class PrecAssocNode extends ASTree implements IBlockGenerator {
	children: PrecassocItemNode[]
	constructor(children: PrecassocItemNode[]) {
		super();
		this.children = children;

	}
	eval(): SymbolTraitTable {
		let traits = new Map<ISymbolPrototype | string, SymbolTrait>();
		for (let c of this.children) {
			traits.set(c.symbol.value as string, new SymbolTrait(c.prec, c.leftAssoc));
		}
		return traits;
	}
	gen() {
		this.emit(`let symbolTraits = new Map<string, SymbolTrait>();`);
		for (let item of this.children) {
			this.emit("\n");
			let symStr = item.symbol.tag == Tag.STRING ? `"${item.symbol.value}"` : item.symbol.value;//区别字符串字面量与变量名
			this.emit(`symbolTraits.set(${symStr},new ${SymbolTrait.name}(${item.prec},${item.leftAssoc ? "true" : "false"}));`);
		}
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
}

type Env = Map<string, ISymbolPrototype>

class GrammarNode extends ASTree implements IBlockGenerator {
	//文法变量 存储文法中声明的终结符、非终结符原型
	env = new Map<string, ISymbolPrototype>()
	//子节点
	prodNodes: ProductionNode[] //产生式
	ntpNodes: NonTerminalProNode[] //非终结符原型
	tpNodes: TokenProNode[]	//终结符原型
	//属性
	ntPrototypes: NonTerminalPro[] = []
	startSym!: NonTerminalPro;
	prodNodeGroups: Dictionary<ProductionNode[]>
	constructor(tNodes: TokenProNode[], ntNodes: NonTerminalProNode[], prodNodes: ProductionNode[]) {
		super();
		this.tpNodes = tNodes;
		this.prodNodes = prodNodes;
		this.ntpNodes = ntNodes;
		/* 初始化文法变量 */
		//terminal proto
		for (let { token: t } of tNodes) {
			let v = t.value as string;
			if (this.env.has(v))
				throw new Error(`duplicate declared variable ${v} at (${t.lineNo},${t.colNo})`);
			this.env.set(v, new TerminalPro(v));
		}
		//non-terminal proto
		for (let i = 0; i < ntNodes.length; i++) {
			let nt = ntNodes[i].token;
			let varName = ntNodes[i].name;
			if (this.env.has(varName))
				throw new Error(`duplicate declared variable ${varName} at (${nt.lineNo},${nt.colNo})`);
			let ntProto;
			if (i == 0)
				this.startSym = ntProto = new NonTerminalPro(varName, true);
			else
				ntProto = new NonTerminalPro(varName);
			this.env.set(varName, ntProto);
			this.ntPrototypes.push(ntProto);
		}

		this.prodNodeGroups = groupBy(this.prodNodes, (p) => p.ntName);

	}
	//1. 解析出Grammar对象
	//2. 生成客户端代码
	gen() {
		for (let tpNode of this.tpNodes) {
			tpNode.gen();
			this.emit("\n");
		}

		for (let ntpNode of this.ntpNodes) {
			ntpNode.gen();
			this.emit("\n");
		}
		let prodIdCount = 0;
		for (let key in this.prodNodeGroups) {
			let group = this.prodNodeGroups[key];
			let pnames = new Array<string>();
			for (let pNode of group) {
				let pid = prodIdCount++;
				let prodName = "p" + pid;
				pNode.gen("p" + pid, pid); //
				this.emit("\n");
				pnames.push(prodName);
			}
			this.emit(`${key}.prods=[${pnames.join(",")}]`);
			this.emit("\n");
		}
	}

	eval(symbolTraits: SymbolTraitTable | undefined): Grammar {
		let prods = new Array<Production>();
		let indexes = new Map<number, Production>();
		let prodIdCount = 0;
		for (let key in this.prodNodeGroups) {
			let group = this.prodNodeGroups[key];
			let ntProds = new Array<Production>();
			for (let pNode of group) {
				let pid = prodIdCount++;
				let prod = pNode.eval(pid, this.env);

				prods.push(prod);
				indexes.set(pid, prod);
				ntProds.push(prod);
			}
			let nt = this.env.get(key) as NonTerminalPro;
			nt.prods = ntProds;
		}
		return new Grammar(this.ntPrototypes, prods, this.startSym, symbolTraits);
	}
}

class TokenProNode extends ASTree {
	token: Token
	name: string;
	constructor(token: Token) {
		super();
		this.token = token;
		this.name = token.value as string;
	}
	gen() {
		this.emit(`let ${this.name} = new ${ProtoSymbol.name}(new ${TerminalPro.name}("${this.name}"))`);
	}
}

type RawSymbol = { symbol: Token; action: Token | undefined; }

class ProductionNode extends ASTree {
	preAction: Token | undefined
	postAction: Token | undefined
	left: Token
	ntName: string
	rawBody: RawSymbol[]
	prod: Production | undefined;
	constructor(nt: Token, body: Token[]) {
		super();
		this.left = nt;
		this.ntName = nt.value as string;
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
	eval(id: number, env: Env): Production {
		let nt = env.get(this.left.value as string) as NonTerminalPro;
		let body = new Array<ISymbol>();
		for (let { symbol } of this.rawBody) {
			if (symbol.tag == Tag.STRING) {
				body.push(new ValueSymbol(symbol));
			} else if (symbol.tag == Tag.ID) {
				let proto = env.get(symbol.value as string);
				assert(proto != undefined, `undeclared identifier ${proto} at ` + pos(symbol));
				body.push(new ProtoSymbol(proto));
			}
		}
		return new Production(id, nt, body);
	}

	gen(varName: string, pid: number) {
		let code = `let ${varName} = new ${Production.name}(${pid},${this.left.value}`;
		code += ",[";
		for (let { symbol, action } of this.rawBody) {
			let actionStr = (action == undefined ? "undefined" : action.value);
			if (symbol.tag == Tag.STRING) {
				code += `\n\t\tnew ${ValueSymbol.name}("${symbol.value}",${actionStr}),`;
			} else {
				code += `\n\t\tnew ${ProtoSymbol.name}(${symbol.value},${actionStr}),`;
			}
		}
		code = code.replace(/,$/, "");
		code += "]";
		if (this.preAction != undefined)
			code += "," + this.preAction.value;
		else
			code += ",undefined";
		if (this.postAction != undefined)
			code += "," + this.postAction.value;
		else
			code += ",undefined";
		code += ");";
		this.emit(code);
	}

}

class NonTerminalProNode extends ASTree {
	name: string
	token: Token;
	prods: ProductionNode[]
	constructor(token: Token, prods: ProductionNode[]) {
		super();
		this.name = token.value as string;
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
			console.error(`nonterminal ${this.name} don't have post-action,it's required for parser!`);
		// assert(defaultPostAction != undefined, `productions of nonterminal ${this.name} should have at least one post action`);
		for (let p of prods) {
			if (p.preAction == undefined)
				p.preAction = defaultPreAction;
			if (p.postAction == undefined)
				p.postAction = defaultPostAction;
		}
	}
	//原型由 GrammarNode 传入
	gen() {
		this.emit(`let ${this.name} = new ${NonTerminalPro.name}("${this.name}")`);
	}
}

function pos(t: Token) {
	return `(${t.lineNo},${t.colNo})`;
}

/*************************************** Parser ****************************************/
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
export function parse(lexer: SDDLexer): ProgramNode {
	return program();
	function program() {
		/*
		Block:
			- GRAMMAR (Required)
			- TOKEN_PROTO
			- SCRIPT
			- PREC_ASSOC
		*/
		//如果生成代码时需要保证每个块的顺序 则用链表存储顺序
		let scriptNodes = new Array<IBlockGenerator>();

		let grammarNode: GrammarNode | undefined;
		let precAssocNode: PrecAssocNode | undefined;
		let terminalProtoNodes: TokenProNode[] | undefined;

		while (lexer.peek().value != EOF) {

			while (lexer.peek().tag == Tag.SCRIPT)
				scriptNodes.push(new ScriptNode(lexer.next()));
			if (lexer.peek().value == EOF)
				break;

			if (terminalProtoNodes == undefined) {
				if (lexer.peek().value == "TOKEN_PROTOTYPES") {
					lexer.next();
					terminalProtoNodes = tokenDeclarationsBlock();
				} else {
					terminalProtoNodes = [];
				}
			} else if (grammarNode == undefined) {
				if (lexer.peek().value == "GRAMMAR") {
					lexer.next();
					grammarNode = grammarBlock(terminalProtoNodes);
					scriptNodes.push(grammarNode);
				} else {
					throw new Error("expect a grammar block!");
				}
			} else if (precAssocNode == undefined) {
				if (lexer.peek().value == "SYMBOL_PREC_ASSOC") {
					lexer.next();
					precAssocNode = precAssocBlock();
					if (precAssocNode != undefined)
						scriptNodes.push(precAssocNode);
				} else {
					precAssocNode = new PrecAssocNode([]);
				}
			} else {
				throw new Error(`incorrect block "${lexer.peek().value}" at ` + pos(lexer.peek()));
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
		let ntNodes = new Array<NonTerminalProNode>();
		let prodNodes = new Array<ProductionNode>();
		//每一个非终结符
		for (let { key, prods } of rawGrammar) {
			let ntPNodes = new Array<ProductionNode>();
			//终结符的每一个产生式
			for (let p of prods) {
				ntPNodes.push(new ProductionNode(key, p));
			}
			ntNodes.push(new NonTerminalProNode(key, ntPNodes));
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
				throw new Error(`unknown symbol "${lexer.peek().value}" at ` + pos(lexer.peek()));
			}
		}
		return { key: nt, prods };
	}

	function production(): Token[] {
		let body = new Array<Token>();
		//空产生式体
		if (lexer.peek().tag == Tag.NIL) {
			body.push(lexer.next());
		}
		//非空的产生式体
		else {
			let isScript = false;
			while (1) {
				if (lexer.peek().tag == Tag.ID || lexer.peek().tag == Tag.STRING) {
					isScript = false;
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
		}
		return body;
	}
}

