function constant(val) {
  return {
    value: val,
    enumerable: true
  };
}

var consts = {
  GRID_SIZE: constant(80),
  CELL_WIDTH: constant(40),
  SPEED: constant(5),
  BORDER_WIDTH: constant(20),
  MAX_PLAYERS: constant(81),
  ANIMATE_FRAMES: constant(24), //Frames for the tile and spawn animations.
  NEW_PLAYER_LAG: constant(60) //Frames a new player waits before moving. (One second)
};

Object.defineProperties(module.exports, consts);
