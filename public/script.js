const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const MAX_RETRIES = 2;

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  input.value = '';

  const botMessage = appendMessage('bot', 'Thinking...');
  
  await sendMessageWithRetry(userMessage, botMessage);
});

async function sendMessageWithRetry(userMessage, botMessage, retries = 0) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: userMessage }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
            
            // Check for the specific "model overloaded" error to retry
            if (response.status === 503 && retries < MAX_RETRIES) {
                botMessage.textContent = `Model is overloaded. Retrying (${retries + 1}/${MAX_RETRIES})...`;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
                return await sendMessageWithRetry(userMessage, botMessage, retries + 1);
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data && data.result) {
            botMessage.innerHTML = formatBotResponse(data.result);
        } else {
            botMessage.textContent = 'Sorry, no response received.';
        }
    } catch (error) {
        console.error('Chatbot Error:', error);
        let displayMessage = 'Failed to get response from server.';

        // Try to parse a more specific error message from the API response
        try {
            // The error message from the backend might be a JSON string itself
            const errorJson = JSON.parse(error.message);
            if (errorJson.message) {
                displayMessage = errorJson.message;
            }
        } catch (e) {
            // If it's not a JSON string, use the error message directly if it's not too technical
            if (typeof error.message === 'string' && !error.message.startsWith('HTTP error')) {
                displayMessage = error.message;
            }
        }
        botMessage.textContent = displayMessage;
    }
}

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  if (sender === 'bot' && text !== 'Thinking...') {
    msg.innerHTML = formatBotResponse(text);
  } else {
    msg.textContent = text;
  }
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function formatBotResponse(text) {
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  let decoded = textarea.value;
  
  // Convert markdown-like formatting to HTML
  decoded = decoded
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Lists
    .replace(/^\* (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    // Wrap in paragraphs
    .replace(/^(?!<[h|l|p])/gm, '<p>')
    .replace(/(?<!>)$/gm, '</p>')
    // Clean up extra paragraph tags
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[h|l])/g, '$1')
    .replace(/(<\/[h|l][^>]*>)<\/p>/g, '$1');
    
  // Wrap list items in ul tags
  decoded = decoded.replace(/(<li>.*<\/li>)/gs, (match) => {
    return '<ul>' + match + '</ul>';
  });
  
  return decoded;
}