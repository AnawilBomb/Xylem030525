document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarContainer = document.getElementById('sidebar-container');
    const container = document.querySelector(".container");
    const chatsContainer = document.querySelector(".chats-container");
    const promptForm = document.querySelector(".prompt-form");
    const promptInput = promptForm.querySelector(".prompt-input");
    const fileInput = document.querySelector("#file-input");
    const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
    const themeToggleBtn = document.querySelector("#theme-toggle-btn");

    // Create and append overlay
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    document.body.appendChild(overlay);

    // API Configuration
    const API_KEY = "AIzaSyDe115urh1JH4ZrCrUZmIBy6Vs-pm6wpUY";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;
    const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 300000,
        responseMimeType: "text/plain",
    };

    // State variables
    let controller, typingInterval;
    const chatHistory = [];
    const userData = {
        message: "",
        file: {}
    };

    // System instruction for the chatbot
    const systemInstruction = `1. ห้ามสร้างหรือคิดข้อมูลขึ้นเองเด็ดขาด ยกเว้น คำถาม
2. ตอบเฉพาะสิ่งที่มีในเอกสารและข้อมูลที่ได้โดยตรง
3. "หากไม่มีการอัพโหลดเอกสาร ไม่ต้องใช้ข้อนี้"เมื่อมีการอัพไฟล์ให้อ่านไฟล์และนำข้อมูลมาตอบในรูปแบบ ดังนี้:
   1. QA_ID (คำถามที่เท่าไหร่)
   2. Question (ถามว่าอะไร)
   3. Answer (ตอบโดยนำเนื้อหาที่เกี่ยวข้องมาตอบ)
   4. related plant id (เลข ID ของพืชที่เกี่ยวข้องกับเนื้อหานี้ และข้อมูลเป็นตัวเลข)
   ไม่ต้องสร้างตาราง <br>
4. หากได้รับคำถามใหม่ ให้ขึ้นแถวใหม่ นำคำถามไปใส่ช่อง Question และนำเนื้อหามาตอบในช่อง Answer
5. เว้นบรรทัดเพื่อโชว์ตารางในบรรทัดถัดไป ไม่ควรเขียนติดกัน
6. คุณคือเลขาเพศหญิง และตอบให้มีความเป็นมนุษย์มากที่สุด`;

    // Initialize theme
    const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
    if (themeToggleBtn) {
        document.body.classList.toggle("light-theme", isLightTheme);
        themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
    }

    // Helper Functions
    const createMessageElement = (content, ...classes) => {
        const div = document.createElement("div");
        div.classList.add("message", ...classes);
        div.innerHTML = content;
        return div;
    };

    const scrollToBottom = () => container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
    });

    const typingEffect = (text, textElement, botMsgDiv) => {
        textElement.textContent = "";
        const words = text.split(" ");
        let wordIndex = 0;

        typingInterval = setInterval(() => {
            if (wordIndex < words.length) {
                textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
                scrollToBottom();
            } else {
                clearInterval(typingInterval);
                botMsgDiv.classList.remove("loading");
                document.body.classList.remove("bot-responding");
            }
        }, 40);
    };

    // Database Functions
    async function saveChatToDatabase(qaData) {
        try {
            const response = await fetch('/api/save-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(qaData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Chat saved successfully');
            return result;
        } catch (error) {
            console.error('❌ Error saving chat:', error);
            throw error;
        }
    }

    function extractQAData(responseText, userQuestion, hasFileAttachment) {
        // If no file attachment, return single Q&A pair with cleaned text
        if (!hasFileAttachment) {
            return {
                question: cleanText(userQuestion),
                answer: cleanText(responseText),
                related_plant_id: 0
            };
        }
    
        const qaItems = [];
        
        // Split response into sections based on QA_ID
        const sections = responseText.split(/(?=QA_ID[:\s]*\d+)/i);
        
        for (let section of sections) {
            if (!section.trim()) continue;
    
            // Extract components using regex
            const qaIdMatch = section.match(/QA_ID[:\s]*(\d+)/i);
            const questionMatch = section.match(/Question[:\s]*(.*?)(?=Answer[:\s]*|$)/is);
            const answerMatch = section.match(/Answer[:\s]*(.*?)(?=(?:QA_ID|related plant id)[:\s]*|$)/is);
            const plantIdMatch = section.match(/related plant id[:\s]*(\d+)/i);
    
            if (questionMatch || answerMatch) {
                let question = questionMatch ? questionMatch[1].trim() : "";
                let answer = answerMatch ? answerMatch[1].trim() : "";
    
                // Clean up the extracted text
                question = cleanText(question);
                answer = cleanText(answer);
    
                qaItems.push({
                    question: question,
                    answer: answer,
                    related_plant_id: plantIdMatch ? parseInt(plantIdMatch[1]) : 0
                });
            }
        }
    
        // If no structured Q&A pairs were found, try alternative parsing
        if (qaItems.length === 0) {
            const questionMarkers = responseText.split(/(?=(?:^|\n)(?:[\d]+\.|[•\-]|\([0-9]+\))\s*[^:\n]+\?)/m);
            
            for (let section of questionMarkers) {
                if (!section.trim()) continue;
    
                const lines = section.split('\n');
                let question = '';
                let answer = '';
                let foundQuestion = false;
    
                for (let line of lines) {
                    if (!foundQuestion && (line.includes('?') || /^(?:[\d]+\.|[•\-]|\([0-9]+\))/.test(line))) {
                        question = cleanText(line);
                        foundQuestion = true;
                    } else if (foundQuestion && line.trim()) {
                        answer += (answer ? '\n' : '') + cleanText(line);
                    }
                }
    
                if (question && answer) {
                    qaItems.push({
                        question: question,
                        answer: answer,
                        related_plant_id: 0
                    });
                }
            }
        }
    
        // If still no Q&A pairs found, create a single pair from the whole text
        if (qaItems.length === 0) {
            qaItems.push({
                question: cleanText(userQuestion),
                answer: cleanText(responseText),
                related_plant_id: 0
            });
        }
    
        return qaItems;
    }
    
    // Helper function to clean text
    function cleanText(text) {
        return text
            // Remove HTML tags
            .replace(/<[^>]*>/g, '')
            // Remove Question/Answer markers
            .replace(/^Question[:\s]+/i, '')
            .replace(/^Answer[:\s]+/i, '')
            // Remove related plant id text
            .replace(/related plant id[:\s]+\d+/i, '')
            // Remove numbered bullet points (like "3.", "4.")
            .replace(/^\d+\.\s*/gm, '')
            // Remove other bullet points
            .replace(/^[•\-]\s*/gm, '')
            // Remove parenthetical numbers
            .replace(/^\(\d+\)\s*/gm, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Main response generation function with improved Q&A handling
    const generateResponse = async (botMsgDiv) => {
        const textElement = botMsgDiv.querySelector(".message-text");
        controller = new AbortController();

        try {
            if (chatHistory.length === 0) {
                chatHistory.push({
                    role: "user",
                    parts: [{ text: systemInstruction }],
                });
            }

            chatHistory.push({
                role: "user",
                parts: [{
                    text: userData.message
                }, ...(userData.file.data ? [{
                    inline_data: (({fileName, isImage, ...rest}) => rest)(userData.file)
                }] : [])],
            });

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: chatHistory,
                    generationConfig: generationConfig
                }),
                signal: controller.signal,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error.message);

            const responseText = data.candidates[0].content.parts[0].text.trim();
            
            // Log bot response
            console.log('📝 Bot Response:', responseText);
            
            // Check for file attachment
            const hasFileAttachment = !!userData.file.data;
            
            // Extract Q&A data
            const qaData = extractQAData(responseText, userData.message, hasFileAttachment);
            
            // Save Q&A data to database
            if (Array.isArray(qaData)) {
                console.log(`💾 Saving ${qaData.length} Q&A items to database`);
                for (const qaItem of qaData) {
                    try {
                        console.log('📎 Saving Q&A item:', 
                            `Q: ${qaItem.question.substring(0, 30)}...`, 
                            `A: ${qaItem.answer.substring(0, 30)}...`,
                            `ID: ${qaItem.related_plant_id}`);
                        await saveChatToDatabase(qaItem);
                    } catch (dbError) {
                        console.error('❌ Error saving Q&A item to database:', dbError);
                    }
                }
            } else {
                // Single Q&A pair
                console.log('📎 Saving single Q&A item:', 
                    `Q: ${qaData.question.substring(0, 30)}...`, 
                    `A: ${qaData.answer.substring(0, 30)}...`,
                    `ID: ${qaData.related_plant_id}`);
                try {
                    await saveChatToDatabase(qaData);
                } catch (dbError) {
                    console.error('❌ Error saving to database:', dbError);
                }
            }

            typingEffect(responseText, textElement, botMsgDiv);

            chatHistory.push({
                role: "model",
                parts: [{ text: responseText }]
            });

        } catch (error) {
            console.error('Error in generateResponse:', error);
            textElement.textContent = error.name === "AbortError" ? 
                "หยุดการสร้างคำตอบแล้ว" : error.message;
            textElement.style.color = "#d62939";
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
            scrollToBottom();
        } finally {
            userData.file = {};
        }
    };

    // Event Handlers
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const userMessage = promptInput.value.trim();
        if (!userMessage || document.body.classList.contains("bot-responding")) return;

        userData.message = userMessage;
        promptInput.value = "";
        document.body.classList.add("chats-active", "bot-responding");
        fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

        const userMsgHTML = `
            <p class="message-text"></p>
            ${userData.file.data ? (userData.file.isImage ? 
                `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : 
                `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
        `;

        const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
        userMsgDiv.querySelector(".message-text").textContent = userData.message;
        chatsContainer.appendChild(userMsgDiv);
        scrollToBottom();

        setTimeout(() => {
            const botMsgHTML = `<img class="avatar" src="img/043.webp" /> <p class="message-text">รอสักครู่นะคะ...</p>`;
            const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
            chatsContainer.appendChild(botMsgDiv);
            scrollToBottom();
            generateResponse(botMsgDiv);
        }, 600);
    };

    // Event Listeners
    if (sidebarToggle && sidebarContainer) {
        sidebarToggle.addEventListener('click', (event) => {
            event.preventDefault();
            sidebarContainer.classList.toggle('show-sidebar');
            overlay.classList.toggle('show-overlay');
        });

        overlay.addEventListener('click', () => {
            sidebarContainer.classList.remove('show-sidebar');
            overlay.classList.remove('show-overlay');
        });
    }

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        const isImage = file.type.startsWith("image/");
        const reader = new FileReader();
        reader.readAs
        reader.readAsDataURL(file);

        reader.onload = (e) => {
            fileInput.value = "";
            const base64String = e.target.result.split(",")[1];
            fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
            fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

            userData.file = {
                fileName: file.name,
                data: base64String,
                mime_type: file.type,
                isImage
            };
        };
    });

    document.querySelector("#cancel-file-btn").addEventListener("click", () => {
        userData.file = {};
        fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
    });

    document.querySelector("#stop-response-btn").addEventListener("click", () => {
        controller?.abort();
        userData.file = {};
        clearInterval(typingInterval);
        chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
        document.body.classList.remove("bot-responding");
    });

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const isLightTheme = document.body.classList.toggle("light-theme");
            localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
            themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
        });
    }

    document.querySelector("#delete-chats-btn").addEventListener("click", () => {
        chatHistory.length = 0;
        chatsContainer.innerHTML = "";
        document.body.classList.remove("chats-active", "bot-responding");
    });

    document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
        suggestion.addEventListener("click", () => {
            promptInput.value = suggestion.querySelector(".text").textContent;
            promptForm.dispatchEvent(new Event("submit"));
        });
    });

    document.addEventListener("click", ({target}) => {
        const wrapper = document.querySelector(".prompt-wrapper");
        const shouldHide = target.classList.contains("prompt-input") || 
            (wrapper.classList.contains("hide-controls") && 
             (target.id === "add-file-btn" || target.id === "stop-response-btn"));
        wrapper.classList.toggle("hide-controls", shouldHide);
    });

    if (promptForm) {
        promptForm.addEventListener("submit", handleFormSubmit);
        promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
    }

    // Plant search function
    window.searchPlants = function() {
        const input = document.getElementById("plantSearchInput");
        const searchTerm = input.value.trim().toLowerCase();
        const plantCards = document.querySelectorAll(".plant-card");
        let foundCount = 0;

        plantCards.forEach(card => {
            const plantName = card.dataset.plantName.toLowerCase();
            if (plantName.includes(searchTerm)) {
                card.style.display = "flex";
                foundCount++;
            } else {
                card.style.display = "none";
            }
        });

        const plantInfoSection = document.getElementById("plant-info");
        let noResultsMessage = plantInfoSection.querySelector(".no-results-message");

        if (foundCount === 0) {
            if (!noResultsMessage) {
                noResultsMessage = document.createElement("p");
                noResultsMessage.classList.add("no-results-message");
                noResultsMessage.textContent = "ไม่พบพืชที่ตรงกับการค้นหาของคุณ";
                plantInfoSection.appendChild(noResultsMessage);
            }
            noResultsMessage.style.display = "block";
        } else {
            if (noResultsMessage) {
                noResultsMessage.style.display = "none";
            }
        }
    };
});