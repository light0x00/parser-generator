/* element-ui按需导入 */
import {Alert, Button, Select,Option ,Input,Row} from "element-ui";

export default {
	install(Vue) {
		Vue.component(Alert.name, Alert);
		Vue.component(Row.name, Row);
		Vue.component(Input.name, Input);
		Vue.component(Button.name, Button);
		Vue.component(Select.name,Select);
		Vue.component(Option.name,Option);
	}
};