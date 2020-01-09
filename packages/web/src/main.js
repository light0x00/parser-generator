import "~/styles/index.css";
import "~/config/plugins";
import "~/components";
import Vue from "vue";
import App from "~/app.vue";
import router from "~/config/router";

new Vue({
	el: "#app",
	render: (h) => h(App),
	router
});