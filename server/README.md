# Keep Notes Backend

A RESTful API for the KeepNotes application built with Node.js, Express, and MongoDB.

## Features

- **User Authentication**: Register, login, password management
- **Note Management**: CRUD operations for notes with categories and tags
- **Search & Filter**: Full-text search and filtering by category, status
- **User Management**: Profile management and account settings
- **Security**: JWT authentication, input validation, rate limiting
- **Database**: MongoDB with Mongoose ODM

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A strong secret key for JWT tokens
   - `CLIENT_URL`: Your frontend URL (for CORS)

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Run the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /register` - Register a new user
- `POST /login` - Login user
- `POST /forgot-password` - Request password reset

### Note Routes (`/api/notes`)

- `GET /` - Get user's notes (with pagination and filtering)
- `GET /stats` - Get user's note statistics
- `GET /:id` - Get specific note by ID
- `POST /` - Create new note
- `PUT /:id` - Update note
- `DELETE /:id` - Delete note
- `POST /:id/pin` - Toggle pin status
- `POST /:id/archive` - Toggle archive status

### User Routes (`/api/users`)

- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change user password
- `GET /dashboard` - Get dashboard data
- `DELETE /account` - Deactivate account

## Request/Response Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Create Note
```bash
POST /api/notes
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Meeting Notes",
  "content": "Important points from today's meeting...",
  "category": "work",
  "tags": ["meeting", "q1", "planning"]
}
```

### Get Notes with Filtering
```bash
GET /api/notes?category=work&isPinned=true&page=1&limit=10
Authorization: Bearer <jwt_token>
```

## Data Models

### User Model
```javascript
{
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Note Model
```javascript
{
  title: String (required, max: 200),
  content: String (required, max: 10000),
  category: String (enum: ['personal', 'work', 'creative', 'study']),
  tags: [String] (max: 10 tags),
  isPinned: Boolean (default: false),
  isArchived: Boolean (default: false),
  color: String (hex color),
  userId: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Input Validation**: express-validator for request validation
- **Rate Limiting**: Prevent abuse with rate limiting
- **CORS**: Configured for frontend integration
- **Helmet**: Security headers
- **MongoDB Injection Protection**: Mongoose sanitization

## Error Handling

The API uses consistent error response format:
```javascript
{
  "error": "Error Type",
  "message": "User-friendly error message",
  "errors": [] // Validation errors (if applicable)
}
```

## Environment Variables

```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/keepnotes
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=30d
CLIENT_URL=http://localhost:5173
```

## Development

### Running Tests
```bash
npm test
```

### Code Structure
```
server/
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── .env            # Environment variables
├── server.js       # Main server file
└── package.json    # Dependencies
```

### Adding New Features

1. Create/update models in `models/`
2. Add routes in `routes/`
3. Add middleware if needed in `middleware/`
4. Update validation rules
5. Test endpoints

## Deployment

### Production Setup

1. **Set environment variables**:
   - Use strong `JWT_SECRET`
   - Set `NODE_ENV=production`
   - Configure production MongoDB URI

2. **Security considerations**:
   - Use HTTPS in production
   - Set up proper CORS origins
   - Configure rate limiting based on your needs
   - Regular security updates

3. **Database**:
   - Use MongoDB Atlas or properly secured MongoDB instance
   - Set up database backups
   - Configure database indexes for performance

## API Testing

You can test the API using tools like:
- Postman
- Insomnia
- curl
- Your frontend application

Example curl commands:
```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"TestPass123"}'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
