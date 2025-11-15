// server/configs/db.js
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

let db;

try {
  if (admin.apps.length === 0) {
    let serviceAccount;

    if (process.env.FIREBASE_CONFIG) {
      // Cloud deployment
      serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    } else {
      // Local development
      const filePath = path.join(__dirname, "../firebase-service-account.json");
      const fileData = fs.readFileSync(filePath, "utf8");
      serviceAccount = JSON.parse(fileData);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("🔥 Firebase initialized");
  } else {
    console.log("⚠️ Firebase already initialized");
  }

  db = admin.firestore();
  console.log("✅ Firestore connected successfully!");
} catch (error) {
  console.error("❌ Firebase connection error:", error.message);
}

module.exports = db;
