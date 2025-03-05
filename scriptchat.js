const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

// ตั้งค่า API
const API_KEY = "AIzaSyAiALyUZBmtJckQVPKX7hRzBTNx4XGwqnI"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

// **เพิ่มส่วนนี้: กำหนดค่าการสร้างข้อความ**
const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};


let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

// ตั้งค่าธีมเริ่มต้นจาก local storage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

// ฟังก์ชันสร้าง element ข้อความ
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// เลื่อนไปที่ด้านล่างสุดของ container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// สร้างเอฟเฟกต์การพิมพ์สำหรับคำตอบของบอท
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  // กำหนด interval เพื่อพิมพ์แต่ละคำ
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40); // ดีเลย์ 40 ms
};

// เรียก API และสร้างคำตอบของบอท
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

    const systemInstruction = `1. ตอบคำถามจากข้อมูลที่มีในฐานข้อมูลเท่านั้นที่เชื่อมต่อเท่านั้น
    2.ห้ามสร้างหรือคิดข้อมูลขึ้นเอง
    3.เสนอตัวเลือก Q&A (ระบุแค่หัวข้อ)โดยหัวข้อต้องเกี่ยวกับพืชดอก หากได้รับคำถามที่กว้างไปเช่น "การปลูก","การดูแล" แต่ไม่ได้ระบุว่าปลูกหรือดูแลอะไร และตอบคำถามหลังผู้ใช้พิมพ์หนึ่งในตัวเลือกแล้ว
    5.ตอบคะ /ค่ะ
    `;
    

  // เพิ่มคำแนะนำระบบในประวัติการแชทเป็นข้อความแรก
  if (chatHistory.length === 0) {
    chatHistory.push({
      role: "user",
      parts: [{ text: systemInstruction }],
    });
  }


  // เพิ่มข้อความและข้อมูลไฟล์ของผู้ใช้ในประวัติการแชท
  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])],
  });

  try {
    // ส่งประวัติการแชทไปยัง API เพื่อรับคำตอบ
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
            contents: chatHistory,
            generationConfig: generationConfig // **เพิ่มส่วนนี้: ส่ง generationConfig ไปด้วย**
         }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    // ประมวลผลข้อความตอบกลับและแสดงผลด้วยเอฟเฟกต์การพิมพ์
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    textElement.textContent = error.name === "AbortError" ? "หยุดการสร้างคำตอบแล้ว" : error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

// จัดการการส่งฟอร์ม
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  // สร้าง HTML ข้อความผู้ใช้พร้อมไฟล์แนบ (ถ้ามี)
  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
  `;

  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    // สร้าง HTML ข้อความบอทและเพิ่มใน container แชท
    const botMsgHTML = `<img class="avatar" src="img/043.webp" /> <p class="message-text">รอสักครู่นะคะ...</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600); // ดีเลย์ 600 ms
};

// จัดการการเปลี่ยนแปลงไฟล์ input (การอัปโหลดไฟล์)
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    // เก็บข้อมูลไฟล์ใน object userData
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
});

// ยกเลิกการอัปโหลดไฟล์
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

// หยุดการตอบกลับของบอท
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

// สลับธีมมืด/สว่าง
themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// ลบแชททั้งหมด
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});

// จัดการการคลิกที่คำแนะนำ
document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

// แสดง/ซ่อน control สำหรับมือถือเมื่อ prompt input โฟกัส
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

// เพิ่ม event listener สำหรับการส่งฟอร์มและการคลิกที่ file input
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());