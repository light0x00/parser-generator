import vis from "vis-network";

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
		widthConstraint: {
			// maximum: 90
		},
		arrows: { to: true },
		smooth: {
			type: "continuous"
			// "type": "discrete",
			// "forceDirection": "none",
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
			// size:'16'
		}
	},
	physics: {
		enabled: false
	}
};
var network = new vis.Network(container, data, options);
