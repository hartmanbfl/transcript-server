const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

const {setupDeepgram, shutdownDeepgram, getCurrentDeepgramState, sendStreamToDeepgram, abortStream} = require('./deepgram');

app.use(cors());

const io = new Server(server, {
    path: '/socket.io',
    cors: {
        origin: "*"
    }
});

const url = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";

let deepgram;

// Webserver
app.use(express.static("public/"));
app.get('/', (req, res) => {
  res.sendFile(__dirname, + '/public/index.html');
});



io.on('connection', (socket) => {
    console.log(`Client connected to our socket.io server`);
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    // Deepgram Controls
    socket.on('deepgram_connect', () => {
        console.log(`Deepgram connect requested`);
        deepgram = setupDeepgram(socket);
    });
    socket.on('deepgram_disconnect', () => {
        console.log(`Deepgram disconnect requested`);
        shutdownDeepgram(deepgram);
    });
    socket.on('deepgram_state', () => {
        console.log(`Deepgram state requested`);
        const state = getCurrentDeepgramState(deepgram);
        console.log(`Current state of deepgram is: ${state}`);
    });

    // Streaming Controls
    socket.on('streaming_start', () => {
        sendStreamToDeepgram(deepgram, url);
    });
    socket.on('streaming_stop', () => {
        abortStream(); 
    });

    // Messages
    socket.on('transcript', (transcript) => {
        // Does not go to originator
//        socket.broadcast.to().emit('transcript', transcript);
        io.emit('transcript', transcript);
        console.log(`Transcript received by server: ${transcript}`);
    });

    socket.on('chat_message', (msg) => {
        console.log(`message: ${msg}`);
        // Goes to everyone, including the originator
        io.emit('chat_message', msg);
    });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});