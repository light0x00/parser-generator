import fs from "fs";
import { assert } from "@light0x00/shim";
import { SymbolWrapper, Terminal, EOF, NonTerminal, Production, SSymbol, IGrammar } from "@/definition/syntax";
import { IToken, ILexer } from "@/definition";


export const getMock = (fullpath: string) => fs.readFileSync(fullpath, "utf8");

export type RawSimpleGrammar = Array<Array<NonTerminal | SSymbol[]>>;
export class SimpleGrammar implements IGrammar {

	protected _prodIdCounter = 0;
	protected _nonTerminals: NonTerminal[] = [];
	protected _productions: Production[] = [];
	protected _prodMap = new Map<number, Production>();
	constructor(rawGrammar: RawSimpleGrammar) {
		this.construct(rawGrammar);
	}
	protected beforeConstruct(rawGrammar: RawSimpleGrammar) {
		assert(rawGrammar.length > 0);
	}
	protected construct(rawGrammar: RawSimpleGrammar) {
		this.beforeConstruct(rawGrammar);
		//每一个非终结符
		for (let x of rawGrammar) {
			assert(x.length > 1 && x[0] instanceof NonTerminal);
			let nt = x[0];
			this._nonTerminals.push(x[0]);
			nt.prods = [];
			//非终结符的每一个产生式
			for (let i = 1; i < x.length; i++) {
				let rowProd = x[i];
				assert(rowProd instanceof Array);
				let actionSyms = [];
				//每一个符号
				for (let rawSym of rowProd) {
					actionSyms.push(new SymbolWrapper(rawSym));
				}
				let prod = new Production(this._prodIdCounter++, x[0], actionSyms);
				nt.prods.push(prod);
				this._prodMap.set(prod.id, prod);
				this._productions.push(prod);
			}
		}
		this.afterConstruct();
	}
	protected afterConstruct() {
		//Implement in subclasses
	}
	nonTerminals(): NonTerminal[] {
		return this._nonTerminals;
	}
	productions(): Production[] {
		// throw new Error("Method not implemented.");
		return this._productions;
	}
	//start symbol
	startNT() {
		return this._nonTerminals[0];
	}
	toString() {
		return this._productions.join("\n");
	}
}

export class MockToken implements IToken {
	_key: Terminal
	_val: Object
	constructor(key: Terminal, val: Object = key) {
		this._key = key;
		this._val = val;
	}
	key(): Terminal {
		return this._key;
	}
	get value(): Object {
		return this._val;
	}
	toString() {
		return this.value.toString();
	}
}

export class MockLexer implements ILexer {

	private tokens: MockToken[];
	private index = 0;
	constructor(ts: MockToken[]) {
		this.tokens = ts;
	}
	peek(): MockToken {
		if (this.index > this.tokens.length - 1) {
			return new MockToken(EOF);
		} else {
			return this.tokens[this.index];
		}
	}
	next(): MockToken {
		if (this.index > this.tokens.length - 1) {
			return new MockToken(EOF);
		} else {
			return this.tokens[this.index++];
		}
	}

}