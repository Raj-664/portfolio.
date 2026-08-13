# Emamuddin Mallick — Portfolio

A personal portfolio for **Emamuddin Mallick**, Python Developer — Backend & Software Developer.

- **Frontend:** HTML + CSS + JavaScript (no build step, deployable straight to Netlify)
- **Backend:** Python + Flask
- **Database:** MySQL / TiDB (or SQLite fallback, zero-config for local dev)
- **Admin panel:** private `/admin` area to manage projects & certificates
- **Contact form:** POST `/api/contact` saves messages to the database

## Project structure

```
.
├── frontend/                 # Static site (HTML/CSS/JS) — deploy to Netlify
│   ├── index.html            # Public portfolio (single page)
│   ├── admin.html            # Admin dashboard (private)
│   ├── admin-login.html      # Admin login page
│   ├── css/
│   │   ├── style.css
│   │   └── admin.css
│   ├── js/
│   │   ├── main.js           # Public site logic
│   │   └── admin.js          # Admin panel logic
│   └── assets/
│       └── resume.pdf        # Resume (replace with your own)
├── backend/                  # Flask API + static file server
│   ├── app.py
│   ├── requirements.txt
│   ├── .env.example
│   └── uploads/              # Uploaded project images / certificate files
└── start.sh                  # Local one-command start
```

## Run locally

```bash
# Install backend dependencies
pip install -r backend/requirements.txt

# Start the server (serves API + frontend)
bash start.sh
# or: python backend/app.py
```

Open http://localhost:5000.

### Admin credentials

On the first run the backend seeds an admin account:

- `ADMIN_USERNAME` (default `admin`)
- `ADMIN_PASSWORD` — set it in your environment, or one is generated and
  printed to the console the first time the server starts.

Log in at **`/admin/login`** and change the password from the **Account** tab.

The admin panel is **not** linked anywhere on the public site and every admin
API call requires an authenticated session.

## Use MySQL / TiDB

Copy `backend/.env.example` to `.env` (or export the variables) with your
database credentials, then start the app. The app auto-creates the
`projects`, `certificates`, `admin` and `messages` tables on first use.

## Deploy

- **Frontend:** deploy the `frontend/` folder to Netlify.
- **Backend:** host `backend/` on Render, Railway, or any Flask-compatible host
  (set `DB_*` variables to point at your MySQL/TiDB instance, and set
  `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `SECRET_KEY`).
- Update the API base in `frontend/js/main.js` / `frontend/js/admin.js`
  (`window.API_BASE`) to your backend URL if the frontend and backend are
  hosted separately.

## API

| Method | Endpoint                    | Auth  | Description                          |
|--------|-----------------------------|-------|--------------------------------------|
| GET    | `/api/health`               | -     | Health check, reports active DB engine |
| GET    | `/api/projects`             | -     | List public projects                 |
| GET    | `/api/projects/:id`         | -     | Single project                       |
| GET    | `/api/certificates`         | -     | List public certificates             |
| POST   | `/api/contact`              | -     | Save a contact message               |
| POST   | `/api/admin/login`          | -     | Log in (username + password)         |
| GET    | `/api/admin/me`             | Admin | Current session + CSRF token         |
| POST   | `/api/admin/logout`         | Admin | End session                          |
| POST   | `/api/admin/change-password`| Admin | Change admin password                |
| POST   | `/api/projects`             | Admin | Create project (multipart)           |
| PUT    | `/api/projects/:id`         | Admin | Update project                       |
| DELETE | `/api/projects/:id`         | Admin | Delete project                       |
| POST   | `/api/certificates`         | Admin | Create certificate (multipart)       |
| PUT    | `/api/certificates/:id`     | Admin | Update certificate                   |
| DELETE | `/api/certificates/:id`     | Admin | Delete certificate                   |

### Security notes

- Admin routes require a session cookie; state-changing requests also require
  the `X-CSRF-Token` header returned by `/api/admin/me`.
- Passwords are stored using Werkzeug's salted hashes — never plain text.
- Uploads are restricted by extension **and** magic-byte signature, capped at
  a 10 MB file size / 16 MB request size.
- Text inputs are trimmed and length-limited; URLs must be `http(s)://`.
- Admin credentials and the session secret come from environment variables —
  never hard-coded in the frontend.
