# 🍽️ ReciLink

> A smart recipe recommendation and sharing platform — Final Year Project (FYP)

## 📌 About

ReciLink is a full-stack web and mobile application that allows users to:
- 🔍 Discover and explore recipes from a curated dataset
- 📤 Share their own recipes with the community
- 🔐 Register and log in securely with JWT authentication

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) |
| Database | PostgreSQL |
| ORM | SQLAlchemy (async) |
| Auth | JWT + bcrypt |
| Frontend Web | React.js + Vite |
| Frontend Mobile | React Native + Expo |

---

## 📁 Project Structure

```
recilink-app/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── core/         # Security (JWT, bcrypt)
│   │   ├── models/       # Database models
│   │   ├── routers/      # API route handlers
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── main.py       # App entrypoint
│   ├── .env              # Environment variables (NOT uploaded)
│   └── requirements.txt
├── frontend-web/         # React.js web app (coming soon)
├── frontend-mobile/      # React Native mobile app (coming soon)
└── README.md
```

---

## 🚀 Getting Started (Backend)

### Prerequisites
- Python 3.11+
- PostgreSQL 15+

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/recilink-app.git
cd recilink-app/backend
```

### 2. Create virtual environment
```bash
python -m venv .venv
.venv\Scripts\activate     # Windows
source .venv/bin/activate  # Mac/Linux
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment
Create a `.env` file in `backend/`:
```env
DATABASE_URL=postgresql+asyncpg://postgres:<your_password>@localhost:5432/recilink
```

### 5. Run the server
```bash
uvicorn app.main:app --reload
```

Visit **http://localhost:8000/docs** for the interactive API docs.

---

## ✅ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login and get JWT token |

---

## 👥 Team

- **Qamarul** — Backend & Database
- **[Partner Name]** — Frontend

---

## 📄 License

This project is for academic purposes (FYP).
