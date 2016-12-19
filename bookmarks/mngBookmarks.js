$(document).ready(function() 
{
    // 一些全局变量
    window.localTest = true;   // 是否本地测试
    window.bookmarkUrl = window.localTest ? "http://localhost/bookmarks.php" : "http://sjxphp56.applinzi.com/bookmarks/bookmarks.php";
    
    // 一些绑定
    $("#getBookmarksFromServer").click(getBookmarksFromServer);
    $("#saveBookmarksToServer").click(saveBookmarksToServer);
    $("#getLocalBookmarks").click(getLocalBookmarks);
    $("#saveLocalBookmarks").click(saveLocalBookmarks);
    $("#updateBookmarkBar").click(updateBookmarkBar);
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
    $.post(window.bookmarkUrl,{action:"getBookmarks"})
    .done(function(result)
        {
            var objBookmarks = JSON.parse(result).bookmarks;
            showBookmarks(objBookmarks);
        })
    .fail(function()
        {
            alert("获取书签失败！");
        });
}

// 从本地读取书签
function getLocalBookmarks()
{
    $.when(deferredChromeStorageLocalGet("bookmarks"))
    .done(
        function(result)
        {
            var objBookmarks = JSON.parse(result);
            showBookmarks(objBookmarks);
        }
        )    
    .fail(
        function()
        {
            alert("读取本地书签失败！");
        });
}

// 保存本地书签
function saveLocalBookmarks()
{
    var bookmarks = getBookmarksFromTable();
    $.when(deferredChromeStorageLocalSet({time:Math.floor(Date.now()/1000), bookmarks:JSON.stringify(bookmarks)}))
    .done(
        function()
        {
            alert("存储书签到本地成功！");
        })
    .fail(
        function()
        {
            alert("存储书签到本地失败！");
        });
}

// 保存书签到服务器
function saveBookmarksToServer()
{
    var bookmarks = getBookmarksFromTable();
    $.post(window.bookmarkUrl,{action:"saveBookmarks", bookmarks:JSON.stringify(bookmarks)})  
    .done(function(result)
    {  
        alert(result == "true" ? "保存书签成功" : "保存书签失败");
    });
}

// 书签更新到书签栏上
function updateBookmarkBar()
{
    var bookmarks = getBookmarksFromTable();
    var bookmarkBarID = 1;
    
    // 获取书签栏ID
    var getBookmarkBarID = function()
    {
        var dfrd = $.Deferred();
        chrome.bookmarks.getTree(function(results) 
        {
            dfrd.resolve(results[0].children[0].id);     // 获取书签栏文件夹的ID
        })
        return dfrd.promise();
    };
    
    var delBookmarkFolder = function(folderID)
    {
        var dfrd = $.Deferred();
        chrome.bookmarks.removeTree(folderID, function()
        {
            dfrd.resolve();
        });
        return dfrd.promise();
    };
    
    // 删除书签栏上所有的书签
    var delAllBookmarksInBookmarkBar = function()
    {
        var dfrd = $.Deferred();
        chrome.bookmarks.getSubTree(bookmarkBarID, function(results)
        {
            var promises = [];
            // 读取书签栏根目录下所有书签并删除
            for(var i=0; i<results[0].children.length; ++i)
            {
                promises.push(delBookmarkFolder(results[0].children[i].id));
            }
            $.when.apply($, promises)
            .then(
                function()
                {
                    dfrd.resolve();
                }
                ,function()
                {
                    dfrd.reject();
                });
        });
        return dfrd.promise();
    };
   
   // 统计书签的标签
   var getBookmarksTagStat = function(bm)
   {
        var tagContainer = {};
        // 循环所有书签，给所有tag计数
        for (var i=0; i<bm.length; ++i)
        {
            var tags = bm[i].tag.split(/,/).map(function(s) { return s.trim() }).filter(Boolean);
            for (var j=0; j<tags.length; ++j)
            {
                if(tags[j] != "")
                {
                    if (tagContainer.hasOwnProperty(tags[j]))
                    {
                        tagContainer[tags[j]] += 1;
                    }
                    else
                    {
                        tagContainer[tags[j]] = 1;
                    }
                }
            }
        }
        return tagContainer;
    };

   // 将书签列表转化为树状文件夹的形式
   var transBookmarksFromArray2FolderTree = function(bm, bmFolder, bmNoFolder)
   {
        var tagContainer = getBookmarksTagStat(bm);
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
            var tags = bm[i].tag.split(/,/).map(function(s) { return s.trim() }).filter(Boolean);
            if(tags.length == 0)
            {
                bmNoFolder.push(bm[i]);
            }
            else
            {
                var maxCount = 0;
                var maxTag;
                for(var j=0; j<tags.length; ++j)
                {
                    if(tagContainer[tags[j]] > maxCount)
                    {
                        maxCount = tagContainer[tags[j]];
                        maxTag = tags[j];
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
   };

   // 重建书签栏
   var refillBookmarkBar = function()
   {
       var bmFolder = {};
       var bmNoFolder = [];
       transBookmarksFromArray2FolderTree(bookmarks, bmFolder, bmNoFolder);     // 将书签列表转化为树状文件夹的形式
       for(item in bmFolder)
       {
           if(bmFolder[item].length == 0) continue;
           chrome.bookmarks.create({"parentId" : bookmarkBarID, 'title': item},function(newFolder)
           {
               for(var j=0; j<bmFolder[newFolder.title].length; ++j)
               {
                   chrome.bookmarks.create({"parentId" : newFolder.id, "title" : bmFolder[newFolder.title][j].name, "url" : bmFolder[newFolder.title][j].url});}
               }
           );
       }
       for(var i=0; i<bmNoFolder.length; ++i)
       {
           chrome.bookmarks.create({"parentId" : bookmarkBarID, "title" : bmNoFolder[i].name, "url" : bmNoFolder[i].url});
       }
   };
    
    $.when(getBookmarkBarID())  // 获取书签栏ID
    .then(
        function(barID)
        {
            bookmarkBarID = barID;
            delAllBookmarksInBookmarkBar();
        }) // 删除书签栏所有书签
    .done(refillBookmarkBar)    // 重置书签栏
    .fail(function(msg){alert(msg);});
}
// 读表格内容
function getBookmarksFromTable()
{
    var table = $("#bookmarksTable")[0];
    var bm = [];
    for (var i = 0; i < table.rows.length; i++) 
    {  //遍历Table的所有Row
        bm.push({name:table.rows[i].cells[0].childNodes[0].innerHTML,
                 url:table.rows[i].cells[1].childNodes[0].innerHTML,
                 tag:table.rows[i].cells[2].childNodes[0].innerHTML,
                 description:table.rows[i].cells[3].childNodes[0].innerHTML});
    }
    return bm;
}

// 表格显示书签
function showBookmarks(objBookmarks)
{
    var divTable = document.getElementById("bookmarksDiv");
    var table =  document.createElement("table");
    table.id = "bookmarksTable";
    divTable.appendChild(table);
    
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
