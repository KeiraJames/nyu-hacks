// server/models/test.js
const db = require("../configs/db");

// Ensure db is initialized
if (!db) {
  throw new Error("❌ Firestore not initialized. Check your db.js setup.");
}

// Reference the 'users' collection
const usersCollection = db.collection("users");

// 🧩 Create user
async function createUser(data) {
  const docRef = await usersCollection.add(data);
  return { id: docRef.id, ...data };
}

// 📜 Read all users
async function getAllUsers() {
  const snapshot = await usersCollection.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 🔍 Read one user by ID
async function getUserById(id) {
  const doc = await usersCollection.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// ✏️ Update user
async function updateUser(id, data) {
  await usersCollection.doc(id).update(data);
  return { id, ...data };
}

// 🗑️ Delete user
async function deleteUser(id) {
  await usersCollection.doc(id).delete();
  return { message: "User deleted", id };
}

// Export functions
module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
