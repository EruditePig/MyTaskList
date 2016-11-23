var _lastElem;

window.onload = function()
{
    document.addEventListener('mousemove', onMouseMove, false);       // 监控鼠标移动消息
    document.addEventListener('dblclick', onMouseDBClick, false);       // 监控鼠标双击消息
}

function onMouseDBClick(e)
{
    var elem = e.target;
    if(elem.classList.contains("article-card_text-wrapper"))
    {
        var dateElem = elem.getElementsByClassName("article-card_publish-date")
        var articleTime = Date.parse(dateElem[0].textContent)
        var date = new Date( articleTime );
        var url = "http://m.wsj.net/video/" + date.getFullYear() + (date.getMonth()+1) + date.getDate() + "/";
        var imgUrl = elem.previousSibling.childNodes[0].src
        chrome.runtime.sendMessage({action:"WSJ_findImg", url:url, imgUrl:imgUrl});
        //alert(date.toLocaleString());
    }
}

function onMouseMove(e) {
	e.preventDefault();

	var nowPos = {x: e.clientX , y: e.clientY };      // 绝对坐标
	//console.log(nowPos);
    var newElem = document.elementFromPoint(nowPos.x, nowPos.y);
    if(newElem && newElem != _lastElem)
    {
        if(_lastElem)
        {
            _lastElem.style.backgroundColor = "";
        }
        _lastElem = newElem;
        if(newElem.classList.contains("article-card_text-wrapper") && newElem.parentNode.classList.contains("video"))
        {
            newElem.style.backgroundColor = "yellow";
        }
        
    }
	return false;
}