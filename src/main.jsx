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
        E(GlyphSearch),
        E(GlyphInfo,{glyph:this.state.glyph}),
        E(Candidates,{action:this.action})
      )
  }
});
module.exports=maincomponent;