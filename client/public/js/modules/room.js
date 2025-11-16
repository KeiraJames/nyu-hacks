import socketModule from "./socket.js";
import rtcModule from "./rtc.js";

let setRoleCb;
let updateStatusCb;
let attachRemoteCb;

function setupRoom({ setRole, updateStatus, attachRemote }) {
    setRoleCb = setRole;
    updateStatusCb = updateStatus;
    attachRemoteCb = attachRemote;

    const socket = socketModule.socket;

    socket.on("role_assigned", (roomName, id, role) => {
        setRoleCb(role);

        updateStatusCb(
            role === "Parent"
                ? "Room created. Waiting for Child..."
                : "Joined room. Waiting for signal..."
        );
    });

    socket.on("join", () => {
        updateStatusCb("Both users present. Starting WebRTC...");
        rtcModule.initializePeerConnection(
            setRoleCb() === "Parent",
            updateStatusCb,
            attachRemoteCb
        );
    });

    socket.on("message", msg => handleMessage(msg));
}

async function handleMessage(msg) {
    const pc = rtcModule.pc;

    if (msg.type === "offer") {
        await handleOffer(msg);
        return;
    }

    if (msg.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg));
        updateStatusCb("Connected!");
        return;
    }

    if (msg.type === "candidate") {
        if (!pc) return;
        await pc.addIceCandidate(msg).catch(console.error);
    }
}

async function handleOffer(msg) {
    const wait = () => {
        if (!rtcModule.localStream) return setTimeout(wait, 100);

        if (!rtcModule.pc) {
            rtcModule.initializePeerConnection(
                false,
                updateStatusCb,
                attachRemoteCb
            );
        }

        rtcModule.pc.setRemoteDescription(new RTCSessionDescription(msg)).then(
            async () => {
                const answer = await rtcModule.pc.createAnswer();
                await rtcModule.pc.setLocalDescription(answer);
                socketModule.sendMessage(answer);
            }
        );
    };

    wait();
}

export default {
    setupRoom
};
