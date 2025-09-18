const chatWidget = document.getElementById("chat-widget");
const chatToggle = document.getElementById("chat-toggle");
const closeChat = document.getElementById("close-chat");
const chatBody = document.getElementById("chat-body");

// Toggle chatbox
chatToggle.onclick = () => {
    chatWidget.style.display = "flex";
    chatBody.innerHTML = ""; // clear old messages
    botWelcome();
};
closeChat.onclick = () => chatWidget.style.display = "none";

// Bot greeting
function botWelcome() {
    addMessage("🤖\nHi! I am your Civic Assistant. What would you like to do?", "bot");
    addButtons(["Report Issue", "Track Report", "Emergency Numbers", "Contact Us"]);
}

// Predefined replies
function getBotReply(message) {
    message = message.toLowerCase();

    if (message.includes("report")) {
        return { text: "You can report an issue by clicking the 'Report an Issue' button on the homepage." };
    } 
    else if (message.includes("track")) {
        return { text: "To track your report, please use the 'Track Your Report' option." };
    } 
    else if (message.includes("emergency")) {
        return { text: "🚑 108 (Medical)\n👮 100 (Police)\n🔥 101 (Fire)\n👩 1091 (Women's Helpline)" };
    } 
    else if (message.includes("contact")) {
        return { text: "You can contact us at\n 📧 info@everythingcivic.com \n☎️ +91 99797 70904." };
    } 
    else {
        return { text: "I didn’t understand that. Please choose an option below." };
    }
}

function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    
    // Replace newline characters with <br> tags for HTML rendering
    div.innerHTML = text.replace(/\n/g, '<br>');
    
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function addButtons(options) {
    const div = document.createElement("div");
    div.className = "msg bot";

    options.forEach(option => {
        const btn = document.createElement("button");
        btn.className = "chat-btn";
        btn.innerText = option;
        btn.onclick = () => {
            addMessage(option, "user");
            const reply = getBotReply(option);
            setTimeout(() => {
                addMessage("🤖\n" + reply.text, "bot");
                addButtons(["Report Issue", "Track Report", "Emergency Numbers", "Contact Us"]);
            }, 400);
        };
        div.appendChild(btn);
    });

    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}
