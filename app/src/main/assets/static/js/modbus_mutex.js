'use strict';

function modbus_mutex(target_fcn, success_idx, failure_idx) {
  var waiting = []; // This is a fifo of callbacks
  function mysuccess() {
    var current = waiting[0];
    current[success_idx].apply(this, arguments);
    // Wait until after the callback to remove this from the queue (or it could lead to double events!!!)
    waiting = waiting.slice(1, waiting.length); // Remove this from the queue
    if (waiting.length) {
      setTimeout(myexec, 0);
    }
  }
  function myfail() {
    var current = waiting[0];
    current[failure_idx].apply(this, arguments);
    // Wait until after the callback to remove this from the queue (or it could lead to double events!!!)
    waiting = waiting.slice(1, waiting.length); // Remove this from the queue
    if (waiting.length) {
      setTimeout(myexec, 0);
    }
  }
  function myexec() {
    //First build the args
    var newargs = [];
    var myargs = waiting[0];

    for(var i = 0; i < myargs.length; i++) {
      newargs[i] = myargs[i];
      if (i == success_idx) {
        newargs[i] = mysuccess;
      }
      if (i == failure_idx) {
        newargs[i] = myfail;
      }
    }
    target_fcn.apply(this, newargs);
  }
  return function mutex_wrapper() {
    var test = !waiting.length;
    waiting.push(arguments);
    if(test) { // nothing else is running, then start it up:
      myexec();
    }
  };
}