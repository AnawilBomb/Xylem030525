document.addEventListener('DOMContentLoaded', () => {

    function addRow() {
        const table = document.getElementById("plantTable").getElementsByTagName('tbody')[0];
        const newRow = table.insertRow(table.rows.length);

        const cell1 = newRow.insertCell(0);
        const cell2 = newRow.insertCell(1);
        const cell3 = newRow.insertCell(2);
        const cell4 = newRow.insertCell(3);
        const cell5 = newRow.insertCell(4); // Actions

        cell1.innerHTML = "New Plant";
        cell2.innerHTML = "New Scientific Name";
        cell3.innerHTML = "New Family";
        cell4.innerHTML = "Easy";
        cell5.innerHTML = `
            <button onclick="editRow(this)">Edit</button>
            <button onclick="deleteRow(this)">Delete</button>
        `;
    }

    window.addRow = addRow; // Make addRow accessible globally

    function deleteRow(btn) {
        const row = btn.parentNode.parentNode;
        row.parentNode.removeChild(row);
    }

    window.deleteRow = deleteRow; // Make deleteRow accessible globally

    function editRow(btn) {
        const row = btn.parentNode.parentNode;
        const cells = row.getElementsByTagName('td');

        // Check if already in edit mode
        if (row.classList.contains('edit-mode')) {
            // Save changes
            for (let i = 0; i < cells.length - 1; i++) { // Exclude the last cell (actions)
                const input = cells[i].firstChild;
                cells[i].innerHTML = input.value; // Revert to text
            }
            btn.innerHTML = "Edit"; // Change button text back to "Edit"
            row.classList.remove('edit-mode'); // Remove edit mode class
        } else {
            // Enter edit mode
            for (let i = 0; i < cells.length - 1; i++) { // Exclude the last cell (actions)
                const text = cells[i].innerText;
                cells[i].innerHTML = `<input type="text" value="${text}">`;
            }
            btn.innerHTML = "Save"; // Change button text to "Save"
            row.classList.add('edit-mode'); // Add edit mode class
        }
    }
    window.editRow = editRow; // Make editRow accessible globally
});