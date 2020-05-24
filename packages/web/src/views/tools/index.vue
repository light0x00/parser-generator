<template>
  <div v-loading="loading">
    <!-- 输入-->
    <el-input
      v-model="grammar"
      type="textarea"
      placeholder="请输入内容"
      maxlength="9999"
      size="medium"
      rows="20"
      show-word-limit
    />
    <el-alert v-show="errorMsg!=''" :title="errorMsg" type="error" show-icon :closable="false" />
    <el-alert
      v-show="successMsg!=''"
      :title="successMsg"
      type="success"
      show-icon
      :closable="false"
    />

    <el-row type="flex">
      <el-select v-model="options.parser" placeholder="parser type">
        <el-option label="LL" value="LL" />
        <el-option label="SLR" value="SLR" />
        <el-option label="LR1" value="LR1" />
        <el-option label="LALR" disabled value="LALR" />
      </el-select>

      <el-select v-model="options.lang" placeholder="lanuguage">
        <el-option label="TS" value="TS" />
        <el-option label="JS" disabled value="JS" />
      </el-select>
    </el-row>

    <el-row type="flex" justify="space-around">
      <el-button type="primary" style="width:250px" @click="gen">GO</el-button>
    </el-row>

    <!-- 输出 -->
    <template v-if="outputVisible">
      <!-- 产生式 -->
      <h1>Productions</h1>
      <table>
        <tr>
          <td>id</td>
          <td>body</td>
          <td>action</td>
        </tr>
        <tr v-for="(prod,index) of output.productions" :key="index">
          <td>{{ prod.id }}</td>
          <td>{{ prod.head + '->' + prod.body.join(' ') }}</td>
          <td>{{ prod.action }}</td>
        </tr>
      </table>

      <!-- First 集 -->
      <collapse>
        <template slot="head">First Set</template>
        <matrix-table slot="body" :data="output.firstTable" />
      </collapse>

      <!-- Follow 集 -->
      <collapse>
        <template slot="head">Follow Set</template>
        <matrix-table slot="body" :data="output.followTable" />
      </collapse>

      <template v-if="isLR">
        <!-- LR 自动机 -->
        <collapse>
          <template slot="head">LR Automata</template>
          <div
            slot="body"
            style="width:calc(100% - 2px);height:600px;overflow: auto;  border:1px solid #e1e4e8;resize: vertical "
          >
            <network
              ref="automata"
              :value="output.lrAutomata"
              style="height:900px; background-color:white;width: calc(100% - 20px) ;"
            />
          </div>
        </collapse>

        <!-- LR 分析表 -->
        <collapse>
          <template slot="head">LR Parsing Table</template>
          <matrix-table slot="body" :data="output.lrTable" />
        </collapse>
      </template>

      <!-- Parser Source Code-->
      <collapse>
        <template slot="head">Parser Source Code</template>
        <template slot="body">
          <a href="javascript:void(0)" @click="downloadSourceCode">download</a>
          <markdown :content="mdContent" />
        </template>
      </collapse>
    </template>
  </div>
</template>

<script lang="js">

import { saveAs } from "file-saver";
import Vue from "vue";
// import { genParser,adapter } from "@parser-generator/grammar-interpreter";

const DEFAULT_GRAMMAR =
`<% import { Expr } from "./ast"; %>
#TOKEN_PROTOTYPES
digit

#GRAMMAR
S->E;
E->E '+' E | E '-' E |E'*'E |E'/'E | '(' E ')' | digit  <% (e)=>new Expr(e)  %>;

#SYMBOL_ASSOC_PREC
E left
'+' 0
'-' 0
'*' 1
'/' 1`;

const INITIAL_OUTPUT = {
	code: "",
	productions: [],
	firstTable: [],
	followTable: [],
	lrTable: [],
	lrAutomata: {
		nodes: [],
		edges: []
	}
};

export default Vue.extend({
	name:"MAIN",
	data() {
		return {
			grammar: DEFAULT_GRAMMAR,
			output: INITIAL_OUTPUT,
			options: {
				parser: "LR1",
				lang: "TS"
			},
			errorMsg0: "",
			successMsg0: "",
			loading:false
		};
	},
	computed: {
		mdContent() {
			return "```ts\n" + this.output.code + "\n```";
		},
		isLR() {
			return this.options.parser != "LL" && this.outputVisible;
		},
		outputVisible() {
			return this.output.code != "";
		},
		successMsg: {
			get (){
				return this.successMsg0;
			},
			set(v){
				this.errorMsg0="";
				this.successMsg0 = v;
			}
		},
		errorMsg :{
			get(){
				return this.errorMsg0;
			},
			set(v){
				this.successMsg0 ="";
				this.errorMsg0= v;
			}
		}
	},
	methods: {
		async gen() {
			let myWorker = new ((await import("./gen.worker")).default)();
			console.log("!!!",myWorker);
			const thisRef = this;

			myWorker.onmessage = function (event) {

				if(event.data.hasError){
					thisRef.errorMsg = event.data.error.message;
					thisRef.output = INITIAL_OUTPUT;
				}else{
					console.log("!!!",event.data.result);
					thisRef.output = event.data.result;
					thisRef.successMsg = "success!";
				}

				Promise.resolve().then(()=>{
					thisRef.loading=false;
				});
			};

			this.loading=true;
			myWorker.postMessage(  {grammar: this.grammar, options:this.options });
		},
		downloadSourceCode() {
			let blob = new Blob([this.output.code], {
				type: "text/plain;charset=utf-8"
			});
			saveAs(blob, "parser.ts");
		}
	}
});
</script>

  <style>
.el-row {
    margin: 5px 0;
}

</style>