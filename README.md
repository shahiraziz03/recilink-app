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
│   ├── alembic/          # Database migration files        
│   ├── app/
│   │   ├── core/         # Security (JWT, bcrypt)
│   │   ├── db/           # Database session
│   │   ├── models/       # SQLAlchemy models
│   │   ├── routers/      # API route handlers
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── main.py       # App entrypoint
│   ├── .env              # Environment variables (NOT uploaded)
│   ├── alembic.ini       # Alembic config
│   └── requirements.txt
├── frontend-web/         # React.js + Vite web app
├── frontend-mobile/      # React Native + Expo mobile app
└── README.md
```

---

## 🚀 Getting Started (Backend)

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Node.js 18+
- Android Studio (optional, for Android emulator)

### 1. Clone the repo
```bash
git clone https://github.com/shahiraziz03/recilink-app.git
cd recilink-app
```

#### 2. Create and activate virtual environment
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
PROJECT_NAME=ReciLink API
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=recilink
```

#### 5. Create the database

Using terminal:
```bash
psql -U postgres
CREATE DATABASE recilink;
\q
```
Or use any PostgreSQL GUI (pgAdmin, DBeaver, TablePlus) to create a database named `recilink`.

#### 6. Run database migrations
```bash
python -m alembic upgrade head
```

This creates all tables in your database automatically.

#### 7. Start the server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Visit **http://localhost:8000/docs** for the interactive API docs.

---

### 🌐 Frontend Web

```bash
cd frontend-web
npm install
npm run dev
```

Visit **http://localhost:5173**

---

### 📱 Frontend Mobile

```bash
cd frontend-mobile
npm install
npm start          # Scan QR code with Expo Go on iPhone
```

Or for Android emulator (start emulator first):
```bash
# Run in a separate terminal
emulator -avd Pixel_6_API_35

# Then in another terminal
npm run android
```

#### ⚠️ iOS Physical Device Configuration
Before running on a physical iPhone, update `frontend-mobile/src/api/apiClient.ts`:
- Find `IOS_URL` and replace with your machine's local WiFi IP
- Windows: run `ipconfig` → IPv4 Address under Wi-Fi
- Mac: run `ifconfig` → inet address under en0

---

## 🔄 Database Migrations

Every time you change a model, run:
```bash
cd backend
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # Mac/Linux
python -m alembic revision --autogenerate -m "describe_your_change"
python -m alembic upgrade head
```

---

## 📄 License

This project is for academic purposes (FYP).
