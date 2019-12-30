import { getMock } from "../../toolkit";
import { codegen } from "../../../src/index";

let code = codegen(getMock(__dirname + "/grammar.txt"), { parser: "LR1" });
console.log(code);
