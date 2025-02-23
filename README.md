# Chunked File Upload with Django & React

This project implements a chunked file upload system using Django (backend) and React (frontend). It supports uploading large 3D files, tracking progress, resuming interrupted uploads, and visualizing the uploaded file.

---

## 🛠 Setup Instructions

### 1️⃣ Backend (Django) Setup

#### Prerequisites:
- Python 3.8+
- PostgreSQL or SQLite (default)

#### Steps:
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/chunked-upload.git
   cd chunked-upload/backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run database migrations:**
   ```bash
   python manage.py migrate
   ```

5. **Start the Django development server:**
   ```bash
   python manage.py runserver
   ```
   The backend will be available at `http://127.0.0.1:8000/`

---

### 2️⃣ Frontend (React) Setup

#### Prerequisites:
- Node.js 16+

#### Steps:
1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173/`

---

## 🔧 Features
- Chunked file upload for large files (up to 4GB)
- Upload progress tracking
- Resume interrupted uploads
- 3D model preview after upload

## 📂 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload/` | Upload a file chunk |
| `POST` | `/complete/` | Mark file upload as complete |
| `GET` | `/status/{file_id}/` | Get upload progress |

---

## 🛠 Troubleshooting
- Ensure Python and Node.js are installed.
- If issues occur, check logs using:
  ```bash
  python manage.py runserver --verbosity 3
  npm run dev --verbose
  ```
- Verify CORS settings if frontend cannot communicate with the backend.

---

## 📜 License
This project is licensed under the MIT License.

