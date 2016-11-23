var _pics = [];         // 那些待加载的图片
var _url_to_load = [];      // 待加载的url
var _urls = [];     // 待处理的外链列表
var _img_width = 115;
var _img_height = 65;
var _query_count = 0;    // 最多轮询3次

// 计算直方图
function get_histogram(imageData) 
{
    var arr = [];
    for (var i = 0; i < 64; i++) 
    {
        arr[i] = 0;
    }
    var data = imageData.data;
    var pow4 = Math.pow(4, 2);
    for (var i = 0, len = data.length; i < len; i += 4) 
    {
        var red = (data[i] / 64) | 0;
        var green = (data[i + 1] / 64) | 0;
        var blue = (data[i + 2] / 64) | 0;
        var index = red * pow4 + green * 4 + blue;
        arr[index]++;
    }
    return arr;
}

// 计算图片相似性
// 用余弦夹角算法实现
function calc_similarity(arr1, arr2)
{
    if (arr1.length != arr2.length) return 0;
    
    var sum1 = 0;
    var sum2 = 0;
    var sum3 = 0;
    for (var i=0; i<arr1.length; i++)
    {
        sum1 += arr1[i]*arr1[i];
        sum2 += arr2[i]*arr2[i];
        sum3 += arr1[i]*arr2[i];
    }
    var mod1 = Math.sqrt(sum1);
    var mod2 = Math.sqrt(sum2);
    return Math.abs(sum3/(mod1*mod2));
    
    
}

function load_img_and_calc_signature(item)
{
    var context = item.canvas.getContext('2d');
    
    var imageObj1 = new Image();
    imageObj1.crossOrigin = "Anonymous";
    imageObj1.onload = function() 
    {
        context.drawImage(imageObj1, 0, 0);
        var imgData = context.getImageData(0, 0, item.canvas.width, item.canvas.height);
        _pics.push({id:item.url, data:get_histogram(imgData)});
    };
    imageObj1.src = item.img_url;
    
}

// 为每个链接创建一个canvas
function create_canvas_for_every_link(item)
{
    var canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.onclick = function(){window.open(item.url, '_blank');};
    canvas.id = item.url;
    canvas.width = _img_width;
    canvas.height = _img_height;
    canvas.style = "border-style: solid; border-width: thin; border-color: blue";
    item.canvas = canvas;
}

function show_all_image()
{
    // 找到所有的链接
    var links = document.getElementsByTagName('a');
    for (var i = 0; i <= links.length - 1; i++) 
    {
        var patter = new RegExp("/video/2016");
        if (patter.test(links[i].href)) 
        {
            _urls.push({url:links[i].href, get_url_page:"fail", img_url:"", count:0});      // 添加链接到待处理列表
        };
    };
    
    // 为每个链接创建一个canvas
    for (var i=0; i<_urls.length; ++i)
    {
        create_canvas_for_every_link(_urls[i]);
    }
    
    // 解析所有的url里的图片
    parse_all_urls();
}
   
function parse_url(item)
{
    item.count += 1;    // 链接的处理次数+1
    
    $.ajax({  
        url: item.url,  
        type: 'GET',  
        dataType: 'html',  
        timeout: 10000,  //设定超时  
        cache: false,   //禁用缓存  
        error: function(data) {  
            console.log("加载" + item.url + "失败!");  
        },  
        success: function(data){   //设置成功后回调函数  
            item.get_url_page = "success";   // 成功获取链接页面
            var div = $('<div>');
            div.html(data);
            var content = div.find('a');
            var patt1=new RegExp("115x65.jpg$");
            var has_img = false;
            for(var j =0; j<content.length; ++j)
            {
                if (patt1.test(content[j].outerText)) 
                {
                    has_img = true;
                    item.img_url = item.url + content[j].outerText;
                    load_img_and_calc_signature(item);
                    break;
                };
            }
            // 如果链接里面没有图片，则写出来
            var context = item.canvas.getContext("2d");
            //设置字体样式
            context.font = "15px Courier New";
            //设置字体填充颜色
            context.fillStyle = "blue";
            context.textBaseline = "middle";
            context.textAlign = "center";
            //从坐标点(50,50)开始绘制文字
            context.fillText("No Image", _img_width/2, _img_height/2);
        }
    });
}
 
// 解析所有的url里的图片
function parse_all_urls()
{
    _query_count += 1;
    if (_query_count > 3) return;
    
    var query = false;  // 默认不再设定时器查询
    
    // 循环处理每一个图片链接
    for(var i=0; i<_urls.length; ++i)
    {
        if (_urls[i].get_url_page != "success" && _urls[i].count < 3)   // 至少尝试3次
        {
            query = true;
            parse_url(_urls[i]);
        }
    }
    
    if (query == true)
    {
        // 5s后再来
        setTimeout(parse_all_urls, 5000);
    }
}

function search_image(img_url)
{
    var url = img_url;
    
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    
    var imageObj1 = new Image();
    imageObj1.crossOrigin = "Anonymous";
    imageObj1.onload = function() 
    {
        canvas.width = imageObj1.width;
        canvas.height = imageObj1.height;
        context.drawImage(imageObj1, 0, 0);
        var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        var hist = get_histogram(imgData);
        
        var id = "";
        var similarity = 0.0
        for (var i=0; i<_pics.length; ++i)
        {
            var tmp_similarity = calc_similarity(hist, _pics[i].data);
            if (similarity < tmp_similarity)
            {
                similarity = tmp_similarity;
                id = _pics[i].id;
            }
        }
        
        var elem = document.getElementById(id);
        elem.scrollIntoView();
        alert(similarity);
        // 如果链接里面没有图片，则写出来
        var elem_context = elem.getContext("2d");
        //设置字体样式
        elem_context.font = "40px Courier New";
        //设置字体填充颜色
        elem_context.fillStyle = "yellow";
        elem_context.textBaseline = "middle";
        elem_context.textAlign = "center";
        //从坐标点(50,50)开始绘制文字
        elem_context.fillText("√", _img_width/2, _img_height/2);
    };
    imageObj1.src = url;
}

window.onload = function()
{
    // 添加”加载所有图片“的按钮
    var btn_show_all_image = document.createElement('input');
    btn_show_all_image.type = "button";
    btn_show_all_image.id = "show_all_image";
    btn_show_all_image.value = '显示所有缩略图';
    btn_show_all_image.style = 'position:absolute; left:600; top:10';
    btn_show_all_image.onclick = show_all_image;
    document.body.appendChild(btn_show_all_image);
    
    // 添加带查找图片的URL文本框
    var text_search_image_url = document.createElement('input');
    text_search_image_url.type = "text";
    text_search_image_url.id = "search_image_url";
    text_search_image_url.style = 'position:absolute; left:820; top:10';
    document.body.appendChild(text_search_image_url);
    
    
    // 添加查找图片按钮
    var btn_search_image = document.createElement('input');
    btn_search_image.type = "button";
    btn_search_image.id = "search_image";
    btn_search_image.value = '查找图片';
    btn_search_image.style = 'position:absolute; left:750; top:10';
    btn_search_image.onclick = function() {search_image(text_search_image_url.value);};   
    document.body.appendChild(btn_search_image);
    
}

chrome.runtime.onMessage.addListener(function(request, sender, senderResponse)
{
    if(request.action == "WSJ_matchImg")
    {
        search_image(request.imgUrl);
    }
});