var files=["2d","buhin","curve","kage","kagecd","kagedf","polygon","polygons"];
var fs=require("fs");
var content="";
files.map(function(file){
	content+=fs.readFileSync(file+".js","utf8");
});

content+="\nmodule.exports={Kage:Kage,Polygons:Polygons}";
fs.writeFileSync("index.js",content,"utf8");