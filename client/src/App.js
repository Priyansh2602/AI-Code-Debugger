// client/src/App.js

import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Helper function to remove markdown code block wrappers
const cleanCodeFromMarkdown = (codeString) => {
    if (!codeString || typeof codeString !== 'string') {
        return '';
    }
    const cleaned = codeString.replace(/^```[a-zA-Z+]*\n?/, '').replace(/\n```$/, '');
    return cleaned.trim();
};

function App() {
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('c++');
    const [debugResult, setDebugResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [file, setFile] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [extractedText, setExtractedText] = useState('');

    const handleDebug = async () => {
        setLoading(true);
        setError('');
        setDebugResult(null);

        const formData = new FormData();
        if (file) {
            formData.append('codeFile', file);
        } else {
            formData.append('code', code);
            formData.append('language', language);
        }

        try {
            const response = await axios.post('http://localhost:5000/api/debug', formData, {
                headers: {
                    'Content-Type': file ? 'multipart/form-data' : 'application/json'
                }
            });
            setDebugResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred during debugging.');
            console.error("Frontend Debugging Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUploadAndOCR = async () => {
        if (!imageFile) {
            setError('Please select an image file first.');
            return;
        }

        setLoading(true);
        setError('');
        setExtractedText('');

        const formData = new FormData();
        formData.append('image', imageFile);

        try {
            const response = await axios.post('http://localhost:5000/api/debug/ocr', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setExtractedText(response.data.extractedText);
            setCode(response.data.extractedText);
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred during OCR.');
            console.error("Frontend OCR Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const applyFixedCode = () => {
        if (debugResult) {
            const rawCodeToApply = debugResult.aiFixedCode || debugResult.fixedCode;
            if (rawCodeToApply) {
                const cleanedCode = cleanCodeFromMarkdown(rawCodeToApply);
                setCode(cleanedCode);
                setDebugResult(null);
                setError('');
            }
        }
    };

    return (
        <div className="App">
            <header className="app-header">
                <h1 className="app-title">AI Powered Code Debugger</h1>
                <p className="app-subtitle">Instantly debug your code with linters and advanced AI analysis.</p>
            </header>

            <main className="main-content">
                <section className="input-section">
                    <div className="code-input-container">
                        <textarea
                            placeholder="Paste your code here..."
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                    
                    <div className="input-controls">
                        <div className="control-group">
                            <label htmlFor="language-select" className="control-label">Language:</label>
                            <select 
                                id="language-select" 
                                value={language} 
                                onChange={(e) => setLanguage(e.target.value)}
                                className="language-select"
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="c++">C++</option>
                            </select>
                        </div>
                        <div className="control-group">
                            <label htmlFor="file-input" className="control-label">Upload File:</label>
                            <input 
                                id="file-input" 
                                type="file" 
                                onChange={(e) => setFile(e.target.files[0])}
                                className="file-input"
                            />
                        </div>
                        <button onClick={handleDebug} disabled={loading} className="debug-button">
                            {loading ? 'Debugging...' : 'Debug Code'}
                        </button>
                    </div>

                    <div className="ocr-upload">
                        <p className="ocr-text">Or extract code from an image:</p>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => setImageFile(e.target.files[0])}
                            className="ocr-input"
                        />
                        <button onClick={handleImageUploadAndOCR} disabled={loading} className="ocr-button">
                            {loading ? 'Processing...' : 'Extract Code from Image'}
                        </button>
                    </div>
                    {extractedText && (
                        <div className="extracted-text-preview">
                            <p className="preview-label">Extracted Text:</p>
                            <pre className="preview-code">{extractedText}</pre>
                        </div>
                    )}
                </section>

                {error && <div className="error-message">{error}</div>}

                {debugResult && (
                    <section className="result-section">
                        <h2 className="result-title">Analysis Results</h2>

                        {/* AI Suggested Solution */}
                        {debugResult.aiFixedCode && debugResult.aiFixedCode !== code && (
                            <div className="result-card fixed-code-section ai-fixed-code">
                                <h3 className="card-title">AI Suggested Solution:</h3>
                                <pre className="fixed-code">{cleanCodeFromMarkdown(debugResult.aiFixedCode)}</pre>
                                <button onClick={applyFixedCode} className="apply-fix-button">Apply AI Solution</button>
                            </div>
                        )}
                        {/* Linter Auto-Fixed Code */}
                        {(!debugResult.aiFixedCode && debugResult.fixedCode && debugResult.fixedCode !== code) && (
                            <div className="result-card fixed-code-section">
                                <h3 className="card-title">Auto-Fixable Solution:</h3>
                                <pre className="fixed-code">{debugResult.fixedCode}</pre>
                                <button onClick={applyFixedCode} className="apply-fix-button">Apply Auto-Fix</button>
                            </div>
                        )}

                        {/* AI Explanation and Suggestion */}
                        {(debugResult.aiExplanation || debugResult.aiSuggestion) && (
                            <div className="result-card ai-explanation-section">
                                {debugResult.aiExplanation && (
                                    <>
                                        <h3 className="card-title">AI Explanation:</h3>
                                        <p className="card-text">{debugResult.aiExplanation}</p>
                                    </>
                                )}
                                {debugResult.aiSuggestion && (
                                    <>
                                        <h3 className="card-title">AI Suggestion:</h3>
                                        <p className="card-text">{debugResult.aiSuggestion}</p>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Linter/Compiler Identified Issues List */}
                        {debugResult.analysis && debugResult.analysis[0] && debugResult.analysis[0].messages.length > 0 ? (
                            <div className="result-card issues-list">
                                <h3 className="card-title">Identified Issues:</h3>
                                <ul className="issues-list-ul">
                                    {debugResult.analysis[0].messages.map((msg, msgIndex) => (
                                        <li key={msgIndex} className={`issue-item ${msg.severity}`}>
                                            <span className="issue-severity">[{msg.severity ? msg.severity.toUpperCase() : 'ISSUE'}]</span>
                                            <span className="issue-location">Line {msg.line}, Col {msg.column}:</span>
                                            <span className="issue-message">{msg.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            (!debugResult.aiFixedCode || debugResult.aiFixedCode === code) && (
                                <div className="result-card no-issues-found">
                                    <h3 className="card-title">No Issues Found</h3>
                                    <p className="card-text">Your code looks clean. Good job!</p>
                                </div>
                            )
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}

export default App;