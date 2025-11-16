document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    const endCallButton = document.getElementById('endCallButton');

    if (!appContainer || !endCallButton) {
        console.error("Required elements for UI control are missing.");
        return;
    }

    // This function sets the UI state based on whether the call is active.
    const setUIState = (isCallActive) => {
        if (isCallActive) {
            appContainer.classList.add('in-call');
        } else {
            appContainer.classList.remove('in-call');
        }
    };

    // Use a MutationObserver to watch for changes to the 'endCallButton'.
    // tst.js controls its `display` style property to show/hide it.
    // We can use this as a reliable trigger to know when the call state changes.
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const isButtonVisible = endCallButton.style.display !== 'none';
                setUIState(isButtonVisible);
            }
        }
    });

    // Start observing the 'endCallButton' for attribute changes.
    observer.observe(endCallButton, { attributes: true });

    // Set initial state
    setUIState(endCallButton.style.display !== 'none');
});