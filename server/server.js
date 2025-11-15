const path = require('path');
const express = require('express');
const http = require('http'); 
const socketIo = require('socket.io'); 
const cors = require('cors');
require('dotenv').config();

const corsOptions = require('./configs/corsOptions');
const logger = require('./middleware/logger');

const userRoutes = require("./routes/test"); 


const app = express();
const server = http.createServer(app); 
const io = socketIo(server); 
const PORT = process.env.PORT || 3000;

//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// MIDDLEWARE ////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
app.use(cors(corsOptions));
app.use(logger);

/////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// SERVE STATIC FILE///////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
app.use(express.static(path.join(__dirname, '../client', 'public')));

//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// API ROUTES ////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const { createUser, getAllUsers, getUserById, updateUser, deleteUser } = require("./models/test");


app.get("/test", async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ message: "Firestore connected!", users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});


const rooms = {};

//////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////// SOCKET.IO LOGIC //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    
    socket.on('create or join', (room) => {
        console.log(`Received request to join room ${room}`);

        const clientsInRoom = rooms[room] ? rooms[room].length : 0;
        
        if (clientsInRoom === 0) {
            rooms[room] = [socket.id];
            socket.join(room);
            socket.emit('created', room, socket.id);
            console.log(`Room created: ${room}. User ${socket.id} is the first.`);

        } else if (clientsInRoom === 1) {
            rooms[room].push(socket.id);
            socket.join(room);
            socket.emit('joined', room, socket.id);
            
            
            socket.to(room).emit('join', room); 
            console.log(`User ${socket.id} joined room ${room}. Two users now.`);

        } else { 
            socket.emit('full', room);
            console.log(`Room ${room} is full.`);
        }
    });

   
    socket.on('message', (message) => {
        console.log(`Server received message: ${message.type || 'unknown'}`);
       
        socket.broadcast.emit('message', message);
    });

   
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
       
        for (const room in rooms) {
            const index = rooms[room].indexOf(socket.id);
            if (index !== -1) {
                rooms[room].splice(index, 1);
                
                if (rooms[room].length === 0) {
                    delete rooms[room];
                    console.log(`Room ${room} closed.`);
                }
                break;
            }
        }
    });
});



server.listen(PORT, () => { 
  console.log(`Server is running on http://localhost:${PORT}`);
});