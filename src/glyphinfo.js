var React=require("react");
var getutf32=require("glyphemesearch").getutf32;
var E=React.createElement;
var styles={thechar:{fontSize:"300%"}};
var KageGlyph=require("./kageglyph");

var GlyphInfo=React.createClass({
	render:function() {
		var glyph=this.props.glyph;
		var utf32=getutf32({widestring:glyph});
		var codepoint=utf32.toString(16).toUpperCase();
		var unihan="http://www.unicode.org/cgi-bin/GetUnihanData.pl?codepoint="+codepoint;
		if (this.useKage(utf32)) glyph=<KageGlyph size={100} glyph={"u"+utf32.toString(16)}/> ;
		return E("div",{},
			E("a",{target:"_new",title:"Unihan",href:unihan},"U+"+codepoint),
			E("span",{style:styles.thechar},glyph));
	}
	,useKage:function(uni) {
		return uni>0x2A700;
	}
});
module.exports=GlyphInfo;