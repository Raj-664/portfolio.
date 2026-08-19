"""
Emamuddin Mallick — Portfolio backend
Flask app that serves the frontend, exposes public read APIs for projects
and certificates, and a private, authenticated admin API (project /
certificate CRUD + file uploads).

Storage: uses MySQL/TiDB when DB_* environment variables are set,
otherwise falls back to SQLite automatically (zero-config for local dev).

Admin credentials come from ADMIN_USERNAME / ADMIN_PASSWORD env vars.
If ADMIN_PASSWORD is not set, a random password is generated and printed
to the console on first startup.
"""

import os
import re
import secrets
import sqlite3
from datetime import datetime
from functools import wraps
from flask_cors import CORS

from flask import (
    Flask,
    abort,
    jsonify,
    redirect,
    request,
    send_from_directory,
    session,
)
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import safe_join, secure_filename

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
UPLOAD_DIR = os.path.join(BASE_DIR, "backend", "uploads")

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB per file

ALLOWED_IMAGE_EXTS = {"png", "jpg", "jpeg", "gif", "webp", "svg"}
ALLOWED_CERT_EXTS = {"pdf"} | ALLOWED_IMAGE_EXTS

app = Flask(__name__, static_folder=None)
CORS(app, origins=[
    "https://raj-664.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500"
])
app.config["JSON_AS_ASCII"] = False
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB request cap
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# ------------------------------------------------------------------
# Database helpers
# ------------------------------------------------------------------

def _get_db_path():
    data_dir = os.path.join(BASE_DIR, "backend", "data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "portfolio.db")


def _mysql_conn():
    import pymysql
    return pymysql.connect(
        host=os.environ.get("DB_HOST", "127.0.0.1"),
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", ""),
        database=os.environ.get("DB_NAME", "portfolio"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def _is_mysql_configured():
    return all(os.environ.get(k) for k in ("DB_HOST", "DB_USER", "DB_NAME"))


def _connect():
    if _is_mysql_configured():
        return _mysql_conn()
    conn = sqlite3.connect(_get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def _placeholder():
    return "%s" if _is_mysql_configured() else "?"


def _now():
    return datetime.utcnow().isoformat()


def _create_tables(conn):
    if _is_mysql_configured():
        statements = [
            "CREATE TABLE IF NOT EXISTS admin ("
            " id INT AUTO_INCREMENT PRIMARY KEY,"
            " username VARCHAR(80) UNIQUE NOT NULL,"
            " password_hash VARCHAR(255) NOT NULL,"
            " created_at VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS projects ("
            " id INT AUTO_INCREMENT PRIMARY KEY,"
            " title VARCHAR(160) NOT NULL,"
            " description TEXT,"
            " technologies TEXT,"
            " category VARCHAR(80),"
            " github_url VARCHAR(500),"
            " demo_url VARCHAR(500),"
            " image_url VARCHAR(500),"
            " created_at VARCHAR(40) NOT NULL,"
            " updated_at VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS certificates ("
            " id INT AUTO_INCREMENT PRIMARY KEY,"
            " title VARCHAR(200) NOT NULL,"
            " organization VARCHAR(200),"
            " date VARCHAR(80),"
            " file_url VARCHAR(500) NOT NULL,"
            " file_type VARCHAR(20),"
            " created_at VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS messages ("
            " id INT AUTO_INCREMENT PRIMARY KEY,"
            " name VARCHAR(80) NOT NULL,"
            " email VARCHAR(160) NOT NULL,"
            " subject VARCHAR(160) NOT NULL,"
            " message TEXT NOT NULL,"
            " created_at VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        ]
        for stmt in statements:
            conn.cursor().execute(stmt)
        conn.commit()
    else:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS admin (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                technologies TEXT DEFAULT '',
                category TEXT DEFAULT '',
                github_url TEXT DEFAULT '',
                demo_url TEXT DEFAULT '',
                image_url TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS certificates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                organization TEXT DEFAULT '',
                date TEXT DEFAULT '',
                file_url TEXT NOT NULL,
                file_type TEXT DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        conn.commit()


# ------------------------------------------------------------------
# Seed data (first run only)
# ------------------------------------------------------------------

def _ensure_admin(conn):
    username = (os.environ.get("ADMIN_USERNAME") or "admin").strip()
    password = os.environ.get("ADMIN_PASSWORD")
    ph = _placeholder()
    cur = conn.cursor()
    cur.execute("SELECT * FROM admin ORDER BY id ASC LIMIT 1")
    row = cur.fetchone()

    if row is None:
        # First run: create the admin account.
        password = password or secrets.token_urlsafe(12)
        cur.execute(
            f"INSERT INTO admin (username, password_hash, created_at) "
            f"VALUES ({ph}, {ph}, {ph})",
            (username, generate_password_hash(password), _now()),
        )
        conn.commit()
        if not os.environ.get("ADMIN_PASSWORD"):
            print("=" * 64)
            print("PORTFOLIO ADMIN CREDENTIALS (generated, change them soon):")
            print(f"  login URL : /admin/login")
            print(f"  username  : {username}")
            print(f"  password  : {password}")
            print("Set ADMIN_USERNAME / ADMIN_PASSWORD env vars to choose your own.")
            print("=" * 64)
    elif password:
        # ADMIN_PASSWORD is set explicitly: apply it to the existing account.
        cur.execute(
            "UPDATE admin SET username=?, password_hash=? WHERE id=?" if not _is_mysql_configured()
            else "UPDATE admin SET username=%s, password_hash=%s WHERE id=%s",
            (username, generate_password_hash(password), row["id"]),
        )
        conn.commit()
        print(f"Admin credentials applied from environment (username: {username}).")


_SEED_PROJECTS = [
    {
        "title": "AI Resume Analyzer",
        "description": (
            "A smart tool that parses resumes and uses AI to score, summarize and "
            "suggest improvements, making job applications faster and smarter."
        ),
        "technologies": "Python,NLP,AI,Flask",
        "category": "AI",
        "github_url": "https://github.com/Raj-664",
        "demo_url": "",
        "image_url": "",
    },
    {
        "title": "Online Examination System",
        "description": (
            "A complete platform for creating and taking exams online — with timed "
            "quizzes, instant results and a clean admin dashboard."
        ),
        "technologies": "Flask,MySQL,JavaScript",
        "category": "Web App",
        "github_url": "https://github.com/Raj-664",
        "demo_url": "",
        "image_url": "",
    },
    {
        "title": "Landmark Visuals",
        "description": (
            "A visually rich showcase of famous landmarks with smooth galleries, "
            "interactive cards and a responsive, mobile-first design."
        ),
        "technologies": "HTML,CSS,JavaScript",
        "category": "Web Design",
        "github_url": "https://github.com/Raj-664",
        "demo_url": "",
        "image_url": "",
    },
]


def _seed_projects(conn):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS c FROM projects")
    if cur.fetchone()["c"] > 0:
        return
    ph = _placeholder()
    now = _now()
    for p in _SEED_PROJECTS:
        cur.execute(
            f"INSERT INTO projects (title, description, technologies, category, "
            f"github_url, demo_url, image_url, created_at, updated_at) "
            f"VALUES ({ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph})",
            (p["title"], p["description"], p["technologies"], p["category"],
             p["github_url"], p["demo_url"], p["image_url"], now, now),
        )
    conn.commit()


_SEED_CERTIFICATES = [
    {
        "title": "Cyber Job Simulation",
        "organization": "Forage · Deloitte",
        "date": "Aug 2026",
        "file": "cyber-job-simulation.pdf",
    },
    {
        "title": "GenAI Powered Data Analytics Job Simulation",
        "organization": "Forage",
        "date": "Jul 2026",
        "file": "genai-data-analytics-simulation.pdf",
    },
    {
        "title": "Technology Job Simulation",
        "organization": "Forage · Deloitte",
        "date": "Jul 2026",
        "file": "technology-job-simulation.pdf",
    },
    {
        "title": "Bhartiya Manak – Bharat ka Bharosa Quiz",
        "organization": "Bureau of Indian Standards · MyGov",
        "date": "2026",
        "file": "bis-bhartiya-manak-quiz.jpg",
    },
    {
        "title": "Weather Forecasting Quiz",
        "organization": "India Meteorological Department · MyGov",
        "date": "2026",
        "file": "imd-weather-forecasting-quiz.jpg",
    },
]


def _seed_certificates(conn):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS c FROM certificates")
    if cur.fetchone()["c"] > 0:
        return
    ph = _placeholder()
    now = _now()
    for c in _SEED_CERTIFICATES:
        ftype = "pdf" if c["file"].endswith(".pdf") else "image"
        cur.execute(
            f"INSERT INTO certificates (title, organization, date, file_url, "
            f"file_type, created_at) VALUES ({ph},{ph},{ph},{ph},{ph},{ph})",
            (c["title"], c["organization"], c["date"],
             f"/uploads/certificates/{c['file']}", ftype, now),
        )
    conn.commit()


def _init_db():
    conn = _connect()
    try:
        _create_tables(conn)
        _ensure_admin(conn)
        _seed_projects(conn)
        _seed_certificates(conn)
    finally:
        conn.close()


# ------------------------------------------------------------------
# Validation helpers
# ------------------------------------------------------------------

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
URL_RE = re.compile(r"^https?://\S+$", re.IGNORECASE)


def _clean_text(value, max_len=500):
    if value is None:
        return ""
    return str(value).strip()[:max_len]


def _valid_url(value, max_len=500):
    value = _clean_text(value, max_len)
    if not value:
        return ""
    if len(value) > max_len or not URL_RE.match(value):
        return None
    return value


def _valid_contact_payload(payload):
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip()
    subject = (payload.get("subject") or "").strip()
    message = (payload.get("message") or "").strip()

    if not (name and email and subject and message):
        return None, "All fields are required."
    if len(name) > 80 or len(subject) > 160:
        return None, "Name or subject is too long."
    if not EMAIL_RE.match(email) or len(email) > 160:
        return None, "A valid email address is required."
    if len(message) > 5000:
        return None, "Message is too long."
    return {"name": name, "email": email, "subject": subject, "message": message}, None


def _insert_message(conn, name, email, subject, message):
    ph = _placeholder()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO messages (name, email, subject, message, created_at) "
        f"VALUES ({ph},{ph},{ph},{ph},{ph})",
        (name, email, subject, message, _now()),
    )
    conn.commit()
    return cur.lastrowid


# ------------------------------------------------------------------
# File upload helpers
# ------------------------------------------------------------------

def _validate_magic(data, ext):
    """Check file signature bytes so a renamed exe can't pass as an image/PDF."""
    if ext in ("jpg", "jpeg"):
        return data[:3] == b"\xff\xd8\xff"
    if ext == "png":
        return data[:8] == b"\x89PNG\r\n\x1a\n"
    if ext == "gif":
        return data[:4] in (b"GIF8",)
    if ext == "webp":
        return len(data) > 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    if ext == "svg":
        head = data[:512].lower()
        return b"<svg" in head
    if ext == "pdf":
        return data[:5] == b"%PDF-"
    return True


def _save_upload(file_storage, folder, allowed_exts):
    """Validate and store an uploaded file. Returns (public_url, error)."""
    if not file_storage or not file_storage.filename or file_storage.filename == "":
        return None, None

    original = file_storage.filename
    ext = original.rsplit(".", 1)[-1].lower() if "." in original else ""
    if ext not in allowed_exts:
        return None, f"File type not allowed. Allowed: {', '.join(sorted(allowed_exts))}."

    data = file_storage.read()
    if not data:
        return None, "The uploaded file is empty."
    if len(data) > MAX_UPLOAD_BYTES:
        return None, f"File too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)."
    if not _validate_magic(data, ext):
        return None, "The file content does not match its extension."

    safe = secure_filename(original) or f"file.{ext}"
    name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}_{safe}"
    folder_path = os.path.join(UPLOAD_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    path = os.path.join(folder_path, name)
    with open(path, "wb") as fh:
        fh.write(data)
    return f"/uploads/{folder}/{name}", None


def _delete_uploaded(url):
    """Best-effort removal of a file referenced by a public URL."""
    if not url:
        return
    parts = url.strip("/").split("/")
    if len(parts) != 3 or parts[0] != "uploads":
        return
    folder, filename = parts[1], parts[2]
    if folder not in ("projects", "certificates"):
        return
    path = safe_join(os.path.join(UPLOAD_DIR, folder), filename)
    if path and os.path.isfile(path):
        try:
            os.remove(path)
        except OSError:
            pass


# ------------------------------------------------------------------
# Auth helpers
# ------------------------------------------------------------------

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("admin"):
            return jsonify({"error": "Unauthorized", "message": "Please log in."}), 401
        if request.method in ("POST", "PUT", "DELETE", "PATCH"):
            token = request.headers.get("X-CSRF-Token", "")
            if not token or token != session.get("csrf"):
                return jsonify({"error": "Invalid or missing CSRF token."}), 403
        return f(*args, **kwargs)
    return wrapper


def _require_admin_password(value, field="password"):
    if not value or len(value) < 8:
        return f"{field} must be at least 8 characters long."
    if len(value) > 128:
        return f"{field} is too long."
    return None


# ------------------------------------------------------------------
# Public read APIs
# ------------------------------------------------------------------

def _serialize_project(row):
    techs = [t.strip() for t in (row["technologies"] or "").split(",") if t.strip()]
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"] or "",
        "technologies": techs,
        "category": row["category"] or "",
        "github_url": row["github_url"] or "",
        "demo_url": row["demo_url"] or "",
        "image_url": row["image_url"] or "",
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@app.route("/api/projects", methods=["GET"])
def list_projects():
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects ORDER BY id DESC")
        return jsonify([_serialize_project(r) for r in cur.fetchall()])
    finally:
        conn.close()


@app.route("/api/projects/<int:project_id>", methods=["GET"])
def get_project(project_id):
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects WHERE id = ?" if not _is_mysql_configured()
                    else "SELECT * FROM projects WHERE id = %s", (project_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Project not found."}), 404
        return jsonify(_serialize_project(row))
    finally:
        conn.close()


@app.route("/api/certificates", methods=["GET"])
def list_certificates():
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM certificates ORDER BY id DESC")
        rows = cur.fetchall()
        return jsonify([
            {
                "id": r["id"],
                "title": r["title"],
                "organization": r["organization"] or "",
                "date": r["date"] or "",
                "file_url": r["file_url"] or "",
                "file_type": r["file_type"] or "",
                "created_at": r["created_at"],
            }
            for r in rows
        ])
    finally:
        conn.close()


# ------------------------------------------------------------------
# Admin APIs
# ------------------------------------------------------------------

@app.route("/api/admin/me", methods=["GET"])
def admin_me():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({
        "username": session["admin"],
        "csrf": session.get("csrf") or _new_csrf(),
    })


def _new_csrf():
    token = secrets.token_hex(16)
    session["csrf"] = token
    return token


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    payload = request.get_json(silent=True) or {}
    username = _clean_text(payload.get("username"), 80)
    password = payload.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM admin WHERE username = ?" if not _is_mysql_configured()
                    else "SELECT * FROM admin WHERE username = %s", (username,))
        row = cur.fetchone()
    finally:
        conn.close()

    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid username or password."}), 401

    session.clear()
    session["admin"] = row["username"]
    _new_csrf()
    return jsonify({"status": "ok", "username": row["username"], "csrf": session["csrf"]})


@app.route("/api/admin/logout", methods=["POST"])
@login_required
def admin_logout():
    session.clear()
    return jsonify({"status": "ok"})


@app.route("/api/admin/change-password", methods=["POST"])
@login_required
def admin_change_password():
    payload = request.get_json(silent=True) or {}
    current = payload.get("current_password") or ""
    new_password = payload.get("new_password") or ""

    if not current:
        return jsonify({"error": "Current password is required."}), 400
    err = _require_admin_password(new_password, "New password")
    if err:
        return jsonify({"error": err}), 400

    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM admin WHERE username = ?" if not _is_mysql_configured()
                    else "SELECT * FROM admin WHERE username = %s", (session["admin"],))
        row = cur.fetchone()
        if not row or not check_password_hash(row["password_hash"], current):
            return jsonify({"error": "Current password is incorrect."}), 403
        ph = _placeholder()
        cur.execute("UPDATE admin SET password_hash = ? WHERE id = ?" if not _is_mysql_configured()
                    else "UPDATE admin SET password_hash = %s WHERE id = %s",
                    (generate_password_hash(new_password), row["id"]))
        conn.commit()
    finally:
        conn.close()

    return jsonify({"status": "ok", "message": "Password updated successfully."})


# ------------------------------------------------------------------
# Project admin CRUD
# ------------------------------------------------------------------

def _project_form_payload():
    """Read & validate project fields from multipart/form-data."""
    form = request.form
    title = _clean_text(form.get("title"), 160)
    description = _clean_text(form.get("description"), 4000)
    technologies = _clean_text(form.get("technologies"), 500)
    category = _clean_text(form.get("category"), 80)
    github_url = _valid_url(form.get("github_url"))
    demo_url = _valid_url(form.get("demo_url"))

    if not title:
        return None, "Project title is required."
    if github_url is None or demo_url is None:
        return None, "GitHub / demo URLs must start with http:// or https://."

    return {
        "title": title,
        "description": description,
        "technologies": technologies,
        "category": category,
        "github_url": github_url,
        "demo_url": demo_url,
    }, None


@app.route("/api/projects", methods=["POST"])
@login_required
def create_project():
    data, error = _project_form_payload()
    if error:
        return jsonify({"error": error}), 400

    image_url, up_err = _save_upload(request.files.get("image"), "projects", ALLOWED_IMAGE_EXTS)
    if up_err:
        return jsonify({"error": up_err}), 400

    ph = _placeholder()
    now = _now()
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO projects (title, description, technologies, category, "
            f"github_url, demo_url, image_url, created_at, updated_at) "
            f"VALUES ({ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph})",
            (data["title"], data["description"], data["technologies"], data["category"],
             data["github_url"], data["demo_url"], image_url or "", now, now),
        )
        conn.commit()
        project_id = cur.lastrowid
    finally:
        conn.close()

    return jsonify({"status": "ok", "id": project_id}), 201


@app.route("/api/projects/<int:project_id>", methods=["PUT"])
@login_required
def update_project(project_id):
    data, error = _project_form_payload()
    if error:
        return jsonify({"error": error}), 400

    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects WHERE id = ?" if not _is_mysql_configured()
                    else "SELECT * FROM projects WHERE id = %s", (project_id,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({"error": "Project not found."}), 404

        image_url = existing["image_url"]
        up_url, up_err = _save_upload(request.files.get("image"), "projects", ALLOWED_IMAGE_EXTS)
        if up_err:
            return jsonify({"error": up_err}), 400
        if up_url:
            image_url = up_url

        ph = _placeholder()
        now = _now()
        cur.execute(
            f"UPDATE projects SET title=?, description=?, technologies=?, category=?, "
            f"github_url=?, demo_url=?, image_url=?, updated_at=? WHERE id=?"
            if not _is_mysql_configured()
            else "UPDATE projects SET title=%s, description=%s, technologies=%s, category=%s, "
                 "github_url=%s, demo_url=%s, image_url=%s, updated_at=%s WHERE id=%s",
            (data["title"], data["description"], data["technologies"], data["category"],
             data["github_url"], data["demo_url"], image_url or "", now, project_id),
        )
        conn.commit()
        if up_url and existing["image_url"] and existing["image_url"] != up_url:
            _delete_uploaded(existing["image_url"])
    finally:
        conn.close()

    return jsonify({"status": "ok", "id": project_id})


@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
@login_required
def delete_project(project_id):
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects WHERE id = ?" if not _is_mysql_configured()
                    else "SELECT * FROM projects WHERE id = %s", (project_id,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({"error": "Project not found."}), 404
        cur.execute("DELETE FROM projects WHERE id = ?" if not _is_mysql_configured()
                    else "DELETE FROM projects WHERE id = %s", (project_id,))
        conn.commit()
        _delete_uploaded(existing["image_url"])
    finally:
        conn.close()
    return jsonify({"status": "ok"})


# ------------------------------------------------------------------
# Certificate admin CRUD
# ------------------------------------------------------------------

@app.route("/api/certificates", methods=["POST"])
@login_required
def create_certificate():
    form = request.form
    title = _clean_text(form.get("title"), 200)
    organization = _clean_text(form.get("organization"), 200)
    date = _clean_text(form.get("date"), 80)

    if not title:
        return jsonify({"error": "Certificate title is required."}), 400

    file_url, up_err = _save_upload(request.files.get("file"), "certificates", ALLOWED_CERT_EXTS)
    if up_err:
        return jsonify({"error": up_err}), 400
    if not file_url:
        return jsonify({"error": "A certificate file (image or PDF) is required."}), 400

    ftype = "pdf" if file_url.lower().endswith(".pdf") else "image"
    ph = _placeholder()
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO certificates (title, organization, date, file_url, file_type, created_at) "
            f"VALUES ({ph},{ph},{ph},{ph},{ph},{ph})",
            (title, organization, date, file_url, ftype, _now()),
        )
        conn.commit()
        cert_id = cur.lastrowid
    finally:
        conn.close()
    return jsonify({"status": "ok", "id": cert_id}), 201


@app.route("/api/certificates/<int:cert_id>", methods=["PUT"])
@login_required
def update_certificate(cert_id):
    form = request.form
    title = _clean_text(form.get("title"), 200)
    organization = _clean_text(form.get("organization"), 200)
    date = _clean_text(form.get("date"), 80)

    if not title:
        return jsonify({"error": "Certificate title is required."}), 400

    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM certificates WHERE id = ?" if not _is_mysql_configured()
                    else "SELECT * FROM certificates WHERE id = %s", (cert_id,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({"error": "Certificate not found."}), 404

        file_url = existing["file_url"]
        up_url, up_err = _save_upload(request.files.get("file"), "certificates", ALLOWED_CERT_EXTS)
        if up_err:
            return jsonify({"error": up_err}), 400
        if up_url:
            file_url = up_url

        ftype = "pdf" if file_url.lower().endswith(".pdf") else "image"
        ph = _placeholder()
        cur.execute(
            "UPDATE certificates SET title=?, organization=?, date=?, file_url=?, file_type=? WHERE id=?"
            if not _is_mysql_configured()
            else "UPDATE certificates SET title=%s, organization=%s, date=%s, file_url=%s, file_type=%s WHERE id=%s",
            (title, organization, date, file_url, ftype, cert_id),
        )
        conn.commit()
        if up_url and existing["file_url"] and existing["file_url"] != up_url:
            _delete_uploaded(existing["file_url"])
    finally:
        conn.close()
    return jsonify({"status": "ok", "id": cert_id})


@app.route("/api/certificates/<int:cert_id>", methods=["DELETE"])
@login_required
def delete_certificate(cert_id):
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM certificates WHERE id = ?" if not _is_mysql_configured()
                    else "SELECT * FROM certificates WHERE id = %s", (cert_id,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({"error": "Certificate not found."}), 404
        cur.execute("DELETE FROM certificates WHERE id = ?" if not _is_mysql_configured()
                    else "DELETE FROM certificates WHERE id = %s", (cert_id,))
        conn.commit()
        _delete_uploaded(existing["file_url"])
    finally:
        conn.close()
    return jsonify({"status": "ok"})


# ------------------------------------------------------------------
# Contact
# ------------------------------------------------------------------

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "db": "mysql" if _is_mysql_configured() else "sqlite"})


@app.route("/api/contact", methods=["POST"])
def contact():
    payload = request.get_json(silent=True) or {}
    data, error = _valid_contact_payload(payload)
    if error:
        return jsonify({"error": error}), 400

    try:
        conn = _connect()
        _insert_message(conn, **data)
        conn.close()
    except Exception as exc:  # noqa: BLE001
        app.logger.error("Contact save failed: %s", exc)
        return jsonify({"error": "Could not save your message. Please try again later."}), 500

    return jsonify({"status": "ok", "message": "Message received. Thank you!"}), 201


# ------------------------------------------------------------------
# Admin pages + uploads + static frontend serving
# ------------------------------------------------------------------

@app.route("/admin")
@app.route("/admin/")
def admin_page():
    if not session.get("admin"):
        return redirect("/admin/login")
    return send_from_directory(FRONTEND_DIR, "admin.html")


@app.route("/admin/login")
@app.route("/admin/login/")
def admin_login_page():
    if session.get("admin"):
        return redirect("/admin")
    return send_from_directory(FRONTEND_DIR, "admin-login.html")


@app.route("/uploads/<folder>/<filename>")
def uploaded_file(folder, filename):
    if folder not in ("projects", "certificates"):
        abort(404)
    path = safe_join(os.path.join(UPLOAD_DIR, folder), filename)
    if not path or not os.path.isfile(path):
        abort(404)
    return send_from_directory(os.path.join(UPLOAD_DIR, folder), filename)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def frontend(path):
    if not path:
        return send_from_directory(FRONTEND_DIR, "index.html")
    if path == "admin.html":
        return redirect("/admin")
    safe = safe_join(FRONTEND_DIR, path)
    if safe and os.path.isfile(safe):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")


# ------------------------------------------------------------------

_init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
