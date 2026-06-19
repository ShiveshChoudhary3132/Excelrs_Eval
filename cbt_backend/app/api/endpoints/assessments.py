from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import dependencies
from app.crud import crud_assessment
from app.schemas import assessment as assessment_schema
from app.models.user import User, UserRole

router = APIRouter()

@router.post("/{classroom_id}", response_model=assessment_schema.AssessmentResponse)
def create_test(
    classroom_id: int,
    assessment_in: assessment_schema.AssessmentCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_teacher)
):
    """Allows a teacher to create a test or assignment inside a specified classroom."""
    return crud_assessment.create_assessment_with_questions(db, assessment_in, classroom_id=classroom_id)

@router.get("/classroom/{classroom_id}", response_model=List[assessment_schema.AssessmentResponse])
def get_classroom_tests(classroom_id: int, db: Session = Depends(dependencies.get_db), current_user: User = Depends(dependencies.get_current_user)):
    """Fetches all tests assigned to a specific classroom."""
    return crud_assessment.get_assessments_by_class(db, classroom_id=classroom_id)

@router.get("/{assessment_id}", response_model=Any)
def get_single_test_details(
    assessment_id: int, 
    db: Session = Depends(dependencies.get_db), 
    current_user: User = Depends(dependencies.get_current_user)
):
    """
    Fetches a single test. 
    If a teacher requests it, they see questions AND correct answers.
    If a student requests it, the correct answers are stripped out entirely for security.
    """
    test = crud_assessment.get_assessment_by_id(db, assessment_id=assessment_id)
    if not test:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    if current_user.role == UserRole.TEACHER:
        return test # Matches standard full schema implicitly
    else:
        # Enforces the Pydantic Student View to filter out the answer column
        return assessment_schema.AssessmentStudentView.model_validate(test)