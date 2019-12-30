import { IToken } from "@parser-generator/definition";
import { isIterable } from "@light0x00/shim";

export class CyclicDepsDector<T> {
	private dependencies = new Map<T, Set<T>>();
	/**
     * 广度优先遍历图,如果找到 startPoint到endPoint的路径,则说明存在循环依赖  issue: 9.循环依赖
     * @param endPoint
     * @param startPoint
     */
	private isConnected(startPoint: T, endPoint: T) {
		let otherDeps = this.dependencies.get(startPoint);
		if (otherDeps === undefined)
			return false;
		if (otherDeps.has(endPoint)) {
			return true;
		}
		let stack = Array.from(otherDeps);
		let visited = new Set<T>();
		while (stack.length > 0) {
			let top = stack.pop() as T;
			visited.add(top);
			if (top == endPoint)
				return true;
			let topDeps = this.dependencies.get(top);
			if (topDeps == undefined)
				continue;
			if (topDeps.has(endPoint))
				return true;
			for (let topDep of topDeps) {
				stack.push(topDep);
			}
		}
		return false;
	}
	/**
	 * 注册依赖,并检测是否存在反向依赖,如存在则说明存在环,将返回true
	 * @param holder
	 * @param dep
	 */
	registerAndCheckCycl(holder: T, dep: T) {
		let holderDeps = this.dependencies.get(holder);
		if (holderDeps === undefined) {
			holderDeps = new Set<T>();
			this.dependencies.set(holder, holderDeps);
		}
		holderDeps.add(dep);
		return this.isConnected(dep, holder);
	}
}

export class MismatchError extends Error {
	constructor(expected: Object, actual: Object) {
		let err_msg;
		if (isIterable(expected)) {
			let expectation = "";
			for (let e of expected) {
				expectation += `"${e}",`;
			}
			expectation = expectation.replace(/,$/, "");
			err_msg = `The expected input is one of ${expectation},but actually ${actual}`;
		}
		else {
			err_msg = `The expected input is ${expected},but actually ${actual}`;
		}
		// err_msg+=` at (${actual.lineNo},${actual.colNo})`;
		super(err_msg);
	}
}