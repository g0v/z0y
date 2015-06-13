var React=require("react");
var store=require("./store");
var Reflux=require("reflux");
var E=React.createElement;

var Candidates=React.createClass({
	mixins:[Reflux.listenTo(store,"onData")]
	,getInitialState:function(){
		return {candidates:[]};
	}
	,onData:function(data) {
		this.setState({candidates:data});
	}
	,render:function() {
		return E("div",{},this.state.candidates);
	}
});
module.exports=Candidates;