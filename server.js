/*
 * Copyright (c) 2018. Constantin Galbenu <xprt64@gmail.com> Toate drepturile rezervate. All rights reserved.
 */

var url = require('url');
var chokidar = require('chokidar');
var fs = require('fs');

var clients = {};
var clientsLength = 0;
var i = 0;	//debug variable

var SSE_PORT = process.env.SSE_PORT;
var SSE_PORT_SECURE = process.env.SSE_PORT_SECURE;
var HTTP_PORT = process.env.HTTP_PORT;
var HTTPS_PORT = process.env.HTTPS_PORT;

const clientJs = fs.readFileSync('client.js').toString()
    .replace(/__HOST__/g, process.env.SSE_HOST)
    .replace(/__PORT__/g, process.env.SSE_PORT)
    .replace(/__SECURE_PORT__/g, process.env.SSE_PORT_SECURE)
;

const useHttps = fs.existsSync('/run/secrets/site.key') && fs.existsSync('/run/secrets/site.crt');

console.log('useHttps', useHttps);



const options = useHttps ? {
    key: fs.readFileSync('/run/secrets/site.key'),
    cert: fs.readFileSync('/run/secrets/site.crt')
} : {};


require("http")
    .createServer(serverFunction)
    .listen(HTTP_PORT, '0.0.0.0')
    .on("listening", () => console.log(`HTTP listening on ${SSE_PORT}`) );


if (useHttps) {
    require("https")
        .createServer(options, serverFunction)
        .listen(HTTPS_PORT, '0.0.0.0')
        .on("listening", () => console.log(`HTTPS listening on ${HTTPS_PORT}`));

}

var http = useHttps ? require("https") : require("http");

function serverFunction(request, response) {
    response.writeHead(200, {
        'Content-Type': 'text/javascript',
        'Content-Length': clientJs.length,
        'Cache-Control': 'public; max-age=31536000'
    });
    response.end(clientJs, 'utf-8');
}

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


require("http")
    .createServer(sseServerFunction)
    .listen(SSE_PORT, '0.0.0.0')
    .on("listening", () => console.log(`HTTP listening on ${SSE_PORT}`) );

if (useHttps) {
    require("https")
        .createServer(options, sseServerFunction)
        .listen(SSE_PORT_SECURE, '0.0.0.0')
        .on("listening", () => console.log(`HTTPS listening on ${SSE_PORT_SECURE}`));

}

function sseServerFunction(req, response) {
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
    } catch (e) {
        response.writeHead(400, {
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        response.write(`${e}`);
        response.end();
    }
};
/**************************
 * The event listeners manager
 */


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