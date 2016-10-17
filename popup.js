// chrome.tabs.getSelected(null, function(tab){
//         //alert(tab.url);
//     $.get("http://www.baidu.com",function(data,status){
//     	alert("data:" + data);
//     });
// });
$(document).ready(function(){
  $("button").click(function(){
    $.get("082916communistparty4/",function(data,status){
      alert("数据：" + data + "\n状态：" + status);
    });
  });
});