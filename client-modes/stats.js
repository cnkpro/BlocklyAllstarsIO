//Keeps track of the user's score during one game, for the end-of-game screen.
//This file does not touch the DOM so that it can be tested under node.

function GameStats()
{
  this.reset();
}

GameStats.prototype.reset = function() {
  this.startTime = null;
  this.endTime = null;
  this.portion = 0;
  this.maxPortion = 0;
  this.kills = 0;
  this.rank = -1;
  this.bestRank = -1;
  this.players = 0;
};

GameStats.prototype.start = function(time) {
  if (this.startTime === null)
    this.startTime = time;
};

GameStats.prototype.update = function(portion, kills, rank, players) {
  if (this.startTime === null || this.endTime !== null)
    return;
  if (typeof portion === "number" && !isNaN(portion))
  {
    this.portion = portion;
    this.maxPortion = Math.max(this.maxPortion, portion);
  }
  if (typeof kills === "number")
    this.kills = Math.max(this.kills, kills);
  if (rank >= 0)
  {
    this.rank = rank;
    this.players = players;
    if (this.bestRank === -1 || rank < this.bestRank)
      this.bestRank = rank;
  }
};

GameStats.prototype.end = function(time) {
  if (this.startTime !== null && this.endTime === null)
    this.endTime = time;
};

function formatPercent(portion)
{
  return (portion * 100).toFixed(2) + "%";
}

function formatTime(ms)
{
  var secs = Math.max(0, Math.floor(ms / 1000));
  var mins = Math.floor(secs / 60);
  secs = secs % 60;
  return mins + ":" + (secs < 10 ? "0" : "") + secs;
}

//Returns [label, value] pairs to show on the stats screen.
GameStats.prototype.rows = function() {
  var alive = (this.startTime === null) ? 0 :
    ((this.endTime === null ? this.startTime : this.endTime) - this.startTime);
  return [
    ["Land", formatPercent(this.portion)],
    ["Best land", formatPercent(this.maxPortion)],
    ["Kills", String(this.kills)],
    ["Best rank", this.bestRank === -1 ? "--" : "#" + (this.bestRank + 1)],
    ["Time alive", formatTime(alive)]
  ];
};

GameStats.formatPercent = formatPercent;
GameStats.formatTime = formatTime;

module.exports = GameStats;
