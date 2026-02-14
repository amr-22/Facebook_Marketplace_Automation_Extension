// DOM Elements
let fileInput;
let fileNameDisplay;
let processButton;
let dropArea;
let stopButton;
let statusMessages;
let selectedFile = null;

// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
    // Get references to DOM elements
    fileInput = document.getElementById('fileInput');
    fileNameDisplay = document.getElementById('fileName');
    processButton = document.getElementById('processButton');
    dropArea = document.getElementById('dropArea');
    stopButton = document.getElementById('stopButton');
    statusMessages = document.getElementById('statusMessages');

    // Check if SheetJS is loaded
    if (typeof XLSX === 'undefined') {
        console.error('SheetJS library not loaded');
        addStatusMessage('Error: Required libraries not loaded.', 'error');
    }

    // Add event listeners for file input
    fileInput.addEventListener('change', handleFileSelection);

    // Add event listeners for drag and drop
    setupDragAndDrop();

    // Process Button Logic
    processButton.addEventListener('click', async () => {
        addStatusMessage('Processing file...', 'info');
        const carsData = await processFile();

        if (!carsData) {
            addStatusMessage('Failed to process file.', 'error');
            return;
        }

        try {
            chrome.runtime.sendMessage(
                {
                    action: "OpenMarketplace",
                    source: {
                        data: carsData,
                        token: "dummy_token" // Token handling might need adjustment if auth is required
                    }
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message:", chrome.runtime.lastError.message);
                        addStatusMessage('Error: ' + chrome.runtime.lastError.message, 'error');
                    } else if (response && response.status === 'success') {
                        console.log("Success:", response.details);
                        addStatusMessage('Automation started!', 'success');
                    } else {
                        console.error("Error response:", response);
                        addStatusMessage('Error starting automation.', 'error');
                    }
                }
            );
        } catch (error) {
            console.error("Error triggering automation:", error);
            addStatusMessage('Exception: ' + error.message, 'error');
        }
    });

    // Stop Button Logic
    stopButton.addEventListener('click', async () => {
        console.log("Stop button clicked.");
        chrome.runtime.sendMessage({ action: "stopPosting" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error stopping:", chrome.runtime.lastError.message);
            } else {
                console.log("Stop response:", response);
                addStatusMessage('Stop signal sent.', 'warning');
            }
        });
    });
});

// --- Helper Functions ---

function addStatusMessage(message, type = 'info') {
    if (!statusMessages) return;
    const msg = document.createElement('div');
    msg.textContent = message;
    msg.className = type;
    msg.style.marginBottom = '4px';
    if (type === 'error') msg.style.color = 'red';
    if (type === 'success') msg.style.color = 'green';
    statusMessages.appendChild(msg);
}

function setupDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });
    dropArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) handleFile(files[0]);
}

function handleFileSelection(event) {
    event.preventDefault();
    if (event.target.files.length > 0) handleFile(event.target.files[0]);
}

function handleFile(file) {
    if (!file.name.endsWith('.xlsx')) {
        addStatusMessage('Invalid file type. Use .xlsx', 'error');
        return;
    }
    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    processButton.disabled = false;
    addStatusMessage('File selected: ' + file.name, 'info');
}

async function processFile() {
    if (!selectedFile) return null;
    processButton.disabled = true;

    try {
        const arrayBuffer = await readFileAsArrayBuffer(selectedFile);
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        console.log('Raw Data:', rawData);

        // TRANSFORM DATA: Old Format -> New Format
        const processedData = rawData.map((row, index) => ({
            id: Date.now() + index, // Generate specific ID
            make: row.Make || '',
            model: row.Model || '',
            year: row.Year || '',
            mileage: Number(row.Mileage) || 0,
            price: row.Price || '',
            // Mapping single Img column to vehiclePhoto array with flexible column names
            vehiclePhoto: (() => {
                const imgColumn = Object.keys(row).find(key =>
                    ['img', 'image', 'photo', 'photos', 'picture', 'url'].some(keyword => key.toLowerCase().includes(keyword))
                );
                const photoUrl = imgColumn ? row[imgColumn] : null;
                if (photoUrl) {
                    // console.log(`Found image in column '${imgColumn}': ${photoUrl}`);
                    return [{ photoUrl: photoUrl }];
                }
                // console.warn('No image column found for row:', row);
                return [];
            })(),
            // Default values for other fields if needed
            bodyStyle: row.BodyStyle || 'Other'
        }));

        console.log('Processed Data:', processedData);
        return processedData;

    } catch (error) {
        console.error('Error processing file:', error);
        addStatusMessage('Error: ' + error.message, 'error');
        return null;
    } finally {
        processButton.disabled = false;
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error reading file'));
        reader.readAsArrayBuffer(file);
    });
}
