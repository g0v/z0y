var fs=require('fs');
var sep=require('path').sep;
var file=process.cwd()+sep+'bundle.js';

var watchFiles=function() {
  fs.watchFile(file, function (f1, f2) {
    if (f1.mtime.toString()!=f2.mtime.toString()) reload();
  });
}
var unwatchFiles=function() {
  fs.unwatchFile(file);
}
var reload=function(){
  var gui = global.window.nwDispatcher.requireNwGui();
  var win = gui.Window.get();
  gui.App.clearCache();
  win.reload();
}

// nodemain.js // this java script must be load by inject-script-start in package.json*/
if (typeof process !="undefined") {			// checking if node.js is running
	nodeRequire=require;			// browser side package will overwrite require
	if (process.versions["node-webkit"]) {	// checking if nw is running
		var gui = global.window.nwDispatcher.requireNwGui();
		gui.Window.get().on('close', function(){
		   unwatchFiles();
		   gui.App.quit();
		});
		watchFiles();
		
	}
}