$(function(){
    var btn1=$("<input type='button' id='user1' value='用户1' style = 'position:absolute; left:600; top:10'>");
    $("body").append(btn1);
    addBtnEvent("user1", "220120965", "225810");
	
    var btn2=$("<input type='button' id='user2' value='用户2' style = 'position:absolute; left:600; top:40'>");
    $("body").append(btn2);
    addBtnEvent("user2", "220111023", "265073");
});

function addBtnEvent(id, name, pwd){
    $("#"+id).bind("click",function(){
    	var seu_login_name = document.getElementById("username_5");
		seu_login_name.value = name;
		var seu_login_password = document.getElementById("password_5");
		seu_login_password.value = pwd;
    });
}
