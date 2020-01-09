import marked from "./marked";

self.addEventListener("message", function (e) {
	self.postMessage(marked(e.data));
}, false);