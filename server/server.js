require('dotenv').config();

const express = require('express');
const cors = require('cors'); // For cross-origin requests
const fileUpload = require('express-fileupload'); // For file uploads
// const mongoose = require('mongoose'); // Agar MongoDB use kar rahe ho

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies
app.use(fileUpload()); // Enable file upload

// Import routes
const debugRoutes = require('./routes/debug');
// const authRoutes = require('./routes/auth'); // Agar user authentication hai

// Use routes
app.use('/api/debug', debugRoutes);
// app.use('/api/auth', authRoutes);

// Basic route
app.get('/', (req, res) => {
    res.send('Code Debugger Backend is running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// // MongoDB Connection (Optional, agar data store karna hai)
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// })
// .then(() => console.log('MongoDB connected'))
// .catch(err => console.error(err));