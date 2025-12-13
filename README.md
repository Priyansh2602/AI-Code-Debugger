🌟 AI Code Debugger: Stability Aur Smart Debugging 🧠
🚀 Project Overview
This application is a full-stack, AI-enhanced debugging tool that uses a Hybrid Analysis Architecture for superior results. It combines the reliability of local, native language tools with the intelligence of the Google Gemini API to provide clear, multi-language debugging solutions, auto-fixes, and detailed explanations.

✨ Key Features
Hybrid Analysis: Integrates local tools (ESLint, Pylint, g++) with Gemini AI for robust error checking.

Intelligent Auto-Fix: Utilizes the Gemini API to generate the complete corrected code block from technical errors.

Code Input Flexibility: Accepts code via direct paste, file upload, or image upload (OCR).

Multi-Language Support: Provides debugging solutions for code in JavaScript, Python, C++, and other languages.

🔬 Integrated Debugging Toolset (The Local Analysis Core)
This section details the primary local tools used to analyze user-submitted code for immediate error detection:
## 🔬 Integrated Debugging Toolset (The Local Analysis Core)

| Language | Primary Local Tool (Validation/Linting) | Function | AI Enhancement (Gemini) |
| :--- | :--- | :--- | :--- |
| **JavaScript** | **ESLint** (Node Module) | Catches static analysis errors, stylistic issues, and rule violations for user-submitted JS code. | Provides detailed root cause analysis and a complete corrected code block. |
| **Python** | **Pylint** (External Process) | Runs comprehensive static analysis and returns structured technical warnings/errors for Python code. | Converts raw Pylint output into clear, actionable suggestions and fixes. |
| **C++** | **g++** (External Compiler) | Compiles code to find and extract raw compilation and linker errors. | Translates complex g++ error messages into easy-to-understand explanations. |
