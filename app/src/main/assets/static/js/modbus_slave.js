'use strict';
/*
// This function encloses the cascaded callbacks to communicate (read/write) with a slave (the one connected to the master) modbus through a master (the one connected to PC)
*/
function modbus_slave(modbus_instance) {
  var ret = {};
  var last_written = {}; // This object is used to store the last values written to slaves to prevent double writing
  var timeout = 5; // seconds
  ret.read = function(device_id, address, size, success, failure) {
    return modbus_instance.read_ext(device_id, address, size, success, failure);
  };
  ret.write = function(device_id, address, payload, success, failure) {
    return modbus_instance.write_ext(device_id, address, payload, success, failure);
  };
  return ret;
}