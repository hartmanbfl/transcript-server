const { Deepgram } = require("@deepgram/sdk");
const client = new Deepgram(process.env.DEEPGRAM_API_KEY);

let keepAlive;

const setupDeepgram = () => {
    const deepgramLive = client.transcription.live({
        language: "en",
        smart_format: true,
        interim_results: false,
        model: "nova"
    });

    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
        console.log("deepgram: keepalive");
        deepgramLive.keepAlive();
    }, 10 * 1000);

    // Listeners
    deepgramLive.addListener("close", () => {
        console.log(`Connection to deepgram closed`);
    });
//    deepgramLive.addListener("transcriptReceived", (message) => {
//        const data = JSON.parse(message);
//        const { type } = data;
//      switch (type) {
//        case "Results":
//          console.log("deepgram: transcript received");
//          const transcript = data.channel.alternatives[0].transcript ?? "";
//          socket.emit("transcript", transcript);
//          break;
//        case "Metadata":
//          console.log("deepgram: metadata received");
//          break;
//        default:
//          console.log("deepgram: unknown packet received");
//          break;
//      }
//    });
    return deepgramLive;
}

const getCurrentDeepgramState = (deepgram) => {
    return deepgram.getReadyState();
}

const shutdownDeepgram = (deepgram) => {
    clearInterval(keepAlive);
    deepgram.finish();
}

let aborter;
function abortStream() {
  aborter.abort();
}
async function sendStreamToDeepgram(deepgramLive, url) {
    aborter = new AbortController();
    const signal = aborter.signal;
    try {
        const response = await fetch(url, { signal });
        const body = response.body;
        const reader = body.getReader();
        while (true) {
            if (signal.aborted) throw signal.reason;
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            if (deepgramLive.getReadyState() === 1) {
                deepgramLive.send(value);
            }
        }
    } catch (e) {
        console.log(e);
    }
}

module.exports = {
    abortStream,
    getCurrentDeepgramState,
    setupDeepgram,
    sendStreamToDeepgram,
    shutdownDeepgram
}