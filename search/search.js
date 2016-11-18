function searchonyoudao(info, tab){
	var searchurl = "http://dict.youdao.com/search?q=" + encodeURIComponent(info.selectionText) + "&keyfrom=dict.plugin";
	window.open(searchurl);
}
var parent = chrome.contextMenus.create({"title": " 有道词典查询'%s'","contexts":["selection"],"onclick":searchonyoudao,});
