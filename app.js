const STORAGE_KEY = "balouch_ai_chats_v1";
const THEME_KEY = "balouch_ai_theme_v1";

const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const historyList = document.getElementById("historyList");
const emptyHistory = document.getElementById("emptyHistory");

const newChatBtn = document.getElementById("newChatBtn");
const incognitoBtn = document.getElementById("incognitoBtn");
const incognitoText = document.getElementById("incognitoText");

const themeBtn = document.getElementById("themeBtn");
const desktopThemeBtn = document.getElementById("desktopThemeBtn");
const themeIcon = document.getElementById("themeIcon");

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

const incognitoBanner = document.getElementById("incognitoBanner");
const exitIncognito = document.getElementById("exitIncognito");

const providerSelect = document.getElementById("providerSelect");
const modelSelect = document.getElementById("modelSelect");

const MODELS = {
  openrouter: [
    {
      value: "openrouter/free",
      label: "Auto — Free"
    }
  ],

  groq: [
    {
      value: "openai/gpt-oss-20b",
      label: "GPT-OSS 20B"
    },
    {
      value: "openai/gpt-oss-120b",
      label: "GPT-OSS 120B"
    },
    {
      value: "qwen/qwen3.6-27b",
      label: "Qwen 3.6 27B"
    }
  ],

  gemini: [
    {
      value: "gemini-3.8-flash",
      label: "Gemini 3.8 Flash"
    }
  ]
};

function updateModelOptions() {
  const provider = providerSelect.value;
  const models = MODELS[provider] || [];

  modelSelect.innerHTML = "";

  models.forEach((item) => {
    const option = document.createElement("option");

    option.value = item.value;
    option.textContent = item.label;

    modelSelect.appendChild(option);
  });
}

providerSelect.addEventListener("change", updateModelOptions);

updateModelOptions();

let chats = loadChats();

let currentChat = null;

let incognito = false;

let busy = false;


/* -----------------------------
   STORAGE
----------------------------- */

function loadChats() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    ) || [];
  } catch {
    return [];
  }
}

function saveChats() {
  if (incognito) return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(chats)
  );
}


/* -----------------------------
   CHAT CREATION
----------------------------- */

function createChat() {

  currentChat = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()),

    title: "New conversation",

    createdAt: Date.now(),

    messages: []
  };

  if (!incognito) {
    chats.unshift(currentChat);

    saveChats();
  }

  renderHistory();
  renderMessages();

  closeSidebar();
}


/* -----------------------------
   LOAD CHAT
----------------------------- */

function loadChat(id) {

  const chat = chats.find(
    item => item.id === id
  );

  if (!chat) return;

  incognito = false;

  currentChat = chat;

  updateIncognitoUI();

  renderMessages();

  closeSidebar();
}


function deleteChat(id) {

  const confirmed =
    confirm("Delete this conversation?");

  if (!confirmed) return;

  chats =
    chats.filter(chat => chat.id !== id);

  if (
    currentChat &&
    currentChat.id === id
  ) {
    currentChat = null;
  }

  saveChats();

  renderHistory();

  if (!currentChat) {
    createChat();
  } else {
    renderMessages();
  }
}

/* -----------------------------
   NEW CHAT
----------------------------- */

newChatBtn.addEventListener(
  "click",
  () => {
    incognito = false;

    createChat();

    updateIncognitoUI();
  }
);


/* -----------------------------
   INCognito
----------------------------- */

function startIncognito() {

  incognito = true;

  currentChat = {
    id: "incognito",

    title: "Incognito",

    createdAt: Date.now(),

    messages: []
  };

  updateIncognitoUI();

  renderMessages();

  closeSidebar();
}

function updateIncognitoUI() {
  document.body.classList.toggle("incognito", incognito);

  incognitoBanner.hidden = !incognito;

  if (incognito) {
    incognitoText.textContent =
      "Incognito is ON";
  } else {
    incognitoText.textContent =
      "Incognito chat";
  }
}

incognitoBtn.addEventListener(
  "click",
  () => {

    if (incognito) {

      incognito = false;

      createChat();

      updateIncognitoUI();

    } else {

      startIncognito();

    }
  }
);


exitIncognito.addEventListener(
  "click",
  () => {

    incognito = false;

    createChat();

    updateIncognitoUI();

  }
);


/* -----------------------------
   HISTORY UI
----------------------------- */
function renderHistory() {

  historyList.innerHTML = "";

  if (!chats.length) {
    emptyHistory.style.display = "block";
    return;
  }

  emptyHistory.style.display = "none";

  chats
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach(chat => {

      const wrapper =
        document.createElement("div");

      wrapper.className =
        "history-item-wrapper";

      const button =
        document.createElement("button");

      button.className =
        "history-item";

      if (
        currentChat &&
        chat.id === currentChat.id
      ) {
        button.classList.add("active");
      }

      const title =
        document.createElement("strong");

      title.textContent =
        chat.title || "New conversation";

      const date =
        document.createElement("small");

      date.textContent =
        formatDate(chat.createdAt);

      button.appendChild(title);
      button.appendChild(date);

      button.addEventListener(
        "click",
        () => loadChat(chat.id)
      );

      const deleteButton =
        document.createElement("button");

      deleteButton.className =
        "history-delete";

      deleteButton.textContent =
        "×";

      deleteButton.title =
        "Delete conversation";

      deleteButton.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          deleteChat(chat.id);

        }
      );

      wrapper.appendChild(button);

      wrapper.appendChild(deleteButton);

      historyList.appendChild(wrapper);
    });
    }


/* -----------------------------
   MESSAGES
----------------------------- */

function renderMessages() {

  messagesEl.innerHTML = "";

  if (
    !currentChat ||
    currentChat.messages.length === 0
  ) {
    welcomeEl.style.display = "block";
    return;
  }

  welcomeEl.style.display = "none";

  currentChat.messages.forEach(
    message => {

      addMessageToUI(
        message.role,
        message.content,
        message.time,
        false
      );
    }
  );

  scrollBottom();
}


/* -----------------------------
   ADD MESSAGE
----------------------------- */

function addMessageToUI(
  role,
  content,
  time = Date.now(),
  animate = true
) {

  const row =
    document.createElement("div");

  row.className =
    `message-row ${role === "user" ? "user" : ""}`;

  if (animate) {
    row.style.animation =
      "appear .2s ease";
  }

  const bubble =
    document.createElement("div");

  bubble.className =
    `message ${role === "user" ? "user" : "ai"}`;

  bubble.innerHTML =
    role === "user"
      ? escapeHTML(content)
      : formatAI(content);

  row.appendChild(bubble);

  messagesEl.appendChild(row);

  if (role === "ai") {

    const actions =
      document.createElement("div");

    actions.className =
      "message-actions";

    const copy =
      document.createElement("button");

    copy.className =
      "message-action";

    copy.textContent =
      "Copy";

    copy.addEventListener(
      "click",
      async () => {

        try {
          await navigator.clipboard.writeText(content);

          copy.textContent =
            "Copied";

          setTimeout(() => {
            copy.textContent =
              "Copy";
          }, 1200);

        } catch {}
      }
    );

    actions.appendChild(copy);

    bubble.appendChild(actions);
  }

  return row;
}


/* -----------------------------
   SEND MESSAGE
----------------------------- */

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (busy) return;

    const message =
      input.value.trim();

    if (!message) return;

    if (!currentChat) {
      createChat();
    }

    addLocalMessage(
      "user",
      message
    );

    input.value = "";

    autoResize();

    await sendToAI();
  }
);


/* -----------------------------
   LOCAL MESSAGE
----------------------------- */

function addLocalMessage(
  role,
  content
) {

  const item = {
    role,
    content,
    time: Date.now()
  };

  currentChat.messages.push(item);

  if (
    role === "user" &&
    currentChat.messages.length === 1
  ) {

    currentChat.title =
      content.length > 45
        ? content.slice(0, 45) + "..."
        : content;
  }

  addMessageToUI(
    role,
    content
  );

  // Incognito messages must NEVER be saved
  if (!incognito) {
    saveChats();
    renderHistory();
  }

  scrollBottom();
  }

/* -----------------------------
   AI
----------------------------- */
async function sendToAI() {

  busy = true;

  sendButton.disabled = true;

  const typing = createTyping();

  try {

    const recentMessages =
      currentChat.messages
        .slice(-10)
        .map(message => ({
          role: message.role,
          content: message.content
        }));

    const provider = providerSelect.value;
    const model = modelSelect.value;

    const response =
      await fetch("/api/chat", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          message: currentChat.messages
            .filter(m => m.role === "user")
            .slice(-1)[0]?.content || "",

          provider: provider,

          model: model,

          history: recentMessages,

          incognito: incognito

        })

      });

    const data =
      await response.json();

    typing.remove();

    if (!response.ok) {

      throw new Error(
        data.error ||
        "AI request failed."
      );

    }

    addLocalMessage(
      "assistant",
      data.reply
    );

  } catch (error) {

    typing.remove();

    console.error(
      "Balouch AI error:",
      error
    );

    addLocalMessage(
      "assistant",
      "I couldn't connect to Balouch AI right now. Please try again."
    );

  } finally {

    busy = false;

    sendButton.disabled = false;

    input.focus();

  }
}


/* -----------------------------
   TYPING
----------------------------- */

function createTyping() {

  const row =
    document.createElement("div");

  row.className =
    "message-row";

  const bubble =
    document.createElement("div");

  bubble.className =
    "message ai";

  const typing =
    document.createElement("div");

  typing.className =
    "typing";

  for (let i = 0; i < 3; i++) {

    const dot =
      document.createElement("span");

    typing.appendChild(dot);
  }

  bubble.appendChild(typing);

  row.appendChild(bubble);

  messagesEl.appendChild(row);

  scrollBottom();

  return row;
}


/* -----------------------------
   SUGGESTIONS
----------------------------- */

document
  .querySelectorAll(".suggestion")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        input.value =
          button.dataset.question;

        form.requestSubmit();
      }
    );
  });


/* -----------------------------
   THEME
----------------------------- */

function loadTheme() {

  const saved =
    localStorage.getItem(
      THEME_KEY
    );

  if (saved === "light") {
    document.body.classList.add("light");
    updateThemeIcon();
    return;
  }

  if (saved === "dark") {
    document.body.classList.remove("light");
    updateThemeIcon();
    return;
  }

  if (
    window.matchMedia(
      "(prefers-color-scheme: light)"
    ).matches
  ) {

    document.body.classList.add("light");
  }

  updateThemeIcon();
}

function toggleTheme() {

  document.body.classList.toggle(
    "light"
  );

  const light =
    document.body.classList.contains(
      "light"
    );

  localStorage.setItem(
    THEME_KEY,
    light ? "light" : "dark"
  );

  updateThemeIcon();
}

function updateThemeIcon() {

  const light =
    document.body.classList.contains(
      "light"
    );

  const icon =
    light ? "☾" : "☼";

  themeIcon.textContent = icon;

  desktopThemeBtn.textContent = icon;
}

themeBtn.addEventListener(
  "click",
  toggleTheme
);

desktopThemeBtn.addEventListener(
  "click",
  toggleTheme
);


/* -----------------------------
   MOBILE MENU
----------------------------- */

function openSidebar() {

  sidebar.classList.add("open");

  overlay.classList.add("show");
}

function closeSidebar() {

  sidebar.classList.remove("open");

  overlay.classList.remove("show");
}

menuBtn.addEventListener(
  "click",
  openSidebar
);

overlay.addEventListener(
  "click",
  closeSidebar
);


/* -----------------------------
   TEXTAREA
----------------------------- */

input.addEventListener(
  "input",
  autoResize
);

input.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      form.requestSubmit();
    }
  }
);

function autoResize() {

  input.style.height = "auto";

  input.style.height =
    Math.min(
      input.scrollHeight,
      160
    ) + "px";
}


/* -----------------------------
   HELPERS
----------------------------- */

function scrollBottom() {

  const container =
    document.getElementById(
      "chatContainer"
    );

  setTimeout(() => {

    container.scrollTop =
      container.scrollHeight;

  }, 20);
}

function formatDate(timestamp) {

  const date =
    new Date(timestamp);

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric"
    }
  );
}

function escapeHTML(text) {

  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAI(text) {

  let safe =
    escapeHTML(text);

  safe =
    safe.replace(
      /```([\s\S]*?)```/g,
      "<pre>$1</pre>"
    );

  safe =
    safe.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

  safe =
    safe.replace(
      /\n/g,
      "<br>"
    );

  return safe;
}


/* -----------------------------
   START
----------------------------- */

loadTheme();

if (chats.length) {

  currentChat =
    chats[0];

  renderMessages();

} else {

  createChat();
}

renderHistory();

updateIncognitoUI();

input.focus();
