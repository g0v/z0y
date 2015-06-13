var React=require("react");
var store=require("./store");
var actions=require("./actions");
var Reflux=require("reflux");
var ucs2string=require("glyphemesearch").ucs2string;
var E=React.createElement;

var styles={candidates:{outline:0}};

var Candidates=React.createClass({
	mixins:[Reflux.listenTo(store,"onData")]
	,getInitialState:function(){
		return {candidates:[],joined:""};
	}
	,joinCandidates:function(candidates) {
		var o="";
		for (var i=0;i<candidates.length;i++) {
			o+=ucs2string(candidates[i]);
		}
		return o;
	}
	,onData:function(data) {
		this.setState({candidates:data,joined:this.joinCandidates(data)});
	}
	,preventdefault:function(e) {
		e.preventDefault();
	}
	,onkeydown:function(e) {
		if ([8,46].indexOf(e.keyCode)>-1) this.preventdefault(e);
	}
	,isHighSurrogate:function(code) {
		return code>=0xD800 && code<=0xDBFF;
	}
	,getGlyphInfo:function(glyph) {
		this.props.action("selectglyph",glyph);
	}
	,onselect:function(e) {
		var sel=document.getSelection();
		var off=sel.focusOffset;
		if (off<0||off>=this.state.joined.length) return;
		var bytes=1;
		if (this.isHighSurrogate(this.state.joined.charCodeAt(off))) bytes++;

		//select a char for easy copy to clipboard
		var range = document.createRange();
		range.setStart(sel.focusNode, off);
		range.setEnd(sel.focusNode, off+bytes);
		sel.removeAllRanges();
		sel.addRange(range);

		var selChar=this.state.joined.substr(off,bytes);
		this.getGlyphInfo(selChar);
	}
	,componentDidMount:function() {
		//set contentEditable after mount,to prevent React warning
		this.refs.candidates.getDOMNode().contentEditable=true;
	}
	,render:function() {
		return E("div",{ref:"candidates",
			onKeyPress:this.preventdefault,
			onPaste:this.preventdefault,
			onKeyDown:this.onkeydown,
			onMouseUp:this.onselect,
			style:styles.candidates},this.state.joined);
	}
});
module.exports=Candidates;