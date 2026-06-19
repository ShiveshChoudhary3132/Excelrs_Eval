from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import dependencies
from app.crud import crud_classroom
from app.schemas import classroom as classroom_schema
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=classroom_schema.ClassroomResponse)
def create_new_class(
    classroom_in: classroom_schema.ClassroomCreate, 
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_teacher)
):
    """Allows an authenticated teacher to create a new classroom."""
    return crud_classroom.create_classroom(db, classroom_in, teacher_id=current_user.id)

@router.get("/", response_model=List[classroom_schema.ClassroomResponse])
def get_my_classes(
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_user)
):
    """Fetches all classes relevant to the logged-in user (Teacher's owned classes OR Student's enrolled classes)."""
    return crud_classroom.get_classrooms_by_user(db, user_id=current_user.id, role=current_user.role)

@router.post("/{classroom_id}/enroll", response_model=classroom_schema.ClassroomDetailResponse)
def enroll_student_by_email(
    classroom_id: int,
    payload: classroom_schema.EnrollStudent,
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_teacher)
):
    """Allows a teacher to invite/add a student to their class using the student's email address."""
    return crud_classroom.add_student_to_class_by_email(
        db, classroom_id=classroom_id, student_email=payload.student_email
    )