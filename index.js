var React=require("react");
if(window.location.origin.indexOf("//127.0.0.1")>-1) {
	require("ksana2015-webruntime/livereload")(); 
}
var ksanagap=require("ksana2015-webruntime/ksanagap");
ksanagap.boot("z0y",function(){
	var Main=React.createElement(require("./src/main"));
	ksana.mainComponent=React.render(Main,document.getElementById("main"));
});