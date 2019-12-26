import { getMock } from "../../toolkit";
import { codegen } from "@/index";

let code = codegen(getMock(__dirname + "/grammar.txt"), { parser: "LL" });
console.log(code);

