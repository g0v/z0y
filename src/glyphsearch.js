var React=require("react");
var actions=require("./actions");

var E=React.createElement;
var styles={
	logo:{fontSize:"150%"},
	tofind:{fontSize:"200%"}
}
var GlyphSearch=React.createClass({
	onchange:function(e){
		clearTimeout(this.timer);
		var tofind=e.target.value;
		this.timer=setTimeout(function(){
			actions.search(tofind);
		},500);
	}
	,onkeypress:function(e) {
		if (e.key=="Enter") {
			actions.search(e.target.value);
		}
	}
	,componentDidMount:function() {
		var that=this;
		setTimeout(function(){
			that.refs.tofind.getDOMNode().focus();
		},500);
	}
	,render:function() {
		return E("div",{},
			E("span",{style:styles.logo},"零時字引"),
			E("input",{ref:"tofind",size:3,style:styles.tofind, defaultValue:"弗2",
			  onChange:this.onchange,onKeyPress:this.onkeypress})
		);
	}
});
module.exports=GlyphSearch;