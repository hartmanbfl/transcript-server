window.addEventListener("load", () => {

    var socket = io();

    var messages = document.getElementById('messages');
    var form = document.getElementById('form');
    var input = document.getElementById('input');
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (input.value) {
            socket.emit('chat_message', input.value);
            input.value = '';
        }
    });

    let deepgramConnect = document.getElementById('deepConnect');
    let deepgramDisconnect = document.getElementById('deepDisconnect');
    let startStreaming = document.getElementById('streamStart');
    let stopStreaming = document.getElementById('streamStop');

    deepgramConnect.addEventListener("click", function() {
        socket.emit('deepgram_connect');
    });
    deepgramDisconnect.addEventListener("click", function() {
        socket.emit('deepgram_disconnect');
    });
    startStreaming.addEventListener("click", function() {
        socket.emit('streaming_start');
    });
    stopStreaming.addEventListener("click", function() {
        socket.emit('streaming_stop');
    });

    socket.on('transcript', function (msg) {
        var item = document.createElement('li');
        item.textContent = msg;
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });
})