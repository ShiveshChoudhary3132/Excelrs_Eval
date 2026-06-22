from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, classes 

# 1. Import your central database Base and Engine
from app.core.database import Base, engine

# 2. IMPORTANT: Import all models so SQLAlchemy registers them in its memory
from app.models.user import User
from app.models.classroom import Classroom, classroom_student, Test

# 3. Command SQLAlchemy to build all registered tables inside PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://excelrs-eval.vercel.app"],
    allow_origin_regex=r"https://excelrs-eval.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(classes.router, prefix="/api/classes", tags=["Classrooms"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the CBT Backend API! Go to /docs to view your interactive API documentation."}
