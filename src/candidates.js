var React=require("react");
var store=require("./store");
var actions=require("./actions");
var Reflux=require("reflux");
var ucs2string=require("glyphemesearch").ucs2string;
var E=React.createElement;

var styles={candidate:{fontSize:"150%"}};

var Candidates=React.createClass({
	mixins:[Reflux.listenTo(store,"onData")]
	,getInitialState:function(){
		return {candidates:[]};
	}
	,getGlyphInfo:function(e) {
		this.props.action("selectglyph",e.target.innerHTML);
	}
	,renderItem:function(item,idx) {
		return <button style={styles.candidate} 
				onClick={this.getGlyphInfo}>{ucs2string(item)}</button>
	}
	,onData:function(data) {
		this.setState({candidates:data});
	}
	,render:function() {
		return E("div",{},this.state.candidates.map(this.renderItem));
	}
});
module.exports=Candidates;