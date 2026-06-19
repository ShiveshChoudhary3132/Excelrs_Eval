from fastapi import APIRouter
from app.api.endpoints import auth, classrooms, assessments, submissions

api_router = APIRouter()

# Attach each endpoint file to a distinct URL prefix path
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(classrooms.router, prefix="/classes", tags=["Classrooms"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["Assessments"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["Submissions"])