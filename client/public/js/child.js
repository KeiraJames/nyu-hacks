// This script is specific to child-page.html
// It handles receiving and displaying exercises from the parent.

document.addEventListener('DOMContentLoaded', () => {
    const wordDisplay = document.getElementById('word-display');
    const choicesContainer = document.getElementById('choices-container');
    const promptText = document.getElementById('prompt-text');

    let room;

    function clearExercise() {
        wordDisplay.textContent = '';
        choicesContainer.innerHTML = '';
        promptText.textContent = 'Waiting for the next question...';
    }

    function displayExercise(exercise) {
        clearExercise();
        wordDisplay.textContent = exercise.word;
        promptText.textContent = exercise.prompt;

        // Show choices after a delay to allow the child to read the word first
        setTimeout(() => {
            promptText.textContent = 'Now, which one is it?';
            // Shuffle choices so the correct answer isn't always in the same spot
            exercise.choices.sort(() => Math.random() - 0.5);

            exercise.choices.forEach((choice, index) => {
                const choiceEl = document.createElement('div');
                choiceEl.className = 'choice-item';
                choiceEl.style.animationDelay = `${index * 150}ms`;

                const img = document.createElement('img');
                img.src = choice.imageUrl;
                img.alt = `Choice image ${index + 1}`;
                choiceEl.appendChild(img);
                
                choiceEl.addEventListener('click', () => {
                    // Disable all buttons after a choice is made
                    document.querySelectorAll('.choice-item').forEach(el => {
                        el.style.pointerEvents = 'none';
                        el.style.opacity = '0.6';
                    });
                    
                    choiceEl.style.opacity = '1';

                    if (choice.isCorrect) {
                        choiceEl.classList.add('correct');
                        promptText.textContent = "That's right! Great job!";
                    } else {
                        choiceEl.classList.add('incorrect');
                        promptText.textContent = "Not quite, but good try!";
                    }
                    // Notify parent of the choice
                    window.socket.emit('child_response', { room, isCorrect: choice.isCorrect });
                });
                choicesContainer.appendChild(choiceEl);
            });
        }, 3000); // 3-second delay
    }

    // Get room name from the input field when joining
    document.getElementById('joinButton').addEventListener('click', () => {
        room = document.getElementById('roomInput').value.trim();
    });

    // Listen for exercises from the parent
    window.socket.on('learning_exercise', (data) => {
        console.log('Received learning exercise:', data);
        displayExercise(data.exercise);
    });

    // When a call is ended, clear the interactive elements
    document.getElementById('endCallButton').addEventListener('click', () => {
        clearExercise();
    });
});
