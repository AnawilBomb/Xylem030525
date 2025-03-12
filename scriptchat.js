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
const SERVER_URL = "http://localhost:3000"; // URL สำหรับ API ของเซิร์ฟเวอร์

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
let databaseContent = null; // เก็บข้อมูลจากฐานข้อมูล

// ดึงข้อมูลที่จำเป็นจากฐานข้อมูลเมื่อโหลดหน้า
const fetchDatabaseData = async () => {
    try {
        // ดึงข้อมูลพืช
        const plantsResponse = await fetch(`${SERVER_URL}/api/get-plants`);
        const plants = await plantsResponse.json();
        
        // ดึงข้อมูลคำถาม-คำตอบ
        const qaResponse = await fetch(`${SERVER_URL}/api/get-questions`);
        const questions = await qaResponse.json();
        
        // จัดเตรียมข้อมูล
        databaseContent = {
            plants: plants,
            qaData: questions
        };
        
        console.log("Database data loaded:", databaseContent);
        
        // เพิ่มข้อมูลในประวัติการแชทเพื่อให้ AI เข้าถึงได้
        if (chatHistory.length === 0) {
            const databaseInfo = `
            ข้อมูลฐานข้อมูลพืชดอกและคำถาม-คำตอบ:
            
            พืชดอกในฐานข้อมูล:
            ${JSON.stringify(databaseContent.plants)}
            
            คำถาม-คำตอบในฐานข้อมูล:
            ${JSON.stringify(databaseContent.qaData)}
            `;
            
            chatHistory.push({
                role: "user",
                parts: [{ text: databaseInfo }],
            });
            
            // เพิ่มการตอบรับจากระบบว่าได้รับข้อมูลแล้ว
            chatHistory.push({
                role: "model",
                parts: [{ text: "ได้รับข้อมูลฐานข้อมูลแล้ว พร้อมให้บริการตอบคำถามเกี่ยวกับพืชดอกค่ะ" }],
            });
        }
    } catch (error) {
        console.error("Error fetching database data:", error);
    }
};

// เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อโหลดหน้า
fetchDatabaseData();

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

// ค้นหาคำตอบจากฐานข้อมูล
const findAnswerInDatabase = (userMessage) => {
    if (!databaseContent) return null;
    
    // แปลงคำถามเป็นตัวพิมพ์เล็กเพื่อการเปรียบเทียบ
    const normalizedMessage = userMessage.toLowerCase().trim();
    
    // ตรวจสอบว่าเป็นคำถามเกี่ยวกับพืชดอกหรือไม่
    if (normalizedMessage.includes("พืชดอกในฐานข้อมูล")) {
        const plantsList = databaseContent.plants.map(plant => plant.plant_name).join(", ");
        return `พืชดอกในฐานข้อมูลตอนนี้มี: ${plantsList} ค่ะ`;
    }
    
    // ค้นหาคำตอบที่ตรงกับคำถาม
    for (const qa of databaseContent.qaData) {
        if (qa.Question.toLowerCase().includes(normalizedMessage) || 
            normalizedMessage.includes(qa.Question.toLowerCase())) {
            return qa.Answer;
        }
    }
    
    // หากไม่พบคำตอบที่ตรงกัน ตรวจสอบว่ามีพืชดอกในคำถามหรือไม่
    for (const plant of databaseContent.plants) {
        if (normalizedMessage.includes(plant.plant_name.toLowerCase())) {
            // ค้นหา QA ที่เกี่ยวข้องกับพืชนี้
            const relevantQAs = databaseContent.qaData.filter(qa => 
                qa.related_plant_id === plant.plant_id
            );
            
            if (relevantQAs.length > 0) {
                // ตรวจสอบว่าคำถามเกี่ยวกับการปลูกหรือไม่
                if (normalizedMessage.includes("ปลูก") || normalizedMessage.includes("วิธีการปลูก")) {
                    const plantingQA = relevantQAs.find(qa => 
                        qa.Question.toLowerCase().includes("ปลูก") || qa.Question.toLowerCase().includes("วิธีการปลูก")
                    );
                    if (plantingQA) return plantingQA.Answer;
                }
                
                // ตรวจสอบว่าคำถามเกี่ยวกับแมลงศัตรูพืชหรือไม่
                if (normalizedMessage.includes("แมลง") || normalizedMessage.includes("ศัตรูพืช")) {
                    const pestsQA = relevantQAs.find(qa => 
                        qa.Question.toLowerCase().includes("แมลง") || qa.Question.toLowerCase().includes("ศัตรูพืช")
                    );
                    if (pestsQA) return pestsQA.Answer;
                }
                
                // ตรวจสอบว่าคำถามเกี่ยวกับระยะเวลาหรือไม่
                if (normalizedMessage.includes("เวลา") || normalizedMessage.includes("กี่วัน")) {
                    const timeQA = relevantQAs.find(qa => 
                        qa.Question.toLowerCase().includes("เวลา") || qa.Question.toLowerCase().includes("กี่วัน")
                    );
                    if (timeQA) return timeQA.Answer;
                }
            }
            
            // ถ้าไม่พบคำตอบที่เฉพาะเจาะจง แต่พบพืชดอกในคำถาม
            return `พบข้อมูลเกี่ยวกับ ${plant.plant_name} ในฐานข้อมูล 
                    ชื่อวิทยาศาสตร์: ${plant.scientific_name}
                    คำอธิบาย: ${plant.description}
                    
                    คุณต้องการทราบข้อมูลเพิ่มเติมเกี่ยวกับ ${plant.plant_name} ด้านใดค่ะ?`;
        }
    }
    
    return null;
}

// เรียก API และสร้างคำตอบของบอท
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  // ค้นหาคำตอบจากฐานข้อมูลก่อน
  const databaseAnswer = findAnswerInDatabase(userData.message);
  
  if (databaseAnswer) {
    // ถ้าพบคำตอบในฐานข้อมูล ใช้คำตอบนั้นเลย
    typingEffect(databaseAnswer, textElement, botMsgDiv);
    
    // เพิ่มในประวัติการแชท
    chatHistory.push({
        role: "user",
        parts: [{ text: userData.message }]
    });
    
    chatHistory.push({
        role: "model",
        parts: [{ text: databaseAnswer }]
    });
    
    return;
  }

  // หากไม่พบคำตอบในฐานข้อมูล ใช้ AI ตอบ
  const systemInstruction = `1. ตอบคำถามจากข้อมูลที่มีในฐานข้อมูลเท่านั้นที่เชื่อมต่อเท่านั้น
  2. ห้ามสร้างหรือคิดข้อมูลขึ้นเอง
  3. เสนอตัวเลือก Q&A (ระบุแค่หัวข้อ)โดยหัวข้อต้องเกี่ยวกับพืชดอก หากได้รับคำถามที่กว้างไปเช่น "การปลูก","การดูแล" แต่ไม่ได้ระบุว่าปลูกหรือดูแลอะไร และตอบคำถามหลังผู้ใช้พิมพ์หนึ่งในตัวเลือกแล้ว
  4. หากไม่มีข้อมูลในฐานข้อมูล ให้แจ้งว่าขออภัย ไม่พบข้อมูลในฐานข้อมูล และเสนอตัวเลือกที่มีในฐานข้อมูล
  5. ตอบคะ /ค่ะ ท้ายประโยค
  `;
    
  // เพิ่มคำแนะนำระบบในประวัติการแชทถ้ายังไม่มี
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
        generationConfig: generationConfig // ส่ง generationConfig ไปด้วย
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    // ประมวลผลข้อความตอบกลับและแสดงผลด้วยเอฟเฟกต์การพิมพ์
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    
    // ถ้าไม่มีข้อมูลในฐานข้อมูล เสนอตัวเลือกที่มีอยู่
    let finalResponse = responseText;
    if (responseText.includes("ไม่พบข้อมูล") || responseText.includes("ไม่มีข้อมูล")) {
      if (databaseContent && databaseContent.plants.length > 0) {
        const plantOptions = databaseContent.plants.map(p => p.plant_name).slice(0, 5).join(", ");
        finalResponse += `\n\nคุณสามารถถามข้อมูลเกี่ยวกับพืชดอกต่อไปนี้ได้ค่ะ: ${plantOptions}`;
      }
    }
    
    typingEffect(finalResponse, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: finalResponse }] });
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
  // เก็บคำแนะนำระบบเอาไว้ (รายการแรกของประวัติ)
  const systemInstructions = chatHistory.length > 0 ? chatHistory.slice(0, 2) : [];
  
  // ล้างประวัติการแชทและดึงข้อมูลฐานข้อมูลอีกครั้ง
  chatHistory.length = 0;
  chatHistory.push(...systemInstructions);
  
  // ล้างการแสดงผลแชท
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