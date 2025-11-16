# 📖 FaceyBuk ✨

An interactive, real-time storytelling application that connects parents and children through shared reading experiences, no matter the distance.

---

## 💡 Inspiration

In today's fast-paced world, parents who travel for work or work late often miss out on cherished moments like bedtime stories. Standard video calls can feel passive and fail to capture a child's attention. We wanted to transform this passive screen time into an active, shared experience that fosters connection and learning. "FaceyBuk" was born from the desire to bridge the physical distance between family members, making storytime magical again.

## ✨ What It Does

FaceyBuk creates a shared virtual reading room where a parent and child can connect over a live video call. The parent guides the narrative, reading the story line-by-line, while the child's screen comes alive with animated characters and spoken dialogue. This interactive format keeps the child engaged and makes reading together a fun, collaborative activity, even when they're miles apart.

## 🚀 Key Features

*   **Real-Time Video & Audio:** High-quality, low-latency video calling powered by WebRTC for a seamless peer-to-peer connection.
*   **Synchronized Story Experience:** The parent controls the pace of the story, with each line appearing on both screens simultaneously.
*   **Dual-Role UI:** Separate, tailored interfaces for the Parent (control-focused) and the Child (engagement-focused).
*   **Engaging Child View:** Features animated character avatars that "speak" their lines, bringing the story to life.
*   **Client-Side Text-to-Speech:** Uses the browser's built-in Web Speech API to voice character dialogue on the child's device, adding an extra layer of immersion.
*   **Curated Story Library:** A selection of charming, illustrated stories ready for reading.

## 🛠️ Technology Stack & Architecture

The application is built with a lightweight and powerful stack, prioritizing real-time communication and a responsive user experience.

*   **Frontend:**
    *   **HTML5, CSS3, Vanilla JavaScript:** No frameworks were used, allowing for granular control over the application's logic and performance.
    *   **WebRTC:** Enables direct peer-to-peer video, audio, and data communication between the parent and child browsers, minimizing server load and latency.
    *   **Socket.IO Client:** Manages the signaling process required to establish the WebRTC connection and handles real-time event messaging (like story line changes).
    *   **Web Speech API:** Leveraged for client-side text-to-speech to voice character lines directly in the child's browser.

*   **Backend:**
    *   **Node.js & Express.js:** A minimal and efficient backend to serve the static client files and host the signaling server.
    *   **Socket.IO Server:** Acts as the central signaling server, allowing peers to find each other and negotiate a WebRTC connection. It also relays story events from the parent to the child.

### How It Works

1.  **Story & Role Selection:** The user first selects a story and then chooses their role ("Parent" or "Child"). This information is stored in the browser's `localStorage`.
2.  **Signaling:** Both clients connect to the Node.js Socket.IO server and join a shared "room." The server facilitates the exchange of session descriptions (SDP) and ICE candidates, which are essential for establishing a direct WebRTC connection.
3.  **Peer-to-Peer Connection:** Once the signaling is complete, a direct WebRTC `RTCPeerConnection` is established between the parent's and child's browsers. Video and audio streams are then sent directly between them.
4.  **Story Progression:** When the Parent clicks "Next line," the new story line object is sent to the server via Socket.IO.
5.  **Real-Time Sync:** The server immediately relays this event to the Child client in the same room. Both clients then render the new line of text, ensuring the experience is perfectly synchronized.

## 📁 Project Structure

The codebase is organized into a `client` and `server` directory, clearly separating frontend and backend concerns.

```
nyu-hacks-main/
├── client/
│   ├── public/
│   │   ├── css/         # All CSS files for different pages
│   │   ├── js/
│   │   │   ├── tst.js   # Core client-side logic for WebRTC, Socket.IO, and story handling
│   │   │   └── ...
│   │   ├── index.html   # Story selection page
│   │   ├── role-select.html # Parent or Child role selection
│   │   ├── parent-page.html # The Parent's interface
│   │   └── child-page.html  # The Child's interface
│   └── src/             # UI design mockups
├── server/
│   ├── configs/         # CORS and DB configuration
│   ├── data/
│   │   └── stories.json # The source for all story content
│   ├── server.js        # Main Node.js/Express/Socket.IO server file
│   └── package.json
└── package.json
```

## 🔧 Getting Started

### Running Locally

To run this project on your local machine, follow these steps:

**Prerequisites:**
*   Node.js and npm installed.
*   A webcam and microphone.

**Installation & Setup:**

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/KeiraJames/nyu-hacks.git
    cd nyu-hacks-main
    ```

2.  **Install backend dependencies:**
    ```bash
    cd server
    npm install
    ```

3.  **Start the server:**
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:3000`.

**How to Use:**

1.  Open two separate browser tabs or windows and navigate to `http://localhost:3000`.
2.  **Tab 1 (Parent):**
    *   Choose a story from the list.
    *   On the next screen, click the **"Parent"** button. The parent view will load and automatically initiate the call.
3.  **Tab 2 (Child):**
    *   Choose the *same* story from the list.
    *   On the next screen, click the **"Child"** button.
    *   Click the **"Start"** button on the child's screen to join the call.

### Deploying with ngrok

To test the application on different devices (e.g., a desktop and a phone) that are not on the same network, you can use ngrok to create a secure public URL for your local server.

**Prerequisites:**
*   You have followed the "Running Locally" steps above.
*   [ngrok installed](https://ngrok.com/download) on your machine.

**Instructions:**

1.  **Start the local server** (if it's not already running):
    ```bash
    # In the /server directory
    npm run dev
    ```

2.  **Expose your local server with ngrok.** Open a *new* terminal window and run:
    ```bash
    ngrok http 3000
    ```

3.  **Copy the public URL.** ngrok will give you a "Forwarding" URL that looks something like `https://random-string.ngrok-free.dev`. Make sure you copy the `https` URL.

4.  **Add the URL to the CORS whitelist.** For security, the server will only accept connections from approved domains.
    *   Open the file: `server/configs/corsOptions.js`.
    *   Add your new ngrok URL to the `whitelist` array.

    ```javascript
    // server/configs/corsOptions.js

    const ngrokOrigin = 'https://random-string.ngrok-free.dev'; // <-- ADD YOUR URL HERE
    const whitelist = [ngrokOrigin, 'http://localhost:3000', 'http://example.com'];

    // ... rest of the file
    ```

5.  **Restart the server.** Stop the server (Ctrl+C in the terminal) and start it again to apply the new CORS settings:
    ```bash
    npm run dev
    ```

6.  **Use the app!** Now you can send the ngrok URL to any device. Open the URL on two different devices, select your roles, and the video call will connect across the internet.

## 🏆 Accomplishments & Challenges

**What we're proud of:**
*   Successfully implementing a complex WebRTC peer-to-peer connection from scratch.
*   Building a perfectly synchronized, stateful application where one user's actions are instantly reflected for the other.
*   Designing two distinct, user-friendly interfaces tailored to the different needs of a parent and a child.

**Challenges we faced:**
*   **WebRTC Signaling:** The negotiation process between two peers is intricate. We built a robust signaling mechanism using Socket.IO to handle the exchange of network information and session descriptions reliably.
*   **State Synchronization:** Ensuring the story progresses on both screens at the exact same time was critical for the user experience. We developed an event-driven system to keep the clients in sync with minimal latency.

## 🔮 What's Next

*   **Expanded Interactive Elements:** Add comprehension questions, word-highlighting, and "choose your own adventure" branching narratives.
*   **High-Quality Voices:** Integrate the ElevenLabs API (already included in the server) to provide rich, emotive, and distinct voices for each character.
*   **Parent Dashboard:** Create a dashboard to track the child's reading progress and comprehension.
*   **Story Library Expansion:** Allow users to upload their own stories or connect to digital book APIs.
*   **Mobile Responsiveness:** Enhance the CSS for a seamless experience on tablets and mobile phones.
