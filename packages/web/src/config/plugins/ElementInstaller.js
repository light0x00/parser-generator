/* element-ui按需导入 */
import {Alert, Button, Select,Option ,Input,Row ,Loading} from "element-ui";
import(/* webpackPrefetch:true,webpackChunkName:'ui-font' */ "element-ui/lib/theme-chalk/base");/* element 字体文件不必加载的过早 */
export default {
	install(Vue) {
		Vue.component(Alert.name, Alert);
		Vue.component(Row.name, Row);
		Vue.component(Input.name, Input);
		Vue.component(Button.name, Button);
		Vue.component(Select.name,Select);
		Vue.component(Option.name,Option);
		Vue.use(Loading.directive);
	}
};