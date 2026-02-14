const CONSTANTS = {
    STORAGE_KEY: 'carsData',
    CARS_DATA_INDEX_KEY: 'CarsDataIndex',
    TOKEN_KEY: 'myTokenKey',
    MARKETPLACE_URL: 'https://www.facebook.com/marketplace/create/vehicle',
    IS_POSTING_ACTIVE_KEY: 'isPostingActive', // Added key for the stop flag
};

// Initialize the sidebar when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated. Setting up sidebar...');
    chrome.sidePanel.setOptions({ enabled: true, path: 'sidebar.html' });
});

// Set up the action button to open the sidebar
chrome.action.onClicked.addListener((tab) => {
    if (tab && tab.id !== undefined) {
        chrome.sidePanel.open({ tabId: tab.id });
    } else {
        console.error('Could not open sidebar: invalid tab');
    }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // begin background script
    console.log('Background script received message:', message);


    // --- Get the ID of the Tab that sent the message ---
    console.log(`Background: Request received from sender Tab ID: ${sender.tab?.id}`);

    // Handle the OpenMarketplace action
    if (message.action === "OpenMarketplace") {
        console.log("Background: Received request to save data and open marketplace. Source:", message.source);

        // Use an async function immediately to handle awaits and sendResponse properly
        (async () => {
            try {
                // 1. Set posting flag and save data to storage
                await chrome.storage.local.set({
                    [CONSTANTS.STORAGE_KEY]: message.source.data,
                    [CONSTANTS.TOKEN_KEY]: message.source.token,
                    [CONSTANTS.CARS_DATA_INDEX_KEY]: 0, // Reset index here
                    [CONSTANTS.IS_POSTING_ACTIVE_KEY]: true // Set posting to active
                });
                console.log("Background: Data saved and posting set to active.");

                // 2. Get the current active tab
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!activeTab || !activeTab.id) {
                    throw new Error('No active tab found');
                }

                // 3. Update the current tab's URL instead of creating a new one
                const newTab = await chrome.tabs.create({ url: CONSTANTS.MARKETPLACE_URL });
                console.log("Background: Opened new tab to Marketplace. Tab ID:", newTab.id);

                // 4. Content script is automatically injected via manifest.json
                // Removing manual injection to prevent double-execution
                console.log("Background: Waiting for tab to load and content script to auto-run.");

                // 5. Send success response back to content script
                sendResponse({ status: "success", details: `New tab ${newTab.id} opened to Marketplace and data saved.` });

            } catch (error) {
                console.error('Background: Error processing request:', error);
                // Send error response back
                sendResponse({ status: "error", details: error.message });
            }
        })();
        // Otherwise, the message channel might close before your async operations complete.
        return true; // Keep message channel open for async response
    }

    // Handle the stopPosting action
    if (message.action === "stopPosting") {
        console.log("Background: Received request to stop posting.");
        (async () => {
            try {
                await chrome.storage.local.set({ [CONSTANTS.IS_POSTING_ACTIVE_KEY]: false });
                console.log("Background: Posting set to inactive.");
                sendResponse({ status: "success", details: "Posting stopped." });
            } catch (error) {
                console.error('Background: Error stopping posting:', error);
                sendResponse({ status: "error", details: error.message });
            }
        })();
        return true; // Keep message channel open for async response
    }
    if (message.action === 'SendValueToPage') {
        console.log('in call dashboard function');
        console.log('Received SendValueToPage. Dashboard communication is disabled in standalone mode.', message.source);

    }

    if (message.action === 'closeTab' && sender.tab) {
        chrome.tabs.remove(sender.tab.id);
    }

    // Handle image downloading (bypasses CORS by fetching in background context)
    if (message.action === 'downloadImage') {
        console.log('Background: Downloading image from:', message.url);
        (async () => {
            try {
                const response = await fetch(message.url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const blob = await response.blob();
                const mimeType = blob.type || 'image/jpeg';
                // Convert blob to base64 WITHOUT FileReader (not available in Service Workers)
                const arrayBuffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                let binaryString = '';
                for (let i = 0; i < uint8Array.length; i++) {
                    binaryString += String.fromCharCode(uint8Array[i]);
                }
                const base64Data = btoa(binaryString);
                const dataUrl = `data:${mimeType};base64,${base64Data}`;
                console.log(`Background: Image downloaded. Size: ${uint8Array.length} bytes, Type: ${mimeType}`);
                sendResponse({ status: 'success', data: dataUrl });
            } catch (error) {
                console.error('Background: Error downloading image:', error);
                sendResponse({ status: 'error', detail: error.message });
            }
        })();
        return true; // Keep channel open for async response
    }
});

console.log('Background script loaded');
