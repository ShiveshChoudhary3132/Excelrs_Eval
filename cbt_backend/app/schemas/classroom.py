from pydantic import BaseModel
from typing import List
from app.schemas.user import UserResponse

class ClassroomBase(BaseModel):
    class_name: str

class ClassroomCreate(ClassroomBase):
    pass

class ClassroomResponse(ClassroomBase):
    id: int
    teacher_id: int

    model_config = {"from_attributes": True}

# Used when a teacher wants to view a class alongside its full list of students
class ClassroomDetailResponse(ClassroomResponse):
    students: List[UserResponse] = []

    model_config = {"from_attributes": True}

# Used when a teacher submits a student's email to add them to a class
class EnrollStudent(BaseModel):
    student_email: str