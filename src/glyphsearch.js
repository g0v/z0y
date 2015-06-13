var React=require("react");
var actions=require("./actions");

var E=React.createElement;
var styles={
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
	,render:function() {
		return E("div",{},
			E("input",{ size:3,style:styles.tofind, defaultValue:"木口",
			  onChange:this.onchange,onKeyPress:this.onkeypress})
		);
	}
});
module.exports=GlyphSearch;