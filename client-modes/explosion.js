//Pieces of a player's block flying apart when it dies.
//This file does not touch the DOM so that it can be tested under node.

var PIECES = 3; //The block breaks into PIECES x PIECES parts.
var DISTANCE = 1.5; //How far (in block widths) the outer pieces fly.

//Returns the pieces at the given frame of the animation, relative to the
//top-left corner of the block: [{x, y, size, alpha}].
function explosionPieces(frame, totalFrames, width)
{
  var t = Math.min(Math.max(frame / totalFrames, 0), 1);
  var ease = 1 - (1 - t) * (1 - t); //Fast at first, then slowing down.
  var size = width / PIECES;
  var pieces = [];

  for (var r = 0; r < PIECES; r++)
  {
    for (var c = 0; c < PIECES; c++)
    {
      //Direction from the center of the block to the center of this piece.
      var dirX = (c + .5) / PIECES - .5;
      var dirY = (r + .5) / PIECES - .5;
      pieces.push({
        x: c * size + dirX * DISTANCE * 2 * width * ease,
        y: r * size + dirY * DISTANCE * 2 * width * ease,
        size: size * (1 - t * .5),
        alpha: 1 - t
      });
    }
  }
  return pieces;
}

module.exports = explosionPieces;
