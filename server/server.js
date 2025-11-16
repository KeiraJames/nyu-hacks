import path from 'path';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

/////////////////////// Custom modules ///////////////////////
import corsOptions from './configs/corsOptions.js';
import logger from './middleware/logger.js';
///////////////////////////////////////////////////////////////

// Resolve __dirname / __filename in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });
const PORT = process.env.PORT || 3000;

const rooms = {}; // { [roomName]: { clients: [{id, role}], storyState: {...} } }

////////////////////////////// Middleware ///////////////////////////
app.use(logger);
app.use(cors(corsOptions));

// Serve static frontend assets
app.use(express.static(join(__dirname, '../client', 'public')));

////////////////////////////// Routes ///////////////////////////////

// Serve stories.json to the frontend
app.get('/stories', async (req, res) => {
    try {
        const filePath = join(__dirname, 'data', 'stories.json'); // server/data/stories.json
        const json = await readFile(filePath, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.send(json);
    } catch (err) {
        console.error('Error reading stories.json:', err);
        res.status(500).json({ error: 'Failed to load stories' });
    }
});

////////////////////////////// Socket.IO ////////////////////////////

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create or join a room
    socket.on('create or join', (room) => {
        console.log(`Received request to join room ${room}`);

        const clientsInRoom = rooms[room] ? rooms[room].clients.length : 0;
        let userRole;

        if (clientsInRoom === 0) {
            // First user is Parent
            userRole = 'Parent';
            rooms[room] = {
                clients: [{ id: socket.id, role: userRole }],
                storyState: { currentStory: 0, currentLine: 0, isActive: true }
            };
            socket.join(room);
            socket.emit('role_assigned', room, socket.id, userRole);
            console.log(`Room created: ${room}. User ${socket.id} is Parent.`);
        } else if (clientsInRoom === 1) {
            // Second user is Child
            userRole = 'Child';
            rooms[room].clients.push({ id: socket.id, role: userRole });
            socket.join(room);
            socket.emit('role_assigned', room, socket.id, userRole);

            // Notify Parent that Child joined
            socket.to(room).emit('join', room);
            console.log(`User ${socket.id} joined room ${room}. Role: Child.`);
        } else {
            // Room full
            socket.emit('full', room);
            console.log(`Room ${room} is full.`);
        }
    });

    // WebRTC signaling relay
    socket.on('message', (message) => {
        console.log(`Server received WebRTC signal: ${message.type || 'unknown'}`);
        socket.broadcast.emit('message', message);
    });

    // Story lines: Parent sends, server relays to the other peer in the room
    socket.on('story_line', ({ room, line }) => {
        if (!room || !rooms[room]) return;
        console.log(`Story line for room ${room}:`, line);
        socket.to(room).emit('story_line', line);
    });

    // End call explicitly
    socket.on('end_call', (room) => {
        console.log(`User ${socket.id} ended call in room ${room}.`);

        socket.to(room).emit('call_ended');

        if (rooms[room]) {
            delete rooms[room];
            console.log(`Room ${room} closed and cleaned up.`);
        }
    });

    // Handle disconnects & cleanup
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        for (const room in rooms) {
            const index = rooms[room].clients.findIndex((client) => client.id === socket.id);
            if (index !== -1) {
                socket.to(room).emit('call_ended');

                rooms[room].clients.splice(index, 1);

                if (rooms[room].clients.length === 0) {
                    delete rooms[room];
                    console.log(`Room ${room} closed.`);
                }
                break;
            }
        }
    });
});

////////////////////////////// Start server /////////////////////////

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
