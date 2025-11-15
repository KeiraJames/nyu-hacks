// fetch("http://localhost:3008/api/hello")
// .then((response) => response.json())
// .then((data) => {
//     document.getElementById("message").innerText = data.message;
// })

// public/main.js
const happinessEl = document.getElementById('happiness');
const energyEl = document.getElementById('energy');
const coinsEl = document.getElementById('coins');
const petImg = document.getElementById('petImg');

let petStats = {
  happiness: 50,
  energy: 50,
  coins: 0
};

// Update stats on screen
function updateStats() {
  happinessEl.textContent = petStats.happiness;
  energyEl.textContent = petStats.energy;
  coinsEl.textContent = petStats.coins;

  if (petStats.happiness > 70) petImg.src = 'pet-happy.png';
  else if (petStats.happiness < 30) petImg.src = 'pet-sad.png';
  else petImg.src = 'pet-neutral.png';
}

// Interactions
document.getElementById('feedBtn').addEventListener('click', () => {
  petStats.energy = Math.min(petStats.energy + 10, 100);
  petStats.happiness = Math.min(petStats.happiness + 5, 100);
  petStats.coins += 1;
  updateStats();
  saveStats();
});

document.getElementById('playBtn').addEventListener('click', () => {
  petStats.happiness = Math.min(petStats.happiness + 15, 100);
  petStats.energy = Math.max(petStats.energy - 10, 0);
  petStats.coins += 2;
  updateStats();
  saveStats();
});

// Save stats to Firebase
function saveStats() {
  const userId = 'demoUser'; // replace with actual user auth ID
  db.collection('pets').doc(userId).set(petStats)
    .then(() => console.log('Stats saved'))
    .catch(err => console.error(err));
}

// Load stats from Firebase
function loadStats() {
  const userId = 'demoUser';
  db.collection('pets').doc(userId).get()
    .then(doc => {
      if (doc.exists) {
        petStats = doc.data();
        updateStats();
      }
    });
}

loadStats();
updateStats();
