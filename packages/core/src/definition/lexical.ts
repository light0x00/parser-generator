
import { Queue, assert } from "@light0x00/shim";
import { Terminal } from "./syntax";

export interface IToken {
	key(): Terminal
	// pos(): { lineNo: number, colNo: number }
}
export interface ILexer {
	peek(): IToken
	next(): IToken
}

export type TokenPatterns<T> = Array<{ regexp: RegExp, type: T }>

export abstract class AbstractRegexpLexer<T, A> {

	private patterns: TokenPatterns<A>;
	private lastIndex = 0
	private text: string
	private hasMore = true

	private buffer = new Queue<T>();

	constructor(text: string, patterns: TokenPatterns<A>) {
		this.text = text;
		this.patterns = patterns;
	}

	peek(): T {
		return this.peekFor(0);
	}

	peekFor(i: number): T {
		if (this.fill(i)) {
			return this.buffer.get(i)!;
		} else {
			return this.getEOF();
		}
	}

	next(): T {
		if (this.fill(0))
			return this.buffer.removeFirst()!;
		else
			return this.getEOF();
	}

	/**
	 * 填充直到队列达到指定数量,或没有足够的输入符号.
	 * 如果填充达到要求的数量,返回true,否则false
	 * @param i
	 */
	private fill(i: number) {
		while (this.buffer.size() < i + 1 && this.hasMore) {
			this.addToken();
		}
		return i < this.buffer.size();
	}

	/**
	 * 填充
	 */
	private addToken() {
		assert(this.hasMore);
		//determine lexeme and type
		let type: A | undefined;
		let lexeme: string | undefined;
		let match: RegExpExecArray | null = null;
		for (let p of this.patterns) {
			p.regexp.lastIndex = this.lastIndex;
			match = p.regexp.exec(this.text);
			if (match != null) {
				type = p.type;
				lexeme = match[0];
				this.lastIndex = p.regexp.lastIndex;
				//reach the end
				if (this.lastIndex >= this.text.length) {
					this.hasMore = false;
				}
				break;
			}
		}
		if (type == undefined || lexeme == undefined || match == null) {
			this.hasMore = false;
			this.onMatchFaild(this.text, this.lastIndex);
			return;
		}
		//create token
		let t = this.createToken(lexeme, type, match);
		if (t == undefined) {
			return false;
		} else {
			this.buffer.addLast(t);
			return true;
		}
	}
	protected abstract createToken(lexeme: string, type: A, match: RegExpExecArray): T | undefined
	protected onMatchFaild(text: string, lastIndex: number): void {
		throw new Error(`unrecognized charactor(${lastIndex}):${text[lastIndex]} `);
	}
	protected abstract getEOF(): T
}

export abstract class AbstractRegexpLexer2<T extends IToken, A> extends AbstractRegexpLexer<T, A>{

}