//Put ALL Function inside this one.
document.addEventListener('DOMContentLoaded', () => {
    window.searchPlants = function() {
        const input = document.getElementById("plantSearchInput");
        const searchTerm = input.value.trim().toLowerCase();

        const plantCards = document.querySelectorAll(".plant-card");
        let foundCount = 0;

        plantCards.forEach(card => {
            const plantName = card.dataset.plantName.toLowerCase();

            if (plantName.includes(searchTerm)) {
                card.style.display = "flex"; // Or whatever display style is appropriate
                foundCount++;
            } else {
                card.style.display = "none";
            }
        });
        // Display a message if no plants were found
        const plantInfoSection = document.getElementById("plant-info");
        let noResultsMessage = plantInfoSection.querySelector(".no-results-message");

        if (foundCount === 0) {
            if (!noResultsMessage) { // create it only if it doesn't exist
                noResultsMessage = document.createElement("p");
                noResultsMessage.classList.add("no-results-message");
                noResultsMessage.textContent = "ไม่พบพืชที่ตรงกับการค้นหาของคุณ";
                plantInfoSection.appendChild(noResultsMessage); // append *after* the grid, probably
            }
            noResultsMessage.style.display = "block"; // or whatever is appropriate
        } else {
            if (noResultsMessage) { // if it exists, hide it
                noResultsMessage.style.display = "none";
            }
        }
        // Clear the input after searching (optional)
        input.value = "";
    }
})