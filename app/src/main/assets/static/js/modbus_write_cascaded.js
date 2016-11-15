'use strict';
/*
// This function encloses the cascaded callbacks in order to WRITE to a slave (the one connected to the master) modbus through the master (the one connected to PC)
*/
function modbus_write_cascaded(modbus_instance, write_commands, success, failure) {
  if (write_commands.length == 0) {
      success();
  } else {
    modbus_instance.write(write_commands[0].address, write_commands[0].payload, function() {
      write_commands.splice(0, 1);
      modbus_write_cascaded(modbus_instance, write_commands, success, failure);
    }, failure);
  }
}