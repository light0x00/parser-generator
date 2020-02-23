<template>
  <div>
    <div style="height:30px;position: absolute;z-index:1">
      <el-button circle class="el-icon-rank" @click="fit" />
      <el-button v-show="!isFullScreen" circle class="el-icon-full-screen" @click="fullScreen" />
      <el-button slot="download" circle class="el-icon-camera" @click="download" />
    </div>
    <div ref="networkElement" style="height:calc(100% - 30px);cursor: grab" />
  </div>
</template>
<script lang="js">
import Vue from "vue";
import { Network } from "vis-network";
import { saveAs } from "file-saver";

const OPTIONS = {
	edges: {
		font: {
			size: 14,
			background: "white"
		},
		arrows: { to: true },
		smooth: {
			type: "continuous"
		}
	},
	nodes: {
		shape: "box",
		margin: 10,
		widthConstraint: {
			maximum: 200
		},
		color: "#d3dce6",
		font: {
			align: "left"
		}
	},
	physics: {
		enabled: false
	}
};

export default Vue.extend({
	props: { value: { required: true }},
	data(){
		return {
			network: {},
			isFullScreen:false
		};
	},
	computed:{
		canvas(){
			return this.network.canvas.body.container.querySelector("canvas");
		}
	},
	watch:{
		value(n,o){
			this.network.setData(n);
			this.network.redraw();
		}
	},
	mounted() {
		this.network = new Network(this.$refs.networkElement,this.value,OPTIONS);
		this.$once("hook:destroyed",()=>{
			this.network.destroy();
		});
		// const thisRef = this;
		this.$el.addEventListener("fullscreenchange", (e)=>{
			// console.log(e,this,thisRef.webkitIsFullScreen,document.fullscreenElement);
			this.isFullScreen = document.fullscreenElement!=null;

		},false);

	},
	methods:{
		download(){
			this.canvas.toBlob(
				(blob)=> {saveAs(blob,  "LR-Automata.png");},
				"image/png",1
			);
		},
		fit(){
			this.network.fit(
				this.value.nodes.map(i=>i.id)
			);
		},
		async fullScreen(){
			this.isFullScreen=true;
			let ref = this;
			return new Promise((rs,rj)=>{
				ref.$el.requestFullscreen().then(
					(e)=>{
						//自适应
						setTimeout(() => {
							this.fit();
							rs();
						}, 1000);
					}
				);

			});

		}
	},
	destroy(){

	}
});
</script>