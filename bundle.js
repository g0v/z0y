(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\downloader.js":[function(require,module,exports){

var userCancel=false;
var files=[];
var totalDownloadByte=0;
var targetPath="";
var tempPath="";
var nfile=0;
var baseurl="";
var result="";
var downloading=false;
var startDownload=function(dbid,_baseurl,_files) { //return download id
	var fs     = require("fs");
	var path   = require("path");

	
	files=_files.split("\uffff");
	if (downloading) return false; //only one session
	userCancel=false;
	totalDownloadByte=0;
	nextFile();
	downloading=true;
	baseurl=_baseurl;
	if (baseurl[baseurl.length-1]!='/')baseurl+='/';
	targetPath=ksanagap.rootPath+dbid+'/';
	tempPath=ksanagap.rootPath+".tmp/";
	result="";
	return true;
}

var nextFile=function() {
	setTimeout(function(){
		if (nfile==files.length) {
			nfile++;
			endDownload();
		} else {
			downloadFile(nfile++);	
		}
	},100);
}

var downloadFile=function(nfile) {
	var url=baseurl+files[nfile];
	var tmpfilename=tempPath+files[nfile];
	var mkdirp = require("./mkdirp");
	var fs     = require("fs");
	var http   = require("http");

	mkdirp.sync(path.dirname(tmpfilename));
	var writeStream = fs.createWriteStream(tmpfilename);
	var datalength=0;
	var request = http.get(url, function(response) {
		response.on('data',function(chunk){
			writeStream.write(chunk);
			totalDownloadByte+=chunk.length;
			if (userCancel) {
				writeStream.end();
				setTimeout(function(){nextFile();},100);
			}
		});
		response.on("end",function() {
			writeStream.end();
			setTimeout(function(){nextFile();},100);
		});
	});
}

var cancelDownload=function() {
	userCancel=true;
	endDownload();
}
var verify=function() {
	return true;
}
var endDownload=function() {
	nfile=files.length+1;//stop
	result="cancelled";
	downloading=false;
	if (userCancel) return;
	var fs     = require("fs");
	var mkdirp = require("./mkdirp");

	for (var i=0;i<files.length;i++) {
		var targetfilename=targetPath+files[i];
		var tmpfilename   =tempPath+files[i];
		mkdirp.sync(path.dirname(targetfilename));
		fs.renameSync(tmpfilename,targetfilename);
	}
	if (verify()) {
		result="success";
	} else {
		result="error";
	}
}

var downloadedByte=function() {
	return totalDownloadByte;
}
var doneDownload=function() {
	if (nfile>files.length) return result;
	else return "";
}
var downloadingFile=function() {
	return nfile-1;
}

var downloader={startDownload:startDownload, downloadedByte:downloadedByte,
	downloadingFile:downloadingFile, cancelDownload:cancelDownload,doneDownload:doneDownload};
module.exports=downloader;
},{"./mkdirp":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\mkdirp.js","fs":false,"http":false,"path":false}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\html5fs.js":[function(require,module,exports){
/* emulate filesystem on html5 browser */
var get_head=function(url,field,cb){
	var xhr = new XMLHttpRequest();
	xhr.open("HEAD", url, true);
	xhr.onreadystatechange = function() {
			if (this.readyState == this.DONE) {
				cb(xhr.getResponseHeader(field));
			} else {
				if (this.status!==200&&this.status!==206) {
					cb("");
				}
			}
	};
	xhr.send();
}
var get_date=function(url,cb) {
	get_head(url,"Last-Modified",function(value){
		cb(value);
	});
}
var get_size=function(url, cb) {
	get_head(url,"Content-Length",function(value){
		cb(parseInt(value));
	});
};
var checkUpdate=function(url,fn,cb) {
	if (!url) {
		cb(false);
		return;
	}
	get_date(url,function(d){
		API.fs.root.getFile(fn, {create: false, exclusive: false}, function(fileEntry) {
			fileEntry.getMetadata(function(metadata){
				var localDate=Date.parse(metadata.modificationTime);
				var urlDate=Date.parse(d);
				cb(urlDate>localDate);
			});
		},function(){
			cb(false);
		});
	});
}
var download=function(url,fn,cb,statuscb,context) {
	 var totalsize=0,batches=null,written=0;
	 var fileEntry=0, fileWriter=0;
	 var createBatches=function(size) {
		var bytes=1024*1024, out=[];
		var b=Math.floor(size / bytes);
		var last=size %bytes;
		for (var i=0;i<=b;i++) {
			out.push(i*bytes);
		}
		out.push(b*bytes+last);
		return out;
	 }
	 var finish=function() {
		 rm(fn,function(){
				fileEntry.moveTo(fileEntry.filesystem.root, fn,function(){
					setTimeout( cb.bind(context,false) , 0) ;
				},function(e){
					console.log("failed",e)
				});
		 },this);
	 };
		var tempfn="temp.kdb";
		var batch=function(b) {
		var abort=false;
		var xhr = new XMLHttpRequest();
		var requesturl=url+"?"+Math.random();
		xhr.open('get', requesturl, true);
		xhr.setRequestHeader('Range', 'bytes='+batches[b]+'-'+(batches[b+1]-1));
		xhr.responseType = 'blob';
		xhr.addEventListener('load', function() {
			var blob=this.response;
			fileEntry.createWriter(function(fileWriter) {
				fileWriter.seek(fileWriter.length);
				fileWriter.write(blob);
				written+=blob.size;
				fileWriter.onwriteend = function(e) {
					if (statuscb) {
						abort=statuscb.apply(context,[ fileWriter.length / totalsize,totalsize ]);
						if (abort) setTimeout( cb.bind(context,false) , 0) ;
				 	}
					b++;
					if (!abort) {
						if (b<batches.length-1) setTimeout(batch.bind(context,b),0);
						else                    finish();
				 	}
			 	};
			}, console.error);
		},false);
		xhr.send();
	}

	get_size(url,function(size){
		totalsize=size;
		if (!size) {
			if (cb) cb.apply(context,[false]);
		} else {//ready to download
			rm(tempfn,function(){
				 batches=createBatches(size);
				 if (statuscb) statuscb.apply(context,[ 0, totalsize ]);
				 API.fs.root.getFile(tempfn, {create: 1, exclusive: false}, function(_fileEntry) {
							fileEntry=_fileEntry;
						batch(0);
				 });
			},this);
		}
	});
}

var readFile=function(filename,cb,context) {
	API.fs.root.getFile(filename, {create: false, exclusive: false},function(fileEntry) {
		fileEntry.file(function(file){
			var reader = new FileReader();
			reader.onloadend = function(e) {
				if (cb) cb.call(cb,this.result);
			};
			reader.readAsText(file,"utf8");
		});
	}, console.error);
}

function createDir(rootDirEntry, folders,  cb) {
  // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
  if (folders[0] == '.' || folders[0] == '') {
    folders = folders.slice(1);
  }
  rootDirEntry.getDirectory(folders[0], {create: true}, function(dirEntry) {
    // Recursively add the new subfolder (if we still have another to create).
    if (folders.length) {
      createDir(dirEntry, folders.slice(1),cb);
    } else {
			cb();
		}
  }, cb);
};


var writeFile=function(filename,buf,cb,context){
	var write=function(fileEntry){
		fileEntry.createWriter(function(fileWriter) {
			fileWriter.write(buf);
			fileWriter.onwriteend = function(e) {
				if (cb) cb.apply(cb,[buf.byteLength]);
			};
		}, console.error);
	}

	var getFile=function(filename){
		API.fs.root.getFile(filename, {exclusive:true}, function(fileEntry) {
			write(fileEntry);
		}, function(){
				API.fs.root.getFile(filename, {create:true,exclusive:true}, function(fileEntry) {
					write(fileEntry);
				});

		});
	}
	var slash=filename.lastIndexOf("/");
	if (slash>-1) {
		createDir(API.fs.root, filename.substr(0,slash).split("/"),function(){
			getFile(filename);
		});
	} else {
		getFile(filename);
	}
}

var readdir=function(cb,context) {
	var dirReader = API.fs.root.createReader();
	var out=[],that=this;
	dirReader.readEntries(function(entries) {
		if (entries.length) {
			for (var i = 0, entry; entry = entries[i]; ++i) {
				if (entry.isFile) {
					out.push([entry.name,entry.toURL ? entry.toURL() : entry.toURI()]);
				}
			}
		}
		API.files=out;
		if (cb) cb.apply(context,[out]);
	}, function(){
		if (cb) cb.apply(context,[null]);
	});
}
var getFileURL=function(filename) {
	if (!API.files ) return null;
	var file= API.files.filter(function(f){return f[0]==filename});
	if (file.length) return file[0][1];
}
var rm=function(filename,cb,context) {
	var url=getFileURL(filename);
	if (url) rmURL(url,cb,context);
	else if (cb) cb.apply(context,[false]);
}

var rmURL=function(filename,cb,context) {
	webkitResolveLocalFileSystemURL(filename, function(fileEntry) {
		fileEntry.remove(function() {
			if (cb) cb.apply(context,[true]);
		}, console.error);
	},  function(e){
		if (cb) cb.apply(context,[false]);//no such file
	});
}
function errorHandler(e) {
	console.error('Error: ' +e.name+ " "+e.message);
}
var initfs=function(grantedBytes,cb,context) {
	webkitRequestFileSystem(PERSISTENT, grantedBytes,  function(fs) {
		API.fs=fs;
		API.quota=grantedBytes;
		readdir(function(){
			API.initialized=true;
			cb.apply(context,[grantedBytes,fs]);
		},context);
	}, errorHandler);
}
var init=function(quota,cb,context) {
	navigator.webkitPersistentStorage.requestQuota(quota,
			function(grantedBytes) {
				initfs(grantedBytes,cb,context);
		}, errorHandler
	);
}
var queryQuota=function(cb,context) {
	var that=this;
	navigator.webkitPersistentStorage.queryUsageAndQuota(
	 function(usage,quota){
			initfs(quota,function(){
				cb.apply(context,[usage,quota]);
			},context);
	});
}
var API={
	init:init
	,readdir:readdir
	,checkUpdate:checkUpdate
	,rm:rm
	,rmURL:rmURL
	,getFileURL:getFileURL
	,writeFile:writeFile
	,readFile:readFile
	,download:download
	,get_head:get_head
	,get_date:get_date
	,get_size:get_size
	,getDownloadSize:get_size
	,queryQuota:queryQuota
}
module.exports=API;

},{}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\ksanagap.js":[function(require,module,exports){
var appname="installer";
if (typeof ksana=="undefined") {
	window.ksana={platform:"chrome"};
	if (typeof process!=="undefined" && 
		process.versions && process.versions["node-webkit"]) {
		window.ksana.platform="node-webkit";
	}
}
var switchApp=function(path) {
	var fs=require("fs");
	path="../"+path;
	appname=path;
	document.location.href= path+"/index.html"; 
	process.chdir(path);
}
var downloader={};
var rootPath="";

var deleteApp=function(app) {
	console.error("not allow on PC, do it in File Explorer/ Finder");
}
var username=function() {
	return "";
}
var useremail=function() {
	return ""
}
var runtime_version=function() {
	return "1.4";
}

//copy from liveupdate
var jsonp=function(url,dbid,callback,context) {
  var script=document.getElementById("jsonp2");
  if (script) {
    script.parentNode.removeChild(script);
  }
  window.jsonp_handler=function(data) {
    if (typeof data=="object") {
      data.dbid=dbid;
      callback.apply(context,[data]);    
    }  
  }
  window.jsonp_error_handler=function() {
    console.error("url unreachable",url);
    callback.apply(context,[null]);
  }
  script=document.createElement('script');
  script.setAttribute('id', "jsonp2");
  script.setAttribute('onerror', "jsonp_error_handler()");
  url=url+'?'+(new Date().getTime());
  script.setAttribute('src', url);
  document.getElementsByTagName('head')[0].appendChild(script); 
}


var loadKsanajs=function(){

	if (typeof process!="undefined" && !process.browser) {
		var ksanajs=require("fs").readFileSync("./ksana.js","utf8").trim();
		downloader=require("./downloader");
		ksana.js=JSON.parse(ksanajs.substring(14,ksanajs.length-1));
		rootPath=process.cwd();
		rootPath=require("path").resolve(rootPath,"..").replace(/\\/g,"/")+'/';
		ksana.ready=true;
	} else{
		var url=window.location.origin+window.location.pathname.replace("index.html","")+"ksana.js";
		jsonp(url,appname,function(data){
			ksana.js=data;
			ksana.ready=true;
		});
	}
}

loadKsanajs();

var boot=function(appId,cb) {
	if (typeof appId=="function") {
		cb=appId;
		appId="unknownapp";
	}
	if (!ksana.js && ksana.platform=="node-webkit") {
		loadKsanajs();
	}
	ksana.appId=appId;
	var timer=setInterval(function(){
			if (ksana.ready){
				clearInterval(timer);
				cb();
			}
		});
}


var ksanagap={
	platform:"node-webkit",
	startDownload:downloader.startDownload,
	downloadedByte:downloader.downloadedByte,
	downloadingFile:downloader.downloadingFile,
	cancelDownload:downloader.cancelDownload,
	doneDownload:downloader.doneDownload,
	switchApp:switchApp,
	rootPath:rootPath,
	deleteApp: deleteApp,
	username:username, //not support on PC
	useremail:username,
	runtime_version:runtime_version,
	boot:boot
}
module.exports=ksanagap;
},{"./downloader":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\downloader.js","fs":false,"path":false}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\livereload.js":[function(require,module,exports){
var started=false;
var timer=null;
var bundledate=null;
var get_date=require("./html5fs").get_date;
var checkIfBundleUpdated=function() {
	get_date("bundle.js",function(date){
		if (bundledate &&bundledate!=date){
			location.reload();
		}
		bundledate=date;
	});
}
var livereload=function() {
	if (started) return;

	timer1=setInterval(function(){
		checkIfBundleUpdated();
	},2000);
	started=true;
}

module.exports=livereload;
},{"./html5fs":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\html5fs.js"}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\mkdirp.js":[function(require,module,exports){
function mkdirP (p, mode, f, made) {
     var path = nodeRequire('path');
     var fs = nodeRequire('fs');
	
    if (typeof mode === 'function' || mode === undefined) {
        f = mode;
        mode = 0x1FF & (~process.umask());
    }
    if (!made) made = null;

    var cb = f || function () {};
    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);

    fs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                mkdirP(path.dirname(p), mode, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirP(p, mode, cb, made);
                });
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                fs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

mkdirP.sync = function sync (p, mode, made) {
    var path = nodeRequire('path');
    var fs = nodeRequire('fs');
    if (mode === undefined) {
        mode = 0x1FF & (~process.umask());
    }
    if (!made) made = null;

    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);

    try {
        fs.mkdirSync(p, mode);
        made = made || p;
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                made = sync(path.dirname(p), mode, made);
                sync(p, mode, made);
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                var stat;
                try {
                    stat = fs.statSync(p);
                }
                catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) throw err0;
                break;
        }
    }

    return made;
};

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

},{}],"C:\\ksana2015\\node_modules\\reflux\\index.js":[function(require,module,exports){
module.exports = require('./src');

},{"./src":"C:\\ksana2015\\node_modules\\reflux\\src\\index.js"}],"C:\\ksana2015\\node_modules\\reflux\\node_modules\\eventemitter3\\index.js":[function(require,module,exports){
'use strict';

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} once Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Holds the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  if (!this._events || !this._events[event]) return [];
  if (this._events[event].fn) return [this._events[event].fn];

  for (var i = 0, l = this._events[event].length, ee = new Array(l); i < l; i++) {
    ee[i] = this._events[event][i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  if (!this._events || !this._events[event]) return false;

  var listeners = this._events[event]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this);

  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = listener;
  else {
    if (!this._events[event].fn) this._events[event].push(listener);
    else this._events[event] = [
      this._events[event], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true);

  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = listener;
  else {
    if (!this._events[event].fn) this._events[event].push(listener);
    else this._events[event] = [
      this._events[event], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, once) {
  if (!this._events || !this._events[event]) return this;

  var listeners = this._events[event]
    , events = [];

  if (fn) {
    if (listeners.fn && (listeners.fn !== fn || (once && !listeners.once))) {
      events.push(listeners);
    }
    if (!listeners.fn) for (var i = 0, length = listeners.length; i < length; i++) {
      if (listeners[i].fn !== fn || (once && !listeners[i].once)) {
        events.push(listeners[i]);
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[event] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[event];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[event];
  else this._events = {};

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the module.
//
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.EventEmitter2 = EventEmitter;
EventEmitter.EventEmitter3 = EventEmitter;

//
// Expose the module.
//
module.exports = EventEmitter;

},{}],"C:\\ksana2015\\node_modules\\reflux\\node_modules\\native-promise-only\\npo.js":[function(require,module,exports){
/*! Native Promise Only
    v0.7.6-a (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/
!function(t,n,e){n[t]=n[t]||e(),"undefined"!=typeof module&&module.exports?module.exports=n[t]:"function"==typeof define&&define.amd&&define(function(){return n[t]})}("Promise","undefined"!=typeof global?global:this,function(){"use strict";function t(t,n){l.add(t,n),h||(h=y(l.drain))}function n(t){var n,e=typeof t;return null==t||"object"!=e&&"function"!=e||(n=t.then),"function"==typeof n?n:!1}function e(){for(var t=0;t<this.chain.length;t++)o(this,1===this.state?this.chain[t].success:this.chain[t].failure,this.chain[t]);this.chain.length=0}function o(t,e,o){var r,i;try{e===!1?o.reject(t.msg):(r=e===!0?t.msg:e.call(void 0,t.msg),r===o.promise?o.reject(TypeError("Promise-chain cycle")):(i=n(r))?i.call(r,o.resolve,o.reject):o.resolve(r))}catch(c){o.reject(c)}}function r(o){var c,u,a=this;if(!a.triggered){a.triggered=!0,a.def&&(a=a.def);try{(c=n(o))?(u=new f(a),c.call(o,function(){r.apply(u,arguments)},function(){i.apply(u,arguments)})):(a.msg=o,a.state=1,a.chain.length>0&&t(e,a))}catch(s){i.call(u||new f(a),s)}}}function i(n){var o=this;o.triggered||(o.triggered=!0,o.def&&(o=o.def),o.msg=n,o.state=2,o.chain.length>0&&t(e,o))}function c(t,n,e,o){for(var r=0;r<n.length;r++)!function(r){t.resolve(n[r]).then(function(t){e(r,t)},o)}(r)}function f(t){this.def=t,this.triggered=!1}function u(t){this.promise=t,this.state=0,this.triggered=!1,this.chain=[],this.msg=void 0}function a(n){if("function"!=typeof n)throw TypeError("Not a function");if(0!==this.__NPO__)throw TypeError("Not a promise");this.__NPO__=1;var o=new u(this);this.then=function(n,r){var i={success:"function"==typeof n?n:!0,failure:"function"==typeof r?r:!1};return i.promise=new this.constructor(function(t,n){if("function"!=typeof t||"function"!=typeof n)throw TypeError("Not a function");i.resolve=t,i.reject=n}),o.chain.push(i),0!==o.state&&t(e,o),i.promise},this["catch"]=function(t){return this.then(void 0,t)};try{n.call(void 0,function(t){r.call(o,t)},function(t){i.call(o,t)})}catch(c){i.call(o,c)}}var s,h,l,p=Object.prototype.toString,y="undefined"!=typeof setImmediate?function(t){return setImmediate(t)}:setTimeout;try{Object.defineProperty({},"x",{}),s=function(t,n,e,o){return Object.defineProperty(t,n,{value:e,writable:!0,configurable:o!==!1})}}catch(d){s=function(t,n,e){return t[n]=e,t}}l=function(){function t(t,n){this.fn=t,this.self=n,this.next=void 0}var n,e,o;return{add:function(r,i){o=new t(r,i),e?e.next=o:n=o,e=o,o=void 0},drain:function(){var t=n;for(n=e=h=void 0;t;)t.fn.call(t.self),t=t.next}}}();var g=s({},"constructor",a,!1);return s(a,"prototype",g,!1),s(g,"__NPO__",0,!1),s(a,"resolve",function(t){var n=this;return t&&"object"==typeof t&&1===t.__NPO__?t:new n(function(n,e){if("function"!=typeof n||"function"!=typeof e)throw TypeError("Not a function");n(t)})}),s(a,"reject",function(t){return new this(function(n,e){if("function"!=typeof n||"function"!=typeof e)throw TypeError("Not a function");e(t)})}),s(a,"all",function(t){var n=this;return"[object Array]"!=p.call(t)?n.reject(TypeError("Not an array")):0===t.length?n.resolve([]):new n(function(e,o){if("function"!=typeof e||"function"!=typeof o)throw TypeError("Not a function");var r=t.length,i=Array(r),f=0;c(n,t,function(t,n){i[t]=n,++f===r&&e(i)},o)})}),s(a,"race",function(t){var n=this;return"[object Array]"!=p.call(t)?n.reject(TypeError("Not an array")):new n(function(e,o){if("function"!=typeof e||"function"!=typeof o)throw TypeError("Not a function");c(n,t,function(t,n){e(n)},o)})}),a});

},{}],"C:\\ksana2015\\node_modules\\reflux\\src\\ActionMethods.js":[function(require,module,exports){
/**
 * A module of methods that you want to include in all actions.
 * This module is consumed by `createAction`.
 */
module.exports = {
};

},{}],"C:\\ksana2015\\node_modules\\reflux\\src\\Keep.js":[function(require,module,exports){
exports.createdStores = [];

exports.createdActions = [];

exports.reset = function() {
    while(exports.createdStores.length) {
        exports.createdStores.pop();
    }
    while(exports.createdActions.length) {
        exports.createdActions.pop();
    }
};

},{}],"C:\\ksana2015\\node_modules\\reflux\\src\\ListenerMethods.js":[function(require,module,exports){
var _ = require('./utils'),
    maker = require('./joins').instanceJoinCreator;

/**
 * Extract child listenables from a parent from their
 * children property and return them in a keyed Object
 *
 * @param {Object} listenable The parent listenable
 */
var mapChildListenables = function(listenable) {
    var i = 0, children = {}, childName;
    for (;i < (listenable.children||[]).length; ++i) {
        childName = listenable.children[i];
        if(listenable[childName]){
            children[childName] = listenable[childName];
        }
    }
    return children;
};

/**
 * Make a flat dictionary of all listenables including their
 * possible children (recursively), concatenating names in camelCase.
 *
 * @param {Object} listenables The top-level listenables
 */
var flattenListenables = function(listenables) {
    var flattened = {};
    for(var key in listenables){
        var listenable = listenables[key];
        var childMap = mapChildListenables(listenable);

        // recursively flatten children
        var children = flattenListenables(childMap);

        // add the primary listenable and chilren
        flattened[key] = listenable;
        for(var childKey in children){
            var childListenable = children[childKey];
            flattened[key + _.capitalize(childKey)] = childListenable;
        }
    }

    return flattened;
};

/**
 * A module of methods related to listening.
 */
module.exports = {

    /**
     * An internal utility function used by `validateListening`
     *
     * @param {Action|Store} listenable The listenable we want to search for
     * @returns {Boolean} The result of a recursive search among `this.subscriptions`
     */
    hasListener: function(listenable) {
        var i = 0, j, listener, listenables;
        for (;i < (this.subscriptions||[]).length; ++i) {
            listenables = [].concat(this.subscriptions[i].listenable);
            for (j = 0; j < listenables.length; j++){
                listener = listenables[j];
                if (listener === listenable || listener.hasListener && listener.hasListener(listenable)) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * A convenience method that listens to all listenables in the given object.
     *
     * @param {Object} listenables An object of listenables. Keys will be used as callback method names.
     */
    listenToMany: function(listenables){
        var allListenables = flattenListenables(listenables);
        for(var key in allListenables){
            var cbname = _.callbackName(key),
                localname = this[cbname] ? cbname : this[key] ? key : undefined;
            if (localname){
                this.listenTo(allListenables[key],localname,this[cbname+"Default"]||this[localname+"Default"]||localname);
            }
        }
    },

    /**
     * Checks if the current context can listen to the supplied listenable
     *
     * @param {Action|Store} listenable An Action or Store that should be
     *  listened to.
     * @returns {String|Undefined} An error message, or undefined if there was no problem.
     */
    validateListening: function(listenable){
        if (listenable === this) {
            return "Listener is not able to listen to itself";
        }
        if (!_.isFunction(listenable.listen)) {
            return listenable + " is missing a listen method";
        }
        if (listenable.hasListener && listenable.hasListener(this)) {
            return "Listener cannot listen to this listenable because of circular loop";
        }
    },

    /**
     * Sets up a subscription to the given listenable for the context object
     *
     * @param {Action|Store} listenable An Action or Store that should be
     *  listened to.
     * @param {Function|String} callback The callback to register as event handler
     * @param {Function|String} defaultCallback The callback to register as default handler
     * @returns {Object} A subscription obj where `stop` is an unsub function and `listenable` is the object being listened to
     */
    listenTo: function(listenable, callback, defaultCallback) {
        var desub, unsubscriber, subscriptionobj, subs = this.subscriptions = this.subscriptions || [];
        _.throwIf(this.validateListening(listenable));
        this.fetchInitialState(listenable, defaultCallback);
        desub = listenable.listen(this[callback]||callback, this);
        unsubscriber = function() {
            var index = subs.indexOf(subscriptionobj);
            _.throwIf(index === -1,'Tried to remove listen already gone from subscriptions list!');
            subs.splice(index, 1);
            desub();
        };
        subscriptionobj = {
            stop: unsubscriber,
            listenable: listenable
        };
        subs.push(subscriptionobj);
        return subscriptionobj;
    },

    /**
     * Stops listening to a single listenable
     *
     * @param {Action|Store} listenable The action or store we no longer want to listen to
     * @returns {Boolean} True if a subscription was found and removed, otherwise false.
     */
    stopListeningTo: function(listenable){
        var sub, i = 0, subs = this.subscriptions || [];
        for(;i < subs.length; i++){
            sub = subs[i];
            if (sub.listenable === listenable){
                sub.stop();
                _.throwIf(subs.indexOf(sub)!==-1,'Failed to remove listen from subscriptions list!');
                return true;
            }
        }
        return false;
    },

    /**
     * Stops all subscriptions and empties subscriptions array
     */
    stopListeningToAll: function(){
        var remaining, subs = this.subscriptions || [];
        while((remaining=subs.length)){
            subs[0].stop();
            _.throwIf(subs.length!==remaining-1,'Failed to remove listen from subscriptions list!');
        }
    },

    /**
     * Used in `listenTo`. Fetches initial data from a publisher if it has a `getInitialState` method.
     * @param {Action|Store} listenable The publisher we want to get initial state from
     * @param {Function|String} defaultCallback The method to receive the data
     */
    fetchInitialState: function (listenable, defaultCallback) {
        defaultCallback = (defaultCallback && this[defaultCallback]) || defaultCallback;
        var me = this;
        if (_.isFunction(defaultCallback) && _.isFunction(listenable.getInitialState)) {
            var data = listenable.getInitialState();
            if (data && _.isFunction(data.then)) {
                data.then(function() {
                    defaultCallback.apply(me, arguments);
                });
            } else {
                defaultCallback.call(this, data);
            }
        }
    },

    /**
     * The callback will be called once all listenables have triggered at least once.
     * It will be invoked with the last emission from each listenable.
     * @param {...Publishers} publishers Publishers that should be tracked.
     * @param {Function|String} callback The method to call when all publishers have emitted
     * @returns {Object} A subscription obj where `stop` is an unsub function and `listenable` is an array of listenables
     */
    joinTrailing: maker("last"),

    /**
     * The callback will be called once all listenables have triggered at least once.
     * It will be invoked with the first emission from each listenable.
     * @param {...Publishers} publishers Publishers that should be tracked.
     * @param {Function|String} callback The method to call when all publishers have emitted
     * @returns {Object} A subscription obj where `stop` is an unsub function and `listenable` is an array of listenables
     */
    joinLeading: maker("first"),

    /**
     * The callback will be called once all listenables have triggered at least once.
     * It will be invoked with all emission from each listenable.
     * @param {...Publishers} publishers Publishers that should be tracked.
     * @param {Function|String} callback The method to call when all publishers have emitted
     * @returns {Object} A subscription obj where `stop` is an unsub function and `listenable` is an array of listenables
     */
    joinConcat: maker("all"),

    /**
     * The callback will be called once all listenables have triggered.
     * If a callback triggers twice before that happens, an error is thrown.
     * @param {...Publishers} publishers Publishers that should be tracked.
     * @param {Function|String} callback The method to call when all publishers have emitted
     * @returns {Object} A subscription obj where `stop` is an unsub function and `listenable` is an array of listenables
     */
    joinStrict: maker("strict")
};

},{"./joins":"C:\\ksana2015\\node_modules\\reflux\\src\\joins.js","./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\ListenerMixin.js":[function(require,module,exports){
var _ = require('./utils'),
    ListenerMethods = require('./ListenerMethods');

/**
 * A module meant to be consumed as a mixin by a React component. Supplies the methods from
 * `ListenerMethods` mixin and takes care of teardown of subscriptions.
 * Note that if you're using the `connect` mixin you don't need this mixin, as connect will
 * import everything this mixin contains!
 */
module.exports = _.extend({

    /**
     * Cleans up all listener previously registered.
     */
    componentWillUnmount: ListenerMethods.stopListeningToAll

}, ListenerMethods);

},{"./ListenerMethods":"C:\\ksana2015\\node_modules\\reflux\\src\\ListenerMethods.js","./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\PublisherMethods.js":[function(require,module,exports){
var _ = require('./utils');

/**
 * A module of methods for object that you want to be able to listen to.
 * This module is consumed by `createStore` and `createAction`
 */
module.exports = {

    /**
     * Hook used by the publisher that is invoked before emitting
     * and before `shouldEmit`. The arguments are the ones that the action
     * is invoked with. If this function returns something other than
     * undefined, that will be passed on as arguments for shouldEmit and
     * emission.
     */
    preEmit: function() {},

    /**
     * Hook used by the publisher after `preEmit` to determine if the
     * event should be emitted with given arguments. This may be overridden
     * in your application, default implementation always returns true.
     *
     * @returns {Boolean} true if event should be emitted
     */
    shouldEmit: function() { return true; },

    /**
     * Subscribes the given callback for action triggered
     *
     * @param {Function} callback The callback to register as event handler
     * @param {Mixed} [optional] bindContext The context to bind the callback with
     * @returns {Function} Callback that unsubscribes the registered event handler
     */
    listen: function(callback, bindContext) {
        bindContext = bindContext || this;
        var eventHandler = function(args) {
            if (aborted){
                return;
            }
            callback.apply(bindContext, args);
        }, me = this, aborted = false;
        this.emitter.addListener(this.eventLabel, eventHandler);
        return function() {
            aborted = true;
            me.emitter.removeListener(me.eventLabel, eventHandler);
        };
    },

    /**
     * Attach handlers to promise that trigger the completed and failed
     * child publishers, if available.
     *
     * @param {Object} The promise to attach to
     */
    promise: function(promise) {
        var me = this;

        var canHandlePromise =
            this.children.indexOf('completed') >= 0 &&
            this.children.indexOf('failed') >= 0;

        if (!canHandlePromise){
            throw new Error('Publisher must have "completed" and "failed" child publishers');
        }

        promise.then(function(response) {
            return me.completed(response);
        }, function(error) {
            return me.failed(error);
        });
    },

    /**
     * Subscribes the given callback for action triggered, which should
     * return a promise that in turn is passed to `this.promise`
     *
     * @param {Function} callback The callback to register as event handler
     */
    listenAndPromise: function(callback, bindContext) {
        var me = this;
        bindContext = bindContext || this;
        this.willCallPromise = (this.willCallPromise || 0) + 1;

        var removeListen = this.listen(function() {

            if (!callback) {
                throw new Error('Expected a function returning a promise but got ' + callback);
            }

            var args = arguments,
                promise = callback.apply(bindContext, args);
            return me.promise.call(me, promise);
        }, bindContext);

        return function () {
          me.willCallPromise--;
          removeListen.call(me);
        };

    },

    /**
     * Publishes an event using `this.emitter` (if `shouldEmit` agrees)
     */
    trigger: function() {
        var args = arguments,
            pre = this.preEmit.apply(this, args);
        args = pre === undefined ? args : _.isArguments(pre) ? pre : [].concat(pre);
        if (this.shouldEmit.apply(this, args)) {
            this.emitter.emit(this.eventLabel, args);
        }
    },

    /**
     * Tries to publish the event on the next tick
     */
    triggerAsync: function(){
        var args = arguments,me = this;
        _.nextTick(function() {
            me.trigger.apply(me, args);
        });
    },

    /**
     * Returns a Promise for the triggered action
     *
     * @return {Promise}
     *   Resolved by completed child action.
     *   Rejected by failed child action.
     *   If listenAndPromise'd, then promise associated to this trigger.
     *   Otherwise, the promise is for next child action completion.
     */
    triggerPromise: function(){
        var me = this;
        var args = arguments;

        var canHandlePromise =
            this.children.indexOf('completed') >= 0 &&
            this.children.indexOf('failed') >= 0;

        var promise = _.createPromise(function(resolve, reject) {
            // If `listenAndPromise` is listening
            // patch `promise` w/ context-loaded resolve/reject
            if (me.willCallPromise) {
                _.nextTick(function() {
                    var old_promise_method = me.promise;
                    me.promise = function (promise) {
                        promise.then(resolve, reject);
                        // Back to your regularly schedule programming.
                        me.promise = old_promise_method;
                        return me.promise.apply(me, arguments);
                    };
                    me.trigger.apply(me, args);
                });
                return;
            }

            if (canHandlePromise) {
                var removeSuccess = me.completed.listen(function(args) {
                    removeSuccess();
                    removeFailed();
                    resolve(args);
                });

                var removeFailed = me.failed.listen(function(args) {
                    removeSuccess();
                    removeFailed();
                    reject(args);
                });
            }

            me.triggerAsync.apply(me, args);

            if (!canHandlePromise) {
                resolve();
            }
        });

        return promise;
    }
};

},{"./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\StoreMethods.js":[function(require,module,exports){
/**
 * A module of methods that you want to include in all stores.
 * This module is consumed by `createStore`.
 */
module.exports = {
};

},{}],"C:\\ksana2015\\node_modules\\reflux\\src\\bindMethods.js":[function(require,module,exports){
module.exports = function(store, definition) {
  for (var name in definition) {
    if (Object.getOwnPropertyDescriptor && Object.defineProperty) {
        var propertyDescriptor = Object.getOwnPropertyDescriptor(definition, name);

        if (!propertyDescriptor.value || typeof propertyDescriptor.value !== 'function' || !definition.hasOwnProperty(name)) {
            continue;
        }

        store[name] = definition[name].bind(store);
    } else {
        var property = definition[name];

        if (typeof property !== 'function' || !definition.hasOwnProperty(name)) {
            continue;
        }

        store[name] = property.bind(store);
    }
  }

  return store;
};

},{}],"C:\\ksana2015\\node_modules\\reflux\\src\\connect.js":[function(require,module,exports){
var Reflux = require('./index'),
    _ = require('./utils');

module.exports = function(listenable,key){
    return {
        getInitialState: function(){
            if (!_.isFunction(listenable.getInitialState)) {
                return {};
            } else if (key === undefined) {
                return listenable.getInitialState();
            } else {
                return _.object([key],[listenable.getInitialState()]);
            }
        },
        componentDidMount: function(){
            _.extend(this,Reflux.ListenerMethods);
            var me = this, cb = (key === undefined ? this.setState : function(v){me.setState(_.object([key],[v]));});
            this.listenTo(listenable,cb);
        },
        componentWillUnmount: Reflux.ListenerMixin.componentWillUnmount
    };
};

},{"./index":"C:\\ksana2015\\node_modules\\reflux\\src\\index.js","./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\connectFilter.js":[function(require,module,exports){
var Reflux = require('./index'),
  _ = require('./utils');

module.exports = function(listenable, key, filterFunc) {
    filterFunc = _.isFunction(key) ? key : filterFunc;
    return {
        getInitialState: function() {
            if (!_.isFunction(listenable.getInitialState)) {
                return {};
            } else if (_.isFunction(key)) {
                return filterFunc.call(this, listenable.getInitialState());
            } else {
                // Filter initial payload from store.
                var result = filterFunc.call(this, listenable.getInitialState());
                if (result) {
                  return _.object([key], [result]);
                } else {
                  return {};
                }
            }
        },
        componentDidMount: function() {
            _.extend(this, Reflux.ListenerMethods);
            var me = this;
            var cb = function(value) {
                if (_.isFunction(key)) {
                    me.setState(filterFunc.call(me, value));
                } else {
                    var result = filterFunc.call(me, value);
                    me.setState(_.object([key], [result]));
                }
            };

            this.listenTo(listenable, cb);
        },
        componentWillUnmount: Reflux.ListenerMixin.componentWillUnmount
    };
};


},{"./index":"C:\\ksana2015\\node_modules\\reflux\\src\\index.js","./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\createAction.js":[function(require,module,exports){
var _ = require('./utils'),
    Reflux = require('./index'),
    Keep = require('./Keep'),
    allowed = {preEmit:1,shouldEmit:1};

/**
 * Creates an action functor object. It is mixed in with functions
 * from the `PublisherMethods` mixin. `preEmit` and `shouldEmit` may
 * be overridden in the definition object.
 *
 * @param {Object} definition The action object definition
 */
var createAction = function(definition) {

    definition = definition || {};
    if (!_.isObject(definition)){
        definition = {actionName: definition};
    }

    for(var a in Reflux.ActionMethods){
        if (!allowed[a] && Reflux.PublisherMethods[a]) {
            throw new Error("Cannot override API method " + a +
                " in Reflux.ActionMethods. Use another method name or override it on Reflux.PublisherMethods instead."
            );
        }
    }

    for(var d in definition){
        if (!allowed[d] && Reflux.PublisherMethods[d]) {
            throw new Error("Cannot override API method " + d +
                " in action creation. Use another method name or override it on Reflux.PublisherMethods instead."
            );
        }
    }

    definition.children = definition.children || [];
    if (definition.asyncResult){
        definition.children = definition.children.concat(["completed","failed"]);
    }

    var i = 0, childActions = {};
    for (; i < definition.children.length; i++) {
        var name = definition.children[i];
        childActions[name] = createAction(name);
    }

    var context = _.extend({
        eventLabel: "action",
        emitter: new _.EventEmitter(),
        _isAction: true
    }, Reflux.PublisherMethods, Reflux.ActionMethods, definition);

    var functor = function() {
        return functor[functor.sync?"trigger":"triggerPromise"].apply(functor, arguments);
    };

    _.extend(functor,childActions,context);

    Keep.createdActions.push(functor);

    return functor;

};

module.exports = createAction;

},{"./Keep":"C:\\ksana2015\\node_modules\\reflux\\src\\Keep.js","./index":"C:\\ksana2015\\node_modules\\reflux\\src\\index.js","./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\createStore.js":[function(require,module,exports){
var _ = require('./utils'),
    Reflux = require('./index'),
    Keep = require('./Keep'),
    mixer = require('./mixer'),
    allowed = {preEmit:1,shouldEmit:1},
    bindMethods = require('./bindMethods');

/**
 * Creates an event emitting Data Store. It is mixed in with functions
 * from the `ListenerMethods` and `PublisherMethods` mixins. `preEmit`
 * and `shouldEmit` may be overridden in the definition object.
 *
 * @param {Object} definition The data store object definition
 * @returns {Store} A data store instance
 */
module.exports = function(definition) {

    definition = definition || {};

    for(var a in Reflux.StoreMethods){
        if (!allowed[a] && (Reflux.PublisherMethods[a] || Reflux.ListenerMethods[a])){
            throw new Error("Cannot override API method " + a +
                " in Reflux.StoreMethods. Use another method name or override it on Reflux.PublisherMethods / Reflux.ListenerMethods instead."
            );
        }
    }

    for(var d in definition){
        if (!allowed[d] && (Reflux.PublisherMethods[d] || Reflux.ListenerMethods[d])){
            throw new Error("Cannot override API method " + d +
                " in store creation. Use another method name or override it on Reflux.PublisherMethods / Reflux.ListenerMethods instead."
            );
        }
    }

    definition = mixer(definition);

    function Store() {
        var i=0, arr;
        this.subscriptions = [];
        this.emitter = new _.EventEmitter();
        this.eventLabel = "change";
        bindMethods(this, definition);
        if (this.init && _.isFunction(this.init)) {
            this.init();
        }
        if (this.listenables){
            arr = [].concat(this.listenables);
            for(;i < arr.length;i++){
                this.listenToMany(arr[i]);
            }
        }
    }

    _.extend(Store.prototype, Reflux.ListenerMethods, Reflux.PublisherMethods, Reflux.StoreMethods, definition);

    var store = new Store();
    Keep.createdStores.push(store);

    return store;
};

},{"./Keep":"C:\\ksana2015\\node_modules\\reflux\\src\\Keep.js","./bindMethods":"C:\\ksana2015\\node_modules\\reflux\\src\\bindMethods.js","./index":"C:\\ksana2015\\node_modules\\reflux\\src\\index.js","./mixer":"C:\\ksana2015\\node_modules\\reflux\\src\\mixer.js","./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\index.js":[function(require,module,exports){
exports.ActionMethods = require('./ActionMethods');

exports.ListenerMethods = require('./ListenerMethods');

exports.PublisherMethods = require('./PublisherMethods');

exports.StoreMethods = require('./StoreMethods');

exports.createAction = require('./createAction');

exports.createStore = require('./createStore');

exports.connect = require('./connect');

exports.connectFilter = require('./connectFilter');

exports.ListenerMixin = require('./ListenerMixin');

exports.listenTo = require('./listenTo');

exports.listenToMany = require('./listenToMany');


var maker = require('./joins').staticJoinCreator;

exports.joinTrailing = exports.all = maker("last"); // Reflux.all alias for backward compatibility

exports.joinLeading = maker("first");

exports.joinStrict = maker("strict");

exports.joinConcat = maker("all");

var _ = require('./utils');

exports.EventEmitter = _.EventEmitter;

exports.Promise = _.Promise;

/**
 * Convenience function for creating a set of actions
 *
 * @param definitions the definitions for the actions to be created
 * @returns an object with actions of corresponding action names
 */
exports.createActions = function(definitions) {
    var actions = {};
    for (var k in definitions){
        if (definitions.hasOwnProperty(k)) {
            var val = definitions[k],
                actionName = _.isObject(val) ? k : val;

            actions[actionName] = exports.createAction(val);
        }
    }
    return actions;
};

/**
 * Sets the eventmitter that Reflux uses
 */
exports.setEventEmitter = function(ctx) {
    var _ = require('./utils');
    exports.EventEmitter = _.EventEmitter = ctx;
};


/**
 * Sets the Promise library that Reflux uses
 */
exports.setPromise = function(ctx) {
    var _ = require('./utils');
    exports.Promise = _.Promise = ctx;
};


/**
 * Sets the Promise factory that creates new promises
 * @param {Function} factory has the signature `function(resolver) { return [new Promise]; }`
 */
exports.setPromiseFactory = function(factory) {
    var _ = require('./utils');
    _.createPromise = factory;
};


/**
 * Sets the method used for deferring actions and stores
 */
exports.nextTick = function(nextTick) {
    var _ = require('./utils');
    _.nextTick = nextTick;
};

/**
 * Provides the set of created actions and stores for introspection
 */
exports.__keep = require('./Keep');

/**
 * Warn if Function.prototype.bind not available
 */
if (!Function.prototype.bind) {
  console.error(
    'Function.prototype.bind not available. ' +
    'ES5 shim required. ' +
    'https://github.com/spoike/refluxjs#es5'
  );
}

},{"./ActionMethods":"C:\\ksana2015\\node_modules\\reflux\\src\\ActionMethods.js","./Keep":"C:\\ksana2015\\node_modules\\reflux\\src\\Keep.js","./ListenerMethods":"C:\\ksana2015\\node_modules\\reflux\\src\\ListenerMethods.js","./ListenerMixin":"C:\\ksana2015\\node_modules\\reflux\\src\\ListenerMixin.js","./PublisherMethods":"C:\\ksana2015\\node_modules\\reflux\\src\\PublisherMethods.js","./StoreMethods":"C:\\ksana2015\\node_modules\\reflux\\src\\StoreMethods.js","./connect":"C:\\ksana2015\\node_modules\\reflux\\src\\connect.js","./connectFilter":"C:\\ksana2015\\node_modules\\reflux\\src\\connectFilter.js","./createAction":"C:\\ksana2015\\node_modules\\reflux\\src\\createAction.js","./createStore":"C:\\ksana2015\\node_modules\\reflux\\src\\createStore.js","./joins":"C:\\ksana2015\\node_modules\\reflux\\src\\joins.js","./listenTo":"C:\\ksana2015\\node_modules\\reflux\\src\\listenTo.js","./listenToMany":"C:\\ksana2015\\node_modules\\reflux\\src\\listenToMany.js","./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\joins.js":[function(require,module,exports){
/**
 * Internal module used to create static and instance join methods
 */

var slice = Array.prototype.slice,
    _ = require("./utils"),
    createStore = require("./createStore"),
    strategyMethodNames = {
        strict: "joinStrict",
        first: "joinLeading",
        last: "joinTrailing",
        all: "joinConcat"
    };

/**
 * Used in `index.js` to create the static join methods
 * @param {String} strategy Which strategy to use when tracking listenable trigger arguments
 * @returns {Function} A static function which returns a store with a join listen on the given listenables using the given strategy
 */
exports.staticJoinCreator = function(strategy){
    return function(/* listenables... */) {
        var listenables = slice.call(arguments);
        return createStore({
            init: function(){
                this[strategyMethodNames[strategy]].apply(this,listenables.concat("triggerAsync"));
            }
        });
    };
};

/**
 * Used in `ListenerMethods.js` to create the instance join methods
 * @param {String} strategy Which strategy to use when tracking listenable trigger arguments
 * @returns {Function} An instance method which sets up a join listen on the given listenables using the given strategy
 */
exports.instanceJoinCreator = function(strategy){
    return function(/* listenables..., callback*/){
        _.throwIf(arguments.length < 3,'Cannot create a join with less than 2 listenables!');
        var listenables = slice.call(arguments),
            callback = listenables.pop(),
            numberOfListenables = listenables.length,
            join = {
                numberOfListenables: numberOfListenables,
                callback: this[callback]||callback,
                listener: this,
                strategy: strategy
            }, i, cancels = [], subobj;
        for (i = 0; i < numberOfListenables; i++) {
            _.throwIf(this.validateListening(listenables[i]));
        }
        for (i = 0; i < numberOfListenables; i++) {
            cancels.push(listenables[i].listen(newListener(i,join),this));
        }
        reset(join);
        subobj = {listenable: listenables};
        subobj.stop = makeStopper(subobj,cancels,this);
        this.subscriptions = (this.subscriptions || []).concat(subobj);
        return subobj;
    };
};

// ---- internal join functions ----

function makeStopper(subobj,cancels,context){
    return function() {
        var i, subs = context.subscriptions,
            index = (subs ? subs.indexOf(subobj) : -1);
        _.throwIf(index === -1,'Tried to remove join already gone from subscriptions list!');
        for(i=0;i < cancels.length; i++){
            cancels[i]();
        }
        subs.splice(index, 1);
    };
}

function reset(join) {
    join.listenablesEmitted = new Array(join.numberOfListenables);
    join.args = new Array(join.numberOfListenables);
}

function newListener(i,join) {
    return function() {
        var callargs = slice.call(arguments);
        if (join.listenablesEmitted[i]){
            switch(join.strategy){
                case "strict": throw new Error("Strict join failed because listener triggered twice.");
                case "last": join.args[i] = callargs; break;
                case "all": join.args[i].push(callargs);
            }
        } else {
            join.listenablesEmitted[i] = true;
            join.args[i] = (join.strategy==="all"?[callargs]:callargs);
        }
        emitIfAllListenablesEmitted(join);
    };
}

function emitIfAllListenablesEmitted(join) {
    for (var i = 0; i < join.numberOfListenables; i++) {
        if (!join.listenablesEmitted[i]) {
            return;
        }
    }
    join.callback.apply(join.listener,join.args);
    reset(join);
}

},{"./createStore":"C:\\ksana2015\\node_modules\\reflux\\src\\createStore.js","./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\listenTo.js":[function(require,module,exports){
var Reflux = require('./index');


/**
 * A mixin factory for a React component. Meant as a more convenient way of using the `ListenerMixin`,
 * without having to manually set listeners in the `componentDidMount` method.
 *
 * @param {Action|Store} listenable An Action or Store that should be
 *  listened to.
 * @param {Function|String} callback The callback to register as event handler
 * @param {Function|String} defaultCallback The callback to register as default handler
 * @returns {Object} An object to be used as a mixin, which sets up the listener for the given listenable.
 */
module.exports = function(listenable,callback,initial){
    return {
        /**
         * Set up the mixin before the initial rendering occurs. Import methods from `ListenerMethods`
         * and then make the call to `listenTo` with the arguments provided to the factory function
         */
        componentDidMount: function() {
            for(var m in Reflux.ListenerMethods){
                if (this[m] !== Reflux.ListenerMethods[m]){
                    if (this[m]){
                        throw "Can't have other property '"+m+"' when using Reflux.listenTo!";
                    }
                    this[m] = Reflux.ListenerMethods[m];
                }
            }
            this.listenTo(listenable,callback,initial);
        },
        /**
         * Cleans up all listener previously registered.
         */
        componentWillUnmount: Reflux.ListenerMethods.stopListeningToAll
    };
};

},{"./index":"C:\\ksana2015\\node_modules\\reflux\\src\\index.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\listenToMany.js":[function(require,module,exports){
var Reflux = require('./index');

/**
 * A mixin factory for a React component. Meant as a more convenient way of using the `listenerMixin`,
 * without having to manually set listeners in the `componentDidMount` method. This version is used
 * to automatically set up a `listenToMany` call.
 *
 * @param {Object} listenables An object of listenables
 * @returns {Object} An object to be used as a mixin, which sets up the listeners for the given listenables.
 */
module.exports = function(listenables){
    return {
        /**
         * Set up the mixin before the initial rendering occurs. Import methods from `ListenerMethods`
         * and then make the call to `listenTo` with the arguments provided to the factory function
         */
        componentDidMount: function() {
            for(var m in Reflux.ListenerMethods){
                if (this[m] !== Reflux.ListenerMethods[m]){
                    if (this[m]){
                        throw "Can't have other property '"+m+"' when using Reflux.listenToMany!";
                    }
                    this[m] = Reflux.ListenerMethods[m];
                }
            }
            this.listenToMany(listenables);
        },
        /**
         * Cleans up all listener previously registered.
         */
        componentWillUnmount: Reflux.ListenerMethods.stopListeningToAll
    };
};

},{"./index":"C:\\ksana2015\\node_modules\\reflux\\src\\index.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\mixer.js":[function(require,module,exports){
var _ = require('./utils');

module.exports = function mix(def) {
    var composed = {
        init: [],
        preEmit: [],
        shouldEmit: []
    };

    var updated = (function mixDef(mixin) {
        var mixed = {};
        if (mixin.mixins) {
            mixin.mixins.forEach(function (subMixin) {
                _.extend(mixed, mixDef(subMixin));
            });
        }
        _.extend(mixed, mixin);
        Object.keys(composed).forEach(function (composable) {
            if (mixin.hasOwnProperty(composable)) {
                composed[composable].push(mixin[composable]);
            }
        });
        return mixed;
    }(def));

    if (composed.init.length > 1) {
        updated.init = function () {
            var args = arguments;
            composed.init.forEach(function (init) {
                init.apply(this, args);
            }, this);
        };
    }
    if (composed.preEmit.length > 1) {
        updated.preEmit = function () {
            return composed.preEmit.reduce(function (args, preEmit) {
                var newValue = preEmit.apply(this, args);
                return newValue === undefined ? args : [newValue];
            }.bind(this), arguments);
        };
    }
    if (composed.shouldEmit.length > 1) {
        updated.shouldEmit = function () {
            var args = arguments;
            return !composed.shouldEmit.some(function (shouldEmit) {
                return !shouldEmit.apply(this, args);
            }, this);
        };
    }
    Object.keys(composed).forEach(function (composable) {
        if (composed[composable].length === 1) {
            updated[composable] = composed[composable][0];
        }
    });

    return updated;
};

},{"./utils":"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js"}],"C:\\ksana2015\\node_modules\\reflux\\src\\utils.js":[function(require,module,exports){
/*
 * isObject, extend, isFunction, isArguments are taken from undescore/lodash in
 * order to remove the dependency
 */
var isObject = exports.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
};

exports.extend = function(obj) {
    if (!isObject(obj)) {
        return obj;
    }
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
        source = arguments[i];
        for (prop in source) {
            if (Object.getOwnPropertyDescriptor && Object.defineProperty) {
                var propertyDescriptor = Object.getOwnPropertyDescriptor(source, prop);
                Object.defineProperty(obj, prop, propertyDescriptor);
            } else {
                obj[prop] = source[prop];
            }
        }
    }
    return obj;
};

exports.isFunction = function(value) {
    return typeof value === 'function';
};

exports.EventEmitter = require('eventemitter3');

exports.nextTick = function(callback) {
    setTimeout(callback, 0);
};

exports.capitalize = function(string){
    return string.charAt(0).toUpperCase()+string.slice(1);
};

exports.callbackName = function(string){
    return "on"+exports.capitalize(string);
};

exports.object = function(keys,vals){
    var o={}, i=0;
    for(;i<keys.length;i++){
        o[keys[i]] = vals[i];
    }
    return o;
};

exports.Promise = require("native-promise-only");

exports.createPromise = function(resolver) {
    return new exports.Promise(resolver);
};

exports.isArguments = function(value) {
    return typeof value === 'object' && ('callee' in value) && typeof value.length === 'number';
};

exports.throwIf = function(val,msg){
    if (val){
        throw Error(msg||val);
    }
};

},{"eventemitter3":"C:\\ksana2015\\node_modules\\reflux\\node_modules\\eventemitter3\\index.js","native-promise-only":"C:\\ksana2015\\node_modules\\reflux\\node_modules\\native-promise-only\\npo.js"}],"C:\\ksana2015\\z0y\\index.js":[function(require,module,exports){
var React=require("react");
require("ksana2015-webruntime/livereload")(); 
var ksanagap=require("ksana2015-webruntime/ksanagap");
ksanagap.boot("z0y",function(){
	var Main=React.createElement(require("./src/main.jsx"));
	ksana.mainComponent=React.render(Main,document.getElementById("main"));
});
},{"./src/main.jsx":"C:\\ksana2015\\z0y\\src\\main.jsx","ksana2015-webruntime/ksanagap":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\ksanagap.js","ksana2015-webruntime/livereload":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\livereload.js","react":"react"}],"C:\\ksana2015\\z0y\\node_modules\\glyphemesearch\\index.js":[function(require,module,exports){

var strokecount=require("strokecount");
var decomposes=require("idsdata").decomposes;
var getutf32 = function (opt) { // return ucs32 value from a utf 16 string, advance the string automatically
	if (!opt.widestring) return 0;
	var s = opt.widestring;
	var ic = s.charCodeAt(0);
	var c = 1; // default BMP one widechar
	if (ic >= 0xd800 && ic <= 0xdcff) {
		var ic2 = s.charCodeAt(1);
		ic = 0x10000 + ((ic & 0x3ff) * 1024) + (ic2 & 0x3ff);
		c++; // surrogate pair
	}
	opt.thechar = s.substr(0, c);
	opt.widestring = s.substr(c, s.length - c);
	return ic;
};

var ucs2string = function (unicode) { //unicode ���X�� �r���A�textension B ���p
    if (unicode >= 0x10000 && unicode <= 0x10FFFF) {
      var hi = Math.floor((unicode - 0x10000) / 0x400) + 0xD800;
      var lo = ((unicode - 0x10000) % 0x400) + 0xDC00;
      return String.fromCharCode(hi) + String.fromCharCode(lo);
    } else {
      return String.fromCharCode(unicode);
    }
};
var str2arr = function(s) {
	var output=[];
	var opt={widestring:s};
	var code=0;
	while (code=getutf32(opt)) {
		output.push(code);
	}
	return output;
}

var getderived = function(part,successor ) {
	var decompose=decomposes[0][part]; //immediate children only
	if (successor){
		for (var i=1;i<decomposes.length;i++) {
			if (decomposes[i][part]) decompose+=decomposes[i][part] ;
		}
	}
	var out=str2arr(decompose);
	if (successor) out.sort(function(a,b){return a-b});
  return out;
}


var remove_once = function(arr) {  // [ 1, 2, 2, 3, 3, 3 ] ==> [ 2, 3, 3]
	  var prev=null;
	  var output=[];
	  for (var i=0;i<arr.length;i++) {
	  	  if (prev===arr[i]) output.push(prev);
	  	  prev=arr[i];
	  }
	  return output;
}  
 var array_unique = function(arr) { //must be sorted array   [ 1, 2, 2, 3, 3, 3 ] ==> [ 1, 2, 3]
 if (!arr.length) return [];
   var ret = [arr[0]];
   for (var i = 1; i < arr.length; i++) { // start loop at 1 as element 0 can never be a duplicate
      if (arr[i-1] !== arr[i])  ret.push(arr[i]);
   }
   return ret;
}
var array_intersect = function() { // ( [ 1,2,3]  , [ 2 , 2 , 3] ) ==>  [ 2 , 3]
  if (!arguments.length) return [];
  var a1 = arguments[0];
  var a = arguments[0];
  var a2 = null;
  var n = 1;
  var l,l2,jstart;
  while(n < arguments.length) {
    a = [];
    a2 = arguments[n];
    l = a1.length;
    l2 = a2.length;
    jstart=0;
    for(var i=0; i<l; i++) {
      for(var j=jstart; j<l2; j++) {
        if (a2[j]>a1[i]) break;
        if (a1[i] === a2[j]) a.push(a1[i]);
  		}
      jstart=j;
    }
    a1 = a;
    n++;
  }
  return array_unique(a);
}  

var filterstroke=function(arr,totalstroke) {
	var output=[];
	for (var i=0;i<arr.length;i++) {
		if (strokecount(arr[i])==totalstroke) output.push(arr[i]);
	}
	return output;
}
var moveexta=function(res) { //move extension A after BMP
	var output=[];
	for (var i in res) {
		if (res[i]>=0x4e00 && res[i]<0x9fff) {
			output.push(res[i]);
		}
	}
	for (var i in res) {
		if (res[i]<0x4e00 || res[i]>=0x20000) {
			output.push(res[i]);
		}
	}
	return output;
}
var gsearch=function(wh,successor) {
  var arg=[], derived=[];
  var prev="",glypheme=[];
  var opt={widestring:wh};
  var numbers=wh.match(/\d+/g);
  var remainstroke=0;

  for (var i in numbers) remainstroke+=parseInt(numbers[i]);

	while (opt.widestring!=="") {
		var code=getutf32(opt);
		if ((code>=0x3400 && code<=0x9fff) ||
			(code>=0x20000 && code<0x2ffff) ||
			(code>=0xe000 && 0xf8ff) )
			glypheme.push(opt.thechar);
	}
   
	if (glypheme.length==0) return [];
	if (glypheme.length==1) {
		var r=getderived(glypheme[0], successor );
		if (remainstroke) {
			var stroke=strokecount(glypheme[0]) + remainstroke;
			return moveexta(filterstroke(r,stroke));
		}
		return  moveexta(r)||[];
	}
	glypheme.sort(); // 口木口木 ==> 口口木木
	var partstroke=0;
	for (var i=0;i<glypheme.length;i++) {
		partstroke+=strokecount(glypheme[i]);
		if (prev===glypheme[i]) { // for searching repeated part
		   derived=remove_once(derived);
		} else {
		   derived=getderived(glypheme[i],successor );
		}
		if (derived==="") return [];
		arg.push( derived );
		prev=glypheme[i];
	}
	var res=array_intersect.apply(null, arg);
	if (remainstroke|| (numbers && numbers.length)) {
		var stroke=partstroke + remainstroke;
		return moveexta(filterstroke(res,stroke));	 
	}
	return moveexta(res);
}

gsearch.getutf32=getutf32;
gsearch.ucs2string=ucs2string;
module.exports=gsearch;
},{"idsdata":"C:\\ksana2015\\z0y\\node_modules\\idsdata\\index.js","strokecount":"C:\\ksana2015\\z0y\\node_modules\\strokecount\\index.js"}],"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose0.js":[function(require,module,exports){
module.exports={
 "1": "𩗠",
 "千": "仟兛刋吀圱奷忎忏扦杄歼汘瓩秊竏粁纤芊谸跹迁釺钎阡㔓䀒䄭䄹䊹𠃇𠉟𠌤𠌤𠘴𠙄𠙺𠚏𠚲𠦅𠦅𠦋𠦞𠦳𠬼𠰙𡍇𡜘𡝟𡟢𡣼𢁅𢁅𢌙𢕆𢨮𣅌𣗚𣥥𤗠𤣳𤾋𤾋𥭇𦭛𦴏𦼌𧖏𧖏𧗤𧘜𧮮𧺛𧿐𨓀𨛲𨹱𩡴𩵞𩾭𪜍𫇚𫡰𫧢𬆼𬑻𬔌",
 "又": "仅叉友反収发叔取变叙叜叟叡叹唘圣坚奴寝峄怿择支权殳汉泽溆濅燮矍竖紧绎臤译贤释铎锓隻雙馭驭驿骎㑠㑴㕛㕛㕜㕝㕞㕟㕠㕡㕢㖬㘝㝊㝕㞋㾛䀾䅓䈛䋜䘲䜷䝨䪟䪥䯭𠆎𠇀𠈧𠈿𠉺𠊗𠊯𠐄𠔛𠖗𠡹𠧘𠧼𠩍𠩒𠪔𠬚𠬛𠬟𠬠𠬡𠬢𠬥𠬧𠬨𠬩𠬪𠬭𠬮𠬯𠬰𠬱𠬲𠬳𠬵𠬶𠬷𠬸𠬹𠬺𠬻𠬼𠬽𠬾𠭁𠭂𠭃𠭄𠭆𠭇𠭈𠭉𠭊𠭍𠭎𠭏𠭐𠭒𠭓𠭕𠭖𠭗𠭙𠭜𠭟𠭠𠭧𠭩𠭭𠭮𠭯𠭰𠭱𠭲𠭳𠭵𠭷𠭸𠭹𠭼𠭾𠭿𠮀𠮁𠮃𠮅𠮆𠮇𠮈𠮉𠮏𠮑𠮓𠮕𠮗𠮘𠮢𠰎𠳦𠵬𠸅𠻍𠼣𡃛𡄹𡅔𡅝𡅮𡇄𡇄𡉢𡉳𡊋𡊙𡋪𡌛𡍣𡎕𡎙𡎹𡐄𡐍𡔮𡔷𡘨𡚛𡛒𡛒𡝛𡞽𡥍𡧌𡧕𡨊𡨬𡩠𡪞𡪢𡫉𡫏𡫒𡫙𡫺𡬓𡮖𡯅𡯉𡲋𡲠𡷮𡹨𡺻𡻁𢁶𢂭𢆼𢇯𢇽𢋺𢎊𢎤𢒳𢖨𢘎𢘦𢚣𢚥𢚫𢜂𢝢𢟬𢠬𢤙𢤶𢦬𢫇𢫊𢫪𢫹𢫺𢯳𢱄𢱥𢱵𢳽𢳽𢻍𢻍𢼅𢼅𢽖𢿚𢿚𣃳𣅝𣆠𣇗𣇚𣉀𣎤𣏘𣏷𣐔𣐢𣑔𣒉𣒊𣕒𣖽𣗀𣚤𣛒𣜩𣟍𣠴𣥸𣦻𣦼𣨏𣨨𣩌𣲺𣳏𣳒𣳚𣴉𣴬𣷅𣷕𣷺𣹰𣺎𣻋𣿟𣿡𤁼𤃕𤅥𤅨𤅯𤆌𤆳𤆿𤈫𤈬𤈳𤉺𤊮𤋓𤍛𤎬𤏻𤓄𤓡𤓴𤓶𤓿𤔂𤔐𤔪𤔬𤕗𤕭𤘸𤚇𤚈𤚜𤚨𤚿𤝢𤞎𤟚𤣻𤤏𤤱𤥎𤥘𤥜𤥥𤥱𤦑𤪨𤫀𤰖𤰯𤱆𤴨𤵟𤵷𤶌𤶟𤶤𤶯𤷺𤺅𤻢𤼦𤼬𤼼𥂎𥃀𥃐𥃫𥄞𥅐𥅢𥆣𥇄𥈃𥉆𥊨𥊿𥋀𥋜𥋩𥌄𥏏𥐼𥑊𥑩𥒣𥒧𥓆𥗰𥙈𥛀𥛆𥛬𥝐𥢄𥢮𥢮𥤦𥥞𥥦𥧞𥨒𥨢𥫓𥫓𥫓𥫓𥫓𥫓𥫕𥫕𥫕𥫕𥬖𥲹𥸩𥹉𥹏𥹟𥺑𥻊𥾤𥾤𦀩𦁭𦃌𦈫𦊔𦊻𦌄𦒺𦔀𦕋𦕪𦖚𦘃𦘬𦙉𦚂𦛀𦛫𦛬𦛯𦛵𦤵𦩇𦫿𦬐𦬣𦭁𦭇𦮆𦰑𦰨𦱩𦲪𦳡𦵥𦵲𦶞𦸖𦹖𦺭𦻈𦻉𦻡𦼼𧁇𧆛𧆤𧈡𧉐𧉫𧊬𧍂𧎹𧐰𧑎𧛽𧠈𧦀𧦀𧦆𧦛𧦾𧧙𧧞𧨠𧮜𧮸𧰀𧰍𧰱𧱣𧱮𧱯𧵚𧷄𧷅𧷌𧷧𧸆𧺉𧽔𧾠𧿸𨀝𨀝𨀝𨃎𨊿𨊿𨋌𨋌𨋚𨋦𨍅𨏝𨓔𨔇𨔇𨔕𨕉𨘹𨙆𨚨𨛂𨛠𨠈𨠈𨠡𨡉𨡼𨤊𨥁𨥢𨦏𨧍𨧴𨧵𨨈𨨭𨨭𨨿𨩕𨩹𨩻𨫁𨭵𨱣𨱣𨱮𨲄𨲑𨴉𨴦𨵕𨸕𨸽𨹡𨺎𩁦𩈑𩈝𩍱𩎢𩏽𩏾𩐂𩐂𩑌𩒍𩒸𩓔𩔒𩔬𩕂𩖩𩙏𩜨𩜯𩢇𩣬𩤿𩬋𩮃𩰣𩰥𩰦𩰼𩲛𩳗𩳫𩵎𩷃𩷅𩻐𩼮𪁁𪋕𪌠𪎳𪒸𪗅𪙅𪙢𪝶𪝶𪠂𪠣𪠤𪠥𪠦𪠧𪠨𪠩𪠬𪠮𪠯𪠲𪢲𪤫𪥆𪭲𪯳𪱙𪴭𪴳𪷃𪻍𪾋𫀡𫃦𫉯𫌋𫌹𫐃𫕊𫙞𫝋𫨙𫨲𫨳𫨴𫨵𫨶𫨷𫨸𫨺𫨼𫨽𫨾𫨿𫩀𫩁𫩂𫩃𫩆𫩇𫩈𫩊𫩌𫩎𫰐𫰥𫲡𫲫𫳓𫴁𫴣𫴧𫵜𫵴𫸵𫺚𬃁𬃇𬈃𬋯𬋴𬋸𬌉𬌛𬎕𬎝𬏆𬓊𬔊𬕉𬙦𬙨𬚏𬜤𬢇𬢱𬢸𬥎𬩴𬯞𬱈𬱩𬲤𬴲𬴵𬹔",
 "丰": "仹夆彗彗沣滟炐玤盽砉肨艳蚌邦邫㓞㕩㭋䂜䒠䛶䰷𠂴𠕛𠫢𠬻𠱬𠱰𠳜𠿆𡉘𡘢𡘱𡝾𡲓𡲓𡴇𡵞𡻇𡾿𡾿𢖁𢗒𢜎𢜎𢪋𢰰𢱎𢶬𢸕𢸽𣁮𣇑𣈝𣉄𣊄𣊄𣍈𣍈𣟣𣮝𣮝𤋒𤏆𤑥𤔒𤤵𥜨𥜨𥜪𥜪𦛥𦤿𧥹𧿣𨔉𨪭𨫛𨴦𩉧𩑚𩮁𪔍𪢽𪬇𪬇𪭲𪮉𫂶𫊠𫒊𫜑夆寿翺𫡗𫣘𫣘𫤛𫧡𫪙𫪙𫲸𫳿𫻩𫽛𬁓𬁓𬁣𬆴𬈃𬏆𬡈𬶆",
 "丩": "収叫嘂收朻糾纠虯觓訆赳鼼㧃㸨㺩㽱䡂䤛𠁫𠙝𠚨𠠳𠨞𠬻𡭡𢀙𢂭𢒥𤜟𤼼𥃧𥘊𥝄𦛫𦛬𦫶𧆢𧆮𧌟𧰍𧾻𨴉𪓓𪜡𫈍𫡅𫡅𫵜𬀀𬔅𬙨",
 "田": "乪亩佃偹兽塁备奋屇思曽榃毗毘沺湽男甸町画甼甽甾甿畀畂畇畈畉畊畋界畍畎畏畐畑畓畔畕畕畖畗畘畚畛畜畞畟畠畡畣畤略畦畧畨畩番畫畬畭畮畯異畲畳畴畵畷畸畹畻畼畽畾畾畾疁疂疃疄疇疐累細细苗葘輺里鈿鍿钿雷鴫黒㙧㚄㚻㚼㧂㩅㽖㽗㽘㽙㽚㽛㽜㽝㽞㽟㽠㽡㽢㽣㽤㽥㽧㽨㽩㽪㽫㽭㽯䟧䡒䧃𠈷𠏇𠓦𠔪𠖋𠖐𠜪𠟱𠟷𠬀𠼊𠾟𡁲𡇍𡈄𡈍𡈹𡊰𡌛𡌨𡌸𡐢𡒀𡗈𡘒𡙲𡜿𡟉𡥔𡩐𡪒𡮁𡱮𡶚𢇶𢉱𢊺𢋽𢌿𢍚𢍞𢐮𢑭𢔲𢖋𢚜𢟷𢡘𢢑𢢦𢮅𢮆𢷟𢽛𢿊𢿯𣀽𣁽𣎈𣎒𣐬𣐭𣓂𣕎𣕏𣕨𣕶𣞦𣠣𣡺𣡺𣡺𣡺𣢿𣥤𣫕𣰱𣱟𣱫𣵔𣹒𣺆𤁄𤃐𤃳𤌈𤌖𤌲𤏏𤑰𤒳𤒹𤔉𤕌𤗌𤙳𤝗𤤦𤧓𤮷𤮸𤰓𤰕𤰖𤰗𤰘𤰙𤰚𤰛𤰜𤰝𤰟𤰠𤰢𤰤𤰥𤰦𤰧𤰨𤰩𤰪𤰫𤰬𤰭𤰮𤰯𤰳𤰵𤰸𤰺𤰻𤰼𤰾𤰿𤱀𤱂𤱃𤱄𤱅𤱆𤱇𤱊𤱌𤱍𤱎𤱏𤱐𤱔𤱕𤱗𤱙𤱚𤱛𤱜𤱝𤱞𤱟𤱠𤱡𤱥𤱦𤱧𤱨𤱩𤱬𤱭𤱯𤱱𤱲𤱳𤱴𤱷𤱸𤱹𤱺𤱻𤱼𤱿𤲁𤲃𤲆𤲇𤲈𤲉𤲊𤲋𤲌𤲎𤲏𤲐𤲒𤲓𤲕𤲖𤲗𤲘𤲚𤲛𤲜𤲝𤲞𤲟𤲠𤲡𤲢𤲤𤲦𤲧𤲨𤲩𤲪𤲫𤲬𤲭𤲭𤲮𤲯𤲱𤲳𤲴𤲴𤲵𤲸𤲹𤲺𤲻𤲾𤳀𤳁𤳂𤳄𤳋𤳌𤳍𤳍𤳎𤳑𤳒𤳔𤳕𤳙𤳚𤳜𤳝𤳟𤳠𤳡𤳣𤳥𤳥𤳩𤳪𤳬𤳭𤳭𤳮𤳱𤳳𤳳𤳳𤳳𤳴𤳴𤳶𤳹𤳹𤳹𤳹𤳻𤳻𤳽𤳿𤴀𤴀𤴂𤴃𤴄𤴄𤴄𤴄𤴆𤴇𤴇𤴇𤴇𤴈𤴊𤴊𤴊𤴊𤴋𤴌𤴌𤴌𤴌𤴎𤴐𤴐𤴐𤴐𤴑𤴑𤴑𤴑𤴒𤴒𤴒𤴒𤴡𤷒𤹲𤹸𤾒𥀋𥀒𥎴𥓓𥔏𥛽𥜑𥞷𥟄𥟑𥠎𥠰𥡏𥢋𥢦𥣊𥣲𥣲𥦕𥨌𥪎𥰷𥲺𥳂𥶅𥺛𥺢𥻜𥼑𥼦𥼦𥽙𦁃𦃠𦃯𦃴𦅟𦉩𦉩𦉩𦉩𦌂𦗎𦜉𦠝𦡑𦤏𦧲𦲡𦲣𦵆𦵰𦸎𦸥𦸿𦹓𦹸𦻿𦼁𦼞𦿨𧀄𧀶𧁖𧃾𧆨𧇕𧏓𧐋𧑵𧓝𧓧𧜪𧤝𧦵𧵗𨂬𨂹𨇈𨌦𨎚𨏁𨏡𨏧𨐄𨐄𨓥𨖻𨙅𨙗𨞬𨡟𨢄𨢽𨪲𨫗𨰶𨲥𨳸𨶧𨻞𨽜𨽶𩁮𩄣𩄣𩅏𩅑𩅸𩆗𩆗𩆞𩆫𩆴𩇓𩇓𩇓𩇓𩇼𩌎𩏄𩏦𩒵𩜗𩥖𩩙𩫜𩵋𩵑𩸛𩺅𩺜𪉀𪉀𪉀𪉀𪎟𪓻𪞌𪞛𪟟𪠚𪧈𪧗𪪮𪶖𪹦𪺊𪺡𪺡𪽇𪽈𪽊𪽋𪽌𪽍𪽎𪽏𪽑𪽒𪽓𪽔𪽖𪽘𪽙𪽚𪽛𪽜𪽞𪽟𪽢𪽣𪽦𫀪𫁁𫂔𫂺𫅹𫐃𫐃𫒹勇甾𤲒異𥛅福𫣔𫥯𫦝𫦫𫨍𫯃𫵤𫿶𬀡𬄒𬌅𬎿𬏀𬏂𬏃𬏄𬏆𬏇𬏈𬏉𬏊𬏋𬏏𬏐𬏑𬏒𬓷𬘑𬞏𬞏𬟭𬯥𬹲",
 "仌": "俎𠅓𠓵𠓵𠕎𠚄𠟮𠤽𠦍𠧪𠩛𡈍𡈍𡜰𡫙𡫜𡫮𡫾𡸋𡹽𡹽𡺛𡺛𡼙𡼙𣎐𤍡𤍡𥏂𦆰𦖏𦢻𪟔𫰱𫻰",
 "十": "亁什兙凖卂卆午卉卋华协卒協卖卙博卛古叶啚圗壊壴夲尭徳戎支早旪枽桦毕氒汁準瓧畞皁真竍筚籵聴肸荜計计貭质辻針针隼韟㔹㔺㔺㔺㔻㔼㚈㥁㫩㱩䘚䚌䜂䥅䦹䭴𠀆𠁗𠂦𠃒𠄆𠅋𠅖𠆱𠉊𠉔𠉔𠌂𠏉𠖡𠙷𠤏𠥼𠥾𠥿𠦀𠦃𠦃𠦃𠦄𠦄𠦄𠦈𠦉𠦊𠦍𠦎𠦏𠦐𠦓𠦕𠦖𠦗𠦚𠦛𠦛𠦝𠦠𠦡𠦢𠦣𠦥𠦦𠦧𠦨𠦩𠦬𠦭𠦰𠦵𠦹𠦼𠦽𠦾𠧀𠧁𠧂𠧋𠧎𠧏𠧐𠫘𠳣𠵀𠵒𠷫𡈄𡈿𡊈𡊓𡌨𡏻𡘖𡙺𡥇𡧵𡨯𡩖𡮃𡲷𡲷𡲷𡴙𡴨𡴩𡵵𡸝𡹿𡻆𡻏𡿼𢂯𢆏𢈰𢌗𢕴𢕴𢗛𢙋𢛳𢜙𢨍𢨦𢩲𢪡𢮆𢱴𢳎𢳎𢳎𢶁𢻣𢽛𣂑𣆉𣋦𣏸𣓟𣓤𣔈𣔎𣘒𣘶𣜒𣤂𣧒𣭤𣲌𣳀𣳝𣳰𣳶𣴈𣷝𣸽𣹾𤃊𤃊𤃊𤇹𤔭𤕍𤗥𤚮𤝊𤡶𤡹𤣭𤦞𤫝𤬧𤯀𤷒𤽁𥃪𥃭𥄂𥄌𥄖𥄜𥊊𥎧𥓈𥓓𥗅𥘧𥝺𥟑𥡖𥤿𥥫𥪎𥯺𥴚𥺛𥾅𦉲𦉴𦋪𦌃𦐫𦒋𦙈𦚄𦚬𦜉𦥁𦥴𦦓𦧐𦧾𦬡𦭚𦮍𦰗𦶫𦸻𧂽𧗵𧞳𧟗𧟹𧠍𧡠𧫵𧴶𧶚𧾽𧿎𨀭𨌦𨎏𨑷𨑿𨒒𨔿𨙩𨞥𨠪𨥞𨥪𨨇𨩑𨪟𨪬𨺎𨺔𨽪𨽪𨽫𨽱𨾐𨾑𨾙𩐮𩐷𩒪𩖘𩗸𩜙𩝃𩝃𩞑𩞔𩞳𩞴𩞴𩡪𩣰𩩙𩫏𩫪𩬋𩬴𩲔𪄐𪉞𪉢𪉫𪉲𪗄𪗕𪞱𪟴𪟻𪫈𪮊𫀂𫂷𫆘𫋔𫖆𫙏𫝒𫝓𫝢卉博博圖噑廾𫡰𫧞𫧠𫧤𫧥𫭂𫵱𬁰𬃖𬯭𬷂",
 "𠘬": "𠘲𠦐𠫠𡵷𡵹",
 "世": "伳呭屉屜怈抴朑枻枼泄玴疶笹紲绁袣詍貰贳跇迣鉪靾髰齛㰥䄁𠁀𠦴𠦴𡙻𡛶𢃄𢇸𢨏𢲄𢺿𣓪𣫸𣻉𤐼𤤙𥅋𥠓𥱎𥹑𦉃𦐕𦐞𦭓𦰗𦷾𧃹𧉺𧺿𨍕𨪇𨵳𩄓𩊈𩔎𩦭𩺌𪣅𫢫𬆑𬒛𬔛𬙚𬡽",
 "百": "佰兡凮咟帞弼栢洦瓸皕皕竡粨絔蛨袹貊銆陌㓦㢶㪶㹮㼣䀌䀌䔤𠁗𠁗𠃇𠃇𠄆𠍚𠍛𠙩𠷡𡇚𡋦𡩛𡶾𢌂𢐈𢐝𢒣𢙯𢫦𢸹𣰱𣽀𤎁𤢫𤤿𤾋𤾓𤾩𥏄𦂨𧩠𧹡𧻙𨒹𩃫𩊘𩛬𩢷𪜙𪡬𪫮𪭔𫌍𫡰𫡷𫨅𬃴𬟡𬦰",
 "林": "冧啉埜婪崊彬惏晽梦梵梺森棼棽棾椘楚榃樷檒淋潸焚爨琳痳碄禁箖綝罧菻諃辳郴醂霖麓㑣㚞㛦㝝㣩㨆㪔㭝㯄㯟㯬㰈㷊䠂䢞䦥䨷䫐𠄻𠐙𠩵𠪠𠪴𠵂𠹝𠾞𡈹𡈹𡍚𡑕𡘽𡙻𡚣𡢥𡪎𡹇𡹚𡼨𢊠𢊢𢋤𢋮𢋹𢌋𢛓𢞥𢟼𢴻𢺱𢻦𢿨𢿱𣀙𣀧𣇰𣈅𣑽𣒜𣓏𣓕𣓴𣕽𣕾𣗗𣗚𣗡𣗣𣘑𣙑𣚨𣚵𣛅𣛾𣜈𣜕𣜺𣝪𣝹𣞖𣞤𣟒𣟜𣠬𣠮𣡥𣡽𣡽𣡽𣡽𣫄𣫓𣽕𣽽𣾕𣿏𤀮𤂑𤃺𤅅𤊩𤍾𤏷𤑖𤓥𤳥𤹈𤾓𥁹𥎢𥓙𥗈𥦝𥲢𥷭𦇕𦋗𦝃𦡨𦣌𦨅𧂾𧅟𧇃𧇥𧇨𧖥𧛀𧩋𧯴𧰔𧹫𧼖𧾬𨂕𨝵𨞹𨤳𨨗𩀼𩅤𩆝𩆥𩆱𩟴𩤆𩱬𪎦𪧵𪩦𪲡𪲵𪳟𪳯𪳻𪳽𪵝𪾭𫇓𫓞爨𫦯𫨤𫬴𫱒𫿱𬂽𬃂𬃕𬃚𬃲𬃴𬄜𬄰𬄷𬅃𬅄𬅐𬅛𬘭𬜂𬜄𬩊𬱾𬴫𬷞",
 "大": "冭厺叁参咵因圶天太夭夯夲夳夵夶夶夸夺夻夼夽夿奀奁奃奄奅奆奇奈奋奌奎奒奓奔奕奖套奘奙奛奜奝奞奟奠奢奤奦奧奩奫奬奯奰奱尖峚庆忁忕戻旲曓杕樊汏涣焕爨牵畚篡篹簒籑类繤纂羍美耎耷聫芖褼貵蹮軑軬輋轪达遷釱韟馱驮㐲㒨㓫㕦㙽㚎㚏㚐㚐㚓㚕㚖㚗㚙㚚㚛㚜㚝㚞㚠㞭㣏㣕㬥㬧㭐㮂㵮㺆㺯㻎䆩䉵䋰䙲䙴䚌䜂䡞䯨䲦䲪䵵𠁗𠅌𠅑𠅧𠅲𠇳𠉈𠋋𠋽𠌔𠍍𠎇𠎣𠏖𠏥𠑔𠑗𠓱𠓵𠖉𠘀𠛇𠛗𠛘𠜹𠟥𠢘𠧭𠧵𠨟𠨧𠨩𠫭𠫵𠫻𠫽𠫿𠬁𠬅𠯈𠱑𠲂𠶫𠸇𠹧𠺂𠼄𠾃𠿆𠿧𡂦𡃎𡃬𡅜𡉑𡊄𡊌𡊘𡏙𡏻𡒀𡔅𡔱𡗓𡗔𡗖𡗛𡗝𡗞𡗟𡗡𡗢𡗥𡗦𡗧𡗨𡗬𡗮𡗯𡗰𡗲𡗳𡗴𡗵𡗶𡗷𡗸𡗹𡗻𡗼𡗿𡘀𡘁𡘂𡘃𡘄𡘅𡘇𡘈𡘉𡘊𡘋𡘋𡘌𡘍𡘎𡘏𡘐𡘑𡘔𡘖𡘗𡘘𡘙𡘚𡘛𡘜𡘝𡘞𡘟𡘠𡘡𡘣𡘥𡘧𡘨𡘩𡘪𡘫𡘭𡘯𡘰𡘲𡘳𡘴𡘶𡘷𡘻𡘽𡘾𡙂𡙃𡙃𡙄𡙉𡙋𡙌𡙍𡙏𡙓𡙔𡙗𡙘𡙙𡙛𡙜𡙞𡙟𡙠𡙡𡙢𡙣𡙤𡙥𡙦𡙨𡙬𡙭𡙮𡙯𡙰𡙲𡙴𡙵𡙸𡙺𡙻𡙼𡙽𡙾𡙿𡚀𡚁𡚂𡚄𡚊𡚋𡚍𡚒𡚓𡚔𡚕𡚖𡚗𡚘𡚚𡚛𡚜𡚝𡚟𡚠𡚡𡚢𡚣𡚥𡚻𡜀𡞃𡞵𡟗𡡰𡣬𡧑𡧠𡧶𡨏𡨒𡨡𡨮𡨵𡩔𡩳𡪪𡫟𡫩𡫼𡭟𡭻𡮸𡮽𡴔𡷓𡹊𡹿𡻲𢁖𢃛𢅍𢅿𢊹𢌋𢎴𢏓𢑱𢑴𢒣𢒮𢓽𢖎𢖚𢙭𢚈𢝹𢞹𢠬𢢰𢥛𢥜𢥟𢨗𢪂𢫉𢭛𢮥𢮸𢰼𢱕𢳒𢷯𢹯𢺌𢽀𢾗𢾴𣀱𣈠𣊖𣊻𣋦𣌑𣎐𣔊𣕍𣗚𣗷𣘔𣘶𣙑𣚱𣝢𣝴𣞤𣟟𣡄𣣩𣧂𣫵𣱋𣲔𣳹𣴌𣴰𣵉𣵖𣵟𣵩𣵫𣸽𣺔𣺚𣼜𣽂𣾯𤀈𤀬𤀱𤀸𤂤𤂾𤄗𤄻𤅹𤅹𤅹𤆍𤊜𤋋𤋓𤋕𤍾𤏷𤐼𤑌𤑮𤑰𤒁𤒺𤓊𤓔𤕡𤜌𤧊𤨀𤨯𤫧𤯗𤲉𤲙𤳦𤴄𤹶𤼤𤼤𤼤𤽫𤽬𤽻𤾪𥁋𥆗𥇛𥈀𥉱𥎽𥔇𥙗𥜌𥝚𥝛𥠩𥢞𥣚𥣸𥤮𥨩𥨴𥫐𥭍𥮅𥮯𥱁𥲸𥲻𥴌𥴠𥵺𦄖𦆌𦉼𦌩𦎀𦎳𦏥𦏷𦒣𦒭𦕯𦚁𦚄𦚫𦛏𦟩𦢐𦢹𦣃𦣼𦤀𦤑𦤒𦥹𦦆𦦉𦧂𦨐𦫜𦫞𦮐𦮹𦯤𦯮𦰮𦵏𦸼𦻒𦻞𦼣𦽽𦿫𦿲𦿹𧂲𧃦𧄭𧅖𧆱𧈹𧌝𧌪𧍨𧏂𧏃𧐃𧓝𧖥𧗾𧛍𧛒𧟊𧡅𧤑𧥢𧧳𧨌𧨌𧨞𧩚𧪉𧫭𧫭𧬉𧬔𧮔𧳗𧳾𧹈𧾇𨀗𨆚𨇴𨉀𨉊𨏉𨔙𨕎𨕏𨕺𨗆𨗇𨘎𨙘𨙙𨙞𨛊𨟦𨠒𨠹𨢔𨤗𨤙𨤪𨦌𨦘𨦚𨩉𨩬𨳓𨵢𨶥𨷊𨹞𨺆𨽬𩁭𩃙𩄀𩅌𩅖𩆙𩇎𩇩𩊵𩍠𩎮𩏖𩔖𩕾𩖂𩖈𩛌𩞑𩟲𩡱𩤄𩩃𩵋𩹧𩺁𩾪𪅞𪆕𪇐𪉗𪐝𪐡𪑵𪒇𪒈𪓆𪙖𪚔𪡼𪥁𪥂𪥄𪥅𪥆𪥇𪥈𪥊𪥋𪥌𪥍𪥎𪥏𪥒𪥓𪥔𪥕𪥖𪥗𪥘𪥛𪥜𪥝𪥞𪥟𪥠𪥡𪥢𪦂𪧛𪧫𪨶𪩣𪩶𪭬𪵪𪶓𪼫𪼳𪽓𪽲𪿤𫂎𫆄𫈹𫋭𫐊𫔫𫔺𫗔𫗤𫞲奢𫥒𫥰𫥹𫦍𫦺𫯛𫯜𫯞𫯡𫯢𫯥𫯦𫯧𫯪𫯫𫯭𫯮𫯱𫯴𫯵𫯶𫯷𫯹𫯺𫯻𫯼𫰀𫰁𫰅𫸥𫻨𫻳𬀡𬄀𬅍𬉵𬋻𬌚𬓽𬚓𬟧𬣓𬫴𬫾𬵃𬶃𬹞𬺛",
 "冂": "丽丽冃冇冈冋囘罓高㒺䮥𠀙𠀙𠀸𠁐𠂴𠃾𠄢𠆈𠈕𠍛𠔼𠔽𠔽𠔿𠕁𠕈𠕉𠕌𠕍𠕎𠕏𠕐𠕑𠕕𠕘𠕙𠕚𠕜𠕡𠕢𠕪𠕬𠜌𠜌𠝴𠝾𠞜𠞤𠧖𠧜𠧰𠧼𠨁𠬸𠭽𠮀𠮘𠹧𠾃𠿧𡂦𡃬𡆨𡉮𡋪𡌾𡧝𡸍𡸿𢁶𢃁𢃹𢄮𢌞𢌡𢝯𢪼𢫏𢱱𢻦𢼱𢿝𢿮𣀺𣅧𣇱𣇱𣎁𣐶𣗊𣛉𣝿𣟷𣥑𣨏𣴬𣹿𣾌𤆳𤐎𤞸𤤡𤤢𤧱𤩋𤩡𤱆𥄞𥐼𥡎𥫇𥫐𥫚𥮫𥵑𥹟𥾔𦁒𦉪𦉫𦉳𦊗𦊤𦋔𦕋𦘘𦘚𦘝𦘡𦝓𦦝𦬣𦮏𦲐𦽗𧁡𧃭𧄋𧍑𧐬𧒘𧒤𧔰𧘉𧢲𧥛𧦘𧦸𧨋𧮋𧮼𨍅𨐄𨐄𨜤𩖩𩡟𪔃𪞎𫀫𫈂𫋭𫒀𫝃𫝍內𫭒𫭒𫯱𬅶𬖬𬞹𬴳",
 "㐅": "冈凶刈区卤希杀棥棥気罓肴覐覐赵鬛䖊䘠䮥𠀠𠀮𠂭𠃾𠃾𠃾𠃾𠄡𠍚𠔋𠔝𠔝𠘮𠘰𠚙𠛄𠛄𠜽𠜽𠝾𠝾𠟑𠠌𠤣𠫤𠮁𠯌𠶂𠶂𡃎𡃎𡍗𡒏𡔫𡕈𡖘𡖘𡘻𡘻𡢆𡥉𡧝𡨿𡴓𡴷𢀈𢀉𢂞𢂞𢄕𢍌𢍙𢍙𢗛𢙵𢨍𢪣𢯧𢯧𢺽𢺽𢼂𢼂𢼢𢼫𢼫𢼫𢼬𢼬𢼬𢽼𢽼𢾵𢾵𣅎𣈎𣎭𣎭𣏂𣏯𣒅𣔬𣗂𣗂𣪩𣪩𣱜𣲢𤄨𤄨𤄩𤄩𤉧𤉧𤐳𤕝𤕝𤕡𤕡𤞮𤥱𤽠𤽠𤿓𤿓𥂞𥂞𥂶𥑨𥕇𥕭𥕭𥗸𥘝𥜽𥝁𥝄𥝅𥮣𥶢𥹦𦁯𦁯𦈄𦌆𦜞𦤴𦥯𦥯𦦝𦦠𦦠𦭤𦮓𦮓𦱹𦴗𦵔𦵔𦹌𦼤𦿯𧀈𧀈𧂇𧂇𧊫𧒘𧔐𧔱𧕧𧠔𧠔𧦷𧧿𧧿𧪷𧹇𨏐𨏐𨐄𨐖𨐘𨞟𨞟𨢀𨢀𨦅𨦾𨪧𩆒𩇀𩑛𩑛𩗉𩛀𩛙𩠩𩠩𩳙𩾘𪠣𫂷𫇬𫋑𫞪𫞰𫪟𫭣𫭣𬆰𬋴𬏻𬠆𬷂",
 "乖": "㔞㪓㾩䂷䓙𠝍𡇸𡏕𡮓𡹁𢝤𢮿𣒧𣔪𣪜𨛽𨧰𨵞𪞳𪬁𫏓𫟽𫡙𫨔𬠕",
 "土": "亴凷去吐囶圡圣圥圧圭圭圱圶圼坌坐坒坓坔坕坖坙坚坠坣坴垄垈型垐垒垔垕垚垚垡垦垩垫垼垽埅埊埑埜基埾埿堃堅堊堏堑堕堡堥堲堻堼塁塈塑塗塞塟塣塦塰塱塵塹塺塾墅墊墍墏墓墜墨墪墬墮墯壁壂壄壅壍壐壑壓壘壟壨夌寺尘峚嶳庄扗杜汢濹灶灻烾畻瘗瘞皨社穯竃竈纒羐肚芏茔走里釷钍靯黒㐋㑠㘦㘧㘨㘩㘪㘫㘬㘭㘮㘯㘰㘱㘲㘵㘶㘷㘸㘹㘺㘻㘼㘽㘿㙀㙁㙂㙃㙄㙅㙇㙈㙉㙊㙋㙌㙍㙎㙏㙐㙑㙒㙓㙔㙕㙖㙗㙘㙙㙚㙛㙜㙝㙞㙟㙠㙡㙢㙣㙤㙥㙦㙧㙨㙪㙫㙬㙭㙮㙰㙱㙲㙳㙴㙵㙵㙸㙹㙺㙻㙼㙽㙾㙿㚀㚂㞿㦳㮒㳗㴳㷯㸀㽵䀋䜃䝅䡖䦌䲧䵺𠂒𠂸𠄗𠅰𠅴𠈬𠌉𠍝𠍧𠏂𠑏𠑯𠒟𠖜𠖠𠖣𠖦𠖧𠖪𠙓𠜩𠜩𠟜𠡕𠩍𠬁𠭱𠮷𠲊𠴤𠸈𠹫𠹿𠽺𡂥𡃚𡃟𡄂𡆐𡆒𡈼𡈽𡈾𡈿𡉀𡉁𡉂𡉃𡉄𡉆𡉇𡉉𡉊𡉋𡉌𡉍𡉎𡉏𡉐𡉑𡉓𡉔𡉕𡉖𡉗𡉘𡉙𡉚𡉛𡉝𡉞𡉟𡉠𡉡𡉢𡉣𡉤𡉥𡉦𡉧𡉨𡉩𡉪𡉫𡉬𡉭𡉮𡉯𡉰𡉱𡉲𡉳𡉴𡉵𡉵𡉶𡉷𡉸𡉺𡉻𡉼𡉽𡉾𡉿𡊀𡊁𡊂𡊃𡊄𡊅𡊇𡊈𡊉𡊊𡊌𡊍𡊎𡊏𡊐𡊑𡊒𡊓𡊔𡊕𡊖𡊗𡊘𡊙𡊚𡊛𡊜𡊝𡊞𡊟𡊠𡊡𡊢𡊣𡊤𡊥𡊥𡊦𡊧𡊨𡊩𡊪𡊫𡊬𡊭𡊯𡊰𡊱𡊲𡊳𡊴𡊵𡊶𡊷𡊸𡊹𡊺𡊻𡊽𡊿𡋀𡋁𡋂𡋃𡋄𡋆𡋇𡋈𡋊𡋋𡋌𡋌𡋍𡋎𡋏𡋐𡋑𡋒𡋓𡋕𡋖𡋗𡋘𡋙𡋚𡋛𡋜𡋝𡋞𡋟𡋠𡋢𡋣𡋤𡋥𡋦𡋩𡋪𡋫𡋭𡋮𡋯𡋰𡋰𡋱𡋳𡋴𡋵𡋶𡋷𡋹𡋺𡋻𡋼𡋽𡋾𡋿𡌀𡌁𡌃𡌄𡌅𡌆𡌇𡌈𡌉𡌊𡌋𡌌𡌍𡌎𡌐𡌑𡌒𡌓𡌔𡌕𡌖𡌘𡌙𡌚𡌛𡌜𡌝𡌞𡌞𡌟𡌠𡌡𡌢𡌣𡌥𡌦𡌧𡌨𡌩𡌫𡌬𡌭𡌮𡌯𡌰𡌱𡌳𡌴𡌵𡌶𡌷𡌸𡌹𡌺𡌻𡌼𡌾𡌿𡍁𡍃𡍄𡍅𡍆𡍇𡍈𡍉𡍊𡍊𡍋𡍌𡍍𡍎𡍏𡍐𡍑𡍒𡍓𡍔𡍕𡍖𡍗𡍘𡍙𡍚𡍛𡍜𡍝𡍞𡍟𡍠𡍡𡍡𡍢𡍣𡍥𡍦𡍧𡍨𡍩𡍪𡍫𡍭𡍮𡍯𡍱𡍲𡍳𡍴𡍶𡍷𡍸𡍹𡍺𡍻𡍼𡍽𡍾𡍿𡎀𡎁𡎂𡎃𡎃𡎄𡎆𡎇𡎈𡎉𡎊𡎋𡎌𡎍𡎎𡎏𡎑𡎒𡎓𡎓𡎔𡎕𡎖𡎗𡎘𡎙𡎛𡎜𡎝𡎞𡎟𡎠𡎡𡎣𡎤𡎧𡎨𡎩𡎪𡎪𡎫𡎭𡎮𡎯𡎰𡎱𡎲𡎳𡎴𡎵𡎶𡎷𡎸𡎹𡎺𡎻𡎼𡎽𡎾𡎿𡏀𡏀𡏁𡏂𡏃𡏄𡏅𡏆𡏇𡏈𡏉𡏊𡏋𡏌𡏍𡏎𡏏𡏐𡏑𡏒𡏓𡏔𡏕𡏖𡏗𡏘𡏙𡏚𡏛𡏝𡏞𡏟𡏠𡏡𡏢𡏣𡏤𡏥𡏧𡏨𡏪𡏫𡏬𡏭𡏮𡏯𡏰𡏱𡏲𡏳𡏴𡏵𡏶𡏷𡏸𡏹𡏻𡏼𡏾𡏿𡐀𡐁𡐂𡐃𡐄𡐅𡐆𡐇𡐈𡐉𡐊𡐋𡐌𡐍𡐎𡐎𡐏𡐐𡐒𡐓𡐔𡐕𡐖𡐗𡐘𡐙𡐚𡐛𡐜𡐝𡐞𡐟𡐡𡐢𡐤𡐥𡐦𡐨𡐩𡐪𡐫𡐬𡐭𡐮𡐯𡐰𡐴𡐵𡐶𡐷𡐸𡐹𡐻𡐼𡐽𡐾𡐿𡑀𡑁𡑂𡑃𡑄𡑅𡑆𡑇𡑋𡑌𡑍𡑎𡑏𡑐𡑑𡑓𡑕𡑖𡑗𡑘𡑙𡑛𡑜𡑝𡑞𡑟𡑠𡑡𡑣𡑥𡑩𡑪𡑫𡑫𡑬𡑭𡑮𡑯𡑰𡑱𡑲𡑳𡑴𡑵𡑶𡑷𡑸𡑹𡑺𡑻𡑼𡑽𡑾𡑿𡒀𡒁𡒂𡒃𡒄𡒅𡒆𡒇𡒈𡒉𡒊𡒋𡒌𡒍𡒎𡒏𡒐𡒒𡒔𡒕𡒖𡒗𡒘𡒘𡒚𡒛𡒜𡒝𡒞𡒟𡒠𡒡𡒢𡒣𡒣𡒤𡒦𡒧𡒨𡒫𡒬𡒭𡒮𡒯𡒰𡒱𡒲𡒲𡒴𡒷𡒸𡒹𡒻𡒼𡒽𡒽𡒽𡒽𡒾𡒿𡓀𡓁𡓂𡓃𡓄𡓅𡓇𡓈𡓊𡓋𡓌𡓍𡓎𡓏𡓐𡓑𡓓𡓔𡓕𡓘𡓙𡓛𡓜𡓝𡓞𡓟𡓠𡓡𡓣𡓤𡓥𡓦𡓧𡓨𡓨𡓩𡓪𡓫𡓬𡓭𡓯𡓰𡓱𡓲𡓳𡓴𡓶𡓸𡓹𡓺𡓻𡓼𡓽𡓾𡓿𡔀𡔁𡔂𡔃𡔄𡔅𡔆𡔇𡔈𡔉𡔊𡔋𡔌𡔍𡔎𡔏𡔐𡔑𡔒𡔓𡔔𡔕𡔖𡔗𡔘𡔘𡔚𡔪𡔸𡔼𡕟𡕼𡖘𡚛𡚳𡝇𡟽𡠘𡢝𡢯𡧪𡨊𡩳𡩿𡫑𡫚𡫻𡫼𡳈𡴛𡴠𡸼𡹆𡹥𡺻𡻽𡿤𢉉𢉬𢉰𢊃𢋓𢎳𢐉𢐽𢑃𢓂𢓸𢕂𢖋𢖽𢘪𢘰𢙧𢚬𢟎𢟵𢥼𢦾𢧑𢨀𢨫𢩿𢬋𢬹𢬹𢭭𢳌𢴯𢵇𢹥𢻞𣂓𣂲𣆷𣈐𣉊𣉓𣊝𣌷𣏄𣏅𣐍𣒮𣒻𣕑𣕝𣖭𣗃𣗢𣣑𣥲𣧅𣪝𣱒𣲾𣳃𣳊𣳤𣴧𣵒𣵭𣵹𣶥𣷆𣸡𣹽𣽔𣾯𣿷𤀟𤁉𤃁𤅽𤈔𤍢𤎆𤏍𤏯𤐈𤑆𤒲𤔗𤕿𤕿𤞷𤡝𤣰𤥷𤧕𤧠𤧡𤨱𤪣𤪯𤬪𤮔𤲲𤵞𤶚𤷁𤾐𥂁𥃾𥆮𥇞𥈻𥉢𥌬𥎚𥏰𥏷𥒯𥓩𥙭𥙰𥙲𥚐𥛡𥛿𥜦𥝟𥟚𥟯𥟯𥣷𥣺𥤧𥨠𥩸𥪺𥫍𥫦𥬻𥭃𥭧𥮶𥱆𥴀𥴾𥸮𥹿𥻎𥼎𥼎𥾘𥿔𥿚𦀰𦂙𦆶𦇇𦇲𦉷𦌋𦍒𦍚𦍮𦎉𦎉𦏍𦏚𦏡𦒭𦖅𦖅𦖜𦚙𦛏𦛠𦜔𦞥𦢃𦤴𦦋𦦍𦨿𦩄𦩄𦩱𦫒𦯀𦯖𦰶𦱬𦲃𦸧𦹨𦿳𧁚𧆖𧋗𧋧𧋭𧋮𧍽𧏁𧏔𧐷𧑢𧒐𧒨𧔊𧔹𧗥𧝪𧟯𧟿𧡂𧢚𧨅𧨙𧨙𧨚𧩆𧭖𧭩𧯣𧯧𧰁𧷀𧸳𧺔𧻡𧻼𧽭𨁠𨅣𨎜𨐧𨑉𨑒𨑡𨓱𨓱𨔎𨕸𨖫𨖽𨗣𨗤𨗤𨗭𨗵𨘥𨙀𨙭𨛘𨢔𨦤𨧓𨨁𨨾𨨾𨪄𨯐𨶴𨶾𨷅𨷭𨹛𨹡𨹸𨻊𨻋𨻏𨻐𨻼𨼰𩁢𩁬𩁮𩁲𩃇𩇎𩊲𩊲𩏟𩓊𩛹𩝘𩞔𩟌𩡶𩣛𩪝𩫊𩫽𩴴𩵘𩵚𩿆𪉖𪉹𪋻𪓴𪔄𪔋𪔌𪠶𪢱𪢲𪢴𪢴𪢵𪢶𪢷𪢸𪢹𪢺𪢻𪢼𪢽𪢾𪢿𪣀𪣁𪣂𪣃𪣄𪣅𪣆𪣇𪣈𪣉𪣊𪣋𪣌𪣍𪣎𪣏𪣐𪣑𪣒𪣓𪣔𪣕𪣖𪣗𪣘𪣙𪣚𪣛𪣜𪣝𪣞𪣟𪣠𪣡𪣢𪣣𪣤𪣥𪣦𪣧𪣨𪣩𪣪𪣫𪣬𪣭𪣮𪣯𪣰𪣲𪣳𪣴𪣵𪣶𪣷𪣸𪣹𪣺𪣻𪣼𪣾𪣿𪤀𪤁𪤂𪤃𪤄𪤅𪤆𪤇𪤈𪤉𪤊𪤋𪤌𪤍𪤎𪤏𪤐𪤑𪤒𪤓𪤔𪤕𪤖𪤗𪤘𪤙𪤚𪤛𪤝𪤞𪤟𪤠𪤡𪤢𪤣𪤤𪤥𪤦𪤧𪤨𪤩𪤪𪤫𪤬𪤭𪤮𪤯𪤰𪥓𪧕𪨽𪩙𪫞𪱑𪳸𪴸𪵉𪶇𪸇𫅢𫇲𫇾𫈠𫈲𫊎𫊥𫏷𫒕𫒕𫒜𫕇𫕞𫝟𫝠𫟨切壮城埴堍墬湮㴳𨗭𫡢𫥢𫧀𫭖𫭗𫭘𫭙𫭚𫭛𫭜𫭝𫭞𫭟𫭠𫭡𫭢𫭣𫭤𫭥𫭦𫭧𫭨𫭩𫭪𫭫𫭭𫭮𫭯𫭰𫭱𫭲𫭴𫭵𫭶𫭷𫭸𫭹𫭺𫭻𫭼𫭽𫭾𫮀𫮁𫮂𫮃𫮄𫮅𫮆𫮇𫮈𫮊𫮌𫮍𫮎𫮏𫮐𫮑𫮒𫮓𫮔𫮕𫮖𫮗𫮘𫮙𫮚𫮛𫮜𫮝𫮞𫮟𫮠𫮡𫮢𫮤𫮦𫮧𫮨𫮩𫮪𫮫𫮬𫮮𫮯𫮰𫮲𫮳𫮴𫮵𫮶𫮸𫮹𫮺𫮻𫮼𫮽𫮾𫮿𫯀𫲵𫳈𫴧𫸹𫻃𫽏𬄊𬅆𬌅𬌳𬖻𬞄𬡃𬫎𬯄𬯇𬯔𬯫𬲤𬴸𬶂",
 "丿": "丆丢丷乇么乊乏乒兎凢刃升叐呂埓壬夭失少屲币幑幷幷庅弟悤朱氕熈玍甪睾第簒系胤舧虱血鎫閁面靣㷗㷩㻄䖝𠀅𠀆𠀗𠁽𠂉𠂌𠂒𠂓𠂓𠂕𠂗𠂚𠂛𠂝𠂞𠂟𠂠𠂥𠂧𠂨𠂲𠂶𠂸𠃁𠃕𠄒𠄛𠆥𠇓𠌐𠌞𠍸𠎗𠒍𠒭𠔙𠗎𠘦𠙬𠙱𠚟𠛦𠛻𠞔𠠲𠣐𠤎𠤣𠦚𠦬𠧻𠧻𠧻𠧻𠩯𠩶𠫱𠬵𠭡𠭧𠮮𠰗𠰨𠳜𠴯𠴿𡅴𡈼𡉍𡊥𡌨𡍮𡍴𡍺𡎄𡏍𡒏𡖭𡖸𡘠𡜞𡟉𡟮𡢛𡥇𡯃𡰹𡴓𡿻𢁛𢂨𢂨𢂬𢃁𢄰𢆾𢆾𢊵𢎐𢐝𢐩𢑗𢘗𢙦𢤚𢨾𢩶𢪙𢪺𢪼𢫢𢬽𢭡𢮆𢯃𢰛𢱎𢳓𢴞𢶁𢶢𢼡𢽛𢿔𢿹𣁽𣅬𣆢𣏮𣐗𣐪𣓡𣗨𣥋𣧒𣬌𣭣𣱱𣲛𣳛𣴪𣶧𣹀𤃕𤆒𤉝𤉱𤋅𤎏𤚞𤧯𤭘𤴮𤵮𤷞𤽄𤽪𥃄𥅉𥅕𥒶𥓓𥔝𥛄𥜻𥞉𥟑𥟯𥟰𥠐𥠖𥠗𥢰𥥜𥨩𥨫𥩎𥪄𥪎𥬘𥭥𥺛𥼟𥾔𥿈𥿔𥿢𦀣𦀩𦈤𦐷𦒢𦓐𦓤𦙍𦚃𦜉𦥙𦨊𦨸𦬐𦭞𦭾𦱼𦶽𦿺𧎤𧏝𧔏𧕠𧖍𧘰𧚎𧚡𧛲𧤬𧦎𧦖𧦶𧦻𧯔𧱸𧲶𧴺𧼆𨁓𨉄𨌦𨐙𨓱𨔹𨖼𨘡𨘩𨙑𨚄𨡞𨤟𨬹𨱩𨱳𨷸𨹤𩅧𩅧𩊤𩑎𩕇𩗝𩚿𩡨𩡬𩢁𩢚𩣛𩤻𩩙𩯙𩾑𪏾𪓑𪥌𪦂𪩲𪭞𪲆𪲆𪵻𪶓𪸰𪽆𫀖𫀦𫀫𫂱𫃛𫌃𫒀𫝂𫝄𫝆𫝸𫞘屮𢬌𫡏𫡕𫢤𫤘𫤭𫯛𫾾𬆣𬓡𬗋𬗜𬗷𬛮𬛮𬫋",
 "𠂇": "冇厷友右左布有灰㔫䘠𠂟𠣌𠩮𠮮𠯛𡉄𡥂𡥉𡧞𡭡𡾎𢁛𢆐𢗟𢘪𢚮𢦛𢳓𣶨𤽖𥠇𦍸𦜤𦯞𦰅𧈠𧊝𨊦𨢀𨱩𫞏廾炭𫦫𫴢𬆶𬢚",
 "丷": "乊产兑兰关兽兾商啇夔并弚总旁曽竒酋㒸㒺𠂟𠂴𠆘𠊍𠒁𠒇𠔃𠔄𠘵𠩖𠫄𠬠𠭶𠮦𠴣𡇏𡇤𡇬𡇷𡈤𡐁𡘔𡙨𡢧𡰤𡱨𡲞𡳗𢀝𢁰𢂇𢆉𢌡𢍋𢛹𢞹𢧂𢮪𢽑𣎘𣏎𣚱𣣔𣳍𣾌𦌖𦯺𦲳𦾲𧔭𧢪𧧤𧷭𧿪𪞌𪪰𪺡𪺡𫃨𫇥𫝍𫟈𫢊𫤳𫭒𬅅𬈃𬎿",
 "乚": "乢乣乨乩乱乳乵乹乿亃亄劜孔扎札玌癿礼糺羌胤臫虬軋轧釓钆齓㐖䯆䰲䵝𠃔𠃦𠃪𠃾𠄂𠋃𠒞𠜰𠤎𡘁𡛆𡧞𡮒𢨤𣑌𣳌𤖨𤚌𥝏𥫥𥭙𥾴𦙌𦚃𦟩𧲠𩾐𪓤𪖐𪚨𪜃𪜕𪟨𫄙𫠠𫩙𬧠𬷻",
 "臼": "兒帠揑桕毀毁獡舀舁舅舊裒閰齨㖬㧮㳫䊆䑔䑕䑖䑗䑘䢅䳎䳔𠒍𠜃𠲼𠹠𠽅𠾌𡀭𡁫𡃂𡘑𡘩𡚒𡞄𡞉𡞲𡡼𡢝𡨯𡩔𢝘𢞦𢰖𢰻𢶽𢾌𣆫𣇀𣉃𣔈𣕕𣜌𣝐𣤑𣤒𣪷𣫏𣫩𣺅𤊓𤑠𤕗𤘈𤜏𤟚𤡡𤡯𤢧𤦆𤫅𤮯𤻯𥃔𥇩𥊎𥋺𥜞𥨗𥨥𥽱𦀥𦃨𦌆𦑹𦒟𦖙𦖚𦖳𦥖𦥗𦥚𦥜𦥝𦥞𦥟𦥠𦥡𦥣𦥦𦥧𦥨𦥩𦥪𦥬𦥭𦥰𦥱𦥴𦥶𦥻𦥽𦦂𦦄𦦅𦦆𦦇𦦈𦦋𦦐𦦖𦦢𦦣𦦦𦦦𦦰𦦹𦦽𦦾𦭻𦲪𦷚𦽜𦽭𧌤𧔱𧞂𧤑𧧖𧮏𧳈𧹇𨋺𨟋𨩤𨪫𨭾𨾹𨿀𩐽𩒦𩘦𩢹𩣅𩶧𩶿𪓢𪠨𪡢𪡲𪪸𫀕𫇒𫍈𫡹𫴔𫿘𬋓𬍊𬛸𬛹𬛾𬵼𬷥𬷪",
 "乙": "乞乤乥乧乪乫乬乭乮乯乲乴乶乷乺乻乼乽乾亿忆戹朰氹穵肊艺釔钇鳦㐇㐈㐉㐊㐋㐍㐎㐏㐐㐑㐒㐓㐔㐕㐗㐘㐙㐚㐛㐝㐞㐟㐠㐢㐣㐥㐦㲸䎲𠀂𠃐𠃐𠃗𠃘𠃝𠃡𠃣𠃮𠃯𠃷𠃺𠃻𠄈𠄈𠒍𠘷𠧒𠫕𠮙𠮞𠯏𠯡𠰆𡆠𡉛𡴄𡴭𡴯𡶃𢇒𢒼𢖮𢩥𢩧𢪞𢭖𢼁𢼚𣄻𣄽𣎷𣢛𣱪𣲁𤓱𤓴𤝤𤤜𤴥𥐬𥑄𥘆𥝎𥸽𥾨𦓪𦘸𦨇𦱼𧈝𧉵𧠞𧥷𧰦𧺞𧿎𨑵𨥊𨦤𨩾𨸛𨸵𨸷𩉟𩑡𩑨𩚋𩚤𩚬𩡹𩾤𩾻𩿆𪐘𪜐𪜑𪜒𪜓𪜘𪜚𪵖𪸍𫂄𫘸𫚮𫡢𫡣𫡥𫡨𫡪𫡫𫡭𫡮𫡯𫤾𫭖𫰆𬖋𬨖𬸺",
 "⺌": "光唢尚当琐锁𠂠𠋜𠘽𠙘𠡱𡆓𡏶𡐃𢦢𢽆𣣽𤋩𥇫𥡎𦄪𦡎𦮚𦽗𧈘𨤾𨴇𩓍𫝃𫦁𫼶",
 "丂": "亏兮号咵巧攷朽汅澚甹考㕺㱙㽲䀎䒓𠀅𠀩𠂠𠄃𠄄𠄊𠄋𠄚𠔃𠔠𠘵𠡐𠣬𠫫𠵛𡐟𡞄𡞲𡪑𢎰𢔐𢚹𢩨𢰻𢽥𣏓𣑂𣓓𣔮𣘒𣙾𣪒𣻵𤈰𤍺𤏓𤑼𤒫𤓹𤙀𤲀𤼮𥀿𥇩𥏃𥝑𦉀𦉅𦔲𦖄𦖙𦖛𦖳𦘰𦘱𦥚𦭃𦰅𦴾𦹛𦻏𧆜𧆪𧆶𧇊𧖨𧚗𧝰𧦻𧨄𧩛𧭕𧽰𧿉𧿪𨉂𨉯𨚛𨥟𨦜𨩤𨸑𨹯𨼟𨿁𩂾𩑕𩢣𩨗𩶍𪋽𪐚𪦁𪵭𫀕𫀫𫒀𣾎𫢆𫨲𫩐𫯯𫱦𫹫𫻦𬵁",
 "丶": "丷主丼丽丽乓兎兔凡刅勺卞卪叉发圡太嬔戍曵朮术氐氷炿玊良萈㕻㣺㭟䂖𠀋𠀕𠀖𠁖𠁖𠁼𠁼𠁼𠁽𠂘𠂭𠂭𠂭𠂭𠃠𠃠𠆱𠇂𠇞𠕉𠕍𠕘𠕘𠕘𠕜𠛂𠛦𠤶𠧉𠨖𠨖𠨗𠨙𠭧𠭧𠭧𠮈𠮚𠱪𠱵𠲙𠳜𠳸𠶩𠶰𠼁𡈽𡋶𡌾𡕞𡖴𡖸𡚦𡜐𡠁𡥏𡩕𡮼𡴔𡵁𡷉𢁡𢄕𢄕𢅃𢌤𢌭𢍺𢎚𢎛𢎬𢘚𢞤𢡷𢩀𢬠𢬪𢯂𢱄𢳻𢶢𣎱𣏣𣐛𣐠𣥑𣧇𣨃𣷧𤉮𤐎𤟛𤥦𤫒𤶉𤽕𥐲𥑗𥑣𥒹𥕙𥕩𥙤𥞯𥤬𥦱𥱞𥲬𥳁𥺁𥾠𦍑𦘥𦘦𦜟𦪻𦭊𦮟𦲛𧇢𧈋𧈒𧎉𧏃𧔓𧘵𧳯𧼧𧾇𧿏𨌝𨒳𨡥𨥀𨥪𨥪𨥪𨦐𨨈𨪣𨬁𨱪𨺴𩹦𩾅𪜅𪜅𪜊𫆘𫙭𫙭𫝇𫝢𫝣𫝲𫞕𫞖𫞟𫞯丸兔刃博𫥯𫦘𫧔𫶿𬂢𬌩𬛻𬠽𬮽𬷛",
 "𦉫": "𦊉𦓐𫥒",
 "丯": "䥹𠂖𡕗",
 "一": "丆丒丕丙丛丞丟丠丽举亍亏亐亓亘元光再冡勧呉咵坙壽天妛媺巠巺帀应开弌弐弖戌挙旦榉正气灭爰獣画畏畫疟痖百睿葘蕐蚩誉輺辷鍿閂闩霊面靣鰴黴㐀㒷㔐㕡㕢㝉㝙㝟㞢㢧㢲㤪㦯㪽㱏㲊㴴㶾䘗䜭䥧䪥䮥𠀀𠀂𠀇𠀇𠀉𠀏𠀐𠀒𠀓𠀔𠀙𠀙𠀛𠀜𠀜𠀞𠀞𠀡𠀢𠀣𠀣𠀤𠀦𠀮𠀯𠀸𠀹𠀺𠁉𠁖𠁖𠂉𠂋𠂌𠂏𠂖𠂴𠂶𠂽𠃞𠃻𠃻𠃻𠄞𠄞𠄟𠄟𠄠𠄠𠅊𠆀𠆏𠆣𠆦𠆮𠇅𠇸𠇾𠈨𠉽𠊍𠊕𠋜𠋜𠋜𠌏𠌐𠌑𠌑𠌝𠎂𠎃𠏑𠏒𠑎𠑶𠑺𠓛𠓤𠓥𠔄𠔏𠔐𠔐𠔓𠔖𠔙𠔛𠔜𠔝𠔞𠔠𠔥𠔩𠔱𠔼𠕅𠖍𠘲𠙃𠙊𠙒𠙗𠙭𠙵𠙿𠚃𠚔𠚕𠚙𠛲𠝌𠝦𠝧𠟱𠠃𠠆𠠧𠢀𠣆𠤫𠦓𠦔𠦠𠦱𠧥𠧥𠨷𠩎𠩽𠫓𠫔𠬡𠭆𠭕𠭗𠭿𠮉𠮍𠮛𠯉𠯏𠯝𠰶𠱎𠱱𠲆𠳉𠳍𠴀𠵠𠶁𠶬𠶵𠷧𠷶𠸃𠸈𠸲𠸵𠹿𠺞𠻰𠻸𠼜𠾂𠿎𡁑𡁗𡂧𡂧𡂧𡄞𡄺𡄿𡅔𡆻𡇆𡇭𡉊𡉚𡉛𡉬𡉶𡋫𡋮𡌥𡍙𡍙𡍠𡎄𡏀𡏶𡐜𡐢𡐪𡐪𡒚𡔈𡔓𡔓𡔫𡔽𡕄𡕢𡕣𡕻𡖸𡗓𡗰𡗿𡘋𡘋𡘟𡘟𡚀𡛎𡜈𡝄𡝕𡝕𡝕𡠡𡡜𡡜𡡵𡢓𡣰𡤚𡤼𡤽𡥺𡧂𡧃𡧆𡧐𡧤𡧧𡧴𡧹𡨆𡨈𡨈𡨴𡩂𡩅𡩟𡩦𡩦𡩬𡩲𡪀𡪀𡪊𡪕𡪗𡫖𡫧𡭆𡭓𡭕𡯊𡯹𡱮𡲡𡴊𡴍𡴒𡴓𡴪𡴪𡴪𡵂𡵐𡵤𡵮𡶳𡷒𡸃𡻛𡿱𡿴𡿸𢀝𢀫𢁌𢁴𢂇𢂉𢂉𢂛𢄄𢄅𢅢𢅽𢆰𢆺𢉔𢊤𢋢𢌬𢍦𢍼𢍾𢎈𢎰𢎲𢎶𢐍𢐝𢑅𢑕𢑞𢒵𢔉𢕄𢕧𢕶𢖣𢖨𢗍𢗥𢗶𢘑𢘖𢙂𢚍𢚹𢛢𢛢𢛳𢝤𢞹𢟸𢡍𢡤𢢎𢥡𢦌𢧯𢨖𢨥𢩯𢪁𢪕𢪙𢬌𢬮𢭈𢭡𢮦𢰁𢰅𢰎𢱂𢱎𢱱𢱱𢱵𢱽𢳖𢳖𢳗𢴕𢶘𢸂𢸉𢹰𢼕𢼸𢾵𢾵𢾷𢿡𣀌𣀭𣀰𣀰𣀿𣀿𣂟𣂱𣂼𣃒𣄪𣄼𣅆𣅎𣅐𣅧𣅧𣅱𣆃𣇎𣇥𣇥𣈆𣈆𣉓𣉣𣊨𣌃𣌬𣍟𣍡𣎶𣏄𣏇𣏓𣏵𣐣𣐫𣑨𣒪𣒯𣒯𣖩𣖭𣗂𣗂𣗊𣘰𣘰𣙶𣝿𣞉𣞱𣞹𣠙𣠣𣠪𣡟𣢑𣣂𣣽𣤂𣤏𣤬𣤽𣥋𣦊𣦋𣦋𣦋𣦋𣧒𣩌𣫠𣮚𣯣𣯰𣰱𣱗𣱪𣱲𣱳𣲅𣲅𣲇𣲔𣴵𣴸𣵊𣵊𣵊𣵨𣵨𣵭𣶖𣷼𣸑𣹎𣹹𣺣𣺧𣻔𣼂𣼃𣼗𣽀𣽊𣽐𣿠𣿶𤀭𤀹𤁁𤂡𤃁𤃒𤃚𤄚𤆂𤇟𤈂𤈆𤈲𤉑𤉑𤉴𤊌𤊪𤌑𤍞𤍞𤐫𤑻𤑻𤑻𤒾𤔇𤔳𤕜𤕫𤕬𤕶𤖈𤖠𤖤𤘉𤘔𤘳𤙊𤜚𤝃𤞈𤞸𤞸𤟺𤠦𤡛𤣪𤣪𤤈𤧺𤧺𤧽𤨔𤩅𤩡𤩩𤩷𤪖𤬡𤬮𤯏𤯔𤯼𤰓𤰫𤰴𤰵𤱴𤲇𤲡𤲯𤳍𤳏𤳣𤳹𤵋𤶄𤶰𤺠𤺡𤻣𤽋𤽔𤽧𤾑𤾤𥀋𥀡𥁋𥃉𥄂𥄆𥄊𥄙𥄝𥅏𥇥𥇫𥈠𥈣𥌄𥌝𥍌𥍝𥎨𥏃𥏈𥐬𥐺𥒑𥕾𥖂𥘠𥘢𥙠𥜫𥝍𥝮𥟳𥡑𥢣𥣱𥨗𥩟𥪽𥫀𥫈𥬂𥮸𥯐𥯗𥲓𥵋𥵘𥶉𥷞𥸽𥻪𥼦𥼦𥽖𥾨𥾬𦀞𦀞𦀥𦂲𦄪𦅽𦆊𦇌𦇐𦇳𦈄𦈮𦉅𦉯𦊷𦋶𦍝𦍿𦐉𦑾𦑾𦓁𦕇𦕮𦘵𦙐𦙘𦙠𦙻𦚑𦜒𦜷𦝵𦞋𦞥𦟭𦟭𦟭𦟴𦠟𦡎𦢋𦢕𦢖𦣁𦣶𦤁𦤴𦥩𦦟𦦫𦦲𦧆𦨀𦨠𦩛𦬋𦬜𦬴𦭢𦭱𦮄𦮅𦮆𦮈𦮚𦯫𦰧𦰨𦱗𦱩𦱯𦱴𦲯𦳪𦴐𦴾𦸧𦸨𦸨𦹓𦻍𦼘𦽙𦽱𦾒𦿧𧀈𧀈𧁇𧁛𧁝𧁡𧄖𧅱𧆜𧆳𧆶𧆾𧇊𧇩𧈯𧉋𧉛𧋰𧏬𧒘𧒙𧓠𧕁𧕁𧖬𧗡𧗬𧘛𧘫𧘾𧙒𧙵𧛴𧜬𧟈𧟠𧟡𧟲𧠊𧢖𧢨𧣎𧣰𧣰𧥭𧥳𧥷𧦒𧦚𧦯𧦶𧨄𧨌𧨦𧩄𧩿𧫭𧬭𧭪𧮁𧮸𧯖𧰁𧰬𧰳𧱖𧱖𧲒𧳔𧳔𧴷𧵇𧵹𧶌𧷈𧷎𧷷𧸩𧹄𧺐𧺞𧺦𧼉𧼉𧼢𧾴𧾸𧿉𧿊𧿋𧿠𨂳𨇋𨇔𨊢𨊪𨊬𨋇𨌷𨌻𨎾𨏇𨏐𨐀𨐀𨑼𨓶𨓷𨔬𨕬𨗶𨙑𨙘𨚄𨚏𨚛𨚸𨛆𨜃𨝶𨝶𨞈𨞍𨞤𨞿𨠀𨡞𨣩𨤣𨤾𨥀𨥊𨥩𨦌𨦐𨩸𨫝𨬠𨬴𨭀𨭋𨮷𨯺𨰐𨱗𨱘𨴂𨴇𨴇𨴉𨴙𨵑𨵑𨵣𨷗𨸛𨸞𨸴𨸵𨹢𨹩𨹯𨻋𨻦𨽫𨽫𨽫𨽴𩁬𩄀𩄪𩇳𩉶𩊼𩑕𩑡𩒭𩔿𩕂𩕨𩕨𩕨𩕨𩕨𩕨𩕻𩖂𩙞𩚞𩚤𩛀𩜹𩞒𩠺𩡹𩢣𩢩𩤰𩦁𩦣𩧙𩨗𩨤𩫎𩰬𩰽𩲬𩵷𩼾𩼿𩽯𩾏𩾻𩿌𩿒𪂐𪅈𪉙𪐪𪑛𪖩𪚨𪜂𪜃𪜆𪜈𪜨𪟊𪠐𪡽𪢙𪥍𪥲𪧅𪨉𪪘𪭉𪭚𪮵𪯆𪴊𪴲𪽉𫂥𫈤𫌹𫎅𫎇𫏁𫑀𫑚𫑣𫔸𫖌𫚃𫜢𫝂𫝃𫝆𫝌𫞄𫞄𫟋𫟝丽丽具𠔜再勺晉杓𣾎異𥐝福𫠠𫠡𫠦𫠨𫠩𫡃𫡙𫡴𫡴𫡹𫡹𫢅𫢑𫢽𫣋𫤭𫤰𫤸𫥟𫥪𫥮𫦤𫦥𫨧𫩞𫬯𫭱𫯆𫰗𫳂𫳤𫳥𫵩𫷡𫹆𫹸𫹹𫺄𫺙𫽛𫽻𫾜𫿂𬂍𬂓𬂜𬇝𬍿𬎗𬎜𬏚𬐃𬒖𬓭𬔠𬕣𬛂𬜻𬝛𬞏𬞏𬢝𬦺𬪹𬫆𬮷𬱋𬲈𬴛𬴳𬵯",
 "口": "亨享京亭亮亯亳亴侃倉僉僉兄兺冋加卟古句另叧叨叩叫召叭叮台叱右叴叵叶号叹叺叻叼叽叾叿吀吁吂吃各吅吅吆吇吉吊吋同名后吐吒吓吔吕吕吖吗吘吙吚君吜吝吞吟吠吡吢吣吤吥否吧吨吩吪含听吭吮启吰吱吲吴吵吶吷吸吹吺吻吼吽吾吿呀呁呂呂呃呅呆呇呈呉告呋呌呍呎呏呐呑呒呓呔呕呖呗员呙呚呛呜呝呞呟呠呡呢呣呤呥呦呧呩呪呫呬呭呮呯呰呱呲味呴呵呶呷呸呹呺呻呼呾呿咀咁咂咃咄咅咆咇咈咉咊咋和咍咎咏咐咑咓咔咕咖咗咘咙咚咛咜咝咞咟咠咡咣咤咥咦咧咨咩咪咬咭咮咯咰咱咲咳咴咵咶咷咸咹咺咻咼咽咾咿哀品哂哃哄哅哆哇哈哉哊哋哌响哎哏哐哑哒哓哔哕哖哗哘哙哚哜哝哞哟哠員哢哣哤哦哧哨哩哪哫哬哮哯哰哱哲哳哴哵哶哷哸哹哺哻哼哽哾唀唁唂唃唄唅唆唇唈唉唊唋唌唍唎唏唑唒唓唔唕唖唗唘唙唛唝唞唟唠唡唢唣唤唥唦唧唨唩唪唫唬唭售唯唰唱唲唳唴唵唶唷唸唹唺唻唼唽唾唿啀啁啂啃啄啅啈啉啊啋啌啍問啐啑啒啓啔啕啖啘啚啛啜啝啞啠啡啢啣啤啥啦啧啨啩啪啫啭啮啯啰啱啲啳啴啵啶啷啸啹啺啻啼啽啾啿喀喁喂喃善喅喇喈喉喊喋喍喎喏喐喑喒喓喔喕喖喗喘喙喚喛喜喝喞喟喠喡喢喤喥喧喨喩喫喭喯喰喱喲喳喴喵喷喹喺喻喼喽嗀嗁嗂嗃嗄嗅嗆嗈嗉嗊嗋嗌嗍嗎嗏嗐嗑嗒嗓嗔嗕嗖嗗嗘嗙嗚嗛嗜嗝嗞嗟嗡嗢嗤嗥嗦嗨嗪嗫嗬嗭嗮嗯嗰嗱嗲嗳嗴嗵嗶嗷嗸嗹嗺嗻嗼嗽嗾嗿嘀嘁嘂嘂嘂嘂嘃嘄嘅嘇嘈嘊嘋嘌嘍嘎嘐嘑嘒嘓嘔嘕嘖嘘嘙嘚嘛嘜嘝嘞嘟嘠嘡嘢嘣嘤嘥嘧嘨嘩嘪嘫嘬嘭嘮嘯嘰嘱嘲嘳嘴嘵嘶嘷嘸嘺嘻嘽嘾嘿噀噁噂噃噄噅噆噇噈噉噊噋噌噍噎噏噑噒噓噔噕噖噗噘噙噚噛噜噝噞噠噡噢噣噤噥噦噧噪噫噬噭噮噯噰噱噲噳噴噵噶噷噸噹噺噻噼噾噿嚀嚁嚂嚃嚄嚅嚆嚇嚈嚉嚊嚋嚌嚍嚎嚏嚐嚑嚒嚓嚔嚕嚖嚗嚘嚙嚛嚜嚝嚟嚠嚡嚤嚥嚦嚧嚨嚩嚪嚫嚬嚯嚰嚱嚵嚶嚷嚸嚹嚺嚻嚻嚻嚻嚼嚽嚾嚿囀囁囃囄囆囇囈囉囋囌囎囐囑囒囓囔囕囖回塩夻如害总悤戓扣旕杏楍楍楍毫沿滘焏獣畗盬知稁耉船莻蒊薧虽衞豪足軎轡辔邉釦鉛铅问霝霝霝高高鳴鸣㐔㐰㑨㔯㕣㕤㕥㕦㕧㕨㕩㕪㕫㕬㕭㕮㕯㕰㕱㕲㕳㕴㕵㕶㕷㕸㕹㕺㕺㕼㕽㕾㕿㖀㖁㖂㖃㖄㖅㖆㖇㖈㖉㖊㖋㖌㖍㖎㖏㖐㖐㖑㖒㖓㖔㖕㖖㖗㖘㖙㖚㖛㖜㖝㖞㖟㖠㖡㖢㖣㖤㖥㖦㖧㖨㖩㖪㖫㖬㖭㖮㖯㖰㖲㖳㖴㖵㖶㖷㖸㖹㖺㖻㖼㖽㖾㖾㖿㗀㗁㗂㗃㗄㗅㗆㗇㗈㗊㗊㗊㗊㗌㗍㗎㗏㗐㗑㗒㗓㗔㗕㗖㗘㗙㗚㗛㗜㗝㗞㗟㗠㗡㗢㗣㗤㗥㗦㗧㗨㗩㗪㗫㗭㗯㗰㗱㗲㗳㗴㗵㗶㗷㗸㗹㗺㗻㗼㗽㗾㗿㘀㘁㘂㘃㘄㘅㘆㘇㘈㘉㘊㘋㘌㘍㘎㘏㘐㘑㘒㘓㘔㘕㘖㘗㘘㘙㘚㘛㘜㠬㫟㮺㮺㮺㲋㷼㽞㽞䋲䎛䑝䑝䛇䞸䮥䯧𠁈𠁤𠃭𠄸𠄸𠅌𠅏𠅖𠅖𠅝𠅠𠅠𠅡𠅭𠅷𠅷𠅸𠅿𠆀𠆂𠆆𠆆𠆊𠆏𠆒𠇙𠇝𠈉𠉇𠉖𠉬𠉬𠊟𠋋𠋑𠋜𠋨𠋨𠋭𠌑𠌜𠎅𠎇𠎤𠎤𠏎𠏘𠐂𠑮𠒠𠔌𠔛𠔠𠕑𠕛𠖍𠖐𠖠𠘀𠙕𠙼𠚃𠚎𠚓𠚗𠚙𠛽𠝛𠝪𠞌𠞍𠞍𠞫𠞫𠟗𠠆𠠆𠣸𠣸𠤇𠤇𠤫𠥅𠥛𠥡𠥡𠥡𠥡𠥲𠦣𠧏𠧏𠧏𠧏𠧰𠧹𠧺𠩰𠪒𠫄𠭀𠭆𠭎𠭎𠭚𠭵𠮘𠮙𠮚𠮛𠮜𠮝𠮞𠮟𠮡𠮢𠮣𠮤𠮦𠮧𠮨𠮩𠮪𠮬𠮭𠮮𠮯𠮰𠮱𠮲𠮳𠮴𠮵𠮶𠮷𠮸𠮻𠮽𠮾𠮿𠯀𠯂𠯄𠯅𠯆𠯇𠯈𠯊𠯋𠯍𠯎𠯏𠯐𠯑𠯒𠯓𠯔𠯕𠯖𠯗𠯘𠯙𠯜𠯝𠯞𠯟𠯠𠯡𠯢𠯣𠯤𠯥𠯦𠯧𠯨𠯩𠯪𠯫𠯭𠯯𠯰𠯱𠯲𠯳𠯴𠯷𠯸𠯹𠯺𠯻𠯼𠯽𠯾𠯿𠰀𠰁𠰂𠰃𠰄𠰅𠰆𠰈𠰉𠰊𠰋𠰌𠰍𠰎𠰏𠰐𠰑𠰒𠰓𠰔𠰕𠰖𠰗𠰘𠰙𠰚𠰟𠰠𠰡𠰢𠰣𠰤𠰥𠰦𠰧𠰨𠰩𠰪𠰬𠰭𠰮𠰯𠰰𠰱𠰲𠰳𠰴𠰵𠰷𠰸𠰹𠰺𠰻𠰼𠰽𠰾𠰿𠱀𠱁𠱂𠱃𠱄𠱅𠱆𠱇𠱈𠱉𠱊𠱋𠱌𠱍𠱎𠱐𠱐𠱑𠱑𠱒𠱓𠱔𠱕𠱖𠱗𠱘𠱙𠱚𠱜𠱞𠱟𠱠𠱠𠱠𠱡𠱢𠱥𠱧𠱨𠱪𠱬𠱭𠱮𠱯𠱯𠱰𠱱𠱳𠱴𠱵𠱶𠱷𠱸𠱹𠱺𠱻𠱼𠱽𠱿𠲀𠲁𠲂𠲂𠲃𠲄𠲅𠲆𠲇𠲈𠲉𠲊𠲋𠲌𠲍𠲎𠲏𠲐𠲑𠲒𠲓𠲔𠲕𠲖𠲗𠲘𠲙𠲚𠲛𠲜𠲝𠲞𠲟𠲠𠲡𠲢𠲣𠲤𠲥𠲦𠲧𠲨𠲪𠲫𠲬𠲮𠲯𠲰𠲲𠲴𠲵𠲶𠲷𠲸𠲹𠲻𠲼𠲽𠲾𠲿𠳀𠳁𠳂𠳃𠳄𠳅𠳆𠳇𠳈𠳉𠳍𠳎𠳏𠳐𠳑𠳒𠳔𠳖𠳗𠳘𠳚𠳛𠳜𠳝𠳞𠳟𠳠𠳡𠳣𠳤𠳥𠳦𠳧𠳨𠳩𠳪𠳪𠳭𠳰𠳱𠳲𠳳𠳴𠳵𠳵𠳶𠳷𠳸𠳹𠳺𠳻𠳼𠳽𠳾𠳿𠴀𠴁𠴂𠴄𠴅𠴆𠴇𠴈𠴉𠴊𠴋𠴍𠴎𠴏𠴐𠴑𠴒𠴓𠴔𠴕𠴖𠴗𠴘𠴙𠴚𠴛𠴜𠴝𠴞𠴟𠴠𠴢𠴣𠴤𠴥𠴧𠴨𠴩𠴪𠴫𠴬𠴭𠴯𠴰𠴱𠴲𠴳𠴴𠴶𠴷𠴸𠴹𠴺𠴻𠴼𠴽𠴾𠴿𠵁𠵂𠵄𠵅𠵆𠵇𠵈𠵋𠵍𠵎𠵏𠵐𠵑𠵒𠵓𠵔𠵖𠵘𠵙𠵚𠵟𠵠𠵡𠵢𠵣𠵤𠵧𠵩𠵪𠵪𠵫𠵭𠵭𠵮𠵯𠵰𠵱𠵴𠵶𠵷𠵸𠵹𠵺𠵻𠵼𠵽𠵾𠵿𠶀𠶁𠶂𠶃𠶄𠶅𠶆𠶈𠶉𠶊𠶋𠶌𠶍𠶎𠶏𠶐𠶑𠶒𠶓𠶔𠶕𠶖𠶗𠶙𠶚𠶛𠶜𠶝𠶞𠶟𠶠𠶡𠶢𠶣𠶤𠶥𠶦𠶧𠶨𠶩𠶪𠶫𠶬𠶬𠶭𠶯𠶲𠶳𠶴𠶵𠶷𠶸𠶹𠶺𠶻𠶽𠶾𠶿𠷀𠷁𠷂𠷃𠷄𠷅𠷆𠷇𠷈𠷉𠷊𠷋𠷌𠷍𠷎𠷐𠷒𠷕𠷗𠷘𠷚𠷝𠷟𠷠𠷢𠷣𠷥𠷦𠷧𠷩𠷪𠷬𠷭𠷯𠷰𠷱𠷲𠷲𠷳𠷴𠷵𠷶𠷷𠷸𠷹𠷺𠷼𠷾𠷿𠸀𠸁𠸂𠸃𠸅𠸅𠸇𠸉𠸎𠸑𠸒𠸓𠸔𠸕𠸖𠸘𠸚𠸝𠸞𠸟𠸠𠸠𠸡𠸢𠸣𠸤𠸥𠸦𠸧𠸨𠸩𠸪𠸬𠸭𠸯𠸰𠸱𠸱𠸳𠸴𠸵𠸷𠸸𠸹𠸺𠸻𠸼𠸽𠸾𠹀𠹁𠹂𠹃𠹅𠹆𠹈𠹈𠹉𠹊𠹋𠹌𠹍𠹎𠹑𠹒𠹓𠹔𠹕𠹖𠹗𠹘𠹚𠹛𠹝𠹞𠹟𠹠𠹡𠹢𠹣𠹣𠹤𠹥𠹦𠹧𠹭𠹮𠹯𠹰𠹱𠹲𠹳𠹴𠹶𠹷𠹸𠹹𠹺𠹻𠹼𠹽𠹿𠺀𠺀𠺁𠺂𠺃𠺄𠺅𠺆𠺇𠺈𠺉𠺊𠺍𠺎𠺏𠺐𠺐𠺑𠺒𠺓𠺔𠺕𠺖𠺗𠺘𠺙𠺚𠺛𠺜𠺝𠺟𠺠𠺡𠺢𠺣𠺤𠺦𠺧𠺨𠺩𠺪𠺫𠺭𠺮𠺰𠺱𠺲𠺳𠺴𠺵𠺷𠺸𠺹𠺺𠺻𠺼𠺽𠺾𠺿𠻀𠻂𠻃𠻄𠻅𠻆𠻈𠻉𠻊𠻌𠻌𠻌𠻌𠻍𠻎𠻏𠻐𠻑𠻒𠻓𠻔𠻕𠻗𠻘𠻙𠻚𠻛𠻜𠻞𠻟𠻠𠻡𠻢𠻣𠻤𠻥𠻦𠻧𠻨𠻩𠻪𠻫𠻬𠻯𠻰𠻰𠻰𠻱𠻲𠻳𠻴𠻵𠻶𠻷𠻸𠻹𠻺𠻻𠻼𠻽𠻿𠼀𠼁𠼂𠼃𠼄𠼆𠼇𠼉𠼊𠼋𠼌𠼍𠼎𠼏𠼐𠼒𠼓𠼔𠼕𠼖𠼗𠼘𠼙𠼚𠼛𠼛𠼛𠼜𠼝𠼟𠼠𠼡𠼢𠼣𠼤𠼥𠼦𠼩𠼪𠼫𠼬𠼭𠼮𠼯𠼲𠼳𠼵𠼶𠼸𠼹𠼺𠼻𠼼𠼽𠼾𠼿𠽀𠽁𠽂𠽃𠽄𠽅𠽆𠽇𠽈𠽉𠽊𠽋𠽌𠽍𠽎𠽏𠽐𠽑𠽒𠽓𠽔𠽕𠽖𠽗𠽙𠽚𠽜𠽜𠽝𠽝𠽞𠽡𠽢𠽣𠽤𠽥𠽦𠽧𠽨𠽩𠽪𠽫𠽬𠽭𠽮𠽯𠽰𠽱𠽲𠽳𠽴𠽵𠽶𠽷𠽸𠽸𠽹𠽺𠽺𠽻𠽽𠽽𠽾𠽿𠾀𠾁𠾃𠾅𠾅𠾆𠾇𠾈𠾋𠾌𠾍𠾎𠾏𠾐𠾑𠾓𠾔𠾕𠾗𠾘𠾙𠾚𠾛𠾜𠾝𠾞𠾟𠾠𠾢𠾣𠾤𠾦𠾧𠾧𠾨𠾩𠾪𠾫𠾬𠾮𠾯𠾰𠾱𠾲𠾴𠾵𠾷𠾸𠾻𠾼𠾽𠾾𠾿𠿀𠿁𠿂𠿃𠿄𠿅𠿆𠿈𠿋𠿌𠿍𠿎𠿎𠿏𠿐𠿑𠿒𠿓𠿔𠿖𠿘𠿙𠿛𠿜𠿝𠿞𠿡𠿢𠿣𠿤𠿥𠿦𠿦𠿧𠿨𠿩𠿪𠿫𠿬𠿯𠿰𠿱𠿳𠿴𠿵𠿶𠿷𠿸𠿹𠿺𠿻𠿼𠿽𠿾𠿿𡀁𡀂𡀃𡀄𡀅𡀊𡀌𡀏𡀐𡀑𡀓𡀓𡀓𡀔𡀕𡀖𡀗𡀘𡀙𡀚𡀛𡀜𡀝𡀞𡀟𡀠𡀡𡀢𡀣𡀤𡀥𡀦𡀧𡀨𡀩𡀫𡀬𡀭𡀮𡀯𡀰𡀲𡀳𡀴𡀵𡀶𡀷𡀹𡀺𡀿𡁀𡁂𡁃𡁄𡁅𡁆𡁇𡁈𡁊𡁌𡁎𡁏𡁐𡁑𡁑𡁒𡁓𡁔𡁕𡁖𡁘𡁘𡁙𡁛𡁝𡁞𡁠𡁡𡁢𡁢𡁣𡁤𡁦𡁧𡁨𡁪𡁫𡁬𡁮𡁰𡁰𡁱𡁲𡁴𡁷𡁹𡁺𡁻𡁼𡁽𡁿𡂀𡂁𡂂𡂃𡂄𡂅𡂆𡂇𡂈𡂉𡂊𡂋𡂌𡂍𡂐𡂑𡂒𡂓𡂔𡂖𡂗𡂘𡂙𡂚𡂛𡂜𡂝𡂞𡂢𡂣𡂥𡂦𡂧𡂧𡂧𡂧𡂨𡂨𡂨𡂨𡂩𡂪𡂫𡂭𡂮𡂰𡂱𡂲𡂳𡂵𡂶𡂸𡂼𡂾𡂿𡃁𡃂𡃃𡃄𡃅𡃆𡃇𡃈𡃉𡃊𡃌𡃍𡃎𡃏𡃐𡃑𡃒𡃓𡃔𡃕𡃖𡃗𡃘𡃙𡃚𡃛𡃜𡃝𡃞𡃟𡃡𡃢𡃥𡃦𡃨𡃩𡃪𡃫𡃫𡃬𡃮𡃰𡃱𡃳𡃶𡃷𡃷𡃸𡃹𡃺𡃻𡃼𡃽𡃾𡃿𡄁𡄃𡄄𡄆𡄇𡄈𡄊𡄋𡄌𡄍𡄎𡄏𡄐𡄑𡄒𡄓𡄔𡄕𡄖𡄗𡄘𡄙𡄛𡄛𡄛𡄛𡄟𡄡𡄢𡄣𡄤𡄥𡄧𡄨𡄪𡄫𡄭𡄮𡄯𡄱𡄴𡄶𡄷𡄸𡄺𡄼𡄽𡄾𡅀𡅁𡅂𡅃𡅅𡅆𡅇𡅈𡅉𡅊𡅋𡅌𡅍𡅎𡅏𡅑𡅒𡅓𡅔𡅔𡅔𡅔𡅗𡅘𡅙𡅛𡅜𡅞𡅢𡅣𡅥𡅦𡅨𡅩𡅪𡅫𡅬𡅭𡅮𡅮𡅮𡅯𡅰𡅴𡅴𡅴𡅴𡅵𡅶𡅷𡅹𡅺𡅻𡅻𡅻𡅻𡅼𡅿𡆀𡆁𡆂𡆄𡆅𡆆𡆈𡆉𡆉𡆉𡆋𡆌𡆍𡆏𡆓𡆕𡆖𡆗𡆘𡆙𡆚𡆜𡆝𡆞𡆟𡇉𡇱𡇾𡈃𡊙𡌍𡎕𡎲𡎲𡏔𡏥𡐄𡑇𡑇𡓛𡓿𡓿𡓿𡓿𡓿𡓿𡔪𡔺𡔽𡕌𡕨𡕨𡕭𡕭𡕴𡕴𡗈𡗈𡘈𡘜𡘜𡙮𡙲𡙲𡚊𡚊𡛱𡜛𡜴𡞐𡞺𡟤𡢓𡢔𡢠𡣍𡤀𡥄𡥕𡦬𡦯𡧱𡧶𡨐𡨑𡩨𡩩𡪕𡪕𡪞𡪭𡫻𡭈𡭈𡭊𡮃𡰔𡰔𡰗𡰜𡰪𡱀𡲍𡴡𡴡𡴩𡴩𡴩𡶸𡷇𡷇𡷮𡸍𡸡𡸡𡸾𡸿𡼚𡼚𡼚𡼚𡿤𡿤𡿷𡿷𢀛𢃋𢃋𢅂𢅱𢆔𢆔𢇞𢉈𢊠𢊴𢊴𢌓𢌡𢍟𢍦𢍦𢍬𢍬𢐆𢐆𢑔𢑿𢑿𢒯𢔹𢕂𢕃𢕒𢕒𢖁𢗀𢙈𢙈𢙟𢙸𢚣𢚤𢚹𢚻𢛃𢜖𢞳𢟚𢠬𢢧𢤙𢤙𢤶𢥓𢦸𢦸𢧂𢧑𢨐𢨐𢨣𢬷𢮺𢯇𢰊𢰊𢰪𢴯𢵖𢵲𢶈𢻣𢾒𢿟𣃓𣄅𣅊𣆉𣆪𣇏𣇒𣈆𣈆𣍔𣎁𣎆𣓷𣔊𣕠𣖞𣘅𣚑𣟏𣟏𣟏𣠌𣠐𣡀𣡀𣡏𣢱𣣂𣣆𣣔𣣦𣤌𣥧𣥧𣥴𣥼𣥼𣪉𣪥𣪾𣫗𣬣𣬦𣬧𣭗𣳀𣳄𣳚𣳤𣳧𣳮𣳮𣵓𣵢𣶚𣶤𣷅𣷢𣸙𣹺𣹽𣹾𣹾𣺓𣺣𣻍𣽃𣾊𣾒𣾭𣾻𣿏𣿟𤀭𤀭𤁟𤃕𤄦𤅗𤅘𤆗𤆨𤈵𤉝𤉵𤋚𤎧𤐯𤐯𤑽𤑽𤒆𤒆𤒒𤔦𤕔𤕦𤕦𤕧𤕧𤘘𤙬𤚮𤚮𤚵𤛒𤛴𤟕𤟜𤟞𤡴𤡴𤣣𤣣𤣣𤣣𤥮𤨃𤨈𤨯𤨻𤨻𤩇𤩈𤩕𤫝𤬕𤬥𤬥𤰑𤲡𤶂𤹫𤹫𤺜𤻢𤾞𤾦𤿌𤿘𤿮𥂁𥂭𥃂𥃓𥃟𥃟𥌉𥌉𥏃𥏏𥏴𥏼𥏾𥐘𥔠𥖊𥙗𥙻𥚝𥚶𥛶𥜘𥜘𥜣𥜭𥜭𥟃𥟮𥢿𥤍𥥎𥦖𥦗𥦫𥦮𥧁𥨈𥩬𥩭𥩶𥩶𥫀𥫀𥫐𥫕𥫕𥫖𥫖𥭚𥭻𥮂𥮪𥮶𥰀𥰫𥰻𥱐𥱟𥱟𥱠𥳨𥵺𥵽𥶀𥸂𥸂𥸑𥸑𥺐𥺳𥻢𥻯𥾴𦀭𦂝𦄊𦄣𦄶𦆇𦇭𦇽𦈯𦈯𦎀𦎙𦎙𦎩𦏂𦏎𦏞𦏥𦏥𦑔𦒛𦒞𦒫𦒯𦒵𦒺𦓃𦓆𦔑𦔻𦗯𦙃𦚽𦛚𦛵𦝕𦝕𦝖𦝠𦝵𦞶𦟀𦠍𦠍𦠕𦡃𦡃𦢮𦢮𦣪𦣬𦦺𦨼𦬅𦮑𦮣𦯾𦰅𦱢𦱫𦲭𦴖𦶹𦷆𦷗𦺚𦻋𦿈𦿈𦿗𦿹𧀎𧃦𧃦𧄿𧅍𧅍𧅒𧆍𧆙𧆱𧆲𧇵𧈐𧈘𧋣𧌀𧍨𧍨𧎎𧐛𧐛𧒘𧒶𧔁𧗮𧘗𧚑𧚱𧚼𧛧𧛪𧛬𧜰𧜰𧟹𧠮𧠮𧤉𧥣𧦎𧦶𧩑𧬭𧭆𧭆𧭫𧭫𧮜𧮜𧰀𧰏𧱄𧱄𧳼𧵐𧵞𧵳𧺚𧾷𨅡𨅧𨈖𨈗𨈴𨉑𨉛𨊗𨍤𨍻𨎂𨎏𨎙𨎙𨏩𨏸𨏸𨐟𨐼𨐼𨑕𨓺𨔃𨔻𨕓𨕓𨕣𨕣𨕸𨖂𨗓𨘿𨘿𨙫𨚨𨜪𨜱𨝶𨝶𨝿𨞍𨞍𨞎𨞥𨞱𨟌𨟌𨡋𨡠𨣊𨤦𨦚𨦳𨧙𨫁𨫘𨫘𨫙𨫙𨫚𨫚𨬂𨬪𨬷𨭞𨭴𨮩𨰒𨰕𨱮𨴽𨻓𨻞𨻟𨼧𨾴𨾴𨿞𩀏𩀏𩀏𩀖𩁂𩁂𩁛𩁛𩂩𩂩𩅐𩅐𩅑𩅑𩅬𩇎𩇎𩇑𩇬𩈞𩍱𩍱𩏍𩐉𩒁𩓶𩘿𩙎𩙎𩛎𩞞𩟸𩟸𩡳𩢟𩦑𩦣𩦻𩨂𩪟𩪩𩫃𩫏𩫖𩫪𩫮𩯠𩰨𩰬𩱀𩲰𩶭𩸠𩹗𩺽𩺽𩻙𩻙𩼊𩼵𩼵𪆑𪉙𪉞𪉫𪉫𪉲𪌸𪐪𪔅𪚩𪜃𪟔𪠲𪠳𪠴𪠵𪠶𪠷𪠸𪠹𪠺𪠻𪠼𪠽𪠾𪠿𪡀𪡁𪡂𪡃𪡄𪡆𪡇𪡈𪡊𪡋𪡌𪡏𪡒𪡓𪡔𪡗𪡘𪡙𪡚𪡛𪡝𪡞𪡟𪡠𪡡𪡢𪡣𪡤𪡥𪡦𪡧𪡨𪡩𪡪𪡫𪡭𪡱𪡲𪡴𪡵𪡶𪡷𪡸𪡹𪡺𪡽𪡾𪡿𪢀𪢁𪢂𪢃𪢄𪢅𪢆𪢉𪢊𪢋𪢌𪢍𪢎𪢐𪢑𪢒𪢓𪢔𪢕𪢖𪢗𪢘𪢙𪢙𪢚𪢜𪢝𪢠𪢤𪢥𪢧𪣈𪤵𪤵𪨘𪩙𪪺𪪾𪫈𪫘𪭦𪮇𪮝𪱳𪵉𪹢𪼨𫂍𫃜𫈕𫊝𫑣𫒯𫕓𫖆𫗘𫘍𫝁𫝘𫝚𫝞𫞆𫟓吆咞吸呈周哶啓善善嘆噑噴𣽞縂䛇𫢁𫣁𫤆𫦲𫧫𫩐𫩑𫩒𫩓𫩔𫩕𫩖𫩗𫩘𫩚𫩛𫩜𫩝𫩟𫩠𫩡𫩢𫩣𫩤𫩥𫩦𫩧𫩨𫩩𫩪𫩫𫩬𫩭𫩮𫩯𫩰𫩱𫩲𫩳𫩴𫩵𫩶𫩷𫩸𫩹𫩺𫩻𫩼𫩽𫩾𫩿𫪀𫪁𫪂𫪃𫪄𫪅𫪆𫪇𫪈𫪋𫪌𫪍𫪎𫪏𫪐𫪑𫪒𫪓𫪖𫪗𫪘𫪙𫪚𫪛𫪜𫪝𫪞𫪞𫪟𫪢𫪤𫪥𫪦𫪧𫪪𫪬𫪭𫪮𫪯𫪰𫪱𫪲𫪴𫪵𫪶𫪷𫪺𫪻𫪼𫪽𫪾𫪿𫫀𫫁𫫂𫫃𫫄𫫅𫫆𫫇𫫉𫫊𫫋𫫍𫫏𫫐𫫒𫫓𫫔𫫕𫫖𫫗𫫙𫫚𫫛𫫜𫫝𫫟𫫠𫫡𫫢𫫣𫫤𫫥𫫦𫫧𫫨𫫩𫫪𫫫𫫬𫫭𫫮𫫯𫫰𫫱𫫲𫫳𫫴𫫵𫫶𫫷𫫸𫫺𫫻𫫼𫫾𫫿𫬀𫬁𫬂𫬃𫬄𫬅𫬆𫬇𫬈𫬉𫬍𫬏𫬐𫬒𫬓𫬔𫬖𫬗𫬘𫬛𫬜𫬝𫬞𫬟𫬠𫬤𫬥𫬦𫬧𫬨𫬫𫬬𫬭𫬱𫬴𫬵𫬶𫬷𫬹𫬺𫬻𫬼𫬾𫬿𫭀𫭁𫭙𫰱𫲄𫲯𫳇𫳢𫳥𫴡𫵁𫵅𫵌𫸧𫹔𫺧𫻶𬃃𬃅𬃓𬃽𬅨𬆦𬆵𬇖𬇡𬉸𬌊𬌎𬐚𬐱𬓂𬔢𬔭𬖏𬖧𬖨𬗎𬙸𬛺𬞒𬡀𬣚𬬪𬯟𬲴𬴘𬴛",
 "儿": "允兄兇先光兊克児兒兕兠匹圥抭灮皃禿竟虎㓁㝶㯶𠁤𠂧𠅙𠊂𠋍𠑶𠑷𠑺𠑻𠑾𠒁𠒆𠒇𠒟𠒧𠒱𠒹𠔲𠖡𠜞𠜧𠠤𠭠𠰽𠴶𠴺𠻦𡁗𡊪𡊫𡋰𡋰𡕩𡙴𡟉𡨍𡬩𡭪𡮡𡴸𡷋𡽀𢂮𢌬𢐍𢑓𢙧𢛹𢞌𢡨𢪢𢬁𢻄𣀋𣁽𣅏𣍥𣏝𣐱𣖓𣛉𣧇𣬜𣱎𣲽𣳸𣴕𣴹𤊓𤘺𤠦𤰯𤱦𤴺𥐸𥞷𥠎𥪰𥫏𥾚𥾳𦄣𦉪𦉿𦎔𦔕𦟣𦡙𦯜𦹿𦼄𧆧𧉡𧊫𧌺𧏩𧑵𧙇𧠆𧠇𧧲𧫘𧫘𧫝𧰍𧳱𧴈𧶜𧷞𨂟𨋠𨑈𨔫𨕟𨚐𨡛𨢄𨮴𨱷𨳻𨽰𨽰𨽰𩑋𩒬𩤖𩦲𩱛𩲆𩳂𩴫𩸟𩹗𩺿𩼵𪛑𪝿𪟟𪽑𪽠𪿔𫒯𠘺免冗𫢤𫤗𫤘𫦘𫶧𫿶𬄒𬈟𬝂𬴾𬵀𬵙𬷼",
 "丨": "候凣引旧羋頥㣠𠀎𠀎𠀣𠀺𠁥𠁬𠁵𠁵𠄱𠆪𠆰𠇬𠉀𠎗𠏇𠏒𠏒𠏒𠒊𠓪𠓪𠓪𠔂𠕬𠘀𠘹𠚆𠜰𠤈𠤈𠤈𠤶𠥡𠧻𠨉𠩍𠫱𠫸𠫸𠫸𠭳𠮝𠰀𠶁𠶁𠶵𠶵𠸱𡌾𡌾𡗔𡗘𡞲𡺛𡻁𡼙𢀈𢆯𢎵𢎺𢏶𢐴𢐴𢐴𢒃𢔜𢔩𢕦𢖃𢖛𢖨𢙧𢤒𢩰𢪽𢰻𢴞𢹎𢹎𣀺𣁒𣂱𣃘𣆪𣉃𣊅𣊆𣌡𣏎𣑞𣟷𣠐𣥑𣵥𣶿𤇐𤇐𤊪𤊪𤍺𤎏𤑼𤔿𤔿𤛙𤯶𤯶𤳋𤶅𤻣𤼽𤽄𥄀𥅀𥙓𥚪𥜞𥜭𥫧𥸖𥻪𦁚𦆊𦆧𦉫𦉫𦖳𦗶𦣺𦥖𦥗𦥚𦦀𦫳𦮃𦱿𦲐𦴲𦻋𧏝𧥞𧲒𧲒𧵫𧷤𨗤𨩤𨮷𨵣𨵣𨵻𨺻𨽭𩇑𩌔𩎏𩏍𩑎𩝨𩝶𩫖𩫗𩫮𩫾𪆍𪆍𪙯𪜈𪟭𪭚𪭚𪲈𫀝𫂱𫎎𫎎𫐞𫑀𫑀𫔘𫔸𫔸𫞘噑𫠦𫡃𫡃𫡄𫡈𫡈𫡊𫡊𫤮𫤳𫥹𫥹𫩏𫰗𫰗𫶧𫹋𫹋𬗷",
 "⺇": "凧凨凩凪凮凰凲㶡䑕䥚𠀺𠁈𠂸𠆰𠘪𠘯𠘱𠘳𠘴𠘵𠘷𠘹𠘼𠘾𠙄𠙈𠙌𠙒𠙔𠙕𠙗𠙘𠙬𠠌𠧋𠧽𠫗𠱰𠾄𡍙𡒑𡔈𡕀𡖆𡙚𡵵𡶺𡸔𡿳𢀂𢀃𢒝𢩰𢭥𢴫𣃲𣆎𣆨𣑲𣛾𣥪𣦂𣳽𣶘𤎞𤔆𥏈𥠢𥡑𥡾𥦻𥶢𦠼𧘺𧙱𧩠𧬽𨥩𨦨𨭾𩂑𩌶𩡫𩮊𩮓𩯓",
 "人": "亥亾仄仌仌从从仧众伡倝僰勽囚庂朲汄畒秂臥认閃閄闪队飤魜㐈㕥㫃㽗䖋𠀔𠀬𠁥𠁮𠁮𠁮𠂹𠂹𠂹𠂹𠆣𠆥𠆦𠆧𠆴𠇌𠇠𠇿𠈏𠈕𠈣𠈽𠉁𠉅𠉒𠉒𠉭𠉭𠉭𠉭𠉭𠊛𠊤𠌈𠌈𠌺𠌺𠍓𠍸𠍸𠎃𠎃𠎃𠎃𠏏𠐱𠔿𠕞𠕞𠚏𠚏𠚕𠚕𠚕𠚕𠠃𠠃𠤈𠤈𠤈𠤈𠤈𠤈𠤭𠥗𠦏𠦏𠦬𠦬𠦬𠦬𠧖𠫙𠭡𠭡𠭡𠭲𡁐𡁐𡉇𡍑𡍮𡍮𡍮𡍮𡔡𡔡𡔡𡗗𡘈𡘖𡘖𡚅𡚅𡟢𡟢𡣼𡣼𡤿𡦼𡨳𡨷𡫬𡯈𡰦𡱲𡱲𡲜𡲜𡲡𡻏𡻏𢀊𢀐𢄮𢆑𢆑𢆑𢊐𢊿𢊿𢋌𢋌𢍩𢍩𢍩𢍩𢎂𢎂𢎢𢎶𢐏𢐑𢐑𢐜𢐴𢐴𢐴𢐴𢐴𢐴𢑲𢒑𢒑𢒜𢓙𢕈𢕈𢘧𢙥𢝑𢡽𢡽𢡽𢡽𢨨𢪽𢪽𢫹𢫹𢬛𢰘𢴞𢴞𢵄𢵄𢵄𢵄𢼱𢼱𣃀𣃀𣃀𣃀𣃨𣃨𣅁𣈩𣈩𣊂𣊂𣊜𣊜𣊦𣊦𣊦𣊦𣍞𣎎𣎎𣏻𣔸𣔸𣟷𣟷𣟷𣟷𣣕𣥐𣥐𣦁𣦁𣦸𣦹𣨦𣨦𣲝𣲝𤇄𤇟𤉯𤉯𤋳𤋳𤎏𤎏𤑼𤑼𤑼𤑼𤗠𤗠𤘻𤛺𤦠𤦣𤦴𤦴𤧰𤧲𤨜𤨜𤨝𤪴𤮩𤮩𤱫𤳋𤳋𤳋𤳋𤻣𤻣𤻣𤻣𤽬𤽬𥀏𥀏𥃂𥃂𥃱𥇮𥇮𥊃𥊃𥏀𥏀𥏀𥑚𥔆𥔆𥔆𥙻𥛕𥦥𥩁𥪐𥪐𥬈𥬈𥮹𥯺𥰽𥱅𥱅𥱩𥲩𥸪𥾺𥾺𦃚𦃚𦃚𦃚𦃚𦄳𦅪𦅪𦅪𦅪𦅪𦅪𦉺𦉺𦊀𦋔𦌤𦌤𦍏𦎅𦎙𦕦𦖴𦘋𦘚𦠗𦠗𦠗𦠗𦠗𦠗𦠡𦠡𦠡𦠡𦢡𦢡𦢡𦢢𦢢𦢢𦣷𦣷𦣷𦣹𦦦𦦭𦨈𦫸𦭗𦮟𦯯𦯯𦯴𦱽𦳸𦵃𦶗𦻃𦻃𧂗𧂗𧆩𧇬𧈁𧈎𧋚𧋚𧌭𧏕𧔭𧗟𧢲𧢲𧤫𧩄𧩄𧩐𧫪𧭪𧭪𧮀𧮀𧲒𧲒𧲒𧲒𧲓𧲓𧲓𧲓𧼥𨀇𨂑𨈦𨈦𨉇𨊤𨍁𨍁𨑢𨑢𨑹𨑹𨗭𨜁𨜁𨜪𨜪𨤫𨤫𨤿𨥀𨪾𨮷𨮷𨮷𨮷𨱗𨸤𨹊𨹊𨽯𨽯𩁰𩁰𩃢𩃢𩅏𩇰𩌔𩌔𩡮𩥾𩥾𩧁𩧁𩧁𩲹𩳰𩻎𩿌𩿕𩿕𪜬𪜱𪜽𪠶𪦛𪧗𪪕𪪜𪸖𪺳𫁴𫇧𫇹𫎀𫝄𫝅𫝸內仌仌刻𤎫𫢍𫶾𬀟𬊓𬖌𬛱𬮘𬲦𬶁",
 "凹": "兕㾎𠈿𠚆𠱃𢍭𧰽𧱃𧱣𩡿𪵲",
 "爿": "壯妝寎寐寢寣寤寱屫戕斨牀牁牂牃牄牅牆狀㝥㝱㝲㸛㸜䆿𡉟𡞓𡩩𡩽𡪁𡪗𡪘𡪶𡪷𡫒𡫔𡫧𡫺𡫽𡬄𡬇𡬊𡬋𡬌𡬍𡬑𡬒𡬓𡬖𡬙𡲆𡲿𢉎𢍿𢪇𢪫𤕫𤕬𤕭𤕮𤕯𤕰𤕲𤕳𤕴𤕶𤕷𤕹𤕻𤕽𤕾𤕿𤖀𤖁𤖂𤖃𤖄𤖅𤖆𤖇𤖈𤖉𤖊𤖋𤖌𤖍𤖎𤖏𤖑𤖒𤖓𤖔𤖕𤖖𤖘𤖙𤖚𤖜𤖞𤖟𤖠𤖡𤖢𤖣𤖤𤖥𤖦𤖧𤟌𤟒𥧃𥧌𥧍𥨉𥨊𥨲𥨷𥩒𦢖𦣜𧄯𧌜𨟻𨡓𨡰𩃕𩞟𩡽𩷅𩿄𪧇𪺞𪺟𪺠𪺡𫴛𬋿𬌀𬌁𬌂𬌃𬌄𬌅𬌆𬌇𬌈𬌉𬌊𬌌𬌍𬌎𬌏𬌐𬌑",
 "⺈": "𪟟𪩨𪹌𫙿𬹝",
 "⺃": "𠃏𠃕𠃖𠃞𠃟𠃡𠃭𠃱𠃲𠃴𠃵𠃶𠃸𠃹𠃼𠃿𠄑𠆹𠉥𠖬𠜩𠫖𠫱𠮜𠮪𠴄𠻌𡉵𡊥𡒏𡔻𡜞𡳟𡹽𢀒𢀗𢇼𢈗𢉓𢒽𢖪𢬹𣃿𣆍𣆠𣆷𣦷𣴧𤕿𤗅𤞯𤸿𤼾𥃤𥄀𥄩𥆎𥆮𥐕𥟯𥪐𥪑𥬻𥾆𦎉𦏳𦖅𦧿𦨊𦩄𦫷𦮁𧊢𧓟𧜐𧨙𧳿𧺇𧾹𨁓𨐐𨓱𨡦𨱶𩊲𩑍𩣛",
 "匸": "疟𠃬𠃬𠍾𠤲𠥃𠥇𠥮𠥯𠥰𠥱𠥲𠥳𠥴𠥵𠥶𢐉𣆻𣑙𣕩𥓟𥮹𦃶𦃷𩔿𩲰𪟭",
 "厷": "吰宏汯竑紘纮翃肱谹鈜閎闳雄㢬䆖䍔䡌䫺𠆽𠫤𠫲𠬗𡉞𡵓𡵦𢗞𣘯𣼄𣾲𤆠𤣦𤣾𤵄𥐪𥒣𥡋𥱘𦁷𦐌𦞗𧈽𧮯𧰯𨙿𨡿𨹠𩉦𩖢𩷃𩿅𫠖𫷧𬐋",
 "兇": "㟅䣴𠒋𡹕𣶑𤵻𥞝𧧗𧵮𩰷𩷇𫤧",
 "夊": "𠁶𠊂𠋍𠍑𠧺𠨉𠩴𠹘𠻦𠿆𡂇𡒇𡕞𡕟𡕠𡕡𡕢𡕣𡕥𡕦𡕨𡕩𡕪𡕫𡕭𡕯𡕱𡕳𡕴𡕷𡕸𡕹𡕻𡕼𡕽𡕾𡕿𡖀𡖁𡧸𡩓𡰿𡶣𡹀𡼇𡽀𡿟𢊋𢋌𢋤𢐽𢖕𢖖𢣌𣀢𣖓𣘅𣞭𣲋𣼀𣼊𤎑𤝥𤪀𤪞𤷬𤼱𥊙𥔥𥖂𥜱𥜷𥜹𥢄𦂊𦆛𦞶𦡙𦣵𦰍𦲘𦴲𦵇𦶨𦹰𦹿𦺌𦾪𧃍𧈸𧎓𧔔𧠃𧹃𧻮𨄣𨓤𨔔𨕊𨞉𨢼𨶾𨺶𨼜𩞝𩬼𩻐𩼕𪊎𪫏𪫕𪫜𪬒𪹢𪺒𪾝𫯌",
 "厂": "产仄兏厄厅历厇厈厉厊压厌厍厎厏厐厑厒厓厔厕厖厗厘厙厛厜厝厞厠厡厢厣厤厥厦厧厨厩厪厫厬厭厮厰厱厲厳嚴圧屵暦雁靥餍魇鳫鴈黡龎㓹㕂㕃㕄㕅㕆㕇㕈㕉㕊㕋㕍㕎㕏㕐㕑㕒㕓㕔㬄𠁖𠉬𠞲𠠻𠡲𠦖𠧣𠨬𠨮𠨯𠨱𠨲𠨳𠨴𠨶𠨷𠨹𠨺𠨻𠨼𠨽𠨾𠨿𠩁𠩂𠩃𠩄𠩆𠩇𠩈𠩉𠩊𠩋𠩌𠩍𠩎𠩏𠩐𠩑𠩒𠩓𠩕𠩖𠩘𠩙𠩛𠩜𠩝𠩞𠩠𠩡𠩥𠩦𠩧𠩨𠩩𠩪𠩫𠩬𠩭𠩮𠩯𠩰𠩱𠩲𠩳𠩴𠩵𠩶𠩷𠩹𠩺𠩻𠩼𠩽𠩾𠪀𠪁𠪂𠪃𠪅𠪆𠪇𠪈𠪊𠪌𠪍𠪎𠪏𠪐𠪑𠪒𠪓𠪔𠪖𠪗𠪘𠪙𠪛𠪝𠪞𠪟𠪠𠪡𠪢𠪣𠪤𠪦𠪧𠪩𠪫𠪬𠪭𠪮𠪯𠪰𠪱𠪲𠪳𠪴𠪵𠪶𠪷𠪸𠪹𠪼𠪽𠪾𠪿𠫀𠫁𠫃𠫄𠫋𠫍𠫎𠫐𠫑𠬡𠭧𠭶𠮉𠮏𠯸𠰨𠵧𠻒𠻿𠼛𡀕𡃫𡅃𡅔𡅮𡅴𡅾𡆉𡉃𡊘𡍿𡑬𡓺𡙨𡞼𡠉𡢩𡣧𡣬𡷳𡸡𡹻𢑡𢔭𢡷𢣵𢪜𢪦𢫲𢫳𢬍𢮉𢸊𢹠𢹥𢾨𣃞𣄬𣅛𣇗𣊥𣗡𣢬𣢭𣣾𣦆𣯅𣯛𣱔𣱷𣴇𣶮𣸰𣸼𣺶𤁄𤃉𤃝𤄊𤅌𤈲𤉓𤉺𤊣𤎉𤎗𤏀𤑂𤚓𤚿𤛆𤜎𤜏𤟐𥇮𥎦𥎼𥏂𥐘𥑉𥕠𥖷𥗃𥜩𥝾𥸂𥸇𥼅𥼡𦀍𦃢𦅟𦆑𦆡𦇟𦌞𦟕𦮈𦯰𦱯𦱼𦲘𦲳𦴓𦴱𦷔𦸻𧁶𧂾𧋇𧋚𧑩𧓋𧔹𧙼𧝦𧞝𧠂𧦠𧧑𧩗𧫬𧬑𧭨𧮜𧰳𧸩𧸪𧼞𨇠𨏇𨏜𨐂𨑃𨑄𨜸𨝟𨞋𨞬𨣬𨦄𨪘𨬜𨬦𨭲𨮭𨲻𩂒𩆝𩌛𩒣𩓒𩔟𩖄𩛫𩣄𩥸𩻏𩻢𩽦𪊁𪋙𪋙𪠃𪠄𪠅𪠆𪠇𪠈𪠉𪠊𪠋𪠌𪠍𪠎𪠏𪠐𪠑𪠒𪠓𪠔𪠕𪠖𪠘𪠙𪠛𪯯𪲲𪵭𪷝𪹒𫀳𫄖𫚯𫝗頋𫨂𫨃𫨄𫨅𫨆𫨇𫨈𫨉𫨊𫨋𫨌𫨍𫨏𫨐𫨑𫨒𫨓𫨔𫨕𫨖𫨗𫨘𫨙𫨚𫨛𫨜𫨝𫨞𫨟𫨠𫨡𫨢𫨣𫨤𫸲𫼢𬂈𬄹𬅒𬑹𬒉𬩓",
 "圭": "佳刲劸卦厓哇奊奎娃封徍恚挂晆桂洼烓珪畦眭硅窐筀絓罣胿茥蛙街袿觟詿诖跬邽郌銈閨闺鞋鮭鲑黊鼃㤬㪈㰪㾏䅅䖯䙵䞨䯓䳏䵷𠈘𠜤𠪤𠽥𡈞𡊋𡋣𡌤𡌲𡐠𡐲𡒑𡧩𡭈𡷅𡸔𢍠𢻘𣔘𣔫𣥮𣫴𣼤𣿣𤎃𤎇𤏎𤏎𤒋𤒋𤚣𤞇𤧊𤬿𥒐𥙞𥩄𦈰𦋅𦐰𦓯𦥂𧏂𧛲𧠹𨅆𨬇𩜩𩟉𩰳𪊧𪒖𪓤𪖢𪗹𪙓𪚝𫓯𫗼𫭳𫻮𫼋𬫀",
 "匕": "兠兺匂匙唟嗭壱它尼庀彘彘旕旨朼此死潁熲疕皀眞穎能能莻蒊论頴顈颍颎颕颖鬯麀齔龀㔫㔬㔭㕾㖋㖍㖎㖙㖚㖛㖜㖝㖯㖰㖲㖳㗟㗠㗡㗯㘏㘒㠲㫐㯋㷼䂗䖈䚰䣥𠁶𠅰𠆪𠈁𠊒𠌐𠒟𠖸𠘩𠛛𠜷𠝀𠣺𠤏𠤐𠤑𠤒𠤔𠤕𠤘𠤛𠤜𠤝𠤡𠤤𠤧𠤨𠤩𠤪𠨐𠨬𠩑𠩽𠭢𠯺𠱟𠽽𡇾𡋳𡏓𡖅𡘁𡙊𡛥𡜖𡜞𡜞𡧏𡧏𡧠𡭠𡱹𡲏𢀈𢀐𢈃𢍾𢓼𢖬𢚉𢨩𢪦𢪲𢪲𢬉𢭠𢮾𢳢𢺵𣂢𣃿𣅬𣒬𣓛𣕷𣢸𣢾𣣅𣣝𣤃𣥅𣪑𣳊𣴈𣼅𤂰𤅨𤅯𤆇𤆢𤕥𤥛𤪵𤫘𤵯𤶨𤾐𥀡𥃩𥆈𥆢𥋦𥋨𥌤𥌵𥏑𥏰𥏶𥏷𥓀𥖧𥘇𥛺𥜱𥜷𥜹𥝓𥧠𥬜𥭯𥱘𥷵𥷵𦉮𦎶𦏝𦘪𦟭𦟭𦟭𦮃𦮤𦱭𧃍𧇩𧢶𧨛𧱗𧹄𧺊𨁓𨁞𨏝𨏝𨓖𨓛𨕉𨚛𨜭𨤽𨦊𨧏𨨇𨨉𨫶𨬪𨰅𨹖𨹨𨽻𩊷𩒁𩒵𩓓𩓙𩝨𩞚𩣄𩣄𩣎𩣛𩨷𩵏𩷌𩺺𩼍𩾕𪀶𪋼𪗑𪗒𪝶𪟨𪟩𪱫𪴬𫉫𫊤𫕙𫞲𫠔埴𫥡𫥡𫥢𫧇𫧇𫧈𫧉𫧊𫭄𫱇𬃜𬐺𬗨𬞯𬢻𬱄𬴼𬹩",
 "目": "愳愳泪煛煛狊盯盰盱盲盳盵盶盷相盹盺盻盼盽盿眀省眂眃眄眅眆眇眈眉眊看県眍眎眏眐眑眒眓眕眖眗眘眙眚眛眜眝眞眠眡眢眣眤眥眦眧眨眩眪眫眬眭眮眯眰眱眲眳眴眵眶眸眹眺眻眼眽眿着睁睃睄睅睆睇睈睉睊睋睌睍睎睏睐睑睒睓睔睕睖睗睙睚睛睜睝睞睟睠睡睢督睤睥睦睧睨睩睫睬睭睮睯睰睱睲睳睴睵睶睷睸睹睺睻睼睽睿瞀瞁瞃瞄瞅瞆瞇瞈瞉瞊瞋瞌瞍瞎瞐瞐瞐瞑瞒瞓瞔瞕瞖瞗瞘瞙瞚瞛瞜瞝瞞瞟瞠瞡瞣瞤瞥瞦瞧瞨瞩瞪瞫瞬瞮瞯瞰瞱瞲瞳瞴瞵瞶瞷瞸瞹瞺瞻瞼瞽瞾瞾瞿瞿矀矁矂矃矄矅矆矇矈矉矊矋矌矎矏矐矑矒矓矔矕矖矘矙矚窅算篡篹簒籑繉繤纂苜萛郻鉬钼霿鷪鷪㮂㲊㸔㹙㺺㾇䀎䀏䀐䀑䀒䀔䀕䀖䀗䀘䀙䀚䀛䀜䀝䀞䀟䀠䀠䀡䀢䀣䀤䀥䀦䀧䀨䀩䀪䀫䀬䀭䀮䀯䀰䀱䀲䀳䀴䀵䀶䀷䀸䀹䀺䀻䀼䀽䀾䀿䁀䁁䁂䁃䁄䁅䁆䁇䁈䁉䁊䁊䁋䁌䁍䁎䁏䁐䁑䁒䁓䁔䁕䁖䁗䁘䁙䁚䁛䁜䁞䁟䁠䁡䁢䁣䁤䁥䁦䁨䁩䁪䁫䁬䁭䁮䁯䁰䁱䁲䁳䁴䁵䁸䁹䁺䁻䁼䁽䁾䁿䂀䂁䂂䂃䂄䂅䆩䉵䋰䞊䡞䢥䥚䥚䥧䵵𠅿𠆐𠆐𠆚𠆚𠉊𠊹𠋑𠌪𠎂𠏝𠑮𠖻𠜹𠞋𠤀𠥞𠧡𠨀𠫎𠫎𠮈𠮉𠮏𠲾𠷒𠸵𠹘𡂚𡇌𡇡𡊟𡋳𡕥𡕳𡕷𡕹𡕹𡖽𡙄𡙋𡚔𡚔𡟤𡡚𡡜𡡜𡡾𡢞𡢞𡣣𡤁𡧟𡩇𡩈𡫅𡫔𡫧𡬲𡭨𡳻𡳻𡳻𡷚𡹊𡹎𡺊𡼴𢀯𢀯𢀰𢀰𢆆𢌨𢌫𢍓𢎈𢒭𢓼𢔠𢚉𢚞𢜇𢜊𢝝𢝻𢠕𢡡𢡸𢡾𢢺𢣊𢧮𢧮𢪷𢯲𢯵𢰿𢱁𢺱𢺱𢾥𣁪𣁪𣃊𣃒𣃒𣄩𣆢𣒦𣕱𣚏𣚏𣛒𣝇𣝇𣞭𣞹𣟎𣟎𣟟𣡠𣡠𣤧𣤺𣤺𣥸𣦦𣦳𣪭𣭒𣮰𣰧𣷍𣺐𣻫𣼂𣽋𣾨𣿧𣿰𣿼𤀹𤁽𤃒𤃔𤄑𤄘𤄘𤈱𤈳𤉏𤊾𤋇𤏿𤐍𤓑𤓥𤓥𤖎𤛙𤟵𤥛𤦼𤧩𤩣𤩷𤪓𤪞𤪫𤪻𤪽𤫛𤭲𤶨𤻋𥂄𥃤𥃥𥃦𥃧𥃨𥃩𥃪𥃫𥃬𥃭𥃮𥃯𥃰𥃱𥃲𥃳𥃴𥃵𥃶𥃷𥃸𥃹𥃺𥃻𥃼𥃽𥃾𥃿𥄀𥄁𥄂𥄃𥄄𥄅𥄆𥄇𥄈𥄉𥄊𥄋𥄌𥄍𥄎𥄏𥄐𥄑𥄒𥄓𥄔𥄕𥄖𥄗𥄘𥄙𥄚𥄛𥄜𥄝𥄞𥄟𥄠𥄡𥄢𥄥𥄦𥄧𥄩𥄪𥄫𥄬𥄭𥄮𥄯𥄰𥄱𥄲𥄴𥄶𥄷𥄸𥄹𥄻𥄼𥄽𥄾𥄿𥅀𥅁𥅃𥅄𥅅𥅆𥅇𥅈𥅉𥅊𥅋𥅎𥅏𥅐𥅑𥅓𥅔𥅕𥅖𥅗𥅙𥅚𥅛𥅜𥅝𥅞𥅟𥅠𥅡𥅢𥅣𥅥𥅦𥅧𥅨𥅩𥅪𥅬𥅭𥅮𥅯𥅰𥅱𥅲𥅳𥅴𥅵𥅶𥅷𥅹𥅺𥅻𥅼𥅽𥅿𥆀𥆁𥆂𥆃𥆄𥆅𥆆𥆇𥆈𥆉𥆋𥆍𥆎𥆏𥆐𥆑𥆓𥆔𥆖𥆘𥆙𥆚𥆛𥆜𥆝𥆟𥆡𥆢𥆢𥆣𥆣𥆤𥆥𥆦𥆧𥆩𥆪𥆫𥆬𥆭𥆮𥆯𥆱𥆲𥆳𥆴𥆶𥆸𥆹𥆺𥆻𥆼𥆽𥆾𥆿𥇀𥇁𥇂𥇃𥇄𥇄𥇅𥇆𥇇𥇈𥇉𥇊𥇋𥇍𥇎𥇏𥇐𥇑𥇒𥇓𥇔𥇕𥇖𥇗𥇘𥇙𥇚𥇜𥇞𥇟𥇠𥇠𥇢𥇣𥇤𥇥𥇦𥇧𥇨𥇩𥇫𥇬𥇭𥇮𥇯𥇰𥇱𥇲𥇳𥇴𥇵𥇶𥇷𥇸𥇹𥇺𥇼𥇽𥇿𥈀𥈀𥈁𥈂𥈃𥈄𥈅𥈆𥈇𥈈𥈊𥈋𥈌𥈍𥈍𥈎𥈏𥈏𥈐𥈒𥈓𥈔𥈕𥈖𥈗𥈘𥈙𥈚𥈛𥈛𥈝𥈞𥈠𥈠𥈡𥈢𥈣𥈤𥈥𥈦𥈧𥈩𥈪𥈪𥈫𥈫𥈬𥈭𥈯𥈰𥈱𥈲𥈵𥈶𥈹𥈺𥈻𥈼𥈾𥈿𥉀𥉁𥉁𥉂𥉃𥉄𥉅𥉆𥉇𥉈𥉉𥉊𥉋𥉍𥉎𥉏𥉐𥉑𥉒𥉓𥉔𥉕𥉖𥉗𥉙𥉚𥉛𥉜𥉝𥉞𥉞𥉟𥉠𥉡𥉢𥉣𥉤𥉦𥉧𥉨𥉩𥉪𥉫𥉬𥉭𥉮𥉯𥉰𥉱𥉲𥉳𥉴𥉵𥉶𥉷𥉸𥉹𥉺𥉻𥉼𥉽𥉾𥉿𥊀𥊁𥊂𥊃𥊄𥊅𥊆𥊇𥊈𥊉𥊊𥊋𥊌𥊍𥊎𥊏𥊏𥊐𥊐𥊑𥊒𥊓𥊔𥊕𥊖𥊗𥊘𥊙𥊚𥊜𥊝𥊞𥊠𥊡𥊤𥊥𥊦𥊨𥊩𥊪𥊫𥊬𥊭𥊮𥊯𥊰𥊱𥊲𥊳𥊴𥊵𥊶𥊷𥊺𥊻𥊼𥊾𥊿𥊿𥋀𥋁𥋁𥋂𥋃𥋄𥋅𥋆𥋇𥋈𥋉𥋊𥋋𥋌𥋍𥋎𥋎𥋏𥋐𥋐𥋒𥋓𥋕𥋖𥋗𥋘𥋙𥋚𥋛𥋝𥋞𥋟𥋠𥋡𥋡𥋢𥋣𥋤𥋥𥋥𥋦𥋧𥋨𥋩𥋪𥋫𥋫𥋬𥋬𥋭𥋮𥋯𥋰𥋱𥋲𥋳𥋴𥋵𥋶𥋷𥋸𥋺𥋻𥋼𥋽𥋾𥋿𥌀𥌂𥌂𥌃𥌄𥌅𥌆𥌇𥌈𥌉𥌊𥌋𥌌𥌍𥌎𥌐𥌑𥌒𥌓𥌔𥌕𥌖𥌖𥌗𥌘𥌘𥌚𥌛𥌜𥌝𥌞𥌟𥌠𥌡𥌢𥌣𥌤𥌥𥌦𥌧𥌩𥌫𥌬𥌮𥌰𥌲𥌳𥌴𥌵𥌶𥌷𥌸𥌹𥌺𥌻𥌼𥌽𥌾𥌿𥍀𥍁𥍂𥍃𥍄𥍄𥍆𥍇𥍈𥍈𥍉𥍋𥍌𥍍𥍎𥍏𥍐𥍑𥍒𥍓𥍔𥍕𥍖𥍗𥍘𥍚𥍛𥍜𥎙𥎶𥏦𥓀𥜱𥜷𥜹𥡏𥡽𥢞𥣚𥤛𥫒𥬥𥰀𥲹𥲻𥴌𥴔𥴚𥴠𥵑𥵺𥶉𥶫𦉍𦉍𦌮𦌮𦎝𦒿𦢐𦣜𦣜𦨧𦲰𦴀𦴁𦴔𦴲𦵅𦶔𦽖𦽹𧂝𧃜𧅖𧅠𧅠𧇖𧇗𧇩𧇪𧈃𧊁𧌪𧗙𧗙𧘆𧘆𧠦𧡆𧢕𧢛𧢛𧢛𧨛𧫨𧭑𧭑𧭬𧭬𧯖𧱗𧴢𧴢𧸩𧻃𨁞𨉾𨊀𨊀𨏉𨒚𨓗𨕐𨖩𨘊𨘊𨘚𨘩𨜑𨞅𨤗𨧏𨩡𨫶𨬴𨭧𨭧𨵢𨹨𨺆𨻠𩄯𩊷𩓓𩔽𩕩𩕫𩖇𩠥𩬞𩮉𩵊𩶔𩶖𪅷𪊣𪋢𪌔𪑥𪗑𪗒𪚫𪜮𪡼𪤂𪪜𪫩𪭑𪭓𪲈𪹢𪺒𪺴𪾟𪾠𪾡𪾢𪾣𪾤𪾥𪾦𪾧𪾨𪾩𪾪𪾫𪾬𪾭𪾮𪾯𪾰𪾱𪾲𪾳𪾴𪾵𪾶𪾷𪾸𪾹𪾺𪾻𪾼𪾽𪾾𪾿𪿀𪿂𪿄𪿅𫀝𫉫𫔝𫞲具埴冒瓊𥃳𥃲䀹䁆𫡴𫡼𫣎𫦲𫧐𫱴𬅧𬈐𬑅𬑆𬑇𬑈𬑉𬑊𬑋𬑌𬑍𬑎𬑏𬑐𬑑𬑒𬑓𬑕𬑖𬑗𬑘𬑙𬑛𬑜𬑞𬑟𬑠𬑡𬑢𬑣𬑤𬑥𬑦𬑧𬑨𬑬𬕾𬛿𬞱",
 "𠃊": "亾兦悳断県眞継继郻陋㥁㫁㴴䛧𠃒𠅺𠆦𠑶𠦣𠧟𠧠𠧡𠧱𠧴𠨅𠪫𠫙𠵭𡁰𡆓𡖽𡟤𡡨𡢌𡩇𡮡𡲡𢆸𢏩𢕃𢜖𢠀𢧰𢨆𢯇𢱅𣀎𣂱𣅏𣆄𣖈𣖴𣣸𣤦𣷢𤟕𤦴𤨜𤩤𤪎𤵿𥄁𥄉𥇆𥚝𥜱𥜷𥜹𥟮𥡽𥦴𥭣𥭱𥮞𥮪𥰀𥺇𥺳𥻯𥽖𥽠𦁚𦂝𦔮𦙃𦝖𦣽𦨺𦭯𦯭𦱫𦲭𦵵𦿥𧈞𧏂𧠇𧡹𧤉𧦷𧩑𧵯𨆨𨡅𨡠𨦖𩈞𩖂𩮉𩸠𩿌𪗑𪗒𪲛𪶈𫠥𫣎𫤗𬖜𬱅",
 "八": "举仈兌公兮兲分叭弿恱扒挙朳榉汃洕玐肸誉趴釟㒵㒶㒷㕣㝙㞕㢲㣞㲊㻥䏋䒔䖫䗙䞿䦇𠀮𠀹𠁵𠄫𠆌𠈂𠈖𠈝𠍩𠔅𠔌𠔍𠔐𠔟𠔪𠔭𠕬𠖋𠛶𠦎𠬬𠭦𠮈𠱕𠶁𠹟𠼟𠿬𡆒𡆦𡇕𡇣𡈌𡉀𡉊𡌙𡍴𡎱𡐑𡒇𡒚𡒠𡔌𡕡𡕦𡕫𡚭𡜎𡡨𡡼𡥀𡧆𡧼𡨄𡫪𡮧𡯂𡯔𡳦𡴟𡶣𢁌𢃹𢆆𢇃𢇃𢉲𢋪𢎬𢎲𢑞𢝏𢣌𢫜𣅆𣅭𣉩𣊂𣊨𣌼𣍡𣑼𣑼𣕋𣙺𣞹𣦄𣦋𣫇𣱑𣱺𣴸𣼂𣼪𣽃𤀹𤁫𤂓𤃒𤊪𤎑𤑥𤒭𤓹𤔗𤕶𤖈𤛵𤜞𤡶𤧯𤨜𤩷𤪀𤪓𤪻𤪽𤭍𤯶𤲁𤴭𤵏𤺂𥄖𥄘𥅎𥅵𥈃𥉡𥊊𥊙𥋂𥋜𥌗𥌬𥐙𥜱𥜷𥜹𥠠𥢄𥦕𥦴𥪢𥬧𥭣𥯗𥵼𥶉𥷞𥺎𥻋𥻪𦁃𦁓𦁙𦄪𦅽𦆛𦉵𦌋𦍰𦎊𦓧𦔯𦕞𦗯𦘩𦙕𦙝𦛤𦜒𦜒𦜱𦡎𦣶𦦂𦦋𦦡𦦫𦦲𦦼𦧕𦩛𦪁𦫒𦭇𦮀𦲍𦲮𦳪𦴄𦴅𦴓𦴠𦶨𦸧𦸨𦸬𦹰𦽙𧁡𧃍𧃜𧆖𧆾𧇋𧇖𧇩𧈃𧈢𧌤𧌶𧔊𧘋𧘳𧘳𧙦𧙰𧙵𧛠𧛴𧞌𧟿𧢕𧣥𧥽𧦻𧧡𧨦𧩿𧪖𧫀𧯖𧯚𧯣𧱈𧲁𧳖𧴩𧶌𧶑𧷁𧷫𧸥𧸩𧸳𧺍𧻾𧼜𨂳𨅧𨈲𨉍𨉓𨌓𨏐𨐂𨑷𨔎𨕚𨕦𨗮𨘞𨘠𨚂𨜪𨢼𨥟𨦣𨨉𨨿𨩸𨩻𨪭𨫂𨬳𨬴𨱘𨱹𨲥𨷅𨷭𨻞𨼧𨽫𨽫𨽫𩁢𩁬𩁲𩂪𩒭𩜯𩜹𩝯𩞝𩞳𩡩𩤰𩦪𩦸𩨪𩩏𩫊𩫵𩮃𩯣𩰕𩱁𩵉𩵊𩵒𩷲𩻐𩼕𪉢𪊻𪒧𪗔𪞈𪞊𪡽𪥆𪦾𪩾𪭚𪾝𫁏𫁽𫐴𫑀𫓥𫔸𫙈𫚃𫝌𫟋具𠔜異真縂䕫𨗭𫣎𫤫𫤭𫤮𫤯𫤰𫤲𫥪𫥮𫬯𫭒𫭗𫯆𫳤𫷛𫹆𫺅𫺙𫼦𫽛𫽻𫾜𫾝𫿵𬁧𬂍𬈐𬈑𬌙𬐧𬖍𬟡𬢝𬢻𬥟𬪐𬮷𬲈𬲖",
 "七": "乇切柒皂㐂㐂㐂㓒㭍㲺𠀣𠜀𠮈𠮏𠮟𠰨𡌣𢉯𢍺𢫅𢭔𣳃𣶠𤗕𤪻𤶮𥙤𥤥𥬻𥳁𥿴𦉱𦮇𧩅𧴶𨗋𨚤𨬦𨳍𨾅𨾙𩫷𩵐𩾔𩾙𪜈𪨌𪪐𬂥𬥔𬴽𬹟",
 "󠄀": "凕圦塓娰嫇扖杁極殛㚊㝍㝔㟰㤥㨠㬖㰠㱓㺲㼎㼚㽘㿰䂇䏔䟲𠀳𠆾𠇀𠇏𠇖𠈂𠈖𠈝𠈟𠉐𠉧𠉾𠊣𠊣𠊮𠊰𠌨𠏧𠏳𠑜𠒉𠓪𠓪𠓪𠕬𠕿𠖧𠗜𠘥𠙇𠛰𠜋𠝨𠟐𠠭𠤮𠤾𠤿𠥃𠥐𠥮𠥮𠥯𠥰𠥱𠥲𠥳𠥴𠥵𠥶𠧆𠩧𠬬𠭦𠮈𠮊𠮋𠯒𠯣𠯿𠱕𠴰𠴾𠴾𠶁𠶶𠷏𠹞𠹫𠹫𠹸𠻕𡆴𡉀𡉊𡌙𡌠𡏧𡒝𡕦𡖷𡖿𡘕𡚽𡜴𡣞𡥆𡥾𡧆𡨘𡪁𡯂𡯔𡯘𡱾𡳄𡴒𡷧𡸆𡸛𡸨𡹪𡹬𡻓𡼘𢀁𢁩𢁮𢃻𢆕𢆗𢇪𢉄𢋳𢎲𢐫𢓇𢓉𢗉𢘄𢙕𢝋𢝕𢞥𢟄𢠃𢦟𢧘𢧪𢧿𢩐𢩙𢩙𢩝𢫃𢫜𢫲𢬃𢬆𢬟𢬻𢭜𢭞𢮀𢮝𢮢𢮢𢮰𢯴𢰸𢲻𢴖𢷗𢹸𢺘𢻉𢻶𢼜𢼵𢾺𢾻𣁘𣂄𣄸𣅚𣅴𣆅𣇂𣇝𣋃𣌺𣍇𣐍𣒆𣔖𣔖𣕩𣖛𣖞𣖢𣘉𣘼𣘽𣙄𣙅𣙺𣚻𣜒𣜓𣢬𣢲𣤆𣦮𣧊𣧍𣨱𣨷𣭃𣲎𣳉𣴃𣴞𣷉𣷗𣸊𣻃𣼭𣿬𤀡𤂙𤂭𤃐𤅗𤅙𤅣𤇮𤈓𤊛𤊛𤍣𤏬𤔛𤕖𤘡𤚬𤜞𤜰𤜽𤞻𤟞𤡁𤣘𤣼𤤳𤥂𤦟𤧂𤧗𤨋𤪛𤫹𤬋𤬯𤬰𤲈𤲠𤴭𤴽𤶀𤹦𤺨𤾙𤿏𤿒𤿮𤿿𤿿𥁌𥂡𥄋𥅟𥆽𥇟𥈂𥈍𥈓𥌏𥌗𥍓𥍠𥍲𥍳𥎄𥏲𥘞𥙩𥝦𥞨𥟷𥟷𥠁𥠶𥡹𥣉𥦅𥨵𥨸𥩲𥫣𥮢𥮢𥰴𥰹𥶤𥹜𥺣𥺣𥻀𥻩𥻲𥾩𥾵𥿖𥿲𦁃𦃼𦈲𦉵𦊀𦊃𦊇𦍟𦍮𦎢𦐄𦐤𦒹𦓠𦖎𦚲𦚳𦜻𦜻𦟋𦤊𦤰𦧈𦧎𦩙𦩙𦬩𦭍𦮰𦰣𦱙𦱪𦱪𦴩𦶧𦷷𧇠𧇻𧈋𧈒𧈢𧊏𧊤𧋡𧏅𧓰𧓰𧔲𧘥𧘭𧙡𧛘𧜀𧦑𧧩𧩖𧩖𧩦𧮰𧰾𧱴𧲪𧹳𧺌𧺍𧻤𧿔𨀖𨀫𨂓𨂓𨄟𨄺𨅩𨈢𨉏𨋀𨌋𨌜𨌤𨍡𨍵𨎙𨎡𨎱𨏛𨏯𨏸𨐉𨐋𨒄𨒨𨔚𨔚𨗇𨗜𨘛𨙺𨙽𨚂𨛄𨜈𨜈𨟹𨟼𨠦𨠳𨡢𨥓𨥔𨦀𨦄𨦣𨧌𨧣𨪯𨫢𨬉𨬋𨰫𨱂𨲥𨳞𨴘𨸁𨸮𨻃𨻎𨽷𨽺𨾒𩂇𩂢𩆊𩈇𩊔𩎦𩏊𩐟𩐰𩑟𩑧𩑭𩒻𩓜𩖦𩗒𩙳𩚆𩚕𩚖𩚜𩛮𩝘𩠚𩠻𩡁𩡩𩣇𩣿𩣿𩩇𩭫𩰕𩰶𩲋𩲏𩲜𩲻𩳮𩷞𩷲𩸔𩸡𩹾𩻆𩾃𩾅𩾹𠘺具𠔜再刻勉売夆寿屮𢌱𢌱惇憯懞冕望㺬瑜異真縂翺育䕫裗諭𧼯輸𨗭鐕䪲𩬰𪃎",
 "䒑": "並兹养兿前善屰従業菐𪍙𪒸𪨌𪬄𪲍𪼫𫉓𫏁𫼩𬇣𬗓𬠙𬪐",
 "幺": "乣兹兹吆幻幼胤茲茲酳麼㓜㡫㫁㫁㭃䯚𠄂𠄮𠄮𠅋𠇓𠉥𠏇𠏇𠒴𠒴𠓱𠓱𠖂𠙡𠙡𠙬𠙬𠣎𠦼𠧎𠧎𠧏𠧦𠬳𠬾𠬾𠭟𠯝𡆩𡆻𡇟𡇟𡉬𡌥𡌥𡏀𡏀𡑜𡑜𡓩𡕯𡗞𡗰𡙘𡙘𡞅𡠒𡠒𡢛𡢛𡢛𡢮𡢮𡥝𡥝𡴁𡵏𡵮𡶹𢁴𢆯𢆰𢆱𢆲𢆳𢆴𢆵𢆶𢆶𢆷𢆸𢆸𢆹𢆺𢆻𢆻𢆼𢆼𢆾𢆾𢆿𢇀𢇁𢇁𢇂𢇂𢇃𢇃𢇄𢇅𢇅𢇇𢇇𢇌𢇎𢇐𢇝𢎺𢒵𢖕𢖖𢙰𢜚𢜚𢢦𢢦𢦾𢩼𢸂𢿐𣂱𣂱𣉓𣉓𣖭𣖭𣢄𣱋𣳯𣳯𣴌𣷶𣸠𣼅𣼌𣼠𤌑𤔐𤔪𤔪𤔪𤔭𤔭𤔭𤕀𤕀𤕀𤘳𤝃𤤈𤬮𤭳𤭳𤵋𤹏𤹏𥃊𥃎𥄆𥄩𥈒𥈒𥌝𥏈𥐺𥘢𥜢𥜢𥝮𥺩𦀣𦀣𦁚𦁚𦇐𦍝𦍿𦔷𦕇𦘷𦙌𦙍𦙘𦛬𦞥𦞥𦞩𦨠𦬜𦭙𦮈𦮐𦯫𦱳𦱳𦲘𦼡𧉛𧌷𧣎𧣱𧤋𧤋𧦚𧬾𧬾𧰁𧰁𧴺𧵇𧶍𧺦𧿠𨇔𨇔𨇔𨇔𨋇𨍃𨍃𨑼𨓁𨓁𨕧𨕧𨗙𨗙𨘁𨚏𨠀𨡦𨢖𨨙𨨙𨵿𨵿𨶚𨶚𨸞𨻋𨻋𩅖𩑗𩚞𩜆𩜆𩨤𩳠𩵷𩼾𩿒𪘋𪪊𪬄𪭞𪲏𪹩𪺕𪺕𪺕𪺙𫀡𫌃𫐃𫕊𫨙𫨢𫰀𫰀𫷟𫷡𫹀𫹈𬋸𬚏𬟰𬟲",
 "𠄠": "冃𠄡𠄢𠄭𠄮𠄵𠄷𠄸𠄹𧇵𧥛𧥜噑噑",
 "弓": "宆引弖弘弙弛弜弜弝弞张弡弢弣弤弥弦弧弨弩弪弫弬弭弯弰弲弳弴張弶弸弹弻弻弼弼弽弾弿彀彁彃彄彅彆彇彈彉彊彋彌彍彎彏杛矤穹粥粥芎虇躬㢧㢨㢩㢪㢫㢬㢭㢮㢯㢰㢱㢴㢵㢶㢷㢸㢹㢺㢻㢼㢽㢾㢿㣀㣂㣃㣃㣄㣅㣆㧈䩑䰜䰜䰞䰞𠖜𠖦𠢛𠤂𠰀𠱳𠱳𠸃𠸃𠸇𠸇𡉖𡉶𡍯𡐲𡗝𡝡𡫻𡰬𡸅𢀶𢁠𢎚𢎛𢎢𢎤𢎥𢎦𢎩𢎪𢎬𢎭𢎰𢎲𢎳𢎴𢎶𢎷𢎸𢎹𢎺𢎻𢎼𢎽𢎿𢏀𢏁𢏂𢏃𢏄𢏅𢏆𢏇𢏈𢏉𢏊𢏋𢏌𢏍𢏎𢏏𢏐𢏑𢏒𢏓𢏔𢏕𢏖𢏗𢏘𢏙𢏚𢏛𢏜𢏝𢏝𢏝𢏞𢏟𢏠𢏡𢏢𢏣𢏥𢏦𢏧𢏨𢏩𢏪𢏫𢏬𢏭𢏯𢏰𢏱𢏲𢏳𢏴𢏵𢏶𢏷𢏸𢏹𢏺𢏺𢏻𢏼𢏽𢏾𢏿𢐀𢐀𢐁𢐁𢐂𢐃𢐄𢐅𢐅𢐆𢐆𢐇𢐈𢐈𢐉𢐊𢐋𢐌𢐌𢐍𢐎𢐏𢐐𢐐𢐒𢐓𢐔𢐖𢐗𢐚𢐛𢐝𢐞𢐟𢐠𢐡𢐣𢐤𢐥𢐥𢐦𢐧𢐨𢐨𢐪𢐬𢐬𢐮𢐮𢐯𢐰𢐱𢐲𢐲𢐳𢐴𢐵𢐶𢐷𢐷𢐸𢐹𢐹𢐺𢐺𢐻𢐼𢐼𢐽𢐾𢐾𢐿𢑀𢑂𢑃𢑄𢑈𢑉𢑊𢑋𢑋𢑌𢑌𢑍𢑍𢑍𢑍𢑎𢑎𢑎𢓙𢖸𢙰𢪕𢰅𢰅𢰕𢽔𣁺𣇎𣇎𣐢𣹍𣹎𣹎𣽔𤈔𤉝𤏯𤑜𤑜𤑨𤑨𤑵𤑵𤙗𤙗𤦀𤵶𤼰𤼲𤼵𥇎𥋡𥋡𥚜𥛿𥜄𥝙𥫤𥸲𥽮𥽮𥽮𥾏𦏍𦏚𦙠𦦎𦭲𦭲𦯡𦯢𦰴𦱨𦳪𦳪𦴛𦶁𦷆𦹽𦽙𦽙𦿶𧘏𧙭𧙭𧛴𧛴𧤆𧦒𧩿𧩿𧱶𧶢𨀇𨂳𨂳𨕖𨕖𨜬𨞉𨦘𨩸𨩸𨶥𨶾𨺕𩇃𩊎𩜹𩜹𩨙𩰲𩰲𩱆𩱆𩱌𩱌𩱍𩱍𩱎𩱎𩱒𩱒𩱓𩱓𩱖𩱖𩱗𩱗𩱚𩱚𩱜𩱜𩱞𩱞𩱟𩱟𩱠𩱠𩱡𩱡𩱣𩱣𩱤𩱤𩱥𩱥𩱦𩱦𩱧𩱧𩱨𩱨𩱪𩱪𩱫𩱫𩱭𩱭𩱮𩱮𩱯𩱯𩱰𩱰𩱱𩱱𩱲𩱲𩱳𩱳𩱶𩱶𩱷𩱷𩺋𩾫𪎔𪪺𪪻𪪼𪪽𪪾𪪿𪫀𪫁𪫂𪫄𪫅𪰩𪼵𪾞𪾞𫆷𫙆𫙆𫙇𫙇𫝳弢弢𫸟𫸥𫸦𫸧𫸩𫸪𫸫𫸭𫸮𫸯𫸰𫸱𫸲𫸳𫸵𫸶𫸸𫸹𫸾𫹀𫹁𫹂𫹃𫾰𬇗𬈄𬑂𬑂𬴸𬴸𬴹𬴹𬴺𬴺𬴻𬴻𬴼𬴼𬶿",
 "北": "丠冀苝軰邶鉳𠙨𠙩𠙯𠤥𠤫𠦞𠭼𡋭𡕶𡕸𡷒𢫣𢯀𣓽𣬏𤤘𥀅𥦚𧆳𨀈𨸾𪊠𪜜𪟪𪨽𫕡𫩡𬊴𬔶",
 "㓁": "𠤥𠧶𠭼𡫛𢍔𣃅𣖒𣝼𣤟𣵫𤔸𥀅𥵑𥵲𦉲𧍾𧷉𨙢𩎲𩞴𪞐𪞑𪞔𫅃𬀊𬈯𬙗𬥙",
 "攴": "敁敆敊敍敠敡敤敥敧敮敯敱敲敺敼敽斀斅軙鈙鼔㢭㪁㪂㪃㪅㪆㪈㪊㪋㪌㪎㪏㪐㪑㪒㪓㪔㪕㪖㪗㪛㪜㪝㪞㪠㪡㪢㪥㪧㪨㪩㪪㪫㪬㪭㪮㺳䜴䨷𠅬𠆸𠍞𠓥𠞲𠪬𡁁𡅴𡅾𡆉𡏃𡑼𡔋𡨣𡪌𡰵𡵨𡾂𢁵𢇮𢝠𢪊𢯬𢴻𢵿𢻫𢻭𢻰𢻲𢻳𢻴𢻵𢻶𢻷𢻸𢻻𢻼𢻽𢻿𢼀𢼌𢼍𢼎𢼐𢼒𢼔𢼗𢼛𢼝𢼞𢼢𢼣𢼤𢼦𢼧𢼨𢼩𢼬𢼯𢼰𢼱𢼲𢼹𢼺𢼼𢼽𢼾𢼿𢽀𢽁𢽂𢽃𢽄𢽅𢽕𢽖𢽜𢽝𢽞𢽢𢽥𢽦𢽧𢽨𢽩𢽪𢽫𢽭𢽾𢽿𢾀𢾁𢾂𢾃𢾆𢾇𢾈𢾊𢾋𢾌𢾍𢾎𢾏𢾑𢾒𢾓𢾙𢾠𢾥𢾦𢾧𢾨𢾩𢾪𢾫𢾮𢾯𢾱𢾲𢾴𢾵𢾸𢾻𢾽𢾿𢿀𢿁𢿆𢿇𢿈𢿉𢿊𢿍𢿎𢿏𢿑𢿒𢿘𢿚𢿝𢿟𢿠𢿡𢿣𢿤𢿥𢿦𢿧𢿨𢿩𢿪𢿫𢿮𢿸𢿹𢿺𢿾𢿿𣀀𣀂𣀃𣀄𣀇𣀍𣀎𣀏𣀑𣀒𣀓𣀔𣀕𣀖𣀙𣀛𣀜𣀝𣀞𣀣𣀤𣀥𣀦𣀧𣀪𣀫𣀮𣀯𣀰𣀲𣀵𣀶𣀷𣀸𣀺𣀻𣀾𣁀𣏽𣖀𣥰𣧏𣲏𣼝𣽠𣿯𤄑𤆝𤋈𤔮𤕝𤘴𤥸𤯳𤯽𤼧𤽐𥂱𥃍𥃎𥃏𥄎𥊕𥲼𥽤𥾲𦄱𦌤𦔼𦘟𦜹𦤺𦨗𦰞𦷻𧇆𧓾𧔅𧗑𧙾𧤿𧥙𧥚𧨪𧱰𧾬𨈙𨍿𨜦𨠃𨦷𨧔𨰯𩄸𩉲𩋸𩌻𩐅𩟴𩠮𩣓𩤳𩩹𩪨𩹐𪌏𪎘𪓍𪔿𪗡𪢺𪥩𪪾𪯉𪯋𫣇𫶰𫸸𫹏𫾦𫾲𫾸𫾿𫿅𫿊𫿎𫿗𬢟𬨞𬳩",
 "⺤": "䍃䭡𠃹𠃿𠊻𠌠𠑡𠝄𠧎𠧏𠪔𠬪𠭖𠭧𠮗𠵺𠾄𠾄𡅝𡅾𡆓𡈣𡎽𡏟𡏪𡐼𡔅𡕼𡕽𡗮𡚘𡝇𡩴𡬳𡭒𡰖𡰡𡰢𡳲𡹑𢉏𢚩𢝾𢭊𢮤𢯉𢯳𢱄𢽿𢿮𣀎𣂭𣉁𣌄𣑂𣑿𣔔𣩖𣹄𣺧𣽮𤅥𤅪𤊚𤋠𤌵𤑀𤓡𤓳𤓴𤓸𤓻𤓽𤓿𤔂𤔃𤔄𤔆𤔇𤔊𤔌𤔍𤔒𤔓𤔔𤔕𤔡𤔣𤔦𤔪𤔫𤔬𤔭𤔰𤔳𤔴𤔵𤔸𤔹𤔺𤔼𤔿𤕀𤕁𤕁𤕃𤕆𤕈𤕋𤕍𤠄𤧏𤪞𤬇𤮫𤮬𤳿𤴋𤴎𤼮𤾽𥄃𥈦𥈺𥋺𥒗𥔺𥕬𥖂𥝩𥟝𥟞𥟩𥟳𥮍𦃟𦄘𦄮𦇌𦉔𦛷𦞼𦢣𦩾𦲻𦳡𦷪𦷲𧀂𧋭𧏭𧛙𧝾𧡳𧡾𧤷𧧞𧨞𧭕𧮜𧮾𧴇𨂻𨍳𨎘𨏝𨏵𨐂𨐄𨐲𨓮𨖡𨖦𨖪𨗽𨙣𨟧𨤊𨦜𨦝𨧑𨵻𨺄𨺻𨺾𨽑𨿁𨿸𩀓𩉃𩍫𩍱𩎋𩏍𩒟𩓚𩕖𩜿𩝰𩞛𩤻𩥣𩰥𩰨",
 "日": "亯冥圼复妟孴峕忁恴抇捑掲旦旧旨早旪旫旬旭旮旯旰旱旲旳旴旵时旷旹旺旻旼旽旾旿昀昁昂昃昄昅昆昇昈昉昊昋昌昍昍明昏昐昑昒易昔昕昖昗昘昙昚昛昝昞星映昡昢昣昤昦昧昨昩昪昫昬昭昮昰昱昲昳昴昵昶昷昸昹昺昻昽显昿晀晁時晃晄晅晆晇晈晊晋晌晍晎晏晐晑晒晓晔晕晖晗晘晙晚晛晜晞晟晠晡晢晣晤晥晦晧晨晩晪晫晬晭普景晰晱晲晳晴晵晶晶晶晷晸晹智晻晼晽晾晿暀暁暂暃暄暅暆暇暈暉暊暋暌暍暎暏暐暑暒暓暔暕暖暗暘暙暚暛暜暝暞暟暠暡暣暤暥暧暩暪暫暬暭暮暯暰暲暳暴暶暷暹暺暻暼暽暾暿曀曂曃曄曅曆曇曈曉曊曋曍曎曏曒曔曕曖曗曘曙曚曛曜曝曞曠曢曣曤曥曦曧曨曩曪曫曬曭曮曯曶曽最朂杲杳欥氜汨沓渇炅炚焨煚甠稥者耆萅蚎蠶蠺衵謈鈤間间阳陹香馹驲魯鲁㒲㛠㞱㡌㡢㥗㫐㫑㫒㫓㫔㫕㫖㫘㫙㫛㫜㫝㫞㫟㫠㫡㫢㫣㫥㫦㫧㫨㫩㫫㫬㫭㫮㫰㫱㫲㫳㫴㫵㫶㫷㫸㫹㫺㫻㫼㫽㫾㫿㬀㬁㬂㬃㬄㬅㬆㬇㬈㬉㬊㬋㬌㬍㬏㬐㬑㬒㬓㬔㬕㬖㬗㬘㬙㬚㬛㬜㬝㬞㬠㬡㬢㬣㬦㬨㬩㬫㬬㬭㬮㬯㳱㷸㸓䒤䕎䖑䥌䥌䫻䵒𠄄𠄊𠄋𠄵𠄵𠆝𠆝𠊽𠋍𠏑𠓤𠔙𠕌𠕙𠕾𠖆𠘀𠘗𠙊𠚠𠚠𠜷𠝅𠟘𠠡𠣚𠣤𠧫𠧻𠨅𠩒𠩩𠪀𠫮𠭩𠭿𠯐𠯭𠳲𠷚𠷳𠹉𠻶𠽳𠾝𡂶𡃮𡄋𡄌𡉭𡐑𡒦𡒧𡔓𡔓𡔻𡕱𡕳𡕺𡘐𡙑𡙴𡙺𡜑𡜖𡜗𡠕𡡨𡣁𡥌𡥣𡥨𡦇𡦏𡦩𡦬𡦷𡧼𡩳𡫖𡬩𡭪𡮢𡯙𡯟𡰶𡱔𡲉𡳟𡴏𡴜𡸈𡸦𡸱𡹒𡹨𡾡𡿤𢁯𢂚𢂦𢊓𢌂𢌂𢌧𢍋𢍔𢍬𢎃𢐉𢐖𢑢𢒠𢒧𢒳𢓴𢔕𢔽𢕛𢕱𢕴𢕿𢖚𢗭𢛹𢝮𢝼𢞦𢞹𢟫𢠍𢡄𢡳𢡽𢢳𢥟𢧋𢧛𢧬𢧭𢧸𢨀𢨈𢨢𢫾𢰐𢵄𢶁𢶭𢸰𢹯𢻣𢽵𢾞𣀚𣂢𣂸𣃀𣃧𣃸𣄻𣄼𣄽𣄾𣄿𣅀𣅁𣅂𣅃𣅄𣅅𣅆𣅈𣅊𣅌𣅍𣅎𣅏𣅐𣅒𣅓𣅔𣅗𣅘𣅙𣅚𣅛𣅜𣅝𣅞𣅟𣅠𣅡𣅢𣅣𣅤𣅥𣅦𣅧𣅨𣅩𣅩𣅪𣅫𣅬𣅭𣅮𣅰𣅱𣅴𣅵𣅶𣅷𣅸𣅹𣅺𣅻𣅼𣅽𣅾𣅿𣆀𣆁𣆃𣆄𣆅𣆆𣆈𣆋𣆌𣆍𣆎𣆏𣆐𣆑𣆒𣆓𣆔𣆕𣆖𣆗𣆘𣆙𣆚𣆝𣆠𣆡𣆢𣆣𣆤𣆥𣆦𣆧𣆪𣆫𣆬𣆭𣆯𣆰𣆱𣆳𣆴𣆵𣆶𣆷𣆸𣆹𣆺𣆻𣆼𣆾𣇀𣇁𣇂𣇄𣇆𣇈𣇉𣇊𣇋𣇌𣇍𣇎𣇏𣇐𣇒𣇔𣇕𣇖𣇖𣇗𣇘𣇚𣇜𣇝𣇞𣇟𣇠𣇡𣇢𣇣𣇤𣇥𣇦𣇧𣇨𣇩𣇪𣇫𣇬𣇭𣇮𣇯𣇰𣇱𣇱𣇲𣇳𣇵𣇶𣇷𣇸𣇹𣇺𣇻𣇽𣇿𣈀𣈁𣈃𣈄𣈅𣈆𣈈𣈉𣈊𣈋𣈌𣈍𣈎𣈏𣈐𣈑𣈒𣈓𣈕𣈗𣈙𣈚𣈛𣈜𣈝𣈞𣈠𣈢𣈣𣈤𣈥𣈦𣈧𣈨𣈩𣈪𣈫𣈬𣈭𣈮𣈯𣈰𣈲𣈳𣈴𣈵𣈶𣈷𣈸𣈹𣈺𣈻𣈼𣈾𣈿𣉀𣉁𣉂𣉃𣉅𣉆𣉇𣉉𣉊𣉋𣉌𣉍𣉎𣉏𣉐𣉒𣉓𣉕𣉖𣉗𣉘𣉙𣉚𣉛𣉜𣉞𣉟𣉟𣉢𣉣𣉣𣉤𣉥𣉦𣉧𣉩𣉪𣉫𣉭𣉮𣉯𣉰𣉱𣉲𣉳𣉴𣉵𣉶𣉸𣉹𣉻𣉼𣉽𣉾𣉿𣊀𣊁𣊃𣊄𣊅𣊆𣊇𣊈𣊊𣊋𣊌𣊍𣊎𣊏𣊐𣊑𣊓𣊕𣊗𣊘𣊙𣊜𣊝𣊞𣊠𣊡𣊢𣊥𣊨𣊩𣊪𣊬𣊭𣊭𣊭𣊭𣊮𣊯𣊱𣊲𣊳𣊴𣊵𣊶𣊹𣊺𣊻𣊽𣊿𣋀𣋁𣋂𣋃𣋅𣋆𣋉𣋊𣋋𣋌𣋏𣋑𣋒𣋓𣋔𣋗𣋘𣋙𣋚𣋛𣋜𣋝𣋠𣋡𣋢𣋥𣋦𣋧𣋩𣋪𣋫𣋬𣋭𣋱𣋲𣋳𣋵𣋸𣋹𣋺𣋻𣋼𣋽𣋾𣋿𣌀𣌁𣌂𣌄𣌆𣌇𣌈𣌉𣌋𣌐𣌑𣌑𣌔𣌕𣌖𣌗𣌘𣌙𣌝𣌟𣌡𣌬𣍔𣎦𣎱𣎱𣏬𣐥𣒋𣔑𣕩𣗨𣘒𣘔𣙣𣚕𣚤𣚼𣝖𣟟𣠨𣣤𣣩𣤝𣤞𣥜𣥶𣦕𣨯𣬰𣰖𣱩𣴉𣵀𣵖𣵥𣷐𣷤𣸼𣹈𣺝𣺯𣻥𣼔𣼗𣼦𣼬𣾝𣿥𣿳𤁎𤁑𤂡𤂽𤃑𤃝𤄗𤈋𤈌𤈵𤉆𤉊𤉴𤋉𤋓𤋪𤋯𤌮𤌰𤌱𤍷𤎳𤐎𤐲𤑥𤑮𤑻𤑼𤒁𤒃𤒫𤒺𤓊𤓢𤕄𤕄𤗱𤘵𤜌𤜔𤝍𤞾𤢠𤦛𤦴𤨜𤫝𤲉𤳠𤵖𤶓𤶚𤶿𤸅𤸐𤺂𤻣𤻰𤼰𤽳𥀟𥁻𥅏𥅭𥈣𥌳𥎇𥎏𥎭𥏓𥓣𥗨𥘀𥘗𥛾𥜏𥞞𥟔𥟵𥠝𥡳𥡴𥣀𥣐𥣣𥣷𥦍𥦦𥧤𥪰𥪶𥫏𥭣𥭧𥭷𥮀𥮞𥰸𥲏𥲸𥲹𥴉𥵀𥵒𥵘𥶪𥷸𥸒𥺸𥻍𥼪𥿀𦀆𦂊𦃙𦃷𦄡𦅊𦆊𦇢𦈀𦈏𦊸𦋂𦋷𦐇𦐮𦐲𦑹𦒂𦓂𦔈𦔢𦖫𦘘𦘙𦛠𦛭𦜄𦜷𦝮𦟢𦠪𦣃𦣙𦣵𦦋𦨙𦮆𦯖𦰇𦰨𦱗𦱤𦳜𦳱𦴄𦵆𦶛𦷎𦷣𦷹𦸋𦸥𦸩𦻒𦻤𦾍𦾥𦾧𦾪𦿡𦿫𦿹𧀈𧁎𧁢𧂓𧄈𧅪𧅿𧆒𧇅𧇋𧈘𧏒𧓟𧓹𧕜𧖤𧖮𧗧𧘁𧙴𧚵𧜊𧟊𧟹𧠗𧡭𧢪𧥵𧦊𧨓𧨚𧨤𧨥𧩍𧫭𧬉𧬢𧬣𧮔𧰮𧲥𧴈𧴉𧴞𧶨𧷰𧸣𧺝𧻼𧽫𧽱𧾉𧿭𨂈𨄸𨅩𨅱𨍌𨍟𨍯𨍵𨑨𨓆𨓙𨓤𨔒𨔫𨔯𨔹𨔹𨕈𨕒𨕚𨕲𨕻𨖞𨖦𨖪𨖸𨗈𨗋𨗍𨗐𨗣𨘎𨘜𨘳𨙘𨙘𨙘𨝥𨝶𨟕𨢔𨢳𨤞𨨇𨨊𨨋𨨌𨩄𨩑𨪴𨫜𨬵𨰴𨲤𨵻𨵽𨶍𨶧𨷄𨷉𨷝𨹞𨺎𨺐𨺷𨺻𨻙𨻥𨻶𨽭𨽭𨿹𩀃𩀙𩄉𩄕𩅆𩆗𩉉𩉎𩊵𩋲𩌀𩌞𩍋𩎂𩏍𩐃𩒳𩓷𩔉𩔏𩔐𩔰𩕻𩘠𩞗𩟻𩡍𩡑𩭱𩭻𩯐𩳺𩶑𩷥𩺏𩺣𩺿𪉲𪊂𪋠𪎗𪏰𪓤𪓤𪕈𪜌𪝿𪣍𪥨𪫉𪰄𪰆𪰇𪰈𪰉𪰊𪰋𪰌𪰍𪰎𪰏𪰐𪰑𪰒𪰓𪰔𪰕𪰖𪰗𪰘𪰙𪰚𪰛𪰜𪰝𪰞𪰟𪰠𪰡𪰢𪰣𪰤𪰥𪰦𪰧𪰨𪰩𪰪𪰫𪰭𪰮𪰱𪰲𪰳𪰴𪰵𪰶𪰷𪰸𪰹𪰺𪰻𪰼𪰽𪱀𪱂𪱃𪱄𪱅𪱆𪱆𪱇𪱈𪱉𪱋𪱌𪱍𪱏𪱑𪱒𪱓𪱔𪱖𪲂𪶴𪹒𪹷𪹼𫀝𫂵𫄒𫈧𫖢𫖥𫗇𫛂𫝐𫞂𫞃𫞄𫟱偺博憯晉㬙暑㬈㫤冒冕涅𣽞㒻鐕𫤗𫤥𫤳𫧍𫨉𫴸𫸸𫽰𬀦𬀧𬀨𬀩𬀪𬀫𬀬𬀭𬀮𬀯𬀰𬀱𬀲𬀳𬀴𬀸𬀹𬀻𬀾𬀿𬁁𬁂𬁃𬁅𬁆𬁇𬁈𬁉𬁊𬁋𬁍𬁎𬁐𬁑𬁒𬁓𬁓𬁕𬁗𬁘𬁙𬁛𬁜𬁝𬁝𬁞𬁟𬁠𬁡𬁢𬁣𬁤𬁦𬁧𬁨𬁩𬁪𬁯𬈌𬋟𬓁𬜩𬝏𬝶𬞯𬡿𬢂𬪐𬪡𬪥𬫴𬰼𬱉𬱌𬵅𬷳",
 "凵": "凶凷出凼凾凿歯画畵陆㓙㚎㧄㯶𠅉𠅠𠔛𠘽𠙄𠙵𠙶𠙷𠙸𠙺𠙻𠙼𠙽𠙿𠚀𠚁𠚂𠚃𠚄𠚅𠚇𠚈𠚉𠚊𠚋𠚌𠚎𠚏𠚑𠚓𠚔𠚕𠚗𠚘𠚙𠚚𠚝𠚠𠨀𠼧𠼨𡉆𡉸𡌷𡍑𡎕𡐪𡒇𡒽𡒽𡒽𡓌𡔌𡔘𡔘𡔘𡕰𡗖𡝛𡟢𡥢𡰮𡲂𡲡𡴳𡽀𢀄𢀺𢄕𢉈𢍬𢽆𢿔𣆪𣠐𣣯𣥼𣦋𣱥𣵊𣼏𤛵𤞍𥃂𥃬𥇤𥇵𥜨𥜪𥜭𥸖𥽦𦘙𦘚𦡙𦣹𦤍𦤴𦦹𦮍𦮒𦱳𧀈𧀈𧅱𧍹𧛳𧝾𧡠𧥜𧦆𧦙𧬿𧯽𨇔𨊥𨑿𨗽𨤦𨥢𨥣𨧵𨩹𨩻𨫘𨬭𨯳𨲢𨲣𨶼𨸸𨺚𨺞𩄥𩇑𩦲𩫖𩫮𩯣𩱛𩼕𪝿𪞶𪤫𪤵𪶕𪾝𫁯𫅎屮𫥯𫧋𫰩𬇈",
 "𠂹": "𠃀𠌶𡐟𡴤𡴬𡴬𡾑𢀩𢷼𣋓𣞚𤁺𤏀𤒫𤪩𤳶𤻸𥉚𦃃𦅽𦆗𦇈𦇻𦈀𦈁𦉈𦢕𧬑𧭨𧭯𨇏𨎯𨏜𨣩𨪼𨲻𨻌𩥗𩥨𩦁𩪳𩯸𩻢𩼿𪅈𪊁𪰞𪼽",
 "亏": "咢夸扝杇污疞肟芌蕚迃釫雩㠋㢪㺮䊸䔢𠄯𠌶𠟲𠮱𡘆𡚯𡟂𡩭𡩱𡶹𡹱𡹻𡼑𡼙𡾀𢇡𢗃𢘢𢣧𣅘𣅙𣉃𣋓𣋮𣧁𣪔𣽺𤂥𤷷𥁄𥃖𥃳𥅎𥏦𥏴𥏼𥏾𥐃𥚓𥜞𥝜𥫡𥺒𥺭𥿐𦈣𦏻𦕞𦖔𦜮𦦫𦫐𦲰𦽺𦾀𧈃𧈯𧘎𧘚𧩊𨈲𨍘𨑛𨙱𨚤𨜆𨜝𨡖𨢰𨧈𨬱𩉞𪻖𫅀𫒑𥁄𥃳𬚵𬞲𬧒𬬨𬲧",
 "冖": "亭亮亳亴冗写冚军冝冞冟冡冢冣冤冥冧冨冩冪叠壱壶壸壹壼夢夣寝帚带帯帶幂彙彚敹斚斝旁晕槖橐櫜欎毂毫牵疉疊睿稁翚肻臺舝茔茕荣荤荥荦荧莹莺萤营萦蒏蓥薧薨蘉蟗蠧蠹豪賫賷赍軍锓骎鬰鬱鷪鼏㓀㓁㓂㓃㕡㕢㚃㚄㨌㯱㯻㰆㲄㾛䑓䑝䒮䒯䒿䓨䘲䜭䜷䝉䝴䪥䯧𠁏𠁕𠅘𠅙𠅝𠅢𠅸𠅿𠆀𠆃𠆊𠆒𠆘𠊸𠏒𠐫𠑛𠒽𠕳𠕴𠕵𠕶𠕷𠕸𠕹𠕺𠕻𠕼𠕽𠕾𠕿𠖀𠖁𠖂𠖃𠖄𠖆𠖇𠖉𠖊𠖋𠖌𠖍𠖎𠖏𠖐𠖓𠖔𠖕𠖖𠖗𠖘𠖚𠖛𠖜𠖠𠖣𠖥𠖦𠖧𠖪𠖫𠙦𠚟𠟗𠢮𠢸𠤟𠤣𠪹𠫦𠬂𠬶𠭈𠭟𠭩𡁥𡁦𡁲𡄙𡄜𡊬𡋭𡌝𡌬𡎄𡎲𡐁𡐃𡐄𡐉𡐬𡑚𡑧𡒩𡔩𡔪𡔫𡔱𡔴𡔵𡔸𡔹𡔺𡔼𡕃𡕄𡕅𡕉𡕊𡕎𡖴𡖸𡗺𡚀𡚙𡜈𡨊𡫔𡫧𡫽𡬋𡴄𡶮𡹂𡹨𢂇𢃄𢄿𢅍𢆇𢏃𢑟𢑤𢑥𢑦𢑭𢑷𢑿𢒪𢒳𢒻𢕨𢚞𢜤𢢢𢢺𢣞𢧣𢧻𢭨𢮟𢮺𢲄𢳻𢷌𢺱𢼐𢽑𢽖𢿓𢿡𣀚𣁩𣂈𣃟𣆹𣇶𣈎𣉰𣍟𣎤𣎾𣏝𣑪𣓝𣓷𣗞𣗦𣘑𣘯𣙲𣚇𣚯𣜺𣝐𣝔𣝪𣞉𣟃𣟏𣠀𣠈𣠔𣠧𣠫𣠵𣠻𣡑𣡖𣡜𣡟𣡡𣡪𣡮𣡱𣣿𣤧𣧢𣨑𣩉𣩾𣪒𣪛𣪝𣪨𣪬𣪸𣫀𣫃𣫅𣫇𣫈𣫋𣫗𣫛𣬌𣰸𣱁𣳞𣴄𣴦𣴸𣸧𣸨𣺧𣻉𣼗𣽊𣿯𣿰𤂁𤇛𤇾𤈭𤋚𤋩𤌡𤌫𤍧𤏷𤐥𤐻𤐼𤑇𤑋𤒐𤒭𤓄𤓥𤔓𤕃𤖄𤙋𤛉𤜕𤢧𤣇𤤚𤧽𤨍𤨰𤨻𤩅𤪆𤪞𤪻𤬦𤯵𤯼𤴉𤴺𤶢𤾜𥊃𥋁𥋡𥌄𥌗𥎢𥑟𥔺𥖥𥖯𥗤𥙻𥜏𥢉𥮶𥯼𥴸𥵒𥵠𥹄𥺑𥺠𥾚𥿒𥿢𦃦𦄨𦄮𦇍𦉠𦉤𦊦𦊳𦐲𦐳𦑿𦘫𦙎𦠖𦡌𦡭𦢒𦢭𦤼𦤿𦥂𦥈𦥯𦦠𦦥𦦩𦬪𦭂𦭨𦭬𦮜𦲋𦴇𦴌𦴎𦴦𦷾𦻞𦻩𦼖𦾉𦾋𦾫𦿛𧀎𧀶𧁎𧁣𧁻𧄢𧆔𧇅𧇳𧋌𧎅𧑠𧒳𧓚𧓜𧕰𧖁𧖚𧚐𧛁𧜩𧝫𧞒𧞝𧞢𧞹𧞺𧢕𧣬𧮲𧰺𧴢𧷎𧷨𨏡𨓝𨘇𨘚𨘛𨡉𨤐𨪪𨬴𨺊𨺐𩏮𩏴𩏻𩒸𩕫𩠮𩠰𩥟𩬒𩰩𩲛𩹗𩺌𪃟𪆑𪇂𪒵𪓤𪞏𪞒𪞓𪞕𪩨𪪹𪭔𪳚𪸖𪺮𪻭𫂝𫇓𫇦𫉐𫓓𫝯𫞢𫞵冗冤󠄁夢婦掃𣲼浸爨穀𫣎𫤸𫤹𫤺𫤻𫤼𫤽𫪠𫬌𫬰𫬴𫯃𫰗𫴆𫶋𫹆𫿂𬃖𬃭𬅏𬅔𬅭𬆇𬆭𬆯𬈐𬈑𬋟𬋩𬋪𬋴𬒈𬒛𬗐𬛻𬜀𬜃𬜄𬜙𬝫𬝬𬤵𬮂𬯫𬰸𬳸",
 "豕": "冡圂家嶳烼瓥甤蟸豗豘豚豛豜豝豞豟豠豣豤豥豦豧豨豩豩豪豬豭豮豯豰豱豲豴豵豶豷逐㒪㒮㒸㣸㭬㯻㶋㻹㽔䀃䆥䖶䝅䝆䝇䝈䝉䝊䝋䝌䝍䝎䝏䝐䝑䝒䝓䝔䝕𠍪𠑡𠑮𠑳𠟵𠾪𡁷𡏇𡏔𡑸𡒴𡒿𡙾𡝍𡱰𢑡𢑼𢒪𢓻𣗃𣜡𣠕𣫖𣫚𣫛𣵠𣽁𣾞𤀴𤃣𤉄𤙦𤛚𤞱𤥨𤧽𤯼𥆋𥎔𥙮𥴎𦄘𦊽𦘄𦟙𦟢𦫆𧄘𧄙𧄟𧆈𧋠𧖹𧞢𧞹𧡄𧤲𧤶𧤷𧰦𧰩𧰪𧰫𧰮𧰯𧰰𧰱𧰲𧰳𧰴𧰷𧰸𧰹𧰺𧰿𧱀𧱁𧱂𧱃𧱄𧱅𧱇𧱈𧱉𧱋𧱍𧱎𧱏𧱐𧱑𧱒𧱓𧱔𧱕𧱖𧱗𧱙𧱚𧱛𧱜𧱝𧱞𧱟𧱢𧱣𧱤𧱥𧱨𧱩𧱪𧱮𧱯𧱰𧱱𧱲𧱴𧱵𧱷𧱸𧱹𧱺𧱻𧱼𧱽𧱿𧲀𧲁𧲂𧲄𧲅𧲆𧲇𧲉𧲊𧲋𧲌𧲍𧲎𧲏𧲏𧲏𧲐𧲑𧲒𧲓𧲔𧲕𧲖𧲗𧲘𧲙𧲚𧲛𧲞𨌇𨔿𨖡𨗉𨗹𨘹𨙆𨛛𨛤𨬸𨴯𨷡𨷼𨷼𨷼𨻐𨾃𩕑𩕺𩗛𩙤𩙤𩙤𩩒𩫕𩭐𩳟𪁥𪋁𪋢𪋱𪔟𪺏𪼅𫁾𫎅𫎆𫎈𫎉𫐴𫐾𫙠𫦀𫯦𫿘𬂓𬆲𬤻𬤼𬤽𬤾𬤿𬥀𬥁𬥂𬥃𬥄𬥅𬩥𬷓",
 "木": "休凩呆喿困宋寨床札术朰朲朳朴朵朶朷朸朹机朻朼朽朾杀杁杂权杄杅杆杇杈杉杊杋杌杍李杏材村杒杓杔杕杖杗杘杙杚杛杜杝杞杠条杢杣杤杦杧杩杪杫杬杭杮杯杰杲杳杴杵杶杷杸杹杺杻杼杽松板枀极枂枃构枅枆枇枈枉枊枋枌枍枎枏析枑枒枓枔枕枖林林枘枙枚枛枝枞枟枠枡枢枤枥枦枧枨枩枪枫枬枮枯枰枱枲枳枴枵架枷枸枹枺枻枼枽枿柀柁柂柃柄柅柆柇柈柉柊柋柌柍柎柏某柑柒染柔柕柖柘柙柚柛柜柝柞柟柠柡柢柣柤查柦柧柨柩柪柫柭柮柯柰柱柲柳柴柵柶柷柸柹柺査柼柽柾柿栀栁栂栃栅标栈栉栊栋栌栍栎栏栐树栒栓栕栖栘栚栛栜栝栞栟栠校栢栣栤栥栦栧栨栩株栫栬栭栮栯栰栱栲栳栴栵栶样核根栺栻格栽栾栿桀桁桂桃桄桅框桇案桉桋桍桎桏桐桒桓桔桕桖桘桙桚桛桜桝桞桠桡桢档桤桥桦桧桨桩桪桫桬桭桮桯桰桱桲桳桴桵桶桷桸桹桺桻桽桾桿梀梂梃梄梅梆梇梈梉梊梋梌梍梎梏梐梑梒梓梔梕梖梗梘梙梚梛梜梞梠梡梢梣梤梥梧梨梩梪梬梭梮梯械梱梲梳梴梶梷梸梹梻梼梽梾梿检棁棂棃棅棆棇棈棉棊棋棌棍棐棑棒棓棔棕棖棙棚棛棜棝棞棟棡棢棣棤棥棥棦棧棨棩棪棫棬棭森棯棰棱棲棳棴棵棶棷棸棹棺棻棿椀椁椂椃椄椅椆椇椈椊椋椌植椎椏椐椑椒椓椔椕椕椖椗椙椚椝椞椟椠椡椢椣椤椥椦椧椪椫椭椮椯椰椱椲椳椴椵椶椷椸椹椺椻椼椽椾椿楀楁楂楃楄楅楆楇楈楉楊楋楌楍楎楏楐楑楒楓楔楖楗楘楙楙楛楜楝楞楟楠楡楢楣楤楥楦楧楨楩楪楫楬楮楯楰楱楲楳楴極楷楸楹楺楻楼楽楾楿榀榁概榄榅榆榇榈榉榊榋榌榍榎榏榐榑榒榓榔榕榖榗榘榙榚榛榜榝榞榟榠榡榢榣榤榥榦榧榨榩榪榫榬榭榯榰榱榲榳榴榵榶榷榸榹榻榼榽榾榿槀槁槂槃槄槅槆槇槈槉槊構槌槍槎槏槐槒槓槔槕槖槗様槙槚槛槜槝槞槟槠槡槢槣槤槥槦槧槨槩槪槫槬槭槮槯槰槱槲槳槴槵槶槷槸槹槺槻槼槽槾槿樀樁樄樅樆樇樈樉樋樌樍樎樏樐樑樒樓樔樕樗樘標樚樛樜樝樞樟樠模樢樣樤樥樦樨権横樫樬樭樮樯樰樱樲樳樴樵樶樸樹樺樻樼樽樾樿橀橁橂橃橄橅橇橈橉橊橋橌橍橎橏橐橒橓橔橕橖橗橘橙橚橛橜橝橞機橠橡橢橣橤橥橦橧橨橩橪橫橬橭橮橯橰橱橲橳橴橵橶橷橸橹橺橻橼橽橾檀檁檂檃檄檅檆檇檈檉檊檋檌檍檎檏檐檑檓檔檖檗檘檙檚檛檜檝檞檟檠檡檢檣檤檥檦檧檨檪檫檬檭檮檯檰檱檲檳檴檵檶檷檸檹檺檻檽檿櫀櫁櫂櫃櫄櫅櫆櫇櫈櫉櫊櫌櫍櫎櫏櫐櫑櫒櫓櫔櫕櫖櫗櫘櫙櫚櫛櫜櫝櫞櫟櫠櫡櫢櫣櫤櫥櫦櫧櫨櫩櫪櫫櫬櫭櫮櫯櫰櫱櫲櫳櫴櫵櫶櫸櫹櫺櫻櫼櫽櫾櫿欀欁欁欂欃欄欅欆欇欈欉權欋欌欍欏欐欑欒欓欔欕欖欗欘欙欚欛欜欞欟沐渠炑燊牀狇琹相穼築罙臬荣蔾藁蘃蘖蚞螙采鈢閑闲集雧雬髤鬱鬱㕖㕲㚓㟳㦿㭁㭂㭃㭄㭅㭇㭈㭉㭊㭋㭌㭍㭎㭏㭑㭒㭓㭔㭕㭖㭗㭘㭙㭛㭜㭞㭟㭠㭡㭢㭣㭤㭥㭧㭨㭩㭪㭫㭬㭭㭮㭯㭱㭲㭳㭴㭵㭷㭸㭹㭺㭻㭼㭽㭾㭿㮀㮁㮂㮃㮄㮅㮆㮇㮈㮉㮊㮊㮋㮌㮍㮎㮏㮐㮑㮒㮓㮔㮕㮖㮗㮘㮙㮚㮛㮜㮝㮞㮟㮠㮡㮢㮣㮤㮥㮦㮧㮨㮩㮪㮫㮬㮭㮮㮯㮰㮱㮲㮳㮴㮵㮶㮷㮸㮹㮻㮽㮾㮿㯀㯁㯂㯃㯅㯆㯇㯈㯉㯊㯋㯌㯍㯎㯎㯏㯐㯑㯒㯓㯔㯕㯗㯘㯙㯚㯛㯜㯝㯞㯠㯢㯣㯦㯦㯧㯨㯪㯫㯭㯮㯯㯰㯱㯲㯳㯴㯵㯶㯷㯸㯹㯺㯻㯼㯽㯾㯿㰀㰁㰂㰄㰅㰇㰉㰊㰋㰌㰍㰎㰏㰐㰑㰒㰓㰔㰕㰖㰗㰘㰙㰚㰛㰜㳿䂞䊾䍒䛶䝗䢶䯂䲷䴢𠅺𠇾𠉟𠉪𠋕𠋸𠌖𠍇𠍝𠎀𠓸𠕖𠗛𠚐𠜀𠜽𠝚𠝱𠞘𠡷𠣛𠣺𠤡𠨇𠫡𠱞𠱟𠳸𠴬𠵟𠹠𡁽𡂆𡂢𡃎𡃎𡉣𡉿𡋠𡍕𡏪𡏫𡐨𡐨𡐽𡑙𡑻𡙚𡜉𡝋𡝥𡞓𡞮𡡵𡧖𡩈𡩎𡩼𡪔𡪧𡫎𡫗𡫝𡬾𡭌𡯐𡳨𡳭𡵬𡷻𡷼𡸻𡺄𡼨𡾹𡿈𡿗𡿛𢅿𢅿𢆇𢋏𢋝𢌶𢎊𢏲𢏼𢐇𢑯𢑿𢒹𢒹𢒹𢒹𢗦𢚤𢛐𢜣𢟂𢠖𢠖𢠘𢠘𢢙𢣬𢣬𢧊𢧹𢪮𢬺𢮄𢮕𢱴𢳗𢵍𢵙𢶱𢷌𢷡𢷽𢺌𢺌𢼢𢽓𢽫𢾂𢾟𣁩𣁩𣇏𣇮𣈌𣈎𣉫𣉴𣊝𣊻𣎋𣎶𣎷𣎸𣎼𣎾𣎿𣏀𣏅𣏆𣏇𣏈𣏉𣏊𣏌𣏍𣏎𣏏𣏐𣏑𣏒𣏓𣏔𣏕𣏖𣏗𣏘𣏙𣏚𣏛𣏜𣏝𣏞𣏠𣏢𣏣𣏥𣏦𣏧𣏨𣏩𣏪𣏬𣏭𣏯𣏰𣏱𣏳𣏴𣏵𣏶𣏷𣏸𣏹𣏺𣏻𣏼𣏽𣏾𣐂𣐃𣐄𣐅𣐆𣐉𣐊𣐋𣐌𣐍𣐎𣐐𣐑𣐒𣐓𣐔𣐕𣐖𣐗𣐘𣐚𣐛𣐜𣐝𣐞𣐟𣐠𣐡𣐢𣐣𣐤𣐥𣐦𣐧𣐨𣐩𣐪𣐫𣐬𣐭𣐮𣐯𣐰𣐱𣐵𣐶𣐸𣐹𣐻𣐼𣐽𣐾𣐿𣑀𣑁𣑂𣑃𣑄𣑆𣑇𣑈𣑉𣑊𣑌𣑎𣑏𣑐𣑑𣑒𣑓𣑔𣑔𣑕𣑖𣑗𣑘𣑙𣑚𣑛𣑝𣑞𣑟𣑠𣑡𣑢𣑣𣑤𣑥𣑨𣑩𣑪𣑫𣑬𣑭𣑮𣑯𣑰𣑱𣑲𣑳𣑴𣑵𣑶𣑷𣑸𣑹𣑺𣑻𣑿𣒂𣒃𣒅𣒆𣒇𣒈𣒉𣒊𣒋𣒌𣒍𣒎𣒏𣒐𣒑𣒒𣒓𣒔𣒖𣒗𣒘𣒙𣒝𣒞𣒟𣒡𣒢𣒤𣒥𣒦𣒧𣒨𣒩𣒪𣒫𣒬𣒭𣒮𣒯𣒰𣒱𣒲𣒴𣒵𣒶𣒷𣒸𣒹𣒺𣒺𣒻𣒼𣒽𣒾𣒿𣓀𣓁𣓂𣓃𣓄𣓅𣓅𣓇𣓈𣓉𣓊𣓋𣓌𣓍𣓎𣓏𣓐𣓒𣓓𣓔𣓖𣓗𣓙𣓛𣓜𣓜𣓝𣓞𣓟𣓠𣓡𣓢𣓤𣓥𣓦𣓧𣓨𣓩𣓪𣓫𣓬𣓭𣓮𣓰𣓱𣓲𣓳𣓶𣓷𣓸𣓹𣓻𣓽𣓾𣓿𣔀𣔁𣔂𣔃𣔄𣔅𣔆𣔇𣔈𣔊𣔋𣔎𣔏𣔐𣔑𣔒𣔓𣔔𣔖𣔘𣔙𣔚𣔛𣔜𣔝𣔞𣔟𣔠𣔡𣔢𣔤𣔥𣔦𣔧𣔨𣔪𣔫𣔬𣔭𣔮𣔰𣔲𣔳𣔴𣔶𣔷𣔸𣔺𣔻𣔼𣔽𣔾𣕀𣕁𣕂𣕃𣕄𣕅𣕆𣕇𣕈𣕉𣕊𣕋𣕍𣕎𣕎𣕏𣕐𣕑𣕑𣕒𣕓𣕔𣕕𣕖𣕗𣕘𣕚𣕛𣕜𣕝𣕞𣕠𣕡𣕢𣕥𣕦𣕧𣕨𣕩𣕪𣕪𣕫𣕬𣕭𣕮𣕰𣕱𣕱𣕲𣕳𣕶𣕷𣕸𣕹𣕻𣕼𣕿𣖀𣖁𣖂𣖃𣖄𣖅𣖆𣖇𣖈𣖉𣖉𣖊𣖋𣖌𣖍𣖎𣖏𣖐𣖑𣖒𣖓𣖔𣖕𣖖𣖗𣖘𣖙𣖚𣖜𣖝𣖞𣖟𣖠𣖡𣖣𣖥𣖧𣖨𣖩𣖪𣖪𣖫𣖬𣖭𣖮𣖯𣖰𣖱𣖲𣖳𣖴𣖵𣖶𣖷𣖸𣖹𣖺𣖻𣖼𣖽𣖿𣗀𣗂𣗂𣗃𣗄𣗆𣗇𣗈𣗉𣗊𣗋𣗌𣗍𣗎𣗏𣗐𣗑𣗒𣗔𣗕𣗖𣗘𣗙𣗛𣗜𣗝𣗞𣗟𣗠𣗢𣗢𣗤𣗦𣗨𣗩𣗫𣗬𣗭𣗮𣗯𣗰𣗲𣗳𣗴𣗵𣗸𣗹𣗼𣗽𣗿𣘀𣘁𣘂𣘃𣘄𣘅𣘇𣘉𣘊𣘋𣘌𣘎𣘓𣘔𣘕𣘖𣘗𣘘𣘙𣘚𣘛𣘜𣘞𣘟𣘠𣘡𣘢𣘣𣘤𣘥𣘦𣘧𣘨𣘩𣘪𣘬𣘭𣘮𣘯𣘰𣘱𣘲𣘳𣘴𣘵𣘶𣘷𣘸𣘹𣘺𣘻𣘼𣘽𣙀𣙁𣙃𣙄𣙅𣙆𣙇𣙉𣙊𣙋𣙌𣙍𣙎𣙏𣙏𣙐𣙑𣙒𣙓𣙔𣙕𣙖𣙗𣙘𣙙𣙚𣙛𣙜𣙝𣙟𣙢𣙣𣙤𣙥𣙦𣙧𣙨𣙩𣙪𣙫𣙭𣙯𣙱𣙲𣙳𣙳𣙴𣙵𣙶𣙷𣙺𣙻𣙼𣙽𣙾𣙿𣚀𣚁𣚃𣚄𣚅𣚆𣚇𣚈𣚉𣚊𣚋𣚌𣚍𣚎𣚏𣚑𣚒𣚓𣚔𣚕𣚖𣚗𣚘𣚙𣚚𣚛𣚝𣚞𣚠𣚢𣚣𣚥𣚦𣚧𣚩𣚪𣚫𣚬𣚭𣚮𣚯𣚱𣚲𣚳𣚴𣚵𣚶𣚷𣚸𣚹𣚼𣚽𣚾𣚿𣛀𣛁𣛂𣛄𣛇𣛈𣛉𣛊𣛋𣛎𣛏𣛐𣛑𣛓𣛔𣛖𣛗𣛘𣛙𣛚𣛛𣛜𣛝𣛞𣛟𣛠𣛡𣛢𣛣𣛦𣛧𣛨𣛩𣛪𣛫𣛬𣛭𣛮𣛯𣛱𣛲𣛳𣛴𣛵𣛷𣛸𣛹𣛺𣛻𣛽𣛿𣜀𣜁𣜂𣜃𣜄𣜅𣜆𣜇𣜉𣜊𣜌𣜍𣜎𣜏𣜐𣜑𣜒𣜔𣜖𣜗𣜘𣜙𣜚𣜝𣜞𣜞𣜟𣜠𣜡𣜤𣜥𣜦𣜧𣜪𣜫𣜬𣜭𣜮𣜯𣜰𣜲𣜳𣜴𣜵𣜶𣜷𣜸𣜼𣜿𣝀𣝁𣝂𣝃𣝅𣝆𣝇𣝇𣝈𣝉𣝊𣝋𣝌𣝍𣝎𣝏𣝐𣝑𣝒𣝓𣝔𣝔𣝕𣝗𣝘𣝙𣝚𣝟𣝠𣝢𣝣𣝤𣝦𣝧𣝨𣝩𣝫𣝬𣝰𣝱𣝲𣝵𣝶𣝷𣝸𣝺𣝺𣝻𣝼𣝽𣝾𣝿𣞀𣞁𣞂𣞆𣞆𣞆𣞇𣞈𣞉𣞋𣞌𣞍𣞎𣞏𣞐𣞑𣞒𣞓𣞔𣞕𣞗𣞘𣞚𣞝𣞞𣞠𣞡𣞢𣞣𣞣𣞥𣞦𣞧𣞪𣞬𣞭𣞮𣞯𣞱𣞲𣞳𣞶𣞸𣞹𣞺𣞻𣞽𣞾𣞿𣟀𣟁𣟂𣟃𣟄𣟅𣟆𣟇𣟉𣟊𣟋𣟌𣟍𣟎𣟏𣟐𣟔𣟕𣟖𣟗𣟘𣟙𣟚𣟛𣟝𣟞𣟟𣟡𣟣𣟤𣟥𣟨𣟩𣟪𣟫𣟬𣟭𣟯𣟰𣟱𣟲𣟳𣟴𣟵𣟶𣟷𣟸𣟹𣟺𣟻𣟾𣟿𣠂𣠃𣠄𣠅𣠇𣠉𣠊𣠋𣠌𣠍𣠐𣠑𣠓𣠔𣠗𣠘𣠚𣠛𣠜𣠝𣠞𣠟𣠠𣠡𣠢𣠣𣠤𣠥𣠦𣠧𣠨𣠩𣠪𣠭𣠯𣠰𣠱𣠲𣠵𣠵𣠷𣠸𣠹𣠺𣠻𣠼𣠾𣡀𣡁𣡂𣡃𣡄𣡅𣡊𣡋𣡌𣡎𣡐𣡑𣡑𣡑𣡒𣡓𣡔𣡘𣡛𣡞𣡟𣡠𣡡𣡡𣡢𣡣𣡤𣡦𣡧𣡨𣡩𣡪𣡫𣡬𣡭𣡮𣡮𣡱𣡱𣡲𣡴𣡵𣡶𣡷𣡸𣡸𣡹𣡺𣡻𣡼𣡿𣣙𣤂𣤜𣤷𣫩𣮰𣳰𣷘𣷞𣸑𣸑𣸯𣸴𣻤𣼃𣼅𣼆𣼝𣾐𣿚𤅨𤅯𤆰𤈀𤉬𤋐𤌓𤍕𤏆𤓄𤓽𤔥𤗊𤗣𤗥𤘬𤚊𤚦𤞎𤞷𤥾𤦲𤧮𤨗𤨪𤩒𤩰𤪇𤪒𤯃𤱃𤲭𤴜𤴜𤴷𤹄𤹅𤻿𤽰𥀏𥄢𥇱𥎢𥒯𥓃𥓼𥖥𥖥𥙭𥝰𥟩𥠓𥡑𥤏𥦼𥧞𥧽𥨑𥬸𥭰𥮣𥮧𥮮𥮹𥯻𥰿𥱋𥱝𥲒𥲴𥴍𥴟𥵰𥶠𥶥𥶺𥸉𥽒𥿰𥿴𦁛𦁜𦂋𦂘𦃨𦉃𦉚𦉚𦉠𦉠𦊋𦊧𦊻𦌆𦌮𦐔𦕂𦙣𦚬𦜈𦜪𦟅𦢭𦧢𦧤𦨀𦨀𦩺𦮇𦯧𦰁𦰔𦰕𦰧𦲓𦲜𦳿𦴇𦵶𦶖𦷎𦸯𦹂𦹶𦺀𦺁𦺯𦺵𦻆𦼋𦽶𦾢𦿕𧂦𧃬𧃹𧃾𧄡𧄨𧅦𧆘𧆘𧆘𧆘𧆘𧆘𧆘𧆘𧆘𧇆𧉓𧊱𧋝𧎀𧏪𧑇𧓜𧖚𧙤𧚦𧠸𧤇𧤈𧧇𧨇𧨯𧩜𧩴𧬔𧬗𧴿𧷱𧻞𨁻𨂏𨃮𨅈𨇌𨍕𨐖𨐣𨐻𨑋𨑋𨓣𨓫𨓸𨔋𨔘𨔱𨔼𨖒𨖚𨗷𨜎𨜑𨟥𨟧𨡋𨥀𨦅𨧲𨪧𨪧𨪪𨫜𨬏𨬘𨬮𨬮𨯁𨵳𨹼𨼙𨽌𨽬𨽬𩃕𩄓𩋑𩋞𩍳𩏁𩏮𩏴𩏴𩐷𩓠𩓬𩓮𩓸𩔛𩗉𩜿𩝀𩠽𩡦𩤋𩦅𩦭𩩥𩫡𩮁𩯖𩰦𩰧𩰩𩰩𩲙𩵦𩵴𩷌𩸏𩻳𩽑𪀶𪁁𪃥𪄐𪌎𪑤𪔇𪜅𪥄𪦖𪫟𪬓𪮾𪱱𪱲𪱳𪱴𪱵𪱶𪱷𪱸𪱹𪱺𪱻𪱽𪱾𪲀𪲁𪲂𪲃𪲄𪲆𪲇𪲈𪲉𪲊𪲋𪲌𪲍𪲎𪲏𪲐𪲑𪲒𪲓𪲔𪲖𪲗𪲘𪲙𪲚𪲛𪲜𪲝𪲞𪲟𪲠𪲢𪲤𪲦𪲨𪲩𪲪𪲫𪲮𪲰𪲱𪲲𪲳𪲴𪲶𪲷𪲹𪲺𪲻𪲼𪲾𪳀𪳁𪳂𪳃𪳄𪳅𪳆𪳇𪳈𪳉𪳊𪳊𪳍𪳎𪳏𪳐𪳑𪳒𪳓𪳕𪳖𪳗𪳘𪳙𪳚𪳛𪳜𪳞𪳠𪳡𪳢𪳣𪳤𪳥𪳧𪳩𪳪𪳬𪳮𪳰𪳱𪳲𪳳𪳵𪳶𪳷𪳸𪳹𪳺𪳾𪴀𪴁𪴂𪴃𪴅𪴆𪴇𪴈𪴉𪴊𪴌𪴍𪴎𪴐𪴑𪴒𪴓𪴔𪴕𪴖𪴗𪴘𪴙𪴚𪴛𪴜𪴝𪴟𪴠𪴡𪴢𪴤𪴥𪴦𪴦𪴧𪽻𪿈𫀔𫐠𫖟𫗹𫞉𫞊𫞋𫞌𫞍𫞎𫞏𫞐𫞑𫞿𫟒𫠏巢杞杓㭉柺桒梅椔𣚣築𫯹𫯹𫳍𫹎𫿻𬂜𬂝𬂞𬂠𬂡𬂢𬂣𬂤𬂦𬂩𬂪𬂫𬂬𬂭𬂮𬂯𬂰𬂱𬂲𬂳𬂵𬂶𬂷𬂹𬂺𬂻𬂼𬂾𬂾𬃀𬃁𬃃𬃄𬃆𬃇𬃈𬃉𬃊𬃋𬃌𬃍𬃎𬃏𬃐𬃑𬃒𬃒𬃓𬃗𬃘𬃛𬃜𬃝𬃞𬃟𬃠𬃡𬃢𬃣𬃤𬃥𬃦𬃧𬃨𬃩𬃩𬃪𬃫𬃬𬃭𬃮𬃰𬃳𬃵𬃶𬃸𬃹𬃺𬃼𬃽𬃾𬃿𬄀𬄀𬄁𬄂𬄃𬄄𬄄𬄅𬄆𬄇𬄈𬄉𬄊𬄋𬄌𬄎𬄏𬄐𬄑𬄒𬄓𬄔𬄕𬄖𬄗𬄘𬄙𬄚𬄛𬄝𬄟𬄠𬄡𬄢𬄣𬄤𬄥𬄦𬄧𬄨𬄩𬄪𬄫𬄬𬄭𬄯𬄱𬄲𬄳𬄴𬄵𬄸𬄹𬄺𬄻𬄼𬄽𬄿𬅀𬅁𬅅𬅆𬅇𬅈𬅉𬅊𬅋𬅌𬅍𬅍𬅎𬅏𬅏𬅑𬅒𬅔𬅔𬅕𬅕𬅗𬅘𬅘𬅚𬅜𬇏𬇪𬈇𬋁𬍓𬎳𬒟𬒟𬕢𬕣𬡲𬡲𬬈𬰸𬰸𬱧𬷠𬸿𬺜",
 "夢": "儚懜鄸顭㙹㝱䑅䙦𠓔𡗐𤔻𤘂𤻟𥌋𥶃𦫰𦿏𧲍𧲎𨞯𨮒𩆠𩆽𩟞𩴲𪇓𬁜𬄺𬠳𬩝𬰖𬵳",
 "󠄂": "𠒨𠒩𠠏𠭩𠹻𡂖𡡠𣰓𣼿𤄆𥔠𥗠𥢝𨞯𨮒𩴲",
 "⺅": "亿什仁仂仃仅仆仇仈仉仍仏仔仕他仗付仙仛仜仞仟仠仡仢代仦仨仩仪仫们仭仮仯仰仱仲仳仴仵件价仸仹任仼份仾仿伀伂伃伄伅伆伇伈伉伊伋伌伍伎伏伐休伒伓伔伕伖优伙伛伜伝伟传伢伣伤伥伦伧伨伩伪伫伬伭伮伯估伱伲伳伴伵伶伷伸伹伺伻似伽伾伿佁佂佃佄佅但佇佈佉佊佋佌位低住佐佑佒体佔何佖佗佚佛作佝佟你佡佢佣佤佦佧佨佪佫佬佭佮佯佰佲佳佴併佶佷佸佹佺佻佼佽佾使侀侁侂侃侄侅侇侈侉侊例侍侎侏侐侑侒侓侔侕侗侘侙侚供侜依侞侟侠侢侣侤侥侦侧侨侩侪侫侭侮侰侱侲侳侶侷侸侹侺侻侼侽侾便俀俁係促俄俅俆俇俈俉俊俋俌俍俏俐俑俒俓俔俕俖俗俘俙俚俛俜保俟俠信俣俤俥俦俧俨俩俪俫俬俭俯俰俱俲俳俴俵俶俷俸俹俺俻俼俽俾俿倀倁倂倃倄倅倆倇倈倊個倌倍倎們倒倓倔倕倖倗倘候倚倛倜倞借倠倡倢倣値倥倦倧倨倩倪倫倬倭倮倯倰倱倲倳倴倵倶倷倸债倻值倽倾倿偀偁偂偃偄偅偆假偈偉偊偋偌偍偎偏偐偑偒偓偔偕偖偗偘偙做偛停偝偞偟偠偡偢偣偤健偦偧偨偩偪偫偬偭偮偯偰偱偲偳側偵偶偷偸偺偻偼偽偾偿傀傁傂傃傄傅傆傇傈傉傊傋傌傍傎傏傐傑傒傓傔傕傖傗傚傛傜傝傞傟傠傡傢傣傤傥傦傧储傩傪傫催傭傮傯傰傱傲傳傴債傶傸傹傺傻傽傾傿僀僁僂僄僅僆僇僈僋僌働僎像僐僑僒僓僔僕僖僗僘僙僛僜僝僞僟僠僡僢僣僤僥僦僧僨僩僪僫僬僭僮僯僱僲僳僴僶僷僸價僺僻僼僽僾僿儀儁儂儃億儅儆儇儈儉儊儋儌儍儎儏儐儒儓儔儕儖儗儘儙儚儛儜儝儞償儠儡儢儣儤儥儦儧儨儩優儫儬儭儮儯儰儱儲儳儴儶儷儸儹儺儻儼儽儾化夜𠆧𠆨𠆩𠆬𠆮𠆯𠆰𠆱𠆲𠆵𠆶𠆸𠆺𠆻𠆼𠆽𠆾𠆿𠇁𠇂𠇅𠇆𠇇𠇈𠇐𠇑𠇒𠇓𠇔𠇕𠇖𠇗𠇘𠇙𠇛𠇝𠇞𠇟𠇡𠇢𠇣𠇤𠇦𠇩𠇪𠇱𠇲𠇳𠇴𠇵𠇶𠇷𠇸𠇹𠇺𠇻𠇼𠇽𠇾𠈀𠈁𠈄𠈅𠈆𠈇𠈈𠈉𠈊𠈋𠈍𠈎𠈐𠈓𠈕𠈖𠈗𠈚𠈜𠈝𠈞𠈟𠈠𠈡𠈤𠈥𠈦𠈧𠈨𠈩𠈪𠈬𠈭𠈯𠈰𠈱𠈲𠈳𠈷𠈸𠈹𠈺𠈼𠈿𠉀𠉂𠉃𠉄𠉅𠉇𠉈𠉉𠉊𠉍𠉎𠉏𠉐𠉑𠉔𠉕𠉖𠉗𠉘𠉚𠉛𠉜𠉝𠉟𠉠𠉡𠉢𠉣𠉤𠉥𠉦𠉧𠉨𠉩𠉪𠉫𠉬𠉮𠉯𠉰𠉱𠉳𠉶𠉷𠉸𠉹𠉺𠉾𠊀𠊁𠊂𠊃𠊄𠊅𠊆𠊇𠊈𠊎𠊏𠊐𠊑𠊒𠊔𠊕𠊖𠊗𠊘𠊚𠊜𠊞𠊟𠊠𠊡𠊢𠊣𠊤𠊥𠊦𠊨𠊩𠊪𠊫𠊬𠊭𠊮𠊯𠊰𠊳𠊴𠊵𠊶𠊷𠊸𠊹𠊻𠊼𠊽𠊾𠊿𠋀𠋁𠋂𠋃𠋄𠋇𠋉𠋊𠋋𠋍𠋏𠋕𠋖𠋘𠋙𠋚𠋜𠋝𠋞𠋟𠋠𠋢𠋤𠋥𠋦𠋧𠋨𠋩𠋪𠋫𠋬𠋭𠋮𠋯𠋰𠋱𠋲𠋴𠋵𠋶𠋷𠋸𠋹𠋼𠋽𠋾𠋿𠌀𠌁𠌃𠌄𠌅𠌇𠌌𠌍𠌎𠌏𠌐𠌒𠌔𠌗𠌘𠌛𠌜𠌝𠌞𠌟𠌠𠌣𠌤𠌥𠌧𠌨𠌩𠌫𠌬𠌭𠌮𠌯𠌰𠌱𠌲𠌳𠌴𠌵𠌷𠌸𠌹𠌻𠌼𠌾𠌿𠍀𠍁𠍂𠍃𠍄𠍅𠍇𠍈𠍊𠍋𠍌𠍍𠍎𠍏𠍑𠍒𠍔𠍖𠍙𠍚𠍛𠍝𠍠𠍡𠍢𠍣𠍥𠍦𠍧𠍩𠍪𠍫𠍬𠍭𠍯𠍱𠍲𠍴𠍵𠍷𠍸𠍸𠍹𠍻𠍼𠍽𠍾𠎀𠎁𠎂𠎄𠎅𠎇𠎊𠎎𠎐𠎒𠎓𠎔𠎕𠎖𠎗𠎝𠎞𠎠𠎡𠎢𠎣𠎥𠎦𠎧𠎨𠎩𠎪𠎫𠎬𠎭𠎮𠎯𠎰𠎱𠎲𠎴𠎷𠎸𠎹𠎺𠎻𠎼𠎽𠎾𠎿𠏀𠏁𠏂𠏃𠏄𠏅𠏈𠏊𠏋𠏌𠏐𠏑𠏒𠏔𠏕𠏖𠏗𠏘𠏙𠏛𠏜𠏝𠏞𠏟𠏠𠏡𠏢𠏣𠏤𠏥𠏦𠏨𠏩𠏪𠏫𠏮𠏯𠏰𠏱𠏲𠏴𠏵𠏶𠏷𠏹𠏺𠏻𠏼𠏽𠏾𠏿𠐀𠐁𠐄𠐅𠐆𠐉𠐊𠐋𠐌𠐍𠐏𠐐𠐑𠐓𠐔𠐕𠐘𠐚𠐛𠐜𠐝𠐞𠐟𠐠𠐥𠐦𠐨𠐩𠐪𠐫𠐬𠐭𠐮𠐳𠐴𠐵𠐶𠐷𠐹𠐺𠐻𠐼𠐾𠑀𠑁𠑃𠑄𠑆𠑇𠑈𠑊𠑌𠑍𠑎𠑏𠑑𠑒𠑓𠑔𠑗𠑘𠑙𠑚𠑛𠑞𠑟𠑠𠑡𠑢𠑣𠑤𠑥𠑩𠑪𠑬𠑭𠑯𠑵𠛷𠝦𠱧𠸨𠿬𡈖𡈖𡐏𡪢𡸝𢇯𢈄𢉔𢕇𢘢𢞋𢞫𢣍𢤁𢰑𢴀𢻺𢻺𣅛𣏘𣥰𣴾𣶚𣼞𤃙𤌈𤏹𤑅𤖿𤝦𤝧𤹑𤻉𥆉𥭪𥮃𥰈𥰉𥱭𥲼𦄱𦄲𦆬𦫻𦯐𦯣𦯱𦲴𦹿𦺭𦽝𧀸𧗞𧗡𧙾𧧹𧵰𧶣𧷴𨓵𨔃𨔮𨕩𨕼𨝈𨫖𨴟𨴟𨴟𨴧𩌎𩌻𩢇𩳇𩵑",
 "巛": "坙巠巡巢巤廵災甾舝葘輺邕郻鍿㑎㜽𠃞𠈉𠉽𠊦𠐄𠖠𠙗𠙭𠚋𠚴𠛏𠞜𠞝𠞤𠟾𠟿𠠌𠡔𠢶𠨀𠮰𠸵𡍗𡎗𡐕𡐫𡒏𡗇𡜏𡜣𡜪𡢆𡥜𡬲𡬸𡬹𡭎𡭑𡱟𡱴𡲑𡲒𡿂𡿩𡿪𡿬𡿭𡿭𡿮𡿱𡿲𡿳𡿴𡿵𡿶𡿷𡿸𡿺𡿻𡿼𡿽𡿾𡿿𢀁𢀂𢀃𢀆𢀇𢀈𢀉𢀎𢀎𢀎𢀏𢀫𢁎𢂩𢂪𢔉𢙉𢚰𢭓𢮟𢴫𣆬𣉑𣎂𣔜𣖊𣢱𣣦𣣦𣧄𣧽𣨸𣬡𣯐𣰩𣲂𣳧𣳺𣴖𣶄𣶖𣷁𣸟𣹺𣽪𤇱𤉩𤋴𤎁𤎞𤏕𤛉𤜓𤝾𤠪𤢪𤤼𤦄𤧜𤨏𤭉𤰝𤶆𤹻𤽋𤿄𤿄𤿄𥀮𥄉𥍧𥒤𥓱𥔥𥜿𥝁𥟜𥟸𥡍𥶢𦈄𦉔𦕭𦕯𦛁𦠼𦡓𦡳𦩽𦪴𦮋𦮨𦱝𧃡𧌵𧍼𧕂𧘄𧚱𧚲𧛵𧥥𧧮𧭄𧳀𧴲𧵜𨀨𨊩𨌷𨏋𨒰𨓷𨔃𨔜𨔭𨕥𨖁𨖝𨘇𨚳𨜇𨝉𨨬𨪮𨳖𨻨𨻩𩊼𩒆𩒳𩔯𩕝𩕻𩘃𩘛𩚓𩛋𩝖𩠐𩠒𩠖𩠜𩠝𩠞𩠡𩠢𩠣𩠪𩠫𩣃𩩀𩬷𩯓𩷮𩹒𩾣𪍔𪙂𪦅𪩡𪱵𫆞𫏦𫚅巡巢𫰊𫶩𫹱𬛂",
 "山": "乢亗仙冚凯剀喦埊奾媺宻密屲屳屴屵屶屷屸屹屺屻屼屽屾屾屿岀岀岁岂岃岄岅岆岇岈岉岊岋岌岍岎岏岐岑岒岓岔岕岖岗岘岙岚岜岝岞岟岠岢岣岤岥岦岧岨岩岪岫岬岭岮岯岰岱岲岳岴岵岶岷岸岹岺岻岼岽岾岿峀峁峂峄峅峆峇峈峉峊峋峌峍峎峏峐峑峒峓峔峕峖峗峘峙峚峛峜峝峞峟峠峡峢峣峤峥峦峧峨峩峪峫峬峭峮峯峰峱峲峳峴峵峷峸峹峺峻峼峽峾峿崀崁崂崃崄崅崆崇崈崉崊崌崍崎崏崐崑崒崓崔崕崖崗崘崙崚崛崜崝崞崟崠崡崢崣崤崥崦崧崨崩崪崫崬崭崮崯崰崱崲崳崴崵崶崷崸崹崺崻崼崽崾崿嵀嵁嵂嵃嵄嵅嵆嵇嵈嵉嵊嵋嵌嵍嵎嵏嵐嵑嵒嵓嵔嵕嵖嵘嵙嵚嵛嵜嵝嵠嵡嵢嵣嵥嵦嵧嵨嵩嵪嵫嵬嵭嵮嵯嵰嵱嵲嵳嵴嵵嵶嵷嵸嵹嵺嵻嵼嵽嵾嵿嶀嶁嶂嶃嶄嶅嶆嶇嶈嶉嶊嶋嶌嶍嶎嶐嶑嶒嶓嶔嶕嶖嶗嶘嶙嶚嶛嶜嶝嶞嶟嶠嶡嶢嶣嶤嶥嶦嶧嶩嶪嶫嶬嶭嶮嶯嶰嶱嶲嶳嶴嶵嶶嶷嶸嶹嶺嶻嶼嶽嶿巀巁巃巄巅巆巇巈巉巊巋巌巍巎巏巐巑巒巓巔巕巖巗巘巙巚幑幽徴旵杣梤氙汕汖溄潂灿疝秈籼耑舢觊訔訕讪豈赸軕輋辿邖銟閊鰴黴㑎㞤㞥㞦㞧㞨㞩㞪㞫㞬㞭㞮㞯㞰㞱㞲㞳㞴㞵㞶㞸㞹㞺㞻㞼㞽㞾㞿㟀㟁㟂㟃㟄㟅㟆㟇㟈㟉㟊㟋㟌㟍㟎㟏㟐㟑㟒㟓㟔㟕㟖㟗㟘㟙㟚㟛㟜㟝㟞㟟㟠㟡㟢㟣㟤㟥㟦㟧㟨㟩㟪㟫㟬㟭㟮㟯㟰㟱㟲㟳㟴㟵㟶㟷㟸㟹㟺㟻㟼㟽㟾㟿㠀㠁㠂㠃㠄㠅㠆㠇㠈㠉㠊㠋㠌㠍㠎㠏㠐㠑㠒㠓㠔㠕㠖㠗㠘㠙㠚㠛㠜㠝㠞㠟㠠㠡㠣㠤㠥㠦㠨㢫㣲㬞㰞㼘㿂䘗䛝䟖䧙䳥䴮𠈦𠉚𠊂𠊵𠌝𠎣𠑖𠔞𠔞𠔞𠘳𠝀𠝦𠝴𠝾𠣢𠥆𠨤𠨤𠨤𠭏𠮍𠮘𠮿𠰛𠳥𠵙𠸉𠻭𠼌𠼜𠽭𠾩𡀏𡀕𡄨𡆯𡇩𡊏𡊽𡎨𡎨𡎨𡐜𡒑𡒑𡒑𡓚𡓮𡔘𡔘𡔘𡕿𡖕𡖕𡚴𡛎𡜪𡟶𡠾𡡻𡢛𡤇𡥏𡥐𡦙𡦙𡦙𡦣𡦯𡧸𡯪𡴭𡴮𡴯𡴰𡴱𡴳𡴴𡴵𡴶𡴷𡴸𡴹𡴺𡴻𡴼𡴽𡴾𡴿𡵀𡵁𡵂𡵃𡵅𡵆𡵇𡵈𡵉𡵊𡵋𡵌𡵍𡵎𡵏𡵐𡵒𡵓𡵔𡵕𡵖𡵘𡵙𡵚𡵛𡵜𡵝𡵞𡵟𡵡𡵢𡵣𡵤𡵤𡵥𡵦𡵧𡵨𡵩𡵪𡵫𡵬𡵭𡵮𡵯𡵰𡵱𡵲𡵳𡵴𡵵𡵶𡵷𡵸𡵹𡵺𡵻𡵼𡵽𡵾𡵿𡶀𡶃𡶄𡶅𡶆𡶇𡶈𡶉𡶊𡶋𡶌𡶍𡶎𡶏𡶐𡶑𡶒𡶔𡶕𡶗𡶘𡶙𡶚𡶛𡶜𡶝𡶞𡶟𡶠𡶡𡶢𡶣𡶤𡶥𡶦𡶧𡶨𡶪𡶫𡶬𡶭𡶮𡶯𡶰𡶱𡶲𡶳𡶴𡶵𡶶𡶷𡶹𡶺𡶻𡶼𡶽𡶾𡶿𡷀𡷁𡷂𡷃𡷄𡷅𡷆𡷇𡷈𡷈𡷈𡷉𡷊𡷋𡷌𡷍𡷎𡷏𡷐𡷑𡷒𡷓𡷕𡷖𡷗𡷘𡷙𡷚𡷛𡷝𡷞𡷟𡷠𡷡𡷢𡷣𡷥𡷦𡷧𡷨𡷫𡷭𡷮𡷯𡷰𡷱𡷲𡷳𡷴𡷶𡷶𡷷𡷸𡷹𡷺𡷻𡷻𡷼𡷼𡷽𡷾𡷿𡸀𡸂𡸃𡸄𡸅𡸆𡸆𡸈𡸉𡸊𡸋𡸌𡸍𡸎𡸏𡸑𡸒𡸔𡸕𡸖𡸗𡸘𡸙𡸚𡸛𡸜𡸝𡸟𡸠𡸡𡸢𡸣𡸤𡸥𡸦𡸨𡸩𡸪𡸫𡸬𡸭𡸮𡸯𡸱𡸲𡸳𡸴𡸵𡸷𡸸𡸻𡸼𡸽𡸾𡸿𡸿𡹀𡹁𡹂𡹃𡹄𡹅𡹆𡹇𡹈𡹉𡹊𡹋𡹌𡹎𡹏𡹐𡹑𡹒𡹓𡹔𡹕𡹖𡹗𡹙𡹚𡹛𡹜𡹝𡹞𡹟𡹠𡹡𡹢𡹣𡹤𡹥𡹦𡹧𡹨𡹩𡹪𡹫𡹬𡹭𡹮𡹯𡹰𡹱𡹲𡹳𡹴𡹵𡹶𡹷𡹸𡹹𡹺𡹻𡹽𡹾𡹿𡺁𡺂𡺄𡺅𡺆𡺇𡺈𡺉𡺊𡺋𡺍𡺎𡺏𡺐𡺑𡺓𡺔𡺕𡺖𡺗𡺘𡺙𡺚𡺛𡺜𡺞𡺟𡺠𡺡𡺢𡺣𡺤𡺥𡺦𡺧𡺨𡺩𡺪𡺫𡺬𡺭𡺰𡺱𡺴𡺵𡺷𡺸𡺹𡺺𡺼𡺽𡺾𡺿𡻀𡻁𡻂𡻃𡻄𡻅𡻆𡻇𡻈𡻉𡻊𡻋𡻌𡻌𡻏𡻐𡻑𡻒𡻓𡻔𡻕𡻖𡻗𡻘𡻙𡻚𡻛𡻜𡻝𡻞𡻠𡻢𡻣𡻥𡻦𡻦𡻦𡻧𡻨𡻩𡻫𡻬𡻭𡻮𡻯𡻰𡻱𡻲𡻳𡻴𡻵𡻶𡻷𡻸𡻹𡻺𡻻𡻼𡻽𡻾𡻿𡻿𡼁𡼂𡼃𡼄𡼅𡼆𡼇𡼈𡼉𡼊𡼋𡼌𡼍𡼎𡼏𡼐𡼑𡼒𡼓𡼔𡼕𡼖𡼗𡼘𡼘𡼘𡼙𡼚𡼛𡼜𡼝𡼞𡼟𡼡𡼢𡼣𡼤𡼥𡼦𡼧𡼨𡼩𡼪𡼫𡼬𡼭𡼮𡼯𡼱𡼲𡼳𡼴𡼵𡼶𡼷𡼸𡼹𡼺𡼼𡼾𡼿𡽀𡽂𡽃𡽅𡽆𡽇𡽈𡽉𡽊𡽋𡽌𡽍𡽎𡽑𡽔𡽖𡽗𡽘𡽙𡽚𡽛𡽜𡽝𡽞𡽟𡽠𡽡𡽢𡽣𡽤𡽥𡽦𡽨𡽩𡽪𡽫𡽬𡽭𡽮𡽯𡽱𡽲𡽳𡽴𡽵𡽶𡽷𡽹𡽺𡽻𡽼𡽽𡽾𡽿𡽿𡽿𡾁𡾂𡾃𡾄𡾅𡾆𡾈𡾉𡾊𡾋𡾌𡾎𡾏𡾐𡾑𡾒𡾓𡾔𡾖𡾗𡾗𡾗𡾘𡾙𡾚𡾛𡾜𡾝𡾞𡾟𡾠𡾡𡾢𡾣𡾤𡾥𡾦𡾦𡾨𡾩𡾪𡾫𡾬𡾭𡾮𡾯𡾰𡾱𡾳𡾴𡾵𡾶𡾸𡾹𡾺𡾻𡾼𡾽𡾾𡾿𡾿𡿀𡿁𡿃𡿄𡿅𡿆𡿇𡿈𡿉𡿊𡿋𡿌𡿍𡿎𡿏𡿑𡿒𡿓𡿔𡿕𡿖𡿗𡿙𡿚𡿜𡿝𡿞𡿟𡿠𡿡𡿣𡿤𡿤𡿥𢅇𢅢𢇢𢈃𢉵𢉵𢉵𢊞𢌚𢌲𢏫𢐍𢔎𢔹𢔺𢕄𢕅𢖄𢖅𢖌𢘏𢙉𢙙𢚭𢚼𢞳𢢄𢢋𢣨𢧬𢧾𢩐𢩳𢫂𢫏𢭈𢭍𢭞𢮶𢯈𢳕𢶟𢶮𢶼𢼸𢽃𢽗𢽸𢾷𢿁𢿚𢿹𣀋𣁋𣂟𣂫𣂲𣂹𣆠𣇂𣉀𣊽𣋎𣋎𣋎𣎐𣑹𣒈𣒎𣖱𣝙𣝤𣞏𣞏𣞏𣠍𣠴𣣗𣦣𣦣𣦣𣧈𣧽𣮽𣲸𣳒𣳺𣴽𣵘𣵙𣵜𣶟𣷪𣹨𣹵𣺑𣺧𣻮𣻮𣽵𤀆𤁃𤁑𤁚𤄔𤇱𤈡𤈹𤉆𤋫𤋫𤋫𤍉𤎚𤔮𤕏𤗠𤚈𤚞𤜬𤝾𤞃𤠦𤢃𤢠𤣧𤣶𤤓𤤼𤨈𤪖𤲁𤶆𤶵𤸢𤸢𤸢𤹳𤺠𤿣𥄝𥆲𥎽𥐢𥒤𥓤𥕇𥖱𥗿𥙏𥞇𥣌𥪄𥺺𥼇𥼈𦀼𦂴𦆮𦊤𦏦𦏿𦒴𦔺𦖄𦘹𦛁𦛎𦝶𦝶𦝶𦞄𦞄𦞄𦠔𦠙𦠟𦠠𦢜𦣟𦨁𦨄𦭗𦭣𦰷𦷤𦼢𦾝𧉋𧊩𧏭𧑵𧗣𧗬𧗲𧗼𧘁𧡁𧤿𧥅𧧱𧨨𧪙𧪴𧫶𧯶𧰀𧳀𧶑𧾖𨁧𨇉𨌂𨓂𨓏𨓒𨓹𨔲𨗆𨘳𨛟𨜋𨤁𨤪𨥉𨨐𨩟𨩪𨬌𨬠𨭅𨰁𨲲𨻅𨻎𨻪𨼅𨽰𨽰𨽰𨽱𨽱𨽱𨿻𩊼𩍺𩒔𩓆𩓈𩓵𩓻𩓼𩖞𩛋𩛎𩜖𩟑𩟑𩟑𩟜𩣃𩥘𩦏𩧱𩨷𩩀𩫺𩬷𩭎𩲀𩲈𩷜𩿭𪂓𪌠𪌨𪑛𪗘𪝇𪥭𪦩𪧅𪨉𪨢𪨣𪨤𪨥𪨦𪨧𪨨𪨩𪨪𪨫𪨬𪨭𪨮𪨯𪨰𪨱𪨲𪨳𪨴𪨵𪨶𪨷𪨸𪨹𪨺𪨻𪨼𪨽𪨾𪨿𪩀𪩁𪩂𪩃𪩄𪩅𪩆𪩇𪩈𪩉𪩊𪩋𪩌𪩍𪩎𪩏𪩐𪩑𪩒𪩓𪩔𪩕𪩖𪩗𪩘𪩙𪩚𪩛𪩜𪩝𪩞𪩟𪩠𪳢𪶁𪷁𪹖𫂳𫃪𫐅𫓈𫚽𫛃𫝳𫝴峀弢炭𫤀𫪻𫵱𫵲𫵳𫵴𫵵𫵶𫵷𫵸𫵹𫵺𫵻𫵼𫵽𫵾𫵿𫶀𫶁𫶂𫶃𫶄𫶅𫶆𫶇𫶈𫶉𫶊𫶋𫶌𫶍𫶎𫶏𫶐𫶑𫶒𫶓𫶔𫶕𫶖𫶗𫶘𫶙𫶚𫶛𫶝𫶞𫶠𫶡𫶢𫶣𫶤𫶥𫶦𬍑𬍮𬑭𬜡𬟴𬫘𬯤𬲤𬲴𬺘",
 "彑": "彔彖彘彙彜彝疉㣇㬪𢑓𢑗𢑞𢑣𢑦𢑷𤴁𥪬𧟕𧧼𧰲𧰺𧱈𨌊𪫇𫹈",
 "巾": "凧匝吊帀币市布帄帆帉帊帋帍帎帏帐帑帒帓帔帕帖帗帘帙帚帛帜帞帟帠帡帢帤帥带帧帨帩帪帬帮帯帱帳帴帵帶帷帹帺帻帼帽帾帿幀幁幂幃幄幅幆幇幈幊幋幌幍幎幏幑幒幓幔幕幖幗幘幙幛幜幝幞幟幠幡幢幣幤幥幦幧幨幩幪幬幭幮幯幰幱斾簚芇銟㠲㠳㠴㠵㠶㠷㠸㠹㠺㠻㠼㠽㠾㠿㡁㡂㡃㡄㡅㡆㡇㡈㡉㡋㡌㡍㡎㡐㡑㡒㡓㡔㡕㡖㡗㡘㡙㡚㡛㡜㡝㡞㡟㡠㡡㡢㡤㡦㡧㡨㡩㡪㣇㧆㼙䘜䶓𠂰𠄛𠇛𠐂𠚙𠚙𠛚𠛯𠤚𠫦𠬥𠭽𠭾𠭾𠭿𠮇𠮇𠿖𡃐𡆫𡈝𡈪𡋁𡍈𡎍𡕺𡚙𡟣𡩅𡪒𡪒𡰯𡱃𡴅𡻾𢀋𢁒𢁓𢁔𢁕𢁖𢁗𢁘𢁙𢁚𢁛𢁜𢁝𢁝𢁟𢁠𢁡𢁢𢁣𢁥𢁦𢁧𢁨𢁩𢁪𢁫𢁬𢁮𢁯𢁰𢁱𢁲𢁳𢁴𢁵𢁶𢁷𢁸𢁹𢁻𢁼𢁽𢁾𢁿𢂀𢂁𢂃𢂄𢂅𢂆𢂇𢂈𢂉𢂉𢂊𢂌𢂍𢂎𢂐𢂑𢂒𢂓𢂔𢂕𢂗𢂘𢂙𢂚𢂛𢂝𢂟𢂠𢂡𢂣𢂥𢂦𢂧𢂨𢂩𢂪𢂫𢂬𢂭𢂮𢂯𢂰𢂱𢂲𢂳𢂴𢂵𢂼𢂽𢂿𢃀𢃁𢃃𢃄𢃅𢃆𢃇𢃈𢃉𢃍𢃎𢃏𢃑𢃒𢃓𢃔𢃕𢃖𢃗𢃙𢃚𢃛𢃜𢃝𢃞𢃟𢃠𢃡𢃢𢃣𢃤𢃥𢃦𢃧𢃨𢃩𢃪𢃫𢃬𢃭𢃮𢃯𢃰𢃱𢃲𢃴𢃶𢃷𢃷𢃸𢃹𢃻𢃼𢃽𢃾𢃿𢄁𢄄𢄅𢄆𢄈𢄊𢄌𢄍𢄎𢄐𢄑𢄒𢄓𢄕𢄖𢄘𢄙𢄚𢄛𢄜𢄝𢄞𢄟𢄠𢄡𢄢𢄣𢄤𢄥𢄦𢄧𢄨𢄩𢄪𢄬𢄬𢄭𢄮𢄯𢄰𢄱𢄲𢄳𢄴𢄵𢄶𢄸𢄹𢄺𢄻𢄼𢄽𢄾𢄿𢅀𢅂𢅃𢅅𢅆𢅇𢅊𢅋𢅌𢅍𢅎𢅏𢅐𢅑𢅒𢅓𢅔𢅕𢅖𢅗𢅘𢅙𢅚𢅝𢅟𢅠𢅡𢅣𢅤𢅥𢅩𢅪𢅫𢅭𢅮𢅯𢅰𢅱𢅲𢅳𢅴𢅵𢅶𢅷𢅸𢅹𢅻𢅼𢅽𢅾𢅿𢆀𢆁𢆂𢆃𢆄𢆆𢆇𢎭𢑞𢑢𢑦𢑩𢑭𢑷𢑸𢑺𢑼𢒠𢒯𢒴𢓹𢖨𢯯𢲄𢲽𢺶𣀿𣀿𣊸𣏑𣑹𣥈𣬢𣮳𣴗𣴯𣹷𣻉𤌝𤌝𤜧𤟝𤣇𤤚𤸷𥅹𥦻𥪄𥼇𥿸𦀃𦀦𦈿𦓠𦚿𦛎𦛭𦥱𦭬𦳟𦷾𦼡𦼡𧁻𧂓𧅿𧆞𧆤𧆮𧇇𧇧𧈒𧐲𧖂𧝫𧞝𧭕𧱔𧱯𧲞𧼣𨒝𨒾𨓝𨔄𨔻𨕷𨘛𨬁𨵂𨹓𩅲𩇪𩊟𩊟𩒧𩫎𩫹𩬒𩺌𩽟𩽟𪋙𪋙𪚑𪤷𪩳𪩴𪩶𪩷𪩸𪩹𪩻𪩼𪩽𪩾𪩿𪭑𪭬𪲍𪶞𫉓𫜱婦帨帽幩掃𫨂𫨉𫨝𫩒𫯜𫶽𫶾𫶿𫷀𫷁𫷂𫷄𫷅𫷆𫷈𫷉𫷊𫷋𫷌𫷎𫷏𫷐𫷑𫷒𫼩𬂷𬇣𬏹𬒛𬗓𬝼𬨪𬫪",
 "𡿨": "𡸝𢴜𫝓𫵎𬠸",
 "厶": "么云仏允公勾厷厸厸厹厺去厼厽县叀叁参台囜圗夋夣奙広庅弁弘悬払桳梥溬牟畆畚矣私窓篡簒羗育舝貟貵贠軬㐬㑓㕕㕕㕗㦯㳿㺨㻆㿝䨶䳌𠂓𠆉𠇜𠉪𠍋𠍍𠒊𠒊𠔚𠔩𠔩𠔰𠔰𠗛𠘭𠘯𠙃𠙃𠙸𠚦𠛏𠛗𠢼𠩯𠫓𠫔𠫕𠫖𠫗𠫘𠫙𠫛𠫜𠫞𠫞𠫟𠫠𠫡𠫢𠫣𠫥𠫦𠫧𠫨𠫨𠫫𠫫𠫫𠫬𠫬𠫬𠫬𠫭𠫮𠫯𠫯𠫯𠫰𠫰𠫰𠫱𠫱𠫱𠫲𠫵𠫶𠫸𠫸𠫸𠫹𠫹𠫻𠫼𠫼𠫼𠫽𠫿𠬀𠬀𠬁𠬁𠬁𠬂𠬂𠬊𠬋𠬋𠬏𠬟𠮘𠯷𠴧𠴧𠴧𠴬𠸲𠸲𠿆𡈄𡈇𡈫𡈱𡉸𡊄𡊏𡋠𡌺𡍕𡐽𡓙𡓸𡓸𡓸𡘞𡙺𡜀𡜗𡜫𡞍𡟘𡠎𡠐𡠐𡧵𡪨𡮚𡮟𡮟𡮟𡮟𡯆𡱗𡿮𢁔𢉖𢉖𢊩𢊹𢋭𢌹𢌹𢏐𢏓𢏟𢐵𢓽𢚜𢚝𢛐𢡘𢤚𢤚𢥁𢨁𢩍𢬵𢮕𢮥𢰁𢷐𢽫𢿝𢿮𣃐𣇚𣈠𣌡𣏇𣓧𣔊𣕏𣕙𣕛𣘎𣚢𣛾𣝂𣢵𣥬𣶣𣷼𣽱𣽱𣽱𤀮𤀮𤂡𤆃𤆴𤉬𤓏𤓏𤗊𤚊𤚷𤛉𤠧𤢚𤢚𤧉𤭩𤮖𤰑𤰜𤰸𤱊𤱊𤱸𤲁𤲙𤴋𤴛𤴝𤴞𤴡𤸐𤻰𥀡𥁬𥁱𥂒𥄜𥇱𥋦𥋦𥏑𥐸𥒗𥚪𥚪𥚪𥛪𥛪𥟋𥠎𥠩𥪣𥫎𥫛𥮔𥮧𥱆𥱕𥲡𥶺𥹻𥹼𥿢𥿵𦁆𦊰𦌄𦍄𦍄𦍯𦎅𦎅𦏱𦏱𦏱𦑐𦔗𦔗𦖶𦚁𦟅𦟅𦟅𦢐𦥀𦧐𦩇𦮚𦯨𦯩𦯩𦰧𦲃𦴅𦴅𦶖𦶖𦶖𦸼𦹿𦹿𧀶𧄭𧈌𧈥𧈧𧌦𧏩𧐳𧐳𧑵𧫐𧴵𧴵𧶀𨄭𨄭𨅈𨇈𨊢𨊪𨋿𨋿𨏛𨏛𨏡𨐄𨖥𨖥𨘇𨚸𨜎𨝣𨝤𨝤𨝧𨝧𨠒𨠪𨢄𨢺𨥡𨥣𨧲𨬘𨭅𨲄𨴌𨴘𨸻𨺮𨼙𨾰𨿈𩃃𩃃𩅏𩅏𩆹𩋑𩏎𩓎𩓗𩚀𩛬𩝘𩞶𩟌𩰼𩳭𩹧𪌥𪞁𪡂𪤘𪵎𪵨𫊲𫐊𫐜𫐶𫒯𫒵𫝅𫟉𠘺圖育裗𫦺𫨦𫨧𫨨𫨪𫨫𫰇𫵝𫶩𫹸𫹹𫿶𬄒𬎤𬖎𬢹𬨚𬫾",
 "𠂉": "乞乾伤勧午塩复尓斻施斾斿旂旃旄旅旆旇旊旋旌旍旎族旐旒旓旖旗旚旛旜旝旞旟栴権歓殇每气潅観雗飭饬鶾㐌㑅㘯㫊㫋㫌㫍㫏𠇪𠚗𠚻𠢇𠩄𠫟𠭕𠯏𠰚𠰞𠵰𡉛𡌖𡐈𡖽𡟐𡦇𡦋𡶠𡻵𡼺𢄔𢚮𢠑𢮾𢰈𢱯𣃦𣃧𣃨𣃩𣃬𣃭𣃮𣃯𣃰𣃳𣃴𣃵𣃹𣃻𣃼𣃽𣃿𣄀𣄆𣄉𣄊𣄐𣄑𣄕𣄖𣄘𣄙𣄞𣄠𣄡𣄢𣄦𣄧𣄨𣄪𣆋𣎍𣒰𣔫𣗍𣘺𣡅𣢴𣰎𣱪𣸯𤃳𤍸𤙚𤞆𤣧𤰗𤱏𤵎𤷒𤹫𥂁𥃡𥊇𥐬𥑅𥙚𥙡𥛏𥡺𥩷𥫧𥫧𥫧𥫮𥫮𥫮𥬚𥲬𥸽𥾨𥿜𦂚𦕗𦙋𦙳𦣪𦣬𦣷𦩂𦩻𦹭𧛳𧠃𧥷𧧂𧵉𧺞𧻝𧽳𧾅𧿦𨀫𨂟𨈨𨑶𨔼𨗼𨘋𨢒𨣎𨥊𨫙𨫝𨸛𩉳𩏑𩏛𩑡𩔽𩕇𩙴𩚤𩚸𩡹𩣓𩵸𩷸𩾻𪉡𪉹𪥙𪭻𪮝𪯳𪯶𪯸𪯽𪰄𪰅𪴡𫑉𫕗𫖪𫗘𫩰𫹽𫼟𫾦𫿋𬀀𬀂𬀃𬀄𬀅𬀆𬀇𬀈𬀋𬀌𬀍𬀏𬀐𬀒𬀓𬀔𬀕𬀖𬀘𬀙𬀚𬀜𬀝𬀞𬀟𬀠𬀡𬀢𬀣𬀤𬀷𬄒𬐚𬐱𬢺𬱽𬲰𬴦",
 "乑": "聚衆𠹩𡘎𣽍𤲄𥼟𧑄𧕠𨖼𨴖𩂢",
 "𠀁": "亐𠒠𤓳𥩭𦈤𩣁𩿭𪫝𪬀𬀦",
 "𠆢": "㐱㒪㓿㞤㠳㮆㲊㲦㴝䄹䕥䞊䥧䮧䯎䲝𠆂𠆂𠆝𠆤𠆪𠆭𠆳𠆹𠇃𠇋𠇎𠇏𠇚𠇜𠇨𠇨𠇬𠇮𠇯𠇰𠈑𠈒𠈔𠈘𠈛𠈮𠈾𠉚𠊆𠊌𠊍𠊯𠊺𠋁𠋅𠋔𠌂𠌉𠌌𠌑𠍳𠍳𠎃𠎶𠐂𠑂𠑮𠑳𠒡𠔲𠘄𠙠𠜋𠝠𠞘𠠓𠤒𠦵𠧑𠨤𠫥𠫯𠬓𠮈𠮉𠮏𠲇𠴠𠺞𡂊𡇡𡌜𡏕𡑶𡓓𡖗𡛐𡣿𡥏𡥐𡨙𡫗𡫜𡬴𡴏𡴑𡴖𡴜𡴧𡶍𡷁𡷉𡹒𡺊𡻆𡼘𢀇𢁃𢁰𢄕𢊎𢊞𢋫𢌯𢍦𢍦𢎦𢏀𢏏𢒃𢒢𢢮𢦳𢧢𢪅𢫐𢭧𢮡𢮦𢵂𢺊𢾓𣁁𣁒𣇸𣉙𣋦𣋦𣗜𣛉𣜈𣠬𣠬𣡰𣣽𣤗𣳁𣶟𣷖𣷦𣻊𣿀𣿰𤀹𤁶𤂃𤂓𤃒𤃬𤆅𤆢𤐮𤐻𤡶𤩷𤪓𤪻𤪽𤫆𤫹𤰒𤱝𤱭𤲛𤲞𤳋𤵞𤶊𤸌𤺠𥂝𥃦𥇥𥈃𥉡𥊊𥍅𥐤𥔚𥙄𥜫𥜺𥜼𥝺𥠌𥣃𥣠𥮈𥰖𥱟𥵋𥵌𥶗𥷄𥷯𥺋𥽧𥿐𨋼𨌕𨌝𨌺𨍓𨏤𨔱𨕦𨗌𨚐𨤾𨥀𨥞𨦓𨨿𨫂𨯖𨯡𨲼𨶟𨷬𨹈𨹉𨹊𨹩𨺴𨼲𨽰𨽰𨽰𨽱𨽱𩁲𩂙𩃪𩅙𩆈𩇿𩋱𩍲𩐰𩕵𩙶𩚃𩚝𩛅𩜯𩝃𩝯𩞳𩥵𩧗𩮃𩯵𩸈𩹼𩺒𪈍𪈕𪉢𪎫𪗖𪗣𪻖𫇲𫒑𫝹𫟈𫟓𫢉𫢚𫢿𫣍𫧗𫬯𫺧𫻰𬑌𬓭𬕈𬚔𬚵𬜀𬜩𬝑𬝓𬡀",
 "占": "乩佔卤呫奌岾帖店怗战扂拈敁枮梷毡沾炶点煔玷痁砧秥站笘粘胋苫蒧蛅袩覘觇詀貼贴趈跕迠酟鉆钻阽頕颭飐鮎鲇黇黏點㓠㚲㣌㤐㸃䀡䍄䦓䩇䩞䪓䬯䴴䵿𠕟𠚝𠛤𡌐𡖞𡖡𡱇𢒦𢓕𢧗𢮸𣖴𣗴𣢤𣿤𣿤𤋒𤑰𤘇𤝓𤿝𥇞𥎁𥭔𥿕𦒻𦒾𦕒𦷙𧮪𧲸𨱬𩄷𩌓𩬑𩲦𩳨𪀄𪉜𪎋𪕐𪖚𪗦𪞲𪟂𪯴𫀅𫚳𫥄𫥸𫧴𫼜𬜅𬩷𬰳𬱗𬲫𬸵",
 "卝": "哶羋㐀𠁬𠆆𠇎𡖂𡠒𡠘𡣌𡿤𢅓𢇅𢱁𢵇𢾠𢾴𢿩𣀄𣙘𣤬𣴱𤁊𤊾𤏹𤗩𤛫𤞢𤨛𤫧𤰈𥄕𥊄𥋚𥐫𥢞𥧳𥪺𥼓𦆇𦆶𦍚𦍟𦎧𧀅𧔠𧨅𧭖𧭫𧾆𨈉𨕸𨘚𨥑𨳡𨶚𩕸𩛬𩝨𩢩𪓔𫉐備㭉莭𦼬𬞞𬞭𬞳𬞴𬞵𬞶𬞸𬞸𬞻𬞼𬞽𬞾𬵼",
 "亠": "亢交亥产亨亩享京亭亮亯亱亳亴亵亹充兗卒变商啇夜夣娈孪峕峦市弃弯恋恴懐挛旁栾椉毫畗稁竒育脔薧蛮豪銮高鵉鸾㐔㐫㐬㐭㐯㬌㳿䥆䯧𠅃𠅄𠅅𠅈𠅉𠅊𠅋𠅌𠅏𠅑𠅓𠅔𠅖𠅘𠅙𠅚𠅜𠅝𠅞𠅟𠅠𠅡𠅢𠅤𠅦𠅧𠅨𠅪𠅫𠅬𠅭𠅰𠅲𠅴𠅷𠅸𠅺𠅿𠆀𠆂𠆅𠆆𠆇𠆉𠆊𠆋𠆍𠆎𠆏𠆐𠆒𠆖𠆘𠆚𠆛𠆝𠆟𠆠𠆡𠆼𠉪𠎂𠎗𠐜𠑻𠑽𠒋𠔚𠕑𠗛𠘘𠙰𠜇𠟇𠟼𠡌𠢻𠣐𠣸𠤇𠮸𠱗𠲗𠴬𠴽𠸈𡁗𡅁𡅓𡍕𡎲𡐁𡐽𡓩𡕌𡕨𡘐𡙑𡜑𡜿𡡫𡢧𡣼𡦦𡦬𡧵𡫪𡮢𡰔𡰗𡰜𡱀𡷮𡸝𡹕𡻫𡿮𢂋𢂚𢄕𢆏𢌓𢌮𢍓𢏸𢒲𢕒𢕛𢛐𢛫𢜖𢜚𢢦𢤴𢤴𢧂𢪴𢫾𢬵𢮕𢮯𢰜𢱊𢽒𢽫𢽮𢽯𢽺𣁼𣅀𣅂𣅹𣋿𣎘𣕏𣕛𣖇𣖈𣚏𣝂𣟐𣡥𣢿𣣩𣤽𣫛𣫭𣱵𣳌𣳍𣶑𣶢𣹾𣺓𣼅𣼆𣼠𣽘𣽱𣾌𣿱𤀮𤁁𤁜𤅭𤆴𤈅𤉬𤊆𤋋𤍍𤒆𤓥𤕚𤗊𤗒𤙫𤙺𤚊𤚒𤚮𤪓𤬥𤰑𤰸𤱔𤲾𤶓𥀏𥀪𥂡𥂶𥃀𥃂𥃐𥃰𥅷𥇱𥈘𥎥𥏉𥓯𥜘𥞞𥟋𥟵𥠤𥩚𥪈𥮧𥯲𥵭𥶺𥹻𥾼𦁙𦂊𦄣𦆌𦇨𦊸𦏝𦐮𦚍𦜶𦟨𦧨𦯇𦯺𦯾𦱘𦻫𧀎𧆅𧋲𧍐𧐛𧒱𧓚𧖁𧙬𧙴𧚕𧚱𧜏𧜰𧞚𧥛𧥜𧦣𧧣𧩽𧫀𧭫𧴨𧵾𨅩𨌤𨍡𨎙𨎡𨎱𨏛𨏯𨏸𨐋𨘛𨘰𨘿𨚃𨜎𨝣𨠪𨡤𨣑𨤫𨦤𨧲𨪟𨪡𨪴𨫚𨬇𨬘𨬧𨭅𨮲𨼙𩁛𩇰𩋑𩏉𩏎𩓗𩡑𩡥𩤑𩥔𩥤𩦆𩦪𩧝𩫃𩶞𩹗𩺽𪆾𪈣𪒌𪙯𪜠𪜢𪜣𪜤𪝂𪢃𪤯𪨂𪫉𪭛𪱭𪲌𫃪𫋔𫌹𫒣𠘺刻惇育裗𫡞𫡺𫢁𫯌𫲯𫵜𫻘𫻡𬃎𬈟𬋜𬍀𬎊𬙸𬞹𬡇𬡏𬡑𬡗𬡚𬡝𬡡𬡫𬡭𬴘𬹱",
 "⺊": "偼卓占卢卣卥卨媫敹桌欳睿肻貞贞鼑㔽㕟㕡㕢㨗㲃㲊䈛䜭䥧䪥𠉝𠍝𠖣𠜐𠜷𠝅𠣠𠣱𠥞𠧒𠧖𠧘𠧚𠧜𠧝𠧡𠧣𠧧𠧪𠧫𠧯𠧰𠧱𠧵𠧶𠧸𠧹𠧺𠧻𠧼𠧽𠧾𠧿𠨀𠨁𠨂𠨂𠨅𠨆𠨇𠨈𠨌𠭉𠭗𠮉𠮏𠰷𠸝𠹘𡋪𡌓𡍏𡎱𡐍𡑧𡙏𡜕𡥋𡥣𡷚𢂦𢆌𢇒𢏍𢒪𢒭𢧛𢧝𢨟𢫘𢵂𢵂𢻛𢼾𢽋𢽭𢿓𢿝𢿡𢿮𣂢𣂸𣃷𣍽𣑅𣔃𣕹𣙏𣟷𣤧𣦵𣦻𣨦𣫋𣲁𣲊𣴸𣵔𣵕𣶓𣶿𣷑𣷶𣻋𣽊𣿰𣿼𤀹𤂓𤆛𤈭𤈱𤋛𤖄𤖊𤣧𤥩𤩅𤩡𤪻𤳠𤵶𥅶𥇨𥈠𥈤𥌄𥜽𥟃𥟫𥨷𥩓𥭩𥲖𥷠𥹄𥹐𥹟𦅸𦈀𦈾𦓪𦕡𦕢𦘸𦙎𦬈𦬿𦵉𦷕𦻞𦻴𦼣𧃭𧄋𧇩𧑺𧡑𧢕𧪌𧮲𧮸𧯖𧷎𧷧𧸩𨑶𨓗𨓘𨔁𨔖𨖏𨗋𨘵𨛖𨜃𨤐𨥵𨦸𨩼𨪬𨫶𨬴𨭲𩉟𩐃𩔒𩗟𩚃𩚋𩠥𩵿𩺋𩾤𪟽𪡦𪮄𫁝蜨𫧯𫭬𫿂𬃄𬃺",
 "囗": "占卥囚囜囝回因囡团団囤囥囦囨囩囫园囮囯困囲図围囵囶囷囸囹固囻囼国图囿圀圁圂圃圄圅圆圇圈圉圊國圌圍圎圏圐圑園圓圔圕圖圗團圙圚圛圜圝圞笝鬛㘝㘞㘟㘠㘡㘢㘣㘤㘥㢴㴅䇱𠀮𠄰𠅓𠅺𠇂𠇅𠍚𠎡𠔋𠖜𠖣𠖦𠟑𠠌𠣱𠤽𠧧𠧪𠧱𠧸𠧾𠨅𠩌𠩛𠷝𠻙𠼜𡆠𡆢𡆣𡆤𡆥𡆦𡆧𡆩𡆫𡆬𡆮𡆯𡆱𡆳𡆴𡆶𡆸𡆹𡆺𡆻𡆼𡆽𡆾𡆿𡇀𡇁𡇂𡇃𡇄𡇅𡇆𡇇𡇈𡇉𡇊𡇋𡇌𡇍𡇎𡇏𡇐𡇑𡇓𡇔𡇕𡇖𡇗𡇘𡇙𡇚𡇜𡇝𡇞𡇟𡇠𡇡𡇢𡇣𡇥𡇦𡇧𡇨𡇩𡇪𡇫𡇬𡇭𡇮𡇯𡇰𡇱𡇲𡇳𡇴𡇵𡇶𡇷𡇸𡇹𡇺𡇻𡇼𡇽𡇾𡇿𡈀𡈁𡈂𡈃𡈄𡈆𡈇𡈈𡈉𡈊𡈌𡈎𡈏𡈐𡈑𡈒𡈓𡈔𡈕𡈖𡈘𡈙𡈚𡈛𡈜𡈝𡈞𡈟𡈠𡈡𡈢𡈣𡈦𡈧𡈨𡈩𡈪𡈫𡈬𡈭𡈰𡈱𡈳𡈴𡈵𡈷𡈸𡈻𡋏𡍏𡍐𡍗𡍯𡎱𡐑𡐲𡒏𡔌𡔫𡔶𡕈𡕭𡙏𡜰𡟏𡢆𡣊𡣔𡭆𡲖𡸋𡹎𡹏𡻽𡻾𡽔𢀈𢀉𢄜𢍩𢏩𢐑𢐽𢑯𢑷𢑺𢕠𢨟𢬻𢰋𢰕𢻛𣃳𣅍𣍽𣑝𣑟𣒪𣔸𣖈𣞈𣞖𣡏𣡦𣦗𣱒𣱜𣲶𣲷𣴵𣴺𣶓𣶡𣶦𣷶𣹍𣺀𣽔𤅯𤋳𤏯𤔗𤦱𤭋𤭳𥁴𥂟𥂶𥃀𥃂𥃈𥃐𥇈𥔆𥔥𥕇𥛿𥝁𥝄𥝅𥟫𥠤𥡰𥦬𥮦𥱅𥲢𥶢𥷠𥹉𦀄𦀶𦂮𦂷𦈄𦊔𦊧𦊻𦋶𦌃𦌆𦏍𦏚𦛢𦞞𦭁𦭉𦭤𦮗𦯯𦱵𦳊𦳬𦴄𦴗𦴛𦴠𦵇𦷕𦸖𦸠𦹌𦼤𧀇𧆘𧉫𧊫𧋡𧏈𧒞𧔐𧔱𧕧𧟮𧡻𧹇𨉽𨔁𨕚𨞉𨶾𩄙𩆒𩆘𩔞𩙊𩟍𩡥𩡦𩬼𪊼𪗐𪚴𪢨𪢩𪢪𪢫𪢬𪢭𪢮𪢯𫁯𫈽圖𫠾𫩏𫭂𫭃𫭄𫭅𫭆𫭇𫭈𫭉𫭊𫭋𫭌𫭍𫭎𫭏𫭑𫭒𫭓𫸭𬉛",
 "玨": "琴琵琶琹瑟錱𠫁𢐭𢜈𣌇𣠦𤦖𤦗𤦠𤧂𤧆𤧰𤧲𤨝𤩘𤩙𤩟𦹙𧂖𨖢𨨖𪯥𪻴𪼈𪼉𫗆𫳽",
 "尸": "凥卢孱尻尼尾尿屁层屃屄居屆屇屈屉届屋屌屍屎屏屐屑屒屓屖屙屚屜屝属屟屠屡屢屣層履屦屧屨屩屪屫屭杘羼鳲鸤㕧㞋㞌㞍㞎㞏㞐㞒㞓㞔㞕㞖㞗㞘㞚㞛㞜㞝㞞㞟㞡㷉䬤䲩𠈽𠌸𠑾𠒁𠔅𠜧𠜰𠝋𠝑𠧕𠭠𠭼𠰎𠰷𠰾𠲙𠶩𠼇𠽣𡌞𡌷𡍾𡑥𡒈𡒛𡓹𡔘𡔘𡔘𡔜𡖀𡜢𡜢𡝼𡠟𡥷𡥷𡦯𡭒𡰤𡰥𡰦𡰨𡰪𡰫𡰬𡰮𡰯𡰰𡰱𡰲𡰲𡰳𡰵𡰶𡰷𡰸𡰹𡰺𡰼𡰽𡰾𡰿𡱀𡱁𡱂𡱃𡱄𡱅𡱆𡱇𡱈𡱊𡱋𡱌𡱍𡱎𡱏𡱐𡱑𡱒𡱓𡱔𡱖𡱗𡱘𡱙𡱚𡱛𡱜𡱝𡱞𡱟𡱠𡱡𡱢𡱣𡱤𡱦𡱧𡱨𡱪𡱫𡱭𡱯𡱰𡱱𡱲𡱳𡱴𡱶𡱷𡱹𡱺𡱻𡱼𡱽𡱾𡱿𡲀𡲁𡲂𡲃𡲄𡲅𡲆𡲇𡲌𡲍𡲎𡲏𡲐𡲑𡲒𡲓𡲔𡲕𡲖𡲗𡲘𡲙𡲚𡲛𡲜𡲝𡲞𡲟𡲡𡲣𡲦𡲩𡲬𡲮𡲯𡲰𡲱𡲲𡲳𡲴𡲵𡲶𡲷𡲹𡲻𡲽𡲾𡲿𡳂𡳄𡳅𡳆𡳈𡳉𡳋𡳌𡳍𡳏𡳐𡳑𡳗𡳙𡳚𡳞𡳠𡳡𡳣𡳤𡳥𡳦𡳨𡳫𡳬𡳮𡳯𡳴𡳷𡳸𡳻𡳻𡳻𡳼𡽈𢇀𢔦𢘎𢘧𢚪𢛥𢟬𢠬𢩗𢫘𢲈𢳲𢶵𣆓𣐓𣒺𣕋𣗗𣜺𣠯𣢁𣢂𣪉𣪍𣪫𣰝𣲻𣴅𣴫𣴻𣶅𣷍𣺘𣺳𣼇𣼣𣾮𣿲𤁍𤁍𤂎𤂏𤂞𤆾𤈫𤓅𤔰𤔿𤚌𤝺𤧤𤰨𥄿𥅣𥇗𥇤𥇵𥑊𥕟𥗷𥚍𥞓𥞭𥠧𥡖𥢘𥣡𥧨𥪒𥬖𥳨𥺶𦄪𦅉𦎾𦕔𦙹𦩯𦭀𦯴𦱲𦲳𧏌𧑏𧒝𧖉𧖏𧜭𧞘𧥤𧧫𧨇𧫮𧬲𧱢𧹧𧻡𧼜𧿃𧿸𨅛𨋚𨍺𨍻𨍿𨎡𨏝𨏵𨐫𨒈𨓠𨕄𨖔𨙈𨠡𨹣𨾈𨾋𩀲𩂵𩈑𩍞𩍳𩖾𩗑𩘂𩛐𩛻𩜧𩪔𩰨𪂗𪌨𪑍𪣓𪨉𪨊𪨋𪨌𪨍𪨏𪨒𪨓𪨔𪨗𪨘𪨡𪩀𪬑𪯁𫝲屠犀𫢠𫪠𫭺𫮵𫰮𫵓𫵔𫵕𫵖𫵘𫵙𫵚𫵜𫵝𫵠𫵤𫵩𫵪𫵬𬇳",
 "叉": "扠杈汊紁肞芆蚤衩訍釵钗靫㣾㳗䀑䁊䂘䑡䟕𡰫𤜫𥘓𥫢𦔹𨙳𪝃𫘅𫩗",
 "⺡": "柒氻氾氿汀汁汃汄汅汇汈汉汊汋汌汍汎汏汐汑汒汓汔汕汗汘汙汚汛汜汝江池污汢汣汥汦汧汨汩汪汫汭汮汯汰汱汲汳汴汵汶汷汸汹決汻汼汽汾汿沁沂沃沄沅沆沇沈沉沋沌沍沎沏沐沑沔沕沖沘沙沚沛沜沞沟沠没沢沣沤沥沦沧沨沩沪沫沬沭沮沰沱沲河沴沶沷沸油沺治沼沽沾沿泀況泂泃泄泅泆泇泈泊泋泌泍泎泏泐泑泒泓泔法泖泗泘泙泚泛泜泝泞泟泠泡波泣泤泥泦泧注泩泪泫泬泭泮泯泱泲泳泷泸泹泺泻泼泽泾泿洀洁洂洃洄洅洆洇洈洉洊洋洌洍洎洏洐洑洒洓洔洕洖洗洘洙洛洝洞洟洠洡洢洣洤津洦洧洨洩洪洫洬洭洮洰洱洲洳洴洵洶洷洸洹洺活洼洽派洿浀流浂浃浄浅浇浈浊测浌浍济浐浑浒浓浔浕浖浗浘浙浚浛浜浝浞浟浠浡浢浣浤浥浦浧浨浩浪浫浬浭浮浯浰浱浲浳浴浵浶海浹浺浻浼浽浾浿涀涁涂涃涄涅涆涇消涉涊涋涌涍涎涏涐涑涒涓涔涕涖涗涘涚涛涜涝涞涟涠涡涢涣涤涥润涧涨涩涪涫涬涭涮涯涰涱液涳涴涵涶涷涸涹涺涻涼涽涾涿淀淁淃淄淅淆淇淈淉淊淋淌淍淎淏淐淑淒淓淔淕淖淗淘淙淚淛淜淝淞淟淠淡淢淣淤淥淦淧淩淪淬淭淮淯淰淲淳淴淵淶混淹淺添淽淿渀渁渂渃渄清渆渇済渉渊渋渌渍渎渏渐渑渒渓渔渕渖渗渘渙渚減渜渝渞渟渡渢渣渤渥渦渧渨温渪渫測渭渮港渰渱渲渳渴渵渶渷游渹渺渻渼渽渾渿湀湁湂湃湄湅湆湇湈湉湊湋湌湍湎湏湐湑湒湓湔湕湖湗湘湙湚湛湜湝湞湟湠湡湢湣湤湥湦湧湨湩湪湫湭湮湯湱湲湳湴湵湶湷湸湹湺湻湽湾湿満溁溂溃溄溅溇溈溉溊溋溌溍溎溏源溒溓溔溕溗溘溙溚溛溜溝溞溟溠溡溢溣溤溥溦溧溨溩溪溫溬溭溮溯溰溱溲溳溴溵溶溷溸溹溺溻溼溽溾溿滀滁滂滃滄滅滆滇滈滉滊滋滌滍滏滐滑滒滓滔滖滗滘滙滚滛滜滝滞滟滠满滢滣滤滥滦滧滨滩滪滫滬滭滮滯滰滱滲滳滴滵滶滷滸滹滺滻滼滽滾滿漁漂漃漄漅漆漇漈漉漊漋漌漍漎漑漒漓演漕漖漗漘漙漚漛漜漝漞漟漠漣漤漥漧漨漩漪漫漬漭漮漯漰漱漲漳漴漵漶漷漸漹漺漻漼漽漾潀潂潃潄潅潆潇潈潉潊潋潌潍潎潏潐潑潒潓潔潕潖潗潘潙潚潛潜潝潞潟潠潡潢潣潤潥潧潨潩潪潫潬潭潮潯潰潱潲潳潴潵潶潷潸潹潺潻潼潽潾潿澀澁澂澄澅澆澇澈澉澊澋澌澍澎澏澐澑澒澓澔澕澖澗澘澙澚澛澜澝澞澟澠澡澢澣澤澥澦澧澨澪澫澬澭澮澯澰澱澲澳澴澵澶澷澸澹澺澻澼澽澾澿激濁濂濃濄濅濆濇濈濉濊濋濎濏濐濑濒濓濔濖濗濘濙濚濛濜濝濞濟濠濡濢濣濤濥濧濨濩濪濫濬濭濮濯濰濱濳濴濵濶濸濹濺濻濼濽濾濿瀀瀁瀂瀃瀄瀅瀆瀇瀈瀉瀊瀋瀌瀍瀎瀏瀐瀑瀒瀓瀔瀕瀖瀗瀘瀙瀚瀛瀜瀝瀞瀟瀠瀡瀢瀣瀤瀥瀦瀧瀨瀩瀫瀭瀮瀯瀰瀱瀲瀳瀴瀵瀶瀷瀸瀹瀺瀻瀼瀽瀾瀿灀灁灂灃灄灅灆灇灈灉灊灋灌灍灐灑灒灕灖灗灘灙灚灛灜灝灞灟灠灡灢灣灤灦灧灨灩灪衍酒㙙㲸㲹㲺㲼㲽㲿㳀㳁㳂㳃㳄㳅㳆㳇㳈㳉㳊㳋㳌㳍㳎㳏㳐㳑㳒㳓㳔㳕㳖㳗㳘㳙㳚㳛㳜㳝㳞㳠㳡㳢㳣㳥㳦㳧㳨㳪㳭㳮㳯㳰㳱㳲㳲㳳㳴㳵㳶㳷㳸㳹㳺㳻㳽㳾㳿㴀㴁㴃㴄㴆㴈㴉㴊㴋㴌㴍㴎㴏㴐㴑㴒㴓㴔㴕㴖㴗㴘㴙㴚㴛㴜㴞㴟㴠㴡㴢㴢㴣㴣㴤㴥㴦㴧㴨㴩㴪㴫㴬㴭㴮㴯㴰㴱㴲㴳㴴㴵㴶㴷㴸㴹㴺㴺㴻㴼㴽㴿㵀㵁㵂㵃㵄㵅㵇㵈㵉㵊㵋㵌㵍㵎㵏㵐㵑㵒㵓㵔㵕㵖㵙㵚㵛㵜㵜㵝㵞㵟㵠㵡㵢㵣㵤㵥㵦㵧㵩㵪㵫㵬㵭㵮㵯㵰㵲㵳㵴㵵㵶㵷㵸㵺㵻㵼㵽㵾㵿㶀㶁㶂㶂㶃㶃㶄㶅㶆㶇㶈㶉㶊㶋㶌㶍㶎㶏㶐㶑㶒㶓㶔㶕㶖㶘㶙㶚㶛㶜㶝㶞㶟㶠䨙䨰𠸡𡩻𡫏𡱤𡻶𡾁𢚑𢯝𣒕𣱴𣱶𣱼𣱽𣱾𣱿𣲀𣲁𣲄𣲅𣲆𣲇𣲋𣲌𣲏𣲐𣲑𣲒𣲔𣲕𣲗𣲘𣲙𣲚𣲞𣲟𣲠𣲡𣲢𣲣𣲤𣲥𣲩𣲫𣲬𣲭𣲲𣲳𣲵𣲶𣲷𣲸𣲹𣲺𣲻𣲼𣲽𣲾𣳀𣳁𣳃𣳄𣳅𣳇𣳈𣳊𣳋𣳌𣳍𣳎𣳏𣳐𣳑𣳒𣳓𣳔𣳘𣳙𣳚𣳛𣳜𣳝𣳞𣳟𣳠𣳡𣳤𣳥𣳦𣳧𣳨𣳪𣳬𣳮𣳯𣳰𣳲𣳵𣳶𣳷𣳸𣳹𣳺𣳼𣳽𣴁𣴂𣴃𣴄𣴅𣴆𣴇𣴈𣴉𣴊𣴋𣴌𣴍𣴑𣴒𣴓𣴔𣴕𣴖𣴗𣴘𣴙𣴚𣴛𣴜𣴞𣴠𣴡𣴢𣴣𣴤𣴥𣴦𣴧𣴨𣴩𣴪𣴫𣴬𣴭𣴮𣴯𣴰𣴱𣴵𣴶𣴷𣴸𣴹𣴺𣴻𣴼𣴽𣴾𣴿𣵀𣵁𣵃𣵆𣵇𣵈𣵉𣵊𣵋𣵌𣵍𣵎𣵏𣵐𣵑𣵒𣵓𣵔𣵕𣵖𣵗𣵘𣵙𣵚𣵛𣵜𣵝𣵞𣵟𣵠𣵡𣵢𣵣𣵤𣵦𣵧𣵨𣵩𣵪𣵫𣵬𣵭𣵮𣵰𣵱𣵲𣵴𣵵𣵶𣵷𣵸𣵺𣵻𣵼𣵽𣵾𣵿𣶀𣶂𣶃𣶄𣶅𣶆𣶈𣶉𣶊𣶋𣶍𣶎𣶏𣶐𣶑𣶓𣶕𣶖𣶗𣶘𣶛𣶜𣶝𣶞𣶟𣶠𣶡𣶢𣶣𣶤𣶥𣶦𣶧𣶨𣶩𣶪𣶫𣶬𣶭𣶮𣶯𣶰𣶱𣶲𣶳𣶴𣶵𣶶𣶸𣶹𣶺𣶻𣶼𣶽𣶿𣷁𣷃𣷄𣷅𣷆𣷇𣷉𣷊𣷋𣷍𣷎𣷐𣷑𣷒𣷓𣷕𣷝𣷞𣷠𣷡𣷢𣷣𣷤𣷥𣷦𣷧𣷨𣷩𣷪𣷫𣷬𣷭𣷮𣷯𣷰𣷱𣷲𣷳𣷴𣷶𣷷𣷸𣷹𣷺𣷻𣷼𣷽𣷾𣸀𣸁𣸂𣸅𣸇𣸉𣸊𣸋𣸌𣸎𣸏𣸑𣸒𣸓𣸔𣸖𣸘𣸙𣸚𣸛𣸜𣸝𣸟𣸠𣸡𣸢𣸣𣸤𣸥𣸦𣸧𣸨𣸩𣸪𣸫𣸬𣸭𣸮𣸯𣸰𣸱𣸲𣸳𣸴𣸵𣸶𣸷𣸸𣸹𣸼𣸽𣸾𣸿𣹀𣹂𣹃𣹄𣹆𣹈𣹉𣹋𣹌𣹍𣹎𣹏𣹐𣹒𣹓𣹔𣹕𣹖𣹗𣹘𣹙𣹚𣹜𣹝𣹞𣹟𣹠𣹡𣹢𣹣𣹤𣹥𣹦𣹧𣹨𣹩𣹪𣹫𣹮𣹯𣹰𣹱𣹲𣹴𣹵𣹶𣹷𣹸𣹺𣹽𣹾𣹿𣺀𣺁𣺂𣺃𣺄𣺅𣺆𣺇𣺈𣺉𣺊𣺋𣺌𣺍𣺏𣺐𣺑𣺒𣺓𣺔𣺕𣺖𣺗𣺘𣺙𣺚𣺛𣺝𣺟𣺠𣺡𣺢𣺣𣺤𣺥𣺧𣺨𣺫𣺬𣺭𣺮𣺯𣺰𣺱𣺲𣺳𣺴𣺷𣺹𣺺𣺻𣺼𣺽𣺾𣺿𣻁𣻂𣻃𣻄𣻆𣻇𣻈𣻉𣻋𣻌𣻍𣻎𣻏𣻐𣻑𣻒𣻓𣻔𣻖𣻗𣻘𣻚𣻛𣻜𣻞𣻟𣻠𣻢𣻥𣻦𣻧𣻨𣻩𣻪𣻫𣻬𣻭𣻰𣻱𣻲𣻳𣻴𣻵𣻶𣻷𣻸𣻹𣻺𣻼𣻽𣼀𣼂𣼃𣼄𣼅𣼆𣼇𣼈𣼉𣼊𣼋𣼌𣼍𣼎𣼏𣼐𣼑𣼒𣼓𣼔𣼕𣼗𣼚𣼛𣼜𣼝𣼞𣼟𣼠𣼡𣼢𣼣𣼤𣼥𣼦𣼧𣼨𣼫𣼬𣼭𣼮𣼯𣼰𣼱𣼲𣼳𣼴𣼵𣼶𣼷𣼸𣼹𣼻𣼼𣼽𣼾𣽀𣽁𣽂𣽃𣽅𣽆𣽇𣽈𣽉𣽊𣽋𣽌𣽍𣽎𣽏𣽐𣽑𣽒𣽓𣽔𣽕𣽖𣽗𣽘𣽙𣽚𣽛𣽜𣽞𣽟𣽡𣽢𣽣𣽤𣽥𣽦𣽧𣽪𣽬𣽭𣽮𣽯𣽰𣽱𣽲𣽳𣽴𣽵𣽶𣽷𣽸𣽹𣽺𣽻𣽼𣽽𣽾𣾀𣾁𣾂𣾄𣾅𣾆𣾇𣾈𣾉𣾊𣾋𣾌𣾍𣾎𣾏𣾐𣾑𣾒𣾓𣾔𣾕𣾖𣾗𣾘𣾙𣾚𣾜𣾝𣾞𣾠𣾡𣾣𣾤𣾥𣾦𣾧𣾨𣾩𣾪𣾫𣾬𣾭𣾮𣾯𣾰𣾱𣾲𣾳𣾴𣾶𣾷𣾸𣾺𣾻𣾼𣾽𣾾𣾿𣿁𣿂𣿃𣿄𣿅𣿆𣿇𣿈𣿉𣿋𣿌𣿍𣿎𣿏𣿐𣿑𣿔𣿕𣿖𣿗𣿘𣿚𣿛𣿜𣿞𣿟𣿠𣿡𣿢𣿣𣿤𣿥𣿦𣿧𣿨𣿩𣿪𣿫𣿬𣿭𣿯𣿰𣿱𣿲𣿳𣿴𣿵𣿶𣿷𣿸𣿹𣿻𣿼𣿽𣿾𣿿𤀀𤀂𤀃𤀄𤀅𤀆𤀇𤀈𤀉𤀋𤀍𤀎𤀏𤀐𤀑𤀒𤀓𤀔𤀕𤀖𤀗𤀘𤀙𤀚𤀛𤀜𤀝𤀞𤀟𤀠𤀡𤀣𤀤𤀥𤀦𤀧𤀨𤀪𤀫𤀬𤀭𤀮𤀯𤀰𤀱𤀳𤀴𤀵𤀸𤀹𤀺𤀻𤀼𤀽𤀾𤀿𤁀𤁁𤁂𤁄𤁅𤁆𤁈𤁉𤁊𤁋𤁌𤁍𤁎𤁏𤁐𤁑𤁒𤁓𤁔𤁖𤁘𤁚𤁛𤁜𤁝𤁟𤁠𤁡𤁢𤁣𤁤𤁥𤁧𤁨𤁩𤁫𤁭𤁮𤁱𤁲𤁳𤁴𤁵𤁶𤁷𤁸𤁹𤁺𤁼𤁽𤁿𤂁𤂂𤂅𤂆𤂇𤂈𤂉𤂊𤂋𤂌𤂎𤂏𤂐𤂑𤂒𤂓𤂔𤂕𤂖𤂗𤂙𤂚𤂛𤂜𤂝𤂡𤂢𤂣𤂤𤂦𤂧𤂨𤂩𤂪𤂫𤂬𤂭𤂮𤂯𤂰𤂱𤂲𤂳𤂴𤂵𤂶𤂷𤂸𤂻𤂽𤂾𤂿𤃀𤃁𤃃𤃅𤃆𤃇𤃉𤃊𤃋𤃌𤃍𤃎𤃏𤃐𤃑𤃒𤃓𤃔𤃕𤃖𤃗𤃘𤃙𤃚𤃛𤃜𤃝𤃞𤃟𤃠𤃡𤃢𤃣𤃤𤃥𤃦𤃧𤃨𤃩𤃪𤃫𤃬𤃭𤃮𤃰𤃱𤃲𤃳𤃵𤃶𤃷𤃹𤃺𤃼𤃽𤃾𤃿𤄀𤄁𤄂𤄃𤄅𤄆𤄇𤄉𤄊𤄋𤄎𤄏𤄐𤄑𤄒𤄓𤄔𤄖𤄗𤄘𤄙𤄚𤄛𤄜𤄞𤄟𤄠𤄡𤄢𤄦𤄨𤄩𤄪𤄫𤄬𤄭𤄮𤄰𤄱𤄲𤄴𤄵𤄶𤄷𤄸𤄹𤄺𤄻𤄼𤄽𤄾𤅁𤅃𤅄𤅅𤅇𤅈𤅉𤅊𤅌𤅍𤅏𤅐𤅑𤅒𤅓𤅔𤅕𤅖𤅗𤅘𤅙𤅚𤅛𤅜𤅝𤅟𤅠𤅡𤅢𤅣𤅤𤅥𤅦𤅧𤅨𤅪𤅫𤅬𤅭𤅮𤅯𤅰𤅱𤅲𤅵𤅶𤅷𤅸𤅹𤅺𤅻𤅼𤅽𤅾𤆀𤏁𤒵𤤾𤦷𥁩𥂵𥖍𥧲𥮓𥱼𥶅𥶎𥷰𥸘𥹭𦌧𦭑𦮛𦮟𦯫𦯹𦯻𦱈𦲍𦳸𦴝𦴵𦴷𦵙𦶒𦶡𦶵𦶶𦸪𦸼𦺁𦺇𦻂𦻄𦻭𧀉𧁄𧁛𧂧𧃉𧃡𧃾𧄢𧄩𧅐𨷉𩅹",
 "子": "享仔吇囝好孔孕孖孖字孙孚孜孝孞孟孠孡孢季孤孥孧孨孩孪孫孭孮孯孲孳孶孷孹孺孻孼孽孾孿屘斈斿杍李汓狲矷秄箰籽耔芓虸覎觃釨㜽㜾㜿㝀㝁㝂㝃㝅㝆㞌㞨㫗㺭䢊䦻䰵𠅝𠊫𠏫𠨯𠩞𠯂𠶄𡉗𡏸𡕕𡞦𡤽𡤿𡥀𡥁𡥂𡥃𡥄𡥅𡥆𡥇𡥈𡥉𡥊𡥋𡥌𡥍𡥎𡥏𡥐𡥑𡥒𡥓𡥔𡥕𡥖𡥗𡥘𡥙𡥚𡥛𡥜𡥝𡥟𡥠𡥡𡥢𡥣𡥤𡥥𡥦𡥦𡥦𡥧𡥩𡥪𡥫𡥬𡥮𡥯𡥰𡥱𡥲𡥳𡥴𡥵𡥶𡥷𡥷𡥺𡥻𡥼𡥽𡥾𡥿𡦅𡦇𡦉𡦊𡦊𡦋𡦌𡦍𡦎𡦏𡦏𡦏𡦐𡦑𡦓𡦕𡦖𡦘𡦜𡦞𡦠𡦣𡦤𡦦𡦩𡦪𡦪𡦫𡦬𡦮𡦯𡦰𡦴𡦷𡦷𡱟𡱬𡵇𡾤𢙏𢝼𢟥𢰏𢻯𢼪𢽌𢽑𢾢𣏍𣖆𣫮𣬥𣸯𣹏𣹏𣹏𣾧𤃑𤌨𤘅𤜭𤴳𤶂𤶿𤸦𤸦𤸦𥕪𥖒𥟆𥤪𥫞𦩧𦩧𦩧𦰊𦴎𦻚𦽆𧃯𧆰𧋫𧎍𧎤𧏄𧧿𧩽𧪂𧫂𧴯𧺙𧾅𨒓𨒰𨓎𨔼𨘋𨜸𨡆𨢀𨢱𨨃𨩘𨬷𨳕𨸀𩇊𩇫𩡒𩫃𩲇𩹆𩹆𩹆𪐣𪞐𪦶𪦷𪦸𪦹𪦺𪦻𪦼𪦽𪦾𪦿𪧀𪧁𪧂𪨔𪭋𪶖𪾎𫓦𫕃𫜠𫝗𫝯惇𫥱𫩇𫪑𫲡𫲢𫲣𫲤𫲥𫲦𫲧𫲨𫲩𫲪𫲫𫲭𫲮𫲯𫲱𫲲𫲴𫺀𫽊𬁣𬁪𬇻𬐫𬔸𬛧𬛪",
 "𠂋": "卮后巵𠃃𠃘𠈁𠨗𦓚𧏁𧧊",
 "巴": "吧夿妑岊岜巵巼帊弝把杷爬爸琶疤皅笆粑紦耙肥舥芭蚆豝跁鈀钯靶鲃㞎㸭㿬䯩䯲䰾䶕𠀧𠂬𠄧𠇕𠉲𠌊𠛋𠠾𠪧𠵺𡇃𡉷𡜆𡝕𡵟𢀼𢀿𢁇𢁊𢁋𢁍𢁑𢃳𢌏𢗌𢨴𢫷𢮤𢻷𢽼𣀟𣎞𣗡𣜺𣧜𣫰𣬶𣬷𣱈𣲩𣲯𣺣𤆵𤜱𤧲𤰷𥑁𥑽𥛁𥝧𥩙𥸿𥺸𦉔𦐆𦓙𦛐𦩐𦮹𦲛𧁉𧎱𧥔𧧘𧲧𧳗𧳾𧵅𨊹𨣬𨤖𨹣𩇯𩈆𩒒𩠀𩷁𪊚𪣀𪥉𪩡𪩬𪩭𪩮𪩱𪬎𪽡𫕠𫜨𫥴𫨓𫶵𫶷𫶸𫶻𫶼𬏓𬐒𬡊𬦺",
 "火": "伙倐叜吙夑夑灭灮灯灰灱灲灳灴灵灶灷灸灹灺灻灼災灾灿炂炃炄炅炆炇炈炉炊炋炌炍炎炎炏炏炐炑炒炓炔炕炖炗炘炚炛炜炝炞炟炠炡炢炣炤炥炦炧炨炩炪炫炬炮炯炱炲炳炴炵炶炷炸炻炽炾炿烀烁烂烃烄烅烆烇烊烌烍烎烐烑烒烓烔烕烖烗烘烙烚烛烜烞烟烠烡烢烣烤烥烦烧烨烩烪烫烬烮烯烰烱烲烳烴烵烶烷烸烺烻烼烽烿焀焁焂焃焅焆焇焈焊焋焌焍焐焑焒焓焕焖焗焙焚焛焜焝焞焟焠焢焤焥焧焨焩焪焫焬焮焯焰焱焲焳焴焵焷焸焹焺焻焼焽焾焿煀煁煂煃煄煅煆煇煈煉煊煋煌煍煏煐煑煒煓煖煗煘煙煚煛煜煝煟煠煡煣煤煥煨煩煪煫煬煯煰煱煲煳煴煵煶煷煸煹煺煻煼煽煾煿熀熁熂熃熄熅熆熇熉熋熌熍熎熐熑熓熔熕熖熗熘熚熛熜熝熞熠熡熢熣熤熥熦熧熨熩熪熫熭熮熰熲熳熴熵熶熷熸熺熻熼熽熾熿燀燁燂燃燆燇燈燉燋燌燍燏燐燑燒燓燔燖燗燘燙燛燜燝燠燡燣燤燥燦燧燨燩燫燬燭燮燮燯燰燱燲燳燴燵燶燸燹燺燻燼燽燿爀爁爂爃爄爅爆爈爉爊爋爌爍爎爏爐爑爓爔爕爕爕爖爗爘爙爚爛爜爝爞爟爠爡爣爤爥爦爧爨爩狄畑疢秋秌羙苂荧邩鈥钬阦颎齌㴴㴴㶡㶢㶣㶤㶥㶦㶧㶩㶪㶫㶬㶭㶮㶯㶰㶱㶲㶴㶶㶷㶸㶹㶺㶼㶽㶾㶿㷀㷀㷁㷂㷃㷄㷅㷆㷈㷉㷋㷌㷍㷎㷏㷑㷒㷓㷔㷕㷗㷘㷙㷚㷜㷞㷟㷡㷢㷣㷤㷧㷨㷩㷪㷫㷬㷭㷮㷯㷰㷲㷳㷴㷵㷷㷸㷹㷺㷻㷼㷽㷾㷿㸀㸁㸂㸄㸅㸆㸇㸈㸉㸉㸉㸊㸌㸍㸎㸏䀆䎡䙳䙺䲴𠈳𠊕𠑎𠖣𠟮𠠧𠣆𠦓𠧽𠪌𠷘𡁊𡁊𡇂𡐝𡕛𡕝𡕢𡣹𡣹𡤗𡤚𡦐𡦦𡨝𡨿𡫅𡭓𡲴𡵖𡵼𡸱𡹖𡹖𡼷𢄅𢅽𢉙𢏅𢐼𢒵𢖣𢚪𢝑𢝦𢝲𢞣𢟬𢥡𢥥𢥥𢥥𢩂𢭅𢭭𢰍𢰣𢱀𢱾𢸂𢹰𢽀𣀿𣄪𣇪𣊠𣍹𣎧𣏦𣏹𣠜𣣛𣧛𣱛𣲱𣴕𣴽𣷩𣸨𣹹𣺸𣻔𣿜𤄼𤆂𤆃𤆄𤆅𤆇𤆌𤆍𤆎𤆑𤆓𤆙𤆜𤆝𤆞𤆠𤆡𤆢𤆣𤆤𤆥𤆮𤆯𤆰𤆱𤆲𤆳𤆴𤆵𤆶𤆷𤆸𤆹𤆺𤆻𤆼𤆽𤆾𤆿𤇀𤇁𤇂𤇃𤇄𤇅𤇆𤇙𤇚𤇛𤇜𤇝𤇞𤇢𤇣𤇤𤇥𤇦𤇧𤇨𤇩𤇪𤇫𤇬𤇭𤇮𤇯𤇰𤇱𤇲𤇳𤇵𤇶𤇷𤇹𤇻𤈒𤈓𤈘𤈙𤈛𤈜𤈝𤈞𤈟𤈠𤈡𤈢𤈣𤈤𤈦𤈧𤈨𤈪𤈫𤈬𤈭𤈮𤈰𤈱𤈲𤈳𤈴𤈵𤈶𤈷𤈸𤉊𤉌𤉍𤉎𤉑𤉒𤉓𤉔𤉖𤉗𤉘𤉙𤉚𤉛𤉝𤉣𤉤𤉦𤉧𤉨𤉪𤉫𤉬𤉮𤉰𤉲𤉴𤉵𤉶𤉷𤉸𤊗𤊘𤊙𤊚𤊛𤊜𤊞𤊟𤊠𤊡𤊢𤊣𤊤𤊦𤊧𤊨𤊩𤊪𤊫𤊬𤊭𤊰𤊳𤊶𤊷𤊸𤊹𤊺𤊻𤋀𤋄𤋅𤋉𤋊𤋨𤋩𤋪𤋫𤋬𤋭𤋲𤋳𤋴𤋵𤋶𤋸𤋹𤋺𤋻𤋼𤋽𤋾𤋿𤌀𤌁𤌄𤌆𤌇𤌍𤌏𤌐𤌑𤌒𤌓𤌕𤌖𤌗𤌘𤌙𤌚𤌹𤌺𤌻𤌼𤌽𤌾𤌿𤍀𤍀𤍃𤍄𤍅𤍆𤍇𤍈𤍉𤍐𤍒𤍓𤍕𤍖𤍗𤍙𤍚𤍛𤍛𤍜𤍝𤍡𤍣𤍽𤍿𤎁𤎃𤎄𤎆𤎇𤎈𤎊𤎊𤎋𤎌𤎍𤎎𤎏𤎐𤎑𤎒𤎔𤎕𤎙𤎛𤎜𤎞𤎠𤎧𤎨𤎩𤎪𤎫𤎬𤎬𤎮𤎯𤎱𤎲𤎳𤎵𤎶𤎸𤎸𤎺𤎻𤎼𤎽𤏖𤏗𤏘𤏙𤏚𤏛𤏜𤏡𤏢𤏣𤏥𤏦𤏧𤏨𤏪𤏫𤏬𤏮𤏯𤏰𤏱𤏳𤏴𤏵𤏶𤏷𤏻𤏻𤏼𤏽𤏾𤏿𤐁𤐃𤐒𤐓𤐔𤐔𤐖𤐗𤐘𤐙𤐚𤐛𤐜𤐝𤐟𤐠𤐡𤐢𤐣𤐤𤐥𤐧𤐨𤐪𤐭𤐮𤐯𤐱𤐲𤐴𤐵𤐶𤑆𤑈𤑉𤑍𤑑𤑕𤑘𤑙𤑚𤑛𤑡𤑣𤑤𤑥𤑦𤑫𤑬𤑭𤑮𤑯𤑱𤑴𤑵𤑷𤑺𤑻𤑼𤑽𤑽𤑾𤑿𤒁𤒃𤒄𤒅𤒇𤒈𤒑𤒒𤒔𤒖𤒘𤒚𤒛𤒝𤒟𤒠𤒡𤒢𤒥𤒦𤒨𤒩𤒪𤒮𤒯𤒰𤒱𤒲𤒴𤒹𤒺𤒻𤒾𤒾𤓄𤓆𤓇𤓉𤓊𤓋𤓌𤓍𤓎𤓔𤓗𤓛𤓠𤓡𤓢𤓣𤓤𤓩𤓪𤓮𤢅𤫙𤫙𤫙𤬟𤬬𤮁𤮶𤮶𤮶𤱦𤳮𤵮𤶌𤽈𥃘𥋄𥍏𥍏𥍏𥕚𥕚𥚡𥚡𥣇𥨴𥰂𥰌𥱇𥷅𥹿𥻕𦂏𦇐𦇳𦈦𦌨𦍚𦎟𦏠𦓒𦗩𦙊𦙻𦛀𦛧𦢅𦣁𦩎𦫁𦫂𦫜𦰂𦲯𦳒𦵒𦹨𦹪𦻐𦾘𧀚𧀜𧄖𧈾𧌝𧏦𧐚𧔶𧚵𧜬𧟈𧡂𧡙𧡠𧡼𧢨𧨗𧫽𧮃𧷇𧺄𧺩𧾴𧿮𨁣𨅟𨇾𨇾𨇾𨉇𨐭𨐹𨑯𨓩𨓶𨕩𨕼𨖓𨗬𨘄𨚊𨛂𨟽𨣐𨨋𨨚𨪳𨫗𨬂𨯄𨯺𨰐𨰖𨴙𨹈𨻢𨽵𩃏𩄪𩆉𩇒𩇒𩇭𩉈𩋹𩌣𩏶𩐬𩒪𩓮𩕠𩦈𩧙𩧟𩧟𩧟𩬊𩰜𩱊𩵑𩵰𩺧𩼾𩽯𪄗𪆔𪇂𪌌𪎖𪏃𪏩𪐩𪚯𪚱𪛑𪢾𪤙𪥢𪥢𪧝𪫯𪱪𪵘𪸍𪸎𪸏𪸐𪸑𪸒𪸔𪸕𪸖𪸗𪸘𪸙𪸚𪸛𪸜𪸝𪸞𪸟𪸠𪸡𪸢𪸤𪸥𪸧𪸨𪸩𪸪𪸫𪸬𪸭𪸮𪸯𪸰𪸱𪸳𪸴𪸵𪸶𪸷𪸸𪸹𪸺𪸻𪸼𪸽𪸾𪹁𪹃𪹄𪹅𪹆𪹇𪹈𪹊𪹋𪹍𪹎𪹏𪹐𪹒𪹓𪹔𪹖𪹗𪹘𪹙𪹚𪹛𪹜𪹝𪹞𪹟𪹠𪹡𪹢𪹣𪹤𪹥𪹧𪹨𪹪𪹫𪹯𪹳𪹴𪹵𪹶𪹷𪹹𪹺𪹻𪹼𪹾𪺀𪺁𪺂𪺄𪺅𪺆𪺇𪺈𪺉𪺊𪺌𪻓𪻮𪼸𪾛𫘉𫞡𫳡𫴊𫴔𫷲𫸅𫹐𫽃𫽤𬀏𬄇𬄾𬉴𬉶𬉷𬉸𬉹𬉺𬉼𬉽𬉾𬉿𬊀𬊁𬊂𬊃𬊄𬊅𬊆𬊈𬊉𬊊𬊋𬊌𬊍𬊎𬊑𬊒𬊔𬊕𬊖𬊗𬊛𬊜𬊝𬊠𬊡𬊢𬊣𬊤𬊥𬊨𬊩𬊪𬊬𬊭𬊮𬊯𬊰𬊱𬊳𬊵𬊶𬊷𬊸𬊺𬊻𬊼𬊿𬋀𬋁𬋂𬋃𬋄𬋅𬋇𬋉𬋊𬋋𬋌𬋍𬋏𬋑𬋔𬋖𬋙𬋛𬋜𬋝𬋞𬋟𬋠𬋢𬋣𬌨𬔇𬔲𬟩𬪞𬪴𬭱𬮟𬴵",
 "戶": "所㣗𠉱𠋅𠗬𠩞𠯖𠲪𠶳𠹓𡉴𡞬𡲠𡵘𡶃𢜄𢧊𢨤𢨥𢨦𢨩𢨪𢨬𢨭𢨯𢨯𢨲𢨴𢨷𢨸𢨹𢨺𢨻𢨼𢨽𢨾𢩁𢩄𢩅𢩆𢩇𢩈𢩋𢩍𢩎𢩓𢩕𢩕𢩕𢩖𢩘𢩝𢩝𢩠𢩢𢬉𢭖𢮄𢯄𢳹𢵐𢸐𢻄𢻻𢾥𣇯𣇯𣒷𣓅𣓠𣓠𣟴𣢛𣢵𣪔𣷙𣸔𣾡𤉰𤔚𤝤𤟵𤥾𥄅𥫿𥶕𦂟𦔁𦘟𦙅𦚑𦜛𦜹𦪯𦳰𧉵𧠞𧦈𧫲𨂇𨜽𨨔𨸷𨹖𩃞𩃞𩚬𩛪𩢉𩩾𩿇𫼊𫼋𫽓𬙣",
 "白": "伯兠劰墍岶帕帛廹怕拍敀曁柏楽泉泊狛珀畠百癿皀皁皂皃的皅皆皇皈皉皊皋皌皍皎皏皐皑皒皓皔皖皗皘皙皚皛皛皛皜皞皟皠皡皢皣皤皥皦皧皪皫皬皭矈砶粕絈習胉舶苩袙貃迫鉑铂韟魄鮊鲌㒵㒶㕷㚖㼟㿝㿞㿟㿟㿠㿡㿢㿣㿤㿥㿦㿧㿨㿩䄸䎅䔤䕫䚌䜂䞟䳆𠆌𠌔𠌟𠒴𠙓𠙔𠙡𠙧𠙯𠡈𠤨𠦠𠩴𠵋𠼍𠼎𠽇𡆓𡈝𡈪𡊚𡍇𡍈𡏨𡕋𡕸𡛳𡞃𡞌𡥴𡫎𡳺𡴙𡻂𢀎𢀎𢀎𢄝𢆇𢊵𢒮𢒴𢕨𢕽𢘣𢦋𢩡𢫗𢴜𢵿𢻞𢻩𢾓𢾟𢿎𣄋𣆆𣌣𣎋𣐩𣑞𣛙𣠋𣣝𣣪𣪞𣪧𣰗𣴼𣹈𣹻𣼙𤅁𤇢𤋞𤋡𤐏𤕋𤝡𤪨𤪵𤭍𤼽𤼾𤼿𤽀𤽁𤽂𤽃𤽄𤽅𤽈𤽉𤽊𤽋𤽌𤽍𤽎𤽏𤽐𤽑𤽒𤽔𤽕𤽖𤽗𤽘𤽙𤽜𤽝𤽞𤽟𤽠𤽡𤽢𤽣𤽤𤽥𤽦𤽧𤽨𤽪𤽫𤽬𤽮𤽯𤽰𤽱𤽲𤽳𤽴𤽵𤽶𤽷𤽸𤽹𤽺𤽻𤽼𤽽𤾀𤾁𤾄𤾅𤾆𤾇𤾈𤾉𤾊𤾌𤾍𤾍𤾎𤾎𤾏𤾏𤾐𤾑𤾒𤾕𤾖𤾗𤾘𤾙𤾚𤾛𤾜𤾜𤾝𤾞𤾟𤾠𤾡𤾢𤾣𤾤𤾥𤾦𤾧𤾨𤾫𤾬𤾮𤾯𤾰𤾱𤾲𤾴𤾵𤾶𤾷𤾸𤾹𤾻𤾼𤾽𤾿𤿀𤿁𤿁𤿁𤿂𤿃𤿄𤿄𤿄𤿅𥁬𥍡𥎷𥏷𥏼𥔟𥙃𥠇𥡆𥡊𥡻𥢣𥬝𦁻𦃧𦄓𦆘𦇭𦈿𦎊𦎔𦐚𦒌𦛤𦫖𦫙𦯜𦲠𦺂𦾁𦿵𧅷𧆽𧇤𧚷𧨿𧭇𧳖𧸨𧼣𨆭𨉍𨋧𨌓𨐂𨘋𨚮𨜸𨞰𨠘𨩁𨰱𩄷𩊀𩑻𩕰𩗀𩙦𩚀𩛇𩞚𩯠𩲸𩹏𩺺𪞜𪦺𪮆𪯸𪴭𪽠𪽧𪽻𪽼𪽽𪽾𪽿𪾀𪾁𪾃𪾄𪾅𫀾𫏴𫝗𫞮𫟪噑㨮𤾡𦞵𫣋𫥡𫥢𫨷𬂎𬇻𬈻𬊸𬐃𬐄𬐅𬐆𬐇𬐈𬐉𬐊𬐌𬐎𬐏𬐐𬓽𬠀𬯇𬱲𬲉",
 "氏": "帋忯扺昏氐氒汦疧眂祇秖紙纸舐芪蚔衹觗赿軝㞴㡳㹝䉻䟗䲬䲭𠆖𠛊𠥯𠨿𠯑𠲐𠶩𠼠𡆿𡑘𡚼𢇼𢗪𢼕𣃮𣏚𣢎𣨯𣱆𣱇𣱌𣱍𣱏𣱔𤋇𤖿𤬕𤯁𤯄𥄇𥫽𥲬𦀦𦈏𦐊𦕌𦗦𦙆𦷘𧉜𧋗𧋣𧎪𧦄𧵄𨎱𨟾𨥌𨱡𨵂𨸝𨾛𨿹𩉬𩑥𩜡𩟾𩬁𪭭𫀔𫎛𫎛𫛂𫞕𫼙𬇊𬇊𬇋𬇌𬇍𬒀𬛺𬡼𬥰𬥰𬨂𬹱",
 "廾": "升卉开弁异弄弅弆弇弈弉弊彛彜彝彞戒灷竎算羿舁莽萛葬頮頯颒馵龏㘟㚏㢡㢢㢣㫒䟸𠂸𠗦𠮽𠶡𠶽𠹞𠻶𡍟𡙘𡞌𡧅𡪮𡫳𡮁𡷓𢇂𢌭𢌮𢌯𢌲𢌴𢌵𢌶𢌷𢌸𢌹𢌼𢌾𢌿𢍀𢍁𢍂𢍄𢍇𢍈𢍉𢍋𢍌𢍍𢍎𢍏𢍑𢍓𢍔𢍕𢍖𢍗𢍘𢍙𢍚𢍛𢍜𢍝𢍞𢍟𢍠𢍡𢍣𢍤𢍥𢍦𢍧𢍨𢍩𢍪𢍬𢍯𢍰𢍱𢍲𢍳𢍴𢍵𢍶𢍷𢍸𢍹𢐖𢖋𢨬𢪴𢬵𢮅𢰘𢱰𢱲𢶛𣅹𣆼𣈠𣎌𣔬𣟗𣪞𣰖𣷮𣹚𣺆𣼨𤊠𤟨𤟻𤸞𤼴𤼷𥃲𥇼𥈒𥏓𥐧𥓹𥟋𥤬𥤰𥦍𥨜𥫠𥮎𥮞𥯹𥰩𥰰𥱅𥲏𥶝𥷂𥸭𥹻𦁰𦂖𦃍𦇚𦍰𦚪𦧄𦧄𦧄𦬇𦮁𦯛𦯳𦰙𦰠𦱓𦱭𦱱𦲱𦳕𦳴𦴮𦷼𦿩𦿪𧜋𧟤𧟥𧠋𧠌𧡗𧡦𧤋𧫵𧳳𧳴𨁐𨐢𨓋𨓙𨔰𨖉𨖦𨖪𨗕𨗮𨝈𨟋𨡟𨧂𨩑𨱺𨵿𩐦𩒶𩓉𩓗𩓚𩘙𩚇𩝁𩫜𩸷𪒈𪞷𪡔𪣰𪪳𪪴𪪵𪪶𪪷𪪸𪪹𫊿𫌲𫙐𫢡𫢱𫥧𫸖𫸗𫸘𫸙𫸚𫸛𫸜𫸝𫸞𫸟𫸠𫸡𫸢𫸣𫸤𫸦𫹈𬅝𬆕𬌑𬌪𬎷𬏘𬗢𬙬𬝧𬝭𬪑𬪢𬶽",
 "𡰯": "刷㕞𢼞",
 "𠕁": "扁欳㕟𠀷𠂥𠊇𠋁𠋅𠌈𠎚𠎤𠔕𠜐𠞋𠞫𠟔𠣠𡘦𡭒𡲜𢘁𢼾𢽋𣗨𣼕𤐯𤳿𥌉𥲖𥿑𦒈𦿈𧄪𧭆𨅳𨇕𨐲𨓘𨛖𨜥𩆚𩔒𪟣𪥜𫓂瀹𫪡𫿯",
 "厃": "危矦𡘓𣽃𦗯𦧕𧞟𧩏𧸸𨅧𨊗𨪭𨼧𪒧𫝖",
 "矢": "医彘族疾矣矤知矦矧矨矩矪矫矬短矮矯矰矱矲笶鉃雉鴙㑨㞺䀢䂏䂐䂑䂒䂓䂔䂕䂠䒨䛈䠶𠅰𠤑𠤕𠤜𠱈𡠅𡠅𡧦𡪽𡱁𡲑𡲔𡺏𢁄𢃨𢇻𢚝𢨻𢭠𢮶𢲕𢵅𣎱𣛘𣤻𣽜𤶅𤶥𤼩𤼵𥌟𥎦𥎧𥎨𥎩𥎪𥎫𥎬𥎭𥎮𥎯𥎰𥎱𥎳𥎴𥎵𥎶𥎷𥎸𥎹𥎺𥎻𥎼𥎽𥎾𥎿𥏀𥏁𥏂𥏃𥏄𥏅𥏆𥏈𥏉𥏊𥏋𥏌𥏍𥏎𥏑𥏒𥏓𥏔𥏕𥏖𥏗𥏘𥏙𥏜𥏝𥏞𥏟𥏠𥏡𥏢𥏤𥏥𥏦𥏧𥏨𥏩𥏪𥏫𥏬𥏮𥏰𥏱𥏲𥏴𥏵𥏶𥏷𥏸𥏹𥏼𥏽𥏾𥏿𥐀𥐁𥐂𥐃𥐄𥐅𥐆𥐇𥐈𥐉𥐋𥐌𥐍𥐎𥐏𥐐𥐑𥠝𥨖𥺶𥿅𦎶𦔈𦗊𦘗𦛪𦩔𦱵𦳿𦷡𧬄𨉛𨒔𨕀𨞈𨴊𩓎𩓙𩛫𩦙𩲶𩶇𩼍𪄬𪊢𪓳𪭨𪰕𪰖𪵳𪿈𪿉𪿊𪿋𪿌𪿎𪿐𫊆𫞆𫨸𫶬𬐇𬑰𬑱𬑲𬑳𬑴𬑷𬙜𬜱",
 "屰": "朔欮逆㖾㡿㴊𠩋𠱘𠾌𡑇𡴘𢯪𣔳𣶮𤎬𤗙𥑺𥚘𥿬𦒂𦒟𦠍𦥭𦥾𧩯𧼞𧼳𨂫𩒕𩬸𩻙𪀝𪜏𪟄𫅦𫯷𬎫",
 "欠": "吹弞忺扻揿杴次欣欤欥欦欧欨欩欪欫欬欭欮欯欰欱欲欳欶欷欸欹欺欻欼欽歀歁歂歃歄歅歆歇歈歉歊歋歌歍歏歐歑歒歓歔歕歖歗歘歙歚歛歜歝歟歠歡炊燞砍缼肷芡赥赼軟软钦飮飲龡㐸㦤㰝㰞㰟㰠㰡㰢㰣㰤㰥㰦㰧㰨㰩㰪㰫㰬㰭㰮㰯㰰㰱㰲㰳㰴㰵㰶㰷㰸㰹㰺㰻㰼㰽㰿㱀㱁㱂㱃㱄㱅㱇㱈㱉㱊㱋㱌㱍㱎㳄㸝㺵䇜䊻䚿䪠䯉𠏩𠑁𠦰𠩼𠪁𠪗𠲭𠸰𠾗𠿖𡁀𡁌𡁍𡃠𡞁𡸛𡺏𡾴𢁧𢆘𢇣𢉄𢓑𢛦𢸈𣆾𣢀𣢁𣢂𣢄𣢆𣢇𣢈𣢊𣢋𣢌𣢍𣢎𣢏𣢐𣢐𣢑𣢒𣢓𣢕𣢖𣢗𣢘𣢙𣢚𣢛𣢜𣢞𣢟𣢠𣢡𣢢𣢤𣢥𣢦𣢧𣢨𣢩𣢪𣢬𣢭𣢮𣢯𣢰𣢱𣢲𣢳𣢴𣢵𣢶𣢷𣢸𣢹𣢺𣢻𣢽𣢾𣢿𣣁𣣂𣣃𣣄𣣅𣣆𣣇𣣉𣣊𣣍𣣎𣣏𣣐𣣑𣣓𣣓𣣓𣣔𣣕𣣖𣣗𣣘𣣙𣣚𣣛𣣛𣣜𣣝𣣞𣣟𣣠𣣢𣣣𣣤𣣥𣣦𣣧𣣨𣣩𣣪𣣫𣣬𣣭𣣮𣣯𣣱𣣲𣣴𣣵𣣶𣣷𣣸𣣹𣣻𣣼𣣽𣣾𣣿𣤀𣤁𣤂𣤃𣤄𣤅𣤆𣤇𣤈𣤉𣤊𣤋𣤌𣤍𣤎𣤏𣤑𣤒𣤓𣤕𣤖𣤗𣤘𣤙𣤚𣤛𣤜𣤝𣤞𣤟𣤠𣤡𣤣𣤤𣤥𣤦𣤧𣤩𣤪𣤫𣤬𣤭𣤮𣤯𣤰𣤱𣤲𣤳𣤴𣤵𣤶𣤷𣤸𣤹𣤺𣤻𣤼𣤽𣤿𣥀𣥁𣧋𣪄𣪳𣬴𣶙𣶛𣿁𤘯𤜹𤝀𤝆𤡻𤩤𤪎𤪰𤪵𤴼𤺘𥎯𥧾𥴋𥷟𥸷𦆃𦌸𦥞𦳫𦽣𧥊𧷝𧿞𨍁𨖯𨠅𨡢𨱟𨵇𨶕𨼤𩀒𩉢𩎗𩐆𩞺𩲟𩵢𩺶𪉁𪌒𪕆𪖗𪴩𪴪𪴫𪴬𪴭𪴮𪴯𪴰𪴱𪴲𪴳𪴴𫆁𫜌𫰑𬅝𬅞𬅟𬅠𬅡𬅢𬅣𬅤𬅥𬅦𬅨𬅩𬅪𬅫𬅬𬅭𬅮𬅯𬅰𬅱𬅲𬅴𬅵𬝜𬞢𬩠𬫘𬮼",
 "𠦝": "乹乾倝幹戟斡朝榦翰螒雗韓韩鶾㲦䎐䮧𠢇𢒨𢧢𢵕𣁖𣉙𣎍𣎠𣙈𣶃𤃬𥀐𥉏𥶭𦩻𧁀𧹳𨢈𨿨𩏑𩙶𩧗𩹼𪂂𪟵𪟺𪪂𫧩𫧭",
 "貝": "儧則員唄孭寳寶屓戝敗梖浿狽珼璳筫蕆蛽貞貟財貢貤貥貦貧貨販貪貫責貭貯貰貱貲貳貵貶貸貹貺費貼貽貾賀賁賂賃賄賅賆資賉賊賋賌賍賏賏賐賑賒賔賕賖賗賘賙賚賛賜賟賠賡賢賤賥賦賧賨賩質賫賬賭賯賰賱賲賳賵賶賷賹賺賻購賽賿贀贁贁贂贃贄贅贆贇贈贉贊贋贌贍贎贏贐贒贓贔贔贔贖贗贘贙贚贜郥鋇閴鵙鼰齎㕢㛝㦐㯯㰓㲘㸽䝧䝨䝩䝪䝫䝬䝭䝮䝯䝰䝱䝲䝴䝵䝶䝷䝸䝹䝺䝻䝼䝽䝾䝿䞀䞁䞂䞃䞄䞅䞇䞈䞉䞉䞊䞋䞐䟺䢙䩀䪥𠆄𠏞𠏤𠙒𠟔𠟬𠟻𠟻𠩠𠭁𠭸𠹰𠼠𠼹𡀅𡀹𡀺𡃪𡄙𡏶𡑧𡓤𡓫𡓫𡢍𡢲𡣑𡪓𡪛𡺕𢅙𢉯𢊷𢊹𢊾𢋍𢋐𢋫𢎐𢝢𢡝𢢻𢤳𢥨𢭲𢵟𢶦𢿓𢿡𣀕𣀕𣄫𣇜𣖿𣜇𣟨𣠦𣣬𣤥𣿽𤀭𤂓𤂯𤃘𤄴𤔼𤘄𤛀𤨏𤫋𤼊𤼺𤾶𥆘𥋻𥌄𥌔𥌶𥎉𥖶𥛤𥢼𥣶𥤒𥦎𥧨𥨽𥩐𥫎𥫔𥲣𥲨𥳹𥴶𥴹𥵎𦁀𦆋𦇅𦇣𦉦𦉦𦎳𦏙𦘋𦢒𦢼𦤰𦫂𦮷𦹘𦹱𦹶𦹺𦺲𦼨𧂟𧂪𧃤𧅅𧑰𧒅𧓍𧓩𧝭𧟅𧟎𧢔𧧾𧳒𧴤𧴥𧴦𧴧𧴨𧴩𧴪𧴫𧴭𧴮𧴯𧴰𧴱𧴲𧴳𧴴𧴵𧴶𧴷𧴸𧴹𧴺𧴻𧴼𧴽𧴾𧴿𧵀𧵁𧵂𧵃𧵄𧵅𧵆𧵇𧵈𧵉𧵊𧵋𧵌𧵍𧵎𧵏𧵐𧵑𧵒𧵓𧵔𧵕𧵖𧵗𧵘𧵙𧵚𧵛𧵜𧵝𧵞𧵠𧵡𧵢𧵣𧵤𧵥𧵦𧵧𧵨𧵩𧵪𧵫𧵬𧵭𧵮𧵯𧵰𧵱𧵲𧵳𧵵𧵶𧵷𧵸𧵹𧵺𧵻𧵼𧵽𧵾𧵿𧶀𧶂𧶄𧶅𧶆𧶇𧶈𧶉𧶋𧶌𧶍𧶎𧶓𧶔𧶕𧶖𧶗𧶘𧶚𧶛𧶜𧶞𧶟𧶠𧶡𧶢𧶣𧶤𧶥𧶦𧶧𧶨𧶩𧶪𧶫𧶬𧶭𧶮𧶯𧶱𧶲𧶳𧶴𧶵𧶸𧶺𧶻𧶼𧶽𧶾𧷀𧷂𧷄𧷆𧷇𧷈𧷉𧷊𧷋𧷌𧷍𧷎𧷏𧷑𧷒𧷕𧷖𧷗𧷙𧷚𧷛𧷝𧷠𧷡𧷢𧷣𧷥𧷦𧷧𧷫𧷬𧷭𧷰𧷰𧷲𧷳𧷴𧷵𧷶𧷷𧷸𧷹𧷺𧷻𧷻𧷼𧷽𧷾𧷿𧸀𧸁𧸂𧸃𧸄𧸅𧸆𧸇𧸉𧸊𧸌𧸎𧸏𧸐𧸑𧸒𧸓𧸔𧸕𧸖𧸗𧸘𧸙𧸚𧸛𧸜𧸞𧸟𧸠𧸡𧸢𧸣𧸤𧸥𧸥𧸦𧸧𧸨𧸩𧸪𧸬𧸭𧸮𧸰𧸲𧸳𧸴𧸵𧸵𧸶𧸸𧸹𧸺𧸻𧸽𧸾𧸿𧹀𧹁𧹂𧹄𧹆𧹇𧹉𧹊𧹎𧹎𧹏𧹐𧼀𨆦𨇇𨇚𨎘𨎾𨏅𨏘𨖒𨙑𨙜𨜭𨝉𨝤𨞆𨞵𨢖𨣜𨰷𨷪𨻨𨽠𨿎𩆹𩉓𩍾𩕽𩗗𩞗𩟱𩪹𩯿𩰗𩼜𩼱𪊾𪎬𪒦𪔡𪪡𪪥𪸭𪽾𫂢𫎎𫎏𫎐𫎑𫎒𫎓𫎔𫎕𫎖𫎗𫎘𫎙𫎛𫎜𫎝𫎞𫎟𫎠𫎡𫎢𫎣𫎥寳貫賁𫠾𫤀𫱇𫲂𫴝𫴡𫴢𫴦𫴩𫴫𫶑𫸳𫿜𫿪𬃜𬃽𬅇𬒹𬔪𬗨𬟫𬥎𬥏𬥐𬥑𬥒𬥓𬥔𬥕𬥖𬥗𬥘𬥚𬥛𬥜𬥝𬥞𬥟𬥡𬥢𬥤𬥥𬥦𬥧𬥨𬥪𬥫𬥰𬥰𬥱𬥲𬦛𬩫𬹠",
 "旦": "亘亶但呾妲怛担昜昼暨曁查柦泹炟狚疍疸笪胆袒觛詚量鉭钽靼鴠鼂鼌㝵㡺㫜㫤䋎䖧䜥䞡䦔䱇䵣𠛣𠡎𠡱𠢻𠣡𠿲𡨕𡨵𡩉𡪏𡫝𢄾𢘇𢯟𢳛𢺖𣆞𣆟𣆽𣊏𣌚𣌛𣙁𤇁𤖛𤙫𥅃𥑲𥘵𥚜𥛠𥟙𥟟𥧍𥷛𦊥𦤾𦨪𦬹𧩙𧵯𧶬𨀏𨇬𨈱𨎅𨠚𨧝𨲦𩆉𩈍𩑰𩚃𩼻𩽙𩽟𪒇𪝂𪪤𪰬𪲩𪼍𫅑𬀼𬃱𬇀𬖭𬘜",
 "寸": "付刌厨吋団埓夺守寺导寽対尀封専尃射尅将尊尌導屗忖时村树疛籿紂纣耐肘衬討讨辱过酎闘鬪鳉㝴㝵㝶㝷㩊㯹㴻㵱㷉䅶䒭䖞䙷䙸䢆䢇𠎅𠎬𠐫𠖁𠖌𠷲𠷵𠷻𡁷𡈣𡎃𡏌𡏷𡔺𡔽𡣋𡨎𡨙𡬞𡬟𡬡𡬢𡬣𡬤𡬦𡬧𡬨𡬩𡬪𡬫𡬬𡬮𡬯𡬱𡬲𡬳𡬴𡬵𡬶𡬷𡬸𡬹𡬺𡬻𡬼𡬽𡬾𡬿𡭀𡭃𡭄𡭅𡭆𡭈𡭊𡭌𡭎𡭏𡭑𡭒𡭓𡭫𢁜𢊍𢔨𢔶𢔽𢟹𢠍𢥓𢩭𢫊𢰊𢰐𢰙𣑓𣑗𣑣𣗳𣜻𣝣𣝪𣟑𣟜𣠵𣡫𣡮𣡱𤀯𤅪𤍇𤔸𤔺𤚾𤛀𤜮𤰥𤳚𤴋𤴎𤹘𤾖𤿃𥃷𥆴𥘑𥛑𥟳𥩸𦅛𦆝𦉤𦋂𦍸𦏽𦔘𦛷𦞹𦥘𦸎𧘄𧝪𧲣𧴫𧺘𧽘𨊭𨑈𨓣𨕯𨘚𨙯𨝻𨟌𨥇𨮡𨮬𩈃𩉃𩍌𩕖𩦾𩯧𩰨𩰩𩲅𩳨𩷥𩺎𪡮𪣳𪤁𪤳𪧷𪧹𪧺𪧼𪩙𪭺𫏀𫟱博寿𫴯𫴰𫴴𫵛𫷦𬁟𬂝𬉴𬑺𬶾",
 "禸": "离禼𢿑𤜏𥜻𥜼𥜽𥜾𥝁𥝄𥝅𥝈𥝋𧔱𧮏𧹇𨤞𩴭𫈧𫲄",
 "聿": "侓冿峍建律津珒硉筆肁肂肆肇肈茟衋貄銉㖀㡽䀌䋖䢖䮇𠜈𡋶𡷏𢌤𢘶𢫫𣑵𣸁𤈠𤝽𤦯𥂵𥞰𥹧𦘓𦘔𦘖𦘗𦘞𦘟𦘠𦘥𦘦𦛌𦨱𦩦𦳳𦻄𧊐𧗁𧗃𧗙𧗚𧙻𧧪𧱇𨀞𨔥𩬶𪀴𪁀𫆔𫆕𫙟𫲌𫽹𬚫𬚭𬚮𬯟",
 "未": "佅味妹寐怽抺昧朱業沬眛祙苿跊魅鮇㖝㭑㲠䙿䵢𠃥𠇠𠎶𠛐𠝁𠞲𠩺𠩼𡁖𡟋𡠃𡣎𡥒𡥽𡲧𡶎𢍛𢓛𢡷𢼡𢿹𣂺𣑜𣒠𣗓𣜾𣞥𣠕𣠖𣭐𣳕𣸗𣺇𤔮𤳡𤽜𥑘𥞊𥥘𥦤𥧌𥧙𥧙𥻕𦆏𦓤𦕜𦗱𦫕𧉿𧔵𧙕𧡿𧩥𧵖𧻇𨚘𨠝𩈐𩈘𩑄𩑵𩜣𩳗𩿲𪘻𪜬𪟾𪥊𪥋𪱼𪲅𪳼𪸙𪽬𫃟𫎜𫨃𫨴𫭆𫭥𫹻𬂧𬂧𬄞𬅄𬅅𬔴𬨗",
 "攵": "呚啟媺嬍孜幑微徴徵徹徾撤收攷攺攻攼攽放政敀敂敃敄故敇效敉敋敌敎敏敐救敒敓敔敕敗敘教敚敛敜敝敞敟敦敨敩敪敬敭数敳敵敶數敹敾敿斁斂斆枚潃澂澈炇煞玫畋盩瞮致變贁败赦轍辙駇鰴黴㣲㩿㪀㪄㪇㪉㪍㪘㪙㪚㪟㪣㪤㪦㬚㯙㲠㳊㴾㿂䒆䚺䰻䱷䲣䵇𠉿𠊅𠊹𠌝𠑛𠘄𠢅𠢐𠩺𠪫𠪭𠺛𠾀𠾝𡑃𡒋𡓌𡝒𡟋𡠉𡠾𡥽𡨥𡸅𡺧𡼐𢅷𢋮𢌦𢍗𢍛𢎿𢕄𢕧𢕲𢕹𢖄𢖉𢖜𢖢𢚐𢜕𢝽𢟭𢠜𢡑𢡷𢢡𢥦𢥲𢶗𢹗𢻮𢻯𢻹𢻺𢻾𢼁𢼂𢼃𢼄𢼅𢼉𢼊𢼏𢼑𢼘𢼙𢼚𢼜𢼡𢼥𢼪𢼫𢼭𢼳𢼴𢼵𢼶𢼷𢼸𢽆𢽇𢽉𢽗𢽘𢽛𢽟𢽡𢽤𢽬𢽮𢽯𢽰𢽸𢽹𢽺𢽻𢾅𢾡𢾢𢾭𢾳𢾷𢾺𢿃𢿋𢿐𢿓𢿔𢿛𢿜𢿬𢿻𣀐𣀗𣀬𣀭𣀳𣀿𣁛𣊽𣕌𣟷𣦔𣯛𣰟𣴗𣶌𣷜𣸗𣺶𣿊𣿗𣿥𤉧𤊮𤋄𤍗𤎦𤏺𤐳𤔠𤕢𤛆𤟸𤡄𤡏𤡳𤢋𤢝𤯛𤼲𥎟𥎪𥓺𥜄𥠛𥠪𥦲𥦵𥨄𥰙𥰡𥲖𥷭𥷲𥹛𥼅𦁘𦂇𦅄𦇕𦋷𦎦𦑸𦔞𦗷𦞬𦠣𦪰𦵨𦵪𦸦𦽗𦽠𦿎𧈓𧎄𧏅𧒥𧘶𧜌𧠂𧩥𧪤𧫬𧭁𧸟𨂣𨅊𨈡𨊴𨍎𨏁𨏣𨖟𨗯𨝟𨝩𨟮𨡭𨤲𨨽𨩺𨰩𨱝𨲬𨲶𨸩𩀼𩃂𩄿𩅓𩅤𩆥𩉩𩐇𩐈𩝕𩤝𩭾𩷢𩺕𩻯𩼡𪈶𪌑𪐫𪑛𪑢𪓴𪓶𪔀𪔻𪖖𪘯𪘻𪚐𪝇𪢀𪦐𪦩𪧞𪧣𪯈𪯌𪯍𪯎𪯏𪯐𪯑𪯒𪯓𪯔𪯖𪯘𪯙𪯚𪯜𪯟𪯱𪰋𪲏𪴉𪵊𪷁𪹖𪹲𪻰𪼂𪾇𫀙𫄒𫉪𫎜𫏂𫑍𫒋𫓓啓敏𣀊𫡣𫢽𫣈𫬚𫴄𫺗𫺮𫻙𫾧𫾨𫾩𫾪𫾫𫾬𫾭𫾮𫾯𫾱𫾳𫾴𫾵𫾶𫾷𫾹𫾺𫾻𫾼𫾽𫾾𫿀𫿁𫿂𫿃𫿄𫿆𫿈𫿉𫿋𫿌𫿍𫿏𫿑𫿒𫿓𫿔𫿖𫿘𫿙𫿚𫿛𫿜𫿝𫿠𫿡𫿢𫿣𫿤𫿦𫿧𫿩𫿫𫿬𬉘𬐽𬑿𬔼𬞯𬟚𬟡𬥋𬥱𬩊𬮋𬯟",
 "立": "亲位咅妾岦拉攱昱柆泣砬竌竍竎竏竐竑竓竔竕竖竗竘站竚竛竝竝竞章竡竢竣竤童竦竧竨竩竪竫竬竭竮端竰竱竲竳竴竵笠粒翊翋翌苙豙趇鉝閚雴霠靖颯飒鴗㕇㕸㞐㡴㱞䇃䇄䇅䇆䇇䇈䇉䇊䇋䇍䇎䇏䇐䇑䇒䇓䇔䇕䏠䠴䢂䬃䲞䶘𠊺𠖃𠙅𠪽𠶷𠹧𠺠𡎿𡙴𡙶𡛩𡣎𡬛𡬛𡶧𢆂𢉊𢓔𢕎𢘮𢡃𢡝𢥮𢨅𢨶𢮣𢷉𣂅𣂺𣒂𣓱𣜐𣟥𣢦𣥢𣦲𣦳𣫚𣭉𣯓𣯓𣯞𣯞𣱠𣶅𣽾𤇥𤍩𤖹𤗔𤤔𤱗𤺀𤾕𤾕𥅈𥘸𥩕𥩖𥩗𥩘𥩙𥩚𥩝𥩞𥩟𥩠𥩡𥩢𥩣𥩤𥩥𥩦𥩨𥩩𥩪𥩫𥩬𥩭𥩮𥩯𥩰𥩱𥩲𥩳𥩴𥩵𥩶𥩷𥩸𥩹𥩺𥩻𥩼𥩽𥩾𥪀𥪁𥪂𥪃𥪄𥪅𥪆𥪉𥪊𥪋𥪌𥪍𥪎𥪏𥪐𥪑𥪒𥪓𥪔𥪕𥪗𥪘𥪙𥪚𥪛𥪜𥪟𥪠𥪡𥪣𥪤𥪥𥪦𥪧𥪨𥪩𥪪𥪫𥪬𥪭𥪮𥪯𥪱𥪲𥪳𥪶𥪷𥪸𥪹𥪺𥪻𥪽𥪾𥪿𥫀𥫁𥫃𥫄𥫅𥫆𥫇𥫈𥫉𥫌𥫍𥫏𥺺𦊢𦗤𦚎𦚏𦲂𦲨𦵑𦶍𦷏𧉼𧏑𧏑𧙀𧞀𧟛𧟛𧟞𧟞𧡿𧣿𧦰𧪻𧪻𧴈𨀎𨃱𨃱𨋢𨐐𨐻𨑂𨑂𨑂𨚪𨩄𩊌𩓣𩓶𩔍𩔐𩕙𩖕𩚷𩜛𩦳𩧧𩪟𩬦𩮗𩮗𩶘𩺿𫁞𫁟𫁠𫁡𫁢𫁣𫁤𫁤𫁥𫁦𫁧𫁨𫁩𫁪𫁫𫁭𫁮𫃡𫞻𫞼𫟷𫲿𬊸𬌁𬔗𬔘𬔚𬔛𬔜𬔝𬔞𬔟𬔠𬔡𬔢𬔣𬔤𬔥𬔦𬔨𬔪𬛦𬡏𬨢𬩢𬰚𬱏",
 "中": "仲冲妕忠忡沖狆盅祌种翀肿舯蚛衶衷訲迚鈡钟馽㕜㞲㲴䆔䦿𠀐𠁨𠁪𠁯𠁵𠁶𠁹𠂝𠅊𠎏𠛸𠢀𠥅𠳴𠶷𠻭𡁉𡉥𡒒𡔽𡖌𡞔𡡼𡧥𡧲𡴑𢡌𢪠𣐄𣥷𣶴𤁘𤆪𤌻𤠢𥄡𥪝𥫯𦋱𦌯𦑬𦕏𦬕𧔁𨉂𨌼𨌼𨵓𨵓𩁤𩔿𩞒𩡥𩢆𩪟𩪩𩵵𩶍𩿀𪚚𪜉𪞑𪫏𪯡𪳱𪳱𪳱𪽓𫃞𫑢𫔚𫙄𫝇𫠬𫡇𫡉𫩘𫫆𫯞𫲹𫻳𬇧𬈅𬈴𬩵",
 "剡": "㓹𠋴𤸹𥰨𥵲𥶖𦃖𦆢𦋺𦌧𦵹𦿦",
 "亡": "匄吂妄忘忙朚望杗杧氓汒甿盲盳笀芒虻蝱衁邙釯㠵䖟䰶𠅍𠅎𠅐𠅒𠅳𠅻𠅼𠅽𠜡𠺯𡔞𡣍𡩩𡴧𡵀𡵍𡶍𢁣𢂠𢙗𢟚𣎆𣠮𣥊𣱅𣳁𣶟𤅗𤅘𦉽𦉾𦊀𦏞𦐀𦘻𦝠𦟀𦦦𦦭𦫋𦭆𦮞𦱐𦱺𦻯𧄿𧆍𧕕𧕕𧠰𧧢𧧮𧨉𨏩𨭞𨸁𩓜𩣇𩼊𪌁𪜡𪢷𫒜望𫡟𫡻𫡾𫩔𫲓𬆞𬇮𬉑",
 "󠄁": "枩粀缏㟗㟗𠈀𠊠𠐖𠔕𠔡𠔢𠔲𠖲𠛀𠛸𠤰𠤹𠥞𠪺𠫳𠬬𠯨𠾞𡆾𡇇𡇛𡉋𡋄𡓙𡗯𡟸𡧋𡩞𡭅𡵳𡸐𡹀𢁥𢂘𢈑𢗆𢪌𢳼𢵙𢺲𢺹𢺺𣄀𣊆𣊱𣌥𣏰𣔤𣛊𣥝𣥱𣦆𣦰𣩖𣬄𣬒𣷱𣹁𣼘𤂫𤈆𤓼𤟳𤢱𤫗𤵇𤽉𥁣𥒅𥘜𥚄𥝶𥟹𥢫𥦋𥴉𥴉𦰠𦲺𦹎𧍅𧍇𨋂𨚇𨥅𨫡𨱛𨳗𨳟𨴶𨸇𨸣𨹍𩉭𩒬𩔫𩣭𩭤𩲝𩸲𩿈𩿉揅𣫺",
 "谷": "俗卻唂容峪欲浴焀硲綌绤裕谸谹谺谻谼谽谾谿豀豁豂豃豄豅輍逧郤鋊鵒鹆㕡㞃㭲䀰䎥䘱䛦䜪䜫䜬䜭䜮䜯䜰䜱䜲䞱䧍𠗖𡓛𡓼𡓼𢂲𢓾𢼽𢿁𣃺𣍂𣙴𣴲𣽊𤄟𤞞𤥫𤩅𤩋𤩡𤭏𥋩𥙿𥪉𦛱𧋉𧜲𧮬𧮮𧮯𧮰𧮱𧮲𧮳𧮴𧮵𧮶𧮷𧮸𧮹𧮺𧮻𧮼𧮽𧮾𧮿𧯀𧯁𧯃𧯄𧯅𧯆𧯇𧯈𧯉𧯊𧯋𧯌𧯍𧯎𧯏𧯐𧯑𧯒𧯓𧯔𧯕𧯖𧯗𧯘𧯙𧷚𨁖𨿜𩟨𩣥𩷝𪁴𪇟𪊿𪑌𪚡𪫹𫈅𫎀𫎁𫎂𫨊𫮺𬢁𬢗𬤲𬤳𬤴𬤵𬴒",
 "止": "凪扯杫正此步歧歩歫歬歭歮歯歱歳歴歵歷沚涩渋砋祉芷訨趾辪阯頉㢟㱐㱑㱒㱓㱕㱖㱗㱘䄳䇛䊼䕫䜀䜧䤠䧳𠂛𠇈𠏔𠑂𠙑𠚠𠚠𠜶𠣏𠩧𠪈𠭓𠭸𠯽𠳰𠹜𡂥𡇴𡈖𡍍𡍍𡎙𡒧𡓼𡚍𡠔𡠡𡡸𡴧𡵩𢀽𢆆𢉍𢋹𢋹𢌧𢌨𢍷𢍷𢏾𢒕𢒸𢓊𢔗𢕜𢕱𢡒𢭌𢵏𢹎𢹾𢽗𣂯𣂶𣄬𣏔𣒉𣗀𣗫𣛅𣥅𣥈𣥉𣥊𣥌𣥍𣥎𣥐𣥑𣥔𣥕𣥕𣥚𣥜𣥝𣥟𣥢𣥤𣥧𣥩𣥪𣥫𣥬𣥭𣥮𣥯𣥰𣥱𣥲𣥳𣥴𣥶𣥷𣥸𣥺𣥼𣥿𣦀𣦁𣦁𣦂𣦃𣦄𣦅𣦆𣦉𣦊𣦋𣦌𣦎𣦐𣦑𣦒𣦔𣦕𣦕𣦗𣦘𣦙𣦙𣦚𣦢𣦣𣦣𣦩𣦪𣦬𣦯𣦰𣦱𣦲𣦳𣦴𣦴𣦴𣧐𣴯𣴻𣶵𣹣𣺀𣾅𣾢𣾥𤁍𤁍𤅌𤉭𤌺𤎴𤎵𤑊𤒂𤔿𤚜𤠏𤢠𤪨𤫘𤫝𤵁𤻤𤼬𥅵𥎩𥎼𥏁𥐃𥒿𥓇𥘣𥧞𥮺𥳧𥳭𦀍𦁗𦈍𦊆𦑳𦒕𦗮𦗮𦗮𦙡𦠊𦠊𦠊𦪍𦶵𦾪𧁻𧃍𧃰𧇒𧉀𧉘𧋇𧖭𧘲𧙼𧚺𧝦𧠛𧢏𧫌𧬃𧬃𧬃𧳺𧴎𧴎𧴎𧵰𧸥𧺠𧻂𧾭𧾭𧾭𧾷𨁘𨁾𨂇𨅅𨊺𨏵𨑭𨒠𨓧𨓼𨔀𨕐𨖸𨛷𨜁𨮷𨺗𩉮𩋀𩌳𩒞𩓯𩔤𩕘𩕨𩖓𩚻𩠮𩤋𩮣𩵉𩵊𩾰𪠉𪥧𪫒𪫘𪫘𪫣𪬞𪯯𪰊𪴵𪴶𪴷𪴸𪴼𪴾𪴿𪵺𪸔𫏷𫓊𫖠𫟞歲䕫𫢂𫧎𫧽𫨞𫭠𫰏𫲺𫳥𫹔𫼢𬅶𬅷𬅸𬅹𬅺𬅻𬅼𬅽𬅾𬆇𬆇𬆊𬆋𬆋𬆌𬆏𬆏𬆏𬈰𬒪𬔊𬜙𬜙𬞯𬟡𬠿𬩓𬯪𬲤",
 "亯": "湻醕㥫㪟䈞𠆌𤮩𥜭𥲮𥴀𦎧𦎫𦤘𦴒𩋻𫩂𬃬",
 "羊": "佯咩善庠徉样氧洋烊牂珜痒眻祥絴羍羘羣群羴羴羸蛘觧詳详鮮鲜㟄㮆䍧䬺𠙌𠫄𠲘𡢡𡱝𢏙𢔦𢢍𢤴𢤴𢮡𢺧𢼝𣀆𣁵𣉫𣜘𣡅𣾌𤅘𤛰𤢮𥒞𥜉𥠧𥥵𥨭𥬴𦃱𦇽𦍏𦍒𦍔𦍕𦍗𦍘𦍙𦍜𦍝𦍞𦍠𦍢𦍧𦍬𦍲𦍹𦎒𦎕𦎙𦎚𦎦𦎨𦎫𦎯𦎷𦎼𦏂𦏃𦏐𦏐𦏜𦏝𦏝𦏞𦏭𦢗𦢱𦭵𦳟𧄿𧒃𧒦𨀘𨄶𨋽𨒫𨖐𨗵𨛁𨞗𨦡𨬲𩁛𩄤𩊑𩍠𩡚𩣆𩤑𩥍𩰱𩴨𩴨𪔙𪢟𪢪𪤯𪭰𪯷𫅎𫅐𫅑𫅒𫅓𫅓𫅔𫅕𫅗𫅙𫅛𫅧𫅱𫙊善𫨇𫰧𫳅𫹖𬌄𬒌𬙭𬙮𬙯𬙱𬙳𬙶𬙷𬙸𬙹𬙻𬡘𬨭𬩙",
 "回": "佪啚廻徊恛洄痐硘穯絗茴蛔迴靣鮰㐭㔽㻁䛛䤧䨓𠲛𠹫𠻮𠾂𡄅𡋙𡒅𡣰𡦬𡹯𢊂𢊉𢊬𢋕𢋢𢋾𢌓𢙍𢞮𣑩𣞱𣞸𣠐𣡺𣨨𣻲𣿠𤂟𤅻𤖠𤞑𤴐𤴐𤹄𤺡𥀑𥀖𥜘𥣱𥲞𦂆𦉩𦸜𦾰𧁝𧇴𧍚𧙪𧠲𧻢𨎏𨏸𨕔𨗞𨘵𨞴𨡞𨬧𩇊𩇑𩇓𩇓𩎏𩞒𩢱𩫃𩫖𩫗𪀟𪌦𪡐𪸰𪼫𫂛𫚔𫝻圖𫭐𫮶𬣬𬱈𬱩",
 "吕": "侣捛梠焒稆筥絽莒营躳郘鋁铝閭闾麿㐯㾔𠰞𡄹𡄹𡅽𡅽𡓶𡓶𤌻𤕈𤕈𤲇𧠃𨉫𨪟𪆾𪟔𪤯𪫰𪭛𫦛𫨓𫩊𫩙𫬽𫬽𫿄𫿵𬌞𬔉𬘤𬵼",
 "頁": "嚻囂夒夓崸幁暊湏潁瀬煩熲碩穎纇蝢頂頄項順頇須頉頊頋頌頍頎頏預頑頒頓頔頕頖頗領頙頚頛頜頝頞頟頠頡頢頣頤頥頦頧頨頩頪頫頬頭頮頯頰頱頲頳頴頵頶頷頸頹頺頻頼頿顀顁顂顃顄顅顆顇顈顉顊顋題額顎顏顐顑顒顓顔顕顖顗願顙顚顛顜顝顟顠顢顣顤顥顦顧顨顨顩顪顫顬顭顮顱顲顳顴颒龥㑯㖽㛲㥧㯋䅡䋶䐓䪱䪲䪳䪴䪵䪶䪷䪸䪹䪺䪻䪼䪽䪾䪿䫀䫁䫂䫃䫄䫅䫆䫇䫈䫉䫊䫋䫌䫍䫎䫏䫐䫑䫒䫓䫔䫕䫖䫗䫘䫙䫚䫛䫜䫝䫞䫟䫠䫡䫢䫣䫤䫥䫦䫧䫨䫩䫪䫫䫬䫭䫮䫯䫰䫱䫲䫳䫴䫵䫶䫷䭭䯪䰅𠎡𠐬𠑚𠑯𠽸𡄶𡅑𡡓𡯺𡺋𡾆𡾫𡿅𢝊𢤧𢥤𢥨𢦁𢶄𢹟𢹻𣄩𣄫𣌛𣾢𤁪𤁫𤃑𤃣𤅆𤅓𤅡𤒟𥈗𥊾𥎀𥚴𥜛𥢙𥪙𥸊𥸤𦅐𦅨𦖦𦫤𦹗𦽀𦿽𧂀𧄴𧅙𧆈𧢪𧩬𨂠𨇐𨇪𨔞𨗶𨘀𨘷𨙁𨲙𨵪𩐳𩑌𩑍𩑎𩑏𩑐𩑑𩑒𩑓𩑔𩑕𩑗𩑘𩑚𩑛𩑜𩑝𩑞𩑟𩑠𩑡𩑢𩑣𩑤𩑥𩑧𩑨𩑪𩑬𩑭𩑮𩑯𩑰𩑱𩑲𩑳𩑴𩑵𩑶𩑷𩑸𩑹𩑺𩑻𩑼𩑽𩑾𩒀𩒁𩒂𩒃𩒄𩒅𩒆𩒇𩒈𩒉𩒊𩒋𩒍𩒎𩒏𩒐𩒑𩒒𩒓𩒔𩒕𩒖𩒗𩒘𩒙𩒚𩒛𩒞𩒟𩒡𩒢𩒣𩒥𩒦𩒧𩒨𩒩𩒪𩒬𩒭𩒮𩒯𩒰𩒱𩒲𩒳𩒴𩒵𩒶𩒷𩒸𩒺𩒻𩒼𩒽𩒾𩒿𩓀𩓂𩓃𩓄𩓅𩓆𩓈𩓉𩓊𩓋𩓌𩓍𩓎𩓏𩓐𩓑𩓒𩓓𩓔𩓖𩓗𩓘𩓙𩓚𩓛𩓜𩓝𩓞𩓠𩓡𩓢𩓣𩓤𩓥𩓦𩓧𩓨𩓩𩓪𩓫𩓬𩓭𩓮𩓯𩓰𩓱𩓲𩓳𩓴𩓵𩓶𩓷𩓸𩓹𩓺𩓻𩓼𩓽𩓿𩔀𩔁𩔂𩔃𩔄𩔅𩔆𩔇𩔈𩔉𩔊𩔊𩔋𩔌𩔍𩔎𩔏𩔐𩔑𩔒𩔓𩔔𩔕𩔖𩔗𩔘𩔙𩔚𩔛𩔜𩔝𩔞𩔟𩔠𩔡𩔢𩔣𩔤𩔥𩔦𩔧𩔨𩔩𩔪𩔫𩔬𩔭𩔮𩔯𩔰𩔱𩔲𩔳𩔵𩔸𩔹𩔺𩔻𩔼𩔽𩔿𩕀𩕁𩕂𩕃𩕄𩕅𩕆𩕇𩕈𩕉𩕊𩕋𩕌𩕍𩕎𩕏𩕑𩕓𩕔𩕕𩕖𩕗𩕘𩕙𩕚𩕛𩕜𩕝𩕞𩕟𩕠𩕡𩕢𩕣𩕤𩕥𩕦𩕧𩕧𩕨𩕩𩕪𩕫𩕬𩕭𩕮𩕯𩕰𩕱𩕲𩕳𩕴𩕵𩕶𩕷𩕸𩕹𩕺𩕻𩕼𩕽𩕾𩕿𩖀𩖁𩖂𩖃𩖄𩖅𩖆𩖇𩖈𩖉𩖊𩖋𩖌𩖍𩖎𩖏𩖏𩖏𩖐𩖑𩖓𩖔𪏔𪑸𪕯𪗎𪝽𪴣𫖝𫖞𫖟𫖠𫖡𫖢𫖣𫖤𫖥𫖧𫖨𫖩䪲𩒖頋𫨌𫳜𫴉𬉐𬊪𬤴𬰄𬰿𬱀𬱁𬱂𬱃𬱄𬱅𬱆𬱇𬱈𬱉𬱊𬱋𬱌𬱏𬱐𬱑𬱒𬷢",
 "缶": "匋厒寚珤窑窰缷缸缹缺缻缼缽缾缿罁罂罅罆罇罈罉罋罌罍罎罏罐鬱㓡㯱䀇䍂䍃䍄䍅䍆䍇䍈䍉䍊䍋䍌䍍䍎䓨䔘䘖𠙈𠤸𠪟𠪦𠹓𠼭𡏟𡜊𡧰𡩴𡫿𢈊𢑂𢑄𢔫𢻂𣂶𣙲𣝰𣞈𣞉𣟘𣡡𣡸𣳬𤈒𤈣𤕁𤕆𤪈𤪭𤮫𤮫𤴊𤽦𥒋𥖴𦈣𦈤𦈥𦈦𦈧𦈨𦈩𦈫𦈬𦈭𦈮𦈯𦈰𦈱𦈲𦈳𦈴𦈵𦈶𦈷𦈸𦈹𦈺𦈻𦈼𦈽𦈾𦈿𦉀𦉁𦉂𦉃𦉄𦉅𦉆𦉇𦉈𦉉𦉊𦉌𦉍𦉎𦉏𦉐𦉓𦉔𦉕𦉖𦉗𦉘𦉙𦉚𦉛𦉜𦉝𦉟𦉠𦉢𦉣𦉤𦉥𦉦𦉧𦉨𦉩𦚥𦞼𦦩𦩾𧂚𧃘𧄡𧇍𧊦𧕰𧖚𧗘𧡾𨍳𨑅𨢧𨨳𩄫𩆘𩏴𩒡𩛕𩝒𩝓𩡥𩡦𩢿𩥣𩰪𪔕𪧕𪧥𪧬𪨲𪺛𫄺𫄻𫄼𫄽𫄾𫄿𫒘𬅍𬅔𬒴𬙌𬙍𬙎𬙏𬙐𬙑𬙒𬙓𬙔𬜪𬰸",
 "彡": "修参尨形彣彤彦彨彩彪彫彬彭彮彯彰影彲杉毝穆耏肜虨衫釤钐須頿须颩鬰鬱鬽㐱㣉㣊㣋㣌㣍㣏㣐㣑㣒㣓䀐䑣䚲䫇䫠𠆹𠖝𠘱𠝁𠝦𠩇𠲲𡆱𡈖𡈝𡈪𡌒𡔻𡕜𡖰𡛆𡛪𡡓𡯎𡿽𢀽𢁘𢄮𢌘𢐅𢐅𢒀𢒁𢒂𢒃𢒄𢒆𢒇𢒈𢒉𢒋𢒌𢒍𢒎𢒏𢒐𢒑𢒒𢒓𢒕𢒖𢒗𢒙𢒚𢒛𢒜𢒝𢒞𢒟𢒠𢒢𢒣𢒤𢒦𢒧𢒨𢒩𢒪𢒫𢒬𢒭𢒮𢒯𢒱𢒲𢒳𢒴𢒵𢒶𢒸𢒹𢒺𢒻𢿉𢿬𣁝𣂠𣚤𣥲𣭫𣰘𣲀𣸁𣹊𣼀𤑊𤥍𤥬𤦯𤧎𤹼𥀦𥂵𥉨𥘎𥝞𥟙𥟟𥡆𥡻𥢣𥪻𥭇𥲲𦅨𦓘𦘔𦟬𦤒𦩔𦩦𦳨𦳳𦷇𦻄𧀷𧂓𧂓𧆵𧈎𧊑𧗁𧗃𧡬𧩒𧴭𧻆𨊨𨎗𨐍𨒠𨓼𨔥𨟈𨟌𨡳𨧗𨹲𨽑𩁺𩅙𩇕𩑘𩒧𩓄𩓣𩓭𩓿𩔹𩔻𩖕𩚺𩠷𩣤𩥷𩩼𩬬𩮊𩯢𩯫𩰧𩰪𩲆𪛑𪞋𪥹𪫉𪹎𫖠𫙀𫴑𫵞𫹉𬓽𬥜𬱰𬴬",
 "水": "冰凼呇囦坔埊尿氷氹汆汖汞汬沀沊沓沝沝沯泉泴泵洜浆淨淼淾渁渁湬漐漦漿潁澃濷灓畓盥砅荥銢閖阥頮颍颒㓿㝽㞙㲑㲻㲾㳫㳼㴃㴅㴇㴇㴇㴝㵗㵨㽷䠌𠄄𠊺𠕽𠝃𠝃𠞘𠧶𠪥𠭽𡉺𡍑𡏏𡑙𡙥𡚀𡝘𡬄𡱊𡱴𡲘𡵰𢇤𢑨𢑨𢗨𢗷𢚭𢝥𢞮𢦹𢪼𢫂𢫢𢯣𢯣𣀍𣍒𣍤𣎕𣏶𣐫𣖩𣙉𣛞𣞧𣢭𣢻𣱲𣱳𣱵𣱷𣱸𣱺𣱻𣲂𣲉𣲊𣲍𣲎𣲙𣲛𣲜𣲝𣲦𣲮𣲯𣲰𣲱𣲴𣳂𣳆𣳉𣳕𣳖𣳗𣳛𣳣𣳻𣴀𣴎𣴲𣴳𣴴𣴺𣵂𣵌𣵟𣵯𣵳𣶗𣶚𣶛𣶷𣷖𣷗𣷘𣷘𣷙𣷛𣷜𣷜𣷹𣸐𣸗𣸷𣹅𣹉𣹛𣹬𣹭𣹳𣹳𣹺𣺩𣺪𣺶𣻣𣻣𣻤𣻨𣻯𣼘𣼙𣼟𣼿𣾕𣾙𣾢𤀲𤁞𤂒𤂝𤂞𤂟𤂼𤃄𤃻𤄈𤄳𤆲𤔚𤕯𤖅𤝎𤦗𤱄𤱸𤲴𤾌𥃔𥇫𥙲𥝸𥞾𥤼𥫸𥭼𥯐𥱂𥴠𦂥𦙙𦚝𦧳𦬭𦮭𦲑𦴼𦷸𦿹𧅒𧅒𧎖𧥿𧦋𧩁𧩁𧵾𧺵𧻦𨀰𨂽𨋈𨋉𨑾𨓎𨠆𨠊𨡬𨥗𨪫𨰱𨰱𨰱𨹉𩀢𩂍𩃯𩓊𩖱𩥔𩱰𩹌𩺎𩾼𪍖𪏠𪢿𪧣𪱹𪵨𪵪𪵮𪵼𪶂𪶛𪶰𪷂𪷣𫒎𫞑㱎犀𫰖𬀅𬇔𬇜𬇦𬇻𬈄𬈘𬈛𬈡𬉅𬉞𬉟𬍖𬠤𬱊𬵆",
 "干": "仠刊厈哶奸姧屽幵幵幷幷幹忓扞攼旰旱杆汗犴玕癷皯盰矸秆竿罕肝芉虷衎衦訐讦豻赶軒轩迀邗酐釬閈闬靬頇顸飦馯骭鳱鼾㢨㶣㶥㸩㿻䍐䍑䖫䢴䧲䯎䵟𠃗𠆆𠇨𠈯𠉔𠙻𠣍𠤨𡖏𡝛𡞛𡯋𡱭𡵃𢁗𢆉𢆋𢆎𢆐𢆑𢆔𢆖𢆜𢆝𢆦𢇛𢏘𢏘𢒑𢕆𢡤𢦡𢭅𢹄𢾴𢿂𢿩𣀄𣉻𣊋𣐼𣔏𣗲𣭹𣴔𣾣𤍙𤛙𤞢𤭋𤮩𤮻𤮽𤰟𤰠𤽂𤿊𤿣𥏢𥘏𥤱𥧳𥾍𦍟𦎧𦏹𦤍𦮖𦯗𦲆𧉲𧊩𧐉𧔠𧝾𧦸𧨗𧭫𧰪𧵳𧻧𧿂𨀠𨂛𨔺𨗽𨘞𨣠𨫘𨫚𨫦𨲢𨲣𨸗𨺚𨾰𩈅𩎒𩕸𩩃𩵟𩾝𪈣𪌃𪔆𪗙𪚒𪚟𪚟𪤐𪪁𪪂𪶗𫗞𫘛𫢉𫷔𫷕𫷖𫹯𬏎𬬧𬰱𬴸",
 "冎": "咼𠈥𠕩𠛰𨀩𨒵𫶩𬟬",
 "卄": "尭満𠕁𠦌𠦌𠮅𠰖𡄀𢭾𢯒𢯥𢴝𢿯𣜳𣝘𣞎𣟃𣟫𣤂𣯣𣸨𥈞𥘠𨔴𨗲𩯍𫕕",
 "朩": "亲條茶𠅅𠆅𠊻𠓐𢭒𣗷𤼨𤾏𥔟𥱘𥴌𦬽𫝌𫰩𫿼",
 "业": "並壶彂显業痖繊菐虚邺𡓙𢄁𢈀𢨼𢸻𢹠𣀅𣝢𣞞𣞧𤀾𤃊𤍬𤮆𥗢𥲤𥽲𧐦𧸅𧸕𨖐𨬭𨰛𩆬𩡟𩻅𪒸𪦾𪨂𪩾𫁺𫒣𫞔𫞜𫥺𫩤𫯌𬁝𬅆𬋾𬒆𬬼𬰺",
 "⺷": "𦍡𦍰𦏎𦥈𧌶𧷫",
 "小": "京仦厼夵孙尐少尓尕尖尗尘尛尛尛尜尞歳毜狲覍釥雀齋㕾㫆㭂䒕䚱𠃝𠇡𠋾𠕘𠕚𠗑𠛴𠣧𠣧𠫭𠬆𠬓𠰚𠷼𡆧𡜛𡞼𡦾𡭕𡭗𡭘𡭚𡭜𡭝𡭡𡭤𡭦𡭧𡭨𡭫𡭬𡭯𡭯𡭱𡭻𡮃𡮄𡮅𡮆𡮇𡮈𡮉𡮊𡮋𡮌𡮍𡮐𡮐𡮐𡮐𡮒𡮔𡮖𡮙𡮛𡮜𡮟𡮟𡮡𡮡𡮣𡮤𡮥𡮨𡮩𡮪𡮫𡮬𡮭𡮮𡮰𡮲𡮳𡮷𡮸𡮺𡮽𡮾𡯀𡰔𡱵𡶿𡶿𡷺𡻼𢉔𢊓𢊓𢊻𢏏𢖹𢖿𢙏𢙭𢮥𢮬𢽮𢿔𣆋𣍺𣧢𣭬𣵚𣿻𣿻𤔍𤚂𤚂𤚈𤚜𤛃𤛃𤧉𤯏𤱏𤲎𤶔𤸨𤽔𤿁𤿁𤿁𥃻𥎜𥙄𥟬𥡻𥢣𥵺𥾗𥿜𦄴𦐶𦕗𦙳𦝵𦩇𦮞𦯝𦶵𦷝𦷝𦷻𦷻𦸼𦾁𦾍𧁡𧄈𧈒𧈨𧎾𧢪𧧂𧯈𧱮𧴪𧵁𧵉𧸣𨈓𨈼𨘎𨘩𨚸𨛧𨧛𨫜𨲁𨲄𨳒𨻶𩀙𩚸𩡥𩥵𩰼𩵖𩸛𩾟𪙅𪧿𪨀𪨁𪨂𪨃𪨅𪨤𫇾𫭚𫴸𫴹𫴺𫴼𫴾𫴿𫵀𫵄𫵈𫵋𫵍𬂸𬃅𬖬𬫴𬯍𬯍",
 "丱": "㺦𠇿𢇇𢌕𤆽𨥥𨳹𩢓𫧼",
 "囪": "𠭛𡏙𢍍𢭇𤗄𤴙𥀮𥓁𥫑𦅳𦕻𦹰𩣢",
 "心": "伈吢吣孞寍寜徳忈忌忍忎忐忑志忘応忞忠忢忥忩念忽忿态怂怎怒怘思怠怣怤急怨怱怷怸怹总怼恁恋恏恐恕恖恙恚恣恥恧恩息恳恴恶恷恿悆悉悊悐悘悠悡患悤悥您悪悫悬悲悳悶悹惁惄惉惌惎惑惒惖惡惢惢惢惣惥惩惪想惷惹愁愂愆愈愍意愗愙愚愛感愨愬愳愸愻愿慁慂慇慈態慐慗慙慜慤慦慧慫慭慰慸慹慼慾慿憂憃憄憅憇憊憋憌憑憖憗憙憝憠憥憨憩憲憵憼懃懋懑懕懖懘懟懣懬懯懲懸戀戁戅戆戇抋杺沁甯穏窓聴芯虑訫鈊闷隠㝕㣻㣽㤀㤁㤂㤅㤈㤍㤎㤐㤙㤟㤠㤣㤩㤫㤮㤰㤲㤵㤻㥁㥈㥋㥎㥐㥕㥣㥤㥦㥨㥲㥶㥹㥻㥿㦁㦂㦄㦌㦔㦚㦛㦝㦞㦟㦣㦤䏋䧭䭡𠌤𠍌𠍌𠍴𠎝𠎢𠎰𠎱𠏨𠐃𠐥𠐷𠑓𠓣𠖶𠨝𠪰𠪱𠪾𠲹𠴤𠻫𠼿𠿔𡃨𡈒𡉾𡚿𡡌𡢆𡢳𡣇𡤘𡧫𡨪𡩉𡩋𡩬𡪕𡪥𡫃𡫇𡫇𡫍𡬕𡬛𡹸𢃧𢃭𢈳𢉛𢋤𢓿𢕆𢕞𢖫𢖮𢖰𢖴𢖶𢖻𢖼𢖽𢖿𢗀𢗊𢗍𢗏𢗐𢗓𢗣𢗤𢗥𢗦𢗧𢗨𢗩𢗪𢗫𢗬𢗭𢗮𢗯𢗰𢗰𢗹𢗻𢘁𢘅𢘇𢘋𢘍𢘒𢘓𢘖𢘞𢘟𢘡𢘢𢘣𢘤𢘫𢘯𢘰𢘱𢘲𢘳𢘴𢘵𢘻𢘿𢙁𢙂𢙄𢙅𢙈𢙍𢙎𢙏𢙞𢙟𢙠𢙡𢙤𢙥𢙦𢙭𢙮𢙯𢙰𢙴𢙶𢙷𢙸𢙻𢙽𢚅𢚊𢚏𢚐𢚑𢚒𢚓𢚖𢚞𢚟𢚠𢚡𢚣𢚤𢚥𢚦𢚧𢚨𢚩𢚪𢚫𢚱𢚳𢚸𢚿𢛁𢛂𢛃𢛆𢛇𢛈𢛋𢛌𢛑𢛓𢛖𢛚𢛜𢛝𢛣𢛤𢛦𢛧𢛫𢛬𢛭𢛮𢛱𢛲𢛳𢛶𢜂𢜃𢜄𢜅𢜇𢜈𢜉𢜊𢜋𢜌𢜍𢜎𢜏𢜐𢜑𢜒𢜓𢜔𢜕𢜖𢜛𢜣𢜤𢜦𢜧𢜯𢜷𢜹𢝃𢝅𢝊𢝍𢝏𢝐𢝑𢝔𢝕𢝗𢝝𢝦𢝧𢝨𢝩𢝪𢝫𢝬𢝭𢝮𢝯𢝰𢝱𢝲𢝳𢝴𢝵𢞈𢞉𢞋𢞍𢞒𢞔𢞚𢞢𢞣𢞤𢞥𢞩𢞪𢞫𢞭𢞯𢞱𢞽𢞾𢞿𢟀𢟁𢟂𢟃𢟅𢟆𢟇𢟍𢟛𢟤𢟥𢟪𢟬𢟮𢟲𢟻𢟽𢠀𢠃𢠒𢠔𢠕𢠖𢠘𢠙𢠚𢠛𢠜𢠝𢠬𢠱𢠴𢠸𢠾𢡂𢡆𢡈𢡊𢡑𢡔𢡕𢡘𢡛𢡡𢡢𢡪𢡫𢡬𢡭𢡮𢡯𢡰𢡱𢡲𢡳𢡴𢡶𢡷𢡸𢡹𢡺𢡻𢢉𢢌𢢍𢢎𢢐𢢑𢢠𢢡𢢢𢢤𢢥𢢦𢢧𢢨𢢭𢢱𢢵𢢶𢢷𢢹𢢿𢣁𢣉𢣍𢣑𢣓𢣕𢣖𢣘𢣞𢣠𢣡𢣣𢣥𢣪𢣫𢣫𢣬𢣭𢣮𢣯𢣰𢣱𢣲𢣽𢤀𢤁𢤂𢤅𢤉𢤊𢤌𢤍𢤐𢤑𢤒𢤔𢤖𢤘𢤙𢤤𢤧𢤲𢤵𢤶𢤷𢤹𢤿𢥁𢥍𢥗𢥛𢥤𢥦𢥧𢥨𢥩𢥫𢥮𢥰𢥲𢥹𢥺𢥽𢥿𢦀𢦁𢦆𢦇𢦊𢧯𢰌𢱶𢲀𢵃𢷝𣅵𣖯𣚅𣜚𣠣𣼰𣿜𤃉𤆸𤐾𤗉𤜁𤣇𤥼𤧚𤨌𤨫𤩙𤫈𤵂𤷞𤷹𤸽𤹏𤹛𤹧𤹸𤻮𥌐𥌷𥍷𥎒𥘚𥠡𥡷𥥁𥥬𥦗𥦾𥧁𥧛𥨭𥨭𥫑𥫒𥮨𥯱𥲅𥲡𥳺𥴳𥵴𥷌𥹀𥿂𦁇𦁔𦁞𦁞𦅋𦘛𦘜𦘝𦘡𦙦𦛂𦜙𦝰𦮤𦯌𦯡𦯹𦯽𦰸𦲜𦴜𦵃𦵇𦷋𦷚𦷢𦹎𦽳𦾂𧀱𧁊𧂡𧂺𧃅𧄄𧆒𧆹𧏽𧐟𧒧𧕝𧗺𧛤𧝮𧞰𧢅𧤶𧧴𧩇𧩟𧩪𧫎𧮗𧺨𧾔𨂴𨆸𨊘𨊳𨌪𨍉𨏀𨔇𨗫𨠉𨡮𨣭𨨟𨬂𨴮𨴽𨶡𨼆𨼶𩂈𩆝𩈂𩉒𩣭𩨂𩭤𩮀𩮪𩵽𩼰𩼲𩾽𪇔𪐊𪫠𪫥𪫩𪫫𪫰𪫱𪫳𪫴𪫵𪫷𪫼𪫽𪫾𪬂𪬄𪬅𪬆𪬈𪬊𪬋𪬍𪬐𪬒𪬓𪬛𪬟𪬥𪬩𪬯𪬴𪬵𪬿𪭀𪭁𪭂𪭅𪶚𪹄𪻒𪽷𫍆𫐜𫗆寧忍穏縂𫲽𫳬𫳾𫴔𫴭𫵝𫵯𫹭𫹯𫹰𫹱𫹲𫹳𫹵𫹸𫹹𫹻𫹾𫹿𫺁𫺄𫺅𫺇𫺉𫺋𫺍𫺐𫺑𫺔𫺕𫺖𫺗𫺚𫺛𫺜𫺞𫺠𫺡𫺩𫺮𫺯𫺲𫺵𫺷𫺸𫻆𫻇𫻍𫻎𫻒𫻓𫻕𫻙𫻚𫻛𫻝𫻢𫻥𫻪𬅟𬈞𬌓𬌔𬐘𬔰𬙃𬚲𬜫𬯴𬲡",
 "士": "仕吉壬壮壯声壱売壳壵壵壵壶壸壹壼壿夁志悫槖毂毐蠧賣㐊㚃㚄㨌㱿㲄𠎬𠙽𠚓𠭐𡁲𡄜𡆮𡋩𡐉𡐎𡐬𡑚𡒩𡓹𡔛𡔜𡔡𡔣𡔩𡔪𡔫𡔬𡔮𡔰𡔱𡔴𡔵𡔶𡔸𡔹𡔺𡔽𡕀𡕁𡕂𡕃𡕄𡕅𡕈𡕋𡕌𡕍𡕎𡡵𢀃𢅍𢆇𢇽𢉈𢔽𢢢𢣞𢤶𢧣𢮇𢷌𢽓𣌐𣓷𣖫𣙲𣚯𣝔𣝝𣣿𣤟𣤷𣤺𣤼𣨑𣩉𣪎𣪒𣪗𣪛𣪝𣪨𣪬𣪸𣫀𣫃𣫅𣫇𣫈𣫗𣮾𤂁𤃕𤌫𤔊𤘄𤙸𤜕𤞯𤞯𤨻𤴞𤴶𤶄𥇵𥑄𥑟𥒃𥢉𥢙𥢮𥣢𥵠𥵽𦁱𦄨𦇍𦚫𦤼𦸎𦾫𧀶𧎅𧏌𧓜𧞒𧞹𧞺𧟅𧳾𧶠𧷗𧺑𨍔𨏡𨜤𨡝𨧭𨮾𨱶𨱺𩎲𩏮𩏻𩛏𩥟𪃟𪆑𪇂𪐢𪤳𪯆𫟱売穀𫣸𫮉𫯃𫯄𫯄𫸑𬅭𬆭𬆯𬐂𬚯𬤵",
 "𠃜": "声眉賔𠆄𠬩𠬮𡙝𢮾𣅩𤵷𥖶𦤋𦻉𧓍𩈝𬚳",
 "夂": "修倏倐偹傻儍儵処务各处夅夆备夈変夋夌复夎夏夑夒夓惫愛憂条條汷畟竷糭絛繌翛虄贛赣錽鎫鑁麦㚅㚆㚇㣊㫦㯶㶖䒘䕫䖺𠀸𠅨𠈍𠈦𠈬𠊒𠎕𠐃𠕸𠛴𠣸𠤀𠤇𠧔𠧧𠧫𠧾𠧾𠨅𠬄𠭽𠮇𠮇𠲊𠳰𠷳𠷶𠾰𠿬𡇫𡒩𡔀𡕔𡕕𡕗𡕘𡕙𡕚𡕛𡕜𡕝𡕰𡕺𡙋𡙥𡪂𡳉𡳌𡳐𢁙𢃹𢆆𢊿𢌂𢌉𢓴𢓿𢔃𢕒𢕛𢕦𢕶𢖛𢖻𢙴𢚔𢜤𢞣𢠧𢢍𢥨𢧇𢩸𢭌𢳗𢴼𢶦𢷛𢹎𢽮𣅈𣍶𣍽𣓂𣙺𣞡𣟮𣥷𣭫𣭬𣶧𣶳𣹶𤄘𤋬𤌈𤒐𤔿𤕘𤖍𤖚𤖚𤗌𤙳𤛵𤟺𤢘𤦰𤧯𤪉𤫘𤰅𤲋𤶔𤸍𤹫𥃏𥅹𥇠𥋂𥎈𥎉𥓃𥞼𥠢𥡑𥡽𥢓𥢦𥦹𥺢𥿸𦃡𦔕𦛧𦜂𦜄𦜒𦟣𦤁𦤶𦯩𦱟𦲯𦴅𦼡𧃜𧃰𧆵𧊮𧍸𧐛𧐲𧛓𧜰𧩅𧫝𧬝𨁣𨌖𨎙𨏵𨐂𨐹𨓧𨔁𨔫𨕟𨕦𨕷𨖤𨗬𨙅𨠱𨨳𨩻𨫙𨲐𨲿𨸻𨹓𨹠𨺓𨺚𨺛𨺼𨻎𨻦𨻪𨾏𩀱𩂫𩂫𩃃𩅆𩌎𩌽𩍫𩍳𩎋𩎷𩏄𩏉𩏦𩐬𩑅𩜗𩜧𩦲𩯣𩱛𩵉𩵊𩺽𩼵𪄑𪈋𪕦𪗑𪗒𪗓𪢶𪤵𪪜𪺙偺冬夆𣽞㶖瓊䕫𫫫𫯋𫯎",
 "几": "亢亮仉冗凡凢凣凥処凭凯凱凳凴匓叽咒夙媺宂巬斻朵机殳沿玑矶秃竌籶肌芁虮讥釠飢髠鳧鳯麂㒌㔯㞦㫟㲹䘛䛇䡄䢳𠀣𠅞𠅟𠅪𠅫𠅭𠅽𠇳𠇵𠈽𠉘𠋕𠌝𠌩𠘩𠘬𠘬𠘭𠘮𠘰𠘶𠘺𠘽𠘿𠙀𠙁𠙂𠙃𠙅𠙆𠙇𠙉𠙋𠙍𠙎𠙏𠙑𠙓𠙖𠙙𠙛𠙝𠙞𠙟𠙠𠙡𠙢𠙣𠙤𠙥𠙧𠙨𠙪𠙫𠙯𠙲𠙲𠙳𠣈𠦕𠨦𠫞𠫮𠰾𠳶𠶉𡏷𡕼𡕿𡖀𡖢𡚫𡠸𡮖𡯂𡱂𡱓𡱲𡲞𡲵𡵂𢀇𢀐𢀫𢁒𢂨𢂨𢅃𢅘𢆻𢈐𢎪𢕧𢖯𢗟𢝕𢩫𢪁𢮲𢰑𢲿𢴜𢼸𢽆𢽘𣑽𣣰𣦽𣪍𣪍𣬠𣰓𣰜𣱻𣲻𣵆𣵸𣹋𣼠𣽳𣾮𤈋𤓅𤕄𤗕𤘷𤘷𤙍𤜝𤤲𤫘𤬳𤬽𤴪𤵎𤹈𤺝𤻢𥃯𥖈𥖬𥘌𥟺𥤤𥨼𥩕𥬑𥬶𥳨𥾊𦄓𦈄𦈄𦈩𦏂𦒲𦔘𦕓𦙉𦡑𦡻𦭀𦳓𦵌𦹟𦺺𦻯𦿅𧃰𧆡𧉨𧗬𧘊𧙮𧟣𧢛𧢛𧢛𧦔𧦬𧶹𧺋𧾾𧿊𧿦𨀭𨆱𨈨𨋑𨍻𨏝𨏵𨒁𨒁𨒆𨚂𨡳𨥡𨥲𨩹𨭊𨮡𨱙𨳋𨸔𨼘𨼘𨽱𨽱𩉜𩉳𩊸𩍋𩍫𩑏𩚺𩜆𩜧𩩬𩪔𩪔𩬛𩲧𩵸𪊋𪎑𪑍𪑍𪗗𪞲𪞳𪞴𪣈𪥪𪥪𪴉𫇔𫚯嬈㨮䛇𫥟𫥡𫥢𫵳𫽱𬓠𬔸𬚷𬦴𬫼",
 "糹": "糺糼糽糾糿紀紁紂紃約紅紆紇紈紉紋紌納紎紏紐紑紒紓純紕紖紗紘紙級紛紜紝紞紟紡紣紤紦紨紩紪紬紭細紱紲紳紴紵紶紷紸紹紺紻紼紽紾紿絀絁終絃組絅絆絇絈絉絊絋経絍絎絏結絑絒絓絔絖絗絘絙絚絝絞絟絠絡絢絣絤絥給絧絨絩絪絬絯絰統絲絴絵絶絸絹絺絻絼絽絾絿綀綁綂綃綄綆綇綈綉綊綋綌綍綎綏綐綑綒經綕綖綗綘継続綛綜綝綞綟綠綡綢綣綥綧綨綩綪綫綬維綯綰綱網綳綴綵綶綷綸綹綺綻綼綽綾綿緀緁緂緄緅緆緇緈緉緋緌緍緎総緑緒緓緔緕緖緗緘緙線緛緝緞緟締緡緢緣緤緥緦緧編緩緪緫緬緭緮緯緰緱緲練緵緶緷緸緹緺緻緼緽緾緿縀縁縂縃縅縆縇縉縊縋縌縍縎縐縑縒縓縔縕縖縗縘縙縚縛縜縝縞縟縡縤縥縦縧縨縩縪縫縬縭縮縯縰縱縲縳縴縵縷縸縹縺縼總績縿繀繂繃繅繆繈繉繊繌繍繎繏繐繑繒繓織繕繖繗繘繙繜繝繞繟繡繢繣繥繦繧繨繩繪繬繯繰繲繳繵繶繷繸繹繺繻繼繽繾繿纀纁纃纄纅纆纈纉纊纋續纎纏纐纑纒纓纔纕纖纗纘纙纚纜纝纞轡轡鷥㔢䊵䊶䊷䊸䊹䊺䊻䊼䊽䊾䊿䋁䋂䋃䋄䋅䋆䋇䋉䋊䋋䋌䋍䋎䋏䋐䋑䋒䋔䋖䋗䋘䋙䋚䋛䋝䋞䋟䋠䋡䋥䋦䋧䋨䋩䋪䋫䋬䋭䋮䋱䋲䋳䋴䋵䋶䋸䋹䋺䋻䋼䋽䋾䋿䌀䌁䌂䌃䌄䌅䌆䌇䌈䌉䌊䌋䌌䌍䌏䌐䌑䌒䌔䌕䌖䌗䌙䌚䌜䌝䌞䌟䌡䌢䌣䌤䌦䌧䌨䌩䌪䌫䌬䌭䌮䌯䌰䌱䌲䌳䌴䌵䜌䜌𠕮𠴄𡁰𡹱𢥩𢥩𢽺𣚓𣣜𦀁𦀃𦀄𦀅𦀆𦀈𦀉𦀊𦀋𦀍𦀎𦀏𦀐𦀑𦀓𦀔𦀕𦀖𦀗𦀘𦀙𦀛𦀜𦀝𦀞𦀠𦀡𦀦𦀨𦀩𦀪𦀫𦀬𦀭𦀮𦀯𦀰𦀲𦀳𦀵𦀶𦀹𦀺𦀻𦀼𦀽𦀾𦀿𦁀𦁁𦁂𦁃𦁄𦁅𦁆𦁇𦁉𦁊𦁌𦁎𦁏𦁐𦁒𦁔𦁕𦁖𦁗𦁙𦁚𦁛𦁜𦁟𦁡𦁢𦁣𦁥𦁧𦁩𦁪𦁭𦁮𦁯𦁰𦁱𦁲𦁳𦁴𦁶𦁸𦁺𦁻𦁼𦁽𦁿𦂀𦂁𦂂𦂃𦂄𦂅𦂆𦂇𦂈𦂉𦂊𦂋𦂍𦂏𦂑𦂒𦂓𦂔𦂕𦂖𦂘𦂙𦂚𦂛𦂜𦂝𦂠𦂡𦂢𦂣𦂤𦂥𦂦𦂧𦂨𦂩𦂪𦂫𦂬𦂭𦂮𦂰𦂱𦂲𦂴𦂵𦂶𦂷𦂺𦂻𦂼𦂽𦂾𦂿𦃀𦃁𦃈𦃉𦃊𦃋𦃌𦃍𦃎𦃏𦃒𦃓𦃔𦃕𦃖𦃘𦃛𦃝𦃞𦃠𦃡𦃣𦃥𦃧𦃨𦃩𦃪𦃫𦃬𦃮𦃯𦃰𦃱𦃳𦃴𦃵𦃶𦃷𦃸𦃹𦃺𦃻𦃼𦃽𦃾𦃿𦄀𦄁𦄂𦄃𦄄𦄅𦄆𦄇𦄈𦄋𦄍𦄎𦄏𦄑𦄓𦄖𦄗𦄘𦄙𦄚𦄛𦄜𦄝𦄞𦄡𦄢𦄣𦄤𦄥𦄦𦄧𦄨𦄩𦄪𦄬𦄮𦄰𦄱𦄲𦄴𦄵𦄶𦄷𦄹𦄼𦄽𦄾𦄿𦅀𦅁𦅂𦅃𦅄𦅅𦅆𦅇𦅈𦅉𦅊𦅋𦅌𦅍𦅎𦅏𦅑𦅒𦅗𦅘𦅛𦅜𦅞𦅟𦅡𦅣𦅥𦅦𦅧𦅩𦅭𦅮𦅯𦅰𦅱𦅲𦅳𦅴𦅵𦅶𦅷𦅺𦅼𦅿𦆀𦆂𦆄𦆅𦆆𦆇𦆈𦆉𦆊𦆋𦆌𦆍𦆏𦆐𦆑𦆒𦆘𦆙𦆚𦆛𦆞𦆟𦆠𦆡𦆢𦆣𦆥𦆦𦆧𦆨𦆪𦆬𦆭𦆮𦆯𦆱𦆲𦆳𦆴𦆵𦆶𦆷𦆸𦆹𦆼𦆿𦇀𦇁𦇃𦇄𦇅𦇇𦇈𦇉𦇊𦇋𦇌𦇍𦇎𦇏𦇐𦇑𦇒𦇓𦇔𦇕𦇖𦇗𦇘𦇙𦇛𦇜𦇝𦇟𦇡𦇢𦇣𦇤𦇧𦇪𦇫𦇬𦇭𦇮𦇰𦇱𦇲𦇳𦇴𦇶𦇸𦇹𦇼𦇽𦇾𦇿𦈂𦈃𦈄𦈅𦈆𦋟𦌅𦍆𦸖𦸷𧂩𧌢𩹾𫃱𬀕𬗃𬗄𬗅𬗆𬗇𬗈𬗉𬗊𬗌𬗏𬗑𬗒𬗓𬗔𬗕𬗗𬗘𬗙𬗚𬗛𬗜𬗝𬗟𬗠𬗡𬗢𬗣𬗤𬗥𬗦𬗨𬗩𬗭𬗮𬗯𬗰𬗲𬗳𬗴𬗵𬗷𬗹𬗺𬗼𬘀𬘂𬘃𬘃𬘄𬘄𬘆𬘊𬘋𬘌𬘍𬘍𬘎𬘏𬘐𬘑𬯢",
 "言": "信唁圁夑娮寣悥燮爕狺獄琂訂訃訄訅訆訇計訉訊訋訌訍討訏訐訑訒訓訔訕訖託記訙訚訛訜訝訞訟訠訡訢訣訤訥訦訧訨訩訪訫訬設訮訯訰許訲訳訴訵訶訷訸訹診註証訽訾訿詀詁詂詃詄詅詆詇詉詊詋詌詍詎詏詐詑詒詓詔評詖詗詘詙詚詛詜詝詞詟詠詡詢詣詤詥試詨詩詪詫詬詭詮詯詰話該詳詴詵詶詷詸詺詻詼詽詾詿誀誁誂誃誄誅誆誇誈誉誋誌認誎誏誐誑誒誓誔誕誖誗誘誙誚誜誝語誟誠誡誢誣誤誥誦誧誨誩誩說誫説読誮誯誰誱課誳誴誵誶誷誸誹誺誻誼誽誾調諀諁諂諃諄諅諆談諈諉諊請諌諍諎諏諐諑諒諓諔諕論諗諘諙諚諛諜諝諞諟諠諡諢諣諤諥諦諧諨諩諪諫諬諭諮諯諰諱諲諳諴諵諶諷諸諹諺諻諼諽諾諿謀謁謂謃謅謆謇謈謉謊謋謌謎謏謐謑謒謓謔謕謖謗謘謙謚講謜謝謞謟謡謢謣謤謥謧謨謩謪謫謬謭謮謯謰謱謲謳謴謵謶謷謸謹謺謻謼謽謾謿譀譁譂譃譄譆譇譈證譊譋譌譎譏譐譑譒譓譔譕譖譗識譙譚譛譜譝譞譟譠譡譢譣譤譥警譧譨譩譪譫譬譭譮譯議譲譳譴譵譶譶譶護譸譹譺譻譽譾譿讀讁讂讃讄讅讆讇讈讉讋讌讍讎讏讐讑讒讓讔讕讖讗讘讙讚讛讜讝讞讟辯這邎霅㑾㝘㢇㨱㯎䂴䇾䌛䓂䚮䚯䚰䚱䚲䚳䚴䚵䚶䚷䚸䚹䚺䚼䚽䚾䚿䛀䛁䛂䛃䛄䛅䛆䛇䛈䛉䛊䛋䛌䛍䛎䛏䛐䛑䛒䛔䛖䛗䛘䛙䛚䛛䛜䛝䛞䛟䛠䛡䛢䛣䛤䛥䛦䛧䛨䛩䛪䛫䛬䛭䛮䛯䛰䛱䛲䛳䛴䛵䛶䛷䛸䛹䛺䛻䛽䛾䛿䜀䜁䜂䜄䜅䜆䜇䜈䜉䜊䜋䜌䜎䜏䜐䜑䜒䜓䜔䜕䜖䜗䜚䜛䜜䜝䜞䜟䜠䜡䜢䢣䩧䴦𠌜𠏘𠏜𠐜𠐨𠑏𠙳𠟑𠟸𠣂𠥇𠥵𠪗𠻫𠽹𠾓𠾘𡃛𡅜𡈸𡢮𡣌𡣹𡥪𡽜𢉲𢐬𢐵𢑈𢑉𢖅𢖊𢚘𢝯𢥥𣀢𣁎𣁧𣃎𣌚𣚞𣜆𣞇𣞇𣠡𣤍𣨌𣫏𣵧𤀃𤄧𤉘𤍉𤓊𤜊𤜋𤢰𤫙𤮶𤯆𤶘𥋮𥋯𥍏𥕔𥨉𥸔𦆶𦋬𦌽𦌽𦎍𦏯𦢃𦫁𦸻𦽤𦿫𧄎𧗳𧞴𧠂𧠻𧥝𧥞𧥟𧥠𧥡𧥢𧥣𧥤𧥥𧥦𧥧𧥩𧥪𧥬𧥭𧥮𧥯𧥰𧥱𧥲𧥳𧥴𧥵𧥶𧥷𧥸𧥹𧥺𧥻𧥼𧥽𧥾𧥿𧦀𧦁𧦃𧦄𧦅𧦆𧦈𧦉𧦊𧦋𧦌𧦍𧦎𧦐𧦑𧦒𧦓𧦔𧦕𧦖𧦗𧦘𧦙𧦚𧦛𧦜𧦝𧦞𧦟𧦠𧦡𧦢𧦣𧦤𧦥𧦦𧦧𧦨𧦩𧦪𧦫𧦬𧦯𧦰𧦱𧦲𧦳𧦴𧦵𧦶𧦷𧦸𧦹𧦺𧦻𧦼𧦽𧦾𧦿𧧀𧧁𧧂𧧃𧧄𧧅𧧆𧧇𧧈𧧉𧧊𧧋𧧌𧧍𧧎𧧏𧧐𧧑𧧒𧧓𧧔𧧕𧧖𧧗𧧘𧧙𧧜𧧝𧧞𧧟𧧡𧧢𧧣𧧤𧧥𧧦𧧧𧧨𧧩𧧪𧧫𧧬𧧮𧧯𧧰𧧱𧧲𧧳𧧴𧧵𧧶𧧷𧧸𧧹𧧺𧧻𧧼𧧽𧧾𧧿𧨀𧨂𧨃𧨄𧨅𧨆𧨇𧨈𧨉𧨊𧨋𧨌𧨍𧨏𧨐𧨑𧨓𧨔𧨕𧨗𧨘𧨙𧨚𧨛𧨜𧨞𧨟𧨟𧨠𧨡𧨢𧨤𧨥𧨦𧨧𧨨𧨩𧨪𧨬𧨭𧨮𧨯𧨰𧨱𧨲𧨳𧨴𧨵𧨶𧨷𧨸𧨹𧨻𧨼𧨽𧨿𧩀𧩁𧩂𧩄𧩅𧩆𧩇𧩈𧩉𧩊𧩋𧩌𧩍𧩎𧩏𧩐𧩑𧩒𧩓𧩔𧩕𧩖𧩗𧩙𧩚𧩛𧩜𧩝𧩞𧩟𧩠𧩡𧩢𧩤𧩥𧩦𧩧𧩨𧩪𧩫𧩬𧩯𧩰𧩱𧩲𧩳𧩴𧩵𧩵𧩶𧩷𧩸𧩹𧩺𧩻𧩼𧩽𧩿𧪁𧪂𧪃𧪃𧪄𧪅𧪆𧪇𧪈𧪉𧪊𧪋𧪌𧪍𧪎𧪏𧪐𧪑𧪒𧪓𧪔𧪕𧪖𧪗𧪘𧪙𧪚𧪛𧪜𧪝𧪞𧪟𧪠𧪡𧪢𧪣𧪤𧪥𧪧𧪨𧪩𧪪𧪫𧪬𧪭𧪮𧪯𧪰𧪱𧪲𧪳𧪴𧪵𧪶𧪷𧪸𧪹𧪻𧪼𧪽𧪾𧪿𧫀𧫁𧫂𧫃𧫄𧫅𧫆𧫇𧫈𧫉𧫊𧫋𧫌𧫍𧫎𧫏𧫐𧫑𧫒𧫓𧫕𧫖𧫗𧫘𧫘𧫙𧫚𧫛𧫜𧫝𧫟𧫠𧫢𧫣𧫤𧫥𧫧𧫨𧫩𧫪𧫫𧫬𧫭𧫮𧫯𧫰𧫱𧫲𧫳𧫴𧫵𧫶𧫷𧫸𧫺𧫻𧫼𧫽𧫾𧫿𧬀𧬁𧬂𧬃𧬄𧬅𧬆𧬇𧬈𧬉𧬊𧬋𧬌𧬍𧬎𧬏𧬐𧬑𧬒𧬓𧬔𧬕𧬖𧬗𧬘𧬙𧬚𧬛𧬜𧬝𧬞𧬟𧬠𧬡𧬢𧬣𧬤𧬥𧬧𧬨𧬩𧬪𧬫𧬬𧬭𧬯𧬰𧬱𧬲𧬴𧬶𧬷𧬸𧬸𧬹𧬺𧬻𧬼𧬽𧬾𧬾𧬿𧭀𧭁𧭂𧭄𧭅𧭆𧭇𧭈𧭉𧭊𧭋𧭌𧭎𧭏𧭐𧭑𧭒𧭓𧭔𧭕𧭖𧭗𧭘𧭙𧭚𧭛𧭛𧭛𧭜𧭝𧭞𧭟𧭠𧭢𧭣𧭤𧭥𧭦𧭧𧭨𧭩𧭪𧭫𧭬𧭭𧭮𧭯𧭲𧭳𧭴𧭵𧭶𧭷𧭸𧭹𧭺𧭻𧭼𧭽𧭾𧭿𧭿𧮀𧮀𧮁𧮂𧮃𧮄𧮅𧮆𧮇𧮈𧮉𧮊𧮊𧮋𧮍𧮎𧮏𧮐𧮑𧮒𧮓𧮔𧮕𧮖𧮗𧮗𧮗𧮘𧮚𧮛𧮜𧮝𧮞𧮟𧮟𧮟𧮠𧮡𧮢𧮣𧮣𧮤𧮥𧮦𧮦𧮦𧮦𧮨𧮩𧸸𨇾𨊏𨐫𨕺𨖈𨘔𨘔𨙎𨡄𨦼𨧕𨰸𨷴𨷸𩐶𩕵𩕸𩧟𪘎𪘙𪥢𪺞𫀎𫂰𫆾𫌲𫌳𫌴𫌵𫌶𫌷𫌸𫌹𫌺𫌻𫌼𫌽𫌾𫌿𫍀𫍁𫍂𫍃𫍄𫍅𫍆𫍇𫍈𫍉𫍊𫍋𫍌𫍎𫍏𫍐𫍑𫍒𫍓𫍔𫍖𫍗𫍘𫑟𫟝𫭷𬀍𬀜𬍊𬚝𬜇𬢚𬢛𬢜𬢝𬢞𬢟𬢠𬢡𬢢𬢣𬢤𬢥𬢦𬢧𬢨𬢩𬢪𬢫𬢬𬢭𬢮𬢯𬢰𬢱𬢲𬢳𬢴𬢵𬢶𬢷𬢸𬢹𬢺𬢻𬢼𬢽𬢾𬢿𬣀𬣁𬣂𬣃𬣄𬣅𬣆𬣇𬣈𬣉𬣊𬣋𬣍𬣏𬣐𬣑𬣒𬣓𬣔𬣕𬣖𬣗𬣘𬩋𬯂",
 "自": "咱息憩洎瘪癟臫臬臭臯臰臱詯辠邉郋鼻㑑㞒㿜䫁𠩮𠹡𡇝𡏣𡏻𡕻𡜍𡫛𡲽𡻆𡻇𡼗𡿚𡿟𢍂𢙆𢠾𣀐𣊅𣊆𣊊𣑉𣓛𣘶𣝼𣯝𣳻𣽍𣽎𣾄𤂼𤅡𤌼𤒝𤝼𤠩𤯣𥌗𥏆𥒕𥡋𥡐𥤍𥵸𥸅𥻢𥽃𦟞𦣺𦣾𦣿𦤀𦤁𦤂𦤃𦤄𦤅𦤆𦤇𦤈𦤉𦤊𦤋𦤍𦤎𦤏𦤑𦤒𦤔𦤗𦤘𦤛𦤜𦤝𦤤𦤥𦤩𦤫𦤭𦤲𦧗𦪄𦺆𧃍𧃰𧑉𧓝𧓧𧚗𧠆𧫍𧭮𧯔𧾫𨈻𨘢𨙢𨝺𨞶𨪽𨻬𩥧𩳈𩵉𪈪𪊰𪕿𪥴𫀡𫅱𫇊𫇋𫊡翺䕫鼻𫤀𫹀𫹂𬛬𬛮𬛰𬣰",
 "穴": "屄岤帘攨柼梥泬狖矈穵究穷穸穹空穻穼穽穾穿窀突窂窃窄窅窆窇窈窉窊窋窌窍窎窏窐窑窒窓窔窕窖窘窙窚窛窜窝窞窟窠窡窢窣窤窥窦窧窨窩窪窫窬窭窮窯窰窱窲窳窵窶窷窸窺窻窼窽窾窿竀竁竃竄竅竆竇竈竉竊臱茓袕貁邃邉鴥鴪㧒㴱䆑䆓䆔䆕䆖䆗䆘䆙䆚䆛䆜䆝䆞䆟䆠䆡䆢䆣䆤䆥䆦䆧䆨䆩䆫䆬䆭䆮䆯䆰䆱䆲䆳䆴䆵䆶䆷䆸䆹䆺䆻䆼䆽䆾䆿䇀䇁䋉䛎䢇䴳𠊢𠏨𠤦𠱇𠳽𠾘𠾮𠾯𠿡𡔍𡞛𡞶𡡨𡡪𡢌𡢠𡢷𡪮𢥼𢭔𢰉𢱇𢱑𢲁𢲘𢳤𢳦𢹑𣔛𣖉𣡐𣵆𣷁𣷆𣽸𣾊𣾋𣿵𤄘𤞮𤣛𤧪𤮤𥄴𥊉𥋜𥌂𥑫𥕅𥤍𥤣𥤤𥤥𥤦𥤧𥤨𥤪𥤮𥤯𥤰𥤱𥤲𥤳𥤵𥤶𥤷𥤸𥤹𥤺𥤻𥤼𥤽𥤾𥥀𥥁𥥂𥥃𥥄𥥅𥥆𥥈𥥉𥥊𥥌𥥍𥥎𥥐𥥑𥥔𥥕𥥖𥥗𥥘𥥙𥥛𥥜𥥝𥥞𥥟𥥠𥥡𥥣𥥤𥥥𥥦𥥩𥥪𥥫𥥬𥥯𥥰𥥱𥥳𥥴𥥵𥥶𥥷𥥸𥥺𥥻𥥽𥥾𥥿𥦀𥦁𥦂𥦄𥦅𥦆𥦈𥦉𥦊𥦋𥦌𥦍𥦎𥦏𥦒𥦓𥦔𥦕𥦖𥦗𥦘𥦙𥦛𥦜𥦝𥦞𥦟𥦠𥦡𥦢𥦤𥦥𥦦𥦧𥦨𥦩𥦫𥦬𥦭𥦮𥦰𥦱𥦲𥦳𥦴𥦵𥦷𥦸𥦹𥦻𥦼𥦽𥦾𥦿𥧁𥧂𥧃𥧆𥧇𥧉𥧊𥧋𥧌𥧍𥧎𥧏𥧐𥧑𥧒𥧓𥧔𥧕𥧗𥧘𥧙𥧚𥧛𥧜𥧝𥧞𥧟𥧠𥧡𥧢𥧣𥧤𥧥𥧦𥧧𥧨𥧪𥧫𥧬𥧭𥧮𥧯𥧰𥧱𥧲𥧳𥧴𥧵𥧶𥧷𥧸𥧹𥧺𥧻𥧼𥧽𥧾𥧿𥨀𥨂𥨃𥨄𥨅𥨆𥨇𥨈𥨉𥨊𥨋𥨌𥨍𥨎𥨐𥨑𥨒𥨓𥨔𥨕𥨖𥨗𥨘𥨙𥨚𥨛𥨝𥨞𥨟𥨠𥨡𥨡𥨢𥨣𥨤𥨥𥨦𥨧𥨨𥨩𥨪𥨫𥨭𥨮𥨯𥨰𥨱𥨲𥨳𥨴𥨵𥨷𥨸𥨹𥨺𥨻𥨼𥨽𥨾𥨿𥩀𥩁𥩂𥩃𥩄𥩅𥩆𥩇𥩉𥩊𥩋𥩍𥩎𥩏𥩐𥩑𥩒𥩓𥩔𥲡𥶧𥸅𦇭𦖓𦙮𦤝𦥨𦨆𦪥𦳾𦴯𦶞𦺌𦼑𧅉𧅓𧉢𧉴𧏏𧑲𧦱𧨠𧩰𧭇𧭮𧸎𧸨𧾠𧾫𨅻𨆭𨎣𨗉𨘢𨢧𨣭𨨁𨩵𨰆𨳅𨼈𩕤𩕥𩕰𩟒𩮇𩯠𪕏𪚨𪦛𪧗𪧼𪩶𪶷𪼍𫁊𫁋𫁌𫁍𫁏𫁐𫁑𫁒𫁓𫁕𫁖𫁗𫁘𫁙𫁚𫁝𫆒𫇍𫙕𫛙𫛣𫲄𬔅𬔆𬔇𬔈𬔉𬔊𬔍𬔎𬔏𬔐𬔑𬔒𬔓𬜀𬱲",
 "𠮛": "兽司畐睘㣲𠀷𠁏𠁐𡅝𡈧𡠾𡲻𢅃𢾵𣌐𣥔𣪪𤀅𥲔𦓠𦞶𦟧𧵀𪒈𫋊𬌑",
 "勹": "勺勻勼勽勾匀匁匂匃匄包匇匈匉匊匋匌匍匎匐匑匒匓匔句旬灳甸訇㔨㔩㔪㫄䀏䭇𠇢𠍝𠚠𠚠𠣌𠣍𠣎𠣏𠣐𠣑𠣒𠣓𠣕𠣖𠣗𠣘𠣙𠣚𠣜𠣞𠣠𠣡𠣢𠣤𠣥𠣧𠣧𠣭𠣮𠣰𠣱𠣲𠣸𠣹𠤂𠤄𠤇𠤈𠤊𠤋𠤍𠲾𡉍𡉳𡋜𡎧𡎾𡏍𡒧𡕴𡗛𡘱𡙳𡚂𡛐𡝓𡧂𡯔𡷃𡷄𢕛𢟡𢣍𢩶𢪣𢪤𢰄𢱬𢱳𣁼𣏯𣐗𣑈𣖑𣖣𣡴𣣯𣲢𣶢𣺥𣺥𤈤𤊝𤌝𤌝𤏹𤗒𤗩𤚂𤛃𤛃𤛟𤢠𤦳𤫝𤰈𤿘𥂿𥅬𥊄𥐷𥓯𥚬𥠖𥧗𥨲𥩅𥪃𥬜𥬿𥰬𥲾𥵱𥼓𥾉𦁯𦁯𦃫𦉶𦋅𦋴𦍿𦛳𦛴𦜶𦣓𦪤𦮍𦮱𦱘𦵳𦷝𦷝𦹣𦿯𦿺𦿼𧃄𧅹𧍀𧥻𧦛𧦷𨉫𨎆𨎆𨔪𨚄𨡒𨸤𨹋𨹐𨺃𩋺𩍁𩍔𩍸𩏕𩛀𩜩𩟉𩤍𩨪𩷸𩼥𩽘𪆍𪈅𪈣𪈵𪗣𪭦𫇬𫖉𫗑𫙃勺包杓𥐝𫧀𫧁𫧄𫧅𫧆𬜠𬝥𬢛𬲵𬳀",
 "灬": "勲喣杰槱炁炰点烈烋烝热烹焄焎焏焘焣焦煎煞煦照煭煮熈熊熙熟熬熱熹燕燞燾爢缹罴羔麃黒黙㢘㶨㶵㶻㷊㷦㷶㸐𠆐𠆠𠍪𠏽𠔥𠠆𡇫𡇺𡑹𡕀𡖋𡚔𡤁𡪍𢅱𢇁𢉍𢉐𢺱𣜃𣽙𣾤𤄼𤆋𤆐𤆒𤇟𤇠𤇴𤈔𤈕𤈖𤉏𤉥𤉩𤊝𤊯𤋁𤋃𤋇𤋮𤋯𤋰𤋱𤌈𤌉𤌊𤌔𤍁𤍂𤍍𤎂𤎉𤎗𤎘𤎝𤎦𤎰𤎴𤏹𤏺𤐅𤐳𤑄𤑅𤑊𤑌𤑩𤑪𤒕𤒜𤒭𤓏𤓐𤓑𤓚𤓜𤓥𤓬𤺣𥄧𥈈𥎢𥕃𥜏𥡤𥡱𥢦𥣹𥣺𥤚𥤛𥤠𥧳𥨽𥶬𥼙𥼞𦏬𦖹𦜯𦟙𦱷𦱻𦷓𦼈𧀙𧃤𧆸𧑳𧗊𧤲𨇇𨏘𨘜𨚋𨫨𨬤𨭟𨯨𨰔𨼾𩃯𩇞𩎂𩎷𩏦𩏸𩜡𩡢𩪪𩯥𪔁𪚰𪳝𪷌𪸇𪸓𪸣𪸦𪸿𪹉𪹐𪹕𪹦𪹩𪹭𪹮𪹱𪹸𪹿𪺋𫄽𫉧𫊌庶𣾎𬉵𬉻𬊏𬊘𬊙𬊚𬊞𬊧𬊫𬊲𬊹𬊾𬋈𬋎𬋐𬋒𬋕𬟚𬟤",
 "生": "夝姓嬎嬔徃性旌星曐栍殅泩狌珄甠甡甡産甤甥甦眚笙胜苼貹鉎鮏鼪㔟㣸㶋㽒㽓㽔㽮䲼䴤𠇷𠡏𠤵𠰮𠷶𠻖𠻿𡊳𡢎𡲥𢘡𣍺𣢡𣬺𤇓𤇣𤬸𤯔𤯕𤯖𤯗𤯘𤯙𤯚𤯛𤯜𤯝𤯞𤯟𤯠𤯡𤯢𤯣𤯤𤯥𤯨𤯩𤯪𤯫𤯭𤯯𤯱𤯲𤯳𤯴𤯵𤯶𤯷𤯸𤯹𤯺𤯻𤯼𤯽𤯾𤯿𤰁𤰂𤵙𤷬𥑥𥑦𥒑𥔴𥕙𥠍𥣉𥯁𥰁𥴑𦎡𦠫𦷃𦿮𧻊𨚥𨠠𨯏𨯏𨯏𨺓𨼇𨼜𩇛𩐸𩢫𩫍𩲵𩻏𪊟𪌜𪍖𪒦𪡚𪯉𪴬𪽁𪽂𪽃𪽄𪽅𫕹𫦽𫽬𬈤𬎳𬎴𬎵𬎶𬎷𬎸𬎹𬎺𬎼𬸆",
 "廿": "卋嬊庹庻枽炗燕鷰㢜㵮㷼𠀠𠂺𠃟𠃼𠏏𠏽𠔏𠔝𠖉𠙨𠙯𠢀𠪛𡅤𡆐𡆒𡎸𡏳𡒣𡕛𡘲𡘲𡳴𡳼𢅿𢅿𢉙𢋓𢌋𢌋𢍌𢏼𢚈𢱳𢺌𢺌𣁒𣂷𣇪𣋅𣏼𣙃𣚨𣚨𣢓𣲟𣷞𣼛𤁉𤅼𤈲𤉻𤑆𤨰𤨸𤪣𤫝𤻠𥎚𥏴𥪽𥾰𦁜𦜪𦧤𦫒𦬵𦹒𦻵𧐚𧡙𧢚𧤈𧩜𧪷𧫽𧭩𧮃𧺧𧿰𨂏𨑬𨔋𨖓𨘦𨞋𨪬𨬪𨭯𨻜𨽝𨽬𨽬𩁚𩁢𩁣𩁤𩁪𩁬𩁳𩋞𩑪𩥕𩩥𩴴𩸏𪩙𪹒𫖆𫜱𫟒𬝼𬫮𬸧",
 "早": "卓章草㔬㣏𠏉𠐱𠦝𡂽𡴐𢫵𣁌𣃕𣑬𤞋𥏅𥏯𥗅𥲺𥴃𥷦𦒋𧂽𨚰𨟜𨴝𪞂𪫉𪭛𪸣𫂍𫅃𫘷𫣁𫩭𬀵𬁄𬈪𬢼",
 "虫": "浊烛独痋茧萤虄虬虭虮虯虰虱虲虳虴虵虶虷虸虹虺虻虼虽虾虿蚁蚂蚃蚄蚅蚆蚇蚈蚉蚊蚋蚌蚍蚎蚏蚐蚑蚒蚓蚔蚕蚖蚗蚘蚙蚚蚛蚜蚝蚞蚟蚠蚡蚢蚣蚤蚥蚦蚧蚨蚩蚪蚫蚬蚭蚮蚯蚰蚱蚲蚳蚴蚵蚶蚷蚸蚹蚺蚻蚼蚽蚾蚿蛀蛁蛂蛃蛄蛅蛆蛇蛈蛉蛊蛋蛌蛎蛏蛐蛑蛒蛓蛔蛕蛖蛗蛘蛙蛚蛛蛜蛝蛞蛟蛠蛡蛢蛣蛤蛥蛦蛧蛨蛩蛪蛫蛬蛭蛮蛯蛰蛱蛲蛴蛵蛶蛷蛸蛹蛺蛻蛼蛽蛾蛿蜂蜃蜄蜅蜆蜇蜈蜉蜊蜋蜌蜍蜎蜏蜐蜑蜒蜓蜔蜕蜖蜗蜘蜙蜚蜛蜜蜝蜞蜟蜠蜡蜢蜣蜤蜥蜦蜧蜨蜩蜪蜫蜬蜭蜮蜯蜰蜱蜲蜳蜴蜵蜶蜷蜸蜹蜺蜻蜼蜽蜾蜿蝀蝁蝂蝃蝄蝅蝆蝇蝈蝉蝊蝌蝍蝎蝏蝐蝑蝒蝓蝔蝖蝗蝘蝙蝚蝛蝜蝝蝞蝟蝠蝡蝢蝣蝤蝥蝦蝧蝩蝪蝫蝬蝭蝮蝯蝰蝲蝳蝴蝵蝶蝷蝸蝹蝺蝻蝼蝽螀螁螂螃螄螅螆螇螈螉螊螋螌融螎螏螐螑螒螓螔螕螖螗螘螚螛螜螝螞螟螠螥螦螧螨螩螪螫螬螭螮螯螰螱螲螳螴螵螷螸螹螺螻螼螾螿蟀蟂蟃蟄蟅蟆蟇蟈蟉蟋蟌蟍蟎蟏蟐蟑蟒蟓蟔蟕蟖蟗蟘蟙蟚蟛蟜蟝蟞蟠蟡蟢蟣蟤蟥蟦蟧蟨蟩蟪蟫蟬蟭蟮蟯蟰蟱蟲蟳蟴蟵蟶蟷蟹蟺蟻蟼蟽蟾蠀蠁蠂蠃蠄蠅蠆蠇蠈蠉蠊蠋蠌蠍蠎蠏蠐蠑蠒蠓蠔蠕蠖蠗蠘蠙蠛蠜蠝蠞蠟蠣蠥蠦蠨蠩蠪蠬蠮蠰蠳蠴蠵蠷蠸蠻蠼蠾触赨鉵閩闽㰩䂈䖝䖞䖟䖠䖡䖢䖣䖤䖥䖦䖧䖨䖩䖪䖫䖬䖭䖮䖯䖰䖱䖲䖳䖴䖵䖵䖶䖷䖸䖹䖺䖻䖼䖽䖿䗀䗁䗂䗃䗄䗅䗆䗇䗈䗉䗊䗋䗌䗍䗎䗏䗐䗑䗒䗓䗔䗕䗖䗗䗘䗙䗚䗛䗜䗝䗞䗞䗟䗠䗡䗢䗣䗣䗤䗥䗦䗧䗨䗩䗪䗫䗬䗭䗮䗯䗰䗱䗲䗳䗴䗶䗷䗸䗹䗺䗺䗻䗼䗽䗿䘀䘀䘁䘂䘃䘄䘄䘅䘅䘆䘈䘊䘋䘌䘌䘍䘍䘎䳋䶚𠋞𠍋𠑴𠑴𠖧𠖪𠘦𠘦𠘦𠙍𠙬𠛿𠣜𠪿𠮕𠮕𠽟𡅀𡌺𡐉𡒹𡘗𡟏𡩓𡬛𡬛𡯥𢋙𢋜𢌆𢌆𢐩𢐵𢔼𢕉𢖄𢘷𢣞𢨜𢨜𢨡𢨡𢨣𢨣𢫼𢳨𢳰𢸪𢸪𣀺𣆣𣑺𣜡𣭦𣶨𣸚𣼈𤄁𤙕𤠘𤠢𤠧𤡴𤣝𤧠𤧤𤨚𤬤𤬤𤴂𤴂𤹊𤻠𤼜𤼜𤼭𥎔𥭥𥮸𥰱𥳎𥴵𥶨𦆥𦇼𦚭𦜱𦢅𦪶𦫆𦫆𦳶𦴍𦵈𦸞𦹌𦾖𦿸𧃀𧅪𧅪𧈝𧈞𧈟𧈠𧈡𧈢𧈣𧈤𧈥𧈦𧈧𧈨𧈩𧈪𧈫𧈬𧈭𧈯𧈰𧈱𧈴𧈵𧈶𧈷𧈸𧈹𧈺𧈻𧈼𧈽𧈾𧈿𧉀𧉁𧉂𧉃𧉄𧉅𧉈𧉉𧉊𧉋𧉌𧉍𧉐𧉑𧉒𧉓𧉔𧉕𧉖𧉗𧉘𧉙𧉚𧉛𧉜𧉝𧉞𧉟𧉠𧉡𧉢𧉣𧉤𧉦𧉧𧉨𧉩𧉪𧉫𧉬𧉭𧉮𧉯𧉰𧉱𧉲𧉳𧉴𧉵𧉶𧉷𧉸𧉹𧉺𧉻𧉼𧉿𧊀𧊁𧊂𧊃𧊄𧊅𧊆𧊇𧊈𧊉𧊊𧊋𧊌𧊍𧊎𧊏𧊐𧊑𧊒𧊓𧊔𧊕𧊖𧊗𧊘𧊙𧊚𧊛𧊜𧊝𧊞𧊟𧊠𧊡𧊢𧊣𧊤𧊥𧊦𧊧𧊩𧊪𧊫𧊬𧊭𧊮𧊯𧊰𧊱𧊳𧊴𧊵𧊶𧊷𧊸𧊺𧊼𧊽𧊾𧊿𧋀𧋁𧋂𧋃𧋄𧋅𧋆𧋇𧋈𧋉𧋊𧋋𧋌𧋍𧋎𧋏𧋐𧋑𧋒𧋓𧋔𧋕𧋖𧋗𧋘𧋙𧋛𧋜𧋜𧋝𧋞𧋟𧋠𧋡𧋢𧋣𧋤𧋥𧋦𧋧𧋨𧋩𧋪𧋫𧋬𧋭𧋮𧋯𧋰𧋱𧋲𧋳𧋴𧋵𧋶𧋷𧋸𧋹𧋺𧋻𧋼𧋽𧋾𧋿𧌀𧌁𧌂𧌃𧌄𧌅𧌇𧌉𧌊𧌋𧌌𧌍𧌎𧌏𧌐𧌑𧌒𧌓𧌔𧌕𧌖𧌗𧌘𧌙𧌚𧌛𧌜𧌞𧌟𧌠𧌡𧌢𧌣𧌣𧌤𧌥𧌦𧌦𧌧𧌩𧌪𧌫𧌬𧌭𧌮𧌯𧌰𧌱𧌲𧌳𧌴𧌵𧌶𧌷𧌸𧌹𧌺𧌻𧌼𧌽𧌾𧌾𧌿𧍀𧍀𧍁𧍂𧍃𧍄𧍅𧍆𧍇𧍊𧍋𧍌𧍍𧍎𧍏𧍐𧍑𧍒𧍓𧍔𧍕𧍖𧍗𧍘𧍙𧍚𧍛𧍜𧍝𧍞𧍟𧍠𧍡𧍢𧍣𧍤𧍥𧍧𧍨𧍩𧍪𧍫𧍬𧍭𧍮𧍯𧍱𧍲𧍳𧍴𧍵𧍶𧍷𧍸𧍸𧍹𧍺𧍻𧍼𧍽𧍾𧍿𧎀𧎁𧎂𧎄𧎅𧎅𧎆𧎆𧎇𧎈𧎉𧎊𧎋𧎍𧎎𧎏𧎐𧎓𧎓𧎔𧎖𧎗𧎘𧎙𧎚𧎛𧎜𧎞𧎟𧎠𧎡𧎢𧎣𧎤𧎥𧎦𧎧𧎨𧎩𧎪𧎪𧎬𧎭𧎮𧎮𧎯𧎰𧎱𧎱𧎲𧎳𧎴𧎵𧎷𧎸𧎹𧎺𧎻𧎽𧎾𧎿𧏀𧏁𧏂𧏃𧏅𧏆𧏇𧏈𧏉𧏊𧏌𧏍𧏎𧏏𧏐𧏑𧏓𧏔𧏕𧏖𧏗𧏘𧏙𧏚𧏛𧏜𧏝𧏠𧏡𧏢𧏣𧏤𧏥𧏦𧏧𧏨𧏩𧏪𧏬𧏬𧏭𧏮𧏯𧏰𧏱𧏲𧏳𧏴𧏵𧏶𧏷𧏼𧏼𧏽𧏿𧐁𧐂𧐃𧐄𧐅𧐆𧐇𧐈𧐉𧐊𧐋𧐌𧐍𧐎𧐏𧐏𧐐𧐑𧐒𧐓𧐔𧐕𧐖𧐗𧐙𧐚𧐛𧐜𧐝𧐞𧐟𧐠𧐡𧐢𧐣𧐤𧐥𧐦𧐧𧐧𧐩𧐪𧐫𧐫𧐬𧐭𧐮𧐯𧐱𧐲𧐳𧐴𧐵𧐶𧐷𧐸𧐹𧐺𧐻𧐼𧐽𧐾𧐿𧑀𧑁𧑂𧑃𧑄𧑅𧑆𧑇𧑈𧑉𧑉𧑊𧑋𧑌𧑎𧑏𧑐𧑑𧑒𧑓𧑔𧑕𧑖𧑖𧑗𧑘𧑙𧑚𧑛𧑜𧑝𧑞𧑞𧑟𧑠𧑡𧑢𧑢𧑣𧑤𧑤𧑥𧑦𧑧𧑨𧑨𧑩𧑪𧑫𧑬𧑭𧑮𧑯𧑰𧑱𧑲𧑳𧑵𧑶𧑹𧑺𧑻𧑼𧑽𧑾𧑿𧒀𧒁𧒂𧒂𧒃𧒃𧒄𧒅𧒆𧒇𧒈𧒈𧒉𧒊𧒋𧒌𧒍𧒎𧒎𧒏𧒏𧒐𧒑𧒒𧒒𧒓𧒔𧒔𧒖𧒗𧒘𧒙𧒙𧒛𧒛𧒜𧒝𧒝𧒞𧒟𧒟𧒠𧒡𧒡𧒣𧒤𧒤𧒥𧒦𧒧𧒧𧒨𧒩𧒪𧒫𧒬𧒭𧒮𧒯𧒰𧒱𧒲𧒳𧒴𧒶𧒷𧒹𧒺𧒻𧒽𧒾𧒿𧓀𧓁𧓂𧓂𧓃𧓄𧓅𧓆𧓈𧓉𧓊𧓊𧓋𧓌𧓍𧓎𧓎𧓏𧓐𧓑𧓑𧓒𧓓𧓔𧓕𧓕𧓖𧓖𧓗𧓘𧓙𧓚𧓚𧓛𧓜𧓝𧓞𧓟𧓟𧓠𧓡𧓢𧓢𧓣𧓤𧓤𧓥𧓦𧓧𧓨𧓨𧓨𧓩𧓪𧓫𧓫𧓬𧓮𧓯𧓰𧓱𧓱𧓲𧓳𧓴𧓵𧓵𧓶𧓷𧓸𧓹𧓹𧓺𧓻𧓼𧓽𧓾𧓿𧓿𧔁𧔁𧔂𧔂𧔄𧔄𧔆𧔆𧔇𧔈𧔉𧔊𧔋𧔌𧔍𧔎𧔏𧔐𧔐𧔑𧔑𧔒𧔓𧔔𧔔𧔔𧔕𧔖𧔘𧔙𧔚𧔛𧔜𧔝𧔞𧔞𧔟𧔠𧔡𧔡𧔢𧔣𧔤𧔥𧔦𧔧𧔧𧔩𧔩𧔪𧔫𧔬𧔭𧔭𧔮𧔮𧔯𧔯𧔯𧔰𧔰𧔱𧔲𧔲𧔳𧔳𧔵𧔵𧔶𧔷𧔸𧔹𧔺𧔽𧔾𧔿𧕀𧕁𧕂𧕃𧕄𧕅𧕆𧕇𧕈𧕈𧕉𧕊𧕋𧕌𧕌𧕍𧕎𧕎𧕏𧕐𧕐𧕓𧕔𧕔𧕕𧕕𧕖𧕗𧕘𧕙𧕙𧕚𧕛𧕛𧕜𧕜𧕝𧕝𧕞𧕟𧕠𧕠𧕡𧕢𧕢𧕣𧕣𧕤𧕥𧕦𧕦𧕧𧕧𧕨𧕩𧕪𧕫𧕬𧕭𧕮𧕯𧕰𧕰𧕱𧕱𧕲𧕲𧕳𧕴𧕵𧕵𧕶𧕶𧕸𧕺𧕻𧕼𧕾𧕾𧖀𧖀𧖃𧖄𧖄𧖅𧖅𧖆𧖇𧖉𧖉𧖊𧖊𧖋𧖌𧖌𧖍𧖎𧖎𧖎𧖏𧖏𧖐𧖑𧖑𧖒𧖖𧖗𧖘𧖙𧖚𧖚𧖜𧖝𧖞𧖠𧖡𧖡𧖢𧖢𧖣𧖤𧖤𧖥𧖦𧙽𧟐𧟚𧲟𧲟𧳃𧳻𨑉𨒷𨔢𨜗𨞷𨣰𨨸𨩪𨪊𨰙𨵕𨶣𨷌𨹁𨹤𨻦𨽳𨽳𩃪𩃾𩄁𩈂𩗝𩙐𩭃𩮚𩶥𩸈𩹑𩼞𩽱𪄰𪅵𪔖𪕕𪘅𪬹𪿛𫉴𫊤𫊥𫊦𫊧𫊨𫊩𫊪𫊬𫊭𫊮𫊯𫊰𫊱𫊳𫊴𫊵𫊶𫊷𫊸𫊹𫊺𫊻𫊼𫊽𫊾𫊿𫋀𫋁𫋂𫋃𫋄𫋅𫋆𫋇𫋈𫋉𫋊𫋋𫋌𫋍𫋎𫋏𫋐𫋑𫋓𫋔𫋕𫋖𫋗𫋘𫋙𫋚𫋛𫋜𫋝𫋞𫋟𫋠𫋡𫋢𫋣𫋤𫋥𫋦𫋧𫋨𫏪𫙵蜎蝹蜨蝫螆䗗𫢀𫩮𫪻𫫱𬗌𬝋𬟴𬟵𬟶𬟷𬟸𬟹𬟺𬟻𬟼𬟽𬟾𬟿𬠀𬠁𬠂𬠃𬠄𬠅𬠆𬠇𬠈𬠉𬠊𬠋𬠌𬠍𬠎𬠏𬠐𬠑𬠒𬠓𬠔𬠕𬠖𬠗𬠘𬠙𬠚𬠜𬠝𬠞𬠟𬠠𬠡𬠢𬠣𬠥𬠦𬠧𬠨𬠩𬠪𬠫𬠬𬠭𬠮𬠯𬠰𬠲𬠳𬠴𬠵𬠻𬴥𬴥",
 "𠃌": "司幻成㔖𠀭𠂏𠃀𠈀𡌞𡧥𡱊𡳚𡴮𢀕𢆱𣷋𤆙𤆛𤔁𤩉𥸥𦥕𦷹𧥝𧥟𨔎𨜃𨺀𩢆𩥨𪻟𫨧𫩞𫹸𫹹𬔠",
 "呈": "侱徎悜戜挰桯浧珵睈程脭裎逞郢酲鋥锃鞓䄇䇸𠩥𠴔𡝚𢌥𢧄𢧜𢨅𢻡𤶲𥰈𥺆𦸴𦹒𦹠𧋸𧶔𧹓𧽮𨁎𨫓𨭯𨮯𩥳𩧀𩷣𪓪𫄺𫆅𫢃𬊒𬴦",
 "丅": "䮥𠁈𠿎𡡽𡢓𡴶𢡍𢫶𣄅𣠌𤗕𤡎𤴫𥫀𥴋𦦝𦦞𦦡𦦧𦻋𧒘𧓣𧔽𧬭𨥩𨺊𨺐𨼛𩦣𩰬𩱀𫝂誠𫢿𫤧𫧹𫳇𫳥𫴡𬴘",
 "耳": "佴刵取咠咡弭恥挕摂斊栮洱珥眲耷耸聂聋聓聞聟聱聳聶聻聾茸衈誀鉺铒闻颞餌駬髶㛅㺦䇯䋙䌺䎲䎳䎴䎵䎶䎷䎸䎹䎺䎻䎼䎽䎾䎿䏀䏁䏂䏃䏄䏅䏆䏇䏈䏊䏪䣵𠐪𠦰𠪬𠺊𠺵𠻎𡠸𡦍𡱡𢕃𢕈𢙘𢟛𢡐𢩇𢱕𢲦𢵑𢾸𣀌𣀯𣧹𣭞𣼾𤋕𤛄𤣈𤧬𤭿𤳾𥋉𥕁𥙟𥚅𥚶𥜁𥡒𥥯𥧺𥨬𥨳𥪻𥭙𥰚𥴋𥷵𥹢𥻯𦃎𦔮𦔯𦔱𦔲𦔳𦔵𦔶𦔷𦔸𦔹𦔺𦔻𦔼𦔾𦔿𦕀𦕂𦕃𦕄𦕅𦕆𦕇𦕈𦕉𦕋𦕌𦕍𦕎𦕏𦕐𦕒𦕓𦕔𦕕𦕗𦕘𦕙𦕚𦕛𦕜𦕝𦕞𦕟𦕠𦕡𦕢𦕣𦕤𦕥𦕦𦕧𦕨𦕩𦕪𦕫𦕬𦕭𦕮𦕯𦕰𦕱𦕲𦕳𦕴𦕵𦕶𦕷𦕸𦕹𦕻𦕼𦕽𦕾𦕿𦖀𦖁𦖂𦖃𦖄𦖅𦖆𦖇𦖈𦖉𦖊𦖋𦖌𦖍𦖎𦖏𦖐𦖑𦖒𦖓𦖔𦖕𦖖𦖗𦖘𦖙𦖚𦖛𦖜𦖝𦖞𦖟𦖠𦖡𦖢𦖣𦖤𦖥𦖦𦖧𦖨𦖩𦖫𦖬𦖭𦖯𦖱𦖲𦖳𦖴𦖵𦖶𦖷𦖹𦖺𦖻𦖾𦖿𦗀𦗁𦗂𦗃𦗄𦗅𦗆𦗇𦗉𦗊𦗋𦗌𦗍𦗎𦗏𦗒𦗓𦗔𦗕𦗖𦗗𦗚𦗜𦗝𦗞𦗠𦗡𦗢𦗣𦗤𦗥𦗦𦗧𦗨𦗩𦗫𦗬𦗭𦗮𦗯𦗰𦗱𦗳𦗴𦗵𦗷𦗸𦗹𦗺𦗻𦗼𦗽𦗾𦗿𦘀𦘃𦘄𦘅𦘆𦘇𦘈𦘉𦘊𦘋𦘌𦘍𦘎𦘏𦘐𦘑𦶈𦶪𦻙𦻙𦻡𧂺𧃿𧊗𧎎𧙫𧝯𧠄𨌀𨏄𨘽𨞟𨠧𨭵𨺿𨻕𩊐𩱓𩲽𪕔𪣌𪣿𪵎𪸥𫆀𫆁𫆂𫆃𫆄𫆅𫆆𫆇𫆈𫆉𫆋𫆌𫆍𫆎𫆏𫆐𫆑𫆒𫆓𫉠𫉻𫔾𫟉𫴟𫾬𬃁𬄻𬋀𬌯𬚒𬚓𬚔𬚕𬚖𬚗𬚘𬚙𬚚𬚛𬚜𬚝𬚟𬚠𬚡𬚢𬚤𬚥𬚦𬚧𬚨𬦮𬴿𬸽",
 "臣": "卧嚚姫宦弫挋朢栕烥熈盬臤臥臧茞蔵贒頣頥㯺㰓㰖㷩㻨㽉䆠䋗䑐䑑䛗䜿䝂䢻䥮𠄱𠈄𠏫𠑳𠑳𠘑𠙉𠡗𠱸𠽺𠿦𡂨𡇖𡈑𡏃𡏐𡓶𡚛𡟮𡣵𡦋𡬴𢒝𢙞𢧿𢱯𢼧𣂜𣠅𣦪𣻟𤂟𤃼𤇸𤋮𤍥𤎹𤏁𤖋𤖔𤩉𤭘𤱥𥂠𥂭𥃉𥃡𥊇𥪡𥪨𥷷𥼿𥽐𦄤𦚠𦣟𦣡𦣢𦣣𦣥𦣦𦣦𦣧𦣨𦣪𦣫𦣬𦣭𦣮𦣯𦣰𦣱𦣲𦣳𦣵𦣶𦣷𦦶𦪱𦯱𦱽𦽕𧇬𧊺𧌟𧏆𧡼𧧰𧷙𧷢𧷤𨢒𨦍𨰶𩠝𩠞𪤀𪧂𪴼𫇅𫇆𫇆𫇇𫇈𫎠𫎡𫱃𫺮𬐱𬛤𬛥",
 "凶": "兇匈忷悩汹脳訩讻酗㐫㕳㚃㚇𠂳𠙭𠵶𠷛𡉰𡏸𡒐𡔼𡕂𡕃𢗮𢙦𢚰𢝿𢽌𣌇𣌇𣍶𣞡𣧑𣳸𣶧𤈤𤵅𥅢𥜾𥟛𥾜𦙄𦙞𦻤𦻤𧘮𧧣𧿖𨥍𨧓𨪡𩴭𫤧𫥦𬤼𬥑𬯭",
 "天": "关吞吴奣昊沗癸祆蚕蝅蝅蠺蠺迗鴌龑㗺㤁㵄䀖䗞䘉䚶䨿䪞䵡𠉀𠍴𠍴𠔬𠕹𠙗𠤨𠤪𠳒𡂲𡍞𡐥𡗘𡗣𡘸𡙎𡙎𡙎𡙝𡚈𡚌𡚌𡚌𡚌𡚑𡛌𡟡𡫃𡷪𢉶𢓍𢡊𢡊𢡰𢯉𢶍𢻨𣓁𣓁𣜂𣢸𣪨𣸸𣾒𤂀𤉫𤋡𤓻𤘠𤙬𤤇𤰳𥎜𥰉𦁔𦊊𦔿𦙖𦠿𦬞𦴐𦻅𦼩𧉂𧋞𧞁𧧤𧬩𨳨𨷆𩂉𪈪𪊂𪊂𪓳𪟩𪡲𪤵𪥉𪥙𪦛𪯶𪶍𫓊𫢋𫭛𫯝𫯨𫯩𫯬𫯸𬑾𬚷𬝢𬞂𬮜𬵲",
 "力": "仂伤劜功加务劢劣劤劥劦劦劦劧动助努劫劬劭劮劯劰励劲劶劸効劺劻劼劽劾势勀勁勂勃勄勅勇勈勉勊勋勌勍勎勏勐勑勒勓勔動勖勘勚勛募勠勡勢勣勤勥勦勧勩勪勫勬勭勮勯勱勳勴勵勶勷勸历另叻夯屴幼忇扐攰朂朸氻玏男穷竻笾糼肋艻虏觔赲辦边釛阞飭饬鳨㔓㔕㔗㔘㔙㔚㔛㔜㔝㔞㔟㔠㔢㔣㔤㔥㔦㔧㔹㘞㘦㘯㫑㱝㽖䇟䏮䡃䣦䯇䳵𠆮𠋀𠍢𠘿𠠲𠠳𠠴𠠴𠠵𠠶𠠹𠠺𠠻𠠼𠠾𠠿𠡂𠡃𠡄𠡆𠡇𠡈𠡉𠡊𠡋𠡌𠡍𠡎𠡏𠡑𠡒𠡓𠡔𠡕𠡖𠡗𠡘𠡙𠡚𠡛𠡜𠡝𠡟𠡠𠡢𠡣𠡤𠡥𠡧𠡨𠡩𠡪𠡫𠡬𠡭𠡮𠡯𠡰𠡱𠡲𠡳𠡴𠡵𠡶𠡸𠡹𠡺𠡻𠡼𠡽𠡾𠡿𠢀𠢁𠢃𠢅𠢆𠢇𠢉𠢊𠢋𠢍𠢑𠢒𠢓𠢔𠢕𠢖𠢗𠢘𠢙𠢚𠢛𠢜𠢝𠢠𠢡𠢤𠢥𠢨𠢩𠢪𠢬𠢭𠢯𠢱𠢳𠢴𠢵𠢶𠢸𠢻𠢼𠢽𠢾𠢿𠣀𠣂𠣃𠣄𠣆𠣈𠣊𠣋𠦚𠦚𠫜𡉂𡎼𡖎𡫘𡫾𡯄𡴽𡺕𢆲𢑕𢑕𢖰𢙻𢛱𢣛𢫉𢽅𣂒𣃐𣌄𣓲𣡒𣢳𣣜𣦺𣪤𣱗𣶭𣷃𣾗𤇎𤈸𤉏𤋰𤍂𤏊𤖍𤙼𤜜𤟋𤧓𤨍𤨍𤯜𤯜𤰛𤺼𤼶𥅇𥇟𥘋𥭄𦂪𦔳𦕴𦘓𦞋𦟭𦬋𦯴𦻵𧖩𧲡𧴥𧴧𧷖𧼦𧾼𨃒𨔤𨕙𨭯𨲬𨺳𩖙𩚝𩛵𩡒𩢊𩢊𩢟𩫸𩮁𩮺𩱹𩵓𩾜𪆟𪆵𪋾𪏼𪑤𪟘𪟙𪟚𪟛𪟜𪟝𪟟𪟠𪟢𪟣𪟥𪥺𪧔𪭊𪵶𫃙𫏟𫐪𫜋𫝓㔕勇勉𫦤𫦦𫦧𫦨𫦩𫦪𫦫𫦭𫦮𫦯𫦰𫦱𫦲𫦳𫦴𫦷𫦸𫦺𫦼𫦾𫻧𬂿𬈆𬓯𬜑𬨬𬩇𬩳𬮅",
 "刀": "刃分切刕初刧剓剪剺劈劎叧叨召屶忉旫朷灱糿舠芀虭辧辺釖魛鱽鳭㓛㓜㓞㔃㔎㔑㧅䂶䑒䥹䫸䬢𠅄𠉅𠎇𠎗𠒘𠚥𠚦𠚨𠚪𠚪𠚬𠚮𠚱𠚲𠛞𠛤𠛳𠛺𠛽𠜓𠜞𠜡𠜣𠜥𠜧𠜬𠜭𠜰𠝅𠝋𠝔𠝕𠝖𠝗𠝧𠝧𠝸𠝼𠝽𠞠𠞢𠞪𠞰𠞲𠞻𠞽𠞽𠟀𠟄𠟈𠟹𠟿𠠔𠠢𠥭𠬛𠶪𡅁𡌇𡔛𡘢𡙼𡜆𡰺𡲡𡴻𡶳𢆙𢆙𢖫𢘰𢦓𢦝𢦝𢪅𢭋𢭚𣃗𣐧𣔘𣗣𣥬𣥴𣥴𣬇𣬞𣱕𣱼𤁜𤃄𤃻𤈌𤎘𤔊𤛺𤤊𤤊𤤻𤦆𤭀𤰄𤴬𤿇𥁀𥅫𥅫𥅫𥎫𥎫𥐛𥑱𥒢𥒢𥒢𥘉𥛤𥞮𥞮𥞮𥥬𥾞𥾞𥿚𦋬𦕥𦛵𦦖𦴘𦴘𦴘𦾅𦿶𧌣𧘖𧚶𧡽𧧘𧪔𧪔𧭿𧭿𧰱𧵪𨂹𨂹𨃒𨒀𨒀𨦌𨦝𨫛𨲑𨸓𩉛𩗅𩗅𩗅𩘡𩘡𩘡𩣒𩣒𩣒𩫉𩫉𩲿𩷂𩷂𩷂𩿋𩿋𪐛𪔹𪖱𪘂𪟀𪟂𪟓𪠤𪥂𫀭𫁤免刃切𫢈𫢕𫥰𫥱𫥲𫥴𫥸𫥿𫦋𫦌𫦍𫦑𫦓𫦔𫦘𫸰𫼔𫽬𬀶𬄽𬅷𬇉𬌼𬰼𬰿𬹱",
 "牛": "件吽吿汼牟牢牮牵犁犂犇犎犘犚犛犟犠犨犩犫窂荦觲鈝㙚㭌㷣㸴㸷㸺㹂㹃㹈㹐㹕㽚䋅䒜䭽䵓𠎔𠎔𠎔𠬏𡉯𡕘𡘠𡫡𡵜𢓐𢪧𢵕𣁄𣅫𣒤𣧘𣪬𣬳𣴿𤁁𤁜𤂁𤂤𤂤𤂤𤘔𤘝𤘤𤘧𤘧𤘨𤘩𤘮𤘵𤙄𤙋𤙏𤙖𤙘𤙣𤙲𤙺𤙻𤙼𤚁𤚆𤚉𤚌𤚜𤚲𤚶𤚷𤚸𤚹𤚻𤚻𤚼𤛆𤛈𤛈𤛉𤛎𤛓𤛕𤛕𤛖𤛚𤛚𤛝𤛫𤛭𤛭𤛭𤛭𤛿𤜂𤜔𤜕𤜘𤰼𤵃𤾎𥓧𥓧𥝫𥪑𥮂𥼏𦧋𦺙𧉖𧥸𧲤𨌽𨌾𨌾𨎓𨑴𨘇𨩏𨪨𨯇𨲥𨳯𨸡𩥍𩦄𩲍𩵠𩿓𪌸𪒷𪜼𪶍𪺝𪺩𪺪𪺫𪺬𪺭𪺮𪺯𪺰𪺱𪺲𪺳𪺴𪺵𪺶𪽑𫞢犀𫧘𫰔𬌙𬌚𬌛𬌜𬌝𬌞𬌠𬌡𬌢𬌤𬌥𬌦𬌧𬌨𬓄𬙓𬙮𬧿𬨹𬩶",
 "𠄞": "",
 "古": "估克呄咕嘏固姑居岵怘怙故枯沽狜瓳祜秙罟胡苦蛄詁诂跍軲轱辜酤鈷钴骷鮕鴣鸪㑸㕆㕝㖛㝒㱠㼋㽽䀇䀦䂋䇢䊀䎁䑩䧸𠃹𠖠𠡉𠤳𠥟𠧈𠧉𠧑𠪔𠭖𠯛𠰛𠲩𠳫𠳬𠳬𠵊𠶮𠷞𠸗𠸙𠾄𡄝𡄝𡅕𡅕𡅮𡅾𡇣𡊜𡝜𡣿𡪻𡱨𡲞𡳰𡿵𢏆𢝨𢢤𢤶𢦮𢩍𢪿𢫈𢽤𢽿𣖥𣗺𣚩𣚷𣧮𣪇𣫊𣭎𣳂𣳖𤈸𤒒𤖲𤚦𤿛𤿞𥂤𥂩𥑮𥙯𥚁𥚟𥚽𥢟𥥖𥩪𥺨𥿍𦊖𦊙𦊟𦍬𦙶𦣷𦣷𦣷𦦬𦦶𦧒𦹯𦹵𧆻𧇉𧇡𧍾𧙖𧮜𧮴𧵎𧵑𧷶𨈰𨐒𨑂𨑂𨑂𨜋𩇵𩊉𩌤𩑶𩓃𩛶𩢪𩬩𩰯𩱍𩱒𩲱𩿵𪉶𪏻𪒸𪔐𪞎𪞟𪟴𪠬𪡜𪡻𪻕𫎡𫐢𫔜𫗡𫧡𫨒𫪔𫪹𫬯𫯤𬀇𬀬𬚋𬦉",
 "龷": "昔𠀖𠀗𠄫𠍳𠝚𠵢𠶬𡄝𡇾𡔦𡨏𡱗𢈐𢉱𢐶𢛻𢞧𢱴𣊝𣊥𤈉𤍞𤎫𤰍𤰑𤰻𤲐𤼇𥆈𥍅𥍅𥩓𥮌𦐫𦶹𧒝𧡔𧴹𧶚𧶩𧷻𧿱𨅈𨅢𨇇𨏘𨔘𨕃𨤜𨽴𩦘𪄐𪒌𫖉𫞐庶𫩋𫴰𬍀𬏋𬢼𬪕",
 "龴": "令圅甬𠋾𠚔𠝌𠢁𠻙𡇶𡗪𡣔𡲋𡴔𢂭𢄜𢉔𢏀𢕠𢬟𣁩𣎼𣐱𤔍𤔔𤔺𤦱𤧱𤱡𤼫𥁪𥡰𦀩𦚲𦞞𦮡𧄋𧾇𨐄𨐲𨓥𨿊𩄙𩔞勇𫭄𫸭𬍩",
 "亾": "匃㒺㤀𠕈𡚶𡢔𡧬𡿬𢗅𢻲𣌣𣍢𣴭𤠛𤰵𥎇𥒴𥞙𥠸𥭷𥿪𦁒𦋟𦏶𦙐𦬆𦯌𧍑𧠬𧧴𨑟𨝥𨦵𩢯𩣈𩥒𩦻𬐗",
 "上": "仧仩卡尗忐让㑅㫔㫖䒙𠀝𠂦𠆳𠈔𠑷𠛯𠜔𠡹𠤒𠦀𠦋𠧔𠧕𠧗𠧛𠭮𠮘𠮳𠮵𠯡𠱚𠳒𡂲𡒥𡗶𡘂𡚋𢆒𢓺𢧍𢧡𢫜𢱵𢹟𢼁𣑾𣢻𣣇𣥌𣦕𣩌𤧢𤨛𤩋𤼸𥆮𥉆𥌟𥐂𥛓𥛬𥜾𥡳𥡴𥨮𥨮𥬚𥬧𥬷𥬿𦅐𧋹𧖬𧘕𧧎𨑗𨑵𨓑𨕭𨢳𨨾𨽾𨾁𩑨𩜨𩲹𪥤𪱚𪱲𫒆𫝙𫠢𫠷𫠸𫠹𫠺𫠼𫠽𫠿𫯝𫵁𬂞𬅸𬉷𬨺𬮛𬴾",
 "爫": "乿埓妥孚寽揺渓爯爰稲穏窰舀覓觅采隠鶏㐍㩊㴞㷔㸒㸓𠄂𠋁𠍂𡅔𡅮𡖀𡹂𢳸𢳻𢵾𣖩𪦢𪵯𪶴𪺄𪺆𪺏𪺒𪺕𪺙𪺚𪽋𪿿𫁃𫁉𫃿𫐃𫑞𫕊𫢥𫨀𫨙𫱘𫴉𫴧𫸰𫺧𫺼𬉿𬋥𬋧𬋩𬋪𬋭𬋯𬋴𬋵𬋷𬋸𬌈𬌉𬎝𬏏𬏰𬐏𬓴𬚏𬡀𬤸𬨪𬨶𬬝𬰮",
 "冉": "再呥姌寗抩柟爯珃畘舑苒蚺袡髯㘱㫋㴂㾆䎃䏥䤡䶲𠇦𠕟𡖝𡩋𢓒𣅾𣆀𣉁𣑜𣒰𣕛𣜏𣩖𣲹𣽯𤘼𤝫𤱣𥅆𥈦𥚳𥬕𥯿𥱎𥱏𥼉𥿛𦃪𦐘𦱲𦱶𧛥𧦦𧪸𧵘𨀅𨈭𨚗𨪇𨭅𨸱𩏎𩑺𩓾𩓿𩢡𩧬𩶎𪓚𪦣𪺲𫜳再𫮩𬊁𬷆𬷇",
 "𠂤": "峊嶭巕帥師桘薛蛗辥辪追頧鴭㢂䏨䦾𠂾𠃂𠃆𠈆𠙋𠡒𠦥𠭔𡄌𡏩𡑈𡑸𡒰𡚖𡜥𡧺𡴎𡶫𡺇𡼻𡾦𡾹𢀹𢹾𣠗𣳨𤠒𤤷𤦞𥑵𥙢𦒣𦷊𧀼𧃎𧋰𧒂𧒙𧕏𧡦𧧆𨋱𨕵𨹅𨺀𨺔𨼽𨽪𨽪𨽫𨽱𩈜𪌤𪯌𪳦𪷣𫈿𫑓𫞌𫠨𫡚𫡜𫡞𫲲𬂫𬄄𬅵𬉃𬉅𬊷𬧼𬩱",
 "虍": "慮膚虎虏虑虔處虖虗虘虙虚虜虞豦鎼雐鬳䖈䖉䖍䖏䖒䖗䞊䣜䱷䲣𠊤𠢅𠶪𠼥𠿖𡅈𡎍𡎪𡐸𡒾𡟣𡢙𡢢𢀊𢀋𢊐𢋽𢐏𢒜𢒯𢟶𢯯𢲽𢳛𢳵𢸉𢺂𢿊𣋮𣖪𣘭𣙁𣣕𣶭𣻐𣼀𤀃𤃒𤄦𤛏𤟜𤟝𤣏𤦣𤨇𤩁𤩩𤪽𤫗𤮆𤮝𤮣𤹡𤺝𥃈𥃋𥃓𥕑𥛕𥛜𥡧𥰽𥲜𥲤𦁭𦂇𦉄𦉋𦉌𦉛𦋾𦞬𦟰𦡑𦸵𦿊𧃘𧃢𧆛𧆜𧆞𧆠𧆣𧆤𧆥𧆧𧆨𧆩𧆪𧆭𧆮𧆱𧆲𧆳𧆴𧆵𧆾𧆿𧇀𧇁𧇂𧇃𧇄𧇆𧇇𧇋𧇏𧇕𧇖𧇗𧇘𧇣𧇧𧇪𧇲𧇴𧇵𧇽𧈀𧈁𧈂𧈃𧈎𧈒𧈓𧈔𧈘𧌧𧌭𧎍𧏕𧐅𧐪𧛓𧤧𧤫𧩐𧪤𧪥𧫅𧫪𧼥𨂑𨏧𨖆𨘈𨝞𨞹𨨍𨩘𨩝𨩞𨪨𨪾𨫴𨬲𨬳𨬷𨭴𨮡𨮣𨮦𨯼𨽜𨽯𨽯𩆴𩐮𩔺𩕚𩗸𩲼𩳰𩴛𩼻𩽟𪏏𪛍𫊝𫊞𫊟𫊡𫊢𫊣𫓗𫿑𬋴𬙓𬟧𬟨𬟩𬟫𬟮𬟯𬟱",
 "豆": "侸剅厨哣壴壹梪毭浢痘登短脰荳裋豇豈豉豊豌豍豎豏逗郖鋀闘頭餖饾鬪㐙㛒㢄㤱㪷㰯㴻䄈䇺䖒䛠䜳䜴䜵䜶䜷䜸䜹䜺䜻䜼䜽䜾䜿䝀䝂䝄䱏𠪶𠽵𡂛𡃠𡇧𡘰𡢒𡬾𡾿𢊍𢍪𢭃𣃃𣕒𣗳𣪌𣺔𤞟𤼼𥆖𥐆𥐇𥐋𥐍𥐍𥐏𥐐𥗅𥜨𥜪𥣸𥥷𥺉𦣓𦪍𦷳𧐝𧐵𧡀𧤰𧯚𧯛𧯜𧯝𧯞𧯟𧯠𧯡𧯢𧯣𧯤𧯥𧯧𧯨𧯩𧯪𧯬𧯭𧯯𧯱𧯲𧯳𧯴𧯶𧯷𧯹𧯽𧰁𧰂𧰃𧰆𧰈𧰌𧰍𧰎𧰏𧰐𧰑𧰗𧰛𧰤𧻿𨁋𨗱𨝾𨞌𨯴𨶜𨹜𨻭𨻯𨽆𩊪𩰒𩰖𪁞𪉣𪏄𪤁𪲓𪴊𪻡𪽧𫌋𫎃𫎄𫑶𫔡𫖥𫝋𫴜𬆱𬗖𬤶𬤷𬤸",
 "戌": "咸威歳烕珬㖅䢕䬄𠷼𢦹𣧵𣺁𤇳𥅛𥅜𦐴𦮠𧓡𧧐𧻗𪉇𫊕𫓰㤜𬕭",
 "𣥂": "步𡰹𢧹𣥶𣥿𩔤𩕘𩕨𩖓",
 "米": "侎冞匊咪夈娄宩屎彝彞敉料断歯毩氣洣渊澚畨眯窭篓籴籵籶籷籸籹籺类籼籽籾籿粀粁粂粃粄粅粆粇粈粉粊粋粌粍粎粏粐粑粒粓粔粕粖粗粘粙粚粜粝粞粠粡粢粣粥粦粧粨粩粪粫粬粭粮粯粰粳粴粶粷粸粹粺粻粽精粿糁糂糃糄糅糆糇糈糉糊糋糌糍糎糏糐糑糓糔糕糖糗糙糚糛糜糝糞糟糠糡糢糣糤糥糦糧糨糩糪糫糬糭糮糯糰糱糲糳糵糷継纇继脒詸迷銤頪颣麊麋㐘㝥㪰㫧㬥䉺䉻䉼䉽䉿䊀䊁䊂䊄䊅䊆䊇䊈䊉䊊䊋䊍䊎䊏䊐䊑䊒䊓䊔䊕䊖䊗䊘䊙䊚䊛䊜䊝䊞䊟䊠䊡䊢䊣䊤䊥䊦䊧䊩䊪䊫䊬䊭䊮䊯䊰䊱䊳䊴䋛䍘䛧䱊𠑔𠑜𠤻𠩕𠶑𡅊𡏰𡒠𡓌𡕝𡢏𡢐𡬍𡲴𡲸𢍨𢐮𢑲𢑴𢘺𢘻𢝱𢞽𢟷𢠒𢾗𢿰𣀰𣀱𣉭𣌑𣍸𣎌𣎝𣜩𣟍𣤹𣧲𣫗𣫿𣮾𣰮𣱥𣱩𣷦𣸡𣺲𣻬𤀬𤁼𤃳𤄗𤄜𤍝𤒺𤔳𤜌𤝸𤥄𤩗𤲞𤳿𤸽𥅼𥇆𥒄𥕝𥛬𥜛𥞪𥞫𥡓𥡚𥡰𥢀𥤄𥤅𥥪𥨩𥩓𥫆𥭁𥮫𥱞𥶗𥸃𥸋𥸥𥸦𥸧𥸩𥸪𥸫𥸬𥸭𥸮𥸯𥸰𥸱𥸲𥸳𥸴𥸵𥸷𥸻𥸽𥸾𥸿𥹀𥹁𥹂𥹃𥹅𥹆𥹇𥹈𥹉𥹊𥹋𥹌𥹍𥹏𥹐𥹑𥹒𥹓𥹔𥹖𥹗𥹘𥹙𥹚𥹛𥹜𥹝𥹞𥹟𥹠𥹡𥹢𥹥𥹦𥹧𥹨𥹩𥹫𥹫𥹬𥹭𥹮𥹯𥹰𥹱𥹲𥹳𥹴𥹵𥹶𥹸𥹹𥹺𥹻𥹼𥹽𥹾𥹿𥺀𥺁𥺂𥺃𥺄𥺅𥺆𥺇𥺇𥺈𥺉𥺊𥺋𥺌𥺍𥺎𥺏𥺐𥺑𥺒𥺓𥺔𥺕𥺖𥺗𥺚𥺛𥺜𥺝𥺞𥺟𥺠𥺡𥺢𥺣𥺤𥺥𥺧𥺨𥺩𥺪𥺫𥺫𥺬𥺭𥺮𥺯𥺰𥺱𥺲𥺳𥺵𥺶𥺷𥺸𥺺𥺻𥺼𥺽𥺾𥺿𥻀𥻁𥻂𥻃𥻄𥻅𥻆𥻇𥻉𥻊𥻌𥻍𥻎𥻏𥻐𥻑𥻒𥻒𥻓𥻕𥻖𥻗𥻙𥻚𥻜𥻝𥻞𥻟𥻠𥻡𥻢𥻣𥻤𥻥𥻦𥻧𥻨𥻩𥻪𥻬𥻭𥻮𥻯𥻰𥻱𥻲𥻳𥻴𥻵𥻶𥻷𥻸𥻺𥻼𥻽𥻾𥻾𥻿𥼀𥼁𥼂𥼃𥼄𥼄𥼅𥼇𥼈𥼉𥼊𥼍𥼎𥼏𥼑𥼒𥼓𥼔𥼕𥼖𥼗𥼘𥼙𥼚𥼛𥼜𥼝𥼞𥼟𥼠𥼡𥼢𥼣𥼤𥼦𥼧𥼨𥼨𥼩𥼪𥼫𥼫𥼬𥼬𥼬𥼭𥼮𥼮𥼯𥼰𥼱𥼲𥼳𥼴𥼵𥼶𥼷𥼸𥼹𥼻𥼼𥼽𥼾𥼿𥽀𥽁𥽂𥽃𥽄𥽅𥽆𥽇𥽈𥽉𥽊𥽋𥽌𥽍𥽎𥽐𥽒𥽕𥽖𥽗𥽙𥽚𥽛𥽜𥽝𥽞𥽟𥽠𥽢𥽥𥽦𥽧𥽨𥽩𥽪𥽫𥽬𥽭𥽮𥽯𥽰𥽱𥽲𥽴𥽵𥽶𥽷𥽸𥽻𥽼𥽽𥽾𥽿𥾀𥾁𥾂𥾃𥾄𦄳𦇚𦊮𦜔𦝓𦣃𦦼𦴕𦿺𧂾𧃲𧄝𧅛𧊾𧒞𧗱𧟊𧮔𧵵𨀷𨎚𨕁𨕄𨗬𨡅𨼺𩏶𩏷𩔖𩔗𩔫𩔬𩗐𩡅𩭄𩱙𩱯𩱵𩱷𩳫𩽑𪀳𪀿𪅒𪋷𪌬𪓋𪙙𪝨𪝶𪤫𪤹𪪨𪬾𪯜𪱭𪲛𪶈𪶕𪹦𪾚𪾝𫂏𫂱𫂲𫂳𫂴𫂵𫂶𫂷𫂸𫂹𫂺𫂻𫂼𫂽𫂾𫂿𫃀𫃁𫃂𫃃𫃄𫃅𫃆𫃇𫃈𫃊𫃋𫃌𫃍𫃎𫃏𫃐𫃑𫃒𫃓𫃕𫃖𫃗𫃙𫜇𫡿𫤆𫥾𫦨𫯱𫰤𫴁𫸡𫹈𬀢𬇈𬐵𬐺𬑂𬖋𬖌𬖍𬖎𬖏𬖐𬖑𬖒𬖓𬖔𬖕𬖖𬖗𬖘𬖙𬖚𬖛𬖜𬖝𬖞𬖟𬖡𬖢𬖣𬖤𬖥𬖦𬖧𬖪𬖬𬖮𬖯𬖰𬖱𬖲𬖳𬖴𬖵𬖶𬖸𬖹𬖺𬖻𬖽𬖾𬗂𬞹𬡗𬨿𬩍𬪏𬴺𬴻",
 "舛": "僲桀桝粦荈㘶㷠䑝䑞𠅞𠈞𠬂𡑬𡶷𡽤𢣶𢫰𢬓𣃌𣄳𣛇𣛋𤏞𤐪𤢯𤪏𤰀𤳩𥌌𥞢𥣡𥥤𥬫𥶒𥹮𥼨𦒪𦧿𦨀𦨃𦨄𦨅𦲋𦾋𧂌𧅊𧓠𨆴𨌤𨍼𨏏𨞧𨭤𨽃𩕶𩕼𩣏𩧶𩻫𩼩𪀾𪉋𪋷𪝨𪨘𪬾𫣔𫮵𫵤",
 "昜": "偒啺婸崵愓揚敭暘暢楊氱湯煬瑒畼瘍碭禓糃腸薚蝪諹踼輰逿鍚陽颺餳鰑㦹㼒䁑䑗䞶䬗䵘䵮𠢃𠭲𡃯𣈟𣉺𣝻𣿴𤋁𤎘𤔰𤾉𥌖𥏫𥏬𥠜𥯕𦳝𧀄𧶽𨗪𨘖𨫖𨵶𩋬𩤟𪃌𪕫𫌅𫌰𫑲𫭍𫯭𫳞𬀷𬋺𬌤𬌺𬟎𬪌",
 "冫": "冭冮冯冰冱冲决冴况冶冷冸冹冺冻冼冽冾冿净凁凂凃凄凅准凇凈凉凊凋凌凍凎减凐凑凒凓凔凕凗凘凙凚凛凜凝凞凟匀次飡馮㓅㓆㓇㓈㓉㓊㓋㓌㓍㓏㓐㓑㓒㓓㓔㓕㓖㓗㭍𠁨𠌩𠖬𠖭𠖮𠖯𠖰𠖱𠖲𠖳𠖴𠖶𠖷𠖸𠖹𠖺𠖻𠖽𠖾𠖿𠗂𠗃𠗄𠗅𠗈𠗉𠗊𠗋𠗌𠗍𠗎𠗏𠗐𠗑𠗒𠗓𠗔𠗖𠗗𠗘𠗙𠗚𠗛𠗜𠗞𠗟𠗠𠗢𠗣𠗤𠗥𠗦𠗧𠗨𠗪𠗬𠗯𠗰𠗱𠗲𠗳𠗵𠗶𠗷𠗸𠗹𠗺𠗻𠗼𠗽𠗾𠗿𠘀𠘁𠘂𠘃𠘄𠘅𠘆𠘇𠘈𠘉𠘊𠘋𠘎𠘏𠘐𠘑𠘕𠘖𠘘𠘙𠘚𠘜𠘝𠘞𠘟𠘠𠘢𠘣𠘥𠘦𠙖𠙥𠛷𠣺𠦥𠯺𡋇𡋈𡙨𡣂𢦬𢧞𢴜𣒝𣙤𣠅𣱖𣶹𤈀𥁣𦛇𦮮𦸮𧂪𧗠𧡆𧩏𨀰𩇝𩇟𪞖𪞗𪞘𪞙𪞚𪞛𪞜𪞝𪞞𪞡𪞢𪞣𪞤𪞥𪞦𪞨𪞩𪞪𪞫𪞬𪞭𪞮𪞯𪞰𪟅𪭺𪲁𫁴𫙇𫙇𫝎𫝓𫞿冬𩇟𫤾𫤿𫥀𫥁𫥂𫥃𫥄𫥅𫥆𫥇𫥈𫥉𫥊𫥋𫥌𫥍𫥏𫥐𫥑𫥒𫥓𫥔𫥗𫥙𫥚𫥛𫥝𫺩𬃩𬅽𬛮",
 "疋": "旋楚疍疐蛋㚄㺼㽰㿿䝪𠏔𠪴𠰊𡔰𡛫𡶕𢪵𢰑𢷟𣆁𣐌𣳟𣵕𣼈𤕟𤥩𤱐𤴖𤴙𤴚𤴜𤴝𤴟𤴠𤴢𤴣𤴤𥁱𥹼𥿇𦖜𦙬𦩂𧠣𩗟𩰠𩾊𪸢𪽧𬆂𬆉𬍩𬏙𬱽",
 "王": "主仼兲匡呈囯寚尪尫弄彺徴忹抂斑斑旺望朢枉汪狂玊玍玨班班琎皇蚟軖迋閏闰㒬㕵㝙㞷㲄㺨㺩㺪㺫㺬㺭㺮㺯㺰㺲㺳㺴㺵㺶㺷㺹㺺㺼㺽㺾㺿㻁㻂㻄㻅㻆㻇㻈㻉㻊㻋㻌㻍㻎㻎㻏㻐㻑㻒㻓㻔㻕㻖㻘㻙㻚㻛㻝㻞㻠㻡㻢㻣㻤㻥㻦㻧㻩㻪㻫㻬㻭㻮㻯㻰㻱㻲㻳㻴㻵㻶㻷㻸㻻㻼㻽㻿㼁㼃㼄㼆㼇㼈㿂䍿䥅𠅪𠅪𠋾𠍙𠓰𠝆𠥆𠳟𠹡𠼌𡉠𡖷𡙮𡝺𡨒𡪪𡫷𡫿𡭤𡮴𡯪𡷄𡹑𡻂𡼜𢔺𢜍𢝎𢞪𢢢𢣙𢦋𢽃𣄋𣅨𣒸𣗜𣹽𤈅𤌼𤖍𤛫𤣔𤤘𤤰𤤻𤤻𤥸𤦅𤦉𤦒𤦢𤦦𤧡𤧢𤧾𤨍𤨣𤨻𤩩𤩮𤩹𤪈𤪉𤪖𤪵𤫊𤫝𤭄𤭾𤾗𥆦𥆧𥘛𥜬𥠢𥬶𥮅𥲓𥵭𥿁𦉦𦊄𦛢𦢹𦤃𦪄𦬬𦮒𦮱𦻺𦿰𧀍𧀐𧗲𧘦𧚡𧟿𧡁𧥶𧪴𧫍𧴽𧻤𨂈𨉑𨉽𨉽𨋶𨌂𨌥𨌥𨌷𨓏𨕿𨘀𨟢𨦊𨪹𨪽𨬠𨹋𩄇𩐔𩥧𩵭𩷡𩽗𪡅𪪣𪲑𪲠𪳈𪶁𪻍𪻎𪻏𪻐𪻑𪻒𪻓𪻔𪻕𪻖𪻗𪻘𪻙𪻚𪻛𪻜𪻝𪻞𪻟𪻠𪻡𪻢𪻣𪻤𪻥𪻦𪻧𪻨𪻩𪻪𪻫𪻬𪻭𪻮𪻮𪻯𪻱𪻲𪻳𪻵𪻶𪻷𪻸𪻺𪻻𪻼𪻽𪻾𪻿𪼀𪼁𪼃𪼄𪼆𪼇𪼊𪼋𪼌𪼍𪼎𪼏𪼐𪼑𪼒𪼓𪼔𪼕𪼖𪼗𪼘𪼙𪼚𪼛𪼜𪼝𪼞𪼟𪼠𪼡𪼢𪼣𪼤𪼥𪼦𪼧𪼨𪼩𪼪𪼫𪼬𪼭𪼮𪼯𪼰𪼱𪼲𪼷𫉦𫋑𫋑𫓈𫞥𫞧𫞨𫞩呈寳忹望㺬㺸瑇瑜璅瓊𫳽𫴂𫴅𫴝𫴡𫴦𫶑𬍐𬍑𬍒𬍓𬍔𬍕𬍖𬍗𬍘𬍙𬍚𬍛𬍜𬍝𬍠𬍣𬍤𬍥𬍦𬍧𬍨𬍩𬍪𬍫𬍬𬍭𬍮𬍯𬍰𬍱𬍲𬍳𬍴𬍵𬍶𬍷𬍸𬍹𬍺𬍻𬍽𬍿𬎀𬎁𬎂𬎃𬎄𬎅𬎆𬎇𬎈𬎉𬎊𬎋𬎌𬎍𬎎𬎏𬎐𬎑𬎒𬎓𬎔𬎖𬎘𬎙𬎚𬎛𬎜𬎝𬎞𬎟𬎠𬎡𬫃",
 "囚": "巤泅苬鮂𠉁𠧚𠧵𡈶𡈶𡈶𡈶𡌓𡒀𡿸𢅶𢘄𣃴𣃷𣐮𣧝𣭃𥁕𦱟𨒊𨥱𩺠𪵻𪸜𫂌𫏦𬑋𬘇",
 "皿": "塩壊孟寍寜昷橀泴盀盁盂盃盄盅盆盇盈盉盋盌盍盎盏盐盒盓盔盕盖盗盘盙盚盛盝盞盟盠盢盤盥盦盨盩盪盫盬盭笽簋簠葢蛊蠱血醓醯齍㦈㭗㳑㿻㿼㿽㿾㿿䀀䀁䀂䀃䀄䀅䀆䀇䀈䀉䀊䀋䀌䀍䕄䭍𠏫𠐹𠑜𠘦𠰘𠱄𠸟𠽲𡁢𡂍𡄊𡅞𡎌𡑷𡘃𡧾𡨬𡩬𡫇𡻘𢙂𢭚𢱮𢳷𢴕𢴞𢹳𣉼𣕆𣖁𣖻𣙥𣛯𣟇𣠅𣣥𣪰𣫨𣹃𣹆𣹉𣻭𣽭𣿣𤄼𤅿𤎏𤖙𤡛𤷷𤸙𤹧𤹺𤼎𥀿𥁀𥁁𥁂𥁄𥁅𥁆𥁇𥁈𥁉𥁊𥁋𥁌𥁍𥁎𥁏𥁐𥁑𥁒𥁓𥁔𥁕𥁗𥁘𥁙𥁛𥁜𥁝𥁟𥁡𥁢𥁣𥁤𥁥𥁦𥁧𥁨𥁩𥁪𥁬𥁭𥁮𥁯𥁱𥁲𥁳𥁴𥁵𥁷𥁸𥁹𥁺𥁻𥁼𥁽𥁾𥁿𥂀𥂁𥂂𥂃𥂄𥂅𥂆𥂈𥂉𥂊𥂋𥂌𥂍𥂎𥂏𥂐𥂑𥂒𥂓𥂔𥂕𥂖𥂗𥂘𥂚𥂜𥂝𥂞𥂟𥂠𥂡𥂢𥂣𥂤𥂥𥂦𥂧𥂩𥂪𥂫𥂬𥂭𥂮𥂯𥂰𥂱𥂲𥂳𥂴𥂵𥂶𥂷𥂸𥂹𥂻𥂼𥂽𥂾𥂿𥃀𥃁𥃂𥃃𥃄𥃅𥃇𥃈𥃉𥃊𥃋𥃌𥃍𥃎𥃏𥃐𥃑𥃒𥃓𥃔𥃖𥃗𥃘𥃙𥃜𥃝𥃟𥃡𥃣𥃣𥃣𥈕𥉓𥋕𥋱𥔐𥕤𥢃𥥊𥧧𥨠𥰎𥱔𥱚𥲜𥵁𥵃𥶊𥶞𥷟𦄡𦅟𦅺𦖬𦗃𦞟𦡿𦣪𦱣𦷐𦹧𦻌𦼬𦽘𦾐𦾗𦿘𧀽𧁔𧂚𧃗𧃾𧄭𧅽𧆗𧈚𧏱𧔵𧜡𧨦𧫺𧰕𧰚𧰝𧸎𧽱𨃎𨊎𨏧𨜨𨝕𨞞𨡇𨡖𨡝𨡬𨡰𨡼𨡿𨢠𨢸𨣓𨣕𨣘𨫸𨵯𨵲𨵵𨶩𨻹𨽜𩆴𩏛𩝉𩞜𩟟𩡚𩬬𩺻𪉟𪉩𪉶𪉹𪊻𪤂𪭌𪭓𪮝𪾊𪾋𪾌𪾍𪾎𪾏𪾐𪾑𪾒𪾓𪾔𪾕𪾖𪾗𪾘𪾙𪾚𪾛𪾜𪾞𫁆𫉶𫋟𫒏𫗘𫞯𫞰𫞱𥁄𦼬𫧘𫴃𬃇𬏺𬐗𬐘𬐙𬐚𬐛𬐜𬐝𬐞𬐠𬐡𬐢𬐣𬐤𬐥𬐦𬐧𬐨𬐪𬐫𬐬𬐮𬐯𬐰𬐱𬐲𬐳𬐴𬐵𬐶𬐷𬐹𬐺𬐻𬐽𬐿𬑀𬑁𬑂𬑃𬑄𬝎𬪲𬫬𬰮𬵉𬷧",
 "也": "乸他匜吔她弛彵忚扡施杝毑池灺祂竾肔虵衪訑貤迆酏釶阤馳驰髢㐌㦾䄬䊶䪧䶔𠇜𠋞𠨱𡖐𡧀𢇚𢻫𢻱𣸚𤕮𤖪𤜣𤱡𥃸𥐨𥒃𥝀𦍔𦏸𦐁𦧇𦬎𦴍𧠉𧺏𧿇𨤤𩵔𪨥𫂴𫍙𫡩𫡩𫡩𬮆",
 "由": "伷冑妯宙届岫峀庙廸怞抽柚油甹畁秞笛粙紬舳苖蚰袖褏軸轴迪邮釉鈾铀頔駎鮋鲉鼬㐕㑹㕀㣙㹨㽕㾄䄂䌷䛆䜬䩜𠃦𠔍𠔔𠟳𠢮𠰬𠱋𡄿𡊡𡔱𡕦𡘊𡘞𡛽𡞑𡱋𡳧𢂎𢄖𢆟𢍁𢥁𢳏𢷐𢽒𣶻𣷛𣿶𤉓𤉕𤟺𤤧𤰋𤰰𤰴𤱁𤱉𤱤𤱫𤲀𤲀𤲣𤲦𤳃𤳐𤳨𤳷𤳸𤽙𤽻𥇗𥑤𥟗𥥉𥧠𥺒𦁰𦥪𦲥𧆭𧈕𧙏𧬚𧲹𧻉𨎜𨕟𨪿𩄪𩊄𩔺𩧨𩿬𪡣𪳡𪳫𪽉𪽝𪽠𫆚𫑣𫔞𫔼𫘼𫠘峀𫳂𫹆𬏁𬏌𬏕𬔈𬰹𬱖",
 "囟": "傻恖硇篦繌蓖㒨㭡䛜䢉䪿𠂺𠃼𠈈𠑎𠑗𠒆𠠧𠣆𠨧𠱖𠴺𠻦𠿬𡂇𡄺𡕩𡜧𡠌𡢗𡤚𡭓𡲮𡶯𡼇𡿺𢀇𢀏𢅽𢆿𢇆𢍄𢍱𢍹𢍹𢖣𢞗𢠧𢡔𢡔𢥡𢥯𢫥𢱧𢸯𢹰𢾱𣄪𣙺𣟮𣠙𣬈𣬉𣳦𣹮𤄚𤄻𤅌𤅛𤎑𤐫𤒾𤚪𤠞𤣜𤦑𤨌𤬟𤬡𤬢𤬣𤼝𥊙𥍌𥝈𥝋𥿳𦇳𦔕𦟣𦣁𦤟𦦉𦦒𦦤𦦥𦦷𦧂𦧂𦶰𧄖𧏩𧖕𧗕𧟈𧟒𧢨𧫝𧮏𧳄𧳴𧾴𨇴𨉮𨑋𨙙𨙞𨟋𨟦𨢼𨤉𨩬𨰐𨻀𩔅𩔙𩘙𩙞𩤖𩪅𩹻𩽯𪾙",
 "工": "仜冮功匞卭叿噐妅屸巠左巧巩巬差式扛揑攻杠杢毁汞江滘灴玒瓨疘矼空笁紅红缸羾肛舡虹訌讧豇貢贡赣邛釭項项魟㒰㓚㓛㝷㞡㞡㞡㞡㞬㠬㠭㠭㠭㠭㠮㣉䂵䉺䜫䞑䪦䫹䭡䲨𠃖𠇹𠋕𠎅𠐫𠙔𠙛𠜝𠟗𠡿𠦕𠨆𠱯𠵋𠵧𠵪𠸴𠽇𡀏𡁥𡆅𡆬𡉎𡉐𡌾𡏷𡓛𡔂𡔂𡔂𡔂𡔺𡜣𡠸𡥴𡧇𡧢𡧱𡪫𡫉𡫙𡫙𡫟𡫟𡫟𡫟𡫮𡫮𡫳𡫳𡫳𡫳𡫼𡫼𡫼𡫼𡬦𡰱𡲌𡲝𡳗𡹻𡾑𢀒𢀓𢀕𢀗𢀙𢀛𢀜𢀟𢀢𢀤𢀩𢀫𢀯𢇀𢋲𢌖𢍟𢏚𢏚𢐯𢑰𢑰𢒄𢓁𢖶𢖷𢙷𢜊𢜾𢝘𢝭𢟃𢟾𢠕𢡡𢤑𢤑𢤑𢤑𢥛𢥛𢥛𢥛𢥜𢥜𢥜𢥜𢨜𢪞𢭊𢭤𢰫𢲿𢶦𢷼𢻣𢾌𢾒𣆓𣇖𣐕𣑓𣒋𣒳𣕕𣕠𣕡𣞚𣢈𣣔𣵀𣸝𣽃𤁺𤉊𤐍𤑌𤔌𤕧𤝺𤞾𤤑𤤲𤥧𤪩𤬳𤱝𤳚𤳶𤻸𥁁𥃽𥃿𥅣𥊾𥑱𥒽𥗷𥗷𥗷𥗷𥞭𥧂𥨄𥫒𥬑𥲒𥴐𥴐𥴐𥴐𦁟𦁻𦅛𦆧𦇈𦈄𦈩𦎩𦏺𦏼𦒳𦔘𦔸𦕓𦕭𦗯𦪮𦮨𦯋𦵃𧂘𧈫𧈬𧉨𧋳𧖏𧖏𧘍𧙰𧛠𧛪𧠱𧦬𧧫𧨤𧨿𧩄𧩗𧪖𧫯𧭨𧭲𧶓𨅧𨇏𨊎𨊗𨊧𨋑𨋷𨋷𨍤𨏜𨜱𨝻𨞟𨥲𨧎𨧑𨩹𨮡𨲻𨸖𨹢𨼧𨾊𩊳𩒍𩒞𩗑𩛐𩞜𩟸𩟸𩢗𩢞𩪒𩪳𩬛𩬣𩬰𩯸𩰰𩲧𩾬𪂐𪅷𪥙𪧪𪩣𪭏𪮆𪰆𪿔𫀧𫆞𫔙𫚉涅𩬰𫶫𫶬𫶭𫶮𫶳𬇔𬎥𬐝𬐝𬒬𬛀𬛸𬮚𬷾",
 "其": "倛剘唭基娸帺惎掑斯旗朞期棊棋欺淇猉琪碁祺稘箕粸綦綨萁蜝蜞褀諅諆踑錤騏骐魌鯕鲯鶀麒㐞㙋㠱㥍㪸㫷㯦䃆䑴䫏䳢䶞𠔡𠔫𠔴𠔵𠔶𠔸𠥊𠥩𠴩𡖾𡠧𡢁𡮴𡸷𢁂𢤵𢤵𢮜𣄃𣇳𣈒𣗍𣗠𣾁𤦢𤩒𤭣𤭦𤷍𤻓𤿺𥛏𥪓𥱕𥲲𥶂𥶺𥷕𥸞𦋊𦓿𦝁𦣫𦥄𦫡𦸆𧇫𧬗𧯯𨅤𨛺𨡨𨺌𨿣𪍀𪜝𪿋𫑇𫓹𫔥𫛰𫤱𫤴𫦮𫯔𫯘𬌋𬙡𬚌𬛛𬱦𬲽𬸒𬹊",
 "品": "偘區喦喿嵒嵓榀煰碞蕚闆㠋䓵𠐨𠥝𠵀𠵛𠵬𠹜𠻖𠻝𠼧𠾅𡀉𡅝𡅾𡍸𡐈𡙗𡚍𡣏𡪑𡻫𡻵𡼑𢠑𣖎𣠄𣻵𣼞𣽺𤍸𤸔𥰔𥶟𥷷𦗻𦹛𦾆𦾊𧅧𨩗𨬱𨶴𩜻𪮐𫧗𫺢𬖿𬧒𬮳",
 "兄": "兌兑况呪岲怳拀柷況炾眖祝竞詋貺贶軦㑆㒭㒭㚾㫛𠆃𠑽𠓆𠓆𠩣𠬓𡥺𡬣𡶢𢼙𣅷𣍦𣸿𤔓𥞏𥧐𦬺𦯇𨦸𩒇𪥚𪺎𪾂𪾍𫀖𫌝况𫤜𫤝𫤟𫧕𫪨𫳸𬆁𬎢𬑂𬞁",
 "⺄": "卂厾虱𠃥𠧝𠨷𠫜𠮸𠱨𠲫𡆓𡈾𡔬𡕋𡖕𡣼𡬞𡬞𡬞𢟃𢩂𢩦𢩲𣲊𣲌𤓸𤕋𤚿𤜿𤣭𤫋𥠌𥠠𥨬𥮸𥵽𥸦𥹦𦊻𦧾𦫴𦬈𧋜𧒢𧟢𧠍𨐾𨑐𨑐𨓟𨾐𨾑𪲂𫡧",
 "夫": "伕养呋失妋巬巭扶枎渓玞畉砆肤芙菐蚨衭規规趺邞酜鈇颫鳺鶏麩麸㚘㚘㝬㠫㠬㠸㫙䃿䄮䊿䡍𠂕𠈖𠎝𠎝𠔲𠗑𠤱𠨶𡝈𡝉𡟘𡳋𢀺𢗤𢗲𢺻𢻳𣣇𤄴𤄵𤄵𤆮𤏠𤩍𤱁𤱽𤾞𤾞𥄑𥕪𥣆𥣆𥥂𥬘𦀶𦅋𦅋𦔾𦢋𦰀𦺀𧏉𧗻𧥱𧭃𧭃𧮾𧯟𨎈𨎑𨞿𨰀𨰀𨹩𨾚𨿸𩖬𩞶𩣎𩤻𩥲𩯒𩯒𩰿𩰿𩵩𩽺𪊐𪓗𪞾𪥃𪯈𫈌𫓧𫘆𫢑𫭝𫯤𫯪𫯰𫯳𫯿𫲷𫴂𫴙𬀁𬔮𬖐𬟨𬢃𬨝𬲋𬴇",
 "从": "丛众僉卒坐庻怂枞疭纵耸苁𠅃𠈌𠈌𠑏𠝴𠼄𠼜𡳑𡳑𡵝𢂯𢋦𢓅𢦜𢦺𢨈𢨈𢬕𣗊𣦊𣦊𣬱𤋋𤣈𤻠𥱣𦄚𦕦𦖏𦖴𦤈𦺅𧭁𧺣𧿛𨥎𪂐𪈣𪨊𪭢𪻐𫎆𫓩𫕚𫞄𫡑𫧏𫩛𫮇𫷃𬎧𬜻𬟺𬲪𬷿𬸿",
 "乛": "买卖𠀄𠄐𠋾𠭶𡁥𡔽𡠕𢙑𢦢𣐱𣑅𤔍𥁪𥕩𥖂𥟞𥢃𥮺𨪬𨮾𪤳𪥁𫇧𫥦",
 "今": "仱侌吟含妗岑岒庈忴念扲昑枔棽欦汵玪琴矜砛笒紟肣芩蚙衾衿訡貪贪赺趻軡酓鈐钤雂霒霠靲鳹鹶黅黔㕂㪁㲐䑤䩂䪩䰼䶃䶖𠇀𠇏𠉞𠉾𠤮𠩧𠹸𡣔𡸛𡼘𢁮𢉄𢐫𢦟𢩐𢫲𢭞𢻶𣇂𣙄𣜓𣢬𣢲𣲎𣶗𤘡𤘨𤜰𤨋𤬯𤬰𤴽𥁌𥄯𥘞𦊃𦖎𦤰𦧈𦧎𧘭𧮰𨙽𨟹𨡢𨦄𩂇𩃬𩎖𩑟𩒣𩒥𩖦𩚕𩚜𩠻𪚕𪚬𪝶𪞘𪱗𪱼𫄛𫐡𫑸𫖑𫢩𬐪𬓢𬖳𬮞",
 "云": "伝侌兿凨动叆叇呍囩夽妘尝层忶抎昙枟沄眃秐紜纭耘芸藝転运酝雲魂㙯䢵䰟䲰𠄴𠅀𠇌𠊁𠣓𠦊𡂞𡙿𡛍𡱓𡷃𢆹𢍞𢣒𢶳𣐂𣱉𣸮𤱂𤶊𤽎𥅬𥐯𥘟𥢘𥬀𥯿𦤆𦱚𦱚𦾆𧥼𧴳𧶀𧶊𨥕𨲑𨾜𩃬𩄈𩅣𩅣𩇒𩏁𩲑𪉂𪔎𪜞𪜟𪲡𪵣𫡶𬁴𬆽𬍒𬨿",
 "㐄": "夅舝䂋䄵𠌏𠎀𠎕𠿎𡁑𡍅𡗢𡢓𢜤𣴰𦀮𦎾𦽬𦽬𧒘𧢣𧧳𧬭𨀗𨉀𨩞𩎳𩏍𩦣𩧞𩰫𩰬𪜼𪡂𫀭𫒰𫯠𫵠",
 "允": "充兖吮恱抁毤沇狁玧萒鈗阭馻㣞㭇㽙䆓䦾𠒕𠒳𠤥𠤦𠱕𠵷𡇰𡇺𡜎𡴞𡹿𡻏𢁲𢆋𢇰𢰉𣉀𤁫𤵔𥝲𦁙𦧊𦮀𦲮𦳽𦳾𧉃𧍄𧣥𨋍𨐑𨦣𩬌𩭕𪝗𪣁𪥬𪫤𪸗𫀙𫟵𫢎𫧨",
 "屮": "屰蚩辥㞣𠦨𠭳𠺤𠺤𡗡𡘶𡫹𡫾𡫾𡴁𡴂𡴃𡴅𡴆𡴇𡴊𡴋𡴍𡴎𡴏𡴐𡴑𡴒𡴔𡴕𡴖𡴗𡴙𡴚𡴚𡴛𡴜𡴝𡴞𡴤𡴥𡴦𡴧𡴪𡴪𡴫𡴫𡴫𡸐𢊝𢞪𢟃𢟃𣂟𣂲𣹨𣺥𣺥𤉞𤔠𥄾𥼈𦆰𦆰𦠠𦬏𦱞𦱴𦸹𧀼𧈪𧗭𧘫𧫨𨍔𨒯𨔢𨘹𨛝𨝇𨞍𩎢𩤍𩤍𩴭弢",
 "⺢": "彔忁𠞤𠠌𠡾𡒈𡒏𡒛𡙌𡝼𡻾𢀂𢑗𢕲𢟱𣀍𣕊𣠬𣠬𣻊𣽨𣾰𣿀𤑘𤛺𤨶𤹤𥄳𥉋𥡎𥧴𥪬𥶢𦘞𦢘𦽗𦾅𦿾𧄃𧛳𧩚𧼇𧼢",
 "豸": "絼蠫豹豺豻豼豽豾豿貀貁貂貃貄貅貆貇貈貉貊貋貍貎貏貐貑貒貓貔貕貖貗貘貙貚貛貜䝖䝗䝘䝙䝚䝛䝜䝝䝞䝟䝠䝡䝢䝣䝥䝦䫉𠉠𠾠𠿵𢚵𢤧𢭺𤉒𤙪𤞝𥍪𥵷𦻿𧀔𧂀𧋈𧏇𧲠𧲡𧲢𧲣𧲤𧲥𧲦𧲧𧲨𧲩𧲪𧲫𧲬𧲭𧲮𧲯𧲰𧲱𧲲𧲳𧲴𧲵𧲶𧲷𧲸𧲹𧲺𧲻𧲼𧲽𧲾𧲿𧳀𧳁𧳂𧳃𧳄𧳅𧳆𧳇𧳈𧳉𧳋𧳌𧳍𧳎𧳏𧳐𧳑𧳒𧳓𧳔𧳕𧳖𧳗𧳙𧳚𧳛𧳜𧳝𧳞𧳟𧳠𧳡𧳢𧳣𧳤𧳥𧳧𧳨𧳩𧳪𧳫𧳬𧳭𧳮𧳯𧳰𧳱𧳲𧳳𧳴𧳵𧳶𧳷𧳹𧳺𧳻𧳼𧳽𧳾𧳿𧴀𧴁𧴂𧴃𧴄𧴅𧴆𧴇𧴈𧴉𧴊𧴋𧴌𧴍𧴎𧴏𧴐𧴑𧴒𧴓𧴔𧴕𧴖𧴗𧴘𧴚𧴜𧴝𧴞𧴟𧴠𧴡𧴢𧴣𧼋𧼌𨂼𨘅𨘷𨙁𩳏𪁰𪡊𫎊𫎋𫎌𫎍𬏯𬠸𬥈𬥉𬥊𬥌𬥍𬦳",
 "艮": "佷哏垦峎很恨恳拫根泿狠珢痕眼硍簋良茛蛝裉詪豤貇跟退銀银限鞎食齦龈㡾㸧䦘䫀䬶𠏾𠑞𠛵𠦯𠪏𠪟𠪼𠿵𡯣𡷐𢩆𣐻𣗰𣧾𥉤𥐇𦕨𦚣𦫋𦫌𦫎𦫒𦴭𧅋𧻠𨇭𨋨𨒼𨕻𨘍𨙐𨸄𩎤𪍔𪭳𪺢𪻊𫅔𫖱𫥋𫻂𬑶𬣳𬦂𬰉𬲷",
 "卩": "卪卭卲却卶卸卹卻卽卾厀厁叩夘栁爷皍缷㕁䥮𠏣𠨐𠨒𠨖𠨖𠨘𠨚𠨛𠨝𠰱𠴷𡰰𡴹𡴺𢓦𢘈𢘖𢯃𣒂𣛺𣢀𣣝𤎇𤤑𥭫𥷉𦀩𦓥𦘝𦛪𦛶𦡩𦭘𦭙𦽱𧌞𧎙𨑏𨧞𩊎𩛓𩢗𩢞𩱺𩾓𪠁𪡙𫆀𫈩𫕝卿𫧹𫧺𫧽𫨁𫭘𬫅",
 "見": "俔哯娊寛峴悓挸斍晛梘涀現睍硯竀筧粯絸莧萈蜆覍覎規覐覑覒覓覔覕視覗覘覛覜覝覞覞覟覠覡覢覣覤覥覦覨覩親覫覬覭覯覰覱覲観覴覵覷覸覹覼覾覿觀誢鋧靚靦麲㒻㝟㰖䂓䅐䏹䙷䙸䙹䙺䙻䙼䙽䙾䙿䚀䚁䚂䚃䚄䚅䚆䚇䚈䚉䚊䚋䚌䚍䚎䚏䚐䚑䚒䚓䚔䚕䚖䧋䨘䩤𠄺𠏌𠺐𡃁𡕚𡣅𡩖𡪳𡪽𡫁𡫨𡷹𢀢𢈥𢔶𢳢𢴓𢵅𢽕𣁐𣽾𤕥𤙧𤞭𤫽𤶻𥉎𥉨𥉿𥦀𥨖𥰖𥳸𥵒𦏀𦖃𦶴𧅫𧠈𧠉𧠊𧠋𧠌𧠍𧠎𧠏𧠐𧠑𧠒𧠔𧠕𧠗𧠘𧠙𧠚𧠛𧠜𧠝𧠞𧠠𧠡𧠢𧠣𧠤𧠦𧠧𧠨𧠩𧠪𧠫𧠬𧠭𧠮𧠯𧠰𧠱𧠲𧠴𧠵𧠶𧠷𧠸𧠹𧠺𧠻𧠼𧠽𧠾𧠿𧡀𧡁𧡂𧡄𧡅𧡆𧡇𧡊𧡋𧡌𧡍𧡎𧡏𧡐𧡑𧡒𧡓𧡔𧡕𧡖𧡗𧡙𧡚𧡛𧡜𧡝𧡞𧡟𧡠𧡡𧡢𧡣𧡤𧡥𧡦𧡧𧡨𧡩𧡫𧡬𧡭𧡮𧡰𧡱𧡲𧡳𧡴𧡶𧡸𧡹𧡺𧡻𧡼𧡽𧡾𧡿𧢀𧢁𧢃𧢄𧢆𧢈𧢉𧢊𧢋𧢌𧢍𧢎𧢏𧢐𧢑𧢓𧢔𧢕𧢖𧢗𧢘𧢙𧢚𧢜𧢝𧢟𧢠𧢡𧢢𧢣𧢤𧢥𧢦𧢧𧢨𧢩𧢪𧢫𧢭𧢮𧢯𧢰𧹦𧼊𨁍𨘵𨡁𨴼𩷪𪑈𪨔𪵄𪶂𪷃𪽔𫌜𫌝𫌞𫌟𫌠𫌡𫌢𫌣𫌤𫌦𫌧𫏠𫝎𫟜𩇟㒻𫴏𫾴𬄦𬒜𬞸𬡼𬡽𬡾𬡿𬢀𬢁𬢂𬢃𬢄𬢅𬢆𬸳",
 "帀": "師沞衞讏迊韴魳鳾㺰䒥䘙䞙𠇆𠈡𠈩𠊃𠜔𠯗𠴴𡶺𢃋𢄾𢅢𢭍𣑙𣑲𣳽𤆱𤜳𤟓𥰐𦴫𧔸𧙱𨔄𨥚𨦨𨳪𩇱𩉰𩡸𩫿𩿐𫟙𫥞𬀂𬅹𬒭𬛂𬬢𬰪𬲌",
 "㔾": "卮危卺厄夗寋氾犯篹㒨㟟䕫䙴䲝𠂘𠃃𠌔𠥿𠨎𠨎𠨕𠨕𠨕𠨗𠨟𠨤𠨧𠨨𠨩𠪍𠭋𠭚𠲪𡄞𡋞𡦻𡱹𡴱𡴼𢁡𢒿𢖭𢘔𢛖𢬬𢱄𣎿𣲣𤇘𤘕𤼥𥐗𥽊𦔶𦜕𦨌𦫾𦬳𦱢𦸟𧿏𨇫𨇴𨊠𨙞𨟦𩉴𩍫𩖉䕫頋𬂦",
 "刂": "㑠㓚㓝㓟㓠㓡㓢㓣㓤㓥㓦㓧㓨㓩㓪㓫㓬㓭㓮㓯㓲㓳㓴㓵㓶㓷㓸㓺㓻㓼㓽㓾㓿㔀㔁㔂㔄㔅㔆㔇㔈㔉㔊㔋㔌㔍㔏㔐㔒㴊㶜㺫䖌䚯䵞𠉳𠊖𠐘𠗗𠚥𠚧𠚩𠚭𠚯𠚰𠚳𠚴𠚵𠚶𠚷𠚸𠚹𠚺𠚻𠚼𠚽𠚾𠛀𠛂𠛃𠛄𠛅𠛆𠛊𠛋𠛌𠛍𠛎𠛏𠛐𠛑𠛒𠛓𠛔𠛕𠛗𠛘𠛚𠛛𠛜𠛟𠛠𠛡𠛢𠛣𠛥𠛦𠛧𠛩𠛪𠛫𠛬𠛭𠛮𠛯𠛰𠛱𠛲𠛴𠛵𠛶𠛷𠛻𠛼𠛾𠛿𠜀𠜁𠜂𠜃𠜄𠜅𠜆𠜇𠜈𠜉𠜋𠜍𠜎𠜏𠜐𠜑𠜒𠜔𠜕𠜖𠜗𠜙𠜚𠜜𠜝𠜟𠜠𠜢𠜩𠜪𠜮𠜯𠜱𠜲𠜳𠜴𠜶𠜷𠜸𠜹𠜻𠜽𠜾𠜿𠝀𠝁𠝃𠝄𠝆𠝇𠝉𠝌𠝍𠝏𠝐𠝑𠝒𠝓𠝘𠝙𠝚𠝛𠝜𠝞𠝠𠝡𠝢𠝣𠝤𠝥𠝦𠝩𠝪𠝫𠝬𠝭𠝱𠝲𠝳𠝴𠝶𠝹𠝺𠝻𠝾𠞀𠞁𠞂𠞃𠞆𠞈𠞋𠞌𠞍𠞎𠞏𠞐𠞑𠞒𠞔𠞖𠞗𠞘𠞙𠞚𠞛𠞜𠞝𠞞𠞟𠞣𠞤𠞥𠞦𠞨𠞩𠞫𠞬𠞭𠞮𠞯𠞱𠞳𠞵𠞶𠞸𠞹𠞼𠞼𠞿𠟁𠟂𠟅𠟆𠟇𠟉𠟊𠟋𠟍𠟎𠟏𠟑𠟒𠟓𠟔𠟕𠟖𠟗𠟘𠟛𠟜𠟝𠟞𠟟𠟠𠟡𠟢𠟣𠟤𠟨𠟩𠟬𠟭𠟮𠟰𠟱𠟵𠟶𠟷𠟺𠟻𠟼𠟽𠟾𠠀𠠃𠠅𠠆𠠇𠠉𠠌𠠍𠠏𠠑𠠒𠠓𠠕𠠖𠠗𠠘𠠙𠠚𠠛𠠜𠠝𠠟𠠡𠠣𠠤𠠥𠠧𠠨𠠫𠠬𠠮𠠯𠠰𠠱𠮧𠰙𡌁𡎗𡐂𡙨𡠡𡡸𡥁𡯇𢆂𢛋𢝗𢞈𢥍𢩬𢴴𢷚𣏀𣔜𣖊𣤏𣨸𣬟𣲈𣴈𣵃𣶄𣷨𣷬𣸟𣹨𣺳𣼉𤂄𤄉𤉥𤉩𤋴𤎁𤎵𤎾𤛜𤠧𤳝𥇮𥚘𥟜𥟸𥟻𥤔𥥎𥦧𥧂𥨐𥭔𥮙𥮚𥮻𥲮𥳩𥷢𦒕𦓎𦨉𦭣𦮓𦰵𦱝𦱰𦳲𧌥𧌵𧍼𧎈𧏇𧙮𧚲𧛵𧺈𧿀𨃎𨄫𨔜𨔭𨦕𨦿𨧂𨨬𨪑𩗌𩗦𩘃𩘛𩝖𩹒𪞾𪞿𪟁𪟃𪟄𪟆𪟇𪟈𪟉𪟋𪟌𪟍𪟎𪟏𪟒𪟔𪟕𪟖𪡽𪮌𪱢𪴝𪽯𫝐㓟刻𫥳𫥵𫥶𫥷𫥹𫥺𫥻𫥼𫥽𫥾𫦀𫦁𫦂𫦃𫦄𫦅𫦆𫦉𫦊𫦎𫦏𫦐𫦒𫦕𫦖𫦙𫦚𫦛𫦜𫦝𫦞𫦟𫦡𫦣𫨖𫮘𫺥𬁦𬂖𬃙𬜱𬶀",
 "元": "兘刓园坖妧完宼岏忨抏朊杬沅玩盶窛笎翫芫蚖衏貦远邧酛鈨阮頑顽髨魭黿鼋㐾㒬㒮㓂㝴㪴䏓䛃䡇䦎䨌䬧䯈䲮䲶𠀻𠅮𠒉𠒑𠒓𠒖𠒞𠒢𠒴𠒺𠒻𠓕𠕻𠠺𠣑𠰂𠹬𠿻𡝴𡨥𡵧𢒇𢓆𢟭𢯥𣁯𣍎𣵘𣾊𣾬𤁚𤝌𥤸𥦲𦍘𦨞𦸅𦽞𧇳𧉗𧕜𧕜𧘁𧲦𧿙𨈤𨷝𩃾𩇖𩇲𩉯𩐘𩙓𩢄𩵶𪎹𪐬𪓣𪕀𪞒𪧍𪰈𪸑𪽊𪿑𫅣𫗟𫠫𫤙𫤞𫴁𫹵𬐍𬞪",
 "共": "供哄塂娂巷巽拱拲晎暴栱洪烘烡珙異硔粠粪舼蕻蛬衖謈谼輁輂鉷閧髸鬨龔龚㓋㟟㤨㬴㭟㳟䀧䜤䢼䢽䧆䱋䳍𠏛𠐜𠔚𠔣𠔤𠔷𠧆𠪤𠪵𠭨𠮂𡋍𡏏𡯯𡱒𡶵𢀼𢁀𢁉𢂔𢈎𢋍𢙄𢛖𢩉𢮪𢼦𢼭𣊴𣡋𣨳𣺙𣿑𤄤𤌱𤐲𤞒𤨶𤱨𤱺𤲅𤹲𥆇𥈻𥙖𥥡𥫆𥫈𥬹𥻎𥼉𦃙𦌌𦓳𦕠𦜞𦮎𦹕𧋄𧠩𧮖𧶯𧶼𨂚𨒱𨓟𨕊𨜕𨞔𨞠𨤬𨻘𩁂𩃽𩈿𩐠𩒓𩗄𩛘𩛛𩞔𩼮𪞉𪞋𪧑𪭍𪮵𫏇𫑖𫞙𫟹巽港𤎫𫱏𫼌𬈘𬒸𬩺𬮢𬹂𬹆",
 "尢": "𫝘",
 "女": "佞囡奴奵奶奷奸她奺奻奻奼好奾奿妁如妃妄妅妆妈妉妊妋妌妍妎妏妐妑妒妓妔妕妖妗妘妙妚妛妜妝妞妟妠妡妢妣妤妥妧妨妩妪妫妬妭妮妯妰妱妲妴妵妶妷妸妹妺妼妽妾妿姀姁姂姃姄姅姆姇姈姊始姌姍姎姏姐姑姒姓委姕姖姗姘姙姚姛姜姝姞姟姠姡姣姤姥姦姨姩姪姫姬姭姮姯姰姱姲姳姴姶姷姸姹姺姻姼姽姾姿娀威娂娃娄娅娆娇娈娉娊娋娌娍娎娏娐娑娒娓娔娕娖娗娘娙娚娛娜娝娞娟娠娡娢娣娤娥娦娧娨娩娪娫娬娭娮娯娰娱娲娳娴娵娶娷娸娹娺娻娼娽娾娿婀婂婃婄婅婆婇婈婉婊婋婌婍婎婏婐婑婒婓婔婕婖婗婘婙婚婛婜婝婞婟婠婡婢婣婤婥婦婧婨婩婪婫婭婮婰婱婳婴婵婶婷婸婹婺婻婼婽婾婿媀媁媂媃媄媅媆媇媈媉媊媋媌媍媎媏媐媑媒媓媔媕媖媗媘媙媚媛媜媝媞媟媡媢媣媤媥媦媧媨媩媪媫媬媭媮媯媰媱媲媳媴媶媷媸媹媺媻媼媽媾媿嫀嫁嫂嫃嫄嫅嫆嫇嫉嫊嫋嫌嫍嫎嫏嫐嫐嫒嫓嫔嫕嫖嫗嫘嫙嫚嫛嫜嫝嫞嫠嫡嫢嫣嫤嫥嫦嫧嫩嫪嫫嫬嫭嫮嫯嫰嫱嫲嫳嫴嫵嫶嫷嫸嫹嫺嫻嫼嫾嫿嬀嬁嬂嬃嬄嬅嬆嬇嬈嬉嬊嬋嬌嬍嬎嬏嬐嬑嬒嬓嬔嬕嬖嬗嬘嬙嬚嬛嬜嬝嬞嬟嬠嬡嬢嬣嬤嬥嬦嬧嬨嬩嬪嬫嬬嬭嬮嬯嬰嬱嬲嬳嬴嬵嬶嬷嬸嬹嬺嬻嬼嬾嬿孀孁孂孃孄孅孆孇孈孉孊孋孌孍孎孏安宼巕桜汝珱窛窭篓籹耍肗蒆邚釹钕㓂㚢㚣㚣㚤㚥㚦㚧㚨㚩㚪㚫㚬㚭㚮㚯㚰㚱㚲㚳㚴㚵㚶㚷㚸㚹㚺㚻㚼㚽㚾㚿㛀㛁㛂㛃㛄㛅㛆㛇㛈㛉㛊㛋㛌㛍㛎㛏㛐㛒㛓㛔㛕㛖㛗㛘㛙㛚㛛㛜㛝㛞㛟㛠㛢㛣㛤㛥㛦㛧㛨㛩㛪㛫㛬㛭㛯㛰㛱㛲㛳㛵㛶㛷㛸㛹㛺㛻㛼㛽㛾㛿㜀㜁㜂㜃㜄㜅㜆㜇㜈㜉㜊㜋㜌㜍㜎㜏㜐㜑㜒㜓㜔㜕㜖㜗㜘㜙㜚㜛㜜㜝㜞㜠㜡㜢㜣㜤㜥㜦㜧㜨㜩㜪㜫㜬㜭㜮㜯㜰㜱㜲㜳㜴㜵㜶㜷㜸㜹㜺㜻㜼㣽䆯䋝䎟䧪䶒䶯𠆈𠈍𠈤𠊢𠊶𠋄𠍛𠕷𠚰𠧜𠯆𠳴𠶭𠹷𡄨𡇔𡇔𡇦𡇭𡇭𡉓𡓫𡘘𡘘𡚦𡚧𡚪𡚫𡚬𡚭𡚮𡚯𡚰𡚱𡚲𡚳𡚴𡚵𡚶𡚷𡚸𡚹𡚺𡚻𡚼𡚽𡚾𡚿𡛀𡛁𡛂𡛃𡛄𡛅𡛆𡛇𡛈𡛉𡛊𡛋𡛌𡛍𡛎𡛏𡛐𡛑𡛒𡛓𡛔𡛕𡛖𡛗𡛘𡛙𡛚𡛛𡛜𡛝𡛞𡛟𡛠𡛡𡛣𡛤𡛥𡛦𡛧𡛨𡛩𡛪𡛫𡛬𡛮𡛯𡛰𡛱𡛲𡛳𡛴𡛵𡛶𡛸𡛹𡛺𡛻𡛼𡛽𡛾𡛿𡜀𡜁𡜂𡜃𡜄𡜆𡜇𡜈𡜉𡜊𡜋𡜌𡜍𡜎𡜏𡜐𡜑𡜒𡜓𡜔𡜕𡜖𡜗𡜘𡜘𡜙𡜚𡜛𡜜𡜝𡜞𡜟𡜠𡜡𡜢𡜣𡜤𡜥𡜦𡜧𡜨𡜩𡜪𡜫𡜬𡜭𡜮𡜯𡜰𡜱𡜲𡜳𡜴𡜵𡜶𡜷𡜸𡜺𡜼𡜽𡜿𡝀𡝁𡝂𡝃𡝄𡝅𡝇𡝈𡝈𡝊𡝋𡝋𡝌𡝍𡝎𡝏𡝐𡝑𡝒𡝓𡝓𡝔𡝕𡝖𡝗𡝘𡝙𡝚𡝛𡝜𡝝𡝞𡝟𡝠𡝡𡝢𡝣𡝥𡝦𡝧𡝨𡝩𡝪𡝫𡝯𡝰𡝱𡝲𡝳𡝴𡝵𡝶𡝹𡝺𡝻𡝼𡝽𡝾𡞀𡞁𡞂𡞃𡞄𡞅𡞆𡞇𡞈𡞉𡞉𡞋𡞌𡞍𡞎𡞏𡞐𡞑𡞒𡞓𡞔𡞕𡞘𡞙𡞚𡞛𡞜𡞝𡞞𡞟𡞠𡞡𡞢𡞣𡞤𡞦𡞨𡞩𡞪𡞫𡞬𡞭𡞮𡞯𡞰𡞱𡞲𡞳𡞴𡞵𡞶𡞷𡞸𡞺𡞼𡞽𡞾𡞿𡟀𡟁𡟂𡟃𡟄𡟅𡟈𡟉𡟊𡟋𡟌𡟍𡟏𡟐𡟑𡟒𡟒𡟓𡟕𡟖𡟘𡟘𡟙𡟚𡟛𡟜𡟝𡟞𡟟𡟡𡟢𡟣𡟤𡟥𡟦𡟨𡟩𡟪𡟫𡟭𡟮𡟯𡟰𡟱𡟲𡟳𡟴𡟵𡟶𡟷𡟸𡟹𡟺𡟻𡟽𡟾𡠀𡠁𡠂𡠃𡠄𡠅𡠆𡠇𡠈𡠉𡠊𡠋𡠌𡠎𡠏𡠐𡠒𡠓𡠔𡠕𡠖𡠗𡠘𡠙𡠚𡠛𡠜𡠝𡠞𡠟𡠠𡠡𡠣𡠤𡠥𡠦𡠧𡠨𡠩𡠪𡠫𡠬𡠭𡠮𡠯𡠯𡠱𡠲𡠳𡠴𡠵𡠶𡠷𡠸𡠹𡠻𡠼𡠽𡠾𡠿𡡀𡡁𡡂𡡃𡡄𡡅𡡆𡡇𡡈𡡊𡡌𡡎𡡎𡡏𡡐𡡑𡡒𡡓𡡔𡡕𡡖𡡘𡡙𡡚𡡛𡡜𡡝𡡞𡡠𡡢𡡣𡡥𡡦𡡧𡡨𡡩𡡪𡡫𡡬𡡮𡡯𡡰𡡱𡡲𡡴𡡵𡡶𡡷𡡸𡡹𡡺𡡻𡡼𡡽𡡾𡡿𡢀𡢁𡢂𡢃𡢄𡢆𡢇𡢈𡢉𡢊𡢋𡢌𡢍𡢎𡢏𡢐𡢑𡢒𡢓𡢔𡢕𡢗𡢘𡢙𡢛𡢜𡢝𡢞𡢞𡢟𡢠𡢡𡢢𡢣𡢥𡢦𡢧𡢩𡢫𡢭𡢮𡢯𡢯𡢰𡢰𡢱𡢲𡢳𡢴𡢵𡢶𡢷𡢸𡢻𡢼𡢽𡢾𡢿𡣀𡣁𡣂𡣃𡣄𡣅𡣆𡣇𡣈𡣊𡣌𡣍𡣎𡣏𡣐𡣑𡣒𡣓𡣔𡣕𡣖𡣗𡣘𡣙𡣚𡣛𡣜𡣝𡣞𡣠𡣡𡣣𡣥𡣥𡣦𡣧𡣨𡣩𡣪𡣫𡣬𡣭𡣮𡣯𡣰𡣱𡣲𡣳𡣴𡣵𡣶𡣷𡣸𡣹𡣻𡣼𡣽𡣾𡣿𡤀𡤁𡤂𡤃𡤄𡤆𡤇𡤈𡤉𡤋𡤌𡤎𡤏𡤐𡤑𡤒𡤕𡤖𡤗𡤘𡤙𡤚𡤛𡤜𡤝𡤞𡤠𡤡𡤢𡤣𡤤𡤥𡤧𡤨𡤩𡤪𡤫𡤬𡤭𡤯𡤰𡤱𡤲𡤴𡤵𡤶𡤷𡤸𡤹𡤺𡤻𡥃𡪋𡪚𡫤𡫽𡲹𢇘𢋉𢑒𢖵𢙗𢟇𢠖𢡌𢢷𢧛𢨭𢬰𢳒𢿘𣅓𣍲𣒹𣔃𣕩𣫻𣯲𣰝𣰟𣱘𣳐𣷑𣽦𣽮𤄞𤍻𤕢𤖩𤘙𤣷𤤢𤯕𤹴𥁅𥆸𥖃𥚿𥤨𥧚𥨲𥫭𥶄𥶫𥷶𥸏𥹰𦎕𦑔𦔪𦘽𦣬𦩩𦬑𦮗𦯏𦯺𦯽𦰇𦰓𦰕𦰾𦲛𦲝𦲣𦲨𦲼𦳨𦳹𦴣𦵎𦵘𦶞𦶥𦶦𦶲𦷪𦷵𦸅𦹅𦻯𦽚𦽵𦾄𦾘𦾡𦾦𦾨𧁘𧞡𧦣𧨐𧴱𧶬𧷚𧺜𨈼𨐎𨐭𨖔𨘒𨳐𨵇𨺿𨻤𨼻𨽘𩁻𩃩𩈽𩈾𩉆𩒭𩔗𩖠𩛅𩛌𩛏𩛗𩜝𩨚𩱆𩹚𪏮𪏼𪏾𪔈𪜨𪥤𪥥𪥦𪥧𪥨𪥩𪥪𪥫𪥬𪥭𪥮𪥰𪥱𪥲𪥳𪥴𪥵𪥶𪥷𪥹𪥺𪥼𪥽𪥿𪦀𪦁𪦂𪦃𪦄𪦅𪦇𪦈𪦊𪦋𪦌𪦎𪦏𪦑𪦒𪦓𪦔𪦕𪦖𪦗𪦗𪦘𪦙𪦚𪦛𪦜𪦝𪦞𪦠𪦡𪦢𪦣𪦤𪦥𪦦𪦧𪦨𪦩𪦪𪦫𪦬𪦮𪦯𪦰𪦱𪦳𪦴𪦵𪧋𪧙𪧵𪭏𪮄𪱴𫀁𫁙𫌜𫌳𫑂𫒈𫖟𫗤𫘺𫝦𫝧𫝨𫝪𫝫𫝬𫝭𫝮𫥟𫨧𫨪𫰆𫰇𫰈𫰉𫰊𫰋𫰌𫰍𫰎𫰏𫰐𫰑𫰒𫰓𫰔𫰕𫰖𫰗𫰘𫰙𫰚𫰛𫰜𫰝𫰞𫰟𫰠𫰡𫰢𫰣𫰤𫰥𫰦𫰧𫰨𫰩𫰪𫰫𫰬𫰭𫰮𫰯𫰰𫰱𫰲𫰳𫰴𫰵𫰶𫰷𫰹𫰺𫰻𫰼𫰾𫰿𫱀𫱁𫱂𫱃𫱄𫱆𫱇𫱈𫱉𫱊𫱋𫱌𫱍𫱎𫱐𫱑𫱓𫱔𫱕𫱗𫱘𫱙𫱚𫱛𫱜𫱝𫱞𫱟𫱠𫱡𫱢𫱣𫱥𫱦𫱨𫱫𫱭𫱮𫱯𫱰𫱱𫱲𫱳𫱴𫱵𫱶𫱷𫱹𫱺𫱻𫱼𫱽𫱾𫱿𫲀𫲁𫲂𫲃𫲄𫲅𫲆𫲇𫲈𫲉𫲊𫲋𫲌𫲍𫲎𫲏𫲐𫲑𫲒𫲓𫲔𫲕𫲖𫲗𫲘𫲙𫲚𫲛𫲝𫲞𫲟𫲠𫳮𫶯𫷣𫹌𫾺𬅏𬅘𬉑𬉫𬢁",
 "丵": "凿𡭊𢹸𣪲𥽦𦦹𧎲𨯳",
 "刃": "丒𠛇𠛝𠜨𡟂𡟂𡮊𢙟𣏉𣑗𤟁𥁤𫞿忍",
 "不": "丕伓吥否囨奀妚嫑孬怀抔杯歪炋环甭盃紑罘肧芣衃覔还鈈钚阫鴀㔻㞸㫘㳅㶨㶪䞜䬩䬪䯱𠀰𠀱𠀾𠁃𠁋𠁌𠁍𠁒𠁓𠁙𠁛𠁞𠂾𠋊𠘶𠤯𠮘𠲇𠶙𠸟𡀆𡄂𡈯𡉤𡍂𡥢𡬇𡮗𢆓𢑽𢑽𢑽𢑽𢗫𢚬𢞾𢯒𢴓𣈇𣎈𣕨𣘏𣛓𣦚𣨀𣲮𣳶𣵏𤒳𤒳𤔹𤔹𤖯𤘢𤘮𤬭𤯚𤰺𤷁𥄓𥉿𥐴𥚳𥝣𥟼𥠍𥤔𦀰𦈧𦏀𦕪𦙂𦝽𦤹𦱷𧉈𧖯𧗩𧶏𧿤𨚀𨟷𨱥𨳫𩂆𩑢𩓄𩖲𩫇𩬴𩵣𪜄𪟪𪧽𫐾𫛜𫠫𫠬𫠭𫠭𫠲𫠶𫠻𫭒𬦇𬩀𬴜",
 "内": "丙呐呙氝汭笍納纳肭芮蚋衲訥讷豽軜鈉钠靹魶㐻㕯㘨㶧䄲䟜䪏𠋮𠙙𠫣𠮂𡭇𡶀𢌷𢏟𢡭𢬷𣃰𤬲𤱅𥣉𥪞𥰓𦀼𦓠𨁧𨔒𨦳𨬺𩃠𩏼𩓷𩖯𩟿𩣁𪌅𪧿𫀃𫐇𫤩𫴹𫴻𫵓𬹻",
 "氶": "丞㞼𠄪𠚚𠚚𠰿𠶫𡍅𢀷𢌼𢪻𢫒𢬠𣚹𣬻𣼏𤇏𤍭𥑝𦭕𧯢𧯷𨌱𨍗𨚡𪱝𫏵",
 "去": "丟丢佉刦刧刼劫却厾叝呿唟弆怯抾朅法灋珐盍砝祛紶罢罴胠袪詓迲鉣阹魼麮鼁㥘㧁㫢㭕㰦㹤㾀䏻䒧䖔䟩䪺䮃䵽𠉨𠘾𠝛𠞗𠞗𠡺𠣗𠩂𠫳𠫴𠫾𠬃𠬇𠬈𠬉𠬑𠬑𠬑𠬒𠬕𠬖𠳊𠳌𡊛𡒹𡕮𡛠𡮊𡱅𡲨𢍨𢕿𢖡𢫀𢭋𢯃𣓹𤂠𤄝𤙏𤳖𤳗𤳛𤼴𤿜𥂊𥂊𥎰𥙒𥞋𥨜𥬔𥹓𦚒𦛶𦳰𧉧𧺷𨅫𨇞𨚫𨝈𨧶𩇘𩢧𩣴𩬨𩿟𩿹𪚸𪠝𪠞𪠢𪢳𪪕𪸘𫉵𫍜𫤷𫨬𫨭𫨮𫨯𫨰𫨱𫼒𬃚𬅻𬓞𬘛𬡺𬪻",
 "井": "丼刱囲坓妌宑汫汬畊穽耕肼讲进阱㐩㐩㓝㘫㴁䎴䨍𠄺𠚎𠛝𠝆𠦈𠭗𠭢𠭮𠯤𡌒𡖚𡭆𢍘𢒈𢪝𢰎𣂗𣊼𣏨𣡜𣡡𣥟𣲜𣸕𤦨𤮖𥅶𥐹𥝷𥨗𥬆𦕡𦧏𧆒𧆒𧶥𧶥𧶩𨐨𨙷𨥙𨦕𨳩𨸥𩾺𪔏𪜅𪪁𪰉𪱶𪴲𫎁𫟝𫡋𫡳𬆓𬑽𬙍𬜣𬟷𬪦",
 "之": "乏椘芝㝎㞫𠯣𡘕𡭿𢾘𦥧𦮩𧉌𧩰𨪯𩖳𪢇𪦆𫡛𫩝𬔱",
 "丘": "乒乓屔岳岴拞茊虗蚯邱駈㚱㳋䂡䟬𠇯𠬿𠰋𡊣𡒾𡘄𡲌𡶦𢇹𣉠𣢥𣧭𤞈𤵢𥅔𥏾𥙂𥙠𥬨𥿤𧇲𧦺𧲰𧻁𨈬𨐻𨚬𨿻𩨼𩬡𩴛𩿨𪖛𪟘𪯫𪲀𪽽𫒒𫘶𫠴𬮾𬰘",
 "下": "乤卞吓忑梺疜芐虾閇雫颪𠀝𠀨𠀳𠀴𠀿𠁄𠁑𠁚𠖈𠧗𠧥𠧥𠮴𠱚𡬈𢇗𢗄𢩹𣃟𣍋𣏣𣗱𣲉𤲂𥤲𥫫𥬷𥰊𧘔𧧎𧺒𨑜𨵰𨵰𨵰𪧍𪨢𪱱𪵩𫇥𫠧𫠪𫠮𫠯𫠰𫠳𫡲𫢵𫰈𫴋𬀧𬇭𬍏𬔋𬔗𬕹𬙖𬺗",
 "乊": "乥",
 "斗": "乧呌戽抖斘料斚斛斜斝斞斟斠斡斢斣枓炓科紏蚪酙鈄钭閗阧鬦魁㖍㘰㞳㪴㪵㪶㪷㪸㪹㪺㪻㳆㸯㺶䀞䇆䚵䢏﨣𠒚𠒡𡀧𡗴𡯏𡰷𢗸𢡨𣁮𣁯𣁰𣁱𣁲𣁳𣁴𣁵𣁶𣁷𣁸𣁹𣁺𣁼𣁽𣁾𣁾𣁾𣁿𣂀𣂁𣂂𣂃𣂄𣂅𣂆𣂇𣂈𣂉𣂌𣂍𣂏𣂐𣃜𣙞𣬯𣷊𤓺𤯘𤾍𥁇𥐿𥦖𥱦𦆫𦮜𦻶𦼄𧏆𧐝𧐵𧘞𧠕𧤰𧴼𧺯𧿫𨋼𨶜𩑯𩫄𩰮𩵬𩿚𪌉𪖘𪚛𪞒𪯫𪯬𪯭𪯮𪰍𫁵𫔯𫖗𫩰𫴣𫺅𫼼𫿳𫿴𫿵𫿶𫿷𬖠𬣟𬷄",
 "台": "乨佁兘冶刣咍囼始孡怠怡抬枱枲殆治炱炲珆瓵眙秮笞紿绐耛胎苔袬詒诒貽贻跆軩辝迨邰鈶颱飴駘骀鮐鲐齝㣍㰧㾂𠁯𠄩𠈂𠊝𠏓𠡇𠳙𠼷𠾖𡖤𢦯𢲚𢼉𣅿𣖤𣙼𣣿𣭆𤊜𤐮𤒞𤫳𥁐𥙉𥧺𥹋𧉟𧠜𨐹𨾃𨾱𩎞𩒎𩢠𩬠𩲥𩿡𪠗𪡳𪱜𪿘𫖭𫢼𫨩𫩞𬃋𬆗𬔠𬨹𬭀",
 "加": "乫伽咖哿嗧嘉妿拁架枷毠泇珈痂笳耞茄袈賀贺跏迦鉫駕驾鴐㔖㖙㚙㚳㠰㤎㧝㹢䂟䪪䴥𠌳𠡐𡊗𡶐𡶥𢝟𣭋𤇞𤙄𥑆𥝿𥹌𥿃𦙲𦙺𦨦𧉪𧊀𧦤𧦲𧻅𨚧𩊏𩶛𪀁𪗬𪟗𪨎𪰘𫈠𫉕𫛤𫦥𫦹𫦹𫦹𬸇",
 "巨": "乬佢壾奆姖岠弡怇拒昛柜歫洰炬煚矩秬粔耟苣蚷螶衐詎讵距鉅钜駏鮔䋌䢹䣰䶙𠰠𡗐𡞮𡬡𢀥𢀦𢀧𢀨𢀬𢀭𢀮𢀱𢀲𢄫𢆢𢆩𢼑𣁔𣙬𤋝𤌮𤔋𤝙𤦲𥂇𥂷𥄷𥑭𥓼𥘹𥩰𥬙𦂘𦊐𧩆𧲽𧺹𨐣𨒑𨳽𩉸𩿝𪀏𪊤𪌖𪏣𪟭𪩤𪩥𪩦𪩧𪩨𪩩𪩪𪭘𪰩𫗎𫴙𬋀",
 "石": "乭佦劯唘妬宕岩拓斫柘槖橐沯沰泵炻矴矵矶矷矸矹矺矻矼矽矾矿码砂砃砄砅砆砇砈砉砊砋砌砍砎砏砐砑砒砓研砕砖砗砘砙砚砛砜砝砞砟砠砡砢砣砤砥砦砧砨砩砪砫砬砭砮砰砱砲砳砳破砵砶砷砸砹砺砻砼砽砾砿础硁硂硃硄硅硆硇硈硉硊硋硌硍硎硏硐硑硒硓硔硕硖硗硘硙硚硛硜硝硞硟硠硡硢硣硤硥硦硧硨硩硪硫硬硭确硯硰硱硲硳硴硵硶硷硸硹硺硻硼硽硾硿碀碁碂碃碄碅碆碇碈碉碊碋碌碎碏碐碑碒碓碔碕碖碗碘碙碚碛碜碝碞碟碠碡碢碣碤碥碦碧碨碩碪碫碬碭碮碰碱碲碳碴碵碶碷碸碹確碻碼碽碾碿磀磁磂磃磄磅磆磇磈磉磊磊磊磋磌磍磎磏磐磑磒磓磔磕磖磗磘磙磚磛磜磝磞磟磠磡磢磣磤磥磦磧磨磩磪磫磭磮磯磰磱磲磳磴磵磶磷磸磹磺磻磼磽磾磿礀礁礂礃礄礅礆礇礈礉礋礌礍礎礏礑礒礔礕礖礗礙礚礛礜礝礞礟礠礡礣礤礥礦礧礨礩礪礫礬礭礮礯礰礱礲礳礴礵礶礷礸礹祏蠧蠹袥跖鉐雼鮖鼫㓈㸴㻹䀾䂖䂗䂘䂙䂚䂛䂜䂝䂞䂟䂠䂡䂢䂣䂤䂥䂦䂧䂨䂩䂪䂫䂬䂭䂮䂯䂰䂱䂲䂳䂴䂵䂷䂸䂹䂺䂻䂼䂽䂾䂿䃀䃁䃂䃃䃄䃅䃆䃇䃈䃉䃊䃋䃌䃍䃎䃏䃐䃑䃒䃓䃔䃖䃗䃘䃙䃚䃛䃜䃝䃞䃟䃠䃡䃢䃣䃤䃥䃦䃧䃨䃩䃪䃫䃬䃭䃮䃯䃰䃱䃲䃳䃴䃵䃶䃷䃸䃹䃺䃻䄷䇉䖨䞠䦒䲽𠚈𠰴𠶡𠷠𠹶𡇈𡇱𡈔𡈔𡊵𡌇𡍟𡎂𡐍𡨮𡫰𡯝𡶌𡶪𡻦𢄿𢅍𢆇𢳭𢷌𣒊𣕥𣗁𣚱𣝔𣞏𣡖𣭏𣶥𣶦𣷮𣼤𤀦𤃏𤊠𤋛𤌫𤎃𤤟𥇼𥐕𥐗𥐙𥐚𥐛𥐜𥐝𥐟𥐠𥐡𥐢𥐣𥐤𥐥𥐦𥐧𥐨𥐩𥐪𥐫𥐬𥐭𥐮𥐯𥐱𥐲𥐳𥐴𥐵𥐶𥐷𥐸𥐹𥐺𥐻𥐼𥐽𥐾𥐿𥑀𥑁𥑂𥑃𥑄𥑅𥑆𥑇𥑈𥑉𥑊𥑋𥑌𥑍𥑎𥑏𥑐𥑑𥑒𥑔𥑕𥑖𥑗𥑘𥑙𥑚𥑛𥑜𥑝𥑞𥑟𥑠𥑢𥑣𥑤𥑥𥑦𥑧𥑨𥑩𥑪𥑫𥑭𥑮𥑰𥑱𥑲𥑳𥑴𥑵𥑶𥑷𥑸𥑹𥑺𥑻𥑼𥑽𥑾𥑿𥒀𥒁𥒂𥒃𥒄𥒅𥒆𥒉𥒊𥒋𥒌𥒍𥒎𥒐𥒑𥒒𥒓𥒕𥒖𥒗𥒘𥒙𥒚𥒛𥒜𥒝𥒞𥒟𥒡𥒢𥒣𥒤𥒥𥒦𥒧𥒨𥒩𥒪𥒫𥒬𥒭𥒮𥒯𥒰𥒱𥒲𥒴𥒵𥒶𥒷𥒸𥒹𥒺𥒻𥒼𥒽𥒾𥒿𥓀𥓁𥓂𥓃𥓄𥓅𥓆𥓆𥓇𥓈𥓉𥓊𥓋𥓌𥓍𥓎𥓏𥓐𥓑𥓓𥓔𥓖𥓗𥓘𥓙𥓛𥓜𥓝𥓞𥓟𥓡𥓢𥓣𥓤𥓥𥓦𥓧𥓨𥓩𥓩𥓪𥓫𥓬𥓭𥓮𥓯𥓰𥓱𥓲𥓳𥓴𥓶𥓷𥓸𥓹𥓺𥓼𥓽𥓾𥔀𥔁𥔂𥔃𥔅𥔆𥔇𥔈𥔉𥔊𥔋𥔌𥔍𥔎𥔏𥔐𥔒𥔓𥔔𥔕𥔕𥔖𥔗𥔘𥔙𥔚𥔛𥔜𥔝𥔟𥔠𥔡𥔢𥔣𥔥𥔦𥔧𥔨𥔩𥔪𥔬𥔮𥔯𥔰𥔱𥔲𥔳𥔴𥔴𥔷𥔸𥔹𥔺𥔻𥔼𥔽𥔾𥔿𥕀𥕁𥕂𥕃𥕄𥕅𥕆𥕇𥕈𥕉𥕊𥕋𥕌𥕍𥕎𥕏𥕐𥕑𥕒𥕓𥕕𥕖𥕘𥕙𥕙𥕚𥕛𥕜𥕝𥕝𥕞𥕟𥕠𥕡𥕢𥕣𥕤𥕥𥕦𥕧𥕨𥕩𥕪𥕫𥕬𥕭𥕮𥕯𥕰𥕱𥕲𥕳𥕵𥕶𥕷𥕸𥕹𥕺𥕻𥕼𥕽𥕾𥕿𥖀𥖁𥖂𥖃𥖄𥖅𥖆𥖇𥖈𥖉𥖊𥖋𥖌𥖍𥖎𥖐𥖒𥖔𥖗𥖘𥖙𥖚𥖛𥖜𥖝𥖟𥖠𥖡𥖣𥖥𥖦𥖧𥖨𥖩𥖫𥖬𥖭𥖮𥖯𥖰𥖱𥖲𥖳𥖴𥖶𥖷𥖸𥖹𥖻𥖼𥖽𥖾𥖿𥗀𥗁𥗂𥗃𥗄𥗅𥗆𥗇𥗈𥗉𥗉𥗉𥗉𥗊𥗋𥗌𥗍𥗎𥗏𥗐𥗑𥗒𥗓𥗔𥗕𥗖𥗗𥗘𥗙𥗚𥗛𥗜𥗝𥗞𥗟𥗠𥗡𥗢𥗣𥗥𥗦𥗨𥗩𥗫𥗬𥗭𥗮𥗯𥗰𥗱𥗲𥗲𥗳𥗴𥗵𥗶𥗷𥗸𥗹𥗺𥗻𥗼𥗽𥗾𥗿𥘀𥘁𥘂𥘃𥘄𥥔𥦼𥵼𦂥𦃧𦚈𦛯𦯰𦰒𦲼𦷦𦷩𧑠𧑧𧓜𧓮𧦳𧵔𧽔𨀂𨂽𨋓𨒙𨔙𨥴𨫛𨮀𩏮𩥟𩧕𩧕𩸷𪊞𪔑𪰒𪿑𪿒𪿓𪿔𪿕𪿖𪿗𪿘𪿙𪿚𪿛𪿜𪿝𪿞𪿟𪿠𪿡𪿢𪿣𪿤𪿥𪿦𪿧𪿨𪿩𪿪𪿬𪿭𪿮𪿯𪿰𪿱𪿲𪿳𪿴𪿵𪿶𪿷𪿺𪿻𪿼𪿾𪿿𫁜𫂹𫅂𥐝磌𫮇𫹺𬑹𬑺𬑻𬑼𬑽𬑾𬑿𬒀𬒁𬒂𬒃𬒄𬒅𬒆𬒇𬒈𬒉𬒊𬒋𬒌𬒍𬒎𬒏𬒐𬒑𬒒𬒓𬒔𬒕𬒖𬒗𬒘𬒙𬒚𬒛𬒝𬒞𬒟𬒠𬒡𬒢𬒣𬒤𬒥𬒦𬒨𬒪𬒫𬚩𬚩𬚩𬬷",
 "卯": "乮奅峁昴柳泖珋窌笷茆鉚铆飹駠㚹㡻㧕㶯𠇩𠛓𠥰𠨡𠨣𠰭𡊎𡊧𡋫𡧙𡹥𢨺𣼾𤵠𥄸𥨚𦊑𧖰𧖱𧤝𨋖𨒖𨥫𨮃𨴅𩂞𩊅𩖴𩛁𩥖𪄽𪕋𪨫𫚵𥛅𫰸𬁬𬆆𬆱𬈢𬣌",
 "乎": "乯呼泘烀苸虖軤轷雽㭔䉿䤣䴣𠇼𠏸𠏸𡛚𢨽𣧯𤇠𤝘𤵡𥣾𥬏𧦝𩄗𩶈𪏹𪕉𪩀𫊯𫍞𫗶𫚶𫼞𬏃",
 "头": "买卖实𢙑𬠁",
 "舌": "乱佸刮咶姡恬憩括敌栝活狧甛甜秳筈絬舐舑舓舔舕舙舙舙舚蛞話话趏辞适銛铦頢颳餂髺鴰鸹㔚䑙䑚䑛䑜䞌䣶𠻉𡭏𢠾𢼤𣢯𣭪𤭇𥚇𥶕𦧆𦧇𦧈𦧉𦧊𦧋𦧌𦧍𦧎𦧏𦧐𦧑𦧒𦧓𦧕𦧖𦧗𦧘𦧙𦧚𦧚𦧛𦧝𦧞𦧟𦧠𦧢𦧣𦧤𦧥𦧦𦧧𦧨𦧩𦧪𦧫𦧬𦧭𦧮𦧯𦧰𦧱𦧲𦧳𦧴𦧵𦧵𦧵𦧷𦧹𦧺𦧻𦧼𦧽𦸈𧮥𧮥𨯐𨯐𪌩𪎾𪗽𪙶𪶞𫇔𫇖𫇗𫇘𫕛𫫞𫬎𫳸𬚸𬛥𬜅𬜆𬜇𬜈𬜉𬜊𬜌𬜎𬜏𬜐𬪴𬱠𬵏𬺄",
 "次": "乲佽咨垐姿恣栥栨楶瓷盗秶粢絘羡茨資资趑餈䅆䢭䨏䪡䪢䪣䯸䳐𠃻𠸆𡤜𡷑𢙊𥂉𥖄𥗢𥴃𥿩𦈱𧊒𧫎𧫺𨀥𨋰𨒮𨣕𨦠𩐊𩐑𩐒𩶲𩽑𪅵𪶻𪾪𫻢𬁦𬁼𬅧𬏗𬓯𬚺𬢤",
 "孚": "乳俘哹嗠娐孵捊桴殍浮烰琈稃筟粰綒罦脬艀莩蜉郛酻鋢馟㔜㟊㲗䞯䨗䱐䳕䴸𡥭𡦄𡦢𢅁𢒒𣫃𣫌𣼔𤂆𤙤𤞲𤶖𥆬𥒫𥚀𥦘𦈴𦋄𦖀𧇧𧠾𨴫𨹴𨿚𩓖𩳎𪨁𪭐𪭒𫼍𫿴𬅦𬐕𬲺",
 "折": "乴哲哳娎悊晢晣梊浙烲焎狾硩蜇裚誓踅逝銴㑜㝂㿱䀸䀿䁀䇽䋢䏳䓆䟷䩢䭁䱑𡏥𡘭𡝊𢂼𢏨𢴛𢼺𣇄𣨋𣩁𣩂𣼬𤄌𥍭𥺈𦕶𧋍𧑧𧶇𧻸𨄸𨦬𩗙𩣩𪁊𪘔𪮣𪲽𪻢𫎘𬗗",
 "辛": "乵厗宰屖峷嶭巕梓瓣瓣莘薛觪辜辝辞辠辡辡辢辣辤辥辪鋅锌騂骍㖕㖖㛙㢹㦚㦚㲔㳯㵷㵷㸉㸤㸤㾕䛨𠉄𡁈𡁈𡓹𡦣𡦯𡫊𡺰𡾤𡾦𡾹𢋖𢓫𢔭𢣑𢣑𢩞𣃎𣐽𣓀𣖅𣖸𣙼𣫖𤀲𤀲𤏻𤏽𤐮𤒞𤙡𤨘𤽮𥂚𥂿𥃌𥋑𥌊𥌊𥏔𥞽𥭴𦀓𦐹𦘄𦛛𦵮𦼧𦽆𦽵𦾨𧀕𧀼𧃈𧃎𧄘𧆈𧒣𧕏𧗶𧱏𨁅𨃛𨆳𨌍𨐍𨐎𨐏𨐑𨐒𨐓𨐔𨐖𨐗𨐘𨐙𨐚𨐛𨐜𨐝𨐞𨐟𨐠𨐡𨐣𨐤𨐥𨐦𨐧𨐩𨐪𨐫𨐭𨐮𨐰𨐰𨐱𨐱𨐲𨐳𨐵𨐵𨐶𨐷𨐸𨐹𨐺𨐼𨐼𨐿𨴲𩇡𩕺𩷔𪮷𪷣𪿢𫋁𫐚𫐛𫐜𫐝𫓅𫲲𬁪𬍧𬢹𬨖𬨗𬨘𬨙𬨚𬨛𬪬𬯁𬯶",
 "甫": "乶俌匍哺喸圃尃峬庯悑捕旉晡浦烳牖痡盙秿簠脯舖舗莆蜅補誧豧輔辅逋郙酺鋪铺陠餔鬴鯆鵏麱黼㕊㭪䀯䊇䋠䎍䝵䩉䪔䮒䯙𠃃𠗒𠜙𠧃𠬃𠿽𡜵𢌠𢒏𢱿𢳹𢼹𢽊𣑛𣨈𣭾𣹷𣺘𤖑𤗃𤗱𤙭𤞨𤰍𤰐𤿭𥒰𥙷𥪀𥮉𦂪𦓞𦻈𧁡𧻷𨁏𨴪𨿌𩈨𩊬𩒺𩠤𩭗𩳐𪁭𪤔𪤦𪩾𪷫𪺙𫗦𫚙𫜦𫜫𫧓𬅤𬍥𬳗𬷕",
 "沙": "乷唦娑挱挲桫桬猀痧硰莎裟逤閯髿鯊鯋鲨㲚㸺䣉䤬𠈱𡋷𡱳𢇄𢡸𢡾𢶌𣜤𣮅𣹇𣻅𥁲𥆝𥇇𥋐𦀛𦀟𦹈𧋊𩊮𩣟𩣠𩳑𪌮𪟜𪶼𬇭𬕍𬠋𬮪𬷙",
 "母": "乸呣姆拇栂每毑毒砪胟苺袰鉧㑄㝀㟂㺙䳇𠰔𡥓𡥘𡴋𡴛𡹆𡼺𢘃𢘓𢮇𢯈𣏭𣚺𣫭𣫮𣫯𣫯𣫰𣫲𣫴𣫿𣬀𣭇𣳗𣳠𤌖𤝕𤯟𤵝𥎳𥬦𦃫𦇨𦊏𦔣𦰓𦱞𦲝𧉯𧦥𧩒𧰷𧲕𧿹𨂭𨈶𨱱𨾥𩐸𩶋𫕢貫𬆷𬆸𬓻𬙰𬭁",
 "所": "乺齭㫹𢀦𢯢𣷲𪘷𫜭𫿐",
 "於": "乻唹旕棜淤瘀箊菸閼阏鯲㫇𡌧𢛨𢮁𣃶𣄒𣨝𤉪𤥽𨔆𨨡𪦟𫵦𬱍",
 "注": "乼霔㗟𥦠𨩾",
 "者": "乽偖啫奢媎屠帾斱暏暑楮槠殾渚煑煮猪琽瘏睹禇箸緒绪署翥著蝫褚覩觰諸诸豬賭赌赭踷都醏鍺锗闍阇陼鯺㗯㥩㨋㸙䐗䘄䡤䬡䰇䰞䰩䵭𠁂𠣰𡎉𡗀𡦡𡺐𢉜𢐼𢑳𢔪𢝬𢾀𣂃𣋐𣎧𣗓𣠕𣾻𤁛𤂩𤌄𤣘𥀁𥧏𥪤𦋧𦑥𦓍𦘠𦩳𦾧𦿀𧂤𧳯𨔾𨜞𨲘𨷄𩋵𩤜𩫭𩱰𪃙𪃲𪋏𪋑𪜕𪟈𫅶𫙀𫯽𫲬𫻷𫼏𬂈𬄊𬅩𬆰𬖡𬚍𬚍𬛃𬢎𬯯𬴢",
 "糸": "乿系紊素紥紧紫紮累絛絜絫絮絲絷綤綦綮緊縏縠縶縻繁繄繋繠繤繴纂纇纍萦辮顈颣鷥㬧䋀䋈䋕䋜䋢䋣䋯䋰䋷䌎䌓䌘䌠䒺䕷䘗𠍞𠛩𠪓𠬆𠬹𠮗𠮗𠮗𠹦𡀚𡈫𡱏𡾳𢀐𢀐𢊨𢍵𢏛𢏸𢐁𢑲𢑴𢬡𢳏𢹨𣊡𣊡𣎝𣑇𣞿𣤭𣪺𣴍𤃁𤕍𤕍𤦰𤬇𤸍𥃁𥆎𥼮𥾜𥾟𥾥𥾩𥾻𥿃𥿅𥿏𥿚𥿝𥿟𥿩𦀟𦀣𦀤𦀥𦀧𦁓𦁘𦁞𦂌𦂎𦂗𦂟𦃂𦃃𦃗𦃙𦃚𦃝𦃡𦃤𦃦𦄉𦄊𦄐𦄠𦄯𦄳𦅐𦅓𦅔𦅨𦅪𦅬𦅽𦅾𦆁𦆕𦆕𦆗𦆫𦆰𦇆𦇍𦇻𦈀𦈁𦈄𦈇𦈇𦕱𦦆𦷲𧃧𧆉𧆙𧗼𧧈𧪬𨗰𨘁𨤙𨷴𨷸𩧖𪦩𪫕𪫜𪬶𫃚𫃜𫃝𫃞𫃟𫃠𫃡𫃢𫃣𫃤𫃥𫃦𫃧𫃨𫃩𫃪𫃫𫃬𫃭𫃮𫃰𫃲𫃳𫃴𫃵𫃶𫃷𫃸𫃹𫃺𫃻𫃼𫃽𫃾𫃿𫄀𫄁𫄂𫄃𫄄𫄅𫄆𫄇𫄈𫄉𫄊𫄋𫄌𫄍𫄎𫄏𫄑𫄓𫄔𫄖𫄗𫄘𫉪𫊺𫋼𫕗𫧆𫩹𫱘𫳲𬃎𬏏𬗋𬗍𬗎𬗐𬗖𬗞𬗧𬗫𬗬𬗸𬘁𬘇𬘈𬘉𬘒",
 "旱": "亁哻娨悍捍晘桿焊猂皔睅稈筸貋趕銲駻㪋䏷䓍䛞䳚𠧄𡝎𡷛𢏥𢙶𢧀𢽎𣉡𣭸𣵡𤥚𤿧𦋁𦩅𦸋𨁄𨛎𨿑𩗤𫘣𬁔𬖝𬣸𬭍",
 "乞": "亁仡刉吃屹忔扢杚汔犵疙盵矻籺紇纥肐虼訖讫趷迄釳阣麧齕龁㩿㫓䇄䎢䒗䞘䢀䦍䩐䬣䰴𠀸𠄃𠄄𠄊𠄋𠖯𠚮𠠶𢇓𢖴𣢆𤑓𤣮𤰢𤱘𥝖𦨏𧆦𧆫𨊰𨰿𩑔𩛪𩠓𩨘𩰌𩾥𪐜𪟴𪨣𪸏𫎐𫷔",
 "粦": "亃僯噒嫾嶙憐撛斴暽橉潾燐獜璘甐疄瞵磷粼繗翷膦蹸轔辚遴鄰鏻隣驎鱗鳞麟㔂䗲䚏䚬䫰𠄈𡂰𡑝𡓏𡰚𡳞𡼵𡿑𢕸𢠴𢿻𣁣𤒑𤗷𤡩𥳞𥻋𥼭𦨆𦺸𧰢𧲂𨊌𨞁𩕔𩞻𪆞𪍴𫜏𫬪𬖨𬖩𬖿𬙈𬭸𬴊𬹸",
 "壹": "亄噎嬄懿撎曀殪潱皼豷饐鷧㙪㦉㦤㱅䊦𠍼𡤜𡬗𢦁𢦆𣰺𤡬𥗣𦠉𧬇𧯸𧰝𧴒𧹌𨶮𨸌𩻭𪆖𪤴𪭁𪳮𪾼𫯈𫻢𬤞𬬅",
 "丁": "亍亭仃厅叮奵宁寕寧帄庁忊打朾汀灯玎町甼疔盯矴糽耓艼虰訂订邒酊釘钉閅靪頂顶飣饤㐉㓅㣔㸘㼗䆑䟓䦺䰳𠀩𠀲𠀵𠁂𠄚𠅗𠅘𠕊𠤟𠯸𠳽𡗣𡧃𡧲𡨸𡨹𡨺𡰨𡴵𡹂𢆊𢗈𢧖𢧻𢬫𢴕𣄿𣆽𣑥𣛉𣲇𤘖𤡛𤱹𤳾𤴉𤹧𤿆𥑈𥞉𥢃𥫙𥸧𦉬𦒱𦘭𦙝𦨍𦬪𦭑𧌧𧌾𧖧𧪥𧯫𧰩𧵜𧸎𧹙𧹚𨊀𨊎𨊡𨭋𩁷𩒆𩠑𩡯𩾚𪏏𪛍𪟗𪥃𪥭𪵿𫔿𫝱𫞻𫟧寧成𫠢𫯍𫵲𫸨𬋨𬖧",
 "二": "云亖亖亗些亝仁勻夳弍忈竺貳贰銢㦐㫄㴉㷉𠀥𠄘𠄦𠄧𠄩𠄪𠄬𠄰𠄱𠄳𠄾𠄿𠅿𠆭𠇙𠇝𠇬𠍈𠓞𠕙𠚧𠛷𠣚𠤂𠤝𠧰𠬐𠬘𠭳𠮡𠮲𠴅𠴧𡆤𡆨𡆨𡇉𡊌𡐃𡖗𡚬𡜌𡦋𡰥𡱔𢎏𢎐𢎥𢟬𢦺𢨑𢨧𢩗𢬕𣊠𣍭𣐓𣣬𣥩𣵋𣹨𤅌𤆾𤈫𤚌𤚌𤚿𥄽𥄿𥅭𥊇𥋄𥐘𥓗𥞓𥨬𥫥𥱟𥴚𥴚𦁇𦄪𦐯𦗩𦜤𦠠𦣹𦣼𦨃𦫽𧂪𧔁𧥻𧥽𧵶𧵸𨅟𨑃𨑄𨒈𨖞𨢒𨳎𨳏𨶄𨹶𨹿𩐐𩖾𩦈𩩾𪑤𪒇𪱞𪳢𪵷𫕕况𫡱𫡸𫨔𫷡𫿭𬏵𬐜𬨜𬫖",
 "丌": "亓畀畁顨㚦䢋䪲䭶𡌸𡞑𢿯𣍠𣍣𤄑𤱿𤲦𥟗𥟞𥾎𦂢𧓧𧟦𧿄𨉅𩔅𫝁",
 "此": "些佌呰呲啙姕庛柴歶泚玼疵皉眥眦砦祡紪紫胔茈觜訾訿貲赀跐鈭雌頾頿飺骴髭鮆鴜齜龇㘹㠿㧗㧘㫮㭰㰣㱔䂑䂣䖪䘣䳄𠀢𠂱𠩆𠾋𡃸𡏨𡗼𡘌𡢍𡥎𢃌𢊳𢓗𣆟𣐑𣜁𣢙𣥥𣥨𣭁𤇬𤝭𤽤𤿙𥞅𥬳𦈬𦍧𦙼𦚚𧕓𧙁𧥕𧬟𧺼𧿿𨒤𨚖𨠐𨱲𨲝𨲦𨹀𩍳𩑽𩢑𩢭𩲨𩶆𪉈𪕊𪕑𪗶𪳡𫚖𬅿",
 "厽": "亝垒絫㕖㕘㴉𠬄𠬅𠬎𠬐𠬓𠬔𠬘𡽭𣕀𣦯𣳵𣸓𣺃𣺴𣾯𤡅𤯢𤲛𤳑𤸾𤹮𥓗𥔪𥕃𥜷𧀉𧏝𧵱𨒴𨹶𩅙𩥵",
 "父": "交斧爷爸爹爺蚥㕮㳇㸖㸗㸘㸙䭸𠀱𠇑𠚁𠜡𡵛𢚌𢨰𣺑𤕎𤕏𤕒𤕓𤕔𤕕𤕖𤕗𤕘𤕙𤕚𤕛𤱀𤱇𧉊𧒦𨊽𨗾𨥏𨾝𩂎𩳬𩵹𩽻𩾿𪅷𪺛𪺜𫇫𫙉𫷁𬋻𬋼𬥐",
 "了": "亨叾焏爳疗辽釕钌㝋䄦䑠𠄕𠄕𠄕𠄗𠄘𠆨𠆼𠙶𠚗𠮩𠰖𡎕𡐄𢆳𢙎𢚣𢞳𢩪𢩯𣁃𣎸𣒝𣧓𣧓𣬝𣱾𣵊𤁁𤆒𤽀𥤣𥾇𥾼𦋷𦛫𦥗𦫼𧘈𧺐𧺖𧾿𩍱𩫶𩵌𩾒𪌀𪜜𪞠𪟽𪡦𫘵𬈚𬚊𬶼𬷽𬹱",
 "亦": "亪変奕帟弈洂硛跡迹㑊𠅯𠅯𠪌𠲔𠸠𡍣𡙩𢙕𢼜𣖞𣚪𣷖𤥂𥿹𦮰𧊤𧏅𧙡𧧩𨀶𨏅𩎭𩷉𪁂𪊳𪬜𪮊𪶺𫒚𫔱𫼬𫿳𬀳𬁢𬒵𬖛",
 "乁": "亪气𫖪",
 "但": "亱𠜬𢭱𣵤𨵀𩊹",
 "乇": "亳仛厇吒奼宅托杔汑灹矺秅籷虴託讬飥馲魠㡯䨋𠣔𢏒𢖲𢩷𢫅𢯀𣅒𣓽𣧃𣳥𤕔𤜤𤣯𤫪𤰦𤴱𥁩𥝾𥭬𦘴𦨎𦬃𧘐𧧉𧯝𧲢𧿌𨀟𩑒𩱾𪌂𪐞𪣓𪺩𫒇𫾧𬦛",
 "九": "亴仇勼卆厹叴宄尻扏旭旮旯朹杂氿犰究肍艽虓訄訅軌轨釚頄馗骩鳩鸠鼽㐇㐜㐡㐤㔲㕤㭝㶢䊵䜪䧱䲥𠃙𠃙𠃩𠃳𠄁𠄆𠆷𠕴𠖂𠘪𠠵𠤙𠩇𠬚𠱞𠲙𠹝𡔮𡕞𡚪𡛪𡜉𡱧𡴴𡵐𢈑𢎩𢒂𢔞𢦎𢮴𣉑𣘑𣘑𣱍𣲶𣿏𤕛𤝊𤣬𤰙𤰚𤲽𤲽𤴦𤾋𥀦𥄌𥐜𥑅𥘧𥞇𥟵𥹛𦎚𦓏𦓑𦔱𦘵𦙈𦡽𦬡𦭉𦳹𧆟𧆬𧈤𧓛𧗝𧥠𧥭𧵞𧺎𧻆𨑍𨳊𨸒𨹡𨼡𨼡𩒟𩚻𩠒𩨔𩫴𩱼𩵍𩾛𪊌𪓒𪖒𪜔𪜗𪜙𪭹𪽇𫝲𫟲丸𣲼𫡤𫡤𫡤𫡦𫡰𫦬𫷥𬚉𬱓",
 "执": "亵兿势垫挚热絷蛰贽鸷𠢞𠢟𪠺𫐋𬏧𬔦𬡓",
 "㐭": "亶禀稟𡐴𤒀𤖣𤖧𥂬𥢺𨗍𪜥𪞌𪪨𪬹𪯜𪲪𫃅𫓞𫡿𫢀𫪮𫳖𫿧𬄜𬊥𬫫𬬟",
 "亨": "亸哼悙梈涥烹脝㧸𢚟𣨉𦨾𧨑𨧤𪻥𫭸𫰳",
 "单": "亸冁啴婵弹惮掸椫殚瘅禅箪蕲蝉觯郸阐䃅𢧐𥠐𥩎𥩑𦈎𧝧𨡙𪩷𫛴𫟠𫢸𫮃𫰂𬂅𬈁𬊤𬠷𬭙𬶛𬹤",
 "舋": "亹斖𤕊𧄸",
 "卜": "仆卟卡卦卧处外扑朴盀虲补訃讣赴釙钋鳪㓀㺪䃼䟔𠅄𠚩𠚬𠧙𠧞𠧦𠧨𠧩𠧬𠧮𠨉𠷳𡆥𡒩𢯜𣅃𣱶𣵝𤝥𤰘𤱈𤴩𥃨𥐚𥝒𥩖𥺩𥼎𦓦𦣰𧈓𧌷𧴤𨈒𨊣𨒓𨾇𩡭𩨓𩱻𪋿𪎍𪐙𪟾𪟿𪢱𪬄𪽁𫁰𫃚偺𣽞𫥒𫧮𫧰𫨦𫯱𫶽𬲥𬵂",
 "乃": "仍呄奶孕尕屷扔朶氖疓盁礽秀艿莻辸釢隽鼐㚉㞧㭁㭆㲌䄧䚮䯮𠂏𠂪𠂫𠂱𠛘𠮨𠯷𡉁𡕔𡥕𡥗𡦺𡧿𡩍𡭘𡻎𢒀𢒁𢖱𢘏𢝼𣅅𣏻𣐟𣕼𣤃𣫉𣱽𣲸𤆄𤜠𥙯𥚁𥚣𥟄𥬸𥾋𥿰𦙕𦞾𦨋𦮘𧁅𧈣𧈦𧊱𧘌𧙤𧤪𧧇𧻞𨢠𨨍𨭽𨸐𨾫𩀟𩜒𩺫𩾖𪜌𪣍𪥑𫂲𫞯𫞰𫡄𫡐𫡝𫴟𫶵𫹭𬊅𬔬𬝡𬤻𬦠𬩄",
 "丈": "仗扙杖粀㽴𠀋𡉋𡚹𢗆𣈡𤣸𧘓𨥅",
 "刃": "仞刅刼剏劒屻岃忍扨杒歰歰涩澀澀籾紉纫肕衂訒讱軔轫釰靭韌韧㠴㣼㥘㲽䀔䔼䔼䜀䜀䜧䜧䵑𠉨𠛂𠜤𠝵𠞕𠞴𠠐𠠠𠯄𡉔𥍞𥹭𥾠𥿷𥿷𪔺𪖔𪸐𫲶𬃩𬝰𬫎",
 "勺": "仢妁尥彴扚旳杓汋灼犳玓瓝畃的礿約约肑芍虳訋豹趵酌釣钓靮馰魡㢩㣿䂆䄪䋤䪨䵠䶂𠘷𠚭𠣳𠣷𠮭𡋝𡋝𡖑𡚷𢁕𢻭𣧀𤝧𤿈𤿉𥐝𥒙𥩘𥪈𥫩𥭖𥮀𦆗𦉹𦨓𦱜𦳹𦵈𧘑𧺕𩖚𩲃𩾡𪪊𪾠𫍍𫧂𬏀𬶄",
 "弋": "代弌弍弎式杙芅釴隿骮鳶鸢黓㚤㢤㢥㢦䄩䘝䞖䣧䬥䴬𠯅𢇙𢍼𢍽𢍾𢍿𢎂𢎃𢎄𢎅𢎆𢎈𢎉𢎊𢎋𢎏𢎐𢎑𢎒𢎓𢎕𢎖𢓀𢖺𢖼𢩮𣍑𣧆𤘚𤬩𤮼𤴵𥘒𥫝𥭿𥾐𦏵𦨒𧈩𧈱𧈺𧴮𧴰𧿑𨟲𨸽𨾍𩲭𩾢𪎈𪧝𪧝𪵫𫎊𫐟𬗋𬢜𬬩",
 "亽": "令倉罖食",
 "三": "仨兰叁弎閆闫㭅𠀎𠀧𠘹𠫰𠫽𠫽𠬄𠬅𠻰𠼛𡗗𡙄𡭚𢁚𢚮𤆜𤓸𤖚𤖚𤽫𧈵𧗭𨳔𩔤",
 "义": "仪舣蚁议𡵌𢣊𢭒𤜥𥆶𥐟𦛥𨟳𩉠𩑐",
 "么": "仫麽𡚸𢩻𣏈𤙋𤣵𤱔𥃼𥝠𧀋𨆽𩑑𩾮吆𬁲𬌫𬑼",
 "门": "们扪訚钔锎闩闪闫闬闭问闯闰闱闲闳间闵闶闷闸闹闺闻闼闽闾闿阀阁阂阃阄阅阆阇阈阉阊阋阌阍阎阏阐阑阒阓阔阕阖阗阘阙阚阛䦶䦷䦸𤀚𤇄𥆧𦝹𨷿𨸀𨸁𨸂𨸃𨸄𨸅𨸆𨸇𨸈𨸉𨸊𨸋𨸌𨸍𨸎𪡛𪡯𫔬𫔭𫔮𫔯𫔰𫔱𫔲𫔳𫔴𫔵𫔶𫔸𫩖𫹰𬦢𬮘𬮙𬮚𬮛𬮜𬮝𬮞𬮟𬮠𬮡𬮢𬮣𬮤𬮥𬮦𬮧𬮨𬮩𬮪𬮬𬮭𬮮𬮯𬮰𬮱𬮲𬮳𬮴𬮵𬮷𬮸𬮹",
 "刄": "仭劔釼靱𤇎𫦈",
 "反": "仮叛岅扳昄板汳炍版瓪畈皈眅粄舨販贩返鈑钣阪飯魬㤆㽹䛀䡊𠨹𠭔𠭤𠯘𡊃𡯘𢀁𢃻𢆕𢇪𢓉𣬆𥈍𥎮𥾩𥾵𦙀𦤇𧶶𧿨𨩵𩋛𩝘𩨩𩿔𪌆𪠫𪠭𫩍𫷰𬝔𬟸𬫋",
 "少": "仯劣吵妙尟尠抄杪歩毟沙炒玅省眇砂秒竗粆紗纱耖觘訬赻鈔钞隲魦麨㝹㝺㝻㠺䏚䒚䖢䟞䩖䯯䲵𠀰𠃣𠘔𠚺𠫴𡂌𡣯𡭝𡭟𡭥𡭲𡭸𡭹𡭺𡮀𡮏𡮏𡮏𡮑𡮓𡮗𡮘𡮞𡮦𡮯𡮴𡮹𡮻𡮼𡮿𡵯𢆷𢆽𢒮𢕱𢬰𢰜𣌱𣐣𣒹𣘽𣜮𣢒𣰲𣲦𣸌𣺟𣻖𣻾𣾾𤎤𤤉𤥮𤰬𤵌𤹊𥅷𥘤𥘷𥣀𥣀𥰚𥳦𦁗𦕈𦕉𦙧𦨖𧈅𧐑𧘡𧯊𨈘𨖸𨙹𨚈𨚒𨤢𨨚𨫺𨮽𨻶𩖥𩡾𩲎𩲿𩵮𩸌𪍉𪍉𪎊𪨄𪨆𪲦𪿉𫀾𫚌𫢡𫣪𫱧𫴻𫵊𫷲𫹶𬁀𬆠𬌜𬕓𬝃",
 "卬": "仰岇抑昂枊迎䀚䒢䤝䩕䭹𡊁𡊂𡵙𢓋𢗾𥸾𦕅𧥴𨋕𩑝𩾱𫆗𬒉",
 "比": "仳吡坒妣嫓屁庇批昆枇枈毕毖毗毘毙毞沘玭琵疪皆砒秕笓箆篦粃粊紕纰肶舭芘萞蓖蚍豼鈚阰魮㘩㲋㿫䀝䃾䘡䚹䩃䴡𠠤𠢒𠨒𠨽𠹦𠹮𡗬𡙟𡛗𡞂𡠌𡲩𡲮𢁦𢊩𢋟𢗽𢞗𢱧𢻹𢾱𣅜𣅪𣗸𣗽𣢋𣬆𣬇𣬈𣬉𣬊𣬌𣬏𣬔𣬖𣬗𣭤𣹮𤂏𤂢𤇹𤘤𤘥𤚪𤜻𤠞𤧰𤽊𤽏𤿎𥋨𥎬𥏉𥖷𥤻𥰑𥰕𥶕𥼡𦂬𦊁𦐳𦱔𦶃𦶰𦷅𦸿𦿙𧇂𧔯𧔻𧖕𧘱𧞟𧴀𧸸𧺲𧿥𨈚𨉊𨉮𨊗𨋅𨚍𨟵𨪡𨰅𨹼𨻀𨻘𨼄𩉫𩌟𩔙𩨨𩪅𩬈𩲖𩹻𪄢𪊕𪌈𪎬𪟫𪫠𪵕𫋪𫖝𫚰𫵏𬆹𬆺𬆻𬌾𬙌𬧱𬪹𬫹𬬫𬸲",
 "月": "仴刖岄抈明有朊朋朋朌服朎朏朐朑朒朓朔朕朖朘朙望朜朝朞期朠朡朢朣朤朤朤朤朥朦朧枂樃洕潃焨玥甧眀胡蚏跀迌鈅钥閒阴霡㞕㬳㬴㬵㬶㬷㬸㬹㬻㬽㬾㬿㭀㳉㵬㵻䄴䎳䑚䒿䚴䠌䢁䩗䳌𠆍𠉈𠉸𠉽𠎏𠕔𠦣𠪠𠯲𡐐𡕙𡝑𡞂𡢣𡣍𡦇𡨪𡲊𢆂𢉋𢕤𢗯𢚑𢛻𢜑𢣠𢫪𢭓𢮗𢲍𢶠𢺧𢻿𢼿𣌴𣍞𣍟𣍠𣍢𣍣𣍤𣍥𣍦𣍧𣍨𣍩𣍪𣍫𣍭𣍮𣍯𣍰𣍲𣍴𣍵𣍶𣍷𣍸𣍹𣍺𣍻𣍼𣍽𣍾𣍿𣎁𣎂𣎃𣎄𣎅𣎆𣎇𣎈𣎊𣎋𣎌𣎍𣎐𣎑𣎓𣎔𣎕𣎖𣎘𣎙𣎚𣎝𣎞𣎟𣎢𣎣𣎤𣎦𣎧𣎨𣎪𣎫𣎭𣎭𣎮𣎯𣎰𣎱𣎲𣓞𣔒𣔷𣡅𣱙𣶴𣷎𣷥𣹀𣼌𤄞𤅗𤅘𤋝𤟂𤟶𤡘𤦛𤫮𤭶𤯝𤰑𤰾𤷊𤷥𤸾𥀡𥀮𥁺𥁾𥂗𥅕𥊕𥛂𥞼𥥃𥦵𥨄𥫄𥬅𥭬𥮄𥰹𥳫𥵖𥷶𥸂𥸆𥸏𥺪𥺵𥾶𦇽𦊈𦊰𦌄𦏝𦏞𦗤𦘼𦙃𦙄𦙊𦙌𦙍𦙎𦙖𦙚𦙟𦙯𦙵𦙺𦙼𦚋𦚎𦚏𦚑𦛯𦜂𦜗𦜚𦜤𦜴𦝖𦞩𦟁𦟆𦡉𦢱𦦬𦴠𦹩𦻯𧟳𧟶𧩝𧫈𧱮𧱯𧲩𧵂𨅤𨇋𨊸𨌖𨐱𨓔𨕆𨕋𨗽𨘹𨙆𨝵𨡦𨡽𨨔𨱠𨶞𨻔𨼖𨼖𨼖𩃴𩄤𩎂𩔍𩟴𩢋𩥔𩮦𩲞𩳬𩵺𩹙𩺄𩿊𪅣𪊒𪏍𪗇𪚲𪝓𪟬𪠥𪢻𪣪𪤀𪱙𪱚𪱛𪱜𪱝𪱞𪱟𪱡𪱣𪱥𪱦𪱧𪱨𪱩𪱪𪱫𪱬𪱭𪲚𪵗𪵵𪶻𪹆𪾕𫆖𫆗𫆘𫆙𫆚𫆛𫆝𫆞𫆟𫆠𫆢𫆣𫆤𫆦𫆧𫆨𫆩𫆪𫆬𫆮𫆯𫆱𫆲𫆳𫆴𫆵𫆷𫆹𫆼𫆾𫇀𫇃𫎣𫔮𫕟𫢃𫢄𫥂𫨢𫰒𫱄𫲓𫵔𫿔𫿷𬁐𬁰𬁱𬁲𬁳𬁴𬁵𬁶𬁷𬁸𬁹𬁺𬁻𬁼𬁽𬁾𬁿𬂀𬂁𬂂𬂃𬂅𬂇𬂈𬂉𬂊𬂌𬂍𬂎𬂏𬂐𬂒𬂓𬂔𬂖𬂗𬂘𬉑𬉩𬉫𬌍𬎾𬖊𬘆𬚯𬚰𬚳𬚵𬚷𬚹𬚻𬚼𬚽𬚾𬛁𬛂𬛄𬛅𬛆𬛇𬛊𬛋𬛍𬛐𬛑𬛒𬛓𬛔𬛖𬛗𬛘𬛚𬛜𬛞𬞳𬦈𬫼𬬘𬶈",
 "午": "仵吘啎忤旿杵汻玝盬許许迕㞰㬳㷏𠉖𠖴𠨺𠵦𡉦𡗧𢆏𢓷𢕜𢦩𢨵𢫳𤵍𥄭𥐭𥘪𥾿𥿵𦥽𦬶𦽀𧺴𨕣𨖍𨳰𨳱𨾟𩑤𩵱𪞸𪟳𪭟𪷋𫀩𫏿𫒍𫔦𫠧𫧬𬆋𬆋𬑩𬝀𬝀𬩕𬮫𬶉",
 "介": "价吤妎尬岕庎忦扴斺炌玠界畍疥砎祄紒芥蚧衸阶骱魀魪齘㖋㖎㜾㝏㠹㰡䚸䦏䯰䲸𠆷𠇧𠌕𠌕𠌕𠨴𡈅𡗦𡯓𡵚𡸻𢗊𢚻𣃭𣓴𣬫𣲤𣽀𤘦𥄍𥝵𦲈𧣋𧿩𨑸𨽱𩈋𩉡𩟑𩡺𩧦𩾴𪐱𪽐𫒌𬂣𬇝𬶇𬹼",
 "夭": "仸呑妖宎岆岙扷昋枖殀沃矨祅秗穾笑芺袄訞跃镺飫鴁㒎㓇㕭㤇㴁䴠𠂚𠎷𠮋𠷷𡒁𡙶𡬊𡱱𡴘𢁱𢇖𢉇𢍃𢔗𢡄𢡄𣕊𣜀𣥚𣦴𣦴𣦴𣧕𣭹𣵚𣵜𣷹𣸖𤌡𤤋𤲎𥈏𦃱𦮮𦰎𧉕𧡅𧶓𧻂𧻬𧾁𧾓𧾭𧾭𧾭𨃦𨆂𨞷𨞷𨥜𨧛𨪻𨲁𨾘𩆅𩐅𩝼𩟌𩡻𩲓𪜏𫍚𫧘𬁷𬆇𬈹𬒁𬬴",
 "壬": "任妊紝纴衽軠鈓飪㸒䏕䚾䨙𠁪𠰃𠿦𡅚𡔞𡔟𡳑𡿱𢂮𢇦𢌦𢗖𣈂𣐅𣕅𣪷𣶖𥄮𥙛𥮍𦜙𦲻𦴷𧠒𨁗𨓮𨳝𨺄𩂐𪷁𫊟𫚽𫡖𫡘𫧺𫸓𬍲𬍲𬝰𬠪𬬯𬷘",
 "分": "份兝兺吩哛坌妢寡岎岔帉弅忿扮掰攽昐朌枌梤棼椕氛汾炃玢瓫瓰盆盼砏秎竕粉紛纷翂芬蚠蚡衯訜貧贫躮邠酚釁鈖雰頒颁馚魵鳻麄黺鼢㞣㟗㟗㤋㸮䭻𠈀𠊠𠔑𠔑𠔕𠔠𠔡𠔢𠖲𠚼𠛸𠝂𠪺𠬰𠯨𠾞𡇇𡋇𡗯𡛑𡧋𡭅𡯕𡴚𡵳𡸐𡺜𢁥𢈑𢪘𢯌𢵙𢺹𢺺𣁺𣊆𣊱𣌥𣏰𣗰𣛊𣢏𣥝𣬄𣬩𣹁𤆶𤓼𤖭𤘝𤟳𤫗𤫫𤰪𤵇𤽉𥁣𥄟𥘶𥥄𥦋𥺯𥽡𦐈𦣡𦦟𦽜𧘠𧠚𧮱𧷐𧷟𧺮𧿚𨋂𨐯𨐰𨐳𨚇𨳚𨴶𨸣𩇴𩉵𩔌𩔫𩬉𩰏𩲝𩿈𩿉𪄏𪋨𪎕𪞇𪟊𪟐𪟑𪯗𫍛𫚍𫟴𫡇𫦇𫽂𬏔𬥏𬦁𬨟𬲍",
 "互": "仾冱枑沍魱䇘䊺𠀕𠈝𠯞𡗨𢎸𢗝𢪔𣅥𣐛𤜷𥑗𥘡𦊂𦊍𦍞𦙁𦨝𦬚𦯥𧘢𧥮𧺳𧿟𨋆𨚎𨠂𨥛𨱀𨸧𩃆𩉱𩿍𪏳𪥦𪸒𫄚",
 "方": "仿圀圐堃堃塄妨彷愣房放斺斻於施斾斿旀旁旂旃旄旅旆旇旈旉旊旋旌旍旎族旐旑旒旓旔旖旗旘旙旚旛旜旝旞旟昉昘枋楞汸瓬眆祊紡纺肪臱舫芳蚄訪访趽邡鈁钫閍防雱髣魴鲂鴋㕫㗄㝑㡢㤃㧍㫃㫄㫉㫊㫋㫌㫍㫎㫏䄱䢍䫯䲱𠆖𠏛𠛍𠪭𠿐𡇅𢁸𢎷𢕅𢕨𢢔𢢡𢦷𢨲𢵿𢶔𢶗𢾍𢾕𢾾𣁼𣃗𣃚𣃜𣃝𣃞𣃟𣃠𣃡𣃣𣃤𣃦𣃧𣃨𣃩𣃫𣃬𣃭𣃮𣃯𣃰𣃱𣃲𣃳𣃴𣃵𣃷𣃸𣃹𣃺𣃻𣃼𣃽𣃾𣃿𣄀𣄁𣄂𣄃𣄄𣄅𣄆𣄇𣄈𣄉𣄊𣄋𣄍𣄎𣄏𣄐𣄑𣄓𣄔𣄕𣄖𣄗𣄘𣄙𣄚𣄛𣄜𣄝𣄞𣄠𣄡𣄢𣄣𣄤𣄦𣄧𣄨𣄩𣄪𣄫𣆍𣌷𣑈𣕶𣗦𣪧𣬵𣶢𣸤𣹿𣿗𤃳𤏺𤗒𤠩𤢝𤢞𤧾𤾜𥀤𥌂𥓯𥡐𥫳𥲬𥵀𦆅𦔨𦗷𦜶𦤔𦪤𦪰𦱘𦹭𦽠𦽦𧂧𧒥𧘩𧬒𧭇𧰛𧸟𧸨𨁳𨆭𨗌𨗤𨗯𨘁𨜃𨜤𨟁𨧗𨪠𨭜𨲶𨸂𨹛𨾔𩍗𩔽𩕇𩕰𩖫𩘦𩙴𩛙𩥜𩦧𩪨𩭎𩮇𩲌𩲠𩷜𩷸𩺑𩻠𩼡𪕃𪟀𪟑𪤟𪭫𪯲𪯳𪯴𪯵𪯶𪯷𪯸𪯹𪯺𪯻𪯼𪯽𪯾𪯿𪰀𪰁𪰂𪰄𪰅𪳏𪴩𫁊𫉐𫋳𫎒𫑉𫞀𫞁𫞊𫯄𫯄𬀀𬀂𬀃𬀄𬀅𬀆𬀇𬀈𬀉𬀉𬀉𬀊𬀋𬀌𬀍𬀎𬀏𬀐𬀑𬀒𬀓𬀔𬀕𬀖𬀗𬀘𬀙𬀚𬀛𬀜𬀝𬀞𬀟𬀠𬀡𬀢𬀣𬀤𬄻𬊀𬒂𬙙𬝧𬬐𬱲𬴦𬷧",
 "公": "伀兊妐彸忩忪昖松枀枩炂玜瓮翁舩蚣衮衳訟讼鈆頌颂㕬㝐㳂䇗䚗䡆䯳䰸䲲𠔘𠔲𠕺𠚅𠛀𠤰𡆾𡇛𡓌𡔴𡗳𡟸𡩞𡵴𡷋𡹀𢁷𢃧𢈳𢚔𢚱𢛌𢨱𢪌𢬁𣌶𣙚𤗉𤝅𤢱𤥼𤦱𤲋𤷥𥝶𥣍𥮨𦤉𦬘𦰠𦹎𧆷𧗺𧧡𧩟𧺭𨌪𨑪𨨟𨱛𨳗𩃍𩉭𩒬𩣭𩭤𪌥𪙅𪜣𪤫𪪳𫊿𫓪𫖻𫶫𬐟𬛉",
 "巿": "伂旆昁杮沛犻肺芾馷㤄㧊㸬䑔䟛䢌䣪䪟䰽𠆴𠚷𠮍𢂏𢂏𢂷𢺷𢻵𣬪𤜲𤴹𤽌𥄔𥫴𥾧𦠟𦣢𦥡𧘟𧠎𧺡𨓠𨙶𩖭𪩲𫷃𫻭𬌈𬌉",
 "予": "伃妤序忬抒杼汿沀紓纾舒芧豫野預预魣㐨㐨㘧㜿㮊㶦䂛䦽𠄛𠰄𡆹𡍳𡐨𡱣𢄮𢎻𢡴𣏗𣛾𣝰𤝉𤤂𤰩𤵈𥄛𥝱𥩧𦍗𧠐𧦃𧶃𧺥𨋋𨑦𨥤𨬮𨱢𩿎𩿗𪐧𪜝𫕃𬜓𬯺",
 "弔": "伄弚盄第鈟䘟𢟛𤝠𥝼𥾯𦙨𧔏𧔨𧔩𧘨𨑩𨧙𨳤𪫥𪽯𫄝𫼛𬠆",
 "屯": "伅吨囤庉忳扽旽旾杶沌炖盹砘窀純纯肫芚訰豘軘迍邨鈍钝霕頓顿飩魨黗㝄㹠㼊䣩𠀏𠤲𡉫𡗥𡭻𡵭𢧭𢧸𢨎𢨢𢻴𣚆𣚆𣚆𤘫𤤀𤫭𤵊𥂉𥇈𥫱𥸵𦊉𦜯𦟒𧉙𧘸𨙆𨳘𩂄𩖤𩢀𩭱𪌋𪎶𪕅𪞿𫃉𬙴",
 "勿": "伆刎匢吻囫岉忽昒易昜曶朆歾沕甮笏粅肳芴虝覅魩㫚㬟䀛䀜䝆䥼䴯𠀵𠊉𠏑𠏑𠏦𠖳𠝄𠝯𠞍𠣔𠤀𠤆𠤌𠨂𠨂𠭿𠯳𠱎𠳪𠵞𡒒𡗃𡛁𡠍𡧤𡭥𡯖𡵶𢑼𢒓𢗘𢛦𢜍𢜕𢝻𢪥𢪱𢫍𢾈𣃦𣆄𣍐𣢊𣱏𣵓𣹒𣺅𤆞𤚶𤤅𤬱𤰿𤵐𤶵𥁴𥆲𥇯𥇯𥘨𥝤𥡓𥤽𥾸𦒶𦒸𦓭𦘨𦘨𦛦𦲇𦴙𦷐𧇂𧉚𧟰𧥲𧦍𧦯𨋊𨍂𨍂𨑥𨕨𨜗𨟸𩂂𩃻𩆲𩑮𩒶𩓬𩖨𩲐𩲬𩾲𪊖𪏵𪡕𪥸𪴵𫇅匆𫧃𫽌𬆿𬗣𬗣",
 "殳": "伇吺廄廏役投杸殁殴殶殸殹殺殻殽殾殿毀毁毂毃毄毆毇没炈疫癹砓祋竐股般芟設设豛軗酘鈠骰㨌㱼㱽㱾㱿㲀㲁㲂㲃㲄㲅㲊䌓䝂䝘䟝䩔䬦䯴𠚹𠥝𠨻𠪘𠶳𠹢𡃫𡇀𡒼𡚾𡧔𡿚𢑿𢔾𢗎𢜄𢞸𢟥𢢢𣖫𣚯𣝝𣪂𣪃𣪄𣪅𣪆𣪇𣪈𣪉𣪋𣪌𣪍𣪎𣪏𣪐𣪑𣪒𣪔𣪕𣪖𣪗𣪘𣪙𣪛𣪜𣪝𣪞𣪡𣪢𣪣𣪦𣪧𣪨𣪩𣪪𣪫𣪬𣪭𣪮𣪯𣪰𣪱𣪲𣪴𣪵𣪶𣪷𣪸𣪻𣪼𣪽𣪾𣪿𣫀𣫁𣫃𣫄𣫅𣫆𣫇𣫈𣫋𣫍𣫏𣫐𣫑𣫖𣫗𣫚𣫛𣫟𣫠𣫡𣫢𣫩𣴂𣹬𣺲𣾮𤊳𤐘𤖬𤚲𤚼𤛖𤝈𤡘𤤄𤧧𤩮𤩯𤼺𥍟𥖗𥝻𥨃𥰺𥲏𥳨𥵠𥸂𥸃𥸇𥺵𥽦𥽿𦇍𦋲𦒇𦒫𦤂𦦹𦲗𦴎𦷊𦽛𦾫𧄘𧈌𧈻𧎅𧏌𧏚𧘣𧞒𧞹𧞺𧤧𧫫𧯸𧰵𧷙𧷥𧺢𨐅𨕮𨕵𨕶𨖏𨗋𨙀𨢋𨩂𨩷𨯳𨰢𨱁𨱚𨶞𨸜𩀠𩌊𩌥𩎂𩏻𩪔𩳇𩵤𪃟𪆑𪇂𪉘𪌓𪏙𪐮𪕂𪕸𪚆𪛒𪵈𪵉𪵋𪵌𪵍𪵎𪵏𪵐𪵒𪵓𪹉𫐁𫗑𫘈𫽑𬆞𬆟𬆠𬆡𬆢𬆣𬆤𬆥𬆦𬆧𬆨𬆩𬆪𬆬𬆭𬆮𬆯𬆰𬆱𬆲𬆳𬆴𬊷𬖫𬗿𬬜𬯹𬲵",
 "亢": "伉劥匟吭囥妔忼抗杭沆炕犺砊秔笐粇肮航苀蚢貥迒邟鈧钪閌闶阬頏颃骯髚魧㰠㼚㽘䋁䘕䟘䡉䭺䲳䴚䶳𠿕𡮎𡵻𣃚𤒀𥄦𥒳𦐄𧇠𧦑𧲪𨀫𨈢𨟼𨾒𩲋𩸡𪎵𪐦𪕇𪗜𪜎𪥹𪻑𫆥𬹽",
 "尹": "伊吚君笋芛㖐䪳𠩑𡛂𡱉𡱉𢁨𢂜𢂫𢫽𣜔𣲫𣺱𤣹𥏰𧉅𨊼𨜉𨥠𨳬𩉥𩨫𪧪𪱛𫥃𫩊𫵗𬀏𬀕𬡿𬥒𬯢𬱉𬳪",
 "及": "伋吸岋岌彶忣扱昅极汲砐笈級级芨衱觙訯趿鈒钑雭靸馺魥㚫㠷㤂㧀㽺䏜䑥䲯䶋𠀨𠄦𠍭𠐖𠚵𠫳𠬬𢃺𢎽𢚼𢪳𣌵𣥨𣧉𣬬𣴄𣼘𤆣𤜯𤷹𤸿𥄫𥘜𥝥𥠰𥴉𥴉𥻾𦐅𦐏𧩇𧲫𧹜𨋃𨳛𨸍𨸚𩎕𩖪𩽹𩾶𪙙𪻏𫊩𫮥𫲼𬏁𬥠𬩔𬩩",
 "厄": "伌呃扼枙砈苊蚅軛轭鈪阨頋顾䝈𡛖𣐃𤜸𥑣𥝂𦙜𦷖𧠏𩵡𬡉𬪾𬲩",
 "五": "伍吾忢㐏㕶𠄲𠄶𠄻𠄼𠬷𠵥𠼘𡟿𡨓𢛤𢛤𣌃𣍲𥄪𥄬𥐳𥥫𦙗𦸭𫇩𫡲𫡵𫰌𬁶𬂡𬂽𬃂𬪷",
 "支": "伎吱妓屐岐庋忮技攰攱攲攳枝歧汥秓翄翅肢芰蚑衼豉跂鈘頍馶鬾鳷鼓㩻㩼㩽㩾㲍㽻䃽䅩䚳䞚䡋䣫䧴䰙𠇞𠚽𡰸𡲆𢈧𢉎𢎼𢏫𢔠𢮽𢲈𢺵𢺶𢺷𢺸𢺸𢺹𢺺𢺻𢺼𢺽𢺾𢺿𢻂𢻃𢻄𢻅𢻆𢻇𢻈𢻉𢻊𢻋𢻌𢻍𢻏𢻒𢻓𢻔𢻕𢻖𢻗𢻘𢻙𢻚𢻛𢻜𢻞𢻟𢻠𢻡𢻣𢻤𢻥𢻦𢻧𢻨𢻩𢻪𣖌𣦲𣦳𣯕𣲰𤯙𤹹𤽑𥁈𥄏𥑂𥔺𥧽𥨓𥭸𥸳𥾣𦌖𦜚𦧉𦨟𦲔𦲔𦼽𧃭𧄋𧷱𧹛𧻝𨈛𨍺𨑤𨙸𨙾𨤺𨧾𨧾𨱜𨱹𨸠𩂏𩉨𩐾𩓠𩓸𩔩𩰇𩵾𪓏𪦶𪪖𪯅𪯆𪯇𫑆𫛛𫹍𫾣𫾤𫾥𬣛𬩁𬱧",
 "犬": "伏倏厌厣吠哭宊慭戾枤汱状犾狀狊狝狱猆猋猌献猷獃獄獇獎獒獘獣獸獻畎突紎肰臭莽迖靥餍魇默黙黡鼣㧋㹜㹜㹷㺇㺉㺓㺴䣭䭾𠜢𠫎𠺑𡉩𡌤𡏣𡑅𡒦𡫈𡲗𢗗𢤍𢨾𢪺𢬍𢰼𢲎𢵐𣅤𣔑𣗆𣚕𣤛𣴇𤉷𤋣𤌔𤕃𤘲𤜧𤜲𤜹𤝀𤝟𤝡𤝮𤞅𤞛𤞣𤞮𤞷𤞿𤟀𤟌𤟏𤟐𤟒𤟓𤟙𤟜𤟞𤟢𤟮𤟴𤟵𤟶𤠊𤠒𤠢𤠨𤠩𤠪𤠼𤡎𤡜𤡩𤡴𤡵𤡽𤡾𤡿𤢕𤢚𤢜𤢝𤢮𤢮𤣂𤣅𤣉𤣊𤣏𤯂𤱶𤴻𤸗𤼇𥁾𥂐𥊷𥬇𥮎𥻜𥻽𦀫𦊅𦓢𦨚𦬦𦬫𦷶𦽕𧱾𧲶𧿡𨭢𨵲𨻬𩉎𩎓𩖮𩡍𩡷𩫈𩬇𩯢𩵥𩹏𩻿𩿁𩿛𪊏𪑥𪚊𪠏𪬜𪹱𪺽𫜤𫰋𬌪𬌰𬌳𬌾𬍈𬍊𬍋𬙠𬮇𬮝𬯛",
 "戈": "伐划啔巀戎戒戓戔戔戕戗战戙戛戜戝戟戠戡戢戣戤戥戦戧戨戩戬戭戮戯戰戱戳戵找簚肈鈛㡲㦵㦷㦸㦹㦺㦻㦼㳀䁉䂝䄀䇅䇝䋯䣬䰹䴰𠎰𠯫𠶶𠷠𠺵𡃣𡈑𡒾𡚄𡛏𡣯𡣴𡧿𡼛𡾃𡾟𢄅𢅓𢌵𢕽𢤚𢦌𢦎𢦕𢦖𢦗𢦚𢦜𢦝𢦢𢦤𢦧𢦪𢦫𢦮𢦯𢦳𢦸𢦺𢦻𢦿𢧀𢧁𢧂𢧃𢧄𢧅𢧆𢧉𢧊𢧍𢧏𢧐𢧔𢧕𢧘𢧙𢧛𢧝𢧢𢧣𢧥𢧪𢧫𢧮𢧰𢧱𢧳𢧴𢧵𢧶𢧷𢧺𢧻𢧽𢧾𢨃𢨈𢨉𢨌𢨍𢨐𢨒𢨓𢨔𢨖𢨗𢨘𢨙𢨛𢨝𢨠𢨡𢲦𢶩𢷿𢿀𣇈𣏩𣏾𣕥𣙅𣧌𣨦𤁢𤂴𤄔𤉫𤑂𤰭𤳀𤻦𤻵𥋚𥢈𥣩𥰎𥾮𦁓𦃎𦏁𦐂𦖎𦘥𦣣𦨜𦬗𦸴𦺩𦿐𧀅𧂝𧇒𧑼𧓷𧔼𧕂𧕹𧚑𧛠𧝧𧞩𧣱𧥾𧪖𧵪𧵶𧵸𧶍𧶒𧸠𧺱𧽮𧾢𨈟𨉙𨟶𨫓𨭟𨯱𨳮𨾓𩂅𩃢𩆉𩚧𩟦𩢅𩤭𩥳𩫅𩯰𩯷𩰎𩰭𩳠𩾷𩿙𪗠𪜋𪝠𪥅𪦷𪦽𪧮𪭉𪭊𪭌𪭍𪭎𪭐𪭑𪭓𪭖𪭛𪱞𪵷𪷎𫉏𫏳𫓨𫷣𫹳𫻦𫻧𫻨𫻩𫻪𫻫𫻬𫻮𫻯𫻰𫻱𫻲𫻳𫻴𫻵𫻷𫻹𫻺𫻻𫻼𫻾𫻿𫼀𫼁𫼃𫼄𫼅𫼆𫼇𫼈𫼉𫽃𬀃𬂄𬐜𬕵𬙣𬝼𬞱𬠾𬷁",
 "斤": "伒劤匠听妡岓庍忻惭所折斦斦斧斨斩斪斫斬断斮斯新斱斲斳斴斵斶斷斸旂昕析欣歽沂渐炘盺祈紤肵芹蕲蘄蚚訢赾近邤釿靳頎颀馸鬿齗龂㠼㪼㪾㪿㫀㫁㫂㸫㹞䉼䖐䜣䰺𠄆𠒙𠜝𠦉𠦛𠧣𠯓𠺤𠻡𠼹𡆏𡋈𡌌𡏐𡒧𡗲𡣎𡵱𢏂𢗹𢦲𢰂𢳮𢺼𢿚𣁰𣂒𣂓𣂔𣂕𣂖𣂗𣂛𣂜𣂝𣂞𣂟𣂠𣂢𣂣𣂤𣂥𣂦𣂧𣂨𣂩𣂪𣂫𣂮𣂯𣂰𣂱𣂲𣂳𣂴𣂵𣂶𣂷𣂸𣂹𣂺𣂻𣂼𣂽𣂾𣂿𣃀𣃁𣃂𣃃𣃄𣃅𣃆𣃇𣃉𣃊𣃊𣃊𣃌𣃍𣃎𣃏𣃐𣃑𣃒𣃒𣃓𣃔𣃕𣃖𣄨𣉛𣣁𣣒𣣪𣥍𣥪𤞆𤤆𤴾𥙚𥝹𥪨𥪭𥬊𥭄𥭦𥲣𥷋𥺐𦆰𦋒𦕄𦠀𦠔𦠟𦠠𦶘𦹱𦼢𦽪𧘻𧣊𧪷𧯞𧵆𧿧𨠇𨬅𨯴𨰉𨳜𨷵𨸢𩐙𩙗𩙗𩰖𪊼𪌍𪏴𪛊𪩗𪯱𪯲𪵮𪷀𪿆𫉈𫑇𫢍𫥁𫨍𫿹𫿺𫿻𫿼𫿽𫿾𬇳𬓁𬔘𬥔𬥡𬨵𬩲𬬱𬸻",
 "冗": "伔壳悫棾沉㕴㚮䢆䤟𠖍𠖒𠙭𡔧𢀈𢗑𢪨𢼀𣝝𤆤𤤌𤾒𥐱𥫺𦕍𨊶𨠁𨱤𩈌𩑜𩣤𩵨𪉛𪎸𪐨𪕁𪕿𪞱𫘻𫚲売𬋤",
 "友": "伖叆叐抜爰苃髪㑓𠌞𠙢𠝊𠭅𠭶𠮂𡛀𡵢𢇬𢉏𢔕𢱻𢳻𣐪𥁊𥈫𥟛𥥜𥿈𦐓𦥀𦭞𦴯𧄬𧮁𨗫𨦐𨳧𩙥𩚿𩢚𩵼𪰯𫋒𫙞𫣋𫼦𬁡𬫆𬷀",
 "尤": "优尨就嵆嵇忧扰沋犹疣稽紌肬蚘訧諬鑙駀魷鱿㕱㚭㛷㞃㮷䤞𠎂𠎟𠪽𠬭𠺳𡯊𡯟𡯯𡯶𡰐𡰓𡰔𡰘𡰙𡰚𡰜𡰽𡵔𣏞𣒎𣙴𣜐𣧗𤘜𤷊𥂏𥐶𥙜𥠻𥡞𥡳𥡴𥢑𥢔𦈍𦥣𦬓𧌌𧰰𨇳𨈣𨑫𨕳𨠄𨠫𨢳𨪴𨮺𨺖𨺖𩈊𩑣𩺔𩾵𪐤𪕦𪙓𪠙𪨈𪲆𪾊𪾡𬅃𬘕𬞓𬡸𬩗𬱔",
 "区": "伛呕奁妪岖怄抠枢欧殴沤瓯眍讴躯駆驱鴎鸥䝙𠛅𧦅𨸟𪟮𫋲𫭟𫸩𬁵𬉼𬔯𬪧",
 "卆": "伜忰枠疩砕粋紣翆酔㳃𠯥𡉻𢇥𢪄𣅢𫰓",
 "韦": "伟围帏炜玮祎纬苇袆讳违闱韧韩韪韫韬㭏𠨼𣲗𩏼𩏽𩏾𩏿𩐀𪭝𫁳𫃗𫖑𫖒𫖓𫖔𫖕𫖖𫠅𫰍𫵶𫹴𬀩𬙭𬣀𬬬𬰱𬰲𬰳𬰴𬰵𬰶𬰷𬰸𬱵",
 "专": "传抟砖转䌸䏝𣏢𫁟𫑘𫚋𫭞𬇘𬦆",
 "车": "伡军厍库惭斩晕毂渐砗翚荤轧轨轩轪轫转轭轮软轰轱轲轳轴轵轶轷轸轹轺轻轼载轾轿辀辁辂较辄辅辆辇辈辊辋辌辍辎辏辐辑辒输辔辕辖辗辘辙辚连阵䢀䢁䢂𨐅𨐆𨐇𨐈𨐉𪠳𪨶𫐄𫐅𫐆𫐇𫐈𫐉𫐊𫐋𫐌𫐍𫐎𫐏𫐐𫐑𫐒𫐓𫐔𫐕𫐖𫐗𫐘𫐙𫟤𬆦𬛼𬨁𬨂𬨃𬨄𬨅𬨆𬨇𬨈𬨉𬨊𬨋𬨌𬨍𬨎𬨏𬨐𬨑𬨒𬨓𬨔𬨕𬬇𬬇𬬇",
 "牙": "伢冴厊呀岈庌枒犽玡疨砑穿笌芽蚜衺訝讶谺迓邪釾閕雅颬鴉鸦齖㤉㧎㸧䄰䍓䥺䪵𠚾𠢐𠽫𡉪𡠉𡵥𢗬𣀗𣯛𣺶𤆹𤘅𤘆𤘆𤘇𤘈𤘉𤘊𤘋𤘌𤘍𤘎𤘏𤘐𤘑𤘒𤘓𤛆𥁆𥨋𥩉𥩍𥼅𦕆𦯙𦴉𧘪𧯋𨅪𨅪𨅪𨤲𩐆𩶀𪑢𪖕𪘯𪚐𪺧𪺨𫰎𫺗𬌗𬌘𬦤𬶅𬹺",
 "见": "伣宽岘枧现砚笕舰苋蚬觃规觅视觇觊觋觌觍觎觏觐觑靓䩄𠯟𪎉𪾢𫀨𫌨𫌩𫌪𫌫𫌬𫌭𫤸𬀪𬆾𬊦𬖑𬘖𬟪𬢇𬢈𬢉𬢊𬢋𬢌𬢍𬢎𬢏𬢐𬢑𬢒𬢓𬢔𬺟",
 "长": "伥帐张怅枨胀苌账𪼴𪽪𫊪𫏃𫗠𬑇𬬮",
 "仑": "伦囵抡沦玱纶芲跄轮鸧𪠵𪨧𫭢𬑆𬦧𬬭",
 "仓": "伧创呛怆戗抢枪沧炝疮瘪舱苍㓆𪺷𬁸𬥳𬬰",
 "匀": "伨呁抣昀枃汮盷笉蚐袀赹鈞钧韵㚬䝧𬣝",
 "文": "伩刘吝呅妏対彣忞忟抆斈斊斋斌斍斏斐斑斒斓斕斖旻旼汶炆玟盿砇紊紋纹芠虔蚉蚊螡辬这鈫閔闵雯馼魰鳼鴍鼤㐎㓙㞵㞶㥗㪰㪱䘇䝺䝺䰚𠉸𠌍𠛶𠞑𠠼𠲲𠳵𠳻𠻎𠻿𡢏𡦍𡲈𡵡𡷁𢪖𣁁𣁃𣁄𣁆𣁇𣁈𣁉𣁊𣁌𣁎𣁏𣁐𣁑𣁒𣁖𣁗𣁘𣁙𣁚𣁜𣁝𣁟𣁠𣁢𣁣𣁤𣁥𣁧𣁨𣁪𣁫𣠴𣺒𤋩𤔟𤚓𤛄𤱭𤵒𤼄𥄐𥕁𥡒𦀮𦍡𦍢𦐐𦐑𦙟𦮫𦯻𦲴𦹺𦻱𦿵𧋧𧨐𧬖𧴻𧸠𨔉𨬦𨷜𨻕𩅒𩓉𩖣𩖰𩗌𩢌𩰩𩵳𩻏𪉃𪊓𪊙𪐰𪞙𪢨𪦹𪪍𪪐𪫋𪮉𪯠𪯡𪯢𪯢𪯣𪯤𪯥𪯦𪯧𪯩𪯪𪰎𪴦𪶺𪽌𪽼𫆷𫌴𫔻𫘜𫡴𫰥𫸲𫾨𫿭𫿮𫿯𫿰𫿱𫿲𬀫𬀸𬍆𬐅𬜰𬰇𬸀",
 "为": "伪妫沩㧑𠯠𧹑𫇭𬬶",
 "㝉": "伫纻苎贮𥋩𪡣𪾣𫎓𬙯𬣞",
 "尺": "伬呎咫庹択昼沢浕粎蚇訳赆迟釈鈬駅㘮䋇𠧛𡛄𡨉𡬰𡬻𡱩𡱮𡱸𡳢𡵸𢗜𢭑𣏧𣥉𤋚𤳰𥐮𦬨𧴾𧷀𧺫𪞚𪧆𪨎𪨑𪨜𪽗𫁶𫁽𫥯𫵗𫵟𬓤𬤶",
 "玄": "伭呟妶弦怰昡泫炫玅玆玆玹畜痃眩絃胘舷蚿衒詃鉉铉鮌㹡䍗䝮䩙䮄䲻𠛑𠡆𠣖𡇎𡊨𢂄𢫔𣃡𣴹𤣧𤣨𥎸𥙆𥰌𦬾𧗵𧺻𨘙𨴋𨸫𩑹𩗁𪐷𪗰𪨬𪵚𪿖𫠊𬣤𬫪",
 "奴": "伮努呶孥帑弩怒怓拏砮笯胬詉駑驽鴑㐐䋈𠪓𢫓𣭄𤔀𥅄𥑌𧉭𧘽𨥬𨾯𩛂𪏷𪗭𪗵𪥯𪺹𫅴𫧞𫱩𫷗𬆎𬖗𬺀",
 "尒": "伱苶鉩㕘㚷䇣𠞙𠞨𠢜𠰒𡊒𡝡𢟺𢲺𣐐𣧠𣳅𤝝𤡅𤳑𤵲𤹭𤹮𥑒𥟖𥡁𦱨𧀉𧦜𨀀𨋏𨒛𨱯𩒀𩒈𩢜𩬯𩰐𪂘𪐳",
 "尼": "伲呢妮屔怩抳抿旎昵柅泥狔痆眤秜胒苨蚭跜迡鈮铌馜㞾䘦䛏䝚䲿𠉞𡊴𡎿𡳭𢓚𢘒𢾂𣐉𣖗𣙰𣢞𣭙𤀛𤙌𤤗𥥕𥩥𥬩𥹆𥿡𦂋𦤽𦴓𦴪𧖛𧩴𨋗𩉹𩖹𪏸𪠝𪿗𫆜𫒃𫙖𫢩𫷍𬈓𬨬𬸼",
 "半": "伴冸判叛姅怑拌柈泮牉畔眫秚絆绊胖衅袢詊跘鉡靽頖㪵㫠䉽䬳𠦯𠦺𠦻𠰢𠲑𠵵𡛤𡭉𡶡𢏑𢘤𢯝𣫷𥐆𥑍𥙪𦚓𧉻𧸝𧺾𨒃𨚚𩢔𩲯𩶐𪟶𪟸𪧻𪰃𫃘𫕺𫧟𫾅𬑰𬑵𬥓𬱙",
 "四": "伵呬怬柶泗訵駟驷䦉𢏎𢝕𣳉𤘉𥹊𥿖𦮄𧶠𧷏𨗣𪯣𫦘𫪸𬏻",
 "令": "伶冷刢呤囹姈岭岺彾怜拎旍昤朎柃泠炩狑玲瓴皊矝砱秢竛笭紷翎舲苓蛉衑袊詅跉軨邻鈴铃閝阾零領领駖魿鴒鸰鹷齡齢龄㱓㲆㸳㾉䍅䎆䠲䯍䳥𠖝𠫄𡣊𡴒𣃠𤧂𧰾𨗇𨗜𨧌𩄈𩆖𩓒𩙳𩡁𩻆𪋭𪐸𪕌𪗲𪚙𪟹𪡎𪲕𪲥𪷶𪽏𪾧𫅜𫅤𫐉𫑅𫣃𫤚𫥻𫩧𬖜𬗪𬙽𬡌𬤲𬹴",
 "申": "伸呻妽审抻暢朄柛氠珅畃眒砷神紳绅胂訷迧鉮䎶䰠𠒗𠦱𡬤𡸼𢘊𣁱𣃵𣈱𣌨𣌾𣍃𣢘𣨃𣳑𤝚𤟸𤰷𤱓𤱓𤳘𤶉𥞁𥬐𦦠𧊋𨈮𨋙𨴁𨸬𨾡𩉼𩡃𫋵𬏍𬏍𬏍𬘆𬩸𬬹",
 "且": "伹俎冝刞助县叠咀姐宜岨徂怚悬抯柤査殂沮爼狙珇疊疽砠祖租笡粗組组罝耝舋苴虘蛆袓詛诅豠趄跙鉏阻雎靻飷駔驵鴡麆齟龃㚗㡹㸖䏣䔘䖕䢐䢸䣜䣯䪶䯶䱉𠁠𠁠𠁠𠁠𠁶𠌞𠜞𡎬𡏄𡐁𡨋𡲂𡲤𢂈𢄄𢒉𢨷𢲶𣆹𣛢𣞀𣱁𣻐𤇅𤇙𤒭𤔈𤕲𤛏𤱌𤶢𤹡𤿚𥕅𥕑𥛜𥡧𥥐𥩢𥺎𦊕𦊩𦋾𦟰𦯣𦳎𦵔𦸬𧂚𧃘𧇇𧇈𧇘𧇣𧇣𧇿𧏏𧐅𧗘𧠢𧣬𧴢𧻾𨖆𨜇𨨃𨮮𩗃𩱪𩲲𪐵𪗱𪧠𪽤𫃦𫊀𫛾𫝠𫞍𫞵𫨶𫸴𫹃𫾝𫿇𬁫𬅿𬈑𬌒𬫖𬬺𬲭",
 "司": "伺呞孠柌泀祠笥覗詞词鉰飼㚸㟃䏤䛐䣳𠭈𠻁𠻸𡭒𢃊𢕳𢘜𢩚𢲚𣱇𤏉𤔺𥄶𥠫𥿆𦉚𦉠𦊛𦎛𦒽𦭡𧀚𧉠𧙈𪗪𫨪𫵆𫸙𫿛𬐩𬢊𬨚𬩬𬴴𬹿",
 "平": "伻匉呯岼怦抨枰泙玶砰秤胓苹蚲評评軯閛駍鮃鲆㛁㼞䍈䶄𠁈𠱪𠹶𡊞𡞴𢆊𢆓𢆕𢆠𢆮𢏊𢬪𣸞𤖳𤘾𤵣𥘴𥞯𥹒𦐜𦓬𦨫𧪐𧲺𧻈𨒳𨠟𨥾𨸶𩑳𪜉𪥈𪪄𪪅𪪆𪪇𪪭𪰓𪲅𫥶𫯡𫷙𫷚𫷝𬈽𬑈𬔳𬛙𬳴",
 "以": "似姒拟泤笖苡鉯㕽䎣䬮𠀳𢜁𤤳𥙩𫠪",
 "丕": "伾呸噽岯怌抷柸狉秠胚苤蚽豾邳鉟駓髬魾㚰㺽䋔䪹䲹𠃂𢓖𣆏𣌹𣓺𣬾𣳎𤇨𤘹𤵛𥅊𥑜𥘻𥹂𨠙𨲐𨴈𨸹𨸿𩈓𩎜𩓭𩔌𩚼𪀇𪢩𫄞𫌶𬳵",
 "只": "伿呮咫嘦帜怾抧枳炽疻积织胑识軹轵鉙齞㡶㰨䅩䍉䛊䳅𠙂𠤴𠷓𡛰𣖌𣭓𣲵𤝖𥿗𦐖𦭜𧁤𧁤𧁤𧊄𧙋𧧹𧨍𧲻𧵙𧻍𨈪𨒅𩢢𩬫𩿦𫖆𫪉𫪉𫪩𫪫𬋦𬲬",
 "正": "佂囸姃征徰徰怔政整昰柾歪泟炡症眐竀罡証证鉦钲阷靕頙鴊㫌㱏䆙䇥䋊䢥𠊦𠑳𠙁𠝙𠢦𠢫𠭅𠰪𠷚𡇬𡛵𡧡𡩞𢁿𢌛𢌫𢘫𢝒𢠟𢿄𢿋𢿫𣁇𣂾𣄩𣄫𣆞𣥛𣥵𣦍𣦓𣦛𣦤𣦥𣪅𣫆𤑠𤧏𤫒𤯅𤽢𥓱𥘺𥦰𥩠𥫇𦙫𦝽𦟆𦭒𧁅𧗪𧘿𧡭𧨋𧶷𨒌𨕆𨕒𨚣𨠣𨪱𨪱𨭟𨺛𨺾𨾖𩄕𩬧𩶝𩿳𪤶𪪎𪭤𪭻𪴹𪴺𫅏𫝍𫠱𫿮𬆃𬆄𬆅𬆈𬇵𬈈𬋮𬝸𬟿𬨶𬱐",
 "甘": "佄咁姏拑某柑泔玵甛甜甝疳粓紺绀苷蚶詌邯酣鉗钳雸魽黚㤌㶰㽍㽏㽐㽑䇞䗣䲺𠤔𠦜𠦜𠺇𠼄𡶑𢃛𢇾𢎌𢤍𣀏𣀫𣢟𣺇𤊼𤍰𤡜𤮻𤮼𤮽𤮾𤮿𤯀𤯁𤯂𤯃𤯄𤯅𤯆𤯇𤯈𤯊𤯋𤯌𤯍𤯎𤯏𤯐𤯒𤾑𥋤𥑠𥞈𥞌𥩩𦕐𦚕𦟉𦦥𧒩𧬔𧮳𧵊𨚠𨣛𨱫𨳼𨼣𩖺𩠁𩢨𩬚𩼝𪏽𪖟𪗳𪽀𫏄𫞪𫠐𫥕𫴐𫺦𬎱𬓶𬣠𬥴𬱊𬹾",
 "宁": "佇咛拧柠泞狞眝竚紵苧詝貯㤖㿾䇡䍆䘢𡪄𡪇𢁼𤆼𤕞𤱤𤲑𤴍𥃓𥹍𦂂𦈀𧈚𧉞𧵒𨀉𩶂𪥰𫛢𫦵𫳘𫴝𫹿𬍜𬑱𬬾𬱑𬲲𬷋𬷌",
 "布": "佈咘希怖抪柨鈽钸㘵㚴㳍𠛻𡇊𡲫𢁻𢂜𢂞𢃊𢃌𢅄𢇴𣔩𣧦𤔟𤙅𤤰𤵗𥑢𥞎𧉩𧙛𧦞𨀒𨋞𩶉𪜛𪻟",
 "皮": "佊岥帔彼怶披旇柀波狓玻疲皯皰皱皲皳皴皵皶皷皸皹皺皻皼皽皾破秛紴翍耚蚾被詖诐貱跛鈹铍陂鞁頗颇駊骳髲鮍鲏麬㓟㝿㢰㱟㿫㿬㿭㿮㿯㿰㿱㿲㿳㿴㿵㿶㿷㿸㿹㿺䏢䜵䝛䩅𠌟𠡄𠱀𡒡𡒢𡛡𡛬𢇳𢱺𢱺𣃣𣃤𣙨𣬼𣰺𣵝𤖷𤙎𤚆𤱍𤿆𤿇𤿈𤿉𤿊𤿋𤿌𤿍𤿎𤿏𤿒𤿓𤿔𤿕𤿖𤿗𤿘𤿙𤿚𤿛𤿜𤿝𤿞𤿟𤿠𤿡𤿢𤿣𤿤𤿥𤿦𤿧𤿨𤿩𤿪𤿫𤿬𤿭𤿮𤿯𤿰𤿱𤿲𤿳𤿴𤿵𤿶𤿸𤿹𤿺𤿻𤿼𤿽𤿾𤿿𥀀𥀁𥀂𥀃𥀅𥀆𥀇𥀈𥀉𥀊𥀋𥀌𥀍𥀎𥀏𥀐𥀑𥀒𥀓𥀕𥀖𥀗𥀘𥀘𥀙𥀙𥀚𥀛𥀜𥀝𥀞𥀟𥀠𥀡𥀢𥀤𥀥𥀦𥀨𥀩𥀪𥀫𥀬𥀭𥀮𥀯𥀱𥀲𥀳𥀴𥀵𥀶𥀸𥀹𥀺𥀻𥀼𥀽𥀾𥅗𥖫𥗣𥭪𥲝𥹖𥽚𦃯𦐢𦚆𦡨𦨭𦫗𧫸𧰸𧹞𨈵𨠜𨡶𨢹𩌀𩌓𩌤𩌿𩖽𩟚𩠗𩩨𩫋𩲢𪓜𪖞𪚷𪠏𪤻𪾆𪾇𪾈𪾉𫘟㓟𫵃𫹄𬃓𬐒𬐓𬐔𬐕𬐖𬒳𬔜𬥶",
 "召": "佋刟劭卲妱岧岹巶弨怊招昭柖欩沼炤牊玿眧祒笤紹绍苕蛁袑詔诏貂超軺轺迢邵鉊鞀韶駋髫鮉鼦齠龆㐒㲈㷖㸛㹦䂏䎄䙼䧂䫿䬰䳂𠣫𠧙𠯉𠰉𠸿𠹾𠺥𠾓𡀪𡆊𡊱𡥙𢁾𢇊𢈆𢑦𢠒𢦽𣉈𣑌𣬸𤋐𤱠𤵪𤾌𥁏𥃝𥹙𦚔𦦌𦨣𦯐𦴰𧵓𨐓𨔴𨹸𩅖𩎣𩲤𪌕𪔓𪖠𪴻𪸲𪹑𫥈𫫌𫬑𫲤𫲰𫵥𫽟𬚖𬜁𬦪𬬿𬰛",
 "氐": "低厎呧奃岻底弤彽怟抵柢泜疷眡砥祗秪胝茋蚳袛觝詆诋貾趆軧邸阺骶鴟鸱㪆㫝㲳䍕䑛䟡䢑䩚䬫𡛜𢺾𣱋𣱎𣱐𣱑𣱒𦅴𦐠𨠏𨾦𩑾𩶅𪀍𬇉𬫌𬲮",
 "主": "住妵宔往拄柱殶注炷疰砫紸罜蛀註跓軴迬鉒飳駐驻麈黈㹥䇠䝬䪒𠣕𠩈𠰍𠴦𡊲𡙃𢔎𢨸𣒈𣷪𤔕𤖸𤤛𤪉𤽞𥅖𥘭𥩣𦊝𦒼𦗊𦙴𦨁𦨄𦭦𧉶𧏼𧡗𧻄𨈫𨓹𨝇𨲢𨲣𨳳𨾨𩒊𩨻𩶃𩿢𪌘𪏜𪐴𪚹𪜋𪨚𪫬𫇕𫴢𫼠𬃯𬚶𬣣",
 "左": "佐咗袏㝾䦈𠡃𡖠𡛿𢀠𢀡𢀡𢞑𢞑𢣖𢣖𣳇𤋨𥑰𥙀𥬢𦑑𧅢𧨧𧭯𧱞𧲭𨡽𨣣𨼰𨼰𨽋𨾬𨾭𨿭𩟣𩟤𩩜𩪄𩪄𩪏𩷷𩼏𩼏𩼐𪫦𪭥𪱺𪹆𫎍𫦦𬌬𬏢𬯄",
 "右": "佑祐若㤑㳓䧺𠯌𠳮𡛮𡧣𢙵𢱪𣐞𣒅𣖻𣭊𤌕𤌕𤠬𤢃𤲽𤾘𥁓𥂠𥂧𥑛𥛂𥛒𥬡𥮷𧙗𧤮𧤮𨃧𨎄𨒐𨔏𨚞𨛠𨢗𨥰𨳾𩌚𩑲𩺙𪐊𪡐𪸚𫱄𫸫𬍘",
 "央": "佒咉姎岟怏抰映柍殃泱炴盎眏秧紻胦英詇軮鉠雵鞅駚鴦鸯㹧㼜㿮䄃䇦䒋䘧䬬䱀𠱵𡂍𡘦𡩶𢘲𢵟𣃝𣶤𤤠𤬺𤮡𤮤𥑞𦰈𧏱𧲱𧵌𨠗𨫰𩐽𩢥𩧫𩲴𩿶𪎞𪓛𪚻𪰔𫅐𫊬𫊭𫏅𫓭𫚐𫥅𫩣𬃃𬥜𬨄𬷅",
 "本": "体呠泍砵笨絊缽翉苯躰鉢钵骵㡷㤓㮺㶱䬱䱁𠄯𠼒𠼭𡇐𡊖𡭦𡽒𡽒𡿶𢫆𣊊𣌃𣒬𣕢𣽵𤙃𤧆𤱙𤵳𤾲𥥑𥻸𦊚𦏓𦤎𦱧𧙄𧦹𧿾𩇶𩒅𩢕𪊜𪎝𪰐𪱻𪼹𫖐𫚏𦞵𫯐𬇸𬑊𬖓𬟰𬡩𬬌",
 "可": "何呵哥哥哿奇妸岢抲柯河炣牁珂疴砢竒笴胢舸苛蚵袔訶诃跒軻轲酠鈳钶閜阿魺鲄鴚㐓㑸㞹㪃㪼㫊㰤㱒䋍䯊䶗𠳊𠳌𠵲𠶄𠶘𠶱𠽚𠾟𠾳𠾳𠾳𡆔𡘀𡤫𡥚𢎄𢘟𢦪𢼔𣍳𣘨𣤑𣧤𣸌𣹇𤔄𤕒𤠄𤨯𤳴𤳴𥎵𥘫𥞍𥩤𥪼𥪼𥯽𦂶𦏤𦏤𦏤𧙃𧙑𧟫𧭳𧭳𧭳𧯶𧵛𨚩𩀓𩈔𩊆𩑸𪀉𪜄𪝏𪟡𪡑𪡛𪫧𪰏𪵤𪽍𪽎𪾌𫮭𫱿𬇌𬈊𬚞𬧲𬮠𬸂",
 "必": "佖咇妼宓怭柲毖泌珌瑟祕秘苾虙袐覕邲鉍铋閟飶馝駜鮅鴓㘠㧙䀣䎵䏟䖩䛑䟤䩛䪐䫾𠉘𠚊𠛡𠧸𠨘𠰣𠳢𡄈𡊭𡨑𡩎𡶇𢁽𢗈𢞵𢠋𢠋𢱮𢳼𢻛𣁆𣁉𣕾𣗴𣜏𣢠𣣑𣭈𤇩𤨚𤨝𤵘𤽣𥁑𥃉𥉓𥑖𥗚𥚐𥟚𥡔𥧧𥮦𥹅𦗃𦞟𦣥𦷕𦻞𦼣𧍦𧒫𧨨𧪋𧸈𧸠𨌕𨐵𨒜𨠔𨤩𨶣𨸼𪄰𪏺𪣊𪬇𪬤𪰗𪴸𫗣𫙵𫚑𫠈𫵘𬍾𬨘𬱂𬱚",
 "它": "佗咜岮拕柁沱炨砣紽舵蛇袉詑跎迱酡鉈铊陀駝驼鮀鴕鸵鼧㸰㼠㾃䙾䡐䪑䬁䴱𡖟𡩆𢏋𢘯𢼊𣅸𣸘𤝛𥁗𥄻𥙇𥞒𥡔𥬌𥹈𦚐𦧑𧹟𨈷𨳷𩉺𩒂𩲮𪗩𪫒𫍡𫜒𫟤𫤙𬆊𬠺𬧼𬲱𬶍𬹨",
 "失": "佚劮呹妷帙怢怣抶昳柣泆瓞眣祑秩紩翐胅苵蛈袟袠詄趃跌軼轶迭鉄铁镻鴩㲳䭿䰡䱃䳀𠀶𠅎𠅐𠝰𠧿𡘓𡘮𡘿𡱛𢔖𣉺𣗻𣧞𣺐𤔅𤙈𤤥𤫴𥑇𥓹𥥌𦐝𧙍𧰅𨳺𨷥𨷥𨷥𨾤𩧭𩬭𩲫𪗫𪶟𬀵𬊹",
 "弗": "佛刜咈岪彿怫拂昲柫氟沸炥狒疿砩笰紼绋羛胇艴茀費费鉘髴鮄㔗㚕㪄䀟䄶䛍䞞𠄴𠍟𠔘𠡂𡗻𡘉𡛯𡶒𢂀𢎵𢏇𢒍𢘍𣙶𣭘𣲴𤇝𤝟𤤖𤫰𤯽𥄱𥘬𥝃𥡀𥿏𦐡𦕚𦨡𧉸𧕒𧙂𧠤𧿳𨋥𨚓𨚭𨱰𩂕𩃸𩉽𩎛𩎡𩐚𩖼𩱎𫚒𫸨𫸴𫸻𬝱𬡐𬣧𬨙𬩉",
 "乍": "作厏咋妰岝岞怍怎拃昨柞泎炸痄砟祚秨窄笮胙舴苲蚱詐诈迮酢鈼阼飵鮓鲊齚㡸㸲䋏䝫䞢䟭䩆𠈨𠔫𠖽𠛢𠩎𡗸𢂃𢓓𢜉𢼎𣧫𣩋𣬿𤱴𥅁𥹁𦥬𧙓𧣝𧯤𧲮𨋘𨴃𩂖𩢐𩬟𩿞𪌟𪫗𫗢𫸵𫽏𫾩𬆢𬍚𬬽",
 "句": "佝劬呴够夠姁岣怐拘敂斪昫朐枸欨泃狗玽痀眗竘笱絇翑耇耈胊苟茍蚼袧訽豞豿跔軥邭鉤雊駒驹鮈鴝鸲鼩齁齣㣘㲒㽛䅓䑦䝭䞤䣱䧁䪷䬲䵶𠒟𠛎𠣪𠣪𠣫𠴣𠴦𠷜𠹪𠾠𡊦𡌲𡱈𡱺𡳏𢀆𢂁𢊙𢎅𢑪𢩁𢼒𢿩𣀖𣕽𣤒𣧬𤉵𤋤𤋥𤍥𤎗𤖵𤘽𤩉𤫱𥈈𥘮𥚍𥢀𥩮𦊒𦐛𦓂𦕙𦰶𦱩𦲆𦴳𦶔𧙎𧡳𧯠𨈳𨒡𨪵𩀣𩀣𩉿𩐝𪀊𪓞𪓟𪚶𪟑𪵙𪹐𪿕𫌩𫎧𫞮𫲢𬈌𬐏𬲯𬶋",
 "仁": "佞芢𠣒𡛉𣏴𣲚𥄰𦓍𫴮",
 "冬": "佟咚图峂庝昸柊氡泈炵疼笗終终苳螽鉖鮗鴤鼕鼨㐑㚵㠽㣠㤏㫡㲇㹣䂢䧷䳉䶱𠩁𡶞𢓘𢫝𣁲𣧩𤤮𤱞𥮴𦂟𦙭𦵝𧆼𧊂𧚕𧲴𧹝𨀐𨒟𨚟𨠌𩂓𩢦𪚽𫈍𫔠",
 "尔": "你弥狝䂧𡊑𡪪𡮠𢘝𢘞𣍨𥙧𥜡𦰴𦵖𧉰𧤆𧦽𨋎𨤧𨤰𨳴𩜖𩬘𩲪𩶗𩿥𪭁𪭧𪱾𪸞𫂼𫊱𫌨𫐪𫒂𫵇𬏂",
 "仚": "佡",
 "用": "佣拥甪甬甭甮甯痈砽苚㶲𠋊𠖿𠗬𠭉𠰩𠳫𠹮𠺔𠺔𡊤𡛾𡶤𡿲𢊑𢘭𢟡𢣍𢷝𢷝𢽸𣎂𣳔𣵋𣹄𤏹𤗩𤛟𤤪𤬶𤰄𤰅𤰈𤰉𤰊𤰌𤰌𤰌𤰑𥁎𥙓𥞖𥟬𥡘𥣌𥣌𥥝𥼓𦇜𦇜𦕘𦙸𦡓𦯞𧊊𧒠𧒫𧗾𧙚𨀍𨃒𨒗𨓛𨓸𩁩𩌸𩍁𩏕𩓼𩬮𩿾𪧟𪱽𫖉𫙅備𬎽𬓴𬫉𬫮",
 "瓦": "佤咓旊珁瓧瓨瓩瓪瓫瓬瓭瓮瓯瓰瓱瓳瓴瓵瓶瓷瓸瓹瓺瓻瓼瓾瓿甀甂甃甄甅甆甈甉甊甋甌甎甏甐甑甒甓甔甕甖甗砙缻邷齀㧚㼗㼘㼙㼚㼛㼜㼝㼞㼟㼠㼡㼢㼣㼤㼥㼦㼧㼨㼩㼪㼫㼬㼭㼮㼯㼰㼱㼲㼳㼴㼵㼶㼷㼸㼹㼺㼻㼼㼽㼾㼿㽀㽁㽂㽃㽄㽅㽆㽈㽉㽊㽋㽌㽍䰛𠪹𠿜𡁓𡊝𡏵𡧗𡺜𢋩𢭨𣐎𤁦𤐱𤬦𤬧𤬨𤬩𤬪𤬫𤬬𤬭𤬮𤬯𤬰𤬱𤬲𤬳𤬴𤬶𤬷𤬸𤬹𤬺𤬼𤬽𤬾𤬿𤭀𤭁𤭂𤭃𤭄𤭅𤭆𤭇𤭈𤭉𤭊𤭋𤭌𤭍𤭎𤭏𤭐𤭑𤭒𤭓𤭔𤭖𤭗𤭘𤭙𤭚𤭛𤭜𤭝𤭞𤭟𤭠𤭡𤭢𤭣𤭤𤭥𤭦𤭧𤭩𤭪𤭫𤭬𤭭𤭮𤭯𤭰𤭱𤭲𤭳𤭵𤭶𤭸𤭹𤭺𤭻𤭼𤭽𤭾𤭿𤮀𤮁𤮂𤮃𤮄𤮅𤮆𤮇𤮈𤮉𤮊𤮋𤮌𤮍𤮎𤮏𤮐𤮒𤮓𤮔𤮕𤮖𤮗𤮘𤮚𤮜𤮝𤮞𤮟𤮠𤮡𤮢𤮣𤮤𤮥𤮦𤮧𤮨𤮩𤮫𤮬𤮭𤮮𤮯𤮰𤮱𤮲𤮳𤮴𤮵𤮶𤮷𤮸𤮹𥘳𥥟𥲁𥶸𦓓𦨆𦭈𦾳𧓐𧞕𧧀𧭌𧰓𧰛𨀄𨋐𨠛𨥯𩆙𩌯𩐛𩶏𩻊𩿺𪅒𪼶𪼷𪼸𪼹𪼻𪼼𪼽𪼾𪼿𬎤𬎥𬎦𬎧𬎨𬎩𬎪𬎫𬎬𬎭𬎮𬎯𬎰𬸁",
 "卡": "佧咔拤胩鉲𠖺𡛨𡶛𣳓𤋈𤙐𦭌𪁯𫧱𫧲𫧳𫧵𫧶",
 "包": "佨刨匏咆孢庖怉抱枹泡炮炰爮狍玸瓟疱皰砲窇笣胞苞蚫袌袍跑軳鉋铇雹靤鞄颮飑飽骲髱鮑鲍麅麭齙龅㚿㯡䍖䎂䛌䮀䳈䶌𠌑𠣶𠣺𠣻𠤁𠤃𡯡𡶄𢁀𢼌𣕅𣖏𣚇𣭀𥄹𥓤𦊠𦠖𦢭𦰮𦰾𧙌𧵢𨚔𨠖𩇌𩋲𩎘𩐜𩤄𪀀𪊡𪏶𪐼𪓠𪭹𪮇𪵀𪽕𪿤𫀆𫃠𫎍𫒹𫙫𫯯𫹾𬤺",
 "各": "佫咯嗠客峈峉恪挌敋格洛洜烙狢珞略畧硌笿絡络胳臵茖蛒衉袼觡詻貉賂赂路輅辂酪鉻铬閣阁雒頟餎駱骆骼鮥鴼鵅㓢㗉㤩㪾䀩䅂䎊䞦䧄䶅𠄇𠗂𠧨𠮀𠶱𠸉𡅖𡅡𡇷𡾆𢓜𢨟𢼛𢾷𣛗𣢷𣧳𤙑𤧱𤴂𤽥𥳂𦃅𦃆𦊲𦐦𦓱𦛃𦴦𧃄𧐋𨎣𨩟𨱴𨹿𩂣𩅗𩊚𩎬𪊲𪌣𪕘𪘊𫜍",
 "老": "佬咾姥峔恅栳狫珯硓粩耄耆耈耋荖蛯銠铑鮱㐗㖈㧯㳣䇭䎛䎜䎜䎝䳓𠅸𠺛𡄒𡋎𡨳𡪰𡪰𡬁𡬁𡬁𡬕𡬕𡬕𡶰𣉟𣕗𣭢𤛪𤛪𤶁𥊏𥙕𥞠𥨔𥨔𥩊𥩊𥩊𦒲𦒴𦒵𦒸𦒹𦒺𦒼𦒽𦒾𦒿𦓀𦓁𦓂𦓃𦓄𦓈𦓈𦓈𦓉𦓊𦓋𦓋𦓋𦓋𦓌𦓜𦕳𦚱𦽡𧂕𧻩𨀼𨈺𨊁𨊁𨊜𨊜𨘝𨚻𨠬𨲤𨴛𩅯𩅯𩇇𩇇𩇇𪀧𪍙𪰚𪸦𫅳𫅴𫅵𫅶𫅷𫅸𫐥𫒰𫦶𬑑𬚊𬚌𬚎𬴖",
 "夅": "佭袶跭逄降䂫䇨䜶䤗𠏤𠲓𡑺𡜠𡲛𡶶𢘸𢢨𢥙𢭎𣝘𣫡𣺛𨋪𨦟𨼇𩐨𩷄𪐿𪔔𪰠𫁯𬣺",
 "合": "佮冾匌匼哈姶峆峇帢弇恰拾拿搻搿敆樖欱洽烚珨畣盒盫硆祫秴答粭給给翕翖耠荅蛤袷詥跲郃鉿铪閤鞈韐頜颌餄鮯鴿鸽龕龛㓣㕉㝓㢵㣛㧱㪉㭘㾑㿯䀫䆟䏩䑪䞩䢔䧻䨐䶀䶎𠆋𠆖𠈏𠉲𠍗𠎈𠎏𠎙𠏎𠏸𠐗𠑴𠔤𠚔𠟖𠪈𠪦𠵵𠷡𠻙𠼞𡄬𡇞𡇶𡋛𡡽𡢣𡥫𡪗𢂷𢈁𢈈𢊴𢙅𢡁𢨍𢩅𢲡𢷨𢻆𢿴𣁴𣆗𣑠𣗯𣘿𣛇𣛋𣨄𣭝𣼕𤀉𤙖𤚻𤛈𤝰𤥓𤯤𤴇𥃋𥅽𥊉𥩻𥱣𦊪𦊴𦏐𦐬𦒈𦕲𦚷𦧛𦳬𦷋𦷌𦷼𧄮𧄮𧄮𧇎𧊧𧙳𧫈𧮵𧳇𨈿𨎕𨏚𨠭𨫸𨰔𩌒𩌞𩐥𩔩𩭆𩳋𪑇𪘁𪞍𪠁𪦻𪮷𪯤𪼉𫎖𫓂𫕽𫚗𫡥𫣘𫣹𫫈𫬳𫯾𫱅𬌗𬎪𬎴𬔂𬮤",
 "名": "佲姳洺眳茗詺酩銘铭㗮㚚㫥䊅𠱷𠸛𠸜𡒒𡖚𡖺𡷂𢙛𢻇𣜞𣭨𤥁𥏍𥒊𥔇𥿨𦵎𨚷𨿅𩓴𩳊𪗸𪟚𫏉𬔽𬣮𬱃",
 "并": "併剏剙姘屏帡庰恲拼栟洴渆瓶皏硑絣缾胼艵荓蛢誁賆跰軿迸郱鉼頩餅駢骈骿鮩鵧㔙㤣㻂䈂䑫䦕䴵𠛼𡐱𡸫𡾛𢆗𢆛𢆢𢆣𢏳𢼩𢼶𣁊𤝴𤭅𥞩𥩵𦐵𦴏𧳉𧻓𧼦𨈾𨗙𨹗𩂦𩈚𩊖𩫐𩫑𪋋𪕒𪘀𪚏𪠆𪪃𫐌𫛨𤲒𫷘𬣲",
 "吉": "佶劼咭喆喆嚞夡姞恄拮桔欯洁狤硈祮秸結结缬翓臺蛣袺詰诘趌迼郆銡鞊頡颉髻鮚鲒鴶黠㐖㓤㔛㣟㸵䂒䓀䦖䭇𠑃𠚌𠶮𠸆𠹢𠺇𠽻𠽻𡅕𡅕𡋥𡌬𡒼𡔠𡔢𡔤𡔦𡔧𡔯𡔯𡔼𡕇𡕇𡕇𡕉𡕊𡕍𡜩𡫸𡱠𡳛𢩋𢼣𣡳𣻅𤋔𤎿𤎿𤔎𤥐𤫶𤵹𤺦𤿠𥆅𥖷𥻽𦂑𦛋𦢗𦷓𦸉𧅡𧍩𧑭𧑭𧑱𧑱𧞜𧞟𧠯𨀙𨊊𨎈𨗡𨘫𨭓𨱻𨺃𩔄𩗊𩢴𩧵𪁄𪌧𪕖𪗾𪜒𪞉𪠅𪧱𪰙𪶼𫋮𫜖𫤣𫥘𫾪𬳀",
 "危": "佹卼姽尯峗峞恑桅洈硊祪脆臲蛫觤詭诡跪陒頠鮠㧪㩻㫉䣀䤥𠝰𠨜𠨪𠱓𡧭𡳀𢂕𢈌𢼨𢼮𣆡𣢪𣧼𤙙𤥕𤱯𤿡𥍨𥎾𥥠𦓛𦟒𦤞𦨹𧵥𧷪𧻜𨠥𨴓𨾼𩊛𩗜𪀗𪖡𪖤𫏸𫥊𫶺𬥣𬱟𬶏",
 "全": "佺姾峑恮拴栓洤烇痊硂筌絟荃詮诠跧輇辁酫銓铨駩㓌㻇䀬𠓹𠓻𠛮𠤹𠥞𠱴𡋄𢂘𣄀𣷒𦦮𦷅𦼂𦼂𦿻𨹑𩧴𪞇𪰡𪼈𫆂𫗐𫗽𫣝𫤍𫤪𫤪𬍟𬘥𬣎",
 "兆": "佻咷姚宨庣恌挑旐晀晁朓桃洮烑狣珧眺祧窕筄絩繉脁覜誂趒跳逃銚铫雿鞉頫餆駣鮡鴵鼗㸠㿡䂪䄻䑬䖴䠷𠒮𠛪𠧞𠩓𡋮𡱜𡳏𢓝𢮉𣁶𣂥𣑯𤕷𤙔𤭈𤱩𤾿𥎺𥩼𨋫𨢙𨱵𨴡𨾾𩁧𩌿𩬱𪌪𪔛𪘈𪜍𪨱𫀰𫅄𫋺𫍥𫑜𫖁𫖯𬢋𬢖𬶐",
 "交": "佼効咬姣峧恔挍效晈校洨烄狡珓皎窔筊絞绞胶茭虠蛟詨賋跤較较郊鉸铰頝餃駮骹鮫鲛鵁齩㝔㬵㼎㿰䂭䍊䘨䢒𠙇𠜅𠸀𡋟𡥡𢯴𢳼𤟞𤶀𥅟𥇟𥰹𥹜𦺏𧠭𧠷𧣦𧯺𧻨𨠦𨹍𩊔𩎦𩐟𩗒𩲻𪁉𪏁𪿫𫜪𫡽𫥿𫻱𬇍",
 "䏌": "佾",
 "吏": "使㤦㹬𠦱𠲀𣆘𣥱𣦆𣦰𣬒𣬔𣳪𥒅𥚄𥟹𥥥𧧅𧳅𩢲𩰢𪘌𫊳𫣙𫣚𫹒𫾫𬃻𬳺",
 "刑": "侀型硎荊鉶铏㣜㭢𠝊𡜇𡶭𤏾𦡅𧊞𨢏𨢹𩺄𬏄",
 "先": "侁兟兟冼姺宪毨洗烍珗筅詵诜跣选酰銑铣駪㧥㪇㭠㮱㰫㱡㾌䊁䚚䢾𠀡𠅨𠅬𠈣𠒑𠒒𠒛𠒣𠒷𠓀𠓙𠓙𠓙𠓙𠜎𠸛𠸜𡖬𡨷𡬃𡬃𡬃𢈇𢏡𢓠𢔬𢙝𣭟𣭡𤀗𤂩𤄳𤍹𤞓𥏋𥏌𥑻𥦥𦀈𦭶𦹞𧖟𧖟𧠺𧱀𨪹𨴐𨾷𩇜𩒙𩛔𩣂𩱕𩱕𩶤𪀷𪞄𫌦𫤠𫤢𫩱𫪕𬇶𬚬𬳽",
 "㡯": "侂䅊",
 "至": "侄到厔咥姪室屋峌庢恎挃晊桎洷痓眰祬秷窒絰绖耊耋胵致臵臶臷臸臸臹臺臻荎蛭誈跮輊轾郅銍铚駤鵄䇪䑒䑓䘭䬹䶍𠌠𠽧𠽧𠾰𡇓𡖧𢎆𢩈𣉴𣢶𣨂𤈜𤞂𤥇𥎹𥒓𥔊𦠮𦠮𦤵𦤶𦤷𦤸𦤹𦤺𦤻𦤼𦤽𦤾𦤿𦥀𦥁𦥂𦥃𦥄𦥅𦥆𦥈𦥊𦥋𦥌𦥍𦥎𦥏𦥏𦥏𧠫𧵼𨒬𨖹𨖹𨬿𨴗𨸅𨺴𨾽𩊞𩒐𩥏𩳀𩶪𩺧𪀒𪏀𪖣𪗻𪨛𪯇𫇎𫇏𫇐𫇑𫎮𫘠𫠮𬚘𬛱𬛲𬛳𬛳𬛴𬛵𬸈𬺁",
 "亥": "侅刻劾咳奒姟孩峐晐核欬氦烗畡痎硋絯胲荄該该豥賅賌赅輆郂閡阂陔頦颏餩駭骇骸㚊㤥㧡㱾䀭䠹䤤䬵𠛳𠜨𡭹𡱍𡲼𢻉𢼵𣴃𥞨𥩲𦈲𦐤𦷷𧊏𨀖𨒨𨠳𨽷𩐰𩠚𩰶𪠠𪻞𫟺𬨇",
 "夷": "侇咦姨峓恞挗桋洟痍眱胰荑蛦跠銕鮧鴺㯩㴣㹫䄺䧅䨑䩟䮊𠜁𠺹𡙧𡱐𢂒𢓡𣆰𣭯𤈙𦀊𧙣𧱅𧻑𨱾𫕇𫡛𫯏𫯲𫸹",
 "多": "侈卶哆够夠夡夥夦奓姼恀扅拸栘爹痑眵移翗茤蛥袲袳誃趍跢迻郺鉹陊黟㗬㚉㚊㚋㚌㚍㝖㞔㡅㢁㩼㶴㷇䇋䏧䡔䫂䬷䮈𠀲𠊵𠌅𠕝𠗄𠛫𠫾𠴽𡇘𡌪𡖎𡖐𡖑𡖒𡖓𡖔𡖙𡖜𡖝𡖞𡖟𡖠𡖢𡖣𡖤𡖧𡖨𡖩𡖪𡖫𡖬𡖭𡖮𡖯𡖰𡖲𡖳𡖻𡖼𡖽𡖾𡖿𡗀𡗁𡗄𡗆𡗈𡗉𡗊𡗋𡗌𡗍𡗎𡗏𡗑𡥥𡦄𡨆𢏜𢻈𣃽𣆚𣋿𣡳𣪈𣭧𣴙𣶘𤈕𤉥𤖻𤝻𤥀𤿦𥒥𥟿𥠨𥭋𥶂𥹠𥼫𥿫𦋲𦍹𦰵𦴌𧃪𧯨𧳁𧻬𨇵𨎱𨐔𨑊𨘂𨘮𨛅𨜽𨴢𩊥𩐞𩗈𩶰𩽿𪀓𪀩𪌫𪎠𪐀𪒨𪠞𪤻𪤽𪥀𫖰𫦗𫯍𫯐𫯒𫯓𫯔𫯖𫯘𫯙𫯚𬆯𬒼𬩍𬳾",
 "夸": "侉刳匏姱恗挎晇桍洿瓠絝綔绔胯舿荂袴誇跨郀銙陓骻鮬鴮㡁㰭䠸𡖮𢓢𤫸𥅚𥑹𦫚𧊘𨾺𩊓𩣔𪵈𫌮𫛦𬚗𬳹",
 "光": "侊兤咣姯尡恍挄晃晄桄洸珖皝硄絖耀胱茪觥輄輝辉銧靗韑駫黋㒯㘢㹰㿠䆪䨔䯑𠈑𠒗𠒝𠒡𠒥𠒦𠒪𠒫𠒬𠒵𠒸𠒼𠒽𠒿𠓁𠓃𠓅𠓇𠓉𠓉𠓉𠓊𠓋𠓌𠓐𠓑𠓒𠓓𠓖𠥳𠵗𠵰𡱘𡷀𡾡𡾡𢓥𢩊𢼯𢼴𣆤𣆥𤈛𤱳𤶏𤾗𥆄𥍄𥍕𥙑𦊫𦕤𦥰𦨻𧇲𧇺𧗯𧧯𧵦𧹍𨉁𨏆𨐈𨒺𨠵𨮠𨹂𨻙𩊠𩐣𩒚𩭂𩳁𩶸𪀯𪕓𪕗𪞀𪞃𪞆𪦍𫊶𫏈𫘡𫤚𫤡𫤤𫤥𫤦𫤨𫪨𫵰𫽶𬘢𬩌𬯬",
 "列": "例冽劽咧姴峛峢挒栵洌烈烮茢蛚裂趔迾銐颲鮤鴷㡂㤠㤡㽝㾐䅀䮋䶛𠞺𠶘𡊻𡏫𢂥𣧿𣸠𤈘𤖺𤞊𤧮𤳓𥁟𥅮𥆁𥉬𥒂𥞥𥬭𦀎𦃾𧊿𧍐𧒈𧙩𧙷𧧋𨀺𨃮𨦙𨾸𩂶𩊡𩢾𩧮𩶽𪗿𪙂𪩤𫚓𫰞𬀰𬆒𬆓𬠼",
 "寺": "侍峙庤待恃持時歭洔畤痔秲等詩诗跱邿鼭㫭㭙䓁䝰䦙𣊒𥩳𥮻𥹩𦱰𧠴𪀔𪗺𪧸𪰛𪿚𫅌𫊵𫴶𫸺",
 "朱": "侏咮姝株殊洙珠璳硃祩秼絑茱蛛袾誅诛趎跦邾銖铢陎駯鮢鴸鼄㦵㧣㸡㼡䇬䎷䏭䣷𠙎𠱒𡥛𡱖𢼲𣂛𣆦𣗾𣘈𣙸𣜱𣞊𣠶𣥵𤊣𤔏𤝹𤶎𥅲𦐣𦐨𦧙𧑤𧵺𨒲𨾲𩊣𩢻𩳅𪎡𪏿𪣎𪨴𪳔𪴄𫁍𫷨𫾭𬆤𬹣",
 "血": "侐卹恤桖欰殈洫潈烅衁衂衃衄衅衆衇衈衉衊衋裇賉䆝䒸䘏䘐䘑䘒䘔䦗𠗅𠜄𠲣𠸡𡋒𡥠𡨴𡩂𡪖𡬪𢁏𢜷𢞤𢬔𢹋𣁫𤶰𥅧𥒌𥩹𦚡𦪹𦶯𧂺𧑄𧑬𧖧𧖨𧖩𧖪𧖫𧖬𧖭𧖮𧖯𧖰𧖱𧖲𧖳𧖴𧖵𧖶𧖷𧖸𧖹𧖺𧖻𧖼𧖽𧖾𧖿𧗁𧗂𧗃𧗄𧗅𧗆𧗈𧗉𧗊𧗋𧗌𧗍𧗎𧗏𧗐𧗑𧗒𧗓𧗔𧗕𧗖𧗗𧗘𧗙𧗚𧗛𧗜𧧓𨙛𨭋𩶫𩻴𪖩𪪽𫀉𫁃𫋪𫋫𫋬𬕫𬠼",
 "有": "侑哊囿姷宥峟戫栯洧烠珛痏絠肴蛕詴賄贿迶郁酭銪铕陏鮪鲔龓㤢㤫㦽㬼䀁䆜䒴䞥䨖䳑䵋𡒦𢈓𢒰𢯎𣍳𣎉𣎏𣎥𣥯𤐟𤙼𤨂𥂹𥑿𦛒𧅽𧆴𧍂𧠶𨎼𨚺𨚼𨴜𩉎𩣋𩭀𩰑𩲾𩼮𪘃𪚞𪧰𪭂𪱤𪱰𪳊𫋸𫎋𫗏𫚸𫜲𫪩𫪫𬂑𬑐𬘠𬡑𬣩𬳼",
 "安": "侒咹姲峖按晏案桉氨洝胺荌銨铵鞌鞍頞鮟鴳㝧㫨䀂䅁䢿䯃𠡓𡁊𡖨𡩛𡪙𡪸𤕀𥅥𥞬𥼿𦛅𧵨𨊊𨴣𨾶𩣑𪫲𪳃𫃀𫎼𫗒𫛩𫣃𫵻𬆘𬏪𬢨",
 "牟": "侔劺哞恈桙毪洠眸蛑鉾鴾麰㛌䏬𡧷𣭰𤚅𤚅𤚥𤛙𤜁𤪆𥭏𦭷𧔂𨴍𩶢𪟷𫑋𫓴𬜝",
 "而": "侕峏恧斋栭洏粫耍耎耏耐耑胹荋袻輀陑需髵鮞鲕鴯鸸㖇㧫㾍䎟䎠䎡䛔𠉺𠳍𠽴𠽴𡄠𡏵𡑂𡑂𡜚𡢉𡢉𡦘𡦘𡭺𢡵𢡼𢡼𢰋𢰚𣆝𣊵𣊵𣚊𣚊𣤀𣰃𣰃𣰄𣰄𣽈𣽈𤏙𤏙𤡤𤡤𤧿𤭃𤮁𤳜𤳜𤹢𥅡𥋃𥋃𥕷𥕷𥟺𥢠𥢠𥬵𥱇𥱙𥲁𥿶𦅏𦅏𦏌𦏌𦏥𦓎𦓏𦓑𦓒𦓓𦓔𦓔𦓕𦓖𦓘𦓘𦓠𦓡𦓢𦓢𦓢𦠌𦠌𦵘𧂦𧂦𧏦𧑮𧑮𧔇𧤬𧬐𧬐𧰓𧰛𧳲𧴓𧴓𧸀𧸀𧹸𧹸𨅲𨅲𨉿𨉿𨎪𨎪𨒩𨖺𨢾𨢾𨪳𨴎𨻢𨼏𨼏𨾿𩁃𩁃𩍄𩍄𩞪𩞪𩰴𩱊𩻆𩻊𩻞𩻞𪊫𪎿𪏖𪏣𪣳𫅺𫭱𬚏",
 "同": "侗哃姛峒峝恫戙挏晍桐洞烔爂爨狪璺痌眮硐秱筒粡絧胴舋茼衕詷迵酮釁銅铜餇駧鮦鲖㓊㖯㖰㢥㣚㸑㸗䆚䞒𠀹𠆠𠆡𠖄𠨩𡜝𡭸𢂓𢈉𢍯𢏕𢑅𢖂𢿀𣑸𣠪𣡈𣡥𣩺𣬑𤅚𤓕𤖾𤙓𤭁𤭆𥃘𥍩𥗑𦉝𦦟𦦡𦦧𦦻𦧁𦨴𧅾𧇌𧊚𧖥𧖳𧙥𧭒𧱁𧳆𨀜𨇫𨈹𨐗𨔖𨚯𨤯𨭳𨯜𨯺𨰷𨴏𩇷𩊗𩐤𩒗𩧲𩩅𪀭𪌢𪎼𪒵𪔚𪕙𪘍𪻛𫀈𫄡𫍣𫎴𫑉𫝛爨𫥮𫧒𫯆𬜃𬮂𬲈𬷍",
 "宅": "侘咤姹挓烢秺詫诧㤞䖳䤩䯔𤞌𤵾𥭌𨀸𨴥𩢵𩶱𩽽𪀥𫏫𬜭𬭈",
 "式": "侙弑弒恜拭栻烒試试軾轼鉽𠲧𢂑𢎎𣸂𤞔𥁦𥅞𥹨𥿮𧊖𧙢𧵻𧶣𩗎𪀦𪀸𪉅𪰜𪻙𫟸𫭫",
 "旬": "侚咰姰峋徇恂栒殉毥洵狥珣眴筍絢绚荀詢询迿郇銁銞駨㝁㡄㧦㫬㰬㶷䖲䘩𠊫𠋹𠣬𠳉𡘬𡞦𢏔𢞛𢞧𣓓𣕍𣖆𣖼𣱡𣹯𤱬𤳠𤿟𥒘𥖒𥙣𥛠𥫂𦐥𦚧𦻖𧩛𧪂𧪱𧵣𧻛𨀴𨋮𨜬𨝁𪀠𪀽𫓲𫭈",
 "舟": "侜歬洀烐珘盘矪舠舡舢舣舤舥舦舧舨舩航舫般舭舮舯舰舱舲舳舴舵舶舷舸船舺舻舼舾舿艀艁艂艃艄艅艆艇艈艉艊艋艌艍艎艏艐艑艒艓艕艖艗艘艙艚艛艜艝艞艟艠艡艢艣艤艥艦艧艨艩艪艫艬艭貈輈辀郍鵃鸼㭧䎇䑠䑡䑢䑣䑤䑥䑦䑧䑨䑩䑪䑫䑬䑭䑮䑯䑰䑱䑲䑳䑴䑵䑶䑷䑸䑹䑺䑻䑼䑽䑾䑿䒀䒁䒂䒃䒄䒅䒆䒇䒈䒉䚀䲍𠄭𠘇𠘒𠘢𠞼𠢧𠣘𡖫𡟦𡡸𡬫𡲟𡳐𢔃𢛢𢧞𢰓𢲎𢳖𣃼𣆔𣑮𣗆𣘰𣚗𣞡𣤏𣽨𣽰𤃯𤌺𤎵𤭂𤳔𤳮𥂏𥂐𥂟𥃑𥎻𥑸𥥳𥦧𥮙𥿦𦐩𦑳𦒕𦨇𦨈𦨉𦨊𦨋𦨌𦨍𦨎𦨏𦨐𦨒𦨓𦨕𦨖𦨗𦨘𦨙𦨚𦨛𦨜𦨝𦨞𦨟𦨠𦨡𦨣𦨤𦨥𦨦𦨧𦨨𦨩𦨪𦨫𦨬𦨭𦨮𦨯𦨰𦨱𦨲𦨳𦨴𦨵𦨷𦨸𦨹𦨺𦨻𦨼𦨽𦨾𦨿𦩀𦩂𦩃𦩄𦩅𦩆𦩇𦩈𦩉𦩊𦩋𦩌𦩍𦩎𦩏𦩐𦩑𦩒𦩓𦩔𦩕𦩖𦩗𦩘𦩙𦩚𦩛𦩜𦩝𦩟𦩠𦩡𦩢𦩣𦩤𦩥𦩦𦩧𦩨𦩩𦩪𦩫𦩬𦩭𦩮𦩯𦩰𦩱𦩲𦩳𦩴𦩵𦩶𦩷𦩸𦩹𦩺𦩻𦩼𦩽𦩾𦩿𦪀𦪁𦪂𦪃𦪄𦪅𦪆𦪇𦪈𦪉𦪊𦪋𦪌𦪍𦪎𦪏𦪐𦪑𦪒𦪓𦪔𦪖𦪗𦪘𦪙𦪚𦪛𦪜𦪝𦪞𦪟𦪠𦪡𦪢𦪣𦪤𦪤𦪥𦪦𦪧𦪨𦪩𦪪𦪫𦪬𦪭𦪮𦪯𦪰𦪱𦪲𦪳𦪴𦪵𦪶𦪷𦪸𦪻𦪼𦪽𦪾𦪿𦫀𦫁𦫂𦫃𦫄𦫅𦫆𦫇𦫈𦫉𦫊𦭸𦷱𦻉𦼎𦼎𧊓𧑥𧔶𧝢𧝻𧞚𧡬𧧔𧭔𧴏𧴏𧷽𧻖𨄫𨇐𨕳𨦞𩂤𩕎𩗋𩢸𩧳𩮣𩳉𩶣𩺔𪅻𪠾𫇚𫇛𫇜𫇝𫇞𫇟𫇠𫇡𫇢𫇣𫲑𫺚𬀜𬀠𬅣𬐫𬐶𬜑𬜒𬜔𬜖𬜗𬜘𬜙𬜚𬜛𬜜",
 "衣": "依哀壊庡懐扆挔畩衮衷衺衾袃袈袋袌袠袤袬袭袰袲裁裂装裏裒裔裘裚裛裝裟裠裦裴裵裹裻製褎褏褒褜褢褧褩褭褰褱褺褻褽襃襞襲銥铱餏㕈㛄㠢㳖㿆䒾䘚䘡䘫䘱䙚䙝䙨䙪䧇䮍𠜆𠲖𠵒𠼊𡀮𡈃𡘚𡫵𢊭𢌀𢍧𢙇𢜙𢡐𢮯𢳤𢴴𢴶𢸊𣄆𣐿𣘨𣚝𣟎𣸳𣺒𣻴𤇯𤢢𤬥𤺀𥑴𥗗𥥴𥫄𥲘𦊬𦊶𦴣𦶧𦻫𦽲𧃥𧃳𧖗𧘉𧘊𧘎𧘗𧘘𧘙𧘝𧘠𧘦𧘨𧘩𧘫𧘭𧘮𧘳𧘽𧙁𧙃𧙉𧙌𧙍𧙎𧙏𧙐𧙑𧙘𧙚𧙜𧙦𧙨𧙩𧙪𧙬𧙭𧙰𧙳𧙴𧙵𧙶𧙾𧙿𧚌𧚍𧚐𧚒𧚚𧚛𧚝𧚠𧚡𧚣𧚤𧚩𧚰𧚱𧚲𧚵𧚽𧚾𧛀𧛁𧛁𧛄𧛅𧛉𧛌𧛙𧛜𧛣𧛫𧛬𧛯𧛰𧛱𧛲𧛵𧛽𧛿𧜉𧜊𧜊𧜌𧜍𧜏𧜚𧜟𧜪𧜫𧜯𧜸𧜻𧜼𧝏𧝑𧝕𧝖𧝗𧝚𧝛𧝟𧝢𧝣𧝥𧝬𧝯𧝷𧝹𧝺𧝻𧝾𧞂𧞈𧞉𧞐𧞒𧞕𧞗𧞙𧞚𧞜𧞠𧞡𧞢𧞥𧞮𧞯𧞴𧞹𧞺𧟏𧟛𧟞𧟟𧪉𧮨𨗢𨘆𨝺𩀖𩛚𩣰𩦫𩬿𩱝𪀰𪂗𪊬𪗋𪝢𪪠𪫳𫀊𫉵𫋴𫌍𫌎𫌏𫌻𫢚𫸢𫿏𬈟𬋧𬕁𬗑𬡌𬡐𬡓𬡛𬡤𬷐𬹶",
 "如": "侞帤恕挐桇洳筎絮茹袽銣铷鴽㖲㾒䘫𡄲𢘾𣭠𤈟𤯥𥆃𥙦𥞚𥹡𦓲𦵙𧊟𧧏𨚴𨦔𨾵𩣉𩶯𫛪𫱖𫼰𬍣𬷑",
 "存": "侟拵栫洊珔臶荐袸銌𠱜𡜒𢂣𢙨𣆱𤞐𤶐𥞘𦛊𧋃𨀛𨒸𨚲𪣋𫑴𫭇𫲳",
 "夹": "侠刾峡惬挟浃狭瘗硖箧荚蛱郏铗陕頬颊䇲𣍰𥅴𥞦𥩺𧌥𨋸𨦇𨺞𩠃𪒨𪯋𪽷𫛥𫨆𫺁𫺂𬂩𬅢𬉇𬡒𬦯𬭹𬯅",
 "再": "侢洅𠕱𠱻𢈖𤞕𤥆𦆷𦛍𦦍𧋁𫁌𫇶𫰝𫳬",
 "考": "侤拷栲洘烤耉銬铐鮳鲓㘼㛈㼥𠱼𣛖𥬯𥹬𧙲𪦘𪫭𫇷𫷟𬁥𬐈𬢦𬴗",
 "尧": "侥哓娆峣挠晓桡浇烧硗绕翘荛蛲跷铙骁𫋹𫍢𫭪𬌮𬑒𬴨",
 "贞": "侦桢浈祯赪𬹕",
 "则": "侧厕测荝铡鲗𫭮𫼤",
 "乔": "侨娇峤挢桥矫硚荞轿鞒骄㤭㳢𥁢𪜎𪡀𪨗𪪑𪵑𪺭𫊸𫌯𫍤𫏋𫓱𫥽𬮄",
 "会": "侩刽哙桧浍烩狯絵绘脍荟郐鲙㻅𠀾𠊉𡋗𡳃𢙓𥁧𥭉𧐬𨻔𩠠𩩈𩷆𪑅𪭯𫊹𫋻𫘽𫞷𫠴𫧃𫰢𬒊𬭇",
 "齐": "侪剂哜挤斎济脐荠蛴跻霁鲚齑𨠨𪲎𫅅𫺊𬘧𬭉𬯀𬲶𬸾𬹳",
 "妄": "侫𤥑𧊷𧧄𨦩𪦍𫙜𫱏𫱤",
 "尽": "侭烬荩䝲𠛾𡋤𡥧𣍊𣭥𧋅𪨐𫥥𫩺𫵛𫵧",
 "每": "侮勄娒悔挴敏晦梅毓海烸珻畮痗緐脢莓誨诲踇酶鋂霉黣㙁䀲䊈䋣䋦䌓䍙䩈䱕𠜮𠧩𠲯𠳨𡎧𡴕𢂳𢑍𢙽𢵹𣒫𣔍𣫷𣫸𣫺𣫼𣫾𣬁𣴴𣼿𤗆𤙩𤪝𤭐𦾴𧋟𧐟𧖦𧚀𧶅𩊱𩛸𩱟𪉥𪖫𪖬𪧞𪬶𪵔𪵥𫂂𫄩𫜈𣫺䍙𫯋𫯎𫴱𫵾𬅗𬆶𬑲𬒐𬠱",
 "君": "侰宭峮帬捃桾涒焄珺窘羣群莙裙裠覠輑郡頵鮶鲪鵘麏㟒㪊䇹䞫𠧬𠰶𠲰𠹩𡂬𡝗𡢡𢂽𢃆𢋖𢧃𢹲𢽏𣀄𣀆𣇉𣜘𤉙𤑩𤚹𤛰𤪡𤪡𤶷𤸷𥜉𥜢𥜮𦀲𦌺𦢱𦴨𧨡𨐚𨖗𨘂𨛦𨞗𨧡𩂿𩐩𪌺𪣣𪪒𫖳𫘿𫝉𫺔𬂁𬒽𬜋𬡝𬢂𬥀𬱌",
 "辰": "侲唇娠宸屒帪振敐晨曟桭浱祳脤莀蜃蜄裖誫賑赈辱農辳辴鋠陙震麎㖘㫳㰮㲀䀼䅶䆣䟴䢅䢆䢇䢈䢉䣅䫃𠼉𡏌𡝌𡡪𡪮𡭃𡷰𡻌𢈫𢛚𢟹𢥯𢦿𢺪𢺪𢺪𣊤𣜻𣭽𣺚𣾋𤂑𤅁𤅛𤍇𤏏𤚨𤚾𤣜𤱼𤲆𤴌𤹘𤼝𤾖𥗰𥗸𥛑𦁄𦍇𦓶𦞹𦸳𦻼𧒏𧟒𧽘𨉎𨌑𨎂𨑅𨑆𨑈𨑉𨑋𨑌𨕯𨤉𨻟𩇀𩱜𩷩𪁧𪓧𪘝𪣗𪪸𪺼𪿟𫍨𫓵𫘾𫤹𫸚𬅾𬴶",
 "坐": "侳剉唑夎座挫桽痤睉矬脞莝趖銼锉髽㛗㝧㟇㭫䂳䟶䦟䦷𠩜𠷜𡀓𡌚𡍂𡎢𡎥𡎦𡎬𡏩𡒪𡓆𡓢𡓨𡓨𡓮𡘫𡨠𡯨𡸄𡽥𢏬𢒐𢚂𣨎𣴳𣴶𣹶𤉛𥦊𥧚𥭭𥲽𦹇𧨀𨌻𨛏𨹫𪌴𪨙𪰦𫐩𫭿𫮋𫮣𬥗",
 "丑": "侴吜妞峱忸扭杻橻橻橻沑炄狃粈紐羞衄鈕靵㺲䂇䏔䖡䚼䛝䶊𠊣𠊣𠒉𠜋𠴾𠴾𡆴𡚽𡥆𡸆𢆗𢟄𢬆𢬟𢬻𢮢𢮢𣅴𣔖𣔖𣧊𤈓𤊛𤊛𤋨𤚄𤚄𤿥𤿮𤿿𤿿𥍳𥝦𥟷𥟷𥦅𥮢𥮢𥺣𥺣𥿲𦍟𦍮𦚲𦜻𦜻𦤊𦩙𦩙𦭍𦱙𦱪𦱪𧋡𧘥𧩖𧩖𧿔𨂓𨂓𨋀𨔚𨔚𨙺𨛄𨜈𨜈𨜉𨳞𨴘𨿊𩈇𩋓𩋓𩑧𩚖𩣿𩣿𩱂𩱂𪏲𪘴𪘴𪜫𬒰𬛢𬤽",
 "⺉": "侴刈刉刊刋刌刎刏刐刑划刓刔刖列刘则刚创刜刞刟删刡刢刣判別刦刨利刪别刬刭刮刯到刲刳刴刵刷刹刺刻刽刾刿剀剁剂剃剄剅則剈剉削剋剌前剎剐剑剒剔剕剖剗剘剚剛剜剝剞剠剡剤剥剦剧剨剩剫剬剭剮副剰割剳剴創剷剸剹剻剼剽剾剿劀劁劂劃劄劅劆劇劊劋劌劍劏劐劑劓劕劖劗劘劙劚恻浏渆渕灲煭矵罚荆蒯蓟蠫釗钊魝",
 "呂": "侶宫宮㛎𠃳𠒦𠧎𠭤𠴊𡄀𡋿𡱶𡳎𡴗𢈚𢙲𢰈𢻋𣓡𣨕𤀗𤔑𤕍𤞪𤳧𥆻𥓅𥖓𥖕𥺓𦊼𦧨𨓐𨹬𩀢𪁳𪡉𫡽𫤉𫭐𫶴𫶷𫼴𬩀",
 "局": "侷挶梮焗跼鋦锔駶䎤䏱𠵑𡌟𡨅𡳟𤶹𥐏𦀯𦓁𦯃𩓛𩠧𩧺𩭊𩷐𪁵𪓩𫀸𫉴𫪐𫬊𬇴",
 "廷": "侹娗庭挺梃涏烶珽筳綎脡艇莛蜓誔鋌铤閮霆頲颋鼮㹶䅍䩠䯕䱓𠋽𡋺𢽄𣉡𥆑𥏎𥥶𦐿𨉈𨯊𨽕𪊶𫳋𬘩𬣻𬶓",
 "岑": "侺梣涔琌硶㖗䤫䫈𡷴𢙿𢚏𣢽𥆱𦨽𪁏𫊍𫴚𬇁𬒻𬱣𬶒",
 "兑": "侻娧帨悦捝敚棁涚痥祱税綐脱莌蜕裞説说鋭锐閲阅駾鮵㙂㟋䂱䌼䫄䬇䬈䬽𣇋𥡉𦆳𦆳𦦳𦩃𨓚𨹪𪡜𫒵𫚛侻帨駾𫤛𬚜𬸑",
 "孛": "侼勃哱悖挬桲浡綍脖荸誖郣鋍餑馞鵓鹁㛘㟑㪍㫲㶿㹀䪬𠃱𡋯𢚦𢠜𣭷𤍗𤶽𥞳𥩾𥹸𦤣𦫛𦸦𧋢𧚆𨁝𩄿𩓐𩗓𩣡𩱚𩷚𪌰𪣽𫂀𫗈𬹇",
 "男": "侽娚嫐嬲嬲甥舅莮虜㭷㽒𠒰𠢎𠢮𠨃𠲸𡀭𡇨𡖦𡢹𡣠𡣠𡣡𡣡𢣲𢣲𤢰𤱘𤲶𤲶𤳆𤳇𤳢𤽲𦥶𦦊𧇙𧋱𧡇𨦻𪟞𪟡𪟤𪟦𪟧𪶀𪽕𫦶𫦻𬌼",
 "孝": "侾哮宯庨教涍痚硣窙誟踍酵㫴㭳㹲䓔𠭂𡌉𡦊𡦝𡷸𢭦𤉗𤥝𤽴𥆔𥺄𧱐𨛨𨴹𩱞𩳔𩷨𪊷𪵋𫔲𫰪",
 "更": "便哽峺挭梗浭甦硬稉筻粳綆绠莄郠鞕骾鯁鲠㛐㬲㹴㾘䢚𠡣𠫿𢙾𣆳𣍇𣍏𣍙𣍛𦛟𧋑𨁈𩂼𪏬𪯍𪸫𫅩𫒝𫨨𫵼𬳬",
 "妥": "俀哸娞挼桵浽綏绥脮荽鋖鞖餒骽鮾鵎㞂㟎㱣㼏䅑䧌𡖲𡲾𢚶𣮄𤕇𤕇𤕇𥷓𧞥𨁡𩗔𩣧𩭏𪸯𫌽𬔞",
 "吳": "俁娛悞𡔣𡢢𢫸𣑀𣮇𤝲𪕜𪞻𪣘𬗙",
 "系": "係孫綔緐緜繇邎鯀鲧㰃䌛𡈱𡈸𢐐𢐾𢑂𢑄𢑈𢑉𢭁𣛐𣟾𣠡𣨒𣼒𤫺𤬖𥌣𦁝𦅚𦅸𦅹𦆮𦾴𧄎𧋬𧚃𨙣𨵆𫌾𫒠𫪈𬮩",
 "足": "促哫娖捉浞珿莡趗趸跫跾踀踅蹇蹔蹙蹩蹵蹷躄躉躛躠鋜齪龊㹱㿓䇍䎌䛤䟟䟫䠂䠟䠠𠈮𠑮𡄱𡟐𡡍𡷿𢶝𣙳𤍷𤗁𤞥𤰉𤲊𤼗𤼯𤽱𥁯𥒭𥗈𥞺𥭽𥷼𧂨𧋥𧋩𧚖𧯩𧹤𧻻𧾸𧾺𧿀𧿃𧿮𧿿𨀂𨀲𨀶𨁀𨁘𨁛𨁢𨁥𨂝𨂞𨂢𨂣𨂬𨃗𨃞𨃢𨃨𨃫𨃱𨃲𨃾𨄚𨄝𨄟𨄡𨄦𨄬𨄯𨅇𨅐𨅘𨅚𨅠𨅴𨆊𨆐𨆑𨆕𨆜𨆥𨆧𨆪𨆬𨆬𨆻𨇌𨇐𨇓𨇘𨇛𨇜𨇭𨉌𩈤𩕈𩖑𩦬𩩔𪕝𪧎𪨡𪴢𪽰𫃥𫏐𫏔𫏕𫷭𬑝𬒺𬚃𬣹𬦭𬦼𬧁𬧈𬵔",
 "我": "俄哦娥峨峩涐珴皒睋硪義莪蛾誐鋨锇餓騀鵝鵞鹅㧴䄉䖸䞲䳗䳘𠩙𠹷𡟶𡦛𡱫𡻍𡽥𢐯𢐱𣇕𣟝𤄣𤘋𤯫𥪺𦏡𦩆𦶥𦾒𧒎𧚄𧭖𧶕𨁟𨉐𨿍𩒰𩣣𩣨𩭝𩷦𪘐𪭗𪱤𪲘𫇇𫠰𫨎𫪋𬐡𬓬𬕆𬚚𬚾𬪂",
 "求": "俅捄救梂殏毬浗球皳盚絿脙莍蛷裘觩賕赇逑銶鯄㐜㛏㞗㟈㤹䟵䣇䥭䥭𠂃𠗈𠡟𡌊𡌋𡨃𢈝𢚡𣗲𣪋𣭳𤈿𤕾𤗂𤙠𤞰𤥲𤶩𥆿𥒸𥙹𥟇𥥽𥪆𥭑𦽲𧋛𧒔𧗷𧚍𧧷𧻱𨁛𨘑𨫨𨭻𨱇𩒮𩗕𩛰𩣗𩰻𩱝𩳞𩾁𪁖𪉌𪌵𪪵𫃁𫃿𫡕𫡨𫵣𫻲𬇶𬊋",
 "余": "俆凃叙唋峹嵞庩徐悆悇捈敍敘斜梌涂狳畬畭硢稌筡艅荼蜍賖途酴除雓餘馀駼鮽鵌㻌䋡䞮䟻䣄䩣䳜𠄜𠎳𠎳𠏉𠐸𠕨𡌆𡌘𡒟𡝐𡨀𡷣𡸂𡽚𢚒𢧅𣁏𣇞𣥳𤙛𤫿𤬀𤶠𥌟𥚤𥥸𥶭𥺌𦛝𦹍𦼞𧁀𧧶𧾠𨌎𨴩𩟳𪇝𪊸𪑏𪝃𫀟𫒟𫛬𫣮𫶨𬁐𬡛𬳿𬹡",
 "狂": "俇誑诳逛鵟㤮㾠𢓯𢚯𣴥𧋵𧻺𨁨𨌃𨿗𩷗𩷬𫈃𫛭𫼺",
 "告": "俈勂哠峼悎捁晧梏浩焅皓硞祰窖筶艁誥诰造郜酷鋯锆靠頶鯌鵠鹄㬶㵆䎋䚛䧊䧼䯻䶜𠜯𠵞𠼑𠼑𡀻𡇪𡜲𡨟𡷥𢁏𢍎𢽍𣂋𣨓𣫀𣽋𣽸𤞺𤭚𤶳𤿩𥂷𥍱𥞴𥱠𥶚𥺊𦀽𦮽𧋓𧠼𧻰𨁒𨅻𨌒𨖄𨴬𨼄𩇸𩋺𪡬𪢡𪽀𫗓𫧂𫳩𫻵𫿜𬆧𬈯𬐊𬥘𬩙𬩭𬯱𬶔",
 "吾": "俉唔啎圄娪寤峿悟捂敔晤梧浯焐珸痦衙語语逜郚鋙铻鯃鼯齬龉㐚㹳䎸䏸䓊䦜䮏𠗐𠵥𠵦𠼘𡨂𡬑𢆖𢈪𢓲𢤓𢻊𣣄𤕻𤭑𥆐𥏒𥒾𥟊𥭠𦀡𦥉𦸭𦹊𧄯𧋋𧳎𨖍𩒾𩩑𩳌𪁙𪕡𪘚𪣔𪩳𫕁𫟙𫥩𫪸𫬮𬤿𬰜",
 "夋": "俊唆峻悛捘晙朘梭浚焌畯痠睃稄竣荾誜賐踆逡酸鋑陖餕馂駿骏鮻鵔鵕黢㕙㛖㻐䘒䝜䞭𠬍𡀚𡕶𡲲𢈡𨌘𨣪𩊻𩓀𩰽𪊴𪕞𪘑𫿪",
 "邑": "俋唈悒扈挹浥裛邕邫郌郶鄨㛕䇼䓃䢽䣈䣈䣉䣖䣗䭂䱒𠅔𢌓𢸊𢻌𣿑𤅻𤕕𤙝𤶛𥒵𥨪𦀕𦛞𦤡𦶁𧅉𧋾𧠅𨁲𨙾𨚆𨚇𨚈𨚉𨚊𨚋𨚒𨚚𨚠𨚡𨚬𨚭𨚵𨚺𨚻𨚼𨚽𨛗𨛚𨛛𨛜𨛝𨛦𨛫𨛬𨛷𨛸𨛾𨛿𨜀𨜁𨜂𨜞𨜣𨜯𨜲𨝅𨝚𨝝𨝞𨝟𨝠𨝦𨝩𨝬𨝼𨞀𨞁𨞏𨞔𨞔𨞠𨞡𨞦𨞮𨞯𨞰𨞸𨞸𨟄𨟩𨟮𨦺𨹝𩇊𩇑𩎏𩗥𩫩𪁗𪁨𪖱𪪘𪲲𫉏𫼷𬩴𬩺𬪁",
 "良": "俍哴娘崀悢斏朖桹浪烺狼琅硠稂筤籑粮艆莨蜋誏踉躴郞酿鋃锒閬阆駺㓪㝗㟍㢃㫰㱢㾗䀶䆡䍚䡙䯖䱶𠻡𡘳𡳋𢕦𢭗𢽂𣂞𤗀𤭒𥍫𥧫𥱉𥶉𦀬𦫐𦫑𦿉𧚅𧳓𧻴𩗖𩷕𪁜𪡙𫅞𫗨𫦭𬏊𬣼𬴀𬸏",
 "肖": "俏削哨娋宵屑峭帩弰悄捎旓梢消焇琑痟睄矟硝稍筲綃绡艄莦蛸誚诮趙踃輎逍銷销陗霄鞘韒颵髾魈鮹㲖㲵䏴䘯䨭䴛𡌔𡜽𡯩𢈭𢓮𢼼𢽐𣆺𣤎𣭱𤙜𤞚𤫾𤿨𥋘𥙬𥵦𥹶𦂚𦐺𦓴𦚍𦿃𧳍𧶈𨛍𨡀𨪮𨲆𩠦𩡈𪁎𪌯𪑊𪘞𬳘𬹈𬺆",
 "利": "俐唎娳峲悡悧梨梸浰犁猁琍痢筣脷莉蜊誗鋓鋫鬁鯏㴝㻳䂰䖽䬆䱘䵩𠜣𠝯𠡩𡥬𡨖𡸉𡽜𢈱𢳽𣇘𣮀𣮂𤉉𤉌𥚥𥟦𥦉𦿾𧪙𩣫𩧸𪁐𪌱𪣛𪭼𪰬𫔣𫙋𫣯𫭴𬓪𬯼𬸎",
 "甬": "俑勇勈恿悀捅桶涌痛硧筩蛹誦诵踊通銿鯒鲬㛚㦷㪌㷁㼧𠋀𠳀𡇮𢓶𣗧𣘋𣭲𣵳𤰏𤰏𥦁𦛸𧆿𧗴𧚔𧻹𨪞𨴭𨺳𩊾𩒼𪌻𪔜𪴷𫈏𫺩𬗝𬩐𬱥",
 "完": "俒唍捖晥梡浣烷皖睆筦綄脘莞輐鋎院鯇鲩鵍䯘䴷𡣑𡤁𡫅𡷗𢕋𢽉𤍘𤞵𥹳𧚁𧶉𨠻𨵄𩳚𪫻𪺗𫀏𫀶𬏉𬒑𬘫𬹉",
 "巠": "俓剄勁娙巰弳徑挳桱殌氫涇烴痙硜經脛莖蛵誙踁輕逕鋞陘頸鵛㹵䀴䞓䣆䪫𠗊𠲮𡷨𢙼𣇁𣫒𤭓𥥻𦈵𧯬𧸶𨏄𨠸𨿋𩈡𩭙𩰹𩳍𩷏𪊵𪏅𪕣𪪯",
 "宋": "俕浨筞㧲㨲䊉䫅𠓅𠳼𢚗𢚠𣇆𣒐𥒬𦯕𧱍𨠼𫋀𫶀𬴪",
 "否": "俖嚭娝桮痞脴踎㕻㤳㧵㳪䓏䫊䫠𠥀𠥧𠳝𠵠𣇊𣷧𤉮𤞜𥞶𥺖𦈶𦊾𦋑𦐸𦜟𧯻𧳏𧻳𨛔𨡥𨧆𨹭𩛷𩣚𩭍𪈍𪪓𫎗𫫘𫫘𬒷𬕃𬱰",
 "希": "俙唏悕晞桸欷浠烯狶琋瓻睎稀絺脪莃豨郗餙鯑鵗㛓㟓㹷㾙䖷䛥䤭䮎𠜗𠨚𢓬𢬾𣱬𥭘𦖁𧎙𧳐𧶖𧻶𨓇𨡂𨿕𨿛𩊽𩒽𩭉𪌹𪖥𪖪𫄨𫹇𬮶",
 "里": "俚厘哩娌悝捚梩浬狸理瓼童粴艃荲裏裡貍野量釐鋰锂鯉鲤㢆㾖䋥䤚䧉𠗔𠫶𠸨𠹈𡃚𡏂𡒟𡔬𡪂𡿂𢃇𢑿𢢨𣙚𤋰𤖃𥆤𥆼𥈯𥌬𥓄𥗃𥚃𥪽𥱐𥲔𥴁𥵷𦆊𦓵𦕸𦡃𦷗𧋎𧔊𧚣𧸳𧻲𨁫𨓦𨘦𨛋𨤢𨤣𨤤𨤦𨤧𨤩𨤪𨤫𨤬𨤭𨤮𨤯𨤰𨤱𨤳𨤵𨤷𨤷𨤻𨭱𨴻𩁤𩧹𩭇𩳓𩼞𪋠𪜽𪟯𪱁𫈩𫒁𫒂𫙣𫝟𫭬",
 "免": "俛兔凂勉娩嬎嬔悗挽搀晚晩梚浼睌絻脕莬谗輓鋔鞔鮸㝃㡈㻊䅋䜛䜛𠋂𠒾𠓄𠓍𠢖𠬍𠲶𡁅𡁅𡢎𡤳𡤳𡨚𡷭𡸊𡽏𡽡𡽡𡿢𢯂𣆶𣘽𣚻𣝊𣝊𣻖𤀧𤀧𤑑𤑑𤟛𤲈𤿯𥃢𥇅𥙵𥦙𥦱𥱃𦆵𦆵𦇿𦇿𦇿𧈋𧈒𧓰𧓰𧖵𧚇𧨕𧼧𨁙𨉏𨌜𨓜𨞭𨞭𨬋𨳂𨵃𨽊𨽊𨽺𩆊𩈦𩝎𩝜𩟖𩟖𩣦𩯯𩯯𩾃𩾅𪒣𪞁𪞂𪳟𪶳𪽿𪾐𫐶𫙁𫙭勉冕𫥎𫰲𬊕𬘇𬨈𬷖",
 "甹": "俜娉梬涄騁骋䀻䛣䳙𠁔𠏬𠷓𠸮𢓳𢖊𥪁𥭢𦀔𦰝𧮹𫤝𫪆𫷘𬫙",
 "呆": "保宲楶槑槑襃㙅㳭𠍂𠍙𠳳𠻇𡒩𣍀𣞃𣮃𤥯𤨷𤶭𥆫𥧷𥯲𦹂𧜯𨲃𨹦𩛴𩞛𩭚𪁣𪭷𪲖𫗷𫬕",
 "矣": "俟唉娭挨欸涘竢誒诶逘騃㶼㸻䀵𠤘𡱢𢈟𢏦𢓪𣘂𤶗𥏖𥏳𥒲𥜖𦩈𦩉𦮸𨧚𨴱𪠠𫆆𫘤𫞀𬂼𬦑𬭐𬵖",
 "夾": "俠匧唊峽悏挾梜殎浹狹瘞硤筴綊翜脥莢蛺裌郟鋏陜頰鵊㓨㛍㤲㪎㰰㴺㼪㽠㾜㿓䀹䛟䧪䩡䬊䵌䶝𠗉𠩘𡒜𡖳𡙩𡞡𡡌𡣀𡣇𢂿𢃫𢈙𢊃𢩟𢲯𣇍𣙉𣭶𣼊𣾰𤥵𤲍𤷾𥞵𥪂𦦕𦩀𦷈𧎈𧒐𧶘𧻵𨁂𨄣𨠿𨮅𨻊𨻏𨻤𩈧𩎱𩔯𩠣𩭌𩷟𪅣𪖨𪘘𫀋𫏶䀹𫰃𬮊",
 "吴": "俣娱悮洖祦筽脵茣虞蜈誤误鋘麌㻍𣵗𦨳𫚾𬭌",
 "弟": "俤剃娣悌挮晜梯涕焍珶睇祶稊綈绨罤豑豒递銻锑鬀鮷鵜鹈㖒㣢䏲䑯䬾䶏𡌡𡥩𢚖𣋥𣋥𣜹𤫼𤭌𥊽𥺀𦯔𧀾𧃣𧋘𧯪𧳋𧳼𧴉𨁃𨹥𨿘𨿝𩓂𩽞𪁩𪕧𪖦𪫃𫤜𫸽𬀹𬑳𬡜𬲻𬶕",
 "車": "俥厙唓庫廤捙斬硨莗蛼軋軌軍軎軏軐軑軒軓軔軕軖軗軘軙軚軛軜軝軞軟軠軡転軤軥軦軧軨軩軪軫軬軭軮軯軰軱軲軳軴軵軶軷軸軹軺軻軼軽軾軿輀輁輂較輄輅輆輇輈載輊輋輌輍輎輏輐輑輒輓輔輕輖輗輘輙輚輛輜輞輟輠輡輢輣輤輥輦輨輩輪輫輬輭輮輯輰輱輲輳輴輵輶輷輸輹輺輻輼輽輾轀轁轂轃轄轅轆轇轈轉轊轋轌轍轎轏轐轒轓轔轕轖轗轘轙轛轜轝轞轟轟轟轠轡轢轣轤轥連閳陣㐣㾝䡂䡃䡄䡅䡆䡇䡈䡉䡊䡋䡌䡍䡎䡏䡐䡑䡒䡓䡔䡕䡖䡗䡘䡙䡛䡛䡜䡝䡞䡟䡠䡡䡢䡣䡤䡥䡦䡧䡨䡩䡪䡫䡬䡭䡮䡯䡰䡱䡲䡳䡴䡵䡶䡷䡸䡹䡺䡻䡼䡽䡾䡿𠜒𠜥𠣞𡌄𡕀𡝀𡤆𡷖𢀃𢚷𢣜𢤙𢥩𢰄𣒞𣞹𣦔𣫂𣵐𤉖𤛕𤡄𤥭𤦳𤭔𥔚𥪭𥰳𥱍𥼏𦀺𦆕𧫂𧷄𨊠𨊡𨊣𨊤𨊥𨊦𨊧𨊨𨊩𨊪𨊫𨊬𨊭𨊮𨊰𨊱𨊲𨊳𨊴𨊵𨊶𨊸𨊹𨊺𨊻𨊼𨊽𨊾𨊿𨋀𨋁𨋂𨋃𨋄𨋅𨋆𨋇𨋈𨋉𨋊𨋋𨋌𨋍𨋎𨋏𨋐𨋑𨋒𨋓𨋔𨋕𨋖𨋗𨋘𨋙𨋚𨋜𨋝𨋞𨋟𨋠𨋡𨋢𨋣𨋤𨋥𨋦𨋧𨋨𨋩𨋪𨋫𨋬𨋭𨋮𨋯𨋰𨋱𨋲𨋳𨋵𨋶𨋷𨋸𨋹𨋺𨋻𨋼𨋽𨋾𨌀𨌁𨌂𨌃𨌄𨌆𨌇𨌈𨌉𨌊𨌋𨌌𨌍𨌎𨌏𨌐𨌑𨌒𨌓𨌔𨌕𨌖𨌘𨌚𨌛𨌜𨌝𨌞𨌟𨌠𨌡𨌢𨌣𨌤𨌥𨌦𨌧𨌨𨌩𨌪𨌫𨌬𨌭𨌮𨌯𨌱𨌲𨌳𨌴𨌵𨌶𨌷𨌸𨌹𨌺𨌻𨌼𨌽𨌾𨌿𨍀𨍁𨍂𨍄𨍅𨍆𨍇𨍉𨍊𨍋𨍌𨍍𨍎𨍏𨍐𨍑𨍓𨍓𨍔𨍕𨍖𨍗𨍘𨍙𨍙𨍚𨍜𨍝𨍞𨍟𨍠𨍡𨍢𨍣𨍤𨍥𨍦𨍧𨍨𨍩𨍪𨍫𨍬𨍭𨍮𨍰𨍱𨍲𨍳𨍴𨍵𨍷𨍸𨍹𨍺𨍻𨍼𨍾𨍿𨎀𨎁𨎂𨎄𨎅𨎆𨎇𨎈𨎉𨎊𨎋𨎌𨎍𨎎𨎏𨎐𨎑𨎑𨎒𨎓𨎓𨎕𨎖𨎗𨎘𨎙𨎚𨎛𨎜𨎝𨎞𨎟𨎠𨎡𨎢𨎣𨎤𨎥𨎦𨎧𨎨𨎩𨎪𨎫𨎬𨎭𨎮𨎰𨎱𨎲𨎳𨎴𨎵𨎶𨎷𨎸𨎹𨎻𨎼𨎼𨎽𨎾𨎿𨏀𨏁𨏂𨏃𨏄𨏅𨏆𨏆𨏇𨏉𨏋𨏌𨏍𨏎𨏏𨏐𨏑𨏒𨏓𨏔𨏕𨏖𨏖𨏗𨏘𨏙𨏚𨏛𨏜𨏝𨏞𨏟𨏠𨏡𨏢𨏣𨏤𨏥𨏦𨏧𨏨𨏪𨏫𨏬𨏬𨏭𨏮𨏰𨏰𨏱𨏲𨏳𨏴𨏵𨏸𨏹𨏻𨏽𨏾𨏿𨏿𨏿𨏿𨐀𨐁𨐂𨐃𨐄𨐄𨔪𨛩𨝩𨩕𩋱𩐑𩒷𩧕𩳛𪋀𪢫𪨑𫁿𫂄𫅨𫈹𫌼𫏲𫏳𫏴𫏵𫏶𫏷𫏸𫏹𫏺𫏻𫏽𫏾𫏿𫏿𫐀𫐁𫐂𫐃𫐃輸𫰀𫴀𬍻𬦲𬧱𬧲𬧳𬧴𬧵𬧶𬧷𬧸𬧹𬧺𬧻𬧼𬧽𬧾𬧿𬨀𬨺𬩰𬵀𬵒",
 "寿": "俦帱梼涛焘畴祷筹诪踌鋳铸陦㤽䓓𡀤𢭏𤽯𥺅𦀳𩗡𩙧𩾂𪫷𪺣𪿞𫾳𬊍𬢪𬸍",
 "志": "俧娡梽痣綕覟誌鋕䄊䏯䓌𢂴𢙺𣇌𤥴𥒺𥭡𥺃𦄥𦐼𧋺𩊴𩷓𪁓𪫍𫨺𫭰𬇨𬊌𬘨𬢌",
 "严": "俨酽䴡𠪕𤂢𤞤𪨷𫥍𫪂𫭲𫿞𬇬",
 "两": "俩唡满瞒螨辆魉𣯣𤂎𪠡𪭵𫞩𫦩𬜯𬰥",
 "丽": "俪彨逦郦酾骊鲡鹂㛤𪲔𫀌𫄥𫪃𫾲𬕄",
 "来": "俫崃徕慭梾涞睐莱赉铼𠂲𠡠𢝗𢣡𢣡𣑎𣘐𣘐𣜻𤳆𤳇𥟂𦣓𧀃𧀃𧟜𧟜𧟜𧟜𧳕𨔤𩓋𩠄𪎌𪲬𪺽𫍧𫏌𫝫𫪁𫷬𫼲𬩾𬹗",
 "私": "俬𥢅𥢆𦮺𫁅",
 "佥": "俭剑崄捡敛检殓猃睑硷签脸莶裣险验𤈷𪡋𪫺𫎨𫑷𫣛𫣛𫰰𬘪",
 "府": "俯捬焤腐腑𢉶𢊾𣩇𨁵𩸅𪪠𫎃",
 "和": "俰啝惒萂𡞈𣷓𧇮𨨑𨨛𫓼",
 "具": "俱惧椇真颶飓㖵𤷢𥟭𨁺𨍄𨨣𨵙𩳖𪼻𫓃𫕄𫼐𬄖𬝬",
 "効": "俲",
 "非": "俳剕匪厞啡奜婓婔屝徘悱悲扉排斐暃棐棑毴渄猅猆琲痱緋绯罪翡腓菲蜚裴裵裶誹诽輩輫辈陫霏靟靠靡餥馡騑鯡鲱㐟㒎㗺㫵㹃㻗䠊䤏䤵䥆䨽䨾䨿䩀䩁䫍𠓿𠢻𠣋𡈚𡌦𡐥𡫗𡿌𢊎𢟵𣡂𣾝𤊬𤗋𤡝𤦅𤾅𤿻𥇖𥺟𦆷𦋛𦖕𦩋𦸪𦻅𦻥𦻰𦻹𧁝𧇁𧍃𧓊𧕿𧾁𨓿𨛬𨵈𨻼𩄼𩇩𩇪𩇫𩇬𩇭𩇮𩇯𩇰𩇱𩇲𩇳𩇴𩇵𩇶𩇷𩇸𩇹𩇺𩇻𩇽𩇾𩈀𩈁𩈂𩈂𩋂𩎻𩻲𪁹𪂏𪂞𪽺𪿨𫅪𫕽𫕾𫕿𫸝𬏿𬐤𬚀𬜞𬞃𬰙𬰚𬰛𬰜𬰝𬰞𬰟𬴂",
 "戔": "俴剗帴棧殘淺牋琖盞碊箋綫菚虥虦諓賤踐輚醆錢餞馢㟞㣤㥇㹽䎒䏼䗃䙁䧖䱠䴼𠒲𠵖𠽈𡍌𡸚𢈽𢧗𢯆𣂧𣮏𤖆𤷃𥂥𥟥𥵃𦈻𦋈𧗸𧮺𧶤𨏖𨵊𩋋𩤊𪏊𪘪𪭔𪸶𫑠𬷟",
 "表": "俵婊脿裱諘錶㧼䁃䱪𠶓𡈂𡨲𣍅𣓻𣷴𣿵𤷶𧘰𧶫𩓳𩤕𩩩𪍊𪿦𫈒𫻘𬒾𬗠",
 "叔": "俶婌寂惄掓椒淑琡督菽裻諔踧錖㾥䱙𠴫𡹧𢃝𢉌𢛼𣈉𤟏𤬂𥁽𥓍𥚔𥟧𥺤𥺱𧇝𧡕𨧷𨺏𩾈𫃬𬆷",
 "肥": "俷淝萉蘎蜰䈈𡝞𤷂𧁳𧌳𧓖𫉳",
 "奉": "俸唪捧棒淎琫菶蜯㷯䏾䩬䭰䳞𢜗𣋕𣨞𤊡𦧁𩃳𩄴𩗴𩸮𩺨𪉪𪐃𪽃𪽙𫒩𫗉𬕏𬥆𬪅",
 "亞": "俹啞堊壼婭孲惡掗斵椏氬琧瘂稏蝁錏閸鵶㝞㰳䃁䛩䢝𠁏𠁐𠁕𠆊𠜲𠨣𠼞𡈀𡈧𡔶𡱻𡹄𡹅𢑹𢛟𢩔𣂪𣇩𣉩𣛽𣣾𣤼𣵾𤊗𤦩𤲢𤲾𤺘𥏝𥦳𥮳𥺼𦜖𦩒𦲕𧓥𧢗𨁶𨮃𨷵𩓩𩗽𩤃𩩤𩭯𩸇𩸋𩸖𫡷𬘃𬪿",
 "奄": "俺剦匎唵崦庵掩晻殗淹痷硽罨腌菴裺醃閹阉餣馣鵪鹌黤㛪㞄㡋㤿㪑㭺㷈㽢䁆䄋䅖䎨䛳䣍䤶𠻒𡯸𡹛𢔂𢽱𣃾𣄑𣣚𤗎𤩃𥦩𥯃𦁏𦋙𦑎𦖈𦜽𧌄𧼎𨂁𨉚𨌧𨜀𨤕𨺍𨽅𩃗𩅝𩈯𩋊𩓹𩗷𩤔𩸆𪪅𫇌𫍫𫳑𫸽𬱨𬲼𬶖",
 "备": "俻邍𠝘𡍉𡞕𥓶𨘡𪌾",
 "育": "俼唷徹撤棛淯澈焴瞮蘛蜟轍辙逳錥㛩㣃㥔㬚㯙㻙䋭䒆䘻𠾀𢯡𣚥𣣎𣨧𣫺𤀷𥺞𦅄𦔞𦝑𦠣𦱀𨅊𨌯𨏣𨟝𩩣𪟆𪮌𫆡𫆽𫇄𫓾𬛠",
 "欣": "俽惞掀焮鍁锨𢜛𣔙𤊑𤷓𦜓𦲽𪡗𪾯𬢀",
 "卑": "俾啤婢崥庳捭朇椑渒焷牌猈琕痺睥碑禆稗箄粺綼脾萆蜱裨諀豍貏郫錍陴鞞顰颦髀鵯鹎鼙㗗㪏㼰㽡䇑䚜䠋䡟䫌䰦䱝䴽𠜱𠥉𠧃𠧅𠬈𡐕𡦆𡦟𡲎𢃍𢋜𢔌𢛞𣮐𤽹𤿾𥏠𥱼𦓸𦩖𦹽𧌠𧓎𧯿𧼠𨐜𨡕𨲋𨿵𩌛𩏂𩔹𩔾𩖓𩗫𩫝𩫪𩫫𩫮𩭧𪂃𪏒𪐄𫉹𫖓𫜔𬨌",
 "虎": "俿唬婋彪椃淲猇琥甝箎萀虒虓虝號虠虢虣虤虤虥虦虩虪裭覤諕錿鯱㙈䖊䖋䖌䖎䖐䖑䖓䖔䖕䖖䖘䖚䖛䗂䝞䬌䰧𠥶𡄼𡅗𡒞𡦨𢈶𢏯𢜜𢮎𢹁𣣍𣱤𤷡𥳠𦁲𦖖𦩕𧆡𧆢𧆦𧆫𧆬𧆯𧆰𧆷𧆸𧆹𧆻𧆼𧆽𧇅𧇌𧇍𧇎𧇐𧇑𧇒𧇓𧇙𧇚𧇛𧇜𧇝𧇞𧇟𧇢𧇥𧇦𧇭𧇮𧇯𧇰𧇱𧇶𧇷𧇸𧇹𧇻𧈄𧈅𧈆𧈇𧈈𧈊𧈋𧈌𧈍𧈐𧈙𧈜𧮽𧸾𧹁𧹂𨂜𨔛𨛵𨛸𨵘𩆱𩤌𩦶𩾇𪂬𪏐𪘰𪛌𪛔𪞣𪯟𫊠𫘌𫜐𫧰𫬲𫳔𫻺𫾹𫿋𬟪𬟬𬟭𬟰𬟲𬢆𬤀",
 "長": "倀帳張悵掁棖涱痮粻脹萇賬躼鋹韔餦鼚㙊㷃䂻䗅䛫䠆䦉䩨𡘷𢐘𣛊𣛓𤊞𤟔𤬅𤲘𥇔𥮲𥱭𦁢𦹥𧄂𧛇𧹔𨱥𨱼𨱾𨲅𨲍𨲍𨲖𨲗𨲴𨲷𩭨𩸕𪠍𪥽𪧼𪯹𪺑𫪛𬔡𬪆𬷔",
 "知": "倁智椥痴聟蜘踟鼅㲛䓡䝷䣽䵹𠕧𢔊𢛍𢜔𢯙𣉻𣊋𣔇𣶱𣻩𥇭𥏯𥯌𦝔𧌲𧐉𧡐𨔓𨢮𨢰𨢱𩗨𩸴𪑜𪿍𫪦",
 "幷": "倂𠆕𠌸𠝵𢆟𢆩𤙾𤲒𤳊𥲂𧚭",
 "咎": "倃晷櫜綹绺鯦麔鼛㰶㹾䓘䛮𠴰𡅦𢜥𣓌𤷑𥢑𥮑𥻀𦜵𧖼",
 "肴": "倄崤殽淆誵郩餚㮁𠴳𢛘𤉶𤎦𤐳𤚁𤷤𧼡𨡜𪘱𫨖𫾼𬗤𬳁",
 "卒": "倅啐崒崪悴捽晬椊淬焠猝琗瘁睟碎祽稡窣箤粹綷翠脺萃蜶誶谇賥踤醉錊顇㰵㱖㲞䘹䚝䯿䱣𠁸𠗚𠧆𠫏𠾹𡄰𡇻𡝵𡦧𡨧𡮇𡳝𢃒𢈼𢋳𢔙𣖛𣖢𣦮𣨛𤂭𤪛𤭢𤲠𦑋𦖒𧫒𧳚𧾉𨔊𨢅𨿼𩗶𩜘𩤏𩫛𪁽𪋌𪓌𪘧𪟼𪺨𫇈𫥜𫦈𫩅𫫑𫻣𬐎𬑮𬙼𬜈𬺋",
 "兩": "倆啢掚緉脼蜽裲輛魎㔝䓣䠃䩫𠬙𢎏𣍷𣓈𣼣𥇑𥮩𦑅𧶪𨨄𩀝𩗾𩭫𩳮",
 "宛": "倇剜啘婉帵惋惌捥晼椀涴焥琬畹睕碗箢綩腕菀蜿豌踠鋺鵷黦㱧䑱䗕䘼䛷䝹䡝䩊䩩䯛䵫𡫦𡮄𡸥𢏿𢮘𣫼𤗍𤟊𤷧𥟶𧯳𨉝𩈱𩎺𩣵𩸩𩸪𪂦𪂭𪋅𬓅𬳞𬶝",
 "來": "倈勑唻婡崍庲徠斄棶淶猌猍琜睞箂萊誺賚逨郲錸顂騋鯠鶆麳㯤㯤㾢䂾䅘䋱䚅䚞䧒䳵𠌊𠎙𠐇𠐇𠩬𠻮𠽳𠾂𡎼𡑃𡣰𢆠𢋢𢑬𢜞𢯦𢽟𣍿𣓚𣖤𣗅𣛌𣛤𣝿𣞱𣬀𣮉𤀛𤍂𤖠𤖧𤖧𤦃𤲓𤲝𥃌𥏳𥓜𥚒𥣱𦓹𦠘𦩑𦻣𧍍𧡛𧡽𧯲𧳟𧶛𧷖𧼛𨂐𨝖𨤭𨤺𩭷𩳳𩻯𩻿𪑚𪒁𪘨𪝗𪧳𪩭𪰪𪴺𫇏𫑹𫣙𫣚𫨬𫯓𬑴𬓡𬛕𬛶𬩥",
 "忩": "倊捴棇焧総㥖䐋䓗䙂𪠎𫃄",
 "固": "個凅夁婟崓崮棝涸痼祻稒箇錮锢鯝鲴㧽䍛䓢䭅𠴱𡇤𡈅𡹍𢛅𣎏𧛂𧶮𩧽𫆣𬖢𬰦𬲾",
 "官": "倌婠悹悺捾棺涫琯痯管綰绾舘菅輨逭錧館䗆䘾䠉䦡䩪𠴨𢃙𢉂𢣉𥟓𦜐𨐝𨜌𩈬𪣬𫐑𬷡",
 "咅": "倍剖勏婄掊敨棓殕毰涪焙琣瓿碚稖箁菩賠赔踣部郶醅錇锫陪鞛餢㖣㟝㥉㪗㰴㾦䋨䍌䎧䏽䞳䦣䫓䬏䯽䳝䴺𠍭𠣭𠹪𠾈𡃠𡯳𡯷𢒷𢮏𢵾𣾾𤉿𤗏𤬃𥪇𦅹𦩜𦺎𦺑𧷯𧽴𨿦𩔻𩸬𪡳𫫌𫮷𬠗𬡣𬶜𬹰",
 "典": "倎唺婰捵敟晪椣淟猠琠痶睓碘腆覥觍賟錪㙉㥏䓦䠄𠔩𠗘𠢣𠩷𠽝𡥳𣇺𤿶𥦟𥮏𥳫𥵶𥶚𦖌𦥃𧌎𧡝𧨸𧹖𨡏𨹻𩣲𪯦𪸸𬒿𬧦𬭓",
 "門": "們問悶捫椚焛聞菛誾鍆閁閂閃閄閅閆閇閈閉閊開閌閍閎閏閐閑閒間閔閕閖閗閘閙閚閛閜閝閞閟閠閡関閣閤閥閦閧閨閩閪閫閬閭閮閯閰閱閲閳閴閵閶閸閹閺閻閼閽閾閿闀闁闁闂闃闄闅闆闇闈闉闊闋闌闍闎闏闐闑闒闓闔闕闖闘闙闚闛闝闞闟闠闡闢闣闤闥闦闧㥃䦌䦍䦎䦏䦐䦑䦒䦓䦔䦕䦖䦗䦘䦙䦚䦛䦜䦝䦞䦟䦠䦡䦢䦣䦤䦥䦦䦧䦨䦩䦪䦫䦬䦭䦮䦯䦰䦱䦲䦳䦴䦵𠑆𠑡𠵘𠽫𡀊𡂛𡆏𡍜𡕌𡮆𡮉𡾧𢅰𢠶𢡙𢡥𢹶𣊱𣠼𣡞𣶯𣾬𤀵𤁹𤂕𤄇𤄡𤅾𤓁𤡌𤩟𤷱𦁺𦇾𦝋𦻶𦻺𧃁𧄱𧅶𧮕𧯋𨇧𨇲𨉖𨳊𨳋𨳌𨳍𨳎𨳏𨳐𨳒𨳓𨳔𨳕𨳖𨳗𨳘𨳙𨳚𨳛𨳜𨳝𨳞𨳟𨳠𨳡𨳢𨳣𨳤𨳦𨳧𨳨𨳩𨳪𨳫𨳬𨳭𨳮𨳯𨳰𨳱𨳲𨳳𨳴𨳵𨳶𨳷𨳸𨳹𨳺𨳻𨳼𨳽𨳾𨳿𨴀𨴁𨴂𨴃𨴅𨴆𨴇𨴈𨴉𨴊𨴋𨴌𨴍𨴎𨴏𨴐𨴑𨴓𨴔𨴕𨴖𨴗𨴘𨴙𨴚𨴛𨴜𨴝𨴞𨴟𨴠𨴡𨴢𨴣𨴤𨴥𨴦𨴧𨴨𨴩𨴪𨴫𨴬𨴭𨴮𨴯𨴰𨴱𨴲𨴳𨴴𨴶𨴷𨴸𨴹𨴺𨴻𨴼𨴽𨴾𨴿𨵀𨵁𨵂𨵃𨵄𨵅𨵆𨵇𨵈𨵉𨵊𨵋𨵌𨵍𨵎𨵐𨵑𨵒𨵓𨵔𨵕𨵖𨵗𨵘𨵙𨵚𨵛𨵜𨵝𨵞𨵟𨵠𨵡𨵢𨵣𨵤𨵥𨵦𨵧𨵨𨵩𨵪𨵫𨵬𨵭𨵮𨵯𨵰𨵱𨵲𨵳𨵴𨵵𨵶𨵷𨵸𨵹𨵻𨵼𨵽𨵾𨵿𨶀𨶁𨶂𨶃𨶅𨶆𨶇𨶈𨶉𨶊𨶋𨶌𨶍𨶎𨶏𨶐𨶑𨶒𨶔𨶕𨶖𨶗𨶘𨶙𨶚𨶛𨶜𨶝𨶞𨶟𨶠𨶢𨶣𨶤𨶥𨶦𨶧𨶨𨶩𨶪𨶫𨶬𨶭𨶮𨶯𨶰𨶱𨶲𨶳𨶴𨶵𨶶𨶷𨶸𨶺𨶻𨶾𨶿𨷀𨷁𨷂𨷃𨷄𨷅𨷆𨷇𨷈𨷉𨷊𨷋𨷌𨷍𨷏𨷐𨷒𨷓𨷔𨷕𨷖𨷗𨷘𨷙𨷛𨷜𨷞𨷟𨷠𨷡𨷢𨷣𨷤𨷥𨷦𨷧𨷨𨷩𨷪𨷫𨷬𨷭𨷮𨷮𨷮𨷯𨷰𨷱𨷲𨷳𨷴𨷵𨷶𨷷𨷸𨷹𨷺𨷼𨷽𨷾𨷾𨷾𨷾𩦴𪘶𪩴𪺿𫔘𫔙𫔚𫔛𫔜𫔝𫔞𫔟𫔠𫔡𫔢𫔣𫔤𫔥𫔧𫔨𫔩𫔪𫔫𫱢𬮅𬮆𬮇𬮉𬮊𬮋𬮌𬮍𬮎𬮏𬮐𬮑𬮒𬮓𬮕𬮖𬮗",
 "到": "倒捯椡箌菿𠕥𠴼𥓫𥓬𦻢𧌼𧼤𨍀𪶌𬦶",
 "炎": "倓剡啖婒惔扊掞敥晱棪欻毯氮淡烾煔燄燅琰痰睒緂腅舕菼裧覢談谈賧赕郯醈錟锬顃颷餤㥕㲜㷋㷠㷥䆦䊏䎦䑞䗊𠊌𠪛𡀕𡐩𡐼𡨼𡪶𡬖𡳈𡳉𡽤𡽽𢃔𢉘𢊝𢠡𢣶𢹙𢻟𢽻𣃌𣝎𣞖𣨬𣯅𤃨𤈹𤉞𤊼𤋆𤌜𤎢𤎥𤎫𤏞𤐕𤐥𤐪𤑂𤑓𤑖𤑶𤒀𤒞𤓅𤓕𤟇𤡗𤢯𤪏𤯇𤰀𤲩𤳩𥌌𥶒𦆡𦋎𦋴𦌓𦒪𦖠𦦨𦧿𦨄𦩗𦫟𧅊𧅡𨁹𨆴𨌹𨏏𨖉𨖤𨞧𨞴𨟏𨤁𨤮𨪘𨬄𨽃𨾄𩕶𩕼𩖋𩖖𩗹𩙪𩩧𩸥𩼄𩼩𪂈𪉧𪏋𪑓𪹑𪹝𪺯𬊦𬋓𬫨𬸖",
 "屈": "倔啒崛崫掘淈煀窟誳镼鶌㭾㻕䓛䘿䞷䠇𠜾𠡰𢏷𣨢𣮈𤟎𥇣𥏘𥪊𥮝𥺷𦁐𦜇𧌑𨧱𨱊𨵡𩋎𩓦𩣹𩤓𩭪𪘳𪥕𫍮𫛵𫵢",
 "垂": "倕厜唾娷崜捶棰涶甀睡硾箠綞缍腄菙諈郵錘锤陲㩾㻔䅜䍋䮔䳠𠝶𡐱𡑈𡙇𢏴𢔝𢛉𢛲𢻩𣂩𣇦𤷣𥡭𦈼𦖋𦥻𧌯𨉡𨔠𨙔𨲉𨿠𩃒𩗰𩣷𩩞𩭦𩸫𫵌",
 "幸": "倖啈圉執報婞悻涬瓡盩睪緈逹㓑㼬䁄䂔䕮䛭𠙜𠙱𠤄𠦧𠪼𠫃𡐿𡔄𡡘𡫬𡫭𢅲𢆧𢆨𢆪𢩓𢱬𢻏𢽞𢿐𣀇𣀐𣈑𣊮𤜔𤲜𤿹𥂎𥃁𥃍𥃏𥦭𥧗𥨴𥨼𥩁𥩅𥰬𥱩𥶶𥷚𦌙𦵳𦶗𧂞𧅹𨇭𨘈𨝜𨬵𨵉𩍸𩞱𪈅𪡒𪪉𪯎𪲟𫄀𫈐𫓗𫡈𫳐𬍬𬙨𬟲",
 "朋": "倗奟崩弸掤棚淜焩痭硼稝綳绷萠輣錋鬅鵬鹏㥊㻚㽰䙀䨜𠜳𠞳𠡮𡎾𡕑𡞇𡹔𡼜𢉁𢽩𣂤𣎠𣎡𣨥𤑌𥂀𥦜𦎿𦘃𦣓𧌇𧽹𨂃𨝙𨞞𨲰𨹹𩋒𩕕𩸀𪂙𪼔𫳕𫷚𬓃𬕔𬙶𬦒𬭖",
 "尚": "倘徜惝敞淌緔绱耥趟躺鋿鞝㗬㫾㭻㲂䊑䠀䣊𠶤𡖹𡗑𡝣𡞀𡭿𡮢𡮵𡮶𢉒𢌏𢡭𢮐𢻒𢿽𣀏𣋈𣎃𣥺𣦎𣦛𣮜𤙽𤷛𤿼𥊢𥊣𥊰𥋤𥓡𥳦𦈹𦉘𦫢𦰱𧑼𧒩𧨲𧩡𨌩𨜂𨡔𨣛𨿰𩅌𩗵𩼝𪁺𪟶𪽄𫖦𫙥𫨋𫱪𫻹𬆅𬓮𬕒𬡾𬴬",
 "奇": "倚剞婍寄崎徛掎攲敧旑旖椅欹渏猗琦畸碕綺绮裿觭踦躸輢錡锜陭騎骑鵸齮㚡㚡㞆㟢㢊㥓㱦㾨㿲䄎䐀䓫䗁䛴䝝䩭䫑䫯䭲𠔵𠖏𠵇𡚎𢽽𣂦𣚂𣾏𣾐𤘌𤯱𥇚𥏜𥟏𥺿𦖊𧼘𨓾𨜅𨵤𨿫𩆺𩳣𩸞𪸴𪹽𫐎𫯽𬐣𬥛𬮮𬺈",
 "周": "倜凋啁奝婤彫徟惆晭椆淍琱皗睭碉禂稠綢绸翢蜩裯調调賙赒輖週郮錭雕霌騆鯛鲷鵰㓮㚋㟘㨄䎻䓟䞴䧓䯾𠶰𡕄𡕐𡥱𡦝𡮚𢃖𢛇𢽧𣍼𥏨𥮐𥺝𦈺𦩍𧇟𧞴𧮻𧯼𧳜𨂊𨉜𨡑𩈮𩋙𩗪𩞺𩟨𪏎𪸼𫐏𫛲𫮀𬋬𬎹𬏳𬛅𬭕",
 "京": "倞凉剠勍婛就弶惊掠景晾椋涼猄琼稤綡翞諒谅輬辌鍄鯨鲸鶁麖黥㹁䁁䃄䝶䣼𠅮𠅽𠆃𠒨𠬇𠶛𡅹𡌿𡬱𡮎𡰗𡰜𡹞𡹡𢈴𢠃𣨣𣮘𤪁𤷦𦌦𧌬𧤀𨂙𨗈𨱉𩗬𩘁𪬧𪵔𫖎𫟅𫢁𫢂𫿀𬊣𬊧𬳮",
 "昔": "借剒厝唶庴徣惜措斮棤焟猎瘄皵矠碏稓耤腊蜡諎趞踖逪醋錯错鵲鹊齰㛭㝜㟙㪚㳻䄍䇎䜺䧿䱜𠒮𠝖𢃟𢒻𢧉𣈏𣊣𣊣𣋄𤦘𤿸𥺮𦁎𦝙𧃫𧛊𧹨𨛳𨯆𩊿𩤈𩭡𩼫𩽫𪏈𪣤𪴮𫀥𫎯𫗸𫜬𬟀𬣾",
 "隹": "倠准勧售唯奞婎寉崔帷惟截推摊暹椎淮滙滩焦焳燞猚琟痽睢瞿碓稚維维翟脽萑蜼誰讎讎谁趡踓進醀錐锥閵陮隻隼隽隿雀雂雃雄雅集雇雈雉雊雌雎雏雐雑雒雓雔雔雕雗雛雝雞雟雠雠雡離雥雥雥雦雦雦霍顀騅骓魋鵻㕍㢈㩦㫿㮅㲝䊒䍜䔨䧱䧲䧳䧴䧵䧶䧷䧸䧺䧻䧼䧽䧾䧿䨀䨁䨂䨃䨄䨆䨈䨉䱦䳡䶆𠃲𠙰𠥥𠥥𠦼𡁫𡂗𡓋𡙿𡚊𡚒𡣯𡹐𡿾𢌏𢛧𢜐𢟴𢦄𢩤𢽝𣀧𣋿𣗙𣙜𣚳𣛑𣜁𣡐𣡻𣨫𤂦𤊙𤒂𤕚𤙵𤫗𤳬𤽼𥀪𥜺𥣽𥩏𥯄𥷜𥷧𥸑𥽀𦃶𦉨𦋜𦑏𦟗𦣚𦤤𦩏𦶏𦻃𦻧𧂤𧃄𧃦𧄡𧆒𧐃𧑦𧒱𧔰𧚮𧡖𧤪𧥏𧥘𧫟𧮓𧳞𧽭𧾟𨇪𨌴𨖫𨗴𨘝𨘿𨣐𨫝𨬺𨮀𨲈𨾅𨾆𨾇𨾈𨾉𨾊𨾋𨾌𨾍𨾎𨾏𨾐𨾑𨾒𨾓𨾔𨾕𨾖𨾘𨾙𨾚𨾛𨾜𨾝𨾟𨾡𨾢𨾣𨾤𨾥𨾦𨾧𨾨𨾩𨾪𨾫𨾬𨾭𨾮𨾯𨾰𨾱𨾲𨾴𨾵𨾶𨾷𨾸𨾹𨾺𨾻𨾼𨾽𨾾𨾿𨿀𨿁𨿂𨿃𨿄𨿅𨿆𨿇𨿊𨿋𨿌𨿍𨿎𨿏𨿐𨿑𨿒𨿔𨿕𨿖𨿗𨿘𨿙𨿚𨿛𨿜𨿝𨿟𨿠𨿡𨿢𨿣𨿤𨿥𨿦𨿧𨿨𨿩𨿪𨿫𨿬𨿭𨿮𨿯𨿰𨿱𨿴𨿵𨿶𨿷𨿸𨿹𨿺𨿻𨿼𨿿𩀀𩀁𩀂𩀃𩀄𩀅𩀆𩀇𩀈𩀉𩀊𩀋𩀌𩀍𩀎𩀏𩀐𩀑𩀒𩀓𩀔𩀕𩀖𩀗𩀙𩀚𩀛𩀞𩀠𩀡𩀢𩀣𩀤𩀥𩀧𩀨𩀩𩀫𩀬𩀭𩀮𩀯𩀰𩀲𩀴𩀵𩀶𩀷𩀸𩀹𩀺𩀻𩀼𩀽𩀾𩀿𩁀𩁁𩁂𩁃𩁄𩁅𩁆𩁇𩁈𩁉𩁊𩁋𩁌𩁍𩁎𩁐𩁑𩁒𩁓𩁔𩁕𩁖𩁗𩁚𩁛𩁜𩁞𩁟𩁠𩁡𩁢𩁣𩁤𩁥𩁦𩁨𩁩𩁪𩁬𩁭𩁮𩁯𩁰𩁲𩁳𩉈𩋘𩏶𩏸𩕥𩜑𩞠𩥤𩦘𩺫𪂣𪄾𪆉𪋇𪍇𪏌𪕪𪘮𪟦𪭈𪱖𪴓𪹰𪻉𫁒𫄻𫔴𫕚𫕛𫕜𫙇𫞐𫞞𫟜𫠕𫡹𫤥𫩇𫮘𫲫𫷿𫻼𬄐𬆨𬚟𬞄𬡡𬯪𬯫𬯬𬯭𬯮𬯯𬯴𬯴𬯵𬯶𬱏",
 "昌": "倡唱娼晿椙淐焻猖琩菖裮誯錩锠閶阊鯧鲳㫀㫯䅛䗉䞎䮖𠭒𡩦𢃑𢔒𢛝𢛽𢮵𣉑𣊦𣊫𣊫𣋎𣎇𣣘𣮑𤬆𥓥𥚕𥜩𥫅𧶧𨍆𩎿𩩪𩩫𪂇𪉨𪛋𪣧𬕑𬗡𬸶",
 "疌": "倢啑婕寁崨徢捷疀睫箑緁脻萐蜨誱踕㫸䑖䝊𡹈𢈻𢏵𢜀𢳿𣄂𣓉𣮌𣶏𤙶𤟃𤲣𥊆𥓐𥵯𦑈𦑯𦦘𦩌𧚨𧫰𨄀𨎉𨓰𨕽𨤴𨺇𩃖𩗳𪖮𬍫",
 "放": "倣䢟𡌼𡝶𡥮𣮙𣷫𤊦𥓴𦜍𧌱𨅢𩕣𩜢𪬆𪯕𪯛𪯞𪻯𪾰𫅵𫈚𫿇𫿕𫿨",
 "直": "値𠶗𢕀𥊢𥊣𥛄𦋘真",
 "空": "倥啌崆悾控曌椌涳焢瞾硿箜腔谾躻鞚鵼㲁㴏㸜㾤䅝䆪𠓯𡲀𡹝𢈵𢽦𣈞𣫝𤀢𤗇𤟄𥩌𥩌𥩌𨨀𩣼𩭴𪍂𪔣𪥔𫁎𫁔𬔔𬜖",
 "卷": "倦勌啳圈婘惓捲棬淃睠箞綣绻腃菤蜷裷踡錈闂鬈㒽㟡䅚䊎䱧𡸩𢃩𢆤𢍕𢔑𣜨𤙻𤦔𤲨𤷄𥁸𥏙𦋓𧼚𨌫𨲏𨹵𩎸𩓫𩠉𪐂𫃔𫚠𫡌𬤃",
 "宗": "倧婃孮崇崈徖悰棕淙猔琮碂粽綜综腙萗誴賨賩踪錝騌鬃鯮䑸䝋𠵻𡽿𢃏𣦅𣮤𥚢𥪗𧹆𧹆𨛱𨲇𪎏𪞥𫐱𫓽𫮁𬦓𬴚",
 "居": "倨剧啹婮崌据椐涺琚腒艍蜛裾踞鋸锯鶋䅕䋧䛯䝻䱟䵕𠔴𡍄𡨢𣞴𣤅𣼨𤉸𥚑𦱅𧹕𨛮𨶽𩋜𩤅𪿩𫁦𫵦",
 "青": "倩凊啨圊婧寈崝情掅晴棈氰清猜皘睛碃箐精綪腈菁蜻請请輤郬錆锖靓靔靕靖靗靘静靚靛靜靝鯖鲭鶄鼱䑶䝼䞍䨝䨼𠝜𡃁𢃢𢉑𣮛𤂅𤦭𤲟𦑊𦑖𧚫𨓽𨿬𩇕𩇖𩇗𩇘𩇛𩇜𩇞𩇠𩇢𩇣𩇥𩓨𩗼𪂴𪬿𪬿𫏏𫕸𫕹𫕺𫕼𫘋𫸎𬘬𬮬𬰗𬰘𬺚",
 "兒": "倪唲婗掜晲棿淣猊睨腉萖蜺觬誽貎輗郳阋霓鬩鯢鲵鶂鶃麑齯㪒䋩䘽䦧䮘𠆔𠒯𠒰𠓔𠩫𡥲𡮅𡸢𡸣𢏱𣣉𤦤𤷅𤾆𤾇𥓋𦆘𦦃𦦿𦩊𧡎𨺙𪓬𪕨𫀗𫐐𫐰𫒪𫠜𫻻𬎸𬯤",
 "侖": "倫嗧圇婨崘崙惀掄棆淪癟睔碖稐綸耣腀菕蜦論踚輪錀陯鯩㖮㫻㷍䈁䎾䑳𠁄𠓹𠓻𠗣𡃋𡈺𡑘𢀧𢜒𣄇𣗾𣘈𣛌𤦎𤲕𤷔𤻋𤼇𥚗𥺽𥽐𦤢𦧣𧛈𧫶𧱜𧷺𧹪𩤇𪳔𪵅𪿏𪿽𫁛𫐮𫠳𫣝𫭕𫷓𬀿𬄍𬤳",
 "卓": "倬啅婥悼掉晫棹淖焯琸窧竨綽繛绰罩趠踔逴鋽鵫㦸㪕㷹㹿䂽䈇䑲䓬䮓𠃵𠣳𠦲𠦷𠧄𠧇𡍎𡚄𡯴𢒛𢔄𢛂𣂣𣦖𣪙𣫜𤙴𤚷𤲤𤷘𥇍𥏥𥢔𥴄𥵙𦅕𦋇𦋐𦋚𦜰𦠰𦹫𦺩𦻐𧌸𧟻𧨳𧳝𨉔𨌬𨺑𨿧𩘀𩙩𩭟𩷹𪂱𪍈𪟷𪟿𫀑𫆶𫛱𫵑𫸍",
 "委": "倭唩婑崣捼涹瓾痿矮緌腇萎蜲覣諉诿踒躷逶錗餧魏鯘㢻㣦㮃㹻䅗䆧䫋䬐䰀䴧𡣉𡣢𡤍𡯵𡹜𡿆𢛊𣨙𤉦𥏶𥓔𥟿𥠨𥡉𥡭𥪍𥴟𦓽𦿿𨡌𨵋𩗯𩡊𫉛𫌂𫎂𫗪𬭗",
 "果": "倮夥婐巢彙彚惈捰敤棵淉猓祼稞窠粿綶腂臝菓蜾裸裹課课踝躶輠錁锞顆颗餜騍骒髁㚌㞅㪙㷄㼫㾧䂺䙨䴹𠒪𠜴𠪧𠵩𠿜𡅁𡅓𡱼𡸖𢃦𢑥𢒙𢡑𢻔𣇫𣉰𣛕𣛕𣛤𣜢𣞅𣡈𣡗𣡗𣡗𣡙𣡚𣡰𣡰𣡰𣡾𣡾𣡾𣡾𣨪𣮔𤔖𤖇𤬁𥇬𥣷𥨘𦖍𦣔𧁣𧅾𨞶𨵚𨺁𩋗𩸄𩻧𪂠𪋊𪳨𪳿𫉂𫚝𬃻𬌡𬍯𬹮",
 "松": "倯凇崧淞硹菘蜙鬆㟣䘴𡨭𢃓𢃪𢔋𢛒𣕙𥯆𧌻𩃭𩸝𪁿𬸔",
 "夌": "倰凌婈崚庱掕棱淩狻皴睖碐祾稜綾绫菱裬踜輘錂陵鯪鲮㖫㥄㱥䈊䗀䬋䮚𠡭𠦻𡏜𡕮𡹃𢔁𣎞𤦫𤲪𦝄𦡟𧼔𨉞𨱋𩟒𪘵𪤶𪤽𪩮𪷥𫆢",
 "昆": "倱婫尡崐崑惃掍棍混焜猑琨窤箟緄绲菎蜫裩輥辊醌錕锟餛騉鯤鲲鵾鹍䃂䅙䊐䐊䚠䛰䵪𠝕𡥵𢃚𣈀𣙹𣬑𣮎𣽙𤑎𤨱𥇊𥚛𦓼𦠺𧱟𧳢𨬌𨿪𩭭𪂳𪋆𪌽𪡓𪢬𪹩𫘥𫤠𫯬𫴾𬦸𬧨𬪈𬹋",
 "東": "倲凍娻崠崬棟氭涷腖菄蝀諌錬陳鯟鶇㖦㨂㯥㯥㼯䦨䰤䵔𠁋𠒽𢆦𢔅𢛔𢟞𢽬𣌾𣍖𣍘𣍘𤒖𤒖𤕌𤗗𤟈𤡳𤡻𤦪𤩘𤲚𤴋𤴎𤷆𥓝𥔝𥠗𦑿𧓕𧖤𧖤𧡍𧯾𧳣𧹩𧼓𨌿𨗐𨣹𨣹𨿢𩣳𩭩𪂝𪳚𪳭𫉓𫞸徚𫨽𫳒𬌃𬨮𬯔",
 "事": "倳剚䭄𠄜𠡯𠡸𠶝𡸪𢜝𣓊𧨴𨧫𫻋𫻐𬭑",
 "奔": "倴喯捹渀莾逩錛锛餴𡍋𢜘𣮡𣽑𣾘𤢫𥚙𦜭𧎔𧶭𨁼𩣺𩧼𪑖𪰫𫗌𫦃𫬩𫯩𫷱𬨀",
 "武": "倵娬斌珷碔虣賦赋錻陚鵡鹉䝾䟼𢎔𢯞𣓸𣦏𤭎𧇭𧸾𧹁𪣥𪸵𫀐𫈓𫛁𫪗𬑘𬷜",
 "具": "倶𠺍𢮭𢰺𤦚",
 "奈": "倷捺萘錼㖠㮈㴎䱞𡞏𣮦𤷈𥇧𦝀𦤗𩈫𩜪𪥑𪨼𪻦𫆕𬷝",
 "采": "倸啋婇寀彩採棌睬綵菜踩釉㥒䌽䐆䣋䰂𡪘𡸯𣈄𣫋𣶶𤔁𤚀𤟖𤷕𥚖𧳥𨤐𨤔𨨫𨺉𩓰𫆇𫽱𬎱𬴹",
 "责": "债啧帻渍碛箦绩赜𪟝𫌀𫖴𬺉",
 "耶": "倻揶椰爺瑘鄊鎁㖿𠁌𥯘𦂫𦳃𦻚𦼅𦽶𩸾𪶘𪾉𫛉𫧵𬚞",
 "直": "值嗭徝惪植殖淔矗矗矗禃稙置㥀㨁䐈𠍜𡌴𡖻𡸜𢃜𢏶𣇣𣚅𣤳𤊧𤣡𥜩𥮖𦷔𧡚𨁷𨼡𪠋𪧡𫌁𫒦𫗾𫤁𫹦𬑚",
 "舍": "倽啥捨涻猞舒舖舘騇鵨䧾𠑰𠑰𠑰𡌫𡞆𢉃𣮞𤙱𤦜𦖘𦧶𦧸𦲧𧌖𧮿𧶟𨛭𨨝𩓱𪷮𫇕𫇙𫨮𬃉𬜋𬜍𬥹𬭘",
 "顷": "倾庼𪠌",
 "妾": "倿唼帹接椄淁翣菨踥霎鯜㢺䈉𡞘𢜡𣮍𤗈𥇒𥏡𥟣𥪵𦁉𦽚𧌃𧚪𧩕𧱙𧳛𨨧𪑗𫍭𫲨",
 "英": "偀媖愥暎朠楧渶煐瑛碤緓绬蝧鍈锳霙韺鶧㡕㢍㲟䁐䊔䚆䣐䦫䭊𡎘𡾗𤠉𤸡𥍼𥠚𦔃𦾇𧯀𨍞𩘑𩘕𩤯𩹅𪃳𫬡𫵄𬚡𬝱𬢑",
 "爯": "偁稱㛵𢜻𤌁𧽃𩔋𪫁𫕋𬃣",
 "前": "偂剪媊揃椾湔煎瑐箭糋翦葥鎆騚鬋㡐㮍㷙𠞽𠠩𠷁𡍽𢃬𢶨𣹅𦂒𦑦𦿶𧛯𧪈𩋳𩨊𪥗𫆨𬠝",
 "匽": "偃愝揠椻蝘褗躽郾隁鰋鶠鼴㰽䞁䤷𠸯𡹶𣈿𣯄𣹐𤦵𥈔𥍻𥔌𦖧𧓱𩀀𪦈𫚢𬥺𬸘",
 "耎": "偄媆愞渜煗瑌碝稬緛腝蝡輭陾餪㐡㓴㨎㬉㮕㼲㿵䓴䙇䞂𠷀𡁓𤐱𤟦𤮵𤲬𤸂𥈇𥯬𥻟𦓜𦖩𦾳𧓐𧞕𧭌𨨰𩀋𩱄𩹓𪃉𪋐𫗬𬘰𬥻",
 "重": "偅動喠媑尰揰歱湩濌煄畽瘇種箽緟腫董蝩衝褈諥踵鍾锺隀㡖㣫㮔㯵䱰䳯䵯𠄉𠏳𠝤𠞕𠪵𠽚𡈈𡍺𡣢𡥿𡦢𡮵𡮶𡰁𡺍𢝆𢡹𢥽𣱧𤋱𤏍𤚏𤭮𥍽𥏱𥔧𥠭𥢾𥻝𦉂𦑝𦔉𦩰𧳮𧳿𧼩𨉢𨔝𨤴𨤶𨤶𨤹𨤼𨵮𨿿𩅞𩴂𩾋𪏘𪐈𪧃𫍳𫒃𫒅𫘐𫟆𫟚𫯰𫯳𫼂𬁇𬎮𬔥𬪼𬪽𬪾𬰎𬱴",
 "春": "偆媋惷暙椿湷瑃睶箺萶蝽蠢賰踳鬊鰆㖺㿤䐏䞐䦮䮞䲠𠝩𢝣𢥤𢧔𢧨𢰦𢶩𢾎𢾜𣁤𣋕𣋨𣌠𣌠𣌠𣌠𣕮𣜚𧇶𧡲𨉩𨕌𩄄𩨁𩯥𪂹𪃣𫅽𬌸𬓉𬯌",
 "叚": "假嘏婽徦暇椵溊煆猳瑕瘕睱碬縀腵葭蝦豭貑赮遐鍜霞騢鰕麚㗇㰺䈔䠍䪗䫗𠪅𢝄𢝅𢱈𣮫𣮱𤗜𦇉𦌨𦖲𦣯𦽸𧎂𧛣𧪕𨉣𨺽𩋥𩐀𪕰𪖲𪠪𪽜𫇝𫚥",
 "曷": "偈喝嵑幆愒揭暍朅楬歇毼渴猲碣竭葛蝎褐謁谒輵遏鍻鞨餲馤騔鶡鹖齃㓭㔠㡫㬞㷎㹇㿣䅥䈓䋵䦪䨠䫘𠂄𠾩𡇼𢆜𢇋𢉥𢎔𣂰𣍊𣎅𣨵𣮷𤣨𤸎𥃞𥈎𥻉𦤦𦤪𦩥𧇷𧼨𨃃𨉪𨲲𩏌𩦏𩨀𩩲𩮂𩹄𪑦𪓮𪕭𪘹𫕈𫱊𬨍𬰵",
 "韋": "偉喡圍媁幃徫愇暐椲湋煒瑋禕稦緯葦衛褘諱違郼鍏闈韌韍韎韐韑韒韓韔韕韖韗韘韙韚韜韝韞韟韠韡韢韣韤韥颹㙔䘙䪏䪐䪑䪒䪓䪔䪕䪖䪗䪘䪙䪚䪛䪜䪝𠥎𡺨𢯷𢾁𢾝𣪡𤸆𥀊𥔬𥯤𥲾𦑻𦗇𦝛𦻪𦼽𦽞𧄧𧍫𨙈𨜢𩋾𩎒𩎓𩎔𩎕𩎖𩎗𩎘𩎙𩎚𩎛𩎜𩎝𩎞𩎟𩎠𩎡𩎢𩎣𩎤𩎥𩎦𩎧𩎨𩎩𩎪𩎫𩎬𩎭𩎮𩎯𩎰𩎱𩎲𩎳𩎵𩎶𩎷𩎸𩎹𩎺𩎻𩎼𩎽𩎾𩎿𩏁𩏂𩏃𩏄𩏅𩏆𩏇𩏈𩏊𩏋𩏌𩏎𩏏𩏐𩏑𩏓𩏔𩏕𩏖𩏗𩏘𩏙𩏚𩏛𩏝𩏞𩏟𩏠𩏡𩏢𩏣𩏤𩏥𩏦𩏧𩏨𩏩𩏪𩏫𩏬𩏭𩏮𩏯𩏱𩏲𩏳𩏴𩏵𩏶𩏷𩏸𩏺𩏻𩘚𩤮𪫀𪾃𪾳𫁨𫌱𫎞𫖌𫖍𫖎𫖏𫖐𬰪𬰫𬰬𬰭𬰮𬰯𬰰",
 "禹": "偊属楀渪瑀竬萭蝺踽鄅齲龋㙑㙖㝢䄔䨞𡟥𡠟𡥶𢉠𢯺𣈭𤘐𥈋𥝀𥯔𦅉𦔊𦞇𧑏𧜭𨅛𨕘𨺲𩀌𩔔𩘉𪑴𪹋𫒳𫭎𫹥𬆪𬍿",
 "屏": "偋幈摒竮箳㶜㶜𠝭𡟛𡳧𢔧𣖕𣸹𤋊𤧅𤭸𥧋𦂤𦉇𦝷𧩱𧼲𨂲𨍍𨔧𪑰𪨚𪨛𫵥𫵨𫶈𫺬𬖪",
 "若": "偌匿喏婼惹掿楉渃睰箬蠚諾诺蹃逽鄀鍩锘鰙䖃䖃䖃䤀𠥤𡈉𢉳𦂍𦴈𧍗𧍷𧛭𨵫𪴰𪻷𫇜𫭔𫲩",
 "是": "偍匙媞寔尟崼徥惿提湜煶瑅睼碮禔緹缇翨蝭褆諟趧踶遈醍鍉隄鞮韙韪題题騠鯷鳀鶗㓳㔭㖷㮛㼵䅠䈕䊓䐎䚣䜻䪘𠸭𠽭𡯻𡰖𡺔𢁈𢃰𢅦𢅨𢆝𢉴𢐂𢻖𣄍𣈡𣉄𣉆𣊒𣊰𣌎𤐔𤓐𤗘𤟥𥦽𦉁𦋨𦑡𦑧𦔂𦧧𦧪𦳚𦽢𧀖𧡨𧸯𨤱𩏿𩝊𪂿𪧺𪩃𪰯𪰾𪰿𫃆𫔂𫘨𫛸𫡝𬁔𬤊",
 "畏": "偎喂嵔愄揋椳渨煨猥碨腲葨鍡隈餵鰃鳂㙗㛱㞇㟪㱬㾯䋿𡀧𡣉𢉝𣉍𤧖𤲼𥚸𥯜𦈓𧍥𧛚𧪏𧱨𨃄𪉭𪙢𪫑𫗭𬙒",
 "扁": "偏匾媥徧惼揙斒楄煸牑猵甂碥稨篇糄編编翩艑萹蝙褊諞谝蹁遍鍽騗騙骗鯿鳊鶣㓲㞈㲢㴜㻞㼐㾫䐔䡢䭏𠪂𡺂𢉞𢐃𢩚𢩟𣝜𣩀𤬊𤺇𥚹𥣝𦑮𦽃𧡤𨖠𨲜𩴄𪉱𪏗𪓎𪖯𫕌𬩢𬸜𬸸",
 "彦": "偐喭楌遃顔颜齴𠦳𢞆𢢋𢱘𢵲𣸥𦞎𩩷𪦎𫜮𫫹𬊰𬛝",
 "風": "偑嵐楓檒渢煈猦瘋碸葻諷闏颩颪颫颬颭颮颯颰颱颲颳颵颶颷颸颹颺颻颼颽颾颿飀飁飂飃飄飅飆飇飈飊飋飌飍㜄䑺䫸䫹䫺䫻䫼䫽䫾䫿䬀䬁䬂䬃䬄䬅䬆䬇䬈䬉䬊䬋䬌䬍䬎䬏䬐䬑䬒䬓䬔䬕䬕䬖䬗䬘䬙䬚䬛䬜䬝䬞䬟𠷕𡑵𡺤𢞁𢱚𣄖𣈼𣜳𣽝𤧑𥢓𥣍𥷜𦂱𧁯𧍯𨐦𨮇𨺢𩄏𩖘𩖙𩖚𩖛𩖜𩖞𩖠𩖡𩖢𩖣𩖤𩖥𩖦𩖨𩖩𩖪𩖫𩖬𩖭𩖮𩖯𩖰𩖱𩖲𩖳𩖴𩖶𩖷𩖹𩖺𩖻𩖼𩖽𩖾𩖿𩗀𩗁𩗃𩗄𩗅𩗆𩗇𩗈𩗉𩗊𩗋𩗌𩗍𩗎𩗐𩗑𩗒𩗓𩗔𩗕𩗖𩗗𩗘𩗙𩗚𩗛𩗜𩗝𩗞𩗟𩗠𩗡𩗢𩗣𩗤𩗥𩗦𩗧𩗨𩗩𩗪𩗫𩗬𩗭𩗮𩗯𩗰𩗱𩗲𩗳𩗴𩗵𩗶𩗷𩗸𩗹𩗺𩗻𩗼𩗽𩗾𩗿𩘀𩘁𩘂𩘃𩘄𩘅𩘆𩘇𩘈𩘉𩘊𩘋𩘍𩘎𩘐𩘑𩘒𩘓𩘔𩘕𩘖𩘗𩘘𩘙𩘚𩘛𩘜𩘝𩘞𩘟𩘠𩘡𩘢𩘤𩘥𩘦𩘧𩘨𩘩𩘪𩘫𩘬𩘭𩘮𩘯𩘰𩘱𩘲𩘳𩘵𩘶𩘷𩘸𩘹𩘺𩘻𩘼𩘽𩘾𩘿𩙀𩙁𩙃𩙄𩙅𩙆𩙇𩙈𩙉𩙊𩙋𩙍𩙎𩙏𩙒𩙓𩙔𩙕𩙖𩙗𩙘𩙙𩙚𩙛𩙜𩙝𩙞𩙟𩙠𩙠𩙡𩙡𩙡𩙡𩙢𩙤𩹥𪋖𪕴𫖻𫗅𫗆𬕜𬬣𬱴𬷣",
 "屋": "偓剭喔媉幄握楃渥箼腛齷龌䌂䠎𡎔𡳽𣼉𤌆𥟽𥧊𦢡𦢢𧎜𧛐𨜘𨵱𩄌𩠭𪃮𪑱𪵓𫇂𫒷𫘴𫥫𫶉𬐖𬪱𬸟",
 "咢": "偔卾崿愕湂腭萼覨諤谔遌鄂鍔锷顎颚鰐鳄鶚鹗齶㓵㗁㟧㮙𠤁𡈆𡼰𥈭𥔲𥯳𧍞𨺨𩀇𪦊",
 "皆": "偕勓喈媘揩楷湝煯瑎稭蒈蝔諧谐鍇锴階鶛龤㾬䃈䡡𡺓𢔡𢝷𢾆𤭧𥍾𥏪𥚺𥟠𥻄𦂄𦝨𦞉𧚻𧳧𨜡𩀊𩋧𩘅𩘗𩤠𫎝𫦻",
 "省": "偗渻箵㗂㨘㮐㼳㾪䚇𠞔𡞞𡨽𢜫𣦉𦔄𦳗𧍖𨜜𨲓𨵥𪱐𪻻𪾱𫆦𫍂𫵆𫿛𬥇",
 "帝": "偙啻啼媂崹揥楴渧碲禘締缔腣蒂褅諦谛蹄遆鍗鶙㛳䫕䱱𠽜𡄶𡦔𢁆𢄫𢅛𢋠𢝃𤄇𤚢𤟾𤧛𤾤𥠒𥪟𥰆𦣭𧍝𧬺𨼨𩋣𩤢𪕬𪖰𪪶𪯐𪼀𬃨𬊱𬶤",
 "故": "做𡟁𢰴𫮆",
 "臿": "偛喢插揷敮歃牐鍤锸㛼㞚㢎㮑㴙䅤䙄䛽䮢𠑆𠝞𠽣𡍪𢔣𢩖𢻗𣖄𥀈𥈊𥓾𥪵𥯥𦂉𦑣𦑪𦝥𦦈𦦕𦦘𦦱𧶵𧼰𨂵𨇧𨔨𩃹𩔓𪘾𬐬𬤌",
 "亭": "停婷嵉揨楟渟碠葶蝏諪㷚䁎𠅹𠆙𠏦𠷥𡅄𡺣𢝜𢾊𢾛𣂳𣂴𣪢𤗞𤧟𤸥𥠣𥢿𥪜𥯢𦂃𦝞𧶺𧷭𨉬𨺱𩐴𩤙𩨆𩹇𪑬𪜦𪞨𪣹𪩧𬑯",
 "背": "偝揹禙褙鄁㔨䋳𤊷𦡟𨩈𩭿𪣵𫱉𬑜𬙷𬛉𬛏𬛛",
 "枼": "偞喋媟屟屧弽惵揲楪殜渫煠牃牒碟緤艓葉蝶褋諜谍蹀鍱鞢韘鰈鲽㻡䁋䈎䐑䑜䚢䢡䭎䮜𠗨𡳙𡺑𧽅𨤘𩐱𩔑𪃸𪍐𪑧𫄬𫌣𫖷𬃯𬙾",
 "皇": "偟凰喤媓崲徨惶揘楻湟煌瑝皝皩篁艎葟蝗諻遑鍠锽隍韹餭騜鰉鳇㾮䄓䅣䊗䑟䞹䬖䳨𡈁𡙙𢹻𣈷𣹛𤚝𤟡𤾭𤾲𤾳𤾺𥠟𦑠𨉤𨍧𨜔𩔇𪅔𪏓𪟫𪩅𪪱𪱦𪾂𫋯𫗮𫘩𫤟𫿃𬐋𬐍𬐑𬗬𬤍𬸛",
 "要": "偠喓嘦婹嫑崾楆腰葽覅闄騕㙘㫏㴗䁏䌁䙅䳩𠙞𡠍𡤆𢃽𢞅𢧦𢰳𣉋𤚘𤧄𤰊𥾀𧍔𧟰𧷋𨪁𩀄𪽳𪾈𫸻𬘱𬡺𬦽𬮲𬲘𬵜",
 "甚": "偡勘卙啿夦媅尠嵁愖戡揕斟椹歁湛煁瘎碪糂葚蘛諶谌踸鍖黮㪛㻣㽎䤁䨢䫖𠝻𢉮𢦊𢦊𢦊𢾤𣞵𤯑𥚮𥪘𥯓𦂼𦝧𦡾𦾢𧹱𨍜𩅾𪉯𫡶𫧈𫯑𬎲𬐾𬢏𬯋",
 "秋": "偢啾媝愀愁揪揫楸湫湬煍甃瞅篍萩蝵踿醔鍫鍬锹鞦鬏鰍鳅鶖鹙㡑㾭䋺䎿䐐䨂䵸𠩾𡟊𡥻𡺘𢃸𤋦𤧐𤧦𥔍𦂎𧇸𧎐𧡣𧤙𧷂𨍊𨡲𨺹𩝋𩹤𪃩𪍗𪝲𫆉𫐵𬘴𬳠",
 "音": "偣喑意愔戠揞摿暗歆湆瘖窨竟罯腤萻諳谙闇隌韴韵韶韷韸韹韺韻韼韽響頀鶕黯㛺䅧䜾䤃䪦䪧䪨䪩䪪䪫䪬䪭䪭䪮䪰䬓𠆒𠗥𠽨𠿌𡩘𡺈𡺞𢄈𢉩𢥺𢻕𢾑𢾚𣄕𣤗𣤣𤋾𤟟𤪅𤭵𥏮𥚱𥻚𦂺𦋫𦖢𦺼𧗹𧡱𧯹𨍑𨙣𨭢𩄒𩆢𩇄𩈴𩐗𩐘𩐙𩐚𩐛𩐜𩐝𩐞𩐟𩐠𩐡𩐢𩐣𩐤𩐥𩐦𩐧𩐨𩐩𩐪𩐫𩐬𩐭𩐮𩐰𩐱𩐲𩐳𩐴𩐵𩐶𩐷𩐸𩐹𩐺𩐻𩐼𩐽𩐾𩐿𩑀𩑁𩑂𩑃𩑄𩑅𩑆𩑇𩑉𩑊𩧑𩩿𩮋𩹎𪔧𪛏𪟠𪱐𪳀𪵦𪾲𫅬𫖗𫖘𫖙𫖚𫖛𫖜𫗊𫦊𫨏𫭏𬇂𬛯𬮴𬰹𬰺𬰻𬰼𬰽𬰾𬸝",
 "酋": "偤奠媨尊崷揂楢湭煪猶猷禉緧蝤蠤趥輶遒鞧鰌㥢㷕䠓䤋䲡𠄁𡞜𡯾𡲚𡺚𢉷𢍜𣜃𣣫𣮩𤋃𤸈𥂝𦖣𦝱𦩲𦳷𧳫𨗕𨜟𨡡𨡴𨢅𨢈𨣡𨩊𨺧𩔕𩮈𪃬𪍑𪓰𪓵𪡧𫜟𬘶𬨎",
 "建": "健徤揵旔楗毽湕煡睷腱踺鍵键鞬騝鰎㯬䊕䭈𠸻𡩌𡺅𢉆𤧣𥍹𥯦𦂩𦞘𦡐𨵭𨺩𩨃𩱃𩱤𩻥𪑼𪰷𫁀𫘳𫮑𫸕",
 "胥": "偦婿揟楈湑稰糈縃蝑諝谞醑㥠䈝䱬𡹲𤟠𤸀𥚩𦠷𧶳𨍐𨢺𩝔𩠋𪙀𬨏",
 "奓": "偧䃎䋾䐒䵙𧩫𨷎𩘖𩮅𬘲",
 "柴": "偨喍㾹䓱䠕𡍥𢉪𣖧𤠌𥈐𥓽𪑽𪘿𪪀",
 "負": "偩媍萯蝜𡥼𡯿𪃓𪍏𫻉𬌻",
 "畐": "偪冨副匐富幅愊揊楅湢煏疈疈福稫腷葍蝠褔諨踾輻辐逼鍢鰏鲾鶝㽬㽬䈏䋹䌿䕎䮠䵗𠠦𠥏𠸢𢑍𢑎𢾇𤃺𤓜𤔜𤗚𥔁𥣇𥻅𦑞𦑭𦔆𦩡𦽌𦽪𧹭𨵩𨸆𨺤𩋨𩘆𩧿𩭺𪕲𫂨𫢄𫤊𫤊𫬸𫯫𫱆𫴅𫴦𫴫𬳃",
 "待": "偫崻𢱜𤋵𤚟𤲵𦃀𦞒𧶱𨃉𪃝𫁧𫹦",
 "怱": "偬愡揔楤牎緫葱鍯騘㷓㹅䆫䈡䗓𠡻𡟟𥈝𬤋𬭥",
 "面": "偭勔喕圙奤媔愐湎糆緬缅腼蝒蠠靤靥靦靧靨麵麺㮌䤄䩂䩃䩄䩅䩆䩇䩈䩉䩊䩋䩌䩎䩏𠖪𠷰𠼟𡫍𢃮𢋏𢹙𣞀𣮻𣮿𣰔𤃨𤚛𤟯𥈅𥖊𥽯𦫥𦵀𧩤𧼸𨉥𨕂𨜧𨭫𨮮𩈃𩈅𩈆𩈇𩈉𩈊𩈋𩈌𩈍𩈎𩈏𩈐𩈑𩈒𩈓𩈔𩈕𩈗𩈘𩈙𩈚𩈛𩈜𩈝𩈞𩈟𩈠𩈡𩈢𩈣𩈤𩈦𩈧𩈨𩈩𩈪𩈫𩈬𩈭𩈮𩈯𩈰𩈱𩈲𩈲𩈳𩈳𩈴𩈶𩈷𩈸𩈹𩈺𩈻𩈼𩈽𩈾𩈿𩉀𩉁𩉂𩉃𩉄𩉅𩉆𩉆𩉇𩉈𩉉𩉊𩉋𩉌𩉍𩉎𩉏𩉐𩉒𩉓𩉔𩉕𩉖𩉖𩉖𩉗𩉘𩉙𩋠𩔁𩖋𩤤𩹠𪓱𫏔𫖀𫖁𫖂𫖃𫖄𫗖𫘏𫞑𬍵𬏶𬰠𬰡𬰢𬰣",
 "咠": "偮戢揖楫湒箿緝缉葺諿輯辑鍓㣬䁒䐕䩰𠶻𡎎𢜱𥠋𦗶𩰆𩰆𩹫𪔪𫃇",
 "哀": "偯鎄锿㗒𠗪𡃟𡟓𡪭𢜺𤁆𤠆𤸖𪶦𫈮𫨝𫬳𬕞",
 "契": "偰喫揳楔猰瘈碶禊稧窫葜褉鍥锲㓶㝣䚉䝟䦬䫔䱮𢝛𣸲𤋸𤧃𦝜𦩣𧩶𧼪𨂰𨜒𨜣𪃈𪰳𬢐",
 "盾": "偱循揗楯瞂瞃碷腯踲輴遁鍎鶞㡒䋸䙉䛻䞺𡎆𡐠𡟈𡬉𢝺𢧕𣸩𤟢𥍿𨺠𩀐𩏋𩩻𪻂𬊮𬍸",
 "思": "偲勰媤崽惫愢慮揌楒毸禗緦缌罳腮葸諰鍶锶顋颸飔騦鰓鳃㢜㥸㴓䚡䞏䰄𠅤𠖓𢛥𢞨𢞰𢠞𢣢𤄦𤟧𤸛𥎙𥯨𥵖𥻏𦋮𦖷𦖻𦩭𦻇𧍤𧗂𨜐𨡾𨺯𩟳𪃄𪕳𪮏𫀼𫍰𬜉",
 "耑": "偳剬喘圌媏惴揣椯歂湍煓猯瑞端篅腨褍諯貒踹輲遄鍴顓颛㙐㟨㪜㼷䝎䳪䵎𡽏𣖃𣮼𤟮𥔗𥚻𥠄𥻁𦓗𦓙𦓚𦓛𦓝𦓞𦓟𦓣𦦇𦵓𧍒𧔇𧶲𧼴𩠊𩤚𪏩𫍱𫳟𬥼𬩗",
 "則": "側厠崱廁惻測萴鍘鰂䈟䶡𠗧𠠋𠷌𡁪𡍫𡬂𡬙𡬷𡺢𢝔𢢥𢯩𣉇𣖡𥠉𧍡𩮆𫴯𬜊",
 "貞": "偵媜寊幀揁楨湞碵禎緽赬遉鍞䡠𠭹𠸩𡎞𢒟𢔤𣦓𤋺𤦹𤸘𥕫𥢅𥢆𦵄𧶃𧶸𨜓𨺟𩹰𪍕𪑳𪺘𫁅𫖙𫖣𫧸𫨫𫺤𬓲𬡥𬢵",
 "禺": "偶喁媀寓嵎庽愚歶湡禑耦腢萬遇鍝隅顒颙髃鰅齵㥥㬂㷒㻦㼴䚤䦸𠾧𡂮𡅑𡺥𡿅𢢄𢥶𣈦𣕃𣜔𣜢𣮨𤔝𤟹𤢚𤲳𤸒𥈬𥐂𥔘𥜿𥝂𥝃𥝉𥝉𥧆𥧼𥻑𦂕𦦔𦦷𦦻𦽳𧍪𧪓𨜖𨲖𩀍𩤛𩮐𪃍𪉐𪿹𫀽𫉨𫊅𫜉𬩔𬴣",
 "俞": "偷匬喻媮崳嵛愈愉揄榆歈毹毺渝牏瑜瘉睮窬緰腧萮蝓褕覦觎諭谕貐踰輸输逾鄃鍮隃騟㺄㼶䃋䄖䜽䠼䤅䩱䬔䵉𠐙𠕦𡩗𣂮𣈥𣈯𦈕𦖭𧼯𨱎𨵦𨽙𩨈𪃎𪉰𪍍𪎨𪟺𪱎𪹊𫥓𬰅",
 "兪": "偸喩婾楡瑜諭𧼯輸𪃎",
 "昝": "偺喒揝糌",
 "娄": "偻喽屡屦嵝搂数楼溇瘘缕蒌蝼褛镂髅㥪䁖𡞱𢖕𢖖𤠋𨍦𨩐𩨇𪢈𪣻𪧘𪩇𫃵𫍴𫎌𫏻𫐷𫙂𫦉𫲜𫷹𬌥𬖠𬞰𬞺𬸞",
 "為": "偽媯溈蒍䈧𤔡𤺉𦖯𪩼𫞟㬙𤾡䧦𬊓",
 "贲": "偾喷愤豮𣸣𪔭𪩸𪱥𫅗𫔁𬅫𬏷𬓱𬳟",
 "尝": "偿鲿",
 "鬼": "傀媿嵬廆愧槐溾瑰瘣磈蒐螝褢謉醜隗餽騩鬽鬾鬿魀魁魂魃魄魅魆魈魊魋魌魍魎魏魐魑魒魓魔魕魖魗魘魙㟴㱱䁛䈭䌆䫥䰟䰠䰡䰢䰣䰤䰥䰦䰧䰨䰩䰪䰫䰬䰭䰮䰯䰰䰱䴜𠑖𡾛𡾵𡾾𡿆𢄊𢣒𣝂𣝹𤛂𤜋𤫅𥗶𥣼𦞙𦞱𦢮𧪵𧫏𧮊𧮓𧷛𨉵𨍹𨝀𨪈𩌃𩏐𩙢𩥢𩱹𩱺𩱻𩱼𩱽𩱾𩲀𩲁𩲂𩲃𩲄𩲅𩲇𩲈𩲊𩲋𩲌𩲍𩲎𩲏𩲐𩲑𩲒𩲓𩲔𩲖𩲘𩲙𩲛𩲜𩲝𩲞𩲟𩲠𩲢𩲣𩲤𩲥𩲦𩲧𩲨𩲪𩲫𩲬𩲭𩲮𩲯𩲰𩲱𩲲𩲳𩲴𩲵𩲶𩲷𩲸𩲹𩲺𩲻𩲼𩲽𩲾𩲿𩳀𩳁𩳂𩳃𩳄𩳅𩳆𩳇𩳈𩳉𩳊𩳋𩳌𩳍𩳎𩳏𩳐𩳑𩳒𩳓𩳔𩳖𩳗𩳘𩳙𩳚𩳛𩳜𩳝𩳞𩳠𩳣𩳧𩳨𩳫𩳬𩳳𩳴𩳻𩴂𩴄𩴎𩴚𩴥𩴬𩴰𩴳𩴴𩴵𩴶𩴷𩴸𩴹𩴺𩴻𩴼𩴽𩴾𩴿𩴿𩵀𩵃𩵄𩵅𩵆𩵇𩵈𩵉𩵊𩹷𪄔𪩜𪻆𫁖𫍷𫙈𫙉𫙊𫙋𫙌𫙍𫙎𬨐𬴽𬴿𬵲",
 "叟": "傁嗖嫂廋搜溲獀瘦瞍膄艘蓃螋謏遚鄋醙鎪锼颼飕餿騪㟬㥰㪢㮴㲣㵻䏂䱸𠪇𠭦𣯜𤔣𥕋𥰞𦃈𦣉𧳶𧽏𩌅𩨄𩨅𫌆𫍲",
 "虒": "傂嗁搋榹歋磃禠篪螔褫謕蹏遞鷈鷉鼶㔸㡗㥴㴲㾷䖙䚦䞾䫢䶵𡏚𢊀𢐋𨪉𨻆𩀗𩤽𪕻",
 "素": "傃嗉嫊愫榡溸縤繛膆螦㨞䋤䘘䛾𢍣𢍵𤀝𤠚𤢘𥱨𦃅𦅫𦅻𦆾𦇚𩔥𪯑𪯛𪰸𪾵𬗪𬗾𬝚𬫵𬵡",
 "眘": "傄𪒂",
 "尃": "傅博圑愽搏榑溥煿牔猼磗禣糐縛缚膊蒪賻赙鎛镈餺髆㗘㙛㬍䎔䗚䙏䪙䰊䶈𢾭𣄎𤚽𤧵𤸵𥠵𥴾𦉊𦑵𦔍𦦐𧱹𧳵𨍭𩌏𩫯𩹲𪍡𪙍𪠑𪩉𫘒𫼁𬧅𬺏",
 "原": "傆厵厵厵嫄愿榞源獂縓蒝螈謜豲願騵㟲㟶㥳㷧㹉䝠䴨𠪥𠺿𡕊𡤍𧏐𧔞𨆸𨝂𨪛𨻣𩖒𪄁𪮢𪼆𫖸𫘪𬇒𬈛",
 "茸": "傇媶搑榵穁縙㲨䠜䤊䩸𣯏𥎂𦔋𧎣𨉴𨍷",
 "栗": "傈凓慄搮溧瑮篥鷅麜㗚䔁𣗖𣙬𣝭𤠫𥠲𦃊𦞰𦽼𧢀𨃙𨍫𨜼𨫊𩘟𩺤𫛽",
 "辱": "傉嗕媷搙槈溽縟缛耨蓐褥鄏鎒㦺𠢑𡫦𡭋𢟲𢾯𣯋𧏯𧗈𧢁𨃽𩱨𪑾𫯕𬌽𬢾𬭦𬷨",
 "員": "傊勛圓愪損殞溳熉磒篔縜蒷鄖隕霣韻鶰㜏䁚䆬䐣䚋䠝䫟𠅳𠢋𠹚𠺯𡁩𡃋𡻖𢄙𢥿𢿃𣗼𣞥𣺪𤠔𤸫𥛍𥪩𥪾𥻱𦑰𦔐𦫮𧆍𧜘𧪼𧳷𧶊𧶏𧶒𧷝𧷞𧷯𧸫𧽛𨶎𩫣𪏚𪡯𪢛𪫃𪬳𪯾𫬊𫬡𫳧𫽭𫾖𬍽𬖊𬥙𬥩",
 "冓": "傋媾搆斠構溝煹篝耩褠覯觏講購遘鞲韝顜㗕㝤㡚䃓䐟𠞣𠢉𠨊𡏞𡻉𢔵𢞡𢲱𤠰𥉇𥠾𥧒𥻰𦩷𦵷𧽝𨤚𨪋𩄢𪃺𪺱𫖕",
 "馬": "傌嗎媽榪溤獁瑪碼禡篤罵螞褭遤鎷闖隲颿馭馮馯馰馱馲馳馴馵馶馷馸馹馺馻馼馽馾馿駀駁駂駃駄駅駆駇駈駉駊駋駌駍駎駏駐駑駒駓駔駕駖駗駘駙駚駛駜駝駞駟駠駡駢駣駤駥駧駨駩駪駫駬駭駮駯駰駱駲駳駴駵駶駷駹駺駻駼駽駾駿騀騁騂騃騄騅騆騇騉騊騋騌騍騎騏騐騑騒験騔騕騖騗騘騙騚騛騜騝騞騟騠騡騢騣騤騥騦騧騨騩騪騫騬騭騮騯騱騲騳騳騴騵騶騷騸騹騺騻騼騽騾騿驀驁驂驃驄驅驆驇驈驉驊驋驌驍驎驏驐驑驒驓驔驕驗驘驙驚驛驜驝驞驟驠驡驢驣驤驥驦驧驨驩驪驫驫驫鰢鷌㾺䔍䣕䣖䧞䩻䬚䭴䭵䭶䭷䭸䭹䭺䭻䭼䭽䭾䭿䮀䮁䮂䮃䮄䮅䮆䮇䮈䮊䮋䮌䮍䮎䮏䮐䮑䮒䮓䮔䮕䮖䮗䮘䮙䮚䮛䮜䮝䮞䮟䮠䮡䮢䮣䮤䮥䮦䮧䮨䮩䮪䮫䮬䮭䮮䮯䮰䮱䮲䮳䮴䮵䮶䮷䮹䮺䮻䮼䮽䮾䮿䯀䯁𠓄𠖖𠧀𠺎𡂣𡂼𡈊𡏢𢉿𢟀𢢷𢨗𢲫𢶮𢷭𣜋𤅲𤚴𤡹𤼔𥉊𥗗𥡗𥧓𦄀𦋻𦌯𦟐𦟖𦿰𧁦𧜗𧪨𧮕𧽙𧾖𨉸𨎇𨙔𨙦𨞲𨷜𨽥𩇍𩎐𩑉𩡨𩡩𩡪𩡫𩡬𩡭𩡮𩡯𩡰𩡱𩡳𩡴𩡵𩡶𩡷𩡸𩡹𩡺𩡻𩡼𩡽𩡾𩡿𩢀𩢁𩢂𩢃𩢄𩢅𩢆𩢇𩢈𩢉𩢊𩢋𩢌𩢍𩢎𩢐𩢑𩢒𩢓𩢔𩢕𩢖𩢗𩢘𩢙𩢚𩢛𩢜𩢝𩢞𩢟𩢠𩢡𩢢𩢣𩢤𩢥𩢦𩢧𩢨𩢩𩢪𩢫𩢬𩢭𩢮𩢯𩢰𩢱𩢲𩢳𩢴𩢵𩢷𩢸𩢹𩢻𩢼𩢾𩢿𩣀𩣁𩣂𩣃𩣄𩣅𩣆𩣇𩣈𩣉𩣊𩣋𩣍𩣎𩣏𩣑𩣒𩣓𩣔𩣕𩣖𩣗𩣘𩣙𩣚𩣛𩣜𩣝𩣞𩣟𩣠𩣡𩣢𩣣𩣤𩣥𩣦𩣧𩣨𩣩𩣪𩣫𩣬𩣭𩣮𩣯𩣰𩣲𩣳𩣴𩣵𩣶𩣷𩣸𩣹𩣺𩣻𩣼𩣽𩣾𩣿𩤀𩤁𩤂𩤃𩤄𩤅𩤆𩤇𩤈𩤊𩤋𩤌𩤍𩤎𩤏𩤐𩤑𩤒𩤓𩤔𩤕𩤖𩤗𩤙𩤚𩤛𩤜𩤝𩤟𩤠𩤡𩤢𩤣𩤤𩤥𩤦𩤧𩤨𩤩𩤫𩤬𩤭𩤮𩤯𩤰𩤱𩤲𩤳𩤴𩤵𩤶𩤸𩤹𩤺𩤻𩤼𩤽𩤾𩤿𩥀𩥁𩥂𩥃𩥄𩥅𩥆𩥇𩥈𩥉𩥊𩥋𩥋𩥌𩥍𩥎𩥏𩥐𩥒𩥓𩥔𩥕𩥖𩥗𩥘𩥚𩥜𩥝𩥞𩥟𩥠𩥢𩥣𩥤𩥥𩥦𩥧𩥨𩥩𩥪𩥫𩥬𩥭𩥮𩥰𩥲𩥳𩥴𩥵𩥶𩥷𩥸𩥹𩥺𩥻𩥼𩥽𩥾𩥿𩦀𩦁𩦂𩦃𩦄𩦅𩦆𩦇𩦈𩦉𩦊𩦋𩦌𩦍𩦎𩦏𩦐𩦑𩦒𩦓𩦔𩦖𩦗𩦘𩦙𩦛𩦜𩦝𩦟𩦠𩦡𩦢𩦣𩦤𩦥𩦦𩦧𩦨𩦩𩦪𩦫𩦬𩦭𩦮𩦰𩦱𩦲𩦳𩦴𩦷𩦸𩦺𩦻𩦼𩦽𩧀𩧁𩧂𩧃𩧄𩧅𩧇𩧈𩧊𩧋𩧌𩧌𩧍𩧎𩧏𩧐𩧑𩧒𩧓𩧔𩧕𩧖𩧗𩧘𩧙𩧚𩧛𩧜𩧝𩧞𩧟𩧡𩧢𩧢𩧢𩧣𩧤𩧥𪧫𫘅𫘆𫘇𫘈𫘉𫘊𫘋𫘌𫘍𫘎𫘏𫘐𫘑𫘒𫘓𫘔𫘕𫘖𫘗𫘘𫘙𫘚駾𫨑𫹞𬧜𬳨𬳩𬳪𬳫𬳬𬳭𬳮𬳯𬳰𬳱𬳲",
 "旁": "傍嗙嫎嵭徬搒榜滂牓磅篣縍耪膀艕蒡螃覫謗谤鎊镑騯髈鰟鳑㥬㿶䄘䅭䒍䠙䧛䨦䩷𠗵𢄎𢐊𣂆𣄥𣄬𣯊𣯟𤚰𤧭𤹔𥉣𥻭𦗍𨍩𨏰𨜷𨢐𩡕𪟸𪪇𪹚𫄰𫐼𫜡𬌿𬒩𬳣𬴅",
 "真": "傎厧嗔嫃寘嵮慎搷槙滇瑱瘨瞋磌禛稹縝缜蒖衠謓蹎鎮镇闐阗顛颠鬒鷏黰齻㐤㒹㒹㣀㥲䈯䐜䡩𠁒𠔬𠔶𠖕𠤤𡂌𡈓𣉮𣞟𣰘𤛇𤠶𥛺𦗀𦗁𧜖𧰊𧷒𧽍𨈃𩄠𩥄𩨋𩺘𪗓𪵆𫷊𬜘𬹙",
 "唐": "傏嵣搪榶溏煻瑭瞊磄禟篖糖膅蓎螗赯鄌醣鎕餹鶶㜍㲥㼺䅯䌅䧜𠗶𠹔𡃯𢧪𤚫𤠯𤮂𦪀𧱵𨃠𨍴𨶈𩀛𩘜𩥁𩹶𪕹𪰼𫷎𬳍",
 "高": "傐嗃嵩嵪搞敲暠槀槁歊毃滈熇皜碻禞稾稿篙縞缟翯蒿謞鄗鎬镐髇髚髛髜髝髞鰝鶮㙜㙵㪣㸀㾸䐧䧚䬘䮦䯨䯩䯪䯫𠞟𡒋𡠀𡦩𢑸𢞟𢨠𢲤𣉞𣩅𣯖𤌾𤚸𤠖𤧼𥏹𥖰𥶧𥸏𦒭𦓄𦿣𧎸𧕔𧜉𨃤𨉲𨢓𩌡𩍯𩎏𩙮𩙷𩥊𩪿𩫀𩫁𩫂𩫄𩫅𩫆𩫇𩫈𩫉𩫊𩫋𩫌𩫍𩫎𩫏𩫐𩫑𩫓𩫕𩫗𩫘𩫙𩫚𩫛𩫜𩫝𩫞𩫟𩫡𩫢𩫣𩫤𩫥𩫦𩫪𩫬𩫮𩫲𩮘𪨓𪯪𫘵𫘶𫘷𫾣𬎯𬏐𬑣𬖰𬴕𬴙𬴚𬴝𬴞𬴟",
 "桀": "傑嵥搩椉榤滐磔謋㻧䮪𠓲𠹳𡏝𡩣𢞼𣔕𣩊𣽘𥠹𦵴𧎩𨃥𩦆𩫤𫙮",
 "奚": "傒嗘嵠徯慀榽溪磎縘膎蒵螇謑谿豀豯貕蹊雞鞵騱鷄鼷㜎㨙㰿㶉䙎䫣䳶𡏛𡰄𡿙𤐓𤠓𤲺𤳃𤳤𥉐𥪦𥰥𥻺𦩶𦫑𦫬𧯗𪓷𪥣𫘬𫰄",
 "扇": "傓搧煽謆騸骟䡪䥇䦂𠞛𢄒𥔱𥰢𦑗𦶋𧎥𪤆𫍸𬎁𬚇",
 "兼": "傔凲嗛嫌尲嵰廉慊搛槏歉溓熑甉磏稴縑缣膁蒹螊謙谦豏賺赚鎌隒馦鬑魐鰜鳒鶼鹣鹻鼸㝺㡘㪠㺌㻩㼓㽐㾾䁠䈴䫡䭑䯡𠁟𠔨𠔮𠔳𠔺𠗳𠪊𡏊𡗄𡡫𢌍𢌍𢐎𢧥𣽳𤑃𤬓𥻧𦋰𦖾𦩵𧈁𧰋𨃰𨐩𨢑𨮄𩄡𪐋𪕼𪖳𪙊𪞍𫇗𫗱𫘕𫡁𫡂𫥣",
 "隺": "傕搉榷確篧蒮髉鶴鹤㴶㹊㿥䥃䮤𠻓𢞕𣉒𣤇𤌍𥉑𦑱𦞦𦿠𨢜𫛏𬎂𬛎𬥩𬯱𬯲𬯳",
 "倉": "傖凔創嗆嵢愴戧搶槍滄熗牄獊瑲瘡篬艙蒼螥謒賶蹌鎗鶬䅮䢢䤌䱽𠏓𠏧𠑐𠑐𠑜𠞴𠟐𠥐𡒝𣯙𤚬𤾙𥎄𥏲𥻲𦃹𦞛𦢁𧽜𨜾𨮤𨶆𩀞𩮩𩼺𪙎𪤇𪦔𪰻𫀞𬔎𬚤𬡧",
 "畜": "傗慉搐槒滀稸蓄鄐㗜㜅䙒𤛅𤠕𦿤𧁃𧏷𧹴𨃕𨕢𩹱",
 "效": "傚滧𠙟",
 "容": "傛嫆嵱彮愹搈榕溶熔瑢穃蓉褣鎔镕鰫㮤㯴㼸䈶䡥𠹍𣘏𣤄𣫾𣯔𤪜𦗋𦞳𧯉𨉷𨤛𨲟𩔜𩘨𩘪𩮠𪃾𪠮𪬛𪿮𫃻𫍇𫚦𫯈𫶎𬁎𬠣",
 "䍃": "傜嗂媱徭愮摇暚榣滛熎猺瑶磘繇謡谣遥鎐颻飖鰩鳐鷂鹞䁘䌊䔄䠛䬙𣞿𣟾𤁠𨘺𨘽𫄾𬯒",
 "𦐇": "傝搨榻毾溻禢褟蹋遢鎉闒阘鰨鳎㲩䈳䌈䑽䪚𢞠𤌙𤚺𤠐𤭼𤹀𦈖𦑼𦶑𧰂𪄚𫁩𬤕𬳉",
 "差": "傞嗟嫅嵯嵳搓暛槎溠瑳瘥磋縒艖蒫褨蹉醝鎈髊鹺齹㞉㷢㽨㿷䁟䐤䑘䟀䡨䰈䱹䴾𣍏𣩈𦑺𦒁𧪘𧪰𨉶𨢚𨲠𪉵𪙉𪚍𫶯𫶰𫶴𫸕𫹜𫺳𬘷𬧹𬩭𬯷𬶣𬺎",
 "翁": "傟嗡嵡慃暡滃瞈蓊螉鎓㨣㮬㺋䈵䐥䩺䱵𡻐𤌏𥕀𦒥𦫫𧛹𨜺𩄘𩔚𩡓𩮬𪴱𫕎𬓵𬭩",
 "討": "傠罸𧏛𬋷",
 "竝": "傡暜𣺄𤀆𤅏𥪰𥫋𫁪𬧈",
 "家": "傢嫁幏榢稼鎵镓𠺢𡑫𢔻𢜿𣺊𤂼𤒝𤨎𩔧𪿭𫋕𬷬",
 "泰": "傣溙㥭𠙲𣗘𦒰𩌉𪼃𫂐𫱸𫵧𬛍𬛴𬫳",
 "载": "傤𬘹",
 "党": "傥谠鎲镋𣗋𣺼𧫆𪤅𫽮𬊵",
 "骨": "傦嗗尳愲搰榾滑猾磆縎蓇螖顝餶骩骪骫骬骭骮骯骰骱骲骳骴骵骶骷骸骹骺骻骼骽骾骿髀髁髂髃髄髅髆髇髈髉髊髋髌髍髎髏髐髑髒髓體髕髖髗鶻鹘㾶䮩䯆䯇䯈䯉䯊䯋䯌䯍䯎䯏䯐䯑䯒䯓䯔䯕䯖䯗䯘䯙䯚䯛䯜䯞䯟䯠䯡䯢䯣䯤䯦䱻䶤𠬒𡁌𡰅𡻋𣄘𣝗𣨺𤚱𤼑𥉄𥛔𥠳𦈔𦞽𧜓𨍾𨪷𩨓𩨔𩨘𩨙𩨚𩨥𩨨𩨩𩨪𩨫𩨹𩨻𩨼𩩁𩩄𩩅𩩇𩩈𩩐𩩑𩩒𩩔𩩖𩩞𩩣𩩤𩩥𩩧𩩨𩩩𩩪𩩫𩩬𩩲𩩷𩩺𩩻𩩼𩩿𩪀𩪃𩪇𩪊𩪌𩪖𩪝𩪞𩪟𩪪𩪬𩪰𩪱𩪴𩪵𩪷𩪺𩪽𪄥𫘲𫘳𫘴𬗁𬛟𬟟𬴑𬴒𬴓",
 "宾": "傧嫔摈槟殡滨瑸缤膑镔髌鬓㺍𧏖𪬚𪾸𫅭𬇄𬝯",
 "诸": "储𫉄𫞛",
 "难": "傩瘫𪹠𫱞𫺷𬊾𬝴𬥬",
 "參": "傪剼嘇嵾幓慘摻槮毿滲瘮磣穇篸糝縿蔘襂謲贂遪醦鏒驂鬖鰺黲㓄㜗㠁㺑㽩䟃䫩𠔭𠗿𠬙𢕕𢹨𢿈𣪶𣯶𤍜𤗲𤨵𥊀𥶠𦌀𧑁𧗋𨝐𩈼𩌰𩫦𪅩𬛓𬯘",
 "累": "傫嫘摞樏漯瘰磥縲缧蔂螺鏍騾骡㹎䉂䐯𡏱𡻭𡻱𤡂𤮉𤳻𥉹𥛧𥡜𦽝𧫖𧷳𧹶𧽲𨄱𨻽𩇍𩌹𩌺𩏞𩕃𩮹𪍯𪱀𫤡",
 "崔": "催凗嗺巂慛摧槯漼熣獕璀皠磪繀膗鏙㜠䜅䳽𡰋𡻎𡾧𢊛𢕘𣩑𣯧𣯯𤗯𤛍𤮯𥼂𦉎𦸏𧢠𧮋𧽠𨄍𨭽𨻵𩌩𩏘𩮴𩯷𪛂𪧾",
 "庸": "傭嘃嫞慵槦滽牅牗鄘鏞镛鱅鳙鷛㟾㣑㺎䗤䧡𢧳𣁠𤛑𤨭𤮇𤰋𤰎𥡲𥧱𦄢𦟛𧱿𧴄𩀬𩌨𩥻𩫱𪅟𪒒𪮧𪹨𫃍𫉘𬹁",
 "曹": "傮嘈嶆慒槽漕糟艚蓸螬褿蹧遭醩鏪鰽㜖㡟㷮䄚䏆䐬䜊𡐋𡮦𢲵𣉿𣍖𣩒𤗰𤡐𥀛𥕢𥲍𦄧𦋿𦿩𧕐𨎝𩆦𩘳𩠎𪙡𪯓𫚧𬘿𬟠",
 "悤": "傯幒憁摠樬漗熜牕璁窻總蔥蟌謥鏓驄骢䡯𡠴𡾳𦪐𧁗𧃿𧄉𩕄𪺠𬓔𬯗",
 "崩": "傰剻嘣漰磞繃蹦鏰镚䙖䣙𡡈𢐒𨻱𪮤𫅛",
 "從": "傱嵷嵸慫摐暰樅漎熧瑽瘲瞛磫篵縱聳蓯豵蹤鏦㗰㙡㜡㞞㢔㹐㼻䐫䗥䙕䡮䢨䰌䳷𢐔𢕩𢖗𢠰𣯨𤡆𥡬𦌇𦗜𧐱𧽵𨲧𩀨𩀰𪅜𪖁𬥯",
 "敖": "傲厫嗷嗸嫯嶅廒慠摮滶熬獒獓璈磝聱蔜螯謷謸贅赘遨鏊隞驁骜鰲鳌鷔鼇㜜㟼㠂㥿㾲䦋䫨䮯䵅𠞪𠢕𡏼𢕟𢧴𢳆𣊁𣘢𤘒𥂢𥨆𦪈𧑃𨄨𨅚𨎞𨫼𩕀𩘮𩮯𩱏𪉑𪍮𪙠𪧜𪵧𫆰𫍵𫗺𫘀𬑞",
 "專": "傳剸團嫥慱摶暷槫漙瑼甎磚竱篿縳膞蓴轉鄟鏄鱄鷒䁣䊜䧠𡦕𡭇𡭍𡭐𢞯𣩘𤍿𤮍𤹵𥛥𥡵𥶸𦄯𧐕𧽢𨄔𨖇𩅂𩘯𪅘𪩍𪫖𫧤",
 "區": "傴剾嘔奩嫗嶇彄慪摳敺樞歐毆漚熰甌瞘膒蓲謳貙軀醧鏂饇驅鰸鷗䆰䉱䌔䙔䡱䧢䩽䳼𠄾𠢔𠥷𠥹𠥺𠥺𡩾𡬿𢄠𢕓𢷯𢿛𣂻𣉾𣎥𣞃𣩛𤛐𤠾𤹪𥕥𥱸𨄅𩀫𩔸𪠯𪴋𫑧𫧜𬇅",
 "責": "債勣嘖嫧幘樍歵漬皟瞔磧積簀績耫蔶襀謮賾蹟鰿㣱㥽㱴㺓䚍䟄䥊䶦𣤈𤖓𤗮𤳎𤹠𥎍𥡯𥼃𦟜𦣱𧀘𧐐𧶷𧷤𨖊𨢦𨲪𩄾𩌪𩔳𪄸𪒑𫗙𫘁",
 "戚": "傶嘁慼慽摵槭磩縬蹙鏚顣㗤㞝䗩䙘䠞𠗼𡄱𡠽𡻕𡻷𢖌𤠽𤨟𥀻𥉷𥼀𦄉𦈚𦟠𦪊𦸗𧐶𧞰𧫳𨇌𩖑𩥼𪔯𫖹𬭭𬴈",
 "爽": "傸慡摤樉漺磢鏯騻鷞㼽䗮䫪𠓷𠗾𠞮𠼙𡻯𢣨𤀿𥡠𥱶𦄍𧫗𧴅𨄷𪼐𫎿𫕐𫘭𬑨𬘾",
 "竟": "傹摬樈滰獍璄竸竸糡鏡镜䔔䭗𣩜𥸜𧫙𪅑𫕼𫧶𫲭𫶪𬠧𬧎",
 "祭": "傺察憏摖暩漈瘵磜穄縩蔡際鰶㗫㡜㻮䄞䏅𠐐𡻰𣘤𥉻𧫕𨄊𨝋𨝠𨢵𨶫𪹥𬖴𬶭",
 "章": "傽嫜嶂幛彰慞暲樟漳獐璋瘴瞕竷蔁蟑贑贛赣遧鄣鏱障騿鱆麞㢓䤗𠮒𠼀𡈠𢕔𢥔𢥺𢥿𣫡𤨼𥎟𥕞𥪮𥫊𥫑𥫒𥫓𥫔𥫕𥫖𧗛𧫱𧹄𧹉𧽣𨙏𨶤𩅈𩌬𩕆𪅂𪋟𪞬𪭂𫁯𫋬𫎬𫜂𫠒𫤴𫻙𬎗𬔧",
 "頃": "傾廎蹞䔛𣻯𣻳𨢣𨻺𪩌",
 "焉": "傿嘕嫣漹篶蔫鄢㥼㯊䗡𢳃𣩙𤎄𧽞𨻳",
 "帶": "僀嵽廗慸摕殢滯艜蔕螮蹛遰㗣㦅㯂㿃䐭䠠𠓶𠥖𡠹𡻺𢄔𢄩𢋴𢤅𤠹𤨮𤬎𤴟𥕧𥛣𥲭𦄂𧜵𧫚𨗼𩌴𪎐𪾹𫒿",
 "悉": "僁窸蟋鏭㗭㣰㴽䊝𠞹𡡁𢴑𤎕𦄵𦸝𨄠𨎒𬋚𬛐",
 "婁": "僂嘍寠屢屨嶁廔慺摟數樓氀漊熡甊瘻瞜窶簍縷耬膢艛蔞螻褸謱貗軁遱鏤鞻髏鷜㜢㟺㡞㪹㺏㻲䄛䅹䝏䣚䫫䮫䱾𠞭𡗆𡢺𡰌𡰓𣤋𣯫𤗬𤛠𤬏𥕍𦌁𦌑𧁾𧢃𧰃𧲕𧷡𨘠𨻻𩀮𩄽𩏝𩫰𩯁𪅛𪍣𪖹𬧻",
 "票": "僄剽勡嘌嫖幖彯徱慓摽旚標漂熛瓢瘭瞟磦篻縹缥翲膘蔈螵褾謤醥鏢镖顠飃飄飘驃骠魒鰾鳔㟽㬓㯹㼼䅺䏇䧣䴩𠨌𠨌𡈜𡬽𢿏𣄔𤍟𤡑𤨧𤾛𥛦𥜞𧢄𧴋𧽤𨄏𨝓𩪊𩮳𩯧𪅃𪇃𪏫𫌬𫤕𬓘𬓜𬛡𬧯𬸤",
 "堇": "僅勤厪嫤廑慬斳槿歏殣漌瑾瘽蓳螼覲觐謹谨鄞饉騹㝻㨷㹏䈽䌍𠞱𠻨𡂬𡅸𣾑𥎊𥡣𧅻𩀤𪅀𪙟𫮭𫳱𫹡𬓑𬔐𬴆",
 "連": "僆嗹慩摙槤櫣漣璉縺翴蓮褳謰蹥轋鏈鰱㜕㦁㰈䃛𢄱𤹨𥊩𦔖𧐖𨏩𨕭𨖲𨘑𩞙𪍦𪐍𪤎𫧧𬊿𬍁",
 "翏": "僇剹勠嘐嫪寥嵺廖憀戮摎樛漻熮璆疁瘳磟穋繆缪膠蓼蟉謬谬豂賿蹘轇鄝醪鏐镠雡顟飂髎鷚鹨㬔㺒䚧䢧䰘䵏𠗽𢄪𢒥𣟇𣠼𣩍𤺼𥂔𥃃𥉾𥧯𥲿𦑬𦗖𧢋𨶪𩌭𩖇𩘷𪅡𪖷𪤗𪯖𫐖𬵩",
 "曼": "僈嫚幔慢摱槾漫熳獌縵缦蔓蘰蟃謾谩鄤鏝镘饅鬘鰻鳗㻴㿸䅼䊡䜱䝢䟂䡬𠢝𠼦𡻩𢩤𢿕𢿜𣁜𣡠𤔫𤛔𥀗𥊑𥧭𥲑𦔔𧜞𨢥𨲩𩅍𪉽𪍩𪴏𫆳𫇞𫖏𫙿𫽺𬩩",
 "貪": "僋嗿㵅𣤉𥱷𦹳𬳦",
 "𨊴": "僌𢕣",
 "動": "働勲慟憅㗢㷲𠘃𡼉𢳾𦹝𧜻𪥝𫦿𫦿𫦿𬈭𬡬",
 "巽": "僎噀撰潠簨繏蟤襈譔選鐉饌㔵㦏㯢㷷䠣𡢀𡮭𡮸𢵬𤩄𦈝𦌔𦌻𦍂𦍅𦠆𦧸𦺈𧾌𩦖𩪞𩻝𪟼𬤥",
 "象": "像嶑橡潒蟓襐豫鐌鱌䂊䴂𢄵𢇐𢐣𢠽𤡸𤩪𦺨𧬛𧲜𨖶𩕓𪮱𫂤𫏡𫬰𫮧𬂏𬂖𬅌𬙧𬥆𬥌𬶲",
 "善": "僐嫸敾橏歚磰繕缮膳蟮鄯鐥饍鱔鳝㪨㵛㷽䦅𠟤𡄰𡅐𢢆𢵈𣩧𤺪𥊳𦗢𧬆𨗚𨣁𩕊𩦐𪍶𪱋𫅜𫅞𫅡𬙽𬙿𬚁𬞗𬱱𬹎",
 "喬": "僑勪嘺嬌屫嶠憍撟敽敿橋燆獢矯礄穚簥繑蕎蟜譑趫蹻轎鐈鞽驕鱎鷮㝯㠐㢗䀉䎗䚩䢪𠙪𠿕𠿻𡁗𡰑𡰘𢄹𢐟𢕪𢻤𣤙𣪽𣯹𣾷𤩝𥋊𥼱𦒓𦪞𧄳𨇊𨝰𨲭𩯘𪍷𪢡𫡡𫣹𫦙𬓚",
 "窘": "僒㩈",
 "貴": "僓匱嘳圚嬇尵憒撌樻殨潰璝瞶簣繢膭蕢蹪遺鐀闠隤靧鞼饋㚍㿉䙡䜋䠿䫭䯣䰎𠒺𡪲𢊮𣄜𣡔𤏳𤗴𤡱𥀠𥢢𥣧𥼩𦪒𧑋𧗏𧲆𧷅𧷩𧷪𧸃𧸯𨆨𨎨𨣈𨲿𩏡𩘺𩡞𪎯𫙷𫵒𬐲𬳱",
 "尊": "僔噂壿嶟撙樽澊燇竴繜罇譐蹲遵鐏鱒鳟鷷䔿𠥙𣞊𤮐𥊭𥖁𥢎𥳰𦪚𧒆𨱔𩯄𫂫𫆸𫑼𫜄𫱵𬛘𬟌𬤢𬲝",
 "菐": "僕噗幞撲樸獛璞瞨穙襆贌蹼轐醭鏷镤㲫㹒䑑䗱䧤䪁䴆𡡐𢖃𣊪𣪻𣾴𤂛𤗵𤾣𥐁𥼜𦄾𧴌𩑀𩯏𪋡𪒢𪖈𪠖𫐗𫦖𫨱𫨱𫼆",
 "喜": "僖嘻噽嚭囍囍嬉憘憙敼暿橲歖熹熺瞦礂禧糦繥蟢譆饎鱚㝆㵙䵱𠓘𡀆𡃨𡄂𡅤𡅸𡆐𡆒𡼎𤏴𤢀𤩠𥢗𨭎𨯨𨼩𩦇𪢢𪢣𪮬𫍻𫬸𫼅𫿽𬭳𬶮",
 "勞": "僗嘮嶗憥憦撈朥橯澇癆磱簩耮蟧軂鐒髝䜎䲏𡑍𡡯𣟽𤎤𤏪𤛮𤩂𥢒𦺜𧯍𧰎𨣃𨲮𪱌𫁭𫃑𫦸",
 "敞": "僘厰幤廠氅㢢𠔷𢠵𢢌𣀴𣚿𤏮𤢄𤺲𦒚𦦢𧝟𩻪𪅶𪛆",
 "黃": "僙嫹廣橫趪黋𠾛𤖖𤗶𤛥𤮏𥫍𦡽𦪗𧃂𧓛𧝒𨊇𨎩𨝴𨶰𩙁𪎳𪎵𪎶𪎷𪎹𪎺𪎻𪎼𪎽𪎾𪏁𪏂𪏃𪏄𪏆𪏇𪏈𪏉𪏊𪏋𪏌𪏍𪏎𪏑𪏒𪏓𪏔𪏕𪏖𪏘𪏙𪏚𪏛𪏝𪏞𪏡𪏤𪏥𪏦𪏧𪏨𬹐",
 "欺": "僛㠌𠿁𡮪𥳽𪅾𬸨",
 "登": "僜凳噔嬁嶝憕撜橙澄燈璒瞪磴竳簦膯艠覴證蹬邆鄧鐙镫隥霯鼟㔁㡠㲪㽅䆸䔲䗳䙞䮴䳾𡃻𡪺𢹑𢿤𣃆𣩟𣫤𣰆𤢈𤳘𤺌𤼶𤼷𤼸𤾢𥨰𥼰𧃵𧯫𧰐𧰔𧰥𧺄𧾊𨎤𨐸𨮴𨶿𩍐𩏠𩘼𩙄𩯇𪒘𪽥𫖖𫙼𫜣𫠿𫧸𬢔𬮹𬳒",
 "孱": "僝樼潺轏驏骣㻵𠘈𠟉𢢁𢵔𥢨𦠳𨬖𩻣𪩖𫔏",
 "爲": "僞噅噕嬀寪撝潙爳蔿蟡譌鄬㬙㺔䃣䞈䦱䧦𡐮𢁍𢅌𢊯𢕷𢠿𢡺𣄺𤎶𤏜𤛨𤾡𥊪𥢬𦅂𦠽𦢳𧅅𧲄𧴑𧹋𧽶𨅌𨖿𨟗𨬞𩍇𩑁𩻟𪳵𫕯𫛔𫬑𫿒𬋱𬡮",
 "幾": "僟嘰機璣磯禨穖耭蟣譏鐖鞿饑魕㙨㡮䟇䤒𠟣𢇓𢴰𣰈𥳏𥼘𦠄𦺬𧗒𧗓𧰙𨗂𩦋𪅹𪙧𬘁",
 "番": "僠勫噃嬏審嶓幡憣播旙旛橎潘燔璠皤磻繙翻膰蕃蟠襎譒蹯轓鄱鐇飜鱕鷭㢖㸋㺕㽃䆺䉒䊩䪛䪤䮳𡚘𡫘𢐠𢐲𢑵𢿥𣊩𤄜𤗹𤳖𤳗𤳛𤳺𤺏𥕿𥛮𥢌𦪖𧂵𧑪𨅴𨊃𨊄𨶸𨼠𩀷𩇾𩈀𩐏𩕏𩨏𪖇𪽡𫔍𫿓𬅱𬌌𬏎𬏓𬏔𬏗𬙆𬸪",
 "惠": "僡寭憓橞潓璤穗繐蕙蟪譓鏸韢䧥𠦽𠽡𢴥𥛸𦒎𨎥𪒜𪱇𫂠𫆵𫱮𬋅𬤝𬰶𬵪𬺡",
 "舜": "僢橓瞬蕣䑟䢬䴄𡡞𣊬𤩥𤯷𦨁𫫰𬋊𬧓",
 "替": "僣潜簮譛鐟䣠䲋𠟆𠾱𡼫𢖑𢡚𣚽𤏖𥋋𦅦𦠛𦻘𨅕𩁀𩅮𩕗𪍲𪖽",
 "單": "僤匰嘽嚲囅奲嬋幝彈憚戰撣暺樿殫潬燀癉磾禪簞繟蕇蘄蟬襌觶譂貚軃辴鄲闡驒鱓鷤㠆㲷㺗䐷䠤䡲䯬䵐𠓊𠧈𡁳𡃐𡅄𡆎𡼤𡼯𢠸𣃓𣄨𤩧𤾠𤾺𥷋𦉕𦓍𦧴𦪢𦪣𧂳𧈍𧕦𨞏𨢿𨭐𨼒𩅦𩉁𩍍𩏥𩘾𩴫𪓽𪙣𫆐𫙎𬀚𬀟𬏕𬓿",
 "堯": "僥嘵嬈嶢嶤徺憢撓曉橈澆燒獟皢磽穘繞翹膮蕘蟯襓譊趬蹺遶鐃隢顤饒驍髐鱙㚁㚁㹓䁱䰫䴃䶧𠓘𠟋𠢩𠨪𡅍𡈦𡓖𡗉𡗊𡪩𡭄𡸳𢴽𢿣𢿲𣍕𣠎𣦥𣩦𣫁𤩊𤴀𥋈𥪯𦇇𦉗𦒏𦒒𦪛𧑣𧢬𨇵𨊅𨎬𨷁𩀸𩯆𪞭𪸊𫊐𫤣𫤦𫶺𫾤𬁕𬇆𬩱𬴝",
 "就": "僦噈憱殧蹴蹵鷲鹫㠇㩆𤎼𤏅𥳛𥷛𥷼𦠢𧄥𧑙𧫾𩀻𪆩𪼝𫎢",
 "曾": "僧噌層嶒憎朆橧潧熷璔甑矰磳竲繒缯罾譄贈赠蹭鄫鏳驓鬙鱛㣒㬝㬟㽪䁬䆵䉕䎖䒏䙢䰝𠟂𡡑𡪠𡼳𢅋𢎒𢐞𢐷𢨉𢴣𣍎𣯿𤎯𤎰𤛢𤺧𤾥𥃙𥢥𦌛𦒗𦠇𦼏𧢐𧯒𧲅𧸑𨲯𩱭𪒟𪗐𪙭𪱗𫘯𬁭𬁮𬛪𬛫𬤤𬯣",
 "賁": "僨噴幩憤橨歕濆燌獖翸膹蕡蟦豶轒鐼隫饙馩鱝鲼黂㱵㿎䒈䩿䴅𡅊𡼝𢊱𢴢𢿠𣯻𤖘𤗸𤩳𥀢𥖀𥢊𥳡𦡛𧴍𧷐𩀴𩟲𩦥𪎰𪒰𪔵𪖅",
 "閒": "僩嫺憪撊橌燗癇瞯礀繝蕑襉覵譋鐗鬜鷳㗴㵎𡼥𣟫𣩞𤄒𤡥𥳑𦠥𧟉𧯎𨆀𨎫𨣇𨤄𨰓𩦂𩻘𪙩",
 "矞": "僪劀噊憰橘氄潏燏獝璚瞲繘譎谲蹫遹鐍霱驈鱊鷸鹬䆷䤎䰬𢨌𢵮𣰇𥎐𥎕𥎜𥛯𦒑𦒔𦺖𧑐𧝃𧷾𧽻𨗝𩘻𩙅𪊀𫔎𫚪𬲆",
 "惡": "僫噁癋鐚䜑𡢇𢵣𣩤𣽏𤡾𥼳𦠲𦼇𧑕𪅴𪹪𬄚𬹓",
 "焦": "僬劁噍嫶嶕嶣憔撨樵潐燋癄瞧礁穛膲蕉蟭譙谯趭醮鐎顦鷦鹪㲬㺘䆶䩌𢄺𣟼𣤚𣤹𤃭𤄩𥛲𥼚𥾀𦅃𦗠𦢺𦣳𧄝𧖝𧖝𧝈𨖵𨝱𨱓𨶲𨸋𨿈𨿞𩏢𩏷𪆄𪆔𪽢𫃗",
 "朁": "僭噆嶜憯撍橬潛熸簪糣譖谮鐕㔆㣅㻸㿊䁮䃡䅾䐶䣟䤐䫬䭙𡡖𣟞𣠱𥎑𦻳𧝆𨅔𨼐𨽳𩀿𩅨𩻛𪅽𪖼𪯘",
 "童": "僮勭噇幢徸憧撞曈朣橦氃潼燑獞疃瞳穜罿艟蕫蹱鐘㠉㼿䂌䃥䆹䚒䝑䡴䭚䮵䴀𠟍𡈩𡦜𡰒𡰕𢖜𢨒𣄛𣄢𣊹𤩔𤺄𥪢𥫂𥫎𥳘𦅅𦌜𦒍𦔛𧑆𧘂𧝎𧬤𧸌𧽿𨝯𨣒𨶻𩍅𩕉𩦍𩻡𪆏𫍼𫑕𫝿𬮸",
 "棘": "僰蕀襋㻷䪂𠍷𠒧𠢠𤏡𫂡𬮓",
 "雇": "僱顧𢻠𤡵𤺮",
 "覀": "僲垔覄𪄏𫉹𫌚𫌛𫌞𫌺𫑬𫒖𬦭",
 "粟": "僳憟潥㔄㯨䊲䌚䥔𣯼𤢂𥢕𥽹𩞸𫃉𬖫𬗁𬡻",
 "間": "僴橺澗癎瞷磵簡蕳襇覸鐧鬝鷼𡢃𡼏𢢀𢵧𣊺𤃦𤩎𥼴𦅘𦗬𧒄𧢑𧬘𧯑𨅍𨣉𩻾𪙨𪧶𪪢𬛖",
 "黽": "僶憴澠竈繩虌蠅譝鄳鱦黿鼀鼁鼂鼃鼄鼅鼆鼇鼈鼊䵴䵶䵷䵸䵹𡢘𡽑𢥼𣋋𥀨𥀩𥋝𥜐𥤠𥨫𥩋𦌡𧕓𧕵𧥕𨭘𨷟𪓑𪓒𪓓𪓔𪓖𪓗𪓘𪓙𪓚𪓛𪓜𪓞𪓟𪓠𪓡𪓢𪓣𪓥𪓦𪓧𪓨𪓩𪓪𪓫𪓬𪓭𪓮𪓯𪓰𪓱𪓲𪓳𪓴𪓵𪓶𪓷𪓸𪓹𪓺𪓻𪓼𪓽𪓾𪓿𪔀𪔁𫁘𫜝𫜞𬹝𬹞𬹟𬹠𬹡𬹢",
 "葉": "僷擛瞸蠂鐷㵩䜓䭟𠪸𣋑𣜿𣩨𧝵𨆡𨗸𩆏𩍣𫅠𫊍𬀗𬛚",
 "禁": "僸凚噤澿襟齽㦗㩒㯲㱈䌝䫴𠢱𠢵𡑲𡢾𣋜𣰙𤐖𤻎𥋴𥖜𥢻𥽍𦈟𦡞𦽔𨆃𨣤𨭺𩖗𪇎𪊅𬓛𬜏𬺔",
 "賈": "價檟䜖𠿪𣿦𥋣𪆲𫠎",
 "喿": "僺劋噪嬠幧懆操橾氉澡燥璪矂繰缲臊襙譟趮躁鄵鐰髞鱢㩰㿋䆆䵲𢤁𢻥𢿾𣀉𣋝𣜣𣰕𤢖𥖨𥼾𥽹𦗵𦾈𧒮𧴜𨽣𩙈𩙰𩟎𩯟𪍻𪍽𪤢𫚫𫥛𫧭𬤨",
 "辟": "僻劈噼壁嬖孹幦廦憵擗擘檗檘澼璧甓癖礔礕糪繴薜襞譬躃躄避鐴鐾闢隦霹鷿鸊鼊㠔㱸㵨䁹䌟䑀䡶䢃𠒱𠙮𠪮𠮃𢐦𢕾𣦢𣩩𤐙𤗺𤢣𤩹𤴣𥗲𥴬𦈞𦌠𦡜𧄀𧓄𧞃𧲉𧲜𧾑𨐢𨐨𨐬𨐯𨐴𩁊𩼎𩼢𪇊𫴎𫻏𬨔𬭽𬸯",
 "豊": "僼澧禮艶豑軆鄷醴闦霻體鱧鳢䌡䪆䵄𠓍𠙫𡫋𡽍𢢪𣀂𤣁𥎓𥴡𥸠𥽈𦡊𧬹𧰅𧰚𧰞𧰟𧰢𨼷𩁑𪏨𪤡𪩰𪴀𫋠𫌓𫓐",
 "愁": "僽矁㵞𠿈𢶲𣜷𩼗",
 "愛": "僾噯嬡懓曖燰璦皧瞹薆鑀靉鱫𣜬𤻅𥖦𥣁𥴨𦡝𧓁𧞇𨙤𨣥𩡣𪇈𪒱",
 "塞": "僿噻簺㩙𡑮𡬉𤀕𫉲",
 "義": "儀嬟嶬檥燨犠礒艤蟻議轙鸃㕒㠖㩘㬢㼁䉝䕏䣡䧧䰮䲑䴊𠬗𠿿𢣂𣿭𤩺𥫃𦡫𧕶𧸡𨆋𨣞𪙴𫓔𫴌",
 "雋": "儁寯嶲懏擕檇臇觹鐫㻽𠟠𠿘𡼕𢋄𤎱𤺻𥨣𦆈𦼱𧓈𧕣𧕲𧗔𩍺𩦩𪆳",
 "農": "儂噥嶩憹擃檂欁濃燶癑禯穠繷膿蕽襛譨醲鬞齈㺜䁸䃩䵜𠘊𡢿𢐪𢖢𣋏𣰊𥵛𦗳𧓅𨆞𨐺𨑊𨲳𩅽𩼅𪆯𪇌𪒬𪞽𫓒𫧪𬉰𬍎",
 "亶": "儃勯嬗憻擅旜檀氈氊澶璮皽繵膻蟺襢譠邅顫颤饘驙鱣鳣鸇鹯㔊㣶䁴䃪䄠䆄䉡䕊䡀𠆞𠘐𠿞𡅹𡆎𢅒𢋃𢐹𢷆𣋊𤢏𤮜𤺺𥼷𦒜𧾍𨆁𨣚𨭖𨲵𨲷𩁉𩉊𩍕𩙼𩯤𩽱𪓼𪙵𫔑𫗴𫘰𬙉",
 "意": "億噫嬑憶檍澺燱癔繶臆薏譩醷鐿镱鷾䖁䗷䪰𢶶𤢛𥜇𥵆𩁈𩍖𩯵𪤥𪬫𪱍𪼦𫁈𫄷𫔪𫵋",
 "當": "儅劏噹擋檔澢璫礑簹艡蟷襠譡鐺闣㜭㼕㽆𠧁𡽊𣃉𤔶𤗾𤢎𥢷𥼽𦗴𦡁𦼲𧒾𨆉𨎴𨼴𩼉𪇁𫷑𬙔𬩖",
 "敬": "儆憼擎擏曔檠璥蟼警驚㢣㯳𠧂𢍸𢐧𢢩𤀂𨰈𩼃𫄿𫱻",
 "睘": "儇噮圜嬛寰彋懁擐檈澴獧環癏糫繯缳翾蠉譞轘還鐶镮闤阛鬟鱞鹮䁵䚪䴉䴋𡑡𡕅𢕼𢩠𢹞𣟴𣡬𤃆𦌺𦒠𦣴𧾎𨆈𩍡𩕪𩙽𩦮𪍺𫍽𫜅𫤻𫸁𬒥𬪗𬶵",
 "會": "儈劊噲嬒廥徻懀旝朇檜澮燴獪璯癐瞺禬糩繪膾薈襘譮鄶鬠鱠䢈䭝䯤䵳䶐𠁚𠁞𠑱𠘎𡑭𡳳𡼾𢶒𣋘𣍋𣍐𣞄𣩮𣫪𥖩𥢶𥫁𥵊𦓊𦔦𧒯𧴚𧸤𨆝𨗥𨞡𨭗𩆁𩠴𩦱𪩚𫅋𫆑𫏱",
 "僉": "儉劍劎劒劔匳厱噞嬐嶮憸撿斂檢歛殮澰獫瞼礆簽臉薟襝譣醶鐱險顩驗鹼㢛㷿㿌䌞䩎䲓䶨𠐖𠐘𠑁𠑲𠑲𡑯𡔗𡔗𡽗𡾴𢅐𢨔𣄝𣜟𣞘𣫍𤒷𥃡𥜋𥣂𥷡𥽋𦗹𦗼𧂆𧸘𧾏𨆘𨗦𨘰𩅼𩏩𩕿𩖄𩖆𪇇𪒫𪜇𬜐",
 "楚": "儊憷檚濋璴礎齼𠿝𡢟𤻇𨆄𨭣𨼪𪹵𬺓",
 "詹": "儋噡嶦幨憺擔曕檐澹甔癚瞻簷膽舚薝蟾襜譫谵贍赡韂黵㙴㜬䃫䄡䟋䠨䦲䪜𡅨𣠳𦅼𦉜𧭃𨎻𪆻𪼤𬰷",
 "敫": "儌噭嬓徼憿撽曒檄激燩獥璬皦礉竅繳缴薂譤譥躈邀鸄䚫䥞𢅎𢶡𣎣𣜥𦅾𧝳𧾐𩅢𩦨𩯛𬭻",
 "𠚍": "儍糭鑁鬯",
 "載": "儎𠥠𢶪𪳾𫄇",
 "粲": "儏殩澯燦璨薒㣓𡦞𢷂𥢽𥴷𥽆𦪫𧒷𨮏𩯞𩼇𪆶𪞆𫥚𫱼",
 "賓": "儐嬪擯檳殯濱獱璸矉礗穦繽臏薲蠙鑌顮馪驞髕鬢㡦䎙䚔䧬䨈𡒨𢣐𣋪𣰨𤄠𧷟𧸈𨊕𨲺𩰝𩴸𩼧𪇕𪵢𪹿𫴑",
 "需": "儒嚅嬬孺嶿懦擩曘檽濡燸獳瓀礝穤糯繻臑薷蠕襦譳轜醹鑐隭顬颥鱬㹘㽭䇕䞕䨲䰑䰰𠟺𠣉𠧍𢐰𤻪𥀫𥀭𥌎𥎘𥐎𥜗𥤃𦈡𧄨𨷘𩆊𩆟𩍥𩪰𩴶𪋯𪎱𪴠𫏧𫗜",
 "臺": "儓嬯懛擡檯籉薹㘆𡽩𢅣𤁅𤗿𤢬𤻡𧭏𩦽𪒴",
 "壽": "儔嚋嬦嶹幬懤擣檮濤燽燾璹疇禱籌翿薵譸躊軇醻鑄隯魗㦞㹗㿒㿧䊭䌧䬞䮻䲖𠠐𡕐𡕑𣀓𣀘𣋬𣝷𣤫𣫐𤒵𤘀𤴆𥌆𥖲𦏟𦡴𦦰𦦾𧈙𨞪𨟢𩕯𩯦𪇘𫇠𫋤𬰯",
 "齊": "儕劑嚌懠擠櫅濟璾癠穧纃臍艩薺蠐躋鑇隮霽鱭麡齋齌齍齎齏㸄䄢䍤䜞䭣䮺䶒䶓䶩𡣙𡽉𣋠𥐌𥖭𧓉𧖊𧞓𧾙𨣧𨽘𩱳𪊆𪗅𪗆𪗇𪗈𪗉𪗊𪗋𪗌𪗍𪗏𪗑𪤪𬀛𬩣𬪜𬹲",
 "監": "儖嚂尶尷懢檻濫爁璼礛籃糮繿艦藍襤轞鑑㔋㜮㩜㲯㺝䆾䰐𠕱𡮻𡮼𡽳𡽾𢅡𢹹𣁥𣰦𥃢𥌈𥜓𦡶𦣸𧓦𧕭𧭗𧸦𩴵𪇖𪊇𫗝𫶻",
 "疑": "儗凝寲嶷懝擬癡礙籎薿觺譺㘈㠜㽈䰯𢅟𢣕𢥷𣝅𣝆𤁒𤪦𤾰𥣖𥨯𦆦𦘀𦡸𦡼𧃩𧭐𧹾𨷞𩉏𩴷𩼨𪪧𫲆𬅐𬤩𬩜𬬔",
 "盡": "儘嚍嬧孻濜燼璶藎贐㯸𢣺𣃏𤄸𥃞𥵧𪟖𪮺𬬗",
 "遣": "儙繾缱譴谴鑓䪈䭤𡒌𨇀",
 "舞": "儛躌㵲䒉𠥢𡣆𢋑𥌇𦆞𦌬𪢦𬠴",
 "寧": "儜嚀嬣懧擰檸濘獰矃薴鑏鬡鸋㣷㲰䗿䭢𡫸𡬗𤻝𥣗𦡲𧭈𧰗𨊓𨲸𩁔𩕳𫍾𫴞",
 "榮": "儝嬫嶸濚爃蠑鑅㘇㩞𣞁𤪤𦆱𦾵𨏍𫮴𬄾𬧘𬷷",
 "爾": "儞壐嬭彌擟檷濔獮璽禰穪籋薾蠒襧覼趰躎邇鑈镾隬鸍㩶䌤䦵𠑓𠕰𠧌𡁠𡤘𢑃𢣚𢣭𣀑𣝧𣡋𤅤𤐨𤣔𤣗𤣝𤪙𤰐𤻞𥌃𥎖𥜦𥜬𥷄𦇼𦒤𦢈𧄬𧟐𧭉𨏤𨤻𨮪𨯡𨷬𩁖𩍦𩯨𩰞𪈕𪓿𫁮𫲅𬚨",
 "賞": "償贘鑜𢤗𤪸𦘆𧭢𫲐",
 "巤": "儠擸爉獵臘蠟躐邋鑞镴鬣鱲㯿㲱㼃䁽䃳䉭䜲䝓䪉𠠗𡓍𢆭𢺍𣋲𣰫𥸆𧄵𧭞𧰠𩨐𪇹𪙷𫖩𫚭𫿢",
 "畾": "儡壘攂櫐櫑氎瓃疉疊礧礨纍罍藟蠝讄轠鑘靁鸓鼺㔣㙼㩸㵽㽮㿔䉪䴎𠢿𡚗𡾊𡾋𡾔𢁐𣀜𣀡𣡟𣰭𣰸𤃻𤢹𤣂𤳏𤳦𤴁𥃇𥣬𦇄𦈅𦌵𦢏𧞭𧟕𨑌𨞽𨯔𩁜𩴻𩴼𪦮𪽤𫐙",
 "慮": "儢勴攄櫖濾爈藘鑢𠣊𡃖𡣭𡾅𢣿𣀞𤻱𥌠𥖼𥜜𥶌𥽜𦢛𧓻𧭜𧾧𪇸",
 "廣": "儣兤嚝彍懬懭擴曠櫎瀇爌獷矌礦穬纊鄺鑛䊯𢌊𢌌𤳱𥀱𦓣𦘅𦢎𨇁𨽏𪇵𪍿𪏪𪠢𫋧𫸊𫸋𫸌𫸍𫸎𫸏𫸐",
 "暴": "儤嚗懪曝瀑爆襮鑤鸔㩧㿺䂍䤖𢑾𢖔𣀛𣀠𣋰𣞺𥗋𦆿𦢊𧔙𧭤𧲐𨇅𩁠𩙕𩯱𪇰𪻌",
 "賣": "儥凟匵嬻櫝殰瀆牘瓄皾竇續藚襩覿讀豄贕贖鑟韇韥黷䄣䢱𠠔𠠠𡂝𡔍𢖏𢷺𣋺𣤯𣰬𥀲𥌚𥖿𥶦𦌷𦢌𧅎𧔖𧘅𧸝𧸷𧾥𨏔𨽍𩧈𩴺𩽆𪺁𬌏𬔃",
 "麃": "儦瀌爊皫穮臕藨鑣镳㩠䮽𡂘𡾌𢖐𣄦𣋳𤣄𥌜𥶔𦔩𧞧𧞯𨞻𩍶𩙒𩽁𫿡𬴍",
 "㚘": "儧賛輦辇𠏝𤎺𪳭𫌡𫏼𬙃𬝥𬢃",
 "質": "儨劕懫櫍瓆礩躓鑕㜱㩫䑇䜠𠘖𡂒𡒻𡦫𤁩𤢽𧓳𧸲𨏑𨐿𨟊𩍵𩧄𩽄𪮽𬘋",
 "賜": "儩瀃𧀩",
 "憂": "優嚘懮擾櫌瀀獶瓇纋耰鄾㱊䜡䥳𡔀𢖒𢥀𢥙𤛾𥜚𥣯𥽟𧀥𧾤𨇄𩽇𩾎",
 "豪": "儫嚎檺濠籇蠔譹㠙㩝䧫𤐶𤢭𤪗𦪳𧥉𨮙𪞯𬤫𬵵",
 "靚": "儬㵾𩇟",
 "親": "儭嚫寴櫬瀙藽襯䞋𥗒𥨾𧭼𫥝",
 "歷": "儮嚦攊櫪瀝爏瓑癧礰藶讈轣靂㠣㱹㺡㿨䍥䟐䥶𠘟𠠝𠫏𡤌𡫯𡳸𢖙𢤩𣀥𣌜𤖢𤘃𥌮𥤀𥨻𥷒𦇔𦘊𦪾𧔝𧞿𧰡𧴠𨇗𨊛𨘸𨟑𨣷𨷦𩙖𩯺𩽏𪓀𪖍𪗁𪙽𫇀",
 "駦": "儯驣䠮𢥂𦫀𧔟𩦶𪒿",
 "蒍": "儰",
 "龍": "儱嚨壟寵巃巄徿攏曨朧櫳瀧爖瓏矓礱礲竉籠聾蘢蠪蠬襱襲讋豅贚躘鑨隴靇驡鸗龎龏龐龑龒龓龔龕龖龖龗龘龘龘㰍䆍䌬䏊䡁䪊䮾䶬𠖥𡃡𡅃𡓺𡬈𡾩𢤱𢤲𢸭𣰵𤜆𤜎𤮨𤳽𤼃𥸙𦌼𦒮𦪽𦪿𧕻𧟟𧟟𧮩𧮩𧲖𧾪𨇘𨏠𨳁𨳅𩙘𩟭𩰀𪈗𪎁𪐖𪔷𪚑𪚒𪚓𪚔𪚕𪚖𪚗𪚘𪚙𪚚𪚛𪚜𪚝𪚞𪚟𪚠𪚡𪚢𪚣𪚤𫅍𫑰𫜱𫦞𫲘𫿤",
 "諸": "儲櫧藷蠩㶆䃴䊰𠤌𢥃𣌆𣠖𫧬",
 "毚": "儳劖嚵巉攙欃瀺纔艬讒鑱镵饞㜶㸥㺥䂁䧯䪌𠠥𠣄𡓦𡤎𡮿𢖞𢩢𣤱𤒰𤜇𤮭𦣸𦧻𧕃𨇩𩖌𩰃𩽝𪓄𪗂𪚃",
 "襄": "儴勷嚷孃忀懹攘曩欀瀼爙獽瓖瓤禳穰纕蘘蠰讓躟釀鑲镶饟驤骧鬤㠤䉴䑋𡗑𢐿𣀮𣤸𣩽𣰶𤓢𤬞𤰂𥀶𥗝𥸒𥽬𧟄𨟚𨰴𨳃𨽢𩆶𩟻𪊊𪓃𪱒𫗵𬙋𬰰",
 "黑": "儵嘿墨嫼潶蟔黓黔黕黖黗默黚黛黜黝點黟黠黡黢黣黤黥黦黧黩黪黫黬黭黮黯黰黲黳黴黵黶黷黸㩏㱄㷵㸃䁫䆀䵝䵞䵟䵠䵡䵢䵣䵤䵥䵦䵧䵨䵩䵪䵫䵬䵭䵮䵯䵱䵲䵳䵴䵵𠎁𠪩𡓪𡴦𡼡𢖛𢡀𢥽𣎚𣝙𤪯𤼎𥂮𥳬𥼯𦄿𦅔𦗣𦢜𦸽𧅌𧭲𧴔𨊂𨭆𨶯𩯗𩻤𪆤𪐘𪐙𪐚𪐛𪐜𪐝𪐞𪐟𪐡𪐢𪐣𪐤𪐥𪐦𪐧𪐨𪐩𪐪𪐫𪐬𪐭𪐮𪐯𪐰𪐱𪐲𪐳𪐴𪐵𪐶𪐷𪐸𪐹𪐺𪐻𪐼𪐽𪐾𪐿𪑀𪑁𪑂𪑃𪑅𪑆𪑇𪑈𪑊𪑋𪑌𪑍𪑎𪑏𪑐𪑑𪑒𪑓𪑔𪑕𪑖𪑗𪑘𪑙𪑚𪑛𪑜𪑝𪑞𪑟𪑠𪑡𪑢𪑣𪑤𪑥𪑦𪑧𪑨𪑩𪑪𪑫𪑬𪑭𪑮𪑯𪑰𪑱𪑲𪑳𪑴𪑵𪑶𪑷𪑸𪑹𪑻𪑼𪑽𪑾𪑿𪒀𪒂𪒃𪒄𪒅𪒆𪒇𪒈𪒉𪒊𪒋𪒌𪒍𪒎𪒏𪒐𪒑𪒒𪒓𪒔𪒕𪒖𪒗𪒘𪒙𪒚𪒛𪒜𪒝𪒞𪒟𪒠𪒡𪒢𪒣𪒤𪒥𪒦𪒧𪒨𪒩𪒪𪒫𪒬𪒭𪒮𪒯𪒰𪒱𪒲𪒳𪒴𪒵𪒶𪒷𪒹𪒺𪒻𪒼𪒽𪒾𪒿𪓀𪓁𪓂𪓃𪓄𪓅𪓆𪓇𪓈𪓉𪓊𪵓𫜙𫜚𫜛𫜞㶖𬏼𬟱𬭶𬹕𬹖𬹗𬹘𬹙𬹚𬹛",
 "巂": "儶孈攜欈瓗纗蠵觿讗酅鑴驨㔒㽯䪎䭨𡄴𡰡𡰢𡿀𢥘𤣑𤮰𤼒𥍋𦢿𧟃𧢧𧲚𨏳𩽨𪈥𪋸𫄹𫔔𫘱",
 "麗": "儷囇孋廲彲攦曬欐灑矖穲籭纚襹躧驪㿛䕻䚕𠠫𡔉𢥬𣀷𣰿𤫟𥜰𦌿𦘐𧕯𨏽𨰣𩎉𪈳𪋨𪋭𪩠𫇃𬅛𬋞𬜟",
 "羅": "儸囉攞曪欏玀籮纙蘿邏鑼饠㦬㼈㿚𡆆𡤢𡿇𡿏𢅾𣩿𣱀𤄷𥗴𥗿𦍉𦣇𧟌𧹐𨇽𩉙𩎊𩵇𩽰𪈰𪎆𬠻",
 "贊": "儹劗囋巑攢欑灒瓚礸禶穳籫纘臢襸讚趲躦酇鑽饡㜺㦫䂎䡽䰖𠓕𡿍𢑊𣀶𣀹𣪁𤓎𤿀𥽷𦫅𧄽𧹍𧹏𨤆𨳄𩎈𩵆𪚇",
 "難": "儺戁攤灘癱臡㬮㰙㸐䕼𡔃𡚟𡿊𢥪𢺋𣌖𤓉𤓌𦍀𧆋𧕴",
 "黨": "儻戃攩曭欓灙爣矘讜钂㿩䣣𡆊𡤭𡿓𣎲𤣞𥤗𥸈𥽻𧅗𨏻𩽳𪼲𫄗",
 "嚴": "儼孍巖巗曮欕玁礹讝釅麣㘙䉷䕾䶫𠘥𡗏𢥴𢺘𤅙𤫠𥍓𧟓𧴣𨰫𩽴𪋹𫀤𫹪",
 "纍": "儽欙癳纝虆㶟𡤯𡿔𡿜𢺢𤜖𤫤𤴈𥍔𥗼𥸕𧮢",
 "囊": "儾囔攮欜灢饢齉㚂𡿝𢖧𥗾𦈃𦣘𧅺𧖒𧟘𨳆𩰉𫆓𫇄𫯚𬥲𬦀𬧟𬬥",
 "兀": "元卼堯尫尭尶屼扤杌矹虺豗軏阢靰髡鼿㐳㫁㫕㫯䑢䲫𠀘𠀘𠀩𠃈𠃈𠃈𠋨𠒄𠒊𠕶𠚯𠤐𠨜𠮾𠳟𠳠𡈘𡖴𡚲𡧉𡯝𡰁𡰅𡰈𡰞𡱂𡵉𡽷𡽷𢇟𢝏𢮺𢻞𣁋𣆧𣆧𣉊𣒸𣓤𣔛𣲍𣷝𣾃𣾮𤈡𤓅𤙀𤮾𤮿𤴰𤼫𤽅𤽕𥃺𥆦𥚋𥩗𥾕𦀄𦣾𦬂𦭃𦯲𧆪𧈭𧿁𨓢𨣩𩂁𩄁𩜙𩱽𪨇𫐄䪲𫳹𫵐𬀸",
 "⺧": "先告𠵟𣢳",
 "𠑷": "兏",
 "旧": "児稲㴞㷔𠀥𠖚𠢎𠮘𡘨𡳵𡳶𣆨𣇑𣐤𣿱𥈺𦼨𦾔𨂻𪜢𪥮𫂻𫇰𫝒𫩥𫺼𬎝",
 "兂": "兓兓𢛭𩱠𩱠",
 "六": "兖冥宍昗萒䧶𠅾𠆄𠆾𠇸𠔔𠕜𠕼𠢖𠧝𠯿𠲩𠵷𡇰𡉽𡖷𡪴𡴆𡴫𡴫𡴫𢌸𢓌𢗻𢟫𢩡𣅶𣇴𣏥𣒕𣙣𣼗𤫹𥄈𥈛𥌍𥥀𥫰𥾻𦊇𦒹𦬩𦶧𧃥𧍄𨍵𨖰𨻎𨻪𩋛𩕧𩕴𪓖𪦸𪷙𫋴𫼚𬙩𬙩𬟻𬧡",
 "兌": "兗哾悅挩敓梲涗稅脫蛻說銳閱𠜑𠮄𣮆𤿫𥆟𥹲𧇓𨁑𨉋𨌔𩊭𩎰𪁑𫎙𫲦",
 "克": "兙兛兝兞兡兢兢兣剋勀勊娔尅殑氪鋴㳳𠒐𠒘𠒙𠒚𠒠𠒭𠒲𠓈𠓎𠗌𠳭𢚛𢭪𣒖𤙥𤥣𪣕𫀲𫎵𫐦𫧱𫶶𬀌𬇾𬱆",
 "毛": "兞宒尾旄枆毜毝毞毟毠毡毢毣毤毥毧毨毩毪毫毬毭毯毰毱毲毳毴毵毶毷毸毹毺毼毽毾毿氀氁氂氃氄氅氆氇氈氉氊氋氌氍氎瓱眊秏竓笔粍耄耗芼蚝覒軞酕閐雮靟髦魹麾㕰㘪㚪㧌㲌㲍㲎㲎㲏㲐㲑㲒㲓㲔㲕㲖㲗㲘㲙㲚㲛㲜㲝㲞㲟㲠㲡㲢㲣㲤㲥㲦㲧㲨㲩㲪㲫㲬㲭㲮㲯㲰㲱㲲㿞䋃䚽䫽䭷䶰𠇔𡥊𡱤𡲔𡶮𢅇𢉐𢗳𢟾𢯁𢷉𢷉𣄓𣖏𣬜𣬝𣬞𣬟𣬠𣬡𣬢𣬣𣬤𣬥𣬦𣬧𣬨𣬩𣬪𣬫𣬬𣬭𣬮𣬯𣬰𣬱𣬲𣬳𣬴𣬵𣬶𣬷𣬸𣬺𣬻𣬼𣬽𣬾𣬿𣭀𣭁𣭂𣭃𣭄𣭅𣭆𣭇𣭈𣭉𣭊𣭋𣭌𣭍𣭎𣭏𣭐𣭑𣭒𣭓𣭕𣭖𣭗𣭘𣭙𣭚𣭛𣭜𣭝𣭞𣭟𣭠𣭡𣭢𣭣𣭤𣭥𣭦𣭧𣭨𣭩𣭪𣭫𣭬𣭯𣭰𣭱𣭲𣭳𣭴𣭵𣭶𣭷𣭸𣭹𣭺𣭼𣭽𣭾𣭿𣮀𣮁𣮂𣮃𣮄𣮅𣮆𣮇𣮈𣮉𣮋𣮌𣮍𣮎𣮏𣮐𣮑𣮒𣮔𣮕𣮖𣮗𣮘𣮙𣮚𣮛𣮜𣮝𣮞𣮟𣮡𣮢𣮣𣮤𣮦𣮧𣮨𣮩𣮪𣮫𣮬𣮮𣮯𣮰𣮱𣮴𣮵𣮶𣮷𣮹𣮺𣮻𣮼𣮽𣮾𣮿𣯀𣯁𣯂𣯃𣯄𣯅𣯆𣯇𣯈𣯉𣯊𣯋𣯌𣯍𣯎𣯏𣯐𣯑𣯒𣯓𣯔𣯕𣯖𣯗𣯘𣯙𣯚𣯛𣯜𣯝𣯝𣯞𣯟𣯠𣯠𣯡𣯢𣯣𣯤𣯥𣯦𣯧𣯨𣯩𣯪𣯫𣯬𣯮𣯯𣯰𣯱𣯲𣯳𣯴𣯵𣯶𣯷𣯸𣯹𣯺𣯻𣯼𣯽𣯾𣯿𣰀𣰁𣰂𣰃𣰄𣰅𣰆𣰇𣰈𣰉𣰊𣰋𣰌𣰍𣰎𣰏𣰐𣰑𣰒𣰓𣰔𣰔𣰕𣰖𣰘𣰙𣰚𣰜𣰝𣰟𣰠𣰡𣰢𣰣𣰥𣰦𣰧𣰨𣰩𣰫𣰬𣰭𣰮𣰯𣰰𣰱𣰲𣰳𣰴𣰵𣰶𣰷𣰸𣰹𣰺𣰼𣰽𣰾𣰿𣱀𣱁𣱂𣱃𣱄𣲭𤆬𤋞𤋤𤙚𤝄𤦖𤷋𥄥𥇾𥐽𥮿𥲨𦆡𦋋𦋋𦌓𦒷𦙤𦯮𦺑𦿗𧃂𧘝𧠑𨈥𨊜𨑺𨔅𨖧𨪅𨱞𨲝𨲰𨸃𩉪𩠔𩤗𩫁𩲊𩳯𩸚𩿂𩿘𪉚𪎷𪰌𪵖𪵗𪵘𪵙𪵚𪵛𪵜𪵝𪵞𪵟𪵠𪵡𪵢𫂌𫄜𫷀𬆼𬆽𬆾𬆿𬇀𬇁𬇂𬇃𬇄𬇅𬇆𬇇𬇈𬔆𬚱𬣜𬨁𬲎",
 "厘": "兣喱湹甅竰糎緾䣑䱳𡪸𡺉𢢳𦝟𧽆𨂷𨇎𨤲𨤸𨤺𩪪𪧳𪻵𫒄𫮈𬃗𬪿𬫁𬫭",
 "入": "兦叺圦屳扖杁汆籴肏込釞魞鳰㒰㒱㒲㒴㞥䓥𠁥𠇒𠇒𠓛𠓜𠓜𠓞𠓢𠓣𠓦𠓨𠓩𠓪𠓪𠓪𠓫𠓬𠓯𠓰𠓱𠓲𠓵𠓶𠓷𠓸𠓺𠓼𠓿𠕳𠖧𠖪𠯱𠯱𠹫𠹫𡆣𡌵𡝙𡭗𢞥𢬝𣐍𣔕𣤏𣱸𣱿𤆋𥃮𥉏𥍅𥍅𥛓𥻳𦎚𦔵𦘲𦝵𧦁𧦁𧪃𧹳𧺌𧻤𧾺𨍻𨕽𨞤𨾁𩚆𫀂𫨙𫩿𬡂",
 "異": "兾冀廙戴潩熼禩穓糞翼趩霬㔴䔬𠪙𡠲𢎑𢨚𢹢𣄗𣚣𤲲𤳓𤳧𤺆𥣕𥣢𦒖𦔜𦾲𧃢𧇽𧑌𧝀𨅜𨯼𨾂𩙺𩦸𩨎𪒕𫣭𬏖𬏘𬢄𬵫",
 "展": "冁囅搌榐碾蹍輾辗㜊䱼𠌄𠹖𣪵𣺹𤧷𥉲𦟌𧎰𧔡𨃨𨫀𩥇𩨍𪄡𪙕𪤍𫃌𬝳𬭫𬺐",
 "冃": "冑𤣽",
 "与": "写屿欤玙㝍𠇐𡴃𢌱𢗓𢪓𢮠𢮠𥃋𥫣𨊮𨓂𨤒𪾟𫚈𢌱𢌱𫹮𬇵",
 "皀": "冟卽廏旣梎鄕𠤙𡇠𡨇𣪘𣴡𥦒𪓨𪞋𪟙𪬒𫂉𫈇𫩃",
 "豖": "冢啄椓涿琢瘃硺諑诼㙇㞘㧻䐁䦠𠣥𥳤𧌮𧰵𧱦𧱧𧼙𨁿𨧧𬳝",
 "取": "冣埾娵娶掫最棷棸樷焣箃緅聚菆諏诹趣踙輙郰鋷陬鯫鲰黀齱㖩㝡㷅㻓𠉧𠮊𠮋𠻕𡣞𡱾𡸘𡸨𢃣𢈾𢛏𢮝𢲻𢷗𢹸𣍇𣜒𣷗𤏱𤔛𤕖𤚉𤦟𤭡𥊁𥦡𥧖𥪏𦝒𦸤𧄢𧌗𧚥𧜮𧩞𧱛𨄒𨐉𨓭𨛿𨝢𩋄𩧁𩯍𪋄𪘸𪝫𪞔𪠱𪩝𪪿𪺐𫃂𫩉𫮣𬄿𬅆𬠪𬥁",
 "兔": "冤婏寃菟逸酁鵵㕙㝹㭸䖘䨲𠒢𠓗𠓗𠓗𠕤𠗟𡅛𡇹𡙖𡤹𡤹𡤹𡤺𡤺𡤺𢉕𣃅𣬚𣬚𥋥𧥒𧥒𨿮𩆟𩣮𩸃𪫐𫴧𫺜𫿔𬌍",
 "舄": "冩寫潟磶蕮㕐䉣𣚔𤺎𩍆",
 "幕": "冪濗羃𢆅𥵵",
 "马": "冯吗妈杩犸玛码笃羁腾蓦蚂闯驭驮驯驰驱驲驳驴驵驶驷驸驹驺驻驼驽驾驿骀骁骂骃骄骅骆骇骈骉骉骉骊骋验骍骎骏骐骑骒骓骕骖骗骘骙骚骛骜骝骞骟骠骡骢骣骤骥骦骧㐷䘞𡧁𪠃𫘛𫘜𫘝𫘞𫘟𫘠𫘡𫘢𫘣𫘤𫘥𫘦𫘧𫘨𫘩𫘪𫘫𫘬𫘭𫘮𫘯𫘰𫘱𫠊𫼗𬁳𬏜𬡇𬧃𬮺𬳳𬳴𬳵𬳶𬳷𬳸𬳹𬳺𬳻𬳼𬳽𬳾𬳿𬴀𬴁𬴂𬴃𬴄𬴅𬴆𬴇𬴈𬴉𬴊𬴋𬴌𬴍𬴎𬴏𬴐𬹘",
 "夬": "决刔吷妜快抉決炔玦疦砄缺芵蚗袂觖訣诀赽趹鈌駃鴂鴃㭈㹟䀗䆕䊽䏐䦑䦼䫼𡘢𡘱𡙇𡙖𡥹𢁪𢎹𢯵𢾔𣅡𣧎𤰮𤱉𤱾𥁍𥆸𥝭𦐋𦐍𦑗𦛇𦤕𦿙𧑦𧖫𧩍𨑣𨾕𩂃𩍯𩍷𩫠𪌊𪩺𪱖𪺧𫘝𫛞𫡘𬒮𬱷",
 "犮": "冹妭帗拔柭沷炦盋瞂祓秡紱翇胈茇蛂袚詙跋軷鈸韍颰馛髮魃鮁黻鼥㕹䣮䮂䯋䳁䳊𠕯𡁳𡞬𡲁𢂤𢊤𣖒𤁊𤎈𤕳𤝜𤤒𤩆𤵬𥎱𥑕𥣣𥥛𥬒𥹔𦇌𦐗𦓗𦜺𦤚𦳺𧛌𧲯𧸻𧺺𨈩𨱳𨾩𩂔𩊊𩊤𩑱𩮤𪊝𪟁𪥲𫐈𫩋𬋾𬖬",
 "民": "冺刡呡囻姄岷怋敃昬氓泯珉眠笢罠苠蟁鈱鴖㢯㥸䂥䇇䋋䛉䟨䡑䪸𠊽𡶗𡶘𡸧𢞰𢾞𣃹𣊽𣐡𣣤𣧟𣱅𣱈𣱉𤇜𤱕𤵤𤸅𤹋𤿕𥞔𥱚𦃴𦊞𦕛𦖫𦝮𧉬𧊈𧓹𧠠𧻎𨍌𨳶𨵽𨾧𩀃𩔉𪓍𪓏𪜳𫅒𫙗𫞖𬌭",
 "东": "冻岽栋胨陈鸫㑈𢾣𣱝𪣆𫹼𬒃𬟽𬢈",
 "争": "净婙峥挣浄狰琤睁碀竫筝諍诤踭錚铮静鬇㬹䋫䦛䦶䱢𢂰𧶄𪺘𬥷",
 "束": "凁剌勅娕悚捒敕梀欶殐涑疎竦綀脨觫誎赖趚踈辢辣速鋉頼餗駷鵣㑛㩽㻋䀳䇿䜹𠁃𠠅𠠅𠣩𠭄𠲿𠾋𡇯𡖯𡘝𡘸𡝁𡣒𡣒𡦚𡩆𡷽𢆚𢆞𢆬𢆬𢈠𢊳𢐌𢑤𢑧𢖗𢣱𢣱𢧧𢳮𢷜𢷜𢿫𣏮𣓺𣔩𣗞𣗥𣗥𣗧𣙈𣙹𣚯𣜋𣝝𣝞𣝬𣝬𣝮𣠆𣠆𣠆𣦚𣫎𣭴𣭵𤎊𤖂𤙨𤴚𤶬𥜕𥜕𥜖𥟈𥢇𥤔𥤕𥤕𥦈𥹵𦈌𦎖𦐾𦠁𦾄𧆄𧋐𧚏𧞺𧥆𨌛𨘱𨱈𨴨𩂺𩇹𩊯𩎯𩏖𩐒𩐫𩗣𩥲𩦙𩱖𩳒𩼱𪌶𪐓𪐓𪘜𪲥𪲸𪲿𫇎𫇿𫉈𫊚𫑅𫑋𫑐𫑒𫗧𬂥𬃅𬃔𬃭𬃷𬃷𬄍𬅓𬆊𬆥𬒶𬓊𬛮𬟥𬢍𬣷𬨻𬩉𬴇𬹩",
 "妻": "凄啛悽捿棲淒緀萋褄郪霋鶈㼮䃀𠉯𠬎𦪱𧤳𨧬𨹷𨿩𩸸𪗍𪥼𫅆𫋂𫌿𬐢",
 "爭": "凈崢掙棦淨箏靜𠎈𠬉𠲜𡸵𢏰𤔷𥺲𦓺𦱊𦽰𧬦𨌢𨘱𨛰𨲌𩓞𩗲𪟐𪢛𪬭𪰭𪸾𪺓𪺗𫐭𬋨",
 "金": "凎唫崟崯惍捦欽淦淾琻碒菳蓥趛釓釔釕釖釗釘釙釚釛針釞釟釠釢釣釤釥釦釧釨釩釪釫釬釭釮釯釰釱釲釳釴釵釶釷釸釹釺釻釼釽釾釿鈀鈁鈂鈃鈄鈅鈆鈇鈈鈉鈊鈋鈌鈍鈎鈏鈐鈑鈒鈓鈔鈕鈖鈗鈘鈙鈚鈛鈜鈝鈞鈟鈠鈡鈢鈣鈤鈥鈦鈧鈨鈩鈪鈫鈬鈭鈮鈯鈰鈱鈲鈳鈴鈵鈶鈷鈸鈹鈺鈼鈽鈾鈿鉀鉁鉂鉃鉄鉅鉆鉇鉈鉉鉊鉋鉌鉍鉎鉏鉐鉑鉒鉔鉕鉖鉗鉘鉙鉚鉛鉜鉝鉞鉟鉠鉡鉢鉣鉤鉥鉦鉧鉩鉪鉫鉬鉭鉮鉯鉰鉱鉲鉳鉵鉶鉷鉸鉹鉺鉻鉼鉽鉾鉿銀銁銂銃銄銅銆銇銈銉銊銋銌銍銎銏銐銑銒銓銔銕銖銗銘銙銚銛銜銝銞銟銠銡銢銣銤銥銦銧銨銩銪銫銬銮銰銱銲銳銴銵銶銷銸銹銺銻銼銽銾銿鋀鋁鋂鋃鋅鋆鋇鋈鋉鋊鋋鋌鋍鋎鋏鋐鋑鋒鋓鋔鋕鋖鋗鋘鋙鋚鋛鋜鋝鋞鋠鋡鋢鋣鋤鋥鋦鋧鋨鋩鋪鋫鋬鋭鋮鋯鋰鋱鋲鋳鋴鋵鋶鋷鋸鋹鋺鋻鋼鋽鋾鋿錀錁錂錃錄錅錆錇錈錉錊錋錌錍錎錏錐錑錒錓錔錕錖錗錘錙錚錛錜錝錞錟錠錡錢錣錤錥錦錧錨錩錪錫錬錭錮錯錰錱録錳錴錵錶錷錸錹錺錻錼錽錾錿鍁鍂鍂鍃鍄鍅鍆鍇鍈鍉鍊鍋鍌鍍鍎鍏鍐鍑鍒鍓鍔鍕鍖鍗鍘鍙鍚鍛鍜鍝鍞鍟鍠鍡鍢鍣鍤鍥鍦鍧鍨鍩鍪鍫鍬鍭鍮鍯鍰鍱鍲鍴鍵鍶鍷鍸鍹鍺鍻鍼鍽鍾鍿鎀鎁鎂鎃鎄鎅鎆鎇鎈鎉鎊鎋鎌鎍鎎鎏鎐鎑鎒鎓鎔鎕鎗鎘鎙鎚鎛鎜鎝鎞鎟鎠鎡鎢鎤鎥鎦鎧鎨鎩鎪鎫鎬鎭鎮鎯鎰鎱鎲鎳鎴鎵鎶鎷鎸鎹鎺鎻鎼鎽鎾鎿鏀鏁鏂鏃鏄鏅鏆鏇鏈鏉鏊鏋鏌鏍鏎鏏鏐鏑鏒鏓鏔鏕鏖鏗鏘鏙鏚鏛鏜鏝鏞鏟鏠鏡鏢鏣鏤鏥鏦鏨鏩鏪鏫鏬鏭鏮鏯鏰鏱鏳鏴鏵鏶鏷鏸鏹鏺鏻鏼鏽鏾鏿鐀鐁鐂鐃鐄鐅鐆鐇鐈鐉鐊鐋鐌鐍鐎鐏鐑鐒鐓鐔鐕鐖鐗鐘鐙鐚鐛鐜鐝鐞鐟鐠鐡鐢鐣鐤鐥鐦鐧鐨鐩鐪鐫鐬鐭鐮鐯鐰鐱鐲鐳鐴鐶鐷鐸鐹鐺鐻鐼鐽鐾鐿鑀鑁鑂鑃鑄鑅鑆鑇鑈鑉鑊鑋鑌鑍鑎鑏鑐鑑鑓鑔鑕鑖鑗鑘鑙鑚鑛鑜鑝鑞鑟鑠鑡鑢鑣鑤鑥鑦鑧鑨鑩鑪鑫鑬鑭鑮鑯鑰鑱鑲鑳鑴鑵鑶鑷鑸鑹鑺鑻鑼鑽鑾钀钁钂钃钄顉鵭㕋㵚㾣䋮䘳䤛䤝䤞䤟䤠䤡䤢䤣䤤䤥䤦䤧䤨䤩䤪䤫䤬䤭䤮䤯䤰䤱䤲䤳䤴䤵䤶䤷䤸䤹䤺䤼䤽䤾䤿䥀䥁䥂䥃䥄䥅䥆䥇䥈䥉䥊䥋䥌䥍䥎䥏䥐䥑䥒䥓䥔䥕䥖䥗䥘䥙䥚䥛䥜䥝䥞䥟䥠䥡䥢䥣䥤䥥䥦䥧䥨䥩䥫䥬䥭䥮䥯䥰䥱䥲䥳䥴䥵䥶䥷䥸䥹䦦𠊄𠓓𠟛𠥟𠪒𠫎𠼫𡄘𡅈𡙯𡫷𡫿𡬔𡻿𡾾𢉅𢤌𢥍𢹁𣔋𣛞𣤪𣿿𤄉𤒸𤓍𥃅𥇶𥟨𥦨𥨓𥯀𥴏𥷍𥷢𥺻𦑕𦗦𦘉𦡎𦹦𦿻𧁅𧁆𧂖𧄭𧅒𧟴𧸶𨤽𨤿𨥁𨥂𨥃𨥅𨥆𨥇𨥈𨥉𨥊𨥋𨥌𨥍𨥎𨥏𨥐𨥑𨥒𨥓𨥔𨥕𨥖𨥗𨥙𨥚𨥛𨥜𨥞𨥟𨥠𨥡𨥢𨥣𨥤𨥥𨥦𨥧𨥨𨥩𨥪𨥫𨥬𨥭𨥯𨥰𨥱𨥲𨥴𨥵𨥶𨥸𨥹𨥺𨥻𨥼𨥽𨥾𨥿𨦀𨦁𨦂𨦃𨦄𨦅𨦇𨦈𨦉𨦊𨦌𨦍𨦎𨦏𨦐𨦑𨦒𨦓𨦔𨦕𨦖𨦗𨦘𨦙𨦚𨦛𨦜𨦝𨦞𨦟𨦠𨦡𨦢𨦣𨦤𨦥𨦧𨦨𨦩𨦪𨦫𨦬𨦭𨦮𨦯𨦰𨦲𨦳𨦴𨦵𨦶𨦷𨦸𨦹𨦺𨦻𨦼𨦽𨦾𨦿𨧀𨧁𨧂𨧃𨧄𨧅𨧆𨧇𨧈𨧊𨧋𨧌𨧍𨧎𨧏𨧐𨧑𨧒𨧓𨧔𨧕𨧖𨧗𨧘𨧙𨧚𨧛𨧜𨧝𨧞𨧟𨧠𨧡𨧢𨧣𨧤𨧦𨧧𨧨𨧩𨧪𨧫𨧬𨧭𨧮𨧯𨧰𨧱𨧲𨧳𨧴𨧵𨧶𨧷𨧹𨧺𨧻𨧼𨧽𨧾𨧿𨨀𨨁𨨂𨨃𨨄𨨅𨨆𨨇𨨈𨨉𨨊𨨋𨨌𨨍𨨎𨨏𨨐𨨑𨨒𨨓𨨔𨨕𨨖𨨗𨨘𨨙𨨚𨨛𨨜𨨝𨨞𨨟𨨠𨨡𨨢𨨣𨨤𨨥𨨦𨨧𨨨𨨩𨨪𨨫𨨬𨨭𨨮𨨯𨨰𨨱𨨲𨨳𨨵𨨶𨨷𨨸𨨹𨨺𨨻𨨼𨨽𨨾𨨿𨩀𨩁𨩂𨩄𨩅𨩆𨩇𨩈𨩉𨩊𨩋𨩌𨩍𨩏𨩐𨩑𨩒𨩓𨩔𨩕𨩖𨩗𨩘𨩙𨩚𨩛𨩜𨩝𨩞𨩟𨩡𨩢𨩤𨩥𨩦𨩧𨩨𨩩𨩪𨩫𨩬𨩭𨩮𨩯𨩱𨩲𨩴𨩵𨩶𨩷𨩸𨩹𨩺𨩻𨩼𨩽𨩾𨩿𨪀𨪁𨪂𨪃𨪄𨪆𨪇𨪈𨪉𨪊𨪋𨪌𨪍𨪎𨪏𨪓𨪔𨪕𨪗𨪘𨪚𨪛𨪜𨪝𨪞𨪟𨪠𨪡𨪢𨪣𨪤𨪥𨪦𨪧𨪨𨪩𨪪𨪫𨪬𨪭𨪮𨪯𨪰𨪱𨪲𨪳𨪴𨪶𨪷𨪸𨪹𨪻𨪼𨪽𨪾𨪿𨫀𨫁𨫂𨫃𨫄𨫅𨫆𨫇𨫈𨫉𨫊𨫋𨫌𨫍𨫎𨫏𨫑𨫒𨫓𨫕𨫖𨫗𨫘𨫙𨫚𨫛𨫜𨫝𨫞𨫟𨫡𨫢𨫣𨫤𨫥𨫦𨫨𨫩𨫬𨫭𨫮𨫯𨫰𨫱𨫲𨫳𨫴𨫵𨫶𨫷𨫸𨫺𨫻𨫼𨫽𨫾𨫿𨬀𨬁𨬂𨬃𨬄𨬅𨬆𨬇𨬈𨬉𨬊𨬋𨬌𨬍𨬎𨬏𨬐𨬑𨬒𨬓𨬔𨬕𨬖𨬗𨬘𨬙𨬚𨬛𨬜𨬝𨬞𨬟𨬠𨬡𨬢𨬤𨬥𨬦𨬧𨬨𨬩𨬪𨬫𨬬𨬭𨬮𨬯𨬰𨬱𨬲𨬳𨬴𨬵𨬶𨬷𨬸𨬹𨬺𨬻𨬼𨬽𨬾𨬿𨭀𨭁𨭃𨭅𨭆𨭇𨭈𨭉𨭊𨭋𨭌𨭎𨭏𨭐𨭑𨭒𨭓𨭕𨭖𨭗𨭘𨭙𨭚𨭜𨭝𨭞𨭟𨭠𨭡𨭢𨭣𨭤𨭥𨭦𨭧𨭨𨭪𨭫𨭬𨭮𨭯𨭱𨭲𨭳𨭴𨭵𨭶𨭸𨭹𨭺𨭻𨭼𨭽𨭾𨭿𨮀𨮁𨮂𨮃𨮄𨮅𨮇𨮈𨮉𨮊𨮋𨮌𨮍𨮎𨮏𨮐𨮑𨮒𨮓𨮔𨮕𨮖𨮗𨮙𨮚𨮛𨮜𨮝𨮞𨮠𨮡𨮢𨮣𨮤𨮥𨮦𨮨𨮩𨮪𨮫𨮭𨮮𨮯𨮰𨮱𨮲𨮳𨮴𨮵𨮶𨮷𨮸𨮹𨮺𨮻𨮼𨮽𨮾𨮿𨯀𨯁𨯂𨯃𨯄𨯅𨯆𨯇𨯈𨯉𨯊𨯋𨯍𨯏𨯐𨯑𨯒𨯓𨯔𨯕𨯖𨯗𨯘𨯙𨯛𨯜𨯝𨯞𨯟𨯡𨯢𨯣𨯤𨯥𨯧𨯨𨯩𨯪𨯫𨯬𨯭𨯮𨯯𨯰𨯱𨯲𨯳𨯴𨯵𨯶𨯷𨯸𨯹𨯺𨯻𨯼𨯽𨯾𨯿𨰀𨰁𨰂𨰃𨰄𨰅𨰆𨰇𨰈𨰉𨰊𨰋𨰌𨰍𨰎𨰏𨰐𨰑𨰒𨰓𨰔𨰕𨰖𨰗𨰘𨰙𨰚𨰛𨰜𨰝𨰟𨰠𨰡𨰢𨰣𨰤𨰥𨰦𨰧𨰨𨰩𨰪𨰫𨰬𨰭𨰮𨰯𨰰𨰱𨰳𨰴𨰵𨰶𨰷𨰸𨰺𨰻𨰻𨰻𨰻𨰼𨰼𨰽𨼅𩔟𩕅𩗩𩙗𩰔𩸱𪑙𪦢𪯧𪷙𫅇𫆤𫋆𫍀𫒆𫒇𫒈𫒉𫒊𫒋𫒌𫒍𫒎𫒏𫒐𫒑𫒒𫒓𫒔𫒕𫒖𫒗𫒘𫒙𫒚𫒛𫒜𫒝𫒞𫒟𫒠𫒢𫒣𫒤𫒥𫒦𫒧𫒨𫒩𫒪𫒫𫒬𫒭𫒮𫒯𫒰𫒱𫒲𫒳𫒴𫒵𫒶𫒷𫒸𫒹𫒺𫒻𫒼𫒽𫒾𫒿𫓀𫓁𫓂𫓃𫓄𫓆𫓇𫓉𫓊𫓋𫓌𫓍𫓎𫓏𫓐𫓑𫓒𫓓𫓔𫓕𫓖𫓗𫓘𫓙𫓚𫓛𫓜𫓝𫓞𫓟𫓠𫓡𫓢𫓣𫓤𫟰𫟱鏹鐕𫭾𫰾𫲧𫸀𬈹𬊝𬫂𬫃𬫄𬫅𬫆𬫇𬫈𬫉𬫊𬫋𬫌𬫍𬫎𬫏𬫐𬫑𬫒𬫓𬫔𬫕𬫖𬫗𬫘𬫙𬫚𬫛𬫜𬫝𬫞𬫟𬫠𬫡𬫢𬫣𬫤𬫥𬫦𬫧𬫨𬫩𬫪𬫫𬫬𬫭𬫮𬫯𬫰𬫱𬫲𬫳𬫴𬫵𬫶𬫷𬫸𬫹𬫺𬫻𬫼𬫽𬫾𬫿𬬀𬬁𬬂𬬄𬬅𬬆𬬇𬬈𬬉𬬊𬬋𬬍𬬎𬬏𬬑𬬒𬬓𬬔𬬕𬬖𬬗𬬘𬬙𬬚𬬛𬬜𬬝𬬞𬬟𬬠𬬡𬬢𬬣𬬤𬬥𬬦𬯉",
 "咸": "减喊嵅感椷減煘瑊碱箴緘缄葴觱諴輱醎鍼顑鰔鹹麙黬㛾㨔㰹㺂䁍䖗䶠䶢𠁝𠊭𠔺𡞣𡢳𡫴𡫹𡯽𢜩𢨟𣁀𣙤𣜕𣤭𣽦𤊸𤜁𥠆𥻇𦑘𦧩𦩢𦸮𧁺𧇱𧍧𧛡𧥙𧥙𧥚𧥚𧭶𧯃𧾔𨃂𩕠𩝈𩤥𩮏𪂶𪉳𪔩𫍯𬐨𬺍",
 "垔": "凐歅湮煙甄禋緸諲鄄闉陻黫㖶㢾㷑䃌䓰䗎䚈𡇽𡨾𡫈𡬵𡲙𢌩𣱐𣱑𤚕𦈑𦝪𧛑𧹬𨕅𨶵𩘔𩧾𪃋𪬉𫴄𬤇𬪭𬮱",
 "奏": "凑揍楱湊腠輳辏𣉅𥯪𦦅𧩻𧱪𨂡𨨯𩹀𪃆𪉮𬍴𬭟𬸷",
 "豈": "凒凱剴嵦愷敱敳暟榿溰獃皚磑螘覬鎧闓隑顗颽㜐㨟㱯䁗䅱䐩䔇䠽䭓䱺䶣𠹛𡳂𣪱𤅐𤅐𤍈𤘑𤠲𤧸𤸳𥏸𥪪𥻶𦒀𦩴𧔮𧪚𧯺𧰄𧰙𧽊𨕰𨢉𩀡𩄟𩘥𩥉𩮖𫣅𫷋𬤹",
 "冥": "凕塓嫇幎慏暝榠溟熐猽瞑蓂螟覭鄍鼆㟰㨠䄙䈿䏃䒌䫤𠋶𢳡𣩆𤣘𥌏𥻩𦃼𧇻𧔲𧜀𧱴𨎁𨢎𩈹𪒄𫶍𫸏𬂊𬢒",
 "准": "凖㕠𤌞𪳙",
 "斯": "凘厮嘶廝撕澌燍簛蟖蟴鐁㒋㯕㽄䔮䡳䲉𡡒𢠹𣚄𣤘𣩠𤩐𤮓𤺊𥐀𥕶𥼤𦠭𧝤𧬊𧬜𨮭𩅰𪆁𪆗𪖉𫗲𬲛",
 "睪": "凙圛嬕嶧懌擇斁曎檡歝殬澤燡睾礋繹蠌襗譯醳釋鐸驛鸅㘁䁺䆁䐾䕉䦴䭞𠓋𠪯𢋇𢍰𤑹𤢕𤢟𤻂𥜃𥼶𦒡𦒢𦔥𦡇𨆅𨤟𨼸𩁇𩍜𩏪𩼓𪫙𪼢𫅌𫾟",
 "禀": "凛廪𪷤𫄊𫉿𫑾𫲃𬆸",
 "稟": "凜廩懍檁澟燣癛𠏟𠘡𡀫𡄁𡗋𢀮𢶸𣱭𤢤𤯑𥋶𦡣𦢵𦼹𨎹𨮍𩆐𩇆𩼤𬪙𬷶𬸴",
 "熈": "凞",
 "任": "凭姙恁拰栠栣秹絍荏袵賃赁銋餁鵀㤛㳝㶵䇮䋕䛘䣸𠄶𠲉𠲏𠶉𡜟𢀫𢂧𤇲𤞘𥆂𥵎𦚮𦣨𧙨𨉃𨠲𨿂𨿃𩄸𩷀𪀼𫏊𫕤𫶭𬓧𬣯𬸊",
 "馮": "凴憑㵗𣰜𥂳𥖬𦡻𦿅𨆱𨝭𪅯",
 "屮": "出妛芔芔芔茻茻茻茻雟㞢㞷㪿㪿𠃈𠃈𠃈𠔖𠔖𠔱𠔱𠨲𠬢𠭆𡉚𡔷𡥺𡫾𡫾𡱞𡴄𡴟𡴪𡴬𡴬𡹍𢄄𢗍𢝎𢢟𣂹𣊨𣊨𣊨𣍮𣑼𣑼𣢑𣵭𤘸𤙍𤜿𤰫𤵟𥀋𦐉𦚃𦱗𦸹𧁇𧁇𧁇𧁇𧁇𧃎𧊜𧏬𧙵𧥳𧯛𧷷𨍔𨎆𨎆𨕬𨞍𨽫𨽫𨽫𩏾𩕻𩙏𫦠𫳏𫵯𫵰𬂦𬔝",
 "亟": "凾極殛㥛䓧䩯𡹪𢉗𢔔𣶬𣷉𣾎𤊅𤷉𥈂𦎢𧛘𧩦𩏊𫇐𫽄𬍪𬤅𬨲𬫡",
 "气": "刏忥忾氕氖気氙氚氛氜氝氞氟氠氡氢氣氤氥氦氧氨氩氪氫氬氭氮氯氰氱氲氳汽芞靔㐹㔕㡮㧉㪂㰟㲴㲵㲶㲷䏗𣅠𣏙𣒻𣱕𣱖𣱗𣱘𣱙𣱚𣱛𣱜𣱝𣱞𣱟𣱠𣱡𣱢𣱣𣱤𣱥𣱦𣱧𣱨𣱩𣱫𣱭𣱮𣱰𤴸𤽍𥙰𥝬𥤶𧉁𨕀𨗵𩛹𪌇𪗟𪨦𪬣𪵣𪵤𪵥𪵦𪵧𪸕𫊨㔕𬇏𬇐𬇑𬇒𬇓",
 "丹": "刐彤旃枬栴玬砃蚒袇雘鴅㥖㳩䒟䢷䵊𠂄𠣝𡔤𡛓𡜫𡵕𢩀𢭛𣐠𣪂𣲥𤘪𤯞𤿔𥘘𥙡𥝳𥫼𦕃𧿜𨈝𨱪𩕇𩬅𪗤𪚘𪚫𪲌𫛝𫢌𫨳𫼘𬉾",
 "开": "刑咞妍岍并形枅汧烎研笄茾蚈訮豜趼邢鈃钘锎開雃鳽㓫㕃㰢㼛㿼䀘䄯䍾䙹䢎䵤𠆻𠇋𠤡𠾝𡐪𢆚𢇩𢍫𢓄𣂖𣢴𣥎𤣿𦈨𦸟𧗦𧙒𧲨𨊻𨐆𨕧𨘊𨚆𨡶𨨊𨴂𨶘𨸦𩓍𩝂𪂍𪂍𪊑𪎙𪔾𪗛𫔭𫛚咞𩒖𬌳𬴧",
 "𠚪": "刕",
 "歹": "列夙死歼歽歾殀殁殂殃殄殅殆殇殈殉殊残殌殍殎殏殐殑殒殓殔殕殖殗殘殙殚殛殜殝殞殟殠殡殢殣殥殦殧殨殩殪殫殬殭殮殯殰殱殲肂薚飱㱙㱛㱛㱞㱟㱠㱡㱢㱣㱤㱥㱦㱧㱨㱩㱪㱫㱬㱭㱮㱯㱰㱱㱲㱳㱴㱵㱶㱸㱹㱺㱻䬸𠯪𠸅𡂍𡇕𡎗𡑙𡛃𡧒𢁳𢍗𢗚𢪰𢱵𢵍𢵍𣍌𣍌𣍌𣍴𣖊𣟃𣦹𣦺𣦽𣦿𣧀𣧁𣧂𣧃𣧄𣧅𣧆𣧇𣧈𣧉𣧊𣧋𣧌𣧍𣧎𣧏𣧐𣧑𣧒𣧓𣧔𣧖𣧗𣧘𣧙𣧛𣧜𣧝𣧞𣧟𣧠𣧡𣧢𣧣𣧤𣧥𣧦𣧩𣧪𣧫𣧬𣧭𣧯𣧰𣧱𣧲𣧳𣧴𣧵𣧷𣧹𣧻𣧼𣧽𣧾𣧿𣨁𣨂𣨃𣨅𣨇𣨈𣨉𣨊𣨋𣨌𣨍𣨎𣨐𣨒𣨓𣨔𣨕𣨗𣨘𣨙𣨛𣨜𣨝𣨞𣨟𣨠𣨡𣨢𣨣𣨤𣨥𣨧𣨨𣨩𣨪𣨫𣨬𣨮𣨯𣨱𣨲𣨳𣨴𣨵𣨶𣨸𣨸𣨹𣨺𣨼𣨾𣨿𣩀𣩃𣩄𣩅𣩆𣩈𣩊𣩋𣩌𣩍𣩎𣩏𣩐𣩑𣩒𣩓𣩔𣩗𣩘𣩙𣩛𣩜𣩝𣩞𣩟𣩠𣩡𣩣𣩤𣩥𣩦𣩧𣩨𣩩𣩪𣩫𣩮𣩰𣩲𣩵𣩶𣩹𣩼𣩽𣩿𣪀𣪁𣱚𣲠𣷊𣸟𣸶𤋴𤢋𤷋𥕈𥹏𥼒𦁘𦍙𦯢𦰸𦹠𦻰𧍼𧛵𧺰𨉙𨉧𨑰𨔭𨚌𨩡𩃴𩎳𩐁𩖉𩘛𩝖𩹒𪗈𪚗𪞧𪵀𪵁𪵂𪵃𪵄𪵅𪵆𪵇𪽨𫞔殟𫯹𬆑𬆔𬆕𬆚𬆛𬆝𬒟𬳜",
 "贝": "则呗员唢婴婴屃帧恻溅狈琐罂罂蒇贞贠贡财责贤败账货质贩贪贫贬购贮贯贰贱贲贳贴贶贷费贺贻贼贽贿赀赁赂赃资赅赆赇赈赉赊赋赌赍赎赐赑赑赑赒赓赔赕赖赗赘赙赚赛赝赞赟赠赡赢赣钡锁㗷㺆㺙䞌䞍䞎䞏𣽷𤎺𤾀𥧂𧹑𧹓𧹔𧹕𧹖𧹗𩯒𪠀𪥠𪥠𪥠𪱷𫎦𫎧𫎨𫎩𫎪𫎫𫝦𫞥𫦁𫪑𫼶𫿂𬂉𬇙𬢯𬢯𬥳𬥴𬥵𬥶𬥷𬥸𬥹𬥺𬥻𬥼𬥽𬥾𬥿𬦀𬦥𬮂𬸕𬸕𬹳",
 "冈": "刚㧏㭎䋄𦊕𦊖𧈿𨊾𨳠𫇪𫤭𫩚𬚰𬵼",
 "衤": "初补衦衧衩衪衫衬衭衯衱衲衳衴衵衶衸衹衻衼衽衿袀袂袄袆袇袉袊袍袎袏袐袑袒袓袔袕袖袗袘袙袚袛袜袝袟袡袢袣袥袦袧袩袪被袮袯袱袳袴袵袶袷袸袹袺袻袼袽袾袿裀裃裄裆裇裈裉裋裌裍裎裐裑裓裕裖裗裙補裞裡裢裣裤裥裧裨裩裪裫裬裭裮裯裰裱裲裶裷裸裺裼裾裿褀褂褃褄褅褆複褈褉褊褋褌褍褐褑褓褔褕褖褗褘褙褚褛褝褞褟褠褡褣褤褥褦褨褪褫褬褯褲褳褴褵褶褷褸褹褼褾褿襀襁襂襅襆襇襈襉襊襋襌襍襎襏襐襑襒襓襔襕襖襗襘襙襚襛襜襝襟襠襡襢襣襤襥襦襧襨襩襪襫襬襭襮襯襰襱襳襴襵襶襷襸襹襺襻襼襽𫋲𫋳𫋵𫋷𫋸𫋹𫋺𫋻𫋼𫋽𫋾𫋿𫌀𫌁𫌂𫌃𫌄𫌅𫌆𫌇𫌈𫌉𫌊𫌋𫌌𫌐𫌑𫌒𫌓𫌔𫌕𫌖𫌗𫌘𫌙𬡂𬡃𬡅𬡆𬡈𬡉𬡊𬡋𬡍𬡎𬡒𬡔𬡕𬡖𬡘𬡙𬡜𬡞𬡟𬡠𬡢𬡣𬡥𬡦𬡧𬡨𬡪𬡬𬡮𬡯𬡰𬡱𬡳𬡴𬡵𬡶𬡷",
 "册": "删姗栅珊粣跚銏㹪𡊢𢦫𣆑𣑨𥣃𥵋𧵡𩒄𪨪𪭪𫁠𫚷𫣮𫵡𬅡𬋶𬎲𬕉𬨡",
 "𠮠": "別",
 "禾": "利咊和囷姀委季嵆嵇柇盉禿秀私秂秃秄秅秆秇秈秊秋秌种秎秏秐科秒秓秔秕秖秗秘秙秚秛秜秝秝秞租秠秡秢秣秤秥秧秨秩秪秫秬秭秮积秱秲秳秴秵秶秷秸秹秺移秼秽秾秿稀稁稂稃稄稅稆稇稈稉稊程稌稍税稏稐稑稒稓稔稕稖稗稘稙稚稛稜稝稞稟稠稡稢稣稤稥稦稧稨稩稪稫稬稭種稯稰稱稲稳稴稵稶稷稸稹稺稻稼稽稾稿穁穂穃穄穅穆穇穈穉穊穋穌積穎穏穐穑穒穓穔穕穖穗穘穙穚穛穜穝穞穟穠穡穢穣穤穥穦穧穪穫穬穭穮穯穰穱穲穳藳蘓褎訸諬酥鉌鑙鞂颖香麇龝龢㓿㕿㛷㟀㥻㴕㷏㿆䄦䄧䄨䄩䄪䄫䄬䄭䄮䄯䄰䄱䄲䄳䄴䄵䄶䄷䄸䄹䄺䄻䄼䄽䄾䄿䅀䅁䅂䅃䅄䅅䅆䅈䅉䅊䅋䅌䅍䅎䅏䅐䅑䅒䅓䅔䅕䅖䅗䅘䅙䅚䅛䅜䅝䅟䅠䅡䅢䅣䅤䅥䅦䅧䅨䅩䅪䅫䅬䅭䅮䅯䅰䅱䅲䅳䅴䅵䅶䅷䅸䅹䅺䅻䅼䅽䅾䅿䆀䆁䆂䆃䆄䆅䆆䆇䆈䆉䆊䆋䆌䆍䆎䆏䒩䢤𠚉𠞙𠞜𠟲𠪁𠰓𠲆𠳶𠷘𡑬𡙾𡝟𡩸𡪳𡫵𡬟𡲷𡲹𢇲𢊸𢋉𢋟𢒳𢘳𢝥𢝲𢣊𢧣𢧺𢨡𢱀𢲇𢹀𣍩𣕰𣛽𣣅𣫽𣲲𣹌𣿜𤂰𤇕𤇫𤐏𤖱𤛺𤤤𤱛𤱜𤵥𤹋𥝍𥝎𥝏𥝐𥝑𥝒𥝓𥝔𥝖𥝗𥝘𥝙𥝚𥝛𥝜𥝝𥝞𥝟𥝠𥝡𥝣𥝤𥝥𥝦𥝧𥝨𥝩𥝪𥝫𥝬𥝭𥝮𥝰𥝱𥝲𥝳𥝴𥝵𥝶𥝷𥝸𥝹𥝺𥝻𥝼𥝽𥝾𥝿𥞀𥞁𥞂𥞃𥞄𥞅𥞆𥞇𥞈𥞉𥞊𥞋𥞌𥞍𥞎𥞏𥞐𥞑𥞒𥞓𥞔𥞕𥞖𥞘𥞙𥞚𥞛𥞝𥞞𥞟𥞠𥞡𥞢𥞥𥞦𥞧𥞨𥞩𥞪𥞫𥞬𥞭𥞮𥞯𥞰𥞱𥞲𥞳𥞴𥞵𥞶𥞷𥞺𥞻𥞼𥞽𥞾𥟀𥟁𥟂𥟃𥟄𥟆𥟇𥟈𥟊𥟋𥟌𥟎𥟏𥟐𥟑𥟒𥟓𥟔𥟕𥟗𥟘𥟙𥟚𥟛𥟜𥟝𥟞𥟟𥟠𥟣𥟤𥟥𥟧𥟨𥟩𥟪𥟫𥟬𥟭𥟮𥟯𥟰𥟱𥟲𥟳𥟴𥟵𥟶𥟷𥟸𥟺𥟼𥟽𥟾𥠀𥠁𥠂𥠃𥠄𥠆𥠇𥠈𥠉𥠊𥠋𥠌𥠍𥠎𥠏𥠐𥠒𥠓𥠖𥠗𥠘𥠙𥠚𥠛𥠜𥠝𥠟𥠠𥠡𥠢𥠣𥠤𥠥𥠦𥠧𥠩𥠪𥠫𥠭𥠮𥠯𥠰𥠲𥠳𥠴𥠵𥠶𥠷𥠸𥠹𥠺𥠽𥠾𥠿𥡅𥡆𥡈𥡊𥡋𥡌𥡍𥡎𥡏𥡐𥡑𥡒𥡓𥡔𥡕𥡖𥡗𥡘𥡚𥡛𥡜𥡟𥡠𥡢𥡣𥡤𥡦𥡧𥡩𥡪𥡫𥡬𥡯𥡰𥡱𥡲𥡳𥡴𥡵𥡶𥡷𥡸𥡹𥡺𥡻𥡽𥡾𥡿𥢀𥢂𥢃𥢄𥢇𥢈𥢉𥢊𥢋𥢌𥢍𥢎𥢏𥢐𥢑𥢒𥢓𥢔𥢕𥢖𥢖𥢗𥢘𥢙𥢚𥢛𥢜𥢝𥢞𥢟𥢠𥢡𥢢𥢣𥢤𥢥𥢦𥢧𥢨𥢩𥢪𥢫𥢬𥢭𥢯𥢰𥢱𥢳𥢴𥢵𥢶𥢷𥢸𥢻𥢼𥢽𥢾𥢿𥣀𥣁𥣂𥣃𥣃𥣄𥣅𥣆𥣆𥣇𥣈𥣊𥣋𥣌𥣍𥣎𥣐𥣑𥣒𥣓𥣔𥣕𥣖𥣗𥣘𥣙𥣚𥣛𥣜𥣝𥣝𥣞𥣡𥣢𥣣𥣦𥣩𥣪𥣫𥣬𥣭𥣮𥣯𥣱𥣲𥣲𥣴𥣵𥣶𥣷𥣹𥣺𥣼𥣽𥣾𥤀𥤁𥤂𥤄𥤅𥤆𥤇𥤈𥤉𥤋𥤌𥤍𥤎𥤏𥤐𥤑𥤓𥤔𥤕𥤕𥤖𥤗𥤘𥤙𥤚𥤛𥤜𥤝𥤞𥤟𥤠𥤡𥨽𥰂𥵠𥼄𥿘𦂏𦊘𦊜𦪹𦫌𦱐𦱜𦲦𦳫𦳽𦴙𦵒𦶫𦷏𦷑𦷙𦸸𦹞𦻽𦼁𦽧𦾫𦾰𦿀𦿨𦿺𦿽𧀅𧀖𧀚𧁃𧁨𧄆𧄗𧅈𧅨𧉷𧖲𧞒𨋟𨛲𨛻𨝟𨧭𨩂𨲚𩀒𩃻𩈒𩐖𩓵𩔏𩛵𩝂𩠨𩠼𩡄𩡍𩧒𩲷𪌗𪐺𪔁𪗉𪗮𪚼𪜰𪜱𪦘𪦣𪩈𫀧𫀨𫀩𫀪𫀫𫀬𫀭𫀮𫀯𫀰𫀱𫀲𫀳𫀴𫀵𫀶𫀷𫀸𫀹𫀺𫀻𫀼𫀽𫀾𫀿𫁀𫁁𫁂𫁃𫁄𫁆𫁇𫁈𫁉𫁏𫈂𫌍𫌚𫕙𫚴𫞷𫞸秫穀穏𫬳𫶚𬋢𬓠𬓢𬓣𬓤𬓦𬓧𬓨𬓩𬓫𬓬𬓭𬓮𬓯𬓰𬓱𬓲𬓳𬓴𬓵𬓹𬓺𬓻𬓽𬓾𬓿𬔀𬔁𬔃𬔄𬝔𬝦𬤵𬰻",
 "冊": "刪姍柵䈛𠂨𣧱𦐷𦙱𪑃",
 "另": "别拐柺㗗䤢𠔦𠬱𤵱𧊅𨀌𪜯𪡎𪸝柺𫫑𫭦",
 "戋": "刬栈残浅溅盏笺线贱践钱𣸶𥁘𪽭𫞣𬃦𬍙𬢕𬣡𬪨",
 "𢀖": "刭劲巯弪径氢泾烃痉硁经胫茎轻迳陉颈𫎭𫰛𫵸𫶲𬑏𬹭",
 "亘": "刯咺姮宣峘恒晅桓洹烜狟絙荁貆䚙䱎𠈗𠖑𠖚𠠊𠡚𠣙𡘍𡱌𡷆𢂡𢬎𤌓𥅨𥥣𥹚𦚸𧊳𧱂𧻚𩍻𩎨𩒢𩫡𩫧𩰵𩺏𪊥𪴶𪻘𪻭𪼘𫄠𫧑𬨤𬴠",
 "刅": "刱剙䘐𪲠𫿼𬂾𬃒𬔚",
 "朶": "刴尮挅跥躱㛆䑮𡶲𨦃𨹃𪜷𪸨𫩴𬆔𬎨𬚹𬱡𬹵",
 "杀": "刹弑弒殺脎铩閷𢘹𢫬𤀚𥤔𦝹𨶓𩲺𩳃𩶼𩺕𪀣𪑂𪲽𫂿𫊷𣻑𬂮𬡕𬨥𬩻𬸌",
 "朿": "刺拺敇栜棗棗棘棘洓策茦㞖㢀㭰㾊䊂䟱𠄬𠲋𡢲𢅙𢓣𢙀𢛱𢞸𢢻𢿋𣜇𣝯𣝯𣝯𣡍𣡍𣡍𣡍𣨁𤕹𤤹𤫷𤯡𥢉𥢼𥰡𦏙𦵪𦸺𧊸𧑖𧙞𧜌𧠵𧢔𧧒𧵩𧻕𨋵𨒪𨣜𨦉𩂴𩎎𩎎𩎎𩎎𩼜𪀜𪥱𪲕𪲸𫐛䔫𫸮𬃔𬅼𬊃𬝜𬝸",
 "岁": "刿哕秽翙㑕㢷𫯥𬜨𬣪",
 "朵": "剁哚挆趓跺躲㛊䒳䤪𡇙𡯦𣑫𣧷𣳼𤤸𤬾𤱧𥙨𥞛𥬲𦀉𦕰𦚩𧊶𧧨𨹄𩊜𩎫𩬻𪘉𬒋𬡖𬭆",
 "肙": "剈娟弲悁捐梋涓焆狷琄瓹睊絹绢罥蜎裐鋗鞙駽鵑鹃㘣㾓䅌䣺䧎䬼𠗓𡑅𡢩𡷡𢂱𢞈𤞣𥥾𥭞𦐽𦮻𧀎𧨜𨌉𨛡𨿔𩐪𩩐𩫘𩷫𪌭𪿇𪿠𫓶𫚼𫜓𫡻𫦪𫺴𬙿",
 "𣏂": "剎𩳘",
 "呙": "剐娲涡祸窝脶莴蜗锅㖞㶽䯄𣒌𪨹𫍩𫡬𫧯𬀥𬅥𬏮𬨨𬫚",
 "𥝢": "剓棃犂睝菞蔾錅鯬鵹黧㥎䊍䖿䴻𠡴𢮃𢾨𣮋𤭜𥟖𥣥𦺙𧑇𧚩𨛫𨬏𨿯𩦄𩦅𩸢𩻳𪍆𪐅𪺳𫀺𫚞",
 "易": "剔惕惖掦敡晹焬痬睗緆舓蜴裼賜赐踢逷錫锡鬄鯣鶍㑥㛫㻛䓪䯜𠖞𠴭𡀻𡱿𡸑𡾎𢃡𢒗𢞫𢡕𢾙𣂨𣈱𣉝𣉠𣉷𣊷𣊷𣋇𣌒𣓾𣨟𣱢𣽷𤂞𤃄𤓑𤟍𥂺𥍴𥓘𥚯𥟘𥪔𥮬𦓻𦦸𧩎𧼮𨎗𨲎𨽑𩃮𩋌𩗺𪎥𪎧𪕩𪙶𪱁𫀒𫨭𫶁𫾻𬀺𬁏𬊙𬊛𬙢𬪉𬯆",
 "岡": "剛崗掆棡焵碙綱罁鋼㟠𠵹𢜟𣷣𤦇𤭛𦱌𨹽𨿺𩸒𫤷𫷆𬏲𬠐𬳭𬴰",
 "彔": "剝淥祿綠錄龣㯟䘵𠷍𢅞𢑾𢒚𢮑𤷚𤽺𤿴𥪋𦼋𧌍𧨹𨌠𨮦𩓪𪋵𪋵𪍄𪑔𬙐𬺠",
 "斉": "剤済緕㑪㨈𦄴𦜝𨂋𪯼𫊢𫕅𫡀𫷙𬰁",
 "录": "剥娽椂氯渌琭盝睩碌禄箓粶緑绿菉觮趢逯邍醁録騄鵦㖨㟤㪖㫽䎑䎼䐂䚄䟿䩮䰁䱚𡍖𡸮𤟘𥵁𥼙𦋏𦋔𨲒𫘧𬆚",
 "砉": "剨湱騞𢝇𬴃",
 "乘": "剩嵊溗騬𢟊𢾽𤳁𦟇𦶝𧪝𨍱𨝄𪳕𬟯𬨾",
 "度": "剫喥渡踱鍍镀䩲𡍨𢜬𢱋𢾅𣨲𤚡𥯖𦂀𦳔𧩧𧶴𨍏𪃒𪪪𪳁𪳿𪻿𫛻𫱩𬤏𬵟",
 "咼": "剮卨喎媧旤楇歄渦煱猧瘑碢禍窩緺腡萵蝸諣踻過鍋騧㢐䈑䫚䯞𠊰𠧅𠷏𠹬𡐫𡖿𡥾𡹬𡺩𢝸𢢸𢧘𢰸𣁘𣂄𣄸𣨱𣨷𤧗𤬋𥂡𥈓𥠁𥨵𥨸𥶤𧎏𧷴𨍋𨗲𨗷𨵧𩝄𩮑𩹢𪃀𪍌𪎩𪙃𪬋𫊇𫑌𫑑𫬢𫵭𬩕𬩟𬩧",
 "乗": "剰𡹴𢜼𢾦",
 "害": "割嗐搳瞎磍縖螛豁轄辖鎋鶷㝬㪡㮫㲅𠢆𡟲𡫲𡫴𡮞𢞐𢞩𢻜𣣶𥎆𥰶𦟈𦤬𦧮𦵯𧜅𧯆𨝃𩏓𩡔𩥌𩪃𩮝𪙏𫜯𫳶𫴓𫴙𬘻𬣁𬭪",
 "荅": "剳匒嗒搭榙溚瘩褡鎝鞳㜓㟷䌋𡈐𢟉𣩾𣯈𣯚𤨑𥔽𦈘𦖿𦞂𧀟𨃚𨱏𨶀𨸉𨻇𩁮𩥠𩺗𫋓𬢿",
 "産": "剷摌滻簅虄諺鏟隡㦃㯆𤯿𫤢𬂑",
 "𠩺": "剺嫠孷斄氂漦犛釐𠭰𢄡𢟤𢿂𢿍𣁛𣁟𣘬𣯷𪅗𬎕𬥦",
 "巢": "剿勦摷樔漅璅窼繅缫罺轈鄛鏁隟㑿㺐䜈䟁䲃𠞰𠻥𡏮𡡊𡻝𢀊𢀋𢀌𢀌𣝞𣩓𤍒𤑗𥕘𥲀𦗔𦟳𦸛𧄩𧈈𧈊𧑀𧘀𧷣𨄓𨢪𩍀𩏙𩫥𪅕𪍨𬨓𬭲𬷰",
 "厥": "劂噘嶡嶥憠撅橛橜獗蕨蟨蟩蹶蹷鐝镢鱖鳜鷢㙭㜧㵐䙠𠎮𠢤𠢭𡡕𢅅𢴺𤛦𤺤𥕲𥕳𦠑𦪘𧂱𧽸𨬐𩀾𩦒𪆙",
 "畫": "劃嫿澅繣㗲㦎㩇䐸𢄶𣃂𣛛𥊮𦘣𦘧𨐶𨶬𩻽",
 "答": "劄撘譗㗳㙮㯚㲮𠍹𠢡𡼪𣽛𤏧𤡿𤺥𥰊𦗧𧝡𨅞𨣏𩍈𩞰𪾾𫓌𬎐𬖸",
 "蜀": "劅噣擉斀斣斶歜濁燭獨臅薥蠋蠲襡觸躅鐲镯韣髑鸀㒔㯮㻿䟉䪅䫳䮷𠠡𡤗𢢗𢻧𣀈𣂌𤛯𤢜𤣡𥋛𥎠𥖠𥣋𦆂𧐰𧥔𧥘𨊒𨞕𩁍𩑂𩼟𪇆𪍹𪦨",
 "廉": "劆嬚濂燫簾臁薕蠊譧鐮镰䆂䭠𠓌𠿳𡫐𢅏𣀃𣀊𣍙𣜰𣟚𣤤𤬚𤻑𥋲𥖝𦆆𦤩𦧷𧞋𧸖𨎷𩆌𩪬𩼔𪼥𬁛𬴯𬶶",
 "豦": "劇勮噱懅據澽璩臄躆遽醵鐻㯫㷾䆽䟊𤢓𥜅𥴧𦼫𧇿𧝲𧬷𧲋𧴘𨎶𨙊𨞙𨞦𨼫𨼽𩁋𪆺𪍸",
 "歲": "劌噦奯檅濊獩穢翽薉鐬顪饖鱥䠩䮹𢒱𢕺𣤠𣦦𣦧𣦫𣦭𣦮𣩪𤂾𤻀𦅵𦡖𧖠𧬨𧴖𧸗𨞣𪒩𬆎",
 "蒦": "劐嚄嬳彟彠擭檴濩獲瓁矆矱穫籆耯臒艧蠖護鑊镬雘韄頀鱯鳠鸌鹱㠛㦜㬦䨼䪝𪇡",
 "鼻": "劓嚊嬶擤濞襣鼼鼽鼾鼿齀齁齂齃齄齅齆齇齈齉䑄䕗䶊䶋䶌䶍䶎䶏䶐䶑𠏿𡽶𢋛𤻖𦤫𦫱𧗗𨞳𩕬𪕿𪖐𪖑𪖒𪖓𪖔𪖕𪖖𪖗𪖘𪖙𪖚𪖛𪖜𪖝𪖞𪖟𪖠𪖡𪖢𪖣𪖤𪖥𪖦𪖧𪖨𪖩𪖪𪖫𪖬𪖭𪖮𪖯𪖰𪖱𪖲𪖳𪖴𪖵𪖶𪖷𪖸𪖹𪖺𪖻𪖼𪖽𪖾𪖿𪗀𪗁𪗂𪗃𪤨𫗅𫜤𬹯𬹰",
 "靡": "劘孊戂攠灖爢蘼釄㸏䃺䊳䭩𪎫𪎮",
 "蠡": "劙攭欚㒩㼖䤙𢥾𤼠𦧽𦫈𧅮𩽵",
 "屬": "劚囑孎斸曯欘灟爥矚蠾钃䌵䙱䠱𡆜𢦇𢺡𣀻𣀼𣥀𪈺𪚌𫍘𫚇𬎠",
 "万": "劢厉杤栃疠虿趸迈㬅䥿𠒐𠡔𡇏𡧊𣵑𤡌𤽩𥅐𥒿𥸯𦐟𦐟𦥤𧊪𧊪𧯐𧾈𨒒𨟔𨨬𪜇𪹖𫔬𫢿𬇕𬜼𬮙",
 "手": "劧抙拏拲拿挐挙挚挛挲掔掣掰掰掱揅揧揫揱搫搴搿搿摩摮摯摰摹撃撆撉擊擎擘擧擪攀攣杽篫鎼㐿㧘㧝㧬㧭㧱㧳㨇㨌㨍㨻㨼㩓䤏䦐𠓢𠨾𠰅𡅈𡆺𡙳𡛊𢌜𢎇𢝟𢩦𢩬𢩷𢩸𢪇𢪒𢪒𢪓𢪖𢪘𢪥𢪳𢪸𢪻𢪽𢪿𢫀𢫗𢫞𢫪𢫰𢫶𢫶𢬙𢬚𢬛𢬛𢬣𢭋𢭤𢭥𢭶𢮃𢮏𢮗𢮘𢮜𢮝𢮟𢮠𢮣𢯄𢯌𢯣𢯲𢰞𢰣𢰨𢰱𢰿𢰿𢱀𢱞𢱬𢱯𢱵𢲓𢲡𢲤𢲱𢲿𢳁𢳈𢳉𢳔𢴝𢴞𢴭𢴳𢴷𢴸𢴺𢴽𢵡𢵤𢵥𢵨𢵩𢵬𢵿𢶗𢶜𢶟𢶡𢶰𢷆𢷨𢷨𢸁𢸇𢸧𢸭𢹁𢹏𢹭𢺋𣖥𣗯𣠧𣡄𣧙𣩌𣮚𣲬𤐲𤑮𤕛𤘶𤨇𥆶𥓨𥗘𥗩𥤺𥩝𥬄𥵱𥾹𦈾𦉄𦉋𦉌𦎚𦞿𦥹𦵛𦶸𧅩𧆠𧇵𧦌𧫅𧵃𨑲𨢙𨥋𨬦𨬳𨭴𨰈𩇮𪊗𪌐𪎚𪎮𪭩𪭳𪮀𪮃𪮍𪮏𪮒𪮚𪮽𪲦揅𫼓𫼔𫼙𫼜𫼠𫼴𫼷𫼿𫽓𫽡𫽬𫽭𫽯𫽷𫽺𫾌𫾜𬅍𬝩",
 "厉": "励蛎𤇃𪵱𫟫𫥵",
 "后": "劶垕姤洉缿茩詬诟逅郈銗骺鮜鲘㖃㤧㧨㸸㻈䞧𠵲𠵳𡢐𡧻𣢨𥅠𥒖𥙐𧊛𧙺𧮶𧲿𩗇𪁆𪊪𪘇𪢈𪯬𪲉𫀱𫝴𫩲𫪣𬖙𬭅𬷎",
 "匡": "劻哐恇框洭眶筐誆诓軭邼㑌䒰䖱𢬤𢼳𣃱𤝿𦊺𦚞𧏃𧻔𨀕𨦑𨴑𩒑𩢼𩬹𪥎𪯵𫁔𬮣𬳻",
 "员": "勋圆损殒涢筼郧陨㛣𤈶𤶧𫕥𫖲𫛫𫬙𬁽𬒍",
 "坴": "勎埶淕燅睦稑踛逵錴陸鯥鵱㓐㛬䡜𡎐𢑫𢯅𢴸𣔭𤁄𤎮𤏝𤭝𥓪𥚊𦁪𧌉𨎐𨞬𪂚𪸷𪻧𪽘𫸒𬀻",
 "孟": "勐掹猛艋蜢錳锰鯭䁅䓝𠗠𠵼𡝹𢛴𣓶𤗖𤦕𤷪𥺬𦁧𧩌𪹁𫙍𬈂𬧷",
 "革": "勒愅煂緙缂羁諽靪靫靬靭靮靯靰靱靲靳靴靵靶靷靸靹靺靻靼靽靾靿鞀鞁鞂鞃鞄鞅鞆鞇鞈鞉鞊鞋鞌鞍鞎鞏鞐鞑鞒鞓鞔鞕鞖鞗鞘鞙鞚鞛鞜鞝鞞鞟鞠鞡鞢鞣鞤鞥鞦鞧鞨鞩鞪鞫鞬鞭鞮鞯鞰鞱鞲鞳鞵鞶鞷鞸鞹鞺鞻鞼鞽鞾鞿韀韂韃韄韆韇韈韉韊韚㗆㮖㴖䐙䨣䨰䩐䩑䩒䩓䩔䩕䩖䩗䩘䩙䩚䩛䩜䩝䩞䩟䩠䩡䩢䩣䩤䩥䩦䩧䩨䩩䩪䩫䩬䩭䩮䩯䩰䩱䩲䩳䩴䩵䩶䩷䩸䩹䩺䩻䩼䩽䩾䩿䪀䪁䪂䪃䪄䪅䪆䪇䪈䪉䪊䪋䪌䪍䪎䳬𡃈𡟍𢃲𢯹𣎤𤠇𤭫𥨳𦍈𦍊𦑜𦣄𧈎𧈓𧠄𨍝𨏚𨐥𨔷𨙀𨟨𩆺𩉛𩉜𩉞𩉟𩉠𩉡𩉢𩉣𩉤𩉥𩉦𩉧𩉨𩉩𩉪𩉫𩉬𩉭𩉮𩉯𩉰𩉱𩉲𩉳𩉴𩉵𩉶𩉷𩉸𩉹𩉺𩉻𩉼𩉽𩉾𩉿𩊀𩊁𩊃𩊄𩊅𩊆𩊇𩊈𩊉𩊊𩊋𩊌𩊍𩊎𩊏𩊐𩊑𩊒𩊓𩊔𩊕𩊖𩊗𩊘𩊙𩊚𩊛𩊜𩊝𩊞𩊟𩊠𩊡𩊢𩊣𩊤𩊥𩊦𩊨𩊩𩊪𩊫𩊬𩊭𩊮𩊯𩊰𩊱𩊲𩊳𩊴𩊵𩊶𩊷𩊸𩊹𩊺𩊻𩊼𩊽𩊾𩊿𩋀𩋁𩋂𩋃𩋄𩋅𩋆𩋇𩋉𩋊𩋋𩋌𩋍𩋎𩋏𩋐𩋑𩋒𩋓𩋔𩋕𩋖𩋗𩋘𩋙𩋚𩋛𩋜𩋝𩋞𩋟𩋠𩋡𩋢𩋣𩋤𩋥𩋦𩋧𩋨𩋩𩋪𩋫𩋬𩋭𩋮𩋰𩋱𩋲𩋳𩋴𩋵𩋶𩋷𩋸𩋹𩋺𩋻𩋼𩋽𩋾𩋿𩌀𩌁𩌂𩌃𩌄𩌅𩌈𩌉𩌊𩌋𩌌𩌍𩌎𩌏𩌐𩌑𩌒𩌓𩌔𩌕𩌖𩌗𩌘𩌚𩌛𩌜𩌝𩌞𩌟𩌠𩌡𩌣𩌤𩌥𩌦𩌧𩌨𩌩𩌪𩌫𩌬𩌭𩌮𩌯𩌰𩌱𩌲𩌳𩌴𩌵𩌶𩌷𩌸𩌹𩌺𩌻𩌼𩌽𩌾𩌿𩍀𩍁𩍂𩍃𩍄𩍅𩍆𩍇𩍈𩍉𩍊𩍋𩍌𩍍𩍎𩍏𩍐𩍑𩍒𩍓𩍔𩍕𩍖𩍗𩍘𩍙𩍚𩍜𩍝𩍞𩍟𩍠𩍡𩍢𩍣𩍤𩍥𩍦𩍧𩍨𩍩𩍫𩍬𩍭𩍮𩍯𩍰𩍱𩍲𩍳𩍴𩍵𩍶𩍷𩍸𩍹𩍺𩍻𩍼𩍽𩍾𩍿𩎀𩎁𩎂𩎃𩎄𩎅𩎆𩎇𩎈𩎉𩎊𩎋𩎌𩎍𩎎𩎏𩎐𩎑𩔈𪔨𪟋𪩗𫕮𫕳𫖅𫖇𫖈𫖉𫖊𫖋𫠅𬰤𬰥𬰦𬰧𬰨𬰩𬱭",
 "冒": "勖媢帽毷瑁艒萺蝐賵赗㪞㴘𢝌𢯾𣔺𣯀𤊻𤲰𥈆𧛕𨩩𪃑",
 "贳": "勚𪽴",
 "莫": "募嗼墓嫫寞幕幙慔摸摹暮暯模氁漠獏瘼瞙糢縸膜蓦蟆蟇謨謩谟貘鄚鏌镆饃驀鬕㱳㵹㷬䮬𠢓𠻚𡖶𡠜𢟽𢨃𣩎𣯳𥕓𥡸𥱹𦟦𦷤𦹪𦿉𧃊𧅌𧆙𧒳𧷸𨢢𩄻𩌧𩐍𩐖𩐻𩻁𪅐𪍤𪏟𪝡𪷂𫄲𫔩𬎇𬑤𬞿𬹍",
 "埶": "勢摰暬槷槸熱蓺褹褻驇㙯䞇𠪑𡂞𡠦𡫑𢄢𢳊𤍽𤮅𥡩𧃳𧜼𪧢𫮛𬓺𬷮",
 "强": "勥嵹摾漒犟糨繦膙蔃襁謽鏹镪䃨𠎦𡠤𡠥𣚦𣩴𫄶𫗳摾鏹𫮬",
 "貰": "勩𣽒𤺔𧸊",
 "絭": "勬潫𡈢𦅌𦪝𫮫",
 "劦": "勰協姭恊拹栛珕脇荔蛠㶸䅄䝱䬅𠡷𠢂𠱿𡀺𢂐𢣢𣆕𣢩𣤥𣴚𤙒𤱷𦴾𦶭𧻒𫩻𬳫",
 "萬": "勱厲噧澫燤癘蠆蠇贎躉邁㒖䊪䖁䘍䜕𡳱𡳲𡽇𤛶𤢥𥍈𥖣𥜍𦼌𧄴𧾗𨆣𨙗𨭬𨲴𨷈𪒪𪯁𪵒𫙽𫮮𫴆𬒪𬚑𬞒𬯥",
 "熏": "勳嚑曛櫄燻獯矄纁臐薰醺鑂䗼䙧𠧋𡓽𢣤𢷠𣠍𤪠𦇟𦧀𦫯𧸬𨷔𩪱𪇑𫄸𫲊",
 "厲": "勵巁曞櫔濿爄矋礪禲糲蠣鱱𠠏𡂖𢤆𤢵𤪲𥣭𦆨𧓽𧖄𧞵𧢝𨇆𨞺𨯅𩧃𪙺𬩤",
 "徹": "勶𤁲𨇂",
 "雚": "勸嚾孉巏懽權歡灌爟獾瓘矔礶罐虇蠸觀讙貛酄鑵顴颧飌驩鱹鸛鹳㩲䌯䑏䙮䚭䝔䟒䠰𠤍𡚜𡰝𡰞𤜍𤮳𤮴𥷬𧆉𧢰𨽧𩁧𩙤𩵄𪈩𫹩𬤰𬴐𬶺",
 "乂": "匁図艾㞿㣻㲼䢃𠀼𠇢𠮣𠵪𡒠𡝄𢋪𢑓𢩩𢪤𢳓𣅐𣊥𤕧𤴧𥄁𥐷𥫜𥿔𦙹𦴁𦼧𧜯𧞠𨱩𩈞𩎮𩮉𪜧𪵺𫒽𬊇𬏻𬬝",
 "巳": "包囘夒媐导巶巷巸巺巺巽巽戺攺汜熈祀褼起蹮遷釲㐶㕀㠱㰝㱼㷗㷩䇃䏋𠄢𠎾𠑗𠑚𠑣𠬸𡆳𡇆𡊈𡏎𡕼𡕽𡖀𡘟𡚱𡟮𡢰𡨈𡲏𡵆𡵒𡿚𡿟𢀴𢀷𢀸𢀹𢀺𢁂𢁃𢁄𢁅𢁅𢁌𢁌𢁎𢁐𢆆𢌞𢌴𢌴𢏍𢐝𢨪𢩡𢫎𢯳𢱱𢶊𢹎𢻰𣇥𣍴𣏌𣑿𣒓𣒪𣒯𣝿𣨏𣴬𣴵𣵨𤄻𤇗𤉑𤋅𤋮𤌇𤎹𤔿𤞸𤥜𤧺𤴒𥑉𥙈𥙤𥲻𦀞𦊦𦊳𦐙𦓚𦓨𦗤𦘺𦚪𦚽𦬊𦲠𦳡𦸆𦹖𧃰𧣰𧤬𧦠𧧊𧬯𧱖𧳔𧼉𨀓𨃿𨃿𨏵𨑔𨑖𨙙𨡡𨥹𨭙𨶘𨶘𨹕𨼭𩂒𩂵𩄥𩊋𩐦𩐶𩓔𩛗𩜮𩝁𩝁𩠟𩩾𩵉𩵊𩵗𪊍𪌄𪏖𪩯𪼶𫟳巽巽𫳄𫶶𫶹𬆕𬒅𬔝𬴺",
 "夕": "匇名外夗夘多多夝夢夣夤奖将岁摉斘栁桨梦汐浆矽穸箩罗芕萝邜酱釸飧鳉㐴㒱㚈㱑㱔㶤䇟䇱䌛䢣𠂗𠊇𠌌𠌏𠎖𠙑𠙨𠚟𠞝𠡹𠧽𠭢𠭮𠲄𠳻𠸀𡋓𡎙𡖄𡖅𡖆𡖇𡖇𡖉𡖊𡖋𡖌𡖕𡖖𡖗𡖘𡖛𡖡𡖥𡖱𡖶𡖷𡗃𡗅𡗇𡚵𡛹𡜙𡝅𡥗𡨝𡨨𡪀𡪀𡪎𡪬𡫮𡭫𡯌𡵪𡿪𢁟𢄚𢄾𢆢𢊈𢋽𢑸𢑼𢖨𢗇𢘵𢜁𢟼𢠘𢳗𢶬𢷛𢸕𢻦𢽯𣀿𣀿𣀿𣀿𣏐𣐦𣑣𣔜𣜞𣠀𣠵𣡏𣡑𣡟𣡮𣡱𣥛𣴖𣶓𣷛𣺀𣼙𤃚𤇘𤇵𤈭𤉩𤓵𤕡𤕶𤚶𤞃𤟒𤥌𤧡𤧢𤰧𤾿𥉡𥋮𥍧𥓇𥖥𥜏𥝘𥟜𥟫𥥿𥦬𥦰𥧠𥫇𥭹𥻒𦂑𦂞𦌤𦕬𦚂𦥜𦥱𦦼𦧁𦨀𦪁𦫁𦫂𦫓𦭘𦰀𦰎𦰔𦱏𦱝𦻸𦾘𧈷𧍽𧖪𧛅𧜩𧠱𧥧𧮁𧮁𧰌𧰍𧵚𧼜𨀨𨑚𨓆𨕔𨧔𨫂𨼺𩁼𩂙𩂭𩂭𩄉𩒩𩖡𩘠𩘠𩚏𩜨𩝯𩡑𩲁𩽃𪇤𪗄𪚪𪤷𪤹𪤼𪤾𪧋𪧷𪩨𪭜𪲁𪾎𫂝𫇁𫐫𫝢𫝣𫠔夢𫦘𫯑𫯘𫱢𬄀𬄐𬅕𬉹𬚮𬜀𬞃𬡲𬪼𬯞",
 "躬": "匑窮𡺺",
 "躳": "匔竆",
 "𠤎": "化叱𠖆𡚧𦙋𧴦𨞰𬙞",
 "匚": "匛匜匝匞匟匠匡匢匣匤匥匦匧匨匩匪匫匬匭匮匯匰匱匲匳匴匵匶匷匹区医匼匽匾匿區叵惬汇滙箧㔯㔰㔱㔲㔳㔴㔵㔶㔷㔸䑞𠤭𠤮𠤯𠤰𠤱𠤳𠤴𠤵𠤶𠤷𠤸𠤹𠤻𠤼𠤽𠤾𠤿𠥀𠥁𠥂𠥅𠥆𠥈𠥉𠥊𠥋𠥌𠥍𠥎𠥏𠥐𠥑𠥒𠥔𠥕𠥖𠥗𠥘𠥙𠥚𠥛𠥜𠥝𠥞𠥟𠥠𠥡𠥢𠥤𠥥𠥦𠥨𠥭𡍱𡞡𢃫𢏉𢝎𢽇𣚼𣛈𣝽𣞘𣡔𣡛𣳐𣶕𤑅𤖋𤮖𤰀𤷾𥕇𥮟𥺫𦨃𦨄𦬀𧂌𧈟𧏔𧓨𧗻𨝇𨨙𨹟𩒥𩓴𩕿𪟬𪟯𪟰𪟱𪟲𪫯𫍁𫧋𫧌𫧍𫧎𫧏𫧐𫧑𫧒𫧓𫧖𫧗𫧘𫧙𫧚𫧛𫧝𫨼𫬯𫹖𬌄𬨭𬯅",
 "久": "匛奺杦汣灸玖畂畝畞疚粂羐羑镹㝌㡱𠇧𠖮𠝙𠥾𠨠𠮻𡉌𡚮𡚰𢆩𢏉𣖈𣬨𣿤𤆐𤥍𥏑𥤯𥹰𦇥𦤷𦮖𦮛𦲃𦲦𧰫𧺓𨥆𨾉𩐗𩷡𪔼𪖓𪦉𫘹𫡠𫼖𬀨𬗎𬜢",
 "甲": "匣厣厴呷岬庘押柙炠狎玾笚翈胛舺鉀钾閘闸魻鴨鸭㕅㘡㳌䆘䖖䖬䘥䛅𠇚𠇺𠍬𠒛𠔱𠖹𠩯𡊠𡞨𡭵𢈤𢘉𢭡𢼓𣃻𣅼𣘭𣢗𣫹𤎙𤙇𤱋𤱢𤱣𤲍𤲰𤳅𤳅𤳅𤳣𤳵𤳵𤳵𤳵𤵭𥑐𥩫𦭖𦳱𦾏𧆥𧿵𨐴𨒇𨸺𩂘𩉾𩓻𩤭𩨹𩲣𩲳𩿼𪀌𪨖𫪞𬒱𬛽",
 "玉": "匤国宝珏琞琧瑬瑸瑿璗璧璺璽瓕砡莹鈺钰閠㓘㺱㺸㻃㻗㻨㻹㻺㻾䞝𠇤𠰧𠷷𡀊𡊩𡘇𡛼𢚥𢫛𣔣𣤦𣶳𤣗𤣬𤣶𤣼𤤋𤤙𤤴𤤴𤥓𤥔𤥲𤥹𤦀𤦁𤦂𤦃𤦟𤦨𤦼𤧠𤧤𤧥𤧦𤧧𤧩𤧬𤨐𤨗𤨙𤨼𤨽𤩤𤩯𤩱𤪇𤪎𤪐𤪡𤪭𤪰𤪾𤫀𤫏𤫔𤫜𤫢𥚼𥩨𦻒𦼆𧉣𧟪𧿷𨋔𨚝𨫎𨫎𩊇𩢤𩿱𪌞𪰑𪸛𪻹𫈙𫛃𫞂㺸𬍞𬍟𬍡𬍢𬍼𬎕𬔵𬗈𬸃",
 "弁": "匥峅弃拚昪笲閞鴘㭓㳎㺹䒪䣲䪻䮁𠦷𡊅𡊯𡍊𡏰𡗹𡛞𢍭𢍭𤝏𤼪𥮓𥹇𥿋𧉤𨋒𨚕𨠢𪌚𫔰𫖘𫨄𫴕𬢢",
 "轨": "匦",
 "壯": "匨奘娤弉梉焋莊裝銺䊋𠨡𡍱𡝂𢈜𢙳𣴣𤞛𤶜𤽸𦀜𧚌𨌄𨡈𩈪𪭿𫧾𬨋",
 "㞷": "匩𡯭𡯲𫪇",
 "曶": "匫㳷䐇𣊸𣓗𬨰",
 "軌": "匭𣷾𦳛",
 "贵": "匮愦溃瞆篑缋蒉遗阓㱮䅪䙌䣒𨡺𩙬𪡞𪨇𪻺𫖃𫝬𬓼𬤉𬭢𬯎",
 "淮": "匯準𥲱𦪉𦹏𫉯𬄕𬷯",
 "𡙗": "匲",
 "算": "匴㔍𣀔𣃍𣝶𣫑𣰚𤀤𥳪𨮰𨰉𪧯𬭾",
 "舊": "匶嚿欍𦧃",
 "瞿": "匷忂懼戵欋氍灈爠癯矍臞蠷衢躣鑺鸜㘗㜹㩴㬬䂂𡚝𢌄𢎖𣃖𣰽𤣓𥎡𥗫𦔬𧄒𧢩𧾱𨟠𩁯𩉗𩉘𩟹𩧘𩧚𩵅𩽩𪖏𬖇𬸱",
 "妟": "匽宴䳛𣀭𧒛𩷑𪕤𪜿𪣚𫺍𬪀",
 "化": "华吪囮杹桦沎炛花訛讹貨货鈋靴魤𠇃𠕿𠯒𢪎𣾳𤆷𥄒𨱂𩑭𩲏𩲜𩾹𪜐𪢼𫅁𫇹𫔛𬍕𬖒𬟹",
 "办": "协胁苏",
 "䜌": "卛圝奱孌孿巒彎戀攣曫欒灓矕羉臠蠻變鑾鸞㘘㡩㪻㱍㽋𠣈𠨫𠮓𠮖𡤣𡤨𢌕𢍶𢺈𢺲𣀵𣦱𤅇𤫜𤼙𥀺𥽸𦇥𦇷𦣋𦦽𦫲𧄶𧖦𧟏𧟗𧮌𨰼𨰽𩙟𪈮𪈽𪭗𫴥𬯨",
 "囙": "卣㤙𠰸𡖣𡛸𤇀𤇆𤤨𥅤𧙊𪜭𬵈",
 "𠂑": "卵𫑙",
 "卪": "卵𠨳𠬨𡖉𡥭𢓷𢕜𢘴𢘵𢚿𢻮𤓲𦘛𦘜𦘡𩲂",
 "𦈢": "卸欫衘䣃𠉳𠛺𠷢𠾑𢉓𢔞𢩏𢭉𢳸𣖑𤥖𤮬𤮬𤷺𦉋𦉑𦉡𧘆𧡧𨝪𨡒𩛒𩝩𩣜𪩢𬎩",
 "丞": "卺巹拯洆烝㷥䇰䒱䕄䡕𠜉𠱺𡶽𢀿𢏞𢓞𣑕𤇶𥒡𦚦𦛆𦜕𧊴𧗆𨀧𨋬𨚱𩊨𪎻𫴏",
 "桼": "厀漆膝㓼㯃㯡䜉䣛䰍𠻟𣛺𣠴𥣥𦸓𧜝𩺲𪄭𬤘",
 "斜": "厁㙦䔑𣻠𪯯𪯰𫿸",
 "圡": "压庒𢬝𨐬𨦓𪤜𫆖𫭺𬟶",
 "龙": "厐咙垄宠庞拢昽栊泷珑眬砻笼聋胧茏袭詟陇龚龛𢘙𤇭𦨩𨀁𨐇𩃄𩧪𩬤𪫌𪺪𫎦𫖅𫛟𫜲𫢒𬧢𬸄𬺛𬺜𬺝",
 "叱": "厑哛唜喸夞巼廤𠳢𪝁𫅳𫒐",
 "尨": "厖哤娏庬浝狵痝硥蛖駹㙙㟌㤶㴳䏵䵨𢅛𥆙𧀔𧱓𧱦𧳑𨿙𩒿𩭒𩷙𪁒𪁪",
 "听": "厛𠳇",
 "泉": "厡楾湶瀪灥灥灥瑔線缐腺葲闎騡鰁鳈㟫㣐㶗䤼𠗯𠪰𡎏𡺙𢝓𢿬𣸕𣹻𣻮𤀁𤆁𤆁𤆁𤆁𤭯𥠘𥣤𧍭𧪒𧼷𨜩𨡹𩘘𩩺𪡠𪵿𫇋𫿧𬉖𬉨𬉯𬉱𬎺𬪷𬬟𬭣𬯏",
 "相": "厢廂想湘箱緗缃葙霜㜀𠷹𣕦𣰧𤜕𤧇𤭪𤷼𧡮𩮌𪂼𪝋𪶛𫝛𬴷",
 "秝": "厤䔉𠪱𠪾𡮰𢊆𢹠𣄬𤃉𤃝𤖣𤯎𤳂𤳝𤻤𥕆𥡀𥢮𥢲𥢺𥣠𥣤𥣸𦼖𧛿𩄞𪙱𫸅𬓶𬓷",
 "欮": "厥瘚闕阙𣖬",
 "夏": "厦嗄廈榎𠌘𡏘𡕵𡖃𡖃𡖃𡙣𡟺𡺷𤧶𤹉𥔹𥧜𥻴𦥍𦷜𧈄𧏡𨬜𩡘𪄂",
 "既": "厩嘅塈慨摡暨概溉穊蔇鱀㮣䀈䇒䊠𠌰𠣹𡏲𡠣𡳅𢟪𢷽𣯦𤡚𤻿𦔙𦟡𧐆𧑂𧜳𧫜𨙐𩯂𩽙𪄵𪖺𬚢𬶨",
 "晷": "厬𣽞",
 "猒": "厭㦔㩎𢣽𢵤𢹥𩉂𩉇𩞹𪒞",
 "敢": "厳噉嚴憨撖橄澉瞰譀豃闞阚饏鬫㒈㦑㺖䆻䭛䲎𡪯𣝽𤅾𤺍𥕵𥼲𦏦𦪧𧗐𧸂𨬒𩍉𪉿𪒠𪠛𫶔𫿞𫿥𬸹",
 "厭": "厴嚈壓嬮懕懨擪擫檿靨饜魘黶㱘𡽣𢅠𣝓𤳪𥀬𥌅𥜒𥣘𧗖𧞣𨽀𩼴𪱑𫨥",
 "厸": "厽斚",
 "𤰔": "叀専𡍴𢍖𢾾𣌼𣌽𣓧𣚢𣶣𣽉𤴛𤴝𥮔𦁆𦅎𦑐𧈌𧚎𨍘𨘜𩓏𩘤",
 "逮": "叇曃靆𡐡𢠻𥊵𧑔𩻸𪒡",
 "𠂆": "反栃虒貭质逓䥿𠂋𠂘𠂬𠂮𠂰𠃅𠈩𠒕𠲐𠺍𡌐𡘿𡝜𣺣𤞅𤤵𥑽𥕈𥕫𥛕𥰽𦁟𦓙𦛐𧈛𧉲𧏕𧚜𧜑𧤫𧪥𨀭𨄪𨎉𨔄𨔕𨖠𨧌𨪾𨴳𨽯𨽯𩉴𩒒𩓃𩛶𩥜𩲔𩷁𪁯𪕽𪭭𫀖𫞊",
 "尗": "叔戚敊茮鮛㑐䦊𠈒𠩏𠱙𡜔𡧯𡫁𡬧𡮧𢙤𢻃𣐹𣢰𧠪𧧌𨀚𩐡𩒛𪀖𫛧𬫐",
 "宀": "叜字宁宂它宄宅宆宇守安宊宋完宍宎宏宑宒宓宔宕宖宗宙宛宜宝实宠审客宣室宥宦宧宨宩宪宫宬宭宮宯宰宱宲害宴宵家宷宸容宻宼宽宾宿寀寁寂寃寄寈寉寊富寍寎寏寐寑寓寔寕寖寘寙寚寛寜寝寞察寠寡寢寣寤寥實審寪寫寬寭寯寰寱寲寳寴寵寶寷弿抭摉濅灾牢甯賔㗷㝉㝊㝋㝌㝍㝎㝏㝐㝑㝒㝓㝔㝕㝖㝗㝘㝙㝚㝛㝜㝝㝞㝟㝠㝡㝢㝣㝤㝥㝦㝨㝩㝪㝫㝭㝯㝱㝲㬪㲾㺙䗙䞿䥌𠊯𠌌𠍌𠑺𠝠𠰡𠰽𠷪𠹟𠺀𠻕𠼆𠽨𠾰𡃂𡊫𡓛𡔂𡕶𡕹𡖢𡖷𡛥𡜷𡝏𡡮𡣚𡥜𡦺𡦻𡦼𡦾𡦿𡧀𡧁𡧂𡧃𡧄𡧅𡧆𡧇𡧈𡧉𡧊𡧋𡧍𡧎𡧏𡧐𡧑𡧒𡧔𡧕𡧖𡧗𡧙𡧚𡧛𡧜𡧝𡧞𡧟𡧠𡧡𡧢𡧣𡧤𡧥𡧦𡧧𡧨𡧩𡧪𡧬𡧭𡧯𡧰𡧱𡧲𡧳𡧴𡧵𡧶𡧷𡧸𡧺𡧻𡧼𡧽𡧾𡧿𡨀𡨁𡨂𡨃𡨄𡨅𡨆𡨇𡨈𡨉𡨊𡨋𡨍𡨎𡨏𡨐𡨑𡨒𡨓𡨕𡨖𡨗𡨘𡨙𡨚𡨛𡨜𡨝𡨟𡨠𡨡𡨢𡨣𡨤𡨥𡨧𡨨𡨩𡨪𡨬𡨭𡨮𡨯𡨱𡨲𡨳𡨴𡨵𡨶𡨷𡨸𡨹𡨺𡨻𡨼𡨽𡨾𡨿𡩀𡩂𡩃𡩄𡩅𡩇𡩈𡩉𡩊𡩋𡩌𡩍𡩎𡩏𡩐𡩑𡩒𡩓𡩔𡩕𡩖𡩗𡩘𡩙𡩚𡩜𡩞𡩟𡩠𡩡𡩢𡩣𡩤𡩦𡩨𡩩𡩫𡩬𡩭𡩮𡩯𡩱𡩲𡩳𡩴𡩵𡩷𡩸𡩹𡩺𡩻𡩼𡩽𡩾𡩿𡪀𡪀𡪁𡪂𡪃𡪅𡪈𡪉𡪊𡪋𡪌𡪍𡪎𡪐𡪑𡪒𡪓𡪕𡪗𡪘𡪚𡪛𡪜𡪟𡪠𡪡𡪢𡪣𡪤𡪥𡪦𡪧𡪨𡪩𡪪𡪫𡪬𡪭𡪯𡪰𡪱𡪲𡪳𡪵𡪶𡪷𡪹𡪺𡪼𡪽𡪾𡪿𡫁𡫂𡫃𡫆𡫇𡫈𡫉𡫊𡫋𡫌𡫍𡫎𡫏𡫐𡫑𡫒𡫓𡫔𡫕𡫖𡫗𡫘𡫙𡫚𡫛𡫜𡫝𡫞𡫟𡫡𡫢𡫣𡫤𡫧𡫩𡫪𡫬𡫭𡫮𡫯𡫰𡫱𡫳𡫵𡫷𡫺𡫻𡫼𡫽𡫾𡫿𡬁𡬃𡬄𡬅𡬆𡬇𡬈𡬊𡬋𡬌𡬍𡬎𡬑𡬒𡬓𡬔𡬕𡬖𡬙𡬛𡬮𢄆𢉹𢊈𢋲𢜇𢟫𢟭𢠋𢠡𢤑𢥛𢥜𢯴𢱱𢲻𢴀𢴕𢸹𢻟𢾒𣃸𣍥𣑄𣘔𣘕𣘿𣙜𣙣𣜏𣠣𣠦𣮬𣮯𣲽𣴩𣵈𣷅𣹦𣺑𣼂𣼡𣾉𣿟𣿶𣿻𤀿𤃆𤃚𤇵𤍩𤑖𤑧𤘺𤚣𤡗𤡛𤢱𤧺𤩷𤪓𤬽𤴁𤴋𥈃𥉡𥊁𥋺𥌷𥖶𥘀𥢃𥩟𥯾𦂨𦄲𦆥𦎩𦜸𦣙𦤔𦤤𦦼𦪁𦯥𦴕𦵤𦶨𦶴𦶺𦷳𦸅𦸤𦹎𦹦𦽛𦽜𦾖𦾘𧉡𧎧𧒠𧒡𧒧𧒫𧓍𧔂𧔃𧕝𧙇𧛪𧜮𧟕𧡧𧧼𧫒𧯜𧶎𧶼𧽔𨄒𨊎𨋠𨌊𨍤𨍵𨎜𨐭𨑈𨒆𨔎𨕦𨖄𨘄𨜱𨝢𨢃𨢠𨨿𨫂𨬄𨭋𨭧𨮄𨰔𨳻𨸵𨹕𩕽𩜯𩝒𩝓𩝜𩝩𩝯𩞜𩟸𩟸𩥥𩩏𩭕𩮃𩯔𩼵𪀱𪆕𪘋𪧅𪧆𪧇𪧈𪧉𪧊𪧋𪧌𪧍𪧎𪧏𪧐𪧑𪧒𪧓𪧕𪧖𪧘𪧙𪧛𪧜𪧝𪧞𪧢𪧣𪧤𪧥𪧧𪧨𪧪𪧫𪧬𪧭𪧮𪧯𪧲𪧳𪧴𪧵𪧵𪧶𪪣𪲩𪼖𪼨𪽣𫄀𫈌𫊀𫓃𫝰𫟪𫲵𫲶𫲷𫲸𫲹𫲺𫲻𫲼𫲽𫲾𫲿𫳀𫳁𫳂𫳃𫳄𫳄𫳅𫳆𫳇𫳈𫳉𫳊𫳋𫳌𫳍𫳎𫳏𫳐𫳑𫳒𫳔𫳕𫳖𫳗𫳙𫳚𫳛𫳜𫳝𫳞𫳟𫳠𫳣𫳤𫳥𫳦𫳧𫳨𫳩𫳪𫳫𫳬𫳭𫳮𫳯𫳰𫳱𫳳𫳴𫳷𫳸𫳺𫳻𫳼𫳽𫳿𫴀𫴁𫴂𫴄𫴅𫴈𫴉𫴊𫴊𫴌𫴍𫴎𫴏𫴒𫴔𫴕𫴖𫴗𫴘𫴛𫴜𫴝𫴟𫴠𫴡𫴢𫴣𫴤𫴥𫴦𫴧𫴨𫴩𫴪𫾞𬃋𬄖𬋎𬞸𬹟",
 "𠬝": "叝報报服赧𠼶𤵓𦨕𨈞𨋁𨶔𬨃",
 "𦥔": "叟𠔜𡝨𡬯𡳼𢀏𣀭𥂒𥚞𥨈𦁴𦥕𦥤𦦔𦱸𧌫𧷈𨉯𨗮𨙑𩃡𠔜𨗭𫶋𬜀",
 "睿": "叡壡濬璿㪫䜜𠏻𤫀𥌑𧯕𧷁",
 "刁": "叼汈䒒𠚻𢆵𨾆𩾗𪔸",
 "于": "吁宇弙扜旴杅汙玗盂盱穻竽紆纡芋虶衧訏趶迂邘酑釪骬㐵㚥㝼㡰㪀㽳䄨䍂䏏䖉䩒䵹𠄀𠕮𠯊𠳲𠵄𠷱𡋌𢊢𢖳𢵎𣕓𣦿𣳹𣶿𣼻𤕎𤖁𤨹𤰤𤴲𤿍𥝝𥮌𦏴𦭨𦮣𧋪𧘘𨊱𨕓𨖛𨢮𨾌𩁹𩂀𪏃𪪬𫉞𫎏𫡚𫤿𫧙𫯣𬅞𬉶𬙗𬙘𬣙𬱀𬲨𬹥",
 "𠔼": "同㧇㱿𠕊𠕓𠕔𡉉𡴊𡿩𢗶𢤶𣈺𣏊𣏵𣖫𣦵𣦻𣨦𣪛𣶄𥟸𦬿𧌵𧚲𨔜𨾫𩘃丽丽𬆀",
 "丫": "吖𠆋𠎗𡅁𡅓𡷉𤁜𫊦",
 "户": "启啔妒帍庐戹戺戻戽戾房扁扂扃扄扅扆扇扈扉扊护昈枦沪炉牖粐肁肈舮芦鈩雇馿驴魲鳸㦾㦿㧀㧁㧂㴃䁉䋀䋆䋜䋯䏿䡎𢗼𢨧𢨨𢨫𢨮𢨰𢨱𢨳𢨳𢨵𢨶𢨿𢩀𢩂𢩃𢩉𢩊𢩌𢩏𢩐𢩔𢩗𢩗𢩛𢩞𢩡𢩤𢹞𢼄𢼚𣗉𣡬𣢖𣭺𩅶𩅶𩅶𪦽𪭘𪭙𪭚𪭛𫼉𫼌𫼍𫼎𫼏𫼐𫼒𬇋𬏞𬯛",
 "引": "吲矧粌紖纼蚓訠鈏靷㽼䀕䇙䏖䒡𠀓𠇁𠒒𡗵𡛅𢏄𢪉𣏖𦙢𧿯𨈧𪵰𫙒𫸬𫸷",
 "內": "吶妠抐枘𠥮𡜴𢁩𢑶𢑻𢓇𢗉𢧿𣅚𣧍𤜽𤣼𤿏𤿒𥄋𥍲𦐯𦛚𦮾𧺬𨑧𨪗𨳙𩐇𩬀𩹾𪗝𪞗𬝎",
 "孔": "吼犼芤𡦀𡰼𡵾𢗵𢪬𣏺𤆺𥤾𥥅𦙥𧉔𩫂𪣂𫁎𬗆",
 "升": "呏抍昇枡竔阩陹㐼䛂𠦲𠦿𠧌𠧍𡆼𡉧𡉼𡌍𡎂𡛈𢗢𢱼𣃬𣅮𥘥𥾷𦃷𦐒𦧌𦬱𦭊𧟨𧿘𨁠𨌝𨕞𨖲𨛘𨬁𨹱𩫆𪜙𪣪𪣿𫧧𫧪𬛲𬨠𬹦",
 "无": "呒妩庑怃抚芜䥻𡆶𡕠𣄳𣓢𣓢𣲘𩇞𪢸𪸓𫁲𬂠",
 "艺": "呓",
 "太": "呔忲态汰盇粏肽舦葢軚迏酞鈦钛駄㑀㣖㳲𠚀𡄛𡄛𡊀𡎌𡑷𡘒𡙒𡙒𡙒𡛕𡳁𢪯𣖁𣣥𣸳𣹆𣾱𤅿𤝁𤵉𤸙𥔐𥫵𧉑𧘹𧟧𧰚𨜨𨵵𩝉𪐥𪨐𫥲𬎦",
 "历": "呖枥沥疬砺粝苈雳𠠿𠢐𦍠𪫡𫎱𫐆𫥳𫵷𬦣𬫂",
 "乌": "呜邬钨𠆿𠛆𤆡𫲻𬮻",
 "戹": "呝砨豟軶阸㧖𣐖",
 "幼": "呦孧岰怮拗柪泑狕眑窈苭蚴袎詏軪靿鴢黝㑃㶭䬀䱂𠢢𠸰𡌝𡛙𡢵𡲍𢂊𢇔𢩃𣅺𣢜𣢢𣧥𤤬𤱎𥁒𥑑𥬓𥹱𥿌𨱧𩈏𩑴𩢒𩬗𪀂𪊛𫳀𫷤𬣦",
 "⺆": "周𠄗𠕛𠱬𢪡𥘝周𬒅",
 "𠮷": "周𠷪𠺞𡬋𢄰𥚣𥦿𥴿𧏜𨄘𨕎𨼈",
 "示": "呩奈宗斎柰标沶狋眎祘祘祟祡禀禁禦际頴颕龒䄅䄟䏡䒬䞸䱈𠇣𠖀𠖦𠝋𠸱𡒄𡝙𢊬𢧍𢧡𢰂𢲗𢼗𣢾𣦬𤊭𥉆𥌤𥘣𥙦𥚡𥛓𥛓𥛬𥛱𥜄𥜖𥜘𥜙𥜛𥞆𦄜𦊎𦕝𦠔𦣲𦱯𦼢𦾠𧀂𧀂𧁞𧁞𧁞𧂷𧇴𧊢𧤿𧲟𧲟𧵋𨏸𨽻𨽾𨾁𫀀𫀁𫀂𫀄𫀆𫀏𫀙𫀜𫀝𫀤𫂛𫎲𫖢𫣬𫵖𫻫𬅭𬅴𬆭𬒰𬒵𬓁𬓂𬓊𬢡𬰑",
 "瓜": "呱孤弧攨柧泒狐瓝瓞瓟瓠瓡瓢瓣瓤瓥畖窊笟罛胍苽蛌觚軱鈲㧓㼉㼊㼋㼌㼌㼍㼎㼏㼐㼑㼒㼓㼔㼕㼖㽿䩝䱄𠇗𠙙𠛒𡗷𡜁𢈅𢸖𣢚𣿿𤂜𤣛𤣛𤣛𤫪𤫫𤫭𤫮𤫯𤫰𤫱𤫳𤫴𤫵𤫶𤫷𤫸𤫹𤫺𤫻𤫼𤫽𤫾𤫿𤬀𤬁𤬂𤬃𤬅𤬆𤬇𤬈𤬉𤬊𤬋𤬌𤬎𤬏𤬑𤬒𤬓𤬕𤬖𤬗𤬙𤬚𤬛𤬜𤬝𤬞𤬟𤬡𤬤𤬥𤷸𤽡𥂻𥄼𥑔𥦫𦊡𦋯𦋯𦌦𦤻𦧔𦴉𦶍𦸈𦸉𦸷𦹭𧁾𧙆𧦼𧭑𧲲𧿼𨘖𨠋𨰆𨰆𨰆𨱃𨸯𩂡𩈕𩛃𩢍𪀅𪴒𪼳𪼴𪼵𫾞𬎢𬎣𬝊𬳷𬷊",
 "号": "呺枵號飸鴞鸮㞻䪽𠳯𠳯𠵗𠸮𡩸𢣉𢪶𣚧𣪆𣭖𦚊𧦢𨫴𪾥𫇯𫪕",
 "匝": "咂砸箍鉔㧜𠇽𣐝𣕸𣙐𣙖𥮃𦚗𦭧𪨞𫁹𫂸𫓬𬑚𬕣𬚴𬡋",
 "他": "咃怹𢫌𤵩𫴞𬣢",
 "出": "咄屈忁拙昢朏柮欪泏炪础祟窋笜粜絀绌茁蟗袦詘诎貀趉鈯韷飿黜㑁㒴㔘㤕㽾䂐䖓䖦䠳䢺䪼䭯𠀴𠒄𠕐𠘼𠙕𠚐𠥱𠩃𠩉𠪭𠭴𠰕𠲫𡈫𡈱𡌜𡑥𡒈𡕜𡖴𡛛𡣼𡧨𡭧𡭱𡭲𡮖𡲒𡲗𡲬𡲶𡳼𡶏𡶸𡹏𡽈𢅇𢇿𢋱𢖚𢝿𢢡𢥟𢭧𢮬𢰛𢶗𢶵𢹯𢼍𢽅𢽘𢾈𢾍𢾕𣀎𣂯𣅽𣉱𣊻𣋦𣌑𣍧𣐯𣕿𣦧𣦬𣧪𣪹𣭑𣽶𣿗𣿲𤄗𤋪𤏺𤑥𤒁𤒺𤓊𤜌𤝒𤢝𤬷𤬼𤱟𤸿𥎐𥙋𥚢𥜺𥞃𥣼𥨺𥪃𥫋𥫋𥺋𥽀𦋦𦗷𦛳𦣃𦤙𦨥𦪰𦵛𦸶𦽠𧒥𧙉𧙦𧟊𧬉𧬲𧭁𧮔𧰹𧵠𧷓𧷲𧷵𧸞𧸟𧿺𨋡𨌗𨒞𨖮𨗯𨱄𨱦𨲶𩂗𩌮𩍞𩍽𩎇𩕣𩕵𩖷𩟜𩢎𩪨𩬢𩶌𩼡𩿩𪏫𪐽𪓶𪗊𪗨𪞷𪞹𪞺𪨀𪨕𪫜𪲵𫥤𫥧𫥨𫥫𫥬𫥭𬁹𬑎𬩐𬮉",
 "处": "咎昝",
 "永": "咏怺昶昹栐泳眿羕脉詠霡㫤䘑𠇟𠓁𠰦𠶇𡛻𡠘𢒋𢫕𢵇𢵎𢺫𣉣𣕓𣲈𣴏𣴏𣼁𤤯𤪉𦕟𦘢𦨤𦨬𦨺𦭔𧊯𧏔𧠧𧵕𨄶𨠕𨥭𩈗𩊍𩖻𩶙𪢓𪣉𪵵𪸠㫤𫥆𫴇𬇾𬐔𬗊𬨣𬱁𬱄",
 "付": "咐姇府弣怤拊柎泭祔符紨胕苻蚹袝詂跗軵鉜附駙驸鮒鲋㖚㤔㾈䂤䑧䠵䵾𡧛𢂆𤝔𤤕𤸗𥑧𥞂𥹃𧊆𨒕𨾪𩎠𩬙𩿧𪐻𫙆𬌀𬔪𬛤𬠙𬰴",
 "打": "咑𨴆𪭫𫩿",
 "吅": "咒咢品哭啙喌噐噐器嚚嚚嚣嚣嚴囂囂斝穯駡骂𠅧𠐪𠷫𠸈𠼨𠼨𠾖𠾖𡀈𡀋𡁥𡂇𡂽𡃟𡄅𡄉𡄜𡄝𡄿𡅱𡅱𡆛𡈨𡈨𡋐𡋑𡜓𢉰𢋌𣀌𣙐𤅭𤅾𤪛𥗃𥘀𥤙𥸇𦉅𦣙𦫩𦰉𦽺𧂘𧃼𧄪𧚾𨔺𨕬𨜝𨫰𨼶𩁁𩁁𩑇𩺑𪄍𪑵𪟣𪠛𪡅𪡰𪡼𪥜𪯟𪯟𪳏𪹬𫜝咢𫪟𫪠𫪡𫬋𫬌𫬰𫬲𫬲𫻡𬎜𬕪𬢧𬱑𬱑𬱞𬴳",
 "丝": "咝鸶",
 "关": "咲掷朕栚浂渕烪眹踯送郑関𠈪𠹻𡗺𢕠𢜂𢬈𣷃𣾍𥒆𥜁𨓵𪠫𪲿𪵜𫕀𬀲𬮦",
 "灰": "咴恢拻洃烣盔脄詼诙㞀㷇𤉕𦤠𦭹𧱉𨀡𨒭𨦗𩒏𪀬𪑀𪲄𪿙𬀯𬊐",
 "休": "咻庥恘恷烋烌茠貅銝髹鮴鵂鸺㳜㹯㾋䏫䛙䮌𠁫𡜨𢫩𣐾𤈢𩗆𩢮𪀪𪘆𪻜𫃢",
 "因": "咽姻恩栶欭氤洇烟珚秵筃絪胭茵裀銦铟鞇駰骃㘻㧢㸶䂩䄄𠗃𠛭𠡛𡈲𡈲𡈲𡋘𡜭𢓨𢙫𤝱𤯠𤶑𧊭𧹢𨋳𨡤𩂥𩎪𩶾𪊦𪔗𪜶𪡖𫂾𫑵𬘡",
 "伊": "咿洢蛜𡜬𢙠𢙬𤝳𦭽𧊰𪑁",
 "西": "哂廼徆恓拪晒栖毢氥洒硒粞絤舾茜跴迺閪㛉㟳㮒䄽䇴𠊆𠒓𡧳𡶼𢬣𣊢𣗇𣺋𤍰𤑀𤞏𤥒𤭾𤶈𤿢𥙘𥣊𦕩𧔭𧟢𧟪𧟫𧟭𧧍𨔰𨕏𨚹𨠴𩳹𪀹𪎢𪠧𪪰𫊕𫗔𫘊𫙘𬕭𬘟𬠂𬡸𬡹𬭄𬱅",
 "匈": "哅恟洶胸詾㕼𠴶𢫤𣑤𣺷𤥘𤭶𥑪𥒚𦭪𧲳𨠮𨥸𩌠𩢛",
 "𢦏": "哉截戴栽烖繊胾臷蛓裁載载酨韯㘽㦳䳒䵧𠋰𠻏𢎇𢦛𢦷𢦼𢧇𢧑𢧜𢧨𢧭𢨆𢨎𢨣𣔮𤍬𤢷𤱱𥅤𥅰𥷪𥷰𦢙𧐦𧒶𧓤𧓥𧚶𧟭𧧟𧧬𧯥𧷲𨈄𨏓𨚵𨣲𨪠𨬿𨭓𨭱𨯒𩻅𩽠𪭋𪭒𫂰𫞔𫻭𬰫𬲏",
 "地": "哋逇𡜤𢓧𤱲𥒦𪵸𫧜𫭩𬵍",
 "𠂢": "哌挀派眽脈衇覛㭛䖰䤨𠃄𠃄𠖒𢈕𢟿𤖼𥔠𥙎𥢝𥿯𦽤𧖴𧠨𧡒𧵬𩈛𫌪𫚺𬌰𬓘𬔾𬘦𬦱",
 "向": "响嚮姠恦扄晌晑珦逈銄餉䖮䚁𠽘𢀉𣂝𣗉𣹚𤍀𤖽𤵼𥀾𥥩𥭈𥹝𥿧𧙹𧥁𧧦𨪄𩐢𪢞𫝙𫷇𬂭",
 "艾": "哎砹銰餀鴱㘷𢈒𤈝𤵽𥐋𧰿𨿆𪻚𬹯",
 "亚": "哑垩壸娅恶挜晋桠氩铔霊㫫䅉𠼁𣌽𣺯𤖥𥰸𨻥𩂳𩔰𩤼𩬾𪝫𪿊𫥼𫳃𬁺𬷛",
 "达": "哒挞荙跶闼鞑㳠𠉂𫄤𬊉𬜔𬣵𬶑",
 "毕": "哔跸𪪼𫎳𫖒𫼣𬙝𬠃𬤷",
 "年": "哖姩脌鵇𠈠𠏎𠺈𡋂𡒛𢆘𢆡𢆤𢆥𢆫𢆭𢧚𢬧𣑻𣠊𤩻𦀅𦒌𦮴𨚶𨚽𨦧𨴞𪪈𪰟𫑑𫮱𫷗𫷜𫷞𫻽",
 "华": "哗晔烨铧骅㟆𪉊𫖇𫚘𫰡𫺆𫼧𬑓",
 "行": "哘桁洐烆珩筕絎绗胻荇衍衎衏衐衑衒術衔衕衖街衘衙衚衛衜衝衞衟衠衢裄讏銜鴴鸻㤚䀪䘕䘖䘗䘘䘙䚘䟰䡓䯒䰢𠒣𠾑𡭑𢔖𢔬𢔮𢕁𢕅𢕋𢕵𢖅𢖋𢖍𢖡𢙡𢫱𣆯𤀵𥞧𦨵𧄇𧊔𧊽𧗝𧗞𧗟𧗠𧗡𧗢𧗣𧗤𧗥𧗦𧗧𧗨𧗩𧗪𧗫𧗬𧗭𧗮𧗯𧗰𧗱𧗲𧗳𧗴𧗵𧗶𧗷𧗸𧗹𧗺𧗻𧗼𧗾𧗿𧘀𧘁𧘂𧘃𧘄𧘅𧘆𧻥𨴠𪨳𪩵𫙚𬫑",
 "农": "哝浓秾脓㶶䙶𢙐𪣑𪺻𫄣𫇽𫍦𫔖𫯒𫼮𬂰𬪩𬴩𬹖",
 "约": "哟药",
 "弄": "哢挵梇硦筭㑝㛞㟖㢅㳥𠑋𠸙𡋱𡫶𡱯𡳊𡷟𢃈𢌊𢌌𢕁𢙱𢚸𣭿𣼰𤞬𤯨𤯩𤲌𤶦𤿬𤿰𥦌𥧪𥨋𧋼𧚂𧚠𨁦𨓡𨛓𨲀𩂽𩩖𪔠𪟤𪪩𪫵𪻠𫠯𫥌𫪹𫴳𫸷𬊊𬏇𬏖𬖆𬚼𬟎𬴑",
 "赤": "哧捇浾焃硳赥赦赧赨赩赪赫赫赬赭赮赯郝頳㤸㫱㬄䓇䚂䞑䞒䞓䞔䞕䞰䤲䦝䬉𠻲𠼶𡋽𡘥𡞽𡠬𡣅𡨁𡪌𣇐𤁹𤃬𤙮𤛖𦀗𦛘𧋒𧨃𧹙𧹚𧹛𧹜𧹝𧹞𧹟𧹡𧹢𧹣𧹤𧹥𧹦𧹧𧹨𧹩𧹪𧹫𧹬𧹭𧹮𧹯𧹰𧹱𧹲𧹳𧹴𧹵𧹶𧹸𧹹𧹺𧹻𧹼𧹾𧹿𧺂𧺃𧺄𧺅𨁯𨲂𨹮𩧗𩭑𩷧𪁌𪜻𪠇𪲒𫁆𫈽𫎭𫎮𫎯𫎰𫐨𫥠𫰭𬏭𬦁𬦂𬦃𬦄𬮨",
 "那": "哪娜挪梛㑚𡌈𡷙𤥶𤶸𥭵𦀨𦰡𦶦𨁌𩈩𪽖𪿣𫑏𫖂𫛀𫭹𫴲𫸶𬛁𬠌𬪄",
 "何": "哬荷𢚨𢬲𣒍𣵣𥮆𦶒𧨂𨵅𪱊𫱖𫳵",
 "牢": "哰浶㟉䜮𠈭𢚄𢭂𣇟𣋀𣒲𤉍𤚧𥒪𥭲𦕵𦰤𨌚𨦭𩧷𪁔𫰴𫳵𬁖",
 "别": "哵捌䇷𠣶𡌀𢃉𤿱𥇂𦖇𦛺𨡊𨧢𪶃𪺤𬩁",
 "寽": "哷捋浖脟虢蛶酹鋝锊頱㭩㲕㸹㽟䟹䮑𠜖𡢙𢚃𣁷𣨅𤂅𤞙𥭐𥹽𧇛𧭣𨿐𩞟𪌳𪑋𪘤𬪃",
 "秀": "唀琇綉绣莠蜏誘诱透銹锈頺㛢䅎䞬𠃯𠉑𠐬𡾫𢓵𢭆𣒴𣜗𣮁𣵛𤒟𤥹𤯪𥏗𥙾𥢁𥣧𥤃𦏁𦽧𧚘𨴷𨹳𪁮𪣜𫵿𬊔",
 "角": "唃崅捔斛桷确觓觔觖觗觘觙觚觛觜觝觟觡觢觤觥触觧觨觩觪觫觬觭觮觯觰觱觲觳觵觶觸觹觺觻觼觽觾觿鵤㓩䇶䚗䚘䚙䚚䚛䚜䚝䚞䚠䚡䚢䚣䚤䚥䚦䚧䚨䚩䚪䚫䚬䚭𡿑𢏧𣀾𣂍𣨍𤞴𦛲𧢶𧣊𧣋𧣝𧣟𧣦𧣿𧤀𧤊𧤙𧤚𧤨𧤰𧤳𧤵𧤸𧥅𧥆𧥉𧥋𧥎𧥏𧥒𨓨𨖣𨛥𩊺𩓅𩭛𪇝𪏠𪔝𪝀𫁣𫋽𫌮𫌯𫌰𫌱𬌨𬜲𬢕𬢖𬢗𬣏𬷺",
 "含": "唅娢晗梒浛焓琀筨莟蛿誝谽鋡頷颔馠㓧㟏㟔㤷㼨䎏䣻𠉐𠤿𠹞𡌢𡪁𢧆𢧒𣘉𣢺𤙣𤚥𤞻𤭙𥆡𥓂𦛜𧶗𧹣𨛣𩈣𩐧𪁟𪕛𪘒𫤺𫭉𫺐𫺾𫻈𫼹𫾵",
 "延": "唌娫挻梴涎烻狿硟筵綖脠莚蜑蜒誕诞郔鋋駳鯅㝚䀽䗺䘰䩥𠈰𢚀𣆴𦋪𦕣𦧝𨁆𩃀𫄧𫷳",
 "酉": "唒庮梄槱歠盫綇莤蒏輏逎酊酋酌配酎酏酐酑酒酓酔酕酖酗酘酙酚酛酜酝酞酟酠酡酢酣酤酥酦酧酨酩酪酫酬酭酮酯酰酱酲酳酴酵酶酷酸酹酺酻酼酽酾酿醀醁醂醃醄醅醆醇醈醉醊醋醌醍醎醏醐醑醒醓醔醕醖醗醘醙醚醛醜醝醞醠醡醢醣醥醦醧醨醩醪醫醬醭醮醯醰醱醲醳醴醵醶醷醸醹醺醻醼醽醾醿釀釁釂釄釅鯂㻥㾞䣥䣦䣧䣩䣪䣫䣬䣭䣮䣯䣰䣱䣲䣳䣴䣵䣶䣷䣸䣹䣺䣻䣼䣽䣾䣿䤀䤁䤂䤃䤄䤅䤆䤇䤈䤉䤊䤌䤍䤎䤏䤐䤑䤒䤓䤔䤕䤖䤗䤘䤙𠥤𡂜𡜳𡷾𢍲𢭳𢹧𣁹𣄉𣤕𣫈𤂭𤍕𤏾𤖕𥃝𥆺𥎈𥟁𥡱𥭛𥴑𥵏𦈋𦡅𧂢𨁪𨟰𨟱𨟲𨟳𨟵𨟶𨟷𨟸𨟹𨟺𨟻𨟼𨟽𨟾𨟿𨠀𨠁𨠂𨠃𨠄𨠅𨠆𨠇𨠈𨠉𨠊𨠋𨠌𨠍𨠏𨠐𨠑𨠒𨠓𨠔𨠕𨠖𨠗𨠘𨠙𨠚𨠛𨠜𨠝𨠞𨠟𨠠𨠡𨠢𨠣𨠤𨠥𨠦𨠧𨠨𨠩𨠪𨠫𨠬𨠭𨠮𨠰𨠱𨠲𨠳𨠴𨠵𨠶𨠸𨠹𨠺𨠻𨠼𨠽𨠾𨠿𨡀𨡁𨡂𨡃𨡄𨡅𨡆𨡇𨡈𨡉𨡊𨡋𨡌𨡍𨡎𨡏𨡐𨡑𨡒𨡓𨡔𨡕𨡖𨡗𨡘𨡙𨡛𨡜𨡝𨡞𨡟𨡠𨡢𨡣𨡤𨡥𨡦𨡧𨡨𨡩𨡪𨡫𨡬𨡭𨡮𨡯𨡰𨡱𨡲𨡴𨡵𨡶𨡷𨡸𨡹𨡺𨡼𨡽𨡾𨡿𨢀𨢁𨢂𨢃𨢄𨢆𨢇𨢉𨢊𨢋𨢌𨢍𨢎𨢏𨢐𨢑𨢒𨢓𨢔𨢖𨢗𨢘𨢙𨢚𨢜𨢝𨢟𨢠𨢡𨢢𨢣𨢥𨢦𨢧𨢪𨢫𨢬𨢭𨢮𨢯𨢰𨢱𨢲𨢳𨢴𨢵𨢶𨢷𨢸𨢹𨢺𨢻𨢼𨢽𨢾𨢿𨣁𨣂𨣃𨣄𨣅𨣆𨣇𨣈𨣉𨣊𨣋𨣍𨣎𨣏𨣐𨣑𨣒𨣓𨣔𨣕𨣖𨣘𨣙𨣚𨣛𨣜𨣝𨣞𨣟𨣠𨣢𨣣𨣤𨣥𨣦𨣧𨣩𨣪𨣪𨣬𨣯𨣰𨣲𨣳𨣵𨣷𨣹𨣺𨣻𨣾𨣿𨤁𨤂𨤃𨤄𨤅𨤆𨤇𨤉𨤋𨤌𨤍𨤎𩟫𩭓𩱗𩳜𪈍𪧬𫑳𫑴𫑵𫑶𫑷𫑹𫑺𫑼𫑽𫑾𫑿𫢞𫤧𫥦𫵯𫹉𫿙𬄇𬉱𬌲𬐶𬜁𬪦𬪧𬪨𬪩𬪪𬪪𬪫𬪬𬪭𬪮𬪯𬪰𬪱𬪲𬪳𬪴𬪵𬪶𬪷𬪸𬪹𬯢",
 "皁": "唕𣴢𦯑𦹢",
 "亜": "唖悪𡏍𢳩𣊰𣱌𪰥𫰫𬂲",
 "走": "唗徒赲赳赴赵赶起赸赹赺赻赼赽赾赿趀趁趃趄超趆趇趈趉越趋趌趍趎趏趐趑趒趓趔趕趖趗趘趙趚趛趜趝趞趟趠趡趢趣趤趥趦趧趨趩趪趫趬趭趮趯趰趱趲跿陡鯐䞖䞗䞘䞙䞚䞛䞜䞝䞞䞟䞠䞡䞢䞣䞤䞥䞦䞧䞨䞩䞪䞫䞬䞭䞮䞯䞰䞱䞲䞳䞴䞵䞶䞷䞸䞹䞺䞻䞼䞽䞾䞿䟀䟁䟂䟃䟄䟅䟆䟇䟉䟊䟋䟌䟎䟏䟐䟑䟒﨣𠠄𢈩𢕤𢕳𢖂𤏉𥆥𦛣𧋨𧺇𧺈𧺉𧺊𧺋𧺌𧺍𧺎𧺏𧺐𧺑𧺒𧺓𧺔𧺕𧺖𧺗𧺘𧺙𧺚𧺛𧺜𧺝𧺞𧺟𧺠𧺡𧺢𧺣𧺤𧺥𧺦𧺧𧺨𧺩𧺪𧺫𧺬𧺭𧺮𧺯𧺰𧺱𧺲𧺳𧺴𧺵𧺶𧺷𧺸𧺹𧺺𧺻𧺼𧺽𧺾𧺿𧻀𧻁𧻃𧻄𧻅𧻆𧻇𧻈𧻉𧻊𧻌𧻍𧻎𧻏𧻐𧻑𧻒𧻓𧻔𧻕𧻖𧻗𧻙𧻚𧻛𧻜𧻝𧻞𧻟𧻠𧻡𧻢𧻣𧻤𧻥𧻦𧻧𧻨𧻩𧻪𧻭𧻮𧻯𧻰𧻱𧻲𧻳𧻴𧻵𧻶𧻷𧻸𧻹𧻺𧻻𧻼𧻽𧻾𧻿𧼀𧼁𧼂𧼂𧼃𧼄𧼆𧼇𧼈𧼉𧼊𧼋𧼌𧼎𧼏𧼐𧼑𧼒𧼓𧼔𧼕𧼖𧼗𧼘𧼙𧼚𧼛𧼜𧼝𧼞𧼟𧼠𧼡𧼢𧼣𧼤𧼥𧼦𧼧𧼨𧼩𧼪𧼫𧼮𧼯𧼰𧼱𧼲𧼳𧼴𧼶𧼷𧼸𧼹𧼺𧼻𧼿𧽀𧽁𧽂𧽃𧽅𧽆𧽉𧽊𧽋𧽍𧽏𧽐𧽑𧽒𧽓𧽔𧽕𧽖𧽗𧽘𧽙𧽚𧽛𧽜𧽝𧽞𧽟𧽠𧽡𧽢𧽣𧽤𧽥𧽧𧽨𧽩𧽪𧽫𧽬𧽭𧽮𧽯𧽰𧽱𧽲𧽳𧽴𧽵𧽶𧽷𧽸𧽹𧽺𧽻𧽼𧽾𧽿𧾀𧾁𧾂𧾃𧾄𧾅𧾆𧾇𧾈𧾉𧾊𧾋𧾌𧾍𧾎𧾏𧾐𧾑𧾒𧾓𧾔𧾕𧾖𧾗𧾘𧾙𧾚𧾜𧾜𧾜𧾝𧾟𧾠𧾡𧾢𧾣𧾤𧾥𧾦𧾧𧾨𧾩𧾪𧾫𧾬𧾮𧾯𧾰𧾱𧾲𧾳𧾴𧾵𧾶𩎅𪭴𫎱𫎲𫎳𫎴𫎵𫎶𫎷𫎸𫎹𫎺𫎻𫎽𫎾𫎿起𧼯𬦅𬦆𬦇𬦈𬦉𬦊𬦋𬦌𬦍𬦎𬦏𬦐𬦑𬦒𬦓𬦔𬦕𬦖𬦗𬦘𬦙𬦚𬦛𬦜𬦝𬦞𬦟",
 "狄": "唙悐梑荻逖䯼𠜓𢙹𥇃𥭳𦛡𧼃𩷎𪶆",
 "麦": "唛麸麹麺𤿲𥟀𥪣𦼆𧵷𨀱𨅫𨌐𨦎𨫺𨹧𨺮𪌛𪎈𪎉𪎊𪎋𪎌𪎏𪎐𪽂𫜑𫜒𫜓𫜔𫜕𫧮𬍞𬹅𬹆𬹇𬹈𬹉𬹊𬹋𬹌𬹍𬹎",
 "末": "唜妺帓抹昩枺沫皌眜砞秣粖膥茉袜靺韎㭆㭐㶬䏞䬴䱅䴲𠅍𠅒𠇱𠖾𠰌𡊉𡘮𢗿𣔍𣖛𣖢𣚺𣝖𣞄𣧣𤿖𤿗𥘯𥬎𥿉𦥦𧿴𩎟𩑷𩠿𩢖𩿣𪜑𫈪𫖀𫤳𬑉𬗱𬘚𬟼𬰠",
 "贡": "唝𫎬𫝪𫢟𫺌𫼱𬊎𬕂𬠈",
 "抖": "唞",
 "劳": "唠崂捞涝痨铹𣓿𤙯𦛨𫞧𫢬𫦰𫭼𫺘𬝃𬣿𬧤𬶗",
 "皂": "唣梍𡨗𤟀𪣝",
 "奂": "唤换痪㛟㪱㬇𡺎𢚾𤥺",
 "冷": "唥𣇝𪞠𪞧𪨺𪲜𫥕𫥖𫥘𫥜𫭶",
 "即": "唧堲揤楖節莭蝍鯽鲫㑡䐚䳭𠨞𠨠𡖖𡷦𡸎𣁚𣡑𣩃𣹜𤾽𥠈𨂢𩼚𪃹𪠂𪡰𪪗𪺄𪺜莭䳭𫨀𬅔𬅖",
 "阻": "唨𦯓𨂀𪠭𪩁𫽖𬨱",
 "刷": "唰涮𢯍𤷯",
 "戾": "唳悷捩棙淚睙綟蜧錑㑦㪐䈆䓞𡝢𡸒𤟑𥓎𦅺𦜏𧩈𨁸𨉕𩗭𫄫𫑐𬭜",
 "羌": "唴溬猐琷羗蜣錓㛨㳾𠊡𠻁𡠎𡬎𡬎𡬎𣘎𥇉𥓌𦍑𦏱𦏱𦏱𧇞𧎉𩸑𩹦𪁸𪉬𪲞𫹕𬁿𬝆",
 "念": "唸惗捻敜棯淰焾稔腍艌菍諗谂趝踗錜騐鯰鲶㑫䂼䄒䧔䭃𡹓𢈸𨡎𨡣𩋏𩐭𩑉𪌿𪑡𪞤𪪆𪫶𪯺𪳋𪺥𫓻𫫞𫱁𫾿𬑛𬠖𬹌",
 "析": "唽惁晰晳椞淅皙菥蜤蜥㱤䨛𠵍𣨗𥇦𥓊𥮥𥺚𩗱𪁻𪻩",
 "忽": "唿惚淴鍃锪㧾㺀䓤䨚䬍𡝲𡱽𢽨𣇤𤙹𥇰𦁕𦖟𧇰𧩓𩋚𩭳𪂒𪍃𪯏𪲨𫆒𫜚𫻜𬊡𬲀",
 "厓": "啀娾崕崖捱涯睚䝽𠊎𢛄𣔦𤦐𥯅𦁩𦲒𧍊𧡋𧢏𨂉𪘬𪞢𪺾𫨾",
 "乳": "啂㐠㳶𠄀𠄇𠄉𡇲𡔵𡝦𡨻𡮈𡮑𡲐𢆡𢉚𢯚𣈃𤭤𥇽𥯇𦜘𨨜𨼼𩸐𪜛𪞺𬋲𬌢",
 "肯": "啃掯褃錹𡞚𣔨𥺾𧨷𨌳𨔑𪣩𫠶𫻴𬂕𬒔",
 "冏": "商巂浻烱矞綗裔雟㓏㤯㩦䢛䮐𠕨𡖛𡸀𣚹𤄴𤐟𤔦𤳬𥱁𥺂𦈇𦯶𧓠𧔸𧞥𧥏𨘆𩽗𪕥𪻣𫕕𬚽",
 "阿": "啊娿婀屙痾錒锕㢌䋪𠥍𡹣𣶰𨵌𨼼𫕖𫮄𬁭𬮰𬯜𬯣𬯩",
 "享": "啍嚲孰崞弴惇敦朜椁淳焞稕綧蜳諄谆郭醇錞鞟韕鯙鶉鹑㝄㝇㝇㨃㬀䇏䧐䵍𠆓𠆔𠆞𠩭𡥹𡦚𡦛𡦟𡦡𡦨𡭅𢨊𢴒𢻓𣋄𣮢𤏂𤭞𤰎𥇜𥚠𧰄𨟞𨠺𨪃𨬤𨿡𪂎𪏆𪑒𪧃𪸿𪹱𫢷𫣬𫨿𬍳𬘯𬝇𬭚𬴻",
 "𢼄": "啓晵棨綮肇䁈𫆈𫴟𬀐",
 "匋": "啕掏淘祹綯绹萄蜪裪醄鋾陶騊䛬𠊐𠏈𡍒𢔇𥂩𥓮𥮽𦃥𦻦𨂆𨌨𨼞𩋃𪌼𫑂𫘦𫱀𬤁𬯈",
 "叕": "啜娺惙掇敠敪棳欼歠毲涰畷窡綴缀罬腏蝃裰諁輟辍逫醊錣餟鵽㙍䄌䆯䝌䞵䟾䦤䫎䮕𠖎𠟝𠭋𠭴𠮄𠮐𠮒𠼆𠿡𡂜𡌭𡢑𡢷𡨤𡩿𡪚𡪧𢿺𣇽𣤌𣤜𤿵𥏞𥟒𦆌𦋖𦔢𦦖𧚰𧡏𧱝𨺝𨿷𩈽𩋁𩑇𩟫𩸯𪓭𪠰𫕓𫧴𬖤𬝉𬳂",
 "启": "啟𠶶𢩙𢩙𢩝𣘼𣙅𣚩𨌋𬚫",
 "斦": "啠質",
 "卸": "啣御𦖐𧌋𨓴𨨶𪩆",
 "拉": "啦菈鞡𡝰𤷟𬠏",
 "卦": "啩掛罫褂𥦛𦁊𨵗𩳴𫙌𬠎𬮯",
 "拍": "啪𣁨",
 "转": "啭",
 "齿": "啮龀龁龂龃龄龅龆龇龈龉龊龋龌𪚏𪚐𫜨𫜩𫜪𫜫𫜬𫜭𫜮𫜯𫜰𫠜𫱿𬭔𬹺𬹻𬹼𬹽𬹾𬹿𬺀𬺁𬺂𬺃𬺄𬺅𬺆𬺇𬺈𬺉𬺊𬺋𬺌𬺍𬺎𬺏𬺐𬺑𬺒𬺓𬺔𬺕𬺖",
 "国": "啯帼掴椢腘蝈𠏹𫂆𫭔𬇹𬜿𬧩",
 "罗": "啰椤猡逻锣㑩𪶒𫏑𫗩𫭽𫽋𬂂𬊜𬒓𬡠𬰡",
 "岩": "啱㛧𡺻𢽡𣷰𤊤𤷳𥇷𧌹𩜠𩸶𬍰𬚩𬚩𬚩𬧥𬲿",
 "的": "啲菂𢯊𤷭𦖡𦗽𦝂𩭲𪦼𫂇𫒫𫴿",
 "波": "啵婆碆箥菠錃㨇𠴸𢯠𢳲𥇲𨨏𩜤𩜥𩸓𪣭𬠚𬭛",
 "定": "啶婝掟椗淀琔碇綻绽腚萣蝊諚錠锭靛顁㱨䘺䧑𠗞𡹦𢏹𢛸𢺫𣎡𤊟𥇓𥋫𥟐𥲗𥸟𦩘𩜦𩸎𪏉𪯻𫐲𬓆𬕖𬖣𬱫",
 "郎": "啷嫏廊榔瑯蓈螂鄉鎯㾿𠌇𠗷𡏅𢀨𢲲𤎜𤠸𥱳𥶨𦂧𦗏𧜛𧽗𨄂𨉰𨖅𨱍𪤼𪺆𫑯𫑱𫵉𬁈𬅙𬓌𬛋",
 "肃": "啸箫萧骕鹔㙌㴋𩙨𪮋𫦅𬒕𬚄",
 "弇": "啽媕揜渰葊鞥黭𠝢𡹮𢜰𣉂𥚫𦝡𧍬𧩸𩀂𪂻",
 "客": "喀愘愙揢楁碦額额髂㟯䘔𡪞𡫥𡫥𡬚𡬚𡬚𢾏𣣟𥻞𥽴𥽴𦂦𦝣𨂥𨍇𩋽𩤩𩭽𩹃𪃭𪘺𪻽𫋍𫒴",
 "南": "喃婻揇暔楠湳煵献罱腩萳蝻諵遖㑲㓓㣮㵜䈒䊖䋻䌾𠄼𡎜𢆥𥀇𥈶𥠮𦣰𨂾𨝿𨡯𨩇𨩧𨵴𩄑𩹞𪃢𪑮𪤟𪩂𪻳𫌢𫗕𫡫𫡵𫧣𫷜𬆩𬌹𬍍𬛈𬛩𬳄",
 "昱": "喅煜䗑𡟄𣊂𣸭𥳲𧼺𬍶",
 "剌": "喇揦揧楋溂瘌蝲鬎鯻㻝䏀䓶䱫𡇿𢃴𢉨𢔯𤀦𤊶𥈙𥖍𥻃𥻌𦖨𧩲𩋷𩘊𩤲𩨉𪘼𫥑𬶟",
 "侯": "喉帿猴瘊睺篌糇緱缑翭葔鄇鍭餱鯸㬋㮢䂉䗔䙈䞀䫛䳧𠋫𡗁𡟑𡹵𢜵𣣠𤧝𤬈𥀃𦑤𦞈𧇹𧩨𧯁𨂸𩃺𩋴𩘋𪃶𪈱𪑻𪹍𫗯𫛺𬥽𬭤",
 "州": "喌栦洲絒詶酬銂駲㖄𠀦𢓟𢫧𤥅𥒁𦭴𧋀𨠩𪣏𪰢𬣱",
 "郁": "喐㮋𣹙𦵁𩡏",
 "枯": "喖𢉽𤋹𩹬𬃱𬄮𬅂",
 "軍": "喗媈惲揮暈暉楎渾煇琿瘒皸皹睴禈緷翬腪葷褌諢賱輝運鄆鍕韗顐餫鯶鶤鼲齳㑮㟦㡓㫎㹆䝍䡣䩵䮝𡍦𡺠𢉦𢧰𢸏𣄈𣣞𣨿𤐕𤟤𤟴𤾈𥣐𥪠𥰃𦑩𦾥𧆃𧎊𧡡𧮘𧮘𧳰𨂱𨋿𨌗𨘙𨞎𨡫𨰀𩙵𩠫𩮔𪏕𫏼𬒚𬦖",
 "彖": "喙掾椽橼湪猭瑑盠禒篆緣缘腞蒃蝝蠡褖餯㑰㥟䂕䗍䛹䞼䤸䧘䱲𡒰𡓬𡩀𢍝𢐄𢞶𣂵𣈬𣨶𤊺𤬌𤬤𤸁𥂻𥂼𥯵𦑙𦧫𦧬𦪶𧳩𨂦𨔵𨙅𨣰𩀅𩄖𩌁𩔂𩘐𩫞𫀿",
 "奐": "喚寏愌換渙煥瑍瘓𪣷𪲰𫃴𫙪𬓋𬧸",
 "爰": "喛媛嵈愋援暖楥湲煖猨瑗禐緩缓萲蝯褑諼谖鍰锾鰀鶢㣪㬊䁔䈠䐘𠋠𤲫𥔛𦅻𦇻𦑛𦖵𦩮𦫦𧡩𧳭𩋫𩏅𩔃𫏖𫏺𫕉𫣰𫮊𬁆𬋫𬥢",
 "壴": "喜嘉壾尌彭皷鼓鼔㛸㰻䐍𠃸𠊪𠷸𡅦𡒡𡒢𡔷𡔹𢜳𢝫𣞙𣠃𤮵𥀻𥀼𥀽𥀾𥖗𥖫𥚧𧄓𧯻𧯼𧯾𧯿𧰀𧰇𧰊𧰋𧰒𧰓𧰕𧰘𧰠𧰡𧰣𨔦𨲗𩙏𩟚𪟌𪤱𫹙𫻿",
 "卽": "喞",
 "胃": "喟媦渭煟猬稩緭膚蝟謂谓㙕㥜䁌䬑𢔥𢯮𣉌𣖜𤁿𤮣𥚷𦝩𦡾𦩝𦳢𧳪𧼫𨩋𩋤𩤸𩨅𩹂𪞦𫆿𫑤𬔤",
 "呴": "喣",
 "宣": "喧媗愃揎暄楦渲煊瑄睻碹箮縇翧萱蝖諠鍹鰚䙋䳦𠊿𠝳𡪏𡺟𢯕𤚗𤟿𤠊𤸧𦋠𧡢𩀈𩋢𩏆𩘒𩝑𩤡𪃗𫕍𬤎𬧂𬳇",
 "亮": "喨湸煷𢝋𪱧𪳄𫮌𫱍",
 "呑": "喬𠾹𩳝",
 "冋": "喬尚扃泂炯絅苘詗诇迥駉㢠㺾䌹䯧𠇶𠕧𠖷𠡋𠨄𠳮𡒼𡔮𡢠𡶝𢄗𢇺𢱪𢾠𣅻𣐒𣘺𤏕𤠬𤾘𥑎𥛒𥡺𥦮𥨷𥩓𥭩𦳖𧺸𧾫𨃧𨎄𨓺𨢗𨥽𨴀𨺷𨻠𩌚𩕴𩤬𩫌𩺙𪕍𪫪𫁋𫁝𫋊𫘍𫞎𫞏𬗶𬳶𬴛",
 "食": "喰湌篒飡飧飨飱飸飺餈養餍餥餮饂饏饔饕饗饜䉵䓹䬤䬥䬩䬭䬸䭁䭆䭌䭕𣈮𤸤𤼛𥴝𥷓𦻂𧃊𧅔𨢁𨩭𩚇𩚏𩚓𩚜𩚴𩚷𩚻𩛁𩛄𩛈𩛒𩛕𩛗𩛚𩛛𩛜𩛢𩛰𩛳𩛻𩜔𩜕𩜢𩜥𩜨𩜬𩜸𩜻𩜾𩝓𩝕𩝖𩝩𩝫𩝵𩝶𩞕𩞹𩟚𩟨𩟷𩟸𩮍𪞓𪦿𫔨𫗍𫗒𫗚𫗝𫷸𬨷𬪢𬲏𬲕𬲖𬲟𬲢",
 "約": "喲箹葯𡟅𢰹𧼿",
 "查": "喳嵖揸楂渣猹皶碴蹅餷齄㜁㾴𣉎𥻗𦉆𦳘𨩨𩮎𪃵𪙁𬊩𬠜𬭠",
 "威": "喴媙崴揻楲縅葳蝛隇鰄㙎𠋘𣸵𥔃𦞏𦩬𨜠𨩆𫶆𬕚",
 "苗": "喵媌庿描渵猫瞄緢貓錨锚鶓鹋㑤䅦𣈴𤚐𤸠𦏒𦱓𦹣𧍣𧓵𪃞𪣲𫳝𫿁𬃝𬉙",
 "奎": "喹楏煃睳蝰鍷㛻㥣㨒䠑𠝥𡙔𪑭𪶙",
 "係": "喺𦵠",
 "急": "喼稳隐㴔𢞀𢰽𤌀𥈲𦳌𦻕𪂺𪬎𪬽𬃡𬧫",
 "𣪊": "嗀彀愨榖瑴瞉糓縠螜觳豰轂鷇㜌㝅㲉㷤㺉䍍𡠆𣪥𣪳𣪹𣪺𣫂𣫌𣫎𣫓𥀎𥔳𥔼𥡛𦎯𧹲𪍠𪍢𪕷𫜕",
 "臭": "嗅搝殠溴糗螑鄓齅㱗䠗𣗬𤚯𥽙𦒥𦤕𦤚𦤟𦤠𦤡𦤣𦤦𦤧𦤨𦤪𦤬𦤮𦤯𦤰𧽒𨞑𨶑𩈸𩝠𩡗𫇌𫇍𬔏𬛯𬳌",
 "邕": "嗈郺雝齆㜉㴩𢀄𢀍𤕆𦃽𦉨𦞡𧜇𨝖𨞑𩌋𩏔𩔪𪄉𪖵𪪝",
 "貢": "嗊幊愩慐摃槓熕碽篢贑贛䔈𠗸𠞖𡎴𡟫𡺭𡻃𢥮𢩛𣃐𣹟𤐾𤕙𤗤𤣣𤳢𥈿𥛌𥧡𥨐𥨨𦩼𧜙𧷱𧹃𧹃𨫋𨶛𩌌𩐵𩑅𩫢𩹸𩼲𪄌𪝖𪱮𪷎𫋐𬗯𬧄",
 "脅": "嗋愶搚熁㙝𣣲𣹩𫉆",
 "益": "嗌搤榏溢獈縊缢膉艗螠蠲謚谥貖賹鎰镒隘鷁鹢齸㜋㬲㱲䅬䚊𡒪𡺬𣣼𤐹𤸸𥂺𥃠𦶩𦿯𧔈𨜶𨢘𨶂𨽪𩔱𪕶𪝞𪟢𪤴𪬘𫆌𬎃𬐭𬙻𬦜𬧬",
 "朔": "嗍塑愬搠槊溯蒴遡鎙㮶𢍥𣺩𥉮𦃗𧪜𧫋𪇐𪹛𫏤𫔈𬂚𬂚𬂚",
 "茶": "嗏搽𤨓𤯊𥧣𨃓𨪩𪄦𫅷𫉕𬞠",
 "盍": "嗑圔廅搕榼溘灎熆瞌磕篕蓋豔醘鎑闔阖饁鰪㔩㕎㥺㯼䐦䗘䫦𠥕𡏖𡻊𢄍𢩘𢾩𣣹𣩄𤠡𤸱𥂇𥃕𥛐𦔏𧅔𧛾𧪞𧰟𨍰𨜴𨸍𩇠𩌍𩮨𪔮𪝙𫇤𫎽𫐔𬤒",
 "桑": "嗓搡槡磉縔褬鎟顙颡㯩䡦䮣𡕏𡠏𡳨𡳭𢧱𢻚𢾪𣉕𣌛𣙰𣜹𣜽𣞙𣞰𣞵𣡆𣡉𤖒𤸯𥛋𦟄𦶿𧏠𨢆𨻗𩮧𩺞𪤌𪳫𪶽𪼏𫶐𬧉𬨑",
 "烏": "嗚嵨摀歍溩熓瑦螐鄔鎢隖鰞㮧䃖䖚䡧𠌥𠞆𠥹𡀴𡈎𡠄𢄓𢞬𣦑𣯑𤑎𤸼𥻼𦶀𧪛𧽋𨶇𨻑𩈺𩌗𩝷𩮮𪄝𪏝𪦭𫕜𫖤𬚭",
 "耆": "嗜愭搘榰蓍螧鬐鰭鳍䅲𡺸𣯆𣹡𥉙𦔌𦞯𧡺𧪡𨢍𨪌𩥂𩥞𪄖𫂓𫎟𬤓",
 "鬲": "嗝搹槅滆翮膈蒚融螎鎘镉隔鞷鬳鬴鬵鬶鬷鬸鬹鬻鷊鹝㣂㬏䃒䈪䙐䛿䣓䩹䰙䰚䰛䰜䰝䰞𢑋𢖉𢾿𤄵𤅬𤗦𤫨𤮄𥉅𥵰𥻥𦃔𧓞𧖓𨍮𨏬𨢌𨤅𩇒𩍻𩰫𩰭𩰮𩰯𩰰𩰱𩰲𩰳𩰴𩰵𩰶𩰷𩰸𩰹𩰻𩰼𩰾𩰿𩱁𩱂𩱃𩱄𩱆𩱇𩱇𩱈𩱉𩱊𩱋𩱌𩱍𩱎𩱏𩱐𩱑𩱒𩱓𩱔𩱕𩱖𩱗𩱘𩱙𩱚𩱛𩱜𩱝𩱞𩱟𩱠𩱡𩱢𩱣𩱤𩱥𩱦𩱧𩱨𩱩𩱪𩱫𩱬𩱭𩱮𩱯𩱰𩱱𩱲𩱳𩱵𩱶𩱷𩹺𪈊𪢙𪽶𫆋𫙄𫙅𫙆𫙇𫬋𬌑𬤑𬴲𬴴𬴵𬴶𬴷𬴸𬴹𬴺𬴻𬴼",
 "兹": "嗞孳嵫慈滋甆磁禌稵糍鎡镃鶿鷀鹚㽧䈘𡙛𡞰𡢫𢰩𣕜𣜑𤀟𤂇𤧹𤲸𥖃𦔒𦖺𧛏𩝐𩼑𫚤螆𬗭𬝘",
 "昷": "嗢媪愠揾榅殟氲温煴瑥瘟緼缊腽蒀藴蝹褞豱輼辒醖鎾鞰韞韫饂馧鰛鳁㬈㼔䯠𣌃𤒸𤛁𥔋𥫊𦤨𦪯𦻲𧄧𧪍𨵷𩄅𩟣𪓲𪝑𫀚𫔹𫙃𫜊殟蝹馧𫧩𬟇",
 "蚩": "嗤媸滍㺈䥀䧝䩶𠋷𢱟𢾫𣣷𤚍𥉍𦞲𨖀𩺉𬖲",
 "皋": "嗥暤槔滜獆皞翱鷎㟸㿁䔌䜰䣗䫧𡟷𤺃𥡅𥻷𨎀𫑯𬸢",
 "索": "嗦溹鎍㮦䅴䌇䖛䞽𠋲𡩡𢱢𤌘𤸴𥰼𥻨𦃆𦅕𦆽𦵫𧎳𧛻𩄜𩌈𩘝𩮛𪍟𪟹𫔅𫦎𫧫𬵠",
 "海": "嗨塰𬕧",
 "秦": "嗪嫀搸榛殝溱獉瑧縥臻蓁螓轃䆐䆐䆐𡏑𡻈𣡎𤚩𥉜𥱧𦽥𧽕𨪦𩌘𩘢𩥚𪄈𪒆𪜞𫀜𫮔𬛌",
 "聂": "嗫慑摄滠蹑镊䯅𦈙𪳍𫌇𫒅𬥄",
 "荷": "嗬𬄋",
 "晒": "嗮",
 "恩": "嗯摁煾蒽䅰𡟯𢞴𤨒𤹕𨪜𪩊𫣆𬃼",
 "個": "嗰𬚅",
 "拿": "嗱鎿镎𠌧𫦏𫱗",
 "爹": "嗲𪦕𪮟",
 "爱": "嗳嫒暧瑷𩡖𪳗𫂖𫆫𫉁𫣊𬊺",
 "羗": "嗴獇𦗅𧏙𨪢𪼎𫣌𫹝𬁍",
 "通": "嗵樋熥蓪𡠙𡾁𢄟𢠆𢳟𣻢𥲆𥶥𦄷𦪏𧐺𨙖𨫤𨯁𩐹𫍌𫮢",
 "畢": "嗶彃滭熚篳縪罼蓽襅蹕鏎鞸韠饆驆魓鷝㓖㪤㮿㻫䟆䬛𠌫𡠚𡻞𢕏𢳂𣯴𤠺𤹝𥀕𥛘𧫤𧰆𨢡𩪖𩺷𪋜𪍪𬯕",
 "庶": "嗻嫬摭樜熫蔗蟅謶蹠遮鏣鷓鹧㫂㵂䉀䗪䩾䭖𠌮𡻠𢠫𤯋𤳌𤳐𤳯𤳼𥷿𦄝𧜥𩔼𪪩",
 "欶": "嗽嫰摗樕漱瘶簌蔌遬鏉𠘂𡣂𢹀𤡃𦌊𧐁𧫷𧷕𨱒𩌱𩐋𩐕𩮶",
 "族": "嗾瘯簇蔟鏃镞鷟㵀䃚𡆈𡆍𡻬𢄧𢳇𢳈𧐈𨄕𩀥𩺯𩻀𪟒𪼕𫦓𬸦",
 "啇": "嘀嫡摘敵樀歒滴甋蔐謫谪豴蹢適鏑镝㠃䁤䊞䎮䐱䙗䮰䵂𠐝𠒿𠞶𠢗𣂉𣯵𤠻𤨬𤹞𥕐𥛚𥡦𥧮𪄱𪐏𪹧𫕒𫘮",
 "梟": "嘄蟂鄡𡏭𡠿𢳚𣘖𣻏𤡔𥉼",
 "崖": "嘊漄𥊅𨖭",
 "教": "嘋漖䃝𢠛𥲯𨬊𪖄𪳞",
 "戛": "嘎𢟟𢧖𣼸𦸘𬫿𬲚𬳎",
 "虖": "嘑嫭摢歑滹罅謼鏬㙤㦆㯉㻯𡻻𢧶𤗭𤹣𥏽𥕕𥲉𦉑𧗌𨄥𨝘𨻲𫷽𬔑𬠦𬤙",
 "彗": "嘒慧暳槥熭篲蔧轊鏏㨹㻰䨮𢄣𢑹𢟩𦄑𦒄𩏚𫐕𫳯𬭬",
 "國": "嘓幗慖摑槶漍爴簂膕蔮蟈𡳚𢐚𢠝𢧷𣂽𤎍𤔩𤡓𤮋𥊞𥕏𦄰𧰒𨉹𨫵𩠲𪅦𪤑𪼓𫏜𫛐𫱣",
 "虚": "嘘憈戯歔覷觑譃驉魖鱋㠊𢣧𤺞𥋖𦪡𧇊𨝹𩴥𪆛𪙫𪹣𬞲𬶬",
 "婆": "嘙蔢𡼃𪳪𫾀",
 "得": "嘚𡐙𣘱𤹬𥊤𥕣𪮦𫣓𬈫𬋂",
 "麻": "嘛塺嫲摩犘磨穈糜縻蔴靡髍魔麼麽麾麿黀黁黂㦄䕷䜆䩋䯢䲈䳸䵇䵈䵉𠞥𡣥𡻥𡿌𢋙𢋲𢌁𢌑𢒺𢠩𢳀𣊍𣙪𣡂𤎎𤔨𤯌𤾝𥂓𥉵𥊚𥢂𦓡𦗕𦟟𧀋𧂷𧃲𧔕𧫼𧮠𨄬𨬈𪎑𪎒𪎓𪎔𪎕𪎖𪎗𪎘𪎙𪎚𪎛𪎜𪎝𪎞𪎟𪎠𪎡𪎢𪎣𪎤𪎥𪎦𪎧𪎨𪎩𪎪𪎬𪎭𪎯𪎰𪎱𪎲𪐎𪓹𪪤𪿳𫂟𫃎𫜖𫜗𬍄𬹏",
 "麥": "嘜麧麨麩麪麫麬麭麮麯麰麱麲麳麴麵麶麷䥑䨫䮮䴬䴭䴮䴯䴰䴱䴲䴳䴴䴵䴶䴷䴸䴹䴺䴻䴼䴽䴾䴿䵁䵂䵃䵄䵅䵆𠍅𨇞𨮽𩍔𪄳𪋼𪋽𪋾𪋿𪌀𪌁𪌂𪌃𪌄𪌅𪌆𪌇𪌈𪌉𪌊𪌋𪌌𪌍𪌎𪌏𪌐𪌑𪌒𪌓𪌔𪌕𪌖𪌗𪌘𪌙𪌚𪌜𪌝𪌞𪌟𪌠𪌡𪌢𪌣𪌤𪌥𪌦𪌧𪌨𪌩𪌪𪌫𪌬𪌭𪌮𪌯𪌰𪌱𪌲𪌳𪌴𪌵𪌶𪌷𪌸𪌹𪌺𪌻𪌼𪌽𪌾𪌿𪍀𪍁𪍂𪍃𪍄𪍅𪍆𪍇𪍈𪍉𪍊𪍋𪍌𪍍𪍎𪍏𪍐𪍑𪍒𪍓𪍔𪍕𪍖𪍗𪍘𪍙𪍚𪍛𪍜𪍝𪍞𪍟𪍠𪍡𪍢𪍣𪍤𪍥𪍦𪍧𪍨𪍩𪍪𪍫𪍬𪍭𪍮𪍯𪍱𪍲𪍳𪍴𪍵𪍶𪍷𪍸𪍹𪍺𪍻𪍼𪍽𪍾𪍿𪎀𪎁𪎂𪎃𪎄𪎅𪎆𪎇𫆯𫉍𫜐𫭑𬗴𬹂𬹃𬹄",
 "斛": "嘝槲蔛㩂䈸𡐗𣘳𥡿𫁚",
 "勒": "嘞簕鰳鳓𢳝𣼷𤨕𤨙𦟯𫓀𫕬𬧊",
 "都": "嘟𡳢𡳣𡳤𡼞𢵋𣛭𥳉𦡄𦺥𧬥𧷿𧹼𨅮𨗊𨟞𩼁𪴄𬠩",
 "戞": "嘠",
 "堂": "嘡憆摚樘漟瞠糛膛螳蹚鏜镗闛隚鞺饄鼞㑽䣘𡠠𤎌𤛋𤨠𨎋𨎖𨝦𨞱𨟐𪺃𬝾",
 "野": "嘢墅𣼫𤍓𤡒𧐓𫽼𬫀",
 "婴": "嘤撄樱璎瘿缨鹦𪧀𪩎𫔉𫝭𫷾𬤚",
 "徙": "嘥屣漇簁縰蓰褷蹝㿅𢇌𢊚𢒩𢒲𢳜𣘩𣯪𥊂𥛨𩌦𫄳𫆎",
 "密": "嘧樒滵蔤㑻㨸䈼䌏𡫨𢹫𥉴𦟽𧷦𪅮𪾺𫆴𫳹𫴚𬖵𬮒𬰢𬵨",
 "粛": "嘨簘繍䔥𤂣𦇋𩥶",
 "華": "嘩嬅撶曄曅樺澕燁璍皣瞱譁鏵鞾韡驊鷨㒯㠏㦊䅿𡪤𤒃𥛵𦠜𦪠𦾏𧂽𧃹𨅯𨣄𨶱𩀵𩏧𩻮𪏥𪟥𪩓𫖛𫛓𬒢𬚦𬟠",
 "買": "嘪簤蕒賣鷶㜥㵋䁲䚑𠃅𡣧𡤓𡤔𡮨𡮳𢠼𢵯𣛠𣩥𤛬𧘃𧶶𧷓𧸏𨊋𨙋𨞝𨽤𩀺𩍃𩴬𪦲𫂥𫎚𫡠𫣿𫼇𬄹𬄽𬎘𬏽𬔫",
 "然": "嘫撚橪燃繎蹨㒄㜣㦓㬗䔳䳿𡑋𡮫𣰂𤡮𤺱𥊶𥢯𥳚𩉄𪷖𫻜𬙇𬬊",
 "最": "嘬撮樶熶穝繓蕞襊㵊䴝𡡔𢄸𢢇𢸶𣋁𣠏𣩡𤑧𥊴𥕸𥪳𥳣𦈛𦦣𨅎𨣅𨼥𩯉𪒙𪙦𪧨𪱕𬓙",
 "彭": "嘭憉澎甏膨蟚蟛㱶𠎎𡐶𢵓𤡭𤺬𥕱𥕽𥛱𥛻𦅈𦗭𦪟𨅘𨎧𨭌𩻬𪹫𫄵𫚩𬭵",
 "肅": "嘯彇橚歗潚熽璛簫繡蕭蟰鏽驌鱐鷫㔅㩋㪩㬘䃤䊥䎘䐹𠏐𡅣𡼣𦘤𦪓𧑛𧽷𨅋𩘹𪆭𪬵𫱷𬣉",
 "属": "嘱瞩㔉𣃁𣚚𪅱𪹳𫍏𫿗",
 "朝": "嘲廟潮謿𠎫𡡲𡼼𢀭𢢅𢴿𣊿𣋂𣎢𣛨𦺓𨅹𨗛𩻹𪆘𪤾𫑱𫡯",
 "觜": "嘴蟕𣚀𪬰𫙾",
 "臯": "嘷曍橰獋皥翺鷱𡠖𤩢𥢐𧞠𧢌𧬁𧯌𨎦𨝲𨼍𩀹𩏤𩕍𫽿",
 "無": "嘸嫵幠廡憮撫橅潕璑甒瞴膴蕪蟱譕鄦鷡㒇㣳㶃㷻䉑䌗䍢𠓺𠢬𢅊𣊲𤏠𥕻𥼣𨅐𨖴𨝬𨶭𨼊𩻚𫡟𬍇𬐳𬪡𬪥",
 "覃": "嘾憛撢曋橝潭燂瞫磹禫簟罈蕈蟫譚谭贉醰鐔镡驔鱏鷣㜤㻼㽑䊤䐺䚓𡼬𢅀𢕯𤑶𥢏𥨎𦅰𦗡𧝓𧰘𧽼𨅭𨊈𨝸𩀽𩙀𩡝𪍵𪒤𫎫𫖊𫜃𫣗",
 "絜": "噄潔緳㓗䐼䥛𠎧𡐤𢴲𣚃𤏦𤩦𤺚𥊯𥢪𥪲𪅸𪿶𬭴",
 "敦": "噋墪憝憞撉撴暾橔潡燉獤礅譈蹾鐓鐜镦驐鷻㬿㻻䃦䔻䪃𠎄𠓎𡡬𡼖𣦤𥂦𥋆𦪔𧅐𧑒𧝋𧝗𪆃𪆝𫄃𬚧𬤣𬸫",
 "翕": "噏嬆嶖歙潝熻蹹闟㒆㩉㪧㬛㯓㽂䁯𠟊𣯾𣰅𤛣𦪙𧝅𧬈𨎰𨝫𩰙𩻵𪅲𪼜𫋞",
 "皐": "噑暭槹獔皡翶䝥𣠘",
 "虛": "噓戱𡰐𡾟𢴮𣚛𤂴𤡣𥕰𥛳𧇠𧇺𧝔𧴆𨼋𩏣𫣞",
 "琴": "噖䔷𡡱𣚶𣾔𤩍𦠴𨬩𫾂𬎋𬒠",
 "禽": "噙擒檎蠄𠘅𢢬𣍗𤢌𥋼𥼝𦔟𦡬𧈛𧴐𨆓𪒭",
 "尋": "噚彠憳撏攳樳潯燖璕蕁蟳襑鄩鐞鱘㜦䫮𠟢𡑎𡼢𢒫𢿼𣎟𤛧𥖇𥢛𥳍𦅀𦠅𧀷𧁘𧂇𧂗𧫿𨟈𨼔𪿃",
 "歯": "噛齢𪗱𪘂𪘚𬬜𬹴",
 "鲁": "噜撸橹氇澛穞镥𬧔𬶳",
 "絲": "噝蕬䏈𤡨𥷞𦂞𦃟𦆩𨖾𩕛𪆓𪦤𪦥𪷜𫯼𬗶",
 "達": "噠撻橽澾燵繨薘蟽躂鐽闥韃㒓㣵㺚㿹䃮𠁺𢺂𤄢𦡯𦪭𧞅𧬻𩟐𫸉𬵮",
 "奧": "噢嶴懊擙澳燠礇薁襖鐭隩㜩㠗䉛䐿䜒䴈𠆇𡒃𡪿𣋉𣡉𣤡𤺾𨞓𩼈𪴃𪼣",
 "哭": "器𥂍𫬢𫬣𬍌",
 "筮": "噬澨遾㭀𢶅𥰰𥵼𨼹",
 "雍": "噰壅擁澭甕癕罋臃蕹饔㒕㙲㻾㽫䗸𠂅𡗌𢋊𢢓𢶜𤢐𦡈𧝸𧴗𩆄𩍓𩏨𪇉𪖿𬆳𬐷𬪘𬬑𬳓",
 "虞": "噳澞鸆𡑾𥵂𦾚𩦢𪋬𪝭𪩽",
 "道": "噵導檤㘏䆃𠁛𠿱𡚑𣜦𣿪𥽌𧒴𨭪𬧖",
 "葛": "噶嶱擖獦礍臈譪轕㵧䗶𡑪𢢖𣰌𤩲𥀥𥢸𦅶𧝶𩯝𩼙𪆰𪙰𬸭",
 "歆": "噷嬜𢋆𢣇𣋚𤻐𥋵𥵗𨮈𫉮𫘃𫻎",
 "頓": "噸𦼿",
 "新": "噺澵薪㜪𨑁𪧭𪬴𫚀𫣩𬎖𬷵",
 "窨": "噾",
 "翠": "噿濢璻臎䕜𡣝𣝦𥖮𪺀𫓚𫾒𬡳",
 "翟": "嚁嬥戳擢曜櫂濯燿矅籊糴糶耀藋蠗趯躍鑃鸐㒛㪬㺟㿑䊮䌦䢰䴞𡒔𡽢𢖈𣠜𣤩𣩰𤛹𤾫𥜔𥣞𦒰𦡱𧅈𧅛𧥋𧸭𨞩𩴹𫃙𫦼𫾥𬣑",
 "遝": "嚃䜚𣝋𦿚𬤪",
 "蒿": "嚆藁藳𡽝𣝏𤢨𧂎𧂕",
 "赫": "嚇懗爀㬨𢷓𥋿",
 "對": "嚉懟濧薱襨譵轛鑆㠚㦠㬣䨴𠏮𡁨𡽵𢷮𣌒𣝉𤻫𥵢𦆹𦡷𨆷𨘗𨮝𩟡𩼷𩼸𪒶𬥫",
 "疐": "嚏懥䡹𠏴𨆫",
 "嘗": "嚐鱨",
 "麼": "嚒嬤懡𢣗𩉌𩟠",
 "察": "嚓擦檫鑔镲䃰䕓𢣼𥌀𥽕𧞍𧭂𨆾𩉐𩟔𩴳𪹾𬩲𬯠𬰓",
 "𤴡": "嚔䶑𠐑𧁏",
 "魯": "嚕擼櫓氌瀂穭艪鑥𠐔𠓑𡓇𢋡𣄤𣋼𣰯𤣃𤻼𥃠𥌧𥗆𥩍𥶇𦢞𧀦𧈔𧔎𧭷𨏗𨟇𩽈𪈂𪴝𬧙",
 "慧": "嚖懳櫘譿㩨㬩䎚䡺䵻𢅫𤑡𤪳𥣴𥶙𦇀𩏲𪔊𬤭",
 "齒": "嚙鑡齓齔齕齖齗齘齙齚齛齜齝齞齟齠齡齣齥齦齧齨齩齪齫齬齭齮齯齰齱齲齳齴齵齶齷齸齹齺齻齼齽齾䥹䶔䶕䶖䶗䶘䶙䶚䶛䶜䶝䶞䶠䶡䶢䶣䶤䶥䶦䶧䶨䶩䶪䶫𠠚𡆟𡤫𡾐𢎕𢸡𣡁𤁧𤪷𤻽𤼻𥗊𥸞𥸟𦉟𦢠𧀤𧢟𨈄𨰒𨰢𩖁𪗔𪗕𪗖𪗗𪗘𪗙𪗚𪗛𪗜𪗝𪗞𪗟𪗠𪗡𪗢𪗣𪗤𪗥𪗦𪗧𪗨𪗩𪗪𪗫𪗬𪗭𪗮𪗯𪗰𪗳𪗴𪗵𪗶𪗷𪗸𪗹𪗺𪗻𪗼𪗽𪗾𪗿𪘀𪘁𪘃𪘄𪘅𪘆𪘇𪘈𪘉𪘊𪘋𪘌𪘍𪘎𪘏𪘐𪘑𪘒𪘓𪘔𪘕𪘖𪘗𪘘𪘙𪘛𪘜𪘝𪘞𪘟𪘠𪘡𪘢𪘣𪘤𪘥𪘦𪘧𪘨𪘩𪘪𪘫𪘬𪘭𪘮𪘯𪘰𪘱𪘲𪘳𪘴𪘵𪘶𪘷𪘸𪘹𪘺𪘻𪘼𪘽𪘾𪘿𪙀𪙁𪙂𪙃𪙄𪙅𪙆𪙇𪙈𪙉𪙊𪙋𪙌𪙍𪙎𪙏𪙐𪙑𪙒𪙓𪙕𪙖𪙗𪙘𪙙𪙚𪙛𪙜𪙝𪙞𪙟𪙠𪙡𪙢𪙣𪙤𪙥𪙦𪙧𪙨𪙩𪙪𪙫𪙬𪙭𪙮𪙯𪙰𪙱𪙲𪙳𪙴𪙵𪙶𪙷𪙸𪙹𪙹𪙺𪙻𪙼𪙽𪙾𪙿𪚀𪚁𪚂𪚃𪚄𪚅𪚆𪚆𪚇𪚈𪚉𪚊𪚋𪚌𪤭𫜥𫜦𫜧𫠛𫹁𬹵𬹶𬹷𬹸𬹹",
 "樂": "嚛擽櫟濼爍瓅皪礫纅藥觻躒轢鑠鱳㜰㦡䁻䑈䟏䤕𠘙𡾒𣀝𣋵𣡝𣡳𣤰𤢴𤻲𤾾𥽗𦘈𧆄𧔉𧭥𩧂𪇱𫿾",
 "墨": "嚜爅纆㕓䁼䘃𡣫𡳫𢋨𢌅𣞪𤄊𥽞𦢓𦪷𨇠𩽦𬙊",
 "喆": "嚞𪝦𫬔",
 "黎": "嚟瓈藜邌鑗㠟㰀䉫𠠍𢤂𤂱𤑬𤛼𥌛𥗍𥣵𥨹𧅏𧔌𨟀𩁟𩧋𩼽𬜜",
 "劉": "嚠嬼懰瀏藰䉧䬟𢤐𢷶𣞗𨮸𩙔𪝵",
 "鞋": "嚡",
 "页": "嚣灏烦硕缬顶顸项顺须顼顽顾顿颀颁颂颃预颅领颇颈颉颊颋颌颍颎颏颐频颔颕颖颗题颙颚颛颜额颞颟颠颡颢颣颤颥颧㑔䂵𤻊𩖕𩖖𩖗𫖪𫖫𫖬𫖭𫖮𫖯𫖰𫖱𫖲𫖳𫖴𫖵𫖶𫖷𫖸𫖹𫖺𬃲𬈾𬥈𬱓𬱔𬱕𬱖𬱗𬱘𬱙𬱚𬱛𬱛𬱜𬱝𬱞𬱟𬱠𬱡𬱢𬱣𬱤𬱥𬱦𬱧𬱨𬱩𬱪𬱫𬱬𬱭𬱮𬱯𬱰𬱱𬱲𬱳𬺂",
 "摩": "嚤擵藦𠘚𠠒𡾉𢣾𥗂𦇑𫾝",
 "燕": "嚥嬿曣臙觾讌酀醼驠㬫䜩䴏𡤈𣟛𤃇𤒈𤫇𥍂𥗕𥷀𥽫𧔦𨇟𨯧𨽞𩽒𪈏𫋩𫿲",
 "盧": "嚧廬攎曥櫨瀘爐獹瓐矑籚纑罏臚艫蘆蠦轤鑪顱驢髗鱸鸕黸㔧㠠㪭㱺㿖䰕𠐳𡳬𢐸𢥈𤬛𤬜𤮧𤴅𥀵𧈕𨇖𩁨𩍼𩙙𪈒𪖌𪙾𫶢𬐸𬟳",
 "縛": "嚩𤒔",
 "閻": "嚪櫩爓讇㶄㿕䌪𠐩𡣽𢸴𤯐𥌸𥶿𧂄𨇝",
 "頻": "嚬瀕蘋顰㰋𠐺𡤉𥷎𦇖𧅵𧔪𧭹𨏞𨽗𫶡",
 "鄉": "嚮曏膷薌蠁響饗鱜㗽䦳𤩬𥀾𧬰𬳧",
 "霍": "嚯攉曤瀖癨皬矐礭籗臛藿鸖㰌㱋㸌㺢𠐶𠠛𡓘𡾜𤜅𤣅𥽥𦒧𨘾𨟓𨯟𩟯𩧏𩱶𫔓𬸰",
 "磨": "嚰礳耱蘑饝𣟖𥽨𨇢𨟖𫾚",
 "戲": "嚱巇隵㚀㸍㺣𢋼𢹍𣟵𣤴𤃪𧕆𧲘𫍔𬑁",
 "嬰": "嚶孆孾巊廮攖櫻瀴瓔癭纓蘡蠳鸚䑍䙬䨉𡾸𢖠𣤵𤜉𤣎𥌽𥐑𦦿𧮆𨟙𨰃𩖍𩽢𪈤𪝼𪼿𫋱",
 "點": "嚸",
 "罅": "嚹",
 "遂": "嚺嬘旞檖澻燧璲礈禭穟繸襚譢鐩隧㸂䍁䡵𡑞𢅕𢢝𢷊𣄚𤻄𥴦𦼯𧸙𨆏𨣢𨷃𨽵𩍚𪩩𬩄𬭼",
 "罒": "嚺圐塄愣楞罖㸘𠇻𢊤𣡱𣼆𪋷𪒎𪓻𪔒𪝢𪡔𪣰𪧂𪧪𪩨𪪣𪯇𪴦𪹌𪺄𪺆𫅀𫅁𫅂𫅄𫅅𫅇𫅈𫅉𫅊𫅋𫅍𫉐𫎣𫝱寧㱎瀹䍙罺𫢱𫤘𫥧𫨀𫲓𫴂𫻘𫻬𫿏𬅕𬅖𬅘𬅙𬅜𬈪𬉫𬋷𬎜𬎝𬎷𬏘𬐪𬑔𬖈𬗢𬙕𬙖𬙘𬙙𬙚𬙛𬙜𬙝𬙟𬙢𬙣𬙤𬙥𬙦𬙧𬙨𬙩𬙩𬙪𬙫𬞱𬪥𬫤𬬕𬬘",
 "爵": "嚼灂爝皭穱釂㩱㬭䂃𠘣𢥚𥷮𨇺𨰜𪚅𪪹𫑲𫤼𫸤𬋺𬺖",
 "贅": "嚽",
 "轉": "囀𡤛𩧜",
 "聶": "囁懾攝欇灄襵讘躡鑷顳㒤㱌㸎䌰䝕䯀𠠨𡓳𡤙𣀳𣠞𣰼𤣒𤮱𥍉𥤋𥷨𦣀𧕩𨊞𨏴𨙓𨽦𩙝𩽪𬗂",
 "雜": "囃䕹𢹼𣠛𣠥𤄖𥗭𥗱𥷩",
 "離": "囄攡灕籬蘺㒧㒿㰚䍦䙰𡿎𢌈𢥗𧕮𧮛𪺇",
 "蠆": "囆爡𡿋𢺉𤜒𤼚𧮚𨙚",
 "藝": "囈襼讛𢺐𣡊",
 "蘇": "囌𠫋𡚡𡚢𥗹𦣑𧃅𫰅",
 "贈": "囎",
 "獻": "囐巘巚瓛讞钀齾㩵䡾𡔎𣡌𤅊𦉧𧖃𨏾𪚋𪺉",
 "蘭": "囒孏欗灡爤糷襽钄韊𡔔𢆄𥗺𨈆𫲴𫶥𬎟𬵿",
 "齧": "囓𡔐𡿖",
 "覽": "囕攬欖灠爦纜𡔑𡤱𤣟𥍖𥤝𧮤𨈇𨤋",
 "籮": "囖",
 "才": "团材犲豺財财釮閉闭鼒䊷䌶䞗䴭𠄒𢩱𤝦𤿋𥘔𦬁𧆯𧤳𨙴𩛥𪟞𪪋𬁱𬏛𬹅",
 "或": "國惐惑戫掝棫淢琙稢窢緎罭蜮閾阈馘魊㖪㚜㰲㳼㵄㽣䂸䈅䍞䤋䧕䬎䮙䰥䱛𠒬𠜻𡌳𡿿𢃎𢃤𢈿𢒖𢧋𢨊𣀪𣀾𣀾𣍻𣤐𣨤𤁭𤉨𤊨𤒜𤒜𤦂𤦒𤷇𥇙𥇿𦈸𦑌𦑍𦱂𧌒𧖻𧯱𧼑𨨅𩋉𩎹𩏟𪂉𪂵𪏇𪑝𪜗𪾀𫧳𫳿𬌶𬥂𬪇𬱿",
 "貟": "圎𠋏𡎖𡞩𪃰𪻅𤠔",
 "巻": "圏锩",
 "袁": "園媴榬溒猿瞏褤轅辕遠鎱㝨㨬𥰟𧫁𧽚𨘏𨘻𩔭𪡫𪼄",
 "書": "圕𡳩𢅺𢆅𣍚𣍜𤾭𤾳𦘢𦥌𦧶𦶕𧺅𨃲𪳛𫫒𬁫𬣄𬮑",
 "啚": "圖鄙𡳄𤹦𥀚𥀜𨝚𩞓𩻂𪯮𫅊𫤲",
 "囬": "圗廽蜖逥面𡒜𡜼𢊸𣰣𣰣𨖘𨝣𨹰𩻨𪜖𫮰",
 "欒": "圞灤虊𣡵𬣘",
 "爪": "坕抓枛沠爬爮爴笊釽㸕䖣䝖𠷒𢁬𢇏𢇏𢦼𢩞𢫺𢮞𢮣𢱑𤓱𤓲𤓵𤓶𤓹𤓺𤓼𤔀𤔅𤔈𤔉𤔋𤔎𤔏𤔑𤔖𤔗𤔙𤔙𤔙𤔚𤔛𤔜𤔝𤔟𤔢𤔨𤔩𤔮𤔯𤔶𤔻𤔽𤔾𤕉𤕊𤜶𤣺𤰰𤰲𥂼𥄄𦆩𦆩𦥝𦧍𦬔𧘷𧠘𧠙𧦐𧳻𨔅𩬐𪗢𪺎𪺐𪺑𪺖𪽫𫩜𫵕𬀄𬋤𬋦𬋬𬋰𬋳𬦦𬬲",
 "队": "坠",
 "龸": "坣尝䟫𠤝𠹉𡓪𡭠𡭵𡮕𫆙𫢂𫩠𫴽𫵁𫵂𫵅𫵌𫽊𬂓𬐓𬓂𬔢",
 "圥": "坴鼀𠒌𠒶𠢂𫇁𫐫𬅲",
 "代": "垈岱帒柋牮玳笩蚮袋貸贷鮘鴏黛㭖䒫𠁀𠊝𠍜𠰰𠰺𠳙𡛲𡥖𢂌𢎌𢘋𢫙𤱢𥩦𥰒𥱢𥿝𦙯𦨮𧊇𨠍𨥶𨨐𩂠𩃷𩶕𪜣𪭩𫆛𫌸𫔟𫢫𫢼𫣭𬶌𬷈",
 "伐": "垡栰浌筏茷閥阀㘺䣹䤦𠞵𠲎𢑟𢨖𢬩𣂿𣑡𤇰𥅩𥑼𥩱𦨷𦹋𧑬𨀳𨎡𨠰𩪻𫼂",
 "役": "垼䓈𠖊𣒃𤈧𤥞𤶣𥆛𧱕𨦯𨿒𩂹𩎶𩷍𪁛",
 "沂": "垽峾䇵䓅𠲻",
 "防": "埅𩗧𪁢𫕗",
 "⺘": "埑扎扏扐扑扒打扔払扖扗托扙扚扛扜扝扞扟扠扡扢扣扤扦执扨扩扪扫扭扮扯扰扱扲扳扴扵扶扷扸批扺扻扼扽找技抁抂抃抄抅抆抇抈抉把抋抌抍抎抏抐抑抒抓抔投抖抗折抙抚抜抝択抟抠抡抢抣护报抦抧抨抩抪披抬抭抮抯抰抱抲抳抴抵抶抷抸抹抺抻押抽抾抿拀拁拂拃拄担拆拇拈拉拊拌拍拎拐拑拒拓拔拕拖拗拘拙拚招拞拟拠拡拢拤拥拦拧拨择拪拫括拭拮拯拰拱拴拵拶拷拸拹拺拻拼拽拾挀持挂挃挄挅挆指按挊挋挌挍挎挏挑挒挓挔挕挖挗挘挜挞挟挠挡挢挣挤挥挦挧挨挩挪挫挬挭挮振挰挱挳挴挵挶挷挸挹挺挻挼挽挾挿捀捁捂捃捄捅捆捇捈捉捊捋捌捍捎捏捐捑捒捓捔捕捖捗捘捙捚捛捝捞损捠捡换捣捤捥捦捧捨捩捪捫捬捭据捯捰捱捲捳捴捵捶捷捸捹捺捻捼捽捾捿掀掁掂掃掄掅掆掇授掉掊掋掍掎掏掐掑排掓掕掖掗掘掙掚掛掜掝掞掟掠採掤接掦控推掩措掫掬掭掮掯掲掳掴掵掶掷掸掹掺掻掼掽掾掿揀揁揂揃揄揆揇揈揉揊揋揌揍揎描提揑插揓揔揕揖揗揘揙揚換揜揝揞揟揠握揢揣揤揥揦揨揩揪揬揭揮揯揰揲揳援揵揶揷揸揹揺揻揼揽揾揿搀搁搂搃搄搅搆搇搈搉搊搋搌損搎搏搐搑搒搓搔搕搗搘搙搚搛搜搝搞搟搠搡搢搣搤搥搦搧搨搩搪搬搭搮搯搰搱搲搳搵搶搷搸搹携搼搽搾摀摁摂摃摄摅摆摇摈摉摊摋摌摍摎摏摐摑摒摓摔摕摖摗摘摙摚摛摜摝摞摟摠摡摢摣摤摥摦摧摨摪摫摬摭摱摲摳摴摵摶摷摸摺摻摼摽摾摿撁撂撄撅撇撈撊撋撌撍撎撏撐撑撒撓撔撕撖撗撘撙撚撛撜撝撞撟撠撡撢撣撤撥撦撧撨撪撫撬播撮撰撱撲撳撴撵撶撷撸撹撺撻撼撽撾撿擀擁擂擃擄擅擆擇擈擉擋擌操擏擐擑擒擓擔擕擖擗擙據擛擜擝擞擟擠擡擢擣擤擦擨擩擫擬擭擮擯擰擱擲擳擴擵擶擷擸擹擺擻擼擽擾擿攁攂攃攄攅攆攇攈攉攊攋攌攍攎攏攐攑攒攓攔攕攖攗攘攙攚攛攜攝攞攟攠攡攢攤攥攦攧攨攩攪攫攬攭攮毮箍籀籒逰㧃㧄㧅㧆㧇㧈㧉㧊㧋㧌㧍㧎㧏㧐㧑㧒㧓㧔㧕㧖㧗㧙㧚㧜㧞㧟㧠㧡㧢㧣㧤㧥㧦㧧㧨㧪㧫㧮㧯㧰㧲㧴㧵㧶㧷㧸㧺㧻㧼㧽㧾㨀㨁㨂㨃㨄㨅㨆㨈㨉㨋㨎㨏㨐㨑㨒㨓㨔㨕㨖㨗㨘㨙㨚㨛㨜㨝㨞㨟㨠㨡㨢㨣㨤㨥㨦㨧㨨㨩㨪㨫㨬㨭㨮㨯㨰㨱㨲㨳㨴㨵㨶㨷㨸㨹㨺㨽㨾㨿㩀㩁㩂㩃㩄㩅㩆㩇㩈㩉㩊㩋㩌㩍㩎㩏㩐㩑㩒㩔㩕㩗㩘㩙㩚㩛㩜㩝㩞㩟㩠㩡㩢㩣㩤㩥㩦㩧㩨㩩㩪㩫㩬㩭㩮㩯㩰㩱㩲㩳㩴㩵㩶㩷㩸㩹㳺𠉝𠚶𠜭𡀴𢜉𢩧𢩨𢩩𢩪𢩫𢩭𢩮𢩯𢩰𢩱𢩲𢩳𢩴𢩵𢩶𢩹𢩻𢩼𢩽𢩿𢪀𢪁𢪂𢪃𢪄𢪅𢪆𢪈𢪉𢪊𢪋𢪌𢪍𢪎𢪔𢪕𢪗𢪚𢪛𢪜𢪝𢪞𢪠𢪡𢪢𢪣𢪤𢪦𢪧𢪨𢪩𢪪𢪫𢪬𢪭𢪮𢪯𢪰𢪱𢪲𢪴𢪵𢪶𢪷𢪹𢪺𢪼𢫁𢫂𢫃𢫄𢫅𢫆𢫇𢫈𢫉𢫊𢫋𢫌𢫍𢫎𢫏𢫐𢫑𢫒𢫓𢫔𢫕𢫖𢫘𢫙𢫚𢫛𢫜𢫝𢫟𢫠𢫡𢫢𢫣𢫤𢫥𢫦𢫧𢫨𢫩𢫫𢫬𢫭𢫮𢫯𢫱𢫲𢫳𢫵𢫷𢫸𢫹𢫺𢫻𢫼𢫽𢫾𢫿𢬀𢬁𢬃𢬄𢬅𢬆𢬈𢬉𢬋𢬌𢬍𢬎𢬏𢬐𢬑𢬒𢬓𢬔𢬕𢬖𢬘𢬝𢬟𢬠𢬡𢬢𢬤𢬥𢬦𢬧𢬨𢬩𢬪𢬭𢬮𢬯𢬰𢬱𢬲𢬳𢬴𢬵𢬷𢬸𢬹𢬺𢬻𢬼𢬽𢬾𢬿𢭁𢭂𢭃𢭄𢭅𢭆𢭇𢭈𢭉𢭊𢭌𢭍𢭎𢭏𢭐𢭒𢭓𢭔𢭕𢭖𢭗𢭘𢭙𢭚𢭛𢭜𢭞𢭟𢭠𢭡𢭢𢭣𢭦𢭧𢭨𢭩𢭪𢭫𢭬𢭭𢭯𢭰𢭱𢭲𢭳𢭴𢭵𢭷𢭹𢭺𢭻𢭼𢭽𢭾𢭿𢮀𢮁𢮂𢮄𢮅𢮆𢮇𢮈𢮉𢮊𢮋𢮌𢮍𢮎𢮐𢮑𢮒𢮓𢮔𢮕𢮖𢮙𢮚𢮞𢮡𢮢𢮤𢮥𢮦𢮧𢮨𢮩𢮪𢮫𢮬𢮭𢮮𢮯𢮰𢮲𢮴𢮵𢮶𢮸𢮹𢮺𢮼𢮽𢮾𢮿𢯀𢯁𢯂𢯃𢯅𢯆𢯇𢯈𢯉𢯊𢯋𢯌𢯍𢯎𢯏𢯐𢯑𢯒𢯓𢯔𢯕𢯖𢯗𢯙𢯚𢯛𢯜𢯝𢯞𢯟𢯠𢯡𢯢𢯤𢯥𢯦𢯧𢯨𢯩𢯪𢯫𢯬𢯭𢯮𢯯𢯰𢯳𢯴𢯵𢯶𢯷𢯸𢯹𢯺𢯻𢯼𢯽𢯾𢯿𢰀𢰁𢰂𢰃𢰄𢰅𢰆𢰇𢰈𢰉𢰊𢰋𢰌𢰍𢰎𢰏𢰐𢰑𢰒𢰓𢰔𢰕𢰖𢰗𢰘𢰚𢰛𢰜𢰝𢰠𢰡𢰢𢰤𢰥𢰦𢰧𢰩𢰪𢰫𢰬𢰭𢰮𢰰𢰱𢰲𢰳𢰴𢰵𢰷𢰸𢰹𢰺𢰻𢰼𢰽𢰾𢱁𢱂𢱃𢱄𢱅𢱆𢱇𢱈𢱉𢱊𢱋𢱌𢱍𢱎𢱏𢱐𢱑𢱒𢱓𢱔𢱕𢱖𢱗𢱘𢱙𢱚𢱛𢱜𢱝𢱟𢱢𢱣𢱤𢱥𢱦𢱧𢱨𢱩𢱪𢱫𢱭𢱮𢱰𢱱𢱲𢱳𢱴𢱶𢱷𢱸𢱹𢱺𢱻𢱼𢱽𢱾𢱿𢲀𢲁𢲂𢲃𢲄𢲅𢲆𢲇𢲈𢲉𢲊𢲋𢲌𢲍𢲎𢲏𢲐𢲑𢲔𢲕𢲖𢲗𢲘𢲙𢲚𢲛𢲜𢲞𢲟𢲠𢲡𢲢𢲣𢲥𢲦𢲧𢲨𢲪𢲫𢲬𢲭𢲯𢲰𢲲𢲳𢲵𢲶𢲸𢲹𢲺𢲻𢲼𢲽𢲾𢳀𢳂𢳃𢳄𢳆𢳇𢳊𢳋𢳌𢳎𢳏𢳐𢳒𢳓𢳕𢳖𢳗𢳘𢳚𢳛𢳜𢳝𢳞𢳟𢳠𢳡𢳢𢳤𢳦𢳨𢳩𢳫𢳭𢳮𢳯𢳰𢳱𢳲𢳳𢳴𢳵𢳶𢳷𢳸𢳹𢳺𢳻𢳼𢳽𢳾𢳿𢴀𢴂𢴃𢴄𢴅𢴆𢴇𢴈𢴉𢴊𢴌𢴍𢴎𢴏𢴐𢴑𢴒𢴓𢴕𢴖𢴗𢴘𢴙𢴚𢴜𢴟𢴠𢴡𢴢𢴣𢴤𢴥𢴦𢴧𢴨𢴩𢴪𢴫𢴬𢴮𢴯𢴰𢴱𢴲𢴴𢴵𢴶𢴹𢴻𢴼𢴾𢴿𢵀𢵂𢵃𢵄𢵅𢵆𢵇𢵈𢵉𢵊𢵋𢵌𢵍𢵎𢵏𢵐𢵑𢵒𢵓𢵔𢵕𢵖𢵗𢵘𢵙𢵚𢵛𢵜𢵝𢵟𢵢𢵣𢵦𢵧𢵪𢵫𢵭𢵮𢵯𢵰𢵱𢵲𢵳𢵴𢵵𢵶𢵷𢵸𢵹𢵺𢵻𢵼𢵽𢵾𢶁𢶂𢶃𢶅𢶆𢶇𢶈𢶉𢶊𢶌𢶍𢶎𢶏𢶑𢶒𢶔𢶕𢶖𢶘𢶙𢶚𢶛𢶝𢶞𢶠𢶢𢶣𢶦𢶧𢶨𢶩𢶪𢶬𢶭𢶮𢶱𢶲𢶳𢶴𢶵𢶶𢶷𢶸𢶹𢶺𢶼𢶽𢶾𢶿𢷀𢷁𢷂𢷃𢷄𢷅𢷉𢷊𢷋𢷌𢷎𢷏𢷐𢷒𢷓𢷔𢷕𢷖𢷗𢷘𢷙𢷛𢷜𢷝𢷞𢷟𢷠𢷡𢷢𢷣𢷤𢷥𢷦𢷧𢷨𢷪𢷬𢷭𢷮𢷯𢷰𢷱𢷲𢷳𢷴𢷶𢷷𢷸𢷹𢷺𢷻𢷼𢷽𢷾𢷿𢸀𢸂𢸃𢸄𢸅𢸆𢸉𢸊𢸋𢸌𢸍𢸎𢸏𢸐𢸑𢸒𢸓𢸕𢸖𢸗𢸘𢸙𢸚𢸛𢸝𢸞𢸟𢸠𢸡𢸢𢸣𢸤𢸥𢸦𢸨𢸩𢸪𢸫𢸬𢸮𢸯𢸰𢸱𢸲𢸴𢸵𢸶𢸷𢸸𢸹𢸺𢸻𢸼𢸽𢸾𢸿𢹀𢹂𢹃𢹄𢹅𢹆𢹇𢹈𢹉𢹊𢹋𢹌𢹍𢹎𢹐𢹑𢹒𢹓𢹔𢹕𢹖𢹗𢹘𢹙𢹚𢹛𢹜𢹝𢹞𢹟𢹠𢹡𢹢𢹣𢹤𢹥𢹦𢹧𢹨𢹩𢹪𢹬𢹮𢹯𢹰𢹱𢹲𢹳𢹴𢹵𢹶𢹷𢹸𢹹𢹺𢹻𢹼𢹽𢹾𢹿𢺀𢺂𢺃𢺄𢺅𢺆𢺈𢺉𢺊𢺌𢺍𢺎𢺏𢺐𢺑𢺒𢺓𢺔𢺕𢺖𢺗𢺘𢺚𢺛𢺜𢺝𢺞𢺟𢺠𢺡𢺢𢺣𢺧𢺨𢺩𢺪𢺫𢺬𢺭𢺮𢺯𢺰𢺱𢺲𢺳𢺴𣡮𣨊𤚹𥅿𥲷𦆫𦰂𦷀𦻲𦻴𧑺𨙰",
 "丸": "埶執奿孰执汍犱秇笂紈纨肒芄訙釻骫㔟㝷㞍䎠䒯𠂃𠂅𠅶𠫷𠮬𠷏𡉕𡚺𡦦𡧄𡪐𡴿𡵎𢓃𢣞𢦗𣏒𤒆𤒒𤴯𥅿𥐠𥰳𨎐𨫦𩪿𪐟𪜂𪟵𪢰𫂏𫉵𫑳𫕣𫡬𫷿𬯸𬵄",
 "泥": "埿𢛜𥺜𦰫𩸦𩸧𩾆𪣮𬈤𬉚",
 "臤": "堅婜孯掔硻竪緊菣蜸豎賢鋻㷂㹂䁂䵖𡹩𢃥𤏿𤦁𤭠𤲗𤷌𤿳𥦞𦜌𦜜𦣴𧇜𧞀𧼒𨨘𩋆𩜬𪘦𫋟",
 "枋": "堏𣚂𬄶",
 "斩": "堑崭暂椠錾𥇢𪮃𫎸𫏐𫪚𬆂𬊗𬲕",
 "陏": "堕椭𡺆𦳉𨔳",
 "保": "堡媬椺湺煲緥葆褒褓賲㨐㷛䭋䳰𠸒𢉣𣯂𤦸𤭭𦽻𧛱𨩚𩭼𪃁𫣯",
 "敄": "堥婺嵍愗暓楘瞀蝥鍪霚霿鞪騖骛鶩鹜㡔㮘䋷䓮䜼䨁䱯𠍢𠝸𪍓𪍘𪧮",
 "垚": "堯㙓𣈹𣕫𨅣𨘫𨮲嬈",
 "津": "堻葏𤀷𦩨𦽷",
 "封": "堼崶幇幫湗犎篈葑鞤㜂㨍䋽𠪆𡎈𥀂𦂌𧛜𨩥𩋮𪦇𫹚",
 "己": "塂妃屺岂巹异忋忌杞玘紀纪芑記记配魢鱾㞯㠰㽶䄫䨽䪱𠘑𠮯𠯇𠲹𡊓𡕿𡝑𢀵𢀵𢀶𢀽𢁆𢁈𢁉𢁉𢁏𢩵𣒤𣗕𣗕𣗗𣗢𣢇𣣁𣱒𣲆𤆔𤇐𤐏𤓿𤔂𥁥𥁥𥐦𥔊𥝗𥫄𥫟𦝾𦯸𦾪𧂘𨊲𨑓𨙬𨥈𨼨𩋕𩖈𩡆𩡆𩧱𩫻𩾠𩾩𪩫𪩰包港起𫱃𬉺𬟡𬡆𬦗",
 "涂": "塗溆蒤𣉯𥂋𪄫",
 "𡨄": "塞寋寨搴褰謇賽赛蹇騫骞鶱㥶𪧔𪧦𬈡𬸣",
 "艹": "塟夢宽寛巕櫣满爇瞒繤羐艺艻艼艽艾艿芀芁芃芄芅芆芇芉芊芋芌芍芎芏芐芑芒芓芕芖芗芘芙芚芛芜芝芞芟芠芡芢芣芤芥芦芧芨芩芪芫芬芭芮芯芰花芲芳芴芵芶芷芸芹芺芼芽芾芿苀苁苂苃苄苅苆苇苈苉苊苋苌苍苎苏苐苑苒苓苔苕苖苗苘苙苚苛苜苝苞苟苠苡苣苤若苦苧苨苩苪苫苬苭苮苯苰英苲苳苴苵苶苷苸苹苺苻苼苽苾苿茀茁茂范茄茅茆茇茈茉茊茋茌茎茏茐茑茒茓茔茕茖茗茘茙茚茛茜茝茞茟茠茡茢茣茤茥茦茧茨茩茪茫茬茭茮茯茱茲茳茴茵茶茷茸茹茺茼茽茾茿荀荁荂荃荄荅荇荈草荊荋荌荍荎荏荐荑荒荓荔荕荖荗荘荙荚荛荝荞荟荠荡荢荣荤荥荦荧荨荩荪荫荬荭荮药荰荱荲荳荴荵荶荷荸荹荺荻荼荽荾荿莀莁莂莃莄莅莆莇莈莉莊莋莌莍莎莏莐莑莒莓莔莕莖莗莘莙莚莛莜莝莞莟莠莡莢莣莤莥莦莧莨莩莪莫莬莭莮莯莰莱莲莳莴莵莶获莸莹莺莻莼莽莾莿菀菁菂菃菄菅菆菇菈菉菊菋菌菍菎菏菑菒菓菔菕菖菗菘菙菚菛菜菝菞菟菠菡菢菣菤菥菦菧菨菩菪菫菬菭菮菰菱菲菳菴菵菶菷菸菹菺菻菼菽菾菿萀萁萂萃萄萆萇萈萉萊萋萌萍萎萏萐萑萒萓萔萖萗萘萙萚萛萜萝萞萟萠萡萣萤营萦萧萨萩萪萫萬萭萮萯萰萱萲萳萴萵萶萷萸萹萺萻萼落萾萿葀葁葂葃葄葅葆葇葈葉葊葋葌葍葎葏葐葑葒葓葔葕葖著葘葙葚葛葜葝葞葟葠葡葢董葤葥葦葧葨葩葪葫葬葭葮葯葰葱葲葳葴葵葶葷葸葹葺葻葼葽葾葿蒀蒁蒂蒃蒄蒅蒆蒇蒈蒉蒋蒌蒍蒎蒏蒐蒑蒒蒓蒔蒕蒖蒗蒘蒙蒚蒛蒜蒝蒞蒟蒠蒡蒢蒣蒤蒥蒦蒨蒩蒪蒫蒬蒭蒮蒰蒱蒲蒳蒴蒵蒶蒷蒸蒹蒺蒻蒼蒽蒾蒿蓀蓁蓂蓃蓄蓅蓆蓇蓈蓉蓊蓋蓌蓍蓎蓏蓐蓑蓒蓓蓔蓕蓖蓗蓘蓚蓛蓜蓝蓞蓟蓠蓡蓢蓣蓤蓥蓧蓨蓩蓪蓫蓬蓭蓮蓯蓰蓱蓲蓳蓴蓵蓶蓷蓸蓹蓺蓻蓼蓽蓾蓿蔀蔁蔂蔃蔄蔆蔇蔈蔉蔊蔋蔌蔍蔎蔏蔐蔑蔒蔓蔔蔕蔖蔗蔘蔙蔚蔛蔜蔝蔞蔟蔠蔡蔢蔣蔤蔥蔦蔧蔨蔩蔪蔫蔬蔭蔮蔯蔰蔱蔲蔳蔴蔶蔷蔸蔹蔺蔻蔼蔽蔾蔿蕀蕁蕂蕃蕄蕅蕆蕇蕈蕉蕊蕋蕌蕍蕎蕏蕐蕑蕒蕓蕔蕕蕖蕗蕘蕙蕚蕛蕜蕝蕞蕟蕠蕡蕢蕣蕤蕥蕦蕧蕨蕩蕪蕫蕬蕭蕮蕯蕰蕱蕲蕳蕴蕵蕶蕷蕸蕹蕺蕻蕼蕽蕾蕿薀薁薂薃薄薅薆薇薈薉薋薌薍薏薐薒薓薔薕薖薗薘薙薚薛薜薝薞薟薠薡薢薣薤薥薦薧薨薩薪薫薬薭薮薯薰薱薲薳薴薵薶薷薸薹薺薻薼薽薾薿藀藂藃藄藅藆藇藈藉藊藋藌藍藎藏藐藑藒藓藔藕藖藗藘藙藚藛藜藞藟藠藡藢藣藤藥藦藧藨藩藪藫藬藭藮藯藰藱藲藴藵藶藷藸藹藺藻藼藽藾藿蘀蘁蘂蘃蘄蘅蘆蘇蘈蘉蘊蘋蘌蘍蘎蘏蘐蘑蘒蘓蘔蘕蘗蘘蘙蘚蘛蘜蘝蘞蘟蘠蘡蘢蘣蘤蘥蘦蘧蘨蘩蘪蘫蘬蘭蘮蘯蘰蘱蘲蘳蘴蘵蘶蘸蘹蘺蘻蘼蘽蘾蘿虀虁虂虃虄虅虆虇虈虉虊虋螨韮㗡㨲㩰㫩㭉㮱㯴㯵㯼㴀㴕㷹㻳䒒䒓䒔䒕䒖䒗䒘䒙䒚䒛䒜䒝䒞䒟䒠䒡䒢䒣䒤䒥䒦䒧䒨䒩䒪䒫䒬䒭䒮䒯䒰䒱䒲䒳䒴䒵䒶䒷䒸䒹䒺䒻䒼䒽䒾䒿䓀䓁䓂䓃䓄䓅䓆䓇䓈䓉䓊䓋䓌䓍䓎䓏䓐䓑䓒䓓䓔䓕䓖䓗䓘䓙䓚䓛䓜䓝䓞䓟䓠䓡䓢䓣䓤䓦䓧䓨䓩䓪䓫䓬䓭䓮䓯䓰䓱䓲䓳䓴䓵䓶䓷䓸䓹䓺䓻䓼䓽䓾䓿䔀䔁䔂䔃䔄䔅䔆䔇䔈䔉䔊䔋䔌䔍䔎䔏䔐䔑䔒䔓䔔䔕䔖䔗䔘䔙䔚䔛䔜䔝䔞䔟䔠䔡䔢䔣䔤䔥䔦䔧䔨䔩䔪䔫䔬䔭䔮䔯䔰䔱䔲䔳䔵䔶䔷䔸䔹䔺䔻䔼䔽䔾䔿䕀䕁䕂䕃䕄䕅䕆䕇䕈䕉䕊䕋䕌䕍䕎䕏䕐䕑䕒䕓䕔䕕䕖䕗䕘䕙䕚䕛䕜䕝䕞䕟䕠䕡䕢䕣䕤䕥䕦䕧䕨䕩䕪䕫䕬䕭䕮䕯䕰䕱䕲䕳䕴䕵䕶䕷䕸䕹䕺䕻䕼䕽䕾䕿䖀䖂䖄䖅䖆䖇䡸𡐽𡡄𡢯𡫜𡫜𡷺𡿚𣚥𣛳𣟀𣡀𥍜𥗨𥠸𥤠𪆨𪢠𪧣𪴳𪷞𫇡𫇦𫇧𫇨𫇩𫇪𫇫𫇬𫇭𫇮𫇯𫇰𫇱𫇲𫇳𫇴𫇵𫇶𫇷𫇸𫇹𫇺𫇻𫇼𫇽𫇾𫇿𫈀𫈁𫈂𫈃𫈄𫈅𫈆𫈇𫈈𫈉𫈊𫈋𫈌𫈍𫈎𫈏𫈐𫈑𫈒𫈓𫈔𫈕𫈖𫈗𫈘𫈙𫈚𫈛𫈜𫈝𫈞𫈟𫈠𫈢𫈣𫈤𫈥𫈦𫈧𫈨𫈩𫈫𫈬𫈭𫈮𫈯𫈰𫈱𫈲𫈳𫈴𫈵𫈶𫈷𫈸𫈹𫈺𫈻𫈽𫈾𫈿𫉀𫉁𫉃𫉄𫉅𫉆𫉇𫉈𫉉𫉊𫉋𫉌𫉍𫉎𫉏𫉑𫉒𫉔𫉖𫉗𫉘𫉙𫉚𫉛𫉜𫉝𫉟𫉠𫉡𫉢𫉣𫉤𫉥𫉦𫉧𫉨𫉩𫉪𫉫𫉬𫉭𫉮𫉯𫉰𫉱𫉲𫉴𫉵𫉶𫉷𫉸𫉹𫉺𫉽𫉾𫉿𫊀𫊁𫊂𫊃𫊄𫊅𫊆𫊇𫊉𫊊𫊋𫊌𫊏𫊑𫊒𫊓𫊕𫊖𫊗𫊙𫊛𫊜𫢠𫬔𫮤𫰮𫸓𫾢𫿕𬃵𬄱𬄻𬅅𬅅𬋎𬏘𬜠𬜡𬜢𬜣𬜤𬜥𬜦𬜧𬜨𬜩𬜪𬜬𬜭𬜮𬜯𬜱𬜲𬜳𬜴𬜵𬜶𬜷𬜸𬜹𬜺𬜻𬜽𬜾𬜿𬝀𬝁𬝄𬝅𬝆𬝇𬝈𬝉𬝊𬝌𬝍𬝎𬝏𬝐𬝑𬝒𬝓𬝔𬝕𬝖𬝗𬝘𬝙𬝚𬝛𬝜𬝝𬝞𬝟𬝠𬝢𬝣𬝤𬝥𬝦𬝧𬝪𬝫𬝬𬝭𬝮𬝯𬝰𬝲𬝳𬝴𬝵𬝶𬝷𬝸𬝹𬝺𬝻𬝼𬝽𬝾𬝿𬞀𬞂𬞃𬞄𬞅𬞆𬞇𬞈𬞉𬞊𬞋𬞌𬞍𬞎𬞏𬞐𬞑𬞔𬞕𬞖𬞗𬞘𬞙𬞚𬞛𬞜𬞝𬞟𬞡𬞢𬞣𬞥𬞦𬞧𬞨𬞩𬞪𬞫𬞬𬞯𬞱𬞲𬞷𬞹𬟁𬟂𬟃𬟄𬟅𬟆𬟇𬟈𬟉𬟊𬟋𬟌𬟍𬟎𬟏𬟐𬟑𬟒𬟓𬟔𬟕𬟘𬟙𬟚𬟝𬟞𬟟𬟡𬟣𬟤𬟦𬵘",
 "死": "塟屍斃毙臰葬薧薨㘸㰷㱝𠆚𠪶𡈒𡔸𢍈𢲀𣑘𣨀𣨑𣨰𣩁𣩂𣩇𣩉𣩖𣩭𣩴𣩸𣩺𣩾𤽨𥥱𥧛𥽃𦵏𧂎𧵲𨱼𩊢𩫓𫪔𬆗𬆘𬆜𬋎",
 "浧": "塣",
 "陣": "塦𠻆𣗑𧏶𩄛𫺶",
 "朗": "塱蓢㙟㮾𠓇𠻴𡂯𢀬𢠯𣼽𤅉𩅜𩡜𪮡𫆍𫻠𬂆𬕨𬡨",
 "鹿": "塵廘摝樚漉熝簏膔蔍螰蹗轆辘鄜鏕鏖騼麀麂麃麄麅麆麇麈麊麋麌麍麎麏麐麑麒麓麔麕麖麘麙麚麛麜麝麞麟麡麢麣麤麤麤㜙㦇㼾䃙䌒䍡䴟䴠䴢䴣䴤䴥䴦䴧䴨䴩䴪䴫𡈷𡔓𡔙𡔙𡔚𡔚𡼂𢌒𢹲𢿇𣊈𣩏𤄟𤓍𤡊𤨞𤼗𥉶𥛞𥜮𥼗𦄐𦌏𦗓𦪇𧃧𧄟𧅳𧐠𧜫𧞱𧢮𧥗𧽥𨐀𨟫𨢷𨯄𨰅𩅄𩌫𩍽𩎐𩺮𪇤𪊋𪊌𪊍𪊎𪊏𪊐𪊑𪊒𪊓𪊔𪊕𪊖𪊗𪊘𪊙𪊚𪊛𪊜𪊝𪊞𪊟𪊠𪊡𪊢𪊣𪊤𪊥𪊦𪊧𪊨𪊪𪊫𪊬𪊭𪊮𪊯𪊰𪊱𪊲𪊳𪊴𪊵𪊶𪊷𪊸𪊹𪊺𪊻𪊼𪊽𪊾𪊿𪋀𪋁𪋂𪋃𪋄𪋅𪋆𪋇𪋈𪋉𪋊𪋋𪋌𪋍𪋎𪋏𪋐𪋑𪋒𪋓𪋔𪋕𪋖𪋗𪋘𪋙𪋚𪋛𪋜𪋝𪋞𪋟𪋠𪋡𪋢𪋣𪋤𪋥𪋦𪋧𪋩𪋪𪋫𪋬𪋮𪋯𪋰𪋱𪋲𪋳𪋴𪋵𪋶𪋷𪋸𪋹𪋺𪒏𪛓𪩏𪮾𪵡𪷝𪸇𫜋𫜌𫜍𫜎𫜏𬐽𬸺𬸻𬸼𬸽𬸾𬸿𬹀𬹁",
 "斬": "塹嶃嶄慙慚摲暫槧漸獑磛蔪螹覱蹔鏨鏩㜞㟻㨻䁪䟅䭕䱿䳻𠌲𠼃𠼗𡐛𢄤𣊙𤍖𥕌𦗚𦗝𧐮𧴃𧽯𩀧𩈻𩉒𬆉𬧋",
 "孰": "塾熟䃞𡙰𨄡𨶝𪜟𪦝",
 "執": "墊慹摯漐縶蓻蟄褺謺贄騺鷙㝪䉅䙝䠟䥍䲀𠅀𠌷𠽃𡠗𡼈𢌀𢴇𣊎𣊓𣎖𣙀𣙗𣼳𤄁𤍠𤎒𤴢𥂕𥊍𥊝𦎷𦥎𨄴𨎌𩅀𩮿𫡊𫷼𬗵",
 "將": "墏奬嶈摪槳漿獎蔣螿蹡醬鏘鱂㢡㯍䉃䊢䒂䵁䵼𡑶𣩗𤖛𤨿𤴠𥶝𧽩𨄚𨫥𩝫𩱑𪙝𪤖𫌏𫦔𫳻𬦞",
 "隊": "墜鐆䉌䔹䥙𠾕𡑖𡡦𢢊𢤸𢵌𣾶𤎩𤏢𥖐𦅭𦠵𨅷𨗎𨼾𨽎𩅥𩈁𩐌𪒛𪥡𪳹",
 "䧘": "墬",
 "隋": "墮嫷嶞憜撱橢隳㯐䔺䜏䜐䝐䢫䲊𡐦𡡙𢡢𣿂𤛩𤡪𥪹𥳔𧄙𧝍𨬍𩀶𩅡𩙇𩞢𩯚𪅿𪍳",
 "惰": "墯",
 "殿": "壂澱癜臋㩔𠿍𡑴𢅝𣋙𣫕𤩱𤩴𥴫𥷽𦽄𪒮𫖋𫿚",
 "楙": "壄懋𣜓𣝥𦼪𧃺𧝺𧞉𪴈",
 "漸": "壍嬱聻魙䤔𡽻𣋫𥜙𦾶𨮜𩉍",
 "㕡": "壑𧾝",
 "圣": "壡怪柽経蛏軽頚㹩䇈𠡍𠤪𠱅𡌪𡑚𡑧𢥀𢫞𣕪𤇂𥑋𦙾𧙔𧲵𨀃𩶜𪠀𪣽𪹂𫒔𫔽𫫽",
 "𤳳": "壨",
 "丬": "壮奖妆寝将桨浆状酱鳉𠃡𠬧𡳙𢈧𣃞𤎹𥒩𨍺𨨼壮",
 "冗": "売𢪚𤦻𥓣𦬮",
 "吋": "壽𠾉𤐭𨮾",
 "𦣻": "夏奡戛脜𠀼𠆠𠗍𠚑𡇢𡕾𡕿𡬹𡭎𡭑𢌉𢍳𢍳𢒸𢚧𢧻𢹎𣤻𣯐𣴨𦣽𦩽𧍹𧏈𧘄𧡻𨕥𨖁𩑋𩓑𩠐𩠒𩠖𩠜𩠝𩠞𩠡𩠢𩠣𩠪𩠫𩭈𪞕𪟊𫠵𫦍𫷢𬀋𬛭𬛭",
 "𦥑": "夓㒨䢉𠅲𠍗𠑗𠒞𠠧𠢈𠣆𠧑𠪳𠭭𡓓𡓓𡬸𡻁𢀏𢄚𢅽𢌉𢞌𢤒𢤒𢥡𢥯𢱲𣆵𣠙𣻥𤄚𤄻𤅌𤅚𤅛𤌑𤐫𤒾𤣜𤬟𤬡𤬢𤼄𤼝𥂤𥃔𥃖𥃖𥃜𥃜𥃝𥌝𥍌𥕭𥗰𥗸𥝅𥝈𥰩𦇐𦇳𦈇𦘋𦛓𦞩𦟩𦡌𦡭𦣁𦥘𦥙𦥯𦥸𦥹𦦀𦦀𦦂𦦉𦦍𦦒𦦝𦦞𦦟𦦠𦦤𦦥𦦧𦦩𦦬𦦭𦦭𦦲𦦲𦦶𦦷𦦺𦧂𦧂𧄖𧕧𧗕𧞜𧞳𧟈𧟒𧢨𧾴𨇴𨐂𨙙𨙞𨟦𨤉𨦴𨰐𩅒𩇀𩽯𪋕𪋱𪌲𪒵𪾙𫇓𫓓𫚃𫝯𫟋巢爨䳎𫤮𫬴𫮩𫱴𫲯𫸟𫾜𬀡𬅵𬏹𬛺𬛻𬛿𬜁𬜂𬜃𬜄𬣏𬮂𬯶",
 "夒": "夔巎獿蘷㹛𠑍𡖂𢅼𢥝𢺕𤫕𨈉𪺈",
 "外": "夞迯㔰䀤𠨃𠨊𠰻𡍐𡎢𡎥𡎦𡖦𢫑𤤫𧦨𧵏𧻏𨳿𩊃𪤸𪸟𫊰𫒓𫥖𫮋𫯏𫯕𬉝𬔷𬩟𬮡",
 "⺫": "夢夣睘睪瞏㗄䡸䳴𠳣𠳦𡂼𡄀𡌣𡎄𡓹𡔄𡕷𡚎𡣬𡣬𡩑𡩲𡫖𡫽𢛳𢶢𢺧𢻡𣀇𣌄𣎕𣙏𣝣𣝱𣞭𣟃𣟝𣠊𣠣𣡨𣤺𣸤𣽁𣾞𤁆𤄞𤄢𤉱𤋠𤐍𤔴𤔵𤪁𤾽𥄲𥄳𥅫𥉞𥌔𥌷𥰕𥱡𥱢𥵀𥵋𥵙𥷵𥷶𥻸𦃰𦇌𦡓𦲿𦹋𦻼𦾋𦾽𦿛𧁣𧁦𧂻𧓣𧝁𧞌𧮀𨔍𨔔𨖙𨗴𨝾𨟧𨬸𨬹𨭵𨮣𩃩𩅉𩌔𩖂𩖂𩖈𩖈𩻄",
 "寅": "夤戭殥演璌瞚縯蔩螾鏔㪦𠻤𡐔𡫫𢄨𢴍𣊇𣘹𥳄𦟘𨄻𪝤𪫂𪬦𪱄𫖚𫳾𫴃𬍅𬒞𬙂𬚈𬭰",
 "川": "夼杊氚汌玔甽紃訓训釧钏順顺馴驯㸪䡅𠆯𠯀𡔠𡵅𣒜𤆑𤽃𤽳𥃹𥄊𥐣𥔪𥫨𥬂𥭃𦘶𦤸𧈶𨤅𩩨𩭁𩭁𩵙𩾧𪡢𪩢𪯠𫇨𫧁𫶨𬘓",
 "电": "奄奙㫣𠀻𡐜𡔩𡘤𡙶𡸾𣤟𤌥𤲅𤹃𥥗𥶀𦃰𦇷𦋸𦌌𦗆𦞴𨻚𩈿𪎜𪒎𪠄𪥍𪨿𫃨𫈬𫌷𫼊𬇐𬧳",
 "夨": "奊捑𠨮𠱐𡔢𡘬𡙀𣅔𦨼𧍩𧫟𨾎𩔄𩫀𩶭𫑞𫢥𫧌𫹅𬏰",
 "卉": "奔枿桒泋賁贲鼖䯵𠛟𠱥𢍃𢐇𢞨𢡘𢱭𥊊𥑾𥓈𥮈𦯨𨃦𨐟𨒍𨪻𩝀𩝼𩿜𬜦",
 "镸": "套瓺肆蕻镹镺镻镼镾隂䦇䦈䦊䦋𡑺𢡪𢢮𣁸𤅤𤡏𤪈𤭖𤸌𤹱𥵦𦝴𦿃𧀳𧄂𧛛𨱙𨱚𨱛𨱜𨱝𨱞𨱟𨱠𨱡𨱢𨱣𨱤𨱦𨱧𨱨𨱩𨱪𨱫𨱬𨱮𨱯𨱰𨱱𨱲𨱳𨱴𨱵𨱶𨱷𨱹𨱺𨱻𨱽𨱿𨲀𨲁𨲂𨲃𨲄𨲆𨲇𨲈𨲉𨲊𨲋𨲌𨲎𨲏𨲐𨲑𨲒𨲓𨲘𨲙𨲚𨲛𨲜𨲝𨲞𨲟𨲠𨲡𨲢𨲣𨲤𨲥𨲦𨲧𨲨𨲩𨲪𨲫𨲬𨲭𨲮𨲯𨲰𨲱𨲲𨲳𨲵𨲶𨲸𨲹𨲺𨲻𨲼𨲽𨲿𨳀𨳁𨳂𨳃𨳄𨳅𨳆𨼲𨽸𩠷𩬂𩬬𩮊𩯢𩯫𫔖𫔗𫙀𬝑𬮄𬴬",
 "明": "奛奣曌朚焽琞盟萌㿢䳟𠒫𠓓𡦀𡪙𡹌𢜏𢜠𢡰𢢤𣇴𣇵𣈂𣈇𣊧𣊧𣋐𣔂𣷠𥎒𥯋𦻽𧖽𧡜𧾆𨧹𨮠𨵛𩣶𪂡𪢣𪣦𪴞𪻪𫀹𬊚𬯿",
 "夰": "奡昦臩𣔷𤽟𧭬𬛬",
 "務": "奦熃蓩霧㜈䥐䳱𠊮𡺱𡻒𣊃𣖶𥉠𥊦𦃤𦏃𧎻𧐙𧰈𨄝𩥎𩥦𩮼𬁒𬰞",
 "釆": "奧宷悉敹番竊釈释釋䎹䧽𠀭𠃆𠄚𠢏𠨟𠳅𠽲𡩨𡩭𡪃𢍏𣁝𣗷𣪖𤄪𤏓𤕽𤨺𥜌𥤈𥤑𥦓𥹄𥽊𦖗𦷀𦼀𧝰𧰌𨁢𨤑𨤒𨤕𨤖𨤗𨤘𨤙𨤚𨤛𨤜𨤞𨤟𨺀𨼟𩗞𪙖𫁝𫒀𫾶𬢸𬪺𬪻",
 "淵": "奫鼝㘤𨖳𩁵𪔱",
 "𦋹": "奰",
 "奢": "奲撦譇㦋㵔𠍽𠾏𢄳𦅁𦠏𨅓𨣍𨶶𫰂",
 "冘": "妉帎忱抌枕沈沊瓭眈紞衴訦躭邥酖醓鈂馾髧魫鴆鸩黆黕㓄㕪㱽㶩㼉㽎㽸䏙䒞䧵䪴𠆶𠖑𠛌𠜭𠠹𡖓𢇧𢑝𢗐𢘚𢻼𢼈𣅟𣜣𣢌𤘣𤜴𤫯𥁺𥁻𥑀𥝴𥤷𥫹𥲇𦥟𧊼𧖺𧴸𧺟𧿒𨋄𨑻𩈉𩨥𩵫𪔽𪠟𪻔𫈬𫍈𫖫𫭃𫳈𫸬𬘘𬬵",
 "夗": "妴宛怨盌眢苑駌鴛鸳㠾㼝㽜䖤䛄䳃𠙀𠛠𠝽𠽵𡁄𡍡𡖏𡶟𢪸𣆌𣪰𤨰𤳭𥰷𥿎𦊗𦕕𦖹𦗎𦙵𦦩𦨨𧐫𧧁𧯡𧵍𨞆𨧍𨪿𩊁𩎝𩖿𩚴𩺜𪀈𪎛𪞏𫍠𫩨𬱺",
 "乏": "姂抸柉泛疺眨砭窆貶贬鴔㞏㴀䍇䒦䟪𠇖𠰏𠹰𡶉𢇫𣆅𣭛𤇮𤝑𥁔𦚖𦷩𦹴𧊉𧒅𧦟𨥧𩬪𩶟𪀐𪣇𪥻𫛡𫣱𫦧𫸿𬎣𬐆𬜆𬨵",
 "𠂔": "姊柹泲秭笫胏趀㾅䙻䪠䪡䪢𠛔𡰾𢂍𣃩𤝮𦍜𦬷𧿲𨒉𨠓𨥦𩐈𫡜𬬳",
 "𦍌": "姜恙盖美羑羔羕羙羛義觲養㙚㦈㷣䢭𠋄𠏌𠏜𠓁𠵊𡃛𡻘𢮲𣉼𣙥𣜆𣝢𣞧𣴎𤏽𤓚𤹺𥃙𥃣𥃣𥃣𥕤𦍶𦍸𦎅𦎍𦎶𦏁𦏟𦏠𧜡𧮟𧷶𨝕𨢸𨶩𨻹𩌣𩱁𩺻𪩝𪭇𫅏𫅘𫟈善羕𫴰𬃑𬄿𬋌𬙬𬙰𬢱",
 "奻": "姦𡘛𡝉𫌥",
 "㚣": "姧",
 "𦣞": "姬媐宧洍茝賾赜頤颐㺇㺿㼢䇫䱌𠭃𠲬𡘡𡢰𢍴𣢮𤌇𤱻𦃂𦟧𧧃𩠡𩠢𪜥𫾱𬛢𬛣𬛨𬛪𬦎",
 "幵": "姸栞硏筓詽豣郉銒䶬𠛬𢁌𢆒𢆙𢆛𢆞𢆬𢏗𢝐𣥭𣬊𥅝𥅳𦐧𧙧𧵭𧷩𨴚𩒖𩔛𩩄𪚜𪬑𫷛𬙲",
 "戎": "娀毧狨絨绒茙賊贼駥㣝㭜䄾䘬䯷𠈋𠲦𡊸𢫨𣉝𣴛𥅯𥑳𥬪𦕧𧊕𧻪𨀻𨠤𨱿𪀚𪀵𫂽𫻸𫻸𬫍",
 "成": "娍宬峸晟晠珹盛窚筬絾膥臹荿誠诚郕鋮铖鯎㡬㼩䫆𠉛𠎶𠕠𡓖𡩍𡷫𢑻𢧓𢧚𣎉𣚺𣜽𣫽𣫿𣬀𤁑𤳡𤻯𤽷𥆏𥓉𥢲𦑆𦔣𦗱𦛙𨠽𨹚𩫨𪁋𪞞𪨯𪸤𫻽𬅄𬇠𬓻𬛻𬦌𬲐𬴡",
 "尾": "娓屗屘捤梶浘艉荱趘㞙䅏䇻䊊䜸䞔䬿𠉜𠡨𠧮𠳿𡓋𡥸𡦥𡱬𡱵𡲈𡲉𡲊𡲋𡲤𡲥𡲧𡲨𡲪𡲫𡲭𡲸𡲼𡳀𡳃𡳊𡳎𡳒𡳔𡳗𡳜𡳝𡳩𡳪𡳱𡳲𡳳𡳹𡳺𡷕𡷱𢭶𢽙𣍁𣛢𣻨𣽶𤈦𤉂𤌨𤳰𤽶𥒮𥖑𥜀𥹹𦀿𦅴𦘧𧋦𧚟𧱎𧱧𨁱𨘘𨤔𩗘𩷳𪑐𪘣𪨕𪨖𪨙𪨝𪨟𫥯𫯨𫰵𫱬𫵞𫵡𫵣𫸛𫸡𬨊𬪛",
 "兵": "娦宾捠梹浜鋲鬂㑟㙃𠓫𠔦𠡥𠴇𡇥𦛼𦷇𧇀𨛪𨴴𪻤",
 "呉": "娯",
 "似": "娰𠏳𠳎𩛮𫈄𫣵𬠊",
 "闲": "娴痫鹇𬚿",
 "弦": "娹婱惤誸㡉㭹𢛆𢮂𦱁𧼏𨧻",
 "帛": "婂幚幫棉淿綿緜绵艊錦锦䃇䛲𢃺𢄇𢄗𢅁𢅞𢸌𣍑𤎥𤦝𤾾𥌣𦧠𦰬𧂥𧂥𩸊𪁼𪏑𫷍𬠒𬥝",
 "匊": "婅掬椈毱淗粷菊諊趜踘躹陱鞠鵴麴麹㥌㹼㽤䕮䗇䜯䪕䱡𡫭𢵁𣮕𤜔𥶶𧂲𧝮𨨠𨿥𩁴𩌽𩣽𪅞",
 "忝": "婖悿掭添舔菾㖭㮇䋬𢧏𤲖𥪌𧨩𩋅𫔗𬁮",
 "昏": "婚崏惛捪棔殙涽焝琘痻睧碈緍諙錉閽阍㖧䄑䎽䫒𠉣𡝪𡨩𡼐𢽹𣇲𣉈𣋯𣣏𤘏𥟴𦖞𦟕𧍎𧓢𨌲𪂆𪆨𪉎𪑕𬀠𬁀𬁌𬛆",
 "𣶒": "婣棩淵蜵裫鼘𣉦𣽂𪔥𫃺𫿆𬕝𬵞",
 "帚": "婦掃濅箒菷鯞㑴㝲㫶㱕㴆㷌䢜𡞒𡪷𡫏𡹙𢃞𢃳𢅜𢅜𢅦𢅨𢱥𢹾𢽪𢽰𣖽𣘕𣠗𣹰𣼡𥇳𥛆𥧲𥨊𦲅𦵲𨓼𨧪𨺔𨺜𩅕𩤿𪂋𪂪𪩺𪾚𫃲𫚡𫹅𬖥𬤸",
 "岸": "婩硸錌䮗𠊀𠵚𢮹𤟉𨲊𩓤𩭢𪂢𪶐𫶂𬓀𬴁",
 "画": "婳𠵾𡳒𢛯𣶩𪽗𫽇",
 "审": "婶渖谉㻘",
 "柔": "媃揉楺渘煣猱瑈糅腬葇蝚蹂輮鍒鞣韖騥鰇鶔㑱㖻㽥䂋䋴䰆𠢢𢔟𢜸𣠳𣮪𥍲𥍳𥠊𦔇𧳨𨜙𪍚𪑶𪿌𫍅𫐓𫔄𫲑𬟟𬶧",
 "美": "媄嵄渼羹躾鎂镁䓺𠁍𠌉𠝫𡎤𡮔𢱒𣈸𣖙𣮺𤧞𥈢𥖺𥠦𥻙𦎡𦎿𦏄𦏒𦫧𧶾𨷑𨸈𨺰𩋼𩝏𪶤𪹏𪻄𫅖𫅚𫅝𫅟𫅠𫏟𫘑𫞁𬒙𬗮𬘅𬙴𬙵𬙺𬙼𬙾𬚛𬩇𬮎",
 "亲": "媇新榇親𤗟𫎪𫥔𬔫",
 "某": "媒楳湈煤禖腜謀谋㖼䗋䤂𠋦𠝺𠝼𡎡𡮘𢃱𢜮𢜯𢱖𣚻𣨴𤧀𤯏𦋡𦳑𧗅𨪀𩝇𩹮𪃏𪉏𪉴𪤘𪮍𪲣𫂋𫄼𫡪𫯊",
 "眉": "媚嵋楣湄煝猸瑂睸篃葿蝞郿鎇镅鶥鹛䰨𠋥𠪃𠷯𡡮𡡻𡩏𡭌𡮠𢃼𢊟𢔰𢰲𣈲𣎊𣮮𣽪𣾉𤚤𥊟𥋜𥌏𥌙𥚵𥻡𦎨𦠙𧛰𧱸𧳬𧶑𨉭𩄎𩅹𩋿𩯔𩹪𪵟𫃷𫐹𫗗𫵇𬴮",
 "柬": "媡徚揀暕朄楝湅煉瑓練萰諫谏鍊闌阑鰊鶫㪝㱫㼑𠋖𠒵𠣂𠷬𢃿𢒞𣍃𣞰𣱨𤗛𥈵𥻂𧍴𧡴𧹯𨃀𨐤𪧶𫌫𫔀𢛔𫴨𬮔𬶠",
 "染": "媣蒅𩃵𫽦",
 "胡": "媩楜湖煳猢瑚箶糊葫蝴衚醐鍸餬鬍鰗鶘鶦鹕㗅㾰䠒䩴䭌𡎁𡹹𢉢𢰮𤭱𧍵𧛞𧛫𨡷𩀉𪍒𪐉𪕮𪕱𪝍𫗫𫛷𬶞",
 "须": "媭𪾔𫷈𬘳",
 "芻": "媰搊煼皺篘縐蒭謅趨鄒雛騶鶵齺㑳㗙㥮㮲㱀䅳䐢䑼䪮𠞃𡙦𡦅𢐨𣉵𤌉𤌽𤑵𤠮𥪥𥻤𧎷𧛸𧳹𨃘𨪕𩌄𩱈𩱦𪄞𪎪𪕾𪙗𫐻𬑡𬧺𬯲",
 "𣬉": "媲磇膍螕貔鎞㡙㮰䠘𦃋𧪫𪄆𪉔𪍜𫔇",
 "息": "媳熄瘜蒠螅鄎鎴㮩㴧䭒𠒸𠺒𢥔𢥷𤻦𥰝𦞜𦧯𦧰𧪩𨃡𨻁𩔨𪃼𪄛𪬤𫺱𫺽𬳋",
 "留": "媹嵧廇榴溜熘瑠瘤磂籀罶蒥蹓遛鎦镏霤飀飗餾騮骝鬸鰡鶹鹠㨨䗜䝀䶉𠌃𠪐𠺕𡂆𢕍𢞓𢞭𢣠𤄍𤠑𥀓𥉳𥌐𥏵𥛅𥠷𥧥𥰣𥳩𦃓𦉉𦞧𦼾𧔳𧪭𧳽𧽖𨍸𨢇𨻧𩔲𪓸𪜦𫅾𫶌",
 "般": "媻幋搫搬槃瘢盤磐縏蒰螌褩鎜鞶㮽䃑䈲䰉𢟁𤠍𥈼𥉟𦪹𧏘𨃞𨃟𨕴𩺓𩺪𪄀𪒀𪒋𪤈𪹙𫨕𬖯𬰝",
 "𥁕": "媼慍搵榲氳溫熅縕膃蒕轀醞鰮𣯎𤬒𥠺𨎽𨜵𩟤𩥈𪉸𪍝㬈",
 "疾": "嫉愱槉蒺螏㑵𠹋𢞱𤌿𤖏𦣜𦶱𧎿𧪠𧽑𨕾𨪏",
 "弱": "嫋嵶愵搦榒溺篛糑蒻鰯鶸䐞䚥𠺁𡎳𡲳𢞔𢾲𢾼𤲹𥉧𦩸𨉱𨐪𨪤𨷊𩥩𪝟",
 "舀": "嫍幍慆搯槄滔熖瑫稻縚蓞謟蹈轁鞱韜韬饀㗖䈱䤾䧟䵚𠋯𠚘𠚡𠞞𠥒𠥪𠮐𡩹𡺫𤓁𤔥𤔱𤕄𤨐𥉰𥔿𥧹𦦌𦦨𦩹𦾩𧀜𨇲𨢝𨶒𩥅𩥓𩹴𪅎𪹗𬀖𬀢𬘺𬚁𬳊",
 "罓": "嫓岗纲鎫钢𡢓𥐻𥲓𥴎𥵭𦠼𧓡𪦂𫚅",
 "悘": "嫕",
 "旋": "嫙暶漩璇縼蔙鏇㯀䁢䃠䗠䲂𢄲𢕐𢳄𣎓𥪱𧐗𧜽𩘶𩠍𪍧",
 "殹": "嫛毉瑿瞖繄翳贀醫鷖鹥黳㗨㙠㬾㿄䃜䗟𢊘𣘦𣫫",
 "康": "嫝嵻慷槺漮穅糠躿鏮鱇㝩㱂䆲䗧𠻞𡐓𡻚𤮊𥉽𥕎𨄗𨎍𨝎𨻷𩾌𪏢𫂞",
 "規": "嫢摫槻槼瞡窺闚鬹䲅𡙭𡦑𧜴𪄯𫱟",
 "常": "嫦瑺蟐鏛㦂𠼔𢊥𣙟𣰎𣻸𤹰𩀯𪄹𫀠𫉒𫙲𫷓𫺺",
 "敕": "嫩慗整潄瘷遫鷘䔩𠍏𡄨𡏴𡠼𢌐𢕡𢳯𣙙𤃏𥶄𦌉𧫣𨤸𨫾𨽮𩐎𩞕𩥹𩮸𩺾𪅙𪞫𫂙𬗳",
 "雩": "嫮嶀摴樗謣鄠㻬𠻢𦉏𨖜𨬆𩅞𪄮",
 "啬": "嫱樯穑蔷𢠁𪪞𫄱𬈧",
 "敝": "嫳幣弊彆徶憋撆撇斃暼潎獘獙瞥蔽蟞襒蹩鄨鐅鱉鳖鷩鼈龞䌘䠥䥕䨆𠍯𠒳𠟈𠢪𡐞𡚁𡡹𢠳𣀽𣁢𣊶𣘮𣰉𣱔𤎨𤏰𤮕𤺓𥋗𥢭𥳆𦒐𦗥𦠞𧒀𧝬𧢍𧸁𩡡𩦉𫜁𬢓𬭯",
 "辜": "嫴橭䐻𠽿𢡇𥢍𧬕𨑀𨑀𨬕𨬟",
 "閑": "嫻澖鷴㯗䔵䥜𡤄𢡿𣩝𤡦𤺛𥊺𦠯𨅽𨶓𨼝𩦃𬵬",
 "戠": "嬂幟旘樴熾織膱蟙識軄𡑌𡑠𢡠𢴠𣄞𣽚𥋏𥢧𦺿𧝊𧸉𧹹𩯈𪼞𫤶𬥭",
 "須": "嬃澃盨蕦頾鬚䇓𠾫𢄼𢊼𢒷𣌌𣛪𥳗𦄼𦅓𨅑𨬗𩅺𩒹𩓾𩔾𪆦",
 "嗇": "嬙廧懎檣濇牆穡繬艢薔轖㱇䉢𠎸𠟩𠢳𡀁𡫆𢿿𤗼𤛷𥜎𧃻𧒗𨷗𩍙𩏫𩕡𩼒𬎓𬬋",
 "裊": "嬝𡑩𢶑𦆚𧒬",
 "董": "嬞懂𣿅𥋾𥣑𥪿𦡂𦡦𧄓𨆟𫷐𫾍",
 "㐮": "嬢穣譲醸𫬄",
 "慈": "嬨濨礠㘂䗹𢶴𥣓𥴺𨭨𩉋𪴆𫃕𫻌𬞧𬣐",
 "與": "嬩嶼懙擧旟歟璵礖礜穥籅藇譽轝鱮鸒㒜㠘㦛㵰㺞䑂𠁹𡁎𡒊𡽬𢷣𢹳𣄣𣝑𤄕𤑉𤪐𥎗𦏜𦦮𦦳𦦸𧞏𧸧𧾚𨘕𨣦𨮔𨮖𩁕𩦡𩼹𪇬𪋮𪤧𪴿𫬁𬍋𬎰𬛼",
 "賏": "嬰甖罌譻鑍鸎䴍𡔈𡬔𤑄𦢆𧮣𧶹𪭈𬋑𬯵",
 "𣎆": "嬴羸臝蠃贏赢驘鸁䇔𡳴𣜄𥢵𦆁𦣄𦣉𦣖𧝹",
 "綿": "嬵檰矊㒙𬞻𬡴",
 "麽": "嬷𬳔",
 "審": "嬸瀋覾讅㔤㰂𢸙𤪺𧀯𪬺",
 "興": "嬹䕟𠑣𠔻𠔻𠔻𠔻𡃳𢤀𢤽𢸁𢸾𤫂𤼈𥩆𦢯𦢰𦧅𦧅𦧅𨑁𨞾𨯵𫤂𫵪𬅊𬋙𬌐𬮀",
 "慝": "嬺",
 "賴": "嬾懶攋櫴瀨獺瓎癩籟藾襰㸊䄤䠭䲚𠘝𡚚𢀲𢁑𢅭𢤿𣡙𣡚𥗓𦇛𦧺𧔣𧴡𩯽𩽓𪈎𪈐𫣻𬨛𬯩",
 "霜": "孀灀礵驦骦鸘鹴䌮𢹩𥀸𪴜",
 "霝": "孁櫺蘦酃醽靈麢龗㪮䡼𠠢𢹝𤃩𤅫𤖥𤣍𤫊𤮮𤮸𤴤𤾻𥌼𥜧𦉢𦉣𦫃𧕅𧢥𧲙𧾮𨟮𨯻𨷰𩆒𩆕𩆖𩆚𩆞𩆻𩆼𩇄𩇎𩖊𩰂𩵀𪈝𪋶𪛈𫲚𫻝𬋣𬰑",
 "簋": "孂𤃾",
 "闌": "孄幱攔斕欄瀾爛瓓籣蘭襴讕躝鑭㘓㦨䃹䑌䪍𠓖𣩼𥌻𥽭𦧼𧕗𨏭𩽥𬐁",
 "韱": "孅懺攕櫼殲瀸籤纖襳讖谶鑯㡨㺤䃸䆎䊱䑎䘋䤘𡄑𡤪𡤷𡾺𢖝𣰷𣱰𤒯𤼋𥍀𧃖𨇦𨏪𩆷𩉔𩰁𪖎𫦟",
 "雙": "孇欆艭㩳䉶䝄𡾼𢅻𢥠𧄐𧕟𨇯𨰚𩆿𩽧𪫄",
 "耂": "孝考者耇耊㠻𢟾𢳩𣑥𤆯𤤜𤥧𤨛𥜣𥨮𥨮𦂂𦒱𦒳𦒶𦒷𦒻𦓆𦙩𨮩𩥏𩪒𩲘𫗍𬚉𬚋",
 "孖": "孨𠲚𡥨𤂇𫩼",
 "好": "孬恏䒵𠲡𡘏𡤟𥁨𪀮𪥸𪦟𫚻𫱪𬫓",
 "孨": "孱孴𠊩𡣁𡦥",
 "卵": "孵毈贕㤻㲉𠨫𠷞𣫘𧸷𪇄𫧼𫧾𫧿𬪁𬸬",
 "茲": "孶螆鰦𤮀𪇔𪑿𬹪",
 "辥": "孼櫱糱蠥㔎𪇷𫲕𬂘",
 "薛": "孽糵蘖躠㔑㜸𡤏𡿗𨇨𪈙𪈟𪎃𪺶𫊎",
 "弘": "宖泓紭苰鞃䡏䨎𠰈𢘌𢫠𣐜𣴦𥥈𨥺𪜴𪨭𪨮𪸡𬍝𬭂",
 "作": "宱筰莋㤰𠴚𢌣𢭢𣨐𤉔𤶙𧚙𧧻𧼄𨁔𨓕𨴰𪯕𫯧𫸋𬆖𬫛",
 "佰": "宿𧟸",
 "宓": "密寗淧蜜䀄䁇𡪖𡫹𢛬𥋱𧓫𧶡𨣘𩈰𪂁𪧟𪧠𫝱𫳡𫾌",
 "丙": "寎怲抦昞昺柄氞炳病眪窉苪蛃邴鈵陃陋鞆㑂㔷㪅㶮䇤䋑𠅈𠇮𠒝𠚇𠛥𠨆𠫧𠰳𠴠𡛦𡠈𡠈𡭃𡯞𡱆𢌒𢌒𢏺𢝦𢨿𢯬𢷡𢷡𣍪𣖀𣞬𣧰𣺭𤑣𤑣𤑣𤖶𤤝𤯳𤯽𤵿𤼄𥅙𥠛𥧃𥰑𥱗𥲼𥹘𦄱𦭯𦳭𧅳𧅳𧗚𧗚𧢮𧢮𧥗𧥗𧦿𨉓𨋣𨕈𨜦𨟫𨟫𨦖𨪣𨳵𨹟𩇽𩇽𩋸𩋹𩌻𩛄𩤳𩩹𩬝𩱪𩶁𩹐𩺂𩺂𪋘𪋘𪣃𪥇𪥓𪪃𪪻𪹄𪽲𫐣𫚎𫠥𫥤𫷻𬇞𬈇𬍈𬙵𬝦",
 "侵": "寑葠蘉䈜𠸬𣋨𣷽𨃏𩤨𩮕",
 "丆": "寕䁞𠖧𡾑𢀩𢁓𢷼𣔸𣞚𤁺𤪩𤳶𤻸𥄾𦆧𦇈𦪮𦫺備𫡏𫩑",
 "浸": "寖蓡䆮𠺸𢟖",
 "㼌": "寙攨窳蓏𠆁𢸖𤂜𤬑𪴒𫾞",
 "亅": "寜𠂌𠄍𠄐𠄑𠅠𠆤𠩄𠯃𠰤𡨬𡨴𢀗𣱱𤴮𥩬𥫘𥫧𥫮𥫮𥫮𨑎",
 "貫": "實慣摜樌瑻罆謴遦鏆䗰𢿒𣩔𤎽𥊫𥸜𨝑𪭖𪷈𫉜𫿖",
 "寍": "寧𣾈𦺝",
 "萈": "寬𬉛𬪖",
 "臬": "寱嵲暞甈臲鎳镍闑鷍㓷㙞㴪䆿𠹑𡬒𡰆𡰈𡺼𤾚𥉒𦤙𦤞𨃔𨻄𫔶",
 "豐": "寷灃艷蘴豒豓豔酆靊麷㒥㠦𦣂𧾳𨰘𫿩𬤺",
 "叵": "尀笸鉕钷𠐄𠰐𡶅𡶆𣲳𧙅𧿽𨸭𩑼𩢘𩳺",
 "身": "射竧裑躬躭躮躯躰躱躲躳躴躵躶躷躸躹躺躻躼躽躾躿軀軁軂軃軄軅軆軇軈軉銵鯓鵢㑗㛛㧶䆤䠲䠳䠴䠵䠶䠷䠸䠹䠺䠻䠼䠽䠾䠿䡀䡁𠗏𠤂𠾮𡘪𢈯𣕼𣛘𣽜𣽯𤶴𥨂𥨃𥨚𥨪𥨵𥲇𥼒𦎒𧬄𧾅𨈒𨈓𨈔𨈕𨈖𨈗𨈘𨈙𨈚𨈛𨈜𨈝𨈞𨈟𨈠𨈡𨈢𨈣𨈤𨈥𨈦𨈧𨈨𨈩𨈪𨈫𨈬𨈭𨈮𨈯𨈰𨈱𨈲𨈳𨈴𨈵𨈶𨈷𨈸𨈹𨈺𨈻𨈼𨈾𨈿𨉀𨉁𨉂𨉃𨉄𨉅𨉆𨉇𨉈𨉉𨉊𨉋𨉌𨉍𨉎𨉏𨉐𨉑𨉒𨉓𨉔𨉕𨉖𨉘𨉙𨉚𨉛𨉜𨉝𨉞𨉟𨉠𨉡𨉢𨉣𨉤𨉥𨉧𨉩𨉪𨉫𨉬𨉭𨉮𨉯𨉰𨉱𨉲𨉴𨉵𨉶𨉷𨉸𨉹𨉺𨉻𨉼𨉽𨉾𨉿𨊀𨊁𨊂𨊃𨊄𨊅𨊆𨊇𨊈𨊉𨊊𨊋𨊌𨊎𨊏𨊒𨊓𨊕𨊖𨊗𨊙𨊚𨊛𨊜𨊝𨊞𨌈𨓉𨖟𩅓𩫙𫊾𫏪𫏫𫏬𫏬𫏭𫏮𫏯𫏰𫏱𫐍𬢭𬧠𬧡𬧢𬧣𬧤𬧥𬧦𬧧𬧨𬧩𬧪𬧫𬧬𬧭𬧮𬧯𬧰",
 "乀": "尐匆",
 "尖": "尜𡙑𡙚𢬅𣑷𣴒𥧤𧗰𫵉𬚙",
 "昚": "尞",
 "尢": "尥尪尬尮尯尰尲尳尴尵尷㝼㝽㝾㝿㞀㞂㞄㞅㞆㞇㞈㞉㞊𠛦𡯃𡯄𡯆𡯇𡯈𡯉𡯋𡯌𡯎𡯏𡯐𡯔𡯕𡯖𡯘𡯙𡯞𡯡𡯢𡯣𡯤𡯥𡯦𡯨𡯩𡯪𡯬𡯭𡯮𡯰𡯳𡯴𡯵𡯹𡯺𡯻𡯽𡯾𡯿𡰀𡰂𡰄𡰆𡰊𡰋𡰌𡰎𡰑𡰒𡰖𡰗𡰝𡰠𡰢𡵈𢍽𢰛𥪻𦬍𦳨𧊑𧗢𧥩𧩗𩇳𩲄𩵛𫵎𫵏𫺀",
 "监": "尴槛滥篮蓝褴㨫䍀𣞎𪟎𫞨𫣉𫱕𫶊𫷌𬊶𬖮𬥾𬸡",
 "凷": "屆𠚛𠚛𠚛𧆣𧇏",
 "吊": "屌銱铞𠜏𠲢𠶇𡲻𢂋𢣬𢬚𢬢𣃫𣑐𥓟𥙙𥞡𦛉𦻋𨀽𨵾𪥳𪸧𫟘𬗏𬘣𬰭",
 "彳": "屐屜屦屧屨幑彴彵彶彷彸役彺彻彼彽彾彿往征徂徃径待徆徇很徉徊律徍徎徏徐徑徒従徔徕徖徘徙徚徛徜徝徟徠御徢徣徤徥徦徧徨復循徫徬徭微徯徰徱徲徳徴徵徶徸徹徺徻徼徽徾徿忀忁忂潃行鰴鵆黴㞛㣔㣕㣖㣗㣘㣙㣚㣛㣜㣝㣞㣟㣠㣡㣢㣣㣤㣦㣧㣨㣩㣪㣫㣬㣭㣮㣯㣰㣱㣲㣳㣴㣵㣶㣷㣸㣹𠕮𠝨𠞾𠤇𡀏𡋩𡕴𡱣𡱱𡱹𡱺𡲁𡲏𡲕𡲛𡲟𡲲𡲾𡳌𡳐𡳸𡽪𢒼𢒽𢒿𢓀𢓁𢓂𢓃𢓄𢓅𢓆𢓇𢓈𢓉𢓊𢓋𢓌𢓍𢓎𢓏𢓐𢓑𢓒𢓓𢓔𢓕𢓖𢓗𢓘𢓙𢓚𢓛𢓜𢓝𢓞𢓟𢓠𢓡𢓢𢓣𢓥𢓦𢓧𢓨𢓪𢓫𢓬𢓮𢓯𢓱𢓲𢓳𢓴𢓵𢓶𢓷𢓸𢓹𢓺𢓻𢓼𢓽𢓾𢓿𢔁𢔂𢔃𢔄𢔅𢔆𢔇𢔈𢔉𢔊𢔋𢔌𢔎𢔏𢔑𢔒𢔔𢔕𢔗𢔘𢔙𢔚𢔜𢔝𢔞𢔟𢔠𢔡𢔣𢔤𢔥𢔦𢔧𢔨𢔩𢔪𢔫𢔭𢔯𢔰𢔱𢔲𢔴𢔵𢔶𢔷𢔹𢔺𢔻𢔼𢔽𢔾𢔿𢕀𢕂𢕃𢕄𢕆𢕇𢕈𢕉𢕌𢕍𢕎𢕏𢕐𢕑𢕒𢕓𢕔𢕕𢕗𢕘𢕙𢕚𢕛𢕜𢕝𢕞𢕟𢕠𢕡𢕢𢕣𢕤𢕦𢕧𢕨𢕩𢕪𢕫𢕮𢕯𢕱𢕲𢕳𢕴𢕶𢕷𢕸𢕹𢕺𢕼𢕽𢕾𢕿𢖁𢖂𢖃𢖄𢖆𢖇𢖈𢖉𢖊𢖌𢖎𢖏𢖐𢖑𢖒𢖓𢖔𢖕𢖖𢖘𢖙𢖚𢖛𢖜𢖝𢖞𢖟𢖠𢖢𢖣𢖤𢖦𢖧𢚐𢝐𢝩𢝱𢟎𢡹𢲈𣈧𣰓𣶹𤁚𤎇𤦷𤺇𥂃𥅇𥉎𥋪𥟲𥧽𥨝𥨡𥯁𥷉𥷲𦂵𦑸𦖴𦱿𦵌𦹟𧠃𧢤𧲓𧾘𨇊𨇕𨍿𨑠𨘳𨝔𨤅𨤅𨪯𨼕𩄦𩝶𩻥𪎓𪨗𪪖𪫋𪫌𪫍𪫎𪫏𪫐𪫑𪫒𪫔𪫕𪫖𪫘𪫙𪫛𪫜𫈙𫉪𫋭𫋮𫋯𫋰𫋱𫟘𫟙徚衠𫳩𫵩𫹋𫹌𫹍𫹎𫹏𫹐𫹑𫹒𫹓𫹔𫹕𫹖𫹗𫹘𫹙𫹚𫹛𫹜𫹝𫹞𫹟𫹠𫹡𫹢𫹣𫹤𫹥𫹧𫹨𫹩𫹪𬠽𬠾𬠿𬡀𬡁𬣀𬨀𬷘",
 "雨": "屚𠭍𡢵𢉀𣍾𣠌𣾲𤍱𥷻𦗫𦫄𦲸𧀾𧌙𧓑𧯗𨂎𨘍𨜄𩁼𩃢𩃯𩃽𩄠𩆂𩆢𩇌𩇌𩗿𪂕𪋉𪤙𪭃𪷋𫋃𫒧𫕝𫕞𫕟𫕠𫕡𫕢𫕤𫕥𫕦𫕧𫕨𫕩𫕪𫕫𫕬𫕭𫕮𫕯𫕰𫕱𫕲𫕳𫕴𫕵𫕶𫕷𫰺𬝷𬯸𬯹𬯺𬯻𬯼𬯽𬯾𬯿𬰀𬰁𬰂𬰃𬰄𬰅𬰆𬰇𬰈𬰊𬰋𬰌𬰍𬰏𬰐𬰒𬰓𬰔𬰕𬵗",
 "復": "履澓癁蕧㠅䨱𥨍𥳇𧠅𫓍",
 "𢕪": "屩",
 "寮": "屪曢爎藔𠐟𠠙𡣲𢸘𤖡𤢸𥌢𥶣𧸴𨯈𨽒𩟩𪤮𪴔𪷷𬩪",
 "贔": "屭𠫍𤼟𧹈",
 "风": "岚枫沨疯砜讽飐飑飒飓飔飕飖飗飘飙飚㐽㚯𫗇𫗈𫗉𫗊𫗋𫠈𬜥𬰲𬱵𬱷𬱸𬱺𬱼𬱽𬱾𬱿𬲀𬲅𬲆𬳳",
 "厈": "岸㟁𠰑𡶨𢆌𣳙𧦡𧻀𩿫𪣄𪴪",
 "归": "岿𫢔",
 "企": "峜㖉𠐰𠐰𠐰𢬖𦕫𦮳𨀣𨕲𫿸𬆍𬷏",
 "𠧗": "峠挊桛裃鞐𬰬",
 "邪": "峫捓琊鋣㭨䓉𡌯𤕓𤞡𥦢𥭕",
 "夆": "峯峰捀桻浲烽琒綘艂莑蜂逢鋒锋韸髼㖓㛔㶻㸼䀱䏺䧏䴶𠉏𡨛𢈦𢌢𢓱𣇔𣟀𤑊𤖀𤶞𥍮𥭗𥹾𦜁𦪪𧋴𧒒𧚋𧧽𨎳𨡃𩄦𩊩𩡇𩷭𪔞",
 "⺨": "峱犯犰犱犲犳犴犵犷犸犹犺犻犼犽犾犿狁狂狃狄狅狆狇狈狉狋狌狍狎狏狐狑狒狓狔狕狖狗狘狙狚狛狜狞狟狠狡狢狣狤狥狦狧狨狩狪狫独狭狯狰狱狲狳狴狵狶狷狸狹狺狻狼狽狾狿猀猁猂猃猄猅猇猈猉猊猍猎猏猐猑猓猔猕猖猗猘猙猚猛猜猝猞猠猡猢猣猤猥猦猧猨猩猪猫猬猭猯猰猱猲猳猴猵猶猸猹猺猻猼猽猾猿獀獁獂獄獅獆獈獉獊獋獌獍獏獐獑獓獔獕獖獗獙獚獛獜獝獞獟獡獢獤獥獦獧獨獩獪獫獬獭獮獯獰獱獲獳獴獵獶獷獹獺獼獽獾獿玀玁玂玃㹝㹞㹟㹠㹡㹢㹣㹤㹥㹦㹧㹨㹩㹪㹫㹬㹭㹮㹯㹰㹱㹲㹳㹴㹵㹶㹹㹺㹻㹼㹽㹾㹿㺀㺂㺃㺄㺅㺆㺇㺈㺊㺋㺌㺍㺎㺏㺐㺑㺒㺔㺕㺖㺗㺘㺙㺚㺛㺜㺝㺞㺟㺠㺡㺢㺣㺤㺥㺦㺧𠍧𠧀𢇖𢔺𢞪𢠃𢢐𢦖𢬺𢼥𢼥𣘉𤜚𤜛𤜜𤜝𤜞𤜟𤜠𤜡𤜢𤜣𤜤𤜥𤜦𤜫𤜬𤜭𤜮𤜯𤜰𤜱𤜳𤜴𤜶𤜷𤜸𤜻𤜼𤜽𤜾𤜿𤝁𤝃𤝄𤝅𤝆𤝈𤝉𤝊𤝌𤝍𤝎𤝏𤝑𤝒𤝓𤝔𤝕𤝖𤝗𤝘𤝙𤝚𤝛𤝜𤝝𤝞𤝠𤝢𤝣𤝤𤝥𤝦𤝧𤝨𤝩𤝫𤝭𤝯𤝰𤝱𤝲𤝳𤝴𤝸𤝹𤝺𤝻𤝼𤝽𤝾𤝿𤞀𤞁𤞂𤞃𤞄𤞆𤞇𤞈𤞉𤞊𤞋𤞌𤞍𤞎𤞏𤞐𤞑𤞒𤞓𤞔𤞕𤞖𤞗𤞘𤞙𤞚𤞜𤞝𤞞𤞟𤞡𤞢𤞤𤞥𤞦𤞧𤞨𤞩𤞪𤞫𤞬𤞭𤞯𤞰𤞱𤞲𤞴𤞵𤞶𤞸𤞺𤞻𤞼𤞽𤞾𤟁𤟂𤟃𤟄𤟆𤟇𤟈𤟉𤟊𤟍𤟎𤟑𤟔𤟕𤟖𤟗𤟘𤟚𤟛𤟝𤟟𤟠𤟡𤟣𤟤𤟥𤟦𤟧𤟨𤟪𤟯𤟰𤟱𤟲𤟷𤟸𤟹𤟺𤟻𤟼𤟽𤟾𤟿𤠀𤠁𤠂𤠃𤠄𤠅𤠆𤠇𤠈𤠉𤠋𤠌𤠍𤠎𤠏𤠐𤠑𤠒𤠓𤠔𤠕𤠖𤠗𤠘𤠙𤠚𤠛𤠜𤠞𤠠𤠡𤠣𤠥𤠦𤠧𤠫𤠬𤠭𤠮𤠯𤠰𤠱𤠲𤠴𤠶𤠸𤠹𤠺𤠻𤠽𤠾𤠿𤡀𤡁𤡂𤡃𤡄𤡅𤡆𤡇𤡈𤡉𤡊𤡋𤡌𤡏𤡐𤡑𤡒𤡓𤡔𤡕𤡖𤡗𤡘𤡙𤡚𤡛𤡝𤡞𤡟𤡠𤡡𤡢𤡣𤡤𤡥𤡦𤡧𤡨𤡪𤡫𤡬𤡭𤡮𤡯𤡰𤡱𤡲𤡳𤡶𤡷𤡸𤡹𤡺𤡻𤡼𤢀𤢁𤢂𤢃𤢄𤢅𤢆𤢇𤢈𤢉𤢊𤢋𤢌𤢎𤢏𤢐𤢑𤢒𤢓𤢔𤢖𤢗𤢘𤢙𤢛𤢞𤢟𤢠𤢡𤢢𤢣𤢤𤢥𤢧𤢨𤢩𤢪𤢫𤢬𤢭𤢮𤢯𤢰𤢱𤢲𤢳𤢴𤢵𤢶𤢷𤢸𤢹𤢺𤢻𤢼𤢽𤢾𤢿𤣀𤣁𤣃𤣄𤣆𤣇𤣈𤣋𤣌𤣍𤣎𤣐𤣑𤣒𤣓𤣔𤣕𤣖𤣗𤣘𤣙𤣚𤣛𤣜𤣝𤣞𤣟𤣡𤣣𤣤𥃃𥒙𥨦𥭦𥱉𦍕𦛦𦲡𦲥𦴭𦷈𦹫𦽕𦿷𧃩𧃶𧄵𧪴𨖢𨛊𨭈𨴶𩄩𩇥",
 "攸": "峳悠浟焂筱莜跾鋚鞗鯈㛜㫍䀺䩦䱔𠌪𠤼𠳘𣒼𥁮𦐻𧇐𧌁𨁀𩗚𩛢𩥘𫚿𬰽𬲓",
 "宏": "峵浤硡竤綋翝鋐𠴈𥏕𦕹𨌆𩓘𪰧𫢦𫧲𫭊𬭎𬷚",
 "坎": "崁莰䤰𠥈𥦔𬁄",
 "沓": "崉涾濌誻踏錔鞜㛥㧺㭼㹺䂿䈋䍝䎓䓠䵬䶁𠉤𠴲𡌩𢃕𣝭𤦊𤿽𦑇𦧟𦧥𧌏𧛆𨌭𨓬𨡍𨵝𩎽𩣯𩭣𩷽𪂌𬓜",
 "函": "崡涵菡蜬顄㖤㮀䈄䘶䤴䨡𠗙𠾗𢃗𢔈𣣖𣼇𥓞𦜆𧖾𨺂𪻱𫱂𬢲",
 "甾": "崰椔淄疀緇缁菑輜辎錙锱鯔鲻鶅㓯㿳䅔䎩䐉䣎𡙂𡸟𣓩𤉣𤱽𤱾𤲑𤲙𤳊𤳤𤳫𤳯𤴅𥓲𥚉𥷿𦿊𧀗𧇄𧑳𧱥𨿴𩋝𩗮𪋍𪺟𫳗𫻾𬌊𬯞",
 "施": "崺揓暆椸湤箷葹鍦㒾㻢䗐䞄𠷇𡟕𤖌𤟽𥍸𥠥𦂛𦋤𧛖𧩹𧷆𨡪𬜌",
 "柱": "嵀㴤𥯸",
 "律": "嵂箻葎𠷈𢖀𢯰𣕖𣹕𦂻𧍶𪑯𪫓𪫚𪻃𫆧",
 "彥": "嵃谚顏𠷗𡎑𡙓𢒶𣨹𥀆𦫨𧱱𨂪𨩱𩕝𩠪𪃛𪵏𪻾𫈱",
 "𣢟": "嵌篏",
 "㚇": "嵏嵕惾朡椶猣稯糉緵翪艐葼蝬鍐騣鬉鬷鯼㣭㨑䁓䈦䍟䎫𥃑𦟨𪃊𪢃",
 "荣": "嵘溁㮠𫞡𫤒",
 "科": "嵙萪蝌䈖䌀𢱃𥧇𧎗𪍎𬈎",
 "钦": "嵚𫪽𫷷",
 "竒": "嵜𢰤𣣱𤦺𥔎𦍉𨪆𨵎𪥘𫫀𫮍𬃪",
 "屾": "嵞𡷪𡷬𡸧𡻍𡼰𡽒𡽚𡾀𡾕𡿘𢁃𢃷𣦭𤋬𤕘𦇜𨗞",
 "脊": "嵴瘠膌蹐鶺鹡䰪𢱣𣖷𣦒𥕂𦵾𩴎𩺀",
 "時": "嵵榯溡蒔鰣𠺮𡻄𤨅𥱯𥻵𨃯𨫉𪕵𪮛𪰰𬌦𬰈",
 "產": "嵼㹌䊲䐮𥊓𥽱𥽽𦸰𨄉𨲨𩥮𩮲𪉺𪙞𪤕𪩯𪿴𬎻",
 "頂": "嵿㴿𠽒𬗀𬱎",
 "唯": "嶉蓶鷕𣼲𧐌𪄼𬟢",
 "推": "嶊蓷㔼𤍐𨫻𫤄",
 "鳥": "嶋嶌樢殦瞗穒窵翵蔦鄥隝鳦鳧鳨鳩鳪鳫鳭鳯鳰鳱鳲鳴鳵鳶鳷鳸鳹鳺鳻鳼鳽鳾鳿鴀鴁鴂鴃鴄鴅鴆鴇鴉鴊鴋鴌鴍鴎鴏鴐鴑鴒鴓鴔鴕鴖鴗鴘鴙鴚鴛鴜鴝鴞鴟鴠鴡鴢鴣鴤鴥鴦鴧鴨鴩鴪鴫鴭鴮鴯鴰鴱鴲鴳鴴鴵鴶鴷鴸鴺鴻鴼鴽鴾鴿鵀鵁鵂鵃鵄鵅鵆鵇鵉鵊鵋鵌鵍鵎鵏鵐鵑鵒鵓鵔鵕鵗鵘鵙鵛鵜鵝鵞鵟鵠鵡鵢鵣鵤鵦鵧鵨鵩鵪鵫鵬鵭鵮鵯鵰鵱鵲鵳鵴鵵鵶鵷鵸鵹鵺鵻鵼鵽鵾鵿鶀鶁鶂鶃鶄鶅鶆鶇鶈鶉鶊鶋鶌鶍鶏鶐鶑鶒鶓鶔鶕鶖鶗鶘鶙鶚鶛鶜鶝鶞鶟鶠鶡鶢鶣鶤鶥鶦鶧鶩鶪鶫鶬鶭鶮鶰鶱鶳鶴鶵鶶鶷鶸鶹鶺鶻鶼鶽鶾鶿鷀鷁鷂鷃鷄鷅鷆鷇鷈鷉鷊鷋鷌鷍鷎鷏鷐鷑鷒鷓鷔鷕鷖鷗鷘鷙鷚鷛鷜鷝鷞鷟鷠鷡鷢鷣鷤鷥鷦鷧鷨鷩鷪鷫鷬鷭鷮鷰鷱鷲鷳鷴鷵鷶鷷鷸鷺鷻鷼鷾鷿鸀鸁鸂鸃鸄鸅鸆鸇鸈鸉鸊鸋鸌鸍鸎鸏鸐鸑鸒鸓鸔鸕鸖鸗鸘鸙鸚鸛鸜鸞鸧㠀㨶䉆䙚䲥䲦䲧䲨䲩䲪䲫䲬䲭䲮䲯䲰䲱䲲䲳䲴䲵䲶䲷䲸䲹䲺䲻䲼䲽䲾䲿䳀䳁䳂䳃䳄䳅䳆䳇䳈䳉䳊䳋䳌䳍䳎䳏䳐䳑䳒䳓䳔䳕䳖䳗䳘䳙䳚䳛䳜䳝䳞䳟䳠䳡䳢䳣䳤䳥䳦䳧䳨䳩䳪䳫䳬䳭䳮䳯䳰䳱䳲䳳䳴䳵䳶䳷䳸䳹䳺䳻䳼䳽䳾䳿䴀䴁䴂䴃䴄䴅䴆䴇䴈䴉䴊䴋䴌䴍䴎䴏䴐䴑䴒𠌵𠑃𠘜𠞸𠟀𡂢𡃸𡆈𡈙𡒚𡡅𡣴𡫕𡫰𡰎𡿙𢄦𢋥𢥶𢸐𣝨𣥁𣦘𣫠𤅩𤅼𤅽𤡕𤴒𤹷𤻉𤼡𥖧𥩏𥵌𦄋𦉓𦠂𦾉𦿬𦿲𧁢𧂶𧅖𧅧𧅯𧅻𧅿𧆖𧆚𧖠𧜣𧞡𧬽𧰏𧽪𨄙𨙡𨰽𨶠𩆳𩏻𩖔𩖔𩘲𩘵𩙾𩙾𩧒𩽠𩾏𩾐𩾑𩾒𩾓𩾔𩾕𩾖𩾗𩾘𩾙𩾚𩾛𩾜𩾝𩾟𩾠𩾡𩾢𩾣𩾤𩾥𩾦𩾧𩾨𩾩𩾪𩾫𩾬𩾭𩾮𩾰𩾱𩾲𩾳𩾴𩾵𩾶𩾷𩾸𩾹𩾺𩾻𩾼𩾽𩾾𩾿𩿀𩿁𩿂𩿃𩿄𩿅𩿆𩿇𩿈𩿉𩿊𩿋𩿌𩿍𩿎𩿏𩿐𩿑𩿒𩿓𩿔𩿕𩿗𩿘𩿙𩿚𩿛𩿜𩿝𩿞𩿟𩿠𩿡𩿢𩿣𩿤𩿥𩿦𩿧𩿨𩿩𩿪𩿫𩿬𩿭𩿯𩿰𩿱𩿲𩿳𩿵𩿶𩿸𩿹𩿺𩿼𩿽𩿾𩿿𪀀𪀁𪀂𪀃𪀄𪀅𪀆𪀇𪀈𪀉𪀊𪀌𪀍𪀎𪀏𪀐𪀑𪀒𪀓𪀔𪀕𪀖𪀗𪀘𪀙𪀚𪀛𪀜𪀝𪀞𪀟𪀠𪀡𪀢𪀣𪀤𪀥𪀦𪀧𪀨𪀩𪀪𪀫𪀬𪀭𪀮𪀯𪀰𪀲𪀳𪀴𪀵𪀶𪀷𪀸𪀹𪀺𪀻𪀼𪀽𪀾𪀿𪁀𪁁𪁂𪁃𪁄𪁅𪁆𪁇𪁈𪁉𪁊𪁋𪁌𪁍𪁎𪁏𪁐𪁑𪁒𪁓𪁔𪁕𪁖𪁗𪁘𪁙𪁛𪁜𪁝𪁞𪁟𪁠𪁡𪁢𪁣𪁤𪁥𪁦𪁧𪁨𪁩𪁪𪁫𪁬𪁭𪁮𪁯𪁰𪁱𪁲𪁳𪁴𪁵𪁶𪁷𪁸𪁹𪁺𪁻𪁼𪁽𪁾𪁿𪂀𪂁𪂂𪂃𪂄𪂅𪂆𪂇𪂈𪂉𪂊𪂋𪂌𪂍𪂎𪂏𪂐𪂑𪂒𪂔𪂕𪂖𪂗𪂙𪂚𪂛𪂜𪂝𪂞𪂟𪂠𪂡𪂢𪂣𪂤𪂥𪂦𪂨𪂩𪂪𪂫𪂬𪂭𪂮𪂯𪂰𪂱𪂲𪂳𪂴𪂵𪂶𪂷𪂸𪂹𪂺𪂻𪂼𪂽𪂾𪂿𪃀𪃁𪃂𪃃𪃄𪃅𪃆𪃇𪃈𪃉𪃊𪃋𪃌𪃍𪃎𪃏𪃐𪃑𪃒𪃓𪃔𪃕𪃖𪃗𪃘𪃙𪃚𪃛𪃜𪃝𪃞𪃟𪃠𪃡𪃢𪃣𪃤𪃦𪃧𪃨𪃩𪃪𪃫𪃬𪃭𪃮𪃯𪃰𪃱𪃲𪃳𪃴𪃵𪃶𪃸𪃹𪃺𪃻𪃼𪃽𪃾𪃿𪄀𪄁𪄂𪄃𪄄𪄅𪄆𪄇𪄈𪄉𪄊𪄋𪄌𪄍𪄎𪄏𪄐𪄑𪄒𪄓𪄔𪄕𪄖𪄗𪄘𪄙𪄚𪄛𪄜𪄝𪄞𪄟𪄠𪄡𪄢𪄣𪄤𪄥𪄦𪄧𪄨𪄩𪄪𪄫𪄬𪄭𪄮𪄯𪄰𪄱𪄲𪄳𪄴𪄵𪄶𪄷𪄸𪄹𪄺𪄻𪄼𪄽𪄾𪅀𪅁𪅂𪅃𪅄𪅅𪅆𪅈𪅉𪅊𪅋𪅌𪅍𪅎𪅏𪅐𪅑𪅒𪅓𪅕𪅖𪅗𪅘𪅙𪅚𪅛𪅜𪅝𪅝𪅞𪅟𪅠𪅡𪅢𪅣𪅤𪅥𪅦𪅧𪅨𪅩𪅪𪅫𪅬𪅭𪅮𪅯𪅰𪅱𪅲𪅳𪅴𪅵𪅶𪅷𪅸𪅹𪅺𪅼𪅽𪅾𪅿𪆀𪆁𪆂𪆃𪆄𪆅𪆆𪆇𪆈𪆉𪆊𪆋𪆌𪆍𪆎𪆏𪆐𪆑𪆒𪆓𪆕𪆖𪆗𪆘𪆙𪆚𪆛𪆜𪆝𪆞𪆟𪆠𪆡𪆢𪆣𪆤𪆥𪆦𪆧𪆨𪆩𪆪𪆫𪆬𪆭𪆮𪆯𪆰𪆲𪆳𪆴𪆵𪆶𪆷𪆸𪆹𪆺𪆻𪆼𪆽𪆾𪆿𪇀𪇁𪇂𪇄𪇅𪇆𪇇𪇈𪇉𪇊𪇋𪇌𪇍𪇎𪇏𪇐𪇑𪇒𪇓𪇔𪇕𪇖𪇗𪇘𪇙𪇚𪇛𪇜𪇝𪇞𪇟𪇠𪇡𪇢𪇣𪇤𪇥𪇦𪇧𪇨𪇩𪇪𪇫𪇬𪇭𪇮𪇯𪇰𪇱𪇲𪇳𪇴𪇵𪇶𪇷𪇸𪇹𪇺𪇻𪇼𪇽𪇾𪇿𪈀𪈁𪈂𪈃𪈄𪈅𪈆𪈇𪈈𪈉𪈊𪈋𪈌𪈍𪈎𪈏𪈐𪈑𪈒𪈓𪈔𪈕𪈖𪈗𪈘𪈙𪈚𪈛𪈜𪈝𪈞𪈟𪈠𪈡𪈢𪈣𪈤𪈥𪈦𪈧𪈨𪈩𪈪𪈫𪈬𪈭𪈮𪈯𪈰𪈱𪈲𪈳𪈴𪈵𪈶𪈷𪈸𪈹𪈺𪈻𪈼𪈾𪈿𪋞𪪦𪾖𫚮𫚯𫚰𫚱𫚲𫚳𫚴𫚵𫚶𫚷𫚸𫚹𫚺𫚻𫚼𫚽𫚾𫚿𫛀𫛁𫛂𫛃𫛄𫛅𫛇𫛈𫛉𫛊𫛋𫛌𫛍𫛎𫛏𫛐𫛑𫛒𫛓𫛔𫛕𫛖𫛗𫛘𫛙𫠔䳎䳭𪃎𪈎𫧙𫼃𬳥𬶼𬶽𬶾𬶿𬷀𬷁𬷂𬷃𬷄𬷅𬷆𬷇𬷈𬷊𬷋𬷌𬷍𬷎𬷏𬷐𬷑𬷒𬷓𬷔𬷖𬷗𬷘𬷙𬷚𬷛𬷜𬷝𬷞𬷟𬷠𬷡𬷢𬷣𬷤𬷥𬷦𬷧𬷨𬷩𬷪𬷫𬷬𬷭𬷮𬷯𬷰𬷱𬷲𬷳𬷴𬷵𬷶𬷷𬷸𬷹",
 "習": "嶍慴摺槢漝熠磖翫褶謵霫飁騽鰼鳛㗩㠄㦻㿇䌌䐲䒁𢄭𣤊𣯥𣯮𤗨𤛊𤬥𥱵𦒆𦒣𦗗𦧱𦸚𧐔𪄶𪦞",
 "尉": "嶎慰熨犚罻蔚螱褽霨䲁𢠢𣡇𣻷𤛌𥳀𧐇𧕈𨄯𩡛𩻍",
 "隆": "嶐漋癃窿蕯霳㝫㦕䃧𠾐𥀼𥳌𧑟𪔳𪔴",
 "欽": "嶔廞撳䃢𠪢𠾬𡼲𢡮𢦆𢵡𣾠𤺰𨅠𨇬𨼌",
 "棧": "嶘𥖔𥴈",
 "尞": "嶚嶛䭜𤃜𧈏𨇉𨝼𩻻𫕔𫹣𫿿𬋘𬟖𬤟𬲅𬴉",
 "業": "嶪嶫擈曗檏澲礏鄴驜鸈㒒㗼㡤㱉㸁㸣䌜䧨𡑿𢢜𣩫𤩶𤾧𥋙𥣈𥴼𦡧𧀸𧬬𧸢𨗩𨭥𩑃𩕟𩼋𪋫𪒲𪖊𪴨𪴨𫰃",
 "戢": "嶯擑檝濈艥蕺霵𤖞𥊬𥖙𦠾𨎵𩦤𫍎𫙺",
 "解": "嶰廨懈檞澥獬繲薢蟹蠏邂㙰㿍䉏䲒𠎿𡽖𢖆𢶷𤐃𤛳𥎎𧥁𨮂𨱕𨼬𩍝𩼠𪠘𬧕",
 "罪": "嶵檌㠑䊫𨗻𬠯",
 "微": "嶶癓矀薇覹霺㜫㵟䉠䥩𡤇𣌎𣰒𦗸𧒰𧢓𧸮𨣟𨱖𨷋𩙉𩴰𩼌𫌭",
 "領": "嶺䕘𡽹𢋞𥵝",
 "截": "嶻擮蠘㵶䕙䘁䟌䥫䰏䶪𡽱𣝫𤪚𤻛𥵞𥸔𧕾𧖡𧞛𨲹𩦷𪖋𫚂𬺕",
 "獄": "嶽鸑𡈭𡽺𧀀𩁓",
 "雀": "巀熦𠓃𠻘𡦓𡾃𢧵𢷿𣼎𤁢𤄔𤍳𤻵𥣩𦿐𧓷𧞩𧽟𧾢𨄤𩟦𩯰𪅓𪖀𪾻𫋗𬑥",
 "颠": "巅癫𫬟𬧚",
 "營": "巆攚櫿瀯㹚㿘𤒨𤫎𥗞𧕍𫑔",
 "鞠": "巈蘜驧𠮑𡖁𥷥",
 "歸": "巋蘬𥍁𧢦𧢫𧰥𬵻",
 "厳": "巌𠑊",
 "魏": "巍犩蘶䭳𡿁𦓌𧕞𨇷",
 "髜": "巐",
 "顚": "巓㰜𬵽",
 "顛": "巔攧癲𠑘𡅥𡬅𣪀𧄺𨈀𪓇𪚉",
 "夔": "巙虁躨𢆃𥜶𧅄𪭆",
 "辶": "巡暹辷辸边辺辻込辽达辿迀迁迂迃迄迅迆过迉迊迋迌迍迎迏运近迒迓返迕迖迗还迠迡迢迣迤迥迦迧迨迪迫迬迭迮迯述迱迲迴迵迶迷迸迹迺迻迼追迾迿退送适逃逄逅逆逇逈逋逌逍逎透逐逑递逓途逕逖逗逘這通逛逜逝逞速造逡逢連逤逥逨逩逪逫逭逮逯逰週進逳逴逵逶逷逸逼逽逾逿遁遂遃遄遅遆遇遈遉遊運遌遍過遏遐遑遒道達違遘遚遛遜遝遞遟遠遡遢遣遥遦遧遨適遪遫遬遭遮遯遰遱遲遳遴遵遶遷選遹遺遻遽遾避邀邁邂邃還邅邆邇邈邉邋邌邍邎邏䢊䢋䢌䢍䢎䢐䢑䢒䢓䢔䢕䢖䢗䢘䢙䢚䢛䢜䢝䢞䢟䢠䢡䢢䢣䢤䢥䢦䢧䢨䢩䢪䢫䢬䢭䢮䢯䢰䢱䢲𠴴𡁂𡂭𡭎𡱦𣚢𣝘𣟀𣤎𣸘𣽑𣾣𣿔𩄫𩅆𩍠𩛓𪴐𪴠𫈡𫐞𫐟𫐠𫐡𫐢𫐣𫐤𫐥𫐦𫐧𫐨𫐩𫐪𫐫𫐬𫐭𫐮𫐯𫐰𫐱𫐲𫐴𫐵𫐶𫐷𫐸𫐹𫐺𫐻𫐼𫐽𫐾𫐿𫑀𫑁𫑂𫑃𫑄𫑅𫑆𫑇𫑈𫑉𫑊𫑋𫑌𫑍𫑎𫑑𫑒𫑓𫑔𫑕𫑖𬕟𬞤𬤖𬨜𬨝𬨞𬨟𬨠𬨡𬨢𬨣𬨤𬨥𬨦𬨧𬨨𬨩𬨪𬨫𬨬𬨭𬨮𬨯𬨰𬨱𬨲𬨳𬨴𬨵𬨶𬨷𬨸𬨹𬨺𬨻𬨼𬨽𬨾𬨿𬩀𬩁𬩂𬩃𬩅𬩆𬩇𬩈𬩉𬩊𬩋𬩌𬩍𬩎𬩐𬩑𬩒𬩔𬩕𬩖𬩗𬩘𬩙𬩚𬩜𬩝𬩞𬩟𬩠𬩡𬩢𬩣𬩤𬩥𬩦𬩧𬩨𬩩𬩪𬩫𬩬𬩭𬩮𬩯𬩰𬩱𬩲𬵯",
 "凡": "巩帆忛杋梵汎矾竼舤舧芃訉軓釩钒骪㕨㞩㺬䏎䒮䖠䭵䴟𠆩𠔮𠕵𠘻𠘻𠙜𠙦𠙩𠙮𠙰𠙱𠥷𠫨𡠧𡢔𡢣𡣍𢔫𢭾𢼐𣋰𣎆𣔗𣕡𣡅𤄞𤈺𤖫𤜦𤬨𤰑𤳚𥃵𥟌𥭂𥱍𥷶𥸏𥿒𦅛𦢗𦢱𦣔𧄿𧆉𧕺𨈔𨏩𨑙𨙮𨝻𨟱𨥵𨭞𩖛𩫼𩶞𩼊𩾨𪎒𪜠𪞖𪢵𫎣㺬𩬰𫢃𫢄𫰉𫲓𫷵𬉑𬉩𬉫𬖊𬗄𬬘𬷥𬹐",
 "功": "巭昮𠢈𥑙𥥙𧦪𨋝𪥺",
 "⺶": "差着羌羞羡羴鮺鲝𤕛𨶔𨶕𪉤𬙲",
 "㐬": "巯巰旈旒梳橀毓流琉疏硫艈裗酼醯鋶锍鯍麍㧧㲙䖻䟽𠞌𠡤𢂙𢏭𣊀𣻤𦀠𦈷𦔑𧨆𪎣𪠻",
 "𦣝": "巸弬𣐵𤇴𦚟𩜮𩠛",
 "彐": "帚当彗扫榋榋榋灵穏锓隠雪骎㝷㞪㾛䘲䭡𠊕𠪘𠭊𠽽𡃫𡄞𡄞𡖩𡖩𡝘𡫧𡫩𡫩𡫩𡫩𡬶𡺧𢑑𢑑𢑒𢑔𢑕𢑝𢑝𢑟𢑠𢑠𢑤𢑧𢑧𢑫𢑫𢑬𢑬𢑭𢑮𢑮𢑯𢑰𢑰𢑲𢑴𢑵𢑵𢑶𢑶𢑻𢑻𢑼𢑽𢑽𢑿𢦳𢭈𢮮𢽖𢽤𣆸𣇶𣇶𣐔𣚉𣚉𣪏𣵌𣼙𤱚𤶍𥧴𥺑𦄳𦇚𦘞𦮑𨔡𨝻𨡉𩆥𩈟𩈟𩒔𩰸𩰸𩺎𩿿𪓥𪓥𪠬𪫆𫊞𫍆𫗆𫡆𫸖𫹄𬯍𬰙𬳨",
 "邦": "帮幚挷梆綁绑䦁𠳐𢀥𣵮𥒷𥮇𦜅𨧜𪥶𫑢𫷪𫺎",
 "丗": "帯𣀱𣦏𣳘𤢋𥽒𥽒𪺲",
 "旲": "幂莫𠖇𡋵𡚙𡢊𤅲𥦏𥰻𥴵𦀤𦜃𦶺𧁠𧋯𩓌𪠊𪴡𪸮𫂁",
 "晃": "幌愰榥滉熀皩縨鎤㨪䁜𠒼𣄙𤨆𦵽𪝚𫦴",
 "景": "幜影憬撔暻澋燝璟鐛顥颢㔀䭘䯫𠎠𠑱𠘉𡐹𡼩𡼮𢀍𢇔𢒬𣌚𥋓𥖉𦅡𧑊𩐿𩻱𪆣𫃏𫖧𬄣𬳑𬶱",
 "掌": "幥撑礃罉鐣𡑄𣛟𣾦𥋇𥳶𦪦𦺡𩇢𩠏𩻰𫫮𬶰",
 "蒙": "幪懞曚朦檬氋濛獴矇礞艨蠓靀饛鸏鹲㠓㩚䑃䙩䤓䰒䴌䵆𠐁𠖨𡁏𡒯𡮹𣰥𤔽𤔾𤘁𤪑𤮠𤯻𤯾𤾬𥣛𥵿𦆟𦿢𧅭𧭊𨞫𨮵𨼿𩍬𩕱𩦺𬴌",
 "蔑": "幭懱櫗瀎礣蠛衊襪鑖韈韤鱴㒝㩢䁾䌩䩏䯦𡃙𣋻𤻻𥀯𥣫𩱵𩱷𩴾𪇴𫉼𬴱𬹛",
 "廚": "幮櫥躕𪻋𫴶",
 "節": "幯擳櫛瀄癤蠞㘉㦢㸅䗻䲙𠐉𠠑𥣮𨙌𫃖",
 "憲": "幰攇櫶瀗藼㦥䘆䜢䧮𡾢𢖘𤼂𧾨𨏥𨯶𩍹𪺅𪼭",
 "𢆶": "幽聫㡬㺦𠶽𠹿𡋢𡙠𢇏𢇑𢇖𢹶𣂾𣺝𧁖𪀨𪜆𪪋𪮵𫋔𫠩𫧠𫷠𫷡𫷢𫷣𫿙𬂋",
 "广": "庀庁庂広庄庅庆庇庈庉床庋庌庍庎序庐庑庒库应底庖店庘庙庛府庝庞废庠庡庢庣庤庥座庨庩庪庫庬庭庮庯庰庱庲庳庴庵康庹庺庻庼庽庾庿廁廂廃廄廅廆廇廈廉廊廋廍廎廏廐廑廒廓廔廕廖廗廘廙廚廜廝廞廟廠廡廢廣廤廥廦廧廨廩廪廫廬廭廮廯廰廱廲廳応扩旷犷矿緳纒纩邝龐㐣㚧㡯㡰㡱㡲㡳㡴㡶㡷㡸㡹㡺㡻㡼㡽㡾㡿㢀㢁㢂㢃㢄㢅㢆㢇㢈㢉㢊㢋㢌㢍㢎㢐㢑㢒㢓㢔㢖㢗㢘㢙㢚㢛㢜㢝㢞㥷㲿䧪䧹䨾𠆲𠊒𠏛𠚳𠜢𠝇𠿾𡃚𡄁𡅝𡈷𡌻𡍔𡏂𡒅𡢜𡢦𡣀𡣇𡪼𡮰𢃨𢇗𢇘𢇙𢇚𢇛𢇝𢇞𢇟𢇡𢇢𢇣𢇤𢇥𢇦𢇧𢇨𢇩𢇪𢇫𢇬𢇭𢇮𢇯𢇰𢇱𢇲𢇳𢇴𢇶𢇸𢇹𢇺𢇻𢇼𢇽𢇾𢇿𢈀𢈁𢈂𢈃𢈄𢈅𢈆𢈇𢈈𢈉𢈊𢈋𢈌𢈎𢈐𢈑𢈒𢈓𢈕𢈖𢈗𢈘𢈙𢈚𢈛𢈜𢈝𢈞𢈟𢈠𢈡𢈢𢈣𢈤𢈥𢈦𢈧𢈨𢈩𢈪𢈫𢈭𢈯𢈱𢈳𢈴𢈵𢈶𢈷𢈸𢈹𢈻𢈼𢈽𢈾𢈿𢉀𢉁𢉂𢉃𢉄𢉅𢉆𢉇𢉈𢉉𢉊𢉋𢉌𢉍𢉎𢉏𢉐𢉑𢉒𢉓𢉔𢉕𢉗𢉘𢉙𢉚𢉛𢉜𢉝𢉞𢉟𢉠𢉡𢉢𢉣𢉤𢉥𢉦𢉧𢉨𢉩𢉪𢉬𢉭𢉮𢉯𢉰𢉱𢉲𢉳𢉴𢉵𢉷𢉸𢉹𢉼𢉽𢉾𢉿𢊀𢊂𢊃𢊄𢊅𢊆𢊈𢊉𢊊𢊋𢊍𢊎𢊏𢊐𢊑𢊒𢊓𢊔𢊘𢊚𢊛𢊜𢊝𢊞𢊟𢊠𢊡𢊢𢊤𢊥𢊦𢊧𢊨𢊩𢊫𢊬𢊭𢊮𢊯𢊰𢊱𢊲𢊳𢊴𢊵𢊷𢊸𢊹𢊺𢊻𢊼𢊽𢊿𢋀𢋂𢋃𢋄𢋅𢋆𢋇𢋈𢋉𢋊𢋌𢋍𢋏𢋐𢋑𢋒𢋓𢋔𢋕𢋖𢋗𢋘𢋛𢋜𢋞𢋟𢋡𢋢𢋤𢋥𢋦𢋧𢋨𢋫𢋬𢋭𢋮𢋯𢋰𢋶𢋸𢋹𢋻𢋼𢋽𢋾𢋿𢌀𢌂𢌃𢌄𢌅𢌆𢌈𢌉𢌋𢌍𢌏𢌐𢌒𢌓𢌔𢌕𢌖𢑶𢑻𢒹𢞢𢟴𢣽𢯪𢳁𢳅𢳿𢻘𣐼𣒷𣔳𣖸𣘋𣙃𣚲𣟜𣠯𣳝𣳥𣴔𣴿𣼄𣾆𣾩𤆓𤊭𤒲𤖑𤗙𤨫𤩻𤯎𥊆𥌬𥑈𥖂𥜢𥯯𥹺𥺨𥼊𦀫𦆍𦉨𦢵𦢻𦳅𦶹𦾰𦿬𧂶𧈴𧍽𧐚𧐷𧑢𧒐𧓣𧔊𧔋𧕻𧧉𧩅𧩔𧩯𧫨𧫯𧫰𧫽𧸛𧸳𧻧𧼳𧽴𧿈𨀟𨀠𨂫𨄀𨇭𨌱𨍗𨓀𨓍𨓩𨕁𨖓𨪞𨭤𨷭𨸘𩃽𩐕𩒩𩕅𩖆𩣴𩺋𩾦𪈲𪗆𪙱𪨿𪪌𪪍𪪎𪪏𪪐𪪑𪪒𪪓𪪔𪪕𪪖𪪗𪪘𪪙𪪚𪪛𪪜𪪝𪪞𪪟𪪡𪪢𪪣𪪥𪪦𪪧𪪨𪷲𫏤𫝶𫝷𫠕𫩕𫷥𫷦𫷧𫷨𫷩𫷪𫷫𫷬𫷭𫷮𫷱𫷲𫷳𫷴𫷶𫷷𫷸𫷹𫷺𫷼𫷽𫷾𫷿𫸀𫸁𫸂𫸃𫸄𫸅𫸆𫸇𫸈𬦺𬪺",
 "发": "废拨泼袯酦䥽𦫘𩧯𫏆𫭨𬏦𬔹𬜧",
 "技": "庪𠴜𢴛𨅅𪨵𪮣𫽂",
 "隶": "康捸棣殔逮隸霴齂㥆㻖䇐䠈𠘞𠟷𠡫𡝯𢰬𢸀𣇨𣟌𤂰𤃀𥌤𥓏𥟤𥮤𥶾𧳙𨽶𨽷𨽸𨽺𨽻𨽼𨽼𨽾𨽿𨾀𨾁𨾂𨾃𨾄𩭞𩸙𩸺𪂩𪑠𪵞𫀘𫈤𫕙𬵯𬸗",
 "枀": "庺",
 "臾": "庾惥斔斞楰瘐腴萸諛谀㔱㥚㳛䝿𠋟𠑞𡃪𡓤𡩟𢊻𢤳𣈵𣚲𣟨𣮵𣯁𤃘𤃚𤗝𤧙𤼊𥌶𥔢𥤒𥯮𦇣𦇶𦥳𦦚𦦚𧍳𧰇𨇚𨖽𨷪𨺫𨺺𨽠𩀑𩉓𩍾𩟱𩤺𩪹𩯿𪃪𪼖𫐯𫭌𫿷𬁚",
 "発": "廃溌醗㾱𫈴𫝼𬐂",
 "部": "廍篰蔀𠘁𡏿𣘙𧐾𩅇𩻗𫚨𫨚𫯵",
 "旣": "廐槩槪漑",
 "郭": "廓槨漷霩鞹㗥㨯㬑䁨𡻙𡻳𥂣𥕖𦗒𦹐𨎎𪅪",
 "陰": "廕癊蔭",
 "尌": "廚樹澍㕑𠾢𢣵𧔋𨅒𪧽𫋚𫓄𫥙",
 "屠": "廜潳鷵䠧䣝𠪡𤺈𧬅𨼑𬄫𬤜",
 "發": "廢撥橃潑癈蕟襏蹳醱鏺驋鱍㔇㗶䚨𢠺𣰀𤗳𥳊𦪑𧬋𩯌𪖆𪩕𪼠",
 "膠": "廫㶀𠐋",
 "積": "廭癪𡳮𧂐",
 "鮮": "廯癬蘚㶍䇁䉳𡾮𢥌𢹛𣟲𦇫𧕇𨇤𩆵",
 "聴": "廰",
 "雝": "廱灉癰𡄸𡓱𢹬𢹭𤫔𤮲𦉥𩟷",
 "聽": "廳㕔𢺭𪢧",
 "廴": "廵廸廹建廻廼廽㢟㢠䜥𡹯𢉊𢌗𢌘𢌙𢌚𢌛𢌜𢌝𢌞𢌟𢌠𢌡𢌢𢌣𢌤𢌥𢌦𢌧𢌨𢌩𢌪𢌫𢵂𣅄𣶻𥣊𦂆𦨿𧈰𧍚𧥡𧨓𧩙𨁗𨝜𨧞𨺘𩳹𪤞𪪬𪪭𪪮𪪯𪪰𪪱𪪲𪮸𪼅𫆩𫸑𫸒𫸓𫸔𫼼𬍻",
 "弍": "弐𬫇",
 "弚": "弟",
 "𠬢": "弢詜㫞𪵁𬣥",
 "㐁": "弻䄼䇧𠀬𠈇𡭋𢐀𢐜𢐡𢐡𢙖𢴀𣐸𤌜𦄲𦧖𦭮",
 "単": "弾戦褝騨",
 "哥": "彁戨歌滒謌鎶㢦䔅𠹭𡟵𢥳𢥳𣘁𣝺𤜊𤠙𤭻𥰯𧎺𨝆𪃿𪢦𫛌𫰄𬤐𬸠",
 "矤": "彂",
 "剪": "彅謭谫㨵𥲫𩌵𪷇",
 "黄": "彉撗斢曂横潢熿獚璜癀磺穔簧蟥觵鐄鱑鷬黅黆黇黈黊㣴㶂䊣䌙䐵䤑䪄䬝䮲䵃䵊𨱑𩙯𪎸𪎿𪏀𪏅𪏏𪏐𪏗𪏟𪏠𪏢𪏣𪏩𪏪𪏫𪠓𫉉𫜘𫧖𫿍𬨒𬶫𬹑𬹒𬹓",
 "畺": "彊殭𤳾𨏃𪇏𪼡𫊌𫏣",
 "矍": "彏戄攫欔玃矡籰蠼貜躩钁䂄䢲䣤䦆𠑩𡚠𡤬𢖦𣌗𥍜𥜵𥤘𥸘𦣒𦫇𧅚𧢭𧮞𧾵𨈍𨏹𩏺𩧡𩵈𪈴𫬻",
 "𧰨": "彖縁豙𠆟𡩚𢊔𢑪𢑳𢒧𢠟𢶢𣪣𤯴𤯹𧰽𨐻𨔡𨤜𩯙𩻄𩻴𬂎𬋌𬏺𬑔",
 "粉": "彛彜㥹𡙢𡚋𢑱𣟗𤕃𦶚𪩋𪪷",
 "寻": "彟挦桪浔荨鲟㖊𪧾𫊻𫭯𫴭𫴱𫴲𫴳𫴵𫴷𬊈𬍤𬩽",
 "产": "彦浐産萨铲𠔳𡶴𥣹𥩧𩓲𪯨𫝸𫧷𫼪𬡻𬺅",
 "切": "彻沏砌窃苆袃䀙䟙𠯦𢗠𢗧𢪃𣐆𤆻𥾛𦕀𨥓𨥔𫊧𫾌𬍔",
 "步": "徏捗涉荹踄陟頻频㻉㾟䑰䤮𠉡𠳤𡘧𡝃𢈨𢧁𣚷𣦖𣻣𤫻𥒼𥙺𥹴𧌂𧼝𨛒𨽥𩊶𩣝𩷖𪌷𪨏𫫈",
 "芝": "徔𡝳𣔰𣷸𤦧𪫿",
 "歨": "徙𥓢𦁡𫈾𫽉𬢮",
 "复": "復愎椱稪緮腹蝮複輹鍑馥鰒鳆㙏㬼䧗䪖䮡𡞪𣸪𤟱𤳺𤸑𥦸𥪚𦩟𧄦𧼱𩋟𪃃𪐒𫄭",
 "犀": "徲摨樨漽穉遲㓾㜨䙙䜄𠌬𡼧𤺳𥛹𦼗𨬯𪤞𪼟",
 "𢾰": "徽",
 "訔": "徾𠏩𠻂",
 "⺖": "忆忇忉忊忋忏忓忔忕忖忙忚忛忟忡忣忤忦忧忨忪快忬忭忮忯忰忱忲忳忴忶忷忸忹忺忻忼忾怀怃怄怅怆怇怈怉怊怋怌怍怏怐怑怓怔怕怖怗怙怚怛怜怞怟怡怢怦性怩怪怫怬怭怮怯怰怲怳怴怵怶怺怽怾怿恀恂恃恄恅恆恇恈恉恊恌恍恎恑恒恓恔恗恘恛恜恞恟恠恡恢恤恦恨恪恫恬恮恰恱恲恸恹恺恻恼恽恾悀悁悂悃悄悅悇悈悋悌悍悎悏悑悒悓悔悕悖悗悙悚悛悜悝悞悟悢悦悧悩悭悮悯悰悱悴悵悷悸悺悻悼悽悾悿惀惂惃情惆惇惈惊惋惍惏惐惓惔惕惗惘惙惚惛惜惝惞惟惤惦惧惨惬惭惮惯惲惴惵惶惸惺惻惼惽惾惿愀愃愄愅愇愉愊愋愌愎愐愑愒愓愔愕愖愘愜愝愞愠愡愢愣愤愥愦愧愩愪愫愭愮愯愰愱愲愴愵愶愷愹愺愼愽愾慀慃慄慅慆慉慊慌慍慎慏慑慒慓慔慖慘慚慛慞慟慠慡慢慣慥慨慩慪慬慱慲慳慴慵慷慺慻慽憀憁憆憈憉憍憎憏憐憒憓憔憕憘憚憛憜憞憟憡憢憣憤憦憧憪憫憬憮憯憰憱憳憴憶憷憸憹憺憻憾憿懀懁懂懄懅懆懈懊懌懍懎懏懐懒懓懗懙懛懜懝懞懠懡懢懤懥懦懧懨懩懪懫懭懮懰懱懳懴懵懶懷懹懺懻懼懽懾戂戃戄㣺㥗㥘㥙㥪㥫㦈㦙㦠𢒆𢖪𢖬𢖭𢖯𢖱𢖲𢖳𢖵𢖷𢖸𢖹𢖺𢖾𢗃𢗄𢗅𢗆𢗇𢗉𢗋𢗌𢗎𢗑𢗒𢗔𢗕𢗖𢗗𢗘𢗙𢗚𢗛𢗜𢗝𢗞𢗟𢗠𢗡𢗢𢗲𢗳𢗴𢗵𢗶𢗷𢗸𢗼𢗽𢗾𢗿𢘃𢘄𢘆𢘈𢘉𢘊𢘌𢘎𢘏𢘐𢘔𢘕𢘘𢘙𢘚𢘛𢘜𢘝𢘥𢘦𢘧𢘨𢘩𢘪𢘭𢘮𢘶𢘷𢘸𢘹𢘺𢘽𢘾𢙀𢙆𢙇𢙉𢙊𢙋𢙐𢙑𢙒𢙓𢙔𢙕𢙖𢙗𢙘𢙙𢙚𢙛𢙜𢙝𢙧𢙨𢙩𢙪𢙫𢙬𢙱𢙲𢙳𢙵𢙹𢙺𢙼𢙾𢙿𢚀𢚁𢚂𢚃𢚄𢚆𢚉𢚌𢚍𢚔𢚕𢚗𢚘𢚙𢚚𢚛𢚜𢚝𢚬𢚭𢚮𢚯𢚰𢚴𢚵𢚶𢚷𢚹𢚺𢚻𢚼𢚽𢚾𢛄𢛅𢛉𢛊𢛌𢛍𢛎𢛏𢛐𢛒𢛔𢛕𢛗𢛘𢛙𢛛𢛞𢛟𢛠𢛡𢛢𢛨𢛯𢛰𢛴𢛸𢛹𢛺𢛻𢛼𢛽𢛾𢛿𢜀𢜁𢜗𢜘𢜙𢜚𢜜𢜝𢜞𢜟𢜠𢜡𢜢𢜥𢜩𢜫𢜬𢜭𢜮𢜰𢜱𢜲𢜳𢜵𢜸𢜺𢜻𢜼𢜽𢜾𢜿𢝀𢝁𢝂𢝄𢝆𢝇𢝈𢝉𢝋𢝌𢝎𢝒𢝓𢝘𢝙𢝚𢝛𢝜𢝟𢝠𢝡𢝢𢝣𢝤𢝥𢝴𢝶𢝷𢝸𢝹𢝺𢝻𢝼𢝽𢝾𢝿𢞁𢞂𢞃𢞄𢞅𢞆𢞊𢞌𢞏𢞐𢞑𢞓𢞕𢞖𢞗𢞙𢞛𢞜𢞞𢞟𢞠𢞡𢞦𢞧𢞬𢞮𢞲𢞳𢞴𢞶𢞷𢞸𢞹𢞺𢞻𢞼𢟈𢟉𢟊𢟋𢟌𢟎𢟏𢟐𢟑𢟒𢟓𢟔𢟖𢟗𢟘𢟙𢟚𢟝𢟞𢟟𢟡𢟢𢟣𢟦𢟧𢟨𢟩𢟫𢟭𢟰𢟱𢟳𢟴𢟵𢟶𢟷𢟸𢟹𢟺𢟼𢟾𢟿𢠁𢠂𢠄𢠅𢠆𢠇𢠈𢠉𢠊𢠋𢠌𢠍𢠎𢠏𢠐𢠑𢠕𢠟𢠠𢠡𢠢𢠣𢠤𢠥𢠧𢠨𢠩𢠪𢠫𢠭𢠯𢠰𢠲𢠳𢠵𢠷𢠹𢠺𢠻𢠼𢠽𢠿𢡀𢡁𢡄𢡇𢡊𢡌𢡍𢡎𢡏𢡐𢡒𢡖𢡚𢡜𢡝𢡞𢡟𢡠𢡡𢡤𢡦𢡨𢡼𢡽𢡾𢡿𢢀𢢁𢢂𢢄𢢅𢢆𢢇𢢈𢢊𢢋𢢏𢢒𢢓𢢔𢢕𢢖𢢗𢢘𢢙𢢚𢢛𢢜𢢝𢢟𢢥𢢩𢢪𢢬𢢮𢢯𢢰𢢳𢢺𢢻𢢼𢢾𢣀𢣂𢣃𢣅𢣆𢣇𢣈𢣊𢣌𢣎𢣐𢣒𢣖𢣗𢣙𢣚𢣜𢣤𢣦𢣧𢣨𢣩𢣴𢣵𢣶𢣸𢣺𢣼𢣾𢣿𢤆𢤇𢤈𢤓𢤗𢤚𢤛𢤜𢤝𢤞𢤟𢤠𢤡𢤣𢤦𢤨𢤩𢤪𢤫𢤬𢤭𢤮𢤯𢤱𢤳𢤴𢤸𢤺𢤻𢤼𢤽𢤾𢥂𢥃𢥄𢥅𢥆𢥇𢥈𢥉𢥌𢥎𢥐𢥑𢥓𢥕𢥖𢥘𢥚𢥝𢥞𢥟𢥠𢥡𢥢𢥣𢥥𢥪𢥬𢥯𢥱𢥳𢥴𢥵𢥶𢥻𢥼𢥾𢦃𢦄𢦅𢦇𢦈𢳖𣀪𣘰𥖒𥭂𩅫",
 "卞": "忭抃汴炞犿玣笇苄飰𠂪𠂫𠯴𥑃𥾽𨳲𩡼𩰍𪨨",
 "刍": "急煞皱绉诌趋邹雏驺㑇㛀𤋣𤍹𥬠𪹉𪺸𫀬𫇴𫓮𫩩𫼝𬊂𬊹𬌝𬑍𬖖𬡎𬦩𬸅",
 "匆": "怱茐䖏𠻔𡧴𡹸𢃭𢉛𢝰𤧚𤩁𥍷𥠡𥧻𥳺𦝰𦸵𧛤𧩪𨂴𨍉𨠞𨡮𨣭𨬀𩮀𬖕",
 "戉": "怴泧狘眓越鉞钺魆㞽䋐䎀䟠䡸䬂䮅𠇘𡛟𡠃𢅶𣐋𣜀𣧡𥩡𧊎𧵝𧻂𨒋𩎙𩥸𩿠𩿰𪌝𪐶𫇮𫑛𫯢𫯷𫵐𫸗𬘙𬱸",
 "术": "怵怸沭炢秫術訹述鉥㺷㾁䘤䟣䢤𠇲𠊍𡊍𢰣𣏂𤝞𦬸𦳯𧉱𧲷𧺶𩶄𩿯秫𬖔𬨳𬬸",
 "朮": "怷絉𠮁𠰲𢫖𣪩𣭍𤇍𦈭𦱈𨐘𨦾𩖶𩳙𪲭𫀦𬩋",
 "对": "怼㳔𫢘𫵹𬀮",
 "亙": "恆絚䱍𢫮𤙆𦚹𧙸𨀿𬇛𬶊",
 "旨": "恉指栺稽脂詣诣酯鑙鮨鴲㚛㞓㞛㮷㸟䭫䭬𠍬𠤚𠤟𠩊𠺳𤎙𥠻𥡞𦓀𦦃𦮂𧊙𨌁𨮺𩊝𩒨𩠜𩬺𪉆𪊨𪗷𪜵𪰾𫥉𬫏",
 "巩": "恐聓茿蒆蛩跫銎鞏㠫㧬㼦䂬䅃䊄䡗𠌖𠔣𡬶𪀛𪳈𬨆𬸉",
 "在": "恠茬𠈚𠋮𠡘𠱽𡖪𢙮𣄒𣑊𥒒𥩴𨀬𩶦𫞼",
 "𠫤": "恡郄㕁㖁𠙆𠫷𠴷𡮱𡯤𡯮𡶱𢫿𣑆𧗫𧵧𪊭𪊱",
 "动": "恸𫢙",
 "厌": "恹𫩫",
 "岂": "恺桤皑硙铠闿𫅥𫖮𫝧𫩯𫼥𬀱𬮿𬱼𬺃",
 "㐫": "恼离脑𤜏𪞸𪞻𪞼𪞽𪵂𫥥𫥩𫥪𫥮𫩷𫼭𬛏",
 "军": "恽挥晖浑珲皲裈诨辉郓𣍯𦈉𩧰𩽼𪣒𪸩𫗥𫝈𫝨𫷅𬏫𬑕𬤖𬱢",
 "芒": "恾硭鋩铓㟐䅒𠴏𡙧𤞽𤶼𥇀𥡍𥭶𦛿𦮋𦱣𦳶𧋽𧨔𩛲𩷶𫼳𬕼𬲹",
 "坒": "悂梐狴蜌陛㙄䏶䯗𠈺𤙞𥆯𦀘𧧺𨉉𩊰",
 "困": "悃捆梱涃焑睏硱祵稇綑裍閫阃齫㬷𠉍𠜠𠢷𠳁𢈛𣙊𣱣𤞧𤥳𥢖𧃭𧄋𧋕𨁉𩁩𩒱𩭋𪊽𫰯",
 "戒": "悈械祴裓誡诫駴㑘㖑㳦𡯰𢂵𢧧𢬿𤈪𤞫𧇑𪁫𫒞𬗕𬭋",
 "吝": "悋麐𠓬𠞺𠡧𠳺𠼿𡂯𡘯𡫫𢭹𣁔𣍵𣙛𣵰𤞼𤶾𧋻𧶆𧼁𨁮𨦽𩣖𪊺𪡍𪣠𪩥𪬣𫇖𫢧𫬪𬜵𬝓𬲔𬹏",
 "医": "悘殹𦑄𨯍𫑝𫧕𬙟",
 "串": "患梙窜賗鋛𠁖𠁷𠁷𠁸𠁺𠁻𠍔𠳡𡮕𢈢𢖀𤊌𤶱𥣽𥭾𦀵𦵋𦶶𨭳𩁬𩁲𪭶𫆩𫍁𫔢𫡌𫡍𫡎𬊑𬟳𬥸𬲤𬵓",
 "タ": "悤",
 "你": "您𪡇",
 "坚": "悭铿鲣㭴𫪄𬒎",
 "闵": "悯𫂃𫞗𬊖",
 "季": "悸痵鯚㑧㳵㻑𠃷𡦧𡮒𡳜𢯗𦁳𧇯𬠓𬫥",
 "臽": "惂掐淊焰燄窞萏蜭諂谄輡錎閻阎陷餡鵮鹐㷺𢽶𩤂𪉦",
 "沾": "惉霑𡝫𤊁𥮒𨵍𫮤",
 "罔": "惘棢焹網菵蝄誷輞辋魍䃃䱩𠬏𣶈𦖉𪱣𪻫𫍬𫰻",
 "物": "惣𠡵𤊘𫙦",
 "店": "惦掂踮䛸𠶧𩤎𪦃𫁥𫢶",
 "参": "惨掺椮毵毶渗瘆碜糁骖鯵鲹黪㟥㡎䅟𠬊𡞋𡳔𥮾𨨕𩭹𪠟𪠡𫎺𫕨𫢺𫤯𫮅𫶅𬌷𬢳𬤄𬥞𬭝𬯊𬱬𬳯",
 "征": "惩𣔥𦲵𨨨𩸵𫤎",
 "贯": "惯掼𨱌𪻲𬤆𬦻",
 "㝁": "惸賯",
 "星": "惺戥暒湦煋猩瑆睲篂腥謃醒鍟鯹䃏䗌𠬋𡟙𣋀𣋮𣌌𣌜𣨾𣮶𥠀𦖤𦩠𧛟𧡶𨩛𨭲𩄆𩤵𪞃𪱊𪱎𪻹𫎻𫠛𬀶𬁖𬁚𬉚𬴄𬶢",
 "昬": "惽敯湣瑉緡缗鍲㗃㛰㟭㨉㬆㱪䁕䃉𪃯",
 "勃": "愂渤葧𠷺𡍧𤊹𦂿",
 "衍": "愆椼葕餰𢯼𧍢𧎘𩜾𬳆",
 "敃": "愍暋睯㟩𢰞𣇻",
 "勇": "愑湧踴㗈䞻𠁜𧍛𩔘𪰵𪳆𫍃𬍺",
 "匧": "愜篋陿㥦㰼",
 "隻": "愯篗蒦謢㨦㸕䑾䨇䨇䨥𠔟𡙜𢊄𢋒𣄥𣉲𣌏𣡀𤐰𤹆𥌍𥛭𥤙𥨦𥸌𥸌𥻬𧃀𧞤𧰤𧰤𩀝𩆀𩇈𩇈𩇥𩹹𩽕𪒊𪯩𪯰𪼌𫉬𫊆𫤑𫫊𬑠𬓏𬯰𬷩",
 "勑": "愸𪄪𪒅",
 "草": "愺騲䓥𠹊𢾳𦳕𦷖𦸶𦹯𦹵𦹸𦺏𦾠𧄣𧄳𧅭𨕡𪋛𫊘𫥬𫶱𬃸𬊳𬞁",
 "孫": "愻搎槂猻蓀遜𠹀𡒐𢶛𣻆𥱖𦥊𧪾𨶉𫆮𫤅𫲰𬎄",
 "眞": "愼槇鎭顚鷆𡻗𥧑𥪧𦫭𫣵𬯳",
 "氣": "愾暣滊熂鎎霼靝餼㑶𠺪𡈏𡦎𣀽𣯘𣱬𤅴𥎃𥧔𦞝𧎵𧏨𧜃𧜚𧪢𧱲𧹵𩘞𩟍𩥀𪒉𪖴𪸃𫉀𫨥𬂕",
 "圂": "慁溷㥵㨡㮯𢒤𣠔𤹁𦞢𦵣𨍲",
 "涌": "慂",
 "蚤": "慅搔溞瑵瘙糔颾騷骚鰠鳋鼜㮻㲧𡠁𤔢𦞣𧎇𨃣𩙫",
 "殷": "慇溵磤蒑𢟝𣉥𨍪𪝛𪾄𫐺𫳪𬆵𬎀",
 "能": "態熊熋罷螚褦㑷㨢㴰䘅𠹌𡮙𢟒𣉘𤠗𤹍𤼛𥀍𥉃𥰘𦋼𦑴𧟽𧴞𨃳𨶙𩙸𪏛𪣾𫆽𫠹𫿌𬂌𬚆",
 "荒": "慌謊谎㡛㬻㼹䐠𠻄𣉪𣗄𣺬𥉂𥔾𪥣𬹀",
 "敏": "慜瀪繁鰵鳘䲄𤛎𥵴𪄴𪉾𪤓𪪉𪱃𬥧",
 "殼": "慤𢡱𪆪𪍥",
 "造": "慥簉糙䎭䒃䔏䗢𠻛𡠻𡮯𧷹𨄹𨖰𪳤𬒝",
 "救": "慦𤨣",
 "㒼": "慲暪樠滿璊瞞蟎襔蹣鏋顢鬗㙢㨺䊟䐽䝡䤍𡠪𡦖𢟮𣝮𣯩𤂙𤃐𤡁𥡹𥲈𦔚𧫩𧱼𩞘𩡙𩺴𪯿𫧥",
 "堅": "慳摼樫熞鏗鰹䃘䌑䵛𠗻𠼤𡐖𡠩𣻹𤠿𥉸𥧬𦸃𧜶𧤵𧽡𪅤𪼑𫍊",
 "眷": "慻膡䒅𠢚𡈕𡡀𧷬",
 "欲": "慾螸𠁓𢊦𣩭𧐄𧢊𩻇𫮟𬅳",
 "𠗦": "慿",
 "舂": "憃摏樁蹖㦼䄝䚎𠌴𢠅𣻛𥡟𦦱𧐍𧜧𧢆𩥫𩮱𪄻𪅖𪆊𫴛𬸥",
 "徝": "憄",
 "甜": "憇㵇",
 "備": "憊㷶𡀠𤏛𬣈",
 "鈞": "憌𥳾𫉟𫱳",
 "猌": "憖㙬𩻜𪙤𫇒",
 "𢽟": "憗",
 "策": "憡鏼㩍𢿸𣽤𥴹",
 "閔": "憫潣燘簢𠎓𡢄𢡻𢵢𣚾𤺖𪾽",
 "𡩜": "憲𬉄",
 "感": "憾撼澸轗鱤鳡㙳䃭䉞䜗䫲𠿑𣛴𣤮𤛸𥍒𥽇𦒝𦽫𨣝𪊄𫄅𫐘𫓏",
 "勤": "懃懄㢙𠪲𡀣𣝀𤐂𤯺𥵚𫦽",
 "满": "懑",
 "赖": "懒濑獭癞籁𧝝𪢐𪬯𪮶𪵇𫇘𬋍",
 "銛": "懖𦗾",
 "滯": "懘",
 "滿": "懣濷𡒗𡣩𤁃𤁞𤂀𤾯𥵥𦿭𧴝𨆻𩯮𫥭𬉞𬖽",
 "養": "懩攁瀁癢鱶㔦䑆䭥𡅖𡗍𣌞𥶑𧓲𩁥𩜒𩪴𩴽",
 "敷": "懯璷㩤𡣷𡫣𣞒𥼼𦇁𧀮𬵶",
 "徵": "懲瀓癥藢㠞𢷸𦘇𧢡𨟃𨷢𪿂",
 "韯": "懴殱瀐籖纎㩥㰇䃱䘂䜟𡣳𧔒𧞬𧟖𨰕𨰸𨷠𩆧𩯶𩽅𬶸",
 "瞢": "懵矒㜴䒐䲛𢅴𤼁𨟒𩯼𪈆",
 "褱": "懷櫰瀤瓌耲㜳䃶𠐦𠘠𡃩𡾝𡾨𢸬𣀤𣀩𣩹𣩻𤜄𧞷𪊉𬵹",
 "縣": "懸纛𠐴𡈴𡾥𦇨𧔤𪈉",
 "冀": "懻驥骥䆊䙫𢋸𥜥𧃞𨷨𪴗𬵷",
 "恣": "懿𩥝𫱝𬤹",
 "贑": "戅𠖫𡔕𢥹𫧝",
 "赣": "戆",
 "贛": "戇灨㔶䀍𢦅𥸡𧆐𧗜",
 "戊": "戌戍成戚茂蒇蕆㥻㧔䛋𠆝𠗱𡏜𡜐𡶔𡶙𢅵𢏌𢑶𢘱𢦓𢦡𢦩𢦬𢦲𢦽𢧒𢧓𢧞𢧡𢧦𢧯𢧿𢬮𢳒𣆈𣝱𣦬𣬽𣳡𣹹𣺭𣻟𣾒𣿷𤃼𤇦𤋆𤖔𤬹𥍥𥰓𥱗𥱡𦄤𦴹𦿱𧂪𧂻𧉦𧷢𨉧𨎕𨱆𩂟𩒃𩬕𪉠𪌙𪗥𪩈𪭏𪴢𪴼𪾤𫀄𫁸𫂔𫈦𫈼成誠𫨵𬏡𬕪𬗇𬝏𬵇",
 "癸": "戣揆暌楑湀猤睽葵鄈鍨闋阕騤骙䙆䠏䤆䳫𠊾𡎝𡞳𢃯𢑣𢜽𣉉𣔽𣦌𣺍𤬉𥯫𦝢𧍜𧝚𧡫𩀁𩔆𩹍𫛼𬆬𬑪",
 "盈": "戤楹溋萾㨕㵬䋼𡎠𡟚𡺡𤔷𤟣𥈱𥯰𧀟𨜏𨩙𫄮𫣂𬨸",
 "晉": "戩𡦌𡺽𦵻𧎽𨍬𨫌𪬕",
 "晋": "戬搢榗溍瑨縉缙鄑㬐𡠂𢨙𤨁𧪽𪹓搢鄑𫨤𬓎",
 "羽": "扇挧栩毣珝祤禤羾羿翀翁翂翃翄翅翆翇翈翉翊翋翌翍翎翏翐翑習翓翕翖翗翘翙翚翛翜翝翞翟翠翡翢翣翥翦翧翨翩翪翬翭翮翯翰翱翲翳翴翵翶翷翸翹翺翻翼翽翾翿蛡詡诩趐頨鮙䋚䌻䍾䍿䎀䎁䎂䎃䎄䎅䎆䎇䎈䎉䎊䎋䎌䎍䎎䎏䎐䎑䎒䎓䎔䎖䎗䎘䎙䎚䎝䟳䣁䦀䨒𠐃𠞈𠞨𠢜𠢯𠹥𡍾𡟸𡪹𢊞𢋫𢌟𢏖𢟺𢡁𢢱𢬙𢴄𢿴𣊏𣤪𣫟𣭜𣯰𣴆𣷺𣸝𣺟𣻫𣼢𣽓𤎋𤹭𤺟𥀘𥂨𥋉𥏊𥒉𥜺𥢩𥨞𥷧𦏳𦏴𦏵𦏶𦏷𦏸𦏹𦏺𦏻𦏼𦏽𦏿𦐀𦐁𦐂𦐄𦐅𦐆𦐇𦐈𦐉𦐊𦐋𦐌𦐍𦐎𦐏𦐐𦐑𦐒𦐓𦐔𦐕𦐖𦐗𦐘𦐙𦐚𦐛𦐜𦐝𦐞𦐟𦐠𦐡𦐢𦐣𦐤𦐥𦐦𦐧𦐨𦐩𦐪𦐫𦐬𦐭𦐰𦐲𦐳𦐴𦐵𦐶𦐷𦐸𦐹𦐺𦐻𦐼𦐽𦐾𦐿𦑄𦑅𦑆𦑇𦑈𦑊𦑋𦑌𦑍𦑎𦑏𦑐𦑑𦑒𦑓𦑔𦑕𦑖𦑘𦑙𦑛𦑜𦑝𦑞𦑟𦑠𦑡𦑢𦑣𦑤𦑥𦑦𦑧𦑩𦑪𦑫𦑭𦑮𦑯𦑰𦑱𦑲𦑳𦑴𦑵𦑶𦑸𦑹𦑺𦑻𦑼𦑽𦑾𦑿𦒀𦒁𦒂𦒄𦒆𦒇𦒈𦒊𦒋𦒌𦒍𦒎𦒏𦒐𦒑𦒒𦒓𦒔𦒕𦒖𦒗𦒘𦒚𦒛𦒜𦒝𦒞𦒟𦒠𦒡𦒢𦒤𦒧𦒨𦒪𦒫𦒬𦒭𦒮𦒯𦠧𦧭𦭳𧝁𧞂𧢯𧥂𧭔𨅵𨆚𨋾𨌺𨍚𨞈𨦫𨮅𨶟𨼉𩗍𩘸𩢳𩭅𪈊𪊮𪏧𪓦𪜹𪥵𪬞𪰣𪴲𪸪𪾞𫅢𫅣𫅤𫅥𫅦𫅧𫅨𫅩𫅪𫅫𫅬𫅭𫅮𫅯𫅰𫅱𫅲𫊼𫖈𫹓𬉇𬏬𬏵𬖅𬚃𬚄𬚅𬚆𬚈𬭹",
 "卂": "扟汛籸茕蝨訊讯軐迅阠鳵㚨㭄㷀䒖𠫲𣈟𤜢𤣲𤬫𤽰𥃴𥕚𥝡𥭰𦝠𧮬𧿅𩑓𩖜𩡰𩡵𩬰𪜖",
 "仒": "扵於𥝨𥾪𪞟𪱸𫃪",
 "片": "扸沜版牉牊牋牌牍牎牏牐牑牒牓牔牕牖牗牘覑魸㭊㲏㸝㸞㸞㸟㸠㸡㸣㸤㸥䏒𠯯𡵫𢜣𢦤𣂔𣇮𣨊𣶁𤕰𤖎𤖨𤖩𤖪𤖫𤖬𤖭𤖮𤖯𤖱𤖲𤖳𤖴𤖵𤖶𤖷𤖸𤖹𤖺𤖻𤖼𤖽𤖾𤖿𤗀𤗁𤗂𤗃𤗄𤗅𤗆𤗇𤗈𤗉𤗊𤗋𤗌𤗍𤗎𤗏𤗒𤗓𤗔𤗕𤗖𤗗𤗘𤗙𤗚𤗛𤗜𤗝𤗞𤗟𤗠𤗣𤗤𤗥𤗦𤗨𤗩𤗪𤗫𤗬𤗭𤗮𤗯𤗰𤗱𤗲𤗳𤗴𤗵𤗶𤗷𤗸𤗹𤗺𤗼𤗾𤗿𤘀𤘁𤘂𤘃𤘄𥂄𥞄𥯻𦺯𦽃𦽌𧈼𧌨𧎀𧦓𨐏𨳭𩃑𩢝𪚖𪺢𪺣𪺤𪺥𪺦𫭡𬃦𬌓𬌔𬌕𬌖𬫄𬷃",
 "勾": "抅构沟芶购鈎钩㘬䩓𠅱𠚸𠣛𠯜𡖜𡵺𢄇𢐺𢗕𢼃𣧔𤖮𤵆𥐾𥡚𥩞𥬉𦔁𦨛𦵑𧘤𧰴𧵈𨊵𩵻𪐯𪖙𪚭𪚵𪜩𫚱𬘗",
 "幻": "抝㘭䒛𠯻𡵿𢇉𥄠𥥆𩉷𬇚𬏠𬨳",
 "㐱": "抮昣曑殄沴珍畛疹眕紾翏胗袗診诊趁跈軫轸鉁飻駗䂦䝩䪾𠃩𠱉𠻝𡛧𡣏𢌝𣭕𤀍𤇪𤒙𤙁𤨤𥘼𥨡𦥋𦭏𧠝𧬶𨱅𩒉𩬖𩷲𪐲𪧉𪫈𪻴𫁇𫖬𫡦𫢗𬈄𬍮𬓪𬘝",
 "斥": "拆柝泝蚸訴诉跅㿭䂨䞣䟟𡛴𡶜𢘛𤇚𤖴𤤐𥿊𦈈𦭐𧙝𩎚𩿪𪉄𪎺𪜲𫖞𬱘",
 "㐌": "拖柂沲炧狏砤粚絁胣袘迤鉇陁駞㢮㸱䑨䝯䰿𠤷𠰹𠴻𡊇𡶊𢑠𢨹𢼏𣴾𣵺𤕴𤤩𤵚𥅓𥍢𥙁𥞀𥺡𦧓𦭥𦰜𧉮𧠡𧣟𧦧𧿶𨠑𨧯𩃰𩉻𩠂𩣾𩷿𩸻𩿽𪘗𫄟𫍟𫘞𬥵",
 "処": "拠處𠝪𦍶𧊃",
 "広": "拡昿砿絋鉱䇊䧀",
 "兰": "拦栏烂㳕𫩪𬒇",
 "𡿪": "拶桚𠊖𠛱𠡝𠡢𪵃𬓩",
 "曳": "拽曵栧洩絏跩齥㖂㡼㹭䄿䇩䎈䒶䛖𠈐𠻇𡜄𡲕𡲝𡲭𡲿𢂝𢘽𤤺𤥟𤲼𤵺𥹞𦐪𦓕𦛈𧊣𧙟𧻭𧽇𧽈𨋯𨒧𨱽𩊒𩎥𩬲𪀕𫒗𫲥",
 "穵": "挖𣑒𪿜",
 "劣": "挘㭞𠢣𠣇𨦒𨾻𩷈𬏩",
 "当": "挡档珰筜裆铛㓥𤇻𥹥𪠽𫀮𫟰𫰠𫵃𬐉𬙏𬠅𬣭",
 "𢆍": "挿㰱𠜕𤿪𩣙",
 "圼": "捏涅陧㖏㘿𣦙𫀴𬌂",
 "岛": "捣",
 "岳": "捳㴈𣨡𤙿𤷝𥇸𩓥𪻬𫖵𬃆",
 "受": "授涭綬绶辤閿阌㖟㥅䛵𠃶𠢛𠹾𠺥𢔏𣄁𤟗𦈽𦧦𦰹𧌅𧚯𧡓𨛶𨨒𩸣𪝈𪨾𬋮𬗾𬶙",
 "底": "掋菧㭽䣌𡍓𢋠𢋴𣷳𤚃𧨱𨌮𪂑𪂰𪝊𪽅𫪭𬫩",
 "夜": "掖棭液焲腋鵺㖡䘸䤳𠅗𠅱𠆓𠆕𠆙𡖺𢆣𣈋𣨜𤥿𧌊𨂒𨿤𪍅𬂃𬓰",
 "制": "掣淛猘痸製鯯㫼䎺䱥𠶜𡍘𡝧𢛁𢮓𤙲𥇕𦜋𦜗𦜾𦲟𧚳𧤊𧨰𨔈𨡐𨡘𨧳𨨪𪘥𪰮𫵨𬎭",
 "肩": "掮猏菺顅鵳䑷𠊘𣓖𦠘𦠰𦢳𧡌𧢞𧱚𨿱𩭠𫆥𫆶𫖶𬇽𬛀𬛕",
 "𢪒": "掱搻𫹊",
 "匂": "掲渇𤆫𪜪",
 "虏": "掳𫇛𫓺",
 "命": "掵椧㥐𠊈𠵴𡇳𥮡𦁸𦅫𨉟𩸍𪂤𪵍𫾽𬍱𬔣𬫦",
 "庚": "掶焿菮賡赓鶊鹒㗮㹹𢈰𢡒𢱅𣮒𣮣𣷄𥓷𥚏𥺧𦁶𧍁𧩉𨘟𨿶𫀻𫧆𫷯𫷵𫷻𫺝𬅪𬛇𬵛",
 "⻏": "掷祁踯邒邖邗邘邙邚邛邜邝邞邟邠邡邢邤邥邦邧邨邩邪邬邭邮邯邰邱邲邳邴邵邶邷邸邹邺邻邼邽邾邿郀郁郂郃郄郅郆郇郈郉郊郋郍郏郐郑郓郔郕郖郗郘郙郚郛郜郝郞郟郠郡郢郣郤郥郦郧部郩郪郫郬郭郮郯郰郱郲郳郴郵郷郸郹郻郼都郾郿鄀鄁鄂鄃鄄鄅鄆鄇鄈鄋鄌鄍鄎鄏鄐鄑鄒鄓鄔鄕鄖鄗鄘鄙鄚鄛鄜鄝鄞鄟鄠鄡鄢鄣鄤鄥鄦鄧鄩鄪鄫鄬鄭鄮鄯鄰鄱鄲鄳鄴鄵鄶鄷鄸鄹鄺鄻鄼鄽鄾鄿酀酁酂酃酄酅酆酇䱶𠋇𠡺𠲄𢇊𢋽𢌅𢰓𢸌𣃶𣨳𣻩𦮦𦶬𦻕𧬚𨈕𨖖𨙩𨙫𨙬𨙭𨙮𨙯𨙰𨙱𨙳𨙴𨙵𨙶𨙷𨙸𨙹𨙺𨙻𨙽𨙿𨚀𨚁𨚂𨚃𨚄𨚌𨚍𨚎𨚏𨚐𨚑𨚓𨚔𨚕𨚖𨚗𨚘𨚛𨚝𨚞𨚟𨚢𨚣𨚤𨚥𨚦𨚧𨚨𨚩𨚪𨚫𨚮𨚯𨚰𨚱𨚲𨚳𨚴𨚶𨚷𨚸𨚹𨚾𨚿𨛀𨛁𨛂𨛄𨛅𨛆𨛇𨛉𨛊𨛋𨛍𨛎𨛏𨛑𨛒𨛓𨛔𨛕𨛖𨛗𨛘𨛙𨛟𨛠𨛡𨛢𨛣𨛤𨛥𨛧𨛨𨛩𨛪𨛭𨛮𨛯𨛰𨛱𨛲𨛳𨛴𨛵𨛶𨛹𨛺𨛻𨛽𨜃𨜄𨜅𨜆𨜇𨜈𨜉𨜋𨜌𨜍𨜎𨜏𨜐𨜑𨜒𨜓𨜔𨜕𨜖𨜗𨜘𨜙𨜚𨜜𨜝𨜟𨜠𨜡𨜢𨜤𨜥𨜦𨜧𨜨𨜩𨜪𨜬𨜭𨜰𨜱𨜳𨜴𨜵𨜶𨜷𨜸𨜹𨜺𨜻𨜼𨜽𨜾𨜿𨝀𨝁𨝂𨝃𨝄𨝆𨝇𨝈𨝉𨝋𨝌𨝎𨝏𨝐𨝑𨝒𨝓𨝔𨝕𨝗𨝘𨝙𨝛𨝜𨝡𨝢𨝣𨝤𨝥𨝧𨝨𨝪𨝫𨝭𨝮𨝯𨝰𨝱𨝲𨝳𨝴𨝵𨝶𨝸𨝹𨝺𨝻𨝽𨝾𨝿𨞂𨞃𨞄𨞅𨞆𨞇𨞈𨞉𨞋𨞌𨞍𨞎𨞐𨞒𨞓𨞕𨞖𨞗𨞙𨞚𨞜𨞝𨞞𨞟𨞣𨞤𨞥𨞧𨞨𨞩𨞪𨞫𨞬𨞭𨞱𨞲𨞳𨞴𨞵𨞶𨞷𨞹𨞺𨞻𨞼𨞽𨞾𨞿𨟀𨟁𨟂𨟃𨟅𨟆𨟇𨟈𨟉𨟊𨟋𨟌𨟍𨟎𨟏𨟐𨟑𨟒𨟓𨟔𨟕𨟖𨟗𨟘𨟙𨟚𨟜𨟝𨟟𨟠𨟡𨟢𨟣𨟤𨟥𨟦𨟧𨟨𨟫𨟬𨟭𨟯𨟰𨶵𨸙𨽛𩜛",
 "𧈡": "掻騒𪦄𬠛",
 "並": "掽普椪湴潂碰諩踫䗒䰃𠁔𠁜𠁝𠁟𠵔𡌶𡖼𢛰𣤞𣮧𤣋𤯭𤽽𦆫𦝤𦫄𧡟𨂝𨂞𨏨𨟘𩤀𩹁𪢭𪻁𫡀𫡁𫡂",
 "研": "揅䊙𨨵𬪮",
 "訇": "揈渹輷鍧鞫𢝁𣮴𤟼𥔀𥷚𥷤𥷴𦑟𧃈𧃓𩘇𪡡𫐒",
 "突": "揬湥葖鶟鼵㟮㻠䃐𠸂𢝀𣔻𤟪𤷿𥨜𥯝𦂽𦔅𦝬𦢴𦩤𧛗𨃍𨨷𩀆𫁜𬑸𬔋",
 "恆": "揯緪㮓䱭𡩃𢰨𣈶𣎄𥔂𦵕",
 "削": "揱箾萷鞩䌃𠠄𠸑𡹺𣕇𣸛𦂗𦋞𨨺𪃅",
 "泵": "揼𫪴",
 "览": "揽榄缆𧒋𫔃𬒗𬦾𬪯",
 "钅": "揿衔钆钇针钉钊钋钌钍钎钏钐钑钒钓钔钕钗钘钙钚钛钜钝钞钟钠钡钢钣钤钥钦钧钨钩钪钫钬钭钯钰钱钲钳钴钵钶钷钸钺钻钼钽钾钿铀铁铂铃铄铅铆铇铈铉铊铋铌铍铎铏铐铑铒铓铔铕铖铗铙铚铛铜铝铞铟铠铡铢铣铤铥铦铧铨铩铪铫铬铭铮铯铰铱铲铳铴铵银铷铸铹铺铻铼铽链铿销锁锂锃锄锅锆锇锈锉锊锋锌锍锎锏锐锑锒锓锔锕锖锗锘错锚锛锜锞锟锠锡锢锣锤锥锦锧锨锩锪锫锬锭键锯锰锱锲锳锴锶锷锸锹锺锻锼锽锾锿镀镁镂镃镄镅镆镇镈镉镊镋镌镍镎镏镐镑镒镓镔镕镖镗镘镚镛镜镝镞镠镡镢镤镥镦镧镨镩镪镫镬镭镮镯镰镱镲镳镴镵镶䥺䥻䥼䥽䥾䥿䦀䦁䦂䦃䦅䦆𨰾𨰿𨱀𨱁𨱂𨱃𨱄𨱅𨱆𨱇𨱈𨱉𨱊𨱋𨱌𨱍𨱎𨱏𨱐𨱑𨱒𨱓𨱔𨱕𨱖𫓥𫓦𫓧𫓨𫓩𫓪𫓫𫓬𫓭𫓮𫓯𫓰𫓱𫓲𫓳𫓴𫓵𫓶𫓸𫓹𫓺𫓻𫓼𫓽𫓾𫓿𫔀𫔁𫔂𫔃𫔄𫔅𫔆𫔇𫔈𫔉𫔊𫔋𫔌𫔍𫔎𫔏𫔐𫔑𫔒𫔓𫔔𫔕𫛾𫟲𫟳𫟴𫟵𫟷𫟸𫟹𫟺𫟽𫟾𫠀𫠁𫻇𬬧𬬨𬬩𬬪𬬫𬬬𬬭𬬮𬬯𬬰𬬱𬬲𬬳𬬴𬬵𬬶𬬷𬬸𬬹𬬺𬬻𬬼𬬽𬬾𬬿𬭀𬭁𬭂𬭃𬭄𬭅𬭆𬭇𬭈𬭉𬭊𬭋𬭌𬭍𬭎𬭏𬭐𬭑𬭒𬭓𬭔𬭕𬭖𬭗𬭘𬭙𬭚𬭛𬭜𬭝𬭞𬭟𬭠𬭡𬭢𬭣𬭤𬭥𬭦𬭧𬭨𬭩𬭪𬭫𬭬𬭭𬭮𬭯𬭰𬭱𬭲𬭳𬭴𬭵𬭶𬭷𬭸𬭹𬭺𬭻𬭼𬭽𬭾𬭿𬮀𬮁𬮂𬮃",
 "阁": "搁",
 "总": "搃縂",
 "恒": "搄暅縆䱴𠋧𠷐𡍷𣕲𦞌𪶥𬘵𬝖",
 "觉": "搅",
 "衾": "搇𩔝",
 "島": "搗槝𡻅𪵕𫌈𫮖",
 "軒": "搟蓒䆭𠻃𢟑𣺕𤹖𨪚",
 "烕": "搣滅㓕𦄅𬵢",
 "追": "搥槌磓縋缒膇鎚㗓㷟㾽䊚䨨䭔𡟴𢊅𢟋𤧫𥡈𧏴𧪲𨃬𨻡𩌝𩔦𩠱𩪀𩺬𫗰𫷤𬭨",
 "屖": "搱稺謘遟𠞂𡁂𡎰𡟭𢕌𣹲𥣦𦃘𦆣𧎨𧛺𧭋𬘽",
 "窊": "搲溛䠚𠹁𦞭𦫪",
 "隽": "携槜鎸镌㑺㝦㷪㻪䐪𣋭𧥅𪾷",
 "拳": "搼𡺹𨃪𩏗",
 "窄": "搾榨醡𢞲𣹧𥰾",
 "虑": "摅滤",
 "罢": "摆䙓𠙣𢅄𣉳𣘓𣺽𩺩𪤄𪳴𪽝𫁂𫔆𬙞",
 "殺": "摋榝蔱鎩䊛𠺽𢄌𢞒𢟌𣉜𣻑𤍁𥻦𦃏𧜁𩮫𪄅𪹤",
 "宿": "摍樎縮缩蓿蹜鏥㜚㴼䈹䑿𠍊𡪴𢳔𣩐𤛝𥀝𥕯𥼍𦟱𧐴𨟨𨢲𨣡𩐼𩘰𩥿𪩻𫔊𫫠𫺿",
 "逢": "摓槰漨熢篷縫缝膖蓬蠭鏠韼鬔㡝㦀㷭㻱䗦䗬䙜䡫䩼𢕝𥊒𥎌𥛝𦪎𦿪𧴂𨲫𩅛𩙹𩪌𪔲",
 "率": "摔繂膟蟀㻭䔞䢦𠌭𠞩𠞻𠻜𢕑𢟳𣘚𣼧𤗪𥡢𥼁𦆽𦆾𦈁𧗿𧜠𨄮𨙖𨫏𩘱𪅄𪖶𫄴𫧦𬍏",
 "离": "摛樆漓璃瞝篱縭缡蓠螭褵謧醨離魑麶黐㷰䄜䅻䍠䬜𠌯𠻗𡴥𡼁𢟢𣉽𣯤𤗫𤡢𥕮𥻿𦔓𧅯𧴁𨝏𩥬𪅆𪒔𪖂𪤋𪱩𫀥𫬎𬓞𬓟",
 "虘": "摣樝皻蔖覰謯齇㜘㢒㪥䁦䠡䶥𠭯𡳆𪓐𪖸𫍹",
 "傷": "摥",
 "瓠": "摦槬𤬢𤬣𥧰𫈻",
 "牽": "撁縴㯠𣽲𧐤𧲀𨄢𨖱𨬨𨼀𫫣",
 "畧": "撂𠓀𠠩𨎠𫏾𫑓",
 "軗": "撃繋𡐊𣤖𤮈",
 "閏": "撋橍潤瞤膶㠈𠾽𢡞𣋆𨬔𨶽𨷎𪼙",
 "牚": "撐橕𢿦𣪼𥊼𨅝𨭃𬭷𬲜",
 "散": "撒橵潵糤繖鏾霰饊䃟䉈𠎭𠪣𠾎𢄻𢊰𤩀𥂪𥋌𦠐𦺻𧝠𧽾𨅖𪯗𪯝𫔌",
 "戟": "撠橶𠽤𣛔𦻝𧾂𩯋",
 "叅": "撡㵕𡑐𡼶𢡖𣚈𣯺𤅒𤛤𤩨𤳒𤺑𥕺𥳋𦅒𦠨𦪜𦼒𧑫𧾋𨅶𨗘𨣔𨲱𩍑𩕞𩯑𩻦",
 "絕": "撧蕝㔃𢴭𥨟𥳵𧑾𨼎",
 "軬": "撪䉊",
 "毳": "撬橇竁膬㦌㯔䄟䩁𠽶𡪣𣰗𣾽𥕹𥳈𥼛𦗨𧹺𨊉𪤛𪹮",
 "辇": "撵𪿵𬧑",
 "颉": "撷",
 "覚": "撹𨬥",
 "窜": "撺蹿镩𪷚",
 "過": "撾檛濄簻膼薖鐹㗻䆼䙤𠏀𡑟𢅗𤻌𧒖𩟂𪆹𪇍𫃓",
 "幹": "擀檊澣簳𠿨𦼮𩼛",
 "雷": "擂檑癗礌蕾鐳镭靐靐靐鱩㵢䍣䢮䨻䨻䨻䨻𡀂𡃷𡢽𣀀𣰑𤐝𤢗𤮚𤴑𥋸𥩉𥵉𦆙𧒜𧒽𨆢𨎿𨙝𨷏𩁦𩂾𩃙𩇆𩍢𩑆𪆼𪤠𫑪𫩍𫶘𬧾𬰉",
 "虜": "擄艣鐪㢚㯭䲐𢢛𤺿𩯜𪷓",
 "著": "擆躇鐯㒂䦃𢅔𤀞𤻔𥖛𦅷𫊔𬙅𬟜",
 "𣪠": "擊",
 "筴": "擌𥰫",
 "匯": "擓㒑㨤𣿬",
 "献": "擜谳𤩽𨆕𨭹𪩘𫜰𬄬",
 "盟": "擝𤀄𦡉𨞚𬏾",
 "数": "擞薮䉤𡦤𥐈𥨧𪢒𫣫𫻍𬳛",
 "歋": "擨𠐀𧓗",
 "閣": "擱櫊𡁤𤁐𨆿𪦫",
 "鄭": "擲躑𡂸𢤜𤣀𧀿𧓸𬅈",
 "箭": "擶櫤𢤣",
 "頡": "擷纈襭𤂌𤢺𥜝𧀺𫹧𬅁",
 "歎": "擹𣋸𣞔𤁤𪇽",
 "罷": "擺矲藣襬㔥䆉䎱䥯𠐌𠤩𡓁𡳹𢅩𢤛𢸇𣞻𤁣𤳷𤳸𥶓𨇑𫬘𫻕𬘊",
 "數": "擻櫢籔藪𠐍𡾄𣀟𤻺𥖻𦇆𨯃𩖅𩪵𩽋",
 "適": "擿瓋藡讁㰅𡂓𡣪𢤊𤁷𤑦𤢼𥖾𨮹",
 "樊": "攀礬蠜䙪䫶𢸅𥌞𥽢𧀭𧢜𨟄𨟅𩧅𫖺",
 "蔡": "攃櫒礤䌨𡣮𢨝𤁱𧭝𨯓𩁞𩧇𪇭𪒼𫊈𬪝𬯡",
 "賛": "攅櫕濽瓉纉讃鄼鑚㠝㸇䟎𠓒𡂐𡣶𥎞𥣪𦪸𨇃𨘧𨣵𨲽𩍴𩯳",
 "輦": "攆鄻𠣇𢤠𣞶𤁥𥌦𥗇𨇍𨘪𨯉𫌖",
 "麇": "攈𡈳𢥄𦇘",
 "圜": "攌𨯬𨷣",
 "嬴": "攍瀛籝㜲䃷䑉䕦𣟅𨯤",
 "褰": "攐𣟋𧞼",
 "舉": "攑櫸㐦𡤒𢤫𤰁𦇙𨯾𨷯𨷶",
 "赞": "攒瓒缵臜趱躜酂𥎝𪴙𪷽𫲗𬖃𬡷𬤮",
 "蹇": "攓瀽鑳䙭䮿𠐻𡄓𡾰𣟯𧃕𧮈𨇥𩎀𩽜𬤯𬴏",
 "麋": "攗蘪𢥐𣟸𤃱𨣿",
 "竄": "攛躥鑹𥎣𬉬",
 "麕": "攟",
 "纂": "攥𣠹𨰭𬮃",
 "覺": "攪灚𦤲𧢱𪱔𪴤𬑬",
 "矛": "敄柔柕楙矜矝矞矟矠矡罞茅蟊袤裦雺髳䂆䂇䂈䂉䂊䂌䂍䂎䋒䖥䟥𡛺𡬢𡳌𢘅𢘕𢝠𢝽𢦧𣓥𣭅𣱏𣿥𣿧𤋄𤔃𤝩𥁛𥂂𥍝𥍞𥍟𥍠𥍡𥍢𥍤𥍤𥍥𥍧𥍨𥍩𥍪𥍫𥍭𥍮𥍰𥍱𥍴𥍷𥍸𥍹𥍻𥍼𥍽𥍾𥍿𥎀𥎁𥎂𥎃𥎄𥎅𥎆𥎇𥎈𥎉𥎊𥎌𥎍𥎎𥎏𥎑𥎒𥎓𥎔𥎖𥎗𥎘𥎙𥎚𥎛𥎝𥎞𥎟𥎠𥎡𥎢𥎣𥎤𥎥𥓺𥠪𦈇𦎦𦚇𦽰𧎄𧕑𧱰𨂣𨍎𨡭𨥨𨩺𨱨𨲬𨾣𩅗𩅬𩝕𩤝𩭾𩮤𩶒𩺠𩻎𩽗𪉝𪍫𪿆𪿇𫴀𬑭𬑮𬑯𬰇",
 "𡥉": "敎𪁡",
 "伸": "敒𥆓𦕽𨁬𫣰",
 "㡀": "敝㢼䘷䭱䳤𡘴𡙀𡙼𡚂𢅷𢛎𣀅𣇢𣔐𣿁𤉤𤰍𤷗𥏟𥕾𥞻𦂲𧌽𧸅𨂅𩋇𩓝𩸁𪂟𪐆𫛮𫩋",
 "学": "敩𢽾",
 "苟": "敬㺃㻤𠸚𣕉𥰄𧛩𨩦𫛒𫽚",
 "陳": "敶樄蔯螴䨯𠼂𢠣𢴟𣼼𨼤",
 "學": "斅斆㙾㩭㰒㶅𠐮𡄆𡦰𡦸𢤾𤣌𥗙𧅷𨯰𪈔𫦾",
 "阑": "斓澜襕谰镧𨅬𪢌𪢠𪩱𫇡𫝮𬁘𬎑𬖺𬞕",
 "蚉": "斔螤𣂂",
 "𠁁": "斲㓸𠍄𡆏𡟳𥉝𧡸𧪧𨜹𨻉𩔡",
 "㡭": "斷檵繼䜝䠪𠤉𡣦𢣎𢷖𥽠𧓓𧖀𬤬",
 "厼": "旀㢱㧠",
 "旡": "旣旤朁朁炁蠶蠶鬵鬵黖㤅𠎱𠎱𠓸𠓸𡉙𡍳𡲽𢙴𢙸𣄯𣄺𣢕𣾤𣾤𤂯𤂯𤞄𤤍𤵀𤾶𤾶𥝪𥣶𥣶𥬗𧌩𧌩𧕽𧕽𧗨𨍼𨚁𩇗𩑬𩜚𩜚𩞚𩞞𩞞𩳯𩵪𩺺𩿑𪝏𫤳𫴽𬀥𬆟",
 "㞢": "旹𠍧𠕓𢓸𥀑𦨃𦭩𫦠𬅨",
 "仄": "昃㳁𠩣𣅦𩾸𫨎",
 "曰": "昌汩㑹㫗㫚𠝽𢸻𧴴𩘤",
 "𡗜": "昚眘㴱㶫䙽𠏗𠛞𠝱𠞒𠡊𠬲𠰵𡀋𡈞𡏎𡗪𡘆𡘤𡢴𡨨𡫝𢆎𢉉𢌾𢰒𢱂𢲘𣔏𣗟𣸧𣸷𣾣𣿳𤃖𤊽𤋯𤌥𤐗𤒧𤢙𤧪𤪃𤶟𤹃𤺂𥏢𥏤𥚓𥥍𥨤𥯺𥲦𥵐𥺭𦖔𦗆𦜮𦞃𦞴𦫐𦱏𦾀𧃬𧄈𧐷𧝭𧩊𧷉𨂛𨄘𨅆𨒏𨔬𨜆𨣠𨫦𨭁𨭼𨺕𨻚𨾮𩋕𩕑𩢙𩭻𩮥𩰇𩺚𪒖𪪡𪼵𫙫𫯯",
 "卭": "昻笻𦭎𪀃",
 "政": "晸䈣𢾘𣀚𤣙𥪛𧁎𩠰𪣴𪰱",
 "往": "暀𠉫𠗤𢛛𣇭𣶂𤷮𥆜𥯂𫃮",
 "尭": "暁焼",
 "晏": "暥騴鷃鼹䁙䨃䰋𠍾𡩷𢣮𢲋𣗤𣺂𤑅𧤨𧽉𨪶𨶁𨻂𩹽𪤃𫑦𫘫𬶩",
 "𣈅": "暦澘",
 "氺": "暴沗漛㳟𠉎𠝌𠠓𡇋𪤵𪧦𬫾",
 "厤": "曆歷磿㷴㻺㽁𠟄𠪺𡐰𡓸𡙽𣙽𣦯𣦰𤡫𤪾𤯍𥷅𦠩𧝏𧬎𧯏𧽺𨬑𩅩𩱔𪅼𪙪𪠚",
 "雲": "曇橒澐繧蕓霒霕霴霼靅靆靉䉙䨭䨺䨺䨺𢵆𣊯𤳟𥖅𥢚𧬞𨗠𨝽𩃠𩃷𩃸𩅝𩅣𩅾𩆦𩇔𩇔𩇔𩇔𪆚𪒝𬎌𬰎𬰨",
 "費": "曊鄪鐨靅㩌㵒䊧𠢥𠾚𣙿𤺕𦠻𧑈𧝇𩯃𪰂𫅿",
 "晶": "曐曑曟曡橸蕌㬪𣊖𣱁𤩜𦣖𨗏𨼗𩅟𪱈𫦡𬁬",
 "𣅽": "曓㬥㬧𠑔𡅜",
 "夲": "曓桳皋㤒𠦪𡘶𡴝𡴞𢱭𢳎𢷎𣉱𦾙𧙐",
 "署": "曙濖糬薯鱰𠏲𡣈𣞍𥌓𥵟𨽉𪋰𫶳",
 "冝": "曡畳疂㩹𡀉𢶣𣁪𣜖𣿫𤅚𧨏𪑎",
 "羲": "曦爔㙿㰕䂀𡾞𢤻𢸤𣌀𣎮𥋟𨏢𪼯𪽦𪾅𫇢",
 "融": "曧瀜",
 "肉": "朒瘸肏胔胬胾脔腐膐膥臋臠臡䯐𠌳𠒯𡌵𡬻𡱎𢤍𢩌𢫭𣀙𣧻𤃼𤌔𤡜𤻚𥀙𥃀𥭊𥷭𥷽𦘫𦘬𦘻𦘽𦙂𦙡𦙢𦙧𦙩𦙲𦚆𦚇𦚒𦚓𦚘𦚙𦚛𦚨𦚮𦚷𦛂𦛃𦛅𦛆𦛇𦛝𦛶𦛷𦛹𦜁𦜜𦜽𦜾𦝎𦝙𦝾𦞉𦞊𦞋𦞍𦞏𦞘𦞱𦟖𦟗𦟡𦟦𦟴𦠂𦠕𦠩𦠪𦠫𦠬𦠶𦡇𦡈𦡛𦡜𦡝𦡭𦡼𦢆𦢰𦢻𦢽𦣚𦧘𧅢𧻣𨛇𨹌𨿇𩣀𩪏𩬳𩶩𪗌𪠼𫆜𫆫𫆭𫆰𫆸𫆺𫻯𬐺𬚱𬚲𬚴𬚶𬚸𬚺𬚿𬛃𬛈𬛌𬛎",
 "囧": "朙莔㴄𠕬𡜸𡮀𡮧𡻲𢚊𣖇𣰡𣰡𣽭𦀝𦟁𦹩𧖸𧟅𧟎𧷗𧷷𧸇𧹎𨙜𩁰𬃺",
 "𣎳": "朮㳈𢻾𢽳𢽳𣏕𣏟𣏟𦱍𦱍𦲬𦲬",
 "兮": "枍盻肹㿽䒊䚷𠀒𠂞𠆵𠋹𠣤𠯋𠰗𡆽𡕵𡷬𢇱𢕊𢗴𢞛𢪆𣊅𣓚𣕆𣖼𣢍𣹯𤵕𥈕𥍠𥬋𥰴𦏡𦕎𦖬𧟯𧪱𧿝𨝁𨳣𪏱𪐭𫓫𫜜",
 "冄": "枏蚦衻髥㚩䑙䒣䛁䫇𠕅𠯍𠱗𡉱𡖔𢓏𢪈𣬭𣲕𣵢𣹼𤘟𤱋𤴿𥾢𦐎𦙇𦶈𧡔𨈜𨔸𨙻𨚉𨸨𨽝𩑞𩒹𪓘𪚮𪚳𫠵",
 "叧": "枴𠕕",
 "氿": "染",
 "汞": "柡觨銾㶹𠳃𦕷𧋔𩒴𩗢𫎶",
 "匛": "柩𪫨",
 "市": "柿鈰铈閙闹鬧𠇰𠰼𠶴𠸔𡊔𢂤𢅈𢅈𢅈𢒌𢘥𣞮𥙅𥞑𨸲𩦴𪥐𪩵𪪌𪲬𫎕𫒁𫖍𫜘𫥀𫷇𬕟𬯻",
 "卮": "栀𨋜",
 "节": "栉𬝋𬶎",
 "卢": "栌泸胪舻轳颅鲈鸬𣆐𨋤𩢬𪪏𪽮𪾦𫊮𫙔𫽤𬀭𬊐𬙎𬬻",
 "乐": "栎泺烁砾跞轹铄㧰䀥𪠸𬍛𬏤",
 "冰": "栤𢬄𣑏𥒜𦀋𨋲",
 "色": "栬滟灔絶绝脃艳艴艵艶艷赩銫铯靘㔢䒊䒋䒌䒍䒎䒏䒐䵥𠈜𠲅𢙚𢬘𣴊𤈖𤧾𤶋𥅺𥒍𦫓𦫔𦫕𦫖𦫗𦫘𦫙𦫚𦫛𦫜𦫞𦫟𦫠𦫡𦫢𦫣𦫤𦫥𦫦𦫧𦫨𦫩𦫪𦫫𦫬𦫭𦫮𦫯𦫰𦫱𦫲𨉆𨋭𨒶𨛉𨠶𨷉𨹔𪁅𪗼𪵼𫇤𫙙𫵺𬚐𬜝𬜞𬜟",
 "伏": "栿洑絥茯袱覄鮲䟮𢫯𣭩𤝯𧳂𨋩𨦛𩊙𩎧𩢰𪀢𪕟𫄢",
 "杲": "桌菒𡩕𣈁𣔣𣠀𣫙𥓖𥺰𨜍𩓢",
 "邛": "桏筇㧭𥞱𦨰𦭭𧊡𨀯𪵹",
 "邜": "桞茒𫚹",
 "庄": "桩粧脏賍赃㛇䂯𠲕𦀐𨀵𪁈𪉉𪣐𫇺𬵐",
 "𠯑": "桰銽䛡䯺𠈲𠜜𠳂𡜶𢤌𢬸𣴠𣿛𦕾𦘉𦯚𨓈𨶖𩒲𪁝𪘢𫻇𬇎𬇎𬦐𬱤",
 "丣": "桺駵䱖𡘣𣨇𤥗𦕼𦯄𨦰𪕚𪕢",
 "巵": "梔㯄𡜮𡭐𢬯𦓝𧱒𨌌𩷴",
 "忍": "梕涊綛荵認躵㸾䏰𠗋𠴍𢚴𤶝𥆾𥊟𦓖𦖆𧖷𨧟𨲅𩇻𩈢𩊫𪐁𪞹𪪄𫀷𫻉𬠍",
 "忌": "梞誋跽鵋䋟𡜱𡷞𢚁𢭄𣇡𥭜𦮼𧋷𧚈𨛑𩷱𪬧𫍪𫔷𫭻",
 "佛": "梻𠲽𡌅𩎵",
 "连": "梿涟琏莲裢链鲢𦈐𪡏𫅼𫢪𫽁𬌵𬣽",
 "灵": "棂㻏𪕠𪹂𬊽𬌴𬎶𬫟",
 "秉": "棅㨀𠶏𢋯𢋯𣶸𤖉𤦋𥟱𥡝𥡝𥪕𦱮𨧺𫅚𫱤",
 "囷": "棞碅稛箘菌蜠麕㖥㻒䐃䠅𡸙𡹤𢛕𢮖𥇘𦓾𦽖𧛃𧶞𧼐𩆻𩓽𩤁𪍁𪘩𪘭𬺊",
 "服": "棴箙菔鵩𣔚𦋉𧌘𧟱𧟵𨵟𩸤𪂖𫛳𬶚",
 "芬": "棻𡍆𡝱𣔄𣶼𦯀𦯲𦯳𨧼𩡉𫕧𫪝",
 "房": "椖𫋈𬢰",
 "规": "椝窥鬶𫚜𫰹𬃀𬮭",
 "卖": "椟渎牍窦续觌读赎黩𪥿𪻨𫧿𬑙",
 "劵": "椦𠉮𠡶𠢧𠢺𢛗𢮙𥟎𩷼",
 "段": "椴毈煅瑖碫緞缎腶葮鍛锻㱭𠩻𢀤𢝪𢯫𣹂𧎚𧹮𨺣𩋦𩏇𩤣𪝒𪦋𪰴𫏗",
 "界": "楐琾鎅䛺𠝹𠷟𤋽𤲂𤸋𥔅𧎁𨺬𩇁𩇁𩳻𪑹𫈨𫽜𬓳",
 "苦": "楛瘔𡞯𢱗𤋼𥟾𥯶𧃵𨐡𨡱𩹜𫊐",
 "便": "楩箯緶缏鞭鯾㛹𠷊𣸇𦳄𧍲𧍻𧱩𨂯𨩫𨵸𨸇𫚣𬢷",
 "香": "楿萫馚馛馜馝馞馟馠馡馢馣馤馥馦馧馩馪馫麘黁㐯㗍㴡䅨䦭䫝䭯䭰䭱䭲䭳𠝲𡎟𢢹𤋭𤧘𤼍𥔜𥔡𥗶𥣉𥧎𧄦𧪑𧮠𧯄𧯅𧹰𧽂𨟝𩠺𩠻𩠽𩠾𩠿𩡀𩡁𩡃𩡄𩡅𩡆𩡇𩡈𩡉𩡊𩡌𩡌𩡎𩡏𩡐𩡐𩡑𩡒𩡓𩡔𩡕𩡖𩡗𩡘𩡙𩡚𩡛𩡜𩡝𩡞𩡟𩡠𩡡𩡢𩡢𩡣𩡤𩡥𩡦𩤹𪋒𪨝𪬏𫗼𫗽𫗾𫗿𫘀𫘁𫘂𫘃𫘄馧𬳜𬳝𬳞𬳟𬳠𬳡𬳢𬳣𬳤𬳥𬳦𬳧",
 "室": "榁腟鰘㗌𠋤𡹭𢯶𦥉𧍱𨘲𩋡𬄰",
 "闾": "榈",
 "神": "榊鰰䗝䨩𥔻𨕫𬷫",
 "飛": "榌飜飝飝飝騛䙍䬠䬡𠋉𢑮𢝵𢞵𦴧𨕗𩙳𩙴𩙵𩙶𩙷𩙸𩙹𩙺𩙼𩙽𩙾𩹉𪚢𪮕𫍄𫗿𫛊𫜛𫫁𬠞",
 "屑": "榍碿糏㣯㨝㴮𠋱𡎮𡟩𢞜𤸮𦞚𦵱𧜔𪍛𪙌𪙑𬓹𬺑",
 "𥁑": "榓謐谧㴵䤉",
 "矩": "榘𩰤𬄃",
 "羔": "榚溔禚窯糕羹蓔餻㚠㟱䅵䫞𠏖𡙡𣣵𣯇𤹂𦎟𦏠𦢋𦢹𨞿𨶅𩱋𩱧𪴴𫌉𫦑𫺵",
 "宰": "榟滓縡㱰䏁䔂䮨𠹼𡪔𢟓𢲟𣪮𤌊𥻮𦞤𧪹𨫃𩝪𪹞",
 "匪": "榧篚㥱𠌨𠓿𢾺𢾻𣤆𥠶𦈗𨻃𪯭𪶬",
 "虔": "榩鰬㓺㗔㨜𠋵𠢍𣖳𤚳𥔮𥱲𧽐𨜻𨪝𩤾𪦒𫽯",
 "隼": "榫鎨鶽㢑𠧑𡺾𡻛𢲜𣯍𦞠𪄩",
 "射": "榭謝谢麝㓔㴬𡭉𢲌𤚑𤠭𥩄𥱈𧎭𧛼𩘧𪧻𪿎𫷺𬙥𬮏𬳢",
 "衰": "榱滖簑簔縗缞蓑㲤䙑𤠠𤸬𫣐𬧭",
 "庭": "榳㨩𡀈𡟾𤠜𦪅𨫆𪶹𬝪",
 "埋": "榸䨪𠹺𢆪𢲪𥕄𦄆𦷯𪤿𪰹𫡭𫮷",
 "荀": "槆㨚䜦𡟱𫺰",
 "桌": "槕",
 "𠳮": "槗𦃣𦑽𪄘",
 "𣴎": "様𣻌",
 "贾": "槚𪢋𫟢",
 "竜": "槞滝篭𡏡𢲣𣯡𤁘𤄯𥉩𥉫𥪝𥪞𧏵𧯇𨃸𨻫𩄱𪥛𪱨𪱯𪷹𪽞𪽣𪿁𫅮𫏽𫣏𫳭𬂙𬏑𬔔𬺗𬺘𬺙𬺚",
 "讠": "槠狱罚计订讣认讥讦讧讨让讪讫讬训议讯记讱讲讳讴讵讶讷许讹论讻讼讽设访诀证诂诃评诅识诇诈诉诊诋诌词诎诏诐译诒诓试诖诗诘诙诚诛诜话诞诟诠诡询诣诤该详诧诨诩诪诫诬语诮误诰诱诲诳说诵诶请诸诹诺读诼诽课诿谀谁谂调谄谅谆谇谈谉谊谋谌谍谎谏谐谑谒谓谔谕谖谗谘谙谚谛谜谝谞谟谠谡谢谣谤谥谦谧谨谩谪谫谬谭谮谯谰谱谲谳谴谵谶辩雠㺆𧮪𫍙𫍚𫍛𫍜𫍞𫍟𫍠𫍡𫍢𫍣𫍤𫍥𫍦𫍧𫍨𫍩𫍪𫍫𫍬𫍭𫍮𫍯𫍰𫍱𫍲𫍳𫍴𫍵𫍶𫍷𫍸𫍹𫍺𫍻𫍼𫍽𫍾𫍿𫟞𫟠𫟢𬣙𬣚𬣛𬣜𬣝𬣞𬣟𬣠𬣡𬣢𬣣𬣤𬣥𬣦𬣧𬣨𬣩𬣪𬣫𬣬𬣭𬣮𬣯𬣰𬣱𬣲𬣳𬣴𬣵𬣶𬣷𬣸𬣹𬣺𬣻𬣼𬣽𬣾𬣿𬤀𬤁𬤂𬤃𬤄𬤅𬤆𬤇𬤈𬤉𬤊𬤋𬤌𬤍𬤎𬤏𬤐𬤑𬤒𬤓𬤔𬤕𬤖𬤗𬤘𬤙𬤚𬤛𬤜𬤝𬤞𬤟𬤠𬤡𬤢𬤣𬤤𬤥𬤦𬤧𬤨𬤩𬤪𬤫𬤬𬤭𬤮𬤯𬤰𬤱",
 "寄": "槣㨳𡏾𢕗𣿾𤨥𤨦𥊘𦗞𦪌𨄾𪝣𫶓𫻀𬬄",
 "扈": "槴滬熩簄蔰㨭𡻮𤨖",
 "患": "槵漶瞣贃䗭䜨𠌼𡠛𢡃𣟥𣟻𤡟𧴊𧹗𨄲𨫑𪪟",
 "桹": "樃",
 "脩": "樇滫蓨鏅䐰䗛𤛛𥉈𥠿𦃬𪅭",
 "棥": "樊欎燓鐢鬰𡑀𡡴𢒻𢡟𣛍𣝴𣠈𣠧𣠫𣡄𣡇𣡜𤕩𥖎𥖯𦉤𧢎𧢣𪋤𬅖𬅙𬅴",
 "鹵": "樐滷磠蓾鏀鹶鹷鹸鹹鹺鹻鹼㔪㲶䴚䴛䴜䴝䴞𠘢𡅿𡤲𢟧𢧽𢲸𢺬𣡣𣤓𣰹𤅦𤓠𤪰𥍗𥜸𥱾𥷦𥸖𥾁𧅽𧆗𧆗𧖋𧫓𨟜𨟣𨟩𨟬𨤌𨰳𩧤𩽶𪉖𪉗𪉘𪉙𪉚𪉛𪉜𪉝𪉞𪉟𪉠𪉡𪉢𪉣𪉤𪉥𪉦𪉧𪉨𪉪𪉫𪉬𪉭𪉮𪉯𪉰𪉱𪉲𪉳𪉴𪉵𪉶𪉷𪉸𪉹𪉺𪉻𪉼𪉽𪉾𪉿𪊀𪊁𪊂𪊃𪊄𪊅𪊆𪊇𪊈𪊉𪊊𫜇𫜈𫜉𬸲𬸳𬸴",
 "梁": "樑簗𥛫𨄈𨎛𨫟𬪔",
 "柯": "樖𫈥",
 "羕": "樣漾㨾𠍵𡡂𢟣𤎔𤡀𧫛𨖌𫑩𬋼",
 "條": "樤滌窱篠縧蓧螩鎥鰷𠥑𠺧𡠊𡩢𥉉𨃜𩌜",
 "莑": "樥𡻹𨫱",
 "䇠": "樦",
 "基": "樭璂禥簊䥓𠼻𡪈𡻸𣻺𥕛𦪆𦸀𧫠𨄎𨼂𪤏𪷲𫌊𫮱",
 "䙳": "樮𣺗",
 "雪": "樰膤艝轌鱈鳕𠞯𠽌𡐅𡠭𩃏𪞵𪴐𫂪𫃽𫕣𬎅𬝹",
 "貳": "樲膩㒃㹑𠽬𢄽𢴧𧸐𬥠",
 "越": "樾𠾲𢵼𣾼𦅲𧑅𨅿𨬓𪆧𪒥𪽸𫌐𬷲",
 "筍": "橁箰㒐𢵀𥯗𥰴𥰿𫂎",
 "奠": "橂磸鄭㞟㽀䥖𠪝𡰙𡼓𢵫𣾇𤡽𥂴𥳢𦅆𦌚𨗖𨞀𨣆𬯚𬴤",
 "畱": "橊澑璢癅籒羀鐂飅驑𤡼𤩾𪅳",
 "棠": "橖鏿饓㒉䉎𡡢𢴤𢿧𢿵𣪿𥊲𦼕𨅨𩘽𩙆𬈷",
 "萌": "橗𢅆𫄁𬝡𬠫",
 "袲": "橠㒅𢄴𢡏𦠸𧛧𨎭",
 "甯": "橣澝䔭𤢆𥳥𧑗𩕋𪆢",
 "惢": "橤繠蕊𢣳𣛚𣾫𤡧𤺫𥳝𦠤𧁚𧂿𧴕",
 "猪": "橥潴蕏𧒇𪱂𪻊𫬕𬁑𬄞𬍆𬍍𬍎",
 "焭": "橩",
 "貿": "橮鄮",
 "厨": "橱蟵蹰㡡𠾇𡐷𢅥𧒉𪷏",
 "勝": "橳蕂𤺩𩦜𩻷𪓺",
 "紫": "橴㗪䔝𥲕𨄐𫄕𬈶𬎏𬠭",
 "兠": "橷",
 "纟": "橼纠纡红纣纤纥约级纨纩纪纫纬纭纮纯纰纱纲纳纴纵纶纷纸纹纺纻纼纾线绀绁组绅细织终绉绊绋绌绍绎经绐绑绒结绔绕绖绗绘给绚络绝绞统绠绡绢绣绤绥绦继绨绩绪绫绬续绮绯绰绱绲绳维绵绶绷绸绹绺绻综绽绾绿缀缁缂缃缄缅缆缇缈缉缊缋缌缍缎缏缐缑缒缓缔缕编缗缘缙缚缛缜缝缞缟缠缡缢缣缤缥缦缧缨缩缪缫缬缮缯缱缲缳缴缵辔辔辫𦈈𦈉𦈊𦈋𦈌𦈍𦈎𦈏𦈐𦈑𦈒𦈓𦈔𦈕𦈖𦈗𦈘𦈙𦈚𦈛𦈜𦈝𦈞𦈟𦈠𦈡𫄙𫄚𫄛𫄜𫄝𫄞𫄟𫄠𫄡𫄢𫄣𫄤𫄥𫄦𫄧𫄨𫄩𫄪𫄫𫄬𫄭𫄮𫄯𫄰𫄱𫄲𫄳𫄴𫄵𫄶𫄷𫄸𫄹𫟅𫟆𬘓𬘔𬘕𬘖𬘗𬘘𬘙𬘚𬘛𬘜𬘝𬘞𬘟𬘠𬘡𬘢𬘣𬘤𬘥𬘦𬘧𬘨𬘩𬘪𬘫𬘬𬘭𬘮𬘯𬘰𬘱𬘲𬘳𬘴𬘵𬘶𬘷𬘸𬘹𬘺𬘻𬘼𬘽𬘾𬘿𬙀𬙁𬙂𬙃𬙄𬙅𬙆𬙇𬙈𬙉𬙊𬙋𬙫𬝊",
 "⻖": "檃萨阞队阠阡阢阣阤阥阦阧阨阩阪阫阬阭阮阯阰阱防阳阴阵阶阷阸阹阺阻阼阽阾阿陀陁陂陃附际陆陇陈陉陊陋陌降陎陏限陑陒陓陔陕陖陗陘陙陚陛陜陝陞陟陠陡院陣除陦陧陨险陪陫陬陭陮陯陰陱陲陳陴陵陶陷陸陹険陻陼陽陾陿隀隁隂隃隄隅隇隈隊隌隍階随隐隑隒隓隔隕隖隗隘隙隚際障隝隞隟隠隡隢隣隤隥隦隧隨隩險隫隬隭隮隯隲隴隵㳱𠐕𡂰𡋓𡌌𡓏𡖥𡜙𡪬𢖁𢵩𢶽𣒒𣓱𣓹𣠫𣡨𣬤𤚆𤥌𤧨𥮺𥱥𥴝𦕬𦰢𦶽𦹥𦽵𦿇𧁠𧎛𨃛𨆳𨧯𨸐𨸑𨸒𨸓𨸔𨸕𨸖𨸗𨸘𨸙𨸚𨸛𨸜𨸝𨸞𨸟𨸠𨸡𨸢𨸣𨸤𨸦𨸧𨸨𨸩𨸫𨸬𨸭𨸮𨸯𨸰𨸱𨸲𨸳𨸴𨸵𨸶𨸸𨸹𨸺𨸻𨸼𨸽𨸾𨹀𨹁𨹂𨹃𨹄𨹅𨹈𨹉𨹊𨹋𨹌𨹍𨹎𨹐𨹑𨹒𨹓𨹔𨹕𨹖𨹗𨹘𨹙𨹚𨹛𨹜𨹝𨹞𨹟𨹠𨹡𨹢𨹣𨹤𨹥𨹦𨹧𨹨𨹩𨹪𨹫𨹬𨹭𨹮𨹯𨹰𨹱𨹲𨹳𨹴𨹵𨹶𨹷𨹸𨹹𨹺𨹻𨹼𨹽𨹾𨹿𨺁𨺂𨺃𨺄𨺆𨺇𨺈𨺉𨺊𨺌𨺍𨺎𨺏𨺐𨺑𨺒𨺓𨺕𨺖𨺗𨺘𨺙𨺚𨺛𨺜𨺝𨺞𨺟𨺠𨺢𨺣𨺤𨺥𨺧𨺨𨺩𨺪𨺬𨺮𨺯𨺰𨺱𨺲𨺳𨺴𨺶𨺷𨺸𨺹𨺺𨺻𨺼𨺽𨺾𨺿𨻀𨻁𨻂𨻃𨻄𨻅𨻆𨻇𨻉𨻊𨻋𨻌𨻍𨻎𨻐𨻓𨻔𨻕𨻖𨻗𨻘𨻙𨻚𨻛𨻜𨻝𨻞𨻟𨻠𨻡𨻢𨻣𨻤𨻥𨻦𨻧𨻨𨻩𨻫𨻬𨻭𨻮𨻯𨻱𨻲𨻳𨻴𨻵𨻶𨻷𨻹𨻺𨻻𨻼𨻽𨻾𨼀𨼁𨼂𨼃𨼄𨼅𨼆𨼇𨼈𨼉𨼊𨼋𨼌𨼍𨼎𨼏𨼐𨼑𨼒𨼓𨼔𨼖𨼗𨼘𨼙𨼛𨼜𨼝𨼞𨼟𨼠𨼡𨼢𨼣𨼥𨼦𨼧𨼨𨼩𨼪𨼫𨼬𨼭𨼰𨼲𨼴𨼵𨼶𨼷𨼸𨼹𨼺𨼻𨼿𨽀𨽁𨽂𨽃𨽅𨽆𨽇𨽈𨽉𨽊𨽋𨽌𨽍𨽏𨽑𨽒𨽖𨽗𨽘𨽙𨽚𨽜𨽞𨽟𨽠𨽢𨽣𨽤𨽥𨽦𨽧𨽨𨽬𨽭𨽮𨽯𨽰𨽲𨽳𨿭𩞶𩣾𩩜𩷷𩷿𩸻𩼏𫟫𫟬𫠃墬邔鄑鄛䧦",
 "煔": "檆",
 "聖": "檉蟶𠏄𧬼𪢎𪬮𬂒𬉊",
 "輂": "檋𣿢𨍯",
 "毀": "檓譭㩓䥣𡒂𡢕𡢶𢶙𥵓𥸋𥼹𥽂𦽐𧝷𨷕",
 "鼎": "檙濎薡鐤鼏鼐鼑鼒䨶䵺䵻䵼𠕪𠘋𠟭𠢼𠬔𡤀𤐣𦽍𧈂𩆆𩕢𪔃𪔄𪔅𪔆𪔇𪔊𫜠𫜡𫣨𬒤𬹥𬹦𬹧𬹨𬹩𬹪𬹫𬹬",
 "剽": "檦㠒𠎼𡢱𢅚𢢼𢶏𣿖𥋠𦾑𧝼𨭚𩦠𬭺",
 "䓤": "檧",
 "羡": "檨𦅗𨬢𪞼𪮲",
 "楽": "檪薬䃯𪴞",
 "銀": "檭𡁬𢣩𢣰𤢲𧓪𪇩𬞵",
 "箕": "檱𡒬𦪵𩍮𪟕𫀣𫂮𫍕𫾑",
 "團": "檲糰㩛𡁴𣎫𧓘𩼯𬣍",
 "奩": "檶𢋔",
 "旖": "檹𢷔𩕲",
 "綦": "櫀濝藄𤪌",
 "蜜": "櫁藌𠏷𦢉𨷛𪢗𬉗𬠵",
 "匱": "櫃籄鑎㙺䕚𠏺𡣓𢷴𥎛𦆠𩍨𩏱𫻑",
 "魁": "櫆𡦶𢷪𤁔𪇫𬞴𬬖",
 "頗": "櫇𠠉𡂄𡽠𢷧𤀪𨆵𬖾",
 "凳": "櫈",
 "㕑": "櫉𨆼",
 "遷": "櫏躚韆䉦𪝴𫾔𬎚",
 "蓲": "櫙𤁮",
 "閭": "櫚䕡䥨𤁵𥶆",
 "緣": "櫞𢷻",
 "廢": "櫠䉬䕠𡓊",
 "箸": "櫡𢷷𣃑𥗁𦇃𨮿",
 "慶": "櫦𥽝𨯙𪮿𪷸𫑭",
 "豬": "櫫瀦藸𣌁𣌂",
 "暨": "櫭𡃢",
 "噩": "櫮蘁讍鑩鱷䫷𡅡𡓐𡾙𣤲𪦰𬪠",
 "穌": "櫯蘇㢝𢀱𢸫𤼀𦢦𨣺𫬥",
 "豫": "櫲𤂻𫡡𫮻",
 "蕉": "櫵爑䌭𢤼𢸺𫑿𫣾𫲔𬁞𬷹",
 "蕭": "櫹瀟蠨𡣾𧅣𧹀𩙚𩧓𬘎",
 "隱": "櫽癮蘟讔㦩㶏䨸𡾯𧮐𨏱",
 "繇": "櫾蘨㒡㘥𢖟𨙂𨷱𫧊",
 "薄": "欂礴鑮䭦𦢸𨏫𩍿𩏵𩽛𪎄𪚂𬮁",
 "擧": "欅襷㩮𪼰",
 "叢": "欉灇爜䕺𡅇𤀡𦇱𧆁𫌘",
 "藏": "欌臟贜鑶㶓𡅆𡚥𡿄𢆮𣰾𤜐𦇴𧕨𨤃𩰅𪓅",
 "霸": "欛灞䃻𢥻𢺞𤫦𩽷𬧞𬶻",
 "靈": "欞爧㦭䄥䉹䖅䚖䡿䰱䴒𠠱𠣋𡿡𢌔𢺰𣌟𤅷𤖦𤜙𤣤𤫩𤮹𤿅𥘃𥤞𥩔𥾂𦫊𧖜𧟙𧢱𧯙𨟯𨤍𨽲𩑊𩟽",
 "觀": "欟",
 "柰": "歀渿隸㮏㲡𡞫𣛒𣜩𤸏𥈡𥊨𦤧𦳐𦽣𧛮𩈶𩹟𪑨𫎉𫩀",
 "焱": "歘燊飈飊飚㲭𠟡𠢸𢊽𢴵𣄡𤍢𦼐𧄣𧷼𨗄𨞇𩉅",
 "𣥖": "歮歰澀䔼𤹻𫭋𬆀𬆐",
 "𠩵": "歴𢟍",
 "声": "殸𠴢𡁩𡳦𣫆𣼘𤭩𥭺𨧅𪇟𪤲𫯅𫯆𫯇𫸌𬊽",
 "壳": "殻㸿𠳗𡋼𢭜𣒆𨧣𫖡",
 "𡱒": "殿𣣣𪑩𪽛",
 "軎": "毄𬘍",
 "䊆": "毇㘀",
 "巫": "毉筮莁覡觋誣诬靈鵐鹀𠳄𡋻𡌱𡷯𢀣𢃀𥱒𥽛𦈊𧈀𧨈𨽙𨽭𨿏𪚠𬂳𬋲𬝶",
 "毋": "毐𣫹𣫽𥁉𩬍",
 "龶": "毒素責责麦䭍𠡾𡇦𡒅𡠯𡩐𡩜𢊂𢓦𢗣𣖓𣪭𣫹𣼌𤧉𤳭𤾀𥌷𥔏𦑓𦑓𦑢𦕴𦤳𦴀𧉉𨂭𨵯𩱌𪘂𪧵瑇𫴊",
 "毟": "毮",
 "㲎": "毳",
 "普": "氆潽譜谱鐠镨㠮䲕𠒻𠽾𡐭𡚈𡡝𢢏𣌞𣚴𣯽𤩓𥐄𥐅𦡮𧑹𧾃𪨟𪾿𫌑𬶴",
 "宐": "氎㩸",
 "亐": "汚𠄥𠄥𠆬𡧈𢁢𣂭𥏤𦉿𦖓𦘼𦫩𦯟𧥦𨠱𫏲咢扝𬑌𬚒𬚔𬝷",
 "丏": "沔眄髩麪䞛𡛔𡝏𡧍𢗔𣏜𣴩𥤵𥸴𥾝𦬛𧉄𧶎𨟺𩉣𩕽𩾳𫤫𬂷𬘔𬯛",
 "阞": "泐",
 "尻": "泦髛㘲䯌𡶋𣐊𣳣𦙷𧿻𨸰𩬜",
 "写": "泻䥾",
 "耒": "洡筙耓耔耕耖耗耘耙耚耛耝耞耟耠耡耣耤耥耦耨耩耪耫耬耭耮耯耰耱耲誄銇頛㑍㼍䋘䎢䎣䎤䎥䎦䎧䎨䎩䎫䎭䎮䎰䎱䒹䣂𠓩𠙲𠬽𡂮𡋃𡥤𢙩𣑳𣢹𤈞𤞖𥅦𥑶𥨸𥶤𥷸𥹯𦓥𦓦𦓧𦓨𦓩𦓪𦓫𦓬𦓭𦓮𦓯𦓱𦓲𦓳𦓴𦓵𦓶𦓷𦓸𦓹𦓺𦓻𦓼𦓽𦓾𦓿𦔀𦔁𦔂𦔃𦔄𦔅𦔆𦔇𦔈𦔉𦔊𦔋𦔌𦔍𦔎𦔏𦔐𦔑𦔒𦔓𦔔𦔕𦔖𦔗𦔘𦔙𦔚𦔛𦔜𦔝𦔞𦔟𦔠𦔡𦔢𦔣𦔤𦔥𦔦𦔧𦔨𦔩𦔪𦔫𦔬𦫎𧀗𧂻𧄥𧋆𨀤𩳆𩹚𪵛𫀇𫅹𫅺𫅻𫅼𫅽𫅾𫅿𫊅𫊇𫙛𬁻𬖁𬚐𬚑𬟇𬦗𬩧𬱜",
 "夙": "洬珟㑉㓘𤥔",
 "曲": "浀筁粬蛐豊農髷麯㑋㖆㤟㻃䒼䢗𠃪𡂶𡄌𡪊𢏢𢏣𢬑𢻅𢼰𣌱𣌴𣌵𣌶𣌹𣌺𣍀𣍁𣍂𣍅𣍍𣍔𣍕𣍗𣎭𣒠𤒍𤒍𤔱𥠠𦚼𦦤𦩯𧧥𨀪𨀲𨦈𩤰𩳄𪜔𪨰𪱘𪲇𪴊𫅻𫠲𫭭𫵢𫷠𬁥𬅒𬧣",
 "汶": "浏𪣢𫕦",
 "许": "浒",
 "罕": "浫𠳾𤞶𥺍𦯼𨼣𪣟𪳨𪿡𫒢",
 "𢎀": "浳",
 "彤": "浵烿",
 "忡": "浺",
 "杉": "涁𣒡𪓫𬫕",
 "旰": "涆",
 "宊": "涋",
 "位": "涖莅𠑖𠴖𡸏𡾵𪝯𬕅",
 "売": "涜続読",
 "围": "涠",
 "条": "涤筿绦鲦𪝉𪮅𬦹",
 "闰": "润𬂀",
 "间": "涧简裥锏𨁴𫈉𫺒𬑗𬖷𬪫",
 "张": "涨𬦵",
 "昊": "淏䆨𢮚𨛴𪪙𬝫",
 "芳": "淓錺餝𣇷𪝆𪦀",
 "畀": "淠痹睤箅綥鼻㑭𡻼𢈷𢮧𥚈𧚽𧨬𧳠",
 "㦿": "淭",
 "沝": "淼㵘㵘𠊥𣶙𣸞𤀁𥷟𨬛",
 "芷": "淽𦯝𦷱",
 "旻": "渂琝閺𡹋𪸻𫹗",
 "歩": "渉𫛄",
 "黾": "渑绳蝇鼋鼌䰗𡪫𣈣𨵜𪠈𫀓𫑡𫜙𫜟𬅲𬹣𬹤𬺞",
 "鱼": "渔稣蓟鱽鱾鱿鲁鲂鲃鲄鲆鲇鲈鲉鲊鲋鲌鲍鲏鲐鲑鲒鲓鲔鲕鲖鲗鲘鲙鲚鲛鲜鲝鲟鲠鲡鲢鲣鲤鲥鲦鲧鲨鲩鲪鲫鲬鲭鲮鲯鲰鲱鲲鲳鲴鲵鲶鲷鲸鲹鲺鲻鲼鲽鲾鲿鳀鳁鳂鳃鳄鳅鳆鳇鳈鳊鳋鳌鳍鳎鳐鳑鳒鳓鳔鳕鳖鳗鳘鳙鳚鳛鳜鳝鳞鳟鳠鳡鳢鳣鳤䲟䲠䲡䲣𫚈𫚉𫚊𫚋𫚌𫚍𫚎𫚏𫚐𫚑𫚒𫚓𫚔𫚕𫚖𫚗𫚘𫚙𫚚𫚛𫚜𫚝𫚞𫚟𫚠𫚡𫚢𫚣𫚤𫚥𫚦𫚧𫚨𫚩𫚪𫚫𫚬𫚭𫠏𫠐𫠒𬆙𬝁𬶀𬶁𬶂𬶃𬶄𬶅𬶆𬶇𬶈𬶉𬶊𬶋𬶌𬶍𬶎𬶏𬶐𬶑𬶒𬶓𬶔𬶕𬶖𬶗𬶘𬶙𬶚𬶛𬶜𬶝𬶞𬶟𬶠𬶡𬶢𬶣𬶤𬶥𬶦𬶧𬶨𬶩𬶪𬶫𬶬𬶭𬶮𬶯𬶰𬶱𬶲𬶳𬶴𬶵𬶶𬶷𬶸𬶹𬶺𬶻",
 "首": "渞艏衜道馗馘䭫䭭䭮𠃺𠡼𡞝𢰢𣮹𤠁𨍣𨗓𨲛𩖐𩖐𩠑𩠓𩠔𩠗𩠚𩠛𩠟𩠠𩠤𩠥𩠦𩠧𩠨𩠩𩠬𩠬𩠭𩠮𩠯𩠰𩠱𩠲𩠳𩠴𩠵𩠶𩠷𩠸𩠹𩯢𩰇𪬐𪳂𪼼𫋎𫗶𫗷𫗸𫗹𫗺𫗻𫤞𫮐𬞪𬱯𬳕𬳖𬳗𬳘𬳙𬳚𬳛",
 "洰": "渠菃𣵹",
 "苛": "渮𠶾𦂭𧪆𪻸",
 "巷": "港闀𢕵𤧈𥂅𥈄𥈩𧡥𨃈𩈷𩰓𪡝𬙑",
 "虹": "渱𪰄𫕩𬀒𬁅",
 "弭": "渳葞麛㢽㥝𢐩𪓯",
 "兗": "渷𢯻𦳆𨺥𩏈𩘍",
 "斿": "游蝣遊䑻𢝡𢰧𤦽𥯞𦳧𩘓𩹊𫹛𬫲𬶦",
 "眇": "渺篎緲缈𠋝𥻠𦳥𪃐𪃦𪃧𫛹𫬣𬸙",
 "哉": "渽睵賳𠼷𣈻𣖋𥯒𦖱𦞁𦳦𧛷𩹯𪃘",
 "拾": "湁𫽰",
 "拜": "湃㗑𡍹𥛉𥯟𦤛𦳞𨃅𪩹𪲻𪿪𫅫𫏹𫒲𫱋𫴵𫺨𫾖",
 "𦚏": "湇𪟍𪠙𬂄",
 "恬": "湉𦳇",
 "柏": "湐𫢾𬝌",
 "盆": "湓葐㖹𡎛𢞂𢱔𣱦𪂽𪝕𫽡𬃠𬢶",
 "奕": "湙㷜𨩌𪣼𪲱𪼁𬓍",
 "胤": "湚𠸕𧎠𨢂",
 "炭": "湠碳㛶㨏𢾋𢾡𣁗𩤧𪡩𪹇𫺣𬜍",
 "狊": "湨瞁郹闃阒鶪鼳䠐𠋬𤋀𦝳𧽀𨜯𩀎",
 "羑": "湵㕗𦏇𦏇",
 "𡿧": "湽𤱹𧇏𧇕甾",
 "弯": "湾𨂺𬶥",
 "显": "湿顕𪴯𫠃𬊭",
 "両": "満輌𠈓𥈞",
 "𡕖": "溄𦮧𪲋",
 "桂": "溎蓕𠺺𥉯",
 "冡": "溕蒙霥䥂䴿𡣘𡺪𢄐𣋡𥉕𦪃𧞑𧭙𨢊𩆬𩥃𩮡𪳘懞",
 "倫": "溣𠹹𦷉𨫅",
 "𢼸": "溦𫏭",
 "栽": "溨𨃭",
 "畟": "溭禝稷謖谡㮨㹄𢱩𤠎𦃩𦔎𧏧𪰺𫄯𫆪𫘓",
 "師": "溮獅瑡篩蒒螄鰤鶳𡟪𡠋𢲐𤹌𦾦𧏍𧔽𧜂𩥐𩮭𪄜𪝜𪪀𫑺𬄁",
 "𡌥": "溼𣍒𫽪",
 "畔": "溿",
 "除": "滁篨蒢㾻𢡣𢲢𪡷",
 "釜": "滏𩱉𪄇𪞪𬫻",
 "笔": "滗𪼋𫽳𬋰",
 "⺳": "滘罕罙㼱𡙟𡢧𦊅𦦞𦰊𧅿𨼛",
 "衮": "滚磙蓘㨰䜇𬊼",
 "带": "滞㛿䗖䙊𠁑𢢐𣨼𫪺𫶇𬤈",
 "莹": "滢𬎆",
 "唇": "滣䞅𠸸𩺦𪢏𫋏𫑥𬫷",
 "栾": "滦𪢮𬤗",
 "预": "滪蓣",
 "彪": "滮𧜺𧷠𬧌𬩃",
 "寇": "滱簆䳹𢠠𣻎𥲃𨫕𫅟",
 "商": "滳熵蔏螪謪𠼬𤹟𥊔𧜟𨝗𨫢𩱐𪄲𪞊𪬥𪯔𫬩𫱨𬧽𬧿",
 "許": "滸䔓𠼯𢠇𤡈𤾟",
 "悠": "滺",
 "梵": "滼𫍉",
 "袞": "滾蔉㙥䙛𠞬𠽓𡻨𢟦𥐐𥕦𧸫𨎊𫬙𬄓𬓕",
 "魚": "漁穌蘓魛魜魝魞魟魠魡魢魣魤魥魦魧魨魩魪魫魬魭魮魯魰魱魲魳魴魵魶魷魸魹魺魻魼魽魾魿鮀鮁鮂鮃鮄鮅鮆鮇鮈鮉鮊鮋鮌鮍鮎鮏鮐鮑鮒鮓鮔鮕鮖鮗鮘鮙鮚鮛鮜鮞鮟鮠鮡鮢鮣鮤鮥鮦鮧鮨鮩鮪鮫鮬鮭鮮鮯鮰鮱鮲鮳鮴鮵鮶鮷鮸鮹鮺鮻鮽鮾鮿鯀鯁鯂鯃鯄鯅鯆鯇鯈鯉鯊鯋鯌鯍鯎鯏鯐鯑鯒鯓鯔鯕鯖鯘鯙鯚鯛鯜鯝鯞鯟鯠鯡鯢鯣鯤鯥鯦鯧鯨鯩鯪鯫鯬鯭鯮鯯鯰鯱鯲鯴鯵鯶鯷鯸鯹鯺鯻鯼鯽鯾鯿鰀鰁鰂鰃鰄鰅鰆鰇鰈鰉鰊鰋鰌鰍鰎鰏鰐鰑鰒鰓鰔鰕鰗鰘鰙鰚鰛鰜鰝鰞鰟鰠鰡鰢鰣鰤鰥鰦鰨鰩鰪鰫鰬鰭鰮鰯鰰鰱鰲鰳鰴鰵鰶鰷鰸鰹鰺鰻鰼鰽鰾鰿鱀鱁鱂鱃鱄鱅鱆鱇鱈鱉鱊鱋鱌鱍鱎鱏鱐鱑鱒鱓鱔鱕鱖鱗鱘鱙鱚鱛鱜鱝鱞鱠鱡鱢鱣鱤鱥鱦鱧鱨鱩鱪鱫鱬鱭鱮鱯鱰鱱鱲鱳鱴鱵鱶鱷鱸鱹鱻鱻鱻鳉鷠㱎㶖䁩䐳䔡䗨䰲䰳䰴䰵䰶䰷䰸䰹䰺䰻䰼䰽䰾䰿䱀䱁䱂䱃䱄䱅䱆䱇䱈䱉䱊䱋䱌䱍䱎䱏䱐䱑䱒䱓䱔䱕䱖䱘䱙䱚䱛䱜䱝䱞䱟䱠䱡䱢䱣䱥䱦䱧䱨䱩䱪䱫䱬䱭䱮䱯䱰䱱䱲䱳䱴䱵䱶䱷䱸䱹䱺䱻䱼䱽䱾䱿䲀䲁䲂䲃䲄䲅䲆䲆䲇䲈䲉䲊䲋䲌䲍䲎䲏䲐䲑䲒䲓䲕䲖䲗䲘䲙䲚䲛䲜䲜䲜䲜𠏣𠓈𠽐𡆍𡐚𡠵𢊧𢍸𢐗𢖍𢠐𢳶𢺒𣊘𣩕𣿡𤀯𤀸𤃖𤣏𤹿𥩎𥩑𥷉𥷲𦌸𦼼𦿇𧄇𧅹𧓀𨏎𨟂𨢭𨫷𨶢𨽇𩅔𩥭𩵌𩵍𩵎𩵏𩵐𩵒𩵓𩵔𩵖𩵗𩵘𩵙𩵚𩵛𩵜𩵞𩵟𩵠𩵡𩵢𩵣𩵤𩵥𩵦𩵧𩵨𩵩𩵪𩵫𩵬𩵭𩵮𩵯𩵰𩵱𩵲𩵳𩵴𩵵𩵶𩵷𩵸𩵹𩵺𩵻𩵼𩵽𩵾𩵿𩶀𩶁𩶂𩶃𩶄𩶅𩶆𩶇𩶈𩶉𩶋𩶌𩶍𩶎𩶏𩶐𩶑𩶒𩶔𩶕𩶖𩶗𩶘𩶙𩶚𩶛𩶜𩶝𩶞𩶟𩶡𩶢𩶣𩶤𩶥𩶦𩶧𩶨𩶩𩶪𩶫𩶭𩶮𩶯𩶰𩶱𩶲𩶳𩶴𩶵𩶶𩶷𩶸𩶼𩶽𩶾𩶿𩷀𩷁𩷂𩷃𩷄𩷅𩷆𩷇𩷈𩷉𩷊𩷋𩷌𩷍𩷎𩷏𩷐𩷑𩷓𩷔𩷕𩷖𩷗𩷘𩷙𩷚𩷜𩷝𩷞𩷟𩷠𩷡𩷢𩷣𩷤𩷥𩷦𩷧𩷨𩷩𩷪𩷫𩷬𩷭𩷮𩷯𩷰𩷱𩷲𩷳𩷴𩷵𩷶𩷷𩷸𩷹𩷺𩷻𩷼𩷽𩷾𩷿𩸀𩸁𩸂𩸃𩸄𩸅𩸆𩸇𩸈𩸉𩸊𩸋𩸌𩸍𩸎𩸏𩸐𩸑𩸒𩸓𩸔𩸕𩸖𩸙𩸚𩸛𩸜𩸝𩸞𩸟𩸠𩸡𩸢𩸣𩸤𩸥𩸦𩸧𩸨𩸩𩸪𩸫𩸬𩸮𩸯𩸰𩸱𩸲𩸳𩸴𩸵𩸶𩸷𩸸𩸹𩸺𩸻𩸼𩸾𩸿𩹀𩹁𩹂𩹃𩹄𩹅𩹆𩹇𩹈𩹉𩹊𩹋𩹌𩹍𩹎𩹏𩹐𩹑𩹒𩹓𩹔𩹕𩹖𩹗𩹙𩹚𩹛𩹜𩹝𩹞𩹟𩹠𩹡𩹢𩹤𩹥𩹦𩹧𩹩𩹪𩹫𩹬𩹭𩹮𩹯𩹰𩹱𩹲𩹴𩹶𩹷𩹸𩹹𩹺𩹻𩹼𩹽𩹾𩹿𩺀𩺁𩺂𩺄𩺅𩺆𩺇𩺈𩺉𩺋𩺌𩺍𩺎𩺏𩺐𩺑𩺒𩺓𩺔𩺕𩺖𩺗𩺘𩺙𩺚𩺜𩺝𩺞𩺟𩺠𩺡𩺢𩺣𩺤𩺦𩺧𩺨𩺩𩺪𩺫𩺬𩺮𩺯𩺰𩺰𩺱𩺲𩺳𩺴𩺵𩺶𩺷𩺺𩺻𩺼𩺽𩺾𩺿𩻀𩻁𩻂𩻃𩻄𩻅𩻆𩻇𩻊𩻋𩻌𩻍𩻎𩻏𩻐𩻑𩻒𩻓𩻔𩻕𩻗𩻘𩻙𩻚𩻛𩻜𩻝𩻞𩻟𩻠𩻡𩻢𩻣𩻤𩻥𩻦𩻧𩻨𩻩𩻪𩻫𩻬𩻭𩻮𩻯𩻰𩻱𩻲𩻳𩻴𩻵𩻶𩻷𩻸𩻹𩻻𩻼𩻽𩻾𩻿𩼀𩼁𩼃𩼄𩼅𩼆𩼇𩼈𩼉𩼊𩼋𩼌𩼍𩼎𩼏𩼐𩼑𩼒𩼓𩼔𩼕𩼖𩼗𩼘𩼙𩼚𩼛𩼜𩼝𩼞𩼟𩼠𩼡𩼢𩼤𩼥𩼦𩼧𩼨𩼩𩼪𩼪𩼫𩼬𩼭𩼮𩼯𩼰𩼱𩼲𩼴𩼵𩼶𩼷𩼸𩼹𩼺𩼻𩼼𩼽𩼾𩼿𩽀𩽁𩽂𩽃𩽄𩽅𩽆𩽇𩽈𩽉𩽊𩽋𩽌𩽍𩽎𩽏𩽐𩽑𩽒𩽓𩽔𩽕𩽖𩽗𩽘𩽙𩽚𩽛𩽜𩽝𩽞𩽟𩽠𩽡𩽢𩽣𩽥𩽦𩽧𩽨𩽩𩽪𩽫𩽬𩽭𩽮𩽯𩽰𩽱𩽲𩽳𩽴𩽵𩽶𩽷𪗏𪺚𪺚𪺚𪽟𫊣𫑨𫙏𫙐𫙑𫙒𫙔𫙕𫙖𫙗𫙘𫙙𫙚𫙛𫙜𫙝𫙞𫙟𫙠𫙡𫙢𫙣𫙤𫙥𫙦𫙧𫙨𫙩𫙪𫙫𫙬𫙮𫙯𫙰𫙱𫙲𫙳𫙴𫙵𫙶𫙷𫙸𫙹𫙺𫙻𫙼𫙽𫙾𫙿𫚀𫚁𫚂𫚃𫚄𫚅𫚆𫚇𫠍𫠎㱎𫹂𬩬𬵁𬵂𬵃𬵄𬵅𬵆𬵇𬵈𬵉𬵊𬵋𬵌𬵍𬵎𬵏𬵐𬵑𬵒𬵓𬵔𬵕𬵖𬵗𬵘𬵙𬵚𬵛𬵜𬵝𬵞𬵟𬵠𬵡𬵢𬵣𬵤𬵥𬵦𬵧𬵨𬵩𬵪𬵫𬵬𬵭𬵮𬵯𬵰𬵱𬵲𬵳𬵴𬵵𬵶𬵷𬵸𬵹𬵺𬵻𬵼𬵽𬵾𬵿",
 "寂": "漃𢠭𫴇",
 "脣": "漘磭䔚䥎𣘣𧱽𩕁",
 "埜": "漜𠪖",
 "覓": "漞㯒䌐䮭𠼽𥊋𥛟𦸡𧐎𧱻𧽨𪒐",
 "婪": "漤𠼖𩔵𪧲",
 "窐": "漥",
 "乾": "漧㨴𠼳𢠥𨝌𨝝𨫬𨼃𫙱",
 "猗": "漪𦸒𫑁",
 "莽": "漭蟒㟿㬒䁳䒎䥈𠻵𢟨𢳠𣙷𣯬𤛘𥕊𦟮𧬏𩅁",
 "張": "漲瘬㙣㯑𢊜𢐓𢳫𦸾𧐊𨄰𫣖𫫧",
 "崇": "漴㓽𠼾𡿂𢠄𣙩𤨲𥊠𥛢𥡶𥨢𧐿𧽧𨅃𨝡𩅃𩻃𪅁𪉻𫌌𫓁𬳐",
 "敘": "漵",
 "眾": "潀𬌎",
 "萦": "潆",
 "萧": "潇蟏𤎻𫾃",
 "崑": "潉熴𢠎𣙍𤨾𦄬𫮞𬵥",
 "敍": "潊",
 "敛": "潋蔹𬋃",
 "窒": "潌膣螲㗧䏄𡻜𡼄𢲼𥉺𥡫𪙜",
 "维": "潍",
 "琶": "潖𣚒𧑡",
 "集": "潗磼穕襍鏶㗱㙫㠍㠎䌖䮶𠍱𡙸𢵸𣛜𦈜𦺴𨤹𪆐𪹯𪼛𫋝𫕱𫘂",
 "路": "潞璐簬蕗鏴露鷺鹭㯝𡀔𡽘𢷅𤢊𤮗𦌕𦓉𧒌𧒍𧸚𨎲𩁐𪆬𪆽𪛅𫄉𫘘",
 "衆": "潨䝦𪢊𫏢",
 "智": "潪䚐䠦𡐻𡡧𥋒𧒊𨼓𪳲𫋰𫣠",
 "稍": "潲蕱𠿀𡡏𢵥𥳓𬖹",
 "筆": "潷㻶𠽩𡼸𢴩𤏫𤔯𤢇𤺭𨅗𨖷𨬾𪴅𫄂𬴟",
 "森": "潹𠎊𠘆𠾣𠾤𡑓𢊲𢵳𣛧𣡕𣡕𤏗𤺢𥗘𦼚𨅾𩕌",
 "黍": "潻黏黐䵑䵒䵓䵔䵕䵖䵗䵘䵙䵚䵛䵜𤓜𤛿𤯒𧑓𧒁𧬠𨘯𨞃𩁄𩆲𩡠𪆜𪇺𪋩𪎭𪏦𪏮𪏰𪏱𪏲𪏳𪏴𪏵𪏶𪏷𪏸𪏹𪏺𪏻𪏼𪏽𪏾𪏿𪐀𪐁𪐂𪐃𪐄𪐅𪐆𪐇𪐈𪐉𪐊𪐋𪐌𪐍𪐎𪐏𪐐𪐐𪐑𪐓𪐔𪐖𪒚𪒺䵖𬓸𬹔",
 "圍": "潿䙟𠄿𠆎𡼱𥴞𧝕𧝖𩏉𩼀",
 "歮": "澁蕋蘃𠟞𠦾𠾜𡢋𢡬𤎠𤺙𥖋𦿼𩻩𫓋𬄢",
 "嵒": "澏癌",
 "項": "澒䁰𠾿𡼔𢠷𢴦𦺣𨬰𬄝",
 "皓": "澔𫉢",
 "舃": "澙",
 "預": "澦蕷𠟹𣛿𨮌𬘂",
 "零": "澪燯蕶㩕㬡㯪䌢䙥䴇䴫𠏡𠟨𤖜𤾨𥋞𥖟𥢴𥼸𦪩𨗺𨞖𨣖𩁎𩟃𪋪𪞮",
 "資": "澬薋蠀䆅𡳠𢢾𥼻𧹌𧾒𩆂𩆃𫑫𫚁",
 "㬅": "澷𪴂",
 "睢": "濉𧾕",
 "瑟": "濏璱飋𤪴𦆄𧒓𨆙𩇣𫗋",
 "暑": "濐鱪𢋂𤻃",
 "频": "濒颦𫍐𫫾𬞟",
 "亷": "濓䥥𠠟𢅖𢅳𢶧𤅃𤒄𧒲𧸜𩼖𣀊",
 "熒": "濙藀𡂋𧓌𧭓",
 "斡": "濣",
 "夤": "濥𡒕𧓒",
 "靘": "濪𩇝",
 "蓋": "濭瓂礚鑉饚䡷𡣨𢅤𢷞𤻜𧞔𨞨𨽈𩍰𩕭𩡤𫇙𫠁",
 "僕": "濮纀襥㙸㯷𡂈𢷏𤪟𥣜𥵜𦿍𧭎𨆯𨮓𨽂𩍩𫶟𫸆",
 "維": "濰羅䗽𢋘𢣘𤻕𥵻𦌴𫓙𬗿𬞼",
 "㬱": "濳㦧𣎯𧮂𨯩𬖂",
 "滎": "濴",
 "賔": "濵㯽𡣕𢷤𣩵𦆯𦿜𧢘𪇧𬛜",
 "䦚": "濶𡁡",
 "蒼": "濸𦾝𩕹𪼧",
 "黒": "濹纒𠢴𣘸𤒲𧔹",
 "賤": "濺㰄𥜤𫻔𬚂",
 "隤": "濻藬𥶐",
 "瑩": "瀅㼆𠐓𡃅𤑚𥗏𨯗𨽓𪦯𬘌",
 "翬": "瀈㩣𤑱",
 "寫": "瀉藛䥱𣞐𥖽𥶘𧓺𧭠𧸹𧸿",
 "盤": "瀊䃲䰔𡂑𤻷𬬛",
 "廛": "瀍纏躔鄽㙻𢷹𤪮𧾡𨮻𩼼𪇮",
 "𠾂": "瀒",
 "穀": "瀔𢣯𣫪𧂣𩁡𪇗",
 "翰": "瀚𨯪",
 "静": "瀞",
 "縈": "瀠礯𦇝",
 "隨": "瀡瓍㰐𤢩𥶻𦢪𧁼𨯝𩪷𫲙",
 "遺": "瀢讉䑊䪋𠑌𢸦𣄧𥌰𧂠𧔥𧞸𧸽𨯯𨽟𩽎𪐔𪺊𫏩",
 "韰": "瀣㒠𡤋𢤯𧂊𧭸𩐉𩽍",
 "翯": "瀥",
 "頽": "瀩𢹉",
 "縠": "瀫𥷆𧂔",
 "涑": "瀬𪄠𪆟𬈆",
 "輸": "瀭𪿐",
 "霖": "瀮𪤰𪴖𪼬𫣼",
 "彌": "瀰獼瓕㜷䉲䕳䥸𡄣𡓭𡾱𨣾𬬠",
 "罽": "瀱蘮𥷙𦇧",
 "斂": "瀲籢蘞𢅸𢋻𣟺𤒥𤒦𫾛",
 "薦": "瀳韉䍎𥤆𧟆𧲛𨰂𨷳",
 "糞": "瀵䆏𡓴𢹔𣀲𣠂𥽡𥽤𫃘𫘚",
 "臨": "瀶𠐼𤄈",
 "翼": "瀷㢞𠥦𤒩𤼌𥤌𦔫𧾰𨙒𪧴𫍖𫓢𬓝",
 "龠": "瀹爚禴籥蘥讑鑰鸙龡龢龣龤龥㒢㿜䟑䠯䶳䶴䶵𢅹𥌺𥤉𦇬𧕋𧟇𧢢𧹊𨙄𨷲𨸎𪛊𪛋𪛌𪛍𪛎𪛏𪛐𪛑𪛓𪛕𪛖𫜴𬰾𬱳𬺟𬺠𬺡",
 "戴": "瀻襶𠑀",
 "繁": "瀿蘩㩯𩎆𬪤𬹬",
 "闎": "灁",
 "壘": "灅蘲鑸㒦㠥𡔁𢹮𣠠𥗬𥤐𧕫𪈦",
 "藍": "灆礷㘕𤓆𤼓𥍍𧟋𧾲𩟺𪈭𫲝",
 "鬵": "灊𣠟𨽨",
 "廌": "灋薦韀𠏰𢋱𢌇𢖇𢢘𣿕𤢒𥴱𦆉𦉙𧲊𨷓𩎇𪢔𪴇𫋡𫬅𫸠𬋽𬰟",
 "闕": "灍𥗮𨇮𬘒",
 "澧": "灎灔𤄝",
 "澋": "灏",
 "鎣": "灐",
 "蟺": "灗",
 "闡": "灛𢺛𥸍",
 "贏": "灜籯",
 "顥": "灝",
 "彎": "灣䘎𡤶𡿞𢺯𣡩𧆅𨈊𬣗",
 "顯": "灦𡆘𣡲𧖙𩎌𩎍",
 "艷": "灧𡤸",
 "豔": "灩",
 "鬱": "灪爩䖇𡯀𡿥𢺴𤓮𥘄𪓊",
 "𠔾": "炿𪕄",
 "朴": "烞𠡙𠧭𬇑",
 "汤": "烫荡铴𬂱𬍡",
 "芍": "烵𥍰𬞠",
 "吹": "焁𠀿𢭻𣒱𣤐𣵯𣵶𤉚𤶺𥪅𥺏𥺔𨁰𩭜𪥒𪨸𫈀",
 "戺": "焈𨧒",
 "闷": "焖𫢨𫺓𫼽𬅳𬇰𬕊𬖟",
 "穹": "焪䛪䠻𡸕𡹗𢛙𢮍𣇬𣶆𥓰𦲄𨡗",
 "芮": "焫蜹㨅𡍝𣓃𦜬𨌣𨧨𬯜",
 "炏": "焱燚燚鶑𠙦𣂈𣓳𣶷𤇾𤈺𤯵𦲌𨧿𨷡𫒽𫫎𫸢𫺞𬊇𬏙𬡤",
 "昍": "焸𡕾𢵃𢸉𢸲𣉬𤦉𥫈𥷍𦍄𦑾𦦄𦿑𨐀𩯾𫓣𬊘",
 "昇": "焺髜鵿𢛿𧖿𨵒𨺒𫢰𬴙",
 "昫": "煦𣊤",
 "昭": "照𡎣𣸬𧼹",
 "㒸": "煫遂邃隊㥞㴚䃍䠔䯟𡀟𡐂𡟝𡩙𢉭𢵩𣔾𤋌𤸉𥠂𥢁𥻖𦂁𦿮𧔑𧰬𨍨𨗅𨪂𨺵𩅫𩅲𩔀𩙢𩙢𩝌𪑫𪳸𬎼𬛊𬰧",
 "𣧄": "煭㭮㳨𫏎",
 "退": "煺腿螁褪蹆㾼𠑉𠺙𢟔𢱸𣗔𣻇𦄁𦤮𨙝𩄮𩘩𩘬𫤈𫤓",
 "閃": "熌閷㨛㴸䁡䠾𥡕𪬖",
 "宮": "熍㴦𠹒𢞏𢾮𣪯𤹜𦵡𧎡𨜳𩘎𫱜",
 "巸": "熙𢞍𫿉𬦘",
 "翌": "熤𥡪𪢄𪩒𪷊𬄘",
 "移": "熪簃謻䔟𠗺𠼪𡻣𢴐𣘵𣻗𥟻𧐹𨄼𨖨𪅨𬓟",
 "湯": "燙璗盪簜蕩鐋𠎯𡐀𡑑𡢈𡼍𡾕𢡂𢴳𧑘𪳷",
 "臦": "燛臩",
 "悶": "燜蕄㦖㵍䉍𠎒𡮬𡮮𤺯𪮰𫃐𫵈𬛗",
 "毁": "燬𤻏",
 "䝱": "燲",
 "照": "燳𥵕𬡰𬪸",
 "豩": "燹𧱶𧱾𧲟𨰖𫔫",
 "槀": "燺𣝩",
 "熱": "爇𪷴",
 "勳": "爋蘍𡓕𡤂𤑕𫾙",
 "曅": "爗𨯮𫤨",
 "餐": "爘𡄄𩽐𬆝",
 "蟲": "爞蠱䘇䘉𠤋𠥨𢥞𤼖𧒢𧔃𧔨𧔴𧔻𧔼𧕑𧕒𧕽𧕿𧖁𧖈𧖓𧖕𧖟𨰍𨷷𩫲𫯀",
 "爻": "爼笅訤駁驳㤊㸚㸚䂚䋂䒝䡈𠽽𡄉𡥈𡦴𢁫𢱇𣏠𤅭𤕜𤕞𤕟𤕠𤕢𤕥𤕦𤕧𥤹𥫖𥫖𥾥𦷠𧂘𧅍𨈠𨌸𨌸𨟿𨡆𩇒𩇒𩉤𩎔𩬃𩵲𩾾𪡘𪩜𪺝𫚃𫾜𬉩𬋽𬪢",
 "牪": "犇𠵮",
 "雔": "犨讐雙靃㸈𡆛𤒏𧕺𩀟𩀱𪈲𪟻𬖈",
 "讎": "犫㘜𠧐",
 "𡈼": "狅祍𠚂𢊉𢗩𢪭𣇒𣗕𣣆𦬰𦵞𨑳𨓒𨨌𪨋𨗒",
 "𠕋": "狦𠜂𠱡𡜜𡬬𡷌𢨏𣑭𣳷𣸙𥬰𥲙𦚻𦣧𧲾𨀢𨚿𨴕𩂨",
 "守": "狩酧㑏䢘𠃿𠱔𢚍𤕠𥍄𥩽𥿾𧵤𧵿𩊦𪧚𪧡𫒙𫰦𬕀",
 "㹜": "猋𣤛𬍈",
 "弥": "猕㟜㳽𠵸𡝠𣓔𥮜𧢖𨧮𨨮𩸹𪋈",
 "𤔇": "猙睜",
 "畄": "獣",
 "嘼": "獸𠐠𡃣𡄲𬡁𬩨",
 "鬳": "獻甗𤬝𨽚𪙿𪚊",
 "蘄": "玂",
 "⺩": "玌玎玏玐玑玒玓玔玕玖玗玘玙玛玜玝玞玟玠玡玢玣玤玥玦玧玨玩玪玫玬玭玮环现玱玲玳玴玵玶玷玸玹玻玼玽玾玿珀珁珂珃珄珅珆珇珈珉珊珋珌珍珏珐珑珒珓珔珕珖珗珘珙珚珛珜珝珞珟珠珢珣珤珥珦珧珨珩珪珫珬珯珰珱珲珴珵珶珷珸珹珺珻珼珽現珿琀琂球琄琅理琇琈琉琊琋琌琍琏琐琑琒琔琕琖琗琘琙琚琜琝琟琠琡琢琣琤琥琦琨琩琪琫琬琭琮琯琰琱琲琳琷琸琺琻琼琽琾琿瑀瑁瑂瑃瑄瑅瑆瑇瑈瑉瑊瑋瑌瑍瑎瑏瑐瑑瑒瑓瑔瑕瑖瑗瑘瑚瑛瑜瑝瑞瑠瑡瑢瑥瑦瑧瑨瑪瑫瑭瑮瑯瑰瑱瑲瑳瑴瑵瑶瑷瑹瑺瑻瑼瑽瑾璀璁璂璃璄璅璆璇璈璉璊璋璌璍璎璏璐璑璒璓璔璕璖璘璚璛璜璝璞璟璠璡璢璣璤璥璦璨璩璪璫璬璭璮璯環璱璲璳璴璵璶璷璸璹璻璼璾璿瓀瓁瓂瓃瓄瓅瓆瓇瓈瓉瓊瓋瓌瓍瓎瓏瓐瓑瓒瓓瓔瓖瓗瓘瓙瓚瓛頊顼鳿䥅𣕰𣗜𣾏𤣭𤣮𤣯𤣰𤣱𤣲𤣳𤣵𤣷𤣸𤣹𤣺𤣻𤣽𤣾𤣿𤤀𤤂𤤄𤤅𤤆𤤇𤤈𤤉𤤊𤤌𤤍𤤏𤤐𤤑𤤒𤤓𤤔𤤕𤤖𤤗𤤚𤤛𤤜𤤝𤤟𤤠𤤡𤤢𤤣𤤤𤤥𤤦𤤧𤤨𤤩𤤪𤤫𤤬𤤭𤤮𤤯𤤱𤤲𤤳𤤵𤤷𤤸𤤹𤤺𤤼𤤽𤤾𤤿𤥀𤥁𤥂𤥄𤥅𤥆𤥇𤥊𤥋𤥌𤥍𤥎𤥐𤥑𤥒𤥕𤥖𤥗𤥘𤥚𤥛𤥜𤥝𤥞𤥟𤥡𤥢𤥣𤥥𤥦𤥧𤥨𤥩𤥪𤥫𤥬𤥭𤥮𤥯𤥱𤥳𤥴𤥵𤥶𤥺𤥼𤥽𤥾𤥿𤦄𤦆𤦇𤦊𤦋𤦌𤦍𤦎𤦏𤦐𤦑𤦔𤦕𤦘𤦙𤦚𤦛𤦜𤦝𤦞𤦣𤦤𤦧𤦩𤦪𤦫𤦭𤦮𤦯𤦰𤦱𤦲𤦳𤦴𤦵𤦶𤦷𤦸𤦹𤦺𤦻𤦽𤦾𤦿𤧀𤧁𤧃𤧄𤧅𤧇𤧈𤧉𤧊𤧋𤧌𤧍𤧎𤧏𤧐𤧑𤧓𤧔𤧕𤧖𤧗𤧘𤧙𤧚𤧛𤧜𤧝𤧞𤧟𤧣𤧨𤧪𤧫𤧭𤧮𤧯𤧱𤧳𤧴𤧵𤧶𤧷𤧸𤧹𤧺𤧼𤧽𤧿𤨀𤨁𤨂𤨃𤨅𤨆𤨇𤨈𤨋𤨌𤨍𤨎𤨏𤨑𤨒𤨓𤨔𤨕𤨖𤨚𤨛𤨜𤨞𤨟𤨠𤨢𤨤𤨥𤨦𤨧𤨨𤨪𤨫𤨬𤨭𤨮𤨯𤨰𤨱𤨲𤨳𤨵𤨶𤨷𤨸𤨹𤨺𤨾𤨿𤩀𤩁𤩂𤩃𤩄𤩅𤩆𤩇𤩈𤩉𤩊𤩋𤩌𤩎𤩏𤩐𤩑𤩒𤩓𤩔𤩕𤩖𤩗𤩙𤩜𤩝𤩠𤩡𤩢𤩣𤩥𤩦𤩧𤩨𤩪𤩫𤩬𤩭𤩰𤩲𤩳𤩴𤩵𤩶𤩷𤩸𤩺𤩻𤩽𤩾𤩿𤪀𤪁𤪂𤪃𤪄𤪅𤪆𤪌𤪍𤪏𤪑𤪒𤪓𤪔𤪗𤪘𤪙𤪚𤪛𤪜𤪝𤪞𤪟𤪠𤪢𤪣𤪤𤪥𤪦𤪧𤪨𤪩𤪪𤪫𤪮𤪯𤪱𤪲𤪳𤪴𤪵𤪶𤪷𤪸𤪹𤪺𤪻𤪼𤪽𤪾𤪿𤫁𤫂𤫃𤫄𤫅𤫇𤫈𤫉𤫋𤫋𤫌𤫎𤫑𤫓𤫕𤫖𤫗𤫘𤫙𤫛𤫞𤫟𤫠𤫡𤫣𤫤𤫥𤫦𤫧𤫨𤫩𥳧",
 "充": "珫統茺銃㤝𣑁𩒘𩩁",
 "进": "琎",
 "法": "琺鍅䦢𠎢𠵽𢌇𤀢𦝌𦝎𦲾𧇦𪫚𪴹𪶏𪾁𬈅𬰂",
 "毒": "瑇碡纛蝳䓯𠉩𠒾𢃶𢝂𣕬𣫵𤚚𦺇𧔄𧛔𩹝𬠶𬶡",
 "穿": "瑏𥈹𨩴𫁛𬔌𬔕",
 "流": "瑬蓅鎏𠺩𡏬𣹭𥧕𥰤𩙣𪃂𬈰",
 "荼": "瑹鷋䅷𠻬𢴉𣘻𨝛𨢬𩻓",
 "彘": "璏𩻼",
 "莠": "璓",
 "渠": "璖磲蕖蟝㣄䝣𠍲𠹱𡡥𣯸𤡷𦄽𧕎𨬡𩱮𪆂𪆫𫐀𬄨",
 "進": "璡䗯𢶘𣛎𣝤𥳟𦻗𧾄𬔀𬣓",
 "運": "璭𡽅𢶂𧬪𨏂𪷦",
 "敻": "瓊矎藑讂𢷳𧓬𧥎𧭦𧾣𩧊",
 "燾": "瓙𤴃",
 "䖵": "瓥蝨蝱螙螡螶螽蟁蟊蟲蟸蠚蠠蠡蠢蠤蠧蠫蠭蠯蠶蠹蠺蠽蠿𥋅𫋒𬒣𬠤𬠷𬠸𬠹",
 "甡": "甧㽓𠞏𤅏",
 "亩": "畆畒畝𠆁𠭇𡍠𤱈𤱶𫡼",
 "勻": "畇䏛𠣝𠣢𡉲𡖒𢓈𢗋𢻸𢼇𣆃𣌨𤆥𤙊𤜼𥐩𥘩𥪇𥾡𦁮𦁮𧥺𨥒𩃇𩿃𪻎𬐄",
 "佘": "畲賒赊𦯬𪞡𪠩𪱡𪶅",
 "⺪": "疎疏𩑠",
 "疒": "疓疔疕疗疘疙疚疛疜疝疞疟疠疢疣疤疥疦疧疨疩疪疫疬疭疮疯疰疱疲疳疴疵疶疷疸疹疺疻疼疽疾疿痀痁痂痃痄病痆症痈痉痊痋痌痍痎痏痐痑痒痓痔痕痖痗痘痙痚痛痜痝痞痟痠痡痢痣痤痥痦痧痨痪痫痬痭痮痯痰痱痲痳痴痵痶痷痸痹痺痻痼痽痾痿瘀瘁瘂瘃瘄瘅瘆瘇瘈瘉瘊瘋瘌瘍瘎瘏瘐瘑瘒瘓瘔瘕瘖瘗瘘瘙瘚瘛瘜瘞瘟瘠瘡瘢瘣瘤瘥瘦瘧瘨瘩瘪瘫瘬瘭瘮瘯瘰瘱瘲瘳瘴瘵瘶瘷瘹瘻瘼瘽瘾瘿癀癁癃癄癅癆癇癈癉癊癋癌癍癎癏癐癑癒癓癔癕癖癗癘癙癚癛癜癞癟癠癡癢癣癤癥癧癨癩癪癫癬癭癮癯癰癱癲癳癴癵㽱㽲㽳㽴㽵㽶㽷㽸㽹㽺㽻㽼㽽㽾㽿㾀㾁㾂㾃㾄㾅㾆㾇㾈㾉㾊㾋㾌㾍㾎㾏㾐㾑㾒㾓㾔㾕㾖㾗㾘㾙㾚㾛㾜㾝㾞㾟㾠㾡㾢㾣㾤㾥㾦㾧㾨㾩㾪㾫㾬㾭㾮㾯㾰㾱㾲㾳㾴㾵㾶㾷㾸㾹㾺㾻㾼㾽㾾㾿㿀㿁㿂㿃㿄㿅㿆㿇㿉㿊㿋㿌㿍㿎㿏㿐㿑㿒㿓㿔㿕㿖㿗㿘㿙㿚㿛㿜𠘡𢵹𣈐𣪪𤐅𤴥𤴦𤴧𤴨𤴩𤴪𤴫𤴬𤴭𤴮𤴯𤴰𤴱𤴲𤴳𤴵𤴶𤴷𤴸𤴹𤴺𤴻𤴼𤴽𤴾𤴿𤵀𤵁𤵂𤵃𤵄𤵅𤵆𤵇𤵈𤵉𤵊𤵋𤵌𤵍𤵎𤵏𤵐𤵒𤵓𤵔𤵕𤵖𤵗𤵘𤵙𤵚𤵛𤵝𤵞𤵟𤵠𤵡𤵢𤵣𤵤𤵥𤵦𤵧𤵩𤵪𤵬𤵭𤵮𤵯𤵱𤵲𤵳𤵴𤵶𤵷𤵹𤵺𤵻𤵼𤵽𤵾𤵿𤶀𤶁𤶂𤶄𤶅𤶆𤶇𤶈𤶉𤶊𤶋𤶌𤶍𤶎𤶏𤶐𤶑𤶓𤶔𤶕𤶖𤶗𤶘𤶙𤶚𤶛𤶜𤶝𤶞𤶟𤶠𤶡𤶢𤶣𤶤𤶥𤶦𤶧𤶨𤶩𤶪𤶬𤶭𤶰𤶱𤶲𤶳𤶴𤶵𤶶𤶷𤶸𤶹𤶺𤶻𤶼𤶽𤶾𤶿𤷀𤷁𤷂𤷃𤷄𤷅𤷆𤷇𤷈𤷉𤷊𤷋𤷌𤷍𤷎𤷐𤷑𤷒𤷓𤷔𤷕𤷗𤷘𤷚𤷛𤷜𤷝𤷞𤷟𤷠𤷡𤷢𤷣𤷤𤷥𤷦𤷧𤷩𤷪𤷫𤷬𤷭𤷮𤷯𤷱𤷳𤷴𤷵𤷶𤷷𤷸𤷹𤷺𤷼𤷽𤷾𤷿𤸀𤸁𤸂𤸄𤸅𤸆𤸈𤸉𤸊𤸋𤸌𤸍𤸎𤸏𤸐𤸑𤸒𤸓𤸔𤸕𤸖𤸗𤸘𤸙𤸛𤸜𤸝𤸞𤸟𤸠𤸡𤸢𤸣𤸤𤸥𤸦𤸧𤸨𤸩𤸪𤸫𤸬𤸭𤸮𤸯𤸰𤸱𤸲𤸳𤸴𤸵𤸷𤸸𤸹𤸺𤸻𤸼𤸽𤸾𤸿𤹀𤹁𤹂𤹃𤹄𤹅𤹆𤹇𤹈𤹉𤹊𤹋𤹌𤹍𤹏𤹐𤹑𤹒𤹓𤹔𤹕𤹖𤹘𤹙𤹚𤹛𤹜𤹝𤹞𤹟𤹠𤹡𤹢𤹣𤹤𤹦𤹧𤹨𤹪𤹫𤹬𤹭𤹮𤹯𤹰𤹱𤹲𤹵𤹶𤹷𤹸𤹹𤹺𤹻𤹼𤹽𤹾𤹿𤺀𤺁𤺂𤺃𤺄𤺅𤺆𤺇𤺈𤺉𤺊𤺋𤺌𤺍𤺎𤺏𤺐𤺑𤺒𤺓𤺔𤺕𤺖𤺘𤺙𤺚𤺛𤺜𤺝𤺞𤺟𤺠𤺡𤺢𤺤𤺥𤺦𤺧𤺨𤺩𤺪𤺫𤺬𤺭𤺮𤺯𤺰𤺱𤺲𤺳𤺴𤺵𤺶𤺷𤺸𤺹𤺺𤺻𤺼𤺽𤺾𤺿𤻀𤻂𤻃𤻄𤻅𤻆𤻇𤻈𤻉𤻊𤻋𤻌𤻍𤻎𤻏𤻐𤻑𤻒𤻔𤻕𤻖𤻛𤻜𤻝𤻞𤻟𤻠𤻡𤻢𤻣𤻤𤻥𤻦𤻧𤻨𤻩𤻪𤻫𤻬𤻭𤻮𤻯𤻰𤻱𤻲𤻳𤻴𤻵𤻶𤻷𤻸𤻹𤻺𤻻𤻼𤻽𤻾𤻿𤼀𤼁𤼂𤼃𤼄𤼅𤼆𤼇𤼈𤼉𤼊𤼋𤼌𤼎𤼏𤼒𤼓𤼔𤼕𤼖𤼗𤼘𤼙𤼚𤼛𤼝𤼟𤼠𤼡𤼢𤼣𤼤𦗽𦟉𧙜𩠾𪡦𪽨𪽩𪽪𪽫𪽬𪽭𪽮𪽯𪽰𪽱𪽲𪽳𪽴𪽵𪽶𪽷𪽸𪽹𪽺𬏚𬏛𬏜𬏝𬏞𬏟𬏠𬏡𬏢𬏣𬏤𬏥𬏦𬏧𬏨𬏩𬏪𬏫𬏬𬏭𬏮𬏯𬏰𬏱𬏲𬏳𬏴𬏵𬏶𬏷𬏸𬏹𬏺𬏻𬏼𬏽𬏾𬏿𬐀𬐁",
 "秃": "痜鋵䛢𪉍𬓼",
 "𣏟": "痲𬏿",
 "恝": "瘛",
 "虐": "瘧謔谑㖸𨩽𪘽𪪛",
 "㤲": "瘱㥷",
 "痂": "瘸",
 "釣": "瘹䔙𠍖𡠶𥲟",
 "隐": "瘾𬄩",
 "斑": "癍𢴬𤡰𫫨𬷱",
 "愈": "癒𢷀𣜴𤀒𤪂𥣒𦾤𨮋𩙍𪤣𪬪𬕷𬲠𬷴",
 "鼠": "癙竄鼢鼣鼤鼥鼦鼧鼨鼩鼪鼫鼬鼭鼮鼯鼰鼱鼲鼳鼴鼵鼶鼷鼸鼹鼺䶂䶃䶄䶅䶆䶇䶈䶉𠏙𤢡𥣅𧒑𨭿𩯡𪔸𪔹𪔺𪔻𪔼𪔽𪔾𪔿𪕀𪕁𪕂𪕃𪕄𪕅𪕆𪕇𪕈𪕉𪕊𪕋𪕌𪕍𪕎𪕏𪕐𪕑𪕒𪕓𪕔𪕕𪕖𪕗𪕘𪕙𪕚𪕛𪕜𪕝𪕞𪕟𪕠𪕡𪕢𪕣𪕤𪕥𪕦𪕧𪕨𪕩𪕪𪕫𪕬𪕭𪕮𪕯𪕰𪕱𪕲𪕳𪕴𪕵𪕶𪕷𪕸𪕹𪕺𪕻𪕼𪕽𪕾𪖀𪖁𪖂𪖃𪖄𪖅𪖆𪖇𪖈𪖉𪖊𪖋𪖌𪖍𪖎𪖏𫜢𫜣𬹭𬹮",
 "鲜": "癣藓𫏨",
 "攣": "癴䖂𧖘",
 "臠": "癵𡆝",
 "癶": "癷癸癹登𠆋𠏪𠽟𠽹𡅓𡕉𢅃𢆇𢰰𢰱𢲇𢲉𢲕𢳰𣈩𣩶𣻬𤍝𤼥𤼦𤼧𤼨𤼩𤼪𤼫𤼬𤼭𤼮𤼯𤼰𤼱𤼲𤼴𤼵𤼹𤼺𤼻𤼼𥲷𥴍𥼇𥼈𦥆𦫔𦱬𦷡𦷦𦽬𧦴𧬖𧬝𧶢𨫁𨶋",
 "𠦂": "皐臯𡼗𢿎𣊴𣽎𤅡𦟞𦺆",
 "皛": "皨藠㵿𤾪𫛘𬂗",
 "夃": "盈𬗅",
 "圤": "盐",
 "汙": "盓窏䨕䵦𡜡𥒀𧋂𬔿",
 "汎": "盕𡋋𣑃𫇼",
 "畎": "盢𣸋",
 "酓": "盦韽㜝㱃䨄䳺𣘞𣻦𥕼𧫧𨡳𬪓𬯖",
 "𢿐": "盭",
 "龵": "看𠛃𢀠𢩥𢸌𣓞𣔒𣷥𦙚𦰥𧟲𧟳𧟶𧩝𨓍𨞲𪮩",
 "迷": "瞇蒾謎谜醚㜆㴹𠺗𡗅𢞞𣉢𣗌𥷻𦟂𨕜𨶌𩄲𩔢𩺍𪋗𫂗𫆭𫆿𫡮",
 "訓": "瞓𣉤",
 "鼓": "瞽臌薣鼕鼖鼗鼘鼙鼚鼛鼜鼝鼞鼟䥢䵽䵾䵿䶀䶁𠿤𡽂𡽌𦗺𨆊𨭸𩰛𪇀𪔋𪔌𪔍𪔎𪔐𪔑𪔒𪔓𪔔𪔕𪔖𪔗𪔘𪔙𪔚𪔛𪔜𪔝𪔞𪔟𪔠𪔡𪔢𪔣𪔤𪔥𪔦𪔧𪔨𪔩𪔪𪔫𪔭𪔮𪔯𪔰𪔱𪔲𪔳𪔴𪔵𪔶𪔷𫔐鼖𫱺",
 "臱": "矏䡻䫵䰓𣞌𫸣𬪟",
 "闞": "矙㘚𣌙𦘑𧯘",
 "仝": "砼𠳥𢀰𢘐𥳸𥳹𪝓",
 "花": "硴蒊誮錵㬸㳸𠝐𠵅𤦙𤰏𩋖𫈪𫢮𬦷𬧧",
 "卤": "硵禼𠧟𠨄𠳱𢿑𫜊𫠗𫼵𬸵𬸶𬸷𬸸𬸹",
 "岢": "碋",
 "珀": "碧𤧥𧓮𫺠𬍾",
 "逆": "磀縌𠸺𡏤𦗄𦞮𩺝𪄧𫏮𫒼𬶪",
 "勘": "磡𦤯",
 "崙": "磮𠍓𠼩𡐇𡠱𢳳𢿗𣜱𣼍𦟹𧐩",
 "駁": "礟𫬇",
 "蒪": "礡䥬䪇𣝍𦡰𩏯𩼬",
 "賢": "礥臔藖鑦㘋䉯𡮷𡮺𢤞𢸒𤂐𪦬𫣴",
 "駮": "礮㘐",
 "⺭": "礼礽社礿祀祁祂祃祄祅祆祇祈祉祊祋祌祍祎祏祐祑祒祓祔祕祖祗祙祚祛祜祝神祠祤祥祦祧祩祪祫祬祮祯祰祱祳祴祵祶祷祸祹祺祻祼祽祾祿禂禃禄禅禆禇禈禉禊禋禌禍禎福禐禑禒禓禔禕禖禗禘禙禚禛禝禞禟禠禡禢禣禤禥禧禨禩禪禫禬禭禮禯禰禱禲禳禴禵禶禷視视𥘆𥘇𥘉𥘊𥘋𥘌𥘍𥘎𥘏𥘑𥘒𥘓𥘔𥘕𥘗𥘘𥘚𥘛𥘜𥘝𥘞𥘟𥘠𥘡𥘢𥘤𥘥𥘧𥘨𥘩𥘪𥘫𥘬𥘭𥘮𥘯𥘰𥘳𥘴𥘵𥘸𥘹𥘺𥘻𥘼𥙀𥙁𥙂𥙃𥙄𥙅𥙆𥙇𥙈𥙉𥙋𥙎𥙐𥙑𥙕𥙖𥙗𥙘𥙙𥙚𥙛𥙜𥙞𥙟𥙠𥙡𥙢𥙣𥙤𥙨𥙬𥙭𥙮𥙯𥙰𥙲𥙵𥙶𥙷𥙸𥙹𥙺𥙻𥙾𥙿𥚀𥚁𥚃𥚆𥚈𥚉𥚊𥚍𥚏𥚐𥚑𥚒𥚓𥚔𥚕𥚖𥚗𥚙𥚛𥚜𥚝𥚞𥚟𥚠𥚣𥚧𥚩𥚫𥚬𥚭𥚮𥚱𥚲𥚳𥚴𥚵𥚶𥚷𥚸𥚹𥚺𥚻𥚼𥚽𥚿𥛀𥛂𥛃𥛄𥛅𥛆𥛇𥛋𥛌𥛍𥛏𥛐𥛑𥛒𥛔𥛕𥛗𥛘𥛚𥛜𥛝𥛞𥛟𥛡𥛢𥛣𥛥𥛦𥛧𥛨𥛩𥛪𥛫𥛮𥛯𥛲𥛳𥛵𥛶𥛸𥛹𥛺𥛻𥛼𥛽𥛾𥛿𥜁𥜃𥜅𥜇𥜉𥜊𥜋𥜌𥜍𥜎𥜏𥜐𥜑𥜒𥜓𥜔𥜕𥜗𥜚𥜜𥜝𥜡𥜢𥜥𥜦𥜧𥜨𥜩𥜫𥜬𥜭𥜮𥜰𥜲𥜳𥜴𥜵𥜶𥜸𦵞𧌞",
 "⻢": "祃䯃䯄䯅𨰾𩧦𩧧𩧨𩧩𩧪𩧫𩧬𩧭𩧮𩧯𩧰𩧱𩧲𩧳𩧴𩧵𩧶𩧷𩧸𩧹𩧺𩧼𩧽𩧾𩧿𩨀𩨁𩨂𩨃𩨄𩨆𩨇𩨈𩨉𩨊𩨋𩨍𩨎𩨏𩨐",
 "御": "禦篽蓹䥏𣊗𬄧",
 "題": "禵𢖤𣠢𤄭",
 "類": "禷蘱𡔇𤄹𨰥𫔕",
 "⺣": "稥㷛㷱𠄂𠌎𠘑𠟛𡎀𢯁𢴒𢹶𣗇𣗮𣜑𣷇𣾎𣿱𣿶𤂏𤆔𤆖𤆗𤆛𤆨𤆪𤆫𤆬𤇍𤇏𤇐𤇓𤇕𤇗𤇘𤇸𤈀𤈂𤈅𤈉𤈌𤈿𤉂𤉄𤉉𤉋𤉠𤉿𤊁𤊅𤊌𤊑𤋈𤋌𤋐𤋒𤋕𤋞𤋣𤋤𤋥𤋦𤋧𤌝𤌞𤌩𤌲𤍋𤍟𤍠𤍥𤍫𤍰𤍱𤍳𤍹𤍻𤎹𤎿𤏁𤏂𤏅𤏊𤏤𤏩𤐂𤐍𤐸𤑏𤑜𤑰𤒉𤒋𤒏𤒵𤒸𥉬𥔕𥢾𥮿𥴏𦃾𦲓𦵅𦷆𦻛𦻹𧅐𧈘𧶨",
 "彧": "稶𠸹𢒰𢞿𣤁𧫊𨪎𪏞𪒃𫮓",
 "恵": "穂𨫍",
 "亀": "穐䆴䦰𠼓𤄡𦅥𦿷𩰘𪚲𪳥𫝰𫣒",
 "巧": "窍㚽㤍䛒䲾𢫚𤇤𥬤𥿣𧊌𨥿𨾢𩈎𩿸𫩟𫶱𬰗",
 "鸟": "窎茑莺鸠鸢鸣鸤鸥鸦鸨鸩鸪鸫鸬鸭鸮鸯鸰鸱鸲鸳鸵鸶鸷鸸鸹鸺鸻鸼鸽鸾鸿鹀鹁鹂鹃鹄鹅鹆鹇鹈鹉鹊鹋鹌鹍鹎鹏鹐鹑鹒鹔鹕鹖鹗鹘鹙鹚鹛鹜鹝鹞鹠鹡鹢鹣鹤鹥鹦鹧鹨鹪鹫鹬鹭鹮鹯鹱鹲鹳鹴㭤㶉𪉁𪉂𪉃𪉄𪉅𪉆𪉇𪉈𪉉𪉊𪉋𪉌𪉍𪉎𪉏𪉐𪉑𪉒𪉓𪉓𪉓𪉔𪉕𫁡𫕳𫛚𫛛𫛜𫛝𫛞𫛟𫛠𫛡𫛢𫛣𫛤𫛥𫛦𫛧𫛨𫛩𫛪𫛫𫛬𫛭𫛮𫛯𫛰𫛱𫛲𫛳𫛴𫛵𫛶𫛷𫛸𫛹𫛺𫛻𫛼𫛽𫛾𫛿𫜀𫜁𫜂𫜃𫜄𫜅𫜆𫠖𬆮𬘞𬡍𬷕𬷻𬷼𬷽𬷾𬷿𬸀𬸁𬸂𬸃𬸄𬸅𬸆𬸇𬸈𬸉𬸊𬸋𬸌𬸍𬸎𬸏𬸐𬸑𬸒𬸓𬸔𬸕𬸖𬸗𬸘𬸙𬸚𬸛𬸜𬸝𬸞𬸟𬸠𬸡𬸢𬸣𬸤𬸥𬸦𬸧𬸨𬸩𬸪𬸫𬸬𬸭𬸮𬸯𬸰𬸱",
 "洼": "窪䨟",
 "料": "窲𠺫𫃼𬝮",
 "聊": "窷㗦㟹𠖛𡪉𡼅𣘪𥕡𥲊𦺹",
 "欵": "窽𦹔𨶦𪶿𫥗𫫙𫽸",
 "款": "窾㯘䕀䥗䲌𡪡𢕫𢡜𢴪𣽟𫔋𫫬",
 "宜": "竩萓誼谊䣾𠐅𠒩𡩶𡬐𡬐𡬐𡹠𣈍𣦍𣨩𣶺𤦌𥺥𦈅𦖑𨌵𨛯𩈭𩓧𩤒𩸨𪘲𪢢𪣯𪬃𫦄𫳲𬁁𬆄𬓇𬗦𬺌",
 "𩰬": "竵",
 "⺮": "竺竻竼竽竾竿笀笁笂笃笄笅笆笇笈笉笊笋笌笍笎笏笐笑笒笓笔笕笖笗笘笙笚笛笜笝笞笟笠笡笢笣笤笥符笨笩笪笫第笭笮笯笰笱笲笳笴笵笶笷笸笹笺笻笼笽笾笿筀筁筂筃筄筅筆筇筈等筊筋筌筍筎筏筐筒筓答筕策筗筘筙筜筝筞筟筠筡筢筣筤筥筦筧筨筩筪筫筬筭筮筯筰筱筲筳筴筵筶筷筸筹筺筻筼筽签筿简箁箂箃箄箅箆箇箈箉箊箋箌箍箎箏箐箑箒箓箔箕箖算箘箙箚箛箜箝箞箟箠管箢箣箤箥箦箧箨箩箪箫箬箭箮箯箱箲箳箴箵箶箷箸箹箺箻箼箽箾箿節篁篂篃篅篆篇篈篊篋篌篍篎篏篐篑篒篓篔篕篖篗篘篙篚篛篜篝篞篟篠篡篢篣篤篥篦篧篨篩篪篬篭篮篯篰篱篲篳篴篵篶篷篸篹篺篻篼篽篾篿簀簁簂簃簄簅簆簇簈簉簊簋簌簍簎簏簐簑簒簓簔簕簖簗簘簙簚簛簜簞簟簠簡簢簣簤簥簦簧簨簩簪簫簬簮簯簰簱簲簳簴簵簶簷簸簹簺簻簼簽簾簿籀籁籂籃籄籅籆籇籈籉籊籋籌籍籎籏籐籑籒籓籔籕籖籗籘籙籚籛籜籝籞籟籠籡籢籣籤籥籦籧籨籩籪籫籬籭籮籯籰籱籲纂㔐㩶䇗䇘䇙䇚䇛䇜䇝䇞䇟䇠䇡䇢䇣䇤䇥䇦䇧䇨䇩䇪䇫䇬䇭䇮䇯䇰䇱䇲䇳䇴䇵䇶䇷䇸䇹䇺䇻䇼䇽䇾䇿䈀䈁䈂䈃䈄䈅䈆䈇䈈䈉䈊䈋䈌䈍䈎䈏䈐䈑䈒䈓䈔䈕䈖䈗䈘䈙䈚䈛䈜䈝䈞䈟䈠䈡䈢䈣䈤䈥䈦䈧䈨䈩䈪䈫䈬䈭䈮䈯䈰䈱䈲䈳䈴䈵䈶䈷䈸䈹䈺䈻䈼䈽䈾䈿䉀䉁䉂䉃䉄䉅䉆䉇䉈䉉䉊䉋䉌䉍䉎䉏䉐䉑䉒䉓䉔䉕䉖䉗䉘䉙䉚䉛䉜䉝䉞䉟䉠䉡䉢䉣䉤䉥䉦䉧䉨䉩䉪䉫䉬䉭䉮䉯䉰䉱䉲䉳䉴䉵䉶䉷䉸䉹䵵𠎚𠟬𠤄𠺑𡀹𡅨𡆅𡢒𡫬𢅵𢝹𢤉𢱶𢲶𢲺𢲿𢳓𢶌𢺮𣄓𣙖𣙨𣛈𣛖𣛗𣜤𣝎𣞬𣞮𣞯𣟣𣠊𣠘𣠱𣡓𣡔𣰖𣵸𣺱𤄑𤄒𤅃𤅲𤐎𤨋𤨤𤪱𤴆𤿤𥋘𥍒𥣚𥨼𥩁𥩅𥫘𥫙𥫚𥫛𥫜𥫝𥫞𥫟𥫠𥫡𥫢𥫣𥫤𥫥𥫦𥫨𥫩𥫫𥫭𥫯𥫰𥫱𥫲𥫳𥫴𥫵𥫶𥫷𥫸𥫹𥫺𥫻𥫼𥫽𥫿𥬀𥬃𥬄𥬅𥬆𥬇𥬈𥬉𥬊𥬋𥬌𥬍𥬎𥬏𥬐𥬑𥬒𥬓𥬔𥬕𥬖𥬗𥬘𥬙𥬚𥬜𥬝𥬠𥬡𥬢𥬣𥬤𥬥𥬦𥬨𥬩𥬪𥬫𥬬𥬭𥬮𥬯𥬰𥬱𥬲𥬳𥬴𥬵𥬶𥬷𥬸𥬹𥬻𥬼𥬾𥬿𥭀𥭁𥭂𥭃𥭄𥭇𥭈𥭉𥭊𥭋𥭌𥭍𥭎𥭏𥭐𥭑𥭒𥭓𥭔𥭕𥭖𥭗𥭘𥭙𥭚𥭛𥭜𥭝𥭞𥭠𥭡𥭢𥭣𥭥𥭦𥭧𥭩𥭪𥭫𥭬𥭭𥭯𥭰𥭱𥭲𥭳𥭴𥭵𥭶𥭸𥭺𥭻𥭽𥭾𥭿𥮀𥮁𥮂𥮅𥮆𥮇𥮈𥮉𥮊𥮋𥮍𥮎𥮏𥮐𥮑𥮒𥮓𥮔𥮕𥮖𥮙𥮚𥮜𥮝𥮞𥮟𥮠𥮡𥮢𥮣𥮤𥮥𥮦𥮧𥮨𥮩𥮪𥮫𥮬𥮭𥮮𥮰𥮱𥮲𥮳𥮴𥮶𥮷𥮸𥮹𥮺𥮻𥮼𥮽𥮾𥯀𥯁𥯂𥯃𥯄𥯅𥯆𥯇𥯉𥯋𥯌𥯍𥯏𥯒𥯓𥯔𥯕𥯖𥯘𥯙𥯚𥯛𥯜𥯝𥯞𥯟𥯠𥯡𥯢𥯣𥯤𥯥𥯦𥯧𥯨𥯩𥯪𥯫𥯬𥯭𥯮𥯯𥯰𥯲𥯳𥯶𥯷𥯸𥯺𥯻𥯼𥯽𥯾𥯿𥰁𥰂𥰃𥰄𥰅𥰆𥰇𥰈𥰉𥰌𥰍𥰏𥰐𥰔𥰗𥰘𥰙𥰚𥰛𥰜𥰝𥰞𥰟𥰠𥰡𥰢𥰣𥰤𥰥𥰦𥰧𥰨𥰩𥰪𥰬𥰮𥰯𥰱𥰲𥰳𥰵𥰶𥰷𥰸𥰹𥰻𥰼𥰽𥰾𥱀𥱁𥱂𥱃𥱄𥱅𥱇𥱈𥱉𥱌𥱍𥱒𥱕𥱖𥱘𥱙𥱛𥱜𥱝𥱞𥱟𥱠𥱤𥱥𥱦𥱧𥱨𥱩𥱫𥱬𥱭𥱮𥱯𥱰𥱱𥱲𥱳𥱴𥱵𥱶𥱷𥱸𥱹𥱻𥱼𥱽𥱾𥱿𥲀𥲁𥲂𥲃𥲄𥲅𥲆𥲇𥲈𥲉𥲊𥲋𥲌𥲍𥲎𥲏𥲐𥲑𥲒𥲔𥲕𥲖𥲗𥲙𥲚𥲛𥲜𥲝𥲞𥲟𥲠𥲡𥲢𥲣𥲤𥲥𥲦𥲧𥲨𥲩𥲫𥲬𥲭𥲮𥲯𥲰𥲱𥲲𥲳𥲴𥲵𥲷𥲻𥲼𥲽𥲾𥲿𥳀𥳁𥳃𥳄𥳅𥳆𥳇𥳈𥳉𥳊𥳋𥳌𥳍𥳏𥳐𥳑𥳒𥳓𥳔𥳕𥳖𥳗𥳘𥳙𥳚𥳛𥳜𥳝𥳞𥳟𥳠𥳡𥳢𥳣𥳤𥳥𥳦𥳧𥳨𥳩𥳫𥳬𥳭𥳮𥳯𥳰𥳱𥳲𥳳𥳴𥳵𥳶𥳷𥳸𥳹𥳺𥳻𥳼𥳽𥳾𥳿𥴂𥴅𥴆𥴈𥴋𥴌𥴍𥴐𥴑𥴒𥴓𥴔𥴕𥴖𥴘𥴙𥴛𥴜𥴝𥴞𥴟𥴠𥴡𥴢𥴣𥴤𥴥𥴦𥴧𥴨𥴩𥴪𥴫𥴬𥴭𥴮𥴯𥴰𥴱𥴲𥴳𥴴𥴵𥴶𥴷𥴸𥴺𥴻𥴼𥴽𥴾𥴿𥵀𥵂𥵄𥵅𥵆𥵇𥵈𥵉𥵊𥵍𥵏𥵐𥵑𥵒𥵓𥵔𥵕𥵖𥵗𥵚𥵛𥵜𥵝𥵞𥵟𥵠𥵡𥵢𥵣𥵤𥵥𥵦𥵧𥵩𥵪𥵫𥵬𥵭𥵮𥵯𥵰𥵱𥵲𥵳𥵴𥵵𥵶𥵷𥵹𥵺𥵽𥵾𥵿𥶀𥶂𥶃𥶄𥶅𥶆𥶇𥶈𥶉𥶋𥶌𥶍𥶎𥶏𥶐𥶑𥶒𥶓𥶔𥶕𥶖𥶗𥶘𥶙𥶚𥶛𥶜𥶝𥶞𥶟𥶠𥶡𥶢𥶣𥶤𥶥𥶦𥶨𥶩𥶪𥶫𥶭𥶮𥶰𥶱𥶲𥶳𥶴𥶵𥶶𥶷𥶸𥶹𥶺𥶻𥶼𥶽𥶾𥶿𥷀𥷁𥷂𥷃𥷄𥷅𥷆𥷇𥷈𥷉𥷊𥷋𥷎𥷏𥷐𥷒𥷓𥷔𥷕𥷖𥷗𥷘𥷙𥷚𥷛𥷜𥷝𥷞𥷟𥷠𥷡𥷢𥷤𥷥𥷦𥷧𥷨𥷩𥷪𥷫𥷬𥷭𥷮𥷯𥷰𥷱𥷲𥷳𥷴𥷷𥷸𥷺𥷼𥷽𥷾𥷿𥸀𥸂𥸃𥸄𥸅𥸆𥸈𥸊𥸋𥸌𥸍𥸐𥸑𥸓𥸔𥸕𥸗𥸘𥸙𥸚𥸛𥸜𥸝𥸞𥸟𥸠𥸡𥸢𥸣𥽧𦪪𧛒𧜬𧟉𧟖𧫸𧭀𧲗𧾟𨆑𨆦𨉾𨎳𨏉𨖺𨗡𨘟𨘲𨙢𨟭𨤄𨪗𨰓𩁲𩁳𩍸𩪻𩽕𩽘",
 "氾": "笵范䀀𦨲𫈕",
 "⻌": "笾跹迈这迚进远违连迟迳选逊逦逧逹逺逻遖遗遤𠶆𠻉𡐿𡮗𣖗𤀱𤁠𤃜𤸕𥈚𥕈𥣦𥤍𥱃𥲽𥳠𥳤𥳪𦆣𦇭𦇶𦌻𦗻𦳯𦽙𧅊𧅣𧞘𧭋𨑍𨑎𨑏𨑐𨑒𨑓𨑕𨑖𨑗𨑜𨑟𨑠𨑣𨑥𨑦𨑧𨑩𨑪𨑫𨑬𨑭𨑮𨑵𨑶𨑷𨑸𨑹𨑺𨑻𨑽𨑾𨑿𨒀𨒁𨒃𨒄𨒅𨒆𨒇𨒈𨒉𨒊𨒋𨒌𨒍𨒏𨒐𨒑𨒒𨒙𨒚𨒛𨒜𨒝𨒞𨒟𨒡𨒢𨒤𨒦𨒧𨒨𨒩𨒪𨒫𨒬𨒭𨒯𨒰𨒱𨒳𨒴𨒵𨒶𨒸𨒹𨒺𨒻𨒽𨒾𨓀𨓁𨓂𨓆𨓇𨓈𨓉𨓊𨓋𨓌𨓍𨓎𨓏𨓐𨓗𨓘𨓙𨓚𨓛𨓜𨓟𨓠𨓡𨓣𨓥𨓦𨓧𨓨𨓩𨓫𨓬𨓰𨓱𨓴𨓵𨓷𨓹𨓺𨓽𨓾𨔀𨔁𨔂𨔃𨔄𨔅𨔆𨔇𨔈𨔉𨔊𨔋𨔌𨔍𨔖𨔗𨔘𨔙𨔚𨔝𨔞𨔟𨔠𨔡𨔢𨔣𨔤𨔥𨔦𨔧𨔨𨔪𨔬𨔭𨔮𨔯𨔱𨔲𨔳𨔴𨔵𨔶𨔷𨔸𨔹𨔺𨔻𨔾𨔿𨕀𨕌𨕍𨕎𨕏𨕐𨕑𨕒𨕓𨕔𨕕𨕖𨕗𨕘𨕙𨕚𨕝𨕞𨕡𨕢𨕣𨕤𨕥𨕦𨕧𨕨𨕩𨕫𨕷𨕸𨕹𨕺𨕻𨕾𨕿𨖀𨖂𨖃𨖄𨖅𨖇𨖈𨖉𨖊𨖋𨖌𨖍𨖎𨖏𨖐𨖑𨖒𨖚𨖛𨖜𨖝𨖞𨖟𨖠𨖡𨖢𨖣𨖥𨖦𨖨𨖩𨖫𨖬𨖭𨖮𨖱𨖳𨖴𨖵𨖶𨖷𨖸𨖹𨖺𨖻𨖼𨖽𨖾𨖿𨗀𨗁𨗄𨗅𨗆𨗇𨗈𨗊𨗐𨗑𨗒𨗓𨗖𨗗𨗘𨗙𨗛𨗞𨗟𨗠𨗡𨗤𨗥𨗦𨗫𨗯𨗰𨗲𨗵𨗺𨗽𨗾𨘁𨘂𨘃𨘄𨘆𨘇𨘉𨘊𨘌𨘒𨘔𨘕𨘖𨘗𨘙𨘚𨘛𨘜𨘟𨘡𨘤𨘪𨘫𨘬𨘭𨘯𨘰𨘱𨘲𨘳𨘴𨘵𨘷𨘸𨘹𨘺𨘻𨘼𨘾𨘿𨙀𨙂𨙄𨙅𨙋𨙍𨙏𨙒𨙓𨙔𨙗𨙙𨙜𨙟𨙠𨙡𨙢𨙤𨙥𨙦𩞱",
 "池": "筂𠲨𦈳𨦥𩶴𪢏𫇻",
 "肋": "筋荕",
 "仲": "筗茽㑖㣡㳞㴢𠉿",
 "扣": "筘𪧊𫅖",
 "笓": "筚𣖰",
 "均": "筠荺鋆",
 "把": "筢𠴙𥖖𥺕𨁩𫽶𬇫",
 "匣": "筪㭱𨧄𪡄",
 "助": "筯耡莇鋤锄𠢞𠢟𢃃𢚆𢭟𣵪𤞩𦷵𧱑𩶵𪊹𪜾𪳌𪾫𫦬𫦵𫯲𬀼𬂶",
 "快": "筷𢭴𧋿𪬭𫪎𬜴",
 "匤": "筺",
 "治": "箈菭𠶠𤦮𤷩𨵔",
 "拐": "箉",
 "泊": "箔萡𠥋𣓬𣹁𪧓𬃍",
 "㓣": "箚",
 "孤": "箛菰𡍢𡦶𢮩𣔞𦁣𦋆𦣮𧍆𨂗𨔌𩸰𪂮𪂲𪧄𪽵𫛈",
 "拑": "箝㟛",
 "刺": "箣莿䱨𠩪𡞸𤟰𤷫𥚲𥰍𦖝𧌐𧼕𪑟𪮁",
 "择": "箨萚",
 "洗": "箲鍌𢝚𢱓𪷮𬈞",
 "筑": "築篫𣽆𥯹𥰺𥳎",
 "洪": "篊葓鍙霟𢝳𥈰𨩅𪃡𪡥𬮍",
 "𣐝": "篐",
 "烝": "篜蒸𡏈𡞷𢾧𤸲𦞪𧪣𪳜",
 "涅": "篞𡮛𢟗𣻾𦄇𦶄",
 "倩": "篟蒨𣹥𫷝",
 "钱": "篯",
 "逐": "篴蓫鱁㯌䆳䮱𠦹𠽖𡐌𢄘𢴊𦟥𧏿𨄃𪿯𫑏𫸐𬩛",
 "捭": "篺",
 "兜": "篼蔸㨮𣘛𩮷",
 "戍": "篾荗蔑銊㤜㲓㳚䎉𠲌𡋊𢣳𣆒𣆭𤞉𥎕𥥰𥯣𥴸𦇪𧊥𧙠𧶂𨹇𨹒𩣊𪑆𬙱",
 "屛": "簈𤳫",
 "措": "簎𨝨",
 "軟": "簐㜛𢕢𣼴𤡋𥊡𨅄𨉻𫣑𫺸𬝵",
 "彫": "簓𦸔𧐸",
 "断": "簖𫏞",
 "博": "簙𠽢𣽡𫓆",
 "棋": "簯𦻊",
 "牌": "簰",
 "𣄃": "簱",
 "脾": "簲𪷗",
 "虡": "簴𨮗",
 "輅": "簵",
 "禄": "簶𪤤𬓗",
 "𤿺": "簸",
 "搆": "簼",
 "溥": "簿薄𩅿",
 "飾": "籂",
 "甄": "籈薽𧞙",
 "耤": "籍藉䣢𤁏𨆮",
 "旗": "籏𦻬𪇥𪰃𫰁",
 "滕": "籐藤𡂾𤻴",
 "潘": "籓藩𤄤",
 "榴": "籕",
 "縢": "籘䕨𤂵𤼆",
 "録": "籙",
 "錢": "籛𥃒𧂂𧔢𨪑𪈇𪩞𪷻𬬌",
 "擇": "籜蘀",
 "禦": "籞蘌𨯣",
 "撿": "籡",
 "鍾": "籦𡓯𥗦𦇮𬬐",
 "遽": "籧蘧",
 "歛": "籨蘝㶑𡄥𢌃𢹦𣌋𤒡𤼏𨰇𪩪",
 "邊": "籩𠑟𤄺𤓋𥤓𨇱𩽲𪢥",
 "斷": "籪𨇰𩠹𩪽",
 "靃": "籱𠠰𧆑",
 "龥": "籲",
 "巜": "粼𤏞𤰕",
 "莊": "糚𣼥𨫲𫱡",
 "𦓔": "糥䫱䰭𪋣𪝥",
 "量": "糧𡑆𣊼𣛀𤎲𩞯𪋥𪬨𪷑𪾞𫓉𫾄𬉨𬎎𬓾𬴼",
 "𣫞": "糳𪎇𪎲",
 "籴": "糴䨀",
 "粜": "糶",
 "扎": "紥𠯩𣲞𥾱𧉒",
 "札": "紮蚻㳐𡥑𢫄𤵦𦮲𧉹𨥼𩿤𫛠𫴺",
 "㓞": "絜蛪觢齧㗉㛃㸷㼤䂮䛚𡊷𡬨𦄜𦚨𧑨𧳳𪀡𫜩𫩬",
 "𠑽": "綂",
 "邵": "綤𪹃𬥃",
 "者": "緖𡪄奢屠暑蝫",
 "致": "緻㨖㮹㴛䞃䦯𤸓𥠽𦟔𦥐𦳙𧛢𧩼𨂤𩋩𩹈𫍶𫔵",
 "怠": "緿䈚𠕡𠷂𢰾𤸊𧜐𪶩𫛋𫺭𬓐",
 "従": "縦𧱷𫞋",
 "強": "繈䥒𠼢𢠌𥨀𩌾𪻈𫋙",
 "煞": "繺㬠𠿼𢅑𢎓𢨓𢶞𥋧𨭝",
 "蓬": "纄鑝𡂫𡓄𢸚𤂧𤑫𧓶𧴟𨏕",
 "頝": "纐𫹨",
 "戀": "纞㜻𡆕𡈻𢦋𤼣𦣛𧆎𨈌𬬦",
 "充": "统铳㓍㧤㳘䘪䟲𠒨𠒩𠡜𡊿𡎭𤞀𥅻𥒝𥬱𦚳𩩇𪁇𪎽𪗯𪞅𪡁𪽒𫸊𬓦𬪲",
 "㢆": "缠",
 "曇": "罎𤃅𤮦𦉡𩪺𪓂𪩿𪴘",
 "⺲": "罗罘罚罛罜罝罞罟罠罡罢罣罤罥罦罧罨罩罪罫罬罭置罯罱署罳罴罵罶罷罸罹罺罻罼罾罿羁羂羃羄羅羆羇羈羉䍐䍒䍓䍔䍕䍖䍗䍘䍙䍚䍛䍜䍝䍟䍠䍡䍢䍣䍤䍥䍦𦉬𦉱𦉴𦉵𦉶𦉷𦉹𦉼𦉾𦊁𦊂𦊃𦊄𦊆𦊈𦊊𦊎𦊏𦊐𦊑𦊒𦊔𦊚𦊛𦊜𦊢𦊤𦊥𦊫𦊯𦊲𦊳𦊴𦊵𦊷𦊸𦊺𦊼𦊽𦊾𦋁𦋂𦋅𦋆𦋈𦋉𦋊𦋋𦋎𦋏𦋒𦋓𦋝𦋞𦋠𦋡𦋣𦋤𦋦𦋨𦋪𦋯𦋰𦋲𦋳𦋴𦋶𦋷𦋸𦋹𦋹𦋹𦋺𦋽𦋾𦋿𦌀𦌁𦌂𦌃𦌄𦌅𦌇𦌈𦌉𦌊𦌋𦌔𦌕𦌖𦌗𦌙𦌚𦌠𦌡𦌢𦌥𦌦𦌧𦌩𦌪𦌫𦌬𦌭𦌮𦌰𦌵𦌶𦌷𦌸𦌻𦌽𦌾𦌿𦍀𦍁𦍂𦍄𦍆𦍇𦍈𦚋",
 "惟": "罹𣻰𦌐𪠕",
 "网": "羀蛧䋞䍑䍞䒽䰣𡶬𥋻𦂴𦉯𦉽𦊍𦊘𦊝𦊞𦊟𦊠𦊡𦊩𦊪𦊮𦊶𦋄𦋑𦋕𦋖𦋗𦋘𦋙𦋚𦋛𦋜𦋟𦋧𦋫𦋬𦋭𦋮𦋻𦋼𦌏𦌐𦌑𦌜𦌞𦌨𦌱𦌲𦌴𦍃𦍊𧧜𧧧𧵽𧷵𨋹𫅆𦋙𬙡",
 "絹": "羂㯞𡫂",
 "綽": "羄𡁇𥵤",
 "熊": "羆𤻩𦌲𧀛𧞞𨮳𫔒",
 "䩭": "羇",
 "䩻": "羈𬰕",
 "⺼": "羘肊肋肌肍肐肑肒肔肕肗肘肚肛肜肝肞肟股肢肣肤肥肧肨肪肫肬肭肮肰肱肳肵肶肷肸肹肺肼肽肿胀胁胂胅胆胇胈胉胊胋胍胎胏胑胒胓胕胖胗胘胙胚胛胜胝胞胟胠胢胣胦胧胨胩胪胫胭胯胰胱胲胳胴胵胶胸胹胺胻胼胿脁脂脃脄脆脇脈脉脌脍脎脏脐脑脒脓脕脖脗脘脙脚脛脜脝脞脟脠脡脢脤脥脦脨脪脫脬脭脮脯脰脱脲脳脴脵脶脷脸脹脺脻脼脽脾脿腀腂腃腄腅腆腇腈腉腊腋腌腍腏腑腒腓腔腕腖腗腘腙腚腛腜腝腞腟腠腡腢腣腤腥腧腨腩腪腫腬腭腮腯腰腱腲腳腴腵腶腷腸腹腺腻腼腽腾腿膀膁膃膄膅膆膇膈膉膊膌膍膎膑膒膔膕膖膗膘膙膛膜膝膞膟膠膡膢膣膤膦膨膩膪膬膭膮膯膰膱膲膳膴膵膶膷膹膻膼膽膾膿臁臃臄臅臆臇臈臉臊臌臍臎臏臐臑臒臓臔臕臗臘臙臚臛臜臞臟臢豚䏎䏏䏐䏒䏓䏔䏕䏖䏗䏘䏙䏚䏛䏜䏝䏞䏟䏠䏡䏢䏣䏤䏥䏦䏧䏨䏩䏪䏫䏬䏭䏮䏯䏰䏱䏲䏳䏴䏵䏶䏷䏸䏹䏺䏼䏽䏾䐀䐁䐂䐃䐅䐆䐇䐈䐉䐊䐋䐍䐎䐏䐐䐑䐒䐓䐔䐕䐖䐗䐘䐙䐚䐛䐜䐞䐟䐠䐢䐣䐤䐥䐦䐧䐩䐪䐫䐬䐭䐮䐯䐰䐱䐲䐳䐵䐶䐷䐸䐹䐺䐻䐼䐽䐾䐿䑀䑂䑃䑄䑅䑆䑇䑈䑉䑊䑋䑌䑍䑎䑏䤚𠹻𤅘𦘩𦘪𦘭𦘰𦘱𦘲𦘴𦘵𦘶𦘷𦘸𦘹𦘺𦙀𦙁𦙅𦙆𦙇𦙈𦙉𦙋𦙏𦙗𦙘𦙙𦙜𦙝𦙞𦙠𦙣𦙤𦙥𦙦𦙨𦙫𦙬𦙭𦙮𦙰𦙱𦙳𦙴𦙶𦙷𦙸𦙹𦙻𦙾𦚈𦚊𦚐𦚔𦚕𦚖𦚗𦚚𦚝𦚞𦚟𦚠𦚡𦚣𦚤𦚥𦚦𦚧𦚩𦚪𦚫𦚬𦚭𦚰𦚱𦚸𦚹𦚻𦚼𦚽𦚿𦛀𦛁𦛈𦛉𦛊𦛋𦛌𦛍𦛎𦛏𦛐𦛒𦛓𦛕𦛖𦛘𦛙𦛚𦛛𦛜𦛞𦛟𦛠𦛡𦛢𦛣𦛤𦛥𦛦𦛧𦛨𦛰𦛱𦛲𦛳𦛴𦛵𦛸𦛺𦛻𦛼𦛽𦛾𦛿𦜀𦜂𦜃𦜄𦜅𦜆𦜇𦜈𦜉𦜋𦜌𦜍𦜎𦜏𦜐𦜒𦜓𦜔𦜕𦜖𦜘𦜙𦜛𦜝𦜞𦜪𦜬𦜭𦜮𦜯𦜰𦜱𦜲𦜳𦜳𦜳𦜵𦜶𦜷𦜸𦜺𦜻𦝀𦝁𦝂𦝃𦝄𦝅𦝇𦝈𦝊𦝋𦝌𦝐𦝑𦝒𦝓𦝔𦝖𦝗𦝛𦝜𦝞𦝟𦝠𦝡𦝢𦝣𦝤𦝥𦝧𦝨𦝩𦝪𦝬𦝮𦝯𦝰𦝱𦝳𦝴𦝵𦝶𦝷𦝹𦞁𦞂𦞃𦞇𦞈𦞌𦞎𦞑𦞒𦞓𦞔𦞖𦞗𦞙𦞚𦞛𦞜𦞝𦞞𦞟𦞠𦞡𦞢𦞣𦞤𦞥𦞦𦞧𦞪𦞬𦞭𦞮𦞯𦞰𦞲𦞳𦞴𦞽𦞿𦟀𦟂𦟃𦟄𦟅𦟇𦟈𦟉𦟊𦟋𦟌𦟍𦟏𦟐𦟑𦟒𦟓𦟔𦟕𦟘𦟙𦟛𦟜𦟞𦟟𦟠𦟢𦟣𦟤𦟥𦟧𦟨𦟮𦟯𦟰𦟱𦟳𦟵𦟶𦟷𦟸𦟹𦟺𦟼𦟽𦟿𦠀𦠄𦠅𦠆𦠇𦠉𦠊𦠌𦠍𦠎𦠏𦠐𦠑𦠔𦠖𦠛𦠜𦠝𦠞𦠟𦠠𦠢𦠣𦠤𦠥𦠦𦠧𦠨𦠭𦠯𦠱𦠲𦠳𦠴𦠵𦠸𦠻𦠽𦠾𦠿𦡁𦡂𦡃𦡄𦡅𦡆𦡊𦡕𦡖𦡙𦡞𦡡𦡢𦡣𦡤𦡥𦡦𦡧𦡪𦡫𦡬𦡮𦡯𦡰𦡱𦡲𦡳𦡴𦡵𦡶𦡷𦡸𦡻𦡽𦢅𦢈𦢉𦢊𦢋𦢌𦢍𦢎𦢏𦢐𦢑𦢒𦢓𦢙𦢚𦢛𦢜𦢝𦢞𦢟𦢠𦢣𦢥𦢦𦢪𦢭𦢮𦢯𦢲𦢵𦢶𦢷𦢸𦢹𦢺𦢾𦢿𦣀𦣁𦣂𦣃𦣇𦣈𦣋𦣍𦣑𦣒𦣔𦣕𦣗𦣘𦣙𦣛𦣜𦰢𦱔𦳎𦼶𧂿𧌌𧖺𧡯𧦗𧱔𧲞𨏩𨭞𩼊𣫺",
 "羴": "羼",
 "双": "聂轰㧐𠓰𢙎𢸶𣏪𣤕𤘩𦄥𦉳𨑱𨥖𨳦𩢂𩿏𪥫𫁷𫌵𫡱𫨹𫩅𫹷",
 "聑": "聶𩯻𫯺𬋇",
 "𠯳": "脗",
 "却": "脚踋㾡䖼𠨙𠨦𠳞𢭙𣒗𨌞𪫸",
 "忒": "脦鋱铽𠈸𠴆𬧜",
 "尿": "脲㳮𠃮𡷷𢽜𢽷𣭼𨐛𨓪",
 "畁": "腗",
 "卻": "腳㮝𠊬𠶸𢔱𢜭𤷽𦃁𧍕𨍖",
 "贰": "腻𬃘",
 "旅": "膐𣖺𥰠𩥆𬐰𬫽𬮐",
 "啻": "膪𡡿𢕮𢴨𢿪𣚌𣾪𦔝𧝐𧬍𨅙𨗁𨬙𪆡𪍼𪯙",
 "萃": "膵㯜㵏𩦗",
 "蔵": "臓𨊙",
 "寬": "臗鑧髖𢸎𣟂𦆼𦒨",
 "戕": "臧𡸤𫻶",
 "雈": "舊",
 "舎": "舗捨",
 "𠘧": "船鉛铅𠈡",
 "筄": "艞",
 "乡": "芗蚃郷鄉鄊鄕飨䔨𢛭𣍑𤔕𥃍𥖡𦭚𦼅𧒱𨙵𨚃𨜕𨝅𨷿𨿄𩞠𬁠",
 "仍": "芿㗡㺱𠯹𧥰𪝁𪽩𫢖𫰕",
 "刈": "苅",
 "匹": "苉鴄䏘𠯔𠯕𡛘𣛍𣬮𥐵𫘇𫨹",
 "𢎨": "苐𢘘𢚫𥁜𩹋",
 "仙": "苮𣳈𥬍𬏣",
 "仕": "茌𠱊𢫟𤇧𤵴𥿥𦙰𦚘𨀋𨦁𪀆𪐾𪧸𫎔𫪣",
 "⻀": "茍蘷雈𠐪𠐭𠑢𠟗𡫽𢋒𢐖𢐯𢟡𢳌𢴯𣀺𣂼𣋭𣝱𣟝𤖁𤶪𥤙𦍮𦤄𦲘𦹋𧃼𧢯𨙕",
 "刕": "茘𠦢𣴀𣹣𣻭𦚰",
 "印": "茚鮣䲟𠈟𠲃𡊶𢂗𢬃𣦫𤥋𨒦𩊕𩬵𫀳𬏥𬗉",
 "字": "茡𡦂𡦂𡦙𡨸𡶻𣉬𣑑𥊐𧧕𪜸𪧚𪰿𫃣𫇊𫒛𫡉𫳘𫿰𬇤",
 "汒": "茫𥭎𨴤𬮧",
 "江": "茳鴻鸿㳩㴂䑭𡷍𢏠𢬥𣑴𣽝𤭊𥆀𥬮𨀹𪀤𬇧",
 "茾": "荆",
 "收": "荍𠈅𠲠𡱙𤙘𥅪𦀏𩷊𪯊𫆃",
 "巟": "荒㡆㤺䀮𡜋𡧽𣆖𩶶𪀞",
 "壮": "荘装",
 "芘": "荜𣓋𦰙",
 "宇": "荢䢓𠱶𡷎𧙶𪻝𪾩𫁢𫢝𬐞𬗒𬹷",
 "孙": "荪逊",
 "阴": "荫𫷮",
 "买": "荬㱩𪡃𫰨",
 "红": "荭",
 "纣": "荮𪜺𬰤",
 "杜": "荰𠴗𢭰𥮊𧹥𨁥𨧀𪳌𬇩𬭊",
 "扶": "荴𢏪𢶄𥆭𨁜𨦶𫐧",
 "吟": "荶𠤾𡷧𣵴𥆽𦛽𩒻𪑑𫕖",
 "別": "莂㭭𡋾𡷘𥒻𥞲𥦂𧧸𧭀𨴾𩷤𪿍𫊽",
 "没": "莈𧋶𪶟𪷔𬇮𬉐𬏱",
 "抄": "莏𣴷",
 "沈": "莐霃𠴥𢭽𤉠𥁭𧖶𨧁𬈓",
 "杏": "莕𠉉𡜺𢎋𣑅𣑾𣒙𥆪𨛢𨧃𨿟𩭖𪴋𪵾𫘢",
 "忘": "莣𠨛𡷢𢚚𪬳𫒥𫺴",
 "狃": "莥",
 "沐": "莯霂𣙄𣶁",
 "时": "莳鲥𣠈𪶄𫪅𬌠𬖞",
 "U": "莵菫逺",
 "+": "莵菫逺",
 "犾": "获",
 "犹": "莸",
 "纯": "莼",
 "姑": "菇㑬㣨㴌𠵎𢯐𦁿𧍏𨐞𪂯𪦭𫱬",
 "味": "菋𠽘",
 "河": "菏𪷹",
 "抽": "菗𫽹",
 "拔": "菝",
 "抱": "菢𢛺𥮼𪾑",
 "近": "菦𠶌𡹢𣔅𣷯𥇐𨉘𨓢𫋅𫙧",
 "宕": "菪趤𡇵𥒳𨧩𪬅",
 "沼": "菬䈃𠶕𦻟𧍌",
 "沮": "菹䈌𪂔𦼬𬙦",
 "芚": "萅𦸬𧅪𨅱𩯐",
 "泙": "萍𬕘",
 "招": "萔𠶅𢜌𪶎𪸳",
 "枕": "萙𠶍𡹟",
 "帖": "萜㥈",
 "秇": "萟",
 "洛": "落𠸪𥯛𪃕𪮔𪳅𫃶",
 "活": "萿闊阔𡎒𡞠𤁪𨨱𬈾",
 "括": "葀𠸓𣕔𣸅",
 "姜": "葁𠷩𡟜𡟿𣕞𤚖𤛜𤟲𥔣𦍯𦎛𨃇𨜰𨩍𩹖",
 "勉": "葂㛯𠅦𠣉𡩄𤸩𦂔𨍠𨩯𩋭𫁕",
 "昨": "葃𥯭𫉧",
 "胙": "葄𪱢",
 "俎": "葅𫦆𫦡",
 "枲": "葈㷘䈢䢄𠢺𢻙𣔗𣕘𣗺𣗻𣜨𣝜𣞟𣟼𣟽𣠎𣠏𦂅𦈒𦥅𦥐𨐠𨽿",
 "胊": "葋",
 "姦": "葌𡟗𡢹𩤦𫳣",
 "紅": "葒𠸣𢞃𣖘𬕡𬗻",
 "勁": "葝𤠃𥯙",
 "匍": "葡",
 "紂": "葤䈙𦋝𩋰",
 "皅": "葩𥰗",
 "㓩": "葪",
 "俊": "葰䈗𪡟𪶠",
 "怨": "葾㤪𢱽𥧉𧩷𪝔",
 "述": "蒁鶐𣉐𨩔",
 "冠": "蒄𠖡𥔒𨩶𪑪𫱌𬃧𬏸",
 "将": "蒋螀𫦋𫽣𬌒𬧀",
 "派": "蒎鎃𠸁𤋻𥯠𦞓𩄂𪡤𫮏𬧁",
 "純": "蒓",
 "浪": "蒗𠺘𡻔𥶞𨃹𨶗𪤊𫫐",
 "挐": "蒘𢞙𣖹𣹤𥰪",
 "缺": "蒛𧎯𨶏𨸊",
 "祘": "蒜𬄷",
 "涖": "蒞",
 "竘": "蒟䈮",
 "徐": "蒣𡲰𣉹𣻄𪹘𬁊",
 "茂": "蒧蔵𢰝𣕚𥠏𩹛𬫯",
 "租": "蒩",
 "冤": "蒬𡟰𣹠𩌑𪑲𪡶",
 "萠": "蒯𬄡",
 "捕": "蒱𥱴𧏳𨕝𬙤",
 "浦": "蒲㜑䈬𡏋𣿀𥂈𧁔𧗉𪬬",
 "納": "蒳㨥䈫𠖘𩄵𩺈𪵠𫒾𬧮",
 "紛": "蒶𫄐",
 "席": "蓆褯𠻊𢅺𥔷𫏛𬋗",
 "夎": "蓌",
 "倍": "蓓𡏧𡻓𣻃𦟋𪬽𫂕𫏚𫑒𬯑𬱎",
 "徒": "蓗𠻀𢲛𣘊𣺺𤸭𥱰𦪂𦹼𨃝𪼊",
 "修": "蓚鎀㹋𡟞𡪇𢟅𣘀𣺫𤪱𥈌𥱤𦤜𫙯𬗲𬠡",
 "敇": "蓛𠻳𢠂𢲆",
 "配": "蓜𢲭𦟊𪡭𪶪𫅉𫑸𫱓𬀎",
 "淩": "蓤蔆",
 "庵": "蓭𧫥𪩑𫫡",
 "洴": "蓱𥰅𧁕",
 "捷": "蓵𠽕𧐥",
 "問": "蔄𠍒𠼋𡫡𢤘𢴌𣙎𣼶𥏿𥐔𦄞𧃪𧢈𫍋",
 "焊": "蔊",
 "淑": "蔋𫳺",
 "設": "蔎",
 "焄": "蔒",
 "匐": "蔔𨄑𫕑",
 "眯": "蔝",
 "終": "蔠䈺𡈡𧈆",
 "圈": "蔨𣙢𥱽𬈨",
 "疏": "蔬𦠦",
 "𡨥": "蔲𪄺",
 "清": "蔳𠑴𢴆𤄯𪸃𬈚𬈴",
 "𨸋": "蔺",
 "宼": "蔻𪄓",
 "谒": "蔼霭",
 "湡": "蕅",
 "渝": "蕍",
 "報": "蕔𠾷𢵨𤺴𥴆𨷂𪨡𬋳",
 "猶": "蕕𥴕𫻆",
 "稊": "蕛",
 "悲": "蕜𠎩𠖤𠾦𢴾𨅥𪪈𪺵𫅰𫇟𫨯𫨰𫮦𫷞𬈺𬲊",
 "絮": "蕠㵖",
 "甤": "蕤𠐭",
 "雅": "蕥𪷐",
 "温": "蕰𡀦",
 "缊": "蕴",
 "飧": "蕵",
 "遐": "蕸",
 "肆": "蕼",
 "煖": "蕿",
 "溫": "薀𨷇",
 "滈": "薃",
 "媷": "薅",
 "亂": "薍𠏢𥂽",
 "稜": "薐",
 "𣹰": "薓",
 "園": "薗𡈤𡑰𬕶𬬎",
 "雉": "薙䉜𢶾𣜫𪨅𫡍",
 "飱": "薞",
 "煩": "薠𢶃𨆌𨆜𪹺𫬆",
 "𩐁": "薤",
 "隡": "薩",
 "𤋱": "薫𣊳",
 "稗": "薭",
 "遠": "薳闧𤾮",
 "貍": "薶霾㦟𩯬𬥋",
 "漂": "薸㵱𡁼𨆺𨮶",
 "漅": "薻",
 "塵": "薼𨮞",
 "聚": "藂鄹驟骤㔌㵵䝒䠫𡒍𡽨𣀒𥣙𥵫𧓏𨞮𨽁𩍧𩼦𪿼𬬒",
 "歊": "藃",
 "罰": "藅",
 "搴": "藆𠏯𢷘",
 "睽": "藈",
 "稨": "藊",
 "臧": "藏贓㵴𡁧𡒉𡒤𡒥𡽴𡾻𢨑𩯩𩽮",
 "貌": "藐邈㦝𢷕𣞠",
 "䅥": "藒",
 "耦": "藕𡫢𥨱𬕽",
 "遬": "藗",
 "毅": "藙䉨𫻗",
 "蓺": "藝𣞕𬡵",
 "磊": "藞㔏㩡㰁𠁻𠐞𡂳𡓃𡕎𡤟𡾏𡿈𡿛𢋧𢤡𤂬𤑭𤢿𤻳𥗐𥗤𥫌𥶲𦇒𧖌𨇒𨊚𨏒𨟥𩟬𩧍𩯹𩽊𪒽𪤬𪿸𫡎𫴷𬅓",
 "緩": "藧𥶍",
 "潭": "藫䨵𫾘",
 "窮": "藭𠤊𡃕𡾈𤢶𧔚𧸺",
 "樵": "藮𡃼",
 "慰": "藯",
 "瘣": "藱",
 "樞": "藲䉩",
 "⺯": "藴蘰𠙳𠙳𠷵𡃈𡅀𡅀𡅍𡓩𡓩𢯜𣗭𣠋𣠋𤂁𤃁𥜄𥫅𥱦𥵮𥶀𥾅𥾆𥾇𥾉𥾊𥾋𥾌𥾍𥾎𥾏𥾐𥾓𥾔𥾕𥾗𥾘𥾙𥾚𥾛𥾝𥾞𥾠𥾡𥾢𥾣𥾤𥾦𥾧𥾨𥾪𥾬𥾮𥾯𥾰𥾱𥾲𥾳𥾴𥾵𥾶𥾷𥾸𥾹𥾺𥾼𥾽𥾾𥾿𥿀𥿁𥿂𥿆𥿇𥿈𥿉𥿊𥿋𥿌𥿍𥿎𥿐𥿑𥿒𥿓𥿕𥿖𥿗𥿘𥿛𥿜𥿡𥿢𥿣𥿤𥿥𥿦𥿧𥿨𥿪𥿫𥿬𥿮𥿯𥿰𥿱𥿲𥿳𥿴𥿵𥿶𥿷𥿸𥿹𥿾𦹴𦻖𦿿𧄉𧑿𧑿𨰙𨰙𩯪",
 "褒": "藵",
 "謁": "藹靄",
 "閵": "藺躙䉮𡃦𤂶𨏦𨶄",
 "澡": "藻𤒕",
 "橤": "蘂㰑𡾚",
 "衡": "蘅𤫄𫂬𫶣𬋛",
 "颓": "蘈𬉏",
 "縕": "蘊",
 "⻗": "蘎雩雪雫雬雭雮雯雰雱雲雳雴雵零雷雸雹雺雼雽雾雿需霁霂霃霄霅霆震霈霉霊霋霌霍霎霏霐霑霓霔霖霗霘霙霚霛霜霝霞霟霠霡霢霣霤霥霦霧霨霩霪霫霬霭霮霯霰霱露霳霵霶霷霹霺霻霽霾霿靀靁靂靃靄靇靊靋靌靍靎靏䨋䨌䨍䨎䨏䨐䨑䨒䨓䨔䨕䨖䨗䨘䨙䨚䨛䨜䨝䨞䨟䨠䨡䨢䨣䨤䨥䨦䨧䨨䨩䨪䨫䨬䨮䨯䨰䨱䨳䨴䨵䨶䨷䨸䨹䬠𢤓𢷛𢸲𣼻𣾱𣾳𤀍𤅉𤅒𤣋𤨹𤮷𥽛𥽮𨏨𨖛𨖝𨗒𨙤𨟘𨣬𩁷𩁹𩁺𩁻𩂀𩂁𩂂𩂃𩂄𩂅𩂆𩂇𩂈𩂉𩂍𩂎𩂏𩂐𩂑𩂒𩂓𩂔𩂕𩂖𩂗𩂘𩂙𩂝𩂞𩂟𩂠𩂡𩂢𩂣𩂤𩂥𩂦𩂨𩂩𩂪𩂫𩂳𩂴𩂵𩂶𩂷𩂸𩂹𩂺𩂻𩂼𩂽𩂿𩃀𩃂𩃃𩃄𩃋𩃍𩃎𩃐𩃑𩃒𩃔𩃕𩃖𩃗𩃚𩃛𩃜𩃝𩃟𩃡𩃬𩃭𩃮𩃰𩃱𩃳𩃴𩃵𩃹𩃺𩃻𩃼𩃾𩃿𩄀𩄂𩄄𩄅𩄆𩄇𩄈𩄉𩄊𩄋𩄌𩄎𩄏𩄑𩄒𩄓𩄔𩄕𩄖𩄗𩄘𩄙𩄛𩄜𩄞𩄟𩄡𩄢𩄣𩄤𩄥𩄦𩄧𩄪𩄫𩄬𩄭𩄮𩄰𩄱𩄲𩄴𩄵𩄷𩄸𩄺𩄻𩄼𩄽𩄾𩄿𩅀𩅁𩅂𩅃𩅄𩅅𩅆𩅇𩅈𩅉𩅌𩅍𩅏𩅐𩅑𩅒𩅓𩅔𩅕𩅖𩅗𩅘𩅙𩅚𩅛𩅜𩅟𩅠𩅡𩅢𩅤𩅥𩅦𩅧𩅨𩅩𩅪𩅮𩅯𩅰𩅱𩅲𩅳𩅴𩅵𩅶𩅸𩅹𩅺𩅻𩅼𩅽𩅿𩆀𩆁𩆃𩆄𩆅𩆆𩆇𩆈𩆉𩆋𩆌𩆍𩆎𩆏𩆐𩆑𩆓𩆔𩆗𩆘𩆙𩆝𩆠𩆡𩆣𩆤𩆥𩆧𩆩𩆪𩆫𩆬𩆭𩆮𩆯𩆰𩆱𩆲𩆴𩆵𩆶𩆷𩆸𩆹𩆺𩆽𩆾𩆿𩇀𩇁𩇅𩇇𩇈𩇊𩇋𩇌𩇍𩇏𩇐𩇑𩇒𩇓𩳧",
 "頴": "蘏𪷿",
 "諼": "蘐",
 "穐": "蘒",
 "穎": "蘔𢹃𣟤𤃡",
 "縫": "蘕",
 "檗": "蘗𢹐",
 "翳": "蘙蠮𡤖",
 "牆": "蘠",
 "黈": "蘣𪏜",
 "𤾡": "蘤",
 "濫": "蘫𠑈𪸄",
 "盪": "蘯",
 "黊": "蘳",
 "職": "蘵𤼕",
 "醮": "蘸𡆖",
 "懷": "蘹𡅬",
 "繫": "蘻",
 "櫐": "蘽",
 "壞": "蘾",
 "韭": "虀韮韯韱齏齑㔐䪞䪟䪠䪡䪢䪣䪤䪥𠎷𠏪𠑠𠑯𠟜𠠃𠢾𠬘𡒁𡡰𢌁𢌐𢨁𢶍𢻨𣜂𣞯𣩶𤅈𤑪𤢷𤫧𤾿𥷪𥷰𦠿𦢙𦼩𦿱𧅱𧆙𧕂𧞁𧬩𧾓𨆂𨏓𨣲𨯒𨷆𨽮𩆅𩎋𩐁𩐂𩐃𩐄𩐅𩐆𩐇𩐈𩐊𩐋𩐌𩐍𩐎𩐏𩐐𩐑𩐒𩐔𩐕𩐖𫂰𫓤𫡋𬕵𬝛",
 "露": "虂𤅟𤫢𥸐",
 "瀸": "虃",
 "騰": "虅𧈜𧖍",
 "嚻": "虈",
 "鷊": "虉",
 "釁": "虋",
 "蔽": "虌",
 "𧇃": "虨",
 "𡭴": "虩隙𡄼𡮱𬟮",
 "儵": "虪䨹𡤥",
 "劫": "蜐㤼䀷䂲𠄳𠲵𡝔𢬱𦀖𦛕𨦲𪁍𪘖𫄦𬐼",
 "甸": "蜔㭵䓒䡘𠡪𣵦𬗚𬨉",
 "版": "蝂𧌿",
 "芈": "蝆",
 "㡿": "蝷㴑𠊴𡍩",
 "㬰": "螤𣢧𣧴𥑷𦚤𧊠𨦢𩶳𪀙",
 "赦": "螫𠭷𢟻𢲳𣻪𥨅𧐭𫛿𬫁",
 "庳": "螷蠯㯅𢳋𦸣",
 "梨": "蟍鏫䔧𠼝𣗱𣙔𣞴𥊈𥲧𩦀𩻌𪅌",
 "貸": "蟘𧹋",
 "賊": "蠈鱡𣛸𣿐𦽒𧒿𨆎",
 "歇": "蠍㵣𠥜𠿒𡽙𢢚𢶆𤢔𦪬𧓃𧝽𪗀𬋏",
 "莾": "蠎",
 "薯": "蠴",
 "𢧵": "蠽㘍𪇲𪙻",
 "𢇍": "蠿躖𣃔𦇓",
 "皕": "衋㙽𢐤𤾩𫑖𫱯",
 "亍": "行鵆𠷢𠼫𣶹𤁰𤤾𤦷𥐡𥞟𥸰𦈥𧁠𧺗𨊫𨏎𨭶𨮣𨽇𩶷𪬓𫋭𫋮𫋯𫋰𫋱𫝿𫟘𫟙衠𬇪𬍐𬗃𬠽𬠾𬠿𬡀𬡁𬣀",
 "𩠐": "衟䭬𤎾",
 "尓": "袮䑐䟢",
 "库": "裤",
 "胞": "褜",
 "耿": "褧㷦𢞚𤓐𥉔𦃸𦵸𧀙𪳎",
 "𥄳": "褱𡎯𣣴𣯉𤸄𥉀𥊽𥎅𦑲𦑶𦵺𧃣𧥊𧪟𨙎𩀚𩌐𩽞",
 "庫": "褲𠺟𣹫𥌙𦟏𪪫𪰽𪹜",
 "⻃": "褼遷䙲䙳䙵䙶䧈𠌐𠍍𠏹𡂽𡆛𡥟𡫊𣃕𣈺𤊆𤍭𤩗𥢝𥣃𦂬𦇉𧟡𧟥𧟦𧟮𧟵𧟶𧟸𨗆𨗇𨞝𩌶",
 "奭": "襫𠠘𣂏𣰰𨟉𩖃𪴑𪼩𫓛",
 "繭": "襺𢺃𣀸𣠷𥀹𥜲𧅆𨇿",
 "攀": "襻鑻𢺏𥜳",
 "㶣": "覝𪏂",
 "夐": "觼𪤩𪱏",
 "嶲": "觽㒞㰎㼇䥴𡣸𢤮𢹂𦢥𧔍𧮄𧲑𨟎𩧎𩽌",
 "㠩": "詤㡃𩶡",
 "侃": "諐𣵿𨓲𩱡𫺛",
 "㿽": "諡䤈",
 "咨": "諮谘趦㮞䠖𢱆𣯃𤦿𥚭𥻓𨍢𨩲𫙩",
 "翦": "譾𢸄𫍿",
 "衛": "讆㦣𡓎𢆈𢖨𤜂𧁮𧾦𬣔",
 "讀": "讟",
 "丮": "谻𠯎𠾁𡎐𡔊𡖊𡙺𡡘𡢁𡢂𢀜𢙷𢡶𢦚𢭤𢴷𢴸𣊮𤎮𤜾𥒽𥠫𥲒𦅬𦏞𦘣𦟀𦯋𧋳𧬓𨑽𨧎𨬝𩊳𩛥𩦻𪜆𪡘𫊈𫡋𫡖𫡗𫡳𫢐𫤱𫧫𫭤𫭳𫳏𫳶𫷂𫷖𬂤𬂴𬐙𬐭𬒯𬓣𬔧𬛣𬢠𬨀𬹧",
 "盇": "豓㗐",
 "毌": "貫贯𡞔𢡌𣫻𥦾𦑢𧜍𪞈𪼨𬀆",
 "庒": "賘𪭽𪸱𬫝",
 "猋": "贆飆飇飙䁭䔸𡪱𣄠𣽼𦠎",
 "斌": "贇赟𧸔𨭉",
 "兟": "贊赞𠐷𡄋𤄳𤅬𤫨𥌳𥳱𦺷𧑯𧮖𩱩𫌦",
 "雁": "贋赝㷳𤎝𤏚𪆒𬒡",
 "忠": "贒㥙䛱𠊞𡲦𢘑𢘗𣷡𨨩𨵖𩗻𫁑𬅇",
 "鴈": "贗𡃌𤂮𤑤",
 "虤": "贙",
 "龰": "走足𠸝𫌃蜨𫯃",
 "⻊": "趴趵趶趷趹趺趻趼趽趾趿跀跁跂跃跄跅跆跇跈跉跊跋跌跍跎跏跐跑跒跓跔跕跖跗跘跙跚跛跜距跞跟跠跡跢跣跤跥跦跧跨跩跪跬跭跮路跰跱跲跳跴践跶跷跸跹跺跻跼跽跿踀踁踂踃踄踆踇踈踉踊踋踌踍踎踏踐踑踒踓踔踕踖踗踘踙踚踛踜踝踞踟踠踡踢踣踤踥踦踧踩踪踫踬踭踮踯踰踱踲踳踴踵踶踷踸踹踺踻踼踽踾踿蹀蹁蹂蹃蹄蹅蹆蹈蹉蹊蹋蹌蹍蹎蹏蹐蹑蹒蹓蹕蹖蹗蹘蹚蹛蹜蹝蹞蹟蹠蹡蹢蹣蹤蹥蹦蹧蹨蹪蹫蹬蹭蹮蹯蹰蹱蹲蹳蹴蹶蹸蹹蹺蹻蹼蹾蹿躁躂躃躅躆躇躈躊躋躌躍躎躏躐躑躒躓躔躕躖躘躙躚躜躝躞躟躡躢躣躤躥躦躧躨躩躪䟓䟔䟕䟖䟗䟘䟙䟚䟛䟜䟝䟞䟠䟡䟢䟣䟤䟥䟦䟧䟨䟩䟪䟬䟭䟮䟯䟰䟱䟲䟳䟴䟵䟶䟷䟸䟹䟺䟻䟼䟽䟾䟿䠀䠁䠃䠄䠅䠆䠇䠈䠉䠊䠋䠌䠍䠎䠏䠐䠑䠒䠓䠔䠕䠖䠗䠘䠙䠚䠛䠜䠝䠞䠡䠣䠤䠥䠦䠧䠨䠩䠪䠫䠬䠭䠮䠯䠰䠱𥸙𦍂𦍅𦪨𧷥𧾹𧾻𧾼𧾽𧾾𧾿𧿁𧿂𧿄𧿅𧿆𧿇𧿈𧿉𧿊𧿋𧿌𧿎𧿏𧿐𧿑𧿒𧿓𧿔𧿖𧿘𧿙𧿚𧿛𧿜𧿝𧿞𧿟𧿠𧿡𧿣𧿤𧿥𧿦𧿧𧿨𧿩𧿪𧿫𧿭𧿯𧿰𧿱𧿲𧿳𧿴𧿵𧿶𧿷𧿸𧿹𧿺𧿻𧿼𧿽𧿾𨀀𨀁𨀃𨀄𨀅𨀆𨀇𨀈𨀉𨀊𨀋𨀌𨀍𨀎𨀏𨀐𨀒𨀓𨀕𨀖𨀗𨀘𨀙𨀚𨀛𨀜𨀝𨀞𨀟𨀠𨀡𨀢𨀣𨀤𨀥𨀧𨀨𨀩𨀪𨀫𨀬𨀭𨀯𨀰𨀱𨀳𨀴𨀵𨀷𨀸𨀹𨀺𨀻𨀼𨀽𨀾𨀿𨁂𨁃𨁄𨁅𨁆𨁇𨁈𨁉𨁋𨁌𨁍𨁎𨁏𨁐𨁑𨁒𨁓𨁔𨁕𨁖𨁗𨁙𨁜𨁝𨁞𨁟𨁠𨁡𨁣𨁤𨁦𨁧𨁨𨁩𨁪𨁫𨁬𨁭𨁮𨁯𨁰𨁱𨁲𨁳𨁴𨁵𨁶𨁷𨁸𨁹𨁺𨁻𨁼𨁾𨁿𨂀𨂁𨂂𨂃𨂅𨂆𨂇𨂈𨂉𨂊𨂋𨂍𨂎𨂏𨂐𨂑𨂒𨂓𨂕𨂖𨂗𨂘𨂙𨂚𨂛𨂜𨂟𨂠𨂡𨂤𨂥𨂦𨂧𨂨𨂩𨂪𨂫𨂭𨂯𨂰𨂱𨂲𨂳𨂴𨂵𨂶𨂷𨂸𨂹𨂺𨂻𨂼𨂽𨂾𨂿𨃀𨃁𨃂𨃃𨃄𨃅𨃆𨃇𨃈𨃉𨃊𨃋𨃌𨃍𨃎𨃏𨃐𨃑𨃒𨃓𨃔𨃕𨃖𨃘𨃙𨃚𨃛𨃜𨃝𨃟𨃠𨃡𨃣𨃤𨃥𨃦𨃧𨃪𨃬𨃭𨃮𨃯𨃰𨃳𨃵𨃶𨃷𨃸𨃹𨃻𨃼𨃽𨃿𨄀𨄁𨄂𨄃𨄄𨄅𨄈𨄉𨄊𨄋𨄍𨄎𨄏𨄐𨄑𨄒𨄓𨄔𨄕𨄖𨄗𨄘𨄙𨄞𨄠𨄢𨄣𨄤𨄥𨄨𨄩𨄪𨄫𨄭𨄮𨄰𨄱𨄲𨄳𨄴𨄵𨄶𨄷𨄸𨄹𨄺𨄻𨄼𨄽𨄾𨅀𨅁𨅂𨅃𨅄𨅅𨅆𨅈𨅊𨅋𨅌𨅍𨅎𨅏𨅑𨅒𨅓𨅔𨅕𨅖𨅗𨅙𨅛𨅜𨅝𨅞𨅟𨅡𨅢𨅣𨅤𨅥𨅦𨅧𨅨𨅪𨅫𨅬𨅭𨅮𨅯𨅱𨅲𨅳𨅵𨅶𨅷𨅸𨅹𨅻𨅼𨅽𨅾𨅿𨆀𨆁𨆂𨆃𨆄𨆅𨆆𨆇𨆈𨆉𨆋𨆌𨆎𨆏𨆐𨆑𨆒𨆓𨆗𨆘𨆙𨆚𨆛𨆝𨆞𨆟𨆠𨆡𨆢𨆣𨆤𨆦𨆨𨆫𨆬𨆭𨆮𨆯𨆱𨆳𨆴𨆵𨆶𨆷𨆸𨆺𨆼𨆽𨆾𨆿𨇀𨇁𨇂𨇃𨇄𨇅𨇆𨇇𨇈𨇉𨇊𨇋𨇍𨇎𨇏𨇑𨇒𨇔𨇕𨇖𨇗𨇙𨇚𨇝𨇞𨇟𨇠𨇡𨇢𨇣𨇤𨇥𨇦𨇧𨇨𨇩𨇪𨇫𨇬𨇮𨇯𨇰𨇱𨇲𨇴𨇵𨇶𨇷𨇸𨇹𨇺𨇽𨇾𨇿𨈀𨈁𨈂𨈄𨈅𨈆𨈇𨈈𨈉𨈊𨈋𨈌𨈍𨈎𩕎",
 "耴": "踂輒辄銸鮿㑙㡇㤴㭯㳧䎎䳖𠲷𡜯𡱷𡷝𢬴𣹵𤈨𤭗𥆍𦕿𦛖𦯍𧋖𧚊𧶋𧼈𨓊𩂻𩣘𪘛𫚚",
 "质": "踬锧𫟬𫪪𬃊",
 "䓣": "蹒颟",
 "蔺": "躏",
 "䘙": "躛𧲔𧲝𧲞",
 "燮": "躞㦪㰔㽊𠑄𡄕𢹒𤫉𥍆𧕊𩎃𩙜𪱓𪸂",
 "闒": "躢𡓲𤒻𧮑𨰏",
 "藉": "躤",
 "藺": "躪轥𥽼𨙟",
 "㕍": "軅𪶫",
 "應": "軈㒣㣹㶐𡄖𡾶𥌾𥗡𧃽𧕄𪈠𪯂",
 "寶": "軉䴐𤫞𦈆𨰰𪴥𫘄𬎞",
 "畚": "輽㨧㮥𣄏𤳼",
 "辡": "辦辧辩辫辬辮辯𤀫",
 "𡰣": "迉𠅏",
 "卣": "逌䚃𠧠𢈞𣤦𤈴𤨗𤩤𨖯𨗰𨙃𨛕𪾏",
 "𡱝": "遅",
 "𦍒": "達𢹗𣸉𥀀𨂧𨗾𫐳𬦔",
 "眔": "遝鰥㱎䤽𬱐",
 "𠳋": "遣𧪯𫑍𬩠𬳈",
 "豚": "遯𧲝",
 "莝": "遳",
 "㖾": "遻㦍䣞𠟎",
 "蕇": "鄿",
 "荃": "醛𣗎",
 "盎": "醠𠹃𣉗𣖮𣺻𤭹𤮃𧪪𫙬𬤔",
 "𥁓": "醢",
 "糜": "醾𢑀𥽰",
 "縻": "醿䭧𠠣𤃰",
 "丐": "鈣钙麫𠣣𠰁𡆸𡜷𡧎𡪛𢗙𢪪𣅰𣵈𥝽𧉝𧦉𧺪𩬆𪤺𫆄𫑚𫡔𬉻",
 "史": "鉂駛驶㳏𡶈𢈗𢺲𣭂𤈆𤤭𥑏𦘤𧊍𧲬𩂝𩰡𪀎𪗧𪠷𪡖𫙓𫢓𫩢𫪊𫪊𬀈𬏅",
 "㔻": "銔䮆𩶨𬭃",
 "丢": "銩铥𠲍𫡧",
 "沃": "鋈𠴎𦰚𩷯𪁕𪎤𪣡𪶇",
 "扳": "鋬𫩾",
 "杰": "錰",
 "軋": "錷𠵣𡸗𡸲𢮊𬒒",
 "灭": "錽𬆡",
 "苕": "鍣𬭡",
 "罡": "鎠㓻㟵䌉𡬺𢱫𣗵𣦐𤌗𤭺𦋳",
 "送": "鎹餸㮸𢱤𦷴𩠌𫯖𬚥",
 "祖": "鎺䔃𣗿𤍄𥜀𬠢",
 "𧴲": "鎻𧫇𩪇𪹟",
 "峯": "鎽㷨𡻀𣗏𣺿𧏢𨕱𩥪𪮘𪼇",
 "陽": "鐊𤺹𥳜𪤝𫉤𫶖",
 "結": "鐑𢢂𣚬𦺢𨗟𪆋𪢍𫵊",
 "𧯥": "鐡",
 "開": "鐦𢵱𣛣𣾺𤡲𥖆𥳐𦼠𨷑𩦓𫔦𫙸𫫭𫯿",
 "輕": "鑋𢷰𣱮𧸰𨆪𨮫𫡸",
 "鍂": "鑫𣫫",
 "覧": "鑬䌫𥗽𧖐𨇣𫬠",
 "费": "镄𪰶𫽧𬃮𬈕",
 "众": "閦𪭮𬮥",
 "𥄎": "闅𠷾𢾔𥆗𧁰𫼀",
 "啟": "闙𫫤𫹢",
 "敗": "闝𠮆𠼚𡏯𡫄𤼹𥨇𪦚𬄎",
 "龟": "阄𫃧𫜳𬓫",
 "㚒": "陝㣣𦟬𦧳𧧵",
 "𡉼": "陞𪲙𬗛",
 "侌": "陰𣸊𤷜𦁌𦜲",
 "㑒": "険験鹸㪘㰸𠝏𡸴𫠗",
 "迶": "随髄𪝘",
 "𢀡": "隓",
 "遀": "隨髓㵦䜔䥦𪹴𬄭",
 "𠇍": "隳㓒㛋䧙𠢯𠲒𡪹𢡣𢢃𣑰𣚉𣶠𣶾𣽓𤤽𤺟𥒨𥟦𥠖𥢩𥨞𥶟𦠧𦮕𧥂𨽎𩘸𪬬𫣿",
 "倠": "雁䧹𠥔𡠓𡢦𢋗𤸰𤻮𤼡𦢖𦢻𧭭𧸛𨶊𪜤𪴳",
 "杂": "雑𬖚",
 "雥": "雧𤓪𤓬𩁴𩁵",
 "务": "雾𫯊",
 "沛": "霈𢭿𬆃",
 "泓": "霐𥦷",
 "泠": "霗𢜅𩆼𫪬",
 "洞": "霘𢞉𪔦",
 "𢏝": "霛",
 "脈": "霢𪃻",
 "彬": "霦𧈇𪬟𪹡𬈥",
 "淫": "霪𠽍𢴏𤎛𦹻𪱬",
 "湛": "霮𠾻𢵺𤩌",
 "滂": "霶𬉘",
 "暘": "霷𤻈",
 "瀝": "靋𧄻",
 "寳": "靌𡤧𢺔𤫖𧅤𨰦",
 "䳡": "靍",
 "鵭": "靎",
 "鶴": "靏",
 "荐": "鞯𢞻",
 "㦰": "韱𩃔𪻀𪽚",
 "禿": "頹𢬳𣒇𥤒𧳌𨿖𬨩",
 "阜": "顊㷆䘀𡸠𡽷𢈹𢮒𤭟𤷎𥓭𦰺𧌓𧌛𧨮𨹺𨻑𨽓𨽔𨽕𩣸𬯈𬱪",
 "恖": "顖𦃞𧏀𧪳𪙋",
 "𤎭": "顲",
 "䬕": "飍",
 "飠": "飢飣飤飥飦飩飪飫飭飯飰飲飳飴飵飶飷飹飻飼飽飿餀餁餂餃餄餅餆餇餉餌餎餏餑餒餓餔餕餖餗餘餙餚餛餜餝餞餟餡餢餣餤餦餧館餩餪餫餬餭餯餰餱餲餳餴餵餶餷餸餹餺餻餼餽餾餿饀饁饃饄饅饆饇饈饉饊饋饌饍饎饐饑饒饓饖饘饙饚饛饝饞饟饠饡饢䬢䬣䬦䬧䬨䬪䬫䬬䬮䬯䬰䬱䬲䬳䬴䬵䬶䬷䬹䬺䬼䬽䬾䬿䭀䭂䭃䭄䭅䭇䭈䭊䭋䭍䭎䭏䭐䭑䭒䭓䭔䭖䭗䭘䭙䭚䭛䭜䭝䭞䭟䭠䭡䭢䭣䭤䭥䭦䭧䭨䭩𩚧𩚼𩛂𩛃𩛇𩛌𩛏𩛓𩛔𩛘𩛙𩛫𩛮𩛲𩛴𩛵𩛶𩛷𩛸𩜑𩜘𩜠𩜡𩜣𩜤𩜦𩜧𩜩𩜪𩜫𩜮𩝂𩝃𩝄𩝇𩝈𩝊𩝋𩝌𩝎𩝏𩝐𩝑𩝒𩝔𩝜𩝠𩝪𩝯𩝷𩝺𩞍𩞒𩞓𩞔𩞘𩞙𩞛𩞜𩞝𩞢𩞯𩞰𩞱𩞳𩞴𩞶𩞸𩞻𩟂𩟃𩟎𩟐𩟑𩟒𩟔𩟞𩟟𩟠𩟡𩟢𩟣𩟩𩟫𩟬𩟭𩟯𩟲𩟳𩟵𩟹𩟺𩟻𩟽𪂾𫗏𫗑𫗓𫗔𫗕𫗗𫗘𫗛𫗜𬲋𬲌𬲍𬲎𬲐𬲑𬲒𬲓𬲔𬲗𬲘𬲙𬲚𬲛𬲜𬲞𬲠𬲡𬲣𬲤",
 "⻞": "飮𧐂",
 "殄": "餮𧍿",
 "羞": "饈鱃䡭𥀞𦟤𦪋𩘭𪅠𫅡𬖱𬚂",
 "號": "饕㙱𣜍𣜵𤩭𧰑𪷢",
 "饣": "饤饾馀馂𩵜𫗞𫗟𫗠𫗡𫗢𫗣𫗤𫗥𫗦𫗧𫗨𫗩𫗪𫗫𫗬𫗭𫗮𫗯𫗰𫗱𫗲𫗳𫗴𫗵𬲥𬲦𬲧𬲨𬲩𬲪𬲫𬲬𬲭𬲮𬲯𬲰𬲱𬲲𬲳𬲴𬲵𬲶𬲷𬲸𬲹𬲺𬲻𬲼𬲽𬲾𬲿𬳀𬳁𬳂𬳃𬳄𬳆𬳇𬳈𬳉𬳊𬳋𬳌𬳍𬳎𬳏𬳐𬳑𬳒𬳓𬳔",
 "𩡐": "馫",
 "𠤏": "駂鴇鸨𩢈",
 "陟": "騭骘",
 "槖": "驝",
 "宽": "髋𣎑",
 "葬": "髒𠿺𩦦",
 "髟": "髠髡髢髣髤髥髦髧髨髩髪髫髬髭髮髯髰髱髲髳髴髵髶髷髸髹髺髻髼髽髾髿鬀鬁鬂鬃鬄鬅鬆鬇鬈鬉鬊鬋鬍鬎鬏鬐鬑鬒鬓鬔鬕鬖鬗鬘鬙鬚鬛鬜鬝鬞鬟鬠鬡鬢鬣鬤䭮䯭䯮䯯䯰䯱䯲䯳䯴䯵䯶䯷䯸䯺䯻䯼䯽䯾䯿䰀䰁䰂䰃䰄䰅䰆䰇䰈䰉䰊䰋䰌䰍䰎䰏䰐䰑䰒䰓䰔䰕䰖𢹚𤌩𧫄𧸻𩫴𩫵𩫶𩫷𩫸𩫹𩫺𩫻𩫼𩫽𩫾𩫿𩬀𩬁𩬃𩬅𩬆𩬇𩬈𩬉𩬊𩬋𩬌𩬍𩬐𩬑𩬒𩬕𩬖𩬗𩬘𩬙𩬚𩬛𩬜𩬝𩬞𩬟𩬠𩬡𩬢𩬣𩬤𩬦𩬧𩬨𩬩𩬪𩬫𩬭𩬮𩬯𩬰𩬱𩬲𩬳𩬴𩬵𩬶𩬷𩬸𩬹𩬺𩬻𩬼𩬾𩬿𩭀𩭁𩭂𩭃𩭄𩭅𩭆𩭇𩭈𩭉𩭊𩭋𩭌𩭍𩭎𩭏𩭐𩭑𩭒𩭓𩭔𩭕𩭖𩭗𩭘𩭙𩭚𩭛𩭜𩭝𩭞𩭟𩭠𩭡𩭢𩭣𩭤𩭦𩭧𩭨𩭩𩭪𩭫𩭬𩭭𩭯𩭰𩭱𩭲𩭳𩭴𩭶𩭷𩭸𩭹𩭺𩭻𩭼𩭽𩭾𩭿𩮀𩮁𩮂𩮃𩮄𩮅𩮆𩮇𩮈𩮉𩮋𩮌𩮍𩮎𩮏𩮐𩮑𩮓𩮔𩮕𩮖𩮗𩮘𩮚𩮛𩮜𩮝𩮞𩮠𩮡𩮢𩮣𩮤𩮥𩮦𩮧𩮨𩮩𩮪𩮫𩮬𩮭𩮮𩮯𩮱𩮲𩮳𩮴𩮶𩮷𩮸𩮹𩮺𩮼𩮿𩯀𩯁𩯂𩯃𩯄𩯅𩯆𩯇𩯈𩯉𩯋𩯌𩯍𩯎𩯏𩯐𩯑𩯒𩯓𩯔𩯖𩯗𩯘𩯙𩯚𩯛𩯜𩯝𩯞𩯟𩯠𩯡𩯣𩯤𩯥𩯦𩯧𩯨𩯩𩯪𩯬𩯮𩯯𩯰𩯱𩯲𩯳𩯴𩯵𩯶𩯷𩯸𩯹𩯺𩯻𩯼𩯽𩯾𩯿𩰀𩰁𩰂𩰃𩰄𩰅𩰆𩰇𩰈𩰉𪄒𪶰𫘸𫘹𫘺𫘻𫘼𫘽𫘾𫘿𫙁𫙂𫙃𩬰鬒𬴧𬴨𬴩𬴪𬴫𬴭𬴮𬴯",
 "鬥": "鬦鬧鬨鬩鬪鬫鬬鬭鬮䰗䰘𩰌𩰍𩰎𩰏𩰐𩰑𩰒𩰓𩰔𩰖𩰗𩰘𩰙𩰛𩰜𩰝𩰞𩰟𫫅𬴰𬴱",
 "?": "鬬㢤㱐㸔䆋䜳𠀀𠀉𠂮𠂰𠄲𠄷𠅑𠇇𠌋𠍋𠍑𠎖𠐫𠔂𠔄𠕢𠕯𠖁𠘿𠙰𠙱𠚡𠝉𠢊𠢨𠤛𠤜𠥼𠦡𠦺𠨨𠩐𠩳𠪎𠪕𠪳𠬷𠮁𠯧𠰟𠰥𠲁𠲑𠳧𠴁𠵓𠷭𠿾𡀮𡁝𡄅𡆢𡉡𡊐𡋏𡐃𡒴𡓻𡘁𡙌𡙞𡚎𡚣𡛱𡜏𡝽𡟽𡧑𡩱𡮴𡱄𡲄𡲇𡷊𡸭𡸸𢀓𢁄𢇭𢈘𢉼𢏻𢏽𢔾𢜧𢦀𢪀𢪜𢪢𢭣𢮮𢮴𢮽𢳌𢷥𢸻𣀋𣀴𣍫𣏱𣑟𣒏𣒘𣕺𣗫𣙒𣛐𣜒𣝣𣝥𣞦𣟘𣡅𣤝𣪃𣪴𣭌𣰱𣳋𣳍𣴁𣴋𣵍𣶿𣷻𣺏𣺙𣻋𣻴𤂈𤂝𤆖𤌰𤌵𤍻𤏊𤏑𤐁𤐈𤐻𤒅𤕈𤙸𤜥𤠨𤡉𤡼𤢉𤣉𤣖𤥅𤥥𤨃𤨈𤨢𤯴𤰒𤱖𤱮𤲃𤲱𤵧𤽗𤽩𤽪𤾹𥀪𥁗𥁘𥂶𥃅𥃥𥅱𥉢𥓛𥓦𥘍𥙛𥙸𥡌𥥕𥫣𥫧𥬃𥭿𥮂𥱏𥴂𥸻𥺗𥼢𦁥𦂰𦆐𦆑𦇡𦋦𦌂𦏞𦒘𦖂𦖶𦗉𦘎𦡏𦡾𦡿𦣵𦥾𦦊𦦓𦪲𦬌𦮦𦮵𦰌𦰩𦲗𦲙𦲢𦲻𦲿𦴱𦴷𦹆𦹉𦹗𦹚𦻷𦿨𦿭𧁥𧁧𧁶𧅴𧅶𧌶𧗮𧜑𧜸𧞘𧟺𧢉𧢯𧤸𧪿𧫴𧯟𧶦𧸣𧸮𧸻𧹂𧹜𧼧𨑘𨔍𨕛𨗌𨘅𨘶𨛙𨜲𨝒𨢫𨤞𨧋𨨂𨫴𨬧𨮚𨷍𨻛𨼛𨽅𩃅𩄩𩈠𩎩𩓲𩕙𩜝𩵿𩸼",
 "斲": "鬭𤂊𤃮𧞐𧞗𨮕𨷖",
 "龜": "鬮龝龞䶯䶰䶱䶲𡤞𥤚𦫉𨷺𩙠𪚩𪚪𪚬𪚭𪚮𪚯𪚰𪚱𪚳𪚵𪚶𪚷𪚸𪚹𪚻𪚼𪚽𪛀𪛁𪛂𪛅𪛆𪛇𪛈𪛕𪷾𬋣",
 "鬯": "鬰鬱𢋺𣡎𣡫𤅥𤅪𤓄𤓡𤿃𥠴𨤊𩰠𩰡𩰢𩰣𩰤𩰥𩰦𩰧𩰨𩰩𩰪𪴴",
 "粥": "鬻𢐫𤳕𥪷𪆀",
 "⻤": "魇魉",
 "虱": "鯴鲺𧌡",
 "箴": "鱵𢤝𨮼𪇳𪈁𪉕𪒹𫄏",
 "㷉": "鳚",
 "管": "鳤䌣䲘𤪔𤻥𪴌",
 "𠌵": "鴈",
 "宂": "鴧𪌡𪕎𪗴𪧩",
 "勅": "鶒𠢦𪃠𪬈𫛶𫽘",
 "茅": "鶜𡹰𧍟𧓿",
 "紡": "鶭𦁷",
 "晨": "鷐𣊐𤡠𩀭𫜀𫳳𬞀",
 "笠": "鷑𡓆𣙫𥱆𥼕𨅁𩀩𩻒𬬂",
 "溪": "鸂𪷶𬉝𬞥",
 "楊": "鸉𣿘𥂸𦼴𩁒𬬍",
 "黹": "黺黻黼𣚠𦅧𧝉𨬚𪓋𪓌𪓍𪓎𪓏𪓐𫜜𫱱𫹤𬋉𬘑𬹜",
 "佑": "㐛𫈈𫳌",
 "拘": "㐝𢛑",
 "浮": "㐢𠸷𥰛𦋵𦷰𪃽𬈽",
 "鋤": "㐥",
 "亻": "㐰㐲㐳㐴㐵㐶㐷㐸㐹㐺㐻㐼㐽㐾㐿㑀㑁㑂㑃㑄㑅㑆㑇㑈㑉㑊㑋㑌㑍㑎㑏㑐㑑㑓㑔㑕㑖㑗㑘㑙㑚㑛㑜㑝㑞㑟㑠㑡㑢㑣㑤㑥㑦㑧㑨㑩㑪㑫㑬㑭㑮㑯㑰㑱㑲㑳㑴㑵㑶㑷㑸㑺㑻㑼㑽㑾㑿㒁㒂㒃㒄㒅㒆㒇㒈㒉㒋㒌㒍㒎㒏㒐㒑㒒㒓㒔㒕㒖㒗㒘㒙㒛㒜㒝㒞㒟㒠㒡㒢㒣㒤㒥㒦㒧㒨㒩㚢㲻𠂹𢟂𣐗𣒦𣦛𣺢𣿾𤶄𥈯𥙛𥙜𦐶𦬳𦬴𦭛𦮩𦰒𦲮𦴨𦴱𦴷𦵋𧂶𧨍𨋶𨍙𨧝𨴳𩃥𩃫𩄴𩺨𪘗𪜧𪜨𪜩𪜪𪜫𪜭𪜮𪜯𪜰𪜲𪜳𪜴𪜵𪜶𪜷𪜸𪜹𪜺𪜻𪜼𪜾𪜿𪝀𪝂𪝄𪝅𪝆𪝈𪝉𪝊𪝋𪝌𪝍𪝎𪝏𪝐𪝑𪝒𪝓𪝔𪝕𪝖𪝘𪝙𪝚𪝛𪝜𪝝𪝞𪝟𪝡𪝢𪝣𪝤𪝥𪝦𪝧𪝨𪝫𪝬𪝭𪝮𪝰𪝳𪝴𪝵𪝷𪝸𪝺𪝼𪝾𪢋𪦣𪶤𪶴𫈾𫝈𫝊𫝋侮侻偺備僧㒞㺸㺸𫡑𫢅𫢆𫢈𫢋𫢌𫢎𫢏𫢐𫢑𫢒𫢓𫢔𫢕𫢗𫢘𫢙𫢛𫢜𫢝𫢞𫢟𫢠𫢡𫢢𫢣𫢤𫢥𫢦𫢧𫢨𫢪𫢬𫢭𫢮𫢯𫢰𫢱𫢲𫢳𫢶𫢷𫢸𫢹𫢺𫢻𫢽𫢾𫣀𫣁𫣂𫣄𫣅𫣆𫣉𫣊𫣋𫣌𫣎𫣏𫣐𫣑𫣒𫣓𫣔𫣕𫣖𫣗𫣜𫣞𫣟𫣠𫣡𫣢𫣣𫣤𫣥𫣦𫣧𫣨𫣩𫣫𫣬𫣲𫣳𫣴𫣶𫣷𫣺𫣻𫣼𫣾𫤀𫤂𫤃𫤇𫤊𫤌𫤐𫤔𫤖𫴊𬔼𬨽𬫅𬫜𬷉",
 "𠆧": "㐺",
 "灷": "㑞䢠𨔮𬫞",
 "刧": "㑢𧋤",
 "略": "㑼㨼䌎𧐣𧐯𧕌𨎟𪅅",
 "圉": "㒁𡻢",
 "絫": "㒍𡼊𢴱𣚎𤛡𤮎𥊻𥳮𦅍𧬀",
 "寒": "㒏㩃𠘗𡫶𡬜𡬜𡬜𢢈𣽬𦺦𧑚𩍎𩦊𪧱𪳶𫴐𬋸",
 "䑓": "㒗𣜉",
 "竪": "㒘",
 "褭": "㒟㜵㠡䃵𢸣𣟊𥤂𨳀𨽖",
 "𦣦": "㒪",
 "󠄃": "㒮㟣㯻䝅䝇䝈䝊䝋䝌䝍䝎䝏䝐䝑䝒䝓䝔䝕𠄾𠍪𠐵𠑡𠟵𠢔𠥷𠥹𠥺𠥺𠽋𠾪𡁷𡏇𡏔𡙢𡙾𡚋𡠷𡨭𡬿𢄠𢄫𢆢𢇐𢐣𢑱𢔵𢕓𢠈𢠽𢼑𢿛𣉾𣎥𣕙𣘗𣟗𣫖𣫚𣫛𣽁𤌮𤎐𤕃𤛐𤠾𤹪𥕥𥯆𥱸𦣡𦦟𧺮𨖶𩕓𩳟𩺱",
 "⺜": "㒻㒽㒾㒿𠕖𠕝𠕠𠕤𠕥𠕦𠕭𠕮𠕰𠞈𠹥𣓍𥅉𦧭𦽹𨬋",
 "託": "㓃𣘄𨶃",
 "⾆": "㓉䀨䄆䏦䒷䟯䦚䯏𡇜𡯢𣁳𣽰𤫵𥯾𥵶𦧔𦨯𨈸𩈙",
 "券": "㓬𫪤𬱋",
 "菲": "㔈𬄟",
 "⻟": "㔲𠥗",
 "飢": "㔳𠍃",
 "𢆰": "㕄䩘𠅹𢇨𢏁𢓎𢻽𣏳𣲑",
 "㪷": "㕏",
 "仇": "㖌𠯾𦬖𨥐",
 "吞": "㖔㧷㶺𢚺𢞋𣵞𤶕𨁇𨅳𨇕𨧐𨹙𩇺𩐄𩷵𫫹𬚻𬨦",
 "庛": "㖢𣓄",
 "汝": "㖳𠲤𢬨𦭰𨀾𪡑𪰤𫃤𫺈𫺋",
 "芴": "㖴𬬈",
 "幽": "㗀䫜𠋔𡺖𢇑𢇕𢇕𢉾𢰠𢹴𢹴𣠭𣠭𣾧𥠃𦂣𧍘𩘈𩡎𪃨𪋎𪴉𫲪𫶹𬱮",
 "架": "㗎𢉤𢱌𣕧𦩪",
 "歪": "㗏𢱉𣖍𤟷𨂿𪴻𪴽𫣀𬆆",
 "笑": "㗛𡮜𢞖𢲑𣉧𧏣𧜕𫂪𫛎𫹠𬕓",
 "恙": "㗝㺊䭐𣗹𧏮𪬝𫱛",
 "破": "㗞𥖑𥖓𥖕𥖖𥖺𪜘𫮒𬒧",
 "始": "㗠𠝔𡤓𡤔𤯯𦰯𪦲",
 "欻": "㗵𣊞𦌗",
 "䘖": "㗸",
 "𢛧": "㗹",
 "靴": "㗾𫫸𬆌𬩑",
 "閜": "㗿𦽅𧬱𧯓",
 "惹": "㘃",
 "楞": "㘄",
 "銜": "㘅䕔䲗𦌫",
 "霅": "㘊𤁳",
 "劇": "㘌𤁴𥗌",
 "阚": "㘎",
 "隷": "㘑",
 "種": "㘒𡽯𥵾𧀑",
 "賽": "㘔𡤐𨙇",
 "顏": "㘖𫌧",
 "龕": "㘛",
 "究": "㙀𢭕𣒔𣵇𤲏𥤿𥦚𥧖𫕂",
 "𤰩": "㙒",
 "𤯔": "㚅",
 "𣅀": "㚆",
 "佳": "㚝𠡬𡨱𧡞𩋔𪠐𪶔𫦺",
 "㠯": "㚶㭒㷗𠦗𠪽𡇑𡊊𡌙𢈂𢍀𢏈𢖎𢧝𣀪𣡏𣤷𣤷𤕁𤘎𤬴𥅑𥘰𥞐𥭱𥿓𦇶𦥳𦯭𦱱𦴫𧔸𧦫𧵫𧺽𨕃𨕕𨶥𩝵𩝵𪌛𫑕𫵰𬋩𬬢𬬢",
 "孕": "㚺䱆𠱆𡥸𡦆𡦔𡲪𢘩𢫡𤁛𥩯𥿱𨀊𨈯𨸳𫭧𫲬𬚕",
 "𠂬": "㛂𠈊𡭍",
 "⻔": "㛠𡭜𡭬",
 "宩": "㛽𫳢",
 "信": "㜃𠏬𠒷𣣢𦴩𧪄𩀕𩸔𪲼𫠻𬒘𬦿",
 "恚": "㜇𠹤𥉖𥧟𧫉𬃰",
 "舁": "㜒𠧇𤠈𨵹",
 "竞": "㜔𬈣",
 "熙": "㜯𠘕𡁱𤀠𤐤𬞭",
 "疊": "㜼㲲䴑𠠯𤴉𤴍𨈈𨐁𫊜",
 "𠈇": "㝛",
 "昗": "㝠",
 "惺": "㝭𥨕",
 "祟": "㞊㱁䄐䳳𡰇𢿆𤭽𤺅𥚋𥛁𥜱𥨒𦃒𦿎𧑎𧸆𨜿𨻍𨾀𬘼",
 "㣦": "㞜",
 "々": "㞮",
 "呌": "㟕𪭸",
 "枝": "㟚䓩𠔢𡍁𡲅𢆨𧌔𩓡𪂅𬯾",
 "隗": "㠕𠏁",
 "嵬": "㠢䃬𠎺𠿯𢢯𣰏𤀖𤐜𤛲𤩫𤮞𥋳𪇋𪊃𪖾𪧄𫀢",
 "欝": "㠨𡆋𤓣𪓉",
 "凢": "㠶𪳃𪵬𪸎𫥠𫥣𫩓𫶿𫼕𬂢𬜕𬟵",
 "㚖": "㡍",
 "䆸": "㡧",
 "𡖀": "㡪",
 "秅": "㢉",
 "侈": "㢋𠝓𣔢𦰿𧚤𧩀𧳤𪂄𪵌𪷔𫒬𫪥𫽎",
 "弜": "㢲𠴀𢐑𢐘𢐜𢐭𢑅𩇃𫳆𫸺",
 "𢎿": "㢸",
 "候": "㢿𢰡𤠣𥱌𦃺𩌖𩺟𬑟𬫺",
 "璽": "㣆䌳𤄽𤫆𤿂𥸀𨰡𫬹",
 "丼": "㣋𠛜𡌁𤍧𦓮𨚢𨦿",
 "𦙌": "㣧",
 "忄": "㣼㣾㣿㤃㤄㤆㤇㤈㤉㤊㤋㤌㤏㤑㤒㤓㤔㤕㤖㤚㤛㤜㤝㤞㤡㤢㤥㤦㤧㤨㤬㤭㤯㤱㤳㤴㤶㤷㤸㤹㤺㤼㤽㤿㥀㥃㥄㥅㥆㥇㥉㥊㥌㥍㥏㥒㥓㥔㥚㥛㥜㥝㥞㥟㥠㥡㥢㥥㥧㥩㥬㥭㥮㥰㥱㥳㥴㥵㥺㥼㥽㥾㦀㦃㦅㦆㦇㦉㦊㦋㦍㦎㦏㦐㦑㦒㦓㦕㦖㦗㦜㦡㦢㦥㦦㦧㦨㦩㦪㦫㦬㦭𡝒𡽼𤥊𥦋𥦿𥧴𥧼𥨰𦑑𦜷𧀘𩃆𩆽𪫝𪫞𪫟𪫡𪫢𪫣𪫤𪫦𪫧𪫨𪫪𪫬𪫭𪫮𪫯𪫲𪫸𪫹𪫺𪫻𪫿𪬀𪬁𪬃𪬉𪬌𪬏𪬑𪬔𪬕𪬖𪬗𪬘𪬙𪬚𪬜𪬝𪬞𪬠𪬡𪬢𪬣𪬦𪬨𪬮𪬰𪬱𪬶𪬷𪬸𪬹𪬺𪬻𪬾𪭃𪭄𪭆𪭇𪭈忹㤜悔𢛔惇憎憤憯懞懶𫹫𫹮𫹴𫹶𫹷𫹺𫹼𫹽𫺀𫺂𫺃𫺆𫺈𫺊𫺌𫺎𫺏𫺒𫺓𫺘𫺙𫺝𫺟𫺢𫺣𫺤𫺧𫺨𫺪𫺫𫺬𫺭𫺰𫺳𫺶𫺹𫺺𫺻𫺼𫺿𫻀𫻁𫻃𫻄𫻊𫻌𫻏𫻑𫻔𫻖𫻗𫻘𫻞𫻟𫻡𫻤",
 "孜": "㤵",
 "依": "㥋𠵱𤷴𦲤𬍠",
 "𣐉": "㥡𬘸",
 "矜": "㥤㮗",
 "娃": "㥨𣕁",
 "匿": "㥾䁥䘌𠽋𡠷𢴚𣘗𤎐𩺱𪐌𪙛𬳤",
 "詈": "㦒𠟟𪴾",
 "愚": "㦙𠏋𡪾𦔧",
 "䦧": "㦦",
 "𡿿": "㦽",
 "叐": "㧞䟦𢂛𤤣𬋪𬒲",
 "汇": "㧟",
 "扮": "㧳𢚅",
 "窂": "㨓",
 "副": "㨽𠠦𦸕𨄩𫋖",
 "處": "㨿𠽁𡼆𣊑𤃔𤓤𤓤𥱿𧇡𧇤𩌲𬹜",
 "䖏": "㩀",
 "寉": "㩁𪩐",
 "崽": "㩄",
 "等": "㩐𥢜𥪸𦅯𨅸𨬻𫂨𫮨",
 "䨿": "㩑㪪䙣",
 "𡻎": "㩗",
 "寨": "㩟𩠵",
 "潁": "㩩",
 "䋶": "㩪",
 "戯": "㩬𡃰𡾠",
 "騫": "㩷𡅶𥜴𧟑𨰬𪸋",
 "𥇛": "㪺𠟰𣰋𤩵𥋢𨞜𩍟𩕦",
 "昕": "㪽𩃟",
 "㫃": "㫅㫆𣃘𪥏𬀁",
 "亓": "㫅䟚䭼𡉝𡉨𢗏𣂕𣔔𤖄𥘕𥟝𥫶𥾟𥾦𦨘𦬟𩵧𪊔𪗞",
 "𠃍": "㫇𪜊𪢳𫼓𬲡𬲡",
 "𠈌": "㫺䁞䔢𣤬𣦗𣬓𦅊𦆧𦠪𦪮𦻏𧬢𪆍𪈪𫔧𫝃",
 "洽": "㬁㽏𢍡𫈰",
 "炱": "㬃𫨐𫿥",
 "祥": "㬕䔗",
 "啓": "㬖𢴖",
 "臸": "㬜𢸰𦇢𨟕𪧧𬛶𬛷",
 "羸": "㬯㱻䌴䯁𡰠𢺑𣠾𤼘𧕳𨰠",
 "𠵛": "㬽",
 "问": "㭣䠺𬜬",
 "负": "㭥𫼨",
 "昂": "㭿𠵫𪸺",
 "㫄": "㮄𢔚𢮔𦫣𧩂𩤐",
 "侠": "㮉",
 "盃": "㮎𢝙𣡝𤠅𥔦𦞑𪺰𫋋𫽗𬐩",
 "𠧪": "㮚𠧴𠨋𠨋𠨋𡙉𢢙𢾃𣡷𣡷𣡼𣡼𣡼𣣧𣣸𣰮𣿚𤩰𤪎𥃐𥻆𥽽𥾄𥾄𥾄𦵵𦿥𧡹𨔟𫦛",
 "匨": "㮜𫧔",
 "柘": "㮟𣗁",
 "炬": "㮡",
 "𣑦": "㮪",
 "圅": "㮭䓿䥁𣣻𣹢𤌐𧜄𫯴",
 "挈": "㮮䤿𢊏𢲞𢹫𤸪",
 "朕": "㮳㴨𢲂𣞅𨃗𨃵𨫇𪝝𫧄𫮗𬁨𬝤𬟀",
 "旃": "㮵𩔣𪄟",
 "陪": "㯁䔒𣯱",
 "𡌦": "㯇",
 "速": "㯈䔎䲇𠻣𧐒𧜦𧫻𨄞𨖧𨗜𨘘𨙛𨫩𩅘𩞍𩯀𩱫𪋝𫅯𬩏𬩓",
 "殸": "㯏㲆㲇㲈㷫㿦䅽䡰𡄈𡄒𣪤𣫊𣫒𣫘𣫙𣫜𣫝𣫣𣫤𣫨𧐡𪍱𪐕𪔰𪚣𪡹𪵑𫌤𫶲𬆍𬺝",
 "壺": "㯛𡕏𤬗𥃕𦺟𫯉𬀘",
 "棻": "㯣",
 "超": "㯧𠾸𢵒𦠶𬙄",
 "置": "㯰𧄗𪙳𪧁𫕾𫣧",
 "遭": "㯾",
 "棉": "㰃",
 "棐": "㰆䕁𢌑𣠻𣡖𥼠",
 "臻": "㰉𢸩",
 "燅": "㰊䕭𢅮𢸧𢸱𧅩",
 "篙": "㰏",
 "蹙": "㰗䙯𦇰",
 "彝": "㰘𬯧",
 "藥": "㰛𡤤𤄶𥍐𨰤",
 "厺": "㳒𥡊",
 "䏍": "㳙䏻𠱮𡱑𢈋𢎎𢔮𢛋𢨐𣚓𦝕𦮌蜎",
 "过": "㳡𪁶𫪀𬲸",
 "弃": "㳰𤥡",
 "𡊭": "㳴",
 "枉": "㳹𠶖𣒳",
 "㕣": "㴅𨒄𨸮𪖝",
 "承": "㴍𠉹𢁇𢬫𢬬𢮋𤉋𤗓𦜎𦫠𦲶𦻛𨛾𫎷",
 "眄": "㴐",
 "弈": "㴒",
 "厚": "㴟㷞𠫅𠫆𠷋𡎋𣖔𨩿𪃱𪝐𪠗𪰲𪻶𫈢𬖦",
 "凾": "㴠𡞿𢞊𤠀𦋣𦴻𦻭𫀛𫒶",
 "峭": "㴥",
 "郡": "㴫𠹴𡩫𤹓𦄄𦵼𩺐",
 "窅": "㴭𥈾𥨬𫫍",
 "脂": "㴯𫆻",
 "耽": "㴷𢲠𧏰𨄁",
 "浡": "㴾",
 "茺": "㵁",
 "蛇": "㵃𨫯𬠶",
 "汨": "㵆𢩎",
 "㴌": "㵈",
 "淋": "㵉䨬𫶒",
 "循": "㵌𣛝𦅑𧝩",
 "賀": "㵑𠟒𧝂𧬂𪳺",
 "寔": "㵓𠽰",
 "裔": "㵝䕍𬰏",
 "窟": "㵠𠏅𠟶𡀙𡑣𡼿𥖚𦡆",
 "雹": "㵡䥤𠿙𢶉𦡕𨣙",
 "翜": "㵤",
 "䀄": "㵥𪆮",
 "羨": "㵪𠿢𦆀",
 "孴": "㵫𫨟",
 "煮": "㵭",
 "鳳": "㵯𠏵𣝲𤪧𪈽𪋴𫄍𫘙𫲉𬐑",
 "寥": "㵳𩼶𫚬",
 "𠎤": "㵸",
 "汕": "㵹",
 "箄": "㵺𣝁",
 "冩": "㵼",
 "虢": "㶁𢸗",
 "横": "㶇𬣕",
 "螢": "㶈𢤨𤫁𥌴𪦱",
 "頣": "㶊",
 "聯": "㶌𪚁𪚄",
 "還": "㶎𡄤𣟳𧮅𨰄𫤇",
 "闖": "㶒𪞰",
 "奰": "㶔㿙𤖤",
 "簡": "㶕𡅉𣠰𨰝𪦴𫌙",
 "䋣": "㶗𤀇𫧅",
 "簟": "㶘",
 "㶋": "㶙",
 "覇": "㶚",
 "旟": "㶛",
 "㶐": "㶝",
 "曩": "㶞𡔒𣌝𣡤𨤼",
 "驛": "㶠",
 "炅": "㷖𡢴𡨶𡼷𢧾𤉭𤊽𤍘𤎚𤐗𤒂𤒧𤢙𤪃𥇏𥨤𥵐𧃬𧌚𨭼𩓺",
 "𥄷": "㷡",
 "䏻": "㷱",
 "⺙": "㷺䏿䖍𠘜𠶂𠻲𠼌𠼍𡀏𡖙𡛇𡝺𡠬𡠯𡡠𡡵𡢝𡢩𡫎𡵲𡼦𡽪𢐍𢓹𢔼𢕴𢕿𢗡𢞀𢞽𢞾𢟂𢢑𢢱𢣈𢣮𢪛𢯄𢯧𢻱𢼇𢼈𢼓𢼕𢼮𢽊𢽋𢽌𢽍𢽎𢽏𢽐𢽑𢽒𢽓𢽔𢽙𢽱𢽳𢽵𢽶𢽷𢽼𢽽𢾕𢾗𢾚𢾛𢾜𢾝𢾞𢾟𢾣𢾤𢾼𢾾𢿕𢿗𢿙𢿯𢿰𢿱𢿲𢿴𢿵𢿶𢿼𢿽𣀅𣀆𣀈𣀉𣀊𣀋𣀌𣀘𣀠𣀡𣀩𣀱𣀹𣀼𣁋𣓰𣗣𣘼𣡁𣬲𣮖𣰓𣵑𣷙𣺨𣻊𣿧𤁁𤁚𤉰𤉴𤉺𤋥𤏆𤠦𤢉𤥬𤪖𥂚𥃊𥨂𥱙𥳃𦆮𦌙𦓫𦘦𦱿𦵌𦵍𦽺𧋮𧢠𧸞𨧋𨪣𨬠𨯍𨹲𨻮𩅬𩍒𩠩",
 "靠": "㸆𣞳𨘴𨯕𫣶",
 "炙": "㸋䂹𠶨𣇧𣶋𤍙𤎢𤏝𤑃𤑗𤑩𤒗𤒣𤒧𤓏𤟙𦓟𦠁𦠹𦠹𦠺𨂂𨹾𩀲",
 "焚": "㸑𤑇𤒐𫜴𬗼",
 "牜": "㸨㸩㸪㸫㸬㸭㸮㸯㸰㸱㸲㸳㸵㸶㸸㸹㸻㸼㸽㸾㸿㹀㹁㹄㹅㹆㹇㹉㹊㹋㹌㹎㹏㹑㹒㹓㹖㹗㹘㹙㹚㹛䍧𡵣𢒢𢜓𤘕𤘖𤘗𤘘𤘙𤘚𤘜𤘟𤘠𤘡𤘢𤘣𤘥𤘦𤘪𤘫𤘬𤘯𤘲𤘳𤘴𤘶𤘷𤘸𤘹𤘺𤘻𤘼𤘽𤘾𤙀𤙁𤙃𤙅𤙆𤙇𤙈𤙊𤙌𤙍𤙎𤙐𤙑𤙒𤙓𤙔𤙕𤙗𤙙𤙚𤙛𤙜𤙝𤙞𤙠𤙡𤙢𤙤𤙥𤙦𤙧𤙨𤙩𤙪𤙫𤙬𤙭𤙮𤙯𤙱𤙳𤙴𤙵𤙶𤙸𤙹𤙽𤙾𤙿𤚀𤚂𤚃𤚄𤚇𤚈𤚊𤚍𤚏𤚐𤚑𤚒𤚕𤚖𤚗𤚘𤚚𤚛𤚝𤚞𤚟𤚡𤚢𤚣𤚤𤚦𤚨𤚩𤚪𤚫𤚬𤚮𤚯𤚰𤚱𤚳𤚴𤚵𤚺𤚽𤚾𤚿𤛀𤛁𤛂𤛃𤛄𤛅𤛇𤛊𤛋𤛌𤛍𤛏𤛐𤛑𤛒𤛔𤛘𤛛𤛜𤛞𤛟𤛠𤛡𤛢𤛣𤛤𤛥𤛦𤛧𤛨𤛩𤛪𤛫𤛬𤛮𤛯𤛰𤛲𤛳𤛴𤛵𤛶𤛷𤛸𤛹𤛺𤛼𤛽𤛾𤜀𤜃𤜄𤜅𤜆𤜇𤜈𤜉𤜊𤜋𤜌𤜍𤜎𤜏𤜐𤜑𤜒𤜓𤜖𤜗𤜙𥧷𥨘𨌽",
 "𢼡": "㹈𢿄",
 "頑": "㹕𤻆",
 "豢": "㹖",
 "矦": "㺅𡎇𨩀𪂷",
 "馵": "㺛𢶚",
 "窳": "㺠",
 "囂": "㺧䖀𠑪𡆔𬬤",
 "𠆩": "㺸",
 "㕚": "㻨𢮗𢮞𢯲𢸪𤦼𤧩𤧬𤭲𤭿𥄗𧎮",
 "畿": "㼄𦢍",
 "坫": "㼭",
 "霤": "㽌𣠚𤄐",
 "𢎘": "㽕𠮤𡴰𢎙𢎙𤜛",
 "些": "㾚𠉃",
 "姿": "㾳𤦾𪦌𬢴",
 "計": "㾵𠸥𣖟𥰇𦞍𦵗𧦕𩄊𪞴",
 "班": "㿀𠞢𠺚𢲔𣗝𦶾𨫄𩔮𩺡𪄕𪉒𪱟𬂇",
 "羣": "㿏𡑳𫌔",
 "趍": "㿐",
 "頹": "㿗𣟩𦢶𧔾𨯸",
 "耷": "㿴䐛𡍲𢝉𧪇𨨹𬭞",
 "社": "䀅𠶈𨧽",
 "漻": "䀊𦾷",
 "默": "䁿𧞾𫄓",
 "蠻": "䂅𢦈𢺳𥾃𧖣𪈿",
 "阝": "䂙䖎䘏䢳䢴䢵䢶䢷䢸䢹䢺䢻䢼䢾䢿䣀䣁䣂䣃䣄䣅䣆䣇䣊䣋䣌䣍䣎䣏䣐䣑䣒䣓䣕䣘䣙䣚䣛䣜䣝䣞䣟䣠䣡䣢䣣䣤䦹䦺䦻䦼䦽䦿䧀䧁䧂䧃䧄䧅䧆䧇䧈䧉䧊䧋䧌䧍䧎䧏䧐䧑䧒䧓䧔䧕䧖䧗䧘䧙䧚䧛䧜䧝䧞䧟䧠䧡䧢䧣䧤䧥䧦䧧䧨䧪䧫䧬䧭䧮䧯䧰𠴻𠶴𡏇𡟦𡣀𡦣𡺇𡺰𣵺𤀝𤅝𤜡𤥸𤧡𤧢𤷸𥖡𥦅𥧫𥲗𥳲𥸬𥺡𦰜𦰥𦳻𦵮𦶏𦺼𦼧𦽆𦽚𦾨𦾩𧀕𧒣𧨧𧱞𪬾𪮂𪲑𪼫𫂉𫂫𫉛𫑗𫑘𫑙𫑚𫑛𫑜𫑝𫑞𫑟𫑠𫑡𫑣𫑤𫑥𫑦𫑧𫑨𫑩𫑪𫑫𫑬𫑭𫑮𫑰𫑲𫒉𫔺𫔻𫔼𫔽𫔾𫕀𫕁𫕂𫕃𫕄𫕅𫕆𫕇𫕈𫕉𫕊𫕋𫕌𫕍𫕎𫕏𫕐𫕑𫕒𫕓𫕔𫕕𫕘𫕮𫳨𫴧𬈖𬝰𬞾𬟌𬡅𬩳𬩵𬩶𬩷𬩸𬩹𬩻𬩼𬩽𬩾𬩿𬪀𬪂𬪃𬪅𬪆𬪇𬪈𬪉𬪊𬪋𬪌𬪍𬪎𬪏𬪐𬪑𬪒𬪓𬪔𬪕𬪖𬪗𬪘𬪙𬪚𬪛𬪜𬪝𬪞𬪟𬪠𬪡𬪢𬪣𬪤𬪥𬮺𬮻𬮼𬮽𬮾𬮿𬯀𬯁𬯂𬯃𬯄𬯅𬯆𬯇𬯉𬯊𬯋𬯌𬯍𬯎𬯏𬯐𬯑𬯒𬯓𬯔𬯕𬯖𬯗𬯘𬯙𬯚𬯛𬯝𬯞𬯟𬯠𬯡𬯢𬯤𬯥𬯦𬯧𬯨",
 "砝": "䂶",
 "苴": "䃊𢯽𣕈𥠙",
 "宫": "䃔𫳓",
 "剥": "䃗",
 "礻": "䃼䃽䃾䃿䄀䄁䄂䄃䄄䄆䄇䄈䄉䄊䄋䄌䄍䄎䄏䄑䄒䄓䄔䄕䄖䄘䄙䄚䄛䄜䄝䄞䄠䄡䄢䄣䄤䄥𪄬𪠹𪧥𫀃𫀅𫀇𫀈𫀉𫀊𫀋𫀌𫀍𫀎𫀐𫀑𫀒𫀓𫀔𫀕𫀖𫀗𫀘𫀚𫀛𫀞𫀠𫀡𫀢𫀣𫆷𬒬𬒭𬒮𬒯𬒱𬒲𬒳𬒴𬒶𬒷𬒹𬒺𬒻𬒽𬒾𬒿𬓀𬓃𬓄𬓅𬓆𬓇𬓈𬓉𬓋𬓌𬓍𬓎𬓏𬓑𬓒𬓔𬓕𬓖𬓙𬓚𬓛𬓝𬫧",
 "龹": "䄅䅈䖭䞉䲍𠗲𣎎𣎒𣹸𪀲𫲂𫺉𬀴𬂉𬇦𬍢𬞳𬧃𬹘",
 "芺": "䄏𡝩𣓎𣨘𣵽𧨶𩣻𪁾",
 "已": "䄐𠖰𡉏𡴾𢩽𣅗𤏁𤣱𥮄𧿆杞邔𫧟𬀺𬜒",
 "畓": "䄕𬈔",
 "胄": "䅢䊘𦂈",
 "亰": "䅫𠡽𦂠𧤚𪋔𪴡𫮎𬷦",
 "莘": "䅸𣘘𦸯𧐞𨫽𩺵",
 "鳯": "䆇𪅔𪇃",
 "遲": "䆈𡂙𢹌𥽩𧞽𧭟𫮼",
 "諬": "䆌",
 "叫": "䆗𢫃𣌺𨦀",
 "吒": "䆛𤚧𪔘𬏨𬗍𬙳",
 "㫐": "䆞𢬒𨹎𪘄𬱝",
 "抉": "䆢",
 "淡": "䆱𠻪𢴗𥊗𥲄𦸁𧐽𨤵𩉀𫮡",
 "𩊐": "䇀",
 "仆": "䇚𢪗𥾾𦬙𨳢",
 "㦮": "䇳𡺄𣿽𥂆𥒎𥱔𩧩𬢣",
 "删": "䈀",
 "盲": "䈍䗈𡞙𤷐𥇋𦱋𨌶",
 "恢": "䈐𢉸",
 "柑": "䈤𦴑",
 "觔": "䈥",
 "限": "䈨𨵬𬮵",
 "剑": "䈩",
 "捎": "䈰",
 "格": "䈷𠺝𣗛𥂌𨃶𩹿𪄎",
 "脯": "䈻䔕",
 "梢": "䈾䔠𣻘𦄏",
 "聆": "䉁𠻠",
 "陵": "䉄䔖𠻱𡏹𡺿𡻴𢁋𨫭𪅋",
 "𠝻": "䉇",
 "觚": "䉉𦺠",
 "媚": "䉋𬛾",
 "軲": "䉐",
 "棵": "䉓",
 "殘": "䉔𥂫𦺐",
 "軨": "䉖",
 "揖": "䉗䔱𪮯",
 "棕": "䉘",
 "𤬦": "䉚",
 "㨦": "䉟",
 "摠": "䉥",
 "骹": "䉰䕧",
 "⻂": "䉱䘛䘜䘝䘞䘟䘠䘢䘣䘤䘥䘦䘧䘨䘩䘪䘬䘭䘯䘰䘲䘳䘴䘵䘶䘷䘸䘹䘺䘻䘼䘽䘾䘿䙀䙁䙂䙄䙅䙆䙇䙈䙉䙊䙋䙌䙍䙎䙏䙐䙑䙒䙓䙔䙕䙖䙗䙘䙙䙛䙜䙞䙟䙠䙡䙢䙣䙤䙥䙦䙧䙨䙩䙫䙬䙭䙮䙯䙰䙱𠖌𣿟𤇷𦽛𧘈𧘋𧘌𧘍𧘏𧘐𧘑𧘒𧘓𧘔𧘕𧘖𧘚𧘛𧘜𧘞𧘟𧘡𧘢𧘣𧘤𧘥𧘪𧘬𧘱𧘲𧘵𧘶𧘷𧘸𧘹𧘺𧘻𧘾𧘿𧙀𧙂𧙄𧙅𧙆𧙇𧙈𧙊𧙋𧙒𧙓𧙔𧙕𧙖𧙗𧙛𧙝𧙞𧙟𧙠𧙡𧙢𧙣𧙤𧙥𧙧𧙫𧙮𧙱𧙲𧙷𧙸𧙹𧙺𧙻𧙼𧙽𧙿𧚀𧚁𧚂𧚃𧚄𧚅𧚆𧚇𧚈𧚊𧚋𧚎𧚏𧚑𧚓𧚔𧚕𧚖𧚗𧚘𧚙𧚜𧚟𧚥𧚦𧚨𧚪𧚫𧚭𧚮𧚯𧚳𧚶𧚷𧚸𧚺𧚻𧚼𧛂𧛃𧛄𧛅𧛆𧛇𧛈𧛊𧛍𧛎𧛏𧛐𧛑𧛒𧛓𧛔𧛕𧛖𧛗𧛘𧛚𧛛𧛞𧛟𧛠𧛡𧛢𧛤𧛥𧛩𧛪𧛭𧛮𧛳𧛴𧛶𧛷𧛸𧛹𧛺𧛻𧛼𧛾𧜀𧜁𧜂𧜃𧜄𧜅𧜆𧜇𧜋𧜎𧜐𧜑𧜒𧜓𧜔𧜕𧜖𧜗𧜘𧜙𧜛𧜝𧜞𧜠𧜡𧜣𧜥𧜦𧜧𧜨𧜩𧜬𧜭𧜮𧜰𧜱𧜲𧜳𧜴𧜵𧜶𧜹𧜺𧜽𧜿𧝀𧝁𧝂𧝃𧝅𧝆𧝇𧝈𧝉𧝊𧝋𧝍𧝎𧝐𧝒𧝓𧝔𧝘𧝝𧝠𧝡𧝤𧝧𧝨𧝩𧝪𧝫𧝭𧝮𧝯𧝰𧝱𧝲𧝳𧝴𧝵𧝶𧝸𧝼𧝽𧞀𧞁𧞃𧞄𧞅𧞆𧞇𧞋𧞌𧞍𧞏𧞑𧞓𧞔𧞖𧞘𧞛𧞝𧞞𧞟𧞣𧞤𧞧𧞨𧞩𧞫𧞬𧞭𧞰𧞱𧞲𧞳𧞵𧞶𧞷𧞸𧞼𧞽𧞾𧞿𧟀𧟁𧟂𧟃𧟄𧟅𧟆𧟇𧟈𧟉𧟊𧟋𧟌𧟍𧟎𧟐𧟑𧟒𧟓𧟔𧟕𧟖𧟗𧟘𧟙𧟚𧟜𧟝𧟞𩆳",
 "辯": "䉸𡅼𨐾",
 "稞": "䊬",
 "簽": "䊴𠠬𢺅𣠺𣫢𫤐𬒫",
 "㪅": "䌄𠊳𠶺𡎩",
 "麻": "䌕䗫",
 "㰹": "䌠",
 "䇔": "䌱𢺆𨰊",
 "薰": "䌲𣌕𣎰𧰣𪈧𬅑𬬡",
 "⺰": "䌶䌷䌸䌹䌺䌻䌼䌽䌾䌿䍀䍁𡎭",
 "斮": "䎰",
 "𡱁": "䐅",
 "屎": "䐖𡳁𡳛𤧁𥔔𥻐𦑫𪡨𪾴",
 "冐": "䑵𢛡𢺫𢽢𣶀𫦱𬂋𬪕",
 "叜": "䑹䗏䤇䤹䩳䬒䮟𠋢𠝬𠩹𠮍𠷃𥔉𩹔𪂸",
 "符": "䒀𡠞𣘧𣻜𥮯𫙳",
 "冨": "䒄𠔸𫣕𫲮",
 "富": "䒇䔰𠾙𡡩𡬂𢠲𧬙𨬬𩍏𩯅𪆠𪧰𪷛𫙻𫣡𬁗𬋋",
 "奼": "䒲",
 "𡵆": "䒻",
 "㹞": "䓄",
 "汦": "䓋𣶌",
 "灼": "䓎𥭓",
 "𡗥": "䓐",
 "汧": "䓑",
 "远": "䓕𨙌",
 "穷": "䓖𠴛𪶉𪽱",
 "徂": "䓚𣨖",
 "泜": "䓜𥁼𦽘",
 "刹": "䓭𠝨",
 "侻": "䓲",
 "很": "䓳𢉟𧩺",
 "洐": "䓷",
 "姧": "䓸",
 "㓂": "䓻𣸦",
 "娏": "䓼",
 "記": "䓽𣉸𥱬𪡴𫂮𫍕",
 "娑": "䓾𣯌𣯢𨪍",
 "倭": "䔀𬕥",
 "狸": "䔆𢟆𩮞",
 "㻂": "䔊",
 "紗": "䔋",
 "淺": "䔐𬉰",
 "聃": "䔜𢳞𣼚",
 "犁": "䔣𠼐𩥴𬬁",
 "梅": "䔦𫂚",
 "𡙁": "䔪",
 "疎": "䔫𠽔𢵽𫑽",
 "酤": "䔯𥂰𧃗",
 "提": "䔶𠤧𠽮𡐾𣾸𥳳",
 "渴": "䔽𩅳",
 "揭": "䔾䥟",
 "迨": "䕂",
 "隂": "䕃",
 "嫂": "䕅",
 "榆": "䕆",
 "廆": "䕇𢋝𥴯",
 "牒": "䕈䥡𣛻",
 "塘": "䕋",
 "稚": "䕌𡦠𣟶𥴢𧄄",
 "福": "䕐𫴗𫴩",
 "綏": "䕑𬧗",
 "嘉": "䕒𠏼𡣗𤀺𤐵𤪘",
 "漫": "䕕𩆓",
 "遜": "䕖",
 "䛟": "䕛",
 "稱": "䕝𡚕",
 "閬": "䕞",
 "磋": "䕢",
 "褐": "䕣",
 "鄲": "䕤",
 "橑": "䕩",
 "澤": "䕪𫕵",
 "彊": "䕬𠣀𠣃𡾪𦇤𧖑𧟂𨯞𫕘",
 "瓢": "䕯𤃛",
 "燔": "䕰",
 "頭": "䕱𡾣𢸸𤃌𨯲𨷩𫷒",
 "廩": "䕲𡓔𡾭𢤭𤃢𤒢𪥀",
 "穛": "䕴",
 "鴶": "䕵",
 "護": "䕶𧅰",
 "黠": "䕸𥷫",
 "躅": "䕽",
 "𪄿": "䕿",
 "㸐": "䖄",
 "釀": "䖆",
 "卧": "䖙䭆𢛶𬛦𬛩",
 "⺸": "䖹𠈾𡴟𢐽𢽁𤀱𤙢𦏙𦏚𧨢𩧣",
 "斧": "䗄𢯋𨨞𪂀𪂥𫿿",
 "笄": "䗗𨲡𬵭",
 "筳": "䗴",
 "勵": "䘈𤄆𥗠",
 "篾": "䘊𣠉𥗥𩽣",
 "󠄄": "䛎𠱇𡪮𡫲𥋜𨝃",
 "奊": "䜁𪃤",
 "誰": "䜃𢦄𧀣𩽀𪇻𬟤",
 "⻈": "䜣䜤䜥䜦䜧䜨䜩",
 "芰": "䝸",
 "匠": "䞪𥱝𩣕𪀘",
 "亝": "䠁𠜸",
 "鄧": "䠬𡂱𡓂𢸞𣞽𧔛",
 "𣓀": "䢄",
 "⻍": "䢏𠐝𠑞𡀟𡃱𨒷𨗉𨗚𫑐𫟧𫟨𫟪巡𨗒𨗭",
 "敔": "䢩",
 "㷠": "䢯䮼𪋲",
 "供": "䣏𥯏𧨻",
 "盂": "䣿𦱃𬐟𬫢",
 "形": "䤯𡌑𥒱𧨘𨴸𩃋𪫊𫌟𬑖",
 "𡵱": "䤱",
 "斫": "䤺𥯩𦳵𬗩",
 "厝": "䥄𣯗𥕉𫠀",
 "寃": "䥉",
 "烹": "䥋𨢶",
 "㫺": "䥘𠎥𠟏𠪞𦔡𧾀𨅦𨗀𨣋𩁆𩻶𪙮",
 "麀": "䥝𤏶𤒣",
 "葴": "䥠𣿎𩼘𪇅𪒯",
 "蝱": "䥰",
 "歐": "䥲𡂿𤮥𥗄𧞨",
 "曉": "䥵",
 "㔍": "䥷",
 "汪": "䦞𠴝𡝝𤶶𥆚𪁘",
 "𡕥": "䦩",
 "鯀": "䧰𤄏",
 "迪": "䨤𣔴",
 "竛": "䨧𪋚",
 "覞": "䨳𧢅𧢞𧢬𫌥",
 "悹": "䪀",
 "桒": "䫙",
 "勼": "䬨𥫷𦜛𧺤",
 "叨": "䬭",
 "迅": "䭀𩠇𩷰𩾄",
 "附": "䮛𡍃𦝗𦱖𧨽𩷺",
 "驫": "䯂𠫑𤆀𥤡",
 "𩫏": "䯬𡓣𡾘𤅝𨟍𩫠𩫧𩫨𩫩𩫫𩫭𩫯𩫰𩫱𪈃",
 "⻥": "䲝䲞䲤𩽹𩽺𩽻𩽼𩽽𩽿𩾁𩾂𩾃𩾄𩾅𩾆𩾇𩾈𩾊𩾋𩾌𩾎",
 "酒": "䲤𤄍𦵩𫇓𬜂",
 "㦲": "䳣",
 "脉": "䳮",
 "振": "䳲𠺃𠺲𫕫",
 "寓": "䴁𠿄𣛡𪿀𫑈𫾆",
 "祿": "䴪𤐠𦽎",
 "後": "䵈𠷴",
 "⻩": "䵋䵌䵍䵎䵏䵐",
 "冑": "䶇𩍌",
 "炊": "䶴𨨢𫓿",
 "丄": "𠀄𠫟𡐪𡐪𣳄𤼿𥧘𦻏𫳇𫴡𬙕",
 "𡗚": "𠀛",
 "𠁡": "𠀞𠀞𡖄",
 "夶": "𠀤𡘙",
 "囦": "𠀯𠉢𠜟",
 "𠀃": "𠀵",
 "𣎴": "𠀶",
 "凰": "𠁉𬄑",
 "詐": "𠁙𨐷",
 "个": "𠁭𠁭𠁭𠆂𠆂𠌺𠌺𠍳𠍳𠮶𡁐𡁐𡗟𣤬𣤬𤔹𤔹𥙏𥾓𦣿𧭪𧭪𧱤𧱤𨵼𨵼𨵼𨽴𨽴𨽴𨽴𩠟𪈵𪈵𪈵𪈵𪈵𪈵𪬪𫠡𫢊𫨼𫨼",
 "𠫔": "𠂧𠏏𠟼𠫛𠬀𡇗𡑼𡞤𣏏𣠯𣴑𤔒𤩮𤩯𤴖𥆆𥒛𦓩𦤳𦺀𧋝𫀀",
 "𢆯": "𠂳𠆺𠬯𢆽𢇆𢇊𢇋",
 "甶": "𠂽𠃁𡯹𢍉𢡨𢱻𣬖𤰲𤱖𤱮𤲄𦂖𦂢𦉀𦖛𦶃𦼄𧱋𨡛𩲆𩴫𪦁𪬀𪭎𪽐𬂯𬏅𬴾𬵀𬵙",
 "𠄌": "𠃏𠄍𠄑𠮪𤌮𥾆𦫷𦮁𩑍",
 "𠂈": "𠃔𢕄𣒉𤨔𦊷𧁇𧘾𨒢𩒋𫩃",
 "飞": "𠃧𠃧𦐭𦐭𫗌𬲉",
 "𠫓": "𠃴𠋃𠘺𠭩𡇁𡝥𡡠𡽼𢏲𣓪𣰓𣼿𦁛𦜈𦣔𦧢𦯧𦺁𦺯𧚦𧛥𧤇𧨯𨁐𨁻𨏁𨓋𨓫𨕕𨛧𩷮𪺮𫎣𣫺𬉫𬖊𬗐𬫼𬬘",
 "杳": "𠄃𠫁𣇿𤉲𨓳𩠼𩭰𬇷",
 "敂": "𠄹𫉦",
 "使": "𠅚𣔤𣷱𦲺𧍅𧍇𧳡𩸲𪮈𫤄",
 "例": "𠅜𡂲𣈙𥵘𫜗𫶸",
 "𠦜": "𠅟𡚙𣞤𤍍𤣇𥷯𧝫𧞝𨘛𩁰",
 "𡰲": "𠅡",
 "北": "𠅭",
 "𠅘": "𠅶",
 "乆": "𠅺𠔨𢱿𣲄𤯖𥤳𨕜",
 "涓": "𠅻𪡵𪬙𫯗",
 "秩": "𠅼𠞠𦷍𪮞𪶵",
 "𠮥": "𠅾𠟮𬺞",
 "真": "𠆍",
 "暺": "𠆛",
 "㷊": "𠆡",
 "夯": "𠇴𠢏𤽘𨘳𪞕",
 "𡖈": "𠈎",
 "刖": "𠈛𠟖𡠔𥦹𦮯𧫌𪠰",
 "𠬞": "𠈯𠈼𠬿𠭛𠭡𠵶𠷛𡲯𡴝𢀣𢂟𦢅𦥠𦥽𦦒𦦓𨤑𨤖𪧲",
 "㳊": "𠈹𠳛𫾰",
 "叓": "𠉕",
 "乱": "𠉗𦯠𪾬",
 "𠄎": "𠉝𣱴𤆨𬃇",
 "𠀬": "𠉦𪢓𬆹𬞿",
 "㸒": "𠉰𡍛𣨮𨂘𪾮",
 "𢌿": "𠉶𡌹𪰀𫑬鼻",
 "𢇳": "𠉷",
 "⺿": "𠉾𠊁𠊃𠊠𠍑𠍔𠎐𠎕𠏒𠑏𠒌𠞝𠟽𠸖𠺈𠺊𠻶𡁐𡆜𡈌𡐢𡑷𡒹𡓽𡙠𡝄𡝅𡝴𡞁𡞴𡢫𡤄𡭆𡿟𢝨𢠍𢢮𢤘𢵎𢵖𢵙𢶬𢶭𢹕𢹹𢺊𢽔𣀱𣊀𣋯𣌏𣎙𣕸𣕺𣗦𣗩𣙊𣚋𣝰𣞦𣟞𣟟𣟶𣠅𣠩𣩣𣩾𣴭𣷎𣸽𣸿𣹀𣺋𣺛𣼏𣼑𣼒𣾁𣾖𣾘𣿯𣿴𣿻𤂙𤂣𤃦𤄠𤅖𤎗𤐥𤐰𤑋𤑻𤒑𤒷𤗥𤛟𤟓𤠛𤠨𤡞𤢁𤨷𤪜𤮡𤲱𤳙𤼱𤾴𤾼𥂯𥂿𥈣𥒴𥕩𥕪𥕾𥖈𥖰𥢇𥺯𥽚𦃝𦆏𦆬𦇋𦏡𦗫𦘃𦡐𦢁𦢃𦢐𦢘𦤅𦧹𦫳𦫴𦫶𦫷𦫸𦫻𦫼𦫽𦫾𦫿𦬀𦬁𦬂𦬃𦬅𦬆𦬇𦬈𦬊𦬋𦬌𦬍𦬎𦬏𦬐𦬓𦬔𦬕𦬖𦬗𦬘𦬙𦬚𦬛𦬜𦬞𦬠𦬡𦬢𦬣𦬤𦬨𦬩𦬪𦬫𦬬𦬭𦬮𦬯𦬰𦬱𦬳𦬴𦬵𦬷𦬸𦬹𦬺𦬽𦬾𦬿𦭀𦭁𦭂𦭃𦭆𦭈𦭉𦭊𦭐𦭑𦭒𦭓𦭔𦭕𦭖𦭗𦭘𦭙𦭚𦭛𦭜𦭡𦭢𦭣𦭤𦭥𦭨𦭩𦭬𦭭𦭮𦭯𦭰𦭱𦭲𦭳𦭴𦭵𦭶𦭷𦭸𦭹𦭻𦭽𦭾𦭿𦮀𦮁𦮂𦮃𦮄𦮆𦮇𦮈𦮌𦮍𦮎𦮏𦮐𦮑𦮒𦮓𦮖𦮗𦮘𦮛𦮜𦮝𦮞𦮟𦮠𦮡𦮢𦮣𦮤𦮥𦮦𦮧𦮨𦮩𦮪𦮫𦮬𦮭𦮮𦮯𦮰𦮳𦮵𦮷𦮸𦮹𦮺𦮼𦮽𦮾𦮿𦯁𦯃𦯄𦯅𦯆𦯇𦯉𦯊𦯋𦯌𦯍𦯎𦯏𦯐𦯑𦯒𦯓𦯔𦯕𦯖𦯗𦯙𦯚𦯛𦯜𦯞𦯟𦯠𦯡𦯢𦯣𦯧𦯨𦯩𦯪𦯫𦯬𦯭𦯮𦯯𦯰𦯱𦯴𦯷𦯸𦯹𦯺𦯻𦯼𦯽𦯾𦯿𦰀𦰁𦰂𦰃𦰄𦰅𦰆𦰇𦰈𦰉𦰊𦰌𦰍𦰎𦰑𦰒𦰓𦰔𦰕𦰖𦰗𦰘𦰚𦰛𦰜𦰝𦰞𦰠𦰡𦰥𦰧𦰪𦰫𦰬𦰭𦰮𦰯𦰰𦰱𦰲𦰳𦰴𦰵𦰶𦰸𦰹𦰺𦰻𦰼𦰽𦰾𦰿𦱀𦱁𦱂𦱃𦱄𦱅𦱈𦱊𦱋𦱌𦱍𦱏𦱐𦱑𦱒𦱕𦱖𦱗𦱙𦱚𦱜𦱞𦱟𦱤𦱨𦱩𦱪𦱫𦱬𦱭𦱮𦱯𦱲𦱳𦱵𦱷𦱸𦱼𦱾𦱿𦲀𦲁𦲂𦲃𦲄𦲅𦲆𦲇𦲈𦲉𦲌𦲍𦲎𦲐𦲑𦲒𦲓𦲔𦲕𦲖𦲗𦲙𦲚𦲛𦲜𦲝𦲞𦲟𦲠𦲡𦲢𦲣𦲤𦲥𦲦𦲧𦲨𦲪𦲯𦲰𦲶𦲷𦲸𦲽𦳀𦳁𦳂𦳃𦳄𦳅𦳆𦳇𦳈𦳉𦳊𦳋𦳌𦳍𦳎𦳏𦳐𦳑𦳒𦳓𦳔𦳖𦳗𦳘𦳙𦳚𦳛𦳝𦳞𦳟𦳠𦳡𦳤𦳥𦳦𦳧𦳨𦳩𦳪𦳫𦳬𦳭𦳰𦳱𦳳𦳴𦳵𦳷𦳸𦳹𦳺𦳼𦳽𦳾𦳿𦴀𦴁𦴄𦴅𦴇𦴈𦴉𦴊𦴌𦴍𦴎𦴐𦴐𦴑𦴒𦴓𦴕𦴗𦴙𦴚𦴛𦴜𦴝𦴟𦴠𦴢𦴣𦴤𦴥𦴦𦴧𦴨𦴩𦴪𦴫𦴬𦴭𦴮𦴯𦴰𦴱𦴲𦴳𦴴𦴵𦴷𦴸𦴹𦴻𦴼𦴽𦴾𦴿𦵀𦵁𦵂𦵃𦵄𦵅𦵆𦵇𦵈𦵉𦵋𦵌𦵍𦵎𦵏𦵑𦵒𦵓𦵔𦵕𦵖𦵜𦵝𦵞𦵟𦵡𦵢𦵣𦵤𦵥𦵦𦵧𦵨𦵩𦵪𦵫𦵬𦵭𦵮𦵯𦵰𦵱𦵲𦵳𦵴𦵵𦵷𦵸𦵺𦵻𦵼𦵽𦵾𦵿𦶀𦶁𦶂𦶃𦶄𦶅𦶆𦶇𦶈𦶉𦶊𦶋𦶌𦶍𦶏𦶐𦶑𦶒𦶓𦶔𦶕𦶖𦶗𦶘𦶙𦶚𦶠𦶡𦶢𦶣𦶤𦶥𦶦𦶧𦶨𦶩𦶪𦶫𦶫𦶬𦶭𦶮𦶯𦶰𦶱𦶲𦶳𦶴𦶵𦶶𦶷𦶸𦶹𦶺𦶻𦶼𦶽𦶾𦶿𦷀𦷂𦷃𦷄𦷅𦷆𦷇𦷈𦷉𦷊𦷋𦷌𦷍𦷎𦷏𦷐𦷑𦷒𦷓𦷔𦷕𦷗𦷘𦷙𦷚𦷛𦷜𦷝𦷟𦷠𦷡𦷢𦷣𦷥𦷦𦷧𦷪𦷫𦷮𦷯𦷰𦷲𦷳𦷴𦷵𦷷𦷹𦷺𦷼𦷽𦷿𦸀𦸁𦸂𦸃𦸅𦸆𦸇𦸈𦸉𦸋𦸌𦸍𦸎𦸏𦸐𦸒𦸓𦸔𦸕𦸖𦸗𦸘𦸙𦸚𦸛𦸜𦸝𦸟𦸠𦸡𦸣𦸤𦸥𦸦𦸧𦸨𦸩𦸪𦸫𦸭𦸮𦸰𦸱𦸲𦸳𦸴𦸵𦸷𦸸𦸹𦹁𦹂𦹃𦹄𦹅𦹆𦹇𦹈𦹉𦹊𦹌𦹍𦹎𦹏𦹐𦹒𦹓𦹔𦹕𦹖𦹗𦹘𦹙𦹚𦹛𦹜𦹝𦹞𦹟𦹠𦹡𦹢𦹣𦹤𦹦𦹨𦹮𦹲𦹷𦹽𦹾𦹿𦺀𦺁𦺄𦺆𦺇𦺈𦺉𦺊𦺋𦺌𦺍𦺎𦺐𦺑𦺒𦺓𦺔𦺕𦺖𦺗𦺘𦺙𦺚𦺛𦺝𦺞𦺟𦺠𦺡𦺢𦺣𦺤𦺥𦺦𦺨𦺩𦺪𦺫𦺬𦺭𦺮𦺯𦺰𦺱𦺴𦺷𦺸𦺹𦺺𦺻𦺼𦺽𦺾𦺿𦻀𦻁𦻂𦻃𦻄𦻅𦻈𦻉𦻊𦻋𦻍𦻐𦻑𦻒𦻓𦻔𦻕𦻖𦻗𦻘𦻙𦻚𦻛𦻜𦻝𦻞𦻟𦻠𦻡𦻢𦻣𦻤𦻥𦻦𦻧𦻨𦻩𦻪𦻫𦻫𦻬𦻭𦻯𦻰𦻱𦻲𦻳𦻴𦻵𦻶𦻷𦻸𦻹𦻺𦻻𦻼𦻽𦻾𦻿𦼀𦼁𦼂𦼄𦼅𦼆𦼇𦼉𦼊𦼋𦼍𦼎𦼏𦼐𦼑𦼒𦼓𦼕𦼖𦼗𦼘𦼙𦼡𦼢𦼦𦼧𦼩𦼪𦼫𦼭𦼮𦼯𦼰𦼱𦼲𦼳𦼴𦼵𦼶𦼸𦼹𦼻𦼼𦼽𦼾𦼿𦽀𦽁𦽂𦽃𦽄𦽅𦽆𦽇𦽈𦽊𦽋𦽌𦽎𦽏𦽐𦽑𦽒𦽓𦽔𦽕𦽖𦽗𦽘𦽙𦽚𦽛𦽜𦽝𦽞𦽟𦽠𦽡𦽢𦽤𦽥𦽦𦽧𦽨𦽩𦽪𦽫𦽬𦽮𦽯𦽳𦽴𦽵𦽶𦽷𦽸𦽹𦽺𦽻𦽼𦽽𦽾𦽿𦾀𦾁𦾂𦾃𦾄𦾅𦾆𦾈𦾉𦾊𦾋𦾌𦾍𦾎𦾐𦾒𦾗𦾛𦾟𦾡𦾧𦾪𦾬𦾭𦾮𦾯𦾰𦾱𦾲𦾳𦾴𦾵𦾶𦾷𦾸𦾹𦾺𦾼𦾽𦾾𦾿𦿀𦿁𦿂𦿃𦿄𦿅𦿆𦿈𦿊𦿋𦿍𦿎𦿏𦿐𦿒𦿓𦿔𦿖𦿗𦿙𦿞𦿠𦿡𦿣𦿤𦿥𦿦𦿧𦿨𦿩𦿪𦿫𦿬𦿭𦿮𦿯𦿰𦿱𦿲𦿳𦿵𦿹𦿺𦿻𦿼𦿽𦿾𦿿𧀀𧀁𧀂𧀃𧀄𧀇𧀈𧀉𧀊𧀋𧀌𧀎𧀔𧀕𧀖𧀗𧀘𧀙𧀚𧀛𧀝𧀠𧀡𧀢𧀣𧀤𧀥𧀦𧀩𧀪𧀫𧀬𧀭𧀮𧀯𧀰𧀲𧀳𧀴𧀵𧀶𧀷𧀸𧀹𧀺𧀻𧀼𧀾𧀿𧁀𧁂𧁃𧁄𧁅𧁆𧁉𧁊𧁋𧁎𧁏𧁑𧁒𧁓𧁔𧁕𧁖𧁖𧁗𧁘𧁚𧁛𧁝𧁞𧁟𧁠𧁡𧁢𧁣𧁤𧁥𧁦𧁧𧁨𧁩𧁪𧁬𧁭𧁮𧁯𧁰𧁱𧁲𧁻𧁼𧁽𧁾𧁿𧂀𧂁𧂂𧂃𧂄𧂅𧂆𧂇𧂈𧂉𧂊𧂋𧂌𧂍𧂏𧂐𧂒𧂔𧂖𧂗𧂘𧂙𧂚𧂛𧂜𧂞𧂠𧂢𧂣𧂤𧂦𧂧𧂩𧂪𧂫𧂭𧂮𧂯𧂰𧂱𧂲𧂳𧂴𧂵𧂶𧂷𧂸𧂹𧂺𧂻𧂼𧂾𧂿𧃀𧃁𧃂𧃃𧃄𧃆𧃇𧃈𧃉𧃍𧃎𧃏𧃐𧃑𧃒𧃓𧃔𧃕𧃖𧃗𧃘𧃙𧃛𧃜𧃞𧃡𧃢𧃣𧃤𧃥𧃦𧃧𧃨𧃩𧃪𧃫𧃬𧃭𧃮𧃰𧃸𧃺𧃻𧃽𧃾𧃿𧄀𧄁𧄂𧄃𧄄𧄆𧄇𧄉𧄋𧄍𧄎𧄏𧄐𧄑𧄒𧄔𧄕𧄖𧄗𧄘𧄙𧄚𧄛𧄜𧄝𧄞𧄟𧄡𧄢𧄤𧄦𧄧𧄨𧄩𧄪𧄫𧄬𧄭𧄮𧄰𧄱𧄶𧄷𧄸𧄹𧄺𧄻𧄽𧄾𧄿𧅀𧅁𧅂𧅃𧅄𧅅𧅆𧅈𧅉𧅊𧅋𧅍𧅎𧅏𧅐𧅑𧅒𧅓𧅔𧅖𧅗𧅘𧅙𧅚𧅛𧅜𧅝𧅠𧅡𧅢𧅤𧅥𧅧𧅨𧅩𧅮𧅯𧅰𧅱𧅲𧅳𧅴𧅵𧅶𧅷𧅹𧅺𧅻𧅼𧅽𧅾𧆁𧆃𧆅𧆆𧆇𧆈𧆊𧆋𧆍𧆎𧆏𧆐𧆑𧆒𧆓𧆔𧆖𧆗𧆘𧆙𧆚𧆾𧈋𧊝𧊬𧊮𧋪𧋫𧌺𧏊𧒚𧒣𧓡𧔏𧔐𧔕𧔩𧔴𧕏𧕷𧗆𧗘𧜒𧞤𧢖𧢤𧨄𧪋𧪐𧬖𧬝𧬺𧭪𧭽𧮁𧮉𧯷𧲒𧽹𨖗𨖘𨗪𨘎𨘏𨘦𨙊𨝒𨝥𨟂𨟔𨤞𨧈𨨈𨨉𨪪𨬛𨮤𨯍𨰗𨹯𨼙𨼜𨼞𨽣𩁩𩇡𩇥𩍁𩎁𩎐𩏕𩐷𩔎𩕕𩘡𩟌𩥒𩦭𩪒𩱀𩵊𩸌𩸚𩹋𩻧𩼑𩼚𩼥𩼰𩼻𩽃𩽭𩽮",
 "𠜎": "𠊏",
 "㕻": "𠊑𠝒𡌮𩭸",
 "泣": "𠊔𠴹𢔆𢯛𦲷𨂖𩃜𪷥𬈢𬉙",
 "㝵": "𠊚𠊛𣈗𣈜𤊢𥇹𥋹𧍋𪖭𪝯𫎹𫥐𫴮",
 "妬": "𠊜𣔧𥯉𪥾𪦆",
 "㢲": "𠊨𫅈",
 "𦤶": "𠊷𡍶𡟹",
 "𧟥": "𠊼",
 "㓨": "𠋙",
 "𦚉": "𠋚",
 "㚆": "𠋩",
 "宦": "𠋪𫐸",
 "圄": "𠋼",
 "𡋲": "𠋿𠞐𢲖𩮢",
 "𤔍": "𠌀",
 "𠯌": "𠌁𠙏𠳈",
 "乄": "𠌂𠌂𠌂𠌂",
 "⺾": "𠌅𠐐𠓅𠙥𠟝𠣲𠰱𠶙𠸔𠺹𡃻𡄀𡆖𡍙𡑵𡒝𡮃𡳵𡳶𢅷𢆆𢣍𢺍𣃕𣓤𣗊𣷝𤀚𤋔𤍞𤏑𤏱𤑮𤑻𥟌𥟼𦎕𦫺𦬑𦬶𦭌𦭍𦭎𦭏𦭞𦭦𦭧𦭪𦮕𦮱𦮲𦮴𦮶𦮻𦯂𦯶𦰟𦰢𦰣𦰤𦰨𦰩𦱆𦱔𦱘𦱝𦱰𦱱𦱽𦲫𦲭𦲮𦲲𦲳𦲴𦲵𦲺𦲻𦲼𦲾𦲿𦳢𦳯𦴆𦴇𦴏𦴡𦵗𦵘𦵙𦵚𦵛𦵠𦵹𦶜𦶝𦶞𦶟𦷩𦷬𦷭𦷾𦸻𦸼𦸽𦸾𦸿𦹥𦹩𦹫𦹭𦹰𦹱𦹳𦹴𦹶𦹹𦹺𦹻𦺅𦺜𦻎𦻏𦼚𦼛𦼜𦼝𦼞𦼠𦼣𦼤𦼥𦼨𦽉𦽍𦽰𦽲𦾑𦾓𦾕𦾖𦾘𦾙𦾚𦾞𦾢𦾣𦾤𦾥𦾦𦾨𦾩𦾫𦿇𦿚𦿛𦿜𦿝𦿶𦿷𦿸𧀏𧀐𧀑𧀒𧀓𧀜𧁐𧁴𧁵𧁶𧁸𧁺𧂬𧃋𧃌𧃲𧃳𧃶𧃷𧄥𧄲𧄵𧅕𧅫𧅿𧆀𧆂𧆄𧆌𧋞𧕭𧖡𨐉𨕷𨟗𨦵𨨭𨬘𨮇𨼲𩓜𩜙𩝃𩞴𩞶𩥸𩵉𩼺",
 "俗": "𠌋𠑉𠸘𫤈",
 "蚊": "𠌒𡦉𧏎",
 "𧴮": "𠌗",
 "𡇢": "𠌛",
 "宭": "𠌣",
 "奞": "𠌱",
 "𣥶": "𠌹",
 "㷀": "𠌻",
 "莪": "𠌾𪦙",
 "𢈻": "𠌿",
 "涷": "𠍀",
 "敏": "𠍁𠽊𢄯𤨨𥼖",
 "𣦼": "𠍇𠠋𡋹𬋁",
 "㲋": "𠍈𡅛𣬒𪱫𫧉𫬌𫱦𫴕𫿅𬆺𬉖𬉱𬍹𬛨𬪰",
 "貮": "𠍎𨫮",
 "侗": "𠍟",
 "谻": "𠍠",
 "𧙏": "𠍡𫈶",
 "排": "𠍣𠼕𡀪𫄐𫿟",
 "貶": "𠍥𢵉𬜎",
 "䝨": "𠍦𪬡𪬼𫎤",
 "欷": "𠍫",
 "𠷎": "𠍻𡑏𪆇",
 "歺": "𠎀𠗗𡛝𤖈𥂥𦍲𦘖𦚛𦥋𦸟𩗦𩛈𬆖𬆙𬋿𬥡𬦊",
 "期": "𠎞𫂣𬄙",
 "值": "𠎟",
 "給": "𠎨𢵰",
 "屡": "𠎪𡳵𡳶𤮒𦧃𪨞𪨠𪮴𫄄𫫵𫵫𫵭𬉆",
 "竹": "𠎬𠐫𠼒𡀤𡅣𡒞𡔄𡤷𢅶𢎉𢨠𢶠𢸕𢸽𢹢𢺣𣖯𥬂𥬧𥭷𥭹𥭼𥮃𥮄𥮌𥮿𥯐𥯵𥰀𥰎𥰑𥰒𥰓𥰕𥰖𥱋𥱎𥱏𥱐𥱔𥱗𥱚𥱡𥱢𥱣𥲓𥲸𥲹𥲺𥳂𥴀𥴁𥴃𥴄𥴉𥴎𥴏𥴒𥴒𥴚𥵁𥵃𥵋𥵌𥵎𥵘𥵙𥵸𥵻𥶧𥷌𥷍𥷵𥷶𥷹𥷹𥷹𥷹𥷻𥸇𥸏𥸒𥸖𨗹𨘥𨘻𪇙𪈅𪈣𪠿𫁰𫁱𫁲𫁳𫁴𫁵𫁶𫁷𫁸𫁹𫁺𫁻𫁼𫁽𫁾𫁿𫂀𫂁𫂂𫂃𫂄𫂅𫂆𫂇𫂈𫂉𫂊𫂋𫂌𫂍𫂏𫂐𫂑𫂒𫂓𫂔𫂕𫂖𫂗𫂘𫂙𫂚𫂛𫂜𫂝𫂞𫂟𫂠𫂡𫂣𫂤𫂥𫂦𫂧𫂩𫂫𫂬𫂭𫂯𫂰𫇸𫞽𫞿𥲀𫾟𬔬𬔭𬔮𬔯𬔰𬔱𬔲𬔳𬔴𬔵𬔶𬔷𬔸𬔹𬔺𬔻𬔼𬔽𬔾𬔿𬕀𬕁𬕂𬕃𬕄𬕅𬕆𬕇𬕈𬕉𬕊𬕋𬕌𬕍𬕎𬕏𬕐𬕑𬕒𬕔𬕕𬕖𬕗𬕘𬕙𬕚𬕛𬕜𬕝𬕞𬕟𬕠𬕡𬕢𬕣𬕤𬕥𬕦𬕧𬕨𬕩𬕪𬕬𬕭𬕮𬕯𬕰𬕱𬕲𬕴𬕵𬕶𬕷𬕸𬕻𬕽𬕿𬖀𬖁𬖂𬖃𬖄𬖇𬖈𬖊𬯤𬳕",
 "卅": "𠎰𠯢𢌽𢌽𤽒𦬢𦱴𪥙𫭜",
 "萅": "𠎲",
 "𡲫": "𠎴",
 "𢜤": "𠎹",
 "遁": "𠎻𡀷𡮽𢶿𣜲𨆛𨮐",
 "煢": "𠎽𢶇𦽓",
 "蛾": "𠏃",
 "𠪕": "𠏊𬔨",
 "楆": "𠏕",
 "跬": "𠏠",
 "𡸈": "𠏥",
 "匆": "𠏨𠰯𠱱𠼥𢟶𢴃",
 "賫": "𠏱𫣲",
 "寡": "𠏶",
 "𡖇": "𠐂𡖹𪤺𪤿𫯗",
 "𡬽": "𠐆𢷋",
 "豎": "𠐊𧞫",
 "𡪺": "𠐏",
 "眼": "𠐗𠽗𡈟𡙵𡡆𣊕𣙧𣼹𧁊𨢻𫺻",
 "䴡": "𠐚𪇾",
 "瞏": "𠐛𡣱𢸃𣞲𤪹𥌡𦇏𦍆𦒬𧔘𧭴𨏙𨘣𨷤𩯴𬙫",
 "𠶷": "𠐥𣚍𣽢",
 "導": "𠐵",
 "堆": "𠐸𠼲𡳪𣊌𣙇𣙯𣼭𤍫𥊖𦟿𧐻𨄟𨄺𨬉𩅚𪅧𫉊𫮥",
 "畨": "𠐹𫇍",
 "䫏": "𠐾",
 "賸": "𠑇",
 "傘": "𠑋𦅮𬠮",
 "𨶒": "𠑑",
 "𩘚": "𠑒",
 "仰": "𠑕𦯒𨦪𩣍",
 "語": "𠑕𡂂𡈰𢣸𤻭𫤋",
 "寵": "𠑙𨰧",
 "茍": "𠑛𠣷",
 "𣍘": "𠑤𡅰𢥱𣡘𤅍𤓗𥽾𧅝𧟔𨙠𨤇",
 "籌": "𠑥𢥰𤅕𫾡",
 "饒": "𠑬𡆁𥍘𦈂𦣗𩰈",
 "轟": "𠑭𡆀𢺩𣡴𨰵",
 "域": "𠑵𪅫",
 "哲": "𠑵𠹗𢲃𣻂𥉭𦄃𧎴𩺢",
 "𠦄": "𠒖𠦪𡜦𪶗𫖐桒賁鼖",
 "床": "𠒥𠳹𢃅𢭩𦀾𨁤𨌟𨧖𪁱𪲝𫷰𬕌𬸐",
 "𡋰": "𠒶",
 "𣗥": "𠒹𫂧𬄸𬛰",
 "包": "𠓨𠝇𢄝𢵖𢶭𣁈𣭚𦼀𦾀𧙘𧛍𧮌𧲼抱",
 "榫": "𠓼",
 "𡆪": "𠔓𣓟",
 "𢌬": "𠕍",
 "𠔄": "𠕏",
 "卑": "𠕩𠩲𣈢𤾁𥀷𥼊𧅵",
 "棹": "𠕭𥴙",
 "𠕻": "𠖈𠖝𠖞𠖤𠖨𠜍𢒎𪹎",
 "𧰬": "𠖔𡩵",
 "了": "𠖭𠚚𡤼",
 "㸦": "𠖱𣏛𣲐𥫻𥾙𦬤𧥯𧿓𩵯",
 "刵": "𠗜",
 "𠜊": "𠗢",
 "珍": "𠗰𣹗𦾂𫳚",
 "烈": "𠗹𠺅𢟏𤍅𤹐𦤭𦶣𧏲𨃻𩄰𪶭𫊔𬟜",
 "罧": "𠘏",
 "凊": "𠘒",
 "溤": "𠘔",
 "艸": "𠙢𠱭𡳡𢄆𢘿𢠞𢨎𢨢𣞆𤀻𤍚𦬟𦬦𦬧𦭫𦮅𦯤𦯥𦱠𦱠𦱴𦱹𦱹𦲬𦶛𦶛𦷶𦷶𦷻𦹼𦺂𦽣𦽱𦽱𦿑𦿑𧀍𧂥𧛬𨑆𨒽𨙏𨴔𨵑𩇿",
 "接": "𠙤𤮌𦌈𪡸𬵤",
 "㘠": "𠚝𪶑",
 "𠙼": "𠚟𠯃𡕉",
 "𠧒": "𠚱𡵊𡵋𪗚",
 "屶": "𠛕",
 "𠕎": "𠛧𡜃𬃄",
 "坓": "𠜚",
 "岝": "𠜿",
 "𠔉": "𠝂𪪥𪱪𪾕𫉠𫉫𫙝𬇥𬫒",
 "𠁣": "𠝎𫡆𬦏",
 "𠃛": "𠝎",
 "怛": "𠝗𠶒𦝇𬄮𬗥",
 "庣": "𠝡𢊙𣂁",
 "歬": "𠝣",
 "窋": "𠞀𡺴",
 "茦": "𠞁",
 "𤈕": "𠞎",
 "盌": "𠞚",
 "莢": "𠞦",
 "釗": "𠞾𠺓𦄈",
 "𧴵": "𠞿𠥘",
 "崟": "𠟁𣙌",
 "䇪": "𠟅",
 "貲": "𠟓𠽷𣚁𦺱𨝳",
 "棸": "𠟕𨝮",
 "刮": "𠟥𠵯𢯔𣈛",
 "𢆙": "𠟳",
 "㓤": "𠟸𫶚",
 "箋": "𠠀𣝕",
 "𠨣": "𠠇",
 "剛": "𠠊𡬼𪮚𫅙𬌧",
 "蔈": "𠠕",
 "𥧡": "𠠖",
 "罃": "𠠜𫬨",
 "初": "𠠭𠸗𢮀𦁅𩷞𪁲𪯨𫋶",
 "僭": "𠠭𧹿",
 "羼": "𠠮𢺟𬳲",
 "汋": "𠡑",
 "兀": "𠡕𢙒𢙙𣇈",
 "刘": "𠡖𦀑",
 "靣": "𠡳𡞎𣮗𥧘𪎎𫪓𬍭𬗟𬹃",
 "笞": "𠢙𢲹𣘜𨖎",
 "𠡠": "𠢫𠢷",
 "蓽": "𠢽",
 "匃": "𠣣𡘅𤡡",
 "匇": "𠣨𠣨𧻌",
 "勺": "𠣩𠤉𦲂",
 "羍": "𠣮𠶿𣖂𣿔𥈖𥷴𦂡𦎝𦝯𨂨𨔶",
 "𠙽": "𠣲𠫻𫡺",
 "𡘆": "𠣻𡝻𨂍𨨆𨺈𪝄𪟉𪥚𫋾𫪖",
 "𥘾": "𠤃𫽩",
 "渚": "𠤆𠹲𡤊𡪦𢵻𣚫𣜾𥢳𦼥𧸓𩅻𪦜𪱅𪳼𬛒𬩅",
 "𣅍": "𠤪",
 "㒵": "𠥁𡯬𪟇𫺏",
 "杦": "𠥂",
 "𢁺": "𠥃",
 "彼": "𠥌𠪍𠳩𠶎𡮌𢜢𢯏𣔓𣤳𣷭𥓳𥨑𦋕𩏃𩕂𩜔",
 "彀": "𠥚",
 "𠥓": "𠥧𠥩𠥪",
 "𠦃": "𠦔𤡶𦾙𨓄𩞑𩞳",
 "矾": "𠦦",
 "枚": "𠦩𠶣𡮋𢆧𣈕𤷠𥯍𦁼𦩚𦲲𧛉𨨦𩃝𩘄𩜫𩸳𪂜𪜚𪝅𪿥𫋿𫥏𬂸",
 "𣳨": "𠦭",
 "称": "𠦿𠺰𨃾",
 "㒷": "𠧯",
 "昺": "𠨈𡹾",
 "𢎟": "𠨓𠨓",
 "坊": "𠩝",
 "伯": "𠩡𢍑𣨔𣵁𦀪𦪥𦯉𦼑𦿛𧇚𧎧𧑲𨘐𨘐𨵁𩥥𪡈𪥷𪧐𫼻𬂺𬡹",
 "忺": "𠩦",
 "孥": "𠩨",
 "杴": "𠩱𦰻",
 "暈": "𠪷𣜸𦅿",
 "壁": "𠫀𢸵𤃎𧂸𧕀𫕶𫤃𬐀𬩮",
 "苔": "𠫅𠫆𢰥𣹓𤠂𥀌𧄈𨃐𩌂𪞅𫉳𬟖𬨴",
 "灥": "𠫐",
 "𠪥": "𠫒𠫒𠫒",
 "㕕": "𠬆",
 "補": "𠬕𠬖𡀨𨗗",
 "廾": "𠬺𡪃𡲱𢌱𣍹𣬓𤁌𤉻𥫲𦅳𦥸𦩎𦬠𦬧𦮘𦯸𦱤𦲇𦲈𦴰𦴳𦵝𦶪𦶭𦶯𦸳𦹈𦹉𦹊𦹍𦻟𦻠𦻡𦻢𦻣𦻥𦻦𦻧𦻨𦽷𦽸𦽹𦽻𦿠𦿢𦿣𦿤𦿥𧁕𧁗𧁻𧂱𧂳𧂵𧃺𧃻𧄫𧅎𧅏𧆁𧆚𧘬𧯭卉𢌱𥃲",
 "叒": "𠭀𠭚𠭞𠭨𢬏𢶣𣑚𣜖𣜗𣿫𦀁𪧙𪵽𬷒",
 "𠦏": "𠭕",
 "𢑚": "𠭙𠭜𥋀𥛃𧍺𩃿",
 "叩": "𠭞𦱡𬦨𬫈𬫜",
 "𠃬": "𠭵𡕪𣪐𣵬𤃕𥲅𦒇",
 "𠬜": "𠮖𤕩",
 "尐": "𠯙𢪍𣧖𣲡𧉍",
 "什": "𠯰𠶆𦬯𨑮𪭡",
 "仃": "𠯼𣫲𪺓",
 "氹": "𠱁𢫁𬧴",
 "凸": "𠱂𢫋𫥷",
 "弐": "𠱌",
 "犯": "𠱍𣳜𦴮",
 "汗": "𠱢𡊺𣆙",
 "托": "𠱹𡱩𢭑𣨰𣴜𫊴𫵟",
 "氽": "𠲈𪤦𪷫",
 "対": "𠲝𢇉𢙪𢬭𣋇𧻐𨒻𩛜𪫼𪶊𫴬𬁏𬉪𬗔𬩛",
 "扛": "𠲞𢬀",
 "件": "𠲟𡋚𣴓𤞗𪁃𪜓",
 "礼": "𠲥𡋀𢙔𢬦𣉷𣑶𥘶𥘷𥙒𥙓𥙧𥙩𥙪𥚄𥚅𥚇𥚤𥚥𥚯𥛉𥛭𥜤𨦂𩷋𫓳𫩉𫩵𫩶𫰣𫸱𬒸𬒼𬓐𬓓𬯰",
 "吆": "𠲭",
 "投": "𠲴𡷠𥦆𫽌𫽟",
 "𢦒": "𠳆𢧬𢧸𢨚𢨢𣒭𣴮𤈮𦛹𧚝𨌏𨛚𨠾",
 "扯": "𠳏",
 "抑": "𠳑",
 "佢": "𠳔",
 "扱": "𠳖𥮁",
 "改": "𠳚𣒵𥦄𦀻𫏍𫼿𫿐",
 "佉": "𠳷𨴿",
 "努": "𠴂𢭵",
 "阮": "𠴉𢭫𢴝𦰟𪮀𪲭𫆻",
 "拋": "𠴋𤽵𦰖",
 "忸": "𠴐𦁁𦛾𫭵",
 "𦬑": "𠴑",
 "伶": "𠴒𬍦",
 "低": "𠴓𡌠𦰣𩃐𫢵𬺙",
 "妙": "𠴕𢭼𥭝𦯷𨁭𪝹𪴽𪶋𫁐",
 "村": "𠴘𢚳𦀹𦛻𨴺𬂨𬗽",
 "伴": "𠴞𡖱𢭬𣵲𦁂𪨠",
 "羋": "𠴟",
 "㕞": "𠴪",
 "周": "𠵁",
 "担": "𠵆𦏄",
 "妹": "𠵈𦳀𦾇𨨓",
 "匼": "𠵏𫽆",
 "怯": "𠵐𢝍𢯖",
 "㐩": "𠵡",
 "叀": "𠵤𢮨𫦂𫩄𫸜𬘄𬨽𬹢",
 "㞋": "𠵳𦟓𬨅",
 "披": "𠵿𣈓𦰽𩸉𫰷𬐌",
 "罙": "𠶀𤀻𨨥𫎩𬤂",
 "玩": "𠶃𬕎",
 "坡": "𠶊𣔡𤊫𤷵𪸁",
 "芥": "𠶋𦄶",
 "迎": "𠶐𥈁𨓑𫤏",
 "凵": "𠶑",
 "怪": "𠶔𢯑𬏴",
 "妸": "𠶚",
 "性": "𠶞",
 "押": "𠶟",
 "油": "𠶢𣓐𩭶𫈜",
 "宆": "𠶥",
 "庙": "𠶦𫮂𬳙",
 "拙": "𠶯𡮍",
 "厒": "𠶲𧨵𩯾",
 "紇": "𠶹",
 "𢈊": "𠷄",
 "茁": "𠷅𢱝𢱞𣖠𣙸𤋿",
 "苲": "𠷆𧩳",
 "迦": "𠷉𪳇",
 "𢏚": "𠷎𠼡𠾉𡃮𡑹𡕋𢅂𢅱𢢧𢶈𢿟𣚑𣪾𣫟𣾭𤎧𤛴𤩈𤲮𤺜𤾊𤾦𥛇𥜣𦒛𦒯𦓃𦦺𦺚𨅡𨣊𩘿𩤫𩦑",
 "虽": "𠷣𧪎𪨈𬄶",
 "勉": "𠷦𢱍𣈳𤧔",
 "哂": "𠷻",
 "怎": "𠷿",
 "拏": "𠸎𡰀𢜲𣸏𤸻",
 "炶": "𠸞",
 "侍": "𠸤𣹘",
 "看": "𠸦𡙍𡩒𡺗𣕻𣪦𥈧𦞖𨩢𪮑𪮒𪿁𪿃𬋭",
 "恪": "𠸧𥯚",
 "陋": "𠸳𡩊𪶾",
 "𨒒": "𠸼",
 "迡": "𠸽",
 "𦚖": "𠸾",
 "𠧢": "𠸿𡪥",
 "疵": "𠹂𣖲𦶉",
 "恭": "𠹅𢞺𣺖𤧴𤲻𥔸𦷧𧎦𧫃𪹼𫱔𫺯",
 "眈": "𠹆",
 "烋": "𠹎𢊒",
 "豹": "𠹕𥔰𦷒𪕺",
 "攻": "𠹣",
 "陛": "𠹯",
 "荄": "𠹽𢲧𣘃𤼞𦃮𦟍𨐮𨢟",
 "𡘤": "𠺄𡩯𢊊𢍤𢞷𢲅𪿬𫂑𫈸𬳡",
 "套": "𠺆𣺮𥱫𨻝𪄤𫯾",
 "閅": "𠺉",
 "翅": "𠺏",
 "畝": "𠺖",
 "荖": "𠺜𤧳𩺆𪙐𫃊",
 "欬": "𠺡𤸺",
 "剝": "𠺣",
 "借": "𠺦𡩤",
 "恥": "𠺨",
 "俸": "𠺭𣻈𪫊𫠷",
 "恐": "𠺱𢟈𦃵𦶐𫻐",
 "茖": "𠺴",
 "祝": "𠺷𡎺𣘌𤹙𨃷",
 "級": "𠺻",
 "𥸷": "𠺼",
 "珠": "𠺾𢟐𨪥𫂒",
 "砭": "𠻅𫱑",
 "宴": "𠻈𡏉𡪻𥉛𦶳",
 "珞": "𠻐",
 "郗": "𠻑",
 "梏": "𠻧",
 "窕": "𠻩𡡃",
 "悊": "𠻯",
 "現": "𠻷𡠝𡩮𣎔",
 "添": "𠻹",
 "掗": "𠻺",
 "閉": "𠻻𡠳𡮣𡮤𡮥𡮩𢲾𣘥𤛞𦟼",
 "荳": "𠻼",
 "梅": "𠻽𡠫",
 "做": "𠼏",
 "偽": "𠼮",
 "停": "𠼵",
 "偃": "𠼸𪅬",
 "惮": "𠼺",
 "莩": "𠼼𦟵",
 "偶": "𠽀𢠉𢠙𣼱𦸲",
 "弾": "𠽂",
 "探": "𠽄",
 "訥": "𠽆𤹽𦄠",
 "氵": "𠽇𡐵𡙯𢞾𢟞𢲯𣓥𣝨𥁤𥂆𥞟𥱒𥲂𥳻𥹦𦑸𦺌𦻈𪜚𪫆𪬓𪭕𪲚𪵩𪵫𪵬𪵭𪵯𪵰𪵱𪵲𪵳𪵷𪵸𪵹𪵺𪵻𪵽𪵾𪶀𪶁𪶃𪶄𪶅𪶆𪶈𪶉𪶊𪶋𪶌𪶍𪶎𪶐𪶑𪶒𪶓𪶔𪶕𪶖𪶗𪶘𪶙𪶜𪶝𪶞𪶠𪶡𪶢𪶣𪶤𪶥𪶦𪶧𪶨𪶩𪶪𪶫𪶬𪶭𪶮𪶯𪶱𪶲𪶳𪶴𪶵𪶶𪶷𪶸𪶹𪶺𪶻𪶽𪶾𪶿𪷁𪷃𪷄𪷅𪷆𪷇𪷈𪷉𪷊𪷋𪷌𪷍𪷎𪷏𪷐𪷑𪷒𪷓𪷕𪷖𪷗𪷘𪷙𪷚𪷛𪷜𪷝𪷞𪷟𪷠𪷢𪷤𪷦𪷧𪷨𪷩𪷫𪷬𪷭𪷯𪷰𪷱𪷲𪷳𪷴𪷵𪷷𪷸𪷺𪷻𪷼𪷽𪷾𪷿𪸀𪸂𪸅𪸆𪸇𪸈𪸉𪸋𪸌𫉰𫞗𫞘𫞙𫞚𫞛𫞜𫞝𫞞汎𣲼海浩浸涅港湮㴳𣻑淹𣽞𣾎濆瀹瀛㶖𬇕𬇖𬇗𬇘𬇙𬇚𬇛𬇝𬇞𬇟𬇠𬇡𬇢𬇣𬇤𬇥𬇨𬇩𬇪𬇫𬇬𬇯𬇰𬇱𬇲𬇳𬇴𬇵𬇷𬇹𬇺𬇼𬇽𬇿𬈀𬈁𬈂𬈃𬈇𬈉𬈋𬈌𬈍𬈎𬈏𬈐𬈑𬈒𬈔𬈕𬈖𬈗𬈘𬈙𬈜𬈝𬈟𬈠𬈣𬈥𬈦𬈧𬈨𬈩𬈪𬈫𬈬𬈭𬈮𬈯𬈱𬈲𬈳𬈵𬈶𬈷𬈸𬈹𬈺𬈼𬈿𬉀𬉁𬉂𬉃𬉄𬉆𬉇𬉈𬉉𬉊𬉋𬉌𬉍𬉎𬉏𬉑𬉒𬉓𬉔𬉕𬉗𬉛𬉜𬉠𬉡𬉢𬉣𬉤𬉥𬉦𬉧𬉩𬉫𬉬𬉭𬉮𬉲𬉳𬔦𬟚",
 "深": "𠽉𡪜𦸂𪒗𪮨𬔒",
 "涯": "𠽎𦹹",
 "陷": "𠽏𥊥𨄽",
 "豉": "𠽑𡻧",
 "假": "𠽙𣘟𦹜𪝪𫖄",
 "混": "𠽞𦹲",
 "減": "𠽦𣚘𣼪𣾃𤁙𥳒𦺘𬐴",
 "湆": "𠽪",
 "堤": "𠽯",
 "寋": "𠽱𡼌𧝱",
 "犂": "𠾆",
 "棄": "𠾍𣙆",
 "税": "𠾔",
 "嵌": "𠾨",
 "棒": "𠾴",
 "揸": "𠾵",
 "絶": "𠾼",
 "湿": "𠾾",
 "插": "𠿂",
 "媒": "𠿃𥴘𬄪𬲞",
 "萑": "𠿅𦼉𦾔𧂴𨞂𨬶𬞓𬥱",
 "粵": "𠿋𪦪",
 "煎": "𠿏𢶕𣜭𧬫",
 "䪞": "𠿓𡢭",
 "虜": "𠿛",
 "歅": "𠿣",
 "𦞅": "𠿥𡣃𧬴",
 "瑞": "𠿩𥵇",
 "筲": "𠿫",
 "飭": "𠿰",
 "售": "𠿲𡙬𧃼",
 "碍": "𠿴𢣀𦡡𫣣",
 "準": "𠿶𨆒",
 "閙": "𠿷𢷃𣿸𤐛𩦔𫆺",
 "萼": "𠿸",
 "賃": "𠿹",
 "斟": "𡀃𨮊",
 "壼": "𡀄𣡆",
 "𦸗": "𡀌",
 "楺": "𡀐𦽩",
 "輈": "𡀑𨏺",
 "鉢": "𡀖𩏭𪹸",
 "詩": "𡀗𡮲𫄋",
 "嫈": "𡀘",
 "雽": "𡀛𣛲𣿋",
 "筭": "𡀜",
 "稔": "𡀝𣿇",
 "楫": "𡀞",
 "溺": "𡀡𡣄𦡥𬉪",
 "㑜": "𡀢",
 "嵩": "𡀢𢣆𫶜",
 "葩": "𡀥",
 "落": "𡀩𢣅𣋛𥋷𨮎𫄈",
 "碎": "𡀬𡳥𢣃𣩸𤻒𪝬𪯞𫄆𫦢𫬮𬆜𬞚",
 "傳": "𡀯𡈬𧓆𫮯𬣋𬩘",
 "催": "𡀰𨮑𪝱",
 "該": "𡀲𫐝",
 "群": "𡀳𡑱𤺽𦏓𨆤𨮉𪷧𫲳𬚀",
 "誇": "𡀵𫏥",
 "源": "𡀶𢢵𪒳",
 "屢": "𡀿𡳰𣰢𧀓𨊖𫄎",
 "嗐": "𡁁𡁍",
 "實": "𡁃𤁂𧁐𪴎𫍒",
 "犖": "𡁆",
 "嗎": "𡁉",
 "毄": "𡁒𤪢𥖳𦿓",
 "精": "𡁔𦾿𧓔𪇒",
 "翣": "𡁕𥵳",
 "慨": "𡁙",
 "嫩": "𡁛𡽫𧀒𩠶",
 "敲": "𡁞",
 "䔍": "𡁣",
 "窩": "𡁮",
 "誘": "𡁹",
 "滾": "𡁺",
 "趙": "𡁻",
 "蒭": "𡁿",
 "槁": "𡂀",
 "慟": "𡂁",
 "魂": "𡂃𡄬",
 "嵏": "𡂅",
 "誓": "𡂉",
 "淼": "𡂊𡡺𣛁𣾜𨶺",
 "慼": "𡂔𢅪𢷾𥀽𦢑",
 "𦖩": "𡂩",
 "遮": "𡂪𧀹𧭧",
 "庻": "𡂭𫙴𬞈",
 "影": "𡂵𤂖𥶩",
 "緝": "𡃃𧁭",
 "賚": "𡃄",
 "層": "𡃆𡒸𡾓𥶰𪴕",
 "弊": "𡃇𣋹𤾵𦿔",
 "駕": "𡃉𪯀",
 "稽": "𡃊𡓈𥗎𦪼𨯀𬭿",
 "劍": "𡃍𣋽𤑯𤢾𧁴",
 "堕": "𡃏",
 "請": "𡃑",
 "撲": "𡃒𤾷𦢟",
 "播": "𡃓",
 "撩": "𡃔",
 "模": "𡃗𤂨𥀳",
 "談": "𡃘",
 "確": "𡃜",
 "論": "𡃝𫤍𫩎𫾗𬣎",
 "暫": "𡃞𡗎𧔜𪮻",
 "𦎧": "𡃥𢐻𢤈𢥲𣀦𤂸𤑴𤜃𥌲𥤁𥫉𧔫𧭺𨯢𨰩𨰯𪈶",
 "錫": "𡃶",
 "戰": "𡃹𡓥𢥇𥗜𧂁𧟀𬉢",
 "遶": "𡃺𡮾𤃤",
 "儒": "𡃽",
 "樸": "𡃾",
 "撻": "𡃿𤃧",
 "駡": "𡄃𣟭𦢷𫓟",
 "磬": "𡄇",
 "旣": "𡄊𬑦𬛑",
 "篤": "𡄍𡓞𡳽𡾬𢤷𥗖𥽪𧞶𨯹𩟵𩠸𩽖𬉤𬕳𬴓",
 "錦": "𡄎𢥅𢸼𣟡𥌹𥷏𧃃𨮨𬬃",
 "憾": "𡄏",
 "㻾": "𡄐",
 "聲": "𡄔𫓠",
 "謈": "𡄗𢥑𣌈𤃵𤜈𥗟",
 "㽞": "𡄞𦄛𩥺",
 "霞": "𡄟𡤕𤫑𧄁𧕖𨙉𪝺𪸀𬘐",
 "鳴": "𡄠𤀙𪂘𫬚",
 "齋": "𡄡𢋿𢥖𢹓𤒱𧕚𩵃𪗒𪗓",
 "闍": "𡄢",
 "講": "𡄧",
 "雖": "𡄪𥍃𧕘",
 "謙": "𡄫",
 "傱": "𡄭𨄦",
 "鍊": "𡄮",
 "臆": "𡄯",
 "鞮": "𡄷",
 "瀉": "𡄽",
 "謹": "𡄾𢥢𤄲",
 "鵓": "𡅂",
 "額": "𡅅𡿃𢹷𣌔𥗳𪭄",
 "檻": "𡅋",
 "𥳑": "𡅌𢥣",
 "簪": "𡅎𢹽𨇸",
 "禮": "𡅏𡓾𡤠𢹿𣠲𧕬𨰋",
 "苓": "𡅐𡟀𣉏𤋶𤧍𨩖",
 "擾": "𡅒",
 "𡭽": "𡅗𤅓𫽽",
 "臘": "𡅘𢺎𧅕",
 "韻": "𡅙𢥫",
 "嚚": "𡅚𧄤",
 "襟": "𡅢",
 "艶": "𡅩𡤩𤣚",
 "願": "𡅪𢥧𩖒𫚆",
 "轎": "𡅫𥍑",
 "關": "𡅭𡤡𢺄𣠸",
 "穩": "𡅯",
 "釋": "𡅵",
 "議": "𡅷",
 "霵": "𡅺",
 "蠢": "𡆂𢺨𣡢𤅧𤜗𧕷𧕹𨙥",
 "攝": "𡆄𥸓",
 "扌": "𡆆𡥅𤆎𥦤𥰏𥳺𥶪𥷐𥷪𦮾𦯙𦳻𦼾𦽥𦾙𧌕𨁘𨓓𨗅𩃂𩃑𩷢𪭜𪭝𪭞𪭟𪭠𪭡𪭢𪭣𪭤𪭥𪭦𪭧𪭨𪭪𪭬𪭭𪭮𪭯𪭰𪭱𪭲𪭴𪭵𪭶𪭷𪭸𪭹𪭺𪭻𪭼𪭽𪭾𪭿𪮁𪮄𪮅𪮆𪮇𪮈𪮉𪮊𪮋𪮌𪮎𪮐𪮑𪮓𪮔𪮕𪮖𪮗𪮘𪮙𪮛𪮜𪮝𪮞𪮟𪮠𪮡𪮢𪮤𪮥𪮦𪮧𪮨𪮪𪮫𪮬𪮭𪮮𪮰𪮱𪮲𪮳𪮴𪮵𪮶𪮷𪮸𪮹𪮺𪮻𪮼𪮾𪮿𪯀𪯁𪯂𪯃𪯄𫛒𫝻𫝼𫝿扝抱𢬌挽捨掃搢掩㨮摾摷𫼕𫼖𫼗𫼘𫼚𫼛𫼝𫼞𫼟𫼡𫼢𫼣𫼤𫼥𫼦𫼧𫼨𫼩𫼪𫼫𫼬𫼭𫼮𫼯𫼰𫼱𫼲𫼳𫼵𫼶𫼸𫼹𫼺𫼻𫼼𫼽𫼾𫽀𫽁𫽃𫽄𫽅𫽆𫽇𫽈𫽉𫽊𫽋𫽍𫽎𫽏𫽐𫽒𫽓𫽔𫽕𫽖𫽗𫽘𫽙𫽚𫽜𫽝𫽞𫽠𫽢𫽣𫽤𫽥𫽦𫽧𫽨𫽩𫽪𫽫𫽬𫽮𫽱𫽲𫽳𫽴𫽵𫽸𫽻𫽼𫽽𫽾𫽿𫾀𫾁𫾂𫾃𫾄𫾆𫾇𫾈𫾉𫾊𫾋𫾍𫾎𫾏𫾐𫾑𫾒𫾓𫾔𫾕𫾗𫾘𫾙𫾚𫾛𫾜𫾞𫾟𫾠𫾡𫾢",
 "驕": "𡆌",
 "邏": "𡆗",
 "讒": "𡆙𡿣",
 "衢": "𡆚𩇐",
 "鬭": "𡆞",
 "甴": "𡇛",
 "仉": "𡇩𡔟",
 "囲": "𡈇𤥪𫈁",
 "渊": "𡈛𫯶",
 "圓": "𡈯𡈺𢆀𣿹𧒪𨭦𪢰𪬱𫭕𫱾",
 "環": "𡈵",
 "𤴓": "𡊕𡠕𢳵𧐪𧑺𬕈",
 "襾": "𡊹𡼒𧟠𧟣𧟤𧟧𧟨𧟱𧟲𧟳𧟴𧟹𧟻𧟼𧟽𧟿𧠂𧠃𧠄𩳭",
 "汐": "𡋆",
 "䀏": "𡋕𡦐𤶇𬕇",
 "㚥": "𡋖",
 "阪": "𡋴",
 "吿": "𡌃𤥢𦅚𦶡浩",
 "妍": "𡌎",
 "旵": "𡌕",
 "妮": "𡌰𦲁",
 "㣺": "𡍞𫹬𬊅𬞳",
 "狠": "𡍭𪙈",
 "瓮": "𡍻𡹳𬫱",
 "凃": "𡍼",
 "范": "𡎊𣔶𧍙",
 "𠚏": "𡎫𢰔𣣨𥀉𧪗𧷊𧼶𪙒",
 "砦": "𡎵",
 "陜": "𡎶",
 "㱿": "𡎷",
 "座": "𡎻𣖵𨫈𪶶",
 "迴": "𡏁𥔯",
 "养": "𡏆𤸜𫺪",
 "根": "𡏒𦶠𬓓𬕤",
 "茤": "𡏗𥪫𦽭",
 "胸": "𡏠",
 "蛋": "𡐆𢳱𦄦",
 "肜": "𡐐𧠿",
 "毫": "𡐒𢴅𣻼𤡇𦹾",
 "湼": "𡐘𬘀",
 "䖝": "𡐬𣷋𧋚𧌝𧔗𧔗𧔗𧻽𧾶𧾶𧾶𪴓",
 "厦": "𡐯",
 "軫": "𡑁𤺋",
 "傕": "𡑗𤏥𬈼",
 "窖": "𡑛𨻴𪆥𫛕",
 "𠁊": "𡑽𥢡",
 "寘": "𡒆𡽆",
 "蒤": "𡒎",
 "溉": "𡒖",
 "陶": "𡒘𩍂𬞌",
 "構": "𡒫𥵡",
 "僚": "𡒭",
 "鴨": "𡒮",
 "敵": "𡒱𢸑𧁱",
 "㢖": "𡒷",
 "𨸏": "𡒿𡓬𡸬𤒮𨸥𨸷𨸿𨹇𨺫𨺵𨻏𨻪𨼕𩼐",
 "鼒": "𡓀",
 "蔭": "𡓅𨯛𪷵",
 "𠆆": "𡓑𡔊𨣳𪈋",
 "収": "𡓙𨳟𫉨𫢿𫣮𫩄𫷕",
 "墾": "𡓚",
 "廧": "𡓜",
 "叡": "𡓝𧾩",
 "整": "𡓟",
 "錯": "𡓠",
 "㯋": "𡓡",
 "焰": "𡓢",
 "燤": "𡓧",
 "虧": "𡓰𣌉𧃷𩆾",
 "瀧": "𡔆",
 "廱": "𡔏𢺠𧖇",
 "變": "𡔖𣱂𤅶𤓩𥍚𥘂𨰺𫶦",
 "塶": "𡔙𡔚𦿖",
 "兢": "𡕁𣋢",
 "𦉪": "𡕱𢡤𧰏",
 "狀": "𡘾𣈚𣶍𥇺𦲚𨡧",
 "𡘩": "𡙊𢲓𨗔",
 "扆": "𡙤𢲙",
 "歳": "𡚓𢆫𦿧",
 "𦉼": "𡚤𡚤𡚤𫥨",
 "𣬛": "𡛋",
 "𠂘": "𡛣",
 "污": "𡜂𢙁𥁡𪷪𬇸",
 "忍": "𡝖𥚆",
 "叛": "𡞟",
 "剋": "𡞢",
 "帠": "𡞭",
 "耍": "𡞾𢝶𤧋𥔖𨍥𫪱𬲗",
 "苑": "𡟃𣸱𤧌𥔙𦺲𩪝",
 "姞": "𡟌",
 "洝": "𡟖𦴴",
 "陝": "𡟨",
 "茵": "𡟻𪶲",
 "𢙣": "𡠇𪳉",
 "第": "𡠨𫦒𬄏",
 "焏": "𡠮𧁛",
 "盖": "𡡇𧗍𪥞𬧏",
 "妨": "𡡍𬜹",
 "盛": "𡡛𣛮𥊱𥢱𥼵𦔤𦼦𨞐𩦝𩯎𬣅",
 "菊": "𡡣𢵗𣚭𫣟𬈵𬖶𬣇𬧰𬰩𬹄",
 "菀": "𡡶𬎈",
 "菱": "𡡷",
 "祢": "𡢜",
 "𢆉": "𡢥𣵃𤀾𤃊𤒆𤽝𧂲𪆾",
 "閞": "𡢸𥴥",
 "庂": "𡢺𥈚",
 "債": "𡢻",
 "葡": "𡢼𩍘𫾎",
 "嫖": "𡣋",
 "鞁": "𡣐𥌕",
 "裳": "𡣖",
 "莧": "𡣚𡪨𪢯",
 "説": "𡣛𧭚",
 "𠪚": "𡣜𣠨𪿿𫶝",
 "蓮": "𡣻𬞮",
 "蕑": "𡤃𧂡",
 "妊": "𡤊",
 "薔": "𡤑𫮽",
 "鵝": "𡤝",
 "鴬": "𡤰",
 "娩": "𡤳",
 "霽": "𡤴",
 "懿": "𡤵",
 "鸞": "𡤻𨈎𬉳",
 "怐": "𡥯",
 "𥄂": "𡥰𡸽",
 "孑": "𡦪𡦪𡦪𡦪𡦷𡦷𡦷𡦷𥁂𥝔𥾌𨥂",
 "䔲": "𡦮𤃥𨯷",
 "盒": "𡦸𢠏𥂨𥲥𨢴𪤒𫣽",
 "𠔀": "𡦿𣑄𦥴𧘒𧘙𨥃",
 "宄": "𡧌𡧫𡫄𣲼𣸴𤝨",
 "屴": "𡧚",
 "仛": "𡧜",
 "宙": "𡧹𦁖𫈛",
 "兎": "𡨘",
 "𠦑": "𡨜𣓙𥆳𦯂𧚛𨁕",
 "悟": "𡩺𥧝𦷮𩄭",
 "郰": "𡪅",
 "愔": "𡪟",
 "鈙": "𡪵𥂲",
 "募": "𡫌𬔁",
 "墊": "𡫓𩆔𫉷𫸃",
 "踰": "𡫞",
 "𠆸": "𡫪",
 "磟": "𡫱",
 "懵": "𡬆",
 "肘": "𡬰𤶡",
 "罣": "𡭀𢠪𤌒",
 "⺎": "𡯅𡯓𡰏",
 "⺏": "𡯲𡯷𡯸𡰂𡰇𡰊𡰕",
 "𢂋": "𡯶",
 "涼": "𡰏",
 "习": "𡰳𩙣𩙣𩙣",
 "㐼": "𡱚",
 "忮": "𡱪",
 "刚": "𡱸",
 "厔": "𡲃",
 "降": "𡲣𡹷𤯲𧌰𫁫",
 "絇": "𡳍𢳉𬗸",
 "橋": "𡳯𧂼",
 "覆": "𡳷𥷱𧄏𧕡",
 "𡳾": "𡴂𡴓𧦖𨒯",
 "芔": "𡴠𡴨𢥁𢷎𢹄𣈤𣕐𦱡𦱢𦱧𦱶𦱺𦴘𦴬𦻇𪔫",
 "𠀌": "𡵽𨚑",
 "坑": "𡷲",
 "仐": "𡷶",
 "住": "𡸌𣁑𥇁𪝲𬷗",
 "歧": "𡹉𤛽",
 "扃": "𡹫𣕄𧍮𨩮",
 "暇": "𡺁",
 "盁": "𡺦𦰆",
 "豺": "𡺵",
 "冢": "𡻑𣹞𬥥",
 "玫": "𡻶",
 "敧": "𡼋",
 "䙴": "𡼟𦒘𩌕𩌷𪄷𪮸𫎾",
 "欹": "𡼭",
 "棱": "𡼹𦼊",
 "𡸁": "𡼻𢐺𣣮𤸣𨙡𨜚𨪸𨺪",
 "隓": "𡽃𢢠𩁌",
 "䘵": "𡽋𤀓𤳨",
 "鉗": "𡽎𬕸",
 "碓": "𡽛",
 "踖": "𡽞",
 "廖": "𡽟𡽦𥵬𦆲𨮛𫜆𫬏𫲋",
 "蒸": "𡽮𬵴",
 "榜": "𡽲",
 "磈": "𡾖",
 "繒": "𡾽𡿘",
 "藟": "𡿉",
 "孽": "𡿒𪓈",
 "甗": "𡿕𤫣",
 "鱗": "𡿠",
 "巋": "𡿢",
 "㓜": "𢀟𢂅𫲣𫼡",
 "⺁": "𢀴𢊐𢐏𢕀𢨛𢫷𢫽𢲽𢳦𣂑𣂥𣏸𣐧𣖅𣚧𣲣",
 "⺞": "𢀸𢤅𢴴𣣰𣦷𣦸𣦼𣧕𣧮𣨄𣨏𣨖𣨷𣩕𣩻𣱞𣶡",
 "拭": "𢁊",
 "𠀉": "𢁹",
 "图": "𢃠𢛾",
 "䙲": "𢃾",
 "帣": "𢄑𢯭𣕂𦞊𦩫",
 "𤾊": "𢄛",
 "敉": "𢄞𥨺𥩂𦷥𧷍𨻖𩄧",
 "帇": "𢄥𢑩𥬬𧲁𨕤",
 "奮": "𢅯𢤬",
 "簾": "𢆁𤅄",
 "𢄉": "𢆈",
 "𠄏": "𢆴",
 "掎": "𢇎",
 "囱": "𢈣𢱰𦀙𦃍𦠷𦯎𧋙𪢀",
 "俟": "𢉡𢰇",
 "苜": "𢉧",
 "覔": "𢊡𨅂𫫗",
 "培": "𢊫𣼯𦟷𦹷",
 "訾": "𢋀𤺒𧭽",
 "歈": "𢋅𢶖𤻍",
 "稣": "𢋈",
 "䧹": "𢋩𫍑𬪚",
 "槯": "𢋬𥶮",
 "橆": "𢋰𢸮",
 "孹": "𢋶",
 "昰": "𢌪𧡰𪹈",
 "圯": "𢍇",
 "𣐺": "𢍫𩏏",
 "曆": "𢍷",
 "寁": "𢐛𨖋",
 "芏": "𢐱𤻰𦳻𩺁",
 "艹": "𢐳𤀾𤂋𨆳𨍅𨎽𨏣𨕇𨕤",
 "羹": "𢑌𤄾𦣍",
 "毓": "𢑎𩱢𩱱𬉕",
 "⺔": "𢑡𢑥𢑩𢑱𣟗𧱤𧲁𩼍",
 "⺕": "𢑸𢚩𫤰𬓈𬜮𬜮𬦏",
 "徇": "𢔐𢕊",
 "㕁": "𢔘𢛠",
 "𦉭": "𢔨",
 "郚": "𢔴𦷽",
 "𤝵": "𢔷",
 "針": "𢔿𢟙𢲥𣗒𣻁𫃋𫠍",
 "猛": "𢕙",
 "淂": "𢕚𣙵",
 "𤰸": "𢕹",
 "履": "𢖓",
 "𢇂": "𢖡",
 "凣": "𢖾𢦕𣄯𣏆𥃶𥐥𥐲𥱞𥸫𥸱𧥬",
 "𣄼": "𢘆𣘅𦆏𫠱𬅺",
 "𣎵": "𢘨𢪹𥞕𥿟𨒠𩡀𩶚",
 "凧": "𢙜𩃥",
 "攺": "𢚓",
 "曵": "𢚕𫀍",
 "斈": "𢚙𫒤",
 "沔": "𢚽𫦇",
 "怗": "𢛈𪬍",
 "泯": "𢛣𣇹",
 "牧": "𢛮𣈊𤚓𤲧𦱒𫘎𫹘",
 "沽": "𢜃",
 "拈": "𢜋𤭥𥮠",
 "匁": "𢜓𪠴",
 "炘": "𢜦",
 "囿": "𢜹𦳩",
 "盅": "𢝈𨡵",
 "𡭕": "𢝝",
 "恨": "𢝧𥈥𪬲",
 "𠃨": "𢝭𢦻𤞁𦏧𧮷",
 "垢": "𢞄𬈉",
 "恧": "𢟄𢡵𦗂",
 "聀": "𢟘𤹚",
 "豙": "𢟰𥲰",
 "貧": "𢠈𧷨𨉺𪨄𪷪𫎤𬥣𬥬𬥮𬥯",
 "叄": "𢠊𤡙𩱥",
 "减": "𢠔",
 "偸": "𢠚",
 "弹": "𢠤𫸿𬑫",
 "敏": "𢠨𢳺𣙕",
 "𧹞": "𢠱",
 "芯": "𢠶𣔀𣨠𬪑",
 "豤": "𢡆𪙲",
 "𠭥": "𢡈",
 "遇": "𢡎𥴪",
 "忿": "𢡙𢮈𦝅𩸂𪬲𪬼𫺦𫺾",
 "満": "𢡛𫴴",
 "忞": "𢡥",
 "㟯": "𢡦",
 "椎": "𢡫𥴛𩠳𬋈",
 "殽": "𢡯𥳴𦺔𬥨",
 "聒": "𢡲𣽅",
 "秘": "𢢃𥡁𦷬",
 "渃": "𢢉",
 "窣": "𢢒𣿈",
 "猷": "𢢕𦽈",
 "瑜": "𢢭",
 "䀠": "𢢰𥇛𪄊𪄙𪈱𪳐𫿊𬑪𬥅",
 "㰻": "𢢶",
 "㤅": "𢢸",
 "㝅": "𢢿",
 "愩": "𢣁",
 "㼲": "𢣓𣝚𩆣𩼭",
 "憧": "𢣛𢤤",
 "辵": "𢣜𦄚𨑔𨑛𨑡𨑢𨒼𨓶𨕪𨕼𨕽𨖁𨖤𨖪𨗝𨗬𨙁𨙞𨙧𩌳𩬂𫐳",
 "漣": "𢣣𬮖",
 "慚": "𢣥",
 "鼻": "𢣦𤢳𩫬",
 "彰": "𢣪𤁀",
 "恋": "𢣫𦃳𨄄𪮠",
 "𤌹": "𢣴",
 "罵": "𢤇",
 "殢": "𢤔",
 "幢": "𢤖",
 "震": "𢤟𢸍𤂪𨯂",
 "蕫": "𢤦𬛞",
 "邃": "𢤪",
 "鋸": "𢤹",
 "蕙": "𢤺𤫃𪷺𬔄",
 "篭": "𢥆𢹈𣰳𣰴𪿄𫅲𬕹𬕺𬕾𬖅𬖆𬖉",
 "蕩": "𢥉𥗔",
 "賷": "𢥎",
 "螽": "𢥕",
 "䨇": "𢥵𨈂",
 "蠱": "𢦃𤅱𧖂",
 "勇": "𢧙𢰭𤸝",
 "㫫": "𢧫𬅮",
 "𢦍": "𢨏𬍗",
 "雐": "𢨘𩕷𪇦𫨡𬯷",
 "汁": "𢩄",
 "孓": "𢩴𬫬",
 "𠬛": "𢪩𬋥𬱕",
 "丟": "𢫻𦴵𨛀",
 "旭": "𢬐𣑢𪺬𫀯𫘲𬲑",
 "囤": "𢬼𥭒𦯁",
 "労": "𢭐𫆟",
 "𠩈": "𢭘",
 "決": "𢭯𦯊𧻯𪁠𬚇",
 "坟": "𢭷",
 "劼": "𢮌𩷻",
 "弩": "𢮫𫛇𫯅𬊨",
 "刻": "𢮰𪣫𫋉",
 "邱": "𢮼𣔆𨨎𫃃𫋄",
 "芭": "𢯓𬡞",
 "䀚": "𢯤",
 "芾": "𢯨𣈰𣣐𨃋𩹩",
 "癹": "𢯸𦳠𨂩𨡩𨨻𩸿",
 "苞": "𢯿",
 "苶": "𢰀𧍠𨡸",
 "穾": "𢰃",
 "苻": "𢰆𦲱𬫰",
 "郅": "𢰗",
 "挃": "𢰙",
 "䖉": "𢰵𨩜",
 "点": "𢰷𣸾𧪊𨃊𬊬𬝐",
 "訂": "𢱏",
 "姚": "𢱐",
 "孩": "𢱙𫫂",
 "洒": "𢱛𦵜𪝻𪯝",
 "剔": "𢱦𨲞𩮜",
 "紊": "𢱨𪶸𫱚",
 "埐": "𢱷",
 "𧲣": "𢱹",
 "荔": "𢲊𬃹",
 "㸔": "𢲏",
 "海": "𢲨𤍃𥉪𦷫𩘫",
 "殊": "𢲬𪬔𬗰",
 "𦚧": "𢲰",
 "掣": "𢳅𪷘",
 "剬": "𢳐",
 "這": "𢳘𤡖𥳅𬰊",
 "卉": "𢳭𣇸",
 "𢧁": "𢳴",
 "匾": "𢴂𬄈",
 "笪": "𢴈",
 "脱": "𢴎𦢴𪷄𫌎",
 "猜": "𢴘𦹤𧜹𫫜",
 "唻": "𢴙",
 "掔": "𢴡",
 "𡍮": "𢴹𥋍𥖌𥢤𥴓𦉖𧬡𨙦𨞄𨭇𨼦𩁅𩦛",
 "抈": "𢵁",
 "䄈": "𢵊",
 "𦨉": "𢵏𣾅",
 "萄": "𢵘𪷒𫱰",
 "貼": "𢵚𪹭",
 "菜": "𢵛",
 "犇": "𢵜",
 "猫": "𢵝𫫯",
 "短": "𢵦𥐉𥐔𧸒𪿏𫏰𬑵𬑶𬑸",
 "斐": "𢵪𦻔𩇿𩦎𪷕",
 "萊": "𢵭𨅼𪱉𫘗",
 "㱕": "𢵴",
 "菓": "𢵵𥼧𧅬𪳰𫉻𬶯",
 "鈍": "𢵶𫫲",
 "割": "𢵷𥢫𫗛𫦢𬕲",
 "鈲": "𢶎",
 "葱": "𢶰𣎨𤩿𫓑",
 "敀": "𢶱",
 "暗": "𢶹",
 "窞": "𢶺𣛱",
 "腩": "𢷁",
 "滅": "𢷄𤄌",
 "竭": "𢷒𫕴",
 "箜": "𢷙𣝃",
 "撜": "𢷚",
 "鄣": "𢷢",
 "䡛": "𢷦",
 "夀": "𢷬",
 "廔": "𢷱",
 "𦥷": "𢷲𣋱𤑍",
 "摹": "𢸆",
 "摘": "𢸈𪇪",
 "趟": "𢸋",
 "暮": "𢸓𫲍𬣒",
 "調": "𢸛𤂂𥶏",
 "潜": "𢸝",
 "儉": "𢸟𨇓𨯘",
 "課": "𢸠𣋾𥌥",
 "篆": "𢸢𤪪𥌫",
 "篡": "𢸥𤂳𤒪",
 "橐": "𢸨𣟄𥩀𧔬𩧐𬴎",
 "選": "𢸷𣟙𤂿𥶷𦇗𧂍𨯭",
 "篚": "𢸿",
 "濁": "𢹅𤅴",
 "諧": "𢹆",
 "黙": "𢹇",
 "熾": "𢹊",
 "輿": "𢹏𣟰𤫌𥷔𨏮𬀣",
 "馘": "𢹖𩉕",
 "⻎": "𢹗𣞬𣞮𤐹𤨂𤩻𦳖𦳭𦳺𦷷𦹇𦹢𦾽𧀕𨑘𨑙𨑚𨑤𨑨𨑯𨑰𨑱𨑲𨑳𨑴𨑼𨒓𨒔𨒕𨒖𨒗𨒮𨒲𨓄𨓒𨓓𨓔𨓕𨓖𨓝𨓤𨓪𨓭𨓮𨓲𨓳𨓸𨓿𨔎𨔏𨔑𨔒𨔓𨔔𨔕𨔛𨔜𨔫𨔰𨔼𨔽𨕁𨕂𨕃𨕄𨕅𨕆𨕇𨕈𨕉𨕊𨕋𨕛𨕟𨕬𨕮𨕯𨕰𨕱𨕲𨕳𨕴𨕵𨕶𨖆𨖓𨖔𨖖𨖗𨖘𨖙𨖯𨗂𨗋𨗌𨗍𨗎𨗏𨗔𨗕𨗢𨗣𨗨𨗩𨗪𨗭𨗮𨗱𨗴𨗶𨗷𨗸𨗹𨗻𨗼𨘀𨘅𨘈𨘋𨘍𨘎𨘏𨘐𨘝𨘞𨘠𨘢𨘣𨘥𨘦𨘧𨘨𨘩𨘮𨘶𨘽𨙃𨙆𨙇𨙈𨙉𨙊𨙎𨙐𨙑𨙕𨙘𨙚𨙣𨭫",
 "擎": "𢹘𩽡",
 "䕥": "𢹜",
 "蹈": "𢹡",
 "矯": "𢹣𨙍𪢤",
 "趨": "𢹤",
 "糝": "𢹪",
 "簫": "𢹱𤄙",
 "薩": "𢹵𧃯𪎅",
 "簞": "𢹺",
 "謨": "𢺀𥷺𧄲𩇅",
 "霪": "𢺓",
 "㒹": "𢺗𪦵",
 "鐘": "𢺚",
 "籊": "𢺜",
 "蘊": "𢺝",
 "𤕨": "𢺣",
 "器": "𢻪𣀬𤼅𥀴𥷇𩆮𬑀",
 "艼": "𢼘",
 "异": "𢼷𫷩",
 "𡝤": "𢿙",
 "䜭": "𢿶𫫽",
 "笁": "𣀖",
 "𠩬": "𣀗",
 "觱": "𣀣𣁀",
 "茌": "𣁙𣖝",
 "𠩓": "𣁿𣂀",
 "厞": "𣂇",
 "戽": "𣂋𣶉𫽒𬃐",
 "𠁗": "𣂐𤫓𧞲",
 "菁": "𣃄𫋛𫻄",
 "筫": "𣃇",
 "芹": "𣄄𣔠",
 "帘": "𣄐",
 "𠄟": "𣄾𨳌",
 "𨈐": "𣅞",
 "𠀇": "𣅣",
 "妓": "𣇠",
 "斨": "𣈈𥇴𩕩",
 "竿": "𣈨𣔼",
 "帥": "𣈪𧍓",
 "𣅋": "𣈫𪣙",
 "㽚": "𣈾",
 "烜": "𣉖",
 "牂": "𣉚𦟃",
 "耗": "𣉶𪡱",
 "創": "𣋃𤏬𤺨𫤤𬰌",
 "䒤": "𣋈",
 "𠌶": "𣋌𤾼𦾓𧮉𩎁𩏬𩦰",
 "葵": "𣋒𤢑𤩸𧬧𨆠𩦟𪆴𫶙𬄲𬸮",
 "電": "𣋔𦡏",
 "暊": "𣋗",
 "𡉸": "𣋧𣋧",
 "辣": "𣋩𤻬𪢘𫶼𬅀",
 "𣀦": "𣌘𨰮𪈷",
 "冤": "𣍍",
 "綾": "𣍚",
 "轝": "𣍛",
 "黌": "𣍜𪏬",
 "㝑": "𣎙",
 "膏": "𣎪",
 "㓅": "𣐘",
 "氷": "𣐚𤝣𫑌𫥇𬇟𬦋𬩏𬵌",
 "奶": "𣐨𪺫𫇵",
 "𠂠": "𣐰𨝞",
 "圶": "𣑖𪻗",
 "汍": "𣑱𪟛",
 "㳜": "𣒑",
 "𥎦": "𣒟",
 "𦭰": "𣒢",
 "𡕙": "𣒥",
 "𥃩": "𣒨𪘟",
 "呇": "𣒩𦧞𬇱𬫠",
 "李": "𣒶𣵎𦁝𪴏",
 "𠩆": "𣒽",
 "芃": "𣒾",
 "㳄": "𣒿𣛯𥋕𪡌𫳎𫾷𬯃",
 "刲": "𣓇",
 "芟": "𣓒𩋐",
 "厹": "𣓕𣽕",
 "泛": "𣓦𥁷",
 "卥": "𣓨𥛡𨛹",
 "冾": "𣓫𥁿𪧹",
 "泪": "𣓭",
 "𣲲": "𣓮𬐦",
 "棽": "𣔁",
 "迍": "𣔝𦝊𦰭",
 "芣": "𣔟",
 "迥": "𣔲𣹔",
 "枸": "𣕌",
 "㲽": "𣕝𥱋",
 "型": "𣕭",
 "𡇒": "𣕳",
 "迫": "𣖐𫪼",
 "持": "𣖖𤸟𥻣𧎋𨃌𨨲𩹭",
 "茄": "𣖚𨔽𫅘",
 "茈": "𣖨𦸺",
 "𠀠": "𣗅",
 "案": "𣗈",
 "郢": "𣗐𫹟",
 "": "𣗭",
 "荁": "𣘇",
 "笴": "𣘠",
 "莎": "𣘡𩺳𪍬",
 "梓": "𣘲",
 "银": "𣘴",
 "笺": "𣘷",
 "崗": "𣙋𬬀",
 "彩": "𣙓𤨽𥂑𦹮𬗹",
 "屜": "𣙝",
 "梪": "𣙞",
 "痔": "𣙦",
 "笤": "𣙭",
 "笱": "𣙱",
 "菆": "𣙻𣽇𦺵𦼈𧅞𧅞𨎮",
 "菴": "𣚖",
 "牋": "𣚙𣽖",
 "揞": "𣚮",
 "裁": "𣚸𦅞𧸄",
 "萗": "𣛂𣰁",
 "嵐": "𣛄𨅏𫙹",
 "𤭐": "𣛏",
 "游": "𣛦𪆎",
 "筌": "𣛩",
 "丳": "𣛫𤢁𨔂",
 "卿": "𣛬𤫈𦺄𬁋",
 "皵": "𣛵",
 "盞": "𣛷𤐒𦾟𨭮𫫷𬉉",
 "遄": "𣛹𣜅",
 "閘": "𣜊𨆇",
 "萷": "𣜎",
 "酬": "𣜙",
 "閠": "𣜝",
 "𤋮": "𣜠",
 "𠁽": "𣜧汎",
 "𤕤": "𣜪",
 "洎": "𣜮𤂃𦤢𪛎",
 "萱": "𣜯𫫻𫱽𫻊𬁙",
 "遏": "𣜶𣿌",
 "郷": "𣜼𨬽",
 "蒹": "𣝈",
 "緊": "𣝌𦃢𪷬𫉺",
 "榼": "𣝒",
 "稳": "𣝟𪢖",
 "潔": "𣝠",
 "綠": "𣝵𤀼𦾯",
 "蓆": "𣝸𫊘",
 "蓁": "𣝾𫇑𬉔",
 "箒": "𣞂",
 "𠻮": "𣞋",
 "甍": "𣞑𧂛",
 "蔍": "𣞓",
 "憃": "𣞝𩯲",
 "蔗": "𣞢𬩦",
 "蔞": "𣞾",
 "墮": "𣟁𥶴",
 "遼": "𣟆𥷊𧂏",
 "衞": "𣟉𥶽𨇙",
 "橙": "𣟑",
 "𡘲": "𣟒𣠮𤅅𦣌𦨅",
 "篿": "𣟔",
 "燊": "𣟕𤒇",
 "耨": "𣟪𤒛𧂭𩽔𬶹",
 "䦨": "𣟬",
 "𦏜": "𣟱",
 "篸": "𣟹𥤇",
 "薬": "𣟿𫊚𬌖𬟥",
 "薟": "𣠇",
 "篷": "𣠑",
 "篻": "𣠓",
 "薾": "𣠝𧟚",
 "観": "𣠤",
 "覩": "𣠶𤒠𧺂𧺃𨇛𨇜𬦄",
 "㞡": "𣡃",
 "罍": "𣡧𤫥",
 "曡": "𣡭𣱃𫲞",
 "鹽": "𣡶𣱄𤅸𥤟𨤎𨷽",
 "廳": "𣡹",
 "爨": "𣡿𥎤𥎥𩎑",
 "𠩉": "𣣃",
 "呰": "𣣊𧩢",
 "欥": "𣣒",
 "厙": "𣣭𨍃𨎯𪳽",
 "鼀": "𣤶",
 "㗊": "𣤽𪋦",
 "鰥": "𣤿",
 "𦥒": "𣥫𤘍",
 "芸": "𣦀𣶽𦓷𧅟𧅟𩸜𫰼𫶮",
 "舠": "𣦃𣾥𤎴𥳭",
 "皷": "𣦩𥀷𥌒𪇞𪔏𫓖𬥪",
 "㕛": "𣦪𣦪𦜚𩢃𪠪",
 "𡏳": "𣩲𪇠",
 "㿝": "𣪕",
 "円": "𣪗𦱫",
 "穀": "𣫉",
 "蛬": "𣫣𧏒𨣂",
 "𥃈": "𣬁",
 "毗": "𣬖𥯡𦳈𧔆𧖈𧖎𪽥",
 "毘": "𣬗𬵝",
 "叁": "𣮟𦩓𦲞𫃰𫌄",
 "耄": "𣮳",
 "俱": "𣯒",
 "睒": "𣰍𦽉",
 "裘": "𣰐𩱘𫱹",
 "𥈜": "𣰠𩍭𩖀",
 "戸": "𣱆𪤔𫎠啓",
 "仂": "𣲒",
 "冯": "𣳆𬦴",
 "囝": "𣳲",
 "汏": "𣴘",
 "坌": "𣴞𬱇",
 "𢦙": "𣴤",
 "汵": "𣵂",
 "亣": "𣵉",
 "抂": "𣵱",
 "岌": "𣵵𥆹𧋏𩣞𩷘𫻅",
 "邯": "𣵷",
 "陀": "𣵻𦱆𩎼𪂊",
 "盰": "𣵼𥍅",
 "陌": "𣶊𧼟",
 "岶": "𣶎",
 "奅": "𣶐𦝐",
 "𠈉": "𣶜",
 "坥": "𣶝",
 "呥": "𣶞",
 "旺": "𣶪𦁽",
 "诣": "𣶫",
 "杪": "𣶲",
 "㲺": "𣶾",
 "变": "𣷷𤊰𫑆𫶄𫽕",
 "虺": "𣸀",
 "㕟": "𣸎𦖥𦳋",
 "砅": "𣸐𥔨",
 "厗": "𣸒𥔈",
 "盼": "𣸜",
 "毖": "𣸢",
 "垒": "𣸫",
 "黾": "𣸰",
 "洀": "𣹊𬐯",
 "殂": "𣹖",
 "陗": "𣹝",
 "旄": "𣹪",
 "欱": "𣹱",
 "眚": "𣹴",
 "洱": "𣹼",
 "倚": "𣺈𥰧𦟑𧱺",
 "冧": "𣺉𪒍𫫋𫮚",
 "𦕈": "𣺌",
 "㴆": "𣺎",
 "財": "𣺠𨃁",
 "埀": "𣺡𨪰𩺖𪟏𪬗𪮜𪾶",
 "㓯": "𣺤",
 "哨": "𣺰𪄨",
 "洋": "𣺸𣼁𫈭",
 "茹": "𣺾𦷸",
 "旍": "𣻒",
 "旌": "𣻓",
 "術": "𣻚𦸇𪨜",
 "畤": "𣻞",
 "捻": "𣻧",
 "晝": "𣻱",
 "𡍏": "𣻶",
 "脛": "𣻽𪡿",
 "𣣅": "𣼋",
 "閆": "𣼐",
 "𡮂": "𣼓",
 "𠕒": "𣼛𤨸𫞜",
 "匙": "𣼮𨫞",
 "莉": "𣼵",
 "欿": "𣽌𦻁",
 "琢": "𣽗",
 "淠": "𣽠",
 "衖": "𣽣",
 "頇": "𣽥",
 "寑": "𣽧",
 "喟": "𣽴",
 "𡩋": "𣽹𤡺𧑶",
 "隈": "𣽻",
 "𠥔": "𣾀",
 "階": "𣾂",
 "喪": "𣾓𦅇𩦌𫛑𫟣𬦟",
 "凱": "𣾚𤩑𦻻𨬫",
 "喂": "𣾿",
 "隅": "𣿃𪽹",
 "嵗": "𣿄𫯻",
 "鳧": "𣿆𦽏",
 "詣": "𣿉",
 "湅": "𣿊",
 "盝": "𣿍𦾞",
 "裏": "𣿞𩼆𬅗",
 "觧": "𣿨𧒻",
 "塋": "𣿩",
 "粤": "𤀀𥜊𥣄𦆒𧒹𧞄𨆗𨮁",
 "𡘜": "𤀅",
 "𡩟": "𤀋𥋰",
 "𥇡": "𤀎𤏵𥋭𥷐𥽉",
 "試": "𤀏",
 "蒂": "𤀐𧂨𫣥",
 "寗": "𤀑",
 "飲": "𤀔𥽁𫨜",
 "葻": "𤀘𬡟",
 "晴": "𤀜",
 "暖": "𤀣𧞈",
 "箅": "𤀥",
 "窬": "𤀨",
 "暠": "𤀰",
 "聞": "𤀳𬚩",
 "綺": "𤀽𦌰",
 "𥯀": "𤁈",
 "歴": "𤁋𫌕𫾐",
 "瑤": "𤁓",
 "裸": "𤁖",
 "扒": "𤁙",
 "閩": "𤁝",
 "撢": "𤁡",
 "溓": "𤁦",
 "瞍": "𤁨",
 "潪": "𤁰𤂥",
 "蓼": "𤁸𥗀𨟆",
 "濎": "𤂄",
 "樠": "𤂉",
 "巣": "𤂋",
 "": "𤂒",
 "𩒛": "𤂔𬟄",
 "沅": "𤂕𩂷",
 "鬧": "𤂗",
 "貎": "𤂚",
 "溘": "𤂠",
 "芙": "𤂡𫆾𫽈",
 "噴": "𤂫",
 "獚": "𤂲𤣊",
 "閼": "𤂷",
 "旙": "𤃃",
 "賁": "𤃋噴幩憤濆",
 "霏": "𤃍",
 "蕋": "𤃓",
 "盥": "𤃗",
 "暪": "𤃞",
 "壅": "𤃟",
 "餒": "𤃠𫄑𬛠𬷸",
 "薨": "𤃫𥍇𩖎𩙛𪈘",
 "滷": "𤃯𬐻",
 "縶": "𤃲",
 "磴": "𤃶",
 "闇": "𤃷𧮍",
 "磿": "𤃹𨟟",
 "鮪": "𤃽",
 "薎": "𤃿𪈛",
 "獲": "𤄀𫻞𫾢",
 "羮": "𤄂",
 "闊": "𤄃",
 "謟": "𤄅",
 "總": "𤄋",
 "鬩": "𤄎𩰕",
 "藂": "𤄓",
 "汸": "𤄕𩃎𫈊",
 "魋": "𤄛𬤱",
 "漁": "𤄣",
 "浿": "𤄧",
 "旛": "𤄫",
 "雞": "𤄬𤣕𧄰",
 "𡗉": "𤄮𬲢",
 "顔": "𤄰𫻤",
 "鎮": "𤄱",
 "滜": "𤅆",
 "壤": "𤅑",
 "籍": "𤅔𨈁",
 "頻": "𤅖𫵍",
 "飄": "𤅜𦣕",
 "驀": "𤅠",
 "蘥": "𤅢𨈅",
 "亹": "𤅣",
 "漢": "𤅩𪝳",
 "㦤": "𤅮",
 "籥": "𤅰𥤖𥸤𨈋𪛒𪛔",
 "髓": "𤅵",
 "鑫": "𤅺𨐃",
 "𠅠": "𤅻",
 "灃": "𤅿",
 "劭": "𤉎𦀧",
 "肫": "𤊯",
 "胋": "𤋧",
 "苪": "𤋲𫈡𬜼",
 "茴": "𤌚",
 "倝": "𤌹𬫶",
 "軏": "𤍆",
 "訖": "𤍋",
 "堃": "𤍣𨼁𬈮",
 "勔": "𤎂",
 "𠧧": "𤎆𧨼",
 "堛": "𤎪",
 "惑": "𤏘𪏤",
 "訴": "𤏣",
 "稀": "𤏤𤏨𦻎",
 "勛": "𤏩𪬩",
 "飪": "𤏼",
 "県": "𤐘𬗫",
 "㰴": "𤐚",
 "塊": "𤐡𤮟",
 "殾": "𤐢",
 "稫": "𤐧𤐸𦿁",
 "㬎": "𤐴𦆴𨏌",
 "徴": "𤑈",
 "褔": "𤑏",
 "㢘": "𤑙",
 "勲": "𤑛𪮼𪴚𬟓",
 "者": "𤑜𤑨𤯈",
 "閹": "𤑷",
 "災": "𤑹𨉒𨓌",
 "鼏": "𤑺𧖅𨣯",
 "隧": "𤑾𥶼𧁂𨽛𩆰",
 "聮": "𤑿𤣆",
 "𢨋": "𤒉",
 "棗": "𤒗𪦡𫓇𫼄",
 "䉣": "𤒘",
 "熟": "𤒙",
 "濃": "𤒚",
 "濕": "𤒴",
 "瓊": "𤓇",
 "燚": "𤓔",
 "耀": "𤓛",
 "即": "𤔴",
 "爂": "𤕉𥤎𩽬",
 "𨐋": "𤖟",
 "邠": "𤘊",
 "寜": "𤘓𤪥𤾱𦆭",
 "乜": "𤘗",
 "殻": "𤛓𤠼𦎼𧐜𪅏𪖃",
 "𦎫": "𤜀𦏧𫓜𫿠",
 "羆": "𤜑𥷾𧄾𧟍𨰟",
 "魔": "𤜘",
 "毎": "𤞦𧄫𨧊侮悔敏梅海",
 "犴": "𤞿",
 "剎": "𤟆𥓑",
 "狡": "𤟋",
 "狗": "𤟳𬍉𬍌",
 "㪿": "𤠥",
 "囯": "𤠪",
 "埃": "𤠱",
 "院": "𤠴𦶤",
 "慸": "𤢻",
 "壐": "𤣐",
 "𤣥": "𤣦",
 "㺳": "𤥷",
 "佩": "𤦍",
 "惣": "𤦏",
 "玢": "𤦦",
 "㚅": "𤦶𪔢𫟾",
 "町": "𤨀𬏈",
 "玟": "𤨘𫈑",
 "莆": "𤨳𦻌𧁳𧜿𧽬𨄳𫃾𫮝𬈩𬵦",
 "程": "𤩏𦻓",
 "壷": "𤩖",
 "罨": "𤪄𫫼",
 "𦘒": "𤪆𬗷",
 "舝": "𤪍𧕱",
 "慕": "𤪶𫲎𫾕",
 "㰈": "𤪼",
 "褢": "𤪿",
 "獮": "𤫏",
 "罌": "𤫡𬧝",
 "楇": "𤬙",
 "缸": "𤭬",
 "秌": "𤭰",
 "㢴": "𤮔",
 "豋": "𤮘𥣎𦡪𨭕",
 "廡": "𤮢𧓼",
 "筋": "𤯸",
 "𤯓": "𤰀",
 "䍗": "𤳄𦃿",
 "病": "𤶮𤶯𤻓",
 "尪": "𤷀",
 "秮": "𤹇",
 "袪": "𤹒",
 "恿": "𤹯𨎢",
 "痲": "𤹳𤹴",
 "晦": "𤹾",
 "晟": "𤺁𫮕",
 "猲": "𤺐",
 "痳": "𤺣𤻚𤼍𤼑𫉭",
 "喑": "𤺵",
 "馭": "𤺶𪦠",
 "極": "𤺷𦽯",
 "猥": "𤺸",
 "槃": "𤻧𧓙",
 "端": "𤻨𥵣𦾸𧞖",
 "編": "𤻶",
 "𧍣": "𤻹",
 "彈": "𤻾",
 "憨": "𤼉",
 "痺": "𤼜𥽅",
 "痩": "𤼞",
 "歡": "𤼢",
 "昋": "𤾄",
 "蔿": "𤾸",
 "仔": "𥁙𫁻𫇱",
 "𡥀": "𥁝",
 "汾": "𥁳𦰛",
 "沖": "𥁵",
 "淥": "𥂖",
 "酖": "𥂘𩻕",
 "畣": "𥂜𧕙𩌼",
 "坦": "𥂯",
 "頒": "𥂾",
 "㚔": "𥃊𪇙",
 "餞": "𥃗",
 "𤓯": "𥄚",
 "击": "𥅅𬎗",
 "児": "𥆩",
 "眊": "𥇾",
 "毣": "𥉗",
 "眠": "𥉦𥋹𪦓𬧆",
 "剿": "𥊌",
 "訣": "𥊜",
 "眧": "𥋑",
 "罩": "𥋽",
 "德": "𥌩𪢝",
 "隸": "𥌿𥷗𪴛",
 "顒": "𥍎",
 "霄": "𥍕",
 "巖": "𥍛𫤖",
 "吁": "𥎿𦊯𬇢",
 "㘴": "𥏧𥮭𫝶",
 "弧": "𥏩𥮰",
 "汜": "𥒟𫈲",
 "衫": "𥓸",
 "䎁": "𥔓",
 "砍": "𥔩𥕔",
 "庴": "𥕒",
 "莞": "𥕜𪼒",
 "蛩": "𥕨",
 "戡": "𥖘𪭕",
 "髙": "𥖱𬴖𬴗",
 "槐": "𥖸",
 "銅": "𥖹",
 "銭": "𥗛",
 "甕": "𥗯𨇹𪗃",
 "礜": "𥗵",
 "譽": "𥗻",
 "蘿": "𥘁",
 "芋": "𥙶",
 "㸓": "𥛗𦗌",
 "庾": "𥛩𦺮",
 "菖": "𥛼",
 "理": "𥜡𫩆",
 "囡": "𥜫",
 "芡": "𥟕",
 "芼": "𥟪",
 "苫": "𥠯𬜗",
 "𥝌": "𥠻𥡞𨮺",
 "芊": "𥢟𬡙𬡚",
 "遅": "𥣔𫋢",
 "蘦": "𥤜",
 "戼": "𥥺𦯆𧶻𨌡𨞵𩜕",
 "毦": "𥧢𦶇",
 "悎": "𥧦",
 "惈": "𥧵",
 "惜": "𥧶",
 "焐": "𥧸",
 "授": "𥧿",
 "渦": "𥨙",
 "揚": "𥨛",
 "激": "𥨿",
 "操": "𥩃𧂈",
 "撼": "𥩇",
 "㓛": "𥬣",
 "刎": "𥬼",
 "肌": "𥬾",
 "圴": "𥭀𦮢",
 "⺹": "𥭻𦹘",
 "体": "𥮋𧡊𫌠𬌕",
 "杭": "𥮕𫙤",
 "𡴀": "𥮟𧉳𨚦𫵮𫵮",
 "𡱅": "𥮱",
 "迮": "𥯧",
 "笥": "𥯱",
 "朐": "𥯷",
 "彶": "𥯼",
 "桃": "𥰜",
 "屐": "𥰦",
 "哿": "𥰮",
 "烘": "𥰲",
 "剖": "𥰵𦵿",
 "洿": "𥱀",
 "蚕": "𥱄𧍦",
 "栖": "𥱛",
 "框": "𥱜",
 "挼": "𥱮𦵭𩝺𫃸𫏙𬈗",
 "站": "𥱱",
 "途": "𥱻𩥽",
 "衒": "𥲋",
 "涵": "𥲌",
 "陸": "𥲎𦸐",
 "梧": "𥲐𫉎",
 "笯": "𥲘",
 "淙": "𥲚𫫥",
 "紨": "𥲛",
 "望": "𥲠𧫢𪚤𪱮𪱯𬂙𬖉𬪶",
 "掃": "𥲳",
 "掽": "𥲵",
 "舒": "𥳕𦺗𪅰",
 "棓": "𥳖",
 "圌": "𥳙",
 "棤": "𥳯",
 "湔": "𥳷𦺍",
 "稈": "𥳼",
 "逸": "𥳿",
 "粞": "𥴅𪟱",
 "椑": "𥴖",
 "詔": "𥴜𧝨",
 "艂": "𥴣",
 "腱": "𥴤𦽇",
 "隔": "𥴩",
 "楬": "𥴭𦼰",
 "搏": "𥴮",
 "靖": "𥴰𦽴",
 "愍": "𥴲",
 "鉤": "𥴴𦽋",
 "搶": "𥴻",
 "滌": "𥴽𧀝",
 "溜": "𥵄𦽾𩆎𫬂",
 "楤": "𥵅",
 "塩": "𥵈",
 "獅": "𥵍",
 "碑": "𥵔",
 "複": "𥵩",
 "竮": "𥵪",
 "綜": "𥵹",
 "皺": "𥶈",
 "篹": "𥶊",
 "幡": "𥶋",
 "盜": "𥶎𫴣𬐼𬐾",
 "踶": "𥶛",
 "嫴": "𥶜",
 "輪": "𥶡",
 "篲": "𥶬",
 "魄": "𥶱𩏳",
 "緘": "𥶳𦆃",
 "毇": "𥶵",
 "靜": "𥶹𧂮𨷧𫣺𬎛",
 "辦": "𥷁",
 "槳": "𥷃",
 "橦": "𥷈",
 "甐": "𥷖",
 "擢": "𥷘𧃔",
 "臀": "𥷝",
 "盱": "𥷯𦰲",
 "齕": "𥷳𪩟",
 "譖": "𥸄",
 "籠": "𥸉𬅚𬎡",
 "冒": "𥸖𩐲帽",
 "灑": "𥸗",
 "覿": "𥸚",
 "齪": "𥸛",
 "讃": "𥸝",
 "蠶": "𥸢𧖛",
 "黵": "𥸣",
 "阤": "𥹗",
 "𥸨": "𥻫𥻫",
 "淅": "𥼔",
 "綂": "𥽄",
 "嫌": "𥽎𫅸",
 "繞": "𥽵",
 "覈": "𥽶𦇸",
 "茀": "𦂓",
 "𠂷": "𦂜",
 "迭": "𦂾",
 "𡴘": "𦃉",
 "㤻": "𦃕",
 "郤": "𦃛𪼾",
 "晁": "𦃻𪳒",
 "㝡": "𦄎𪉼",
 "𧴿": "𦄗",
 "䇥": "𦄙",
 "𢧉": "𦄩",
 "掉": "𦄹𧐼𬕩",
 "寕": "𦅜𫎄𫜧𬈿𬞊",
 "𢽠": "𦅣",
 "㑹": "𦅩",
 "蛛": "𦅱",
 "縹": "𦆝",
 "⺱": "𦆢𦉮𦊋𦊬𦋇𦋱𦋵𦌓𦌼𦍅",
 "裹": "𦆪",
 "遙": "𦆸𦾾𩆡",
 "輝": "𦇊",
 "蔥": "𦇎",
 "繘": "𦇹",
 "㥯": "𦈠",
 "瓶": "𦉐",
 "𦉬": "𦉛",
 "⺴": "𦊇𦊙𦋐𦌛",
 "机": "𦊵𩍊𪳴",
 "巺": "𦋭",
 "組": "𦋽𬄗",
 "綈": "𦌢",
 "魝": "𦌥",
 "緂": "𦌪",
 "馽": "𦌭𦌱𦍈𦍊",
 "線": "𦌶",
 "繯": "𦌾𦍃",
 "繴": "𦍁",
 "𦍍": "𦎖𦏎𦑒",
 "譱": "𦏬𦏯",
 "羶": "𦏭",
 "旉": "𦒊𪵐",
 "萆": "𦔠",
 "𡨴": "𦗰𪅢𪺖",
 "蒯": "𦗿𫬉",
 "錉": "𦘌",
 "闋": "𦘍",
 "㥁": "𦘏",
 "𡴯": "𦙏𬉽𬴕",
 "迄": "𦛰",
 "吠": "𦜀",
 "股": "𦜴𨵐",
 "昃": "𦝈",
 "恍": "𦞔",
 "脽": "𦞾",
 "粘": "𦟶𫃔𬖭𬖷𬗀",
 "液": "𦟸",
 "掛": "𦟺𫫔",
 "辝": "𦠬",
 "筏": "𦠱",
 "蒌": "𦡢",
 "凖": "𦡤",
 "膝": "𦡩𧀬",
 "慁": "𦡵",
 "膚": "𦢚𧀴𨟭𫻖𬉜𬬚𬮗",
 "瘦": "𦢝𩽉",
 "蕪": "𦢲",
 "𦟀": "𦢼𩧣",
 "豁": "𦢽",
 "嶷": "𦢾",
 "簿": "𦣈𪚈",
 "𦹆": "𦣚",
 "怘": "𦣶",
 "翔": "𦤥",
 "𦥯": "𦦎𦧀𧅫𬋡𬛽𬠰",
 "𠚒": "𦧄𦧄𦧄",
 "𦥛": "𦩿",
 "寛": "𦪻𫣷",
 "仺": "𦭫",
 "伢": "𦭿",
 "忙": "𦮝",
 "㕦": "𦮥𫸯",
 "份": "𦮪𪫱",
 "伒": "𦮬",
 "吻": "𦮶𪡕𪷡𬠉",
 "劬": "𦮿",
 "序": "𦯅𨹘𫸉",
 "杓": "𦯪",
 "㝴": "𦯿",
 "㚏": "𦰃𧜒",
 "扲": "𦰄𪡆",
 "厎": "𦰘𬢬",
 "泅": "𦰪",
 "姁": "𦰰",
 "枒": "𦰳",
 "苾": "𦰷𦸞",
 "阼": "𦰼",
 "狐": "𦱄𦻨",
 "秈": "𦱑",
 "呵": "𦱕",
 "芧": "𦱻",
 "坪": "𦱾",
 "怡": "𦲀",
 "泄": "𦲉",
 "穸": "𦲎",
 "玪": "𦲖",
 "拂": "𦲫𫂅",
 "𠃉": "𦲳",
 "秏": "𦳁𩮄",
 "洟": "𦳂",
 "胍": "𦳍𨃆",
 "柤": "𦳏",
 "苠": "𦳜𩀔𪃔",
 "炰": "𦳤",
 "莖": "𦳲𨖑𩐺",
 "炳": "𦳼",
 "耇": "𦴆",
 "殃": "𦴊",
 "苂": "𦴔",
 "茜": "𦴖",
 "迢": "𦴚",
 "𠛱": "𦴟",
 "r": "𦴠",
 "柭": "𦴡",
 "沘": "𦴢",
 "映": "𦴤",
 "洵": "𦴥",
 "洆": "𦴸",
 "拴": "𦴽",
 "玲": "𦴿𧟺𫺡",
 "柳": "𦵂𩋶",
 "怒": "𦵚𧪅𪶨𫻂𫻈",
 "邿": "𦵟",
 "娠": "𦵢",
 "俶": "𦵦",
 "狼": "𦵧",
 "祚": "𦵬𨃼",
 "茿": "𦵶𧏤",
 "挹": "𦶂",
 "迺": "𦶅",
 "紐": "𦶆",
 "涄": "𦶊",
 "凋": "𦶌𪄄",
 "栱": "𦶓",
 "桓": "𦶙𨕹",
 "洍": "𦶜",
 "热": "𦶟",
 "航": "𦶢",
 "耘": "𦶮",
 "𠗙": "𦶷",
 "盏": "𦶻𧰞",
 "涉": "𦶼𬀔𬜚",
 "耕": "𦷂",
 "娘": "𦷄𬏒",
 "倗": "𦷛𫮙",
 "消": "𦷟𫁄𫠸",
 "桧": "𦷭",
 "紝": "𦷺",
 "逌": "𦷿",
 "脘": "𦸌",
 "脫": "𦸍",
 "郵": "𦸙",
 "𠦒": "𦸩",
 "晜": "𦸫𩻋",
 "婦": "𦸱",
 "桒": "𦹁",
 "涪": "𦹃",
 "紹": "𦹄",
 "殍": "𦹡",
 "茛": "𦹧",
 "齏": "𦺅𧆌",
 "傅": "𦺉",
 "睆": "𦺊",
 "㛮": "𦺋",
 "婺": "𦺒",
 "揆": "𦺕",
 "猭": "𦺛",
 "訶": "𦺞",
 "揉": "𦺤",
 "稌": "𦺪",
 "硠": "𦺫",
 "絛": "𦺰",
 "晻": "𦺽",
 "渜": "𦺾",
 "徥": "𦻀",
 "萁": "𦻆𬄤",
 "詠": "𦻑",
 "渫": "𦻜",
 "𠱠": "𦻸𧕁𧮥𪋓",
 "幣": "𦻾𦿝",
 "皖": "𦼍",
 "琰": "𦼓",
 "屁": "𦼘",
 "媞": "𦼙",
 "趁": "𦼛",
 "趂": "𦼜𪮭",
 "惱": "𦼝",
 "菹": "𦼬𧗎",
 "榑": "𦼭",
 "腸": "𦼳𬛡",
 "毼": "𦼵",
 "搞": "𦼸",
 "溦": "𦼻",
 "經": "𦽁",
 "稑": "𦽂",
 "嗣": "𦽊𫲱",
 "稕": "𦽑",
 "遍": "𦽟",
 "較": "𦽨",
 "媻": "𦽮",
 "𧶝": "𦽿",
 "搕": "𦾃",
 "蜂": "𦾌",
 "䅗": "𦾎",
 "臥": "𦾐𧗄𧨭𫇉",
 "腷": "𦾕",
 "暐": "𦾛",
 "𢕹": "𦾡",
 "搉": "𦾣",
 "摺": "𦾬",
 "牓": "𦾭",
 "榦": "𦾮",
 "摷": "𦾱𫬈",
 "酸": "𦾹𩆑",
 "銚": "𦾺",
 "遘": "𦾼",
 "鳶": "𦿂",
 "暢": "𦿄",
 "碭": "𦿆",
 "朅": "𦿋",
 "榛": "𦿒",
 "蓷": "𦿕",
 "葅": "𦿘",
 "漗": "𦿞",
 "𥠁": "𧀁",
 "細": "𧀇𪷉𫄕𫋘𫎰𫙶𫱫𬗱𬗽𬘅𬧐",
 "綵": "𧀊",
 "漱": "𧀌",
 "銃": "𧀏",
 "緹": "𧀠",
 "潐": "𧀡𪇶",
 "蹀": "𧀢",
 "潦": "𧀪",
 "殤": "𧀫",
 "蹄": "𧀰𬖀",
 "蔕": "𧀱𨘬",
 "閱": "𧀲",
 "槧": "𧀵",
 "儋": "𧀻",
 "蒩": "𧀽",
 "汖": "𧁆",
 "慜": "𧁋",
 "㵕": "𧁑",
 "樣": "𧁒",
 "儂": "𧁓",
 "鞍": "𧁟",
 "𥡂": "𧁩",
 "𧡖": "𧁪",
 "衝": "𧁬",
 "斳": "𧁲",
 "撫": "𧁵",
 "彙": "𧁸",
 "遴": "𧁽𫸈",
 "獨": "𧁿𪈌",
 "頷": "𧂃",
 "穇": "𧂅",
 "皤": "𧂉",
 "憑": "𧂋",
 "燋": "𧂒",
 "芅": "𧂓",
 "潟": "𧂙",
 "窶": "𧂜",
 "萸": "𧂟",
 "鮑": "𧂫",
 "𦔐": "𧂬",
 "醖": "𧂯",
 "賮": "𧂰",
 "險": "𧂹",
 "錄": "𧃆",
 "膳": "𧃇",
 "餘": "𧃋𬉣",
 "踏": "𧃌",
 "歜": "𧃏",
 "蹢": "𧃐",
 "鍵": "𧃑",
 "縷": "𧃒𪈜",
 "韓": "𧃙𬉧",
 "購": "𧃛",
 "孺": "𧃨",
 "燐": "𧃮",
 "獴": "𧃶",
 "徽": "𧃸𩽚",
 "翹": "𧄍",
 "繢": "𧄑",
 "儲": "𧄔",
 "織": "𧄕",
 "釐": "𧄚",
 "鞫": "𧄛𨰌𩧛",
 "繠": "𧄜",
 "鵙": "𧄞",
 "鶂": "𧄷",
 "識": "𧄹",
 "鏨": "𧅀",
 "疆": "𧅁",
 "繰": "𧅂",
 "爊": "𧅃",
 "霧": "𧅑𪴟𫝞𬉮",
 "羺": "𧅘",
 "櫬": "𧅜",
 "馨": "𧅥",
 "䕟": "𧅦",
 "奥": "𧅨𬤡𬸩",
 "蛮": "𧅬𪮳𫣢𬉁𬠱𬡯",
 "𡈹": "𧅲",
 "穰": "𧅼",
 "糴": "𧆀",
 "䜟": "𧆂",
 "禴": "𧆆",
 "蠲": "𧆇",
 "鱉": "𧆊",
 "矕": "𧆏",
 "麤": "𧆓𪋻",
 "⻁": "𧆟𧇨𧇫𧇬𧇳𧈏𧈛",
 "䖍": "𧆶𧇈𧇉𩺇",
 "𡕘": "𧊵",
 "蚞": "𧌨",
 "祁": "𧌴𩷾",
 "厖": "𧎞𩤴",
 "䢹": "𧎟",
 "貣": "𧎢",
 "特": "𧎬𬃿𬌣",
 "蜇": "𧏄",
 "资": "𧏗𫞚",
 "𦮕": "𧏥",
 "亳": "𧐢𪢁𪯒",
 "菶": "𧑑",
 "琵": "𧑜",
 "掾": "𧑝",
 "㨗": "𧑻",
 "䟫": "𧑽𬴞",
 "蝥": "𧒚",
 "𠂂": "𧒟",
 "茧": "𧒨",
 "遗": "𧒭𬉋𬤦",
 "舅": "𧒺𬄵",
 "僞": "𧓯",
 "霆": "𧓴",
 "螻": "𧔅",
 "逄": "𧔧𧜨𪳖",
 "暹": "𧔷",
 "噧": "𧔺",
 "雕": "𧔿",
 "谿": "𧕉",
 "貘": "𧕤𧕥",
 "醫": "𧕪𧮒",
 "騜": "𧕸",
 "翽": "𧕼𧖢",
 "闥": "𧖆",
 "㠭": "𧖉𧝑𧝣𩧝",
 "巒": "𧖖",
 "鱣": "𧖞",
 "牡": "𧚒𪋂",
 "帋": "𧚓",
 "汱": "𧚚",
 "𡶤": "𧚸",
 "岺": "𧛎",
 "㣥": "𧛶",
 "茙": "𧜆",
 "挙": "𧜎",
 "娶": "𧜱",
 "裒": "𧝘",
 "傀": "𧝛",
 "傌": "𧝥",
 "裂": "𧝦",
 "督": "𧝴",
 "詳": "𧞆",
 "諑": "𧞮",
 "駢": "𧟁",
 "钁": "𧟝",
 "烓": "𧟼",
 "宎": "𧠽",
 "䂓": "𧡯",
 "𧗊": "𧢙",
 "𡕒": "𧥪𨚾𨚾𪄍",
 "匜": "𧦩",
 "厊": "𧧝𬣨",
 "厏": "𧨊𬣶",
 "迤": "𧪁",
 "荂": "𧪮𨃖",
 "悖": "𧪶",
 "笈": "𧫑",
 "喦": "𧬌𬤠",
 "諍": "𧬦",
 "朢": "𧭅",
 "暜": "𧭘",
 "魅": "𧭵",
 "諴": "𧭻",
 "䝿": "𧭾𨘤",
 "邁": "𧮇𫬱",
 "謇": "𧮎",
 "瀕": "𧮝",
 "竇": "𧮡",
 "嗀": "𧲇𩍤",
 "箑": "𧲌𨘉",
 "蚔": "𧷑",
 "堵": "𧹻",
 "汀": "𧻟𬵋",
 "岪": "𧼗",
 "𡋐": "𧼻",
 "𢍆": "𧽁",
 "起": "𧽇𧽈𫎼𬏌",
 "欯": "𧽓",
 "薊": "𧾯",
 "叏": "𨀆𨥻",
 "𧆞": "𨂶𨄪𨕑𨘮𪑷",
 "挑": "𨃑",
 "娕": "𨃢",
 "倒": "𨃫𪝻",
 "屚": "𨄋𨫒𨱐𪮪𪳬",
 "捼": "𨄖",
 "悼": "𨄵",
 "粒": "𨅀𩻑",
 "啐": "𨅇",
 "跣": "𨅩",
 "頍": "𨆆",
 "損": "𨆥",
 "輊": "𨆧",
 "蒲": "𨆶𩟢𪇨",
 "閶": "𨇡",
 "躎": "𨇳",
 "竅": "𨇶",
 "蹎": "𨈃",
 "拌": "𨉠",
 "悪": "𨉼𫫖",
 "耋": "𨊆",
 "軀": "𨊘",
 "蹔": "𨊝",
 "𠬪": "𨋻",
 "楘": "𨎸",
 "輻": "𨏟",
 "轡": "𨏯",
 "輾": "𨏲",
 "輚": "𨏺",
 "咖": "𨔗",
 "枷": "𨔣",
 "赴": "𨕍",
 "倓": "𨕪",
 "笏": "𨖃",
 "笙": "𨖬𪡾",
 "雄": "𨗑",
 "葦": "𨗨𫣤",
 "痯": "𨘃",
 "禍": "𨘌",
 "槽": "𨘨",
 "醁": "𨘭",
 "輲": "𨘼",
 "鷸": "𨙧",
 "𨙨": "𨛜𨞠𨞰",
 "稓": "𨞒",
 "蔓": "𨞼𫲏",
 "𦗟": "𨟡",
 "麓": "𨟤",
 "淰": "𨢯",
 "嬐": "𨣻",
 "醟": "𨤂",
 "汲": "𨦮",
 "邢": "𨦹",
 "㔷": "𨧇",
 "判": "𨧘𫆠𬇯",
 "肝": "𨧠",
 "陂": "𨧦",
 "抾": "𨨤",
 "壵": "𨩒𨩓",
 "鈹": "𨪅",
 "茗": "𨪓",
 "牷": "𨪔",
 "鉬": "𨪵",
 "健": "𨫡",
 "球": "𨫣𫳰",
 "荾": "𨫳",
 "盔": "𨫿",
 "窓": "𨬃𫯸𬄔",
 "筒": "𨬎𪢉",
 "筈": "𨬼",
 "苖": "𨭈𩤱",
 "腔": "𨭏𨭒",
 "統": "𨭑𫌒𫫴𬔕",
 "靳": "𨭠𬎔",
 "滔": "𨭡𬀝",
 "圖": "𨮢𪛇𫻒",
 "蓉": "𨮥𫲇𬒦",
 "鏢": "𨮬",
 "箇": "𨮱",
 "𢾾": "𨯋",
 "億": "𨯑𬟆",
 "篦": "𨯥",
 "蕚": "𨯫𬵸",
 "篱": "𨯽",
 "鍳": "𨯿",
 "闐": "𨰎𨶷",
 "藋": "𨰑",
 "㸑": "𨰨",
 "釈": "𨰪",
 "屆": "𨵠",
 "洫": "𨵨",
 "适": "𨶐",
 "誾": "𨶡",
 "側": "𨶨",
 "視": "𨶳",
 "閤": "𨶼",
 "絡": "𨷀",
 "熅": "𨷐",
 "𡺳": "𨷒",
 "塾": "𨷙",
 "錐": "𨷫",
 "燹": "𨷹𩰟",
 "币": "𨸴",
 "昴": "𨺸𩤶𩹡𪲺𬶘",
 "𠦬": "𨻾",
 "肊": "𨼉",
 "堶": "𨼢",
 "筶": "𨼵",
 "賡": "𨽔",
 "雒": "𩁗𩦼",
 "沉": "𩂸𫪌",
 "佔": "𩃅",
 "泫": "𩃚𫈞",
 "昑": "𩃛",
 "沱": "𩃱𬐥",
 "砏": "𩃼",
 "洏": "𩄋",
 "拯": "𩄔",
 "浼": "𩄬",
 "雺": "𩄯",
 "哢": "𩄺",
 "洴": "𩅅",
 "湳": "𩅠",
 "湘": "𩅪",
 "𡙕": "𩅱",
 "渾": "𩅴",
 "渥": "𩅵",
 "𥪖": "𩆇",
 "搖": "𩆋",
 "滛": "𩆍",
 "卌": "𩆕𫉰𫉰",
 "潸": "𩆤",
 "澍": "𩆩",
 "荗": "𩆪",
 "濈": "𩆭",
 "澰": "𩆯",
 "濯": "𩆸",
 "灄": "𩇋",
 "纖": "𩇏",
 "奜": "𩇼𩥰",
 "㸚": "𩈾𫁙",
 "佻": "𩋍",
 "苨": "𩋪",
 "氈": "𩎄",
 "庖": "𩎾",
 "庈": "𩒯",
 "眛": "𩔠",
 "逵": "𩕜",
 "愿": "𩕮",
 "徫": "𩙃",
 "逾": "𩙋𫕲",
 "檒": "𩙐",
 "飌": "𩙣",
 "⻛": "𩙥𩙦𩙧𩙨𩙩𩙪𩙫𩙬𩙮𩙯𩙰",
 "杋": "𩛳",
 "祅": "𩜸",
 "𣎼": "𩝰",
 "⻠": "𩟾𩟿𩠀𩠁𩠂𩠃𩠄𩠇𩠉𩠊𩠋𩠌𩠍𩠎𩠏",
 "姬": "𩠯",
 "坙": "𩣪",
 "驃": "𩦾",
 "顃": "𩧔",
 "驢": "𩧥",
 "㣇": "𩫚𪤐𫩁𫲌𫹇𫺟𬗧",
 "㘶": "𩫟",
 "彷": "𩭔",
 "材": "𩭘",
 "彿": "𩭬",
 "濱": "𩰄",
 "沸": "𩰾𩱣",
 "⻓": "𩲒",
 "斎": "𩴚𬓖",
 "𡗢": "𩶮",
 "抗": "𩷠𫩽",
 "挌": "𩹕",
 "逋": "𩺼",
 "逝": "𩻔",
 "鄰": "𩽂",
 "𤴔": "𪀑䔫",
 "𢑑": "𪀫𪔁𪚨",
 "𩾪": "𪀱",
 "𪥤": "𪀺",
 "牝": "𪀻𪊯𬸋",
 "皃": "𪁤𫳨",
 "乕": "𪁦",
 "𠤕": "𪁬𪵊𬅃𬲒",
 "𡶇": "𪁷𪂨",
 "鴡": "𪂓",
 "芪": "𪂛",
 "兓": "𪂫憯鐕𬸓",
 "𡔢": "𪃇",
 "茋": "𪃖",
 "𥘣": "𪃚",
 "𡧱": "𪃜𫮺",
 "瞗": "𪃥",
 "垕": "𪃫",
 "𤔄": "𪃴𪲾𬞢𬷤",
 "栞": "𪄃",
 "宻": "𪄋",
 "㝐": "𪄑",
 "浩": "𪄣𬈻𬪵",
 "𣆫": "𪅉",
 "𪺏": "𪅊",
 "淶": "𪅍𪆵",
 "眽": "𪅚",
 "𨾏": "𪅥",
 "喉": "𪅺",
 "𪀲": "𪅻",
 "𤊙": "𪆅",
 "菟": "𪆆",
 "𤉷": "𪆈",
 "朙": "𪆌",
 "𡉐": "𪆕",
 "鉏": "𪆷",
 "滑": "𪆸𫾈",
 "𧧑": "𪆿",
 "禓": "𪇚",
 "㢕": "𪇛",
 "𦵯": "𪇜",
 "𥮗": "𪇢",
 "𫏬": "𪇣",
 "戮": "𪇯",
 "𡎸": "𪇼",
 "𨿳": "𪇿",
 "𠾧": "𪈀",
 "遹": "𪈄",
 "頼": "𪈈懶獺𪈎",
 "𩃮": "𪈑",
 "𥱩": "𪈓",
 "嶭": "𪈖𫲖",
 "㬥": "𪈚𪈫",
 "皼": "𪈞",
 "嶽": "𪈡",
 "䉅": "𪈢",
 "鵢": "𪈨𪈬",
 "瀖": "𪈯",
 "灌": "𪈸𫕷",
 "𪋘": "𪈹",
 "權": "𪈻",
 "𪅝": "𪈼",
 "鷹": "𪈾𪿅𬷺",
 "鴫": "𪉀",
 "塷": "𪉩",
 "𣆪": "𪉷𬅯",
 "𢀩": "𪊈𪎀𪙸𪙼",
 "𧘇": "𪊘𪒌𪱆𪱭𪹷𪼨𫖐𫞽𫟚𫟝𫵅𫻡𬋟𬍀𬎜𬏋𬡇𬡏𬡑𬡗𬡚𬡝𬡡𬡫𬬕",
 "况": "𪋃",
 "䠶": "𪋧",
 "霊": "𪋳",
 "𩴶": "𪋺",
 "䒚": "𪍋",
 "俻": "𪍞",
 "𢁙": "𪍫",
 "𧰮": "𪍭",
 "𢾕": "𪍾𪓾",
 "㯤": "𪎂𬆵𬛷",
 "？": "𪎍𪎎𪗲𫓕𫝖𫞙𫠕",
 "𡯂": "𪏍",
 "䚵": "𪏡",
 "㇉": "𪏾𫾾",
 "㤐": "𪐇",
 "𡼁": "𪐑",
 "𪏰": "𪐒",
 "𪏽": "𪐕",
 "㞧": "𪐹",
 "𣏋": "𪑘𫙢",
 "𣏼": "𪑞",
 "𡱂": "𪑣",
 "𠪩": "𪒁𬆴",
 "玈": "𪒓",
 "𠔿": "𪒣𪓙𪥌𪶓𫈦𬌾𬔩",
 "𢀛": "𪒧",
 "疳": "𪒷",
 "𪐗": "𪒸",
 "𪐡": "𪒻",
 "𣊖": "𪒾",
 "𡭊": "𪓁",
 "瞐": "𪓆",
 "夻": "𪓡",
 "𠂊": "𪓣𪓻𪭺𫁜𫁜瓊𫡓𫦘𫹬𫿶𬊟𬌾𬎘𬏻𬘇𬪹𬫹",
 "𪔅": "𪔈",
 "𦙃": "𪔤",
 "僜": "𪔶",
 "𧆛": "𪕽",
 "𠃏": "𪖑",
 "𡉀": "𪖜",
 "𠬶": "𪖧𫤆𫳮𬖳",
 "臰": "𪖻𪳳",
 "𠘨": "𪗎𪞵𫥞",
 "𧾷": "𪘏𫏀𫏁𫏂𫏃𫏄𫏅𫏆𫏇𫏈𫏉𫏊𫏋𫏌𫏍𫏎𫏏𫏑𫏒𫏓𫏖𫏗𫏘𫏙𫏚𫏛𫏜𫏝𫏞𫏟𫏠𫏡𫏢𫏣𫏤𫏥𫏦𫏧𫏨𫏩𫟣𬆏𬦠𬦡𬦢𬦣𬦤𬦥𬦦𬦧𬦨𬦩𬦪𬦫𬦬𬦮𬦯𬦰𬦱𬦲𬦳𬦴𬦵𬦶𬦷𬦸𬦹𬦺𬦻𬦽𬦾𬦿𬧀𬧂𬧃𬧄𬧅𬧆𬧇𬧉𬧊𬧋𬧌𬧍𬧎𬧏𬧐𬧑𬧒𬧓𬧔𬧕𬧖𬧗𬧘𬧙𬧚𬧛𬧜𬧝𬧞𬧟",
 "佐": "𪘓𪘡𬺇",
 "佗": "𪘕",
 "𠇾": "𪘠",
 "𡧧": "𪘫",
 "𡯛": "𪙄",
 "㞕": "𪙆𪙇",
 "斊": "𪙘",
 "卨": "𪙚𪳣",
 "禼": "𪙥",
 "𦧚": "𪙬",
 "䏈": "𪚀",
 "𪙹": "𪚍",
 "犭": "𪚓𪺷𪺸𪺹𪺺𪺻𪺼𪺾𪺿𪻀𪻁𪻂𪻃𪻄𪻅𪻆𪻇𪻈𪻋𪻌𫉬𫞣𫞤𤠔獺𬌩𬌫𬌬𬌭𬌮𬌯𬌱𬌲𬌴𬌵𬌶𬌷𬌸𬌹𬌺𬌻𬌼𬌽𬌿𬍀𬍁𬍂𬍃𬍄𬍅𬍇𬮋",
 "龖": "𪚥𪚥",
 "龱": "𪚨𪦅",
 "𠂭": "𪚴𬇈",
 "𠙇": "𪛀",
 "𤇫": "𪛁",
 "欪": "𪛐",
 "𪚰": "𪛖",
 "𤰻": "𪝌",
 "柃": "𪝎",
 "俥": "𪝠",
 "晱": "𪝧",
 "佯": "𪝩",
 "𡆫": "𪝩𬠄𬩌𬵎",
 "亇": "𪝪𪝱𪞀𪟳𪠉𪡉𪡍𪣱𪤲𪤸𪥥𪥯𪥾𪩬𪫓𪫶𪬫𪮯𪯊𪰇𪰰𪱕𪲣𪶏𪸄𪾆𪿸𫁞𫆡𫉼𫋶𫎑𫎚𫕸𫠦𫡐𫡔𫢖𫧣𫧦𫴬𫶜𬂆𬂨𬆒𬋆𬋫𬋱𬌣𬎻𬎽𬐸𬑅𬓗𬕳𬕺𬖩𬞮𬢞𬦡𬨻𬪄𬪽𬬃",
 "詵": "𪝮",
 "瑪": "𪝰",
 "霓": "𪝷𬰖",
 "𦻱": "𪝸",
 "偏": "𪝹𫣪𫣱𫤑",
 "偵": "𪝽",
 "鬊": "𪝾",
 "咲": "𪞄",
 "𠬤": "𪞝𪪴𪹀𫋷𬖘𬦫𬲳",
 "龨": "𪞩",
 "𠓛": "𪞶",
 "㚐": "𪟃𫰜",
 "刔": "𪟅",
 "𡥵": "𪟓",
 "𤲶": "𪟧",
 "𠃓": "𪟮𪽈𫚊𫵵𫹽𫼟𬓸𬛹𬦅𬲰",
 "佫": "𪟰𪧒",
 "𫎬": "𪟲𫤽",
 "𣦵": "𪠀",
 "𣍮": "𪠒",
 "𣪘": "𪠔𫏯𫱥𫳷",
 "圧": "𪠦",
 "刼": "𪠱𫽅",
 "⺍": "𪡚𫝂𫞢𫳍𬒈𬳸",
 "䣅": "𪡪",
 "唄": "𪡮",
 "赉": "𪡺",
 "𫇰": "𪡻𬞰𬞺𬟗𬟛",
 "着": "𪢂𬍃",
 "握": "𪢅",
 "𨔾": "𪢆",
 "啉": "𪢇",
 "筨": "𪢑",
 "赘": "𪢕",
 "撮": "𪢚",
 "鋪": "𪢜",
 "鄊": "𪢞",
 "嗃": "𪢟",
 "冇": "𪢹",
 "𣏒": "𪣖",
 "𥤥": "𪣞",
 "𤰠": "𪣨",
 "垃": "𪣱",
 "叙": "𪣶𪣸",
 "恰": "𪣺",
 "𣳾": "𪤉",
 "联": "𪤚",
 "訪": "𪤜",
 "𦰩": "𪤱𪪫嘆𬥮",
 "叿": "𪤳",
 "𡗗": "𪥐𪩫𫋫𫯠𫯪",
 "昛": "𪥖",
 "堹": "𪥟",
 "奸": "𪥻𫰸𫱅𫱸",
 "姯": "𪦉",
 "紀": "𪦏",
 "妱": "𪦐",
 "𣂜": "𪦑",
 "𩂜": "𪦦",
 "𤲥": "𪦧",
 "𣍓": "𪦳",
 "𠫡": "𪧌",
 "𡇂": "𪧏𪲗",
 "⺀": "𪧑𪶳𫥎𫷯",
 "𤽈": "𪧖",
 "𨈡": "𪧤",
 "𡝌": "𪧩",
 "捽": "𪨃",
 "煨": "𪨆",
 "伇": "𪨍",
 "菫": "𪨒",
 "轧": "𪨩𬒄",
 "𡘃": "𪨻",
 "峉": "𪩄",
 "𢧐": "𪩔",
 "𫜩": "𪩛",
 "夿": "𪪔",
 "𦔻": "𪪚𫳛",
 "耻": "𪪪𬚣",
 "𩂊": "𪪲𫑄",
 "𩺰": "𪫅",
 "頪": "𪫇𬕿",
 "呚": "𪫎",
 "𩵋": "𪫔𫙓𫙭",
 "𢓥": "𪫗",
 "辳": "𪫛𫣳𬋔",
 "𪟽": "𪫢𪿒𫺱𬅽𬏝",
 "仞": "𪫫",
 "𡚱": "𪫴",
 "阥": "𪫽",
 "𡛊": "𪫾",
 "祀": "𪬂𪲢𫀟",
 "䀛": "𪬊",
 "𪾋": "𪬌𪷞𫽝𬄱𬈋𬗻",
 "莒": "𪬠",
 "勖": "𪬢",
 "塹": "𪬷",
 "𠔳": "𪬸𫄔𫍓𫯙𬖄",
 "𥰓": "𪬻",
 "辨": "𪭀",
 "𩌌": "𪭅",
 "誩": "𪭇𫊂",
 "㕯": "𪭙",
 "勽": "𪭠",
 "书": "𪭣",
 "决": "𪭱",
 "𫔮": "𪭾",
 "抨": "𪮂",
 "𦬾": "𪮎",
 "𢍃": "𪮓",
 "绝": "𪮖𫈵𫦌𫦳",
 "𫀄": "𪮗歲",
 "𦮎": "𪮙",
 "船": "𪮥𬜕",
 "粗": "𪮩𫏝𬖼",
 "㪚": "𪮫",
 "㦸": "𪮮",
 "𥲶": "𪮹",
 "𧁙": "𪯃",
 "勸": "𪯄",
 "𡗩": "𪯅",
 "𥹹": "𪯚",
 "𥃫": "𪯽𬑝",
 "𩚇": "𪰁",
 "𦖞": "𪰅",
 "𠚾": "𪰝",
 "𢗼": "𪰨",
 "𠀎": "𪱆𪹷𫞽𬬕",
 "腰": "𪱘",
 "𢋨": "𪱰",
 "弎": "𪲃",
 "𠘻": "𪲊",
 "𨚌": "𪲐",
 "𡶟": "𪲤",
 "𪟄": "𪲫",
 "废": "𪲮𫂈",
 "杮": "𪲳",
 "𣐞": "𪲴",
 "耉": "𪲶",
 "䍒": "𪲷",
 "临": "𪲹",
 "朽": "𪳋",
 "㫧": "𪳑",
 "啄": "𪳓",
 "梄": "𪳝𫂘",
 "𤽤": "𪳠",
 "𣱲": "𪳢",
 "𣐩": "𪳦𪻼𬪎",
 "𩇫": "𪳧",
 "𣁐": "𪳩",
 "坣": "𪳯",
 "杼": "𪳻",
 "跳": "𪴁𬵰",
 "熇": "𪴍",
 "𡵩": "𪴢",
 "榕": "𪴣",
 "𡬠": "𪴦𬅏𬅕𬅘𬅜",
 "籣": "𪴧",
 "𡰥": "𪴫",
 "𣲆": "𪵶",
 "沬": "𪶚",
 "拼": "𪶜",
 "珆": "𪶝",
 "𦏾": "𪶡",
 "俆": "𪶢",
 "𢍉": "𪶣𬝕",
 "孪": "𪶧",
 "恶": "𪶮𫫇𬅂",
 "栢": "𪶯",
 "峷": "𪶱",
 "𠫝": "𪶷",
 "浗": "𪷀",
 "〢": "𪷃𪾋𫌋𫏠𫝋𫝌𫤰𫥪𫰐𫺙𫽛𫽻𬂍𬄦𬌛𬗋𬜤𬮷𬹔",
 "𡨼": "𪷅",
 "㝠": "𪷆",
 "𦓎": "𪷌",
 "靓": "𪷍",
 "䝉": "𪷟𫎇𬂔",
 "萲": "𪷠𬣊",
 "浊": "𪷡",
 "𢞍": "𪷨",
 "𤾓": "𪷩",
 "閨": "𪷭",
 "粽": "𪷯",
 "韶": "𪷰",
 "赛": "𪷱𫬐",
 "霈": "𪷳",
 "錡": "𪷼",
 "渡": "𪸁",
 "䌛": "𪸅",
 "鎔": "𪸆",
 "疇": "𪸈",
 "鯨": "𪸉",
 "淨": "𪸊",
 "闢": "𪸌",
 "戓": "𪸬",
 "𤆌": "𪸲𫨈",
 "䀐": "𪸹",
 "侄": "𪸽",
 "灾": "𪹀",
 "耐": "𪹅",
 "灳": "𪹌𬊟",
 "珦": "𪹔",
 "㫬": "𪹕",
 "𤇸": "𪹬",
 "炆": "𪹰",
 "焴": "𪹲",
 "暏": "𪹶",
 "阘": "𪹹",
 "𣕡": "𪹻",
 "𤇾": "𪹽",
 "㯎": "𪺂𫻓",
 "炮": "𪺃𬋗𬋚",
 "龝": "𪺋",
 "墨": "𪺌𬡶",
 "腊": "𪺦",
 "𫇦": "𪺴𪼘𫉂𬝂",
 "团": "𪺺𬣫",
 "𥎵": "𪻇",
 "𤝋": "𪻉",
 "玧": "𪻰",
 "𤤔": "𪼂",
 "𤣩": "𪼅",
 "亼": "𪼔𫝆𫝇𫝉瀹𫢕𫤆𫿄𬈝𬝧𬪏",
 "雯": "𪼗𫱭𬈳",
 "冕": "𪼚",
 "磐": "𪼪",
 "寰": "𪼮",
 "贇": "𪼱",
 "𠂡": "𪽆𫏦",
 "気": "𪽺",
 "泈": "𪾒",
 "城": "𪾓𬁃",
 "飯": "𪾗",
 "鈚": "𪾘",
 "湄": "𪾛",
 "斁": "𪾜𫓡",
 "盘": "𪾝𪿱𫮠",
 "𠮲": "𪾨",
 "弖": "𪿓𫢏",
 "兴": "𪿝𬠇",
 "𤽄": "𪿧𫁇",
 "码": "𪿫",
 "傎": "𪿰",
 "窑": "𪿲",
 "𡩏": "𪿷",
 "𪿒": "𪿹𬒜",
 "𥭴": "𪿺",
 "𥪡": "𪿻",
 "硃": "𪿽",
 "蕃": "𪿾",
 "𡧎": "𫀵",
 "𠀐": "𫁁",
 "佴": "𫁓",
 "掘": "𫁗",
 "卫": "𫁱",
 "帆": "𫁼",
 "柾": "𫂊",
 "𢼾": "𫂜",
 "𥬟": "𫂢",
 "𥚎": "𫂦",
 "賦": "𫂩",
 "謄": "𫂭𬟙",
 "蠃": "𫂯𫨁",
 "𦥚": "𫃈𬃤𬈍",
 "葚": "𫃒",
 "糺": "𫃛",
 "亿": "𫃝",
 "妞": "𫃩",
 "𥐧": "𫃫𬜽",
 "𤓻": "𫃭",
 "𣱳": "𫃱𬓈",
 "虳": "𫃳",
 "逃": "𫃹",
 "𨁡": "𫄌",
 "綝": "𫄒",
 "𥂮": "𫄖",
 "籐": "𫄘",
 "丧": "𫄪",
 "⺻": "𫄽",
 "𠨿": "𫅕",
 "胆": "𫅝",
 "渐": "𫆏𫗚𬞋𬰣",
 "𥘈": "𫆔𬠛",
 "闭": "𫆝𫴼𫼫𬌱𬎵",
 "浱": "𫆬",
 "梔": "𫆱",
 "荸": "𫆲",
 "𦴼": "𫆹",
 "蒡": "𫆼",
 "腫": "𫇁𬉎",
 "腦": "𫇂",
 "𠥶": "𫇉𫿈",
 "𦏁": "𫇣",
 "𠆳": "𫇳",
 "伽": "𫈆",
 "庇": "𫈋",
 "劲": "𫈎",
 "昀": "𫈔𬕐",
 "𠣜": "𫈖",
 "㕿": "𫈗",
 "侫": "𫈘",
 "𢗰": "𫈝",
 "陈": "𫈟",
 "𨊠": "𫈣",
 "𥎯": "𫈫",
 "𦍑": "𫈯𫪾𫱎",
 "尛": "𫈳",
 "桐": "𫈷",
 "核": "𫈺",
 "𦭝": "𫈼",
 "浰": "𫉃",
 "恕": "𫉅",
 "紦": "𫉇",
 "琍": "𫉋",
 "匏": "𫉌",
 "閈": "𫉑",
 "偉": "𫉔𬎉",
 "脖": "𫉖",
 "𣷌": "𫉗",
 "淗": "𫉙",
 "𧦈": "𫉚",
 "𢜈": "𫉝",
 "䓵": "𫉞",
 "脺": "𫉡",
 "湖": "𫉣",
 "勢": "𫉥𫸾",
 "嗚": "𫉩",
 "粮": "𫉱",
 "𠭃": "𫉶䵖",
 "歌": "𫉸",
 "𨕵": "𫉽",
 "廍": "𫉾",
 "漏": "𫊁",
 "綢": "𫊃",
 "緇": "𫊄",
 "澁": "𫊉",
 "糊": "𫊊",
 "潗": "𫊋",
 "𪫙": "𫊏",
 "磻": "𫊑",
 "鮭": "𫊒",
 "鴻": "𫊓",
 "𦓤": "𫊕",
 "臍": "𫊖",
 "𥃆": "𫊗",
 "鏄": "𫊙",
 "躑": "𫊛",
 "𧈹": "𫊲",
 "枭": "𫋇𫪧𫽐𬇼",
 "贷": "𫋌",
 "𡬳": "𫋜",
 "蜝": "𫋣",
 "膋": "𫋥",
 "趣": "𫋦",
 "諫": "𫋨",
 "蜆": "𫋩",
 "謝": "𫌗",
 "峰": "𫌛",
 "謀": "𫍍𬣌",
 "辭": "𫍗",
 "𡕩": "𫍺",
 "𡗮": "𫎈",
 "𩒳": "𫎥𬐿",
 "爸": "𫏒",
 "轻": "𫏕",
 "泴": "𫏘",
 "𨊢": "𫐁",
 "寠": "𫐂",
 "𣎷": "𫐚",
 "庁": "𫐤",
 "𦬰": "𫐬",
 "粆": "𫐽",
 "𣭵": "𫐿",
 "䴢": "𫑃",
 "𠢋": "𫑊",
 "筵": "𫑎",
 "𠂎": "𫑗卿卿𫧻",
 "㕓": "𫑮",
 "𥸩": "𫒄",
 "坤": "𫒨𬀾",
 "宝": "𫒭𬃏𬝄",
 "宖": "𫒮",
 "𪰖": "𫒱",
 "𡔧": "𫒸",
 "𪯌": "𫒺",
 "𪺮": "𫒻",
 "鉐": "𫓅",
 "鈺": "𫓈",
 "弼": "𫓎",
 "腐": "𫓘",
 "𨨖": "𫓝",
 "𢇁": "𫓣",
 "䇝": "𫓤",
 "𡕢": "𫓸",
 "㪯": "𫔤𫔳𬮌",
 "𫔭": "𫔷𫣽𬂻𬮫𬮶",
 "闹": "𫔹𫽔𬊢",
 "阳": "𫔿𬭏",
 "𠀷": "𫕆",
 "𥞓": "𫕏",
 "洌": "𫕪",
 "淖": "𫕭",
 "䏾": "𫕰",
 "靑": "𫕻𫕻",
 "鴹": "𫕿",
 "𤰇": "𫖔",
 "穆": "𫖜",
 "順": "𫖦𬱍",
 "𧋠": "𫖨",
 "𩙿": "𫗎𫗐𫗖𫗙𬲝",
 "𡧄": "𫗹",
 "廟": "𫗻",
 "𧉊": "𫘔",
 "紙": "𫘖𫷏",
 "𠕀": "𫙑",
 "扽": "𫙡",
 "𠭊": "𫙨",
 "𨋅": "𫙰",
 "輩": "𫚄",
 "珧": "𫚅",
 "师": "𫚕𬡔",
 "牨": "𫚟",
 "𨐌": "𫛅",
 "𥘿": "𫛍𬈙𬛵",
 "𤠗": "𫛖",
 "嘆": "𫛗",
 "𫀽": "𫛙",
 "纺": "𫛯",
 "㫖": "𫜎",
 "𡵂": "𫜥",
 "専": "𫝊",
 "転": "𫝚",
 "𠀆": "𫝣",
 "𡊙": "𫝷",
 "忈": "𫝹",
 "𠮦": "𫞃",
 "𫝁": "𫞉",
 "阙": "𫞝",
 "𫩏": "𫞞𫟜𫟝𫢤𫢽𬊟𬪹𬫹",
 "𡊮": "𫞤",
 "坮": "𫞱",
 "𫝀": "𫟘𫹥",
 "鼡": "𫠘",
 "囘": "",
 "曽": "僧憎",
 "嶲": "㒞",
 "免": "兔挽",
 "兔": "冤󠄁堍",
 "卽": "卿",
 "及": "吸",
 "𦍋": "哶",
 "成": "城",
 "艹": "",
 "硏": "揅",
 "𡘹": "掩淹䁆𦋙",
 "巢": "摷璅𥲀罺鄛",
 "甾": "椔",
 "異": "𣚣",
 "𠥽": "",
 "叹": "𣾎",
 "𡣍": "瀛",
 "𤆍": "爨",
 "真": "磌鬒",
 "𥬑": "築",
 "𣱵": "羕",
 "筓": "䗗",
 "鄕": "",
 "恳": "𫠺",
 "捉": "𫠼𬳚",
 "情": "𫠽",
 "𣱱": "𫡓",
 "𠔃": "𫡞",
 "悁": "𫡾𫻠",
 "吂": "𫢃𫢄𬉩",
 "𫾦": "𫢛𬧵",
 "爷": "𫢜",
 "𫭠": "𫢢𫳊𬆁𬥖𬩿𬹑",
 "刢": "𫢣",
 "𫇭": "𫢭",
 "芽": "𫢯",
 "贤": "𫢲𬜾",
 "𠒇": "𫢳",
 "宠": "𫢹",
 "𬎾": "𫢻𫪯",
 "𧥢": "𫣄",
 "侣": "𫣇𫣈",
 "𦚾": "𫣍",
 "𢛳": "𫣜𫩈",
 "葶": "𫣦",
 "僧": "𫣸",
 "倘": "𫤁𬆈",
 "㑛": "𫤅",
 "傾": "𫤉𫤎𫤏𫤒𫤓𫤕",
 "𠇩": "𫤋𬚣𬳖",
 "𫿞": "𫤌",
 "鶯": "𫤔𫬿",
 "夛": "𫤩",
 "𤕰": "𫤵𬌋𬛿",
 "𪦾": "𫤵",
 "𬐧": "𫤶𬲟",
 "𥥗": "𫦐",
 "䓨": "𫦕",
 "𠛫": "𫦗",
 "葍": "𫦚",
 "𬄜": "𫦜𫿣",
 "䇤": "𫦝",
 "剴": "𫦠",
 "鼈": "𫦣",
 "䅆": "𫦷",
 "㝬": "𫧚𬰒",
 "𫯺": "𫧛",
 "𠦅": "𫧢𫵚",
 "𠦪": "𫧨𫯉𬓒𬡪𬦙𬩂",
 "𥻆": "𫧷",
 "𪠁": "𫧻",
 "𫠩": "𫧽𬈖𬨧",
 "𪠲": "𫨒𫴢𫹀",
 "𡥨": "𫨗",
 "𫪡": "𫨘𬡫",
 "絅": "𫨛",
 "𣥤": "𫨞",
 "墉": "𫨠",
 "𬴘": "𫨣𫲒𬆻𬴜𬴠𬴡𬴢𬴣𬴤𬴥𬴦",
 "𫧇": "𫨩𫭿",
 "𡭔": "𫩊",
 "䣈": "𫩌𫮳",
 "𠕄": "𫩦",
 "伪": "𫩳",
 "边": "𫩸𫼯",
 "沁": "𫪍",
 "沕": "𫪏",
 "板": "𫪒",
 "欧": "𫪘",
 "芩": "𫪜",
 "侒": "𫪢",
 "姆": "𫪰",
 "柄": "𫪲",
 "拱": "𫪵",
 "挖": "𫪶",
 "𢬊": "𫪷",
 "𣵲": "𫪿",
 "挨": "𫫃",
 "挾": "𫫄",
 "缼": "𫫉",
 "𠮣": "𫫎𫲾",
 "烦": "𫫏",
 "掂": "𫫓",
 "𬂹": "𫫕",
 "莟": "𫫚",
 "莤": "𫫛",
 "𥬝": "𫫝",
 "透": "𫫟𫽾",
 "被": "𫫢𬡩𬬣",
 "阎": "𫫦𫾁𬙁𬤛",
 "琼": "𫫩",
 "𪿟": "𫫪𬛔",
 "窙": "𫫳",
 "㨨": "𫫶",
 "聘": "𫫺𬕴",
 "鈴": "𫫿",
 "躲": "𫬀",
 "話": "𫬃",
 "裴": "𫬍",
 "撒": "𫬒",
 "撈": "𫬓",
 "賬": "𫬖",
 "蝦": "𫬗",
 "諄": "𫬛",
 "擒": "𫬜",
 "霎": "𫬝",
 "醒": "𫬞",
 "膩": "𫬤",
 "儔": "𫬦",
 "篩": "𫬧",
 "㣈": "𫬫𫿦𬁯𬋝",
 "擠": "𫬬",
 "轄": "𫬭",
 "④": "𫬯𫸪𫹲",
 "濟": "𫬵",
 "擸": "𫬶",
 "騎": "𫬷",
 "警": "𫬺",
 "觸": "𫬼",
 "𤔔": "𫬽𬋶𬋹𬯙",
 "鐵": "𫬾",
 "鑒": "𫭀",
 "靂": "𫭁",
 "払": "𫭅",
 "貈": "𫭓",
 "苹": "𫮉𬃟𬍷",
 "𪺽": "𫮜𬺒",
 "窝": "𫮪",
 "墓": "𫮲",
 "緾": "𫮸",
 "𦼔": "𫮹",
 "𦾔": "𫮾",
 "𫶝": "𫮿",
 "逹": "𫯇𬇓𬎍",
 "夺": "𫯣",
 "顺": "𫯮",
 "刊": "𫰘𫹑",
 "仟": "𫰙𬫊",
 "𠮢": "𫰚",
 "𠀕": "𫰟",
 "杠": "𫰬",
 "𫩞": "𫰶𫿺𬔟",
 "𫂱": "𫰿𬠔",
 "茇": "𫱈",
 "羿": "𫱐",
 "𠕷": "𫱒",
 "𠲯": "𫱙",
 "𨳐": "𫱠",
 "娧": "𫱧",
 "𫤝": "𫱲",
 "矟": "𫱶",
 "塍": "𫲀",
 "祼": "𫲁",
 "敳": "𫲈",
 "薇": "𫲛",
 "𧰷": "𫲜",
 "龏": "𫲟",
 "𪠛": "𫲠",
 "㞭": "𫳁",
 "𫻨": "𫳉",
 "𡛼": "𫳙",
 "𥘪": "𫳠",
 "𥃦": "𫳤",
 "𨛡": "𫳦",
 "祜": "𫳫",
 "𫾶": "𫳴",
 "𨟻": "𫳼",
 "𬆪": "𫴈",
 "𫳭": "𫴋𫿨",
 "煙": "𫴍𬮕",
 "蒐": "𫴒𫸄",
 "𬉸": "𫴓",
 "禋": "𫴖",
 "𤍾": "𫴘𬋡",
 "𦘔": "𫴜𬚬",
 "豳": "𫴠",
 "䨮": "𫴤",
 "𬮈": "𫴨𬮔",
 "譶": "𫴪𬋠",
 "𡩧": "𫴫",
 "㤕": "𫵀",
 "𠮵": "𫵂",
 "尣": "𫵑𫵒",
 "㱏": "𫵙",
 "批": "𫵫",
 "䑂": "𫵬",
 "凬": "𫵽",
 "𢗭": "𫶃",
 "娥": "𫶏𬷭",
 "营": "𫶕",
 "碖": "𫶗",
 "𪫕": "𫶛",
 "𩒨": "𫶞",
 "屵": "𫶟",
 "𫕻": "𫶠𫻛",
 "㞌": "𫶤",
 "𡥷": "𫶤",
 "𧥥": "𫶪",
 "㐀": "𫷄",
 "宪": "𫷉𬃫",
 "攼": "𫷫",
 "炒": "𫷴",
 "𠱼": "𫷶",
 "艁": "𫸂",
 "𬙸": "𫸇",
 "頊": "𫸔",
 "𡖅": "𫸘",
 "𠣞": "𫸞",
 "②": "𫹆",
 "𢒎": "𫹊𬐐",
 "𠯊": "𫺃",
 "𪞘": "𫺇",
 "𠇤": "𫺑𬜳",
 "卲": "𫺕𫾸𬁤𬍨𬗞",
 "𢫕": "𫺖",
 "悍": "𫺥",
 "郑": "𫺫",
 "䏧": "𫺲",
 "匮": "𫺹",
 "令": "𫺽",
 "阋": "𫻁",
 "怕": "𫻅𫻋",
 "㱅": "𫻚",
 "薏": "𫻟",
 "愧": "𫻣",
 "羈": "𫻥",
 "𡬶": "𫼈",
 "忤": "𫼎",
 "𫼉": "𫼑",
 "𫲡": "𫼑",
 "𣿕": "𫼒",
 "𠇚": "𫼸",
 "级": "𫼾",
 "纳": "𫽀",
 "𪠨": "𫽍",
 "抇": "𫽑",
 "项": "𫽙𬃛",
 "哈": "𫽞",
 "𪽋": "𫽠",
 "笃": "𫽢𬈏𬊯𬡦",
 "举": "𫽥",
 "𡿺": "𫽨𬆛",
 "顿": "𫽫",
 "袅": "𫽲",
 "宸": "𫽴",
 "窇": "𫽵",
 "𡘽": "𫽷",
 "捔": "𫾅",
 "𦋐": "𫾇",
 "翚": "𫾉",
 "碗": "𫾊",
 "想": "𫾋",
 "筹": "𫾏",
 "㙯": "𫾓",
 "爕": "𫾠",
 "𫤫": "𫾮𬥕",
 "𢇛": "𫾯",
 "𫻶": "𫿎",
 "𫠤": "𫿑",
 "𫃅": "𫿝",
 "𢼂": "𫿟𬃈𬍉𬧶",
 "𣆑": "𫿪",
 "𬋝": "𫿫",
 "𬁯": "𫿬",
 "芇": "𫿹",
 "𠔽": "𫿻𬘆",
 "𬀷": "𬀑",
 "𤇷": "𬀓",
 "焝": "𬀙",
 "𫢀": "𬀞",
 "䲆": "𬀤",
 "珉": "𬁂",
 "𫢩": "𬁉",
 "𠅇": "𬁌",
 "旂": "𬁩𬣃",
 "𠇗": "𬁾",
 "𧊒": "𬂐",
 "𫑗": "𬂪",
 "仿": "𬂬",
 "𡉣": "𬂴𬤾",
 "芆": "𬂵𬫗",
 "𢌜": "𬂹",
 "桎": "𬂿",
 "勆": "𬃌",
 "𫶧": "𬃑𬇡",
 "𠕵": "𬃕",
 "䂞": "𬃖",
 "桮": "𬃙",
 "盺": "𬃞",
 "𡬫": "𬃢",
 "𫾩": "𬃥",
 "盐": "𬃳",
 "𠇔": "𬃵",
 "䒺": "𬃶",
 "荿": "𬃾",
 "𨛪": "𬄂",
 "𣵀": "𬄅",
 "桊": "𬄆",
 "軝": "𬄉",
 "𬜲": "𬄌",
 "㫷": "𬄛",
 "萘": "𬄠",
 "𠷰": "𬄥𬬉",
 "碁": "𬄯",
 "𥂀": "𬄳",
 "𩶷": "𬄴",
 "䟽": "𬄼𬞞",
 "𬞕": "𬅉𬉠𬧛",
 "薪": "𬅋",
 "甑": "𬅎",
 "誅": "𬅜",
 "叴": "𬅠",
 "𠲘": "𬅬",
 "斝": "𬅰",
 "䇂": "𬅵𬉃𬉅𬔩𬔩",
 "𫭋": "𬆐",
 "铍": "𬇃",
 "叠": "𬇇",
 "冭": "𬇜𬙛",
 "𣏉": "𬇲𬧪",
 "凮": "𬇺",
 "𠧦": "𬇿",
 "𦙟": "𬈀",
 "汫": "𬈈",
 "𣲪": "𬈊",
 "冟": "𬈒𬝙",
 "荥": "𬈜",
 "𦘶": "𬈝",
 "畗": "𬈠",
 "厠": "𬈦",
 "𢚩": "𬈬",
 "颇": "𬈱",
 "琪": "𬈲",
 "菩": "𬈸",
 "旑": "𬉀",
 "粪": "𬉂",
 "𬯻": "𬉈",
 "嗔": "𬉌",
 "嵟": "𬉍",
 "煌": "𬉒",
 "𧶐": "𬉓",
 "橫": "𬉟",
 "蕊": "𬉡",
 "𦒋": "𬉥",
 "𪟺": "𬉦",
 "璧": "𬉭",
 "緐": "𬉯",
 "鑾": "𬉲",
 "𫥞": "𬊄𬩼",
 "𫹭": "𬊆",
 "旳": "𬊏",
 "侎": "𬊞",
 "凭": "𬊠",
 "𫦪": "𬊫",
 "砧": "𬊲",
 "畑": "𬊴",
 "㿟": "𬊻𬹒",
 "𢇇": "𬋄",
 "煉": "𬋆",
 "歃": "𬋐",
 "働": "𬋒",
 "醀": "𬋕",
 "蓻": "𬋖",
 "𬉹": "𬋘",
 "𨾴": "𬋜",
 "⑲": "𬋢",
 "𠤻": "𬋯",
 "䖒": "𬋵",
 "𥩮": "𬋹",
 "𣥜": "𬌆𬛄",
 "𪜹": "𬌇",
 "峩": "𬌘",
 "𦤎": "𬍂",
 "𤤴": "𬍼",
 "𧘗": "𬎊",
 "㝢": "𬎒",
 "𥠖": "𬎙",
 "昙": "𬎬",
 "肀": "𬎾",
 "计": "𬏟",
 "㲹": "𬐛",
 "杨": "𬐠",
 "𬇥": "𬐮",
 "𦘪": "𬐵",
 "𫒘": "𬐹",
 "鐐": "𬑃",
 "鐀": "𬑄",
 "迹": "𬑢",
 "绵": "𬑧",
 "睡": "𬑩",
 "眜": "𬑫",
 "肇": "𬑷𬢅",
 "岜": "𬒏",
 "𠱄": "𬒖",
 "𬛸": "𬒧",
 "髪": "𬒨𬟂",
 "硬": "𬒩",
 "𬔖": "𬓨",
 "稤": "𬔂",
 "𢍁": "𬔍",
 "焅": "𬔓",
 "𡉑": "𬔺",
 "伩": "𬔻",
 "沟": "𬕋",
 "𣂔": "𬕕",
 "𪯲": "𬕗𬝅",
 "泍": "𬕙",
 "轱": "𬕛",
 "洹": "𬕠",
 "𫠥": "𬕢",
 "𫋲": "𬕦",
 "笛": "𬕫𬗺𬙀𬧍",
 "领": "𬕬",
 "𣔋": "𬕮",
 "援": "𬕯",
 "𠸜": "𬕰",
 "評": "𬕱𬞖",
 "𦖻": "𬕻",
 "𥯌": "𬕼",
 "𣆗": "𬖻",
 "𬏝": "𬖼",
 "枣": "𬗘",
 "箏": "𬘈",
 "𠪨": "𬘉𬥿",
 "燒": "𬘏",
 "觅": "𬘮",
 "𦊁": "𬙠𬲡",
 "缳": "𬙪",
 "𪣣": "𬙹",
 "𪪳": "𬙺",
 "練": "𬚎",
 "𫤘": "𬚠𬥉",
 "𢁳": "𬚮",
 "脹": "𬛙",
 "胎": "𬛝",
 "脚": "𬛟",
 "𫇆": "𬛧𬛫",
 "㘝": "𬜁",
 "湏": "𬜃",
 "詋": "𬜄",
 "𦨈": "𬜓",
 "𤿤": "𬜛",
 "艽": "𬜫",
 "𦬅": "𬜰",
 "𪞏": "𬜶",
 "冶": "𬜷𬝭",
 "怀": "𬜸",
 "纽": "𬜺",
 "㛁": "𬝈",
 "珎": "𬝍",
 "俐": "𬝒",
 "𢙇": "𬝗",
 "聁": "𬝝",
 "𦕂": "𬝞",
 "圃": "𬝟",
 "贼": "𬝠𬠠",
 "秧": "𬝣",
 "茨": "𬝩",
 "娳": "𬝲",
 "𣢾": "𬝺",
 "𥑴": "𬝻",
 "琇": "𬝽",
 "䢙": "𬝿",
 "逛": "𬞅",
 "袍": "𬞆",
 "淘": "𬞇",
 "淜": "𬞉",
 "𫃟": "𬞍",
 "㝹": "𬞎",
 "跒": "𬞐",
 "喃": "𬞑",
 "袴": "𬞔",
 "𬯎": "𬞘",
 "𥿻": "𬞙",
 "𧧬": "𬞛",
 "煦": "𬞜",
 "睦": "𬞝",
 "幐": "𬞡",
 "䅟": "𬞣",
 "萹": "𬞤",
 "𪪷": "𬞦",
 "㷔": "𬞨",
 "㙜": "𬞩",
 "滥": "𬞫",
 "嫆": "𬞬",
 "僡": "𬞶",
 "誑": "𬞷",
 "嫚": "𬞽",
 "𡘷": "𬞾",
 "鹝": "𬟁",
 "𫎇": "𬟃",
 "踷": "𬟅",
 "𬥉": "𬟈",
 "潓": "𬟉",
 "㦄": "𬟊",
 "緒": "𬟋",
 "𦂕": "𬟍",
 "⑯": "𬟏",
 "𨂠": "𬟐",
 "䳆": "𬟑",
 "頺": "𬟒",
 "憶": "𬟔",
 "縝": "𬟕",
 "𪧘": "𬟗𬟛",
 "穗": "𬟘",
 "𠯂": "𬟚",
 "曛": "𬟝",
 "馤": "𬟞",
 "菛": "𬟢",
 "瀨": "𬟣",
 "鬘": "𬟦",
 "𫠣": "𬟾",
 "𫩧": "𬠑",
 "泳": "𬠘",
 "䓁": "𬠟𬵣",
 "𢚸": "𬠥",
 "𥁞": "𬠨",
 "𦲸": "𬠬",
 "碧": "𬠲𬬓",
 "㪉": "𬠹",
 "蟮": "𬠺",
 "𪥌": "𬡢",
 "𧛱": "𬡭",
 "简": "𬡱",
 "𡘚": "𬡲",
 "⑧": "𬢆",
 "𪩲": "𬢉",
 "𢦑": "𬢥",
 "凼": "𬢩",
 "𬢫": "𬢫",
 "龺": "𬢺",
 "⑥": "𬢻",
 "䎡": "𬢽",
 "𬙮": "𬣂",
 "逨": "𬣆",
 "𨵩": "𬣖",
 "迈": "𬣴",
 "𥈀": "𬤧",
 "𦊽": "𬥇",
 "𬜯": "𬥊𬭮𬳏",
 "毆": "𬥍",
 "刜": "𬥚",
 "𫳇": "𬥤",
 "𧴧": "𬥭",
 "𪜕": "𬦃𬦼",
 "𫡓": "𬦍",
 "胐": "𬦕",
 "𬙜": "𬦚𬫸",
 "𣇛": "𬦝",
 "圪": "𬦬",
 "浽": "𬧇",
 "㚄": "𬨕",
 "𬋻": "𬨫",
 "狛": "𬨯",
 "𫦂": "𬨼",
 "淄": "𬩆",
 "𫱀": "𬩈",
 "祸": "𬩎",
 "剸": "𬩒",
 "䢅": "𬩚",
 "𦷊": "𬩞",
 "𦞼": "𬩡",
 "𡶫": "𬩫",
 "鵣": "𬩯",
 "戜": "𬩰",
 "仨": "𬩹",
 "𠰞": "𬪊",
 "茆": "𬪋",
 "贸": "𬪍",
 "𪡒": "𬪒",
 "尘": "𬪛",
 "𦤏": "𬪞",
 "𫊣": "𬪣",
 "𫹔": "𬪳",
 "圽": "𬫔",
 "𫻩": "𬫣",
 "𪜀": "𬫤",
 "軽": "𬬆",
 "睗": "𬬏",
 "蔣": "𬬙",
 "𥄲": "𬬝",
 "𫂐": "𬬞",
 "𦬮": "𬭒",
 "眗": "𬭧",
 "𢗀": "𬭱",
 "𠃔": "𬮽",
 "荑": "𬯐",
 "𫩁": "𬯓",
 "𢛲": "𬯝",
 "𬙩": "𬯦",
 "𪩡": "𬯮",
 "𬇚": "𬯽",
 "泡": "𬰀",
 "沫": "𬰃",
 "浄": "𬰆",
 "琳": "𬰋",
 "㜀": "𬰍",
 "𥺀": "𬰐",
 "隠": "𬰔",
 "𠓗": "𬱒",
 "𠃧": "𬲊",
 "𬙬": "𬲙",
 "𣃍": "𬲣",
 "盗": "𬳰",
 "𢧜": "𬴋",
 "曻": "𬴛",
 "独": "𬴭",
 "𡭗": "𬵊",
 "辺": "𬵑",
 "侘": "𬵕",
 "竺": "𬵚",
 "帷": "𬵧",
 "滋": "𬵱",
 "𬚢": "𬵺",
 "簳": "𬵾",
 "𣣴": "𬶷",
 "䲨": "𬷉",
 "姄": "𬷳",
 "狱": "𬸚",
 "𧉘": "𬹚",
 "𩁹": "𬹫",
 "𦺈": "𬹹"
}
},{}],"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose1.js":[function(require,module,exports){
module.exports={
 "人": "丛丛众众侅俎俎僉僉刻劾匃卒卒咳坐坐坠奒姟孩峐巤庻庻怂怂昃晐枞枞核欬氦泅烗熌畡疭疭痎硋絯纵纵耸耸胲苁苁苬荄該该豥賅賌赅輆郂閡閦閷阂陔頦颏餩駭骇骸鮂㐺㒺㚊㤀㤥㧡㨛㫅㫆㱾㳁㴸䀭䁡䠹䠾䤤䬵𠃀𠃀𠃀𠃀𠅃𠅃𠅓𠅓𠈌𠈌𠈌𠈌𠉁𠉦𠌶𠌶𠌶𠌶𠑏𠑏𠓵𠓵𠓵𠓵𠕈𠕎𠕎𠚄𠚄𠛳𠜨𠝴𠝴𠟮𠟮𠤽𠤽𠦍𠦍𠧚𠧪𠧪𠧵𠩛𠩛𠩣𠭕𠭕𠼄𠼄𠼜𠼜𡈍𡈍𡈍𡈍𡈶𡈶𡈶𡈶𡌓𡎫𡎫𡐟𡐟𡐟𡐟𡒀𡚶𡜰𡜰𡢔𡢺𡧬𡫙𡫙𡫜𡫜𡫮𡫮𡫾𡫾𡭹𡱍𡲼𡳑𡳑𡳑𡳑𡴤𡴤𡴤𡴤𡴬𡴬𡴬𡴬𡴬𡴬𡴬𡴬𡵝𡵝𡸋𡸋𡹽𡹽𡹽𡹽𡺛𡺛𡺛𡺛𡼙𡼙𡼙𡼙𡾑𡾑𡾑𡾑𡿬𡿸𢀩𢀩𢀩𢀩𢂯𢂯𢅶𢋦𢋦𢓅𢓅𢗅𢘄𢦜𢦜𢦺𢦺𢨈𢨈𢨈𢨈𢬕𢬕𢰔𢰔𢴹𢴹𢴹𢴹𢷼𢷼𢷼𢷼𢻉𢻲𢼵𣃘𣃴𣃷𣅦𣋓𣋓𣋓𣋓𣌣𣍢𣎐𣎐𣐮𣗊𣗊𣞚𣞚𣞚𣞚𣣨𣣨𣦊𣦊𣦊𣦊𣧝𣬱𣬱𣭃𣴃𣴭𤁺𤁺𤁺𤁺𤋋𤋋𤌹𤍡𤍡𤍡𤍡𤏀𤏀𤏀𤏀𤒫𤒫𤒫𤒫𤠛𤣈𤣈𤪩𤪩𤪩𤪩𤰵𤳶𤳶𤳶𤳶𤻠𤻠𤻸𤻸𤻸𤻸𥀉𥀉𥁕𥈚𥉚𥉚𥉚𥉚𥋍𥋍𥋍𥋍𥎇𥏂𥏂𥒴𥖌𥖌𥖌𥖌𥞙𥞨𥠸𥡕𥢤𥢤𥢤𥢤𥩲𥭷𥱣𥱣𥴓𥴓𥴓𥴓𥿪𦁒𦃃𦃃𦃃𦃃𦄚𦄚𦅽𦅽𦅽𦅽𦆗𦆗𦆗𦆗𦆰𦆰𦇈𦇈𦇈𦇈𦇻𦇻𦇻𦇻𦈀𦈀𦈀𦈀𦈁𦈁𦈁𦈁𦈲𦉈𦉈𦉈𦉈𦉖𦉖𦉖𦉖𦋟𦏶𦐤𦕦𦕦𦖏𦖏𦖏𦖏𦖴𦖴𦙐𦢕𦢕𦢕𦢕𦢻𦢻𦤈𦤈𦬆𦯌𦱟𦷷𦺅𦺅𦾐𧊏𧍑𧗄𧠬𧧴𧨭𧪗𧪗𧬑𧬑𧬑𧬑𧬡𧬡𧬡𧬡𧭁𧭁𧭨𧭨𧭨𧭨𧭯𧭯𧭯𧭯𧷊𧷊𧺣𧺣𧼶𧼶𧿛𧿛𨀖𨇏𨇏𨇏𨇏𨎯𨎯𨎯𨎯𨏜𨏜𨏜𨏜𨑟𨒊𨒨𨙦𨙦𨙦𨙦𨝥𨞄𨞄𨞄𨞄𨠳𨣩𨣩𨣩𨣩𨥎𨥎𨥱𨦵𨪼𨪼𨪼𨪼𨭇𨭇𨭇𨭇𨲻𨲻𨲻𨲻𨻌𨻌𨻌𨻌𨻾𨻾𨻾𨻾𨼦𨼦𨼦𨼦𨽷𩁅𩁅𩁅𩁅𩐰𩠚𩢯𩣈𩥒𩥗𩥗𩥗𩥗𩥨𩥨𩥨𩥨𩦁𩦁𩦁𩦁𩦛𩦛𩦛𩦛𩦻𩪳𩪳𩪳𩪳𩯸𩯸𩯸𩯸𩰶𩺠𩻢𩻢𩻢𩻢𩼿𩼿𩼿𩼿𩾸𪂐𪂐𪅈𪅈𪅈𪅈𪈓𪈣𪈣𪊁𪊁𪊁𪊁𪒣𪓙𪙒𪙒𪟔𪟔𪠠𪢓𪥌𪥏𪥐𪨊𪨊𪩫𪬖𪭠𪭢𪭢𪭮𪰞𪰞𪰞𪰞𪵻𪶓𪸜𪻐𪻐𪻞𪼽𪼽𪼽𪼽𫂌𫇉𫈦𫋫𫎆𫎆𫏦𫓩𫓩𫕚𫕚𫞄𫞄𫟺𫡑𫡑𫧏𫧏𫨎𫩛𫩛𫮇𫮇𫯠𫯪𫰱𫰱𫷃𫷃𫻰𫻰𬀁𬆹𬌾𬎧𬎧𬐗𬑋𬔩𬘇𬜓𬜻𬜻𬞿𬟺𬟺𬨇𬫶𬮥𬲪𬲪𬷿𬷿𬸿𬸿",
 "几": "伇伉伔剁劥匟吭吺哚喨囥壳妔巩帆廄廏役忛忼悫投抗拠挆杋杭杸梵棾櫈殁殴殶殸殹殺殻殽殾殿毀毁毂毃毄毆毇汎沆沉没洬湸溦炈炕煷犺珟疫痜癹矾砊砓祋秔竐竼笐粇股肮舤舧航般芃芟苀處蚢訉設设豛貥趓跺躲軓軗迒邟酘釩鈠鈧鋵钒钪閌闶阬頏颃骪骯骰髚魧鴧㑉㓘㔳㕨㕴㚮㛊㞩㠶㡪㨌㰠㱼㱽㱾㱿㲀㲁㲂㲃㲄㲅㲊㺬㼚㽘䆇䋁䌓䏎䒮䒳䖠䘕䛢䝂䝘䟘䟝䡉䢆䤟䤪䩔䬦䭵䭺䯴䲳䴚䴟䶳𠆩𠍃𠔮𠕵𠖍𠖒𠘲𠘲𠘻𠘻𠙜𠙦𠙩𠙭𠙮𠙰𠙱𠚹𠝪𠥝𠥷𠦐𠦐𠨻𠪘𠫠𠫠𠫨𠶳𠹢𠿕𡃫𡇀𡇙𡇩𡒼𡔟𡔧𡚾𡠧𡢔𡢣𡣍𡧔𡮎𡯦𡵷𡵷𡵹𡵹𡵻𡿚𢀈𢑿𢔫𢔾𢖾𢗎𢗑𢜄𢝋𢞸𢟥𢢢𢦕𢪨𢭾𢼀𢼐𣃚𣄯𣋰𣎆𣏆𣑫𣔗𣕡𣖫𣚯𣝝𣝝𣡅𣧷𣪂𣪃𣪄𣪅𣪆𣪇𣪈𣪉𣪋𣪌𣪍𣪎𣪏𣪐𣪑𣪒𣪔𣪕𣪖𣪗𣪘𣪙𣪛𣪜𣪝𣪞𣪡𣪢𣪣𣪦𣪧𣪨𣪩𣪪𣪫𣪬𣪭𣪮𣪯𣪰𣪱𣪲𣪴𣪵𣪶𣪷𣪸𣪻𣪼𣪽𣪾𣪿𣫀𣫁𣫃𣫄𣫅𣫆𣫇𣫈𣫋𣫍𣫏𣫐𣫑𣫖𣫗𣫚𣫛𣫟𣫠𣫡𣫢𣫩𣳼𣴂𣹬𣺲𣾚𣾮𣿆𤄞𤆤𤈺𤊳𤐘𤒀𤖫𤖬𤚲𤚼𤛖𤜦𤝈𤡘𤤄𤤌𤤸𤥔𤧧𤩑𤩮𤩯𤬨𤬾𤰑𤱧𤳚𤼺𤾒𥃵𥃶𥄦𥍟𥐥𥐱𥐲𥒳𥖗𥙨𥝻𥞛𥟌𥨃𥫺𥬲𥬾𥭂𥰺𥱍𥱞𥲏𥳨𥵠𥷶𥸂𥸃𥸇𥸏𥸫𥸱𥺵𥽦𥽿𥿒𦀉𦅛𦇍𦊵𦋲𦍶𦐄𦒇𦒫𦕍𦕰𦚩𦢗𦢱𦣔𦤂𦦹𦲗𦴎𦷊𦻻𦽏𦽛𦾫𧄘𧄿𧆉𧇠𧈌𧈻𧊃𧊶𧎅𧏌𧏚𧕺𧘣𧞒𧞹𧞺𧤧𧥬𧦑𧧨𧫫𧯸𧰵𧲪𧷙𧷥𧺢𨀫𨈔𨈢𨊶𨏩𨐅𨑙𨕮𨕵𨕶𨖏𨗋𨙀𨙮𨝻𨟱𨟼𨠁𨢋𨥵𨩂𨩷𨬫𨭞𨯳𨰢𨱁𨱚𨱤𨶞𨸜𨹄𨾒𩀠𩈌𩊜𩌊𩌥𩍊𩎂𩎫𩏻𩑜𩖛𩣤𩪔𩫼𩬻𩲋𩳇𩵤𩵨𩶞𩸡𩼊𩾨𪃟𪅔𪆑𪇂𪇃𪉍𪉘𪉛𪌓𪌡𪎒𪎵𪎸𪏍𪏙𪐦𪐨𪐮𪑣𪕁𪕂𪕇𪕎𪕸𪕿𪗜𪗴𪘉𪚆𪛀𪛒𪜎𪜠𪞖𪞱𪢵𪥹𪧩𪱧𪳃𪳄𪳴𪵈𪵉𪵋𪵌𪵍𪵎𪵏𪵐𪵒𪵓𪵬𪸎𪹉𪻑𫆥𫎣𫏭𫐁𫗑𫘈𫘻𫚲𫜥売㺬築𩬰𫢃𫢄𫥠𫥣𫩓𫮌𫰉𫱍𫲓𫶿𫷵𫼕𫽑𬂢𬆞𬆟𬆠𬆡𬆢𬆣𬆤𬆥𬆦𬆧𬆨𬆩𬆪𬆬𬆭𬆮𬆯𬆰𬆱𬆲𬆳𬆴𬉑𬉩𬉫𬊠𬊷𬋤𬐛𬒋𬓼𬖊𬖫𬗄𬗿𬜕𬟵𬡖𬬘𬬜𬭆𬯹𬲵𬷥𬹐𬹽",
 "一": "乞乾亘亶伤伫伾佂但佰侊侢俓俪倶偎偭儔兘兡兤关兽冃冃凮刏刑刓刯剄劃勁勔勧午卮卺叡司同后吞吴呸呾咞咟咢咣咸咺喂喕喛嗤噽嚋园囸圙坖塩壑壡复夸奣奤妍妧妲姃姮姯威娙娯婳媔媛媸嫿嬦完宣宼寎寕尓尡岍岏岯峘嵈嵔嶹巰巵巹帞師幬并弳弼形彨征徑徰徰忥忨忾怌怔怛怲恍恒愄愋愐懤扝抏抦抷担拯挄挳揋援擣政整斻施斾斿旂旃旄旅旆旇旊旋旌旍旎族旐旒旓旖旗旚旛旜旝旞旟旹昊昜昞昰昺昼晃晄晅暖暨曁朊杇杬枅柄查柦柸柾栢栴桄桓桱椳楥権檮歓歪歳殇殌每气氕氖気氙氚氛氜氝氞氞氟氠氡氢氣氤氥氦氧氨氩氪氫氫氬氭氮氯氰氱氲氳汚污汧汽沅沗沞泟泹洅洆洦洸洹涇渨湎湲溕溦溼滍潅澅濤濬瀒炟炡炳烎烕烜烝烴煖煨燽燾狉狚狟猙猥猨玩珖珬瑗璹璿瓸畐疇疍疞疸病症痙癸皕皕皝盶眐眪睘睜研硄硜碨祆禐禱秠窉窛竀竡竵笄笎笪籌粨糆絔絖絙經緩緬繣纻缅缓罡翫翿耀肟胆胚胱脛腲腼芌芞芫苎苤苪茪茾荁莖萲葨蒙蕚薵蚈蚕蚖蚽蛃蛨蛵蝅蝅蝒蝯蠠蠺蠺行衏衞袒袹褑観觛觥訮証詚誙諼譸讏证谖豜豾貆貊貦贮趼踁躊軇輄輕輝辉迃迊迗远逕逦邢邧邳邴郦酛酾醻量釫鈃鈨鈵鉟鉦鉭銆銧鋞錽鍡鍰鑄钘钲钽锎锾開阮阷陃陋陌陘隈隯雃雗雩霥靔靕靗靤靥靦靧靨靼鞆韑韴頑頙頸顽飭餵饬駓駫骊髨髬魗魭魳魾鰀鰃鲡鳂鳽鳾鴊鴌鴠鵆鵛鶢鶾鹂麵麺黋黿鼂鼋鼌龑㐌㐹㐾㑂㑅㒬㒮㒯㓂㓦㓫㔕㔷㕃㕄㖅㗲㗺㘢㘯㙗㚅㚰㛤㛱㝴㝵㞇㟪㠋㡮㡺㢪㢶㣪㣲㤁㦎㦞㧇㧉㩇㪂㪅㪫㪴㪶㫅㫊㫋㫌㫌㫍㫏㫜㫤㬊㮌㰟㰢㱏㱬㱿㲴㲵㲶㲷㵄㶮㷥㹗㹮㹰㹵㺈㺮㺰㺽㼛㼣㾯㿒㿠㿧㿼䀌䀌䀖䀘䀴䁔䁞䄯䆙䆪䇤䇥䇰䈠䊭䊸䋊䋎䋑䋔䋿䌧䍾䏓䏗䐘䐸䒥䒱䔢䔤䕄䖧䗞䘉䘙䙹䚙䚶䛃䜜䜥䞓䞙䞡䟚䡇䡕䢎䢕䢥䣆䤄䥀䥂䦎䦔䧝䨌䨔䨿䩂䩃䩄䩅䩆䩇䩈䩉䩊䩋䩌䩎䩏䩘䩶䪞䪫䪹䬄䬞䬧䭼䮻䯈䯑䱇䱎䲖䲮䲶䲹䴿䵡䵣䵤𠀷𠀻𠁏𠁐𠁗𠁗𠂧𠃂𠃃𠃇𠃇𠃘𠃴𠄆𠄡𠄡𠄢𠄢𠄥𠄥𠄭𠄭𠄮𠄮𠄯𠄵𠄵𠄷𠄷𠄸𠄸𠄹𠄹𠅈𠅮𠅹𠆬𠆻𠇆𠇋𠇪𠇮𠈁𠈑𠈗𠈡𠈩𠉀𠊃𠊦𠊨𠋃𠋠𠋷𠌶𠍚𠍛𠍧𠍴𠍴𠏏𠏻𠑳𠒉𠒑𠒓𠒖𠒗𠒝𠒝𠒞𠒡𠒢𠒥𠒦𠒪𠒫𠒬𠒴𠒵𠒸𠒺𠒻𠒼𠒽𠒿𠓁𠓃𠓅𠓇𠓉𠓉𠓉𠓊𠓋𠓌𠓐𠓑𠓒𠓓𠓕𠓖𠔬𠕊𠕍𠕏𠕓𠕓𠕔𠕱𠕹𠕻𠖑𠖔𠖚𠖧𠖪𠗊𠘺𠙁𠙗𠙩𠚇𠚗𠚻𠛣𠛥𠜉𠜔𠝙𠟲𠟼𠠊𠠐𠠺𠡎𠡚𠡱𠡳𠢇𠢦𠢫𠢻𠣑𠣙𠣡𠣩𠤉𠤡𠤨𠤪𠥳𠧯𠨆𠨗𠩄𠫛𠫟𠫧𠬀𠭅𠭕𠭩𠮱𠯏𠯗𠰂𠰚𠰞𠰪𠰳𠱌𠱺𠱻𠲮𠳒𠴠𠴴𠵗𠵰𠵰𠵾𠷚𠷡𠷢𠷰𠷼𠹬𠺍𠼟𠼫𠾝𠿲𠿻𡀧𡂲𡅝𡇁𡇗𡇚𡇬𡈧𡉉𡉛𡉝𡉨𡋦𡌖𡍞𡐈𡐥𡐪𡑼𡕐𡕑𡖽𡗘𡗣𡘆𡘍𡘸𡙎𡙎𡙎𡙝𡚈𡚌𡚌𡚌𡚌𡚑𡚯𡛌𡛦𡛵𡝥𡝴𡞎𡞤𡟂𡟐𡟡𡠈𡠈𡠾𡡠𡣉𡣘𡥰𡦇𡦋𡧈𡧡𡨕𡨥𡨵𡩉𡩛𡩞𡩭𡩱𡩵𡪏𡫃𡫍𡫝𡭃𡯞𡱆𡱌𡱘𡲻𡳒𡴊𡵧𡶠𡶹𡶺𡶽𡶾𡷀𡷆𡷨𡷪𡸽𡹱𡹻𡺪𡻵𡼑𡼙𡼺𡽼𡾀𡾑𡾡𡾡𡿩𢀩𢀿𢁓𢁢𢁹𢁿𢂡𢃋𢃮𢄐𢄔𢄶𢄾𢄾𢅃𢅢𢆚𢇡𢇨𢇩𢈖𢉝𢉶𢋏𢌂𢌒𢌒𢌛𢌫𢍫𢏁𢏞𢏲𢏺𢐈𢐝𢒇𢒣𢓄𢓆𢓍𢓎𢓖𢓞𢓥𢓸𢗃𢗏𢗶𢘆𢘇𢘢𢘫𢙯𢙼𢚮𢛯𢝒𢝝𢝦𢟭𢠑𢠟𢡊𢡊𢡰𢣧𢤶𢦹𢨿𢩊𢫦𢫻𢬎𢭍𢮭𢮾𢯉𢯟𢯥𢯬𢰈𢰺𢱟𢱯𢳛𢶍𢷡𢷡𢷼𢸹𢹙𢺖𢻨𢻽𢼯𢼴𢾫𢾵𢿄𢿋𢿫𢿶𣀓𣀘𣁇𣁯𣂕𣂖𣂭𣂾𣃂𣃦𣃧𣃨𣃩𣃬𣃭𣃮𣃯𣃰𣃳𣃴𣃵𣃹𣃻𣃼𣃽𣃿𣄀𣄆𣄉𣄊𣄐𣄑𣄕𣄖𣄘𣄙𣄞𣄠𣄡𣄢𣄦𣄧𣄨𣄩𣄪𣄫𣄾𣄾𣅘𣅙𣅠𣅣𣅣𣆋𣆏𣆞𣆞𣆟𣆤𣆥𣆽𣇁𣈺𣉃𣉍𣊏𣋓𣋡𣋬𣋮𣌐𣌚𣌛𣌹𣍎𣍒𣍪𣎍𣏊𣏏𣏙𣏳𣏵𣑕𣑙𣑲𣒰𣒻𣓁𣓁𣓪𣓺𣔔𣔫𣔸𣖀𣖫𣗍𣘅𣘺𣙁𣛛𣜂𣝷𣞀𣞚𣞬𣠯𣡅𣢴𣢴𣢸𣣷𣤫𣥎𣥔𣥛𣥵𣦍𣦓𣦛𣦤𣦥𣦵𣦻𣧁𣧰𣧵𣨦𣪅𣪔𣪛𣪨𣪪𣫆𣫐𣫒𣬾𣮗𣮻𣮿𣰎𣰓𣰔𣰱𣱕𣱖𣱗𣱘𣱙𣱚𣱛𣱜𣱝𣱞𣱟𣱠𣱡𣱢𣱣𣱤𣱥𣱦𣱧𣱨𣱩𣱪𣱫𣱭𣱮𣱰𣲑𣳎𣳽𣴑𣵘𣶄𣶩𣶹𣸯𣸸𣺁𣺭𣼿𣽀𣽺𣾊𣾒𣾬𤀅𤀋𤁚𤁰𤁺𤂀𤂥𤃨𤃳𤆱𤇁𤇨𤇳𤇶𤈛𤉫𤋡𤌓𤍸𤎁𤑠𤑣𤑣𤑣𤒵𤓻𤔒𤖄𤖛𤖶𤘀𤘠𤘹𤙚𤙫𤙬𤚍𤚛𤜳𤝌𤞆𤞕𤟓𤟯𤢫𤣧𤣿𤤇𤤝𤤾𤤿𤥆𤦚𤦷𤧏𤧖𤩮𤩯𤪩𤫀𤫒𤭓𤯅𤯳𤯽𤰗𤰳𤱏𤱳𤲫𤲼𤳶𤴆𤴖𤴸𤵎𤵛𤵿𤶏𤷒𤷷𤹫𤻸𤼄𤽍𤽢𤾋𤾓𤾗𤾩𥀑𥁄𥂁𥃖𥃡𥃳𥄾𥅃𥅊𥅎𥅙𥅛𥅜𥅨𥆄𥆆𥈅𥉍𥉕𥊇𥊮𥋩𥋰𥌆𥌑𥍄𥍕𥎜𥏄𥏤𥏦𥏴𥏼𥏾𥐃𥐡𥐬𥑅𥑜𥑲𥒛𥒡𥓱𥔛𥖊𥖲𥘕𥘵𥘺𥘻𥙑𥙚𥙡𥙰𥚓𥚜𥚸𥛏𥛠𥜞𥝜𥝬𥞟𥟙𥟝𥟟𥟸𥠛𥡺𥤶𥤸𥥣𥥻𥦰𥦲𥧃𥧍𥧘𥩠𥩷𥫇𥫡𥫧𥫧𥫧𥫮𥫮𥫮𥫶𥬚𥯜𥰉𥰐𥰑𥱗𥲔𥲬𥲼𥷛𥸰𥸽𥹂𥹘𥹚𥺒𥺭𥽯𥾟𥾦𥾨𥿐𥿜𦁔𦁛𦂚𦂨𦄱𦅻𦆏𦆧𦆷𦇈𦇻𦈓𦈣𦈥𦈨𦈵𦉿𦊊𦊥𦊫𦋭𦍘𦏟𦏻𦐴𦑛𦓚𦓠𦓩𦔿𦕗𦕞𦕤𦖓𦖔𦖵𦗰𦘣𦘧𦘼𦙋𦙖𦙫𦙳𦚦𦚸𦛆𦛍𦜈𦜕𦜮𦝽𦞲𦞶𦟆𦟧𦠿𦡴𦣔𦣪𦣬𦣷𦤳𦤾𦥰𦦍𦦫𦦰𦦾𦧢𦨃𦨘𦨞𦨪𦨻𦩂𦩮𦩻𦪃𦪮𦫐𦫥𦫦𦫩𦫺𦬞𦬟𦬹𦬿𦭒𦭩𦭯𦮠𦯟𦯧𦲂𦲰𦳭𦴐𦴫𦴵𦵀𦸅𦸟𦹭𦺀𦺁𦺯𦻅𦼩𦽞𦽺𦾀𧁅𧁠𧅳𧅳𧇲𧇳𧇵𧇵𧇺𧈃𧈙𧈯𧉁𧉂𧉗𧊳𧊴𧋁𧋝𧋞𧌵𧍥𧏁𧓡𧔸𧕜𧕜𧗆𧗚𧗚𧗦𧗪𧗯𧘁𧘎𧘚𧘿𧙒𧙱𧚦𧚲𧛚𧛥𧛳𧜎𧞁𧞑𧠃𧡩𧡭𧢮𧢮𧤇𧥗𧥗𧥛𧥛𧥜𧥜𧥦𧥷𧦿𧧂𧧊𧧐𧧤𧧯𧨋𧨯𧩊𧩙𧩠𧩤𧪏𧬩𧭙𧯕𧯬𧱂𧱨𧲦𧲨𧳭𧵀𧵉𧵦𧵯𧶬𧶷𧷁𧸶𧹍𧹡𧺗𧺞𧻗𧻙𧻚𧻝𧼸𧽳𧾅𧾝𧿙𧿦𨀏𨀧𨀫𨁐𨁻𨂟𨃄𨇬𨈤𨈨𨈱𨈲𨉁𨉓𨉥𨊫𨊻𨋣𨋬𨍘𨎅𨏁𨏄𨏆𨏎𨐆𨐈𨐶𨑛𨑶𨒌𨒹𨒺𨓋𨓫𨔄𨔜𨔼𨕀𨕂𨕆𨕈𨕒𨕕𨕧𨖀𨗵𨗼𨘊𨘋𨙱𨚆𨚣𨚤𨚱𨛀𨛧𨜆𨜝𨜦𨜧𨞪𨟢𨟫𨟫𨠙𨠚𨠣𨠱𨠵𨠸𨡖𨡶𨢊𨢒𨢰𨣎𨥊𨥚𨦖𨦨𨧈𨧝𨨊𨪣𨪱𨪱𨫙𨫝𨬱𨭟𨭫𨭶𨮠𨮣𨮮𨲐𨲦𨳌𨳌𨳨𨳪𨳵𨴂𨴈𨶘𨶬𨷆𨷝𨸛𨸦𨸹𨸿𨹂𨹟𨺛𨺾𨻙𨽇𨾖𨾫𨿋𩂉𩃫𩃾𩄕𩆉𩆬𩇖𩇱𩇲𩇽𩇽𩈃𩈅𩈆𩈇𩈉𩈊𩈋𩈌𩈍𩈍𩈎𩈏𩈐𩈑𩈒𩈓𩈓𩈔𩈕𩈗𩈘𩈙𩈚𩈛𩈜𩈝𩈞𩈟𩈠𩈡𩈡𩈢𩈣𩈤𩈦𩈧𩈨𩈩𩈪𩈫𩈬𩈭𩈮𩈯𩈰𩈱𩈲𩈲𩈳𩈳𩈴𩈶𩈷𩈸𩈹𩈺𩈻𩈼𩈽𩈾𩈿𩉀𩉁𩉂𩉃𩉄𩉅𩉆𩉆𩉇𩉈𩉉𩉊𩉋𩉌𩉍𩉎𩉏𩉐𩉒𩉓𩉔𩉕𩉖𩉖𩉖𩉗𩉘𩉙𩉞𩉯𩉰𩉳𩊘𩊠𩊨𩋠𩋫𩋸𩋹𩌻𩍻𩎜𩎨𩏅𩏑𩏛𩐘𩐣𩑡𩑰𩒚𩒢𩓍𩓭𩔁𩔃𩔌𩔽𩕇𩕯𩖋𩘃𩙓𩙴𩚃𩚤𩚸𩚼𩛄𩛬𩛹𩝂𩡸𩡹𩢄𩢷𩣓𩣪𩤤𩤳𩥃𩩹𩫡𩫧𩫿𩬝𩬧𩭂𩭙𩮡𩯦𩰵𩰹𩱪𩳁𩳍𩵧𩵶𩵸𩶁𩶝𩶷𩶸𩷏𩷮𩷸𩹐𩹠𩺂𩺂𩺉𩺏𩻽𩼻𩽙𩽟𩾻𩿐𩿳𪀇𪀯𪂍𪂍𪅢𪇘𪈪𪉇𪉡𪉭𪉹𪊂𪊂𪊑𪊔𪊥𪊵𪋘𪋘𪋳𪌇𪎎𪎙𪎹𪎻𪏅𪐬𪒇𪒈𪓣𪓱𪓳𪔾𪕀𪕓𪕗𪕣𪗛𪗞𪗟𪘠𪘫𪙢𪜙𪝂𪞀𪞃𪞆𪞒𪞶𪟩𪡣𪡬𪡲𪢩𪣃𪤵𪤶𪥇𪥉𪥓𪥙𪥙𪦍𪦛𪧍𪨦𪪃𪪎𪪤𪪯𪪻𪫑𪫮𪬓𪬣𪭔𪭤𪭻𪭻𪮝𪯳𪯶𪯶𪯸𪯽𪰄𪰅𪰈𪰬𪲔𪲩𪳘𪳢𪴡𪴶𪴹𪴺𪵣𪵤𪵥𪵦𪵧𪶍𪸑𪸕𪹄𪺖𪺮𪻖𪻘𪻭𪼍𪼘𪽊𪽗𪽲𪾣𪿑𪿓𫀀𫀌𫁁𫁌𫃱𫄞𫄠𫄥𫅀𫅈𫅏𫅑𫅣𫇠𫇶𫊕𫊨𫊶𫋊𫋤𫋭𫋮𫋯𫋰𫋱𫌍𫌶𫎓𫎣𫏈𫏔𫏖𫏭𫏲𫏺𫐁𫐣𫑉𫒑𫓊𫓰𫓸𫔭𫕉𫕗𫖀𫖁𫖂𫖃𫖄𫖪𫗖𫗘𫗟𫗭𫘏𫘡𫚎𫛚𫜥𫝍𫝿𫞑𫟘𫟙𫟙丽丽備㔕咞咢噑噑噑噑㤜懞扝𣚣𣫺𥁄𥃳衠𩒖𫠥𫠫𫠱𫠱𫡏𫡰𫡷𫢋𫢏𫣜𫣰𫤙𫤚𫤞𫤡𫤤𫤥𫤦𫤨𫥞𫥤𫦠𫧑𫧽𫨅𫩈𫩑𫩰𫪃𫪓𫪨𫫽𫭛𫮊𫯝𫯨𫯩𫯬𫯸𫰝𫰶𫳬𫴁𫴏𫵙𫵰𫷄𫷻𫹵𫹽𫼟𫽇𫽥𫽪𫽶𫾦𫾲𫿋𫿮𫿺𬀀𬀂𬀂𬀃𬀄𬀅𬀆𬀇𬀈𬀋𬀌𬀍𬀏𬀐𬀒𬀓𬀔𬀕𬀖𬀘𬀙𬀚𬀜𬀝𬀞𬀟𬀠𬀡𬀢𬀣𬀤𬀷𬀼𬁆𬃱𬃴𬄒𬅨𬅹𬅺𬆀𬆃𬆄𬆅𬆈𬆡𬇀𬇏𬇐𬇑𬇒𬇓𬇞𬇪𬇵𬈇𬈈𬈖𬉫𬋫𬋮𬌑𬌳𬍈𬍐𬍭𬍵𬏶𬐍𬐚𬐱𬑌𬑾𬒭𬓈𬔟𬕄𬕭𬖊𬖭𬖲𬗃𬗐𬗟𬘜𬘢𬙒𬙯𬙵𬚒𬚔𬚵𬚷𬛂𬝢𬝦𬝷𬝸𬞂𬞪𬞲𬟃𬟡𬟿𬠽𬠾𬠿𬡀𬡁𬢺𬣀𬣞𬥢𬦰𬧒𬨤𬨧𬨶𬩌𬫼𬬘𬬢𬬨𬮜𬯬𬰠𬰡𬰢𬰣𬰪𬰯𬱐𬱽𬲌𬲧𬲰𬳵𬴠𬴦𬴧𬵲𬹃",
 "白": "佰偕偟兡冟凮凰勓卽厡咟唕唣啪啲喈喤嗥噑婂媓媘崲嶍帞幚幫廏弼徨惶慴揘揩摺旣暤暭栢梍梎棉楷楻楾槔槢槹橷檪洦淿湐湝湟湶滜漝澔瀪灥灥灥煌煯熠獆獔瑎瑔瑝瓸皕皕皝皞皡皨皨皨皩碧磖稭竡箔篁粨絔綿線緜绵缐翫翱翶腺艊艎菂萡葟葩葲蒈薬藠藠藠蘤蛨蝔蝗袹褶諧諻謵谐貊遑鄕銆錦鍇鍠锦锴锽闎陌隍階霫韹飁餭騜騡騽鰁鰉鰼鳇鳈鳛鶛鷎龤㓦㗩㟫㟸㠄㡍㢶㣐㦻㪶㵿㵿㵿㶗㹮㼣㾬㾮㿁㿇䀌䀌䃇䃈䃯䄓䅣䊗䌌䐲䑟䒁䔌䔤䛲䜰䝥䞹䡡䣗䤼䫧䬖䳨𠁗𠁗𠃇𠃇𠄆𠍚𠍛𠗯𠙩𠤙𠥁𠥋𠩡𠪰𠷡𡇚𡇠𡈁𡋦𡎏𡙙𡟷𡨇𡨗𡩛𡯬𡶾𡺓𡺙𢃺𢄇𢄗𢄛𢄭𢅁𢅞𢌂𢍑𢐈𢐝𢒣𢔡𢙯𢝓𢝷𢫦𢯊𢶱𢸌𢸹𢹻𢾆𢿬𣁨𣈷𣍑𣓬𣖐𣠘𣤊𣨔𣪕𣪘𣯥𣯮𣰱𣴡𣴢𣵁𣶎𣸕𣹁𣹛𣹻𣻮𣽀𤀁𤆁𤆁𤆁𤆁𤎁𤎥𤗨𤚝𤛊𤟀𤟡𤢫𤤿𤦝𤧥𤬥𤭧𤭯𤷭𤺃𤾋𤾓𤾩𤾪𤾪𤾪𤾭𤾲𤾳𤾺𤾾𥌣𥍾𥏄𥏪𥚺𥟠𥠘𥠟𥡅𥣤𥦒𥰗𥱵𥶱𥻄𥻷𦀪𦂄𦂨𦑠𦒆𦒣𦖡𦗗𦗽𦝂𦝨𦞉𦧠𦧱𦪥𦯉𦯑𦰬𦸚𦹢𦼍𦼑𦿛𧂉𧂥𧂥𧇚𧍭𧎧𧐔𧑲𧓮𧚻𧩠𧪒𧳧𧹡𧻙𧼷𨉤𨍧𨎀𨒹𨘐𨘐𨜔𨜡𨜩𨡹𨵁𩀊𩃫𩊘𩋧𩏳𩔇𩘅𩘗𩘘𩛬𩢷𩤠𩥥𩩺𩭲𩸊𪁤𪁼𪄶𪅔𪏑𪏓𪓨𪜙𪞋𪟇𪟙𪟫𪡈𪡠𪡬𪣝𪥷𪦞𪦼𪧐𪧓𪧖𪩅𪪱𪫮𪬒𪭔𪱦𪳠𪳦𪴞𪵿𪻼𪾂𪿧𫁇𫂇𫂉𫇋𫈇𫉢𫋯𫌍𫎝𫑯𫒫𫗮𫘩𫛘𫛘𫛘𫡰𫡷𫢾𫤟𫦻𫨅𫩃𫪼𫫝𫳨𫴿𫷍𫺏𫺠𫻅𫻋𫼻𫿃𫿧𬂗𬂗𬂗𬂺𬃍𬃴𬉖𬉨𬉯𬉱𬊻𬊻𬍾𬎺𬐋𬐍𬐑𬗬𬝌𬟑𬟡𬠒𬡹𬤍𬥝𬦰𬨯𬪎𬪷𬬟𬭣𬯏𬸛𬸢𬹒𬹒",
 "木": "俕保倯倸偞偨傑僺冧冧凇刴刹剁劋厢咻哚唽啉啉啋喋喍喖喳噪圞埜埜堏壄壄娴婇婪婪媃媒媟媣嫻嬠宲寀寱尮屟屧崊崊崧嵀嵖嵘嵥嵲嶘幧庥庺廂弑弒弽彩彬彬怵怸恘恷悃惁惏惏想惵懆懋懋挅挆捆採揉揲揸搩操晰晳晽晽暞桌梦梦梱梵梵梺梺棌森森棼棼棽棽棾棾椉椘椘椞楂楚楚楪楳楶楺榃榃榤槑槑樃樊樊樖樷樷橾檒檒檪欎欎歀殜殺氉沭浨涁涃涤淅淋淋淞淭渘渣渫渿湈湐湘溁溎溨滐滦潗潸潸潹澖澡灤灪灪炢烋烌烞焑焚焚煠煣煤燓燓燥燺爨爨爩爩牃牒猱猹琳琳瑈璖璪甈痫痳痳皙皶睏睬矂硱硹碄碄碟碴磔磲磼祵禁禁禖秫稇穕筞筿箖箖箱篐簯籕糅紮綑綝綝綵緗緤繰绦缃缲罧罧脎腜腬臊臲艓茠荰莕莯菒菘菜菥菻菻萙葇葈葉葙蒅蓕蕖薬藮藲蘂蘗蘽虊蚻蜙蜤蜥蝚蝶蟍蟝術裍褋襃襍襙訹諃諃諜謀謋譟谋谍貅趓趮跥跺踩蹀蹂蹅躁躱躲輮辳辳述郴郴鄵醂醂釉鉥銝錰鍒鍱鎳鏫鏶鐢鐢鐰铩镍閫閷闑阃隸雑霂霖霖霜鞢鞣韖韘餷騥驝髞髹鬆鬰鬰鮴鰇鰈鱢鲦鲽鵂鶔鷍鷴鸉鸺鹇麓麓齄齫㑣㑣㑱㓷㖻㖼㗎㗱㘄㙅㙞㙫㚞㚞㛆㛊㛦㛦㜀㜁㝝㝝㟚㟣㠍㠎㣄㣩㣩㥒㥡㧲㨆㨆㨲㩟㩰㪔㪔㬷㭝㭝㮏㮟㮠㯄㯄㯗㯟㯟㯣㯬㯬㰃㰆㰈㰈㰑㱤㲡㳐㳜㳭㳹㴤㴪㶇㷊㷊㷘㹯㺷㻡㻧㽥㾁㾋㾴㾹㿋䁋䂋䃯䆆䆿䈎䈢䈤䈷䈾䉓䉘䉩䊉䋴䌖䌽䏫䐆䐑䑜䑮䒳䓩䓱䔠䔦䔧䔵䕁䕆䖇䖇䗋䘤䘴䚢䛙䝣䟣䠂䠂䠕䢄䢄䢞䢞䢡䢤䣋䤂䤪䥜䦥䦥䨛䨷䨷䫅䫐䫐䫙䭎䮌䮜䮪䮶䰂䰆䵲𠁫𠄃𠄻𠄻𠇲𠉉𠉍𠊍𠋦𠍂𠍙𠍱𠍲𠎊𠏕𠐙𠐙𠒥𠓅𠓲𠓼𠔢𠕭𠗨𠘆𠜠𠝺𠝼𠟕𠡙𠢢𠢷𠢺𠥂𠦩𠧭𠩱𠩵𠩵𠪠𠪠𠪴𠪴𠫁𠳁𠳳𠳹𠳼𠴗𠴘𠵂𠵂𠵍𠶀𠶍𠶖𠶣𠷹𠹑𠹝𠹝𠹱𠹳𠺝𠺺𠻇𠻧𠻽𠼝𠾞𠾞𠾣𠾤𠾴𡀐𡀞𡂀𡃗𡃼𡃾𡅋𡇙𡈹𡈹𡈹𡈹𡊍𡍁𡍚𡍚𡍥𡎡𡏒𡏝𡑀𡑀𡑓𡑕𡑕𡒩𡒫𡓡𡘽𡘽𡙸𡙻𡙻𡚣𡚣𡜨𡜺𡞫𡠫𡡥𡡴𡡴𡢥𡢥𡤄𡥑𡨭𡩕𡩣𡪎𡪎𡪘𡬒𡮋𡮘𡯀𡯀𡯦𡰆𡰈𡲅𡳙𡳯𡶲𡸯𡹇𡹇𡹚𡹚𡹟𡺑𡺼𡼨𡼨𡼹𡽲𡾚𡿥𡿥𢃅𢃓𢃪𢃱𢆧𢆨𢈛𢉤𢉪𢉽𢊠𢊠𢊢𢊢𢊲𢋤𢋤𢋬𢋮𢋮𢋹𢋹𢌋𢌋𢌑𢎋𢒻𢒻𢔋𢔟𢘹𢚗𢚠𢚳𢛒𢛓𢛓𢜮𢜯𢜸𢞥𢞥𢞼𢟼𢟼𢡟𢡟𢡫𢡿𢤁𢫄𢫩𢫬𢭩𢭰𢰣𢱌𢱖𢴻𢴻𢵳𢵸𢸨𢹐𢺱𢺱𢺴𢺴𢻙𢻥𢻦𢻦𢿨𢿨𢿱𢿱𢿾𣀉𣀙𣀙𣀧𣀧𣇆𣇰𣇰𣇿𣈁𣈄𣈅𣈅𣈕𣉎𣋝𣍀𣏂𣐾𣑅𣑫𣑽𣑽𣑾𣒐𣒙𣒜𣒜𣒡𣒳𣒶𣓏𣓏𣓕𣓕𣓴𣓴𣔕𣔗𣔣𣕌𣕘𣕙𣕦𣕧𣕽𣕽𣕾𣕾𣖧𣗁𣗈𣗗𣗗𣗚𣗚𣗛𣗡𣗡𣗣𣗣𣗱𣗺𣗻𣘑𣘑𣘲𣙄𣙊𣙑𣙑𣙔𣙞𣚂𣚨𣚨𣚵𣚵𣚻𣛅𣛅𣛍𣛍𣛒𣛜𣛧𣛾𣛾𣜈𣜈𣜓𣜓𣜕𣜕𣜣𣜨𣜩𣜺𣜺𣝒𣝜𣝥𣝥𣝩𣝪𣝪𣝴𣝴𣝹𣝹𣞃𣞖𣞖𣞟𣞤𣞤𣞴𣟄𣟑𣟒𣟒𣟕𣟜𣟜𣟼𣟽𣠀𣠈𣠈𣠎𣠏𣠧𣠧𣠫𣠫𣠬𣠬𣠮𣠮𣠳𣠻𣡄𣡄𣡇𣡇𣡕𣡕𣡖𣡜𣡜𣡥𣡥𣡵𣡽𣡽𣡽𣡽𣡽𣡽𣡽𣡽𣧷𣨗𣨴𣩊𣩝𣫄𣫄𣫋𣫓𣫓𣫙𣮃𣮪𣯸𣰕𣰧𣱣𣳼𣵎𣶁𣶲𣶶𣻘𣽕𣽕𣽘𣽽𣽽𣾕𣾕𣿏𣿏𣿘𤀚𤀮𤀮𤀻𤂉𤂑𤂑𤂨𤃺𤃺𤅅𤅅𤈢𤉲𤊩𤊩𤋹𤍾𤍾𤏗𤏷𤏷𤑖𤑖𤒇𤓥𤓥𤓮𤓮𤔁𤕩𤕩𤚀𤜕𤝞𤞧𤟖𤠌𤡦𤡷𤢖𤤸𤥯𤥳𤧀𤧇𤨷𤬙𤬾𤭪𤯏𤱧𤳥𤳥𤵦𤶭𤷕𤷠𤷼𤸏𤹈𤹈𤺛𤺢𤺷𤻧𤾓𤾓𤾚𥀳𥁹𥁹𥂌𥂸𥆪𥆫𥇦𥈐𥈡𥉒𥉯𥊈𥊨𥊺𥍲𥍳𥎢𥎢𥒬𥓊𥓖𥓙𥓙𥓽𥖎𥖎𥖔𥖨𥖯𥖯𥖸𥗈𥗈𥗘𥘄𥘄𥙨𥚖𥞛𥠊𥠹𥢖𥤔𥦝𥦝𥧷𥩀𥬲𥮊𥮕𥮥𥯆𥯍𥯲𥯸𥰜𥱛𥱜𥲐𥲢𥲢𥲧𥳖𥳯𥴈𥴖𥴙𥴛𥴭𥵅𥵡𥶮𥷃𥷈𥷭𥷭𥺚𥺰𥻗𥼠𥼾𥽹𦀉𦀹𦀾𦁝𦁼𦂅𦄏𦄗𦄽𦇕𦇕𦈒𦈜𦉆𦉤𦉤𦊵𦋗𦋗𦋡𦔇𦕰𦗵𦚩𦛻𦝃𦝃𦝹𦠯𦡨𦡨𦣌𦣌𦤙𦤞𦤧𦥅𦥐𦨅𦨅𦩚𦩪𦬸𦮲𦯕𦯪𦰳𦰻𦲲𦳏𦳐𦳑𦳘𦳯𦴑𦴡𦵂𦵴𦶓𦶙𦶠𦷭𦹁𦹂𦺴𦻊𦼊𦼚𦼪𦼪𦼭𦼰𦼴𦽣𦽩𦽯𦾈𦾮𦿒𧀵𧁒𧂼𧂾𧂾𧃭𧃺𧃺𧄋𧅜𧅟𧅟𧇃𧇃𧇥𧇥𧇨𧇨𧉱𧉹𧊶𧋕𧌔𧌨𧌻𧎩𧒮𧓙𧔬𧕎𧖥𧖥𧗅𧛀𧛀𧛉𧛮𧜯𧝺𧝺𧞉𧞉𧡮𧢎𧢎𧢣𧢣𧧨𧩋𧩋𧯴𧯴𧰔𧰔𧱍𧲷𧳥𧳨𧴜𧹥𧹫𧹫𧺶𧼖𧼖𧽅𧾬𧾬𨁉𨁤𨁥𨂕𨂕𨃔𨃥𨃭𨃶𨅽𨅾𨌟𨎸𨐠𨓳𨔣𨕹𨘨𨛢𨜍𨜙𨝮𨝵𨝵𨞹𨞹𨠼𨤐𨤔𨤘𨤳𨤳𨤹𨥼𨦃𨧀𨧃𨧖𨨗𨨗𨨥𨨦𨨫𨩨𨪀𨬡𨲃𨴺𨶓𨶓𨹃𨹄𨹦𨺉𨻄𨼝𨽣𨽿𨿟𩀼𩀼𩁒𩁩𩃝𩃭𩃵𩅤𩅤𩆝𩆝𩆥𩆥𩆱𩆱𩈶𩊜𩋶𩍊𩎫𩐱𩒱𩓡𩓢𩓰𩔑𩕌𩗆𩗱𩘄𩙈𩙰𩛳𩛴𩜫𩝇𩝰𩞛𩟎𩟴𩟴𩠳𩠵𩠼𩢮𩤆𩤆𩦀𩦃𩦆𩧐𩫤𩬻𩭋𩭖𩭘𩭚𩭰𩮌𩮎𩯟𩱬𩱬𩱮𩲺𩳃𩶄𩶼𩸝𩸳𩹟𩹬𩹮𩹿𩺕𩻌𩿤𩿯𪀣𪀪𪁣𪁱𪁻𪁿𪂅𪂜𪂼𪃏𪃵𪃸𪄃𪄎𪅌𪆂𪆐𪆫𪈻𪉏𪉴𪊽𪋤𪋤𪍐𪍚𪍻𪍽𪎦𪎦𪑂𪑞𪑧𪑨𪑶𪑽𪓊𪓊𪓫𪘆𪘉𪘠𪘿𪙁𪜚𪜷𪝅𪝉𪝋𪝎𪢮𪣖𪤘𪤢𪧌𪧵𪧵𪩦𪩦𪪀𪭷𪮅𪮍𪲖𪲝𪲡𪲡𪲣𪲳𪲴𪲵𪲵𪲷𪲽𪳋𪳌𪳝𪳟𪳟𪳦𪳯𪳯𪳴𪳻𪳻𪳻𪳽𪳽𪴈𪴈𪴋𪴏𪴞𪴣𪵝𪵝𪵾𪶛𪶯𪸨𪹯𪹻𪺂𪺂𪻜𪻩𪻼𪼛𪾭𪾭𪿌𪿥𫂊𫂋𫂘𫂚𫂿𫃢𫄬𫄼𫆇𫆱𫇓𫇓𫈥𫈷𫈺𫉎𫊷𫋀𫋝𫋿𫌣𫍅𫎉𫎩𫐀𫐓𫐚𫑃𫓞𫓞𫔄𫔶𫕱𫖷𫗷𫘂𫘢𫙤𫙮𫚫𫛠𫝛𫞡摷𣻑爨爨璅秫𥲀罺鄛𫡪𫢾𫤒𫥏𫥛𫦯𫦯𫧭𫨤𫨤𫩀𫩴𫪒𫪲𫫕𫬕𫬴𫬴𫯊𫰬𫰯𫱒𫱒𫲑𫴺𫶀𫷰𫻓𫻓𫽦𫽱𫿱𫿱𬂨𬂮𬂴𬂸𬂽𬂽𬂿𬃂𬃂𬃕𬃕𬃖𬃙𬃚𬃚𬃯𬃱𬃲𬃲𬃴𬃴𬄜𬄜𬄨𬄮𬄰𬄰𬄶𬄷𬄷𬅂𬅃𬅃𬅄𬅄𬅐𬅐𬅖𬅖𬅙𬅙𬅛𬅛𬅴𬅴𬆔𬇑𬇩𬇲𬇷𬉟𬊩𬋈𬎨𬎱𬒋𬓓𬕌𬕤𬕮𬖔𬖚𬗽𬘭𬘭𬘸𬙾𬚹𬚿𬜂𬜂𬜄𬜄𬝌𬝞𬟟𬠜𬡕𬡖𬣕𬣘𬤂𬤗𬤨𬤾𬦹𬧪𬨥𬨳𬩊𬩊𬩻𬪎𬫕𬬍𬬸𬭆𬭊𬭠𬯾𬱡𬱾𬱾𬴎𬴪𬴫𬴫𬴷𬴹𬵬𬶧𬷞𬷞𬸌𬸐𬸔𬹵",
 "丶": "丒乊产仢低住俍俪俪兑兰关兽兾冤刱剙卵压厎呔呧哴商啇夔奃妁妵娘婏宔寃寬尥岻崀巩帆并庒底废弚弤彨彨彴彽往忛忭忲态怟怵怷怸总悢扚扠抃抵拄拨斏旁旳曽朖杈杋杓柢柱桹梵殶汊汋汎汰汴沭泜注泼浪灼炞炢炷烺犳犿狼玓玣琅瓝畃疰疷的盇眡矾砥砫硠礿祗秪秫稂竒竼笇筤篾籑粏粮紁約紸絉约罜肑肞肽胝舤舦舧艆芃芆芍苄茋荗莨菟葢蔑虳蚤蚳蛀蜋術衩袛袯觝訉訋訍訹註詆誏诋豹貾趆趵跓踉躴軓軚軧軴迏迬述逦逦逸邸郞郦郦酁酋酌酞酦酾酾酿釣釩釵鈦鉒鉥銊鋃钒钓钗钛锒閬阆阺靫靮飰飳馰駄駐駺驻骊骊骪骶魡鲡鲡鴟鵵鸱鹂鹂麈黈㑀㒸㒺㓪㕙㕨㛤㛤㝗㝹㞩㟍㢃㢩㣋㣖㣾㣿㤜㪆㫝㫰㭸㱢㲓㲳㳗㳚㳲㹥㺬㺷㾁㾗䀑䀶䁊䂆䂘䄪䆡䇠䋤䍕䍚䎉䏎䑛䑡䒮䖘䖠䘐䘤䝬䟕䟡䟣䡙䢑䢤䥽䨲䩚䪒䪨䬫䭵䯖䱶䴟䵠䶂𠂟𠂪𠂫𠂴𠆘𠆩𠇲𠊍𠊍𠊑𠒁𠒇𠒢𠓗𠓗𠓗𠔃𠔄𠔮𠕤𠕵𠗟𠘵𠘷𠘻𠘻𠙜𠙦𠙩𠙮𠙰𠙱𠚀𠚭𠛇𠛜𠛝𠜨𠝒𠣕𠣳𠣷𠥷𠨳𠩈𠩖𠫄𠫨𠬠𠬨𠭶𠮁𠮦𠮭𠯴𠰍𠰲𠲌𠴣𠴦𠻡𡄛𡄛𡅛𡇏𡇤𡇬𡇷𡇹𡈤𡊀𡊍𡊲𡋊𡋝𡋝𡌁𡌮𡍞𡎌𡐁𡑷𡖉𡖑𡘒𡘔𡘳𡙃𡙒𡙒𡙒𡙖𡙨𡚷𡛕𡛜𡛣𡟂𡟂𡠧𡢔𡢣𡢧𡣍𡤹𡤹𡤹𡤺𡤺𡤺𡥭𡨘𡮊𡰤𡰫𡱨𡲞𡳁𡳋𡳗𢀝𢁕𢁰𢂇𢆉𢉕𢌡𢍋𢓷𢔎𢔫𢕜𢕦𢘴𢘵𢙟𢚕𢚿𢛹𢞹𢣳𢧂𢨸𢪯𢫖𢬝𢭗𢭾𢮪𢰣𢺾𢻭𢻮𢼐𢽂𢽑𣂞𣃅𣆒𣆭𣋰𣎆𣎘𣏂𣏉𣏎𣐚𣑗𣒈𣔗𣕡𣖁𣚱𣜧𣡅𣣔𣣥𣧀𣪩𣬚𣬚𣭍𣱋𣱎𣱐𣱑𣱒𣳍𣷪𣸳𣹆𣾌𣾱𤄞𤅿𤇍𤈺𤍧𤓲𤔕𤖫𤖸𤗀𤜦𤜫𤝁𤝞𤝣𤝧𤞉𤟁𤤛𤪉𤬨𤭒𤰑𤳚𤵉𤸙𤽞𤿈𤿉𥁤𥃵𥅖𥋥𥍫𥎕𥐝𥑃𥒙𥔐𥘓𥘭𥟌𥥰𥧫𥩘𥩣𥪈𥫢𥫩𥫵𥭂𥭖𥮀𥯣𥱉𥱍𥴸𥶉𥷶𥸏𥾽𥿒𦀬𦅛𦅴𦆗𦇪𦈭𦉹𦊝𦌖𦐠𦒼𦓮𦔹𦗊𦘛𦘜𦘡𦙴𦢗𦢱𦣔𦨁𦨄𦨓𦫐𦫑𦫘𦬸𦭦𦯺𦱈𦱜𦲳𦳯𦳹𦵈𦾲𦿉𧄿𧆉𧉑𧉱𧉶𧊥𧏼𧔭𧕺𧘑𧘹𧙠𧚅𧟧𧡗𧢪𧥒𧥒𧧤𧰚𧲷𧳓𧶂𧷭𧺕𧺶𧻄𧻴𧿪𨈔𨈫𨏩𨐘𨐬𨑙𨓹𨙮𨙳𨚢𨜨𨝇𨝻𨟱𨠏𨥵𨦓𨦾𨦿𨭞𨲢𨲣𨳲𨳳𨵵𨹇𨹒𨾦𨾨𨿮𩆟𩑾𩒊𩖚𩖛𩖶𩗖𩝉𩡼𩣊𩣮𩧯𩨻𩫼𩭸𩰍𩲂𩲃𩳙𩶃𩶄𩶅𩶞𩷕𩸃𩼊𩾡𩾨𩿢𩿯𪀍𪁜𪌘𪎒𪏜𪐥𪐴𪑆𪚴𪚴𪚴𪚴𪚹𪜋𪜠𪝃𪞌𪞖𪡙𪢵𪤜𪨐𪨚𪨨𪪊𪪰𪫐𪫬𪲔𪲔𪲠𪲭𪺡𪺡𪾠𫀌𫀌𫀍𫀦𫃨𫄥𫄥𫅞𫆖𫇕𫇥𫈯𫍍𫎣𫏆𫑌𫗨𫘅𫝍𫞿𫟈冤󠄁堍忍汎㺬秫𩬰𫢃𫢄𫢊𫤳𫥇𫥲𫦭𫧂𫩗𫪃𫪃𫪾𫭒𫭨𫭺𫰉𫰟𫱎𫲓𫴢𫴧𫷵𫹬𫺜𫼠𫾲𫾲𫿔𫿼𬂾𬃒𬃯𬅅𬇈𬇈𬇈𬇈𬇉𬇟𬈃𬉑𬉛𬉩𬉫𬊅𬌍𬎦𬎿𬏀𬏊𬏦𬔚𬔹𬕄𬕄𬖊𬖔𬗄𬙱𬚶𬜧𬞳𬟶𬣣𬣼𬦋𬨳𬩋𬩏𬪖𬫌𬬘𬬸𬲮𬴀𬵌𬶄𬷥𬸏𬹐",
 "丿": "乊乞乥乾产亳仛仞仫仯仸任伤佚侏侐侶係俤倂倂偭傯兑兰关兽兾凞刅刼剃剏劒劣劮勔勧化午卹厇叱吒吵呏呑呹咮商啇喕圙塩复夔奤奼妊妖妙妷姂姝娣媔孫宅宎宫宮寕尓尟尠屰屻岃岆岙帙幒并弚忍怢怣总恤悌愐憁托扨扷抄抍抶抸挮摠斻施斾斿旁旂旃旄旅旆旇旊旋旌旍旎族旐旒旓旖旗旚旛旜旝旞旟昇昋昳晜曽杒杔杪枖枡柉柣株栴桖梯権樬欰歓歩歰歰殀殇殈殊每毟气汑沃沙泆泛洙洫涕涩湎湚漗潅潈澀澀灹炒烅焍熜牕狅玅珠珶璁璳瓞疺省眇眣眨睇矨矺砂砭硃祅祍祑祩祶秅秒秗秩秼稊穾窆窻竒竔竗笑籷籾粆糆紉紗紝紩絑綈綔緐緜緬總繇纫纱纴绨缅罤翐耖肕胅腼芺苵茱蔥虴蚩蛈蛛蝒蟌蠠衁衂衂衃衄衅衆衇衈衉衊衋衽袄袟袠袾裇観觘訒託訞訬詄誅謥讬讱诛豑豒貶賉贬赻趃趎跃跌跦軔軠軼轫轶辥迭递邎邾酋釰鈓鈔鉄銖銩銻鏓钞铁铢铥锑镺镻阩陎陹隲雗靤靥靦靧靨靭韌韧飥飪飫飭饬馲駯驄骢鬀魠魦鮢鮷鯀鯴鲧鲺鴁鴔鴩鴸鵜鶾鹈麨麵麺麽鼄㐌㐼㑅㒎㒸㒺㓇㕭㖒㘯㛎㝹㝺㝻㞏㞣㠴㠶㠺㡯㣢㣼㤇㥘㦵㧞㧣㫊㫋㫌㫍㫏㮌㰃㲳㲽㴀㴁㸒㸡㹈㼡䀔䁞䆝䇬䌛䍇䎷䏕䏚䏭䏲䑯䒚䒦䒸䔼䔼䖢䘏䘐䘑䘒䘔䚾䛂䜀䜀䜧䜧䟞䟦䟪䡯䣷䤄䦗䨋䨙䩂䩃䩄䩅䩆䩇䩈䩉䩊䩋䩌䩎䩏䩖䬾䭿䯯䰡䱃䲵䳀䴠䵑䶏𠀰𠀶𠁪𠂚𠂟𠂴𠃣𠃳𠅎𠅐𠆕𠆕𠆘𠇖𠇪𠉨𠊍𠌸𠌸𠎷𠒁𠒇𠒦𠔃𠔄𠖆𠖧𠖪𠗅𠘔𠘵𠙎𠚂𠚗𠚺𠚻𠛂𠜄𠜤𠝰𠝵𠝵𠝵𠞕𠞴𠠐𠠠𠡳𠢇𠣔𠦨𠦲𠦿𠧌𠧍𠧎𠧿𠩄𠩖𠫄𠫟𠫴𠬠𠭕𠭤𠭳𠭶𠮋𠮦𠯄𠯏𠰃𠰏𠰚𠰞𠱒𠲍𠲣𠴊𠴣𠵰𠷰𠷷𠸕𠸡𠹰𠺤𠺤𠼟𠿦𡂌𡄀𡅚𡆼𡇏𡇤𡇬𡇷𡈤𡈱𡈸𡉔𡉛𡉧𡉼𡋒𡋿𡌍𡌖𡌡𡎂𡐁𡐈𡐬𡒁𡔞𡔟𡖽𡗡𡘓𡘔𡘮𡘶𡘿𡙨𡙶𡚧𡚸𡛈𡞎𡟐𡠨𡠴𡢧𡣯𡥛𡥠𡥩𡦇𡦋𡨘𡨴𡩂𡪖𡫍𡫹𡫾𡫾𡬊𡬪𡭝𡭟𡭥𡭲𡭸𡭹𡭺𡮀𡮏𡮏𡮏𡮑𡮓𡮗𡮘𡮞𡮦𡮯𡮴𡮹𡮻𡮼𡮿𡰤𡱖𡱛𡱨𡱱𡱶𡲞𡳎𡳑𡳗𡴁𡴂𡴃𡴅𡴆𡴇𡴊𡴋𡴍𡴎𡴏𡴐𡴑𡴒𡴔𡴕𡴖𡴗𡴗𡴘𡴙𡴚𡴚𡴛𡴜𡴝𡴞𡴤𡴥𡴦𡴧𡴪𡴪𡴫𡴫𡴫𡵯𡶉𡶠𡸐𡻵𡼺𡾑𡾳𡿱𢀝𢀩𢁏𢁓𢁰𢁱𢂇𢂛𢂮𢃮𢄔𢆉𢆟𢆟𢆩𢆩𢆷𢆽𢇖𢇦𢇫𢈚𢉇𢊉𢊝𢋏𢌡𢌦𢍃𢍋𢏒𢐐𢐾𢑂𢑄𢑈𢑉𢒮𢔖𢔗𢕱𢖲𢗖𢗢𢗩𢙲𢚖𢚮𢛹𢜷𢞤𢞪𢞹𢟃𢟃𢠑𢡄𢡄𢧂𢩷𢩻𢪭𢫅𢬔𢬰𢭁𢮪𢮾𢯀𢰈𢰈𢰜𢱯𢱼𢴹𢷼𢹋𢹙𢻋𢼲𢽑𢿄𣁫𣂛𣂟𣂲𣃦𣃧𣃨𣃩𣃬𣃬𣃭𣃮𣃯𣃰𣃳𣃴𣃵𣃹𣃻𣃼𣃽𣃿𣄀𣄆𣄉𣄊𣄐𣄑𣄕𣄖𣄘𣄙𣄞𣄠𣄡𣄢𣄦𣄧𣄨𣄪𣅒𣅮𣆅𣆋𣆦𣇒𣈂𣉺𣋥𣋥𣌱𣎍𣎘𣏈𣏎𣐅𣐣𣐰𣒰𣒹𣓡𣓽𣔫𣔸𣕅𣕊𣗍𣗕𣗻𣗾𣘈𣘺𣘽𣙸𣚱𣛐𣜀𣜧𣜮𣜱𣜹𣞀𣞊𣞚𣟾𣠡𣠶𣡅𣢒𣢴𣣆𣣔𣥚𣥵𣦴𣦴𣦴𣧃𣧕𣧞𣨒𣨕𣪷𣭛𣭹𣮗𣮻𣮿𣰎𣰔𣰲𣱪𣲦𣳍𣳥𣵚𣵜𣶖𣷋𣷹𣸌𣸖𣸯𣹨𣺐𣺟𣺥𣺥𣻖𣻾𣼒𣾌𣾾𤀗𤁺𤃨𤃳𤇮𤉞𤊣𤌡𤍸𤎤𤔅𤔏𤔑𤔠𤕍𤕔𤙈𤙋𤙚𤙾𤙾𤚛𤜤𤝑𤝹𤞆𤞪𤟯𤣧𤣯𤣵𤤉𤤋𤤣𤤥𤥮𤪩𤫪𤫴𤫺𤫼𤬖𤭌𤰗𤰦𤰬𤱏𤱔𤲎𤲒𤲒𤳊𤳊𤳧𤳶𤴱𤵌𤵎𤶎𤶰𤷒𤹊𤹫𤻸𥁔𥁩𥂁𥃡𥃼𥄮𥄾𥄾𥅧𥅲𥅷𥆻𥈅𥈏𥊇𥊽𥋍𥌣𥍞𥐬𥑅𥑇𥒌𥓅𥓹𥖊𥖌𥖓𥖕𥘤𥘥𥘷𥙚𥙛𥙡𥛏𥝠𥝾𥡺𥢤𥣀𥣀𥥌𥧘𥩷𥩹𥫧𥫧𥫧𥫮𥫮𥫮𥬚𥭬𥮍𥰚𥲂𥲂𥲬𥳦𥴓𥸽𥹭𥺀𥺓𥼈𥽯𥾠𥾨𥾷𥿜𥿷𥿷𦁗𦁝𦂚𦃱𦃷𦅚𦅸𦅹𦆧𦆮𦆰𦆰𦇈𦉖𦊼𦌖𦐒𦐝𦐣𦐨𦕈𦕉𦕗𦘴𦙋𦙋𦙧𦙳𦚖𦚡𦜙𦠠𦣪𦣬𦣷𦧌𦧙𦧨𦨎𦨖𦩂𦩻𦪐𦪮𦪹𦫥𦫺𦬃𦬏𦬰𦬱𦭊𦮮𦯔𦯺𦰎𦱞𦱴𦲳𦲻𦴷𦵀𦵞𦶯𦷩𦸹𦹭𦹴𦾲𦾴𧀋𧀼𧀾𧁗𧂺𧃣𧃿𧄉𧄎𧈅𧈪𧉕𧊉𧋘𧋚𧋬𧌝𧌡𧎠𧐑𧑄𧑤𧑬𧒅𧔗𧔗𧔗𧔭𧖧𧖨𧖩𧖪𧖫𧖬𧖭𧖮𧖯𧖰𧖱𧖲𧖳𧖴𧖵𧖶𧖷𧖸𧖹𧖺𧖻𧖼𧖽𧖾𧖿𧗁𧗂𧗃𧗄𧗅𧗆𧗈𧗉𧗊𧗋𧗌𧗍𧗎𧗏𧗐𧗑𧗒𧗓𧗔𧗕𧗖𧗗𧗘𧗙𧗚𧗛𧗜𧗭𧘐𧘡𧘫𧙍𧚃𧚭𧚭𧛳𧟨𧠃𧠒𧡅𧢪𧥷𧦟𧧂𧧉𧧓𧧤𧩤𧫨𧬡𧯊𧯝𧯪𧰅𧲢𧳋𧳼𧴉𧴦𧵉𧵺𧶓𧷭𧺞𧻂𧻝𧻬𧻽𧼸𧽳𧾁𧾅𧾓𧾭𧾭𧾭𧾶𧾶𧾶𧿌𧿘𧿦𧿪𨀟𨀫𨁃𨁗𨁠𨂟𨃦𨆂𨆽𨈘𨈨𨉥𨌝𨍔𨑳𨑶𨒯𨒲𨓐𨓒𨓮𨔢𨔼𨕂𨕞𨖲𨖸𨗼𨘋𨘹𨙛𨙣𨙦𨙹𨚈𨚒𨛘𨛝𨜧𨝇𨝞𨞄𨞍𨞰𨞷𨞷𨢂𨢒𨣎𨤢𨥊𨥜𨥧𨧛𨨌𨨚𨪻𨫙𨫝𨫺𨬁𨭇𨭋𨭫𨮮𨮽𨲁𨳝𨳺𨵆𨷥𨷥𨷥𨸛𨸴𨹥𨹬𨹱𨺄𨻶𨻾𨼦𨾘𨾤𨾲𨿘𨿝𩀢𩁅𩂐𩆅𩈃𩈅𩈆𩈇𩈉𩈊𩈋𩈌𩈍𩈎𩈏𩈐𩈑𩈒𩈓𩈔𩈕𩈗𩈘𩈙𩈚𩈛𩈜𩈝𩈞𩈟𩈠𩈡𩈢𩈣𩈤𩈦𩈧𩈨𩈩𩈪𩈫𩈬𩈭𩈮𩈯𩈰𩈱𩈲𩈲𩈳𩈳𩈴𩈶𩈷𩈸𩈹𩈺𩈻𩈼𩈽𩈾𩈿𩉀𩉁𩉂𩉃𩉄𩉅𩉆𩉆𩉇𩉈𩉉𩉊𩉋𩉌𩉍𩉎𩉏𩉐𩉒𩉓𩉔𩉕𩉖𩉖𩉖𩉗𩉘𩉙𩉳𩊣𩋠𩎢𩏑𩏛𩐅𩑑𩑒𩑡𩓂𩔁𩔽𩕄𩕇𩖋𩖥𩙴𩚤𩚸𩝼𩟌𩡹𩡻𩡾𩢻𩣓𩤍𩤍𩤤𩦛𩧭𩫆𩬪𩬭𩱾𩲎𩲓𩲫𩲿𩳅𩴭𩵮𩵸𩶟𩶫𩷸𩸌𩹠𩻴𩽞𩾮𩾻𪀐𪁩𪁳𪉡𪉹𪌂𪍉𪍉𪎊𪎎𪎡𪏿𪐞𪓱𪔺𪕧𪖔𪖦𪖩𪗫𪜏𪜙𪞌𪡉𪣇𪣎𪣓𪣪𪣿𪥙𪥻𪨄𪨆𪨋𪨴𪪰𪪽𪫃𪭻𪮝𪯳𪯶𪯸𪯽𪰄𪰅𪲦𪳃𪳔𪴄𪴓𪴡𪵬𪶟𪷁𪸎𪸐𪺠𪺡𪺡𪺩𪿉𪿧𫀉𫀾𫁃𫁇𫁍𫃨𫇥𫊕𫊟𫋪𫋫𫋬𫌾𫍚𫏔𫑉𫒇𫒠𫕗𫖀𫖁𫖂𫖃𫖄𫖪𫗖𫗘𫘏𫚌𫚽𫛡𫝍𫝣𫞑𫟈備吆弢汎𨗒𫡏𫡓𫡖𫡘𫡧𫡽𫢊𫢡𫣪𫣱𫤉𫤜𫤳𫥠𫥣𫦒𫦧𫧘𫧧𫧪𫧺𫩑𫩓𫩰𫪈𫪓𫭐𫭒𫰿𫱧𫲶𫴻𫵊𫶴𫶷𫶿𫷨𫷲𫸓𫸽𫸿𫹶𫹽𫼕𫼟𫼴𫾦𫾧𫾭𫿋𬀀𬀂𬀃𬀄𬀅𬀆𬀇𬀈𬀋𬀌𬀍𬀏𬀐𬀒𬀓𬀔𬀕𬀖𬀘𬀙𬀚𬀜𬀝𬀞𬀟𬀠𬀡𬀢𬀣𬀤𬀵𬀷𬀹𬁀𬁲𬁷𬂢𬃩𬄏𬄒𬅅𬆇𬆠𬆤𬈃𬈹𬊹𬋪𬌜𬌫𬍭𬍲𬍲𬍵𬎙𬎣𬎿𬏶𬐆𬐚𬐱𬑳𬑼𬒁𬒲𬓔𬕓𬕫𬗟𬙞𬚠𬛲𬜆𬜕𬝃𬝰𬝰𬟵𬠔𬠪𬠼𬡜𬡢𬢉𬢺𬥉𬦛𬨠𬨵𬩀𬫎𬬯𬬴𬮩𬯗𬰠𬰡𬰢𬰣𬱽𬲰𬲻𬴦𬶕𬷘𬹃𬹣𬹦",
 "冂": "俪俪傐冑刚同喬嗃嫓尚岗嵩嵪彨彨扁扃搞敲暠槀槁欳歊毃泂滈炯熇皜碻禞稾稿篙絅縞纲缟翯苘蒿詗謞诇迥逦逦郦郦鄗酾酾鎫鎬钢镐駉骊骊髇髚髛髜髝髞鰝鲡鲡鶮鹂鹂㕟㙜㙵㛤㛤㢠㧇㧏㪣㭎㱿㸀㺾㾸䋄䌹䐧䧚䬘䮦䯧䯨䯩䯪䯫𠀷𠂥𠇶𠊇𠋁𠋅𠌈𠎚𠎤𠔕𠕊𠕓𠕔𠕧𠖷𠛧𠜐𠞋𠞟𠞫𠟔𠡋𠣠𠨄𠳮𡉉𡒋𡒼𡔮𡕱𡘦𡜃𡠀𡢓𡢠𡦩𡭒𡲜𡴊𡶝𡿩𢄗𢇺𢑸𢗶𢘁𢞟𢡤𢤶𢨠𢱪𢲤𢼾𢽋𢾠𣅻𣈺𣉞𣏊𣏵𣐒𣖫𣗨𣘺𣦵𣦻𣨦𣩅𣪛𣯖𣶄𣼕𤌾𤏕𤐯𤚸𤠖𤠬𤣽𤧼𤳿𤾘𥌉𥏹𥐻𥑎𥖰𥛒𥟸𥡺𥦮𥨷𥩓𥭩𥲓𥲖𥴎𥵭𥶧𥸏𥿑𦊉𦊕𦊖𦒈𦒭𦓄𦓐𦠼𦬿𦳖𦿈𦿣𧄪𧈿𧌵𧎸𧓡𧕔𧚲𧜉𧭆𧰏𧺸𧾫𨃤𨃧𨅳𨇕𨉲𨊾𨎄𨐲𨓘𨓺𨔜𨛖𨜥𨢓𨢗𨥽𨳠𨴀𨺷𨻠𨾫𩆚𩌚𩌡𩍯𩎏𩔒𩕴𩘃𩙮𩙷𩤬𩥊𩪿𩫀𩫁𩫂𩫄𩫅𩫆𩫇𩫈𩫉𩫊𩫋𩫌𩫌𩫍𩫎𩫏𩫐𩫑𩫓𩫕𩫗𩫘𩫙𩫚𩫛𩫜𩫝𩫞𩫟𩫡𩫢𩫣𩫤𩫥𩫦𩫪𩫬𩫮𩫲𩮘𩺙𪒣𪓙𪕍𪟣𪢹𪥌𪥜𪦂𪨓𪫪𪯪𪲔𪲔𪶓𫀌𫀌𫁋𫁝𫄥𫄥𫇪𫈦𫋊𫓂𫘍𫘵𫘶𫘷𫚅𫞎𫞏丽丽瀹𫤭𫥒𫩚𫪃𫪃𫪡𫾣𫾲𫾲𫿯𫿻𫿻𬃄𬆀𬌾𬎯𬏐𬑣𬔩𬕄𬕄𬖰𬗶𬘆𬘆𬚰𬳶𬴕𬴙𬴚𬴛𬴝𬴞𬴟𬵼",
 "丨": "児吲矧稲粌紖纼蚓訠鈏靷㢿㴞㷔㽼䀕䇙䏖䒡𠀓𠀥𠂳𠆺𠇁𠒒𠖚𠢎𠬯𠮘𠴟𡗵𡘨𡛅𡳵𡳶𢆽𢇆𢇊𢇋𢏄𢖾𢦕𢪉𢰡𣄯𣆨𣇑𣏆𣏖𣐤𣿱𤠣𥃶𥈺𥐥𥐲𥱌𥱞𥸫𥸱𦃺𦊉𦊉𦓐𦓐𦙢𦼨𦾔𧥬𧿯𨂻𨈧𩌖𩺟𪉷𪜢𪥮𪱆𪱆𪵰𪹷𪹷𪿧𫁇𫂻𫃈𫇰𫙒𫝒𫞞𫞽𫞽𫟜𫟝𫢤𫢽𫥒𫥒𫩥𫰿𫸬𫸷𫺼𬃑𬃤𬅯𬇡𬈍𬊟𬎝𬑟𬠔𬪹𬫹𬫺𬬕𬬕",
 "𠂇": "伖佈佐佑侑叆叐吰咗咘咴哊囿姷宏宥峟希怖恢戫抜抪拻敎柨栯汯洃洧烠烣爰珛痏盔祐竑紘絠纮翃肱肴脄苃若蛕袏詴詼诙谹賄贿迶郁酭鈜鈽銪钸铕閎闳陏雄髪鮪鲔龓㑓㘵㚴㝾㞀㢬㤑㤢㤫㦽㬼㳍㳓㷇䀁䆖䆜䍔䒴䞥䡌䦈䧺䨖䫺䳑䵋𠆽𠌞𠙢𠛻𠝊𠡃𠫤𠫲𠬗𠬺𠭅𠭶𠮂𠯌𠳮𡇊𡉞𡒦𡖠𡛀𡛮𡛿𡧣𡪃𡲫𡲱𡵓𡵢𡵦𢀠𢀡𢀡𢁻𢂜𢂞𢃊𢃌𢅄𢇬𢇴𢈓𢉏𢌱𢒰𢔕𢗞𢙵𢞑𢞑𢣖𢣖𢯎𢱪𢱻𢳻𣍳𣍹𣎉𣎏𣎥𣐞𣐪𣒅𣔩𣖻𣘯𣥯𣧦𣬓𣭊𣳇𣼄𣾲𤁌𤆠𤉕𤉻𤋨𤌕𤌕𤐟𤔟𤙅𤙼𤠬𤢃𤣦𤣾𤤰𤨂𤲽𤵄𤵗𤾘𥁊𥁓𥂠𥂧𥂹𥈫𥐪𥑛𥑢𥑰𥑿𥒣𥙀𥛂𥛒𥞎𥟛𥡋𥥜𥫲𥬡𥬢𥮷𥱘𥿈𦁷𦅳𦐌𦐓𦑑𦛒𦞗𦤠𦥀𦥸𦩎𦬠𦬧𦭞𦭹𦮘𦯸𦱤𦲇𦲈𦴯𦴰𦴳𦵝𦶪𦶭𦶯𦸳𦹈𦹉𦹊𦹍𦻟𦻠𦻡𦻢𦻣𦻥𦻦𦻧𦻨𦽷𦽸𦽹𦽻𦿠𦿢𦿣𦿤𦿥𧁕𧁗𧁻𧂱𧂳𧂵𧃺𧃻𧄫𧄬𧅎𧅏𧅢𧅽𧆁𧆚𧆴𧈽𧉩𧍂𧘬𧙗𧙛𧠶𧤮𧤮𧦞𧨧𧭯𧮁𧮯𧯭𧰯𧱉𧱞𧲭𨀒𨀡𨃧𨋞𨎄𨎼𨒐𨒭𨔏𨗫𨙿𨚞𨚺𨚼𨛠𨡽𨡿𨢗𨣣𨥰𨦐𨦗𨳧𨳾𨴜𨹠𨼰𨼰𨽋𨾬𨾭𨿭𩉎𩉦𩌚𩑲𩒏𩖢𩙥𩚿𩟣𩟤𩢚𩣋𩩜𩪄𩪄𩪏𩭀𩰑𩲾𩵼𩶉𩷃𩷷𩺙𩼏𩼏𩼐𩼮𩿅𪀬𪁡𪐊𪑀𪘃𪚞𪜛𪡐𪢹𪧰𪫦𪭂𪭥𪰯𪱤𪱰𪱺𪲄𪳊𪸚𪹆𪻟𪿙𫋒𫋸𫎋𫎍𫗏𫙞𫚸𫜲𫠖卉𢌱𥃲𫣋𫦦𫪩𫪫𫱄𫷧𫸫𫼦𬀯𬁡𬂑𬊐𬌬𬍘𬏢𬐋𬑐𬘠𬡑𬣩𬫆𬯄𬳼𬷀",
 "厶": "丟丢乨亝仫伀伝佁佉侌侔俊俟俬俼充兊兖兘兿冶凨刣刦刧刼动劫劺匥却厽厽厾叆叇叝吮吰呍呿咍哞唆唉唟唷嗴嚔囩囼圎垒夽妐妘始娭孡宏宖尝层峅峻巯巰弃弆彸徹忩忪忶怠怡怯恈恱悛惨抁抅抎抬抾拚拡挨捘掺撤撪斚斚旀旈旒昖昙昪昿晙朅朘松枀构枟枩枱枲桙梭梳棛椮橀欸殆毓毤毪毵毶汯沄沇沟治泓法洠流浚涘淯渗澈灋炂炱炲焌焴狁獇玜玧珆珐琉瓮瓵畯疏痠瘆盍眃眙眸睃瞮砝砿硫碜祛秐秮稄竑竢竣笞笲糁紘紜紭紶紿絋絫纭纮绐罢罴翁翃耘耛肱胎胠舩艈芶芸苔苰荾萒藝蘛蚣蛑蜟衮衳袪袬裗訟詒詓誒誜讼诒诶谹貽賐购贻跆踆転軩輽轍辙辝运迨迲逘逡逳邰酝酸酼醯鈆鈎鈗鈜鈶鉣鉱鉾鋑鋶錥钩锍閎閞闳阭阹陖雄雲鞃頌颂颱飴餕馂馻駘駿騃骀骏骖魂魼鮐鮻鯍鯵鲐鲹鴘鴾鵔鵕麍麮麰麽黢黪鼁齝㕖㕘㕙㕬㘬㙯㛌㛖㛩㝐㟥㡎㢬㢱㣃㣍㣞㥔㥘㧁㧠㧧㨧㫢㬚㭇㭓㭕㮥㯙㰦㰧㲙㳂㳎㳒㴉㶼㸻㹤㺹㻐㻙㽙㾀㾂䀵䅟䆓䆖䇊䇗䉊䋭䍔䏬䏻䒆䒧䒪䖔䖻䘒䘻䚗䝜䞭䟩䟽䡆䡌䡏䢵䣲䦾䧀䨎䩓䪺䪻䫺䮁䮃䯳䰟䰸䲰䲲䵽䶑𠁯𠂧𠃴𠄩𠄴𠅀𠅱𠆽𠇌𠈂𠉨𠊁𠊝𠋃𠋏𠏏𠏓𠐑𠒕𠒳𠔘𠔲𠕺𠘺𠘾𠚅𠚸𠛀𠝛𠞌𠞗𠞗𠞿𠞿𠟼𠡇𠡤𠡺𠣓𠣗𠣛𠤘𠤥𠤦𠤰𠥘𠥘𠦊𠦷𠩂𠫛𠫤𠫲𠫳𠫴𠫾𠬀𠬃𠬄𠬅𠬆𠬆𠬇𠬈𠬉𠬊𠬍𠬎𠬐𠬑𠬑𠬑𠬒𠬓𠬔𠬕𠬖𠬗𠬘𠭩𠯜𠰈𠱕𠳊𠳌𠳙𠵤𠵷𠼷𠾀𠾖𡀚𡂞𡆾𡇁𡇗𡇛𡇰𡇺𡉞𡊅𡊛𡊯𡍊𡎖𡏰𡑼𡒹𡓌𡔴𡕮𡕶𡖜𡖤𡗳𡗹𡙿𡚸𡛍𡛞𡛠𡜎𡝥𡞋𡞤𡞩𡟸𡡠𡧷𡩞𡮊𡱅𡱓𡱢𡲨𡲲𡳔𡴞𡵓𡵦𡵴𡵺𡷃𡷋𡹀𡹿𡻏𡽭𡽼𢁲𢁷𢂙𢃧𢄇𢆋𢆹𢇰𢈟𢈡𢈳𢍞𢍨𢍭𢍭𢏦𢏭𢏲𢐺𢓪𢕹𢕿𢖡𢗕𢗞𢘌𢚔𢚱𢛌𢣒𢦯𢨱𢩻𢪌𢫀𢫠𢬁𢭋𢮨𢯃𢯡𢰉𢲚𢶳𢸥𢼃𢼉𣄏𣅿𣉀𣊀𣋧𣋧𣌶𣏈𣏏𣐂𣐜𣓕𣓪𣓹𣕀𣖤𣘂𣘯𣙚𣙼𣚥𣠯𣣎𣣿𣦯𣧔𣨧𣪕𣫺𣭆𣭰𣮟𣰓𣱉𣳵𣴑𣴦𣸓𣸮𣺃𣺴𣻤𣼄𣼿𣽕𣾯𣾲𤀷𤁫𤂠𤂳𤄝𤆠𤊜𤐮𤒞𤒪𤔒𤖮𤗉𤙋𤙏𤚅𤚅𤚥𤛙𤜁𤝅𤝏𤡅𤢱𤣦𤣵𤣾𤥼𤦱𤩮𤩯𤪆𤪍𤫳𤯢𤱂𤱔𤲋𤲛𤳑𤳖𤳗𤳛𤳼𤴖𤵄𤵆𤵔𤶊𤶗𤷥𤸾𤹮𤼪𤼴𤽎𤿜𥁐𥂊𥂊𥃼𥅬𥆆𥎰𥏖𥏳𥐪𥐯𥐾𥒛𥒣𥒲𥓗𥔪𥕃𥘟𥙉𥙒𥜖𥜷𥝠𥝲𥝶𥞋𥡊𥡋𥡚𥢅𥢆𥢘𥣍𥥈𥧺𥨜𥩞𥬀𥬉𥬔𥭏𥮓𥮨𥮾𥯿𥱘𥹇𥹋𥹓𥺞𥿋𦀠𦁙𦁛𦁷𦅄𦈷𦐌𦓩𦔁𦔑𦔞𦗅𦚒𦛶𦜈𦝑𦞗𦠣𦣔𦤆𦤉𦤳𦧊𦧢𦨛𦩈𦩉𦩓𦬘𦭷𦮀𦮸𦮺𦯧𦰠𦱀𦱚𦱚𦲞𦲮𦳰𦳽𦳾𦵑𦹎𦺀𦺁𦺯𦾆𧀉𧀋𧁏𧆷𧈽𧉃𧉟𧉤𧉧𧋝𧍄𧏙𧏝𧔂𧕱𧗺𧘤𧚦𧛥𧠜𧣥𧤇𧥼𧧡𧨆𧨯𧩟𧮯𧰯𧰴𧴳𧵈𧵱𧶀𧶊𧺭𧺷𨁐𨁻𨅊𨅫𨆽𨇞𨊵𨋍𨋒𨌘𨌪𨌯𨏁𨏣𨐑𨐹𨑪𨒴𨓋𨓫𨕕𨙿𨚕𨚫𨛧𨝈𨟝𨠢𨡿𨣪𨥕𨥺𨦣𨧚𨧶𨨕𨨟𨪢𨬃𨱛𨲑𨳗𨴍𨴱𨹠𨹶𨾃𨾜𨾱𩃍𩃬𩄈𩅙𩅣𩅣𩇒𩇘𩉦𩉭𩊻𩎞𩏁𩑑𩒎𩒬𩓀𩖢𩢠𩢧𩣭𩣴𩥵𩩣𩬌𩬠𩬨𩭕𩭤𩭹𩰽𩲑𩲥𩵻𩶢𩷃𩷮𩾮𩿅𩿟𩿡𩿹𪃰𪉂𪊴𪌚𪌥𪎣𪐯𪔎𪕞𪖙𪘑𪙅𪚭𪚵𪚸𪜞𪜟𪜣𪜩𪜴𪝗𪟆𪟷𪠗𪠝𪠞𪠟𪠠𪠡𪠢𪠻𪡳𪢳𪣁𪤫𪥬𪧌𪨭𪨮𪪕𪪳𪫤𪮌𪱜𪲡𪵣𪸗𪸘𪸡𪺮𪻅𪼎𪿘𫀀𫀙𫁅𫃰𫆆𫆡𫆽𫇄𫉵𫊿𫌄𫍜𫎣𫎺𫐁𫑋𫓪𫓴𫓾𫔰𫕨𫖘𫖭𫖻𫘤𫚱𫞀𫟵𫠖吆𣫺𤠔𫡶𫢎𫢺𫢼𫣌𫤯𫤷𫦂𫧨𫨄𫨩𫨬𫨭𫨮𫨯𫨰𫨱𫩄𫩞𫭅𫮅𫯸𫴕𫶅𫶫𫷧𫸜𫹝𫼒𫿪𬁍𬁲𬁴𬂼𬃋𬃚𬄔𬅻𬆗𬆽𬉫𬌫𬌷𬍒𬍝𬐋𬐟𬑼𬓞𬔠𬖊𬗐𬘄𬘗𬘛𬛉𬛠𬜝𬡺𬢢𬢳𬤄𬥞𬦑𬨹𬨽𬨿𬪻𬫼𬬘𬭀𬭂𬭐𬭝𬯊𬱬𬳯𬵖𬹢",
 "凶": "哅嵏嵕恟恼惾朡椶洶猣离稯糉緵翪胸脑艐葼蝬詾鍐騣鬉鬷鯼㕼㟅㣭㨑䁓䈦䍟䎫䣴𠒋𠴶𡹕𢫤𣑤𣶑𣺷𤜏𤥘𤭶𤵻𥃑𥑪𥒚𥞝𦟨𦭪𧧗𧲳𧵮𨠮𨥸𩌠𩢛𩰷𩷇𪃊𪞸𪞻𪞼𪞽𪢃𪵂𫤧𫥥𫥩𫥪𫥮𫩷𫼭𬛏",
 "儿": "侁侊俿倪傹充兌兏兑兖兙兛兝兞兟兟兡兢兢兣兤况冼剋勀勊吮呪咣唬唲坴売姯姺娔婋婗宪尅尡岲彪怳恍恱抁拀挄掜摬晃晄晲柷桄棿椃樈橷殑毤毨氪沇況洗洸淣淲滰炾烍狁猇猊獍玧珖珗琥璄甝皝眖睨硄祝竞竸竸筅箎糡絖耀胱腉苉茪萀萒萖虒虓虝號虠虢虣虤虤虥虦虩虪蜺裭覤觥觬詋詵誽諕诜貎貺贶跣軦輄輗輝辉选郳酰鈗銑銧鋴錿鏡铣镜阋阭霓靗韑頹馻駪駫鬩鯢鯱鲵鴄鶂鶃麑黋鼀齯㑆㒭㒭㒯㘢㙈㚾㟅㣞㧥㪇㪒㫛㭇㭠㮱㰫㱡㳳㹰㽙㾌㿠䆓䆪䊁䋩䏘䔔䖊䖋䖌䖎䖐䖑䖓䖔䖕䖖䖘䖚䖛䗂䘽䚚䝞䢾䣴䦧䦾䨔䬌䭗䮘䯑䰧𠀡𠅨𠅬𠆃𠆔𠈑𠈣𠑽𠒋𠒌𠒐𠒑𠒒𠒕𠒗𠒘𠒙𠒚𠒛𠒝𠒠𠒡𠒣𠒥𠒦𠒪𠒫𠒬𠒭𠒯𠒰𠒲𠒳𠒵𠒶𠒶𠒶𠒷𠒸𠒼𠒽𠒿𠓀𠓁𠓃𠓅𠓆𠓆𠓇𠓈𠓉𠓉𠓉𠓊𠓋𠓌𠓎𠓐𠓑𠓒𠓓𠓔𠓖𠓙𠓙𠓙𠓙𠕍𠗌𠜎𠢂𠤥𠤥𠤦𠥳𠥶𠧶𠩣𠩫𠬓𠭼𠯔𠯕𠱕𠳭𠵗𠵰𠵷𠸛𠸜𡄼𡅗𡇰𡇺𡒞𡕱𡖬𡛘𡜎𡥲𡥺𡦨𡨷𡫛𡬃𡬃𡬃𡬣𡮅𡱘𡴞𡶢𡷀𡸢𡸣𡹕𡹿𡻏𡾡𡾡𢁲𢆋𢇰𢈇𢈶𢍔𢏡𢏯𢏱𢓠𢓥𢔬𢙝𢚛𢜜𢡤𢩊𢪚𢬳𢭪𢮎𢰉𢹁𢼙𢼯𢼴𣃅𣅷𣆤𣆥𣉀𣍦𣒇𣒖𣖒𣛍𣝼𣣉𣣍𣤟𣩜𣬮𣭟𣭡𣱤𣵫𣶑𣸿𤀗𤁫𤂩𤄳𤈛𤍹𤔓𤔸𤙥𤞓𤥣𤦤𤦻𤱳𤵔𤵻𤶏𤷅𤷡𤾆𤾇𤾗𥀅𥆄𥆩𥍄𥍕𥏋𥏌𥐵𥑻𥓋𥓣𥙑𥝲𥞏𥞝𥤒𥦥𥧐𥳠𥵑𥵲𥸜𦀈𦁙𦁲𦆘𦉲𦊫𦕤𦖖𦥰𦦃𦦿𦧊𦨻𦩊𦩕𦬮𦬺𦭶𦮀𦯇𦲮𦳽𦳾𦹞𧆡𧆢𧆦𧆫𧆬𧆯𧆰𧆷𧆸𧆹𧆻𧆼𧆽𧇅𧇌𧇍𧇎𧇐𧇑𧇒𧇓𧇙𧇚𧇛𧇜𧇝𧇞𧇟𧇢𧇥𧇦𧇭𧇮𧇯𧇰𧇱𧇲𧇶𧇷𧇸𧇹𧇺𧇻𧈄𧈅𧈆𧈇𧈈𧈊𧈋𧈌𧈍𧈐𧈙𧈜𧉃𧍄𧍾𧖟𧖟𧗯𧠺𧡎𧣥𧧗𧧯𧫙𧮽𧰏𧱀𧳌𧵦𧵮𧷉𧸾𧹁𧹂𧹍𨂜𨉁𨋍𨏆𨐈𨐑𨒺𨔛𨙢𨛵𨛸𨠵𨦣𨦸𨪹𨮠𨴐𨵘𨹂𨺙𨻙𨾷𨿖𩆱𩇜𩊠𩎲𩐣𩒇𩒙𩒚𩛔𩞴𩣂𩤌𩦶𩬌𩭂𩭕𩰷𩱕𩱕𩳁𩶤𩶸𩷇𩾇𪀯𪀷𪁤𪂬𪅑𪏐𪓬𪕓𪕗𪕨𪘰𪛌𪛔𪝗𪞀𪞃𪞄𪞆𪞐𪞑𪞔𪞣𪣁𪣕𪥚𪥬𪦍𪫤𪯟𪸗𪺎𪾂𪾍𫀖𫀗𫀙𫀲𫅃𫇁𫊠𫊶𫌝𫌦𫍺𫎵𫏈𫐐𫐦𫐫𫐰𫒪𫕼𫘇𫘌𫘡𫜐𫟵𫠜兔况挽𫢎𫢳𫤚𫤜𫤝𫤟𫤠𫤡𫤢𫤤𫤥𫤦𫤧𫤨𫧕𫧨𫧰𫧱𫧶𫨹𫩱𫪕𫪨𫪨𫬲𫲭𫳔𫳨𫳸𫵰𫶪𫶶𫻺𫻻𫽶𫾹𫿋𬀊𬀌𬃑𬅲𬆁𬇡𬇶𬇾𬈯𬎢𬎸𬑂𬘢𬙗𬚠𬚬𬞁𬟪𬟬𬟭𬟰𬟲𬠧𬢆𬤀𬥉𬥙𬧎𬨩𬩌𬯤𬯬𬱆𬳽",
 "土": "丟丢佉佳佳侍侳俚倰僿凌凐刦刧刲刲刼剉劫劸劸勎卦卦却压厓厓厘厾叝周呿哇哇哩唑唗唟噻嚜坴埶堯堯壡夎奊奊奎奎娃娃娌婈封封屆峙崚庒庤座庱弆待徍徍徒怪怯恃恚恚悂悝悭慳抾持挂挂挫捏捚掕摼時晆晆朅柽桂桂桩桽梐梩棱樫樭歅歭法洔洼洼浬涅淕淩湮溼漜濹灅灋烓烓煙熞燅爅狅狴狸狻珐珪珪理璂瓼甄畤畦畦痔痤皴盍眭眭睉睖睦矬砝硅硅碐祍祛祾禋禥秲稑稜窐窐童筀筀等簊簺粧粴紶経絓絓綾緸纆纒绫罢罣罣罴胠胿胿脏脞艃茥茥荰荲莝菱薼蘲蛏蛙蛙蜌街街袪袿袿裏裡裬觟觟詓詩詿詿諲诖诖诗貍賍赃赲赳赴赵赶起赸赹赺赻赼赽赾赿趀趁趃趄超趆趇趈趉越趋趌趍趎趏趐趑趒趓趔趕趖趖趗趘趙趚趛趜趝趞趟趠趡趢趣趤趥趦趧趨趩趪趫趬趭趮趯趰趱趲跬跬跱跿踛踜軽輘迲逵達邽邽邿郌郌鄄野量釐鉣銈銈銼鋰錂錴鏗鑸铿锂锉閨閨闉闺闺阹陛陞陡陧陵陸陻鞋鞋頚髽魼鮭鮭鯉鯐鯥鯪鰹鲑鲑鲣鲤鲮鵱麮黊黊黫鼀鼁鼃鼃鼭㒦㓐㕓㖏㖫㖶㘿㙄㙓㙓㛇㛗㛬㝧㟇㠥㢆㢾㤬㤬㥄㥘㧁㩙㪈㪈㫢㫭㭕㭙㭫㭴㯇㰦㰪㰪㱥㳴㷑㹤㹩㾀㾏㾏㾖䀅䁼䂯䂳䃌䃘䅅䅅䇈䈊䋥䌑䏶䏻䒧䓁䓰䖔䖯䖯䗀䗎䘃䙵䙵䚈䝰䞖䞗䞘䞙䞚䞛䞜䞝䞞䞟䞠䞡䞢䞣䞤䞥䞦䞧䞨䞨䞨䞩䞪䞫䞬䞭䞮䞯䞰䞱䞲䞳䞴䞵䞶䞷䞸䞹䞺䞻䞼䞽䞾䞿䟀䟁䟂䟃䟄䟅䟆䟇䟉䟊䟋䟌䟎䟏䟐䟑䟒䟩䟶䡜䤚䥓䦙䦟䦷䧉䪺䬋䮃䮚䯓䯓䯗䳏䳏䵛䵷䵷䵽﨣𠈘𠈘𠈺𠉨𠒌𠒶𠒶𠒶𠗔𠗻𠘾𠚂𠚛𠚛𠚛𠜚𠜤𠜤𠝛𠞗𠞗𠠄𠡍𠡭𠡺𠢂𠢴𠣗𠤪𠦻𠩂𠩜𠪖𠪤𠪤𠫀𠫳𠫴𠫶𠫾𠬃𠬇𠬈𠬉𠬑𠬑𠬑𠬒𠬕𠬖𠱅𠲕𠳊𠳌𠴗𠶈𠷜𠷪𠸨𠹈𠺞𠼤𠼻𠽥𠽥𡀓𡃏𡃚𡇽𡈞𡈞𡊋𡊋𡊛𡋣𡋣𡌚𡌤𡌤𡌪𡌲𡌲𡍂𡎐𡎢𡎥𡎦𡎬𡏂𡏜𡏩𡐖𡐠𡐠𡐲𡐲𡑚𡑧𡑮𡒑𡒑𡒟𡒪𡒹𡓆𡓢𡓨𡓨𡓮𡔁𡔬𡕮𡕮𡘫𡛠𡠩𡣫𡧩𡧩𡨠𡨾𡪂𡪈𡫈𡫓𡬉𡬋𡬵𡭈𡭈𡮊𡯨𡱅𡲙𡲨𡳫𡷅𡷅𡸄𡸔𡸔𡹃𡻸𡽥𡿂𢃇𢄰𢈩𢊉𢋨𢌅𢌩𢍠𢍠𢍨𢏬𢐱𢑫𢑿𢒐𢔁𢕤𢕳𢕿𢖂𢖡𢗩𢚂𢢨𢥀𢪭𢫀𢫞𢬝𢭋𢭰𢯃𢯅𢴸𢴹𢸵𢹗𢹮𢻘𢻘𣇒𣈹𣈹𣊒𣋧𣋧𣍒𣎞𣑖𣓹𣔘𣔘𣔫𣔫𣔭𣕪𣕫𣕫𣕭𣗕𣘸𣙚𣞪𣟁𣠠𣣆𣥮𣥮𣦙𣨎𣩲𣫴𣫴𣱐𣱑𣴞𣴳𣴶𣸉𣸫𣹶𣻶𣻹𣻺𣼤𣼤𣿣𣿣𤀕𤁄𤂠𤃎𤃟𤄊𤄝𤇂𤉛𤋰𤍣𤎃𤎃𤎇𤎇𤎮𤏉𤏎𤏎𤏎𤏎𤏝𤒋𤒋𤒋𤒋𤒲𤖃𤙏𤙞𤚕𤚣𤚣𤞇𤞇𤠿𤣐𤦫𤧊𤧊𤬿𤬿𤭝𤲪𤳖𤳗𤳛𤻰𤼴𤿜𥀀𥂊𥂊𥆤𥆥𥆯𥆼𥈯𥉸𥋍𥌬𥎰𥑋𥒐𥒐𥓄𥓪𥕛𥖌𥗃𥗬𥙒𥙞𥙞𥚃𥚊𥚣𥞋𥢤𥤐𥦊𥦿𥧚𥧬𥨜𥩄𥩄𥩳𥪽𥬔𥭭𥮊𥮻𥱐𥲔𥲽𥴁𥴓𥴿𥵷𥶴𥹓𥹩𥽞𦀐𦀘𦁪𦆊𦈑𦈰𦈰𦉖𦋅𦋅𦐰𦐰𦓯𦓯𦓵𦕸𦙾𦚒𦛣𦛶𦝄𦝪𦡃𦡟𦢓𦥂𦥂𦪆𦪷𦬰𦱰𦳰𦳻𦵞𦷗𦸀𦸃𦹇𧂸𧆣𧇏𧉧𧋎𧋨𧌉𧏂𧏂𧏜𧔊𧔹𧕀𧕫𧙔𧚣𧛑𧛲𧛲𧜶𧠴𧠹𧠹𧤵𧧺𧨀𧫠𧬡𧲵𧸳𧹥𧹬𧺇𧺈𧺉𧺊𧺋𧺌𧺍𧺎𧺏𧺐𧺑𧺒𧺓𧺔𧺕𧺖𧺗𧺘𧺙𧺚𧺛𧺜𧺝𧺞𧺟𧺠𧺡𧺢𧺣𧺤𧺥𧺦𧺧𧺨𧺩𧺪𧺫𧺬𧺭𧺮𧺯𧺰𧺱𧺲𧺳𧺴𧺵𧺶𧺷𧺷𧺸𧺹𧺺𧺻𧺼𧺽𧺾𧺿𧻀𧻁𧻃𧻄𧻅𧻆𧻇𧻈𧻉𧻊𧻌𧻍𧻎𧻏𧻐𧻑𧻒𧻓𧻔𧻕𧻖𧻗𧻙𧻚𧻛𧻜𧻝𧻞𧻟𧻠𧻡𧻢𧻣𧻤𧻥𧻦𧻧𧻨𧻩𧻪𧻭𧻮𧻯𧻰𧻱𧻲𧻲𧻳𧻴𧻵𧻶𧻷𧻸𧻹𧻺𧻻𧻼𧻽𧻾𧻿𧼀𧼁𧼂𧼂𧼃𧼄𧼆𧼇𧼈𧼉𧼊𧼋𧼌𧼎𧼏𧼐𧼑𧼒𧼓𧼔𧼔𧼕𧼖𧼗𧼘𧼙𧼚𧼛𧼜𧼝𧼞𧼟𧼠𧼡𧼢𧼣𧼤𧼥𧼦𧼧𧼨𧼩𧼪𧼫𧼮𧼯𧼰𧼱𧼲𧼳𧼴𧼶𧼷𧼸𧼹𧼺𧼻𧼻𧼿𧽀𧽁𧽂𧽃𧽅𧽆𧽉𧽊𧽋𧽍𧽏𧽐𧽑𧽒𧽓𧽔𧽕𧽖𧽗𧽘𧽙𧽚𧽛𧽜𧽝𧽞𧽟𧽠𧽡𧽡𧽢𧽣𧽤𧽥𧽧𧽨𧽩𧽪𧽫𧽬𧽭𧽮𧽯𧽰𧽱𧽲𧽳𧽴𧽵𧽶𧽷𧽸𧽹𧽺𧽻𧽼𧽾𧽿𧾀𧾁𧾂𧾃𧾄𧾅𧾆𧾇𧾈𧾉𧾊𧾋𧾌𧾍𧾎𧾏𧾐𧾑𧾒𧾓𧾔𧾕𧾖𧾗𧾘𧾙𧾚𧾜𧾜𧾜𧾝𧾟𧾠𧾡𧾢𧾣𧾤𧾥𧾦𧾧𧾨𧾩𧾪𧾫𧾬𧾮𧾯𧾰𧾱𧾲𧾳𧾴𧾵𧾶𨀃𨀵𨁥𨁫𨂧𨄎𨄘𨅆𨅆𨅣𨅣𨅫𨇞𨇠𨉉𨉞𨌻𨎐𨐬𨑳𨓒𨓦𨕅𨕎𨗾𨘦𨘫𨘫𨙦𨚫𨛋𨛏𨝈𨞄𨞬𨤢𨤣𨤤𨤦𨤧𨤩𨤪𨤫𨤬𨤭𨤮𨤯𨤰𨤱𨤳𨤵𨤷𨤷𨤻𨦓𨧀𨧶𨧽𨨌𨬇𨬇𨭇𨭱𨮞𨮲𨮲𨱋𨴻𨶵𨷙𨹫𨼁𨼂𨼈𨼦𩁅𩁤𩆔𩇘𩊰𩎅𩘔𩜩𩜩𩟉𩟉𩟒𩢧𩣪𩣴𩦛𩧹𩧾𩫟𩬨𩭇𩰳𩰳𩳓𩶜𩺁𩼞𩽦𩿟𩿹𪀔𪁈𪂚𪃋𪃫𪅤𪆕𪇠𪇼𪈦𪉉𪊧𪊧𪋠𪌴𪒖𪒖𪓤𪓤𪖜𪖢𪖢𪗹𪗹𪗺𪘵𪙓𪙓𪚝𪚝𪚸𪜽𪟯𪠀𪠝𪠞𪠢𪠦𪢳𪣐𪣽𪤏𪤜𪤶𪤽𪧸𪨋𪨙𪩮𪪕𪬉𪬷𪭴𪰛𪰦𪱁𪲙𪳌𪳯𪷥𪷲𪸘𪸷𪹂𪻗𪻧𪼑𪽘𪿚𫀴𫅌𫆖𫆢𫇁𫇺𫈩𫉲𫉵𫉷𫊵𫌊𫍊𫍜𫎱𫎲𫎳𫎴𫎵𫎶𫎷𫎸𫎹𫎺𫎻𫎽𫎾𫎿𫐩𫐫𫐳𫒁𫒂𫒔𫓯𫓯𫔽𫕶𫗼𫗼𫙣𫝟𫝷嬈嬈起𧼯𨗒𫢢𫤃𫤷𫨬𫨭𫨮𫨯𫨰𫨱𫪄𫫽𫭬𫭳𫭳𫭺𫭿𫮋𫮣𫮱𫮲𫳊𫴄𫴶𫸃𫸒𫸺𫻮𫻮𫼋𫼋𫼒𫽪𬀻𬂴𬃚𬅲𬅻𬆁𬇩𬈮𬌂𬐀𬒎𬓞𬔺𬗛𬘛𬙊𬙹𬞩𬟶𬡺𬤇𬤾𬥖𬥗𬦅𬦆𬦇𬦈𬦉𬦊𬦋𬦌𬦍𬦎𬦏𬦐𬦑𬦒𬦓𬦔𬦔𬦕𬦖𬦗𬦘𬦙𬦚𬦛𬦜𬦝𬦞𬦟𬩮𬩿𬪛𬪭𬪻𬫀𬫀𬭊𬮱𬱇𬵐𬹑",
 "冖": "亄伔停傍僀儓儚儫凕叡喗喨嗙噎嚎塓壑壡売壳婦婷媈嫇嫎嬄嬯嵉嵘嵭嵽幎廗徬恽悫惲慏慸懛懜懿挥掃揨揮搒摕撎擡晖暈暉暝曀曡棾楎楟榜榠檯檺殢殪沉泻浑渟渾湸溁溕溟滂滞滢滯潆潱濅濠濬灪煇煷熐爩牓猽珲琿璿畳疂瘒皲皸皹皼睴瞑碠磅禈箒篣籇籉緷縍翬耪腪膀艕艜菷葶葷蒙蒡蒬蓂蔕薹蝏螃螟螮蠔裈褌覫覭諢諪謗譹诨谤豷賱蹛輝辉運遰郓鄆鄍鄸鍕鎊镑霥韗顐顭餫饐騯驝髈鯞鯶鰟鳑鶤鷧鼆鼲齳㑮㑴㒗㕴㗣㘆㙪㙹㚮㛿㜼㝱㝲㟦㟰㠙㡓㥬㦅㦉㦤㨠㩝㩹㪫㫎㫶㮠㯂㱅㱕㲲㴆㵼㷌㷚㹆㿃㿶䁎䄘䄙䅭䈿䉚䊦䏃䐭䑅䒄䒌䒍䓻䖇䗖䙊䙦䜜䝍䠙䠠䡣䢆䢜䤟䥂䥾䧛䧫䨦䩵䩷䫤䮝䴑䴿𠁑𠅶𠅹𠆙𠋶𠍼𠎹𠏦𠏱𠏻𠓔𠓶𠔸𠖈𠖍𠖒𠖝𠖞𠖤𠖨𠗵𠙭𠜍𠠯𠤥𠥖𠧶𠭼𠷥𡀄𡀉𡅄𡍦𡐒𡔧𡗐𡞒𡟰𡠹𡣘𡤜𡪷𡫏𡫛𡬗𡯀𡹙𡺠𡺣𡺪𡻑𡻺𡽩𡿥𢀈𢃞𢃳𢄎𢄐𢄔𢄩𢅜𢅜𢅣𢅦𢅨𢉦𢋴𢍔𢐊𢒎𢗑𢝋𢝜𢢐𢤅𢥎𢦁𢦆𢧰𢪚𢪨𢱥𢳡𢴅𢶣𢸏𢸨𢹾𢺴𢼀𢽪𢽰𢾊𢾛𢿶𣁪𣂆𣂳𣂴𣃅𣄈𣄥𣄬𣋡𣍯𣖒𣖽𣘕𣜉𣜖𣝝𣝼𣟄𣠗𣡆𣣞𣤟𣨼𣨿𣩆𣪢𣫉𣯊𣯟𣰺𣵫𣸦𣹞𣹠𣹰𣺉𣻼𣼡𣿫𤁅𤃫𤅚𤆤𤐕𤐶𤑺𤓮𤔸𤔻𤗞𤗿𤘂𤚰𤟤𤟴𤠹𤡇𤡬𤢬𤢭𤣘𤤌𤦻𤧟𤧭𤨮𤪍𤪗𤫀𤬎𤴉𤴍𤴟𤸥𤹔𤻟𤻡𤾈𤾒𥀅𥇳𥉕𥉣𥌋𥌏𥌑𥍇𥐱𥓣𥕧𥗣𥘄𥛆𥛣𥠣𥢿𥣐𥧲𥨊𥩀𥪜𥪠𥫺𥯢𥰃𥲭𥵑𥵲𥶃𥻩𥻭𦂃𦃼𦄂𦈉𦉲𦑩𦕍𦗍𦝞𦠉𦦎𦧀𦪃𦪳𦫰𦬮𦲅𦵲𦹾𦾥𦿏𧁸𧅫𧆃𧇻𧍾𧎊𧐢𧔬𧔲𧕱𧖅𧜀𧜵𧞑𧡡𧥉𧨏𧫚𧬇𧭏𧭙𧮘𧮘𧯕𧯸𧰝𧱴𧲍𧲎𧳰𧴒𧶺𧷁𧷉𧷭𧹌𧾝𨂱𨈈𨉬𨊶𨋿𨌗𨍩𨎁𨏰𨐁𨓼𨗼𨘙𨙢𨜷𨞎𨞯𨠁𨡫𨢊𨢎𨢐𨣯𨧪𨮒𨮙𨰀𨱤𨶮𨸌𨺔𨺜𨺱𩅕𩆠𩆬𩆽𩈌𩈹𩌑𩌴𩎲𩐴𩑜𩖎𩙛𩙵𩞴𩟞𩠫𩡕𩣤𩤙𩤿𩥃𩦽𩧐𩧰𩨆𩮔𩮡𩴲𩵨𩹇𩻭𩽼𪂋𪂪𪆖𪇓𪈘𪉛𪎐𪎸𪏕𪐨𪑎𪑬𪑲𪒄𪒍𪒴𪓊𪕁𪕿𪖧𪜦𪞐𪞑𪞔𪞨𪞯𪞱𪟸𪡶𪢁𪣒𪣹𪤴𪩧𪩺𪪇𪭁𪯒𪱧𪳄𪳘𪳮𪷟𪸩𪹎𪹚𪹽𪺴𪼘𪾚𪾹𪾼𫃲𫄰𫅃𫉂𫊜𫎇𫏼𫐼𫒻𫒿𫗥𫘻𫚡𫚲𫜡𫝈𫝨𫞡売懞𫣕𫣲𫤆𫤒𫦕𫪺𫫋𫫽𫮌𫮚𫯈𫱍𫱒𫲮𫳮𫶇𫶍𫶕𫷅𫸏𫹅𫻢𫾉𬀊𬁜𬂊𬂔𬃕𬄺𬅰𬇇𬈒𬈜𬈯𬋡𬋤𬌿𬎆𬏫𬑕𬑯𬒚𬒩𬖥𬖳𬙗𬛽𬜶𬝂𬝙𬠰𬠳𬢒𬤈𬤖𬤞𬤫𬤸𬥙𬥥𬦖𬨕𬩝𬬅𬰖𬱢𬳣𬴅𬴎𬵳𬵵",
 "亻": "𠃀𠌶𡀢𡐟𡱚𡴤𡴬𡴬𡾑𢀩𢷼𣋓𣞚𤁺𤏀𤒫𤪩𤳶𤻸𥉚𦃃𦅽𦆗𦇈𦇻𦈀𦈁𦉈𦢕𧬑𧭨𧭯𨇏𨎯𨏜𨣩𨪼𨲻𨻌𩥗𩥨𩦁𩪳𩯸𩻢𩼿𪅈𪊁𪰞𪼽𫤅𬌇",
 "丂": "侤俜呺咢夸娉扝拷杇枍枵栲梬污洘涄烤疞盻窍耉肟肹芌蕚號迃釫銬铐雩飸騁骋鮳鲓鴞鸮㘼㚽㛈㞻㠋㢪㤍㬽㺮㼥㿽䀻䊸䒊䔢䚷䛒䛣䪽䲾䳙𠀒𠁔𠂞𠄯𠆵𠋹𠌶𠏬𠟲𠣤𠮱𠯋𠰗𠱼𠳯𠳯𠵗𠷓𠸮𠸮𡆽𡕵𡘆𡚯𡟂𡩭𡩱𡩸𡶹𡷬𡹱𡹻𡼑𡼙𡾀𢇡𢇱𢓳𢕊𢖊𢗃𢗴𢘢𢞛𢣉𢣧𢪆𢪶𢫚𣅘𣅙𣉃𣊅𣋓𣋮𣐰𣓚𣕆𣖼𣚧𣛖𣢍𣧁𣪆𣪔𣭖𣹯𣽺𤂥𤇤𤵕𤷷𥁄𥃖𥃳𥅎𥈕𥍠𥏦𥏴𥏼𥏾𥐃𥚓𥜞𥝜𥪁𥫡𥬋𥬤𥬯𥭢𥰴𥹬𥺒𥺭𥿐𥿣𦀔𦈣𦏡𦏻𦕎𦕞𦖔𦖬𦚊𦜮𦦫𦫐𦰝𦲰𦽺𦾀𧈃𧈯𧊌𧘎𧘚𧙲𧟯𧦢𧩊𧪱𧮹𧿝𨈲𨍘𨑛𨙱𨚤𨜆𨜝𨝁𨝞𨡖𨢰𨥿𨧈𨫴𨬱𨳣𨾢𩈎𩉞𩿸𪏱𪐭𪦘𪫭𪳋𪻖𪾥𫃈𫅀𫇯𫇷𫒑𫓫𫜜𥁄𥃳𫡞𫤝𫩟𫪆𫪕𫶱𫷘𫷟𬁥𬃤𬈍𬐈𬚵𬞲𬢦𬧒𬫙𬬨𬰗𬲧𬴗",
 "艹": "偀偌傇僷儚儰剳劐募勱匒匿厲呓哎喏喵嗏嗒嗬嗼噧噶嚄嚆囌囒墓婼媌媖媶嫫嬞嬳孏孶孽寞寬嵘嶱幕幙幪幭庿彟彠徔恾惹愥愺慌慔懂懑懜懞懱掿描搑搭搽摸摹擆擖擛擭攃敬暎暮暯曚朠朦棻楉楛楧榙榵槆模樥橗檧檬檴櫒櫗櫙櫵櫹欂欌欗氁氋淓淽渃渮渵渶溁溚滢漠漭潆潇澫濛濩濭濸瀎瀟瀳灆灡烵焫煐燤爑爤猫獏獦獲獴玂瑛瑹璓瓁瓂瘔瘩瘼癘睰瞄瞙瞸矆矇矱砹硭硴碤礍礚礞礡礣礤礴礷穁穫箬籆糚糢糵糷緓緢縙縸纄绬耯膜膵臈臒臟艧艨荆荜萅蒊蒧蒯蓦蔵藁藝藳蘖虌蜹蝧螆蟆蟇蟏蟒蠂蠆蠇蠎蠓蠖蠚蠛蠨蠴衊褡襪襽誮諾謊謨謩譪護诺谎谟貓貘贎贜蹃蹒躇躉躏躠躤躪轕轥逽遳邁鄀鄚鄸鄿醛銰鋩錨錵錺鍈鍣鍩鎝鏌鐯鐷鑉鑊鑖鑝鑮鑶钄铓锘锚锳镆镬雘霙靀鞯鞳韄韈韉韊韤韺頀顭颟餀餝饃饚饛騲驀髋髒鬕鰙鰦鱯鱴鳠鴱鶓鶜鶧鷋鸌鸏鹋鹱鹲㑤㒂㒖㒝㔈㔑㖴㘕㘷㙹㜓㜸㝱㟐㟷㟿㠓㠛㡕㡛㢍㦜㨅㨚㩚㩢㬒㬦㬸㬻㮠㯜㰛㱳㲟㲨㳸㵁㵏㵧㵩㵹㶓㷬㺃㻤㼹䁐䁳䁾䃊䄏䅒䅦䅷䅸䊔䊪䌋䌨䌩䌭䌲䍎䐠䑃䑅䒎䓥䖁䖃䖃䖃䗶䘍䙦䙩䚆䜓䜕䜦䝸䠜䡷䣐䤀䤊䤓䥈䥠䥬䦃䦫䨼䩏䩸䪇䪝䭊䭟䭦䮬䯦䰒䴌䵆𠌾𠐁𠓔𠖨𠝐𠞁𠞦𠠕𠢓𠢽𠥤𠪸𠫅𠫆𠫋𠴏𠵅𠶋𠶾𠷅𠷆𠸚𠹊𠹽𠺜𠺴𠻄𠻚𠻬𠻵𠻼𠼼𠿅𠿸𠿺𡀥𡀩𡁏𡁣𡁿𡂫𡃙𡅆𡅐𡈉𡈐𡍆𡍝𡎊𡎘𡏗𡑪𡒎𡒯𡓄𡓅𡔔𡖶𡗐𡙧𡚡𡚢𡚥𡝩𡝱𡝳𡞯𡟀𡟃𡟱𡟻𡠜𡡣𡡶𡡷𡢼𡣚𡣨𡣮𡣻𡣾𡤃𡤏𡤑𡤤𡦮𡪨𡮹𡳱𡳲𡹰𡻹𡽇𡽝𡽮𡾗𡿄𡿉𡿗𢅆𢅔𢅤𢆄𢆮𢈒𢉧𢉳𢐱𢞻𢟉𢟨𢟽𢠶𢢖𢣅𢤦𢤺𢤼𢥉𢨃𢨝𢯓𢯨𢯽𢯿𢰀𢰆𢰝𢰥𢱗𢱝𢱞𢲊𢲧𢳠𢴉𢵗𢵘𢵛𢵭𢵵𢶰𢷞𢸚𢸺𢹜𢹵𢺝𢼘𢾳𣁙𣃄𣄄𣇷𣈰𣈴𣉏𣉪𣋈𣋑𣋒𣋛𣋻𣌕𣎑𣎨𣎰𣒾𣓃𣓋𣓎𣓒𣔀𣔄𣔟𣔠𣔰𣔶𣕈𣕉𣕚𣖚𣖝𣖠𣖨𣗄𣗎𣘃𣘇𣘘𣘡𣘻𣙷𣙸𣙻𣚖𣚭𣛂𣜎𣜯𣜿𣝈𣝍𣝏𣝸𣝾𣞓𣞕𣞢𣞾𣟿𣠇𣠝𣣐𣦀𣨘𣨠𣩎𣩨𣩾𣯈𣯏𣯚𣯬𣯳𣰁𣰌𣰥𣰾𣵽𣶼𣶽𣷸𣸱𣹓𣺬𣺾𣼥𣼵𣽇𣿅𣿎𤀐𤀘𤀞𤁮𤁱𤁸𤂡𤂧𤃓𤃥𤃫𤄓𤄶𤅢𤈝𤋲𤋶𤋼𤋿𤌚𤎻𤑫𤓆𤔻𤔽𤔾𤘁𤘂𤚐𤛘𤛶𤜐𤞽𤠂𤠉𤢑𤢥𤢨𤦙𤦧𤧌𤧍𤧳𤨑𤨓𤨳𤩲𤩸𤩿𤪑𤫃𤮀𤮠𤯊𤯻𤯾𤰏𤵽𤶼𤸠𤸡𤻔𤻜𤻟𤻰𤻻𤼓𤼞𤾬𤾸𥀌𥀥𥀯𥇀𥉂𥋷𥋾𥌋𥍇𥍈𥍍𥍐𥍰𥍼𥎂𥐋𥔙𥔽𥔾𥕊𥕓𥕜𥖛𥖣𥗀𥗔𥗹𥗺𥘁𥙶𥛼𥜍𥟕𥟪𥟾𥠏𥠙𥠚𥠯𥡍𥡸𥢟𥢸𥣑𥣛𥣫𥤆𥤜𥧣𥪫𥪿𥭶𥯶𥰄𥱹𥵿𥶃𥼧𥽼𦂍𦂓𦂭𦃮𦄶𦅶𦅷𦆟𦇎𦇴𦈘𦏒𦓷𦔃𦔋𦔠𦖿𦛿𦜬𦞂𦟍𦟦𦟮𦟵𦡂𦡢𦡦𦡰𦢲𦢸𦣑𦪻𦫰𦮋𦯀𦯝𦯲𦯳𦰙𦰷𦱓𦱣𦱻𦲱𦳕𦳜𦳲𦳶𦳻𦴈𦴔𦴖𦵶𦷖𦷤𦷱𦷸𦸞𦸬𦸯𦸶𦸺𦹣𦹧𦹪𦹯𦹵𦹸𦺏𦺲𦺵𦻆𦻌𦼈𦼉𦼌𦼬𦽭𦾇𦾔𦾝𦾠𦿉𦿏𦿕𦿘𦿢𧀟𧀱𧀽𧁳𧂎𧂓𧂕𧂟𧂡𧂨𧂴𧃅𧃊𧃯𧃵𧄈𧄓𧄣𧄳𧄴𧅌𧅞𧅞𧅟𧅟𧅣𧅦𧅪𧅬𧅭𧅭𧆙𧋽𧍗𧍙𧍟𧍠𧍣𧍷𧎣𧏤𧐞𧑑𧒨𧒳𧓵𧓶𧓿𧕨𧗎𧛩𧛭𧜆𧜿𧝵𧝶𧞔𧟆𧟋𧟚𧨔𧨶𧩳𧪆𧪮𧬏𧬧𧭊𧭝𧯀𧰣𧰿𧲍𧲎𧲛𧴟𧷸𧹀𧽬𧾗𧾲𨃋𨃐𨃓𨃖𨃚𨄳𨅱𨅼𨆟𨆠𨆡𨆣𨆶𨇨𨈅𨈆𨉴𨌣𨍞𨍷𨎮𨏕𨏫𨐡𨐮𨔽𨕡𨖑𨗨𨗸𨘬𨙗𨙟𨝛𨞂𨞨𨞫𨞯𨞼𨟆𨡱𨡸𨢟𨢢𨢬𨤃𨧨𨧼𨩖𨩦𨪓𨪩𨫱𨫲𨫳𨫽𨬶𨭈𨭬𨮎𨮒𨮥𨮵𨯓𨯛𨯫𨯷𨰂𨰑𨰤𨱏𨲴𨵫𨶀𨷈𨷳𨸉𨻇𨼿𨽈𨿆𩀔𩁞𩁮𩄻𩅁𩆏𩆠𩆪𩆽𩋐𩋖𩋪𩌂𩌧𩍘𩍣𩍬𩍰𩍿𩏯𩏵𩐍𩐖𩐺𩐻𩕭𩕱𩕹𩖎𩘑𩘕𩙚𩙛𩛲𩟞𩟢𩟺𩡉𩡤𩣻𩤯𩤱𩥠𩦗𩦟𩦦𩦺𩧇𩧓𩪝𩯐𩯝𩰅𩱵𩱷𩴲𩴾𩷶𩸜𩹅𩹛𩹜𩹩𩺁𩺆𩺗𩺳𩺵𩻁𩻓𩼘𩼙𩼬𩽛𪁾𪂛𪃔𪃖𪃞𪃳𪄦𪅐𪆆𪆰𪆴𪇅𪇓𪇔𪇡𪇨𪇭𪇴𪈘𪈙𪈟𪈧𪈭𪋛𪍋𪍤𪍬𪎃𪎄𪎅𪏟𪑿𪒪𪒯𪒼𪓅𪙐𪙰𪚂𪝆𪝡𪞅𪡻𪢯𪣲𪥣𪦀𪦙𪨒𪫿𪬠𪯁𪱉𪳰𪴰𪵒𪶲𪷂𪷒𪷠𪷵𪷺𪺴𪺶𪻚𪻷𪻸𪼒𪼘𪼧𪿾𫃊𫃒𫃾𫄁𫄈𫄲𫅘𫅠𫅷𫆲𫆼𫆾𫇑𫇙𫇜𫈡𫈪𫉂𫉕𫉞𫉳𫉻𫉼𫊈𫊍𫊎𫊐𫊔𫊘𫊘𫊚𫋓𫋛𫑿𫓑𫔩𫕧𫘗𫙽𫛒𫞡𫠁𫢭𫢮𫢯𫣟𫣤𫣥𫣦𫣷𫣾𫤒𫥬𫦕𫦚𫪜𫪝𫫚𫫛𫫻𫬡𫭔𫮉𫮝𫮮𫮽𫰅𫰼𫱈𫱡𫱰𫱽𫲇𫲏𫲔𫲛𫲝𫲩𫲴𫳝𫴆𫴒𫵄𫶕𫶙𫶥𫶮𫶱𫷐𫸄𫺰𫻄𫻊𫻟𫼳𫽈𫽚𫾃𫾍𫾎𫿁𫿹𬀗𬁙𬁜𬁞𬂵𬃝𬃟𬃶𬃸𬃹𬃾𬄋𬄌𬄟𬄠𬄡𬄤𬄲𬄺𬅉𬅋𬅑𬈜𬈩𬈵𬈸𬉔𬉙𬉛𬉠𬉡𬊳𬋖𬌖𬍷𬎆𬎇𬎈𬎟𬑤𬒦𬒪𬔄𬕼𬖶𬘎𬙅𬚑𬚡𬛚𬛞𬜗𬜫𬜼𬝂𬝡𬝩𬝱𬞁𬞒𬞓𬞠𬞠𬞤𬞮𬞰𬞺𬞿𬟖𬟗𬟛𬟜𬟢𬟥𬠟𬠫𬠳𬡙𬡚𬡞𬡟𬡵𬢑𬢿𬣇𬣊𬥊𬥱𬦷𬧛𬧧𬧰𬨴𬩝𬩦𬪋𬪑𬪖𬪝𬫗𬫯𬫰𬬈𬬙𬬡𬭡𬭮𬮁𬯐𬯜𬯡𬯥𬰖𬰩𬲹𬳏𬴌𬴱𬵣𬵦𬵳𬵴𬵸𬵿𬶯𬷹𬸭𬸮𬹀𬹄𬹍𬹛𬹪𬹯",
 "⺫": "儇儚凙噮圛圜嬕嬛寰嶧彋懁懌懜擇擐斁曎檈檡歝殬澤澴燡獧環癏睾礋糫繯繹缳翾蠉蠌襗譞譯轘還鄸醳釋鐶鐸镮闤阛顭驛鬟鱞鸅鹮㘁㙹㝱䁵䁺䆁䐾䑅䕉䙦䚪䦴䭞䴉䴋𠐛𠓋𠓔𠪯𡑡𡕅𡗐𡣱𢋇𢍰𢕼𢩠𢸃𢹞𣞲𣟴𣡬𤃆𤑹𤔻𤘂𤢕𤢟𤪹𤻂𤻟𥌋𥌡𥜃𥶃𥼶𦇏𦌺𦍆𦒠𦒡𦒢𦒬𦔥𦡇𦣴𦫰𦿏𧔘𧭴𧲍𧲎𧾎𨆅𨆈𨏙𨘣𨞯𨤟𨮒𨷤𨼸𩁇𩆠𩆽𩍜𩍡𩏪𩕪𩙽𩟞𩦮𩯴𩴲𩼓𪇓𪍺𪫙𪼢𫅌𫍽𫜅𫣜𫤻𫩈𫸁𫾟𬁜𬄺𬒥𬙫𬠳𬩝𬪗𬬝𬰖𬵳𬶵",
 "夕": "佲侈侈儚刿卶卶哆哆哕啰夞够够夠夠夡夡夥夥夦夦奓奓妴姳姼姼宛怨恀恀懜扅扅拶拸拸栘栘桚桞椤洺濥爹爹猡痑痑盌眢眳眵眵移移秽翗翗翙苑茒茗茤茤蒋蕵蛥蛥螀袲袲袳袳詺誃誃趍趍跢跢迯迻迻逻郺郺鄸酩鉹鉹銘铭锣陊陊顭駌鴛鸳黟黟㑕㑩㔰㗬㗬㗮㙹㚉㚉㚊㚊㚋㚋㚌㚌㚍㚍㚚㝖㝖㝱㞔㞔㠾㡅㡅㢁㢁㢷㩼㩼㫥㶴㶴㷇㷇㼝㽜䀤䇋䇋䊅䏧䏧䑅䖤䙦䛄䡔䡔䫂䫂䬷䬷䮈䮈䳃𠀲𠀲𠊖𠊵𠊵𠌅𠌅𠐂𠐂𠓔𠕝𠕝𠗄𠗄𠙀𠛠𠛫𠛫𠛱𠝽𠡝𠡢𠣨𠣨𠨃𠨊𠫾𠫾𠰻𠱷𠴽𠴽𠸛𠸜𠽵𡁄𡇘𡇘𡋆𡌪𡌪𡍐𡍡𡎢𡎥𡎦𡒒𡒕𡖎𡖎𡖏𡖐𡖐𡖑𡖑𡖒𡖒𡖓𡖓𡖔𡖔𡖙𡖙𡖚𡖜𡖜𡖝𡖝𡖞𡖞𡖟𡖟𡖠𡖠𡖢𡖢𡖣𡖣𡖤𡖤𡖦𡖧𡖧𡖨𡖨𡖩𡖩𡖪𡖪𡖫𡖫𡖬𡖬𡖭𡖭𡖮𡖮𡖯𡖯𡖰𡖰𡖲𡖲𡖳𡖳𡖹𡖹𡖺𡖻𡖻𡖼𡖼𡖽𡖽𡖾𡖾𡖿𡖿𡗀𡗀𡗁𡗁𡗄𡗄𡗆𡗆𡗈𡗈𡗉𡗉𡗊𡗊𡗋𡗋𡗌𡗌𡗍𡗍𡗎𡗎𡗏𡗏𡗐𡗑𡗑𡥥𡥥𡦄𡦄𡨆𡨆𡶟𡷂𢏜𢏜𢙛𢪸𢫑𢻇𢻈𢻈𣃽𣃽𣆌𣆚𣆚𣋿𣋿𣜞𣡳𣡳𣪈𣪈𣪰𣭧𣭧𣭨𣴙𣴙𣶘𣶘𤈕𤈕𤉥𤉥𤔻𤖻𤖻𤘂𤝻𤝻𤤫𤥀𤥀𤥁𤨰𤳭𤻟𤿦𤿦𥌋𥏍𥒊𥒥𥒥𥔇𥟿𥟿𥠨𥠨𥭋𥭋𥰷𥶂𥶂𥶃𥹠𥹠𥼫𥼫𥿎𥿨𥿫𥿫𦊗𦋲𦋲𦍹𦍹𦕕𦖹𦗎𦙵𦦩𦨨𦫰𦰵𦰵𦲎𦴌𦴌𦵎𦿏𧃪𧃪𧐫𧓒𧦨𧧁𧯡𧯨𧯨𧲍𧲎𧳁𧳁𧵍𧵏𧻌𧻏𧻬𧻬𨇵𨇵𨎱𨎱𨐔𨐔𨑊𨑊𨘂𨘂𨘮𨘮𨚷𨛅𨛅𨜽𨜽𨞆𨞯𨧍𨪿𨮒𨳿𨴢𨴢𨿅𩆠𩆽𩊁𩊃𩊥𩊥𩎝𩐞𩐞𩓴𩖿𩗈𩗈𩚴𩟞𩳊𩴲𩶰𩶰𩺜𩽿𩽿𪀈𪀓𪀓𪀩𪀩𪇓𪌫𪌫𪎛𪎠𪎠𪐀𪐀𪒨𪒨𪗸𪞏𪟚𪠞𪠞𪤸𪤺𪤺𪤻𪤻𪤽𪤽𪤿𪤿𪥀𪥀𪵃𪶒𪸅𪸟𫊰𫍠𫏉𫏑𫒓𫖰𫖰𫗩𫚹𫥖𫦋𫦗𫦗𫩨𫭽𫮋𫯍𫯍𫯏𫯐𫯐𫯒𫯒𫯓𫯓𫯔𫯔𫯕𫯖𫯖𫯗𫯗𫯘𫯘𫯙𫯙𫯚𫯚𫯥𫸘𫽋𫽣𬁜𬂂𬄺𬆯𬆯𬉝𬊜𬋘𬌒𬒓𬒼𬒼𬓩𬔷𬔽𬜨𬠳𬡠𬣪𬣮𬧀𬩍𬩍𬩝𬩟𬮡𬰖𬰡𬱃𬱺𬳾𬳾𬵳",
 "⺊": "乩佔侦倬偵卤叡呫啅壑壡奌婥媜寊岾帖幀店怗悼战扂拈掉揁敁晫枮栌桢梷棹楨槕毡沾泸浈淖湞濬炶点焯煔玷琸璿痁砧碵祯禎秥窧站竨笘粘綽緽繛绰罩胋胪舻苫蒧蛅袩覘觇詀貼贴赪赬趈趠跕踔轳迠逌逴遉酟鉆鋽鍞钻阽頕颅颭飐鮎鲇鲈鵫鸬黇黏點㓠㚲㣌㤐㦸㪕㪫㮚㷹㸃㹿䀡䂽䈇䍄䑲䓬䚃䜜䡠䦓䩇䩞䪓䬯䮓䴴䵿𠃵𠏻𠕟𠚝𠚱𠛤𠣳𠦲𠦷𠧄𠧇𠧠𠧴𠨋𠨋𠨋𠭹𠸩𡌐𡍎𡎞𡖞𡖡𡙉𡚄𡯴𡱇𡵊𡵋𢈞𢒛𢒟𢒦𢓕𢔄𢔤𢛂𢢙𢧗𢮸𢾃𢿶𣂣𣆐𣓨𣖴𣗴𣡷𣡷𣡼𣡼𣡼𣢤𣣧𣣸𣤦𣦓𣦖𣪙𣫜𣰮𣸎𣻶𣿚𣿤𣿤𤈴𤋒𤋺𤎆𤑰𤘇𤙴𤚷𤝓𤦹𤨗𤩤𤩰𤪎𤫀𤲤𤷘𤸘𤿝𥃐𥇍𥇞𥌑𥎁𥏥𥕫𥛡𥢅𥢆𥢔𥭔𥴄𥵙𥻆𥽽𥾄𥾄𥾄𥿕𦅕𦋇𦋐𦋚𦒻𦒾𦕒𦖥𦜰𦠰𦳋𦵄𦵵𦷙𦹫𦺩𦻐𦿥𧌸𧑻𧟻𧡹𧨳𧨼𧮪𧯕𧲸𧳝𧶃𧶸𧷁𧾝𨉔𨋤𨌬𨔟𨖯𨗰𨙃𨛕𨛹𨜓𨱬𨺑𨺟𨿧𩄷𩌓𩘀𩙩𩢬𩬑𩭟𩲦𩳨𩷹𩹰𪀄𪂱𪉜𪍈𪍕𪎋𪑳𪕐𪖚𪗚𪗦𪙚𪞲𪟂𪟷𪟿𪠀𪪏𪫢𪯴𪳣𪺘𪽮𪾏𪾦𪿒𫀅𫀑𫁅𫂜𫆶𫊮𫖙𫖣𫙔𫚳𫛱𫥄𫥸𫦛𫧴𫧸𫨫𫫽𫵑𫸍𫺤𫺱𫼜𫽤𬀭𬅽𬊐𬏝𬓲𬙎𬜅𬡥𬢵𬩷𬬻𬰳𬱗𬲫𬸵𬹕",
 "囗": "乩佔佪個凅卤呫咽啚啯嘓夁奌姻婟岾崓崮巤帖帼幗店廻徊怗恛恩悃慁慖战扂拈捆掴摑攌敁枮栶梱梷棝棞椢槶檲欭毡氤沾泅洄洇涃涠涸溷漍潿炶点烟焑煔爴玷珚痁痐痼睏砧硘硱碅祵祻秥秵稇稒稛穯站笘筃箇箘簂粘糰絗絪綑胋胭腘膕苫苬茴茵菌蒧蔨蔮薗蛅蛔蜠蝈蟈袩裀裍覘觇詀貼贴趈跕迠迴酟鉆銦錮钻铟锢閫阃阽靣鞇頕颭飐駰骃鮂鮎鮰鯝鲇鲴麕黇黏點齫㐭㒁㓠㔽㖥㘻㚲㣌㤐㥵㧢㧽㨡㩛㬷㮚㮭㮯㸃㸶㻁㻒䀡䂩䄄䍄䍛䐃䓢䓿䙟䛛䠅䤧䥁䦓䨓䩇䩞䪓䬯䭅䴴䵿𠀯𠄿𠆎𠉁𠉍𠉢𠋼𠌛𠏹𠕟𠗃𠚝𠚝𠛤𠛭𠜟𠜠𠡛𠢷𠤪𠧚𠧴𠧵𠨋𠨋𠨋𠲛𠳁𠴱𠹫𠻮𠾂𡁴𡄅𡇤𡈅𡈇𡈤𡈯𡈲𡈲𡈲𡈶𡈶𡈶𡈶𡈺𡋘𡋙𡌐𡌓𡑰𡒀𡒅𡖞𡖡𡙉𡜭𡣰𡦬𡱇𡳚𡸙𡹍𡹤𡹯𡻢𡼱𡿸𢃠𢅶𢆀𢈛𢊂𢊉𢊬𢋕𢋢𢋾𢌓𢐚𢒤𢒦𢓕𢓨𢘄𢙍𢙫𢛅𢛕𢛾𢜹𢞮𢠝𢢙𢧗𢧷𢬼𢮖𢮸𢾃𣂽𣃴𣃷𣎏𣎫𣐮𣑩𣓨𣖴𣗴𣙊𣙢𣞱𣞸𣠐𣠔𣡷𣡷𣡺𣡼𣡼𣡼𣢤𣣧𣣸𣣻𣧝𣨨𣬁𣭃𣰮𣱣𣳲𣹢𣻲𣻶𣿚𣿠𣿤𣿤𣿹𤂟𤅻𤋒𤌐𤎆𤎍𤑰𤔩𤖠𤘇𤝓𤝱𤞑𤞧𤠪𤡓𤥪𤥳𤩰𤪎𤮋𤮔𤯠𤴐𤴐𤶑𤹁𤹄𤺡𤿝𥀑𥀖𥁕𥃐𥇘𥇞𥊞𥎁𥕏𥛡𥜘𥜫𥢖𥣱𥭒𥭔𥱽𥲞𥳙𥴞𥻆𥽽𥾄𥾄𥾄𥿕𦂆𦄰𦉩𦒻𦒾𦓾𦕒𦞢𦯁𦱟𦳩𦵣𦵵𦷙𦸜𦽖𦾰𦿥𧁝𧃭𧄋𧇴𧊭𧋕𧍚𧒪𧓘𧙪𧛂𧛃𧜄𧝕𧝖𧠲𧡹𧨼𧮪𧰒𧲸𧶞𧶮𧹢𧻢𧼐𨁉𨉹𨋳𨍲𨎏𨏸𨒊𨔟𨕔𨗞𨘵𨛹𨞴𨡞𨡤𨥱𨫵𨬧𨭦𨮢𨯬𨱬𨷣𩁩𩂥𩄷𩆻𩇊𩇑𩇓𩇓𩌓𩎏𩎪𩏉𩒱𩓽𩞒𩠲𩢱𩤁𩧽𩫃𩫖𩫗𩬑𩭋𩲦𩳨𩶾𩺠𩼀𩼯𪀄𪀟𪅦𪉜𪊦𪊽𪌦𪍁𪎋𪔗𪕐𪖚𪗦𪘩𪘭𪛇𪜶𪝩𪞲𪟂𪡐𪡖𪢰𪤑𪧏𪬱𪯴𪲗𪵻𪶑𪸜𪸰𪺺𪼓𪼫𫀅𫂆𫂌𫂛𫂾𫆣𫈁𫏜𫏦𫑵𫚔𫚳𫛐𫝻𫞞𫟜𫟝圖𫢤𫢽𫥄𫥸𫦛𫧴𫭐𫭔𫭕𫮶𫯴𫰯𫱣𫱾𫻒𫼜𬆐𬇹𬈨𬊟𬑋𬕶𬖢𬘇𬘡𬜁𬜅𬜿𬝟𬠄𬣍𬣫𬣬𬧩𬩌𬩷𬪹𬫹𬬎𬰦𬰳𬱈𬱗𬱩𬲫𬲾𬵎𬸵𬺊",
 "⺩": "琴琵琶琹瑟碧錱𠗰𠫁𠶃𠺾𠻐𠻷𠿩𡈵𡠝𡩮𡻶𢐭𢜈𢟐𢢭𣌇𣎔𣠦𣹗𣽗𤓇𤦖𤦗𤦠𤦦𤧂𤧆𤧥𤧰𤧲𤨘𤨝𤩘𤩙𤩟𥜡𥵇𦲖𦴿𦹙𦼓𦾂𧂖𧓮𧟺𨖢𨨖𨪥𨫣𪝰𪯥𪶝𪹔𪻰𪻴𪼂𪼈𪼉𫂒𫈑𫉋𫗆𫚅𫩆𫫩𫳚𫳰𫳽𫸔𫺠𫺡𬁂𬈲𬍾𬕎𬝽𬰋",
 "王": "住侱俇偟凰劻匩哐哢喤妵媓宔崲往徎徨恇悜惶戜拄挰挵揘撋柱框桯梇楻橍殶注洭浧润湟潤炷煌珵琴琵琶琹瑝瑟疰癍癍皝皩眶睈瞤砫硦程筐筭篁紸罜脭膶艎葟蛀蝗裎註誆誑諻诓诳跓軭軴迬逛逞遑邼郢酲鉒鋥錱鍠锃锽隍鞓韹飳餭駐騜驻鰉鳇鵟麈黈㑌㑝㛞㟖㠈㢅㤮㳥㳹㹥㾠㾮㿀㿀䄇䄓䅣䇠䇸䊗䑟䒰䔊䖱䝬䞹䦞䪒䬖䳨𠑋𠞢𠞢𠣕𠩈𠩥𠫁𠰍𠴔𠴝𠴦𠶖𠸙𠺚𠺚𠾽𡈁𡊲𡋱𡙃𡙙𡝚𡝝𡫶𡯭𡯲𡱯𡳊𡷟𢃈𢌊𢌌𢌥𢐭𢓯𢔎𢕁𢙱𢚯𢚸𢜈𢡞𢧄𢧜𢨅𢨸𢬤𢲔𢲔𢴬𢴬𢹻𢻡𢼳𣃱𣈷𣋆𣌇𣒈𣒳𣗝𣗝𣠦𣭿𣴥𣵱𣶪𣷪𣹛𣼰𤑈𤔕𤖸𤚝𤝿𤞬𤟡𤠪𤡰𤡰𤤛𤥷𤦖𤦗𤦠𤧂𤧆𤧰𤧲𤨝𤩘𤩙𤩟𤪉𤯨𤯩𤲌𤶦𤶲𤶶𤷀𤽞𤾭𤾲𤾳𤾺𤿬𤿰𥅖𥆚𥘭𥠟𥦌𥧪𥨋𥩣𥰈𥲠𥺆𦁽𦊝𦊺𦑠𦒼𦗊𦙴𦚞𦨁𦨄𦭦𦶾𦶾𦸴𦹒𦹙𦹠𧂖𧉶𧋵𧋸𧋼𧏃𧏼𧚂𧚠𧡗𧫢𧭅𧶔𧹓𧻄𧻔𧻺𧽮𨀕𨁎𨁦𨁨𨈫𨉤𨌃𨍧𨓡𨓹𨖢𨛓𨜔𨝇𨦑𨨖𨫄𨫄𨫓𨬔𨭯𨮯𨲀𨲢𨲣𨳳𨴑𨶽𨷎𨾨𨿗𩂽𩒊𩒑𩔇𩔮𩔮𩢼𩥳𩧀𩨻𩩖𩬹𩶃𩷗𩷣𩷬𩺡𩺡𩿢𪁘𪄕𪄕𪅔𪉒𪉒𪌘𪏓𪏜𪐴𪓪𪔠𪚤𪚹𪜋𪟤𪟫𪥎𪨚𪩅𪪩𪪱𪫬𪫵𪯥𪯵𪱟𪱟𪱦𪱮𪱯𪻠𪻴𪼈𪼉𪼙𪾂𫁔𫄺𫆅𫇕𫈃𫋯𫗆𫗮𫘩𫛭𫠯𫢃𫤟𫥌𫪇𫪹𫫨𫫨𫳽𫴢𫴳𫸷𫼠𫼺𫿃𬂀𬂇𬂇𬂙𬃯𬊊𬊒𬏇𬏖𬐋𬐍𬐑𬖆𬖉𬗬𬚶𬚼𬟎𬣣𬤍𬪶𬮣𬳻𬴑𬴦𬷱𬷱𬸛",
 "又": "仮伇伎伖伮俶傁冣努叆叐叛吱吺呶嗖埾堅壑壡妓娵娶婌婜嫂孇孥孯寂屐岅岐帑庋废廄廋廏弢弩彏役忮怒怓怪悭惄愯戄扠扳技投抜拏拨掓掔掫掻搜攫攰攱攲攳昄最杈杸板枝柽棷棸椒樷欆欔歧殁殴殶殸殹殺殻殽殾殿毀毁毂毃毄毆毇汊汥汳没泼淑溲炈炍焣爰版獀玃琡瓪畈疫瘦癹皈眅督瞍矡砓砮硻祋秓竐竪笯箃箨篗籰粄紁経緅緊翄翅聚肞股肢胬膄舨般艘艭芆芟芰苃菆菣菽萚蒦蓃薓蚑蚤蛏蜸螋蠼衩衼袯裻訍設詉詜諏諔謏謢设诹豉豎豛貜販賢贩趣跂踙踧躞躩軗軽輙返遚郰鄋酘酦醙釵鈑鈘鈠鋷鋻錖鎪钁钗钣铿锼阪陬靫頍頚颼飕飯餿馶駑騒騪驽骰髪鬾魬鯫鲣鲰鳷鴑黀鼓齱㐐㑓㖩㝡㟬㣾㤆㥰㦪㨌㨦㩳㩻㩼㩽㩾㪢㫞㭴㮴㰔㱼㱽㱾㱿㲀㲁㲂㲃㲄㲅㲊㲍㲣㳗㵻㷂㷅㸕㹂㹩㻓㽊㽹㽻㾥䀑䁂䁊䂄䂘䃽䅩䇈䉶䋈䌓䏂䑡䑹䑾䗏䚳䛀䝂䝄䝘䞚䟕䟝䡊䡋䢲䣤䣫䤇䤹䥽䦆䧴䨇䨇䨥䩔䩳䬒䬦䮟䯴䰙䱙䱸䵖𠇞𠉧𠋢𠌞𠍇𠍦𠑄𠑩𠔟𠙢𠚹𠚽𠝊𠝬𠠋𠡍𠤪𠥝𠨹𠨻𠩹𠪇𠪓𠪘𠭅𠭔𠭤𠭦𠭶𠮂𠮊𠮋𠮍𠯘𠱅𠴪𠴫𠵳𠶳𠷃𠹢𠻕𡃫𡄕𡇀𡊃𡋹𡌪𡑚𡑧𡒼𡓙𡓝𡙜𡚠𡚾𡛀𡣞𡤬𡧔𡯘𡰫𡰸𡱾𡲆𡵢𡸘𡸨𡹧𡹩𡾼𡿚𢀁𢃝𢃣𢃥𢃻𢅻𢆕𢇪𢇬𢈧𢈾𢉌𢉎𢉏𢊄𢋒𢎼𢏫𢑿𢓉𢔕𢔠𢔾𢖦𢗎𢛏𢛼𢜄𢞸𢟥𢢢𢥀𢥠𢪩𢫓𢫞𢮝𢮽𢱻𢲈𢲻𢳻𢷗𢹒𢹸𢺵𢺶𢺷𢺸𢺸𢺹𢺺𢺻𢺼𢺽𢺾𢺿𢻂𢻃𢻄𢻅𢻆𢻇𢻈𢻉𢻊𢻋𢻌𢻍𢻏𢻒𢻓𢻔𢻕𢻖𢻗𢻘𢻙𢻚𢻛𢻜𢻞𢻟𢻠𢻡𢻣𢻤𢻥𢻦𢻧𢻨𢻩𢻪𣄥𣈉𣉲𣌏𣌗𣍇𣐪𣕪𣖌𣖫𣚯𣜒𣝝𣡀𣦪𣦪𣦪𣦪𣦲𣦳𣪂𣪃𣪄𣪅𣪆𣪇𣪈𣪉𣪋𣪌𣪍𣪎𣪏𣪐𣪑𣪒𣪔𣪕𣪖𣪗𣪘𣪙𣪛𣪜𣪝𣪞𣪡𣪢𣪣𣪦𣪧𣪨𣪩𣪪𣪫𣪬𣪭𣪮𣪯𣪰𣪱𣪲𣪴𣪵𣪶𣪷𣪸𣪻𣪼𣪽𣪾𣪿𣫀𣫁𣫃𣫄𣫅𣫆𣫇𣫈𣫋𣫍𣫏𣫐𣫑𣫖𣫗𣫚𣫛𣫟𣫠𣫡𣫢𣫩𣬆𣭄𣯕𣯜𣲰𣴂𣷗𣷷𣸎𣹬𣺲𣾮𤇂𤊰𤊳𤏱𤏿𤐘𤐰𤔀𤔛𤔣𤕖𤖬𤚉𤚲𤚼𤛖𤜫𤝈𤟏𤡘𤤄𤦁𤦟𤧧𤩮𤩯𤫉𤬂𤭠𤭡𤯙𤲗𤷌𤹆𤹹𤺶𤼺𤽑𤿳𥁈𥁊𥁽𥄏𥅄𥈍𥈫𥊁𥌍𥍆𥍜𥍟𥎮𥑂𥑋𥑌𥓍𥔉𥔺𥕋𥖗𥘓𥚔𥛭𥜵𥝻𥟛𥟧𥤘𥤙𥥜𥦞𥦡𥧖𥧽𥨃𥨓𥨦𥪏𥫢𥭸𥰞𥰺𥲏𥳨𥵠𥸂𥸃𥸇𥸌𥸌𥸘𥸳𥺤𥺱𥺵𥻬𥽦𥽿𥾣𥾩𥾵𥿈𦃈𦇍𦋲𦌖𦐓𦒇𦒫𦔹𦖥𦙀𦙾𦜌𦜚𦜚𦜚𦜜𦝒𦟓𦣉𦣒𦣴𦤂𦤇𦥀𦦹𦧉𦨟𦫇𦫘𦭞𦲔𦲔𦲗𦳋𦴎𦴯𦷊𦸤𦼽𦽛𦾫𧃀𧃭𧄋𧄐𧄘𧄢𧄬𧅚𧇜𧇝𧈌𧈻𧉭𧌗𧎅𧏌𧏚𧕊𧕟𧘣𧘽𧙔𧚥𧜮𧞀𧞒𧞤𧞹𧞺𧡕𧢭𧤧𧩞𧫫𧮁𧮞𧯸𧰤𧰤𧰵𧱛𧲵𧳶𧶶𧷙𧷥𧷱𧹛𧺢𧻝𧼒𧽏𧾝𧾩𧾵𧿨𨀃𨄒𨇯𨈍𨈛𨋻𨍺𨏹𨐅𨐉𨑤𨓭𨕮𨕵𨕶𨖏𨗋𨗫𨙀𨙳𨙸𨙾𨛿𨝢𨢋𨤺𨥬𨦐𨧷𨧾𨧾𨨘𨩂𨩵𨩷𨯳𨰚𨰢𨱁𨱚𨱜𨱹𨳟𨳧𨶞𨸜𨸠𨺏𨾯𩀝𩀠𩂏𩆀𩆿𩇈𩇈𩇥𩉨𩋄𩋆𩋛𩌅𩌊𩌥𩎂𩎃𩏺𩏻𩐾𩓠𩓸𩔩𩙜𩙥𩚿𩛂𩜬𩝘𩢃𩢃𩢚𩧁𩧡𩧯𩨄𩨅𩨩𩪔𩯍𩰇𩳇𩵈𩵤𩵼𩵾𩶜𩹔𩹹𩽕𩽧𩾈𩿔𪂸𪃟𪆑𪇂𪈴𪉘𪋄𪌆𪌓𪏙𪏷𪐮𪒊𪓏𪕂𪕸𪕽𪖧𪗭𪗵𪘦𪘸𪚆𪛒𪝃𪝫𪞔𪠀𪠪𪠪𪠫𪠭𪠱𪣶𪣸𪣽𪥯𪦄𪦠𪦶𪩝𪪖𪪿𪫄𪬌𪬡𪬼𪯅𪯆𪯇𪯩𪯰𪯽𪰯𪱓𪵁𪵈𪵉𪵋𪵌𪵍𪵎𪵏𪵐𪵒𪵓𪷞𪸂𪸲𪹂𪹉𪺐𪺹𪼌𫃂𫃬𫅴𫉨𫉬𫉶𫊆𫋒𫋟𫌆𫍲𫎤𫏆𫐁𫑆𫑆𫒄𫒔𫔽𫗑𫘅𫘈𫙞𫙨𫛛𫝷𣾎䵖𫢲𫢿𫣋𫣮𫤆𫤑𫧞𫨈𫨒𫩄𫩉𫩍𫩗𫪄𫫊𫫽𫬻𫭨𫮣𫰚𫱩𫳮𫴢𫶄𫷕𫷗𫷰𫹀𫹍𫼑𫼦𫽍𫽑𫽕𫽝𫾣𫾤𫾥𬁡𬄱𬄿𬅆𬆎𬆞𬆟𬆠𬆡𬆢𬆣𬆤𬆥𬆦𬆧𬆨𬆩𬆪𬆬𬆭𬆮𬆯𬆰𬆱𬆲𬆳𬆴𬆷𬈋𬊷𬋁𬋥𬏦𬑝𬑠𬒎𬓏𬔹𬖗𬖫𬖳𬗻𬗿𬜁𬜧𬜾𬝔𬟸𬠛𬠪𬣛𬣥𬥁𬨅𬩁𬫆𬫋𬬜𬯓𬯰𬯹𬱕𬱧𬲵𬷀𬷩𬺀",
 "𠂆": "仮傂卮叛后嗁岅巵扳搋昄板榹歋汳炍版瓪畈皈眅磃禠篪粄舨螔褫謕販贩踬蹏返遞鈑钣锧阪飯魬鷈鷉鼶㔸㛂㡗㤆㥴㴲㽹㾷䖙䚦䛀䞾䡊䫢䶵𠃃𠃘𠈁𠈊𠨗𠨹𠭔𠭤𠯘𡊃𡏚𡛣𡭍𡯘𢀁𢃻𢆕𢇪𢊀𢐋𢓉𣬆𥈍𥎮𥾩𥾵𦓚𦙀𦤇𧏁𧧊𧶶𧿨𨩵𨪉𨻆𩀗𩋛𩝘𩤽𩨩𩿔𪌆𪕻𪠫𪠭𫟬𫩍𫪪𫷰𬃊𬝔𬟸𬫋",
 "尸": "伲倔倨偋偓僝刷剧剭呢啒啹喔嘱妮娓婮媉屔屗屘崌崛崫幄幈廜怩抳抿捤据掘握搱摒旎昵柅栌梶椐楃榍樼殿泥泦泸浘涺淈渥潳潺煀狔琚痆眤瞩碿秜稺窟竮箳箼糏胒胪脲腒腛舻艉艍苨荱蚭蜛裾誳謘趘跜踞轏轳迡遅遟鈮鋸铌锯镼颅馜驏骣髛鲈鳚鶋鶌鷵鸬齷龌㔉㕞㘲㞙㞾㡪㣯㨝㭾㳮㴮㶜㶜㻕㻵䅏䅕䇻䊊䋧䌂䐅䐖䓛䘦䘿䛏䛯䜸䝚䝻䞔䞷䠇䠎䠧䣝䬿䯌䱟䲿䵕𠃮𠅡𠅡𠉜𠉞𠋱𠎪𠔴𠘈𠜾𠝭𠞂𠟉𠠮𠡨𠡰𠧮𠪡𠳿𠵳𡀿𡁂𡃆𡊴𡍄𡎔𡎮𡎰𡎿𡒸𡓋𡟛𡟩𡟭𡥸𡦥𡨢𡱬𡱵𡲈𡲉𡲊𡲋𡲤𡲥𡲧𡲨𡲪𡲫𡲭𡲸𡲼𡳀𡳁𡳃𡳊𡳎𡳒𡳔𡳗𡳛𡳜𡳝𡳧𡳩𡳪𡳭𡳰𡳱𡳲𡳳𡳵𡳶𡳹𡳺𡳽𡶋𡷕𡷱𡷷𡾓𢏷𢓚𢔧𢕌𢖓𢘒𢞜𢢁𢭶𢵔𢺟𢼞𢽙𢽜𢽷𢾂𣃁𣆐𣍁𣐉𣐊𣖕𣖗𣙝𣙰𣚚𣛢𣞴𣡃𣢞𣣣𣤅𣨢𣭙𣭼𣮈𣰢𣳣𣸹𣹲𣻨𣼉𣼨𣽶𤀛𤈦𤉂𤉸𤋊𤌆𤌨𤙌𤟎𤤗𤧁𤧅𤭸𤮒𤳰𤸮𤺈𤽶𥇣𥏘𥒮𥔔𥖑𥚑𥜀𥟽𥢨𥣦𥥕𥧊𥧋𥩥𥪊𥬩𥮝𥮱𥰦𥶰𥹆𥹹𥺷𥻐𥿡𦀿𦁐𦂋𦂤𦃘𦅴𦆣𦉇𦑫𦘧𦙷𦜇𦝷𦞚𦟓𦠳𦢡𦢢𦤽𦧃𦱅𦴓𦴪𦵱𦼘𧀓𧋦𧌑𧎜𧎨𧖛𧚟𧛐𧛺𧜔𧩱𧩴𧬅𧭋𧱎𧱧𧹕𧼲𧿻𨁱𨂲𨄋𨊖𨋗𨋤𨍍𨐛𨓪𨔧𨘘𨛮𨜘𨤔𨧱𨫒𨬖𨱊𨱐𨵠𨵡𨵱𨶽𨸰𨼑𩄌𩉹𩋎𩋜𩓦𩖹𩗘𩠭𩢬𩣹𩤅𩤓𩬜𩭪𩷳𩻣𪃮𪅱𪍛𪏸𪑐𪑣𪑩𪑰𪑱𪘣𪘳𪙆𪙇𪙌𪙑𪠝𪡨𪥕𪨕𪨖𪨙𪨚𪨛𪨝𪨞𪨟𪨠𪩖𪪏𪮪𪮴𪳬𪴕𪴫𪵓𪹳𪽛𪽮𪾦𪾴𪿗𪿩𫁦𫄄𫄎𫆜𫇂𫊮𫍏𫍮𫒃𫒷𫔏𫕏𫘴𫙔𫙖𫛵𫢩𫥫𫥯𫫵𫯨𫰵𫱬𫵞𫵡𫵢𫵣𫵥𫵦𫵨𫵫𫵭𫶈𫶉𫶤𫶤𫶤𫷍𫸛𫸡𫺬𫽤𫿗𬀭𬄫𬈓𬉆𬊐𬐖𬓹𬖪𬘽𬙎𬤜𬨅𬨊𬨬𬪛𬪱𬬻𬳲𬸟𬸼𬺑",
 "巾": "佈僀冪刷咂咘婂婦屌嵽希師幚幫廗怖慸抪掃摕柨柿棉殢沞淿滞滯濅濗砸箍箒綿緜绵羃艊艜菷萜蔕螮衞讏蹛迊遰鈰鈽鉔銱錦钸铈铞锦閙闹韴鬧魳鯞鳾㑴㕞㗣㘵㚴㛿㝲㥈㦅㧜㫶㯂㱕㳍㴆㷌㺰㿃䃇䐭䒥䗖䘙䙊䛲䞙䠠䢜𠁑𠇆𠇰𠇽𠈡𠈩𠊃𠓶𠛻𠜏𠜔𠥖𠯗𠰼𠲢𠴴𠶇𠶴𠸔𡇊𡊔𡞒𡞭𡠹𡪷𡫏𡲫𡲻𡶺𡹙𡻺𢁻𢂋𢂜𢂞𢂤𢃊𢃋𢃌𢃞𢃳𢃺𢄇𢄔𢄗𢄩𢄾𢅁𢅄𢅈𢅈𢅈𢅜𢅜𢅞𢅢𢅦𢅨𢆅𢇴𢋴𢒌𢘥𢙜𢢐𢣬𢤅𢤖𢬚𢬢𢭍𢱥𢸌𢹾𢼞𢽪𢽰𣃫𣄐𣈪𣍑𣐝𣑐𣑙𣑲𣔩𣕸𣖽𣘕𣙐𣙖𣞮𣠗𣧦𣨼𣳽𣹰𣼡𤆱𤎥𤔟𤙅𤜳𤟓𤠹𤤰𤦝𤨮𤬎𤴟𤵗𤾾𥇳𥌣𥑢𥓟𥕧𥙅𥙙𥛆𥛣𥞎𥞑𥞡𥧲𥨊𥮃𥰐𥲭𥵵𥶋𦄂𦚗𦛉𦧠𦭧𦰬𦲅𦴫𦵲𦻋𦻾𦿝𧂥𧂥𧉩𧍓𧔸𧙛𧙱𧚓𧜵𧦞𧫚𨀒𨀽𨂶𨄪𨋞𨓼𨔄𨕑𨗼𨘮𨥚𨦨𨧪𨳪𨵾𨸲𨸴𨺔𨺜𩃥𩅕𩇱𩉰𩌴𩡸𩤿𩦴𩫚𩫿𩶉𩸊𩿐𪁼𪂋𪂪𪍫𪎐𪏑𪑷𪜛𪝩𪤐𪥐𪥳𪨞𪩵𪩺𪪌𪲬𪸧𪻟𪾚𪾹𫁹𫁼𫂸𫃲𫎕𫒁𫒿𫓬𫖍𫚡𫜘𫟘𫟙𫥀𫥞𫩁𫪺𫲌𫶇𫷇𫷍𫹅𫹇𫺟𫿹𬀂𬅹𬑚𬒭𬕟𬕣𬖥𬗏𬗧𬘣𬚮𬚴𬛂𬠄𬠒𬡋𬤈𬤸𬥝𬩌𬬢𬯻𬰪𬰭𬲌𬵎𬵧",
 "卄": "扁暁欳焼㕟𠀷𠂥𠊇𠋁𠋅𠌈𠎚𠎤𠔕𠜐𠞋𠞫𠟔𠣠𡘦𡭒𡲜𢘁𢡛𢼾𢽋𣗨𣼕𤐯𤳿𥌉𥲖𥿑𦒈𦿈𧄪𧭆𨅳𨇕𨐲𨓘𨛖𨜥𩆚𩔒𪟣𪥜𫓂瀹𫪡𫴴𫿯",
 "䒑": "偂僐僕剪嗞噗媊嫸孳嵫嶪嶫幞慈掽揃撲擈敾普曗朔椪椾樸橏檏欮歚湔湴滋潂澲煎獛瑐璞甆瞨碰磁磰礏禌稵穙箭糋糍縦繕缮翦膳葥蟮襆諩贌踫蹼轐逆鄯鄴醭鎆鎡鏷鐥镃镤饍騚驜鬋鱔鳝鶿鷀鸈鹚㒒㖾㗼㡐㡤㡿㪨㮍㱉㲫㴊㵛㷙㷽㸁㸣㹒㽧䈘䌜䑑䗒䗱䦅䧤䧨䪁䰃䴆𠁔𠁜𠁝𠁟𠞽𠟤𠠩𠩋𠱘𠵔𠷁𠾌𡄰𡅐𡌶𡍽𡏆𡑇𡑿𡖼𡙛𡞰𡡐𡢫𡴘𢃬𢖃𢛰𢢆𢢜𢯪𢰩𢵈𢶨𣊪𣔳𣕜𣜑𣤞𣩧𣩫𣪻𣮧𣶮𣹅𣾴𤀟𤂇𤂛𤎬𤗙𤗵𤣋𤧹𤩶𤯭𤲸𤸜𤺪𤽽𤾣𤾧𥊳𥋙𥐁𥑺𥖃𥚘𥣈𥴼𥼜𥿬𦂒𦄾𦆫𦑦𦒂𦒟𦔒𦖺𦗢𦝤𦠍𦡧𦥭𦥾𦫄𦿶𧀸𧛏𧛯𧡟𧩯𧪈𧬆𧬬𧱷𧴌𧸢𧼞𧼳𨂝𨂞𨂫𨏨𨗚𨗩𨟘𨣁𨭥𩋳𩑀𩑃𩒕𩕊𩕟𩝐𩤀𩦐𩨊𩬸𩯏𩹁𩻙𩼋𩼑𪀝𪋡𪋫𪍶𪒢𪒲𪖈𪖊𪜏𪟄𪠖𪢭𪥗𪱋𪴨𪴨𪻁𫅜𫅞𫅡𫅦𫆨𫐗𫚤𫞋螆𫡀𫡁𫡂𫦖𫨱𫨱𫯷𫰃𫺪𫼆𬎫𬗭𬙽𬙿𬚁𬝘𬞗𬠝𬱱𬹎",
 "屮": "嗤媸孼朔櫱欮滍糱蠥逆㔎㖾㡿㴊㺈䥀䧝䩶𠋷𠩋𠱘𠾌𡑇𡴘𢯪𢱟𢾫𣔳𣣷𣶮𤎬𤗙𤚍𥉍𥑺𥚘𥿬𦒂𦒟𦞲𦠍𦥭𦥾𧩯𧼞𧼳𨂫𨖀𩒕𩬸𩺉𩻙𪀝𪇷𪜏𪟄𫅦𫯷𫲕𬂘𬎫𬖲",
 "十": "乹乾仵伎伜估倅倝傎克卓厧吘吱呄咕哔哗唕啎啐喜嗔嘉嘏固圖壾奔妓姑娀嫃寘尌居屐岐岵崒崪嵮幹庋廰彭忤忮忰怘怙悴慎戟扟技捽搷攰攱攲攳故斡旿晔晬暁曓朝杵枝枠枯枿桒桳椊椟榦榫槙歧毧汛汥汻沽泋淬渎滇烨焠焼牍狜狨猝玝琗瑱瓳疩瘁瘨皋皷盬睟瞋砕碎磌祜祽禛秓秙稡稹窣窦章箤簙籸粋粹紣絨綷縝绒续缜罟翄翅翆翠翰肢胡脺芰苦茕茙草萃蒖蚑蛄蜶蝨螒衠衼觌訊許詁誶謓讯许诂读谇豉賁賊賥贲贼赎跂跍跸踤踬蹎軐軲轱辜迅迕鄙酔酤醉鈘鈷銔錊鎨鎮钴铧锧镇闐阗阠雗韓韩頍顇顛颠馶駂駥骅骷鬒鬾鮕鳵鳷鴇鴣鶽鶾鷏鸨鸪黩黰鼓鼓鼔鼖齻㐤㑸㒹㒹㔬㕆㕝㖛㚨㛸㝒㞰㟆㢑㣀㣏㣝㤒㥲㩻㩼㩽㩾㬳㭄㭜㰵㰻㱖㱠㲍㲞㲦㳃㷀㷏㼋㽻㽽㾵䀇䀦䂋䃽䄾䅩䇢䈯䊀䎁䎐䐍䐜䑩䒖䘬䘹䚝䚳䞚䡋䡩䣫䧴䧸䮆䮧䯬䯵䯷䯿䰙䱣𠁒𠁸𠃸𠃹𠇞𠈋𠉖𠊪𠏉𠐱𠒖𠒖𠒖𠔬𠔶𠖕𠖠𠖴𠗚𠚽𠛟𠡉𠢇𠤤𠤳𠥟𠦔𠦔𠦔𠦝𠦪𠦪𠦪𠦪𠧆𠧈𠧉𠧑𠧑𠨺𠪔𠫏𠫲𠬺𠭕𠭖𠯛𠯥𠯰𠰛𠱥𠲦𠲩𠳫𠳬𠳬𠵊𠵦𠶆𠶮𠷞𠷸𠸗𠸙𠸥𠸼𠽢𠾄𠾹𠿶𡂌𡂽𡄝𡄝𡄰𡅕𡅕𡅦𡅮𡅾𡇣𡇻𡈓𡉦𡉻𡊜𡊸𡒡𡒢𡓣𡔷𡔹𡗧𡘶𡜦𡜦𡜦𡝜𡝵𡣿𡥰𡦧𡨧𡪃𡪻𡮇𡰸𡱨𡲆𡲞𡲱𡳄𡳝𡳰𡴐𡴝𡴞𡸽𡺾𡻛𡾘𡿵𢃒𢆏𢇥𢈧𢈼𢉎𢋳𢌱𢍃𢎼𢏆𢏫𢐇𢒨𢓷𢔙𢔠𢔿𢕜𢜳𢝨𢝫𢞨𢟙𢡘𢢤𢤶𢦩𢦮𢧢𢨵𢩄𢩍𢪄𢪿𢫈𢫨𢫳𢫵𢮽𢱭𢱭𢲈𢲜𢲥𢳎𢳭𢵕𢷎𢺵𢺶𢺷𢺸𢺸𢺹𢺺𢺻𢺼𢺽𢺾𢺿𢻂𢻃𢻄𢻅𢻆𢻇𢻈𢻉𢻊𢻋𢻌𢻍𢻏𢻒𢻓𢻔𢻕𢻖𢻗𢻘𢻙𢻚𢻛𢻜𢻞𢻟𢻠𢻡𢻣𢻤𢻥𢻦𢻧𢻨𢻩𢻪𢽤𢽿𣁌𣁖𣂐𣃕𣅢𣇸𣈟𣉙𣉝𣉮𣉱𣍹𣎍𣎠𣑬𣖌𣖛𣖟𣖢𣖥𣗒𣗺𣙈𣚩𣚷𣞙𣞟𣠃𣦮𣦲𣦳𣧮𣨛𣪇𣫊𣬓𣭎𣯍𣯕𣰘𣲰𣳂𣳖𣴛𣴢𣶃𣻁𣽡𤁌𤂭𤃬𤅝𤈸𤉻𤒒𤖲𤚦𤛇𤜢𤞋𤠶𤡶𤡶𤡶𤣲𤪛𤫓𤬫𤭢𤮵𤯙𤲠𤵍𤹦𤹹𤽑𤽰𤿛𤿞𥀐𥀚𥀜𥀻𥀼𥀽𥀾𥁈𥂤𥂩𥃴𥄏𥄭𥅯𥉏𥊊𥏅𥏯𥐭𥑂𥑮𥑳𥑾𥓈𥔺𥕚𥖗𥖫𥗅𥘪𥙯𥚁𥚟𥚧𥚽𥛺𥝡𥢟𥥖𥧽𥨓𥩪𥫲𥬪𥭰𥭸𥮈𥰇𥲺𥴃𥶭𥷦𥸳𥺨𥾣𥾿𥿍𥿵𦅳𦊖𦊙𦊟𦌖𦍬𦑋𦒋𦕧𦖒𦗀𦗁𦘏𦙶𦜚𦝠𦞍𦞠𦡤𦣷𦣷𦣷𦥸𦥽𦦬𦦶𦧉𦧒𦨟𦩎𦩻𦬠𦬧𦬯𦬶𦮘𦯑𦯨𦯸𦱤𦲇𦲈𦲔𦲔𦴰𦴳𦵗𦵝𦶪𦶭𦶯𦸳𦹈𦹉𦹊𦹍𦹢𦹯𦹵𦻟𦻠𦻡𦻢𦻣𦻥𦻦𦻧𦻨𦼽𦽀𦽷𦽸𦽹𦽻𦾙𦾙𦾙𦾙𦿠𦿢𦿣𦿤𦿥𧁀𧁕𧁗𧁻𧂱𧂳𧂵𧂽𧃭𧃺𧃻𧄋𧄓𧄫𧅎𧅏𧆁𧆚𧆻𧇉𧇡𧊕𧍾𧘬𧙐𧙖𧜖𧞲𧦕𧫒𧮜𧮬𧮴𧯭𧯻𧯼𧯾𧯿𧰀𧰇𧰊𧰊𧰋𧰒𧰓𧰕𧰘𧰠𧰡𧰣𧳚𧵎𧵑𧷒𧷱𧷶𧹛𧹳𧺴𧻝𧻪𧽍𧾉𧿅𨀻𨃦𨆒𨈃𨈛𨈰𨍺𨐒𨐟𨑂𨑂𨑂𨑤𨑮𨒍𨓄𨓄𨓄𨔊𨔦𨕣𨖍𨙸𨙾𨚰𨜋𨝚𨟍𨟜𨠤𨢅𨢈𨤺𨧾𨧾𨪻𨱜𨱹𨱿𨲗𨳰𨳱𨴝𨸠𨻾𨾟𨿨𨿼𩂏𩄊𩄠𩇵𩉨𩊉𩌤𩏑𩐾𩑓𩑤𩑶𩓃𩓠𩓸𩔩𩖜𩗶𩙏𩙶𩛶𩜘𩝀𩝼𩞑𩞑𩞑𩞓𩞳𩞳𩞳𩟚𩡰𩡵𩢈𩢪𩤏𩥄𩧗𩨋𩫛𩫠𩫧𩫨𩫩𩫫𩫭𩫯𩫰𩫱𩬩𩬰𩰇𩰯𩱍𩱒𩲱𩵱𩵾𩶨𩹼𩺘𩻂𩿜𩿵𪀚𪀵𪁽𪂂𪄩𪈃𪉊𪉶𪋌𪏻𪒸𪓌𪓏𪔐𪗓𪘧𪜖𪞂𪞎𪞟𪞴𪞸𪟌𪟳𪟴𪟵𪟺𪟼𪠬𪡜𪡻𪤱𪥿𪦶𪪂𪪖𪪼𪫉𪭛𪭟𪭡𪯅𪯆𪯇𪯮𪵆𪶗𪶗𪶗𪷋𪸣𪺨𪻕𪻨𫀩𫂍𫂽𫃋𫅃𫅊𫇈𫎡𫎳𫏿𫐢𫑆𫒍𫓆𫔜𫔦𫖇𫖐𫖐𫖐𫖒𫗡𫘷𫚘𫛛𫝣𫟬𫠍卉𢌱桒桒桒𥃲賁賁賁鼖鼖鼖𫠧𫣁𫣜𫤲𫥜𫦈𫧡𫧩𫧬𫧭𫧿𫨒𫩅𫩈𫩭𫪔𫪪𫪹𫫑𫬯𫯤𫰓𫰡𫷊𫹍𫹙𫺆𫻣𫻸𫻸𫻿𫼣𫼧𫾣𫾤𫾥𬀇𬀬𬀵𬁄𬃊𬆋𬆋𬈪𬉥𬏟𬐎𬑓𬑙𬑩𬑮𬙝𬙼𬚋𬜈𬜘𬜦𬝀𬝀𬠃𬢼𬣛𬤷𬦉𬩁𬩕𬫍𬭃𬮫𬱧𬶉𬹙𬺋",
 "早": "乹乾倝倬傽啅婥嫜嶂幛幹彰悼愺慞戟掉斡晫暲朝棹榦樟淖漳焯獐琸璋瘴瞕窧竨竷綽繛绰罩翰蔁螒蟑贑贛赣趠踔逴遧鄣鋽鏱障雗韓韩騲騿鱆鵫鶾麞㢓㦸㪕㲦㷹㹿䂽䈇䎐䑲䓥䓬䤗䮓䮧𠃵𠢇𠣳𠦲𠦷𠧄𠧇𠮒𠹊𠼀𡈠𡍎𡚄𡯴𢒛𢒨𢔄𢕔𢛂𢥔𢥺𢥿𢧢𢵕𢾳𣁖𣂣𣉙𣎍𣎠𣙈𣦖𣪙𣫜𣫡𣶃𤃬𤙴𤚷𤨼𤲤𤷘𥀐𥇍𥉏𥎟𥏥𥕞𥢔𥪮𥫊𥫑𥫒𥫓𥫔𥫕𥫖𥴄𥵙𥶭𦅕𦋇𦋐𦋚𦜰𦠰𦩻𦳕𦷖𦸶𦹫𦹯𦹵𦹸𦺏𦺩𦻐𦾠𧁀𧄣𧄳𧅭𧌸𧗛𧟻𧨳𧫱𧳝𧹄𧹉𧹳𧽣𨉔𨌬𨕡𨙏𨢈𨶤𨺑𨿧𨿨𩅈𩌬𩏑𩕆𩘀𩙩𩙶𩧗𩭟𩷹𩹼𪂂𪂱𪅂𪋛𪋟𪍈𪞬𪟵𪟷𪟺𪟿𪪂𪭂𫀑𫁯𫆶𫊘𫋬𫎬𫛱𫜂𫠒𫤴𫥬𫧩𫧭𫵑𫶱𫸍𫻙𬃸𬉥𬊳𬎗𬔧𬞁",
 "日": "乽亁亘亶但侚借倡倱偖偺傝僴儤児凕剒剔匫匽卓厝厬呾咰哻唱唶啫喅喒嗜嗢嗮嘬噜嚕嚗塓奛奢奣妲姰娨娼婚婫媎媪嫇宴尞尡屠峋崉崏崐崑嵵帾幂幌幎幜庴影徇徣復怛恂恉悍惃惕惖惛惜惺惽愎愠愭愰慏憬懪戥戬担指捍捏捪掍掦措揝揾搘搢搨撔撮撸擼敡敯斮斱昜昼晘晹晿暏暑暒暝暥暦暨暻曁曌曐曐曐曑曑曑曓曝曟曟曟曡曡曡朚查柦栒栺桌桿棍棔棤椙椱楮楿榅榗榠榥榯榰榻槠樶橸橸橸橹橺櫓殉殙殟殾毥毾氆氇氌氲泹洵涅涆涧涽涾淏淐混渂渚温湣湦湻湿溍溟溡溻滉潪潽澋澗澘澛澷濌濐瀂瀑炟焊焜焝焟焬焸焸焺焻焽煋煑煜煦照煮煴熀熐熶燝爆爗狚狥猂猎猑猖猩猪猽珣琘琝琞琨琩琽瑆瑉瑥瑨璟疍疸痬痻瘄瘏瘟癎皔皩皵盟眴睅睗睧睲睹瞑瞷矠碈碏磵禇禢稈稓稪稲稽穝穞穭窤章笪筍筸简箟箸篂簡糌絢緄緆緍緒緡緮緼縉縨繓绚绪绲缊缗缙罎署翥耤胆脂腊腥腹腽舓艪荀草莫莳菎菒菖萌萫葃著蒀蒔蓂蓍蕌蕌蕌蕞蕳藴蜡蜫蜴蝫蝮蝹螟螧袒裥裩裮裼複褚褞褟襇襊襮覩覭覸觛觰詚詢詣誯誻諎諙諸謃譜询诣诸谱豬豱貋賜賭赌赐赭趕趞踏踖踢踷蹋輥輹輼辊辒迿逪逷遢郇都鄍鄑酯醋醌醏醒醕醖量鉭銁銞銲錉錔錕錩錫錯鍑鍟鍲鍺鎉鎤鎾鐛鐠鐧鑙鑤鑥钽锏锗错锟锠锡镥镨閶閺閽闍闒阇阊阍阘陧陼霷靼鞜鞰韞韫顕顥颢餛饂馚馛馜馝馞馟馠馡馢馣馤馥馥馦馧馧馩馪馫駨駻騉騴髜鬄鬐鬝鮨鯣鯤鯧鯹鯺鰒鰛鰣鰨鰭鱪鲥鲲鲳鳁鳆鳍鳎鴠鴲鵲鵾鵿鶍鷃鷐鷼鸔鹊鹍麘黁鼂鼆鼌鼹齰㐯㑥㔀㔬㖏㖧㗃㗍㗯㘿㙏㚆㚛㛥㛫㛭㛰㝁㝜㝠㝵㞓㞛㟙㟭㟰㠮㡄㡺㣏㥩㥫㧦㧺㨉㨋㨠㨪㩧㪋㪚㪟㪽㫀㫜㫤㫬㫯㬆㬈㬐㬥㬧㬪㬪㬪㬼㭼㭿㮷㰬㱪㲩㳷㳻㴞㴡㵆㵊㵫㶞㶷㷔㷖㸙㸟㹺㻛㼔㿢㿺䁕䁙䁜䂍䂿䃂䃉䃏䄍䄑䄙䅙䅛䅨䅲䆞䆨䇎䈋䈞䈳䈿䊐䋎䌈䍝䎓䎽䏃䏷䐇䐊䐗䑽䒌䓍䓠䓪䖧䖲䗉䗌䗑䘄䘩䚐䚠䛞䛰䜥䜺䞎䞡䠦䡤䤖䥘䥵䦔䦭䧗䧿䨃䪖䪚䫒䫝䫤䬡䭘䭫䭬䭯䭰䭱䭲䭳䮖䮡䯜䯠䯫䰇䰋䰞䰩䱇䱜䲕䳚䳛䳟䴝䵣䵪䵬䵭䶁𠀥𠁂𠄃𠆌𠆛𠉣𠉤𠊫𠋶𠋹𠌹𠍬𠍾𠎠𠎥𠎲𠏉𠏥𠐔𠐱𠑔𠑱𠒫𠒮𠒻𠒼𠓑𠓓𠖇𠖚𠖞𠘉𠛣𠝕𠝖𠝲𠟏𠡎𠡱𠢎𠢻𠣡𠣬𠣰𠤚𠤟𠤪𠦝𠧄𠨈𠩊𠪞𠪷𠫁𠬋𠭒𠮘𠳉𠴭𠴲𠵫𠺮𠺳𠽾𠿲𡀻𡂽𡃞𡄗𡅜𡋵𡌕𡌩𡎉𡎟𡎣𡐭𡐹𡐻𡓇𡔒𡕾𡕾𡗀𡗎𡘨𡘬𡚈𡚙𡝎𡝪𡞦𡞪𡟄𡟙𡠂𡡔𡡝𡡧𡢃𡢊𡢴𡥵𡦀𡦡𡨕𡨩𡨵𡨶𡩉𡩕𡩦𡩷𡪏𡪙𡫝𡱿𡳵𡳶𡴐𡷛𡸑𡹋𡹌𡹾𡺁𡺐𡺸𡻄𡼏𡼐𡼩𡼮𡼷𡾎𢀍𢃑𢃕𢃚𢃟𢃡𢄸𢄾𢇔𢉜𢋂𢋡𢌪𢍷𢏔𢏥𢐼𢑳𢑾𢒗𢒬𢒻𢔒𢔪𢖔𢘆𢘇𢙶𢛝𢛽𢛿𢜏𢜠𢝬𢞛𢞠𢞧𢞫𢡕𢡰𢢀𢢇𢢏𢢤𢢹𢣮𢥑𢧀𢧉𢧫𢧾𢨙𢩎𢫵𢬐𢬒𢮚𢮵𢯟𢲋𢳛𢳡𢵃𢵃𢵧𢶹𢸉𢸉𢸓𢸲𢸲𢸶𢺖𢽎𢽹𢾀𢾙𣀛𣀠𣀭𣁌𣂃𣂨𣃕𣄙𣄤𣆞𣆟𣆨𣆽𣇑𣇲𣇴𣇵𣇿𣈀𣈁𣈂𣈇𣈏𣈱𣉈𣉑𣉝𣉠𣉡𣉬𣉬𣉷𣊂𣊏𣊐𣊖𣊖𣊖𣊣𣊣𣊤𣊦𣊧𣊧𣊫𣊫𣊷𣊷𣊸𣊺𣋀𣋁𣋄𣋇𣋈𣋎𣋐𣋐𣋗𣋮𣋯𣋰𣋼𣌃𣌈𣌌𣌒𣌚𣌚𣌛𣌜𣌝𣌞𣎇𣎧𣐤𣑢𣑬𣓓𣓗𣓾𣔂𣔣𣕍𣖆𣖼𣗓𣗤𣘅𣙁𣙹𣚴𣜸𣝭𣞺𣠀𣠈𣠏𣠕𣡤𣣏𣣒𣣘𣦙𣨟𣨾𣩆𣩡𣫙𣬑𣭸𣮎𣮑𣮶𣯆𣯽𣰯𣱁𣱁𣱁𣱡𣱢𣵡𣶪𣷠𣸪𣸬𣸭𣹡𣹯𣺂𣽙𣽞𣽷𣾻𣿱𤀜𤀣𤀰𤁛𤂞𤂩𤃄𤃅𤃞𤃦𤃵𤅲𤇁𤉭𤉲𤊽𤋭𤌄𤌙𤍘𤎙𤎚𤐗𤑅𤑎𤑧𤒂𤒧𤒸𤓑𤖛𤘏𤙫𤚺𤛁𤜈𤞋𤟍𤟱𤠐𤡠𤢙𤣃𤣘𤣘𤥚𤦉𤦉𤦊𤦘𤧘𤨁𤨅𤨆𤨱𤩎𤩓𤩜𤩜𤩜𤪃𤬆𤭼𤮦𤮩𤱬𤳠𤳺𤸑𤹀𤹾𤺁𤻃𤻈𤻼𤼍𤾄𤿟𤿧𤿸𤿽𥀁𥂺𥃠𥅃𥇊𥇏𥈺𥉙𥊴𥋒𥋓𥌏𥌧𥍴𥎒𥏅𥏯𥐄𥐅𥑲𥒘𥓖𥓘𥓥𥔋𥔜𥔡𥕸𥖉𥖒𥗅𥗆𥗋𥗟𥗶𥘵𥙣𥚕𥚛𥚜𥚯𥛗𥛠𥛠𥜩𥜭𥟘𥟙𥟟𥟴𥠀𥠻𥡞𥣉𥦏𥦸𥧍𥧎𥧏𥨤𥩍𥪔𥪚𥪤𥪳𥫂𥫅𥫈𥫈𥫊𥮬𥯋𥯭𥰻𥱯𥲮𥲺𥳣𥳲𥴀𥴃𥴵𥵐𥶇𥷍𥷍𥷛𥷦𥸖𥸢𥺮𥺰𥻩𥻵𥼴𦀤𦁎𦁽𦃻𦃼𦅘𦅡𦅿𦆏𦆿𦈖𦈛𦉡𦊥𦋁𦋧𦍄𦍄𦎧𦎫𦐥𦑇𦑥𦑼𦑾𦑾𦒋𦓀𦓍𦓻𦓼𦔌𦔡𦖞𦖤𦗌𦗬𦘠𦚧𦜃𦝈𦝙𦞯𦟕𦠺𦡮𦢊𦢞𦣖𦣖𦣖𦤘𦤨𦤾𦦃𦦄𦦄𦦣𦦸𦧟𦧥𦨪𦩅𦩟𦩠𦩳𦪯𦬹𦮂𦴒𦴤𦵽𦶑𦶺𦸋𦸫𦺽𦻖𦻲𦻽𦼨𦾔𦾛𦾧𦿀𦿑𦿑𧀦𧁠𧂤𧂽𧃫𧃬𧄦𧄦𧄧𧇻𧈔𧊙𧋯𧌏𧌚𧍎𧑊𧑹𧒄𧒊𧒛𧓢𧔎𧔙𧔜𧔲𧔷𧖛𧖽𧖿𧛆𧛊𧛟𧜀𧞈𧡜𧡰𧡶𧡺𧢑𧤨𧩎𧩙𧩛𧪂𧪍𧪑𧪡𧪱𧪽𧬘𧭘𧭤𧭷𧮠𧯄𧯅𧯑𧰂𧱟𧱴𧲐𧳢𧳯𧵣𧵯𧶧𧶬𧹨𧹰𧻛𧼮𧼱𧼹𧼺𧽂𧽉𧾀𧾃𧾆𨀏𨀴𨁄𨁴𨂻𨃯𨅍𨅎𨅦𨇅𨇬𨈱𨋮𨌁𨌭𨌲𨍆𨎁𨎅𨎗𨏗𨐀𨐀𨓬𨓳𨔾𨗀𨗏𨗏𨗏𨚰𨛎𨛳𨛴𨜍𨜞𨜬𨝁𨟇𨟜𨟝𨠚𨡍𨢍𨢎𨣅𨣉𨣋𨤼𨧝𨧹𨩛𨪌𨪶𨫉𨬌𨭲𨭼𨮠𨮺𨯆𨯮𨲎𨲘𨲦𨴝𨵒𨵛𨵝𨵷𨶁𨷄𨹎𨺒𨺸𨻂𨼓𨼗𨼗𨼗𨼥𨽑𨿑𨿪𩀭𩁆𩁠𩃛𩃟𩃮𩄅𩄆𩅟𩅟𩅟𩆉𩈍𩈹𩊝𩊿𩋌𩋟𩋵𩋻𩎽𩎿𩐲𩐿𩑰𩒨𩓌𩓢𩓺𩗤𩗺𩙕𩚃𩟣𩠜𩠺𩠻𩠼𩠽𩠾𩠿𩡀𩡁𩡃𩡄𩡅𩡆𩡇𩡈𩡉𩡊𩡌𩡌𩡎𩡏𩡐𩡐𩡑𩡒𩡓𩡔𩡕𩡖𩡗𩡘𩡙𩡚𩡛𩡜𩡝𩡞𩡟𩡠𩡡𩡢𩡢𩡣𩡤𩡥𩡦𩣯𩣶𩤈𩤜𩤵𩤶𩤹𩥂𩥞𩩪𩩫𩪺𩫭𩬺𩭡𩭣𩭭𩭰𩯉𩯱𩯾𩯾𩱰𩷑𩷽𩹡𩹽𩻋𩻱𩻶𩻾𩼫𩼻𩽈𩽙𩽟𩽫𪀠𪀽𪂆𪂇𪂌𪂡𪂳𪃃𪃙𪃯𪃲𪄖𪄚𪅉𪆣𪆨𪇰𪈂𪉆𪉎𪉨𪉷𪊨𪋆𪋏𪋑𪋒𪌽𪍭𪎥𪎧𪏈𪐒𪐒𪑕𪒄𪒇𪒙𪓂𪓲𪕤𪕩𪕵𪗷𪘄𪙦𪙨𪙮𪙶𪛋𪜕𪜢𪜵𪜿𪝂𪝑𪝚𪝧𪞂𪞃𪟈𪠊𪡓𪢣𪢬𪣚𪣤𪣦𪣧𪤃𪥖𪥮𪧨𪧶𪨝𪨟𪩿𪪙𪪢𪪤𪫉𪬏𪭛𪮛𪮻𪰬𪰰𪰾𪱁𪱈𪱈𪱈𪱊𪱎𪱕𪲩𪲺𪳑𪳒𪳲𪴂𪴘𪴝𪴞𪴡𪴮𪴯𪶄𪸣𪸮𪸺𪸻𪹈𪹓𪹕𪹩𪹶𪺬𪻌𪻪𪻹𪼍𪾿𫀒𫀚𫀥𫀯𫀴𫀹𫁩𫂁𫂍𫂓𫂻𫃏𫄭𫅃𫅑𫅶𫇰𫈉𫈔𫉧𫋰𫌑𫎟𫎥𫎯𫎻𫑦𫒱𫓣𫓣𫓲𫔹𫔿𫖧𫗸𫗼𫗽𫗾𫗿𫘀𫘁𫘂𫘃𫘄𫘣𫘥𫘫𫘲𫘷𫙀𫙃𫜀𫜊𫜎𫜬𫝒𫠃𫠛僧帽憎搢殟蝹鄑馧馧𫠱𫢰𫣁𫣠𫤠𫤨𫥉𫦡𫦡𫦡𫦴𫧩𫨗𫨟𫨤𫨭𫩂𫩥𫩭𫪅𫭈𫮕𫯬𫯽𫲍𫲬𫳳𫴾𫶁𫶃𫶍𫸏𫹗𫺍𫺒𫺼𫻷𫼏𫽑𫾻𫿪𫿬𬀠𬀵𬀶𬀺𬀼𬁀𬁄𬁌𬁏𬁔𬁖𬁚𬁬𬁬𬁬𬂈𬂊𬃬𬃱𬄅𬄊𬄛𬄣𬅩𬅮𬅯𬅺𬆰𬇀𬇷𬈪𬉚𬊏𬊘𬊘𬊙𬊚𬊛𬊭𬌂𬌆𬌠𬌦𬍶𬎝𬎬𬐿𬑗𬓎𬓙𬓜𬕐𬕑𬖝𬖞𬖡𬖭𬖷𬖻𬗡𬘜𬙢𬚍𬚍𬛃𬛄𬛆𬛖𬝫𬞀𬟀𬟇𬟝𬢎𬢒𬢼𬣒𬣸𬣾𬤓𬤕𬦸𬧔𬧙𬧨𬨰𬪀𬪈𬪉𬪫𬫏𬭍𬭏𬯆𬯯𬯿𬰈𬱝𬲑𬳉𬳑𬳜𬳝𬳞𬳟𬳠𬳡𬳢𬳣𬳤𬳥𬳦𬳧𬴄𬴙𬴢𬶘𬶢𬶩𬶱𬶳𬶴𬸶𬹋",
 "炎": "檆㓹㗵㰊䆱䕭䢯䮼𠋴𠻪𡃘𢅮𢴗𢸧𢸱𣊞𣰍𤸹𥊗𥰨𥲄𥵲𥶖𦃖𦆢𦋺𦌗𦌧𦌪𦵹𦸁𦼓𦽉𦿦𧅩𧐽𨕪𨤵𩉀𩧔𪋲𪝧𪷅𫮡",
 "⺉": "侀例侧俐倒偂側冽剪劽厕厠咧哵唎唰喇型姴娳媊峛峢峲崱廁悡悧惻挒捌捯揃揦揧揱栵梨梸椡椾楋檦洌测浰涮測湔溂烈烮煎犁猁琍瑐痢瘌硎筣箌箣箭箾糋翦脷苅茢荊荝莂莉莿菿萴萷葥蛚蜊蝲裂誗趔迾鉶銐鋓鋫鍘鎆铏铡鞩颲騚鬁鬋鬎鮤鯏鯻鰂鲗鴷㓹㘌㠒㡂㡐㣜㤠㤡㨽㭢㭭㮍㴝㷙㻝㻳㽝㾐䂰䃗䅀䇷䈀䈟䈩䌃䏀䓭䓶䖽䬆䮋䱘䱨䱫䵩䶛䶡𠈛𠋴𠎼𠕥𠗜𠗧𠜣𠝊𠝨𠝯𠞺𠞽𠞾𠟖𠟥𠠄𠠊𠠋𠠦𠠩𠡖𠡩𠣶𠩪𠴼𠵯𠶘𠷁𠷌𠸑𠺓𠺣𡁪𡃍𡇿𡊻𡋾𡌀𡍫𡍽𡏫𡜇𡞢𡞸𡠔𡢱𡥬𡨖𡬂𡬙𡬷𡬼𡱸𡶭𡷘𡸉𡹺𡺢𡽜𢂥𢃉𢃬𢃴𢅚𢈱𢉨𢔯𢝔𢢥𢢼𢮰𢯍𢯔𢯩𢱦𢳐𢳽𢵷𢶏𢶨𣇘𣈛𣉇𣋃𣋽𣓇𣕇𣖡𣧿𣮀𣮂𣸛𣸠𣹅𣿖𤀦𤁴𤈘𤉉𤉌𤊶𤏬𤏾𤑯𤖺𤞊𤟆𤟰𤢾𤧮𤳓𤷫𤷯𤸹𤺨𤿱𥁟𥅮𥆁𥇂𥈙𥉬𥊌𥋠𥒂𥒻𥓑𥓫𥓬𥖍𥗌𥚥𥚲𥞥𥞲𥟦𥠉𥢫𥦂𥦉𥦹𥬭𥬼𥰍𥰨𥰵𥵲𥶖𥻃𥻌𦀎𦀑𦂒𦂗𦃖𦃾𦄈𦆢𦋞𦋺𦌥𦌧𦑦𦖇𦖝𦖨𦗿𦛺𦡅𦮯𦵹𦵿𦸕𦻢𦾑𦿦𦿶𦿾𧁴𧊞𧊿𧌐𧌼𧍐𧍡𧒈𧙩𧙷𧛯𧝼𧧋𧧸𧩲𧪈𧪙𧫌𧭀𧼕𧼤𨀺𨃮𨄩𨍀𨡊𨢏𨢹𨦙𨧘𨧢𨨺𨭚𨲞𨴾𨾸𩂶𩊡𩋳𩋷𩘊𩢾𩣫𩤲𩦠𩧮𩧸𩨉𩨊𩮆𩮜𩶽𩷤𩺄𪁐𪃅𪌱𪑟𪗿𪘼𪙂𪟅𪠰𪣛𪣫𪥗𪩤𪭼𪮁𪮚𪰬𪶃𪶌𪺤𪿍𫅙𫆠𫆨𫊽𫋉𫋖𫔣𫗛𫙋𫚓𫢣𫣯𫤤𫥑𫦠𫦢𫬉𫭮𫭴𫰘𫰞𫴯𫹑𫼤𬀰𬆒𬆓𬇯𬌧𬏄𬓪𬕲𬜊𬠝𬠼𬥚𬦶𬩁𬩒𬭺𬯼𬰌𬶟𬸎",
 "亠": "亶亸伉佼侅俼倅倞停傍傐儫凉刻剠劥効劾勍匟吭咬咳哼唷啍啐喨嗃嗙嘀嚎嚲囥奒妔姟姣婛婷嫎嫡孩孰就峐峧崒崞崪嵉嵜嵩嵪嵭巯巰弴弶彦徬徹忼恔恼悙悴惇惊抗挍捽掖掠揨搒搞摘撤效敦敲敵旈旒晈晐晬景晾暠朜杭柿校核梈梳棛棭椁椊椋楟榜槀槁樀橀檺欬歊歒毃毓氦沆洨流浐涥液涼淬淯淳渟渷湸湻湾滂滈滦滳滴澈濠炕烄烗烹焞焠焲焴煷熇熵牓犺狡猄猝珓琉琗琼甋産畆畒畝畡疏痎瘁皎皜睟瞮砊硋硫碎碠碻磅祽禀禞离秔稕稟稡稤稾稿窔窣笐筊箤篙篣籇粇粹絞絯綂綡綧綷縍縞绞统缟翞翠翯耪肮胲胶脑脝脺腋膀航艈艕苀茭荄萃萨葶蒡蒿蔏蔐蘛虠蚢蛟蜟蜳蜶蝏螃螪蠔裗覫詨該誶諄諒諪謗謞謪謫譹该谅谆谇谤谪豥豴貥賅賋賌賥赅跤踤蹢較輆輬轍较辌辙迒逳適邟郂郊郭鄗酼醇醉醕醯鈧鈰鉸鋶錊錞錥鍄鎊鎬鏑钪铈铰铲铳锍镐镑镝閌閙閡闶闹阂阬陔鞟韕頏頝頦顇颃颏餃餩駭駮騯骇骯骸骹髇髈髚髚髛髜髝髞鬧魧鮫鯍鯙鯨鰝鰟鲛鲸鳑鵁鵺鶁鶉鶮鹑麍麖黥齩㓍㖡㙜㙵㚆㚊㛩㝄㝇㝇㝔㠃㠙㣃㤥㥔㥫㥬㧡㧤㧧㧸㨃㩝㪟㪣㬀㬚㬵㯙㰠㰵㱖㱾㲙㲞㳘㳰㷚㸀㹁㻙㼎㼚㽘㾸㿰㿶䀭䁁䁎䁤䂭䃄䄘䅭䇏䈞䊞䋁䋭䍊䎮䐧䐱䒆䒍䖻䘕䘨䘪䘸䘹䘻䙗䚝䝶䟘䟲䟽䠙䠹䡉䢒䣼䤤䤳䧐䧚䧛䧫䨦䩷䬘䬵䭺䮦䮰䯨䯩䯪䯫䯿䱣䲳䴚䵂䵍䶳𠁸𠅗𠅮𠅱𠅶𠅹𠅽𠆁𠆃𠆌𠆓𠆓𠆔𠆕𠆙𠆙𠆞𠇰𠏦𠐝𠒨𠒨𠒩𠒿𠔳𠗚𠗵𠙇𠛳𠜅𠜨𠞌𠞟𠞶𠡜𠡤𠢗𠧆𠩭𠫏𠬇𠭇𠰼𠶛𠶴𠷥𠸀𠸔𠼬𠾀𠾹𠿕𡄰𡅄𡅹𡇻𡊔𡊿𡋟𡌿𡍠𡎭𡐒𡐴𡒋𡓑𡔊𡖺𡝵𡠀𡥡𡥹𡦚𡦛𡦟𡦡𡦧𡦨𡦩𡨧𡬱𡭅𡭹𡮇𡮎𡮎𡯶𡰗𡰜𡱍𡲼𡳝𡵻𡶴𡹞𡹡𡺣𢂙𢂤𢃒𢄎𢅈𢅈𢅈𢆣𢈴𢈼𢋳𢏭𢐊𢑸𢒌𢔙𢕹𢘥𢚟𢝋𢝜𢞟𢠃𢣫𢨊𢨠𢯡𢯴𢯻𢰤𢲤𢳼𢴅𢴒𢻉𢻓𢼵𢾊𢾛𣂆𣂉𣂳𣂴𣃚𣄥𣄬𣈋𣉞𣊀𣋄𣖛𣖢𣚥𣞮𣣎𣣱𣦮𣨉𣨛𣨜𣨣𣨧𣩅𣪢𣫺𣮘𣮢𣯊𣯖𣯟𣯵𣴃𣷷𣻤𣻼𤀷𤂭𤅣𤅻𤊰𤌾𤏂𤐶𤒀𤒀𤖟𤖣𤖧𤗞𤚰𤚸𤜏𤞀𤟞𤠖𤠻𤡇𤢭𤥡𤥿𤦺𤧟𤧭𤧼𤨬𤪁𤪗𤪛𤭞𤭢𤮩𤰎𤱈𤱶𤲠𤶀𤷦𤸥𤹔𤹞𤹟𥂬𥄦𥅟𥅻𥇜𥇟𥉣𥊔𥏹𥒝𥒳𥔎𥕐𥖰𥙅𥚠𥛚𥜭𥞑𥞨𥠣𥡦𥢺𥢿𥣹𥧮𥩧𥩲𥪜𥬱𥯢𥰹𥲮𥴀𥶧𥸏𥹜𥺞𥻭𦀠𦂃𦃳𦅄𦈲𦈷𦌦𦍉𦎧𦎫𦐄𦐤𦑋𦒭𦓄𦔑𦔞𦖒𦗍𦚳𦝑𦝞𦠣𦤘𦨾𦪳𦱀𦳆𦴒𦷷𦹾𦺏𦿣𧅬𧇠𧊏𧌊𧌬𧎸𧐢𧕔𧜉𧜟𧠭𧠷𧣦𧤀𧥉𧦑𧨆𧨑𧫒𧯺𧰄𧲪𧳚𧶺𧷭𧻨𧾉𨀖𨀫𨂒𨂙𨂺𨃤𨄄𨅊𨈢𨉬𨉲𨌯𨍩𨏣𨏰𨒨𨔊𨗈𨗍𨜷𨝗𨟝𨟞𨟼𨠦𨠳𨠺𨢅𨢐𨢓𨣳𨧤𨪃𨪆𨫢𨬤𨮙𨱉𨵎𨸲𨹍𨺥𨺱𨽷𨾒𨿡𨿤𨿼𩊔𩋻𩌡𩍯𩎏𩎦𩏈𩐟𩐰𩐴𩓲𩗒𩗬𩗶𩘁𩘍𩙮𩙷𩜘𩠚𩡕𩤏𩤙𩥊𩦴𩨆𩩇𩩣𩪿𩫀𩫁𩫂𩫄𩫅𩫆𩫇𩫈𩫉𩫊𩫋𩫌𩫍𩫎𩫏𩫐𩫑𩫓𩫕𩫗𩫘𩫙𩫚𩫛𩫛𩫜𩫝𩫞𩫟𩫡𩫢𩫣𩫤𩫥𩫦𩫪𩫬𩫮𩫲𩮘𩰶𩱐𩲋𩲻𩸡𩹇𪁇𪁉𪁽𪂎𪄱𪄲𪈋𪋌𪍅𪎣𪎵𪎽𪏁𪏆𪐏𪐦𪑒𪑬𪓌𪕇𪗜𪗯𪘧𪜎𪜥𪜦𪞅𪞊𪞌𪞨𪞯𪞸𪞻𪞼𪞽𪟆𪟸𪟼𪠠𪠻𪡁𪢁𪢮𪣹𪥐𪥘𪥹𪧃𪨓𪩧𪩵𪪇𪪌𪪨𪬥𪬧𪬹𪮌𪮠𪮳𪯒𪯔𪯜𪯨𪯪𪱧𪲪𪲬𪳄𪵂𪵔𪶧𪸿𪹚𪹧𪹱𪺨𪻑𪻞𪻥𪽒𪿫𫃅𫄰𫆡𫆥𫆽𫇄𫇈𫎕𫐼𫑆𫒁𫓞𫓾𫕒𫖍𫖎𫘮𫘵𫘶𫘷𫜘𫜡𫜪𫝸𫟅𫟺羕𫡼𫡽𫡿𫢀𫢁𫢂𫢷𫣢𫣬𫥀𫥜𫥥𫥩𫥪𫥮𫥿𫦈𫧷𫨣𫨿𫩂𫩅𫩷𫪮𫫀𫫑𫬩𫭸𫮌𫮍𫰳𫱍𫱨𫲒𫳖𫶄𫷇𫸇𫸊𫻣𫻱𫼪𫼭𫽕𫾣𫿀𫿧𬂃𬃪𬃬𬄜𬆻𬇍𬈠𬉁𬊣𬊥𬊧𬌿𬍳𬎯𬏐𬐎𬑣𬑮𬑯𬒩𬓦𬓰𬕟𬖰𬘯𬙼𬛏𬛠𬜈𬝇𬠱𬡯𬡻𬤗𬤫𬧽𬧿𬨇𬪲𬫫𬬟𬭚𬯻𬳣𬳮𬴅𬴕𬴙𬴚𬴜𬴝𬴞𬴟𬴠𬴡𬴢𬴣𬴤𬴥𬴦𬴻𬵵𬶥𬹽𬺅𬺋",
 "口": "乨乫亸估伽佁佋佑佝佪佫佲佶侗侞侣侣侰侱侶侶促俈俉俖保俣俰倁倃倍倞偘停偮偯傊傐傐傖傯僐僖儉儉儫克兌兑兘兽况冶凉减凔刟刣别剐剖剠剮割創劍劍劎劎劒劒劔劔劬劭劶劼勂勋勍勏勛匳匳區卨卲厑厛厱厱司呄周呪呴呺咍咒咒咕咖咢咢咭咯品品哃哛哠哫哭哭哼哿唅唔唜啍啎啙啙啚啝啟喆喆喊喌喌喎喣喦喨喬喬喸喿嗃嗃嗆嗐嗠嗧嘉嘏嘻噐噐噐噐噞噞器器噽嚎嚚嚚嚚嚚嚞嚣嚣嚣嚣嚭嚭嚲嚴嚴囂囂囂囂囍囍固囼圄圆圓圖垕壽夞够夠夡妱妿姁始姑姛姞姤姳娖娝娢娪娯娱娲婄婛婷媧嫸嬉嬐嬐嬴孁孁孁孡孰客宫宫宭宮宮宲寤尀尚就居屌岣岧岲岵岹峈峉峒峝峮峼峿崞嵅嵉嵒嵓嵢嵩嵩嵪嵪嶉嶮嶮巶巼帤帬幒廤廻弨弴弶徊徎怊怐怘怙怠怡怳恄恕恛恪恫悋悎悙悜悟悮惇惊惒感愪愴憁憘憙憸憸戙戜戢戧扃抬拀拁拐拘招拮挌挏挐挰捁捂捃捉捛捛损掊掠揖揨搃損搞搞搳搶摠撿撿敂故敋敔敦敨敲敲敼敾斂斂斝斝斪旤昫昭晍晗晤晧景晷智晾暠暠暿朐朜枯枱枲枴枵架枷枸柖柷柺格桇桐桔桮桯桰桾梈梏梒梠梠梧棓椁椋椥椷楇楟楫楶榀槀槀槁槁槍槑槑樬橏橲檢檢檺櫜櫺櫺櫺欨欩欯歄歊歊歖歚歛歛殆殒殕殞殮殮毃毃毄毠毰治沼沽況泂泃泇洁洄洉洖洛洜洞洳洺浛浞浧浩浯涒涡涢涥涪涼淳減渟渦渽湒湸湻溳滄滈滈滣漗澰澰濠炤炯炱炲炾烔烙烹焁焄焅焐焒焒焓焙焞煘煰煱煷熇熇熉熗熜熹熺爂爨牄牊牕狗狜狢狤狪猄猧獊獫獫玽玿珆珈珞珵珸珺珿琀琣琼瑊瑲璁璺瓳瓵瓿畐略畧痀痂痌痐痞痦痴瘑瘡皓皜皜眖眗眙眧眮眳睈睘睵瞎瞦瞼瞼硈硌硐硘硞碚碞碠碢碱碻碻磍磒磰礂礆礆祐祒祜祝祦祮祰祸禍禞禞禧秙秮秱秸稆稆程稕稖稤稾稾稿稿穯穯穯窖窘窝窩窻竘竞竵笞笤笱笳笸笿筎筒筘筥筥筨筶筼筽箁箴箿篔篙篙篬簽簽籇粡糦紹紿絅絇結絗絡絧絮絽絽綡綧綹緘緝緺縂縖縜縞縞總繕繥绍绐结络绺缄缉缟缟缬缮缿罟羣群羸翑翓翞翯翯耇耈耛耞聟胊胎胡胳胴脗脝脭脴脵脶腡膪膳臉臉臝臵臺舋艁艙苔苕苘苟若苦茄茍茖茗茣茩茴茹茼荶莒莒莕莙莟莡莴菋菩萂营营萵葴葶葺蒷蒼蒿蒿蓶蔄蔥蕚薟薟蘦蘦蘦虈虈虈虈虞號蚼蛁蛄蛒蛔蛣蛿蜈蜗蜘蜳蝏蝸螛螥蟌蟢蟮蠃蠔衉衕衙袈袑袧袬袺袼袽裎裙裠襃襝襝覠觡觱訽詁詋詒詔詗詬詰詷詺詻誝語誤誥諄諐諒諣諪諮諴諿謒謞謞謥譆譣譣譹诂诇诏诒诘诟语误诰谅谆谘谽豁豞豿貂貉貺貽賀賂賠賳賶贏贶贺贻赂赔赢超趌趗趦趸跆跍跏跔跫路跾踀踅踎踟踣踻蹇蹌蹔蹙蹩蹵蹷躄躉躛躠躳躳軥軦軩軲軺輅輑輬輯輱轄轱轺辂辌辑辖辜辝迢迥迦迨迴迵迼逅逜逞造過遻遻邭邰邵郆郈郘郘郚郜郡郢郧部郭郶鄖鄗鄗鄙鄯酃酃酃酤酩酪酮酲酷醅醇醎醕醶醶醽醽醽釁鈶鈷鉊鉕鉤鉫鉻銅銗銘銡銣銱銽鋁鋁鋘鋙鋜鋡鋥鋯錇錞鍄鍋鍓鍼鎄鎋鎗鎬鎬鏓鐥鐱鐱钴钷铜铝铝铞铬铭铷铻锃锅锆锫锿镐镐閣閭閭闆闾闾阁陨陪隕險險雊雒霣靈靈靈靠靣鞀鞊鞓鞛鞟韕韶韻頟頡頵頶頷顑顩顩颉颔颱飴飸餇餎餢饍饎馠駉駋駒駕駘駡駡駧駱騧驄驗驗驘驹驾骀骂骂骆骢骷骺骼髇髇髚髚髛髛髜髜髝髝髞髞髫髻鮈鮉鮐鮕鮚鮜鮥鮦鮰鮶鯃鯌鯙鯦鯨鰔鰝鰝鱔鱚鲐鲒鲖鲘鲪鲸鳝鴐鴝鴞鴣鴶鴼鴽鵅鵘鵠鶁鶉鶬鶮鶮鶰鶷鷕鸁鸪鸮鸲鹄鹑鹹鹼鹼麌麏麐麔麖麙麢麢麢麿麿黠黥黬鼅鼛鼦鼩鼯齁齝齠齣齪齬龆龉龊龗龗龗㐒㐖㐚㐭㐯㐯㑆㑸㒭㒭㓊㓢㓤㓧㔖㔛㔽㕆㕝㕻㖃㖔㖙㖛㖞㖣㖯㖰㖲㗉㗒㗗㗮㙅㙜㙜㙵㙵㚙㚚㚳㚾㛎㛎㛣㛾㜏㝄㝆㝇㝇㝒㝬㞻㟏㟒㟔㟕㟝㠋㠙㠰㢐㢛㢛㢠㢥㣍㣘㣚㣟㣬㣲㤎㤑㤧㤩㤳㤷㥉㥫㦍㦍㧝㧨㧵㧷㧸㨃㨔㩝㪊㪗㪟㪡㪣㪣㪨㪮㪮㪮㪾㫛㫥㬀㬖㬶㭣㮞㮫㰧㰴㰶㰹㱠㲅㲈㲒㲛㳓㳪㳭㴅㵆㵙㵛㵸㵸㶺㶽㷖㷚㷽㷿㷿㸀㸀㸑㸗㸛㸵㸸㹁㹢㹦㹱㹳㹾㺂㺾㻁㻈㻍㼋㼨㽛㽽㾂㾒㾔㾔㾦㾸㾸㿌㿌㿓䀇䀦䀩䁁䁍䁎䁒䁚䂋䂏䂒䂟䃄䄇䅂䅓䅮䆗䆚䆛䆬䇍䇏䇔䇢䇸䇹䈑䈞䊀䊅䋨䌞䌞䌹䍌䎁䎄䎊䎋䎌䎏䎧䎸䏸䏽䐕䐣䐧䐧䑦䑩䓀䓊䓏䓘䓡䓵䖗䘫䙼䚋䚛䛛䛡䛤䛮䝭䝶䝷䞅䞒䞤䞦䞧䞫䞳䟟䟫䠂䠖䠝䠟䠠䠺䡯䡼䡼䡼䢢䣞䣞䣱䣻䣼䣽䤌䤢䤧䦅䦖䦜䦣䧁䧂䧄䧊䧐䧚䧚䧫䧸䧺䧼䨓䩎䩎䩰䪪䪷䪽䫊䫓䫚䫟䫠䫿䬏䬘䬘䬭䬰䬲䭇䮏䮦䮦䯄䯞䯧䯨䯨䯩䯩䯪䯪䯫䯫䯬䯺䯻䯽䱽䲓䲓䳂䳝䴥䴺䵍䵱䵶䵹䶅䶜䶠䶢䶨䶨𠀷𠀹𠀿𠁏𠁐𠁝𠁯𠃳𠃳𠃹𠄇𠄩𠅧𠅧𠅮𠅳𠅹𠅽𠆃𠆃𠆌𠆓𠆔𠆙𠆞𠆠𠆡𠇶𠈂𠈮𠈲𠉉𠉐𠊝𠊭𠊰𠌳𠍂𠍈𠍒𠍙𠍭𠍻𠏓𠏓𠏦𠏧𠐄𠐖𠐖𠐘𠐘𠐥𠐨𠐪𠐪𠑁𠑁𠑃𠑐𠑐𠑜𠑮𠑲𠑲𠑲𠑲𠑵𠑽𠒟𠒦𠒦𠒨𠓆𠓆𠓘𠓬𠔦𠔺𠕕𠕧𠕧𠖄𠖠𠖷𠗂𠗐𠗪𠚌𠚟𠛎𠜏𠜜𠜯𠞟𠞟𠞴𠞺𠟎𠟎𠟐𠟤𠠢𠠢𠠢𠡇𠡉𠡋𠡐𠡧𠢆𠢋𠣪𠣪𠣫𠣫𠣭𠤳𠤾𠤿𠥀𠥐𠥝𠥟𠥧𠧅𠧈𠧉𠧎𠧎𠧑𠧙𠧨𠧬𠨄𠨩𠩣𠩥𠩭𠪔𠬇𠬓𠬱𠭖𠭞𠭤𠭤𠮀𠯃𠯉𠯌𠯛𠰉𠰐𠰛𠰞𠰞𠰶𠱷𠲛𠲢𠲩𠲭𠲰𠳂𠳇𠳙𠳝𠳢𠳫𠳬𠳬𠳮𠳮𠳯𠳯𠳳𠳺𠴊𠴊𠴔𠴣𠴦𠴰𠵀𠵁𠵊𠵗𠵛𠵞𠵠𠵥𠵦𠵬𠵲𠵳𠶇𠶛𠶮𠶮𠶱𠶶𠶻𠷏𠷜𠷞𠷣𠷥𠷪𠷫𠷫𠷻𠸆𠸈𠸈𠸉𠸗𠸙𠸛𠸜𠸮𠸸𠸿𠹗𠹚𠹜𠹞𠹢𠹩𠹪𠹪𠹫𠹬𠹾𠺇𠺞𠺥𠺯𠻇𠻖𠻝𠻮𠼋𠼑𠼑𠼘𠼧𠼨𠼨𠼨𠼨𠼷𠼷𠼿𠽘𠽻𠽻𠾂𠾄𠾅𠾈𠾉𠾓𠾖𠾖𠾖𠾖𠾖𠾠𠾹𠿲𡀆𡀈𡀈𡀉𡀋𡀋𡀪𡀻𡁁𡁉𡁍𡁥𡁥𡁩𡂇𡂇𡂬𡂯𡂽𡂽𡃋𡃟𡃟𡃟𡃠𡃨𡄀𡄀𡄂𡄅𡄅𡄅𡄉𡄉𡄜𡄜𡄝𡄝𡄝𡄝𡄞𡄞𡄠𡄰𡄱𡄲𡄹𡄹𡄹𡄹𡄿𡄿𡅄𡅐𡅕𡅕𡅕𡅕𡅖𡅛𡅝𡅝𡅡𡅤𡅦𡅮𡅱𡅱𡅱𡅱𡅸𡅹𡅽𡅽𡅽𡅽𡅾𡅾𡆊𡆐𡆒𡆛𡆛𡇣𡇪𡇷𡈧𡈨𡈨𡈨𡈨𡊗𡊜𡊦𡊱𡋐𡋐𡋑𡋑𡋙𡋥𡋿𡋿𡌃𡌢𡌬𡌲𡌿𡍸𡎎𡐈𡐒𡐫𡑏𡑯𡑯𡒅𡒋𡒋𡒒𡒝𡒩𡒼𡒼𡓑𡓑𡓣𡓶𡓶𡓶𡓶𡔊𡔊𡔗𡔗𡔗𡔗𡔠𡔢𡔤𡔦𡔧𡔮𡔯𡔯𡔼𡕇𡕇𡕇𡕉𡕉𡕊𡕍𡖚𡖤𡖺𡖿𡘯𡙗𡙬𡚍𡛮𡜓𡜓𡜝𡜩𡜲𡜶𡜺𡝗𡝚𡝜𡞈𡞣𡟐𡟓𡟲𡠀𡠀𡠮𡠴𡠾𡡍𡡿𡢐𡢠𡢡𡢳𡣏𡣰𡣿𡥙𡥹𡥺𡥾𡦚𡦛𡦟𡦡𡦨𡦩𡦩𡦬𡧣𡧻𡨂𡨟𡩸𡪁𡪑𡪭𡪻𡫡𡫫𡫲𡫴𡫴𡫸𡫹𡬋𡬑𡬣𡬱𡭅𡭸𡮎𡮞𡯳𡯷𡯽𡰗𡰜𡱈𡱠𡱨𡱶𡱶𡱺𡲞𡲻𡲻𡳄𡳎𡳎𡳏𡳛𡳰𡳴𡴗𡴗𡶅𡶆𡶐𡶝𡶢𡶥𡷂𡷥𡷧𡷿𡹞𡹡𡹬𡹯𡺣𡺩𡻖𡻫𡻵𡼎𡼑𡽗𡽗𡾆𡾘𡾳𡾴𡾴𡿵𢀆𢁏𢁾𢂁𢂋𢂓𢂽𢃆𢄗𢄙𢄰𢅃𢅐𢅐𢆖𢇊𢇺𢈆𢈉𢈚𢈚𢈪𢈴𢉰𢉰𢊂𢊉𢊙𢊬𢋌𢋌𢋕𢋖𢋢𢋾𢌓𢌥𢍎𢍯𢎅𢎋𢏆𢏕𢑅𢑦𢑪𢑸𢑸𢒷𢓜𢓲𢔊𢕮𢖂𢘾𢙍𢙛𢙲𢙲𢙵𢚟𢚺𢛍𢜔𢜥𢜩𢜱𢜺𢝋𢝜𢝟𢝨𢝸𢞋𢞐𢞟𢞟𢞩𢞮𢠃𢠑𢠒𢢆𢢤𢢸𢣉𢣬𢤌𢤓𢤘𢤶𢥿𢦮𢦯𢦽𢧃𢧄𢧆𢧒𢧘𢧜𢨅𢨊𢨔𢨔𢨟𢨟𢨠𢨠𢩁𢩋𢩍𢩙𢩙𢩝𢪶𢪿𢫃𢫈𢬚𢬢𢬸𢭹𢭻𢮏𢯙𢰈𢰈𢰸𢱆𢱪𢱪𢲃𢲚𢲤𢲤𢴅𢴌𢴒𢴖𢴙𢴨𢵈𢵾𢶝𢹝𢹝𢹝𢹲𢻇𢻊𢻋𢻋𢻓𢻜𢻡𢼉𢼒𢼙𢼛𢼣𢽍𢽏𢽤𢽿𢾊𢾛𢾠𢾵𢾷𢿀𢿃𢿩𢿪𣀄𣀆𣀌𣀌𣀖𣁀𣁔𣁘𣂄𣂋𣂳𣂴𣃫𣄝𣄝𣄸𣅷𣅻𣅿𣇉𣇊𣈻𣉈𣉞𣉞𣉻𣊋𣋄𣌐𣌺𣍀𣍦𣍵𣐒𣐞𣑅𣑌𣑐𣑩𣑸𣑾𣒅𣒌𣒙𣒩𣒱𣓌𣓡𣓡𣔇𣕽𣖋𣖎𣖤𣖥𣖻𣗺𣗼𣘉𣘺𣘼𣙅𣙎𣙐𣙐𣙛𣙤𣙳𣙼𣚌𣚍𣚧𣚩𣚩𣚷𣛗𣜄𣜕𣜘𣜞𣜟𣜟𣞃𣞘𣞘𣞥𣞱𣞸𣟉𣠄𣠐𣠪𣡈𣡥𣡳𣡺𣢨𣢷𣢺𣣄𣣊𣣶𣣿𣤐𣤒𣤭𣤽𣤽𣤽𣤽𣥔𣧬𣧮𣧳𣨉𣨓𣨕𣨕𣨣𣨨𣨱𣨷𣩅𣩅𣩧𣩺𣪆𣪇𣪢𣪪𣫀𣫊𣫍𣫍𣬑𣬒𣬸𣭆𣭊𣭋𣭎𣭖𣭠𣭨𣮃𣮘𣮢𣯃𣯖𣯖𣯙𣲳𣳂𣳖𣴠𣵗𣵞𣵯𣵰𣵴𣵶𣵿𣶜𣶞𣶱𣷓𣷧𣸿𣺪𣺰𣻂𣻅𣻩𣻲𣻵𣻼𣼞𣼲𣼶𣽋𣽢𣽦𣽴𣽸𣽺𣾪𣾾𣾿𣿛𣿠𤀅𤀅𤀅𤀗𤀗𤀙𤁆𤂟𤂫𤃩𤃩𤃩𤅚𤅝𤅫𤅫𤅫𤅭𤅭𤅻𤅻𤅻𤅾𤅾𤇞𤈟𤈶𤈸𤉙𤉚𤉮𤉵𤉿𤊜𤊸𤋐𤋔𤋤𤋥𤌕𤌕𤌻𤌻𤌾𤌾𤍥𤍷𤍸𤎗𤎿𤎿𤏂𤏕𤏴𤐭𤐮𤐶𤑩𤒒𤒞𤒷𤒷𤓕𤔎𤔑𤔑𤔓𤕈𤕈𤕈𤕈𤕍𤕍𤕻𤖠𤖥𤖥𤖥𤖲𤖵𤖾𤗁𤗏𤗞𤘽𤙄𤙑𤙓𤙣𤚥𤚦𤚧𤚬𤚸𤚸𤚹𤛰𤜁𤞑𤞜𤞥𤞪𤞪𤞺𤞻𤞼𤠆𤠔𤠖𤠖𤠬𤠬𤡇𤢀𤢃𤢭𤣍𤣍𤣍𤥁𤥐𤥢𤥯𤦿𤧗𤧟𤧱𤧼𤧼𤨷𤩉𤩠𤪁𤪗𤪛𤪛𤪡𤪡𤫊𤫊𤫊𤫱𤫳𤫶𤬃𤬋𤭁𤭆𤭑𤭙𤭚𤭞𤮩𤮮𤮮𤮮𤮸𤮸𤮸𤯥𤰉𤰎𤱠𤲇𤲇𤲊𤲽𤳧𤳧𤴂𤴐𤴐𤴤𤴤𤴤𤵪𤵱𤵹𤶕𤶧𤶭𤶲𤶳𤶷𤶺𤶾𤷑𤷦𤸔𤸖𤸥𤸫𤸷𤹄𤹦𤺡𤺦𤺪𤺵𤼗𤼯𤽥𤽱𤾌𤾘𤾘𤾙𤾻𤾻𤾻𤿛𤿞𤿠𤿩𥀑𥀖𥀚𥀜𥁏𥁐𥁓𥁯𥂠𥂡𥂤𥂧𥂩𥂷𥃘𥃝𥃡𥃡𥅠𥆃𥆅𥆐𥆡𥆪𥆫𥆻𥆻𥆽𥇜𥇭𥈈𥈓𥉭𥊳𥌼𥌼𥌼𥍩𥍱𥎄𥎆𥎿𥏍𥏒𥏯𥏲𥏹𥏹𥏿𥐔𥑆𥑎𥑛𥑮𥒊𥒖𥒭𥒾𥓂𥓅𥓅𥓟𥔇𥖓𥖓𥖕𥖕𥖰𥖰𥖷𥗃𥗃𥗈𥗑𥘀𥘀𥘮𥙉𥙐𥙙𥙦𥙯𥚁𥚍𥚟𥚠𥚣𥚭𥚽𥛂𥛍𥛒𥛒𥜉𥜋𥜋𥜘𥜢𥜧𥜧𥜧𥜭𥜮𥝿𥞏𥞚𥞡𥞴𥞶𥞺𥟊𥠁𥠆𥠋𥠣𥡺𥢀𥢑𥢗𥢟𥢵𥢿𥣂𥣂𥣱𥤙𥤙𥥖𥦮𥦿𥧐𥧷𥧺𥨵𥨷𥨸𥩓𥩪𥩮𥪅𥪇𥪜𥪩𥪾𥬡𥭠𥭩𥭽𥮑𥮷𥯌𥯒𥯢𥯲𥰈𥰔𥰶𥱠𥲔𥲞𥲮𥳂𥴀𥴿𥵈𥶚𥶟𥶤𥶧𥶧𥶽𥷡𥷡𥷷𥷼𥸇𥸇𥸏𥸏𥹋𥹌𥹙𥹡𥺆𥺊𥺏𥺓𥺓𥺔𥺖𥺨𥻀𥻇𥻓𥻱𥻲𥻽𥽋𥽋𥿃𥿍𥿨𦀡𦀲𦀽𦂃𦂆𦂑𦃅𦃆𦃹𦄃𦄛𦄛𦄞𦅚𦅹𦆁𦈶𦉅𦉅𦉝𦉢𦉢𦉢𦉣𦉣𦉣𦉩𦊒𦊖𦊙𦊟𦊯𦊲𦊼𦊼𦊾𦋑𦌦𦌺𦍬𦎧𦎫𦐛𦐦𦐸𦑘𦑰𦒭𦒭𦓂𦓄𦓄𦓠𦓱𦓲𦔐𦔝𦕙𦕾𦖱𦗢𦗶𦗹𦗹𦗻𦗼𦗼𦘉𦙲𦙶𦙺𦚊𦚔𦛃𦛉𦛋𦛜𦛽𦜀𦜟𦜵𦝔𦝞𦞁𦞛𦞶𦟈𦟧𦢁𦢗𦢱𦢼𦣄𦣉𦣖𦣙𦣙𦣷𦣷𦣷𦤘𦤬𦥉𦦌𦦟𦦡𦦧𦦬𦦶𦦻𦧁𦧒𦧞𦧨𦧨𦧩𦧮𦨣𦨦𦨳𦨴𦨾𦩜𦩢𦪐𦪳𦫃𦫃𦫃𦫩𦫩𦫮𦬺𦮥𦮶𦮽𦯇𦯐𦯚𦰉𦰉𦰶𦱕𦱡𦱩𦲆𦳖𦳦𦴒𦴦𦴨𦴰𦴳𦵎𦵙𦵯𦶔𦶡𦷓𦸉𦸜𦸭𦸮𦸴𦹂𦹊𦹒𦹛𦹠𦹯𦹵𦹾𦺎𦺑𦻋𦻸𦻸𦻸𦽺𦽺𦾆𦾊𦾰𦿣𦿣𧁗𧁛𧁝𧁺𧂆𧂆𧂘𧂘𧂨𧃄𧃪𧃼𧃼𧃼𧃿𧄉𧄪𧄪𧄯𧅡𧅧𧅾𧆍𧆻𧇉𧇌𧇡𧇮𧇱𧇴𧉟𧉪𧊀𧊅𧊚𧊛𧊟𧋋𧋓𧋥𧋩𧋸𧋻𧌬𧌲𧍚𧍧𧍩𧍾𧎏𧎴𧎸𧎸𧏜𧐉𧐋𧐌𧐢𧑭𧑭𧑱𧑱𧔺𧕁𧕁𧕁𧕅𧕅𧕅𧕔𧕔𧖥𧖳𧖼𧙅𧙎𧙖𧙗𧙥𧙪𧙺𧚖𧚾𧚾𧛡𧛷𧜅𧜉𧜉𧜘𧜯𧝐𧝹𧞜𧞟𧠃𧠃𧠜𧠯𧠲𧠼𧡐𧡳𧢈𧢥𧢥𧢥𧤀𧤮𧤮𧥉𧥙𧥙𧥚𧥚𧦢𧦤𧦲𧧏𧨑𧨡𧩢𧪎𧪼𧬆𧬍𧭒𧭶𧮜𧮥𧮥𧮥𧮴𧮶𧯃𧯆𧯠𧯩𧯻𧰄𧱁𧲇𧲙𧲙𧲙𧲿𧳆𧳎𧳏𧳷𧵀𧵎𧵑𧵓𧶆𧶊𧶏𧶒𧶔𧶗𧶺𧷝𧷞𧷭𧷯𧷯𧷴𧷶𧸘𧸘𧸫𧹓𧹣𧹤𧺸𧻅𧻢𧻰𧻳𧻻𧼁𧽛𧽜𧽮𧽴𧾏𧾏𧾔𧾫𧾮𧾮𧾮𧾸𧾺𧿀𧿃𧿮𧿽𧿿𨀂𨀌𨀙𨀜𨀲𨀶𨀽𨁀𨁇𨁎𨁒𨁘𨁛𨁢𨁥𨁮𨁰𨂙𨂝𨂞𨂢𨂣𨂬𨃂𨃗𨃞𨃢𨃤𨃤𨃧𨃧𨃨𨃫𨃱𨃲𨃾𨄘𨄚𨄝𨄟𨄡𨄦𨄬𨄯𨅇𨅇𨅐𨅘𨅙𨅚𨅠𨅳𨅴𨅻𨆊𨆐𨆑𨆕𨆘𨆘𨆜𨆥𨆧𨆪𨆬𨆬𨆻𨇌𨇐𨇓𨇕𨇘𨇙𨇛𨇜𨇫𨇭𨈰𨈳𨈹𨉌𨉫𨉫𨉬𨉲𨉲𨊊𨌋𨌒𨍋𨍢𨎄𨎄𨎈𨎏𨎣𨏯𨏸𨐒𨐓𨐗𨐚𨐹𨑂𨑂𨑂𨒄𨒐𨒡𨓈𨓐𨓐𨓲𨓺𨔏𨔓𨔖𨔗𨔴𨔺𨔺𨕎𨕔𨕬𨕬𨖄𨖍𨖗𨗁𨗈𨗚𨗞𨗡𨗦𨗦𨗲𨗷𨘂𨘫𨘰𨘰𨘵𨚞𨚧𨚯𨚴𨚷𨛔𨛠𨛢𨛣𨛦𨜋𨜝𨜝𨜾𨝃𨝚𨞗𨞴𨟍𨟞𨟮𨟮𨟮𨠺𨡞𨡥𨢓𨢓𨢗𨢗𨢮𨢰𨢱𨣁𨣳𨣳𨤯𨥰𨥽𨦀𨦔𨦸𨦽𨧃𨧆𨧐𨧡𨧤𨨑𨨛𨩗𨩟𨩲𨪃𨪟𨪟𨪵𨫓𨫰𨫰𨫴𨬙𨬤𨬧𨬱𨭎𨭓𨭯𨭳𨮙𨮤𨮯𨮾𨯜𨯨𨯺𨯻𨯻𨯻𨰷𨱉𨱴𨱻𨲃𨳾𨴀𨴏𨴬𨵧𨵾𨶆𨶎𨶖𨶴𨷰𨷰𨷰𨸭𨸮𨹙𨹦𨹬𨹬𨹭𨹸𨹿𨺃𨺱𨺷𨻠𨼄𨼈𨼩𨼶𨼶𨾃𨾱𨾵𨿅𨿟𨿡𨿦𩀞𩀢𩀢𩀣𩀣𩁁𩁁𩁁𩁁𩂣𩂿𩄺𩅖𩅗𩅼𩅼𩆒𩆒𩆒𩆕𩆕𩆕𩆖𩆖𩆖𩆚𩆚𩆚𩆞𩆞𩆞𩆻𩆻𩆻𩆼𩆼𩆼𩇄𩇄𩇄𩇊𩇎𩇎𩇎𩇑𩇓𩇓𩇵𩇷𩇸𩇺𩈣𩈤𩉿𩊉𩊏𩊗𩊚𩋺𩋻𩌚𩌚𩌡𩌡𩌤𩍤𩍯𩍯𩎏𩎏𩎏𩎞𩎣𩎬𩏓𩏩𩏩𩐄𩐝𩐤𩐧𩐩𩐴𩑇𩑇𩑲𩑶𩑼𩒇𩒎𩒗𩒲𩒻𩒾𩓃𩓴𩔄𩔻𩕄𩕈𩕊𩕠𩕴𩕿𩕿𩖄𩖄𩖆𩖆𩖊𩖊𩖊𩖑𩗇𩗊𩗨𩗬𩘁𩙮𩙮𩙷𩙷𩛴𩛶𩛷𩜻𩝄𩝈𩞒𩞓𩞛𩡔𩢘𩢠𩢪𩢱𩢴𩣉𩣖𩣚𩤙𩤥𩤬𩥊𩥊𩥌𩥳𩥺𩥺𩦇𩦐𩦬𩧀𩧣𩧲𩧵𩨆𩩅𩩑𩩔𩪃𩪿𩪿𩫀𩫀𩫁𩫁𩫂𩫂𩫃𩫄𩫄𩫅𩫅𩫆𩫆𩫇𩫇𩫈𩫈𩫉𩫉𩫊𩫊𩫋𩫋𩫌𩫌𩫌𩫍𩫍𩫎𩫎𩫏𩫏𩫐𩫐𩫑𩫑𩫓𩫓𩫕𩫕𩫖𩫗𩫗𩫗𩫘𩫘𩫙𩫙𩫚𩫚𩫛𩫛𩫜𩫜𩫝𩫝𩫞𩫞𩫟𩫟𩫠𩫡𩫡𩫢𩫢𩫣𩫣𩫣𩫤𩫤𩫥𩫥𩫦𩫦𩫧𩫨𩫩𩫪𩫪𩫫𩫬𩫬𩫭𩫮𩫮𩫯𩫰𩫱𩫲𩫲𩬠𩬩𩭍𩭖𩭚𩭜𩮏𩮑𩮘𩮘𩮝𩮩𩰂𩰂𩰂𩰆𩰆𩰯𩱍𩱒𩱡𩲤𩲥𩲱𩳊𩳌𩳝𩳺𩵀𩵀𩵀𩶛𩶯𩷣𩷵𩸬𩸴𩹇𩹢𩹫𩹯𩺑𩺑𩺙𩺙𩺢𩺦𩻂𩼺𩿡𩿵𪀁𪀊𪀟𪀭𪁄𪁆𪁙𪁝𪁟𪁣𪁳𪁳𪂎𪂘𪂶𪃀𪃘𪃜𪄍𪄍𪄨𪄼𪅺𪆇𪆡𪆾𪆾𪇇𪇇𪈀𪈀𪈃𪈋𪈋𪈍𪈝𪈝𪈝𪉳𪉶𪉷𪊪𪊲𪊺𪋓𪋓𪋓𪋦𪋦𪋦𪋦𪋶𪋶𪋶𪌕𪌢𪌣𪌦𪌧𪌺𪍌𪍶𪍼𪎩𪎼𪏆𪏚𪏻𪐊𪑑𪑒𪑜𪑬𪑵𪑵𪒈𪒧𪒫𪒫𪒵𪒸𪓁𪓞𪓟𪓡𪓪𪔈𪔐𪔓𪔘𪔚𪔤𪔩𪔪𪕍𪕖𪕘𪕙𪕛𪕝𪕡𪖝𪖠𪗬𪗸𪗾𪘇𪘊𪘍𪘏𪘒𪘚𪘢𪙃𪙎𪙏𪚶𪛈𪛈𪛈𪜇𪜇𪜒𪜦𪜯𪝁𪞄𪞉𪞎𪞟𪞨𪞯𪟑𪟔𪟔𪟗𪟚𪟣𪟣𪟴𪠅𪠗𪠛𪠛𪠬𪡅𪡅𪡉𪡉𪡍𪡎𪡐𪡐𪡕𪡜𪡬𪡮𪡯𪡰𪡰𪡳𪡳𪡻𪡼𪡼𪢁𪢇𪢈𪢏𪢛𪢟𪢡𪢢𪢣𪣔𪣠𪣣𪣹𪤇𪤯𪤯𪤳𪥒𪥚𪥜𪥜𪥳𪦔𪧃𪧊𪧎𪧱𪨈𪨎𪨓𪨓𪨡𪨸𪨹𪩥𪩧𪩳𪪒𪪓𪪚𪫃𪫎𪫪𪫰𪫰𪬋𪬣𪬧𪬳𪭙𪭛𪭛𪭷𪭸𪮐𪮥𪮬𪯒𪯙𪯟𪯟𪯟𪯟𪯪𪯪𪯬𪯮𪯾𪰘𪰙𪰻𪱋𪱜𪱧𪱫𪲉𪲖𪲶𪳄𪳏𪳏𪳓𪴋𪴢𪴻𪵔𪵙𪵾𪶦𪶼𪷡𪸚𪸝𪸧𪸬𪸰𪸲𪸿𪹐𪹑𪹬𪹬𪹱𪺎𪺠𪻕𪻛𪻥𪼫𪽀𪽰𪾂𪾍𪾥𪾨𪿍𪿕𪿘𫀈𫀖𫀞𫀱𫁋𫁝𫂛𫃇𫃥𫄡𫄺𫅊𫅖𫅜𫅞𫅡𫅳𫆅𫇖𫇯𫈀𫈗𫈠𫈮𫉕𫉩𫊇𫋊𫋊𫋏𫋮𫌝𫌩𫍋𫍣𫍩𫍯𫍻𫎗𫎡𫎧𫎴𫏀𫏁𫏂𫏃𫏄𫏅𫏆𫏇𫏈𫏉𫏉𫏊𫏋𫏌𫏍𫏎𫏏𫏐𫏑𫏒𫏓𫏔𫏕𫏖𫏗𫏘𫏙𫏚𫏛𫏜𫏝𫏞𫏟𫏠𫏡𫏢𫏣𫏤𫏥𫏦𫏧𫏨𫏩𫐢𫑉𫑌𫑑𫑥𫒐𫓼𫔜𫕁𫕖𫕥𫖎𫖭𫖲𫖳𫗓𫗡𫗷𫘍𫘢𫘵𫘵𫘶𫘶𫘷𫘷𫘿𫙩𫚔𫚾𫛤𫛪𫛫𫜍𫜖𫜝𫜝𫜯𫝉𫝛𫝴𫝷𫝻𫞃𫞉𫞎𫞏𫞮𫟅𫟘𫟙𫟣况咢咢圖柺浩𣾎瀛爨𫡬𫡽𫡽𫢁𫢂𫢃𫢃𫢄𫢧𫢷𫢼𫣬𫤉𫤉𫤜𫤝𫤟𫤣𫤲𫤺𫥈𫥘𫥩𫥮𫦛𫦛𫦥𫦹𫦹𫦹𫧂𫧉𫧒𫧕𫧗𫧡𫧯𫨒𫨒𫨓𫨓𫨝𫨣𫨩𫨿𫩂𫩊𫩊𫩙𫩙𫩞𫩲𫪔𫪕𫪟𫪟𫪠𫪠𫪡𫪡𫪣𫪦𫪨𫪸𫪹𫫌𫫌𫫎𫫑𫫘𫫘𫫹𫬊𫬋𫬋𫬌𫬌𫬌𫬑𫬕𫬙𫬚𫬡𫬢𫬪𫬮𫬯𫬰𫬰𫬲𫬲𫬲𫬲𫬳𫬸𫬽𫬽𫬽𫬽𫭉𫭐𫭐𫭐𫭦𫭸𫮌𫮶𫮷𫮺𫯆𫯤𫰚𫰳𫱄𫱍𫱖𫱙𫱦𫲒𫲚𫲚𫲚𫲢𫲤𫲰𫲾𫳛𫳧𫳩𫳶𫳸𫴓𫴓𫴕𫴙𫴢𫵂𫵥𫵭𫶴𫶴𫶷𫶷𫷭𫷶𫸇𫸫𫸯𫹀𫺃𫺐𫺔𫺛𫺢𫺾𫻇𫻈𫻝𫻝𫻝𫻡𫻡𫻵𫼅𫼰𫼴𫼴𫼹𫽞𫽟𫽭𫾖𫾣𫾣𫾪𫾵𫿀𫿄𫿄𫿅𫿎𫿜𫿵𫿵𫿽𬀇𬀥𬀬𬁽𬂁𬃋𬃬𬄥𬄶𬅠𬅥𬅬𬅯𬆁𬆏𬆗𬆧𬆺𬆻𬇎𬇎𬇢𬇱𬈌𬈠𬈯𬉌𬉖𬉩𬉱𬊒𬊣𬊧𬋜𬋜𬋣𬋣𬋣𬌑𬌞𬌞𬍘𬍣𬍳𬍹𬍽𬎊𬎜𬎜𬎢𬎯𬎯𬏐𬏐𬏨𬏮𬐊𬐏𬐨𬑂𬑝𬑣𬑣𬑯𬒍𬒖𬒷𬒺𬒽𬓔𬔉𬔉𬔎𬔠𬔽𬕃𬕞𬕪𬕪𬖊𬖙𬖰𬖰𬖿𬗍𬗏𬗶𬘍𬘣𬘤𬘤𬘯𬘻𬙳𬙽𬙿𬚁𬚃𬚋𬚖𬚤𬚫𬚻𬛨𬜁𬜃𬜋𬜐𬜐𬜕𬜬𬜰𬜵𬝇𬝓𬞁𬞑𬞗𬟚𬟢𬠉𬠑𬠗𬡝𬡣𬡧𬢂𬢧𬢧𬣁𬣬𬣮𬣹𬤫𬤿𬥀𬥘𬥙𬥤𬥩𬦉𬦐𬦠𬦡𬦢𬦣𬦤𬦥𬦦𬦧𬦨𬦨𬦩𬦪𬦪𬦫𬦬𬦭𬦮𬦯𬦰𬦱𬦲𬦳𬦴𬦵𬦶𬦷𬦸𬦹𬦺𬦻𬦼𬦽𬦾𬦿𬧀𬧁𬧂𬧃𬧄𬧅𬧆𬧇𬧈𬧉𬧊𬧋𬧌𬧍𬧎𬧏𬧐𬧑𬧒𬧒𬧓𬧔𬧕𬧖𬧗𬧘𬧙𬧚𬧛𬧜𬧝𬧞𬧟𬨦𬨨𬨹𬩀𬩀𬩕𬩙𬩟𬩧𬩭𬪒𬪰𬪳𬫈𬫚𬫜𬫠𬫷𬬉𬬿𬭀𬭅𬭌𬭚𬭪𬭱𬭳𬮂𬮳𬯗𬯱𬰑𬰑𬰑𬰛𬰜𬰭𬱃𬱈𬱌𬱑𬱑𬱑𬱑𬱞𬱞𬱤𬱩𬱰𬱱𬲈𬲔𬲯𬳀𬳮𬳶𬴕𬴕𬴙𬴙𬴚𬴚𬴛𬴜𬴝𬴝𬴞𬴞𬴟𬴟𬴠𬴡𬴢𬴣𬴤𬴥𬴦𬴦𬴳𬴳𬴻𬵔𬵵𬵼𬵼𬶋𬶔𬶜𬶮𬷍𬷎𬷑𬸇𬹎𬹏𬹰𬺍",
 "凵": "兇匈咄噛婳屆屈屰忁忷悩拙昢朏柮欪汹泏炪础祟窋笜粜絀绌脳茁蚩蟗袦訩詘讻诎貀趉辥酗鈯韷飿黜齢㐫㑁㒴㔘㕳㚃㚇㞣㤕㴠㽾䂐䖓䖦䠳䢺䪼䭯𠀴𠂳𠒄𠕐𠘼𠙕𠙭𠚐𠚛𠚛𠚛𠚟𠣲𠥱𠦨𠩃𠩉𠪭𠫻𠭳𠭴𠯃𠰕𠲫𠵶𠵾𠷛𠺤𠺤𡈫𡈱𡉰𡌜𡎫𡏸𡑥𡒈𡒐𡔼𡕂𡕃𡕉𡕜𡖴𡗡𡘶𡛛𡞿𡣼𡧨𡫹𡫾𡫾𡭧𡭱𡭲𡮖𡲒𡲗𡲬𡲶𡳒𡳼𡴁𡴂𡴃𡴅𡴆𡴇𡴊𡴋𡴍𡴎𡴏𡴐𡴑𡴒𡴔𡴕𡴖𡴗𡴙𡴚𡴚𡴛𡴜𡴝𡴞𡴤𡴥𡴦𡴧𡴪𡴪𡴫𡴫𡴫𡶏𡶸𡸐𡹏𡽈𢅇𢇿𢊝𢋱𢖚𢗮𢙦𢚰𢛯𢝿𢝿𢞊𢞪𢟃𢟃𢢡𢥟𢭧𢮬𢰔𢰛𢶗𢶵𢹯𢼍𢽅𢽌𢽘𢾈𢾍𢾕𣀎𣂟𣂯𣂲𣅽𣉱𣊻𣋦𣋧𣋧𣌇𣌇𣌑𣍧𣍶𣐯𣕿𣞡𣣨𣦧𣦬𣧑𣧪𣪹𣭑𣳸𣶧𣶩𣹨𣺥𣺥𣽶𣿗𣿲𤄗𤅻𤈤𤉞𤋪𤏺𤑥𤒁𤒺𤓊𤔠𤜌𤝒𤠀𤢝𤬷𤬼𤱟𤵅𤸿𥀉𥄾𥅢𥎐𥙋𥚢𥜺𥜾𥞃𥟛𥣼𥨺𥪃𥫋𥫋𥺋𥼈𥽀𥾜𦆰𦆰𦋣𦋦𦗷𦙄𦙞𦛳𦠠𦣃𦤙𦨥𦪰𦬏𦱞𦱴𦴻𦵛𦸶𦸹𦻤𦻤𦻭𦽠𧀼𧆣𧇏𧈪𧒥𧗭𧘫𧘮𧙉𧙦𧟊𧧣𧪗𧫨𧬉𧬲𧭁𧮔𧰹𧵠𧷊𧷓𧷲𧷵𧸞𧸟𧼶𧿖𧿺𨋡𨌗𨍔𨒞𨒯𨔢𨖮𨗯𨘹𨛝𨝇𨞍𨥍𨧓𨪡𨱄𨱦𨲶𩂗𩌮𩍞𩍽𩎇𩎢𩕣𩕵𩖷𩟜𩢎𩤍𩤍𩪨𩬢𩴭𩴭𩶌𩼡𩿩𪉷𪏫𪐽𪓶𪗊𪗨𪗱𪘂𪘚𪙒𪞷𪞹𪞺𪨀𪨕𪫜𪲵𪽗𫀛𫒶弢𫡺𫤧𫥤𫥦𫥧𫥨𫥫𫥬𫥭𫽇𬁹𬅯𬑎𬢩𬤼𬥑𬩐𬬜𬮉𬯭𬹴",
 "㐅": "伛俙倄兇刚刹剎匈呕唏奁妪嫓岖岗崤弑弒忷怄恡悕悩抠敎晞枢桸樊樊欎欎欧欷殴殺殽汹沤浠淆烯燓燓狶琋瓯瓻眍睎硵禼稀絺纲脎脪脳苅莃訩誵讴讻豨躯郄郗郩酗鎫鐢鐢钢铩閷餙餚駆驱鬰鬰鯑鴎鵗鸥㐫㕁㕳㖁㚃㚇㛓㟓㧏㭎㮁㹷㾙䋄䖷䛥䝙䤭䮎𠂳𠌁𠙆𠙏𠙭𠛅𠜗𠧟𠨄𠨚𠫷𠳈𠳱𠴳𠴷𠵶𠷛𡉰𡏸𡑀𡑀𡒐𡔼𡕂𡕃𡡴𡡴𡢓𡮱𡯤𡯮𡶱𢒻𢒻𢓬𢗮𢘹𢙦𢚰𢛘𢝿𢡟𢡟𢫬𢫿𢬾𢽌𢿑𣌇𣌇𣍶𣑆𣗅𣛍𣛍𣝴𣝴𣞡𣠈𣠈𣠧𣠧𣠫𣠫𣡄𣡄𣡇𣡇𣡜𣡜𣧑𣱬𣳸𣶧𤀚𤈤𤉶𤎦𤐳𤕩𤕩𤚁𤵅𤷤𥅢𥐻𥖎𥖎𥖯𥖯𥜾𥟛𥤔𥭘𥲓𥴎𥵭𥾜𦉤𦉤𦊕𦊖𦖁𦙄𦙞𦝹𦠼𦦎𦦎𦧀𦧀𦻤𦻤𧅫𧅫𧈿𧎙𧓡𧗫𧘮𧢎𧢎𧢣𧢣𧦅𧧣𧳐𧵧𧶖𧻶𧼡𧿖𨊾𨓇𨡂𨡜𨥍𨧓𨪡𨳠𨶓𨸟𨿕𨿛𩊽𩒽𩭉𩲺𩳃𩳘𩴭𩶼𩺕𪀣𪁡𪊭𪊱𪋤𪋤𪌹𪑂𪖥𪖪𪘱𪚴𪟮𪦂𪲽𪽺𫂿𫄨𫇪𫊷𫋲𫚅𫜊𫠗𣻑𫤧𫤭𫥦𫨖𫩚𫭟𫸩𫹇𫼵𫾼𫿟𫿟𬁵𬂮𬃈𬃈𬅖𬅖𬅙𬅙𬅴𬅴𬇈𬉼𬋡𬋡𬍉𬍉𬔯𬗤𬚰𬛽𬛽𬠰𬠰𬡕𬤼𬥑𬧶𬧶𬨥𬩻𬪧𬮶𬯭𬳁𬵼𬸌𬸵𬸶𬸷𬸸𬸹",
 "大": "仸侉俺倚倴倷偄偧关刳剞剦匎匏匲吞吴呑呔咽哒唵喯喹噢奣奲妖姱姻婍媄媆宎寄尜岆岙崎崦嵄嶴幂庵徛忲态恗恩惨愞懊扷挎挞捹捺掎掩掺撦撪擙攀攥攲敧旑旖昊昋晇晻曓枖栶桍桳椅椮楏橂檶櫏欭欹殀殗毵毶氤汰沃沗洇洿淹渀渏渗渜渼湙澳烟煃煗燠猗珚琦瑌瓠畸痷瘆癸皋盇睳矨硽碕碜碝磸礇礬祅祆秗秵稬穾笑筃粏糁絝絪綔綺緛绔绮罨羹肽胭胯腌腝舦舿芺茵荂荙莫莾菴萘葢薁蚕蝅蝅蝡蝰蠜蠺蠺袄袴裀裺裿襖觭訞誇譇跃跨跶踦躚躸躾軚輢輭輽迏迗逩郀鄭酞醃鈦銙銦錛錡錼鍷鎂鐭钛铟锛锜镁镺閹闼阉陓陭陾隩鞇鞑韆飫餣餪餴馣駄駰騎骃骑骖骻鮬鯵鲹鴁鴌鴮鵪鵸鹌黤黪齮龑㐡㑀㒎㓇㓴㕭㖠㗺㘻㚡㚡㛪㛻㜩㞄㞆㞟㟢㟥㠗㡁㡋㡍㡎㢊㣖㤁㤇㤒㤿㥓㥣㦋㧢㨎㨒㨧㪑㪺㬉㭺㮈㮕㮥㰭㱦㳒㳠㳲㴁㴎㵄㵔㶔㷈㷜㸶㼲㽀㽢㾨㿙㿲㿴㿵䀖䁆䂩䃎䄄䄋䄎䅖䅟䉊䉛䉦䋾䎨䐀䐒䐛䐿䓐䓫䓴䓺䗁䗞䘉䙇䙪䚶䛳䛴䜒䝝䞂䠑䠸䣍䤶䥖䨿䩭䪞䫑䫯䫶䭲䱞䴈䴠䵙䵡𠀤𠀤𠁍𠂚𠆇𠇴𠉀𠉂𠌉𠌱𠍴𠍴𠍽𠎷𠔬𠔵𠕹𠖇𠖏𠗃𠙗𠚀𠛭𠝥𠝫𠟰𠡛𠢏𠣮𠤨𠤪𠦪𠪝𠬊𠮋𠳒𠵇𠶿𠷀𠷷𠺆𠻒𠾏𡁓𡂲𡄛𡄛𡈲𡈲𡈲𡊀𡋘𡋵𡍋𡍞𡍲𡎌𡎤𡐥𡑷𡒁𡒃𡖮𡗘𡗣𡘒𡘙𡘙𡘶𡘸𡙊𡙎𡙎𡙎𡙑𡙒𡙒𡙒𡙔𡙚𡙝𡙶𡚈𡚌𡚌𡚌𡚌𡚎𡚑𡚙𡚤𡚤𡚤𡛌𡛕𡜭𡞋𡞏𡟡𡢊𡪿𡫃𡬊𡮔𡯸𡰙𡱱𡳁𡳔𡴘𡴝𡴞𡷪𡹛𡼓𡼟𢁱𢃾𢄳𢇖𢉇𢉶𢋔𢍃𢓍𢓢𢓨𢔂𢔗𢙫𢜘𢝉𢡄𢡄𢡊𢡊𢡰𢪯𢬅𢯉𢱒𢱭𢲓𢳎𢵫𢶍𢷎𢸅𢸥𢻨𢽱𢽽𣂐𣂦𣃾𣄏𣄑𣈸𣉱𣋉𣑖𣑷𣓁𣓁𣕊𣖁𣖂𣖙𣚂𣜀𣜂𣟒𣠮𣠹𣡉𣡿𣢸𣣚𣣥𣤡𣥚𣦴𣦴𣦴𣧕𣪨𣭹𣮟𣮡𣮦𣮺𣰋𣴒𣴘𣵚𣵜𣶐𣷹𣸖𣸳𣸸𣹆𣺮𣽑𣾇𣾏𣾐𣾒𣾘𣾱𣿔𤀅𤂀𤂳𤅅𤅲𤅿𤉫𤋡𤌡𤐱𤒪𤓻𤖤𤗎𤘌𤘠𤙬𤝁𤝱𤟦𤡽𤢫𤤇𤤋𤧞𤩃𤩵𤫓𤫸𤮵𤯠𤯱𤰳𤲎𤲬𤳼𤵉𤶑𤷈𤸂𤸙𤺾𤽘𥂴𥅚𥇚𥇧𥈇𥈏𥈖𥈢𥋢𥌞𥎜𥎤𥎥𥏜𥑹𥔐𥖺𥚙𥟏𥠦𥡊𥦏𥦩𥧤𥫵𥮾𥯃𥯬𥰉𥰻𥱫𥳢𥴵𥶊𥷴𥺿𥻙𥻟𥽢𦀤𦁏𦁔𦂡𦃱𦅁𦅆𦊊𦋙𦌚𦎝𦎡𦎿𦏄𦏒𦑎𦒘𦓜𦔿𦖈𦖊𦖩𦙖𦜃𦜭𦜽𦝀𦝐𦝯𦠏𦠿𦣌𦤗𦨅𦩓𦫚𦫧𦬞𦮥𦮮𦰃𦰎𦲞𦴐𦶺𦻅𦼩𦾙𦾳𧀭𧁠𧉂𧉑𧉕𧊘𧊭𧋞𧋯𧌄𧎔𧓐𧗰𧘹𧙐𧜒𧞁𧞕𧞲𧟧𧡅𧢜𧧤𧩫𧪇𧬩𧭌𧰚𧶓𧶭𧶾𧹢𧻂𧻬𧼎𧼘𧾁𧾓𧾭𧾭𧾭𨁼𨂁𨂨𨃦𨅓𨆂𨉚𨋳𨌧𨓾𨔶𨗔𨗖𨘳𨜀𨜅𨜨𨞀𨞓𨞜𨞷𨞷𨟄𨟅𨡤𨣆𨣍𨤕𨥜𨧛𨨕𨨰𨨹𨩌𨪻𨰭𨲁𨳨𨵤𨵵𨶶𨷆𨷎𨷑𨸈𨺍𨺰𨻝𨽅𨾘𨾺𨿫𩀋𩂉𩂥𩃗𩅝𩆅𩆺𩇼𩈫𩈯𩊓𩋊𩋼𩌕𩌷𩍟𩎑𩎪𩐅𩓌𩓹𩕦𩗷𩘖𩜪𩝉𩝏𩝼𩟌𩡻𩣔𩣺𩤔𩥰𩧅𩧼𩭹𩮅𩱄𩲓𩳣𩶮𩶾𩸆𩸞𩹓𩼈𪀱𪃉𪄤𪄷𪈚𪈪𪈫𪊂𪊂𪊦𪋐𪐥𪑖𪑭𪒻𪒾𪓡𪓳𪔗𪜏𪜶𪝴𪞕𪟃𪟃𪟩𪠊𪠟𪠡𪡖𪡲𪣼𪤵𪥉𪥑𪥙𪦛𪨐𪨻𪨼𪪅𪪔𪫔𪮸𪯶𪰫𪲱𪴃𪴡𪵈𪶍𪶙𪶤𪸮𪸴𪹏𪹽𪻄𪻗𪻦𪼁𪼣𫂁𫂾𫃰𫄤𫅖𫅚𫅝𫅟𫅠𫆕𫇌𫊲𫌄𫌮𫍚𫍫𫎈𫎺𫎾𫏟𫐎𫑵𫓊𫕨𫖺𫗌𫗬𫘑𫙓𫙭𫛦𫞁爨𫢋𫢺𫣄𫤯𫥨𫥲𫦃𫧘𫧛𫬩𫭛𫮅𫯝𫯣𫯨𫯩𫯩𫯬𫯸𫯽𫯾𫰂𫰜𫰜𫳁𫳉𫳑𫴘𫵉𫶅𫷱𫸯𫸽𫽷𫾔𬁷𬆇𬇜𬈹𬊉𬋡𬌷𬎚𬎦𬐣𬑾𬒁𬒙𬓍𬔺𬗮𬘅𬘡𬘰𬘲𬙛𬙴𬙵𬙺𬙼𬙾𬚗𬚙𬚛𬚷𬜔𬝢𬞂𬞾𬡢𬡲𬢳𬣵𬤄𬤧𬥛𬥞𬥻𬨀𬨫𬩇𬬴𬭝𬭞𬮃𬮎𬮜𬮮𬯊𬯚𬱨𬱬𬲼𬳯𬳹𬴤𬵲𬶑𬶖𬷝𬺈",
 "𠃊": "匃愼槇簖鎭顚鷆㒺㤀𠕈𠸳𡚶𡢔𡧬𡩊𡻗𡿬𢗅𢻲𣌣𣍢𣴭𤐘𤠛𤰵𥎇𥒴𥞙𥠸𥧑𥪧𥭷𥿪𦁒𦋟𦏶𦘏𦙐𦫭𦬆𦯌𧍑𧠬𧧴𨑟𨝥𨦵𩢯𩣈𩥒𩦻𪔤𪶾𫏞𫣵𬐗𬕢𬗫𬯳",
 "戊": "傶咸嘁威娍宬峸慼慽摵晟晠槭歳烕珬珹盛磩窚筬篾絾縬膥臹荗荿蒧蔑蔵誠诚蹙郕銊鋮鏚铖顣鯎㖅㗤㞝㡬㤜㲓㳚㼩䎉䗩䙘䠞䢕䫆䬄𠉛𠎶𠕠𠗼𠲌𠷼𡄱𡋊𡓖𡠽𡩍𡷫𡻕𡻷𢑻𢖌𢣳𢦹𢧓𢧚𢰝𣆒𣆭𣎉𣕚𣚺𣜽𣧵𣫽𣫿𣬀𣺁𤁑𤇳𤞉𤠽𤨟𤳡𤻯𤽷𥀻𥅛𥅜𥆏𥉷𥎕𥓉𥠏𥢲𥥰𥯣𥴸𥼀𦄉𦇪𦈚𦐴𦑆𦔣𦗱𦛙𦟠𦪊𦮠𦸗𧊥𧐶𧓡𧙠𧞰𧧐𧫳𧶂𧻗𨇌𨠽𨹇𨹒𨹚𩖑𩣊𩥼𩫨𩹛𪁋𪉇𪑆𪔯𪞞𪨯𪬻𪮗𪸤𫊕𫓰𫖹城㤜歲𫻽𬅄𬇠𬓻𬕭𬙱𬛻𬦌𬫯𬭭𬲐𬴈𬴡",
 "旦": "亱偒儃刯勯咺啺喳姮婸嬗宣峘崵嵖恒愓憻揚揸擅敭旜晅暘暢桓楂楊檀櫭氈氊氱洹渣湯澶烜煬狟猹瑒璮畼瘍皶皽碭碴禓糃糧絙繵腸膻荁薚蝪蟺襢諹譠貆踼蹅輰逿邅鍚陽顫颤颺餳餷饘驙鰑鱣鳣鸇鹯齄㔊㜁㣶㦹㼒㾴䁑䁴䃪䄠䆄䉡䑗䕊䚙䞶䡀䬗䱎䵘䵮𠆞𠈗𠊚𠊛𠖑𠖚𠘐𠜬𠝗𠠊𠡚𠢃𠣙𠭲𠵆𠶒𠿞𡃢𡃯𡅹𡆎𡑆𡘍𡱌𡷆𢂡𢅒𢋃𢐹𢬎𢭱𢴈𢷆𣈗𣈜𣈟𣉎𣉺𣊼𣋊𣛀𣝻𣵤𣿴𤊢𤋁𤌓𤎘𤎲𤔰𤢏𤮜𤺺𤾉𥅨𥇹𥋹𥌖𥏫𥏬𥠜𥥣𥯕𥹚𥻗𥼷𦉆𦏄𦒜𦚸𦝇𦳘𦳝𧀄𧊳𧍋𧱂𧶽𧻚𧾍𨆁𨗪𨘖𨣚𨩨𨫖𨭖𨲵𨲷𨵀𨵶𩁉𩉊𩊹𩋬𩍕𩍻𩎨𩒢𩙼𩞯𩤟𩫡𩫧𩮎𩯤𩰵𩺏𩽱𪃌𪃵𪊥𪋥𪓼𪕫𪖭𪙁𪙵𪝯𪬨𪴶𪷑𪻘𪻭𪼘𪾞𫄠𫅝𫌅𫌰𫎹𫑲𫓉𫔑𫗴𫘰𫥐𫧑𫭍𫯭𫳞𫴮𫾄𬀷𬄮𬉨𬊩𬋺𬌤𬌺𬎎𬓾𬗥𬙉𬟎𬠜𬨤𬪌𬭠𬴠𬴼",
 "勿": "偒剔匫唿啺婸崵惕惖惚愓掦揚敡敭晹暘暢楊氱淴湯焬煬瑒畼痬瘍睗碭禓糃緆脗腸舓薚蜴蝪裼諹賜赐踢踼輰逷逿錫鍃鍚锡锪陽颺餳鬄鯣鰑鶍㑥㖴㛫㦹㧾㳷㺀㻛㼒䁑䐇䑗䓤䓪䞶䨚䬍䬗䯜䵘䵮𠏨𠖞𠢃𠭲𠰯𠱱𠴭𠼥𡀻𡃯𡝲𡱽𡱿𡸑𡾎𢃡𢒗𢞫𢟶𢡕𢴃𢽨𢾙𣂨𣇤𣈟𣈱𣉝𣉠𣉷𣉺𣊷𣊷𣊸𣋇𣌒𣓗𣓾𣝻𣨟𣱢𣽷𣿴𤂞𤃄𤋁𤎘𤓑𤔰𤙹𤟍𤾉𥂺𥇰𥌖𥍴𥏫𥏬𥓘𥚯𥟘𥠜𥪔𥬼𥮬𥯕𦁕𦓻𦖟𦦸𦮶𦳝𧀄𧇰𧩎𧩓𧶽𧼮𨎗𨖃𨗪𨘖𨫖𨲎𨵶𨽑𩃮𩋌𩋚𩋬𩗺𩤟𩭳𪂒𪃌𪍃𪎥𪎧𪕩𪕫𪙶𪡕𪬊𪯏𪱁𪲨𪷡𫀒𫆒𫌅𫌰𫑲𫜚𫨭𫪏𫭍𫯭𫳞𫶁𫻜𫾻𬀷𬀺𬁏𬊙𬊛𬊡𬋺𬌤𬌺𬙢𬟎𬠉𬨰𬪉𬪌𬬈𬯆𬲀",
 "吅": "偔偘儼區卾喦喿器孍崿嵒嵓巖巗愕曮榀欕湂煰玁碞礹腭萼蕚覨諤讝谔遌鄂釅鍔锷闆顎颚鰐鳄鶚鹗麣齶㓵㗁㘙㟧㠋㮙㺧㺧䉷䓵䕾䖀䖀䶫𠐨𠑪𠑪𠘥𠤁𠥝𠵀𠵛𠵬𠹜𠻖𠻝𠼧𠾅𡀉𡄃𡅚𡅚𡅝𡅾𡆔𡆔𡈆𡍸𡐈𡗏𡙗𡚍𡣏𡪑𡻫𡻵𡼑𡼰𢠑𢥴𢺘𢻪𣀬𣖎𣟭𣠄𣻵𣼞𣽺𤅙𤍸𤫠𤸔𤼅𥀴𥂍𥈭𥍓𥔲𥯳𥰔𥶟𥷇𥷷𦗻𦢷𦹛𦾆𦾊𧄤𧄤𧅧𧍞𧟓𧴣𧼻𨩗𨬱𨰫𨶴𨺨𩀇𩆮𩜻𩽴𪋹𪦊𪮐𫀤𫓟𫧗𫨘𫬢𫬣𫲠𫹪𫺢𬅰𬍌𬑀𬖿𬡫𬧒𬬤𬬤𬮳",
 "二": "伝佞侌兿凨动叆叇呍囩夽妘尝层弐忶抎昙枟樲沄畇眃秐紜纭耘腻膩芢芸藝転运酝雲魂鳚㒃㙯㮄㹑㾚䏛䠁䢵䰟䲰𠄴𠅀𠇌𠉃𠊁𠜸𠣒𠣓𠣝𠣢𠦊𠽬𡂞𡉲𡖒𡙿𡛉𡛍𡱓𡷃𢄽𢆹𢍞𢓈𢔚𢗋𢣒𢮔𢴧𢶳𢻸𢼇𣆃𣌨𣏴𣐂𣱉𣲚𣸮𤆥𤙊𤜼𤱂𤶊𤽎𥄰𥅬𥐩𥐯𥘟𥘩𥢘𥪇𥬀𥯿𥾡𦁮𦁮𦓍𦤆𦫣𦱚𦱚𦾆𧥺𧥼𧩂𧴳𧶀𧶊𧸐𨥒𨥕𨲑𨾜𩃇𩃬𩄈𩅣𩅣𩇒𩏁𩤐𩲑𩿃𪉂𪔎𪜞𪜟𪲡𪴫𪵣𪻎𪾨𫕏𫝹𫡶𫴮𬁴𬃘𬆽𬍒𬐄𬥠𬨿𬫇𬵚",
 "󠄀": "倶屰蚩辥㞣𠦨𠭳𠷦𠺍𠺤𠺤𡗡𡘶𡫹𡫾𡫾𡴁𡴂𡴃𡴅𡴆𡴇𡴊𡴋𡴍𡴎𡴏𡴐𡴑𡴒𡴔𡴕𡴖𡴗𡴙𡴚𡴚𡴛𡴜𡴝𡴞𡴤𡴥𡴦𡴧𡴪𡴪𡴫𡴫𡴫𡸐𢊝𢞪𢟃𢟃𢮭𢰺𢱍𣂟𣂲𣈳𣹨𣺥𣺥𤉞𤔠𤖟𤦚𤧔𤺷𥄾𥼈𦆰𦆰𦠠𦬏𦱞𦱴𦸹𦽯𧀁𧀼𧈪𧗭𧘫𧫨𨍔𨒯𨔢𨘹𨛝𨝇𨞍𩎢𩤍𩤍𩴭𪏍𪖜𪛀𫇉弢𣚣磌鬒𫿈",
 "兀": "僥兘刓嘵园坖妧嬈完宼岏嶢嶤徺忨憢抏撓暁曉朊杬橈沅澆焼燒獟玩皢盶磽穘窛笎繞翫翹膮芫蕘蚖蟯衏襓譊貦趬蹺远遶邧酛鈨鐃阮隢頑顤顽饒驍髐髨魭鱙黿鼋㐾㒬㒮㓂㚁㚁㝴㪴㹓䁱䏓䛃䡇䦎䨌䬧䯈䰫䲮䲶䴃䶧𠀻𠅮𠒉𠒑𠒓𠒖𠒞𠒢𠒴𠒺𠒻𠓕𠓘𠕻𠟋𠠺𠢩𠣑𠨪𠰂𠹬𠿻𡅍𡈦𡓖𡗉𡗊𡝴𡨥𡪩𡭄𡵧𡸳𢒇𢓆𢟭𢯥𢴽𢿣𢿲𣁯𣍎𣍕𣠎𣦥𣩦𣫁𣵘𣸀𣾊𣾬𤁚𤍆𤝌𤩊𤴀𥋈𥤸𥦲𥪯𦇇𦉗𦍘𦒏𦒒𦨞𦪛𦸅𦽞𧇳𧉗𧑣𧕜𧕜𧘁𧢬𧲦𧿙𨇵𨈤𨊅𨎬𨷁𨷝𩀸𩃾𩇖𩇲𩉯𩐘𩙓𩢄𩯆𩵶𪎹𪐬𪑣𪓣𪕀𪞒𪞭𪧍𪰈𪸊𪸑𪽊𪿑𫅣𫊐𫗟𫠫𫤙𫤞𫤣𫤦𫴁𫶺𫹵𫾤𬁕𬇆𬐍𬞪𬩱𬴝",
 "刀": "丒仞份佋兝兺刅刕刕刟刼剏劒劭卲吩哛坌妢妱寡屻岃岎岔岧岹巶帉弅弨彅彻忍忿怊扨扮招掰攽昐昭朌杒枌枴柖梤棼椕欩歰歰氛汾沏沼涩澀澀炃炤牊玢玿瓫瓰盆盼眧砌砏祒秎窃竕笤籾粉紉紛紹絜纫纷绍翂肕芬苆苕茘蚠蚡蛁蛪衂衯袃袑觢訒訜詔謭讱诏谫貂貧贫超躮軔軺轫轺迢邠邵酚釁釰鈖鉊雰靭鞀韌韧韶頒颁馚駋髫魵鮉鳻麄黺鼢鼦齠齧龆㐒㑢㗉㛃㞣㟗㟗㠴㣼㤋㥘㨵㲈㲽㷖㸛㸮㸷㹦㼤䀔䀙䂏䂮䎄䔼䔼䙼䛚䜀䜀䜧䜧䟙䧂䫿䬭䬰䭻䳂䵑𠈀𠉨𠊠𠔑𠔑𠔕𠔠𠔡𠔢𠕕𠖲𠚼𠛂𠛇𠛕𠛝𠛸𠜤𠜨𠝂𠝵𠞕𠞴𠟳𠟳𠠐𠠠𠠭𠣫𠦢𠧙𠪺𠬰𠯄𠯉𠯦𠯨𠰉𠸗𠸿𠹾𠺥𠾓𠾞𡀪𡆊𡇇𡉔𡊱𡊷𡋇𡗯𡛑𡟂𡟂𡥙𡧋𡬨𡭅𡮊𡯕𡴚𡵳𡸐𡺜𢀟𢁥𢁾𢂅𢇊𢈆𢈑𢑦𢗠𢗧𢙟𢠒𢦽𢪃𢪘𢪩𢮀𢯌𢵙𢺹𢺺𣁺𣉈𣊆𣊱𣌥𣏉𣏰𣐆𣑌𣑗𣗰𣛊𣢏𣥝𣦃𣬄𣬩𣬸𣴀𣹁𣹣𣻭𣾥𤆶𤆻𤋐𤎴𤓼𤖭𤘝𤟁𤟳𤫗𤫫𤰪𤱠𤵇𤵪𤽉𤾌𥁏𥁣𥁤𥃝𥄟𥍞𥘶𥥄𥦋𥬣𥲫𥳭𥹙𥹭𥺯𥽡𥾛𥾠𥿷𥿷𦁅𦄜𦐈𦕀𦚔𦚨𦚰𦣡𦦌𦦟𦨣𦯐𦴰𦽜𧋤𧑨𧘠𧠚𧮱𧳳𧵓𧷐𧷟𧺮𧿚𨋂𨐓𨐯𨐰𨐳𨔴𨚇𨥓𨥔𨳚𨴶𨸣𨹸𩅖𩇴𩉵𩌵𩎣𩔌𩔫𩬉𩰏𩲝𩲤𩷞𩿈𩿉𪀡𪁲𪄏𪋨𪌕𪎕𪔓𪔺𪖔𪖠𪞇𪟊𪟐𪟑𪯗𪯨𪴻𪷇𪸐𪸲𪹑𫊧𫋶𫍛𫚍𫜩𫞿𫟴兔忍挽𫡇𫥈𫦇𫩬𫫌𫬑𫲣𫲤𫲰𫲶𫵥𫼡𫽂𫽟𫾌𬃩𬋥𬍔𬏔𬚖𬜁𬝰𬥏𬦁𬦪𬨟𬫎𬬿𬰛𬱕𬲍𬵑",
 "丷": "乥併侻偤傍剏剙咲嗙嘀奠姘娧媨嫎嫡尊屏崷嵜嵭巙帡帨庰弟彦徬恲悦拦拼捝掷揂搃搒摘敚敵朕栏栚栟棁楢榜樀歒洴浂浐涚渆渕湭滂滳滴烂烪煪煫熵牓猶猷瓶甋産痥皏眹硑磅祱禉税篣絣綐緧縂縍缾耪胼脱膀艕艵荓莌萨蒡蔏蔐虁蛢蜕蝤螃螪蠤裞覫誁説謗謪謫说谤谪豴賆趥跰踯蹢躨軿輶迸送遂遒適邃郑郱鉼鋭鎊鏑铲锐镑镝関閲阅隊鞧頩餅駢駾騯骈骿髈鮩鮵鰌鰟鳑鵧㔙㙂㟋㠃㤣㥞㥢㥬㳕㴚㷕㻂㿶䁤䂱䃍䄘䅭䈂䊞䌼䎮䐱䑫䒍䙗䠓䠔䠙䤋䦕䧛䨦䩷䫄䬇䬈䬽䮰䯟䲡䴵䵂𠄁𠈪𠐝𠒿𠔳𠕏𠗵𠛼𠞶𠢗𠹻𠼬𡀟𡐂𡐱𡗺𡞜𡟝𡢥𡩙𡯾𡲚𡶴𡸫𡺚𡾛𢄎𢆃𢆗𢆛𢆢𢆣𢉭𢉷𢍜𢏳𢐊𢕠𢜂𢬈𢰤𢵩𢼩𢼶𣁊𣂆𣂉𣄥𣄬𣇋𣔾𣜃𣣫𣣱𣮩𣯊𣯟𣯵𣵃𣷃𣾍𤀾𤃊𤋃𤋌𤒆𤚰𤝴𤠻𤦺𤧭𤨬𤭅𤸈𤸉𤹔𤹞𤹟𤽝𥂝𥉣𥊔𥒆𥔎𥕐𥛚𥜁𥜶𥞩𥠂𥡉𥡦𥢁𥣹𥧮𥩧𥩵𥻖𥻭𦂁𦆳𦆳𦍉𦐵𦖣𦗍𦝱𦦳𦩃𦩲𦳷𦴏𦿮𧂲𧅄𧔑𧜟𧰬𧳉𧳫𧻓𧼦𨈾𨍨𨍩𨏰𨓚𨓵𨗅𨗕𨗙𨜟𨜷𨝗𨡡𨡴𨢅𨢈𨢐𨣡𨩊𨪂𨪆𨫢𨵎𨹗𨹪𨺧𨺵𩂦𩅫𩅲𩈚𩊖𩓲𩔀𩔕𩙢𩙢𩝌𩡕𩫐𩫑𩮈𩱐𪃬𪄱𪄲𪆾𪋋𪍑𪐏𪑫𪓰𪓵𪕒𪘀𪚏𪞊𪟸𪠆𪠫𪡜𪡧𪥘𪪃𪪇𪬥𪭆𪯔𪯨𪲿𪳸𪵜𪹚𪹧𫄰𫐌𫐼𫒵𫕀𫕒𫘮𫚛𫛨𫜟𫜡𫝸𫞃侻僧帨憎𤲒駾𫡞𫢳𫤛𫧷𫩪𫫀𫬩𫮍𫱨𫷘𫼪𬀲𬃪𬌿𬎼𬒇𬒩𬘶𬚜𬛊𬡻𬣲𬧽𬧿𬨎𬮦𬰧𬳣𬴅𬸑𬺅",
 "力": "乫伽侽俲働别勰勰勰勲協協協呖呦咖哿嗧嘉嘞妿姭姭姭娚嫐嬲嬲孧岰巭怮恊恊恊恸愂愑愸慟憅懃懄拁拐拗拹拹拹挘掳昮枥架枷柪柺栛栛栛毠沥泇泐泑渤湧爋狕珈珕珕珕甥疬痂眑砺磡窈笳筋筯簕粝耞耡脇脇脇舅苈苭茄荔荔荔荕莇莮葂葝葧蘍虜蚴蛠蛠蛠蜐袈袎詏賀贺跏踴軪迦鉫鋤锄雳雾靿駕驾鰳鳓鴐鴢鶒黝㑃㔖㖙㗈㗗㗢㚙㚳㛯㠰㢙㤎㤼㧝㭞㭷㶭㶸㶸㶸㷲㹢㽒䀷䂟䂲䅄䅄䅄䈥䓖䘈䝱䝱䝱䞻䤢䪪䬀䬅䬅䬅䱂䴥𠁜𠄳𠅦𠇴𠌳𠒰𠔦𠘃𠠿𠡐𠡷𠡷𠡷𠢂𠢂𠢂𠢈𠢎𠢏𠢐𠢞𠢟𠢢𠢣𠢦𠢫𠢮𠢷𠣇𠣉𠨃𠪲𠬱𠱿𠱿𠱿𠲵𠲸𠴂𠴛𠷦𠷺𠸰𠿰𡀣𡀭𡀺𡀺𡀺𡇨𡊗𡌝𡍧𡓕𡖦𡛙𡝔𡢵𡢹𡣠𡣠𡣡𡣡𡤂𡧚𡩄𡫌𡲍𡶐𡶥𡼉𢂊𢂐𢂐𢂐𢃃𢇔𢚆𢝟𢣢𢣢𢣢𢣲𢣲𢧙𢩃𢬱𢭟𢭵𢮌𢰭𢱍𢳝𢳾𣅺𣆕𣆕𣆕𣈳𣝀𣢜𣢢𣢩𣢩𣢩𣤥𣤥𣤥𣧥𣭋𣲒𣴚𣴚𣴚𣵪𣼷𤄆𤇞𤉎𤊹𤎂𤏩𤐂𤑕𤙄𤙒𤙒𤙒𤞩𤠃𤢰𤤬𤧔𤨕𤨙𤯺𤱎𤱘𤱷𤱷𤱷𤲶𤲶𤳆𤳇𤳢𤵱𤸝𤸩𤽘𤽲𥁒𥑆𥑑𥑙𥗠𥝿𥥙𥬓𥯙𥵚𥷁𥹌𥹱𥿃𥿌𦀖𦀧𦂔𦂿𦍠𦙲𦙺𦛕𦟯𦤯𦥶𦦊𦨦𦮿𦴾𦴾𦴾𦶭𦶭𦶭𦷵𦹝𧇙𧉪𧊀𧊅𧋱𧍛𧜻𧡇𧦤𧦪𧦲𧱑𧻅𧻒𧻒𧻒𨀌𨋝𨍠𨘳𨚧𨦒𨦲𨦻𨩯𨱧𨾻𩈏𩊏𩋭𩑴𩔘𩢒𩬗𩶛𩶵𩷈𩷻𪀁𪀂𪁍𪃠𪄪𪊛𪊹𪒅𪗬𪘖𪜯𪜾𪞕𪟗𪟞𪟡𪟤𪟦𪟧𪡎𪥝𪥺𪨎𪫡𪬈𪬢𪬩𪯄𪰘𪰵𪳆𪳌𪶀𪶉𪸝𪽕𪽱𪾫𫁕𫄦𫇛𫈎𫈠𫉕𫉥𫍃𫎱𫐆𫑊𫓀𫓺𫕬𫛤𫛶柺𫢙𫥳𫦥𫦬𫦵𫦶𫦹𫦹𫦹𫦻𫦽𫦿𫦿𫦿𫩸𫩻𫩻𫩻𫫑𫭦𫯊𫯲𫳀𫵷𫷤𫸾𫼯𫽘𫾙𬀼𬂶𬈭𬊫𬌼𬍺𬏩𬐼𬔁𬡬𬣦𬥭𬦣𬧊𬫂𬳫𬳫𬳫𬸇",
 "冫": "乲伨佽凖凴呁咨唥垐姿恣慿憑抣昀枃栤栥栨楶汮瓷盗盷秶笉粢絘羡茨蚐袀資资赹趑鈞钧韵餈㕠㚬㵗䅆䝧䢭䨏䪡䪢䪣䯸䳐𠃻𠘒𠸆𡍼𡤜𡷑𢙊𢠔𢬄𣇝𣐘𣑏𣓫𣰜𣳆𤌞𥁿𥂉𥂳𥒜𥖄𥖬𥗢𥴃𥿩𦀋𦈱𦡻𦶌𦶷𦿅𧊒𧫎𧫺𨀥𨆱𨋰𨋲𨒮𨝭𨣕𨦠𩐊𩐑𩐒𩶲𩽑𪄄𪅯𪅵𪋃𪞠𪞧𪧹𪨺𪭱𪲜𪳙𪶻𪾪𫥕𫥖𫥘𫥜𫭶𫺇𫻢𬁦𬁼𬅧𬇜𬏗𬓯𬙛𬚺𬜷𬝭𬢤𬣝𬦴",
 "欠": "乲佽俽僛厥咨嗽噷垐姿嫰嬜嵌嵚嶔廞恣惞慾掀摗撳擨栥栨楶樕漱焁焮瓷瘚瘶盗秶篏簌簐籨粢絘羡茨蔌藃蘝螸蠍資资趑遬鍁鏉锨闕阙餈㗵㜛㠌㵣㶑䃢䅆䌠䢭䥲䨏䪡䪢䪣䯸䳐䶴𠀿𠁓𠃻𠍫𠐀𠘂𠥜𠩦𠩱𠪢𠸆𠺡𠺼𠾬𠿁𠿒𠿣𡂿𡄥𡣂𡤜𡮪𡷑𡼭𡼲𡽙𢊦𢋅𢋆𢌃𢕢𢙊𢜛𢡮𢢚𢢶𢣇𢦆𢭻𢵡𢶆𢶖𢹀𢹦𣊞𣋚𣌋𣒱𣒿𣔙𣖬𣛯𣣒𣤐𣩭𣵯𣵶𣹱𣼋𣼴𣾠𤀔𤅮𤉚𤊑𤐚𤒡𤡃𤡋𤢔𤮥𤶺𤷓𤸺𤺰𤻍𤻐𤼏𤼢𥂉𥊡𥋕𥋵𥔩𥕔𥖄𥗄𥗢𥟕𥪅𥳽𥴃𥵗𥺏𥺔𥽁𥿩𦈱𦌊𦌗𦜓𦪬𦰻𦲽𧃏𧊒𧐁𧐄𧓃𧓗𧝽𧞨𧢊𧫎𧫷𧫺𧷕𧽓𨀥𨁰𨅄𨅠𨇬𨉻𨋰𨒮𨣕𨦠𨨢𨮈𨰇𨱒𨼌𩌱𩐊𩐋𩐑𩐒𩐕𩭜𩮶𩶲𩻇𩽑𪅵𪅾𪗀𪛐𪡌𪡗𪥒𪨸𪩪𪶻𪾪𪾯𫈀𫈫𫉮𫉸𫓿𫘃𫣑𫨜𫪘𫪽𫫉𫮟𫳎𫷷𫺸𫻎𫻚𫻢𫾷𬁦𬁼𬅧𬅳𬋏𬋐𬏗𬓯𬚺𬝵𬝺𬢀𬢤𬯃𬶷𬸨",
 "爫": "乳俀俘倸偁哷哸哹啋喛嗠娐娞婇媛嫍孵寀嵈幍彩愋慆挼捊捋採援搯暖桴桵棌楥槄殍浖浮浽湲滔漞烰煖熖猨琈瑗瑫睬禐稃稱稻筟粰綏綒綵緩縚绥缓罦脟脬脮艀荽莩菜萲蓞虢蛶蜉蝯褑諼謟谖踩蹈轁郛酹酻釉鋖鋝鋢鍰锊锾鞖鞱韜韬頱餒饀馟骽鮾鰀鵎鶢㔜㗖㛵㞂㟊㟎㡪㣪㥒㬊㭩㯒㱣㲕㲗㸹㼏㽟䁔䅑䈠䈱䌐䌽䐆䐘䞯䟹䣋䤾䧌䧟䨗䮑䮭䰂䱐䳕䴸䵚𠉰𠋠𠋯𠚘𠚡𠜖𠞞𠥒𠥪𠮐𠼽𡍛𡖲𡢙𡥭𡦄𡦢𡩹𡪘𡲾𡸯𡺫𢅁𢒒𢚃𢚶𢜻𣁷𣈄𣨅𣨮𣫃𣫋𣫌𣮄𣶶𣼔𤂅𤂆𤌁𤓁𤔁𤔥𤔱𤕄𤕇𤕇𤕇𤙤𤚀𤞙𤞲𤟖𤨐𤲫𤶖𤷕𥆬𥉰𥊋𥒫𥔛𥔿𥚀𥚖𥛗𥛟𥦘𥧹𥭐𥷓𥹽𦅻𦇻𦈴𦋄𦑛𦖀𦖵𦗌𦦌𦦨𦩮𦩹𦫦𦸡𦾩𧀜𧇛𧇧𧐎𧞥𧠾𧡩𧭣𧱻𧳥𧳭𧽃𧽨𨁡𨂘𨇲𨢝𨤐𨤔𨨫𨴫𨶒𨹴𨺉𨿐𨿚𩋫𩏅𩓖𩓰𩔃𩔋𩗔𩞟𩣧𩥅𩥓𩭏𩳎𩹴𪅊𪅎𪌳𪑋𪒐𪘤𪨁𪫁𪭐𪭒𪸯𪹗𪾮𫆇𫌽𫏖𫏺𫕉𫕋𫣰𫮊𫼍𫽠𫽱𫿴𬀖𬀢𬁆𬃣𬅦𬋫𬎱𬐕𬔞𬘮𬘺𬚁𬞨𬥢𬪃𬰔𬲺𬳊𬴹",
 "子": "乳侾俘勐吼哮哹啍嗠嚲娐孨孨孬孰孱孴孵宯崞庨弴恏悸惇惸愻捊掹搎敎教敦朜桴椁槂殍浮涍淳游烰焞犼猛猻琈痚痵硣稃稕窙筟箛粰綒綧罦脬艀艋芤茡荪莩菰蓀蜉蜢蜳蝣誟諄谆賯踍逊遊遜郛郭酵酻醇鋢錞錳锰鞟韕馟鯙鯚鯭鶉鹑㑧㔜㚺㝄㝇㝇㟊㤵㨃㫴㬀㭳㲗㳵㹲㻑䁅䇏䑻䒵䓔䓝䞯䧐䨗䱆䱐䳕䴸䵍𠃷𠆓𠆔𠆞𠊩𠗠𠩨𠩭𠭂𠱆𠲚𠲚𠲡𠵼𠹀𡌉𡍢𡒐𡘏𡝹𡣁𡤟𡥨𡥨𡥭𡥸𡥹𡦀𡦂𡦂𡦄𡦆𡦊𡦔𡦙𡦚𡦛𡦝𡦟𡦡𡦢𡦥𡦧𡦨𡦶𡨸𡭅𡮒𡰼𡲪𡳜𡵾𡶻𡷸𡿒𢅁𢋶𢒒𢗵𢘩𢚙𢛴𢝡𢢿𢨊𢪬𢫡𢭦𢮩𢯗𢰧𢱙𢴒𢶛𢻓𣉬𣋄𣏺𣑑𣒶𣓶𣔞𣫃𣫌𣮢𣳲𣵎𣻆𣼔𤁛𤂆𤂇𤂇𤆺𤉗𤏂𤗖𤙤𤞲𤥝𤦕𤦽𤭞𤰎𤶖𤷪𤽴𥁙𥁝𥁨𥆔𥆬𥇜𥊐𥒫𥚀𥚠𥤾𥥅𥦘𥩯𥯞𥱖𥺄𥺬𥿱𦁝𦁣𦁧𦁳𦈴𦋄𦋆𦖀𦙥𦣮𦥊𦳧𧃨𧇧𧇯𧉔𧍆𧠾𧧕𧩌𧪾𧰄𧱐𨀊𨂗𨈯𨔌𨛨𨟞𨠺𨪃𨬤𨴫𨴹𨶉𨸳𨹴𨿚𨿡𩓖𩘓𩫂𩱞𩳎𩳔𩷨𩸰𩹊𪀮𪁡𪂎𪂮𪂲𪊷𪏆𪑒𪓈𪜸𪟓𪣂𪥸𪦟𪧃𪧄𪧚𪨁𪭐𪭒𪰿𪳧𪴏𪵋𪶧𪸿𪹁𪹱𪽵𫁎𫁻𫃣𫆮𫇊𫇱𫒛𫒤𫔲𫙍𫚻𫛈𫡉𫢷𫣬𫤅𫤵𫨿𫩼𫩼𫫂𫭧𫰪𫱪𫲬𫲰𫳘𫶤𫶤𫶤𫹛𫼍𫼑𫿰𫿴𬅦𬇤𬈂𬍳𬎄𬐕𬗆𬘯𬚕𬝇𬟚𬠓𬧷𬫓𬫥𬫲𬭚𬲺𬴻𬶦",
 "⺘": "乴亵兿势咑哲哳唞啦啪垫娎嶊庪悊挚晢晣梊浙湁热烲焎狾硩筘筢箉箝箨篺簎簼籜籡紥絷荴莏菈菗菝菢萔萚葀蒱蓵蓷蘀蛰蜇裚誓贽踅逝銴鋬鞡鸷㐝㑜㔼㝂㟛㧳㿱䀸䀿䁀䆢䇽䈰䉗䉟䉥䋢䏳䓆䔱䔶䔾䟷䥟䩢䭁䱑䳲𠍣𠙤𠢞𠢟𠤧𠯩𠱹𠲞𠲴𠳏𠳑𠳖𠴙𠴜𠵆𠵿𠶅𠶟𠶯𠸓𠺃𠺲𠻺𠼕𠽕𠽮𠾵𠿂𡀪𡃒𡃓𡃿𡅒𡆄𡏥𡐾𡘭𡝊𡝰𡮍𡱩𡷠𢁊𢂼𢇎𢏨𢏪𢚅𢛑𢛺𢜋𢜌𢬀𢭑𢰙𢴛𢴛𢵁𢶄𢷚𢸈𢼺𣁨𣇄𣈓𣕔𣖖𣚮𣨋𣨰𣩁𣩂𣲞𣴜𣴷𣵱𣸅𣻧𣼬𣾸𤁙𤁡𤃧𤄌𤍐𤭥𤮌𤷟𤸟𤾷𥆭𥍭𥖖𥦆𥧿𥨛𥩃𥩇𥮁𥮠𥮼𥱮𥱴𥲳𥲵𥳳𥴮𥴻𥷘𥸓𥺈𥺕𥻣𥾱𦄹𦌈𦏄𦕶𦟺𦢟𦰄𦰽𦲫𦴽𦵭𦶂𦺕𦺤𦼸𦾃𦾣𦾬𦾱𧁵𧂈𧃔𧉒𧋍𧎋𧏳𧐥𧐼𧑝𧑧𧑻𧶇𧻸𨁜𨁩𨃌𨃑𨄖𨄸𨅅𨆥𨉠𨕝𨝨𨦬𨦶𨨤𨨲𨫻𨴆𩄔𩗙𩝺𩣩𩷠𩸉𩹕𩹭𪁊𪇪𪘔𪠺𪡆𪡸𪢅𪢚𪧊𪨃𪨵𪭫𪮂𪮣𪮣𪮯𪲽𪶎𪶜𪸳𪻢𪾑𫁗𫂅𫃸𫄐𫅖𫊴𫎘𫏙𫐋𫐧𫕫𫙡𫠼𫤄𫩽𫩾𫩿𫪵𫪶𫫃𫫄𫫓𫫔𫫶𫬈𫬒𫬓𫬜𫬬𫬶𫭅𫰷𫵟𫵫𫺖𫽂𫽌𫽑𫽟𫽰𫽶𫽹𫾅𫿟𬇫𬈗𬏧𬐌𬔦𬕩𬕯𬗗𬙤𬠏𬡓𬳚𬵤",
 "斤": "乴乺俽凘厛厮哲哳唽啠啠嘶噺垽堑塹娎峾崭嶃嶄廝悊惁惞慙慚掀摲撕晢晣晰晳暂暫梊椞椠槧浙淅漸澌澵烲焎焮燍狾獑玂皙硩磛簖簛籪菥菦蔪薪蜇蜤蜥螹蟖蟴裚覱誓質質踅蹔逝銴錾鍁鏨鏩鐁锨鬭齭㑜㒋㜞㜪㝂㟻㨻㪽㫹㯕㱤㽄㿱䀸䀿䁀䁪䇵䇽䋢䎰䏳䓄䓅䓆䔮䗄䞪䟅䟷䡳䤱䤺䨛䩢䭁䭕䱑䱿䲉䳻𠌲𠲻𠳇𠵍𠶌𠼃𠼗𡏥𡐛𡘭𡝊𡡒𡹢𢀦𢂼𢄤𢏨𢜛𢜦𢠹𢯋𢯢𢴛𢼺𣄄𣇄𣈈𣊙𣔅𣔙𣔠𣚄𣤘𣨋𣨗𣩁𣩂𣩠𣷯𣷲𣼬𤂊𤃮𤄌𤊑𤍖𤠥𤩐𤮓𤷓𤺊𥇐𥇢𥇦𥇴𥍭𥐀𥓊𥕌𥕶𥮥𥯩𥱝𥺈𥺚𥼤𦕶𦗚𦗝𦜓𦠭𦮬𦲽𦳵𧁲𧋍𧐮𧑧𧝤𧞐𧞗𧬊𧬜𧴃𧶇𧻸𧽯𨄸𨇰𨉘𨑁𨓢𨦬𨨞𨭠𨮕𨮭𨷖𩀧𩃟𩅰𩈻𩉒𩕩𩗙𩗱𩠹𩣕𩣩𩪽𪀘𪁊𪁻𪂀𪂥𪆁𪆗𪖉𪘔𪘷𪡗𪦑𪧭𪬴𪮃𪮣𪲽𪻢𪻩𪾯𫆏𫋅𫎘𫎸𫏐𫏞𫗚𫗲𫙧𫚀𫜭𫣩𫪚𫿐𫿿𬁩𬃞𬆂𬆉𬊗𬎔𬎖𬕕𬕗𬗗𬗩𬝅𬞋𬢀𬣃𬧋𬰣𬲕𬲛𬲣𬷵",
 "⺡": "乷乼匯唦啵嗨垽埿堻塗塣塰壍奫娑婆嬱峾惉愆慂懑懘懣挱挲染桫桬椼浏渠溆準濷瀬灎灏灔燙猀琺瑬璗痧盓盕盪硰碆窏窪笵筂箈箔箥箲篊篞簜簿籓聻范茫茳莈莎莐莯菃菏菠菬菭菹萍萡落萿葏葓葕蒎蒗蒞蒤蒲蓅蓤蓱蔆蔋蔳蕅蕍蕩蕰薀薃薄薓薸薻藩藫藻蘫虃裟逤鋈錃鍅鍌鍙鎃鎏鐋閯闊阔霂霃霈霐霑霔霗霘霟霮霶靋餰髿魙鯊鯋鲨鴻鸂鸿鼝㐢㖳㗟㘤㜑㧟㨇㬁㲚㳩㴂㴾㵆㵈㵉㵱㵹㶙㶝㸺㽏䀀䀊䆱䇵䈃䈌䈬䑭䓅䓋䓑䓜䓷䔐䔽䕕䕪䣉䤔䤬䦞䦢䨕䨟䨬䨵䲤䵦𠅻𠈱𠈹𠊔𠍀𠎢𠎯𠑈𠑴𠘔𠡑𠤆𠥋𠦭𠱢𠲤𠲨𠲻𠳛𠴎𠴝𠴥𠴸𠴹𠵽𠶕𠶠𠶢𠸁𠸪𠸷𠹲𠺘𠺩𠻪𠻹𠽎𠽞𠽦𠽪𠾻𠾾𡀡𡀦𡀶𡁺𡁼𡄽𡈛𡊺𡋆𡋋𡋷𡎒𡏋𡏬𡐀𡑑𡒖𡒗𡔆𡜂𡜡𡝝𡝫𡞠𡟖𡢈𡣄𡣩𡤊𡪦𡮛𡰏𡱳𡷍𡻔𡼍𡽻𡾕𢇄𢌇𢍡𢏠𢔆𢙁𢚽𢛜𢛣𢜃𢜅𢝚𢝳𢞉𢟗𢡂𢡛𢡸𢡾𢢉𢢵𢣣𢩄𢩎𢬥𢬨𢭯𢭽𢭿𢯛𢯠𢯼𢱓𢱛𢳲𢴆𢴗𢴳𢵺𢵻𢶌𢷄𢸝𢹅𣆙𣇹𣉯𣋫𣑃𣑱𣑴𣒑𣒿𣓐𣓦𣓬𣓭𣓮𣕝𣙄𣚘𣚫𣛦𣛯𣜤𣜮𣜾𣝠𣮅𣴘𣵂𣵹𣶁𣶌𣶾𣹁𣹇𣹊𣹭𣹼𣺎𣺸𣻅𣻾𣼁𣼪𣽝𣽠𣾃𣿀𣿊𤀢𤀷𤁃𤁙𤁞𤁦𤁪𤁰𤂀𤂃𤂄𤂕𤂠𤂥𤃯𤄌𤄍𤄕𤄝𤄣𤄤𤄧𤄯𤅆𤅴𤅿𤉠𤊁𤋻𤒕𤒚𤦮𤩌𤭊𤶶𤷩𤾯𥁡𥁭𥁲𥁳𥁵𥁷𥁼𥂈𥂋𥂖𥆀𥆚𥆝𥇇𥇲𥈰𥊗𥋐𥋕𥒀𥒟𥜙𥢳𥦠𥦷𥧕𥨙𥨿𥬮𥭎𥮒𥯛𥯠𥰅𥰛𥰤𥱀𥱋𥲄𥲌𥲚𥲱𥳒𥳷𥴽𥵄𥵥𥶞𥸗𥺜𥼔𦀛𦀟𦄇𦈳𦋵𦝌𦝎𦞓𦟸𦡥𦤢𦨲𦩨𦪉𦭰𦯊𦰚𦰛𦰪𦰫𦲉𦲷𦲾𦳂𦴢𦴥𦴴𦴸𦵜𦵩𦶄𦶊𦶜𦶼𦷟𦷰𦸁𦹃𦹈𦹏𦹲𦹹𦺍𦺘𦺾𦻜𦻟𦼥𦼻𦽘𦽷𦽾𦾶𦾷𦿞𦿭𧀌𧀝𧀡𧁑𧁔𧁕𧂙𧄻𧇦𧋂𧋊𧋶𧍌𧍢𧎘𧐽𧑘𧖶𧗉𧚚𧮝𧴝𧸓𧻟𧻯𨀹𨀾𨂖𨃹𨆺𨆻𨖳𨢯𨤵𨦥𨦮𨧁𨨏𨨱𨩅𨩾𨭡𨮜𨮶𨴤𨵍𨵔𨵨𨶗𨷇𩁵𩂷𩂸𩃎𩃚𩃜𩃱𩄂𩄋𩄬𩅠𩅪𩅳𩅴𩅵𩅻𩅿𩆍𩆎𩆓𩆤𩆩𩆭𩆯𩆸𩆼𩇋𩉀𩉍𩊮𩙣𩜤𩜥𩜾𩣟𩣠𩭶𩯮𩰄𩰾𩱣𩳑𩶴𩷯𩸓𩸦𩸧𩾆𪀤𪁕𪁘𪁠𪂔𪃂𪃕𪃡𪃽𪄠𪄣𪄫𪅍𪆎𪆟𪆵𪆸𪇶𪈯𪈸𪌮𪎤𪒳𪔦𪔱𪛎𪝻𪟛𪟜𪡌𪡑𪡤𪡥𪡵𪢏𪣡𪣢𪣭𪣮𪤊𪦜𪧓𪫚𪬙𪬬𪮔𪯝𪰤𪱅𪳅𪳷𪳼𪴹𪵶𪶇𪶏𪶚𪶟𪶼𪷀𪷔𪷡𪷥𪷪𪷮𪷶𪷹𪸁𪸃𪸄𪾁𪾒𪾛𫁄𫃤𫃶𫆏𫆬𫇓𫇻𫇼𫈊𫈕𫈜𫈞𫈭𫈰𫈲𫉃𫉙𫉣𫉯𫊉𫊋𫕦𫕪𫕭𫕵𫕷𫗚𦼬𫠸𫥭𫦇𫪌𫪍𫪏𫪬𫪿𫫐𫫥𫬂𫬵𫮏𫮡𫮤𫯗𫯶𫳎𫳺𫴴𫶒𫺈𫺋𫼒𫾈𫾘𫾰𫾷𬀔𬀝𬃍𬄅𬄕𬆃𬇧𬇭𬇮𬇸𬈅𬈆𬈈𬈓𬈚𬈞𬈢𬈤𬈰𬈴𬈻𬈽𬈾𬉐𬉘𬉙𬉚𬉝𬉞𬉪𬉰𬏱𬐛𬐥𬐦𬐯𬐴𬐻𬔿𬕋𬕍𬕘𬕙𬕠𬕧𬖽𬙦𬚇𬛒𬜂𬜃𬜚𬞇𬞉𬞋𬞥𬞫𬟉𬟣𬠋𬠘𬠚𬧁𬧇𬩅𬩆𬪵𬭛𬮍𬮖𬮧𬮪𬯃𬰀𬰂𬰃𬰆𬰣𬳆𬵋𬵱𬷙𬷯",
 "少": "乷偗唦娑挘挱挲桫桬毮渉渺渻猀痧硰箵篎緲缈莎莏裟逤閯髿鯊鯋鲨㗂㨘㭞㮐㲚㸺㼳㾪䔋䚇䣉䤬𠈱𠋝𠞔𠢣𠣇𠴕𡋷𡞞𡨽𡱳𢇄𢜫𢡸𢡾𢭼𢶌𣜤𣦉𣮅𣴷𣶲𣹇𣺌𣻅𥁲𥆝𥇇𥋐𥭝𥻠𦀛𦀟𦔄𦯷𦳗𦳥𦹈𧋊𧍖𨁭𨜜𨦒𨲓𨵥𨾻𩊮𩣟𩣠𩳑𩷈𪃐𪃦𪃧𪌮𪍋𪝹𪟜𪱐𪴽𪶋𪶼𪻻𪾱𫁐𫆦𫍂𫐽𫛄𫛹𫬣𫵆𫷴𫿛𬇭𬏩𬕍𬞎𬠋𬥇𬮪𬷙𬸙",
 "戶": "乺齭㫹𢀦𢯢𣷲𪘷𫉚𫜭𫿐",
 "方": "乻倣傍唹嗙嗾埅堏嫎嫙崺嵭徬揓搒旕暆暶棜椖椸榜檹淓淤游湤滂漩牓璇瘀瘯矏磅箊箷篣簇簱籏縍縼耪膀膐艕菸葹蒡蔙蔟蝣螃覫謗谤遊錺鍦鎊鏃鏇镑镞閼阏餝騯髈鯲鰟鳑鶭鷟㒾㘄㥬㫅㫆㫇㮄㮵㯀㵀㶛㻢㿶䁢䃚䃠䄘䅭䑻䒍䗐䗠䞄䠙䡻䢟䧛䨦䩷䫵䰓䲂𠗵𠷇𡆈𡆍𡌧𡌼𡝶𡟕𡡍𡥮𡻬𢄎𢄧𢄲𢐊𢔚𢕐𢛨𢝡𢮁𢮔𢰧𢳄𢳇𢳈𢷔𣂆𣃘𣃶𣄒𣄥𣄬𣇷𣎓𣎙𣖺𣚂𣞌𣨝𣮙𣯊𣯟𣷫𣹪𣻒𣻓𤃃𤄕𤄫𤉪𤊦𤍣𤍣𤖌𤚰𤟽𤥽𤦽𤧭𤹔𥉣𥍸𥓴𥠥𥪱𥯞𥰠𥻭𦁷𦂛𦋤𦒊𦗍𦜍𦫣𦳧𦻬𧌱𧐈𧐗𧛖𧜽𧩂𧩹𧷆𨄕𨅢𨍩𨏰𨔆𨜷𨡪𨢐𨨡𨯋𨼁𨼁𩀥𩃎𩔣𩕣𩕲𩗧𩘓𩘶𩜢𩠍𩡕𩤐𩥆𩭔𩹊𩺯𩻀𪁢𪄟𪇥𪍧𪍾𪓾𪝆𪟒𪟸𪤜𪥏𪦀𪦟𪪇𪬆𪯕𪯛𪯞𪰃𪵐𪹚𪻯𪼕𪾰𫄰𫅵𫈊𫈚𫋈𫐼𫕗𫛯𫜡𫦓𫰁𫵦𫸣𫹛𫿇𫿕𫿨𬀁𬁩𬂬𬄶𬈮𬈮𬉀𬌿𬐰𬒩𬕗𬜌𬜹𬝅𬢰𬣃𬪟𬫲𬫽𬮐𬱍𬳣𬴅𬶦𬸦",
 "仒": "乻唹旕棜淤瘀箊菸閼阏鯲㫇𡌧𢛨𢮁𣃶𣄒𣨝𤉪𤥽𨔆𨨡𪦟𫵦𬱍",
 "主": "乼嵀暀樦蘣霔㗟㴤𠉫𠗤𡸌𢛛𢭘𣁑𣇭𣶂𤷮𥆜𥇁𥦠𥯂𥯸𨩾𪏜𪝲𫃮𬷗",
 "耂": "乽侤侾偖哮啫奢媎宯屠帾庨拷教斱暏暑栲楮槠殾洘涍渚烤煑煮猪琽痚瘏睹硣禇窙箸緒绪署翥耉著蝫褚覩觰誟諸诸豬賭赌赭踍踷都酵醏銬鍺铐锗闍阇陼鮳鯺鲓㗯㘼㛈㥩㨋㫴㭳㸙㹲㼥䐗䓔䘄䡤䬡䰇䰞䰩䵭𠁂𠣰𠭂𠱼𡌉𡎉𡗀𡦊𡦝𡦡𡷸𡺐𢉜𢐼𢑳𢔪𢝬𢭦𢾀𣂃𣋐𣎧𣗓𣛖𣠕𣾻𤁛𤂩𤉗𤌄𤣘𤥝𤽴𥀁𥆔𥧏𥪤𥬯𥹬𥺄𦋧𦑥𦓍𦘠𦩳𦴆𦾧𦿀𧂤𧙲𧱐𧳯𨔾𨛨𨜞𨲘𨴹𨷄𩋵𩤜𩫭𩱞𩱰𩳔𩷨𪃙𪃲𪊷𪋏𪋑𪜕𪟈𪦘𪫭𪵋𫅶𫇷𫔲𫙀𫯽𫰪𫲬𫷟𫻷𫼏𬁥𬂈𬄊𬅩𬆰𬐈𬖡𬚍𬚍𬛃𬢎𬢦𬯯𬴗𬴢",
 "干": "亁倂倂哻姸姸娨岸悍捍搟擀晘栞栞桿檊浫涆澣焊猂皔睅硏硏稈筓筓筸簳蓒覝詽詽豣豣貋趕郉郉銒銒銲駻㟁㪋䆭䏷䓍䓸䛞䳚䶬䶬𠆕𠆕𠌸𠌸𠛬𠛬𠝵𠝵𠧄𠰑𠱢𠳾𠻃𠿨𡃥𡊺𡓑𡔊𡝎𡢥𡶨𡷛𢁌𢁌𢆌𢆒𢆒𢆙𢆙𢆛𢆛𢆞𢆞𢆟𢆟𢆩𢆩𢆬𢆬𢏗𢏗𢏥𢐻𢙶𢝐𢝐𢟑𢤈𢥲𢧀𢽎𣀦𣆙𣈨𣉡𣔼𣥭𣥭𣬊𣬊𣭸𣳙𣵃𣵡𣵼𣺕𣽥𤀾𤂸𤃊𤑴𤒆𤙾𤙾𤜃𤞶𤞿𤥚𤲒𤲒𤳊𤳊𤹖𤽝𤿧𥅝𥅝𥅳𥅳𥌲𥍅𥤁𥫉𥲂𥲂𥺍𦋁𦐧𦐧𦩅𦯼𦸋𦼮𧂲𧔫𧙧𧙧𧚭𧚭𧦡𧭺𧵭𧵭𧷩𧷩𧻀𨁄𨛎𨣳𨧠𨪚𨯢𨰩𨰯𨴚𨴚𨼣𨿑𩒖𩒖𩔛𩔛𩗤𩩄𩩄𩼛𩿫𪆾𪈋𪈶𪏂𪚜𪚜𪣄𪣟𪣨𪥻𪬑𪬑𪳨𪴪𪿡𫉑𫒢𫘣𫰘𫰸𫱅𫱸𫷛𫷛𫷫𫹑𫾯𬁔𬖝𬙲𬙲𬣸𬭍",
 "𠂉": "亁仡仵侮刉刏勄吃吘啎嗾娒嫙屹崺復忔忤忥忾悔愎扢拖挴揓敏旿晦暆暶杚杵柂梅椱椸檹毓氕氖気氙氚氛氜氝氞氟氠氡氢氣氤氥氦氧氨氩氪氫氬氭氮氯氰氱氲氳汔汻汽沲海游湤漧漩炧烸犵狏玝珻璇畮疙痗瘯盬盵矻砤稪箷簇籏籺粚紇絁緐緮縼纥肐胣脢腹膐芞莓葹蔙蔟虼蝣蝮袘袮複訖許誨讫许诲趷踇輹迄迕迤遊酶釳鉇鋂鍑鍦鏃鏇镞阣陁霉靔馥駞鰒鳆鷟麧黣齕龁㐹㒾㔕㙁㙏㞰㡮㢮㧉㨴㩿㪂㫓㬳㬼㮵㯀㰟㲴㲵㲶㲷㵀㶛㷏㸱㻢䀲䁢䃚䃠䇄䊈䋣䋦䌓䍙䎢䏗䑐䑨䑻䒗䗐䗠䝯䞄䞘䟢䢀䦍䧗䩈䩐䪖䬣䮡䰴䰿䱕䲂𠀸𠄃𠄄𠄊𠄋𠉖𠖯𠖴𠚮𠜮𠠶𠤷𠧩𠨺𠰹𠲯𠳨𠴻𠵦𠷇𠼳𠿰𡆈𡆍𡉦𡊇𡎧𡗧𡞪𡟕𡴕𡶊𡻬𢂳𢄧𢄲𢆏𢇓𢑍𢑠𢓷𢕐𢕜𢖴𢙽𢝡𢠥𢦩𢨵𢨹𢫳𢰧𢳄𢳇𢳈𢵹𢷔𢼏𣅠𣎓𣏙𣒫𣒻𣔍𣖺𣠤𣢆𣫷𣫸𣫺𣫼𣫾𣬁𣱕𣱖𣱗𣱘𣱙𣱚𣱛𣱜𣱝𣱞𣱟𣱠𣱡𣱢𣱣𣱤𣱥𣱦𣱧𣱨𣱩𣱫𣱭𣱮𣱰𣴴𣴾𣵺𣸪𣹪𣻒𣻓𣼿𤄫𤑓𤕴𤖌𤗆𤙩𤟱𤟽𤣮𤤩𤦽𤪝𤭐𤰢𤱘𤳺𤴸𤵍𤵚𤸑𤽍𥄭𥅓𥍢𥍸𥐭𥘪𥙁𥙰𥝖𥝬𥞀𥠥𥤶𥦸𥪚𥪱𥯞𥰠𥵈𥺡𥾿𥿵𦂛𦋤𦥽𦧓𦨏𦩟𦬶𦭥𦰜𦳧𦻬𦽀𦾴𧄦𧆦𧆫𧉁𧉮𧋟𧐈𧐗𧐟𧖦𧚀𧛖𧜽𧠡𧣟𧦧𧩹𧶅𧷆𧺴𧼱𧿶𨄕𨊰𨕀𨕣𨖍𨗵𨝌𨝝𨠑𨡪𨧯𨫬𨰿𨳰𨳱𨼃𨾟𩀥𩃰𩉻𩊱𩋟𩑔𩑤𩔣𩕲𩘓𩘶𩛪𩛸𩛹𩠂𩠍𩠓𩣾𩥆𩨘𩰌𩱟𩵱𩷿𩸻𩹊𩺯𩻀𩾥𩿽𪃃𪄟𪇥𪉥𪌇𪍧𪐒𪐜𪖫𪖬𪗟𪘗𪞸𪟒𪟳𪟴𪧞𪨣𪨦𪬣𪬶𪭟𪰃𪵔𪵣𪵤𪵥𪵥𪵦𪵧𪷋𪸏𪸕𪼕𫀩𫂂𫄟𫄩𫄭𫊨𫍟𫎐𫏿𫒍𫔦𫘞𫙱𫜈㔕𣫺䍙𫠧𫢛𫦓𫧬𫯋𫯎𫰁𫴱𫵾𫷔𫹛𬀑𬁩𬅗𬆋𬆋𬆶𬇏𬇐𬇑𬇒𬇓𬐰𬑩𬑲𬒐𬜌𬝀𬝀𬠱𬣃𬥵𬧵𬩕𬪊𬫲𬫽𬮐𬮫𬶉𬶦𬸦",
 "乙": "亁仡刉吃呓呝屹忔扢挖杚汔漧犵疙盵矻砨籺紇纥肐虼訖讫豟趷軶迄釳阣阸麧齕龁㧖㨴㩿㫓䇄䎢䒗䞘䢀䦍䩐䬣䰴𠀸𠄃𠄄𠄊𠄋𠖯𠚮𠚱𠠶𠱁𠼳𡵊𡵋𢇓𢖴𢠥𢫁𣐖𣑒𣢆𤑓𤣮𤰢𤱘𥝖𦙏𦨏𧆦𧆫𨊰𨝌𨝝𨫬𨰿𨼃𨼉𩑔𩛪𩠓𩨘𩰌𩾥𪐜𪗚𪟴𪨣𪸏𪿜𫃝𫎐𫐚𫙱𫷔𬉽𬧴𬴕",
 "米": "亃偻僯喽噒噛婅嫾屡屦嵝嶙彛彜愾憐掬搂撛攗数斴暣暽椈楼橉毇毱淗溇滊潾瀵熂燐獜璘甐疄瘘瞇瞵磷窲簖粷粼糴糶繗缕翷膦菊蒌蒾蔝蘪蝼褛諊謎谜趜踘蹸躹轔辚遴鄰醚醾鎎鏻镂陱隣霼靝鞠餼驎髅鬻鱗鳞鵴麟麴麹齢㑶㔂㘀㛽㜆㥌㥪㥹㰘㴹㹼㽤䁖䆏䐖䕮䗇䗲䚏䚬䜯䨀䪕䫰䱡𠄈𠐹𠺗𠺪𠺫𠺼𡁔𡂰𡈏𡈛𡑝𡓏𡓴𡗅𡙢𡚋𡞱𡦎𡫭𡰚𡳁𡳛𡳞𡼵𡿑𢄞𢐫𢑀𢑱𢕸𢖕𢖖𢞞𢠴𢥐𢵁𢹔𢹪𢿻𣀲𣀽𣁣𣉢𣗌𣟗𣟸𣠂𣮕𣯘𣱬𤃱𤅴𤒑𤕃𤗷𤜔𤠋𤡩𤧁𤳕𥎃𥔔𥧔𥨺𥩂𥪷𥳞𥴅𥶶𥷻𥻋𥻐𥼭𥽡𥽤𥽰𦑫𦞝𦟂𦟶𦨆𦶚𦷥𦺸𦾿𧂲𧎵𧏨𧓔𧜃𧜚𧝮𧪢𧰢𧱲𧲂𧷍𧹵𨅀𨊌𨍦𨕜𨞁𨣿𨨠𨩐𨶌𨻖𨿥𩁴𩄧𩄲𩌽𩔢𩕔𩘞𩞻𩟍𩣽𩥀𩨇𩺍𩻑𪅞𪆀𪆞𪇒𪈚𪈫𪋗𪍴𪒉𪖴𪗱𪘂𪘚𪟱𪡨𪢈𪣻𪧘𪩇𪩋𪪷𪫇𪮩𪯚𪳑𪷯𪸃𪾴𫂗𫃔𫃘𫃵𫃼𫆭𫆿𫇍𫉀𫉱𫊊𫍴𫎌𫏝𫏞𫏻𫐷𫐽𫒄𫘚𫙂𫜏𫡮𫦉𫧷𫨥𫬪𫯶𫰿𫲜𫳢𫷹𫿝𬂕𬉂𬊞𬋯𬌥𬕿𬖠𬖨𬖩𬖭𬖷𬖼𬖿𬗀𬙈𬝮𬞰𬞺𬠔𬬜𬭸𬯧𬰐𬴊𬸞𬹴𬹸",
 "舛": "亃傑僯噒嫾嵥嶙憐搩撛斴暽椉榤橉滐潾燐獜璘甐疄瞵磔磷粼繗翷膦謋蹸轔辚遴鄰鏻隣驎鱗鳞麟㔂㻧䗲䚏䚬䢯䫰䮪䮼𠄈𠓲𠹳𡂰𡏝𡑝𡓏𡩣𡰚𡳞𡼵𡿑𢕸𢞼𢠴𢿻𣁣𣔕𣩊𣽘𤒑𤗷𤡩𥠹𥳞𥻋𥼭𦨆𦵴𦺸𧎩𧰢𧲂𨃥𨊌𨞁𩕔𩞻𩦆𩫟𩫤𪆞𪋲𪍴𫙮𫜏𫬪𬖨𬖩𬖿𬙈𬭸𬴊𬹸",
 "士": "亄任佶俧儥凟劼匨匵咭喆喆噎嚞夡奘妊姞娡娤嬄嬻弉恄懿拮撎曀桔梉梽櫝欯殪殰殸殻洁涜潱瀆焋牘狤瓄痣皼皾硈祮秸竇紝結綕続續纴结缬翓臺茌荘莊藚蛣衽袺装裝襩覟覿詰誌読讀诘豄豷贕贖趌軠迼郆鈓銡銺鋕鑟鞊韇韥頡颉飪饐驝髻鮚鲒鴶鷧黠黷㐖㓤㔛㙪㣟㦉㦤㱅㸒㸵㸿䂒䄊䄣䊋䊦䏕䏯䓀䓌䚾䢱䦖䨙䭇𠁪𠍼𠑃𠚌𠠔𠠠𠣲𠨡𠫻𠰃𠱊𠳗𠴢𠶮𠸆𠹢𠺇𠽻𠽻𠿦𡀄𡁩𡂝𡅕𡅕𡅚𡋥𡋼𡌬𡍱𡎷𡒼𡔍𡔞𡔟𡔠𡔢𡔤𡔦𡔧𡔯𡔯𡔼𡕇𡕇𡕇𡕉𡕊𡕍𡜩𡝂𡤜𡫸𡬗𡱠𡳑𡳛𡳦𡿱𢂮𢂴𢇦𢈜𢌦𢖏𢗖𢙳𢙺𢦁𢦆𢩋𢫟𢭜𢷺𢼣𣇌𣈂𣋺𣐅𣒆𣕅𣡆𣡳𣤯𣪷𣫆𣫉𣰬𣰺𣴣𣶖𣻅𣼘𤇧𤋔𤎿𤎿𤔎𤞛𤡬𤥐𤥴𤫶𤭩𤵴𤵹𤶜𤺦𤽸𤿠𥀲𥄮𥆅𥌚𥒺𥖷𥖿𥗣𥙛𥭡𥭺𥮍𥶦𥺃𥻽𥿥𦀜𦂑𦄥𦌷𦐼𦙰𦚘𦛋𦜙𦠉𦢌𦢗𦲻𦴷𦷓𦸉𧅎𧅡𧋺𧍩𧑭𧑭𧑱𧑱𧔖𧘅𧚌𧞜𧞟𧠒𧠯𧬇𧯸𧰝𧴒𧸝𧸷𧹌𧾥𨀋𨀙𨁗𨊊𨌄𨎈𨏔𨓮𨗡𨘫𨡈𨦁𨧅𨧣𨩒𨩒𨩒𨩓𨩓𨩓𨭓𨱻𨳝𨶮𨸌𨺃𨺄𨽍𩂐𩈪𩊴𩔄𩗊𩢴𩧈𩧵𩴺𩷓𩻭𩽆𪀆𪁄𪁓𪆖𪇟𪌧𪐾𪕖𪗾𪜒𪞉𪠅𪤲𪤴𪧱𪧸𪫍𪭁𪭿𪰙𪳮𪶼𪷁𪺁𪾼𫊟𫋮𫎔𫖡𫚽𫜖𫡖𫡘𫡺𫤣𫥘𫧺𫧾𫨺𫪣𫭰𫯅𫯆𫯇𫯈𫸌𫸓𫻢𫾪𬇨𬊌𬊽𬌏𬍲𬍲𬔃𬘨𬝰𬠪𬢌𬤞𬨋𬨕𬬅𬬯𬳀𬷘",
 "豆": "亄僜僼凒凱凳剴喜嘉噎噔壾嬁嬄尌嵦嶝彭愷憕懿撎撜敱敳暟曀榿橙橱殪溰潱澄澧燈獃璒皚皷皼瞪磑磴禮竳簦膯艠艶螘蟵覬覴證豑豷蹬蹰軆邆鄧鄷醴鎧鐙鐡镫闓闦隑隥霯霻顗颽饐體鱧鳢鷧鼓鼔鼟㔁㕏㙪㛸㜐㡠㡡㦉㦤㨟㰻㱅㱯㲪㽅䁗䅱䆸䊦䌡䐍䐩䔇䔲䕱䗳䙞䠽䪆䭓䮴䱺䳾䵄䶣𠃸𠊪𠍼𠐊𠓍𠙫𠷸𠹛𠻼𠽑𠾇𡃻𡅦𡐷𡒡𡒢𡔷𡔹𡤜𡪺𡫋𡬗𡳂𡻧𡽍𡾣𢅥𢜳𢝫𢢪𢦁𢦆𢵊𢵦𢸸𢹑𢿤𣀂𣃆𣙞𣞙𣠃𣩟𣪱𣫤𣰆𣰺𤃌𤅐𤅐𤍈𤘑𤠲𤡬𤢈𤣁𤧸𤮵𤳘𤸳𤺌𤼶𤼷𤼸𤾢𥀻𥀼𥀽𥀾𥎓𥏸𥐉𥐔𥖗𥖫𥗣𥚧𥨰𥪪𥴡𥸠𥻶𥼰𥽈𦒀𦠉𦡊𦩴𧃵𧄓𧒉𧔮𧞫𧪚𧬇𧬹𧯫𧯸𧯺𧯻𧯼𧯾𧯿𧰀𧰄𧰅𧰇𧰊𧰋𧰐𧰒𧰓𧰔𧰕𧰘𧰙𧰚𧰝𧰞𧰟𧰠𧰡𧰢𧰣𧰥𧴒𧸒𧹌𧺄𧽊𧾊𨎤𨐸𨔦𨕰𨢉𨮴𨯲𨲗𨶮𨶿𨷩𨸌𨼷𩀡𩁑𩄟𩍐𩏠𩘥𩘼𩙄𩙏𩟚𩥉𩮖𩯇𩻭𪆖𪏨𪒘𪟌𪤡𪤱𪤴𪩰𪭁𪳮𪴀𪷏𪽥𪾼𪿏𫋠𫌓𫏰𫓐𫖖𫙼𫜣𫠿𫣅𫧸𫯈𫷋𫷒𫹙𫻢𫻿𬋵𬑵𬑶𬑸𬢔𬤞𬤹𬬅𬮹𬳒",
 "止": "些佂佌儮呰呲啙噛嚦囸姃姕庛征徏徰徰怔捗攊政整昰柴柾櫪歪歶泚泟涉淽渉澁瀝炡爏玼瓑疵症癧皉眐眥眦砦礰祡竀紪紫罡胔茈荹蕋藶蘃觜証訾訿讈证貲赀跐踄轣鈭鉦钲阷陟雌靂靕頙頻頾頿频飺骴髭鮆鴊鴜齜齢龇㘹㠣㠿㧗㧘㫌㫮㭰㰣㱏㱔㱹㺡㻉㾟㿨䂑䂣䆙䇥䋊䍥䑰䖪䘣䟐䢥䤮䥶䳄𠀢𠂱𠉡𠊦𠌹𠑳𠘟𠙁𠝙𠝣𠟞𠠝𠢦𠢫𠦾𠩆𠫏𠭅𠰪𠳏𠳤𠷚𠾋𠾜𡃸𡇬𡏨𡗼𡘌𡘧𡚓𡛵𡝃𡢋𡢍𡤌𡥎𡧡𡩞𡫯𡳸𡹉𢁿𢃌𢆫𢈨𢊳𢌛𢌫𢓗𢖙𢘫𢝒𢠟𢡬𢤩𢧁𢵴𢿄𢿋𢿫𣀥𣁇𣂾𣄩𣄫𣆞𣆟𣌜𣐑𣚷𣜁𣢙𣥛𣥥𣥨𣥵𣦍𣦓𣦖𣦛𣦤𣦥𣪅𣫆𣭁𣻣𤁋𤇬𤎠𤑠𤖢𤘃𤛽𤝭𤧏𤫒𤫻𤯅𤺙𤽢𤽤𤿙𥌮𥒼𥓱𥖋𥘺𥙺𥞅𥤀𥦰𥨻𥩠𥫇𥬳𥷒𥹴𦇔𦈬𦍧𦘊𦙫𦙼𦚚𦝽𦟆𦪾𦭒𦯝𦷱𦿧𦿼𧁅𧌂𧔝𧕓𧗪𧘿𧙁𧞿𧡭𧥕𧨋𧬟𧰡𧴠𧶷𧺼𧼝𧿿𨇗𨊛𨒌𨒤𨕆𨕒𨘸𨚖𨚣𨛒𨟑𨠐𨠣𨣷𨪱𨪱𨭟𨱲𨲝𨲦𨷦𨹀𨺛𨺾𨽥𨾖𩄕𩊶𩍳𩑽𩙖𩢑𩢭𩣝𩬧𩯺𩲨𩶆𩶝𩷖𩻩𩽏𩿳𪃚𪉈𪌷𪓀𪕊𪕑𪖍𪗁𪗱𪗶𪘂𪘏𪘚𪙽𪤶𪨏𪪎𪭤𪭻𪳡𪴢𪴹𪴺𫅏𫇀𫌕𫏀𫏁𫏂𫏃𫏄𫏅𫏆𫏇𫏈𫏉𫏊𫏋𫏌𫏍𫏎𫏏𫏑𫏒𫏓𫏖𫏗𫏘𫏙𫏚𫏛𫏜𫏝𫏞𫏟𫏠𫏡𫏢𫏣𫏤𫏥𫏦𫏧𫏨𫏩𫓋𫚖𫛄𫝍𫟣𫠱𫢢𫨞𫫈𫳊𫾐𫿮𬄢𬅿𬆁𬆃𬆄𬆅𬆈𬆏𬇵𬈈𬋮𬌆𬛄𬝸𬟿𬥖𬦠𬦡𬦢𬦣𬦤𬦥𬦦𬦧𬦨𬦩𬦪𬦫𬦬𬦮𬦯𬦰𬦱𬦲𬦳𬦴𬦵𬦶𬦷𬦸𬦹𬦺𬦻𬦽𬦾𬦿𬧀𬧂𬧃𬧄𬧅𬧆𬧇𬧉𬧊𬧋𬧌𬧍𬧎𬧏𬧐𬧑𬧒𬧓𬧔𬧕𬧖𬧗𬧘𬧙𬧚𬧛𬧜𬧝𬧞𬧟𬨶𬩿𬪳𬬜𬱐𬹑𬹚𬹴",
 "匕": "些伲佌佗冟卽呢呰呲咜啙塟妮姕屍屔岮庛廏怩恉愼態態抳抿拕指掲斃旎旣昵柁柅柴栺梎槇橷歶毙沱泚泥渇炨熊熊熋熋狔玼璏璏疵痆皉眤眥眦砣砦祡秜稽紪紫紽罷罷胒胔脂臰舵苨茈葬薧薨蘏蘔蚭蛇螚螚袉褦褦觜訾訿詑詣诣貲赀跎跐跜迡迱鄕酡酯鈭鈮鉈鎭鑙铊铌陀雌頾頿顚飺馜駂駝驼骴髭鬰鬱鮀鮆鮨鴇鴕鴜鴲鷆鸨鸵鼧齜龇㑷㑷㘸㘹㚛㞓㞛㞾㠿㧗㧘㨢㨢㩩㫮㭰㮷㰣㰷㱔㱝㴰㴰㸟㸰㼠㾃䂑䂣䆞䖪䘅䘅䘣䘦䙾䛏䝚䡐䥝䪑䬁䭫䭬䲿䳄䴱𠀢𠂱𠆚𠉞𠍬𠤙𠤚𠤟𠩆𠩊𠪶𠹌𠹌𠺳𠾋𡃸𡇠𡈒𡊴𡎿𡏨𡓡𡔸𡖟𡗼𡘌𡢍𡥎𡨇𡩆𡮙𡮙𡳭𡻗𢃌𢊳𢋺𢍈𢏋𢓗𢓚𢘒𢘯𢟒𢟒𢬒𢲀𢹃𢼊𢾂𣅸𣆟𣉘𣉘𣐉𣐑𣑘𣒨𣖗𣙰𣜁𣟤𣡎𣡫𣢙𣢞𣥥𣥨𣨀𣨑𣨰𣩁𣩂𣩇𣩉𣩖𣩭𣩴𣩸𣩺𣩾𣪘𣭁𣭙𣴡𣸘𣼋𣼮𤀛𤃡𤅥𤅪𤆫𤇬𤎙𤏶𤒣𤓄𤓡𤙌𤝛𤝭𤠗𤠗𤤗𤹍𤹍𤼛𤼛𤽤𤽨𤿃𤿙𥀍𥀍𥁗𥄻𥉃𥉃𥙇𥞅𥞒𥠴𥠻𥡔𥡞𥥕𥥱𥦒𥧑𥧛𥩥𥪧𥬌𥬩𥬳𥰘𥰘𥹆𥹈𥽃𥿡𦂋𦈬𦋼𦋼𦍧𦑴𦑴𦓀𦙼𦚐𦚚𦤽𦦃𦧑𦫭𦮂𦴓𦴪𦵏𧂎𧊙𧕓𧖛𧙁𧟽𧟽𧥕𧩴𧬟𧴞𧴞𧵲𧹟𧺼𧿿𨃳𨃳𨈷𨋗𨌁𨒤𨚖𨠐𨤊𨫞𨮺𨱲𨱼𨲝𨲦𨳷𨶙𨶙𨹀𨹎𩉹𩉺𩊝𩊢𩍳𩑽𩒂𩒨𩖹𩙸𩙸𩠜𩢈𩢑𩢭𩫓𩬺𩰠𩰡𩰢𩰣𩰤𩰥𩰦𩰧𩰨𩰩𩰪𩲨𩲮𩶆𩻼𩻼𪁬𪉆𪉈𪊨𪏛𪏛𪏸𪓨𪕊𪕑𪗩𪗶𪗷𪘄𪘟𪜪𪜵𪞋𪟙𪠝𪣾𪣾𪫒𪬒𪰾𪳡𪴴𪵊𪷿𪿗𫂉𫆜𫆽𫆽𫈇𫍡𫒃𫙖𫚖𫜒𫟤𫠹𫠹𫢩𫣵𫤙𫥉𫨩𫨩𫩃𫪔𫭿𫭿𫷍𫸘𫿌𫿌𬂌𬂌𬅃𬅿𬆊𬆗𬆘𬆜𬈓𬋎𬐵𬚆𬚆𬝺𬠺𬧼𬨬𬫏𬯳𬱝𬲒𬲱𬶍𬸼𬹨",
 "厸": "亝垒絫㕖㕘㴉𠬄𠬅𠬎𠬐𠬓𠬔𠬘𡽭𣕀𣦯𣳵𣸓𣺃𣺴𣾯𤡅𤯢𤲛𤳑𤸾𤹮𥓗𥔪𥕃𥜷𧀉𧏝𧵱𨒴𨹶𩅙𩥵",
 "⺅": "亱佞凭华吪咃咐咻咿哬喺嗰囮垈垡堡姇姙娰媬宱宿岱帒府庥弣怤怹恁恘恷您拊拰掖敒杹柋柎栠栣栰栿桦梻棭椺楩沎泭洑洢浌涖液湺溣濮炛烋烌焲煲牮玳祔秹符笩筏筗筰箯篟紨絍絥緥緶纀缏胕腋芢花芿苮苻茌茠茯茷茽荏荷莅莋葆葰蒨蓓蚮蚹蛜袋袝袱袵褒褓襥覄訛詂諐讹貅貨貸賃賲货贷赁跗軵鈋鉜銋銝閥阀附雁靴鞭餁駙驸髹魤鮒鮘鮲鮴鯾鲋鴈鴏鵀鵂鵺鸺黛㐛㐺㑖㖌㖚㖡㗡㘺㙸㚝㛹㜃㝛㢋㢿㣡㤔㤛㤰㥋㨐㭖㮉㯷㳜㳝㳞㴢㶵㷛㹯㺱㺸㾈㾋䂤䇚䇮䈗䋕䏫䑧䒫䓲䔀䘸䛘䛙䟮䠵䣏䣸䣹䤦䤳䧹䭋䮌䳰䵾𠁀𠁫𠄶𠅗𠅚𠅜𠅱𠆓𠆕𠆙𠇃𠉿𠊝𠌋𠍜𠍟𠎟𠏬𠏳𠑉𠑕𠑖𠒷𠕿𠜬𠝓𠞵𠠭𠡬𠣒𠥔𠩡𠯒𠯰𠯹𠯼𠯾𠰰𠰺𠱊𠲉𠲎𠲏𠲟𠲽𠳎𠳔𠳙𠳷𠴒𠴓𠴖𠴚𠴞𠵱𠶆𠶉𠷊𠸒𠸘𠸤𠹹𠺦𠺭𠼏𠼮𠼵𠼸𠽀𠽙𡀯𡀰𡂈𡂲𡃽𡄭𡇩𡈬𡋚𡌅𡌠𡏧𡑗𡔟𡖱𡖺𡛉𡛲𡜟𡜨𡜬𡠓𡢦𡢻𡥖𡧛𡧜𡨱𡩤𡫪𡸌𡸏𡻓𡾵𢀫𢂆𢂌𢂧𢆣𢉡𢉣𢋗𢌣𢍑𢎌𢑟𢘋𢙠𢙬𢚨𢠉𢠙𢠚𢨖𢪎𢪗𢫌𢫙𢫟𢫩𢫯𢬩𢬲𢭢𢭬𢭱𢰇𢰡𢷏𢸟𣁑𣂿𣈋𣈙𣏴𣐾𣑡𣒍𣔢𣔤𣘟𣣢𣨐𣨔𣨜𣫲𣭩𣯂𣯒𣲒𣲚𣳈𣴓𣵁𣵣𣵤𣵲𣵿𣶜𣷱𣸇𣹘𣹥𣺈𣻃𣻈𣼱𣾳𤆷𤇧𤇰𤇲𤈢𤉔𤏥𤝔𤝯𤝳𤞗𤞘𤠣𤤕𤥿𤦸𤪟𤭭𤱢𤵩𤵴𤶙𤷴𤸗𤸰𤻮𤼡𥁙𥄒𥄰𥅩𥆂𥆓𥇁𥑧𥑼𥞂𥣜𥩦𥩱𥬍𥮆𥮋𥯏𥰒𥰧𥱌𥱢𥵎𥵘𥵜𥹃𥾾𥿝𥿥𦀪𦁂𦃺𦓍𦕽𦙯𦙰𦚘𦚮𦟋𦟑𦢖𦢻𦣨𦨮𦨷𦪥𦬖𦬙𦬯𦭽𦭿𦮪𦮬𦯉𦯒𦰣𦰿𦲤𦲺𦳄𦴩𦵠𦵦𦶒𦷉𦷛𦸲𦹋𦹜𦺉𦼑𦽻𦿍𦿛𧀻𧁓𧄔𧇚𧊆𧊇𧊰𧌊𧍅𧍇𧍲𧍻𧎧𧑬𧑲𧓆𧓯𧙨𧚙𧚤𧛱𧝛𧝥𧟸𧡊𧡞𧥰𧧻𧨂𧨻𧩀𧪄𧭎𧭭𧱩𧱺𧳂𧳡𧳤𧸛𧹿𧼄𨀋𨀳𨁔𨁬𨂒𨂯𨃫𨄦𨆯𨇓𨉃𨋩𨎡𨑮𨒕𨓕𨓲𨕪𨘐𨘐𨠍𨠰𨠲𨥐𨥶𨦁𨦛𨦪𨨐𨩚𨩫𨫅𨫡𨮑𨮓𨯑𨯘𨱂𨳢𨴰𨴿𨵀𨵁𨵅𨵸𨶊𨶨𨸇𨽂𨾪𨿂𨿃𨿤𩀕𩂠𩃅𩃐𩃷𩄸𩊙𩊹𩋍𩋔𩌖𩍩𩎠𩎧𩎵𩑭𩗆𩛮𩢮𩢰𩣍𩥥𩪻𩬙𩭼𩱡𩲏𩲜𩶕𩷀𩸔𩸲𩺟𩾹𩿧𪀆𪀢𪀪𪀼𪁃𪂄𪃁𪅬𪍅𪍞𪐻𪐾𪑁𪔶𪕟𪘆𪘓𪘕𪘠𪘡𪜐𪜓𪜣𪜤𪝁𪝠𪝩𪝪𪝯𪝱𪝲𪝹𪝻𪝽𪟰𪠐𪡇𪡈𪡟𪢼𪥷𪧐𪧒𪧸𪨍𪨠𪫊𪫫𪫱𪬽𪭡𪭩𪮈𪯕𪱊𪲼𪴳𪵌𪶔𪶠𪶢𪷔𪸽𪺓𪻜𪽩𪿰𫁓𫁻𫂕𫃝𫃢𫄢𫅁𫆛𫇱𫇹𫈄𫈆𫈈𫈘𫉔𫌠𫌸𫎔𫏊𫏚𫑒𫒬𫔛𫔟𫕤𫖄𫙆𫚣𫜗𫠷𫠻𫢖𫢫𫢵𫢼𫣇𫣈𫣪𫣭𫣯𫣰𫣱𫣵𫣸𫤁𫤄𫤈𫤉𫤋𫤎𫤏𫤑𫤒𫤓𫤕𫦺𫩳𫪢𫪣𫪥𫬦𫮙𫮯𫯧𫰕𫰙𫱖𫳌𫳵𫴞𫴮𫶟𫶭𫶸𫷝𫸆𫸋𫺑𫺛𫼂𫼻𫽎𬁾𬂃𬂬𬂺𬃵𬆈𬆖𬈼𬊞𬋒𬌀𬌕𬍕𬍠𬍦𬎉𬏣𬑟𬒘𬓧𬓰𬔪𬔻𬕅𬕥𬖒𬚅𬚣𬛤𬜳𬝒𬞶𬟆𬟹𬠊𬠙𬡹𬢷𬣋𬣢𬣯𬦿𬩘𬩹𬫊𬫛𬫺𬯑𬰴𬱎𬳖𬵕𬶌𬷈𬷗𬸊𬺇𬺙",
 "七": "亳仛厇吒唣奼宅彻托杔梍汑沏灹矺砌秅窃籷苆虴袃託讬飥馲魠㡯䀙䟙䨋𠣔𠯦𡨗𢏒𢖲𢗠𢗧𢩷𢪃𢫅𢯀𣅒𣐆𣓽𣧃𣳥𣶾𤆻𤕔𤜤𤟀𤣯𤫪𤰦𤴱𥁩𥝾𥭬𥾛𦕀𦘴𦨎𦬃𧘐𧧉𧯝𧲢𧿌𨀟𨥓𨥔𩑒𩱾𪌂𪐞𪣓𪣝𪣞𪺩𫊧𫒇𫾌𫾧𬍔𬦛",
 "丸": "亵兿势勢垫塾墊慹挚摯摰暬槷槸漐热熟熱絷縶萟蓺蓻蛰蟄褹褺褻謺贄贽騺驇鷙鸷㙯㝪䃞䉅䙝䞇䠟䥍䲀𠅀𠌷𠢞𠢟𠪑𠽃𡂞𡙰𡠗𡠦𡫑𡼈𢄢𢌀𢳊𢴇𣊎𣊓𣎖𣑱𣙀𣙗𣼳𤄁𤍠𤍽𤎒𤮅𤴢𥂕𥊍𥊝𥡩𦎷𦥎𧃳𧜼𨄡𨄴𨎌𨶝𩅀𩮿𪜟𪟛𪠺𪣖𪦝𪧢𫐋𫗹𫡊𫮛𫷼𬏧𬓺𬔦𬗵𬡓𬷮",
 "回": "亶圖瀒禀稟鄙𠡳𡏁𡐴𡞎𡳄𣞋𣮗𤌚𤒀𤖣𤖧𤹦𥀚𥀜𥂬𥔯𥢺𥧘𨗍𨝚𩞓𩻂𪎎𪜥𪞌𪪨𪬹𪯜𪯮𪲪𫃅𫅊𫓞𫡿𫢀𫤲𫪓𫪮𫳖𫿧𬄜𬊥𬍭𬗟𬫫𬬟𬹃",
 "了": "亸哼悙梈涥烹脝㧸𡠮𢚟𣨉𦨾𧁛𧨑𨧤𪫢𪻥𪿒𫭸𫰳𫺱𬅽𬏝",
 "同": "亹斖虋霘𠍟𢞉𣡿𤕉𤕊𥎤𥎥𥖹𥤎𧄸𨬎𨰨𩎑𩽬𪔦𪢉𫈷",
 "且": "亹唨摣斖曡樝畳疂皻竩筯耡莇菹萓葅蒩蔖覰誼謯谊鋤鎺锄齇㜘㜼㢒㩹㪥㲲䁦䃊䈌䓚䔃䠡䣾䴑䶥𠐅𠒩𠠯𠢞𠢟𠭯𡀉𡩶𡬐𡬐𡬐𡳆𡹠𢃃𢚆𢭟𢯽𢶣𣁪𣈍𣕈𣗿𣜖𣦍𣨖𣨩𣵪𣶺𣹖𣿫𤅚𤍄𤕊𤞩𤦌𤴉𤴍𥜀𥠙𥺥𦈅𦋽𦖑𦯓𦳏𦷵𧄸𧨏𧱑𨂀𨈈𨌵𨐁𨛯𩈭𩓧𩤒𩶵𩸨𪂓𪂔𪆷𪊹𪑎𪓐𪖸𪘲𪜾𪠭𪢢𪣯𪩁𪬃𪮩𪳌𪾫𫊜𫍹𫏝𦼬𫦄𫦆𫦡𫦬𫦵𫯲𫳲𫽖𬀼𬁁𬂶𬄗𬆄𬇇𬓇𬖼𬗦𬙦𬠢𬨱𬺌",
 "勹": "仢伨佝佨侚刨劬匏呁呴咆咰哅啕够夠妁姁姰婅孢尥岣峋庖彴徇怉怐恂恟扚抅抣抱拘掏掬掲揈敂斪旳昀昫朐杓枃构枸枹栒椈欨殉毥毱汋汮沟泃泡洵洶淗淘渇渹灼炮炰爮犳狍狗狥玓玸玽珣瓝瓟畃畇疱痀的皰盷眗眴砲礿祹窇竘笉笣笱筍粷約絇絢綯约绚绹翑耇耈肑胊胞胸芍芶苞苟茍荀菊萄葡蔔虳蚐蚫蚼蜔蜪袀袌袍袧裪訋訽詢詾諊询豞豹豿购赹趜趵跑跔踘躹軥軳輷迿邭郇酌醄釣鈎鈞鉋鉤銁銞鋾鍧钓钧钩铇陱陶雊雹靤靮鞄鞠鞫韵颮飑飽馰駒駨騊驹骲髱魡鮈鮑鲍鴝鵴鸲麅麭麴麹鼩齁齙齣龅㕼㘬㚬㚿㝁㡄㢩㣘㣿㥌㧦㫬㭵㮄㯡㰬㲒㶷㹼㽛㽤䂆䄪䅓䋤䍖䎂䏛䑦䓒䕮䖲䗇䘩䛌䛬䜯䝧䝭䞤䡘䣱䧁䩓䪕䪨䪷䬨䬲䮀䱡䳈䵠䵶䶂䶌𠅱𠊐𠊫𠋹𠌑𠏈𠒟𠓨𠘷𠚭𠚸𠛎𠝇𠡪𠣛𠣝𠣢𠣣𠣨𠣨𠣩𠣪𠣪𠣫𠣬𠣳𠣶𠣷𠣺𠣻𠤁𠤃𠤉𠮭𠯜𠳉𠴣𠴦𠴶𠷜𠹪𠾠𡉲𡊦𡋕𡋝𡋝𡌲𡍒𡖑𡖒𡖜𡘅𡘬𡚷𡞦𡦐𡫭𡯡𡱈𡱺𡳏𡵺𡶄𢀆𢁀𢁕𢂁𢄇𢄝𢊙𢎅𢏔𢐺𢑪𢓈𢔇𢔚𢗋𢗕𢜓𢝁𢞛𢞧𢩁𢫤𢮔𢵁𢵖𢶭𢻭𢻸𢼃𢼇𢼌𢼒𢿩𣀖𣁈𣆃𣌨𣑤𣓓𣕅𣕍𣕽𣖆𣖏𣖼𣚇𣤒𣧀𣧔𣧬𣭀𣭚𣮕𣮴𣱡𣵦𣹯𣺷𤆥𤆫𤉵𤋤𤋥𤍥𤎗𤖮𤖵𤘽𤙊𤜔𤜼𤝧𤟼𤡡𤥘𤩉𤫱𤭶𤱬𤳠𤵆𤶇𤿈𤿉𤿟𥂩𥄹𥈈𥐝𥐩𥐾𥑪𥒘𥒙𥒚𥓤𥓮𥔀𥖒𥘩𥘮𥙣𥚍𥛠𥡚𥢀𥩘𥩞𥩮𥪇𥪈𥫂𥫩𥫷𥬉𥭖𥮀𥮽𥶶𥷚𥷤𥷴𥾡𦁮𦁮𦃥𦆗𦉹𦊒𦊠𦐛𦐥𦑟𦓂𦔁𦕙𦚧𦜛𦠖𦢭𦨓𦨛𦫣𦭪𦰮𦰶𦰾𦱜𦱩𦲂𦲆𦳹𦴳𦵈𦵑𦶔𦻖𦻦𦼀𦾀𧂲𧃈𧃓𧘑𧘤𧙌𧙎𧙘𧛍𧝮𧡳𧥺𧩂𧩛𧪂𧪱𧮌𧯠𧰴𧲳𧲼𧵈𧵢𧵣𧺕𧺤𧻌𧻛𨀴𨂆𨄑𨈳𨊵𨋮𨌨𨒡𨚔𨜬𨝁𨠖𨠮𨥒𨥸𨨠𨪵𨼞𨿥𩀣𩀣𩁴𩃇𩇌𩉿𩋃𩋲𩌠𩌽𩎘𩐜𩐝𩖚𩘇𩢛𩣽𩤄𩤐𩲃𩵻𩾡𩿃𪀀𪀊𪀠𪀽𪅞𪊡𪌼𪏶𪐯𪐼𪓞𪓟𪓠𪖙𪚭𪚵𪚶𪜩𪜪𪟑𪠴𪡡𪪊𪭠𪭹𪮇𪵀𪵙𪹌𪹐𪻎𪽕𪾠𪿕𪿤𫀆𫃠𫈖𫌩𫍍𫎍𫎧𫐒𫑂𫒹𫓲𫕑𫘦𫙫𫚱𫞮抱𫧂𫭈𫯯𫱀𫲢𫸞𫹾𬈌𬊟𬎙𬏀𬐄𬐏𬕇𬗚𬘗𬣝𬤁𬤺𬨉𬯈𬲯𬶄𬶋",
 "小": "仯倞凉剠劣勍叔吵妙婛尜尟尠就嶚嶛巀弶惊戚抄掠敊旀景晾杪椋歩毟沙涼炒熦猄玅琼省眇砂秒稤竗粆紗綡纱翞耖茮荪袮觘訬諒谅赻輬辌逊鈔鍄钞隲魦鮛鯨鲸鶁麖麨黥㑐㝹㝺㝻㠺㢱㧠㹁䁁䃄䏚䑐䒚䖢䝶䟞䟢䣼䦊䩖䭜䯯䲵𠀰𠃣𠅮𠅽𠆃𠈒𠌀𠒨𠓃𠘔𠚺𠩏𠫴𠬇𠯙𠱙𠶛𠻘𡂌𡄡𡅹𡌿𡙑𡙚𡚓𡜔𡣯𡦓𡧯𡫁𡬧𡬱𡭝𡭟𡭥𡭲𡭸𡭹𡭺𡮀𡮎𡮏𡮏𡮏𡮑𡮓𡮗𡮘𡮞𡮦𡮧𡮯𡮴𡮹𡮻𡮼𡮿𡰗𡰜𡵯𡹞𡹡𡾃𢆫𢆷𢆽𢈴𢋿𢒮𢕱𢙤𢝝𢠃𢥖𢧵𢪍𢬅𢬰𢰜𢷿𢹓𢻃𣌱𣐣𣐹𣑷𣒹𣘽𣜮𣢒𣢰𣧖𣨣𣮘𣰲𣲡𣲦𣴒𣸌𣺟𣻖𣻾𣼎𣾾𤁢𤃜𤄔𤍳𤎤𤒱𤤉𤥮𤪁𤰬𤵌𤷦𤹊𤻵𥅷𥘤𥘷𥣀𥣀𥣩𥧤𥰚𥳦𦁗𦌦𦕈𦕉𦙧𦨖𦿐𦿧𧈅𧈏𧉍𧌬𧐑𧓷𧕚𧗰𧘡𧞩𧠪𧤀𧧌𧯊𧽟𧾢𨀚𨂙𨄤𨇉𨈘𨖸𨗈𨙹𨚈𨚒𨝼𨤢𨨚𨫺𨮽𨱉𨻶𩐡𩒛𩖥𩗬𩘁𩟦𩡾𩯰𩲎𩲿𩵃𩵮𩸌𩻻𪀖𪅓𪍉𪍉𪎊𪖀𪗒𪗓𪨄𪨆𪬧𪲦𪵔𪾻𪿉𫀾𫈳𫈳𫈳𫋗𫕔𫖎𫚌𫛧𫟅𫢁𫢂𫢡𫣪𫱧𫴻𫵉𫵊𫷲𫹣𫹶𫿀𫿿𬁀𬆠𬊣𬊧𬋘𬌜𬑥𬕓𬚙𬝃𬟖𬤟𬪛𬫐𬲅𬳮𬴉𬵊",
 "八": "份伀倶兊兗兝兺吩哛哾坌塞妐妢寋寡寨岎岔帉弅彸忩忪忿悅扮挩掰搴攽敓昐昖朌松枀枌枍枩梤梲棼椕氛汾涗炂炃玜玢瓫瓮瓰盆盻盼砏秎稅竕粉紛纷翁翂肹脫舩芬蚠蚡蚣蛻衮衯衳褰訜訟說謇讼貧賽贫赛蹇躮邠酚釁鈆鈖銳閱雰頌頒颁颂馚騫骞魵鳻鶱麄黺鼢㕬㝐㞣㟗㟗㤋㥶㳂㴅㸮㿽䇗䒊䚗䚷䡆䭻䯳䰸䲲𠀒𠂞𠆵𠈀𠊠𠊨𠋹𠔑𠔑𠔕𠔘𠔠𠔡𠔢𠔲𠕺𠖲𠚅𠚼𠛀𠛸𠜑𠝂𠣤𠤰𠥁𠧯𠪺𠬰𠮄𠯋𠯨𠰗𠺍𠾞𡆽𡆾𡇇𡇛𡋇𡓌𡔴𡕵𡗯𡗳𡛑𡟸𡧋𡩞𡭅𡯕𡯬𡴚𡵳𡵴𡷋𡷬𡸐𡹀𡺜𢁥𢁷𢃧𢇱𢈑𢈳𢕊𢗴𢚔𢚱𢛌𢞛𢨱𢪆𢪌𢪘𢬁𢮭𢯌𢰺𢵙𢺹𢺺𣁺𣊅𣊆𣊱𣌥𣌶𣏰𣓚𣕆𣖼𣗰𣙚𣛊𣢍𣢏𣥝𣬄𣬩𣮆𣹁𣹯𤁙𤆶𤓼𤖭𤗉𤘝𤝅𤟳𤢱𤥼𤦚𤦱𤫗𤫫𤰪𤲋𤵇𤵕𤷥𤽉𤿫𥁝𥁣𥄟𥆟𥈕𥍠𥘶𥝶𥣍𥥄𥦋𥬋𥮨𥰴𥹲𥺯𥽡𦏡𦐈𦕎𦖬𦣡𦤉𦦟𦬘𦰠𦹎𦽜𧆷𧇓𧗺𧘠𧜎𧟯𧠚𧧡𧩟𧪱𧮱𧷐𧷟𧺭𧺮𧿚𧿝𨁑𨉋𨋂𨌔𨌪𨐯𨐰𨐳𨑪𨒄𨚇𨝁𨨟𨱛𨳗𨳚𨳣𨴶𨸣𨸮𩃍𩇴𩉭𩉵𩊭𩎰𩒬𩔌𩔫𩣭𩬉𩭤𩰏𩲝𩿈𩿉𪁑𪄏𪋨𪌥𪎕𪏍𪏱𪐭𪖜𪖝𪙅𪙆𪙇𪜣𪞇𪟇𪟊𪟐𪟑𪤫𪧔𪧦𪪳𪯗𫅈𫊿𫍛𫎙𫓪𫓫𫖻𫚍𫜜𫟴𣚣磌鬒𫡇𫤵𫤶𫦇𫲦𫶫𫺏𫽂𫽥𫾮𬈡𬏔𬐟𬛉𬥏𬥕𬦁𬨟𬲍𬲟𬸣",
 "厂": "伌儼兣剺劂励勵厴呃呖啀喱噘嚈壓娾嫠嬮孍孷岸崕崖嶡嶥巁巌巖巗彦恹憠懕懨扼捱撅擪擫斄昃曆曞曮枙枥橛橜橱檿櫉櫔欕歴歷氂沥浐涯湹漦濿爄犛獗玁甅産疬睚矋砈砺磿礪礹禲竰粝糎糲緾苈苊萨蕨蚅蛎蟨蟩蟵蠣讝贋贗赝蹰蹶蹷軅軛轭釅釐鈪鐝铲镢阨雳靨頋顾饜魘鱖鱱鳜鷢麣黶㘙㙭㜧㟁㡡㱘㳁㵐㷳㷴㻺㽁䉷䕾䙠䝈䝽䣑䥄䱳䶫𠊎𠎮𠑊𠔳𠘥𠟄𠠏𠠿𠢐𠢤𠢭𠩣𠪺𠭰𠰑𠶲𠾇𡂖𡃌𡐯𡐰𡐷𡓸𡗏𡙽𡛖𡡕𡪸𡲃𡶨𡶴𡺉𡽣𢄡𢅅𢅠𢅥𢆌𢛄𢟍𢟤𢢳𢤆𢥴𢭘𢴺𢺘𢿂𢿍𣀗𣁛𣁟𣁿𣂀𣂇𣅦𣐃𣒟𣒽𣔦𣘬𣙽𣝓𣣃𣣭𣦯𣦰𣯗𣯷𣳙𣸒𤂮𤅙𤇃𤎝𤏚𤑤𤛦𤜸𤡫𤢵𤦐𤪲𤪾𤫠𤯍𤳪𤺤𥀬𥌅𥍓𥑣𥔈𥕉𥕲𥕳𥜒𥝂𥣘𥣭𥣹𥩧𥯅𥷅𦁩𦆨𦍠𦙜𦝟𦠑𦠩𦪘𦰘𦲒𦷖𧂱𧍊𧎞𧒉𧓽𧖄𧗖𧝏𧞣𧞵𧟓𧠏𧡋𧢏𧢝𧦡𧧝𧨊𧨵𧬎𧯏𧴣𧻀𧽆𧽸𧽺𨂉𨂷𨆼𨇆𨇎𨍃𨎯𨞺𨤲𨤸𨤺𨬐𨬑𨯅𨰫𨽀𩀾𩅩𩓲𩤴𩦒𩧃𩪪𩯾𩱔𩵡𩼴𩽴𩾸𩿫𪅗𪅼𪆒𪆙𪆿𪋹𪒁𪘬𪙪𪙺𪞢𪠚𪠦𪣄𪧳𪫡𪯨𪱑𪳽𪴪𪵱𪶫𪷏𪺾𪻵𫀤𫅕𫎱𫐆𫑮𫒄𫝸𫟫𫠀𫥳𫥵𫧷𫨎𫨥𫨾𫩫𫮈𫲠𫵷𫶟𫹪𫼪𬃗𬆴𬈦𬎕𬒡𬡉𬡻𬢬𬣨𬣶𬥦𬦣𬩤𬪾𬪿𬫁𬫂𬫭𬲩𬺅",
 "㔾": "伌佹卼呃妴姽宛尯峗峞怨恑扼枙栀桅洈盌眢砈硊祪笵脆臲苊苑范蚅蛫觤詭诡跪軛轭鈪阨陒頋頠顾駌鮠鴛鸳㠾㧪㩻㫉㼝㽜䀀䖤䛄䝈䣀䤥䳃𠙀𠛠𠝰𠝽𠨜𠨪𠱍𠱓𠽱𠽵𡁄𡍡𡖏𡛖𡛣𡧭𡳀𡶟𡼌𡼟𢂕𢈌𢪸𢼨𢼮𣆌𣆡𣐃𣢪𣧼𣪰𣳜𤙙𤜸𤥕𤨰𤱯𤳭𤿡𥍨𥎾𥑣𥝂𥥠𥰷𥶊𥿎𦊗𦒘𦓛𦕕𦖹𦗎𦙜𦙵𦟒𦤞𦦩𦨨𦨲𦨹𦴮𦷖𧐫𧝱𧠏𧧁𧯡𧵍𧵥𧷪𧻜𨋜𨞆𨠥𨧍𨪿𨴓𨾼𩊁𩊛𩌕𩌷𩎝𩖿𩗜𩚴𩵡𩺜𪀈𪀗𪄷𪎛𪖡𪖤𪞏𪮸𫈕𫈣𫍠𫎾𫏸𫥊𫩨𫶺𬡉𬥣𬪾𬱟𬱺𬲩𬶏",
 "匚": "伛偃傴剾劻呕咂哐嘔奁奩妪嫗尀岖嶇彄怄恇悘愜愝慪抠揠摳擓敺枢柩框椻榧樞櫃欧歐殴殹毆沤洭漚熰瓯甌眍眶瞘砸笸筐筪筺箍篋篚籄膒苉蓲蝘褗誆謳讴诓貙躯躽軀軭邼郾醧鉔鉕鏂鑎钷陿隁饇駆驅驱鰋鰸鴄鴎鶠鷗鸥鼴㑌㒑㙺㥦㥱㥾㧜㧟㨤㭱㮜㰼㰽䁥䆰䉱䌔䏘䒰䕚䖱䘌䙔䝙䞁䞪䡱䤷䧢䩽䳼𠄾𠇽𠌨𠏺𠐄𠓿𠛅𠢔𠥷𠥹𠥺𠥺𠯔𠯕𠰐𠵏𠸯𠽋𡛘𡠷𡣓𡩾𡬿𡶅𡶆𡹶𢄠𢕓𢬤𢴂𢴚𢷯𢷴𢼳𢾺𢾻𢿛𣂻𣃱𣈿𣉾𣎥𣐝𣕸𣘗𣙐𣙖𣛍𣞃𣤆𣩛𣬮𣯄𣲳𣹐𣾀𣿬𤎐𤛐𤝿𤠾𤦵𤹪𥈔𥍻𥎛𥐵𥔌𥕥𥠶𥮃𥱝𥱸𦆠𦈗𦊺𦑄𦖧𦚗𦚞𦭧𧏃𧓱𧙅𧦅𧦩𧻔𧿽𨀕𨄅𨦑𨧄𨧇𨯍𨴑𨸟𨸭𨻃𩀀𩀫𩍨𩏱𩑼𩒑𩔸𩢘𩢼𩣕𩬹𩳺𩺱𪀘𪐌𪙛𪟮𪠯𪡄𪥎𪦈𪨞𪫨𪯭𪯵𪴋𪶬𫁔𫁹𫂸𫋲𫑝𫑧𫓬𫘇𫚢𫧔𫧕𫧜𫨹𫭟𫸩𫺹𫻑𫽆𬁵𬄈𬇅𬉼𬋯𬑚𬔯𬕣𬙟𬚴𬡋𬥺𬪧𬮣𬳤𬳻𬸘",
 "九": "伜匦匭忰枠染泦疩砕粋紣翆酔雑髛㖌㘲㙀㳃䬨䯌𠯥𠯾𡉻𡧌𡧫𡫄𡶋𢇥𢪄𢬐𢭕𣅢𣐊𣑢𣒔𣓕𣲼𣳣𣵇𣷾𣸴𣽕𤝨𤲏𥤿𥦚𥧖𥫷𦙷𦜛𦬖𦳛𧺤𧿻𨥐𨸰𩬜𪺬𫀯𫕂𫘲𫰓𬅠𬖚𬜫𬲑",
 "宀": "伫佇佗侒侘俒俕倇倧傛傢傧剜割咛咜咤咹哰唍啘喀喧嗐嚓塞姲姹婃婉婶媗嫁嫆嫔嬸孮密寋寗寧寨岮峖峵崇崈嵱帵幏彮徖悰惋惌愃愘愙愹憲拕拧按挓捖捥揎揢搈搳搴摈摍擦晏晥晼暄柁柠案桉梡棕椀楁楦榁榕榟榢槟槣樎橣檫殡氨沱泞洝浣浤浨浶涋涴淙淧渖渲溶滓滨漃澝濵瀉瀋炨烢烷焥煊熍熔狞狩猔琬琮瑄瑢瑸畹皖眝睆睕睻瞎砣硡碂碗碦碹磍秺稼穃竚竤竩筞筦箢箮粽紵紽綄綋綜綩縇縖縡縮纻综缤缩翝翧胺脘腕腙腟膑臗舵苎苧茡荌荢莞菀菪萓萗萱蓉蓿蔲蔻藛蛇蜜蜿蝖螛袉褣褰覾詑詝詫誴誼諠謇讅诧谉谊豁豌貯賨賩賽贮赛趤跎踠踪蹇蹜軉輐轄辖迱酡酧鉈銨鋎鋐鋺錝鍹鎋鎔鎵鏥鑔鑧铊铵镓镔镕镲陀院靌鞌鞍頞額额駝騌騫驼骞髂髋髌髖鬃鬓鮀鮟鯇鯮鰘鰚鰫鲩鴕鴧鴳鵍鵷鶱鶷鸵黦鼧㑏㔤㗌㛽㜚㝧㝬㟉㟯㤖㤞㥶㧲㨲㨳㩁㪡㫨㮤㮫㯴㯽㰂㱧㱰㲅㴦㴼㵓㵳㸰㺍㻘㼠㼸㾃㿾䀂䀄䁇䃔䃰䅁䇡䈶䈹䊉䍆䏁䑱䑸䑹䑿䒇䔂䔭䔰䕓䖳䗏䗕䘔䘢䘼䙋䙾䛷䜮䝋䝹䡐䡝䡥䢓䢘䢿䣾䤇䤩䤹䥉䥱䩊䩩䩳䪑䫅䬁䬒䮟䮨䯃䯔䯘䯛䳦䴁䴐䴱䴷䵫𠃿𠈭𠊿𠋢𠋤𠋪𠌣𠍊𠏶𠐅𠐏𠑙𠒩𠓅𠝬𠝳𠡓𠢆𠩹𠮍𠱔𠱶𠳼𠴈𠵻𠶥𠷃𠹍𠹒𠹼𠺢𠻈𠽰𠾙𠿄𡁃𡁊𡇵𡏉𡏾𡑫𡒆𡖟𡖨𡟲𡡩𡣑𡣕𡤁𡤧𡦂𡦂𡦙𡧌𡧫𡧹𡨸𡩆𡩛𡩶𡪄𡪇𡪏𡪔𡪖𡪙𡪞𡪴𡪸𡪻𡫄𡫅𡫥𡫥𡫦𡫲𡫴𡫹𡬂𡬐𡬐𡬐𡬚𡬚𡬚𡮄𡮞𡶻𡷎𡷗𡸥𡹠𡹭𡺟𡽆𡽿𢁼𢃏𢏋𢏿𢐛𢔻𢕋𢕗𢘯𢚄𢚍𢚗𢚠𢛬𢜿𢞏𢞐𢞩𢟓𢠭𢠲𢣼𢭂𢮘𢯕𢯶𢲟𢳔𢷤𢸎𢸙𢺔𢻜𢼊𢽉𢾏𢾮𣅸𣇆𣇟𣈍𣉬𣋀𣎑𣎙𣑑𣒐𣒲𣘏𣛡𣞐𣟂𣣟𣣶𣤄𣦅𣦍𣨩𣩐𣩵𣪮𣪯𣫼𣫾𣮤𣯔𣲼𣶺𣸘𣸴𣺊𣽧𣽹𣾈𣿾𤀋𤁂𤂼𤆼𤉍𤌊𤍘𤒝𤕀𤕞𤕠𤗍𤘓𤚗𤚧𤛝𤝛𤝨𤞌𤞵𤟊𤟿𤠊𤡺𤢆𤦌𤨎𤨥𤨦𤪜𤪥𤪺𤫖𤫞𤱤𤲑𤴍𤵾𤷧𤸧𤹜𤾱𥀝𥁗𥃓𥄻𥅥𥉛𥊐𥊘𥋩𥋰𥋱𥌀𥍄𥎆𥏕𥒪𥒬𥒳𥔉𥕯𥖽𥙇𥚢𥞒𥞬𥟶𥡔𥩽𥪗𥬌𥭌𥭲𥰶𥳥𥶘𥹈𥹍𥹳𥺥𥻞𥻮𥼍𥼿𥽕𥽴𥽴𥿾𦁖𦂂𦂦𦄎𦅜𦆭𦆯𦆼𦈀𦈅𦈆𦋠𦒨𦕵𦕹𦖑𦗋𦗞𦗰𦚐𦛅𦝣𦞤𦞳𦟈𦟱𦤬𦥉𦧑𦧮𦪌𦪻𦯕𦰤𦵡𦵯𦶳𦺝𦿜𧀯𧁐𧅤𧈚𧉞𧍱𧎡𧏖𧐴𧑗𧑶𧓫𧓺𧙶𧚁𧜅𧞍𧠽𧡢𧢘𧧕𧪹𧬙𧭂𧭠𧯆𧯉𧯳𧱍𧵒𧵤𧵨𧵿𧶉𧶡𧸹𧸿𧹆𧹆𧹟𨀉𨀸𨂥𨄾𨆾𨈷𨉝𨉷𨊊𨌆𨌚𨌵𨍇𨖋𨘲𨛯𨛱𨜳𨝃𨟨𨠻𨠼𨢲𨣘𨣡𨤛𨦭𨧩𨫃𨬬𨰦𨰧𨰰𨲇𨲟𨳷𨴣𨴥𨵄𨾶𩀈𩈭𩈰𩈱𩉐𩉺𩊦𩋡𩋢𩋽𩍏𩎺𩏆𩏓𩐼𩒂𩓘𩓧𩔜𩔧𩕋𩘎𩘒𩘨𩘪𩘰𩝑𩝪𩟔𩡔𩢵𩣑𩣵𩤒𩤡𩤩𩥌𩥿𩧷𩪃𩭽𩮝𩮠𩯅𩲮𩳚𩴳𩶂𩶱𩸨𩸩𩸪𩹃𩹔𩼶𩽽𪀥𪁔𪂁𪂦𪂭𪂸𪃗𪃜𪃭𪃾𪄋𪄑𪄓𪄺𪅢𪆠𪆢𪇧𪉼𪋅𪌡𪎏𪕎𪗩𪗴𪘫𪘲𪘺𪙏𪜸𪝣𪞥𪠮𪡣𪢢𪣯𪥰𪧔𪧚𪧚𪧟𪧠𪧡𪧦𪧩𪧰𪩐𪩻𪫒𪫲𪫻𪬃𪬅𪬚𪬛𪬺𪰧𪰿𪳃𪴎𪴥𪷅𪷆𪷛𪹀𪹞𪹾𪺖𪺗𪻝𪻽𪼮𪾣𪾩𪾸𪿀𪿭𪿮𪿷𫀏𫀵𫀶𫁢𫃀𫃣𫃻𫅭𫇊𫈛𫋀𫋍𫋕𫍇𫍒𫍡𫎄𫎓𫎼𫏫𫐂𫐱𫐸𫑈𫒙𫒛𫒭𫒮𫒴𫓽𫔊𫕍𫗒𫗹𫘄𫙻𫚦𫚬𫛢𫛩𫜒𫜧𫜯𫝱𫟤𫡉𫢝𫢦𫢹𫣃𫣡𫣷𫤙𫦄𫦵𫧲𫫠𫭊𫮁𫮺𫯈𫰦𫰴𫱜𫳓𫳘𫳘𫳡𫳢𫳲𫳵𫳶𫴇𫴋𫴓𫴙𫴝𫵻𫶀𫶎𫶓𫷉𫹿𫺿𫻀𫽴𫾆𫾌𫿨𫿰𬁁𬁎𬁖𬁗𬃏𬃫𬄰𬆄𬆊𬆘𬇄𬇤𬈡𬈿𬉄𬋋𬍜𬎒𬎞𬏉𬏪𬐞𬑱𬒑𬓅𬓇𬕀𬗒𬗦𬘫𬘻𬙯𬛜𬜭𬝄𬝯𬞊𬟗𬟛𬠣𬠺𬢨𬣁𬣞𬤎𬥤𬦓𬧂𬧼𬩲𬬄𬬾𬭈𬭎𬭪𬯠𬰓𬱑𬲱𬲲𬳇𬳞𬴚𬴪𬶍𬶝𬷋𬷌𬷚𬷬𬸣𬹉𬹨𬹷𬺌",
 "女": "伮侒侞侫俀倭倿偻努匽呶咹哸唩唼喴喽嘙嘤嚶姦姦姧姧姲娞婑媙孆孥孬孾宴屡屦峖崣崴嵝巊帑帤帹廮弩怒怓恏恕拏按挐挼捼接揻搂撄攍攖数晏桇案桉桵椄楲楼樱櫻氨洝洳浽涹淁溇漤瀛瀴璎瓔瓾痿瘘瘿癭矮砮笯筎籝絮綏緌縅纓绥缕缨翣胬胺脮腇茹荌荽菇菨萎葁葌葳蒌蔢蔻薅蘡蜲蝛蝼蠳袽褛覣詉諉诿踒踥躷逶銣銨鋖錗铵铷镂隇霎鞌鞍鞖頞餒餧駑驽骽髅魏鮟鮾鯘鯜鰄鴑鴳鴽鵎鸚鹦㐐㑬㖲㖳㗠㙎㜲㝧㞂㟎㢺㢻㣦㣨㥨㥪㫨㮃㱣㴌㹻㼏㾒㾳䀂䁖䃷䅁䅑䅗䆧䈉䉋䋈䑉䑍䒲䒵䓻䓼䓾䕅䕦䘫䙬䢿䧌䨉䫋䬐䯃䰀䳛䴧𠊜𠋘𠝔𠡓𠪓𠲡𠲤𠴑𠴕𠵈𠵎𠶚𠷩𠼖𠿃𡁊𡁛𡄲𡋖𡌎𡌰𡖨𡖲𡘏𡘛𡘛𡝉𡝉𡞘𡞱𡞾𡟌𡟗𡟜𡟿𡡍𡢹𡣉𡣋𡣢𡤊𡤍𡤓𡤔𡤟𡤳𡩛𡪙𡪸𡯵𡲾𡹜𡼃𡽫𡾸𡿆𢖕𢖖𢖠𢘾𢚶𢛊𢜡𢝶𢫓𢬨𢭼𢯐𢱐𣀭𣇠𣐨𣔧𣕁𣕞𣟅𣤵𣨙𣭄𣭠𣮄𣮍𣯌𣯢𣸦𣸵𤈟𤉦𤔀𤕀𤕇𤕇𤕇𤗈𤚖𤛜𤜉𤟲𤠋𤣎𤥑𤦾𤧋𤯥𤯯𥁨𥅄𥅥𥆃𥇒𥌽𥏡𥏶𥐑𥑌𥓔𥔃𥔖𥔣𥙦𥜫𥞚𥞬𥟣𥟿𥠨𥡉𥡭𥪍𥪵𥭝𥯉𥴘𥴟𥶜𥷓𥹡𥼿𥽎𦁉𦁿𦍯𦎛𦓲𦓽𦛅𦞏𦦿𦩬𦭰𦯷𦰯𦰰𦲁𦳀𦵙𦵢𦷄𦸱𦺒𦼙𦽚𦽮𦾇𦿿𧀒𧉭𧊟𧊷𧌃𧍏𧒛𧘽𧚪𧜱𧞥𧧄𧧏𧩕𧮆𧱙𧳛𧵨𨀾𨁡𨁭𨃇𨃢𨊊𨍥𨍦𨐞𨚴𨜠𨜰𨟙𨡌𨣻𨥬𨦔𨦩𨨓𨨧𨩆𨩍𨩐𨪍𨯤𨰃𨴣𨵋𨾯𨾵𨾶𩔵𩖍𩗔𩗯𩛂𩠯𩠶𩡊𩣉𩣑𩣧𩤦𩨇𩭏𩶯𩷑𩹖𩽢𪀮𪀺𪂯𪄓𪈤𪏷𪑗𪕤𪗭𪗵𪜿𪝹𪝼𪡑𪢈𪣚𪣻𪥯𪥸𪥻𪥾𪦆𪦉𪦌𪦍𪦐𪦟𪦭𪦲𪧀𪧘𪧩𪧲𪩇𪩎𪫲𪫴𪫾𪰤𪳃𪳪𪴽𪶋𪸯𪺫𪺹𪼿𫁐𫃀𫃤𫃩𫃵𫅴𫅸𫇵𫉛𫋱𫌂𫌥𫌥𫌽𫍭𫍴𫎂𫎌𫎼𫏻𫐷𫔉𫗒𫗪𫙂𫙜𫚻𫛩𫛪𫝭瀛𫣃𫦉𫧞𫪰𫪱𫰸𫱅𫱏𫱒𫱖𫱠𫱤𫱧𫱩𫱪𫱬𫱸𫲜𫲨𫳙𫳣𫵻𫶆𫶏𫷗𫷹𫷾𫺈𫺋𫺍𫼰𫾀𬄪𬆎𬆘𬌥𬍣𬏒𬏪𬔞𬕚𬖗𬖠𬛾𬜹𬝈𬝲𬞬𬞰𬞺𬞽𬢨𬢴𬤚𬩈𬪀𬫓𬭗𬰍𬲗𬲞𬷑𬷭𬷳𬸞𬺀",
 "亽": "伶傖冷凔刢創呤喰嗆囹姈岭岺嵢彾怜愴戧拎搶旍昤朎柃槍泠湌滄炩熗牄狑獊玲瑲瓴瘡皊矝砱秢竛笭篒篬紷翎舲艙苓蒼蛉螥衑袊詅謒賶跉蹌軨邻鈴鎗铃閝阾零領领飡飧飨飱飸飺餈養餍餥餮饂饏饔饕饗饜駖魿鴒鶬鸰鹷齡齢龄㱓㲆㸳㾉䅮䉵䍅䎆䓹䠲䢢䤌䬤䬥䬩䬭䬸䭁䭆䭌䭕䯍䱽䳥𠏓𠏧𠑐𠑐𠑜𠖝𠞴𠟐𠥐𠫄𡒝𡣊𡴒𣃠𣈮𣯙𤚬𤧂𤸤𤼛𤾙𥎄𥏲𥴝𥷓𥻲𦃹𦞛𦢁𦻂𧃊𧅔𧰾𧽜𨗇𨗜𨜾𨢁𨧌𨩭𨮤𨶆𩀞𩄈𩆖𩓒𩙳𩚇𩚏𩚓𩚜𩚴𩚷𩚻𩛁𩛄𩛈𩛒𩛕𩛗𩛚𩛛𩛜𩛢𩛰𩛳𩛻𩜔𩜕𩜢𩜥𩜨𩜬𩜸𩜻𩜾𩝓𩝕𩝖𩝩𩝫𩝵𩝶𩞕𩞹𩟚𩟨𩟷𩟸𩡁𩮍𩮩𩻆𩼺𪋭𪐸𪕌𪗲𪙎𪚙𪞓𪟹𪡎𪤇𪦔𪦿𪰻𪲕𪲥𪷶𪽏𪾧𫀞𫅜𫅤𫐉𫑅𫔨𫗍𫗒𫗚𫗝𫣃𫤚𫥻𫩧𫷸𬔎𬖜𬗪𬙽𬚤𬡌𬡧𬤲𬨷𬪢𬲏𬲕𬲖𬲟𬲢𬹴",
 "龴": "伶俑冷刢勇勈呤囹姈岭岺彾怜恿悀拎捅旍昤朎柃桶泠涌炩狑玲瓴痛皊矝砱硧秢竛笭筩紷翎舲苓蛉蛹衑袊詅誦诵跉踊軨通邻鈴銿铃閝阾零領领駖魿鯒鲬鴒鸰鹷齡齢龄㛚㦷㪌㮭㱓㲆㷁㸳㼧㾉䍅䎆䓿䠲䥁䯍䳥𠋀𠌀𠖝𠫄𠳀𡇮𡣊𡴒𢓶𢧙𢰭𣃠𣗧𣘋𣣻𣭲𣵳𣹢𤌐𤧂𤰏𤰏𤸝𥦁𦛸𧆿𧗴𧚔𧜄𧰾𧻹𨗇𨗜𨧌𨪞𨴭𨺳𩄈𩆖𩊾𩒼𩓒𩙳𩝰𩡁𩻆𪋭𪌻𪐸𪔜𪕌𪗲𪚙𪟹𪡎𪲕𪲥𪴷𪷶𪽏𪾧𫅜𫅤𫈏𫐉𫑅𫣃𫤚𫥻𫩧𫬽𫯴𫺩𬋶𬋹𬖜𬗝𬗪𬙽𬡌𬤲𬩐𬯙𬱥𬹴",
 "𠃌": "伺呞娍孠宬峸抝晟晠柌泀珹盛祠窚笥筬絾膥臹荿覗詞誠词诚郕鉰鋮铖飼鯎㘭㚸㟃㡬㼩䏤䒛䛐䣳䫆𠉛𠎶𠕠𠭈𠯻𠻁𠻸𡓖𡩍𡭒𡵿𡷫𢃊𢇉𢑻𢕳𢘜𢧓𢧚𢩚𢲚𣎉𣚺𣜽𣫽𣫿𣬀𣱇𤁑𤏉𤔺𤳡𤻯𤽷𥄠𥄶𥆏𥓉𥠫𥢲𥥆𥿆𦉚𦉠𦊛𦎛𦑆𦒽𦔣𦗱𦛙𦭡𧀚𧉠𧙈𨠽𨹚𩉷𩫨𪁋𪗪𪞞𪨯𪸤𫨪𫰶𫵆𫸙𫻽𫿛𫿺𬅄𬇚𬇠𬏠𬐩𬓻𬔟𬛻𬢊𬦌𬨚𬨳𬩬𬲐𬴡𬴴𬹿",
 "𠮛": "伺偪儇冨副匐呞噮圜嬛孠富寰幅彋愊懁揊擐柌楅檈泀湢澴煏獧環疈疈癏祠福稫笥糫繯缳翾腷葍蝠蠉褔覗詞諨譞词踾輻轘辐逼還鉰鍢鐶镮闤阛飼鬟鰏鱞鲾鶝鹮㚸㟃㽬㽬䁵䈏䋹䌿䏤䕎䚪䛐䣳䮠䴉䴋䵗𠠦𠥏𠭈𠸢𠻁𠻸𡑡𡕅𡭒𢃊𢑍𢑎𢕳𢕼𢘜𢩚𢩠𢲚𢹞𢾇𣟴𣡬𣱇𤃆𤃺𤏉𤓜𤔜𤔺𤗚𥄶𥔁𥠫𥣇𥻅𥿆𦉚𦉠𦊛𦌺𦎛𦑞𦑭𦒠𦒽𦔆𦣴𦩡𦭡𦽌𦽪𧀚𧉠𧙈𧹭𧾎𨆈𨵩𨸆𨺤𩋨𩍡𩕪𩘆𩙽𩦮𩧿𩭺𪍺𪕲𪗪𫂨𫍽𫕆𫜅𫢄𫤊𫤊𫤻𫨪𫬸𫯫𫱆𫴅𫴦𫴫𫵆𫸁𫸙𫿛𬐩𬒥𬢊𬨚𬩬𬪗𬳃𬴴𬶵𬹿",
 "不": "伾俖呸噽嚭娝岯怌抷柸桮狉痞秠胚脴苤蚽豾踎邳鉟銔駓髬魾㕻㗏㚰㤳㧵㮎㳪㺽䋔䓏䪹䫊䫠䮆䲹𠃂𠥀𠥧𠳝𠵠𢊡𢓖𢝙𢱉𣆏𣇊𣌹𣓺𣔟𣖍𣡝𣬾𣳎𣷧𤇨𤉮𤘹𤞜𤟷𤠅𤵛𥅊𥑜𥔦𥘻𥞶𥹂𥺖𦈶𦊾𦋑𦐸𦜟𦞑𧯻𧳏𧻳𨂿𨅂𨛔𨠙𨡥𨧆𨲐𨴈𨸹𨸿𨹭𩈓𩎜𩓭𩔌𩚼𩛷𩣚𩭍𩶨𪀇𪈍𪢩𪪓𪴻𪴽𪺰𫄞𫋋𫌶𫎗𫣀𫫗𫫘𫫘𫽗𬆆𬐩𬒷𬕃𬜸𬭃𬱰𬳵",
 "丁": "佇停儜咑咛嚀婷嬣嵉嵿懧拧揨擰柠楟檸泞渟濘狞獰眝矃碠竚紵苧葶薴蝏行詝諪貯鑏鬡鵆鸋㣷㤖㲰㴿㷚㿾䁎䇡䍆䗿䘢䭢𠅶𠅹𠆙𠏦𠯼𠷢𠷥𠺉𠼫𠽒𡅄𡪄𡪇𡫸𡬗𡺣𢁼𢝜𢱏𢼘𢾊𢾛𣂳𣂴𣐘𣪢𣫲𣶹𤁰𤆼𤕞𤗞𤤾𤦷𤧟𤨀𤱤𤲑𤴍𤸥𤻝𥃓𥐡𥞟𥠣𥢿𥣗𥪜𥯢𥸰𥹍𦂂𦂃𦅜𦈀𦈥𦉛𦝞𦡲𧁠𧈚𧉞𧭈𧰗𧵒𧶺𧷭𧺗𧻟𨀉𨉬𨊓𨊫𨏎𨭶𨮣𨲸𨴆𨺱𨽇𩁔𩐴𩕳𩤙𩨆𩶂𩶷𩹇𪑬𪜦𪞨𪣹𪥰𪩧𪬓𪭫𪺓𫋭𫋮𫋯𫋰𫋱𫍾𫎄𫐤𫛢𫜧𫝿𫟘𫟙城衠𫦵𫩿𫳘𫴝𫴞𫹿𬇪𬈿𬍐𬍜𬏈𬑯𬑱𬗀𬗃𬞊𬠽𬠾𬠿𬡀𬡁𬣀𬬾𬱎𬱑𬲲𬵋𬷋𬷌",
 "氏": "低厎呧奃婚岻崏底弤彽怟惛抵捪柢桰棔殙泜涽焝琘疷痻眡睧砥碈祗秪緍胝茋蚳袛觝詆諙诋貾趆軧邸銽錉閽阍阺骶鴟鸱㖧㪆㫝㲳䄑䍕䎽䑛䓋䛡䟡䢑䩚䫒䬫䯺𠈲𠉣𠜜𠳂𡛜𡜶𡝪𡨩𡼐𢤌𢬸𢺾𢽹𣇲𣉈𣋯𣣏𣱋𣱎𣱐𣱑𣱒𣴠𣶌𣿛𤘏𥟴𦅴𦐠𦕾𦖞𦘉𦟕𦯚𧍎𧓢𧚓𧷑𨌲𨓈𨠏𨶖𨾦𩑾𩒲𩶅𪀍𪁝𪂆𪂛𪆨𪉎𪑕𪘢𫅕𫘖𫷏𫻇𬀠𬁀𬁌𬄉𬇉𬇎𬇎𬛆𬦐𬫌𬱤𬲮",
 "工": "佐侙俓倥傞剄勁咗唝啌嗊嗟娙嫅崆嵯嵳巭巰幊弑弒弳徑恐恜悾愩慐戆拭挳控搓摃昮昻暛曌柡栻桏桱椌槎槓殌氫涇涳渱溠澒烒烴焢熕燬瑳痙瘥瞾硜硿碽磋窍笻筇箜篢經縒聓脛腔艖茳茿荭莖葒蒆蒫蛩蛵袏褨觨試誙试谾贑贛跫踁蹉躻軾輕轼逕醝鉽銎銾鋞鎈陘鞏鞚頸髊鴻鵛鵼鸿鹺齹㚽㝾㞉㠫㤍㧬㧭㲁㳩㴂㴏㶹㷢㸜㹵㼦㽨㾤㿷䀴䁟䁰䂬䅃䅝䆪䊄䐤䑘䑭䔈䛒䞓䟀䡗䡨䣆䦈䪫䰈䱹䲾䴾𠌖𠓯𠔣𠗊𠗸𠞖𠡃𠢈𠲞𠲧𠲮𠳃𠷎𠷎𠸣𠹣𠼡𠼡𠾉𠾉𠾿𡃮𡃮𡎴𡑹𡑹𡕋𡕋𡖠𡛿𡟫𡬶𡲀𡷍𡷨𡹝𡺭𡻃𡼔𢀠𢀡𢀡𢂑𢅂𢅂𢅱𢅱𢈵𢎎𢏠𢙼𢞃𢞑𢞑𢠷𢢧𢢧𢣖𢣖𢥮𢩛𢫚𢬀𢬥𢴦𢶈𢶈𢽦𢿟𢿟𣀖𣃐𣇁𣈞𣍏𣑴𣖘𣚑𣚑𣡃𣡃𣡃𣡃𣩈𣪾𣪾𣫒𣫝𣫟𣫟𣳇𣸂𣹟𣽝𣾭𣾭𤀢𤇤𤋨𤎧𤎧𤐾𤕙𤗇𤗤𤛴𤛴𤞔𤟄𤣣𤩈𤩈𤭊𤭓𤭬𤲮𤲮𤳢𤺜𤺜𤻏𤾊𤾊𤾦𤾦𥁦𥅞𥆀𥈿𥑙𥑰𥙀𥛇𥛇𥛌𥜣𥜣𥞱𥥙𥥻𥧡𥨐𥨨𥩌𥩌𥩌𥬢𥬣𥬤𥬮𥹨𥿣𥿮𦈵𦑑𦑺𦒁𦒛𦒛𦒯𦒯𦓃𦓃𦕷𦦺𦦺𦨰𦩼𦭎𦭭𦺚𦺚𦺣𧅢𧊌𧊖𧊡𧋔𧖉𧖉𧖉𧖉𧙢𧜙𧝑𧝑𧝑𧝑𧝣𧝣𧝣𧝣𧦪𧨧𧪘𧪰𧭯𧯬𧱞𧲭𧵻𧶣𧷱𧸶𧹃𧹃𨀯𨀹𨅡𨅡𨉶𨋝𨏄𨠸𨡽𨢚𨣊𨣊𨣣𨥿𨨀𨫋𨬰𨲠𨶛𨼰𨼰𨽋𨾢𨾬𨾭𨿋𨿭𩈎𩈡𩌌𩐵𩑅𩒴𩗎𩗢𩘿𩘿𩟣𩟤𩣼𩤫𩤫𩦑𩦑𩧝𩧝𩧝𩧝𩩜𩪄𩪄𩪏𩫢𩭙𩭴𩰹𩳍𩷏𩷷𩹸𩼏𩼏𩼐𩼲𩿸𪀃𪀛𪀤𪀦𪀸𪃜𪄌𪆕𪉅𪉵𪊈𪊵𪍂𪎀𪏅𪒧𪔣𪕣𪙉𪙸𪙼𪚍𪝖𪤳𪥔𪥺𪪯𪫦𪭥𪰄𪰜𪱮𪱺𪳈𪵹𪷎𪹆𪹻𪻙𫁎𫁔𫋐𫎍𫎬𫎶𫕩𫝪𫟸築𫢟𫦦𫩟𫭫𫮺𫰬𫶯𫶰𫶱𫶴𫸕𫹜𫺌𫺳𫼱𫽙𬀒𬁅𬃛𬄅𬄝𬇧𬊎𬌬𬏢𬒧𬔔𬕂𬕡𬗯𬗻𬘷𬜖𬠈𬧄𬧹𬨆𬩭𬯄𬯷𬰗𬶣𬷉𬸉𬺎",
 "夫": "佚僕儧儧劮呹噗妷嫢帙幞怢怣抶摫撲昳柣椝槻槼樸泆獛璞瓞眣瞡瞨祑秩穙窥窺紩翐胅苵荴蛈袟袠襆詄賛賛贌趃跌蹼軼輦輦轐轶辇辇迭醭鉄鏷铁镤镻闚鬶鬹鴩㲫㲳㹒䑑䗱䧤䪁䭿䰡䱃䲅䳀䴆𠀶𠅎𠅐𠏝𠏝𠝰𠧿𡏆𡘓𡘮𡘿𡙭𡡐𡦑𡱛𢏪𢔖𢖃𢶄𣉺𣊪𣗻𣧞𣪻𣺐𣾴𤂛𤂡𤎺𤎺𤔅𤗵𤙈𤤥𤫴𤸜𤾣𥆭𥐁𥑇𥓹𥥌𥼜𦄾𦐝𧙍𧜴𧰅𧴌𨁜𨦶𨳺𨷥𨷥𨷥𨾤𩑀𩧭𩬭𩯏𩲫𪄯𪋡𪒢𪖈𪗫𪠖𪳭𪳭𪶟𫆾𫌡𫌡𫏼𫏼𫐗𫐧𫚜𫦖𫧚𫨱𫨱𫰹𫱟𫺪𫼆𫽈𬀵𬃀𬊹𬙃𬙃𬝥𬝥𬢃𬢃𬮭𬰒",
 "上": "佧兏叔咔峠戚拤挊敊桛胩茮裃鉲鞐鮛㑐䦊𠈒𠖺𠩏𠱙𡛨𡜔𡧯𡫁𡬧𡮧𡶛𢙤𢻃𣐹𣢰𣳓𤋈𤙐𦭌𧠪𧧌𨀚𩐡𩒛𪀖𪀺𪁯𫇳𫛧𫜎𫧱𫧲𫧳𫧵𫧶𫵂𬫐𬰬",
 "卜": "佧咎咔啩夞拤掛昝烞罫胩褂迯鉲㔰䀤䇚䖙䭆𠖺𠡙𠧭𠨃𠨊𠰻𡍐𡎢𡎥𡎦𡖦𡛨𡶛𢛶𢪗𢫑𣳓𤋈𤙐𤤫𥦛𥾾𦁊𦬙𦭌𧦨𧵏𧻏𨕍𨳢𨳿𨵗𩊃𩳴𪁯𪤸𪸟𫊰𫒓𫙌𫥖𫧱𫧲𫧳𫧵𫧶𫮋𫯏𫯕𬇑𬇿𬉝𬔷𬛦𬛩𬠎𬩟𬮡𬮯",
 "巳": "佨僎僎凞刨匏咆噀噀夔孢巎庖怉抱撰撰枹櫏泡港潠潠炮炰焈熙爮狍獿玸瓟疱皰砲窇笣簨簨繏繏胞苞蘷蚫蟤蟤袌袍襈襈譔譔跑躚軳選選鉋鐉鐉铇闀雹靤鞄韆颮飑飽饌饌骲髱鮑鲍麅麭齙龅㔵㔵㚿㡪㦏㦏㯡㯢㯢㷷㷷㹛䉦䍖䎂䒻䛌䠣䠣䮀䳈䶌𠌑𠑍𠣶𠣺𠣻𠤁𠤃𡖂𡢀𡢀𡮭𡮭𡮸𡮸𡯡𡶄𢁀𢅼𢕵𢚓𢞍𢥝𢵬𢵬𢺕𢼌𣕅𣖏𣚇𣜠𣭀𤧈𤩄𤩄𤫕𥂅𥄹𥈄𥈩𥒟𥓤𦈝𦈝𦊠𦋭𦋭𦌔𦌔𦌻𦌻𦍂𦍂𦍅𦍅𦠆𦠆𦠖𦢭𦧸𦧸𦰮𦰾𦺈𦺈𧙌𧡥𧵢𧽇𧽈𧾌𧾌𨃈𨈉𨚔𨠖𨧒𩇌𩈷𩋲𩎘𩐜𩤄𩦖𩦖𩪞𩪞𩰓𩻝𩻝𪀀𪊡𪏶𪐼𪓠𪝴𪟼𪟼𪡝𪫴𪬂𪭹𪮇𪲢𪵀𪺈𪽕𪿤𫀆𫀟𫃠𫈲𫎍𫎼𫒹𫙫𫯯𫹾𫾔𫿉𬎚𬏌𬙑𬤥𬤥𬤺𬦘",
 "夂": "佫佭俊俻倰僾優凌厦咎咯唆唛嗄嗠噯嚘夔婈嬡客峈峉峯峰峻崚嵏嵕巎庱廈復恪悛惾愎懓懮戆戇拠挌捀捘掕擾敋昝晙曖朘朡格桻梭棱椱椶榎樤櫌洛洜浚浲涤淩溭滌瀀灨烙烽焌燰狢狻猣獶獿珞琒璦瓇略畧畯痠皧皴睃睖瞹硌碐祾禝稄稜稪稯稷窱竣笿筿篠糉絡綘綾緮緵縧纋络绦绫翪耰胳腹臵艂艐茖荾莑菱葼蓌蓚蓧薆蘷處虪蛒蜂蝬蝮螩衉袶袼裬複觡詻誜謖谡貉賂賐赂跭路踆踜輅輘輹辂逄逡逢邍鄾酪酸鉻鋑鋒錂鍐鍑鎀鎥鑀铬锋閣阁降陖陵雒雾靉韸頟餎餕馂馥駱駿騣骆骏骼髼鬉鬷鮥鮻鯪鯼鰒鰷鱫鲦鲮鳆鴼鵅鵔鵕麸麹麺黢㓢㔶㕙㖓㖫㗉㙏㛔㛖㣭㤩㥄㨑㪾㬼㮨㱊㱥㶻㸼㹄㹋㹛㻐䀍䀩䀱䁓䂫䅂䇨䈊䈦䍟䎊䎫䏺䗀䘒䜡䜶䝜䞦䞭䤗䥳䧄䧏䧗䨹䪖䬋䮚䮡䴶䶅𠄇𠉏𠊷𠋩𠌘𠎹𠏤𠑍𠗂𠝘𠝪𠡭𠥑𠦻𠧨𠬍𠮀𠲓𠶱𠸉𠺧𡀚𡅖𡅡𡇷𡍉𡍶𡏘𡏜𡑺𡔀𡕮𡕵𡕶𡖂𡖃𡖃𡖃𡙣𡜠𡞕𡞪𡟞𡟹𡟺𡠊𡤥𡨛𡩢𡪇𡲛𡲲𡶶𡹃𡺷𡾆𢅼𢈡𢈦𢌢𢓜𢓱𢔁𢖒𢘸𢟅𢢨𢥀𢥙𢥙𢥝𢦅𢨟𢭎𢱩𢺕𢼛𢾷𣇔𣎞𣒥𣘀𣛗𣜬𣝘𣟀𣢷𣧳𣫡𣸪𣺛𣺫𤎆𤑊𤖀𤙑𤛾𤟱𤠎𤦫𤦶𤧱𤧶𤪱𤫕𤲪𤳺𤴂𤶞𤸑𤹉𤻅𤽥𤿲𥃑𥈌𥉉𥍮𥓶𥔹𥖦𥜚𥟀𥣁𥣯𥦸𥧜𥪚𥪣𥭗𥱤𥳂𥴨𥸡𥹾𥻴𥽟𦃅𦃆𦃩𦊲𦍶𦐦𦓱𦔎𦛃𦜁𦝄𦟨𦡝𦡟𦤜𦥍𦩟𦪪𦴦𦷜𦺰𦼆𧀥𧃄𧄦𧆐𧈄𧊃𧊵𧋴𧏡𧏧𧐋𧒒𧓁𧗜𧚋𧞇𧧽𧨼𧵷𧼔𧼱𧾤𨀱𨃜𨅫𨇄𨈉𨉞𨋪𨌐𨌘𨎣𨎳𨘡𨙤𨡃𨣥𨣪𨦎𨦟𨩟𨫺𨬜𨱋𨱴𨹧𨹿𨺮𨼇𩂣𩄦𩅗𩊚𩊩𩊻𩋟𩌜𩎬𩐨𩓀𩟒𩡇𩡘𩡣𩰽𩷄𩷭𩽇𩾎𪃃𪃊𪄂𪅥𪇈𪊲𪊴𪌛𪌣𪌾𪍫𪎈𪎉𪎊𪎋𪎌𪎏𪎐𪐒𪐿𪒱𪔔𪔞𪔢𪕘𪕞𪘊𪘑𪘵𪝉𪢃𪤶𪤽𪩮𪮅𪰠𪰺𪷥𪺈𪽂𫁯𫄭𫄯𫆢𫆪𫘓𫙯𫜍𫜑𫜒𫜓𫜔𫜕𫟾𫧮𫯊𫿪𬍞𬗲𬠡𬣺𬦹𬹅𬹆𬹇𬹈𬹉𬹊𬹋𬹌𬹍𬹎",
 "㐄": "佭竵袶跭逄降䂫䇨䜶䤗𠎹𠏤𠲓𡑺𡜠𡲛𡶶𢘸𢢨𢥙𢭎𣝘𣫡𣺛𤪍𧕱𨋪𨦟𨼇𩐨𩶮𩷄𪐿𪔔𪰠𫁯𬣺",
 "开": "併侀剏剙型姘屏帡庰恲拼揅栟洴渆瓶皏硎硑絣缾胼艵荆荊荓蛢誁賆跰軿迸郱鉶鉼鐦铏頩餅駢骈骿鮩鵧㔙㣜㤣㭢㻂䈂䊙䑫䓑䗗䤯䦕䴵𠛼𠝊𡌎𡌑𡐱𡜇𡶭𡸫𡾛𢆗𢆛𢆢𢆣𢏳𢵱𢼩𢼶𣁊𣛣𣾺𤏾𤝴𤡲𤭅𥒱𥖆𥞩𥩵𥳐𦐵𦡅𦴏𦼠𧊞𧨘𧳉𧻓𧼦𨈾𨗙𨢏𨢹𨦹𨨵𨲡𨴸𨷑𨹗𩂦𩃋𩈚𩊖𩦓𩫐𩫑𩺄𪋋𪕒𪘀𪚏𪠆𪪃𪫊𫌟𫐌𫔦𫔷𫙸𫛨𤲒𫣽𫫭𫯿𫷘𬂻𬏄𬑖𬣲𬪮𬮫𬮶𬵭",
 "厃": "佹卼姽尯峗峞恑桅洈硊祪脆臲蛫觤詭诡跪陒頠鮠㧪㩻㫉㺅䣀䤥𠝰𠨜𠨪𠱓𡎇𡧭𡳀𢂕𢈌𢼨𢼮𣆡𣢪𣧼𤙙𤥕𤱯𤿡𥍨𥎾𥥠𦓛𦟒𦤞𦨹𧵥𧷪𧻜𨠥𨩀𨴓𨾼𩊛𩗜𪀗𪂷𪖡𪖤𫏸𫥊𫶺𬥣𬱟𬶏",
 "父": "佼効咬嗲姣峧恔挍效晈校洨烄狡珓皎窔筊絞绞胶茭虠蛟詨賋跤較较郊鉸铰頝餃駮骹鮫鲛鵁齩㝔㬵㼎㿰䂭䍊䗄䘨䢒𠙇𠜅𠸀𡋟𡥡𢯋𢯴𢳼𤟞𤶀𥅟𥇟𥰹𥹜𦺏𧠭𧠷𧣦𧯺𧻨𨠦𨨞𨹍𩊔𩎦𩐟𩗒𩲻𪁉𪂀𪂥𪏁𪦕𪮟𪿫𫏒𫘔𫜪𫡽𫢜𫥿𫻱𫿿𬇍𬨫",
 "⺧": "侁俈兟兟冼勂哠姺宪峼悎捁晧梏毨洗浩烍焅珗皓硞祰窖筅筶艁詵誥诜诰跣选造郜酰酷銑鋯铣锆靠頶駪鯌鵠鹄㧥㪇㬶㭠㮱㰫㱡㵆㾌䊁䎋䚚䚛䢾䧊䧼䯻䶜𠀡𠅨𠅬𠈣𠒑𠒒𠒛𠒣𠒷𠓀𠓙𠓙𠓙𠓙𠜎𠜯𠵞𠸛𠸜𠼑𠼑𡀻𡇪𡖬𡜲𡨟𡨷𡬃𡬃𡬃𡷥𢁏𢈇𢍎𢏡𢓠𢔬𢙝𢽍𣂋𣨓𣫀𣭟𣭡𣽋𣽸𤀗𤂩𤄳𤍹𤞓𤞺𤭚𤶳𤿩𥂷𥍱𥏋𥏌𥑻𥞴𥦥𥱠𥶚𥺊𦀈𦀽𦭶𦮽𦹞𧋓𧖟𧖟𧠺𧠼𧱀𧻰𨁒𨅻𨌒𨖄𨪹𨴐𨴬𨼄𨾷𩇜𩇸𩋺𩒙𩛔𩣂𩱕𩱕𩶤𪀷𪞄𪡬𪢡𪽀𫌦𫗓𫤠𫤢𫧂𫩱𫪕𫳩𫻵𫿜𬆧𬇶𬈯𬐊𬚬𬥘𬩙𬩭𬯱𬳽𬶔",
 "广": "侂俯儣兤劆嚝嫝嬚嵻幮彍惦慷懬懭拡捬掂掋擴昿曠桩榳槺櫎櫠櫥漮濂瀇焤燫爌獷矌砿礦穅穬簾粧糠絋纊缠脏腐腑臁菧蓭薕蝷螷蠊蠯裤褲譧賍賘赃踮躕躿鄺鉱鏮鐮鑛镰鱇㖢㛇㝩㨩㭽㯅㱂㴑䂯䅊䆂䆲䇊䉬䊯䕇䕠䕲䗧䛸䣌䧀䭠𠉷𠊴𠌿𠒥𠓌𠝡𠲕𠳹𠶦𠶧𠷄𠺟𠻞𠿳𡀈𡂭𡍓𡍩𡎻𡐓𡒷𡓊𡓔𡓜𡔏𡟾𡢺𡫐𡻚𡽟𡽦𡾭𢃅𢅏𢉶𢊙𢊾𢋝𢋠𢋩𢋴𢌊𢌌𢤭𢭩𢳋𢷱𢺠𣀃𣀊𣂁𣍙𣓄𣖵𣜰𣟚𣡹𣤤𣩇𣷳𣹫𤃢𤑙𤒢𤚃𤠜𤬚𤮊𤮢𤳱𤻑𥀱𥈚𥉽𥋲𥌙𥕎𥕒𥖝𥛩𥴯𥵬𦀐𦀾𦆆𦆲𦓣𦘅𦟏𦢎𦤩𦧷𦪅𦯅𦸣𦺮𧓼𧖇𧞋𧨱𧫥𧸖𨀵𨁤𨁵𨄗𨇁𨌟𨌮𨎍𨎷𨝎𨧖𨫆𨫈𨮛𨹘𨻷𨽏𩆌𩎾𩒯𩤎𩪬𩸅𩼔𩾌𪁈𪁱𪂑𪂰𪇵𪉉𪍿𪏢𪏪𪝊𪠢𪣐𪥀𪦃𪩑𪪠𪪫𪭽𪰽𪱰𪲝𪲮𪶶𪶹𪸱𪹜𪻋𪼥𪽅𫁥𫂈𫂞𫇺𫈋𫉾𫋧𫍑𫎃𫐤𫗻𫙴𫜆𫢶𫪭𫫡𫬏𫮂𫲋𫴶𫷰𫸉𫸊𫸋𫸌𫸍𫸎𫸏𫸐𫾯𬁛𬕌𬝪𬞈𬪚𬫝𬫩𬳙𬴯𬵐𬶶𬸐",
 "乇": "侂侘咤姹挓烢秺詫诧㓃㢉㤞䅊䆛䒲䖳䤩䯔𠱹𡧜𡱩𢭑𣘄𣨰𣴜𤚧𤞌𤵾𥭌𧐢𨀸𨴥𨶃𩢵𩶱𩽽𪀥𪔘𪢁𪯒𫊴𫏫𫵟𬏨𬗍𬙳𬜭𬭈",
 "亏": "侉偔刳匏卾姱嫮崿嶀恗愕挎摴晇桍樗洿湂瓠絝綔绔胯腭舿荂萼袴覨誇諤謣谔跨遌郀鄂鄠銙鍔锷陓顎颚骻鮬鰐鳄鴮鶚鹗齶㓵㗁㟧㡁㮙㰭㻬䠸𠣻𠤁𠻢𡈆𡖮𡜂𡝻𡼰𢓢𢙁𣋌𤫸𤾼𥁡𥅚𥈭𥑹𥔲𥯳𦉏𦫚𦾓𧊘𧍞𧮉𨂍𨖜𨨆𨬆𨯫𨺈𨺨𨾺𩀇𩅞𩊓𩎁𩏬𩣔𩦰𪄮𪝄𪟉𪥚𪦊𪵈𪷪𫋾𫌮𫛦𫪖𬇸𬚗𬳹𬵸",
 "⺌": "侊倘兤咣姯尡徜恍惝挄挡敞晃晄桄档洸淌珖珰皝硄筜絖緔绱耀耥胱茪裆觥趟躺輄輝辉銧鋿铛靗鞝韑駫黋㒯㓥㗬㘢㫾㭻㲂㹰㿠䆪䊑䠀䣊䨔䯑𠈑𠒗𠒝𠒡𠒥𠒦𠒪𠒫𠒬𠒵𠒸𠒼𠒽𠒿𠓁𠓃𠓅𠓇𠓉𠓉𠓉𠓊𠓋𠓌𠓐𠓑𠓒𠓓𠓖𠥳𠵗𠵰𠶤𡖹𡗑𡝣𡞀𡭿𡮢𡮵𡮶𡱘𡷀𡾡𡾡𢉒𢌏𢓥𢡭𢩊𢮐𢻒𢼯𢼴𢿽𣀏𣆤𣆥𣋈𣎃𣐰𣥺𣦎𣦛𣮜𤇻𤈛𤙽𤱳𤶏𤷛𤾗𤿼𥆄𥊢𥊣𥊰𥋤𥍄𥍕𥓡𥙑𥳦𥹥𦈹𦉘𦊫𦕤𦥰𦨻𦫢𦰱𧇲𧇺𧑼𧒩𧗯𧧯𧨲𧩡𧵦𧹍𨉁𨌩𨏆𨐈𨒺𨜂𨝞𨠵𨡔𨣛𨮠𨹂𨻙𨿰𩅌𩊠𩐣𩒚𩗵𩭂𩳁𩶸𩼝𪀯𪁺𪕓𪕗𪞀𪞃𪞆𪟶𪠽𪦍𪽄𫀮𫊶𫏈𫖦𫘡𫙥𫟰𫤚𫤡𫤤𫤥𫤦𫤨𫨋𫪨𫰠𫱪𫵃𫵰𫻹𫽶𬆅𬐉𬓮𬕒𬘢𬙏𬠅𬡾𬣭𬩌𬯬𬴬",
 "歹": "例冽劽咧塟姴屍峛峢挒斃栵毙洌洬烈烮煭珟臰茢葬薞薤薧薨蛚裂趔迾銐颲餮鮤鴷㑉㓘㘸㡂㤠㤡㭮㰷㱝㳨㽝㾐䅀䉔䮋䶛𠆚𠞺𠪶𠶘𡈒𡊻𡏫𡔸𢂥𢍈𢤔𢲀𢲬𣑘𣧿𣨀𣨑𣨰𣩁𣩂𣩇𣩉𣩖𣩭𣩴𣩸𣩺𣩾𣸠𣹖𤈘𤖺𤞊𤥔𤧮𤳓𤽨𥁟𥂫𥅮𥆁𥉬𥒂𥞥𥥱𥧛𥬭𥽃𦀎𦃾𦴊𦵏𦹡𦺐𧂎𧊿𧍐𧍿𧒈𧙩𧙷𧧋𧵲𨀺𨃮𨦙𨱼𨾸𩂶𩊡𩊢𩢾𩧮𩫓𩶽𪗿𪙂𪩤𪬔𪲐𫏎𫚓𫪔𫰞𬀰𬆒𬆓𬆗𬆘𬆜𬋎𬗰𬚮𬠼",
 "寸": "侍傅傉傠僔博咐哷嗕噂圑堼壽壿姇媷峙崶嶟幇幫府庤廚弣待怤恃愽拊持捋搏搙撙時柎榑榭槈樹樽橱歭泭洔浖湗溥溽澊澍煿燇牔犎狩猼畤痔磗祔禣秲竴符等篈糐紨縛縟繜缚缛罇罸耨胕脟膊苻荮莳葑葤蒋蒪蓐虢蚹蛶螀蟵袝褥詂詩謝譐诗谢賻赙跗跱蹰蹲軵遵邿鄏酧酹鉜鋝鎒鎛鐏锊镈附鞤頱餺駙驸髆鮒鱒鲋鲥鳚鳟鷷麝鼭㑏㓔㕑㖚㗘㙛㜂㡡㤔㦺㨍㫭㬍㭙㭩㲕㳡㴬㸹㽟㾈䂤䈙䋽䎔䑧䓁䔿䗚䙏䝰䟹䠵䢘䦙䪙䮑䰊䵾䶈𠃿𠊚𠊛𠐆𠐵𠜖𠢑𠥙𠪆𠱔𠲝𠴘𠾇𠾉𠾢𡎈𡐷𡢙𡧛𡫦𡬰𡭉𡭋𢂆𢅥𢇉𢙪𢚃𢚍𢚳𢟲𢣵𢬭𢱹𢲌𢷋𢾭𢾯𣁷𣄎𣈗𣈜𣊒𣋇𣞊𣠈𣨅𣯋𤂅𤊢𤐭𤕠𤚑𤚽𤝔𤞙𤠭𤤕𤧵𤮐𤶡𤸗𤸵𥀂𥇹𥊭𥋹𥍄𥑧𥖁𥞂𥠵𥢎𥩄𥩳𥩽𥭐𥮻𥱈𥳰𥴾𥹃𥹩𥹽𥿾𦀹𦂌𦉊𦋝𦑵𦔍𦛻𦦐𦪚𦯿𦱰𧇛𧊆𧍋𧎭𧏛𧏯𧒆𧒉𧔋𧗈𧛜𧛼𧠴𧢁𧭣𧱹𧳵𧵤𧵿𧻐𨃽𨅒𨍭𨒕𨒻𨩥𨮾𨱔𨴺𨾪𨿐𩊦𩋮𩋰𩌏𩎠𩘧𩛜𩞟𩫯𩬙𩯄𩱨𩹲𩿧𪀔𪁶𪌳𪍡𪐻𪑋𪑾𪓁𪖭𪗺𪘤𪙍𪜺𪝯𪠑𪦇𪧚𪧡𪧸𪧻𪧽𪩉𪫼𪰛𪶄𪶊𪷏𪹅𪿎𪿚𫂫𫅌𫆸𫊵𫋚𫋜𫎹𫑼𫒙𫓄𫘒𫙆𫜄𫝊𫥐𫥙𫦋𫪀𫪅𫯕𫯣𫰦𫱵𫴬𫴮𫴶𫷺𫸺𫹚𫼁𫼈𫽣𬁏𬂨𬃢𬉪𬋷𬌀𬌒𬌠𬌽𬔪𬕀𬖞𬗔𬗽𬙥𬛘𬛤𬟌𬠙𬢾𬤢𬧀𬧅𬩛𬪃𬭦𬮏𬰤𬰴𬲝𬲸𬳢𬷨𬺏",
 "未": "侏剺咮姝嫠孷嶪嶫擈斄曗株檏殊氂洙漦澲犛珠璳硃礏祩秼絑茱菋蛛袾誅诛趎跦邾鄴釐銖铢陎駯驜鮢鴸鸈鼄㒒㗼㡤㦵㧣㱉㸁㸡㸣㹈㼡䇬䌜䎷䏭䣷䧨𠙎𠭰𠱒𠵈𠽘𡑿𡥛𡱖𢄡𢟤𢢜𢼲𢿂𢿄𢿍𣁛𣁟𣂛𣆦𣗾𣘈𣘬𣙸𣜱𣞊𣠶𣥵𣩫𣯷𤊣𤔏𤝹𤩶𤶎𤾧𥅲𥋙𥣈𥴼𦐣𦐨𦡧𦧙𦳀𦾇𧀸𧑤𧬬𧭵𧵺𧸢𨒲𨗩𨨓𨭥𨾲𩊣𩑃𩔠𩕟𩢻𩳅𩼋𪅗𪋫𪎡𪏿𪒲𪖊𪣎𪨴𪳔𪴄𪴨𪴨𪶚𫁍𫊕𫰃𫷨𫾭𬆤𬎕𬞍𬥦𬹣",
 "皿": "侐勐卹嗑嗢圔媪媼孂寧廅恤愠慍戤掹揾搕搵擝桖楹榅榓榲榼欰殈殟氲氳洫温湓溋溘溫潈瀊灎烅煴熅熆猛瑥瘟瞌磕篕緼縕缊腽膃艋萾葐蒀蒕蓋藴蘯蜢蝹衁衂衃衄衅衆衇衈衉衊衋裇褞諡謐谧豓豔豱賉輼轀辒醖醘醞醠醢錳鎑鎾锰闔阖鞰韞韫饁饂馧鯭鰛鰪鰮鳁㔩㕎㖹㗐㥺㨕㬈㮎㯼㴵㵥㵬㼔䁅䃲䆝䋼䐦䒸䓝䗘䘏䘐䘑䘒䘔䣿䤈䤉䦗䫦䯠䰔𠗅𠗠𠜄𠞚𠥕𠲣𠵼𠸡𠹃𡂑𡋒𡎛𡎠𡏖𡝹𡟚𡡇𡡛𡥠𡦸𡨴𡩂𡪖𡬪𡺡𡺦𡻊𢁏𢄍𢛴𢜷𢝈𢝙𢞂𢞤𢠏𢦃𢩘𢬔𢱔𢹋𢾩𣁫𣉗𣌃𣓶𣖮𣛮𣛷𣡝𣣹𣩄𣬁𣯎𣱦𣺻𣾈𣿍𤀄𤃗𤃾𤅱𤐒𤒸𤔷𤗖𤘓𤛁𤟣𤠅𤠡𤦕𤪥𤬒𤭹𤮃𤶰𤷪𤸱𤻷𤾱𥂇𥂨𥃕𥅧𥈱𥊱𥒌𥔋𥔦𥛐𥠺𥢱𥩹𥫊𥯰𥲥𥵈𥺬𥼵𦁧𦆭𦔏𦔤𦚡𦞑𦡉𦤨𦪯𦪹𦰆𦱃𦶯𦶻𦺝𦻲𦼦𦾞𦾟𧀟𧂺𧄧𧅔𧑄𧑬𧖂𧖧𧖨𧖩𧖪𧖫𧖬𧖭𧖮𧖯𧖰𧖱𧖲𧖳𧖴𧖵𧖶𧖷𧖸𧖹𧖺𧖻𧖼𧖽𧖾𧖿𧗁𧗂𧗃𧗄𧗅𧗆𧗈𧗉𧗊𧗋𧗌𧗍𧗍𧗎𧗏𧗐𧗑𧗒𧗓𧗔𧗕𧗖𧗗𧗘𧗙𧗚𧗛𧗜𧛾𧧓𧩌𧪍𧪞𧪪𧰞𧰟𨍰𨎽𨙛𨜏𨜴𨜵𨞐𨞚𨡵𨢴𨩙𨫿𨭋𨭮𨵷𨸍𩄅𩇠𩌍𩟣𩟤𩥈𩦝𩮨𩯎𩶫𩻴𪂽𪆮𪉸𪍝𪓲𪔮𪖩𪝑𪝕𪝙𪤒𪥞𪨻𪪽𪬌𪷞𪹁𪺰𪾝𪿱𫀉𫀚𫁃𫄖𫄮𫇤𫋋𫋪𫋫𫋬𫎽𫏘𫐔𫔹𫙃𫙍𫙬𫜊㬈殟蝹馧𫣂𫣽𫤶𫧩𫫷𫮠𫽗𫽝𫽡𬃠𬃳𬄱𬄳𬈂𬈋𬉉𬏾𬐟𬐩𬒖𬕫𬗻𬟇𬠼𬢶𬣅𬤒𬤔𬧏𬧷𬨸𬫢𬬛𬲟𬳰",
 "月": "侑倗倗僩哊嗍嘲囿塑奛奟奟奣姷媩嫺嬴宥峟崩崩廟弸弸愬憪戫掤掤搠撊曌朚栯棚棚棴楜槊橌洧淜淜湇湖溯潮烠焩焩焽煳燗猢珛琞瑚痏痭痭癇盟瞯硼硼礀稝稝箙箶糊絠綳綳繝绷绷羸肴臝荫菔萌萠萠葫蒴蕑蛕蝴蠃衚襉覵詴謿譋賄贏贿赢輣輣迶遡郁酭醐銪錋錋鍸鎙鐗铕陏餬驘鬅鬅鬍鬜鮪鰗鲔鵩鵬鵬鶘鶦鷳鸁鹏鹏鹕龓㗅㗴㣧㤢㤫㥊㥊㦽㬼㮳㮶㴨㵎㻚㻚㽰㽰㾰㿢䀁䆜䇔䒴䙀䙀䞥䠒䨖䨜䨜䩴䭌䳑䳟䵋𠈛𠎞𠎫𠒫𠓓𠜳𠜳𠞳𠞳𠟖𠡮𠡮𡎁𡎾𡎾𡒦𡕑𡕑𡞇𡞇𡠔𡡲𡦀𡪙𡳴𡹌𡹔𡹔𡹹𡼜𡼜𡼥𡼼𢀭𢈓𢉁𢉁𢉢𢍥𢒰𢜏𢜠𢡰𢢅𢢤𢯎𢰮𢲂𢴿𢵁𢽩𢽩𣂤𣂤𣇴𣇵𣈂𣈇𣊧𣊧𣊿𣋂𣋐𣍳𣎉𣎏𣎠𣎠𣎡𣎡𣎢𣎥𣒥𣔂𣔚𣛨𣜄𣞅𣟫𣥯𣨥𣨥𣩞𣷠𣺩𤄒𤐟𤑌𤑌𤙼𤡥𤨂𤭱𥂀𥂀𥂹𥉮𥎒𥑿𥢵𥦜𥦜𥦹𥯋𥯷𥲠𥳑𦃗𦆁𦋉𦎿𦎿𦘃𦘃𦛒𦠥𦣄𦣉𦣓𦣓𦣖𦮯𦺓𦻽𧅽𧆴𧌇𧌇𧌘𧍂𧍵𧖽𧛞𧛫𧝹𧟉𧟱𧟵𧠶𧡜𧪜𧫋𧫌𧫢𧭅𧯎𧽹𧽹𧾆𨂃𨂃𨃗𨃵𨅹𨆀𨎫𨎼𨗛𨚺𨚼𨝙𨝙𨞞𨞞𨡷𨣇𨤄𨧹𨫇𨮠𨰓𨲰𨲰𨴜𨵛𨵟𨹹𨹹𩀉𩉎𩋒𩋒𩕕𩕕𩣋𩣶𩦂𩭀𩰑𩲾𩸀𩸀𩸤𩻘𩻹𩼮𪂖𪂙𪂙𪂡𪆌𪆘𪇐𪍒𪐉𪔤𪕮𪕱𪘃𪙆𪙇𪙩𪚞𪚤𪝍𪝝𪟍𪠒𪠙𪠰𪢣𪣦𪤾𪧰𪭂𪭾𪱤𪱮𪱯𪱰𪳊𪴞𪹛𪻪𪼔𪼔𫀹𫂣𫋸𫎋𫏤𫑱𫔈𫗏𫗫𫚸𫛳𫛷𫜲瀛𫡯𫢻𫧄𫪩𫪫𫪯𫮗𫳕𫳕𫷚𫷚𫷮𬁨𬂄𬂑𬂙𬂚𬂚𬂚𬄙𬈀𬊚𬑐𬓃𬓃𬕔𬕔𬖉𬘠𬙶𬙶𬝤𬟀𬡑𬣩𬦒𬦒𬪶𬭖𬭖𬯿𬳼𬶚𬶞",
 "牛": "侔劺哞哰恈桙毪洠浶眸蛑鉾鴾麰㛌㟉㨓䏬䔣䜮𠈭𠲟𠼐𠾆𡋚𡌃𡧷𢚄𢭂𢵜𣇟𣈾𣋀𣒲𣭰𣴓𤉍𤚅𤚅𤚥𤚧𤛙𤜁𤞗𤥢𤪆𥒪𥭏𥭲𦅚𦕵𦭷𦰤𦶡𧊵𧔂𨌚𨦭𨴍𩥴𩧷𩶢𪁃𪁔𪜓𪟷𫑋𫒻𫓴浩𫰴𫳵𬁖𬜝𬣂𬬁",
 "𠔼": "侗哃姛峒峝恫戙挏晍桐洞烔爂爨狪璺痌眮硐秱筒粡絧胴舋茼衕詷迵酮釁銅铜餇駧鮦鲖㓊㖯㖰㢥㣚㸑㸗䆚䞒𠀹𠆠𠆡𠖄𠨩𡎷𡜝𡭸𢂓𢈉𢍯𢏕𢑅𢖂𢿀𣑸𣠪𣡈𣡥𣩺𣬑𤅚𤓕𤖾𤙓𤭁𤭆𥃘𥍩𥗑𦉝𦦟𦦡𦦧𦦻𦧁𦨴𧅾𧇌𧊚𧖥𧖳𧙥𧭒𧱁𧳆𨀜𨇫𨈹𨐗𨔖𨚯𨤯𨭳𨯜𨯺𨰷𨴏𩇷𩊗𩐤𩒗𩧲𩩅𪀭𪌢𪎼𪒵𪔚𪕙𪘍𪠀𪻛𫀈𫄡𫍣𫎴𫑉𫝛爨𫥮𫧒𫯆𬜃𬮂𬲈𬷍",
 "弋": "侙垈岱帒弐弑弒恜拭柋栻烒牮玳笩蚮袋試试貸贷軾轼鉽鮘鴏黛㭖䒫𠁀𠊝𠌗𠍜𠰰𠰺𠲧𠳙𡛲𡥖𢂌𢂑𢎌𢎎𢘋𢫙𣸂𤞔𤱢𥁦𥅞𥩦𥰒𥱢𥹨𥿝𥿮𦙯𦨮𦿂𧂓𧊇𧊖𧙢𧵻𧶣𨠍𨥶𨨐𩂠𩃷𩗎𩶕𪀦𪀸𪉅𪜣𪭩𪰜𪲃𪻙𫆛𫌸𫔟𫟸𫢫𫢼𫣭𫭫𬫇𬶌𬷈",
 "冉": "侢偁洅稱㛵𠕱𠱻𢈖𢜻𣶞𣽹𤀑𤌁𤞕𤡺𤥆𦆷𦛍𦦍𧋁𧑶𧽃𩔋𪫁𫁌𫇶𫕋𫰝𫳬𬃣",
 "贝": "侦侧债偾勋勚厕唝啧喷嘤嘤圆帻惯愤懒戆损掼撄撄攒桢樱樱殒浈测涢渍濑獭璎璎瓒瘿瘿癞碛祯筼箦籁绩缨缨缵腻臜荝豮赜赪趱踬躜郧酂铡锧镄陨鲗鹦鹦㛣𣸣𤈶𤶧𥎝𧏗𧝝𨱌𪔭𪟝𪡺𪢐𪢕𪧀𪧀𪩎𪩎𪩸𪬯𪮶𪰶𪱥𪴙𪵇𪷱𪷽𪻲𪽴𫅗𫇘𫋌𫌀𫎬𫔁𫔉𫔉𫕥𫖲𫖴𫛫𫝪𫝭𫝭𫞚𫟬𫢟𫢲𫪪𫬐𫬙𫭮𫲗𫷾𫷾𫺌𫼤𫼱𫽧𬁽𬃊𬃘𬃮𬅫𬈕𬊎𬋍𬏷𬒍𬓱𬕂𬖃𬜾𬝠𬠈𬠠𬡷𬤆𬤚𬤚𬤮𬦻𬳟𬹕𬺉",
 "亡": "侫嬴恾硭羸臝茫莣蠃贏赢鋩铓驘鸁㟐䅒䇔䈍䗈䥰𠨛𠴏𡙧𡞙𡳴𡷢𢚚𣜄𤞽𤥑𤶼𤷐𥇀𥇋𥡍𥢵𥭎𥭶𥲠𦆁𦛿𦢼𦣄𦣉𦣖𦮋𦮝𦱋𦱣𦳶𧊷𧋽𧝹𧧄𧨔𧫢𨌶𨦩𨴤𩛲𩧣𩷶𪚤𪦍𪬳𪱮𪱯𫒥𫙜瀛𫢃𫢄𫱏𫱤𫺴𫼳𬂙𬉩𬕼𬖉𬪶𬮧𬲹",
 "母": "侮勄娒悔挴敏晦梅毓海烸珻瑇畮痗碡緐纛脢莓蝳誨诲踇酶鋂霉黣㙁䀲䊈䋣䋦䌓䍙䓯䩈䱕𠉩𠒾𠜮𠧩𠲯𠳨𡎧𡴕𢂳𢃶𢑍𢙽𢝂𢵹𣒫𣔍𣕬𣫵𣫷𣫸𣫺𣫼𣫾𣬁𣴴𣼿𤗆𤙩𤚚𤪝𤭐𦺇𦾴𧋟𧐟𧔄𧖦𧚀𧛔𧶅𩊱𩛸𩱟𩹝𪉥𪖫𪖬𪧞𪬶𪵔𪵥𫂂𫄩𫜈𣫺䍙𫪰𫯋𫯎𫲜𫴱𫵾𬅗𬆶𬑲𬒐𬠱𬠶𬶡",
 "尹": "侰咿宭峮帬捃桾洢涒焄珺窘羣群莙蛜裙裠覠輑郡頵鮶鲪鵘麏㟒㪊䇹䞫𠧬𠰶𠲰𠹩𡂬𡜬𡝗𡢡𢂽𢃆𢋖𢙠𢙬𢧃𢹲𢽏𣀄𣀆𣇉𣜘𤉙𤑩𤚹𤛰𤝳𤪡𤪡𤶷𤸷𥜉𥜢𥜮𦀲𦌺𦢱𦭽𦴨𧊰𧨡𨐚𨖗𨘂𨛦𨞗𨧡𩂿𩐩𪌺𪑁𪣣𪪒𫖳𫘿𫝉𫺔𬂁𬒽𬜋𬡝𬢂𬥀𬱌",
 "从": "侳倅儉剉劍劎劒劔匳厱唑啐噞夎嬐崒崪嶮座悴憸挫捽撿斂晬桽椊檢歛殮淬澰焠猝獫琗痤瘁睉睟瞼矬碎礆祽稡窣箤簽粹綷翠脞脺臉莝萃薟蜶襝誶譣谇賥趖踤醉醶銼錊鐱锉閦險顇顩驗髽鹼㛗㝧㟇㢛㫺㫺㭫㰵㱖㲞㷿㿌䁞䁞䂳䌞䔢䔢䘹䚝䟶䦟䦷䩎䯿䱣䲓䶨𠁸𠐖𠐘𠑁𠑲𠑲𠗚𠧆𠩜𠫏𠷜𠾹𡀓𡂭𡄰𡇻𡌚𡍂𡎢𡎥𡎦𡎬𡏩𡑯𡒪𡓆𡓢𡓨𡓨𡓮𡔗𡔗𡘫𡝵𡦧𡨠𡨧𡮇𡯨𡳝𡸄𡽗𡽥𡾴𢃒𢅐𢈼𢋳𢏬𢒐𢔙𢚂𢨔𣄝𣖛𣖢𣜟𣞘𣤬𣤬𣦗𣦗𣦮𣨎𣨛𣫍𣬓𣬓𣴳𣴶𣹶𤂭𤉛𤒷𤪛𤭢𤲠𥃡𥜋𥣂𥦊𥧚𥭭𥲽𥷡𥽋𦅊𦅊𦆧𦆧𦑋𦖒𦗹𦗼𦠪𦠪𦪮𦪮𦹇𦻏𦻏𧂆𧨀𧫒𧬢𧬢𧳚𧸘𧾉𧾏𨆘𨌻𨔊𨗦𨘰𨛏𨢅𨹫𨿼𩅼𩏩𩕿𩖄𩖆𩗶𩜘𩤏𩫛𪁽𪆍𪆍𪇇𪈪𪈪𪋌𪌴𪒫𪓌𪘧𪜇𪟼𪨙𪭮𪰦𪺨𫇈𫐩𫔧𫔧𫙴𫝃𫝃𫥜𫦈𫩅𫫑𫭿𫮋𫮣𫻣𬐎𬑮𬙼𬜈𬜐𬞈𬥗𬮥𬺋",
 "山": "侺偳催傰凒凗凱刿剬剴剻哕啱喘嗺嘊嘣嘧圌婩媏嵞嵞嵦巂徾恺惴愷慛捳揣摧敱敳暟桤梣椯榿槯樒歂涔湍溦溰滵漄漰漴漼潉澏煓熣熴猯獃獕琌瑞璀癌皑皚皠硙硶硸碋磑磞磪磮秽端篅繀繃翙腨膗苮蔤螘褍覬觽諯貒踹蹦輲遄錌鍴鎧鎽鏙鏰铠镚闓闿隑顓顗颛颽㑕㑻㒞㓽㖗㗀㙐㛧㜐㜠㟨㠢㢷㨟㨸㩄㪜㰎㱯㴈㴥㵹㷨㼇㼷䁗䃬䅱䈼䌏䐩䒻䔇䙖䜅䝎䠽䣙䤫䤱䥴䫈䫜䭓䮗䱺䳪䳽䵎䶣𠊀𠋔𠍓𠎺𠏥𠏩𠛕𠜿𠟁𠵚𠹛𠻂𠼩𠼾𠾨𠿯𡀢𡂅𡌕𡐇𡠱𡡈𡣸𡧚𡫨𡰋𡳂𡷪𡷪𡷬𡷬𡷴𡸧𡸧𡺖𡺻𡻀𡻍𡻍𡻎𡼰𡼰𡽏𡽒𡽒𡽚𡽚𡾀𡾀𡾕𡾕𡾧𡿂𡿘𡿘𡿢𢁃𢁃𢃷𢃷𢇑𢇕𢇕𢉾𢊛𢐒𢕘𢙿𢚏𢠄𢠎𢡦𢢯𢣆𢤮𢮹𢰠𢳳𢹂𢹫𢹴𢹴𢽡𢿗𣖃𣗏𣙋𣙌𣙍𣙩𣛄𣜱𣠭𣠭𣢽𣦭𣦭𣨡𣩑𣪱𣮼𣯧𣯯𣰏𣳈𣵵𣶎𣷰𣺿𣼍𣾧𤀖𤅐𤅐𤊤𤋬𤋬𤍈𤐜𤑈𤕘𤕘𤗯𤘑𤙿𤛍𤛲𤟉𤟮𤠲𤧸𤨲𤨾𤩫𤮞𤮯𤷝𤷳𤸳𥆱𥆹𥇷𥇸𥉴𥊅𥊠𥋳𥍛𥏸𥔗𥚻𥛢𥠃𥠄𥡶𥨢𥪪𥬍𥻁𥻶𥼂𦂣𦄬𦇜𦇜𦉎𦒀𦓗𦓙𦓚𦓛𦓝𦓞𦓟𦓣𦙏𦟹𦟽𦢥𦢾𦦇𦨽𦩴𦱑𦵓𦸏𧁆𧋏𧌹𧍒𧍘𧏢𧐩𧐿𧔇𧔍𧔮𧖖𧚸𧛎𧢠𧪚𧬌𧮄𧮋𧯺𧰄𧰙𧲑𧶲𧷦𧼗𧼴𧽊𧽠𧽧𨄍𨅃𨅏𨕰𨕱𨖭𨗞𨗞𨝡𨟎𨢉𨭽𨲊𨻱𨻵𩀡𩄟𩅃𩌩𩏘𩓤𩓥𩘈𩘥𩜠𩠊𩡎𩣞𩤚𩥉𩥪𩧎𩭢𩮖𩮴𩯷𩷘𩸶𩻃𩽌𪁏𪁷𪂢𪂨𪃨𪄋𪅁𪅮𪇋𪈖𪈡𪉻𪊃𪋎𪏩𪐑𪐹𪖾𪛂𪧄𪧾𪩄𪮘𪮤𪲤𪴉𪴢𪶐𪶱𪻬𪼇𪾺𫀢𫅛𫅥𫆴𫊍𫌌𫌛𫍱𫏭𫓁𫖮𫖵𫙹𫜥𫝧𫣅𫤖𫩯𫮞𫮿𫯥𫲖𫲪𫳁𫳟𫳹𫴚𫴚𫶂𫶜𫶟𫶹𫷋𫻅𫼥𬀱𬃆𬇁𬉽𬌘𬍰𬏣𬒏𬒻𬓀𬖵𬚩𬚩𬚩𬜨𬣪𬤠𬤹𬥼𬧥𬩗𬩫𬬀𬮒𬮿𬰢𬱣𬱮𬱼𬲿𬳐𬴁𬴕𬵥𬵨𬶒𬺃",
 "今": "侺僋唅唸嗿噖娢惗捻搇敜晗梒梣棯浛涔淰焓焾琀琌盦硶稔筨腍艌荶莟菍蛿誝諗谂谽趝踗鋡錜陰韽頷颔馠騐鯰鲶㑫㓧㖗㜝㟏㟔㤷㥤㮗㱃㵅㼨䂼䄒䎏䔷䣻䤫䧔䨄䫈䭃䳺𠉐𠤾𠤿𠹞𡌢𡡱𡪁𡷧𡷴𡹓𢈸𢙿𢚏𢧆𢧒𣔁𣘉𣘞𣚶𣢺𣢽𣤉𣵂𣵴𣸊𣻦𣾔𤙣𤚥𤞻𤩍𤭙𤷜𥆡𥆱𥆽𥓂𥕼𥱷𦁌𦛜𦛽𦜲𦠴𦨽𦰄𦲖𦹳𧫧𧶗𧹣𨛣𨡎𨡣𨡳𨬩𩃛𩈣𩋏𩐧𩐭𩑉𩒯𩒻𩔝𪁏𪁟𪌿𪑑𪑡𪕛𪘒𪞤𪡆𪪆𪫶𪯺𪳋𪺥𫊍𫓻𫕖𫤺𫪜𫫞𫭉𫱁𫴚𫺇𫺐𫺾𫻈𫼹𫾂𫾵𫾿𬁉𬇁𬎋𬑛𬒠𬒻𬠖𬪓𬯖𬱣𬳦𬶒𬹌",
 "兄": "侻兗哾娧帨悅悦挩捝敓敚梲棁涗涚痥祱稅税綂綐脫脱莌蛻蜕裞說説说銳鋭锐閱閲阅駾鮵㙂㜔㟋䂱䌼䫄䬇䬈䬽𠜑𠮄𠺷𡎺𣇋𣘌𣮆𤹙𤿫𥆟𥡉𥹲𦆳𦆳𦦳𦩃𧇓𨁑𨃷𨉋𨌔𨓚𨹪𩊭𩎰𪁑𪋃𪡜𫎙𫒵𫚛侻帨駾𫤛𫱲𫲦𬈣𬚜𬜄𬸑",
 "田": "侽俚俻偎偪偲傗傫僠儡儡儡兾冀冨副劃勫勰匐厘哩喂喵噃嚏嚔壘壘壘壨壨壨壨娌娚婳媌媤嫐嫘嫿嬏嬲嬲富審崰崽嵔嶓幅幡庿廙悝惫愄愊愢慉慮憣懥戴捚揊揋揌描搐摞撂播擂攂攂攂旙旛梩椔椳楅楐楒槒樏橎檑櫐櫐櫐櫑櫑櫑毸氎氎氎浬淄淠渨渵湢溭溿滀漯潘潩澅濹煏煨熼燔狸猥猫理琾璠瓃瓃瓃瓼甥畆畒畝疀疈疈疉疉疉疊疊疊痹瘰癗皤盢睤瞄碨磥磻礌礧礧礧礨礨礨福禗禝禩稫稷稸穓童箅粴糞綥緇緢緦縲繙繣纍纍纍纒缁缌缧罍罍罍罳翻翼腮腲腷膰舅艃荲莮菑葍葨葸蓄蔂蕃蕾藟藟藟虜蜔蝠螺蟠蠝蠝蠝裏裡褔襎諨諰謖譒讄讄讄谡貍貓趩踾蹯輜輻輽轓轠轠轠辎辐逼邍鄐鄱野量釐鋰錙錨鍡鍢鍶鎅鏍鐇鐳鑘鑘鑘锂锚锱锶镭隈霬靁靁靁靐靐靐顋颸飔飜餵騦騾骡鯉鯔鰃鰏鰓鱕鱩鲤鲻鲾鳂鳃鶅鶓鶝鷭鸓鸓鸓鹋鼺鼺鼺鼻㑤㑭㑼㓯㔣㔣㔣㔴㗜㗲㙒㙗㙼㙼㙼㛱㜅㞇㟪㢆㢖㢜㥸㦎㨧㨼㩇㩸㩸㩸㭵㭷㮥㮨㱬㴓㵢㵽㵽㵽㸋㹄㹎㺕㽃㽒㽬㽬㽮㽮㽮㾖㾯㿔㿔㿔㿳䄕䅔䅦䆺䈏䉂䉒䉪䉪䉪䊩䋥䋹䋿䌎䌿䍣䎩䐉䐯䐸䓒䔬䕎䙒䚡䛺䞏䡘䡹䢮䣎䤚䧉䨻䨻䨻䨻䪛䪤䮠䮳䰄䴎䴎䴎䵗䶑𠅤𠆁𠉶𠏴𠐑𠐹𠒰𠓀𠖓𠗔𠝘𠝹𠠦𠠩𠡪𠢎𠢮𠢴𠢿𠢿𠢿𠥏𠨃𠪙𠫶𠭇𠲸𠵾𠷟𠸢𠸨𠹈𡀂𡀧𡀭𡃚𡃷𡄞𡇨𡌹𡍉𡍠𡏂𡏱𡒟𡔬𡖦𡙂𡚗𡚗𡚗𡚘𡞕𡠲𡢹𡢽𡣉𡣠𡣠𡣡𡣡𡪂𡫘𡳒𡸟𡻭𡻱𡻼𡾊𡾊𡾊𡾋𡾋𡾋𡾔𡾔𡾔𡿂𢁐𢁐𢁐𢃇𢄶𢈷𢉝𢎑𢐠𢐲𢑍𢑎𢑵𢑿𢕹𢛥𢛯𢞨𢞰𢠞𢢨𢣢𢣲𢣲𢧙𢨚𢮧𢰭𢱩𢹢𢾇𢿥𣀀𣀜𣀜𣀜𣀡𣀡𣀡𣃂𣄏𣄗𣈴𣈾𣉍𣊩𣓩𣘸𣙚𣚣𣛛𣡟𣡟𣡟𣬖𣬗𣰑𣰭𣰭𣰭𣰸𣰸𣰸𣵦𣶩𣸋𣻞𤃺𤃻𤃻𤃻𤄜𤄦𤉣𤋰𤋽𤐝𤒲𤓜𤔜𤖃𤗚𤗹𤚐𤛅𤟧𤠎𤠕𤡂𤢗𤢰𤢹𤢹𤢹𤣂𤣂𤣂𤧖𤨀𤮉𤮚𤱈𤱘𤱶𤱽𤱾𤲂𤲑𤲙𤲲𤲶𤲶𤲼𤳆𤳇𤳊𤳏𤳏𤳏𤳓𤳖𤳗𤳛𤳢𤳤𤳦𤳦𤳦𤳧𤳫𤳯𤳺𤳻𤳼𤴁𤴁𤴁𤴅𤴑𤸋𤸛𤸝𤸠𤺆𤺏𤽲𥂜𥃇𥃇𥃇𥆤𥆼𥈯𥉹𥊮𥋸𥌬𥎙𥓄𥓲𥓶𥔁𥔅𥕿𥗃𥚃𥚈𥚉𥚸𥛧𥛮𥡜𥢌𥣇𥣕𥣢𥣬𥣬𥣬𥩉𥪽𥯜𥯡𥯨𥱐𥲔𥴁𥵉𥵖𥵷𥷿𥻅𥻏𦃩𦄛𦆊𦆙𦇄𦇄𦇄𦈅𦈅𦈅𦈓𦋮𦌵𦌵𦌵𦏒𦑞𦑭𦒖𦓵𦔆𦔎𦔜𦕸𦖷𦖻𦘣𦘧𦡃𦢏𦢏𦢏𦥶𦦊𦩡𦩭𦪖𦱓𦳈𦷗𦹣𦻇𦽌𦽝𦽪𦾲𦿊𦿤𧀇𧀗𧁃𧁏𧂵𧃢𧅲𧇄𧇙𧇽𧋎𧋱𧍣𧍤𧍥𧎁𧏧𧏷𧐣𧐯𧑌𧑪𧑳𧒜𧒽𧓵𧔆𧔊𧔹𧕌𧕙𧖈𧖎𧗂𧚣𧚽𧛚𧝀𧞭𧞭𧞭𧟕𧟕𧟕𧡇𧨬𧪏𧫖𧱥𧱨𧳠𧷳𧸳𧹭𧹴𧹶𧻲𧽲𨁫𨃄𨃕𨄱𨅜𨅴𨆢𨆫𨊃𨊄𨎟𨎠𨎿𨐶𨑌𨑌𨑌𨓦𨕢𨘡𨘦𨙝𨛋𨜐𨞽𨞽𨞽𨡾𨤢𨤣𨤤𨤦𨤧𨤩𨤪𨤫𨤬𨤭𨤮𨤯𨤰𨤱𨤳𨤵𨤷𨤷𨤻𨦻𨭱𨯔𨯔𨯔𨯼𨴻𨵩𨶬𨶸𨷏𨸆𨺤𨺬𨺯𨻽𨼠𨾂𨿴𩀷𩁜𩁜𩁜𩁤𩁦𩂾𩃙𩇁𩇁𩇆𩇍𩇾𩈀𩋝𩋨𩌹𩌺𩌼𩍢𩏞𩐏𩑆𩕃𩕏𩗮𩘆𩙺𩟳𩥺𩦸𩧹𩧿𩨎𩨏𩭇𩭺𩮹𩳓𩳻𩴻𩴻𩴻𩴼𩴼𩴼𩹱𩻽𩼞𪃄𪃞𪅅𪆼𪉀𪉭𪋍𪋠𪌾𪍯𪑹𪒕𪕲𪕳𪖇𪙢𪜽𪝌𪟞𪟡𪟤𪟦𪟧𪟯𪣨𪣲𪤠𪦮𪦮𪦮𪫑𪫔𪮏𪰀𪰺𪱀𪱁𪶀𪷉𪸈𪺟𪽕𪽗𪽡𪽤𪽤𪽤𪽥𫀼𫂨𫄕𫄯𫆪𫇍𫈨𫈩𫋘𫍰𫎰𫏾𫐙𫐙𫐙𫑓𫑪𫑬𫒁𫒂𫔍𫗭𫘓𫙓𫙣𫙭𫙶𫝟僧憎椔𣚣鼻𫡼𫢄𫣭𫤊𫤊𫤡𫦶𫦻𫨞𫩍𫬸𫭬𫯫𫱆𫱫𫳗𫳝𫴅𫴦𫴫𫶘𫻾𫽇𫽜𫽠𫿁𫿓𬃝𬅱𬈔𬈠𬉙𬊴𬌊𬌌𬌼𬏈𬏎𬏓𬏔𬏖𬏗𬏘𬓳𬗚𬗱𬗽𬘅𬙆𬙒𬜉𬢄𬧐𬧾𬨉𬨕𬪞𬯞𬰉𬳃𬵝𬵫𬸪",
 "糸": "係傃傫儽嗉噄噝嫊嫘孫愫摞攥榡樏橴櫀欙溸漯潆潔濝瀫瀿瘰癳磥綔緐緜緳縤縲繇繛纝缧膆蔂蕠蕬藄蘩虆螦螺邎醿鏍騾骡鯀鲧㒍㓗㗪㨞㩯㰃㵖㶗㶟㹎䉂䋤䌛䏈䐯䐼䔝䘘䛾䥛䭧𠎧𠠣𡈱𡈸𡏱𡐤𡤯𡻭𡻱𡼊𡿔𡿜𢍣𢍵𢐐𢐾𢑂𢑄𢑈𢑉𢭁𢱨𢴱𢴲𢺢𣚃𣚎𣛐𣝌𣟾𣠡𣠹𣨒𣼒𤀇𤀝𤃰𤃲𤏦𤛡𤜖𤠚𤡂𤡨𤢘𤩦𤪌𤫤𤫺𤬖𤮉𤮎𤳻𤴈𤺚𥉹𥊯𥊻𥌣𥍔𥗼𥛧𥡜𥢪𥪲𥱨𥲕𥳮𥷆𥷞𥸕𦁝𦂞𦃅𦃟𦃢𦅍𦅚𦅫𦅸𦅹𦅻𦆩𦆮𦆾𦇚𦍁𦺰𦽝𦾴𧂔𧄎𧄜𧋬𧚃𧫖𧬀𧮢𧷳𧹶𧽲𨄐𨄱𨖾𨙣𨰭𨵆𨻽𩇍𩌹𩌺𩎆𩏞𩔥𩕃𩕛𩮹𪅸𪆓𪍯𪦤𪦥𪯑𪯛𪰸𪱀𪶸𪷜𪷬𪾵𪿶𫄕𫉺𫌾𫒠𫤡𫧅𫪈𫯼𫱚𫶛𬃶𬈶𬎏𬗪𬗶𬗾𬝚𬞍𬠭𬪤𬫵𬭴𬮃𬮩𬵡𬹬",
 "龰": "促哫唗娖徒捉浞珿莡赲赳赴赵赶起赸赹赺赻赼赽赾赿趀趁趃趄超趆趇趈趉越趋趌趍趎趏趐趑趒趓趔趕趖趗趗趘趙趚趛趜趝趞趟趠趡趢趣趤趥趦趧趨趩趪趫趬趭趮趯趰趱趲趸跫跾跿踀踅蹇蹔蹙蹩蹵蹷躄躉躛躠鋜陡鯐齪龊㹱㿓䇍䎌䛤䞖䞗䞘䞙䞚䞛䞜䞝䞞䞟䞠䞡䞢䞣䞤䞥䞦䞧䞨䞩䞪䞫䞬䞭䞮䞯䞰䞱䞲䞳䞴䞵䞶䞷䞸䞹䞺䞻䞼䞽䞾䞿䟀䟁䟂䟃䟄䟅䟆䟇䟉䟊䟋䟌䟎䟏䟐䟑䟒䟟䟫䠂䠟䠠﨣𠈮𠑮𠠄𡄱𡟐𡡍𡷿𢈩𢕤𢕳𢖂𢶝𣙳𤍷𤏉𤗁𤞥𤰉𤲊𤼗𤼯𤽱𥁯𥆥𥒭𥗈𥞺𥭽𥷼𦛣𧂨𧋥𧋨𧋩𧚖𧯩𧹤𧺇𧺈𧺉𧺊𧺋𧺌𧺍𧺎𧺏𧺐𧺑𧺒𧺓𧺔𧺕𧺖𧺗𧺘𧺙𧺚𧺛𧺜𧺝𧺞𧺟𧺠𧺡𧺢𧺣𧺤𧺥𧺦𧺧𧺨𧺩𧺪𧺫𧺬𧺭𧺮𧺯𧺰𧺱𧺲𧺳𧺴𧺵𧺶𧺷𧺸𧺹𧺺𧺻𧺼𧺽𧺾𧺿𧻀𧻁𧻃𧻄𧻅𧻆𧻇𧻈𧻉𧻊𧻌𧻍𧻎𧻏𧻐𧻑𧻒𧻓𧻔𧻕𧻖𧻗𧻙𧻚𧻛𧻜𧻝𧻞𧻟𧻠𧻡𧻢𧻣𧻤𧻥𧻦𧻧𧻨𧻩𧻪𧻭𧻮𧻯𧻰𧻱𧻲𧻳𧻴𧻵𧻶𧻷𧻸𧻹𧻺𧻻𧻻𧻼𧻽𧻾𧻿𧼀𧼁𧼂𧼂𧼃𧼄𧼆𧼇𧼈𧼉𧼊𧼋𧼌𧼎𧼏𧼐𧼑𧼒𧼓𧼔𧼕𧼖𧼗𧼘𧼙𧼚𧼛𧼜𧼝𧼞𧼟𧼠𧼡𧼢𧼣𧼤𧼥𧼦𧼧𧼨𧼩𧼪𧼫𧼮𧼯𧼰𧼱𧼲𧼳𧼴𧼶𧼷𧼸𧼹𧼺𧼻𧼿𧽀𧽁𧽂𧽃𧽅𧽆𧽉𧽊𧽋𧽍𧽏𧽐𧽑𧽒𧽓𧽔𧽕𧽖𧽗𧽘𧽙𧽚𧽛𧽜𧽝𧽞𧽟𧽠𧽡𧽢𧽣𧽤𧽥𧽧𧽨𧽩𧽪𧽫𧽬𧽭𧽮𧽯𧽰𧽱𧽲𧽳𧽴𧽵𧽶𧽷𧽸𧽹𧽺𧽻𧽼𧽾𧽿𧾀𧾁𧾂𧾃𧾄𧾅𧾆𧾇𧾈𧾉𧾊𧾋𧾌𧾍𧾎𧾏𧾐𧾑𧾒𧾓𧾔𧾕𧾖𧾗𧾘𧾙𧾚𧾜𧾜𧾜𧾝𧾟𧾠𧾡𧾢𧾣𧾤𧾥𧾦𧾧𧾨𧾩𧾪𧾫𧾬𧾮𧾯𧾰𧾱𧾲𧾳𧾴𧾵𧾶𧾸𧾺𧿀𧿃𧿮𧿿𨀂𨀲𨀶𨁀𨁘𨁛𨁢𨁥𨂝𨂞𨂢𨂣𨂬𨃗𨃞𨃢𨃨𨃫𨃱𨃲𨃾𨄚𨄝𨄟𨄡𨄦𨄬𨄯𨅇𨅐𨅘𨅚𨅠𨅴𨆊𨆐𨆑𨆕𨆜𨆥𨆧𨆪𨆬𨆬𨆻𨇌𨇐𨇓𨇘𨇛𨇜𨇭𨉌𩈤𩎅𩕈𩖑𩦬𩩔𪕝𪧎𪨡𪭴𪴢𪽰𫃥𫎱𫎲𫎳𫎴𫎵𫎶𫎷𫎸𫎹𫎺𫎻𫎽𫎾𫎿𫏐𫏔𫏕起𧼯𫷭𬑝𬒺𬚃𬣹𬦅𬦆𬦇𬦈𬦉𬦊𬦋𬦌𬦍𬦎𬦏𬦐𬦑𬦒𬦓𬦔𬦕𬦖𬦗𬦘𬦙𬦚𬦛𬦜𬦝𬦞𬦟𬦭𬦼𬧁𬧈𬵔",
 "⺨": "俇唙嶽悐梑橥漪潴荻莥获莸蕏蕕誑诳逖逛鵟鸑㤮㾠䓄䔆䯼𠜓𠱍𡈭𡍭𡽺𢓯𢕙𢙹𢚯𢟆𢴘𢵝𣳜𣴥𤂲𤄀𤞿𤟋𤟳𤣊𤫏𤺐𤺸𥇃𥭳𥴕𥵍𦛡𦱄𦴮𦵧𦸒𦹤𦺛𦻨𧀀𧁿𧃶𧋵𧒇𧜹𧻺𧼃𨁨𨌃𨿗𩁓𩮞𩷎𩷗𩷬𪈌𪙈𪱂𪶆𪻊𫈃𫑁𫛖𫛭𫫜𫫯𫬕𫻆𫻞𫼺𫾢𬁑𬄞𬍆𬍉𬍌𬍍𬍎𬨯𬴭𬸚",
 "五": "俉唔啎圄娪寤峿悟捂敔晤梧浯焐珸痦衙語语逜郚鋙铻鯃鼯齬龉㐚㹳䎸䏸䓊䦜䮏𠗐𠵥𠵦𠼘𡨂𡬑𢆖𢈪𢓲𢤓𢻊𣣄𤕻𤭑𥆐𥏒𥒾𥟊𥭠𦀡𦥉𦸭𦹊𧄯𧋋𧳎𨖍𩒾𩩑𩳌𪁙𪕡𪘚𪣔𪩳𫕁𫟙𫥩𫪸𫬮𬤿𬰜",
 "艮": "俍哴喰娘孂崀悢斏朖桹檭浪湌烺煺狼琅硠稂筤篒籑粮腿艆莨蜋螁褪誏踉蹆躴郞酿鋃锒閬阆飡飧飨飱飸飺餈養餍餥餮饂饏饔饕饗饜駺㓪㝗㟍㢃㫰㱢㾗㾼䀶䆡䈨䉵䍚䓳䓹䡙䬤䬥䬩䬭䬸䭁䭆䭌䭕䯖䱶𠐗𠑉𠺙𠻡𠽗𡁬𡈟𡍭𡏒𡘳𡙵𡡆𡳋𢉟𢕦𢝧𢟔𢡆𢣩𢣰𢭗𢱸𢽂𣂞𣈮𣊕𣗔𣘴𣙧𣻇𣼹𤃾𤗀𤢲𤭒𤸤𤼛𥈥𥍫𥧫𥱉𥴝𥶉𥷓𦀬𦄁𦤮𦫐𦫑𦶠𦹧𦻂𦿉𧁊𧃊𧅔𧓪𧚅𧩺𧳓𧻴𨙝𨢁𨢻𨩭𨵬𩄮𩗖𩘩𩘬𩚇𩚏𩚓𩚜𩚴𩚷𩚻𩛁𩛄𩛈𩛒𩛕𩛗𩛚𩛛𩛜𩛢𩛰𩛳𩛻𩜔𩜕𩜢𩜥𩜨𩜬𩜸𩜻𩜾𩝓𩝕𩝖𩝩𩝫𩝵𩝶𩞕𩞹𩟚𩟨𩟷𩟸𩮍𩷕𪁜𪇩𪙈𪙲𪞓𪡙𪦿𪬲𫅞𫔨𫗍𫗒𫗚𫗝𫗨𫠺𫤈𫤓𫦭𫷸𫺻𬏊𬓓𬕤𬞵𬣼𬨷𬪢𬮵𬲏𬲕𬲖𬲟𬲢𬴀𬸏",
 "禾": "俐俬俰倭偢凜厤厤唀唎唩啝啾娳婑媝峲崣嵙廩廭悡悧悸惒愀愁懍捼揪揫攈梨梸棞楸楿檁櫯浰涹湫湬潲澟煍熪燣犁猁琇琍瓾甃痜痢痵痿癛癪瞅矮碅稛筣箘篍簃綉緌绣脷腇莉莠菌萂萎萟萩萪萫蒩蕛蕱薐薭藊藒蘇蘒蘔蜊蜏蜠蜲蝌蝵覣誗誘諉謻诱诿踒踿躷透逶醔銹鋓鋫鋵錗鍫鍬锈锹鞦頹頺餧馚馛馜馝馞馟馠馡馢馣馤馥馦馧馩馪馫鬁鬏魏鯏鯘鯚鰍鳅鶖鹙麕麘黁㐯㑧㖥㗍㘒㛢㡑㢉㢝㢻㣦㮃㳵㴝㴡㹻㻑㻒㻳㾭䂰䅎䅗䅨䆌䆧䈖䊬䋺䌀䎿䐃䐐䔉䔉䔟䕌䕝䕴䖽䛢䞬䠅䦭䨂䫋䫝䬆䬐䭯䭰䭱䭲䭳䰀䱘䴧䵩䵸𠃯𠃷𠅼𠉑𠏟𠐬𠗺𠘡𠜣𠝯𠝲𠞠𠡩𠩾𠪱𠪱𠪾𠪾𠼪𠾔𠿀𡀝𡀫𡃊𡄁𡈳𡎟𡓈𡗋𡚕𡞈𡟊𡡏𡣉𡣢𡤍𡥬𡥻𡦠𡦧𡨖𡮒𡮰𡮰𡯵𡳜𡳮𡸉𡸙𡹜𡹤𡺘𡻣𡽜𡽯𡾫𡿆𢀮𢀱𢃸𢈱𢊆𢊆𢋈𢓵𢛊𢛕𢢃𢢹𢥄𢬳𢭆𢮖𢯗𢱃𢳽𢴐𢵥𢶸𢸫𢹃𢹠𢹠𣄬𣄬𣇘𣒇𣒴𣓮𣘵𣜗𣝟𣟤𣟶𣨙𣫉𣮀𣮁𣮂𣱭𣵛𣷓𣻗𣼋𣿇𤃉𤃉𤃝𤃝𤃡𤉉𤉌𤉦𤋦𤋭𤏤𤏨𤐧𤐸𤒟𤖣𤖣𤢤𤥹𤧐𤧘𤧦𤩏𤭰𤯎𤯎𤯑𤯪𤳂𤳂𤳝𤳝𤹇𤻤𤻤𤼀𤼍𥇘𥋶𥏗𥏶𥓔𥔍𥔜𥔡𥕆𥕆𥗎𥗶𥙾𥚥𥟦𥟻𥟿𥠨𥡀𥡀𥡁𥡉𥡭𥢁𥢅𥢆𥢮𥢮𥢲𥢲𥢺𥢺𥣉𥣠𥣠𥣤𥣤𥣧𥣸𥣸𥤃𥤒𥦉𥧇𥧎𥪍𥳓𥳼𥴟𥴢𥵾𦁳𦂎𦇘𦏁𦓽𦓾𦡣𦢦𦢵𦪼𦮺𦱑𦳁𦷍𦷬𦺪𦻎𦻓𦼖𦼖𦼹𦽂𦽑𦽖𦽧𦾎𦿁𦿾𦿿𧀁𧀑𧂅𧂐𧄄𧄦𧅼𧇮𧇯𧇸𧎐𧎗𧐹𧚘𧛃𧛿𧛿𧡣𧤙𧪑𧪙𧮠𧯄𧯅𧳌𧶞𧷂𧹰𧼐𧽂𨄼𨍊𨎹𨖨𨞒𨟝𨡌𨡲𨣺𨨑𨨛𨮍𨯀𨴷𨵋𨹳𨺹𨿖𩄞𩄞𩆐𩆻𩇆𩓽𩗯𩝋𩠺𩠻𩠽𩠾𩠿𩡀𩡁𩡃𩡄𩡅𩡆𩡇𩡈𩡉𩡊𩡊𩡌𩡌𩡎𩡏𩡐𩡐𩡑𩡒𩡓𩡔𩡕𩡖𩡗𩡘𩡙𩡚𩡛𩡜𩡝𩡞𩡟𩡠𩡡𩡢𩡢𩡣𩡤𩡥𩡦𩣫𩤁𩤹𩧸𩮄𩹤𩼤𪁐𪁮𪃩𪅨𪉍𪋒𪌱𪍁𪍎𪍗𪘩𪘭𪙱𪙱𪛁𪝲𪢖𪣛𪣜𪨝𪬏𪭼𪮞𪰬𪶵𪺋𫁅𫆉𫈗𫉛𫌂𫎂𫐵𫓼𫔣𫕏𫖜𫗪𫗼𫗽𫗾𫗿𫘀𫘁𫘂𫘃𫘄𫙋𫛙馧𫣯𫦷𫬥𫭴𫵿𫸅𫸅𬈎𬊔𬎙𬐦𬓟𬓪𬓶𬓶𬓷𬓷𬓼𬔂𬖹𬘴𬝣𬞣𬟘𬠓𬨩𬪙𬫥𬭗𬭿𬯼𬳜𬳝𬳞𬳟𬳠𬳠𬳡𬳢𬳣𬳤𬳥𬳦𬳧𬷶𬸎𬸴𬺊",
 "用": "俑勇勈恿悀捅桶橣涌澝痛硧筩蛹誦诵踊通銿鯒鲬㛚㦷㪌㷁㼧䔭𠋀𠳀𡇮𢓶𣗧𣘋𣭲𣵳𤢆𤰏𤰏𥦁𥳥𦛸𧆿𧑗𧗴𧚔𧚸𧻹𨪞𨴭𨺳𩊾𩒼𩕋𪆢𪌻𪔜𪴷𫈏𫺩𬗝𬩐𬱥",
 "元": "俒唍捖晥梡浣烷皖睆筦綄脘莞蔲蔻輐鋎院鯇鲩鵍㹕䓕䓻䯘䴷𠖈𠖝𠖞𠖤𠖨𠜍𠴉𠶃𡣑𡤁𡫅𡷗𢒎𢕋𢭫𢴝𢽉𣸦𤂕𤍘𤞵𤻆𥹳𦯿𦰟𧚁𧶉𨙌𨠻𨵄𩂷𩳚𪄓𪄺𪫻𪮀𪲭𪹎𪺗𫀏𫀶𫆻𬏉𬒑𬕎𬘫𬹉",
 "巛": "俓儠剄剿勁勦嗈娙崰巰弳徑拶挳摷擸桚桱椔樔殌氫涇淄漅烴煭爉獵璅疀痙硜窼經緇繅缁缫罺脛臘莖菑蛵蠟衟誙踁躐輕輜轈辎逕邋郺鄛鋞錙鎻鏁鑞锱镴陘隟雝頸鬣鯔鱲鲻鵛鶅齆㑿㓯㜉㦽㭮㯿㲱㳨㴩㹵㺐㼃㿳䀴䁽䃳䅔䉭䎩䐉䜈䜲䝓䞓䟁䣆䣎䪉䪫䭬䲃𠊖𠗊𠛱𠞰𠠗𠡝𠡢𠲮𠻥𡏮𡓍𡙂𡡊𡷨𡸟𡻝𢀄𢀊𢀋𢀌𢀌𢀍𢆭𢙼𢺍𣇁𣋲𣓩𣝞𣩓𣫒𣰫𣶜𤉣𤍒𤎾𤑗𤑹𤕆𤪍𤭓𤱽𤱾𤲑𤲙𤳊𤳤𤳫𤳯𤴅𥓲𥕘𥚉𥥻𥲀𥷿𥸆𦃽𦈵𦉨𦗔𦞡𦟳𦸛𦿊𧀗𧄩𧄵𧇄𧈈𧈊𧑀𧑳𧕱𧘀𧜇𧫇𧭞𧯬𧰠𧱥𧷣𧸶𨄓𨉒𨏄𨓌𨝖𨞑𨠸𨢪𨿋𨿴𩈡𩋝𩌋𩍀𩏔𩏙𩔪𩗮𩣪𩨐𩪇𩫥𩭙𩰹𩳍𩷏𪄉𪅕𪇹𪊵𪋍𪍨𪏅𪕣𪖵𪙷𪪝𪪯𪵃𪹟𪺟𫎥𫏎𫖩𫚭摷璅𥲀罺鄛𫳗𫶪𫻾𫽨𫿢𬆛𬌊𬐿𬓩𬨓𬭲𬯞𬯮𬷰",
 "布": "俙唏悕晞桸欷浠烯狶琋瓻睎稀絺脪莃豨郗餙鯑鵗㛓㟓㹷㾙䖷䛥䤭䮎𠎴𠜗𠨚𢓬𢬾𣱬𥭘𦖁𧎙𧳐𧶖𧻶𨓇𨡂𨿕𨿛𩊽𩒽𩭉𪌹𪖥𪖪𫄨𫹇𬮶",
 "由": "俜娉梬涄腗菗騁骋䀻䛣䨤䳙䶇𠁔𠍡𠏬𠶢𠶦𠷓𠸮𡧹𢓳𢖊𣓐𣔴𥪁𥭢𦀔𦁖𦅩𦰝𧮹𨭈𩍌𩤱𩭶𫈛𫈜𫈶𫤝𫪆𫮂𫷘𫽹𬔍𬕫𬗺𬙀𬧍𬫙𬳙",
 "矢": "俟倁唉嗾娭嫉彂悘愱挨智椥榘槉欸殹涘璏痴瘯竢簇聟蒺蔟薙蜘螏誒诶踟逘鏃镞騃鷟鼅㑵㲛㵀㶼㸻㺅䀵䃚䉜䐅䓡䝷䣽䵹𠕧𠤘𠹋𡆈𡆍𡎇𡱢𡻬𢄧𢈟𢏦𢓪𢔊𢛍𢜔𢞱𢯙𢳇𢳈𢵦𢶾𢹣𣉻𣊋𣒟𣔇𣘂𣜫𣶱𣻩𤌿𤖏𤶗𥇭𥏖𥏯𥏳𥐉𥐔𥒲𥜖𥯌𦑄𦝔𦣜𦩈𦩉𦮸𦶱𧌲𧎿𧐈𧐉𧡐𧡯𧪠𧸒𧽑𨄕𨔓𨕾𨙍𨢮𨢰𨢱𨧚𨩀𨪏𨯍𨴱𩀥𩗨𩰤𩸴𩺯𩻀𩻼𪁬𪂷𪋧𪑜𪟒𪠠𪢤𪨅𪵊𪻇𪼕𪿍𪿏𫆆𫈫𫏰𫑝𫒱𫘤𫞀𫡍𫦓𫧕𫪦𬂼𬄃𬅃𬑵𬑶𬑸𬙟𬦑𬦚𬫸𬭐𬲒𬵖𬸦",
 "天": "俣咲娱悮戣掷揆暌朕栚楑洖浂淏渕湀烪猤眹睽祦筽脵茣葵虞蜈誤误踯送郑鄈鋘鍨関闋阕騤骙麌㖔㧷㩑㪪㶺㻍䆨䙆䙣䠏䤆䳫𠈪𠊾𠹻𠿓𡎝𡗺𡞳𡢭𢃯𢑣𢕠𢚺𢜂𢜽𢞋𢬈𢮚𣉉𣔽𣦌𣵗𣵞𣷃𣺍𣾍𤬉𤶕𥒆𥜁𥯫𥱄𦝢𦨳𧍜𧍦𧝚𧡫𨁇𨅳𨇕𨓵𨛴𨧐𨹙𩀁𩇺𩐄𩔆𩷵𩹍𪠫𪪙𪲿𪵜𫃭𫕀𫚾𫛼𫫹𬀲𬆬𬑪𬚻𬝫𬨦𬭌𬮦",
 "弚": "俤剃娣悌挮晜梯涕焍珶睇祶稊綈绨罤豑豒递銻锑鬀鮷鵜鹈㖒㣢䏲䑯䬾䶏𡌡𡥩𢚖𣋥𣋥𣜹𤫼𤭌𥊽𥺀𦯔𧀾𧃣𧋘𧯪𧳋𧳼𧴉𨁃𨹥𨿘𨿝𩓂𩽞𪁩𪕧𪖦𪫃𫤜𫸽𬀹𬑳𬡜𬲻𬶕",
 "心": "俧倊偬偲傯僁僫僽僾億優勰唸唿喼嗯噁噫噯嚖嚘娡媤媳嫕嬑嬡嬨寧崽幒幰廰惗惚惫愡愢慮憁憶憾懓懮懳懿捴捻揌揔搃摁摅摠撼擾攇敜曖梕梞梽棇棯楒楤槵樬橣橤橤橤檍櫌櫘櫶毸涊淰淴滤滺漗漶澝澸澺濨瀀瀗焖焧焾煾熄熜燜燰燱牎牕獶璁璦瓇痣瘜瘱癋癒癔皧瞣瞹矁礠禗稔稳窸窻綕綛総緦緫緿縂總繠繠繠繶纋纞缌罳耰腍腮臆艌荵莣菍葱葸葾蒠蒽蔥蕄蕊蕊蕊蕜薆薏藯藼螅蟋蟌覟誋誌認諗諰謥譩譿谂贃贒趝跽踗躵轗鄎鄾醷鋕錜鍃鍯鍶鎴鏓鏭鐚鐿鑀锪锶镱隐靉顋顖颸飔騐騘騦驄骢鯰鰓鱤鱫鲶鳃鳡鵋鷾㑫㗝㗭㗹㘂㘃㙳㜇㜻㢜㣰㤪㥖㥙㥷㥸㦖㦙㦥㧾㩨㬩㮩㱊㴓㴔㴧㴽㵍㵞㷓㸾㹅㺀㺊䂼䃭䄊䄒䅰䆫䈚䈡䉍䉞䊝䋟䎚䏯䏰䐋䓌䓗䓤䔭䖁䗓䗭䗷䗹䘆䙂䚡䛱䜑䜗䜡䜢䜨䞏䡯䡺䥳䧔䧮䨚䪀䪰䫲䬍䭃䭐䭒䰄䵻𠅤𠊞𠌼𠎒𠎩𠎹𠏋𠒸𠕡𠖓𠖤𠗋𠞹𠡻𠨛𠴍𠷂𠷿𠹤𠺒𠺨𠺱𠻯𠾦𠿈𠿑𡂔𡆕𡈻𡔀𡜱𡝖𡝲𡟟𡟯𡠛𡠴𡡁𡢇𡪾𡮬𡮮𡱽𡲦𡷞𡷢𡹓𡾢𡾳𢂴𢅪𢅫𢈸𢖒𢖘𢘑𢘗𢙺𢚁𢚚𢚴𢛥𢞀𢞨𢞰𢞴𢟄𢟈𢠞𢠶𢡃𢡙𢡥𢡵𢢸𢣢𢣫𢣳𢣳𢣳𢥀𢥔𢥙𢥷𢦋𢭄𢮈𢰽𢰾𢱽𢴑𢴾𢵣𢶲𢶴𢶶𢷀𢷾𢽨𣇌𣇡𣇤𣔀𣗹𣛚𣛚𣛚𣛴𣜬𣜴𣜷𣞝𣟥𣟻𣤮𣨠𣩤𣷡𣽏𣽹𣾈𣾫𣾫𣾫𤀒𤄦𤅮𤌀𤎕𤏘𤑡𤘓𤙹𤛸𤛾𤟧𤡟𤡧𤡧𤡧𤡺𤡾𤢆𤢛𤢻𤥴𤦏𤨒𤪂𤪥𤪳𤶝𤸊𤸛𤹕𤹯𤺫𤺫𤺫𤺯𤻅𤻦𤼂𤼉𤼣𤾱𥀽𥆾𥇰𥈝𥈲𥉖𥊟𥍒𥎙𥒺𥖦𥚆𥜇𥜚𥣁𥣒𥣓𥣯𥣴𥧉𥧟𥭜𥭡𥯨𥰝𥳝𥳝𥳝𥳥𥴨𥴲𥴺𥵆𥵖𥶙𥺃𥻏𥼳𥽇𥽟𦁕𦃕𦃞𦃳𦃵𦄥𦄵𦆭𦇀𦋮𦐼𦒝𦓖𦔧𦖆𦖟𦖷𦖻𦗂𦘏𦝅𦞜𦠤𦠤𦠤𦠲𦡝𦡵𦢑𦣛𦣶𦧯𦧰𦩭𦪐𦮼𦳌𦵚𦶐𦸝𦺝𦻇𦻕𦼇𦽫𦾤𧀥𧁋𧁗𧁚𧁚𧁚𧂋𧂿𧂿𧂿𧃿𧄉𧆎𧇰𧋷𧋺𧍤𧏀𧏮𧑕𧑗𧑶𧓁𧖷𧗂𧚈𧜐𧞇𧩓𧩷𧪅𧪩𧪳𧫉𧴊𧴕𧴕𧴕𧹗𧾤𧾨𨃡𨄄𨄠𨄲𨅥𨇄𨈌𨉼𨎒𨎢𨏥𨙤𨛑𨜐𨡎𨡣𨡾𨣝𨣥𨧟𨨩𨪜𨫑𨬃𨭨𨮋𨯶𨲅𨵖𨺯𨻁𩁈𩇻𩈢𩉋𩊫𩊴𩋏𩋚𩍖𩍹𩏲𩐭𩑉𩔨𩕄𩕋𩕮𩗻𩙍𩟳𩡣𩥝𩭳𩯲𩯵𩷓𩷱𩸂𩼗𩽇𩾎𪁓𪂒𪂺𪃄𪃼𪄛𪅴𪆢𪇈𪊄𪌿𪍃𪏤𪐁𪐇𪑡𪒱𪔊𪕳𪙋𪝔𪞤𪞹𪠎𪤣𪤥𪩊𪪄𪪆𪪈𪪟𪫍𪫶𪬎𪬝𪬤𪬧𪬪𪬫𪬲𪬳𪬼𪬽𪮏𪮠𪮰𪯏𪯺𪱍𪲨𪳋𪴆𪶨𪶩𪶮𪷨𪹪𪺅𪺠𪺥𪺵𪼦𪼭𫀷𫀼𫁈𫁑𫃄𫃐𫃕𫄅𫄷𫅰𫆒𫇟𫈝𫈝𫉅𫉝𫍪𫍰𫐘𫒥𫓏𫓻𫔪𫔷𫛋𫜚𫝹𫠺𫢨𫣆𫣜𫨯𫨰𫨺𫩈𫪍𫫇𫫖𫫞𫭰𫭻𫮦𫯸𫱁𫱛𫱝𫵈𫵋𫶃𫷞𫺓𫺦𫺭𫺱𫺴𫺽𫺾𫻂𫻈𫻉𫻌𫻐𫻜𫼽𫾋𫾿𬃡𬃰𬃼𬄔𬄚𬅂𬅇𬅳𬇨𬇰𬈬𬈺𬊆𬊌𬊡𬋚𬑛𬓐𬓔𬕊𬕷𬖟𬘨𬛐𬛗𬜉𬞧𬟊𬠍𬠖𬠥𬢌𬣐𬤋𬤭𬤹𬧫𬪑𬬦𬭥𬭱𬯗𬯝𬰔𬲀𬲊𬲠𬳋𬷴𬹌𬹓",
 "付": "俯捬焤腐腑䒀䮛𡍃𡠞𢉶𢊾𢰆𣘧𣩇𣻜𥮯𥲛𦝗𦱖𦲱𧨽𨁵𩷺𩸅𪪠𫎃𫙳𬫰",
 "交": "俲傚滧礮纐㘐䉰䕧𠙟𤟋𦽨𪛀𫹨",
 "戈": "俴俴剗剗嘎垡娀嬂嶯帴帴幟悈撠擑旘栰械棧棧樴橶檝殘殘毧浌淺淺濈熾牋牋狨琖琖盞盞碊碊祴筏箋箋絨綫綫織绒膱臧艥茙茷菚菚蕺虥虥虦虦蟙蠽裓誡諓諓識诫賊賤賤贼踐踐軄輚輚醆醆錢錢閥阀霵餞餞馢馢駥駴㑘㖑㘍㘺㟞㟞㣝㣤㣤㥇㥇㩬㭜㳦㹽㹽䄾䎒䎒䏼䏼䗃䗃䘬䙁䙁䣹䤦䧖䧖䯷䱠䱠䴼䴼𠈋𠒲𠒲𠞵𠲎𠲦𠵖𠵖𠽈𠽈𠽤𡃰𡃹𡊸𡍌𡍌𡑌𡑠𡓥𡯰𡸚𡸚𡸤𡾠𢂵𢈽𢈽𢑟𢟟𢡠𢥇𢧖𢧗𢧗𢧧𢨖𢫨𢬩𢬿𢯆𢯆𢳴𢴠𣂧𣂧𣂿𣄞𣉝𣑡𣛔𣮏𣮏𣴛𣼸𣽚𤇰𤈪𤖆𤖆𤖞𤞫𤷃𤷃𥂥𥂥𥅩𥅯𥊬𥋏𥑳𥑼𥖘𥖙𥗜𥟥𥟥𥢧𥩱𥬪𥵃𥵃𦄩𦈻𦈻𦋈𦋈𦕧𦠾𦨷𦸘𦹋𦺿𦻝𧂁𧇑𧊕𧑬𧗸𧗸𧝊𧟀𧮺𧮺𧶤𧶤𧸉𧹹𧻪𧾂𨀳𨀻𨎡𨎵𨏖𨏖𨠤𨠰𨱿𨵊𨵊𩋋𩋋𩤊𩤊𩦤𩪻𩯈𩯋𪀚𪀵𪁫𪇯𪇲𪏊𪏊𪘪𪘪𪙻𪩔𪭔𪭔𪭕𪮮𪸬𪸶𪸶𪼞𫂽𫇣𫍎𫑠𫑠𫒞𫓤𫙺𫤶𫳉𫻶𫻸𫻸𫼂𫼑𬉢𬗕𬥭𬩰𬫍𬫣𬫿𬭋𬲚𬳎𬷟𬷟",
 "尗": "俶傶嘁婌寂惄慼慽掓摵椒槭淑琡督磩縬菽裻諔踧蹙錖鏚顣㗤㞝㾥䗩䙘䠞䱙𠗼𠴫𡄱𡠽𡹧𡻕𡻷𢃝𢉌𢖌𢛼𣈉𤂔𤟏𤠽𤨟𤬂𥀻𥁽𥉷𥓍𥚔𥟧𥺤𥺱𥼀𦄉𦈚𦟠𦪊𦸗𧇝𧐶𧞰𧡕𧫳𨇌𨧷𨺏𩖑𩥼𩾈𪔯𫃬𫖹𬆷𬟄𬭭𬴈",
 "⺼": "俷廫淝筋簲荕萉葄葋蘎蜰褜遯霢㴯㶀䈈䈻䔕䳮𠐋𠸾𡄯𡅘𡏠𡐐𡝞𡬰𢲰𢴎𢷁𢺎𣻽𤊯𤋧𤶡𤷂𥬾𥴤𦜴𦞾𦡩𦢴𦢼𦳍𦸌𦸍𦼳𦽇𦾕𧀬𧁳𧃇𧅕𧌳𧓖𧠿𧲝𨃆𨧠𨭏𨭒𨵐𨼉𩧣𪃻𪡿𪱘𪱢𪷄𪷗𪺦𫅝𫆻𫇁𫉖𫉡𫉳𫊖𫌎𫕰𫬤𫵬𫺲𬈝𬉎𬐵𬛙𬛝𬛟𬛡",
 "巴": "俷梔淝潖筢萉葩蘎蜰㛂㯄䈈𠈊𠴙𡜮𡝞𡭍𡭐𢬯𢯓𣚒𤷂𥖖𥰗𥺕𦓝𧁳𧌳𧑡𧓖𧱒𨁩𨌌𩷴𪪔𫉇𫉳𫏒𫽶𬇫𬒏𬡞𬯮",
 "电": "俺剦匎唵崦庵掩晻殗淹痷硽罨腌菴裺醃閹阉餣馣鵪鹌黤㛪㞄㡋㤿㪑㭺㷈㽢䁆䄋䅖䎨䛳䣍䤶𠺄𠻒𡩯𡯸𡹛𢊊𢍤𢔂𢞷𢲅𢽱𣃾𣄑𣣚𤗎𤩃𥦩𥯃𦁏𦋙𦑎𦖈𦜽𧌄𧼎𨂁𨉚𨌧𨜀𨤕𨺍𨽅𩃗𩅝𩈯𩋊𩓹𩗷𩤔𩸆𪪅𪿬𫂑𫇌𫈸𫍫𫦐𫳑𫸽𬱨𬲼𬳡𬶖",
 "虍": "俿儢劇勮勴唬嘑嘘噱噳婋嫭彪憈懅戯掳摅摢摣擄據攄椃榩樝櫖歑歔淲滤滹澞澽濾爈猇獻琥璩甗甝皻箎罅臄艣萀蔖藘虒虓虝號虠虢虣虤虤虥虦虨虩虪裭覤覰覷觑諕謯謼譃躆遽醵錿鏬鐪鐻鑢驉魖鯱鰬鱋鸆齇㓺㗔㙈㙤㜘㠊㢒㢚㦆㨜㨿㩀㪥㯉㯫㯭㷾㻯䁦䆽䖊䖋䖌䖎䖐䖑䖓䖔䖕䖖䖘䖚䖛䗂䝞䟊䠡䬌䰧䲐䶥𠋵𠢍𠣊𠥶𠭯𠽁𡃖𡄼𡅗𡑾𡒞𡣭𡦨𡳆𡻻𡼆𡾅𢈶𢏯𢜜𢢛𢣧𢣿𢧶𢨘𢮎𢰵𢹁𣀞𣊑𣖳𣣍𣬁𣱤𤃔𤓤𤓤𤗭𤚳𤢓𤬝𤷡𤹣𤺞𤺿𤻱𥋖𥌠𥏽𥔮𥕕𥖼𥜅𥜜𥱲𥱿𥲉𥳠𥴧𥵂𥶌𥽜𦁲𦉑𦖖𦢚𦢛𦩕𦪡𦼫𦾚𧀴𧆡𧆢𧆦𧆫𧆬𧆯𧆰𧆶𧆷𧆸𧆹𧆻𧆼𧆽𧇅𧇈𧇉𧇊𧇌𧇍𧇎𧇐𧇑𧇒𧇓𧇙𧇚𧇛𧇜𧇝𧇞𧇟𧇡𧇢𧇤𧇥𧇦𧇭𧇮𧇯𧇰𧇱𧇶𧇷𧇸𧇹𧇻𧇿𧈄𧈅𧈆𧈇𧈈𧈊𧈋𧈌𧈍𧈐𧈙𧈜𧓻𧗌𧝲𧬷𧭜𧮽𧲋𧴘𧸾𧹁𧹂𧽐𧾧𨂜𨂶𨄥𨄪𨎶𨔛𨕑𨘮𨙊𨛵𨛸𨜻𨝘𨝹𨞙𨞦𨟭𨩜𨪝𨵘𨻲𨼫𨼽𨽚𩁋𩆱𩌲𩕷𩤌𩤾𩦢𩦶𩯜𩴥𩺇𩾇𪂬𪆛𪆺𪇦𪇸𪋬𪍸𪏐𪑷𪓐𪕽𪖸𪘰𪙫𪙿𪚊𪛌𪛔𪝭𪞣𪦒𪩽𪯟𪷓𪹣𫇛𫊠𫍹𫓺𫘌𫜐𫧰𫨡𫬲𫳔𫷽𫻖𫻺𫽯𫾹𫿋𬉜𬋵𬔑𬞲𬟪𬟬𬟭𬟰𬟲𬠦𬢆𬤀𬤙𬪣𬬚𬮗𬯷𬶬𬹜",
 "处": "倃偺喒揝晷櫜糌綹绺鯦麔鼛㰶㹾䓘䛮𠴰𡅦𢜥𣓌𤷑𥢑𥮑𥻀𦜵𧖼",
 "有": "倄喐堕崤椭殽淆誵郩随餚髄㮁㮋𠴳𡺆𢛘𢜹𣹙𤃽𤉶𤎦𤐳𤚁𤷤𦳉𦳩𦵁𧼡𨔳𨡜𩡏𪘱𪝘𫨖𫾼𬗤𬳁",
 "夗": "倇剜啘婉帵惋惌捥晼椀涴焥琬畹睕碗箢綩腕菀葾蜿豌踠鋺鵷黦㤪㱧䑱䗕䘼䛷䝹䡝䩊䩩䯛䵫𠞚𡟃𡫦𡮄𡸥𢏿𢮘𢱽𣫼𣸱𤗍𤟊𤧌𤷧𥔙𥟶𥧉𦺲𧩷𧯳𨉝𩈱𩎺𩣵𩪝𩸩𩸪𪂦𪂭𪋅𪝔𪲤𬓅𬜶𬳞𬶝",
 "公": "倊倯傟凇嗡崧嵡庺慃捴暡棇淞滃滚焧瞈硹磙総菘蓊蓘蜙螉鎓鬆㟣㥖㨣㨰㮬㺋䈵䐋䐥䓗䘴䙂䜇䩺䱵𡍻𡨭𡹳𡻐𢃓𢃪𢔋𢛒𣕙𤌏𥕀𥯆𦒥𦫫𧌻𧛹𨜺𩃭𩄘𩔚𩡓𩮬𩸝𪁿𪄑𪠎𪴱𫃄𫕎𬊼𬓵𬙺𬫱𬭩𬸔",
 "古": "個倨做兙兛兝兞兡兢兢兣凅剋剧勀勊啹喖夁娔婟婮媩嫴尅崌崓崮据棝椐楛楜橭殑氪涸涺湖煳猢琚瑚痼瘔祻稒箇箶糊腒艍菇葫蜛蝴衚裾踞醐鋴鋸錮鍸锢锯餬鬍鯝鰗鲴鶋鶘鶦鹕㑬㗅㣨㧽㳳㴌㾰䅕䉐䋧䍛䐻䓢䔯䛯䝻䠒䩴䭅䭌䱟䵕𠒐𠒘𠒙𠒚𠒠𠒭𠒲𠓈𠓎𠔴𠗌𠳭𠴱𠵎𠽿𡇤𡈅𡍄𡎁𡞯𡟁𡨢𡹍𡹹𢉢𢉽𢚛𢛅𢜃𢡇𢭪𢯐𢰮𢰴𢱗𣎏𣒖𣞴𣤅𣼨𤉸𤋹𤋼𤙥𤥣𤭱𥂰𥔓𥚑𥟾𥢍𥯶𦁿𦣶𦱅𧃗𧃵𧍏𧍵𧛂𧛞𧛫𧬕𧶮𧹕𨐞𨐡𨑀𨑀𨛮𨡱𨡷𨬕𨬟𨶽𩀉𩋜𩤅𩧽𩹜𩹬𪂯𪍒𪐉𪕮𪕱𪝍𪣕𪦭𪿩𫀲𫁦𫆣𫊐𫎵𫐦𫗫𫛷𫧱𫮆𫱬𫳫𫵦𫶶𬀌𬃱𬄮𬅂𬇾𬕛𬖢𬰦𬱆𬲾𬶞",
 "立": "倍倿傡傡傽僮剖勏勭唼啦喅噇婄媇嫜嶂帹幛幢彰徸慞憧掊接撞敨新暜暜暲曈朣棓椄榇樟橦殕毰氃涖涪淁湇漳潼焙煜熤燑獐獞琣璋瓿疃瘴瞕瞳碚稖穜竷箁罿翣艟莅菈菨菩蒟蔁蕫蟑親賠贑贛赔赣踣踥蹱遧部郶鄣醅錇鏱鐘锫陪障霎鞛鞡餢騿鯜鱆鷑麞㒘㖣㜔㟝㠉㢓㢺㥉㪗㰴㼿㾦䂌䃥䆹䈉䈮䋨䌱䍌䎧䏽䗑䚒䝑䞳䡴䤗䦣䨧䫓䬏䭚䮵䯽䳝䴀䴺𠊔𠍭𠐥𠑖𠟍𠣭𠮒𠴖𠴹𠹪𠼀𠾈𡃠𡈠𡈩𡓆𡝰𡞘𡟄𡦜𡯳𡯷𡰒𡰕𡸏𡾵𢒷𢔆𢕔𢖜𢜡𢟰𢥔𢥺𢥿𢨒𢮏𢯛𢵾𢷒𢺆𣄛𣄢𣊂𣊹𣙫𣚍𣫡𣮍𣸭𣺄𣺄𣽢𣾾𤀆𤀆𤅏𤅏𤉿𤗈𤗏𤗟𤨼𤩔𤬃𤷟𤺄𤻨𥇒𥎟𥏡𥕞𥟣𥡪𥪇𥪢𥪮𥪰𥪰𥪵𥫂𥫊𥫋𥫋𥫎𥫑𥫒𥫓𥫔𥫕𥫖𥱆𥱱𥲰𥳘𥳲𥴰𥵣𥵪𥼕𦁉𦅅𦅹𦌜𦒍𦔛𦩜𦲷𦺎𦺑𦽚𦽴𦾸𧌃𧑆𧗛𧘂𧚪𧝎𧞖𧩕𧫱𧬤𧱙𧳛𧷯𧸌𧹄𧹉𧼺𧽣𧽴𧽿𨂖𨅀𨅁𨙏𨝯𨣒𨨧𨰊𨶤𨶻𨿦𩀩𩃜𩅈𩌬𩍅𩔻𩕆𩕉𩦍𩸬𩻑𩻒𩻡𪅂𪆏𪋚𪋟𪑗𪝯𪞬𪟍𪠙𪡳𪢄𪩒𪭂𪷊𪷥𪼂𪿻𫁪𫁪𫁯𫋬𫍭𫍼𫎪𫎬𫑕𫕴𫜂𫝿𫠒𫤴𫥔𫫌𫮷𫲨𫻙𬂄𬄘𬈢𬈣𬉙𬋹𬍶𬎗𬔧𬔫𬕅𬠏𬠗𬡣𬧈𬧈𬬂𬮸𬶜𬹰",
 "至": "倒偓儓剭喔媉嬯幄懛捯握擡椡楃榁檯渥潌箌箼籉緻腛腟膣菿薹螲鰘齷龌㒗㗌㗧㘆㨖㬜㬜㮹㰉㴛䌂䏄䞃䠎䦯𠊷𠋤𠕥𠟅𠴼𡍶𡎔𡟹𡲃𡳽𡹭𡻜𡼄𡽩𢅣𢯶𢰗𢰙𢲼𢸩𢸰𢸰𣜉𣼉𤁅𤌆𤗿𤢬𤸓𤻡𥉺𥓫𥓬𥟽𥠽𥡫𥧊𦇢𦇢𦟔𦢡𦢢𦥉𦥐𦳙𦻢𧌼𧍱𧎜𧛐𧛢𧩼𧭏𧼤𨂤𨆧𨊆𨍀𨘲𨜘𨟕𨟕𨵱𩄌𩋡𩋩𩠭𩦽𩹈𪃮𪑱𪒴𪙜𪧧𪧧𪵓𪶌𪸽𫇂𫍶𫒷𫔵𫘴𫥫𫶉𬂿𬄰𬐖𬛶𬛶𬛷𬛷𬦶𬪱𬸟",
 "火": "倓倓偢剡剡咴唙啖啖啾婒婒媝恢悐惔惔愀愁扊扊拻掞掞揪揫搣敥敥晱晱梑棂棪棪楸樮欻欻歘毯毯氮氮洃淡淡湫湬滅烣烾烾焱焱煍煔煔燄燄燅燅燊燚燚燚燚琰琰甃痰痰盔睒睒瞅篍緂緂脄腅腅舕舕荻菼菼萩蔊蕿薠蝵裧裧覝覢覢詼談談诙谈谈賧賧赕赕踿躞躞逖郯郯醈醈醔錟錟錽鍫鍬锬锬锹鞦顃顃颷颷飈飊飚餤餤鬏鰍鳅鳚鶑鶑鶖鹙㑞㓕㞀㡑㥕㥕㦪㦪㬃㮡㰔㰔㲜㲜㲭㷇㷋㷋㷖㷠㷠㷥㷥㸑㻏㽊㽊㾭䆦䆦䊏䊏䋺䎦䎦䎿䐐䑞䑞䑹䓎䕰䗊䗊䗏䢠䤇䤹䨂䩳䬒䮟䯼䵸䶴𠊌𠊌𠋢𠌻𠌻𠑄𠑄𠙦𠙦𠜓𠝬𠟡𠢸𠩹𠩾𠪛𠪛𠮍𠷃𠸞𡀕𡀕𡄕𡄕𡐩𡐩𡐼𡐼𡓢𡓧𡟊𡢴𡥻𡨶𡨼𡨼𡪶𡪶𡬖𡬖𡳈𡳈𡳉𡳉𡺘𡼷𡽤𡽤𡽽𡽽𢃔𢃔𢃸𢉘𢉘𢊝𢊝𢊽𢙹𢜦𢠡𢠡𢣴𢣶𢣶𢧾𢴵𢶃𢹊𢹒𢹒𢹙𢹙𢻟𢻟𢽻𢽻𣂈𣂈𣃌𣃌𣄡𣉖𣓳𣓳𣝎𣝎𣞖𣞖𣡿𣨬𣨬𣯅𣯅𣶷𣶷𣺗𤃨𤃨𤇾𤇾𤈹𤈹𤈺𤈺𤉕𤉞𤉞𤉭𤊼𤊼𤊽𤋆𤋆𤋦𤌜𤌜𤍘𤍢𤎚𤎢𤎢𤎥𤎥𤎫𤎫𤏞𤏞𤐕𤐕𤐗𤐥𤐥𤐪𤐪𤑂𤑂𤑇𤑓𤑓𤑖𤑖𤑶𤑶𤑹𤒀𤒀𤒂𤒐𤒞𤒞𤒧𤓅𤓅𤓕𤓕𤕉𤟇𤟇𤡗𤡗𤢙𤢯𤢯𤧐𤧦𤪃𤪏𤪏𤫉𤫉𤭰𤯇𤯇𤯵𤯵𤰀𤰀𤲩𤲩𤳩𤳩𥇃𥇏𥌌𥌌𥍆𥍆𥎤𥎥𥔉𥔍𥤎𥧸𥨤𥭓𥭳𥰲𥵐𥶒𥶒𦂎𦄅𦆡𦆡𦋎𦋎𦋴𦋴𦌓𦌓𦒪𦒪𦖠𦖠𦛡𦤠𦦨𦦨𦧿𦧿𦨄𦨄𦩗𦩗𦫟𦫟𦭹𦲌𦲌𦳼𦴔𦼐𧂒𧃬𧃮𧄣𧅃𧅊𧅊𧅡𧅡𧇸𧌚𧎐𧕊𧕊𧟼𧡣𧤙𧱉𧷂𧷼𧼃𨀡𨁹𨁹𨆌𨆜𨆴𨆴𨉒𨌹𨌹𨍊𨏏𨏏𨒭𨓌𨔮𨖉𨖉𨖤𨖤𨗄𨞇𨞧𨞧𨞴𨞴𨟏𨟏𨡲𨤁𨤁𨤮𨤮𨦗𨧿𨧿𨨢𨪘𨪘𨬄𨬄𨭼𨷐𨷡𨷡𨷹𨺹𨽃𨽃𨾄𨾄𩉅𩎃𩎃𩎑𩒏𩓺𩕶𩕶𩕼𩕼𩖋𩖋𩖖𩖖𩗹𩗹𩙜𩙜𩙪𩙪𩝋𩩧𩩧𩰟𩷎𩸥𩸥𩹔𩹤𩼄𩼄𩼩𩼩𩽬𪀬𪂈𪂈𪂸𪃩𪆅𪆈𪉧𪉧𪍗𪏂𪏋𪏋𪑀𪑓𪑓𪕠𪛁𪝲𪧏𪧖𪨆𪱓𪱓𪲄𪲗𪴍𪶆𪸂𪸂𪸲𪹀𪹂𪹌𪹑𪹑𪹝𪹝𪹰𪹲𪹺𪺃𪺯𪺯𪿙𫆉𫐵𫒽𫒽𫓸𫓿𫜴爨𫨈𫨐𫫎𫫎𫫏𫬆𫴍𫴓𫷴𫸢𫸢𫺞𫺞𫾠𫾠𫾠𫿥𫿫𬀓𬀙𬀯𬆡𬉒𬊇𬊇𬊐𬊟𬊦𬊦𬊴𬊽𬋆𬋓𬋓𬋗𬋘𬋚𬌴𬎶𬏙𬏙𬔓𬗼𬘏𬘴𬞨𬡤𬡤𬢽𬫞𬫟𬫨𬫨𬮕𬳠𬵢𬸖𬸖",
 "出": "倔啒崛崫掘曓淈煀窟糶誳镼鶌㞊㬥㬧㭾㱁㻕䄐䓛䘿䞷䠇䳳𠑔𠜾𠞀𠡰𠶯𠷅𡅜𡮍𡰇𡺴𢏷𢱝𢱞𢿆𣖠𣙸𣣃𣨢𣮈𤋿𤟎𤭽𤺅𥇣𥏘𥚋𥛁𥜱𥨒𥪊𥮝𥺷𦁐𦃒𦜇𦿎𧌑𧑎𧸆𨜿𨧱𨱊𨵡𨻍𨾀𩋎𩓦𩣹𩤓𩭪𪍾𪓾𪘳𪛐𪥕𫍮𫛵𫵀𫵢𬘼",
 "冋": "倘僑勪嘺嬌屫嶠徜惝憍撟敞敽敿槗橋淌燆獢矯礄穚簥緔繑绱耥蕎蟜譑趟趫蹻躺轎鋿鐈鞝鞽驕鱎鷮㗬㝯㠐㢗㫾㭻㲂䀉䊑䎗䚩䠀䢪䣊𠙪𠶤𠿕𠿻𡁗𡖹𡗑𡝣𡞀𡭿𡮢𡮵𡮶𡰑𡰘𡹫𢄹𢉒𢌏𢐟𢕪𢡭𢮐𢻒𢻤𢿽𣀏𣋈𣎃𣔲𣕄𣤙𣥺𣦎𣦛𣪽𣮜𣯹𣹔𣾷𤙽𤩝𤷛𤿼𥊢𥊣𥊰𥋊𥋤𥓡𥳦𥼱𦃣𦈹𦉘𦑽𦒓𦪞𦫢𦰱𧄳𧍮𧑼𧒩𧨲𧩡𨇊𨌩𨜂𨝰𨡔𨣛𨩮𨲭𨿰𩅌𩗵𩯘𩼝𪁺𪄘𪍷𪟶𪢡𪽄𫖦𫙥𫡡𫣹𫦙𫨋𫨛𫱪𫻹𬆅𬓚𬓮𬕒𬡾𬴬",
 "可": "倚剞哬啊娿婀婍寄屙崎嵜彁彁徛戨戨掎攲敧旑旖椅樖欹歌歌渏渮滒滒猗琦畸痾碋碕綺绮荷菏裿觭謌謌踦躸輢錒錡鎶鎶锕锜陭騎骑鵸齮㗿㚡㚡㞆㟢㢊㢌㢦㢦㥓㱦㾨㿲䄎䋪䐀䓫䔅䔅䗁䛴䝝䩭䫑䫯䭲𠔵𠖏𠥍𠵇𠶚𠶾𠹭𠹭𡚎𡟵𡟵𡹣𢚨𢥳𢥳𢥳𢥳𢬲𢰤𢽽𣂦𣒍𣘁𣘁𣘠𣚂𣝺𣝺𣣱𣵣𣶰𣾏𣾐𤘌𤜊𤜊𤠙𤠙𤦺𤭻𤭻𤯱𥇚𥏜𥔎𥟏𥮆𥰮𥰯𥰯𥺿𦂭𦍉𦖊𦱕𦶒𦺞𦽅𧎺𧎺𧨂𧪆𧬱𧯓𧼘𨓾𨜅𨝆𨝆𨪆𨵅𨵌𨵎𨵤𨼼𨿫𩆺𩳣𩸞𪃴𪃿𪃿𪢦𪢦𪥘𪱊𪲾𪷹𪸴𪹽𪻇𪻸𫈥𫐎𫕖𫛌𫛌𫫀𫮄𫮍𫯽𫰄𫰄𫱖𫳵𬁭𬃪𬐣𬞐𬞢𬤐𬤐𬥛𬮮𬮰𬯜𬯣𬯩𬷤𬸠𬸠𬺈",
 "⺆": "倜凋啁奝婤彫徟惆晭椆淍琱皗睭碉禂稠綢绸翢蜩裯調调賙赒輖週郮錭雕霌騆鯛鲷鵰㓮㚋㟘㨄䎻䓟䞴䧓䯾𠵁𠶰𡕄𡕐𡥱𡦝𡮚𢃖𢛇𢽧𣍼𥏨𥮐𥺝𦈺𦩍𧇟𧞴𧮻𧯼𧳜𨂊𨉜𨡑𩈮𩋙𩗪𩞺𩟨𪏎𪸼𫐏𫛲𫮀𬋬𬎹𬏳𬛅𬭕",
 "𠮷": "倜凋啁奝婤彫徟惆晭椆淍琱皗睭碉禂稠綢绸翢蜩裯調调賙赒輖週郮錭雕霌騆鯛鲷鵰㓮㚋㟘㨄䎻䓟䞴䧓䯾𠶰𡕄𡕐𡥱𡦝𡮚𢃖𢛇𢽧𣍼𥏨𥮐𥺝𦈺𦩍𧇟𧞴𧮻𧯼𧳜𨂊𨉜𨡑𩈮𩋙𩗪𩞺𩟨𪏎𪸼𫐏𫛲𫮀𬋬𬎹𬏳𬛅𬭕",
 "龷": "借剒厝唶庴徣惜措斮棤焟猎瘄皵矠碏稓耤腊蜡諎趞踖逪醋錯错鵲鹊齰㛭㝜㟙㪚㳻䄍䇎䜺䧿䱜𠒮𠝖𢃟𢒻𢧉𣈏𣊣𣊣𣋄𤦘𤿸𥺮𦁎𦝙𧃫𧛊𧹨𨛳𨯆𩊿𩤈𩭡𩼫𩽫𪏈𪝌𪣤𪴮𫀥𫎯𫗸𫜬𬟀𬣾",
 "曰": "倡唱娼晿椙淐焻猖琩菖裮誯錩锠閶阊鯧鲳㫀㫯䅛䗉䞎䮖𠭒𡩦𢃑𢔒𢛝𢛽𢮵𣉑𣊦𣊫𣊫𣋎𣎇𣣘𣮑𤬆𥓥𥚕𥜩𥫅𦅩𧶧𨍆𩎿𩩪𩩫𪂇𪉨𪛋𪣧𬕑𬗡𬸶",
 "攵": "倣做傚僌僘儆剺勶厰啓嘋噋堥墪婺嫠嫩嫳孷嵍嶶幣幤廠弊彆徶愍愗慗慜慦憋憗憝憞憼懲撆撇撉撴擎擏擞擻整斃斄晵晸暋暓暼暾曔棨楘橔檠櫢氂氅溦滧漖漦漵潄潋潎潡瀓瀪瀲燉犛獘獙獤璥瘷癓癥盭睯瞀瞥矀礅籔籢綮緻繁繺肇荍蓛蔲蔹蔽薇薮藢藪蘞蝥螫蟞蟼襒覹譈警蹩蹾遫鄨釐鍪鐅鐓鐜镦闙闝霚霺霿鞪騖驐驚骛鰵鱉鳖鳘鶩鷘鷩鷻鹜鼈龞㜫㟩㠞㡔㢢㢣㢸㤵㨖㬠㬿㮘㮹㯳㴛㵟㹈㻻䁈䃝䃦䈣䉠䉤䋷䌘䓮䔩䔻䜼䞃䠥䢟䢩䥕䥩䦯䨁䨆䪃䱯䲄𠄹𠈅𠈹𠍁𠍏𠍢𠍯𠎄𠐍𠒳𠓎𠔷𠙟𠝸𠟈𠢪𠦩𠧂𠭰𠭷𠮆𠲠𠳛𠶣𠹣𠻳𠼚𠽊𠿼𡄨𡌼𡏯𡏴𡐞𡒱𡔖𡚁𡝶𡟁𡠼𡡬𡡹𡤇𡥮𡦤𡫄𡮋𡱙𡻶𡼖𡾄𢄞𢄡𢄯𢅑𢅸𢆧𢋻𢌐𢍸𢎓𢐧𢕡𢕣𢚓𢟤𢟻𢠂𢠛𢠳𢠵𢢌𢢩𢨓𢰞𢰴𢲆𢲳𢳯𢶞𢶱𢷸𢸑𢾘𢿂𢿄𢿍𣀚𣀟𣀴𣀽𣁛𣁟𣁢𣇻𣈕𣊶𣌎𣘬𣘮𣙙𣚿𣟺𣦤𣮙𣯷𣰉𣰒𣱂𣱔𣷫𣻪𤀂𤁲𤃏𤅶𤊦𤎨𤏮𤏰𤑈𤒥𤒦𤓩𤙘𤛎𤢄𤣙𤨣𤨨𤮕𤷠𤸓𤺓𤺲𤻺𤼹𥂦𥅪𥋆𥋗𥋧𥍚𥐈𥓴𥖻𥘂𥠽𥢭𥨅𥨇𥨧𥨺𥩂𥪛𥯍𥲯𥳆𥵴𥶄𥼖𦀏𦁼𦇆𦌉𦒐𦒚𦗥𦗸𦘇𦜍𦟔𦠞𦥐𦦢𦩚𦪔𦲲𦳙𦷥𦾡𧁎𧁱𧅐𧌱𧐭𧑒𧒀𧒰𧛉𧛢𧝋𧝗𧝟𧝬𧢍𧢓𧢡𧩼𧫣𧷍𧸁𧸮𨂤𨅢𨇂𨟃𨣟𨤸𨨦𨫾𨬊𨭝𨯃𨰈𨰺𨱖𨷋𨷢𨻖𨽮𩃝𩄧𩋩𩐎𩕣𩖅𩘄𩙉𩜢𩜫𩞕𩠰𩡡𩥹𩦉𩪵𩮸𩴰𩷊𩸳𩹈𩺾𩻪𩼃𩼌𩽋𪂜𪄴𪄺𪅗𪅙𪅶𪆃𪆝𪉾𪍓𪍘𪖄𪛆𪜚𪝅𪞫𪢒𪣴𪤓𪦚𪧤𪧮𪪉𪫎𪬆𪮫𪯊𪯕𪯛𪯞𪰱𪱃𪳞𪻯𪾜𪾰𪿂𪿥𫂙𫄃𫄿𫅵𫆃𫆈𫈚𫉦𫋿𫌭𫍶𫏭𫒺𫓡𫔵𫛿𫜁𫣫𫥏𫫤𫮆𫱻𫲈𫳴𫴟𫶦𫷫𫹢𫻍𫾛𫾰𫿇𫿕𫿟𫿨𬀐𬂸𬃈𬃥𬄎𬋃𬍉𬎕𬗳𬚧𬠹𬢓𬤣𬥦𬥧𬧶𬫁𬭯𬳛𬸫",
 "穴": "倥僒啌噾崆悾挖控揬搲搾撺攛曌椌榨涳湥溛漥潌焢焪瑏瞾矏硿箜腔膣葖藭螲谾蹿躥躻醡鑹镩鞚鵼鶟鼵㗧㙀㟮㡧㨓㩈㲁㴏㴭㵠㸜㺠㻠㾤䃐䅝䆪䏄䓖䛪䠚䠻䡻䫵䰓𠏅𠓯𠞀𠟶𠠖𠤊𠴛𠸂𠹁𠻩𡀙𡁮𡃕𡑛𡑣𡡃𡲀𡸕𡹗𡹝𡺴𡻜𡼄𡼿𡾈𢈵𢛙𢝀𢞲𢢒𢤪𢭕𢮍𢰃𢲼𢶺𢽦𣄐𣇬𣈞𣑒𣒔𣔻𣛱𣞌𣫝𣵇𣶆𣹧𣿈𤀢𤀨𤗇𤟄𤟪𤢶𤲏𤷿𥈹𥈾𥉺𥎣𥓰𥖚𥡫𥤿𥦚𥧖𥨜𥨬𥩌𥩌𥩌𥯝𥰾𦂽𦔅𦝬𦞭𦡆𦢴𦩤𦫪𦲄𦲎𧂜𧔚𧛗𧮡𧸺𨃍𨇶𨡗𨨀𨨷𨩴𨬃𨻴𩀆𩣼𩭴𪆥𪍂𪔣𪙜𪣞𪥔𪶉𪷚𪽱𪿜𪿲𫁎𫁔𫁛𫁜𫕂𫛕𫦐𫫍𫫳𫮪𫯸𫸣𫽵𬄔𬉬𬑸𬔋𬔌𬔔𬔕𬜖𬪟",
 "示": "倧倷僸凚凛噤婃孮崇崈廪徖悰捺棕歀淙渿澿猔琮碂籞粽綜综腙萗萘蒜蒜蘌蘏襟誴賨賩踪錝錼隸騌鬃鯮齽㖠㞊㦗㩒㮈㮏㯲㱁㱈㲡㴎䄐䌝䑸䝋䫴䱞䳳𠢱𠢵𠵻𡑲𡞏𡞫𡢾𡰇𡽿𢃏𢿆𣋜𣛒𣜩𣦅𣮤𣮦𣰙𤐖𤭽𤷈𤸏𤺅𤻎𥇧𥈡𥊨𥋴𥖜𥚋𥚢𥛁𥜱𥢻𥨒𥪗𥽍𦃒𦈟𦝀𦡞𦤗𦤧𦳐𦽔𦽣𦿎𧑎𧛮𧸆𧹆𧹆𨆃𨛱𨜿𨣤𨭺𨯣𨲇𨻍𨾀𩈫𩈶𩖗𩜪𩴚𩹟𪃚𪇎𪊅𪎏𪑨𪞥𪥑𪨼𪮗𪷤𪷿𪻦𫄊𫆕𫉿𫎉𫐱𫑾𫓽歲𫩀𫮁𫲃𬄷𬄷𬆸𬓖𬓛𬘼𬜏𬝺𬦓𬴚𬷝𬺔",
 "臼": "倪匶唲嚿婗嫍幍慆掜搯晲棿槄檓欍毇淣滔熖燬猊瑫睨稻縚腉萖蓞蜺觬誽謟譭貎蹈輗轁郳阋霓鞱韜韬饀鬩鯢鲵鶂鶃麑齯㗖㘀㜒㩓㪒䈱䋩䘽䤾䥣䦧䧟䮘䵚𠆔𠋯𠒯𠒰𠓔𠚘𠚡𠞞𠥒𠥪𠧇𠩫𠮐𡒂𡙊𡞭𡢕𡢶𡥲𡩹𡮅𡸢𡸣𡺫𢏱𢲓𢶙𣣉𤓁𤔥𤔱𤕄𤠈𤦤𤨐𤷅𤻏𤾆𤾇𥉰𥓋𥔿𥧹𥵓𥸋𥼹𥽂𦆘𦦃𦦌𦦨𦦿𦧃𦩊𦩹𦽐𦾩𧀜𧒺𧝘𧝷𧡎𨇲𨗔𨢝𨵹𨶒𨷕𨺙𩥅𩥓𩹴𪅉𪅎𪓬𪕨𪹗𫀗𫃈𫐐𫐰𫒪𫠜𫻻𫽍𬀖𬀢𬃤𬄵𬈍𬎸𬒧𬘺𬚁𬩚𬯤𬳊",
 "比": "倱偕勓哔喈婫媘媲尡崐崑悂惃掍揩梐棍楷混湝焜煯狴猑琨瑎磇稭窤筚箟緄绲膍荜菎蒈蜌蜫蝔螕裩諧谐貔跸輥辊醌錕鍇鎞锟锴陛階餛騉鯤鲲鵾鶛鹍龤㙄㡙㮰㾬䃂䃈䅙䊐䏶䐊䚠䛰䠘䡡䯗䵪𠈺𠍈𠐚𠝕𡅛𡥵𡺓𢃚𢔡𢝷𢾆𣈀𣓋𣖰𣙹𣬑𣬒𣬖𣬗𣮎𣸢𣽙𤑎𤙞𤨱𤭧𥆯𥇊𥍾𥏪𥚛𥚺𥟠𥯡𥻄𦀘𦂄𦃋𦓼𦝨𦞉𦠺𦰙𦳈𦴢𦼘𧑜𧔆𧖈𧖎𧚻𧧺𧪫𧱟𧳢𧳧𨉉𨜡𨬌𨯥𨿪𩀊𩊰𩋧𩘅𩘗𩤠𩭭𪂳𪄆𪇾𪉔𪋆𪌽𪍜𪡓𪢬𪪼𪱫𪹩𪽥𪾘𫈋𫎝𫎳𫔇𫖒𫘥𫙰𫤠𫦻𫧉𫬌𫯬𫱦𫴕𫴾𫵫𫼣𫿅𬆺𬉖𬉱𬍹𬙝𬙠𬛨𬠃𬤷𬦸𬧨𬪈𬪰𬲡𬵝𬹋",
 "卉": "倴偾僨喯喷噴幩愤憤捹橨歕渀濆燌獖翸膹莾蕡蟦豮豶轒逩錛鐼锛隫餴饙馩鱝鲼黂㱵㿎䒈䩿䫙䴅𡅊𡍋𡼝𢊱𢜘𢴢𢿠𣮡𣯻𣸣𣽑𣾘𤖘𤗸𤢫𤩳𥀢𥖀𥚙𥢊𥳡𦜭𦡛𧎔𧴍𧶭𧷐𨁼𩀴𩟲𩣺𩦥𩧼𪎰𪑖𪒰𪔭𪔵𪖅𪩸𪮓𪰫𪱥𫅗𫔁𫗌𫦃𫬩𫯩𫷱𬅫𬏷𬓱𬨀𬳟",
 "目": "倶偗傄匴匷匷厢叡壡媚嵋廂忂忂想愼懼懼戵戵攥楣槇欋欋氍氍渺渻湄湘湨濉濬灈灈煝爠爠猸瑂璿癯癯睸瞁矍矍箱箵篃篎緗緲缃缈臞臞葙葿蔝藈蝞蠷蠷衢衢躣躣郹郿鎇鎭鑺鑺镅闃闅阒霜顚鶥鶪鷆鸜鸜鹛鼳㔍㗂㘗㘗㜀㜹㜹㨘㩴㩴㪫㬬㬬㮐㴐㴭㷡㼳㾪䂂䂂䈍䗈䚇䜜䠐䦩䰨𠋝𠋥𠋬𠏻𠐗𠞔𠪃𠷯𠷹𠷾𠸦𠹆𠺍𠽗𡈟𡋕𡙍𡙵𡚝𡚝𡞙𡞞𡡆𡡮𡡻𡥰𡦐𡨽𡩏𡩒𡭌𡮠𡸽𡺗𡻗𢃼𢉧𢊟𢌄𢌄𢎖𢎖𢔰𢜫𢢰𢢰𢮭𢯤𢰲𢰺𢲏𢸥𢾔𣀔𣃍𣃖𣃖𣈲𣊕𣎊𣒨𣓭𣕦𣕻𣙧𣝶𣠹𣦉𣪦𣫑𣮮𣰍𣰚𣰧𣰽𣰽𣵼𣸜𣹴𣼹𣽪𣾉𤀤𤁨𤂳𤋀𤐘𤒪𤚤𤜕𤣓𤣓𤦚𤧇𤫀𤭪𤶇𤷐𤷼𥆗𥇋𥇛𥇛𥇾𥈧𥈾𥉦𥊟𥋑𥋜𥋹𥌏𥌑𥌙𥍅𥎡𥎡𥗫𥗫𥚵𥧑𥨬𥪧𥳪𥶊𥷯𥸖𥻠𥻡𦎨𦔄𦔬𦔬𦝳𦞖𦠙𦫭𦰲𦱋𦳗𦳥𦺊𦽉𧁊𧁰𧄒𧄒𧆏𧍖𧛰𧝴𧡮𧢩𧢩𧯕𧱸𧳬𧶑𧷁𧽀𧾕𧾱𧾱𨉭𨌶𨜜𨜯𨟠𨟠𨢻𨩢𨪵𨮰𨰉𨰭𨲓𨵥𩀎𩁯𩁯𩄎𩅹𩉗𩉗𩉘𩉘𩋿𩐲𩔠𩟹𩟹𩧘𩧘𩧚𩧚𩮌𩯔𩵅𩵅𩹪𩽩𩽩𪂼𪃐𪃥𪃦𪃧𪄊𪄊𪄙𪄙𪅚𪈱𪈱𪒂𪓆𪓆𪓆𪖏𪖏𪘟𪝋𪢂𪦓𪧯𪬊𪮑𪮒𪯽𪱐𪳐𪳐𪵟𪶛𪸹𪻻𪾱𪿁𪿃𫃷𫆦𫍂𫐹𫗗𫛹𫝛帽𫣵𫫍𫬣𫳤𫵆𫵇𫺻𫼀𫿊𫿊𫿛𬃞𬋭𬍃𬑝𬑩𬑪𬑪𬑫𬕇𬖇𬖇𬗫𬞝𬤧𬤧𬥅𬥅𬥇𬧆𬬏𬬝𬭧𬭾𬮃𬯳𬴮𬴷𬸙𬸱𬸱",
 "龶": "债傃債勣唛啧嗉嘖嫊嫧帻幘愫憲榡樍歵渍溸漬瑇皟瞔碛碡磧積箦簀縤績繛纛绩耫膆蔶蝳螦襀謮賾赜蹟鰿麸麹麺㣱㥽㨞㱴㺓䋤䓯䘘䚍䛾䟄䥊䶦𠉩𠒾𢃶𢍣𢍵𢝂𣕬𣤈𣫵𤀝𤖓𤗮𤚚𤠚𤢘𤳎𤹠𤿲𥎍𥟀𥡯𥪣𥱨𥼃𦃅𦅫𦅻𦆾𦇚𦟜𦣱𦺇𦼆𧀘𧐐𧔄𧛔𧵷𧶷𧷤𨀱𨅫𨌐𨖊𨢦𨦎𨫺𨲪𨹧𨺮𩄾𩌪𩔥𩔳𩹝𪄸𪌛𪎈𪎉𪎊𪎋𪎌𪎏𪎐𪒑𪟝𪯑𪯛𪰸𪽂𪾵𫌀𫖴𫗙𫘁𫜑𫜒𫜓𫜔𫜕𫧮𬉄𬍞𬗪𬗾𬝚𬠶𬫵𬵡𬶡𬹅𬹆𬹇𬹈𬹉𬹊𬹋𬹌𬹍𬹎𬺉",
 "央": "偀媖愥暎朠楧渶煐瑛碤緓绬蝧醠鍈锳霙韺鶧㡕㢍㲟䁐䊔䚆䣐䦫䭊𠹃𡎘𡾗𣉗𣖮𣺻𤠉𤭹𤮃𤸡𥍼𥠚𦔃𦴊𦴤𦾇𧪪𧯀𨍞𩘑𩘕𩤯𩹅𪃳𫙬𫬡𫵄𬚡𬝣𬝱𬢑𬤔",
 "妟": "偃愝揠椻蝘褗躽郾隁鰋鶠鼴㰽䞁䤷𠸯𠻈𡏉𡪻𡹶𣈿𣯄𣹐𤦵𥈔𥉛𥍻𥔌𦖧𦶳𧓱𩀀𪦈𫚢𬥺𬸘",
 "而": "偄偳儒剬喘嚅圌媆媏嬬孺嶿惴愞懦揣擩曘椯檽歂渜湍濡煓煗燸猯獳瑌瑞瓀碝礝稬穤端篅糥糥糯緛繻腝腨臑薷蝡蠕褍襦諯譳貒踹輭輲轜遄醹鍴鑐陾隭顓顬颛颥餪鱬㐡㓴㙐㟨㨎㪜㬉㮕㹘㼲㼷㽭㿵䇕䓴䙇䝎䞂䞕䨲䫱䫱䰑䰭䰭䰰䳪䵎𠟺𠣉𠧍𠷀𡁓𡞾𡽏𢐰𢝶𢟄𢡵𣖃𣮼𤐱𤟦𤟮𤧋𤮵𤲬𤸂𤻪𥀫𥀭𥈇𥌎𥎘𥐎𥔖𥔗𥚻𥜗𥠄𥤃𥯬𥻁𥻟𦈡𦓗𦓙𦓚𦓛𦓜𦓝𦓞𦓟𦓣𦖩𦗂𦦇𦵓𦾳𧄨𧍒𧓐𧔇𧞕𧭌𧶲𧼴𨍥𨨰𨷘𩀋𩄋𩆊𩆟𩍥𩠊𩤚𩪰𩱄𩴶𩹓𪃉𪋐𪋣𪋣𪋯𪎱𪏩𪝥𪝥𪴠𪷌𪹅𫍱𫏧𫗜𫗬𫪱𫳟𬘰𬢽𬥻𬥼𬩗𬲗",
 "并": "偋幈摒竮箳蓱㶜㶜䔊𠝭𡟛𡳧𢔧𣖕𣸹𤋊𤧅𤭸𥧋𥰅𦂤𦉇𦉐𦝷𧁕𧟁𧩱𧼲𨂲𨍍𨔧𪑰𪨚𪨛𪶜𫵥𫵨𫶈𫺬𬖪",
 "右": "偌匿喏婼惹掿楉槗渃睰箬蠚諾诺蹃逽鄀醢鍩锘鰙㐛䖃䖃䖃䤀𠌁𠙏𠥤𠳈𡈉𢉳𦂍𦃣𦑽𦴈𧍗𧍷𧛭𨵫𪄘𪲴𪴰𪻷𫇜𫈈𫭔𫲩𫳌",
 "户": "偏傓僱匾呝唳啓啟媥徧悷惼捩揙搧斒晵棙棨椖楄槴淚淭滬焈煸煽熩牑猵甂睙砨碥稨篇簄糄綟綮編编翩肇艑萹蔰蜧蝙褊諞謆谝豟蹁軶遍錑鍽阸顧騗騙騸骗骟鯿鳊鶣㑦㓲㞈㧖㨭㪐㲢㴜㻞㼐㾫䁈䈆䐔䓞䡢䡪䥇䦂䭏𠞛𠪂𠶶𡙤𡝢𡸒𡹫𡺂𡻮𢄒𢉞𢐃𢩙𢩙𢩚𢩝𢩟𢲙𢻠𣂋𣐖𣕄𣘼𣙅𣚩𣝜𣩀𣶉𤟑𤡵𤨖𤬊𤺇𤺮𥓎𥔱𥚹𥣝𥰢𦅺𦑗𦑮𦜏𦶋𦽃𧍮𧎥𧡤𧩈𨁸𨉕𨌋𨖠𨧒𨩮𨲜𩗭𩴄𪉱𪏗𪓎𪖯𪤆𪰨𫄫𫆈𫋈𫍸𫑐𫕌𫴟𫼑𫽒𬀐𬃐𬎁𬚇𬚫𬢰𬩢𬭜𬸜𬸸",
 "𠕁": "偏匾媥徧惼揙斒楄煸牑猵甂碥稨篇糄編编翩艑萹蝙褊諞谝蹁遍鍽騗騙骗鯿鳊鶣㓲㞈㲢㴜㵸㻞㼐㾫䐔䡢䭏𠪂𡺂𢉞𢐃𢩚𢩟𣝜𣩀𣸎𤬊𤺇𥚹𥣝𦑮𦖥𦳋𦽃𧡤𨖠𨲜𩴄𪉱𪏗𪓎𪖯𫂜𫕆𫕌𫨘𬡫𬩢𬸜𬸸",
 "产": "偐剷喭摌楌滻簅虄諺遃鏟隡顔颜齴㦃㯆𠦳𢞆𢢋𢱘𢵲𣸥𤯿𦞎𩩷𪦎𪬸𫄔𫍓𫜮𫤢𫫹𫯙𬂑𬊰𬖄𬛝",
 "彡": "偐厖哤喭嘭娏媭嬃庬惨憉抮掺昣曑椮楌殄毵毶沴浝浵涁渗滮澃澎灪烿爩狵珍甏畛疹痝瘆盨眕硥碜簓糁紾翏胗膨蓚蕦蛖蟚蟛袗診诊趁跈軫轸遃鉁鎀霦頾顔颜飻駗駹骖鬚鯵鲹黪齴㙙㟌㟥㡎㤶㱶㴳㹋䂦䅟䇓䏵䖇䝩䤯䪾䵨𠃩𠎎𠦳𠬊𠱉𠻝𠾫𡂵𡌑𡐐𡐶𡛧𡞋𡟞𡣏𡪇𡯀𡳔𡿥𢄼𢅛𢊼𢌝𢒷𢞆𢟅𢢋𢣪𢱘𢵓𢵲𢺴𣌌𣒡𣘀𣙓𣛪𣭕𣸥𣺫𤀍𤁀𤂖𤇪𤒙𤓮𤙁𤡭𤨤𤨽𤪱𤺬𥂑𥆙𥈌𥒱𥓸𥕱𥕽𥘄𥘼𥛱𥛻𥨡𥮾𥱤𥳗𥶩𦄼𦅈𦅓𦗭𦞎𦤜𦥋𦪟𦭏𦸔𦹮𧀔𧈇𧐸𧜺𧠝𧠿𧨘𧬶𧱓𧱦𧳑𧷠𨅑𨅘𨎧𨨕𨬗𨭌𨱅𨴸𨿙𩃋𩅺𩒉𩒹𩒿𩓾𩔾𩩷𩬖𩭒𩭹𩷙𩷲𩻬𪁒𪁪𪆦𪐲𪓊𪓫𪠟𪠡𪦎𪧉𪫈𪫊𪬟𪸹𪹡𪹫𪻴𪾔𫁇𫄵𫌟𫎺𫕨𫖜𫖬𫙯𫚩𫜮𫡦𫢗𫢺𫤯𫫹𫮅𫴜𫶅𫷈𫹊𬈄𬈥𬊰𬌷𬍮𬐐𬑖𬓪𬗲𬗹𬘝𬘳𬚬𬛝𬠡𬢳𬤄𬥞𬧌𬩃𬫕𬭝𬭵𬯊𬱬𬳯",
 "世": "偞勚勩喋媟屟屧弽惵揲楪殜渫煠牃牒碟緤艓葉蝶褋諜谍蹀鍱鞢韘鰈鲽㻡䁋䈎䐑䑜䚢䢡䭎䮜𠗨𡳙𡺑𣙝𣽒𤺔𦲉𧸊𧽅𨤘𩐱𩔑𪃸𪍐𪑧𪽴𫄬𫌣𫖷𬃯𬙾",
 "酉": "偤奠媨尊崷揂楢湭煪猶猷盦禉緧蓜蘸虋蝤蠤趥輶遒鞧韽鰌㜝㥢㱃㷕䔯䖆䠓䤋䨄䲡䲤䳺𠄁𡆖𡞜𡯾𡲚𡺚𢉷𢍜𢲭𣘞𣜃𣜙𣣫𣮩𣻦𤄍𤋃𤸈𥂘𥂝𥂰𥕼𦖣𦝱𦟊𦩲𦳷𦵩𦾹𧂯𧃗𧕪𧫧𧮒𧳫𨗕𨘭𨜟𨡡𨡳𨡴𨢅𨢈𨣡𨩊𨺧𩆑𩔕𩮈𩻕𪃬𪍑𪓰𪓵𪡧𪡭𪳝𪶪𫂘𫅉𫇓𫑸𫜟𫫛𫬞𫱓𫳼𬀎𬋕𬘶𬜂𬨎𬪓𬯖",
 "廴": "健徤揵旔楗毽湕煡睷腱踺鍵键鞬騝鰎㯬䊕䭈𠸻𡩌𡺅𢉆𤧣𥍹𥯦𦂩𦞘𦡐𨵭𨺩𩨃𩱃𩱤𩻥𪑼𪰷𫁀𫘳𫮑𫸕𬂹",
 "聿": "健堻嵂徤揵旔楗毽湕潷煡睷箻腱葎葏蕼踺鍵键鞬騝鰎㯬㻶䊕䭈𠷈𠸻𠽩𡩌𡺅𡼸𢉆𢖀𢯰𢴩𣕖𣹕𤀷𤏫𤔯𤢇𤧣𤺭𥍹𥯦𦂩𦂻𦞘𦡐𦩨𦽷𧍶𨅗𨖷𨬾𨵭𨺩𩨃𩱃𩱤𩻥𪑯𪑼𪫓𪫚𪰷𪴅𪻃𫁀𫄂𫆧𫘳𫮑𫴜𫸕𬑷𬚬𬢅𬴟",
 "多": "偧嗲橠熪簃謻㒅㢋㿐䃎䋾䐒䔟䵙𠗺𠝓𠞎𠼪𡏗𡻣𢄴𢡏𢴐𣔢𣘵𣻗𤄮𥟻𥪫𦠸𦰿𦽭𧐹𧚤𧛧𧩀𧩫𧳤𨄼𨎭𨖨𨷎𩘖𩮅𪂄𪅨𪦕𪮟𪵌𪷔𫒬𫦗𫪥𫺲𫽎𬓟𬘲𬲢",
 "此": "偨喍嘴橴蟕㖢㗪㾚㾹䓱䔝䠕𠉃𠟓𠹂𠽷𡍥𡎵𢉪𢋀𣒽𣓄𣖧𣖨𣖲𣚀𣚁𣣊𤠌𤺒𥈐𥓽𥲕𦶉𦸺𦺱𧩢𧭽𨄐𨝳𪑽𪘿𪪀𪬰𪳠𫄕𫙾𬈶𬎏𬠭",
 "彳": "偫勶哘嘥垼屣履屩崻嵂嶶惩憄懲暀桁洐漇澓瀓烆珩癁癓癥矀禦筕箻篽簁絎縦縰绗胻荇葎蒣蓗蓰蓹蕧薇藢衍衎衏衐衑衒術衔衕衖街衘衙衚衛衜衝衞衟衠衢裄褷覹讏蹝銜霺鴴鸻㜫㞜㠅㠞㤚㵌㵟㿅䀪䉠䓈䓚䓳䘕䘖䘗䘘䘙䚘䟰䡓䥏䥩䨱䯒䰢𠉫𠒣𠖊𠗤𠥌𠪍𠳩𠶎𠷈𠻀𠾑𡤇𡭑𡮌𡲰𢇌𢉟𢊚𢒩𢒲𢔐𢔖𢔬𢔮𢕁𢕅𢕊𢕋𢕵𢖀𢖅𢖋𢖍𢖡𢙡𢛛𢜢𢫱𢯏𢯰𢱜𢲛𢳜𢷸𣆯𣇭𣉹𣊗𣌎𣒃𣔓𣔥𣕖𣘊𣘩𣙝𣛝𣤳𣨖𣯪𣰒𣶂𣷭𣹕𣺺𣻄𤀵𤁲𤈧𤋵𤑈𤚟𤥞𤲵𤶣𤷮𤸭𥆛𥆜𥊂𥓳𥛨𥞧𥨍𥨑𥯂𥯼𥰦𥱰𥳇𦂻𦃀𦅑𦋕𦗸𦘇𦞒𦨵𦪂𦲵𦹼𦻀𦾡𧃸𧄇𧊔𧊽𧍶𧒰𧗝𧗞𧗟𧗠𧗡𧗢𧗣𧗤𧗥𧗦𧗧𧗨𧗩𧗪𧗫𧗬𧗭𧗮𧗯𧗰𧗱𧗲𧗳𧗴𧗵𧗶𧗷𧗸𧗹𧗺𧗻𧗼𧗾𧗿𧘀𧘁𧘂𧘃𧘄𧘅𧘆𧝩𧠅𧢓𧢡𧩺𧱕𧱷𧶱𧸮𧻥𨃉𨃝𨇂𨟃𨣟𨦯𨨨𨱖𨴠𨷋𨷢𨿒𩂹𩌦𩎶𩏃𩕂𩙃𩙉𩜔𩭔𩭬𩴰𩷍𩸵𩼌𩽚𪁛𪃝𪑯𪨳𪩵𪫓𪫗𪫚𪹘𪻃𪼊𪿂𫁧𫃮𫄳𫆎𫆧𫊏𫌭𫓍𫙚𫞋𫤎𫶛𫹦𬁊𬄧𬪳𬫑",
 "寺": "偫崻嵵榯溡蒔鰣㩐𠸤𠺮𡀗𡮲𡻄𢱜𣖖𣙦𣹘𣻞𤋵𤚟𤨅𤲵𤸟𥢜𥪸𥱯𥻣𥻵𦃀𦅯𦞒𦵟𧎋𧶱𨃉𨃌𨃯𨅸𨨲𨫉𨬻𩹭𪃝𪕵𪮛𪰰𫁧𫂨𫄋𫮨𫹦𬌦𬠟𬰈𬵣",
 "匆": "偬愡揔楤牎緫葱鍯騘㩀㷓㹅䆫䈡䗓𠡻𡟟𥈝𬤋𬭥",
 "囬": "偭勔喕圙奤媔愐湎糆緬缅腼蝒蠠靤靥靦靧靨麵麺㮌䤄䩂䩃䩄䩅䩆䩇䩈䩉䩊䩋䩌䩎䩏𠖪𠷰𠼟𡫍𢃮𢋏𢹙𣞀𣮻𣮿𣰔𤃨𤚛𤟯𥈅𥖊𥽯𦫥𦵀𧩤𧼸𨉥𨕂𨜧𨭫𨮮𩈃𩈅𩈆𩈇𩈉𩈊𩈋𩈌𩈍𩈎𩈏𩈐𩈑𩈒𩈓𩈔𩈕𩈗𩈘𩈙𩈚𩈛𩈜𩈝𩈞𩈟𩈠𩈡𩈢𩈣𩈤𩈦𩈧𩈨𩈩𩈪𩈫𩈬𩈭𩈮𩈯𩈰𩈱𩈲𩈲𩈳𩈳𩈴𩈶𩈷𩈸𩈹𩈺𩈻𩈼𩈽𩈾𩈿𩉀𩉁𩉂𩉃𩉄𩉅𩉆𩉆𩉇𩉈𩉉𩉊𩉋𩉌𩉍𩉎𩉏𩉐𩉒𩉓𩉔𩉕𩉖𩉖𩉖𩉗𩉘𩉙𩋠𩔁𩖋𩤤𩹠𪓱𫏔𫖀𫖁𫖂𫖃𫖄𫗖𫘏𫞑𬍵𬏶𬰠𬰡𬰢𬰣",
 "耳": "偮傇冣嗫囁埾娵娶媶慑懾戢掫揖搑摄攝最棷棸楫榵樷欇渳湒滠灄焣穁箃箿緅緝縙缉聚菆葞葺襵諏諿讘诹趣踙蹑躡輙輯辑郰鋷鍓鑷镊陬顳鯫鲰麛黀齱㒤㖩㝡㢽㣬㥝㱌㲨㷅㸎㻓㿴䁒䇀䌰䐕䐛䝕䠜䤊䩰䩸䯀䯅𠉧𠗜𠠨𠮊𠮋𠶻𠺨𠻕𡂩𡍲𡎎𡓳𡣞𡤙𡱾𡸘𡸨𢃣𢈾𢐩𢛏𢜱𢝉𢮝𢲻𢷗𢹸𣀳𣍇𣜒𣠞𣯏𣰼𣷗𣹼𣺌𤀳𤏱𤔛𤕖𤚉𤣒𤦟𤭡𤮱𥊁𥍉𥎂𥠋𥤋𥦡𥧖𥪏𥷨𦈙𦔋𦗶𦝒𦣀𦸤𧄢𧌗𧎣𧕩𧚥𧜮𧩞𧪇𧱛𨄒𨉴𨊞𨍷𨏴𨐉𨓭𨙓𨛿𨝢𨨹𨽦𩋄𩙝𩧁𩯍𩰆𩰆𩹫𩽪𪋄𪓯𪔪𪘸𪙘𪚀𪝫𪞔𪠱𪩝𪪚𪪿𪰅𪳍𪺐𫁓𫃂𫃇𫌇𫒅𫩉𫮣𫳛𬄿𬅆𬕻𬗂𬚩𬝞𬠪𬥁𬥄𬭞𬵺",
 "衣": "偯懷搇攐橠櫰滚瀤瓌磙耲蓘藵鎄锿㒅㒟㗒㜳㜵㠡㥋㨰㵝䃵䃶䕍䜇𠍡𠐦𠗪𠘠𠵱𡃟𡃩𡙤𡟓𡪭𡾝𡾨𢄴𢜺𢡏𢲙𢸣𢸬𣀤𣀩𣚸𣟊𣟋𣩹𣩻𣰐𣿞𤁆𤜄𤠆𤪿𤷴𤸖𥤂𦅞𦆪𦠸𦲤𧛧𧝘𧝦𧞷𧞼𧸄𨎭𨳀𨽖𩔝𩱘𩼆𪊉𪶦𫈮𫈶𫨝𫬍𫬳𫱹𬅗𬊼𬍠𬎊𬕞𬝗𬝻𬡭𬡲𬰏𬵹",
 "貝": "側偵傊債僋僨儨儩儹劕劗勛勣勩厠嗊嗿嘖噴嚽囋囎圎圓媜嫧嬰嬰寊實屭屭屭崱巑幀幊幘幩廁惻愩愪慐慣憤懫揁損摃摜攅攢曊楨槓樌樍樲橨櫍櫕欑歕歵殞測湞溳漬澬濆濵濺濽瀃灒灜熉熕燌燲獖瑻瓆瓉瓚甖甖皟瞔碵碽磒磧礥礩礸禎禶積穳篔篢簀籫籯緽縜績纉纘罆罌罌翸耫膩膹臔臢萴蒷蔶蕡薋藖蟘蟦蠀蠈襀襸謮謴譻譻讃讚豶賾贑贛赬趲蹟躓躦軉轒遉遦鄖鄪鄼酇鍘鍞鎻鏆鐨鐼鑍鑍鑕鑚鑦鑽闝隕隫霣靅靌韻饙饡馩鰂鰿鱝鱡鲼鶰鸎鸎黂㒃㘋㘔㜏㜱㜺㠝㣱㥽㦫㩌㩫㯽㰄㱴㱵㵅㵑㵒㸇㹑㺓㿎䁚䂎䆅䆬䈟䉯䊧䐣䑇䒈䔈䗰䚋䚍䜠䟄䟎䠝䡠䡽䥊䩿䫟䰖䴅䴍䴍䴐䶡䶦𠅳𠋏𠌗𠍥𠍦𠏱𠓒𠓕𠗧𠗸𠘖𠞖𠞿𠟒𠟓𠠋𠢋𠢥𠥘𠫍𠫍𠫍𠭹𠮆𠷌𠸩𠹚𠺯𠼚𠽬𠽷𠾚𠿹𡁩𡁪𡂐𡂒𡃄𡃋𡅊𡍫𡎖𡎞𡎴𡏯𡒻𡔈𡔈𡞩𡟫𡣕𡣶𡤐𡤧𡦫𡫄𡬂𡬔𡬔𡬙𡬷𡮷𡮺𡳠𡺢𡺭𡻃𡻖𡼝𡿍𢄙𢄽𢊱𢑊𢒟𢔤𢝔𢠈𢢥𢢾𢤞𢥎𢥮𢥿𢩛𢯩𢴢𢴧𢵉𢵚𢷤𢸒𢺔𢿃𢿒𢿠𣀶𣀹𣃇𣃐𣉇𣖡𣗼𣙿𣚁𣛸𣞥𣤈𣤉𣦓𣩔𣩵𣪁𣯻𣹟𣺠𣺪𣽒𣿐𤁩𤂐𤃋𤄧𤋺𤎽𤐾𤑄𤑄𤓎𤕙𤖓𤖘𤗤𤗮𤗸𤠔𤢽𤣣𤦹𤩳𤫖𤫞𤳎𤳢𤸘𤸫𤹠𤺔𤺕𤼟𤼟𤼟𤼹𤿀𥀢𥈿𥊫𥎍𥎞𥕫𥖀𥛌𥛍𥜤𥠉𥡯𥢅𥢆𥢊𥣪𥧡𥨇𥨐𥨨𥪩𥪾𥱷𥳡𥸜𥻱𥼃𥼻𥽷𦄗𦆯𦈆𦑰𦔐𦟜𦠻𦡛𦢆𦢆𦣱𦩼𦪸𦫅𦫮𦵄𦹳𦺱𦽒𦿜𧀘𧀩𧃛𧄞𧄽𧅤𧆍𧍡𧐐𧑈𧒿𧓳𧜘𧜙𧝂𧝇𧢘𧪼𧫇𧬂𧭾𧮣𧮣𧳷𧴍𧶃𧶊𧶏𧶒𧶷𧶸𧶹𧶹𧷐𧷝𧷞𧷤𧷨𧷯𧷱𧸊𧸐𧸫𧸲𧹃𧹃𧹈𧹈𧹈𧹋𧹌𧹍𧹏𧽛𧾒𨃁𨆎𨇃𨉺𨏑𨐿𨖊𨘤𨘧𨙇𨜓𨝑𨝳𨟊𨢦𨣵𨤆𨫋𨰦𨰰𨲪𨲽𨳄𨶎𨶛𨺟𨽔𩀴𩄾𩆂𩆃𩌌𩌪𩍴𩍵𩎈𩐵𩑅𩔳𩟲𩦥𩧄𩪇𩫢𩫣𩮆𩯃𩯳𩵆𩹰𩹸𩼲𩽄𪃰𪄌𪄸𪇧𪍕𪎰𪏚𪑳𪒑𪒰𪔵𪖅𪚇𪝖𪡮𪡯𪢛𪦚𪦬𪨄𪫃𪬡𪬳𪬼𪭈𪭈𪭖𪮽𪯾𪰂𪱮𪳺𪴥𪷈𪷎𪷪𪹟𪹭𪺘𪻅𪼱𫁅𫂩𫅿𫉜𫋐𫎤𫎤𫑫𫖙𫖣𫗙𫘁𫘄𫚁噴幩憤濆𤠔𫣲𫣴𫧸𫨫𫬊𫬖𫬡𫳧𫴯𫺤𫻔𫽭𫾖𫿖𬄎𬋑𬋑𬍽𬎞𬓲𬖊𬗯𬘋𬚂𬛜𬜊𬜎𬝿𬡥𬢵𬥙𬥠𬥣𬥩𬥬𬥭𬥮𬥯𬧄𬯵𬯵𬳦",
 "龸": "偿鲿𧑽𪳯𬴞",
 "云": "偿囈恸曇橒澐繧蕓襼讛陰霒霕霴霼靅靆靉鲿䉙䨭䨺䨺䨺𡂃𡄬𢵆𢺐𣊯𣡊𣦀𣶽𣸊𤳟𤷜𥖅𥢚𦁌𦓷𦜲𦶮𧅟𧅟𧬞𨗠𨝽𩃠𩃷𩃸𩅝𩅣𩅾𩆦𩇔𩇔𩇔𩇔𩸜𪆚𪒝𫝚𫢙𫰼𫶮𫾓𬎌𬎬𬰎𬰨",
 "𦥔": "傁嗖嫂廋搜溲獀瘦瞍膄艘蓃螋謏遚鄋醙鎪锼颼飕餿騪㟬㥰㪢㮴㲣㵻䏂䱸𠪇𠭦𣯜𤔣𥕋𥰞𦃈𦣉𧳶𧽏𩌅𩨄𩨅𫌆𫍲",
 "虎": "傂嗁搋榹歋滮磃禠篪螔褫謕贙贙蹏遞饕鷈鷉鼶㔸㙱㡗㥴㴲㶁㾷䖙䚦䞾䫢䶵𡏚𢊀𢐋𢸗𣜍𣜵𤩭𧜺𧰑𧷠𨪉𨻆𩀗𩤽𪕻𪷢𫇉𫿈𬧌𬩃",
 "𡗜": "傄尞𠣻𠺄𡝻𡩯𢊊𢍤𢞷𢲅𨂍𨨆𨺈𪒂𪝄𪟉𪥚𪿬𫂑𫈸𫋾𫪖𬳡",
 "甫": "傅博圑愽搏榑溥煿牔猼磗禣糐縛缚膊葡蒪蒱蒲賻赙鎛镈餺髆㗘㙛㜑㬍䈬䈻䎔䔕䗚䙏䪙䰊䶈𠬕𠬖𡀨𡏋𢾭𣄎𣿀𤚽𤧵𤨳𤸵𥂈𥠵𥱴𥴾𦉊𦑵𦒊𦔍𦦐𦻌𧁔𧁳𧏳𧗉𧜿𧱹𧳵𧽬𨄳𨍭𨕝𨗗𩌏𩫯𩹲𩺼𪍡𪙍𪠑𪢜𪩉𪬬𪵐𫃾𫘒𫮝𫼁𬈩𬙤𬝟𬧅𬵦𬺏",
 "辰": "傉儂嗕噥媷嶩憹搙擃槈檂欁溽滣濃燶癑禯穠縟繷缛耨膿蓐蕽褥襛譨鄏醲鎒鬞鷐齈㦺㺜䁸䃩䞅䳲䵜𠘊𠢑𠸸𠺃𠺲𡢿𡫦𡭋𢐪𢖢𢟲𢤟𢸍𢾯𣊐𣋏𣯋𣰊𤂪𤡠𥵛𦗳𦵢𧏯𧓅𧗈𧢁𨃽𨆞𨐺𨑊𨯂𨲳𩀭𩅽𩱨𩺦𩼅𪆯𪇌𪑾𪒬𪞽𪡪𪢏𪧩𪫛𫆬𫋏𫑥𫓒𫕫𫜀𫣳𫧪𫫪𫯕𫳳𫽴𬉰𬋔𬌽𬍎𬛔𬞀𬢾𬩚𬫷𬭦𬷨",
 "具": "傎厧嗔嫃寘嵮慎搷槙滇瑱瘨瞋磌禛稹縝缜蒖衠謓蹎鎮镇闐阗顛颠鬒鷏黰齻㐤㒹㒹㣀㥲䈯䐜䡩𠁒𠔬𠔶𠖕𠤤𡂌𡈓𣉮𣞟𣯒𣰘𤛇𤠶𥛺𦗀𦗁𧜖𧰊𧷒𧽍𨈃𩄠𩥄𩨋𩺘𪗓𪵆𫷊𬜘𬹙",
 "羽": "傓傝傟僇剹勠嗡嘐噏噿嚁嫪嬆嬥寥嵡嵺嶍嶖廖慃慴憀戮戳搧搨摎摺擢暡曜榻槢樛櫂歙毾溻滃漝漻潝濢濯瀈瀚瀥瀷煽熠熤熮熻燿璆璻疁瘳瞈矅磖磟禢穋籊糴糶繆缪翫耀膠臎蓊蓼藋蘙螉蟉蠗蠮褟褶謆謬謵譾谬豂賿趯蹋蹘蹹躍轇遢鄝醪鎉鎓鏐鑃镠闒闟阘雡霫顟飁飂騸騽骟髎鰨鰼鳎鳛鷚鸐鹨㒆㒛㗩㠄㢞㦻㨣㩉㩣㪧㪬㬔㬛㮬㯓㲩㵤㺋㺒㺟㽂㿇㿑䁯䈳䈵䊮䌈䌌䌦䐥䐲䑽䒁䕜䚧䡪䢧䢰䥇䦂䩺䪚䰘䱵䴞䵏𠗽𠞛𠟊𠥦𠺏𡁕𡒔𡣝𡤖𡻐𡽢𢄒𢄪𢄭𢒥𢖈𢞠𢸄𣝦𣟇𣠜𣠼𣤊𣤩𣩍𣩰𣯥𣯮𣯾𣰅𤌏𤌙𤑱𤒩𤗨𤚺𤛊𤛣𤛹𤠐𤬥𤭼𤹀𤺼𤼌𤾫𥂔𥃃𥉗𥉾𥔓𥔱𥕀𥖮𥜔𥡪𥣞𥤌𥧯𥰢𥱵𥲿𥵳𦈖𦑗𦑬𦑼𦒆𦒣𦒥𦒰𦔫𦗖𦗗𦡱𦧱𦪙𦫫𦶋𦶑𦸚𧄍𧅈𧅛𧎥𧐔𧕼𧖢𧛹𧝅𧢋𧥋𧬈𧰂𧸭𧾰𨎰𨙒𨜺𨝫𨞩𨯪𨶪𩄘𩌭𩔚𩖇𩘷𩡓𩮬𩰙𩴹𩻵𪄚𪄶𪅡𪅲𪖷𪢄𪤆𪤗𪦞𪧴𪩒𪯖𪴱𪷊𪺀𪼜𫁩𫃙𫋞𫍖𫍸𫍿𫐖𫓚𫓢𫕎𫦼𫱐𫾉𫾒𫾥𬄘𬉥𬌇𬎁𬓝𬓵𬚇𬡳𬣑𬤕𬭩𬳉𬵩",
 "玄": "傗娹婱惤慉搐槒滀稸蓄誸鄐㗜㜅㡉㭹䙒𢛆𢮂𤛅𤠕𤳄𥲋𦃿𦱁𦿤𧁃𧏷𧹴𧼏𨃕𨕢𨧻𩃚𩹱𪮎𫈞",
 "谷": "傛壑嫆嵱彮愹慾搈榕溶熔瑢穃腳蓉螸褣鎔镕鰫㮝㮤㯴㼸䈶䡥𠁓𠊬𠌋𠍠𠑉𠶸𠸘𠹍𢊦𢔱𢜭𢿶𣘏𣤄𣩭𣫾𣯔𤪜𤷽𦃁𦃛𦗋𦞳𦢽𧍕𧐄𧕉𧢊𧯉𧾝𨉷𨍖𨤛𨲟𩔜𩘨𩘪𩮠𩻇𪃾𪠮𪬛𪼾𪿮𫃻𫍇𫚦𫤈𫫽𫮟𫯈𫶎𬁎𬅳𬠣",
 "⺤": "傜嗂媱徭愮摇暚榣滛熎猙猺瑶睜磘繇謡谣遥鎐颻飖鰩鳐鷂鹞䁘䌊䔄䠛䬙𠌀𣞿𣟾𤁠𨋻𨘺𨘽𪃴𪲾𫃭𫄾𫋜𫎈𫬽𬈬𬋶𬋹𬞢𬩡𬯒𬯙𬷤",
 "缶": "傜啕嗂嚹媱徭愮掏摇暚榣淘滛灪熎爩猺瑶磘祹綯繇绹萄蒛蜪裪謡谣遥醄鋾鎐陶颻飖騊鰩鳐鷂鹞㗸䁘䌊䔄䖇䛬䠛䬙𠊐𠏈𠶲𠷄𡍒𡯀𡿥𢔇𢺴𣞿𣟾𣡧𤁠𤓮𤫡𤫥𤭬𥂩𥓮𥘄𥮽𦃥𦻦𧎯𧨵𨂆𨌨𨘺𨘽𨶏𨸊𨼞𩋃𩯾𪌼𪓊𪿲𫄾𫑂𫘦𫦕𫫉𫱀𬐹𬤁𬧝𬩡𬯈𬯒",
 "⺶": "傞唴嗟嫅嵯嵳搓暛槎檨溠溬猐琷瑳瘥磋縒羗羼艖蒫蜣褨蹉醝錓鎈饈髊鱃鹺齹㛨㞉㳾㷢㽨㿷䁟䐤䑘䟀䡨䡭䰈䱹䴾𠊡𠻁𡠎𡬎𡬎𡬎𣍏𣘎𣩈𥀞𥇉𥓌𦅗𦍑𦏱𦏱𦏱𦑺𦒁𦟤𦪋𧇞𧎉𧪘𧪰𨉶𨢚𨬢𨲠𩘭𩸑𩹦𪁸𪅠𪉬𪉵𪙉𪚍𪞼𪢂𪮲𪲞𫅡𫶯𫶰𫶴𫸕𫹕𫹜𫺳𬁿𬍃𬖱𬘷𬚂𬝆𬧹𬩭𬯷𬶣𬺎",
 "言": "傠儲卛圝奱孌孿嶽巒彎徾戀揈攣曫櫧欒渹滸灓犫瞓矕罸羉臠蔎藷藹蘐蠩蠻變讟躞輷鍧鑾靄鞫鸑鸞㓃㘊㘘㘜㜃㡩㦪㪻㰔㱍㶆㽊㽋㾵䃴䆌䉸䊰䓽䔓䕛䕶䜃𠁙𠏩𠏬𠑄𠑕𠒷𠣈𠤌𠧐𠨫𠮓𠮖𠸥𠻂𠼯𠽆𡀗𡀲𡀵𡁹𡂂𡂉𡃑𡃘𡃝𡄕𡄗𡄧𡄫𡄾𡅷𡅼𡆙𡈭𡈰𡣛𡤣𡤨𡮲𡽺𡿣𢋀𢌕𢍶𢝁𢠇𢣸𢥃𢥑𢥢𢦄𢱏𢳘𢸛𢸠𢹆𢹒𢺀𢺈𢺲𣀵𣉤𣉸𣋾𣌆𣌈𣖟𣘄𣠖𣣢𣦱𣮴𣿉𤀏𤁳𤂂𤃵𤄅𤄲𤅇𤍋𤏣𤜈𤟼𤡈𤡖𤫉𤫜𤹽𤺒𤻭𤼙𤾟𥀺𥊜𥌥𥍆𥔀𥗟𥗻𥰇𥱬𥳅𥴜𥶏𥷚𥷤𥷴𥷺𥸄𥸝𥽸𦄠𦇥𦇷𦑟𦞍𦣋𦦽𦫲𦴩𦵗𦺞𦻑𧀀𧀣𧃈𧃓𧄲𧄶𧄹𧅰𧆂𧏛𧕊𧖦𧝨𧞆𧞮𧟏𧟗𧦕𧪄𧬦𧭚𧭻𧭽𧮌𧮎𨐷𨐾𨰼𨰽𨶃𨶡𩀕𩁓𩄊𩇅𩎃𩘇𩙜𩙟𩸔𩽀𪆿𪇻𪈮𪈽𪏡𪝮𪞴𪡡𪡴𪤜𪭇𪭇𪭗𪱓𪲼𪸂𪸅𪺂𫂮𫄋𫉚𫊂𫊂𫋨𫌗𫍍𫍕𫏥𫐒𫐝𫠻𫣄𫤋𫤍𫧬𫩎𫬃𫬛𫬺𫴥𫴪𫴪𫴪𫶪𫻓𫾗𫾠𬅜𬋠𬋠𬋠𬋷𬒘𬕱𬜄𬞖𬞛𬞷𬟤𬣌𬣎𬦿𬯨𬰊",
 "豕": "傢儫劇勮噱嚎嫁幏慁懅據榢檺櫫溕溷澽濠瀦煫燹燹璩稼篴籇臄蒙蓫蕤藸蠔譹躆遂遯遽邃醵鎵鐻镓隊霥鱁㠙㥞㥵㨡㩝㮯㯌㯫㴚㶙㷾䃍䆳䆽䟊䠔䥂䧫䮱䯟䴿𠐭𠦹𠺢𠽖𡀟𡐂𡐌𡑫𡟝𡣘𡩙𡺪𢄐𢄘𢉭𢒤𢔻𢜿𢡆𢴊𢵩𣋡𣌁𣌂𣔾𣠔𣺊𤂼𤋌𤐶𤒝𤢓𤢭𤨎𤪗𤸉𤹁𥉕𥜅𥠂𥢁𥴧𥻖𦂁𦞢𦟥𦪃𦪳𦵣𦼫𦿮𧇿𧏿𧔑𧝲𧞑𧥉𧬷𧭙𧰬𧱶𧱶𧱾𧱾𧲋𧲝𧲟𧲟𧴘𨄃𨍨𨍲𨎶𨗅𨙊𨞙𨞦𨢊𨪂𨮙𨰖𨰖𨺵𨼫𨼽𩁋𩅫𩅲𩆬𩔀𩔧𩙢𩙢𩝌𩥃𩮡𪅊𪆺𪍭𪍸𪑫𪙲𪞯𪳘𪳸𪷟𪿭𪿯𫋕𫎇𫑏𫔫𫔫𫖨懞𫲜𫸐𬂔𬎼𬛊𬤫𬥇𬩛𬰧𬵵𬷬",
 "𢦏": "傤儎嶻懴擮殱渽溨瀐瀻睵籖纎蠘襶賳鐡㩥㰇㵶䃱䕙䘁䘂䜟䟌䥫䰏䶪𠑀𠥠𠼷𡣳𡽱𢶪𣈻𣖋𣚸𣝫𤪚𤻛𥯒𥵞𥸔𦅞𦖱𦞁𦳦𧔒𧕾𧖡𧛷𧞛𧞬𧟖𧸄𨃭𨰕𨰸𨲹𨷠𩆧𩦷𩯶𩹯𩽅𪃘𪖋𪳾𫄇𫚂𬘹𬞛𬴋𬶸𬺕",
 "车": "傤匦啭堑崭恽挥撵晖暂梿椠浑涟珲琏皲莲裈裢裤诨辉郓錾链鲢𣍯𥇢𦈉𦈐𩧰𩽼𪡏𪣒𪨩𪮃𪸩𪿵𫅼𫆏𫎸𫏐𫏕𫗚𫗥𫝈𫝨𫢪𫪚𫷅𫽁𫾉𬆂𬊗𬌵𬏫𬑕𬒄𬕛𬘹𬞋𬣽𬤖𬧑𬰣𬱢𬲕",
 "兵": "傧嫔摈槟殡滨瑸缤膑镔髌鬓㺍𧏖𪬚𪾸𫅭𬄂𬇄𬝯",
 "讠": "储浒蔼霭𣶫𫉄𫞛𬏟𬸚",
 "者": "储儲嘟奲廜撦擆曙橥櫡櫧櫫潳潴濐濖瀦糬蕏薯藷藸蠩譇躇鐯鱪鱰鷵㒂㦋㵔㵭㶆䃴䊰䠧䣝䦃𠍽𠏲𠤆𠤌𠪡𠹲𠾏𡄢𡣈𡤊𡪦𡳢𡳣𡳤𡼞𢄳𢅔𢋂𢥃𢵋𢵻𢷷𣃑𣌁𣌂𣌆𣚫𣛭𣜾𣞍𣠖𣠶𤀞𤐢𤒠𤺈𤻃𤻔𥌓𥖛𥗁𥢳𥳉𥵟𦅁𦅷𦇃𦠏𦡄𦺥𦼥𧒇𧬅𧬥𧷿𧸓𧹼𧺂𧺃𨅓𨅮𨇛𨇜𨗊𨟞𨣍𨮿𨶶𨼑𨽉𩅻𩼁𪋰𪢆𪦜𪱂𪱅𪳼𪴄𪹶𪻊𫉄𫊔𫞛𫧬𫬕𫰂𫶳𬁑𬄞𬄫𬍆𬍍𬍎𬙅𬛒𬟅𬟋𬟜𬠩𬤜𬦃𬦄𬦼𬩅",
 "隹": "催僬僱凖凗劁匯匷嗺噍嚁嚯囄嫶嬥嶉嶊嶕嶣嶻巀巂廱忂愯慛憔懼戳戵携摧撨擢擮攉攡曜曤榫槜槯樵櫂欋氍準漼潍潐潗濉濯濰瀖灈灉灕熣熦燋燿爠犨犨犫犫獕璀璡癄癨癯癰皠皬瞧矅矍矐磪磼礁礭穕穛篗籊籗籬糴糶繀罹羅耀膗膲臛臞舊蒦蓶蓷蕉蕥薙藋藺藿蘺蟭蠗蠘蠷衢襍謢譙讐讐谯趭趯躍躙躣軅醮鎨鎸鏙鏶鐎鑃鑺镌雁雙雙雧雧雧靃靃靍顦顧鶽鷕鷦鸐鸖鸜鹪㑺㒛㒧㒿㔼㕠㗱㗹㘗㘜㘜㙫㜠㜹㝦㠍㠎㢑㨦㩁㩴㪬㬬㰌㰚㱋㲬㵶㷪㸈㸈㸌㸕㺘㺟㺢㻪㿑䂂䆶䉜䉮䊮䌖䌦䍦䐪䑾䕌䕙䗯䗽䘁䙰䜃䜅䟌䢰䥫䧹䨇䨇䨥䩌䮶䰏䳽䴞䶪𠌱𠍱𠐶𠓃𠔟𠠛𠥔𠧐𠧐𠧑𠻘𠿅𠿲𡃦𡄸𡆛𡆛𡒔𡓘𡓱𡙜𡙬𡙸𡚝𡠓𡢦𡦓𡦠𡰋𡺾𡻎𡻛𡽛𡽢𡽱𡾃𡾜𡾧𡿎𢄺𢊄𢊛𢋒𢋗𢋘𢌄𢌈𢎖𢕘𢖈𢡫𢣘𢥗𢦄𢧵𢨘𢲜𢵸𢶘𢶾𢷿𢹬𢹭𢻠𣃖𣄥𣉲𣋭𣌏𣛎𣛜𣜫𣝤𣝫𣟶𣟼𣠜𣡀𣤚𣤩𣤹𣩑𣩰𣯍𣯧𣯯𣰽𣻰𣼎𣼲𤁢𤂶𤃭𤄔𤄛𤄩𤄬𤌞𤍐𤍳𤐰𤒏𤒏𤓪𤓪𤓪𤓬𤓬𤓬𤗯𤛍𤛹𤜅𤡵𤣅𤣓𤣕𤪚𤫔𤮯𤮲𤸰𤹆𤺮𤻕𤻛𤻮𤻵𤼡𤾫𥌍𥎡𥗫𥛭𥛲𥜔𥣞𥣩𥤙𥨦𥲱𥳟𥴛𥴢𥵞𥵻𥸌𥸌𥸔𥻬𥼂𥼚𥽥𥾀𦅃𦈜𦉎𦉥𦌐𦌴𦒧𦒰𦔬𦗠𦞠𦞾𦡱𦢖𦢺𦢻𦣳𦪉𦸏𦹏𦺴𦻗𦼉𦾔𦿐𧀣𧁪𧂴𧃀𧃼𧄄𧄒𧄝𧄰𧅈𧅛𧐌𧓷𧔷𧔿𧕮𧕺𧕺𧕾𧖝𧖝𧖡𧝈𧞛𧞤𧞩𧢠𧢩𧥅𧥋𧭭𧮋𧮛𧰤𧰤𧸛𧸭𧽟𧽠𧾄𧾕𧾢𧾱𨄍𨄤𨏦𨖵𨗑𨘾𨝱𨞂𨞩𨟓𨟠𨤹𨫻𨬶𨭽𨯟𨱓𨲹𨶄𨶊𨶲𨷫𨸋𨻵𨿈𨿞𩀝𩀟𩀟𩀱𩀱𩁗𩁯𩁴𩁴𩁴𩁵𩁵𩁵𩆀𩇈𩇈𩇥𩉗𩉘𩌩𩏘𩏢𩏷𩕷𩟦𩟯𩟷𩟹𩠳𩦷𩦼𩧏𩧘𩧚𩮴𩯰𩯷𩱶𩴹𩵅𩹹𩽀𩽕𩽩𪄩𪄼𪅓𪅥𪆄𪆅𪆐𪆔𪇦𪇻𪈲𪈲𪒊𪖀𪖋𪖏𪛂𪜤𪟻𪟻𪠕𪧾𪨅𪩐𪯩𪯰𪳙𪴳𪶫𪷐𪹯𪺇𪼌𪼛𪽢𪾷𪾻𫃗𫃙𫉬𫉯𫊆𫋗𫋝𫓙𫔓𫕱𫘂𫚂𫡍𫤄𫤑𫦼𫨡𫫊𫾥𬄕𬋈𬋕𬋜𬑠𬑥𬓏𬔀𬖇𬖈𬖈𬗿𬞓𬞼𬟢𬟤𬣑𬣓𬤱𬥱𬯰𬯷𬵧𬷩𬷯𬸰𬸱𬺕",
 "タ": "傯幒憁摠樬漗熜牕璁窻總蔥蟌謥鏓驄骢䡯𡠴𡾳𦪐𧁗𧃿𧄉𩕄𪺠𬓔𬯗",
 "朋": "傰剻嘣漰磞繃蒯蹦鏰镚䙖䣙𡡈𢐒𦷛𨻱𪮤𫅛𫮙𬄡𬄳𬞉",
 "品": "傴僺剾劋匲嘔噪奩嫗嬠嶇幧彄慪懆摳操敺樞橾歐毆氉漚澏澡熰燥璪甌癌瞘矂繰缲膒臊蓲襙謳譟貙趮躁軀鄵醧鏂鐰饇驅髞鰸鱢鷗㩰㬽㿋䆆䆰䉱䌔䙔䡱䧢䩽䳼䵲𠄾𠢔𠥷𠥹𠥺𠥺𡩾𡬿𢄠𢕓𢤁𢷯𢻥𢿛𢿾𣀉𣂻𣉾𣋝𣎥𣜣𣞃𣩛𣰕𤛐𤠾𤢖𤹪𥕥𥖨𥱸𥼾𥽹𦗵𦾈𧒮𧬌𧴜𨄅𨯫𨽣𩀫𩔸𩙈𩙰𩟎𩯟𪍻𪍽𪠯𪤢𪴋𫉞𫑧𫚫𫥛𫧜𫧭𬇅𬤠𬤨𬵸",
 "音": "傹億噫噷噾嬂嬑嬜幟憶摬旘樈樴檍滰澺熾燱獍璄癔竸竸糡織繶膱臆薏蟙識譩軄醷鏡鐿镜镱鷾䔔䖁䗷䪰䭗𠽪𡅙𡑌𡑠𡪟𢋆𢡠𢣇𢥫𢴠𢶶𢶹𣄞𣋚𣚮𣩜𣽚𤃷𤢛𤺵𤻐𥋏𥋵𥜇𥢧𥵆𥵗𥸜𦺿𧝊𧫙𧮍𧸉𧹹𨮈𩁈𩍖𩯈𩯵𪅑𪤥𪬫𪱍𪷰𪼞𪼦𫁈𫄷𫉮𫔪𫕼𫘃𫤶𫧶𫲭𫵋𫶪𫻎𬠧𬥭𬧎",
 "釆": "僁僠勫噃噢嬏審嶓嶴幡憣懊播擙旙旛橎潘澳燔燠璠皤磻礇窸繙翻膰蕃薁蟋蟠襎襖譒蹯轓鄱鏭鐇鐭隩飜鱕鷭㗭㜩㠗㢖㣰㴽㸋㺕㽃䆺䉒䉛䊝䊩䐿䜒䪛䪤䮳䴈𠆇𠞹𡅵𡒃𡚘𡡁𡪿𡫘𢐠𢐲𢑵𢴑𢿥𣊩𣋉𣡉𣤡𤄜𤎕𤗹𤳖𤳗𤳛𤳺𤺏𤺾𥕿𥛮𥢌𦄵𦪖𦸝𧂵𧑪𨄠𨅴𨊃𨊄𨎒𨞓𨰪𨶸𨼠𩀷𩇾𩈀𩐏𩕏𩨏𩼈𪖇𪴃𪼣𪽡𫔍𫳴𫿓𬅱𬋚𬌌𬏎𬏓𬏔𬏗𬙆𬛐𬸪",
 "辶": "僆儙叇哒嗵嗹噠噵嚃嚺嬘導慥慩挞搥摓摙撻撾擿旞曃槌槤槰樋橽檖檛檤櫏櫣漣漨澻澾濄瀢煺熢熥燧燵璉璡璭璲瓋瞇磀磓礈禭穟篴篷簉簻籧糙縋縌縫縺繨繸繾缒缝缱翴腿膇膖膼荙菦蒁蒾蓪蓫蓬蓮蕸薖薘薳藗藡蘧螁蟽蠭褪褳襚謎謰譢譴讁讉谜谴跶蹆蹥躂躚轋醚鎚鎹鏈鏠鐩鐹鐽鑓闥闧闼随隧靆鞑韃韆韼餸髄鬔鰱鱁鶐㒓㗓㗻㘏㜆㜕㡝㣵㦀㦁㮸㯈㯌㯾㰅㰈㳠㳡㴹㶎㷟㷭㸂㺚㻱㾼㾽㿹䃛䃮䆃䆈䆳䆼䉦䊚䍁䎭䑊䒃䔎䔏䕂䕖䗢䗦䗬䗯䙜䙤䜚䡫䡵䨤䨨䩼䪈䪋䭀䭔䭤䮱䲇𠁛𠁺𠉂𠎻𠏀𠑉𠑌𠦹𠶌𠶐𠷉𠸺𠸽𠺗𠺙𠻛𠻣𠽖𠿱𡀷𡂓𡂙𡂪𡃺𡄤𡆗𡏁𡏤𡐌𡐡𡑞𡑟𡒌𡗅𡚑𡟴𡠙𡠻𡣪𡮯𡮽𡮾𡹢𡽅𡾁𢄘𢄟𢄱𢅕𢅗𢊅𢕝𢞞𢟋𢟔𢠆𢠻𢡎𢢝𢤊𢤪𢱤𢱸𢳘𢳟𢴊𢶂𢶘𢶿𢷊𢸦𢸷𢹌𢺂𣄚𣄧𣉐𣉢𣔅𣔝𣔲𣔴𣖐𣗌𣗔𣛎𣛹𣜅𣜦𣜲𣜶𣝋𣝤𣟙𣟳𣷯𣹔𣻇𣻢𣿌𣿪𤁷𤂿𤃤𤄢𤑦𤡖𤢼𤧫𤹨𤻄𤻌𤾮𥇐𥈁𥊒𥊩𥊵𥌰𥎌𥔯𥖾𥛝𥡈𥣔𥯧𥱻𥲆𥳅𥳟𥳿𥴦𥴪𥶥𥶷𥷻𥽌𥽩𦂾𦄁𦄷𦇗𦔖𦗄𦛰𦝊𦞮𦟂𦟥𦡯𦤮𦪎𦪏𦪭𦰭𦴚𦶅𦷴𦷿𦻗𦼯𦽟𦾼𦿚𦿪𧀹𧁽𧂍𧂠𧏴𧏿𧐒𧐖𧐺𧑔𧒖𧒴𧔥𧔧𧔷𧜦𧜨𧞅𧞸𧞽𧪁𧪲𧫻𧬪𧬻𧭟𧭧𧮅𧮇𧴂𧷹𧸙𧸽𧾄𨃬𨄃𨄞𨄹𨆏𨆛𨇀𨉘𨏂𨏩𨓑𨓢𨕜𨕭𨖧𨖰𨖲𨗜𨘑𨘘𨙖𨙛𨙝𨣢𨩔𨫤𨫩𨭪𨮐𨮹𨯁𨯭𨯯𨰄𨲫𨶌𨶐𨷃𨻡𨽟𨽵𩄮𩄲𩅘𩅛𩌝𩍚𩐹𩔢𩔦𩕜𩘩𩘬𩙋𩙹𩞍𩞙𩟂𩟐𩠇𩠌𩠱𩥽𩪀𩪌𩯀𩱫𩷰𩺍𩺝𩺬𩺼𩻔𩻸𩽎𩾄𪁶𪄧𪆹𪇍𪈄𪋗𪋝𪍦𪐍𪐔𪒡𪔲𪝘𪝴𪤎𪩩𪳇𪳖𪳤𪷦𪺊𪿯𫂗𫃓𫃹𫄤𫅯𫆭𫆿𫋅𫋢𫍌𫏩𫏮𫑏𫒼𫕲𫗰𫙧𫡮𫤇𫤈𫤏𫤓𫧧𫩸𫪀𫪼𫫟𫬱𫮢𫮼𫯖𫷤𫸈𫸉𫸐𫼯𫽾𫾔𬊉𬊿𬍁𬎚𬑢𬒝𬔀𬚥𬜔𬝿𬞅𬣆𬣓𬣵𬤪𬧖𬩄𬩏𬩓𬩛𬭨𬭼𬰊𬲸𬵑𬵮𬶑𬶪",
 "車": "僆僌儎匭喗嗹囀塦塹媈嶃嶄惲慙慚慩揮搟摙摲撃撪攆暈暉暫楎槤槧檋櫣毄渾漣漸瀭煇獑琿璉瘒皸皹睴磛禈簐簵緷縺繋翬翴腪葷蓒蓮蔪螹褌褲褳覱諢謰賱蹔蹥輝轋運鄆鄻錷鍕鏈鏨鏩鑋韗顐餫鯶鰱鶤鼲齳㑮㜕㜛㜞㟦㟻㡓㦁㨻㫎㰈㹆䁪䃛䆭䉊䉐䉖䝍䟅䡣䩵䭕䮝䱿䳻𠌲𠑭𠑭𠑭𠣇𠥠𠵣𠺟𠻃𠻆𠼃𠼗𡀑𡅫𡆀𡆀𡆀𡍦𡐊𡐛𡑁𡤛𡸗𡸲𡺠𢄤𢄱𢉦𢕢𢕣𢟑𢤠𢧰𢮊𢶪𢷦𢷦𢷰𢸏𢺩𢺩𢺩𣄈𣊙𣍛𣗑𣞶𣡴𣡴𣡴𣣞𣣭𣤖𣨿𣱮𣷾𣹫𣺕𣼴𣿢𤁥𤍆𤍖𤐕𤟤𤟴𤡋𤮈𤹖𤹨𤺋𤾈𥊡𥊩𥌙𥌦𥍑𥕌𥗇𥣐𥪠𥰃𥶡𦑩𦔖𦗚𦗝𦟏𦳛𦽨𦾥𧆃𧎊𧏶𧐖𧐮𧡡𧮘𧮘𧳰𧴃𧸰𧽯𨂱𨅄𨆧𨆪𨇍𨉻𨋿𨌗𨍃𨍯𨎯𨏟𨏩𨏯𨏲𨏺𨏺𨕭𨖲𨘑𨘙𨘪𨘼𨞎𨡫𨪚𨮫𨯉𨰀𨰵𨰵𨰵𩀧𩄛𩈻𩉒𩙵𩞙𩠫𩧜𩮔𪍦𪏕𪐍𪝠𪤎𪪫𪰽𪳽𪳾𪹜𪿐𫄇𫈣𫌖𫏼𫙰𫚄𫝚𫡸𫣑𫧧𫬭𫸞𫺶𫺸𬄉𬆉𬊿𬍁𬒒𬒚𬘍𬝵𬦖𬧋𬬆",
 "㐱": "僇剹勠嘐嫪寥嵺廖憀戮摎樛漻熮璆疁瘳磟穋繆缪膠蓼蟉謬谬豂賿蹘轇鄝醪鏐镠雡顟飂餮髎鷚鹨㬔㺒䚧䢧䰘䵏𠗰𠗽𡑁𢄪𢒥𣟇𣠼𣩍𣹗𤺋𤺼𥂔𥃃𥉾𥧯𥲿𦑬𦗖𦼛𦾂𧍿𧢋𨶪𩌭𩖇𩘷𪅡𪖷𪤗𪯖𫐖𫳚𬵩",
 "重": "働勲嬞慟憅懂籦薫㗢㘒㷲𠘃𡓯𡼉𡽯𢳾𣊳𣿅𥋾𥗦𥣑𥪿𥵾𦇮𦡂𦡦𦹝𧀑𧁬𧄓𧜻𨆟𪥝𫇁𫦿𫦿𫦿𫷐𫾍𬈭𬉎𬡬𬬐",
 "共": "僎儤兾冀噀嚗廙懪戴撰曝檋殿港潠潩瀑熼爆禩穓篊簨糞繏翼葓蟤襈襮譔趩選鍙鐉鑤闀霟霬饌鸔㔴㔵㦏㩧㯢㷷㿺䂍䔬䠣䣏䤖𠪙𡄗𡠲𡢀𡮭𡮸𢎑𢑾𢕵𢖔𢝳𢥑𢨚𢵬𢹢𣀛𣀠𣄗𣋰𣌈𣚣𣞺𣣣𣫣𣽣𣿢𤃵𤜈𤧈𤩄𤲲𤳓𤳧𤺆𥂅𥈄𥈩𥈰𥗋𥗟𥣕𥣢𥯏𥰲𦆿𦈝𦌔𦌻𦍂𦍅𦒖𦔜𦠆𦢊𦧸𦶓𦺈𦾲𧃢𧇽𧏒𧑌𧔙𧝀𧡥𧨻𧭤𧲐𧾌𨃈𨅜𨇅𨍯𨣂𨩅𨯼𨾂𩁠𩈷𩙕𩙺𩦖𩦸𩨎𩪞𩯱𩰓𩻝𪃡𪇰𪑩𪒕𪟼𪡝𪡥𪮙𪻌𪽛𫣭𫪵𬉂𬏖𬏘𬙑𬢄𬤥𬮍𬵫",
 "羊": "僐嫸廯敾橏歚癣癬磰繕缮羼羼膳藓蘚蟮遅達鄯鐥饍鱔鳝㪨㬕㬯㱻㵛㶍㷽㿏䇁䉳䌴䔗䦅䯁𠟤𠣮𠶿𡀳𡄰𡅐𡑱𡑳𡰠𡾮𢢆𢥌𢵈𢹗𢹛𢺑𣉚𣖂𣟱𣟲𣠾𣩧𣸉𣺸𣼁𣿔𣿨𤜀𤺪𤺽𤼘𥀀𥈖𥊳𥷴𦂡𦇫𦎝𦏓𦏧𦗢𦝯𦟃𧒻𧕇𧕳𧞆𧬆𨂧𨂨𨆤𨇤𨔶𨗚𨗾𨣁𨮉𨰠𩆵𩕊𩦐𪍶𪝩𪱋𪷧𫅜𫅞𫅡𫈭𫌔𫏨𫐳𫓜𫲳𫸇𫿠𬅬𬙽𬙿𬚀𬚁𬞗𬣂𬦔𬱱𬹎",
 "呑": "僑勪嘺嬌屫嶠憍撟敽敿橋燆獢矯礄穚簥繑蕎蟜譑趫蹻轎鐈鞽驕鱎鷮㝯㠐㢗䀉䎗䚩䢪𠙪𠿕𠿻𡁗𡰑𡰘𢄹𢐟𢕪𢻤𣤙𣪽𣯹𣾷𤩝𥋊𥼱𦒓𦪞𧄳𨇊𨝰𨲭𩯘𪍷𪢡𫡡𫣹𫦙𬓚",
 "君": "僒蔒㩈㴫㿏𠌣𠹴𡀳𡑱𡑳𡩫𤹓𤺽𦄄𦏓𦵼𨆤𨮉𩺐𪷧𫌔𫲳𬙹𬚀",
 "酋": "僔噂壿嶟撙樽橂澊燇磸竴繜罇蕕譐蹲遵鄭鐏鱒鳟鷷㞟㽀䔿䥖𠥙𠪝𡰙𡼓𢢕𢵫𣞊𣾇𤡽𤮐𥂴𥊭𥖁𥢎𥳢𥳰𥴕𦅆𦌚𦪚𦽈𧒆𨗖𨞀𨣆𨱔𩯄𫂫𫆸𫑼𫜄𫱵𫻆𬛘𬟌𬤢𬯚𬲝𬴤",
 "业": "僕嘘噗嶪嶫幞憈戯掽撲擈普曗椪樸檏歔湴湿潂澲獛璞瞨碰礏穙襆覷觑諩譃贌踫蹼轐鄴醭鏷镤顕驉驜魖鱋鸈㒒㗼㠊㡤㱉㲫㸁㸣㹒䌜䑑䗒䗱䧤䧨䪁䰃䴆𠁔𠁜𠁝𠁟𠵔𡌶𡑿𡖼𡡐𢖃𢛰𢢜𢣧𣊪𣤞𣩫𣪻𣮧𣾴𤂛𤗵𤣋𤩶𤯭𤺞𤽽𤾣𤾧𥋖𥋙𥐁𥣈𥴼𥼜𦄾𦆫𦝤𦡧𦪡𦫄𧀸𧇊𧡟𧬬𧴌𧸢𨂝𨂞𨏨𨗩𨝹𨟘𨭥𩑀𩑃𩕟𩤀𩯏𩴥𩹁𩼋𪆛𪋡𪋫𪒢𪒲𪖈𪖊𪙫𪠖𪢭𪴨𪴨𪴯𪹣𪻁𫐗𫠃𫡀𫡁𫡂𫤵𫦖𫨱𫨱𫰃𫼆𬊭𬞲𬶬",
 "壴": "僖嘭嘻噽嚭囍囍嬉廚憉憘憙敼暿樹橲歖澍澎熹熺甏瞦瞽礂禧糦繥膨臌薣蟚蟛蟢譆饎鱚鼕鼖鼗鼘鼙鼚鼛鼜鼝鼞鼟㕑㝆㱶㵙䕒䥢䵱䵽䵾䵿䶀䶁𠎎𠏼𠓘𠾢𠿤𡀆𡃨𡄂𡅤𡅸𡆐𡆒𡐶𡣗𡼎𡽂𡽌𢢶𢣵𢵓𣦩𤀺𤏴𤐵𤡭𤢀𤩠𤪘𤺬𥀷𥌒𥕱𥕽𥛱𥛻𥢗𦅈𦗭𦗺𦪟𧔋𨅒𨅘𨆊𨎧𨭌𨭎𨭸𨯨𨼩𩦇𩰛𩻬𪇀𪇞𪔋𪔌𪔍𪔎𪔏𪔐𪔑𪔒𪔓𪔔𪔕𪔖𪔗𪔘𪔙𪔚𪔛𪔜𪔝𪔞𪔟𪔠𪔡𪔢𪔣𪔤𪔥𪔦𪔧𪔨𪔩𪔪𪔫𪔭𪔮𪔯𪔰𪔱𪔲𪔳𪔴𪔵𪔶𪔷𪢢𪢣𪧽𪮬𪹫𫄵𫋚𫍻𫓄𫓖𫔐𫚩鼖𫥙𫬸𫱺𫼅𫿽𬥪𬭳𬭵𬶮",
 "尚": "僘厰幤廠氅㢢𠔷𢠵𢢌𢸋𣀴𣚿𤏮𤢄𤺲𦒚𦦢𧝟𩻪𪅶𪛆𫤁𬆈",
 "其": "僛凘厮嘶廝撕樭檱櫀澌濝燍璂禥簊簛簯簱簸籏藄蟖蟴鐁㒋㠌㯕㽄䔮䡳䥓䲉𠎞𠐾𠼻𠿁𡒬𡡒𡪈𡮪𡻸𢠹𣚄𣤘𣩠𣻺𤩐𤪌𤮓𤺊𥐀𥕛𥕶𥳽𥼤𦠭𦪆𦪵𦸀𦻆𦻊𦻬𧝤𧫠𧬊𧬜𨄎𨮭𨼂𩅰𩍮𪅾𪆁𪆗𪇥𪖉𪟕𪤏𪰃𪷲𫀣𫂣𫂮𫋣𫌊𫍕𫗲𫮱𫰁𫾑𬄙𬄛𬄤𬄯𬈲𬲛𬸨",
 "癶": "僜凳噔嬁嶝憕戣揆撜暌楑橙湀澄燈猤璒睽瞪磴竳簦膯艠葵覴證蹬邆鄈鄧鍨鐙镫闋阕隥霯騤骙鼟㔁㡠㲪㽅䆸䔲䗳䙆䙞䠏䤆䮴䳫䳾𠊾𡃻𡎝𡞳𡪺𢃯𢑣𢜽𢯸𢹑𢿤𣃆𣉉𣔽𣦌𣩟𣫤𣰆𣺍𤢈𤬉𤳘𤺌𤼶𤼷𤼸𤾢𥨰𥯫𥼰𦝢𦳠𧃵𧍜𧝚𧡫𧯫𧰐𧰔𧰥𧺄𧾊𨂩𨎤𨐸𨡩𨨻𨮴𨶿𩀁𩍐𩏠𩔆𩘼𩙄𩯇𩸿𩹍𪒘𪽥𫖖𫙼𫛼𫜣𫠿𫧸𬆬𬑪𬢔𬮹𬳒",
 "孨": "僝樼潺轏驏骣㵫㻵𠘈𠟉𢢁𢵔𥢨𦠳𨬖𩻣𪩖𫔏𫨟",
 "垚": "僥嘵嬈嶢嶤徺憢撓曉橈澆燒獟皢磽穘繞翹膮蕘蟯襓譊趬蹺遶鐃隢顤饒驍髐鱙㚁㚁㹓䁱䰫䴃䶧𠓘𠟋𠢩𠨪𡅍𡈦𡓖𡗉𡗊𡪩𡭄𡸳𢴽𢿣𢿲𣍕𣠎𣦥𣩦𣫁𤩊𤴀𥋈𥪯𦇇𦉗𦒏𦒒𦪛𧑣𧢬𨇵𨊅𨎬𨷁𩀸𩯆𪞭𪸊𫊐𫤣𫤦𫶺𫾤𬁕𬇆𬩱𬴝",
 "京": "僦噈幜影憬憱撔暻殧澋燝璟蹴蹵鐛顥颢鷲鹫㔀㠇㩆䭘䯫𠎠𠑱𠘉𡐹𡰏𡼩𡼮𢀍𢇔𢒬𣌚𤎼𤏅𥋓𥖉𥳛𥷛𥷼𦅡𦠢𧄥𧑊𧑙𧫾𩀻𩐿𩻱𪆣𪆩𪸉𪼝𫃏𫎢𫖧𫫩𬄣𬔂𬳑𬶱",
 "尤": "僦厖哤噈娏庬憱殧浝狵痝硥莸蛖蹴蹵駹鷲鹫㙙㟌㠇㤶㩆㴳䆌䏵䵨𡃊𡓈𢅛𤎼𤏅𥆙𥗎𥳛𥷛𥷼𦠢𦪼𧀔𧄥𧑙𧫾𧱓𧱦𧳑𨯀𨿙𩀻𩒿𩭒𩷙𪁒𪁪𪆩𪼝𫎢𬭿",
 "門": "僩僴嚪嫺嫻孄幱憪憫撊撋擱攔斕橌橍橺櫊櫚櫩欄潣潤澖澗濶瀾灁灍灛熌燗燘燜爓爛瓓癇癎瞤瞯瞷矙磵礀簡簢籣繝膶蔄蕄蕑蕳藺蘭襇襉襴覵覸譋讇讕躙躝躢鐗鐦鐧鑭閷鬜鬝鷳鷴鷼㗴㗿㘓㘚㠈㦖㦦㦨㨛㯗㴸㵍㵎㶄㶒㿕䁡䃹䉍䉮䌪䑌䔵䕞䕡䠾䥜䥨䪍𠍒𠎒𠎓𠐩𠑑𠓖𠺉𠻻𠼋𠾽𠿷𡁡𡁤𡃦𡄢𡓲𡠳𡢃𡢄𡢸𡣽𡤄𡫡𡮣𡮤𡮥𡮩𡮬𡮮𡼏𡼥𢡞𢡻𢡿𢢀𢤘𢲾𢴌𢵢𢵧𢵱𢷃𢸴𢺛𣊺𣋆𣌙𣘥𣙎𣚾𣛣𣜊𣜝𣟫𣟬𣩝𣩞𣩼𣼐𣼶𣾺𣿸𤀳𤁐𤁝𤁵𤂶𤂷𤃦𤃷𤄃𤄒𤐛𤑷𤒻𤛞𤡥𤡦𤡲𤩎𤯐𤺖𤺛𤺯𥊺𥌸𥌻𥏿𥐔𥖆𥗮𥡕𥳐𥳑𥴥𥶆𥶿𥸍𥼴𥽭𦄞𦅘𦗬𦘍𦘑𦟼𦠥𦠯𦧼𦼠𦽅𧀲𧂄𧃪𧒄𧕗𧖆𧟉𧢈𧢑𧬘𧬱𧮍𧮑𧯎𧯑𧯓𧯘𨅍𨅽𨆀𨆇𨆿𨇝𨇡𨇮𨎫𨏦𨏭𨣇𨣉𨤄𨬔𨰎𨰏𨰓𨶄𨶓𨶡𨶷𨶼𨶽𨷎𨷑𨼝𩦂𩦃𩦓𩦔𩻘𩻾𩽥𪙨𪙩𪞰𪦫𪧶𪪢𪬖𪮰𪷭𪸌𪼙𪾽𫃐𫆺𫉑𫍋𫔦𫙸𫫭𫯿𫱠𫵈𬐁𬘒𬚩𬛖𬛗𬟢𬣖𬵬",
 "矛": "僪劀噊堥壄婺媃嵍愗憰懋揉暓楘楺橘氄渘潏煣燏猱獝瑈璚瞀瞲糅繘腬葇蝚蝥譎谲蹂蹫輮遹鍒鍪鐍霚霱霿鞣鞪韖騖騥驈骛鰇鱊鶔鶜鶩鷸鹜鹬㑱㖻㡔㥤㮗㮘㽥䂋䆷䋴䋷䓮䜼䤎䨁䰆䰬䱯𠍢𠝸𠢢𡹰𢔟𢜸𢨌𢵮𣜓𣝥𣠳𣮪𣰇𥍲𥍳𥎐𥎕𥎜𥛯𥠊𦒑𦒔𦔇𦺖𦼪𧃺𧍟𧑐𧓿𧝃𧝺𧞉𧳨𧷾𧽻𨗝𨜙𩄯𩘻𩙅𪊀𪍓𪍘𪍚𪑶𪧮𪴈𪿌𫍅𫐓𫔄𫔎𫚪𫱶𫲑𬟟𬲆𬶧",
 "冏": "僪儶劀噊孈憰攜橘欈氄滳潏熵燏獝璚瓗瞲繘纗蔏螪蠵觿謪譎讗谲蹫遹酅鐍鑴霱驈驨鱊鷸鹬㔒㵝㽯䆷䕍䤎䪎䭨䰬𠼬𡄴𡰡𡰢𡿀𢥘𢨌𢵮𣰇𤣑𤮰𤹟𤼒𥊔𥍋𥎐𥎕𥎜𥛯𦒑𦒔𦢿𦺖𧑐𧜟𧝃𧟃𧢧𧲚𧷾𧽻𨏳𨗝𨝗𨫢𩘻𩙅𩱐𩽨𪄲𪈥𪊀𪋸𪞊𪬥𪯔𫄹𫔎𫔔𫘱𫚪𫬩𫱨𬧽𬧿𬰏𬲆",
 "亞": "僫噁癋鐚䜑𠠇𠻺𡀄𡢇𢵣𣡆𣩤𣽏𤡾𥼳𦠲𦼇𧑕𪅴𪹪𬄚𬹓",
 "灬": "僬儦凞劁噍嚥嫶嬿嶕嶣憔撨曣榚樵溔潐濹瀌燋燳爇爊瓙癄皫瞧礁禚穛穮窯篜糕繺纒羆羹膲臕臙蒸蓔蔒蕉薫藨蟭觾譙讌谯趭酀醮醼錰鐎鑣镳顦餻驠鷦鹪㚠㜯㟱㩠㬠㬫㲬㵭㺘䅵䆶䖄䜩䥋䩌䫞䮽䴏𠆡𠏖𠗹𠘕𠞎𠢴𠹎𠺅𠿏𠿼𡁱𡂘𡏈𡙡𡞷𡠮𡤈𡾌𢄺𢅑𢊒𢎓𢖐𢟏𢨓𢰷𢶕𢶞𢹇𢾧𣄦𣊳𣋳𣘸𣜠𣜭𣟛𣟼𣣵𣤚𣤹𣯇𣸾𤀠𤃇𤃭𤄩𤍅𤐤𤑙𤑛𤒈𤒙𤒲𤣄𤫇𤴃𤸲𤹂𤹐𤻩𥋧𥌜𥍂𥗕𥛲𥵕𥶔𥷀𥼚𥽫𥾀𦅃𦌲𦎟𦏠𦔩𦗠𦞪𦢋𦢹𦢺𦣳𦤭𦳤𦶟𦶣𧀛𧁛𧄝𧏲𧔦𧔹𧖝𧖝𧝈𧞞𧞧𧞯𧢙𧪊𧪣𧬫𨃊𨃻𨇟𨖵𨝱𨞻𨞿𨢶𨭝𨮳𨯧𨱓𨶅𨶲𨸋𨽞𨿈𨿞𩄰𩍶𩏢𩏷𩙒𩱋𩱧𩽁𩽒𪆄𪆔𪈏𪛖𪮼𪳜𪴚𪴴𪶭𪷴𪽢𫃗𫊔𫋩𫌉𫓣𫔒𫦑𫺵𫿡𫿲𬊬𬝐𬞜𬞭𬟓𬟜𬡰𬪸𬴍",
 "旡": "僭僭噆噆嶜嶜憯憯撍撍橬橬潛潛灊灊熸熸簪簪糣糣譖譖谮谮鐕鐕㔆㔆㣅㣅㻸㻸㿊㿊䁮䁮䃡䃡䅾䅾䐶䐶䣟䣟䤐䤐䫬䫬䭙䭙𡄊𡡖𡡖𢢸𣟞𣟞𣠟𣠟𣠱𣠱𥎑𥎑𥸢𥸢𦻳𦻳𧖛𧖛𧝆𧝆𨅔𨅔𨼐𨼐𨽨𨽨𨽳𨽳𩀿𩀿𩅨𩅨𩻛𩻛𪅽𪅽𪖼𪖼𪯘𪯘𬑦𬛑",
 "里": "僮兣勭喱嘢噇墅幢徸憧撞曈朣橦氃湹潼燑獞甅疃瞳穜竰糎糧緾缠罿艟蕫薶蹱鐘霾㠉㦟㼿䂌䃥䆹䔆䚒䝑䡴䣑䭚䮵䱳䴀𠟍𡈩𡑆𡦜𡪸𡰒𡰕𡺉𢖜𢟆𢢳𢨒𣄛𣄢𣊹𣊼𣛀𣼫𣿞𤍓𤎲𤡒𤩔𤺄𥜡𥪢𥫂𥫎𥳘𦅅𦌜𦒍𦔛𦝟𧄚𧐓𧑆𧘂𧝎𧬤𧸌𧽆𧽿𨂷𨇎𨝯𨣒𨤲𨤸𨤺𨶻𩍅𩕉𩞯𩦍𩪪𩮞𩯬𩻡𩼆𪆏𪋥𪧳𪬨𪷑𪻵𪾞𫍼𫑕𫒄𫓉𫝿𫩆𫮈𫽼𫾄𬃗𬅗𬉨𬎎𬓾𬥋𬪿𬫀𬫁𬫭𬮸𬴼",
 "朿": "僰僰憡箣莿蓛蕀蕀襋襋鏼㩍㻷㻷䪂䪂䱨𠍷𠍷𠒧𠒧𠞁𠢠𠢠𠩪𠻳𡞸𢠂𢲆𢿸𣽤𤏡𤏡𤒗𤒗𤟰𤷫𥚲𥰍𥴹𦖝𧌐𧼕𪑟𪦡𪦡𪮁𫂡𫂡𫓇𫓇𫼄𫼄𬮓𬮓",
 "枼": "僷擛瞸蠂鐷㵩䕈䜓䥡䭟𠪸𣋑𣛻𣜿𣩨𦻜𧀢𧝵𨆡𨗸𩆏𩍣𫅠𫊍𬀗𬛚",
 "林": "僸儊凚噤憷暦檚歴滼漜漤潹澘澿濋瀮璴礎虨襟霦齼齽㦗㩒㯲㱈㵉㸑䌝䨬䫴𠆡𠎊𠘆𠘏𠢱𠢵𠪖𠼖𠾣𠾤𠿝𡑓𡑲𡢟𡢾𢊲𢟍𢵳𣋜𣔁𣛧𣡕𣡕𣡿𣰙𣺉𤏗𤐖𤑇𤒐𤪼𤺢𤺣𤻇𤻎𤻚𤼍𤼑𥋴𥎤𥎥𥖜𥗘𥢻𥽍𦈟𦡞𦼚𦽔𧅲𧅲𧈇𨅾𨆃𨆄𨟤𨣤𨭣𨭺𨼪𩆤𩎑𩔵𩕌𩖗𩙐𪇎𪊅𪒍𪢇𪤰𪧲𪫛𪬟𪴖𪷩𪹡𪹵𪼬𫄒𫉭𫍉𫜴𫣳𫣼𫦜𫫋𫮚𫴘𫶒𫽷𫿣𬈥𬋔𬋡𬓛𬗼𬜏𬰋𬺓𬺔",
 "曲": "僼儂噥嶩憹擃檂欁澧濃燶癑禮禯穠繷膿艶蕽襛譨豑軆鄷醲醴闦霻體鬞鱧鳢齈㺜䁸䃩䌡䪆䵄䵜𠓍𠘊𠙫𡢿𡫋𡽍𢐪𢖢𢢪𣀂𣋏𣰊𤣁𥎓𥴡𥵛𥸠𥽈𦗳𦡊𧓅𧬹𧰅𧰚𧰞𧰟𧰢𨆞𨐺𨑊𨲳𨼷𩁑𩅽𩼅𪆯𪇌𪏨𪒬𪞽𪤡𪩰𪴀𫋠𫌓𫓐𫓒𫧪𬉰𬍎",
 "秋": "僽矁㵞𠿈𢶲𣜷𩼗",
 "𡨄": "僿噻攐攓瀽簺藆鑳㘔㩙㩟㩷䙭䮿𠏯𠐻𠽱𡄓𡅶𡑮𡤐𡬉𡼌𡾰𢷘𣟋𣟯𤀕𥜴𧃕𧝱𧞼𧟑𧮈𧮎𨇥𨙇𨰬𩎀𩠵𩽜𪷱𪸋𫉲𫬐𬤯𬴏",
 "𦍌": "儀媄嬟嵄嶬懩攁榚様樣檥渼湵溔漾瀁燨犠癢礒禚窯糕羹羹艤葁蓔蟻議躾轙鎂镁餻鱶鸃㔦㕒㕗㗝㚠㟱㠖㨾㩘㬢㺊㼁䅵䉝䑆䓺䕏䣡䧧䫞䭐䭥䰮䲑䴊𠁍𠌉𠍵𠏖𠝫𠬗𠷩𠿿𡅖𡎤𡗍𡙡𡟜𡟿𡡂𡡇𡮔𢟣𢣂𢱒𣈸𣌞𣕞𣖙𣗹𣣵𣮺𣯇𣻌𣿭𤎔𤚖𤛜𤟲𤡀𤧞𤩺𤹂𥈢𥔣𥖺𥠦𥫃𥶑𥻙𦍯𦎛𦎟𦎡𦎿𦏄𦏇𦏇𦏒𦏠𦡫𦢋𦢹𦫧𧏮𧓲𧕶𧗍𧫛𧶾𧸡𨃇𨆋𨖌𨜰𨞿𨣞𨩍𨶅𨷑𨸈𨺰𩁥𩋼𩜒𩝏𩪴𩱋𩱧𩴽𩹖𪙴𪥞𪬝𪴴𪶤𪹏𪻄𫅖𫅚𫅝𫅟𫅠𫇣𫌉𫏟𫑩𫓔𫘑𫞁𫦑𫱛𫴌𫺵𬋼𬒙𬗮𬘅𬙴𬙵𬙺𬙼𬙾𬚛𬧏𬩇𬮎𬲙",
 "我": "儀嬟嶬檥燨犠礒艤蟻議轙鸃㕒㠖㩘㬢㼁䉝䕏䣡䧧䰮䲑䴊𠌾𠏃𠬗𠿿𡤝𢣂𣿭𤩺𥫃𦡫𧕶𧸡𨆋𨣞𪙴𪦙𫓔𫴌𫶏𬌘𬷭",
 "㐭": "儃凛凜勯嬗廩廪憻懍擅旜檀檁氈氊澟澶燣璮癛皽繵膻蟺襢譠邅顫颤饘驙鱣鳣鸇鹯㔊㣶䁴䃪䄠䆄䉡䕊䡀𠆞𠏟𠘐𠘡𠿞𡀫𡄁𡅹𡆎𡗋𢀮𢅒𢋃𢐹𢶸𢷆𣋊𣱭𤢏𤢤𤮜𤯑𤺺𥋶𥼷𦒜𦡣𦢵𦼹𧾍𨆁𨎹𨣚𨭖𨮍𨲵𨲷𩁉𩆐𩇆𩉊𩍕𩙼𩯤𩼤𩽱𪓼𪙵𪷤𫄊𫉿𫑾𫔑𫗴𫘰𫦜𫲃𫿝𫿣𬀞𬆸𬙉𬪙𬷶𬸴",
 "苟": "儆憼擎擏曔檠璥蟼警驚㢣㯳𠧂𢍸𢐧𢢩𤀂𨰈𩼃𫄿𫱻",
 "疋": "儊嚏嫙憷懥暶檚漩濋璇璴礎縼蔙鏇齼㯀䁢䃠䗠䡹䲂𠏴𠿝𡐆𡢟𢄲𢕐𢳄𢳱𣎓𤻇𥪱𦄦𧐗𧜽𨆄𨆫𨭣𨼪𩘶𩠍𪍧𪹵𬨕𬺓",
 "⻗": "儒嚅嚯嫮嬬孀孁孺嶀嶿懦摴擂擩攉曇曘曤樗樰橒檑檽櫺澐澪濡瀖瀮灀燯燸獳瓀癗癨皬矐礌礝礭礵穤籗籱糯繧繻膤臑臛艝蕓蕶蕾薷藿蘦虂蠕襦謣譳轌轜鄠酃醹醽鐳鑐镭隭霒霕霴霼靅靆靈靉靐靐靐顬颥驦骦鱈鱩鱬鳕鸖鸘鹴麢龗㘊㩕㪮㬡㯪㰌㱋㵡㵢㸌㹘㺢㻬㽌㽭䇕䉙䌢䌮䍣䙥䞕䡼䢮䥤䨭䨲䨺䨺䨺䨻䨻䨻䨻䰑䰰䴇䴫𠏡𠐶𠞯𠟨𠟺𠠛𠠢𠠰𠣉𠧍𠻢𠽌𠿙𡀂𡀛𡃷𡄟𡅺𡐅𡓘𡠭𡢽𡤕𡤴𡾜𢐰𢤟𢵆𢶉𢸍𢹝𢹩𢺓𣀀𣊯𣛲𣠚𣰑𣿋𤁳𤂪𤃍𤃩𤄐𤅟𤅫𤐝𤖜𤖥𤜅𤢗𤣅𤣍𤫊𤫑𤫢𤮚𤮮𤮸𤳟𤴑𤴤𤻪𤾨𤾻𥀫𥀭𥀸𥋞𥋸𥌎𥌼𥍕𥎘𥐎𥖅𥖟𥜗𥜧𥢚𥢴𥤃𥩉𥵉𥸐𥼸𥽥𦆙𦈡𦉏𦉢𦉣𦒧𦡕𦪩𦫃𧄁𧄨𧅑𧆑𧒜𧒽𧓴𧕅𧕖𧢥𧬞𧲙𧾮𨆢𨎿𨖜𨗠𨗺𨘾𨙉𨙝𨝽𨞖𨟓𨟮𨣖𨣙𨬆𨯂𨯟𨯻𨷏𨷘𨷰𩁎𩁦𩂾𩃏𩃙𩃠𩃷𩃸𩄯𩅝𩅞𩅣𩅾𩆊𩆒𩆕𩆖𩆚𩆞𩆟𩆦𩆻𩆼𩇄𩇆𩇎𩇔𩇔𩇔𩇔𩍢𩍥𩑆𩖊𩟃𩟯𩧏𩪰𩰂𩱶𩴶𩵀𪄮𪆚𪆼𪈑𪈝𪋪𪋯𪋳𪋶𪎱𪒝𪛈𪝷𪝺𪞮𪞵𪤠𪤰𪴐𪴖𪴜𪴟𪴠𪷳𪸀𪼗𪼬𫂪𫃽𫏧𫑪𫔓𫕣𫗜𫝞𫣼𫩍𫬝𫭁𫱭𫲚𫴤𫶘𫻝𬈳𬉮𬋣𬎅𬎌𬘐𬝹𬧾𬰉𬰎𬰑𬰖𬰨𬸰𬹫",
 "吉": "儓嚞嚞嬯懛撷擡擷檯籉纈薹襭鐑㘆䕵䕸𠟸𡟌𡽩𢅣𢢂𢮌𣚬𤁅𤂌𤗿𤢬𤢺𤻡𥜝𥷫𦺢𧀺𧭏𧽓𨗟𩦽𩷻𪃇𪆋𪒴𪝦𪝦𪢍𫒸𫬔𫬔𫵊𫶚𫹧𬅁",
 "吋": "儔嚋嬦嶹幬懤擣檮濤燽燾璹疇禱籌翿薵譸躊軇醻鑄隯魗㦞㹗㿒㿧䊭䌧䬞䮻䲖𠠐𡕐𡕑𣀓𣀘𣋬𣝷𣤫𣫐𤒵𤘀𤴆𥌆𥖲𦏟𦡴𦦰𦦾𧈙𨞪𨟢𩕯𩯦𪇘𫇠𫋤𬰯",
 "𠳋": "儙繾缱譴谴鑓䪈䭤𡒌𨇀",
 "寍": "儜嚀嬣懧擰檸濘獰矃薴鑏鬡鸋㣷㲰䗿䭢𡫸𡬗𤻝𥣗𦡲𧭈𧰗𨊓𨲸𩁔𩕳𫍾𫴞",
 "囚": "儠媼慍搵擸榲氳溫熅爉獵縕膃臘蒕蠟躐轀邋醞鑞镴鬣鰮鱲㯿㲱㼃䁽䃳䉭䜲䝓䪉𠠗𡓍𢆭𢺍𣋲𣯎𣰫𤬒𥠺𥸆𦰪𧄵𧭞𧰠𨎽𨜵𩟤𩥈𩨐𪇹𪉸𪍝𪙷𫖩𫚭㬈𫿢",
 "思": "儢勴攄櫖濾爈藘鑢㩄𠣊𡃖𡣭𡾅𢣿𣀞𤻱𥌠𥖼𥜜𥶌𥽜𦢛𧓻𧭜𧾧𪇸𬕻",
 "黃": "儣兤嚝彍懬懭擴曠櫎瀇爌獷矌礦穬纊鄺鑛䊯𢌊𢌌𤳱𥀱𦓣𦘅𦢎𨇁𨽏𪇵𪍿𪏪𪠢𫋧𫸊𫸋𫸌𫸍𫸎𫸏𫸐𬉟",
 "氺": "儤嚗懪曝瀑爆襮鑤鸔㩧㿺䂍䤖𢑾𢖔𣀛𣀠𣋰𣞺𥗋𦆿𦢊𧔙𧭤𧲐𨇅𩁠𩙕𩯱𪇰𪻌",
 "買": "儥凟匵嬻櫝殰瀆牘瓄皾竇續藚襩覿讀豄贕贖鑟韇韥黷䄣䢱𠠔𠠠𡂝𡔍𢖏𢷺𣋺𣤯𣰬𥀲𥌚𥖿𥶦𦌷𦢌𧅎𧔖𧘅𧸝𧸷𧾥𨏔𨽍𩧈𩴺𩽆𪺁𬌏𬔃",
 "鹿": "儦攈攗攟瀌爊皫穮臕薼藨蘪鑣镳㩠䥝䮽𡂘𡈳𡾌𢖐𢥄𢥐𣄦𣋳𣞓𣟸𤃱𤏶𤒣𤣄𥌜𥶔𦇘𦔩𧆓𧆓𧆓𧞧𧞯𨞻𨟤𨣿𨮞𩍶𩙒𩽁𪈹𪋻𪋻𪋻𫑃𫿡𬴍",
 "斦": "儨劕懫櫍瓆礩躓鑕㜱㩫䑇䜠𠘖𡂒𡒻𡦫𤁩𤢽𧓳𧸲𨏑𨐿𨟊𩍵𩧄𩽄𪮽𬘋",
 "易": "儩瀃𡃶𢱦𧀩𨲞𩮜𪈑𬬏",
 "青": "儬濪瀞篟蒨蔳㵾𠑴𠘒𡁔𡃑𢴆𢴘𣃄𣹥𤀜𤄯𥴰𥶹𦹤𦽴𦾿𧂮𧓔𧜹𨷧𩇝𩇟𪇒𪷍𪸃𫋛𫠽𫣺𫫜𫷝𫻄𬈚𬈴𬎛",
 "見": "儬儭嚫嫢寬寴摫槻槼櫬欟漞瀙瞡窺藽襯闚鬹㯒㵾䌐䞋䨳䨳䮭䲅𠻷𠼽𡙭𡠝𡣚𡦑𡩮𡪨𢊡𣎔𣠤𣠶𤒠𥊋𥗒𥛟𥨾𥸚𦪻𦸡𧁪𧐎𧜴𧡯𧢅𧢅𧢞𧢞𧢬𧢬𧭼𧱻𧺂𧺃𧽨𨅂𨇛𨇜𨶳𩇟𪄯𪒐𪢯𪳩𫋩𫌥𫌥𫣷𫥝𫫗𫱟𬉛𬦄𬪖",
 "亲": "儭噺嚫寴櫬澵瀙薪藽襯㜪䞋𥗒𥨾𧭼𨑁𪧭𪬴𫚀𫣩𫥝𬎖𬷵",
 "厤": "儮嚦攊櫪瀝爏瓑癧礰藶讈轣靂㠣㱹㺡㿨䍥䟐䥶𠘟𠠝𠫏𡤌𡫯𡳸𢍷𢖙𢤩𣀥𣌜𤃹𤖢𤘃𥌮𥤀𥨻𥷒𦇔𦘊𦪾𧔝𧞿𧰡𧴠𨇗𨊛𨘸𨟑𨟟𨣷𨷦𩙖𩯺𩽏𪓀𪖍𪗁𪙽𫇀",
 "為": "儰𠼮",
 "崔": "儶孈攜欈瓗纗蠵觿讗酅鑴驨㔒㩗㽯䪎䭨𡀰𡄴𡰡𡰢𡿀𢋬𢥘𤣑𤮰𤼒𥍋𥶮𦢿𧟃𧢧𧲚𨏳𨮑𩽨𪈥𪋸𪝱𫄹𫔔𫘱",
 "⺲": "儸啰囉奰奰奰嶵摆擺攞曙曪椤檌欏濖猡玀矲籮糬纙薯藣蘿襬逻邏鎠鑼锣饠鱰㑩㓻㔥㟵㠑㦬㯰㼈㿚䆉䊫䌉䎱䙓䥯𠏲𠐌𠘏𠙣𠤩𡆆𡓁𡚤𡚤𡚤𡣈𡤢𡬺𡭀𡳹𡿇𡿏𢅄𢅩𢅾𢠪𢤇𢤛𢱫𢸇𣉳𣗵𣘓𣞍𣞻𣦐𣩿𣱀𣺽𤁣𤄷𤌒𤌗𤜑𤪄𤭺𤳄𤳷𤳸𥋽𥌓𥗴𥗿𥵟𥶓𥷾𦃿𦉛𦋳𦍉𦣇𧄗𧄾𧟌𧟍𧹐𨇑𨇽𨗻𨰟𨽉𩉙𩎊𩵇𩺩𩽰𪈰𪋰𪎆𪙳𪤄𪧁𪲷𪳴𪶒𪽝𫁂𫏑𫔆𫕾𫗩𫣧𫥨𫫼𫬘𫭽𫶳𫻕𫻥𫽋𬂂𬊜𬒓𬘊𬙞𬙠𬠯𬠻𬡠𬥇𬰡𬲡",
 "維": "儸囉攞曪欏玀籮纙蘿邏鑼饠㦬㼈㿚𡆆𡤢𡿇𡿏𢅾𣩿𣱀𤄷𥗴𥗿𦍉𦣇𧟌𧹐𨇽𩉙𩎊𩵇𩽰𪈰𪎆𬠻",
 "兟": "儹劗囋巑攒攢欑灒瓒瓚礸禶穳籫纘缵臜臢襸讚趱趲躜躦酂酇鑽饡㜺㦫䂎䡽䰖𠓕𡿍𢑊𣀶𣀹𣪁𤓎𤿀𥎝𥽷𦫅𧄽𧹍𧹏𨤆𨳄𩎈𩵆𪚇𪴙𪷽𫲗𬖃𬡷𬤮",
 "敢": "儼孍巌巖巗曮欕玁矙礹讝釅麣㘎㘙㘚䉷䕾䶫𠑊𠘥𡗏𢥴𢺘𣌙𤅙𤫠𤼉𥍓𦘑𧟓𧯘𧴣𨰫𩽴𪋹𫀤𫤌𫲠𫹪",
 "畾": "儽欙灅癳纝蘲蘽虆鑸㒦㜼㠥㲲㶟䴑𠠯𡔁𡤯𡿉𡿔𡿜𢹮𢺢𣠠𣡧𤜖𤫤𤫥𤴈𤴉𤴍𥍔𥗬𥗼𥤐𥸕𧕫𧮢𨈈𨐁𪈦𫊜",
 "𠄠": "冑𤣽",
 "免": "冤婏寃菟葂逸酁鵵㕙㛯㝹㭸䖘䨲𠅦𠒢𠓗𠓗𠓗𠕤𠗟𠣉𠷦𡅛𡇹𡙖𡤳𡤹𡤹𡤹𡤺𡤺𡤺𡩄𢉕𢱍𣃅𣈳𣬚𣬚𤧔𤸩𥋥𦂔𧥒𧥒𨍠𨩯𨿮𩄬𩆟𩋭𩣮𩸃𪫐𫁕𫴧𫺜𫿔𬌍",
 "莫": "冪濗羃𡃗𡫌𢆅𢸆𢸓𢺀𤂨𤅠𥀳𥵵𥷺𧄲𧕤𧕥𩇅𫮲𫲍𬔁𬣒",
 "戌": "减喊喴媙崴嵅感揻搣椷楲減滅煘瑊碱箴緘縅缄葳葴蝛觱諴輱醎鍼隇顑鰄鰔鹹麙黬㓕㙎㛾㨔㰹㺂䁍䖗䶠䶢𠁝𠊭𠋘𠔺𡚓𡞣𡢳𡫴𡫹𡯽𢆫𢜩𢨟𣁀𣙤𣜕𣤭𣸵𣽦𤊸𤜁𥔃𥠆𥻇𦄅𦑘𦞏𦧩𦩢𦩬𦸮𦿧𧁺𧇱𧍧𧛡𧥙𧥙𧥚𧥚𧭶𧯃𧾔𨃂𨜠𨩆𩕠𩝈𩤥𩮏𪂶𪉳𪔩𫍯𫶆𬐨𬕚𬵢𬺍",
 "覀": "凐歅湮煙甄禋緸諲鄄闉陻黫㖶㢾㷑䃌䓰䗎䚈𡇽𡨾𡫈𡬵𡲙𢌩𣱐𣱑𤚕𦈑𦝪𧛑𧹬𨕅𨶵𩘔𩧾𪃋𪬉𫴄𬤇𬪭𬮱",
 "六": "凕塓嫇幎慏暝榠溟熐猽瞑蓂螟覭鄍鼆㝠㟰㨠䄙䈿䏃䒌䫤𠋶𢳡𣩆𤣘𥌏𥻩𦃼𧇻𧔲𧜀𧱴𨎁𨢎𩈹𪒄𫶍𫸏𬂊𬢒𬯦𬯦",
 "幸": "凙圛墊嬕嶧慹懌摯擇斁曎檡歝殬漐澤燡盭睾礋縶繹蓻蕔蟄蠌褺襗謺譯贄醳釋鐸騺驛鷙鸅㒁㘁㝪䁺䆁䉅䐾䕉䙝䠟䥍䦴䭞䲀𠅀𠌷𠓋𠪯𠽃𠾷𡠗𡻢𡼈𢋇𢌀𢍰𢴇𢵨𣊎𣊓𣎖𣙀𣙗𣼳𤄁𤍠𤎒𤑹𤢕𤢟𤴢𤺴𤻂𥂕𥊍𥊝𥜃𥴆𥼶𦎷𦒡𦒢𦔥𦡇𦥎𨄴𨆅𨎌𨤟𨷂𨼸𩁇𩅀𩍜𩏪𩮿𩼓𪈓𪨡𪫙𪼢𫅌𫡊𫯇𫷼𫾟𬇓𬋳𬎍𬗵𬪒",
 "臣": "凞堅婜孯掔硻竪緊臓菣藏蜸豎賢贓鋻㒪㒪㵴㶊㷂㹂䁂䖙䭆䵖𠋪𡁧𡅚𡒉𡒤𡒥𡹩𡽴𡾻𢃥𢛶𢨑𣜠𤏿𤦁𤭠𤲗𤷌𤿳𥦞𦜌𦜜𦣴𦾐𧄤𧇜𧗄𧞀𧨭𧭅𧼒𨊙𨨘𩋆𩜬𩯩𩽮𪘦𪦑𪹬𪿻𫇉𫋟𫐸𬛦𬛧𬛧𬛩𬛫𬛫",
 "壬": "凭姙恁拰栠栣秹絍荏袵賃赁銋餁鵀㤛㳝㶵䇮䋕䛘䣸𠄶𠉰𠲉𠲏𠶉𡍛𡜟𡤊𢀫𢂧𣨮𤇲𤏼𤞘𥆂𥵎𦚮𦣨𦷺𧙨𨂘𨉃𨠲𨿂𨿃𩄸𩷀𪀼𪾮𫏊𫕤𫶭𬓧𬣯𬸊",
 "馬": "凴憑礟礮羈㒟㘐㜵㠡㩷㵗㶒㶠㺛䃵䯂䯂䯂𠘔𠫑𠫑𠫑𡁉𡁣𡃉𡄃𡄍𡅶𡆌𡓞𡳽𡾬𢤇𢤷𢶚𢸣𣟊𣟭𣰜𤅠𤆀𤆀𤆀𤺶𥂳𥖬𥗖𥜴𥤂𥤡𥤡𥤡𥽪𦌭𦌱𦍈𦍊𦡻𦢷𦿅𧕸𧝥𧞶𧟁𧟑𨆱𨝭𨯹𨰬𨳀𨽖𩟵𩠸𩦾𩧥𩽖𪅯𪝰𪞰𪦠𪯀𪸋𫓟𫬇𫬷𬉤𬕳𬰕𬴓",
 "乁": "刏忥忾氕氖気氙氚氛氜氝氞氟氠氡氢氣氤氥氦氧氨氩氪氫氬氭氮氯氰氱氲氳汽芞靔㐹㔕㡮㧉㪂㰟㲴㲵㲶㲷䏗𣅠𣏙𣒻𣱕𣱖𣱗𣱘𣱙𣱚𣱛𣱜𣱝𣱞𣱟𣱠𣱡𣱢𣱣𣱤𣱥𣱦𣱧𣱨𣱩𣱫𣱭𣱮𣱰𤴸𤽍𥙰𥝬𥤶𧉁𨕀𨗵𩛹𪌇𪗟𪨦𪬣𪵣𪵤𪵥𪵦𪵧𪸕𫊨㔕𬇏𬇐𬇑𬇒𬇓",
 "廾": "刑匥匴呏咞哢啽奔妍媕岍峅并弃形悈慿抍拚挵揜昇昪枅枡枿桒梇械汧泋渰漭烎研硦祴竔笄笲筭茾葊蚈蟒裓訮誡诫豜賁贲趼邢鈃钘锎開閞阩陹雃鞥駴髒鳽鴘黭鼖㐼㑘㑝㑞㓫㔍㕃㖑㛞㜒㟖㟿㢅㬒㭓㰘㰢㳎㳥㳦㴒㺛㺹㼛㿼䀘䁳䄯䍾䒎䒪䙹䛂䢎䢠䣲䥈䪻䮁䯵䵤𠆻𠇋𠉶𠊼𠑋𠛟𠝢𠤡𠦲𠦷𠦿𠧇𠧌𠧍𠱥𠸙𠻵𠾝𠿺𡃇𡆼𡉧𡉼𡊅𡊯𡋱𡌍𡌹𡍊𡎂𡏰𡐪𡗹𡛈𡛞𡫶𡯰𡱯𡳊𡷟𡹮𢂵𢃈𢆚𢇩𢌊𢌌𢍃𢍫𢍭𢍭𢐇𢓄𢕁𢖡𢗢𢙱𢚸𢜰𢞨𢟨𢡘𢧧𢬿𢱭𢱼𢳠𢶚𢼷𣀔𣂖𣃍𣃬𣅮𣉂𣋹𣙷𣝶𣢴𣥎𣫑𣭿𣯬𣰚𣼰𤀤𤈪𤛘𤝏𤞫𤞬𤠈𤣿𤯨𤯩𤲌𤶦𤼪𤾵𤿬𤿰𥊊𥑾𥓈𥕊𥘥𥚫𥦌𥧪𥨋𥮈𥮓𥳪𥹇𥾷𥿋𦃷𦈨𦐒𦝡𦟮𦧌𦬱𦭊𦯨𦰃𦸟𦿔𧇑𧉤𧋼𧍬𧗦𧙒𧚂𧚠𧜒𧟨𧩸𧬏𧲨𧿘𨁠𨁦𨃦𨊻𨋒𨌝𨐆𨐟𨒍𨓡𨔮𨕞𨕧𨖲𨘊𨚆𨚕𨛓𨛘𨠢𨡶𨨊𨪻𨬁𨮰𨰉𨲀𨴂𨵹𨶘𨸦𨹱𩀂𩂽𩅁𩓍𩝀𩝂𩝼𩦦𩩖𩫆𩿜𪁫𪂍𪂍𪂻𪊑𪌚𪎙𪔠𪔾𪗛𪜙𪟤𪣪𪣿𪧯𪪩𪫵𪰀𪰁𪶣𪻠𫃫𫑬𫒞𫔭𫔰𫖘𫛚咞𩒖鼻𫠯𫥌𫧧𫧪𫨄𫪹𫱐𫲟𫴕𫴳𫷩𫸷𬊊𬌳𬏇𬏖𬔍𬖆𬗕𬙺𬚼𬛲𬜦𬜽𬝕𬞦𬟎𬢢𬨠𬫞𬭋𬭾𬯧𬲙𬴑𬴧𬹦",
 "刃": "刱剙梕涊綛荵認躵㸾䏰䘐𠗋𠴍𢚴𣕝𤶝𥆾𥊟𥱋𦓖𦖆𧖷𨧟𨲅𩇻𩈢𩊫𪐁𪞹𪠱𪪄𪫫𪲠𫀷𫻉𫽅𫿼𬂾𬃒𬔚𬠍",
 "乃": "刴唀尮挅携槜琇綉绣芿莠蜏誘诱跥躱透銹鎸锈镌頺㑺㗡㚺㛆㛢㝦㩗㷪㺱㻪䅎䐪䑮䞬䱆𠃯𠉑𠐬𠯹𠱆𡥸𡦆𡦔𡲪𡶲𡺦𡾫𢓵𢘩𢫡𢭆𣋭𣐨𣒴𣜗𣮁𣵛𤁛𤒟𤥹𤯪𥏗𥙾𥢁𥣧𥤃𥩯𥿱𦏁𦰆𦽧𧚘𧥅𧥰𨀊𨈯𨦃𨴷𨸳𨹃𨹳𪁮𪐹𪜷𪝁𪣜𪸨𪺫𪽩𪾷𫇵𫢖𫩴𫭧𫰕𫲬𫵿𬆔𬊆𬊔𬎨𬚕𬚹𬱡𬹵",
 "术": "剎蒁鶐𣉐𣻚𦸇𨩔𩳘𪨜",
 "内": "剐娲寎怲抦昞昺柄氞涡炳焫病眪祸窉窝脶苪莴蒳蛃蜗蜹邴鈵锅陃陋鞆㑂㔷㖞㨅㨥㪅㶮㶽䇤䈫䋑䯄𠅈𠇮𠒝𠖘𠚇𠛥𠨆𠫧𠰳𠴠𠽆𡍝𡛦𡠈𡠈𡭃𡯞𡱆𢌒𢌒𢏺𢝦𢨿𢯬𢷡𢷡𣍪𣒌𣓃𣖀𣞬𣧰𣺭𤑣𤑣𤑣𤖶𤤝𤯳𤯽𤵿𤹽𤼄𥅙𥠛𥧃𥰑𥱗𥲼𥹘𦄠𦄱𦜬𦭯𦳭𧅳𧅳𧗚𧗚𧢮𧢮𧥗𧥗𧦿𨉓𨋣𨌣𨕈𨜦𨟫𨟫𨦖𨧨𨪣𨳵𨹟𩄵𩇽𩇽𩋸𩋹𩌻𩛄𩤳𩩹𩬝𩱪𩶁𩹐𩺂𩺂𩺈𪋘𪋘𪣃𪥇𪥓𪨹𪪃𪪻𪬻𪭙𪵠𪹄𪽲𫍩𫐣𫒾𫚎𫠥𫡬𫥤𫧯𫷻𫽀𬀥𬅥𬇞𬈇𬍈𬏮𬙵𬝦𬧮𬨨𬫚𬯜",
 "彑": "剝喙掾椽橼淥湪猭瑑璏盠祿禒篆綠緣缘腞蒃蝝蠡褖錄餯龣㑰㥟㯟㰘䂕䗍䘵䛹䞼䤸䧘䱲𠷍𡒰𡓬𡩀𢅞𢍝𢐄𢑾𢒚𢞶𢮑𣂵𣈬𣨶𤊺𤬌𤬤𤷚𤸁𤽺𤿴𥂻𥂼𥪋𥯵𦑙𦧫𦧬𦪶𦼋𧁸𧌍𧨹𧳩𨂦𨌠𨔵𨙅𨣰𨮦𩀅𩄖𩌁𩓪𩔂𩘐𩫚𩫞𩻼𪋵𪋵𪍄𪑔𪤐𫀿𫩁𫲌𫹇𫺟𬗧𬙐𬯧𬺠",
 "⺢": "剝淥祿綠錄龣㯟䘵𠷍𢅞𢑾𢒚𢮑𤷚𤽺𤿴𥪋𦼋𧌍𧨹𨌠𨮦𩓪𪋵𪋵𪍄𪑔𬙐𬺠",
 "丰": "剨嘒嘒峯峰帮幚慧慧挷捀暳暳桻梆槥槥浲湱烽熭熭琒篲篲絜綁綘绑艂莑蔧蔧蛪蜂觢轊轊逢鋒鏏鏏锋韸騞髼齧㖓㗉㛃㛔㨹㨹㶻㸷㸼㻰㻰㼤䀱䂮䏺䛚䦁䧏䨮䨮䴶𠉏𠳐𡊷𡨛𡬨𢀥𢄣𢄣𢈦𢌢𢑹𢑹𢓱𢝇𢟩𢟩𣇔𣟀𣵮𤑊𤖀𤶞𥍮𥒷𥭗𥮇𥹾𦄑𦄑𦄜𦒄𦒄𦚨𦜁𦜅𦪪𧋴𧑨𧒒𧚋𧧽𧳳𨎳𨡃𨧜𩄦𩊩𩏚𩏚𩡇𩷭𪀡𪔞𪥶𫐕𫐕𫑢𫜩𫩬𫳯𫳯𫷪𫺎𬫣𬭬𬭬𬴃",
 "石": "剨啱嚰揅揼湱礳耱菪藞藞藞蘑趤饝騞驝㔏㔏㔏㗞㛧㩡㩡㩡㮟㰁㰁㰁䂶䊙䕢䤺𠁻𠁻𠁻𠊜𠐞𠐞𠐞𠦦𠻅𡀬𡂳𡂳𡂳𡃜𡇵𡎵𡓃𡓃𡓃𡕎𡕎𡕎𡤟𡤟𡤟𡫱𡳥𡺻𡽛𡾏𡾏𡾏𡾖𡿈𡿈𡿈𡿛𡿛𡿛𢋧𢋧𢋧𢝇𢣃𢤡𢤡𢤡𢸨𢽡𣔧𣗁𣟄𣟖𣩸𣷰𣸐𤂬𤂬𤂬𤃶𤃹𤊤𤑭𤑭𤑭𤢿𤢿𤢿𤷳𤻒𤻳𤻳𤻳𥇷𥒳𥔨𥔩𥕔𥖑𥖓𥖕𥖖𥖺𥗐𥗐𥗐𥗤𥗤𥗤𥗵𥩀𥫌𥫌𥫌𥯉𥯩𥵔𥶲𥶲𥶲𥽨𦇒𦇒𦇒𦳵𦺫𦿆𧌹𧔬𧖌𧖌𧖌𨇒𨇒𨇒𨇢𨊚𨊚𨊚𨏒𨏒𨏒𨟖𨟟𨟥𨟥𨟥𨧩𨨵𩃼𩜠𩟬𩟬𩟬𩧍𩧍𩧍𩧐𩯹𩯹𩯹𩸶𩽊𩽊𩽊𪒽𪒽𪒽𪜘𪝬𪤬𪤬𪤬𪥾𪦆𪬅𪯞𪼪𪿫𪿸𪿸𪿸𪿹𪿽𫃫𫄆𫊑𫓅揅𫡎𫡎𫡎𫦢𫪴𫫪𫬮𫮒𫱑𫴷𫴷𫴷𫶗𫾊𫾚𬃖𬄯𬅓𬅓𬅓𬆜𬊲𬍰𬒜𬒧𬒩𬗩𬚩𬚩𬚩𬛔𬜽𬝻𬞚𬠲𬧥𬪮𬬓𬲿𬴃𬴎",
 "冎": "剮卨喎媧旤楇歄渦煱猧瘑碢禍窩緺腡萵蝸諣踻過鍋騧㢐䈑䫚䯞𠊰𠧅𠷏𠹬𡐫𡖿𡥾𡹬𡺩𢝸𢢸𢧘𢰸𣁘𣂄𣄸𣨱𣨷𤧗𤬋𥂡𥈓𥠁𥨵𥨸𥶤𧎏𧷴𨍋𨗲𨗷𨵧𩝄𩮑𩹢𪃀𪍌𪎩𪙃𪬋𫊇𫑌𫑑𫬢𫵭𬩕𬩟𬩧",
 "合": "剳劄匒啽嗒嗱噏媕嬆嶖揜搭撘榙歙渰湁溚潝熻瘩箚葊褡譗蹹鎝鎿镎闟鞥鞳黭㒆㗳㘛㙮㜓㟷㩉㪧㬁㬛㯓㯚㲮㽂㽏䁯䌋𠌧𠍹𠎨𠝢𠟊𠢡𠵏𡈐𡦸𡹮𡼪𢍡𢜰𢟉𢠏𢵰𣉂𣓫𣩾𣯈𣯚𣯾𣰅𣹱𣽛𤏧𤛣𤡿𤨑𤺥𥁿𥂜𥂨𥔽𥚫𥰊𥲥𦈘𦖿𦗧𦝡𦞂𦪙𧀟𧍬𧕙𧝅𧝡𧩸𧬈𨃚𨅞𨎰𨝫𨢴𨣏𨱏𨶀𨶼𨸉𨻇𩀂𩁮𩌼𩍈𩞰𩥠𩰙𩺗𩻵𪂻𪅲𪣺𪤒𪧹𪼜𪾾𫈰𫋓𫋞𫓌𫣽𫦏𫧻𫱗𫽆𫽞𫽰𬎐𬖸𬖻𬠹𬢿",
 "生": "剷惺戥摌暒湦滻煋猩瑆甧甧睲篂簅腥蕤虄諺謃醒鍟鏟隡鯹㚅㦃㯆㶙㽓㽓䃏䗌𠐭𠞏𠞏𠬋𠶞𡟙𣋀𣋮𣌌𣌜𣨾𣮶𣹴𣻓𤅏𤅏𤯿𥠀𦖤𦩠𧛟𧡶𨖬𨩛𨭲𩄆𩤵𪞃𪡾𪱊𪱎𪻹𫎻𫠛𫤢𬀶𬁖𬁚𬂑𬉚𬴄𬶢",
 "果": "剿勦摷樔漅璅窼繅缫罺轈鄛鏁隟㑿㺐䉓䊬䜈䟁䲃𠞰𠻥𡏮𡡊𡻝𢀊𢀋𢀌𢀌𢵵𢸠𣋾𣝞𣩓𤁖𤍒𤑗𥌥𥕘𥧵𥲀𥼧𦆪𦗔𦟳𦸛𧁸𧄩𧅬𧈈𧈊𧑀𧘀𧷣𨄓𨢪𩍀𩏙𩫥𪅕𪍨𪳰𫉻𫲁𬨓𬭲𬶯𬷰",
 "欮": "劂噘嶡嶥憠撅橛橜灍獗蕨蟨蟩蹶蹷鐝镢鱖鳜鷢㙭㜧㵐䙠𠎮𠢤𠢭𡡕𢅅𢴺𤛦𤺤𥕲𥕳𥗮𦠑𦪘𧂱𧽸𨇮𨬐𩀾𩦒𪆙𫞝𬘒",
 "⺮": "劄匴噬囖孂幯憡撘擌擳擶攥樦橁檱櫛櫡櫤滗潷澨瀄癤筚箰艞蠞譗遾鏼鱵鳤鷑㒐㔍㗛㗳㘉㙮㦢㩍㩐㭀㯚㰏㲮㵺㶕㶘㸅㻶䊴䌣䒀䗗䗴䗻䘊䲘䲙𠍹𠐉𠑥𠟅𠠀𠠑𠠬𠢙𠢡𠽩𠿫𡀜𡄍𡅉𡅌𡅎𡒬𡓆𡓞𡠞𡠨𡮜𡳽𡼪𡼸𡾬𢆁𢞖𢤝𢤣𢤷𢥆𢥣𢥰𢲑𢲹𢴈𢴩𢵀𢶅𢷙𢷷𢸢𢸥𢸿𢹈𢹱𢹺𢹽𢺅𢺜𢿸𣀔𣀖𣃇𣃍𣃑𣈨𣉧𣔼𣖰𣘜𣘠𣘧𣘷𣙫𣙭𣙱𣛩𣝁𣝃𣝕𣝶𣞂𣟔𣟹𣠉𣠑𣠓𣠰𣠹𣠺𣫑𣫢𣰚𣰳𣰴𣻜𣽛𣽤𤀤𤀥𤁈𤂳𤃾𤄙𤅄𤅔𤅕𤅰𤏧𤏫𤒘𤒪𤔯𤡿𤢇𤪔𤪪𤯸𤺥𤺭𤻥𥌫𥗁𥗖𥗥𥢜𥣮𥤇𥤖𥪸𥮯𥯗𥯱𥰊𥰫𥰰𥰴𥰿𥱆𥲘𥳪𥴹𥵼𥶊𥶬𥸉𥸤𥼕𥽪𦄙𦅯𦇃𦗧𦠱𦣈𦪵𧏣𧜕𧝡𧞶𧫑𧲌𨅁𨅗𨅞𨅸𨇸𨈁𨈋𨖃𨖎𨖬𨖷𨘉𨙌𨣏𨬎𨬻𨬼𨬾𨮰𨮱𨮼𨮿𨯥𨯹𨯽𨰉𨰝𨰭𨲡𨼵𨼹𩀩𩍈𩍮𩞰𩟵𩠸𩻒𩽖𩽣𪇳𪈁𪈓𪈢𪉕𪒹𪚈𪛒𪛔𪟕𪡾𪢉𪢑𪦴𪧯𪴅𪴌𪴧𪼋𪾾𪿄𪿺𫀣𫂎𫂨𫂪𫂮𫃖𫄂𫄏𫄘𫅲𫌙𫍕𫑎𫓌𫓤𫙳𫛎築䗗𫤐𫦒𫦝𫫝𫬧𫮨𫹠𫽢𫽳𫾏𫾑𫾡𬄏𬅚𬈏𬉤𬊯𬋰𬎐𬎡𬒫𬕓𬕫𬕳𬕹𬕺𬕼𬕾𬖅𬖆𬖉𬖸𬗺𬘈𬙀𬜛𬡦𬡱𬧍𬬂𬭾𬮃𬴓𬴟𬵚𬵭𬵾",
 "兼": "劆嬚濂燫簾臁薕蠊譧鐮镰䆂䭠𠓌𠿳𡄫𡫐𢅏𣀃𣀊𣍙𣜰𣝈𣟚𣤤𤁦𤬚𤻑𥋲𥖝𥽎𦆆𦤩𦧷𧞋𧸖𨎷𩆌𩪬𩼔𪬸𪼥𫄔𫅸𫍓𫯙𬁛𬖄𬴯𬶶",
 "隻": "劐嚄嬳彟彠擭檴濩獲瓁矆矱穫籆耯臒艧蠖護鑊镬雘韄頀鱯鳠鸌鹱㠛㦜㬦䉟䨼䪝𢥵𢥵𨈂𨈂𪇡",
 "自": "劓嗅嘷嚊媳嬶寱嵲搝擤暞曍橰殠溴濞熄獋甈瘜皥矏糗翺臲蒠螅螑襣鄎鄓鎳鎴镍闑鷍鷱鼼鼽鼾鼿齀齁齂齃齄齅齅齆齇齈齉㓷㙞㮩㱗㴧㴪䆿䑄䕗䠗䡻䫵䭒䰓䶊䶋䶌䶍䶎䶏䶐䶑𠏿𠒸𠹑𠺒𡠖𡬒𡰆𡰈𡺼𡽶𢋛𢣦𢥔𢥷𣗬𣜮𣞌𤂃𤚯𤢳𤩢𤻖𤻦𤾚𥉒𥢐𥰝𥽙𦒥𦞜𦤕𦤙𦤚𦤞𦤟𦤠𦤡𦤢𦤣𦤦𦤧𦤨𦤪𦤫𦤬𦤮𦤯𦤰𦧯𦧰𦫱𧗗𧞠𧢌𧪩𧬁𧯌𧽒𨃔𨃡𨎦𨝲𨞑𨞳𨶑𨻁𨻄𨼍𩀹𩈸𩏤𩔨𩕍𩕬𩝠𩡗𩫬𪃼𪄛𪕿𪖐𪖑𪖒𪖓𪖔𪖕𪖖𪖗𪖘𪖙𪖚𪖛𪖜𪖝𪖞𪖟𪖠𪖡𪖢𪖣𪖤𪖥𪖦𪖧𪖨𪖩𪖪𪖫𪖬𪖭𪖮𪖯𪖰𪖱𪖲𪖳𪖴𪖵𪖶𪖷𪖸𪖹𪖺𪖻𪖻𪖼𪖽𪖾𪖿𪗀𪗁𪗂𪗃𪛎𪤨𪬤𪳳𫇌𫇍𫔶𫗅𫜤𫸣𫺱𫺽𫽿𬍂𬔏𬛯𬪞𬪟𬳋𬳌𬹯𬹰",
 "畀": "劓嚊嬶擤濞襣鼼鼽鼾鼿齀齁齂齃齄齅齆齇齈齉䑄䕗䶊䶋䶌䶍䶎䶏䶐䶑𠏿𡽶𢋛𣽠𤀥𤻖𦤫𦫱𧗗𨞳𩕬𪕿𪖐𪖑𪖒𪖓𪖔𪖕𪖖𪖗𪖘𪖙𪖚𪖛𪖜𪖝𪖞𪖟𪖠𪖡𪖢𪖣𪖤𪖥𪖦𪖧𪖨𪖩𪖪𪖫𪖬𪖭𪖮𪖯𪖰𪖱𪖲𪖳𪖴𪖵𪖶𪖷𪖸𪖹𪖺𪖻𪖼𪖽𪖾𪖿𪗀𪗁𪗂𪗃𪤨𫗅𫜤𬹯𬹰",
 "麻": "劘嚒嚤嚰嬤嬷孊懡戂擵攠灖爢礳耱藦蘑蘼醾醿釄饝㸏䃺䊳䭧䭩𠘚𠠒𠠣𡾉𢑀𢣗𢣾𣟖𤃰𤜘𥗂𥽨𥽰𦇑𨇢𨟖𩉌𩟠𪎫𪎮𫾚𫾝𬟊𬳔",
 "非": "劘孊嶵戂攠榧檌灖爢篚蕜蘼釄㔈㠑㥱㩑㪪㯇㰆㸆㸏䃺䊫䊳䕁䙣䭩𠌨𠍣𠎩𠓿𠖤𠼕𠾦𡀪𢌑𢴾𢵪𢾺𢾻𣂇𣞳𣠻𣡖𣤆𤃍𥠶𥼠𦈗𦻔𨅥𨗻𨘴𨯕𨻃𩇼𩇿𩥰𩦎𪎫𪎮𪪈𪯭𪳧𪶬𪷕𪺵𫄐𫅰𫇟𫚄𫣶𫨯𫨰𫬍𫮦𫷞𫿟𬄟𬈺𬠯𬲊",
 "彖": "劙墬攭櫞欚㒩㼖䤙𢥾𢷻𢸢𤪪𤼠𥌫𦧽𦫈𦺛𧅮𧑝𩽵",
 "䖵": "劙攭欚爞蠱㒩㼖䘇䘉䤙䥰𠤋𠥨𡆂𢥕𢥞𢥾𢺨𣡢𤅧𤜗𤼖𤼠𥸢𦧽𦫈𧅮𧒢𧔃𧔨𧔴𧔻𧔼𧕑𧕒𧕷𧕹𧕽𧕿𧖁𧖈𧖓𧖕𧖛𧖟𨙥𨰍𨷷𩫲𩽵𫯀",
 "万": "励澷蛎𠸼𤇃𪴂𪵱𫟫𫥵𬣴",
 "𠂋": "劶垕姤栀梔洉缿茩詬诟逅郈銗骺鮜鲘㖃㤧㧨㯄㸸㻈䞧𠵲𠵳𡜮𡢐𡧻𡭐𢬯𣢨𥅠𥒖𥙐𦓝𧊛𧙺𧮶𧱒𧲿𨋜𨌌𩗇𩷴𪁆𪊪𪘇𪢈𪯬𪲉𫀱𫝴𫩲𫪣𬖙𬭅𬷎",
 "圥": "勎埶淕燅睦稑踛逵錴陸鯥鵱㓐㛬䡜𡎐𢑫𢯅𢴸𣔭𣤶𤁄𤎮𤏝𤭝𥓪𥚊𦁪𧌉𨎐𨞬𪂚𪸷𪻧𪽘𫸒𬀻",
 "旲": "募嗼墓嫫寞幕幙慔摸摹暮暯模氁漠獏瘼瞙糢縸膜蓦蟆蟇謨謩谟貘鄚鏌镆饃驀鬕㱳㵹㷬䮬𠢓𠻚𡖶𡠜𢟽𢨃𣩎𣯳𥕓𥡸𥱹𦟦𦷤𦹪𦿉𧃊𧅌𧆙𧒳𧷸𨢢𩄻𩌧𩐍𩐖𩐻𩻁𪅐𪍤𪏟𪝡𪷂𫄲𫔩𬎇𬑤𬞿𬹍",
 "坴": "勢摰暬槷槸熱蓺褹褻驇㙯㰊䕭䞇𠪑𡂞𡠦𡫑𢄢𢅮𢳊𢸧𢸱𤍽𤮅𥡩𥲎𦸐𦽂𧃳𧅩𧜼𩕜𪧢𫮛𬓺𬞝𬷮",
 "禺": "勱厲噧澫燤癘蕅藕蠆蠇贎躉邁㒖㦙䊪䖁䘍䜕䴁𠏋𠽀𠿄𡪾𡫢𡳱𡳲𡽇𢠉𢠙𢡎𣛡𣼱𣿃𤛶𤢥𥍈𥍎𥖣𥜍𥨱𥴪𦔧𦸲𦼌𧄴𧾗𨆣𨙗𨭬𨲴𨷈𪈀𪒪𪯁𪵒𪽹𪿀𫑈𫙽𫛙𫮮𫴆𫾆𬒪𬕽𬚑𬞒𬟍𬯥",
 "萬": "勵囆巁曞櫔濿爄爡矋礪禲糲蠣鱱𠠏𡂖𡓧𡿋𢤆𢺉𤜒𤢵𤪲𤼚𥣭𦆨𧓽𧔺𧖄𧞵𧢝𧮇𧮚𨇆𨙚𨞺𨯅𩧃𪙺𫬱𬩤",
 "育": "勶𤁲𨇂𪹲",
 "身": "匑匔榭窮竆謝谢麝㓔㴬𡭉𡺺𢲌𤚑𤠭𥩄𥱈𧎭𧛼𨊘𩘧𪇣𪇣𪈨𪈬𪋧𪧤𪧻𪿎𫬀𫷺𬙥𬮏𬳢",
 "弓": "匑吲娹婱宖彂惤泓涨渳湾漲瀰灣焪猕獼瓕瘬矧窮粌紖紭纼苰葞蚓訠誸鈏霛霛霛靷鞃鬻鬻麛㙣㜷㟜㡉㢲㢲㢸㢽㥝㭹㯑㳽㽼䀕䇙䉲䏖䒡䕬䕳䘎䛪䠻䡏䥸䨎𠀓𠇁𠒒𠣀𠣃𠥚𠰈𠴀𠴀𠵸𠶥𠷎𠼡𠽂𠾉𡃮𡄣𡑹𡓭𡕋𡗵𡛅𡝠𡤶𡸕𡹗𡺺𡾪𡾱𡿞𢅂𢅱𢊜𢏄𢐑𢐑𢐓𢐘𢐘𢐜𢐜𢐩𢐫𢐫𢐭𢐭𢑅𢑅𢘌𢛆𢛙𢠤𢢧𢪉𢫠𢮂𢮍𢮫𢳫𢶈𢺯𢿟𣇬𣏖𣐜𣓔𣚑𣡩𣪾𣫟𣴦𣶆𣾭𤎧𤛴𤩈𤮔𤲮𤳕𤳕𤺜𤻾𤾊𤾦𥏩𥓰𥛇𥜣𥥈𥪷𥪷𥮜𥮰𦇤𦒛𦒯𦓃𦙢𦦺𦱁𦲄𦸾𦺚𧆅𧐊𧖑𧟂𧢖𧼏𧿯𨂺𨄰𨅡𨈊𨈧𨡗𨣊𨣾𨥺𨧮𨧻𨨮𨯞𩇃𩇃𩘿𩤫𩦑𩸹𪆀𪆀𪋈𪓯𪜴𪨭𪨮𪵰𪸡𪿓𫓎𫓎𫕘𫙒𫛇𫢏𫣖𫫧𫯅𫳆𫳆𫸬𫸷𫸺𫸺𫸿𬊨𬍝𬑫𬣗𬦵𬬠𬭂𬶥",
 "吕": "匔榈櫚竆䕡䥨𤁵𥶆𪬠𫣇𫣈𫶕𬪊",
 "乚": "化叱吼唴啂湚溬犼猐琷紥紮羗芤蚻蜣錓錷㐠㛨㣧㳐㳶㳾𠄀𠄇𠄉𠉗𠊡𠖆𠯩𠲥𠵣𠸕𠻁𡇲𡋀𡔵𡚧𡝦𡠎𡥑𡦀𡨻𡬎𡬎𡬎𡮈𡮑𡰼𡲐𡵾𡸗𡸲𢆡𢉚𢗵𢙔𢪬𢫄𢬦𢮊𢯚𣈃𣉷𣏺𣑶𣘎𣲞𤆺𤭤𤵦𥇉𥇽𥓌𥘶𥘷𥙒𥙓𥙧𥙩𥙪𥚄𥚅𥚇𥚤𥚥𥚯𥛉𥛭𥜤𥤾𥥅𥯇𥾱𦍑𦏱𦏱𦏱𦙋𦙥𦜘𦮲𦯠𧇞𧉒𧉔𧉹𧎉𧎠𧴦𨞰𨢂𨥼𨦂𨨜𨼼𩫂𩷋𩸐𩸑𩹦𩿤𪁸𪉬𪜛𪞺𪣂𪨩𪲞𪾬𫁎𫃛𫓳𫛠𫩉𫩵𫩶𫰣𫴺𫸱𫹕𬁿𬋲𬌢𬒄𬒒𬒸𬒼𬓐𬓓𬗆𬙞𬝆𬦃𬦼𬮽𬯰",
 "爿": "匨奘娤弉梉焋臧莊蘠裝銺䊋𠨡𡍱𡘾𡝂𡸤𢈜𢙳𣈈𣈚𣉚𣴣𣶍𤞛𤶜𤽸𥇴𥇺𦀜𦟃𦲚𧚌𨌄𨡈𨡧𩈪𩕩𪭿𫤵𫧾𫳼𫻶𬌋𬛿𬨋",
 "屮": "匩咄屈弢忁拙旹昢朏柮欪泏炪础祟窋笜粜絀绌茁蟗袦詘詜诎貀趉鈯韷飿黜㑁㒴㔘㤕㫞㽾䂐䖓䖦䠳䢺䪼䭯𠀴𠍧𠒄𠕐𠕓𠘼𠙕𠚐𠥱𠩃𠩉𠪭𠭴𠰕𠲫𡈫𡈱𡌜𡑥𡒈𡕜𡖴𡛛𡣼𡧨𡭧𡭱𡭲𡮖𡯭𡯲𡲒𡲗𡲬𡲶𡳼𡴠𡴠𡴠𡴨𡴨𡴨𡶏𡶸𡹏𡽈𢅇𢇿𢋱𢓸𢖚𢝿𢢡𢥁𢥁𢥁𢥟𢭧𢮬𢰛𢶗𢶵𢷎𢷎𢷎𢹄𢹄𢹄𢹯𢼍𢽅𢽘𢾈𢾍𢾕𣀎𣂯𣅽𣈤𣈤𣈤𣉱𣊻𣋦𣌑𣍧𣐯𣕐𣕐𣕐𣕿𣦧𣦬𣧪𣪹𣭑𣽶𣿗𣿲𤄗𤋪𤏺𤑥𤒁𤒺𤓊𤜌𤝒𤠥𤠥𤢝𤬷𤬼𤱟𤸿𥀑𥎐𥙋𥚢𥜺𥞃𥣼𥨺𥪃𥫋𥫋𥺋𥽀𦋦𦗷𦛳𦣃𦤙𦨃𦨥𦪰𦭩𦱡𦱡𦱡𦱢𦱢𦱢𦱧𦱧𦱧𦱶𦱶𦱶𦱺𦱺𦱺𦴘𦴘𦴘𦴬𦴬𦴬𦵛𦸶𦻇𦻇𦻇𦽠𧒥𧙉𧙦𧟊𧬉𧬲𧭁𧮔𧰹𧵠𧷓𧷲𧷵𧸞𧸟𧿺𨋡𨌗𨒞𨖮𨗯𨱄𨱦𨲶𩂗𩌮𩍞𩍽𩎇𩕣𩕵𩖷𩟜𩢎𩪨𩬢𩶌𩼡𩿩𪏫𪐽𪓶𪔫𪔫𪔫𪗊𪗨𪞷𪞹𪞺𪠒𪨀𪨕𪫜𪲵𪵁𫥤𫥧𫥨𫥫𫥬𫥭𫦠𫪇𬁹𬅨𬑎𬣥𬩐𬮉",
 "雈": "匶嚿欍𦧃",
 "𠤎": "华厑吪哛唜喸囮夞巼廤杹桦沎炛花訛讹貨货鈋靴魤𠇃𠕿𠯒𠳢𢪎𣾳𤆷𥄒𨱂𩑭𩲏𩲜𩾹𪜐𪝁𪢼𫅁𫅳𫇹𫒐𫔛𬍕𬖒𬟹",
 "糹": "卛卛喲噝嚩圝圝奱奱嬵孌孌孿孿巒巒彎彎戀戀攣攣曫曫檰櫞欒欒濰灓灓矊矕矕箹羂羄羅羉羉臠臠葒葤葯蒓蒳蒶蔠蕬藧蘊蘕蠻蠻變變鐑鑾鑾鶭鸞鸞㒙㘘㘘㡩㡩㨥㩪㪻㪻㯞㱍㱍㽋㽋䈙䈫䈺䏈䔋䕑䗽𠎨𠖘𠣈𠣈𠨫𠨫𠮓𠮓𠮖𠮖𠶹𠸣𠺻𠾼𡁇𡃃𡈡𡟅𡤣𡤣𡤨𡤨𡫂𡳍𡾽𡿘𢋘𢌕𢌕𢍶𢍶𢞃𢢂𢣘𢰹𢳉𢵰𢷻𢺈𢺈𢺲𢺲𣀵𣀵𣍚𣖘𣚬𣝵𣦱𣦱𤀼𤀽𤄋𤅇𤅇𤒔𤡨𤫜𤫜𤻕𤻶𤼙𤼙𥀺𥀺𥲛𥵤𥵹𥵻𥶍𥶳𥷞𥽄𥽵𥽸𥽸𦁷𦂞𦃟𦆃𦆝𦆩𦇥𦇥𦇷𦇷𦇹𦋝𦋽𦌢𦌪𦌰𦌴𦌶𦌾𦍃𦣋𦣋𦦽𦦽𦫲𦫲𦶆𦷺𦹄𦺢𦽁𦾯𧀇𧀊𧀠𧁭𧃒𧄑𧄕𧄶𧄶𧅂𧈆𧖦𧖦𧟏𧟏𧟗𧟗𧮌𧮌𧼿𨏯𨏯𨖾𨗟𨭑𨰼𨰼𨰽𨰽𨷀𩄵𩇏𩋰𩕛𩙟𩙟𩺈𪆋𪆓𪈜𪈮𪈮𪈽𪈽𪢍𪦏𪦤𪦥𪭗𪭗𪵠𪷉𪷜𫃛𫄐𫄒𫄕𫉇𫊃𫊄𫋘𫌒𫎰𫒾𫓙𫘖𫙶𫨛𫫴𫮸𫯼𫱫𫴥𫴥𫵊𫷏𬄗𬔕𬕡𬗱𬗶𬗸𬗻𬗽𬗿𬘅𬚎𬞻𬞼𬟋𬟍𬟕𬡴𬧐𬧗𬧮𬯨𬯨",
 "卩": "卵啣喞御昻笻脚腳踋㮝㾡䖼𠊬𠨙𠨦𠨳𠬨𠭞𠳞𠶸𡖉𡥭𢓷𢔘𢔱𢕜𢘴𢘵𢚿𢛠𢜭𢭙𢻮𣒗𤓲𤷽𦃁𦖐𦘛𦘜𦘡𦭎𦱡𧌋𧍕𨌞𨍖𨓴𨨶𩲂𪀃𪩆𪫸𫢜𫧻𫺕𫾸𬁤𬍨𬗞𬦨𬫈𬫜",
 "氶": "卺巹拯洆烝㷥䇰䒱䕄䡕𠜉𠱺𡶽𢀿𢏞𢓞𣑕𤇶𥒡𦚦𦛆𦜕𧊴𧗆𨀧𨋬𨚱𩊨𪎻𫴏",
 "余": "厁塗溆滁漵潊瑹篨蒢蒣蒤鷋㙦㾻䅷䔑𠻬𡍼𡲰𢡣𢲢𢴉𣉯𣉹𣘻𣻄𣻠𥂋𥱻𦺪𧃋𨝛𨢬𩥽𩻓𪄫𪡷𪣶𪣸𪯯𪯰𪶢𪹘𫿸𬁊𬉣",
 "斗": "厁唞嘝嵙槲櫆濣窲萪蔛蝌㕏㙦㟕㩂䈖䈸䌀䔑𠺫𡀃𡐗𡦶𢱃𢷪𣂋𣘳𣶉𣻠𤁔𥡿𥧇𧎗𨮊𪇫𪍎𪏡𪭸𪯯𪯰𫁚𫃼𫽒𫿸𬃐𬅰𬈎𬝮𬞴𬬖",
 "水": "厡崉揼柡栤楾様涾淼淼湶濌瀪灥灥灥瑔線缐脲腺葲觨誻踏銾錔闎鞜騡鰁鳈㛥㟫㣐㧺㩩㭼㳮㵘㵘㵘㵘㶗㶹㹺䂿䄕䈋䍝䎓䓠䤼䵬䶁𠀯𠃮𠉢𠉤𠊥𠊥𠗯𠜟𠪰𠫒𠫒𠫒𠱁𠳃𠴲𡂊𡌩𡎏𡡺𡷷𡺙𢃕𢝓𢫁𢬄𢽜𢽷𢿬𣐚𣑏𣒩𣛁𣝭𣭼𣶙𣶙𣸐𣸕𣸞𣸞𣹻𣻌𣻮𣾜𤀁𤀁𤀁𤃗𤆁𤆁𤆁𤆁𤝣𤦊𤭯𤿽𥒜𥔨𥠘𥣤𥷟𥷟𦀋𦑇𦕷𦧞𦧟𦧥𧁆𧋔𧌏𧍭𧛆𧪒𧼷𨋲𨌭𨐛𨓪𨓬𨜩𨡍𨡹𨬛𨬛𨵝𨶺𩎽𩒴𩗢𩘘𩣯𩩺𩭣𩷽𪂌𪡠𪫽𪳢𪵿𪸊𫃱𫆹𫇋𫎶𫏘𫑌羕𫥇𫪴𫿧𬇟𬇱𬈔𬈜𬉖𬉨𬉯𬉱𬎺𬓈𬓜𬢩𬦋𬧴𬩏𬪷𬫠𬬟𬭣𬯏𬵌",
 "屰": "厥嗍塑愬搠槊溯瘚磀縌蒴蝷遡遻鎙闕阙㦍㮶㴑䣞𠊴𠟎𠸺𡍩𡏤𢍥𣖬𣺩𥉮𦃉𦃗𦗄𦞮𧪜𧫋𩺝𪄧𪇐𪲫𪹛𫏤𫏮𫒼𫔈𬂚𬂚𬂚𬶪",
 "𦣻": "厦嗄嘎廈榎衟䭬𠌘𠌛𡏘𡕵𡖃𡖃𡖃𡙣𡟺𡺷𢟟𢧖𣼸𤎾𤧶𤹉𥔹𥧜𥻴𦥍𦷜𦸘𧈄𧏡𨬜𩡘𪄂𬫿𬲚𬳎",
 "咎": "厬𣽞",
 "猒": "厴嚈壓嬮懕懨擪擫檿靨饜魘黶㱘𡽣𢅠𣝓𤳪𥀬𥌅𥜒𥣘𧗖𧞣𨽀𩼴𪱑𫨥",
 "隶": "叇嫝嵻慷曃槺漮穅糠躿鏮靆鱇㝩㱂䆲䗧𠻞𡐓𡐡𡻚𢠻𤮊𥉽𥊵𥌿𥕎𥷗𧑔𨄗𨎍𨝎𨻷𩻸𩾌𪏢𪒡𪴛𫂞",
 "幺": "呦嗞嗞嚒嬤孧孳孳孶孶岰嵫嵫幽幽怮慈慈懡抝拗柪泑湚溼溼滋滋狕甆甆盭眑磁磁禌禌稵稵窈糍糍聫聫苭蚴螆螆袎詏軪鎡鎡镃镃靿鰦鰦鴢鶿鶿鷀鷀鹚鹚黝㑃㕄㘭㡬㡬㣧㶭㺦㺦㽧㽧䈘䈘䒛䩘䬀䱂𠂳𠅹𠆺𠢢𠬯𠯻𠲭𠶽𠶽𠸕𠸰𠹿𠹿𡋢𡋢𡌝𡙛𡙛𡙠𡙠𡛙𡞰𡞰𡢫𡢫𡢵𡲍𡵿𢀟𢂅𢂊𢆽𢇆𢇉𢇊𢇋𢇏𢇏𢇑𢇑𢇔𢇖𢇖𢇨𢏁𢓎𢖡𢖡𢣗𢩃𢰩𢰩𢹶𢹶𢻽𣂾𣂾𣅺𣍒𣍒𣏳𣕜𣕜𣜑𣜑𣢜𣢢𣧥𣲑𣺝𣺝𤀟𤀟𤂇𤂇𤤬𤧹𤧹𤮀𤮀𤱎𤲸𤲸𥁒𥄠𥑑𥖃𥖃𥥆𥬓𥹱𥿌𦔒𦔒𦖺𦖺𧁖𧁖𧎠𧛏𧛏𨢂𨱧𩈏𩉌𩉷𩑴𩝐𩝐𩟠𩢒𩬗𩼑𩼑𪀂𪀨𪀨𪇔𪇔𪊛𪑿𪑿𪜆𪜆𪪋𪪋𪮵𪮵𫋔𫋔𫓣𫓣𫚤𫚤螆螆𫠩𫠩𫧠𫧠𫲣𫳀𫷠𫷠𫷡𫷡𫷢𫷢𫷣𫷣𫷤𫼡𫽪𫽪𫿙𫿙𬂋𬂋𬇚𬇿𬋄𬋄𬏠𬗭𬗭𬝘𬝘𬣦𬨳𬹪𬹪",
 "也": "咃崺怹拖揓暆柂椸沲湤炧狏砤筂箷粚絁胣葹袘迤鉇鍦陁駞㒾㢮㸱㻢䑨䗐䝯䞄䰿𠤷𠰹𠲨𠴻𠷇𡊇𡟕𡶊𢑠𢨹𢫌𢼏𣴾𣵺𤕴𤖌𤟽𤤩𤵚𤵩𥅓𥍢𥍸𥙁𥞀𥠥𥹗𥺡𦂛𦈳𦋤𦧓𦭥𦰜𧉮𧛖𧠡𧣟𧦧𧦩𧩹𧷆𧿶𨠑𨡪𨦥𨧯𩃰𩉻𩠂𩣾𩶴𩷿𩸻𩿽𪘗𪢏𫄟𫇻𫍟𫘞𫴞𬜌𬣢𬥵",
 "乂": "哎砹銰餀鴱㘷𢈒𢜓𤈝𤵽𥐋𧰿𨿆𪠴𪻚𫫎𫲾𬹯",
 "化": "哗晔烨硴蒊誮錵铧骅㗾㟆㬸㳸𠝐𠵅𤦙𤰏𩋖𪉊𫈪𫖇𫚘𫢮𫫸𫰡𫺆𫼧𬆌𬑓𬦷𬧧𬩑",
 "亍": "哘桁洐烆珩筕絎绗胻荇衍衎衏衐衑衒術衔衕衖街衘衙衚衛衜衝衞衟衠衢裄讏銜鴴鸻㤚䀪䘕䘖䘗䘘䘙䚘䟰䡓䯒䰢𠒣𠾑𡭑𢔖𢔬𢔮𢕁𢕅𢕋𢕵𢖅𢖋𢖍𢖡𢙡𢫱𣆯𤀵𥞧𦨵𧄇𧊔𧊽𧗝𧗞𧗟𧗠𧗡𧗢𧗣𧗤𧗥𧗦𧗧𧗨𧗩𧗪𧗫𧗬𧗭𧗮𧗯𧗰𧗱𧗲𧗳𧗴𧗵𧗶𧗷𧗸𧗹𧗺𧗻𧗼𧗾𧗿𧘀𧘁𧘂𧘃𧘄𧘅𧘆𧻥𨴠𪨳𪩵𫙚𬄴𬫑",
 "纟": "哟潍荭荮药莼蕴𪜺𪮖𫈵𫛯𫦌𫦳𫼾𫽀𬑧𬙪𬰤",
 "勺": "哟啲喲烵瘹箹药菂葯䓎䔙𠍖𠡑𠹕𡟅𡠶𢯊𢰹𤷭𥍰𥔰𥭓𥲟𦖡𦗽𦝂𦯪𦷒𧼿𩭲𪕺𪦼𫂇𫃳𫒫𫴿𬊏𬞠",
 "另": "哵捌箉䇷𠣶𡌀𢃉𤿱𥇂𦖇𦛺𨡊𨧢𪶃𪺤𬩁",
 "令": "唥嶺澪燯蕶霗㩕㬡㯪䉖䌢䕘䙥䨧䴇䴫𠏡𠟨𠴒𡅐𡟀𡽹𢋞𢜅𣇝𣉏𣻒𤋶𤖜𤧍𤾨𥋞𥖟𥢴𥵝𥼸𦪩𦴿𧛎𧟺𨗺𨞖𨣖𨩖𩁎𩆼𩟃𪋚𪋪𪝎𪞠𪞧𪞮𪨺𪲜𫢣𫥕𫥖𫥘𫥜𫪬𫫿𫭶𫺡𬍦𬕬𬠑",
 "⻖": "唨啊坠埅堕塦墜娿婀屙廕敶椭樄泐滁濻瀡瓍痾瘾癊篨荫蒢蔭蔯薩藬螴錒鐆鐊锕騭骘㠕㢌㯁㰐㾻䈨䉄䉌䋪䔒䔖䔹䕃䥙䨯䮛𠏁𠥍𠴉𠸳𠹯𠻆𠻱𠼂𠽏𠾕𡋴𡍃𡎶𡏹𡑖𡒘𡟨𡡦𡩊𡲣𡹣𡹷𡺆𡺿𡻴𡽃𢁋𢠣𢡣𢢊𢢠𢤸𢭫𢲢𢴝𢴟𢵌𣗑𣯱𣵻𣶊𣶰𣹝𣼼𣽻𣾂𣾶𣿃𤎩𤏢𤑾𤠴𤢩𤯲𤺹𥊥𥖐𥲎𥳜𥴩𥶐𥶻𥶼𥹗𦅭𦝗𦠵𦢪𦯓𦰟𦰼𦱆𦱖𦳉𦶤𦸐𧁂𧁼𧂹𧌰𧏶𧨽𧼟𨂀𨄽𨅷𨔳𨗎𨧦𨫭𨯝𨵌𨵬𨼤𨼼𨼾𨽎𨽛𩁌𩄛𩅥𩆰𩈁𩍂𩎼𩐌𩗧𩪷𩷺𪁢𪂊𪅋𪒛𪠭𪡷𪤝𪥡𪩁𪫽𪮀𪲭𪳹𪶾𪽹𫁫𫆻𫈟𫉤𫔿𫕖𫕗𫮄𫲙𫶖𫷮𫺶𫽖𬁭𬄩𬞌𬨱𬭏𬮰𬮵𬯜𬯣𬯩𬰔",
 "𡰯": "唰涮𠴪𢯍𤷯",
 "犬": "唳嗅器囐嶽巘巚恹悷憖捩揬搝擜栿棙殠洑涋淚湥湨溴漭猋猋瓛盢睙瞁糗絥綟茯获葖蜧螑蟒袱覄讞谳贆郹鄓錑钀闃阒飆飇飙鮲鶟鶪鸑鼳鼵齅齾㑦㙬㟮㟿㩵㪐㬒㱗㻠䁭䁳䁿䃐䈆䒎䓞䔸䟮䠐䠗䡾䥈𠋬𠸂𠻵𡈭𡔎𡘾𡝢𡪱𡸒𡽺𢝀𢟨𢢕𢫯𢳠𢹇𣄠𣈚𣔻𣗬𣙷𣡌𣤛𣤛𣭩𣯬𣶍𣸋𣽼𤅊𤋀𤚯𤛘𤝯𤟑𤟪𤩽𤷿𥂍𥇺𥓎𥕊𥨜𥯝𥽙𦂽𦅺𦉧𦒥𦔅𦜀𦜏𦝬𦝳𦟮𦠎𦢴𦤕𦤚𦤟𦤠𦤡𦤣𦤦𦤧𦤨𦤪𦤬𦤮𦤯𦤰𦩤𦲚𦽈𧀀𧖃𧚚𧛗𧞾𧩈𧬏𧳂𧽀𧽒𨁸𨃍𨆕𨉕𨋩𨏾𨜯𨞑𨡧𨦛𨨷𨭹𨶑𩀆𩀎𩁓𩅁𩈸𩊙𩎧𩗭𩝠𩡗𩢰𩻜𪀢𪆈𪕟𪙤𪚋𪩘𪺉𫁜𫄓𫄢𫄫𫇌𫇍𫇒𫑐𫜰𫩫𫬢𫬣𫮜𬄬𬍈𬍈𬍌𬑸𬔋𬔏𬛯𬭜𬳌𬸚𬺒",
 "圭": "啀啩喹嚡堼娾崕崖崶幇幫捱掛楏涯湗溎漥煃犎睚睳窪篈罫葑蓕蘳蝰褂鍷鞤㚝㛻㜂㜇㥣㥨㨍㨒䋽䜁䝽䠑䨟𠊎𠏠𠝥𠡬𠪆𠹤𠺺𡎈𡙔𡨱𡭀𢛄𢠪𣓇𣔦𣕁𤌒𤦐𥀂𥉖𥉯𥦛𥧟𥯅𦁊𦁩𦂌𦲒𧍊𧛜𧟼𧡋𧡞𧢏𧫉𨂉𨩥𨵗𩋔𩋮𩳴𪃤𪑭𪘬𪞢𪠐𪦇𪶔𪶙𪷭𪺾𫊒𫙌𫦺𫨾𫹚𬃰𬠎𬮯",
 "孚": "啂㐠㐢㳶𠄀𠄇𠄉𠸷𠼼𡇲𡔵𡝦𡨻𡮈𡮑𡲐𢆡𢉚𢯚𣈃𤭤𥇽𥯇𥰛𦋵𦜘𦟵𦷰𦹡𨨜𨼼𩸐𪃽𪜛𪞺𬈽𬋲𬌢",
 "𦈢": "啣御𦖐𧌋𨓴𨨶𪩆",
 "专": "啭",
 "玉": "啯帼掴椢滢筺腘蝈㣆䌳𠏹𡄐𣜝𤄽𤫆𤿂𥸀𨰡𫂆𫒭𫓈𫬹𫭔𫳙𫺑𬃏𬇹𬉭𬍼𬍼𬎆𬜳𬜿𬝄𬧩",
 "皮": "啵婆櫇碆箥簸菠錃㗞㨇𠉷𠠉𠥌𠪍𠳩𠴸𠵿𠶎𡂄𡣐𡮌𡽠𢜢𢠱𢯏𢯠𢳲𢷧𣈓𣔓𣛵𣤳𣦩𣷭𤀪𥀷𥇲𥌒𥌕𥓳𥖑𥖓𥖕𥖖𥖺𥨑𥶈𦋕𦰽𨆵𨧦𨨏𨪅𩏃𩕂𩜔𩜤𩜥𩸉𩸓𪇞𪈞𪔏𪜘𪣭𫓖𫫢𫮒𫰷𬇃𬈱𬐌𬒧𬖾𬜛𬠚𬡩𬥪𬬣𬭛",
 "各": "喀愘愙揢搁撂擱楁櫊潞璐碦簬簵落蕗鏴露額额髂鷺鹭㑼㟯㨼㯝䈷䌎䘔𠓀𠠩𠸧𠸪𠺝𠺴𠻐𡀔𡁤𡪞𡫥𡫥𡬚𡬚𡬚𡽘𢷅𢾏𣗛𣣟𤁐𤢊𤮗𥂌𥯚𥯛𥻞𥽴𥽴𦂦𦌕𦓉𦝣𧐣𧐯𧒌𧒍𧕌𧸚𨂥𨃶𨆿𨍇𨎟𨎠𨎲𨷀𩁐𩁗𩋽𩤩𩦼𩭽𩹃𩹕𩹿𪃕𪃭𪄎𪅅𪆬𪆽𪘺𪛅𪟰𪦫𪧒𪩄𪮔𪳅𪻽𫃶𫄉𫋍𫏾𫑓𫒴𫘘",
 "束": "喇嗽嫩嫰慗懒揦揧摗整楋樕溂漱潄濑瀬獭瘌瘶瘷癞簌籁蔌蝲遫遬鏉鬎鯻鶒鷘㯈㻝䏀䓶䔎䔩䔫䱫䲇𠍏𠒹𠒹𠘂𠢦𠻣𠽔𡄨𡇿𡏴𡠼𡣂𢃴𢉨𢌐𢔯𢕡𢳯𢵽𢹀𣋩𣙙𤀦𤃏𤊶𤡃𤻬𥈙𥖍𥶄𥻃𥻌𦌉𦌊𦖨𧐁𧐒𧜦𧝝𧩲𧫣𧫷𧫻𧷕𨃢𨄞𨖧𨗜𨘘𨙛𨤸𨫩𨫾𨱒𨽮𩅘𩋷𩌱𩐋𩐎𩐕𩘊𩞍𩞕𩤲𩥹𩨉𩮶𩮸𩯀𩱫𩺾𪃠𪄠𪅙𪆟𪈈𪋝𪘼𪞫𪢐𪢘𪬈𪬯𪮶𪵇𫂙𫂧𫂧𫅯𫇘𫐿𫑽𫛶懶獺𪈎𫤅𫥑𫶼𫽘𬄸𬄸𬅀𬈆𬋍𬗳𬛰𬛰𬩏𬩓𬩯𬶟",
 "⻏": "喐嘟峫帮幚廍廓挷捓擲桏桞梆槨漷琊筇篰綁綤绑茒蔀躑鋣霩鞹㗥㧭㨯㬑㭨㮋㴫䁨䓉䕤䠬䦁𠘁𠳐𠹴𠻑𡂱𡂸𡌯𡏿𡓂𡩫𡪅𡳢𡳣𡳤𡻙𡻳𡼞𢀥𢔴𢤜𢮼𢰗𢵋𢷢𢸞𣔆𣗐𣘙𣛭𣜼𣞽𣵮𣵷𣹙𤕓𤘊𤞡𤣀𤹓𥂣𥒷𥕖𥞱𥦢𥭕𥮇𥳉𦃛𦄄𦗒𦜅𦡄𦨰𦭭𦵁𦵟𦵼𦷽𦸙𦹐𦺥𧀿𧊡𧌴𧐾𧓸𧔛𧬥𧷿𧹼𨀯𨅮𨎎𨗊𨟞𨦹𨧜𨨎𨬽𩅇𩡏𩷾𩺐𩻗𩼁𩽂𪅪𪥶𪲐𪴄𪵹𪹃𪼾𫃃𫋄𫑢𫚨𫚹𫨚𫯵𫳦𫷪𫹟𫺎𫺫𬄂𬅈𬠩𬥃",
 "𧰨": "喙掾椽橼湪猭瑑盠禒篆緣缘腞蒃蝝蠡褖餯㑰㥟䂕䗍䛹䞼䤸䧘䱲𡒰𡓬𡩀𢍝𢐄𢞶𢟰𣂵𣈬𣨶𤊺𤬌𤬤𤸁𥂻𥂼𥯵𥲰𦑙𦧫𦧬𦪶𧳩𨂦𨔵𨙅𨣰𩀅𩄖𩌁𩔂𩘐𩫞𫀿",
 "友": "喛媛嵈愋援暖楥湲煖猨瑗禐緩缓萲蝯褑諼谖鍰锾鰀鶢㣪㧞㬊䁔䈠䐘䟦𠋠𢂛𤤣𤲫𥔛𦅻𦇻𦑛𦖵𦩮𦫦𧡩𧳭𩋫𩏅𩔃𫏖𫏺𫕉𫣰𫮊𬁆𬋪𬋫𬒨𬒲𬟂𬥢",
 "皀": "喞𡄊𪠔𫏯𫱥𫳷𬈒𬑦𬛑𬝙",
 "句": "喣敬煦葋蒟㐝㺃㻤䈮𠄹𠑛𠣷𠸚𡥯𡳍𢛑𢳉𣊤𣕉𣕌𣙱𤟳𥯷𥰄𥴴𦮿𦰰𦴆𦽋𧛩𨩦𫉦𫛒𫽚𬋹𬍉𬍌𬗸𬭧",
 "亘": "喧媗愃揎搄暄暅楦渲煊瑄睻碹箮縆縇翧萱蝖諠鍹鰚䙋䱴䳦𠊿𠋧𠝳𠷐𡍷𡪏𡺟𢯕𣉖𣕲𣘇𤚗𤟿𤠊𤸧𦋠𦞌𦶙𧡢𨕹𩀈𩋢𩏆𩘒𩝑𩤡𪃗𪶥𫕍𬕠𬘵𬝖𬤎𬧂𬳇",
 "夭": "喬鋈㗛䄏𠴎𠾹𡝩𡮜𢞖𢰃𢲑𣉧𣓎𣨘𣵽𤾄𦃉𦰚𧏣𧜕𧠽𧨶𩜸𩣻𩳝𩷯𪁕𪁾𪎤𪣡𪮓𪶇𫂪𫛎𫹠𬕓",
 "系": "喺愻搎槂櫾猻蓀蘨遜㒡㘥䧰𠹀𡒐𢖟𢶛𣻆𤄏𥱖𦥊𦵠𧪾𨙂𨶉𨷱𪸅𫆮𫤅𫧊𫲰𬉯𬎄",
 "刍": "喼稳繺隐㬠㴔𠿼𢅑𢎓𢞀𢨓𢰽𢶞𤌀𥈲𥋧𦳌𦻕𨭝𪂺𪬎𪬽𬃡𬧫",
 "邑": "嗈槴滬熩簄蔰郺雝齆㜉㨭㴩𡻮𢀄𢀍𤕆𤨖𦃽𦉨𦞡𦶂𧜇𨝖𨞑𩌋𩏔𩔪𪄉𪖵𪪝𫩌𫩌𫮳𫮳",
 "朩": "嗏媇搽新榇樤滌窱篠縧蓧螩親鎥鰷𠥑𠺧𡠊𡩢𤗟𤨓𤯊𥉉𥧣𨃓𨃜𨪩𩌜𪄦𫅷𫉕𫎪𫥔𬔫𬞠",
 "去": "嗑圔廅搕摆榼溘灎熆琺瞌磕篕脚蓋蜐豔踋醘銩鍅鎑铥闔阖饁鰪㑢㔩㕎㤼㥺㯼㷱㾡䀷䂲䂶䐦䖼䗘䙓䦢䫦𠄳𠎢𠙣𠥕𠨙𠨦𠲍𠲵𠳞𠳷𠵐𠵽𡏖𡝔𡻊𢄍𢅄𢌇𢝍𢩘𢫻𢬱𢭙𢯖𢾩𣉳𣒗𣘓𣣹𣩄𣺽𤀢𤠡𤸱𤹒𥂇𥃕𥛐𥮱𦀖𦔏𦛕𦝌𦝎𦲾𦴵𦿋𧅔𧇦𧋤𧛾𧪞𧰟𨌞𨍰𨛀𨜴𨦲𨨤𨴿𨸍𩇠𩌍𩮨𩺩𪁍𪔮𪘖𪝙𪠱𪤄𪫚𪫸𪳴𪴹𪶏𪽝𪾁𫁂𫄦𫇤𫎽𫐔𫔆𫡧𫽅𬈅𬐼𬙞𬤒𬰂",
 "老": "嗜愭搘榰蓍螧鬐鰭鳍䅲𠺜𡺸𣮳𣯆𣹡𤧳𥉙𦔌𦞯𧡺𧪡𨊆𨢍𨪌𩥂𩥞𩺆𪄖𪙐𫂓𫃊𫎟𬤓",
 "虫": "嗤囆媸慅掻搔斔曧櫁渱溞滍瀜灗爞爡瑵瓥瓥瘙糔藌蝨蝨蝱蝱螙螙螡螡螤螶螶螽螽蟁蟁蟊蟊蟲蟲蟸蟸蠚蠚蠠蠠蠡蠡蠢蠢蠤蠤蠧蠧蠫蠫蠭蠭蠯蠯蠱蠶蠶蠹蠹蠺蠺蠽蠽蠿蠿颾騒騷骚鯴鰠鲺鳋鼜㮻㲧㵃㺈䂅䘇䘉䥀䧝䩶𠋷𠌒𠏃𠏷𠤋𠥨𠷣𡐆𡐬𡠁𡦉𡿋𢥞𢦈𢱟𢳱𢺉𢺳𢾫𣂂𣣷𣫣𣷋𣸀𤁝𤔢𤚍𤜒𤻹𤼖𤼚𥉍𥋅𥋅𥕨𥱄𥾃𦄦𦅱𦞣𦞲𦢉𦾌𧅬𧋚𧌝𧌡𧌨𧍦𧎇𧏄𧏎𧏒𧒚𧒢𧒨𧔃𧔅𧔗𧔗𧔗𧔨𧔴𧔻𧔼𧕑𧕒𧕽𧕿𧖁𧖈𧖓𧖕𧖟𧖣𧪎𧮚𧷑𧻽𧾶𧾶𧾶𨃣𨖀𨙚𨣂𨫯𨰍𨷛𨷷𩙫𩫲𩺉𪈿𪢗𪦄𪨈𪮳𪰄𪴓𪷡𫂯𫃳𫈖𫊲𫋒𫋒𫋣𫋩𫕩𫖨𫘔𫣢𫨁𫬗𫯀𬀒𬀞𬁅𬂐𬄶𬉁𬉗𬒣𬒣𬖲𬠛𬠤𬠤𬠱𬠵𬠶𬠷𬠷𬠸𬠸𬠹𬠹𬠺𬡯𬴭𬹚",
 "夲": "嗥暤槔滜獆皞翱鷎㟸㿁䔌䜰䣗䫧𡟷𤺃𥡅𥻷𨎀𫑯𫧨𫯉𬓒𬡪𬦙𬩂𬸢",
 "每": "嗨塰慜瀪繁鰵鳘㶗䔦䲄𢑎𣛏𤀇𤛎𤹾𥵴𩱢𩱱𪄴𪉾𪤓𪪉𪱃𫂚𫧅𫱙𬉕𬉯𬕧𬥧",
 "双": "嗫慑摄滠蹑镊䯅𦈙𪳍𫌇𫒅𬥄",
 "何": "嗬𬄋",
 "西": "嗮𠷻𢱛𥱛𥴅𦴖𦵜𦶅𪝻𪟱𪯝",
 "因": "嗯摁煾蒽䅰𡟯𡟻𢞴𤨒𤹕𨪜𪩊𪶲𫣆𬃼",
 "固": "嗰𨮱𬚅",
 "手": "嗱嚤掱掱搻搻擵欅癴蒘藆藦襷襻鎿鑻镎㩮䖂𠌧𠏯𠘚𠠒𠸎𡰀𡾉𢜲𢞙𢣾𢳅𢴡𢷘𢸆𢹘𢺏𣖹𣸏𣹤𤸻𥗂𥜳𥰪𦇑𧖘𧜎𩽡𪫾𪷘𪼰𫦏𫱗𫹊𫹊𫾝𬂹",
 "羌": "嗴獇𦗅𧏙𨪢𪼎𫈯𫣌𫪾𫱎𫹝𬁍",
 "甬": "嗵愑慂樋湧熥蓪踴㗈䞻𠁜𡠙𡾁𢄟𢠆𢳟𣻢𤹯𥲆𥶥𦄷𦪏𧍛𧐺𨎢𨙖𨫤𨯁𩐹𩔘𪰵𪳆𫍃𫍌𫮢𬍺",
 "厓": "嘊漄𠽎𥊅𦹹𨖭",
 "孝": "嘋漖䃝𢠛𥲯𨬊𪖄𪳞𫫳",
 "乎": "嘑嫭摢歑滹罅謼鏬㙤㦆㯉㻯𡀛𡻻𢧶𣛲𣿋𤗭𤹣𥏽𥕕𥲉𦉑𧗌𨄥𨝘𨻲𫷽𬔑𬠦𬤙",
 "彐": "嘒婦慧挡掃暳档棂槥樰濅熭珰筜箒篲膤艝菷蔧裆轊轌鏏铛鯞鱈鳕㑴㓥㝲㨹㫶㱕㴆㷌㻏㻰䢜䨮𠞯𠽌𡐅𡞒𡠭𡪷𡫏𡹙𢃞𢃳𢄣𢅜𢅜𢅦𢅨𢑹𢟩𢱥𢹾𢽪𢽰𣖽𣘕𣠗𣹰𣼡𤇻𥇳𥛆𥧲𥨊𥹥𦄑𦒄𦲅𦵲𨓼𨧪𨺔𨺜𩃏𩅕𩏚𩤿𪀫𪀫𪂋𪂪𪔁𪔁𪕠𪚨𪚨𪞵𪠽𪩺𪴐𪹂𪾚𫀮𫂪𫃲𫃽𫐕𫕣𫙨𫚡𫟰𫰠𫳯𫵃𫹅𫼈𬊽𬌴𬎅𬎶𬐉𬖥𬙏𬝹𬠅𬣭𬤸𬫟𬭬𬰔",
 "或": "嘓幗慖摑槶漍爴簂膕蔮蟈㦽𡳚𢐚𢠝𢧷𢹖𣂽𤎍𤏘𤔩𤡓𤮋𥊞𥕏𦄰𧰒𨉹𨫵𩉕𩠲𪅦𪏤𪤑𪼓𫏜𫛐𫱣",
 "波": "嘙蔢𡼃𪳪𫾀",
 "角": "嘝嘴槲葪蔛蟕㩂䈥䈸䉉𡐗𣀣𣁀𣘳𣚀𣿨𥡿𦺠𧒻𪬰𫁚𫙾𫬼𫾅𬄌",
 "革": "嘞嚡巈簕羇羈蘜驧鰳鳓㗾䇀𠮑𡄷𡖁𡣐𢳝𣼷𤨕𤨙𥌕𥷥𦟯𧁟𧄛𨭠𨰌𩧛𪭅𫓀𫕬𫫸𬆌𬎔𬧊𬩑𬰕",
 "予": "嘢墅櫲滪澦蓣蕷㙒𠟹𣛿𣼫𤂻𤍓𤡒𥳕𦯅𦱻𦺗𧐓𨮌𨹘𪅰𪳻𫡡𫮻𫸉𫽼𬘂𬫀",
 "歨": "嘥屣漇簁縰蓰褷蹝㿅𢇌𢊚𢒩𢒲𢳜𣘩𣯪𥊂𥛨𩌦𫄳𫆎",
 "宓": "嘧樒櫁滵蔤藌㑻㨸㵥䈼䌏𠏷𡫨𢹫𤀑𥉴𦟽𦢉𧷦𨷛𪅮𪆮𪢗𪾺𫆴𫳹𫴚𬉗𬖵𬠵𬮒𬰢𬵨",
 "取": "嘬撮樶熶穝繓蕞藂襊鄹驟骤㔌㵊㵵䝒䠫䴝𠟕𡒍𡡔𡪅𡽨𢄸𢢇𢸶𣀒𣋁𣙻𣠏𣩡𣽇𤑧𥊴𥕸𥣙𥪳𥳣𥵫𦄎𦈛𦦣𦺵𦼈𧅞𧅞𧓏𧜱𨅎𨎮𨝮𨞮𨣅𨼥𨽁𩍧𩯉𩼦𪉼𪒙𪙦𪧨𪱕𪿼𫋦𬓙𬬒",
 "禹": "嘱瞩㔉𣃁𣚚𪅱𪹳𫍏𫴈𫿗𬎒",
 "𠦝": "嘲廟撠擀橶檊漧潮澣濣瀚簳謿㨴𠎫𠼳𠽤𠿨𡡲𡼼𢀭𢠥𢢅𢴿𣊿𣋂𣎢𣛔𣛨𤌹𦺓𦻝𦼮𦾮𧃙𧾂𨅹𨗛𨝌𨝝𨫬𨯪𨼃𩯋𩻹𩼛𪆘𪤾𫑱𫙱𫡯𬉦𬉧𬫶",
 "𠦂": "嘷噑暭曍槹橰獋獔皡皥翶翺鷱䝥𡠖𣠘𤩢𥢐𧞠𧢌𧬁𧯌𨎦𨝲𨼍𩀹𩏤𩕍𫽿",
 "㓞": "噄囓潔緳㓗䐼䥛𠎧𡐤𡔐𡿖𢴲𣚃𤏦𤩦𤺚𥊯𥢪𥪲𪅸𪩛𪿶𬭴",
 "享": "噋塾墪廓憝憞撉撴暾槨橔漷潡熟燉獤礅譈蹾鐓鐜镦霩鞹驐鷻㗥㨯㬑㬿㻻䁨䃞䃦䔻䪃𠎄𠓎𡙰𡡬𡻙𡻳𡼖𣦤𥂣𥂦𥋆𥕖𦗒𦪔𦹐𦽑𧅐𧑒𧝋𧝗𨄡𨎎𨶝𪅪𪆃𪆝𪜟𪦝𫄃𫬛𬚧𬤣𬸫",
 "玨": "噖潖濏璱飋䔷𡡱𣚒𣚶𣾔𤩍𤪴𦆄𦠴𧑜𧑡𧒓𨆙𨬩𩇣𫉝𫓝𫗋𫾂𬎋𬒠",
 "鱼": "噜撸橹氇澛癣穞藓镥𢋈𫏨𬧔𬶳",
 "𦍒": "噠撻橽澾燵繨薘蟽躂鐽闥韃㒓㣵㺚㿹䃮𠁺𢺂𤄢𦡯𦪭𧞅𧬻𩟐𫸉𬵮",
 "巫": "噬欞澨爧遾㦭㭀䄥䉹䖅䚖䡿䰱䴒𠠱𠣋𡿡𢌔𢶅𢺰𣌟𤅷𤖦𤜙𤣤𤫩𤮹𤿅𥘃𥤞𥩔𥰰𥵼𥾂𦫊𧖜𧟙𧢱𧯙𨟯𨤍𨼹𨽲𩑊𩟽",
 "吴": "噳澞鸆𡑾𥵂𦾚𩦢𪋬𪝭𪩽",
 "首": "噵導檤㘏䆃𠁛𠿱𡚑𢹖𣜦𣿪𥽌𧒴𨭪𩉕𬧖",
 "曷": "噶嶱擖獦礍臈蔼藒藹蠍譪轕霭靄㵣㵧䔽䔾䕣䗶䥟𠥜𠿒𡑪𡽙𢢖𢢚𢶆𢷒𣜶𣰌𣿌𤢔𤩲𤺐𥀥𥢸𥴭𦅶𦪬𦼰𦼵𦿋𧓃𧝶𧝽𩅳𩯝𩼙𪆰𪗀𪙰𫕴𬋏𬟞𬸭",
 "屯": "噸莼萅蒓䓐𢬼𢵶𣔝𤊯𥭒𦝊𦯁𦰭𦸬𦼿𧅪𨅱𩯐𫙡𫫲𫽫",
 "頁": "噸嚬夔嬃嵿嶺巎巓巔擷攧櫇澃澒澦瀕灝獿癲盨禵籲纈纐蕦蕷薠蘋蘏蘔蘷虈襭頾顰鬚㘖㩩㩪㰋㰜㴿㶊㹕㹛㺧㿗䁰䇓䕘䕱䖀𠐺𠐾𠑍𠑘𠑪𠟹𠠉𠽒𠾫𠾿𡂄𡅅𡅥𡅪𡆔𡓡𡖂𡤉𡬅𡼔𡽠𡽹𡾣𡿃𢄼𢅼𢊼𢋞𢒷𢖤𢠷𢥝𢥧𢴦𢶃𢷧𢸸𢹃𢹷𢺕𣋗𣌌𣌔𣛪𣛿𣟤𣟩𣠢𣪀𣽥𤀪𤂌𤂔𤃌𤃡𤄭𤄰𤢺𤫕𤻆𥂾𥍎𥗳𥜝𥳗𥵝𥷎𦄼𦅓𦇖𦢶𦺣𦼿𧀺𧂃𧄺𧅵𧔪𧔾𧭹𨅑𨆆𨆌𨆜𨆵𨈀𨈉𨏞𨬗𨬰𨮌𨯲𨯸𨷩𨽗𩅺𩒹𩓾𩔾𩖒𩧔𪆦𪈈𪓇𪚉𪫇𪭄𪷿𪹺𪺈𫌧𫎥𫖦𫚆懶獺𪈎𫬆𫶞𫶡𫷒𫸔𫹧𫹨𫻤𬄝𬅁𬐿𬕿𬖾𬗀𬘂𬜃𬟄𬟐𬟒𬬤𬱍𬱎𬵽",
 "卒": "噿濢璻膵臎㯜㵏䕜𡀬𡣝𡳥𢢒𢣃𣝦𣩸𣿈𤻒𥖮𨅇𩦗𪝬𪨃𪯞𪺀𫄆𫉡𫓚𫦢𫬮𫾒𬆜𬞚𬡳",
 "眔": "嚃䜚𣝋𣤿𦿚𬤪",
 "高": "嚆巐瀥燺薃藁藃藳㰏䯬𡀢𡁞𡂀𡓣𡽝𡾘𢣆𣝏𣝩𤀰𤅝𤢨𦼸𧂎𧂕𨟍𩫠𩫧𩫨𩫩𩫫𩫭𩫯𩫰𩫱𪈃𪢟𪴍𫶜𬞩",
 "赤": "嚇嚇懗懗爀爀螫㬨㬨𠭷𢟻𢠱𢲳𢷓𢷓𣻪𥋿𥋿𥨅𧐭𫛿𬫁",
 "祭": "嚓擦攃檫櫒礤鑔镲䃰䌨䕓𡣮𢣼𢨝𤁱𥌀𥽕𧞍𧭂𧭝𨆾𨯓𩁞𩉐𩟔𩧇𩴳𪇭𪒼𪹾𫊈𬩲𬪝𬯠𬯡𬰓",
 "魚": "嚕廯擼櫓櫯氌瀂癬穭艪蘇蘚鑥㢝㶍䇁䉳䧰𠐔𠓑𡓇𡾮𡿠𢀱𢋡𢥌𢸫𢹛𣄤𣋼𣟲𣤿𣰯𤃽𤄏𤄣𤣃𤻼𤼀𥃠𥌧𥗆𥩍𥶇𦇫𦌥𦢞𦢦𧀦𧂫𧆊𧈔𧔎𧕇𧖞𧭷𨇤𨏗𨟇𨣺𩆵𩽈𪈂𪫅𪫅𪴝𪸉𫊒𫬥𬀤𬀤𬄴𬧙𬪣",
 "彗": "嚖懳櫘譿㩨㬩䎚䡺䵻𢅫𤑡𤪳𥣴𥶙𥶬𦇀𩏲𪔊𫴤𬤭",
 "黑": "嚜嚸爅纆虪㕓䁼䁿䕸䘃䨹𡣫𡤥𡳫𢋨𢌅𣞪𤄊𥷫𥸣𥽞𦢓𦪷𧞾𨇠𩽦𪒁𪒻𫄓𫄖𬆴𬙊",
 "廿": "嚥嬿曣臙觾讌酀醼驠㬫䜩䴏𡂭𡤈𣗅𣟒𣟒𣟛𣠮𣠮𣩲𤃇𤅅𤅅𤒈𤫇𥍂𥗕𥷀𥽫𦣌𦣌𦨅𦨅𧔦𨇟𨯧𨽞𩽒𪇠𪇼𪈏𪑞𫋩𫙴𫿲𬞈",
 "尃": "嚩礡簙簿薄䥬䪇𠽢𣝍𣽡𤒔𥴮𦡰𦺉𦼭𩅿𩏯𩼬𫓆",
 "臽": "嚪櫩爓讇㶄㿕䌪𠐩𠽏𡓢𡣽𢶺𢸴𣛱𤯐𥊥𥌸𥶿𧂄𨄽𨇝𫫦𫾁𬙁𬤛",
 "步": "嚬濒瀕蘋顰颦騭骘㰋𠐺𡤉𢳴𥷎𦇖𦶼𧅵𧔪𧭹𨏞𨽗𫍐𫫾𫶡𬀔𬜚𬞟",
 "乡": "嚮曏膷薌蠁響饗鱜㗽䦳𣜼𤩬𥀾𧬰𨬽𪢞𬳧",
 "郎": "嚮曏膷薌蠁響饗鱜㗽䦳𤩬𥀾𧬰𬳧",
 "賏": "嚶孆孾巊廮攖櫻瀴瓔癭纓蘡蠳鸚䑍䙬䨉𡾸𢖠𣤵𤜉𤣎𤫡𥌽𥐑𦦿𧮆𨟙𨰃𩖍𩽢𪈤𪝼𪼿𫋱𬧝",
 "占": "嚸惉惦掂檆硵禼萜踮霑㥈䛸𠧟𠨄𠳱𠶧𠸞𡝫𢛈𢜋𢰷𢵚𢿑𣸾𤊁𤋧𤭥𥠯𥮒𥮠𥱱𦟶𧪊𨃊𨵍𩃅𩤎𪐇𪦃𪬍𪹭𫁥𫃔𫜊𫠗𫢶𫮤𫼵𬊬𬊲𬖭𬖷𬗀𬜗𬝐𬸵𬸶𬸷𬸸𬸹",
 "虖": "嚹",
 "㒸": "嚺墜嬘旞檖澻燧璲礈禭穟繸襚譢鐆鐩隧㸂䉌䍁䔹䡵䥙𠖔𠾕𡑖𡑞𡡦𡩵𢅕𢢊𢢝𢤪𢤸𢵌𢷊𣄚𣾶𤎩𤏢𤻄𥖐𥴦𦅭𦠵𦼯𧸙𨅷𨆏𨗎𨣢𨷃𨼾𨽎𨽵𩅥𩈁𩍚𩐌𪒛𪥡𪩩𪳹𬩄𬭼",
 "敖": "嚽𪢕",
 "專": "囀檲糰㩛𡀯𡁴𡈬𡤛𣎫𣟔𧓆𧓘𩧜𩼯𫊙𫮯𬣋𬣍𬩒𬩘",
 "聑": "囁懾攝欇灄襵讘躡鑷顳㒤㱌㸎䌰䝕䯀𠠨𡓳𡤙𣀳𣠞𣰼𤣒𤮱𥍉𥤋𥷨𦣀𧕩𨊞𨏴𨙓𨽦𩙝𩽪𫧛𬗂",
 "离": "囄攡灕籬蘺㒧㒿㰚䍦䙰𡿎𢌈𢥗𧕮𧮛𨯽𪐑𪺇",
 "蓺": "囈襼讛𢺐𣡊",
 "穌": "囌𠫋𡚡𡚢𥗹𦣑𧃅𫰅",
 "曾": "囎𡃆𡒸𡾓𡾽𡿘𥶰𪴕𫣸𬅎",
 "鬳": "囐巘巚瓛讞钀齾㩵䡾𡔎𡿕𣡌𤅊𤫣𦉧𧖃𨏾𪚋𪺉",
 "闌": "囒孏欗灡爤糷襽钄韊𡔔𢆄𥗺𨈆𪴧𫲴𫶥𬎟𬵿",
 "齒": "囓𡔐𡿖𥷳𥸛𪚍𪚍𪩟",
 "羅": "囖𡆗𥘁",
 "䜌": "圞灣灤癴癵纞虊㜻䂅䖂䘎𡆕𡆝𡈻𡔖𡤶𡤻𡿞𢦈𢦋𢺯𢺳𣡩𣡵𣱂𤅶𤓩𤼣𥍚𥘂𥾃𦣛𧆅𧆎𧆏𧖖𧖘𧖣𨈊𨈌𨈎𨰺𪈿𫶦𬉲𬉳𬣗𬣘𬬦",
 "殳": "垼壂媻嫛幋搫搬摋撃榝槃檓毉澱燬瑿瘢癜盤瞖磐縏繄繋翳臋莈蒰蔎蔱螌褩譭贀醫鎜鎩鞶鷖鹥黳㗨㙠㩓㩔㬾㮽㯏㲆㲇㲈㷫㿄㿦䃑䃜䅽䈲䊛䓈䗟䡰䥣䰉𠖊𠲴𠺽𠿍𡁒𡄈𡄒𡎷𡐊𡑴𡒂𡢕𡢶𡷠𢄌𢅝𢊘𢞒𢟁𢟌𢡯𢯸𢶙𣉜𣋙𣒃𣓒𣘦𣤖𣪤𣫊𣫒𣫕𣫘𣫙𣫜𣫝𣫣𣫤𣫨𣫫𣻑𤈧𤍁𤐢𤛓𤠍𤠼𤥞𤩱𤩴𤪢𤮈𤶣𤻏𥆛𥈼𥉟𥖳𥦆𥳴𥴫𥵓𥶵𥷽𥸋𥻦𥼹𥽂𦃏𦎼𦜴𦪹𦳠𦺔𦽄𦽐𦿓𧋶𧏘𧐜𧐡𧜁𧝷𧱕𨂩𨃞𨃟𨕴𨡩𨦯𨨻𨵐𨷕𨿒𩂹𩋐𩎶𩮫𩷍𩸿𩺓𩺪𪁛𪄀𪄅𪅏𪍱𪐕𪒀𪒋𪒮𪔰𪖃𪚣𪠔𪡹𪤈𪨍𪵑𪶟𪷔𪹙𪹤𫉽𫌤𫏯𫖋𫨕𫱥𫳷𫴈𫶲𫽌𫽟𫿚𬆍𬇮𬉐𬏱𬖯𬥍𬥨𬩞𬰝𬺝",
 "尼": "埿㥡𠸽𡌰𢛜𥺜𦰫𦲁𩋪𩸦𩸧𩾆𪣮𬁉𬈤𬉚𬘸",
 "呆": "堡媬椺湺煲緥葆褒褓賲㨐㷛䭋䳰𠸒𢉣𣯂𤦸𤭭𦽻𧛱𨩚𩭼𪃁𫣯",
 "呈": "塣𣗐𤩏𦻓𫹟𬩰𬴋",
 "阝": "墬𧎟𪡪𬂪𬞘",
 "𡱒": "壂澱癜臋㩔𠿍𡑴𢅝𣋙𣫕𤩱𤩴𥴫𥷽𦽄𪒮𫖋𫿚",
 "斬": "壍嬱聻魙䤔𡃞𡗎𡽻𢣥𣋫𥜙𦾶𧀵𧅀𧔜𨊝𨮜𩉍𪬷𪮻",
 "𣶒": "奫鼝㘤𨖳𩁵𪔱",
 "之": "姂徔抸柉泛疺眨砭窆貶贬鴔㞏㴀䍇䒦䟪𠇖𠰏𠹰𡝳𡶉𢇫𣆅𣔰𣭛𣷸𤇮𤝑𤦧𥁔𦚖𦷩𦹴𧊉𧒅𧦟𨥧𩬪𩶟𪀐𪣇𪥻𪫿𫛡𫣱𫦧𫸿𬎣𬐆𬜆𬨵",
 "毛": "娓屗屘捤撬梶橇毮毳毳浘滗竁膬艉荱趘㞙㦌㯔䄟䅏䇻䊊䜸䞔䩁䬿𠉜𠡨𠧮𠳿𠽶𡐒𡓋𡥸𡦥𡪣𡱬𡱵𡲈𡲉𡲊𡲋𡲤𡲥𡲧𡲨𡲪𡲫𡲭𡲸𡲼𡳀𡳃𡳊𡳎𡳒𡳔𡳗𡳜𡳝𡳩𡳪𡳱𡳲𡳳𡳹𡳺𡷕𡷱𢭶𢴅𢽙𣉶𣍁𣛢𣮳𣰗𣹪𣻨𣻼𣽶𣾽𤈦𤉂𤌨𤡇𤳰𤽶𥇾𥉗𥒮𥕹𥖑𥜀𥟪𥳈𥹹𥼛𦀿𦅴𦗨𦘧𦳁𦹾𦼵𧋦𧚟𧱎𧱧𧹺𨁱𨊉𨘘𨤔𩎄𩗘𩮄𩷳𪑐𪘣𪡱𪤛𪨕𪨖𪨙𪨝𪨟𪹮𪼋𫐿𫥯𫯨𫰵𫱬𫵞𫵡𫵣𫸛𫸡𫽳𬃵𬋰𬨊𬪛",
 "以": "娰𠏳𠳎𩛮𫈄𫣵𬠊",
 "门": "娴悯搁斓榈润涧澜焖痫简蔺裥襕谰锏镧鹇㘎㭣䠺𨁴𨅬𪢌𪢠𪩱𪭾𪹹𫂃𫆝𫇡𫈉𫔷𫔹𫝮𫞗𫞝𫢨𫣽𫫦𫴼𫺒𫺓𫻁𫼫𫼽𫽔𫾁𬁘𬂀𬂻𬅳𬇰𬊖𬊢𬌱𬎑𬎵𬑗𬕊𬖟𬖷𬖺𬙁𬚿𬜬𬞕𬤛𬪫𬮫𬮶",
 "厈": "婩硸錌䮗𠊀𠵚𢮹𤟉𨲊𩓤𩭢𪂢𪶐𫶂𬓀𬴁",
 "申": "婶敒榊渖谉鰰㻘䗝䨩𥆓𥔻𦕽𦿄𨁬𨕫𫣰𬷫",
 "甘": "媒嵌憇楳湈煤禖箝篏腜謀谋㖼㟛㵇䈤䗋䤂𠅟𠅟𠋦𠝺𠝼𡎡𡚙𡚙𡮘𡽎𢃱𢜮𢜯𢱖𣚻𣞤𣞤𣨴𣵷𤍍𤍍𤣇𤣇𤧀𤯏𥷯𥷯𦋡𦳑𦴑𧗅𧝫𧝫𧞝𧞝𨘛𨘛𨪀𩁰𩁰𩝇𩹮𪃏𪉏𪉴𪐕𪒷𪤘𪮍𪲣𫂋𫄼𫡪𫯊𬕸",
 "𠃜": "媚嵋楣殸湄濵煝猸瑂睸篃葿蝞郿鎇镅鶥鹛㯽䰨𠋥𠪃𠴢𠷯𡁩𡡮𡡻𡣕𡩏𡭌𡮠𡳦𢃼𢊟𢔰𢰲𢷤𣈲𣎊𣩵𣫆𣮮𣼘𣽪𣾉𤚤𤭩𥊟𥋜𥌏𥌙𥚵𥭺𥻡𦆯𦎨𦠙𦿜𧛰𧢘𧱸𧳬𧶑𨉭𨧅𩄎𩅹𩋿𩯔𩹪𪇟𪇧𪤲𪵟𫃷𫐹𫗗𫯅𫯆𫯇𫵇𫸌𬊽𬛜𬴮",
 "氿": "媣蒅𩃵𫽦",
 "页": "媭巅撷滪濒癫蓣颦𪾔𫍐𫫏𫫾𫬟𫯮𫷈𫽙𫽫𬃛𬈱𬕬𬘳𬞟𬧚",
 "囟": "媲磇膍螕貔鎞顖㡙㮰䠘𦃋𦃞𧏀𧪫𧪳𨯥𪄆𪉔𪍜𪙋𫍺𫔇𫽨𬆛",
 "舟": "媻幋搫搬槃瘢盤磐縏蒰螌褩鎜鞶㮽䃑䈲䰉𠝣𡀑𢟁𢵏𣦃𣹊𣾅𣾥𤎴𤠍𥈼𥉟𥳭𥴣𦪹𦶢𧏘𨃞𨃟𨏺𨕴𩺓𩺪𪄀𪒀𪒋𪤈𪮥𪹙𪾝𪿱𫨕𫭓𫮠𫸂𬃢𬐯𬖯𬜓𬜕𬰝",
 "疒": "嫉愱槉瘸蒺藱螏㑵𠹂𠹋𢞱𣖲𣙦𤌿𤖏𤶮𤶯𤹳𤹴𤺣𤻓𤻚𤼍𤼑𤼜𥽅𦢝𦣜𦶉𦶱𧎿𧪠𧽑𨕾𨘃𨪏𩽉𪒷𫉭𬖼",
 "医": "嫕嫛毉瑿瞖繄翳贀醫鷖鹥黳㗨㙠㬾㿄䃜䗟𢊘𣘦𣫫",
 "㡀": "嫳幣弊彆徶憋撆撇斃暼潎獘獙瞥蔽蟞襒蹩鄨鐅鱉鳖鷩鼈龞䌘䠥䥕䨆𠍯𠒳𠟈𠢪𡐞𡚁𡡹𢠳𣀽𣁢𣊶𣘮𣰉𣱔𤎨𤏰𤮕𤺓𥋗𥢭𥳆𦒐𦗥𦠞𧒀𧝬𧢍𧸁𩡡𩦉𫜁𬢓𬭯",
 "辛": "嫴孼孽搱榟橭櫱滓稺糱糵縡蘖蠥謘躠辦辦辧辧辩辩辫辫辬辬辮辮辯辯遟㔎㔑㜸㱰䅸䏁䐻䔂䢄䮨𠞂𠹼𠽿𡁂𡎰𡟭𡤏𡪔𡿗𢕌𢟓𢡇𢲟𣋩𣘘𣘲𣪮𣸒𣹲𤀫𤀫𤌊𤻬𥔈𥢍𥣦𥻮𦃘𦆣𦞤𦠬𦸯𧎨𧐞𧛺𧪹𧬕𧭋𨇨𨑀𨑀𨫃𨫽𨬕𨬟𩝪𩺵𪇷𪈖𪈙𪈟𪎃𪢘𪶱𪹞𪺶𪿺𫊎𫲕𫲖𫶼𬂘𬅀𬘽",
 "兹": "嬨濨礠㘂䗹𢶴𥣓𥴺𨭨𩉋𪴆𫃕𫻌𬞧𬣐𬵱",
 "凡": "嬴恐滼盕羸聓臝茿蒆蛩蠃贏赢跫銎鞏驘鸁㠫㧬㺸㼦䂬䅃䇔䊄䡗𠌖𠔣𠦦𡋋𡬶𡳴𣑃𣒾𣜄𥢵𦆁𦣄𦣉𦣖𧝹𩛳𪀛𪲊𪲊𪳈𪹻𫁼𫇼𫍉瀛𬃕𬨆𬸉",
 "帛": "嬵檰矊㒙㰃𡄎𢥅𢸼𣟡𥌹𥷏𧃃𨮨𬑧𬞻𬡴𬬃",
 "么": "嬷𬳔",
 "番": "嬸瀋籓藩覾讅㔤㰂䕰𡃓𡒷𢸙𤃃𤄤𤄫𤪺𥶋𧀯𧂉𪬺𪿾𫊑",
 "相": "孀灀礵驦骦鸘鹴䌮𢹩𥀸𩅪𪴜𫾋𬰍",
 "柬": "孄幱攔斓斕欄澜瀾爛瓓籣蘭襕襴讕谰躝鑭镧㘓㦨䃹䑌䪍𠓖𡄮𣩼𣿊𥌻𥽭𦧼𧕗𨅬𨏭𩽥𪢌𪢠𪩱𫇡𫋨𫝮𬁘𬋆𬎑𬐁𬖺𬚎𬞕",
 "㦰": "孅懺攕櫼殲瀸籤纖襳讖谶鑯㡨㺤䃸䆎䊱䑎䘋䤘𡄑𡤪𡤷𡾺𢖝𣰷𣱰𤒯𤼋𥍀𧃖𨇦𨏪𩆷𩉔𩰁𪖎𫦟",
 "韭": "孅懴懺攕櫼殱殲瀐瀸籖籤纎纖薤襳讖谶鑯㡨㩥㰇㺤䃱䃸䆎䊱䑎䘂䘋䜟䤘𠿓𡄑𡢭𡣳𡤪𡤷𡾺𢖝𣰷𣱰𤒯𤼋𥍀𦺅𧃖𧆌𧔒𧞬𧟖𨇦𨏪𨰕𨰸𨷠𩆧𩆷𩉔𩯶𩰁𩽅𪖎𫦟𬶸",
 "雔": "孇欆籱艭㩳䉶䝄𠠰𡾼𢅻𢥠𧄐𧆑𧕟𨇯𨰚𩆿𩽧𪫄",
 "孖": "孱孴𠊩𡣁𡦥𫨗",
 "𠂑": "孵毈贕㤻㲉𠨫𠷞𣫘𧸷𪇄𫧼𫧾𫧿𬪁𬸬",
 "卪": "孵毈贕㤻㲉𠨫𠷞𣫘𧸷𪇄𫧼𫧾𫧿𬪁𬸬",
 "𠂤": "孼孽搥槌櫱溮獅瑡磓篩糱糵縋缒膇蒒蘖螄蠥躠鎚鰤鶳㔎㔑㗓㜸㷟㾽䊚䨨䭔𠦭𡟪𡟴𡠋𡤏𡿗𢊅𢟋𢲐𣈪𤧫𤹌𥡈𦾦𧍓𧏍𧏴𧔽𧜂𧪲𨃬𨇨𨻡𩌝𩔦𩠱𩥐𩪀𩮭𩺬𪄜𪇷𪈖𪈙𪈟𪎃𪝜𪪀𪺶𫉽𫊎𫑺𫒺𫗰𫲕𫲖𫷤𬂘𬄁𬩞𬩫𬭨",
 "乍": "宱搾榨筰莋葃葄醡㤰𠁙𠜿𠴚𠷆𠷿𢌣𢞲𢭢𣨐𣹧𤉔𤶙𥯧𥯭𥰾𦰼𦵬𧚙𧧻𧨊𧩳𧼄𨁔𨃼𨐷𨓕𨴰𪯕𪱢𫉧𫯧𫸋𬃥𬆖𬣶𬫛",
 "百": "宿衋衋㙽㙽𢐤𢐤𣂐𣂐𣶊𤫓𤫓𤾩𤾩𧞲𧞲𧟸𧼟𪶯𪷩𫑖𫑖𫓎𫱯𫱯𬇺",
 "必": "密寗榓淧濏璱蜜謐谧飋㳴㴵䀄䁇䤉𠚝𡪖𡫹𢛬𢢃𣸢𤪴𥋱𥡁𦆄𦰷𦷬𦸞𧒓𧓫𧶡𨆙𨣘𩇣𩈰𪁷𪂁𪂨𪧟𪧠𪶑𫗋𫝱𫳡𫾌",
 "瓜": "寙寙搲摦攨攨槬溛窳窳箛菰蓏蓏䉉䕯䠚𠆁𠆁𠹁𡍢𡦶𢮩𢶎𢸖𢸖𣔞𤂜𤂜𤃛𤬑𤬑𤬢𤬣𥏩𥧰𥮰𦁣𦋆𦞭𦣮𦫪𦱄𦳍𦺠𦻨𧍆𨂗𨃆𨔌𩸰𪂮𪂲𪧄𪴒𪴒𪽵𫈻𫛈𫾞𫾞𬁾",
 "毌": "實惯慣掼摜樌瑻罆謴遦鏆䗰𢿒𣩔𤎽𥊫𥸜𨝑𨱌𪭖𪷈𪻲𫉜𫿖𬤆𬦻",
 "复": "履澓癁蕧㠅䨱𥨍𥳇𥵩𧠅𫓍",
 "喬": "屩𡅫𡆌𡳯𢹣𥍑𧂼𨙍𪢤",
 "下": "峠忭抃挊桛汴炞犿玣笇苄裃鞐飰𠂪𠂫𠯴𥑃𥾽𨳲𩡼𩰍𪨨𬰬",
 "牙": "峫捓琊瑏蕥鋣㭨䓉𡌯𤕓𤞡𥈹𥦢𥭕𦭿𦰳𧧝𨩴𪰝𪷐𫁛𫢯𬔌𬔕𬣨",
 "厷": "峵恡浤硡竤綋翝郄鋐㕁㖁𠙆𠫷𠴈𠴷𡮱𡯤𡯮𡶱𢫿𣑆𥏕𦕹𧗫𧵧𨌆𨗑𩓘𪊭𪊱𪰧𫢦𫧲𫭊𬭎𬷚",
 "钅": "嵚篯𣘴𫪽𫷷𬇃",
 "金": "嶔廞憌懖撳檭瘹籙籛籦鑫鑫靎㐥㘅䃢䔙䕔䲗𠍖𠞾𠟁𠪢𠺓𠾬𡀖𡁬𡃶𡄎𡄮𡓠𡓯𡠶𡪵𡼲𡽎𢔿𢟙𢡮𢣩𢣰𢤹𢥅𢦆𢲥𢵡𢵶𢶎𢸼𢺚𣗒𣙌𣟡𣫫𣫫𣻁𣾠𤁈𤄱𤅺𤢲𤺰𥂲𥃒𥌹𥖹𥗦𥲟𥳾𥴴𥷏𦄈𦇮𦌫𦗾𦘌𦽋𦾺𧀏𧂂𧃃𧃆𧃑𧅀𧓪𧔢𧟝𨅠𨇬𨐃𨪅𨪑𨪵𨮨𨮬𨷫𨼌𩏭𪆷𪇩𪈇𪢜𪩞𪷻𪷼𪸆𪹸𪾘𫃋𫉟𫊙𫓅𫓈𫓝𫠍𫫲𫫿𫱳𬉲𬐹𬑄𬕮𬕸𬞵𬬃𬬌𬬐",
 "戔": "嶘濺籛㰄䉔䔐𠠀𣚙𣛷𣝕𣽖𤐒𥂫𥃒𥃗𥖔𥜤𥴈𦺐𦾟𧂂𧔢𨏺𨪑𨭮𪈇𪩞𪷻𫫷𫻔𬉉𬉰𬚂𬬌",
 "昚": "嶚嶛䭜𤃜𧈏𨇉𨝼𩻻𫕔𫹣𫿿𬋘𬟖𬤟𬲅𬴉",
 "咠": "嶯擑檝濈艥蕺霵䉗䔱𡀞𡃃𤖞𥊬𥖙𦠾𧁭𨎵𩦤𪮯𫍎𫙺",
 "真": "巅巔攧癫癲𠑘𡅥𡒆𡬅𡽆𢺗𢺗𣪀𤄱𧄺𨈀𨈃𨰎𨶷𪓇𪚉𪦵𪦵𪿰𫬟𬉌𬟕𬧚",
 "匊": "巈蘜驧𠮑𡖁𡡣𢵗𣚭𥷥𫉙𫣟𬈵𬖶𬣇𬧰𬰩𬹄",
 "委": "巍犩蘶㞜䔀䭳𡿁𦓌𦾎𧕞𨄖𨇷𬕥",
 "鬼": "巍櫆犩藱蘶㠕㠢䃬䕇䭳𠎺𠏁𠿯𡂃𡄬𡦶𡾖𡿁𢋝𢢯𢷪𣰏𤀖𤁔𤄛𤐜𤛲𤜘𤩫𤪿𤮞𥋳𥖸𥴯𥶱𦓌𧕞𧝛𧭵𨇷𩏳𪇋𪇫𪊃𪋺𪖾𪧄𫀢𫴒𫸄𫻣𬞴𬤱𬬖",
 "昇": "巐",
 "眞": "巓㰜𬵽",
 "夒": "巙虁躨𢆃𥜶𧅄𪭆",
 "光": "幌愰榥滉熀皩縨鎤㨪䁜𠒼𣄙𤓛𤨆𦇊𦞔𦵽𪝚𪦉𪫗𫦴",
 "冡": "幪懞曚朦檬氋濛獴矇礞艨蠓靀饛鸏鹲㠓㩚䑃䙩䤓䰒䴌䵆𠐁𠖨𡁏𡒯𡮹𣰥𤔽𤔾𤘁𤪑𤮠𤯻𤯾𤾬𥣛𥵿𦆟𦿢𧅭𧭊𨞫𨮵𨼿𩍬𩕱𩦺𬴌",
 "戍": "幭懱櫗瀎礣蠛衊襪鑖韈韤鱴㒝㩢䁾䌩䘊䩏䯦𡃙𣋻𣠉𤻻𥀯𥗥𥣫𩆪𩱵𩱷𩴾𩽣𪇴𫉼𬴱𬹛",
 "尌": "幮櫉櫥躕𨆼𩆩𪻋𫴶",
 "即": "幯擳櫛瀄癤蠞㘉㦢㸅䗻䲙𠐉𠠑𥣮𨙌𫃖",
 "𡩜": "幰攇櫶瀗藼㦥䘆䜢䧮𡾢𢖘𤼂𧾨𨏥𨯶𩍹𪺅𪼭",
 "支": "庪瞽臌薣鼕鼖鼗鼘鼙鼚鼛鼜鼝鼞鼟㟚䓩䝸䥢䵽䵾䵿䶀䶁𠔢𠴜𠺏𠽑𠿤𡍁𡱪𡲅𡹉𡻧𡽂𡽌𢆨𢴛𣇠𤛽𥰦𦗺𧌔𨅅𨆆𨆊𨭸𩓡𩰛𪂅𪇀𪔋𪔌𪔍𪔎𪔐𪔑𪔒𪔓𪔔𪔕𪔖𪔗𪔘𪔙𪔚𪔛𪔜𪔝𪔞𪔟𪔠𪔡𪔢𪔣𪔤𪔥𪔦𪔧𪔨𪔩𪔪𪔫𪔭𪔮𪔯𪔰𪔱𪔲𪔳𪔴𪔵𪔶𪔷𪨵𪮣𫔐鼖𫱺𫽂𬯾",
 "咅": "廍篰蓓蔀㯁䔒𠘁𡏧𡏿𡻓𣘙𣯱𣻃𤐚𥰵𥳖𦟋𦵿𦹃𧐾𩅇𩻗𪬽𫂕𫏚𫑒𫚨𫨚𫯵𬈸𬯑𬱎",
 "侌": "廕癊蔭",
 "翏": "廫㵳㶀䀊𠐋𡫱𡽟𡽦𤁸𥗀𥵬𦆲𦾷𨟆𨮛𩼶𪇯𫚬𫜆𫬏𫲋",
 "責": "廭癪𡢻𡳮𧂐",
 "邕": "廱灉癰𡄸𡓱𢹬𢹭𤫔𤮲𦉥𩟷",
 "弔": "弟𡠨𫦒𬄏",
 "前": "彅擶櫤謭譾谫㨵𠿏𢤣𢶕𢸄𣜭𥲫𥳷𦺍𧬫𩌵𪷇𫍿",
 "瞿": "彏戄攫欔玃矡籰蠼貜躩钁䂄䢲䣤䦆𠑩𡆚𡚠𡤬𢖦𣌗𥍜𥜵𥤘𥸘𦣒𦫇𧅚𧢭𧮞𧾵𨈍𨏹𩇐𩏺𩧡𩵈𪈴𫬻",
 "分": "彛彜棻湓葐蒶虋㖹㥹㧳𠏶𡍆𡎛𡙢𡚋𡝱𢑱𢚅𢞂𢠈𢡙𢮈𢱔𣔄𣟗𣱦𣴞𣶼𣸜𤕃𤘊𤦦𥁳𥂾𦝅𦮪𦯀𦯲𦯳𦰛𦶚𧷨𨉺𨧼𩃼𩡉𩸂𪂽𪝕𪨄𪩋𪪷𪫱𪬲𪬼𪷪𫄐𫎤𫕧𫪝𫺦𫺾𫽡𬃠𬢶𬥣𬥬𬥮𬥯𬱇",
 "𣥂": "徏捗涉荹踄陟頻频㻉㾟䑰䤮𠉡𠌹𠳤𡘧𡝃𢈨𢧁𣚷𣦖𣻣𤫻𥒼𥙺𥹴𧌂𧼝𨛒𨽥𩊶𩣝𩷖𪌷𪨏𫫈",
 "𣎳": "怷痲痲絉𠮁𠰲𢫖𣪩𣭍𤇍𦈭𦱈𨐘𨦾𩖶𩳙𪲭𫀦𬏿𬏿𬩋",
 "己": "恺桤梞皑硙蓜誋跽铠闿鵋䋟䓽𠓨𠝇𡜱𡷞𢄝𢚁𢭄𢲭𢵖𢶭𢼷𣁈𣇡𣉸𣭚𥭜𥱬𦟊𦮼𦼀𦾀𧋷𧙘𧚈𧛍𧮌𧲼𨛑𩷱𪡭𪡴𪦏𪬧𪵶𪶪𫂮𫅉𫅥𫍕𫍪𫑸𫔷𫖮𫝧抱𫩯𫭻𫱓𫷩𫼥𬀎𬀱𬮿𬱼𬺃",
 "文": "悋悯憫斔榩浏渂潣燘琝癍簢螤贇赟閺鰬麐㓺㗔㨜𠋵𠌒𠎓𠓬𠞺𠡖𠡧𠢍𠲝𠳺𠼿𡂯𡘯𡢄𡦉𡫫𡹋𢇉𢙪𢚙𢡥𢡻𢬭𢭹𢱨𢴬𢵢𢵪𣁔𣂂𣋇𣍵𣖳𣙛𣚾𣵰𤚳𤞼𤡰𤨘𤶾𤺖𥔮𥱲𦀑𦻔𧋻𧏎𧶆𧸔𧻐𧼁𧽐𨁮𨒻𨜻𨦽𨪝𨭉𩇿𩛜𩣖𩤾𩦎𪊺𪙘𪝸𪡍𪣠𪣢𪦒𪩥𪫼𪬣𪳩𪶊𪶸𪷕𪸻𪹰𪼗𪾽𫂃𫇖𫈑𫒤𫕦𫞗𫢧𫫨𫬪𫱚𫱭𫴬𫹗𫽯𬁏𬈀𬈳𬉪𬊖𬔻𬗔𬜵𬝓𬩛𬲔𬷱𬹏",
 "尔": "您猕㟜㳽𠵸𡝠𣓔𥮜𧢖𨧮𨨮𩸹𪋈𪡇",
 "正": "惩晸鎠㓻㗏㟵䈣䌉𡓟𡬺𢌪𢱉𢱫𢾘𣀚𣔥𣖍𣗵𣦐𤌗𤟷𤣙𤭺𥪛𦄙𦋳𦲵𧁎𧡰𨂿𨨨𩠰𩸵𪣴𪰱𪴻𪴽𪹈𫂊𫣀𫤎𫵙𬆆",
 "旬": "惸槆橁箰賯㒐㨚䜦𡟱𢔐𢕊𢲰𢵀𥯗𥰴𥰿𦴥𪹕𫂎𫺰",
 "民": "惽愍敯暋湣瑉睯緡缗鍲㗃㛰㟩㟭㨉㬆㱪䁕䃉𢛣𢰞𣇹𣇻𥉦𥋹𦳜𩀔𪃔𪃯𪦓𬁂𬧆𬷳",
 "孛": "愂渤葧㴾𠷺𡅂𡍧𤊹𦂿𧪶𫆲𫉖",
 "行": "愆椼葕讆躛餰㗸㘅㦣䓷䕔䲗𡆚𡓎𢆈𢖨𢯼𣟉𣻚𣽣𤜂𥲋𥶽𦌫𦸇𧁬𧁮𧍢𧎘𧲔𧲝𧲞𧾦𨇙𩇐𩜾𪨜𬣔𬳆",
 "夾": "愜擌瘱篋陿㥦㥷㰼㵤䕛𠋙𠞦𡎶𥰫𫫄",
 "來": "愸憖憗瀒㙬𡃄𢴙𢵭𣀗𣞋𨅼𩻜𪄪𪅍𪆵𪎂𪎂𪒅𪙤𪱉𫇒𫘗𬆵𬆵𬛷𬛷𬣆",
 "气": "愾暣滊熂鎎霼靝餼㑶𠺪𡈏𡦎𣀽𣯘𣱬𤅴𥎃𥧔𦞝𧎵𧏨𧜃𧜚𧪢𧱲𧹵𩘞𩟍𩥀𪒉𪖴𪸃𪽺𫉀𫨥𬂕",
 "叉": "慅搔溞瑵瘙糔颾騷骚鰠鳋鼜㮻㲧𡠁𤔢𦞣𧎇𨃣𩙫𬂵𬫗",
 "巟": "慌謊谎㡛㬻㼹䐠𠻄𣉪𣗄𣺬𥉂𥔾𪥣𬹀",
 "告": "慥澔簉糙㸆䎭䒃䔏䗢𠻛𠻧𡑛𡠻𡮯𣞳𥧦𧷹𨄹𨖰𨘴𨯕𨻴𨼵𪄣𪆥𪳤𫉢𫛕𫣶𫸂𬈻𬒝𬔓𬪵",
 "求": "慦𣰐𤨣𨫣𩱘𪷀𫱹𫳰",
 "臤": "慳摼樫熞礥臔藖鏗鑦鰹㒘㘋䃘䉯䌑䵛𠐊𠗻𠼤𡐖𡠩𡮷𡮺𢤞𢴡𢸒𣝌𣻹𤂐𤠿𥉸𥧬𦃢𦸃𧜶𧞫𧤵𧽡𪅤𪦬𪷬𪼑𫉺𫍊𫣴",
 "直": "憄㯰𠎟𧄗𪙳𪧁𫕾𫣧",
 "舌": "憇懖湉萿葀闊阔㵇𠉗𠟥𠵯𠸓𡎒𡞠𢯔𣈛𣕔𣸅𤁪𦗾𦯠𦳇𨨱𨬼𨶐𪙬𪙬𪾬𫬃𬈾",
 "匀": "憌𥳾𫈔𫉟𫱳𬕐",
 "咸": "憾撼澸轗鱤鱵鳡㙳䃭䉞䌠䜗䥠䫲𠽦𠿑𢠔𢤝𣀣𣁀𣚘𣛴𣤮𣼪𣾃𣿎𤁙𤛸𥍒𥳒𥶳𥽇𦆃𦒝𦺘𦽫𧭻𨣝𨮼𩼘𪇅𪇳𪈁𪉕𪊄𪒯𪒹𫄅𫄏𫐘𫓏𬐴",
 "堇": "懃懄㢙𠪲𡀣𡄾𢥢𣝀𤄲𤐂𤯺𥵚𧁲𫦽",
 "两": "懑𬥊𬭮𬳏",
 "帶": "懘𢤔𤢻𧀱𨘬",
 "㒼": "懣濷𡒗𡣩𤁃𤁞𤂀𤂉𤃞𤾯𥵥𦿭𧴝𨆻𩯮𫥭𬉞𬖽",
 "食": "懩攁瀁癢蕵薞鱶㔦䑆䭥𡅖𡗍𣌞𥶑𧓲𩁥𩜒𩪴𩴽𪰁",
 "𥄳": "懷櫰瀤瓌耲㜳䃶𠐦𠘠𡃩𡾝𡾨𢸬𣀤𣀩𣩹𣩻𤜄𧞷𪊉𬵹𬶷",
 "北": "懻驥骥䆊䙫𢋸𥜥𧃞𨷨𪴗𬵷",
 "異": "懻瀵瀷瀻襶驥骥㢞䆊䆏䙫𠑀𠥦𡓴𢋸𢹔𣀲𣠂𤒩𤼌𥜥𥤌𥽡𥽤𦔫𧃞𧾰𨙒𨷨𪧴𪴗𫃘𫍖𫓢𫘚𬓝𬵷",
 "次": "懿檨澬薋蠀諮谘趦㮞㾳䆅䠖𡳠𢢾𢱆𣯃𤦾𤦿𥚭𥻓𥼻𦅗𧏗𧹌𧾒𨍢𨩲𨬢𩆂𩆃𩥝𪞼𪦌𪮲𫑫𫙩𫚁𫞚𫦷𫱝𬂐𬝩𬢴𬤹𬳰",
 "章": "戅戆戇灨㔶䀍𠖫𡔕𢣪𢥹𢦅𢷢𤁀𥸡𧆐𧗜𪟲𫤽𫧝",
 "貢": "戅戇灨㔶䀍𠖫𠠖𡔕𢣁𢥹𢦅𥸡𧆐𧗜𪭅𫧝",
 "夃": "戤楹溋萾㨕㵬䋼𡎠𡟚𡺡𤔷𤟣𥈱𥯰𧀟𨜏𨩙𫄮𫣂𬨸",
 "亚": "戬搢榗溍瑨縉缙鄑㬐𡠂𢧫𢨙𤨁𧪽𪋳𪶮𪹓搢鄑𫨤𫫇𬅂𬅮𬓎",
 "⺄": "扟汛籸茕蝨訊讯軐迅阠鯴鲺鳵㚨㭄㷀䒖𠫲𣈟𤜢𤣲𤬫𤽰𥃴𥕚𥝡𥭰𦝠𧌡𧮬𧿅𩑓𩖜𩡰𩡵𩬰𪜖",
 "𠆢": "抮昣曑殄沴珍畛疹眕紾翏胗袗診诊趁跈軫轸鉁飻駗䂦䝩䪾𠃩𠱉𠻝𡛧𡣏𢌝𢹜𣭕𤀍𤇪𤒙𤙁𤨤𥘼𥨡𦥋𦭏𧠝𧬶𨱅𩒉𩬖𩷲𪐲𪧉𪫈𪻴𫁇𫇳𫖬𫡦𫢗𫳤𫼸𬈄𬍮𬓪𬘝",
 "三": "拦栏烂㳕𣮟𣼐𦩓𦲞𪥐𪩫𪱆𪲃𪹷𫃰𫋫𫌄𫞽𫩪𫯠𫯪𬒇𬩹𬬕",
 "丘": "捳㴈𢮼𣔆𣨡𤙿𤷝𥇸𨨎𩓥𪻬𫃃𫋄𫖵𬃆",
 "氐": "掋菧㭽䓜䣌𠴓𡌠𡍓𢋠𢋴𣷳𤚃𥁼𦰘𦰣𦽘𧨱𨌮𩃐𪂑𪂰𪃖𪝊𪽅𫢵𫪭𬢬𬫩𬺙",
 "⺖": "揯搄暅浺湉筷緪縆罹蘹㝭㮓䈐䱭䱴𠋧𠝗𠩦𠴐𠵐𠶒𠶔𠶞𠷐𠸧𠼺𡁙𡂁𡄏𡅬𡍞𡍷𡥯𡩃𡩺𡪟𡬆𡱪𢉸𢛈𢝍𢝧𢣁𢣛𢣥𢤤𢭴𢯑𢯖𢰨𣈶𣎄𣕲𣻰𥈥𥔂𥧝𥧦𥧵𥧶𥨕𥯚𦁁𦌐𦛾𦝇𦞌𦞔𦮝𦲀𦳇𦵕𦷮𧋿𧪶𨄵𩄭𪠕𪣺𪬍𪬭𪬲𪰨𪶥𫠽𫡾𫪎𫭵𫹬𫺥𫻅𫻋𫻠𫻣𫼎𬄮𬊅𬏴𬗥𬘵𬜴𬜸𬝖𬝗𬞳𬟔",
 "亙": "揯緪㮓䱭𡩃𢰨𣈶𣎄𥔂𦵕",
 "肖": "揱榍潲碿箾糏萷蕱鞩㣯㨝㴥㴮䈰䈾䌃䔠𠋱𠠄𠸑𠿀𠿫𡁻𡎮𡟩𡡏𡹺𢞜𢵥𣕇𣸛𣹝𣺰𣻘𤸮𥍕𥳓𦂗𦄏𦋞𦞚𦵱𦷟𧜔𨨺𪃅𪄨𪍛𪙌𪙑𫁄𫠸𫱶𬓹𬖹𬺑",
 "杀": "摋榝蔱鎩䊛䓭𠝨𠺽𢄌𢞒𢟌𣉜𣻑𤍁𥻦𦃏𧜁𩮫𪄅𪹤",
 "佰": "摍樎縮缩蓿蹜鏥㜚㴼䈹䑿𠍊𡪴𢳔𣩐𤛝𥀝𥕯𥼍𦟱𧐴𨟨𨢲𨣡𩐼𩘰𩥿𪩻𫔊𫫠𫺿",
 "夆": "摓槰樥漨熢篷縫缝膖蓬蠭鎽鏠韼鬔㡝㦀㷨㷭㻱䗦䗬䙜䡫䩼𡻀𡻹𢕝𣗏𣺿𥊒𥎌𥛝𥴣𦪎𦾌𦿪𧏢𧴂𨕱𨫱𨲫𩅛𩙹𩥪𩪌𪔲𪮘𪼇𫌛",
 "㐫": "摛樆漓璃瞝篱縭缡蓠螭褵謧醨離魑麶黐㷰䄜䅻䍠䬜𠌯𠻗𡴥𡼁𢟢𣉽𣯤𤗫𤡢𥕮𥻿𦔓𧅯𧴁𨝏𩥬𪅆𪒔𪖂𪤋𪱩𫀥𫬎𬓞𬓟",
 "禸": "摛樆漓璃瞝篱縭缡蓠螭褵謧醨離魑麶黐㷰䄜䅻䍠䬜𠌯𠻗𡴥𡼁𢟢𣉽𣯤𤗫𤡢𥕮𥻿𦔓𧅯𧴁𨝏𩥬𪅆𪒔𪖂𪙥𪤋𪱩𫀥𫬎𬓞𬓟",
 "夸": "摦槬𡀵𤬢𤬣𥧰𥱀𧪮𨃖𫈻𫉌𫏥𬞔",
 "㲎": "撬橇竁膬㦌㯔䄟䩁𠽶𡪣𣰗𣾽𥕹𥳈𥼛𦗨𧹺𨊉𪤛𪹮",
 "㚘": "撵攅攆櫕濽瓉纉讃鄻鄼鑚㠝㸇䟎𠓒𠣇𡂐𡣶𢤠𣞶𤁥𥌦𥎞𥗇𥣪𦪸𨇃𨇍𨘧𨘪𨣵𨯉𨲽𩍴𩯳𪿵𫌖𬧑",
 "串": "撺槵漶瞣贃蹿镩䗭䜨𠌼𡠛𢡃𣟥𣟻𤡟𧴊𧹗𨄲𨫑𪪟𪷚",
 "咼": "撾檛濄簻膼薖鐹㗻䆼䙤𠏀𡁮𡑟𢅗𤬙𤻌𥨙𧀁𧒖𨘌𩟂𪆹𪇍𪙚𪳣𫃓",
 "男": "擄艣鐪㢚㯭䲐𢢛𤺿𧒺𩯜𪟧𪟧𪷓𬄵",
 "淮": "擓㒑㨤𠿶𣿬𨆒",
 "南": "擜谳𢷁𤩽𨆕𨭹𩅠𪩘𫜰𬄬𬞑",
 "明": "擝橗𢅆𤀄𦡉𨞚𫄁𬏾𬝡𬠫",
 "娄": "擞薮䉤𠎪𡦤𡳵𡳶𤮒𥐈𥨧𦡢𦧃𪢒𪨞𪨠𪮴𫄄𫣫𫫵𫵫𫵭𫻍𬉆𬟗𬟛𬳛",
 "虒": "擨𠐀𧓗",
 "奠": "擲躑𡂸𢤜𤣀𧀿𧓸𬅈",
 "能": "擺矲羆藣襬㔥䆉䎱䥯𠐌𠤩𡓁𡳹𢅩𢤛𢸇𣞻𤁣𤳷𤳸𤻩𥶓𦌲𧀛𧞞𨇑𨮳𫔒𫛖𫬘𫻕𬘊",
 "婁": "擻櫢籔藪𠐍𡀿𡳰𡾄𢷱𣀟𣞾𣰢𤻺𥖻𦇆𧀓𧂜𧃒𧔅𨊖𨯃𩖅𩪵𩽋𪈜𫄎𫐂",
 "啇": "擿瓋藡讁㰅𡂓𡒱𡣪𢤊𢸈𢸑𤁷𤑦𤢼𥖾𧁱𧃐𨮹𪇪",
 "棥": "攀礬蠜䙪䫶𢸅𥌞𥽢𧀭𧢜𨟄𨟅𩧅𫖺",
 "睘": "攌㶎𡄤𡈵𣟳𦌾𦍃𧮅𨯬𨰄𨷣𪼮𫤇𬙪",
 "𣎆": "攍瀛灜籝籯㜲㬯㱻䃷䌱䌴䑉䕦䯁𡰠𢺆𢺑𣟅𣠾𤼘𧕳𨯤𨰊𨰠𫂯𫨁",
 "足": "攓瀽鑳㰗䙭䙯䮿𠐻𡄓𡾰𣟯𥸛𦇰𧃕𧑽𧮈𨇥𨊝𩎀𩽜𫠼𬤯𬳚𬴏𬴞",
 "鼠": "攛躥鑹𥎣𬉬",
 "囷": "攟",
 "東": "敶樄蔯螴䨯𠍀𠑤𠑤𠼂𡅰𡅰𢠣𢥱𢥱𢴟𣟬𣡘𣡘𣼼𤅍𤅍𤓗𤓗𥽾𥽾𧅝𧅝𧟔𧟔𨙠𨙠𨤇𨤇𨼤",
 "安": "暥騴鷃鼹䁙䨃䰋𠍾𡟖𡩷𢣮𢲋𣗈𣗤𣺂𤑅𦴴𧁟𧤨𧽉𨪶𨶁𨻂𩹽𪤃𫑦𫘫𫪢𬶩",
 "秝": "曆歷磿㷴㻺㽁𠟄𠪺𡐰𡓸𡙽𣙽𣦯𣦰𤡫𤪾𤯍𥷅𦠩𧝏𧬎𧯏𧽺𨬑𩅩𩱔𪅼𪙪𪠚",
 "弗": "曊梻鄪鐨镄靅㩌㵒䊧𠢥𠲽𠾚𡌅𣙿𤺕𦂓𦠻𦲫𧑈𧝇𧼗𩎵𩭬𩯃𩰾𩱣𪰂𪰶𫂅𫅿𫽧𬃮𬈕𬥚",
 "鬲": "曧瀜灊獻甗虉𣠟𤬝𥴩𨽚𨽨𪙿𪚊𬟁",
 "久": "柩湵㕗𠥂𠺖𦏇𦏇𪫨",
 "⻌": "梿涟琎琏莲裢链鲢䓕𠸼𦈐𧒭𨙌𪡏𪢆𫅼𫢪𫯇𫽁𬇓𬉋𬌵𬎍𬣴𬣽𬤦",
 "𠬝": "棴箙菔蕔鵩𠾷𢵨𣔚𤺴𥴆𦋉𧌘𧟱𧟵𨵟𨷂𩸤𪂖𪨡𫛳𬋳𬶚",
 "见": "椝窥髋鬶𣎑𪷍𫚜𫰹𬃀𬘮𬮭",
 "乛": "椟渎牍窦续荬觌读赎黩㱩𠌀𪡃𪥿𪻨𫧿𫰨𬑙",
 "头": "椟渎牍窦续荬觌读赎黩㱩𪡃𪥿𪻨𫧿𫰨𬑙",
 "介": "楐琾鎅䛺𠝹𠶋𠷟𤋽𤲂𤸋𥔅𦄶𧎁𨺬𩇁𩇁𩳻𪑹𫈨𫽜𬓳",
 "更": "楩箯緶缏鞭鯾㛹𠷊𣸇𦳄𧍲𧍻𧱩𨂯𨩫𨵸𨸇𫚣𬒩𬢷",
 "⺭": "榊簶鎺鰰㬕䀅䔃䔗䕐䗝䨩䴪𠲥𠶈𠺷𡅏𡋀𡎺𡓾𡤠𢙔𢬦𢹿𣉷𣑶𣗿𣘌𣠲𤍄𤐠𤹙𥔻𥘶𥘷𥙒𥙓𥙧𥙩𥙪𥚄𥚅𥚇𥚤𥚥𥚯𥛉𥛭𥜀𥜤𦵬𦽎𧆆𧌴𧕬𨃷𨃼𨕫𨘌𨦂𨧽𨰋𨶳𩜸𩷋𩷾𪇚𪤤𪬂𪲢𫀟𫓳𫩉𫩵𫩶𫰣𫲁𫳠𫳫𫴖𫴗𫴩𫸱𬒸𬒼𬓐𬓓𬓗𬠢𬩎𬯰𬷫",
 "巨": "榘渠菃㮡㷡𠳔𣵹𧎟𩰤𪥖𬄃",
 "廷": "榳㨩䗴𡀈𡟾𤠜𦪅𧓴𨫆𪶹𬝪",
 "杲": "槕",
 "奇": "槣檹漪羇㨳𡏾𡼋𡼭𢇎𢕗𢷔𣺈𣿾𤀽𤨥𤨦𥊘𥰧𦌰𦗞𦟑𦪌𦸒𧱺𨄾𩕲𪝣𪷼𫑁𫬷𫶓𫻀𬉀𬬄",
 "良": "樃蒗䕞𠺘𡻔𥶞𦵧𦷄𦺫𨃹𨶗𪤊𫉱𫫐𬏒",
 "永": "樣漾㨾䳮𠍵𡡂𢟣𤎔𤡀𦻑𧫛𨖌𫑩𫺖𬋼𬠘",
 "⻃": "樮櫏躚韆䉦𠊼𢃾𣺗𪝴𫾔𬎚",
 "走": "樾蓗㯧㿐𠻀𠾲𠾸𡁻𢲛𢵒𢵼𢸋𢹤𣘊𣺺𣾼𤸭𥱰𦅲𦠶𦪂𦹼𦼛𧑅𧽇𧽈𨃝𨅿𨕍𨬓𪆧𪒥𪼊𪽸𫋦𫌐𫎼𬏌𬙄𬷲",
 "戉": "樾𠾲𢵼𣾼𦅲𧑅𨅿𨬓𪆧𪒥𪽸𫌐𬷲",
 "票": "檦薸㠒㵱䕯𠎼𠐆𠠕𡁼𡢱𡣋𢅚𢢼𢶏𢷋𣠓𣿖𤃛𤅜𥋠𦆝𦣕𦾑𧝼𨆺𨭚𨮬𨮶𩦠𩦾𬭺",
 "忽": "檧",
 "區": "檶櫙藲䉩䥲𡂿𢋔𤁮𤮥𥗄𧞨𨊘𬥍",
 "貴": "櫃濻瀢籄藬讉鑎㙺䑊䕚䪋𠏺𠑌𡣓𢷴𢸦𣄧𥌰𥎛𥶐𦆠𧂠𧄑𧔥𧞸𧸽𨯯𨽟𩍨𩏱𩽎𪐔𪺊𫏩𫻑𬑄",
 "登": "櫈㡧䠬𠐏𡂱𡓂𡦮𢷚𢸞𣞽𣟑𤃥𤃶𧔛𨯷𪔶",
 "發": "櫠䉬䕠𡓊",
 "既": "櫭𡁙𡃢𡒖𬵺",
 "象": "櫲𤂻𫡡𫮻",
 "焦": "櫵爑蔺藮蘸䌭䕴𡃼𡆖𢤼𢸺𧀡𧂒𪇶𫑿𫣾𫲔𬁞𬷹",
 "肅": "櫹瀟蠨𡣾𢹱𤄙𧅣𧹀𩙚𩧓𬘎",
 "䍃": "櫾蘨㒡㘥𢖟𨙂𨷱𩆍𫧊",
 "溥": "欂礴鑮䭦𦢸𦣈𨏫𩍿𩏵𩽛𪎄𪚂𪚈𬮁",
 "與": "欅襷㩮㶛𣍛𣟱𥗵𥗻𪼰𫵬",
 "臧": "欌臟贜鑶㶓𡅆𡚥𡿄𢆮𣰾𤜐𦇴𧕨𨤃𩰅𪓅",
 "霝": "欞爧㦭䄥䉹䖅䚖䡿䰱䴒𠠱𠣋𡿡𢌔𢺰𣌟𤅷𤖦𤜙𤣤𤫩𤮹𤿅𥘃𥤜𥤞𥩔𥾂𦫊𧖜𧟙𧢱𧯙𨟯𨤍𨽲𩑊𩟽",
 "雚": "欟𤼢𩙣𪈸𪈻𪯄𫕷",
 "炏": "歘燊飈飊飚㲭𠟡𠢸𢊽𢴵𣄡𤍢𤓔𤓔𦼐𧄣𧷼𨗄𨞇𩉅𪹽",
 "冗": "殻㸿𠳗𡋼𢭜𣒆𨧣𩂸𫒸𫖡𫪌",
 "並": "氆潽譜谱鐠镨㠮䲕𠒻𠽾𡐭𡚈𡡝𢢏𣌞𣚴𣯽𤩓𥐄𥐅𥲵𦡮𧑹𧾃𪨟𪾿𫌑𬶴",
 "𠀁": "汚𠄥𠄥𠆬𡧈𢁢𣂭𥏤𦉿𦖓𦘼𦫩𦯟𧥦𨠱𫏲咢扝𬑌𬚒𬚔𬝷",
 "与": "泻䥾",
 "午": "浒滸䔓𠼯𢠇𤡈𤾟𫳠𫼎",
 "⺳": "浫𠳾𠶀𤀻𤞶𥺍𦯼𨨥𨼣𪣟𪳨𪿡𫎩𫒢𬤂",
 "丹": "浵烿㮵𩔣𪄟",
 "中": "浺筗茽贒㑖㣡㥙㳞㴢䛱𠉿𠊞𠐥𡲦𢘑𢘗𢝈𣚍𣷡𣽢𥁵𦌭𦌱𦍈𦍊𨡵𨨩𨵖𩗻𫁁𫁑𬅇",
 "冗": "涜続読𬭒",
 "韦": "涠",
 "长": "涨𬦵",
 "丌": "淠痹睤箅綥腗鼻㑭㫅䟚䭼𡉝𡉨𡻼𢈷𢗏𢮧𣂕𣔔𤖄𥘕𥚈𥟝𥫶𥾟𥾦𦨘𦬟𧚽𧨬𧳠𩵧𪊔𪗞𫞉",
 "兌": "渷𢯻𦳆𦸍𧀲𨺥𩏈𩘍",
 "亦": "湙㴒㷜𨩌𪣼𪲱𪼁𬑢𬓍",
 "侖": "溣磮𠍓𠹹𠼩𡃝𡐇𡠱𢳳𢿗𣜱𣼍𥶡𦟹𦷉𧐩𨫅𫤍𫩎𫶗𫾗𬣎",
 "帀": "溮獅瑡篩蒒螄躛鰤鶳𡟪𡠋𢲐𣟉𤹌𥶽𦾦𧏍𧔽𧜂𧲔𧲝𧲞𨇙𩥐𩮭𪄜𪝜𪪀𫑺𬄁𬊄𬩼",
 "半": "溿𠴞𡖱𡞟𢭬𣵲𦁂𨉠𨧘𪨠𫆠𬇯",
 "攸": "滺",
 "叔": "漃蔋𢠭𦵦𧝴𫳺𫴇",
 "長": "漲瘬㙣㯑𢊜𢐓𢳫𦸾𧐊𨄰𫣖𫫧𫬖𬛙𬞾",
 "宗": "漴㓽䉘𠼾𡿂𢠄𣙩𣛂𣰁𤨲𥊠𥛢𥡶𥨢𥲚𥵹𧐿𧽧𨅃𨝡𩅃𩻃𪅁𪉻𪷯𫌌𫓁𫫥𬳐",
 "肃": "潇蟏𤎻𫾃",
 "昆": "潉熴𠽞𢠎𣙍𤨾𦄬𦹲𪟓𫮞𬵥",
 "攴": "潊闅䌄𠊳𠶺𠷾𡁞𡎩𡪵𡫪𡼋𢾔𣌘𤥷𥂲𥆗𧁰𨰮𪈷𫂜𫢛𫼀𬧵",
 "佥": "潋蔹䈩𬋃",
 "⻊": "潞璐簬蕗鏴露鷺鹭㯝䕽𠏠𡀔𡫞𡽘𡽞𢷅𢹡𤢊𤮗𥶛𦌕𦓉𧀢𧀰𧃌𧃐𧒌𧒍𧸚𨅩𨇳𨈃𨎲𩁐𪆬𪆽𪛅𪴁𫄉𫄌𫊛𫘘𬄼𬖀𬞐𬞞𬟅𬟐𬵰",
 "血": "潨䝦𦗰𧢙𨵨𪅢𪢊𪺖𫏢",
 "乑": "潨藂鄹驟骤㔌㵵䝒䝦䠫𡒍𡽨𣀒𥣙𥵫𧓏𨞮𨽁𩍧𩼦𪢊𪿼𫏢𬬒",
 "知": "潪䚐䠦𡐻𡡧𥋒𧒊𨼓𪳲𫋰𫣠𬕼",
 "韋": "潿讆躛㦣䙟𠄿𠆎𠑒𡓎𡼱𢆈𢖨𤜂𥴞𦾛𧁮𧃙𧝕𧝖𧲔𧲝𧲞𧾦𨗨𩏉𩙃𩼀𫉔𫣤𬉧𬎉𬣔",
 "𣥖": "澁蕋蘃𠟞𠦾𠾜𡢋𢡬𤎠𤺙𥖋𦿼𩻩𫓋𬄢𬆐",
 "寅": "濥𡒕𧓒",
 "色": "濪灧𠾼𡅩𡤩𡤸𤣚𩇝𪮖𫈵𫦌𫦳",
 "盍": "濭灩瓂礚鑉饚䡷𡣨𢅤𢷞𣝒𤂠𤻜𦾃𧞔𨞨𨽈𩍰𩕭𩡤𫇙𫠁",
 "菐": "濮纀襥㙸㯷𡂈𡃒𡃾𢷏𤪟𤾷𥣜𥵜𦢟𦿍𧭎𨆯𨮓𨽂𩍩𫶟𫸆",
 "⾆": "濶𡁡",
 "倉": "濸𣋃𤏬𤺨𥴻𦾝𩕹𪼧𫤤𬰌",
 "軍": "瀈璭㩣𠪷𡽅𢶂𣜸𤑱𦅿𦇊𧬪𨏂𩅴𪷦",
 "舄": "瀉藛㵼䥱𣞐𤒘𥖽𥶘𧂙𧓺𧭠𧸹𧸿",
 "般": "瀊䃲䰔𡂑𤻧𤻷𦽮𧓙𪼪𬬛",
 "争": "瀞𧬦𬰆",
 "遀": "瀡瓍㰐𤅵𤢩𥶻𦢪𧁼𨯝𩪷𫲙",
 "𣪊": "瀫𠥚𢢿𥷆𧂔𧲇𩍤",
 "俞": "瀭癒蕍䕆𡫞𢋅𢢭𢶖𢷀𣜴𤀒𤀨𤪂𤻍𥣒𦾤𨮋𩙋𩙍𪤣𪬪𪿐𫕲𬉦𬕷𬲠𬷴",
 "爾": "瀰獼瓕㜷㣆䉲䌳䕳䥸𡄣𡓭𡾱𣠝𤄽𤣐𤫆𤫏𤿂𥸀𧟚𨇳𨣾𨰡𫬹𬬠",
 "僉": "瀲籡籢籨蘝蘞㶑䊴𠠬𡃍𡄥𢅸𢋻𢌃𢸟𢹦𢺅𣋽𣌋𣟺𣠇𣠺𣫢𤑯𤒡𤒥𤒦𤢾𤼏𧁴𧂹𨇓𨣻𨯘𨰇𩆯𪩪𫤐𫾛𬒫",
 "廌": "瀳韉䍎𥤆𧟆𧲛𨰂𨷳𫼒",
 "敏": "瀿蘩㩯𧁋𩎆𬪤𬹬",
 "泉": "灁𠫐𠫐𠫐𦌶",
 "監": "灆礷蘫㘕𠑈𡅋𤓆𤼓𥍍𧟋𧾲𩟺𪈭𪸄𫲝",
 "豊": "灎灔𡅏𡅩𡓾𡤠𡤩𢹿𣠲𤄝𤣚𧕬𨰋",
 "景": "灏灝𡂵𤂖𥶩",
 "亶": "灗𧖞𩎄",
 "單": "灛玂鄿䕤𠆛𡃹𡓥𢥇𢹺𢺛𤻾𥗜𥸍𧂁𧟀𬉢",
 "豐": "灧灩𡤸𤅿",
 "鬯": "灪爩䖇𡯀𡿥𢺴𤓮𥘄𪓊",
 "升": "焺陞髜鵿𡱚𢛿𧖿𨵒𨺒𪲙𫢰𬗛𬴙",
 "召": "照綤菬萔鍣㯧䈃𠶅𠶕𠾸𡎣𢜌𢵒𣙭𣸬𤉎𥋑𥴜𦀧𦠶𦴚𦹄𦻟𧍌𧝨𧼹𪦐𪶎𪷰𪸳𪹃𫺕𫾸𬁤𬍨𬗞𬙄𬥃𬭡",
 "呂": "熍㴦䃔𠹒𢞏𢾮𣪯𤹜𦵡𧎡𨜳𩘎𫱜𫳓",
 "𦣝": "熙𢞍𫿉𬦘",
 "昜": "燙璗盪簜蕩鐊鐋霷鸉𠎯𡐀𡑑𡢈𡼍𡾕𢡂𢴳𣿘𤺹𤻈𥂸𥨛𥳜𦼳𦼴𦿄𦿆𧑘𩁒𪇚𪤝𪳷𫉤𫶖𬀑𬛡𬬍",
 "劦": "燲𢲊𬃹",
 "昭": "燳𥵕𬡰𬪸",
 "埶": "爇藝𣞕𪷴𫉥𫸾𫾓𬡵",
 "熏": "爋蘍䌲𡓕𡤂𣌕𣎰𤑕𧰣𪈧𫾙𬅑𬟝𬬡",
 "華": "爗𨯮𫤨",
 "井": "琎㣋𠛜𠜚𠵡𠵡𡈇𡌁𤍧𤥪𦓮𦷂𨚢𨦿𫈁𬈈",
 "㐬": "瑬蓅蔬鎏𠺩𡏬𢑎𣹭𥧕𥰤𦠦𩙣𩱢𩱱𪃂𬄼𬈰𬉕𬞞",
 "秀": "璓𡁹𫇣𫫟𫽾𬝽𬟒",
 "洰": "璖磲蕖蟝㣄䝣𠍲𠹱𡡥𣯸𤡷𦄽𧕎𨬡𩱮𪆂𪆫𫐀𬄨",
 "壽": "瓙𠑥𢥰𤅕𤴃𪸈𫬦𫾡",
 "加": "瘸㗎㵑䕒𠏼𠟒𠷉𡃉𡣗𢉤𢱌𣕧𣖚𤀺𤐵𤪘𥰮𦩪𧝂𧬂𨔗𨔣𨔽𪯀𪳇𪳺𫅘𫈆",
 "急": "瘾𣝟𪢖𬄩",
 "肉": "癵𡆝𫓘",
 "于": "盓窏荢䢓䣿䨕䵦𠱶𡋖𡜡𡷎𢰵𥎿𥒀𥙶𥷯𦊯𦰲𦱃𧋂𧙶𨩜𪻝𪾩𫁢𫢝𫺃𬇢𬐞𬐟𬔿𬗒𬫢𬹫𬹷",
 "川": "瞓𣉤𫖦𫯮𬈝𬱍",
 "甚": "磡霮䉇𠾻𡀃𢵺𤩌𥖘𦤯𨮊𪭕𫃒",
 "爻": "礟𩈾𩈾𫁙𫁙𫬇",
 "卸": "禦篽蓹䥏𣊗𬄧",
 "是": "禵㵓䔶𠤧𠽮𠽰𡄷𡐾𢖤𣠢𣼮𣾸𤄭𥳳𥶛𦻀𦼙𧀠𨫞",
 "丅": "竵𫨣𫲒𬆻𬥤𬴜𬴠𬴡𬴢𬴣𬴤𬴥𬴦",
 "甲": "筪㭱𠶟𡒮𣜊𨆇𨧄𪡄𫼸",
 "夬": "筷蒛䆢𢭯𢭴𥊜𦯊𧋿𧎯𧻯𨶏𨸊𪁠𪟅𪬭𪭱𫪎𬚇𬜴",
 "台": "箈緿菭葈㗠㬃㷘䈚䈢䕂䢄𠕡𠝔𠢙𠢺𠫅𠫆𠶠𠷂𡤓𡤔𢰥𢰾𢲹𢻙𣔗𣕘𣗺𣗻𣘜𣜨𣝜𣞟𣟼𣟽𣠎𣠏𣹓𤠂𤦮𤯯𤷩𤸊𤹇𥀌𦂅𦈒𦠬𦥅𦥐𦰯𦲀𧄈𧜐𨃐𨐠𨖎𨵔𨽿𩌂𪞅𪦲𪶝𪶩𫉳𫛋𫨐𫰶𫺭𫿥𫿺𬓐𬔟𬛝𬜷𬝭𬟖𬨴",
 "刂": "箚葪䉇䥷𠊏𠋙𠟸𢵏𣺤𣾅𦴟𪰝𪲫𪷌𫦗𫶚𬨼",
 "先": "箲贊贊赞赞鍌𠊏𠐷𠐷𡄋𡄋𢝚𢱓𤄳𤄳𤅬𤅬𤫨𤫨𥌳𥌳𥳱𥳱𦺷𦺷𧑯𧑯𧮖𧮖𨅩𩱩𩱩𪝮𪷮𫌦𫌦𫷉𬃫𬈞𬕰",
 "匝": "篐",
 "丞": "篜蒸𡏈𡞷𢾧𤸲𦞪𦴸𧪣𩄔𪳜",
 "圼": "篞𡮛𢟗𣻾𦄇𦶄",
 "戋": "篯𣘷𦶻𧰞",
 "卑": "篺簰簲薭螷蠯㯅㵺𢳋𣝁𤼜𥴖𥵔𥽅𦔠𦸣𪷗",
 "昔": "簎籍藉䎰䣢䥄𠺦𡓠𡩤𡽞𣛵𣯗𤁏𥕉𥕒𥧶𥳯𦄩𨆮𨝨𨞒𪮫𪺦𫠀",
 "周": "簓𢸛𤂂𥶏𦶌𦸔𧐸𧔿𪄄𫊃",
 "片": "簰蝂䕈䥡𣚙𣛻𣽖𦾭𧌿𫤵𬌋𬕕𬛿",
 "录": "簶籙䃗𣿍𦾞𨘭𪤤𬓗",
 "冓": "簼𡄧𡒫𥵡𦾼𧃛",
 "垔": "籈薽𠿣𧞙𫴍𫴖𬮕",
 "瓦": "籈薽䉚𡍻𡹳𡿕𢣓𣛏𣝚𤫣𥗯𥷖𦉐𧞙𨇹𩆣𩼭𪗃𬅎𬫱",
 "耒": "籍藉藕䣢𡫢𣉶𣟪𤁏𤒛𥨱𦶮𦷂𧂬𧂭𨆮𩽔𪡱𬕽𬶹",
 "留": "籕㽌𣠚𤄐𥵄𦽾𩆎𫫶𫬂",
 "睪": "籜蘀㶠䕪𡅵𪾜𫊏𫓡𫕵",
 "御": "籞蘌𨯣",
 "豦": "籧蘧㘌𤁴𥗌",
 "㡭": "籪𨇰𩠹𩪽",
 "龠": "籲𤅢𤅰𥤖𥸤𧆆𨈅𨈋𪛒𪛔",
 "壯": "糚㮜𣼥𨫲𫧔𫱡",
 "入": "糴䨀𪞶𬵊",
 "逢": "纄蘕鑝𡂫𡓄𢸚𣠑𤂧𤑫𧓶𧴟𨏕",
 "允": "统铳㓍㧤㳘䘪䟲𠒨𠒩𠡜𡊿𡎭𤞀𥅻𥒝𥬱𦚳𩩇𪁇𪎽𪗯𪞅𪡁𪻰𪽒𫸊𬓦𬪲",
 "雲": "罎𤃅𤮦𦉡𩪺𪓂𪩿𪴘",
 "肙": "羂㯞𠅻𡫂𪡵𪬙𫡾𫯗𫳦𫻠𬊫",
 "卓": "羄𠕭𡁇𥋽𥴙𥵤𦄹𧐼𨄵𪮮𫕭𫾇𬕩",
 "帝": "膪𡡿𢕮𢴨𢿪𣚌𣾪𤀐𦔝𧀰𧂨𧝐𧬍𨅙𨗁𨬙𪆡𪍼𪯙𫣥𬖀",
 "茂": "臓𨊙",
 "萈": "臗鑧髖𢸎𣟂𦆼𦒨",
 "⻀": "舊𠑛𠣷",
 "兆": "艞𠝡𠻩𡡃𢊙𢱐𣁿𣂀𣂁𥰜𦃻𦾺𨃑𩋍𪳒𪴁𫃹𫚅𬵰",
 "𠚪": "茘𠦢𣴀𣹣𣻭𦚰",
 "丩": "荍䆗𠈅𠲠𡓙𡱙𢫃𣌺𤙘𥅪𦀏𨦀𨳟𩷊𪯊𫆃𫉨𫢿𫣮𫩄𫷕",
 "丬": "荘蒋螀装𫦋𫽣𬌒𬧀",
 "𠮠": "莂㭭𡋾𡷘𥒻𥞲𥦂𧧸𧭀𨴾𩷤𪿍𫊽",
 "冘": "莐萙霃𠴥𠶍𠹆𡹟𢭽𤉠𥁭𥂘𧖶𨧁𩻕𬈓",
 "丑": "莥饈鱃䡭𠴐𥀞𦁁𦛾𦟤𦪋𦶆𩘭𪅠𫃩𫅡𫭵𬖱𬚂",
 "犮": "菝𦴡𫱈",
 "包": "菢褜㵡䥤𠿙𢛺𢯿𢶉𥮼𦡕𦳤𧂫𨣙𩎾𪺃𪾑𫉌𫽵𬋗𬋚𬞆𬰀",
 "平": "萍𪮂𫮉𬃟𬍷𬕘𬕱𬝈𬞖",
 "仌": "葅㮚𠛧𠧴𠨋𠨋𠨋𡙉𡜃𢢙𢾃𣡷𣡷𣡼𣡼𣡼𣣧𣣸𣰮𣿚𤩰𤪎𥃐𥻆𥽽𥾄𥾄𥾄𦵵𦿥𧡹𨔟𫦆𫦛𫦡𬃄",
 "奻": "葌𡟗𡢹𩤦𫳣",
 "巠": "葝鑋𢷰𣱮𣻽𤠃𥯙𦳲𦽁𧸰𨆪𨖑𨮫𩐺𪡿𫡸",
 "夋": "葰䈗𦾹𨫳𩆑𪡟𪶠",
 "𠂢": "蒎鎃霢𠸁𤋻𥯠𦞓𩄂𪃻𪅚𪡤𫮏𬧁",
 "如": "蒘蕠㵖𢞙𣖹𣹤𣺾𥰪𦷸𫉅",
 "位": "蒞",
 "兔": "蒬䥉𡟰𣹠𥳿𩌑𪆆𪑲𪡶𬞎𬱒𬱒𬱒",
 "坐": "蓌遳𡎻𣖵𨫈𪶶",
 "夌": "蓤蔆薐䉄䔖𠻱𡏹𡡷𡺿𡻴𡼹𢁋𣍚𦼊𨫭𪅋",
 "奄": "蓭𣚖𤑷𤪄𦺽𧫥𪩑𫫡𫫼",
 "疌": "蓵𠌿𠽕𢐛𧐥𧲌𨖋𨘉",
 "旱": "蔊𥳼𫺥",
 "畐": "蔔㨽䒄䒇䔰䕐𠔸𠠦𠾙𡡩𡬂𢠲𤐧𤐸𤑏𦸕𦾕𦿁𧬙𨄑𨄩𨏟𨬬𩍏𩯅𪆠𪧰𪷛𫋖𫕑𫙻𫣕𫣡𫦚𫲮𫴗𫴩𬁗𬋋𬣖",
 "冬": "蔠䈺𡈡𢃠𢛾𢥕𧈆𪾒",
 "卷": "蔨𣙢𥱽𬈨",
 "⺪": "蔬䔫𠽔𢵽𦠦𫑽",
 "弟": "蕛𦌢𦸫𩻋𬰐",
 "昷": "蕰蕴𡀦𧂯",
 "叚": "蕸𠽙𡄟𡤕𡺁𣘟𤫑𦹜𧄁𧕖𨙉𪝪𪝺𪸀𫖄𫬗𬘐",
 "镸": "蕼䕃𠺆𣺮𥱫𨻝𪄤𫯾",
 "爰": "蕿藧蘐𤀣𥶍𧞈𪷠𬕯𬣊",
 "𥁕": "薀蘊𨷇𨷐",
 "辱": "薅𣟪𤒛𧂭𩽔𬶹",
 "帚": "薓𢵴𣞂𣺎𥲳𦸱",
 "袁": "薗薳闧𠐛𡈤𡑰𡣱𢸃𣞲𤪹𤾮𥌡𦇏𦍆𦒬𧔘𧭴𨏙𨘣𨷤𩯴𬕶𬙫𬬎",
 "産": "薩",
 "豸": "薶霾㦟𠹕𡺵𢱹𤂚𥔰𦷒𧕤𧕥𩯬𪕺𫭓𬟈𬥋",
 "巢": "薻𥊌𦾱𫬈",
 "癸": "藈𣋒𤢑𤩸𦘍𦺕𧬧𨆠𩦟𪆴𫶙𬄲𬸮",
 "扁": "藊𢴂𤻶𦽟𪝹𫣪𫣱𫤑𬄈𬞤",
 "戕": "藏贓㵴𡁧𡒉𡒤𡒥𡽴𡾻𢨑𩯩𩽮𫿎",
 "欶": "藗𧀌",
 "覃": "藫㶘䨵𤁡𫾘",
 "躬": "藭𠤊𡃕𡾈𤢶𧔚𧸺",
 "尉": "藯",
 "保": "藵𬡭",
 "喿": "藻𤒕𥩃𧂈𧅂",
 "惢": "蘂㰑𡾚𧄜𬉡",
 "亀": "蘒",
 "辟": "蘗𠫀𢋶𢸵𢹐𤃎𦍁𧂸𧕀𪸌𫕶𫤃𬉭𬐀𬩮",
 "殹": "蘙蠮𡤖𧕪𧮒",
 "嗇": "蘠𡓜𡤑𫮽",
 "黄": "蘣蘳㶇𤂲𤣊𪏜𬣕",
 "爲": "蘤𤾸𧓯",
 "湯": "蘯𢥉𥗔",
 "褱": "蘹𡅬",
 "路": "虂𤅟𤫢𥸐",
 "韱": "虃𩇏",
 "鳥": "虉靍靎靏鴈䆇䕵𡄠𡅂𡒮𡤝𡤻𣿆𤀙𦽏𦿂𧄞𧄷𨈎𨙧𪀱𪂓𪂘𪃥𪅔𪅻𪇃𪈨𪈬𪈼𪈼𪉀𫊓𫬚𬉳𬟑𬩯𬷉",
 "敝": "虌𡃇𣋹𤾵𦻾𦿔𦿝𧆊𫦣",
 "反": "蝂鋬𡋴𡞟𧌿𪾗𫩾𫪒",
 "利": "蟍鏫䔣䔧𠼐𠼝𣗱𣙔𣞴𣼵𥊈𥲧𩥴𩦀𩻌𪅌𫉃𫉋𬝒𬝲𬬁",
 "代": "蟘𧹋𫋌",
 "戎": "蠈鱡𣛸𣿐𦽒𧒿𧜆𨆎𬝠𬠠",
 "奔": "蠎",
 "署": "蠴",
 "雀": "蠽㘍𪇲𪙻",
 "樊": "襻鑻𢺏𥜳",
 "雋": "觽㒞㰎㼇䥴𡣸𢤮𢹂𦢥𧔍𧮄𧲑𨟎𩧎𩽌",
 "兮": "諡䤈",
 "賣": "讟𥸚𧮡",
 "太": "豓㗐",
 "圡": "賘𪭽𪸱𬫝",
 "㹜": "贆飆飇飙䁭䔸𡪱𣄠𣽼𦠎",
 "武": "贇赟𧸔𨭉𫂩",
 "倠": "贋赝㷳𢋩𣾀𤎝𤏚𪆒𫍑𬒡𬪚",
 "𠌵": "贗𡃌𤂮𤑤",
 "兩": "蹒颟",
 "𨸋": "躏",
 "𦐇": "躢𡓲𤒻𧮑𨰏𪹹",
 "耤": "躤𤅔𨈁",
 "閵": "躪轥𥽼𨙟",
 "囙": "逌䚃𠧠𢈞𣤦𤈴𤨗𤩤𨖯𨗰𨙃𨛕𪾏",
 "全": "醛𣗎𣛩𦴽",
 "关": "鎹餸㮳㮸㴨𢱤𢲂𣞅𦷴𨃗𨃵𨫇𩠌𪝝𪞄𫧄𫮗𫯖𫺫𬁨𬚥𬝤𬟀",
 "启": "闙𫫤𫹢",
 "左": "隓隓𪘓𪘡𬺇",
 "巿": "霈𢭿𢯨𣈰𣣐𨃋𩹩𪲳𬆃𬢉",
 "弘": "霐𥦷𫒮",
 "旁": "霶𡽲𦾭𫆼𬉘",
 "歷": "靋𧄻𫭁",
 "隺": "靏𡃜𡑗𤏥𦾣𬈼",
 "存": "鞯𢞻",
 "風": "飍飍𠑒𣛄𤀘𤅜𦣕𨅏𩙐𩙣𫙹𬡟",
 "号": "饕㙱𣜍𣜵𤩭𧰑𪷢",
 "香": "馫馫𬟞",
 "死": "髒𠿺𤃫𥍇𩖎𩙛𩦦𪈘𪖻𪳳",
 "𠁁": "鬭𤂊𤃮𧞐𧞗𨮕𨷖",
 "𠚍": "鬰鬱𢋺𣡎𣡫𤅥𤅪𤓄𤓡𤿃𥠴𨤊𩰠𩰡𩰢𩰣𩰤𩰥𩰦𩰧𩰨𩰩𩰪𪴴",
 "官": "鳤䌣䪀䲘𤪔𤻥𨘃𪴌",
 "奚": "鸂𤄬𤣕𧄰𧕉𪷶𬉝𬞥",
 "助": "㐥",
 "厽": "㒍䠁𠜸𡼊𢴱𣚎𣸫𤛡𤮎𥊻𥳮𦅍𧬀",
 "飠": "㔳𠍃𠑬𠿰𡆁𤀔𤃠𤏼𥃗𥍘𥽁𦈂𦣗𧃋𩰈𪾗𫄑𫨜𬉣𬛠𬷸",
 "𢆶": "㗀䫜𠋔𡺖𢇑𢇕𢇕𢉾𢰠𢹴𢹴𣠭𣠭𣾧𥠃𦂣𧍘𩘈𩡎𪃨𪋎𪴉𫧽𫲪𫶹𬈖𬨧𬱮",
 "若": "㘃㥾䁥䘌𠽋𡠷𢢉𢴚𣘗𤎐𩺱𪐌𪙛𬳤",
 "罒": "㘄𬚠𬥉𬦚𬫸𬯦𬯦",
 "彥": "㘖𫌧",
 "龍": "㘛𠑙𡔆𥸉𨰧𪚥𪚥𪚥𪚥𫲟𬅚𬎡",
 "巸": "㜯𠘕𡁱𤀠𤐤𪷨𬞭",
 "㐁": "㝛𠉦𪢓𬆹𬞿",
 "星": "㝭𥨕𫬞",
 "夊": "㡪䦩𫍺𫓸𫶛",
 "兒": "㦦𤂚𤄎𧄷𩰕𪝷𫻁𬰖",
 "処": "㨿𠽁𡼆𣊑𤃔𤓤𤓤𥱿𧇡𧇤𩌲𬹜",
 "虚": "㩬𡃰𡾠",
 "䀠": "㪺𠟰𣰋𤩵𥋢𨞜𩍟𩕦",
 "𢼄": "㬖𢴖𬑷𬢅",
 "卬": "㭿𠑕𠳑𠵫𠶐𢯤𥈁𦯒𨓑𨦪𩣍𪸺𫤏",
 "夹": "㮉",
 "声": "㯏㲆㲇㲈㷫㿦䅽䡰𡄈𡄒𣪤𣫊𣫒𣫘𣫙𣫜𣫝𣫣𣫤𣫨𧐡𪍱𪐕𪔰𪚣𪡹𪵑𫌤𫶲𬆍𬺝",
 "芬": "㯣",
 "曹": "㯾𨘨",
 "秦": "㰉𢸩𣝾𦿒𫇑𬉔",
 "戚": "㰗䙯𡀌𡂔𢅪𢷾𥀽𦇰𦢑",
 "樂": "㰛𡤤𤄶𥍐𨰤",
 "弁": "㳰𡢸𤥡𥴥",
 "丏": "㴐𢚽𫦇𫾮𬥕",
 "亟": "㴠𡞿𢞊𤠀𤺷𦋣𦴻𦻭𦽯𫀛𫒶",
 "旨": "㴯𡃊𡓈𣶫𣿉𥗎𦪼𨯀𫆻𫶞𬭿",
 "充": "㵁𧀏𨭑𫌒𫫴𬔕",
 "它": "㵃𣵻𦱆𨫯𩃱𩎼𪂊𪘕𬐥𬠶",
 "姑": "㵈",
 "盾": "㵌𠎻𡀷𡮽𢶿𣛝𣜲𦅑𧝩𨆛𨮐",
 "屈": "㵠𠏅𠟶𡀙𡑣𡼿𥖚𦡆𫁗",
 "寽": "㶁𢸗",
 "𦋹": "㶔㿙𤖤",
 "間": "㶕𡅉𣠰𨰝𪦴𫌙",
 "應": "㶝",
 "襄": "㶞䖆𡔒𣌝𣡤𧅼𨤼",
 "䏍": "㷱",
 "㼌": "㺠",
 "禿": "㿗𣟩𦢶𧔾𨯸",
 "犀": "䆈𡂙𢹌𥽩𧞽𧭟𫮼",
 "册": "䈀𫿪",
 "灰": "䈐𢉸𨫿",
 "眉": "䉋𪾛𪿷𬛾",
 "悤": "䉥𤄋𦇎𦿞",
 "骨": "䉰䕧𤅵𪆸𫾈",
 "辡": "䉸𡅼𥷁𨐾",
 "丙": "䌄𠊳𠨈𠶺𠸳𡎩𡩊𡹾𤋲𤶮𤶯𤻓𦳼𨧇𪈹𪈹𪶾𫈡𫦝𫪲𬕢𬜼",
 "兑": "䓲𠾔𡣛𢴎𦢴𧭚𪷄𫌎𫱧",
 "㚣": "䓸",
 "尨": "䓼𧎞𩤴",
 "沙": "䓾𣘡𣯌𣯢𨪍𩺳𪍬",
 "叟": "䕅𤁨𦢝𩽉",
 "妥": "䕑𤃠𥱮𦵭𩝺𫃸𫄌𫄑𫏙𬈗𬛠𬧇𬧗𬷸",
 "曼": "䕕𨞼𩆓𫲏𬞽𬟦",
 "孫": "䕖",
 "爯": "䕝𡚕",
 "差": "䕢",
 "衤": "䕣𠠭𠬕𠬖𠸗𡀨𡅢𢮀𤁖𤑏𤹒𥓸𥵩𦁅𨗗𩷞𪁲𪯨𫋶𫫢𬕦𬞆𬞔𬡩𬬣",
 "畺": "䕬𠣀𠣃𡾪𦇤𧖑𧟂𨯞𫕘",
 "稟": "䕲𡓔𡾭𢤭𤃢𤒢𪥀",
 "蒦": "䕶𤄀𧅰𫻞𫾢",
 "蜀": "䕽𢹅𤅴𧁿𧃏𧆇𪈌𫬼",
 "難": "䖄",
 "厲": "䘈𤄆𥗠",
 "夨": "䜁𪃇𪃤",
 "吾": "䢩𠋼𠑕𡂂𡈰𡩺𢔴𢣸𤻭𥧝𥧸𥲐𦷮𦷽𩄭𫉎𫤋",
 "亨": "䥋𨢶",
 "𠈌": "䥘𠎥𠟏𠪞𦔡𧾀𨅦𨗀𨣋𩁆𩻶𪙮",
 "堯": "䥵𠑬𡃺𡆁𡮾𤃤𤄮𥍘𥽵𦈂𦣗𧄍𩰈𬘏𬲢",
 "算": "䥷𬲣",
 "卂": "䭀𠌻𩠇𩷰𩾄",
 "彔": "䴪𠺣𡽋𣝵𤀓𤀼𤐠𤳨𥂖𦽎𦾯𧃆",
 "冃": "䶇𩍌",
 "⺇": "𠁉𢙜𩃥𬄑𬇺",
 "皇": "𠁉𧕸𬄑𬉒",
 "吏": "𠅚𣔤𣷱𦲺𧍅𧍇𧳡𩸲𪮈𫤄",
 "列": "𠅜𠗹𠺅𡂲𢟏𣈙𤍅𤹐𥵘𦤭𦶣𧏲𧝦𨃻𩄰𪶭𫊔𫕪𫜗𫶸𬟜",
 "失": "𠅼𠞠𦂾𦷍𪮞𪶵",
 "否": "𠊑𠝒𡌮𩭸𬃙",
 "弜": "𠊨𫅈",
 "𣅀": "𠋩",
 "毎": "𠍁𠻽𠽊𡠫𢄯𢲨𤍃𤨨𥉪𥼖𦷫𩘫",
 "⺞": "𠍇𠠋𡋹𬋁",
 "丮": "𠍠𦢼𩧣",
 "乏": "𠍥𠸾𠻅𢵉𣓦𥁷𫱑𬜎",
 "希": "𠍫𠻑𤏤𤏨𦻎",
 "𢏚": "𠍻𡑏𢄛𪆇",
 "芚": "𠎲",
 "尾": "𠎴𪯚",
 "严": "𠏊𠐚𪇾𫤌𬔨",
 "?": "𠏊𠕏𢁹𢲏𦣚𪤱𪪫嘆𬔨𬥮",
 "要": "𠏕𪱘",
 "乀": "𠏨𠯙𠰯𠱱𠼥𢟶𢪍𢴃𣧖𣲡𧉍",
 "道": "𠐵",
 "舀": "𠑑𢹡𤄅𨭡𬀝",
 "折": "𠑵𠹗𠻯𡀢𡂉𢲃𣻂𥉭𦄃𧎴𧏄𩺢𩻔",
 "隼": "𠓼",
 "妾": "𠙤𡁕𤮌𥵳𦌈𪡸𫬝𬵤",
 "幵": "𠟳𪄃揅䗗",
 "卯": "𠠇𣶐𦝐𦵂𨺸𩋶𩤶𩹡𪲺𫤋𬚣𬪋𬳖𬶘",
 "岡": "𠠊𡬼𣙋𪮚𫅙𬌧𬬀",
 "朁": "𠠭𡅎𢹽𥸄𧹿𨇸",
 "羴": "𠠮𢺟𬳲",
 "来": "𠢫𠢷𪡺𫮜𬺒",
 "畢": "𠢽",
 "亾": "𠣣𡘅𤡡",
 "奴": "𠩨𠴂𠸎𡰀𢜲𢭵𢮫𣸏𤸻𥲘𦵚𧪅𪶨𫛇𫯅𫻂𫻈𬊨",
 "原": "𠫒𠫒𠫒𡀶𡅪𢢵𢥧𩕮𩖒𪒳𫚆",
 "匸": "𠭵𠭵𡕪𡕪𣪐𣪐𣵬𣵬𤃕𤃕𥲅𥲅𦒇𦒇𫇉𫿈",
 "弍": "𠱌",
 "及": "𠳖𠺻𣵵𥆹𥮁𥯼𧋏𧫑𨦮𩣞𩷘𫻅𫼾",
 "⺾": "𠴑𧏥𪤱𪪫嘆𬥮",
 "卝": "𠴟𡃥𡓑𡔊𢐻𢤈𢥲𣀦𤂸𤑴𤜃𥌲𥤁𥫉𧔫𧭺𨣳𨯢𨰩𨰯𪈋𪈶𫷄",
 "𤰔": "𠵤𢮨𨯋𫝊𫦂𫩄𫸜𬘄𬨽𬹢",
 "圣": "𠶔𢯑𬏴𬬆",
 "乞": "𠶹𤍋𥷳𦛰𪩟",
 "龵": "𠸦𡙍𡩒𡺗𣕻𣪦𥈧𦞖𨩢𪮑𪮒𪿁𪿃𬋭",
 "休": "𠹎𢊒𣒑",
 "坒": "𠹯",
 "亥": "𠹽𠺡𡀲𢮰𢱙𢲧𣘃𤸺𤼞𦃮𦟍𨐮𨢟𪣫𫈺𫋉𫐝𫫂",
 "亩": "𠺖",
 "奉": "𠺭𠾴𣻈𧑑𪫊𫕰𫠷",
 "巩": "𠺱𢟈𥕨𦃵𦵶𦶐𧏤𫻐𫼈",
 "朱": "𠺾𢟐𢲬𦅱𨪥𪬔𪿽𫂒𬅜𬗰",
 "忝": "𠻹",
 "才": "𠻻𡓀𡠳𡮣𡮤𡮥𡮩𡺵𢲾𣘥𣺠𤛞𦟼𨃁𩭘𪺺𫆝𫴼𫼫𬌱𬎵𬣫",
 "故": "𠼏",
 "亭": "𠼵𫣦",
 "匽": "𠼸𪅬",
 "单": "𠼺𢠤𪩔𫸿𬑫",
 "単": "𠽂",
 "𥝢": "𠾆",
 "𣢟": "𠾨",
 "查": "𠾵",
 "显": "𠾾",
 "臿": "𠿂𬋐",
 "某": "𠿃𥴘𫍍𬄪𬣌𬲞",
 "耑": "𠿩𢳐𣛹𣜅𤻨𥳙𥵇𥵣𦾸𧞖𨘼",
 "市": "𠿷𢷃𣿸𤂗𤐛𩦔𫆺𫔹𫽔𬉈𬊢",
 "咢": "𠿸",
 "任": "𠿹𬊠",
 "⺿": "𡀌𣒢𦣚𪇜𪝸𪮎𪮙𫆹𫐬𬜰𬠬𬩞𬭒𬹹",
 "柔": "𡀐𦺤𦽩",
 "本": "𡀖𥮋𧡊𩏭𪹸𫌠𬌕𬍂𬕙",
 "弄": "𡀜𩄺𬠥",
 "念": "𡀝𣻧𣿇𨢯",
 "弱": "𡀡𡣄𦡥𬉪",
 "皅": "𡀥",
 "洛": "𡀩𢣅𣋛𥋷𨮎𫄈",
 "害": "𡁁𡁍𢵷𥢫𦢽𪇜𫗛𫦢𫧚𫬭𬕲𬰒",
 "貫": "𡁃𤁂𧁐𪴎𫍒",
 "軎": "𡁒𤪢𥖳𦿓",
 "敕": "𡁛𡓟𡽫𧀒𩠶",
 "袞": "𡁺",
 "芻": "𡁿𢹤𥶈",
 "動": "𡂁𤑛𪮼𪴚𬋒𬟓",
 "㚇": "𡂅",
 "沝": "𡂊𡡺𣛁𣾜𨶺",
 "耎": "𡂩𢣓𣝚𦺾𩆣𩼭",
 "庶": "𡂪𣞢𧀹𧭧𬩦",
 "陏": "𡃏",
 "亯": "𡃥𢐻𢤈𢥲𣀦𤂸𤑴𤜀𤜃𥌲𥤁𥫉𦏧𧔫𧭺𨯢𨰩𨰯𪈶𫓜𫿠",
 "需": "𡃽𧃨𪋺",
 "達": "𡃿𤃧𧖆",
 "感": "𡄏𥩇",
 "雍": "𡄐𤃟𥗯𨇹𪗃",
 "齊": "𡄡𡤴𢋿𢥖𢹓𤒱𦺅𧆌𧕚𩵃𪗒𪗓𫊖𫬬𫬵",
 "從": "𡄭𨄦",
 "意": "𡄯𨯑𫻟𬟆𬟔",
 "寫": "𡄽",
 "客": "𡅅𡿃𢡦𢹷𣌔𥗳𪭄",
 "閒": "𡅌𡤃𢥣𧂡",
 "憂": "𡅒",
 "巤": "𡅘𢺎𧅕𫬶",
 "員": "𡅙𡈯𡈺𢆀𢥫𣿹𤏩𧂬𧒪𨆥𨭦𪢰𪬩𪬱𫑊𫭕𫱾",
 "禁": "𡅢",
 "義": "𡅷",
 "戢": "𡅺𩆭",
 "春": "𡆂𢺨𣡢𤅧𤜗𧕷𧕹𨙥𪝾",
 "聶": "𡆄𥸓𩇋",
 "毚": "𡆙𡿣",
 "鬥": "𡆞𤂗𤄎𩰕",
 "斲": "𡆞",
 "氾": "𡎊𣔶𧍙",
 "千": "𡎫𢰔𣣨𥀉𥢟𧪗𧷊𧼶𪙒𫧢𫧢𫰙𫵚𫵚𬡙𬡚𬫊",
 "匈": "𡏠",
 "夏": "𡐯",
 "涂": "𡒎",
 "匋": "𡒘𢵘𩍂𪷒𫱰𬞇𬞌𬩈",
 "鼎": "𡓀𤂄𤑺𧖅𨣯𪔈",
 "陰": "𡓅𨯛𪷵",
 "睿": "𡓝𧾩",
 "雝": "𡔏𢺠𧖇",
 "克": "𡕁𡕁𡞢𣋢𣋢",
 "刃": "𡝖𥚆𬇲𬧪",
 "㚒": "𡟨",
 "成": "𡡛𣛮𤺁𥊱𥢱𥼵𦔤𦼦𨞐𩦝𩯎𫮕𬃾𬣅",
 "宛": "𡡶𫾊𬎈",
 "匍": "𡢼𩍘𫾎",
 "連": "𡣻𢣣𤪼𬞮𬮖",
 "壹": "𡤵𤅮𪈞𫻚",
 "恣": "𡤵",
 "執": "𡫓𤃲𩆔𪈢𫉷𫸃𬋖",
 "瞢": "𡬆",
 "吊": "𡯶",
 "冈": "𡱸",
 "夅": "𡲣𡹷𤯲𧌰𧔧𧜨𪳖𫁫",
 "豖": "𡻑𣹞𣽗𧞮𪳓𬥥",
 "𢀡": "𡽃𢢠𩁌",
 "⻂": "𡽋𤀓𤳨𬀓",
 "烝": "𡽮𬵴",
 "薛": "𡿒𪓈",
 "粦": "𡿠𥷖𧁽𧃮𩽂𫸈",
 "歸": "𡿢",
 "式": "𢁊𤀏",
 "廉": "𢆁𤅄",
 "矣": "𢉡𢰇𫫃",
 "羔": "𢑌𤄾𦣍",
 "美": "𢑌𤄾𦣍",
 "𠫤": "𢔘𢛠",
 "孟": "𢕙",
 "復": "𢖓",
 "曳": "𢚕𫀍",
 "兪": "𢠚",
 "両": "𢡛𫴴",
 "肴": "𢡯𥳴𦺔𬥨",
 "童": "𢣛𢤖𢤤𢤦𢺚𥷈𬛞",
 "𢌿": "𢣦𤢳𩫬",
 "倝": "𢣴",
 "居": "𢤹",
 "惠": "𢤺𤫃𪷺𬔄𬞶𬟉𬟘",
 "竜": "𢥆𢹈𣰳𣰴𪿄𫅲𫴋𫿨𬕹𬕺𬕾𬖅𬖆𬖉",
 "蟲": "𢦃𤅱𧖂",
 "尒": "𢰀𧍠𨡸",
 "氵": "𢲨𤍃𥉪𦷫𩘫𬐮𬯽",
 "制": "𢳅𪷘",
 "廾": "𢳭𣇸",
 "礻": "𢵊",
 "采": "𢵛𣙓𤨽𥂑𦹮𧀊𬗹",
 "牪": "𢵜",
 "苗": "𢵝𤻹𫫯",
 "怱": "𢶰𣎨𤩿𥵅𫓑",
 "烕": "𢷄𤄌",
 "空": "𢷙𣝃𨭏𨭒",
 "替": "𢸝",
 "巽": "𢸷𣟙𤂿𥶷𦇗𧂍𨯭𬹹",
 "匪": "𢸿",
 "皆": "𢹆𣾂",
 "戠": "𢹊𧄕𧄹",
 "敬": "𢹘𩽡𫬺",
 "參": "𢹪𣟹𥤇𧂅",
 "隡": "𢹵𧃯𪎅",
 "淫": "𢺓",
 "翟": "𢺜𤓛𥷘𧃔𧆀𨰑𩆸",
 "縕": "𢺝",
 "哭": "𢻪𣀬𤼅𥀴𥷇𩆮𬑀",
 "仕": "𣁙𣖝",
 "𠂹": "𣋌𤾼𦾓𧮉𩎁𩏬𩦰𪊈𪎀𪙸𪙼",
 "𦎧": "𣌘𨰮𪈷",
 "汝": "𣒢",
 "刑": "𣕭",
 "斿": "𣛦𪆎",
 "削": "𣜎",
 "州": "𣜙",
 "宣": "𣜯𫫻𫱽𫻊𬁙",
 "絜": "𣝠",
 "席": "𣝸𫊘",
 "舂": "𣞝𩯲",
 "隋": "𣟁𥶴",
 "焱": "𣟕𤒇",
 "楽": "𣟿𫊚𬌖𬟥",
 "晶": "𣡭𣱃𪒾𫲞",
 "冝": "𣡭𣱃𫲞",
 "聽": "𣡹",
 "黽": "𣤶𫦣",
 "马": "𣳆𪿫𫽢𬈏𬊯𬡦𬦴",
 "甾": "𣺤𫊄𬩆",
 "侵": "𣽧",
 "胃": "𣽴𦢚𧀴𨟭𫻖𬉜𬬚𬮗",
 "畏": "𣽻𣾿𤺸𪨆",
 "豈": "𣾚𤩑𦻻𨬫𫦠𫲈",
 "臾": "𤀋𥋰𥛩𦺮𧂟𧭾𨘤",
 "𠩵": "𤁋𫌕𫾐",
 "智": "𤁰𤂥",
 "賁": "𤂫",
 "於": "𤂷",
 "𠦄": "𤃋𦹁噴幩憤濆𫧨𫯉𬓒𬡪𬦙𬩂",
 "歮": "𤃓𫊉",
 "鹵": "𤃯𬐻",
 "活": "𤄃",
 "聚": "𤄓",
 "彦": "𤄰𫻤",
 "皋": "𤅆",
 "舋": "𤅣",
 "鍂": "𤅺𨐃",
 "亅": "𤅻𤘓𤪥𤾱𦆭𦗰𪅢𪺖𫡓",
 "面": "𤎂𬄥𬬉",
 "斥": "𤏣",
 "遂": "𤑾𥶼𧁂𨽛𩆰",
 "孰": "𤒙𨷙",
 "農": "𤒚𧁓",
 "敻": "𤓇",
 "壳": "𤛓𤠼𦎼𧐜𪅏𪖃",
 "熊": "𤜑𥷾𧄾𧟍𨰟",
 "𣏂": "𤟆𥓑",
 "完": "𤠴𥕜𦶤𦸌𦺊𦼍𪼒",
 "物": "𤦏",
 "𤯔": "𤦶𪔢𫟾",
 "無": "𤮢𦢲𧁵𧓼",
 "肋": "𤯸",
 "尢": "𤷀",
 "𣏟": "𤹳𤹴",
 "旧": "𥆩𪡻𫮾𬞨𬞰𬞺𬟗𬟛",
 "柰": "𥌿𥷗𪴛",
 "嚴": "𥍛𫤖",
 "昌": "𥛼𨇡",
 "𡱝": "𥣔𫋢",
 "受": "𥧿",
 "敫": "𥨿𨇶",
 "亢": "𥮕𦶢𩷠𫙤𫩽",
 "司": "𥯱",
 "匡": "𥱜",
 "函": "𥲌𦶷",
 "舍": "𥳕𦺗𪅰",
 "建": "𥴤𦽇𧃑𨫡",
 "敃": "𥴲",
 "條": "𥴽𧀝",
 "師": "𥵍𫬧",
 "屏": "𥵪",
 "辜": "𥶜",
 "䊆": "𥶵",
 "爭": "𥶹𧂮𨷧𪸊𫣺𬎛𬘈",
 "將": "𥷃𬬙",
 "麗": "𥸗",
 "賛": "𥸝",
 "詹": "𥸣𧀻",
 "析": "𥼔",
 "𠑽": "𥽄",
 "卵": "𦃕",
 "丆": "𦅜𪊈𪎀𪙸𪙼𫎄𫜧𬈿𬞊",
 "矞": "𦇹𨙧𪈄",
 "萠": "𦗿𫬉",
 "昏": "𦘌𪰅𬀙",
 "仄": "𦝈",
 "夜": "𦟸",
 "卦": "𦟺𫫔",
 "伐": "𦠱",
 "准": "𦡤",
 "桼": "𦡩𧀬",
 "圂": "𦡵",
 "疑": "𦢾",
 "𦥑": "𦦎𦧀𧅫摷璅𥲀罺鄛𬋡𬛽𬠰",
 "夷": "𦳂𬯐",
 "𡿪": "𦴟",
 "甹": "𦶊𫱲",
 "𦣞": "𦶜𩠯𫉶䵖",
 "执": "𦶟",
 "会": "𦷭",
 "卣": "𦷿",
 "垂": "𦸙𬑩𬯝",
 "敄": "𦺒𧒚𨎸",
 "沮": "𦼬𧗎",
 "𢼸": "𦼻",
 "𤰸": "𦾡",
 "習": "𦾬",
 "推": "𦿕",
 "俎": "𦿘",
 "租": "𧀽",
 "叅": "𧁑",
 "羕": "𧁒",
 "含": "𧂃𪢑𫫚",
 "馮": "𧂋",
 "善": "𧃇𬠺",
 "沓": "𧃌",
 "蒙": "𧃶",
 "𢾰": "𧃸𩽚",
 "諸": "𧄔",
 "𠩺": "𧄚",
 "訇": "𧄛𨰌𩧛",
 "麃": "𧅃",
 "務": "𧅑𪴟𫝞𬉮",
 "親": "𧅜",
 "興": "𧅦",
 "籴": "𧆀",
 "韯": "𧆂",
 "益": "𧆇",
 "⺙": "𧆶𧇈𧇉𨯋𩺇𪍾𪓾",
 "𠇍": "𧏥𬎙",
 "贵": "𧒭𫺹𬉋𬞘𬤦",
 "歲": "𧕼𧖢",
 "矍": "𧟝",
 "㐌": "𧪁",
 "竝": "𧭘",
 "頻": "𧮝",
 "到": "𨃫𪝻",
 "雨": "𨄋𨫒𨱐𪮪𪳬𬉈𬠬",
 "浦": "𨆶𩟢𪇨",
 "亜": "𨉼𫫖",
 "展": "𨏲",
 "名": "𨪓𬕰",
 "啚": "𨮢𪛇𫻒",
 "容": "𨮥𪴣𪸆𫲇𬒦𬞬",
 "焚": "𨰨",
 "尺": "𨰪",
 "凷": "𨵠",
 "則": "𨶨𬈦",
 "豩": "𨷹𩰟",
 "庚": "𨽔",
 "屋": "𩅵𪢅",
 "盧": "𩧥",
 "賓": "𩰄",
 "齐": "𩴚𬓖",
 "兂": "𪂫𪂫憯憯鐕鐕𬸓𬸓",
 "后": "𪃫",
 "侯": "𪅺",
 "龹": "𪅻",
 "囧": "𪆌",
 "𣅽": "𪈚𪈫",
 "獄": "𪈡",
 "霍": "𪈯",
 "备": "𪍞",
 "黍": "𪐒𪐕",
 "丵": "𪓁",
 "𠄌": "𪖑",
 "⺃": "𪖑",
 "卤": "𪙥",
 "絲": "𪚀",
 "龜": "𪛖𪺋",
 "貞": "𪝽",
 "髟": "𪝾𬒨𬟂𬟦",
 "贡": "𪟲𫤽",
 "最": "𪢚",
 "耶": "𪢞",
 "U": "𪨒",
 "+": "𪨒",
 "齿": "𪩛",
 "〢": "𪬌𪷞𫽝𬄱𬈋𬗻",
 "冒": "𪬢",
 "竹": "𪬻𬬞",
 "𠘧": "𪮥𬜕",
 "墨": "𪱰𫑮",
 "发": "𪲮𫂈",
 "考": "𪲶𫷶",
 "甶": "𪶣𬝕",
 "昗": "𪷆",
 "沛": "𪷳",
 "度": "𪸁",
 "向": "𪹔",
 "⺣": "𪹬",
 "斌": "𪼱",
 "𪟽": "𪿹𬒜𬖼",
 "丐": "𫀵",
 "滕": "𫄘",
 "巵": "𫆱",
 "𢀖": "𫈎𫏕",
 "妄": "𫈘",
 "东": "𫈟",
 "胡": "𫉣𫊊",
 "烏": "𫉩",
 "哥": "𫉸",
 "⻎": "𫉽",
 "部": "𫉾",
 "集": "𫊋",
 "江": "𫊓",
 "鄭": "𫊛",
 "射": "𫌗",
 "𡈼": "𫐬",
 "延": "𫑎",
 "𠫓": "𫒻",
 "府": "𫓘",
 "朝": "𫗻",
 "免": "冤󠄁堍",
 "𡿧": "椔",
 "直": "磌鬒",
 "为": "𫢭𫩳",
 "龙": "𫢹",
 "肀": "𫢻𫪯",
 "頃": "𫤉𫤎𫤏𫤒𫤓𫤕",
 "𠧪": "𫧷",
 "区": "𫪘𬕦",
 "穵": "𫪶",
 "伴": "𫪿",
 "店": "𫫓",
 "𢌜": "𫫕",
 "朵": "𫬀",
 "散": "𫬒",
 "勞": "𫬓",
 "禽": "𫬜",
 "貳": "𫬤",
 "呙": "𫮪𬩎",
 "厘": "𫮸",
 "萑": "𫮾",
 "𠪚": "𫮿",
 "互": "𫰟",
 "微": "𫲛",
 "忄": "𫵀",
 "靑": "𫶠𫶠𫻛𫻛",
 "𠕻": "𫹊𬐐",
 "䩻": "𫻥",
 "⺴": "𫾇",
 "寿": "𫾏",
 "㣈": "𫿫𫿬",
 "𠂎": "𬂪",
 "圤": "𬃳",
 "奈": "𬄠",
 "阑": "𬅉𬉠𬧛",
 "新": "𬅋",
 "⺕": "𬈬",
 "𠘨": "𬊄𬩼",
 "丱": "𬋄",
 "𠔉": "𬐮",
 "末": "𬑫𬰃",
 "勾": "𬕋",
 "却": "𬛟",
 "狂": "𬞅𬞷",
 "昫": "𬞜",
 "参": "𬞣",
 "粉": "𬞦",
 "监": "𬞫",
 "鸟": "𬟁",
 "䝉": "𬟃",
 "𫤘": "𬟈",
 "賴": "𬟣",
 "珀": "𬠲𬬓",
 "𠔿": "𬡢",
 "间": "𬡱",
 "丄": "𬥤",
 "𠂊": "𬦍",
 "𣱱": "𬦍",
 "叀": "𬨼",
 "泰": "𬬞",
 "𠂈": "𬮽",
 "㣇": "𬯓",
 "幻": "𬯽",
 "飞": "𬲊𬲊",
 "宅": "𬵕",
 "幹": "𬵾"
}
},{}],"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose2.js":[function(require,module,exports){
module.exports={
 "凵": "倔哅啒嗤媸孼崛崫嵏嵕恟恼惾掘曓朔朡椶櫱欮洶淈滍煀猣离稯窟糉糱糶緵翪胸脑艐葼蝬蠥詾誳逆鍐镼騣鬉鬷鯼鶌㔎㕼㖾㞊㟅㡿㣭㨑㬥㬧㭾㱁㴊㺈㻕䁓䄐䈦䍟䎫䓛䘿䞷䠇䣴䥀䧝䩶䳳𠋷𠑔𠒋𠜾𠞀𠡰𠩋𠱘𠴶𠶯𠷅𠾌𡅜𡑇𡮍𡰇𡴘𡹕𡺴𢏷𢫤𢯪𢱝𢱞𢱟𢾫𢿆𣑤𣔳𣖠𣙸𣣃𣣷𣨢𣮈𣶑𣶮𣺷𤋿𤎬𤗙𤚍𤜏𤟎𤥘𤭶𤭽𤵻𤺅𥃑𥇣𥉍𥏘𥑪𥑺𥒚𥚋𥚘𥛁𥜱𥞝𥨒𥪊𥮝𥺷𥿬𦁐𦃒𦒂𦒟𦜇𦞲𦟨𦠍𦥭𦥾𦭪𦿎𧌑𧑎𧧗𧩯𧲳𧵮𧸆𧼞𧼳𨂫𨖀𨜿𨠮𨥸𨧱𨱊𨵠𨵡𨻍𨾀𩋎𩌠𩒕𩓦𩢛𩣹𩤓𩬸𩭪𩰷𩷇𩺉𩻙𪀝𪃊𪇷𪍾𪓾𪘳𪛐𪜏𪞸𪞻𪞼𪞽𪟄𪢃𪥕𪵂𫅦𫍮𫛵𫤧𫥥𫥩𫥪𫥮𫩷𫯷𫲕𫵀𫵢𫼭𬂘𬎫𬖲𬘼𬛏",
 "㐅": "哅嵏嵕恟恼惾摋攀攀朡椶榝洶猣礬礬离稯糉緵翪胸脑艐葼蔱蝬蠜蠜詾鍐鎩騣鬉鬷鯼㕼㟅㣭㨑䁓䈦䊛䍟䎫䓭䙪䙪䣴䫶䫶𠍫𠒋𠝨𠴶𠺽𠻑𡱸𡹕𢄌𢔘𢛠𢞒𢟌𢡯𢫤𢸅𢸅𣉜𣑤𣶑𣺷𣻑𤍁𤏤𤏨𤜏𤟆𤥘𤭶𤵻𥃑𥌞𥌞𥑪𥒚𥓑𥞝𥳴𥻦𥽢𥽢𦃏𦟨𦭪𦺔𦻎𧀭𧀭𧜁𧢜𧢜𧧗𧲳𧵮𨟄𨟄𨟅𨟅𨠮𨥸𩌠𩢛𩧅𩧅𩮫𩰷𩷇𪃊𪄅𪙥𪞸𪞻𪞼𪞽𪢃𪵂𪹤𫖺𫖺𫤧𫥥𫥩𫥪𫥮𫩷𫪘𫼭𬕦𬛏𬥨",
 "󠄀": "嗤媸孼朔櫱欮滍糱蠥逆㔎㖾㡿㴊㺈䥀䧝䩶𠋷𠩋𠱘𠾌𡑇𡴘𢯪𢱟𢾫𣔳𣣷𣶮𤎬𤗙𤚍𥉍𥑺𥚘𥿬𦒂𦒟𦞲𦠍𦥭𦥾𧩯𧼞𧼳𨂫𨖀𩒕𩬸𩺉𩻙𪀝𪇷𪜏𪟄𫅦𫯷𫲕𬂘𬎫𬖲",
 "丿": "乥乷亁仡仵併侂侘侮侻偗偤傍凭刉刏刱剏剙剙勄华厑吃吘吪咤咲哛唜唦啎喬喸喺嗙嗤嗾嘀囮夞奠姘姙姹娑娒娧媨媸嫎嫙嫡嬷孼尊屏屹崷崺嵜嵭巙巼帡帨庰廤弟彦復徬忔忤忥忾恁恲悔悦愎愻扢拖拦拰拼挓挘挱挲挴捝掷揂揓搃搎搒摘敏敚敵旿晦暆暶朔朕杚杵杹柂栏栚栟栠栣桦桫桬梅梕棁椱椸楢榜槂樀檹櫱櫾欮歒毓毮氕氖気氙氚氛氜氝氞氟氠氡氢氣氤氥氦氧氨氩氪氫氬氭氮氯氰氱氲氳汔汻汽沎沲洴浂浐海涊涚渆渉渕游渺渻湤湭滂滍滳滴漧漩潨炛炧烂烢烪烸焺煪煫熍熵牓犵狏猀猶猷猻玝珻璇瓶甋産畮疙痗痥痧瘯皏盬盵眹矻砤硑硰磅祱禉秹秺税稪箵箷篎篣簇籏籺粚糱紇絁絍絣綐綛緐緧緮緲縂縍縼纥缈缾耪肐胣胼脢脱腹膀膐艕艵芞花荏荓荵莌莎莏莓萨葹蒡蓀蔏蔐蔙蔟蕛蘨虁虼蛢蜕蝣蝤蝮螃螪蠤蠥袘袮袵裞裟複覫訖訛許詫誁認誨説謗謪謫讫许讹诧诲说谤谪豴貨賃賆货赁趥趷跰踇踯蹢躨躵軿輶輹迄迕迤迸送逆逤遂遊遒遜適邃郑郱酶釳鈋鉇鉼銋鋂鋈鋭鍑鍦鎊鏃鏇鏑铲锐镑镝镞関閯閲阅阣陁陞隊霉靔靴鞧頩餁餅馥駞駢駾騯骈骿髈髜髿魤鮩鮵鯊鯋鰌鰒鰟鲨鳆鳑鵀鵧鵿鷟麧黣齕龁㐹㒡㒾㓃㔎㔕㔙㖾㗂㗛㘥㙁㙂㙏㞰㟋㠃㡮㡿㢉㢮㤛㤞㤣㥞㥢㥬㧉㨘㨴㩿㪂㫓㬳㬼㭞㮐㮵㯀㰟㲚㲴㲵㲶㲷㳕㳝㴊㴚㴦㵀㶛㶵㷏㷕㸱㸺㸾㺈㻂㻢㼳㾪㿶䀲䁢䁤䂱䃍䃔䃚䃠䄏䄘䅊䅭䆛䇄䇮䈂䉥䊈䊞䋕䋣䋦䌓䌼䍙䎢䎮䏗䏰䐱䑐䑨䑫䑻䒍䒗䒲䔋䖳䗐䗠䘐䙗䚇䛘䝦䝯䞄䞘䟢䠓䠔䠙䢀䣉䣸䤋䤩䤬䥀䦍䦕䧗䧛䧝䧰䨦䩈䩐䩶䩷䪖䫄䬇䬈䬣䬽䮡䮰䯔䯟䰴䰿䱕䲂䲡䴵䵂𠀸𠄁𠄃𠄄𠄊𠄋𠄶𠅼𠇃𠈪𠈱𠉖𠉰𠋝𠋷𠍥𠐝𠒿𠔳𠕏𠕿𠖯𠖴𠗋𠗵𠚮𠛼𠜮𠞔𠞠𠞶𠠶𠢗𠢣𠣇𠤷𠧩𠨺𠩋𠯒𠰹𠱘𠱹𠲉𠲏𠲯𠳢𠳨𠴍𠴎𠴕𠴻𠵦𠶉𠷇𠸾𠹀𠹒𠹻𠺾𠻅𠼬𠼳𠾌𠾹𠿰𡀟𡆈𡆍𡉦𡊇𡋷𡍛𡎧𡐂𡐱𡑇𡒐𡗧𡗺𡜟𡝩𡞜𡞞𡞪𡟕𡟝𡢥𡤊𡧜𡨽𡩙𡮜𡯾𡱚𡱩𡱳𡲚𡴕𡴘𡶊𡶴𡸫𡺚𡻬𡾛𢀫𢂧𢂳𢄎𢄧𢄲𢆃𢆏𢆗𢆛𢆢𢆣𢇄𢇓𢉭𢉷𢍜𢏳𢐊𢑍𢑠𢓷𢕐𢕜𢕠𢖟𢖴𢙽𢚴𢛿𢜂𢜫𢝡𢞏𢞖𢟐𢠥𢡸𢡾𢦩𢨵𢨹𢪎𢫳𢬈𢭑𢭼𢯪𢰃𢰤𢰧𢱟𢲑𢲬𢳄𢳇𢳈𢵉𢵩𢵹𢶌𢶛𢷔𢼏𢼩𢼶𢾫𢾮𣁊𣂆𣂉𣄥𣄬𣅠𣇋𣉧𣎓𣏙𣒫𣒻𣓎𣓦𣔍𣔳𣔾𣕝𣖺𣘄𣜃𣜤𣠤𣢆𣣫𣣱𣣷𣦉𣨘𣨮𣨰𣪯𣫷𣫸𣫺𣫼𣫾𣬁𣮅𣮩𣯊𣯟𣯵𣱕𣱖𣱗𣱘𣱙𣱚𣱛𣱜𣱝𣱞𣱟𣱠𣱡𣱢𣱣𣱤𣱥𣱦𣱧𣱨𣱩𣱫𣱭𣱮𣱰𣴜𣴴𣴷𣴾𣵃𣵺𣵽𣶮𣶲𣷃𣸪𣹇𣹪𣺌𣻅𣻆𣻒𣻓𣼿𣾍𣾳𤀾𤃊𤄋𤄏𤄫𤆷𤇲𤋃𤋌𤎂𤎬𤏼𤑓𤒆𤕴𤖌𤗆𤗙𤙩𤚍𤚧𤚰𤝴𤞌𤞘𤟱𤟽𤠻𤣮𤤩𤦺𤦽𤧭𤨬𤪝𤭅𤭐𤰢𤱘𤳺𤴸𤵍𤵚𤵾𤶝𤸈𤸉𤸑𤹔𤹜𤹞𤹟𤽍𤽝𤾄𥁲𥁷𥂝𥄒𥄭𥅓𥆂𥆝𥆾𥇇𥉍𥉣𥊔𥊟𥋐𥍢𥍸𥐭𥑺𥒆𥔎𥕐𥘪𥙁𥙰𥚘𥛚𥜁𥜶𥝖𥝬𥞀𥞩𥠂𥠥𥡉𥡦𥢁𥣹𥤶𥦸𥧮𥩧𥩵𥪚𥪱𥭌𥭝𥯞𥰠𥱋𥱖𥵈𥵎𥺡𥻖𥻠𥻭𥾿𥿬𥿵𦀛𦀟𦂁𦂛𦂾𦃉𦅜𦅱𦆳𦆳𦇎𦋤𦌢𦍉𦐵𦒂𦒟𦓖𦔄𦖆𦖣𦗍𦗰𦚮𦝱𦞲𦠍𦣨𦥊𦥭𦥽𦥾𦦳𦧓𦨏𦩃𦩟𦩲𦬶𦭥𦯷𦰚𦰜𦳗𦳥𦳧𦳷𦴏𦵠𦵡𦷍𦷺𦸫𦹈𦻬𦽀𦾴𦿞𦿮𧂲𧄦𧅄𧆦𧆫𧉁𧉮𧋊𧋟𧍖𧎡𧏣𧐈𧐗𧐟𧐢𧔑𧖦𧖷𧖿𧙨𧚀𧛖𧜕𧜟𧜽𧠡𧠽𧢙𧣟𧦧𧨶𧩯𧩹𧪾𧰬𧳉𧳫𧶅𧷆𧺴𧻓𧼞𧼦𧼱𧼳𧿶𨀸𨁭𨂘𨂫𨄕𨈾𨉃𨊰𨍨𨍩𨏰𨓚𨓵𨕀𨕣𨖀𨖍𨗅𨗕𨗙𨗵𨙂𨜜𨜟𨜳𨜷𨝌𨝗𨝝𨠑𨠲𨡡𨡪𨡴𨢅𨢈𨢐𨣡𨦒𨧟𨧯𨩊𨪂𨪆𨪥𨫢𨫬𨰿𨱂𨲅𨲓𨳰𨳱𨴥𨵎𨵒𨵥𨵨𨶃𨶉𨷱𨹗𨹪𨺒𨺧𨺵𨼃𨾟𨾻𨿂𨿃𩀥𩂦𩃰𩄸𩅫𩅲𩇻𩈚𩈢𩉻𩊖𩊫𩊮𩊱𩋟𩑔𩑤𩑭𩒕𩓲𩔀𩔕𩔣𩕲𩘎𩘓𩘶𩙢𩙢𩛪𩛸𩛹𩜸𩝌𩠂𩠍𩠓𩡕𩢵𩣟𩣠𩣻𩣾𩥆𩨘𩫐𩫑𩬸𩮈𩰌𩱐𩱟𩲏𩲜𩳑𩳝𩵱𩶱𩷀𩷈𩷯𩷿𩸻𩹊𩺉𩺯𩻀𩻋𩻙𩽽𩾥𩾹𩿽𪀝𪀥𪀼𪁕𪁾𪃃𪃐𪃦𪃧𪃬𪄟𪄱𪄲𪅢𪆾𪇥𪇷𪉥𪊈𪋋𪌇𪌮𪍋𪍑𪍧𪎀𪎤𪐁𪐏𪐒𪐜𪑫𪓰𪓵𪔘𪕒𪖫𪖬𪗟𪘀𪘗𪙸𪙼𪚏𪜏𪜐𪝁𪝹𪞊𪞸𪞹𪟄𪟒𪟜𪟳𪟴𪟸𪠆𪠫𪠱𪡜𪡧𪢁𪢊𪢼𪣡𪥘𪧞𪨣𪨦𪪃𪪄𪪇𪫫𪬔𪬣𪬥𪬶𪭆𪭟𪮓𪮞𪯒𪯔𪯨𪰃𪱐𪲙𪲠𪲿𪳸𪴽𪵔𪵜𪵣𪵤𪵥𪵥𪵦𪵧𪶇𪶋𪶵𪶼𪷋𪸅𪸏𪸕𪹚𪹧𪺖𪻻𪼕𪾮𪾱𪿽𫀩𫀷𫁐𫂂𫂒𫂪𫄟𫄩𫄭𫄰𫅁𫅦𫅳𫆦𫆮𫇹𫊨𫊴𫍂𫍟𫎄𫎐𫏊𫏢𫏫𫏿𫐌𫐬𫐼𫐽𫒍𫒐𫒵𫔛𫔦𫕀𫕒𫕤𫘞𫘮𫙱𫚛𫛄𫛎𫛨𫛹𫜈𫜟𫜡𫜧𫝸𫞃侻僧㔕帨憎𣫺𤲒䍙駾𫠧𫡞𫢛𫢰𫢳𫤅𫤛𫦓𫧊𫧬𫧷𫩪𫫀𫬣𫬩𫮍𫯋𫯎𫯷𫰁𫱑𫱜𫱨𫲕𫲰𫳓𫴱𫵆𫵟𫵾𫶭𫷔𫷘𫷴𫹛𫹠𫻉𫼪𫽅𫿛𫿼𬀑𬀲𬁩𬂘𬂾𬃒𬃪𬄥𬅗𬅜𬆋𬆋𬆶𬇏𬇐𬇑𬇒𬇓𬇭𬈿𬉯𬌿𬍕𬎄𬎫𬎼𬏨𬏩𬐰𬑩𬑲𬒇𬒐𬒩𬓧𬔚𬕍𬕓𬖒𬖲𬗍𬗛𬗰𬘶𬙳𬚜𬛊𬜌𬜎𬜭𬝀𬝀𬞊𬞎𬟈𬟹𬠋𬠍𬠱𬡻𬣃𬣯𬣲𬥇𬥵𬦍𬧵𬧽𬧿𬨎𬩕𬪊𬫲𬫽𬬉𬭈𬮐𬮦𬮪𬮫𬰐𬰧𬳔𬳣𬴅𬴙𬶉𬶦𬷙𬸊𬸑𬸙𬸦𬺅",
 "日": "乹乾亱倝倬偃偒储傽儃儩儲刯募勯咺啅啺喳嗼嘟墓奲姮婥婸嫜嫫嬗宣寞履峘崵嵖嶂嶚嶛巐幕幙幛幹廜彰恒悼惸愓愝愺慔慞憻戟掉揚揠揸摸摹撦擅擆擝敭斡旜晅晫暘暢暮暯暲曙朝桓棹椻楂楊榦槆槕樟模橁橗橥檀櫡櫧櫫櫭氁氈氊氱洹淖渣湯漠漳潉潳潴澓澶濐濖瀃瀦灏灝烜焯煬熴燳狟猹獏獐琸瑒璋璮畼瘍瘴瘼癁皶皽瞕瞙碭碴禓窧竨竷箰篞簎籍糃糢糧糬絙綽縸繛繵绰罩翰腸膜膻荁蓦蔁蔊蕏蕧蕰蕴薚薯藉藷藸蝘蝪螒蟆蟇蟑蟺蠩褗襢諹謨謩譇譠谟貆貘賯贑贛赣趠踔踼蹅躇躢躽輰逴逿遧邅郾鄚鄣鋽鍚鏌鏱鐯镆陽隁障雗韓韩顫颤颺餳餷饃饘馫馫騲騿驀驙鬕鰋鰑鱆鱣鱪鱰鳣鵫鶠鶾鷵鸇鹯麞鼴齄㒂㒐㔊㜁㝭㠅㢓㣶㦋㦸㦹㨚㪕㰽㱳㲦㴯㵔㵭㵹㶆㶕㷬㷹㹿㼒㾴䁑䁴䂽䃪䃴䄠䆄䈇䉡䊰䎐䎰䑗䑲䓥䓬䕊䚙䜦䞁䞶䠧䡀䣝䣢䤗䤷䥄䦃䨱䬗䭜䮓䮧䮬䱎䵘䵮𠃵𠆞𠈗𠊚𠊛𠋩𠍽𠏲𠖑𠖚𠘐𠜬𠝗𠠊𠡚𠢃𠢇𠢓𠣙𠣳𠤆𠤌𠦲𠦷𠧄𠧇𠪡𠭲𠮒𠵆𠶒𠸯𠹊𠹲𠺦𠻈𠻚𠼀𠽞𠾏𠾾𠿞𡀦𡂵𡃊𡃢𡃥𡃯𡃶𡄢𡅉𡅹𡆎𡈠𡍎𡏉𡑆𡓈𡓠𡓲𡖶𡘍𡚄𡟱𡠜𡣈𡤊𡩤𡪦𡪻𡮛𡯴𡱌𡳢𡳣𡳤𡷆𡹶𡼞𡽞𢂡𢄳𢅆𢅒𢅔𢋂𢋃𢐹𢐻𢒛𢒨𢔄𢔐𢕊𢕔𢛂𢟗𢟽𢠎𢤈𢥃𢥔𢥲𢥺𢥿𢧢𢨃𢬎𢭱𢱦𢲰𢴈𢵀𢵋𢵕𢵻𢷆𢷷𢾳𣀦𣁖𣂣𣃑𣈗𣈜𣈟𣈿𣉎𣉙𣉺𣊼𣋊𣌁𣌂𣌆𣎍𣎠𣙈𣙍𣚫𣛀𣛭𣛵𣜾𣝻𣞍𣠖𣠰𣠶𣡭𣡭𣡭𣦖𣩎𣪙𣫜𣫡𣯄𣯗𣯳𣱃𣱃𣱃𣵤𣶃𣶫𣹐𣻾𣿉𣿴𤀄𤀞𤁏𤁰𤂖𤂥𤂸𤃜𤃬𤊢𤋁𤌓𤎘𤎲𤐢𤑴𤒠𤒻𤔰𤙴𤚷𤜀𤜃𤢏𤦵𤨼𤨾𤮜𤲤𤷘𤺈𤺺𤻃𤻔𤾉𥀐𥅨𥆩𥇍𥇹𥈔𥉏𥉛𥋹𥌓𥌖𥌲𥍻𥎟𥏥𥏫𥏬𥔌𥕉𥕒𥕓𥕞𥖛𥗁𥗎𥛼𥠜𥡸𥢔𥢳𥤁𥥣𥧶𥨍𥨕𥪮𥫉𥫊𥫑𥫒𥫓𥫔𥫕𥫖𥯕𥯗𥰴𥰿𥱹𥳇𥳉𥳯𥳼𥴄𥵕𥵙𥵟𥵩𥶩𥶭𥹚𥻗𥼷𦄇𦄩𦄬𦅁𦅕𦅷𦇃𦉆𦋇𦋐𦋚𦏄𦏧𦒜𦖧𦘌𦚸𦜰𦝇𦟦𦠏𦠰𦡄𦡉𦩻𦪼𦳕𦳘𦳝𦴥𦶄𦶳𦷖𦷤𦸶𦹪𦹫𦹯𦹲𦹵𦹸𦺏𦺥𦺩𦻐𦼥𦾠𦿉𧀄𧀩𧁀𧂯𧃊𧃌𧄣𧄳𧅌𧅭𧆙𧈏𧊳𧌸𧍋𧒇𧒳𧓱𧔫𧗛𧟻𧠅𧨳𧫱𧬅𧬥𧭺𧮑𧱂𧳝𧶽𧷸𧷿𧸓𧹄𧹉𧹳𧹼𧺂𧺃𧻚𧽣𧾍𨅓𨅮𨆁𨆮𨇉𨇛𨇜𨇡𨉔𨌬𨕡𨗊𨗪𨘖𨙏𨝨𨝼𨞒𨞚𨟞𨢈𨢢𨣍𨣚𨩨𨫖𨭖𨮿𨯀𨯢𨰏𨰝𨰩𨰯𨲞𨲵𨲷𨵀𨵶𨶤𨶶𨺑𨼑𨽉𨿧𨿨𩀀𩁉𩄻𩅈𩅻𩉊𩊹𩋬𩌧𩌬𩍕𩍻𩎨𩏑𩐍𩐖𩐻𩒢𩕆𩘀𩙩𩙶𩙼𩞯𩤟𩧗𩫡𩫧𩭟𩮎𩮜𩯤𩰵𩷹𩹼𩺏𩻁𩻻𩼁𩽱𪂂𪂱𪃌𪃵𪅂𪅐𪈑𪈚𪈫𪈶𪊥𪋛𪋟𪋥𪋰𪍈𪍤𪏟𪒾𪒾𪒾𪓼𪕫𪖭𪙁𪙵𪝡𪝯𪞬𪟓𪟵𪟷𪟺𪟿𪡻𪢆𪢚𪦈𪦜𪦴𪪂𪬨𪭂𪮫𪰅𪱂𪱅𪳼𪴄𪴶𪷂𪷆𪷑𪹕𪹶𪹹𪺦𪻊𪻘𪻭𪼘𪾞𫀑𫁯𫂎𫄁𫄠𫄲𫅝𫆶𫆻𫉄𫊔𫊘𫋬𫌅𫌙𫌰𫎬𫎹𫑲𫓉𫓍𫓜𫔑𫔩𫕔𫗴𫘰𫚢𫛱𫜂𫞛𫠀𫠒𫤴𫥐𫥬𫧑𫧩𫧬𫧭𫬕𫬞𫭍𫮞𫮾𫯭𫰂𫲞𫲞𫲞𫳞𫴮𫵑𫶞𫶱𫶳𫸍𫹣𫺥𫺰𫻙𫾄𫿠𫿿𬀙𬀷𬁑𬃸𬄞𬄫𬄮𬉥𬉨𬊩𬊳𬋘𬋺𬌤𬌺𬍆𬍍𬍎𬎇𬎎𬎗𬏾𬑤𬓾𬔧𬗥𬙅𬙉𬛒𬝡𬞁𬞜𬞨𬞰𬞺𬞿𬟅𬟋𬟎𬟖𬟗𬟛𬟜𬟞𬠜𬠩𬠫𬡰𬡱𬤜𬤟𬥺𬦃𬦄𬦼𬨤𬩅𬪌𬪸𬬏𬭠𬭿𬲅𬴉𬴠𬴼𬵥𬸘𬹍",
 "十": "乹乾個倝倨倬倴做偾傽僖僨兙兛兝兞兡兢兢兣凅剋剧勀勊啅啹喖喯喷嗥嘭嘲嘻噴噽噿嚭囍囍夁娔婟婥婮媩嫜嫴嬉尅崌崓崮嶂巅巔幛幩幹庪廚廟彰悼愤愺慞憉憘憙憤戟据捹掉撠擀攧敼斡晫暤暲暿朝棝棹椐楛楜榦槔樟樹橨橭橲橶檊歕歖殑氪浒涸涺淖渀湖滜滸漧漳潮澍澎澣濆濢濣瀚焯煳熹熺燌猢獆獐獖琚琸瑚璋璻甏痼瘔瘴癫癲皞瞕瞦瞽瞽礂祻禧稒窧竨竷箇箶簳糊糦綽繛繥绰罩翰翱翸腒膨膵膹臌臌臎艍莾菇葫蔁蕡薣薣蜛蝴螒蟑蟚蟛蟢蟦蠈衚裾謿譆豮豶贑贛赣趠踔踞轒逩逴遧鄣醐鋴鋸鋽錛錮鍸鏱鐼锛锢锯障隫雗韓韩餬餴饎饙馩騲騿鬍鯝鰗鱆鱚鱝鱡鲴鲼鵫鶋鶘鶦鶾鷎鹕麞黂鼕鼕鼖鼖鼗鼗鼘鼘鼙鼙鼚鼚鼛鼛鼜鼜鼝鼝鼞鼞鼟鼟㑬㕑㗅㝆㟚㟸㢓㣨㦸㧽㨴㪕㯜㱵㱶㲦㳳㴌㵏㵙㷹㹿㾰㿁㿎䂽䅕䈇䉐䋧䍛䎐䐻䑲䒈䓢䓥䓩䓬䔌䔓䔯䕒䕜䛯䜰䝸䝻䠒䣗䤗䥢䥢䩴䩿䫙䫧䭀䭅䭌䮓䮧䱟䴅䵕䵱䵽䵽䵾䵾䵿䵿䶀䶀䶁䶁𠃵𠌻𠎎𠎫𠏼𠑘𠒐𠒘𠒙𠒚𠒠𠒭𠒲𠓈𠓎𠓘𠓼𠔢𠔴𠗌𠢇𠣳𠦲𠦷𠧄𠧇𠮒𠳭𠴜𠴱𠵎𠹊𠺏𠼀𠼯𠼳𠽑𠽤𠽿𠾢𠿤𠿤𠿨𡀆𡀬𡃨𡄂𡅊𡅤𡅥𡅸𡆐𡆒𡇤𡈅𡈠𡍁𡍄𡍋𡍎𡎁𡐶𡒆𡚄𡞯𡟁𡟷𡡲𡣗𡣝𡨢𡬅𡯴𡱪𡲅𡳥𡹉𡹍𡹹𡻧𡼎𡼝𡼼𡽂𡽂𡽆𡽌𡽌𢀭𢆨𢉢𢉽𢊱𢒛𢒨𢔄𢕔𢚛𢛂𢛅𢜃𢜘𢠇𢠥𢡇𢢅𢢒𢢶𢣃𢣵𢥔𢥺𢥿𢧢𢭪𢯐𢰮𢰴𢱗𢳭𢴛𢴢𢴿𢵓𢵕𢺗𢺗𢾳𢿠𣁖𣂣𣇠𣇸𣉙𣊿𣋂𣎍𣎏𣎠𣎢𣒖𣙈𣛔𣛨𣛸𣝦𣞴𣤅𣦖𣦩𣩸𣪀𣪙𣫜𣫡𣮡𣯻𣶃𣸣𣼨𣽑𣾘𣿈𣿐𤀺𤃋𤃋𤃋𤃬𤄱𤉸𤋹𤋼𤌹𤏴𤐵𤖘𤗸𤙥𤙴𤚷𤛽𤡈𤡭𤢀𤢫𤥣𤨼𤩠𤩳𤪘𤭱𤲤𤷘𤺃𤺬𤻒𤾟𥀐𥀢𥀷𥂰𥇍𥉏𥌒𥎟𥏥𥔓𥕞𥕱𥕽𥖀𥖮𥚑𥚙𥛱𥛻𥟾𥡅𥢊𥢍𥢔𥢗𥪮𥫊𥫑𥫒𥫓𥫔𥫕𥫖𥯶𥰦𥳡𥴄𥵙𥶭𥻷𦁿𦅈𦅕𦋇𦋐𦋚𦗭𦗺𦗺𦜭𦜰𦠰𦡛𦣶𦩻𦪟𦱅𦳕𦷖𦸶𦹁𦹁𦹁𦹫𦹯𦹵𦹸𦺏𦺓𦺩𦻐𦻝𦼮𦽒𦾠𦾮𧁀𧃗𧃙𧃵𧄣𧄳𧄺𧅭𧌔𧌸𧍏𧍵𧎔𧒿𧔋𧗛𧛂𧛞𧛫𧜆𧟻𧨳𧫱𧬕𧳝𧴍𧶭𧶮𧷐𧹄𧹉𧹕𧹳𧽣𧾂𨁼𨅅𨅇𨅒𨅘𨅹𨆆𨆊𨆊𨆎𨈀𨈃𨉔𨌬𨎀𨎧𨐞𨐡𨑀𨑀𨕡𨗛𨙏𨛮𨝌𨝝𨡱𨡷𨢈𨫬𨬕𨬟𨭌𨭎𨭸𨭸𨮢𨯨𨯪𨰎𨶤𨶷𨶽𨺑𨼃𨼩𨿧𨿨𩀉𩀴𩅈𩋜𩌬𩏑𩓡𩕆𩘀𩙩𩙶𩟲𩠇𩣺𩤅𩦇𩦗𩦥𩧗𩧼𩧽𩭟𩯋𩰛𩰛𩷰𩷹𩹜𩹬𩹼𩻬𩻹𩼛𩾄𪂂𪂅𪂯𪂱𪅂𪆘𪇀𪇀𪇞𪋛𪋟𪍈𪍒𪎰𪐉𪑖𪒰𪓇𪔋𪔋𪔌𪔌𪔍𪔍𪔎𪔎𪔏𪔐𪔐𪔑𪔑𪔒𪔒𪔓𪔓𪔔𪔔𪔕𪔕𪔖𪔖𪔗𪔗𪔘𪔘𪔙𪔙𪔚𪔚𪔛𪔛𪔜𪔜𪔝𪔝𪔞𪔞𪔟𪔟𪔠𪔠𪔡𪔡𪔢𪔢𪔣𪔣𪔤𪔤𪔥𪔥𪔦𪔦𪔧𪔧𪔨𪔨𪔩𪔩𪔪𪔪𪔫𪔫𪔭𪔭𪔭𪔮𪔮𪔯𪔯𪔰𪔰𪔱𪔱𪔲𪔲𪔳𪔳𪔴𪔴𪔵𪔵𪔵𪔶𪔶𪔷𪔷𪕮𪕱𪖅𪚉𪛇𪝍𪝬𪞬𪟵𪟷𪟺𪟿𪢢𪢣𪣕𪤾𪦭𪦵𪦵𪧽𪨃𪨵𪩸𪪂𪭂𪮓𪮣𪮬𪯞𪰫𪱥𪹫𪺀𪿩𪿰𫀑𫀲𫁦𫁯𫄆𫄵𫅗𫆣𫆶𫉡𫊐𫊘𫋚𫋬𫍻𫎬𫎵𫐦𫑯𫑱𫓄𫓖𫓚𫔁𫔐𫔐𫗌𫗫𫙱𫚩𫛱𫛷𫜂𫠒噴噴噴幩幩幩憤憤憤濆濆濆鼖鼖𫡯𫤴𫥙𫥬𫦃𫦢𫧨𫧨𫧨𫧨𫧩𫧭𫧱𫬟𫬩𫬮𫬸𫮆𫯉𫯉𫯉𫯉𫯩𫱬𫱺𫱺𫳠𫳫𫵑𫵦𫶱𫶶𫷱𫸍𫻒𫻙𫼅𫼎𫽂𫾒𫿽𬀌𬃱𬃸𬄮𬅂𬅫𬆜𬇾𬉌𬉥𬉦𬉧𬊳𬎗𬏷𬓒𬓒𬓒𬓒𬓱𬔧𬕛𬖢𬝠𬞁𬞚𬟕𬠠𬡪𬡪𬡪𬡪𬡳𬥪𬦙𬦙𬦙𬦙𬧚𬨀𬩂𬩂𬩂𬩂𬫶𬭳𬭵𬯾𬰦𬱆𬲾𬳟𬶞𬶮𬸢",
 "火": "僽檆檆歘歘燊燊矁飈飈飊飊飚飚㓹㓹㗵㗵㰊㰊㲭㲭㵞䆱䆱䈐䕭䕭䢯䢯䮼䮼𠋴𠋴𠟡𠟡𠢸𠢸𠻪𠻪𠿈𡃘𡃘𢅮𢅮𢉸𢊽𢊽𢴗𢴗𢴵𢴵𢶲𢷄𢸧𢸧𢸱𢸱𣄡𣄡𣊞𣊞𣜷𣟕𣰍𣰍𤄌𤍢𤍢𤒇𤓔𤓔𤓔𤓔𤸹𤸹𥊗𥊗𥰨𥰨𥲄𥲄𥵲𥵲𥶖𥶖𦃖𦃖𦆢𦆢𦋺𦋺𦌗𦌗𦌧𦌧𦌪𦌪𦵹𦵹𦸁𦸁𦼐𦼐𦼓𦼓𦽉𦽉𦿦𦿦𧄣𧄣𧅩𧅩𧐽𧐽𧷼𧷼𨕪𨕪𨗄𨗄𨞇𨞇𨤵𨤵𨫿𨰨𩉀𩉀𩉅𩉅𩧔𩧔𩼗𪋲𪋲𪝧𪝧𪷅𪷅𪹽𪹽𫮡𫮡",
 "一": "亁亱仡仵伺併侀侉侗侮俒俣偒偔偪儃儇冑冑冨减刉刏刯刳剏剙副劶勄勯匏匐卾吃吘呞咲咺哃哘唍啎啺喊喧喳喴嗾噮圜型垕姘姛姤姮姱娒娱婸媗媙嫙嫮嬗嬛孠宣宿富寰屏屹峒峘峝崴崵崺崿嵅嵖嶀帡幅幌幪庰彋復忔忤忥忾恒恗恫恲悔悮惩愃愊愎愓愕感愰愾憻懁懞戙戣扢拖拼挎挏挴捖掷揅揆揊揎揓揚揸揻搄搣摴擅擐敏敭旜旿晅晇晍晥晦晸暄暅暆暌暘暢暣暶曚朕朦杚杵柂柌栀栚栟桁桍桐桓梅梔梡椱椷椸楂楅楊楑楦楲榥樗檀檈檬檹櫭毓氈氊氋氕氖気氙氚氛氜氝氞氟氠氡氢氣氤氥氦氧氨氩氪氫氬氭氮氯氰氱氱氲氳汔汻汽沲泀洉洐洖洞洴洹洿浂浣海淏渆渕減渣渲游湀湂湢湤湯溮滅滉滊漧漩澴澶濛炧烆烔烜烪烷烸煊煏煘煬熀熂爂爨犵狏狟狪猤猹獅獧獴玝珩珻瑄瑊瑒瑡璇璮環璺瓙瓠瓶畮畼疈疈疙痌痗瘍瘯癏皏皖皩皶皽盬盵眮眹睆睻睽矇矻砤硎硐硑碭碱碴碹礞祠祦福禓秱稪稫笥筒筕筦筽箮箴箷篜篩簇籏籺粚粡糃糧糫紇絁絎絙絝絣絧綄綔緐緘緮縅縆縇縨縼繯繵纥绔绗缄缳缾缿翧翾肐胣胯胴胻胼脘脢脵腭腷腸腹膐膻舋舿艨艵芞茣茩茼荁荂荆荇荊荓莓莞萱萼葍葝葳葴葵葹蒒蒸蔙蔟蔲蔻蕿薚藧蘐虞虼蛢蜈蝖蝛蝠蝣蝪蝮螄蟺蠉蠓衋衋衍衎衏衐衑衒術衔衕衕衖街衘衙衚衛衜衝衞衟衠衢袘袮袴裄複褔襢覗覨觱訖許詞詬詷誁誇誤誨諠諤諨諴諹謣譞譠讏讫许词诟误诲谔貆賆趷跨跰踇踯踼踾蹅躛軿輐輰輱輹輻轘辐迄迕迤迵迸送逅逼逿遊遌還邅郀郈郑郱鄂鄈鄠酮酶醎釁釳鉇鉰鉶鉼銅銗銙銜鋂鋎鋘鍑鍔鍚鍢鍦鍨鍹鍼鎎鎠鎤鏃鏇鐦鐶鑋铏铜锷镞镮関闋闤阕阛阣陁陓院陽隇霉霼靀靔靝頩顎顑顫颚颤颺飼餅餇餳餷餼饘饛馥駞駢駧騤驙骈骙骺骻骿鬟鮜鮦鮩鮬鯇鰄鰏鰐鰑鰒鰔鰚鰤鱞鱣鲖鲘鲩鲾鳄鳆鳣鴮鴴鵍鵧鶚鶝鶳鷟鸇鸏鸻鹗鹮鹯鹲鹹麌麙麧黣黬齄齕齶龁㐹㑶㒾㓊㓕㓵㓻㔊㔕㔙㖃㖔㖯㖰㗁㗏㙁㙎㙏㙽㙽㚸㛾㜁㞰㟃㟧㟵㠓㡁㡮㢥㢮㣚㣜㣶㤚㤣㤧㦹㧉㧨㧷㨔㨪㨴㩑㩚㩿㪂㪪㫓㬳㬼㭢㮙㮵㯀㯄㰟㰭㰹㲴㲵㲶㲷㵀㶛㶺㷏㸑㸗㸱㸸㹕㺂㻂㻈㻍㻢㻬㼒㽬㽬㾴䀪䀲䁍䁑䁜䁢䁴䁵䃚䃠䃪䄠䆄䆚䆨䇄䈂䈏䈣䉡䊈䊙䋣䋦䋹䌄䌉䌓䌿䍙䎢䏗䏤䑃䑐䑗䑨䑫䑻䒗䓑䓕䓻䕊䕎䖗䗐䗗䗠䘕䘖䘗䘘䘙䙆䙋䙣䙩䚘䚙䚪䛐䝯䞄䞒䞘䞧䞶䟢䟰䠏䠸䡀䡓䢀䣳䤆䤓䤯䦍䦕䧗䩈䩐䪖䬗䬣䮠䮡䯒䯘䰒䰢䰴䰿䱎䱕䱴䲂䳦䳫䴉䴋䴌䴵䴷䵆䵗䵘䵮䶠䶢𠀸𠀹𠁝𠄃𠄄𠄊𠄋𠆞𠆠𠆡𠈗𠈪𠉖𠊚𠊛𠊭𠊳𠊾𠊿𠋘𠋧𠐁𠑥𠒣𠒼𠔺𠖄𠖈𠖑𠖚𠖝𠖞𠖤𠖨𠖨𠖯𠖴𠘐𠚮𠛼𠜍𠜬𠜮𠝊𠝗𠝳𠠊𠠦𠠶𠡚𠢃𠣙𠣻𠤁𠤷𠥏𠧩𠨈𠨩𠨺𠭈𠭲𠰹𠲯𠳨𠴉𠴻𠵆𠵦𠵲𠵳𠶃𠶒𠶺𠷇𠷐𠸢𠸳𠹻𠺪𠻁𠻢𠻸𠼳𠾑𠿓𠿞𠿰𡁏𡃢𡃯𡅹𡆈𡆍𡆎𡈆𡈏𡉦𡊇𡌎𡌑𡍷𡎝𡎧𡎩𡎷𡏈𡐱𡑆𡑡𡒯𡓝𡓟𡕅𡖮𡗧𡗺𡘍𡚓𡜂𡜇𡜝𡜮𡝻𡞣𡞪𡞳𡞷𡟕𡟪𡠋𡢐𡢭𡢳𡣑𡤁𡦎𡧻𡩊𡪏𡫅𡫴𡫹𡬺𡭐𡭑𡭒𡭸𡮹𡯽𡱌𡴕𡶊𡶭𡷆𡷗𡸫𡹾𡺟𡻬𡼰𡾛𢂓𢂡𢂳𢃊𢃯𢄧𢄲𢅒𢆏𢆗𢆛𢆢𢆣𢆫𢇓𢈉𢋃𢌪𢍯𢏕𢏳𢐤𢐤𢐹𢑅𢑍𢑍𢑎𢑠𢑣𢒎𢓢𢓷𢔖𢔬𢔮𢕁𢕅𢕋𢕋𢕐𢕜𢕠𢕳𢕵𢕼𢖂𢖅𢖋𢖍𢖡𢖴𢘜𢙁𢙡𢙽𢚺𢜂𢜩𢜽𢝡𢞋𢠥𢥰𢦩𢨟𢨵𢨹𢩚𢩠𢫱𢫳𢬈𢬎𢬯𢭫𢭱𢮚𢯕𢰧𢱉𢱫𢲐𢲚𢳄𢳇𢳈𢴈𢴝𢵱𢵹𢷆𢷔𢷰𢹞𢼏𢼩𢼶𢽉𢾇𢾘𢾧𢿀𣀚𣀽𣁀𣁊𣂐𣂐𣄙𣅠𣆯𣈗𣈜𣈟𣉉𣉎𣉖𣉺𣊼𣋊𣋌𣎓𣏙𣑸𣒫𣒻𣔍𣔥𣔽𣕲𣖍𣖺𣗵𣘇𣙤𣛀𣛣𣜕𣝻𣟉𣟴𣠤𣠪𣡈𣡥𣡬𣢆𣢨𣤭𣦌𣦐𣩺𣫷𣫸𣫺𣫼𣫾𣬁𣬑𣯘𣰥𣱇𣱕𣱖𣱗𣱘𣱙𣱚𣱛𣱜𣱝𣱞𣱟𣱠𣱡𣱢𣱣𣱤𣱥𣱦𣱧𣱨𣱩𣱫𣱬𣱭𣱮𣱮𣱰𣴴𣴾𣵗𣵞𣵤𣵺𣶊𣷃𣸦𣸪𣸵𣹪𣺍𣻒𣻓𣻽𣼿𣽦𣽻𣾍𣾺𣾿𣿴𤀣𤀵𤂕𤃆𤃺𤄫𤅕𤅚𤅴𤊢𤊸𤋁𤋲𤌓𤌗𤍘𤎂𤎘𤎲𤏉𤏾𤑓𤓕𤓛𤓜𤔜𤔰𤔺𤔽𤔾𤕴𤖌𤖾𤗆𤗚𤘁𤙓𤙩𤚗𤜁𤝴𤞵𤟱𤟷𤟽𤟿𤠃𤠊𤡲𤢏𤣙𤣮𤣽𤣽𤤩𤦶𤦽𤨆𤪑𤪝𤫓𤫓𤫸𤬉𤭁𤭅𤭆𤭐𤭺𤮜𤮠𤯻𤯾𤰢𤱘𤳺𤴃𤴸𤵍𤵚𤶕𤶮𤶯𤸑𤸧𤸲𤹌𤺸𤺺𤻆𤻓𤽍𤾉𤾩𤾩𤾬𤾼𥁡𥃘𥄭𥄶𥅓𥅚𥅠𥅨𥇹𥈭𥋹𥌖𥍢𥍩𥍸𥎃𥏫𥏬𥐭𥑹𥒆𥒖𥒱𥔁𥔃𥔲𥖆𥗑𥘪𥙁𥙐𥙰𥜁𥝖𥝬𥞀𥞧𥞩𥠆𥠜𥠥𥠫𥣇𥣛𥤶𥥣𥦸𥧔𥩵𥪚𥪛𥪱𥯕𥯙𥯞𥯫𥯳𥰠𥱄𥳐𥵈𥵿𥶍𥶽𥹚𥹳𥺡𥻅𥻇𥻗𥼷𥾿𥿆𥿵𦂛𦄅𦄙𦅜𦆟𦇊𦉆𦉏𦉚𦉝𦉠𦊛𦋠𦋤𦋳𦌺𦎛𦏄𦐵𦑘𦑞𦑭𦒜𦒠𦒽𦓝𦔆𦚸𦝇𦝢𦞌𦞏𦞔𦞝𦞪𦡅𦣴𦥽𦦟𦦡𦦧𦦻𦧁𦧓𦧩𦨏𦨳𦨴𦨵𦩟𦩡𦩢𦩬𦫚𦬶𦭡𦭥𦯿𦰜𦰟𦲵𦳘𦳝𦳧𦳲𦳼𦴏𦴸𦵽𦶙𦸮𦻬𦼠𦼻𦽀𦽁𦽌𦽪𦾓𦾦𦾴𦿢𦿧𧀄𧀚𧁎𧁺𧄇𧄦𧅭𧅾𧆦𧆫𧇌𧇱𧉁𧉠𧉮𧊔𧊘𧊚𧊛𧊞𧊳𧊽𧋟𧍋𧍜𧍞𧍦𧍧𧎵𧏍𧏨𧐈𧐗𧐟𧔽𧖥𧖦𧖳𧗝𧗞𧗟𧗠𧗡𧗢𧗣𧗤𧗥𧗦𧗧𧗨𧗩𧗪𧗫𧗬𧗭𧗮𧗯𧗰𧗱𧗲𧗳𧗴𧗵𧗶𧗷𧗸𧗹𧗺𧗻𧗼𧗾𧗿𧘀𧘁𧘂𧘃𧘄𧘅𧘆𧙈𧙥𧙺𧚀𧚁𧛖𧛡𧜂𧜃𧜚𧜽𧝚𧞈𧞲𧞲𧟸𧠡𧡢𧡫𧡰𧣟𧥙𧥙𧥚𧥚𧦧𧨘𧩹𧪢𧪣𧭊𧭒𧭶𧮉𧮶𧯃𧱁𧱂𧱒𧱲𧲔𧲝𧲞𧲿𧳆𧳉𧶅𧶉𧶽𧷆𧸰𧹭𧹵𧺴𧻓𧻚𧻥𧼟𧼦𧼱𧾍𧾎𧾔𧾩𧿶𨀜𨁇𨂍𨂿𨃂𨄕𨅳𨆁𨆈𨆪𨇕𨇙𨇫𨈹𨈾𨊰𨋜𨌌𨐗𨓵𨔖𨕀𨕣𨕹𨖍𨖑𨖜𨗙𨗪𨗵𨘖𨙌𨚯𨛴𨜠𨝌𨝝𨞫𨠑𨠻𨡪𨢏𨢹𨣚𨤯𨦹𨧇𨧐𨧯𨨆𨨨𨨵𨩆𨩨𨫖𨫬𨬆𨭖𨭳𨮫𨮵𨯜𨯫𨯺𨰷𨰿𨲡𨲵𨲷𨳰𨳱𨴏𨴠𨴸𨵀𨵄𨵩𨵶𨷑𨸆𨹗𨹙𨺈𨺤𨺨𨼃𨼿𨾟𨾺𩀁𩀇𩀈𩀥𩁉𩂦𩂷𩃋𩃰𩄔𩅞𩇷𩇺𩈚𩉊𩉻𩊓𩊖𩊗𩊱𩊹𩋟𩋢𩋨𩋬𩍕𩍡𩍬𩍻𩎁𩎨𩏆𩏬𩐄𩐤𩐺𩑔𩑤𩒗𩒢𩔆𩔣𩕠𩕪𩕱𩕲𩗇𩘆𩘒𩘓𩘞𩘶𩙼𩙽𩛪𩛸𩛹𩝈𩝑𩞯𩟍𩠂𩠍𩠓𩠰𩣔𩣾𩤟𩤡𩤥𩥀𩥆𩥐𩦓𩦮𩦰𩦺𩧲𩧿𩨘𩩅𩫐𩫑𩫡𩫧𩭺𩮎𩮏𩮭𩯤𩰌𩰵𩱟𩳚𩵱𩷴𩷵𩷿𩸵𩸻𩹊𩹍𩺄𩺏𩺯𩻀𩽱𩾥𩿽𪀭𪁆𪂶𪃃𪃌𪃗𪃵𪄓𪄜𪄟𪄮𪄺𪇥𪈹𪈹𪉥𪉳𪊈𪊥𪊪𪋋𪋥𪌇𪌢𪍧𪍺𪎀𪎼𪐒𪐜𪒉𪒵𪓼𪔚𪔢𪔩𪕒𪕙𪕫𪕲𪖫𪖬𪖭𪖴𪗟𪗪𪘀𪘇𪘍𪘗𪙁𪙵𪙸𪙼𪚏𪝄𪝚𪝜𪝯𪞸𪟉𪟒𪟳𪟴𪠀𪠆𪠫𪡿𪢈𪣴𪥚𪦉𪦊𪧞𪨆𪨣𪨦𪨳𪩵𪪀𪪃𪪙𪫊𪫗𪫻𪬣𪬨𪬶𪭟𪮀𪯬𪰃𪰱𪲉𪲭𪲿𪳜𪴶𪴻𪴽𪵈𪵔𪵜𪵣𪵤𪵥𪵥𪵦𪵧𪶥𪶯𪶾𪷋𪷑𪷠𪷩𪷪𪸃𪸈𪸏𪸕𪹈𪹎𪺗𪻘𪻛𪻭𪼕𪼘𪽺𪾞𫀈𫀏𫀩𫀱𫀶𫂂𫂊𫂨𫃭𫄟𫄠𫄡𫄩𫄭𫅝𫆻𫈡𫉀𫊨𫋾𫌅𫌟𫌮𫌰𫍟𫍣𫍯𫍽𫎄𫎐𫎴𫎹𫏿𫐌𫑉𫑖𫑖𫑲𫑺𫒍𫒻𫓉𫓎𫔑𫔦𫔦𫔷𫕀𫕆𫕍𫗴𫘞𫘰𫙚𫙱𫙸𫚾𫛦𫛨𫛼𫜅𫜈𫜧𫝛𫝴𫟾㔕𣫺爨𤲒䍙𫠧𫡸𫢄𫢛𫣀𫣽𫤊𫤊𫤎𫤻𫥐𫥮𫦓𫦝𫦴𫧑𫧒𫧬𫨥𫨪𫩲𫪖𫪣𫪲𫫭𫫹𫬦𫬸𫭍𫯆𫯋𫯎𫯫𫯭𫯿𫰁𫱆𫱯𫱯𫳞𫴅𫴦𫴫𫴮𫴱𫵆𫵙𫵾𫶆𫷔𫷘𫸁𫸙𫹛𫾄𫾡𫿛𬀑𬀲𬀷𬁩𬂕𬂻𬄁𬄥𬄮𬄴𬅗𬆆𬆋𬆋𬆬𬆶𬇏𬇐𬇑𬇒𬇓𬇸𬇺𬈿𬉨𬊄𬊩𬋺𬌤𬌺𬎎𬏄𬏉𬐨𬐩𬐰𬑖𬑩𬑪𬑲𬒐𬒑𬒥𬓾𬕎𬕚𬕠𬕢𬕯𬖙𬗥𬘫𬘵𬙉𬚗𬚻𬜃𬜌𬜼𬝀𬝀𬝖𬝫𬞊𬟎𬠜𬠱𬢊𬣃𬣊𬣲𬤎𬥵𬧂𬧵𬨚𬨤𬨦𬩕𬩬𬩼𬪊𬪌𬪗𬪮𬫑𬫲𬫽𬬉𬭅𬭌𬭠𬮂𬮐𬮦𬮫𬮫𬮶𬲈𬳃𬳇𬳹𬴌𬴠𬴴𬴼𬵢𬵭𬵸𬶉𬶦𬶵𬷍𬷎𬸦𬹉𬹿𬺍",
 "口": "亶亹伺侻個倘倜倨偌偔偔偘偘做偪傴僑僑僒僦僺儇儓儔儼儼兗兙兛兝兞兡兢兢兣冨凅凋剋剧副剾劋勀勊勪勪匐匔匔匲匿區區卾卾厬呞哵哾啁啹喀喏喖喣喦喦喿喿嘔嘺嘺噈噋器器噪噮噳嚆嚆嚋嚞嚞圖圜堡塣塾墪夁奝奩娔娧婟婤婮婼媩媬嫗嫴嬌嬌嬛嬠嬦嬯孍孍孠富寰尅屫屫崌崓崮崿崿嵒嵒嵓嵓嶇嶠嶠嶯嶹巐巐巖巖巗巗帨幅幜幧幬廍廓彄彋彫影徜徟悅悦惆惝惹愊愕愕愘愙慥慪憍憍憝憞憬憱憾懁懆懛懤挩捌捝据掿揊揢搁摳撂撉撔撟撟撴撷撼撾操擐擑擡擣擱擷攍攓敓敚敞敬敺敽敽敿敿斖晭暻暾曮曮柌梲棁棝椆椐椺楁楅楉楛楜榀榀榈榈槗槗槨樞橋橋橔橭橾檈檛檝檮檯櫊櫚櫚欕欕欞欞欞歐殑殧毆氉氪泀涗涚涸涺淌淍渃湂湂湖湢湺漚漷潞潡潪澋澏澔澞澡澴澸濄濈濤濸瀒瀛瀥瀥瀲瀲瀽灜煏煦照煰煰煲煳熍熍熟熰燆燆燉燝燥燺燺燽燾爧爧爧猢獢獢獤獧玁玁琚琱瑚璐璟璪環璹甌疇疈疈痥痼瘔瘸癌癏皗睭睰瞘矂矯矯碉碞碞碦礄礄礅礹礹祠祱祻禀禂福禱稅税稒稟稠稫穚穚竆竆笥箇箈箉箬箶篰簉簥簥簬簵簻籉籌籝籡籡籢籢籨籨籯糊糙糫綂綐綢綤緔緥緿繑繑繯繰纈绱绸缲缳翢翾翿耥脫脱腒腭腭腷膒膼臊艍艥莌菇菬菭萔萼萼落葆葈葋葍葫蒘蒟蓓蓲蔀蔒蕎蕎蕗蕚蕚蕠蕺薃薃薖薵薹藁藁藃藃藳藳蘝蘝蘞蘞虋蛻蜕蜛蜩蝠蝴蟜蟜蠉蠚衚裞裯裾褒褓褔襙襭覗覨覨詞說説調諤諤諨諾謳譈譑譑譞譟譸讝讝词说诺调谔谔貙賙賲赒趟趫趫趮踞踾蹃蹴蹵蹻蹻蹾躁躊躺軀軇輖輻轎轎轗轘辐週逼逽遌遌還郮鄀鄂鄂鄙鄵醐醢醧醻釅釅鉰銳鋭鋴鋸鋿錭錮鍔鍔鍢鍣鍩鍸鏂鏴鐈鐈鐑鐓鐛鐜鐰鐶鐹鑄鑳锐锘锢锯锷锷镦镮閱閲闆闆闙闤阅阛隯雕霌霘霩露霵鞝鞹鞽鞽額顎顎顥颚颚额颢飼餬饇饕駾騆驅驐驕驕髂髞鬍鬟魗鮵鯛鯝鰏鰐鰐鰗鰙鰸鱎鱎鱞鱢鱤鱵鲴鲷鲾鳄鳄鳡鵰鶋鶘鶚鶚鶝鶦鷗鷮鷮鷲鷺鷻鸆鹕鹗鹗鹫鹭鹮麣麣齶齶㐛㐝㑬㑼㓮㓵㓵㔀㗁㗁㗅㗎㗠㗥㗬㗻㘆㘙㘙㙂㙱㙳㚋㚸㜔㜲㝯㝯㟃㟋㟘㟧㟧㟯㠇㠋㠋㠐㠐㢗㢗㣨㦞㦭㦭㦭㧽㨄㨐㨯㨼㩆㩈㩰㫾㬃㬑㬯㬽㬿㭻㮙㮙㯁㯝㯧㰏㰏㰗㱻㲂㳳㴌㴦㴦㴫㵑㵖㶑㶑㷘㷛㸆㹗㺃㺧㺧㺧㺧㻤㻻㽬㽬㾰㿋㿏㿒㿧䀉䀉䁨䁵䂱䃔䃔䃞䃦䃭䃷䄥䄥䄥䅕䆆䆰䆼䇷䈃䈏䈚䈢䈮䈷䉐䉗䉞䉥䉱䉷䉷䉹䉹䉹䊑䊭䊴䊴䋧䋹䌎䌔䌠䌧䌱䌴䌼䌿䍛䎗䎗䎭䎻䏤䐻䑉䒃䓟䓢䓵䓵䔏䔒䔯䔱䔻䕂䕎䕒䕡䕡䕦䕵䕸䕾䕾䖀䖀䖀䖀䖃䖃䖃䖅䖅䖅䗢䘔䙔䙤䙭䙯䚐䚖䚖䚖䚩䚩䚪䛐䛯䜗䝻䞴䠀䠒䠦䡱䡿䡿䡿䢄䢩䢪䢪䣊䣳䤀䥋䥠䥨䥨䧓䧢䩴䩽䪃䫄䫲䬇䬈䬞䬽䭅䭋䭌䭘䮠䮻䮿䯁䯫䯬䯬䯾䰱䰱䰱䱟䲖䳰䳼䴉䴋䴒䴒䴒䵕䵗䵲䶫䶫𠄹𠄾𠊑𠋼𠌁𠌣𠍟𠎄𠎠𠏀𠏼𠐨𠐨𠐻𠑕𠑛𠑪𠑪𠑪𠑪𠑱𠒐𠒘𠒙𠒚𠒠𠒭𠒲𠓀𠓈𠓎𠓎𠔴𠕡𠗌𠘁𠘉𠘥𠘥𠙏𠙪𠙪𠜑𠝒𠝔𠟒𠟸𠠐𠠦𠠩𠠬𠠬𠠱𠠱𠠱𠡳𠢔𠢙𠢺𠣋𠣋𠣋𠣶𠣷𠤁𠤁𠥏𠥝𠥝𠥤𠥷𠥹𠥺𠥺𠫅𠫆𠭈𠮄𠳈𠳭𠴱𠵀𠵀𠵎𠵛𠵛𠵬𠵬𠶅𠶕𠶠𠶤𠶰𠷂𠷉𠸒𠸚𠸢𠸧𠸪𠹒𠹒𠹜𠹜𠹴𠺝𠺴𠺷𠻁𠻐𠻖𠻖𠻛𠻝𠻝𠻧𠻸𠼧𠼧𠼵𠽦𠽿𠾅𠾅𠾸𠿑𠿕𠿕𠿻𠿻𡀉𡀉𡀔𡀞𡀢𡀢𡀳𡁁𡁍𡁒𡁗𡁗𡁞𡁞𡁤𡁮𡂀𡂀𡂂𡃃𡃉𡃍𡃍𡃥𡄃𡄃𡄓𡄥𡄥𡅙𡅚𡅚𡅚𡅚𡅝𡅝𡅾𡅾𡆔𡆔𡆔𡆔𡇤𡈅𡈆𡈆𡈉𡈯𡈰𡈺𡌀𡌮𡍄𡍸𡍸𡎁𡎣𡎺𡏁𡏧𡏿𡐈𡐈𡐴𡐹𡐻𡑛𡑟𡑡𡑱𡑳𡑾𡓣𡓣𡕄𡕅𡕐𡕐𡕑𡖹𡗏𡗏𡗑𡙗𡙗𡙰𡚍𡚍𡝣𡞀𡞎𡞯𡟁𡟌𡠻𡡧𡡬𡣏𡣏𡣗𡤓𡤔𡥯𡥱𡦝𡨢𡩫𡩺𡩾𡪑𡪑𡪞𡫥𡫥𡬚𡬚𡬚𡬿𡭒𡭿𡮚𡮢𡮯𡮵𡮶𡯶𡰏𡰑𡰑𡰘𡰘𡰠𡳄𡳍𡹍𡹫𡹹𡻓𡻙𡻫𡻫𡻳𡻵𡻵𡼑𡼑𡼖𡼩𡼮𡼰𡼰𡽘𡽝𡽝𡽩𡾘𡾘𡾰𡿡𡿡𡿡𢀍𢃉𢃊𢃖𢄠𢄹𢄹𢅗𢅣𢅸𢅸𢆀𢇔𢉒𢉢𢉣𢉤𢉳𢉽𢋻𢋻𢌃𢌃𢌏𢌔𢌔𢌔𢐟𢐟𢐻𢑍𢑎𢒬𢔴𢕓𢕪𢕪𢕳𢕼𢘜𢚛𢛅𢛇𢛑𢜃𢜌𢞉𢞏𢞏𢞙𢠑𢠑𢠔𢡇𢡭𢢂𢣆𢣆𢣸𢤁𢤈𢤝𢥫𢥲𢥴𢥴𢩚𢩠𢭪𢮌𢮐𢯐𢰥𢰮𢰴𢰾𢱌𢱗𢲚𢲹𢳉𢵒𢵷𢷅𢷯𢸟𢸟𢹞𢹦𢹦𢺅𢺅𢺆𢺑𢺘𢺘𢺰𢺰𢺰𢻒𢻙𢻤𢻤𢻥𢻪𢻪𢽧𢾇𢾏𢾮𢾮𢿛𢿽𢿾𣀉𣀏𣀓𣀘𣀣𣀦𣀬𣀬𣁀𣂻𣇋𣉾𣊤𣋃𣋈𣋝𣋬𣋽𣋽𣌋𣌋𣌚𣌟𣌟𣌟𣍼𣎃𣎏𣎥𣒖𣔗𣔲𣕄𣕉𣕌𣕘𣕧𣖎𣖎𣖚𣖹𣗐𣗛𣗺𣗻𣘌𣘙𣘜𣙭𣙱𣚘𣚬𣛴𣜍𣜣𣜨𣜵𣝏𣝏𣝜𣝩𣝩𣝷𣞃𣞋𣞟𣞳𣞴𣟅𣟭𣟭𣟯𣟴𣟺𣟺𣟼𣟽𣠄𣠄𣠇𣠇𣠎𣠏𣠺𣠺𣠾𣡬𣡿𣣟𣤅𣤙𣤙𣤫𣤮𣥺𣦎𣦛𣦤𣩛𣪯𣪯𣪽𣪽𣫐𣫢𣫢𣮆𣮗𣮜𣯂𣯱𣯹𣯹𣰕𣱇𣸬𣹓𣹔𣹤𣺾𣻃𣻵𣻵𣼞𣼞𣼨𣼪𣽞𣽺𣽺𣾃𣾷𣾷𣿎𣿹𤀰𤀰𤀺𤁅𤁐𤁙𤁵𤁵𤂌𤂸𤃆𤃺𤄋𤅙𤅙𤅝𤅝𤅷𤅷𤅷𤉎𤉸𤋹𤋼𤌚𤍸𤍸𤎼𤏅𤏉𤏩𤏬𤐚𤐵𤑯𤑯𤑴𤒀𤒡𤒡𤒥𤒥𤒦𤒦𤒵𤓜𤔜𤔺𤕉𤕊𤖞𤖣𤖦𤖦𤖦𤖧𤗚𤗿𤘀𤙥𤙽𤛐𤛸𤜀𤜃𤜙𤜙𤜙𤟳𤠂𤠾𤢊𤢖𤢨𤢨𤢬𤢺𤢾𤢾𤣤𤣤𤣤𤥣𤦮𤦸𤩏𤩝𤩝𤩭𤪘𤪢𤫠𤫠𤫩𤫩𤫩𤬙𤭭𤭱𤮗𤮹𤮹𤮹𤯯𤴆𤷛𤷩𤸊𤸔𤸔𤹇𤹓𤹙𤹜𤹜𤹦𤹪𤺨𤺽𤻌𤻡𤻭𤼅𤼅𤼏𤼏𤼘𤿅𤿅𤿅𤿫𤿱𤿼𥀌𥀚𥀜𥀴𥀴𥂌𥂍𥂍𥂣𥂦𥂬𥂰𥄶𥆟𥇂𥈭𥈭𥊢𥊣𥊬𥊰𥋆𥋊𥋊𥋑𥋒𥋓𥋤𥌆𥌲𥍒𥍓𥍓𥎤𥎥𥏨𥓡𥔁𥔓𥔯𥔲𥔲𥕖𥕥𥖉𥖙𥖨𥖲𥖳𥖹𥘃𥘃𥘃𥚑𥜝𥟾𥠫𥡉𥢍𥢫𥢺𥣇𥤁𥤎𥤜𥤜𥤜𥤞𥤞𥤞𥧘𥧝𥧦𥧸𥨙𥩔𥩔𥩔𥫉𥮐𥯚𥯛𥯳𥯳𥯶𥯷𥰄𥰔𥰔𥰪𥰮𥰵𥱸𥲐𥳒𥳖𥳛𥳦𥴜𥴴𥴻𥵂𥶆𥶆𥶟𥶟𥶳𥷇𥷇𥷛𥷫𥷷𥷷𥷼𥸛𥹲𥺝𥻅𥻞𥼱𥼱𥼾𥽇𥽴𥽴𥽹𥾂𥾂𥾂𥿆𦀧𦁿𦂅𦂍𦂦𦃣𦃣𦄄𦅡𦆃𦆳𦆳𦇎𦇰𦈒𦈹𦈺𦉘𦉚𦉠𦊛𦌕𦌺𦎛𦏓𦏟𦏧𦑞𦑭𦑽𦑽𦒓𦒓𦒝𦒠𦒽𦓉𦔆𦖇𦗒𦗵𦗻𦗻𦛺𦝣𦟋𦠢𦠬𦠶𦠾𦡴𦢷𦢷𦢽𦣴𦣶𦥅𦥐𦦰𦦳𦦾𦩃𦩍𦩡𦩪𦪔𦪞𦪞𦫊𦫊𦫊𦫢𦭡𦮿𦰯𦰰𦰱𦱅𦲀𦴆𦴈𦴚𦵡𦵡𦵼𦵿𦷮𦷸𦷽𦹃𦹄𦹐𦹛𦹛𦺘𦺢𦻓𦻟𦼸𦼸𦽋𦽌𦽑𦽪𦽫𦽻𦾆𦾆𦾈𦾊𦾊𦾚𦾝𦿓𦿞𧀁𧀚𧀺𧁭𧁴𧁴𧂃𧂎𧂎𧂕𧂕𧂬𧂹𧂹𧃇𧃕𧃗𧃵𧄈𧄤𧄤𧄤𧄤𧄥𧄳𧄳𧄸𧅐𧅧𧅧𧇓𧇟𧈙𧉠𧍌𧍏𧍗𧍞𧍞𧍮𧍵𧍷𧎡𧎡𧐣𧐯𧐾𧑊𧑒𧑙𧑼𧑽𧒊𧒌𧒍𧒖𧒩𧒪𧒮𧔫𧕌𧕳𧖜𧖜𧖜𧙈𧛂𧛞𧛩𧛫𧛭𧛱𧜐𧝂𧝋𧝗𧝨𧞴𧟓𧟓𧟙𧟙𧟙𧢱𧢱𧢱𧨲𧩡𧫾𧬂𧬌𧬕𧭏𧭺𧭻𧮈𧮻𧯙𧯙𧯙𧯼𧰑𧳜𧴜𧴣𧴣𧶮𧷹𧸚𧹕𧹭𧼹𧼻𧼻𧽓𧾎𨁑𨂊𨂥𨃐𨃶𨃷𨄅𨄡𨄹𨆈𨆤𨆥𨆿𨇊𨇊𨇓𨇓𨇥𨉋𨉜𨊝𨌔𨌩𨍇𨎎𨎟𨎠𨎲𨎵𨐞𨐠𨐡𨑀𨑀𨓚𨔗𨔣𨔽𨖎𨖰𨗍𨗟𨘌𨘴𨛮𨜂𨜳𨜳𨝚𨝰𨝰𨞪𨟍𨟍𨟢𨟯𨟯𨟯𨡊𨡑𨡔𨡱𨡷𨢶𨣛𨣝𨣻𨣻𨤍𨤍𨤍𨧢𨩗𨩗𨩚𨩦𨩮𨪓𨬎𨬕𨬟𨬱𨬱𨭦𨮉𨮢𨮼𨯕𨯘𨯘𨯢𨯤𨯫𨰇𨰇𨰊𨰠𨰨𨰩𨰫𨰫𨰯𨲭𨲭𨵔𨵩𨵫𨶝𨶴𨶴𨶽𨷀𨸆𨹪𨺤𨺨𨺨𨻴𨼓𨼵𨽣𨽲𨽲𨽲𨽿𨿰𩀇𩀇𩀉𩀫𩀻𩁐𩁗𩄭𩅇𩅌𩆮𩆮𩆯𩆯𩈮𩊭𩋙𩋜𩋨𩋽𩌂𩍡𩎀𩎑𩎰𩐿𩑊𩑊𩑊𩔸𩕪𩕯𩕹𩗪𩗵𩘆𩘎𩘎𩙈𩙰𩙽𩜻𩜻𩞓𩞺𩟂𩟎𩟨𩟽𩟽𩟽𩤅𩤩𩦢𩦤𩦮𩦼𩦽𩧽𩧿𩫠𩫠𩫧𩫧𩫨𩫨𩫩𩫩𩫫𩫫𩫭𩫭𩫯𩫯𩫰𩫰𩫱𩫱𩭸𩭺𩭼𩭽𩯘𩯘𩯟𩯦𩷻𩹃𩹕𩹜𩹬𩹿𩺐𩻂𩻗𩻱𩼘𩼝𩽜𩽬𩽴𩽴𪁑𪁺𪂯𪃁𪃇𪃕𪃫𪃭𪄎𪄘𪄘𪄣𪅅𪅪𪆃𪆋𪆝𪆣𪆥𪆩𪆬𪆹𪆽𪇅𪇍𪇘𪇜𪇳𪈁𪈃𪈃𪈶𪉕𪊄𪋃𪋬𪋹𪋹𪍒𪍷𪍷𪍺𪍻𪍽𪎎𪏎𪐉𪒯𪒴𪒹𪔦𪕮𪕱𪕲𪗪𪘺𪙚𪛅𪛇𪜟𪜥𪝍𪝦𪝦𪝭𪞅𪞌𪟰𪟶𪠯𪡜𪢉𪢍𪢑𪢟𪢟𪢡𪢡𪢰𪣕𪤢𪦊𪦊𪦐𪦝𪦫𪦭𪦲𪧒𪩄𪩪𪩪𪩽𪪨𪬠𪬠𪬩𪬱𪬹𪬽𪮐𪮐𪮔𪮯𪯀𪯜𪯮𪲪𪲴𪳅𪳇𪳣𪳤𪳲𪳺𪴋𪴍𪴍𪴰𪶃𪶎𪶝𪶩𪷢𪷧𪷰𪸉𪸳𪸼𪹃𪺤𪻷𪻽𪼝𪼧𪽄𪿩𫀤𫀤𫀲𫁦𫂕𫂨𫂯𫃅𫃏𫃓𫃶𫄃𫄅𫄉𫄏𫅊𫅘𫆣𫇜𫇠𫈆𫈈𫈷𫉅𫉎𫉞𫉢𫉦𫉳𫊐𫋍𫋤𫋰𫌔𫍎𫍽𫎙𫎢𫎵𫏚𫏾𫐏𫐘𫐦𫑊𫑒𫑓𫑧𫒴𫒵𫒸𫓏𫓜𫓞𫓟𫓟𫕆𫖦𫖧𫗛𫗫𫘘𫙥𫙺𫚛𫚨𫚫𫛋𫛒𫛕𫛲𫛷𫜅侻帨駾𫠼𫡡𫡡𫡿𫢀𫢄𫣇𫣇𫣈𫣈𫣠𫣦𫣯𫣶𫣹𫣹𫤊𫤊𫤋𫤐𫤐𫤛𫤤𫤲𫤻𫥛𫦙𫦙𫦢𫧗𫧗𫧚𫧜𫧭𫧱𫨁𫨋𫨐𫨘𫨘𫨚𫨛𫨪𫪓𫪮𫫚𫫤𫫩𫬔𫬔𫬛𫬢𫬢𫬣𫬣𫬭𫬸𫭔𫭕𫮀𫮆𫮪𫯫𫯵𫰶𫱆𫱜𫱜𫱪𫱬𫱲𫱾𫲠𫲠𫲦𫲩𫲳𫳌𫳓𫳓𫳖𫳫𫴅𫴦𫴫𫵆𫵊𫵦𫶕𫶕𫶚𫶜𫶜𫶶𫸁𫸂𫸙𫹟𫹢𫹧𫹪𫹪𫺕𫺢𫺢𫺭𫻒𫻹𫽚𫾛𫾛𫾸𫿛𫿠𫿥𫿧𫿺𬀌𬁤𬃙𬃱𬄜𬄣𬄮𬅁𬅂𬅰𬅰𬆅𬇅𬇾𬈣𬈸𬈻𬊥𬋬𬋹𬍉𬍌𬍌𬍌𬍨𬍭𬎹𬏳𬐩𬐴𬑀𬑀𬒝𬒥𬒫𬒫𬓐𬓚𬓚𬓮𬔂𬔓𬔟𬕒𬕛𬕰𬕲𬕼𬖢𬖿𬖿𬗞𬗟𬗸𬙄𬙹𬚀𬚜𬚧𬛅𬛝𬜄𬜷𬝭𬞩𬞩𬟖𬠺𬡫𬡫𬡾𬢊𬤠𬤣𬤨𬤯𬥃𬧒𬧒𬨚𬨴𬩁𬩎𬩬𬩰𬪊𬪊𬪗𬪵𬫫𬬟𬬤𬬤𬬤𬬤𬭕𬭡𬭧𬮳𬮳𬯑𬰌𬰒𬰦𬰯𬱆𬱎𬲾𬳃𬳑𬳚𬴋𬴏𬴞𬴬𬴴𬵸𬶞𬶱𬶵𬸑𬸫𬹃𬹿",
 "丶": "乥乼併侻偤傍剎剏剙咲哟啲喲嗙嘀奠姘娧媨嫎嫡嬴孵尊屏崷嵀嵜嵭巙帡帨幭庰弟彦徬恐恲悦慅懱拦拼捝掋掷揂搃搒搔摘敚敵暀朕栏栚栟棁楢榜樀樃樦櫗歒毈洴浂浐涚渆渕湭溞滂滳滴滼瀎烂烪烵煪煫熵牓猶猷瑵瓶甋産痥瘙瘹皏盕眹硑磅礣祱禉税箹篣糔絣綐緧縂縍缾羸耪聓胼脱膀臗臝艕艵茿荓药莌菂菧萨葯蒁蒆蒗蒡蒬蔏蔐蘣虁蛢蛩蜕蝤螃螪蠃蠛蠤衊裞襪覫誁説謗謪謫说谤谪豓豴賆賘贏贕赢趥跫跰踯蹢躨軿輶迸送遂遒適邃郑郱鉼銎鋭鎊鏑鑖鑧铲锐镑镝関閲阅隊霔鞏鞧韈韤頩颾餅駢駾騯騷驘骈骚骿髈髖鮩鮵鰌鰟鰠鱴鳋鳑鵧鶐鸁鼜㒝㔙㗐㗟㙂㟋㠃㠫㤣㤻㥞㥢㥬㧬㩢㭽㮻㲉㲧㳕㴚㴤㷕㺸㻂㼦㿶䁤䁾䂬䂱䃍䄘䅃䅭䇔䈂䊄䊞䌩䌼䎮䐱䑫䒍䓎䓜䔙䕞䘊䙗䠓䠔䠙䡗䣌䤋䥉䦕䧛䨦䩏䩷䫄䬇䬈䬽䮰䯟䯦䲡䴵䵂𠄁𠈪𠉫𠌖𠍖𠐝𠒿𠔣𠔳𠕏𠗤𠗵𠛼𠞶𠡑𠢗𠦦𠨫𠴓𠷞𠹕𠹻𠺘𠼬𡀟𡃙𡋋𡌠𡍓𡐂𡐱𡗺𡝖𡞜𡟅𡟝𡟰𡠁𡠶𡢥𡩙𡬶𡯾𡲚𡳴𡶴𡸌𡸫𡺚𡻔𡾛𢄎𢆃𢆗𢆛𢆢𢆣𢉭𢉷𢋠𢋴𢍜𢏳𢐊𢕠𢛛𢜂𢬈𢭘𢯊𢰤𢰹𢵩𢸎𢼩𢼶𣁊𣁑𣂆𣂉𣄥𣄬𣇋𣇭𣉐𣋻𣑃𣒾𣔾𣜃𣜄𣟂𣠉𣣫𣣱𣫘𣮩𣯊𣯟𣯵𣵃𣶂𣷃𣷳𣹠𣻚𣾍𤀾𤃊𤋃𤋌𤒆𤔢𤚃𤚰𤝴𤠻𤦺𤧭𤨬𤭅𤷭𤷮𤸈𤸉𤹔𤹞𤹟𤻻𤽝𥀯𥁼𥂝𥆜𥇁𥉣𥊔𥍰𥒆𥔎𥔰𥕐𥗥𥚆𥛚𥜁𥜶𥞩𥠂𥡉𥡦𥢁𥢵𥣫𥣹𥦠𥧮𥩧𥩵𥭓𥯂𥯸𥲟𥳿𥶞𥻖𥻭𦂁𦆁𦆳𦆳𦆼𦍉𦐵𦒨𦖡𦖣𦗍𦗽𦝂𦝱𦞣𦣄𦣉𦣖𦦳𦩃𦩲𦯪𦰘𦰣𦳷𦴏𦵧𦷄𦷒𦸇𦺫𦽘𦿮𧂲𧅄𧎇𧔑𧜟𧝹𧨱𧰬𧳉𧳫𧸷𧻓𧼦𧼿𨃣𨃹𨈾𨌮𨍨𨍩𨏰𨓚𨓵𨗅𨗕𨗙𨜟𨜷𨝗𨡡𨡴𨢅𨢈𨢐𨣡𨩊𨩔𨩾𨪂𨪆𨫢𨵎𨶗𨹗𨹪𨺧𨺵𩂦𩃐𩅫𩅲𩆪𩈚𩊖𩌑𩓲𩔀𩔕𩙢𩙢𩙫𩛳𩝌𩡕𩫐𩫑𩭲𩮈𩱐𩱵𩱷𩳘𩴾𩽣𪀛𪂑𪂰𪃖𪃬𪄱𪄲𪆆𪆾𪇄𪇴𪋋𪍑𪏜𪐏𪑫𪑲𪓰𪓵𪕒𪕺𪘀𪚏𪝊𪝲𪞊𪟸𪠆𪠫𪡜𪡧𪡶𪤊𪥘𪦼𪨜𪪃𪪇𪬥𪭆𪭽𪯔𪯨𪲊𪲊𪲮𪲿𪳈𪳸𪵜𪸱𪹚𪹧𪹻𪽅𫁼𫂇𫂈𫃮𫃳𫄰𫇼𫉱𫉼𫍉𫐌𫐼𫒫𫒵𫕀𫕒𫘮𫚛𫛨𫜟𫜡𫝸𫞃侻僧帨憎瀛𤲒駾𫡞𫢳𫢵𫤛𫧷𫧼𫧾𫧿𫩪𫪭𫫀𫫐𫬩𫮍𫱨𫴿𫷘𫼪𬀲𬂵𬃕𬃪𬇲𬊏𬌿𬎼𬏒𬒇𬒩𬘶𬚜𬛊𬞎𬞠𬡻𬢬𬣲𬧪𬧽𬧿𬨆𬨎𬪁𬫗𬫝𬫩𬮦𬰧𬱒𬱒𬱒𬳣𬴅𬴱𬷗𬸉𬸑𬸬𬹛𬺅𬺙",
 "小": "乷俶偗傶僦唦嘁噈娑婌寂幜影惄慼慽憬憱挘挱挲掓摵撔暻桫桬椒槭殧毮淑渉渺渻澋燝猀琡璟痧督硰磩箵篎緲縬缈莎莏菽蠽裟裻諔踧蹙蹴蹵逤錖鏚鐛閯顣顥颢髿鯊鯋鲨鷲鹫㔀㗂㗤㘍㞝㠇㨘㩆㭞㮐㲚㸺㼳㾥㾪䔋䗩䙘䚇䠞䣉䤬䭘䯫䱙𠈱𠋝𠎠𠑱𠗼𠘉𠞔𠢣𠣇𠴕𠴫𡄱𡋷𡐹𡞞𡠽𡨽𡰏𡱳𡹧𡻕𡻷𡼩𡼮𢀍𢃝𢇄𢇔𢉌𢒬𢖌𢛼𢜫𢡸𢡾𢭼𢶌𣈉𣌚𣜤𣦉𣮅𣴷𣶲𣹇𣺌𣻅𤂔𤎼𤏅𤟏𤠽𤨟𤬂𥀻𥁲𥁽𥆝𥇇𥉷𥋐𥋓𥓍𥖉𥚔𥟧𥭝𥳛𥷛𥷼𥺤𥺱𥻠𥼀𦀛𦀟𦄉𦅡𦈚𦔄𦟠𦠢𦪊𦯷𦳗𦳥𦸗𦹈𧄥𧇝𧋊𧍖𧐶𧑊𧑙𧞰𧡕𧫳𧫾𨁭𨇌𨜜𨦒𨧷𨲓𨵥𨺏𨾻𩀻𩊮𩐿𩖑𩣟𩣠𩥼𩳑𩷈𩻱𩾈𪃐𪃦𪃧𪆣𪆩𪇲𪌮𪍋𪔯𪙻𪝹𪟜𪱐𪴽𪶋𪶼𪸉𪻻𪼝𪾱𫁐𫃏𫃬𫆦𫍂𫎢𫐽𫖧𫖹𫛄𫛹𫫩𫬣𫵆𫷴𫿛𬄣𬆷𬇭𬏩𬔂𬕍𬞎𬟄𬠋𬥇𬭭𬮪𬳑𬴈𬶱𬷙𬸙",
 "王": "乼噖塣嵀暀樦潖濏璱蘣霔飋㗟㴤䔷𠁉𠉫𠗤𡀜𡡱𡸌𢛛𢭘𣁑𣇭𣗐𣚒𣚶𣶂𣾔𤩍𤩏𤪴𤷮𥆜𥇁𥦠𥯂𥯸𥱜𦆄𦠴𦻓𧑜𧑡𧒓𧕸𨆙𨩾𨬩𩄺𩇣𪏜𪝲𫃮𫉝𫓝𫗋𫹟𫾂𬄑𬉒𬎋𬒠𬞅𬞷𬠥𬩰𬴋𬷗",
 "厶": "亝亝倊倯偿傟凇勶嗑嗡囈圔垒垒嬷峵崧嵡庺廅恡恸慃捴搕摆暡曇棇榼橒浤淞溘滃滚澐灎焧熆琺瑬瞈瞌硡硹磕磙竤箈篕絫絫綋総緿繧统翝脚菘菭葈葰蓅蓊蓋蓘蔬蕓蜐蜙螉襼讛豔踋郄醘銩鋐鍅鎏鎑鎓铥铳闔阖陰霐霒霕霴霼靅靆靉饁鬆鰪鲿㑢㒍㓍㔩㕁㕎㕖㕖㕘㕘㖁㗠㟣㤼㥖㥺㧤㨣㨰㬃㮬㯼㳘㳰㴉㴉㷘㷱㺋㾡䀷䂲䂶䈗䈚䈢䈵䉙䐋䐥䐦䓗䕂䖼䗘䘪䘴䙂䙓䜇䟲䠁䢄䦢䨭䨺䨺䨺䩺䫦䱵𠄳𠎢𠒨𠒩𠕡𠙆𠙣𠜸𠝔𠡜𠢙𠢺𠥕𠨙𠨦𠫅𠫆𠫷𠬄𠬄𠬅𠬅𠬎𠬎𠬐𠬐𠬓𠬓𠬔𠬔𠬘𠬘𠲍𠲵𠳞𠳷𠴈𠴷𠵐𠵽𠶠𠷂𠺩𡂃𡄬𡊿𡍻𡎭𡏖𡏬𡝔𡢸𡤓𡤔𡨭𡮱𡯤𡯮𡶱𡹳𡻊𡻐𡼊𡽭𡽭𢃓𢃪𢄍𢅄𢉡𢌇𢑎𢔋𢛒𢝍𢩘𢫻𢫿𢬱𢭙𢯖𢰇𢰥𢰾𢲹𢴱𢵆𢺐𢻙𢾩𣉳𣊯𣑆𣒗𣔗𣕀𣕀𣕘𣕙𣗺𣗻𣘓𣘜𣚎𣜨𣝜𣞟𣟼𣟽𣠎𣠏𣡊𣣹𣦀𣦯𣦯𣩄𣳵𣳵𣶽𣸊𣸓𣸓𣸫𣹓𣹭𣺃𣺃𣺴𣺴𣺽𣾯𣾯𤀢𤁲𤌏𤛡𤞀𤠂𤠡𤡅𤡅𤥡𤦮𤮎𤯢𤯢𤯯𤲛𤲛𤳑𤳑𤳟𤷜𤷩𤸊𤸱𤸾𤸾𤹇𤹒𤹮𤹮𥀌𥂇𥃕𥅻𥊻𥏕𥒝𥓗𥓗𥔪𥔪𥕀𥕃𥕃𥖅𥛐𥜷𥜷𥢚𥦷𥧕𥬱𥮱𥯆𥰤𥳮𥴥𦀖𦁌𦂅𦅍𦈒𦒥𦓷𦔏𦕹𦚳𦛕𦜲𦝌𦝎𦠦𦠬𦥅𦥐𦫫𦰯𦲀𦲾𦴵𦶮𦾡𦾹𦿋𧀉𧀉𧄈𧅔𧅟𧅟𧇦𧋤𧌻𧏝𧏝𧗫𧛹𧛾𧜐𧪞𧬀𧬞𧰟𧵧𧵱𧵱𨃐𨇂𨌆𨌞𨍰𨐠𨒴𨒴𨖎𨗑𨗠𨛀𨜴𨜺𨝽𨦲𨨤𨫳𨴿𨵔𨸍𨹶𨹶𨽿𩃠𩃭𩃷𩃸𩄘𩅙𩅙𩅝𩅣𩅾𩆑𩆦𩇔𩇔𩇔𩇔𩇠𩌂𩌍𩓘𩔚𩙣𩡓𩥵𩥵𩩇𩮨𩮬𩱢𩱱𩸜𩸝𩺩𪁇𪁍𪁿𪃂𪄑𪆚𪊭𪊱𪎽𪒝𪔮𪗯𪘖𪝙𪞅𪞅𪠎𪠱𪡁𪡟𪤄𪦲𪫚𪫸𪰧𪳴𪴱𪴹𪶏𪶝𪶠𪶩𪹲𪻰𪽒𪽝𪾁𫁂𫃄𫄦𫇤𫉳𫎽𫐔𫒮𫒻𫔆𫕎𫛋𫝚𫡧𫢙𫢦𫧲𫨐𫫃𫭊𫰶𫰼𫶮𫸊𫺭𫽅𫾓𫿥𫿺𬄼𬈅𬈰𬉕𬊼𬎌𬎬𬐼𬓐𬓦𬓵𬔟𬕋𬙞𬙺𬛝𬜷𬝭𬞞𬞣𬟖𬤒𬨴𬨼𬪲𬫱𬭎𬭩𬰂𬰎𬰨𬳔𬷚𬸔",
 "囗": "亶儠嗯嗰嚸圖媼惉惦慍掂搵摁擸攟榲檆氳溫瀒煾熅爉獵硵禀禼稟縕膃臘萜蒕蒽蠟踮躐轀邋鄙醞鑞镴霑鬣鰮鱲㥈㯿㲱㼃䁽䃳䅰䉭䛸䜲䝓䪉𠠗𠡳𠧟𠨄𠳱𠶧𠸞𡏁𡐴𡓍𡝫𡞎𡟯𡟻𡳄𢆭𢛈𢜋𢞴𢰷𢵚𢺍𢿑𣋲𣞋𣮗𣯎𣰫𣸾𤊁𤋧𤌚𤒀𤖣𤖧𤨒𤬒𤭥𤹕𤹦𥀚𥀜𥂬𥔯𥠯𥠺𥢺𥧘𥮒𥮠𥱱𥸆𦟶𦡵𦰪𧄵𧪊𧭞𧰠𨃊𨎽𨗍𨜵𨝚𨪜𨮱𨵍𩃅𩞓𩟤𩤎𩥈𩨐𩻂𪇹𪉸𪍝𪎎𪐇𪙷𪜥𪞌𪦃𪩊𪪨𪬍𪬹𪯜𪯮𪲪𪶲𪹭𫁥𫃅𫃔𫅊𫓞𫖩𫚭𫜊𫠗㬈𫡿𫢀𫢶𫣆𫤲𫧷𫪓𫪮𫮤𫳖𫼵𫿢𫿧𬃼𬄜𬊥𬊬𬊲𬍭𬖭𬖷𬗀𬗟𬚅𬜗𬝐𬫫𬬟𬸵𬸶𬸷𬸸𬸹𬹃",
 "𠔼": "亹斖虋霘𠍟𢞉𣡿𤕉𤕊𥎤𥎥𥖹𥤎𧄸𨬎𨰨𩎑𩽬𪔦𪢉𫈷",
 "廾": "併侀倴偾僨剏剙喯喷噴型姘屏帡幩庰恲愤憤拼捹揅栟橨歕洴渀渆濆焺燌獖瓶皏硎硑絣缾翸胼膹艵荆荊荓莾蕡蛢蟦誁豮豶賆跰軿轒迸逩郱鉶鉼錛鐦鐼铏锛陞隫頩餅餴饙馩駢骈骿髜鮩鱝鲼鵧鵿黂㔙㣜㤣㭢㱵㳰㻂㿎䈂䊙䑫䒈䓑䗗䤯䥷䦕䩿䫙䴅䴵𠛼𠝊𡀜𡅊𡌎𡌑𡍋𡐱𡜇𡢸𡱚𡶭𡸫𡼝𡾛𢆗𢆛𢆢𢆣𢊱𢏳𢛿𢜘𢣦𢴢𢵱𢼩𢼶𢿠𣁊𣛣𣮡𣯻𣸣𣽑𣾘𣾺𤏾𤖘𤗸𤝴𤡲𤢫𤢳𤥡𤩳𤭅𥀢𥒱𥖀𥖆𥚙𥞩𥢊𥩵𥳐𥳡𥴥𦐵𦜭𦡅𦡛𦴏𦼠𧊞𧎔𧖿𧨘𧳉𧴍𧶭𧷐𧻓𧼦𨁼𨈾𨗙𨢏𨢹𨦹𨨵𨲡𨴸𨵒𨷑𨹗𨺒𩀴𩂦𩃋𩄺𩈚𩊖𩟲𩣺𩦓𩦥𩧼𩫐𩫑𩫬𩺄𪋋𪎰𪑖𪒰𪔭𪔵𪕒𪖅𪘀𪚏𪠆𪩸𪪃𪫊𪮓𪰫𪱥𪲙𫅗𫌟𫐌𫔁𫔦𫔷𫗌𫙸𫛨𤲒𫢰𫣽𫦃𫫭𫬩𫯩𫯿𫷘𫷱𬂻𬅫𬏄𬏷𬑖𬓱𬗛𬠥𬣲𬨀𬪮𬮫𬮶𬲣𬳟𬴙𬵭",
 "七": "侂侘咤姹挓烢秺詫诧㓃㢉㤞䅊䆛䒲䖳䤩䯔𠱹𡧜𡱩𢭑𣘄𣨰𣴜𤚧𤞌𤵾𥭌𧐢𨀸𨴥𨶃𩢵𩶱𩽽𪀥𪔘𪢁𪯒𫊴𫏫𫵟𬏨𬗍𬙳𬜭𬭈",
 "丂": "侉偔刳匏卾姱嫮崿嶀恗愕挎摴晇桍樗洿湂瓠絝綔绔胯腭舿荂萼袴覨誇諡諤謣谔跨遌郀鄂鄠銙鍔锷陓顎颚饕骻鮬鰐鳄鴮鶚鹗齶㓵㗁㙱㟧㡁㮙㰭㻬䠸䤈𠣻𠤁𠻢𡈆𡖮𡜂𡝻𡼰𢓢𢙁𣋌𣜍𣜵𤩭𤫸𤾼𥁡𥅚𥈭𥑹𥔲𥯳𦉏𦫚𦶊𦾓𧊘𧍞𧮉𧰑𨂍𨖜𨨆𨬆𨯫𨺈𨺨𨾺𩀇𩅞𩊓𩎁𩏬𩣔𩦰𪄮𪝄𪟉𪥚𪦊𪲶𪵈𪷢𪷪𫋾𫌮𫛦𫪖𫱲𫷶𬇸𬚗𬳹𬵸",
 "冂": "侗倘偏僑勪匾哃嘺嚆姛媥嬌屫峒峝嶠巐徜徧恫惝惼憍戙挏揙撟敞敽敿斒晍桐楄槗橋洞淌瀥烔煸燆燺爂爨牑狪猵獢璺甂痌眮矯硐碥礄秱稨穚筒篇簥粡糄絧緔編繑绱编翩耥胴舋艑茼萹蕎薃藁藃藳蝙蟜衕褊詷諞譑谝趟趫蹁蹻躺轎迵遍酮釁銅鋿鍽鐈铜鞝鞽餇駧騗騙驕骗鮦鯿鱎鲖鳊鶣鷮㓊㓲㖯㖰㗬㝯㞈㠐㢗㢥㣚㫾㭻㰏㲂㲢㴜㵸㸑㸗㻞㼐㾫䀉䆚䊑䎗䐔䚩䞒䠀䡢䢪䣊䭏䯬䶇𠀹𠆠𠆡𠖄𠙪𠨩𠪂𠶤𠿕𠿻𡀢𡁗𡁞𡂀𡎷𡓣𡖹𡗑𡜝𡝣𡞀𡭸𡭿𡮢𡮵𡮶𡰑𡰘𡱸𡹫𡺂𡽝𡾘𢂓𢄹𢈉𢉒𢉞𢌏𢍯𢏕𢐃𢐟𢑅𢕪𢖂𢡭𢣆𢩚𢩟𢮐𢻒𢻤𢿀𢿽𣀏𣋈𣎃𣑸𣔲𣕄𣝏𣝜𣝩𣠪𣡈𣡥𣤙𣥺𣦎𣦛𣩀𣩺𣪽𣬑𣮜𣯹𣸎𣹔𣾷𤀰𤅚𤅝𤓕𤖾𤙓𤙽𤢨𤩝𤬊𤭁𤭆𤷛𤺇𤿼𥃘𥊢𥊣𥊰𥋊𥋤𥍩𥓡𥗑𥚹𥣝𥳦𥼱𦃣𦈹𦉘𦉝𦑮𦑽𦒓𦖥𦦟𦦡𦦧𦦻𦧁𦨴𦪞𦫢𦰱𦳋𦼸𦽃𧂎𧂕𧄳𧅾𧇌𧊚𧍮𧑼𧒩𧖥𧖳𧙥𧡤𧨲𧩡𧭒𧱁𧳆𨀜𨇊𨇫𨈹𨌩𨐗𨔖𨖠𨚯𨜂𨝰𨟍𨡔𨣛𨤯𨩮𨭳𨯜𨯺𨰷𨲜𨲭𨴏𨿰𩅌𩇷𩊗𩍌𩐤𩒗𩗵𩧲𩩅𩫠𩫧𩫨𩫩𩫫𩫭𩫯𩫰𩫱𩯘𩴄𩼝𪀭𪁺𪄘𪈃𪉱𪌢𪍷𪎼𪏗𪒵𪓎𪔚𪕙𪖯𪘍𪟶𪠀𪢟𪢡𪴍𪻛𪽄𫀈𫂜𫄡𫍣𫎴𫑉𫕆𫕌𫖦𫙥𫝛爨𫡡𫣹𫥮𫦙𫧒𫨋𫨘𫨛𫯆𫱪𫶜𫻹𬆅𬓚𬓮𬕒𬜃𬞩𬡢𬡫𬡾𬩢𬮂𬲈𬴬𬷍𬸜𬸸",
 "人": "侳侳倅倅儉儉儠剉剉劍劍劎劎劒劒劔劔匳匳厱厱唑唑啐啐噞噞夎夎媼嬐嬐崒崒崪崪嶮嶮座座悴悴慍憸憸挫挫捽捽搵撿撿擸斂斂晬晬桽桽椊椊榲檢檢歛歛殮殮氳淬淬溫澰澰焠焠熅爉猝猝獫獫獵琗琗痤痤瘁瘁睉睉睟睟瞼瞼矬矬碎碎礆礆祽祽稡稡窣窣箤箤簽簽粹粹綷綷縕翠翠脞脞脺脺膃臉臉臘莝莝萃萃葅葅蒕薟薟蜶蜶蠟襝襝誶誶譣譣谇谇賥賥趖趖踤踤躐轀邋醉醉醞醶醶銼銼錊錊鐱鐱鑞锉锉镴閦閦險險顇顇顩顩驗驗髽髽鬣鰮鱲鹼鹼㛗㛗㝧㝧㟇㟇㢛㢛㫺㫺㫺㫺㭫㭫㮚㮚㯿㰵㰵㱖㱖㲞㲞㲱㷿㷿㼃㿌㿌䁞䁞䁞䁞䁽䂳䂳䃳䉭䌞䌞䔢䔢䔢䔢䘹䘹䚝䚝䜲䝓䟶䟶䦟䦟䦷䦷䩎䩎䪉䯿䯿䱣䱣䲓䲓䶨䶨𠁸𠁸𠐖𠐖𠐘𠐘𠑁𠑁𠑲𠑲𠑲𠑲𠗚𠗚𠛧𠛧𠠗𠣣𠧆𠧆𠧴𠧴𠨋𠨋𠨋𠨋𠨋𠨋𠩜𠩜𠫏𠫏𠷜𠷜𠹽𠺡𠾹𠾹𡀓𡀓𡀲𡂭𡂭𡄰𡄰𡇻𡇻𡌚𡌚𡍂𡍂𡎢𡎢𡎥𡎥𡎦𡎦𡎬𡎬𡏩𡏩𡑯𡑯𡒪𡒪𡓆𡓆𡓍𡓢𡓢𡓨𡓨𡓨𡓨𡓮𡓮𡔗𡔗𡔗𡔗𡘅𡘫𡘫𡙉𡙉𡜃𡜃𡝵𡝵𡦧𡦧𡨠𡨠𡨧𡨧𡮇𡮇𡯨𡯨𡳝𡳝𡸄𡸄𡽗𡽗𡽥𡽥𡾴𡾴𢃒𢃒𢅐𢅐𢆭𢈼𢈼𢋳𢋳𢏬𢏬𢒐𢒐𢔙𢔙𢚂𢚂𢢙𢢙𢣴𢨔𢨔𢮰𢱙𢲧𢺍𢾃𢾃𣄝𣄝𣋌𣋌𣋌𣋌𣋲𣖛𣖛𣖢𣖢𣘃𣜟𣜟𣞘𣞘𣡷𣡷𣡷𣡷𣡼𣡼𣡼𣡼𣡼𣡼𣣧𣣧𣣸𣣸𣤬𣤬𣤬𣤬𣦗𣦗𣦗𣦗𣦮𣦮𣨎𣨎𣨛𣨛𣫍𣫍𣬓𣬓𣬓𣬓𣯎𣰫𣰮𣰮𣴳𣴳𣴶𣴶𣹶𣹶𣿚𣿚𤂭𤂭𤉛𤉛𤒷𤒷𤡡𤩰𤩰𤪎𤪎𤪛𤪛𤬒𤭢𤭢𤲠𤲠𤸺𤼞𤾼𤾼𤾼𤾼𥃐𥃐𥃡𥃡𥜋𥜋𥠺𥣂𥣂𥦊𥦊𥧚𥧚𥭭𥭭𥲽𥲽𥷡𥷡𥸆𥻆𥻆𥽋𥽋𥽽𥽽𥾄𥾄𥾄𥾄𥾄𥾄𦃮𦅊𦅊𦅊𦅊𦆧𦆧𦆧𦆧𦑋𦑋𦖒𦖒𦗹𦗹𦗼𦗼𦝈𦟍𦠪𦠪𦠪𦠪𦪮𦪮𦪮𦪮𦰪𦵵𦵵𦹇𦹇𦻏𦻏𦻏𦻏𦾓𦾓𦾓𦾓𦿥𦿥𧂆𧂆𧄵𧡹𧡹𧨀𧨀𧫒𧫒𧬢𧬢𧬢𧬢𧭞𧮉𧮉𧮉𧮉𧰠𧳚𧳚𧸘𧸘𧾉𧾉𧾏𧾏𨆘𨆘𨌻𨌻𨎽𨐮𨔊𨔊𨔟𨔟𨗦𨗦𨘰𨘰𨛏𨛏𨜵𨢅𨢅𨢟𨹫𨹫𨿼𨿼𩅼𩅼𩎁𩎁𩎁𩎁𩏩𩏩𩏬𩏬𩏬𩏬𩕿𩕿𩖄𩖄𩖆𩖆𩗶𩗶𩜘𩜘𩟤𩤏𩤏𩥈𩦰𩦰𩦰𩦰𩨐𩫛𩫛𪁽𪁽𪆍𪆍𪆍𪆍𪇇𪇇𪇹𪈪𪈪𪈪𪈪𪉸𪊈𪊈𪊈𪊈𪋌𪋌𪌴𪌴𪍝𪎀𪎀𪎀𪎀𪒫𪒫𪓌𪓌𪘧𪘧𪙷𪙸𪙸𪙸𪙸𪙼𪙼𪙼𪙼𪜇𪜇𪟼𪟼𪣫𪨙𪨙𪭮𪭮𪰦𪰦𪺨𪺨𫇈𫇈𫈺𫋉𫐝𫐩𫐩𫔧𫔧𫔧𫔧𫖩𫙴𫙴𫚭𫝃𫝃𫝃𫝃㬈𫥜𫥜𫦆𫦆𫦈𫦈𫦛𫦛𫦡𫦡𫩅𫩅𫫂𫫑𫫑𫭿𫭿𫮋𫮋𫮣𫮣𫻣𫻣𫿢𬃄𬃄𬐎𬐎𬑮𬑮𬙼𬙼𬜈𬜈𬜐𬜐𬞈𬞈𬡢𬥗𬥗𬮥𬮥𬺋𬺋",
 "儿": "侻傂兗勎哾嗁埶娧帨幌悅悦愰挩捝搋敓敚梲棁榥榹歋涗涚涜淕滉滮熀燅痥皩睦磃祱禠稅税稑箲篪綂綐続縨统脫脱莌蛻蜕螔裞褫說説読謕说贊贊贙贙赞赞踛蹏逵遞銳鋭錴鍌鎤铳锐閱閲阅陸饕駾鮵鯥鵱鷈鷉鼶㓍㓐㔸㙂㙱㛬㜔㟋㡗㥴㦦㧤㨪㳘㴲㶁㾷㿗䁜䂱䌼䖙䘪䚦䞾䟲䡜䫄䫢䬇䬈䬽䶵𠊏𠐷𠐷𠒨𠒩𠒼𠜑𠡜𠮄𠺷𡄋𡄋𡊿𡎐𡎭𡎺𡏚𡕁𡕁𡞢𢊀𢐋𢑫𢝚𢯅𢱓𢴸𢸗𣄙𣇋𣋢𣋢𣔭𣘌𣜍𣜵𣟩𣤶𣮆𤁄𤂚𤄎𤄳𤄳𤅬𤅬𤎮𤏝𤓛𤞀𤨆𤩭𤫨𤫨𤭝𤹙𤿫𥅻𥆟𥌳𥌳𥒝𥓪𥚊𥡉𥬱𥳱𥳱𥹲𦁪𦆳𦆳𦇊𦚳𦞔𦢶𦦳𦩃𦵽𦺷𦺷𧄷𧇓𧌉𧑯𧑯𧔾𧜺𧮖𧮖𧰑𧷠𨁑𨃷𨅩𨉋𨌔𨎐𨓚𨞬𨪉𨯸𨹪𨻆𩀗𩊭𩎰𩤽𩩇𩰕𩱩𩱩𪁇𪁑𪂚𪋃𪎽𪕻𪗯𪝚𪝮𪝷𪞅𪡁𪡜𪦉𪫗𪷢𪷮𪸷𪻧𪻰𪽒𪽘𫇉𫌦𫌦𫎙𫒵𫚛侻冤󠄁堍帨駾𫤛𫦴𫱲𫲦𫷉𫸊𫸒𫻁𫿈𬀻𬃫𬈞𬈣𬓦𬕰𬚜𬜄𬟈𬧌𬩃𬪲𬭒𬰖𬸑",
 "兀": "俒唍捖晥梡浣烷皖睆筦綄脘莞蔲蔻輐鋎院鯇鲩鵍㹕䓕䓻䥵䯘䴷𠑬𠖈𠖝𠖞𠖤𠖨𠜍𠴉𠶃𡃺𡆁𡣑𡤁𡫅𡮾𡷗𢒎𢕋𢭫𢴝𢽉𣸦𤂕𤃤𤄮𤍘𤞵𤻆𥍘𥹳𥽵𦈂𦣗𦯿𦰟𧄍𧚁𧶉𨙌𨠻𨵄𩂷𩰈𩳚𪄓𪄺𪫻𪮀𪲭𪹎𪺗𫀏𫀶𫆻𬏉𬒑𬕎𬘏𬘫𬲢𬹉",
 "𠂇": "俙倄偌匿唏喏喐喛堕婼媛峵崤嵈恡悕惹愋掿援晞暖桸椭楉楥槗欷殽浠浤淆渃湲烯煖狶猨琋瑗瓻睎睰硡禐稀竤箬絺綋緩缓翝脪莃萲蝯蠚褑誵諼諾诺谖豨蹃逽郄郗郩鄀醢鋐鍩鍰锘锾随隓隓餙餚髄鯑鰀鰙鵗鶢㐛㕁㖁㛓㟓㣪㧞㬊㮁㮋㹷㾙䁔䈐䈠䐘䖃䖃䖃䖷䛥䟦䤀䤭䮎𠋠𠌁𠎴𠙆𠙏𠜗𠥤𠨚𠫷𠳈𠴈𠴳𠴷𡈉𡮱𡯤𡯮𡶱𡺆𢂛𢉳𢉸𢓬𢛘𢜹𢫿𢬾𢳭𣇸𣑆𣱬𣹙𤃽𤉶𤎦𤐳𤚁𤤣𤲫𤷤𥏕𥔛𥭘𦂍𦃣𦅻𦇻𦑛𦑽𦕹𦖁𦖵𦩮𦫦𦳉𦳩𦴈𦵁𧍗𧍷𧎙𧗫𧛭𧡩𧳐𧳭𧵧𧶖𧻶𧼡𨌆𨓇𨔳𨗑𨡂𨡜𨫿𨵫𨿕𨿛𩊽𩋫𩏅𩒽𩓘𩔃𩡏𩭉𪄘𪊭𪊱𪌹𪖥𪖪𪘓𪘡𪘱𪝘𪰧𪲴𪴰𪻷𫄨𫇜𫈈𫏖𫏺𫕉𫢦𫣰𫧲𫨖𫭊𫭔𫮊𫲩𫳌𫹇𫾼𬁆𬋪𬋫𬒨𬒲𬗤𬟂𬥢𬭎𬮶𬳁𬷚𬺇",
 "巾": "俙唏唰嬵悕懘晞桸檰欷浠涮溮烯狶獅琋瑡瓻睎矊稀篐篩絺脪莃蒒薓螄豨躛郗餙鯑鰤鵗鶳㒙㛓㟓㰃㹷㾙䖷䛥䤭䮎𠎴𠜗𠨚𠴪𠿷𡄎𡟪𡠋𡯶𢓬𢤔𢥅𢬾𢯍𢲐𢵴𢷃𢸼𣞂𣟉𣟡𣱬𣺎𣿸𤂗𤐛𤢻𤷯𤹌𥌹𥭘𥲳𥶽𥷏𦖁𦸱𦾦𧀱𧃃𧎙𧏍𧔽𧜂𧲔𧲝𧲞𧳐𧶖𧻶𨇙𨓇𨘬𨡂𨮨𨿕𨿛𩊽𩒽𩥐𩦔𩭉𩮭𪄜𪌹𪖥𪖪𪝜𪪀𫄨𫆺𫑺𫔹𫹇𫽔𬄁𬉈𬊄𬊢𬑧𬞻𬡴𬩼𬬃𬮶𬯓",
 "大": "俣募咲喬嗥嗯嗼墓娱嫫寞幕幙悮慔戣掷揆摁摦摸摹擲暌暤暮暯朕栚楑槔槣槬模檹氁洖浂淏渕湀滜漠漪烪煾猤獆獏瘼皞眹睽瞙祦筽糢縸羇翱脵膜茣葵蒽蓦蓭虞蜈蟆蟇蠎襻誤謨謩误谟豓貘踯躑送郑鄈鄚鋈鋘鍨鏌鑻镆関闋阕饃騤驀骙鬕鷎麌㖔㗐㗛㟸㧷㨳㩑㪪㱳㵹㶺㷬㻍㿁䄏䅰䆨䔌䙆䙣䜰䠏䣗䤆䫧䮬䳫𠈪𠊾𠢓𠴎𠹻𠻚𠾹𠿓𡀵𡂩𡂸𡎝𡏾𡖶𡗺𡝩𡞳𡟯𡟷𡟻𡠜𡢭𡮜𡼋𡼭𢃯𢇎𢑌𢑣𢕗𢕠𢚺𢜂𢜽𢞋𢞖𢞴𢟽𢣓𢤜𢨃𢬈𢮚𢰃𢲑𢷔𢺏𣉉𣉧𣓎𣔽𣚖𣝚𣦌𣨘𣩎𣯳𣵗𣵞𣵽𣷃𣺈𣺍𣾍𣿾𤀽𤄾𤑷𤣀𤨒𤨥𤨦𤪄𤬉𤬢𤬣𤶕𤹕𤺃𤾄𥊘𥒆𥕓𥜁𥜳𥡅𥡸𥧰𥯫𥰧𥱀𥱄𥱹𥻷𦃉𦌰𦗞𦝢𦟑𦟦𦣍𦨳𦪌𦰚𦷤𦸒𦹪𦺽𦺾𦿉𧀿𧃊𧅌𧆙𧍜𧍦𧏣𧒳𧓸𧜕𧝚𧠽𧡫𧨶𧪮𧫥𧱺𧷸𨁇𨃖𨄾𨅳𨇕𨎀𨓵𨛴𨢢𨧐𨪜𨹙𩀁𩄻𩆣𩇺𩌧𩐄𩐍𩐖𩐻𩔆𩕲𩜸𩣻𩳝𩷯𩷵𩹍𩻁𩼭𪁕𪁾𪅐𪍤𪎤𪏟𪝡𪝣𪠫𪣡𪩊𪩑𪪙𪮓𪲿𪵜𪶇𪶲𪷂𪷼𫂪𫃭𫄲𫈻𫉌𫏥𫑁𫑯𫔩𫕀𫚾𫛎𫛼𫣆𫧨𫫡𫫹𫫼𫬷𫯉𫶓𫹠𫻀𬀲𬃼𬄠𬅈𬆬𬉀𬎇𬑤𬑪𬓒𬕓𬚻𬝫𬞔𬞣𬞿𬡪𬦙𬨦𬩂𬬄𬭌𬮦𬸢𬹍",
 "丷": "俤偋偐僔剃剷喭噂嚺墜壿娣嬘嶟幈悌挮摌摒撙擿旞晜梯楌樽橂檖涕滻澊澻焍燇燧珶璲瓋睇磸礈祶禭稊穟竮竴箳簅綈繜繸绨罇罤蓱蕕藡虄襚諺譐譢讁豑豒蹲递遃遵鄭銻鎹鏟鐆鐏鐩锑隡隧霶顔颜餸鬀鮷鱒鳟鵜鷷鹈齴㖒㞟㣢㦃㮳㮸㯆㰅㴨㶜㶜㸂㽀䉌䍁䏲䑯䓲䔊䔹䔿䡵䥖䥙䬾䶏𠖔𠝭𠥙𠦳𠪝𠾔𠾕𡂓𡌡𡑖𡑞𡒱𡟛𡡦𡣛𡣪𡥩𡩵𡰙𡳧𡼓𡽲𢅕𢔧𢚖𢞆𢢊𢢋𢢕𢢝𢤊𢤪𢤸𢱘𢱤𢲂𢴎𢵌𢵫𢵲𢷊𢸈𢸑𣄚𣋥𣋥𣖕𣜹𣞅𣞊𣸥𣸹𣾇𣾶𤁷𤋊𤎩𤏢𤑦𤡽𤢼𤧅𤫼𤭌𤭸𤮐𤯿𤻄𥂴𥊭𥊽𥖁𥖐𥖾𥢎𥧋𥰅𥳢𥳰𥴕𥴦𥺀𦂤𦅆𦅭𦉇𦉐𦌚𦝷𦞎𦠵𦢴𦪚𦯔𦷴𦼯𦽈𦾭𧀾𧁕𧁱𧃐𧃣𧋘𧒆𧟁𧩱𧭚𧯪𧳋𧳼𧴉𧸙𧼲𨁃𨂲𨃗𨃵𨅷𨆏𨍍𨔧𨗎𨗖𨞀𨣆𨣢𨫇𨮹𨱔𨷃𨹥𨼾𨽎𨽵𨿘𨿝𩅥𩈁𩍚𩐌𩓂𩠌𩩷𩯄𩽞𪁩𪇪𪑰𪒛𪕧𪖦𪝝𪞄𪥡𪦎𪨚𪨛𪩩𪫃𪬸𪳹𪶜𪷄𫂫𫄔𫆸𫆼𫌎𫍓𫑼𫜄𫜮𫤜𫤢𫧄𫫹𫮗𫯖𫯙𫱧𫱵𫵥𫵨𫶈𫸽𫺫𫺬𫻆𬀹𬁨𬂑𬉘𬊰𬑳𬖄𬖪𬚥𬛘𬛝𬝤𬟀𬟌𬡜𬤢𬩄𬭼𬯚𬲝𬲻𬴤𬶕",
 "弔": "俤剃娣悌挮晜梯涕焍珶睇祶稊綈绨罤豑豒递銻锑鬀鮷鵜鹈㖒㣢䏲䑯䬾䶏𡌡𡥩𢚖𣋥𣋥𣜹𤫼𤭌𥊽𥺀𦯔𧀾𧃣𧋘𧯪𧳋𧳼𧴉𨁃𨹥𨿘𨿝𩓂𩽞𪁩𪕧𪖦𪫃𫤜𫸽𬀹𬑳𬡜𬲻𬶕",
 "⺅": "俯哗嗬捬摍晔樎烨焤硴縮缩腐腑蒊蒞蓿藵蟘誮贋贗赝蹜錵鏥铧骅㗾㜚㟆㬸㳸㴼㷳䈹䑿䒀䮛𠍊𠝐𠵅𠹎𠿹𡃌𡍃𡠞𡪴𢉶𢊒𢊾𢋩𢰆𢳔𣁙𣒑𣖝𣘧𣩇𣩐𣻜𣾀𤂮𤎝𤏚𤑤𤛝𤦙𤰏𥀝𥕯𥮯𥲛𥼍𦝗𦟱𦟸𦠱𦱖𦲱𧐴𧨽𧹋𨁵𨟨𨢲𨣡𩋖𩐼𩘰𩥿𩷺𩸅𪆒𪉊𪩻𪪠𫈪𫋌𫍑𫎃𫔊𫖇𫙳𫚘𫢮𫪿𫫠𫫸𫰡𫺆𫺿𫼧𬄋𬆌𬊠𬑓𬒡𬡭𬦷𬧧𬩑𬪚𬫰",
 "寸": "俯偫儔嚋嚩嬦崻嵵嶹幬幮懤捬擣榯檮櫉櫥溡濤焤燽燾璹疇礡禱簙簿籌翿腐腑蒔薄薅薵譸躊躕軇醻鑄隯魗鰣㦞㩐㶁㹗㿒㿧䊭䌧䒀䥬䪇䬞䮛䮻䲖𠠐𠸤𠺮𠽢𡀗𡍃𡕐𡕑𡠞𡮲𡻄𢉶𢊾𢰆𢱜𢸗𣀓𣀘𣋬𣖖𣘧𣙦𣝍𣝷𣟪𣤫𣩇𣫐𣹘𣻜𣻞𣽡𤋵𤒔𤒛𤒵𤘀𤚟𤨅𤲵𤴆𤸟𥌆𥖲𥢜𥪸𥮯𥱯𥲛𥴮𥻣𥻵𦃀𦅯𦏟𦝗𦞒𦡰𦡴𦦰𦦾𦱖𦲱𦵟𦺉𦼭𧂭𧈙𧎋𧨽𧶱𨁵𨃉𨃌𨃯𨅸𨆼𨞪𨟢𨨲𨫉𨬻𩅿𩆩𩏯𩕯𩯦𩷺𩸅𩹭𩼬𩽔𪃝𪇘𪕵𪪠𪮛𪰰𪻋𫁧𫂨𫄋𫇠𫋤𫌗𫎃𫓆𫙳𫮨𫴶𫹦𬌦𬠟𬫰𬰈𬰯𬵣𬶹",
 "亠": "俲偐傚僦儃凛凜剷勯勶喭噈噋噿嚆塾墪嬗巐幜廓廩廪影憝憞憬憱憻懍摌摛撉撔撴擅擿旜暻暾楌槨樆橔檀檁殧氈氊滧滻漓漷潡澋澟澶濢瀥熟燉燝燣燺獤瑬璃璟璮璻瓋癛皽瞝礅礮篱簅縭繵纐缡膵膻臎蓅蓠蔬薃藁藃藡藳虄螭蟺褵襢諺謧譈譠讁蹴蹵蹾遃邅醨鎏鏟鐓鐛鐜镦隡離霩霶鞹顔顥顫颜颢颤饘驐驙魑鱣鳣鷲鷻鸇鹫鹯麶黐齴㔀㔊㗥㘐㠇㣶㦃㨯㩆㬑㬿㯆㯜㰅㰏㵏㷰㻻䁨䁴䃞䃦䃪䄜䄠䅻䆄䉡䉰䍠䔻䕊䕜䕧䡀䥋䪃䬜䭘䯫䯬𠆞𠋩𠌯𠎄𠎠𠏟𠑱𠓎𠘉𠘐𠘡𠙟𠦳𠹽𠺖𠺡𠺩𠻗𠼵𠿞𠿷𡀢𡀫𡀬𡀲𡁞𡂀𡂓𡃥𡄁𡅹𡆎𡏬𡐹𡒱𡓣𡗋𡙰𡡬𡣝𡣪𡰏𡳥𡴥𡻙𡻳𡼁𡼖𡼩𡼮𡽝𡽲𡾘𢀍𢀮𢅒𢇔𢋃𢐹𢐻𢑎𢒬𢞆𢟢𢢋𢢒𢣃𢣆𢤈𢤊𢥲𢮰𢱘𢱙𢲧𢵲𢶸𢷃𢷆𢸈𢸑𣀦𣉽𣋊𣌚𣘃𣝏𣝦𣝩𣦤𣩸𣯤𣱭𣸥𣹭𣿈𣿸𤀰𤁲𤁷𤂗𤂸𤅝𤎼𤏅𤐛𤑦𤑴𤗫𤜀𤜃𤟋𤡢𤢏𤢤𤢨𤢼𤮜𤯑𤯿𤸺𤺺𤻒𤼞𥂣𥂦𥋆𥋓𥋶𥌲𥕖𥕮𥖉𥖮𥖾𥤁𥧕𥫉𥮕𥰤𥳛𥷛𥷼𥻿𥼷𥽄𦃮𦅡𦏧𦒜𦔓𦗒𦞎𦟍𦟸𦠢𦠦𦡣𦢵𦪔𦶢𦹐𦼸𦼹𦽑𦽨𦾡𦾭𧁱𧂎𧂕𧃐𧄥𧅐𧅯𧑊𧑒𧑙𧔫𧝋𧝗𧫾𧭺𧴁𧾍𨄡𨅇𨆁𨇂𨎎𨎹𨐮𨝏𨟍𨢟𨢶𨣚𨭖𨮍𨮹𨯢𨰩𨰯𨲵𨲷𨶝𩀻𩁉𩆐𩇆𩉊𩍕𩐿𩙣𩙼𩥬𩦔𩦗𩩷𩫠𩫧𩫨𩫩𩫫𩫭𩫯𩫰𩫱𩯤𩱢𩱱𩷠𩻱𩼤𩽱𪃂𪅆𪅪𪆃𪆝𪆣𪆩𪇪𪈃𪈶𪒔𪓼𪖂𪙵𪛀𪜟𪝬𪢟𪣫𪤋𪦎𪦝𪨃𪬸𪯞𪱩𪴍𪷤𪸉𪹲𪺀𪼝𫀥𫃏𫄃𫄆𫄊𫄔𫆺𫆼𫈺𫉡𫉿𫋉𫍓𫎢𫐝𫑾𫓚𫓜𫔑𫔹𫖧𫗴𫘰𫙤𫜮𫣦𫤢𫦜𫦢𫩽𫫂𫫩𫫹𫬎𫬛𫬮𫯙𫲃𫶜𫹨𫽔𫾒𫿝𫿠𫿣𬀞𬂑𬄣𬄼𬆜𬆸𬈰𬉈𬉕𬉘𬊢𬊰𬓞𬓟𬔂𬖄𬙉𬚧𬛝𬞚𬞞𬞩𬡳𬤣𬪙𬳑𬶱𬷶𬸫𬸴",
 "父": "俲傚滧礮纐㘐䉰䕧𠙟𤟋𦽨𪛀𫹨",
 "上": "俶傶嘁婌寂惄慼慽掓摵椒槭淑琡督磩縬菽裻諔踧蹙錖鏚顣㗤㞝㾥䗩䙘䠞䱙𠗼𠴫𡄱𡠽𡹧𡻕𡻷𢃝𢉌𢖌𢛼𣈉𤂔𤟏𤠽𤨟𤬂𥀻𥁽𥉷𥓍𥚔𥟧𥺤𥺱𥼀𦄉𦈚𦟠𦪊𦸗𧇝𧐶𧞰𧡕𧫳𨇌𨧷𨺏𩖑𩥼𩾈𪔯𫃬𫖹𬆷𬟄𬭭𬴈",
 "夂": "倃偺喀喒履巙愘愙揝揢搁摓撂擱晷楁槰樥櫊櫜漨潞澓熢璐癁碦篷簬簵糌綹縫绺缝膖落葰蓤蓬蔆蕗蕧薐虁蠭躨鎽鏠鏴露韼額额髂鬔鯦鷺鹭麔鼛㑼㟯㠅㡝㦀㨼㨿㯝㰶㷨㷭㹾㻱䈗䈷䉄䌎䓘䔖䗦䗬䘔䙜䛮䡫䨱䩼𠓀𠠩𠴰𠸧𠸪𠺝𠺴𠻐𠻱𠽁𡀔𡁤𡂅𡅒𡅦𡏹𡐯𡡷𡪞𡫥𡫥𡬚𡬚𡬚𡲣𡹷𡺿𡻀𡻴𡻹𡼆𡼹𡽘𢁋𢆃𢕝𢜥𢷅𢾏𣊑𣍚𣓌𣗏𣗛𣣟𣺿𤁐𤃔𤓤𤓤𤢊𤮗𤯲𤷑𥂌𥊒𥎌𥛝𥜶𥢑𥨍𥮑𥯚𥯛𥱿𥳇𥴣𥴽𥵩𥻀𥻞𥽴𥽴𦂦𦌕𦓉𦜵𦝣𦪎𦼊𦾌𦾹𦿪𧀝𧅄𧇡𧇤𧌰𧏢𧐣𧐯𧒌𧒍𧔧𧕌𧖼𧜨𧠅𧴂𧸚𨂥𨃶𨆿𨍇𨎟𨎠𨎲𨕱𨫭𨫱𨫳𨲫𨷀𩁐𩁗𩅛𩆑𩋽𩌲𩙹𩤩𩥪𩦼𩪌𩭽𩹃𩹕𩹿𪃕𪃭𪄎𪅅𪅋𪆬𪆽𪍞𪔲𪘺𪛅𪟰𪡟𪦫𪧒𪩄𪭆𪮔𪮘𪳅𪳖𪶠𪻽𪼇𫁫𫃶𫄉𫋍𫌛𫏾𫑓𫒴𫓍𫘘𬹜",
 "卜": "倃偺喒揝晷櫜糌綹绺鯦麔鼛㰶㹾䓘䛮𠴰𡅦𢜥𣓌𤷑𥢑𥮑𥻀𦜵𦟺𧖼𫫔",
 "月": "倄傰傰剻剻喐嘣嘣堕崤擝攍椭橗殽淆漰漰瀛灜磞磞籝籯繃繃蒯蒯誵蹦蹦郩鏰鏰镚镚随餚髄㜲㬯㮁㮋㱻䃷䌱䌴䑉䕦䙖䙖䣙䣙䯁𠴳𡅌𡡈𡡈𡤃𡰠𡺆𢅆𢐒𢐒𢛘𢜹𢥣𢺆𢺑𣟅𣠾𣹙𤀄𤃽𤉶𤎦𤐳𤚁𤷤𤼘𦡉𦳉𦳩𦵁𦷛𦷛𧂡𧕳𧼡𨔳𨞚𨡜𨯤𨰊𨰠𨻱𨻱𩡏𪘱𪝘𪮤𪮤𫂯𫄁𫅛𫅛𫉣𫊊𫗻𫨁𫨖𫮙𫮙𫾼𬄡𬄡𬄳𬄳𬏾𬗤𬝡𬞉𬞉𬠫𬳁",
 "夕": "倇偧偧剜啘嗲嗲婉帵惋惌捥晼椀橠橠涴焥熪熪琬畹睕碗箢簃簃綩腕菀葾蜿謻謻豌踠鋺鵷黦㒅㒅㢋㢋㤪㱧㿐㿐䃎䃎䋾䋾䐒䐒䑱䔟䔟䗕䘼䛷䝹䡝䩊䩩䯛䵙䵙䵫𠗺𠗺𠝓𠝓𠞎𠞎𠞚𠼪𠼪𡏗𡏗𡟃𡫦𡮄𡸥𡻣𡻣𢄴𢄴𢏿𢡏𢡏𢮘𢱽𢴐𢴐𣔢𣔢𣘵𣘵𣫼𣸱𣻗𣻗𤄮𤄮𤗍𤟊𤧌𤷧𥔙𥟶𥟻𥟻𥧉𥪫𥪫𦠸𦠸𦰿𦰿𦴟𦺲𦽭𦽭𧐹𧐹𧚤𧚤𧛧𧛧𧩀𧩀𧩫𧩫𧩷𧯳𧳤𧳤𨄼𨄼𨉝𨎭𨎭𨖨𨖨𨪓𨷎𨷎𩈱𩎺𩘖𩘖𩣵𩪝𩮅𩮅𩸩𩸪𪂄𪂄𪂦𪂭𪅨𪅨𪋅𪝔𪦕𪦕𪮟𪮟𪲤𪵌𪵌𪷔𪷔𫒬𫒬𫦗𫦗𫪥𫪥𫺲𫺲𫽎𫽎𬓅𬓟𬓟𬕰𬘲𬘲𬜶𬲢𬲢𬳞𬶝",
 "㔾": "倇剜啘婉帵惋惌捥晼椀涴焥琬畹睕碗箢綩腕菀葾蜿豌踠鋺鵷黦㤪㱧䑱䗕䘼䛷䝹䡝䩊䩩䯛䵫𠞚𡎊𡟃𡫦𡮄𡸥𢏿𢮘𢱽𣔶𣫼𣸱𤗍𤟊𤧌𤷧𥔙𥟶𥧉𦺲𧍙𧩷𧯳𨉝𩈱𩎺𩣵𩪝𩸩𩸪𪂦𪂭𪋅𪝔𪲤𬓅𬜶𬳞𬶝",
 "八": "倊倯傟僿凇嗡噻崧嵡庺彛彜慃捴攐攓暡棇棻淞渷湓滃滚瀽焧瞈硹磙簺総菘葐蒶蓊蓘藆虋蜙螉諡鎓鑳鬆㖹㘔㟣㥖㥹㧳㨣㨰㩙㩟㩷㮬㺋䈵䐋䐥䓗䘴䙂䙭䜇䤈䩺䮿䱵𠏯𠏶𠐻𠽱𡄓𡅶𡍆𡍻𡎛𡑮𡙢𡚋𡝱𡤐𡨭𡬉𡹳𡻐𡼌𡾰𢃓𢃪𢑱𢔋𢚅𢛒𢞂𢠈𢡙𢮈𢯻𢱔𢷘𣔄𣕙𣟋𣟗𣟯𣱦𣴞𣶼𣸜𤀕𤌏𤕃𤘊𤦦𥁳𥂾𥕀𥜴𥯆𦒥𦝅𦫫𦮪𦯀𦯲𦯳𦰛𦳆𦶚𦸍𧀲𧃕𧌻𧛹𧝱𧞼𧟑𧮈𧮎𧷨𨇥𨉺𨙇𨜺𨧼𨰬𨺥𩃭𩃼𩄘𩎀𩏈𩔚𩘍𩠵𩡉𩡓𩮬𩸂𩸝𩽜𪁿𪂽𪄑𪝕𪠎𪨄𪩋𪪷𪫱𪬲𪬼𪴱𪷪𪷱𪸋𫃄𫄐𫉲𫎤𫕎𫕧𫪝𫬐𫺦𫺾𫽡𬃠𬊼𬓵𬙺𬢶𬤯𬥣𬥬𬥮𬥯𬫱𬭩𬱇𬴏𬸔",
 "屮": "倔啒崛崫掘曓淈煀窟糶誳镼鶌㞊㬥㬧㭾㱁㻕䄐䓛䘿䞷䠇䳳𠑔𠜾𠞀𠡰𠶯𠷅𡅜𡮍𡰇𡺴𢏷𢱝𢱞𢿆𣖠𣙸𣣃𣨢𣮈𤋿𤟎𤭽𤺅𥇣𥏘𥚋𥛁𥜱𥨒𥪊𥮝𥺷𦁐𦃒𦜇𦿎𧌑𧑎𧸆𨜿𨧱𨱊𨵡𨻍𨾀𩋎𩓦𩣹𩤓𩭪𪍾𪓾𪘳𪛐𪥕𫍮𫛵𫵀𫵢𬘼",
 "土": "倜偫僥僥僮兣凋勎勢勭啀啀啁啩啩喱喹喹嗑嘢嘵嘵噇噠嚡嚡圔埶堼堼墅奝娾娾婤嬈嬈崕崕崖崖崶崶崻嵵嶢嶢嶤嶤幇幇幢幫幫廅彫徟徸徺徺惆憢憢憧捱捱掛掛搕摆摰撓撓撞撻晭暬曈曉曉朣椆楏楏榯榼槷槸樾橈橈橦橽氃涯涯淍淕湗湗湹溎溎溘溡漥漥潼澆澆澾灎煃煃熆熱燅燑燒燒燵犎犎獞獟獟琱琺甅疃皗皢皢睚睚睦睭睳睳瞌瞳碉磕磽磽禂稑稠穘穘穜窪窪竰篈篈篕篞籈糎糧綢緾繞繞繨绸缠罫罫罿翢翹翹脚膮膮艟葑葑蒔蓋蓌蓕蓕蓗蓤蓺蔆蕘蕘蕫薐薘薶薽蘳蘳蜐蜩蝰蝰蟯蟯蟽裯褂褂褹褻襓襓調譊譊调豔賘賙赒趬趬踋踛蹱蹺蹺躂輖週逵遳遶遶郮醘銩錭錴鍅鍷鍷鎑鐃鐃鐘鐽铥闔闥阖陸隢隢雕霌霾鞤鞤韃顤顤饁饒饒騆驇驍驍髐髐鯛鯥鰣鰪鱙鱙鲷鵰鵱㑢㒓㓐㓮㔩㕎㙯㚁㚁㚁㚁㚋㚝㚝㛬㛻㛻㜂㜂㜇㜇㟘㠉㣵㤼㥣㥣㥨㥨㥺㦟㨄㨍㨍㨒㨒㩐㯧㯼㰊㷱㹓㹓㺚㼿㾡㿐㿹䀷䁱䁱䂌䂲䂶䃥䃮䆹䉄䋽䋽䎻䐦䓟䔆䔖䕭䖼䗘䙓䚒䜁䜁䝑䝽䝽䞇䞴䠑䠑䡜䡴䣑䦢䧓䨟䨟䫦䭚䮵䯾䰫䰫䱳䴀䴃䴃䶧䶧𠁺𠄳𠊎𠊎𠎢𠏠𠏠𠓘𠓘𠙣𠝥𠝥𠟋𠟋𠟍𠡬𠡬𠢩𠢩𠥕𠨙𠨦𠨪𠨪𠪆𠪆𠪑𠲍𠲵𠳞𠳷𠵐𠵽𠶔𠶰𠸤𠹤𠹤𠹯𠺮𠺺𠺺𠻀𠻱𠾲𠾸𠿣𡀗𡁻𡂞𡅍𡅍𡈦𡈦𡈩𡎈𡎈𡎐𡎻𡏖𡏹𡑆𡓖𡓖𡕄𡕐𡗉𡗉𡗊𡗊𡙔𡙔𡝔𡠦𡡷𡥱𡦜𡦝𡨱𡨱𡪩𡪩𡪸𡫑𡭀𡭀𡭄𡭄𡮚𡮛𡮲𡰒𡰕𡸳𡸳𡺉𡺿𡻄𡻊𡻴𡼹𢁋𢃖𢄍𢄢𢅄𢅮𢌇𢑫𢖜𢛄𢛄𢛇𢝍𢟆𢟗𢠪𢠪𢢳𢨒𢩘𢫻𢬱𢭙𢯅𢯑𢯖𢱜𢲛𢳊𢴸𢴽𢴽𢵒𢵼𢸋𢸧𢸱𢹤𢺂𢽧𢾩𢿣𢿣𢿲𢿲𣄛𣄢𣉳𣊹𣊼𣍕𣍕𣍚𣍼𣒗𣓇𣓇𣔦𣔦𣔭𣕁𣕁𣖖𣖵𣘊𣘓𣙦𣛀𣠎𣠎𣣹𣤶𣦥𣦥𣩄𣩦𣩦𣫁𣫁𣹘𣺺𣺽𣻞𣻾𣼫𣾼𣿞𤀢𤁄𤄢𤋵𤌒𤌒𤍓𤍽𤎮𤎲𤏝𤚟𤠡𤡒𤦐𤦐𤨅𤩊𤩊𤩔𤭝𤮅𤲵𤴀𤴀𤸟𤸭𤸱𤹒𤺄𥀂𥀂𥂇𥃕𥉖𥉖𥉯𥉯𥋈𥋈𥏨𥓪𥚊𥛐𥜡𥡩𥢜𥦛𥦛𥧟𥧟𥪢𥪯𥪯𥪸𥫂𥫎𥮐𥮱𥯅𥯅𥱯𥱰𥲎𥳘𥺝𥻣𥻵𦀖𦁊𦁊𦁩𦁩𦁪𦂌𦂌𦃀𦄇𦅅𦅯𦅲𦇇𦇇𦈺𦉗𦉗𦌜𦒍𦒏𦒏𦒒𦒒𦔏𦔛𦛕𦝌𦝎𦝟𦞒𦠶𦡯𦩍𦪂𦪛𦪛𦪭𦲒𦲒𦲾𦴵𦵟𦶄𦸐𦹼𦼊𦼛𦽂𦿋𧃳𧄚𧅔𧅩𧇟𧇦𧋤𧌉𧍊𧍊𧎋𧐓𧑅𧑆𧑣𧑣𧘂𧛜𧛜𧛾𧜼𧝎𧞅𧞙𧞴𧟼𧟼𧡋𧡋𧡞𧡞𧢏𧢏𧢬𧢬𧪞𧫉𧫉𧬤𧬻𧮻𧯼𧰟𧳜𧶱𧸌𧽆𧽇𧽈𧽿𨂉𨂉𨂊𨂷𨃉𨃌𨃝𨃯𨅸𨅿𨇎𨇵𨇵𨉜𨊅𨊅𨌞𨍰𨎐𨎬𨎬𨕍𨛀𨜴𨝯𨞬𨡑𨣒𨤲𨤸𨤺𨦲𨨤𨨲𨩥𨩥𨫈𨫉𨫭𨬓𨬻𨴿𨵗𨵗𨵠𨶻𨷁𨷁𨸍𩀸𩀸𩇠𩈮𩋔𩋔𩋙𩋮𩋮𩌍𩍅𩕉𩕜𩗪𩞯𩞺𩟐𩟨𩦍𩪪𩮞𩮨𩯆𩯆𩯬𩳴𩳴𩹭𩺩𩻡𩼆𪁍𪂚𪃝𪃤𪃤𪅋𪆏𪆧𪋥𪏎𪑭𪑭𪒥𪔮𪕵𪘖𪘬𪘬𪝙𪞢𪞢𪞭𪞭𪠐𪠐𪠱𪤄𪦇𪦇𪧢𪧳𪫚𪫸𪬨𪭽𪮛𪰰𪱰𪳴𪴹𪶏𪶔𪶔𪶙𪶙𪶶𪷑𪷭𪷭𪸊𪸊𪸱𪸷𪸼𪺾𪺾𪻧𪻵𪼊𪽘𪽝𪽸𪾁𪾞𫁂𫁧𫂨𫄋𫄦𫇤𫊐𫊐𫊒𫊒𫋦𫌐𫍼𫎼𫎽𫐏𫐔𫐬𫑕𫑮𫒄𫓉𫔆𫙌𫙌𫛲𫝿𫡧𫤣𫤣𫤦𫤦𫦺𫦺𫨾𫨾𫩆𫮀𫮈𫮛𫮨𫴍𫴖𫶺𫶺𫸉𫸒𫹚𫹚𫹦𫽅𫽼𫾄𫾤𫾤𬀻𬁕𬁕𬃗𬃰𬃰𬅗𬇆𬇆𬈅𬉨𬋬𬌦𬎎𬎹𬏌𬏳𬏴𬐼𬓺𬓾𬙄𬙞𬛅𬞝𬠎𬠎𬠟𬤒𬥋𬩱𬩱𬪿𬫀𬫁𬫝𬫭𬬆𬭕𬮕𬮯𬮯𬮸𬰂𬰈𬴝𬴝𬴼𬵣𬵮𬷮𬷲",
 "女": "偃巍愝揠擞暥椻犩葌葌蒘蕠薮蘶蝘褗躽郾隁騴鰋鶠鷃鼴鼹㞜㰽㵈㵖䁙䉤䓸䓸䔀䕑䞁䤷䨃䭳䰋𠍾𠎪𠙤𠩨𠴂𠸎𠸯𠻈𡁕𡏉𡟖𡟗𡟗𡢹𡢹𡦤𡩷𡪻𡰀𡳵𡳶𡹶𡿁𢜲𢞙𢣮𢭵𢮫𢲋𣈿𣒢𣖹𣗈𣗤𣯄𣸏𣹐𣹤𣺂𣺾𤃠𤑅𤦵𤮌𤮒𤸻𥈔𥉛𥍻𥐈𥔌𥨧𥰪𥱮𥲘𥵳𦌈𦓌𦖧𦡢𦧃𦴴𦵚𦵭𦶳𦷸𦾎𧁟𧓱𧕞𧤨𧪅𧽉𨄖𨇷𨪶𨶁𨻂𩀀𩝺𩤦𩤦𩹽𪡸𪢒𪤃𪦈𪨞𪨠𪮴𪶨𫃸𫄄𫄌𫄑𫈘𫉅𫏙𫑦𫘫𫚢𫛇𫣫𫪢𫫵𫬝𫯅𫳣𫳣𫵫𫵭𫻂𫻈𫻍𬈗𬉆𬊨𬕥𬛠𬟗𬟛𬥺𬧇𬧗𬳛𬵤𬶩𬷸𬸘",
 "开": "偋幈摒竮箳蓱㶜㶜䔊𠝭𡟛𡳧𢔧𣕭𣖕𣸹𤋊𤧅𤭸𥧋𥰅𦂤𦉇𦉐𦝷𧁕𧟁𧩱𧼲𨂲𨍍𨔧𪑰𪨚𪨛𪶜𫵥𫵨𫶈𫺬𬖪",
 "卄": "偏匾媥徧惼揙斒楄煸牑猵甂碥稨篇糄編编翩艑萹蝙褊諞谝蹁遍鍽騗騙骗鯿鳊鶣㓲㞈㲢㴜㵸㻞㼐㾫䐔䡢䭏𠪂𡺂𢉞𢐃𢩚𢩟𣝜𣩀𣸎𤬊𤺇𥚹𥣝𦑮𦖥𦳋𦽃𧡤𨖠𨲜𩴄𪉱𪏗𪓎𪖯𫂜𫕆𫕌𫨘𬡫𬩢𬸜𬸸",
 "厂": "偐儮剷喭嘊嚦婩摌攊楌櫪滻漄瀝爏瓑癧硸礰簅藶虄諺讈轣遃錌鏟隡靂顔颜齴㠣㦃㯆㱹㺡㿨䍥䘈䟐䥶䮗𠊀𠘟𠠝𠦳𠫏𠵚𠽎𡤌𡫯𡳸𢍷𢖙𢞆𢢋𢤩𢮹𢱘𢵲𣀥𣌜𣸥𤁋𤃹𤄆𤖢𤘃𤟉𤯿𥊅𥌮𥍛𥗠𥤀𥨻𥷒𦇔𦘊𦝈𦞎𦪾𦹹𧄚𧔝𧞿𧰡𧴠𨇗𨊛𨖭𨘸𨟑𨟟𨣷𨲊𨷦𩓤𩙖𩩷𩭢𩯺𩽏𪂢𪓀𪖍𪗁𪙽𪦎𪬸𪶐𫄔𫇀𫌕𫍓𫜮𫤖𫤢𫫹𫮸𫯙𫶂𫾐𬂑𬊰𬓀𬖄𬛝𬴁",
 "止": "偨喍嘴嚬惩晸橴濒瀕蘋蟕鎠靋顰颦騭骘㓻㖢㗏㗪㟵㰋㾚㾹䈣䌉䓱䔝䠕𠉃𠐺𠟓𠹂𠽷𡍥𡎵𡓟𡤉𡬺𢉪𢋀𢌪𢱉𢱫𢳴𢾘𣀚𣒽𣓄𣔥𣖍𣖧𣖨𣖲𣗵𣚀𣚁𣣊𣦐𤃓𤌗𤟷𤠌𤣙𤭺𤺒𥈐𥓽𥪛𥲕𥷎𦄙𦇖𦋳𦲵𦶉𦶼𦸺𦺱𧁎𧄻𧅵𧔪𧡰𧩢𧭹𧭽𨂿𨄐𨏞𨝳𨨨𨽗𩠰𩸵𪑽𪘿𪣴𪪀𪬰𪰱𪳠𪴻𪴽𪹈𫂊𫄕𫊉𫍐𫙾𫣀𫤎𫫾𫭁𫵙𫶡𬀔𬆆𬈶𬎏𬜚𬞟𬠭",
 "匕": "偨喍喞嘴埿巓擺擺橴灪爩矲矲羆羆藣藣蟕襬襬髒㔥㔥㖢㗪㥡㰜㴯㵃㾚㾹䆉䆉䎱䎱䓱䔝䖇䠕䥯䥯𠉃𠐌𠐌𠟓𠤩𠤩𠸽𠹂𠽷𠿺𡃊𡄊𡌰𡍥𡎵𡓁𡓁𡓈𡯀𡳹𡳹𡿥𢅩𢅩𢉪𢋀𢛜𢤛𢤛𢸇𢸇𢺴𣒽𣓄𣖧𣖨𣖲𣚀𣚁𣞻𣞻𣣊𣵻𣶫𣿉𤁣𤁣𤃫𤓮𤠌𤳷𤳷𤳸𤳸𤺒𤻩𤻩𥈐𥍇𥓽𥗎𥘄𥲕𥶓𥶓𥺜𦌲𦌲𦪼𦰫𦱆𦲁𦶉𦸺𦺱𧀛𧀛𧞞𧞞𧩢𧭽𨄐𨇑𨇑𨝳𨫯𨮳𨮳𨯀𩃱𩋪𩎼𩖎𩙛𩦦𩸦𩸧𩾆𪂊𪈘𪑽𪓊𪖻𪘕𪘿𪠔𪣮𪪀𪬰𪳠𪳳𫄕𫆻𫏯𫔒𫔒𫙾𫛖𫛖𫬘𫬘𫱥𫳷𫶞𫻕𫻕𬁉𬈒𬈤𬈶𬉚𬎏𬐥𬑦𬘊𬘊𬘸𬛑𬝙𬠭𬠶𬭿𬵽",
 "二": "偿囈恸曇橒澐繧蕓襼讛陰霒霕霴霼靅靆靉鲿䉙䨭䨺䨺䨺𠱌𡂃𡄬𢵆𢺐𣊯𣡊𣦀𣶽𣸊𤳟𤷜𥖅𥢚𦁌𦓷𦜲𦶮𧅟𧅟𧬞𨗠𨝽𩃠𩃷𩃸𩅝𩅣𩅾𩆦𩇔𩇔𩇔𩇔𩸜𪆚𪒝𫝚𫢙𫬤𫰼𫶮𫾓𬎌𬎬𬰎𬰨",
 "虍": "傂嗁嚹囐巘巚搋榹歋滮瓛磃禠篪籧蘧螔褫謕讞贙贙蹏遞钀饕鷈鷉鼶齾㔸㘌㙱㡗㥴㩬㩵㴲㶁㾷䖙䚦䞾䡾䫢䶵𡃰𡏚𡔎𡾠𡿕𢊀𢐋𢸗𣜍𣜵𣡌𤁴𤅊𤩭𤫣𥗌𦉧𧖃𧜺𧰑𧷠𨏾𨪉𨻆𩀗𩤽𪕻𪚋𪷢𪺉𫇉𫿈𬧌𬩃",
 "耂": "储儲嘋嘟奲廜撦擆曙橥櫡櫧櫫漖潳潴濐濖瀦糬蕏薯藷藸蠩譇躇鐯鱪鱰鷵㒂㦋㵔㵭㶆䃝䃴䊰䠧䣝䦃𠍽𠏲𠤆𠤌𠪡𠹲𠾏𡄢𡣈𡤊𡪦𡳢𡳣𡳤𡼞𢄳𢅔𢋂𢠛𢥃𢵋𢵻𢷷𣃑𣌁𣌂𣌆𣚫𣛭𣜾𣞍𣠖𣠶𤀞𤐢𤒠𤺈𤻃𤻔𥌓𥖛𥗁𥢳𥲯𥳉𥵟𦅁𦅷𦇃𦠏𦡄𦺥𦼥𧒇𧬅𧬥𧷿𧸓𧹼𧺂𧺃𨅓𨅮𨇛𨇜𨗊𨟞𨣍𨬊𨮿𨶶𨼑𨽉𩅻𩼁𪋰𪖄𪢆𪦜𪱂𪱅𪲶𪳞𪳼𪴄𪹶𪻊𫉄𫊔𫞛𫧬𫫳𫬕𫰂𫶳𫷶𬁑𬄞𬄫𬍆𬍍𬍎𬙅𬛒𬟅𬟋𬟜𬠩𬤜𬦃𬦄𬦼𬩅",
 "吅": "傴僺剾劋匲嘔噪奩嫗嬠嶇幧彄慪懆摳操敺樞橾歐毆氉漚澏澡熰燥璪甌癌瞘矂繰缲膒臊蓲襙謳譟貙趮躁軀鄵醧鏂鐰饇驅髞鰸鱢鷗㩰㬽㿋䆆䆰䉱䌔䙔䡱䧢䩽䳼䵲𠄾𠢔𠥷𠥹𠥺𠥺𠿸𡩾𡬿𢄠𢕓𢤁𢷯𢻥𢻪𢿛𢿾𣀉𣀬𣂻𣉾𣋝𣎥𣜣𣞃𣩛𣰕𤛐𤠾𤢖𤹪𤼅𥀴𥍛𥕥𥖨𥱸𥷇𥼾𥽹𦗵𦾈𧒮𧬌𧴜𨄅𨯫𨽣𩀫𩆮𩔸𩙈𩙰𩟎𩯟𪍻𪍽𪠯𪤢𪴋𫉞𫑧𫚫𫤖𫥛𫧜𫧭𬇅𬑀𬤠𬤨𬵸",
 "𠆢": "僇剹勠嘐嫪寥嵺廖憀戮摎樛漻熮璆疁瘳磟穋繆缪膠蓼蟉謬谬豂賿蹘轇鄝醪鏐镠雡顟飂餮髎鷚鹨㬔㺒䚧䢧䰘䵏𠗰𠗽𡑁𢄪𢒥𣟇𣠼𣩍𣹗𤺋𤺼𥂔𥃃𥉾𥧯𥲿𦑬𦗖𦼛𦾂𧍿𧢋𨶪𩌭𩖇𩘷𪅡𪖷𪤗𪯖𫐖𫳚𬵩",
 "彡": "僇剹勠嘐嫪寥嵺廖憀戮摎樛漻熮璆疁瘳磟穋繆缪膠蓼蟉謬谬豂賿蹘轇鄝醪鏐镠雡顟飂餮髎鷚鹨㬔㺒䓼䚧䢧䰘䵏𠗰𠗽𡑁𢄪𢒥𣟇𣠼𣩍𣹗𤄰𤺋𤺼𥂔𥃃𥉾𥧯𥲿𦑬𦗖𦼛𦾂𧍿𧎞𧢋𨶪𩌭𩖇𩘷𩤴𪅡𪖷𪤗𪯖𫐖𫳚𫻤𬞣𬵩",
 "夭": "僑勪嘺嬌屫嶠憍撟敽敿橋燆獢矯礄穚簥繑蕎蟜譑趫蹻轎鐈鞽驕鱎鷮㝯㠐㢗䀉䎗䚩䢪𠙪𠿕𠿻𡁗𡰑𡰘𢄹𢐟𢕪𢻤𣤙𣪽𣯹𣾷𤩝𥋊𥼱𦒓𦪞𧄳𨇊𨝰𨲭𩯘𪍷𪢡𫡡𫣹𫦙𬓚",
 "尹": "僒蔒㩈㴫㿏𠌣𠹴𡀳𡑱𡑳𡩫𤹓𤺽𦄄𦏓𦵼𨆤𨮉𩺐𪷧𫌔𫲳𬙹𬚀",
 "酉": "僔噂壿嶟撙樽橂澊燇磸竴繜罇蕕譐蹲遵鄭鐏鱒鳟鷷㞟㽀䔿䥖𠥙𠪝𡰙𡼓𢢕𢵫𣞊𣾇𤡽𤮐𥂴𥊭𥖁𥢎𥳢𥳰𥴕𦅆𦌚𦪚𦽈𧒆𨗖𨞀𨣆𨱔𩯄𫂫𫆸𫑼𫜄𫱵𫻆𬛘𬟌𬤢𬯚𬲝𬴤",
 "豆": "僖嘭嘻噽嚭囍囍嬉廚憉憘憙敼暿樹橲櫈歖澍澎灎灔熹熺甏瞦瞽礂禧糦繥膨臌薣蟚蟛蟢譆饎鱚鼕鼖鼗鼘鼙鼚鼛鼜鼝鼞鼟㕑㝆㡧㱶㵙䕒䠬䥢䵱䵽䵾䵿䶀䶁𠎎𠏼𠐏𠓘𠾢𠿤𡀆𡂱𡃨𡄂𡅏𡅤𡅩𡅸𡆐𡆒𡐶𡓂𡓾𡣗𡤠𡤩𡤵𡦮𡼎𡽂𡽌𢢶𢣵𢵓𢷚𢸞𢹿𣞽𣟑𣠲𣦩𣾚𤀺𤃥𤃶𤄝𤅮𤏴𤐵𤡭𤢀𤣚𤩑𤩠𤪘𤺬𥀷𥌒𥕱𥕽𥛱𥛻𥢗𦅈𦗭𦗺𦪟𦻻𧔋𧔛𧕬𨅒𨅘𨆊𨎧𨬫𨭌𨭎𨭸𨯨𨯷𨰋𨼩𩦇𩰛𩻬𪇀𪇞𪈞𪔋𪔌𪔍𪔎𪔏𪔐𪔑𪔒𪔓𪔔𪔕𪔖𪔗𪔘𪔙𪔚𪔛𪔜𪔝𪔞𪔟𪔠𪔡𪔢𪔣𪔤𪔥𪔦𪔧𪔨𪔩𪔪𪔫𪔭𪔮𪔯𪔰𪔱𪔲𪔳𪔴𪔵𪔶𪔶𪔷𪢢𪢣𪧽𪮬𪹫𫄵𫋚𫍻𫓄𫓖𫔐𫚩鼖𫥙𫦠𫬸𫱺𫲈𫻚𫼅𫿽𬥪𬭳𬭵𬶮",
 "⺌": "僘厰幌幤廠愰榥氅滉熀皩縨鎤㢢㨪䁜𠒼𠔷𢠵𢢌𢸋𣀴𣄙𣚿𤏮𤓛𤢄𤨆𤺲𦇊𦒚𦞔𦦢𦵽𧝟𩻪𪅶𪛆𪝚𪦉𪫗𫤁𫦴𬆈",
 "冋": "僘厰屩幤廠氅㢢𠔷𡅫𡆌𡳯𢠵𢢌𢸋𢹣𣀴𣚿𤏮𤢄𤺲𥍑𦒚𦦢𧂼𧝟𨙍𩻪𪅶𪛆𪢤𫤁𬆈",
 "子": "僝啂嘋噋塾墪孱孱孴孴廓憝憞撉撴暾槨樼橔漖漷潡潺熟燉獤礅譈蹾轏鐓鐜镦霩鞹驏驐骣鷻㐠㐢㗥㨯㬑㬿㳶㵫㻵㻻䁨䃝䃞䃦䔻䕖䪃𠄀𠄇𠄉𠊩𠊩𠎄𠓎𠘈𠟉𠸷𠼼𡇲𡔵𡙰𡝦𡡬𡣁𡣁𡦥𡦥𡨻𡮈𡮑𡲐𡻙𡻳𡼖𢆡𢉚𢕙𢠛𢢁𢯚𢵔𣈃𣛦𣦤𤭤𥂣𥂦𥇽𥋆𥕖𥢨𥯇𥰛𥲯𦋵𦗒𦜘𦟵𦠳𦪔𦷰𦹐𦹡𦽑𧅐𧑒𧝋𧝗𨄡𨎎𨨜𨬊𨬖𨶝𨼼𩸐𩻣𪃽𪅪𪆃𪆎𪆝𪖄𪜛𪜟𪞺𪦝𪩖𪳞𫄃𫔏𫨗𫨗𫨟𫫳𫬛𬈽𬋲𬌢𬚧𬤣𬸫",
 "孖": "僝樼潺轏驏骣㵫㻵𠘈𠟉𢢁𢵔𥢨𦠳𨬖𩻣𪩖𫔏𫨟",
 "田": "僮儢儽儽儽兣劓勭勴喱嘢噇嚊墅嬶嬸幢徸憧懻撞擄擤攄曈朣橦櫖欙欙欙氃湹潼濞濾瀋瀵瀷瀻灅灅灅燑爈獞甅疃癳癳癳瞳穜竰籓糎糧緾纝纝纝缠罿艟艣蔔蕫薶藘藩蘲蘲蘲蘽蘽蘽虆虆虆襣襶覾讅蹱鐘鐪鑢鑸鑸鑸霾驥骥鼼鼽鼾鼿齀齁齂齃齄齅齆齇齈齉㒦㒦㒦㔤㜼㜼㜼㠉㠥㠥㠥㢚㢞㦟㨽㩄㯭㰂㲲㲲㲲㶟㶟㶟㼿䂌䃥䆊䆏䆹䑄䒄䒇䔆䔰䕐䕗䕰䙫䚒䝑䡴䣑䭚䮵䱳䲐䴀䴑䴑䴑䶊䶋䶌䶍䶎䶏䶐䶑𠏿𠑀𠔸𠟍𠠦𠠯𠠯𠠯𠣊𠥦𠺖𠾙𡃓𡃖𡈩𡑆𡒷𡓴𡔁𡔁𡔁𡡩𡣭𡤯𡤯𡤯𡦜𡪸𡬂𡰒𡰕𡺉𡽶𡾅𡿉𡿉𡿉𡿔𡿔𡿔𡿜𡿜𡿜𢋛𢋸𢖜𢟆𢠲𢢛𢢳𢣦𢣿𢨒𢵝𢸙𢹔𢹮𢹮𢹮𢺢𢺢𢺢𣀞𣀲𣄛𣄢𣊹𣊼𣛀𣠂𣠠𣠠𣠠𣡧𣡧𣡧𣺤𣼫𣽠𣽻𣾿𣿞𤀥𤃃𤄤𤄫𤍓𤎲𤐧𤐸𤑏𤒩𤜖𤜖𤜖𤡒𤢳𤩔𤪺𤫤𤫤𤫤𤫥𤫥𤫥𤴈𤴈𤴈𤴉𤴉𤴉𤴍𤴍𤴍𤺄𤺸𤺿𤻖𤻱𤻹𤼌𥌠𥍔𥍔𥍔𥖼𥗬𥗬𥗬𥗼𥗼𥗼𥜜𥜡𥜥𥤌𥤐𥤐𥤐𥪢𥫂𥫎𥳘𥶋𥶌𥸕𥸕𥸕𥽜𥽡𥽤𦅅𦌜𦒍𦔛𦔫𦝟𦢛𦤫𦫱𦸕𦾕𦾡𦿁𧀯𧂉𧃞𧄚𧐓𧑆𧒺𧓻𧕫𧕫𧕫𧗗𧘂𧝎𧬙𧬤𧭜𧮢𧮢𧮢𧸌𧽆𧽿𧾧𧾰𨂷𨄑𨄩𨇎𨈈𨈈𨈈𨏟𨐁𨐁𨐁𨙒𨝯𨞳𨣒𨤲𨤸𨤺𨬬𨶻𨷨𩍅𩍏𩕉𩕬𩞯𩦍𩪪𩫬𩮞𩯅𩯜𩯬𩻡𩼆𪆏𪆠𪇸𪈦𪈦𪈦𪋥𪍞𪕿𪖐𪖑𪖒𪖓𪖔𪖕𪖖𪖗𪖘𪖙𪖚𪖛𪖜𪖝𪖞𪖟𪖠𪖡𪖢𪖣𪖤𪖥𪖦𪖧𪖨𪖩𪖪𪖫𪖬𪖭𪖮𪖯𪖰𪖱𪖲𪖳𪖴𪖵𪖶𪖷𪖸𪖹𪖺𪖻𪖼𪖽𪖾𪖿𪗀𪗁𪗂𪗃𪟧𪟧𪤨𪧰𪧳𪧴𪨆𪬨𪬺𪴗𪷑𪷓𪷛𪻵𪾞𪿾𫃘𫊄𫊑𫊜𫊜𫊜𫋖𫍖𫍼𫑕𫒄𫓉𫓢𫕑𫗅𫘚𫙻𫜤𫝿𫣕𫣡𫦚𫩆𫫯𫮈𫲮𫴗𫴩𫽼𫾄𬁗𬃗𬄵𬅗𬉨𬋋𬎎𬓝𬓾𬕻𬣖𬥋𬩆𬪿𬫀𬫁𬫭𬮸𬴼𬵷𬹯𬹰",
 "世": "僷擛瞸蠂鐷㵩䕈䜓䥡䭟𠪸𣋑𣛻𣜿𣩨𦻜𧀢𧝵𨆡𨗸𩆏𩍣𫅠𫊍𬀗𬛚",
 "木": "僷僸僸儊儊凚凚剎噤噤堡媬孀憷憷摋擛攀攀暦暦椺榝槕檚檚歴歴湺滼滼漜漜漤漤潹潹澘澘澿澿濋濋瀮瀮灀煲璴璴瞸礎礎礬礬礵緥葆蒁蔱藻虨虨蠂蠜蠜褒褓襟襟賲鎩鐷霦霦驦骦鶐鸘鹴齼齼齽齽㦗㦗㨐㩒㩒㯲㯲㱈㱈㵉㵉㵩㷛㸑㸑䊛䌝䌝䌮䓭䕈䙪䙪䜓䥡䨬䨬䫴䫴䫶䫶䭋䭟䳰𠆡𠆡𠎊𠎊𠘆𠘆𠘏𠘏𠝨𠢱𠢱𠢵𠢵𠪖𠪖𠪸𠸒𠹎𠺽𠼖𠼖𠾣𠾣𠾤𠾤𠾵𠿃𠿝𠿝𡀐𡑓𡑓𡑲𡑲𡢟𡢟𡢾𡢾𢄌𢉣𢊒𢊲𢊲𢞒𢟌𢟍𢟍𢵛𢵳𢵳𢸅𢸅𢹩𣉐𣉜𣋑𣋜𣋜𣒑𣔁𣔁𣙓𣛧𣛧𣛻𣜿𣟿𣡕𣡕𣡕𣡕𣡿𣡿𣩨𣯂𣰙𣰙𣺉𣺉𣻑𣻚𤍁𤏗𤏗𤐖𤐖𤑇𤑇𤒐𤒐𤒕𤦸𤨽𤪼𤪼𤭭𤺢𤺢𤺣𤺣𤻇𤻇𤻎𤻎𤻚𤻚𤼍𤼍𤼑𤼑𥀸𥂑𥋴𥋴𥌞𥌞𥌿𥎤𥎤𥎥𥎥𥖜𥖜𥗘𥗘𥢻𥢻𥩃𥴘𥷗𥻦𥼔𥽍𥽍𥽢𥽢𦃏𦈟𦈟𦡞𦡞𦸇𦹮𦺤𦻜𦼚𦼚𦽔𦽔𦽩𦽻𧀊𧀢𧀭𧀭𧂈𧅂𧅲𧅲𧅲𧅲𧈇𧈇𧛱𧜁𧝵𧢜𧢜𨅾𨅾𨆃𨆃𨆄𨆄𨆡𨗸𨟄𨟄𨟅𨟅𨟤𨟤𨣤𨣤𨩔𨩚𨭣𨭣𨭺𨭺𨼪𨼪𩅪𩆏𩆤𩆤𩍣𩎑𩎑𩔵𩔵𩕌𩕌𩖗𩖗𩙐𩙐𩧅𩧅𩭼𩮫𩳘𪃁𪄅𪇎𪇎𪊅𪊅𪒍𪒍𪢇𪢇𪤰𪤰𪧲𪧲𪨜𪫛𪫛𪬟𪬟𪴖𪴖𪴛𪴜𪷩𪷩𪹡𪹡𪹤𪹵𪹵𪼬𪼬𫄒𫄒𫅠𫉭𫉭𫊋𫊍𫊚𫍉𫍉𫍍𫖺𫖺𫜴𫜴𫣯𫣳𫣳𫣼𫣼𫦜𫦜𫫋𫫋𫬀𫮚𫮚𫴘𫴘𫶒𫶒𫽷𫽷𫾋𫿣𫿣𬀗𬄪𬈥𬈥𬋔𬋔𬋡𬋡𬌖𬓛𬓛𬗹𬗼𬗼𬛚𬜏𬜏𬟥𬣌𬰋𬰋𬰍𬲞𬺓𬺓𬺔𬺔",
 "禾": "僽囌巍攟曆曆歷歷犩璓矁磿磿蘶蟍鏫馫馫㞜㵞㷴㷴㻺㻺㽁㽁㿗䔀䔣䔧䕲䭳𠟄𠟄𠪺𠪺𠫋𠼐𠼝𠿈𡁹𡐰𡐰𡓔𡓸𡓸𡙽𡙽𡚡𡚢𡾭𡿁𢤭𢶲𣗱𣙔𣙽𣙽𣜷𣞴𣟩𣦯𣦯𣦰𣦰𣼵𤃢𤒢𤡫𤡫𤪾𤪾𤯍𤯍𥊈𥗹𥲧𥷅𥷅𦓌𦠩𦠩𦢶𦣑𦾎𧀽𧃅𧔾𧕞𧝏𧝏𧬎𧬎𧯏𧯏𧽺𧽺𨄖𨇷𨬑𨬑𨯸𩅩𩅩𩥴𩦀𩱔𩱔𩻌𩼗𪅌𪅼𪅼𪙪𪙪𪠚𪠚𪥀𫇣𫉃𫉋𫫟𫰅𫽾𬕥𬝒𬝲𬝽𬟒𬟞𬬁",
 "宀": "僿儜嘧噻嚀嬣幰懧擰攇攐攓暥樒檸櫁櫶滵漴濘瀗瀽獰矃簺蔤薴藆藌藼鑏鑳騴鬡鷃鸋鼹㑻㓽㘔㣷㦥㨸㩙㩟㩷㲰㵃㵥䁙䈼䉘䌏䗿䘆䙭䜢䧮䨃䭢䮿䰋𠍾𠏯𠏷𠐻𠼾𠽱𡁁𡁍𡄓𡄽𡅅𡅶𡑮𡟖𡡶𡤐𡩷𡫨𡫸𡬉𡬗𡼌𡾢𡾰𡿂𡿃𢖘𢠄𢡦𢣮𢲋𢵷𢷘𢹫𢹷𣌔𣗈𣗤𣙩𣛂𣜯𣟋𣟯𣰁𣵻𣺂𤀑𤀕𤑅𤠴𤨲𤻝𤼂𥉴𥊠𥕜𥗳𥛢𥜴𥡶𥢫𥣗𥨢𥲚𥵹𦟽𦡲𦢉𦢽𦱆𦴴𦶤𦸌𦺊𦼍𧁟𧃕𧐿𧝱𧞼𧟑𧤨𧭈𧮈𧮎𧰗𧷦𧽉𧽧𧾨𨅃𨇥𨊓𨏥𨙇𨝡𨪶𨫯𨮥𨯶𨰬𨲸𨶁𨷛𨻂𩁔𩃱𩅃𩍹𩎀𩎼𩕳𩠵𩹽𩻃𩽜𪂊𪅁𪅮𪆮𪇜𪉻𪘕𪢗𪤃𪭄𪴣𪷯𪷱𪸆𪸋𪺅𪼒𪼭𪾺𫆴𫉲𫌌𫍾𫑦𫓁𫗛𫘫𫦢𫧚𫪢𫫥𫫻𫬐𫬭𫱽𫲇𫳹𫴚𫴞𫻊𫾊𬁙𬉗𬎈𬐥𬒦𬕲𬖵𬞬𬠵𬠶𬤯𬮒𬰒𬰢𬳐𬴏𬵕𬵨𬶩",
 "回": "儃凛凜勯嬗廩廪憻懍擅旜檀檁氈氊澟澶燣璮癛皽繵膻蟺襢譠邅顫颤饘驙鱣鳣鸇鹯㔊㣶䁴䃪䄠䆄䉡䕊䡀𠆞𠏟𠘐𠘡𠿞𡀫𡄁𡅹𡆎𡗋𢀮𢅒𢋃𢐹𢶸𢷆𣋊𣱭𤢏𤢤𤮜𤯑𤺺𥋶𥼷𦒜𦡣𦢵𦼹𧾍𨆁𨎹𨣚𨭖𨮍𨮢𨲵𨲷𩁉𩆐𩇆𩉊𩍕𩙼𩯤𩼤𩽱𪓼𪙵𪛇𪷤𫄊𫉿𫑾𫔑𫗴𫘰𫦜𫲃𫻒𫿝𫿣𬀞𬆸𬙉𬪙𬷶𬸴",
 "艹": "儆冪勵囆囈巁憼擎擏曔曞檠櫔濗濿爄爡璥矋礪禲糲羃臓臗蟼蠣襼警讛鑧驚髖鱱㘃㢣㥾㯣㯳䁥䕶䘌𠎲𠠏𠧂𠽋𡂖𡃗𡓧𡠷𡫌𡿋𡿒𢆅𢍸𢐧𢢉𢢩𢤆𢴚𢵝𢸆𢸎𢸓𢺀𢺉𢺐𣘗𣟂𣡊𤀂𤂨𤄀𤅠𤎐𤜒𤢵𤪲𤻹𤼚𥀳𥣭𥵵𥷺𦆨𦆼𦒨𦗿𧃶𧄲𧅰𧓽𧔺𧕤𧕥𧖄𧞵𧢝𧮇𧮚𨇆𨊙𨙚𨞺𨯅𨰈𩇅𩧃𩺱𩼃𪐌𪓈𪙛𪙺𫄿𫫯𫬉𫬱𫮲𫮾𫱻𫲍𫻞𫾢𬔁𬣒𬩤𬳤",
 "句": "儆憼擎擏曔檠璥蟼警驚㢣㯳𠧂𢍸𢐧𢢩𤀂𨰈𩼃𫄿𫱻𬞜",
 "士": "儓凭嚞嚞姙嬯恁懛拰撷擡擷栠栣檯秹籉糚絍纈荏薹袵襭讟賃赁銋鐑餁鵀㘆㤛㮜㯏㲆㲇㲈㳝㶵㷫㿦䅽䇮䋕䕵䕸䛘䡰䣸𠄶𠉰𠟸𠲉𠲏𠶉𡄈𡄒𡍛𡜟𡟌𡤊𡤵𡽩𢀫𢂧𢅣𢢂𢮌𣁙𣖝𣚬𣨮𣪤𣫊𣫒𣫘𣫙𣫜𣫝𣫣𣫤𣫨𣼥𤁅𤂌𤅮𤇲𤏼𤗿𤛓𤞘𤠼𤢬𤢺𤻡𥆂𥜝𥵎𥷫𥸚𦎼𦚮𦣨𦷺𦺢𧀺𧐜𧐡𧙨𧭏𧮡𧽓𨂘𨉃𨗟𨠲𨫲𨿂𨿃𩄸𩦽𩷀𩷻𪀼𪃇𪅏𪆋𪈞𪍱𪐕𪒴𪔰𪖃𪚣𪝦𪝦𪡹𪢍𪵑𪾮𫌤𫏊𫒸𫕤𫧔𫬔𫬔𫱡𫵊𫶚𫶭𫶲𫹧𫻚𬅁𬆍𬓧𬣯𬸊𬺝",
 "心": "儜儢勴嚀嬣懧擰攄檧檸櫖濘濾爈獰瘾矃薴藘蘂蘂蘂鑏鑢鬡鸋㣷㩄㰑㰑㰑㲰䉥䗿䭢𠣊𡀝𡃖𡄏𡄯𡅒𡣭𡤵𡫸𡬗𡾅𡾚𡾚𡾚𢣿𢶰𣀞𣎨𣝟𣻧𣿇𤄋𤩿𤻝𤻱𥌠𥖼𥜜𥣗𥩇𥵅𥶌𥽜𦇎𦡲𦢛𦿞𧄜𧄜𧄜𧓻𧭈𧭜𧰗𧾧𨊓𨢯𨯑𨲸𩁔𩕳𪇸𪢖𫍾𫓑𫴞𫻟𬄩𬉡𬉡𬉡𬕻𬟆𬟔",
 "皿": "儜嚀嬣懧擰檸潨濘濭灩獰瓂矃礚蕰蕴薀薴蘊鑉鑏饚鬡鸋㣷㲰䗿䝦䡷䭢𡀦𡣨𡫸𡬗𢅤𢕙𢷞𣝒𤂠𤻜𤻝𥣗𦗰𦡲𦾃𧂯𧞔𧢙𧭈𧰗𨊓𨞨𨲸𨵨𨷇𨷐𨽈𩁔𩍰𩕭𩕳𩡤𪅢𪢊𪺖𫇙𫍾𫏢𫠁𫴞",
 "斤": "儨儨劕劕壍嬱懫懫櫍櫍瓆瓆礩礩聻躓躓鑕鑕魙㜱㜱㩫㩫䑇䑇䜠䜠䤔𠑵𠘖𠘖𠹗𠻯𡀢𡂉𡂒𡂒𡃞𡆞𡒻𡒻𡗎𡦫𡦫𡽻𢣥𢲃𣋫𣻂𤁩𤁩𤢽𤢽𥉭𥜙𥼔𦄃𦾶𧀵𧅀𧎴𧏄𧓳𧓳𧔜𧸲𧸲𨊝𨏑𨏑𨐿𨐿𨟊𨟊𨮜𩉍𩍵𩍵𩧄𩧄𩺢𩻔𩽄𩽄𪬷𪮻𪮽𪮽𬅋𬘋𬘋",
 "勿": "儩檧瀃燙璗盪簜蕩鐊鐋霷鸉𠎯𡃶𡐀𡑑𡢈𡼍𡾕𢡂𢱦𢴳𣿘𤺹𤻈𥂸𥨛𥳜𦼳𦼴𦿄𦿆𧀩𧑘𨲞𩁒𩮜𪇚𪈑𪤝𪳷𫉤𫶖𬀑𬛡𬬍𬬏",
 "立": "儭噺嚫寴廍戅戆戇櫬澵瀙灨篰蒞蓓蔀薪藽襯㔶㜪㯁䀍䔒䞋𠖫𠘁𠙤𡁕𡏧𡏿𡔕𡻓𢣛𢣪𢤖𢤤𢤦𢥹𢦅𢷢𢺚𣘙𣯱𣻃𤁀𤐚𤮌𥗒𥨾𥰵𥳖𥵳𥷈𥸡𦌈𦟋𦵿𦹃𧆐𧐾𧗜𧭘𧭘𧭼𨑁𩅇𩻗𪟲𪡸𪧭𪬴𪬽𫂕𫏚𫑒𫚀𫚨𫣩𫤽𫥝𫧝𫨚𫬝𫯵𬈸𬎖𬛞𬯑𬱎𬵤𬷵",
 "朩": "儭噺嚫寴櫬澵瀙薪藽襯㜪䞋𥗒𥨾𥴽𧀝𧭼𨑁𪧭𪬴𫚀𫣩𫥝𬎖𬷵",
 "秝": "儮嚦攊櫪瀝爏瓑癧礰藶讈轣靂㠣㱹㺡㿨䍥䟐䥶𠘟𠠝𠫏𡤌𡫯𡳸𢍷𢖙𢤩𣀥𣌜𤃹𤖢𤘃𥌮𥤀𥨻𥷒𦇔𦘊𦪾𧔝𧞿𧰡𧴠𨇗𨊛𨘸𨟑𨟟𨣷𨷦𩙖𩯺𩽏𪓀𪖍𪗁𪙽𫇀",
 "山": "儶孈攜欈瓗纗蠵觿讗酅鑴驨㔒㩗㽯䪎䭨𠿩𡀰𡄴𡰡𡰢𡿀𢋬𢥘𢳐𣛹𣜅𣾚𤣑𤩑𤮰𤻨𤼒𥍋𥳙𥵇𥵣𥶮𦢿𦻻𦼻𦾸𧞖𧟃𧢧𧲚𨏳𨘼𨬫𨮑𩽨𪈥𪋸𪝱𫄹𫔔𫘱𫦠𫲈",
 "隹": "儶儸劐匶嚄嚿囉嬳孇孇孈彏彟彠戄擓擭攜攞攫曪檴櫵欆欆欈欍欏欔濩爑獲玀玃瓁瓗矆矡矱穫籆籮籰籱籱纗纙耯臒艧艭艭蔺藮蘸蘿蠖蠵蠼蠽觿護讗貜贋赝躩躪轥邏酅鑊鑴鑼钁镬雘韄頀饠驨鱯鳠鸌鹱㒑㔒㘍㠛㦜㦬㨤㩗㩳㩳㬦㷳㼈㽯㿚䂄䉟䉶䉶䌭䕴䝄䝄䢲䣤䦆䨼䪎䪝䭨𠑩𠓼𠠰𠠰𠿶𡀰𡃼𡄴𡆆𡆖𡆚𡔏𡚠𡤢𡤬𡰡𡰢𡾼𡾼𡿀𡿇𡿏𢅻𢅻𢅾𢋩𢋬𢖦𢤼𢥘𢥠𢥠𢥵𢥵𢸺𢺜𢺠𣌗𣩿𣱀𣾀𣿬𤄷𤎝𤏚𤓛𤣑𤮰𤼒𥍋𥍜𥗴𥗿𥜵𥤘𥶮𥷘𥸘𥽼𦍉𦡤𦢿𦣇𦣒𦧃𦫇𦿕𧀡𧂒𧃔𧄐𧄐𧅚𧆀𧆑𧆑𧕟𧕟𧖇𧟃𧟌𧢧𧢭𧮞𧲚𧹐𧾵𨆒𨇯𨇯𨇽𨈂𨈂𨈍𨏳𨏹𨙟𨮑𨰑𨰚𨰚𩆸𩆿𩆿𩇐𩉙𩎊𩏺𩧡𩵇𩵈𩽧𩽧𩽨𩽰𪆒𪇡𪇲𪇶𪈥𪈯𪈰𪈴𪋸𪎆𪙻𪝱𪫄𪫄𫄹𫊋𫍑𫑿𫔔𫘱𫣾𫬻𫮾𫲔𬁞𬒡𬠻𬪚𬷹",
 "糹": "儸囉圞圞攞曪欏灣灣灤灤玀癴癴癵癵籮纙纞纞蘿虊虊邏鑼饠㜻㜻㦬㼈㿚䂅䂅䖂䖂䘎䘎𡆆𡆕𡆕𡆝𡆝𡈻𡈻𡔖𡔖𡤢𡤶𡤶𡤻𡤻𡿇𡿏𡿞𡿞𢅾𢦈𢦈𢦋𢦋𢺝𢺯𢺯𢺳𢺳𣡩𣡩𣡵𣡵𣩿𣱀𣱂𣱂𤄷𤅶𤅶𤓩𤓩𤼣𤼣𥍚𥍚𥗴𥗿𥘂𥘂𥾃𥾃𦍉𦣇𦣛𦣛𧆅𧆅𧆎𧆎𧆏𧆏𧖖𧖖𧖘𧖘𧖣𧖣𧟌𧹐𨇽𨈊𨈊𨈌𨈌𨈎𨈎𨰺𨰺𩉙𩎊𩵇𩽰𪈰𪈿𪈿𪎆𪚀𫶦𫶦𬉲𬉲𬉳𬉳𬠻𬣗𬣗𬣘𬣘𬬦𬬦",
 "先": "儹儹劗劗囋囋巑巑攒攒攢攢欑欑灒灒瓒瓒瓚瓚礸礸禶禶穳穳籫籫纘纘缵缵臜臜臢臢襸襸讚讚趱趱趲趲躜躜躦躦酂酂酇酇鑽鑽饡饡㜺㜺㦫㦫䂎䂎䡽䡽䰖䰖𠓕𠓕𡿍𡿍𢑊𢑊𣀶𣀶𣀹𣀹𣪁𣪁𤓎𤓎𤿀𤿀𥎝𥎝𥽷𥽷𦫅𦫅𧄽𧄽𧹍𧹍𧹏𧹏𨤆𨤆𨳄𨳄𩎈𩎈𩵆𩵆𪚇𪚇𪴙𪴙𪷽𪷽𫲗𫲗𬖃𬖃𬡷𬡷𬤮𬤮",
 "旲": "冪濗羃𡃗𡫌𢆅𢸆𢸓𢺀𤂨𤅠𥀳𥵵𥷺𧄲𧕤𧕥𩇅𫮲𫲍𬔁𬣒",
 "戊": "减喊喴媙崴嵅幭感懱揻搣椷楲櫗減滅瀎煘瑊碱礣箴緘縅缄臓葳葴蝛蠛衊襪觱諴輱醎鍼鑖隇韈韤顑鰄鰔鱴鹹麙黬㒝㓕㙎㛾㨔㩢㰗㰹㺂䁍䁾䌩䖗䘊䙯䩏䯦䶠䶢𠁝𠊭𠋘𠔺𡀌𡂔𡃙𡚓𡞣𡡛𡢳𡫴𡫹𡯽𢅪𢆫𢜩𢨟𢷾𣁀𣋻𣙤𣛮𣜕𣠉𣤭𣸵𣽦𤊸𤜁𤺁𤻻𥀯𥀽𥊱𥔃𥗥𥠆𥢱𥣫𥻇𥼵𦄅𦇰𦑘𦔤𦞏𦢑𦧩𦩢𦩬𦸮𦼦𦿧𧁺𧇱𧍧𧛡𧥙𧥙𧥚𧥚𧭶𧯃𧾔𨃂𨊙𨜠𨞐𨩆𩆪𩕠𩝈𩤥𩦝𩮏𩯎𩱵𩱷𩴾𩽣𪂶𪇴𪉳𪔩𫉼𫍯𫮕𫶆𬃾𬐨𬕚𬣅𬴱𬵢𬹛𬺍",
 "刀": "刱剙噄囓彛彜梕棻涊湓潔照綛綤緳茘茘荵菬萔葐蒶虋認躵鍣㓗㖹㥹㧳㯧㸾䈃䏰䐼䘐䥛𠎧𠏶𠗋𠦢𠦢𠴍𠶅𠶕𠾸𡍆𡎛𡎣𡐤𡔐𡙢𡚋𡝖𡝱𡿖𢑱𢚅𢚴𢜌𢞂𢠈𢡙𢮈𢱔𢴲𢵒𣔄𣕝𣙭𣚃𣟗𣱦𣴀𣴀𣴞𣶼𣸜𣸬𣹣𣹣𣻭𣻭𤉎𤏦𤕃𤘊𤦦𤩦𤶝𤺚𥁳𥂾𥆾𥊟𥊯𥋑𥚆𥢪𥪲𥱋𥴜𦀧𦓖𦖆𦚰𦚰𦝅𦠶𦮪𦯀𦯲𦯳𦰛𦴚𦶚𦹄𦻟𧍌𧖷𧝨𧷨𧼹𨉺𨧟𨧼𨲅𩃼𩇻𩈢𩊫𩡉𩸂𪂽𪅸𪐁𪝕𪞹𪠱𪦐𪨄𪩋𪩛𪪄𪪷𪫫𪫱𪬲𪬼𪲠𪶎𪷪𪷰𪸳𪹃𪿶𫀷𫄐𫎤𫕧冤󠄁堍𫪝𫺕𫺦𫺾𫻉𫽅𫽡𫾸𫿼𬁤𬂾𬃒𬃠𬇲𬍨𬔚𬗞𬙄𬠍𬢶𬥃𬥣𬥬𬥮𬥯𬧪𬭡𬭴𬱇",
 "屰": "劂噘嶡嶥憠撅橛橜灍獗蕨蟨蟩蹶蹷鐝镢鱖鳜鷢㙭㜧㵐䙠𠎮𠢤𠢭𡡕𢅅𢴺𤛦𤺤𥕲𥕳𥗮𦠑𦪘𧂱𧽸𨇮𨬐𩀾𩦒𪆙𫞝𬘒",
 "欠": "劂噘嶡嶥憠懿撅橛橜檨澬灍獗蕨薋藗蟨蟩蠀諮谘趦蹶蹷鐝镢鱖鳜鷢㙭㜧㮞㵐㾳䆅䙠䠖𠎮𠢤𠢭𠾨𡡕𡳠𢅅𢢾𢱆𢴺𣯃𤛦𤦾𤦿𤺤𥕲𥕳𥗮𥚭𥻓𥼻𦅗𦠑𦪘𧀌𧂱𧏗𧹌𧽸𧾒𨇮𨍢𨩲𨬐𨬢𩀾𩆂𩆃𩥝𩦒𪆙𪞼𪦌𪮲𫑫𫙩𫚁𫞚𫞝𫦷𫱝𬂐𬘒𬝩𬢴𬤹𬳰",
 "又": "劐喛嘬嚄垼壂媛媻嫛嬳嵈幋庪彟彠愋慅慳援搔搫搬摋摼撃撮擭暖楥榝槃樫樶檓檴毉湲溞漃澱濩煖熞熶燬猨獲瑗瑵瑿瓁瘙瘢癜盤瞖瞽矆矱磐礥禐穝穫籆糔緩縏繄繋繓缓翳耯臋臌臒臔艧莈萲蒰蔋蔎蔱蕞薣藂藖蝂蝯螌蠖褑褩襊諼譭護谖贀鄹醫鋬鍰鎜鎩鏗鑊鑦锾镬雘鞶韄頀颾騷驟骚骤鰀鰠鰹鱯鳋鳠鶢鷖鸌鹥鹱黳鼕鼖鼗鼘鼙鼚鼛鼜鼜鼝鼞鼟㒘㔌㗨㘋㙠㟚㠛㣪㦜㧞㩓㩔㬊㬦㬾㮻㮽㯏㲆㲇㲈㲧㵊㵵㷫㿄㿦䁔䃑䃘䃜䅽䈠䈲䉟䉯䊛䌑䐘䓈䓩䕅䗟䝒䝸䟦䠫䡰䥢䥣䨼䪝䰉䴝䵛䵽䵾䵿䶀䶁𠋠𠐊𠔢𠖊𠗻𠟕𠩨𠲴𠴂𠴜𠶔𠸎𠺏𠺽𠼤𠽑𠿍𠿤𡁒𡄈𡄒𡋴𡍁𡎷𡐊𡐖𡑴𡒂𡒍𡞟𡠁𡠩𡡔𡢕𡢶𡪅𡮷𡮺𡰀𡱪𡲅𡷠𡹉𡻧𡽂𡽌𡽨𢂛𢄌𢄸𢅝𢆨𢊘𢜲𢞒𢟁𢟌𢠭𢡯𢢇𢤞𢥵𢥵𢭵𢮫𢯑𢯸𢴛𢴡𢶙𢸒𢸶𣀒𣇠𣉜𣋁𣋙𣒃𣓒𣘦𣙻𣝌𣠏𣤖𣩡𣪤𣫊𣫒𣫕𣫘𣫙𣫜𣫝𣫣𣫤𣫨𣫫𣸏𣻑𣻹𣽇𤁨𤂐𤈧𤍁𤐢𤑧𤔢𤛓𤛽𤠍𤠼𤠿𤤣𤥞𤩱𤩴𤪢𤮈𤲫𤶣𤸻𤻏𥆛𥈼𥉟𥉸𥊴𥔛𥕸𥖳𥣙𥦆𥧬𥪳𥰦𥲘𥳣𥳴𥴫𥵓𥵫𥶵𥷽𥸋𥻦𥼹𥽂𦃏𦃢𦄎𦅻𦇻𦈛𦎼𦑛𦖵𦗺𦜴𦞣𦢝𦦣𦩮𦪹𦫦𦳠𦵚𦵦𦸃𦺔𦺵𦼈𦽄𦽐𦿓𧅞𧅞𧋶𧌔𧌿𧎇𧏘𧐜𧐡𧓏𧜁𧜱𧜶𧝴𧝷𧞫𧟝𧡩𧤵𧪅𧱕𧳭𧽡𨂩𨃞𨃟𨃣𨅅𨅎𨆆𨆊𨈂𨈂𨎮𨕴𨝮𨞮𨡩𨣅𨦯𨨻𨭸𨵐𨷕𨼥𨽁𨿒𩂹𩋐𩋫𩍧𩎶𩏅𩓡𩔃𩙫𩮫𩯉𩰛𩷍𩸿𩺓𩺪𩼦𩽉𪁛𪂅𪄀𪄅𪅏𪅤𪇀𪇡𪉼𪍱𪐕𪒀𪒋𪒙𪒮𪔋𪔌𪔍𪔎𪔐𪔑𪔒𪔓𪔔𪔕𪔖𪔗𪔘𪔙𪔚𪔛𪔜𪔝𪔞𪔟𪔠𪔡𪔢𪔣𪔤𪔥𪔦𪔧𪔨𪔩𪔪𪔫𪔭𪔮𪔯𪔰𪔰𪔱𪔲𪔳𪔴𪔵𪔶𪔷𪖃𪙦𪚣𪠔𪡹𪤈𪦬𪧨𪨍𪨵𪮣𪱕𪲮𪵑𪶟𪶨𪷔𪷬𪹙𪹤𪼑𪾗𪿼𫂈𫉺𫉽𫋦𫌤𫍊𫏖𫏯𫏺𫔐𫕉𫖋𫛇鼖𫣰𫣴𫨕𫩾𫪒𫮊𫯅𫱥𫱺𫳷𫳺𫴇𫴈𫶲𫻂𫻈𫽂𫽌𫽟𫿚𬁆𬂵𬆍𬇮𬉐𬊨𬋪𬋫𬏱𬏴𬒨𬒲𬓙𬖯𬟂𬥍𬥢𬥨𬩞𬫗𬬆𬬒𬯾𬰝𬺝",
 "丌": "劓嚊嬶擤濞襣鼼鼽鼾鼿齀齁齂齃齄齅齆齇齈齉䑄䕗䶊䶋䶌䶍䶎䶏䶐䶑𠏿𡽶𢋛𣽠𤀥𤻖𦤫𦫱𧗗𨞳𩕬𪕿𪖐𪖑𪖒𪖓𪖔𪖕𪖖𪖗𪖘𪖙𪖚𪖛𪖜𪖝𪖞𪖟𪖠𪖡𪖢𪖣𪖤𪖥𪖦𪖧𪖨𪖩𪖪𪖫𪖬𪖭𪖮𪖯𪖰𪖱𪖲𪖳𪖴𪖵𪖶𪖷𪖸𪖹𪖺𪖻𪖼𪖽𪖾𪖿𪗀𪗁𪗂𪗃𪤨𫗅𫜤𬹯𬹰",
 "彑": "劙墬攭櫞欚㒩㼖䤙䴪𠺣𡽋𢥾𢷻𢸢𣝵𤀓𤀼𤐠𤪪𤳨𤼠𥂖𥌫𦧽𦫈𦺛𦽎𦾯𧃆𧅮𧑝𩽵𬯓",
 "𧰨": "劙墬攭櫞欚㒩㼖䤙𢥾𢷻𢸢𤪪𤼠𥌫𦧽𦫈𦺛𧅮𧑝𩽵",
 "虫": "劙劙攭攭欚欚爞爞蠱蠱㒩㒩㼖㼖䘇䘇䘉䘉䤙䤙䥰䥰𠤋𠤋𠥨𠥨𡆂𡆂𢥕𢥕𢥞𢥞𢥾𢥾𢦃𢺨𢺨𣡢𣡢𤅧𤅧𤅱𤜗𤜗𤼖𤼖𤼠𤼠𥸢𥸢𦧽𦧽𦫈𦫈𧅮𧅮𧒢𧒢𧔃𧔃𧔨𧔨𧔴𧔴𧔻𧔻𧔼𧔼𧕑𧕑𧕒𧕒𧕷𧕷𧕹𧕹𧕽𧕽𧕿𧕿𧖁𧖁𧖂𧖈𧖈𧖓𧖓𧖕𧖕𧖛𧖛𧖟𧖟𨙥𨙥𨰍𨰍𨷷𨷷𩫲𩫲𩽵𩽵𫯀𫯀",
 "𠂆": "劶垕姤擨栀梔洉缿茩蝂詬诟逅郈銗鋬骺鮜鲘㖃㤧㧨㯄㸸㻈䞧𠐀𠵲𠵳𡋴𡜮𡞟𡢐𡧻𡭐𢬯𣢨𥅠𥒖𥙐𦓝𧊛𧌿𧓗𧙺𧮶𧱒𧲿𨋜𨌌𩗇𩷴𪁆𪊪𪘇𪢈𪯬𪲉𪾗𫀱𫝴𫩲𫩾𫪒𫪣𬖙𬭅𬷎",
 "圥": "勢摰暬槷槸熱蓺褹褻驇㙯㰊䕭䞇𠪑𡂞𡠦𡫑𢄢𢅮𢳊𢸧𢸱𤍽𤮅𥡩𥲎𦸐𦽂𧃳𧅩𧜼𩕜𪧢𫮛𬓺𬞝𬷮",
 "禺": "勵囆巁曞櫔濿爄爡矋礪禲糲蠣鱱𠠏𡂖𡓧𡿋𢤆𢺉𤜒𤢵𤪲𤼚𥣭𦆨𧓽𧔺𧖄𧞵𧢝𧮇𧮚𨇆𨙚𨞺𨯅𩧃𪙺𫬱𬩤",
 "⻀": "匶嚿欍𦧃",
 "乚": "华厑吪哛唜喸嗴囮夞巼廤杹桦沎炛獇花訛讹貨货鈋靴魤𠇃𠕿𠯒𠳢𢪎𣾳𤆷𥄒𦗅𧏙𨪢𨱂𩑭𩲏𩲜𩾹𪜐𪝁𪢼𪼎𫅁𫅳𫇹𫈯𫒐𫔛𫣌𫪾𫱎𫹝𬁍𬍕𬖒𬟹",
 "䒑": "厥嗍塑嬨彅愬搠擶槊櫤氆溯潽濨濮瘚磀礠縌纀蒴蝷襥謭譜譾谫谱遡遻鎙鐠镨闕阙㘂㙸㠮㦍㨵㮶㯷㴑䗹䣞䲕𠊴𠒻𠟎𠸺𠽾𠿏𡂈𡃒𡃾𡍩𡏤𡐭𡚈𡡝𢍥𢢏𢤣𢶕𢶴𢷏𢸄𣌞𣖬𣚴𣜭𣯽𣺩𤩓𤪟𤾷𥉮𥐄𥐅𥣓𥣜𥲫𥲵𥳷𥴺𥵜𦃉𦃗𦗄𦞮𦡮𦢟𦺍𦿍𧃇𧑹𧪜𧫋𧬫𧭎𧾃𨆯𨭨𨮓𨽂𩉋𩌵𩍩𩺝𪄧𪇐𪨟𪲫𪴆𪷇𪹛𪾿𫃕𫌑𫍿𫏤𫏮𫒼𫔈𫶟𫸆𫻌𬂚𬂚𬂚𬞧𬠺𬣐𬵱𬶪𬶴",
 "屮": "厥嗍塑愬搠槊溯瘚磀縌蒴蝷遡遻鎙闕阙㦍㮶㴑䣞𠊴𠟎𠸺𡍩𡏤𢍥𣖬𣺩𥉮𦃉𦃗𦗄𦞮𧪜𧫋𩺝𪄧𪇐𪲫𪹛𫏤𫏮𫒼𫔈𬂚𬂚𬂚𬶪",
 "处": "厬𣽞",
 "𠤎": "哗晔烨硴蒊誮錵铧骅㗾㟆㬸㳸𠝐𠵅𤦙𤰏𩋖𪉊𫈪𫖇𫚘𫢮𫫸𫰡𫺆𫼧𬆌𬑓𬦷𬧧𬩑",
 "丁": "哘桁洐烆珩筕絎绗胻荇衍衎衏衐衑衒術衔衕衖街衘衙衚衛衜衝衞衟衠衢裄讏銜鴴鸻㤚䀪䘕䘖䘗䘘䘙䚘䟰䡓䯒䰢𠒣𠼵𠾑𡭑𢔖𢔬𢔮𢕁𢕅𢕋𢕵𢖅𢖋𢖍𢖡𢙡𢫱𣆯𤀵𥞧𦨵𧄇𧊔𧊽𧗝𧗞𧗟𧗠𧗡𧗢𧗣𧗤𧗥𧗦𧗧𧗨𧗩𧗪𧗫𧗬𧗭𧗮𧗯𧗰𧗱𧗲𧗳𧗴𧗵𧗶𧗷𧗸𧗹𧗺𧗻𧗼𧗾𧗿𧘀𧘁𧘂𧘃𧘄𧘅𧘆𧻥𨴠𪨳𪩵𫙚𫣦𬄴𬫑",
 "勹": "哟啲喣喲巈惸憌敬槆橁烵煦瘹箰箹药菂菢葋葯蒟蘜褜賯驧㐝㒐㨚㵡㺃㻤䈮䓎䔙䜦䥤𠄹𠍖𠑛𠡑𠣷𠮑𠸚𠹕𠿙𡏠𡒘𡖁𡟅𡟱𡠶𡡣𡢼𡥯𡳍𢔐𢕊𢛑𢛺𢯊𢯿𢰹𢲰𢳉𢵀𢵗𢵘𢶉𣊤𣕉𣕌𣙱𣚭𤟳𤷭𥍰𥔰𥭓𥮼𥯗𥯷𥰄𥰴𥰿𥲟𥳾𥴴𥷥𦖡𦗽𦝂𦡕𦮿𦯪𦰰𦳤𦴆𦴥𦷒𦽋𧂫𧄛𧛩𧼿𨣙𨩦𨰌𩍂𩍘𩎾𩧛𩭲𪕺𪦼𪷒𪹕𪺃𪾑𫂇𫂎𫃳𫈔𫉌𫉙𫉟𫉦𫒫𫛒𫣟𫱰𫱳𫴿𫺰𫽚𫽵𫾎𬈵𬊏𬋗𬋚𬋹𬍉𬍌𬕋𬕐𬖶𬗸𬞆𬞇𬞌𬞠𬣇𬧰𬩈𬭧𬰀𬰩𬹄",
 "力": "哵捌擄燲燲燲瘸箉艣鐪㐥㗎㢚㯭㵑䇷䕒䲐𠏼𠟒𠣶𠷉𡂁𡃉𡌀𡣗𢃉𢉤𢢛𢱌𢲊𢲊𢲊𣕧𣖚𤀺𤐵𤑛𤪘𤯸𤺿𤿱𥇂𥰮𦖇𦛺𦩪𧒺𧝂𧬂𨔗𨔣𨔽𨡊𨧢𩯜𪟧𪟧𪮼𪯀𪳇𪳺𪴚𪶃𪷓𪺤𫅘𫈆𬃹𬃹𬃹𬄵𬋒𬟓𬩁",
 "亽": "唥嶺懩攁澪濸瀁燯癢蕵蕶薞霗鱶㔦㩕㬡㯪䉖䌢䑆䕘䙥䨧䭥䴇䴫𠏡𠟨𠴒𡅐𡅖𡗍𡟀𡽹𢋞𢜅𣇝𣉏𣋃𣌞𣻒𤋶𤏬𤖜𤧍𤺨𤾨𥋞𥖟𥢴𥴻𥵝𥶑𥼸𦪩𦴿𦾝𧓲𧛎𧟺𨗺𨞖𨣖𨩖𩁎𩁥𩆼𩕹𩜒𩟃𩪴𩴽𪋚𪋪𪝎𪞠𪞧𪞮𪨺𪰁𪲜𪼧𫢣𫤤𫥕𫥖𫥘𫥜𫪬𫫿𫭶𫺡𬍦𬕬𬠑𬰌",
 "龴": "唥嗵嶺愑慂樋湧澪熥燯蓪蕶踴霗㗈㩕㬡㯪䉖䌢䕘䙥䞻䨧䴇䴫𠁜𠏡𠟨𠴒𡅐𡟀𡠙𡽹𡾁𢄟𢋞𢜅𢠆𢳟𣇝𣉏𣻒𣻢𤋶𤖜𤧍𤹯𤾨𥋞𥖟𥢴𥲆𥵝𥶥𥼸𦄷𦪏𦪩𦴿𧍛𧐺𧛎𧟺𨎢𨗺𨙖𨞖𨣖𨩖𨫤𨯁𩁎𩆼𩐹𩔘𩟃𪋚𪋪𪝎𪞠𪞧𪞮𪨺𪰵𪲜𪳆𫍃𫍌𫢣𫥕𫥖𫥘𫥜𫪬𫫿𫭶𫮢𫺡𬍦𬍺𬕬𬠑",
 "尸": "唰埿壂涮澱癜臋㥡㩔㵠𠎴𠏅𠟶𠴪𠸽𠿍𡀙𡌰𡑣𡑴𡼿𢅝𢛜𢤹𢯍𣋙𣫕𤩱𤩴𤷯𥖚𥣔𥴫𥵪𥷽𥺜𦡆𦰫𦲁𦽄𩅵𩋪𩸦𩸧𩾆𪒮𪢅𪣮𪯚𫁗𫋢𫖋𫿚𬁉𬈤𬉚𬘸",
 "爫": "啂蕿藧蘐㐠㐢㳶㶁䕑䕝𠄀𠄇𠄉𠑑𠸷𠼼𡇲𡔵𡚕𡝦𡨻𡮈𡮑𡲐𢆡𢉚𢯚𢵛𢸗𢹡𣈃𣙓𤀣𤃠𤄅𤨽𤭤𥂑𥇽𥯇𥰛𥱮𥶍𦋵𦜘𦟵𦵭𦷰𦹡𦹮𧀊𧞈𨨜𨭡𨼼𩝺𩸐𪃽𪜛𪞺𪷠𫃸𫄌𫄑𫏙𬀝𬈗𬈽𬋲𬌢𬕯𬗹𬛠𬣊𬧇𬧗𬷸",
 "白": "喞嬵宿檰灁矊衋衋㒙㙽㙽㰃𠁉𠫐𠫐𠫐𡀥𡄊𡄎𢐤𢐤𢥅𢸼𢹆𣂐𣂐𣟡𣟿𣶊𣾂𤅆𤫓𤫓𤾩𤾩𥌹𥷏𦌶𦾬𧃃𧕸𧞲𧞲𧟸𧼟𨮨𪠔𪶯𪷩𫊚𫏯𫑖𫑖𫓎𫱥𫱯𫱯𫳷𬄑𬇺𬈒𬉒𬌖𬑦𬑧𬛑𬝙𬞻𬟥𬠲𬡴𬬃𬬓",
 "旦": "喧媗愃揎搄暄暅楦渲灗煊燙瑄璗盪睻碹箮簜縆縇翧萱蕩蝖諠鍹鐊鐋霷鰚鸉䙋䱴䳦𠊿𠋧𠎯𠝳𠷐𠾵𡍷𡐀𡑑𡢈𡪏𡺟𡼍𡾕𢡂𢯕𢴳𣉖𣕲𣘇𣿘𤚗𤟿𤠊𤸧𤺹𤻈𥂸𥨛𥳜𦋠𦞌𦶙𦼳𦼴𦿄𦿆𧑘𧖞𧡢𨕹𩀈𩁒𩋢𩎄𩏆𩘒𩝑𩤡𪃗𪇚𪤝𪳷𪶥𫉤𫕍𫶖𬀑𬕠𬘵𬛡𬝖𬤎𬧂𬬍𬳇",
 "糸": "喺愻搎槂櫾猻蓀蘨遜㒡㘥䧰𠹀𡒐𢖟𢶛𣝠𣻆𤄏𥱖𦥊𦵠𧪾𨙂𨶉𨷱𪚀𪸅𫆮𫤅𫧊𫲰𬉯𬎄",
 "𠂉": "嗨塰履愾慜暣浒滊滸澓瀪熂癁繁蕧鎎霼靝餼鰵鳘㑶㠅㶗䔓䔦䨱䲄𠶹𠺪𠼯𡈏𡦎𢑎𢠇𣀽𣛏𣛦𣯘𣱬𤀇𤅴𤍋𤛎𤡈𤹾𤾟𥎃𥧔𥨍𥳇𥵩𥵴𥷳𦛰𦞝𧎵𧏨𧜃𧜚𧠅𧪁𧪢𧱲𧹵𩘞𩟍𩥀𩱢𩱱𪄴𪆎𪉾𪒉𪖴𪤓𪩟𪪉𪱃𪸃𪽺𫂚𫉀𫓍𫧅𫨥𫱙𫳠𫼎𬂕𬉕𬉯𬕧𬥧",
 "母": "嗨塰慜瀪繁鰵鳘㶗䔦䲄𢑎𣛏𤀇𤛎𤹾𥵴𩱢𩱱𪄴𪉾𪤓𪪉𪱃𫂚𫧅𫱙𬉕𬉯𬕧𬥧",
 "可": "嗬槣檹漪羇㨳𡏾𡼋𡼭𢇎𢕗𢷔𣺈𣿾𤀽𤨥𤨦𥊘𥰧𦌰𦗞𦟑𦪌𦸒𧱺𨄾𩕲𪝣𪷼𫉸𫉸𫑁𫬷𫶓𫻀𬄋𬉀𬬄",
 "古": "嗰㵈𠼏𡕁𡕁𡞢𢤹𣋢𣋢𥶜𨮱𫉣𫊊𬚅",
 "⺶": "嗴獇䕢𠠮𢺟𦗅𧏙𨪢𪼎𫈯𫣌𫪾𫱎𫹝𬁍𬳲",
 "用": "嗵愑慂樋湧熥蓪踴㗈䞻𠁜𡠙𡾁𢄟𢠆𢳟𣻢𤹯𥲆𥶥𦄷𦪏𧍛𧐺𨎢𨙖𨫤𨯁𩐹𩔘𪰵𪳆𫍃𫍌𫮢𬍺",
 "圭": "嘊漄𠽎𥊅𦟺𦹹𨖭𫫔",
 "⺡": "嘙媣擓欂璖磲礴蒅蔢蕖蘯蟝鑮㒑㣄㨤䓾䝣䭦𠍲𠹱𠿶𡀩𡎊𡒎𡡥𡼃𢣅𢥉𣋛𣒢𣔶𣘡𣯌𣯢𣯸𣿬𤄃𤡷𥋷𥗔𦄽𦢸𦣈𦼬𧍙𧕎𧗎𨆒𨆶𨏫𨪍𨬡𨮎𩃵𩍿𩏵𩟢𩱮𩺳𩽛𪆂𪆫𪇨𪍬𪎄𪚂𪚈𪳪𪷳𫄈𫊓𫐀𫽦𫾀𬄨𬮁",
 "皮": "嘙蔢𡼃𪳪𫾀",
 "必": "嘧樒櫁滵蔤藌㑻㨸㵥䈼䌏𠏷𡫨𢹫𤀑𥉴𦟽𦢉𧷦𨷛𪅮𪆮𪢗𪾺𫆴𫳹𫴚𬉗𬖵𬠵𬮒𬰢𬵨",
 "耳": "嘬嶯撮擑樶檝濈熶穝繓艥蕞蕺藂襊鄹霵驟骤㔌㵊㵵䉗䔱䝒䠫䴝𠟕𡀞𡃃𡆄𡒍𡡔𡪅𡽨𢄸𢢇𢸶𣀒𣋁𣙻𣠏𣩡𣽇𤑧𤖞𥊬𥊴𥕸𥖙𥣙𥪳𥳣𥵫𥸓𦄎𦈛𦠾𦦣𦺵𦼈𧁭𧅞𧅞𧓏𧜱𨅎𨎮𨎵𨝮𨞮𨣅𨼥𨽁𩇋𩍧𩦤𩯉𩼦𪉼𪒙𪙦𪧨𪮯𪱕𪿼𫋦𫍎𫙺𬓙𬬒",
 "早": "嘲廟戅戆戇撠擀橶檊漧潮澣濣瀚灨簳羄謿㔶㨴䀍𠎫𠕭𠖫𠼳𠽤𠿨𡁇𡔕𡡲𡼼𢀭𢠥𢢅𢣪𢥹𢦅𢴿𢷢𣊿𣋂𣎢𣛔𣛨𤁀𤌹𥋽𥴙𥵤𥸡𦄹𦺓𦻝𦼮𦾮𧃙𧆐𧐼𧗜𧾂𨄵𨅹𨗛𨝌𨝝𨫬𨯪𨼃𩯋𩻹𩼛𪆘𪟲𪤾𪮮𫑱𫕭𫙱𫡯𫤽𫧝𫾇𬉦𬉧𬕩𬫶",
 "丰": "噄嚖嚖囓懳懳摓槰樥櫘櫘漨潔熢篷緳縫缝膖蓬蠭譿譿鎽鏠韼鬔㓗㡝㦀㩨㩨㬩㬩㷨㷭㻱䎚䎚䐼䗦䗬䙜䡫䡺䡺䥛䩼䵻䵻𠎧𡐤𡔐𡻀𡻹𡿖𢅫𢅫𢕝𢴲𣗏𣚃𣺿𤏦𤑡𤑡𤩦𤪳𤪳𤺚𥊒𥊯𥎌𥛝𥢪𥣴𥣴𥪲𥴣𥶙𥶙𥶬𥶬𦇀𦇀𦪎𦾌𦿪𧏢𧴂𨕱𨫱𨲫𩅛𩏲𩏲𩙹𩥪𩪌𪅸𪔊𪔊𪔲𪩛𪮘𪼇𪿶𫌛𫴤𫴤𬤭𬤭𬭴",
 "⺩": "噖潖濏璱飋䔷𡡱𣚒𣚶𣾔𤩍𤪴𦆄𦠴𧑜𧑡𧒓𨆙𨬩𩇣𫉝𫓝𫗋𫾂𬎋𬒠𬠲𬬓",
 "羊": "噠撻橽澾燵繨薘蟽躂鐽闥韃㒓㣵㺚㿹䃮𠁺𠠮𠠮𢺂𢺟𢺟𤄢𥣔𦡯𦪭𧃇𧞅𧬻𩟐𫋢𫸉𬠺𬳲𬳲𬵮",
 "天": "噳澞藈鎹餸鸆㮳㮸㴨𡑾𢱤𢲂𣋒𣞅𤢑𤩸𥵂𦘍𦷴𦺕𦾚𧬧𨃗𨃵𨆠𨫇𩠌𩦟𩦢𪆴𪋬𪝝𪝭𪞄𪩽𫧄𫮗𫯖𫶙𫺫𬁨𬄲𬚥𬝤𬟀𬸮",
 "从": "噿濢瀲璻籡籢籨膵臎蓌蘝蘞遳㯜㵏㶑䊴䕜䥘䥘𠎥𠎥𠟏𠟏𠠬𠪞𠪞𡀬𡃍𡄥𡎻𡣝𡳥𢅸𢋻𢌃𢢒𢣃𢸟𢹦𢺅𣋽𣌋𣖵𣝦𣟺𣠇𣠺𣩸𣫢𣿈𤑯𤒡𤒥𤒦𤢾𤻒𤼏𥖮𦔡𦔡𧁴𧂹𧾀𧾀𨅇𨅦𨅦𨇓𨗀𨗀𨣋𨣋𨣻𨫈𨯘𨰇𩁆𩁆𩆯𩦗𩻶𩻶𪙮𪙮𪝬𪨃𪩪𪯞𪶶𪺀𫄆𫉡𫓚𫤐𫦢𫬮𫾒𫾛𬆜𬒫𬞚𬡳",
 "彐": "嚖懳櫘薓譿㩨㬩䎚䡺䵻𢅫𢵴𣞂𣺎𤑡𤪳𥣴𥲳𥶙𥶬𦇀𦸱𩏲𪔊𫴤𬤭",
 "甫": "嚩礡簙簿薄䥬䪇𠽢𡢼𣝍𣽡𤒔𥴮𦡰𦺉𦼭𨆶𩅿𩍘𩏯𩟢𩼬𪇨𫓆𫾎",
 "𣥂": "嚬濒瀕蘋顰颦騭骘㰋𠐺𡤉𢳴𥷎𦇖𦶼𧅵𧔪𧭹𨏞𨽗𫍐𫫾𫶡𬀔𬜚𬞟",
 "貝": "嚶嚶孆孆孾孾巊巊廭廮廮戅戇攖攖櫻櫻瀴瀴灨瓔瓔癪癭癭纓纓蘡蘡蠳蠳鸚鸚㔶䀍䑍䑍䙬䙬䨉䨉𠖫𠠖𡁃𡅙𡈯𡈺𡔕𡢻𡳮𡾸𡾸𢆀𢖠𢖠𢣁𢥫𢥹𢦅𣤵𣤵𣿹𤁂𤂫𤏩𤜉𤜉𤣎𤣎𤫡𤫡𥌽𥌽𥐑𥐑𥸝𥸡𦦿𦦿𧁐𧂐𧂬𧆐𧒪𧗜𧮆𧮆𨆥𨟙𨟙𨭦𨰃𨰃𨶨𩖍𩖍𩽢𩽢𪈤𪈤𪝼𪝼𪝽𪢰𪬩𪬱𪭅𪴎𪼿𪼿𫋱𫋱𫍒𫑊𫧝𫬤𫭕𫱾𬈦𬧝𬧝",
 "⺊": "嚸惉惦掂檆硵禼羄萜踮霑㥈䛸𠕭𠧟𠨄𠳱𠶧𠸞𡁇𡓝𡝫𢛈𢜋𢰷𢵚𢿑𣸾𤊁𤋧𤭥𥋽𥠯𥮒𥮠𥱱𥴙𥵤𦄹𦟶𦷿𧐼𧪊𧾩𨃊𨄵𨵍𩃅𩤎𪐇𪝽𪦃𪬍𪮮𪹭𪿹𫁥𫃔𫕭𫜊𫠗𫢶𫧷𫮤𫼵𫾇𬊬𬊲𬒜𬕩𬖭𬖷𬖼𬗀𬜗𬝐𬸵𬸶𬸷𬸸𬸹",
 "乎": "嚹",
 "豕": "嚺墜嬘幪懞旞曚朦檖檬氋澻濛燧獴璲矇礈礞禭穟籧繸艨蘧蠓襚譢鐆鐩隧靀饛鸏鹲㘌㠓㩚㸂䉌䍁䑃䔹䙩䡵䤓䥙䰒䴌䵆𠐁𠖔𠖨𠾕𡁏𡑖𡑞𡒯𡡦𡩵𡮹𢅕𢢊𢢝𢤪𢤸𢵌𢷊𣄚𣰥𣾶𤁴𤎩𤏢𤔽𤔾𤘁𤪑𤮠𤯻𤯾𤻄𤾬𥖐𥗌𥣛𥴦𥵿𦅭𦆟𦠵𦡵𦼯𦿢𧅭𧭊𧸙𨅷𨆏𨗎𨞫𨣢𨮵𨷃𨷹𨷹𨼾𨼿𨽎𨽵𩅥𩈁𩍚𩍬𩐌𩕱𩦺𩰟𩰟𪒛𪥡𪩩𪳹𬟃𬩄𬭼𬴌",
 "㐫": "囄攡灕籬蘺㒧㒿㰚䍦䙰𡿎𢌈𢥗𧕮𧮛𨯽𪐑𪺇",
 "禸": "囄攡灕籬蘺㒧㒿㰚䍦䙰𡿎𢌈𢥗𧕮𧮛𨯽𪐑𪺇",
 "埶": "囈襼讛𢺐𣡊",
 "魚": "囌𠫋𡚡𡚢𥗹𦣑𧃅𫰅",
 "鬲": "囐巘巚瓛讞钀齾㩵䡾𡔎𡿕𣡌𤅊𤫣𦉧𧖃𨏾𪚋𪺉",
 "門": "囒孏欗灡爤糷襽躪轥钄韊㶕𡅉𡅌𡔔𡤃𢆄𢥣𣠰𥗺𥽼𧂡𨈆𨙟𨰝𪦴𪴧𫌙𫲴𫶥𬎟𬵿",
 "柬": "囒孏欗灡爤糷襽钄韊𡔔𢆄𥗺𨈆𪴧𫲴𫶥𬅉𬉠𬎟𬧛𬵿",
 "⺲": "囖蠴㶔㶔㶔㿙㿙㿙𡆗𤖤𤖤𤖤𥘁",
 "維": "囖𡆗𥘁",
 "言": "圞灣灤癴癵纞虊㜻䂅䖂䘎𡆕𡆝𡈻𡔖𡤶𡤻𡿞𢦈𢦋𢺯𢺳𣡩𣡵𣱂𤅶𤓩𤼣𥍚𥘂𥾃𦣛𧄔𧄛𧆅𧆎𧆏𧖖𧖘𧖣𨈊𨈌𨈎𨰌𨰺𩧛𪈡𪈿𫶦𬉲𬉳𬣗𬣘𬬦",
 "几": "垼壂媻嫛嬴幋恐搫搬摋撃榝槃檓殻毉滼澱燬瑿瘢癜盕盤瞖磐縏繄繋羸翳聓臋臝茿莈蒆蒰蔎蔱蛩螌蠃褩譭贀贏赢跫醫銎鎜鎩鞏鞶驘鷖鸁鹥黳㗨㙠㠫㧬㨿㩓㩔㬾㮽㯏㲆㲇㲈㷫㸿㺸㼦㿄㿦䂬䃑䃜䅃䅽䇔䈲䊄䊛䓈䗟䡗䡰䥣䰉𠌖𠔣𠖊𠦦𠲴𠳗𠺽𠽁𠿍𡁒𡄈𡄒𡋋𡋼𡎷𡐊𡑴𡒂𡢕𡢶𡬶𡳴𡷠𡼆𢄌𢅝𢊘𢞒𢟁𢟌𢡯𢭜𢯸𢶙𣉜𣊑𣋙𣑃𣒃𣒆𣒾𣓒𣘦𣜄𣤖𣪤𣫊𣫒𣫕𣫘𣫙𣫜𣫝𣫣𣫤𣫨𣫫𣻑𤃔𤈧𤍁𤐢𤓤𤓤𤛓𤠍𤠼𤥞𤩱𤩴𤪢𤮈𤶣𤻏𥆛𥈼𥉟𥖳𥢵𥦆𥮕𥱿𥳴𥴫𥵓𥶵𥷽𥸋𥻦𥼹𥽂𦃏𦆁𦎼𦜴𦣄𦣉𦣖𦪹𦳠𦶢𦺔𦼻𦽄𦽐𦿓𧇡𧇤𧋶𧏘𧐜𧐡𧜁𧝷𧝹𧱕𨂩𨃞𨃟𨕴𨡩𨦯𨧣𨨻𨵐𨷕𨿒𩂸𩂹𩋐𩌲𩎶𩛳𩮫𩷍𩷠𩸿𩺓𩺪𪀛𪁛𪄀𪄅𪅏𪍱𪐕𪒀𪒋𪒮𪔰𪖃𪚣𪠔𪡹𪤈𪨍𪲊𪲊𪳈𪵑𪶟𪷔𪹙𪹤𪹻𫁼𫇼𫉽𫌤𫍉𫏯𫒸𫖋𫖡𫙤瀛𫨕𫩽𫪌𫬀𫱥𫳷𫴈𫶲𫽌𫽟𫿚𬃕𬆍𬇮𬉐𬏱𬖯𬥍𬥨𬨆𬩞𬰝𬸉𬹜𬺝",
 "共": "壂懻澱瀵瀷瀻癜臋襶驥骥㢞㩔䆊䆏䙫𠑀𠥦𠿍𡑴𡓴𢅝𢋸𢸷𢹔𣀲𣋙𣟙𣠂𣫕𤂿𤒩𤩱𤩴𤼌𥜥𥤌𥴫𥶷𥷽𥽡𥽤𦇗𦔫𦽄𧂍𧃞𧾰𨙒𨯭𨷨𪒮𪧴𪴗𫃘𫍖𫓢𫖋𫘚𫿚𬓝𬵷𬹹",
 "車": "壍嬱瀈璭聻魙㩣䤔𠪷𡁒𡃞𡗎𡣻𡽅𡽻𢣣𢣥𢶂𣋫𣜸𤑱𤪢𤪼𥖳𥜙𦅿𦇊𦾶𦿓𧀵𧅀𧔜𧬪𨊝𨏂𨮜𩅴𩉍𪬷𪮻𪷦𬞮𬮖",
 "干": "婩硸蔊錌䮗𠊀𠟳𠟳𠵚𢮹𣌘𤟉𥳼𨰮𨲊𩓤𩭢𪂢𪄃𪄃𪈷𪶐揅揅䗗䗗𫶂𫺥𬓀𬴁𬵾",
 "九": "媣蒅𩃵𫽦",
 "匚": "嫕嫛檶櫙毉瑿瞖篐繄翳藲贀醫鷖鹥黳㗨㙠㬾㿄䃜䉩䗟䥲𠼸𡂿𢊘𢋔𢸿𣘦𣫫𤁮𤮥𥗄𥱜𧞨𨊘𪅬𫪘𬕦𬥍",
 "矢": "嫕嫛毉潪瑿瞖繄翳贀醫鷖鹥黳㗨㙠㬾㿄䃜䗟䚐䠦𡐻𡡧𢉡𢊘𢰇𣘦𣫫𥋒𧒊𨼓𪳲𫋰𫣠𫫃𬕼",
 "幺": "嬨嬨濨濨礠礠㗀㗀㘂㘂䗹䗹䫜䫜𠋔𠋔𡺖𡺖𢇑𢇑𢇕𢇕𢇕𢇕𢉾𢉾𢰠𢰠𢶴𢶴𢹴𢹴𢹴𢹴𣠭𣠭𣠭𣠭𣾧𣾧𥠃𥠃𥣓𥣓𥴺𥴺𦂣𦂣𧍘𧍘𨭨𨭨𩉋𩉋𩘈𩘈𩡎𩡎𪃨𪃨𪋎𪋎𪴆𪴆𪴉𪴉𫃕𫃕𫧽𫧽𫲪𫲪𫶹𫶹𫻌𫻌𬈖𬈖𬞧𬞧𬣐𬣐𬨧𬨧𬯽𬱮𬱮𬵱𬵱",
 "釆": "嬸瀋籓藩覾讅㔤㰂䕰𡃓𡒷𢸙𤃃𤄤𤄫𤪺𥶋𧀯𧂉𪬺𪿾𫊑",
 "目": "孀巓彏彏戄戄攫攫欔欔灀玃玃矡矡礵籰籰蠼蠼貜貜躩躩钁钁驦骦鸘鹴㪺㪺㰜䂄䂄䉋䌮䢲䢲䣤䣤䥷䦆䦆𠑩𠑩𠟰𠟰𡆚𡆚𡓝𡚠𡚠𡤬𡤬𢖦𢖦𢹩𣌗𣌗𣰋𣰋𤩵𤩵𥀸𥋢𥋢𥍜𥍜𥜵𥜵𥤘𥤘𥸘𥸘𦣒𦣒𦫇𦫇𧅚𧅚𧢭𧢭𧮞𧮞𧾩𧾵𧾵𨈍𨈍𨏹𨏹𨞜𨞜𩅪𩇐𩇐𩍟𩍟𩏺𩏺𩕦𩕦𩧡𩧡𩵈𩵈𪈴𪈴𪴜𪾛𪿷𫬻𫬻𫾋𬛾𬰍𬲣𬵽",
 "卩": "孵毈禦篽蓹贕㤻㲉䥏𠨫𠷞𣊗𣫘𧸷𪇄𫧼𫧾𫧿𬄧𬛟𬪁𬸬",
 "呑": "屩𡅫𡆌𡳯𢹣𥍑𧂼𨙍𪢤",
 "戈": "嶘嶘濺濺籛籛藏蠈贓鱡㰄㰄㵴䉔䉔䔐䔐𠠀𠠀𡁧𡅺𡒉𡒤𡒥𡽴𡾻𢨑𢹊𣚙𣚙𣛷𣛷𣛸𣝕𣝕𣽖𣽖𣿐𤐒𤐒𥂫𥂫𥃒𥃒𥃗𥃗𥖔𥖔𥜤𥜤𥴈𥴈𦠱𦺐𦺐𦽒𦾟𦾟𧂂𧂂𧄕𧄹𧒿𧔢𧔢𧜆𨆎𨏺𨏺𨪑𨪑𨭮𨭮𩆭𩯩𩽮𪈇𪈇𪩞𪩞𪷻𪷻𫫷𫫷𫻔𫻔𫿎𬉉𬉉𬉰𬉰𬚂𬚂𬝠𬠠𬬌𬬌",
 "𡗜": "嶚嶛䭜𤃜𧈏𨇉𨝼𩻻𫕔𫹣𫿿𬋘𬟖𬤟𬲅𬴉",
 "具": "巅巔攧癫癲𠑘𡅥𡒆𡬅𡽆𢺗𢺗𣪀𤄱𧄺𨈀𨈃𨰎𨶷𪓇𪚉𪦵𪦵𪿰𫬟𬉌𬟕𬧚",
 "米": "巈擞薮蘜驧䉤𠎪𠮑𡖁𡡣𡦤𡳵𡳶𡿠𢵗𣚭𤮒𥐈𥨧𥶵𥷖𥷥𦡢𦧃𧁽𧃮𧆀𩽂𪢒𪨞𪨠𪮴𫄄𫉙𫣟𫣫𫫵𫵫𫵭𫸈𫻍𬈵𬉆𬖶𬞦𬟗𬟛𬣇𬧰𬰩𬳛𬹄",
 "升": "巐",
 "𠃊": "巓㰜𠣣𡘅𤡡𬵽",
 "頁": "巙虁躨𢆃𥜶𧅄𧮝𪭆",
 "巳": "巙菢虁褜躨㜯㵡䥤𠘕𠿙𡁱𢆃𢛺𢯿𢶉𢸷𢸷𣟙𣟙𤀠𤂿𤂿𤐤𥜶𥮼𥶷𥶷𦇗𦇗𦡕𦳤𧂍𧂍𧂫𧅄𨣙𨯭𨯭𩎾𪭆𪷨𪺃𪾑𫉌𫽵𬋗𬋚𬞆𬞭𬰀𬹹𬹹",
 "冖": "幪懘懞曚朦檬殻氋涜濛瀈獴璭矇礞続艨薓蠓読霶靀饛鸏鹲㠓㩚㩣㸿䑃䙩䤓䰒䴌䵆𠐁𠖨𠪷𠳗𠼵𡁏𡋼𡒯𡓝𡤵𡮹𡽅𡽲𢤔𢭜𢵴𢶂𣒆𣜸𣞂𣡭𣰥𣱃𣺎𤅮𤑱𤔽𤔾𤘁𤢻𤪑𤮠𤯻𤯾𤾬𥣛𥲳𥵿𦅿𦆟𦇊𦸱𦾭𦿢𧀱𧅭𧬪𧭊𧾩𨏂𨘬𨞫𨧣𨮵𨼿𩂸𩅴𩍬𩕱𩦺𪈞𪷦𫆼𫒸𫖡𫣦𫪌𫲞𫹊𫻚𬉘𬐐𬟃𬭒𬴌",
 "壴": "幮櫉櫥躕𨆼𩆩𪻋𫴶",
 "龶": "幰廭攇櫶瀗癪藼㦥䘆䜢䧮𡢻𡳮𡾢𢖘𤼂𧂐𧾨𨏥𨯶𩍹𪺅𪼭",
 "今": "廕癊蔭𡀝𣻧𣿇𧂃𨢯𪢑𫫚",
 "云": "廕癊罎蔭𤃅𤮦𦉡𩪺𪓂𪩿𪴘",
 "羽": "廫躢㵳㶀䀊𠐋𡓲𡫱𡽟𡽦𢺜𤁸𤒻𤓛𥗀𥵬𥷘𦆲𦾬𦾷𧃔𧆀𧮑𨟆𨮛𨰏𨰑𩆸𩼶𪇯𪹹𫚬𫜆𫬏𫲋",
 "㐱": "廫㵳㶀䀊𠐋𡫱𡽟𡽦𤁸𥗀𥵬𦆲𦾷𨟆𨮛𩼶𪇯𫚬𫜆𫬏𫲋",
 "巛": "廱灉癰葝薻鑋𡄸𡅘𡓱𢷰𢹬𢹭𢺎𣱮𣺤𣻽𤠃𤫔𤮲𥊌𥯙𦉥𦳲𦴟𦽁𦾱𧅕𧸰𨆪𨖑𨮫𩐺𩟷𪡿𫊄𫡸𫬈𫬶𬩆",
 "邑": "廱灉癰𡄸𡓱𢹬𢹭𤫔𤮲𦉥𩟷",
 "⺉": "彅擶櫤蟍謭譾谫鏫㨵䔣䔧𠅜𠗹𠺅𠼐𠼝𠿏𡂲𢟏𢤣𢶕𢸄𣈙𣕭𣗱𣙔𣜎𣜭𣞴𣼵𤍅𤹐𥊈𥲧𥲫𥳷𥵘𦤭𦶣𦺍𧏲𧝦𧬫𨃫𨃻𨶨𩄰𩌵𩥴𩦀𩻌𪅌𪝻𪶭𪷇𫉃𫉋𫊔𫍿𫕪𫜗𫶸𬈦𬝒𬝲𬟜𬬁",
 "彳": "愆椼籞葕蘌讆躛餰㗸㘅㦣䓷䕔䲗𡆚𡓎𢆈𢖓𢖨𢯼𣟉𣻚𣽣𤜂𥲋𥶽𦌫𦸇𧁬𧁮𧍢𧎘𧲔𧲝𧲞𧾦𨇙𨯣𩇐𩜾𪨜𫲛𬣔𬳆",
 "亍": "愆椼葕讆躛餰㗸㘅㦣䓷䕔䲗𡆚𡓎𢆈𢖨𢯼𣟉𣻚𣽣𤜂𥲋𥶽𦌫𦸇𧁬𧁮𧍢𧎘𧲔𧲝𧲞𧾦𨇙𩇐𩜾𪨜𬣔𬳆",
 "乁": "愾暣滊熂鎎霼靝餼㑶𠺪𡈏𡦎𣀽𣯘𣱬𤅴𥎃𥧔𦞝𧎵𧏨𧜃𧜚𧪢𧱲𧹵𩘞𩟍𩥀𪒉𪖴𪸃𪽺𫉀𫨥𬂕",
 "⺧": "慥澔箲簉糙贊贊赞赞鍌㸆䎭䒃䔏䗢𠊏𠐷𠐷𠻛𠻧𡄋𡄋𡑛𡠻𡮯𢝚𢱓𣞳𤄳𤄳𤅬𤅬𤫨𤫨𥌳𥌳𥧦𥳱𥳱𦺷𦺷𧑯𧑯𧮖𧮖𧷹𨄹𨅩𨖰𨘴𨯕𨻴𨼵𩱩𩱩𪄣𪆥𪝮𪳤𪷮𫉢𫌦𫌦𫛕𫣶𫷉𫸂𬃫𬈞𬈻𬒝𬔓𬕰𬪵",
 "臣": "慳摼樫欌熞礥臔臟藖贜鏗鑦鑶鰹㒘㘋㶓䃘䉯䌑䵛𠐊𠗻𠼤𡅆𡐖𡚥𡠩𡮷𡮺𡿄𢆮𢤞𢴡𢸒𣝌𣰾𣻹𤂐𤜐𤠿𥉸𥧬𦃢𦇴𦸃𧕨𧜶𧞫𧤵𧽡𨤃𩰅𪅤𪓅𪦬𪷬𪼑𫉺𫍊𫣴",
 "冫": "憌懿檨澬薋蠀諮谘趦㮞㾳䆅䠖𡳠𢢾𢱆𣯃𤦾𤦿𥚭𥳾𥻓𥼻𦅗𦡤𧂋𧏗𧹌𧾒𨍢𨩲𨬢𩆂𩆃𩥝𪞼𪦌𪮲𫈔𫉟𫑫𫙩𫚁𫞚𫦷𫱝𫱳𬂐𬕐𬝩𬢴𬤹𬳰",
 "戌": "憾撼澸轗鱤鱵鳡㙳䃭䉞䌠䜗䥠䫲𠽦𠿑𢠔𢤝𢷄𣀣𣁀𣚘𣛴𣤮𣼪𣾃𣿎𤁙𤄌𤛸𥍒𥳒𥶳𥽇𦆃𦒝𦺘𦽫𧭻𨣝𨮼𩼘𪇅𪇳𪈁𪉕𪊄𪒯𪒹𫄅𫄏𫐘𫓏𬐴",
 "艮": "懩攁樃瀁癢蒗蕵薞鱶㔦䑆䕞䭥𠺘𡅖𡗍𡻔𣌞𥶑𥶞𦵧𦷄𦺫𧓲𨃹𨶗𩁥𩜒𩪴𩴽𪤊𪰁𫉱𫫐𬏒",
 "工": "戅戇灨葝鑋隓隓㔶䀍䕢𠍻𠍻𠖫𠠖𠺱𡑏𡑏𡔕𢁊𢄛𢄛𢟈𢣁𢥹𢦅𢷙𢷰𣝃𣱮𣻽𤀏𤠃𥕨𥯙𥸡𦃵𦳲𦵶𦶐𦽁𧆐𧏤𧗜𧸰𨆪𨖑𨭏𨭒𨮫𩐺𪆇𪆇𪘓𪘡𪟲𪡿𪭅𫊓𫡸𫤽𫧝𫻐𫼈𬺇",
 "氏": "掋菧㭽䓜䣌𠴓𡌠𡍓𢋠𢋴𣷳𤚃𥁼𦘌𦰘𦰣𦽘𧨱𨌮𩃐𪂑𪂰𪃖𪝊𪰅𪽅𫢵𫪭𬀙𬢬𬫩𬺙",
 "百": "摍樎縮缩蓿蹜鏥㜚㴼䈹䑿𠍊𡪴𢳔𣩐𤛝𥀝𥕯𥼍𦟱𧐴𨟨𨢲𨣡𩐼𩘰𩥿𪩻𫔊𫫠𫺿",
 "凶": "摛樆漓璃瞝篱縭缡蓠螭褵謧醨離魑麶黐㷰䄜䅻䍠䬜𠌯𠻗𡂅𡏠𡴥𡼁𢟢𣉽𣯤𤗫𤡢𥕮𥻿𦔓𧅯𧴁𨝏𩥬𪅆𪒔𪖂𪤋𪱩𫀥𫬎𬓞𬓟",
 "亏": "摦槬𠿸𡀵𤬢𤬣𥧰𥱀𧪮𨃖𫈻𫉌𫏥𬞔",
 "毛": "撬撬橇橇竁竁膬膬㦌㦌㯔㯔䄟䄟䩁䩁𠎴𠽶𠽶𡪣𡪣𣰗𣰗𣾽𣾽𥕹𥕹𥳈𥳈𥼛𥼛𦗨𦗨𧹺𧹺𨊉𨊉𪤛𪤛𪯚𪹮𪹮",
 "夫": "撵撵攅攅攆攆櫕櫕濮濽濽瓉瓉纀纉纉襥讃讃鄻鄻鄼鄼鑚鑚㙸㠝㠝㯷㸇㸇䟎䟎𠅼𠓒𠓒𠞠𠣇𠣇𡂈𡂐𡂐𡃒𡃾𡣶𡣶𢤠𢤠𢷏𣞶𣞶𤁥𤁥𤪟𤾷𥌦𥌦𥎞𥎞𥗇𥗇𥣜𥣪𥣪𥵜𦂾𦢟𦪸𦪸𦷍𦿍𧭎𨆯𨇃𨇃𨇍𨇍𨘧𨘧𨘪𨘪𨣵𨣵𨮓𨯉𨯉𨲽𨲽𨽂𩍩𩍴𩍴𩯳𩯳𪮞𪶵𪿵𪿵𫌖𫌖𫶟𫸆𬧑𬧑",
 "冎": "撾檛濄簻膼薖鐹㗻䆼䙤𠏀𡁮𡑟𢅗𤬙𤻌𥨙𧀁𧒖𨘌𩟂𪆹𪇍𪙚𪳣𫃓",
 "虎": "擨𠐀𧓗",
 "酋": "擲躑𡂸𢤜𤣀𧀿𧓸𬅈",
 "⺫": "攌籜蘀㶎㶠䕪𡄤𡅵𡈵𣟳𦌾𦍃𧮅𨯬𨰄𨷣𪼮𪾜𫊏𫓡𫕵𫤇𬙪",
 "𠮛": "攌蔔㨽㶎䒄䒇䔰䕐𠔸𠠦𠾙𡄤𡈵𡡩𡬂𢠲𣟳𤐧𤐸𤑏𥯱𦌾𦍃𦸕𦾕𦿁𧬙𧮅𨄑𨄩𨏟𨬬𨯬𨰄𨷣𩍏𩯅𪆠𪧰𪷛𪼮𫋖𫕑𫙻𫣕𫣡𫤇𫦚𫲮𫴗𫴩𬁗𬋋𬙪𬣖",
 "亡": "攍瀛灜籝籯㜲㬯㱻䃷䌱䌴䑉䕦䯁𡰠𢺆𢺑𣟅𣠾𤼘𧕳𨯤𨰊𨰠𫂯𫈘𫨁",
 "凡": "攍瀛灜籝籯㜲㬯㱻䃷䌱䌴䑉䕦䯁𠺱𡰠𢟈𢺆𢺑𣟅𣠾𤼘𥕨𦃵𦵶𦶐𧏤𧕳𨯤𨰊𨰠𫂯𫨁𫻐𫼈",
 "龰": "攓樾瀽蓗鑳㯧㰗㿐䙭䙯䮿𠐻𠻀𠾲𠾸𡁻𡄓𡾰𢲛𢵒𢵼𢸋𢹤𣘊𣟯𣺺𣾼𤸭𥱰𥸛𦅲𦇰𦠶𦪂𦹼𦼛𧃕𧑅𧑽𧮈𧽇𧽈𨃝𨅿𨇥𨊝𨕍𨬓𩎀𩽜𪆧𪒥𪼊𪽸𫋦𫌐𫎼𫠼𬏌𬙄𬤯𬳚𬴏𬴞𬷲",
 "品": "檶櫙藲藻䉩䥲𡂿𢋔𤁮𤒕𤮥𥗄𥩃𧂈𧅂𧞨𨊘𬥍",
 "癶": "櫈藈㡧䠬𠐏𡂱𡓂𡦮𢷚𢸞𣋒𣞽𣟑𤃥𤃶𤢑𤩸𦘍𦺕𧔛𧬧𨆠𨯷𩦟𪆴𪔶𫶙𬄲𬸮",
 "灬": "櫵爑蔺藮蘸䌭䕴𡃼𡆖𡽮𢑌𢤼𢸺𤄾𤜑𥷾𦣍𧀡𧂒𧄾𧅃𧟍𨰟𪇶𫑿𫣾𫲔𬁞𬵴𬷹",
 "⺤": "櫾蘨㒡㘥𢖟𨙂𨷱𩆍𫧊",
 "缶": "櫾蘨㒡㘥𡒘𢖟𢵘𨙂𨷱𩆍𩍂𪷒𫧊𫱰𬞇𬞌𬩈",
 "尃": "欂礴鑮䭦𦢸𦣈𨏫𩍿𩏵𩽛𪎄𪚂𪚈𬮁",
 "戕": "欌臟贜鑶㶓𡅆𡚥𡿄𢆮𣰾𤜐𦇴𧕨𨤃𩰅𪓅",
 "⻗": "欞爧罎㦭䄥䉹䖅䚖䡿䰱䴒𠠱𠣋𡃽𡿡𢌔𢺰𣌟𤃅𤅷𤖦𤜙𤣤𤫩𤮦𤮹𤿅𥘃𥤜𥤞𥩔𥾂𦉡𦫊𧃨𧖜𧟙𧢱𧯙𨟯𨤍𨽲𩑊𩟽𩪺𪈯𪋺𪓂𪩿𪴘",
 "业": "氆潽濮纀襥譜谱鐠镨㙸㠮㩬㯷䲕𠒻𠽾𠾾𡂈𡃒𡃰𡃾𡐭𡚈𡡝𡾠𢢏𢷏𣌞𣚴𣯽𤩓𤪟𤾷𥐄𥐅𥣜𥲵𥵜𦡮𦢟𦿍𧑹𧭎𧾃𨆯𨮓𨽂𩍩𪨟𪾿𫌑𫶟𫸆𬶴",
 "兄": "渷䓲𠾔𡣛𢯻𢴎𥽄𦢴𦳆𦸍𧀲𧭚𨺥𩏈𩘍𪷄𫌎𫱧",
 "尗": "漃蔋㰗䙯𡀌𡂔𢅪𢠭𢷾𥀽𦇰𦢑𦵦𧝴𫳺𫴇",
 "示": "漴㓽䉘𠼾𡅢𡿂𢠄𣙩𣛂𣰁𤨲𥊠𥌿𥛢𥡶𥨢𥲚𥵹𥷗𧐿𧽧𨅃𨝡𩅃𩻃𪅁𪉻𪴛𪷯𫌌𫓁𫫥𬄠𬳐",
 "比": "潉熴𠹯𠽞𢠎𢹆𣙍𣾂𤨾𦄬𦹲𪟓𫮞𬵥",
 "去": "濭灩瓂礚鑉饚䡷𡣨𢅤𢷞𣝒𤂠𤻜𦾃𧞔𨞨𨽈𩍰𩕭𩡤𫇙𫠁𬛟",
 "舟": "瀊䃲䰔𡂑𤻧𤻷𦽮𧓙𪼪𬬛",
 "殳": "瀊蘙蠮䃲䰔𡂑𡤖𤻧𤻷𦽮𧓙𧕪𧮒𪼪𬬛",
 "每": "瀿蘩㩯𧁋𩎆𬪤𬹬",
 "攵": "瀿蘩虌㩯㬖𠼏𡁛𡃇𡓟𡽫𢴖𢹘𣋹𤾵𥴲𦺒𦻾𦼻𦿔𦿝𧀒𧁋𧄚𧆊𧒚𨎸𩎆𩠶𩽡𫦣𫬺𫲛𬑷𬢅𬪤𬹬",
 "水": "灁𠫐𠫐𠫐𡂊𡂊𡡺𡡺𣛁𣛁𣾜𣾜𦌶𧃌𨶺𨶺",
 "曲": "灎灔𡅏𡅩𡓾𡤠𡤩𢹿𣠲𤄝𤒚𤣚𧁓𧕬𨰋",
 "京": "灏灝𡂵𤂖𥶩",
 "㐭": "灗䕲𡓔𡾭𢤭𤃢𤒢𧖞𩎄𪥀",
 "𠚍": "灪爩䖇𡯀𡿥𢺴𤓮𥘄𪓊",
 "召": "燳𥵕𬡰𬪸",
 "坴": "爇藝𣞕𪷴𫉥𫸾𫾓𬡵",
 "丸": "爇藝𡫓𣞕𤃲𤒙𦶟𨷙𩆔𪈢𪷴𫉥𫉷𫸃𫸾𫾓𬋖𬡵",
 "乃": "璓𡁹𫇣𫫟𫽾𬝽𬟒",
 "巨": "璖磲蕖蟝㣄䝣𠍲𠹱𡡥𣯸𤡷𦄽𧕎𨬡𩱮𪆂𪆫𫐀𬄨",
 "吋": "瓙𠑥𢥰𤅕𤴃𪸈𫬦𫾡",
 "刍": "瘾𣝟𪢖𬄩",
 "𦈢": "禦篽蓹䥏𣊗𬄧",
 "氶": "篜蒸𡏈𡞷𢾧𤸲𦞪𦴸𧪣𩄔𪳜",
 "龷": "簎籍藉䎰䣢䥄𠺦𡓠𡩤𡽞𣛵𣯗𤁏𥕉𥕒𥧶𥳯𦄩𨆮𨝨𨞒𪮫𪺦𫠀",
 "⺆": "簓𢸛𤂂𥶏𦶌𦸔𧐸𧔿𪄄𫊃",
 "𠮷": "簓𢸛𤂂𥶏𦶌𦸔𧐸𧔿𪄄𫊃",
 "覀": "籈薽𠿣𧞙𫴍𫴖𬮕",
 "幸": "籜蘀㶠䕪𡅵𡫓𤃲𩆔𪈢𪾜𫉷𫊏𫓡𫕵𫸃𬋖",
 "卸": "籞蘌𨯣",
 "爿": "糚藏贓㮜㵴𡁧𡒉𡒤𡒥𡽴𡾻𢨑𣼥𨫲𩯩𩽮𫧔𫱡𫿎",
 "辶": "纄蘕鑝𠐵𡂫𡃿𡓄𡣻𢣣𢸚𣠑𤂧𤃧𤑫𤑾𤪼𥶼𧁂𧓶𧖆𧴟𨏕𨽛𩆰𬞮𬮖",
 "夆": "纄蘕鑝𡂫𡓄𢸚𣠑𤂧𤑫𧓶𧴟𨏕",
 "見": "臗鑧髖𢸎𣟂𦆼𦒨𧅜",
 "免": "蒬䥉𡟰𣹠𥳿𩌑𪆆𪑲𪡶𬞎𬱒𬱒𬱒",
 "电": "蓭𣚖𤑷𤪄𦺽𧫥𪩑𫫡𫫼",
 "弚": "蕛𦌢𦸫𩻋𬰐",
 "友": "蕿藧蘐𤀣𥶍𧞈𪷠𬕯𬣊",
 "囚": "薀蘊𡅘𢺎𧅕𨷇𨷐𫬶",
 "辰": "薅𣟪𤒚𤒛𧁓𧂭𩽔𬶹",
 "产": "薩𤄰𫻤",
 "生": "薩㝭𤦶𥨕𪔢𫟾𫬞",
 "果": "薻𥊌𦾱𫬈",
 "户": "藊闙㬖𢴂𢴖𤻶𦽟𪝹𫣪𫣱𫤑𫫤𫹢𬄈𬑷𬞤𬢅",
 "𠕁": "藊𢴂𤻶𦽟𪝹𫣪𫣱𫤑𬄈𬞤",
 "束": "藗𡁛𡓟𡽫𧀌𧀒𩠶",
 "身": "藭𠤊𡃕𡾈𤢶𧔚𧸺𫌗",
 "弓": "藭霐𠊨𠊨𠍻𠤊𡃕𡑏𡾈𢄛𤢶𥦷𧔚𧸺𪆇𫅈𫅈𫒮",
 "呆": "藵𬡭",
 "医": "蘙蠮𡤖𧕪𧮒",
 "昜": "蘯𢥉𥗔",
 "衣": "蘹𡅬",
 "𥄳": "蘹𡅬",
 "⻊": "虂𤅟𤫢𥸐",
 "各": "虂𡀩𡅅𡿃𢡦𢣅𢹷𣋛𣌔𤅟𤫢𥋷𥗳𥸐𨮎𪭄𫄈",
 "㦰": "虃𩇏",
 "韭": "虃𧆂𩇏",
 "㡀": "虌𡃇𣋹𤾵𦻾𦿔𦿝𧆊𫦣",
 "弋": "蟘𠱌𢁊𤀏𧹋𫋌",
 "卉": "蠎𤂫",
 "者": "蠴𧄔",
 "棥": "襻鑻𢺏𥜳",
 "買": "讟𥸚𧮡",
 "犬": "贆贆飆飆飇飇飙飙䁭䁭䔸䔸𡪱𡪱𢻪𣀬𣄠𣄠𣽼𣽼𤼅𥀴𥷇𦠎𦠎𩆮𪈡𬑀",
 "鳥": "贗𡃌𤂮𤑤",
 "门": "躏𬅉𬉠𬡱𬧛",
 "焦": "躏",
 "耒": "躤𤅔𨈁",
 "昔": "躤𤅔𨈁",
 "方": "霶𡽲𣛦𤂷𦾭𪆎𫆼𬉘",
 "厤": "靋𧄻𫭁",
 "歹": "髒𠅜𠗹𠺅𠿺𡂲𢟏𣈙𤃫𤍅𤹐𥍇𥵘𦤭𦶣𧏲𧝦𨃻𩄰𩖎𩙛𩦦𪈘𪖻𪳳𪶭𫊔𫕪𫜗𫶸𬟜",
 "且": "㐥𣡭𣱃𤅣𦼬𦿘𧀽𧗎𫲞",
 "厸": "㒍䠁𠜸𡼊𢴱𣚎𣸫𤛡𤮎𥊻𥳮𦅍𧬀",
 "右": "㘃㥾䁥䘌𠽋𡠷𢢉𢴚𣘗𤎐𩺱𪐌𪙛𬳤",
 "𦣝": "㜯𠘕𡁱𤀠𤐤𪷨𬞭",
 "臼": "㦦𠑑𢹡𤂚𤄅𤄎𥶵𧄷𨭡𩰕𪝷𫻁𬀝𬰖",
 "𠃜": "㯏㲆㲇㲈㷫㿦䅽䉋䡰𡄈𡄒𣪤𣫊𣫒𣫘𣫙𣫜𣫝𣫣𣫤𣫨𧐡𪍱𪐕𪔰𪚣𪡹𪵑𪾛𪿷𫌤𫶲𬆍𬛾𬺝",
 "分": "㯣𬞦",
 "出": "㵠𠏅𠟶𡀙𡑣𡼿𥖚𦡆𪈚𪈫𫁗",
 "瓜": "㺠㺠",
 "タ": "䉥𤄋𦇎𦿞",
 "辛": "䉸䉸𡅼𡅼𡿒𥶜𥷁𥷁𨐾𨐾𪓈",
 "内": "䌄𠊳𠨈𠶺𠸳𡎩𡩊𡹾𤋲𤶮𤶯𤻓𦳼𨧇𪈹𪈹𪶾𫈡𫦝𫪲𫮪𬕢𬜼𬩎",
 "尤": "䓼𧎞𩤴",
 "少": "䓾𣘡𣯌𣯢𨪍𩺳𪍬",
 "𦥔": "䕅𤁨𦢝𩽉",
 "系": "䕖",
 "冉": "䕝𡚕",
 "隻": "䕶𤄀𧅰𫻞𫾢",
 "萬": "䘈𤄆𥗠",
 "五": "䢩𠋼𠑕𡂂𡈰𡩺𢔴𢣸𤻭𥧝𥧸𥲐𦷮𦷽𩄭𫉎𫤋",
 "了": "䥋𨢶𪿹𬒜𬖼",
 "垚": "䥵𠑬𡃺𡆁𡮾𤃤𤄮𥍘𥽵𦈂𦣗𧄍𩰈𬘏𬲢",
 "⺮": "䥷𬲣",
 "⺄": "䭀𠌻𩠇𩷰𩾄",
 "⺢": "䴪𠺣𡽋𣝵𤀓𤀼𤐠𤳨𥂖𦽎𦾯𧃆",
 "𠄠": "䶇𩍌",
 "不": "𠊑𠝒𡌮𩭸𬃙",
 "之": "𠍥𠸾𠻅𢵉𣓦𥁷𫱑𬜎",
 "布": "𠍫𠻑𤏤𤏨𦻎",
 "屯": "𠎲",
 "首": "𠐵",
 "⺘": "𠑵𠹗𠻯𡀢𡂉𢲃𣻂𥉭𦄃𦶟𦿕𧎴𧏄𩺢𩻔",
 "旡": "𠠭𠠭𡅎𡅎𢹽𢹽𥸄𥸄𧹿𧹿𨇸𨇸",
 "乙": "𠶹𤍋𥷳𦛰𪩟𫪶",
 "未": "𠺾𢟐𢲬𦅱𧄚𨪥𪬔𪿽𫂒𬅜𬗰",
 "妟": "𠼸𪅬",
 "甘": "𠾨𠿃𥴘𫍍𬄪𬣌𬲞",
 "而": "𠿩𡂩𡃽𢣓𢳐𣛹𣜅𣝚𤻨𥳙𥵇𥵣𦺾𦾸𧃨𧞖𨘼𩆣𩼭𪋺",
 "壬": "𠿹𬊠",
 "矛": "𡀐𦇹𦺒𦺤𦽩𧒚𨎸𨙧𪈄",
 "巴": "𡀥𫆱",
 "毌": "𡁃𤁂𧁐𪴎𫍒",
 "重": "𡂁𤑛𪮼𪴚𬋒𬟓",
 "⻖": "𡃏𡓅𢹵𧃯𨯛𪎅𪷵",
 "有": "𡃏𢡯𥳴𦺔𬥨",
 "𦍒": "𡃿𤃧𧖆",
 "咸": "𡄏𥩇",
 "音": "𡄯𢹊𧄕𧄹𨯑𫻟𬟆𬟔",
 "舄": "𡄽",
 "林": "𡅢𤁋𨰨𫌕𫾐",
 "𦍌": "𡅷𢑌𢑌𤄾𤄾𦣍𦣍𧁒",
 "我": "𡅷",
 "咠": "𡅺𩆭",
 "聑": "𡆄𥸓𩇋",
 "𠁁": "𡆞",
 "𦣻": "𡐯",
 "余": "𡒎",
 "侌": "𡓅𨯛𪷵",
 "邕": "𡔏𢺠𧖇",
 "𠃌": "𡡛𣛮𤺁𥊱𥢱𥯱𥼵𦔤𦼦𨞐𩦝𩯎𫮕𬃾𬣅𬯽",
 "夗": "𡡶𫾊𬎈",
 "次": "𡤵",
 "㐄": "𡲣𡹷𤯲𧌰𧔧𧜨𪳖𫁫",
 "左": "𡽃𡽃𢢠𢢠𩁌𩁌",
 "丞": "𡽮𬵴",
 "𠂤": "𡿒𥵍𪓈𫬧",
 "舛": "𡿠𥷖𧁽𧃮𩽂𫸈",
 "广": "𢆁𤅄𫓘𫫓",
 "兼": "𢆁𤅄",
 "厷": "𢔘𢛠",
 "复": "𢖓",
 "里": "𢣛𢤖𢤤𢤦𢺚𥷈𫮸𬛞",
 "𠦝": "𢣴𫗻𬵾",
 "䖵": "𢦃𤅱𧖂",
 "匆": "𢶰𣎨𤩿𥵅𫓑",
 "穴": "𢷙𣝃𨭏𨭒𫪶",
 "非": "𢸿",
 "苟": "𢹘𩽡𫬺",
 "産": "𢹵𧃯𪎅",
 "𥁕": "𢺝",
 "亻": "𣋌𤾼𦾓𧮉𩎁𩏬𩦰𪊈𪎀𪙸𪙼",
 "亯": "𣌘𨰮𪈷",
 "卝": "𣌘𨰮𪈷",
 "肖": "𣜎",
 "亘": "𣜯𫫻𫱽𫻊𬁙",
 "㓞": "𣝠",
 "炏": "𣟕𤒇",
 "知": "𤁰𤂥",
 "仒": "𤂷",
 "𣥖": "𤃓𫊉",
 "舌": "𤄃",
 "取": "𤄓𪢚",
 "乑": "𤄓",
 "夲": "𤅆",
 "同": "𤅣",
 "金": "𤅺𤅺𨐃𨐃",
 "囬": "𤎂𬄥𬬉",
 "㒸": "𤑾𥶼𧁂𨽛𩆰",
 "享": "𤒙𨷙",
 "冗": "𤛓𤠼𦎼𧐜𪅏𪖃",
 "能": "𤜑𥷾𧄾𧟍𨰟",
 "术": "𤟆𥓑",
 "元": "𤠴𥕜𦶤𦸌𦺊𦼍𪼒𫹊𬐐",
 "⺼": "𤯸",
 "𣎳": "𤹳𤹳𤹴𤹴",
 "丨": "𥆩𪡻𫮾𬞨𬞰𬞺𬟗𬟛",
 "敢": "𥍛𫤖",
 "曰": "𥛼𨇡",
 "廴": "𥴤𦽇𧃑𨫡𫫕",
 "聿": "𥴤𦽇𧃑𨫡",
 "民": "𥴲",
 "帀": "𥵍𫬧",
 "并": "𥵪",
 "㚘": "𥸝",
 "𠂑": "𦃕",
 "卪": "𦃕",
 "冏": "𦇹𨙧𪈄",
 "朋": "𦗿𫬉",
 "由": "𦶊𫱲",
 "囙": "𦷿",
 "仌": "𦿘𫧷",
 "永": "𧁒",
 "馬": "𧂋𫻥",
 "冡": "𧃶",
 "鹿": "𧅃",
 "亲": "𧅜𬅋",
 "入": "𧆀",
 "𢦏": "𧆂",
 "瞿": "𧟝",
 "也": "𧪁",
 "步": "𧮝",
 "至": "𨃫𩅵𪝻𪢅",
 "谷": "𨮥𪴣𪸆𫲇𬒦𬞬",
 "𠂋": "𪃫𫆱",
 "⺨": "𪈡𬞅𬞷",
 "占": "𪙥𫫓",
 "贝": "𪟲𫤽",
 "黑": "𪱰𫑮",
 "六": "𪷆",
 "巿": "𪷳",
 "文": "𪼱",
 "武": "𪼱",
 "咅": "𫉾",
 "⻏": "𫉾𫊛",
 "奠": "𫊛",
 "付": "𫓘",
 "半": "𫪿",
 "手": "𫫕",
 "革": "𫻥",
 "罒": "𬟈",
 "亅": "𬦍",
 "𤰔": "𬨼",
 "乇": "𬵕"
}
},{}],"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose3.js":[function(require,module,exports){
module.exports={
 "冂": "亹僘厰屩幤廠斖氅藊虋霘㢢𠍟𠔷𡅫𡆌𡳯𢞉𢠵𢢌𢴂𢸋𢹣𣀴𣚿𣡿𤏮𤕉𤕊𤢄𤺲𤻶𥍑𥎤𥎥𥖹𥤎𦒚𦦢𦽟𧂼𧄸𧝟𨙍𨬎𨰨𩎑𩻪𩽬𪅶𪔦𪛆𪝹𪢉𪢤𫈷𫣪𫣱𫤁𫤑𬄈𬆈𬞤",
 "一": "亹偋喧嗨噳塰媗履幈愃愆愾慜憾揎搄摍摒摦撼攌斖暄暅暣椼楦槬樎浒渲滊滸澓澞澸瀪灗煊熂燙瑄璗癁盪睻碹竮箮箳簜縆縇縮繁缩翧萱葕蓱蓿蔔蕧蕩藈虋蝖諠讆蹜躛轗鍹鎎鎹鏥鐊鐋霘霷霼靝餰餸餼鰚鰵鱤鱵鳘鳡鸆鸉㑶㗸㘅㙳㜚㠅㦣㨽㮳㮸㴨㴼㶎㶗㶜㶜䃭䈹䉞䌠䑿䒄䒇䓷䔊䔓䔦䔰䕐䕔䙋䜗䥠䨱䫲䱴䲄䲗䳦䶇䶇𠊿𠋧𠍊𠍟𠎯𠔸𠝭𠝳𠠦𠶹𠷐𠺪𠼯𠽦𠾙𠾵𠿑𠿸𡀵𡄤𡆚𡈏𡈵𡍷𡐀𡑑𡑾𡓎𡟛𡡩𡢈𡦎𡪏𡪴𡬂𡳧𡺟𡼍𡽮𡾕𢆈𢑎𢔧𢖨𢞉𢠇𢠔𢠲𢡂𢤝𢯕𢯼𢱤𢲂𢳔𢴳𢷄𣀣𣀽𣁀𣉖𣋒𣕭𣕲𣖕𣘇𣚘𣛏𣛦𣛴𣜯𣞅𣟉𣟳𣡿𣤮𣩐𣯘𣱬𣸹𣻚𣼪𣽣𣾃𣿎𣿘𤀇𤁙𤄌𤅴𤋊𤍋𤐧𤐸𤑏𤕉𤕊𤚗𤛎𤛝𤛸𤜂𤟿𤠊𤠴𤡈𤢑𤧅𤩸𤬢𤬣𤭸𤸧𤹾𤺹𤻈𤾟𥀝𥂸𥍒𥎃𥎤𥎥𥕜𥕯𥖹𥤎𥧋𥧔𥧰𥨍𥨛𥯱𥰅𥱀𥲋𥳇𥳒𥳜𥵂𥵍𥵩𥵴𥶳𥶽𥷳𥼍𥽇𦂤𦆃𦉇𦉐𦋠𦌫𦌾𦍃𦒝𦘍𦛰𦝷𦞌𦞝𦟱𦶙𦶤𦷴𦸇𦸌𦸕𦺊𦺕𦺘𦼍𦼳𦼴𦽫𦾕𦾚𦿁𦿄𦿆𧁕𧁬𧁮𧃶𧄸𧍢𧎘𧎵𧏨𧐴𧑘𧖞𧜃𧜚𧟁𧠅𧡢𧩱𧪁𧪢𧪮𧬙𧬧𧭻𧮅𧱲𧲔𧲝𧲞𧹵𧼲𧾦𨂲𨃖𨃗𨃵𨄑𨄩𨆠𨇙𨍍𨏟𨔧𨕹𨟨𨢲𨣝𨣡𨫇𨬎𨬬𨮼𨯬𨰄𨰨𨷣𩀈𩁒𩇐𩋢𩍌𩍌𩍏𩎄𩎑𩏆𩐼𩘒𩘞𩘰𩜾𩝑𩟍𩠌𩤡𩥀𩥿𩦟𩦢𩯅𩱢𩱱𩼘𩽬𪃗𪃫𪄴𪆎𪆠𪆴𪇅𪇚𪇳𪈁𪉕𪉾𪊄𪋬𪑰𪒉𪒯𪒹𪔦𪖴𪝝𪝭𪞄𪢉𪤓𪤝𪧰𪨚𪨛𪨜𪩟𪩻𪩽𪪉𪱃𪳷𪶜𪶥𪷛𪸃𪼒𪼮𪽺𫂚𫄅𫄏𫆱𫈷𫈻𫉀𫉌𫉤𫋖𫏥𫐘𫓍𫓏𫔊𫕍𫕑𫙻𫣕𫣡𫤇𫦚𫧄𫧅𫨥𫫠𫫻𫬧𫮗𫯖𫱙𫱽𫲮𫳠𫴗𫴩𫵥𫵨𫶈𫶖𫶙𫹊𫺫𫺬𫺿𫻊𫼎𬀑𬁗𬁙𬁨𬂕𬄲𬉕𬉯𬋋𬐐𬐴𬕠𬕧𬖪𬘵𬙪𬚥𬛡𬝖𬝤𬞔𬟀𬣔𬣖𬤎𬥧𬧂𬬍𬳆𬳇𬵴𬸮",
 "丶": "俤偋偐僔剃剷喭噂嚺墜壿娣嬘嶟幈悌挮摌摒撙擿攍旞晜梯楌樽橂檖涕滻澊澻瀛灜焍燇燧珶璲瓋睇磸礈祶禭稊穟竮竴箳簅籝籯綈繜繸绨罇罤蓱蕕藡虄襚諺譐譢讁豑豒蹲递遃遵鄭銻鎹鏟鐆鐏鐩锑隡隧霶顔颜餸鬀鮷鱒鳟鵜鷷鹈齴㖒㜲㞟㣢㦃㬯㮳㮸㯆㰅㱻㴨㶜㶜㸂㽀䃷䉌䌱䌴䍁䏲䑉䑯䓲䔊䔹䔿䕦䡵䥖䥙䬾䯁䶏𠖔𠝭𠥙𠦳𠪝𠺱𠾔𠾕𡂓𡌡𡑖𡑞𡒱𡟛𡡦𡣛𡣪𡥩𡩵𡰙𡰠𡳧𡼓𡽲𢅕𢔧𢚖𢞆𢟈𢢊𢢋𢢕𢢝𢤊𢤪𢤸𢱘𢱤𢲂𢴎𢵌𢵫𢵲𢷊𢸈𢸑𢺆𢺑𣄚𣋥𣋥𣖕𣜹𣞅𣞊𣟅𣠾𣸥𣸹𣾇𣾶𤁷𤋊𤎩𤏢𤑦𤟆𤡽𤢼𤧅𤫼𤭌𤭸𤮐𤯿𤻄𤼘𥂴𥊭𥊽𥓑𥕨𥖁𥖐𥖾𥢎𥧋𥰅𥳢𥳰𥴕𥴦𥺀𦂤𦃕𦃵𦅆𦅭𦉇𦉐𦌚𦝷𦞎𦠵𦢴𦪚𦯔𦵶𦶐𦷴𦼯𦽈𦾭𧀾𧁕𧁱𧃐𧃣𧋘𧏤𧒆𧕳𧟁𧩱𧭚𧯪𧳋𧳼𧴉𧸙𧼲𨁃𨂲𨃗𨃵𨅷𨆏𨍍𨔧𨗎𨗖𨞀𨣆𨣢𨫇𨮹𨯤𨰊𨰠𨱔𨷃𨹥𨼾𨽎𨽵𨿘𨿝𩅥𩈁𩍚𩐌𩓂𩠌𩩷𩯄𩽞𪁩𪇪𪑰𪒛𪕧𪖦𪝝𪞄𪥡𪦎𪨚𪨛𪩩𪫃𪬸𪳹𪶜𪷄𫂫𫂯𫄔𫆸𫆼𫌎𫍓𫑼𫜄𫜮𫤜𫤢𫧄𫨁𫫹𫮗𫯖𫯙𫱧𫱵𫵥𫵨𫶈𫸽𫺫𫺬𫻆𫻐𫼈𬀹𬁨𬂑𬉘𬊰𬑳𬖄𬖪𬚥𬛘𬛝𬝤𬟀𬟌𬡜𬤢𬩄𬭼𬯚𬲝𬲻𬴤𬶕",
 "丿": "俤偋偐僑僔剃剷勪厥哗喭嗍嗨嘺噂嚺塑塰墜壿娣嬌嬘履屫嶟嶠巐幈悌愬愾慜憍挮搠摌摒撙撟擿敽敿旞晔晜暣梯楌槊樽橂橋檖浒涕溯滊滸滻澊澓澻瀪烨焍熂燆燇燧獢珶璲瓋瘚癁睇矯硴磀磸礄礈祶禭稊穚穟竮竴箳簅簥綈縌繁繑繜繸绨罇罤蒊蒴蓱蕎蕕蕧藡虄蝷蟜襚誮諺譐譑譢讁豑豒趫蹲蹻轎递遃遡遵遻鄭銻錵鎎鎙鎹鏟鐆鐈鐏鐩铧锑闕阙隡隧霶霼靝鞽顔颜餸餼驕骅鬀鮷鰵鱎鱒鳘鳟鵜鷮鷷鹈齴㑶㖒㗾㝯㞟㟆㠅㠐㢗㣢㦃㦍㬸㮳㮶㮸㯆㰅㳸㴑㴨㶗㶜㶜㸂㽀䀉䉌䍁䎗䏲䑯䓲䓾䔊䔓䔦䔹䔿䕖䚩䡵䢪䣞䥖䥙䨱䬾䲄䶏𠊴𠖔𠙪𠝐𠝭𠟎𠥙𠦳𠪝𠵅𠶹𠸺𠺪𠼯𠾔𠾕𠿕𠿹𠿻𡁗𡂓𡈏𡌡𡍩𡏤𡑖𡑞𡒱𡟛𡡦𡣛𡣪𡥩𡦎𡩵𡰑𡰘𡰙𡳧𡼓𡽲𢄹𢅕𢍥𢐟𢑎𢔧𢕪𢚖𢞆𢠇𢢊𢢋𢢕𢢝𢤊𢤪𢤸𢱘𢱤𢲂𢴎𢵌𢵫𢵲𢷊𢸈𢸑𢻤𣀽𣄚𣋥𣋥𣖕𣖬𣘡𣛏𣛦𣜹𣞅𣞊𣤙𣪽𣯌𣯘𣯢𣯹𣱬𣸥𣸹𣺩𣾇𣾶𣾷𤀇𤁷𤅴𤋊𤍋𤎩𤏢𤑦𤛎𤡈𤡽𤢼𤦙𤧅𤩝𤫼𤭌𤭸𤮐𤯿𤰏𤹾𤻄𤾟𥂴𥉮𥊭𥊽𥋊𥎃𥖁𥖐𥖾𥢎𥧋𥧔𥨍𥰅𥳇𥳢𥳰𥴕𥴦𥵩𥵴𥷳𥺀𥼱𦂤𦃉𦃗𦅆𦅭𦉇𦉐𦌚𦒓𦗄𦛰𦝷𦞎𦞝𦞮𦠵𦢴𦪚𦪞𦯔𦷴𦼯𦽈𦾭𧀾𧁕𧁱𧃐𧃣𧄳𧋘𧎵𧏨𧒆𧜃𧜚𧟁𧠅𧩱𧪁𧪜𧪢𧫋𧭚𧯪𧱲𧳋𧳼𧴉𧸙𧹵𧼲𨁃𨂲𨃗𨃵𨅷𨆏𨇊𨍍𨔧𨗎𨗖𨝰𨞀𨣆𨣢𨪍𨫇𨮹𨱔𨲭𨷃𨹥𨼾𨽎𨽵𨿘𨿝𩅥𩈁𩋖𩍚𩐌𩓂𩘞𩟍𩠌𩥀𩩷𩯄𩯘𩱢𩱱𩺝𩺳𩽞𪁩𪄧𪄴𪆎𪇐𪇪𪉊𪉾𪍬𪍷𪑰𪒉𪒛𪕧𪖦𪖴𪝝𪞄𪢡𪤓𪥡𪦎𪨚𪨛𪩟𪩩𪪉𪫃𪬸𪱃𪲫𪳹𪶜𪷄𪸃𪹛𪽺𫂚𫂫𫄔𫆸𫆼𫈪𫉀𫌎𫍓𫏤𫏮𫑼𫒼𫓍𫔈𫖇𫚘𫜄𫜮𫡡𫢮𫣹𫤜𫤢𫦙𫧄𫧅𫨥𫫸𫫹𫮗𫯖𫯙𫰡𫱙𫱧𫱵𫳠𫵥𫵨𫶈𫸽𫺆𫺫𫺬𫻆𫼎𫼧𬀹𬁨𬂑𬂕𬂚𬂚𬂚𬆌𬉕𬉘𬉯𬊠𬊰𬑓𬑳𬓚𬕧𬖄𬖪𬚥𬛘𬛝𬝤𬟀𬟌𬡜𬤢𬥧𬦷𬧧𬩄𬩑𬭼𬯚𬲝𬲻𬴤𬵕𬶕𬶪",
 "廾": "偋巐幈摒竮箳蓱蠎㶜㶜䔊𠝭𡟛𡳧𢔧𣕭𣖕𣸹𤂫𤋊𤧅𤭸𥧋𥰅𦂤𦉇𦉐𦝷𧁕𧟁𧩱𧼲𨂲𨍍𨔧𪑰𪨚𪨛𪶜𫵥𫵨𫶈𫺬𬖪",
 "口": "傴傴僘僺僺儃儆凛凜剾剾劋劋勯匲匲厰嗰嘔嘔噪噪奩奩嫗嫗嬗嬠嬠屩屩嶇嶇幤幧幧廠廩廪彄彄慪慪憻憼懆懆懍摳摳擅操操擎擏攌敺敺旜曔樞樞橾橾檀檁檠檶櫙歐歐毆毆氅氈氉氉氊渷漚漚澏澏澟澡澡澶灏灝熰熰燣燥燥燳璥璪璪璮瓙甌甌癌癌癛皽瞘瞘矂矂簓繰繰繵缲缲膒膒膻臊臊蓲蓲蔔藲藵藻虂蟺蟼襙襙襢謳謳譟譟譠警貙貙趮趮躁躁軀軀邅鄵鄵醧醧鏂鏂鐰鐰顫颤饇饇饘驅驅驙驚髞髞鰸鰸鱢鱢鱣鳣鷗鷗鸇鹯㔊㘃㢢㢣㣶㥾㨽㩰㩰㬽㬽㯳㵈㶎㿋㿋䁥䁴䃪䄠䆄䆆䆆䆰䆰䉡䉩䉱䉱䌔䌔䒄䒇䓲䔰䕊䕐䘌䙔䙔䡀䡱䡱䥲䧢䧢䩽䩽䳼䳼䵲䵲𠄾𠄾𠆞𠏟𠑥𠔷𠔸𠘐𠘡𠠦𠢔𠢔𠥷𠥷𠥹𠥹𠥺𠥺𠥺𠥺𠧂𠼏𠽋𠾔𠾙𠿞𠿸𠿸𡀩𡀫𡂵𡂿𡄁𡄏𡄤𡅅𡅫𡅫𡅹𡅺𡆌𡆌𡆎𡈵𡕁𡕁𡗋𡞢𡠷𡡩𡣛𡩾𡩾𡬂𡬿𡬿𡳯𡳯𡿃𢀮𢄠𢄠𢅒𢋃𢋔𢍸𢐧𢐹𢕓𢕓𢠲𢠵𢡦𢢉𢢌𢢩𢣅𢤁𢤁𢤹𢥰𢯻𢴎𢴚𢶸𢷆𢷯𢷯𢸋𢸛𢹣𢹣𢹷𢻥𢻥𢻪𢻪𢿛𢿛𢿾𢿾𣀉𣀉𣀬𣀬𣀴𣂻𣂻𣉾𣉾𣋊𣋛𣋝𣋝𣋢𣋢𣌔𣌘𣎥𣎥𣘗𣚿𣜣𣜣𣞃𣞃𣟳𣩛𣩛𣰕𣰕𣱭𤀂𤁮𤁰𤂂𤂖𤂥𤅕𤅟𤅣𤎐𤏮𤐧𤐸𤑏𤒕𤒙𤛐𤛐𤠾𤠾𤢄𤢏𤢖𤢖𤢤𤫢𤮜𤮥𤯑𤴃𤹪𤹪𤺲𤺺𤼅𤼅𥀴𥀴𥋶𥋷𥍑𥍑𥍛𥍛𥕥𥕥𥖨𥖨𥗄𥗳𥩃𥩇𥯱𥱸𥱸𥵕𥶏𥶜𥶩𥷇𥷇𥸐𥼷𥼾𥼾𥽄𥽹𥽹𦌾𦍃𦒚𦒜𦗵𦗵𦡣𦢴𦢵𦦢𦳆𦶌𦸍𦸔𦸕𦼹𦾈𦾈𦾕𦿁𧀲𧂈𧂼𧂼𧅂𧐸𧒮𧒮𧔿𧝟𧞨𧬌𧬌𧬙𧭚𧮅𧴜𧴜𧾍𨄅𨄅𨄑𨄩𨆁𨊘𨎹𨏟𨙍𨙍𨣚𨬬𨭖𨮍𨮎𨮢𨮱𨯫𨯫𨯬𨰄𨰈𨰮𨲵𨲷𨷙𨷣𨺥𨽣𨽣𩀫𩀫𩁉𩆐𩆭𩆮𩆮𩇆𩉊𩍏𩍕𩏈𩔸𩔸𩘍𩙈𩙈𩙰𩙰𩙼𩟎𩟎𩯅𩯟𩯟𩯤𩺱𩻪𩼃𩼤𩽱𪄄𪅶𪆠𪈷𪍻𪍻𪍽𪍽𪐌𪓼𪙛𪙵𪛆𪛇𪠯𪠯𪢤𪢤𪤢𪤢𪧰𪭄𪴋𪴋𪷄𪷛𪷤𪸈𪼮𫄈𫄊𫄿𫉞𫉞𫉣𫉾𫉿𫊃𫊊𫋖𫌎𫑧𫑧𫑾𫔑𫕑𫗴𫘰𫙻𫚫𫚫𫣕𫣡𫤁𫤇𫤖𫤖𫥛𫥛𫦚𫦜𫧜𫧜𫧭𫧭𫬦𫱧𫱻𫲃𫲮𫴗𫴩𫻒𫾡𫿝𫿣𬀞𬁗𬆈𬆸𬇅𬇅𬋋𬑀𬑀𬙉𬙪𬚅𬞜𬡭𬡰𬣖𬤠𬤠𬤨𬤨𬥍𬪙𬪸𬳤𬵸𬵸𬷶𬸴",
 "大": "僑冪勪嘺噳嬌屫嶠憍撟敽敿橋澞濗燆獢矯礄穚簥繑羃蕎藈蟜譑趫蹻轎鎹鐈鞽餸驕鱎鷮鸆㝯㠐㢗㮳㮸㴨䀉䎗䚩䢪𠙪𠿕𠿻𡁗𡃗𡑾𡫌𡰑𡰘𢄹𢆅𢐟𢕪𢱤𢲂𢸆𢸓𢺀𢻤𣋒𣞅𣤙𣪽𣯹𣾷𤂨𤅆𤅠𤢑𤩝𤩸𥀳𥋊𥵂𥵵𥷺𥼱𦒓𦘍𦪞𦷴𦺕𦾚𧄲𧄳𧕤𧕥𧬧𨃗𨃵𨆠𨇊𨝰𨫇𨲭𩇅𩠌𩦟𩦢𩯘𪆴𪋬𪍷𪝝𪝭𪞄𪢡𪩽𫊛𫡡𫣹𫦙𫧄𫮗𫮲𫯖𫲍𫶙𫺫𬁨𬄲𬓚𬔁𬚥𬝤𬟀𬣒𬸮",
 "子": "僝僝樼樼潺潺轏轏驏驏骣骣㵫㵫㻵㻵𠘈𠘈𠟉𠟉𢢁𢢁𢵔𢵔𤒙𥢨𥢨𦠳𦠳𨬖𨬖𨷙𩻣𩻣𪩖𪩖𫔏𫔏𫨟𫨟",
 "囗": "儃凛凜勯嬗廩廪憻懍擅旜檀檁氈氊澟澶燣璮癛皽繵膻薀蘊蟺襢譠邅顫颤饘驙鱣鳣鸇鹯㔊㣶䁴䃪䄠䆄䉡䕊䡀𠆞𠏟𠘐𠘡𠿞𡀫𡄁𡅘𡅹𡆎𡗋𢀮𢅒𢋃𢐹𢶸𢷆𢺎𣋊𣱭𤢏𤢤𤮜𤯑𤺺𥋶𥼷𦒜𦡣𦢵𦼹𧅕𧾍𨆁𨎹𨣚𨭖𨮍𨮢𨲵𨲷𨷇𨷐𩁉𩆐𩇆𩉊𩍕𩙼𩯤𩼤𩽱𪓼𪙥𪙵𪛇𪷤𫄊𫉿𫑾𫔑𫗴𫘰𫦜𫫓𫬶𫲃𫻒𫿝𫿣𬀞𬆸𬙉𬪙𬷶𬸴",
 "勹": "儆憼擎擏曔檠璥蟼警驚㢣㯳𠧂𢍸𢐧𢢩𤀂𨰈𩼃𫄿𫱻𬞜",
 "禾": "儮儮嚦嚦攊攊櫪櫪瀝瀝爏爏瓑瓑癧癧礰礰藶藶讈讈轣轣靂靂㠣㠣㱹㱹㺡㺡㿨㿨䍥䍥䟐䟐䥶䥶𠘟𠘟𠠝𠠝𠫏𠫏𡤌𡤌𡫯𡫯𡳸𡳸𢍷𢍷𢖙𢖙𢤩𢤩𣀥𣀥𣌜𣌜𤃹𤃹𤖢𤖢𤘃𤘃𥌮𥌮𥤀𥤀𥨻𥨻𥷒𥷒𦇔𦇔𦘊𦘊𦪾𦪾𧔝𧔝𧞿𧞿𧰡𧰡𧴠𧴠𨇗𨇗𨊛𨊛𨘸𨘸𨟑𨟑𨟟𨟟𨣷𨣷𨷦𨷦𩙖𩙖𩯺𩯺𩽏𩽏𪓀𪓀𪖍𪖍𪗁𪗁𪙽𪙽𫇀𫇀",
 "⺧": "儹儹劗劗囋囋巑巑攒攒攢攢欑欑灒灒瓒瓒瓚瓚礸礸禶禶穳穳籫籫纘纘缵缵臜臜臢臢襸襸讚讚趱趱趲趲躜躜躦躦酂酂酇酇鑽鑽饡饡㜺㜺㦫㦫䂎䂎䡽䡽䰖䰖𠓕𠓕𡿍𡿍𢑊𢑊𣀶𣀶𣀹𣀹𣪁𣪁𤓎𤓎𤿀𤿀𥎝𥎝𥽷𥽷𦫅𦫅𧄽𧄽𧹍𧹍𧹏𧹏𨤆𨤆𨳄𨳄𩎈𩎈𩵆𩵆𪚇𪚇𪴙𪴙𪷽𪷽𫲗𫲗𬖃𬖃𬡷𬡷𬤮𬤮",
 "儿": "儹儹劗劗勢囋囋巑巑摰擨攒攒攢攢暬槷槸欑欑渷灒灒熱瓒瓒瓚瓚礸礸禶禶穳穳籫籫纘纘缵缵臜臜臢臢蓺褹褻襸襸讚讚趱趱趲趲躜躜躦躦酂酂酇酇鑽鑽饡饡驇㙯㜺㜺㦫㦫㰊䂎䂎䓲䕭䞇䡽䡽䰖䰖𠐀𠓕𠓕𠪑𠾔𡂞𡠦𡣛𡫑𡿍𡿍𢄢𢅮𢑊𢑊𢯻𢳊𢴎𢸧𢸱𣀶𣀶𣀹𣀹𣪁𣪁𤍽𤓎𤓎𤮅𤿀𤿀𥎝𥎝𥡩𥲎𥽄𥽷𥽷𦢴𦫅𦫅𦳆𦸍𦸐𦽂𧀲𧃳𧄽𧄽𧅩𧓗𧜼𧭚𧹍𧹍𧹏𧹏𨤆𨤆𨳄𨳄𨺥𩎈𩎈𩏈𩕜𩘍𩵆𩵆𪚇𪚇𪧢𪴙𪴙𪷄𪷽𪷽𫌎𫮛𫱧𫲗𫲗𬓺𬖃𬖃𬞝𬡷𬡷𬤮𬤮𬷮",
 "日": "冪喧嘲媗廟愃戅戆戇揎搄撠擀暄暅楦橶檊渲漧潮澣濗濣瀚灗灨煊燙瑄璗盪睻碹箮簜簳縆縇羃羄翧萱蕩蝖蠴諠謿躤鍹鐊鐋霷鰚鸉㔶㨴䀍䙋䱴䳦𠊿𠋧𠎫𠎯𠕭𠖫𠝳𠷐𠼳𠼸𠽤𠾵𠿨𡁇𡃗𡍷𡐀𡑑𡔕𡡲𡢈𡪏𡫌𡺟𡼍𡼼𡾕𢀭𢆅𢖓𢠥𢡂𢢅𢣪𢥹𢦅𢯕𢴳𢴿𢷢𢸆𢸓𢺀𣉖𣊿𣋂𣌘𣎢𣕲𣘇𣛔𣛨𣿘𤁀𤂨𤅔𤅠𤌹𤚗𤟿𤠊𤸧𤺹𤻈𥀳𥂸𥋽𥨛𥳜𥴙𥵤𥵵𥷺𥸡𦄹𦋠𦞌𦶙𦺓𦻝𦼮𦼳𦼴𦾮𦿄𦿆𧃙𧄔𧄲𧆐𧐼𧑘𧕤𧕥𧖞𧗜𧡢𧾂𨄵𨅹𨈁𨕹𨗛𨝌𨝝𨫬𨯪𨰮𨼃𩀈𩁒𩇅𩋢𩎄𩏆𩘒𩝑𩤡𩯋𩻹𩼛𪃗𪅬𪆘𪇚𪈷𪟲𪤝𪤾𪮮𪳷𪶥𫉤𫑱𫕍𫕭𫙱𫡯𫤽𫧝𫮲𫲍𫶖𫾇𬀑𬉦𬉧𬔁𬕠𬕩𬘵𬛡𬝖𬣒𬤎𬧂𬫶𬬍𬳇",
 "䒑": "劂噘嶡嶥憠撅橛橜灍獗蕨蟨蟩蹶蹷鐝镢鱖鳜鷢㙭㜧㵐䙠𠎮𠢤𠢭𡡕𢅅𢴺𤛦𤺤𥕲𥕳𥗮𦠑𦪘𧂱𧽸𨇮𨬐𩀾𩦒𪆙𫞝𬘒",
 "屮": "劂噘嶡嶥憠撅橛橜灍獗蕨蟨蟩蹶蹷鐝镢鱖鳜鷢㙭㜧㵐䙠𠎮𠢤𠢭𡡕𢅅𢴺𤛦𤺤𥕲𥕳𥗮𦠑𦪘𧂱𧽸𨇮𨬐𩀾𩦒𪆙𫞝𬘒",
 "土": "勢嘊嘊摰暬槷槸漄漄濭灩熱爇瓂礚簓蓺藝褹褻鑉饚驇㙯㰊䕭䞇䡷䥵䥵𠑬𠑬𠪑𠽎𠽎𡂞𡃺𡃺𡃿𡆁𡆁𡠦𡣨𡫑𡮾𡮾𢄢𢅤𢅮𢣛𢤖𢤤𢤦𢳊𢷞𢸛𢸧𢸱𢺚𣝒𣞕𤂂𤂠𤃤𤃤𤃧𤄮𤄮𤍽𤮅𤻜𥊅𥊅𥍘𥍘𥡩𥲎𥶏𥷈𥽵𥽵𦈂𦈂𦟺𦟺𦣗𦣗𦶌𦸐𦸔𦹹𦹹𦽂𦾃𧃳𧄍𧄍𧅩𧐸𧔿𧖆𧜼𧞔𨖭𨖭𨞨𨽈𩍰𩕜𩕭𩡤𩰈𩰈𪄄𪧢𪷴𫇙𫉥𫊃𫠁𫫔𫫔𫮛𫮸𫸾𫾓𬓺𬘏𬘏𬛞𬛟𬞝𬡵𬲢𬲢𬷮",
 "凵": "厥嗍塑愬搠摛槊樆溯漓璃瘚瞝磀篱縌縭缡蒴蓠蝷螭褵謧遡遻醨鎙闕阙離魑麶黐㦍㮶㴑㵠㷰䄜䅻䍠䣞䬜𠊴𠌯𠏅𠟎𠟶𠸺𠻗𡀙𡂅𡍩𡏠𡏤𡑣𡴥𡼁𡼿𢍥𢟢𣉽𣖬𣯤𣺩𤗫𤡢𥉮𥕮𥖚𥻿𦃉𦃗𦔓𦗄𦞮𦡆𧅯𧪜𧫋𧴁𨝏𩥬𩺝𪄧𪅆𪇐𪈚𪈫𪒔𪖂𪤋𪱩𪲫𪹛𫀥𫁗𫏤𫏮𫒼𫔈𫬎𬂚𬂚𬂚𬓞𬓟𬶪",
 "󠄀": "厥嗍塑愬搠槊溯瘚磀縌蒴蝷遡遻鎙闕阙㦍㮶㴑䣞𠊴𠟎𠸺𡍩𡏤𢍥𣖬𣺩𥉮𦃉𦃗𦗄𦞮𧪜𧫋𩺝𪄧𪇐𪲫𪹛𫏤𫏮𫒼𫔈𬂚𬂚𬂚𬶪",
 "夂": "厬纄蘕虂鑝𡀩𡂫𡅅𡓄𡿃𢖓𢡦𢣅𢸚𢹷𣋛𣌔𣠑𣽞𤂧𤅟𤑫𤫢𥋷𥗳𥸐𧓶𧴟𨏕𨮎𪭄𫄈",
 "卜": "厬𣽞",
 "乚": "哗晔烨硴蒊誮錵铧骅㗾㟆㬸㳸𠝐𠵅𤦙𤰏𩋖𪉊𫈪𫖇𫚘𫢮𫫸𫰡𫺆𫼧𬆌𬑓𬦷𬧧𬩑",
 "十": "嗰嘲幮廟戅戆戇撠擀橶檊櫉櫥漧潮澣濣瀚灨簳羄蠎謿躕㔶㨴㵈䀍𠎫𠕭𠖫𠼏𠼳𠽤𠿨𡁇𡔕𡕁𡕁𡞢𡡲𡼼𢀭𢠥𢢅𢣪𢣴𢤹𢥹𢦅𢴿𢷢𣊿𣋂𣋢𣋢𣎢𣛔𣛨𤁀𤂫𤅆𤌹𥋽𥴙𥵤𥶜𥸡𦄹𦺓𦻝𦼮𦾮𧃙𧆐𧐼𧗜𧾂𨄵𨅹𨆼𨗛𨝌𨝝𨫬𨮱𨯪𨼃𩆩𩯋𩻹𩼛𪆘𪟲𪤾𪮮𪻋𫉣𫊊𫑱𫕭𫗻𫙱𫡯𫤽𫧝𫴶𫾇𬉦𬉧𬕩𬚅𬫶𬵾",
 "人": "噿噿濢濢瀲瀲璻璻籡籡籢籢籨籨膵膵臎臎蓌蓌薀蘊蘝蘝蘞蘞遳遳㯜㯜㵏㵏㶑㶑䊴䊴䕜䕜䥘䥘䥘䥘𠎥𠎥𠎥𠎥𠟏𠟏𠟏𠟏𠠬𠠬𠪞𠪞𠪞𠪞𡀬𡀬𡃍𡃍𡄥𡄥𡅘𡎻𡎻𡣝𡣝𡳥𡳥𢅸𢅸𢋻𢋻𢌃𢌃𢢒𢢒𢣃𢣃𢸟𢸟𢹦𢹦𢺅𢺅𢺎𣋽𣋽𣌋𣌋𣖵𣖵𣝦𣝦𣟺𣟺𣠇𣠇𣠺𣠺𣩸𣩸𣫢𣫢𣿈𣿈𤑯𤑯𤒡𤒡𤒥𤒥𤒦𤒦𤢾𤢾𤻒𤻒𤼏𤼏𥖮𥖮𦔡𦔡𦔡𦔡𦿘𦿘𧁴𧁴𧂹𧂹𧅕𧾀𧾀𧾀𧾀𨅇𨅇𨅦𨅦𨅦𨅦𨇓𨇓𨗀𨗀𨗀𨗀𨣋𨣋𨣋𨣋𨣻𨣻𨫈𨫈𨯘𨯘𨰇𨰇𨷇𨷐𩁆𩁆𩁆𩁆𩆯𩆯𩦗𩦗𩻶𩻶𩻶𩻶𪙮𪙮𪙮𪙮𪝬𪝬𪨃𪨃𪩪𪩪𪯞𪯞𪶶𪶶𪺀𪺀𫄆𫄆𫉡𫉡𫓚𫓚𫤐𫤐𫦢𫦢𫧷𫧷𫬮𫬮𫬶𫾒𫾒𫾛𫾛𬆜𬆜𬒫𬒫𬞚𬞚𬡳𬡳",
 "亠": "囄攡灏灕灗灝籬薩蘺㒧㒿㰚䍦䕲䙰𡂵𡓔𡾭𡿎𢌈𢤭𢥗𣌘𤂖𤃢𤄰𤒙𤒢𥶩𧕮𧖞𧮛𨯽𨰮𨷙𩎄𪈷𪐑𪥀𪺇𫻤",
 "凶": "囄攡灕籬蘺㒧㒿㰚䍦䙰𡿎𢌈𢥗𧕮𧮛𨯽𪐑𪺇",
 "坴": "囈襼讛𢺐𣡊",
 "丸": "囈襼讛𢺐𣡊",
 "糹": "囖𡆗𥘁",
 "隹": "囖躏䕶𡆗𤄀𥘁𧅰𧟝𫻞𫾢",
 "夭": "屩𡅫𡆌𡳯𢹣𥍑𧂼𨙍𪢤",
 "豆": "幮櫉櫥躕𨆼𩆩𪻋𫴶",
 "二": "廕癊罎蔭𤃅𤮦𦉡𩪺𪓂𪩿𪴘",
 "厶": "廕濭灩瓂癊礚罎蔭鑉饚㒍㒍䠁䠁䡷𠜸𠜸𡣨𡼊𡼊𢅤𢔘𢛠𢴱𢴱𢷞𣚎𣚎𣝒𣸫𣸫𤂠𤃅𤛡𤛡𤮎𤮎𤮦𤻜𥊻𥊻𥳮𥳮𦅍𦅍𦉡𦾃𧞔𧬀𧬀𨞨𨽈𩍰𩕭𩡤𩪺𪓂𪩿𪴘𫇙𫠁𬛟",
 "𠆢": "廫㵳㶀䀊𠐋𡫱𡽟𡽦𤁸𥗀𥵬𦆲𦾷𨟆𨮛𩼶𪇯𫚬𫜆𫬏𫲋",
 "彡": "廫㵳㶀䀊𠐋𡫱𡽟𡽦𤁸𥗀𥵬𦆲𦾷𨟆𨮛𩼶𪇯𫚬𫜆𫬏𫲋",
 "丁": "愆椼葕讆躛餰㗸㘅㦣䓷䕔䲗𡆚𡓎𢆈𢖨𢯼𣟉𣻚𣽣𤜂𥲋𥶽𦌫𦸇𧁬𧁮𧍢𧎘𧲔𧲝𧲞𧾦𨇙𩇐𩜾𪨜𬣔𬳆",
 "戊": "憾撼澸轗鱤鱵鳡㙳䃭䉞䌠䜗䥠䫲𠽦𠿑𢠔𢤝𢷄𣀣𣁀𣚘𣛴𣤮𣼪𣾃𣿎𤁙𤄌𤛸𥍒𥳒𥶳𥽇𦆃𦒝𦺘𦽫𧭻𨣝𨮼𩼘𪇅𪇳𪈁𪉕𪊄𪒯𪒹𫄅𫄏𫐘𫓏𬐴",
 "白": "摍樎縮缩蓿蹜鏥㜚㴼䈹䑿𠍊𡪴𢳔𣩐𤛝𥀝𥕯𥼍𦟱𧐴𨟨𨢲𨣡𩐼𩘰𩥿𪩻𫔊𫫠𫺿",
 "㐅": "摛樆漓璃瞝篱縭缡蓠螭褵襻襻謧醨鑻鑻離魑麶黐㷰䄜䅻䍠䬜𠌯𠻗𡂅𡏠𡴥𡼁𢟢𢺏𢺏𣉽𣯤𤗫𤡢𥕮𥜳𥜳𥻿𦔓𧅯𧴁𨝏𩥬𪅆𪒔𪖂𪤋𪱩𫀥𫬎𬓞𬓟",
 "丂": "摦槬𠿸𡀵𤬢𤬣𥧰𥱀𧪮𨃖𫈻𫉌𫏥𬞔",
 "虍": "擨𠐀𧓗",
 "丷": "擲蕛薩躑𡂸𢤜𤄰𤑾𤣀𥵪𥶼𦌢𦸫𧀿𧁂𧓸𨽛𩆰𩻋𫻤𬅈𬰐",
 "酉": "擲躑𡂸𢤜𤣀𧀿𧓸𬅈",
 "几": "攍瀊瀛灜籝籯蘙蠮㜲㬯㱻䃲䃷䌱䌴䑉䕦䯁䰔𠺱𡂑𡤖𡰠𢟈𢺆𢺑𣟅𣠾𤛓𤠼𤻧𤻷𤼘𥕨𦃵𦎼𦵶𦶐𦽮𧏤𧐜𧓙𧕪𧕳𧮒𨯤𨰊𨰠𪅏𪖃𪼪𫂯𫨁𫻐𫼈𬬛",
 "吅": "檶櫙藲藻䉩䥲𡂿𢋔𤁮𤒕𤮥𥗄𥩃𧂈𧅂𧞨𨊘𬥍",
 "甫": "欂礴鑮䭦𦢸𦣈𨏫𩍿𩏵𩽛𪎄𪚂𪚈𬮁",
 "寸": "欂瓙礴鑮䭦𠑥𢥰𤅕𤴃𦢸𦣈𨏫𩍿𩏵𩽛𪎄𪚂𪚈𪸈𫓘𫬦𫾡𬮁",
 "爿": "欌臟贜鑶㶓𡅆𡚥𡿄𢆮𣰾𤜐𦇴𧕨𨤃𩰅𪓅",
 "戈": "欌臟贜鑶㶓𡅆𡚥𡿄𢆮𣰾𤜐𦇴𧕨𨤃𩰅𪓅",
 "上": "漃蔋㰗䙯𡀌𡂔𢅪𢠭𢷾𥀽𦇰𦢑𦵦𧝴𫳺𫴇",
 "小": "漃灏灝蔋㰗䓾䙯𡀌𡂔𡂵𢅪𢠭𢷾𣘡𣯌𣯢𤂖𥀽𥶩𦇰𦢑𦵦𧝴𨪍𩺳𪍬𫳺𫴇",
 "又": "瀊蕿藧蘐蘙蠮䃲䕶䰔𡂑𡤖𤀣𤄀𤄓𤻧𤻷𥶍𦽮𧅰𧓙𧕪𧞈𧮒𪢚𪷠𪼪𫻞𫾢𬕯𬣊𬬛",
 "𠂉": "瀿蘩㩯𢖓𧁋𩎆𬪤𬹬",
 "母": "瀿蘩㩯𧁋𩎆𬪤𬹬",
 "回": "灗䕲𡓔𡾭𢤭𤃢𤒢𧖞𩎄𪥀",
 "刀": "燳㯣𣝠𥵕𬞦𬡰𬪸",
 "圥": "爇藝𣞕𪷴𫉥𫸾𫾓𬡵",
 "𦈢": "籞蘌𨯣",
 "卩": "籞蘌𦃕𨯣",
 "丰": "纄蘕鑝𡂫𡓄𢸚𣝠𣠑𤂧𤑫𧓶𧴟𨏕",
 "弔": "蕛𦌢𦸫𩻋𬰐",
 "𠂇": "蕿藧蘐㘃㥾䁥䘌𠍫𠻑𠽋𡃏𡠷𡽃𡽃𢔘𢛠𢡯𢢉𢢠𢢠𢴚𣘗𤀣𤎐𤏤𤏨𥳴𥶍𦺔𦻎𧞈𩁌𩁌𩺱𪐌𪙛𪷠𬕯𬣊𬥨𬳤",
 "厂": "薩靋𤄰𧄻𫭁𫻤",
 "卄": "藊𢴂𤻶𦽟𪝹𫣪𫣱𫤑𬄈𬞤",
 "木": "藵襻襻鑻鑻𡅢𡅢𢺏𢺏𤁋𤁋𤟆𥓑𥜳𥜳𨰨𨰨𫌕𫌕𫾐𫾐𬡭",
 "匚": "蘙蠮𡤖𧕪𧮒",
 "矢": "蘙蠮𡤖𤁰𤂥𧕪𧮒",
 "旦": "蘯𢥉𣜯𥗔𫫻𫱽𫻊𬁙",
 "勿": "蘯𢥉𥗔",
 "耂": "蠴𧄔",
 "灬": "躏",
 "龷": "躤𤅔𨈁",
 "秝": "靋𧄻𫭁",
 "八": "㯣𬞦",
 "屮": "㵠𠏅𠟶𡀙𡑣𡼿𥖚𦡆𪈚𪈫𫁗",
 "糸": "䕖",
 "艹": "䘈𢹘𤄆𥗠𩽡𫬺",
 "禺": "䘈𤄆𥗠",
 "巾": "𠍫𠻑𤏤𤏨𥵍𦻎𫬧",
 "女": "𠼸𪅬",
 "士": "𠿹𬊠",
 "月": "𡃏𢡯𥳴𦗿𦗿𦺔𫬉𫬉𬥨",
 "羊": "𡃿𤃧𧖆",
 "戌": "𡄏𥩇",
 "耳": "𡅺𤄓𩆭𪢚",
 "今": "𡓅𨯛𪷵",
 "云": "𡓅𨯛𪷵",
 "巛": "𡔏𢺠𧖇",
 "邑": "𡔏𢺠𧖇",
 "夕": "𡡶𫾊𬎈",
 "㔾": "𡡶𫾊𬎈",
 "冫": "𡤵",
 "欠": "𡤵",
 "工": "𡽃𡽃𢢠𢢠𩁌𩁌",
 "氶": "𡽮𬵴",
 "田": "𢣛𢤖𢤤𢤦𢺚𥷈𫮸𬛞",
 "早": "𢣴𫗻𬵾",
 "虫": "𢦃𢦃𤅱𤅱𧖂𧖂",
 "句": "𢹘𩽡𫬺",
 "产": "𢹵𧃯𪎅",
 "生": "𢹵𧃯𪎅",
 "囚": "𢺝",
 "皿": "𢺝",
 "火": "𣟕𣟕𤒇𤒇",
 "𠔼": "𤅣",
 "豕": "𤑾𥶼𧁂𧃶𨽛𩆰",
 "冖": "𤛓𤠼𦎼𧃶𧐜𪅏𪖃",
 "匕": "𤜑𤜑𥷾𥷾𧄾𧄾𧟍𧟍𨰟𨰟",
 "兀": "𤠴𥕜𦶤𦸌𦺊𦼍𪼒𫹊𬐐",
 "开": "𥵪",
 "夫": "𥸝𥸝",
 "立": "𧅜𫉾𬅋",
 "朩": "𧅜𬅋",
 "目": "𧟝𧟝",
 "止": "𧮝",
 "𣥂": "𧮝",
 "𠂆": "𪃫𫆱",
 "⺊": "𪙥𫫓",
 "酋": "𫊛",
 "⺅": "𫓘",
 "七": "𬵕"
}
},{}],"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose4.js":[function(require,module,exports){
module.exports={
 "凵": "劂噘囄嶡嶥憠撅攡橛橜灍灕獗籬蕨蘺蟨蟩蹶蹷鐝镢鱖鳜鷢㒧㒿㙭㜧㰚㵐䍦䙠䙰𠎮𠢤𠢭𡡕𡿎𢅅𢌈𢥗𢴺𤛦𤺤𥕲𥕳𥗮𦠑𦪘𧂱𧕮𧮛𧽸𨇮𨬐𨯽𩀾𩦒𪆙𪐑𪺇𫞝𬘒",
 "󠄀": "劂噘嶡嶥憠撅橛橜灍獗蕨蟨蟩蹶蹷鐝镢鱖鳜鷢㙭㜧㵐䙠𠎮𠢤𠢭𡡕𢅅𢴺𤛦𤺤𥕲𥕳𥗮𦠑𦪘𧂱𧽸𨇮𨬐𩀾𩦒𪆙𫞝𬘒",
 "丿": "劂噘屩嶡嶥憠撅擲橛橜瀿灍獗蕛蕨薩蘩蟨蟩蹶蹷躑鐝镢鱖鳜鷢㙭㜧㩯㵐䙠𠎮𠢤𠢭𡂸𡅫𡆌𡡕𡳯𢅅𢖓𢤜𢴺𢹣𤄰𤑾𤛦𤣀𤺤𥍑𥕲𥕳𥗮𥵪𥶼𦌢𦠑𦪘𦸫𧀿𧁂𧁋𧂱𧂼𧓸𧽸𨇮𨙍𨬐𨽛𩀾𩆰𩎆𩦒𩻋𪆙𪢤𫞝𫻤𬅈𬘒𬪤𬰐𬹬",
 "㐅": "囄攡灕籬蘺㒧㒿㰚䍦䙰𡿎𢌈𢥗𧕮𧮛𨯽𪐑𪺇",
 "圥": "囈襼讛𢺐𣡊",
 "土": "囈爇藝襼讛𢺐𣞕𣡊𪷴𫉥𫸾𫾓𬡵",
 "大": "屩𡅫𡆌𡳯𢹣𥍑𧂼𨙍𪢤",
 "丶": "擲蕛薩躑𡂸𢤜𤄰𤑾𤣀𥵪𥶼𦌢𦸫𧀿𧁂𧓸𨽛𩆰𩻋𫻤𬅈𬰐",
 "口": "檶檶櫙櫙灗藲藲藻藻䉩䉩䕲䥲䥲𡂿𡂿𡓔𡾭𢋔𢋔𢤭𢹘𤁮𤁮𤃢𤒕𤒕𤒢𤮥𤮥𥗄𥗄𥩃𥩃𧂈𧂈𧅂𧅂𧖞𧞨𧞨𨊘𨊘𩎄𩽡𪥀𫬺𬥍𬥍",
 "一": "瀿蘩蘯㩯𡄏𢖓𢥉𣜯𤅣𥗔𥩇𥵪𧁋𩎆𫫻𫱽𫻊𬁙𬪤𬹬",
 "囗": "灗䕲𡓔𡾭𢤭𢺝𤃢𤒢𧖞𩎄𪥀",
 "儿": "爇藝𣞕𪷴𫉥𫸾𫾓𬡵",
 "日": "蘯𢣴𢥉𣜯𥗔𫗻𫫻𫱽𫻊𬁙𬵾",
 "禾": "靋靋𧄻𧄻𫭁𫭁",
 "戊": "𡄏𥩇",
 "二": "𡓅𨯛𪷵",
 "厶": "𡓅𨯛𪷵",
 "十": "𢣴𫗻𬵾",
 "勹": "𢹘𩽡𫬺",
 "亠": "𢹵𧃯𪎅",
 "丷": "𢹵𧃯𪎅𫊛",
 "厂": "𢹵𧃯𪎅",
 "人": "𢺝",
 "冂": "𤅣",
 "廾": "𥵪",
 "酉": "𫊛"
}
},{}],"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose5.js":[function(require,module,exports){
module.exports={
 "土": "囈襼讛𢺐𣡊",
 "儿": "囈襼讛𢺐𣡊",
 "丶": "𢹵𧃯𪎅𫊛",
 "丿": "𢹵𧃯𪎅𫊛"
}
},{}],"C:\\ksana2015\\z0y\\node_modules\\idsdata\\index.js":[function(require,module,exports){
var decomposes=[require("./decompose0"),require("./decompose1"),require("./decompose2"),require("./decompose3"),require("./decompose4"),require("./decompose5")]
module.exports={decomposes:decomposes};
},{"./decompose0":"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose0.js","./decompose1":"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose1.js","./decompose2":"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose2.js","./decompose3":"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose3.js","./decompose4":"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose4.js","./decompose5":"C:\\ksana2015\\z0y\\node_modules\\idsdata\\decompose5.js"}],"C:\\ksana2015\\z0y\\node_modules\\kage\\index.js":[function(require,module,exports){
// Reference : http://www.cam.hi-ho.ne.jp/strong_warriors/teacher/chapter0{4,5}.html

function point(x, y){
  this.x = x;
  this.y = y;
}

function getCrossPoint(x11, y11, x12, y12, x21, y21, x22, y22){ // point
  var a1 = y12 - y11;
  var b1 = x11 - x12;
  var c1 = -1 * a1 * x11 - b1 * y11;
  var a2 = y22 - y21;
  var b2 = x21 - x22;
  var c2 = -1 * a2 * x21 - b2 * y21;
  
  var temp = b1 * a2 - b2 * a1;
  if(temp == 0){ // parallel
    return false;
  }
  return new point((c1 * b2 - c2 * b1) / temp, (a1 * c2 - a2 * c1) / temp);
}

function isCross(x11, y11, x12, y12, x21, y21, x22, y22){ // boolean
  var temp = getCrossPoint(x11, y11, x12, y12, x21, y21, x22, y22);
  if(!temp){ return false; }
  if(x11 < x12 && (temp.x < x11 || x12 < temp.x) ||
     x11 > x12 && (temp.x < x12 || x11 < temp.x) ||
     y11 < y12 && (temp.y < y11 || y12 < temp.y) ||
     y11 > y12 && (temp.y < y12 || y11 < temp.y)
     ){
    return false;
  }
  if(x21 < x22 && (temp.x < x21 || x22 < temp.x) ||
     x21 > x22 && (temp.x < x22 || x21 < temp.x) ||
     y21 < y22 && (temp.y < y21 || y22 < temp.y) ||
     y21 > y22 && (temp.y < y22 || y21 < temp.y)
     ){
    return false;
  }
  return true;
}

function isCrossBox(x1, y1, x2, y2, bx1, by1, bx2, by2){ // boolean
  if(isCross(x1, y1, x2, y2, bx1, by1, bx2, by1)){ return true; }
  if(isCross(x1, y1, x2, y2, bx2, by1, bx2, by2)){ return true; }
  if(isCross(x1, y1, x2, y2, bx1, by2, bx2, by2)){ return true; }
  if(isCross(x1, y1, x2, y2, bx1, by1, bx1, by2)){ return true; }
  return false;
}

function isCrossBoxWithOthers(strokesArray, i, bx1, by1, bx2, by2){ // boolean
  for(var j = 0; j < strokesArray.length; j++){
    if(i == j){ continue; }
    switch(strokesArray[j][0]){
    case 0:
    case 8:
    case 9:
      break;
    case 6:
    case 7:
      if(isCrossBox(strokesArray[j][7],
                    strokesArray[j][8],
                    strokesArray[j][9],
                    strokesArray[j][10],
                    bx1, by1, bx2, by2)){
        return true;
      }
    case 2:
    case 12:
    case 3:
      if(isCrossBox(strokesArray[j][5],
                    strokesArray[j][6],
                    strokesArray[j][7],
                    strokesArray[j][8],
                    bx1, by1, bx2, by2)){
        return true;
      }
    default:
      if(isCrossBox(strokesArray[j][3],
                    strokesArray[j][4],
                    strokesArray[j][5],
                    strokesArray[j][6],
                    bx1, by1, bx2, by2)){
        return true;
      }
    }
  }
  return false;
}

function isCrossWithOthers(strokesArray, i, bx1, by1, bx2, by2){ // boolean
  for(var j = 0; j < strokesArray.length; j++){
    if(i == j){ continue; }
    switch(strokesArray[j][0]){
    case 0:
    case 8:
    case 9:
      break;
    case 6:
    case 7:
      if(isCross(strokesArray[j][7],
                 strokesArray[j][8],
                 strokesArray[j][9],
                 strokesArray[j][10],
                 bx1, by1, bx2, by2)){
        return true;
      }
    case 2:
    case 12:
    case 3:
      if(isCross(strokesArray[j][5],
                 strokesArray[j][6],
                 strokesArray[j][7],
                 strokesArray[j][8],
                 bx1, by1, bx2, by2)){
        return true;
      }
    default:
      if(isCross(strokesArray[j][3],
                 strokesArray[j][4],
                 strokesArray[j][5],
                 strokesArray[j][6],
                 bx1, by1, bx2, by2)){
        return true;
      }
    }
  }
  return false;
}function Buhin(number){
  // method
  function set(name, data){ // void
    this.hash[name] = data;
  }
  Buhin.prototype.push = set;
  Buhin.prototype.set = set;
  
  function search(name){ // string
    if(this.hash[name]){
      return this.hash[name];
    }
    return ""; // no data
  }
  Buhin.prototype.search = search;
  
  // property
  this.hash = {};
  
  // initialize
  // no operation
  
  return this;
}function divide_curve(kage, x1, y1, sx1, sy1, x2, y2, curve, div_curve, off_curve){
  var rate = 0.5;
  var cut = Math.floor(curve.length * rate);
  var cut_rate = cut / curve.length;
  var tx1 = x1 + (sx1 - x1) * cut_rate;
  var ty1 = y1 + (sy1 - y1) * cut_rate;
  var tx2 = sx1 + (x2 - sx1) * cut_rate;
  var ty2 = sy1 + (y2 - sy1) * cut_rate;
  var tx3 = tx1 + (tx2 - tx1) * cut_rate;
  var ty3 = ty1 + (ty2 - ty1) * cut_rate;
  
  div_curve[0] = new Array();
  div_curve[1] = new Array();
  off_curve[0] = new Array(6);
  off_curve[1] = new Array(6);
  
  // must think about 0 : <0
  var i;
  for(i = 0; i <= cut; i++){
    div_curve[0].push(curve[i]);
  }
  off_curve[0][0] = x1;
  off_curve[0][1] = y1;
  off_curve[0][2] = tx1;
  off_curve[0][3] = ty1;
  off_curve[0][4] = tx3;
  off_curve[0][5] = ty3;
  
  for(i = cut; i < curve.length; i++){
    div_curve[1].push(curve[i]);
  }
  off_curve[1][0] = tx3;
  off_curve[1][1] = ty3;
  off_curve[1][2] = tx2;
  off_curve[1][3] = ty2;
  off_curve[1][4] = x2;
  off_curve[1][5] = y2;
}

// ------------------------------------------------------------------
function find_offcurve(kage, curve, sx, sy, result){
  var nx1, ny1, nx2, ny2, tx, ty;
  var minx, miny, count, diff;
  var tt, t, x, y, ix, iy;
  var mindiff = 100000;
  var area = 8;
  var mesh = 2;
  // area = 10   mesh = 5 -> 281 calcs
  // area = 10   mesh = 4 -> 180 calcs
  // area =  8   mesh = 4 -> 169 calcs
  // area =  7.5 mesh = 3 -> 100 calcs
  // area =  8   mesh = 2 ->  97 calcs
  // area =  7   mesh = 2 ->  80 calcs
  
  nx1 = curve[0][0];
  ny1 = curve[0][1];
  nx2 = curve[curve.length - 1][0];
  ny2 = curve[curve.length - 1][1];
  
  for(tx = sx - area; tx < sx + area; tx += mesh){
    for(ty = sy - area; ty < sy + area; ty += mesh){
      count = 0;
      diff = 0;
      for(tt = 0; tt < curve.length; tt++){
        t = tt / curve.length;
        
        //calculate a dot
        x = ((1.0 - t) * (1.0 - t) * nx1 + 2.0 * t * (1.0 - t) * tx + t * t * nx2);
        y = ((1.0 - t) * (1.0 - t) * ny1 + 2.0 * t * (1.0 - t) * ty + t * t * ny2);
        
        //KATAMUKI of vector by BIBUN
        ix = (nx1 - 2.0 * tx + nx2) * 2.0 * t + (-2.0 * nx1 + 2.0 * tx);
        iy = (ny1 - 2.0 * ty + ny2) * 2.0 * t + (-2.0 * ny1 + 2.0 * ty);
        
        diff += (curve[count][0] - x) * (curve[count][0] - x) + (curve[count][1] - y) * (curve[count][1] - y);
        if(diff > mindiff){
          tt = curve.length;
        }
        count++;
      }
      if(diff < mindiff){
        minx = tx;
        miny = ty;
        mindiff = diff;
      }
    }
  }
  
  for(tx = minx - mesh + 1; tx <= minx + mesh - 1; tx += 0.5){
    for(ty = miny - mesh + 1; ty <= miny + mesh - 1; ty += 0.5){
      count = 0;
      diff = 0;
      for(tt = 0; tt < curve.length; tt++){
        t = tt / curve.length;
        
        //calculate a dot
        x = ((1.0 - t) * (1.0 - t) * nx1 + 2.0 * t * (1.0 - t) * tx + t * t * nx2);
        y = ((1.0 - t) * (1.0 - t) * ny1 + 2.0 * t * (1.0 - t) * ty + t * t * ny2);
        
        //KATAMUKI of vector by BIBUN
        ix = (nx1 - 2.0 * tx + nx2) * 2.0 * t + (-2.0 * nx1 + 2.0 * tx);
        iy = (ny1 - 2.0 * ty + ny2) * 2.0 * t + (-2.0 * ny1 + 2.0 * ty);
        
        diff += (curve[count][0] - x) * (curve[count][0] - x) + (curve[count][1] - y) * (curve[count][1] - y);
        if(diff > mindiff){
          tt = curve.length;
        }
        count++;
      }
      if(diff < mindiff){
        minx = tx;
        miny = ty;
        mindiff = diff;
      }
    }
  }
  
  result[0] = nx1;
  result[1] = ny1;
  result[2] = minx;
  result[3] = miny;
  result[4] = nx2;
  result[5] = ny2;
  result[6] = mindiff;
}

// ------------------------------------------------------------------
function get_candidate(kage, curve, a1, a2, x1, y1, sx1, sy1, x2, y2, opt3, opt4){
  var x, y, ix, iy, ir, ia, ib, tt, t, deltad;
  var hosomi = 0.5;
  
  curve[0] = new Array();
  curve[1] = new Array();
  
  for(tt = 0; tt <= 1000; tt = tt + kage.kRate){
    t = tt / 1000;
    
    //calculate a dot
    x = ((1.0 - t) * (1.0 - t) * x1 + 2.0 * t * (1.0 - t) * sx1 + t * t * x2);
    y = ((1.0 - t) * (1.0 - t) * y1 + 2.0 * t * (1.0 - t) * sy1 + t * t * y2);
    
    //KATAMUKI of vector by BIBUN
    ix = (x1 - 2.0 * sx1 + x2) * 2.0 * t + (-2.0 * x1 + 2.0 * sx1);
    iy = (y1 - 2.0 * sy1 + y2) * 2.0 * t + (-2.0 * y1 + 2.0 * sy1);
    //line SUICHOKU by vector
    if(ix != 0 && iy != 0){
      ir = Math.atan(iy / ix * -1);
      ia = Math.sin(ir) * (kage.kMinWidthT);
      ib = Math.cos(ir) * (kage.kMinWidthT);
    }
    else if(ix == 0){
      ia = kage.kMinWidthT;
      ib = 0;
    }
    else{
      ia = 0;
      ib = kage.kMinWidthT;
    }
    
    if(a1 == 7 && a2 == 0){ // L2RD: fatten
      deltad = Math.pow(t, hosomi) * kage.kL2RDfatten;
    }
    else if(a1 == 7){
      deltad = Math.pow(t, hosomi);
    }
    else if(a2 == 7){
      deltad = Math.pow(1.0 - t, hosomi);
    }
    else if(opt3 > 0){
      deltad = (((kage.kMinWidthT - opt4 / 2) - opt3 / 2) / (kage.kMinWidthT - opt4 / 2)) + opt3 / 2 / (kage.kMinWidthT - opt4) * t;
    }
    else{ deltad = 1; }
    
    if(deltad < 0.15){
      deltad = 0.15;
    }
    ia = ia * deltad;
    ib = ib * deltad;
    
    //reverse if vector is going 2nd/3rd quadrants
    if(ix <= 0){
      ia = ia * -1;
      ib = ib * -1;
    }
    
    temp = new Array(2);
    temp[0] = x - ia;
    temp[1] = y - ib;
    curve[0].push(temp);
    temp = new Array(2);
    temp[0] = x + ia;
    temp[1] = y + ib;
    curve[1].push(temp);
  }
}function Kage(size){
  // method
  function makeGlyph(polygons, buhin){ // void
    var glyphData = this.kBuhin.search(buhin);
    this.makeGlyph2(polygons, glyphData);
  }
  Kage.prototype.makeGlyph = makeGlyph;
  
  function makeGlyph2(polygons, data){ // void
      if(data != ""){
	  var strokesArray = this.adjustKirikuchi(this.adjustUroko2(this.adjustUroko(this.adjustKakato(this.adjustTate(this.adjustMage(this.adjustHane(this.getEachStrokes(data))))))));
	  for(var i = 0; i < strokesArray.length; i++){
	      dfDrawFont(this, polygons,
			 strokesArray[i][0],
			 strokesArray[i][1],
			 strokesArray[i][2],
			 strokesArray[i][3],
			 strokesArray[i][4],
			 strokesArray[i][5],
			 strokesArray[i][6],
			 strokesArray[i][7],
			 strokesArray[i][8],
			 strokesArray[i][9],
			 strokesArray[i][10]);
	  }
      }
  }
  Kage.prototype.makeGlyph2 = makeGlyph2;
  
  function makeGlyph3(data){ // void
      var result = new Array();
      if(data != ""){
	  var strokesArray = this.adjustKirikuchi(this.adjustUroko2(this.adjustUroko(this.adjustKakato(this.adjustTate(this.adjustMage(this.adjustHane(this.getEachStrokes(data))))))));
	  for(var i = 0; i < strokesArray.length; i++){
	      var polygons = new Polygons();
	      dfDrawFont(this, polygons,
			 strokesArray[i][0],
			 strokesArray[i][1],
			 strokesArray[i][2],
			 strokesArray[i][3],
			 strokesArray[i][4],
			 strokesArray[i][5],
			 strokesArray[i][6],
			 strokesArray[i][7],
			 strokesArray[i][8],
			 strokesArray[i][9],
			 strokesArray[i][10]);
	      result.push(polygons);
	  }
      }
      return result;
  }
  Kage.prototype.makeGlyph3 = makeGlyph3;
  
  function getEachStrokes(glyphData){ // strokes array
    var strokesArray = new Array();
    var strokes = glyphData.split("$");
    for(var i = 0; i < strokes.length; i++){
      var columns = strokes[i].split(":");
      if(Math.floor(columns[0]) != 99){
        strokesArray.push([
          Math.floor(columns[0]),
          Math.floor(columns[1]),
          Math.floor(columns[2]),
          Math.floor(columns[3]),
          Math.floor(columns[4]),
          Math.floor(columns[5]),
          Math.floor(columns[6]),
          Math.floor(columns[7]),
          Math.floor(columns[8]),
          Math.floor(columns[9]),
          Math.floor(columns[10])
          ]);
      } else {
        var buhin = this.kBuhin.search(columns[7]);
        if(buhin != ""){
          strokesArray = strokesArray.concat(this.getEachStrokesOfBuhin(buhin,
                                                  Math.floor(columns[3]),
                                                  Math.floor(columns[4]),
                                                  Math.floor(columns[5]),
                                                  Math.floor(columns[6]),
                                                  Math.floor(columns[1]),
                                                  Math.floor(columns[2]),
                                                  Math.floor(columns[9]),
                                                  Math.floor(columns[10]))
                            );
        }
      }
    }
    return strokesArray;
  }
  Kage.prototype.getEachStrokes = getEachStrokes;
  
  function getEachStrokesOfBuhin(buhin, x1, y1, x2, y2, sx, sy, sx2, sy2){
    var temp = this.getEachStrokes(buhin);
    var result = new Array();
    var box = this.getBox(buhin);
      if(sx != 0 || sy != 0){
	  if(sx > 100){
	      sx -= 200; // Ç¤°ÕÅÀ¥â¡¼¥É
	  } else {
	      sx2 = 0; // Ãæ¿´ÅÀ¥â¡¼¥É
	      sy2 = 0;
	  }
      }
    for(var i = 0; i < temp.length; i++){
	if(sx != 0 || sy != 0){
	    temp[i][3] = stretch(sx, sx2, temp[i][3], box.minX, box.maxX);
	    temp[i][4] = stretch(sy, sy2, temp[i][4], box.minY, box.maxY);
	    temp[i][5] = stretch(sx, sx2, temp[i][5], box.minX, box.maxX);
	    temp[i][6] = stretch(sy, sy2,temp[i][6], box.minY, box.maxY);
	    if(temp[i][0] != 99){
		temp[i][7] = stretch(sx, sx2, temp[i][7], box.minX, box.maxX);	
		temp[i][8] = stretch(sy, sy2, temp[i][8], box.minY, box.maxY);
		temp[i][9] = stretch(sx, sx2, temp[i][9], box.minX, box.maxX);
		temp[i][10] = stretch(sy, sy2, temp[i][10], box.minY, box.maxY);
	    }
	}
      result.push([temp[i][0],
                   temp[i][1],
                   temp[i][2],
                   x1 + temp[i][3] * (x2 - x1) / 200,
                   y1 + temp[i][4] * (y2 - y1) / 200,
                   x1 + temp[i][5] * (x2 - x1) / 200,
                   y1 + temp[i][6] * (y2 - y1) / 200,
                   x1 + temp[i][7] * (x2 - x1) / 200,
                   y1 + temp[i][8] * (y2 - y1) / 200,
                   x1 + temp[i][9] * (x2 - x1) / 200,
                   y1 + temp[i][10] * (y2 - y1) / 200]);
    }
    return result;
  }
  Kage.prototype.getEachStrokesOfBuhin = getEachStrokesOfBuhin;
  
  function adjustHane(sa){ // strokesArray
      for(var i = 0; i < sa.length; i++){
	  if((sa[i][0] == 1 || sa[i][0] == 2 || sa[i][0] == 6) && sa[i][2] == 4){
	      var lpx; // lastPointX
	      var lpy; // lastPointY
	      if(sa[i][0] == 1){
		  lpx = sa[i][5];
		  lpy = sa[i][6];
	      } else if(sa[i][0] == 2){
		  lpx = sa[i][7];
		  lpy = sa[i][8];
	      } else {
		  lpx = sa[i][9];
		  lpy = sa[i][10];
	      }
	      var mn = Infinity; // mostNear
	      if(lpx + 18 < 100){
		  mn = lpx + 18;
	      }
	      for(var j = 0; j < sa.length; j++){
		  if(i != j && sa[j][0] == 1 && sa[j][3] == sa[j][5] && sa[j][3] < lpx && sa[j][4] <= lpy && sa[j][6] >= lpy){
		      if(lpx - sa[j][3] < 100){
			  mn = Math.min(mn, lpx - sa[j][3]);
		      }
		  }
	      }
	      if(mn != Infinity){
		  sa[i][2] += 700 - Math.floor(mn / 15) * 100; // 0-99 -> 0-700
	      }
	  }
      }
      return sa;
  }
  Kage.prototype.adjustHane = adjustHane;

  function adjustUroko(strokesArray){ // strokesArray
    for(var i = 0; i < strokesArray.length; i++){
      if(strokesArray[i][0] == 1 && strokesArray[i][2] == 0){ // no operation for TATE
        for(var k = 0; k < this.kAdjustUrokoLengthStep; k++){
          var tx, ty, tlen;
          if(strokesArray[i][4] == strokesArray[i][6]){ // YOKO
            tx = strokesArray[i][5] - this.kAdjustUrokoLine[k];
            ty = strokesArray[i][6] - 0.5;
            tlen = strokesArray[i][5] - strokesArray[i][3];
          } else {
            var rad = Math.atan((strokesArray[i][6] - strokesArray[i][4]) / (strokesArray[i][5] - strokesArray[i][3]));
            tx = strokesArray[i][5] - this.kAdjustUrokoLine[k] * Math.cos(rad) - 0.5 * Math.sin(rad);
            ty = strokesArray[i][6] - this.kAdjustUrokoLine[k] * Math.sin(rad) - 0.5 * Math.cos(rad);
            tlen = Math.sqrt((strokesArray[i][6] - strokesArray[i][4]) * (strokesArray[i][6] - strokesArray[i][4]) +
                             (strokesArray[i][5] - strokesArray[i][3]) * (strokesArray[i][5] - strokesArray[i][3]));
          }
          if(tlen < this.kAdjustUrokoLength[k] ||
             isCrossWithOthers(strokesArray, i, tx, ty, strokesArray[i][5], strokesArray[i][6])
             ){
            strokesArray[i][2] += (this.kAdjustUrokoLengthStep - k) * 100;
            k = Infinity;
          }
        }
      }
    }
    return strokesArray;
  }
  Kage.prototype.adjustUroko = adjustUroko;
  
  function adjustUroko2(strokesArray){ // strokesArray
    for(var i = 0; i < strokesArray.length; i++){
      if(strokesArray[i][0] == 1 && strokesArray[i][2] == 0 && strokesArray[i][4] == strokesArray[i][6]){
        var pressure = 0;
        for(var j = 0; j < strokesArray.length; j++){
          if(i != j && (
             (strokesArray[j][0] == 1 && strokesArray[j][4] == strokesArray[j][6] &&
              !(strokesArray[i][3] + 1 > strokesArray[j][5] || strokesArray[i][5] - 1 < strokesArray[j][3]) &&
              Math.abs(strokesArray[i][4] - strokesArray[j][4]) < this.kAdjustUroko2Length) ||
             (strokesArray[j][0] == 3 && strokesArray[j][6] == strokesArray[j][8] &&
              !(strokesArray[i][3] + 1 > strokesArray[j][7] || strokesArray[i][5] - 1 < strokesArray[j][5]) &&
              Math.abs(strokesArray[i][4] - strokesArray[j][6]) < this.kAdjustUroko2Length)
             )){
            pressure += Math.pow(this.kAdjustUroko2Length - Math.abs(strokesArray[i][4] - strokesArray[j][6]), 1.1);
          }
        }
        var result = Math.min(Math.floor(pressure / this.kAdjustUroko2Length), this.kAdjustUroko2Step) * 100;
        if(strokesArray[i][2] < result){
          strokesArray[i][2] = strokesArray[i][2] % 100 + Math.min(Math.floor(pressure / this.kAdjustUroko2Length), this.kAdjustUroko2Step) * 100;
        }
      }
    }
    return strokesArray;
  }
  Kage.prototype.adjustUroko2 = adjustUroko2;
  
  function adjustTate(strokesArray){ // strokesArray
    for(var i = 0; i < strokesArray.length; i++){
      if((strokesArray[i][0] == 1 || strokesArray[i][0] == 3 || strokesArray[i][0] == 7) && strokesArray[i][3] == strokesArray[i][5]){
        for(var j = 0; j < strokesArray.length; j++){
          if(i != j && (strokesArray[j][0] == 1 || strokesArray[j][0] == 3 || strokesArray[j][0] == 7) && strokesArray[j][3] == strokesArray[j][5] &&
             !(strokesArray[i][4] + 1 > strokesArray[j][6] || strokesArray[i][6] - 1 < strokesArray[j][4]) &&
             Math.abs(strokesArray[i][3] - strokesArray[j][3]) < this.kMinWidthT * this.kAdjustTateStep){
            strokesArray[i][1] += (this.kAdjustTateStep - Math.floor(Math.abs(strokesArray[i][3] - strokesArray[j][3]) / this.kMinWidthT)) * 1000;
            if(strokesArray[i][1] > this.kAdjustTateStep * 1000){
              strokesArray[i][1] = strokesArray[i][1] % 1000 + this.kAdjustTateStep * 1000;
            }
          }
        }
      }
    }
    return strokesArray;
  }
  Kage.prototype.adjustTate = adjustTate;
  
  function adjustMage(strokesArray){ // strokesArray
    for(var i = 0; i < strokesArray.length; i++){
      if((strokesArray[i][0] == 3) && strokesArray[i][6] == strokesArray[i][8]){
        for(var j = 0; j < strokesArray.length; j++){
          if(i != j && (
             (strokesArray[j][0] == 1 && strokesArray[j][4] == strokesArray[j][6] &&
              !(strokesArray[i][5] + 1 > strokesArray[j][5] || strokesArray[i][7] - 1 < strokesArray[j][3]) &&
              Math.abs(strokesArray[i][6] - strokesArray[j][4]) < this.kMinWidthT * this.kAdjustMageStep) ||
             (strokesArray[j][0] == 3 && strokesArray[j][6] == strokesArray[j][8] &&
              !(strokesArray[i][5] + 1 > strokesArray[j][7] || strokesArray[i][7] - 1 < strokesArray[j][5]) &&
              Math.abs(strokesArray[i][6] - strokesArray[j][6]) < this.kMinWidthT * this.kAdjustMageStep)
             )){
            strokesArray[i][2] += (this.kAdjustMageStep - Math.floor(Math.abs(strokesArray[i][6] - strokesArray[j][6]) / this.kMinWidthT)) * 1000;
            if(strokesArray[i][2] > this.kAdjustMageStep * 1000){
              strokesArray[i][2] = strokesArray[i][2] % 1000 + this.kAdjustMageStep * 1000;
            }
          }
        }
      }
    }
    return strokesArray;
  }
  Kage.prototype.adjustMage = adjustMage;
  
  function adjustKirikuchi(strokesArray){ // strokesArray
    for(var i = 0; i < strokesArray.length; i++){
      if(strokesArray[i][0] == 2 && strokesArray[i][1] == 32 &&
         strokesArray[i][3] > strokesArray[i][5] &&
         strokesArray[i][4] < strokesArray[i][6]){
        for(var j = 0; j < strokesArray.length; j++){ // no need to skip when i == j
          if(strokesArray[j][0] == 1 &&
             strokesArray[j][3] < strokesArray[i][3] && strokesArray[j][5] > strokesArray[i][3] &&
             strokesArray[j][4] == strokesArray[i][4] && strokesArray[j][4] == strokesArray[j][6]){
            strokesArray[i][1] = 132;
            j = strokesArray.length;
          }
        }
      }
    }
    return strokesArray;
  }
  Kage.prototype.adjustKirikuchi = adjustKirikuchi;
  
  function adjustKakato(strokesArray){ // strokesArray
    for(var i = 0; i < strokesArray.length; i++){
      if(strokesArray[i][0] == 1 &&
         (strokesArray[i][2] == 13 || strokesArray[i][2] == 23)){
        for(var k = 0; k < this.kAdjustKakatoStep; k++){
          if(isCrossBoxWithOthers(strokesArray, i,
                               strokesArray[i][5] - this.kAdjustKakatoRangeX / 2,
                               strokesArray[i][6] + this.kAdjustKakatoRangeY[k],
                               strokesArray[i][5] + this.kAdjustKakatoRangeX / 2,
                               strokesArray[i][6] + this.kAdjustKakatoRangeY[k + 1])
             | strokesArray[i][6] + this.kAdjustKakatoRangeY[k + 1] > 200 // adjust for baseline
             | strokesArray[i][6] - strokesArray[i][4] < this.kAdjustKakatoRangeY[k + 1] // for thin box
             ){
            strokesArray[i][2] += (3 - k) * 100;
            k = Infinity;
          }
        }
      }
    }
    return strokesArray;
  }
  Kage.prototype.adjustKakato = adjustKakato;
  
  function getBox(glyph){ // minX, minY, maxX, maxY
      var a = new Object();
      a.minX = 200;
      a.minY = 200;
      a.maxX = 0;
      a.maxY = 0;
      
      var strokes = this.getEachStrokes(glyph);
      for(var i = 0; i < strokes.length; i++){
	  if(strokes[i][0] == 0){ continue; }
	  a.minX = Math.min(a.minX, strokes[i][3]);
	  a.maxX = Math.max(a.maxX, strokes[i][3]);
	  a.minY = Math.min(a.minY, strokes[i][4]);
	  a.maxY = Math.max(a.maxY, strokes[i][4]);
	  a.minX = Math.min(a.minX, strokes[i][5]);
	  a.maxX = Math.max(a.maxX, strokes[i][5]);
	  a.minY = Math.min(a.minY, strokes[i][6]);
	  a.maxY = Math.max(a.maxY, strokes[i][6]);
	  if(strokes[i][0] == 1){ continue; }
	  if(strokes[i][0] == 99){ continue; }
	  a.minX = Math.min(a.minX, strokes[i][7]);
	  a.maxX = Math.max(a.maxX, strokes[i][7]);
	  a.minY = Math.min(a.minY, strokes[i][8]);
	  a.maxY = Math.max(a.maxY, strokes[i][8]);
	  if(strokes[i][0] == 2){ continue; }
	  if(strokes[i][0] == 3){ continue; }
	  if(strokes[i][0] == 4){ continue; }
	  a.minX = Math.min(a.minX, strokes[i][9]);
	  a.maxX = Math.max(a.maxX, strokes[i][9]);
	  a.minY = Math.min(a.minY, strokes[i][10]);
	  a.maxY = Math.max(a.maxY, strokes[i][10]);
      }
      return a;
  }
  Kage.prototype.getBox = getBox;

  function stretch(dp, sp, p, min, max){ // interger
      var p1, p2, p3, p4;
      if(p < sp + 100){
	  p1 = min;
	  p3 = min;
	  p2 = sp + 100;
	  p4 = dp + 100;
      } else {
	  p1 = sp + 100;
	  p3 = dp + 100;
	  p2 = max;
	  p4 = max;
      }
      return Math.floor(((p - p1) / (p2 - p1)) * (p4 - p3) + p3);
  }
  Kage.prototype.stretch = stretch;

  //properties
  Kage.prototype.kMincho = 0;
  Kage.prototype.kGothic = 1;
  this.kShotai = this.kMincho;
  
  this.kRate = 100;
  
  if(size == 1){
    this.kMinWidthY = 1.2;
    this.kMinWidthT = 3.6;
    this.kWidth = 3;
    this.kKakato = 1.8;
    this.kL2RDfatten = 1.1;
    this.kMage = 6;
    this.kUseCurve = 0;
    
    this.kAdjustKakatoL = ([8, 5, 3, 1]); // for KAKATO adjustment 000,100,200,300
    this.kAdjustKakatoR = ([4, 3, 2, 1]); // for KAKATO adjustment 000,100,200,300
    this.kAdjustKakatoRangeX = 12; // check area width
    this.kAdjustKakatoRangeY = ([1, 11, 14, 18]); // 3 steps of checking
    this.kAdjustKakatoStep = 3; // number of steps
    
    this.kAdjustUrokoX = ([14, 12, 9, 7]); // for UROKO adjustment 000,100,200,300
    this.kAdjustUrokoY = ([7, 6, 5, 4]); // for UROKO adjustment 000,100,200,300
    this.kAdjustUrokoLength = ([13, 21, 30]); // length for checking
    this.kAdjustUrokoLengthStep = 3; // number of steps
    this.kAdjustUrokoLine = ([13, 15, 18]); // check for crossing. corresponds to length
  } else {
    this.kMinWidthY = 2;
    this.kMinWidthT = 6;
    this.kWidth = 5;
    this.kKakato = 3;
    this.kL2RDfatten = 1.1;
    this.kMage = 10;
    this.kUseCurve = 0;
    
    this.kAdjustKakatoL = ([14, 9, 5, 2]); // for KAKATO adjustment 000,100,200,300
    this.kAdjustKakatoR = ([8, 6, 4, 2]); // for KAKATO adjustment 000,100,200,300
    this.kAdjustKakatoRangeX = 20; // check area width
    this.kAdjustKakatoRangeY = ([1, 19, 24, 30]); // 3 steps of checking
    this.kAdjustKakatoStep = 3; // number of steps
    
    this.kAdjustUrokoX = ([24, 20, 16, 12]); // for UROKO adjustment 000,100,200,300
    this.kAdjustUrokoY = ([12, 11, 9, 8]); // for UROKO adjustment 000,100,200,300
    this.kAdjustUrokoLength = ([22, 36, 50]); // length for checking
    this.kAdjustUrokoLengthStep = 3; // number of steps
    this.kAdjustUrokoLine = ([22, 26, 30]); // check for crossing. corresponds to length
    
    this.kAdjustUroko2Step = 3;
    this.kAdjustUroko2Length = 40;
    
    this.kAdjustTateStep = 4;
    
    this.kAdjustMageStep = 5;
  }
  
  this.kBuhin = new Buhin();
  
  return this;
}
function cdDrawCurveU(kage, polygons, x1, y1, sx1, sy1, sx2, sy2, x2, y2, ta1, ta2){
  var rad, t;
  var x, y, v;
  var ix, iy, ia, ib, ir;
  var tt;
  var delta;
  var deltad;
  var XX, XY, YX, YY;
  var poly, poly2;
  var hosomi;
  var kMinWidthT, kMinWidthT2;
  var a1, a2, opt1, opt2, opt3, opt4;
  
  if(kage.kShotai == kage.kMincho){ // mincho
    a1 = ta1 % 1000;
    a2 = ta2 % 100;
    opt1 = Math.floor((ta1 % 10000) / 1000);
    opt2 = Math.floor((ta2 % 1000) / 100);
    opt3 = Math.floor(ta1 / 10000);
    opt4 = Math.floor(ta2 / 1000);
    
    kMinWidthT = kage.kMinWidthT - opt1 / 2;
    kMinWidthT2 = kage.kMinWidthT - opt4 / 2;
    
    switch(a1 % 100){
    case 0:
    case 7:
      delta = -1 * kage.kMinWidthY * 0.5;
      break;
    case 1:
    case 2: // ... must be 32
    case 6:
    case 22:
    case 32: // changed
      delta = 0;
      break;
    case 12:
    //case 32:
      delta = kage.kMinWidthY;
      break;
    default:
      break;
    }
    
    if(x1 == sx1){
      if(y1 < sy1){ y1 = y1 - delta; }
      else{ y1 = y1 + delta; }
    }
    else if(y1 == sy1){
      if(x1 < sx1){ x1 = x1 - delta; }
      else{ x1 = x1 + delta; }
    }
    else{
      rad = Math.atan((sy1 - y1) / (sx1 - x1));
      if(x1 < sx1){ v = 1; } else{ v = -1; }
      x1 = x1 - delta * Math.cos(rad) * v;
      y1 = y1 - delta * Math.sin(rad) * v;
    }
    
    switch(a2 % 100){
    case 0:
    case 1:
    case 7:
    case 9:
    case 15: // it can change to 15->5
    case 14: // it can change to 14->4
    case 17: // no need
    case 5:
      delta = 0;
      break;
    case 8: // get shorten for tail's circle
      delta = -1 * kMinWidthT * 0.5;
      break;
    default:
      break;
    }
    
    if(sx2 == x2){
      if(sy2 < y2){ y2 = y2 + delta; }
      else{ y2 = y2 - delta; }
    }
    else if(sy2 == y2){
      if(sx2 < x2){ x2 = x2 + delta; }
      else{ x2 = x2 - delta; }
    }
    else{
      rad = Math.atan((y2 - sy2) / (x2 - sx2));
      if(sx2 < x2){ v = 1; } else{ v = -1; }
      x2 = x2 + delta * Math.cos(rad) * v;
      y2 = y2 + delta * Math.sin(rad) * v;
    }
    
    hosomi = 0.5;
    if(Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) < 50){
      hosomi += 0.4 * (1 - Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) / 50);
    }
    
    //---------------------------------------------------------------
    
    poly = new Polygon();
    poly2 = new Polygon();
    
    if(sx1 == sx2 && sy1 == sy2){ // Spline
      if(kage.kUseCurve){
        // generating fatten curve -- begin
        var kage2 = new Kage();
        kage2.kMinWidthY = kage.kMinWidthY;
        kage2.kMinWidthT = kMinWidthT;
        kage2.kWidth = kage.kWidth;
        kage2.kKakato = kage.kKakato;
        kage2.kRate = 10;
        
        var curve = new Array(2); // L and R
        get_candidate(kage2, curve, a1, a2, x1, y1, sx1, sy1, x2, y2, opt3, opt4);
        
        var dcl12_34 = new Array(2);
        var dcr12_34 = new Array(2);
        var dpl12_34 = new Array(2);
        var dpr12_34 = new Array(2);
        divide_curve(kage2, x1, y1, sx1, sy1, x2, y2, curve[0], dcl12_34, dpl12_34);
        divide_curve(kage2, x1, y1, sx1, sy1, x2, y2, curve[1], dcr12_34, dpr12_34);
        
        var ncl1 = new Array(7);
        var ncl2 = new Array(7);
        find_offcurve(kage2, dcl12_34[0], dpl12_34[0][2], dpl12_34[0][3], ncl1);
        find_offcurve(kage2, dcl12_34[1], dpl12_34[1][2], dpl12_34[1][3], ncl2);
        
        poly.push(ncl1[0], ncl1[1]);
        poly.push(ncl1[2], ncl1[3], 1);
        poly.push(ncl1[4], ncl1[5]);
        poly.push(ncl2[2], ncl2[3], 1);
        poly.push(ncl2[4], ncl2[5]);
        
        poly2.push(dcr12_34[0][0][0], dcr12_34[0][0][1]);
        poly2.push(dpr12_34[0][2] - (ncl1[2] - dpl12_34[0][2]), dpl12_34[0][3] - (ncl1[3] - dpl12_34[0][3]), 1);
        poly2.push(dcr12_34[0][dcr12_34[0].length - 1][0], dcr12_34[0][dcr12_34[0].length - 1][1]);
        poly2.push(dpr12_34[1][2] - (ncl2[2] - dpl12_34[1][2]), dpl12_34[1][3] - (ncl2[3] - dpl12_34[1][3]), 1);
        poly2.push(dcr12_34[1][dcr12_34[1].length - 1][0], dcr12_34[1][dcr12_34[1].length - 1][1]);
        
        poly2.reverse();
        poly.concat(poly2);
        polygons.push(poly);
        // generating fatten curve -- end
      } else {
        for(tt = 0; tt <= 1000; tt = tt + kage.kRate){
          t = tt / 1000;
          
          // calculate a dot
          x = ((1.0 - t) * (1.0 - t) * x1 + 2.0 * t * (1.0 - t) * sx1 + t * t * x2);
          y = ((1.0 - t) * (1.0 - t) * y1 + 2.0 * t * (1.0 - t) * sy1 + t * t * y2);
          
          // KATAMUKI of vector by BIBUN
          ix = (x1 - 2.0 * sx1 + x2) * 2.0 * t + (-2.0 * x1 + 2.0 * sx1);
          iy = (y1 - 2.0 * sy1 + y2) * 2.0 * t + (-2.0 * y1 + 2.0 * sy1);
          
          // line SUICHOKU by vector
          if(ix != 0 && iy != 0){
            ir = Math.atan(iy / ix * -1);
            ia = Math.sin(ir) * (kMinWidthT);
            ib = Math.cos(ir) * (kMinWidthT);
          }
          else if(ix == 0){
            ia = kMinWidthT;
            ib = 0;
          }
          else{
            ia = 0;
            ib = kMinWidthT;
          }
          
          if(a1 == 7 && a2 == 0){ // L2RD: fatten
            deltad = Math.pow(t, hosomi) * kage.kL2RDfatten;
          }
          else if(a1 == 7){
            deltad = Math.pow(t, hosomi);
          }
          else if(a2 == 7){
            deltad = Math.pow(1.0 - t, hosomi);
          }
          else if(opt3 > 0 || opt4 > 0){
              deltad = ((kage.kMinWidthT - opt3 / 2) - (opt4 - opt3) / 2 * t) / kage.kMinWidthT;
          }
          else{ deltad = 1; }
          
          if(deltad < 0.15){
            deltad = 0.15;
          }
          ia = ia * deltad;
          ib = ib * deltad;
          
          //reverse if vector is going 2nd/3rd quadrants
          if(ix <= 0){
            ia = ia * -1;
            ib = ib * -1;
          }
          
          //copy to polygon structure
          poly.push(x - ia, y - ib);
          poly2.push(x + ia, y + ib);
        }
        
        // suiheisen ni setsuzoku
        if(a1 == 132){
          var index = 0;
          while(true){
            if(poly2.array[index].y <= y1 && y1 <= poly2.array[index + 1].y){
              break;
            }
            index++;
          }
          newx1 = poly2.array[index + 1].x + (poly2.array[index].x - poly2.array[index + 1].x) *
            (poly2.array[index + 1].y - y1) / (poly2.array[index + 1].y - poly2.array[index].y);
          newy1 = y1;
          newx2 = poly.array[0].x + (poly.array[0].x - poly.array[1].x) * (poly.array[0].y - y1) /
            (poly.array[1].y - poly.array[0].y);
          newy2 = y1;
          
          for(var i = 0; i < index; i++){
            poly2.shift();
          }
          poly2.set(0, newx1, newy1);
          poly.unshift(newx2, newy2);
        }
        
        // suiheisen ni setsuzoku 2
        if(a1 == 22 && y1 > y2){
          var index = 0;
          while(true){
            if(poly2.array[index].y <= y1 && y1 <= poly2.array[index + 1].y){
              break;
            }
            index++;
          }
          newx1 = poly2.array[index + 1].x + (poly2.array[index].x - poly2.array[index + 1].x) *
            (poly2.array[index + 1].y - y1) / (poly2.array[index + 1].y - poly2.array[index].y);
          newy1 = y1;
          newx2 = poly.array[0].x + (poly.array[0].x - poly.array[1].x - 1) * (poly.array[0].y - y1) /
            (poly.array[1].y - poly.array[0].y);
          newy2 = y1 + 1;
          
          for(var i = 0; i < index; i++){
            poly2.shift();
          }
          poly2.set(0, newx1, newy1);
          poly.unshift(newx2, newy2);
        }
        
        poly2.reverse();
        poly.concat(poly2);
        polygons.push(poly);
      }
    } else { // Bezier
      for(tt = 0; tt <= 1000; tt = tt + kage.kRate){
        t = tt / 1000;
        
        // calculate a dot
        x = (1.0 - t) * (1.0 - t) * (1.0 - t) * x1 + 3.0 * t * (1.0 - t) * (1.0 - t) * sx1 + 3 * t * t * (1.0 - t) * sx2 + t * t * t * x2;
        y = (1.0 - t) * (1.0 - t) * (1.0 - t) * y1 + 3.0 * t * (1.0 - t) * (1.0 - t) * sy1 + 3 * t * t * (1.0 - t) * sy2 + t * t * t * y2;
        // KATAMUKI of vector by BIBUN
        ix = t * t * (-3 * x1 + 9 * sx1 + -9 * sx2 + 3 * x2) + t * (6 * x1 + -12 * sx1 + 6 * sx2) + -3 * x1 + 3 * sx1;
        iy = t * t * (-3 * y1 + 9 * sy1 + -9 * sy2 + 3 * y2) + t * (6 * y1 + -12 * sy1 + 6 * sy2) + -3 * y1 + 3 * sy1;
        
        // line SUICHOKU by vector
        if(ix != 0 && iy != 0){
          ir = Math.atan(iy / ix * -1);
          ia = Math.sin(ir) * (kMinWidthT);
          ib = Math.cos(ir) * (kMinWidthT);
        }
        else if(ix == 0){
          ia = kMinWidthT;
          ib = 0;
        }
        else{
          ia = 0;
          ib = kMinWidthT;
        }
        
        if(a1 == 7 && a2 == 0){ // L2RD: fatten
          deltad = Math.pow(t, hosomi) * kage.kL2RDfatten;
        }
        else if(a1 == 7){
          deltad = Math.pow(t, hosomi);
          deltad = Math.pow(deltad, 0.7); // make fatten
        }
        else if(a2 == 7){
          deltad = Math.pow(1.0 - t, hosomi);
        }
        else{ deltad = 1; }
        
        if(deltad < 0.15){
          deltad = 0.15;
        }
        ia = ia * deltad;
        ib = ib * deltad;
        
        //reverse if vector is going 2nd/3rd quadrants
        if(ix <= 0){
          ia = ia * -1;
          ib = ib * -1;
        }
        
        //copy to polygon structure
        poly.push(x - ia, y - ib);
        poly2.push(x + ia, y + ib);
      }
      
      // suiheisen ni setsuzoku
      if(a1 == 132){
        var index = 0;
        while(true){
          if(poly2.array[index].y <= y1 && y1 <= poly2.array[index + 1].y){
            break;
          }
          index++;
        }
        newx1 = poly2.array[index + 1].x + (poly2.array[index].x - poly2.array[index + 1].x) *
          (poly2.array[index + 1].y - y1) / (poly2.array[index + 1].y - poly2.array[index].y);
        newy1 = y1;
        newx2 = poly.array[0].x + (poly.array[0].x - poly.array[1].x) * (poly.array[0].y - y1) /
          (poly.array[1].y - poly.array[0].y);
        newy2 = y1;
        
        for(var i = 0; i < index; i++){
          poly2.shift();
        }
        poly2.set(0, newx1, newy1);
        poly.unshift(newx2, newy2);
      }
      
      // suiheisen ni setsuzoku 2
      if(a1 == 22){
        var index = 0;
        while(true){
          if(poly2.array[index].y <= y1 && y1 <= poly2.array[index + 1].y){
            break;
          }
          index++;
        }
        newx1 = poly2.array[index + 1].x + (poly2.array[index].x - poly2.array[index + 1].x) *
          (poly2.array[index + 1].y - y1) / (poly2.array[index + 1].y - poly2.array[index].y);
        newy1 = y1;
        newx2 = poly.array[0].x + (poly.array[0].x - poly.array[1].x - 1) * (poly.array[0].y - y1) /
          (poly.array[1].y - poly.array[0].y);
        newy2 = y1 + 1;
        
        for(var i = 0; i < index; i++){
          poly2.shift();
        }
        poly2.set(0, newx1, newy1);
        poly.unshift(newx2, newy2);
      }
      
      poly2.reverse();
      poly.concat(poly2);
      polygons.push(poly);
    }
    
    //process for head of stroke
    rad = Math.atan((sy1 - y1) / (sx1 - x1));
    if(x1 < sx1){ v = 1; } else{ v = -1; }
    XX = Math.sin(rad) * v;
    XY = Math.cos(rad) * v * -1;
    YX = Math.cos(rad) * v;
    YY = Math.sin(rad) * v;
    
    if(a1 == 12){
      if(x1 == x2){
        poly= new Polygon();
        poly.push(x1 - kMinWidthT, y1);
        poly.push(x1 + kMinWidthT, y1);
        poly.push(x1 - kMinWidthT, y1 - kMinWidthT);
        polygons.push(poly);
      }
      else{
        poly = new Polygon();
        poly.push(x1 - kMinWidthT * XX, y1 - kMinWidthT * XY);
        poly.push(x1 + kMinWidthT * XX, y1 + kMinWidthT * XY);
        poly.push(x1 - kMinWidthT * XX - kMinWidthT * YX, y1 - kMinWidthT * XY - kMinWidthT * YY);
        polygons.push(poly);
      }
    }
    
    var type;
    var pm = 0;
    if(a1 == 0){
      if(y1 <= y2){ //from up to bottom
        type = (Math.atan2(Math.abs(y1 - sy1), Math.abs(x1 - sx1)) / Math.PI * 2 - 0.4);
        if(type > 0){
          type = type * 2;
        } else {
          type = type * 16;
        }
        if(type < 0){
          pm = -1;
        } else {
          pm = 1;
        }
        if(x1 == sx1){
          poly = new Polygon();
          poly.push(x1 - kMinWidthT, y1 + 1);
          poly.push(x1 + kMinWidthT, y1);
          poly.push(x1 - kMinWidthT * pm, y1 - kage.kMinWidthY * type * pm);
          //if(x1 > x2){
          //  poly.reverse();
          //}
          polygons.push(poly);
        }
        else{
          poly = new Polygon();
          poly.push(x1 - kMinWidthT * XX + 1 * YX, y1 - kMinWidthT * XY + 1 * YY);
          poly.push(x1 + kMinWidthT * XX, y1 + kMinWidthT * XY);
          poly.push(x1 - kMinWidthT * pm * XX - kage.kMinWidthY * type * pm * YX, y1 - kMinWidthT * pm * XY - kage.kMinWidthY * type * pm * YY);
          //if(x1 > x2){
          //  poly.reverse();
          //}
          polygons.push(poly);
        }
      }
      else{ //bottom to up
        if(x1 == sx1){
          poly = new Polygon();
          poly.push(x1 - kMinWidthT, y1);
          poly.push(x1 + kMinWidthT, y1);
          poly.push(x1 + kMinWidthT, y1 - kage.kMinWidthY);
          polygons.push(poly);
        }
        else{
          poly = new Polygon();
          poly.push(x1 - kMinWidthT * XX, y1 - kMinWidthT * XY);
          poly.push(x1 + kMinWidthT * XX, y1 + kMinWidthT * XY);
          poly.push(x1 + kMinWidthT * XX - kage.kMinWidthY * YX, y1 + kMinWidthT * XY - kage.kMinWidthY * YY);
          //if(x1 < x2){
          //  poly.reverse();
          //}
          polygons.push(poly);
        }
      }
    }
    
    if(a1 == 22){ //box's up-right corner, any time same degree
      poly = new Polygon();
      poly.push(x1 - kMinWidthT, y1 - kage.kMinWidthY);
      poly.push(x1, y1 - kage.kMinWidthY - kage.kWidth);
      poly.push(x1 + kMinWidthT + kage.kWidth, y1 + kage.kMinWidthY);
      poly.push(x1 + kMinWidthT, y1 + kMinWidthT - 1);
      poly.push(x1 - kMinWidthT, y1 + kMinWidthT + 4);
      polygons.push(poly);
    }
    
    if(a1 == 0){ //beginning of the stroke
      if(y1 <= y2){ //from up to bottom
        if(pm > 0){
          type = 0;
        }
        var move = kage.kMinWidthY * type * pm;
        if(x1 == sx1){
          poly = new Polygon();
          poly.push(x1 + kMinWidthT, y1 - move);
          poly.push(x1 + kMinWidthT * 1.5, y1 + kage.kMinWidthY - move);
          poly.push(x1 + kMinWidthT - 2, y1 + kage.kMinWidthY * 2 + 1);
          polygons.push(poly);
        }
        else{
          poly = new Polygon();
          poly.push(x1 + kMinWidthT * XX - move * YX,
                    y1 + kMinWidthT * XY - move * YY);
          poly.push(x1 + kMinWidthT * 1.5 * XX + (kage.kMinWidthY - move * 1.2) * YX,
                    y1 + kMinWidthT * 1.5 * XY + (kage.kMinWidthY - move * 1.2) * YY);
          poly.push(x1 + (kMinWidthT - 2) * XX + (kage.kMinWidthY * 2 - move * 0.8 + 1) * YX,
                    y1 + (kMinWidthT - 2) * XY + (kage.kMinWidthY * 2 - move * 0.8 + 1) * YY);
          //if(x1 < x2){
          //  poly.reverse();
          //}
          polygons.push(poly);
        }
      }
      else{ //from bottom to up
        if(x1 == sx1){
          poly = new Polygon();
          poly.push(x1 - kMinWidthT, y1);
          poly.push(x1 - kMinWidthT * 1.5, y1 + kage.kMinWidthY);
          poly.push(x1 - kMinWidthT * 0.5, y1 + kage.kMinWidthY * 3);
          polygons.push(poly);
        }
        else{
          poly = new Polygon();
          poly.push(x1 - kMinWidthT * XX, y1 - kMinWidthT * XY);
          poly.push(x1 - kMinWidthT * 1.5 * XX + kage.kMinWidthY * YX, y1 + kage.kMinWidthY * YY - kMinWidthT * 1.5 * XY);
          poly.push(x1 - kMinWidthT * 0.5 * XX + kage.kMinWidthY * 3 * YX, y1 + kage.kMinWidthY * 3 * YY - kMinWidthT * 0.5 * XY);
          //if(x1 < x2){
          //  poly.reverse();
          //}
          polygons.push(poly);
        }
      }
    }
    
    //process for tail
    rad = Math.atan((y2 - sy2) / (x2 - sx2));
    if(sx2 < x2){ v = 1; } else{ v = -1; }
    YX = Math.sin(rad) * v * -1;
    YY = Math.cos(rad) * v;
    XX = Math.cos(rad) * v;
    XY = Math.sin(rad) * v;
    
    if(a2 == 1 || a2 == 8 || a2 == 15){ //the last filled circle ... it can change 15->5
      if(sx2 == x2){
        poly = new Polygon();
        if(kage.kUseCurve){
          // by curve path
          poly.push(x2 - kMinWidthT2, y2);
          poly.push(x2 - kMinWidthT2 * 0.9, y2 + kMinWidthT2 * 0.9, 1);
          poly.push(x2, y2 + kMinWidthT2);
          poly.push(x2 + kMinWidthT2 * 0.9, y2 + kMinWidthT2 * 0.9, 1);
          poly.push(x2 + kMinWidthT2, y2);
        } else {
          // by polygon
          poly.push(x2 - kMinWidthT2, y2);
          poly.push(x2 - kMinWidthT2 * 0.7, y2 + kMinWidthT2 * 0.7);
          poly.push(x2, y2 + kMinWidthT2);
          poly.push(x2 + kMinWidthT2 * 0.7, y2 + kMinWidthT2 * 0.7);
          poly.push(x2 + kMinWidthT2, y2);
        }
        polygons.push(poly);
      }
      else if(sy2 == y2){
        poly = new Polygon();
        if(kage.kUseCurve){
          // by curve path
          poly.push(x2, y2 - kMinWidthT2);
          poly.push(x2 + kMinWidthT2 * 0.9, y2 - kMinWidthT2 * 0.9, 1);
          poly.push(x2 + kMinWidthT2, y2);
          poly.push(x2 + kMinWidthT2 * 0.9, y2 + kMinWidthT2 * 0.9, 1);
          poly.push(x2, y2 + kMinWidthT2);
        } else {
          // by polygon
          poly.push(x2, y2 - kMinWidthT2);
          poly.push(x2 + kMinWidthT2 * 0.7, y2 - kMinWidthT2 * 0.7);
          poly.push(x2 + kMinWidthT2, y2);
          poly.push(x2 + kMinWidthT2 * 0.7, y2 + kMinWidthT2 * 0.7);
          poly.push(x2, y2 + kMinWidthT2);
        }
        polygons.push(poly);
      }
      else{
        poly = new Polygon();
        if(kage.kUseCurve){
          poly.push(x2 + Math.sin(rad) * kMinWidthT2 * v, y2 - Math.cos(rad) * kMinWidthT2 * v);
          poly.push(x2 + Math.cos(rad) * kMinWidthT2 * 0.9 * v + Math.sin(rad) * kMinWidthT2 * 0.9 * v,
                    y2 + Math.sin(rad) * kMinWidthT2 * 0.9 * v - Math.cos(rad) * kMinWidthT2 * 0.9 * v, 1);
          poly.push(x2 + Math.cos(rad) * kMinWidthT2 * v, y2 + Math.sin(rad) * kMinWidthT2 * v);
          poly.push(x2 + Math.cos(rad) * kMinWidthT2 * 0.9 * v - Math.sin(rad) * kMinWidthT2 * 0.9 * v,
                    y2 + Math.sin(rad) * kMinWidthT2 * 0.9 * v + Math.cos(rad) * kMinWidthT2 * 0.9 * v, 1);
          poly.push(x2 - Math.sin(rad) * kMinWidthT2 * v, y2 + Math.cos(rad) * kMinWidthT2 * v);
        } else {
          poly.push(x2 + Math.sin(rad) * kMinWidthT2 * v, y2 - Math.cos(rad) * kMinWidthT2 * v);
          poly.push(x2 + Math.cos(rad) * kMinWidthT2 * 0.7 * v + Math.sin(rad) * kMinWidthT2 * 0.7 * v,
                    y2 + Math.sin(rad) * kMinWidthT2 * 0.7 * v - Math.cos(rad) * kMinWidthT2 * 0.7 * v);
          poly.push(x2 + Math.cos(rad) * kMinWidthT2 * v, y2 + Math.sin(rad) * kMinWidthT2 * v);
          poly.push(x2 + Math.cos(rad) * kMinWidthT2 * 0.7 * v - Math.sin(rad) * kMinWidthT2 * 0.7 * v,
                    y2 + Math.sin(rad) * kMinWidthT2 * 0.7 * v + Math.cos(rad) * kMinWidthT2 * 0.7 * v);
          poly.push(x2 - Math.sin(rad) * kMinWidthT2 * v, y2 + Math.cos(rad) * kMinWidthT2 * v);
        }
        polygons.push(poly);
      }
    }
    
    if(a2 == 9 || (a1 == 7 && a2 == 0)){ // Math.sinnyu & L2RD Harai ... no need for a2=9
      var type = (Math.atan2(Math.abs(y2 - sy2), Math.abs(x2 - sx2)) / Math.PI * 2 - 0.6);
      if(type > 0){
        type = type * 8;
      } else {
        type = type * 3;
      }
      var pm = 0;
      if(type < 0){
        pm = -1;
      } else {
        pm = 1;
      }
      if(sy2 == y2){
        poly = new Polygon();
        poly.push(x2, y2 + kMinWidthT * kage.kL2RDfatten);
        poly.push(x2, y2 - kMinWidthT * kage.kL2RDfatten);
        poly.push(x2 + kMinWidthT * kage.kL2RDfatten * Math.abs(type), y2 + kMinWidthT * kage.kL2RDfatten * pm);
        polygons.push(poly);
      }
      else{
        poly = new Polygon();
        poly.push(x2 + kMinWidthT * kage.kL2RDfatten * YX, y2 + kMinWidthT * kage.kL2RDfatten * YY);
        poly.push(x2 - kMinWidthT * kage.kL2RDfatten * YX, y2 - kMinWidthT * kage.kL2RDfatten * YY);
        poly.push(x2 + kMinWidthT * kage.kL2RDfatten * Math.abs(type) * XX + kMinWidthT * kage.kL2RDfatten * pm * YX,
                  y2 + kMinWidthT * kage.kL2RDfatten * Math.abs(type) * XY + kMinWidthT * kage.kL2RDfatten * pm * YY);
        polygons.push(poly);
      }
    }
    
    if(a2 == 15){ //jump up ... it can change 15->5
      // anytime same degree
      poly = new Polygon();
      if(y1 < y2){
        poly.push(x2, y2 - kMinWidthT + 1);
        poly.push(x2 + 2, y2 - kMinWidthT - kage.kWidth * 5);
        poly.push(x2, y2 - kMinWidthT - kage.kWidth * 5);
        poly.push(x2 - kMinWidthT, y2 - kMinWidthT + 1);
      } else {
        poly.push(x2, y2 + kMinWidthT - 1);
        poly.push(x2 - 2, y2 + kMinWidthT + kage.kWidth * 5);
        poly.push(x2, y2 + kMinWidthT + kage.kWidth * 5);
        poly.push(x2 + kMinWidthT, y2 + kMinWidthT - 1);
      }
      polygons.push(poly);
    }
    
    if(a2 == 14){ //jump to left, allways go left
      poly = new Polygon();
      poly.push(x2, y2);
      poly.push(x2, y2 - kMinWidthT);
      poly.push(x2 - kage.kWidth * 4 * Math.min(1 - opt2 / 10, Math.pow(kMinWidthT / kage.kMinWidthT, 3)), y2 - kMinWidthT);
      poly.push(x2 - kage.kWidth * 4 * Math.min(1 - opt2 / 10, Math.pow(kMinWidthT / kage.kMinWidthT, 3)), y2 - kMinWidthT * 0.5);
      //poly.reverse();
      polygons.push(poly);
    }
  }
  else{ //gothic
    if(a1 % 10 == 2){
      if(x1 == sx1){
        if(y1 < sy1){ y1 = y1 - kage.kWidth; } else{ y1 = y1 + kage.kWidth; }
      }
      else if(y1 == sy1){
        if(x1 < sx1){ x1 = x1 - kage.kWidth; } else{ x1 = x1 + kage.kWidth; }
      }
      else{
        rad = Math.atan((sy1 - y1) / (sx1 - x1));
        if(x1 < sx1){ v = 1; } else{ v = -1; }
        x1 = x1 - kage.kWidth * Math.cos(rad) * v;
        y1 = y1 - kage.kWidth * Math.sin(rad) * v;
      }
    }
    
    if(a1 % 10 == 3){
      if(x1 == sx1){
        if(y1 < sy1){
          y1 = y1 - kage.kWidth * kage.kKakato;
        }
        else{
          y1 = y1 + kage.kWidth * kage.kKakato;
        }
      }
      else if(y1 == sy1){
        if(x1 < sx1){
          x1 = x1 - kage.kWidth * kage.kKakato;
        }
        else{
          x1 = x1 + kage.kWidth * kage.kKakato;
        }
      }
      else{
        rad = Math.atan((sy1 - y1) / (sx1 - x1));
        if(x1 < sx1){ v = 1; } else{ v = -1; }
        x1 = x1 - kage.kWidth * Math.cos(rad) * v * kage.kKakato;
        y1 = y1 - kage.kWidth * Math.sin(rad) * v * kage.kKakato;
      }
    }
    if(a2 % 10 == 2){
      if(sx2 == x2){
        if(sy2 < y2){ y2 = y2 + kage.kWidth; } else{ y2 = y2 - kage.kWidth; }
      }
      else if(sy2 == y2){
        if(sx2 < x2){ x2 = x2 + kage.kWidth; } else{ x2 = x2 - kage.kWidth; }
      }
      else{
        rad = Math.atan((y2 - sy2) / (x2 - sx2));
        if(sx2 < x2){ v = 1; } else{ v = -1; }
        x2 = x2 + kage.kWidth * Math.cos(rad) * v;
        y2 = y2 + kage.kWidth * Math.sin(rad) * v;
      }
    }
    
    if(a2 % 10 == 3){
      if(sx2 == x2){
        if(sy2 < y2){
          y2 = y2 + kage.kWidth * kage.kKakato;
        }
        else{
          y2 = y2 - kage.kWidth * kage.kKakato;
        }
      }
      else if(sy2 == y2){
        if(sx2 < x2){
          x2 = x2 + kage.kWidth * kage.kKakato;
        }
        else{
          x2 = x2 - kage.kWidth * kage.kKakato;
        }
      }
      else{
        rad = Math.atan((y2 - sy2) / (x2 - sx2));
        if(sx2 < x2){ v = 1; } else{ v = -1; }
        x2 = x2 + kage.kWidth * Math.cos(rad) * v * kage.kKakato;
        y2 = y2 + kage.kWidth * Math.sin(rad) * v * kage.kKakato;
      }
    }
    
    poly = new Polygon();
    poly2 = new Polygon();
    
    for(tt = 0; tt <= 1000; tt = tt + kage.kRate){
      t = tt / 1000;
      
      if(sx1 == sx2 && sy1 == sy2){
        //calculating each point
        x = ((1.0 - t) * (1.0 - t) * x1 + 2.0 * t * (1.0 - t) * sx1 + t * t * x2);
        y = ((1.0 - t) * (1.0 - t) * y1 + 2.0 * t * (1.0 - t) * sy1 + t * t * y2);
        
        //SESSEN NO KATAMUKI NO KEISAN(BIBUN)
        ix = (x1 - 2.0 * sx1 + x2) * 2.0 * t + (-2.0 * x1 + 2.0 * sx1);
        iy = (y1 - 2.0 * sy1 + y2) * 2.0 * t + (-2.0 * y1 + 2.0 * sy1);
      } else {
      }
      //SESSEN NI SUICHOKU NA CHOKUSEN NO KEISAN
      if(kage.kShotai == kage.kMincho){ //always false ?
        if(ix != 0 && iy != 0){
          ir = Math.atan(iy / ix * -1.0);
          ia = Math.sin(ir) * kage.kMinWidthT;
          ib = Math.cos(ir) * kage.kMinWidthT;
        }
        else if(ix == 0){
          ia = kage.kMinWidthT;
          ib = 0;
        }
        else{
          ia = 0;
          ib = kage.kMinWidthT;
        }
        ia = ia * Math.sqrt(1.0 - t);
        ib = ib * Math.sqrt(1.0 - t);
      }
      else{
        if(ix != 0 && iy != 0){
          ir = Math.atan(iy / ix * -1.0);
          ia = Math.sin(ir) * kage.kWidth;
          ib = Math.cos(ir) * kage.kWidth;
        }
        else if(ix == 0){
          ia = kage.kWidth;
          ib = 0;
        }
        else{
          ia = 0;
          ib = kage.kWidth;
        }
      }
      
      //reverse if vector is going 2nd/3rd quadrants
      if(ix <= 0){
        ia = ia * -1;
        ib = ib * -1;
      }
      
      //save to polygon
      poly.push(x - ia, y - ib);
      poly2.push(x + ia, y + ib);
    }
    
    poly2.reverse();
    poly.concat(poly2);
    polygons.push(poly);
  }
}

function cdDrawBezier(kage, polygons, x1, y1, x2, y2, x3, y3, x4, y4, a1, a2){
  cdDrawCurveU(kage, polygons, x1, y1, x2, y2, x3, y3, x4, y4, a1, a2);
}

function cdDrawCurve(kage, polygons, x1, y1, x2, y2, x3, y3, a1, a2){
  cdDrawCurveU(kage, polygons, x1, y1, x2, y2, x2, y2, x3, y3, a1, a2);
}

function cdDrawLine(kage, polygons, tx1, ty1, tx2, ty2, ta1, ta2){
  var rad;
  var v, x1, y1, x2, y2;
  var a1, a2, opt1, opt2;
  var XX, XY, YX, YY;
  var poly;
  var kMinWidthT;
  
  if(kage.kShotai == kage.kMincho){ //mincho
    x1 = tx1;
    y1 = ty1;
    x2 = tx2;
    y2 = ty2;
    a1 = ta1 % 1000;
    a2 = ta2 % 100;
    opt1 = Math.floor(ta1 / 1000);
    opt2 = Math.floor(ta2 / 100);
    
    kMinWidthT = kage.kMinWidthT - opt1 / 2;
    
    if(x1 == x2){ //if TATE stroke, use y-axis
      poly = new Polygon(4);
      switch(a1){
      case 0:
        poly.set(3, x1 - kMinWidthT, y1 - kage.kMinWidthY / 2);
        poly.set(0, x1 + kMinWidthT, y1 + kage.kMinWidthY / 2);
        break;
      case 1:
      case 6: //... no need
      case 22:
        poly.set(3, x1 - kMinWidthT, y1);
        poly.set(0, x1 + kMinWidthT, y1);
        break;
      case 12:
        poly.set(3, x1 - kMinWidthT, y1 - kage.kMinWidthY - kMinWidthT);
        poly.set(0, x1 + kMinWidthT, y1 - kage.kMinWidthY);
        break;
      case 32:
        poly.set(3, x1 - kMinWidthT, y1 - kage.kMinWidthY);
        poly.set(0, x1 + kMinWidthT, y1 - kage.kMinWidthY);
        break;
      }
      
      switch(a2){
      case 0:
        if(a1 == 6){ //KAGI's tail ... no need
          poly.set(2, x2 - kMinWidthT, y2);
          poly.set(1, x2 + kMinWidthT, y2);
        }
        else{
          poly.set(2, x2 - kMinWidthT, y2 + kMinWidthT / 2);
          poly.set(1, x2 + kMinWidthT, y2 - kMinWidthT / 2);
        }
        break;
      case 1:
        poly.set(2, x2 - kMinWidthT, y2);
        poly.set(1, x2 + kMinWidthT, y2);
        break;
      case 13:
        poly.set(2, x2 - kMinWidthT, y2 + kage.kAdjustKakatoL[opt2] + kMinWidthT);
        poly.set(1, x2 + kMinWidthT, y2 + kage.kAdjustKakatoL[opt2]);
        break;
      case 23:
        poly.set(2, x2 - kMinWidthT, y2 + kage.kAdjustKakatoR[opt2] + kMinWidthT);
        poly.set(1, x2 + kMinWidthT, y2 + kage.kAdjustKakatoR[opt2]);
        break;
      case 32:
        poly.set(2, x2 - kMinWidthT, y2 + kage.kMinWidthY);
        poly.set(1, x2 + kMinWidthT, y2 + kage.kMinWidthY);
        break;
      }
      
      polygons.push(poly);
      
      if(a1 == 22){ //box's right top corner
        poly = new Polygon();
        poly.push(x1 - kMinWidthT, y1 - kage.kMinWidthY);
        poly.push(x1, y1 - kage.kMinWidthY - kage.kWidth);
        poly.push(x1 + kMinWidthT + kage.kWidth, y1 + kage.kMinWidthY);
        poly.push(x1 + kMinWidthT, y1 + kMinWidthT);
        poly.push(x1 - kMinWidthT, y1);
        polygons.push(poly);
      }
      
      if(a1 == 0){ //beginning of the stroke
        poly = new Polygon();
        poly.push(x1 + kMinWidthT, y1 + kage.kMinWidthY * 0.5);
        poly.push(x1 + kMinWidthT + kMinWidthT * 0.5, y1 + kage.kMinWidthY * 0.5 + kage.kMinWidthY);
        poly.push(x1 + kMinWidthT - 2, y1 + kage.kMinWidthY * 0.5 + kage.kMinWidthY * 2 + 1);
        polygons.push(poly);
      }
      
      if((a1 == 6 && a2 == 0) || a2 == 1){ //KAGI NO YOKO BOU NO SAIGO NO MARU ... no need only used at 1st=yoko
        poly = new Polygon();
	if(kage.kUseCurve){
          poly.push(x2 - kMinWidthT, y2);
          poly.push(x2 - kMinWidthT * 0.9, y2 + kMinWidthT * 0.9, 1);
          poly.push(x2, y2 + kMinWidthT);
          poly.push(x2 + kMinWidthT * 0.9, y2 + kMinWidthT * 0.9, 1);
          poly.push(x2 + kMinWidthT, y2);
        } else {
          poly.push(x2 - kMinWidthT, y2);
          poly.push(x2 - kMinWidthT * 0.6, y2 + kMinWidthT * 0.6);
          poly.push(x2, y2 + kMinWidthT);
          poly.push(x2 + kMinWidthT * 0.6, y2 + kMinWidthT * 0.6);
          poly.push(x2 + kMinWidthT, y2);
        }
        //poly.reverse(); // for fill-rule
        polygons.push(poly);
      }
    }
    else if(y1 == y2){ //if it is YOKO stroke, use x-axis
      if(a1 == 6){ //if it is KAGI's YOKO stroke, get bold
        poly = new Polygon();
        poly.push(x1, y1 - kMinWidthT);
        poly.push(x2, y2 - kMinWidthT);
        poly.push(x2, y2 + kMinWidthT);
        poly.push(x1, y1 + kMinWidthT);
        polygons.push(poly);
        
        if(a2 == 1 || a2 == 0 || a2 == 5){ // no need a2=1
          //KAGI NO YOKO BOU NO SAIGO NO MARU
          poly = new Polygon();
          if(kage.kUseCurve){
            if(x1 < x2){
              poly.push(x2, y2 - kMinWidthT);
              poly.push(x2 + kMinWidthT * 0.9, y2 - kMinWidthT * 0.9, 1);
              poly.push(x2 + kMinWidthT, y2);
              poly.push(x2 + kMinWidthT * 0.9, y2 + kMinWidthT * 0.9, 1);
              poly.push(x2, y2 + kMinWidthT);
            } else {
              poly.push(x2, y2 - kMinWidthT);
              poly.push(x2 - kMinWidthT * 0.9, y2 - kMinWidthT * 0.9, 1);
              poly.push(x2 - kMinWidthT, y2);
              poly.push(x2 - kMinWidthT * 0.9, y2 + kMinWidthT * 0.9, 1);
              poly.push(x2, y2 + kMinWidthT);
            }
          } else {
            if(x1 < x2){
              poly.push(x2, y2 - kMinWidthT);
              poly.push(x2 + kMinWidthT * 0.6, y2 - kMinWidthT * 0.6);
              poly.push(x2 + kMinWidthT, y2);
              poly.push(x2 + kMinWidthT * 0.6, y2 + kMinWidthT * 0.6);
              poly.push(x2, y2 + kMinWidthT);
            } else {
              poly.push(x2, y2 - kMinWidthT);
              poly.push(x2 - kMinWidthT * 0.6, y2 - kMinWidthT * 0.6);
              poly.push(x2 - kMinWidthT, y2);
              poly.push(x2 - kMinWidthT * 0.6, y2 + kMinWidthT * 0.6);
              poly.push(x2, y2 + kMinWidthT);
            }
          }
          polygons.push(poly);
        }
        
        if(a2 == 5){
          //KAGI NO YOKO BOU NO HANE
          poly = new Polygon();
          if(x1 < x2){
            poly.push(x2, y2 - kMinWidthT + 1);
            poly.push(x2 + 2, y2 - kMinWidthT - kage.kWidth * (4 * (1 - opt1 / kage.kAdjustMageStep) + 1));
            poly.push(x2, y2 - kMinWidthT - kage.kWidth * (4 * (1 - opt1 / kage.kAdjustMageStep) + 1));
            poly.push(x2 - kMinWidthT, y2 - kMinWidthT + 1);
          } else {
            poly.push(x2, y2 - kMinWidthT + 1);
            poly.push(x2 - 2, y2 - kMinWidthT - kage.kWidth * (4 * (1 - opt1 / kage.kAdjustMageStep) + 1));
            poly.push(x2, y2 - kMinWidthT - kage.kWidth * (4 * (1 - opt1 / kage.kAdjustMageStep) + 1));
            poly.push(x2 + kMinWidthT, y2 - kMinWidthT + 1);
          }
          //poly.reverse(); // for fill-rule
          polygons.push(poly);
        }
      }
      else{
        //always same
        poly = new Polygon(4);
        poly.set(0, x1, y1 - kage.kMinWidthY);
        poly.set(1, x2, y2 - kage.kMinWidthY);
        poly.set(2, x2, y2 + kage.kMinWidthY);
        poly.set(3, x1, y1 + kage.kMinWidthY);
        polygons.push(poly);
        
        //UROKO
        if(a2 == 0){
          poly = new Polygon();
          poly.push(x2, y2 - kage.kMinWidthY);
          poly.push(x2 - kage.kAdjustUrokoX[opt2], y2);
          poly.push(x2 - kage.kAdjustUrokoX[opt2] / 2, y2 - kage.kAdjustUrokoY[opt2]);
          polygons.push(poly);
        }
      }
    }
    else{ //for others, use x-axis
      rad = Math.atan((y2 - y1) / (x2 - x1));
      if((Math.abs(y2 - y1) < Math.abs(x2 - x1)) && (a1 != 6) && (a2 != 6) && !(x1 > x2)){ //ASAI KAUDO
        //always same
        poly = new Polygon(4);
        poly.set(0, x1 + Math.sin(rad) * kage.kMinWidthY, y1 - Math.cos(rad) * kage.kMinWidthY);
        poly.set(1, x2 + Math.sin(rad) * kage.kMinWidthY, y2 - Math.cos(rad) * kage.kMinWidthY);
        poly.set(2, x2 - Math.sin(rad) * kage.kMinWidthY, y2 + Math.cos(rad) * kage.kMinWidthY);
        poly.set(3, x1 - Math.sin(rad) * kage.kMinWidthY, y1 + Math.cos(rad) * kage.kMinWidthY);
        polygons.push(poly);
        
        //UROKO
        if(a2 == 0){
          poly = new Polygon();
          poly.push(x2 + Math.sin(rad) * kage.kMinWidthY, y2 - Math.cos(rad) * kage.kMinWidthY);
          poly.push(x2 - Math.cos(rad) * kage.kAdjustUrokoX[opt2], y2 - Math.sin(rad) * kage.kAdjustUrokoX[opt2]);
          poly.push(x2 - Math.cos(rad) * kage.kAdjustUrokoX[opt2] / 2 + Math.sin(rad) * kage.kAdjustUrokoX[opt2] / 2, y2 - Math.sin(rad) * kage.kAdjustUrokoY[opt2] - Math.cos(rad) * kage.kAdjustUrokoY[opt2]);
          polygons.push(poly);
        }
      }
      
      else{ //KAKUDO GA FUKAI or KAGI NO YOKO BOU
        if(x1 > x2){ v = -1; } else{ v = 1; }
        poly = new Polygon(4);
        switch(a1){
        case 0:
          poly.set(0, x1 + Math.sin(rad) * kMinWidthT * v + kage.kMinWidthY * Math.cos(rad) * 0.5 * v,
                   y1 - Math.cos(rad) * kMinWidthT * v + kage.kMinWidthY * Math.sin(rad) * 0.5 * v);
          poly.set(3, x1 - Math.sin(rad) * kMinWidthT * v - kage.kMinWidthY * Math.cos(rad) * 0.5 * v,
                   y1 + Math.cos(rad) * kMinWidthT * v - kage.kMinWidthY * Math.sin(rad) * 0.5 * v);
          break;
        case 1:
        case 6:
          poly.set(0, x1 + Math.sin(rad) * kMinWidthT * v, y1 - Math.cos(rad) * kMinWidthT * v);
          poly.set(3, x1 - Math.sin(rad) * kMinWidthT * v, y1 + Math.cos(rad) * kMinWidthT * v);
          break;
        case 12:
          poly.set(0, x1 + Math.sin(rad) * kMinWidthT * v - kage.kMinWidthY * Math.cos(rad) * v,
                   y1 - Math.cos(rad) * kMinWidthT * v - kage.kMinWidthY * Math.sin(rad) * v);
          poly.set(3, x1 - Math.sin(rad) * kMinWidthT * v - (kMinWidthT + kage.kMinWidthY) * Math.cos(rad) * v,
                   y1 + Math.cos(rad) * kMinWidthT * v - (kMinWidthT + kage.kMinWidthY) * Math.sin(rad) * v);
          break;
        case 22:
          poly.set(0, x1 + (kMinWidthT * v + 1) / Math.sin(rad), y1 + 1);
          poly.set(3, x1 - (kMinWidthT * v) / Math.sin(rad), y1);
          break;
        case 32:
          poly.set(0, x1 + (kMinWidthT * v) / Math.sin(rad), y1);
          poly.set(3, x1 - (kMinWidthT * v) / Math.sin(rad), y1);
          break;
        }
        
        switch(a2){
        case 0:
          if(a1 == 6){
            poly.set(1, x2 + Math.sin(rad) * kMinWidthT * v, y2 - Math.cos(rad) * kMinWidthT * v);
            poly.set(2, x2 - Math.sin(rad) * kMinWidthT * v, y2 + Math.cos(rad) * kMinWidthT * v);
          }
          else{
            poly.set(1, x2 + Math.sin(rad) * kMinWidthT * v - kMinWidthT * 0.5 * Math.cos(rad) * v,
                     y2 - Math.cos(rad) * kMinWidthT * v - kMinWidthT * 0.5 * Math.sin(rad) * v);
            poly.set(2, x2 - Math.sin(rad) * kMinWidthT * v + kMinWidthT * 0.5 * Math.cos(rad) * v,
                     y2 + Math.cos(rad) * kMinWidthT * v + kMinWidthT * 0.5 * Math.sin(rad) * v);
          }
          break;
        case 1: // is needed?
        case 5:
          poly.set(1, x2 + Math.sin(rad) * kMinWidthT * v, y2 - Math.cos(rad) * kMinWidthT * v);
          poly.set(2, x2 - Math.sin(rad) * kMinWidthT * v, y2 + Math.cos(rad) * kMinWidthT * v);
          break;
        case 13:
          poly.set(1, x2 + Math.sin(rad) * kMinWidthT * v + kage.kAdjustKakatoL[opt2] * Math.cos(rad) * v,
                   y2 - Math.cos(rad) * kMinWidthT * v + kage.kAdjustKakatoL[opt2] * Math.sin(rad) * v);
          poly.set(2, x2 - Math.sin(rad) * kMinWidthT * v + (kage.kAdjustKakatoL[opt2] + kMinWidthT) * Math.cos(rad) * v,
                   y2 + Math.cos(rad) * kMinWidthT * v + (kage.kAdjustKakatoL[opt2] + kMinWidthT) * Math.sin(rad) * v);
          break;
        case 23:
          poly.set(1, x2 + Math.sin(rad) * kMinWidthT * v + kage.kAdjustKakatoR[opt2] * Math.cos(rad) * v,
                   y2 - Math.cos(rad) * kMinWidthT * v + kage.kAdjustKakatoR[opt2] * Math.sin(rad) * v);
          poly.set(2,
                   x2 - Math.sin(rad) * kMinWidthT * v + (kage.kAdjustKakatoR[opt2] + kMinWidthT) * Math.cos(rad) * v,
                   y2 + Math.cos(rad) * kMinWidthT * v + (kage.kAdjustKakatoR[opt2] + kMinWidthT) * Math.sin(rad) * v);
          break;
        case 32:
          poly.set(1, x2 + (kMinWidthT * v) / Math.sin(rad), y2);
          poly.set(2, x2 - (kMinWidthT * v) / Math.sin(rad), y2);
          break;
        }
        
        polygons.push(poly);
        
        if((a1 == 6) && (a2 == 0 || a2 == 5)){ //KAGI NO YOKO BOU NO SAIGO NO MARU
          poly = new Polygon();
          if(kage.kUseCurve){
            poly.push(x2 + Math.sin(rad) * kMinWidthT * v, y2 - Math.cos(rad) * kMinWidthT * v);
            poly.push(x2 - Math.cos(rad) * kMinWidthT * 0.9 * v + Math.sin(rad) * kMinWidthT * 0.9 * v,
                      y2 + Math.sin(rad) * kMinWidthT * 0.9 * v - Math.cos(rad) * kMinWidthT * 0.9 * v, 1);
            poly.push(x2 + Math.cos(rad) * kMinWidthT * v, y2 + Math.sin(rad) * kMinWidthT * v);
            poly.push(x2 + Math.cos(rad) * kMinWidthT * 0.9 * v - Math.sin(rad) * kMinWidthT * 0.9 * v,
                      y2 + Math.sin(rad) * kMinWidthT * 0.9 * v + Math.cos(rad) * kMinWidthT * 0.9 * v, 1);
            poly.push(x2 - Math.sin(rad) * kMinWidthT * v, y2 + Math.cos(rad) * kMinWidthT * v);
          } else {
            poly.push(x2 + Math.sin(rad) * kMinWidthT * v, y2 - Math.cos(rad) * kMinWidthT * v);
            poly.push(x2 + Math.cos(rad) * kMinWidthT * 0.8 * v + Math.sin(rad) * kMinWidthT * 0.6 * v,
                      y2 + Math.sin(rad) * kMinWidthT * 0.8 * v - Math.cos(rad) * kMinWidthT * 0.6 * v);
            poly.push(x2 + Math.cos(rad) * kMinWidthT * v, y2 + Math.sin(rad) * kMinWidthT * v);
            poly.push(x2 + Math.cos(rad) * kMinWidthT * 0.8 * v - Math.sin(rad) * kMinWidthT * 0.6 * v,
                      y2 + Math.sin(rad) * kMinWidthT * 0.8 * v + Math.cos(rad) * kMinWidthT * 0.6 * v);
            poly.push(x2 - Math.sin(rad) * kMinWidthT * v, y2 + Math.cos(rad) * kMinWidthT * v);
          }
          polygons.push(poly);
        }
        
        if(a1 == 6 && a2 == 5){
          //KAGI NO YOKO BOU NO HANE
          poly = new Polygon();
          if(x1 < x2){
            poly.push(x2 + (kMinWidthT - 1) * Math.sin(rad) * v, y2 - (kMinWidthT - 1) * Math.cos(rad) * v);
            poly.push(x2 + 2 * Math.cos(rad) * v + (kMinWidthT + kage.kWidth * 5) * Math.sin(rad) * v,
                      y2 + 2 * Math.sin(rad) * v - (kMinWidthT + kage.kWidth * 5) * Math.cos(rad) * v);
            poly.push(x2 + (kMinWidthT + kage.kWidth * 5) * Math.sin(rad) * v,
                      y2 - (kMinWidthT + kage.kWidth * 5) * Math.cos(rad) * v);
            poly.push(x2 + (kMinWidthT - 1) * Math.sin(rad) * v - kMinWidthT * Math.cos(rad) * v,
                      y2 - (kMinWidthT - 1) * Math.cos(rad) * v - kMinWidthT * Math.sin(rad) * v);
          } else {
            poly.push(x2 - (kMinWidthT - 1) * Math.sin(rad) * v, y2 + (kMinWidthT - 1) * Math.cos(rad) * v);
            poly.push(x2 + 2 * Math.cos(rad) * v - (kMinWidthT + kage.kWidth * 5) * Math.sin(rad) * v,
                      y2 + 2 * Math.sin(rad) * v + (kMinWidthT + kage.kWidth * 5) * Math.cos(rad) * v);
            poly.push(x2 - (kMinWidthT + kage.kWidth * 5) * Math.sin(rad) * v,
                      y2 + (kMinWidthT + kage.kWidth * 5) * Math.cos(rad) * v);
            poly.push(x2 + (kMinWidthT - 1) * Math.sin(rad) * v - kMinWidthT * Math.cos(rad) * v,
                      y2 - (kMinWidthT - 1) * Math.cos(rad) * v - kMinWidthT * Math.sin(rad) * v);
          }
          polygons.push(poly);
        }
        
        if(a1 == 22){ //SHIKAKU MIGIUE UROKO NANAME DEMO MASSUGU MUKI
          poly = new Polygon();
          poly.push(x1 - kMinWidthT, y1 - kage.kMinWidthY);
          poly.push(x1, y1 - kage.kMinWidthY - kage.kWidth);
          poly.push(x1 + kMinWidthT + kage.kWidth, y1 + kage.kMinWidthY);
          poly.push(x1 + kMinWidthT, y1 + kMinWidthT - 1);
          poly.push(x1 - kMinWidthT, y1 + kMinWidthT + 4);
          polygons.push(poly);
        }
        
        XX = Math.sin(rad) * v;
        XY = Math.cos(rad) * v * -1;
        YX = Math.cos(rad) * v;
        YY = Math.sin(rad) * v;
        
        if(a1 == 0){ //beginning of the storke
          poly = new Polygon();
          poly.push(x1 + kMinWidthT * XX + (kage.kMinWidthY * 0.5) * YX,
                    y1 + kMinWidthT * XY + (kage.kMinWidthY * 0.5) * YY);
          poly.push(x1 + (kMinWidthT + kMinWidthT * 0.5) * XX + (kage.kMinWidthY * 0.5 + kage.kMinWidthY) * YX,
                    y1 + (kMinWidthT + kMinWidthT * 0.5) * XY + (kage.kMinWidthY * 0.5 + kage.kMinWidthY) * YY);
          poly.push(x1 + kMinWidthT * XX + (kage.kMinWidthY * 0.5 + kage.kMinWidthY * 2) * YX - 2 * XX,
                    y1 + kMinWidthT * XY + (kage.kMinWidthY * 0.5 + kage.kMinWidthY * 2) * YY + 1 * XY);
          polygons.push(poly);
        }
      }
    }
  }
  else{ //gothic
    if(tx1 == tx2){ //if TATE stroke, use y-axis
      if(ty1 > ty2){
        x1 = tx2;
        y1 = ty2;
        x2 = tx1;
        y2 = ty1;
        a1 = ta2;
        a2 = ta1;
      }
      else{
        x1 = tx1;
        y1 = ty1;
        x2 = tx2;
        y2 = ty2;
        a1 = ta1;
        a2 = ta2;
      }
      
      if(a1 % 10 == 2){ y1 = y1 - kage.kWidth; }
      if(a2 % 10 == 2){ y2 = y2 + kage.kWidth; }
      if(a1 % 10 == 3){ y1 = y1 - kage.kWidth * kage.kKakato; }
      if(a2 % 10 == 3){ y2 = y2 + kage.kWidth * kage.kKakato; }
      
      poly = new Polygon();
      poly.push(x1 - kage.kWidth, y1);
      poly.push(x2 - kage.kWidth, y2);
      poly.push(x2 + kage.kWidth, y2);
      poly.push(x1 + kage.kWidth, y1);
      //poly.reverse(); // for fill-rule
      
      polygons.push(poly);
    }
    else if(ty1 == ty2){ //if YOKO stroke, use x-axis
      if(tx1 > tx2){
        x1 = tx2;
        y1 = ty2;
        x2 = tx1;
        y2 = ty1;
        a1 = ta2;
        a2 = ta1;
      }
      else{
        x1 = tx1;
        y1 = ty1;
        x2 = tx2;
        y2 = ty2;
        a1 = ta1;
        a2 = ta2;
      }
      if(a1 % 10 == 2){ x1 = x1 - kage.kWidth; }
      if(a2 % 10 == 2){ x2 = x2 + kage.kWidth; }
      if(a1 % 10 == 3){ x1 = x1 - kage.kWidth * kage.kKakato; }
      if(a2 % 10 == 3){ x2 = x2 + kage.kWidth * kage.kKakato; }
      
      poly = new Polygon();
      poly.push(x1, y1 - kage.kWidth);
      poly.push(x2, y2 - kage.kWidth);
      poly.push(x2, y2 + kage.kWidth);
      poly.push(x1, y1 + kage.kWidth);
      
      polygons.push(poly);
    }
    else{ //for others, use x-axis
      if(tx1 > tx2){
        x1 = tx2;
        y1 = ty2;
        x2 = tx1;
        y2 = ty1;
        a1 = ta2;
        a2 = ta1;
      }
      else{
        x1 = tx1;
        y1 = ty1;
        x2 = tx2;
        y2 = ty2;
        a1 = ta1;
        a2 = ta2;
      }
      rad = Math.atan((y2 - y1) / (x2 - x1));
      if(a1 % 10 == 2){
        x1 = x1 - kage.kWidth * Math.cos(rad);
        y1 = y1 - kage.kWidth * Math.sin(rad);
      }
      if(a2 % 10 == 2){
        x2 = x2 + kage.kWidth * Math.cos(rad);
        y2 = y2 + kage.kWidth * Math.sin(rad);
      }
      if(a1 % 10 == 3){
        x1 = x1 - kage.kWidth * Math.cos(rad) * kage.kKakato;
        y1 = y1 - kage.kWidth * Math.sin(rad) * kage.kKakato;
      }
      if(a2 % 10 == 3){
        x2 = x2 + kage.kWidth * Math.cos(rad) * kage.kKakato;
        y2 = y2 + kage.kWidth * Math.sin(rad) * kage.kKakato;
      }
      
      //SUICHOKU NO ICHI ZURASHI HA Math.sin TO Math.cos NO IREKAE + x-axis MAINASU KA
      poly = new Polygon();
      poly.push(x1 + Math.sin(rad) * kage.kWidth, y1 - Math.cos(rad) * kage.kWidth);
      poly.push(x2 + Math.sin(rad) * kage.kWidth, y2 - Math.cos(rad) * kage.kWidth);
      poly.push(x2 - Math.sin(rad) * kage.kWidth, y2 + Math.cos(rad) * kage.kWidth);
      poly.push(x1 - Math.sin(rad) * kage.kWidth, y1 + Math.cos(rad) * kage.kWidth);
      
      polygons.push(poly);
    }
  }
}function dfDrawFont(kage, polygons, a1, a2, a3, x1, y1, x2, y2, x3, y3, x4, y4){
  var tx1, tx2, tx3, tx4, ty1, ty2, ty3, ty4, v;
  var rad;
	
  if(kage.kShotai == kage.kMincho){
    switch(a1 % 100){ // ... no need to divide
    case 0:
      break;
    case 1:
      if(a3 % 100 == 4){
        if(x1 == x2){
          if(y1 < y2){ v = 1; } else{ v = -1; }
          tx1 = x2;
          ty1 = y2 - kage.kMage * v;
        }
        else if(y1 == y2){ // ... no need
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * v;
          ty1 = y2;
        }
        else{
          rad = Math.atan((y2 - y1) / (x2 - x1));
          if(x1 < x2){ v = 1; } else{v = -1; }
          tx1 = x2 - kage.kMage * Math.cos(rad) * v;
          ty1 = y2 - kage.kMage * Math.sin(rad) * v;
        }
        cdDrawLine(kage, polygons, x1, y1, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x2, y2, x2 - kage.kMage * (((kage.kAdjustTateStep + 4) - Math.floor(a2 / 1000)) / (kage.kAdjustTateStep + 4)), y2, 1 + (a2 - a2 % 1000), a3 + 10);
      }
      else{
        cdDrawLine(kage, polygons, x1, y1, x2, y2, a2, a3);
      }
      break;
    case 2:
    //case 12: // ... no need
      if(a3 % 100 == 4){
        if(x2 == x3){
          tx1 = x3;
          ty1 = y3 - kage.kMage;
        }
        else if(y2 == y3){
          tx1 = x3 - kage.kMage;
          ty1 = y3;
        }
        else{
          rad = Math.atan((y3 - y2) / (x3 - x2));
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx1 = x3 - kage.kMage * Math.cos(rad) * v;
          ty1 = y3 - kage.kMage * Math.sin(rad) * v;
        }
        cdDrawCurve(kage, polygons, x1, y1, x2, y2, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x3, y3, x3 - kage.kMage, y3, 1, a3 + 10);
      }
      else if(a3 == 5){
        cdDrawCurve(kage, polygons, x1, y1, x2, y2, x3, y3, a2, 15);
      }
      else{
        cdDrawCurve(kage, polygons, x1, y1, x2, y2, x3, y3, a2, a3);
      }
      break;
    case 3:
      if(a3 % 1000 == 5){
        if(x1 == x2){
          if(y1 < y2){ v = 1; } else{ v = -1; }
          tx1 = x2;
          ty1 = y2 - kage.kMage * v;
        }
        else if(y1 == y2){
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * v;
          ty1 = y2;
        }
        else{
          rad = Math.atan((y2 - y1) / (x2 - x1));
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * Math.cos(rad) * v;
          ty1 = y2 - kage.kMage * Math.sin(rad) * v;
        }
        if(x2 == x3){
          if(y2 < y3){ v = 1; } else{ v = -1; }
          tx2 = x2;
          ty2 = y2 + kage.kMage * v;
        }
        else if(y2 == y3){
          if(x2 < x3){ v = 1; } else { v = -1; }
          tx2 = x2 + kage.kMage * v;
          ty2 = y2;
        }
        else{
          rad = Math.atan((y3 - y2) / (x3 - x2));
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * Math.cos(rad) * v;
          ty2 = y2 + kage.kMage * Math.sin(rad) * v;
        }
        tx3 = x3;
        ty3 = y3;
        
        cdDrawLine(kage, polygons, x1, y1, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x2, y2, tx2, ty2, 1 + (a2 - a2 % 1000) * 10, 1 + (a3 - a3 % 1000));
        if((x2 < x3 && tx3 - tx2 > 0) || (x2 > x3 && tx2 - tx3 > 0)){ // for closer position
          cdDrawLine(kage, polygons, tx2, ty2, tx3, ty3, 6 + (a3 - a3 % 1000), 5); // bolder by force
        }
      }
      else{
        if(x1 == x2){
          if(y1 < y2){ v = 1; } else { v = -1; }
          tx1 = x2;
          ty1 = y2 - kage.kMage * v;
        }
        else if(y1 == y2){
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * v;
          ty1 = y2;
        }
        else{
          rad = Math.atan((y2 - y1) / (x2 - x1));
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * Math.cos(rad) * v;
          ty1 = y2 - kage.kMage * Math.sin(rad) * v;
        }
        if(x2 == x3){
          if(y2 < y3){ v = 1; } else{ v = -1; }
          tx2 = x2;
          ty2 = y2 + kage.kMage * v;
        }
        else if(y2 == y3){
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * v;
          ty2 = y2;
        }
        else{
          rad = Math.atan((y3 - y2) / (x3 - x2));
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * Math.cos(rad) * v;
          ty2 = y2 + kage.kMage * Math.sin(rad) * v;
        }
        cdDrawLine(kage, polygons, x1, y1, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x2, y2, tx2, ty2, 1 + (a2 - a2 % 1000) * 10, 1 + (a3 - a3 % 1000));
        cdDrawLine(kage, polygons, tx2, ty2, x3, y3, 6 + (a3 - a3 % 1000), a3); // bolder by force
      }
      break;
    case 12:
      cdDrawCurve(kage, polygons, x1, y1, x2, y2, x3, y3, a2, 1);
      cdDrawLine(kage, polygons, x3, y3, x4, y4, 6, a3);
      break;
    case 4:
      rate = 6;
      if((x3 - x2) * (x3 - x2) + (y3 - y2) * (y3 - y2) < 14400){ // smaller than 120 x 120
        rate = Math.sqrt((x3 - x2) * (x3 - x2) + (y3 - y2) * (y3 - y2)) / 120 * 6;
      }
      if(a3 == 5){
        if(x1 == x2){
          if(y1 < y2){ v = 1; } else{ v = -1; }
          tx1 = x2;
          ty1 = y2 - kage.kMage * v * rate;
        }
        else if(y1 == y2){
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * v * rate;
          ty1 = y2;
        }
        else{
          rad = Math.atan((y2 - y1) / (x2 - x1));
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * Math.cos(rad) * v * rate;
          ty1 = y2 - kage.kMage * Math.sin(rad) * v * rate;
        }
        if(x2 == x3){
          if(y2 < y3){ v = 1; } else{ v = -1; }
          tx2 = x2;
          ty2 = y2 + kage.kMage * v * rate;
        }
        else if(y2 == y3){
          if(x2 < x3){ v = 1; } else { v = -1; }
          tx2 = x2 + kage.kMage * v * rate;
          ty2 = y2;
        }
        else{
          rad = Math.atan((y3 - y2) / (x3 - x2));
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * Math.cos(rad) * v * rate;
          ty2 = y2 + kage.kMage * Math.sin(rad) * v * rate;
        }
        tx3 = x3;
        ty3 = y3;
        
        cdDrawLine(kage, polygons, x1, y1, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x2, y2, tx2, ty2, 1, 1);
        if(tx3 - tx2 > 0){ // for closer position
          cdDrawLine(kage, polygons, tx2, ty2, tx3, ty3, 6, 5); // bolder by force
        }
      }
      else{
        if(x1 == x2){
          if(y1 < y2){ v = 1; } else { v = -1; }
          tx1 = x2;
          ty1 = y2 - kage.kMage * v * rate;
        }
        else if(y1 == y2){
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * v * rate;
          ty1 = y2;
        }
        else{
          rad = Math.atan((y2 - y1) / (x2 - x1));
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * Math.cos(rad) * v * rate;
          ty1 = y2 - kage.kMage * Math.sin(rad) * v * rate;
        }
        if(x2 == x3){
          if(y2 < y3){ v = 1; } else{ v = -1; }
          tx2 = x2;
          ty2 = y2 + kage.kMage * v * rate;
        }
        else if(y2 == y3){
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * v * rate;
          ty2 = y2;
        }
        else{
          rad = Math.atan((y3 - y2) / (x3 - x2));
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * Math.cos(rad) * v * rate;
          ty2 = y2 + kage.kMage * Math.sin(rad) * v * rate;
        }
        cdDrawLine(kage, polygons, x1, y1, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x2, y2, tx2, ty2, 1, 1);
        cdDrawLine(kage, polygons, tx2, ty2, x3, y3, 6, a3); // bolder by force
      }
      break;
    case 6:
      if(a3 % 100 == 4){
        if(x3 == x4){
          tx1 = x4;
          ty1 = y4 - kage.kMage;
        }
        else if(y3 == y4){
          tx1 = x4 - kage.kMage;
          ty1 = y4;
        }
        else{
          rad = Math.atan((y4 - y3) / (x4 - x3));
          if(x3 < x4){ v = 1; } else{ v = -1; }
          tx1 = x4 - kage.kMage * Math.cos(rad) * v;
          ty1 = y4 - kage.kMage * Math.sin(rad) * v;
        }
        cdDrawBezier(kage, polygons, x1, y1, x2, y2, x3, y3, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x4, y4, x4 - kage.kMage, y4, 1, a3 + 10);
      }
      else if(a3 == 5){
        cdDrawBezier(kage, polygons, x1, y1, x2, y2, x3, y3, x4, y4, a2, 15);
      }
      else{
        cdDrawBezier(kage, polygons, x1, y1, x2, y2, x3, y3, x4, y4, a2, a3);
      }
      break;
    case 7:
      cdDrawLine(kage, polygons, x1, y1, x2, y2, a2, 1);
      cdDrawCurve(kage, polygons, x2, y2, x3, y3, x4, y4, 1 + (a2 - a2 % 1000), a3);
      break;
    case 9: // may not be exist ... no need
      //kageCanvas[y1][x1] = 0;
      //kageCanvas[y2][x2] = 0;
      break;
    default:
      break;
    }
  }
    
  else{ // gothic
    switch(a1 % 100){
    case 0:
      break;
    case 1:
      if(a3 == 4){
        if(x1 == x2){
          if(y1 < y2){ v = 1; } else{ v = -1; }
          tx1 = x2;
          ty1 = y2 - kage.kMage * v;
        }
        else if(y1 == y2){
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * v;
          ty1 = y2;
        }
        else{
          rad = Math.atan((y2 - y1) / (x2 - x1));
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * Math.cos(rad) * v;
          ty1 = y2 - kage.kMage * Math.sin(rad) * v;
        }
        cdDrawLine(kage, polygons, x1, y1, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x2, y2, x2 - kage.kMage * 2, y2 - kage.kMage * 0.5, 1, 0);
      }
      else{
        cdDrawLine(kage, polygons, x1, y1, x2, y2, a2, a3);
      }
      break;
    case 2:
    case 12:
      if(a3 == 4){
        if(x2 == x3){
          tx1 = x3;
          ty1 = y3 - kage.kMage;
        }
        else if(y2 == y3){
          tx1 = x3 - kage.kMage;
          ty1 = y3;
        }
        else{
          rad = Math.atan((y3 - y2) / (x3 - x2));
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx1 = x3 - kage.kMage * Math.cos(rad) * v;
          ty1 = y3 - kage.kMage * Math.sin(rad) * v;
        }
        cdDrawCurve(kage, polygons, x1, y1, x2, y2, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x3, y3, x3 - kage.kMage * 2, y3 - kage.kMage * 0.5, 1, 0);
      }
      else if(a3 == 5){
        tx1 = x3 + kage.kMage;
        ty1 = y3;
        tx2 = tx1 + kage.kMage * 0.5;
        ty2 = y3 - kage.kMage * 2;
        cdDrawCurve(kage, polygons, x1, y1, x2, y2, x3, y3, a2, 1);
        cdDrawCurve(kage, polygons, x3, y3, tx1, ty1, tx2, ty2, 1, 0);
      }
      else{
        cdDrawCurve(kage, polygons, x1, y1, x2, y2, x3, y3, a2, a3);
      }
      break;
    case 3:
      if(a3 == 5){
        if(x1 == x2){
          if(y1 < y2){ v = 1; } else{ v = -1; }
          tx1 = x2;
          ty1 = y2 - kage.kMage * v;
        }
        else if(y1 == y2){
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * v;
          ty1 = y2;
        }
        else{
          rad = Math.atan((y2 - y1) / (x2 - x1));
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * Math.cos(rad) * v;
          ty1 = y2 - kage.kMage * Math.sin(rad) * v;
        }
        if(x2 == x3){
          if(y2 < y3){ v = 1; } else{ v = -1; }
          tx2 = x2;
          ty2 = y2 + kage.kMage * v;
        }
        else if(y2 == y3){
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * v;
          ty2 = y2;
        }
        else{
          rad = Math.atan((y3 - y2) / (x3 - x2));
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * Math.cos(rad) * v;
          ty2 = y2 + kage.kMage * Math.sin(rad) * v;
        }
        tx3 = x3 - kage.kMage;
        ty3 = y3;
        tx4 = x3 + kage.kMage * 0.5;
        ty4 = y3 - kage.kMage * 2;
        
        cdDrawLine(kage, polygons, x1, y1, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x2, y2, tx2, ty2, 1, 1);
        cdDrawLine(kage, polygons, tx2, ty2, tx3, ty3, 1, 1);
        cdDrawCurve(kage, polygons, tx3, ty3, x3, y3, tx4, ty4, 1, 0);
      }
      else{
        if(x1 == x2){
          if(y1 < y2){ v = 1; } else{ v = -1; }
          tx1 = x2;
          ty1 = y2 - kage.kMage * v;
        }
        else if(y1 == y2){
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * v;
          ty1 = y2;
        }
        else{
          rad = Math.atan((y2 - y1) / (x2 - x1));
          if(x1 < x2){ v = 1; } else{ v = -1; }
          tx1 = x2 - kage.kMage * Math.cos(rad) * v;
          ty1 = y2 - kage.kMage * Math.sin(rad) * v;
        }
        if(x2 == x3){
          if(y2 < y3){ v = 1; } else{ v = -1; }
          tx2 = x2;
          ty2 = y2 + kage.kMage * v;
        }
        else if(y2 == y3){
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * v;
          ty2 = y2;
        }
        else{
          rad = Math.atan((y3 - y2) / (x3 - x2));
          if(x2 < x3){ v = 1; } else{ v = -1; }
          tx2 = x2 + kage.kMage * Math.cos(rad) * v;
          ty2 = y2 + kage.kMage * Math.sin(rad) * v;
        }
        
        cdDrawLine(kage, polygons, x1, y1, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x2, y2, tx2, ty2, 1, 1);
        cdDrawLine(kage, polygons, tx2, ty2, x3, y3, 1, a3);
      }
      break;
    case 6:
      if(a3 == 5){
        tx1 = x4 - kage.kMage;
        ty1 = y4;
        tx2 = x4 + kage.kMage * 0.5;
        ty2 = y4 - kage.kMage * 2;
        /*
				cdDrawCurve(x1, y1, x2, y2, (x2 + x3) / 2, (y2 + y3) / 2, a2, 1);
				cdDrawCurve((x2 + x3) / 2, (y2 + y3) / 2, x3, y3, tx1, ty1, 1, 1);
         */
        cdDrawBezier(kage, polygons, x1, y1, x2, y2, x3, y3, tx1, ty1, a2, 1);
        cdDrawCurve(kage, polygons, tx1, ty1, x4, y4, tx2, ty2, 1, 0);
      }
      else{
        /*
				cdDrawCurve(x1, y1, x2, y2, (x2 + x3) / 2, (y2 + y3) / 2, a2, 1);
				cdDrawCurve((x2 + x3) / 2, (y2 + y3) / 2, x3, y3, x4, y4, 1, a3);
         */
        cdDrawBezier(kage, polygons, x1, y1, x2, y2, x3, y3, x4, y4, a2, a3);
      }
      break;
    case 7:
      cdDrawLine(kage, polygons, x1, y1, x2, y2, a2, 1);
      cdDrawCurve(kage, polygons, x2, y2, x3, y3, x4, y4, 1, a3);
      break;
    case 9: // may not be exist
      //kageCanvas[y1][x1] = 0;
      //kageCanvas[y2][x2] = 0;
      break;
    default:
      break;
    }
  }
}function Polygon(number){
  // resolution : 0.1
  
  // method
  function push(x, y, off){ // void
    var temp = new Object();
    temp.x = Math.floor(x*10)/10;
    temp.y = Math.floor(y*10)/10;
    if(off != 1){
      off = 0;
    }
    temp.off = off;
    this.array.push(temp);
  }
  Polygon.prototype.push = push;
  
  function set(index, x, y, off){ // void
    this.array[index].x = Math.floor(x*10)/10;
    this.array[index].y = Math.floor(y*10)/10;
    if(off != 1){
      off = 0;
    }
    this.array[index].off = off;
  }
  Polygon.prototype.set = set;
  
  function reverse(){ // void
    this.array.reverse();
  }
  Polygon.prototype.reverse = reverse;
  
  function concat(poly){ // void
    this.array = this.array.concat(poly.array);
  }
  Polygon.prototype.concat = concat;
	
  function shift(){ // void
    this.array.shift();
  }
  Polygon.prototype.shift = shift;
	
  function unshift(x, y, off){ // void
    var temp = new Object();
    temp.x = Math.floor(x*10)/10;
    temp.y = Math.floor(y*10)/10;
    if(off != 1){
      off = 0;
    }
    temp.off = off;
    this.array.unshift(temp);
  }
  Polygon.prototype.unshift = unshift;
	
  // property
  this.array = new Array();
  
  // initialize
  if(number){
    for(var i = 0; i < number; i++){
      this.push(0, 0, 0);
    }
  }
  
  return this;
}function Polygons(){
  // method
 	function clear(){ // void
    this.array = new Array();
  }
  Polygons.prototype.clear = clear;
	
  function push(polygon){ // void
    // only a simple check
    var minx = 200;
    var maxx = 0;
    var miny = 200;
    var maxy = 0;
    var error = 0;
    for(var i = 0; i < polygon.array.length; i++){
      if(polygon.array[i].x < minx){
        minx = polygon.array[i].x;
      }
      if(polygon.array[i].x > maxx){
        maxx = polygon.array[i].x;
      }
      if(polygon.array[i].y < miny){
        miny = polygon.array[i].y;
      }
      if(polygon.array[i].y > maxy){
        maxy = polygon.array[i].y;
      }
      if(isNaN(polygon.array[i].x) || isNaN(polygon.array[i].y)){
        error++;
      }
    }
    if(error == 0 && minx != maxx && miny != maxy && polygon.array.length >= 3){
      var newArray = new Array();
      newArray.push(polygon.array.shift());
      while(polygon.array.length != 0){
        var temp = polygon.array.shift();
        //if(newArray[newArray.length - 1].x != temp.x ||
        //   newArray[newArray.length - 1].y != temp.y){
          newArray.push(temp);
        //}
      }
      if(newArray.length >= 3){
        polygon.array = newArray;
        this.array.push(polygon);
      }
    }
  }
  Polygons.prototype.push = push;
  
  function generateSVG(curve){ // string
    var buffer = "";
    buffer += "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" baseProfile=\"full\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\">\n";
    if(curve){
      for(var i = 0; i < this.array.length; i++){
        var mode = "L";
        buffer += "<path d=\"M ";
        buffer += this.array[i].array[0].x + "," + this.array[i].array[0].y + " ";
        for(var j = 1; j < this.array[i].array.length; j++){
          if(this.array[i].array[j].off == 1){
            buffer += "Q ";
            mode = "Q";
          } else if(mode == "Q" && this.array[i].array[j - 1].off != 1){
            buffer += "L ";
          } else if(mode == "L" && j == 1){
            buffer += "L ";
          }
          buffer += this.array[i].array[j].x + "," + this.array[i].array[j].y + " ";
        }
        buffer += "Z\" fill=\"black\" />\n";
      }
      buffer += "</svg>\n";
    } else {
      buffer += "<g fill=\"black\">\n";
      for(var i = 0; i < this.array.length; i++){
        buffer += "<polygon points=\"";
        for(var j = 0; j < this.array[i].array.length; j++){
          buffer += this.array[i].array[j].x + "," + this.array[i].array[j].y + " ";
        }
        buffer += "\" />\n";
      }
      buffer += "</g>\n";
      buffer += "</svg>\n";
    }
    return buffer;
  }
  Polygons.prototype.generateSVG = generateSVG;
  
  function generateEPS(){ // string
    var buffer = "";
    buffer += "%!PS-Adobe-3.0 EPSF-3.0\n";
    buffer += "%%BoundingBox: 0 -208 1024 816\n";
    buffer += "%%Pages: 0\n";
    buffer += "%%Title: Kanji glyph\n";
    buffer += "%%Creator: GlyphWiki powered by KAGE system\n";
    buffer += "%%CreationDate: " + new Date() + "\n";
    buffer += "%%EndComments\n";
    buffer += "%%EndProlog\n";
    
    for(var i = 0; i < this.array.length; i++){
      for(var j = 0; j < this.array[i].array.length; j++){
        buffer += (this.array[i].array[j].x * 5) + " " + (1000 - this.array[i].array[j].y * 5 - 200) + " ";
        if(j == 0){
          buffer += "newpath\nmoveto\n";
        } else {
          buffer += "lineto\n";
        }
      }
      buffer += "closepath\nfill\n";
    }
    buffer += "%%EOF\n";
    return buffer;
  }
  Polygons.prototype.generateEPS = generateEPS;
  
  // property
  this.array = new Array();
  
  return this;
}
module.exports={Kage:Kage,Polygons:Polygons}
},{}],"C:\\ksana2015\\z0y\\node_modules\\strokecount\\index.js":[function(require,module,exports){
module.exports=require("./strokecount");
},{"./strokecount":"C:\\ksana2015\\z0y\\node_modules\\strokecount\\strokecount.js"}],"C:\\ksana2015\\z0y\\node_modules\\strokecount\\strokecount.js":[function(require,module,exports){
var strokestr=require("./strokestr");

var unpackrle=function(s) {
	var prev='';
	var output="";
	for (var i=0;i<s.length;i++) {
		var ch=s.charCodeAt(i);
		if (ch>0x63) {
			repeat=ch-0x63;
			for (var j=0;j<repeat;j++) output+=prev;
		} else {
			prev=s[i];
			output+=prev;			
		}
	}
	return output;
}
var bmpstroke=unpackrle(strokestr.bmpRLE); bmpRLE=null;
var surstroke=unpackrle(strokestr.surRLE); surRLE=null;

/*
TODO SINICA Parts stroke count
*/
var sinicaeudc ={};
var  getutf32 = function (ch) {
	var ic = ch.charCodeAt(0);
	var c = 1; // default BMP one widechar
	if (ic >= 0xd800 && ic <= 0xdcff) {
	  var ic2 = ch.charCodeAt(1);
	  ic = 0x10000 + ((ic & 0x3ff) * 1024) + (ic2 & 0x3ff);
	  c++; // surrogate pair
	}
	return ic;
  };


var strokecount=function(ch) {
	code=parseInt(ch);
	if ( isNaN(code)) {
		var code=getutf32(ch);
	}
	
	if (code>=0x20000 && code<=0x2B81F) { //up to extension D
		return surstroke.charCodeAt(code-0x20000)-0x23 || 0;
	} else if (code<0x20000) {
		return bmpstroke.charCodeAt(code-0x3400)-0x23 || 0;
	}
	//} else {
	//	return eudc(ch) || 0 ;
	//}
};

module.exports=strokecount;
},{"./strokestr":"C:\\ksana2015\\z0y\\node_modules\\strokecount\\strokestr.js"}],"C:\\ksana2015\\z0y\\node_modules\\strokecount\\strokestr.js":[function(require,module,exports){
module.exports={bmpRLE:"())&&%)&&&''(((())))))***+++,,,,,.../36'++))*+04(((((((()))))))))********++++++++++++++,,,,,,,,,,,,-.---------.....////////0000000111111111111111222222223333445566677788:=)+-.5(()*****,7+../09'',/2'))*+++++,,---.//01.)((())**++++++,,,,,-----....../////00111111111111233344567()))**+++,---./144445./0'+.8**.0001=*/'))0+&&*+)))***++,---/01124;'-..2'')*+,/11((()))**************+++++++++,,,,,,,,,,,,,,,----------------.......................////////////////////////////00000000000000001111111111111112222222222333333333344445555555666778889::<=(()++,-17(**********+++++,,,,,,,,,--------.......///////////0000000111111122222222233333334444555667;</2,,,(+/115()))**++++++,,.../03())))))*******++++++++++++++++++,,,,,,,,,,,-------------------*----.........///////////////////////000000000000000011111111111111222222333334455666677789==)**+,--/023<'(())****+,,,,----.......//00000111122258=(*+-/-/12)*++,,-....//00())*+++,,,,,-..//111226'*(((())))))))*********+++++++++++,,,----------------...............//////////00000000011111111111122222222222233333334444455566667889?)'--/2(+.(()))******++++,,,,,,--......////////00000111122333447799//13)))**++++++++,,,,,,,-----.....////01111222333367)+123*,0'))))**++++,,,,,,--...///0001228+3)*+++.//123()**++,,,,,,,,--....../////01112233467())*))*++**+******+,,++++++++,+,,,,,,--,,-,,,,,---,,.-.-.--.----,.--.../....../../.././/...//.../////////00/0/0///00010010001111011112122121111222322222223223435545554557766677799>**+++,---./01224*++,,((()))*********++++++,++++++++,,,,,,,,,,,--,,,--.-----.............././//00///////////00000000000000000000111111111111112211111122222222222222234333333444444555555555555667778888:::<<+--./**++,,,,---.....////////////00000111122233335578*-0))+,-./24:,,--/12)+-,---.../22))******+++,,,,,,,,,,----------......////////////000000000000111122222233333333344455555566799:<)34+--..//1122234)*****++++++++++,,,,,,,----------------.............././//////////////////0000000000000000000000000111111111111111111111111112222222222222222223223333333333333233333333344444444444445555555666666666667777777777788799::::**++++,,,,,,-----..../////-/00000011122334444679:<)**,,,//15)++++,,,-..//////00000111122333477:*+--.///0133345,)+++++,-.......////0000011111133333556=-+.23'(()()*)***********+++++++++++,,,,,,,,,.,,,,-------.--------......../.......././.......//////////////////////0000000000000000000000011111111111111222222222222223222233333333333433333344444444444444555555566666666777777888889899:::;;=))***+++++,,,,,,,,------.........////////////00000000000000000111111111111222222223333333333344444455667677789::=++.1,-.0+,/++---1458'-)**+++++,,,,,----........///100001112222233344455689+****++++++++++,,,,,,--------........//////00000001111112222223334445667777;))))****+,+++++,-,,,,,,----------........//////0/////0000000000111122222222223333443345444566667:,,--../111225=*++,,-----......////00000001111112223333444444455669;<-0124/23***,,,--..//00001222345567:0**++++,,,,,,-------------.........///////////////0000000011111111111122222222222233333334455555566678889:;;?*,-..0112368<+,,--../001122357+,,---../001334689@**+++++,,,,,,,,,,--------........//////////////////00000000011111111111112222222222233333333344444444455555557777889::<A+,.14447;---./01)*++,,,,,----------.......///////0000000000000000011111111122222223333333434444444455555556777888899;=*,,,,---...////00000000111112233333455678@**++++++,,,,,,,,----................./////////000000000000111111111111222222222223333333444555555577888899A*+,,,,---......./////0000112223333334444444556679)++,,----.//00003456,-------.........//////////////00000000000011111111111112222222222222222222222222222333333333333334444444444444444555555565555555555566666666567888888889999::::;=>A,--....//////000000111111222222233444444455555556667789::<<+,,,,--------------.............//////////0000000011111111111122222222222222222233333334444444444555555666666677777889999:;;;;<<>,.-.//012236,-....../113:(+,,,,---.//00011334568;---....///0111112334559--.......////0000111113355578,///,,-,.00111112244458*--../00111112233344445790))**+-++++++++++++,,,,,,,,---------............./////////////////0000000000000001111131111111112222222222333333333444455556667788889.5,0-.123--.2138+,,,--..../////001111111122233344444445557,.33559)+++,,,,,------------..........//////////////////000000000000000000010111111111111111111111112222222222222233333333333333333344444444444444444444444444444445555555555555555555555556666666666666777777777777888888889999999999999:::::;;;<<<=>>?@@@AAF+,----..//00000234556*,,,---........./////////000000000111111111111222222222212333333334444444444444444555556666666677777788899999:::<?,-.012-/337++,,,---......///////0000111111111111111122222222222333333444444444455555566777789::;;<>,-.//--...////001122333344455666668=B.000122222333344566776<,,,--.................////////////////000000000111111111111222222222222222233333444445555555566666667777777888888999:.02445:,-//12459+./01112333334448<-../02223356689<<....//12234556666..///////000111222222222233333445679:02233-0118---....////////0000001111111122222233334444555555677778999:;<,,--........///////////////000000111111112122222222222222233333333334444444555556666677889::;<?/////0000234467:,,,-.........////00000111122223333344444455555556666788899;=>B-.,2701277**++++,,-------.../////01111222233334556;()***+++,,0,,,,,-----11......///0004011111222234::,,--.....///0//00000011222233333333344445666668899;;?.-.////000111111122222222333344444455555555555666666666666777777777888888888899999999::::::;;;<@///000125777?.0016..////000111111122223333333334444444678889124(()**-**+++,,,,,-------.......///00000011112223323444678-..///000012233344567779<C.//011111111222333344444445555556666677999::;<>GW9../270001113347889;///0000001111112333333334444444555555566666677788888899::;<<==>01111345556689:0246678:///01335669//000111111111222233333333444444444555555555566666666667777888888999;;<./000011111122333334444445555555666778:;45.///00000111111111122222223333333444445555555566666777888889999::::;==>?822561444>/001111111122222223333333344444555555555666666677777778888888899999:::;;;<=>?@E347./1122222333333444444556666789:;</0169<//11111122334444555555566667777889;;;;<<=@7811239<122335555667999:;;E/01112222222233333333333444445555555555666666666666666666777777777788888888899999999999:::::::;;;;;;<<<=>>O2337788801111112222222222222333333333333333333444444444455555555666666666777777777778888889999999:::::::::;;;;;<<=>BEF244678;258:<12223335689;;11122333345556666688899:;9<27735678:;2337778889:<0124344555566777888:;<<<=569;3;;55568345689::556778>A445667778899::;;;<<==>?@@F97767888<>##########################################################################$%%%%%%&&&&&&'&'''''(((((((((()))))***++$%&&&''''(*+,-$%&''((*,$$$%%%&&&&&&&'(('())))*+,-$$$%%&&&&'''''()))))))))**++++++,,,,-.../000$%&')*+%&&&&''''''()))+*+++%&''))))***++,,,,,,-//0039%%&&&&''''''''''''''''''''((((((((((((((((('(((((((())))))))))))())))))))))))))))()))))))))))))))))))))))))))))))))***************)***************+*********************)*)****+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,+,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,+,,,,,,,,,,,,----------------------------------------------------------------------------------...........-.........-..............-../........................./////.//////////////////////.///////.///00000000/0000000000000000/00/0001000101111111110111111111111111111111111111221222222222122221222222222333333333223333444434444444345554546657888898:;%&'''())))))*******+++*+,,,--...//0137%&')+,%''''())))*+++,-,-.0035%''''''(((()(*+,,--.%''(())*+,,-------.12%(((()))))*******+++++,,,-----------.../////012222334%&&&'((())))*+++.//11%'((((()+,/%%%&&''''((((())))))))))))))******************+++++++++++++++++++++,,,+,,,,,,,,,,,----------------------./....-..././/.0000000001111122222222222233334688::%&''(((())))))************+++++++++++,,,,,,+,,,,,------.......-./////0000010001111122212343466%&''''''''((((()*+++,-../..2%'(..%(((())))***+,,,--...011123467%''*+,.-.%&&&''''(()('))'++++++,,./8%''((((**+++-%&&'(((()****++,++,,,.-00%''''((())))****++++,,,,,,----..../////.0/111012136A%'''((())*+++../12%&&''''((()*+++++,,,,,-,035&((((((((((((((((((((((((((()))))))))))))))))))))))))********************************)************************************+++++++++++++++++++,+,++++++++++++++++++++++++++++++++*++++++++++*,,,,,,,,,,,,,,,,,,,,,,,,,,,,,+,,,,,,,,,,,,,,,,,+,,,,,,,,,,,,,,,,,----------,---------------------------------,----------------------------...........-.....................-............../........./......................///////////////////0...//////////////////////////////./////..////////0000000000000000/00/000//000000//00/00000000000000000/0000011011111111/111111111111111111111111102111111110222223222232222222222222222222212222222122222222222233232333323333333333332223333334444443343444444444444455555555545555555666666666466777677777787777888889898999989::;:;<<?&((((()))))))******************+++++++++,,------...../////0000011112339=&''(((((()))))))))))))))))))***)**********************************++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---,-----------,--------,,------------.............,............................................///////.////////////////////-//.///////0///////////0/000000000/0000000000//00000/000000/00001011111110111121111111111111011110111111111221222222222222111222221220122333333333333333333444443444445466656666677779:;<&'()*****,,-..///010213&'()*+,,&*+,--15668&((()))++-../01112&&'''''((((((())))))))******+++*+++,+++,,,,,,+,,----.....//.///000112123359:&((())))))))))))))))))***********************************++++++++++++++++++++++*++++++**+++++++*++,*+,,,,,,,,,,,,,,,,,,,,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,----,---------,----,--------------,.---,----..........--........................,........./..............-..../////.///////////////././0/////.////////////////.////////000000/00000000/00/00/000000000.000001111111111011111111111011101111222121222222222220222222222233333333233333233334444433444444444334445645566677777778879999;:&&&&'())))*****+++++++++,,,---..././010133446679&(((()))))*********+++++++++++++++,,,,,-,,,,,------------------...........////////////0000000001111111111222122234466678&()))***+,,---,...///12&''(((()))++,,,/001&'')*)*+***+,,//0/0244&''(()******+++++++,,,,,----------....//./11222245568;&')&'((((())))))))))))*******))****************+++*+++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---,------------,-------------.....-...................................../////////////////////////0///////////////////0000000000000//00/000/0001121111111111101111111112112222222222221222222233333333323223233444443444545666677778679789999999:;:&%&))*)..2&(('))*,,,/1&&&'*+,-,,,-/&'''(((()))********++++++++++++,,,,,,,,,,,------,---..........././//////////0000000111101110112222222122333234445367&()))++0&'(,/&(((()))**************++++++,++++,,,,,,,------,--,............/../////0/000./0011/1001011112212222221233333356677789<%())**+++,&''()***+,,-1&'()))/0&'''(())))*****+++++++++,-,,,----....../////0000011132133449:&&()++,./0033556<&***,,--..../01129&)))*****+++++++++,,,,,,,,,------,-..../....../...///////00000121121222233446778'&('()(()***)***))))**)))*++*+*+)*+***+***********+*******+*+*++*****++++++,+++,+++++,++++,++,++,,,++,++++++++,+++++,,,+,,+++,-,,,,,,,,,-,,,--,,,,--,,--,,-,,,,,-,-,-,-,,,-,-,,,-----,,,,,,,.------.--..-----.-------.-------..-...--.-...---..//../../......./../..../.././..//.../.........////./...///....///0///0/////////00///0/0////0/0///////0/000///0/////.//1000100000/1000010/1000101100/010001/000101101121211211101112022/0121221211111212211212211222212123232212322223323221322322223222322222222323433333332333324333434243332343335545344343544454444445554565465556677768789::9::<<?'((()))))***++++,-....///0/0000111111222334549'''(***++++,,,----.//'&&'(((((((())))))))))))))))))))))****)*************+**************************************++++++++++++++++++*++++++++++++++++++++++,++*+++++++++,++*++++++++++,,,,,,,,--,,,,,,,,,,,-,,,,,,,,-,,,,,,,-,,,,,,,,---,,,,,,,,,,,,--,-------.----,--,,-----------------------,-------,---------......................................./......./............../............//...........././////0/////////.////////////////////-//0///0/////0///..///////////////00000000000/0//0000000/00000000/0000010/00/000100000010/01000000000000111111/01111101011111/1111112211111221111111011111212112122123222222222222112222222222222212222222212122220222223313333333133343333232233223433233344444454444544344444345555555555464545556666666666667777777688899989:9:99::::;;<'),/3''))*****++,,,,,,,-------.........-....././///.////////0/00001113212222233334444677'*+--/...//0358;'*--..//01124'(++++,,..//0/123445<'+++,,,,------...-.....//00/01133456656'',./'(())))))))*********++++++++++++*++++++++++++++++++++,+,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-----------------------........--........///////////////0///////////0000000000//0/0000000010111111111111122222112122222232332333332211333333334244443444544556565667777778:::;:<'())**+,-.--../////01138')++++,,,,----.-..../////0133347''((((((()))))))))))))))))))**************************************+++++++++++++++++++++++*++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,-,,,,,,,,,,,+,,,,,,,,,,,,,,,,,,+,,,,-,,,,,,,,,,,,,,,,,,-,,,,+,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------------------------------------,--,-----------,------------........................-..-....................-.-..-...................-..............///////////////////////////////////-//0/////////////////.////////////////////////////.//.///////////////////0/0000000000000000000000/0/000000000000./000/00000000000/000000/0/0000/000000000000000000000001111111/111001111111111111111111111111010111111110111111101111101010111111111111111112212221022222212222222222222222221121122212222222222222222222221221122322222222233333333133333333323333333333333333332334333333223323333333333333333333333334444434443444444344444443443424344344434433445455555554555555555555555554555566656665656656554666665646666777675777767767977888787887888999989889::::;;:<;<<<<=<??'))+*+++,,,.------..-....///////0000/00001111122222223343334445468'()*++++,+--//100012235'()*+++++,,,,,,---,........////////01101122222333334445668'+,,-..-.///00001122335:''()**+,1'),,,-4'**++,,---------....////////000000/1221233333444469='(()+'()))**+++,,,,,-------../////001'&(((((())((((*((()((())))))))))))*)))))))*))))))*******+*****)****)********+*********+********+***,*****+*************++++,+++++++++++++++++++++++++,++++++*+++++++++,*++++++++*+++++++++++-+*+,,,++++++++,,,,,,,,,,,,,,-,,,,,,,,-,,,,,-,,,,,,,,,,,,,,,,,,-*,,,,,,,,,,,,,,,,-,,,+-,,,,,,,,,,,,,,,--------------------------------------------------------,,--------------------------.........................................-................................./....../-/.........................//./////./////.///////.//////..//////////////////////////////.//////////////////////0///////.////////////////////////0000000000000/000/0/00000000000/00000/00000000000/00/000000000/00100/000200000000/0000000000000101111111101111111112111111111111111212011111111111101101121011110111111111011111212121011111111111222122222223222322212222221222222222112222222222242232222212222222222202222122233333333333432333333323333333233233333132323334223233344334443444444444444334443444446444534545554545535545555554555555666666666466456665666766666777677777777777777788878888878=8899:98999::::;;;;:<<=>=>>BC''())))))*************++++++++++++++++++++++++++++++,,,,,,,,,,,,,+,,,,,,,,,,,,,,,,,,,,,,,----------+--------------------------------......--....-......................-......//////////////////./////////////////////000000000000000//00010000/100000/000000000000/00/00000001011111111111111111101111111111111222222212212222221222222222333333243231333333333333333333333333333333344434434434444444444344555555555565566566675667767776757888989899:;;<<?AD''++,,,-/124')+-/',.1'+,-0124'+,,///00000112226'/'')))*****++++++++,,,,,,,,,-----....././/////////0/0000111111222233334566666778<>'&((()))))*))*******+********+,++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,------------,----../....//...-./.............../////.//..//0////////0//0000/0/001100/00021120111011222112222221232323333333444434355466677779999:(,-..(('(())))**********++++++++++++++++++++++,,,,,,,,-,-,,,,+,,,,,,,,,,,,,,,,---------------------------------..../.-...-............-.........//////////0/////-//0///////////////.//////00000000000000000000000000/00/0000111110111211211/0110101111222223222122221122212343313324333423333233334544444344443444565575565554466666665575777778898989:;(+--.0369;'***+++++++,+,,,--...../////0000011122212333344457(+,..00(,-..///1(()**,,/(((((()****+*+++++++++,,,,,,,,,,,,,,-------------.-.......//////.////0000001112233344566779(+-//11(*****++++++++++,,,,,,,,,,,,,,-----.----,---------------............./////////////////////000000000000000000/0000000011111111000110111112222212221211121223333333333333333233334434444442444455555555545555556666657788888998::;;=?A(+,,,//())****+,,,,.---,..../////00022222333424455567789(+--.//0111123457(**+,,,,,,---------.......//./00011112333444557(*++++++,,,,,,,,,,,,,,,,,,,,,,,,-----------------------..-,----..................-..////////////////00000000000000000000000000001101111110101111111111011122222122222233333233323333234344444444443244444445555555555666556666676788789;;;<;=(,-//0<(*++,,,,..//04457(***+++++++++++,,,,,,,,,,,,,,+,,,,,,,,,,,,---------.------,--------------------..........................///./////////////.//////////00000000.000000000000000000000000000011111010111111111110111111111222222112222121221222222212232223332333333233333333334443444444434444444444454455554555555555666565656556667677767788888888999;;('()***)**+++++++++,+,,,,,,,,,-,,,,,,-,.,---.-.----.--.........///////00//////00000/0000000000001121111111224332334344555889::',,-./(*****+++++++,,,,,,,,,,,,,--------------------,,---..............///////.////////000000000000000000000001111111111111121222222222221223333341333333333344444444444555565666665677799;;()**++++,,,,,,,,--,--------.......////.///000000000010111122222223333333334344445557889(**++,,,,,,,,-------...//////000.1111134445779)++,,,,,,,,----,--------------....................-...................////////.//////////////////////0000000/000000/000000/0/0000000000011111111111111111111111111111111111111111111222222222221222222202222222232222222222333333333333333333332333333333433443434445444444444443444444434444444555555555555554555665555556665666646666666776676777777788888789999999:999:::::9:;;<;<<==AC)+++,,,,,,,,,,,,---------------..-........./////.//////////000000001111111111012222222222222333332333333444444435555556666677797=99<=))**++++,,,,,,,,,,----------------,-------------..//.................................///////////////////////////////////////////00000//00/000000000000/0000000/000001111111101111111111111111111111111111111111111111111111111222222222222122222222222222222222222132222222222223332232333233333323333333333333334334344444444443434444444444444444444555555555555555555565545555666656665666666566777677777688888788888899::::;<<<<>>@&()))))))))))*******************++++++++++++++++++,,,,,,,,,,,,,,,---------.........................///////////.///////////00000000000011111112222333336)+,----.///113444555667899:)('+*++,+,--------.///000000001110112222333244454556669;;)+*,,,-,---.-,--....-.///00000000122222335556666788),,-------............/////////0011111111222222223333443445555546677)')-+-,.,-/),,,,,)+,-----.....-/001112233344556899)*++,-----------...........///////00001111111/111222222223234434445556777699)'--+00011)())))+*****************+++++++++++++++++++++++++++++++++,,,,,,,,,,,,,+,,,,/,,,,,,,,,,,,,,,,,,,,,,,.-----------------/----------,----------/...........--.......-...............///////////////////////1//////////000000/000000000000000/00/00000000000111101101111111131222212232212222222243333333333333332324344244444444443344645555545667567777898<<:)++/144)*--///23)-/////13)++,-,.//0103347)+++-./11122356)/01)+,,,,-------------..........////0000000/001111222222232323444455566665766789:;)*+4)-./6;)&'(((((((()))))*))))))))))),)))*****)**********)******************-********************+++++++++++++++++*+*++++++++++++++++++++++++++++++++++++,++++,++++/+++,,,,+,,-,,,,,-,,,,,,,,,,,,,,,,,,,,,,,/,,*,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------,------------------,-------,,-------------------------------0--.....-............/.....................-........-.........................................................////////////.//.//////////////////////////////./////////////////////////////////////////.////////2//////00000000000000000/00000000/000000000000000000/0000/000/.00000000000000000/0003000000000000001011/111111121110110112111/1111111111111111111101111111111111112010101111111111112222222222222222212222221322222222222222222222232122222233232333333233333333331333333333132333333332333333333333334443444444444344444444434444444444448554555555555455555555554565545555655666666666666666666676666666667777777776776677767777877779878878998999999;;:=:;:;;=@>)++,----....../0/001023333445=)*++++++,,,,,,,,,,,,,,,,,--------------------------------,------.-..........-........................//////0//////////////////////////////0000000000000000000000000000///000011111111111011111111111111111211101111111111110111112022222221222222222222222221222122222222222212222222221333233332333333333323333332333333333333444343444434344444444444444433444444444434565555555445555554555555555565555566666655666456565566666646777677677777886888878999989899::::::9;;;:;;<=>>>),,--.////7;),,--....///0022223333;)(*+++++++,-,-+,,,,,-,,-,,,-,,-,-,-,,.--..-----------------.-.---.-------..--../..............//.././..0////0////0///0/00/0/00/////100001000000011100010101000/0001111111111111211111110121122122222313122332332222333344443334334244444444443434344555455565555666667767777888999:99;;:;:<))),-//0566:<*,--.....././///0011111222233323444445555666567778899;')*+++,,,-.//0122*,,....-//0//0000000001111222223445567768989:<**,,,,,,,------------------....................-....//////////00//////////////.//////////////////000000000000000000000000000000000000000000111111111001111111111011111111111111222222222222222222222222222222022222222222222333333323333323333333333333323333323333344444334443344443444444444444445555444555555455555544555565654656865666667666666666666666777776777677767777777787887888887999889999::9:::::::;;;:;;<<;=<>=>@%'''''(((((((((((()))))))))))))))******************+++++++++++++++++++++++,,,,,,,,,,,,,--------------------..................../////////000001111112226*-...012444559:*--.00222457<>?*+-......///.0000011112233443445566*---..//////00000001112233324445456;>*,,,----..........///0///.///////////000000000000011111111112222222222222222222223333333344444444555555546666666767888889999::;;')))**+++++++++++++,,,,,,,,,,,,-----------....///////////00111123333448*...00013234*),,,,---........///////////0000000001111112222222222333455666788:=*,----......-.....///////////0////////////./0000000000000000000000/000000111111111111111111122222222222222222222222222222202233333332332233333332333443444444444454555555555555555455656666666666666666666666576777757688888898999999::9::;;;:<<<;<==?>=*-.../00011222222233555666678;>*+,,--------............../////////0////////////////00000000000000011111111122222222222222222222222333333333333333344444444455555456666666667777788788999::='()***+++++,,,,,,,,,,,--------...////////000000111233*//000111233333345678*-026*&'(((((())))))))))))**********************++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,-----------------------------...................././///////////////./////////00/000000000001101111111112022222222233332343324445556899*''(-(((((((())))))))))))).)**********)****++++++++++++++++0+++++0+++,,+,,,,,,,,,,,,,,,---------+----2--.3..-..-...........////////////00/0000000000011511111111112222223344444565667788*,,-------............////////0000000000011111111111111222222222222233233333333433333444444455545555666667777777888:;;;;=;===*+.//7*,./5++,,--------------........................../////////////////////.//////////////////////////100000000000000000000000/00000000000000000000000000000000000000000/00000111111111111111111111111110111111111111111111111111111111111122222222222222212222222221122222222222222222222221222221222212222222233333333333333333333333333322333333133333333333333333333333333233332333333333333434434444444444444444444444434444434444444444434444344444434444444555555555555555554554555455555555455553555555555445554566666566565656566666666666666666566666666666666666678577777778777777666777676777777777777777777777777777778787868888888786887788889999999889999999989:9::::9:8:::::::::9;;;;;<;<<<<<=<<====>>>>????@?())*****+++++++++++,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------.........................................//////////////////////////////0000000000000000000000000000101111111111111111112222222222222222333333333334444444444455555567799+*-./268'+,,---...../////////////00000000011111111112211212222333333333334334444444444344555555555666666777888789&'()))))********++,,,,,,,,,----........../////000013+%''((((())))))))))))))))))*******************++++++++++++,,,,-,,,,,,,,,,,,,,,-----------------.-....................//////.//0000/00011112111213333333456+34+-----..////////00/1000111233454545555556568;;?+..././/////00000000000111222212222333333333333343444444445555656566667777867788888899988:;;;;:;;<=>>>>@J++//001112335+/26,+1238:,.///////000000/0111111111111122222222222233332334444444455555555554555566566666677886899989:;;:<@,/11222344455555666566689:;'*,/001,/2346,0011354667779,...////000000000001111111222222222332222222333332333333333335544444444444555555555556666666567777788888999:9::;<<>=)++,,,,---------....///////00000001222222333355678:,//001111122334455565656677778888889=>'*,,,/0011233,8>&,+.---../////0/0//0/000001020000001111111211212113222222222333233333334333344445444443444455554545545665656777777777799878788:;<<>>A&(())*******++++++,,,,,,,,------..../////000001122<,.4,0111333444556578:>-//0000000111101111111111111222222212222222222222222233333333333333333334444444444444444555555555555555566666666656666666665666776777767777678888888778888789879:999999999::::9::;;;====>=>>?>@A&()))****++++++++++++,,,,,,,,,------......./////000011124677,./////00011211122222332445555666656677789889::<-.1259:-/0011111111223222222233333334444444555535666666677777788899999:::;;<>-123578<;>->@-345567889,/0000011112334444446676787:::.00001111221222222222222222222223333333333334333333333333323333444444444434444444444444444455555455555555554554555554555556665666666666666666666666666666666777767757777777777777777677777777776778888788888788888888878899998999999997898999999:99:::;9::::::::::9:;;;;;;;;;;<;:;<<;;;<==<=<>>?AD+-./////0000000000000111111111111111222222222222233333333333333344444444444444445555555666666666777788889./00000,0000111111222222222222222222232222333332333333343333333333333333444434444444444444444444444445555555555553555555555565555646666666666666666666666666666666666666666667677777777677777777776777788888888888888878887788888888888888899998999999998999:::::::89:;9::::::::9:::;;::;;;;;;;;;;;;;;<;<<;<<;==>>>????@AA(**+++,,,,,-------------........./////////00000000000011111111222222223333444455555599.236778;;3.0002233334445555566666667777889:;<?AD.*1222233344556678@.23.112467:/.2233344;/249/.2333332444445556677777778888899:::<=>?/3460+4555668::;<=/07/11120055698889<;<0+44455555555667789999::::?13344569::;;<>G14568:)2234566677787777747888888999:::::;;;;;;<;<<??F+-./0000112244356678999CDS(..49?*489<==23-4,/38>0'(53%&'(()+6420.805/-4++**.4/",
surRLE:"%%%&&&&''''''((((((((((()))))))))********)**+++++++++,,,,,,,-----.....//////001111122343333343457%%'(()**++++,,,--).//112569&&''(()-03%%%%%&&&&'''''(((((((((((((()))))))))))))***++,++,,------....//102:$$$$$$%%$&&&'''''''''(((((()))))****+++++,,,,,,----.......001111467$%%%%&''')***+./23%%%'))))))***+++++,,,,,----../00012'()))))****+++++++,,,--------..........///////////00000000000110222222222233333333333333455568;?@%&&&'''((((((((((())))))))))))))))))))))))))))))))))*********************************************++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------------------------------------------..........................................+.............-............./////////////////////////////////////////////////////////////.0000000000000000000000000000000000000000000000000000000000100000001111111111111111111111111111111111111111111111171111111111111111111111110122222222222222222222222221232222222222222222222223333333333333333333333333333333344444444444444444444444444455555555555555555555555566666666666666666677777777778888888788888999999::::::;<==@@'(())))******+++++++++,,,,-------.......//////0001111111112223222233333334444444545556676778899::;;;=&'''())))*****+,,,----.//000011113457&''''((&))******++,,,,,,,---..//////////0000000111133355666c&''''(((((((((()))))******+++++,,---...///0011212335579''(((()))))))****+++,,,,,-------.//////00111133455577789:&'((())))))*********+*++++++,,,,,,,,,,,,,,,,-------------............/////////00000000001111112222222231334444444555556689=%%''''''''(((()))))))**********+++++++++,,,------......./////0000111223333478%&'''((((())))))))*****+++,,,,--..../112234678;%&''''''''(((((((()())))())))))))))))))))))*************************+++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------------------.........................-........//////////////////////////////////////00000000000000000000000000000111111111111111111111111111111211111222222222222222222223333333333333333334444444444444445555556667877778888:;==&'''((()))))))))***************+++++++++++++,,,,,,,,,,,,,----------------..........//////////////00000000000001111111111111111222222333444444455556678::<E'(((()))****++++++,,,,,,----------.......///0000011111123333444777%'(*****+,,,,,,,-----//0111456%')))))*****++++,,,,,,,,,,,,,-----..//////000111222222335566779=A'))***+,,-1799''(('(()))))))))))))))*******+++++++++++-------......////0000000001112222244445555568<=&()))))*****+++++++++++,,,,,,,,,,-----.-....../////011222>D''''())))))*,,,,,-///000145555='((((((())))))))))))**********+++++++++++++,,,,,,,,,,,,,,,,-----------------.......0.......//////////00000000111111111111111111112222222222222333334555555577889:::;@CD&&&&''((((())))))))***+++++++,,,,,,,,,----..///////00000001111223644466'''''''(((((((())))))))********++++++,,,,,,,,,,,-----------................//////////000000000000111111112222333333444566889:;;''''''(((((((((((())))))))))))))))))))))))))))))))*************************************************************++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------------------------------------------.-----------------------------------------------------------------................................................................................................................................................///////////////////////////////////////////0///////////////////////////////////////////////////////////////////////////////////00000////0000000000000000000000000000000000000000000000000222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222222222221222222222222222222222222222222233333333333333333333333333333333333333333333333333333333333333333333333333333233333333333333333233333333333333333333334444444444444444444444444444444444444444444444444444444444444444444444444444444444555555555555555555555555555555555555555555555555555555555555555555555555555555555666666666666666656666666666666666666666666666666677777777777777777777777777777777888888888888888888888888888888888888889999999999998999999999999:::::::::;;;;;;;;;;;;;<<<<<<<<<==========>>???>B'''(((()))))))))))))********************++++++++++,,,,,,,,,,,,,,----------------............////./////////0000000000011111111111112223222233344444566777888='''((((((((())))))))))))))))********************************************+++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------------------------------------------..............................................................//////////////////////////////////////////////////////////////////////////000000000000000000000000000000000000000000000000000000000000000111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333333333444444444444444444444444444444444444444555555555555555565555555555555556666666666666666666666777777777778888887889888888899999999:::::;;;;;;;=@AGJ()**+,,,-------....//0/00001011112233344445555556677999&(())***-..0))**++++-....../00001111223334555567:A((()))***+++,,-----------........./////////0/000001111111112223333444556688=6B'''((((((('))))))))******************++++++++++++++++++++++,,,,,,,,,,,,,,,,-----------------------...................////////////////////000000000000000001111111111122222222222222233333333344444444566678899:::;;>'((((((())))))))))))))*****************************+++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------------------..............................................................////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000002121111111111/11111111111111211111111111111111111111111112222222222222222222222222222222222222222222222222222222222222223223333333333333333333333333333333333333333333333333333444444444444444444444444444444444444455555555555555555556666666666666666677777777778888886889999999999:::;;;;;;<<<>>>>D&'((((()))********+++++++++++++,,,,,,,,,,,,,------......../////////////00000000000000111111222222233333333333455566667777779>'((())))))))))))))***********+++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,----------------------------------...........................//////////////////////////////////00000000000000000000000000001111111111111111111111111111111111112222222222222222222222222222222333333333333333333344444444444445555555555555566666666666777778888888899999999:;>;;<?<<<===>>@G')++++++++,,,,,,-.....//////000011111122222223334445678&''(())))********+++++,,,,,,,,,,---------.................//////////0000001111111122222222223333444555556668C&&'((((((())))***********++++++++,,,,,,-----------......//////////000000001111122222233333448899<<&((((()))))))))))(*********++++++++++++++,,,,,,,,,,,,,,,,,,,,,,------------------------..........................////////////////////////0000000000000000000000001111111111112222222222222223333333334455666667777888999;<<&())))))*****+++,,,,,,,------..///////002222589'''(((((((((((((()))))))))))))))))))))************************************************++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------------------------------.........................................................................................////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222233333333333343333333333333333334444444444444444444444444444444444444455555555555555555555556666666656666666666666777777777777748888888888899999999999::;;;;;;;;;<<<>>?>>C&'&)))))***++++++,,,,,--.../123334566799;>@'''''(((())***+,--.//0022223456888'(()++,,,----...../////02234357((())))))))))))))))**********************+++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,----------------------------..............................///////////////////////////////000000000000000000000111111111111111111112222222222222222222222222233333333333333333344444444445555666666666667778889999:;;;;>>(***++++,,,,,----.///0001111233335678:'''(((()****++++,,-,----.../011112222459))))))))))))***************+++++++++++++++++++++,,,,,,,,,,,,,,,,,,--------------------------......................................../////////////////////////////////0//0000000000000000000000111111111111111111111111222222222222222222222333333333333333444444444444444455555555555556666666666666777777777888899999:::::;=>>?'(((*)**+,,,,,,--.../&'(()))*,******+,+++++,,,,,,,,,,,-------......////////000011111121333344469>>@&''))*****++,,,,,--./00223458&&'''''''''((((((((())))))))))))***************++++++++++++++,,,,,,,,,,,,,,,,----------..................//////////00000000111111111111222222233333334444445555556666666777777788889;<?C))))*+++,,,,---....///0001111122333455556666779:=((())))**+++++,-----..........//////00000112222233334587999<''(())))**************++++++++++,,,,,,,,,,,,,,-----------------------..............................///////////////////00000000000000000000000000000111111111111111111111111011222222222222222333333333333333444444455555555566666777777889:<>&'((((((()))))))))))))))))))))))******************************************************+++++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------------------------------------------------------......................................................................................................../////////////////////////////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000000000000000000000000000000000000000000111111111111111111111111111111111111111111111111111111111111111111111111111111111222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222233333333333333333333333333333333333333333333333333333333333344444444444444444444444444444444444444444444455555555555555555555555555555555555555555556666666666666666666666666666666666666777777777777888888888888889999999999::::::::::::;;;;;;;;==>>>??AB(())))********++++++++++++,,,,,,,,,,,,,,,,,--------.........////////////00000000000000111111211111111122222222222222222222233333333333344444556666777888(())))*****+++++++,,,,,,,,,,,,,,,--------..../////0011112223458::'''((((())))))))))))))))))))))*************************************************++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,----------------------------------------------------------------------------------........................................................................................................//////////////////////////////////////////////////////////////////////////////////////0///////////////////////////////000000000000000000000000000000000000000000000000000000000000000000000000000000000000111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333333333333333323333344444444444444444444444444444444444444444445555555555555555555555555555555555555555555556666666666666666666666666666666666666666667777777777777777777778777777777888888888888888888888899999999999999999999::::::::;;;;;;;;;;;;;;<<<<>>>?C)*+++++++,,,---------....///////0000011122233333444447********++++++++++++++++++++++,,,,,,,,,,,,,,,,,,------------------------------.................................//.//////////////////////////.///////000000000000000000000000000000000000/0011111111111111111111111111111111022222222222222222222222333333333333333333333333333333334444445444444444445555555555566666666777777777778888899::::::<<>>?@)*+++,,,,----......///00022222222334556788:'*+++,,----...../////0100011122244567')*+++++,,---...//////////.//00000000111112222233333334444455555666779)**+++,,,,,,,,,-------------.........////////////000000111111222333333455555567899:;<=)**,---//00023((())))))*)********************+++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------................................................//////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000001111111111111110111111111111111111111111122222222222222322222222222222222222333333333333333333333333333333333333333332344444444444444444444455555555555555555555666666666666677777777788888999999999:;;;;;<<>?G**++++,,,,,,----------....///0000011122222333344555556677;?F()*****+,,,,,,,,----....../////////////000000000111112222222233433333344444455555779:;''((()))))))))*******************++++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------------------------------------------------..................................................................////////////////////////////////////////////////////////////////////////////////////////////////////////////////000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111222222222222222222222222222222222222222222222222222222222222232222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333444444444444444444444444444444444444444444444444443444444444444444444444444444444555555555555555555555555655555555555555555555555555555555555555555555555555555566666666666666666666666666666666666666666666666666667777777777777677777777777777777777777777777888888888888888888898888888888888888888888999999999999999999999999999999::::::::::::::::::::;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<=========>>>>???@AABCCE)********++++++++++++++,,,,,,,,,,,,,,,,-------------------............../////////////////////000000000000000000000111111111111111111111122222222222222223333333344444444555566666777889889999:;<<='(())**+***+++++++++++++++++++++,,,+-------------......//////////////000020000111122222222333334444455555566899::;;''()))))))**********++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,-------------------.................///////////////////////////000000000000000000011111111122222222222222223333333333344444445555555566777889:::+++,,,---..............///////000000000000001111111122222333333333333333334444555555556666667788::::;;;<>>')*++++,-....011133469**++++---..0111123346779>')))))********+++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------.......................////////////////////////////////0000000000000000000000000000011111111111111111111111111111122222222222222222222233333333333333333344444444444444445555555555555555566666677777888889999:::==?++,,,,....013455))**+++,,,,,-/.//00012244588&'''((((((((((())))))))))))))************************************++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-----------------------------------------------------------------------------------------...................................................................................................-.................................//////////////.//////////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111112111111111111111111111111111111111111211111111111111111111111111111111111111111222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222322222222222222222222224222233333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444444444444444454455555555555555555555555555555555555555555555555555555555555565556555555555555555556666666666666666666666666666666666666666666666666666677777777777777777777777777777777777777888888888888888888888888888888888888888899999999999999999999::::::::::::::::::::::;;;;;;;;;<<<<<<<=======>>>>>??@ADF())))))))))****************+++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------------------------.............................................................////////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000000000000000000000000.000000000000000000011111111111111111111111111111111111111111112111111111111111111111111111102222222222222222222222222322222222222222222222221222222222222222222222222222233333333333333333333333333333333333333333333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444455555555555555555555555555555555555555555555556666666666666666666666666666666667777777777777777777777777777777777777777777777888888879888888888888888899:99999999999:::::::::::::::;;;;;<<<;<<<<==>>>>?@?AD''(****+++++++,,,,,,,,,,,,,,,----....////////00000011111222222233334444444565455666777778:::;<<**++,--.//0113(+,,--./002223'(()*+++,,,,-----.........////////000111122233333344446679:>??(***+++++,,,,,,,,,------......./////////////////000000000011111122222222222333333344444555578*+,--..////0125()))****++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,----------....................//////////////////////////////000000000000000000000000000011111111111111111111110111111111122222222222222222222222333333333333334444444444556666666777778888899999:::;;<<<?'(((((())))))))))))))********************************+++++++++++++++++++++++++++++++*,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,----------,-------------------------------........................./////////////////////////0///////////////////////00000000000000000000000000000000000000000000111111111111111111111111111111111111111111222222222222222222222222222222222222222223333333333333333333333333344444444444444555555555555555556666666677778888889999::::;;;;<>(,/1')))************++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------------------.....................................////////////////////////////////////////////////////0000000000000000000000000000000000000000000000000000000000011111111111111111111111111111111111111111122222222222222222222222222222222222222222222323333333333333333333333333333333333333333344444444444444444444444444444444555555555555555555555555555555666666666665666666666777777777778888888888899999:::::::;;=<<<<<=?+,,,,,-----.....///////0000002111112332222223455588899::;==A**++++,,,,,,,-----------..............///////////////0000000000001111111111101111112222222222223333333334444444404555555556677778888888999::::::;<>@(++++++,,,,-/01223345589?()+++,,,,,,,-......//////00000011123444566666899)*++-./122569<:())********++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-------------------------......................//////////////////////00000000000000000000000000111111111111222222222222222223333333333444444444444444444555556666666676777777888888999:::;<=====>>?ACDG(()+-,///002333359)*********++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------............................../////////////////////////////////////////////0000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222233333333333333333333333333333333333333444444444444444444444444444344444444444444444444444444455555555555555555555555555566666666666666666666666666677777777777777778888888888899999::::::::;;;;<<<===>?@**,,---...////0001223373))***++++++,,,,,,,,,,,,,,,,-------------......./////////////000000000000000111111111111222222233333444444455556666666667777888999::;;;;<@**++++++,,,,,,,----------........////////0///0000000000000111111111111122222223333333333344455555555566667777788999;;<=@D**+++++,,,,,,,,----------------.............-///////////0000000000001111222222222222333333333333333333444444444444444444455565555566666677777777777899999::;;;;:<<=AD))************+++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-----------------------------------------................................................///////////////////////////////////////////////////////////0///0000000000000000000000000000000000/000000000000000000000011111111111111111111111111111111111111111111111111111111112222222222222222222222222222222222222222222222222222222233333333333333333332333333333333333333333333333333333344444444444444444444444444444444444444444444345555555555555555555555555555555555555556666666666666666666666666667777777777777777777888888888888899999999899999:::::::;;;;<=====>>?@)+,,------...////////00001111111111112222222233335444455566666668777:::FG**+,,,,,,,---------.....................//////////00000000000000000011111111222222222333334444444555556666:99::))******++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------------------------------.......................................................////////////////////////////////0000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111112222222222222222222222222222222333333333333333333333333333333333333444444444444444444444444444444444444444555555555555555555566666666666666666777777777777777777777778888888888899999999999999:::::::::;;;;;<====>>>??@E'())))))********++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-----------------------------.............................//////////////////////////////000000000000000000000000000000011111111111111111112222222222222222222222333333333333333333333444444444444444555555556666667777788888999999::::;;<<<==(+-.////01222448;()))****+++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------..........................///////////////////.///////00000000000000000000000000000000000000000000000011111111111111111111111111111111111111111111111111112222222222222222222222222222222222222222222333333333333333333333333333333333333333333333344444444444444444444444444444444444444444455555555555555555555556555555555566666666666667666667777777777777777777777778888889999:::::::::;;;;<<<<===@@CF(****+++++++++++++,,,,,,,,,,,,,,,,,,,-------------------------....................../////////////////////////////////////0000000000000000000000000000011111111111111111111111122222222222222222222222222223333333333333333433333333333333344444444444444444444555555555466666677677877777888888888888889::;;<;;;<=@**++,,,,,,,-----------------.............////////////000000000000001111111111111222222223343344444444645555555556667777778899<:;<<)*++++,,,,,,,,,,,,,,,,,,-----------------------------............................../////////////////////.////////////////00000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333444444444444444444444444444444444444444444444444444444444444444444444444444454444555555555555555555555555555555555555555555555555555555555555555555555555455555555555555555566666666666666666666666666666666666666666666666666666666666777777777777777777777777777777777777777778888888888888888888888888888888888888888888888889999999999999999999999999999999::::::::::::::::::::;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<========>>>>>>>?@@????@@@AABC**++++,,,,,,,,--------------....................../..///////////////////////.0000000000000000000000000000000000000011111111111111111111111111111111111111111222222222222222222222222222222222223333333333333333333333333334444444444444444444444445555555555555555555555555555555666666666666666666666666677777777888888888898899999999:::::;;;;;<<<<<=====>>ABD+++++++,,,,,,,,,,,,,------------------------------------------...................................////////////////////////////////////////////0000000000000000000000000000000000000000000000000000111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222232222222222222222222222222233333333333333333333333333333333333333333333333333333333333333334333333444444444444444444444444444444444444444444444444444555555555555555555555555555555555555555555555555555555555666666666666666666666666666666666666666777777778677877877777777777777788888889888888888888888889999999999999999999:::::::::;;;;;;;;<;<<==>>>>>??@AB+,---..../////000012223344),,,---....../////0000111111111222222233333334444445555666677889:::;;=>B((*(*)(******++++++++++,,,,,,,,,,,,,----------------------------.........-......../////////000000000000/00000000000111111111111111111222222222222223333333333333333333334444444444444555555555556666666666677777788:;;;;;;;;=>???)))+++,,,,,,--------------.........-........../////////////0000000000000000011111111111222222222222233333333444444444444445555555555555555666666677777788888899::;<=>AA+*,,,,,,,,,,,,,,-------------------............../////////////////////000000000000010111111111111111112222222222222222222222223333333333323333333444444444455555555555555566356677778988778999;**+++,,,,------.0142233445::=++)+-.//0122222334449;)+++,,,-.../////0001111111111122222222233333333444444445555655555666688;;<*++++++++,,,,,--------------------................///0/////////////////00000000000000000001111111111111110111111111122222222222222222222222222333333333332333333334444444444444445555555555555555555566666666666777777788888999::;<=)+,...///00111222344467)))))))))))***********+++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------------------------------..................................................////////////////////////////////////////////////////////////////////////////////////0000000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111111111001112222222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333334444443444444444544444444344444444444444444444443455555555555555555555555555666666666666666666666666666777777777777777777788888889999999:::::::::::;;;;;<<===>?*),----..////3112124455889@B)***+,,,-----------....////01112222223334444566666777788;=))+,,,--....//0111222133333455)))*++,,+,,,--------..,.....//////00000000111111111122222222223333323334444444445555555566667767777778889::;<<<=>>AMS*,---------....////////001111111122222233334445556789::=2257:9;<>*++++++,,,,,,,------------..............////0/////////00000000000001111111111111111111222222222222222222222223333333333323333334444444444455555555555555555555555666666666777778888888999999::<<=>=A,../0247,....../00011111122222233333777<((()))))))))))******************++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------------------------------------------------.........................................................../..................................../...................///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222322222222222222222222222222222222222222222222222222222222222222222222222A3333333333333333333333333333333333333333333333333333333333333333353333333333333333333333333333333333333333333333333333334333333333333333333333333333333333333333333444444444444444444444444444444444444444444444444444444444444444444443444444444444444444444444444444444444444444444444444444444444555555555555555555555555555555555555555555665555555655545555555555555555555555455555555555555555555555555555555555555566666666666666666666666666666666666666666666666666666666666666666666666666666666666666666667777777777777777777777777777777777777777777777777777777777777777777777777777777776878888888888888888888888888888888888888888888888888888888888888899999999999999999999999999999999999999999::::::::::::::::::::::::::::::::;;;;;;;;;;;;;;;;;;;;;;;;<<<<<<<?<<<<============<>>>>>>>>????H@@ABNDA+,,,----............../////////000000011111111111111222222222222233333333333333333333344444444445555555655666666777776888888899::=**+++++++++,,,,,,,,,,,,,,,,,,,-----------------------------------.................................................////////////////////////////0//0/////////////////////////00000000000000000000001000000000000000000000000000000000000111111111111111111111111111011111111111111111211111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333323333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444444444444454444444444444444444555555555555555555555555555555555555555555555555555555555555555555555555556666666666666666666666666666666666666666666666666666666666677777777777777777777777777777777777777778888888888888888888888888888888888888888888899999999999999999999999999999999999999::::::::::::::::;:::::::;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<=======>>>>>>=>>>>>>???????@@@@AAAAAABBCCC+++,-----...//00000111111222212333334445555556677899:A++++,,,,,----.///////000000121122344455689(*****++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-.-------------------------------..................................////////////////////////////////////0000000000000000000000010000000000000000000111111111111111111111111111111111111111112222222222222222222222222222222222222333333333332333343333333333333333333344444444444444444444444444444444444444444444444555555555555555555555555555566666666667666666666666666777777777778777888888888888899999::::;;;;<<<<<===>@@BDDHH***+,,,---...//0011111111222333455678<++,-----..............////////////00000000000000000001111111111111111222222222222222222222233333333333333333333334444444444455555555556666667777778888999999;;;;<<<<<<=>?EHO*+,,,----......................////////////////0000000111111111111222222222222222222222223333333333333333444444434444444444445555555555566666666667777888899999::;;<=??@@**+++,-------------..............................................///////////////////////////////////////00000000000000000000000000000000000000000000000001111111111111111111111111111111111111111011111111122222222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333333333333333333344444444444444444444444444444444444444444444444444444444445555555555555555555555555555555555555555555566666666666666666666666666666666666666666777777777777777777777777777888888888888888988888888889999999999999999999999999999:::::::::::::;;;;;;;;;;;;<<<<<<<<=====>>>>??????@J**---....//0001122222233333344445666666667788<>B,---../////00001111222222222233333444444455555466666666777777889999:::;<<>>@+**,----.......//////////0000000000000011111111111222222222222222233333333334444444445555555666667777788889999:::9;;<<<>@G+,--........//////////////////00000000000011111111111111122222222222223333333333323334444444444445555565555566667666667777777889::;>,,,,,,---------......................//////////////////////////00000000000000000000000000000000001111111111111111111111222222222222222222222233333333333333333333433333344444444444444444455555555555555555555555555555566666666666666666666666666777777777777777788888888888999999999999::9::::::::;;;;<<===+,.///2+,,..///0001111222223333334444556666688899::::*+,,,,,,,--------------.........................//////////////////////////000000000000000000000000000000011111111111111111111111111111112222222222222221232222222233333333333333333333333333333333344444444444444444444455555555555555555555555566666666666666666666666777777777777888888889999999::::::;;<<<<<>?*++,,,,,,,-----------------................................///////////////////////////////////00000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222223323333333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444445455555555555555555555555555555555555555555555555555555555555555555555566666666666666665666666666666666666666666666666666666667777777777777777777777777777777777777777788888888888888888888888999999999999999999999::::::::::::::;;;;;;;;;;<<<<<<<<<<<<<======>>>????@@@AABH***,-----.................///////////////000000000000000011111111111122222222222222333343333333444444444445555556666666666666677777788888999::<<=,,,,,,,------------...........................//////////////////////////000000000000000000000000001111111111111111111111111111112222222222222222222222222222222222222223333333333333333333333333333333333444444444444444444444444444444444555555555555555555555555556666666666666677777777777777777777778888888889999999999999:::::::::::;;;;;;;;;;<<====>?>?=>??@ABI++,-37*+--...//00001111222233333333444444445555566666777899;@A**00023689(((()))))))))))))))))********************************+++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------------.................................../..............///.////////////////////////////////////////////////////////////000000000000000000000000000000000000000001111111111111111111111111111111111111111111111222222222222222222222222222222232222222222222222233333333333333333333333333333333334444444444444444444444444455555555555555555555556666676666677777777777777778888888999999:::::;;<=%''((((((((((()))))))))))))))))))))))))))))****************************++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------......../........................../////////////////////////00000000000000000000000000000000111111111111110111111111111111111111112222222222222222222222333333333333333333344444444444444444445555555555556666666777788889::::::=----......................./////////////////////////000000000000000000011111111111111111111122222222222222222222222222222333333333333333333333333333344444444444444444444444444445555555555555555555555555555666666666666666666666666677777777777777778888888899999999::::::::;;;;;<<==>>>???BB-..1112223344457889.--.////00122233445555788<A-----........///////////////////////////0000000000000000000000000000011111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333333333333333333333333333333333333333444444444444444444444444444444444444444444444444444444444444444444444444444444444444444455555555555555555555555555555555555555555555555555555555555555555555555566666666666666666666666666666666666666666666666666666666666666777777778777777777777777777777777777777777777777777777777777777777777777888888888888888888888888888888888888888888888888888888888888899999999999999999999999999999999999999:::::::::::::::::::::::::::::::::::::;;;;;;;;;;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<<=====================>>>>>>>>>>>????????<@@@@@AAABCFI++,,,----//00002123434455**,............////////////000000000000001111111222222222222333333333334444444555555556666667777788899999::;;=?@++,------.......////////////////////////////00000000000000000000000000111111111111111111111111112222222222222222222222222222222223333333333333333333333333333344444444444444444444444444455555555555555555555555555556666666666666666777777777777777777777778888888888888888898889999999:::::::;;;;;;;;;<<<<<<<;=<==>@CC)))**,,///002247%''''''(((())))))))))))))))***********************+++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------------..................................//////////////////////////////////////////////0000000000000000000000000000111111111111111111111111111111112222222222222222222223333333333333344444444455555555555566667777778899::==>>012222333455779---..........//////////////00000000000000000011111111111111111111111112222222222222222222223333333333333333333333333333333444444444444444444444444555555555555566666666666666667777777777777777777888888888888999999999:::::::::::;;;;;<<<===??CG,--.........////////////////0000000000000000111111111111111111111222222222222222222222222222333333333333333333333333333333333334444444445444444444444444444444444555555555555555555555554555555555555666666666666666666666666666666666677777777777777777777777777777778888888888888888888889999999999999999999:::::::::;;;;;;;;<<<<<<<<<<=========??@@@@@BCCIKS.//000013345678;<---....////////0012222357777=///0000000111111111111222222223333333333444444455555566677777788888888899:::::;;<==>>>??..////00000000000000000000000111111111111111111111111222222222222222222222222233333333333333333333334444444444444444444444444444444455555555555555555555555555555555555566666666666666666666666666666666666777777777777777777777777777778888888888888888999999999999999999:::::::::::::;;;;;;<<<<<<<========>???ACCDDEI/0000011111111111122222222222333333333444444444444455555555556666666667777777788888888999999::::;;<=>>>?@@+,,000023444566787788999::</00111122222222233333344445555666677777788899999:;>D,..../////////00000000000000000000000111111111111111111111111111111122222222222222222222222222222223333333333333333333333333333333333333333333333344444444444444444444444444444444444555555555555555555555555566666666666666666666666666777777777777777777777788888888888888888888889999999999999::::::::::::::::::;;;;;;;;<<<======>>>@@B116..////////0000000000000000001111111111111111222222222222222333333333333333333333444444444444444444444444444445555555556555555555555566666666666666666777777777778888888888888888999999:::;;;;;<<<<<==>>?FGHQS,,.///001134,012566678899B+++,+---..............///////////////////0000000000000000000000000000000001111111111111111111122222222222222222222222222222333333333333333333333333333333333333333334333333333444444444444444444444444444444444444444444445555555555555555555555555556555555556666666666666666666666666666666666667777777777777777777778777777788888888888888888888899999999999999999:::::::::;;;;;;;;;<====@AC***++,--.-..//0112,../011111222222233333334455556676789::;<>-00011112112233444555455566666677778888899:=?-.///////00000001111111121111112111111222222222222222222222222222222222333333333333333333333333333333333333333344444444444444444444444555555555555555555555555555555555555555555666666656666666666666666666666664666667777777777777777777777777777777777777777777777888888888888888888888889999999999999999999999999999::::::::::::::::::::::::;;;;;;;;;;;;<<<<<<<<<<<<<=====>>>>???????@@AABBG*+++++++,+,,,,,,,----...//////0//////000225...////////000000000000000011111111111111111222222222222333333333333334444444444444444444444555555555555555555566666666677777777777777888888888999999999999::::::;;;;;<<<<=>>?00111111111222233333334444455556677777889:::;;<==>>?B/////0000001111111111111111112222222222222222222222222222222333333333333333333333334444444444444444444444455555555555555555555555555556666666666666666666666666666777777777777777777777777788888888888888888888999999999999999999999999:::::::::::;;;;;;;;;;<<<<<<<<<<=======>>>>???BC--011123455788899:;;;?22357889:>?0011223333333344444555556666777778888889999::::::::::;;;;<<=====>>??@@AAABBCHH..../////////////00000000000000000000000111111111111111111111111122222222222222222233333333333333333333334444444444444444444555555555555555556666666666777777777777888888888888888888999:::::::::;;;;;<====>>??@BC.000000001111111111112222222222222222222222222222222223333333333333333333333333333333344444444444444444444441444444444444444444444555555555555555555555555555555555555555555666666666666666666666666666666666666666666666666666666666666666666666667777777777777777777777777777777777777777777777777778888888888888888888888888888888888888888888888888888888888889999999999999999999999999999999999999999999::::::::::::::::::::::::::::::::::::::::::;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<<<<<<<<<==================>>>>>>>>>>>>>?????????????@@@@@@@@@AAABBCCCC///111102222333324468:///000000000001111111111111111111222222222222222222222222222222222222222222223333333333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444444444444455555555555555555555555555555555555555555555566666666666666666666666666666666666666666666666666666666666666677777777777777777777777777777777777777777777777777777777777777777777888888888888888888888888888888888888888888888888888999999999999999999999999999999999999999999999999999999999999999999:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::;:;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<<<<<<<<<<<<<<<======================>>>>>>>>>>>>>>>>>>>>>?????????????@@@@@@@@@AAAAAABBBBCCCDDDFGG,,,-.......//0112222711222233333345556666666777777778888899999::::;;;<<=>?00112222222222223333333333444444444444444555555555555555566666666667777777778888899999:::::::::;;;;<<<<<<<>??@BFG0000011112222222222222223333333/33333344444444444555555555555555666666666666666677777777777777788888888999999999999999::::::;;;;;;;==>>???AB-../1,2250111222222333334445566677889:::;<B0122222344444445555666666666666677777788888899999:::;;;=>B1223333334444444445567777788889::::;=<=???/01112222222233333333333333444444444444455555555566666666667777777777777777787888888888888888888888888899999999999999999:::::::::;;;;;;;;;;;;;;;;;<<<<<<<<<<<=====>>>>>>????@@AACCIL57888:12244444455555556666667777788999999999::;<<=<=>>?/1222359>33444555566666666777777888899999999:;;;;<<=>@2233344444444444455555555566666666777776777777778889999999999::::::::::;;;;;;<<<<<=>@@AB2334455555666666677778888888899::::;;;<<<<<===>>>ABC13455667798<<<?A444455566666666667777777777777777778888888888888888888888899999999999999999999999::::::::::::::::::::;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<<<<=========>>>>>>>>>>>>>??????@AAAAAABBBBCCCCDEEEEFFGKK13666677778779999::<>>c385667777777777788888888::;<>>>??AD38<<<====>?BDH#########################################&&'+,-.3',%+),--()**+,--.//0*/12((*./26'))))*********++++++,,,,,,,,--------...........//////////0000011111122222333344455566678+,-02226-)/0123***+-./1())))***+,,,----...//001237)*-.0(+-/0056)))**+++,,--....///000233***++,---.//01128&),0)**,-17*-.0122457'*-1+,(*++,,,,----..//000112247,-./027'')*++,,--//013(***++++,,,,,,,,,,-----------3............//////////////000000000000001111111111111222222222333333344445555556667779;;*+,-..013(()))))***********++++++++,,,,,,,,,----------------..............////////////0000000000000000111111111112222223333333444444555567-0970)+,-./1239'()***++++++,,,---...///00011122257))*******++++,,,,,-----...........///////////000000111111111222222333334555566788:****+,.../13448***++,,,----...///////000000111112222233334555778;)../2234*+--1234/0***+,,--.000////112234669))))***++++++,,,,,,------.......//////0000111111122223333444689*,)./01459+*//133(-....///123467*../00256),**++,,------..//0011122233444568(**,-.1*+-/049)+,,-.//148<)5-24*+--..///001113455()*******+++++++,,,,,,,,----------........////////////0000000000001111111112222223333333334445555566778899:<(),,--../01333=,.29)*******+++++++,,,,,,,,,-------------...........///////////000000000000111111112222222222333444555555679:.+2+,,--.//011222233345588;*++,-///111,-1248+++,---.////012233667**+++++++,,,,,,,,,,------------....//////0000000001111112222222243333334555888;2336)*+,,-1.../000011122388;*****++++,,,,,,,,,-------------.............../////////////////000000000000000000000000111111111111111111111222222222222222233333333333333334444444444445555555666666777778888999::;;<>=+,,../00127;+-./0012334,,--./14--..///0244<11(++,,--//0125+,.01())))****++++++,,,,,,,--------------...........///////////////////000000000000000000000111111111111222222222222222222333333333334444444444455555556666667778888899::;(***+++++++,,,,,,,,,,,--------......../////////////////00000000000000111111111111111222222222333333333344444444555556677799:;<<>*,.////002244H-.+./25-../3+/*,,---/0111238*+/,,--....////0012456)+++++++,,---------....../////////////00000000000000001111111111111222222233333333334444445566677778:;+,0+,,-001229/*.000)*+,,,,----../////0001122333457884,,,,---.//011122446,,-//001128+,11,,--.//001123445689;@++,,,----...//000011112222333444446788@,/,,.012278,,,-----.....//////000000112223333334445556668:**++,,,----.....//////////0011112245;5)+,,----....///////00011111222234557,-..///000112333345:+,--.//00112223469+,------....//00000011111122222233333333444444445555566788889:;<?++,,---.....////0111122233334455566667999++,,-...///000001111111112222233333444455556666666777888999:<=>'****++,,,,------..///00111122348012236+,-...00123568+....//0222344455799,-.///00122334559--0125.//0235+-//000112333344556?01+++,,,,--...////00011111122222233334445566789:A-/015/25=01175=+00369,1224579993))**+++++,,,,,,,,---------................./////////////////000000000000000/000001111111111111111112222222222222222222223333333344444444444444445555555555555555666666677778888999:;;;==,,-//14+,,-----.......//////////00000111111112222233333334444555556666777889@-.4./25:,,,---...../00000001122233333344455679::.3-/01123357<<,,-0240033--..////0011122333334445555666778:;;;=?())******+++++,,,,----......////0011234,.225+.113-034,---..//011122333445699:,,./035/025./0011122233455-...///0000011122222333334445555666777788:00144567-.//1112334455678D***+,,,--.////0-122346/007')**+++,-----........///////00001111112222222344445577778())**+,,,---..//00022345557?-00111245668:/./146..../////0000001111111122222222233333333334444444455555556666677777777777888888899999::;;;<<<=>*+,,,,,---......///0000000011111222233444445568:;02,.//000002222333468<)***+,--.00114()**+++,,,--........//0000111152/15-.//00112233445667777899;;@.003618<123581122789-047;+-/11301578<013345567789;,-..////0011123480145566699:;+./044/0111124444566799)**+++,,---../////00223713467;22457789@0111135555666777779:;>)**++,,---...//00011238255/23.00123445568128?.0234480122333334444444455556666777888889999999::::::;;;;;<<=?AC...///0000-11111122233333344445667789:/2222333334444555556666666677788889:::::;<=A,,,,,------....../////0000001111111223333445645730245:6./12446277836<4291<589>/11233458:2/@###########&)*1&)(++-.0,,,.,0*+,*--),12459/13)*-3*,,---/12212)),-..,*+,/015.0,,--//+--1122234502()-.000236-.1,+.+-/12,.-2-+,0-.-.3.0*9*.222425,-./4,+1/,,-...00123724//:9)*--/6,14(//3*-.0,15*+,,--..../01126+.20-+,-+138;/046.39,2560;3?"}

},{}],"C:\\ksana2015\\z0y\\src\\actions.js":[function(require,module,exports){
var Reflux=require("reflux");
module.exports=Reflux.createActions(["search"]);
},{"reflux":"C:\\ksana2015\\node_modules\\reflux\\index.js"}],"C:\\ksana2015\\z0y\\src\\candidates.js":[function(require,module,exports){
var React=require("react");
var store=require("./store");
var actions=require("./actions");
var Reflux=require("reflux");
var ucs2string=require("glyphemesearch").ucs2string;
var getutf32=require("glyphemesearch").getutf32;
var KageGlyph=require("./kageglyph");
var E=React.createElement;

var styles={candidates:{outline:0}};
var fontserverurl="http://chikage.linode.caasih.net/exploded/?inputs=";

var Candidates=React.createClass({displayName: "Candidates",
	mixins:[Reflux.listenTo(store,"onData")]
	,getInitialState:function(){
		return {candidates:[],joined:[]};
	}
	,fontcache:{} //buhins already in memory
	,loading:[] //loading buhins
	,load:function(reader) {
		var that=this;
		return reader.read().then(function (result) {
			var str = String.fromCharCode.apply(null, result.value);
			var json=JSON.parse(str);
			KageGlyph.loadBuhins(json);
			that.loading.forEach(function(glyph){that.fontcache[glyph]=true});
			that.loading=[];
			that.fontdataready=true;
			that.setState({candidates:that.renderCandidates(that.state.searchresult)});
		});
	}
	,loadFromServer:function() {
		var url=fontserverurl+this.loading.join("");
		fetch(url).then(function(response){
			return this.load(response.body.getReader());
		}.bind(this));
	}
	,renderCandidates:function(searchresult) {
		var o=[];
		for (var i=0;i<searchresult.length;i++) {
			var glyph=ucs2string(searchresult[i]);
			if (this.useKage(glyph)){
				if (this.fontcache[glyph]) {
					o.push(E(KageGlyph,{key:i,glyph:"u"+searchresult[i].toString(16)}));
				} else {
					this.loading.push(glyph);
				}
			} else {
				o.push(glyph);
			}
		}
		if (this.loading.length) {
			this.loadFromServer();
		}
		return o;
	}
	,useKage:function(glyph) {
		return getutf32({widestring:glyph})>0x2A700;
	}
	,onData:function(data) {
		this.fontdataready=false;
		this.setState({searchresult:data,candidates:this.renderCandidates(data)});
	}
	,isHighSurrogate:function(code) {
		return code>=0xD800 && code<=0xDBFF;
	}
	,getGlyphInfo:function(glyph) {
		this.props.action("selectglyph",glyph);
	}
	,onselect:function(e) {
		var svglabel=e.target.parentNode.attributes["label"];
		if (svglabel) svglabel=ucs2string(parseInt("0x"+svglabel.value.substr(1)));

		var selChar=svglabel||e.target.innerText;
		
		if (selChar) {
			if (this.prevSelected) this.prevSelected.style.background="silver";
			e.target.style.background="yellow";
			this.prevSelected=e.target;
			this.getGlyphInfo(selChar);
		}
	}
	,render:function() {
		return E("span",{ref:"candidates",
			onMouseUp:this.onselect,
			style:styles.candidates},this.state.candidates);
	}
});
module.exports=Candidates;
},{"./actions":"C:\\ksana2015\\z0y\\src\\actions.js","./kageglyph":"C:\\ksana2015\\z0y\\src\\kageglyph.js","./store":"C:\\ksana2015\\z0y\\src\\store.js","glyphemesearch":"C:\\ksana2015\\z0y\\node_modules\\glyphemesearch\\index.js","react":"react","reflux":"C:\\ksana2015\\node_modules\\reflux\\index.js"}],"C:\\ksana2015\\z0y\\src\\glyphinfo.js":[function(require,module,exports){
var React=require("react");
var getutf32=require("glyphemesearch").getutf32;
var E=React.createElement;
var styles={thechar:{fontSize:"300%"}};
var KageGlyph=require("./kageglyph");

var GlyphInfo=React.createClass({displayName: "GlyphInfo",
	render:function() {
		var glyph=this.props.glyph;
		var utf32=getutf32({widestring:glyph});
		var codepoint=utf32.toString(16).toUpperCase();
		var unihan="http://www.unicode.org/cgi-bin/GetUnihanData.pl?codepoint="+codepoint;
		if (this.useKage(utf32)) glyph=React.createElement(KageGlyph, {size: 100, glyph: "u"+utf32.toString(16)}) ;
		return E("div",{},
			E("a",{target:"_new",title:"Unihan",href:unihan},"U+"+codepoint),
			E("span",{style:styles.thechar},glyph));
	}
	,useKage:function(uni) {
		return uni>0x2A700;
	}
});
module.exports=GlyphInfo;
},{"./kageglyph":"C:\\ksana2015\\z0y\\src\\kageglyph.js","glyphemesearch":"C:\\ksana2015\\z0y\\node_modules\\glyphemesearch\\index.js","react":"react"}],"C:\\ksana2015\\z0y\\src\\glyphsearch.js":[function(require,module,exports){
var React=require("react");
var actions=require("./actions");

var E=React.createElement;
var styles={
	logo:{fontSize:"150%",textDecoration:"none"},
	tofind:{fontSize:"200%"}
}
var GlyphSearch=React.createClass({displayName: "GlyphSearch",
	getInitialState:function() {
		return {successor:false,tofind:"地"};
	}
	,dosearch:function(){
		actions.search(this.state.tofind,this.state.successor);
	}
	,onchange:function(e){
		clearTimeout(this.timer);
		var tofind=e.target.value;
		this.setState({tofind:tofind});
		this.timer=setTimeout(function(){
			this.dosearch();
		}.bind(this),500);
	}
	,onkeypress:function(e) {
		if (e.key=="Enter") {
			this.dosearch();
		}
	}
	,toggleSuccessor:function(e) {
		this.setState({successor:e.target.checked},function(){
			this.dosearch();
		}.bind(this));
	}
	,componentDidMount:function() {
		var that=this;
		setTimeout(function(){
			that.refs.tofind.getDOMNode().focus();
		},500);
	}
	,render:function() {
		return E("div",{},
			E("a",{style:styles.logo,href:"https://github.com/g0v/z0y"},"零時字引"),
			E("input",{ref:"tofind",size:3,style:styles.tofind, value:this.state.tofind,
			  onChange:this.onchange,onKeyPress:this.onkeypress}),
			E("label",null,
				E("input",{type:"checkbox",onChange:this.toggleSuccessor,value:this.state.successor})
			,"多層拆分")
		);
	}
});
module.exports=GlyphSearch;
},{"./actions":"C:\\ksana2015\\z0y\\src\\actions.js","react":"react"}],"C:\\ksana2015\\z0y\\src\\kageglyph.js":[function(require,module,exports){
var Kage=require("kage").Kage;
var Polygons=require("kage").Polygons;
var React=require("react");

//var mockdata=require("./mockdata");
//var glyphs=["u5361","u897f","u52a0","u6cb9"];
var kage = new Kage();
kage.kUseCurve = true;

var loadBuhins=function(fromserver){
	for (var buhin in fromserver) {
		kage.kBuhin.push(buhin,fromserver[buhin]);
	}
}
var KageGlyph=React.createClass({displayName: "KageGlyph",
	propTypes:{
		glyph:React.PropTypes.string.isRequired
		,size:React.PropTypes.number
	}
	,render:function(){
		var polygons = new Polygons();
		kage.makeGlyph(polygons, this.props.glyph);
    var svg=polygons.generateSVG(true);

      //viewBox="0 0 200 200" width="200" height="200"
    size=this.props.size||32;
    svg=svg.replace('viewBox="0 0 200 200" width="200" height="200"',
      'background-color="transparent" viewBox="0 0 200 200" width="'+size+'" height="'+size+'"');
		return React.createElement("span", {label: this.props.glyph, dangerouslySetInnerHTML: {__html:svg}})
	}
});
KageGlyph.loadBuhins=loadBuhins;
module.exports=KageGlyph;
},{"kage":"C:\\ksana2015\\z0y\\node_modules\\kage\\index.js","react":"react"}],"C:\\ksana2015\\z0y\\src\\main.jsx":[function(require,module,exports){
var React=require("react");
var GlyphSearch=require("./glyphsearch");
var GlyphInfo=require("./glyphinfo");
var Candidates=require("./candidates");
var E=React.createElement;

var maincomponent = React.createClass({displayName: "maincomponent",
  getInitialState:function() {
    return {glyph:"　"};
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
},{"./candidates":"C:\\ksana2015\\z0y\\src\\candidates.js","./glyphinfo":"C:\\ksana2015\\z0y\\src\\glyphinfo.js","./glyphsearch":"C:\\ksana2015\\z0y\\src\\glyphsearch.js","react":"react"}],"C:\\ksana2015\\z0y\\src\\store.js":[function(require,module,exports){
var Reflux=require("reflux");
var actions=require("./actions");
var glyphemesearch=require("glyphemesearch");
var store=Reflux.createStore({
	listenables:actions
	,onSearch:function(glypheme,successor) {
		//console.log("toggle",itemidx);
		
		this.trigger(glyphemesearch(glypheme,successor));
	}
});

module.exports=store;
},{"./actions":"C:\\ksana2015\\z0y\\src\\actions.js","glyphemesearch":"C:\\ksana2015\\z0y\\node_modules\\glyphemesearch\\index.js","reflux":"C:\\ksana2015\\node_modules\\reflux\\index.js"}]},{},["C:\\ksana2015\\z0y\\index.js"])


//# sourceMappingURL=bundle.js.map