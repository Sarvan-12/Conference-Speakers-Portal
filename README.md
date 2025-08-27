# Summit Hub

Summit Hub is a conference management portal for organizing speakers, sessions, halls, and file uploads for events. It features an admin panel, speaker dashboard, and a public website for attendees.

---

## Features

- **Admin Panel:** Manage speakers, sessions, halls, schedules, and uploaded files.
- **Speaker Dashboard:** View your sessions, upload and manage presentation files.
- **Public Website:** Browse halls, sessions, and speakers.
- **File Uploads:** Secure upload and management of presentation files.
- **Responsive Design:** Works well on desktop and mobile devices.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Frontend:** HTML, CSS, JavaScript

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/summit-hub.git
cd summit-hub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
PORT=3000
```

### 4. Set up the database

- Create a MySQL database.
- Import the schema from `schema.sql` (if provided) or create tables as needed.

### 5. Run the server

```bash
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Deployment

- Use platforms like **Render**, **Railway**, **Heroku**, or your own VPS.
- Do **not** commit your `.env` or actual database files to GitHub.
- For production, use secure environment variables and a managed MySQL database.

---

## Folder Structure

```
/public           # Frontend HTML, CSS, JS
/uploads          # Uploaded presentation files (gitignored)
/database         # (Optional) Database scripts (gitignored)
server.js         # Main backend server
.env.example      # Example environment variables
```

---

## Security Notes

- Never commit your real `.env` or database files.
- Uploaded files are stored in `/uploads` (which is gitignored).
- Use strong passwords for admin accounts.

---

## License

MIT

---
