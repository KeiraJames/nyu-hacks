const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const corsOptions = require('./configs/corsOptions');
const logger = require('./middleware/logger');

const userRoutes = require("./routes/test");


const app = express();
const PORT = process.env.PORT || 3008;

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

// Test route to check Firestore connection
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

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../client/build/index.html'));
// });

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});  