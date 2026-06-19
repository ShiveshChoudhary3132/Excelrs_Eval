from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.assessment import AssessmentType, QuestionType

# --- QUESTION SCHEMAS ---
class QuestionBase(BaseModel):
    question_text: str
    question_type: QuestionType
    options: Optional[List[str]] = None # List of strings for MCQs, null for essay

class QuestionCreate(QuestionBase):
    correct_answer: str

# Full question details (Includes correct answers—For Teachers Only)
class QuestionResponse(QuestionCreate):
    id: int
    assessment_id: int

    model_config = {"from_attributes": True}

# Secure question details (Hides correct answers—For Students taking a test)
class QuestionStudentResponse(QuestionBase):
    id: int
    assessment_id: int

    model_config = {"from_attributes": True}


# --- ASSESSMENT SCHEMAS ---
class AssessmentBase(BaseModel):
    title: str
    type: AssessmentType
    due_date: datetime
    total_points: int

class AssessmentCreate(AssessmentBase):
    questions: List[QuestionCreate]

class AssessmentResponse(AssessmentBase):
    id: int
    classroom_id: int

    model_config = {"from_attributes": True}

# Detailed test view for students (shows questions, hides answers)
class AssessmentStudentView(AssessmentResponse):
    questions: List[QuestionStudentResponse]

    model_config = {"from_attributes": True}