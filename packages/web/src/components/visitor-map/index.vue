<template>
  <div ref="visitor-map">
  </div>
</template>

<script>
import jsURL from "./blobe.js.txt";

export default {
	mounted(){
		let el_script = document.createElement("script");
		el_script.src= jsURL+"?d=neFy1PsSaDDGktlpICl2v-yDYh33-OHzrRLLKVm4eCs";
		el_script.id= "clstr_globe";
		el_script.type="text/javascript";
		this.$refs["visitor-map"].appendChild(el_script);
	}
};
</script>

<style>

</style>