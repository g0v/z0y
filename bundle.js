(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

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
},{"./mkdirp":5,"fs":undefined,"http":undefined,"path":undefined}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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
},{"./downloader":1,"fs":undefined,"path":undefined}],4:[function(require,module,exports){
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
},{"./html5fs":2}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
module.exports = require('./src');

},{"./src":20}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
/*! Native Promise Only
    v0.7.6-a (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/
!function(t,n,e){n[t]=n[t]||e(),"undefined"!=typeof module&&module.exports?module.exports=n[t]:"function"==typeof define&&define.amd&&define(function(){return n[t]})}("Promise","undefined"!=typeof global?global:this,function(){"use strict";function t(t,n){l.add(t,n),h||(h=y(l.drain))}function n(t){var n,e=typeof t;return null==t||"object"!=e&&"function"!=e||(n=t.then),"function"==typeof n?n:!1}function e(){for(var t=0;t<this.chain.length;t++)o(this,1===this.state?this.chain[t].success:this.chain[t].failure,this.chain[t]);this.chain.length=0}function o(t,e,o){var r,i;try{e===!1?o.reject(t.msg):(r=e===!0?t.msg:e.call(void 0,t.msg),r===o.promise?o.reject(TypeError("Promise-chain cycle")):(i=n(r))?i.call(r,o.resolve,o.reject):o.resolve(r))}catch(c){o.reject(c)}}function r(o){var c,u,a=this;if(!a.triggered){a.triggered=!0,a.def&&(a=a.def);try{(c=n(o))?(u=new f(a),c.call(o,function(){r.apply(u,arguments)},function(){i.apply(u,arguments)})):(a.msg=o,a.state=1,a.chain.length>0&&t(e,a))}catch(s){i.call(u||new f(a),s)}}}function i(n){var o=this;o.triggered||(o.triggered=!0,o.def&&(o=o.def),o.msg=n,o.state=2,o.chain.length>0&&t(e,o))}function c(t,n,e,o){for(var r=0;r<n.length;r++)!function(r){t.resolve(n[r]).then(function(t){e(r,t)},o)}(r)}function f(t){this.def=t,this.triggered=!1}function u(t){this.promise=t,this.state=0,this.triggered=!1,this.chain=[],this.msg=void 0}function a(n){if("function"!=typeof n)throw TypeError("Not a function");if(0!==this.__NPO__)throw TypeError("Not a promise");this.__NPO__=1;var o=new u(this);this.then=function(n,r){var i={success:"function"==typeof n?n:!0,failure:"function"==typeof r?r:!1};return i.promise=new this.constructor(function(t,n){if("function"!=typeof t||"function"!=typeof n)throw TypeError("Not a function");i.resolve=t,i.reject=n}),o.chain.push(i),0!==o.state&&t(e,o),i.promise},this["catch"]=function(t){return this.then(void 0,t)};try{n.call(void 0,function(t){r.call(o,t)},function(t){i.call(o,t)})}catch(c){i.call(o,c)}}var s,h,l,p=Object.prototype.toString,y="undefined"!=typeof setImmediate?function(t){return setImmediate(t)}:setTimeout;try{Object.defineProperty({},"x",{}),s=function(t,n,e,o){return Object.defineProperty(t,n,{value:e,writable:!0,configurable:o!==!1})}}catch(d){s=function(t,n,e){return t[n]=e,t}}l=function(){function t(t,n){this.fn=t,this.self=n,this.next=void 0}var n,e,o;return{add:function(r,i){o=new t(r,i),e?e.next=o:n=o,e=o,o=void 0},drain:function(){var t=n;for(n=e=h=void 0;t;)t.fn.call(t.self),t=t.next}}}();var g=s({},"constructor",a,!1);return s(a,"prototype",g,!1),s(g,"__NPO__",0,!1),s(a,"resolve",function(t){var n=this;return t&&"object"==typeof t&&1===t.__NPO__?t:new n(function(n,e){if("function"!=typeof n||"function"!=typeof e)throw TypeError("Not a function");n(t)})}),s(a,"reject",function(t){return new this(function(n,e){if("function"!=typeof n||"function"!=typeof e)throw TypeError("Not a function");e(t)})}),s(a,"all",function(t){var n=this;return"[object Array]"!=p.call(t)?n.reject(TypeError("Not an array")):0===t.length?n.resolve([]):new n(function(e,o){if("function"!=typeof e||"function"!=typeof o)throw TypeError("Not a function");var r=t.length,i=Array(r),f=0;c(n,t,function(t,n){i[t]=n,++f===r&&e(i)},o)})}),s(a,"race",function(t){var n=this;return"[object Array]"!=p.call(t)?n.reject(TypeError("Not an array")):new n(function(e,o){if("function"!=typeof e||"function"!=typeof o)throw TypeError("Not a function");c(n,t,function(t,n){e(n)},o)})}),a});

},{}],9:[function(require,module,exports){
/**
 * A module of methods that you want to include in all actions.
 * This module is consumed by `createAction`.
 */
module.exports = {
};

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"./joins":21,"./utils":25}],12:[function(require,module,exports){
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

},{"./ListenerMethods":11,"./utils":25}],13:[function(require,module,exports){
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

},{"./utils":25}],14:[function(require,module,exports){
/**
 * A module of methods that you want to include in all stores.
 * This module is consumed by `createStore`.
 */
module.exports = {
};

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{"./index":20,"./utils":25}],17:[function(require,module,exports){
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


},{"./index":20,"./utils":25}],18:[function(require,module,exports){
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

},{"./Keep":10,"./index":20,"./utils":25}],19:[function(require,module,exports){
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

},{"./Keep":10,"./bindMethods":15,"./index":20,"./mixer":24,"./utils":25}],20:[function(require,module,exports){
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

},{"./ActionMethods":9,"./Keep":10,"./ListenerMethods":11,"./ListenerMixin":12,"./PublisherMethods":13,"./StoreMethods":14,"./connect":16,"./connectFilter":17,"./createAction":18,"./createStore":19,"./joins":21,"./listenTo":22,"./listenToMany":23,"./utils":25}],21:[function(require,module,exports){
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

},{"./createStore":19,"./utils":25}],22:[function(require,module,exports){
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

},{"./index":20}],23:[function(require,module,exports){
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

},{"./index":20}],24:[function(require,module,exports){
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

},{"./utils":25}],25:[function(require,module,exports){
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

},{"eventemitter3":7,"native-promise-only":8}],26:[function(require,module,exports){
var React=require("react");
require("ksana2015-webruntime/livereload")(); 
var ksanagap=require("ksana2015-webruntime/ksanagap");
ksanagap.boot("z0y",function(){
	var Main=React.createElement(require("./src/main"));
	ksana.mainComponent=React.render(Main,document.getElementById("main"));
});
},{"./src/main":37,"ksana2015-webruntime/ksanagap":3,"ksana2015-webruntime/livereload":4,"react":undefined}],27:[function(require,module,exports){

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
},{"idsdata":undefined,"strokecount":29}],28:[function(require,module,exports){
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
},{}],29:[function(require,module,exports){
module.exports=require("./strokecount");
},{"./strokecount":30}],30:[function(require,module,exports){
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
},{"./strokestr":31}],31:[function(require,module,exports){
module.exports={bmpRLE:"())&&%)&&&''(((())))))***+++,,,,,.../36'++))*+04(((((((()))))))))********++++++++++++++,,,,,,,,,,,,-.---------.....////////0000000111111111111111222222223333445566677788:=)+-.5(()*****,7+../09'',/2'))*+++++,,---.//01.)((())**++++++,,,,,-----....../////00111111111111233344567()))**+++,---./144445./0'+.8**.0001=*/'))0+&&*+)))***++,---/01124;'-..2'')*+,/11((()))**************+++++++++,,,,,,,,,,,,,,,----------------.......................////////////////////////////00000000000000001111111111111112222222222333333333344445555555666778889::<=(()++,-17(**********+++++,,,,,,,,,--------.......///////////0000000111111122222222233333334444555667;</2,,,(+/115()))**++++++,,.../03())))))*******++++++++++++++++++,,,,,,,,,,,-------------------*----.........///////////////////////000000000000000011111111111111222222333334455666677789==)**+,--/023<'(())****+,,,,----.......//00000111122258=(*+-/-/12)*++,,-....//00())*+++,,,,,-..//111226'*(((())))))))*********+++++++++++,,,----------------...............//////////00000000011111111111122222222222233333334444455566667889?)'--/2(+.(()))******++++,,,,,,--......////////00000111122333447799//13)))**++++++++,,,,,,,-----.....////01111222333367)+123*,0'))))**++++,,,,,,--...///0001228+3)*+++.//123()**++,,,,,,,,--....../////01112233467())*))*++**+******+,,++++++++,+,,,,,,--,,-,,,,,---,,.-.-.--.----,.--.../....../../.././/...//.../////////00/0/0///00010010001111011112122121111222322222223223435545554557766677799>**+++,---./01224*++,,((()))*********++++++,++++++++,,,,,,,,,,,--,,,--.-----.............././//00///////////00000000000000000000111111111111112211111122222222222222234333333444444555555555555667778888:::<<+--./**++,,,,---.....////////////00000111122233335578*-0))+,-./24:,,--/12)+-,---.../22))******+++,,,,,,,,,,----------......////////////000000000000111122222233333333344455555566799:<)34+--..//1122234)*****++++++++++,,,,,,,----------------.............././//////////////////0000000000000000000000000111111111111111111111111112222222222222222223223333333333333233333333344444444444445555555666666666667777777777788799::::**++++,,,,,,-----..../////-/00000011122334444679:<)**,,,//15)++++,,,-..//////00000111122333477:*+--.///0133345,)+++++,-.......////0000011111133333556=-+.23'(()()*)***********+++++++++++,,,,,,,,,.,,,,-------.--------......../.......././.......//////////////////////0000000000000000000000011111111111111222222222222223222233333333333433333344444444444444555555566666666777777888889899:::;;=))***+++++,,,,,,,,------.........////////////00000000000000000111111111111222222223333333333344444455667677789::=++.1,-.0+,/++---1458'-)**+++++,,,,,----........///100001112222233344455689+****++++++++++,,,,,,--------........//////00000001111112222223334445667777;))))****+,+++++,-,,,,,,----------........//////0/////0000000000111122222222223333443345444566667:,,--../111225=*++,,-----......////00000001111112223333444444455669;<-0124/23***,,,--..//00001222345567:0**++++,,,,,,-------------.........///////////////0000000011111111111122222222222233333334455555566678889:;;?*,-..0112368<+,,--../001122357+,,---../001334689@**+++++,,,,,,,,,,--------........//////////////////00000000011111111111112222222222233333333344444444455555557777889::<A+,.14447;---./01)*++,,,,,----------.......///////0000000000000000011111111122222223333333434444444455555556777888899;=*,,,,---...////00000000111112233333455678@**++++++,,,,,,,,----................./////////000000000000111111111111222222222223333333444555555577888899A*+,,,,---......./////0000112223333334444444556679)++,,----.//00003456,-------.........//////////////00000000000011111111111112222222222222222222222222222333333333333334444444444444444555555565555555555566666666567888888889999::::;=>A,--....//////000000111111222222233444444455555556667789::<<+,,,,--------------.............//////////0000000011111111111122222222222222222233333334444444444555555666666677777889999:;;;;<<>,.-.//012236,-....../113:(+,,,,---.//00011334568;---....///0111112334559--.......////0000111113355578,///,,-,.00111112244458*--../00111112233344445790))**+-++++++++++++,,,,,,,,---------............./////////////////0000000000000001111131111111112222222222333333333444455556667788889.5,0-.123--.2138+,,,--..../////001111111122233344444445557,.33559)+++,,,,,------------..........//////////////////000000000000000000010111111111111111111111112222222222222233333333333333333344444444444444444444444444444445555555555555555555555556666666666666777777777777888888889999999999999:::::;;;<<<=>>?@@@AAF+,----..//00000234556*,,,---........./////////000000000111111111111222222222212333333334444444444444444555556666666677777788899999:::<?,-.012-/337++,,,---......///////0000111111111111111122222222222333333444444444455555566777789::;;<>,-.//--...////001122333344455666668=B.000122222333344566776<,,,--.................////////////////000000000111111111111222222222222222233333444445555555566666667777777888888999:.02445:,-//12459+./01112333334448<-../02223356689<<....//12234556666..///////000111222222222233333445679:02233-0118---....////////0000001111111122222233334444555555677778999:;<,,--........///////////////000000111111112122222222222222233333333334444444555556666677889::;<?/////0000234467:,,,-.........////00000111122223333344444455555556666788899;=>B-.,2701277**++++,,-------.../////01111222233334556;()***+++,,0,,,,,-----11......///0004011111222234::,,--.....///0//00000011222233333333344445666668899;;?.-.////000111111122222222333344444455555555555666666666666777777777888888888899999999::::::;;;<@///000125777?.0016..////000111111122223333333334444444678889124(()**-**+++,,,,,-------.......///00000011112223323444678-..///000012233344567779<C.//011111111222333344444445555556666677999::;<>GW9../270001113347889;///0000001111112333333334444444555555566666677788888899::;<<==>01111345556689:0246678:///01335669//000111111111222233333333444444444555555555566666666667777888888999;;<./000011111122333334444445555555666778:;45.///00000111111111122222223333333444445555555566666777888889999::::;==>?822561444>/001111111122222223333333344444555555555666666677777778888888899999:::;;;<=>?@E347./1122222333333444444556666789:;</0169<//11111122334444555555566667777889;;;;<<=@7811239<122335555667999:;;E/01112222222233333333333444445555555555666666666666666666777777777788888888899999999999:::::::;;;;;;<<<=>>O2337788801111112222222222222333333333333333333444444444455555555666666666777777777778888889999999:::::::::;;;;;<<=>BEF244678;258:<12223335689;;11122333345556666688899:;9<27735678:;2337778889:<0124344555566777888:;<<<=569;3;;55568345689::556778>A445667778899::;;;<<==>?@@F97767888<>##########################################################################$%%%%%%&&&&&&'&'''''(((((((((()))))***++$%&&&''''(*+,-$%&''((*,$$$%%%&&&&&&&'(('())))*+,-$$$%%&&&&'''''()))))))))**++++++,,,,-.../000$%&')*+%&&&&''''''()))+*+++%&''))))***++,,,,,,-//0039%%&&&&''''''''''''''''''''((((((((((((((((('(((((((())))))))))))())))))))))))))))()))))))))))))))))))))))))))))))))***************)***************+*********************)*)****+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,+,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,+,,,,,,,,,,,,----------------------------------------------------------------------------------...........-.........-..............-../........................./////.//////////////////////.///////.///00000000/0000000000000000/00/0001000101111111110111111111111111111111111111221222222222122221222222222333333333223333444434444444345554546657888898:;%&'''())))))*******+++*+,,,--...//0137%&')+,%''''())))*+++,-,-.0035%''''''(((()(*+,,--.%''(())*+,,-------.12%(((()))))*******+++++,,,-----------.../////012222334%&&&'((())))*+++.//11%'((((()+,/%%%&&''''((((())))))))))))))******************+++++++++++++++++++++,,,+,,,,,,,,,,,----------------------./....-..././/.0000000001111122222222222233334688::%&''(((())))))************+++++++++++,,,,,,+,,,,,------.......-./////0000010001111122212343466%&''''''''((((()*+++,-../..2%'(..%(((())))***+,,,--...011123467%''*+,.-.%&&&''''(()('))'++++++,,./8%''((((**+++-%&&'(((()****++,++,,,.-00%''''((())))****++++,,,,,,----..../////.0/111012136A%'''((())*+++../12%&&''''((()*+++++,,,,,-,035&((((((((((((((((((((((((((()))))))))))))))))))))))))********************************)************************************+++++++++++++++++++,+,++++++++++++++++++++++++++++++++*++++++++++*,,,,,,,,,,,,,,,,,,,,,,,,,,,,,+,,,,,,,,,,,,,,,,,+,,,,,,,,,,,,,,,,,----------,---------------------------------,----------------------------...........-.....................-............../........./......................///////////////////0...//////////////////////////////./////..////////0000000000000000/00/000//000000//00/00000000000000000/0000011011111111/111111111111111111111111102111111110222223222232222222222222222222212222222122222222222233232333323333333333332223333334444443343444444444444455555555545555555666666666466777677777787777888889898999989::;:;<<?&((((()))))))******************+++++++++,,------...../////0000011112339=&''(((((()))))))))))))))))))***)**********************************++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---,-----------,--------,,------------.............,............................................///////.////////////////////-//.///////0///////////0/000000000/0000000000//00000/000000/00001011111110111121111111111111011110111111111221222222222222111222221220122333333333333333333444443444445466656666677779:;<&'()*****,,-..///010213&'()*+,,&*+,--15668&((()))++-../01112&&'''''((((((())))))))******+++*+++,+++,,,,,,+,,----.....//.///000112123359:&((())))))))))))))))))***********************************++++++++++++++++++++++*++++++**+++++++*++,*+,,,,,,,,,,,,,,,,,,,,-,,,,,,,,,,,,,,,,,,,,,,,,,,,,----,---------,----,--------------,.---,----..........--........................,........./..............-..../////.///////////////././0/////.////////////////.////////000000/00000000/00/00/000000000.000001111111111011111111111011101111222121222222222220222222222233333333233333233334444433444444444334445645566677777778879999;:&&&&'())))*****+++++++++,,,---..././010133446679&(((()))))*********+++++++++++++++,,,,,-,,,,,------------------...........////////////0000000001111111111222122234466678&()))***+,,---,...///12&''(((()))++,,,/001&'')*)*+***+,,//0/0244&''(()******+++++++,,,,,----------....//./11222245568;&')&'((((())))))))))))*******))****************+++*+++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---,------------,-------------.....-...................................../////////////////////////0///////////////////0000000000000//00/000/0001121111111111101111111112112222222222221222222233333333323223233444443444545666677778679789999999:;:&%&))*)..2&(('))*,,,/1&&&'*+,-,,,-/&'''(((()))********++++++++++++,,,,,,,,,,,------,---..........././//////////0000000111101110112222222122333234445367&()))++0&'(,/&(((()))**************++++++,++++,,,,,,,------,--,............/../////0/000./0011/1001011112212222221233333356677789<%())**+++,&''()***+,,-1&'()))/0&'''(())))*****+++++++++,-,,,----....../////0000011132133449:&&()++,./0033556<&***,,--..../01129&)))*****+++++++++,,,,,,,,,------,-..../....../...///////00000121121222233446778'&('()(()***)***))))**)))*++*+*+)*+***+***********+*******+*+*++*****++++++,+++,+++++,++++,++,++,,,++,++++++++,+++++,,,+,,+++,-,,,,,,,,,-,,,--,,,,--,,--,,-,,,,,-,-,-,-,,,-,-,,,-----,,,,,,,.------.--..-----.-------.-------..-...--.-...---..//../../......./../..../.././..//.../.........////./...///....///0///0/////////00///0/0////0/0///////0/000///0/////.//1000100000/1000010/1000101100/010001/000101101121211211101112022/0121221211111212211212211222212123232212322223323221322322223222322222222323433333332333324333434243332343335545344343544454444445554565465556677768789::9::<<?'((()))))***++++,-....///0/0000111111222334549'''(***++++,,,----.//'&&'(((((((())))))))))))))))))))))****)*************+**************************************++++++++++++++++++*++++++++++++++++++++++,++*+++++++++,++*++++++++++,,,,,,,,--,,,,,,,,,,,-,,,,,,,,-,,,,,,,-,,,,,,,,---,,,,,,,,,,,,--,-------.----,--,,-----------------------,-------,---------......................................./......./............../............//...........././////0/////////.////////////////////-//0///0/////0///..///////////////00000000000/0//0000000/00000000/0000010/00/000100000010/01000000000000111111/01111101011111/1111112211111221111111011111212112122123222222222222112222222222222212222222212122220222223313333333133343333232233223433233344444454444544344444345555555555464545556666666666667777777688899989:9:99::::;;<'),/3''))*****++,,,,,,,-------.........-....././///.////////0/00001113212222233334444677'*+--/...//0358;'*--..//01124'(++++,,..//0/123445<'+++,,,,------...-.....//00/01133456656'',./'(())))))))*********++++++++++++*++++++++++++++++++++,+,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-----------------------........--........///////////////0///////////0000000000//0/0000000010111111111111122222112122222232332333332211333333334244443444544556565667777778:::;:<'())**+,-.--../////01138')++++,,,,----.-..../////0133347''((((((()))))))))))))))))))**************************************+++++++++++++++++++++++*++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,-,,,,,,,,,,,+,,,,,,,,,,,,,,,,,,+,,,,-,,,,,,,,,,,,,,,,,,-,,,,+,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------------------------------------,--,-----------,------------........................-..-....................-.-..-...................-..............///////////////////////////////////-//0/////////////////.////////////////////////////.//.///////////////////0/0000000000000000000000/0/000000000000./000/00000000000/000000/0/0000/000000000000000000000001111111/111001111111111111111111111111010111111110111111101111101010111111111111111112212221022222212222222222222222221121122212222222222222222222221221122322222222233333333133333333323333333333333333332334333333223323333333333333333333333334444434443444444344444443443424344344434433445455555554555555555555555554555566656665656656554666665646666777675777767767977888787887888999989889::::;;:<;<<<<=<??'))+*+++,,,.------..-....///////0000/00001111122222223343334445468'()*++++,+--//100012235'()*+++++,,,,,,---,........////////01101122222333334445668'+,,-..-.///00001122335:''()**+,1'),,,-4'**++,,---------....////////000000/1221233333444469='(()+'()))**+++,,,,,-------../////001'&(((((())((((*((()((())))))))))))*)))))))*))))))*******+*****)****)********+*********+********+***,*****+*************++++,+++++++++++++++++++++++++,++++++*+++++++++,*++++++++*+++++++++++-+*+,,,++++++++,,,,,,,,,,,,,,-,,,,,,,,-,,,,,-,,,,,,,,,,,,,,,,,,-*,,,,,,,,,,,,,,,,-,,,+-,,,,,,,,,,,,,,,--------------------------------------------------------,,--------------------------.........................................-................................./....../-/.........................//./////./////.///////.//////..//////////////////////////////.//////////////////////0///////.////////////////////////0000000000000/000/0/00000000000/00000/00000000000/00/000000000/00100/000200000000/0000000000000101111111101111111112111111111111111212011111111111101101121011110111111111011111212121011111111111222122222223222322212222221222222222112222222222242232222212222222222202222122233333333333432333333323333333233233333132323334223233344334443444444444444334443444446444534545554545535545555554555555666666666466456665666766666777677777777777777788878888878=8899:98999::::;;;;:<<=>=>>BC''())))))*************++++++++++++++++++++++++++++++,,,,,,,,,,,,,+,,,,,,,,,,,,,,,,,,,,,,,----------+--------------------------------......--....-......................-......//////////////////./////////////////////000000000000000//00010000/100000/000000000000/00/00000001011111111111111111101111111111111222222212212222221222222222333333243231333333333333333333333333333333344434434434444444444344555555555565566566675667767776757888989899:;;<<?AD''++,,,-/124')+-/',.1'+,-0124'+,,///00000112226'/'')))*****++++++++,,,,,,,,,-----....././/////////0/0000111111222233334566666778<>'&((()))))*))*******+********+,++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,------------,----../....//...-./.............../////.//..//0////////0//0000/0/001100/00021120111011222112222221232323333333444434355466677779999:(,-..(('(())))**********++++++++++++++++++++++,,,,,,,,-,-,,,,+,,,,,,,,,,,,,,,,---------------------------------..../.-...-............-.........//////////0/////-//0///////////////.//////00000000000000000000000000/00/0000111110111211211/0110101111222223222122221122212343313324333423333233334544444344443444565575565554466666665575777778898989:;(+--.0369;'***+++++++,+,,,--...../////0000011122212333344457(+,..00(,-..///1(()**,,/(((((()****+*+++++++++,,,,,,,,,,,,,,-------------.-.......//////.////0000001112233344566779(+-//11(*****++++++++++,,,,,,,,,,,,,,-----.----,---------------............./////////////////////000000000000000000/0000000011111111000110111112222212221211121223333333333333333233334434444442444455555555545555556666657788888998::;;=?A(+,,,//())****+,,,,.---,..../////00022222333424455567789(+--.//0111123457(**+,,,,,,---------.......//./00011112333444557(*++++++,,,,,,,,,,,,,,,,,,,,,,,,-----------------------..-,----..................-..////////////////00000000000000000000000000001101111110101111111111011122222122222233333233323333234344444444443244444445555555555666556666676788789;;;<;=(,-//0<(*++,,,,..//04457(***+++++++++++,,,,,,,,,,,,,,+,,,,,,,,,,,,---------.------,--------------------..........................///./////////////.//////////00000000.000000000000000000000000000011111010111111111110111111111222222112222121221222222212232223332333333233333333334443444444434444444444454455554555555555666565656556667677767788888888999;;('()***)**+++++++++,+,,,,,,,,,-,,,,,,-,.,---.-.----.--.........///////00//////00000/0000000000001121111111224332334344555889::',,-./(*****+++++++,,,,,,,,,,,,,--------------------,,---..............///////.////////000000000000000000000001111111111111121222222222221223333341333333333344444444444555565666665677799;;()**++++,,,,,,,,--,--------.......////.///000000000010111122222223333333334344445557889(**++,,,,,,,,-------...//////000.1111134445779)++,,,,,,,,----,--------------....................-...................////////.//////////////////////0000000/000000/000000/0/0000000000011111111111111111111111111111111111111111111222222222221222222202222222232222222222333333333333333333332333333333433443434445444444444443444444434444444555555555555554555665555556665666646666666776676777777788888789999999:999:::::9:;;<;<<==AC)+++,,,,,,,,,,,,---------------..-........./////.//////////000000001111111111012222222222222333332333333444444435555556666677797=99<=))**++++,,,,,,,,,,----------------,-------------..//.................................///////////////////////////////////////////00000//00/000000000000/0000000/000001111111101111111111111111111111111111111111111111111111111222222222222122222222222222222222222132222222222223332232333233333323333333333333334334344444444443434444444444444444444555555555555555555565545555666656665666666566777677777688888788888899::::;<<<<>>@&()))))))))))*******************++++++++++++++++++,,,,,,,,,,,,,,,---------.........................///////////.///////////00000000000011111112222333336)+,----.///113444555667899:)('+*++,+,--------.///000000001110112222333244454556669;;)+*,,,-,---.-,--....-.///00000000122222335556666788),,-------............/////////0011111111222222223333443445555546677)')-+-,.,-/),,,,,)+,-----.....-/001112233344556899)*++,-----------...........///////00001111111/111222222223234434445556777699)'--+00011)())))+*****************+++++++++++++++++++++++++++++++++,,,,,,,,,,,,,+,,,,/,,,,,,,,,,,,,,,,,,,,,,,.-----------------/----------,----------/...........--.......-...............///////////////////////1//////////000000/000000000000000/00/00000000000111101101111111131222212232212222222243333333333333332324344244444444443344645555545667567777898<<:)++/144)*--///23)-/////13)++,-,.//0103347)+++-./11122356)/01)+,,,,-------------..........////0000000/001111222222232323444455566665766789:;)*+4)-./6;)&'(((((((()))))*))))))))))),)))*****)**********)******************-********************+++++++++++++++++*+*++++++++++++++++++++++++++++++++++++,++++,++++/+++,,,,+,,-,,,,,-,,,,,,,,,,,,,,,,,,,,,,,/,,*,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------,------------------,-------,,-------------------------------0--.....-............/.....................-........-.........................................................////////////.//.//////////////////////////////./////////////////////////////////////////.////////2//////00000000000000000/00000000/000000000000000000/0000/000/.00000000000000000/0003000000000000001011/111111121110110112111/1111111111111111111101111111111111112010101111111111112222222222222222212222221322222222222222222222232122222233232333333233333333331333333333132333333332333333333333334443444444444344444444434444444444448554555555555455555555554565545555655666666666666666666676666666667777777776776677767777877779878878998999999;;:=:;:;;=@>)++,----....../0/001023333445=)*++++++,,,,,,,,,,,,,,,,,--------------------------------,------.-..........-........................//////0//////////////////////////////0000000000000000000000000000///000011111111111011111111111111111211101111111111110111112022222221222222222222222221222122222222222212222222221333233332333333333323333332333333333333444343444434344444444444444433444444444434565555555445555554555555555565555566666655666456565566666646777677677777886888878999989899::::::9;;;:;;<=>>>),,--.////7;),,--....///0022223333;)(*+++++++,-,-+,,,,,-,,-,,,-,,-,-,-,,.--..-----------------.-.---.-------..--../..............//.././..0////0////0///0/00/0/00/////100001000000011100010101000/0001111111111111211111110121122122222313122332332222333344443334334244444444443434344555455565555666667767777888999:99;;:;:<))),-//0566:<*,--.....././///0011111222233323444445555666567778899;')*+++,,,-.//0122*,,....-//0//0000000001111222223445567768989:<**,,,,,,,------------------....................-....//////////00//////////////.//////////////////000000000000000000000000000000000000000000111111111001111111111011111111111111222222222222222222222222222222022222222222222333333323333323333333333333323333323333344444334443344443444444444444445555444555555455555544555565654656865666667666666666666666777776777677767777777787887888887999889999::9:::::::;;;:;;<<;=<>=>@%'''''(((((((((((()))))))))))))))******************+++++++++++++++++++++++,,,,,,,,,,,,,--------------------..................../////////000001111112226*-...012444559:*--.00222457<>?*+-......///.0000011112233443445566*---..//////00000001112233324445456;>*,,,----..........///0///.///////////000000000000011111111112222222222222222222223333333344444444555555546666666767888889999::;;')))**+++++++++++++,,,,,,,,,,,,-----------....///////////00111123333448*...00013234*),,,,---........///////////0000000001111112222222222333455666788:=*,----......-.....///////////0////////////./0000000000000000000000/000000111111111111111111122222222222222222222222222222202233333332332233333332333443444444444454555555555555555455656666666666666666666666576777757688888898999999::9::;;;:<<<;<==?>=*-.../00011222222233555666678;>*+,,--------............../////////0////////////////00000000000000011111111122222222222222222222222333333333333333344444444455555456666666667777788788999::='()***+++++,,,,,,,,,,,--------...////////000000111233*//000111233333345678*-026*&'(((((())))))))))))**********************++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,-----------------------------...................././///////////////./////////00/000000000001101111111112022222222233332343324445556899*''(-(((((((())))))))))))).)**********)****++++++++++++++++0+++++0+++,,+,,,,,,,,,,,,,,,---------+----2--.3..-..-...........////////////00/0000000000011511111111112222223344444565667788*,,-------............////////0000000000011111111111111222222222222233233333333433333444444455545555666667777777888:;;;;=;===*+.//7*,./5++,,--------------........................../////////////////////.//////////////////////////100000000000000000000000/00000000000000000000000000000000000000000/00000111111111111111111111111110111111111111111111111111111111111122222222222222212222222221122222222222222222222221222221222212222222233333333333333333333333333322333333133333333333333333333333333233332333333333333434434444444444444444444444434444434444444444434444344444434444444555555555555555554554555455555555455553555555555445554566666566565656566666666666666666566666666666666666678577777778777777666777676777777777777777777777777777778787868888888786887788889999999889999999989:9::::9:8:::::::::9;;;;;<;<<<<<=<<====>>>>????@?())*****+++++++++++,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------.........................................//////////////////////////////0000000000000000000000000000101111111111111111112222222222222222333333333334444444444455555567799+*-./268'+,,---...../////////////00000000011111111112211212222333333333334334444444444344555555555666666777888789&'()))))********++,,,,,,,,,----........../////000013+%''((((())))))))))))))))))*******************++++++++++++,,,,-,,,,,,,,,,,,,,,-----------------.-....................//////.//0000/00011112111213333333456+34+-----..////////00/1000111233454545555556568;;?+..././/////00000000000111222212222333333333333343444444445555656566667777867788888899988:;;;;:;;<=>>>>@J++//001112335+/26,+1238:,.///////000000/0111111111111122222222222233332334444444455555555554555566566666677886899989:;;:<@,/11222344455555666566689:;'*,/001,/2346,0011354667779,...////000000000001111111222222222332222222333332333333333335544444444444555555555556666666567777788888999:9::;<<>=)++,,,,---------....///////00000001222222333355678:,//001111122334455565656677778888889=>'*,,,/0011233,8>&,+.---../////0/0//0/000001020000001111111211212113222222222333233333334333344445444443444455554545545665656777777777799878788:;<<>>A&(())*******++++++,,,,,,,,------..../////000001122<,.4,0111333444556578:>-//0000000111101111111111111222222212222222222222222233333333333333333334444444444444444555555555555555566666666656666666665666776777767777678888888778888789879:999999999::::9::;;;====>=>>?>@A&()))****++++++++++++,,,,,,,,,------......./////000011124677,./////00011211122222332445555666656677789889::<-.1259:-/0011111111223222222233333334444444555535666666677777788899999:::;;<>-123578<;>->@-345567889,/0000011112334444446676787:::.00001111221222222222222222222223333333333334333333333333323333444444444434444444444444444455555455555555554554555554555556665666666666666666666666666666666777767757777777777777777677777777776778888788888788888888878899998999999997898999999:99:::;9::::::::::9:;;;;;;;;;;<;:;<<;;;<==<=<>>?AD+-./////0000000000000111111111111111222222222222233333333333333344444444444444445555555666666666777788889./00000,0000111111222222222222222222232222333332333333343333333333333333444434444444444444444444444445555555555553555555555565555646666666666666666666666666666666666666666667677777777677777777776777788888888888888878887788888888888888899998999999998999:::::::89:;9::::::::9:::;;::;;;;;;;;;;;;;;<;<<;<<;==>>>????@AA(**+++,,,,,-------------........./////////00000000000011111111222222223333444455555599.236778;;3.0002233334445555566666667777889:;<?AD.*1222233344556678@.23.112467:/.2233344;/249/.2333332444445556677777778888899:::<=>?/3460+4555668::;<=/07/11120055698889<;<0+44455555555667789999::::?13344569::;;<>G14568:)2234566677787777747888888999:::::;;;;;;<;<<??F+-./0000112244356678999CDS(..49?*489<==23-4,/38>0'(53%&'(()+6420.805/-4++**.4/",
surRLE:"%%%&&&&''''''((((((((((()))))))))********)**+++++++++,,,,,,,-----.....//////001111122343333343457%%'(()**++++,,,--).//112569&&''(()-03%%%%%&&&&'''''(((((((((((((()))))))))))))***++,++,,------....//102:$$$$$$%%$&&&'''''''''(((((()))))****+++++,,,,,,----.......001111467$%%%%&''')***+./23%%%'))))))***+++++,,,,,----../00012'()))))****+++++++,,,--------..........///////////00000000000110222222222233333333333333455568;?@%&&&'''((((((((((())))))))))))))))))))))))))))))))))*********************************************++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------------------------------------------..........................................+.............-............./////////////////////////////////////////////////////////////.0000000000000000000000000000000000000000000000000000000000100000001111111111111111111111111111111111111111111111171111111111111111111111110122222222222222222222222221232222222222222222222223333333333333333333333333333333344444444444444444444444444455555555555555555555555566666666666666666677777777778888888788888999999::::::;<==@@'(())))******+++++++++,,,,-------.......//////0001111111112223222233333334444444545556676778899::;;;=&'''())))*****+,,,----.//000011113457&''''((&))******++,,,,,,,---..//////////0000000111133355666c&''''(((((((((()))))******+++++,,---...///0011212335579''(((()))))))****+++,,,,,-------.//////00111133455577789:&'((())))))*********+*++++++,,,,,,,,,,,,,,,,-------------............/////////00000000001111112222222231334444444555556689=%%''''''''(((()))))))**********+++++++++,,,------......./////0000111223333478%&'''((((())))))))*****+++,,,,--..../112234678;%&''''''''(((((((()())))())))))))))))))))))*************************+++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------------------.........................-........//////////////////////////////////////00000000000000000000000000000111111111111111111111111111111211111222222222222222222223333333333333333334444444444444445555556667877778888:;==&'''((()))))))))***************+++++++++++++,,,,,,,,,,,,,----------------..........//////////////00000000000001111111111111111222222333444444455556678::<E'(((()))****++++++,,,,,,----------.......///0000011111123333444777%'(*****+,,,,,,,-----//0111456%')))))*****++++,,,,,,,,,,,,,-----..//////000111222222335566779=A'))***+,,-1799''(('(()))))))))))))))*******+++++++++++-------......////0000000001112222244445555568<=&()))))*****+++++++++++,,,,,,,,,,-----.-....../////011222>D''''())))))*,,,,,-///000145555='((((((())))))))))))**********+++++++++++++,,,,,,,,,,,,,,,,-----------------.......0.......//////////00000000111111111111111111112222222222222333334555555577889:::;@CD&&&&''((((())))))))***+++++++,,,,,,,,,----..///////00000001111223644466'''''''(((((((())))))))********++++++,,,,,,,,,,,-----------................//////////000000000000111111112222333333444566889:;;''''''(((((((((((())))))))))))))))))))))))))))))))*************************************************************++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------------------------------------------.-----------------------------------------------------------------................................................................................................................................................///////////////////////////////////////////0///////////////////////////////////////////////////////////////////////////////////00000////0000000000000000000000000000000000000000000000000222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222222222221222222222222222222222222222222233333333333333333333333333333333333333333333333333333333333333333333333333333233333333333333333233333333333333333333334444444444444444444444444444444444444444444444444444444444444444444444444444444444555555555555555555555555555555555555555555555555555555555555555555555555555555555666666666666666656666666666666666666666666666666677777777777777777777777777777777888888888888888888888888888888888888889999999999998999999999999:::::::::;;;;;;;;;;;;;<<<<<<<<<==========>>???>B'''(((()))))))))))))********************++++++++++,,,,,,,,,,,,,,----------------............////./////////0000000000011111111111112223222233344444566777888='''((((((((())))))))))))))))********************************************+++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------------------------------------------..............................................................//////////////////////////////////////////////////////////////////////////000000000000000000000000000000000000000000000000000000000000000111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333333333444444444444444444444444444444444444444555555555555555565555555555555556666666666666666666666777777777778888887889888888899999999:::::;;;;;;;=@AGJ()**+,,,-------....//0/00001011112233344445555556677999&(())***-..0))**++++-....../00001111223334555567:A((()))***+++,,-----------........./////////0/000001111111112223333444556688=6B'''((((((('))))))))******************++++++++++++++++++++++,,,,,,,,,,,,,,,,-----------------------...................////////////////////000000000000000001111111111122222222222222233333333344444444566678899:::;;>'((((((())))))))))))))*****************************+++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------------------..............................................................////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000002121111111111/11111111111111211111111111111111111111111112222222222222222222222222222222222222222222222222222222222222223223333333333333333333333333333333333333333333333333333444444444444444444444444444444444444455555555555555555556666666666666666677777777778888886889999999999:::;;;;;;<<<>>>>D&'((((()))********+++++++++++++,,,,,,,,,,,,,------......../////////////00000000000000111111222222233333333333455566667777779>'((())))))))))))))***********+++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,----------------------------------...........................//////////////////////////////////00000000000000000000000000001111111111111111111111111111111111112222222222222222222222222222222333333333333333333344444444444445555555555555566666666666777778888888899999999:;>;;<?<<<===>>@G')++++++++,,,,,,-.....//////000011111122222223334445678&''(())))********+++++,,,,,,,,,,---------.................//////////0000001111111122222222223333444555556668C&&'((((((())))***********++++++++,,,,,,-----------......//////////000000001111122222233333448899<<&((((()))))))))))(*********++++++++++++++,,,,,,,,,,,,,,,,,,,,,,------------------------..........................////////////////////////0000000000000000000000001111111111112222222222222223333333334455666667777888999;<<&())))))*****+++,,,,,,,------..///////002222589'''(((((((((((((()))))))))))))))))))))************************************************++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------------------------------.........................................................................................////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222233333333333343333333333333333334444444444444444444444444444444444444455555555555555555555556666666656666666666666777777777777748888888888899999999999::;;;;;;;;;<<<>>?>>C&'&)))))***++++++,,,,,--.../123334566799;>@'''''(((())***+,--.//0022223456888'(()++,,,----...../////02234357((())))))))))))))))**********************+++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,----------------------------..............................///////////////////////////////000000000000000000000111111111111111111112222222222222222222222222233333333333333333344444444445555666666666667778889999:;;;;>>(***++++,,,,,----.///0001111233335678:'''(((()****++++,,-,----.../011112222459))))))))))))***************+++++++++++++++++++++,,,,,,,,,,,,,,,,,,--------------------------......................................../////////////////////////////////0//0000000000000000000000111111111111111111111111222222222222222222222333333333333333444444444444444455555555555556666666666666777777777888899999:::::;=>>?'(((*)**+,,,,,,--.../&'(()))*,******+,+++++,,,,,,,,,,,-------......////////000011111121333344469>>@&''))*****++,,,,,--./00223458&&'''''''''((((((((())))))))))))***************++++++++++++++,,,,,,,,,,,,,,,,----------..................//////////00000000111111111111222222233333334444445555556666666777777788889;<?C))))*+++,,,,---....///0001111122333455556666779:=((())))**+++++,-----..........//////00000112222233334587999<''(())))**************++++++++++,,,,,,,,,,,,,,-----------------------..............................///////////////////00000000000000000000000000000111111111111111111111111011222222222222222333333333333333444444455555555566666777777889:<>&'((((((()))))))))))))))))))))))******************************************************+++++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------------------------------------------------------......................................................................................................../////////////////////////////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000000000000000000000000000000000000000000111111111111111111111111111111111111111111111111111111111111111111111111111111111222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222233333333333333333333333333333333333333333333333333333333333344444444444444444444444444444444444444444444455555555555555555555555555555555555555555556666666666666666666666666666666666666777777777777888888888888889999999999::::::::::::;;;;;;;;==>>>??AB(())))********++++++++++++,,,,,,,,,,,,,,,,,--------.........////////////00000000000000111111211111111122222222222222222222233333333333344444556666777888(())))*****+++++++,,,,,,,,,,,,,,,--------..../////0011112223458::'''((((())))))))))))))))))))))*************************************************++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,----------------------------------------------------------------------------------........................................................................................................//////////////////////////////////////////////////////////////////////////////////////0///////////////////////////////000000000000000000000000000000000000000000000000000000000000000000000000000000000000111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333333333333333323333344444444444444444444444444444444444444444445555555555555555555555555555555555555555555556666666666666666666666666666666666666666667777777777777777777778777777777888888888888888888888899999999999999999999::::::::;;;;;;;;;;;;;;<<<<>>>?C)*+++++++,,,---------....///////0000011122233333444447********++++++++++++++++++++++,,,,,,,,,,,,,,,,,,------------------------------.................................//.//////////////////////////.///////000000000000000000000000000000000000/0011111111111111111111111111111111022222222222222222222222333333333333333333333333333333334444445444444444445555555555566666666777777777778888899::::::<<>>?@)*+++,,,,----......///00022222222334556788:'*+++,,----...../////0100011122244567')*+++++,,---...//////////.//00000000111112222233333334444455555666779)**+++,,,,,,,,,-------------.........////////////000000111111222333333455555567899:;<=)**,---//00023((())))))*)********************+++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------................................................//////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000001111111111111110111111111111111111111111122222222222222322222222222222222222333333333333333333333333333333333333333332344444444444444444444455555555555555555555666666666666677777777788888999999999:;;;;;<<>?G**++++,,,,,,----------....///0000011122222333344555556677;?F()*****+,,,,,,,,----....../////////////000000000111112222222233433333344444455555779:;''((()))))))))*******************++++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------------------------------------------------..................................................................////////////////////////////////////////////////////////////////////////////////////////////////////////////////000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111222222222222222222222222222222222222222222222222222222222222232222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333444444444444444444444444444444444444444444444444443444444444444444444444444444444555555555555555555555555655555555555555555555555555555555555555555555555555555566666666666666666666666666666666666666666666666666667777777777777677777777777777777777777777777888888888888888888898888888888888888888888999999999999999999999999999999::::::::::::::::::::;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<=========>>>>???@AABCCE)********++++++++++++++,,,,,,,,,,,,,,,,-------------------............../////////////////////000000000000000000000111111111111111111111122222222222222223333333344444444555566666777889889999:;<<='(())**+***+++++++++++++++++++++,,,+-------------......//////////////000020000111122222222333334444455555566899::;;''()))))))**********++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,-------------------.................///////////////////////////000000000000000000011111111122222222222222223333333333344444445555555566777889:::+++,,,---..............///////000000000000001111111122222333333333333333334444555555556666667788::::;;;<>>')*++++,-....011133469**++++---..0111123346779>')))))********+++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------.......................////////////////////////////////0000000000000000000000000000011111111111111111111111111111122222222222222222222233333333333333333344444444444444445555555555555555566666677777888889999:::==?++,,,,....013455))**+++,,,,,-/.//00012244588&'''((((((((((())))))))))))))************************************++++++++++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-----------------------------------------------------------------------------------------...................................................................................................-.................................//////////////.//////////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111112111111111111111111111111111111111111211111111111111111111111111111111111111111222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222322222222222222222222224222233333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444444444444444454455555555555555555555555555555555555555555555555555555555555565556555555555555555556666666666666666666666666666666666666666666666666666677777777777777777777777777777777777777888888888888888888888888888888888888888899999999999999999999::::::::::::::::::::::;;;;;;;;;<<<<<<<=======>>>>>??@ADF())))))))))****************+++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------------------------.............................................................////////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000000000000000000000000.000000000000000000011111111111111111111111111111111111111111112111111111111111111111111111102222222222222222222222222322222222222222222222221222222222222222222222222222233333333333333333333333333333333333333333333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444455555555555555555555555555555555555555555555556666666666666666666666666666666667777777777777777777777777777777777777777777777888888879888888888888888899:99999999999:::::::::::::::;;;;;<<<;<<<<==>>>>?@?AD''(****+++++++,,,,,,,,,,,,,,,----....////////00000011111222222233334444444565455666777778:::;<<**++,--.//0113(+,,--./002223'(()*+++,,,,-----.........////////000111122233333344446679:>??(***+++++,,,,,,,,,------......./////////////////000000000011111122222222222333333344444555578*+,--..////0125()))****++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,----------....................//////////////////////////////000000000000000000000000000011111111111111111111110111111111122222222222222222222222333333333333334444444444556666666777778888899999:::;;<<<?'(((((())))))))))))))********************************+++++++++++++++++++++++++++++++*,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,----------,-------------------------------........................./////////////////////////0///////////////////////00000000000000000000000000000000000000000000111111111111111111111111111111111111111111222222222222222222222222222222222222222223333333333333333333333333344444444444444555555555555555556666666677778888889999::::;;;;<>(,/1')))************++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------------------.....................................////////////////////////////////////////////////////0000000000000000000000000000000000000000000000000000000000011111111111111111111111111111111111111111122222222222222222222222222222222222222222222323333333333333333333333333333333333333333344444444444444444444444444444444555555555555555555555555555555666666666665666666666777777777778888888888899999:::::::;;=<<<<<=?+,,,,,-----.....///////0000002111112332222223455588899::;==A**++++,,,,,,,-----------..............///////////////0000000000001111111111101111112222222222223333333334444444404555555556677778888888999::::::;<>@(++++++,,,,-/01223345589?()+++,,,,,,,-......//////00000011123444566666899)*++-./122569<:())********++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-------------------------......................//////////////////////00000000000000000000000000111111111111222222222222222223333333333444444444444444444555556666666676777777888888999:::;<=====>>?ACDG(()+-,///002333359)*********++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------............................../////////////////////////////////////////////0000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222233333333333333333333333333333333333333444444444444444444444444444344444444444444444444444444455555555555555555555555555566666666666666666666666666677777777777777778888888888899999::::::::;;;;<<<===>?@**,,---...////0001223373))***++++++,,,,,,,,,,,,,,,,-------------......./////////////000000000000000111111111111222222233333444444455556666666667777888999::;;;;<@**++++++,,,,,,,----------........////////0///0000000000000111111111111122222223333333333344455555555566667777788999;;<=@D**+++++,,,,,,,,----------------.............-///////////0000000000001111222222222222333333333333333333444444444444444444455565555566666677777777777899999::;;;;:<<=AD))************+++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-----------------------------------------................................................///////////////////////////////////////////////////////////0///0000000000000000000000000000000000/000000000000000000000011111111111111111111111111111111111111111111111111111111112222222222222222222222222222222222222222222222222222222233333333333333333332333333333333333333333333333333333344444444444444444444444444444444444444444444345555555555555555555555555555555555555556666666666666666666666666667777777777777777777888888888888899999999899999:::::::;;;;<=====>>?@)+,,------...////////00001111111111112222222233335444455566666668777:::FG**+,,,,,,,---------.....................//////////00000000000000000011111111222222222333334444444555556666:99::))******++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,---------------------------------------------.......................................................////////////////////////////////0000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111112222222222222222222222222222222333333333333333333333333333333333333444444444444444444444444444444444444444555555555555555555566666666666666666777777777777777777777778888888888899999999999999:::::::::;;;;;<====>>>??@E'())))))********++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-----------------------------.............................//////////////////////////////000000000000000000000000000000011111111111111111112222222222222222222222333333333333333333333444444444444444555555556666667777788888999999::::;;<<<==(+-.////01222448;()))****+++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------..........................///////////////////.///////00000000000000000000000000000000000000000000000011111111111111111111111111111111111111111111111111112222222222222222222222222222222222222222222333333333333333333333333333333333333333333333344444444444444444444444444444444444444444455555555555555555555556555555555566666666666667666667777777777777777777777778888889999:::::::::;;;;<<<<===@@CF(****+++++++++++++,,,,,,,,,,,,,,,,,,,-------------------------....................../////////////////////////////////////0000000000000000000000000000011111111111111111111111122222222222222222222222222223333333333333333433333333333333344444444444444444444555555555466666677677877777888888888888889::;;<;;;<=@**++,,,,,,,-----------------.............////////////000000000000001111111111111222222223343344444444645555555556667777778899<:;<<)*++++,,,,,,,,,,,,,,,,,,-----------------------------............................../////////////////////.////////////////00000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333444444444444444444444444444444444444444444444444444444444444444444444444444454444555555555555555555555555555555555555555555555555555555555555555555555555455555555555555555566666666666666666666666666666666666666666666666666666666666777777777777777777777777777777777777777778888888888888888888888888888888888888888888888889999999999999999999999999999999::::::::::::::::::::;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<========>>>>>>>?@@????@@@AABC**++++,,,,,,,,--------------....................../..///////////////////////.0000000000000000000000000000000000000011111111111111111111111111111111111111111222222222222222222222222222222222223333333333333333333333333334444444444444444444444445555555555555555555555555555555666666666666666666666666677777777888888888898899999999:::::;;;;;<<<<<=====>>ABD+++++++,,,,,,,,,,,,,------------------------------------------...................................////////////////////////////////////////////0000000000000000000000000000000000000000000000000000111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222232222222222222222222222222233333333333333333333333333333333333333333333333333333333333333334333333444444444444444444444444444444444444444444444444444555555555555555555555555555555555555555555555555555555555666666666666666666666666666666666666666777777778677877877777777777777788888889888888888888888889999999999999999999:::::::::;;;;;;;;<;<<==>>>>>??@AB+,---..../////000012223344),,,---....../////0000111111111222222233333334444445555666677889:::;;=>B((*(*)(******++++++++++,,,,,,,,,,,,,----------------------------.........-......../////////000000000000/00000000000111111111111111111222222222222223333333333333333333334444444444444555555555556666666666677777788:;;;;;;;;=>???)))+++,,,,,,--------------.........-........../////////////0000000000000000011111111111222222222222233333333444444444444445555555555555555666666677777788888899::;<=>AA+*,,,,,,,,,,,,,,-------------------............../////////////////////000000000000010111111111111111112222222222222222222222223333333333323333333444444444455555555555555566356677778988778999;**+++,,,,------.0142233445::=++)+-.//0122222334449;)+++,,,-.../////0001111111111122222222233333333444444445555655555666688;;<*++++++++,,,,,--------------------................///0/////////////////00000000000000000001111111111111110111111111122222222222222222222222222333333333332333333334444444444444445555555555555555555566666666666777777788888999::;<=)+,...///00111222344467)))))))))))***********+++++++++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------------------------------..................................................////////////////////////////////////////////////////////////////////////////////////0000000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111111111001112222222222222222222222222222222222222222222333333333333333333333333333333333333333333333333333333333334444443444444444544444444344444444444444444444443455555555555555555555555555666666666666666666666666666777777777777777777788888889999999:::::::::::;;;;;<<===>?*),----..////3112124455889@B)***+,,,-----------....////01112222223334444566666777788;=))+,,,--....//0111222133333455)))*++,,+,,,--------..,.....//////00000000111111111122222222223333323334444444445555555566667767777778889::;<<<=>>AMS*,---------....////////001111111122222233334445556789::=2257:9;<>*++++++,,,,,,,------------..............////0/////////00000000000001111111111111111111222222222222222222222223333333333323333334444444444455555555555555555555555666666666777778888888999999::<<=>=A,../0247,....../00011111122222233333777<((()))))))))))******************++++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-------------------------------------------------------------------------.........................................................../..................................../...................///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222322222222222222222222222222222222222222222222222222222222222222222222222A3333333333333333333333333333333333333333333333333333333333333333353333333333333333333333333333333333333333333333333333334333333333333333333333333333333333333333333444444444444444444444444444444444444444444444444444444444444444444443444444444444444444444444444444444444444444444444444444444444555555555555555555555555555555555555555555665555555655545555555555555555555555455555555555555555555555555555555555555566666666666666666666666666666666666666666666666666666666666666666666666666666666666666666667777777777777777777777777777777777777777777777777777777777777777777777777777777776878888888888888888888888888888888888888888888888888888888888888899999999999999999999999999999999999999999::::::::::::::::::::::::::::::::;;;;;;;;;;;;;;;;;;;;;;;;<<<<<<<?<<<<============<>>>>>>>>????H@@ABNDA+,,,----............../////////000000011111111111111222222222222233333333333333333333344444444445555555655666666777776888888899::=**+++++++++,,,,,,,,,,,,,,,,,,,-----------------------------------.................................................////////////////////////////0//0/////////////////////////00000000000000000000001000000000000000000000000000000000000111111111111111111111111111011111111111111111211111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333323333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444444444444454444444444444444444555555555555555555555555555555555555555555555555555555555555555555555555556666666666666666666666666666666666666666666666666666666666677777777777777777777777777777777777777778888888888888888888888888888888888888888888899999999999999999999999999999999999999::::::::::::::::;:::::::;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<=======>>>>>>=>>>>>>???????@@@@AAAAAABBCCC+++,-----...//00000111111222212333334445555556677899:A++++,,,,,----.///////000000121122344455689(*****++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,-.-------------------------------..................................////////////////////////////////////0000000000000000000000010000000000000000000111111111111111111111111111111111111111112222222222222222222222222222222222222333333333332333343333333333333333333344444444444444444444444444444444444444444444444555555555555555555555555555566666666667666666666666666777777777778777888888888888899999::::;;;;<<<<<===>@@BDDHH***+,,,---...//0011111111222333455678<++,-----..............////////////00000000000000000001111111111111111222222222222222222222233333333333333333333334444444444455555555556666667777778888999999;;;;<<<<<<=>?EHO*+,,,----......................////////////////0000000111111111111222222222222222222222223333333333333333444444434444444444445555555555566666666667777888899999::;;<=??@@**+++,-------------..............................................///////////////////////////////////////00000000000000000000000000000000000000000000000001111111111111111111111111111111111111111011111111122222222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333333333333333333344444444444444444444444444444444444444444444444444444444445555555555555555555555555555555555555555555566666666666666666666666666666666666666666777777777777777777777777777888888888888888988888888889999999999999999999999999999:::::::::::::;;;;;;;;;;;;<<<<<<<<=====>>>>??????@J**---....//0001122222233333344445666666667788<>B,---../////00001111222222222233333444444455555466666666777777889999:::;<<>>@+**,----.......//////////0000000000000011111111111222222222222222233333333334444444445555555666667777788889999:::9;;<<<>@G+,--........//////////////////00000000000011111111111111122222222222223333333333323334444444444445555565555566667666667777777889::;>,,,,,,---------......................//////////////////////////00000000000000000000000000000000001111111111111111111111222222222222222222222233333333333333333333433333344444444444444444455555555555555555555555555555566666666666666666666666666777777777777777788888888888999999999999::9::::::::;;;;<<===+,.///2+,,..///0001111222223333334444556666688899::::*+,,,,,,,--------------.........................//////////////////////////000000000000000000000000000000011111111111111111111111111111112222222222222221232222222233333333333333333333333333333333344444444444444444444455555555555555555555555566666666666666666666666777777777777888888889999999::::::;;<<<<<>?*++,,,,,,,-----------------................................///////////////////////////////////00000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111122222222222222222222222222222222222222223323333333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444445455555555555555555555555555555555555555555555555555555555555555555555566666666666666665666666666666666666666666666666666666667777777777777777777777777777777777777777788888888888888888888888999999999999999999999::::::::::::::;;;;;;;;;;<<<<<<<<<<<<<======>>>????@@@AABH***,-----.................///////////////000000000000000011111111111122222222222222333343333333444444444445555556666666666666677777788888999::<<=,,,,,,,------------...........................//////////////////////////000000000000000000000000001111111111111111111111111111112222222222222222222222222222222222222223333333333333333333333333333333333444444444444444444444444444444444555555555555555555555555556666666666666677777777777777777777778888888889999999999999:::::::::::;;;;;;;;;;<<====>?>?=>??@ABI++,-37*+--...//00001111222233333333444444445555566666777899;@A**00023689(((()))))))))))))))))********************************+++++++++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,--------------------------------------.................................../..............///.////////////////////////////////////////////////////////////000000000000000000000000000000000000000001111111111111111111111111111111111111111111111222222222222222222222222222222232222222222222222233333333333333333333333333333333334444444444444444444444444455555555555555555555556666676666677777777777777778888888999999:::::;;<=%''((((((((((()))))))))))))))))))))))))))))****************************++++++++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------......../........................../////////////////////////00000000000000000000000000000000111111111111110111111111111111111111112222222222222222222222333333333333333333344444444444444444445555555555556666666777788889::::::=----......................./////////////////////////000000000000000000011111111111111111111122222222222222222222222222222333333333333333333333333333344444444444444444444444444445555555555555555555555555555666666666666666666666666677777777777777778888888899999999::::::::;;;;;<<==>>>???BB-..1112223344457889.--.////00122233445555788<A-----........///////////////////////////0000000000000000000000000000011111111111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333333333333333333333333333333333333333444444444444444444444444444444444444444444444444444444444444444444444444444444444444444455555555555555555555555555555555555555555555555555555555555555555555555566666666666666666666666666666666666666666666666666666666666666777777778777777777777777777777777777777777777777777777777777777777777777888888888888888888888888888888888888888888888888888888888888899999999999999999999999999999999999999:::::::::::::::::::::::::::::::::::::;;;;;;;;;;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<<=====================>>>>>>>>>>>????????<@@@@@AAABCFI++,,,----//00002123434455**,............////////////000000000000001111111222222222222333333333334444444555555556666667777788899999::;;=?@++,------.......////////////////////////////00000000000000000000000000111111111111111111111111112222222222222222222222222222222223333333333333333333333333333344444444444444444444444444455555555555555555555555555556666666666666666777777777777777777777778888888888888888898889999999:::::::;;;;;;;;;<<<<<<<;=<==>@CC)))**,,///002247%''''''(((())))))))))))))))***********************+++++++++++++++++++++++,,,,,,,,,,,,,,,,,,,,,,,,,,,,------------------------------------------..................................//////////////////////////////////////////////0000000000000000000000000000111111111111111111111111111111112222222222222222222223333333333333344444444455555555555566667777778899::==>>012222333455779---..........//////////////00000000000000000011111111111111111111111112222222222222222222223333333333333333333333333333333444444444444444444444444555555555555566666666666666667777777777777777777888888888888999999999:::::::::::;;;;;<<<===??CG,--.........////////////////0000000000000000111111111111111111111222222222222222222222222222333333333333333333333333333333333334444444445444444444444444444444444555555555555555555555554555555555555666666666666666666666666666666666677777777777777777777777777777778888888888888888888889999999999999999999:::::::::;;;;;;;;<<<<<<<<<<=========??@@@@@BCCIKS.//000013345678;<---....////////0012222357777=///0000000111111111111222222223333333333444444455555566677777788888888899:::::;;<==>>>??..////00000000000000000000000111111111111111111111111222222222222222222222222233333333333333333333334444444444444444444444444444444455555555555555555555555555555555555566666666666666666666666666666666666777777777777777777777777777778888888888888888999999999999999999:::::::::::::;;;;;;<<<<<<<========>???ACCDDEI/0000011111111111122222222222333333333444444444444455555555556666666667777777788888888999999::::;;<=>>>?@@+,,000023444566787788999::</00111122222222233333344445555666677777788899999:;>D,..../////////00000000000000000000000111111111111111111111111111111122222222222222222222222222222223333333333333333333333333333333333333333333333344444444444444444444444444444444444555555555555555555555555566666666666666666666666666777777777777777777777788888888888888888888889999999999999::::::::::::::::::;;;;;;;;<<<======>>>@@B116..////////0000000000000000001111111111111111222222222222222333333333333333333333444444444444444444444444444445555555556555555555555566666666666666666777777777778888888888888888999999:::;;;;;<<<<<==>>?FGHQS,,.///001134,012566678899B+++,+---..............///////////////////0000000000000000000000000000000001111111111111111111122222222222222222222222222222333333333333333333333333333333333333333334333333333444444444444444444444444444444444444444444445555555555555555555555555556555555556666666666666666666666666666666666667777777777777777777778777777788888888888888888888899999999999999999:::::::::;;;;;;;;;<====@AC***++,--.-..//0112,../011111222222233333334455556676789::;<>-00011112112233444555455566666677778888899:=?-.///////00000001111111121111112111111222222222222222222222222222222222333333333333333333333333333333333333333344444444444444444444444555555555555555555555555555555555555555555666666656666666666666666666666664666667777777777777777777777777777777777777777777777888888888888888888888889999999999999999999999999999::::::::::::::::::::::::;;;;;;;;;;;;<<<<<<<<<<<<<=====>>>>???????@@AABBG*+++++++,+,,,,,,,----...//////0//////000225...////////000000000000000011111111111111111222222222222333333333333334444444444444444444444555555555555555555566666666677777777777777888888888999999999999::::::;;;;;<<<<=>>?00111111111222233333334444455556677777889:::;;<==>>?B/////0000001111111111111111112222222222222222222222222222222333333333333333333333334444444444444444444444455555555555555555555555555556666666666666666666666666666777777777777777777777777788888888888888888888999999999999999999999999:::::::::::;;;;;;;;;;<<<<<<<<<<=======>>>>???BC--011123455788899:;;;?22357889:>?0011223333333344444555556666777778888889999::::::::::;;;;<<=====>>??@@AAABBCHH..../////////////00000000000000000000000111111111111111111111111122222222222222222233333333333333333333334444444444444444444555555555555555556666666666777777777777888888888888888888999:::::::::;;;;;<====>>??@BC.000000001111111111112222222222222222222222222222222223333333333333333333333333333333344444444444444444444441444444444444444444444555555555555555555555555555555555555555555666666666666666666666666666666666666666666666666666666666666666666666667777777777777777777777777777777777777777777777777778888888888888888888888888888888888888888888888888888888888889999999999999999999999999999999999999999999::::::::::::::::::::::::::::::::::::::::::;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<<<<<<<<<==================>>>>>>>>>>>>>?????????????@@@@@@@@@AAABBCCCC///111102222333324468:///000000000001111111111111111111222222222222222222222222222222222222222222223333333333333333333333333333333333333333333333333333334444444444444444444444444444444444444444444444444444444455555555555555555555555555555555555555555555566666666666666666666666666666666666666666666666666666666666666677777777777777777777777777777777777777777777777777777777777777777777888888888888888888888888888888888888888888888888888999999999999999999999999999999999999999999999999999999999999999999:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::;:;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<<<<<<<<<<<<<<<======================>>>>>>>>>>>>>>>>>>>>>?????????????@@@@@@@@@AAAAAABBBBCCCDDDFGG,,,-.......//0112222711222233333345556666666777777778888899999::::;;;<<=>?00112222222222223333333333444444444444444555555555555555566666666667777777778888899999:::::::::;;;;<<<<<<<>??@BFG0000011112222222222222223333333/33333344444444444555555555555555666666666666666677777777777777788888888999999999999999::::::;;;;;;;==>>???AB-../1,2250111222222333334445566677889:::;<B0122222344444445555666666666666677777788888899999:::;;;=>B1223333334444444445567777788889::::;=<=???/01112222222233333333333333444444444444455555555566666666667777777777777777787888888888888888888888888899999999999999999:::::::::;;;;;;;;;;;;;;;;;<<<<<<<<<<<=====>>>>>>????@@AACCIL57888:12244444455555556666667777788999999999::;<<=<=>>?/1222359>33444555566666666777777888899999999:;;;;<<=>@2233344444444444455555555566666666777776777777778889999999999::::::::::;;;;;;<<<<<=>@@AB2334455555666666677778888888899::::;;;<<<<<===>>>ABC13455667798<<<?A444455566666666667777777777777777778888888888888888888888899999999999999999999999::::::::::::::::::::;;;;;;;;;;;;;;;;<<<<<<<<<<<<<<<<<=========>>>>>>>>>>>>>??????@AAAAAABBBBCCCCDEEEEFFGKK13666677778779999::<>>c385667777777777788888888::;<>>>??AD38<<<====>?BDH#########################################&&'+,-.3',%+),--()**+,--.//0*/12((*./26'))))*********++++++,,,,,,,,--------...........//////////0000011111122222333344455566678+,-02226-)/0123***+-./1())))***+,,,----...//001237)*-.0(+-/0056)))**+++,,--....///000233***++,---.//01128&),0)**,-17*-.0122457'*-1+,(*++,,,,----..//000112247,-./027'')*++,,--//013(***++++,,,,,,,,,,-----------3............//////////////000000000000001111111111111222222222333333344445555556667779;;*+,-..013(()))))***********++++++++,,,,,,,,,----------------..............////////////0000000000000000111111111112222223333333444444555567-0970)+,-./1239'()***++++++,,,---...///00011122257))*******++++,,,,,-----...........///////////000000111111111222222333334555566788:****+,.../13448***++,,,----...///////000000111112222233334555778;)../2234*+--1234/0***+,,--.000////112234669))))***++++++,,,,,,------.......//////0000111111122223333444689*,)./01459+*//133(-....///123467*../00256),**++,,------..//0011122233444568(**,-.1*+-/049)+,,-.//148<)5-24*+--..///001113455()*******+++++++,,,,,,,,----------........////////////0000000000001111111112222223333333334445555566778899:<(),,--../01333=,.29)*******+++++++,,,,,,,,,-------------...........///////////000000000000111111112222222222333444555555679:.+2+,,--.//011222233345588;*++,-///111,-1248+++,---.////012233667**+++++++,,,,,,,,,,------------....//////0000000001111112222222243333334555888;2336)*+,,-1.../000011122388;*****++++,,,,,,,,,-------------.............../////////////////000000000000000000000000111111111111111111111222222222222222233333333333333334444444444445555555666666777778888999::;;<>=+,,../00127;+-./0012334,,--./14--..///0244<11(++,,--//0125+,.01())))****++++++,,,,,,,--------------...........///////////////////000000000000000000000111111111111222222222222222222333333333334444444444455555556666667778888899::;(***+++++++,,,,,,,,,,,--------......../////////////////00000000000000111111111111111222222222333333333344444444555556677799:;<<>*,.////002244H-.+./25-../3+/*,,---/0111238*+/,,--....////0012456)+++++++,,---------....../////////////00000000000000001111111111111222222233333333334444445566677778:;+,0+,,-001229/*.000)*+,,,,----../////0001122333457884,,,,---.//011122446,,-//001128+,11,,--.//001123445689;@++,,,----...//000011112222333444446788@,/,,.012278,,,-----.....//////000000112223333334445556668:**++,,,----.....//////////0011112245;5)+,,----....///////00011111222234557,-..///000112333345:+,--.//00112223469+,------....//00000011111122222233333333444444445555566788889:;<?++,,---.....////0111122233334455566667999++,,-...///000001111111112222233333444455556666666777888999:<=>'****++,,,,------..///00111122348012236+,-...00123568+....//0222344455799,-.///00122334559--0125.//0235+-//000112333344556?01+++,,,,--...////00011111122222233334445566789:A-/015/25=01175=+00369,1224579993))**+++++,,,,,,,,---------................./////////////////000000000000000/000001111111111111111112222222222222222222223333333344444444444444445555555555555555666666677778888999:;;;==,,-//14+,,-----.......//////////00000111111112222233333334444555556666777889@-.4./25:,,,---...../00000001122233333344455679::.3-/01123357<<,,-0240033--..////0011122333334445555666778:;;;=?())******+++++,,,,----......////0011234,.225+.113-034,---..//011122333445699:,,./035/025./0011122233455-...///0000011122222333334445555666777788:00144567-.//1112334455678D***+,,,--.////0-122346/007')**+++,-----........///////00001111112222222344445577778())**+,,,---..//00022345557?-00111245668:/./146..../////0000001111111122222222233333333334444444455555556666677777777777888888899999::;;;<<<=>*+,,,,,---......///0000000011111222233444445568:;02,.//000002222333468<)***+,--.00114()**+++,,,--........//0000111152/15-.//00112233445667777899;;@.003618<123581122789-047;+-/11301578<013345567789;,-..////0011123480145566699:;+./044/0111124444566799)**+++,,---../////00223713467;22457789@0111135555666777779:;>)**++,,---...//00011238255/23.00123445568128?.0234480122333334444444455556666777888889999999::::::;;;;;<<=?AC...///0000-11111122233333344445667789:/2222333334444555556666666677788889:::::;<=A,,,,,------....../////0000001111111223333445645730245:6./12446277836<4291<589>/11233458:2/@###########&)*1&)(++-.0,,,.,0*+,*--),12459/13)*-3*,,---/12212)),-..,*+,/015.0,,--//+--1122234502()-.000236-.1,+.+-/12,.-2-+,0-.-.3.0*9*.222425,-./4,+1/,,-...00123724//:9)*--/6,14(//3*-.0,15*+,,--..../01126+.20-+,-+138;/046.39,2560;3?"}

},{}],32:[function(require,module,exports){
var Reflux=require("reflux");
module.exports=Reflux.createActions(["search"]);
},{"reflux":6}],33:[function(require,module,exports){
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

var Candidates=React.createClass({
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
},{"./actions":32,"./kageglyph":36,"./store":38,"glyphemesearch":27,"react":undefined,"reflux":6}],34:[function(require,module,exports){
var React=require("react");
var getutf32=require("glyphemesearch").getutf32;
var E=React.createElement;
var styles={thechar:{fontSize:"300%"}};
var KageGlyph=require("./kageglyph");
var style={textDecoration:"none"};
var GlyphInfo=React.createClass({
	render:function() {
		var glyph=this.props.glyph;
		var utf32=getutf32({widestring:glyph});
		var codepoint=utf32.toString(16).toUpperCase();
		var unihan="http://www.unicode.org/cgi-bin/GetUnihanData.pl?codepoint="+codepoint;
		var xiaoxue="http://xiaoxue.iis.sinica.edu.tw/?char="+glyph;
		if (this.useKage(utf32)) glyph=E(KageGlyph,{size:100,glyph:"u"+utf32.toString(16)}) ;
		return E("div",{},
			E("a",{target:"_new",style:style,title:"Unihan",href:unihan},"U+"+codepoint),
			E("span",{style:styles.thechar}, 
				E("a",{target:"_new",style:style,title:"小學堂",href:xiaoxue},glyph)));
	}
	,useKage:function(uni) {
		return uni>0x2A700;
	}
});
module.exports=GlyphInfo;
},{"./kageglyph":36,"glyphemesearch":27,"react":undefined}],35:[function(require,module,exports){
var React=require("react");
var actions=require("./actions");

var E=React.createElement;
var styles={
	logo:{fontSize:"150%",textDecoration:"none"},
	tofind:{fontSize:"200%"}
}
var GlyphSearch=React.createClass({
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
			,"深拆")
		);
	}
});
module.exports=GlyphSearch;
},{"./actions":32,"react":undefined}],36:[function(require,module,exports){
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
var KageGlyph=React.createClass({
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
		return E("span",{label:this.props.glyph, dangerouslySetInnerHTML:{__html:svg}});
	}
});
KageGlyph.loadBuhins=loadBuhins;
module.exports=KageGlyph;
},{"kage":28,"react":undefined}],37:[function(require,module,exports){
var React=require("react");
var GlyphSearch=require("./glyphsearch");
var GlyphInfo=require("./glyphinfo");
var Candidates=require("./candidates");
var E=React.createElement;

var maincomponent = React.createClass({
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
},{"./candidates":33,"./glyphinfo":34,"./glyphsearch":35,"react":undefined}],38:[function(require,module,exports){
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
},{"./actions":32,"glyphemesearch":27,"reflux":6}]},{},[26]);
