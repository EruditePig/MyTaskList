

function insertAfter(newEl, targetEl)
{
      var parentEl = targetEl.parentNode;

      if(parentEl.lastChild == targetEl)
      {
           parentEl.appendChild(newEl);
      }else
      {
           parentEl.insertBefore(newEl,targetEl.nextSibling);
      }            
}

// 查找词源
function searchOnEtyonline()
{
    var queryWord = document.getElementById("query");
    
    $.get("http://www.etymonline.com/index.php?allowed_in_frame=0&search=" + queryWord.value, function(result){
        var parser = new DOMParser();       // 解析html字符串
        htmlDoc = parser.parseFromString(result, "text/html");
        var dds = htmlDoc.getElementsByTagName("dd");
        
        // 显示查找词源结果
        var sideBar = document.getElementById("follow");
        sideBar.innerHTML = dds[0].innerHTML;
    });
}

window.onload = function()
{
    // 删除有道的logo
    var logo = document.getElementsByClassName("c-logo");
    logo[0].parentNode.removeChild(logo[0]);
    
    // 添加查找词源按钮
    var btnEty = document.createElement("input");
    btnEty.type = "button";
    btnEty.id = "searchOnEtyonline";
    btnEty.value = '词源';
    btnEty.className  = "s-btn";
    btnEty.onclick = searchOnEtyonline;
    var sibling = document.getElementsByClassName("s-btn");
    insertAfter(btnEty, sibling[0]);
    
}