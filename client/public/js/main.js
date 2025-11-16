import rtcModule from "./modules/rtc.js";
import roomModule from "./modules/room.js";
import socketModule from "./modules/socket.js";


document.addEventListener("DOMContentLoaded", () => {
 
    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");
    const statusElement = document.getElementById("status");
    const roleDisplay = document.getElementById("role-display");
    const joinButton = document.getElementById("joinButton");
    const roomInput = document.getElementById("roomInput");

    let userRole = null;

    
    function updateStatus(message) {
        statusElement.textContent = message;
    }

    function setRole(role) {
        userRole = role;
        roleDisplay.textContent = `Role: ${role}`;
        return role; 
    }

    function attachRemoteStream(stream) {
        remoteVideo.srcObject = stream;
    }

    roomModule.setupRoom({
        setRole,
        updateStatus,
        attachRemote: attachRemoteStream
    });

  
    joinButton.addEventListener("click", async () => {
        const room = roomInput.value.trim();
        if (!room) {
            updateStatus("Enter a valid room name");
            return;
        }

        joinButton.disabled = true;
        roomInput.disabled = true;

        const stream = await rtcModule.getMedia();
        if (!stream) {
           
            joinButton.disabled = false;
            roomInput.disabled = false;
            return;
        }

        
        localVideo.srcObject = stream;

        
        socketModule.socket.emit("create or join", room);

        updateStatus(`Joining room "${room}"...`);
    });

    
    updateStatus("Ready to start or join a call.");
});
