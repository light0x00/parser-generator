<template>
  <div>
    <div style="height:30px;position: absolute;z-index:1">
      <el-button circle class="el-icon-rank" @click="fit" />
      <el-button
        v-show="!isFullScreen"
        circle
        class="el-icon-full-screen"
        @click="fullScreen"
      />
      <el-button slot="download" circle class="el-icon-camera" @click="download" />
    </div>
    <div style="display:flex;height:100%">
      <div ref="networkCanvas" :style="{'width': isFullScreen?'100%':'calc(100% - 10px)','height':'100%','cursor':'pointer'}" />
      <!-- <div v-show="!isFullScreen" ref="networkOptions" style=";width:200px"></div> -->
    </div>
  </div>
</template>
<script lang="js">
import Vue from "vue";
import { Network } from "vis-network";
import { saveAs } from "file-saver";

const HIGH_C="#F56C6C";
const HIGH_BG="#F2F6FC";

const OPTIONS = {
	edges: {
		font: {
			size: 12,
			background: "white",
			color:"#303133",
		},
		arrows: { to: true },
		smooth: {
			type: "continuous"
		},
		color:{
			color:"#d3dce6",
			highlight: HIGH_C
		}
	},
	nodes: {
		font: {
			size: 14,
			color:"#303133",
			align: "left"
		},
		shape: "box",
		margin: 10,
		widthConstraint: {
			maximum: 200
		},
		color: {
			background:"#d3dce6",
			border: "#99a9bf",
			highlight: {
				border : HIGH_C,
				background:HIGH_BG },
		},
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
		//数据改变时重绘
		value(n,o){
			/* vis-network 的 redraw 有bug */
			// this.network.setData(n);
			// this.network.redraw();
			this.network.destroy();
			this.render();
		}
	},
	mounted() {
		//绘制
		this.render();
		//全屏状态跟踪
		this.$el.addEventListener("fullscreenchange", (e)=>{
			this.isFullScreen = document.fullscreenElement!=null;
		},false);
	},
	methods:{
		render(){
			this.network = new Network(this.$refs.networkCanvas,this.value,{ ...OPTIONS ,
				// configure: {
				// 	container: this.$refs.networkOptions
				// }
			});
			this.$once("hook:destroyed",()=>{
				this.network.destroy();
			});
		},
		download(){
			this.canvas.toBlob(
				(blob)=> {saveAs(blob,  "LR-Automata.png");},
				"image/png",1
			);
		},
		//自适应
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
						}, 600);
					}
				);

			});

		}
	},
	destroy(){

	}
});
</script>