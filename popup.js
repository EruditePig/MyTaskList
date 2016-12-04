
window.onload = function()
{
    window.localTest = false;   // 是否本地测试
    
    // ************ 书签同步相关 ********************
    // 获取最新的书签
    var btnGetLatestBookmarks = document.getElementById("getLatestBookmarks");
    btnGetLatestBookmarks.onclick = getLatestBookmarks;
    
    
};

// **************** 书签同步相关 ************************
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

function getLatestBookmarks()
{
    var url = window.localTest ? "http://localhost/bookmarks/bookmarks.php" : "http://sjxphp56.applinzi.com/bookmarks/bookmarks.php";
    $.post(url,{action:"getDate"})  
    .done(function(time)
    {  
        // 获取当前扩展存储的时间
        chrome.storage.local.get("time", function(result)
        {
            if(result.time == null)     // 如果当前扩展没有存储时间，则更新服务器上的书签
            {
                UpdateBookmarksFromServer(time);    // 更新书签和服务器同步
            }
            else    // 如果当前扩展有时间，则比较，如果早于其时间，则更新服务器上的书签
            {
                if(result.time < time)
                {
                    UpdateBookmarksFromServer(time);    // 更新书签和服务器同步
                }
                else    // 否则不需要更新
                {
                    alert("当前书签已经是最新。");
                }
            }
        });
    });
}

// 更新书签和服务器同步
function UpdateBookmarksFromServer(time)
{
    var url = window.localTest ? "http://localhost/bookmarks/bookmarks.php" : "http://sjxphp56.applinzi.com/bookmarks/bookmarks.php";
    $.post(url,{action:"getBookmarks"})  
        .done(function(bookmarks)
        {  
            var bookmarksBarId;     // 书签栏文件夹的ID
            chrome.bookmarks.getTree(function(results) 
            {
                bookmarksBarId = results[0].children[0].id;     // 获取书签栏文件夹的ID
                chrome.bookmarks.getSubTree(bookmarksBarId, function(results)
                {
                    // 读取书签栏根目录下所有书签并删除
                    for(var i=0; i<results[0].children.length; ++i)
                    {
                        chrome.bookmarks.removeTree(results[0].children[i].id);
                    }
                });
            });
            var timeID = setInterval(function()
            {
                // 检测是不是书签栏根目录下删除干净了
                chrome.bookmarks.getSubTree(bookmarksBarId, function(results)
                {
                    if(results[0].children.length == 0)     // 删干净了
                    {
                        clearInterval(timeID);      // 停止计时器
                        chrome.storage.local.set({"time" : time});      // 往扩展里存储本次书签对应的时间
                        // 开始添加书签 
                        var objBookmarks = JSON.parse(bookmarks);   // 书签字符串转对象
                        var bmFolder = {};
                        var bmNoFolder = [];
                        transBookmarksFromArray2FolderTree(objBookmarks, bmFolder, bmNoFolder);     // 将书签列表转化为树状文件夹的形式
                        for(item in bmFolder)
                        {
                            if(bmFolder[item].length == 0) continue;
                            chrome.bookmarks.create({"parentId" : bookmarksBarId, 'title': item},function(newFolder)
                            {
                                for(var j=0; j<bmFolder[newFolder.title].length; ++j)
                                {
                                    chrome.bookmarks.create({"parentId" : newFolder.id, "title" : bmFolder[newFolder.title][j].name, "url" : bmFolder[newFolder.title][j].url});}
                                }
                            );
                        }
                        for(var i=0; i<bmNoFolder.length; ++i)
                        {
                            chrome.bookmarks.create({"parentId" : bookmarksBarId, "title" : bmNoFolder[i].name, "url" : bmNoFolder[i].url});
                        }
                    }
                });
            }, 300); 
        });
    
}

// 将书签列表转化为树状文件夹的形式
function transBookmarksFromArray2FolderTree(bm, bmFolder, bmNoFolder)
{
    var tagContainer = {};
    // 循环所有书签，给所有tag计数
    for (var i=0; i<bm.length; ++i)
    {
        for (var j=0; j<bm[i].tag.length; ++j)
        {
            if (tagContainer.hasOwnProperty(bm[i].tag[j]))
            {
                tagContainer[bm[i].tag[j]] += 1;
            }
            else
            {
                tagContainer[bm[i].tag[j]] = 1;
            }
        }
    }
    // 循环所有书签，根据自己tag中的最多的那个，决定如何分配
    for(item in tagContainer)
    {
        if(tagContainer[item] > 1)
        {
            bmFolder[item] = [];
        }
    }
    
    for(var i=0; i<bm.length; ++i)
    {
        if(bm[i].tag.length == 0)
        {
            bmNoFolder.push(bm[i]);
        }
        else
        {
            var maxCount = 0;
            var maxTag;
            for(var j=0; j<bm[i].tag.length; ++j)
            {
                if(tagContainer[bm[i].tag[j]] > maxCount)
                {
                    maxCount = tagContainer[bm[i].tag[j]];
                    maxTag = bm[i].tag[j];
                }
            }
            if(maxCount == 1)
            {
                bmNoFolder.push(bm[i]);
            }
            else
            {
                bmFolder[maxTag].push(bm[i]);
            }
        }
    }
}

function createBookmark()
{
    //var parentID;
    //chrome.bookmarks.create({"parentId" : bookmarkBar.id, 'title': 'Extension bookmarks'},function(newFolder) {
    //    chrome.bookmarks.create({"parentId" : newFolder.id, "title" : "baidu", "url" : "http://www.baidu.com"});}
    //);
    var bookmarksBarId;
    chrome.bookmarks.getTree(function(results) 
    {
        bookmarksBarId = results[0].children[0].id;
        chrome.bookmarks.create({"parentId" : bookmarksBarId, 'title': 'Extension bookmarks'},function(newFolder) {
            chrome.bookmarks.create({"parentId" : newFolder.id, "title" : "baidu", "url" : "http://www.baidu.com"});}
        );
    });
}