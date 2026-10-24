//Calls fn at a steady rate. A plain setTimeout loop runs slow (about 36
//instead of 60 frames a second on Windows, where timers fire late), so the
//frames that are due get caught up on each wake-up.
var MAX_CATCH_UP = 10;

function startTicker(fn, fps)
{
  var step = 1000 / fps;
  var next = Date.now();
  var stopped = false;

  function loop()
  {
    if (stopped)
      return;

    var ran = 0;
    while (Date.now() >= next && ran < MAX_CATCH_UP)
    {
      fn();
      next += step;
      ran++;
    }

    if (Date.now() >= next) //Far behind (e.g. the machine slept): skip ahead.
      next = Date.now() + step;
    setTimeout(loop, Math.max(0, next - Date.now()));
  }

  loop();
  return function stop() {
    stopped = true;
  };
}

module.exports = startTicker;
