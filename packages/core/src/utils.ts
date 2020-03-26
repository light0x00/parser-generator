import { isIterable,Queue } from "@light0x00/shim";

export class CyclicDepsDector<T> {
	private dependencies = new Map<T, Set<T>>();
	/**
     * 广度优先遍历图,如果找到 startPoint到endPoint的路径,则说明存在循环依赖  issue: 9.循环依赖
     * @param endPoint
     * @param startPoint
     */
	private isConnected(startPoint: T, endPoint: T) {
		let roots = this.dependencies.get(startPoint);
		if (roots === undefined)
			return false;
		else if (roots.has(endPoint)) {
			return true;
		}
		let queue = new Queue<T>(startPoint);
		let visited = new Set<T>([startPoint]);
		while (queue.size() > 0) {
			let top = queue.dequeue()!;
			let ajds = this.dependencies.get(top);
			if(ajds == undefined)
				continue;
			else if(ajds.has(endPoint))
				return true;
			for(let adj of ajds){
				if(visited.has(adj))
					continue;
				visited.add(adj);
				queue.enqueue(adj);
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