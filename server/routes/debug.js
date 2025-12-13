// server/routes/debug.js

const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugcontroller'); // Ye line zaroori hai

// Route for debugging pasted code or uploaded file
router.post('/', debugController.debugCode);

// Optional: Route for OCR (image to text) - agar ye feature chahiye
router.post('/ocr', debugController.processImageForCode);

module.exports = router;