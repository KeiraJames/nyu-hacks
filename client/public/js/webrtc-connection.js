document.addEventListener('DOMContentLoaded', () => {


    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusElement = document.getElementById('status');
    const roleDisplayElement = document.getElementById('role-display');
    const joinButton = document.getElementById('joinButton');
    const roomInput = document.getElementById('roomInput');
    const endCallButton = document.getElementById('endCallButton'); 

   
    const serverUrl = window.location.protocol + '//' + window.location.host; 
    const socket = io(serverUrl);
    const configuration = { 
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] 
    };
    
    let pc; 
    let localStream; 
    let room; 
    let userRole; 


    function updateStatus(message) {
        statusElement.textContent = message;
    }

    function sendMessage(message) {
        console.log('Client sending message:', message.type || message);
        socket.emit('message', message);
    }
    
    
    function endCall(notifyServer = true) {
        if (pc) {
            pc.close();
            pc = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
       
        localVideo.srcObject = null;
        remoteVideo.srcObject = null;
        joinButton.disabled = false;
        roomInput.disabled = false;
        endCallButton.style.display = 'none';
        
        
        if (notifyServer) {
            socket.emit('end_call', room);
            updateStatus('Call ended. Enter a room to start a new call.');
        } else {
             updateStatus('Call ended by the other user.');
        }
    }


    
    async function getMedia() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            localVideo.srcObject = localStream;
            return true;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            updateStatus('ERROR: Could not access camera/mic.');
            return false;
        }
    }

    function initializePeerConnection(isOfferer) {
        if (pc || !localStream) {
            console.warn('PC initialization aborted: already initialized or missing local stream.');
            return;
        }
        
        pc = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });

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
                console.log('Remote stream received.');
                updateStatus('Video Call Active!');
            }
        };
        
        if (isOfferer) {
            createOffer();
        }
    }

    async function createOffer() {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendMessage(offer);
            updateStatus('Offer created and sent. Waiting for remote answer...');
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }

    async function joinRoom() {
        room = roomInput.value.trim();
        if (room === '') {
            updateStatus('Please enter a valid room name.');
            return;
        }
        
        updateStatus(`Attempting to join room: ${room}...`);
        joinButton.disabled = true;
        roomInput.disabled = true;

        const mediaReady = await getMedia();

        if (mediaReady) {
            socket.emit('create or join', room);
            endCallButton.style.display = 'block'; 
        } else {
           
            joinButton.disabled = false;
            roomInput.disabled = false;
        }
       
    }

    

   
    socket.on('role_assigned', (roomName, id, role) => {
        console.log(`Role assigned: ${role} in room ${roomName}`);
        room = roomName;
        userRole = role; 
        roleDisplayElement.textContent = `Role: ${role}`;
        
        if (role === 'Parent') {
            updateStatus(`Room '${roomName}' created. You are the Parent (Initiator). Waiting for Child...`);
        } else {
             updateStatus(`Joined room '${roomName}'. You are the Child (Answerer). Waiting for signal...`);
        }
    });

    
    socket.on('join', (room) => {
         console.log(`Another user joined the room ${room}. Starting negotiation.`);
         updateStatus(`The ${userRole === 'Parent' ? 'Child' : 'Parent'} has joined. Starting WebRTC connection...`);
         
        
         initializePeerConnection(userRole === 'Parent'); 
    });
    
    socket.on('message', async (message) => {
        console.log('Client received message:', message.type || message);

        if (message.type === 'offer') {
            const processOffer = async () => {
                if (!localStream) {
                    console.log("Receiver: Local stream not ready. Retrying offer processing in 100ms...");
                    setTimeout(processOffer, 100);
                    return;
                }
                if (!pc) {
                     initializePeerConnection(false); 
                }
                
                await pc.setRemoteDescription(new RTCSessionDescription(message));
                updateStatus('Received Offer. Creating Answer...');
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                
                sendMessage(pc.localDescription);
            };
            processOffer();

        } else if (message.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(message));
            updateStatus('Connection established! Video stream starting.');

        } else if (message.type === 'candidate') {
            if (!pc) {
                console.error("Received ICE candidate before RTCPeerConnection initialized.");
                return;
            }
            const candidate = new RTCIceCandidate({
                sdpMid: message.sdpMid,
                sdpMLineIndex: message.sdpMLineIndex,
                candidate: message.candidate
            });
            await pc.addIceCandidate(candidate).catch(e => console.error('Error adding received ICE candidate:', e));
            updateStatus('ICE candidate added.');
        } else if (message.type === 'full') {
            updateStatus(`Room ${room} is full! Please try a different room name.`);
            room = null; 
        }
    });

    
    socket.on('call_ended', () => {
        console.log("Remote peer ended the call.");
        endCall(false); 
    });
    
 
    joinButton.addEventListener('click', joinRoom);
    endCallButton.addEventListener('click', () => { endCall(true); }); 
    
    window.onload = () => {
         updateStatus('Server connected. Ready to start/join a call.');
    };
});