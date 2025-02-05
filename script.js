let currentPage = 1;
let allRows = [];
const highlightColumns = [1, 4, 6, 8, 18];
let sortDirection = {};
let filteredRows = [];
let rowsPerPage = calculateRowsPerPage();
let currentDataset = null; // Track the currently loaded dataset

function calculateRowsPerPage() {
    const tableContainer = document.querySelector(".table-container");
    if (!tableContainer) return 20; // Fallback in case element is missing

    const windowHeight = window.innerHeight; // Total screen height
    const headerHeight = document.querySelector("h2").offsetHeight + 100; // Approximate header + controls
    const rowHeight = 30; // Approximate row height in pixels
    const availableHeight = windowHeight - headerHeight;

    return Math.max(10, Math.floor(availableHeight / rowHeight) - 4);
}

async function loadCSV(filename = "ratings_overall.csv") {
    if (currentDataset === filename) return; // Prevent duplicate loading
    currentDataset = filename; // Update the current dataset

    // Store the current search query before reloading the dataset
    const searchInput = document.getElementById("search");
    const previousSearch = searchInput.value.trim(); // ✅ Store the current search value

    // Construct the URL for fetching the CSV file
    const csvURL = `https://raw.githubusercontent.com/ausberg/tta_ratings/main/ratings/${filename}`;

    try {
        console.log(`Fetching: ${csvURL}`);

        // Fetch the CSV data from GitHub
        const response = await fetch(csvURL);

        if (!response.ok) {
            throw new Error(`Failed to load ${filename}, status: ${response.status}`);
        }

        const data = await response.text();
        console.log("CSV Data Loaded:", data.substring(0, 500));

        // Split CSV into rows, ignoring the header row
        const rows = data.trim().split("\n").slice(1);

        // Convert each row into an array of values, ignoring empty rows
        allRows = rows.map(row => row.split(/,|;/).slice(0, 19)).filter(columns => columns.length === 19);
        console.log("Parsed Rows:", allRows.length, "rows loaded");

        // Display the first page of data
        displayPage(1);

        // ✅ Do NOT reset the search input field!
        // searchInput.value = "";  <-- ❌ Removed to keep search text

        // Update the page title based on the selected dataset
        const titleMap = {
            "ratings_overall.csv": "Overall Ratings",
            "ratings_2p.csv": "2-Player Ratings",
            "ratings_3p.csv": "3-Player Ratings",
            "ratings_4p.csv": "4-Player Ratings"
        };
        document.getElementById("ratings-title").textContent = `ruby_buby's Mid-Season Ratings (${titleMap[filename].replace(" Ratings", "")})`;

        // Update the export button to download the currently selected file
        document.getElementById("ctrl-btn").setAttribute("data-filename", filename);

        // ✅ Restore the search filter after the new dataset loads
        setTimeout(() => {
            searchInput.value = previousSearch; // ✅ Restore the search text
            searchTable(); // ✅ Reapply the search filter
        }, 500); // Small delay to ensure table renders first

    } catch (error) {
        console.error("Error loading CSV:", error);
    }

    // Enable sorting and filtering functionality
    addSorting();
    setupFilterButtons();
}

async function fetchLastCommitDate() {
    try {
        const response = await fetch("https://api.github.com/repos/ausberg/tta_ratings/commits/main");
        const data = await response.json();
        
        // Convert UTC date to local timezone
        const commitDateUTC = new Date(data.commit.committer.date);
        const year = commitDateUTC.getFullYear(); // Full 4-digit year
        const month = String(commitDateUTC.getMonth() + 1).padStart(2, '0'); // Ensure 2-digit month
        const day = String(commitDateUTC.getDate()).padStart(2, '0'); // Ensure 2-digit day

        const formattedDate = `${year}/${month}/${day}`; // YYYY/MM/DD format

        document.getElementById("last-updated").textContent = `Last updated: ${formattedDate}`;
    } catch (error) {
        console.error("Failed to fetch last commit date:", error);
        document.getElementById("last-updated").textContent = "Last updated: Unable to fetch";
    }
}
fetchLastCommitDate();

function addSorting() {
    // Remove existing event listeners to prevent duplication
    document.querySelectorAll("th").forEach(th => {
        let newTh = th.cloneNode(true);
        th.parentNode.replaceChild(newTh, th);
    });

    // Select all table headers and add a click event listener to each
    document.querySelectorAll("th").forEach((th, index) => {
        th.addEventListener("click", function (event) {
            // Ignore clicks on filter buttons
            if (event.target.classList.contains("filter-btn")) return;

            // Toggle sort direction for the clicked column
            sortDirection[index] = sortDirection[index] ? -sortDirection[index] : 1;

            // Determine the data to sort (filtered rows if any, otherwise all rows)
            let dataToSort = filteredRows.length > 0 ? filteredRows : allRows;

            // Sort the data based on the clicked column and sort direction
            dataToSort.sort((a, b) => sortDirection[index] * a[index].localeCompare(b[index], undefined, { numeric: true }));

            // Display the first page of the sorted data
            displayPage(1);
        });
    });
}

function setupFilterButtons() {
    // Add a click event listener to the document
    document.addEventListener("click", function(event) {
        // Check if the clicked element is a filter button
        if (event.target.classList.contains("filter-btn")) {
            // Prevent the event from propagating further
            event.stopPropagation();

            // Get the index of the column to filter
            const index = parseInt(event.target.getAttribute("data-index"));

            // Show the filter menu for the selected column
            showFilterMenu(index, event.target);
        }
    });
}

function handleFilterClick(event) {
    // Get the column index from the filter button
    const index = parseInt(event.target.getAttribute("data-index"));

    // Open the filter menu for this column
    showFilterMenu(index, event.target);
}

function showFilterMenu(index, button) {
    // Set the active column for filtering
    activeFilterColumn = index;

    // Get filter menu elements
    const filterMenu = document.getElementById("filter-menu");
    const filterTitle = document.getElementById("filter-title");
    const filterTooltip = document.getElementById("filter-tooltip");

    // Update the filter menu title to show the column being filtered
    filterTitle.textContent = `Filter: ${document.querySelectorAll("th")[index].textContent.trim()}`;

    // Ensure tooltip is visible
    filterTooltip.style.display = "block";

    // Position the filter menu below the clicked button
    const rect = button.getBoundingClientRect();
    filterMenu.style.display = "block";
    filterMenu.style.left = `${rect.left + window.scrollX}px`;
    filterMenu.style.top = `${rect.bottom + window.scrollY + 5}px`; // Offset slightly below
}

// Hides the filter menu when a filter is applied or dismissed
function hideFilterMenu() {
    document.getElementById("filter-menu").style.display = "none";
}

// Applies a column filter based on user input
function applyColumnFilter() {
    // Get the user input from the filter input box and trim whitespace
    let input = document.getElementById("filter-input").value.trim();

    // If no column is active or input is empty, exit function
    if (!activeFilterColumn || input === "") return;

    let condition = input;  // Stores the numeric/string value to compare against
    let operator = "=";  // Default comparison operator (exact match)

    // Regex to check for operators (<=, >=, <, >, =)
    const match = input.match(/^(<=|>=|>|<|=)\s*(.+)$/);
    if (match) {
        operator = match[1];  // Extract operator (e.g., ">=", "<=", etc.)
        condition = match[2].trim();  // Extract numeric or string value after the operator
    }

    // Filter rows based on the selected column and extracted condition
    filteredRows = allRows.filter(row => {
        let value = row[activeFilterColumn]; // Get the column value for the current row

        // Convert values to numbers if applicable for numeric comparisons
        if (!isNaN(value)) value = parseFloat(value);
        if (!isNaN(condition)) condition = parseFloat(condition);

        // Apply the comparison logic based on the operator
        switch (operator) {
            case "=": return value == condition; // Exact match
            case ">": return value > condition;  // Greater than
            case "<": return value < condition;  // Less than
            case ">=": return value >= condition; // Greater than or equal to
            case "<=": return value <= condition; // Less than or equal to
            default: return false; // If no valid operator found, return false (no match)
        }
    });

    displayPage(1); // Refresh table with filtered data
    hideFilterMenu(); // Close the filter menu
}

// Clears the applied column filter and resets the table to show all data
function clearColumnFilter() {
    filteredRows = [];  // Reset the filtered dataset
    displayPage(1);      // Reload the full table
    hideFilterMenu();    // Close the filter menu
}

// Displays a specific page of data in the table
function displayPage(page) {

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    let dataToDisplay = filteredRows.length > 0 ? filteredRows : allRows;
    const pageRows = dataToDisplay.slice(start, end);

    let tableBody = pageRows.map((columns, rowIndex) => {
        let globalRowIndex = start + rowIndex;
        let highlightClass = (globalRowIndex === window.highlightRowIndex) ? "highlight" : "";

        return `<tr class="${highlightClass}">
            ${columns.map((col, index) => formatColumn(col, index)).join('')}
        </tr>`;
    }).join('');

    document.getElementById("ratings-table-body").innerHTML = tableBody;

    updatePagination(page);
}

// Function to update rows per page dynamically
function updateRowsPerPage() {
    let selectedValue = document.getElementById("rowsPerPageSelect").value;
    rowsPerPage = selectedValue === "auto" ? calculateRowsPerPage() : parseInt(selectedValue, 10);
    displayPage(1); // Reload table with new row count
}

function jumpToPage() {
    const totalPages = Math.ceil(allRows.length / rowsPerPage); // Get total pages
    let pageInput = document.getElementById("pageJumpInput").value.trim();

    // Convert input to an integer and validate
    let targetPage = parseInt(pageInput);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
        displayPage(targetPage); // Jump to the entered page
    } else {
        alert(`Please enter a valid page number between 1 and ${totalPages}`);
    }
}

// Updates the pagination controls based on the current page
function updatePagination(page) {
    const totalPages = Math.ceil(allRows.length / rowsPerPage);
    let paginationDiv = document.querySelector(".pagination");
    
    // Clear existing pagination content
    paginationDiv.innerHTML = "";  

    // Create Previous button
    let prevBtn = document.createElement("button");
    prevBtn.textContent = "Previous";
    prevBtn.disabled = page === 1;
    prevBtn.addEventListener("click", () => displayPage(page - 1));
    paginationDiv.appendChild(prevBtn);

    // Determine the range of page numbers to display
    let startPage = Math.max(1, page - 3);
    let endPage = Math.min(totalPages, page + 3);

    // Show first page button if not already shown
    if (startPage > 1) {
        let firstPageBtn = document.createElement("button");
        firstPageBtn.textContent = "1";
        firstPageBtn.addEventListener("click", () => displayPage(1));
        paginationDiv.appendChild(firstPageBtn);

        if (startPage > 2) {
            let ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            paginationDiv.appendChild(ellipsis);
        }
    }

    // Generate page buttons dynamically
    for (let i = startPage; i <= endPage; i++) {
        let pageBtn = document.createElement("button");
        pageBtn.textContent = i;
        if (i === page) {
            pageBtn.style.fontWeight = "bold";
        }
        pageBtn.addEventListener("click", () => displayPage(i));
        paginationDiv.appendChild(pageBtn);
    }

    // Show last page button if not already shown
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            let ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            paginationDiv.appendChild(ellipsis);
        }

        let lastPageBtn = document.createElement("button");
        lastPageBtn.textContent = totalPages;
        lastPageBtn.addEventListener("click", () => displayPage(totalPages));
        paginationDiv.appendChild(lastPageBtn);
    }

    // Add the Jump-to-Page input
    let pageInput = document.createElement("input");
    pageInput.type = "number";
    pageInput.id = "pageJumpInput";
    pageInput.value = page;
    pageInput.min = "1";
    pageInput.max = totalPages;
    pageInput.style.width = "50px";
    pageInput.style.textAlign = "center";
    paginationDiv.appendChild(pageInput);

    // Add the "Go" button
    let goBtn = document.createElement("button");
    goBtn.textContent = "Go";
    goBtn.addEventListener("click", jumpToPage);
    paginationDiv.appendChild(goBtn);

    // Create Next button
    let nextBtn = document.createElement("button");
    nextBtn.id = "nextPageBtn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = page === totalPages;
    nextBtn.addEventListener("click", () => displayPage(page + 1));
    paginationDiv.appendChild(nextBtn);

    // Ensure rows-per-page dropdown exists and is inserted
    if (!document.getElementById("rowsPerPageSelect")) {
        let rowsPerPageContainer = document.createElement("div");
        rowsPerPageContainer.classList.add("rows-per-page-container");
        rowsPerPageContainer.innerHTML = `
            <label for="rowsPerPageSelect">Rows per page:</label>
            <select id="rowsPerPageSelect">
                <option value="auto">Auto</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="75">75</option>
                <option value="100">100</option>
            </select>
        `;

        paginationDiv.appendChild(rowsPerPageContainer);

        // Attach event listener AFTER element is created
        document.getElementById("rowsPerPageSelect").addEventListener("change", updateRowsPerPage);
    }
}

// Exports the selected CSV file for download
function exportCSV() {
    const exportBtn = document.getElementById("ctrl-btn");
    const filename = exportBtn.getAttribute("data-filename") || "ratings_overall.csv"; // Default if missing

    let csvURL = `https://raw.githubusercontent.com/ausberg/tta_ratings/main/ratings/${filename}`;

    // Fetch the CSV file from the given URL
    fetch(csvURL)
        .then(response => response.blob()) // Convert response to a Blob object
        .then(blob => {
            // Create a temporary link element to trigger the file download
            let link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = filename; // Use the detected filename
            document.body.appendChild(link);
            link.click(); // Simulate a click to start download
            document.body.removeChild(link); // Remove the link after download
        })
        .catch(error => console.error("Error downloading CSV:", error)); // Handle errors
}

function exportAllCSV() {
    const filenames = ["ratings_overall.csv", "ratings_2p.csv", "ratings_3p.csv", "ratings_4p.csv"];

    filenames.forEach(filename => {
        let csvURL = `https://raw.githubusercontent.com/ausberg/tta_ratings/main/ratings/${filename}`;

        fetch(csvURL)
            .then(response => response.blob()) // Convert response to Blob
            .then(blob => {
                let link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click(); // Trigger download
                document.body.removeChild(link);
            })
            .catch(error => console.error(`Error downloading ${filename}:`, error));
    });
}

// Searches the table for rows that match the input query
function searchTable() {
    const query = document.getElementById("search").value.trim();

    // If the search box is empty, reset to full table
    if (!query) {
        filteredRows = []; // Clear the filtered list
        displayPage(1); // Restore full dataset
        return;
    }

    // Split input by commas and trim spaces
    let searchNames = query.split(",").map(name => name.trim().toLowerCase());

    // Filter rows where the Player column (index 2) contains any of the search terms
    filteredRows = allRows.filter(row => 
        searchNames.some(name => row[2].toLowerCase().includes(name))
    );

    if (filteredRows.length === 0) {
        return;
    }

    displayFilteredResults(filteredRows);
}

// Display full rows of filtered results (not just player names)
function displayFilteredResults(filteredRows) {
    let tableBody = filteredRows.map(columns => `
        <tr>
            ${columns.map((col, index) => formatColumn(col, index)).join('')} 
        </tr>
    `).join('');

    document.getElementById("ratings-table-body").innerHTML = tableBody;
}

function jumpToPlayer() {
    const query = document.getElementById("search").value.trim();

    // Check if multiple names are entered
    if (query.includes(",")) {
        alert("Please enter only one name to jump to a page.");
        return;
    }

    // If search box is empty, do nothing
    if (!query) return;

    let playerName = query.toLowerCase();

    // Reset filtering to ensure full dataset is used
    filteredRows = [];

    // Find the index of the player in the full dataset
    let foundIndex = allRows.findIndex(row => row[2].toLowerCase() === playerName);

    if (foundIndex === -1) {
        alert(`Player "${query}" not found.`);
        return;
    }

    // Calculate the page number where the player is located
    let pageNumber = Math.floor(foundIndex / rowsPerPage) + 1;

    // Highlight the row
    window.highlightRowIndex = foundIndex;

    // Ensure full table is displayed before jumping
    displayPage(pageNumber);
}

// Ensure the highlight formatting applies correctly
function formatColumn(value, index) {
    // Columns where highlight formatting applies
    const highlightColumns = [1, 4, 6, 8, 18]; // Adjust as needed

    if (highlightColumns.includes(index)) {
        let num = parseFloat(value);

        if (!isNaN(num)) {
            let formattedValue = (num > 0 ? `+${num}` : num); // Add "+" for positive values
            let className = num > 0 ? "positive" : num < 0 ? "negative" : "";
            return `<td class="${className}">${formattedValue}</td>`;
        }
    }
    
    return `<td>${value}</td>`;
}

document.addEventListener("DOMContentLoaded", function () {
    function safeAddListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    const searchInput = document.getElementById("search");
    const jumpButton = document.getElementById("jumpToPlayerBtn");
    let currentDataset = null; // Track the currently loaded dataset
    let activeButton = document.getElementById("overallRatingsBtn"); // Default active button

    // ✅ Prevent duplicate dataset loading
    document.querySelectorAll(".ctrl-btn").forEach(button => {
        button.addEventListener("click", function () {
            const filename = this.getAttribute("data-filename");
    
            if (currentDataset !== filename) {  
                currentDataset = filename;
                loadCSV(filename);
                setActiveButton(this); // ✅ Call function to highlight active button
                
                setTimeout(() => {
                    searchTable(); // Reapply search filter after data loads
                }, 500);
            }
        });
    });    

    // ✅ Ensure only one button is active at a time
    function setActiveButton(selectedButton) {
        document.querySelectorAll(".ctrl-btn").forEach(btn => btn.classList.remove("active-btn"));
        selectedButton.classList.add("active-btn");
        activeButton = selectedButton;
    }

    // ✅ Search input event listener
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            let query = searchInput.value.trim();
            let nameList = query.split(",").map(name => name.trim()).filter(name => name !== "");

            if (nameList.length > 8) {
                alert("You can only enter up to 8 names.");
                searchInput.value = nameList.slice(0, 8).join(", ");
            }

            searchTable(); // Ensure table filters properly
        });
    }

    // ✅ Jump to Player button event listener
    if (jumpButton) {
        jumpButton.addEventListener("click", jumpToPlayer);
    }

    // ✅ Attach event listeners for rating buttons (load CSVs)
    safeAddListener("overallRatingsBtn", "click", () => loadCSV("ratings_overall.csv"));
    safeAddListener("ratings2pBtn", "click", () => loadCSV("ratings_2p.csv"));
    safeAddListener("ratings3pBtn", "click", () => loadCSV("ratings_3p.csv"));
    safeAddListener("ratings4pBtn", "click", () => loadCSV("ratings_4p.csv"));

    // ✅ Attach event listeners for export buttons
    safeAddListener("ctrl-btn", "click", exportCSV);
    safeAddListener("exportAllBtn", "click", exportAllCSV);

    // ✅ Attach event listeners to pagination buttons
    safeAddListener("prevPageBtn", "click", () => displayPage(currentPage - 1));
    safeAddListener("pageMinus3", "click", () => displayPage(currentPage - 3));
    safeAddListener("pageMinus2", "click", () => displayPage(currentPage - 2));
    safeAddListener("pageMinus1", "click", () => displayPage(currentPage - 1));
    safeAddListener("jumpToPageBtn", "click", jumpToPage);
    safeAddListener("pagePlus1", "click", () => displayPage(currentPage + 1));
    safeAddListener("pagePlus2", "click", () => displayPage(currentPage + 2));
    safeAddListener("pagePlus3", "click", () => displayPage(currentPage + 3));
    safeAddListener("nextPageBtn", "click", () => displayPage(currentPage + 1));

    // ✅ Attach event listeners for filter buttons
    safeAddListener("applyFilterBtn", "click", applyColumnFilter);
    safeAddListener("clearFilterBtn", "click", clearColumnFilter);

    // ✅ Ensure default button is active on page load
    if (activeButton) {
        activeButton.classList.add("active-btn");
    }
});

// Load the table on page load
window.onload = async function() {
    rowsPerPage = calculateRowsPerPage();
    await loadCSV();

    // Update on window resize
    window.addEventListener("resize", () => {
        rowsPerPage = calculateRowsPerPage();
        displayPage(currentPage);
    });

    fetchLastCommitDate(); // Ensure last updated date is fetched
};