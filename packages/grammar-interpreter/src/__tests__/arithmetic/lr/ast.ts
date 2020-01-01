import { ASTree, ASTElement } from "@parser-generator/definition";
import { Single, Num } from "../lexer";

/*
E-> E+E | E-E | E*E | E/E | (E) |digit
*/
export class Expr implements ASTree {
	children: ASTElement[];
	constructor(eles: ASTElement[]) {
		this.children = eles;
	}

	eval(): number {
		let first = this.children[0];
		if (this.children.length == 3) {
			//(E)
			if (first instanceof Single) {
				return (this.children[1] as Expr).eval();
			}
			//E op E
			else {
				let left = (this.children[0] as Expr);
				let op = (this.children[1] as Single).value();
				let right = (this.children[2] as Expr);
				switch (op) {
					case "+":
						return left.eval() + right.eval();
					case "-":
						return left.eval() - right.eval();
					case "*":
						return left.eval() * right.eval();
					case "/":
						return left.eval() / right.eval();
					default:
						throw new Error(`Unknown token :${op}`);
				}
			}
		}
		//NUM
		else {
			return (first as Num).value();
		}
	}
}