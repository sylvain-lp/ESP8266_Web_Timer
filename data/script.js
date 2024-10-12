let timer;
let isRunning = false;
let startTime;
let elapsedTime = 0;
let climbers = JSON.parse(localStorage.getItem('climbers')) || [];
let selectedClimber = null;
let editIndex = -1;
let lastSortedColumn = null;
let isAscending = true;
let customAlertMessages = {};

function vibrate() {
    if (navigator.vibrate) {
        navigator.vibrate(150);
    }
}

function updateTimer() {
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - startTime + elapsedTime;
    const minutes = Math.floor(timeDiff / 60000);
    const seconds = Math.floor((timeDiff % 60000) / 1000);
    const hundredths = Math.floor((timeDiff % 1000) / 10);
    document.getElementById('timer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

function startStop() {
    if (!selectedClimber) {
        customAlert(getTranslatedAlert("Please <b>select a climber</b> first!"));
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
            customAlert(getTranslatedAlert(`<b>Error</b> starting/stopping timer: ${error.message}`));
        })
       .finally(() => {
            vibrate();
        });
}

function startTimer() {
    startTime = new Date().getTime();
    timer = setInterval(updateTimer, 10);
    isRunning = true;
}

function stopTimer() {
    clearInterval(timer);
    elapsedTime += new Date().getTime() - startTime;
    const currentTime = document.getElementById('timer').textContent;
    selectedClimber.times.unshift(currentTime);
    updateClimberTable();
    saveClimbers();
    isRunning = false;
}

function addPenalty() {
    const timerValue = document.getElementById('timer').textContent;

    if (isRunning) {
        elapsedTime += 1000;
    } else {
        if (timerValue !== '00:00.00') {
            elapsedTime += 1000;
            updateClimberTable();
        } else {
            customAlert(getTranslatedAlert('Please <b>start the timer</b> before applying a penalty.'));
        }
    }
    vibrate();
}

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

function updateButtonStates(data) {
    const startStopBtn = document.getElementById('startStop');
    const resetBtn = document.getElementById('reset');

    startStopBtn.disabled = data.startDisabled;
    startStopBtn.classList.toggle('button-disabled', data.startDisabled);
    startStopBtn.textContent = getTranslatedAlert(data.startLabel);

    resetBtn.disabled = data.resetState === 'LOCKED';
    resetBtn.classList.remove('button-yellow', 'button-red');
    if (data.resetState === 'READY') {
        resetBtn.classList.add('button-yellow');
    } else if (data.resetState === 'LOCKED') {
        resetBtn.classList.add('button-red');
    }
    resetBtn.textContent = getTranslatedAlert(data.resetLabel);
}

function addClimber() {
    const name = document.getElementById('climberName').value.trim();
    if (name) {
        const newClimber = { name, times: [] };
        climbers.push(newClimber);
        updateClimberTable();
        saveClimbers();
        resetTimer();
        document.getElementById('climberName').value = '';
        selectClimber(climbers.length - 1);
    }
    vibrate();
}

function updateClimberTable() {
    const tbody = document.querySelector('#climberTable tbody');
    tbody.innerHTML = '';
    climbers.forEach((climber, index) => {
        const row = tbody.insertRow();

        const radioCell = row.insertCell(0);
        radioCell.innerHTML = `
            <input type="radio" 
                   name="selectedClimber" 
                   value="${index}"
                   onchange="selectClimber(${index})" 
                   ${climber === selectedClimber ? 'checked' : ''}>
        `;

        row.insertCell(1).textContent = climber.name;
        row.insertCell(2).textContent = climber.times.join(', ');

        const actionsCell = row.insertCell(3);
        actionsCell.innerHTML = `
            <div class="action-buttons">
                <button class="edit-button" onclick="openEditModal(${index})">
                    <img src="/pencil.svg" alt="${getTranslatedAlert('Edit')}" class="edit-icon">
                </button>
                <button class="remove-button" onclick="openRemoveModal(${index})">
                    <img src="/trash.svg" alt="${getTranslatedAlert('Remove')}" class="trash-icon">
                </button>
            </div>
        `;
    });
}

function selectClimber(index) {
    selectedClimber = climbers[index];
    resetTimer();
    updateClimberTable();
    vibrate();
}

function openEditModal(index) {
    editIndex = index;
    document.getElementById('editClimberName').value = climbers[index].name;
    document.getElementById('editModal').style.display = 'block';
}

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

function openRemoveModal(index) {
    editIndex = index;
    document.getElementById('removeModal').style.display = 'block';
}

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

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// SAVE CLIMBER TABLE -- ONLY LOCALLY to PHONE
function saveClimbers() {
    localStorage.setItem('climbers', JSON.stringify(climbers));
}

function sortTable(columnIndex) {
    const table = document.getElementById("climberTable");
    const headers = table.getElementsByTagName("th");

    for (let i = 0; i < headers.length; i++) {
        headers[i].classList.remove('sorted-asc', 'sorted-desc');
    }

    if (lastSortedColumn === columnIndex) {
        isAscending = !isAscending;
    } else {
        isAscending = true;
    }

    headers[columnIndex].classList.add(isAscending ? 'sorted-asc' : 'sorted-desc');

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

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// SAVE TABLE from PHONE to ESP8266
async function saveResults() {
    try {
        const now = new Date();
        const timeString = now.toISOString().slice(0, 19);

        const timeResponse = await fetch('/time', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: timeString
        });

        if (!timeResponse.ok) {
            throw new Error('Failed to set server time');
        }

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

        const response = await fetch('/fileSave', {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv' },
            body: csvString
        });

        if (response.ok) {
            const responseText = await response.text();
            customAlert(getTranslatedAlert(responseText));
        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to save results.csv');
        }
    } catch (error) {
        customAlert(getTranslatedAlert(`Error: ${error.message}`));
    }
}

// LOAD CSV FILE into TABLE from ESP8266
async function loadResults(filename) {
    try {
        customAlert(getTranslatedAlert(`<b>Warning</b>: Loading Results will <b>erase</b> existing data on your Phone`));
        const response = await fetch(`/fileLoad?filename=${encodeURIComponent(filename)}`);
        if (!response.ok) {
            throw new Error('Failed to load results');
        }
        const csvData = await response.text();
        const rows = csvData.split('\n');
        climbers = [];
        rows.forEach((row, index) => {
            if (index === 0 || row.trim() === '') return;
            const [name, time] = row.split(',');
            if (name && time) {
                climbers.push({ name: name.trim(), times: [time.trim()] });
            }
        });
        updateClimberTable();
        saveClimbers();
        customAlert(getTranslatedAlert(`Results from <b>${filename}</b> loaded <b>successfully</b>`));
    } catch (error) {
        customAlert(getTranslatedAlert(`Error: ${error.message}`));
    }
}

// SHARING TABLE on PHONE / JSON --- LIKELY NOT WORKING
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
        title: getTranslatedAlert('Climbing Timer Results'),
        text: getTranslatedAlert('Here are the climbing timer results:'),
        url: 'data:text/json;charset=utf-8,' + encodeURIComponent(resultsString)
    };
    if (navigator.share) {
        navigator.share(shareData).then(() => {
            console.log('Results shared successfully');
        }).catch((error) => {
            console.error('Error sharing results:', error);
        });
    } else {
        customAlert(getTranslatedAlert('Sharing <b>not supported </b>on this browser.\n') + error);
    }
}

// LIST CSV FILES STORED on ESP8266
function listResults() {
    fetch('/fileList?ext=.csv')
       .then(response => response.text())
       .then(html => {
            const modal = document.getElementById('listResultsModal');
            document.getElementById('listResultsContainer').innerHTML = html;
            modal.style.display = 'block';

            document.getElementById('closeListResultsModal').onclick = function () {
                modal.style.display = 'none';
            };
        })
       .catch(error => console.error('Error loading file list:', error));
}

function downloadResults() {
    let table = document.getElementById("climberTable");
    let rows = table.querySelectorAll("tr");
    let csvContent = "";

    rows.forEach((row, index) => {
        if (index === 0) {
            csvContent += "Name,Time\n";
        } else {
            let cols = row.querySelectorAll("td");
            if (cols[1] && cols[2]) {
                csvContent += `${cols[1].innerText},${cols[2].innerText}\n`;
            }
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

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

function customAlert(message) {
    const alertBox = document.createElement('div');
    alertBox.className = 'custom-alert';
    alertBox.innerHTML = `
        <div class="alert-content">
            <p>${message}</p>
            <button onclick="this.parentElement.parentElement.remove()">OK</button>
        </div>
    `;
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.classList.add('show'), 10);
}

function switchLanguage() {
    const isEnglish = !document.getElementById('language-switch').checked;
    const elements = document.querySelectorAll('[data-en], [data-fr]');
    
    elements.forEach(el => {
        if (el.hasAttribute('data-en') && el.hasAttribute('data-fr')) {
            el.textContent = isEnglish ? el.getAttribute('data-en') : el.getAttribute('data-fr');
        }
    });

    const inputs = document.querySelectorAll('input[data-en-placeholder], input[data-fr-placeholder]');
    inputs.forEach(input => {
        input.placeholder = isEnglish ? input.getAttribute('data-en-placeholder') : input.getAttribute('data-fr-placeholder');
    });

    document.title = isEnglish ? "Climbing Timer" : "Chronomètre d'Escalade";

    updateAlertMessages(isEnglish);

    localStorage.setItem('language', isEnglish ? 'en' : 'fr');
}

function updateAlertMessages(isEnglish) {
    customAlertMessages = {
        "Please <b>select a climber</b> first!": isEnglish ? "Please <b>select a climber</b> first!" : "Veuillez d'abord <b>sélectionner un grimpeur</b> !",
        "Results loaded <b>successfully</b>": isEnglish ? "Results loaded <b>successfully</b>" : "Résultats chargés <b>avec succès</b>",
        "Please <b>start the timer</b> before applying a penalty.": isEnglish ? "Please <b>start the timer</b> before applying a penalty." : "Veuillez <b>démarrer le chronomètre</b> avant d'appliquer une pénalité.",
        "<b>Warning</b>: Loading Results will <b>erase</b> existing data on your Phone": isEnglish ? "<b>Warning</b>: Loading Results will <b>erase</b> existing data on your Phone" : "<b>Attention</b> : Le chargement des résultats <b>effacera</b> les données existantes sur votre téléphone",
        "Climbing Timer Results": isEnglish ? "Climbing Timer Results" : "Résultats du Chronomètre d'Escalade",
        "Here are the climbing timer results:": isEnglish ? "Here are the climbing timer results:" : "Voici les résultats du chronomètre d'escalade :",
        "Sharing <b>not supported </b>on this browser.": isEnglish ? "Sharing <b>not supported </b>on this browser." : "Le partage <b>n'est pas pris en charge</b> sur ce navigateur.",
        // Add more messages as needed
    };
}

function getTranslatedAlert(message) {
    return customAlertMessages[message] || message;
}

function initializeLanguage() {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
        document.getElementById('language-switch').checked = savedLanguage === 'fr';
        switchLanguage();
    }
}

// Call this function when the page loads
// document.addEventListener('DOMContentLoaded', initializeLanguage);
document.addEventListener('DOMContentLoaded', initializeLanguage);
    
  // Handle Tab#1 or Tab#2 Content Display
 // Tab switching functionality
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab-header input[type="radio"]');
    const tabContents = document.querySelectorAll('.tab-content');

    function showTab(tabId) {
        tabContents.forEach(content => {
            content.style.display = content.id === tabId + '-content' ? 'block' : 'none';
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('change', function() {
            showTab(this.id);
        });
    });

    // Show the first tab by default
    document.getElementById('tab1').checked = true;
    showTab('tab1');
}

// Call this function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeTabs);
updateClimberTable();
