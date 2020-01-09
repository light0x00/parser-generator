import marked from "marked";
import "highlight.js/styles/github.css";
import hljs from "highlight.js/lib/highlight";

/* 高亮 */
// hljs.registerLanguage("xml", require(`highlight.js/lib/languages/xml`));
hljs.registerLanguage("javascript", require(`highlight.js/lib/languages/javascript`));
// hljs.registerLanguage("java", require(`highlight.js/lib/languages/java`));
// hljs.registerLanguage("json", require(`highlight.js/lib/languages/json`));
// hljs.registerLanguage("bash", require(`highlight.js/lib/languages/bash`));
// hljs.registerLanguage("sql", require(`highlight.js/lib/languages/sql`));
hljs.registerLanguage("typescript", require(`highlight.js/lib/languages/typescript`));

marked.setOptions({
	highlight: function (code) {
		return hljs.highlightAuto(code).value;
	},
	pedantic: false,
	gfm: true,
	breaks: false,
	sanitize: false,
	smartLists: true,
	smartypants: false,
	xhtml: false
});

export default marked;