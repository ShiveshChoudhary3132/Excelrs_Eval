Excelrs Eval - Secure CBT Platform

Excelrs Eval is a robust, full-stack Computer-Based Testing (CBT) platform designed to deliver secure, proctored assessments. It features built-in AI webcam monitoring, automated security lockouts, dynamic test translation, and a real-time digital scratchpad.

🚀 Key Features

🤖 AI Proctoring Engine: Utilizes Google's TensorFlow (BlazeFace) directly in the browser to monitor the webcam. It actively detects if a student leaves the frame or if multiple faces appear, issuing automatic security strikes.

🔒 Anti-Cheat Environment: Enforces full-screen mode and tracks tab-switching or window-minimizing. Accumulating 3 strikes results in an automatic test submission.

💾 Bulletproof Session Recovery: Uses continuous localStorage syncing and absolute timestamps. If a student's browser crashes or they accidentally close the tab, they can resume the test with their answers intact and the exact remaining time accurately preserved.

📝 Digital Scratchpad: A built-in, toggleable side-panel featuring both a text notepad and an HTML5 Canvas sketching tool for working out complex problems.

🌐 Dynamic Translation: Integrated AI translation service allowing students to translate test questions into multiple regional languages (Hindi, Bengali, Marathi, Telugu, Tamil) on the fly.

👨‍🏫 Dual Dashboards: Distinct, secure routing and interfaces for both Students (to take assessments and view grades) and Teachers (to deploy tests and monitor submissions).

🏗️ Architecture & Tech Stack

This project is separated into two distinct microservices: a React frontend and a Python backend.

Frontend (/cbt_frontend)

Framework: React (via Vite)

Styling: Tailwind CSS

Icons: Lucide React

AI/ML: TensorFlow.js & BlazeFace (Dynamically injected via CDN)

Routing: React Router DOM

Deployment: Hosted on Vercel

Backend (/cbt_backend)

Framework: FastAPI (Python)

Database ORM: SQLAlchemy

Data Validation: Pydantic

Authentication: Secure JWT (JSON Web Tokens) with hashed passwords

Database: PostgreSQL (Hosted on Neon.tech)

Deployment: Hosted on Render.com

📂 Repository Structure

Excelrs_Eval/
├── cbt_frontend/          # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # AuthContext for global state
│   │   ├── pages/         # TestWindow, StudentDashboard, TeacherDashboard
│   │   └── App.jsx        # Routing configuration
│   ├── package.json
│   └── vite.config.js
├── cbt_backend/           # FastAPI application
│   ├── main.py            # API entry point & routes
│   ├── database.py        # SQLAlchemy engine & session maker
│   ├── models.py          # Database table schemas
│   ├── schemas.py         # Pydantic validation models
│   ├── auth.py            # JWT and password hashing logic
│   └── requirements.txt   # Python dependencies (psycopg2-binary, etc.)
└── .gitignore             # Root-level ignore configurations


💻 Running Locally

Prerequisites

Node.js & npm installed

Python 3.10+ installed

A local or cloud PostgreSQL database

1. Start the Backend

cd cbt_backend
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows use: .\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up your environment variables
# Create a .env file and add your DATABASE_URL and SECRET_KEY

# Run the server
uvicorn main:app --reload


2. Start the Frontend

cd cbt_frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
