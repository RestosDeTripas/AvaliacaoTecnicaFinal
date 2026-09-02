const express = require('express');
const cors = require('cors');
const routes = require('./routes/index');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cors());

// Routes
app.use('/api', routes);

module.exports = app;