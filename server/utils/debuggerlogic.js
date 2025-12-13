// server/utils/debuggerLogic.js

// Required Node.js modules
const { ESLint } = require('eslint'); // For JavaScript linting
const { spawn } = require('child_process'); // To run external commands like Pylint for Python, g++ for C++
const path = require('path'); // For resolving file paths
const fs = require('fs/promises'); // For asynchronous file system operations (e.g., creating/deleting temp files)
const fsSync = require('fs');
const os = require('os'); // For getting system's temporary directory
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Google Gemini API SDK

// --- Gemini API Setup ---
// Make sure your GOOGLE_API_KEY is in your .env file in the server root.
const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
    console.error('GOOGLE_API_KEY not found in .env file. AI explanations will be disabled.');
}
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// **IMPORTANT: Using 'gemini-1.5-flash' as the default model.**
// This is a commonly available, fast, and stable model that supports generateContent.
// If this still gives a 404 Not Found error, then the issue is broader (API key permissions, region availability, or Google's API status).
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" }) : null;

// --- Error Explanation Mapping (Hardcoded fallback/supplement) ---
// This object provides human-readable explanations and suggestions for common ESLint errors.
const errorExplanations = {
    // JavaScript Errors
    "Unterminated string constant": {
        explanation: "This error occurs when a string literal (text enclosed in quotes) is not properly closed with its matching quote. For example, `\"Hello` is missing a closing `\"` or `'`.",
        suggestion: "Ensure all your string literals start and end with matching single (`'`) or double (`\"`) quotes."
    },
    "Unexpected token": {
        explanation: "This means there's a character or symbol where the JavaScript parser didn't expect it, often due to a syntax error or a typo.",
        suggestion: "Check for missing or extra punctuation (like parentheses, brackets, curly braces, or semicolons), typos in keywords, or incorrect operator usage around the reported line and column. This can also happen with invalid syntax for newer JavaScript features if `ecmaVersion` is too low."
    },
    "Missing semicolon": {
        explanation: "This is a basic syntax error where a semicolon (`;`) is expected at the end of a statement but is missing.",
        suggestion: "Add a semicolon (`;`) at the end of the problematic line to terminate the statement."
    },
    "Unexpected end of input": {
        explanation: "The JavaScript parser reached the end of the code unexpectedly. This often means a block (like a function, loop, or if statement) was started but not properly closed with a curly brace (`}`).",
        suggestion: "Check for unclosed curly braces `{}`, parentheses `()`, or square brackets `[]`. Ensure all blocks are properly terminated."
    },
    "no-undef": {
        explanation: "This error means you are trying to use a variable or function that has not been declared or imported in the current scope. ESLint cannot find its definition.",
        suggestion: "Declare the variable/function using `const`, `let`, or `var` before using it. If it's a global variable (like `document`, `window`), ensure your ESLint configuration's `env` or `globals` settings are correct. Check for typos in the variable/function name."
    },
    "no-unused-vars": {
        explanation: "This warning indicates that you have declared a variable or imported a module but are not using it anywhere in your code. Unused code can be a sign of a bug or unnecessary complexity.",
        suggestion: "Remove the unused variable/import or ensure it's being utilized in your logic to avoid dead code and improve readability."
    },
    "semi": {
        explanation: "This rule enforces the use of semicolons (`;`) at the end of statements for consistency and to prevent potential automatic semicolon insertion (ASI) issues.",
        suggestion: "Add a semicolon (`;`) at the end of the problematic line. If you prefer not to use semicolons, you need to configure ESLint accordingly."
    },
    "indent": {
        explanation: "This rule enforces a consistent indentation style (e.g., 2 or 4 spaces, or tabs) across your codebase. Inconsistent indentation can make code hard to read.",
        suggestion: "Adjust the indentation of the line to match the configured style (e.g., use 4 spaces instead of 2, or vice versa). Many IDEs can automatically format this."
    },
    "quotes": {
        explanation: "This rule enforces consistent use of single (`'`) or double (`\"`) quotes for string literals. Consistency improves readability.",
        suggestion: "Change the quotes (single to double, or double to single) to match the configured style (e.g., use single quotes if `quotes: ['error', 'single']` is set)."
    },
    "no-trailing-spaces": {
        explanation: "This rule disallows extraneous whitespace at the end of lines.",
        suggestion: "Remove any trailing spaces at the end of the line."
    },
    "eol-last": {
        explanation: "This rule enforces a newline character at the end of the file.",
        suggestion: "Add an empty line (newline character) at the very end of your file."
    }
    // Add specific C++ error patterns here if g++ output is consistent
    // "error: expected primary-expression before ‘return’": {
    //     explanation: "This C++ error means a return statement or other expression is malformed, often due to a missing semicolon or incorrect syntax.",
    //     suggestion: "Check for missing semicolons, parentheses, or incorrect syntax in the expression before 'return'."
    // }
};

// --- Function to get AI explanation/suggestion/fix from Gemini ---
async function getAIExplanation(code, language, errorMessages) {
    if (!model) { // Check if Gemini model was initialized (i.e., API_KEY was present)
        console.warn("Gemini API not initialized (missing API key or model error). Skipping AI explanation.");
        return { aiExplanation: null, aiSuggestion: null, aiFixedCode: null };
    }

    // Construct a detailed prompt for Gemini
    const prompt = `You are an expert code debugger. Analyze the following ${language} code and its reported issues. Provide a clear, concise explanation of the root cause of the error(s) and a specific, actionable suggestion to fix it. If possible, provide the complete corrected code.

Code:
\`\`\`${language}
${code}
\`\`\`

Reported Issues:
${errorMessages.map(msg => `- Line ${msg.line}, Column ${msg.column} [${msg.severity.toUpperCase()}]: ${msg.message} (Rule: ${msg.ruleId || 'N/A'})`).join('\n')}

Please provide your response in the following JSON format:
{
  "explanation": "Detailed explanation of the problem.",
  "suggestion": "Specific steps to fix the problem.",
  "fixedCode": "If possible, the complete corrected code block. Otherwise, null."
}
`;

    try {
        const chat = model.startChat({
            history: [] // Start a new chat session
        });
        const result = await chat.sendMessage(prompt); // Send the prompt to Gemini
        const response = await result.response;
        const text = response.text(); // Get the text response from Gemini

        // Attempt to parse the JSON. Gemini can sometimes include markdown like ```json ... ```
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        let jsonText = jsonMatch ? jsonMatch[1] : text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);

        if (!jsonText || jsonText.trim() === '') {
            // Fallback: If JSON parsing fails (e.g., Gemini didn't return perfect JSON or only text)
            console.error("AI Response not in expected JSON format or is empty. Raw response:", text);
            return { aiExplanation: text, aiSuggestion: "Could not parse AI response into JSON. Check original AI response.", aiFixedCode: null };
        }

        const parsedResponse = JSON.parse(jsonText);
        return {
            aiExplanation: parsedResponse.explanation,
            aiSuggestion: parsedResponse.suggestion,
            aiFixedCode: parsedResponse.fixedCode // This will be null if Gemini couldn't provide a fix
        };
    } catch (aiError) {
        // Log errors from the Gemini API call
        console.error('Error fetching AI explanation:', aiError.response?.text() || aiError.message);
        return { aiExplanation: null, aiSuggestion: null, aiFixedCode: null };
    }
}


// --- Linter/Compiler Helper Functions ---

/**
 * Runs ESLint analysis on JavaScript code and attempts to fix issues.
 * @param {string} code - The JavaScript code to analyze.
 * @returns {Promise<object>} - A promise that resolves to the analysis result and potentially fixed code.
 */
async function runEsLintAnalysis(code) {
    let aiExplanationData = { aiExplanation: null, aiSuggestion: null, aiFixedCode: null };
    let fixedCode = code;

    try {
        const eslint = new ESLint({
            overrideConfigFile: path.resolve(__dirname, '../.eslintrc.js'),
            fix: true
        });

        const results = await eslint.lintText(code);

        if (results[0] && typeof results[0].output === 'string') {
            fixedCode = results[0].output;
        }

        const formattedMessages = results.flatMap(result =>
            result.messages.map(msg => {
                let explanationData = {
                    explanation: "No specific explanation available for this error.",
                    suggestion: "Review the code at the reported line and column for syntax errors or logical inconsistencies. Search for the error message or rule ID online."
                };

                if (msg.ruleId && errorExplanations[msg.ruleId]) {
                    explanationData = errorExplanations[msg.ruleId];
                } else {
                    for (const key in errorExplanations) {
                        if (!msg.ruleId && msg.message.includes(key)) {
                            explanationData = errorExplanations[key];
                            break;
                        }
                    }
                }

                return {
                    ruleId: msg.ruleId,
                    severity: msg.severity === 2 ? 'error' : 'warning',
                    message: msg.message,
                    line: msg.line,
                    column: msg.column,
                    nodeType: msg.nodeType,
                    suggestions: msg.suggestions || [],
                    errorExplanation: explanationData.explanation,
                    errorSuggestion: explanationData.suggestion
                };
            })
        );

        if (formattedMessages.length > 0) {
            aiExplanationData = await getAIExplanation(code, 'javascript', formattedMessages);
        }

        return {
            success: true,
            analysis: [{ filePath: '<text>', messages: formattedMessages }],
            fixedCode: fixedCode,
            aiFixedCode: aiExplanationData.aiFixedCode,
            aiExplanation: aiExplanationData.aiExplanation,
            aiSuggestion: aiExplanationData.aiSuggestion
        };

    } catch (error) {
        console.error('ESLint execution error:', error);
        return { success: false, error: 'Failed to run ESLint. Check server logs for details.', details: error.message };
    }
}

/**
 * Runs Pylint analysis on Python code.
 * @param {string} code - The Python code to analyze.
 * @returns {Promise<object>} - A promise that resolves to the analysis result.
 */
async function runPylintAnalysis(code) {
    let tempFilePath;
    let aiExplanationData = { aiExplanation: null, aiSuggestion: null, aiFixedCode: null };
    try {
        const tempDir = os.tmpdir();
        tempFilePath = path.join(tempDir, `temp_python_code_${Date.now()}.py`);

        await fs.writeFile(tempFilePath, code);

        const pylintProcess = spawn('pylint', [
            tempFilePath,
            '--output-format=json',
            `--rcfile=${path.resolve(__dirname, '../.pylintrc')}`
        ], {
            cwd: path.resolve(__dirname, '../'),
            shell: true
        });

        let stdout = '';
        let stderr = '';

        pylintProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pylintProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        return new Promise((resolve, reject) => {
            pylintProcess.on('close', async (exitCode) => {
                await fs.unlink(tempFilePath).catch(e => console.error("Error deleting temp file:", e));

                if (stderr) {
                    console.error('Pylint stderr:', stderr);
                    if (stderr.includes("'pylint' is not recognized") || stderr.includes("command not found: pylint")) {
                        return resolve({ success: false, error: "Pylint is not installed or not in your system's PATH. Please install it (e.g., 'pip install pylint')." });
                    }
                    if (!stdout) {
                        return resolve({ success: false, error: `Pylint encountered an error: ${stderr.trim()}` });
                    }
                }

                try {
                    const pylintResults = JSON.parse(stdout || '[]');
                    const formattedMessages = pylintResults.map(msg => ({
                        type: msg.type,
                        module: msg.module,
                        symbol: msg.symbol,
                        message: msg.message,
                        line: msg.line,
                        column: msg.column,
                        endLine: msg.endLine,
                        endColumn: msg.endColumn,
                        errorExplanation: `Pylint found a '${msg.type}' type issue: ${msg.message}.`,
                        errorSuggestion: `Review the Python code at line ${msg.line}, column ${msg.column}. Consult Pylint documentation for rule '${msg.symbol}'.`
                    }));

                    if (formattedMessages.length > 0) {
                        aiExplanationData = await getAIExplanation(code, 'python', formattedMessages);
                    }

                    resolve({
                        success: true,
                        analysis: [{ filePath: '<text>', messages: formattedMessages }],
                        fixedCode: code,
                        aiFixedCode: aiExplanationData.aiFixedCode,
                        aiExplanation: aiExplanationData.aiExplanation,
                        aiSuggestion: aiExplanationData.aiSuggestion
                    });

                } catch (parseError) {
                    console.error('Pylint JSON parse error:', parseError);
                    resolve({ success: false, error: 'Failed to parse Pylint output.', details: stdout || stderr || parseError.message });
                }
            });

            pylintProcess.on('error', async (err) => {
                if (tempFilePath) {
                    await fs.unlink(tempFilePath).catch(e => console.error("Error deleting temp file on process error:", e));
                }
                console.error('Failed to start Pylint process:', err);
                reject(new Error(`Failed to run Pylint: ${err.message}. Is Pylint installed and in your PATH?`));
            });
        });

    } catch (error) {
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(e => console.error("Error deleting temp file in catch block:", e));
        }
        console.error('File operation or Pylint setup error:', error);
        return { success: false, error: 'Failed to prepare Python code for analysis.', details: error.message };
    }
}

/**
 * Runs g++ analysis for C++ code to find compilation errors.
 * Note: g++ doesn't provide structured JSON output, so parsing stderr is required.
 * @param {string} code - The C++ code to analyze.
 * @returns {Promise<object>} - A promise that resolves to the analysis result.
 */
async function runCppAnalysis(code) {
    let tempCppFilePath;
    let tempExecutablePath;
    let aiExplanationData = { aiExplanation: null, aiSuggestion: null, aiFixedCode: null };
    let formattedMessages = [];

    try {
        const tempDir = os.tmpdir();
        tempCppFilePath = path.join(tempDir, `temp_cpp_code_${Date.now()}.cpp`);
        tempExecutablePath = path.join(tempDir, `temp_cpp_executable_${Date.now()}`); // For compiled executable

        await fs.writeFile(tempCppFilePath, code);

        // Run g++ to compile the C++ code
        const cppProcess = spawn('g++', [
            tempCppFilePath,
            '-o', tempExecutablePath, // Output executable name
            '-std=c++11', // Or any other C++ standard
            '-Wall', '-Wextra' // Enable all warnings
        ], { shell: true }); // shell: true might be necessary for 'g++' to be found

        let stderr = '';
        cppProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        return new Promise((resolve, reject) => {
            cppProcess.on('close', async (exitCode) => {
                // Clean up temporary C++ file and executable
                await fs.unlink(tempCppFilePath).catch(e => console.error("Error deleting temp .cpp file:", e));
                // Only try to unlink executable if compilation was attempted successfully (exitCode 0)
                // or if we explicitly want to clean up even on failure.
                // For simplicity, we'll try to unlink regardless.
                if (exitCode === 0 || fsSync.existsSync(tempExecutablePath)) { // Check if file exists before trying to unlink for non-0 exit code
                     await fs.unlink(tempExecutablePath).catch(e => { /* Ignore if executable not created or access error */ });
                }


                if (stderr) {
                    // g++ errors are often multi-line and not JSON.
                    // We need to parse them to extract line, column, message.
                    // This is a basic regex-based parser, might not cover all g++ formats.
                    const errorLines = stderr.split('\n');
                    errorLines.forEach(line => {
                        const match = line.match(/^(.*?):(\d+):(\d+):\s*(error|warning):\s*(.*)$/);
                        if (match) {
                            formattedMessages.push({
                                filePath: match[1],
                                line: parseInt(match[2], 10),
                                column: parseInt(match[3], 10),
                                severity: match[4] === 'error' ? 'error' : 'warning',
                                message: match[5],
                                ruleId: 'g++-compilation' // Generic rule ID
                            });
                        } else if (line.includes("error:")) {
                            // Catch general error lines if specific line/col not matched
                            formattedMessages.push({
                                filePath: '<text>',
                                line: 0, // Fallback to line 0 if not parsed
                                column: 0,
                                severity: 'error',
                                message: line.trim(),
                                ruleId: 'g++-compilation'
                            });
                        } else if (line.includes("warning:")) { // Also catch general warnings
                             formattedMessages.push({
                                filePath: '<text>',
                                line: 0,
                                column: 0,
                                severity: 'warning',
                                message: line.trim(),
                                ruleId: 'g++-compilation'
                            });
                        }
                    });

                    if (stderr.includes("'g++' is not recognized") || stderr.includes("command not found: g++")) {
                        return resolve({ success: false, error: "g++ compiler is not installed or not in your system's PATH. Please install it." });
                    }
                }

                // Call AI only if there are issues or if compilation completely failed
                if (formattedMessages.length > 0 || exitCode !== 0) {
                    aiExplanationData = await getAIExplanation(code, 'c++', formattedMessages);
                } else if (exitCode === 0 && formattedMessages.length === 0) {
                    // If no errors and successful compilation, then clean code
                    // No need to call AI for clean code unless specific instruction
                }


                resolve({
                    success: true, // success true bhi ho sakta hai agar only warnings hain
                    analysis: [{ filePath: '<text>', messages: formattedMessages }],
                    fixedCode: code, // g++ does not auto-fix.
                    aiFixedCode: aiExplanationData.aiFixedCode,
                    aiExplanation: aiExplanationData.aiExplanation,
                    aiSuggestion: aiExplanationData.aiSuggestion
                });
            });

            cppProcess.on('error', async (err) => {
                if (tempCppFilePath) {
                    await fs.unlink(tempCppFilePath).catch(e => console.error("Error deleting temp .cpp file on process error:", e));
                }
                if (tempExecutablePath) {
                    // Try to unlink executable if it was created
                    await fs.unlink(tempExecutablePath).catch(e => { /* Ignore */ });
                }
                console.error('Failed to start g++ process:', err);
                reject(new Error(`Failed to run g++: ${err.message}. Is g++ installed and in your PATH?`));
            });
        });

    } catch (error) {
        // Catch errors during file operations (e.g., writeFile, unlink)
        if (tempCppFilePath) {
            await fs.unlink(tempCppFilePath).catch(e => console.error("Error deleting temp .cpp file in catch block:", e));
        }
        if (tempExecutablePath) {
            // Try to unlink executable if it was created
            await fs.unlink(tempExecutablePath).catch(e => { /* Ignore */ });
        }
        console.error('File operation or g++ setup error:', error);
        return { success: false, error: 'Failed to prepare C++ code for analysis.', details: error.message };
    }
}


// --- Main Debugging Function ---

/**
 * Analyzes code based on the specified language.
 * @param {string} code - The code string to analyze.
 * @param {string} language - The programming language of the code (e.g., 'javascript', 'python').
 * @returns {Promise<object>} - A promise that resolves to the analysis result.
 */
async function runCodeAnalysis(code, language) {
    switch (language.toLowerCase()) {
        case 'javascript':
            return runEsLintAnalysis(code);
        case 'python':
            return runPylintAnalysis(code);
        case 'c++': // <-- NEW CASE FOR C++
        case 'cpp': // <-- Add common alias for C++
            return runCppAnalysis(code);
        // Add more cases for other languages here if you want to support them
        default:
            return { success: false, error: `Unsupported language for debugging: ${language}.` };
    }
}

module.exports = { runCodeAnalysis };