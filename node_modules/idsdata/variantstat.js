var rawdata=require("./rawdata");
var tokenize=require("./tokenize");

var entities={};// "部件:次數";

for (var i in rawdata) {
	var ids=rawdata[i];
	var parts=tokenize(ids);
	for (var j=0;j<parts.length;j++) {
		var part=parts[j];


		if (part[0]!=="&") continue;
		if (!entities[part]) entities[part]=0;
		entities[part]++;
	}
}

var arr=[];
for (var i in entities) {
	arr.push([i,entities[i]]);
}
var out={};
arr.sort(function(a,b){return b[1]-a[1]});
for (var i in arr) {
	out[ arr[i][0]] = arr[i][1];
}


console.log(JSON.stringify(out,""," "));