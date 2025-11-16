import errorLogger from "./logger.js";
import socketModule from "./socket.js";

let pc = null;
let localStream = null;

const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function getMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        return localStream;
    } catch (err) {
        errorLogger("Media error:", err);
        return null;
    }
}

function initializePeerConnection(isOfferer, updateStatus, attachRemote) {
    if (pc || !localStream) return;

    pc = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = e => {
        if (e.candidate) {
            socketModule.sendMessage({
                type: "candidate",
                sdpMid: e.candidate.sdpMid,
                sdpMLineIndex: e.candidate.sdpMLineIndex,
                candidate: e.candidate.candidate
            });
        }
    };

    pc.ontrack = e => {
        attachRemote(e.streams[0]);
        updateStatus("Video Call Active!");
    };

    if (isOfferer) createOffer(updateStatus);
}

async function createOffer(updateStatus) {
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketModule.sendMessage(offer);
        updateStatus("Offer sent. Waiting for answer...");
    } catch (err) {
        errorLogger("Offer error:", err);
    }
}

export default {
    getMedia,
    initializePeerConnection,
    createOffer,
    get pc() {
        return pc;
    },
    get localStream() {
        return localStream;
    }
};
