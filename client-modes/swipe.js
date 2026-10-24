//Turns a touch swipe into a heading (0 = up, 1 = right, 2 = down, 3 = left).
//Returns -1 if the finger has not moved far enough yet.
function swipeHeading(dx, dy, minDist)
{
  if (minDist === undefined)
    minDist = 30;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minDist)
    return -1;
  if (Math.abs(dx) > Math.abs(dy))
    return dx > 0 ? 1 : 3;
  else
    return dy > 0 ? 2 : 0;
}

module.exports = swipeHeading;
