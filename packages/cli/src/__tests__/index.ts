import { resolve } from "path";
import { codegen } from "../codegen";
import should from "should";

describe(`CLI Test`, () => {

	let f = resolve(__dirname, "./grammar.txt");
	let o = resolve(__dirname, "../../dist");

	it(`Codegen test`, async () => {
		should.doesNotThrow(() => {
			codegen({ parser: "LR1", lang: "TS", file: f, outputDir: o });
		});
	});

});

