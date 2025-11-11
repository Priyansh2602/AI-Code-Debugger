// server/controllers/debugController.js

// Make sure debuggerlogic.js is correctly required
const { runCodeAnalysis } = require('../utils/debuggerlogic');
// Make sure tesseract.js is correctly required (for image OCR)
const Tesseract = require('tesseract.js');

const debugCode = async (req, res) => {
    let code = '';
    let language = 'javascript'; // Default language if not determined or provided

    // **UPDATED LOGIC:**
    // 1. Prioritize file upload if req.files.codeFile exists.
    //    'express-fileupload' populates req.files, and req.body might be empty for multipart/form-data.
    if (req.files && req.files.codeFile) {
        const codeFile = req.files.codeFile;
        code = codeFile.data.toString('utf8'); // Read file content as string

        // Detect language based on file extension
        const fileExtension = codeFile.name.split('.').pop().toLowerCase(); // Convert to lowercase for robust comparison

        if (fileExtension === 'js') {
            language = 'javascript';
        } else if (fileExtension === 'py') {
            language = 'python';
        } else if (fileExtension === 'cpp' || fileExtension === 'cxx' || fileExtension === 'cc') { // C++ extensions
            language = 'c++';
        }
        // Removed 'else if (fileExtension === 'java')' and 'else if (fileExtension === 'go')'

        else {
            // Fallback for unknown file extensions.
            // If an unknown file type is uploaded, it will be debugged as the default language (javascript)
            // or whatever language the frontend selected.
            console.warn(`[debugCode] Unknown file extension for uploaded file: ${fileExtension}. Defaulting language to '${language}'.`);
        }
    }
    // 2. If no file uploaded, check if code is pasted directly in req.body.
    //    Ensure req.body exists before trying to access req.body.code
    else if (req.body && typeof req.body.code === 'string') {
        code = req.body.code;
        // Use language from body if provided, else keep default
        if (typeof req.body.language === 'string' && req.body.language) {
             language = req.body.language;
        }
    }
    // 3. If neither code is pasted nor file is uploaded, then it's an invalid request.
    else {
        return res.status(400).json({ error: 'No code provided for debugging or invalid input format.' });
    }

    // After processing input, check if the extracted code is empty or just whitespace.
    if (!code.trim()) { // .trim() removes leading/trailing whitespace
        return res.status(400).json({ error: 'Provided code is empty or contains only whitespace. Please provide valid code.' });
    }

    try {
        // Call the main analysis function from debuggerlogic.js
        const result = await runCodeAnalysis(code, language);
        res.json(result); // Send the analysis result back to the frontend
    } catch (error) {
        // Catch any errors during the debugging process (e.g., linter crash, AI API error)
        console.error('Debugging error in controller:', error);
        res.status(500).json({ error: 'Failed to debug code due to an internal server error.', details: error.message });
    }
};

const processImageForCode = async (req, res) => {
    if (!req.files || !req.files.image) {
        return res.status(400).json({ error: 'No image provided for OCR.' });
    }

    const imageFile = req.files.image;

    try {
        // Recognize text from the image using Tesseract.js
        // Removed the '{ logger: m => console.log(m) }' to stop Tesseract progress from printing to console.
        const { data: { text } } = await Tesseract.recognize(
            imageFile.data, // Buffer of the image
            'eng' // Language for OCR (English)
        );
        res.json({ extractedText: text }); // Send extracted text back to the frontend
    } catch (error) {
        console.error('OCR error:', error);
        res.status(500).json({ error: 'Failed to extract text from image.', details: error.message });
    }
};

// Export the functions to be used in routes
module.exports = {
    debugCode,
    processImageForCode
};