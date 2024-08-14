document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.querySelector('.send-button');
    const voiceButton = document.querySelector('.voice-button');
    const inputField = document.querySelector('input[type="text"]');
    const messagesContainer = document.querySelector('.messages');

    // Event listener for sending text messages
    sendButton.addEventListener('click', () => {
        sendTextMessage();
    });

    // Event listener for starting voice recording
    voiceButton.addEventListener('click', () => {
        startVoiceRecording();
    });

    // Event listener for sending text message on pressing 'Enter'
    inputField.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendTextMessage();
        }
    });

    // Function to send text message to the server
    async function sendTextMessage() {
        const messageText = inputField.value;
        const trimmedMessageText = messageText.trim();

        if (trimmedMessageText !== '') {
            displayMessage(trimmedMessageText, 'reply');
            inputField.value = '';

            try {
                const response = await fetch('http://35.207.211.167:8080/query/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: trimmedMessageText }),
                });

                if (response.ok) {
                    const data = await response.json();
                    displayMessage(data.response, 'message');
                } else {
                    displayMessage('Sorry, there was an error processing your request.', 'message');
                }
            } catch (error) {
                console.error('Error during fetch operation:', error);
                displayMessage('Sorry, there was an error processing your request.', 'message');
            }
        }
    }

    // Function to display messages in the chat UI
    function displayMessage(text, className) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message', className);

        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.textContent = text;

        const timestamp = document.createElement('span');
        timestamp.classList.add('timestamp');
        const now = new Date();
        timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        messageContent.appendChild(timestamp);
        messageContainer.appendChild(messageContent);
        messagesContainer.appendChild(messageContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    let mediaRecorder;
    let audioChunks = [];
    let recordingTimer;

    // Updated function to start voice recording with a 10-second limit
    function startVoiceRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                audioChunks = [];
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    sendAudioMessage();
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                voiceButton.textContent = 'Stop Recording';
                voiceButton.removeEventListener('click', startVoiceRecording);
                voiceButton.addEventListener('click', stopVoiceRecording);

                // Set a timer to stop recording after 10 seconds
                recordingTimer = setTimeout(() => {
                    stopVoiceRecording();
                }, 10000); // 10 seconds in milliseconds
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                alert('Unable to access the microphone. Please check your browser settings.');
            });
    }
    
    function stopVoiceRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            voiceButton.textContent = 'Start Voice Message';
            voiceButton.removeEventListener('click', stopVoiceRecording);
            voiceButton.addEventListener('click', startVoiceRecording);
            
            // Clear the timer if the recording is stopped manually
            clearTimeout(recordingTimer);
        }
    }

    // Function to send audio message to the server
    async function sendAudioMessage() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'audio_message.wav');

        try {
            displayMessage('Sending voice message...', 'reply');

            const response = await fetch('http://35.207.211.167:8080/audio_query/', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                displayAudioMessage(audioUrl);
            } else {
                displayMessage('Sorry, there was an error sending your voice message.', 'message');
            }
        } catch (error) {
            console.error('Error:', error);
            displayMessage(`Sorry, there was an error sending your voice message: ${error.message}`, 'message');
        }
    }

    // Function to display the returned audio message in the chat UI
    function displayAudioMessage(audioUrl) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message', 'message');

        const audioElement = document.createElement('audio');
        audioElement.controls = true;
        audioElement.src = audioUrl;

        messageContainer.appendChild(audioElement);
        messagesContainer.appendChild(messageContainer);
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 0);
    }
});
