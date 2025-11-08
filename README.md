# 🚗 GWTPL Gate Pass and Data Portal (Google Apps Script)

This project is a dedicated **Google Apps Script (GAS) Web Application** created for **GWTPL Abohar**.  
It uses a **Google Sheet** as a backend database, allowing users to efficiently access, view, and generate **printable or PDF copies** of Gate Pass records on demand.

---

## ✨ Key Features

- **Real-time Data Fetching:** Retrieves Gate Pass records directly from Google Sheets based on the entered Gate Pass number.  
- **Gate Pass Generation:** Displays a professional, ready-to-print Gate Pass using the `index googel script.html` template.  
- **PDF & Print Support:** Integrates the `html2pdf.js` library for instant PDF download and print functionality.  
- **Secure Logs/Admin Access:** Includes a password-protected modal (within `index.html`) for logs and administrative control.  
- **QR Code Integration:** Automatically generates a scannable QR code containing the Gate Pass number for quick verification.  
- **Apps Script Backend:** Lightweight, fully hosted on Google’s infrastructure — no external server needed.

---

## 🛠️ Technology Stack

| **Component** | **Technology** | **Role** |
|----------------|----------------|-----------|
| Backend | Google Apps Script (`Code.gs`) | Handles Web App hosting (`doGet`), Google Sheet data access, and backend logic |
| Frontend UI | HTML, CSS, JavaScript | Provides user interface, search, and admin controls |
| Database | Google Sheets | Cloud-based storage for all Gate Pass records and logs |
| Libraries | `html2pdf.js`, `qrcode.js` | Generate PDFs and QR codes |

---

## 📁 Project Files & Structure

| **File** | **Type** | **Description** |
|-----------|-----------|-----------------|
| `Code.gs` | Apps Script | **Backend Logic:** Contains the `doGet()` entry point and the `fetchRecord(gpNo)` function that interacts with the Sheet. |
| `index.html` | HTML / JS | **Main Portal/Search Page:** Landing page with search form and admin/login modal. |
| `index googel script.html` | HTML / JS | **Gate Pass Template:** Printable view layout for the Gate Pass, includes QR and PDF generation scripts. |

---

## 🚀 Deployment Instructions (Google Apps Script)

### Step 1: Prepare the Google Sheet

1. Create a new **Google Sheet** in your Google Drive.  
2. Rename one sheet tab as **`GatePassLog`** (must match the reference in `Code.gs`).  
3. Structure your data as follows:

| **Column** | **Data Field** | **Description** |
|-------------|----------------|-----------------|
| A | Gate Pass Number | Unique identifier for each gate pass |
| B, C, D... | Other Fields | Data fields used by `fetchRecord()` in `Code.gs` |

---

### Step 2: Apps Script Setup

1. Open the Google Sheet → **Extensions > Apps Script**.  
2. Upload the project files:

| **File Name** | **Action** |
|----------------|------------|
| `Code.gs` | Paste the backend code into this default file. |
| `index.html` | Create new HTML file → paste main portal page code. |
| `index googel script.html` | Create another HTML file → paste gate pass template code. |

3. Save all files.

---

### Step 3: Update the Spreadsheet ID

In your `Code.gs`, replace the placeholder with your actual Sheet ID:

```js
const sheet = SpreadsheetApp.openById("YOUR_SPREADSHEET_ID_HERE").getSheetByName("GatePassLog");
