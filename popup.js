
window.onload = function()
{
    // ************全局变量***********
    window.localTest = false;   // 是否本地测试
    window.bookmarkUrl = window.localTest ? "http://localhost/bookmarks/bookmarks.php" : "http://sjxphp56.applinzi.com/bookmarks/bookmarks.php";
    
    // ************事件绑定************
    // 获取最新的书签
    var btnGetLatestBookmarks = document.getElementById("getLatestBookmarks");
    btnGetLatestBookmarks.onclick = getLatestBookmarks;
    // 添加书签
    var btnAddBookmark = document.getElementById("addBookmark");
    btnAddBookmark.onclick = addBookmark;
    
    
};

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

// **************** 书签同步相关 ************************
// 统计书签的标签
function getBookmarksTagStat(bm)
{
    var tagContainer = {};
    // 循环所有书签，给所有tag计数
    for (var i=0; i<bm.length; ++i)
    {
        for (var j=0; j<bm[i].tag.length; ++j)
        {
            if(bm[i].tag[j] != "")
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
    }
    return tagContainer;
}

// 将书签列表转化为树状文件夹的形式
function transBookmarksFromArray2FolderTree(bm, bmFolder, bmNoFolder)
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
    
// 添加书签
function addBookmark()
{
    // 外框
    var divAdd = document.createElement("div");
    document.body.appendChild(divAdd);
    
    // name
    var divName = document.createElement("div");
    divName.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divName);
    var labelName = document.createElement("label");
    labelName.style = "float: left; width: 20%;";
    labelName.innerHTML = "name";
    divName.appendChild(labelName);
    var inputName = document.createElement("input");
    inputName.style = "display: block; width: 75%;";
    divName.appendChild(inputName);
    
    // url
    var divUrl = document.createElement("div");
    divUrl.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divUrl);
    var labelUrl = document.createElement("label");
    labelUrl.style = "float: left; width: 20%;";
    labelUrl.innerHTML = "url";
    divUrl.appendChild(labelUrl);
    var inputUrl = document.createElement("input");
    inputUrl.style = "display: block; width: 75%;";
    divUrl.appendChild(inputUrl);
    
    // tag
    var divTag = document.createElement("div");
    divTag.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divTag);
    var labelTag = document.createElement("label");
    labelTag.style = "float: left; width: 20%;";
    labelTag.innerHTML = "tag";
    divTag.appendChild(labelTag);
    var inputTag = document.createElement("input");
    inputTag.style = "float: left; width: 60%;";
    divTag.appendChild(inputTag);
    var showTagSelect = document.createElement("input");
    divTag.appendChild(showTagSelect);
    showTagSelect.value = "▼";
    showTagSelect.type = "button";
    showTagSelect.style = "float: right; width: 15%;padding : 0;";
    showTagSelect.onclick = function()
    {
        var ele = document.getElementById("tagSelect");
        if(ele)
        {
            if(this.value == "▼")
            {
                ele.style.display = "inline";
                this.value = "▲";
            }
            else
            {
                ele.style.display = "none";
                this.value = "▼";
            }
        }
    }
    // tag按钮行为函数
    var tagDefine = function()
    {
        if(inputTag.value.search(/[^\s]/) != -1)
        {
            var tags = inputTag.value.split(/[\s,]+/);
            for(var i=0; i<tags.length; ++i)
            {
                if(tags[i] == this.value)
                {
                    tags.splice(i,1);
                    inputTag.value = tags.toString();
                    return;
                }
            }
            tags.push(this.value);
            inputTag.value = tags.toString();
        }
        else
        {
            inputTag.value = this.value;
        }
    };
    
    
    // 分析常用的几个标签，动态展示出来
    $.when(deferredChromeStorageLocalGet("bookmarks"))
    .done(
        function(localBookmarks)
        {
            var tagSelect = document.createElement("select");
            divTag.appendChild(tagSelect);
            tagSelect.multiple = "multiple";
            tagSelect.id = "tagSelect";
            tagSelect.style.display = "none";
            tagSelect.size = 8;
            var objBookmarks = JSON.parse(localBookmarks);
            var tagStat = getBookmarksTagStat(objBookmarks);
            var tagList = [];
            for(item in tagStat)
            {
                tagList.push([item, tagStat[item]]);
            }
            tagList.sort(function(a,b)
            {
                a = a[1];
                b = b[1];
                return a>b ? -1 : (a<b ? 1 : 0);
            });
            for(var i=0; i<tagList.length; ++i)
            {
                var option = document.createElement("option");
                option.value = tagList[i][0];
                option.innerHTML = tagList[i][0]
                option.onclick = tagDefine;
                tagSelect.appendChild(option);
            }
        });
            
    // description
    var divDesp = document.createElement("div");
    divDesp.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divDesp);
    var labelDesp = document.createElement("label");
    labelDesp.style = "float: left; width: 20%;";
    labelDesp.innerHTML = "描述";
    divDesp.appendChild(labelDesp);
    var inputDesp = document.createElement("input");
    inputDesp.style = "display: block; width: 75%;";
    divDesp.appendChild(inputDesp);

    // 提交按钮
    var btnSubmit = document.createElement("input");
    divAdd.appendChild(btnSubmit);
    btnSubmit.value = "提交";
    btnSubmit.type = "button";
    btnSubmit.style = "float: right";
    btnSubmit.onclick = function()
    {
       // 先应该检查输入的合理性
       // 暂略
       
       // 提交到服务器
       var bookmark = {name:inputName.value, url:inputUrl.value, tag:inputTag.value.split(/[\s,]+/), description:inputDesp.value};
       var url = window.localTest ? "http://localhost/bookmarks/bookmarks.php" : "http://sjxphp56.applinzi.com/bookmarks/bookmarks.php";
       $.post(url,{action:"addBookmark", bookmark:JSON.stringify(bookmark)})  
       .done(function(result)
       {  
           alert(result == "true" ? "添加书签成功" : "添加书签失败");
       });
    };
}

// 同步书签
function getLatestBookmarks()
{
    // 书签同步过程中需要用到的状态变量
    // 记录本地最新书签时间
    var localBookmarkTime;
    // 记录服务器最新书签时间
    var serverBookmarkTime;
    // 服务器最新书签
    var serverBookmarks;
    // 书签栏ID
    var bookmarkBarID;
    
    // 从服务器上获取最新书签时间
    var getServerBookmarkTime = function()
    {
        var dfrd = $.Deferred();
        $.post(window.bookmarkUrl,{action:"getTime"})
        .done(function(result)
            {
                if(/^\d+$/.test(result))
                {
                    dfrd.resolve(result);
                }
                else
                {
                    dfrd.reject("服务器上最新书签时间格式错误！");
                }
            })
        .fail(function()
            {
                dfrd.reject("获取最新书签时间失败！");
            });
        return dfrd.promise();
    };
    
    
    // 从本地扩展获取时间
    var getLocalBookmarkTime = function()
    {
        var dfrd = $.Deferred();
        $.when(deferredChromeStorageLocalGet("time"))
        .done(function(time)
            {
                dfrd.resolve(time);
            })
        .fail(function()
            {
                dfrd.reject("获取本地最新时间失败！");
            });
        return dfrd.promise();
    };
    
    
    // 比较本地和服务器的时间
    var compareTime = function()
    {
         var dfrd = $.Deferred();
         if(typeof(localBookmarkTime) == "undefined" || parseInt(localBookmarkTime) < parseInt(serverBookmarkTime))
         {
             dfrd.resolve();
         }
         else
         {
             dfrd.reject("当前书签已经是最新，不需要更新。");
         }
         return dfrd.promise();
    }
    
    
    // 获取服务器最新书签
    var getServerBookmarks = function()
    {
        var dfrd = $.Deferred();
        $.post(window.bookmarkUrl,{action:"getBookmarks"})
        .done(function(result)
            {
                serverBookmarks = result;
                dfrd.resolve(result);
            })
        .fail(function()
            {
                dfrd.reject("获取最新书签失败！");
            });
        return dfrd.promise();
    }
    
    // 存储书签到本地
    var saveBookmarks = function(bookmarks)
    {
        var dfrd = $.Deferred();
        $.when(deferredChromeStorageLocalSet({time:serverBookmarkTime, bookmarks:bookmarks}))
        .done(
            function()
            {
                dfrd.resolve();
            })
        .fail(
            function()
            {
                dfrd.reject("存储书签到本地失败！");
            });
        return dfrd.promise();
    };
    
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
    }
    
    
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
    
        

    // 重建书签栏
    var refillBookmarkBar = function()
    {
        var objBookmarks = JSON.parse(serverBookmarks);   // 书签字符串转对象
        var bmFolder = {};
        var bmNoFolder = [];
        transBookmarksFromArray2FolderTree(objBookmarks, bmFolder, bmNoFolder);     // 将书签列表转化为树状文件夹的形式
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
    
    $.when(getServerBookmarkTime())    // 从服务器上获取最新书签时间
    .then(
        function(time)    // 记录服务器最新书签时间，并读取本地扩展时间
        {
            serverBookmarkTime = time; 
            return getLocalBookmarkTime();
        })
    .then(
        function(time)
        {
            localBookmarkTime = time;   // 保存本地时间
            return compareTime();       // 对比服务器时间和本地时间
        })
    .then(
        function()
        {
            return getServerBookmarks();    // 如果服务器时间更新，则获取服务器书签数据
        })
    .then(
        function(bookmarks)
        {
            serverBookmarks = bookmarks;
            return saveBookmarks(bookmarks);
        })
    .then(getBookmarkBarID)  // 获取书签栏ID
    .then(
        function(barID)
        {
            bookmarkBarID = barID;
            delAllBookmarksInBookmarkBar();
        }) // 删除书签栏所有书签
    .done(refillBookmarkBar)    // 重置书签栏
    .fail(function(msg){alert(msg);})
}
