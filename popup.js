
function onClickRead()
{
    chrome.storage.local.get("count", function(result){
        if(result.count == null)
        {
            alert("不存在这个变量");
            return;
        }
        else
        {
            alert(result.count);
        }
    });
}

function onClickAdd()
{
    chrome.storage.local.get("count", function(result){
        if(result.count == null)
        {
            chrome.storage.local.set({"count" : 1});
        }
        else
        {
            chrome.storage.local.set({"count" : parseInt(result.count) + 1});
        }
    });
    
    
}

window.onload = function()
{
    var btnRead = document.getElementById("read_count");
    btnRead.onclick = onClickRead;
    
    var btnAdd = document.getElementById("add_count");
    btnAdd.onclick = onClickAdd;
};