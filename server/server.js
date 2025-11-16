import path, { join, dirname } from 'path';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import 'dotenv/config';

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

import corsOptions from './configs/corsOptions.js';
import logger from './middleware/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });
const PORT = process.env.PORT || 3000;

const rooms = {};

const CHAR1_VOICE = 'vGQNBgLaiM3EdZtxIiuY';
const CHAR2_VOICE = 'nDJIICjR9zfJExIFeSCN';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_API_KEY
});

app.use(logger);
app.use(cors(corsOptions));
app.use(express.static(join(__dirname, '../client', 'public')));

app.get('/stories', async (req, res) => {
  try {
    const storiesPath = join(__dirname, 'data', 'stories.json');
    const data = await fs.readFile(storiesPath, 'utf-8');
    const stories = JSON.parse(data);
    res.json(stories);
  } catch (err) {
    console.error('Error reading stories.json:', err);
    res.status(500).json({ error: 'Could not load stories' });
  }
});

app.post('/tts', express.json(), async (req, res) => {
  const { text, voice } = req.body;

  if (!text || !voice) {
    return res.status(400).json({ error: 'Missing text or voice' });
  }

  let voiceSettings = {};

  if (voice === CHAR1_VOICE) {
    voiceSettings = {
      stability: 0.3,
      similarityBoost: 0.9,
      style: 0.5,
      useSpeakerBoost: true
    };
  } else if (voice === CHAR2_VOICE) {
    voiceSettings = {
      stability: 0.45,
      similarityBoost: 0.88,
      style: 0.45,
      useSpeakerBoost: true
    };
  }

  try {
    const audio = await elevenlabs.textToSpeech.convert(voice, {
      text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
      voiceSettings
    });

    if (!audio) {
      console.error('Empty audio from ElevenLabs');
      return res.status(500).send('TTS Error');
    }

    const buffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err) {
    console.error('ElevenLabs TTS Error:', err);
    res.status(500).send('TTS Error');
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('create or join', (room, requestedRole) => {
    console.log(`Received request to join room ${room}`);

    const clientsInRoom = rooms[room] ? rooms[room].clients.length : 0;
    let userRole;

    if (clientsInRoom === 0) {
      userRole = 'Parent';
      rooms[room] = {
        clients: [{ id: socket.id, role: userRole }]
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

  socket.on('story_line', (payload) => {
    const { room, line } = payload || {};
    if (room && line) {
      socket.to(room).emit('story_line', line);
    }
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
      const index = rooms[room].clients.findIndex(c => c.id === socket.id);
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