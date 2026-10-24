// Basic regression checks. Run with `npm test`.
var assert = require("assert");
var path = require("path");
var childProcess = require("child_process");
var io = require("socket.io-client");
var core = require("../game-core");
var Game = require("../game-server");
var startTicker = require("../ticker");
var GameStats = require("../client-modes/stats");
var swipeHeading = require("../client-modes/swipe");
var keyHeading = require("../client-modes/keys");
var hudLayout = require("../client-modes/hud-layout");
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
    return check("arrow keys and WASD steer, but not while typing a name", function() {
      var page = {tagName: "BODY"};
      assert.deepStrictEqual([38, 39, 40, 37].map(function(k) { return keyHeading(k, page); }), [0, 1, 2, 3]);
      assert.deepStrictEqual([87, 68, 83, 65].map(function(k) { return keyHeading(k, page); }), [0, 1, 2, 3]);
      assert.strictEqual(keyHeading(13, page), -1, "other keys");
      assert.strictEqual(keyHeading(65, {tagName: "INPUT"}), -1, "typing in the name field");
      assert.strictEqual(keyHeading(37, {tagName: "INPUT"}), -1, "moving the cursor in the name field");
    });
  }).then(function() {
    return check("UI bars shrink to fit narrow screens", function() {
      var wide = hudLayout(1280);
      assert.strictEqual(wide.compact, false);
      assert.strictEqual(wide.barWidth, 400);
      assert.strictEqual(wide.leaderCount, 5);

      [320, 360, 414, 639].forEach(function(width) {
        var narrow = hudLayout(width);
        assert.strictEqual(narrow.compact, true);
        assert.ok(narrow.barWidth > hudLayout.MIN_BAR_WIDTH);
        assert.ok(narrow.leaderWidth > hudLayout.MIN_BAR_WIDTH);
        //Land bar plus kills and rank text (~160px at 14px) fit on one line.
        assert.ok(narrow.barWidth + 160 <= width, "top bar overflows at " + width);
        assert.ok(narrow.leaderWidth <= width / 2, "leaderboard too wide at " + width);
      });
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
      function fakeGame(id, room) {
        return {id: id, addPlayer: function() { return room-- > 0; }};
      }
      var fakeClient = {on: function() {}, emit: function() {}};
      var games = [fakeGame(0, 1), fakeGame(1, 1)];
      assert.strictEqual(Game.join(games, fakeClient, "a", 1, 3), games[1]);
      assert.strictEqual(Game.join(games, fakeClient, "b", 1, 3), games[0], "falls back to another game");
      assert.strictEqual(Game.join(games, fakeClient, "BOT c", "x", 3).id, 2, "opens a new game");
      assert.strictEqual(games.length, 3);
      assert.strictEqual(Game.join([fakeGame(0, 0)], fakeClient, "d", -1, 1), null, "no room and no new games");

      games = [fakeGame(0, 0), fakeGame(2, 0)];
      assert.strictEqual(Game.join(games, fakeClient, "BOT e", 2, 3).id, 1, "reuses the id of a closed game");
    });
  }).then(function() {
    return check("new players never spawn on a tail or next to a head", function() {
      var grid = new core.Grid(core.GRID_SIZE);
      //Only rows 38-42, cols 28-50 are free, so every spot includes row 40.
      for (var r = 0; r < grid.size; r++)
        for (var c = 0; c < grid.size; c++)
          if (r < 38 || r > 42 || c < 28 || c > 50)
            grid.set(r, c, {num: 99});
      //Head at col 36, tail along row 40 from col 30.
      var player = new core.Player(grid, {num: 0, name: "P0", posX: 36 * CELL_WIDTH, posY: 40 * CELL_WIDTH,
        currentHeading: 1, tail: {startRow: 40, startCol: 30, tail: [{orientation: 1, move: 6}]}});
      assert.ok(player.tail.hitsTail({row: 40, col: 33}), "tail is set up");

      var nearTail = 0;
      for (var i = 0; i < 200; i++)
      {
        var spot = Game.findEmpty(grid, [player]);
        assert.ok(spot.col <= 29 || spot.col >= 40, "spot at col " + spot.col);
        var free = Game.findEmpty(grid, []);
        if (free.col >= 30 && free.col <= 39)
          nearTail++;
      }
      assert.ok(nearTail > 0, "without players the strip around the tail is free");
    });
  }).then(function() {
    return check("server ticks 60 times a second", function() {
      return new Promise(function(resolve) {
        var ticks = 0;
        var stop = startTicker(function() { ticks++; }, 60);
        setTimeout(function() {
          stop();
          assert.ok(ticks >= 54 && ticks <= 66, ticks + " ticks in one second");
          resolve();
        }, 1000);
      });
    });
  }).then(function() {
    return check("empty games are closed, except the first one", function() {
      var fakeClient = {on: function() {}, emit: function() {}};
      var games = [new Game(0), new Game(1), new Game(2)];
      assert.ok(games[1].addPlayer(fakeClient, "BOT a"));
      assert.strictEqual(Game.closeEmpty(games), 1);
      assert.deepStrictEqual(games.map(function(game) { return game.id; }), [0, 1]);
      assert.strictEqual(Game.closeEmpty(games), 0, "first game stays open and the busy one too");
    });
  }).then(function() {
    return check("closing a loop fills the tail and the area it encloses", function() {
      var grid = new core.Grid(core.GRID_SIZE);
      var player = makePlayer(grid, 0, 10, 10, 1); //Owns rows 9-11, cols 9-11.
      core.initPlayer(grid, player);
      var players = [player];

      //Walk n cells in a direction, one frame at a time.
      function walk(heading, n) {
        player.heading = heading;
        for (var i = 0; i < n * CELL_WIDTH / core.SPEED; i++)
          core.updateFrame(grid, players);
      }
      walk(1, 4); //Right to col 14.
      walk(0, 3); //Up to row 7.
      assert.ok(!grid.get(8, 12), "nothing is filled before the loop closes");
      walk(3, 4); //Left to col 10.
      walk(2, 2); //Down to row 9, back home.

      assert.ok(!player.dead);
      var expected = {};
      [[10, 12], [10, 13], [10, 14], [9, 14], [8, 14], [7, 14], [7, 13], [7, 12], [7, 11], [7, 10], [8, 10], //Tail.
        [8, 11], [8, 12], [8, 13], [9, 12], [9, 13]].forEach(function(rc) { //Enclosed.
        expected[rc[0] + "," + rc[1]] = true;
      });
      for (var r = 9; r <= 11; r++)
        for (var c = 9; c <= 11; c++)
          expected[r + "," + c] = true; //Start area.
      for (var r = 0; r < grid.size; r++)
        for (var c = 0; c < grid.size; c++)
          assert.strictEqual(grid.get(r, c) === player, !!expected[r + "," + c], "cell " + r + "," + c);
      assert.strictEqual(player.tail.moves.length, 0, "tail is cleared");
    });
  }).then(function() {
    return check("Color converts HSL to rgba and clamps derived colors", function() {
      var red = new core.Color(0, 1, .5, 1);
      assert.strictEqual(red.rgbString(), "rgba(255, 0, 0, 1)");
      assert.strictEqual(new core.Color(1 / 3, 1, .5).rgbString(), "rgba(0, 255, 0, 1)");
      assert.strictEqual(new core.Color(0, 0, .5, .5).rgbString(), "rgba(128, 128, 128, 0.5)");
      assert.strictEqual(red.deriveLumination(1).lum, 1);
      assert.strictEqual(red.deriveSaturation(-2).sat, 0);
      assert.strictEqual(red.deriveAlpha(.25).rgbString(), "rgba(255, 0, 0, 0.25)");
      assert.ok(Math.abs(red.deriveHue(.25).hue - .75) < 1e-9, "hue wraps around");
      assert.strictEqual(red.interpolateToString(new core.Color(2 / 3, 1, .5), .5).rgbString(), "rgb(127, 0, 127)");
      assert.deepStrictEqual(core.Color.fromData({hue: .5, sat: .5, lum: .5, alpha: 1}), new core.Color(.5, .5, .5, 1));
      assert.throws(function() { new core.Color(0, 1.5, .5); }, RangeError);
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
  }).then(function() {
    return check("client resyncs after a missed frame and carries on", function() {
      var fake = connectFakeClient();
      var updates = [];
      fake.client.renderer = {update: function(fr) { updates.push(fr); }};

      fake.receive("game", fakeGame(10, 1));
      fake.receive("notifyFrame", fakeNotify(11, 1));
      fake.receive("notifyFrame", fakeNotify(13, 1)); //Missed 12.
      assert.strictEqual(fake.requests, 1, "asks for the game state");
      fake.receive("notifyFrame", fakeNotify(14, 1)); //Cached until the state arrives.
      fake.receive("game", fakeGame(14, 1)); //Already includes 13 and 14.
      fake.receive("notifyFrame", fakeNotify(15, 1));
      assert.strictEqual(fake.requests, 1, "no further requests");
      assert.deepStrictEqual(updates, [11, 15]);

      //End the game so no timers keep running.
      fake.receive("disconnect");
    });
  }).then(function() {
    return check("client keeps the land of players that joined in the same frame", function() {
      var fake = connectFakeClient();
      var state = fakeGame(10, 2);
      var other = state.players[1];
      //The other player's start area is already in the game state...
      for (var r = 19; r <= 21; r++)
        for (var c = 19; c <= 21; c++)
          state.grid[r * core.GRID_SIZE + c] = 2;
      fake.receive("game", state);
      //...and the next frame announces them as new.
      var next = fakeNotify(11, 2);
      next.newPlayers = state.players;
      fake.receive("notifyFrame", next);

      var pl = fake.client.getOthers()[0];
      assert.strictEqual(pl.num, other.num);
      assert.strictEqual(fake.client.grid.get(20, 20), pl, "start area belongs to the player we know");
      fake.receive("disconnect");
    });
  });
}

//Loads client.js (once) with a fake socket that the test feeds server
//messages into, and connects it to a new fake game.
var fakeClient = null;
var nextFakeSocket = null;
function connectFakeClient() {
  var fake = nextFakeSocket = {
    handlers: {},
    connected: true,
    requests: 0,
    on: function(name, fn) { this.handlers[name] = fn; },
    emit: function(name, data, ack) {
      if (name === "requestFrame" && ++this.requests > 3)
        throw new Error("client keeps requesting frames");
      if (name === "hello")
        ack(true);
    },
    disconnect: function() { this.connected = false; },
    receive: function(name, data) { this.handlers[name](data); }
  };
  if (!fakeClient)
  {
    var ioModule = require.cache[require.resolve("socket.io-client")];
    var realIo = ioModule.exports;
    ioModule.exports = function() { return nextFakeSocket; };
    try {
      fakeClient = require("../client.js");
    } finally {
      ioModule.exports = realIo;
    }
  }
  fakeClient.renderer = null;
  fakeClient.connectGame("http://fake", "P0");
  fake.client = fakeClient;
  return fake;
}

//Game state with `count` players (we are player 0), one every 10 cells.
function fakeGame(fr, count) {
  var grid = new core.Grid(core.GRID_SIZE);
  var players = [];
  for (var i = 0; i < count; i++)
    players.push(makePlayer(grid, i, 10 + 10 * i, 10 + 10 * i, 1).serialData());
  return {num: 0, gameid: 0, frame: fr, players: players, grid: Buffer.alloc(core.GRID_SIZE * core.GRID_SIZE)};
}

function fakeNotify(fr, count) {
  var moves = [];
  for (var i = 0; i < count; i++)
    moves.push({num: i, left: false, heading: 1});
  return {frame: fr, moves: moves};
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
