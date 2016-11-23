
// 负责总的消息分发
chrome.runtime.onMessage.addListener(function(request, sender, senderResponse)
{
    if(request.action == "WSJ_findImg")
    {
        WSJ_findImg(request.url, request.imgUrl);
        
    }
});

//**********************************************************//
//   右键显示有道词典搜索
function searchonyoudao(info, tab){
	var searchurl = "http://dict.youdao.com/search?q=" + encodeURIComponent(info.selectionText) + "&keyfrom=dict.plugin";
	window.open(searchurl);
}
var parent = chrome.contextMenus.create({"title": " 有道词典查询'%s'","contexts":["selection"],"onclick":searchonyoudao,});


//**********************************************************//
//   GetNewsmart相关功能

// 输入待打开的m.wsj.video链接和图片链接，找出图片
function WSJ_findImg(url, imgUrl)
{
    chrome.tabs.query({url:url}, function(tabs)
    {
        if(tabs.length == 0)    // 不存在就打开
        {
            chrome.tabs.create({url:url}, function(tab)
            {
                chrome.tabs.sendMessage(tab.id, {action:"WSJ_matchImg", imgUrl:imgUrl});
            });
        }
        else    // 网页存在就激活
        {
            chrome.tabs.update(tabs[0].id, {active:true}, function(tab)
            {
                chrome.tabs.sendMessage(tab.id, {action:"WSJ_matchImg", imgUrl:imgUrl});
            });
        }
    });
    
}
