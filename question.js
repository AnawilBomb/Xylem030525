// Get DOM elements
const addQuestionBtn = document.getElementById("addQuestionBtn");
const questionModal = document.getElementById("questionModal");
const modalTitle = document.getElementById("modalTitle");
const questionForm = document.getElementById("questionForm");
const questionText = document.getElementById("questionText");
const answerText = document.getElementById("answerText");
const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const questionTable = document.getElementById("questionTable").getElementsByTagName('tbody')[0]; // Get tbody

// Sample data
let questions = [
    { id: 1, question: "What is the capital of France?", answer: "Paris" },
    { id: 2, question: "What is 2 + 2?", answer: "4" },
];

let editingQuestionId = null; // Track if we're editing an existing question

// Function to display questions in the table
function displayQuestions() {
    questionTable.innerHTML = ""; // Clear existing rows
    questions.forEach(question => {
        let row = questionTable.insertRow();

        let questionCell = row.insertCell(0);
        let answerCell = row.insertCell(1);
        let actionsCell = row.insertCell(2);

        questionCell.textContent = question.question;
        answerCell.textContent = question.answer;

        actionsCell.innerHTML = `
            <button class="editBtn" data-id="${question.id}">Edit</button>
            <button class="deleteBtn" data-id="${question.id}">Delete</button>
        `;
    });

    // Add event listeners to the dynamically created buttons
    addEventListenersToButtons();
}


function addEventListenersToButtons() {
    let editButtons = document.querySelectorAll(".editBtn");
    editButtons.forEach(button => {
        button.addEventListener("click", editQuestion);
    });

    let deleteButtons = document.querySelectorAll(".deleteBtn");
    deleteButtons.forEach(button => {
        button.addEventListener("click", deleteQuestion);
    });
}

// Function to open the modal for adding a new question
addQuestionBtn.addEventListener("click", () => {
    modalTitle.textContent = "Add Question";
    questionText.value = "";
    answerText.value = "";
    editingQuestionId = null; // Reset editing ID
    questionModal.style.display = "block";
});


// Function to open the modal for editing an existing question
function editQuestion(event) {
    let questionId = parseInt(event.target.dataset.id);
    editingQuestionId = questionId;

    let questionToEdit = questions.find(question => question.id === questionId);

    if (questionToEdit) {
        modalTitle.textContent = "Edit Question";
        questionText.value = questionToEdit.question;
        answerText.value = questionToEdit.answer;
        questionModal.style.display = "block";
    }
}


// Function to delete a question
function deleteQuestion(event) {
    let questionId = parseInt(event.target.dataset.id);
    questions = questions.filter(question => question.id !== questionId); // Remove from array
    displayQuestions(); // Refresh the table
}

// Function to close the modal
function closeModal() {
    questionModal.style.display = "none";
}

// Event listeners
closeButton = document.querySelector(".close");
cancelButton = document.getElementById("cancelButton");

closeButton.addEventListener("click", closeModal);
cancelButton.addEventListener("click", closeModal);

window.addEventListener("click", (event) => {
    if (event.target === questionModal) {
        closeModal();
    }
});

// Function to handle form submission (Save button click)
questionForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent default form submission

    let questionValue = questionText.value.trim();
    let answerValue = answerText.value.trim();

    if (questionValue === "" || answerValue === "") {
        alert("Please fill in both the question and the answer.");
        return;
    }

    if (editingQuestionId) {
        // Update existing question
        questions = questions.map(question => {
            if (question.id === editingQuestionId) {
                return { ...question, question: questionValue, answer: answerValue };
            }
            return question;
        });
    } else {
        // Add new question
        let newQuestion = {
            id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1, // Simple ID generation
            question: questionValue,
            answer: answerValue
        };
        questions.push(newQuestion);
    }

    closeModal();
    displayQuestions(); // Refresh the table
});

// Initial display of questions
displayQuestions();