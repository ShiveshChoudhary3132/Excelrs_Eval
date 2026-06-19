from sqlalchemy.orm import Session
from app.models.submission import Submission, StudentAnswer, SubmissionStatus
from app.models.assessment import Assessment, QuestionType
from app.schemas.submission import SubmissionCreate

def create_submission(db: Session, submission_in: SubmissionCreate, assessment_id: int, student_id: int):
    """Logs a student's submission, saves their individual answers, and auto-grades MCQs."""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    
    db_submission = Submission(
        assessment_id=assessment_id,
        student_id=student_id,
        status=SubmissionStatus.PENDING,
        score=0.0
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)

    total_questions = len(assessment.questions)
    points_per_question = assessment.total_points / total_questions if total_questions > 0 else 0
    calculated_score = 0.0
    has_essay = False

    # Save each student answer and check correctness for MCQs
    for ans in submission_in.answers:
        db_answer = StudentAnswer(
            submission_id=db_submission.id,
            question_id=ans.question_id,
            student_answer=ans.student_answer
        )
        db.add(db_answer)

        # Look up matching question properties to auto-grade MCQs
        question = next((q for q in assessment.questions if q.id == ans.question_id), None)
        if question:
            if question.question_type == QuestionType.MCQ:
                if question.correct_answer.strip().lower() == ans.student_answer.strip().lower():
                    calculated_score += points_per_question
            elif question.question_type == QuestionType.ESSAY:
                has_essay = True

    # If there are no essays, the test can be marked fully graded instantly
    if not has_essay:
        db_submission.status = SubmissionStatus.GRADED
        db_submission.score = calculated_score
    else:
        # Store temporary MCQ points; teacher will manually add essay score later
        db_submission.score = calculated_score

    db.commit()
    db.refresh(db_submission)
    return db_submission

def update_manual_grade(db: Session, submission_id: int, final_score: float):
    """Allows a teacher to update a student's final score after reviewing essays."""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if submission:
        submission.score = final_score
        submission.status = SubmissionStatus.GRADED
        db.commit()
        db.refresh(submission)
    return submission