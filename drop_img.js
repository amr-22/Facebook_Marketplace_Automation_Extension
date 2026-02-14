function base64ToFile(base64String, filename) {
    console.log(`[base64ToFile] Attempting to convert Base64 for filename: ${filename}`);
    if (!base64String || typeof base64String !== 'string') {
        console.error("[base64ToFile] Error: Provided base64String is invalid or empty.");
        return null;
    }
    if (!filename || typeof filename !== 'string') {
        console.error("[base64ToFile] Error: Provided filename is invalid or empty.");
        return null;
    }

    try {
        // 1. Validate and Extract Parts using Regex
        const match = base64String.match(/^data:(.+?);base64,(.+)$/);
        if (!match) {
            console.error("[base64ToFile] Error: Base64 string does not match expected 'data:mime/type;base64,...' format.");
            // Check if maybe the prefix was forgotten
            if (base64String.length > 100 && !base64String.startsWith('data:')) {
                console.warn("[base64ToFile] Warning: Base64 string seems to be missing the 'data:mime/type;base64,' prefix.");
            }
            return null;
        }
        const mimeType = match[1];
        const base64Data = match[2];
        console.log(`[base64ToFile] Extracted MIME Type: ${mimeType}`);

        // 2. Decode Base64 to Binary String
        // 'atob' converts Base64 encoded ascii string to a binary string (decoded)
        const byteCharacters = atob(base64Data);

        // 3. Convert Binary String to Typed Array (Uint8Array)
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i); // Get the byte value for each character
        }
        const byteArray = new Uint8Array(byteNumbers); // Create an array of 8-bit unsigned integers

        // 4. Create Blob
        // A Blob represents raw immutable data.
        const blob = new Blob([byteArray], { type: mimeType });
        console.log(`[base64ToFile] Blob created. Size: ${blob.size} bytes, Type: ${blob.type}`);

        // 5. Create File
        // A File object is a specific kind of Blob with added name and lastModified properties.
        const file = new File([blob], filename, { type: mimeType, lastModified: Date.now() });
        console.log("[base64ToFile] File object created successfully:", file);
        return file;

    } catch (error) {
        console.error("[base64ToFile] CRITICAL ERROR during conversion:", error);
        if (error.name === 'InvalidCharacterError') {
            console.error("[base64ToFile] Detail: This often means the Base64 string itself is corrupted or not valid Base64.");
        }
        return null; // Return null on any error during conversion
    }
}

function simulateFileDrop(targetElementSelector, fileObject) {
    console.log(`[simulateFileDrop] Attempting drop simulation onto selector: "${targetElementSelector}"`);
    if (!targetElementSelector || typeof targetElementSelector !== 'string') {
        console.error("[simulateFileDrop] Error: Invalid targetElementSelector provided.");
        return false;
    }
    if (!fileObject || !(fileObject instanceof File)) {
        console.error("[simulateFileDrop] Error: Invalid File object provided.");
        return false;
    }

    // 1. Find the Target Element
    const target = document.querySelector(targetElementSelector);
    if (!target) {
        // console.error(`[simulateFileDrop] Error: Drop target element not found using selector: "${targetElementSelector}". Double-check the selector.`);
        // alert(`CRITICAL ERROR: Cannot find the drop zone element using the selector "${targetElementSelector}". Please inspect the element on the page and correct the selector in the script!`);
        return false; // Stop if the target isn't found
    }
    console.log("[simulateFileDrop] Found target element:", target);

    try {
        // 2. Create a DataTransfer object
        // This object holds the data being dragged/dropped. Crucial for files.
        const dataTransfer = new DataTransfer();
        // Add the file to the DataTransfer object's items list.
        // This is the standard way to associate files with the drag operation.
        dataTransfer.items.add(fileObject);
        // dataTransfer.files is usually populated automatically from items.

        console.log("[simulateFileDrop] DataTransfer object created with file:", dataTransfer.items[0]);

        // 3. Define Event Properties
        // These options are used for creating the DragEvent objects.
        const eventOptions = {
            bubbles: true,      // Allow the event to bubble up the DOM tree
            cancelable: true,   // Allow the event to be cancelled (e.g., by preventDefault)
            composed: true,     // Allow the event to cross Shadow DOM boundaries
            dataTransfer: dataTransfer // Attach the data (our file) to the event **IMPORTANT**
        };

        // 4. Dispatch the Drag Event Sequence
        // The sequence dragenter -> dragover -> drop is typical for a successful drop.
        // Some complex drop zones might have more specific event needs or checks.
        console.log("[simulateFileDrop] Dispatching 'dragenter' event...");
        target.dispatchEvent(new DragEvent('dragenter', { ...eventOptions, clientX: 1, clientY: 1 }));

        // dragover needs to be dispatched typically, and its default prevented by listener
        // for the drop event to even fire in many cases.
        console.log("[simulateFileDrop] Dispatching 'dragover' event...");
        target.dispatchEvent(new DragEvent('dragover', { ...eventOptions, clientX: 1, clientY: 2 }));

        // The final drop event.
        console.log("[simulateFileDrop] Dispatching 'drop' event...");
        target.dispatchEvent(new DragEvent('drop', { ...eventOptions, clientX: 1, clientY: 2 }));

        console.log("[simulateFileDrop] Event sequence dispatched successfully (from script's perspective).");
        return true; // Indicate that the dispatch attempts completed without error

    } catch (error) {
        // console.error("[simulateFileDrop] CRITICAL ERROR during event simulation:", error);
        // alert(`Error during event simulation: ${error.message}. Check console.`);
        return false; // Indicate that an error occurred during dispatch
    }
}


async function runBase64UploadAttempt(dropTargetSelector, imgUrl) {

    const fNameInput = 'img1.jpg';
    b64Input = await convertImageToBase64(imgUrl);
    // Verify the selector immediately before proceeding
    if (!document.querySelector(dropTargetSelector)) {
        //  const errorMsg = `CRITICAL ERROR: Cannot find the drop zone element on the page using the specified selector: "${dropTargetSelector}". \n\nPlease inspect the element, find the correct selector, and **edit the dropTargetSelector variable in this script** before running it again.`;
        //  console.error(errorMsg);
        //  alert(errorMsg);
        return; // Stop execution
    } else {
        console.log("[Main] Successfully found an element matching the drop target selector.");
    }

    // --- STEP 4: Convert Base64 String to File Object ---
    console.log("[Main] Converting Base64 data to a File object...");
    const fileToUpload = base64ToFile(b64Input, fNameInput);

    if (!fileToUpload) {
        // Error messages are handled inside base64ToFile
        // alert("Failed to process the provided Base64 data. Check the console for specific errors (e.g., invalid format, corrupted data).");
        return; // Stop if conversion failed
    }
    console.log("[Main] File object successfully created.");

    // --- STEP 5: Attempt Simulating the Drop ---
    console.log("[Main] Initiating simulated drop sequence...");
    const eventsDispatched = simulateFileDrop(dropTargetSelector, fileToUpload);
}




const convertImageToBase64 = async (url) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'downloadImage', url: url }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(`[drop_img.js] Runtime error fetching image: ${chrome.runtime.lastError.message}`);
                resolve(null);
            } else if (response && response.status === 'success') {
                resolve(response.data);
            } else {
                console.error(`[drop_img.js] Error fetching image from background: ${response ? response.detail : 'Unknown error'}`);
                console.error("Possible causes: Invalid URL or Network Error.");
                resolve(null);
            }
        });
    });
};

const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(blob);
    });
};
