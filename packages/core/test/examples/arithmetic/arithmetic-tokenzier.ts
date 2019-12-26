import rootDebug from "debug";
import { cloneDeep } from "lodash";
import { Terminal, TokenPro, EOF,AbstractRegexpLexer2 ,IToken} from "@/definition";
let debug = rootDebug("APP:tokenizer");

export enum Tag {
	Nil = "Nil",
	EOF = "EOF",
	ID = "ID",
	NUM = "NUM",
	SINGLE = "SINGLE",
	STRING = "STRING",
	BLANK = "BLANK",
	WHILE = "WHILE",
	IF = "IF",
	ELSEIF = "ELSEIF",
	ELSE = "ELSE"
}
export type TokenPosition = {
	lineNo: number;
	colNo: number;
};
export abstract class Token implements IToken {

	readonly tag: Tag;
	protected _lineNo = -1;
	protected _colNo = -1;
	constructor(tag: Tag, lineNo = -1, colNo = -1) {
		this.tag = tag;
		// this.pos = pos;
		this._lineNo = lineNo;
		this._colNo = colNo;
	}
	get lineNo() {
		return this._lineNo;
	}
	get colNo() {
		return this._colNo;
	}
	setPos(lineNo: number, colNo: number) {
		this._lineNo = lineNo;
		this._colNo = colNo;
	}
	/*
	不同类型的Token的查表问题
	分析表中存的可能是 kc
	而分词器返回的均为Token,这里涉及到一个如何映射的问题

	比如对于以下文法,我们希望"+" 用Token.lexeme去查表,而对于id,则用Token.tag去查表.
	E -> NUM + NUM
	*/
	abstract key(): Terminal;
	abstract value(): Object;
}
/* 多字符 符号 */
export class Word extends Token {
	lexeme: string;
	constructor(tag: Tag, lexeme: string, lineNo = -1, colNo = -1) {
		super(tag, lineNo, colNo);
		this.lexeme = lexeme;
	}
	key() {
		return this.tag;
	}
	value() {
		return this.lexeme;
	}
	toString() {
		return this.lexeme;
	}
}
/* 数字 */
export class Num extends Token {
	readonly _value: number;
	constructor(v: number, lineNo = -1, colNo = -1) {
		super(Tag.NUM, lineNo, colNo);
		this._value = v;
	}
	key() {
		return this.tag;
	}
	value() {
		return this._value;
	}
	toString() {
		return this.value.toString();
	}
}
/* 单字符 符号
比"-" 可能是运算符,也可能是构成lambda的一部分 ()->
这类符号作用很多,相比与用自动机识别,通过BNF来表达更合适,因此在语法分析阶段处理
*/
export class Single extends Token {
	lexeme: string; /* 这里原本应该为char类型 */
	constructor(v: string, lineNo = -1, colNo = -1) {
		super(Tag.SINGLE, lineNo, colNo);
		this.lexeme = v;
	}
	key() {
		return this.lexeme;
	}
	value(): Object {
		return this.lexeme;
	}
	toString() {
		return this.lexeme;
	}
}

class Special extends Token{
	proto:TokenPro;
	constructor(tag:Tag,proto:TokenPro, lineNo = -1, colNo = -1){
		super(tag);
		this.proto = proto;
	}
	key(): Terminal {
		return this.proto;
	}
	value(): Object {
		throw new Error("Method not implemented.");
	}


}

enum TokenType {
	BLANK, COMMENT, WORD, NUM, REAL, STRING, SINGLE
}

export class RegexpTokenizer extends AbstractRegexpLexer2<Token, TokenType> {

	private reservedWords = new Map<string, Word>()
	private lineNo: number = 1
	private colNo: number = 0
	constructor(text: string) {
		super(text, [
			{ regexp: /(?<space>\s+)/y, type: TokenType.BLANK },
			{ regexp: /(?<comment>\/\/[^\n]*)/y, type: TokenType.COMMENT },
			{ regexp: /(?<word>[A-Z_a-z]\w*)/y, type: TokenType.WORD },
			{ regexp: /(?<real>([1-9]\d*\.\d+)|(0\.\d+))/y, type: TokenType.REAL },
			{ regexp: /(?<num>(0(?![0-9]))|([1-9]\d*(?!\.)))/y, type: TokenType.NUM },
			{ regexp: /(?<string>"(\\"|\\\\|\\n|\\t|[^"])*")/y, type: TokenType.STRING },
			{ regexp: /(?<single>.)/y, type: TokenType.SINGLE }
		]);
		this.reserve(new Word(Tag.WHILE, "while"));
		this.reserve(new Word(Tag.IF, "if"));
		this.reserve(new Word(Tag.ELSEIF, "elseif"));
		this.reserve(new Word(Tag.ELSE, "else"));
	}

	private reserve(reserve: Word) {
		this.reservedWords.set(reserve.lexeme, reserve);
	}

	protected createToken(lexeme: string, type: TokenType, match: RegExpExecArray): Token | undefined {
		// 	let pos = { lineNo: this.lineNo, colNo: this.colNo };
		let result: Token | undefined;
		switch (type) {
			/* 匹配一个空白符，包括空格、制表符、换页符、换行符和其他 Unicode 空格。 */
			case TokenType.BLANK:
				for (let chr of lexeme) {
					debug("空白 " + chr.charCodeAt(0));
					if (chr == "\n") {
						++this.lineNo;
						this.colNo = 0;
					}
				}
				break;
			case TokenType.WORD:
				debug("标识符 " + lexeme);
				if (this.reservedWords.has(lexeme)) {
					let reseve = this.reservedWords.get(lexeme);
					result = cloneDeep(reseve)!;
				} else {
					result = new Word(Tag.ID, lexeme);
				}
				break;
			case TokenType.NUM:
				// debug("整数 " + lexeme);
				result = new Num(Number.parseInt(lexeme));
				break;
			case TokenType.REAL:
				result = new Num(Number.parseFloat(lexeme));
				// debug("浮点数 " + lexeme);
				break;
			case TokenType.STRING:
				result = new Word(Tag.STRING, lexeme);
				// debug("字符串字面量 " + lexeme);
				break;
			case TokenType.COMMENT:
				debug("注释 " + lexeme);
				break;
			case TokenType.SINGLE:
				// debug("单字符 " + lexeme);
				result = new Single(lexeme);
				break;
			default:
				throw new Error("tokenizer error,unknown token:" + lexeme);
		}
		result?.setPos(this.lineNo,this.colNo);
		this.colNo+=lexeme.length;
		return result;
	}
	protected getEOF(): Token {
		return new Special(Tag.EOF,EOF,this.lineNo,this.colNo);
	}
}
