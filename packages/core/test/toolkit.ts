import fs from "fs";
import { resolve } from "path";

export const getMock = (fullpath: string) => fs.readFileSync(resolve(__dirname,fullpath), "utf8");