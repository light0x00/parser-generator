import { AbstractRegexpLexer2, IToken, Terminal, EOF } from "@parser-generator/definition";
import { digit } from "./parser";

export enum Tag {
	EOF = "EOF",
	NUM = "NUM",
	SINGLE = "SINGLE",
	SPACE ="SPACE"
}

abstract class Token implements IToken {
	abstract key(): Terminal ;
	abstract value() : Object
	toString(){
		return this.value().toString();
	}
}

export class Single extends Token{
	private lexeme : string
	constructor(lexeme : string){
		super();
		this.lexeme = lexeme;
	}
	value() : string{
		return this.lexeme;
	}
	key() {
		return this.lexeme;
	}
}
export class Num extends Token{
	private lexeme : number
	constructor(lexeme : number){
		super();
		this.lexeme = lexeme;
	}
	key(): Terminal {
		return digit;
	}
	value(): number {
		return this.lexeme;
	}
}

export class ArithmeticLexer extends AbstractRegexpLexer2<IToken, Tag>{
	constructor(text: string) {
		super(text, [
			{ regexp: /(?<space>\s+)/y, type: Tag.SPACE },
			{ regexp: /(?<num>(0(?![0-9]))|([1-9]\d*(?!\.)))/y, type: Tag.NUM },
			{ regexp: /(?<real>([1-9]\d*\.\d+)|(0\.\d+))/y, type: Tag.NUM },
			{ regexp: /(?<single>.)/y, type: Tag.SINGLE }
		]);
	}
	protected createToken(lexeme: string, type: Tag, match: RegExpExecArray): IToken | undefined {
		switch (type) {
			case Tag.SPACE:
				return undefined; /* it means ignoring the match */
			case Tag.NUM:
				return new Num(parseFloat(lexeme));
			case Tag.SINGLE:
				return new Single(lexeme);
		}
	}
	protected getEOF(): IToken {
		return EOF;
	}
}
