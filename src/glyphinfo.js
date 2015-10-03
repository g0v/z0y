var React=require("react");
var getutf32=require("glyphemesearch").getutf32;
var E=React.createElement;
var styles={thechar:{fontSize:"300%"}};
var KageGlyph=require("./kageglyph");
var style={textDecoration:"none"};
var useKage=require("./usekage");
var planeFromCodePoint=function(cp) {
	if (cp>=0x3400 && cp<0x4e00) return "Ext A";
	if (cp>=0x4e00 && cp<0x9FFF) return "Basic Multilingual Plane";
	if (cp>=0x20000 && cp<=0x2A6DF) return "Ext B";
	if (cp>=0x2A700 && cp<=0x2B73F) return "Ext C"; //2A700–2B73F
	if (cp>=0x2B740 && cp<=0x2B81F) return "Ext D";//2B740–2B81F
	if (cp>=0x2B820 && cp<=0x2CEAF) return "Ext E";//2B820–2CEAF
	return "";
}
var GlyphInfo=React.createClass({
	render:function() {
		var glyph=this.props.glyph;
		var utf32=getutf32({widestring:glyph});
		var codepoint=utf32.toString(16).toUpperCase();
		var unihan="http://www.unicode.org/cgi-bin/GetUnihanData.pl?codepoint="+codepoint;
		var xiaoxue="http://xiaoxue.iis.sinica.edu.tw/?char="+glyph;
		var plane=planeFromCodePoint(utf32);
		if (useKage(utf32)) glyph=E(KageGlyph,{size:100,glyph:"u"+utf32.toString(16)}) ;
		return E("div",{},
			E("a",{target:"_new",style:style,title:"Unihan",href:unihan},"U+"+codepoint),
			E("span",{style:styles.thechar}, 
				E("a",{target:"_new",style:style,title:"小學堂",href:xiaoxue},glyph)),
			E("span",null, plane)
			);
	}
});
module.exports=GlyphInfo;