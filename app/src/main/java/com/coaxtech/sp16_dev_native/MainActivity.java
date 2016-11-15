/*
 * Copyright (c) 2015, Nordic Semiconductor
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this
 * software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
 * USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

package com.coaxtech.sp16_dev_native;

import java.io.UnsupportedEncodingException;
import java.text.DateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.EmptyStackException;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import android.app.Activity;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.Message;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

import static java.security.AccessController.getContext;

public class MainActivity extends Activity implements RadioGroup.OnCheckedChangeListener {
    private static final int REQUEST_SELECT_DEVICE = 1;
    private static final int REQUEST_ENABLE_BT = 2;
    private static final int UART_PROFILE_READY = 10;
    public static final String TAG = "nRFUART";
    private static final int UART_PROFILE_CONNECTED = 20;
    private static final int UART_PROFILE_DISCONNECTED = 21;
    private static final int STATE_OFF = 10;
    final MainActivity myself = this;

    // for recording times, errors
    private static Date dstart, dfinish;
    private static long[] ble_rt_times_hist = new long[32];
    private static int ble_rt_times_hist_idx;
    private static int ble_rt_times_hist_sum;
    private static int resends;
    private modbusInstrument Instrument;

    TextView mRemoteRssiVal;
    RadioGroup mRg;
    private int mState = UART_PROFILE_DISCONNECTED;
    private UartService mService = null;
    private BluetoothDevice mDevice = null;
    private BluetoothAdapter mBtAdapter = null;
    private byte[] lastRead = null;
    private Button btnConnectDisconnect, btnSend, btnModbus, btnGetVersions, btnTestRegs, btnRecipeUpload, btnRecipe2Upload, infiniteTest;
    private EditText edtMessage;

    // my modbus stuff
    private static final int DEFAULT_ALLOWED_ERRORS = 3;
    private static final int MODBUS_READ = 2;
    private static final int MODBUS_WRITE = 1;
    private int errors_allowed = DEFAULT_ALLOWED_ERRORS;
    private boolean sending = false;
    private int handling_command = 0;
    private int expected_command = 0;
    private int expected_length = 0;
    private byte[] last_sent;
    private int[] register_contents;
    BlockingQueue<byte[]> queue_from_BLE;
    AsyncTaskRunner Myrunner;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);
        mBtAdapter = BluetoothAdapter.getDefaultAdapter();
        if (mBtAdapter == null) {
            Toast.makeText(this, "Bluetooth is not available", Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        btnConnectDisconnect = (Button) findViewById(R.id.btn_select);
        btnConnectDisconnect.setClickable(false);
        btnSend = (Button) findViewById(R.id.sendButton);
        btnGetVersions = (Button) findViewById(R.id.test1Button);
        btnTestRegs = (Button) findViewById(R.id.test2Button);
        btnModbus = (Button) findViewById(R.id.modbusbutton);
        btnRecipeUpload = (Button) findViewById(R.id.uploadRecipeButton);
        btnRecipe2Upload = (Button) findViewById(R.id.uploadRecipe2Button);
        infiniteTest = (Button) findViewById(R.id.infiniteTest);
        edtMessage = (EditText) findViewById(R.id.sendText);
        service_init();
        queue_from_BLE = new ArrayBlockingQueue<byte[]>(5);
        Instrument = new modbusInstrument(3000); //set the timeout to be 3000

        HandlerThread handlerThread = new HandlerThread("DifferentThread" , android.os.Process.THREAD_PRIORITY_BACKGROUND);
        handlerThread.start();
        Looper looper = handlerThread.getLooper();
        Handler handler = new Handler(looper);
        // Register the broadcast receiver to run on the separate Thread
        registerReceiver (UARTStatusChangeReceiver, makeGattUpdateIntentFilter(), null, handler);

        // Handle Disconnect & Connect button
        btnConnectDisconnect.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (!mBtAdapter.isEnabled()) {
                    Log.i(TAG, "onClick - BT not enabled yet");
                    Intent enableIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
                    startActivityForResult(enableIntent, REQUEST_ENABLE_BT);
                } else {
                    if (btnConnectDisconnect.getText().equals("Connect")) {

                        //Connect button pressed, open DeviceListActivity class, with popup windows that scan for devices

                        Intent newIntent = new Intent(MainActivity.this, DeviceListActivity.class);
                        startActivityForResult(newIntent, REQUEST_SELECT_DEVICE);
                    } else {
                        //Disconnect button pressed
                        if (mDevice != null) {
                            mService.disconnect();

                        }
                    }
                }
            }
        });
        // Handle Send button
        btnSend.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                EditText editText = (EditText) findViewById(R.id.sendText);
                String message = editText.getText().toString();
                byte[] value;
                try {
                    //send data to service
                    value = message.getBytes("UTF-8");
                    mService.writeRXCharacteristic(value);
                    //Update the log with time stamp
                    String currentDateTimeString = DateFormat.getTimeInstance().format(new Date());
                    edtMessage.setText("");
                } catch (UnsupportedEncodingException e) {
                    // TODO Auto-generated catch block
                    e.printStackTrace();
                }
            }
        });

        // Handle Test button
        btnGetVersions.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Log.d("DAN", "Test 1 Clicked");
                get_versions();
            }
        });

        // Handle Test button
        btnTestRegs.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                runOnUiThread( new Runnable(){
                    public void run() {
                        btnGetVersions.setEnabled(false);
                        btnTestRegs.setEnabled(false);
                        btnRecipeUpload.setEnabled(false);
                        btnRecipe2Upload.setEnabled(false);
                        infiniteTest.setEnabled(false);
                        ((TextView) findViewById(R.id.status1)).setText("Testing register reads...");
                    }
                });
                new Thread() {
                    int[] temp;
                    TextView line1 = (TextView) findViewById(R.id.line1);
                    TextView line2 = (TextView) findViewById(R.id.line2);
                    TextView line3 = (TextView) findViewById(R.id.line3);
                    TextView line4 = (TextView) findViewById(R.id.line4);
                    Date start, stop;
                    public void run(){
                        try {
                            runOnUiThread( new Runnable(){public void run() {((TextView) findViewById(R.id.status1)).setText("Reading SAMD...\nblah\nblah");}});
                            start = new Date();
                            for (int i=0; i<10; i++) {temp = Instrument.read_registers(2, 1280, 8);}
                            stop = new Date();
                            final long op_time = stop.getTime() - start.getTime();
                            runOnUiThread( new Runnable(){public void run() {line1.setText("SAMD Read Time: " + op_time);}});
                        } catch (Exception e){Log.d("DAN2S2", " I failed " + e.toString());}

                        try {
                            runOnUiThread( new Runnable(){public void run() {((TextView) findViewById(R.id.status1)).setText("Reading NXP...");}});
                            start = new Date();
                            for (int i=0; i<10; i++) {temp = Instrument.read_registers(3, 1280, 8);}
                            stop = new Date();
                            final long op_time = stop.getTime() - start.getTime();
                            runOnUiThread( new Runnable(){public void run() {line2.setText("NXP Read Time: " + op_time);}});
                        } catch (Exception e){Log.d("DAN2S2", " I failed " + e.toString());}

                        try {
                            runOnUiThread( new Runnable(){public void run() {((TextView) findViewById(R.id.status1)).setText("Reading Nordic...");}});
                            start = new Date();
                            for (int i=0; i<10; i++) {temp = Instrument.read_registers(4, 1280, 8);}
                            stop = new Date();
                            final long op_time = stop.getTime() - start.getTime();
                            runOnUiThread( new Runnable(){public void run() {line3.setText("Nordic Read Time: " + op_time);}});
                        } catch (Exception e){Log.d("DAN2S2", " I failed " + e.toString());}

                        try {
                            runOnUiThread( new Runnable(){public void run() {((TextView) findViewById(R.id.status1)).setText("Reading Nordic directly...");}});
                            start = new Date();
                            for (int i=0; i<10; i++) {temp = Instrument.read_registers(103, 1280, 8);}
                            stop = new Date();
                            final long op_time = stop.getTime() - start.getTime();
                            runOnUiThread( new Runnable(){public void run() {line4.setText("Nordic direct Read Time: " + op_time);}});
                        } catch (Exception e){Log.d("DAN2S", " I failed " + e.toString());}

                        Log.d("DAN!!", " HELLO THREAD!! ");
                        runOnUiThread( new Runnable(){
                            public void run() {
                                btnGetVersions.setEnabled(true);
                                btnTestRegs.setEnabled(true);
                                btnRecipeUpload.setEnabled(true);
                                btnRecipe2Upload.setEnabled(true);
                                infiniteTest.setEnabled(true);
                                ((TextView) findViewById(R.id.status1)).setText("Testing register reads...done");
                            }
                        });
                    }
                }.start();
            }
        });

        // Try uploading recipe and running it remotely!
        btnRecipe2Upload.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                makeAndRunTask(4);
            }
        });

        // Run an infinite loop, updating the UI with stats
        infiniteTest.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                runOnUiThread( new Runnable(){
                    public void run() {
                        btnGetVersions.setEnabled(false);
                        btnTestRegs.setEnabled(false);
                        btnRecipeUpload.setEnabled(false);
                        btnRecipe2Upload.setEnabled(false);
                        infiniteTest.setEnabled(false);
                        ((TextView) findViewById(R.id.status1)).setText("Infinite Test...");
                    }
                });
                new Thread() {
                    int[] temp;
                    TextView line1 = (TextView) findViewById(R.id.line1);
                    TextView line2 = (TextView) findViewById(R.id.line2);
                    TextView line3 = (TextView) findViewById(R.id.line3);
                    TextView line4 = (TextView) findViewById(R.id.line4);
                    TextView line5 = (TextView) findViewById(R.id.line5);
                    TextView line6 = (TextView) findViewById(R.id.line6);
                    TextView line7 = (TextView) findViewById(R.id.line7);
                    TextView line8 = (TextView) findViewById(R.id.line8);
                    TextView line9 = (TextView) findViewById(R.id.line9);
                    TextView line10 = (TextView) findViewById(R.id.line10);
                    TextView line11 = (TextView) findViewById(R.id.line11);
                    TextView line12 = (TextView) findViewById(R.id.line12);
                    TextView line13 = (TextView) findViewById(R.id.line13);
                    TextView line14 = (TextView) findViewById(R.id.line14);
                    TextView line15 = (TextView) findViewById(R.id.line15);
                    TextView line16 = (TextView) findViewById(R.id.line16);
                    TextView status1 = (TextView) findViewById(R.id.status1);
                    TextView status2 = (TextView) findViewById(R.id.status2);
                    Date start, stop;
                    public void run(){
                        while (true) {
                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(2, 1280, 1); }
                                stop = new Date();
                                Log.d("DANS", "Got something?" + Arrays.toString(temp));
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line1.setText("SAMD Read 1 Time: " + op_time + " / " + op_time/10 + " per 1 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                }});
                            } catch (Exception e) { Log.d("DANSZ", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(3, 1280, 1); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line2.setText("NXP Read 1 Time: " + op_time + " / " + op_time/10 + " per 1 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(4, 1280, 1); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line3.setText("Nordic Read 1 Time: " + op_time + " / " + op_time/10 + " per 1 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(103, 1280, 1);}
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line4.setText("Nordic direct Read 1 Time: " + op_time + " / " + op_time/10 + " per 1 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(2, 1280, 4); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line5.setText("SAMD Read Time: " + op_time + " / " + op_time/10 + " per 4 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                }});
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(3, 1280, 4); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line6.setText("NXP Read Time: " + op_time + " / " + op_time/10 + " per 4 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(4, 1280, 4); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line7.setText("Nordic Read Time: " + op_time + " / " + op_time/10 + " per 4 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(103, 1280, 4); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line8.setText("Nordic direct Read Time: " + op_time + " / " + op_time/10 + " per 4 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(2, 1280, 8); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line9.setText("SAMD Read Time: " + op_time + " / " + op_time/10 + " per 8 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                }});
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(3, 1280, 8); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line10.setText("NXP Read Time: " + op_time + " / " + op_time/10 + " per 8 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(4, 1280, 8); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line11.setText("Nordic Read Time: " + op_time + " / " + op_time/10 + " per 8 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(103, 1280, 8);}
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line12.setText("Nordic direct Read Time: " + op_time + " / " + op_time/10 + " per 8 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(2, 1280, 16); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line13.setText("SAMD Read Time: " + op_time + " / " + op_time/10 + " per 16 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                }});
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(3, 1280, 16); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line14.setText("NXP Read Time: " + op_time + " / " + op_time/10 + " per 16 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) { temp = Instrument.read_registers(4, 1280, 16); }
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line15.setText("Nordic Read Time: " + op_time + " / " + op_time/10 + " per 16 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }

                            try {
                                start = new Date();
                                for (int i = 0; i < 10; i++) {temp = Instrument.read_registers(103, 1280, 16);}
                                stop = new Date();
                                final long op_time = stop.getTime() - start.getTime();
                                runOnUiThread(new Runnable() { public void run() {
                                    line16.setText("Nordic direct Read Time: " + op_time + " / " + op_time/10 + " per 16 regs ");
                                    status1.setText("Average tx time:" + ble_rt_times_hist_sum / 32);
                                    status2.setText("errors:" + resends);
                                } });
                            } catch (Exception e) { Log.d("DAN2S", " I failed " + e.toString()); }
                        }
                    }}.start();
            }
        });

        btnModbus.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                byte value[] = {(byte) 0xde, (byte) 0xad, (byte) 0xbe, (byte) 0xef};
                //send data to service
                mService.writeRXCharacteristic(value);
                //Update the log with time stamp
                String currentDateTimeString = DateFormat.getTimeInstance().format(new Date());
                edtMessage.setText("");
            }
        });

        // Try uploading recipe and running it remotely!
        btnRecipeUpload.setOnClickListener(new View.OnClickListener() {
            private final int CONTROLLER_STATE_STOP = 0;
            private final int CONTROLLER_STATE_RUNNING = 1;

            @Override
            public void onClick(View v) {
                runOnUiThread(new Runnable() {
                    public void run () {
                        btnGetVersions.setEnabled(false);
                        btnTestRegs.setEnabled(false);
                        btnRecipeUpload.setEnabled(false);
                        btnRecipe2Upload.setEnabled(false);
                        infiniteTest.setEnabled(false);
                        set_interface("Testing register reads...", "");
                    }
                });
                new Thread() {
                    public void run () {
                        int[] upload_recipe1 = new int[] {0, 5, 1400, 5, 1, 1400, 0,                         };
                        int[] upload_recipe2 = new int[] {                          1, 1400, 0, 1, 1400, 0, 1};
                        int[] temp1 = new int[] {1};
                        int[] temp2;

                        // registers in debug access group:
                        // 0: state
                        // 1: run
                        // 2-3: total time minutes:total time seconds
                        // 4-6:   speed 1:time 1:ramp 1
                        // 7-9:   speed 2:time 2:ramp 2
                        // 10-12: speed 3:time 3:ramp 3
                        // 13-15: speed 4:time 4:ramp 4

                        try { Instrument.write_registers(2, 12800 + 2, upload_recipe1);
                        } catch( Exception e ) { e.printStackTrace(); }

                        try { Instrument.write_registers(2, 12800 + 9, upload_recipe2);
                        } catch( Exception e ) { Log.d("UPLOAD", "ERROR"); }

                        try { Instrument.write_registers(2, 12800 + 1, temp1);
                        } catch( Exception e ) { Log.d("UPLOAD", "ERROR"); }

                        Log.d("UPLOAD", "WROTE, NOW READING");

                        int my_state = 0;
                        int phase = 0;
                        runOnUiThread(new Runnable() { public void run() { set_interface("Loading Recipe...", ""); } });
                        try {
                            for (int i=0; i<1000; i++) {
                                temp1 = Instrument.read_registers(2, 12800+32, 2);
                                temp2 = Instrument.read_registers(4, 256, 2);
                                Log.d("DANS", "Read out from blender:" + Arrays.toString(temp1) + "/" + Arrays.toString(temp2));

                                switch (my_state) {
                                    case 0:
                                        if (temp1[1] == 4){ // as soon as it becomes 4, we're waiting for the user to press pulse
                                            runOnUiThread(new Runnable() { public void run() { set_interface("Press Pulse", ""); } });
                                            my_state++;
                                        }
                                        break;
                                    case 1:
                                        if (temp1[1] == 5){ // as soon as it becomes 5, tell user to press start - at this point, the phase value is changing, but 5 isn't
                                            runOnUiThread(new Runnable() { public void run() { set_interface("Press Start", ""); } });
                                            my_state++;
                                        }
                                        break;
                                    case 2:
                                        if (temp2[0] == 1){
                                            runOnUiThread(new Runnable() { public void run() { set_interface("Running Recipe", ""); } });
                                            my_state++;
                                        }
                                        break;
                                    case 3:
                                        if (temp2[0] != CONTROLLER_STATE_STOP){ my_state++; } break;
                                    case 4:
                                        if (temp2[0] != CONTROLLER_STATE_RUNNING){
                                            runOnUiThread(new Runnable() { public void run() { set_interface("Recipe Stopped", ""); } });
                                            my_state++;
                                            i = 2000; // end
                                        }
                                        break;
                                    default:
                                }
                            }
                        } catch (Exception e){
                            // problem occurred
                            Log.d("RUNNING", "state:" + e.toString());
                        }

                        runOnUiThread(new Runnable() {
                            public void run() {
                                btnGetVersions.setEnabled(true);
                                btnTestRegs.setEnabled(true);
                                btnRecipeUpload.setEnabled(true);
                                btnRecipe2Upload.setEnabled(true);
                                infiniteTest.setEnabled(true);
                                set_interface("Done!", "");
                            }
                        });
                    }

                }.start();
            }
        });

        // Set initial UI state
    }

    //UART service connected/disconnected
    private ServiceConnection mServiceConnection = new ServiceConnection() {
        public void onServiceConnected(ComponentName className, IBinder rawBinder) {
            mService = ((UartService.LocalBinder) rawBinder).getService();
            Log.d(TAG, "onServiceConnected mService= " + mService);
            if (!mService.initialize()) {
                Log.e(TAG, "Unable to initialize Bluetooth");
                finish();
            }
        }

        public void onServiceDisconnected(ComponentName classname) {
            mService = null;
        }
    };

    private void makeAndRunTask(int task){
        Myrunner = new AsyncTaskRunner();
        Myrunner.execute(task);
    }

    private void get_versions() {
        final Runnable r = new Runnable() {
            public void run() {
                new getVersionInfo().execute();
            }
        };
        mHandler.postDelayed(r, 1);
    }

    private Handler mHandler = new Handler() {
        @Override
        //Handler events that received from UART service
        public void handleMessage(Message msg) {
            Log.d("DAN", "Handler.handleMessage");
        }
    };

    private final BroadcastReceiver UARTStatusChangeReceiver = new BroadcastReceiver() {

        /* Below: handle the two types of commands I support right now
         *
         */
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();

            final Intent mIntent = intent;
            //*********************//
            if (action.equals(UartService.ACTION_GATT_CONNECTED)) {
                runOnUiThread(new Runnable() {
                    public void run() {
                        String currentDateTimeString = DateFormat.getTimeInstance().format(new Date());
                        Log.d(TAG, "UART_CONNECT_MSG");
                        btnConnectDisconnect.setText("Disconnect");
                        edtMessage.setEnabled(true);
                        btnSend.setEnabled(true);
                        btnGetVersions.setEnabled(true);
                        btnTestRegs.setEnabled(true);
                        btnRecipeUpload.setEnabled(true);
                        btnRecipe2Upload.setEnabled(true);
                        infiniteTest.setEnabled(true);
                        ((TextView) findViewById(R.id.deviceName)).setText(mDevice.getName() + " - ready");
                        mState = UART_PROFILE_CONNECTED;
                    }
                });
            }

            //*********************//
            if (action.equals(UartService.ACTION_GATT_DISCONNECTED)) {
                runOnUiThread(new Runnable() {
                    public void run() {
                        String currentDateTimeString = DateFormat.getTimeInstance().format(new Date());
                        Log.d(TAG, "UART_DISCONNECT_MSG");
                        btnConnectDisconnect.setText("Connect");
                        edtMessage.setEnabled(false);
                        btnSend.setEnabled(false);
                        btnGetVersions.setEnabled(false);
                        btnTestRegs.setEnabled(false);
                        btnRecipeUpload.setEnabled(false);
                        btnRecipe2Upload.setEnabled(false);
                        infiniteTest.setEnabled(false);
                        ((TextView) findViewById(R.id.deviceName)).setText("Not Connected");
                        mState = UART_PROFILE_DISCONNECTED;
                        mService.close();
                    }
                });
            }

            //*********************//
            if (action.equals(UartService.ACTION_GATT_SERVICES_DISCOVERED)) {
                mService.enableTXNotification();
            }
            //*********************//
            if (action.equals(UartService.ACTION_DATA_AVAILABLE)) {
                final byte[] txValue = intent.getByteArrayExtra(UartService.EXTRA_DATA);
                //Log.d("DANS", " ACTION_DATA_AVAILABLE " + Arrays.toString(txValue));
                queue_from_BLE.offer(txValue);
            }
            //*********************//
            if (action.equals(UartService.DEVICE_DOES_NOT_SUPPORT_UART)) {
                showMessage("Device doesn't support UART. Disconnecting");
                mService.disconnect();
            }
        }
    };

    private void service_init() {
        Intent bindIntent = new Intent(this, UartService.class);
        bindService(bindIntent, mServiceConnection, Context.BIND_AUTO_CREATE);
        LocalBroadcastManager.getInstance(this).registerReceiver(UARTStatusChangeReceiver, makeGattUpdateIntentFilter());
    }

    public void set_interface(String string1, String string2, String... strings){
        // arguments: variable length first 2 are required, rest are optional
        TextView status1 = (TextView) findViewById(R.id.status1);
        status1.setText(string1);
        TextView status2 = (TextView) findViewById(R.id.status2);
        status2.setText(string2);
        Resources res = getResources();
        int id;
        for (int i=0; i<strings.length; i++) {
            id = res.getIdentifier("line"+(i+1), "id", this.getPackageName());
            TextView thisView = (TextView) findViewById(id);
            thisView.setText(strings[i]);
        }
    }

    public void browser_send(int command, byte[] data, int expected) {
        //Basically forcing the android service to write
        if (sending) {
            Log.d("ERROR", " Error 4" + sending);
            throw new EmptyStackException();
        } else {
            sending = true;
            //Log.d("SENDING JAVA:", "" + Arrays.toString(data));
            handling_command = 0;
            expected_command = command; // what the receive side expects to receive
            expected_length = expected; // length of bytes, 2 + amount in last byte * 2
            last_sent = data;
            dstart = new Date();
            mService.writeRXCharacteristic(data);
        }
    }

    public void browser_resend() {
        // Basically forcing the android service to send again
        dstart = new Date();
        resends++;
        mService.writeRXCharacteristic(last_sent);
    }

    public void browser_received(){
        // this is kind of messy - called after I already parse the response
        if (!sending){
            Log.d("ERROR", " Error 5");
            throw new EmptyStackException();
        }
        dfinish = new Date();
        long timeDiff = Math.abs(dfinish.getTime() - dstart.getTime());
        long old_time = ble_rt_times_hist[ble_rt_times_hist_idx];
        ble_rt_times_hist_sum -= old_time;
        ble_rt_times_hist[ble_rt_times_hist_idx++] = timeDiff;
        ble_rt_times_hist_sum += timeDiff;
        ble_rt_times_hist_idx = ble_rt_times_hist_idx % 32; // wrap
        sending = false;
        Log.d("SENDING", " Set to false");
        handling_command = 0;
    }

    private static IntentFilter makeGattUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(UartService.ACTION_GATT_CONNECTED);
        intentFilter.addAction(UartService.ACTION_GATT_DISCONNECTED);
        intentFilter.addAction(UartService.ACTION_GATT_SERVICES_DISCOVERED);
        intentFilter.addAction(UartService.ACTION_DATA_AVAILABLE);
        intentFilter.addAction(UartService.DEVICE_DOES_NOT_SUPPORT_UART);
        return intentFilter;
    }

    @Override
    public void onStart() {
        super.onStart();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "onDestroy()");
        try {
            LocalBroadcastManager.getInstance(this).unregisterReceiver(UARTStatusChangeReceiver);
        } catch (Exception ignore) {
            Log.e(TAG, ignore.toString());
        }
        unbindService(mServiceConnection);
        mService.stopSelf();
        mService = null;
    }

    @Override
    protected void onStop() {
        Log.d(TAG, "onStop");
        super.onStop();
    }

    @Override
    protected void onPause() {
        Log.d(TAG, "onPause");
        super.onPause();
    }

    @Override
    protected void onRestart() {
        super.onRestart();
        Log.d(TAG, "onRestart");
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d(TAG, "onResume");
        if (!mBtAdapter.isEnabled()) {
            Log.i(TAG, "onResume - BT not enabled yet");
            Intent enableIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(enableIntent, REQUEST_ENABLE_BT);
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        switch (requestCode) {

            case REQUEST_SELECT_DEVICE:
                //When the DeviceListActivity return, with the selected device address
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String deviceAddress = data.getStringExtra(BluetoothDevice.EXTRA_DEVICE);
                    mDevice = BluetoothAdapter.getDefaultAdapter().getRemoteDevice(deviceAddress);

                    Log.d(TAG, "... onActivityResultdevice.address==" + mDevice + "mserviceValue" + mService);
                    ((TextView) findViewById(R.id.deviceName)).setText(mDevice.getName() + " - connecting");
                    mService.connect(deviceAddress);
                }
                break;
            case REQUEST_ENABLE_BT:
                // When the request to enable Bluetooth returns
                if (resultCode == Activity.RESULT_OK) {
                    Toast.makeText(this, "Bluetooth has turned on ", Toast.LENGTH_SHORT).show();
                } else {
                    // User did not enable Bluetooth or an error occurred
                    Log.d(TAG, "BT not enabled");
                    Toast.makeText(this, "Problem in BT Turning ON ", Toast.LENGTH_SHORT).show();
                    finish();
                }
                break;
            default:
                Log.e(TAG, "wrong request code");
                break;
        }
    }

    @Override
    public void onCheckedChanged(RadioGroup group, int checkedId) {
    }

    private void showMessage(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onBackPressed() {
        if (mState == UART_PROFILE_CONNECTED) {
            Intent startMain = new Intent(Intent.ACTION_MAIN);
            startMain.addCategory(Intent.CATEGORY_HOME);
            startMain.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(startMain);
            showMessage("nRFUART's running in background.\n             Disconnect to exit");
        } else {
            new AlertDialog.Builder(this)
                    .setIcon(android.R.drawable.ic_dialog_alert)
                    .setTitle(R.string.popup_title)
                    .setMessage(R.string.popup_message)
                    .setPositiveButton(R.string.popup_yes, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            finish();
                        }
                    })
                    .setNegativeButton(R.string.popup_no, null)
                    .show();
        }
    }

    private class AsyncTaskRunner extends AsyncTask<Integer, Void, int[]> {
        private int[] resp;

        @Override
        protected void onPreExecute() {
            // reserve the instrument?
            btnGetVersions.setEnabled(false);
            btnTestRegs.setEnabled(false);
            btnRecipeUpload.setEnabled(false);
            btnRecipe2Upload.setEnabled(false);
            infiniteTest.setEnabled(false);
            set_interface("Loading Recipe...", "");
        }

        @Override
        protected int[] doInBackground(Integer... params) {
            int[] temp;
            int[] upload_recipe1;
            int[] upload_recipe2;
            int[] temp1 = {1};
            resp = new int[20];
            switch (params[0]){
                case 1: // read out test registers
                    for (int i=1280; i<1300; i++) {
                        try {
                            temp = Instrument.read_registers(103, i, 1);
                            resp[i-1280] = temp[0];
                            Log.d("DAN3", "read out " + i + ": " + Arrays.toString(temp));
                        } catch (Exception e){
                            // the command timed out
                            resp[i-1280] = -1; // what to do here?
                        }
                    }
                    Log.d("DAN3", "read out: " + Arrays.toString(resp));
                    break;
                case 2: // write to test registers
                    for (int i=0; i<register_contents.length; i++){
                        register_contents[i] = register_contents[i] + 1;
                    }
                    temp = new int[6];
                    System.arraycopy(register_contents, 0, temp, 0, 6);
                    try {
                        Instrument.write_registers(103, 1280, temp);
                        Log.d("DAN3", "wrote out: " + Arrays.toString(register_contents));
                    } catch (Exception e){
                        // timed out
                        Log.d("DAN3", "ERROR AA");
                    }

                    System.arraycopy(register_contents, 6, temp, 0, 6);
                    try {
                        Instrument.write_registers(103, 1286, temp);
                        Log.d("DAN3", "wrote out: " + Arrays.toString(register_contents));
                    } catch (Exception e){
                        // timed out
                        Log.d("DAN3", "ERROR AA");
                    }

                    temp = new int[4];
                    System.arraycopy(register_contents, 12, temp, 0, 4);
                    try {
                        Instrument.write_registers(103, 1292, temp);
                        Log.d("DAN3", "wrote out: " + Arrays.toString(register_contents));
                    } catch (Exception e){
                        // timed out
                        Log.d("DAN3", "ERROR AA");
                    }

                    break;
                case 3: // run a recipe
                    upload_recipe1 = new int[]{0,5, 1400,5,1, 1400,0,                      };
                    upload_recipe2 = new int[]{                      1, 1400,0,1, 1400,0,1 };
                    temp1 = new int[]{1};
                    // registers in debug access group:
                    // 0: state
                    // 1: run
                    // 2-3: total time minutes:total time seconds
                    // 4-6:   speed 1:time 1:ramp 1
                    // 7-9:   speed 2:time 2:ramp 2
                    // 10-12: speed 3:time 3:ramp 3
                    // 13-15: speed 4:time 4:ramp 4
                    try { Instrument.write_registers(2, 12800 + 2,  upload_recipe1);
                    } catch (Exception e){ Log.d("UPLOAD", "ERROR"); }
                    try { Instrument.write_registers(2, 12800 + 9,  upload_recipe2);
                    } catch (Exception e){ Log.d("UPLOAD", "ERROR"); }

                    try { Instrument.write_registers(2, 12800 + 1,  temp1);
                    } catch (Exception e){ Log.d("UPLOAD", "ERROR"); }

                    break;
                case 4: // run a different recipe
                    upload_recipe1 = new int[]{0,10, 1400,5,1, 5000,5,                     };
                    upload_recipe2 = new int[]{                      1, 1400,0,1, 1400,0,1 };
                    temp1 = new int[]{1};
                    // registers in debug access group:
                    // 0: state
                    // 1: run
                    // 2-3: total time minutes:total time seconds
                    // 4-6:   speed 1:time 1:ramp 1
                    // 7-9:   speed 2:time 2:ramp 2
                    // 10-12: speed 3:time 3:ramp 3
                    // 13-15: speed 4:time 4:ramp 4
                    try { Instrument.write_registers(2, 12800 + 2,  upload_recipe1);
                    } catch (Exception e){ Log.d("UPLOAD", "ERROR"); }
                    try { Instrument.write_registers(2, 12800 + 9,  upload_recipe2);
                    } catch (Exception e){ Log.d("UPLOAD", "ERROR"); }

                    try { Instrument.write_registers(2, 12800 + 1,  temp1);
                    } catch (Exception e){ Log.d("UPLOAD", "ERROR"); }

                    break;
                default:
                    break;
            }
            return resp;
        }

        @Override
        protected void onPostExecute(int[] result) {
            btnGetVersions.setEnabled(true);
            btnTestRegs.setEnabled(true);
            btnRecipeUpload.setEnabled(true);
            btnRecipe2Upload.setEnabled(true);
            infiniteTest.setEnabled(true);
            ((TextView) findViewById(R.id.status1)).setText("");
        }
    }

    private class getVersionInfo extends AsyncTask<Void, Void, int[]> {
        int[] resp;
        int[] eeprom;
        @Override
        protected void onPreExecute() {
            btnGetVersions.setEnabled(false);
            btnTestRegs.setEnabled(false);
            btnRecipeUpload.setEnabled(false);
            btnRecipe2Upload.setEnabled(false);
            set_interface("Reading versions...", "");
        }

        @Override
        protected int[] doInBackground(Void... params) {
            int[] temp;
            resp = new int[12];
            try {
                temp = Instrument.read_registers(2, 1, 2);
                resp[0] = temp[0];
                resp[1] = temp[1];
            } catch (Exception e){
                Log.d("DANS", " I failed " + e.toString());
            }

            try {
                temp = Instrument.read_registers(2, 2048+24, 3); // thread data version
                resp[2] = temp[0];
                resp[3] = temp[1];
                resp[4] = temp[2];
            } catch (Exception e){
                Log.d("DANS", " I failed " + e.toString());
            }

            try {
                temp = Instrument.read_registers(3, 1, 2);
                resp[5] = temp[0];
                resp[6] = temp[1];
            } catch (Exception e){
                Log.d("DANS", " I failed " + e.toString());
            }

            try {
                temp = Instrument.read_registers(4, 1, 2);
                resp[7] = temp[0];
                resp[8] = temp[1];
            } catch (Exception e){
                Log.d("DANS", " I failed " + e.toString());
            }

            try {
                temp = Instrument.read_registers(103, 1, 2);
                resp[9] = temp[0];
                resp[10] = temp[1];
            } catch (Exception e){
                Log.d("DANS", " I failed " + e.toString());
            }

            //Here we add the cool stuff...
            try {
                int[] result = Instrument.read_eeprom(0, 4);
                eeprom = Instrument.read_all();
                resp[11] = result[0];

            } catch (Exception e){
                Log.d("DANS", " I failed " + e.toString());
            }
            return resp;
        }

        @Override
        protected void onPostExecute(int[] result) {
            Log.d("DAN!!", " HELLO!! ");
            btnGetVersions.setEnabled(true);
            btnTestRegs.setEnabled(true);
            btnRecipeUpload.setEnabled(true);
            btnRecipe2Upload.setEnabled(true);
            infiniteTest.setEnabled(true);

            set_interface("Reading versions...Done", "",
                "Eeprom" + Arrays.toString(eeprom),
                "SAMD version: " +          result[0] + "." + result[1],
                "Thread version: " +        result[2] + "." + result[3] + (result[4] == 1 ? 'N' : ' '),
                "NXP version: " +           result[5] + "." + result[6],
                "Nordic version: " +        result[7] + "." + result[8],
                "Nordic direct version: " + result[9] + "." + result[10]
            );
        }
    }

    class modbusInstrument {
        static private final int MODBUS_READ = 2;
        static private final int MODBUS_WRITE = 1;
        private int timeout;
        byte[] rr_values = new byte[5];
        byte[] wr_values;
        modbusInstrument(int mytimeout){
            timeout = mytimeout;
        }

        public int[] read_registers(int slave_address, int register_address, int length) throws InterruptedException,TimeoutException {
            // I think the timeout is a misnomer - the panel will update the registers regardless, unless the slave device is not there (I think)

            // data expected by Nordic:
            // [command (2=read),
            //  slave_address,
            //  address / 256 (reg_address MSB),
            //  address % 256 (reg_address LSB),
            //  size];
            rr_values[0] = MODBUS_READ; // read command
            rr_values[1] = (byte) slave_address;
            rr_values[2] = (byte) (register_address / 256);
            rr_values[3] = (byte) (register_address % 256);
            rr_values[4] = (byte) length;
            try {
                queue_from_BLE.remove(); // first make sure the queue is empty - needed?
            } catch (Exception e){
                //Log.d("DAN READ_REGS", " Step 1 ");
            }
            browser_send(MODBUS_READ, rr_values, (length * 2) + 2); // send how many bytes I expect to receive back

            int[] ret_values = new int[2];
            while (errors_allowed > 0) {
                byte[] resp_vals = queue_from_BLE.poll(timeout, TimeUnit.MILLISECONDS); // allow this to throw an exception - timeout

                // Expected response from Nordic for a Read command: [cmd] [status] [reg1msb] [reg1lsb] ...
                // Error Response:                                   [cmd] [status]
                // If status is not 0, it means an error occurred:
                //  11 = during read, slave address wrong
                //  12 = during read, function code wrong
                //  13 = during read, register address wrong
                //  14 = during read, length wrong
                //  20 = character timeout occurred (25ms according to panel_base wiring)

                if (handling_command != 0) {
                    Log.d("DAN READ_REGS", " Step 3 ");
                    throw new EmptyStackException();
                }
                handling_command = MODBUS_READ;
                //Log.d("DANS READ_REGS", " Step 4 (Received)" + Arrays.toString(resp_vals));
                ret_values = new int[(resp_vals.length - 2) / 2]; // just register contents, nothing else
                if (resp_vals[1] != 0) { // status is not 0, error
                    if (errors_allowed > 0) {
                        // can retry a few times
                        Log.d("DANS READ_REGS RETRY", " Step 5." + errors_allowed);
                        errors_allowed--;
                        handling_command = 0;
                        browser_resend();
                        Log.d("DANS", "RETRYING");
                    } else {
                        // notify user of error
                        errors_allowed = DEFAULT_ALLOWED_ERRORS;
                        browser_received();
                        throw new TimeoutException();
                    }
                } else {
                    errors_allowed = DEFAULT_ALLOWED_ERRORS;
                    for (int i = 0; i < ret_values.length; i++) {
                        // make the proper array
                        //Log.d("DANS", "looping " + i + " " + Arrays.toString(resp_vals) + " " + Arrays.toString(ret_values));
                        int tmp = (0xff & (int) resp_vals[2 + (i * 2)]) +
                                ((0xff & (int) resp_vals[2 + (i * 2) + 1]) << 8);
                        if (tmp == 0xffff) {
                            //tmp = -1;
                        }
                        ret_values[i] = tmp;
                    }
                    browser_received();
                    return ret_values;
                }
            }
            return ret_values;
        }

        public void write_registers(int slave_address, int register_address, int[] values) throws InterruptedException,TimeoutException {
            // data expected by Nordic
            // [command (1=write),
            //  slave_address,
            //  address / 256 (reg_address MSB),
            //  address % 256 (reg_address LSB),
            //  vals]; - length of vals determines size
            // since an rx characterisitc can transfer up to 18 bytes, we can transfer no more than (18 - 5) / 2 = 6 registers at a time!
            wr_values = new byte[values.length * 2 + 5];
            wr_values[0] = MODBUS_WRITE; // write command
            wr_values[1] = (byte) slave_address;
            wr_values[2] = (byte) (register_address / 256);
            wr_values[3] = (byte) (register_address % 256);
            wr_values[4] = (byte) values.length;
            for (int i = 0; i < values.length; i++) {
                int temp = values[i];
                wr_values[5 + (2 * i)] = (byte) (temp & 0xFF);
                wr_values[6 + (2 * i)] = (byte) ((temp >> 8) & 0xFF);
            }
            try {
                queue_from_BLE.remove(); // first make sure the queue is empty - needed?
            } catch (Exception e){
                Log.d("DAN READ_REGS", " Step 1 ");
            }
            browser_send(MODBUS_WRITE, wr_values, values.length); // problem?
            wr_values = queue_from_BLE.poll(timeout, TimeUnit.MILLISECONDS); // this can throw an exception for timeout
            Log.d("DANS WRITE_REGS", " Step 1 ");
            int[] txValues;
            if (handling_command != 0){
                Log.d("ERROR", " Error 1");
                throw new EmptyStackException();
            }
            handling_command = MODBUS_WRITE;
            Log.d("DANS WRITE_REGS", " Step 2 (Received)" + Arrays.toString(wr_values));

            // Expected response from Nordic for a Write command: [status]
            // If status is not 0, it means an error occurred:
            // 15 = during write, slave address wrong
            // 16 = during write, function code wrong
            // 17 = during write, register address wrong
            // 18 = during write, crc wrong
            // 19 = during write, length is wrong
            // 20 = character timeout occurred (25ms according to panel_base wiring)

            if (wr_values[0] != 0) { // status is not 0, error
                if (errors_allowed > 0){
                    // can retry a few times
                    Log.d("DANS WRITE_REGS RETRY", " Step 4." + errors_allowed);
                    errors_allowed--;
                    browser_resend();
                }else{
                    // notify user of error
                    errors_allowed = DEFAULT_ALLOWED_ERRORS;
                    Log.d("DANS WRITE_REGS", " Step 5 Calling browser_received ");
                    browser_received();
                    throw new TimeoutException();
                }
            } else {
                browser_received();
            }
        }

        public void write_register(int slave_address, int register_address, int value) throws InterruptedException,TimeoutException {
            int [] myvalues = new int[1];
            myvalues[0] = value;
            write_registers(slave_address, register_address, myvalues);
        }

        public int read_register(int slave_address, int register_address) throws InterruptedException,TimeoutException {
            int[] results = read_registers(slave_address, register_address, 1);
            return results[0];
        }

        public void write_eeprom(int eeprom_address, int[] values) throws InterruptedException,TimeoutException {

        }
        public int[] read_eeprom(int eeprom_address, int length) throws InterruptedException,TimeoutException {
            int[] results;
            write_register(3, 1536 + 0, eeprom_address);
            write_register(3, 1536 + 1, length);
            write_register(3, 1536 + 2, 2); //Start the read
            while(read_register(3, 1536+3) != 0); //Wait for it to complete
            results = read_registers(3, 1536+128, length/2);
            return results;
        }
        public int[] read_all() throws InterruptedException,TimeoutException {
            int i;
            int[] all = new int[64];
            for(i=0;i<64;i++){
                int[] temp = new int[4];
                int results;
                temp = read_eeprom(i*4, 4);
                results = temp[0] | temp[1]*256*256;
                all[i] = results;
            }
            return all;
        }
    }
}
