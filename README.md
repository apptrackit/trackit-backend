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
npm install
```
This will install all dependencies listed in `package.json`.

## Configuration

Create a `.env` file in the root directory with the following variables:

```
DB_PATH=/path/to/your/database.db
API_KEY=your_secret_api_key
PORT=3000
SALT=10
HOST=localhost
JWT_SECRET=your_jwt_secret_key
```

- `DB_PATH`: Path to your SQLite database file
- `API_KEY`: Secret key for API authentication
- `PORT`: Port on which the server will run
- `SALT`: Number of salt rounds for password hashing (recommended: 10)
- `HOST`: Hostname for the server
- `JWT_SECRET`: Secret key for signing JWT tokens (should be a long, random string)

## Project Structure

The application follows a modular structure:
```
trackit-backend/
│
├── app.js                 # Main application entry point
├── auth.js                # Authentication middleware
├── database.js            # Database connection and setup
│
├── controllers/           # Business logic
│   ├── authController.js  # Authentication logic
│   ├── userController.js  # User management logic
│   └── adminController.js # Admin operations
│
└── routes/                # API route definitions
    ├── auth.js            # Authentication routes
    ├── users.js           # User management routes
    └── admin.js           # Admin routes
```

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
node app.js
```

The server will run on the port specified in your `.env` file (default: 3000).

## API Authentication

All endpoints require authentication via an API key. You can provide it in two ways:

1. As a header: `x-api-key: your_api_key`
2. As a query parameter: `?apiKey=your_api_key`

For authenticated user endpoints, you also need to provide a JWT token in the Authorization header:
`Authorization: Bearer your_jwt_token`

## API Endpoints

### Authentication

#### User Login

- **URL**: `/auth/login`
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
    "message": "Authentication successful",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
  ```

#### Check Session Status

- **URL**: `/auth/check`
- **Method**: GET
- **Headers**: 
  - `Authorization: Bearer your_jwt_token`
- **Success Response**: 
  ```json
  {
    "success": true,
    "isAuthenticated": true,
    "message": "Session is valid",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
  ```
- **Expired/Invalid Session Response**:
  ```json
  {
    "success": false,
    "isAuthenticated": false,
    "message": "Session expired or invalid"
  }
  ```

#### Logout

- **URL**: `/auth/logout`
- **Method**: POST
- **Headers**: 
  - `Authorization: Bearer your_jwt_token`
- **Success Response**: 
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### User Management

#### Register a New User

- **URL**: `/user/register`
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

#### Change Password

- **URL**: `/user/change/password`
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

#### Change Username

- **URL**: `/user/change/username`
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

#### Change Email

- **URL**: `/user/change/email`
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

#### Delete Account

- **URL**: `/user/delete`
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

### Admin Operations

#### Admin User Lookup

- **URL**: `/admin/user`
- **Method**: POST
- **Body**:
  ```json
  {
    "username": "johndoe"
  }
  ```
- **Success Response**: 
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "password": "[hashed password]"
  }
  ```

#### Get All Emails

- **URL**: `/admin/emails`
- **Method**: GET
- **Success Response**: 
  ```json
  {
    "success": true,
    "emails": ["user1@example.com", "user2@example.com"]
  }
  ```

## Session Management

The API uses JWT (JSON Web Tokens) for session management. Here's how it works:

1. When a user logs in, they receive a JWT token that's valid for 7 days
2. This token should be stored securely on the client (e.g., in localStorage or secure cookies)
3. For all authenticated requests, include the token in the Authorization header
4. The token is automatically invalidated when:
   - The user logs out
   - The token expires (after 7 days)
   - The token is invalid or tampered with

Example of making an authenticated request:
```bash
curl http://localhost:3000/user/change/email \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "username": "johndoe",
    "newEmail": "newemail@example.com",
    "password": "securepassword"
  }'
```

To check if a session is still valid (e.g., when app starts):
```bash
curl http://localhost:3000/auth/check \
  -H "x-api-key: your_api_key" \
  -H "Authorization: Bearer your_jwt_token"
```

## Replit
- pull updates `git pull origin main`