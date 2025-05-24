# TrackIt Backend

A REST API for user management with authentication.

## Prerequisites

- Node.js (v14 or later)
- npm
- SQLite3

## Installation

1. Clone the repository:
```
git clone https://github.com/apptrackit/trackit-backend
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
# Database Configuration
DB_PATH=/path/to/your/database.db

# API Security
API_KEY=your_secure_api_key_here
JWT_SECRET=your_secure_jwt_secret_here

# Server Configuration
PORT=3000
HOST=localhost

# Security Settings
SALT=10  # Number of salt rounds for password hashing

# Admin Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
```


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

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token_expires_at TEXT NOT NULL,
  refresh_token_expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_refresh_at TEXT,
  refresh_count INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, device_id)
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

The JWT token contains the following information:
- `userId`: The ID of the authenticated user
- `username`: The username of the authenticated user
- `deviceId`: A unique identifier for the device/browser
- `iat`: Token issued at timestamp
- `exp`: Token expiration timestamp

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
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6...",
    "apiKey": "your_api_key_here",
    "deviceId": "unique_device_id",
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
    "authenticated": true,
    "message": "Registration successful",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6...",
    "apiKey": "your_api_key_here",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com"
    }
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

The system uses a combination of access tokens and refresh tokens for session management:

1. **Access Token**:
   - Short-lived (7 days)
   - Used for API authentication
   - Contains user and device information
   - Stored in the database with expiration time

2. **Refresh Token**:
   - Long-lived (365 days)
   - Used to obtain new access tokens
   - Stored in the database with expiration time

3. **Device Management**:
   - Each login creates a unique device ID based on user agent and IP
   - Maximum of 5 concurrent sessions per user
   - Sessions are tracked per device
   - Users can view and manage their active sessions

4. **Session Storage**:
   - Sessions are stored in the database with:
     - User ID
     - Device ID
     - Access token
     - Refresh token
     - Access token expiration
     - Refresh token expiration
     - Creation timestamp
     - Last refresh timestamp
     - Refresh count

### Authentication Flow

1. **Login**:
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
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6...",
    "apiKey": "your_api_key_here",
    "deviceId": "unique_device_id",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
  ```

2. **Register**:
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
    "authenticated": true,
    "message": "Registration successful",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6...",
    "apiKey": "your_api_key_here",
    "deviceId": "unique_device_id",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
  ```

3. **Refresh Tokens**:
- **URL**: `/auth/refresh`
- **Method**: POST
- **Body**:
  ```json
  {
    "refreshToken": "your_refresh_token",
    "deviceId": "your_device_id"
  }
  ```
- **Success Response**: 
  ```json
  {
    "success": true,
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "new_refresh_token...",
    "deviceId": "your_device_id"
  }
  ```

4. **Logout from Device**:
- **URL**: `/auth/logout`
- **Method**: POST
- **Headers**: 
  - `x-api-key: your_api_key`
  - `Authorization: Bearer your_access_token`
- **Body**:
  ```json
  {
    "deviceId": "your_device_id"
  }
  ```
- **Success Response**: 
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

5. **Logout from All Devices**:
- **URL**: `/auth/logout-all`
- **Method**: POST
- **Headers**: 
  - `x-api-key: your_api_key`
  - `Authorization: Bearer your_access_token`
- **Success Response**: 
  ```json
  {
    "success": true,
    "message": "Logged out from all devices successfully"
  }
  ```

6. **List Active Sessions**:
- **URL**: `/auth/sessions`
- **Method**: POST
- **Headers**: 
  - `x-api-key: your_api_key`
- **Body**:
  ```json
  {
    "userId": 123
  }
  ```
- **Description**: Lists all active sessions for a specific user. Only requires the API key and the user ID in the request body. This endpoint is useful for administrators or for viewing all sessions associated with a user account.
- **Success Response**: 
  ```json
  {
    "success": true,
    "sessions": [
      {
        "id": 1,
        "device_id": "unique_device_id",
        "created_at": "2024-03-20T10:00:00Z",
        "last_refresh_at": "2024-03-20T15:00:00Z",
        "refresh_count": 2
      }
    ]
  }
  ```

7. **Check Session Status**:
- **URL**: `/auth/check`
- **Method**: GET
- **Headers**: 
  - `x-api-key: your_api_key`
  - `Authorization: Bearer your_access_token`
- **Success Response**: 
  ```json
  {
    "success": true,
    "isAuthenticated": true,
    "message": "Session is valid",
    "deviceId": "your_device_id",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
  ```

### Client Implementation

For the best user experience, implement the following in your client application:

1. Store securely:
   - Access token
   - Refresh token
   - Device ID
   - API key

2. Use the access token for all API requests

3. When you get a 401 error (expired token):
   - Use the refresh token and device ID to get new tokens
   - Retry the original request with the new access token

4. If the refresh token request fails:
   - Redirect to login screen

5. On logout:
   - Call the logout endpoint with the device ID
   - Clear stored tokens
   - Redirect to login screen

6. Session Management:
   - Track the current device ID
   - Use it to identify the current session in the sessions list
   - Implement session management UI to view and control active sessions

## Replit
- pull updates `git pull origin main`