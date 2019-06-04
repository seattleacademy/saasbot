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
var networkInterfaces = require('os').networkInterfaces();
robotData.address = networkInterfaces.wlan0[0].address;
robotData.port = robotData.address.split('.')[3] + '001';
robotData.mac = networkInterfaces.wlan0[0].mac;
robotData.odometer = 0;

function getRobotSensors() {
    robotData.counter++;
    robotData.timestamp = Date.now();
    return JSON.stringify(robotData);
}

app.all('/robotsensors', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(getRobotSensors());
});

app.all('/drive', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    console.log(req.body);
    console.log(JSON.parse(req.body));
    res.send();
});

app.all('/sing', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    song = JSON.parse(req.body).song;
    song = song.replace(/\s/g, '');
    song = JSON.parse(song);
    console.log('song', song)
    res.send();
    // console.log(JSON.stringify(sensors, null, 4));

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
        sensors.battery = 0;
        sensors.odometer = 0;
        sensors.vL = 0;
        sensors.vR = 0;
        sensors.cliff_left = 0;
        sensors.cliff_front_left = 0;
        sensors.cliff_front_right = 0;
        sensors.cliff_right = 0;
        sensors.mode = 0;

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