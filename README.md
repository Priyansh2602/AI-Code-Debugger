# 🌟AI Code Debugger: Stability Aur Smart Debugging 🧠
## 🚀 Project Overview

This application is a full-stack, AI-enhanced debugging tool that uses a Hybrid Analysis Architecture for superior results. It combines the reliability of local, native language tools with the intelligence of the Google Gemini API to provide clear, multi-language debugging solutions, auto-fixes, and detailed explanations.

## ✨ Key Features
➜ Hybrid Analysis: Integrates local tools (ESLint, Pylint, g++) with Gemini AI for robust error checking.

➜Intelligent Auto-Fix: Utilizes the Gemini API to generate the complete corrected code block from technical errors.

➜Code Input Flexibility: Accepts code via direct paste, file upload, or image upload (OCR).

➜Multi-Language Support: Provides debugging solutions for code in JavaScript, Python, C++.


## 🔬 Integrated Debugging Toolset (The Local Analysis Core)

| Language | Primary Local Tool (Validation/Linting) | Function | AI Enhancement (Gemini) |
| :--- | :--- | :--- | :--- |
| **JavaScript** | **ESLint** (Node Module) | Catches static analysis errors, stylistic issues, and rule violations for user-submitted JS code. | Provides detailed root cause analysis and a complete corrected code block. |
| **Python** | **Pylint** (External Process) | Runs comprehensive static analysis and returns structured technical warnings/errors for Python code. | Converts raw Pylint output into clear, actionable suggestions and fixes. |
| **C++** | **g++** (External Compiler) | Compiles code to find and extract raw compilation and linker errors. | Translates complex g++ error messages into easy-to-understand explanations. |

## 💻 Tech Stack

| Category | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend** | `React.js`, `CSS3`, `HTML5` | Used for a modern UI and the interactive code editor. |
| **Backend** | `Node.js`, `Express.js` | Server logic, handles file operations, and manages communication with external tools and the AI service. |
| **AI/Analysis** | `Google Gemini API` | The powerful intelligence layer for synthesizing fixes and generating high-quality explanations. |
| **Utilities** | `Tesseract.js` | Used for **Optical Character Recognition (OCR)**, enabling code extraction from uploaded images. |

### 🌎 Supported Debugging Languages
Users can analyze and receive corrections for a wide variety of code, including:

• JavaScript

• Python

• C++

## ⚙️ Installation and Setup (Local)
Prerequisites

You must have the following system dependencies installed for full multi-language functionality:

• Node.js and npm

• Python and Pylint (e.g., pip install pylint)

• C++ Compiler (g++)

## Environment Variables
Create a .env file in the root directory and add your key:
### Google Gemini API Key - Required for the AI explanation and fix generation feature.
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE 

## Install Dependencies
### Server dependencies
cd server

npm install

### Client dependencies
cd client

npm install

## Run the Project

• Terminal 1 (Backend):

cd server

npm run dev

• Terminal 2 (Frontend):

cd client

npm start
