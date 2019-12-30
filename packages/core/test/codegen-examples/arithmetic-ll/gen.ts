import { getMock } from "../../toolkit";
import { codegen } from "../../../src/index";

let code = codegen(getMock(__dirname + "/grammar.txt"), { parser: "LL" });
console.log(code);

