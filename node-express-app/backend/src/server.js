const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = require('./app');
const { PORT } = require('./config/env');

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});