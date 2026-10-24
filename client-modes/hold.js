//Keeps a screen up for holdMs, or until skip() is called (e.g. on a click or
//key press), whichever comes first. done is called exactly once.
//Returns the skip function.
function holdScreen(holdMs, done, timers)
{
  timers = timers || {setTimeout: setTimeout, clearTimeout: clearTimeout};
  var finished = false;
  var timer = timers.setTimeout(skip, holdMs);
  
  function skip()
  {
    if (finished)
      return;
    finished = true;
    timers.clearTimeout(timer);
    done();
  }
  return skip;
}

module.exports = holdScreen;
