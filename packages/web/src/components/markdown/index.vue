<template>
  <div class="markdown-body" v-html="mdContent" />
</template>

<script>
import marked from "./marked";
export default {
	name:"markdown",
	props:["content"],
	data:function(){
		return {
		};
	},
	computed:{
		mdContent(){
			return  marked(this.content);
		}
	},
	mounted(){
	}
};
</script>

<style>

</style>