var React=require("react");
var actions=require("./actions");

var E=React.createElement;
var styles={
	logo:{fontSize:"150%",textDecoration:"none"},
	tofind:{fontSize:"200%"}
}
var GlyphSearch=React.createClass({
	getInitialState:function() {
		return {successor:false,tofind:localStorage.getItem("z0y_tofind")||"木口"};
	}
	,dosearch:function(){
		actions.search(this.state.tofind,this.state.successor);
		localStorage.setItem("z0y_tofind",this.state.tofind);
	}
	,onchange:function(e){
		clearTimeout(this.timer);
		var tofind=e.target.value;
		this.setState({tofind:tofind});
		this.timer=setTimeout(function(){
			this.dosearch();
		}.bind(this),500);
	}
	,onkeypress:function(e) {
		if (e.key=="Enter") {
			this.dosearch();
		}
	}
	,toggleSuccessor:function(e) {
		this.setState({successor:e.target.checked},function(){
			this.dosearch();
		}.bind(this));
	}
	,componentDidMount:function() {
		var that=this;
		setTimeout(function(){
			that.refs.tofind.getDOMNode().focus();
		},500);
	}
	,render:function() {
		return E("div",{},
			E("a",{style:styles.logo,href:"https://github.com/g0v/z0y"},"零時字引"),
			E("input",{ref:"tofind",size:3,style:styles.tofind, value:this.state.tofind,
			  onChange:this.onchange,onKeyPress:this.onkeypress}),
			E("label",null,
				E("input",{type:"checkbox",onChange:this.toggleSuccessor,value:this.state.successor})
			,"深拆")
		);
	}
});
module.exports=GlyphSearch;