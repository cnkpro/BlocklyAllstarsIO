//Turns a key press into a heading (0 = up, 1 = right, 2 = down, 3 = left).
//Returns -1 for other keys, and for keys typed into a text field (so that
//the name field still takes W, A, S, D and the arrow keys).
function keyHeading(which, target)
{
  var tag = target && target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA")
    return -1;
  switch (which)
  {
    case 37: return 3; //LEFT
    case 65: return 3; //LEFT (A)

    case 38: return 0; //UP
    case 87: return 0; //UP (W)

    case 39: return 1; //RIGHT
    case 68: return 1; //RIGHT (D)

    case 40: return 2; //DOWN
    case 83: return 2; //DOWN (S)
    default: return -1;
  }
}

module.exports = keyHeading;
