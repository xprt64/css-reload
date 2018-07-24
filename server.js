/*
 * Copyright (c) 2018. Constantin Galbenu <xprt64@gmail.com> Toate drepturile rezervate. All rights reserved.
 */

var http = require("http");
var url = require('url');
var express = require('express');
var chokidar = require('chokidar');
var fs = require('fs');

var clients = {};
var clientsLength = 0;
var i = 0;	//debug variable
var listenersManager;

var SSE_PORT = 6971;
var HTTP_PORT = 8080;

const clientJs = fs.readFileSync('client.js');

http.createServer(function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'text/javascript',
        'Content-Length': clientJs.length,
        'Cache-Control': 'public; max-age=31536000'
    });
    response.end(clientJs, 'utf-8');
}).listen(HTTP_PORT);

// One-liner for current directory, ignores .dotfiles
chokidar.watch('/watch', {ignored: /(^|[\/\\])\../}).on('all', (event, path) => {
    console.log(event, path);
    broadcast(event, path);
});

function broadcast(eventType, filename) {
    for (var j in clients) {
        if (!clients.hasOwnProperty(j))
            continue;
        var client = clients[j];
        client.sendEvent({type: eventType, filename: filename});
    }
}


/*******************************************
 * Keep alive pinging
 */
setInterval(sendKeepAlive, 10 * 1000);

/**************************
 * The event listeners manager
 */

listenersManager = http.createServer(function (req, response) {
    try {
        var sock = req.connection;
        var client_id = sock.remoteAddress + ':' + sock.remotePort + '#' + Math.random();
        var url_parts = url.parse(req.url, true);

        console.log("new client request registration:" + sock.remoteAddress + ':' + sock.remotePort);

        createClient(client_id, response);

        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        sock.on('close', function () {
            console.log("client closed:" + client_id);
            removeClient(client_id);
        });

        sock.on('end', function () {
            console.log("client ended:" + client_id);
            removeClient(client_id);
        });

        sock.on('error', function () {
            console.log("error event:" + client_id);
            removeClient(client_id);
        });
    }
    catch (e) {
        response.writeHead(400, {
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        response.write(`${e}`);
        response.end();
    }
});

listenersManager.listen(SSE_PORT, '0.0.0.0');

function removeClient(clientId) {

    if (clientId in clients) {
        delete clients[clientId];
        clientsLength--;
        pecho("client left: " + clientId + ", remaining " + clientsLength);
    }
}

function pecho(s) {
    console.log(s);
}

function createClient(clientId, response) {
    //acum putem sa adaugam clientul in lista
    clients[clientId] = new Client(response, clientId);
    clientsLength++;
    console.log("clientsLength:" + clientsLength);
}

function sendKeepAlive() {
    for (var j in clients) {
        if (!clients.hasOwnProperty(j))
            continue;

        var client = clients[j];

        client.response.write(": keep alive\n");

        console.log("pinged client #" + j);
    }
}

function Client(response, userId, clientId) {
    this.response = response;
    this.clientId = clientId;
}

Client.prototype.sendEvent = function (json) {
    this.response.write('event: ' + (json.type || 'ping') + "\n");
    if (json.id)
        this.response.write('id: ' + json.id + "\n");
    this.response.write('data: ' + JSON.stringify(json) + "\n\n");

    console.log("forwarded to client #" + this.clientId);
}