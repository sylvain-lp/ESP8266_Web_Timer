let timer;
let isRunning = false;
let startTime;
let elapsedTime = 0;
let climbers = JSON.parse(localStorage.getItem('climbers')) || [];
let selectedClimber = null;
let editIndex = -1;
let lastSortedColumn = null;    // For Visual Indicator of Sort 
let isAscending = true;         // For Visual ASC or DESC indicator

function vibrate() {
    if (navigator.vibrate) {
        navigator.vibrate(150);
    }
}
// TIMER INCREMENT
function updateTimer() {
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - startTime + elapsedTime;
    const minutes = Math.floor(timeDiff / 60000);
    const seconds = Math.floor((timeDiff % 60000) / 1000);
    const hundredths = Math.floor((timeDiff % 1000) / 10);
    document.getElementById('timer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

// TOGGLE TIMER START/STOP
function startStop() {
    if (!selectedClimber) {
        customAlert("Please <b>select a climber</b> first!");
        return;
    }
    fetch('/startStop')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                if (data.running) {
                    startTimer();
                } else {
                    stopTimer();
                }
            }
            updateButtonStates(data);
        })
        .catch(error => {
            startTimer();
            console.error('Error:', error);
            customAlert(`<b>Error</b> starting/stopping timer: ${error.message}`);

        })
        .finally(() => {
            vibrate();
        });
}

// START TIMER
function startTimer() {
    startTime = new Date().getTime();
    timer = setInterval(updateTimer, 10);
    isRunning = true;
}

// STOP TIMER + UPDATE CLIMBER
function stopTimer() {
    clearInterval(timer);
    elapsedTime += new Date().getTime() - startTime;
    const currentTime = document.getElementById('timer').textContent;
    selectedClimber.times.unshift(currentTime);
    updateClimberTable();
    saveClimbers();
    isRunning = false;
}

// ADD PENALTY TIME (old)
/* 
function addPenalty() {
    if (!isRunning) && (document.getElementById('timer').textContent != '00:00.00')
        customAlert('Activate Timer before Applying Penalty');
    } else {
        elapsedTime += 1000;
    }
    vibrate();
}
 */
// ADD PENALTY TIME (new)
function addPenalty() {
    // Check if Timer <> 0, to allow Penalty after Timer is stopped (bug: will only show on Timer, not User)
    const timerValue = document.getElementById('timer').textContent;

    // If Timer is ticking, add +1 sec Penalty
    if (isRunning) {
        elapsedTime += 1000;
    } else {
        // If Timer is stopped, but not Reset (to 00:00.00), add +1 sec Penalty
        if (timerValue !== '00:00.00') {
            elapsedTime += 1000;
            // Updating Time with Penalty for the Current Selected Climber
            // Not Sure if UPDATE & SAVE user table is NEEDED to show PENALY
            updateClimberTable();

        } else {
            customAlert('Please <b>start the timer</b> before applying a penalty.');
        }
    }
    vibrate();
}

// RESET TIMER
function resetTimer() {
    fetch('/reset')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                clearInterval(timer);
                isRunning = false;
                elapsedTime = 0;
                document.getElementById('timer').textContent = '00:00.00';
            }
            updateButtonStates(data);
        });
    vibrate();
}

// SET BUTTON START > STOP > READY > RESET
function updateButtonStates(data) {
    const startStopBtn = document.getElementById('startStop');
    const resetBtn = document.getElementById('reset');

    startStopBtn.disabled = data.startDisabled;
    startStopBtn.classList.toggle('button-disabled', data.startDisabled);
    startStopBtn.textContent = data.startLabel;

    resetBtn.disabled = data.resetState === 'LOCKED';
    resetBtn.classList.remove('button-yellow', 'button-red');
    if (data.resetState === 'READY') {
        resetBtn.classList.add('button-yellow');
    } else if (data.resetState === 'LOCKED') {
        resetBtn.classList.add('button-red');
    }
    resetBtn.textContent = data.resetLabel;
}

// ADD CLIMBER to TABLE
function addClimber() {
    const name = document.getElementById('climberName').value.trim();
    if (name) {
        const newClimber = { name, times: [] };
        climbers.push(newClimber);
        updateClimberTable();
        saveClimbers();
        resetTimer();
        document.getElementById('climberName').value = '';
        selectClimber(climbers.length - 1);  // Select the newly added climber
    }
    vibrate();
}

// UPDATE CLIMBER TABLE + SORT
function updateClimberTable() {
    const tbody = document.querySelector('#climberTable tbody');
    tbody.innerHTML = '';
    climbers.forEach((climber, index) => {
        const row = tbody.insertRow();

        // Radio button cell
        const radioCell = row.insertCell(0);
        radioCell.innerHTML = `
            <input type="radio" 
                   name="selectedClimber" 
                   value="${index}"
                   onchange="selectClimber(${index})" 
                   ${climber === selectedClimber ? 'checked' : ''}>
        `;

        // Name cell
        row.insertCell(1).textContent = climber.name;

        // Times cell
        row.insertCell(2).textContent = climber.times.join(', ');

        // Actions cell
        const actionsCell = row.insertCell(3);
        actionsCell.innerHTML = `
            <div class="action-buttons">
                <button class="edit-button" onclick="openEditModal(${index})">
                    <img src="/pencil.svg" alt="Edit" class="edit-icon">
                </button>
                <button class="remove-button" onclick="openRemoveModal(${index})">
                    <img src="/trash.svg" alt="Remove" class="trash-icon">
                </button>
            </div>
        `;
    });
}

// SELECT CLIMBER for TIMER
function selectClimber(index) {
    selectedClimber = climbers[index];
    resetTimer();
    updateClimberTable();
    vibrate();
}

// EDIT CLIMBER NAME (MESSAGE BOX)
function openEditModal(index) {
    editIndex = index;
    document.getElementById('editClimberName').value = climbers[index].name;
    document.getElementById('editModal').style.display = 'block';
}

// EDIT CLIMBER : Function to CLOSE the modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// EDIT CLIMBER : Add event listeners for CLOSING the modal
document.getElementById('closeEditModalButton').onclick = closeEditModal;
window.onclick = function (event) {
    if (event.target === document.getElementById('editModal')) {
        closeModal('editModal');
    }
}

// SAVE CLIMBER NAME + UPDATE TABLE (CLOSE MESSAGE BOX)
function saveEditClimber() {
    const newName = document.getElementById('editClimberName').value.trim();
    if (newName !== '') {
        climbers[editIndex].name = newName;
        updateClimberTable();
        saveClimbers();
    }
    closeModal('editModal');
    vibrate();
}

// REMOVE CLIMBER from UI (MESSAGE BOX)
function openRemoveModal(index) {
    editIndex = index;
    document.getElementById('removeModal').style.display = 'block';
}

// REMOVE CLIMBER CONFIRMED (CLOSE MESSAGE BOX)
function confirmRemoveClimber() {
    if (climbers[editIndex] === selectedClimber) {
        selectedClimber = null;
    }
    climbers.splice(editIndex, 1);
    updateClimberTable();
    saveClimbers();
    closeModal('removeModal');
    vibrate();
}

// (GENERIC: CLOSE MESSAGE BOX)
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// SAVE CLIMBERS - LOCALLY ONLY (SMARTPHONE)!
function saveClimbers() {
    localStorage.setItem('climbers', JSON.stringify(climbers));
}


// (GENERIC: SORT TABLE)
function sortTable(columnIndex) {
    const table = document.getElementById("climberTable");
    const headers = table.getElementsByTagName("th");

    // Remove sorting classes from all headers
    for (let i = 0; i < headers.length; i++) {
        headers[i].classList.remove('sorted-asc', 'sorted-desc');
    }

    // Toggle sort direction if the same column is clicked
    if (lastSortedColumn === columnIndex) {
        isAscending = !isAscending;
    } else {
        isAscending = true;
    }

    // Add appropriate class to the clicked header
    headers[columnIndex].classList.add(isAscending ? 'sorted-asc' : 'sorted-desc');

    // Sorting logic
    climbers.sort((a, b) => {
        let comparison = 0;
        if (columnIndex === 1) {
            comparison = a.name.localeCompare(b.name);
        } else if (columnIndex === 2) {
            comparison = (a.times[0] || '').localeCompare(b.times[0] || '');
        }
        return isAscending ? comparison : -comparison;
    });

    updateClimberTable();
    lastSortedColumn = columnIndex;
}

// (GENERIC: OPEN MESSAGE BOX)
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// SAVE RESULTS from TABLE to ESP8266 FS
async function saveResults() {
    try {
        // Prompt the user for a filename with a default value
        const defaultFilename = 'results.csv';

        // Basic Prompt (javascript), replaced with Custom Modal
        //const userFilename = prompt("Enter the filename:", defaultFilename);
        const filename = await customInput("Enter the filename:", "results.csv");

        // no longer needed after Custom Modal Prompt ?
        // const filename = userFilename ? userFilename : defaultFilename; // Use default if user cancels

        // Get current date and time from the client - to set file TIMESTAMP 
        const now = new Date();
        const timeString = now.toISOString().slice(0, 19); // Format: "YYYY-MM-DDTHH:MM:SS"

        // Send current time to the server
        const timeResponse = await fetch('/time', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: timeString
        });

        if (!timeResponse.ok) {
            throw new Error('Failed to set server time');
        }

        // Prepare CSV data from Climber Table
        const table = document.getElementById('climberTable');
        const headers = [...table.querySelectorAll('th')]
            .map(th => th.textContent.trim())
            .filter((_, index) => index !== 0 && index !== 3);

        const rows = [...table.querySelectorAll('tbody tr')]
            .map(row => [...row.cells]
                .filter((_, index) => index !== 0 && index !== 3)
                .map(cell => cell.textContent.trim()));

        const csvString = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');


        // alert(`/fileSave?filename=${encodeURIComponent(filename)}`);
        // Save CSV data 
        const response = await fetch(`/fileSave?filename=${encodeURIComponent(filename)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: csvString
        });

        if (response.ok) {
            const responseText = await response.text();
            customAlert(responseText);
        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to save results.csv');
        }
    } catch (error) {
        customAlert(`Error: ${error.message}`);
    }
}

// ##############################################
// LOAD RESULTS from ESP8266 Storage into Visible Table UI
async function loadResults(filename = 'results.csv') {

    try {
        // Warning and confirmation
        // const confirmLoad = await 
        // if (!confirmLoad) return;
        customAlert(`<b>Warning</b>: Loading Results will <b>erase</b> existing data on your Phone. Continue?`);

        // Open Modal Box to LIST all CSV files to select the one to LOAD
        listResultsToLoad();

        const response = await fetch(`/fileLoad?filename=${encodeURIComponent(filename)}`);
        if (!response.ok) {
            throw new Error('Failed to load results');
        }
        const csvData = await response.text();
        const rows = csvData.split('\n');
        climbers = []; // Clear existing climbers
        rows.forEach((row, index) => {
            if (index === 0 || row.trim() === '') return; // Skip header row and empty rows
            const [name, time] = row.split(',');
            if (name && time) {
                climbers.push({ name: name.trim(), times: [time.trim()] });
            }
        });
        updateClimberTable();
        saveClimbers(); // Update local storage
        customAlert(`Results from <b>${filename}</b> loaded <b>successfully</b>`);
    } catch (error) {
        customAlert(`Error: ${error.message}`);
    }
}

// SHARE RESULTS
// Function to share results (from HTML table, not results.csv)
function shareResults() {
    const table = document.getElementById('climberTable');
    let results = [];
    for (let i = 1, row; row = table.rows[i]; i++) {
        let name = row.cells[1].innerText;
        let time = row.cells[2].innerText;
        results.push({ name, time });
    }
    const resultsString = JSON.stringify(results);
    const shareData = {
        title: 'Climbing Timer Results',
        text: 'Here are the climbing timer results:',
        url: 'data:text/json;charset=utf-8,' + encodeURIComponent(resultsString)
    };
    if (navigator.share) {
        navigator.share(shareData).then(() => {
            console.log('Results shared successfully');
        }).catch((error) => {
            console.error('Error sharing results:', error);
        });
    } else {
        customAlert('Sharing <b>not supported </b>on this browser.\n' + error);
    }
}

// LIST ALL FILES from ESP8266 Storage - to DOWNLOAD (Added FILE EXTENSION to FILTER)
function listResults() {  // ie. DIR *.CSV 
    // FILE EXTENSION to FILTER only CSV
    fetch('/fileList?ext=.csv') // Gets File List as HTML
        .then(response => response.text())
        .then(html => {
            const modal = document.getElementById('listResultsModal');
            document.getElementById('listResultsContainer').innerHTML = html;
            modal.style.display = 'block'; // Show the modal

            document.getElementById('closeListResultsModal').onclick = function () {
                modal.style.display = 'none';
            };
        })
        .catch(error => console.error('Error loading file list:', error));
}

// LIST CSV FILES from ESP8266 Storage to LOAD in Results TABLE
function listResultsToLoad() {
    // FILE EXTENSION to FILTER only CSV
    fetch('/fileList?ext=.csv&action=load')
        .then(response => response.text())
        .then(html => {
            const modal = document.getElementById('listResultsModal');
            document.getElementById('listResultsContainer').innerHTML = html;
            modal.style.display = 'block'; // Show the modal

            document.getElementById('closeListResultsModal').onclick = function () {
                modal.style.display = 'none';
            };
        })
        .catch(error => console.error('Error loading file list:', error));
}

// DOWNLOAD RESULTS from LOCAL PHONE STORAGE
function downloadResults() {
    let table = document.getElementById("climberTable");
    let rows = table.querySelectorAll("tr");
    let csvContent = "";

    rows.forEach((row, index) => {
        if (index === 0) {
            // For the header row, only include Name and Time
            let cols = row.querySelectorAll("th");
            csvContent += "Name,Time\n";
        } else {
            let cols = row.querySelectorAll("td");
            // Only include Name and Time columns (index 1 and 2)
            if (cols[1] && cols[2]) {
                csvContent += `${cols[1].innerText},${cols[2].innerText}\n`;
            }
        }
    });

    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create a link element, hide it, trigger the download, and remove it
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "climber_data.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// MY GENERIC MESSAGE BOX / CUSTOM ALERT
function customAlert(message) {
    const alertBox = document.createElement('div');
    alertBox.className = 'custom-alert';

    // Use innerHTML instead of textContent to allow HTML tags
    alertBox.innerHTML = message;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'OK';
    closeButton.className = 'custom-alert-button';
    closeButton.onclick = () => document.body.removeChild(alertBox);

    alertBox.appendChild(closeButton);
    document.body.appendChild(alertBox);
}

// MY GENERIC INPUT MESSAGE BOX / SAVE FILE AS...
function customInput(message, defaultValue) {
    return new Promise((resolve) => {
        // Set the message and default value
        document.getElementById('modalMessage').innerText = message;
        const inputField = document.getElementById('filenameInput');

        // Set default value
        inputField.value = defaultValue || 'results.csv';

        // Show the modal
        document.getElementById('customInputModal').style.display = 'block';

        // Handle Ok button click
        document.getElementById('okButton').onclick = function () {
            const userInput = inputField.value.trim();
            closeModal('customInputModal');
            resolve(userInput || defaultValue); // Return user input or default if empty
        };
    });
}

// Duplicate declaration
// function closeModal() {
//     document.getElementById('customInputModal').style.display = 'none';
// }

// DEBUG: Handle TAB Switching
document.addEventListener('DOMContentLoaded', function () {
    // Your existing tab switching code
    const tabs = document.querySelectorAll('.tab-container input[type="radio"]');
    tabs.forEach(tab => {
        tab.addEventListener('change', function () {
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            const selectedContent = document.getElementById(this.id + '-content');
            if (selectedContent) {
                selectedContent.style.display = 'block';
            }
        });
    });

    // New initialization code
    updateClimberTable();
    // Show the content of the first tab by default
    const firstTabContent = document.getElementById('tab1-content');
    if (firstTabContent) {
        firstTabContent.style.display = 'block';
    }
    // Any other initialization code you need
});

// Check timer status periodically
/* setInterval(() => {
    fetch('/timerStatus')
        .then(response => response.json())
        .then(data => {
            if (data.running !== isRunning) {
                if (data.running) {
                    startTimer();
                } else {
                    stopTimer();
                }
            }
            updateButtonStates(data);
        });
}, 100); */

// IMPROVED ?? setInterval Function (error handling)
setInterval(() => {
    fetch('/timerStatus')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.running !== isRunning) {
                if (data.running) {
                    startTimer();
                } else {
                    stopTimer();
                }
            }
            updateButtonStates(data);
        })
        .catch(error => {
            console.error('Error fetching /timerStatus:', error);
            // You might want to add some UI feedback here, e.g.:
            // customAlert('Error syncing with server. Please check your connection.');
        });
}, 100);

updateClimberTable();