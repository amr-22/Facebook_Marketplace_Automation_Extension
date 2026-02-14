
// Listen for messages FROM the webpage
window.addEventListener('message', async (event) => {
  if (event.source !== window) {
    return;
  }

  // Check if the message is the one we expect from our website button
  if (event.data.type && event.data.type === 'MY_WEBSITE_EXTENSION_REQUEST') {
    try {
      // Send a message TO the background script asking it to do the work
      chrome.runtime.sendMessage(
        {
          action: "OpenMarketplace", // Clear action name
          source: event.data.payload.source
        },
        (response) => {
          // Handle the response from the background script (optional but good practice)
          if (chrome.runtime.lastError) {
            console.error("Content script: Error sending message to background:", chrome.runtime.lastError.message);
            // Maybe notify the webpage via postMessage?
          } else if (response && response.status === 'success') {
            console.log("Content script: Background reported success:", response.details);
          } else if (response && response.status === 'error') {
            console.error("Content script: Background reported error:", response.details);
          } else {
            console.log("Content script: Received response from background:", response);
          }
        }
      );
    } catch (error) {
      console.error("Error Sending data to Background script:", error);
    }
  }
}, false);


// --- Stop Functionality ---
// Helper function to check the stop flag in storage
async function checkIfStopped() {
  try {
    const result = await chrome.storage.local.get(CONSTANTS.IS_POSTING_ACTIVE_KEY);
    // Default to true (active) if the key doesn't exist yet
    const isPostingActive = result[CONSTANTS.IS_POSTING_ACTIVE_KEY] !== false;
    if (!isPostingActive) {
      console.log("STOP SIGNAL DETECTED. Halting execution.");
    }
    return !isPostingActive; // Return true if stopped, false if active
  } catch (error) {
    console.error("Error checking stop flag:", error);
    return false; // Assume active on error to avoid accidental stops
  }
}

// Modified sleep function to be interruptible
async function sleep(ms) {
  console.log(`Sleeping for ${ms}ms...`);
  const step = 100; // Check every 100ms
  for (let i = 0; i < ms; i += step) {
    if (await checkIfStopped()) {
      throw new Error("Process stopped during sleep."); // Throw error to halt execution
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(step, ms - i)));
  }
  console.log("Finished sleeping.");
}

function waitForLoading(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// --- End Stop Functionality ---


// Wait for the page to be fully loaded
window.addEventListener('load', function () {

  // Allow the page some time to render all elements
  setTimeout(async function () {
    try {
      // Initial check before starting
      if (await checkIfStopped()) return;

      await publish();
      console.log("Publish function completed successfully.");
    } catch (error) {
      if (error.message.includes("Process stopped")) {
        console.log("Publish function halted due to stop signal.");
      } else {
        console.error("Error during publish execution:", error);
      }
    } finally {
    }

  }, CONSTANTS.SLEEP_DELAYS.MEDIUM); // Initial delay before starting publish
});

// Original sleep function removed, replaced by interruptible one above

async function fillInputFieldBySpanLabel(span, textToEnter) {
  // Find the parent div containing both the span and input
  const parentDiv = span.closest('div');

  if (parentDiv) {
    // Find input fields within the parent div
    const inputField = parentDiv.querySelector('input');

    if (inputField) {
      console.log(`Found input field for span with text: ${span.textContent}`);

      // Set the value of the input field
      inputField.value = textToEnter;

      // Trigger input event to notify the page that the value has changed
      const inputEvent = new Event('input', { bubbles: true });
      inputField.dispatchEvent(inputEvent);

      // Optionally focus on the input
      inputField.focus();

      console.log(`Text entered into input field for ${span.textContent}`);
      return true; // Successfully processed
    } else {
      console.log(`No input field found in the parent div for ${span.textContent}`);
    }
  } else {
    console.log(`No parent div found for span with text: ${span.textContent}`);
  }

  return false; // Failed to process
}


// Process Vehicle Type span - find and click on 'i' element within closest label
async function processComboBoxSpan(span, optionToChoose) {
  console.log(`Processing Vehicle Type span: ${span.textContent}`);

  if (!span || !optionToChoose) {
    console.error(`Invalid parameters for processComboBoxSpan`);
    return false;
  }

  try {
    // Find the closest label to this span
    const label = span.closest('label');

    if (!label) {
      console.error(`No label found for the ${span.textContent} span`);
      return false;
    }

    // Find 'i' element within this label
    const iElement = label.querySelector('i');

    if (!iElement) {
      console.error(`No i element found within the label for ${span.textContent}`);
      return false;
    }

    // // Clear any existing dropdowns first
    // const openDropdowns = document.querySelectorAll('[role="listbox"]');
    // if (openDropdowns.length > 0) {
    //   console.log('Detected open dropdown, clicking elsewhere to close it');
    //   document.body.click();
    //   await sleep(CONSTANTS.SLEEP_DELAYS.SHORT);
    // }

    console.log('Found i element within label, clicking it...');

    // Click the i element
    iElement.click();

    console.log('Clicked on i element for Vehicle Type');

    // Wait 0.5 seconds after clicking the Vehicle Type i element
    console.log('Waiting 0.5 seconds before looking for option span...');
    await sleep(CONSTANTS.SLEEP_DELAYS.SHORT);

    // Look for option span and click its parent div
    const spanProcessed = await findOptionInDropdown(optionToChoose);

    if (spanProcessed) {
      // Wait 0.5 seconds after clicking the option parent div
      console.log('Waiting 0.5 seconds before returning...');
      await sleep(CONSTANTS.SLEEP_DELAYS.SHORT);

      return true;
    }

    return spanProcessed;
  } catch (error) {
    console.error(`Error in processComboBoxSpan for ${span.textContent}:`, error);
    return false;
  }
}

// General function to find a span with specific text and click its parent div
async function findOptionInDropdown(textContent) {
  console.log(`Looking for span with text: ${textContent}`);

  // Find all spans
  const spans = document.querySelectorAll('span');

  for (const span of spans) {
    // if (span.textContent === textContent) {
    if (span.textContent.includes(textContent)) {
      console.log(`Found span with text: ${textContent}`);

      // Find parent div
      const parentDiv = span.closest('div');

      if (parentDiv) {
        console.log(`Found parent div of ${textContent} span, clicking it...`);

        // Click the parent div
        parentDiv.click();

        console.log(`Clicked on parent div of ${textContent} span`);
        return true; // Successfully processed
      } else {
        console.log(`No parent div found for ${textContent} span`);
      }
    }
  }

  console.log(`Could not find span with text: ${textContent}`);
  return false; // Failed to process
}

async function publish() {

  console.log("Starting publish function...");
  await sendValueToPage('2145');

  // Check if stopped before proceeding
  if (await checkIfStopped()) return;

  // get cars data from storage
  const storageResult = await chrome.storage.local.get([CONSTANTS.STORAGE_KEY, CONSTANTS.CARS_DATA_INDEX_KEY, CONSTANTS.TOKEN_KEY]);

  const dataToUse = await storageResult[CONSTANTS.STORAGE_KEY]; // Corrected: Use await and keep only one declaration
  const carIndex = storageResult[CONSTANTS.CARS_DATA_INDEX_KEY]; // Default to 0 if not set
  const token = storageResult[CONSTANTS.TOKEN_KEY]; // Get token as well

  if (!dataToUse || dataToUse.length === 0 || carIndex >= dataToUse.length) {
    console.log(`No data found or index (${carIndex}) out of bounds (${dataToUse ? dataToUse.length : 0}). Stopping.`);
    await chrome.storage.local.set({ [CONSTANTS.IS_POSTING_ACTIVE_KEY]: false }); // Ensure flag is false
    return;
  }

  console.log(`Processing car index: ${carIndex}`);
  const currentCar = dataToUse[carIndex];

  // Find all spans on the page - do this once and cache the result
  let spans = document.querySelectorAll('span');
  console.log('Found', spans.length, 'spans in total');

  // --- Process Vehicle Type ---
  if (await checkIfStopped()) return;
  console.log('Looking for Vehicle Type span');
  let vehicleTypeProcessed = false;
  for (const span of spans) {
    if (span.textContent === 'Vehicle type') {
      console.log('Found Vehicle type span');
      vehicleTypeProcessed = await processComboBoxSpan(span, CONSTANTS.VEHICLE_TYPE);
      if (vehicleTypeProcessed) {
        await sleep(CONSTANTS.SLEEP_DELAYS.SHORT); // Sleep is now interruptible
        spans = document.querySelectorAll('span'); // Refresh spans
        break;
      }
    }
  }
  if (!vehicleTypeProcessed) console.log('Could not find or process Vehicle type span');

  // --- Process Location ---
  const newLocation = 'New York'; // Replace with your target location

  let locationInput = document.querySelector('input[aria-label*="Location"]');
  if (!locationInput) {
    console.error("Error: Could not find the location input element. Check your selector.");
  } else {
    console.log("Found input element:", locationInput);
    // --- format value ---
    const formatValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    formatValue.call(locationInput, "hello");
    const formatInputEvent = new Event('input', { bubbles: true, cancelable: true });
    locationInput.dispatchEvent(formatInputEvent);
    console.log("Dispatched 'input' event.");

    // --- STEP 4: Set the Value ---
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeInputValueSetter.call(locationInput, newLocation);
    // --- STEP 5: Dispatch Events to Trigger React State Update ---
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    locationInput.dispatchEvent(inputEvent);
    console.log("Dispatched 'input' event.");
    // Create and dispatch a 'change' event (often crucial)
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    locationInput.dispatchEvent(changeEvent);
    console.log("Dispatched 'change' event.");
    // --- select first option ---
    await waitForLoading(3000).then(() => {
      Array.from(document.querySelectorAll('span')).filter(span => span.textContent.trim().includes(newLocation))[0].closest('div').click();
    });


  }

  // color processing blocks with:
  const colorResults = await processColorFields();
  if (!colorResults.interiorColorProcessed) {
    console.log('Warning: Could not process Interior color');
  }
  if (!colorResults.exteriorColorProcessed) {
    console.log('Warning: Could not process Exterior color');
  }



  // --- Process Photos ---
  if (currentCar.vehiclePhoto && Array.isArray(currentCar.vehiclePhoto) && currentCar.vehiclePhoto.length > 0) {
    console.log(`Found ${currentCar.vehiclePhoto.length} photos to process.`);
    for (const photo of currentCar.vehiclePhoto) {
      if (await checkIfStopped()) return; // Check stop flag inside the loop
      if (photo && photo.photoUrl) {
        const photoPath = photo.photoUrl; // Use const for block scope
        console.log(`Processing photo: ${photoPath}`);
        await addPhotoProcess(photoPath);
        // await sleep(CONSTANTS.SLEEP_DELAYS.MEDIUM); // Wait after each photo process
        await sleep(500); // Wait after each photo process

      } else {
        console.warn("Skipping photo entry without photoUrl:", photo);
      }
    }
    console.log("Finished processing all photos.");
  } else {
    console.log("No valid vehicle photos found to process."); // Log if no photos
  }

  // --- Process Year ---
  if (await checkIfStopped()) return;
  console.log('Looking for Year span');
  let yearProcessed = false;
  for (const span of spans) {
    if (span.textContent === 'Year') {
      console.log('Found Year span');
      const year = (currentCar.year).toString();
      yearProcessed = await processComboBoxSpan(span, year);
      if (yearProcessed) {
        await sleep(CONSTANTS.SLEEP_DELAYS.SHORT);
        break;
      }
    }
  }
  if (!yearProcessed) console.log('Could not find or process Year span');


  // --- Process Body Style ---
  if (await checkIfStopped()) return;
  console.log('Looking for Body style span');
  let bodyStyleProcessed = false;
  for (const span of spans) {
    if (span.textContent === 'Body style') {
      console.log('Found Body style span');
      // Assuming 'Other' is the intended value, check if currentCar has a bodyStyle property?
      bodyStyleProcessed = await processComboBoxSpan(span, 'Other'); // Use car data or default
      if (bodyStyleProcessed) {
        await sleep(CONSTANTS.SLEEP_DELAYS.SHORT);
        break;
      }
    }
  }

  // --- Process Input Fields ---
  if (await checkIfStopped()) return;
  const targetSpans = [
    { text: 'Make', value: currentCar.make },
    { text: 'Model', value: currentCar.model },
    { text: 'Mileage', value: Number(currentCar.mileage) },
    { text: 'Price', value: currentCar.price },
  ];

  for (const target of targetSpans) {
    if (await checkIfStopped()) return; // Check before each field
    console.log(`Looking for spans with text: ${target.text}`);
    let processed = false;
    // Refresh spans before searching for each specific field
    spans = document.querySelectorAll('span');
    for (const span of spans) {
      if (span.textContent === target.text) {
        console.log(`Found span with text: ${target.text}`);
        processed = await fillInputFieldBySpanLabel(span, target.value);
        if (processed) {
          await sleep(CONSTANTS.SLEEP_DELAYS.SHORT); // Wait after successful fill
          break; // Move to the next target field
        }
      }
    }
    if (!processed) {
      console.log(`Could not find or process any span with text: ${target.text}`);
      // Consider if this should halt the process or just log a warning
    }
  }
  // Wait after all photos are processed/attempted
  await sleep(CONSTANTS.SLEEP_DELAYS.MEDIUM); // Adjusted wait time after loop if needed


  // --- Process "Next" Button (First Page) ---
  if (await checkIfStopped()) return;

  console.log("Waiting for 'Next' button to become enabled...");
  let nextButtonFound = false;
  const maxWaitTime = 25000; // Wait up to 25 seconds (adjust as needed)
  const checkInterval = 500; // Check every 500ms
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    if (await checkIfStopped()) return; // Check stop flag within the loop

    let spans = document.querySelectorAll('span'); // Refresh spans each time
    for (const span of spans) {
      if (span.textContent?.trim().toLowerCase() === 'next' || span.textContent?.trim().toLowerCase() === 'publish') {
        const nextButton = span.closest('div[role="button"]');
        // Check if button exists AND is not disabled
        if (nextButton && !nextButton.hasAttribute('aria-disabled')) {
          console.log('Found enabled Next button div, clicking...');
          nextButton.click();
          nextButtonFound = true;
          break; // Exit the inner for loop
        }
      }
    }
    if (nextButtonFound) {
      break; // Exit the outer while loop
    }
    // to choose color now untill solve problem

    // Wait before checking again
    await sleep(checkInterval); // Use your interruptible sleep
  }

  if (!nextButtonFound) {
    console.log(`Could not find enabled "Next" button within ${maxWaitTime / 1000} seconds. Stopping.`);
    // Optionally check if the button exists but is still disabled
    let spans = document.querySelectorAll('span');
    for (const span of spans) {
      if (span.textContent?.trim().toLowerCase() === 'next' || span.textContent?.trim().toLowerCase() === 'publish') {
        const nextButton = span.closest('div[role="button"]');
        if (nextButton && nextButton.hasAttribute('aria-disabled')) {
          console.log("Reason: 'Next' button was found but remained disabled.");
        } else if (!nextButton) {
          console.log("Reason: Could not find the 'Next' button's parent div.");
        }
        break;
      }
    }
    await chrome.storage.local.set({ [CONSTANTS.IS_POSTING_ACTIVE_KEY]: false }); // Set flag to stop
    return; // Halt execution
  }
  // --- End of modified Next Button section ---

  await sleep(CONSTANTS.SLEEP_DELAYS.PAGE_LOAD); // Wait for next page

  // --- Process "Publish" Button (Second Page) ---
  if (await checkIfStopped()) return;
  console.log('Looking for "Publish" button (Page 2)');
  let publishButtonFound = false;
  spans = document.querySelectorAll('span'); // Refresh spans
  for (const span of spans) {
    if (span.textContent?.trim().toLowerCase() === 'publish') {
      console.log('Found "Publish" span');
      const publishButton = span.closest('div[role="button"]');
      if (publishButton && !publishButton.hasAttribute('aria-disabled')) {
        console.log('Found enabled Publish button div, clicking...');
        publishButton.click();
        publishButtonFound = true;
        break;
      } else if (publishButton) {
        console.log('Publish button found but is disabled.');
      } else {
        console.log('Could not find parent button div for "Publish" span');
      }
    }
  }
  if (!publishButtonFound) {
    console.log('Could not find or process enabled "Publish" button (Page 2). Stopping.');
    await chrome.storage.local.set({ [CONSTANTS.IS_POSTING_ACTIVE_KEY]: false }); // Set flag to stop
    return; // Halt execution
  }

  await sleep(CONSTANTS.SLEEP_DELAYS.PAGE_LOAD); // Wait for publish confirmation/redirect

  // --- Call API to Mark as Published ---
  if (await checkIfStopped()) return;
  console.log(`Attempting to mark car ${currentCar.id} as published via API...`);
  try {
    // Ensure token is available
    if (!token) {
      throw new Error("Authentication token not found in storage.");
    }
    // Get current URL after publishing (might be useful)
    const finalMarketplaceUrl = window.location.href;
    await publishVehicle(currentCar.id, finalMarketplaceUrl, token);
    console.log(`Successfully marked car ${currentCar.id} as published.`);
  } catch (apiError) {
    console.error(`Failed to mark car ${currentCar.id} as published via API:`, apiError);
  }

  // --- Prepare for Next Car or Finish ---
  if (await checkIfStopped()) return;
  console.log(`Finished processing car index ${carIndex}.`);

  // Increment index in storage *after* successful processing and API call
  const nextIndex = carIndex + 1;
  await chrome.storage.local.set({ [CONSTANTS.CARS_DATA_INDEX_KEY]: nextIndex });
  console.log(`Updated car index to ${nextIndex}`);
  if (nextIndex >= dataToUse.length) {
    console.log('Finished processing all cars.');
    await chrome.storage.local.set({ [CONSTANTS.IS_POSTING_ACTIVE_KEY]: false }); // Ensure flag is false at the end
    return; // All done
  } else {
    // Navigate to start a new listing for the next car
    console.log('Navigating to Marketplace create page for next car...');
    window.location.href = CONSTANTS.MARKETPLACE_URL;
    // The script will re-run on the new page load due to the 'load' event listener
  }
} // End of publish function




async function publishVehicle(vehicleId, marketPlaceUrl, authToken) {
  // Check if stopped before making API call
  if (await checkIfStopped()) {
    throw new Error("Process stopped before calling publishVehicle API.");
  }

  const apiUrl = 'https://ameksa-001-site8.otempurl.com/api/Vehicle/publish-vehicle/';

  // --- 1. Input Validation (Basic) ---
  if (!vehicleId || typeof vehicleId !== 'number' || vehicleId <= 0) {
    throw new Error('Invalid vehicleId provided.');
  }
  if (!marketPlaceUrl || typeof marketPlaceUrl !== 'string' || !marketPlaceUrl.startsWith('http')) {
    // Basic URL check, could be more robust
    throw new Error('Invalid marketPlaceUrl provided.');
  }
  if (!authToken || typeof authToken !== 'string') {
    throw new Error('Authentication token is required.');
  }

  // --- 2. Prepare Request Body ---
  const requestBody = {
    vehicleId: vehicleId,
    marketPlaceUrl: marketPlaceUrl
  };

  // --- 3. Prepare Request Options ---
  const requestOptions = {
    method: 'POST', // Assuming POST, verify with API docs
    headers: {
      // Crucial: Tells the server we're sending JSON
      'Content-Type': 'application/json',
      // Standard way to send a Bearer token
      'Authorization': `Bearer ${authToken}`
    },
    // fetch requires the body to be a string
    body: JSON.stringify(requestBody)
  };

  // --- 4. Make the API Call ---
  console.log(`Attempting to publish vehicle ID: ${vehicleId} to ${apiUrl}`);
  try {
    const response = await fetch(apiUrl, requestOptions);

    // --- 5. Handle the Response ---
    console.log(`Received response with status: ${response.status}`);


    // Check if the request was successful (status code 200-299)
    if (!response.ok) {
      // Try to get more error details from the response body
      let errorBody = 'No additional error details available.';
      try {
        // Attempt to parse error response as text or json
        const textBody = await response.text();
        try {
          // See if it's JSON for structured error
          errorBody = JSON.stringify(JSON.parse(textBody), null, 2);
        } catch (parseError) {
          // Otherwise use the raw text
          errorBody = textBody;
        }
      } catch (bodyError) {
        console.error("Could not read error response body:", bodyError);
      }
      // Throw an error that includes the status and potentially the body
      throw new Error(`API request failed with status ${response.status} (${response.statusText}). Response: ${errorBody}`);
    }



    // await sendValueToPage(vehicleId);




    // --- 6. Process Successful Response ---
    // Check if there's content to parse. Some APIs might return 204 No Content.
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json(); // Parse JSON response body
      console.log('API call successful. Response data:', data);
      return data; // Return the parsed data
    } else if (response.status === 204) {
      console.log('API call successful (204 No Content).');
      return {}; // Return an empty object or null as appropriate
    } else {
      // Handle non-JSON success responses if necessary
      const textData = await response.text();
      console.log('API call successful. Response text:', textData);
      return textData; // Return raw text data
    }

  } catch (error) {
    // Handle network errors (fetch couldn't reach the server) or errors thrown above
    console.error('Error during API call:', error);
    // Re-throw the error so the calling code knows something went wrong
    throw error;
  }
}


async function addPhotoProcess(photoPath) {
  spans = document.querySelectorAll('span');
  let photoButtonFound = false;
  for (const span of spans) {
    if (span.textContent.toLowerCase().includes('add photo')) {
      const photoButton = span.closest('div[role="button"]'); // More specific selector
      if (photoButton) {
        const className = photoButton.className; // Get class for selector
        if (className && typeof runBase64UploadAttempt === 'function') {
          const selector = '.' + className.trim().replace(/\s+/g, '.'); // Create precise selector

          let carUrl;
          if (photoPath.startsWith('http')) {
            carUrl = photoPath;
            console.log(`Using full URL from data: ${carUrl}`);
          } else {
            const baseUrl = 'https://ameksa-001-site8.otempurl.com'; // Define base URL
            carUrl = baseUrl + photoPath;
            console.log(`Prepended base URL: ${carUrl}`);
          }

          runBase64UploadAttempt(selector, carUrl); // Call the upload function
          photoButtonFound = true;
        } else if (!className) {
          console.log('Photo button div has no class name');
        } else {
          console.error('runBase64UploadAttempt function not found. Make sure drop_img.js is loaded.');
        }
        break; // Exit loop once button is found and processed (or skipped)
      } else {
        console.log('Could not find parent div[role="button"] for "add photos" span');
      }
    }
  }
  if (!photoButtonFound) {
    console.log('Could not find or process "add photos" button');
    // Consider if this should halt the process
  }

}


// Process both color fields in sequence with proper waits
async function processColorFields() {
  if (await checkIfStopped()) return;

  // Process Interior Color first
  console.log('Looking for Interior color span');
  let interiorColorProcessed = false;
  let spans = document.querySelectorAll('span'); // Fresh query

  for (const span of spans) {
    if (span.textContent.toLowerCase().includes('interior col')) {
      console.log('Found Interior color span');
      interiorColorProcessed = await processComboBoxSpan(span, 'Brown');

      if (interiorColorProcessed) {
        console.log('Interior color successfully processed');
        // Wait longer to ensure UI has completely settled
        await sleep(CONSTANTS.SLEEP_DELAYS.MEDIUM);
        break;
      }
    }
  }

  // Only proceed to Exterior Color after Interior is complete and UI has settled
  if (await checkIfStopped()) return;

  console.log('Looking for Exterior color span');
  let exteriorColorProcessed = false;
  // Critical: Get fresh spans after the DOM has been updated
  spans = document.querySelectorAll('span');

  for (const span of spans) {
    if (span.textContent.toLowerCase().includes('exterior col')) {
      console.log('Found Exterior color span');
      exteriorColorProcessed = await processComboBoxSpan(span, 'Black');

      if (exteriorColorProcessed) {
        console.log('Exterior color successfully processed');
        await sleep(CONSTANTS.SLEEP_DELAYS.MEDIUM);
        break;
      }
    }
  }

  return { interiorColorProcessed, exteriorColorProcessed };
}



// async function sendValueToPage(vehicleId) {
//   console.log(`[Content Script] Sending value:`, vehicleId);
//   await window.postMessage(
//     {
//       type: "CALL_DASHBOARD_FUNCTION", // Add a type to identify your messages
//       payload: {
//         vehicleId:vehicleId
//       }
//     },
//     "*" // IMPORTANT: Specify the target origin for security
//   );
// }
async function sendValueToPage(vehicleId) {
  console.log(`[Content Script] Sending value:`, vehicleId);
  chrome.runtime.sendMessage(
    {
      action: "SendValueToPage", // Clear action name
      source: vehicleId
    })

}