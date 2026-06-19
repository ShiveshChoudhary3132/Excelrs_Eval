from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.classroom import Classroom
from app.models.user import User, UserRole
from app.schemas.classroom import ClassroomCreate

def create_classroom(db: Session, classroom_in: ClassroomCreate, teacher_id: int):
    """Creates a new classroom assigned to a specific teacher."""
    db_classroom = Classroom(
        class_name=classroom_in.class_name,
        teacher_id=teacher_id
    )
    db.add(db_classroom)
    db.commit()
    db.refresh(db_classroom)
    return db_classroom

def get_classrooms_by_user(db: Session, user_id: int, role: str):
    """Fetches all classrooms belonging to a teacher OR classrooms a student is enrolled in."""
    if role == UserRole.TEACHER:
        return db.query(Classroom).filter(Classroom.teacher_id == user_id).all()
    else:
        # Finds classrooms where the student's ID exists in the secondary enrollment table
        return db.query(Classroom).filter(Classroom.students.any(id=user_id)).all()

def add_student_to_class_by_email(db: Session, classroom_id: int, student_email: str):
    """Finds a student by email and appends them to the classroom's student list."""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    student = db.query(User).filter(User.email == student_email, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student with this email address does not exist.")
        
    if student in classroom.students:
        raise HTTPException(status_code=400, detail="Student is already enrolled in this class.")
        
    classroom.students.append(student)
    db.commit()
    db.refresh(classroom)
    return classroom