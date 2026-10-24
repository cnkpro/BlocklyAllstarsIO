//Sizes of the top UI bar and the leaderboard for a given screen width, so that
//they still fit on narrow (phone) screens.
var BAR_WIDTH = 400;
var MIN_BAR_WIDTH = 65;
var COMPACT_WIDTH = 640;

function hudLayout(canvasWidth)
{
  if (canvasWidth >= COMPACT_WIDTH)
  {
    return {
      compact: false,
      barWidth: BAR_WIDTH,
      leaderWidth: BAR_WIDTH,
      leaderCount: 5,
      font: 18,
      nameFont: 24
    };
  }

  //No name in the top bar, a shorter land bar and a smaller leaderboard.
  return {
    compact: true,
    barWidth: Math.max(MIN_BAR_WIDTH * 2, Math.floor(canvasWidth * .4)),
    leaderWidth: Math.max(MIN_BAR_WIDTH + 20, Math.floor(canvasWidth * .3)),
    leaderCount: 3,
    font: 14,
    nameFont: 14
  };
}

hudLayout.MIN_BAR_WIDTH = MIN_BAR_WIDTH;
hudLayout.COMPACT_WIDTH = COMPACT_WIDTH;

module.exports = hudLayout;
