import Vue from "vue";
Vue.component("markdown", ()=>import(/* webpackPrefetch:true,webpackChunkName:'markdown' */"./markdown"));
Vue.component("network", ()=>import(/* webpackPrefetch:true,webpackChunkName:'network' */"./network"));
Vue.component("matrix-table", require("./matrix-table").default);
Vue.component("collapse", require("./collapse").default);

import { } from "@parser-generator/grammar-interpreter";