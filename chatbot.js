const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const chat = document.getElementById("chat");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = input.value.trim();
  if (!message) return;

  addMessage(message, "user");
  input.value = "";

  const loading = addMessage("Thinking...", "ai");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    loading.remove();

    addMessage(
      data.reply || "Sorry, something went wrong.",
      "ai"
    );

  } catch (error) {
    loading.remove();
    addMessage("Connection error. Please try again.", "ai");
  }
});

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}
