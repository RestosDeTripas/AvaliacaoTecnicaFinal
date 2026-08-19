const express = require('express');
const dotenv = require('dotenv');
const app = express();
const routes = require('./routes/index');

// Load environment variables from .env file
dotenv.config();

// Middleware
app.use(express.json());

// Routes
app.use('/api', routes());

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});