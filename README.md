# TrackIt Backend

A REST API for user management with authentication.

## Prerequisites

- Node.js (v14 or later)
- npm
- SQLite3

## Installation

1. Clone the repository:
```
git clone <repository-url>
cd trackit_backend
```

2. Install dependencies:
```
npm install express sqlite3 bcrypt dotenv
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
DB_PATH=/path/to/your/database.db
API_KEY=your_secret_api_key
PORT=3000
SALT=10
HOST=localhost
```

- `DB_PATH`: Path to your SQLite database file
- `API_KEY`: Secret key for API authentication
- `PORT`: Port on which the server will run
- `SALT`: Number of salt rounds for password hashing (recommended: 10)
- `HOST`: Hostname for the server

## Database Setup

The application expects a SQLite database with a `users` table. You can create it with:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL
);
```

## Running the Server

Start the server with:

```
npm run start
```

The server will run on the port specified in your `.env` file (default: 3000).

## API Authentication

All endpoints require authentication via an API key. You can provide it in two ways:

1. As a header: `x-api-key: your_api_key`
2. As a query parameter: `?apiKey=your_api_key`

## API Endpoints

### Documentation

- **URL**: `/`
- **Method**: GET
- **Description**: API documentation and usage information

### Register a New User

- **URL**: `/register`
- **Method**: POST
- **Body**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```
- **Success Response**: 
  ```json
  {
    "success": true,
    "id": 1
  }
  ```

### User Login

- **URL**: `/login`
- **Method**: POST
- **Body**:
  ```json
  {
    "username": "johndoe",
    "password": "securepassword"
  }
  ```
- **Success Response**: 
  ```json
  {
    "success": true,
    "authenticated": true,
    "message": "Authentication successful"
  }
  ```

### Change Password

- **URL**: `/change/password`
- **Method**: POST
- **Body**:
  ```json
  {
    "username": "johndoe",
    "oldPassword": "oldpassword",
    "newPassword": "newpassword"
  }
  ```
- **Success Response**: 
  ```json
  {
    "success": true,
    "message": "Password updated successfully"
  }
  ```

### Change Username

- **URL**: `/change/username`
- **Method**: POST
- **Body**:
  ```json
  {
    "oldUsername": "johndoe",
    "newUsername": "johndoe2",
    "password": "securepassword"
  }
  ```
- **Success Response**: 
  ```json
  {
    "success": true,
    "message": "Username updated successfully"
  }
  ```

### Change Email

- **URL**: `/change/email`
- **Method**: POST
- **Body**:
  ```json
  {
    "username": "johndoe",
    "newEmail": "newemail@example.com",
    "password": "securepassword"
  }
  ```
- **Success Response**: 
  ```json
  {
    "success": true,
    "message": "Email updated successfully"
  }
  ```

### Admin User Lookup

- **URL**: `/admin?username=johndoe`
- **Method**: GET
- **Success Response**: 
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "password": "[hashed password]"
  }
  ```

### Delete Account

- **URL**: `/delete/account`
- **Method**: POST
- **Body**:
  ```json
  {
    "username": "johndoe",
    "password": "securepassword"
  }
  ```
- **Success Response**: 
  ```json
  {
    "success": true,
    "message": "Account deleted successfully"
  }
  ```

### Get All Emails

- **URL**: `/getAllEmails`
- **Method**: GET
- **Authentication**: API key required
- **Success Response**: 
  ```json
  {
    "success": true,
    "emails": ["user1@example.com", "user2@example.com"]
  }
  ```

