// Scoped selectors to the chat widget container
const aiChatRoot = document.getElementById('aiChat');
const chatButton = aiChatRoot.querySelector('#chatButton');
const chatWindow = aiChatRoot.querySelector('#chatWindow');
const closeButton = aiChatRoot.querySelector('#closeButton');
const sendButton = aiChatRoot.querySelector('#sendButton');
const userInput = aiChatRoot.querySelector('#userInput');
const chatMessages = aiChatRoot.querySelector('#chatMessages');

// Webhook URL
const WEBHOOK_URL = 'https://maxence.detourniere.com:8765/webhook/d4c7eeb8-95d1-4aba-b65c-eaaade0d6ad2';

function openChat() {
    chatWindow.classList.add('open');
    chatButton.classList.add('hidden');
    userInput.focus();
}

function closeChat() {
    chatWindow.classList.remove('open');
    chatButton.classList.remove('hidden');
}

chatButton.addEventListener('click', openChat);
closeButton.addEventListener('click', closeChat);

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = '';
    sendButton.disabled = true;

    const typingIndicator = addTypingIndicator();

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: message, chatId: generateChatId() })
        });

        typingIndicator.remove();

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`);
        }

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            addMessage(responseText, 'bot');
            return;
        }

        let aiResponse = '';
        if (data.output) aiResponse = data.output;
        else if (data.response) aiResponse = data.response;
        else if (data.message) aiResponse = data.message;
        else if (data.text) aiResponse = data.text;
        else if (data.data) aiResponse = data.data;
        else if (typeof data === 'string') aiResponse = data;
        else aiResponse = JSON.stringify(data, null, 2);

        addMessage(aiResponse, 'bot');
    } catch (error) {
        typingIndicator.remove();
        console.error('Error:', error);
        let errorMessage = 'Sorry, I encountered an error. ';
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage += 'This might be a CORS issue. The server needs to allow requests from this origin.';
        } else {
            errorMessage += error.message;
        }
        addMessage(errorMessage, 'bot');
    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}

function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    let parsedText = text;
    parsedText = parsedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsedText = parsedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    parsedText = parsedText.replace(/\n/g, '<br>');

    contentDiv.innerHTML = parsedText;
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';

    messageDiv.appendChild(typingDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
