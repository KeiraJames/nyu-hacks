document.addEventListener('DOMContentLoaded', () => {


    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusElement = document.getElementById('status');
    const joinButton = document.getElementById('joinButton');
    const endCallButton = document.getElementById('endCallButton');
    const roomInput = document.getElementById('roomInput');
    const userRoleInput = document.getElementById('userRoleInput');
    
    const userRole = userRoleInput ? userRoleInput.value : 'Parent';
    let room = null;
    let pc = null;
    let localStream = null;

    const serverUrl = window.location.protocol + '//' + window.location.host;
    const socket = io ? io(serverUrl) : null;
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    function updateStatus(msg) {
        if (statusElement) statusElement.textContent = msg;
        console.log('[status]', msg);
    }

    function sendMessage(message) {
        if (socket) socket.emit('message', message);
        console.log('Sent message:', message.type || message);
    }

    async function getMedia() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            updateStatus('Local media stream acquired.');
            return true;
        } catch (err) {
            console.error('getUserMedia error:', err);
            updateStatus('ERROR: Could not access camera/mic.');
            return false;
        }
    }

    function initializePeerConnection(isOfferer) {
        if (pc) return;
        if (!localStream) return;

        pc = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendMessage({
                    type: 'candidate',
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    candidate: event.candidate.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            if (remoteVideo.srcObject !== event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                updateStatus('Remote stream received — call active.');
            }
        };

        if (isOfferer) createOffer();
    }

    async function createOffer() {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendMessage(offer);
            updateStatus('Offer created and sent.');
        } catch (err) {
            console.error('createOffer error', err);
        }
    }

    async function joinRoom() {
        room = roomInput ? roomInput.value.trim() : 'default-room';
        if (!room) {
            updateStatus('Please enter a room name.');
            return;
        }

        updateStatus(`Joining room: ${room} ...`);
        if (joinButton) joinButton.disabled = true;
        if (roomInput) roomInput.disabled = true;

        const ok = await getMedia();
        if (!ok) {
            if (joinButton) joinButton.disabled = false;
            if (roomInput) roomInput.disabled = false;
            return;
        }

        if (!socket) return updateStatus('Socket.IO not available.');

        socket.emit('create or join', room, userRole);
        if (endCallButton) endCallButton.style.display = 'inline-block';
    }

    function endCall(notifyServer = true) {
        if (pc) { pc.close(); pc = null; }
        if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;

        if (joinButton) joinButton.disabled = false;
        if (roomInput) roomInput.disabled = false;
        if (endCallButton) endCallButton.style.display = 'none';

        if (notifyServer && socket && room) {
            socket.emit('end_call', room);
            updateStatus('Call ended. Ready to start/join again.');
        } else {
            updateStatus('Call ended.');
        }
    }

   
    if (socket) {
        socket.on('connect', () => updateStatus('Connected to signaling server. Ready.'));
        
        socket.on('role_assigned', (roomName, id, role) => {
            room = roomName;
            updateStatus(`Role assigned: ${role} in '${roomName}'.`);
        });

        socket.on('join', (joinedRoom) => {
            updateStatus(`Peer joined ${joinedRoom}. Starting negotiation...`);
            initializePeerConnection(userRole === 'Parent');
        });

        socket.on('message', async (message) => {
            if (!message || !message.type) return;

            if (message.type === 'offer') {
                const tryProcess = async () => {
                    if (!localStream) { setTimeout(tryProcess, 100); return; }
                    if (!pc) initializePeerConnection(false);
                    await pc.setRemoteDescription(new RTCSessionDescription(message));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendMessage(pc.localDescription);
                    updateStatus('Answer sent — connection established.');
                };
                tryProcess();

            } else if (message.type === 'answer') {
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(message));
                    updateStatus('Answer received — connection established.');
                }
            } else if (message.type === 'candidate') {
                if (pc) {
                    const cand = new RTCIceCandidate({
                        sdpMid: message.sdpMid,
                        sdpMLineIndex: message.sdpMLineIndex,
                        candidate: message.candidate
                    });
                    await pc.addIceCandidate(cand).catch(e => console.error(e));
                    updateStatus('ICE candidate added.');
                }
            } else if (message.type === 'full') {
                updateStatus(`Room ${room} is full.`);
                room = null;
            }
        });

        socket.on('call_ended', () => endCall(false));
        socket.on('disconnect', () => updateStatus('Disconnected from server.'));
    }

    // --- Event Listeners ---
    if (joinButton) joinButton.addEventListener('click', joinRoom);
    if (endCallButton) endCallButton.addEventListener('click', () => endCall(true));

    // --- Auto-start for Parent ---
    if (userRole === 'Parent') joinRoom();

    // Clean-up on page unload
    window.addEventListener('beforeunload', () => {
        if (socket) socket.close();
        endCall(false);
    });
});
