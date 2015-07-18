var React=require("react");
var store=require("./store");
var actions=require("./actions");
var Reflux=require("reflux");
var ucs2string=require("glyphemesearch").ucs2string;
var getutf32=require("glyphemesearch").getutf32;
var KageGlyph=require("./kageglyph");
var E=React.createElement;

var styles={candidates:{outline:0}};

var Candidates=React.createClass({
	mixins:[Reflux.listenTo(store,"onData")]
	,getInitialState:function(){
		return {candidates:[],joined:[]};
	}
	,joinCandidates:function(candidates) {
		var o=[];
		for (var i=0;i<candidates.length;i++) {
			var glyph=ucs2string(candidates[i]);
			if (this.useKage(glyph)){
				o.push(E(KageGlyph,{glyph:glyph}));
			} else {
				o.push(glyph);
			}
		}
		return o;
	}
	,useKage:function(glyph) {
		return getutf32({widestring:glyph})>0x2A700;
	}
	,onData:function(data) {
		this.setState({candidates:data,joined:this.joinCandidates(data)});
	}
	,isHighSurrogate:function(code) {
		return code>=0xD800 && code<=0xDBFF;
	}
	,getGlyphInfo:function(glyph) {
		this.props.action("selectglyph",glyph);
	}
	,onselect:function(e) {
		var sel=document.getSelection();
		var svglabel=sel.baseNode.parentNode.attributes["label"];
		if (svglabel) svglabel=svglabel.value;
		var selChar=svglabel||sel.baseNode.data;
		if (this.prevSelected) this.prevSelected.style.background="silver";
		e.target.style.background="yellow";
		this.prevSelected=e.target;
		this.getGlyphInfo(selChar);
	}
	,render:function() {
		return E("span",{ref:"candidates",
			onMouseUp:this.onselect,
			style:styles.candidates},this.state.joined);
	}
});
module.exports=Candidates;