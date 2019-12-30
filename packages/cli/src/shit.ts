import { ParsingTable, SSymbol, isNonTerminal, Terminal } from "@parser-generator/definition";
import { StateSet, FollowTable, FirstTable } from "@parser-generator/core";
/**
 * 转换LR分析表为二维数组
 * @param parsingTable
 */
export function lrTableToDimArr(parsingTable: ParsingTable): string[][] {
	let table = new Array<Array<string>>();
	let cols = new Set<SSymbol>();
	for (let P of parsingTable.table.values())
		for (let symbol of P.keys())
			cols.add(symbol);
	let headers = Array.from(cols.keys()).map(i => i + "");
	headers.unshift("");
	table.push(headers);
	for (let [k, v] of parsingTable.table) {
		let row: string[] = [];
		row.push(k + "");
		for (let c of cols) {
			if (v.has(c)) {
				row.push(v.get(c) + "");
			} else {
				row.push("");
			}
		}
		table.push(row);
	}
	return table;
}

export function lrAutomataToGraph(stateSet: StateSet) {
	//state set graph
	let nodes = [];
	let edges = [];
	let count = 0;
	let size = parseInt(Math.sqrt(stateSet.length).toString());
	for (let state of stateSet) {
		nodes.push({
			id: state.id,
			// heightConstraint: { minimum: 100, valign: "top" },
			label: `${state.toString()}`,
			x: (count % size * 250),
			y: count / size * 250
		});

		for (let [label, to] of state.mapping) {
			edges.push({
				from: state.id,
				to: to.id,
				label: isNonTerminal(label) ? label.name : label.toString()
			});
		}
		count++;
	}
	return { nodes, edges };
}

export function followTableToDimArr(followTable: FollowTable): string[][] {
	let table = new Array<Array<string>>();
	let tokens = new Set<Terminal>();
	for (let P of followTable.values())
		for (let token of P.keys())
			tokens.add(token);

	let headers = Array.from(tokens).map(i => i + "");
	headers.unshift("");
	table.push(headers);

	for (let [k, v] of followTable) {
		let row: string[] = [];
		row.push(k + "");
		for (let token of tokens) {
			if (v.has(token))
				row.push(`y`);
			else
				row.push("");
		}
		table.push(row);
	}
	return table;
}

export function firstTableToDimArr(firstTable: FirstTable): string[][] {
	let table = new Array<Array<string>>();

	let tokens = new Set<Terminal>();
	for (let P of firstTable.values())
		for (let token of P.keys())
			tokens.add(token);

	let headers = Array.from(tokens).map(i => i + "");
	headers.unshift("");
	table.push(headers);

	for (let [k, v] of firstTable) {
		let row: string[] = [];
		row.push(k + "");
		for (let token of tokens) {
			if (v.has(token))
				row.push(`${v.get(token)}`);
			else
				row.push("");
		}
		table.push(row);
	}
	return table;
}