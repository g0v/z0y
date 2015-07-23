var Kage=require("kage").Kage;
var Polygons=require("kage").Polygons;
var React=require("react");
var E=React.createElement;
//var mockdata=require("./mockdata");
//var glyphs=["u5361","u897f","u52a0","u6cb9"];
var kage = new Kage();
kage.kUseCurve = true;
var loadBuhins=function(fromserver){
	for (var buhin in fromserver) {
		kage.kBuhin.push(buhin,fromserver[buhin]);
	}
}
//loadBuhins(mockdata);

var KageGlyph=React.createClass({
	propTypes:{
		glyph:React.PropTypes.string.isRequired
		,size:React.PropTypes.number
	}
	,render:function(){
		var polygons = new Polygons();
		var glyph=this.props.glyph;
		//glyph="u2b101"
		kage.makeGlyph(polygons, glyph);
    var svg=polygons.generateSVG(true);

      //viewBox="0 0 200 200" width="200" height="200"
    size=this.props.size||32;
    svg=svg.replace('viewBox="0 0 200 200" width="200" height="200"',
      'background-color="transparent" viewBox="0 0 200 200" width="'+size+'" height="'+size+'"');
		return E("span",{label:this.props.glyph, dangerouslySetInnerHTML:{__html:svg}});
	}
});
KageGlyph.loadBuhins=loadBuhins;
module.exports=KageGlyph;