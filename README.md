# CloudBook

Welcome to CloudBook, your personal cloud-based note-taking application! CloudBook is developed using the MERN stack (MongoDB, Express.js, React.js, Node.js) with basic Bootstrap for styling. This README will guide you through the setup process and provide an overview of the project structure and functionalities.

## Features

- **User Authentication**: Users can sign up and log in securely to access their notes.
- **Note Management**: Users can add, view, update, and delete their notes.
- **Seamless Navigation**: React Router DOM is utilized for smooth transitions between pages, preventing unnecessary reloading.

## Technologies Used

- **Frontend**: React.js, Bootstrap
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose)
- **Other**: React Router DOM

## Setup

Follow these steps to set up CloudBook locally:

1. Clone the repository: `git clone <repository-url>`
2. Navigate to the project directory: `cd CloudBook`
3. Install dependencies:
   - For the backend, navigate to the `backend` directory and run `npm install`.
   - For the frontend, navigate to the `frontend` directory and run `npm install`.
4. Set up environment variables:
   - Create a `.env` file in the `backend` directory.
   - Define the following variables:
     ```
     MONGO_URI=<your-mongodb-uri>
     JWT_SECRET=<your-jwt-secret>
     ```
5. Start the backend server:
   - In the `backend` directory, run `npm start`.
6. Start the frontend:
   - In the `frontend` directory, run `npm start`.
7. Access CloudBook in your browser at `http://localhost:3000`.

## API Endpoints

### Authentication
- **POST /api/auth/signup**: Create a new user.
- **POST /api/auth/login**: Log in with existing credentials.

### Notes
- **GET /api/notes**: Fetch all notes of the authenticated user.
- **POST /api/notes/addnote: Add a new note.
- **DELETE /api/notes/deletenote/:id**: Delete a note by ID.
- **PUT /api/notes/updatenote/:id**: Update an existing note by ID.

## Database Schema

CloudBook utilizes a MongoDB database with the following schema:

```javascript
const NoteSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
```

## Contributors

-   Mukul Negi



Feel free to contribute, report issues, or suggest improvements. Happy note-taking with CloudBook! 📝🌥️
