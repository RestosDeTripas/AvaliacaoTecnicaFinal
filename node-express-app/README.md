# Node.js Express Application

This project is a basic Node.js application using Express, structured with separate backend and frontend directories. It includes environment variable management and a basic setup for development.

## Project Structure

```
node-express-app
├── backend
│   ├── src
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config
│   │   │   └── env.js
│   │   └── routes
│   │       └── index.js
│   └── package.json
├── frontend
│   ├── src
│   │   └── index.html
│   └── package.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node package manager)

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   ```

2. Navigate to the backend directory and install dependencies:

   ```
   cd backend
   npm install
   ```

3. Navigate to the frontend directory and install dependencies:

   ```
   cd ../frontend
   npm install
   ```

### Environment Variables

Create a `.env` file in the `backend` directory based on the `.env.example` file. Set the required environment variables, for example:

```
PORT=5000
```

### Running the Application

To start the backend server, navigate to the `backend` directory and run:

```
npm run dev
```

This will start the server on the port defined in your `.env` file (default is 5000).

### Frontend

The frontend is currently a placeholder. You can expand it by adding your HTML, CSS, and JavaScript files in the `frontend/src` directory.

### API Endpoints

- `GET /api/health`: Returns a simple health check response.

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Acknowledgments

- Express.js for the web framework.
- dotenv for environment variable management.