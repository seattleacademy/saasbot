var http = require('http');
var express = require('express');
var serveIndex = require('serve-index')

var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.text({ type: "*/*" }));

var robotData = {};
robotData.counter = 0;
robotData.timestamp = Date.now();
robotData.odometer = 0;

var networkInterfaces = require('os').networkInterfaces();
robotData.address = networkInterfaces.eno1[0].address;
robotData.port = 1500;
robotData.mac = networkInterfaces.eno1[0].mac;
robotData.x = 100;
robotData.y = 50;

function getRobotSensors() {
    robotData.counter++;
    robotData.timestamp = Date.now();
    return JSON.stringify(robotData);
}

app.all('/robotsensors', function(req, res) {
    //res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(getRobotSensors());
});

app.all('/setbot', function(req, res) {
    //res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.query.x) {
        robotData.x = req.query.x;
    }
    if (req.query.y) {
        robotData.y = req.query.y;
    }
    res.send(getRobotSensors());
});


app.use('', express.static('public', { 'index': false }), serveIndex('public', { 'icons': false }))

var server = http.createServer(app);
server.listen(robotData.port);
console.log('ip', robotData.address, 'port', robotData.port)


app.all('/all', function(req, res) {
    //res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(JSON.stringify(robotData));
});



app.all('/counter', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    robotData.counter = robotData.counter + 1;
    res.send(robotData.counter.toString());
});