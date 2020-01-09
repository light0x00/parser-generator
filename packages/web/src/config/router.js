import VueRouter from "vue-router";
import Vue from "vue";
Vue.use(VueRouter);

const router = new VueRouter({
	routes: [
		{
			path: "/",
			component: require("~/views").default,
			children: [
				{
					path: "*",
					component: () => import(/* webpackPrefetch:true,webpackChunkName:'tools' */"~/views/tools"),
				}
			]
		}
	],
	mode: "history"
});

export default router;