import { GrammarLexer, EvalVisitor, parse } from "../interp";
import { getLR1ParsingTable } from "@parser-generator/core";
import { AugmentedGrammar } from "@parser-generator/definition";

describe(`Test`,()=>{
	let g = `
	#TOKEN_PROTOTYPES
	STRING,NUMBER,BOOLEAN

	#GRAMMAR
	S -> json;
	factor -> array | obj | STRING | NUMBER | BOOLEAN <% (e)=> new FactorNode(e) %>;
	entry -> STRING ':' factor <% (e)=>new EntryNode(e) %>;
	entries -> entry ',' entries | entry | entry ','  <% (e)=>new EntriesNode(e) %>;
	obj -> '{' entries '}' | '{' entries '}' <% (e)=>new ObjectNode(e) %>;
	items -> factor ',' items | factor | factor ',' <% (e)=>new ItemsNode(e) %>;
	array -> '[' items ']' | '[' items ']' <% (e)=>new ArrayNode(e) %>;
	json -> factor <% (e)=>new JSONNode(e) %>;
	`;
	let p = parse(new GrammarLexer(g));
	let v = new EvalVisitor({ parser: "LR1" });
	p.accpet(v);
	let grammar = v.grammar;
	getLR1ParsingTable(grammar as AugmentedGrammar);
});