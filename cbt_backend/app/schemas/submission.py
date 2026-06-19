from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.submission import SubmissionStatus

# A single answer to a specific question submitted by a student
class AnswerSubmit(BaseModel):
    question_id: int
    student_answer: str

# The payload when a student hits "Submit Test"
class SubmissionCreate(BaseModel):
    answers: List[AnswerSubmit]

# Formatted score report
class SubmissionResponse(BaseModel):
    id: int
    assessment_id: int
    student_id: int
    score: Optional[float] = None
    status: SubmissionStatus
    submitted_at: datetime

    model_config = {"from_attributes": True}