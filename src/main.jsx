var React=require("react");
var GlyphSearch=require("./glyphsearch");
var GlyphInfo=require("./glyphinfo");
var Candidates=require("./candidates");
var E=React.createElement;

var maincomponent = React.createClass({
  getInitialState:function() {
    return {glyph:""};
  },
  action:function(act,p1,p2) {
    if (act=="selectglyph") {
      this.setState({glyph:p1});
    }
  },
  render: function() {
    return E("div",{},
        E("h1",{},"零時字引"),
        E(GlyphSearch),
        E(Candidates,{action:this.action}),
        E(GlyphInfo,{glyph:this.state.glyph})
      )
  }
});
module.exports=maincomponent;