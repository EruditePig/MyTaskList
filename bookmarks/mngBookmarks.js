$(document).ready(function() 
{
    // 一些全局变量
    window.localTest = false;   // 是否本地测试
    window.bookmarkUrl = window.localTest ? "http://localhost/bookmarks.php" : "http://sjxphp56.applinzi.com/bookmarks/bookmarks.php";
    
    // 一些绑定
    $("#getBookmarksFromServer").click(getBookmarksFromServer);
    $("#saveBookmarksToServer").click(saveBookmarksToServer);
    $("#getLocalBookmarks").click(getLocalBookmarks);
    $("#saveLocalBookmarks").click(saveLocalBookmarks);
    $("#updateBookmarkBar").click(updateBookmarkBar);
    $("#delSelectedBookmarks").click(delSelectedBookmarks);
    $("#adddBookmark").click(adddBookmark);
    
});

// 切换模块对话框的显示
function showModalDialog()
{
    var e1 = document.getElementById('modal-overlay');			
    e1.style.visibility = "visible";
}

function hideModalDialog()
{
    var e1 = document.getElementById('modal-overlay');			
    e1.style.visibility = "hidden";
    
    $("#modal-data").empty();
}


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
    clearTable();
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
    clearTable();
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


// 统计书签的标签
function getBookmarksTagStat(bm)
{
    var tagContainer = {};
    // 循环所有书签，给所有tag计数
    for (var i=0; i<bm.length; ++i)
    {
        var tags = bm[i].tag.split(/[,;]/).map(function(s) { return s.trim() }).filter(Boolean);
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
            var tags = bm[i].tag.split(/[,;]/).map(function(s) { return s.trim() }).filter(Boolean);
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

// 删除选定的书签
function delSelectedBookmarks()
{
    var selectedRow = getSelectedBookmarks()
    selectedRow.sort(function(a,b){return b-a;});
    var table = $("#bookmarksTable")[0];
    for(var i=0; i<selectedRow.length; ++i)
    {
        console.log(selectedRow[i]);
        table.deleteRow(selectedRow[i]);
    }
}

// 添加书签
function adddBookmark()
{
    showModalDialog();    // 显示对话框
    
    var divAdd = document.createElement("div");
    $("#modal-data").append(divAdd);
    
    // title
    var title = document.createElement("p");
    title.innerHTML = "添加书签";
    divAdd.appendChild(title);
    
    
    // name
    var divName = document.createElement("div");
    divAdd.appendChild(divName);
    divName.style = "margin-top: 5px;margin-bottom: 5px;";
    var labelName = document.createElement("label");
    labelName.style = "display:inline-block; width: 20%;";
    labelName.innerHTML = "name";
    divName.appendChild(labelName);
    var inputName = document.createElement("input");
    inputName.style = "display:inline-block;; width: 75%;";
    divName.appendChild(inputName);
    
    // url
    var divUrl = document.createElement("div");
    divUrl.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divUrl);
    var labelUrl = document.createElement("label");
    labelUrl.style = "display:inline-block; width: 20%;";
    labelUrl.innerHTML = "url";
    divUrl.appendChild(labelUrl);
    var inputUrl = document.createElement("input");
    inputUrl.style = "display:inline-block;; width: 75%;";
    divUrl.appendChild(inputUrl);
    
    // tag
    var divTag = document.createElement("div");
    divTag.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divTag);
    var labelTag = document.createElement("label");
    labelTag.style = "display:inline-block; width: 20%;";
    labelTag.innerHTML = "tag";
    divTag.appendChild(labelTag);
    var inputTag = document.createElement("input");
    inputTag.id = "inputTag";
    inputTag.style = "display:inline-block;; width: 75%;";
    divTag.appendChild(inputTag);

    // 分析常用的几个标签，动态展示出来
    var divTagList = document.createElement("div");
    divTagList.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divTagList);
    $.when(deferredChromeStorageLocalGet("bookmarks"))
    .done(
        function(localBookmarks)
        {
            // 获取书签的tag列表
            var objBookmarks = JSON.parse(localBookmarks);
            var tagStat = getBookmarksTagStat(objBookmarks);
            var tagListWithCount = [];
            for(item in tagStat)
            {
                tagListWithCount.push([item, tagStat[item]]);
            }
            tagListWithCount.sort(function(a,b)
            {
                a = a[1];
                b = b[1];
                return a>b ? -1 : (a<b ? 1 : 0);
            });
            var tagList = [];
            for(i in tagListWithCount)
            {
                tagList.push(tagListWithCount[i][0])
            }
            // 用带标签的下拉选项
            var btns = [];
            for (var i = 0; i < tagList.length; ++i) 
            {
            	btns.push(document.createElement("input"));
            	btns[i].type = "button";
            	btns[i].value = tagList[i];
            	btns[i].onclick = function()
            	{
            		var inputTagElem = document.getElementById("inputTag");
            		var tagText = inputTagElem.value;
     				var tags = tagText.split (/[,;]/).filter(function(el) {return el.length != 0});
            		var index = tags.indexOf(this.value);
            		if (index==-1) // 没找到
            		{
						tags.push(this.value);
            		}
            		else
            		{
            			tags.splice(index,1);
            		}
					inputTagElem.value = tags.join(";");
					if (this.style.color == "blue") 
					{
						this.style.color = "";
					}
					else
					{
						this.style.color = "blue";
					}
					
            	};
            	divTagList.appendChild(btns[i]);
            };
            // var inputTag = document.createElement("a");
            // divTag.appendChild(inputTag);
            // inputTag.style = "display:inline-block; width: 75%;";
            // inputTag.id = "editableTag";
            // $('#editableTag').editable({
            //     type: 'select2',
            //     title : "Enter Tags",
            //     select2: {
            //         placeholder: 'Enter Tags',
            //         width : "200px",
            //         tags: tagList,
            //         tokenSeparators: [",", " "],
            //         closeOnSelect: false
            //     }
            // });
        })
    .fail(
        function()
        {
            var inputTag = document.createElement("input");
            inputTag.style = "display:inline-block;; width: 75%;";
            divTag.appendChild(inputTag);
        });
            
    // description
    var divDesp = document.createElement("div");
    divDesp.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divDesp);
    var labelDesp = document.createElement("label");
    labelDesp.style = "display:inline-block; width: 20%;";
    labelDesp.innerHTML = "描述";
    divDesp.appendChild(labelDesp);
    var inputDesp = document.createElement("input");
    inputDesp.style = "display:inline-block;; width: 75%;";
    divDesp.appendChild(inputDesp);
    
    // 提交按钮
    var divBtn = document.createElement("div");
    divBtn.style = "text-align: right;";
    divAdd.appendChild(divBtn);
    var btnSubmit = document.createElement("input");
    divBtn.appendChild(btnSubmit);
    btnSubmit.value = "提交";
    btnSubmit.type = "button";
    btnSubmit.style = "display:inline-block;";
    btnSubmit.onclick = function()
    {
        var tagText = inputTag.value;
        var nameText = inputName.value;
        var urlText = inputUrl.value;
        var despText = inputDesp.value;
        validateBookmark(nameText, urlText, tagText, despText);
        var bookmark = {name:nameText, url:urlText, tag:tagText, description:despText};
        hideModalDialog();
        addBookmarkToTable(bookmark, 0);
        //makeTableEditable();
    };
    var btnQuit = document.createElement("input");
    divBtn.appendChild(btnQuit);
    btnQuit.value = "取消";
    btnQuit.type = "button";
    btnQuit.style = "display:inline-block;";
    btnQuit.onclick = hideModalDialog;
}

// 让表格变的可编辑
function makeTableEditable()
{
    $('.editable').editable(
    {
       type: 'text',
       value : '',
       mode : 'popup',
    });
}

// 清空表格
function clearTable()
{
    $("#bookmarksTable").remove();
}

// 验证输入
function validateBookmark(nameText, urlText, tagText, despText)
{
    if(nameText.toLowerCase() == "empty" )
    {
        nameText = "";
    }
    if(urlText.toLowerCase() == "empty" )
    {
        urlText = "";
    }
    if(tagText.toLowerCase() == "empty" )
    {
        tagText = "";
    }
    if(despText.toLowerCase() == "empty" )
    {
        despText = "";
    }
}

// 读表格内容
function getBookmarksFromTable()
{
    var table = $("#bookmarksTable")[0];
    var bm = [];
    for (var i = 0; i < table.rows.length; i++) 
    {  //遍历Table的所有Row
        var nameText = table.rows[i].cells[1].childNodes[0].innerHTML;
        var urlText = table.rows[i].cells[2].childNodes[0].innerHTML;
        var tagText = table.rows[i].cells[3].childNodes[0].innerHTML;
        var despText = table.rows[i].cells[4].childNodes[0].innerHTML;
        validateBookmark(nameText, urlText, tagText, despText);
        bm.push({name:nameText,url:urlText,tag:tagText,description:despText});
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
    	if (i%2 == 0) 
    	{
        	addBookmarkToTable(objBookmarks[i], -1);
    	}
    	else
    	{
			addBookmarkToTable(objBookmarks[i], -1);
    	}
    }
    //makeTableEditable();
}

// 表格添加一行
function addBookmarkToTable(bookmark, pos)
{
    var table = document.getElementById("bookmarksTable");
    var row = table.insertRow(pos);
    if (table.children[0].children.length%2==0)
    {
    	row.style.backgroundColor = "#D8D8EA";
    }
    row.addEventListener("click",modBookmark);
    //row.style.height = "10px";
    var checkCol = document.createElement("td");
    row.appendChild(checkCol);
    var check = document.createElement("input");
    checkCol.appendChild(check);
    check.type = "checkbox";
    for(item in bookmark)
    {
        var col = document.createElement("td");
        row.appendChild(col);
        var colDiv = document.createElement("div");
        col.appendChild(colDiv);
        colDiv.style.width = "200px";
        colDiv.style.wordWrap = "break-word";
        colDiv.innerHTML = bookmark[item];
        //col.style.width = "25%";
        //var colData = document.createElement("p");
        //col.appendChild(colData);
        //colData.innerHTML = bookmark[item];
        //colData.className = "editable";
    }
}

// 修改表格某一行的数据
function modBookmark(e)
{
	showModalDialog();    // 显示对话框
    
    var that  = this;
    var divAdd = document.createElement("div");
    $("#modal-data").append(divAdd);
    
    // title
    var title = document.createElement("p");
    title.innerHTML = "修改书签";
    divAdd.appendChild(title);
    
    
    // name
    var divName = document.createElement("div");
    divAdd.appendChild(divName);
    divName.style = "margin-top: 5px;margin-bottom: 5px;";
    var labelName = document.createElement("label");
    labelName.style = "display:inline-block; width: 20%;";
    labelName.innerHTML = "name";
    divName.appendChild(labelName);
    var inputName = document.createElement("input");
    inputName.style = "display:inline-block;; width: 75%;";
    inputName.value = this.children[1].children[0].innerHTML;
    divName.appendChild(inputName);
    
 	
    // url
    var divUrl = document.createElement("div");
    divUrl.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divUrl);
    var labelUrl = document.createElement("label");
    labelUrl.style = "display:inline-block; width: 20%;";
    labelUrl.innerHTML = "url";
    divUrl.appendChild(labelUrl);
    var inputUrl = document.createElement("input");
    inputUrl.style = "display:inline-block;; width: 75%;";
    inputUrl.value = this.children[2].children[0].innerHTML;
    divUrl.appendChild(inputUrl);
    
    // tag
    var divTag = document.createElement("div");
    divTag.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divTag);
    var labelTag = document.createElement("label");
    labelTag.style = "display:inline-block; width: 20%;";
    labelTag.innerHTML = "tag";
    divTag.appendChild(labelTag);
    var inputTag = document.createElement("input");
    inputTag.id = "inputTag";
    inputTag.style = "display:inline-block;; width: 75%;";
    inputTag.value = this.children[3].children[0].innerHTML;
    divTag.appendChild(inputTag);

    // description
    var divDesp = document.createElement("div");
    divDesp.style = "margin-top: 5px;margin-bottom: 5px;";
    divAdd.appendChild(divDesp);
    var labelDesp = document.createElement("label");
    labelDesp.style = "display:inline-block; width: 20%;";
    labelDesp.innerHTML = "描述";
    divDesp.appendChild(labelDesp);
    var inputDesp = document.createElement("input");
    inputDesp.style = "display:inline-block;; width: 75%;";
    inputDesp.value = this.children[4].children[0].innerHTML;
    divDesp.appendChild(inputDesp);


    // 确定按钮
    var divBtn = document.createElement("div");
    divBtn.style = "text-align: right;";
    divAdd.appendChild(divBtn);
    var btnSubmit = document.createElement("input");
    divBtn.appendChild(btnSubmit);
    btnSubmit.value = "确定";
    btnSubmit.type = "button";
    btnSubmit.style = "display:inline-block;";
    btnSubmit.onclick = function()
    {
    	that.children[1].children[0].innerHTML = inputName.value;
    	that.children[2].children[0].innerHTML = inputUrl.value;
    	that.children[3].children[0].innerHTML = inputTag.value;
    	that.children[4].children[0].innerHTML = inputDesp.value;
        hideModalDialog();
    };
    var btnQuit = document.createElement("input");
    divBtn.appendChild(btnQuit);
    btnQuit.value = "取消";
    btnQuit.type = "button";
    btnQuit.style = "display:inline-block;";
    btnQuit.onclick = hideModalDialog;
}

// 获取选定的行号
function getSelectedBookmarks()
{
    var selectedRow = [];
    var table = $("#bookmarksTable")[0];
    for(var i=0; i<table.rows.length; i++)
    {
        if(table.rows[i].cells[0].childNodes[0].checked == true)
        {
            selectedRow.push(i);
        }
    }
    return selectedRow;
}
