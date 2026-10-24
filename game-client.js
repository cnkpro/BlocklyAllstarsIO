/* global $ */
var client = require("./client");
var io = require('socket.io-client');
var swipeHeading = require("./client-modes/swipe");
var keyHeading = require("./client-modes/keys");

client.allowAnimation = true;
client.renderer = require("./client-modes/user-mode");
  
/**
 * Provides requestAnimationFrame in a cross browser way. (edited so that this is also compatible with node.)
 * @author paulirish / http://paulirish.com/
 */
// window.requestAnimationFrame = function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
//       window.setTimeout( callback, 1000 / 60 );
//     };
var hasWindow;
try {
  window.document;
  hasWindow = true;
} catch (e) {
  hasWindow = false;
}

var requestAnimationFrame;
if ( !requestAnimationFrame ) {
  requestAnimationFrame = ( function() {
    if (hasWindow) {
      return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
        setTimeout( callback, 1000 / 60 );
      };
    } else {
      return function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
        setTimeout( callback, 1000 / 60 );
      };
    }
  })();
}

function run() {
  client.connectGame(window.location.origin, $('#name').val(), function(success, msg) {
    if (success) 
    {
      //Some browsers keep the focus on a hidden name field, which would
      //swallow the steering keys.
      $("#begin :focus").blur();
      $("#error").text(""); //Don't show an old error on the next login screen.
      $("#begin").addClass("hidden");
      $("#begin").animate({
          opacity: 0
      }, 1000);
    }
    else 
    {
      var error = $("#error");
      error.text(msg);
    }
  });
}

$(function() {
  var error = $("#error");
  
  if (!window.WebSocket)
  {
    error.text("Your browser does not support WebSockets!");
    return;
  }
  
  error.text("Loading..."); //TODO: show loading screen.
  var success = false;
  var socket = io(window.location.origin, {
    'forceNew': true,
    upgrade: false,
    transports: ['websocket']
  });
  
  socket.on('connect_error', function() {
    if (!success)
      error.text("Cannot connect with server. This probably is due to misconfigured proxy server. (Try using a different browser)");
  });
  socket.emit("checkConn", function() {
    success = true;
    socket.disconnect();
    error.text("");
    $("input").keypress(function(evt) {
      if (evt.which === 13)
        requestAnimationFrame(run);
    });
    $("#begin button").click(function(evt) {
      requestAnimationFrame(run);
    });
  });
  setTimeout(function() {
    if (!success)
      error.text("Cannot connect with server. This probably is due to misconfigured proxy server. (Try using a different browser)");
  }, 5000);
});


//Event listeners
$(document).keydown(function(e) {
  var newHeading = keyHeading(e.which, e.target);
  if (newHeading === -1)
    return; //exit handler for other keys.
  
  client.changeHeading(newHeading);
  e.preventDefault();
});

//On-screen arrows (only shown on touch screens, see styles.css).
$(function() {
  $("#dpad .arrow").on("touchstart mousedown", function(e) {
    e.preventDefault(); //No double-tap zoom, no focus on the button.
    client.changeHeading(+$(this).data("heading"));
  });
});

//Swipe controls for touch screens.
var touchStart = null;
document.addEventListener("touchstart", function(e) {
  if (e.touches.length !== 1 || $(e.target).closest("#dpad").length)
    return;
  touchStart = [e.touches[0].clientX, e.touches[0].clientY];
}, {passive: true});

document.addEventListener("touchmove", function(e) {
  if (!touchStart || !$("#begin").hasClass("hidden"))
    return; //Let the login screen scroll and zoom as usual.
  e.preventDefault();
  
  var x = e.touches[0].clientX, y = e.touches[0].clientY;
  var newHeading = swipeHeading(x - touchStart[0], y - touchStart[1]);
  if (newHeading === -1)
    return;
  
  //Start over from here so that the next turn does not need a new touch.
  touchStart = [x, y];
  client.changeHeading(newHeading);
}, {passive: false});

document.addEventListener("touchend", function(e) {
  if (e.touches.length === 0)
    touchStart = null;
});
