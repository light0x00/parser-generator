import {Network} from "vis-network";

var x = JSON.parse(document.getElementById("automataJson").innerHTML);
var container = document.getElementById("mynetwork");
var data = {
	nodes: x.nodes,
	edges: x.edges
};
var options = {
	edges: {
		font: {
			size: 14,
			background: "white",
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
			align: "left",
		}
	},
	physics: {
		enabled: false
	}
};
var network = new Network(container, data, options);
