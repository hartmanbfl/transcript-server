const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

const {transcriptSubject} = require('./globals');
const { setupDeepgram, shutdownDeepgram, getCurrentDeepgramState, 
    sendStreamToDeepgram, abortStream } = require('./deepgram');
const { registerForTranscripts, addTranslationLanguage } = require('./translate');

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

// Register the translation service to receive the transcripts
registerForTranscripts(io);

io.on('connection', (socket) => {
    console.log(`Client connected to our socket.io server`);
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    // Deepgram Controls
    socket.on('deepgram_connect', () => {
        console.log(`Deepgram connect requested`);
        deepgram = setupDeepgram();
        deepgram.addListener("transcriptReceived", (message) => {
            const data = JSON.parse(message);
            const { type } = data;
            switch (type) {
                case "Results":
                    console.log("deepgram: transcript received");
                    const transcript = data.channel.alternatives[0].transcript ?? "";
                    transcriptSubject.next(transcript);
                    io.emit("transcript", transcript);
                    break;
                case "Metadata":
                    console.log("deepgram: metadata received");
                    break;
                default:
                    console.log("deepgram: unknown packet received");
                    break;
            }
        });

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

    // Translation Rooms
    socket.on('subscribe', (channel) => {
        console.log(`Subscribed call to room: ${channel}`);
        socket.join(channel);
        addTranslationLanguage(channel);
        console.log(`Current rooms: ${JSON.stringify(socket.rooms)}`);
    });
    socket.on('unsubscribe', (channel) => {
        socket.leave(channel);
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