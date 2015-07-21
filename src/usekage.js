var nua = navigator.userAgent;

var useKage=function(utf32) {
	var systemfontends=0x2A700;
	var iOS = ( nua.match(/iPad|iPhone|iPod/g) ? true : false );

	if (nua.indexOf('Android ')>-1)systemfontends=0x20000;
	if (iOS) systemfontends=0x20000;
	
	return utf32>=systemfontends;
}
module.exports=useKage;