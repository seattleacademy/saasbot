var nodeimu = require('nodeimu');
var IMU = new nodeimu.IMU();
var WebSocketServer = require('ws').Server;
var http = require('http');
var express = require('express');
var serveIndex = require('serve-index')

var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.text({ type: "*/*" }));

var robotData = {};
robotData.counter = 0;
robotData.timestamp = Date.now();
robotData.phoneSensors = {};
var networkInterfaces = require('os').networkInterfaces();
robotData.address = networkInterfaces.wlan0[0].address;
robotData.port = robotData.address.split('.')[3] + '001';
robotData.mac = networkInterfaces.wlan0[0].mac;
robotData.odometer = 0;

var irobot = require('./irobot');
//Comment out one of the two lines below
var robot = new irobot.Robot('/dev/ttyUSB0', { baudrate: 115200 }); //for create2
//var robot = new irobot.Robot('/dev/ttyUSB0'); //for create1
phoneSensors = {};

robot.on('sensordata', function(data) {
    //console.log(JSON.stringify(data, null, 4));
    robotData.data = JSON.parse(JSON.stringify(data));
    robotData.odometer += data.state.distance.millimeters;
    if (data.state.mode.off) robotData.mode = 'off';
    if (data.state.mode.passive) robotData.mode = 'passive';
    if (data.state.mode.safe) robotData.mode = 'safe';
    if (data.state.mode.full) robotData.mode = 'full';
    robotData.battery = data.battery.voltage.volts;
    robotData.amps = data.battery.current.amps;
    robotData.recharging = data.battery.charging.recharging;
    robotData.home_base = data.battery.charging.from.home_base;
    robotData.bumper_left = data.bumpers.left.activated;
    robotData.bumper_right = data.bumpers.right.activated;
    robotData.cliff_left = data.cliff_sensors.left.signal.raw;
    robotData.cliff_front_left = data.cliff_sensors.front_left.signal.raw;
    robotData.cliff_front_right = data.cliff_sensors.front_right.signal.raw;
    robotData.cliff_right = data.cliff_sensors.right.signal.raw;
    robotData.vL = data.state.requested_left_velocity;
    robotData.vR = data.state.requested_right_velocity;
    //console.log(robotData);
    //Stop a bot that has not been reached for 5 seconds.
    if ((Date.now() - robotData.timestamp) > 5000)
        robot.drive({ left: '0', right: '0' });
});

function getRobotSensors() {
    robotData.counter++;
    robotData.timestamp = Date.now();
    //console.log(robotData);
    return JSON.stringify(robotData);
}

app.all('/robotsensors', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(getRobotSensors());
});


app.all('/drive', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (robotData.mode == "passive") robot.safeMode();
    console.log(req.body);
    console.log(JSON.parse(req.body));
    robot.drive(JSON.parse(req.body));
    res.send();
    // console.log(JSON.stringify(sensors, null, 4));

});

app.all('/sing', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (robotData.mode == "passive") robot.safeMode();
    song = JSON.parse(req.body).song;
    song = song.replace(/\s/g, '');
    song = JSON.parse(song);
    console.log('song', song)
    robot.sing(song);
    res.send();
});


app.all('/setRTS', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    //if (robotData.mode == "passive") robot.safeMode();
    robot.setRTS();
    res.send();
    // console.log(JSON.stringify(sensors, null, 4));

});

app.all('/full', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    robot.fullMode();
    res.send();

});

app.all('/safe', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    robot.safeMode();
    res.send();

});

app.all('/passive', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    robot.passiveMode();
    res.send();

});


app.all('/dock', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    robot.dock();
    res.send();

});

app.all('/reset', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    robot.reset();
    res.send();

});

app.all('/halt', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    robot.halt();
    res.send();

});

app.all('/phone', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    phoneSensors = JSON.parse(req.body);
    res.send();
});

port = robotData.port;
var sensors = {};
counter = 0;
//app.use(express.static(__dirname + '/public'));
app.use('', express.static('public', { 'index': false }), serveIndex('public', { 'icons': false }))

var server = http.createServer(app);
server.listen(port);
console.log('listening on port', port)

function getData() {
    IMU.getValue(function(err, data) {
        if (err) throw err;
        sensors = data;
        sensors.counter = counter++;
        getRobotSensors();
        sensors.battery = robotData.battery;
        sensors.amps = robotData.amps;
        sensors.recharging = robotData.recharging;
        sensors.home_base = robotData.home_base;
        sensors.odometer = robotData.odometer
        sensors.vL = robotData.vL
        sensors.vR = robotData.vR
        sensors.cliff_left = robotData.cliff_left
        sensors.cliff_front_left = robotData.cliff_front_left
        sensors.cliff_front_right = robotData.cliff_front_right
        sensors.cliff_right = robotData.cliff_right
        sensors.mode = robotData.mode

        // console.log(phoneSensors);
        for (key in phoneSensors) {
            sensors[key] = phoneSensors[key]; // copies each property to the objCopy object
        }
        // console.log(JSON.stringify(robotData, null, 4));
    });
}
getData();
setInterval(getData, 100); //less that 25ms is erratic

app.all('/all', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(JSON.stringify(sensors));
});

app.all('/heading', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    heading = ((sensors.tiltHeading + Math.PI / 2) * 180 / Math.PI).toFixed(0);
    res.send(heading.toString());
});

app.all('/counter', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(sensors.counter.toString());
});

var wss = new WebSocketServer({ server: server });
wss.on('connection', function(ws) {
    var id = setInterval(function() {
        ws.send(JSON.stringify(sensors), function() { /* ignore errors */ });
    }, 100);
    console.log('connection to client');
    ws.on('close', function() {
        console.log('closing client');
        clearInterval(id);
    });
});