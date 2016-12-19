$(document).ready(function() 
{
    // 一些绑定
    $("#getBookmarksFromServer").click(getBookmarksFromServer);
    $("#saveBookmarksToServer").click(saveBookmarksToServer);
    $("#getLocalBookmarks").click(getLocalBookmarks);
    $("#saveLocalBookmarks").click(saveLocalBookmarks);
    $("#saveLocalBookmarks").click(saveLocalBookmarks);
});

// **************** 一些对Chrome Extension API的deferred的包装 ************************
function deferredChromeStorageLocalSet(obj) 
{
    var dfrd = $.Deferred();
    chrome.storage.local.set(obj, function()
    {
        if(chrome.runtime.lastError)
        {
            console.log(chrome.runtime.lastError.message);
            dfrd.reject();
        }
        else
        {
            dfrd.resolve();
        }
    });
    return dfrd.promise()
}
function deferredChromeStorageLocalGet(key) 
{
    var dfrd = $.Deferred();
    chrome.storage.local.get(key, function(result)
    {
        if(chrome.runtime.lastError)
        {
            console.log(chrome.runtime.lastError.message);
            dfrd.reject();
        }
        else
        {
            dfrd.resolve(result[key]);
        }
    });
    return dfrd.promise()
}

// 从服务器读取书签
function getBookmarksFromServer()
{
    alert("getBookmarksFromServer");
}

// 从本地读取书签
function getLocalBookmarks()
{
    $.when(deferredChromeStorageLocalGet("bookmarks"))
    .done(showBookmarks)    
    .fail(
        function()
        {
            alert("读取本地书签失败！");
        });
}

// 保存本地书签
function saveLocalBookmarks()
{
    $.when(deferredChromeStorageLocalGet("bookmarks"))
    .done(showBookmarks)    
    .fail(
        function()
        {
            alert("读取本地书签失败！");
        });
}

// 表格显示书签
function showBookmarks(bookmarks)
{
    var divTable = document.getElementById("bookmarksTable");
    var table =  document.createElement("table");
    divTable.appendChild(table);
    
    var objBookmarks = JSON.parse(bookmarks);
    for(var i=0; i<objBookmarks.length; ++i)
    {
        var row = document.createElement("tr");
        table.appendChild(row);
        for(item in objBookmarks[i])
        {
            var col = document.createElement("td");
            row.appendChild(col);
            var colData = document.createElement("a");
            col.appendChild(colData);
            colData.innerHTML = objBookmarks[i][item];
            colData.className = "editable";
        }
    }
    $('.editable').editable(
    {
        type: 'text',
        mode : 'popup',
        //success: function(response, newValue) 
        //{
        //    userModel.set('username', newValue); //update backbone model
        //}
    });
}