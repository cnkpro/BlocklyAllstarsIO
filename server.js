//TODO: rename as "blockly.io".
var hostname = process.argv[2] || "0.0.0.0";
var port = parseInt(process.argv[3]) || parseInt(process.env.PORT) || 3000;

var finalhandler = require('finalhandler');
var http = require('http');
var path = require('path');
var serveStatic = require('serve-static');

// Serve up public/ftp folder
var serve = serveStatic(path.join(__dirname, 'public'), {'setHeaders': setHeaders});

function setHeaders(res, path) {
  res.setHeader('Cache-Control', 'public, max-age=0');
}

// Create server. The game socket shares this port with the static files, so
// it works behind proxies and only one port needs to be opened.
var server = http.createServer(function onRequest (req, res) {
  serve(req, res, finalhandler(req, res));
});

var io = require('socket.io')(server, {transports: ['websocket']});

var Game = require('./game-server.js');
var games = [new Game()];
io.on('connection', function(socket){
  socket.on("hello", function(data, fn) {
    if (typeof fn !== "function")
      return;
    if (!data || typeof data !== "object")
      fn(false, "Invalid request!");
    else if (data.name !== undefined && typeof data.name !== "string")
      fn(false, "Your name must be text!");
    else if (data.name && data.name.length > 32)
      fn(false, "Your name is too long!");
    else if (socket.joined)
      fn(false, "Already joined a game!");
    else if (!games[0].addPlayer(socket, data.name))
      fn(false, "Game is too full!");
    else
    {
      socket.joined = true;
      fn(true);
    }
  });
  socket.on("checkConn", function(fn) {
    if (typeof fn === "function")
      fn();
  });
});

server.listen(port, hostname, function() {
  console.log("Blockly.IO listening on http://" + hostname + ":" + port);
});

function tick() {
  games[0].tickFrame();
  setTimeout(tick, 1000 / 60);
}
tick();
