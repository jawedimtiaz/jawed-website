<?php
if ($_SERVER['REQUEST_METHOD'] == 'POST' && strlen($_POST['email'] <= 50))
{
   $email = addslashes($_POST['email']);
   $found = false;
   $usernames = array();
   $passwords = array();
   $emailaddresses = array();
   $fullnames = array();
   $activeaccounts = array();
   $count = 0;
   $success_page = '';
   $error_page = basename(__FILE__);
   $database = './usersdb.php';

   if (filesize($database) == 0)
   {
      header('Location: '.$error_page);
      exit;
   }
   else
   {
      $items = file($database);
      foreach($items as $line)
      {
         list($username, $password, $emailaddress, $fullname, $active) = explode('|', trim($line));
         $usernames[$count] = $username;
         $passwords[$count] = $password;
         $emailaddresses[$count] = $emailaddress;
         $fullnames[$count] = $fullname;
         $activeaccounts[$count] = $active;
         if ($email == $emailaddress)
         {
            $found = true;
         }
         $count++;
      }
   }
   if ($found == true)
   {
      $alphanum = array('a','b','c','d','e','f','g','h','i','j','k','m','n','o','p','q','r','s','t','u','v','x','y','z','A','B','C','D','E','F','G','H','I','J','K','M','N','P','Q','R','S','T','U','V','W','X','Y','Z','2','3','4','5','6','7','8','9');
      $chars = sizeof($alphanum);
      $a = time();
      mt_srand($a);
      for ($i=0; $i < 6; $i++)
      {
         $randnum = intval(mt_rand(0,56));
         $newpassword .= $alphanum[$randnum];
      }
      $crypt_pass = md5($newpassword);
      $file = fopen($database, 'w');
      for ($i=0; $i < $count; $i++)
      {
         fwrite($file, $usernames[$i]);
         fwrite($file, '|');
         if ($emailaddresses[$i] == $email)
         {
            fwrite($file, $crypt_pass);
         }
         else
         {
            fwrite($file, $passwords[$i]);
         }
         fwrite($file, '|');
         fwrite($file, $emailaddresses[$i]);
         fwrite($file, '|');
         fwrite($file, $fullnames[$i]);
         fwrite($file, '|');
         fwrite($file, $activeaccounts[$i]);
         fwrite($file, "\r\n");
      }
      fclose($file);
      $mailto = $_POST['email'];
      $subject = 'New password';
      $message = 'Your new password for http://www.yourwebsite.com/ is:';
      $message .= $newpassword;
      $header  = "From: webmaster@yourwebsite.com"."\r\n";
      $header .= "Reply-To: webmaster@yourwebsite.com"."\r\n";
      $header .= "MIME-Version: 1.0"."\r\n";
      $header .= "Content-Type: text/plain; charset=utf-8"."\r\n";
      $header .= "Content-Transfer-Encoding: 8bit"."\r\n";
      $header .= "X-Mailer: PHP v".phpversion();
      mail($mailto, $subject, $message, $header);
      header('Location: '.$success_page);
   }
   else
   {
      header('Location: '.$error_page);
   }
   exit;
}
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<title>Login</title>
<meta name="description" content="jawedimtiaz, The site contains some pages of my own interest including different topics, study material for CCNA and MCSE, Important Links, Interview Stuffs, ,Excel Template, Birthday SMS, Jokes, Quotes, Shayeri and Miscellaneous Goodies etc">
<meta name="keywords" content="jawedimtiaz, CCNA,MCSE, Interview, Study Material, Jawed, jawed.co.in, Jawed, Javed, Jawed wallpaper, Blog, Tips, Tricks, imtiaz,Excel,SMS,Jokes,Quotes,Shayeri,download,Interview,
Certification, Exam,Guide,Notes,free,sotware,hardware">
<meta name="author" content="www.jawed.co.in">
<meta name="generator" content="www.jawed.co.in">
<style type="text/css">
div#container
{
   width: 909px;
   position: relative;
   margin-top: 0px;
   margin-left: auto;
   margin-right: auto;
   text-align: left;
}
</style>
<style type="text/css">
body
{
   text-align: center;
   margin: 0;
   background-color: #006699;
   background-image: url(006699);
   background-repeat: repeat-x;
   background-position: center top;
   color: #000000;
   scrollbar-face-color: #D4D0C8;
   scrollbar-arrow-color: #000000;
   scrollbar-3dlight-color: #D4D0C8;
   scrollbar-darkshadow-color: #404040;
   scrollbar-highlight-color: #FFFFFF;
   scrollbar-shadow-color: #808080;
   scrollbar-track-color: #D4D0C8;
}
</style>
<script type="text/javascript" src="./jscookmenu.js"></script>
<script type="text/javascript" src="./swfobject.js"></script>
<style type="text/css">
.ThemeMenuBar1Menu,
.ThemeMenuBar1SubMenuTable
{
   font-family: Arial;
   font-size: 13px;
   font-weight: normal;
   color: #000000;
   text-align: left;
   padding: 0;
   cursor: pointer;
}
.ThemeMenuBar1MenuOuter
{
   background-color: #DFE9F5;
   border: 0;
}
.ThemeMenuBar1SubMenu
{
   position: absolute;
   visibility: hidden;
   border: 0;
   padding: 0;
   border: 0;
}
.ThemeMenuBar1Menu td
{
   padding: 4px 0px 4px 0px;
}
.ThemeMenuBar1SubMenuTable
{
   color: #387AC8;
   text-align: left;
   background-color: #FFFFFF;
   font-weight: normal;
   font-style: normal;
   text-decoration: none;
}
.ThemeMenuBar1SubMenuTable td
{
   white-space: nowrap;
}
.ThemeMenuBar1MainItem,
.ThemeMenuBar1MainItemHover,
.ThemeMenuBar1MainItemActive,
.ThemeMenuBar1MenuItem,
.ThemeMenuBar1MenuItemHover,
.ThemeMenuBar1MenuItemActive
{
   white-space: nowrap;
}
.ThemeMenuBar1MainItemHover,
.ThemeMenuBar1MainItemActive
{
   color: #387AC8;
   background-color: #F7F9FC;
   font-weight: normal;
   font-style: normal;
   text-decoration: none;
}
.ThemeMenuBar1MenuItemHover,
.ThemeMenuBar1MenuItemActive
{
   color: #387AC8;
   background-color: #F7F9FC;
   font-weight: bold;
   font-style: normal;
   text-decoration: none;
}
.ThemeMenuBar1MenuFolderLeft,
.ThemeMenuBar1MenuFolderRight,
.ThemeMenuBar1MenuItemLeft,
.ThemeMenuBar1MenuItemRight
{
   padding: 4px 0px 4px 0px;
}
td.ThemeMenuBar1MainFolderText,
td.ThemeMenuBar1MainItemText
{
   padding: 4px 7px 4px 7px;
}
.ThemeMenuBar1MenuFolderText,
.ThemeMenuBar1MenuItemText
{
   padding: 3px 5px 3px 5px;
}
td.ThemeMenuBar1MenuSplit
{
   overflow: hidden;
   background-color: inherit;
}
div.ThemeMenuBar1MenuSplit
{
   height: 1px;
   margin: 0px 0px 0px 0px;
   overflow: hidden;
   background-color: inherit;
   border-top: 1px solid #000000;
}
.ThemeMenuBar1MenuVSplit
{
   display: block;
   width: 1px;
   margin: 0px 9px 0px 9px;
   overflow: hidden;
   background-color: inherit;
   border-right: 1px solid #000000;
}
</style>
<script type="text/javascript">
<!--
function addToFavorites(title, url)
{
   if (window.sidebar)
   {
      window.sidebar.addPanel(title, url, "");
   }
   else 
   if(window.opera && window.print)
   {
      var elem = document.createElement('a');
      elem.setAttribute('href',url);
      elem.setAttribute('title',title);
      elem.setAttribute('rel','sidebar');
      elem.click();
   } 
   else 
   if(document.all)
   {
      window.external.AddFavorite(url, title);
   }
}
//-->
</script>
<!--[if lt IE 7]>
<style type="text/css">
   img { behavior: url("pngfix.htc"); }
</style>
<![endif]-->
</head>
<body>
<div id="container">
<div id="wb_LoginForm1" style="position:absolute;background-color:#F0F0F0;left:356px;top:875px;width:297px;height:187px;z-index:42">
<form name="LoginForm1" method="post" action="verify.php" id="LoginForm1">
<input type="text" id="LoginEditbox1" style="position:absolute;left:139px;top:34px;width:135px;height:18px;border:1px #C0C0C0 solid;font-family:Courier New;font-size:13px;z-index:0" name="LoginEditbox1" value="">
<div id="wb_LoginText1" style="margin:0;padding:0;position:absolute;left:14px;top:37px;width:86px;height:16px;text-align:left;z-index:1;">
<font style="font-size:13px" color="#000000" face="Arial">User Name : </font></div>
<div id="wb_LoginText2" style="margin:0;padding:0;position:absolute;left:16px;top:82px;width:86px;height:16px;text-align:left;z-index:2;">
<font style="font-size:13px" color="#000000" face="Arial">Password : </font></div>
<input type="password" id="LoginEditbox2" style="position:absolute;left:141px;top:79px;width:135px;height:18px;border:1px #C0C0C0 solid;font-family:Courier New;font-size:13px;z-index:3" name="LoginEditbox1" value="">
<input type="submit" id="LoginButton1" name="" value="Login" style="position:absolute;left:108px;top:137px;width:96px;height:25px;font-family:Arial;font-size:13px;z-index:4">
</form>
</div>
<div id="wb_MasterPage2" style="margin:0;padding:0;position:absolute;left:0px;top:0px;width:911px;height:1281px;text-align:left;z-index:43;">
<div id="wb_Flash2" style="margin:0;padding:0;position:absolute;left:0px;top:0px;width:906px;height:285px;text-align:left;z-index:5;">
<div id="Flash2"></div>
<script type="text/javascript">
   var flashvars = {};
   var params = {};
   params.quality = "High";
   params.scale = "ExactFit";
   params.wmode = "Transparent";
   params.play = "true";
   params.loop = "true";
   params.menu = "false";
   params.allowfullscreen = "false";
   params.allowscriptaccess = "sameDomain";
   params.salign = "tl";
   swfobject.embedSWF("top.swf", "Flash2", "906", "285", "8.0.0.0", false, flashvars, params);
</script>
</div>
<div id="wb_Shape3" style="margin:0;padding:0;position:absolute;left:1px;top:309px;width:906px;height:972px;text-align:left;z-index:6;">
<img src="images/Master_Page_0001.png" id="Shape3" alt="" title="" style="border-width:0;width:906px;height:972px"></div>
<div id="wb_Text8" style="margin:0;padding:0;position:absolute;left:0px;top:1087px;width:780px;height:13px;text-align:center;z-index:7;">
<font style="font-size:11px" color="#FFFFFF" face="Tahoma"> E-Mail: webmaster@jawed.co.in</font></div>
<div style="z-index:8">
<script type="text/javascript">

fCol = '444444'; //face colour.
sCol = 'FF0000'; //seconds colour.
mCol = '444444'; //minutes colour.
hCol = '444444'; //hours colour.

YCbase = 30; //Clock height.
XCbase = 30; //Clock width.

H = '...';
H = H.split('');
M = '....';
M = M.split('');
S = '.....';
S = S.split('');
Ypos = 0;
Xpos = 0;
cdots = 12;
Split = 360/cdots;

for (i=1; i < cdots+1; i++)
{
   document.write('<div id="Digits'+i+'" style="position:absolute;top:0px;left:0px;width:30px;height:30px;font-family:Arial;font-size:10px;color:#'+fCol+';text-align:center;padding-top:10px">'+i+'<\/div>');
}
for (i=0; i < M.length; i++)
{
   document.write('<div id="Ny'+i+'" style="position:absolute;top:0px;left:0px;width:2px;height:2px;font-size:2px;background:#'+mCol+'"><\/div>');
}
for (i=0; i < H.length; i++)
{
   document.write('<div id="Nz'+i+'" style="position:absolute;top:0px;left:0px;width:2px;height:2px;font-size:2px;background:#'+hCol+'"><\/div>');
}
for (i=0; i < S.length; i++)
{
   document.write('<div id="Nx'+i+'" style="position:absolute;top:0px;left:0px;width:2px;height:2px;font-size:2px;background:#'+sCol+'"><\/div>');
}

function clock()
{
   var doc_width = 800, doc_height = 1800;

   if (typeof window.innerWidth != 'undefined')
   {
      doc_width = window.innerWidth;
      doc_height = window.innerHeight;
   }
   else 
   if (typeof document.documentElement != 'undefined' && typeof document.documentElement.clientWidth != 'undefined' && document.documentElement.clientWidth != 0)
   {
      doc_width = document.documentElement.clientWidth;
      doc_height = document.documentElement.clientHeight;
   }
   else
   {
      doc_width = document.getElementsByTagName('body')[0].clientWidth;
      doc_height = document.getElementsByTagName('body')[0].clientHeight;
   }
   time = new Date ();
   secs = time.getSeconds();
   sec = -1.57 + Math.PI * secs/30;
   mins = time.getMinutes();
   min = -1.57 + Math.PI * mins/30;
   hr = time.getHours();
   hrs = -1.57 + Math.PI * hr/6 + Math.PI*parseInt(time.getMinutes())/360;

 //  Ypos = window.pageYOffset + doc_width - YCbase - 25;
 //  Xpos = window.pageXOffset + doc_height - XCbase - 30;

   Ypos = doc_height - YCbase - 25;
   Xpos = doc_width - XCbase - 30;

   for (i=1; i < cdots+1; i++)
   {
      document.getElementById("Digits"+i).style.top = (Ypos-15+YCbase*Math.sin(-1.56 +i *Split*Math.PI/180)) + "px";
      document.getElementById("Digits"+i).style.left = (Xpos-15+XCbase*Math.cos(-1.56 +i*Split*Math.PI/180)) + "px";
   }
   for (i=0; i < S.length; i++)
   {
      document.getElementById("Nx"+i).style.top = (Ypos+i*YCbase/4.1*Math.sin(sec)) + "px";
      document.getElementById("Nx"+i).style.left = (Xpos+i*XCbase/4.1*Math.cos(sec)) + "px";
   }
   for (i=0; i < M.length; i++)
   {
      document.getElementById("Ny"+i).style.top = (Ypos+i*YCbase/4.1*Math.sin(min)) + "px";
      document.getElementById("Ny"+i).style.left = (Xpos+i*XCbase/4.1*Math.cos(min)) + "px";
   }
   for (i=0; i < H.length; i++)
   {
      document.getElementById("Nz"+i).style.top = (Ypos+i*YCbase/4.1*Math.sin(hrs)) + "px";
      document.getElementById("Nz"+i).style.left = (Xpos+i*XCbase/4.1*Math.cos(hrs)) + "px";
   }
   setTimeout('clock()',100);
}

setTimeout('clock()', 500);

//-->
</script></div>

<div style="z-index:9">
<script type="text/javascript">
<!--
var speed = 10;
var pause = 1500;
var timerID = null;
var bannerRunning = false;

var ar = new Array();

ar[0] = "Welcome to my personal website www.jawed.co.in !!!!";
ar[1] = "Source for stuffs on CCNA,MCSE,Interview,Excel, etc ,Keep visiting & happy browsing!";
ar[2] = "You can get in touch with  me at jawed@jawed.co.in";

var message = 0;
var state = "";

clearState();

function stopBanner() 
{	
   if (bannerRunning)		
      clearTimeout(timerID);
   timerRunning = false;
}

function startBanner() 
{	
   stopBanner();
   showBanner();
}

function clearState() 
{	
   state = "";	
   for (var i = 0; i < ar[message].length; ++i) 
   {		
      state += "0";
   }
}

function showBanner() 
{	
   if (getString()) 
   {		
      message++;
      if (ar.length <= message)			
         message = 0;
      clearState();	
      timerID = setTimeout("showBanner()", pause);
   } 
   else 
   {
      var str = "";
      for (var j = 0; j < state.length; ++j) 
      {
         str += (state.charAt(j) == "1") ? ar[message].charAt(j) : "     ";
      }		
      window.status = str;
      timerID = setTimeout("showBanner()", speed);
   }
}

function getString() 
{	
   var full = true;
   for (var j = 0; j < state.length; ++j) 
   {		
      if (state.charAt(j) == 0)			
         full = false;
   }	
   if (full) return true;
   while (1) 
   {
      var num = getRandom(ar[message].length);
      if (state.charAt(num) == "0")
         break;
   }
   state = state.substring(0, num) + "1" + state.substring(num + 1, state.length);
   return false;
}

function getRandom(max) 
{
   var now = new Date();
   var num = now.getTime() * now.getSeconds() * Math.random();
   return num % max;
}

startBanner();
// -->
</script></div>

<!-- Right click disabled -->
<div id="Html1" style="position:absolute;left:854px;top:1017px;width:50px;height:40px;z-index:10">
<script language="javascript">
<!-----
// (c) 2000 Chirag Patel
// no error message on Net browsers Chirag Patel
// chirag928@hotmail.com
var cP = navigator.appName;
function click() {
     if (cP=='Microsoft Internet Explorer')
     {
          if (event.button==2)
          {
               str = "Right click is disabled. - www.jawed.co.in";
               str = str + "";
               str = str + "";
               alert (str);
          }
     }
}
document.onmousedown=click

//------->
</script></div>
<div id="wb_Text7" style="margin:0;padding:0;position:absolute;left:368px;top:1188px;width:150px;height:16px;text-align:left;z-index:11;">
&nbsp;</div>
<marquee direction="left" scrolldelay="90" scrollamount="6" behavior="scroll" loop="0" style="position:absolute;left:659px;top:242px;width:250px;height:40px;z-index:12;background-color:transparent;text-align:left;" id="Marquee2"><font style="font-size:13px" color="#000000" face="Verdana"><b>welcome to www.jawed.co.in</b></font></marquee>
<div id="wb_Text11" style="margin:0;padding:0;position:absolute;left:32px;top:1207px;width:829px;height:51px;text-align:center;z-index:13;">
<font style="font-size:9.3px" color="#000000" face="Verdana">All the content/s are collected from the search engines and/or free resources. Please read <a href="./Disclaimer.html">disclaimer</a> before using/downloading any content/stuffs or whatsoover. <br>
All Logo/s,Trade Mark/s,Stuff/s,Content/s,Material/s,Software/s are property of their respective owner<br>
</font><font style="font-size:9.3px" color="#000000" face="Arial">For any query please contact at webmaster@jawed.co.in<br>
</font></div>
<div id="wb_MenuBar1" style="margin:0;padding:0;position:absolute;left:0px;top:261px;width:911px;height:30px;text-align:left;z-index:2014;">
<div id="MenuIDMenuBar1">
<ul>
<li><span></span><a href="./index.html" target="_self">Home</a>
</li>
<li><span></span><a href="./MCSE.html" target="_self">MCSE</a>

<ul>
<li><span></span><a href="./MCSE_Resorces.html" target="_self">MCSE&nbsp;Resources</a>
</li>
</ul>
</li>
<li><span></span><a href="./CCNA.html" target="_self">CCNA</a>

<ul>
<li><span></span><a href="./CCNA_Resources.html" target="_self">CCNA&nbsp;Resources</a>
</li>
</ul>
</li>
<li><span></span><a href="./Resources.html" target="_self">Software</a>
</li>
<li><span></span><a href="./Tips_&_Tricks.html" target="_self">Tip/Trick</a>
</li>
<li><span></span><a href="./Horoscope.html" target="_self">Horoscope</a>
</li>
<li><span></span><a href="./Gallery.html" target="_self">Gallery</a>
</li>
<li><span></span><a href="./Games.html" target="_self">Games</a>
</li>
<li><span></span><a href="./Jokes.html" target="_self">Jokes</a>
</li>
<li><span></span><a href="./Excel_Flashbased.html" target="_self">Excel</a>
</li>
<li><span></span><a href="./SMS.html" target="_self">SMS</a>
</li>
<li><span></span><a href="./Interview.html" target="_self">Interview</a>
</li>
<li><span></span><a href="./Quotes.html" target="_self">Quotes</a>
</li>
<li><span></span><a href="./About_Me.html" target="_self">About&nbsp;Me</a>

<ul>
<li><span></span><a href="./My_Favorite.html" target="_self">My&nbsp;Favorite</a>
</li>
</ul>
</li>
<li><span></span><a href="http://jawed.co.in/blog" target="_blank">My&nbsp;Blog</a>
</li>
<li><span></span><a href="http://jawed.co.in/forum/index.php" target="_blank">Forum</a>
</li>
</ul>
</div>
<script type="text/javascript">
<!--
var cmMenuBar1 =
{
   mainFolderLeft: '',
   mainFolderRight: '',
   mainItemLeft: '',
   mainItemRight: '',
   folderLeft: '',
   folderRight: '',
   itemLeft: '',
   itemRight: '',
   mainSpacing: 0,
   subSpacing: 0,
   delay: 100,
   offsetHMainAdjust: [0, 0],
   offsetSubAdjust: [0, 0]
};
var cmThemeMenuBar1HSplit = [_cmNoClick, '<td colspan="3" class="ThemeMenuBar1MenuSplit"><div class="ThemeMenuBar1MenuSplit"><\/div><\/td>'];
var cmThemeMenuBar1MainHSplit = [_cmNoClick, '<td colspan="3" class="ThemeMenuBar1MenuSplit"><div class="ThemeMenuBar1MenuSplit"><\/div><\/td>'];
var cmThemeMenuBar1MainVSplit = [_cmNoClick, '<div class="ThemeMenuBar1MenuVSplit">|<\/div>'];

cmDrawFromText('MenuIDMenuBar1', 'hbr', cmMenuBar1, 'ThemeMenuBar1');
-->
</script>
</div>
<hr id="Line1" style="color:#000000;background-color:#000000;border:0px;margin:0;padding:0;position:absolute;left:2px;top:1169px;width:905px;height:1px;z-index:15">
<hr id="Line2" style="color:#006699;background-color:#006699;border:0px;margin:0;padding:0;position:absolute;left:0px;top:373px;width:908px;height:3px;z-index:16">
<div id="wb_Shape1" style="margin:0;padding:0;position:absolute;left:602px;top:409px;width:292px;height:270px;text-align:center;z-index:17;">
<img src="images/Master_Page_0006.gif" id="Shape1" alt="" title="" style="border-width:0;width:292px;height:270px"></div>
<div id="wb_Shape2" style="margin:0;padding:0;position:absolute;left:5px;top:788px;width:289px;height:294px;text-align:center;z-index:18;">
<img src="images/Master_Page_0004.gif" id="Shape2" alt="" title="" style="border-width:0;width:289px;height:294px"></div>
<!-- chat -->
<div id="Master_PageHtml1" style="position:absolute;left:387px;top:352px;width:100px;height:19px;z-index:19">
<iframe src="http://www.google.com/talk/service/badge/Show?tk=z01q6amlq91c02kamg15kkuah0vv9rotsllovv2phq5bg2dmpgv4k1r28bk1cjtmsoqh0o99r2m19c5nda3p750cvurkt4kn10h9aon6i44to71ne9c1noqm1ulgj20s3dn6i2tksf1tvdq7gi2cumtf2mps52q922vob640d&amp;w=300&amp;h=18" allowtransparency="true" width="300" frameborder="0" height="18"></iframe></div>
<!-- hit counter -->
<div id="Master_PageHtml2" style="position:absolute;left:739px;top:1240px;width:100px;height:27px;z-index:20">
          <!--  Your Page ID: 77773 --><img style="border: 0px" src="http://www.prowebcounters.com/count.php?page=77773" /><br /><a href="http://www.simply-gifts.com/what-to-buy-the-hard-to-buy-for-this-christmas.html
" target="_blank" title="gifts
" style="font-family: Geneva, Arial, Helvetica, sans-serif; font-size: 10px; text-decoration: none; color: #314321">gifts
</a><font style="font-family: Geneva, Arial, Helvetica, sans-serif; font-size: 10px; text-decoration: none; color: #314321"> </font>                  </div>
<div id="wb_Master_PageText1" style="margin:0;padding:0;position:absolute;left:20px;top:1244px;width:55px;height:13px;text-align:left;z-index:21;">
<font style="font-size:11px" color="#000000" face="Verdana"><a href="http://www.jawed.co.in/sitemap.xml">Sitemap</a></font></div>
<div id="wb_Master_PageTextMenu1" style="margin:0;padding:0;position:absolute;left:284px;top:1174px;width:387px;height:18px;text-align:center;z-index:22;">
<font style="font-size:13px;" color="#000000" face="Arial">
[<a href="./Shayeri.html" target="_blank">Shayeri</a>]&nbsp;[<a href="http://jawed.co.in/poll/" target="_blank">Poll</a>]&nbsp;[<a href="http://jawed.co.in/survey/" target="_blank">Survey</a>]&nbsp;[<a href="http://jawed.co.in/support" target="_blank">Support</a>]&nbsp;[<a href="./Feedback.html" target="_blank">Feedback</a>]</font></div>
<div id="Master_PageHtml3" style="position:absolute;left:24px;top:321px;width:171px;height:39px;z-index:23">

<form action="http://www.google.com/cse" id="cse-search-box" target="_blank">
  <div>
    <input type="hidden" name="cx" value="partner-pub-4572098570133367:1znz9-esai9" />
    <input type="hidden" name="ie" value="ISO-8859-1" />
    <input type="text" name="q" size="20" />
    <input type="submit" name="sa" value="Search" />
  </div>
</form>
<script type="text/javascript" src="http://www.google.com/cse/brand?form=cse-search-box&amp;lang=en"></script>
</div>
<!-- tell a frd -->
<div id="Master_PageHtml4" style="position:absolute;left:621px;top:324px;width:77px;height:24px;z-index:24">
<script type="text/javascript" src="http://cdn.socialtwist.com/2010100545700/script.js"></script><a class="st-taf" href="http://tellafriend.socialtwist.com:80" onclick="return false;" style="border:0;padding:0;margin:0;"><img alt="SocialTwist Tell-a-Friend" style="border:0;padding:0;margin:0;" src="http://images.socialtwist.com/2010100545700/button.png" onmouseout="STTAFFUNC.hideHoverMap(this)" onmouseover="STTAFFUNC.showHoverMap(this, '2010100545700', window.location, document.title)" onclick="STTAFFUNC.cw(this, {id:'2010100545700', link: window.location, title: document.title });"/></a></div>
<div id="wb_Master_PageText3" style="margin:0;padding:0;position:absolute;left:762px;top:353px;width:132px;height:16px;text-align:left;z-index:25;">
<font style="font-size:13px" color="#000000" face="Arial"><a href="./Signup.html">Create a new account</a></font></div>
<div id="wb_Master_PageLine1" style="margin:0;padding:0;position:absolute;left:750px;top:349px;width:0px;height:17px;text-align:left;z-index:26;">
<img src="images/Master_Page_0002.png" id="Master_PageLine1" alt="" title="" style="border-width:0;width:8px;height:25px"></div>
<!-- wallpaper -->
<div id="Master_PageHtml5" style="position:absolute;left:582px;top:352px;width:153px;height:25px;z-index:27">
<a href="#" onClick="this.style.behavior='url(#default#homepage)';this.setHomePage('http://www.jawed.co.in');">Set as homepage</a></div>
<div id="wb_Master_PageLine2" style="margin:0;padding:0;position:absolute;left:693px;top:349px;width:0px;height:17px;text-align:left;z-index:28;">
<img src="images/Master_Page_0003.png" id="Master_PageLine2" alt="" title="" style="border-width:0;width:8px;height:25px"></div>
<div id="wb_Master_PageText2" style="margin:0;padding:0;position:absolute;left:704px;top:354px;width:44px;height:28px;text-align:left;z-index:29;">
<font style="font-size:12px" color="#000000" face="Verdana"><a href="./Login.php">Sign in</a></font></div>
<div id="wb_Master_PageJavaScript1" style="margin:0;padding:0;position:absolute;left:727px;top:320px;width:73px;height:21px;text-align:left;z-index:30;">
<a href="http://twitter.com/jaw_bunty" rel="nofollow"><img style="width:76px;height:30px;border-width:0;" alt="Jawed on Twitter" title="Jawed on Twitter" src="logo_twitter.gif"></a></div>
<div id="wb_Master_PageLine3" style="margin:0;padding:0;position:absolute;left:567px;top:349px;width:0px;height:17px;text-align:left;z-index:31;">
<img src="images/Master_Page_0005.png" id="Master_PageLine3" alt="" title="" style="border-width:0;width:8px;height:25px"></div>
<div id="wb_Master_PageJavaScript2" style="margin:0;padding:0;position:absolute;left:822px;top:319px;width:60px;height:19px;text-align:left;z-index:32;">
<a href="http://www.facebook.com/jaw.bunty" rel="nofollow"><img style="width:75px;height:30px;border-width:0;" alt="jawed on Facebook" title="jawed on Facebook" src="logo_facebook.gif"></a></div>
<div id="wb_Master_PageJavaScript3" style="margin:0;padding:0;position:absolute;left:261px;top:352px;width:113px;height:20px;text-align:left;z-index:33;">
<a style="font-family:Arial;font-size:12px;color:#0000FF;font-weight:normal;font-style:normal;text-decoration:none" href="javascript:addToFavorites('Enter your page name here', 'http://www.jawed.co.in')">Bookmark this site !</a>
</div>
<div id="wb_Master_PageLine4" style="margin:0;padding:0;position:absolute;left:376px;top:349px;width:0px;height:17px;text-align:left;z-index:34;">
<img src="images/Master_Page_0007.png" id="Master_PageLine4" alt="" title="" style="border-width:0;width:8px;height:25px"></div>
</div>
<div id="wb_LoginImage1" style="margin:0;padding:0;position:absolute;left:245px;top:394px;width:363px;height:45px;text-align:left;z-index:44;">
<img src="images/Horizontal%20Dividor.png" id="LoginImage1" alt="" border="0" style="width:363px;height:45px;"></div>
<div id="wb_LoginText3" style="margin:0;padding:0;position:absolute;left:285px;top:437px;width:277px;height:63px;text-align:justify;z-index:45;">
<font style="font-size:13px" color="#000000" face="Verdana">Enter the login name into &quot;Login&quot; and password into the &quot;Password&quot; fields respectively. Then click &quot;Log In&quot;.<b><br>
</b></font></div>
<div id="wb_LoginForm2" style="position:absolute;left:282px;top:490px;width:279px;height:183px;z-index:46">
<form name="loginform" method="post" action="<?php echo basename(__FILE__); ?>" id="LoginForm2">
<input type="text" id="LoginEditbox3" style="position:absolute;left:12px;top:15px;width:175px;height:18px;border:3px #E6E6FA double;background-image:url(images/ABUntitled%201.jpg);font-family:Verdana;font-size:13px;z-index:35" name="username" value="<?php echo $username; ?>">
<div id="wb_LoginText4" style="margin:0;padding:0;position:absolute;left:41px;top:93px;width:160px;height:13px;text-align:left;z-index:36;">
<font style="font-size:11px" color="#387AC8" face="Verdana">Remember me</font></div>
<input type="password" id="LoginEditbox4" style="position:absolute;left:20px;top:55px;width:164px;height:18px;border:3px #E6E6FA double;background-image:url(images/ABUntitled%202.jpg);font-family:Verdana;font-size:13px;z-index:37" name="password" value="<?php echo $password; ?>">
<input type="checkbox" id="LoginCheckbox1" name="" value="on" style="position:absolute;left:17px;top:90px;z-index:38">
<input type="submit" id="LoginButton2" name="" value="" style="position:absolute;left:168px;top:95px;width:82px;height:29px;border:0px #DFE9F5 solid;background-image:url(images/untitled.png);color:#387AC8;font-family:Verdana;font-size:11px;z-index:39">
<div id="wb_LoginText5" style="margin:0;padding:0;position:absolute;left:196px;top:62px;width:73px;height:13px;text-align:left;z-index:40;">
<font style="font-size:11px" color="#387AC8" face="Verdana">Password:</font></div>
<div id="wb_LoginText6" style="margin:0;padding:0;position:absolute;left:199px;top:16px;width:80px;height:13px;text-align:left;z-index:41;">
<font style="font-size:11px" color="#387AC8" face="Verdana">User Name:</font></div>
</form>
</div>
<div id="wb_LoginImage2" style="margin:0;padding:0;position:absolute;left:319px;top:386px;width:48px;height:48px;text-align:left;z-index:47;">
<img src="images/users.png" id="LoginImage2" alt="" border="0" style="width:48px;height:48px;"></div>
<div id="wb_LoginText7" style="margin:0;padding:0;position:absolute;left:402px;top:411px;width:63px;height:16px;text-align:left;z-index:48;">
<font style="font-size:13px" color="#000000" face="Verdana"><b>Member</b></font></div>
<div id="wb_LoginImage3" style="margin:0;padding:0;position:absolute;left:538px;top:397px;width:32px;height:32px;text-align:left;z-index:49;">
<img src="images/lock.png" id="LoginImage3" alt="" border="0" style="width:32px;height:32px;"></div>
<div id="wb_LoginText8" style="margin:0;padding:0;position:absolute;left:282px;top:643px;width:277px;height:42px;text-align:justify;z-index:50;">
<font style="font-size:12px" color="#000000" face="Verdana"><b>Forgot passowrd?.</b> please enter your e-mail ID which you have used during sign up process </font></div>
<div id="wb_LoginPasswordRecovery1" style="margin:0;padding:0;position:absolute;left:273px;top:688px;width:289px;height:82px;text-align:right;z-index:51;">
<form name="forgotpasswordform" method="post" action="<?php echo basename(__FILE__); ?>" id="forgotpasswordform">
<table cellspacing="4" cellpadding="0" style="background-color:#FFFFFF;border-color:#FFFFFF;border-width:1px;border-style:solid;color:#387AC8;font-family:Verdana;font-size:11px;width:289px;height:82px;">
<tr>
   <td colspan="2" align="center" style="height:17px;background-color:#DFE9F5;color:#387AC8;">Forgot your password?</td>
</tr>
<tr>
   <td align="right" style="height:20px;width:106px">Email:</td>
   <td align="left"><input name="email" type="text" id="email" style="width:100px;height:18px;background-color:#FFFFFF;border-color:#DFE9F5;border-width:1px;border-style:solid;color:#387AC8;font-family:Verdana;font-size:11px;"></td>
</tr>
<tr>
   <td>&nbsp;</td><td align="left" valign="bottom"><input type="submit" name="submit" value="Submit" id="submit" style="color:#387AC8;background-color:#FFFFFF;border-color:#DFE9F5;border-width:1px;border-style:solid;font-family:Verdana;font-size:11px;width:70px;height:20px;"></td>
</tr>
</table>
</form>
</div>
</div>
</body>
</html>