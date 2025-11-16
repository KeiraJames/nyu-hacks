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

        
        setTimeout(() => {
            promptText.textContent = 'Now, which one is it?';
            
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
                    
                    window.socket.emit('child_response', { room, isCorrect: choice.isCorrect });
                });
                choicesContainer.appendChild(choiceEl);
            });
        }, 3000); 
    }

    
    document.getElementById('joinButton').addEventListener('click', () => {
        room = document.getElementById('roomInput').value.trim();
    });

    
    window.socket.on('learning_exercise', (data) => {
        console.log('Received learning exercise:', data);
        displayExercise(data.exercise);
    });

    
    document.getElementById('endCallButton').addEventListener('click', () => {
        clearExercise();
    });
});
