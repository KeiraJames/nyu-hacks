const serverUrl = window.location.protocol + "//" + window.location.host;
const socket = io(serverUrl);

function sendMessage(msg) {
    console.log("Client sending:", msg.type || msg);
    socket.emit("message", msg);
}

export default {
    socket,
    sendMessage
};
