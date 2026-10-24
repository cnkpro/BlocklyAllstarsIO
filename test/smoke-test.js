// Basic regression checks. Run with `npm test`.
var assert = require("assert");
var path = require("path");
var childProcess = require("child_process");
var io = require("socket.io-client");
var core = require("../game-core");
var Game = require("../game-server");
var GameStats = require("../client-modes/stats");
var swipeHeading = require("../client-modes/swipe");
var explosionPieces = require("../client-modes/explosion");

var CELL_WIDTH = core.CELL_WIDTH;
var failures = 0;

function check(name, fn) {
  return Promise.resolve().then(fn).then(function() {
    console.log("ok   - " + name);
  }, function(err) {
    failures++;
    console.log("FAIL - " + name + "\n       " + (err && err.stack || err));
  });
}

function makePlayer(grid, num, col, row, heading, offsetX) {
  return new core.Player(grid, {
    num: num,
    name: "P" + num,
    posX: col * CELL_WIDTH + (offsetX || 0),
    posY: row * CELL_WIDTH,
    currentHeading: heading,
    waitLag: 60
  });
}

function unitTests() {
  return check("updateFrame removes the right player when another one left the map", function() {
    var grid = new core.Grid(core.GRID_SIZE);
    var outOfBounds = makePlayer(grid, 0, 0, 0, 0);   //Heading up off the map.
    var owner = makePlayer(grid, 1, 10, 10, 1);       //Heading right on its own land.
    var victim = makePlayer(grid, 2, 10, 10, 3, 30);  //Heading left into the owner.
    core.initPlayer(grid, owner);

    var players = [outOfBounds, owner, victim];
    var dead = [];
    core.updateFrame(grid, players, dead);

    assert.deepStrictEqual(players.map(function(p) { return p.num; }), [1]);
    assert.deepStrictEqual(dead.map(function(p) { return p.num; }).sort(), [0, 2]);
  }).then(function() {
    return check("new players wait NEW_PLAYER_LAG frames, then move SPEED per frame", function() {
      assert.strictEqual(core.ANIMATE_FRAMES, 24);
      var grid = new core.Grid(core.GRID_SIZE);
      var player = new core.Player(grid, {num: 0, posX: 10 * CELL_WIDTH, posY: 10 * CELL_WIDTH, currentHeading: 1});
      for (var i = 0; i < core.NEW_PLAYER_LAG; i++)
        player.move();
      assert.strictEqual(player.posX, 10 * CELL_WIDTH);
      player.move();
      assert.strictEqual(player.posX, 10 * CELL_WIDTH + core.SPEED);
    });
  }).then(function() {
    return check("swipes turn into headings along the longer axis", function() {
      assert.strictEqual(swipeHeading(10, -5), -1); //Too short.
      assert.strictEqual(swipeHeading(0, -40), 0);
      assert.strictEqual(swipeHeading(50, 20), 1);
      assert.strictEqual(swipeHeading(-10, 31), 2);
      assert.strictEqual(swipeHeading(-40, 39), 3);
      assert.strictEqual(swipeHeading(5, 0, 4), 1);
    });
  }).then(function() {
    return check("death explosion starts as the whole block and ends invisible and spread out", function() {
      var start = explosionPieces(0, 24, CELL_WIDTH);
      assert.strictEqual(start.length, 9);
      start.forEach(function(piece) {
        assert.strictEqual(piece.alpha, 1);
        assert.ok(piece.x >= 0 && piece.x + piece.size <= CELL_WIDTH + 1e-9);
        assert.ok(piece.y >= 0 && piece.y + piece.size <= CELL_WIDTH + 1e-9);
      });
      var end = explosionPieces(30, 24, CELL_WIDTH); //Clamped to the last frame.
      end.forEach(function(piece) { assert.strictEqual(piece.alpha, 0); });
      assert.ok(end[0].x < 0 && end[0].y < 0, "top-left piece flies up-left");
      assert.ok(end[8].x > CELL_WIDTH && end[8].y > CELL_WIDTH, "bottom-right piece flies down-right");
    });
  }).then(function() {
    return check("players go to the requested game, then any game with room, then a new game", function() {
      function fakeGame(room) {
        return {addPlayer: function() { return room-- > 0; }};
      }
      var fakeClient = {on: function() {}, emit: function() {}};
      var games = [fakeGame(1), fakeGame(1)];
      assert.strictEqual(Game.join(games, fakeClient, "a", 1, 3), games[1]);
      assert.strictEqual(Game.join(games, fakeClient, "b", 1, 3), games[0], "falls back to another game");
      assert.strictEqual(Game.join(games, fakeClient, "BOT c", "x", 3).id, 2, "opens a new game");
      assert.strictEqual(games.length, 3);
      assert.strictEqual(Game.join([fakeGame(0)], fakeClient, "d", -1, 1), null, "no room and no new games");
    });
  }).then(function() {
    return check("end-of-game stats keep the best values and the time alive", function() {
      var stats = new GameStats();
      stats.update(.5, 3, 0, 4); //Ignored before the game started.
      assert.strictEqual(stats.maxPortion, 0);

      stats.start(1000);
      stats.start(5000); //Frame re-requests must not restart the clock.
      stats.update(.1, 1, 2, 4);
      stats.update(.25, 2, 0, 4);
      stats.update(.05, 0, 3, 5); //Kill count reset by a frame re-request.
      stats.end(66000);
      stats.update(0, 0, 4, 5); //Ignored after the game ended.

      assert.deepStrictEqual(stats.rows(), [
        ["Land", "5.00%"],
        ["Best land", "25.00%"],
        ["Kills", "2"],
        ["Best rank", "#1"],
        ["Time alive", "1:05"]
      ]);

      stats.reset();
      assert.deepStrictEqual(stats.rows()[3], ["Best rank", "--"]);
      assert.strictEqual(GameStats.formatTime(3599999), "59:59");
    });
  });
}

function connect(url) {
  return io(url, {forceNew: true, transports: ["websocket"], reconnection: false});
}

function emitAck(socket) {
  var args = Array.prototype.slice.call(arguments, 1);
  return new Promise(function(resolve) {
    args.push(function() { resolve(Array.prototype.slice.call(arguments)); });
    socket.emit.apply(socket, args);
  });
}

function wait(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function serverTests() {
  var port = 3900 + Math.floor(Math.random() * 100);
  var url = "http://127.0.0.1:" + port;
  var root = path.join(__dirname, "..");
  var output = "";
  var server = childProcess.spawn(process.execPath, ["server.js", "127.0.0.1", "" + port], {cwd: root});
  server.stdout.on("data", function(d) { output += d; });
  server.stderr.on("data", function(d) { output += d; });
  var bots = [];

  return wait(1000).then(function() {
    return check("static page and game socket share one port", function() {
      return new Promise(function(resolve, reject) {
        require("http").get(url + "/", function(res) {
          res.resume();
          res.statusCode === 200 ? resolve() : reject(new Error("HTTP " + res.statusCode));
        }).on("error", reject);
      });
    });
  }).then(function() {
    return check("malformed messages are rejected without crashing the server", function() {
      var s = connect(url), gameFrame;
      return emitAck(s, "hello", null).then(function(r) {
        assert.strictEqual(r[0], false);
        return emitAck(s, "hello", {name: 12345});
      }).then(function(r) {
        assert.strictEqual(r[0], false);
        s.once("game", function(data) { gameFrame = data.frame; });
        return emitAck(s, "hello", {name: "tester"});
      }).then(function(r) {
        assert.strictEqual(r[0], true);
        return wait(200);
      }).then(function() {
        assert.strictEqual(typeof gameFrame, "number", "no game data received");
        return emitAck(s, "verify", {frame: gameFrame, locs: "nope"});
      }).then(function(r) {
        assert.strictEqual(r[0], false);
        var nullLocs = {};
        for (var i = 0; i < core.MAX_PLAYERS; i++)
          nullLocs[i] = null;
        return emitAck(s, "verify", {frame: gameFrame + 3, locs: nullLocs}); //We are on the map by then.
      }).then(function(r) {
        assert.strictEqual(r[0], false);
        return emitAck(s, "hello", {name: "again"});
      }).then(function(r) {
        assert.strictEqual(r[0], false, "a socket should only join once");
        return emitAck(s, "frame");
      }).then(function(r) {
        assert.strictEqual(r[0], false);
        return emitAck(s, "verify", null);
      }).then(function(r) {
        assert.strictEqual(r[0], false);
        s.emit("verify", {frame: 0}); //No callback.
        s.disconnect();
        return wait(200);
      }).then(function() {
        assert.strictEqual(server.exitCode, null, "server exited:\n" + output);
      });
    });
  }).then(function() {
    return check("bots can join and play for a few seconds", function() {
      ["bot-mode.js", "paper-io-bot-mode.js", "bot-mode.js"].forEach(function(file, i) {
        var bot = childProcess.spawn(process.execPath,
          [path.join("client-modes", file), url, "[BOT] " + i], {cwd: root});
        bot.log = "";
        bot.stdout.on("data", function(d) { bot.log += d; });
        bot.stderr.on("data", function(d) { bot.log += d; });
        bots.push(bot);
      });
      return wait(8000).then(function() {
        assert.strictEqual(server.exitCode, null, "server exited:\n" + output);
        bots.forEach(function(bot) {
          assert.strictEqual(bot.exitCode, null, "bot exited:\n" + bot.log);
          assert.ok(/Connected to game!/.test(bot.log), "bot never joined:\n" + bot.log);
          assert.ok(!/Frames don't match up|verification failed|Error/.test(bot.log), "bot reported errors:\n" + bot.log);
        });
      });
    });
  }).then(function() {
    bots.forEach(function(bot) { bot.kill(); });
    server.kill();
  });
}

unitTests().then(serverTests).then(function() {
  console.log(failures ? failures + " test(s) failed" : "all tests passed");
  process.exit(failures ? 1 : 0);
});
