// client/public/js/webrtc-connection.js

// Use DOMContentLoaded to ensure elements are available before script execution
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusElement = document.getElementById('status');
    const roleDisplayElement = document.getElementById('role-display');
    const joinButton = document.getElementById('joinButton');
    const roomInput = document.getElementById('roomInput');
    const endCallButton = document.getElementById('endCallButton');

    // Role-specific view containers
    const userRoleInput = document.getElementById('userRoleInput');
    const parentView = document.getElementById('parent-view');
    const childView = document.getElementById('child-view');
    const parentStoryDisplay = document.getElementById('parent-story-display');
    const nextLineButton = document.getElementById('nextLineButton');


    // --- Global WebRTC and Socket Variables ---
    const serverUrl = window.location.protocol + '//' + window.location.host; 
    const socket = io(serverUrl);
    const configuration = { 
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] 
    };
    
    let pc; 
    let localStream; 
    let room; 
    
    // CRITICAL: Read the role directly from the hidden input on the specific page
    const userRole = userRoleInput ? userRoleInput.value : null; 

    // --- Initialization & UI Setup ---
    
    // Set up the initial view based on the role read from the HTML page
    if (userRole === 'Parent') {
        parentView.style.display = 'block';
        childView.style.display = 'none';
        roleDisplayElement.textContent = `Role: Parent`;
    } else if (userRole === 'Child') {
        parentView.style.display = 'none';
        childView.style.display = 'block';
        roleDisplayElement.textContent = `Role: Child`;
    }
    
    // --- Utility Functions ---
    function updateStatus(message) {
        statusElement.textContent = message;
    }

    function sendMessage(message) {
        console.log('Client sending message:', message.type || message);
        socket.emit('message', message);
    }
    
    // --- End Call Function ---
    function endCall(notifyServer = true) {
        if (pc) {
            pc.close();
            pc = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        // Reset UI state
        localVideo.srcObject = null;
        remoteVideo.srcObject = null;
        joinButton.disabled = false;
        roomInput.disabled = false;
        endCallButton.style.display = 'none';
        
        // Notify the server if this user initiated the disconnect
        if (notifyServer) {
            socket.emit('end_call', room);
            updateStatus('Call ended. Enter a room to start a new call.');
        } else {
             updateStatus('Call ended by the other user.');
        }
    }

    // --- Core WebRTC Functions ---
    
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
    
    // --- Room Joining Entry Point ---
    async function joinRoom() {
        room = roomInput.value.trim();
        if (room === '') {
            updateStatus('Please enter a valid room name.');
            return;
        }
        if (!userRole) {
            updateStatus('Error: Role not defined. Please refresh from landing page.');
            return;
        }
        
        updateStatus(`Attempting to join room: ${room}...`);
        joinButton.disabled = true;
        roomInput.disabled = true;

        const mediaReady = await getMedia();

        if (mediaReady) {
            // Send the explicit role to the server
            socket.emit('create or join', room, userRole); 
            endCallButton.style.display = 'block'; 
        } else {
            // Re-enable button if media access failed
            joinButton.disabled = false;
            roomInput.disabled = false;
        }
       
    }

    // --- Socket.IO Handlers ---

    // Sets the role based on server acceptance (mostly confirmation now)
    socket.on('role_assigned', (roomName, id, role) => {
        console.log(`Role accepted: ${role} in room ${roomName}`);
        room = roomName;
        
        if (role === 'Parent') {
            updateStatus(`Room '${roomName}' created. You are the Parent (Initiator). Waiting for Child...`);
        } else {
             updateStatus(`Joined room '${roomName}'. You are the Child (Answerer). Waiting for Parent...`);
        }
    });

    // Triggered when the second user joins
    socket.on('join', (room) => {
         console.log(`Another user joined the room ${room}. Starting negotiation.`);
         updateStatus(`The ${userRole === 'Parent' ? 'Child' : 'Parent'} has joined. Starting WebRTC connection...`);
         
         // Start negotiation immediately
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

    // Handle remote peer ending the call
    socket.on('call_ended', () => {
        console.log("Remote peer ended the call.");
        endCall(false); 
    });
    
    // --- Event Listeners ---
    joinButton.addEventListener('click', joinRoom);
    endCallButton.addEventListener('click', () => { endCall(true); }); 

    // Placeholder for Next Line button logic (to be added)
    nextLineButton?.addEventListener('click', () => {
         if (userRole === 'Parent') {
             console.log("Next Line button clicked. Ready to send sync signal.");
             // socket.emit('next_line', room); // Logic to be implemented next
         }
    });
    
    window.onload = () => {
         updateStatus('Server connected. Ready to start/join a call.');
    };
});