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

The API uses JWT (JSON Web Tokens) with a refresh token system for session management. Here's how it works:

1. When a user logs in, they receive:
   - Access token (valid for 7 days)
   - Refresh token (valid for 365 days)
2. For all authenticated requests, include the access token in the Authorization header
3. When the access token expires:
   - Use the refresh token to get a new access token
   - User stays logged in without needing to re-enter credentials
4. The session is invalidated when:
   - The user logs out
   - The refresh token expires (after 365 days)
   - The tokens are invalid or tampered with

### Authentication Flow

1. **Login**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "username": "johndoe",
    "password": "securepassword"
  }'
```
Response:
```json
{
  "success": true,
  "authenticated": true,
  "message": "Authentication successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

2. **Refresh Access Token**:
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "refreshToken": "your_refresh_token"
  }'
```
Response:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

3. **Making Authenticated Requests**:
```bash
curl http://localhost:3000/user/change/email \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -H "Authorization: Bearer your_access_token" \
  -d '{
    "username": "johndoe",
    "newEmail": "newemail@example.com",
    "password": "securepassword"
  }'
```

4. **Check Session Status**:
```bash
curl http://localhost:3000/auth/check \
  -H "x-api-key: your_api_key" \
  -H "Authorization: Bearer your_access_token"
```

5. **Logout**:
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "x-api-key: your_api_key" \
  -H "Authorization: Bearer your_access_token"
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