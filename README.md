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

# Admin Account (for initial setup)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
```

### Environment Variables Explained

- **Database Configuration**:
  - `DB_PATH`: Path to your SQLite database file
    - Example: `/Users/username/project/database.db`
    - Make sure the directory exists and is writable

- **API Security**:
  - `API_KEY`: Secret key for API authentication
    - Should be a long, random string
    - Used to protect all API endpoints
    - Example: `a1b2c3d4e5f6g7h8i9j0...`
  - `JWT_SECRET`: Secret key for signing JWT tokens
    - Should be a long, random string
    - Used to sign and verify authentication tokens
    - Example: `x1y2z3a4b5c6d7e8f9g0...`

- **Server Configuration**:
  - `PORT`: Port on which the server will run
    - Default: `3000`
    - Make sure the port is available
  - `HOST`: Hostname for the server
    - Default: `localhost`
    - For production, set to your domain

- **Security Settings**:
  - `SALT`: Number of salt rounds for password hashing
    - Recommended: `10`
    - Higher values increase security but impact performance

- **Admin Account**:
  - `ADMIN_USERNAME`: Username for the admin account
    - Default: `admin`
    - Change this in production
  - `ADMIN_PASSWORD`: Password for the admin account
    - Default: `admin`
    - **IMPORTANT**: Change this immediately after first login

### Security Warnings

1. **Never use default values in production**:
   - Change all default passwords
   - Use strong, random values for `API_KEY` and `JWT_SECRET`
   - Consider using a password manager to generate secure values

2. **Environment Variables**:
   - Keep your `.env` file secure and never commit it to version control
   - Add `.env` to your `.gitignore` file
   - Use different values for development and production

3. **Database Security**:
   - Ensure the database file has proper permissions
   - Regularly backup your database
   - Consider using a more robust database in production

4. **Admin Account**:
   - Change the default admin credentials immediately after setup
   - Use a strong password
   - Consider implementing additional security measures for admin access

### Example Secure Configuration

Here's an example of secure values (DO NOT USE THESE - generate your own):

```
DB_PATH=/var/lib/trackit/production.db
API_KEY=8f7d3b2a1c9e6f4a5b2c8d7e3f1a9b6c
JWT_SECRET=9e8f7d6c5b4a3f2e1d0c9b8a7f6e5d4c
PORT=3000
HOST=api.yourdomain.com
SALT=10
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
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

The API uses JWT (JSON Web Tokens) with a self-refreshing token system for session management. Here's how it works:

1. When a user logs in, they receive:
   - Access token (valid for 7 days)
   - Refresh token (valid for 365 days)
2. For all authenticated requests, include the access token in the Authorization header
3. When the access token expires:
   - Use the refresh token to get new tokens
   - Both access token and refresh token are refreshed
   - New access token is valid for 7 days
   - New refresh token is valid for 365 days
   - User stays logged in without needing to re-enter credentials
4. The session is invalidated when:
   - The user logs out
   - The tokens are invalid or tampered with
   - The session is explicitly revoked

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
    "refreshToken": "your_refresh_token"
  }
  ```
- **Success Response**: 
  ```json
  {
    "success": true,
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "new_refresh_token..."
  }
  ```

4. **Making Authenticated Requests**:
- **Headers Required**:
  - `x-api-key: your_api_key`
  - `Authorization: Bearer your_access_token`

5. **Check Session Status**:
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
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
  ```

6. **Logout**:
- **URL**: `/auth/logout`
- **Method**: POST
- **Headers**: 
  - `x-api-key: your_api_key`
  - `Authorization: Bearer your_access_token`
- **Success Response**: 
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### Client Implementation

For the best user experience, implement the following in your client application:

1. Store both tokens securely (e.g., in secure storage or encrypted cookies)
2. Use the access token for all API requests
3. When you get a 401 error (expired token):
   - Use the refresh token to get a new access token
   - Retry the original request with the new access token
4. If the refresh token request fails:
   - Redirect to login screen
5. On logout:
   - Call the logout endpoint
   - Clear stored tokens
   - Redirect to login screen

## Replit
- pull updates `git pull origin main`