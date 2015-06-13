var React=require("react");
var getutf32=require("glyphemesearch").getutf32;
var E=React.createElement;

var GlyphInfo=React.createClass({
	render:function() {
		var c="U+"+getutf32({widestring:this.props.glyph}).toString(16).toUpperCase();
		return E("div",{},c);
	}
});
module.exports=GlyphInfo;