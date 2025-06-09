# TrackIt Backend

A comprehensive REST API for user management, authentication, and metric tracking with admin dashboard.

## Prerequisites

- Node.js (v14 or later)
- npm
- PostgreSQL
- lm-sensors (for hardware monitoring on Linux)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/apptrackit/trackit-backend
cd trackit-backend
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgres://username:password@localhost:5432/database_name

# API Security
API_KEY=your_secure_api_key_here
JWT_SECRET=your_secure_jwt_secret_here

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Security Settings
SALT=10  # Number of salt rounds for password hashing

# Admin Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
ADMIN_API_KEY=your_admin_api_key_here

# Environment
NODE_ENV=development
```

## Project Structure

```
trackit-backend/
│
├── app.js                    # Main application entry point
├── auth.js                   # Authentication middleware
├── database.js               # Database connection and setup
│
├── controllers/              # Business logic
│   ├── authController.js     # Authentication logic
│   ├── userController.js     # User management logic
│   ├── adminController.js    # Admin operations
│   └── metricController.js   # Metric tracking logic
│
├── routes/                   # API route definitions
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── admin.js             # Admin routes
│   └── metrics.js           # Metric tracking routes
│
├── utils/                    # Utility modules
│   └── logger.js            # Winston logging configuration
│
└── public/                  # Static files and admin dashboard
    ├── index.html           # Admin login page
    ├── admin-dashboard.html # Admin dashboard
    ├── css/
    │   ├── index.css        # Login page styles
    │   └── admin-dashboard.css # Dashboard styles
    └── scripts/
        ├── index.js         # Login page logic
        └── admin-dashboard.js # Dashboard logic
```

## Logging

The application uses Winston for comprehensive logging:

- **Console Output**: Colorized, timestamped logs for development
- **File Logging**: 
  - `logs/error.log` - Error level logs only
  - `logs/combined.log` - All log levels
- **Log Format**: Structured JSON with timestamps and service tags
- **Log Levels**: error, warn, info, debug

Log files are automatically created in the `logs/` directory.

## Database

The application uses PostgreSQL with the following tables:

### Users Table
- `id`: Serial primary key
- `username`: Unique username (TEXT)
- `email`: User's email (TEXT)
- `password`: Hashed password (TEXT)
- `created_at`: Account creation timestamp (TIMESTAMP)

### Sessions Table
- `id`: Serial primary key
- `user_id`: Reference to users table (INTEGER)
- `device_id`: Unique device identifier (TEXT)
- `access_token`: JWT access token (TEXT)
- `refresh_token`: Refresh token (TEXT)
- `access_token_expires_at`: Access token expiration (TIMESTAMP)
- `refresh_token_expires_at`: Refresh token expiration (TIMESTAMP)
- `created_at`: Session creation timestamp (TIMESTAMP)
- `last_refresh_at`: Last token refresh timestamp (TIMESTAMP)
- `last_check_at`: Last session check timestamp (TIMESTAMP)
- `refresh_count`: Number of token refreshes (INTEGER)

### Admin Sessions Table
- `id`: Serial primary key
- `token`: Bearer token for admin authentication (TEXT)
- `username`: Admin username (TEXT)
- `created_at`: Session creation timestamp (TIMESTAMP)
- `expires_at`: Token expiration timestamp (TIMESTAMP)

### Metric Types Table
- `id`: Serial primary key
- `name`: Name of the metric type (VARCHAR, UNIQUE)
- `unit`: Unit for this type (VARCHAR)
- `icon_name`: Icon name for this type (VARCHAR)
- `is_default`: Indicates if it's a system-defined default type (BOOLEAN)
- `user_id`: Reference to user who created custom type (INTEGER, nullable)
- `category`: Category of the metric type (VARCHAR)

### Metric Entries Table
- `id`: Serial primary key
- `user_id`: Reference to users table (INTEGER)
- `metric_type_id`: Reference to metric_types table (INTEGER)
- `value`: Metric value (BIGINT)
- `date`: Date of the metric entry (DATE)
- `is_apple_health`: Is from Apple Health (BOOLEAN)

**Default Metric Types**: The system automatically seeds 12 default body measurement metric types (Weight, Height, Body Fat, Waist, Bicep, Chest, Thigh, Shoulder, Glutes, Calf, Neck, Forearm).

## Database Setup

1. Install PostgreSQL on your system
2. Create a database:
```sql
CREATE DATABASE trackitdb;
```

3. Create a user (optional):
```sql
CREATE USER dev WITH PASSWORD 'dev';
GRANT ALL PRIVILEGES ON DATABASE trackitdb TO dev;
```

4. Update your `.env` file with the correct DATABASE_URL

The database tables and default data are automatically created when the application starts.

## Running the Server

Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

## Admin Dashboard

Access the admin dashboard at `http://localhost:3000/` with your admin credentials.

**Features:**
- User management (create, edit, delete users)
- Real-time hardware monitoring (CPU temperature, fan speed, uptime)
- User activity statistics with customizable timeframes
- Active session management
- Search and sort functionality
- Responsive design for mobile and desktop

## Authentication System

The system uses multiple authentication mechanisms:

### User Authentication
- **JWT Tokens**: Short-lived access tokens (7 days) for API access
- **Refresh Tokens**: Long-lived tokens (365 days) for token renewal
- **Device-based Sessions**: Each device gets a unique session
- **Session Limits**: Maximum 5 concurrent sessions per user

### Admin Authentication
- **Bearer Tokens**: Secure admin session tokens (1 hour expiration)
- **Auto-cleanup**: Expired tokens are automatically removed
- **Session Validation**: Token validation endpoint for dashboard

### API Key Protection
All endpoints require API key validation via:
- Header: `x-api-key: your_api_key`
- Admin endpoints require separate admin API key

## API Endpoints

### Authentication Routes (`/auth`)

#### User Login
- **POST** `/auth/login`
- **Body**: `{ "username": "user", "password": "pass" }`
- **Returns**: Access token, refresh token, user info

#### Token Refresh
- **POST** `/auth/refresh`
- **Headers**: `x-api-key`
- **Body**: `{ "refreshToken": "token", "deviceId": "id" }`
- **Returns**: New access and refresh tokens

#### Session Check
- **GET** `/auth/check`
- **Headers**: `x-api-key`, `Authorization: Bearer token`
- **Returns**: Session validity and user info

#### Logout
- **POST** `/auth/logout`
- **Headers**: `x-api-key`
- **Body**: `{ "deviceId": "id", "userId": "id" }`

#### Logout All Devices
- **POST** `/auth/logout-all`
- **Headers**: `x-api-key`
- **Body**: `{ "userId": "id" }`

#### List Active Sessions
- **POST** `/auth/sessions`
- **Headers**: `x-api-key`
- **Body**: `{ "userId": "id" }`
- **Returns**: Array of active sessions with device info

### User Management Routes (`/user`)

#### Register New User
- **POST** `/user/register`
- **Body**: `{ "username": "user", "email": "email", "password": "pass" }`
- **Returns**: User info and authentication tokens

#### Change Password
- **POST** `/user/change/password`
- **Headers**: `x-api-key`
- **Body**: `{ "username": "user", "oldPassword": "old", "newPassword": "new" }`

#### Change Username
- **POST** `/user/change/username`
- **Headers**: `x-api-key`
- **Body**: `{ "oldUsername": "old", "newUsername": "new", "password": "pass" }`

#### Change Email
- **POST** `/user/change/email`
- **Headers**: `x-api-key`
- **Body**: `{ "username": "user", "newEmail": "email", "password": "pass" }`

#### Delete Account
- **POST** `/user/delete`
- **Headers**: `x-api-key`
- **Body**: `{ "username": "user", "password": "pass" }`

### Metric Management Routes (`/api/metrics`)

All metric endpoints require: `x-api-key` header and `Authorization: Bearer token`

#### Create Metric Entry
- **POST** `/api/metrics`
- **Body**: `{ "metric_type_id": 1, "value": 75, "date": "2024-03-25", "is_apple_health": false }`
- **Returns**: Entry ID and success message

#### Update Metric Entry
- **PUT** `/api/metrics/:entryId`
- **Body**: `{ "value": 76, "date": "2024-03-26" }` (partial updates allowed)

#### Delete Metric Entry
- **DELETE** `/api/metrics/:entryId`

### Admin Routes (`/admin`)

#### Admin Login
- **POST** `/admin/login`
- **Body**: `{ "username": "admin", "password": "admin" }`
- **Returns**: Bearer token, admin API key, regular API key

#### Token Validation
- **POST** `/admin/validate-token`
- **Headers**: `Authorization: Bearer admin_token`

#### Admin Logout
- **POST** `/admin/logout`
- **Headers**: `Authorization: Bearer admin_token`

All other admin endpoints require: `Authorization: Bearer admin_token`

#### User Management
- **GET** `/admin/getAllUserData` - Get all users
- **POST** `/admin/user` - Get specific user info
- **POST** `/admin/updateUser` - Update user data
- **POST** `/admin/deleteUser` - Delete user
- **POST** `/admin/createUser` - Create new user
- **GET** `/admin/emails` - Get all user emails

#### Statistics
- **GET** `/admin/registrations?range=24h|week|month|year` - Registration stats
- **GET** `/admin/active-users?range=24h|week|month|year` - Active user stats

#### Hardware Monitoring
- **GET** `/admin/hardwareinfo` - Get server hardware stats
- **Returns**: CPU temperature, fan speed, uptime with color coding

#### Legacy Endpoint (Deprecated)
- **POST** `/admin/check` - Legacy admin credentials check (use login instead)

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (missing/invalid data)
- `401`: Unauthorized (invalid/missing token/API key)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `500`: Internal Server Error

## Hardware Monitoring

The admin dashboard includes real-time hardware monitoring requiring `lm-sensors`:

```bash
# Install on Ubuntu/Debian
sudo apt-get install lm-sensors

# Configure sensors
sudo sensors-detect
```

**Monitored Metrics:**
- **CPU Temperature**: Color-coded (Red: >70°C, Green: 40-70°C, Blue: <40°C)
- **Fan Speed**: Color-coded (Red: >3000 RPM, Green: 1500-3000 RPM, Blue: <1500 RPM)
- **System Uptime**: Formatted display (days, hours, minutes)

## Security Features

1. **Password Hashing**: bcrypt with configurable salt rounds
2. **JWT Security**: Signed tokens with expiration
3. **API Key Validation**: Required for all endpoints
4. **Session Management**: Device-based tracking with limits
5. **Admin Token Expiration**: 1-hour admin sessions with auto-cleanup
6. **Input Validation**: Email format, required fields
7. **SQL Injection Protection**: Parameterized queries
8. **CORS Protection**: Configurable origin restrictions

## Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Environment Variables
The application requires all environment variables to be set in `.env`. Missing variables will prevent startup.

### Database Migrations
Database schema updates are handled automatically on application startup. New tables and default data are created as needed.

### Logging Configuration
Customize logging in `utils/logger.js`:
- Adjust log levels
- Modify output formats
- Change file destinations
- Configure rotation policies

## Deployment Considerations

1. **Environment Variables**: Secure storage of secrets
2. **Database**: PostgreSQL with proper connection pooling
3. **Logging**: Persistent log storage and rotation
4. **Hardware Monitoring**: Ensure lm-sensors is installed and configured
5. **HTTPS**: Use reverse proxy (nginx/Apache) for SSL termination
6. **Process Management**: Use PM2 or similar for process management

## Client Implementation Guide

### Token Management
1. Store tokens securely (keychain/secure storage)
2. Include API key in all requests
3. Handle token refresh automatically on 401 errors
4. Implement proper logout flow

### Session Management
1. Track current device ID
2. Implement session list UI
3. Allow users to manage active sessions
4. Handle session limits gracefully

### Error Handling
1. Parse error responses consistently
2. Show user-friendly error messages
3. Handle network connectivity issues
4. Implement retry logic for failed requests

## Contributing

1. Follow existing code style and structure
2. Add logging for new features
3. Update API documentation for new endpoints
4. Test database operations thoroughly
5. Ensure proper error handling

## License

ISC License - see package.json for details.