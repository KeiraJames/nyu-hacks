document.addEventListener('DOMContentLoaded', () => {

    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const statusElement = document.getElementById('status');
    const joinButton = document.getElementById('joinButton');
    const endCallButton = document.getElementById('endCallButton');
    const roomInput = document.getElementById('roomInput');
    const userRoleInput = document.getElementById('userRoleInput');
    const nextLineButton = document.getElementById('nextLineButton');

    const userRole = userRoleInput ? userRoleInput.value : 'Parent';

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

    const CHARACTER_IMAGES = {
        "Starlight": "/images/characters/starlight.png",
        "Moon": "/images/characters/moon.png",
        "Freddy": "/images/characters/freddy.png",
        "Turtle": "/images/characters/turtle.png",
        "Leo": "/images/characters/leo.png",
        "Pencil": "/images/characters/pencil.png"
    };

    let stories = [];
    let currentStoryIndex = 0;
    let currentLineIndex = 0;
    let storyActive = false;

    const storyDisplayEl = statusElement;
    let typingInterval = null;

    
    const CHAR1_VOICE = "vGQNBgLaiM3EdZtxIiuY";
    const CHAR2_VOICE = "nDJIICjR9zfJExIFeSCN";
    

    function getSelectedStoryIndex() {
        const raw = localStorage.getItem('selectedStory');
        const n = parseInt(raw ?? '0', 10);
        if (Number.isNaN(n) || n < 0) return 0;
        return n;
    }

    function updateStatus(msg) {
        if (!storyActive && statusElement) {
            statusElement.textContent = msg;
        }
    }

    function typeText(element, text, speedMs) {
        if (!element) return;
        if (typingInterval) clearInterval(typingInterval);
        element.textContent = "";
        let i = 0;
        typingInterval = setInterval(() => {
            element.textContent += text[i];
            i++;
            if (i >= text.length) {
                clearInterval(typingInterval);
                typingInterval = null;
            }
        }, speedMs);
    }

    function activateSpeakingAvatar(key) {
        char1AvatarImg?.classList.remove('speaking');
        char2AvatarImg?.classList.remove('speaking');
        if (key === "char1") char1AvatarImg?.classList.add('speaking');
        if (key === "char2") char2AvatarImg?.classList.add('speaking');
    }

    function stopSpeakingAvatar() {
        char1AvatarImg?.classList.remove('speaking');
        char2AvatarImg?.classList.remove('speaking');
    }

    // ————————————————————————————————————————
    // KID-FRIENDLY FALLBACK BROWSER VOICE
    // ————————————————————————————————————————

    function getBestKidVoice() {
        let voices = speechSynthesis.getVoices();
        if (!voices.length) return null;

        let preferred = [
            "Google UK English Female",
            "Google US English",
            "Google",
            "Microsoft Aria",
            "female"
        ];

        for (let p of preferred) {
            let found = voices.find(v => v.name.includes(p));
            if (found) return found;
        }

        return voices[0];
    }

    function speakFallbackVoice(text) {
        return new Promise(resolve => {
            const utter = new SpeechSynthesisUtterance(text);
            const v = getBestKidVoice();
            if (v) utter.voice = v;

            utter.pitch = 1.15;
            utter.rate = 0.92;
            utter.volume = 1;

            utter.onend = () => resolve();
            speechSynthesis.speak(utter);
        });
    }

    // ————————————————————————————————————————
    // ELEVANLABS TTS 
    // ————————————————————————————————————————
    
    async function fetchTTSBuffer(lineObj) {
        try {
            const res = await fetch("/tts", {...});
            return await res.arrayBuffer();
        } catch (_) { return null; }
    }
    
    // ————————————————————————————————————————

    // CHILD — CHARACTER LINES 
    async function showCharacterLineChild(lineObj) {
        if (!storyDisplayEl) return;

        storyDisplayEl.style.color = "#d62828";
        storyDisplayEl.textContent = "...";

        activateSpeakingAvatar(lineObj.speaker);

        //  type slightly faster now (110ms)
        typeText(storyDisplayEl, lineObj.line, 105);

        
        await speakFallbackVoice(lineObj.line);

        stopSpeakingAvatar();
    }

    function showLine(lineObj) {
        if (!storyDisplayEl) return;

        if (userRole === "Child" && lineObj.speaker !== "narrator") {
            showCharacterLineChild(lineObj);
            return;
        }

        storyDisplayEl.style.color =
            lineObj.speaker === "narrator" ? "#1f2937" : "#d62828";

        typeText(storyDisplayEl, lineObj.line, 55);

        if (userRole === "Child") stopSpeakingAvatar();
    }

    async function loadStories() {
        const res = await fetch('/stories');
        stories = await res.json();
        currentStoryIndex = getSelectedStoryIndex();
        if (userRole === "Child") setupChildCharacters();
    }

    function setupChildCharacters() {
        if (!stories.length) return;
        const story = stories[currentStoryIndex];
        if (!story) return;

        const { char1_name, char2_name } = story.characters;

        char1AvatarImg.src = CHARACTER_IMAGES[char1_name] || "";
        char2AvatarImg.src = CHARACTER_IMAGES[char2_name] || "";

        char1NameLabel.textContent = char1_name;
        char2NameLabel.textContent = char2_name;
    }

    async function startStoryIfReady() {
        if (storyActive || userRole !== "Parent") return;
        if (!stories.length) await loadStories();
        if (!stories.length) return;

        storyActive = true;
        currentLineIndex = 0;
        advanceStory();
    }

    function advanceStory() {
        if (userRole !== "Parent") return;
        if (!stories.length) return;

        const story = stories[currentStoryIndex];
        if (!story.script || currentLineIndex >= story.script.length) {
            storyDisplayEl.textContent = "The end.";
            storyActive = false;
            return;
        }

        const line = story.script[currentLineIndex];
        showLine(line);

        if (socket && room) socket.emit('story_line', { room, line });

        if (line.speaker === "narrator") return;

        const baseDuration = Math.max(1800, line.line.length * 60);
        const delayAfterSpeech = 4000;
        const total = baseDuration + delayAfterSpeech;

        currentLineIndex++;
        setTimeout(() => storyActive && advanceStory(), total);
    }

    loadStories();

    // ————————————————————————————————————————
    //  WEBRTC SECTION — UNTOUCHED
    // ————————————————————————————————————————

    function sendMessage(msg) {
        if (socket) socket.emit('message', msg);
    }

    async function getMedia() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            updateStatus("Local media acquired.");
            return true;
        } catch {
            updateStatus("ERROR: Could not access camera/mic.");
            return false;
        }
    }

    function initializePeerConnection(isOfferer) {
        if (pc || !localStream) return;

        pc = new RTCPeerConnection(configuration);
        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

        pc.onicecandidate = e => {
            if (e.candidate) {
                sendMessage({
                    type: "candidate",
                    sdpMid: e.candidate.sdpMid,
                    sdpMLineIndex: e.candidate.sdpMLineIndex,
                    candidate: e.candidate.candidate
                });
            }
        };

        pc.ontrack = e => {
            if (remoteVideo.srcObject !== e.streams[0]) {
                remoteVideo.srcObject = e.streams[0];
            }
        };

        if (isOfferer) createOffer();
    }

    async function createOffer() {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendMessage(offer);
    }

    async function joinRoom() {
        room = roomInput.value.trim();
        if (!room) return updateStatus("Enter room name.");

        joinButton.disabled = true;
        roomInput.disabled = true;

        updateStatus(`Joining ${room}...`);

        const ok = await getMedia();
        if (!ok) return;

        if (socket) socket.emit("create or join", room, userRole);

        endCallButton.style.display = "inline-block";
    }

    function endCall(notify = true) {
        if (pc) pc.close();
        pc = null;

        localStream?.getTracks().forEach(t => t.stop());
        localStream = null;

        localVideo.srcObject = null;
        remoteVideo.srcObject = null;

        joinButton.disabled = false;
        roomInput.disabled = false;
        endCallButton.style.display = "none";

        storyActive = false;
        currentLineIndex = 0;
        stopSpeakingAvatar();
        if (typingInterval) clearInterval(typingInterval);

        if (notify && socket && room) socket.emit("end_call", room);
    }

    if (socket) {
        socket.on("connect", () => updateStatus("Connected."));
        socket.on("role_assigned", r => room = r);
        socket.on("join", () => initializePeerConnection(userRole === "Parent"));

        socket.on("message", msg => {
            if (!msg || !msg.type) return;

            if (msg.type === "offer") {
                const wait = () => {
                    if (!localStream) return setTimeout(wait, 100);
                    initializePeerConnection(false);
                    pc.setRemoteDescription(new RTCSessionDescription(msg));
                    pc.createAnswer().then(a => {
                        pc.setLocalDescription(a);
                        sendMessage(a);
                    });
                    if (userRole === "Parent") startStoryIfReady();
                };
                wait();
            }

            if (msg.type === "answer") {
                pc?.setRemoteDescription(new RTCSessionDescription(msg));
                if (userRole === "Parent") startStoryIfReady();
            }

            if (msg.type === "candidate") {
                pc?.addIceCandidate(new RTCIceCandidate(msg));
            }
        });

        socket.on("story_line", line => showLine(line));
        socket.on("call_ended", () => endCall(false));
    }

    joinButton?.addEventListener("click", joinRoom);
    endCallButton?.addEventListener("click", () => endCall(true));

    nextLineButton?.addEventListener("click", () => {
        if (userRole !== "Parent") return;
        if (!storyActive) return;

        const script = stories[currentStoryIndex].script;
        const line = script[currentLineIndex];

        if (line.speaker === "narrator") {
            currentLineIndex++;
            advanceStory();
        }
    });

    if (userRole === "Parent") joinButton.click();

    window.addEventListener("beforeunload", () => {
        socket?.close();
        endCall(false);
    });
});
