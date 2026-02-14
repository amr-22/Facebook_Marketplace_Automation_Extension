# Facebook Marketplace Automation Extension 🚗

A Chrome extension that automates listing vehicles on Facebook Marketplace using data from an Excel file.

## 📂 Project Setup

1.  **Download/Clone** this project to your computer.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  **Enable Developer Mode** (toggle switch in the top right corner).
4.  Click **Load unpacked**.
5.  Select the `facebook_marketplace_merged` folder from this project.

## 🚀 How to Use

1.  **Prerequisite:**
    *   Ensure you are **logged into Facebook** in this browser window.
    *   *You do not need to open the Marketplace page manually; the extension will do that for you.*

2.  **Open the Extension Sidebar**:
    *   Click the extension icon (🧩) in your browser toolbar.
    *   Select "Facebook MarketPlace Listing Sidebar".

3.  **Upload Data**:
    *   Drag and drop the included example file: `example_cars_data.xlsx` (found in the project folder).
    *   *Note: This file contains sample car data and image links.*

4.  **Start Automation**:
    *   Click the **Process** button in the sidebar.
    *   The extension will automatically open a new tab, navigate to the Marketplace, and start filling in the details.

## 📋 Formatting Your Own Excel File

To use your own data, ensure your Excel file has these headers (case-insensitive):

| Column Name | Description |
| :--- | :--- |
| **Make** | Car Manufacturer (e.g., Toyota) |
| **Model** | Car Model (e.g., Camry) |
| **Year** | Logic Year (e.g., 2020) |
| **Mileage** | Distance driven |
| **Price** | List Price |
| **PhotoUrls** | **Full URL** to the image (e.g., `https://example.com/car.jpg`) |
| **BodyStyle** | (Optional) e.g., Sedan, SUV |

*You can use `Img`, `Image`, `Photo`, or `PhotoUrls` for the image column.*