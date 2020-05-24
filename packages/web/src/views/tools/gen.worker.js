import { genParser, adapter } from "@parser-generator/grammar-interpreter";

onmessage = function (event) {
	try {
		let r = genParser(event.data.grammar, event.data.options);
		console.log(r);
		let {
			code,
			grammar,
			lrTable,
			lrAutomata,
			firstTable,
			followTable
		} = r;
		let result = {
			code,
			productions: grammar.productions().map(p => ({ id: p.id, head: p.head.toString(), body: p.body.map(s=>s.toString()) , action: (p.action != undefined) ? p.action.toString() : "" })),
			lrTable: adapter.lrTableToDimArr(lrTable),
			firstTable: adapter.firstTableToDimArr(firstTable),
			followTable: adapter.followTableToDimArr(followTable),
			lrAutomata: adapter.lrAutomataToGraph(lrAutomata)
		};
		postMessage({ hasError: false, result });
	} catch (error) {
		console.error(error);
		postMessage({ hasError: true, error });
	}


};