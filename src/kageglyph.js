var Kage=require("kage").Kage;
var Polygons=require("kage").Polygons;
var React=require("react");

var mockdata=require("./mockdata");
var glyphs=["u5361","u897f","u52a0","u6cb9"];

var pushmockdata=function(kage){
	for (var buhin in mockdata) {
		kage.kBuhin.push(buhin,mockdata[buhin]);
	}
}

var KageGlyph=React.createClass({
	propTypes:{
		glyph:React.PropTypes.string.isRequired
	}
	,render:function(){
		var kage = new Kage();
		kage.kUseCurve = true;
		var polygons = new Polygons();
		pushmockdata(kage);
		var glyph=glyphs[ Math.floor(Math.random()*glyphs.length)];
		kage.makeGlyph(polygons,  glyph);
    var svg=polygons.generateSVG(true);

      //viewBox="0 0 200 200" width="200" height="200"
    var opts={};
    opts.size=opts.size||32;
    svg=svg.replace('viewBox="0 0 200 200" width="200" height="200"',
      'background-color="transparent" viewBox="0 0 200 200" width="'+opts.size+'" height="'+opts.size+'"');
		return <span label={this.props.glyph} dangerouslySetInnerHTML={{__html:svg}}/>
	}
});

module.exports=KageGlyph;