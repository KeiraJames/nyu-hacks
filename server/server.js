import path from 'path';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io'; 
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/////////////////////// Custom modules ///////////////////////
import corsOptions from './configs/corsOptions.js';
import logger from './middleware/logger.js';
///////////////////////////////////////////////////////////////

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();
const httpServer = createServer(app); 
const io = new Server(httpServer, { cors: corsOptions }); 
const PORT = process.env.PORT || 3000;

const rooms = {};

////////////////////////////// Middleware ///////////////////////////
app.use(logger);
app.use(cors(corsOptions));
app.use(express.static(join(__dirname, '../client', 'public')));



io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

   
    socket.on('create or join', (room) => {
        console.log(`Received request to join room ${room}`);

        const clientsInRoom = rooms[room] ? rooms[room].clients.length : 0;
        let userRole;

        if (clientsInRoom === 0) {
            userRole = 'Parent';
            rooms[room] = {
                clients: [{ id: socket.id, role: userRole }],
                storyState: { currentStory: 0, currentLine: 0, isActive: true } 
            };
            socket.join(room);
            
            socket.emit('role_assigned', room, socket.id, userRole);
            console.log(`Room created: ${room}. User ${socket.id} is ${userRole}.`);

        } else if (clientsInRoom === 1) {
            userRole = 'Child';
            rooms[room].clients.push({ id: socket.id, role: userRole });
            socket.join(room);
            
            socket.emit('role_assigned', room, socket.id, userRole);
            
            socket.to(room).emit('join', room);
            console.log(`User ${socket.id} joined room ${room}. Role: ${userRole}.`);

        } else { 
            socket.emit('full', room);
            console.log(`Room ${room} is full.`);
        }
    });


    socket.on('message', (message) => {
        console.log(`Server received WebRTC signal: ${message.type || 'unknown'}`);
        socket.broadcast.emit('message', message);
    });
    
 
    socket.on('end_call', (room) => {
        console.log(`User ${socket.id} ended call in room ${room}.`);
        

        socket.to(room).emit('call_ended');
        
       
        if (rooms[room]) {
             delete rooms[room];
             console.log(`Room ${room} closed and cleaned up.`);
        }
    });



    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        for (const room in rooms) {
            const index = rooms[room].clients.findIndex(client => client.id === socket.id);
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


httpServer.listen(PORT, () => { 
    console.log(`Server is running on http://localhost:${PORT}`);
});