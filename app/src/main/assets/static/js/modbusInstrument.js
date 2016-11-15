var modbusInstrument = function(){
  $.app = Android;

  res = {};
  var last_xfer_i = new Date();
  res.last_xfer_time = 0;
  var connected = false;

  res.open = function(succ, fail){
    var res = Android.Connect();
    console.log("Connect returned", res);
    if (res == "connected"){
      connected = true;
      succ(res);
    }else{
      fail(res);
    }
  };

  res.disconnect_event = function(){
    connected = false; // flag to tell javascript that disconnection occurred, if no other way gets through
  };

  function generic_pass(w, x, y, z){
    console.log("generic_pass", w, x, y, z);
  };

  function generic_fail(w, x, y, z){
    console.log("generic_fail", w, x, y, z);
  };

  function mutex_wrapA(target_fcn, success_idx, fail_idx){
    var waiting = []; // This is a fifo of callbacks
    function mysuccess(){
      var original = waiting[0];
      original[success_idx].apply(this, arguments);
      waiting = waiting.slice(1,waiting.length); //Remove this from the queue
      if(waiting.length)setTimeout(myexec,1);
    }
    function myfail(){
      var original = waiting[0];
      original[fail_idx].apply(this, arguments);
      //Wait until after the callback to remove this from the queue (or it could lead to double events!!!)
      waiting = waiting.slice(1,waiting.length); //Remove this from the queue
     if(waiting.length)setTimeout(myexec,1);
    }
    function myexec(){
      var newargs = [];
      var myargs = waiting[0];
      
      for(var i=0; i<myargs.length; i++){
        newargs[i] = myargs[i];
        if(i == success_idx) newargs[i] = mysuccess;
        if(i == fail_idx){
          newargs[i] = myfail;
        }
      }
      target_fcn.apply(this, newargs);
    }
    return function mutex_wrapper(){
      var test = !waiting.length;
      waiting.push(arguments);
      if(test){ //If nothing else is running, then start it up
        myexec();
      }
    };
  };

  var mutex_safe_access = mutex_wrapA(mutex, 4, 5);

  function mutex(command, b, c, d, e, f){
    if (command == 0){       // error return write_raw_i(b, c, d, e, f);
    }else if (command == 1){ return write_registers_i(b, c, d, e, f);
    }else if (command == 2){ return read_registers_i(b, c, d, e, f);
    }else{
      console.log("modbusInstrument.js error! command:", command, " b: ", b, " c: ", c, " d: ", d, " e: ", e, " f: ", f);
    }
  };

  res.read_registers = function(slave_address, reg_address, length, succ, fail){
    return mutex_safe_access(2, slave_address, reg_address, length, succ, fail);
  };

  read_registers_i = function(slave_address, reg_address, length, succ, fail){
    last_xfer_i = new Date();
    var resp = JSON.parse(Android.read_registers(JSON.stringify({slave_address:slave_address, reg_address:reg_address, length:length})));
    if (resp.result == "True"){ // succeeded, call is in process - register the callback - might be too slow?
      reg_callbacks(
        function A(r){
          succ(r);
        },
        function B(r){
          fail(r);
        }
      );
    }else{
      fail(resp);
    }
  };

  res.write_registers = function(slave_address, reg_address, values, succ, fail){
    return mutex_safe_access(1, slave_address, reg_address, values, succ, fail);
  };

  write_registers_i = function(slave_address, reg_address, values, succ, fail){
    last_xfer_i = new Date();
    var resp = JSON.parse(Android.write_registers(JSON.stringify({slave_address:slave_address, reg_address:reg_address, values:values})));
    if (resp.result == "True"){ // could there be timing issue? java attempts to respond BEFORE the callback is registered?
      reg_callbacks(
        function(r){
          succ(r);
        },
        function(r){
          fail(r);
        }
      );
    }else{
      fail(resp);
    }
  };

  dummy_succ_cb = function(x){ console.log("dummy_succ_cb", x); };
  dummy_fail_cb = function(x){ console.log("dummy_fail_cb", x); };

  res.succ_callback = dummy_succ_cb;
  res.fail_callback = dummy_fail_cb;

  reg_callbacks = function(done_func, err_func){
    if        (res.succ_callback != dummy_succ_cb){ console.log("Crazy double calling of async modbus");
    } else if (res.fail_callback != dummy_fail_cb){ console.log("Crazy double double calling of async modbus");
    } else {
      res.succ_callback = function good_response(data){
        res.succ_callback = dummy_succ_cb; //Replace the dummy_cb (sanity checking)
        res.fail_callback = dummy_fail_cb;
        done_func(data);
        res.last_xfer_time = (new Date()).getTime() - last_xfer_i.getTime();
      };
      res.fail_callback = function bad_response(data){
        res.succ_callback = dummy_succ_cb;
        res.fail_callback = dummy_fail_cb; //Replace the dummy_cb (sanity checking)
        err_func(data);
        res.last_xfer_time = (new Date()).getTime() - last_xfer_i.getTime(); // needed?
      };
    }
  };

  return res;
};
//console.log("modbusInstrument.js imported!");
window.modbusInstrument = modbusInstrument;
//console.log("modbvusInstrument() run!");
