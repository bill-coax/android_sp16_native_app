//Here we setup the callback for data-received
callbacks = {};
function dummy_cb(x){ console.log("dummy_cb", x); }
var last_xfer = new Date();
callbacks.dataReady = dummy_cb;
console.log("Initialized ble_modbus.js");
coaxserial = function ble_coaxserial(){
  var serial = {};
  serial.list = function ble_serial_list(cb){
    setTimeout(cb(["Bluetooth (connect above)"]),0);
  };
  serial.connect = function ble_serial_connect(com_port, success, error){
    success();
  };
  serial.disconnect = function ble_serial_disconnect(arg, completed){
    setTimeout(completed,0);
  };
  return serial;
};

//FIXME -- we should add a timeout to this routine
function command(msg, done){
  if(callbacks.dataReady != dummy_cb){
    console.log("Crazy double calling of async modbus");
  }else{
    callbacks.dataReady = function status_response(data){
      callbacks.dataReady = dummy_cb; //Replace the dummy_cb (sanity checking)
      done(data.payload);
    };
    Android.writeData(JSON.stringify({payload:msg}));
  }
}

modbus = function ble_modbus(serial, modbus_slave_address){
  mb = {};
  mb.read = function ble_modbus_read(address, size, success, error){
    return mb.read_ext(modbus_slave_address, address, size, success, error);
  }
  mb.write = function ble_modbus_write(address, size, success, error){
    return mb.write_ext(modbus_slave_address, address, size, success, error);
  }
  mb.read_ext = function ble_modbus_read_ext(slave_address, address, size, success, error){
    var response = [];
    //Here we respond with the data
    var regs = new Array(size);
    for(i=0;i<size;i++){
      regs[i] = 0;
    }
    //Here we start an actual request to the ble hardware (assuming it's connected)
    var msg = [2, slave_address, address/256, address % 256, size];
    var start = new Date().getTime();
    var status_checks = 0;
    command(msg,function poll_status(payload){ //In the response we get the status
      //Sanity check the data
      var end = new Date().getTime();
      if(payload.length == 2){ //Got an error
        console.log("modbus error:", payload[1]);
        error();
      }else if(payload.length != (2 + size * 2)){
        console.log("got back wrong size??!?!", payload);
        error();
      }
      for(i=0; i<size; i++){
         regs[i] = payload[2 + i*2 + 1] * 256 +  payload[2 + i*2]; //Little endian data from ble
      }
      console.log("Response R:", end-start, regs);
      success(regs);
    });
  };

  mb.write_ext = function ble_modbus_write(slave_address, address, payload, success, error){
    var response = [];
    var size = payload.length;
    //Here we respond with the data
    var regs = new Array(size * 2 + 5);
    for(i=0;i<size;i++){
      regs[5 + i * 2] = Math.floor(payload[i] % 256);
      regs[5 + i * 2 + 1] = Math.floor(payload[i] / 256);
    }
    regs[0] = 1;
    regs[1] = slave_address;
    regs[2] = address/256;
    regs[3] = address % 256;
    regs[4] = size;
    //Here we start an actual request to the ble hardware (assuming it's connected)
    var start = new Date().getTime();
    var status_checks = 0;
    command(regs,function poll_status(payload){ //In the response we get the status
      //Sanity check the data
      var end = new Date().getTime();
      console.log("status =",payload[0]);
      console.log("Read out ",payload);
      console.log("Response W:", end-start, payload);
      success();
    });
  }
  return mb;
};
//Android.writeData("{payload:[1,2,3]}");
//Android.writeData("{payload:[115]}");
