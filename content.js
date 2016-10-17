$(function(){
    var btn=$("<input type='button' id='ShowImageBtn' value='显示所有缩略图' style = 'position:absolute; left:600; top:10'>");
    $("body").append(btn);
    addBtnEvent("ShowImageBtn");
});
function addBtnEvent(id){
    $("#"+id).bind("click",function(){
    	var links = $('a');
		for (var i = links.length - 1; i >= 0; i--) {
			var patter = new RegExp("/video/2016");
			if (patter.test(links[i].href)) {
				console.log(links[i].href);
				ParseUrl(links[i].href);
    			//break;
			};
		};

    });
}	

function ParseUrl(url)
{

	$.ajax({  
        url: url,  
        type: 'GET',  
        dataType: 'html',  
        timeout: 10000,  //设定超时  
        cache: false,   //禁用缓存  
        error: function(data) {  
            console.log("加载" + url + "出错!");  
        },  
    	success: function(data){   //设置成功后回调函数  
    		var div = $('<div>');
	        div.html(data);
	        var content = div.find('a');
	        var patt1=new RegExp("115x65.jpg$");

	        for(var j =0; j<content.length; ++j){
	        	if (patt1.test(content[j].outerText)) {
	        		var str = '<a href="' + url + '"><img src="' + url + content[j].outerText + '" /></a>';
	        		//var str = '<img src="' + url + content[j].outerText + '" />';
	        		//console.log(str);
					var img=$(str);
				    $("body").append(img);
	        		break;
	        	};
	        }
    		//alert("加载html文档成功!");  
		}
	});
}