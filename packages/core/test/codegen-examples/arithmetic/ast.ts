import { ASTree, ASTElement } from "@/definition";
import { MockToken } from "../../toolkit";

class ASTList implements ASTree {

	eles: ASTElement[]
	constructor(eles: ASTElement[]) {
		this.eles = eles;
	}
}
export class Expr extends ASTList {
	get left(): Factor {
		return this.eles[0] as Factor;
	}
	get term(): Term | undefined {
		return this.eles.length == 2 ? this.eles[1] as Term : undefined;
	}
	eval(): number {
		let result = (this.left as Factor).eval();
		let term = this.term;
		while (term != undefined) {
			let op = term.op;
			let right = term.right!;
			switch (op) {
				case "+":
					result += right;
					break;
				case "-":
					result -= right;
					break;
			}
			term = term.subTerm;
		}
		return result;
	}
	toString() {
		return "E";
	}
}
export class Term extends ASTList {
	get op(): string | undefined {
		return this.eles.length > 0 ? (this.eles[0] as MockToken).value as string : undefined;
	}
	get right(): number | undefined {
		return this.eles.length > 1 ? (this.eles[1] as Factor).eval() : undefined;
	}
	get subTerm(): Term | undefined {
		return this.eles.length > 2 ? (this.eles[2] as Term) : undefined;
	}
	toString() {
		return "T";
	}
}
export class Factor extends ASTList {
	eval(): number {
		if (this.eles.length == 1) {
			return (this.eles[0] as MockToken).value as number;
		} else {
			return (this.eles[1] as Expr).eval();
		}
	}
	toString() {
		return "F";
	}
}
