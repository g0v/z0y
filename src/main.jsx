var React=require("react");
var GlyphSearch=require("./glyphsearch");
var GlyphInfo=require("./glyphinfo");
var Candidates=require("./candidates");
var E=React.createElement;

var maincomponent = React.createClass({
  getInitialState:function() {
    return {};
  },
  render: function() {
    return E("div",{},
        E("h1",{},"零時字引"),
        E(GlyphSearch),
        E(Candidates),
        E(GlyphInfo)
      )
  }
});
module.exports=maincomponent;