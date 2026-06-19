from sqlalchemy.orm import Session
from app.models.assessment import Assessment, Question
from app.schemas.assessment import AssessmentCreate

def create_assessment_with_questions(db: Session, assessment_in: AssessmentCreate, classroom_id: int):
    """Saves a test metadata profile and attaches all provided test questions to it."""
    db_assessment = Assessment(
        classroom_id=classroom_id,
        title=assessment_in.title,
        type=assessment_in.type,
        due_date=assessment_in.due_date,
        total_points=assessment_in.total_points
    )
    db.add(db_assessment)
    db.commit() # Save assessment first to generate its unique ID
    db.refresh(db_assessment)

    # Loop through and create each question connected to this test
    for q in assessment_in.questions:
        db_question = Question(
            assessment_id=db_assessment.id,
            question_text=q.question_text,
            question_type=q.question_type,
            options=q.options,
            correct_answer=q.correct_answer
        )
        db.add(db_question)
        
    db.commit()
    db.refresh(db_assessment)
    return db_assessment

def get_assessments_by_class(db: Session, classroom_id: int):
    """Fetches all tests assigned to a specific classroom."""
    return db.query(Assessment).filter(Assessment.classroom_id == classroom_id).all()

def get_assessment_by_id(db: Session, assessment_id: int):
    """Fetches a specific test by its ID."""
    return db.query(Assessment).filter(Assessment.id == assessment_id).first()