var Reflux=require("reflux");
var actions=require("./actions");
var glyphemesearch=require("./glyphemesearch");

var store=Reflux.createStore({
	listenables:actions
	,onSearch:function(glypheme) {
		//console.log("toggle",itemidx);
		
		this.trigger(glyphemesearch(glypheme));
	}
});

module.exports=store;