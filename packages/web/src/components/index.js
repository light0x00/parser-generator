import Vue from "vue";
Vue.component("markdown", ()=>import(/* webpackChunkName:'markdown' */"./markdown"));
Vue.component("network", ()=>import(/* webpackChunkName:'network' */"./network"));
Vue.component("matrix-table", require("./matrix-table").default);
Vue.component("collapse", require("./collapse").default);

import { } from "@parser-generator/grammar-interpreter";