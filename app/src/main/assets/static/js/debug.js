'use strict';

// constant variables:
var max_read_size = 8;
var max_slave_read_size = 8;
var max_plot_buffer = 10000;
var invalid_read_value = '_';
var min_plot_values_size = 10;
var max_plot_values_size = 1000;

// global variables:
var maps = [];
var names = [];

var expanded_map_index = null;
var expanded_field_index = null;

var to_be_expanded_map_index = null; // used to reopen the map after closing the plot modal
var to_be_expanded_field_index = null; // used to reopen the map after closing the plot modal

var modbus_master_index = null;
var modbus_master_base = null;
var test_address_base = null;

// The variables below will be used in slave read/write:
var modbus_master_command_address = null;
var modbus_master_size_address = null;
var modbus_master_address_address = null;
var modbus_master_device_id_address = null;
var modbus_master_data_address = null;
var modbus_master_status_address = null;

var plot_buffer = []; // This will contain a list of objects of type {'identifier': ..., 'data': ...} in which identifier is of type [map_index, field_index, offset_index, suboffset_index]
var plot_data = [];
var serial = null; // serial instant

var read = null;
var write = null;

var start_plot_time = null;
var plot_values_size = null;
var Instrument = null;

// data from the view:
//var parsed = JSON.parse('[{"fields": [{"base": 0, "name": "info", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "thread_type", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "version1", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "version2", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "version3", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "version4", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "boot_version1", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "boot_version2", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "boot_version3", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "boot_version4", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_upper", "offset": 9}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_lower", "offset": 10}, {"writable": false, "size": 1, "readable": true, "name": "device_id_7", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "device_id_6", "offset": 15}, {"writable": false, "size": 1, "readable": true, "name": "device_id_5", "offset": 16}, {"writable": false, "size": 1, "readable": true, "name": "device_id_4", "offset": 17}, {"writable": false, "size": 1, "readable": true, "name": "device_id_3", "offset": 18}, {"writable": false, "size": 1, "readable": true, "name": "device_id_2", "offset": 19}, {"writable": false, "size": 1, "readable": true, "name": "device_id_1", "offset": 20}, {"writable": false, "size": 1, "readable": true, "name": "device_id_0", "offset": 21}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcHigh", "offset": 22}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcLow", "offset": 23}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadHigh", "offset": 24}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadLow", "offset": 25}, {"writable": true, "size": 1, "readable": true, "name": "error_code", "offset": 26}, {"writable": false, "size": 1, "readable": true, "name": "api_version", "offset": 27}, {"writable": false, "size": 1, "readable": true, "name": "comm_source", "offset": 255}]}, {"base": 256, "name": "modbus_master", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "command", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "size", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "address", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "status", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "device_id", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "success0_u", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "success0", "offset": 9}, {"writable": false, "size": 1, "readable": true, "name": "error0_u", "offset": 10}, {"writable": false, "size": 1, "readable": true, "name": "error0", "offset": 11}, {"writable": false, "size": 1, "readable": true, "name": "success1_u", "offset": 12}, {"writable": false, "size": 1, "readable": true, "name": "success1", "offset": 13}, {"writable": false, "size": 1, "readable": true, "name": "error1_u", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "error1", "offset": 15}, {"writable": true, "size": 64, "readable": true, "name": "data", "offset": 16}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd0", "offset": 128}, {"writable": false, "size": 1, "readable": true, "name": "debug_size0", "offset": 129}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr0", "offset": 130}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat0", "offset": 131}, {"writable": false, "size": 1, "readable": true, "name": "debug_id0", "offset": 132}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd1", "offset": 136}, {"writable": false, "size": 1, "readable": true, "name": "debug_size1", "offset": 137}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr1", "offset": 138}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat1", "offset": 139}, {"writable": false, "size": 1, "readable": true, "name": "debug_id1", "offset": 140}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd2", "offset": 144}, {"writable": false, "size": 1, "readable": true, "name": "debug_size2", "offset": 145}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr2", "offset": 146}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat2", "offset": 147}, {"writable": false, "size": 1, "readable": true, "name": "debug_id2", "offset": 148}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd3", "offset": 152}, {"writable": false, "size": 1, "readable": true, "name": "debug_size3", "offset": 153}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr3", "offset": 154}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat3", "offset": 155}, {"writable": false, "size": 1, "readable": true, "name": "debug_id3", "offset": 156}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd4", "offset": 160}, {"writable": false, "size": 1, "readable": true, "name": "debug_size4", "offset": 161}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr4", "offset": 162}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat4", "offset": 163}, {"writable": false, "size": 1, "readable": true, "name": "debug_id4", "offset": 164}, {"writable": false, "size": 1, "readable": true, "name": "arbiter", "offset": 250}, {"writable": false, "size": 1, "readable": true, "name": "arbiter_index", "offset": 251}]}, {"base": 768, "name": "capsense", "offsets": [{"writable": false, "size": 4, "readable": true, "name": "configuration", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "num_channel_signals", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "num_channel_references", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "num_sensor_states", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "num_rotor_slider_values", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "num_sensors", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "cc_calib_status_flag", "offset": 9}, {"writable": false, "size": 16, "readable": true, "name": "channel_signals", "offset": 10}, {"writable": false, "size": 16, "readable": true, "name": "channel_references", "offset": 26}, {"writable": false, "size": 16, "readable": true, "name": "sensor_states", "offset": 42}, {"writable": false, "size": 16, "readable": true, "name": "rotor_slider_values", "offset": 58}, {"writable": false, "size": 16, "readable": true, "name": "cc_calibration_vals", "offset": 74}, {"writable": false, "size": 16, "readable": true, "name": "sensors", "offset": 90}, {"writable": false, "size": 16, "readable": true, "name": "sensor_noise_status", "offset": 106}, {"writable": false, "size": 16, "readable": true, "name": "nm_ch_noise_val", "offset": 122}, {"writable": false, "size": 16, "readable": true, "name": "sensor_mois_status", "offset": 138}]}, {"base": 1024, "name": "cap", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "button_count", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "slider_count", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "dial_count", "offset": 2}, {"writable": false, "size": 2, "readable": true, "name": "button", "offset": 3}, {"writable": false, "size": 8, "readable": true, "name": "slider", "offset": 5}, {"writable": false, "size": 8, "readable": true, "name": "dial", "offset": 13}]}, {"base": 1280, "name": "test", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "test_register_0", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "test_register_1", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "test_register_2", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "test_register_3", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "test_register_4", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "test_register_5", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "test_register_6", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "test_register_7", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "test_register_8", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "test_register_9", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "test_register_10", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "test_register_11", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "test_register_12", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "test_register_13", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "test_register_14", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "test_register_15", "offset": 15}]}, {"base": 1792, "name": "ctrl", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "system_time_secs_u", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "system_time_secs", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "system_time_millis_u", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "system_time_millis", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "system_time_micros_u", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "system_time_micros", "offset": 5}]}, {"base": 2048, "name": "thread", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "state", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "csumCalcLow", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "csumCalcHigh", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "csumReadLow", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "csumReadHigh", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "threadSizeLow", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "threadSizeHigh", "offset": 6}, {"writable": true, "size": 8, "readable": true, "name": "breakpoint", "offset": 8}]}, {"base": 10240, "name": "memory", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "addressUpper", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "addressLower", "offset": 1}]}, {"base": 10496, "name": "raw", "offsets": [{"writable": true, "size": 512, "readable": true, "name": "access", "offset": 0}]}, {"base": 11264, "name": "memory2", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "addressUpper", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "addressLower", "offset": 1}]}, {"base": 11520, "name": "raw2", "offsets": [{"writable": true, "size": 512, "readable": true, "name": "access", "offset": 0}]}, {"base": 12800, "name": "debug", "offsets": [{"writable": true, "size": 256, "readable": true, "name": "access", "offset": 0}]}, {"base": 13056, "name": "pin", "offsets": [{"writable": true, "size": 64, "readable": true, "name": "access", "offset": 0}, {"writable": true, "size": 64, "readable": false, "name": "init", "offset": 64}]}, {"base": 15360, "name": "security", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "exp_1_status", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "exp_2_status", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "rec_port_status", "offset": 2}, {"writable": true, "size": 1, "readable": false, "name": "password0", "offset": 3}, {"writable": true, "size": 1, "readable": false, "name": "password1", "offset": 4}, {"writable": true, "size": 1, "readable": false, "name": "password2", "offset": 5}, {"writable": true, "size": 1, "readable": false, "name": "password3", "offset": 6}, {"writable": true, "size": 1, "readable": false, "name": "password4", "offset": 7}, {"writable": true, "size": 1, "readable": false, "name": "password5", "offset": 8}, {"writable": true, "size": 1, "readable": false, "name": "password6", "offset": 9}, {"writable": true, "size": 1, "readable": false, "name": "password7", "offset": 10}]}, {"base": 15616, "name": "oled", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "status", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "width", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "height", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "source_upper", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "source_lower", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "dest_x", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "dest_y", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "source_width", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "source_height", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "source_x", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "source_y", "offset": 15}, {"writable": true, "size": 1, "readable": true, "name": "dest_width", "offset": 16}, {"writable": true, "size": 1, "readable": true, "name": "dest_height", "offset": 17}, {"writable": true, "size": 1, "readable": true, "name": "chunk_size", "offset": 18}, {"writable": false, "size": 1, "readable": true, "name": "draw_time_upper", "offset": 200}, {"writable": false, "size": 1, "readable": true, "name": "draw_time", "offset": 201}]}, {"base": 15872, "name": "encoder", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "read", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "sample_rate", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "errors", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "direction", "offset": 3}]}, {"base": 16128, "name": "flash", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "state", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "size", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "address_upper", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "address_lower", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "cmd", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "tbd1", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "tbd2", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "tbd3", "offset": 7}, {"writable": true, "size": 128, "readable": true, "name": "buffer", "offset": 8}]}, {"base": 16384, "name": "samd_flash", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "erase", "offset": 0}]}], "name": "panel"}, {"fields": [{"base": 0, "name": "info", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "blender_type", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "version1", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "version2", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "version3", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "version4", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "boot_version1", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "boot_version2", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "boot_version3", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "boot_version4", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_upper", "offset": 9}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_lower", "offset": 10}, {"writable": false, "size": 1, "readable": true, "name": "device_id_7", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "device_id_6", "offset": 15}, {"writable": false, "size": 1, "readable": true, "name": "device_id_5", "offset": 16}, {"writable": false, "size": 1, "readable": true, "name": "device_id_4", "offset": 17}, {"writable": false, "size": 1, "readable": true, "name": "device_id_3", "offset": 18}, {"writable": false, "size": 1, "readable": true, "name": "device_id_2", "offset": 19}, {"writable": false, "size": 1, "readable": true, "name": "device_id_1", "offset": 20}, {"writable": false, "size": 1, "readable": true, "name": "device_id_0", "offset": 21}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcLow", "offset": 22}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcHigh", "offset": 23}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadHigh", "offset": 24}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadLow", "offset": 25}, {"writable": true, "size": 1, "readable": true, "name": "error_code", "offset": 26}, {"writable": false, "size": 1, "readable": true, "name": "api_version", "offset": 27}, {"writable": false, "size": 1, "readable": true, "name": "comm_source", "offset": 255}]}, {"base": 256, "name": "controller", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "State", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "setpoint", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "current_speed", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "fireangle_min", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "fire_angle", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "angle_bias", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "sync_period_even", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "sync_period_odd", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "current_period", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "ramp_period", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "max_ramp", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "ramp_cutoff", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "half_wave_enabled", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "open_loop_override", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "integral_gain", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "proportional_gain_rising", "offset": 15}, {"writable": true, "size": 1, "readable": true, "name": "proportional_gain_falling", "offset": 16}, {"writable": true, "size": 1, "readable": true, "name": "gain_denominator", "offset": 17}, {"writable": true, "size": 1, "readable": true, "name": "low_speed_predictor", "offset": 18}, {"writable": true, "size": 1, "readable": true, "name": "pulse_width", "offset": 19}, {"writable": true, "size": 1, "readable": true, "name": "motor_left_on", "offset": 20}]}, {"base": 512, "name": "recipe", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "status", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "totalMinutes", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "TotalSeconds", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "speed1", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "time1", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "ramp1", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "speed2", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "time2", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "ramp2", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "speed3", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "time3", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "ramp3", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "speed4", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "time4", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "ramp4", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "timeRemaining", "offset": 15}, {"writable": true, "size": 1, "readable": true, "name": "motorLock", "offset": 16}, {"writable": true, "size": 1, "readable": true, "name": "multiplier", "offset": 17}]}, {"base": 1024, "name": "adc", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "raw_value_0", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "read_dac", "offset": 1}]}, {"base": 1280, "name": "test", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "test_register_0", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "test_register_1", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "test_register_2", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "test_register_3", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "test_register_4", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "test_register_5", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "test_register_6", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "test_register_7", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "test_register_8", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "test_register_9", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "test_register_10", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "test_register_11", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "test_register_12", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "test_register_13", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "test_register_14", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "test_register_15", "offset": 15}]}, {"base": 1792, "name": "ctrl", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "system_time_millis", "offset": 10}, {"writable": false, "size": 1, "readable": true, "name": "system_time_millis_u", "offset": 11}, {"writable": false, "size": 1, "readable": true, "name": "system_time_micros", "offset": 12}, {"writable": false, "size": 1, "readable": true, "name": "system_time_micros_u", "offset": 13}, {"writable": false, "size": 1, "readable": true, "name": "system_time_secs", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "system_time_secs_u", "offset": 15}]}, {"base": 2816, "name": "serial1", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "buffer", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "disable", "offset": 250}, {"writable": true, "size": 1, "readable": true, "name": "top", "offset": 251}, {"writable": false, "size": 1, "readable": true, "name": "bottom", "offset": 252}, {"writable": false, "size": 1, "readable": true, "name": "available", "offset": 253}, {"writable": true, "size": 1, "readable": true, "name": "baud_u", "offset": 254}, {"writable": true, "size": 1, "readable": true, "name": "baud_l", "offset": 255}]}, {"base": 3072, "name": "mem_bus_access", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "address_pointer_u", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "address_pointer_l", "offset": 1}, {"writable": true, "size": 1, "readable": false, "name": "erase_row", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "data", "offset": 3}]}, {"base": 3328, "name": "serial2", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "buffer", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "disable", "offset": 250}, {"writable": true, "size": 1, "readable": true, "name": "top", "offset": 251}, {"writable": false, "size": 1, "readable": true, "name": "bottom", "offset": 252}, {"writable": false, "size": 1, "readable": true, "name": "available", "offset": 253}, {"writable": true, "size": 1, "readable": true, "name": "baud_u", "offset": 254}, {"writable": true, "size": 1, "readable": true, "name": "baud_l", "offset": 255}]}, {"base": 3584, "name": "serial3", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "buffer", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "disable", "offset": 250}, {"writable": true, "size": 1, "readable": true, "name": "top", "offset": 251}, {"writable": false, "size": 1, "readable": true, "name": "bottom", "offset": 252}, {"writable": false, "size": 1, "readable": true, "name": "available", "offset": 253}, {"writable": true, "size": 1, "readable": true, "name": "baud_u", "offset": 254}, {"writable": true, "size": 1, "readable": true, "name": "baud_l", "offset": 255}]}, {"base": 3840, "name": "interlock", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "osc_on", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "relay_on", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "safety_switch_closed", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "keep_alive", "offset": 3}]}, {"base": 10240, "name": "memory", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "addressUpper", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "addressLower", "offset": 1}]}, {"base": 10496, "name": "raw", "offsets": [{"writable": true, "size": 512, "readable": true, "name": "access", "offset": 0}]}, {"base": 12288, "name": "eeprom", "offsets": [{"writable": false, "size": 512, "readable": true, "name": "access", "offset": 0}]}, {"base": 12800, "name": "debug", "offsets": [{"writable": true, "size": 256, "readable": true, "name": "access", "offset": 0}]}, {"base": 13056, "name": "pin", "offsets": [{"writable": true, "size": 64, "readable": true, "name": "access", "offset": 0}, {"writable": true, "size": 64, "readable": false, "name": "init", "offset": 0}]}], "name": "mainboard"}, {"fields": [{"base": 0, "name": "info", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "blender_type", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "version1", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "version2", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "version3", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "version4", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "boot_version1", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "boot_version2", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "boot_version3", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "boot_version4", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_upper", "offset": 9}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_lower", "offset": 10}, {"writable": false, "size": 1, "readable": true, "name": "device_id_7", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "device_id_6", "offset": 15}, {"writable": false, "size": 1, "readable": true, "name": "device_id_5", "offset": 16}, {"writable": false, "size": 1, "readable": true, "name": "device_id_4", "offset": 17}, {"writable": false, "size": 1, "readable": true, "name": "device_id_3", "offset": 18}, {"writable": false, "size": 1, "readable": true, "name": "device_id_2", "offset": 19}, {"writable": false, "size": 1, "readable": true, "name": "device_id_1", "offset": 20}, {"writable": false, "size": 1, "readable": true, "name": "device_id_0", "offset": 21}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcLow", "offset": 22}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcHigh", "offset": 23}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadHigh", "offset": 24}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadLow", "offset": 25}, {"writable": true, "size": 1, "readable": true, "name": "error_code", "offset": 26}, {"writable": false, "size": 1, "readable": true, "name": "api_version", "offset": 27}]}, {"base": 3840, "name": "interlock", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "status", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "safety_switch_closed", "offset": 1}]}, {"base": 10240, "name": "memory", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "addressUpper", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "addressLower", "offset": 1}]}, {"base": 10496, "name": "raw", "offsets": [{"writable": false, "size": 512, "readable": true, "name": "access", "offset": 0}]}, {"base": 12800, "name": "debug", "offsets": [{"writable": true, "size": 256, "readable": true, "name": "access", "offset": 0}]}, {"base": 13312, "name": "nfc", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "enabled", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "cmd", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "status", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "offset", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "size", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "total_success_u", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "total_success", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "total_error_u", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "total_error", "offset": 8}, {"writable": true, "size": 16, "readable": true, "name": "buffer", "offset": 256}]}], "name": "nxp_nfc"}]');
var parsed = JSON.parse('[{"fields": [{"base": 0, "name": "info", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "thread_type", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "version1", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "version2", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "version3", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "version4", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "boot_version1", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "boot_version2", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "boot_version3", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "boot_version4", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_upper", "offset": 9}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_lower", "offset": 10}, {"writable": false, "size": 1, "readable": true, "name": "device_id_7", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "device_id_6", "offset": 15}, {"writable": false, "size": 1, "readable": true, "name": "device_id_5", "offset": 16}, {"writable": false, "size": 1, "readable": true, "name": "device_id_4", "offset": 17}, {"writable": false, "size": 1, "readable": true, "name": "device_id_3", "offset": 18}, {"writable": false, "size": 1, "readable": true, "name": "device_id_2", "offset": 19}, {"writable": false, "size": 1, "readable": true, "name": "device_id_1", "offset": 20}, {"writable": false, "size": 1, "readable": true, "name": "device_id_0", "offset": 21}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcHigh", "offset": 22}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcLow", "offset": 23}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadHigh", "offset": 24}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadLow", "offset": 25}, {"writable": true, "size": 1, "readable": true, "name": "error_code", "offset": 26}, {"writable": false, "size": 1, "readable": true, "name": "api_version", "offset": 27}, {"writable": true, "size": 1, "readable": true, "name": "reset", "offset": 28}, {"writable": false, "size": 1, "readable": true, "name": "comm_source", "offset": 255}]}, {"base": 256, "name": "modbus_master", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "command", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "size", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "address", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "status", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "device_id", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "success0_u", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "success0", "offset": 9}, {"writable": false, "size": 1, "readable": true, "name": "error0_u", "offset": 10}, {"writable": false, "size": 1, "readable": true, "name": "error0", "offset": 11}, {"writable": false, "size": 1, "readable": true, "name": "success1_u", "offset": 12}, {"writable": false, "size": 1, "readable": true, "name": "success1", "offset": 13}, {"writable": false, "size": 1, "readable": true, "name": "error1_u", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "error1", "offset": 15}, {"writable": true, "size": 64, "readable": true, "name": "data", "offset": 16}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd0", "offset": 128}, {"writable": false, "size": 1, "readable": true, "name": "debug_size0", "offset": 129}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr0", "offset": 130}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat0", "offset": 131}, {"writable": false, "size": 1, "readable": true, "name": "debug_id0", "offset": 132}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd1", "offset": 136}, {"writable": false, "size": 1, "readable": true, "name": "debug_size1", "offset": 137}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr1", "offset": 138}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat1", "offset": 139}, {"writable": false, "size": 1, "readable": true, "name": "debug_id1", "offset": 140}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd2", "offset": 144}, {"writable": false, "size": 1, "readable": true, "name": "debug_size2", "offset": 145}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr2", "offset": 146}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat2", "offset": 147}, {"writable": false, "size": 1, "readable": true, "name": "debug_id2", "offset": 148}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd3", "offset": 152}, {"writable": false, "size": 1, "readable": true, "name": "debug_size3", "offset": 153}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr3", "offset": 154}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat3", "offset": 155}, {"writable": false, "size": 1, "readable": true, "name": "debug_id3", "offset": 156}, {"writable": false, "size": 1, "readable": true, "name": "debug_cmd4", "offset": 160}, {"writable": false, "size": 1, "readable": true, "name": "debug_size4", "offset": 161}, {"writable": false, "size": 1, "readable": true, "name": "debug_addr4", "offset": 162}, {"writable": false, "size": 1, "readable": true, "name": "debug_stat4", "offset": 163}, {"writable": false, "size": 1, "readable": true, "name": "debug_id4", "offset": 164}, {"writable": false, "size": 1, "readable": true, "name": "arbiter", "offset": 250}, {"writable": false, "size": 1, "readable": true, "name": "arbiter_index", "offset": 251}]}, {"base": 768, "name": "capsense", "offsets": [{"writable": false, "size": 4, "readable": true, "name": "configuration", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "num_channel_signals", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "num_channel_references", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "num_sensor_states", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "num_rotor_slider_values", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "num_sensors", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "cc_calib_status_flag", "offset": 9}, {"writable": false, "size": 16, "readable": true, "name": "channel_signals", "offset": 10}, {"writable": false, "size": 16, "readable": true, "name": "channel_references", "offset": 26}, {"writable": false, "size": 16, "readable": true, "name": "sensor_states", "offset": 42}, {"writable": false, "size": 16, "readable": true, "name": "rotor_slider_values", "offset": 58}, {"writable": false, "size": 16, "readable": true, "name": "cc_calibration_vals", "offset": 74}, {"writable": false, "size": 16, "readable": true, "name": "sensors", "offset": 90}, {"writable": false, "size": 16, "readable": true, "name": "sensor_noise_status", "offset": 106}, {"writable": false, "size": 16, "readable": true, "name": "nm_ch_noise_val", "offset": 122}, {"writable": false, "size": 16, "readable": true, "name": "sensor_mois_status", "offset": 138}]}, {"base": 1024, "name": "cap", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "button_count", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "slider_count", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "dial_count", "offset": 2}, {"writable": false, "size": 2, "readable": true, "name": "button", "offset": 3}, {"writable": false, "size": 8, "readable": true, "name": "slider", "offset": 5}, {"writable": false, "size": 8, "readable": true, "name": "dial", "offset": 13}]}, {"base": 1280, "name": "test", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "test_register_0", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "test_register_1", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "test_register_2", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "test_register_3", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "test_register_4", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "test_register_5", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "test_register_6", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "test_register_7", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "test_register_8", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "test_register_9", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "test_register_10", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "test_register_11", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "test_register_12", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "test_register_13", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "test_register_14", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "test_register_15", "offset": 15}]}, {"base": 1792, "name": "ctrl", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "system_time_secs_u", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "system_time_secs", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "system_time_millis_u", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "system_time_millis", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "system_time_micros_u", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "system_time_micros", "offset": 5}]}, {"base": 2048, "name": "thread", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "state", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "csumCalcLow", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "csumCalcHigh", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "csumReadLow", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "csumReadHigh", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "threadSizeLow", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "threadSizeHigh", "offset": 6}, {"writable": true, "size": 8, "readable": true, "name": "breakpoint", "offset": 8}]}, {"base": 10240, "name": "memory", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "addressUpper", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "addressLower", "offset": 1}]}, {"base": 10496, "name": "raw", "offsets": [{"writable": true, "size": 512, "readable": true, "name": "access", "offset": 0}]}, {"base": 11264, "name": "memory2", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "addressUpper", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "addressLower", "offset": 1}]}, {"base": 11520, "name": "raw2", "offsets": [{"writable": true, "size": 512, "readable": true, "name": "access", "offset": 0}]}, {"base": 12800, "name": "debug", "offsets": [{"writable": true, "size": 256, "readable": true, "name": "access", "offset": 0}]}, {"base": 13056, "name": "pin", "offsets": [{"writable": true, "size": 64, "readable": true, "name": "access", "offset": 0}, {"writable": true, "size": 64, "readable": false, "name": "init", "offset": 64}]}, {"base": 15360, "name": "security", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "exp_1_status", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "exp_2_status", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "rec_port_status", "offset": 2}, {"writable": true, "size": 1, "readable": false, "name": "password0", "offset": 3}, {"writable": true, "size": 1, "readable": false, "name": "password1", "offset": 4}, {"writable": true, "size": 1, "readable": false, "name": "password2", "offset": 5}, {"writable": true, "size": 1, "readable": false, "name": "password3", "offset": 6}, {"writable": true, "size": 1, "readable": false, "name": "password4", "offset": 7}, {"writable": true, "size": 1, "readable": false, "name": "password5", "offset": 8}, {"writable": true, "size": 1, "readable": false, "name": "password6", "offset": 9}, {"writable": true, "size": 1, "readable": false, "name": "password7", "offset": 10}]}, {"base": 15616, "name": "oled", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "status", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "width", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "height", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "source_upper", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "source_lower", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "dest_x", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "dest_y", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "source_width", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "source_height", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "source_x", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "source_y", "offset": 15}, {"writable": true, "size": 1, "readable": true, "name": "dest_width", "offset": 16}, {"writable": true, "size": 1, "readable": true, "name": "dest_height", "offset": 17}, {"writable": true, "size": 1, "readable": true, "name": "chunk_size", "offset": 18}, {"writable": false, "size": 1, "readable": true, "name": "draw_time_upper", "offset": 200}, {"writable": false, "size": 1, "readable": true, "name": "draw_time", "offset": 201}]}, {"base": 15872, "name": "encoder", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "read", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "sample_rate", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "errors", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "direction", "offset": 3}]}, {"base": 16128, "name": "flash", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "state", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "size", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "address_upper", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "address_lower", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "cmd", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "tbd1", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "tbd2", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "tbd3", "offset": 7}, {"writable": true, "size": 128, "readable": true, "name": "buffer", "offset": 8}]}, {"base": 16384, "name": "samd_flash", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "erase", "offset": 0}]}, {"base": 16640, "name": "fmea", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "status", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "pause", "offset": 1}]}], "name": "panel"}, {"fields": [{"base": 0, "name": "info", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "blender_type", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "version1", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "version2", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "version3", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "version4", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "boot_version1", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "boot_version2", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "boot_version3", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "boot_version4", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_upper", "offset": 9}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_lower", "offset": 10}, {"writable": false, "size": 1, "readable": true, "name": "device_family_L", "offset": 12}, {"writable": false, "size": 1, "readable": true, "name": "device_family_U", "offset": 13}, {"writable": false, "size": 1, "readable": true, "name": "device_id_7", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "device_id_6", "offset": 15}, {"writable": false, "size": 1, "readable": true, "name": "device_id_5", "offset": 16}, {"writable": false, "size": 1, "readable": true, "name": "device_id_4", "offset": 17}, {"writable": false, "size": 1, "readable": true, "name": "device_id_3", "offset": 18}, {"writable": false, "size": 1, "readable": true, "name": "device_id_2", "offset": 19}, {"writable": false, "size": 1, "readable": true, "name": "device_id_1", "offset": 20}, {"writable": false, "size": 1, "readable": true, "name": "device_id_0", "offset": 21}, {"writable": true, "size": 1, "readable": true, "name": "error_code", "offset": 26}, {"writable": false, "size": 1, "readable": true, "name": "api_version", "offset": 27}, {"writable": false, "size": 1, "readable": true, "name": "read_signature_W0", "offset": 28}, {"writable": false, "size": 1, "readable": true, "name": "read_signature_W1", "offset": 29}, {"writable": false, "size": 1, "readable": true, "name": "read_signature_W2", "offset": 30}, {"writable": false, "size": 1, "readable": true, "name": "read_signature_W3", "offset": 31}, {"writable": false, "size": 1, "readable": true, "name": "read_signature_W4", "offset": 32}, {"writable": false, "size": 1, "readable": true, "name": "read_signature_W5", "offset": 33}, {"writable": false, "size": 1, "readable": true, "name": "read_signature_W6", "offset": 34}, {"writable": false, "size": 1, "readable": true, "name": "read_signature_W7", "offset": 35}, {"writable": false, "size": 1, "readable": true, "name": "calc_signature_W0", "offset": 36}, {"writable": false, "size": 1, "readable": true, "name": "calc_signature_W1", "offset": 37}, {"writable": false, "size": 1, "readable": true, "name": "calc_signature_W2", "offset": 38}, {"writable": false, "size": 1, "readable": true, "name": "calc_signature_W3", "offset": 39}, {"writable": false, "size": 1, "readable": true, "name": "calc_signature_W4", "offset": 40}, {"writable": false, "size": 1, "readable": true, "name": "calc_signature_W5", "offset": 41}, {"writable": false, "size": 1, "readable": true, "name": "calc_signature_W6", "offset": 42}, {"writable": false, "size": 1, "readable": true, "name": "calc_signature_W7", "offset": 43}, {"writable": false, "size": 1, "readable": true, "name": "code_protect", "offset": 44}]}, {"base": 256, "name": "controller", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "State", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "setpoint", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "current_speed", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "fireangle_min", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "fire_angle", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "angle_bias", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "sync_period_even", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "sync_period_odd", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "current_period", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "ramp_period", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "max_ramp", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "ramp_cutoff", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "half_wave_enabled", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "open_loop_override", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "integral_gain", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "proportional_gain_rising", "offset": 15}, {"writable": true, "size": 1, "readable": true, "name": "proportional_gain_falling", "offset": 16}, {"writable": true, "size": 1, "readable": true, "name": "gain_denominator", "offset": 17}, {"writable": true, "size": 1, "readable": true, "name": "low_speed_predictor", "offset": 18}, {"writable": true, "size": 1, "readable": true, "name": "pulse_width", "offset": 19}, {"writable": true, "size": 1, "readable": true, "name": "motor_left_on", "offset": 20}]}, {"base": 512, "name": "recipe", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "status", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "totalMinutes", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "TotalSeconds", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "speed1", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "time1", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "ramp1", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "speed2", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "time2", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "ramp2", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "speed3", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "time3", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "ramp3", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "speed4", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "time4", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "ramp4", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "timeRemaining", "offset": 15}, {"writable": true, "size": 1, "readable": true, "name": "motorLock", "offset": 16}, {"writable": true, "size": 1, "readable": true, "name": "multiplier", "offset": 17}]}, {"base": 1280, "name": "test", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "test_register_0", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "test_register_1", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "test_register_2", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "test_register_3", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "test_register_4", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "test_register_5", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "test_register_6", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "test_register_7", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "test_register_8", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "test_register_9", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "test_register_10", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "test_register_11", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "test_register_12", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "test_register_13", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "test_register_14", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "test_register_15", "offset": 15}]}, {"base": 1536, "name": "eeprom", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "address", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "length", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "command", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "status", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "last_time_L", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "last_time_U", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "buffer", "offset": 128}]}, {"base": 1792, "name": "ctrl", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "system_time_secs_u", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "system_time_secs", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "system_time_millis_u", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "system_time_millis", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "system_time_micros_u", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "system_time_micros", "offset": 5}]}, {"base": 3840, "name": "interlock", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "status", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "safety_switch_closed", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "keep_alive", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "relay_control", "offset": 4}]}, {"base": 10240, "name": "memory", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "addressUpper", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "addressLower", "offset": 1}]}, {"base": 10496, "name": "raw", "offsets": [{"writable": false, "size": 512, "readable": true, "name": "access", "offset": 0}]}, {"base": 12800, "name": "debug", "offsets": [{"writable": true, "size": 256, "readable": true, "name": "access", "offset": 0}]}, {"base": 13312, "name": "nfc", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "enabled", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "cmd", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "status", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "offset", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "size", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "total_success_u", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "total_success", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "total_error_u", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "total_error", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "pn512_offset", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "pn512_size", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "sample_delay", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "sample_count", "offset": 12}, {"writable": true, "size": 64, "readable": true, "name": "pn512_buffer", "offset": 128}, {"writable": true, "size": 16, "readable": true, "name": "buffer", "offset": 256}]}, {"base": 13824, "name": "tag", "offsets": [{"writable": false, "size": 192, "readable": true, "name": "contents", "offset": 0}, {"writable": false, "size": 10, "readable": true, "name": "signature", "offset": 200}, {"writable": false, "size": 7, "readable": true, "name": "uid", "offset": 210}, {"writable": false, "size": 1, "readable": true, "name": "checksum", "offset": 218}, {"writable": false, "size": 1, "readable": true, "name": "status", "offset": 219}]}, {"base": 14080, "name": "iec_test", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "trigger_wdt", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "flash_page", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "flash_offset", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "flash_bit_index", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "corrupt_flash", "offset": 4}]}], "name": "nxp"}, {"fields": [{"base": 0, "name": "info", "offsets": [{"writable": false, "size": 1, "readable": true, "name": "blender_type", "offset": 0}, {"writable": false, "size": 1, "readable": true, "name": "version1", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "version2", "offset": 2}, {"writable": false, "size": 1, "readable": true, "name": "version3", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "version4", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "boot_version1", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "boot_version2", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "boot_version3", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "boot_version4", "offset": 8}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_upper", "offset": 9}, {"writable": false, "size": 1, "readable": true, "name": "flash_size_lower", "offset": 10}, {"writable": false, "size": 1, "readable": true, "name": "device_id_7", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "device_id_6", "offset": 15}, {"writable": false, "size": 1, "readable": true, "name": "device_id_5", "offset": 16}, {"writable": false, "size": 1, "readable": true, "name": "device_id_4", "offset": 17}, {"writable": false, "size": 1, "readable": true, "name": "device_id_3", "offset": 18}, {"writable": false, "size": 1, "readable": true, "name": "device_id_2", "offset": 19}, {"writable": false, "size": 1, "readable": true, "name": "device_id_1", "offset": 20}, {"writable": false, "size": 1, "readable": true, "name": "device_id_0", "offset": 21}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcLow", "offset": 22}, {"writable": false, "size": 1, "readable": true, "name": "os_csumCalcHigh", "offset": 23}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadHigh", "offset": 24}, {"writable": false, "size": 1, "readable": true, "name": "os_csumReadLow", "offset": 25}, {"writable": true, "size": 1, "readable": true, "name": "error_code", "offset": 26}, {"writable": false, "size": 1, "readable": true, "name": "api_version", "offset": 27}, {"writable": false, "size": 1, "readable": true, "name": "temp", "offset": 28}, {"writable": false, "size": 1, "readable": true, "name": "ble_version_number", "offset": 29}, {"writable": false, "size": 1, "readable": true, "name": "ble_company_id", "offset": 30}, {"writable": false, "size": 1, "readable": true, "name": "ble_subversion_number", "offset": 31}]}, {"base": 256, "name": "controller", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "State", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "setpoint", "offset": 1}, {"writable": false, "size": 1, "readable": true, "name": "current_speed", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "fireangle_min", "offset": 3}, {"writable": false, "size": 1, "readable": true, "name": "fire_angle", "offset": 4}, {"writable": false, "size": 1, "readable": true, "name": "angle_bias", "offset": 5}, {"writable": false, "size": 1, "readable": true, "name": "sync_period_even", "offset": 6}, {"writable": false, "size": 1, "readable": true, "name": "sync_period_odd", "offset": 7}, {"writable": false, "size": 1, "readable": true, "name": "current_period", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "ramp_period", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "max_ramp", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "ramp_cutoff", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "half_wave_enabled", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "open_loop_override", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "integral_gain", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "proportional_gain_rising", "offset": 15}, {"writable": true, "size": 1, "readable": true, "name": "proportional_gain_falling", "offset": 16}, {"writable": true, "size": 1, "readable": true, "name": "gain_denominator", "offset": 17}, {"writable": true, "size": 1, "readable": true, "name": "low_speed_predictor", "offset": 18}, {"writable": true, "size": 1, "readable": true, "name": "pulse_width", "offset": 19}, {"writable": true, "size": 1, "readable": true, "name": "motor_left_on", "offset": 20}]}, {"base": 512, "name": "recipe", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "status", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "totalMinutes", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "TotalSeconds", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "speed1", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "time1", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "ramp1", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "speed2", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "time2", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "ramp2", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "speed3", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "time3", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "ramp3", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "speed4", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "time4", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "ramp4", "offset": 14}, {"writable": false, "size": 1, "readable": true, "name": "timeRemaining", "offset": 15}, {"writable": true, "size": 1, "readable": true, "name": "motorLock", "offset": 16}, {"writable": true, "size": 1, "readable": true, "name": "multiplier", "offset": 17}]}, {"base": 1280, "name": "test", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "test_register_0", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "test_register_1", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "test_register_2", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "test_register_3", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "test_register_4", "offset": 4}, {"writable": true, "size": 1, "readable": true, "name": "test_register_5", "offset": 5}, {"writable": true, "size": 1, "readable": true, "name": "test_register_6", "offset": 6}, {"writable": true, "size": 1, "readable": true, "name": "test_register_7", "offset": 7}, {"writable": true, "size": 1, "readable": true, "name": "test_register_8", "offset": 8}, {"writable": true, "size": 1, "readable": true, "name": "test_register_9", "offset": 9}, {"writable": true, "size": 1, "readable": true, "name": "test_register_10", "offset": 10}, {"writable": true, "size": 1, "readable": true, "name": "test_register_11", "offset": 11}, {"writable": true, "size": 1, "readable": true, "name": "test_register_12", "offset": 12}, {"writable": true, "size": 1, "readable": true, "name": "test_register_13", "offset": 13}, {"writable": true, "size": 1, "readable": true, "name": "test_register_14", "offset": 14}, {"writable": true, "size": 1, "readable": true, "name": "test_register_15", "offset": 15}]}, {"base": 3840, "name": "interlock", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "keep_alive", "offset": 3}, {"writable": true, "size": 1, "readable": true, "name": "relay_control", "offset": 4}]}, {"base": 13312, "name": "ble", "offsets": [{"writable": true, "size": 1, "readable": true, "name": "slave_addr", "offset": 0}, {"writable": true, "size": 1, "readable": true, "name": "size", "offset": 1}, {"writable": true, "size": 1, "readable": true, "name": "address", "offset": 2}, {"writable": true, "size": 1, "readable": true, "name": "status", "offset": 3}, {"writable": true, "size": 128, "readable": true, "name": "data", "offset": 4}]}], "name": "nordic"}]');

var model = 'C-3';
var modbus_slave_addresses = JSON.parse('[3, 103]');

// Assigning maps and names:
for (var i = 0 ; i < parsed.length; i++) { // the variable 'parsed' comes from the view of django.
  maps.push(parsed[i].fields);
  names.push(parsed[i].name);
}

// Assigning modbus_master_index, modbus_master_base, and test_address_base
for (i = 0; i < maps[0].length; i++) {
  if (maps[0][i].name == 'modbus_master') {
    modbus_master_index = i;
    modbus_master_base = maps[0][i].base;
  } else if (maps[0][i].name == 'test') {
    test_address_base = maps[0][i].base;
  }
}

// Assigning the variables modbus_master_...:
if (modbus_master_index != null) {
  for (var i = 0; i < maps[0][modbus_master_index].offsets.length; i++) {
    var suboffset_name = maps[0][modbus_master_index].offsets[i].name;
    var suboffset_offset = maps[0][modbus_master_index].offsets[i].offset;
    if (suboffset_name == 'command') {
      modbus_master_command_address = modbus_master_base + suboffset_offset;
    } else if (suboffset_name == 'size') {
      modbus_master_size_address = modbus_master_base + suboffset_offset;
    } else if (suboffset_name == 'address') {
      modbus_master_address_address = modbus_master_base + suboffset_offset;
    } else if (suboffset_name == 'device_id') {
      modbus_master_device_id_address = modbus_master_base + suboffset_offset;
    } else if (suboffset_name == 'data') {
      modbus_master_data_address = modbus_master_base + suboffset_offset;
    } else if (suboffset_name == 'status') {
      modbus_master_status_address = modbus_master_base + suboffset_offset;
    }
  }
}

// Some preliminary checks:
if (modbus_master_index == null) {
  console.log('No modbus_master field found in the first map!');
}
if (modbus_master_command_address == null || modbus_master_size_address == null || modbus_master_address_address == null || modbus_master_device_id_address == null || modbus_master_data_address == null || modbus_master_status_address == null) {
  console.log('At least one modbus_master register not found!');
}

var slave_time_mapping = { 2:0,
                           3:0,
                           4:0,
                         103:0};
$.slave_times = slave_time_mapping;
function serial_connect(){
  /*
  Connecting to the selected serial port and starts reading from the blender, Calls the Unlock function after it has been connected to the selected serial port, Will be called when a specific serial is clicked
  */
  function read_entire_map(instrument, slave_address, reg_address){
    instrument.read_registers(
      slave_address, // slave
      reg_address, // reg
      1, // amount
      function success(r){
        console.log("entire_map", reg_address, r.payload, instrument.last_xfer_time);
        setTimeout(
          function(){
            read_entire_map(instrument, slave_address, reg_address+1);
          },
          0
        );
      },
      function error(r){
        console.log("entire_map error", r, slave_address, reg_address, instrument.last_xfer_time);
        setTimeout(
          function(){
            read_entire_map(instrument, slave_address, reg_address+1);
          },
          0
        );
      }
    );
  }

  function read_map_portion(instrument, time_active, slave_address, reg_address, stop_address, done){
    instrument.read_registers(
      slave_address, // slave
      reg_address, // reg
      1, // amount
      function success(r){
        console.log("map_portion: slave: ", slave_address, " reg: ", reg_address, " resp: ", r.payload, " time: ", instrument.last_xfer_time);
        if (reg_address >= stop_address){
          console.log("Done");
          done(slave_address, time_active);
        }else{
          setTimeout(
            function(){
              read_map_portion(instrument, time_active+instrument.last_xfer_time, slave_address, reg_address+1, stop_address, done);
            },
            0
          );
        }
      },
      function error(r){
        console.log("map_portion error: slave: ", slave_address, " reg: ", reg_address, " resp: ", r, " time: ", instrument.last_xfer_time);
        if (reg_address >= stop_address){
          console.log("Done");
          done(slave_address, time_activ);
        }else{
          setTimeout(
            function(){
              read_map_portion(instrument, time_active+instrument.last_xfer_time, slave_address, reg_address+1, stop_address, done);
            },
            0
          );
        }
      }
    );
  }

  function loop_forever(instrument){
    var average_times = [];
    setTimeout(
      function(){
        instrument.read_registers(
          4, // slave
          2, // reg
          1, // amount
          function success(r){
            average_times.push(instrument.last_xfer_time);
            var avg = (average_times.reduce((a, b) => a + b, 0)) / average_times.length;
            console.log("loop_forever success", r.payload, avg);
            loop_forever(instrument);
          },
          function error(r){
            console.log("loop_forever error", r);
            loop_forever(instrument);
          }
        );
      },
      1
    );
  }
  function loop_forever2(instrument){
    var average_times = [];
    setTimeout(
      function(){
        instrument.read_registers(
          2, // slave
          2, // reg
          1, // amount
          function success(r){
            average_times.push(instrument.last_xfer_time);
            var avg = (average_times.reduce((a, b) => a + b, 0)) / average_times.length;
            console.log("loop_forever2 success", r.payload, avg);
            loop_forever2(instrument);
          },
          function error(r){
            console.log("loop_forever2 error", r);
            loop_forever2(instrument);
          }
        );
      },
      1
    );
  }

  Instrument = modbusInstrument();
  console.log("Inst:", Instrument);
  Instrument.open(
    function success(){

      var total_time;
      function test_next(slave_done, time_active){
        //
        for (var attr in slave_time_mapping){
          if (attr == slave_done){
            total_time = (new Date()).getTime() - total_time.getTime();
            slave_time_mapping[slave_done] = [time_active, total_time];
            break;
          }
        }

        var next_slave = 0;
        for (var attr in slave_time_mapping){
          if (slave_time_mapping[attr] == 0){
            next_slave = attr;
            break;
          }
        }
        if (next_slave != 0){
          total_time = new Date();
          read_map_portion(Instrument, 0, next_slave, 1280, 1285, test_next);
        }else{
          console.log("Result:", slave_time_mapping);
          Instrument.read_registers(
            4,
            1280,
            1,
            function succ(r){
              console.log("SUCC 1", r);
              Instrument.write_registers(
                4,
                1280,
                [1],
                function succ(r){
                  console.log("SUCC 2", r);
                  Instrument.read_registers(
                    4,
                    1280,
                    1,
                    function succ(r){ console.log("SUCC 3", r);
                    },
                    function fail(r){ console.log("FAIL 3", r);
                    }
                  );
                },
                function fail(){ console.log("FAIL 2");
                }
              );
            },
            function fail(){ console.log("FAIL 1");
            }
          );
        }
      }
      test_next(0, 0);

      //read_map_portion(Instrument, 4, 0, 100);
      //read_map_portion(Instrument, 3, 0, 100);
      //read_map_portion(Instrument, 2, 0, 100);
      //read_map_portion(Instrument, 103, 0, 100);

      //loop_forever(Instrument);
      //loop_forever2(Instrument);
      /*Instrument.read_registers(
        4, // slave
        2, // reg
        1, // amount
        function success(r){
          console.log("read_registers success", r);

          Instrument.read_registers(
            2, // 256?
            test_address_base+20,
            1,
            function(data) { // device id of the master = 256
              console.log("tested reading out test register base:", data);
              $.hideLoading();
              $('#samples_number').show();
              $('#tabs').show();
              read_for_tabs(0, []);
            },
            function() {
              show_error_modal('Connection error', 'Please make sure you picked the right bit rate and com port.');
              serial.disconnect({}, function() {
                $.hideLoading();
              });
            });
        },
        function error(r){
          console.log("read_registers error", r);
        }
      );*/
    },
    function error(){
    }
  );
  return;
  serial.connect(com_port, function(ser) {
    var mb = modbus(ser, 2); // modbus slave device id = 2
    $.mb = mb;
    expanded_field_index = null;
    var modbus_slave_instance = modbus_slave(mb);

    function modbus_combined(modbus_instance, modbus_slave_instance) {
      var ret = {};
      ret.read = function(device_id, address, size, success, failure) {
        if (device_id > 255) {
          modbus_instance.read(address, size, success, failure);
        } else {
          modbus_slave_instance.read(device_id, address, size, success, failure);
        }
      };
      ret.write = function(device_id, address, payload, success, failure) {
        if (device_id > 255) {
          modbus_instance.write(address, payload, success, failure);
        } else {
          modbus_slave_instance.write(device_id, address, payload, success, failure);
        }
      };
      return ret;
    }

    var modbus_combined_instance = modbus_combined(mb, modbus_slave_instance);

    function modbus_command(command, device_id, address, arg3, success, failure) {
      if (command == 2) {
        modbus_combined_instance.read(device_id, address, arg3, success, failure);
      } else if (command == 1) {
        modbus_combined_instance.write(device_id, address, arg3, success, failure);
      }
    }

    var modbus_mutex_access = modbus_mutex(modbus_command, 4, 5);

    // These are the safe wrappers for accessing modbus read/write
    read = function (device_id, address, size, success, failure) {
      modbus_mutex_access(2, device_id, address, size, success, failure);
    };
    write = function (device_id, address, payload, success, failure) {
      modbus_mutex_access(1, device_id, address, payload, success, failure);
    };
    $.writeLoading('Connecting ...');
    $.showLoading();
    // Test the connection:
    read(256, test_address_base, 1, function(data) { // device id of the master = 256
      $.hideLoading();
      $('#samples_number').show();
      $('#tabs').show();
      read_for_tabs(0, []);
    }, function() {
      show_error_modal('Connection error', 'Please make sure you picked the right bit rate and com port.');
      serial.disconnect({}, function() {
        $.hideLoading();
      });
    });
  },
  function() {
  },
  baudrate);
};

function read_for_tabs(offset_index_to_read, sofar) {
  /*
  This function is being called repeatedly and regularly. It is sort of main loop of the web app.
  Reads values of registers and sets the dom elements' values.
  */
  setTimeout(function() {
    // Which map and field are picked (if any):
    var new_expanded_map_index = $('#maps_tabs li.active');
    if (new_expanded_map_index.length != 0) {
      new_expanded_map_index = parseInt(new_expanded_map_index[0].id.split('li')[1]);
    } else {
      new_expanded_map_index = null; // some invalid number
    }

    var new_expanded_field_index = $('#map' + new_expanded_map_index + ' .in');
    if (new_expanded_map_index != null) {
      if (new_expanded_field_index.length != 0) {
        new_expanded_field_index = parseInt(new_expanded_field_index[0].id.split('collapse_m')[1].split('_f')[1]);
      } else {
        new_expanded_field_index = null;
      }
    }

    // If either a new map or a new field is picked:
    if (expanded_map_index != new_expanded_map_index || expanded_field_index != new_expanded_field_index) {
      expanded_map_index = new_expanded_map_index;
      expanded_field_index = new_expanded_field_index;
      offset_index_to_read = 0;
      sofar = [];
      if (expanded_map_index != null && expanded_field_index != null) {
        var expanded_field = maps[expanded_map_index][expanded_field_index];
        for (var offset_index = 0; offset_index < expanded_field.offsets.length; offset_index++) {
          var identifier = '_m' + expanded_map_index + '_f' + expanded_field_index + '_o' + offset_index;
          $('#tr' + identifier).removeClass('danger');
          $('#input' + identifier).val('');
          for (var suboffset_index = 0; suboffset_index < expanded_field.offsets[offset_index_to_read].size; suboffset_index++) {
            $('#subtr' + identifier + '_s' + suboffset_index).removeClass('danger');
          }
        }
      }
    }

    // If both map and field are picked:
    if (expanded_map_index != null && expanded_field_index != null) {
      var expanded_field = maps[expanded_map_index][expanded_field_index];
      var next_offset_index_to_read = (offset_index_to_read + 1) % expanded_field.offsets.length;

      // Skip unreadables (registers with no read permission):
      while (expanded_field.offsets[offset_index_to_read].readable == false) {
        offset_index_to_read = next_offset_index_to_read;
        next_offset_index_to_read = (next_offset_index_to_read + 1) % expanded_field.offsets.length;
      }

      // Expand size to read:
      var optimzed_size_to_read = expanded_field.offsets[offset_index_to_read].size;
      var last_offset_index_to_read = offset_index_to_read;
      while (expanded_field.offsets[next_offset_index_to_read].readable == true && expanded_field.offsets[next_offset_index_to_read].offset - expanded_field.offsets[last_offset_index_to_read].offset == expanded_field.offsets[last_offset_index_to_read].size && optimzed_size_to_read + expanded_field.offsets[next_offset_index_to_read].size <= max_slave_read_size) {
        optimzed_size_to_read += expanded_field.offsets[next_offset_index_to_read].size;
        last_offset_index_to_read = next_offset_index_to_read;
        next_offset_index_to_read = (next_offset_index_to_read + 1) % expanded_field.offsets.length;
      }

      var to_read_size = Math.min(optimzed_size_to_read - sofar.length, max_read_size);
      if (to_read_size > 0) { // still to read:
        var device_id = (expanded_map_index == 0) ? 256 : modbus_slave_addresses[expanded_map_index - 1];
        var address = maps[expanded_map_index][expanded_field_index].base + maps[expanded_map_index][expanded_field_index].offsets[offset_index_to_read].offset + sofar.length;
        read(device_id, address, to_read_size, function(data) { // succeeded:
          sofar = sofar.concat(data);
          var skip = 0;
          for (var offset_index = offset_index_to_read; offset_index <= last_offset_index_to_read; offset_index++) {
            var identifier = '_m' + expanded_map_index + '_f' + expanded_field_index + '_o' + offset_index;
            $('#tr' + identifier).removeClass('danger');
            var new_skip = skip + maps[expanded_map_index][expanded_field_index].offsets[offset_index].size;
            if (sofar.slice(skip, new_skip).length == maps[expanded_map_index][expanded_field_index].offsets[offset_index].size) {
              $('#input' + identifier).val(sofar.slice(skip, new_skip));
            }
            for (var suboffset_index = sofar.length - data.length; suboffset_index < maps[expanded_map_index][expanded_field_index].offsets[offset_index].size && suboffset_index < sofar.length; suboffset_index++) {
              $('#subtr' + identifier + '_s' + suboffset_index).removeClass('danger');
              $('#subreadinput' + identifier + '_s' + suboffset_index).val(data[skip + suboffset_index - (sofar.length - data.length)]);
            }
            skip = new_skip;
          }
          read_for_tabs(offset_index_to_read, sofar);
        }, function() { // failed:
          for (var i = 0; i < to_read_size; i++) {
            sofar.push(invalid_read_value);
          }
          for (var offset_index = offset_index_to_read; offset_index <= last_offset_index_to_read; offset_index++) {
            var identifier = '_m' + expanded_map_index + '_f' + expanded_field_index + '_o' + offset_index;
            if (sofar.length >= maps[expanded_map_index][expanded_field_index].offsets[offset_index].size) {
              $('#tr' + identifier).addClass('danger');
            }
            $('#input' + identifier).val('');
            for (var suboffset_index = sofar.length - to_read_size; suboffset_index < sofar.length; suboffset_index++) {
              $('#subtr' + identifier + '_s' + suboffset_index).addClass('danger');
              $('#subreadinput' + identifier + '_s' + suboffset_index).val('');
            }
          }
          read_for_tabs(offset_index_to_read, sofar);
        });
      } else { // done reading:
        var identifier = '_m' + expanded_map_index + '_f' + expanded_field_index + '_o' + offset_index_to_read;
        // Check if sofar has any invalid_read_value:
        var any_invalid = false;
        var all_invalid = true;
        for (var i = 0; i < sofar.length; i++) {
          any_invalid = any_invalid || (sofar[i] == invalid_read_value);
          all_invalid = all_invalid && (sofar[i] == invalid_read_value);
        }
        if (!any_invalid) {
          $('#tr' + identifier).removeClass('danger');
        }
        if (!all_invalid && sofar.length == maps[expanded_map_index][expanded_field_index].offsets[offset_index_to_read].size) {
          $('#input' + identifier).val(sofar);
        }
        read_for_tabs(next_offset_index_to_read, []);
      }
    } else { // Either map or field is not picked:
      read_for_tabs(offset_index_to_read, sofar);
    }
  }, 0);
}

function fill_plot_buffer_and_plot(when, what) {
  while (plot_buffer[index].data.length >= max_plot_buffer) {
    plot_buffer[index].data.splice(0, 1);
  }
  plot_buffer[index].data.push([when, what]);

  while (plot_data[index].data.length >= plot_values_size) {
    plot_data[index].data.splice(0, 1);
  }
  plot_data[index].data.push([when - new Date(when).getTimezoneOffset() * 60 * 1000, what]);
  read_for_plot(next_index);
  $.plot('#plot', plot_data, {
    xaxis: {
      mode: 'time',
      axisLabel: 'time',
      axisLabelUseCanvas: true,
      axisLabelFontSizePixels: 12,
      axisLabelFontFamily: 'Verdana, Arial, Helvetica, Tahoma, sans-serif',
      axisLabelPadding: 10,
    },
    yaxis: {
      mode: 'integer',
    },
  });
}

function read_for_plot(index) {
  /*
  This function reads values of picked registers and plots them.
  */
  if ($('#plot_modal').hasClass('in')) {
    var map_index = plot_buffer[index].identifier[0];
    var field_index = plot_buffer[index].identifier[1];
    var offset_index = plot_buffer[index].identifier[2];
    var suboffset = plot_buffer[index].identifier[3];
    var next_index = (index + 1) % plot_buffer.length;
    var delta = new Date().getTime() - start_plot_time;
    $('#time_span').html(('0' + (~~(delta / 1000 / 60 / 60))).slice(-2) + ':' + ('0' + (~~(delta / 1000 / 60) % 60)).slice(-2) + ':' + ('0' + (~~(delta / 1000) % 60)).slice(-2));
    $('#samples_span').html(plot_buffer[plot_buffer.length - 1].data.length + ' samples');
    var device_id = (map_index == 0) ? 256 : modbus_slave_addresses[map_index - 1];
    var address = maps[map_index][field_index].base + maps[map_index][field_index].offsets[offset_index].offset + suboffset;
    read(device_id, address, 1, function(data) {
      fill_plot_buffer_and_plot(new Date().getTime(), parseInt(data[0]));
    }, function() {
      fill_plot_buffer_and_plot(new Date().getTime(), null);
    });
  }
}

function show_error_modal(title, message, to_focus_id) {
  $('#error_modal_header').html(title);
  $('#error_modal_message').html(message);
  $('#error_modal').on('hidden.bs.modal', function () { // Error modal close event:
    if (to_focus_id != undefined) {
      $('#' + to_focus_id)[0].focus();
    }
  });
  $('#error_modal').modal();
}

$(function() {
  $("#main_header").text("SP16 Debug Screen");
  var expanded_field = null;

  var jumbotron = $(".jumbotron");

  $('#tabs').hide();

  var tabs_html = '';
  tabs_html += '<ul id="maps_tabs" class="nav nav-pills nav-justified">';
  for (var map_index = 0; map_index < maps.length; map_index++) {
    tabs_html += '<li id="li' + map_index + '"><a data-toggle="tab" href="#map' + map_index + '"">' + names[map_index] + '</a></li>';
  }
  tabs_html += '</ul>';
  tabs_html += '<div class="tab-content">';
  for (var map_index = 0; map_index < maps.length; map_index++) {
    var map = maps[map_index];
    var fields = map;
    tabs_html += '<div id="map' + map_index + '" class="tab-pane fade">';
    tabs_html += '<div id="accordion_m' + map_index + '" role="tablist" aria-multiselectable="e">';
    for (var field_index = 0; field_index < fields.length; field_index++) {
      var field = fields[field_index];
      tabs_html += '<div class="panel panel-default">';
      tabs_html += '<div class="panel-heading" role="tab" id="heading_m' + map_index + '_f' + field_index + '">';
      tabs_html += '<h4 class="panel-title">';
      tabs_html += '<a data-toggle="collapse" data-parent="#accordion_m' + map_index + '" href="#collapse_m' + map_index + '_f' +  field_index + '" aria-expanded="true" aria-controls="collapse_m' + map_index + '_f' + field_index + '">' + field.name + ' (' + field.base + ')' + '</a>';
      tabs_html += '</h4>';
      tabs_html += '</div>';
      
      tabs_html += '<div id="collapse_m' + map_index + '_f' + field_index + '" class="panel-collapse collapse' + '" role="tabpanel" aria-labelledby="heading_m' + map_index + '_f' + field_index + '">';
      tabs_html += '<table class="table table-condensed table-striped table-hover">';
      tabs_html += '<thead>';
      tabs_html += '<tr>';
      tabs_html += '<th>Offset</th>';
      tabs_html += '<th>Name</th>';
      tabs_html += '<th>Size</th>';
      tabs_html += '<th>Value</th>';
      tabs_html += '</tr>';
      tabs_html += '</thead>';
      tabs_html += '<tbody>';
      for (var offset_index = 0; offset_index < field.offsets.length; offset_index++) {
        var offset = field.offsets[offset_index];
        var unreadable = (offset.readable)?'':' class="warning"';
        tabs_html += '<tr' + unreadable + ' id="tr_m' + map_index + '_f' + field_index + '_o' + offset_index + '">';
        tabs_html += '<td>' + offset.offset + '</td>';
        tabs_html += '<td>' + offset.name + '</td>';
        tabs_html += '<td>' + offset.size + '</td>';
        var disabled = (offset.writable)?' style="cursor:pointer;"':' disabled';
        tabs_html += '<td>';
        tabs_html += '<div class="input-group">';
        tabs_html += '<input type="text" id="input_m' + map_index + '_f' + field_index + '_o' + offset_index + '" class="form-control"' + disabled + '>';
        tabs_html += '<span class="input-group-btn">';
        tabs_html += '<button type="button" class="btn btn-default" id="exp_m' + map_index + '_f' + field_index + '_o' + offset_index + '">Expand <span class="glyphicon glyphicon-chevron-down"></span></button>';
        tabs_html += '</span>';
        tabs_html += '</div>';
        tabs_html += '</td>';
        tabs_html += '</tr>';
        tabs_html += '<tr hidden id="subrow_m' + map_index + '_f'+ field_index + '_o' + offset_index + '">';
        tabs_html += '<td></td>';
        tabs_html += '<td></td>';
        tabs_html += '<td></td>';
        tabs_html += '<td>';
        tabs_html += '<div style="max-height:500px !important; overflow-y:scroll;">';
        tabs_html += '<table class="table table-condensed table-striped table-hover">';
        tabs_html += '<thead>';
        tabs_html += '<th>Offset</th>';
        tabs_html += '<th>Address</th>';
        tabs_html += '<th style="width:90px;">Value</th>';
        tabs_html += '<th></th>';
        tabs_html += '<th>plot</th>';
        tabs_html += '</thead>';
        tabs_html += '<tbody>';
        for (var suboffset_index = 0; suboffset_index < offset.size; suboffset_index++) {
          tabs_html += '<tr id="subtr_m' + map_index + '_f' + field_index + '_o' + offset_index + '_s' + suboffset_index + '"' + unreadable + '>';
          tabs_html += '<td>' + suboffset_index + '</td>';
          tabs_html += '<td>' + (field.base + offset.offset + suboffset_index) + '</td>';
          tabs_html += '<td>';
          tabs_html += '<input type="text" id="subreadinput_m' + map_index + '_f' + field_index + '_o' + offset_index + '_s' + suboffset_index + '" class="form-control" disabled />';
          tabs_html += '</td>';
          tabs_html += '<td>';
          tabs_html += '<div class="input-group">';
          tabs_html += '<input type="text" onfocus="this.select();" id="writeinput_m' + map_index + '_f' + field_index + '_o' + offset_index + '_s' + suboffset_index + '" class="form-control"' + disabled + '>';
          tabs_html += '<span class="input-group-btn">';
          tabs_html += '<button type="button" class="btn btn-primary" id="subwrite_m' + map_index + '_f' + field_index + '_o' + offset_index + '_s' + suboffset_index + '"' + disabled + '>Write</button>';
          tabs_html += '</span>';
          tabs_html += '</div>';
          tabs_html += '</td>';
          tabs_html += '<td>';
          tabs_html += '<div class="checkbox"><label><input type="checkbox"';
          if (unreadable.length != 0) {
            tabs_html += ' disabled';
          }
          tabs_html += ' id="checkbox_m' + map_index + '_f' + field_index + '_o' + offset_index + '_s' + suboffset_index + '" value=""></label></div>';
          tabs_html += '</td>';
          tabs_html += '</tr>';
        }
        tabs_html += '</tbody>';
        tabs_html += '</table>';
        tabs_html += '</div>';
        tabs_html += '<td>';
        tabs_html += '</tr>';
      }
      tabs_html += '</tbody>';
      tabs_html += '</table>';
      tabs_html += '</div>';
      tabs_html += '</div>';
    }
    tabs_html += '</div>';
    tabs_html += '</div>';
  }
  tabs_html += '</div>';

  $('#tabs').html(tabs_html);

  // Event handlers:
  $('[id^="exp_m"]').click(function() { // Expand/Collapse buttons events:
    var idis = this.id.substring(3);
    if ($(this).html() == 'Expand <span class="glyphicon glyphicon-chevron-down"></span>') {
      $(this).html('Collapse <span class="glyphicon glyphicon-chevron-up"></span>');
    } else {
      $(this).html('Expand <span class="glyphicon glyphicon-chevron-down"></span>');
    }
    $('#subrow' + idis).toggle();
  });

  $('[id^="input_m"]').focus(function() { // inputs of fields events:
    var idis = this.id.substring(5);
    var this_map_index = parseInt(idis.split('_')[1].substring(1));
    var this_field_index = parseInt(idis.split('_')[2].substring(1));
    var this_offset_index = parseInt(idis.split('_')[3].substring(1));
    $('#exp_m' + this_map_index + '_f' + this_field_index + '_o' + this_offset_index).click();
    this.blur();
    $('#writeinput_m' + this_map_index + '_f' + this_field_index + '_o' + this_offset_index + '_s0').focus();
  });

  $('[id^="subwrite_m"]').click(function() { // Write buttons events:
    var idis = this.id.substring(8);
    var writeinput = $('#writeinput' + idis)[0];
    writeinput.blur();
    var this_map_index = parseInt(idis.split('_')[1].substring(1));
    var this_field_index = parseInt(idis.split('_')[2].substring(1));
    var this_offset_index = parseInt(idis.split('_')[3].substring(1));
    var this_suboffset_index = parseInt(idis.split('_')[4].substring(1));
    var value = parseInt(writeinput.value);
    if (typeof(value) == 'number' && value >= 0 && value < Math.pow(2, 16) && value % 1 == 0) {
      $('#writeinput' + idis).val(value);
      var device_id = (this_map_index == 0) ? 256 : modbus_slave_addresses[this_map_index - 1];
      var address = maps[this_map_index][this_field_index].base + maps[this_map_index][this_field_index].offsets[this_offset_index].offset + this_suboffset_index;
      $('#subwrite' + idis).attr('disabled', 'disabled');
      write(device_id, address, [value], function() {
        console.log('Write succeeded.');
        $('#subwrite' + idis).removeAttr('disabled');
      }, function() {
        console.log('Write failed.');
        $('#subwrite' + idis).removeAttr('disabled');
      });
    } else {
      show_error_modal('Invalid entry', 'The value must be within the range [0, 65535].', 'writeinput' + idis);
    }
  });

  $('[id^="writeinput_m"]').keypress(function(e) { // input Enter keypress events:
    if (e.which == 13) {
      var idis = this.id.substring(10);
      $('#subwrite' + idis).click();
    }
  });

  $('[id^="checkbox_m"]').click(function() { // Plot checkboxes events:
    var idis = this.id.substring('checkbox'.length);
    var this_map_index = parseInt(idis.split('_')[1].substring(1));
    var this_field_index = parseInt(idis.split('_')[2].substring(1));
    var this_offset_index = parseInt(idis.split('_')[3].substring(1));
    var this_suboffset_index = parseInt(idis.split('_')[4].substring(1));
    var to_ = [this_map_index, this_field_index, this_offset_index, this_suboffset_index];
    if ($(this).is(':checked')) {
      plot_buffer.push({'identifier': to_, 'data': []});
    } else {
      for (var i = 0; i < plot_buffer.length; i++) {
        var equal = true;
        for (var j = 0; j < to_.length; j++) {
          if (plot_buffer[i].identifier[j] != to_[j]) {
            equal = false;
            break;
          }
        }
        if (equal) {
          plot_buffer.splice(i, 1);
          break;
        }
      }
    }
    if (plot_buffer.length != 0) {
      $('#plot_btn').removeAttr('disabled');
    } else {
      $('#plot_btn').attr('disabled', 'disabled');
    }
  });

  $('#plot_btn').click(function() { // Plot button event:
    var samples_count_input_value = $('#samples_count').val();
    plot_values_size = parseInt(samples_count_input_value);
    if (plot_values_size < min_plot_values_size || plot_values_size > max_plot_values_size || (samples_count_input_value != '' && !(plot_values_size < 0) && !(plot_values_size >= 0))) {
      show_error_modal('Invalid entry', 'The value must be within the range [' + min_plot_values_size +', ' + max_plot_values_size + ']', 'samples_count');
      return;
    } else if (samples_count_input_value == '') {
      plot_values_size = parseInt($('#samples_count').attr('placeholder'));
    }
    if (samples_count_input_value != '') {
      $('#samples_count').val(plot_values_size);
    }

    to_be_expanded_map_index = expanded_map_index;
    to_be_expanded_field_index = expanded_field_index;
    if (expanded_field_index != null) {
      $('#heading_m' + expanded_map_index + '_f' + expanded_field_index + ' a').click(); // close field to stop regular reading.
    }
    $('#plot_modal').modal();

    plot_data = [];
    for (var i = 0; i < plot_buffer.length; i++) {
      var label = names[plot_buffer[i].identifier[0]] + ' : ' + maps[plot_buffer[i].identifier[0]][[plot_buffer[i].identifier[1]]].name + ' : ' + maps[plot_buffer[i].identifier[0]][[plot_buffer[i].identifier[1]]].offsets[plot_buffer[i].identifier[2]].name + ' : ' + plot_buffer[i].identifier[3];
      plot_data.push({'data': [], 'label': label});
      plot_buffer[i].data = [];
    }

    start_plot_time = new Date().getTime();
    read_for_plot(0);
  });

  $('#save_CSV').click(function() { // Save CSV button event:
    var csv_content = 'timestamp';
    for (var i = 0; i < plot_buffer.length; i++) { // rows:
      var label = names[plot_buffer[i].identifier[0]] + ' : ' + maps[plot_buffer[i].identifier[0]][[plot_buffer[i].identifier[1]]].name + ' : ' + maps[plot_buffer[i].identifier[0]][[plot_buffer[i].identifier[1]]].offsets[plot_buffer[i].identifier[2]].name + ' : ' + plot_buffer[i].identifier[3];
      csv_content += ', ' + label;
    }
    csv_content += '\r\n';
    for (var i = 0; i < plot_buffer[plot_buffer.length - 1].data.length; i++) { // rows:
      csv_content += plot_buffer[plot_buffer.length - 1].data[i][0];
      for (var j = 0; j < plot_buffer.length; j++) { // columns:
        csv_content += ', ' + plot_buffer[j].data[i][1];
      }
      csv_content += '\r\n';
    }
    var blob = new Blob([csv_content], {type: 'text/plain;charset=utf-8'});
    saveAs(blob, 'SP16 ' + new Date() + '.csv');
  });

  $('#plot_modal').on('hidden.bs.modal', function () { // Plot modal close event:
    $('#heading_m' + to_be_expanded_map_index + '_f' + to_be_expanded_field_index + ' a').click(); // reopen the closed map
  });

  // Detecting the browser, the browser must be Google Chrome
  if (navigator.userAgent.indexOf('Chrome') != -1) {
    console.log("HELLO CHROME!!!");
    var serial_ports = ["Bluetooth (connect above)"];

    jumbotron.find('h2').text('Please select serial port to start');
    console.log("HELLO CHROME SUCC!!!");
    var serial_row_html = '';
    serial_row_html += '<div class="col-xs-12">';
    serial_row_html += '<div class="btn-group btn-group-md" role="group" aria-label="List">';
    for (var i = 0; i < serial_ports.length; i++) {
      serial_row_html += '<button type="button" port="' + serial_ports[i] + '" data-loading-text="Connecting ..." class="btn btn-primary">' + serial_ports[i] + '</button>';
    }
    serial_row_html += '</div>';
    serial_row_html += '</div>';
    $("#serial_row").html(serial_row_html);

    // serial com ports click event handlers:
    $('[port]').click(
      function() {
        serial_connect();
      }
    );

    return;
    /*
    Getting the list of all serial ports, 
    Checks to see if the 'CO-AX Technology Serial Plugin' extension is installed or not 
    If the 'CO-AX Technology Serial Plugin' was not installed, failure callback will be called and prompt the user to install the extension
    */
    /*serial = coaxserial();
    serial.list(
      function(serial_ports){
        jumbotron.find('h2').text('Please select serial port to start');
        if (serial_ports.length > 0){
          console.log("HELLO CHROME SUCC!!!");
          var serial_row_html = '';
          serial_row_html += '<div class="col-xs-12">';
          serial_row_html += '<div class="btn-group btn-group-md" role="group" aria-label="List">';
          for (var i = 0; i < serial_ports.length; i++) {
            serial_row_html += '<button type="button" port="' + serial_ports[i] + '" data-loading-text="Connecting ..." class="btn btn-primary">' + serial_ports[i] + '</button>';
          }
          serial_row_html += '</div>';
          serial_row_html += '</div>';
          $("#serial_row").html(serial_row_html);

          // serial com ports click event handlers:
          $('[port]').click(
            function() {
              serial_connect($(this).attr('port'));
            }
          );
        }else{
          console.log("HELLO CHROME ERR!!!");
          jumbotron.hide();
          onerror('No serial port found, connect the UCB blender and click <a href="">here</a> to retry');
        }
      }
    );*/
  } else {
    console.log("HELLO!!!");
    onerror('The browser is not supported, please install Google Chrome');
  }
});
