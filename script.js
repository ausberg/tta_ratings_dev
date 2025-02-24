let currentPage = 1;
let allRows = [];
let sortDirection = {};
let filteredRows = [];
let rowsPerPage = calculateRowsPerPage();
let currentDataset = null; // Track the currently loaded dataset
let activeFilters = {}; // Store column filters persistently
let activeFilterColumn = null; // Track which column is being filtered
let searchQuery = "";  // Store the search term
let autoRowsSet = false; // Track if Auto rows have been set already
let manualRowsSet = false; // Track if the user manually selected rows
let autoRowsInitialized = false; // Ensures Auto only runs once per page load

function calculateRowsPerPage() {
    const tableContainer = document.querySelector(".table-container");
    if (!tableContainer) return 20; // Fallback in case element is missing

    const windowHeight = window.innerHeight; // Total screen height
    const headerHeight = document.querySelector("h2").offsetHeight + 100; // Approximate header + controls
    const rowHeight = 30; // Approximate row height in pixels
    const availableHeight = windowHeight - headerHeight;

    return Math.max(10, Math.floor(availableHeight / rowHeight) - 5);
}

async function loadCSV(filename = "ratings_overall.csv", preservePage = false) {

    if (!filename || filename === "null") {  // Prevent loading null dataset
        console.error("Error: Attempted to load an invalid dataset:", filename);
        return;
    }

    if (currentDataset === filename) return; // Prevent redundant loads
    currentDataset = filename; // Ensure correct dataset tracking

    const searchInput = document.getElementById("search");
    const previousSearch = searchInput.value.trim();
    let lastPage = preservePage ? currentPage : 1;
    sortDirection = {}; // Reset sorting state

    try {
        const response = await fetch(`https://raw.githubusercontent.com/ausberg/tta_ratings_dev/main/ratings/${filename}`);
        if (!response.ok) throw new Error(`Failed to load ${filename}, status: ${response.status}`);
    
        const data = await response.text();
    
        let rawRows = data.trim().split("\n").slice(1).map(row => {
            let columns = row.split(/,|;/).map(value => isNaN(value) ? value.trim() : parseFloat(value)); // Convert numbers correctly
            
            // Ensure country code is uppercase and valid
            let countryCode = columns[3] && columns[3] !== "-" ? columns[3].toUpperCase() : "";
            let flagImg = countryCode 
                ? `<img src="https://raw.githubusercontent.com/yammadev/flag-icons/master/png/${countryCode}.png" 
                        alt="${countryCode}" title="${countryCode}" width="20" height="15" 
                        onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<span title=\'Unknown\'>🌍</span>';">`
                : `<span title='Unknown'>🌍</span>`; // Text fallback for missing country codes with tooltip
        
            return [
                columns[0],  // Rank
                columns[1],  // Rank Δ
                columns[21], // Title
                formatPlayerName(columns[2]),  // Player name with trophy
                flagImg,  // Country (Flag icon with proper fallback)
                parseFloat(columns[4]).toFixed(0),  // C Rating
                parseFloat(columns[5]).toFixed(1),  // C R Δ
                parseFloat(columns[6]).toFixed(0),  // Rating
                parseFloat(columns[7]).toFixed(1),  // E R Δ
                parseFloat(columns[8]).toFixed(1),  // RD
                parseFloat(columns[10]).toFixed(0),  // Opps
                parseFloat(columns[11]).toFixed(0),  // Opps Δ
                parseFloat(columns[12]).toFixed(0),  // Ws
                parseFloat(columns[13]).toFixed(0),  // Ws Δ
                parseFloat(columns[14]).toFixed(0),  // Ls
                parseFloat(columns[15]).toFixed(0),  // Ls Δ
                parseFloat(columns[16]).toFixed(0),  // Ds
                parseFloat(columns[18]).toFixed(1),  // W%
                parseFloat(columns[19]).toFixed(2)   // W% Δ
            ];
        }).filter(columns => columns.length === 19);                     
    
        allRows = rawRows; // Store processed rows
    
        // Now that allRows is built, store raw player names separately
        playerRawNames = {}; // Reset to prevent duplicates
        allRows.forEach((row, index) => {
            let rawPlayerName = row[3].replace(/<[^>]+>/g, "").trim(); // Remove HTML tags from formatted name
            playerRawNames[rawPlayerName.toLowerCase()] = index;
        });
    
        // Reset sorting state when loading a new dataset
        sortDirection = {};
        filteredRows = [];

        // Ensure sorting applies correctly when dataset loads
        addSorting();
        displayPage(lastPage);

        setTimeout(() => {
            searchInput.value = searchQuery; // Restore previous search term
            applyStoredFilters(); // Ensure column filters are applied first
            searchTable(); // Apply search on top of filtered data
        }, 300);                      

    } catch (error) {
        console.error("Error loading CSV:", error);
    }

    setupFilterButtons();
}

// Ensure the highlight formatting applies correctly
function formatColumn(value, index) {
    // Columns where highlight formatting applies
    const highlightColumns = [1, 6, 8, 11, 13, 15, 18]; // Adjust as needed

    let num = parseFloat(value);

    // Special case: Column 11 should be red **only if the value is greater than 0**
    if (index === 15 && !isNaN(num) && num > 0) {
        return `<td class="red">+${num}</td>`;
    }

    // Apply highlight formatting for other columns
    if (highlightColumns.includes(index)) {
        if (!isNaN(num)) {
            let formattedValue = (num > 0 ? `+${num}` : num); // Add "+" for positive values
            let className = num > 0 ? "positive" : num < 0 ? "negative" : "";
            return `<td class="${className}">${formattedValue}</td>`;
        }
    }

    return `<td>${value}</td>`;
}

async function fetchLastCommitDate() {
    try {
        const response = await fetch("https://api.github.com/repos/ausberg/tta_ratings_dev/commits/main");
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

function formatPlayerName(player) {
    let icon = '';

    if (player === "Martin_Pecheur") {
        icon = '<img class="trophy gold-trophy" src="images/gold_trophy.png" alt="Gold Trophy" title="2024 World Champion - Martin_Pecheur">';
    } else if (player === "pv4") {
        icon = '<img class="trophy silver-trophy" src="images/silver_trophy.png" alt="Silver Trophy" title="2024 World Runner-Up - pv4">';
    } else if (player === "Weidenbaum") {
        icon = '<img class="trophy bronze-trophy" src="images/bronze_trophy.png" alt="Bronze Trophy" title="2024 World 3rd Place - Weidenbaum">';
    } else if (player === "e5582768") {
        icon = '<img class="trophy fourth-place-ribbon" src="images/fourth_place.png" alt="4th Place Ribbon" title="2024 World 4th Place - e5582768">';
    }

    return `${icon} ${player}`;
}

function addSorting() {
    document.querySelectorAll("th").forEach((th, index) => {
        th.replaceWith(th.cloneNode(true)); // Removes existing event listeners
    });

    document.querySelectorAll("th").forEach((th, index) => {
        th.addEventListener("click", function (event) {
            if (event.target.classList.contains("filter-btn")) return; // Ignore filter button clicks

            // Toggle sorting direction (default is ascending)
            sortDirection[index] = sortDirection[index] ? -sortDirection[index] : -1;

            let dataToSort = filteredRows.length > 0 ? [...filteredRows] : [...allRows]; // Work on a copy

            dataToSort.sort((a, b) => {
                let valA = a[index], valB = b[index];
            
                // Special case: Sorting "Player" column (index 2)
                if (index === 2) {
                    return sortDirection[index] * valA.toString().localeCompare(valB.toString(), undefined, { numeric: true, sensitivity: 'base' });
                }
            
                // Convert numeric columns to numbers for sorting
                valA = isNaN(valA) ? null : parseFloat(valA);
                valB = isNaN(valB) ? null : parseFloat(valB);
            
                // Move NaNs to the bottom
                if (valA === null && valB !== null) return 1;
                if (valB === null && valA !== null) return -1;
                if (valA === null && valB === null) return 0;
            
                return sortDirection[index] * ((valA > valB) ? 1 : (valA < valB) ? -1 : 0);
            });                      

            filteredRows = [...dataToSort]; // Ensure it updates properly
            displayPage(1);
        });
    });
}

function setupFilterButtons() {
    document.addEventListener("click", function(event) {
        const filterMenu = document.getElementById("filter-menu");

        // Check if the clicked element is a filter button
        if (event.target.classList.contains("filter-btn")) {
            event.stopPropagation(); // Prevent the document click event from firing
            const index = parseInt(event.target.getAttribute("data-index"));
            showFilterMenu(index, event.target);
        } else if (!filterMenu.contains(event.target)) {
            // If clicking outside the filter menu, close it
            hideFilterMenu();
        }
    });
}

function handleFilterClick(event) {
    // Get the column index from the filter button
    const index = parseInt(event.target.getAttribute("data-index"));

    // Open the filter menu for this column
    showFilterMenu(index, event.target);
}

function setupFilterInput() {
    const filterInput = document.getElementById("filter-input");

    // Remove any existing event listener (if any) before adding a new one
    filterInput.removeEventListener("keydown", handleFilterEnter);
    filterInput.addEventListener("keydown", handleFilterEnter);
}

// Global function to handle Enter key press for filtering
function handleFilterEnter(event) {
    if (event.key === "Enter") {
        event.preventDefault();

        const filterInput = document.getElementById("filter-input");

        // Force re-focus on input before applying the filter
        filterInput.focus();
        filterInput.blur(); // Remove any autocomplete suggestions
        filterInput.focus();

        applyColumnFilter();
    }
}

function showFilterMenu(index, button) {
    activeFilterColumn = index; // Store the active column being filtered

    const filterMenu = document.getElementById("filter-menu");
    const filterTitle = document.getElementById("filter-title");
    filterTitle.textContent = `Filter: ${document.querySelectorAll("th")[index].textContent.trim()}`;

    const rect = button.getBoundingClientRect();
    filterMenu.style.display = "block";
    filterMenu.style.left = `${rect.left + window.scrollX}px`;
    filterMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;

    // Restore previous filter value for this column (if any)
    const filterInput = document.getElementById("filter-input");
    filterInput.value = activeFilters[index] || "";
    filterInput.focus();

    // Ensure the filter input has the correct event listener
    setupFilterInput();
}

// Hides the filter menu when a filter is applied or dismissed
function hideFilterMenu() {
    document.getElementById("filter-menu").style.display = "none";
}

// Applies a column filter based on user input
function applyColumnFilter() {
    let input = document.getElementById("filter-input").value.trim();
    if (!input || activeFilterColumn === null) return;

    // Extract operator (if present) and numeric part
    let operatorMatch = input.match(/^(<=|>=|>|<|=)/);
    let operator = operatorMatch ? operatorMatch[0] : "=";
    let condition = input.replace(/^(<=|>=|>|<|=)\s*/, ""); // Extract numeric part

    // Ensure condition is handled correctly
    let numericCondition = parseFloat(condition);

    // Store **full** filter value (including operator) for this column
    activeFilters[activeFilterColumn] = input; // Example: ">200"

    applyAllFilters(); // Process filtering across all columns

    displayPage(1);
    updatePagination(1);
    hideFilterMenu();

    // Highlight active filter button
    let filterBtn = document.querySelector(`.filter-btn[data-index="${activeFilterColumn}"]`);
    if (filterBtn) {
        filterBtn.classList.add("active-filter");
    }
}

function applyAllFilters() {
    if (Object.keys(activeFilters).length === 0) {
        filteredRows = [...allRows]; // Reset if no filters
        return;
    }

    filteredRows = allRows.filter(row => {
        return Object.entries(activeFilters).every(([colIndex, filterValue]) => {
            let cellValue = row[parseInt(colIndex)].toString().toLowerCase().trim();

            // Extract numeric value (if applicable)
            let numericValue = parseFloat(cellValue);
            let numericCondition = parseFloat(filterValue.replace(/[^0-9.-]/g, "")); // Extract numbers

            // Extract operator (including `!=`)
            let operatorMatch = filterValue.match(/^(<=|>=|>|<|=|!=)/);
            let operator = operatorMatch ? operatorMatch[0] : "=";
            let condition = filterValue.replace(/^(<=|>=|>|<|=|!=)\s*/, "").toLowerCase(); // Remove operator from input

            // **Handle `!=` (not equal) for BOTH text and numeric values**
            if (operator === "!=") {
                if (!isNaN(numericValue) && !isNaN(numericCondition)) {
                    return numericValue !== numericCondition; // Numeric comparison
                }
                return cellValue !== condition; // String comparison
            }

            // **String-based Filtering**
            if (isNaN(numericValue)) { // If not a number, treat as string
                switch (operator) {
                    case "=": return cellValue === condition;
                    default: return cellValue.includes(condition); // Default substring match
                }
            }

            // **Numeric-based Filtering**
            if (!isNaN(numericValue) && !isNaN(numericCondition)) {
                switch (operator) {
                    case "=": return numericValue === numericCondition;
                    case ">": return numericValue > numericCondition;
                    case "<": return numericValue < numericCondition;
                    case ">=": return numericValue >= numericCondition;
                    case "<=": return numericValue <= numericCondition;
                    default: return false;
                }
            }

            return false;
        });
    });

    displayPage(1);
}

// Function to reapply stored filters
function applyStoredFilters() {
    if (allRows.length === 0) {
        console.warn("No data loaded yet, skipping filter application.");
        return;
    }

    // Reset filter buttons
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active-filter"));

    // Apply all active filters
    applyAllFilters();

    displayPage(1);
    updatePagination(1);

    // Highlight all active filter buttons
    Object.keys(activeFilters).forEach(columnIndex => {
        let filterBtn = document.querySelector(`.filter-btn[data-index="${columnIndex}"]`);
        if (filterBtn) {
            filterBtn.classList.add("active-filter");
        }
    });
}

function applyStoredFilter(columnIndex, filterValue) {
    if (!filterValue || allRows.length === 0) return;

    let operator = "=";
    let condition = filterValue.trim();

    // Extract operator and number (e.g., "> 150" => ">", "150")
    const match = condition.match(/^(<=|>=|>|<|=)\s*(.+)$/);
    if (match) {
        operator = match[1];
        condition = match[2].trim();
    }

    let numericCondition = parseFloat(condition);
    
    let sourceData = filteredRows.length > 0 ? filteredRows : allRows;
    filteredRows = sourceData.filter(row => {
        let cellValue = parseFloat(row[columnIndex]);

        if (!isNaN(cellValue) && !isNaN(numericCondition)) {
            switch (operator) {
                case "=": return cellValue == numericCondition;
                case ">": return cellValue > numericCondition;
                case "<": return cellValue < numericCondition;
                case ">=": return cellValue >= numericCondition;
                case "<=": return cellValue <= numericCondition;
                default: return false;
            }
        } else {
            return row[columnIndex].toString().toLowerCase().includes(condition.toLowerCase());
        }
    });

    displayPage(1);
    updatePagination(1);
}

// Clears the applied column filter and resets the table to show all data
function clearColumnFilter() {
    if (activeFilterColumn !== null) {
        delete activeFilters[activeFilterColumn]; // Remove filter from stored filters

        // Remove highlight from filter button
        let filterBtn = document.querySelector(`.filter-btn[data-index="${activeFilterColumn}"]`);
        if (filterBtn) {
            filterBtn.classList.remove("active-filter");
        }
    }

    applyAllFilters();  // Reapply remaining filters
    displayPage(1);
    hideFilterMenu();  
}

// Displays a specific page of data in the table
function displayPage(page) {
    let dataToDisplay = filteredRows.length > 0 ? filteredRows : allRows;
    const totalPages = Math.ceil(dataToDisplay.length / rowsPerPage);

    if (page < 1 || page > totalPages) {
        // console.warn(`Page ${page} is out of bounds. Total pages available: ${totalPages}`);
        return;
    }

    currentPage = page; // Ensure correct page is stored

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageRows = dataToDisplay.slice(start, end);

    if (pageRows.length === 0) {
        console.warn("No rows to display on this page.");
    }

    let tableBody = pageRows.map((columns, rowIndex) => {
        let globalRowIndex = start + rowIndex;
        let highlightClass = (globalRowIndex === window.highlightRowIndex) ? "highlight" : "";

        return `<tr class="${highlightClass}">${columns.map((col, index) => formatColumn(col, index)).join('')}</tr>`;
    }).join('');

    document.getElementById("ratings-table-body").innerHTML = tableBody;
    updatePagination(page);

}

// Function to update rows per page dynamically
function updateRowsPerPage() {
    let selectElement = document.getElementById("rowsPerPageSelect");
    let selectedValue = selectElement.value;

    if (selectedValue === "auto") {
        autoRowsInitialized = false; // Reset so Auto can recalculate again
        rowsPerPage = calculateRowsPerPage();
        autoRowsInitialized = true; // Prevent repeated recalculations
    } else {
        rowsPerPage = parseInt(selectedValue, 10);
        manualRowsSet = true; // Lock in manual selection
        autoRowsInitialized = false; // Allow Auto to be selected again
    }

    displayPage(1); // Reload table with the new row count

    // Ensure the dropdown visually updates to reflect the actual selection
    selectElement.value = selectedValue;
}

function jumpToPage() {
    let pageInput = document.getElementById("pageJumpInput").value.trim();
    let targetPage = parseInt(pageInput);

    if (isNaN(targetPage) || targetPage < 1 || targetPage > Math.ceil((filteredRows.length > 0 ? filteredRows.length : allRows.length) / rowsPerPage)) {
        alert("Invalid page number.");
        return;
    }

    currentPage = targetPage;
    displayPage(currentPage);  // Ensure table updates after page jump
}

// Updates the pagination controls based on the current page
function updatePagination(page) {
    const totalPages = Math.ceil(allRows.length / rowsPerPage);
    let paginationDiv = document.querySelector(".pagination");

    // Clear existing pagination content
    paginationDiv.innerHTML = "";

    // Set fixed button width for consistency
    const buttonWidth = "50px";

    // Ensure exactly 3 pages are shown at any time
    let startPage = Math.max(1, page - 1);
    let endPage = Math.min(totalPages, startPage + 2);

    // Adjust for edge cases
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

    // First Button
    let firstBtn = document.createElement("button");
    firstBtn.textContent = "First";
    firstBtn.style.width = buttonWidth;
    firstBtn.disabled = page === 1;
    firstBtn.addEventListener("click", () => displayPage(1));
    paginationDiv.appendChild(firstBtn);

    for (let i = startPage; i <= endPage; i++) {
        let pageBtn = document.createElement("button");
        pageBtn.textContent = i;
        pageBtn.style.width = buttonWidth;
        if (i === page) {
            pageBtn.style.fontWeight = "bold";
            pageBtn.disabled = true;
        } else {
            pageBtn.addEventListener("click", () => displayPage(i));
        }
        paginationDiv.appendChild(pageBtn);
    }

    // Last Button
    let lastBtn = document.createElement("button");
    lastBtn.textContent = "Last";
    lastBtn.style.width = buttonWidth;
    lastBtn.disabled = page === totalPages;
    lastBtn.addEventListener("click", () => displayPage(totalPages));
    paginationDiv.appendChild(lastBtn);

    // Jump-to-Page input
    let pageInput = document.createElement("input");
    pageInput.type = "number";
    pageInput.id = "pageJumpInput";
    pageInput.value = page;
    pageInput.min = "1";
    pageInput.max = totalPages;
    pageInput.style.width = "50px";
    pageInput.style.textAlign = "center";
    paginationDiv.appendChild(pageInput);

    // "Go" button
    let goBtn = document.createElement("button");
    goBtn.textContent = "Go";
    goBtn.style.width = buttonWidth;
    goBtn.addEventListener("click", jumpToPage);
    paginationDiv.appendChild(goBtn);

    // Ensure rows-per-page dropdown is created only once
    let selectElement = document.getElementById("rowsPerPageSelect");

    if (!selectElement) {
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
                <option value="5000">Olesch</option>
            </select>
        `;
        paginationDiv.appendChild(rowsPerPageContainer);

        selectElement = document.getElementById("rowsPerPageSelect");
        selectElement.addEventListener("change", updateRowsPerPage);
    }

    // Ensure the dropdown reflects the actual selected value
    selectElement.value = autoRowsInitialized ? "auto" : rowsPerPage.toString();
}

let lastDownloadTime = 0;
// Exports the selected CSV file for download
function exportCSV() {
    if (!currentDataset) {
        console.error("Error: No dataset is currently loaded.");
        return;
    }

    // Enforce rate limit: At most 1 download every 30 seconds
    let now = Date.now();
    if (now - lastDownloadTime < 30000) { // 30 seconds in milliseconds
        alert("You're downloading too fast! Please wait a few seconds before trying again.");
        return;
    }
    lastDownloadTime = now; 

    let csvURL = `https://raw.githubusercontent.com/ausberg/tta_ratings_dev/main/ratings/${currentDataset}`;

    fetch(csvURL)
        .then(response => response.blob()) // Convert response to Blob
        .then(blob => {
            let link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = currentDataset; 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch(error => console.error("Error downloading CSV:", error));
}

let lastAllDownloadTime = 0;
function exportAllCSV() {
    const filenames = ["ratings_overall.csv", "ratings_2p.csv", "ratings_3p.csv", "ratings_4p.csv"];

    // Enforce rate limit: At most one "Export All" download every 30 seconds
    let now = Date.now();
    if (now - lastAllDownloadTime < 30000) { // 30 seconds in milliseconds
        alert("You're downloading too fast! Please wait a few seconds before trying again.");
        return;
    }
    lastAllDownloadTime = now;

    filenames.forEach((filename, index) => {
        setTimeout(() => {
            let csvURL = `https://raw.githubusercontent.com/ausberg/tta_ratings_dev/main/ratings/${filename}`;

            fetch(csvURL)
                .then(response => response.blob()) // Convert response to Blob
                .then(blob => {
                    let link = document.createElement("a");
                    link.href = window.URL.createObjectURL(blob);
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                })
                .catch(error => console.error(`Error downloading ${filename}:`, error));
        }, index * 2000); // Stagger downloads every 2 seconds to avoid triggering Cloudflare/GitHub limits
    });
}        

// Searches the table for rows that match the input query
function searchTable() {
    searchQuery = document.getElementById("search").value.trim(); // Store the search term

    if (!searchQuery) {
        applyAllFilters();  // Ensure filters still apply
        displayPage(1);
        return;
    }

    let searchNames = searchQuery.split(",").map(name => name.trim().toLowerCase());

    filteredRows = allRows.filter(row => {
        if (typeof row[3] !== "string") return false;

        let playerName = row[3].replace(/<\/?[^>]+(>|$)/g, "").trim().toLowerCase(); // Strip HTML before search

        return searchNames.some(name => {
            if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
                // Exact match (remove quotes)
                return playerName === name.slice(1, -1);
            } else {
                // Partial match
                return playerName.includes(name);
            }
        });
    });

    displayPage(1);
}

function applySearchFilter() {
    if (!searchQuery) return; // If no search term, do nothing

    let searchNames = searchQuery.split(",").map(name => name.trim().toLowerCase());

    // Ensure search is applied AFTER column filters
    filteredRows = (filteredRows.length > 0 ? filteredRows : allRows).filter(row =>
        typeof row[3] === "string" && searchNames.some(name => row[3].toLowerCase().includes(name))
    );

    displayPage(1); // Refresh the table with filtered results
}

function jumpToPlayer() {
    const searchInput = document.getElementById("search");
    const query = searchInput.value.trim().toLowerCase();

    if (!query || query.includes(",")) {
        alert("Please enter only one player's name.");
        return;
    }

    // Search for the player's index using the raw name dictionary
    let foundIndex = playerRawNames[query];

    if (foundIndex === undefined) {
        alert(`Player "${query}" not found.`);
        return;
    }

    let pageNumber = Math.floor(foundIndex / rowsPerPage) + 1;

    // Preserve the highlight row index
    window.highlightRowIndex = foundIndex;

    // Clear search input to prevent filtering issues
    searchInput.value = "";
    filteredRows = [];

    // Reload dataset without forcing a reset to Page 1
    loadCSV(currentDataset, true);

    setTimeout(() => {
        displayPage(pageNumber);
    }, 300);
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

    // Prevent duplicate dataset loading
    document.querySelectorAll(".ctrl-btn").forEach(button => {
        button.addEventListener("click", function () {
            const filename = this.getAttribute("data-filename");

            // Ensure only dataset-switching buttons trigger loadCSV
            if (!filename) {
                if (this.id !== "jumpToPlayerBtn") { // Allow "Show Player Page" button to function normally
                    // console.warn("Skipping button click - No dataset filename provided:", this.innerText);
                }
                return;
            }

            if (currentDataset !== filename) {  
                currentDataset = filename;
                loadCSV(filename, true); // Preserve the current page

                // Mark the clicked button as active
                setActiveButton(this);
            }
        });
    });                     

    // Ensure only one button is active at a time
    function setActiveButton(selectedButton) {
        document.querySelectorAll(".ctrl-btn").forEach(btn => btn.classList.remove("active-btn"));
        selectedButton.classList.add("active-btn");
        activeButton = selectedButton;
    }

    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            searchTable(); // Ensure table filters properly
        });
    }

    // Jump to Player button event listener
    if (jumpButton) {
        jumpButton.addEventListener("click", jumpToPlayer);
    }

    // Attach event listeners for rating buttons (load CSVs)
    safeAddListener("overallRatingsBtn", "click", () => loadCSV("ratings_overall.csv"));
    safeAddListener("ratings2pBtn", "click", () => loadCSV("ratings_2p.csv"));
    safeAddListener("ratings3pBtn", "click", () => loadCSV("ratings_3p.csv"));
    safeAddListener("ratings4pBtn", "click", () => loadCSV("ratings_4p.csv"));

    // Attach event listeners for export buttons
    safeAddListener("ctrl-btn", "click", exportCSV);
    safeAddListener("exportAllBtn", "click", exportAllCSV);

    // Attach event listeners to pagination buttons
    safeAddListener("prevPageBtn", "click", () => displayPage(currentPage - 1));
    safeAddListener("pageMinus3", "click", () => displayPage(currentPage - 3));
    safeAddListener("pageMinus2", "click", () => displayPage(currentPage - 2));
    safeAddListener("pageMinus1", "click", () => displayPage(currentPage - 1));
    safeAddListener("jumpToPageBtn", "click", jumpToPage);
    safeAddListener("pagePlus1", "click", () => displayPage(currentPage + 1));
    safeAddListener("pagePlus2", "click", () => displayPage(currentPage + 2));
    safeAddListener("pagePlus3", "click", () => displayPage(currentPage + 3));
    safeAddListener("nextPageBtn", "click", () => displayPage(currentPage + 1));

    // Attach event listeners for filter buttons
    safeAddListener("applyFilterBtn", "click", applyColumnFilter);
    safeAddListener("clearFilterBtn", "click", clearColumnFilter);

    // Ensure default button is active on page load
    if (activeButton) {
        activeButton.classList.add("active-btn");
    }
});

// Load the table on page load
window.onload = async function() {
    if (!autoRowsInitialized) { // Ensure Auto only runs once
        rowsPerPage = calculateRowsPerPage();
        autoRowsInitialized = true; // Lock it
    }

    autoRowsSet = true; // Keep your original logic
    await loadCSV();
    fetchLastCommitDate(); // Ensure last updated date is fetched
};
