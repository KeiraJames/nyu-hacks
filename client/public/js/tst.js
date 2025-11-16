document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTS ---
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusElement = document.getElementById('status');
    const joinButton = document.getElementById('joinButton');
    const endCallButton = document.getElementById('endCallButton');
    const roomInput = document.getElementById('roomInput');
    const userRoleInput = document.getElementById('userRoleInput');
    const nextLineButton = document.getElementById('nextLineButton'); // parent only

    const userRole = userRoleInput ? userRoleInput.value : 'Parent';

    // Child avatar elements (only exist on child page)
    const char1AvatarImg = document.getElementById('char1Avatar');
    const char2AvatarImg = document.getElementById('char2Avatar');
    const char1NameLabel = document.getElementById('char1Name');
    const char2NameLabel = document.getElementById('char2Name');

    let room = null;
    let pc = null;
    let localStream = null;

    const serverUrl = window.location.protocol + '//' + window.location.host;
    const socket = (typeof io !== 'undefined') ? io(serverUrl) : null;

    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    // --- CHARACTER IMAGE MAP ---
    // Make sure you have 512x512 PNGs at these paths:
    // /images/characters/starlight.png, moon.png, freddy.png, turtle.png, leo.png, pencil.png
    const CHARACTER_IMAGES = {
        "Starlight": "/images/characters/starlight.png",
        "Moon": "/images/characters/moon.png",
        "Freddy": "/images/characters/freddy.png",
        "Turtle": "/images/characters/turtle.png",
        "Leo": "/images/characters/leo.png",
        "Pencil": "/images/characters/pencil.png",
    };

    // --- STORY STATE ---
    let stories = [];
    let currentStoryIndex = 0;
    let currentLineIndex = 0;
    let storyActive = false;

    const storyDisplayEl = statusElement;

    const TYPE_SPEED = 55; // slower, storybook feel

    // Prevent overlapping typing animations
    let typingInterval = null;

    // --- HELPERS ---

    function getSelectedStoryIndex() {
        const raw = localStorage.getItem('selectedStory');
        const n = parseInt(raw ?? '0', 10);
        if (Number.isNaN(n) || n < 0) return 0;
        return n;
    }

    function updateStatus(msg) {
        console.log('[status]', msg);
        // Don't overwrite story text while story is active
        if (!storyActive && statusElement) {
            statusElement.textContent = msg;
        }
    }

    function typeText(element, text, speed = TYPE_SPEED) {
        if (!element) return;

        // Stop previous animation
        if (typingInterval) {
            clearInterval(typingInterval);
            typingInterval = null;
        }

        element.textContent = '';
        let i = 0;

        typingInterval = setInterval(() => {
            element.textContent += text[i];
            i++;

            if (i >= text.length) {
                clearInterval(typingInterval);
                typingInterval = null;
            }
        }, speed);
    }

    function speakCharacter(lineObj) {
        if (!('speechSynthesis' in window)) return;
        if (!lineObj || !lineObj.line) return;

        const utter = new SpeechSynthesisUtterance(lineObj.line);

        if (lineObj.speaker === 'char1') {
            utter.pitch = 1.3;
            utter.rate = 1.02;
        } else if (lineObj.speaker === 'char2') {
            utter.pitch = 0.85;
            utter.rate = 0.98;
        }

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    }

    function activateSpeakingAvatar(speakerKey) {
        if (!char1AvatarImg || !char2AvatarImg) return;

        char1AvatarImg.classList.remove('speaking');
        char2AvatarImg.classList.remove('speaking');

        if (speakerKey === 'char1') {
            char1AvatarImg.classList.add('speaking');
        } else if (speakerKey === 'char2') {
            char2AvatarImg.classList.add('speaking');
        }
    }

    function stopSpeakingAvatar() {
        if (char1AvatarImg) char1AvatarImg.classList.remove('speaking');
        if (char2AvatarImg) char2AvatarImg.classList.remove('speaking');
    }

    function showLine(lineObj) {
        if (!storyDisplayEl || !lineObj) return;

        // Style narrator vs character
        if (lineObj.speaker === 'narrator') {
            storyDisplayEl.style.color = '#1f2937';
        } else {
            storyDisplayEl.style.color = '#d62828';
        }

        typeText(storyDisplayEl, lineObj.line);

        // Child: handle TTS + avatar animation for character lines
        if (userRole === 'Child') {
            if (lineObj.speaker === 'char1' || lineObj.speaker === 'char2') {
                speakCharacter(lineObj);
                activateSpeakingAvatar(lineObj.speaker);

                const duration = Math.max(2000, lineObj.line.length * 70);
                setTimeout(() => {
                    stopSpeakingAvatar();
                }, duration);
            } else {
                // narrator line
                stopSpeakingAvatar();
            }
        }
    }

    async function loadStories() {
        try {
            const res = await fetch('/stories');
            stories = await res.json();
            console.log("Stories loaded:", stories);

            // Set story index from selection
            const chosen = getSelectedStoryIndex();
            if (stories.length > 0) {
                currentStoryIndex = Math.min(Math.max(chosen, 0), stories.length - 1);
            } else {
                currentStoryIndex = 0;
            }

            if (userRole === 'Child') {
                setupChildCharacters();
            }
        } catch (err) {
            console.error("Failed to load stories:", err);
        }
    }

    function setupChildCharacters() {
        if (!stories.length) return;

        const story = stories[currentStoryIndex];
        if (!story || !story.characters) return;

        const { char1_name, char2_name } = story.characters;

        const char1ImgPath = CHARACTER_IMAGES[char1_name] || "/images/characters/default1.png";
        const char2ImgPath = CHARACTER_IMAGES[char2_name] || "/images/characters/default2.png";

        if (char1AvatarImg) {
            char1AvatarImg.src = char1ImgPath;
            char1AvatarImg.alt = char1_name || 'Character 1';
        }
        if (char2AvatarImg) {
            char2AvatarImg.src = char2ImgPath;
            char2AvatarImg.alt = char2_name || 'Character 2';
        }
        if (char1NameLabel && char1_name) char1NameLabel.textContent = char1_name;
        if (char2NameLabel && char2_name) char2NameLabel.textContent = char2_name;
    }

    async function startStoryIfReady() {
        if (storyActive || userRole !== 'Parent') return;

        if (!stories.length) {
            await loadStories();
        }
        if (!stories.length) return;

        // currentStoryIndex already set from selectedStory in loadStories
        storyActive = true;
        currentLineIndex = 0;

        advanceStory();
    }

    function advanceStory() {
        if (userRole !== 'Parent') return;
        if (!stories.length) return;

        const story = stories[currentStoryIndex];
        if (!story || !story.script || currentLineIndex >= story.script.length) {
            storyActive = false;
            if (storyDisplayEl) storyDisplayEl.textContent = "The end.";
            return;
        }

        const lineObj = story.script[currentLineIndex];

        // Keep storyActive true for both sides so status updates don't overwrite text
        storyActive = true;

        // Show on parent
        showLine(lineObj);

        // Send to child
        if (socket && room) {
            socket.emit('story_line', { room, line: lineObj });
        }

        // Narrator waits for "Next line" button
        if (lineObj.speaker === 'narrator') {
            return;
        }

        // Character lines auto-advance
        const duration = Math.max(1800, lineObj.line.length * 60);
        currentLineIndex++;
        setTimeout(() => {
            if (storyActive) {
                advanceStory();
            }
        }, duration);
    }

    // Kick off initial story load in the background
    loadStories();

    // --- WEBRTC / SIGNALING HELPERS ---

    function sendMessage(message) {
        if (socket) socket.emit('message', message);
        console.log('Sent message:', message.type || message);
    }

    async function getMedia() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (localVideo) localVideo.srcObject = localStream;
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
            if (remoteVideo && remoteVideo.srcObject !== event.streams[0]) {
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

        if (!socket) {
            updateStatus('Socket.IO not available.');
            return;
        }

        socket.emit('create or join', room, userRole);
        if (endCallButton) endCallButton.style.display = 'inline-block';
    }

    function endCall(notifyServer = true) {
        if (pc) {
            pc.close();
            pc = null;
        }

        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }

        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;

        if (joinButton) joinButton.disabled = false;
        if (roomInput) roomInput.disabled = false;
        if (endCallButton) endCallButton.style.display = 'none';

        storyActive = false;
        currentLineIndex = 0;

        if (typingInterval) {
            clearInterval(typingInterval);
            typingInterval = null;
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        stopSpeakingAvatar();

        if (notifyServer && socket && room) {
            socket.emit('end_call', room);
            updateStatus('Call ended. Ready to start/join again.');
        } else {
            updateStatus('Call ended.');
        }
    }

    // --- SOCKET.IO HANDLERS ---

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
                const waitForMedia = async () => {
                    if (!localStream) {
                        return setTimeout(waitForMedia, 100);
                    }

                    if (!pc) initializePeerConnection(false);

                    await pc.setRemoteDescription(new RTCSessionDescription(message));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendMessage(answer);
                    updateStatus('Answer sent — connection established.');

                    if (userRole === 'Parent') {
                        startStoryIfReady();
                    }
                };
                waitForMedia();

            } else if (message.type === 'answer') {
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(message));
                    updateStatus('Answer received — connection established.');
                    if (userRole === 'Parent') {
                        startStoryIfReady();
                    }
                }

            } else if (message.type === 'candidate') {
                if (pc) {
                    try {
                        await pc.addIceCandidate(
                            new RTCIceCandidate({
                                sdpMid: message.sdpMid,
                                sdpMLineIndex: message.sdpMLineIndex,
                                candidate: message.candidate
                            })
                        );
                        updateStatus('ICE candidate added.');
                    } catch (err) {
                        console.error("ICE add error:", err);
                    }
                }

            } else if (message.type === 'full') {
                updateStatus(`Room ${room} is full.`);
                room = null;
            }
        });

        socket.on('story_line', (lineObj) => {
            // When story lines arrive on child, mark story as active so status logs don't overwrite text
            storyActive = true;
            showLine(lineObj);
        });

        socket.on('call_ended', () => endCall(false));

        socket.on('disconnect', () => updateStatus('Disconnected from server.'));
    }

    // --- UI EVENTS ---

    if (joinButton) joinButton.addEventListener('click', joinRoom);
    if (endCallButton) endCallButton.addEventListener('click', () => endCall(true));

    // Parent narrator "Next line" button
    if (nextLineButton && userRole === 'Parent') {
        nextLineButton.addEventListener('click', () => {
            if (!storyActive || !stories.length) return;
            const story = stories[currentStoryIndex];
            if (!story || !story.script || currentLineIndex >= story.script.length) return;

            const currentLine = story.script[currentLineIndex];
            if (currentLine.speaker === 'narrator') {
                currentLineIndex++;
                advanceStory();
            }
        });
    }

    // Auto-start for Parent
    if (userRole === 'Parent' && joinButton) {
        joinButton.click();
    }

    // Clean-up on page unload
    window.addEventListener('beforeunload', () => {
        if (socket) socket.close();
        endCall(false);
    });
});
