#import os
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.exc import IntegrityError, DataError
from groq import Groq
import time
import random
from deep_translator import GoogleTranslator

# IMPORTANT: Adjust these imports to match your project's structure!
from app.api import dependencies 
from app.models.user import User
from app.models.classroom import Classroom, Test
from app.models.submission import Submission, SubmissionStatus
from app.core.config import settings

# Let Pydantic securely inject the key from your .env file
client = Groq(api_key=settings.GROQ_API_KEY)

router = APIRouter()

# --- PYDANTIC SCHEMAS (Data Validation) ---
class AITestRequest(BaseModel):
    topic: str
    question_count: int

class TranslateRequest(BaseModel):
    questions: list
    target_language: str

class ClassCreateSchema(BaseModel):
    class_name: str

class AddStudentSchema(BaseModel):
    email: str

# NEW: Schema for adding co-teachers
class AddTeacherSchema(BaseModel):
    email: str

class TestCreateSchema(BaseModel):
    title: str
    due_date: str
    duration: int = 60
    max_attempts: int = 1
    total_points: int
    questions: List[Dict[str, Any]]

class SubmitSchema(BaseModel):
    student_email: str
    answers: Dict[str, Any]

class GradeSchema(BaseModel):
    score: int

class AIGenerateSchema(BaseModel):
    topic: str
    question_count: int
    
# --- ENDPOINTS ---

@router.get("/")
def get_classes(
    db: Session = Depends(dependencies.get_db), 
    current_user: User = Depends(dependencies.get_current_user) # <-- SECURED!
):
    """Fetches classes that the logged-in teacher is a part of"""
    
    # Only return classrooms where this specific user is in the teachers list
    classrooms = current_user.teaching_classes
    
    result = []
    for c in classrooms:
        result.append({
            "id": c.id,
            "class_name": c.class_name,
            "students": [student.email for student in c.students],
            "teachers": [teacher.email for teacher in c.teachers] # Send teacher list to frontend
        })
    return result

@router.post("/")
def create_class(
    payload: ClassCreateSchema, 
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_user) # <-- SECURED!
):
    """Creates a new classroom and assigns the creator as a teacher"""
    new_class = Classroom(class_name=payload.class_name)
    
    # Automatically add the logged-in teacher to the classroom's teacher roster
    new_class.teachers.append(current_user)
    
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return {"message": "Class created successfully", "id": new_class.id}

# --- NEW: Delete Classroom Endpoint ---
@router.delete("/{class_id}")
def delete_class(
    class_id: int, 
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_user)
):
    """Deletes a classroom (Cascades to delete all tests and submissions)"""
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
        
    # Ensure only a teacher of this class can delete it
    if current_user not in classroom.teachers:
        raise HTTPException(status_code=403, detail="Not authorized to delete this class.")
        
    db.delete(classroom)
    db.commit()
    return {"message": "Classroom deleted successfully."}

# --- NEW: Add Co-Teacher Endpoint ---
@router.post("/{class_id}/teachers")
def add_teacher_to_class(
    class_id: int, 
    payload: AddTeacherSchema, 
    db: Session = Depends(dependencies.get_db),
    current_user: User = Depends(dependencies.get_current_user)
):
    """Adds an existing teacher account to a classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
        
    if current_user not in classroom.teachers:
        raise HTTPException(status_code=403, detail="Only existing teachers of this class can add co-teachers.")

    new_teacher = db.query(User).filter(User.email == payload.email).first()
    if not new_teacher:
        raise HTTPException(status_code=404, detail="No user registered with that email address.")
        
    if new_teacher.role.value != "teacher":
        raise HTTPException(status_code=400, detail="This user is not registered as a teacher account.")

    if new_teacher not in classroom.teachers:
        classroom.teachers.append(new_teacher)
        db.commit()
        
    return {"message": f"Successfully added {new_teacher.email} as a co-teacher."}

@router.post("/{class_id}/students")
def add_student_to_class(class_id: int, payload: AddStudentSchema, db: Session = Depends(dependencies.get_db)):
    """Finds a student by email and adds them to the classroom roster"""
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    student = db.query(User).filter(User.email == payload.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="No user registered with that email address.")
        
    if student.role.value != "student":
        raise HTTPException(status_code=400, detail="This email belongs to a teacher, not a student.")

    if student not in classroom.students:
        classroom.students.append(student)
        db.commit()
        
    return {"message": f"Successfully added {student.email} to the roster."}

@router.delete("/{class_id}/students/{email}")
def remove_student(class_id: int, email: str, db: Session = Depends(dependencies.get_db)):
    """Removes a student from the classroom roster"""
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
        
    student = db.query(User).filter(User.email == email).first()
    if student in classroom.students:
        classroom.students.remove(student)
        db.commit()
        
    return {"message": "Student removed successfully"}

@router.post("/{class_id}/tests")
def create_test(class_id: int, payload: TestCreateSchema, db: Session = Depends(dependencies.get_db)):
    """Teacher publishes a test to the database"""
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
        
    new_test = Test(
        title=payload.title,
        due_date=payload.due_date,
        duration=payload.duration,
        max_attempts=payload.max_attempts,
        total_points=payload.total_points,
        questions=payload.questions,
        classroom_id=class_id
    )
    db.add(new_test)
    db.commit()
    return {"message": "Test published successfully!"}

@router.get("/student/{email}/tests")
def get_student_tests(email: str, db: Session = Depends(dependencies.get_db)):
    student = db.query(User).filter(User.email == email).first()
    if not student: raise HTTPException(status_code=404, detail="Student not found.")
        
    student_tests = []
    current_time = datetime.now()

    for c in student.enrolled_classes:
        for t in c.tests:
            try:
                due = datetime.fromisoformat(t.due_date)
                is_active = due > current_time
            except ValueError:
                is_active = True

            if is_active:
                subs = db.query(Submission).filter(Submission.test_id == t.id, Submission.student_email == email).all()
                attempts_used = len(subs)
                max_att = getattr(t, 'max_attempts', 1)
                
                graded_scores = [s.score for s in subs if s.score is not None]
                best_score = max(graded_scores) if graded_scores else None

                student_tests.append({
                    "id": t.id,
                    "title": t.title,
                    "due_date": t.due_date,
                    "duration": getattr(t, 'duration', 60),
                    "total_points": t.total_points,
                    "class_name": c.class_name,
                    "classroom_id": c.id,
                    "attempts_used": attempts_used,
                    "max_attempts": max_att,
                    "is_submitted": attempts_used >= max_att,
                    "score": best_score
                })
    return student_tests

@router.get("/tests/{test_id}")
def get_single_test(test_id: int, db: Session = Depends(dependencies.get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found.")
    return test

@router.post("/tests/{test_id}/submit")
def submit_test(test_id: int, payload: SubmitSchema, db: Session = Depends(dependencies.get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found.")

    try:
        due = datetime.fromisoformat(test.due_date)
        if datetime.now() > due:
            raise HTTPException(status_code=400, detail="This test is past its due date and is locked.")
    except ValueError:
        pass 

    existing_subs = db.query(Submission).filter(Submission.test_id == test_id, Submission.student_email == payload.student_email).all()
    max_att = getattr(test, 'max_attempts', 1)
    if len(existing_subs) >= max_att:
        raise HTTPException(status_code=400, detail=f"You have used all {max_att} attempts for this test.")

    auto_score = 0
    has_essay = False

    for index, q in enumerate(test.questions):
        q_type = q.get("type")
        points = int(q.get("points", 0))
        student_ans = str(payload.answers.get(str(index), ""))

        if q_type == "essay":
            has_essay = True  
        elif q_type == "mcq":
            correct_idx = str(q.get("correctAnswerIndex"))
            if student_ans == correct_idx:
                auto_score += points

    final_score = None if has_essay else auto_score
    final_status = SubmissionStatus.PENDING if has_essay else SubmissionStatus.GRADED

    new_sub = Submission(
        test_id=test_id, 
        student_email=payload.student_email, 
        answers=payload.answers,
        score=final_score,
        status=final_status
    )
    
    db.add(new_sub)
    db.commit()
    
    return {"message": "Test submitted and auto-graded successfully!"}

@router.get("/tests/{test_id}/submissions")
def get_test_submissions(test_id: int, db: Session = Depends(dependencies.get_db)):
    try:
        submissions = db.query(Submission).filter(Submission.test_id == test_id).all()
        data = [
            {
                "id": sub.id,
                "test_id": sub.test_id,
                "student_email": sub.student_email,
                "score": sub.score,
                "status": sub.status,
                "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
                "answers": sub.answers
            }
            for sub in submissions
        ]
        return data
    except Exception as e:
        print(f"🚨 CRASH DURING FETCH 🚨: {str(e)}")
        raise HTTPException(status_code=500, detail="Backend crashed while reading submissions.")

@router.post("/submissions/{sub_id}/grade")
def grade_submission(sub_id: int, payload: GradeSchema, db: Session = Depends(dependencies.get_db)):
    sub = db.query(Submission).filter(Submission.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")
    sub.score = payload.score
    sub.status = SubmissionStatus.GRADED
    db.commit()
    return {"message": "Grade saved successfully!"}

@router.get("/{class_id}/tests")
def get_class_tests(class_id: int, db: Session = Depends(dependencies.get_db)):
    tests = db.query(Test).filter(Test.classroom_id == class_id).all()
    return [
        {
            "id": t.id, 
            "title": t.title, 
            "due_date": t.due_date,
            "duration": getattr(t, 'duration', 60),
            "total_points": t.total_points, 
            "questions": t.questions        
        } 
        for t in tests
    ]

@router.delete("/tests/{test_id}")
def delete_test(test_id: int, db: Session = Depends(dependencies.get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found.")
    
    db.delete(test)
    db.commit()
    return {"message": "Test deleted successfully."}

@router.post("/ai/generate-test")
def generate_ai_test(payload: AITestRequest, db: Session = Depends(dependencies.get_db)):
    system_prompt = """
    You are an expert, meticulous educational assessment designer. 
    You MUST return ONLY a valid JSON object with exactly one key: 'questions'.
    'questions' must be an array of objects. Each object must have:
    - 'id': A unique string.
    - 'type': 'mcq'
    - 'text': The question text. 
    - 'points': 10
    - 'options': An array of EXACTLY 4 string options.
    - 'correctAnswerIndex': An integer (0, 1, 2, or 3) representing the correct option.
    """

    seed = f"{time.time()}-{random.randint(10000, 99999)}"
    
    user_prompt = f"""
    Topic & Difficulty Instructions: "{payload.topic}"
    Number of questions: {payload.question_count}
    Randomization Seed: {seed}
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.75, 
            response_format={"type": "json_object"} 
        )
        
        response_content = chat_completion.choices[0].message.content
        questions_data = json.loads(response_content)
        
        return {"questions": questions_data.get("questions", [])}
        
    except Exception as e:
        print(f"Groq Generation Failed: {e}")
        raise HTTPException(status_code=500, detail="AI generation failed.")
    
@router.post("/submissions/{sub_id}/ai-grade")
def ai_grade_submission(sub_id: int, db: Session = Depends(dependencies.get_db)):
    sub = db.query(Submission).filter(Submission.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")
        
    test = db.query(Test).filter(Test.id == sub.test_id).first()

    mcq_score = 0
    essays_to_grade = []

    for str_idx, student_ans in sub.answers.items():
        if int(str_idx) >= len(test.questions): continue 
        
        q = test.questions[int(str_idx)]
        points = int(q.get("points", 0))

        if q.get("type") == "mcq":
            if student_ans == str(q.get("correctAnswerIndex")):
                mcq_score += points
                
        elif q.get("type") == "essay":
            essays_to_grade.append({
                "question": q.get("text"),
                "student_answer": student_ans,
                "max_points": points
            })

    if len(essays_to_grade) == 0:
        return {
            "suggested_score": mcq_score, 
            "feedback": "No essays found. This is the exact multiple-choice score."
        }

    system_prompt = """
    You are an expert, strict, and fair grader. 
    You are provided with a JSON array of essay questions, the student's answers, and the max points for each.
    Evaluate the answers based on accuracy and completeness. 
    
    You MUST return ONLY a valid JSON object with EXACTLY these two keys:
    'essay_score': an integer representing the total points awarded for all essays combined.
    'feedback': A brief, 2-3 sentence explanation of why you deducted points (or why it was perfect).
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(essays_to_grade)}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.2, 
            response_format={"type": "json_object"} 
        )
        
        ai_resp = json.loads(chat_completion.choices[0].message.content)
        essay_score = int(ai_resp.get("essay_score", 0))
        feedback = ai_resp.get("feedback", "Evaluated by AI.")

        total_suggested = mcq_score + essay_score
        
        return {
            "suggested_score": total_suggested, 
            "feedback": feedback
        }
        
    except Exception as e:
        print(f"Groq AI Grading Failed: {e}")
        raise HTTPException(status_code=500, detail="AI grading engine failed.")
    
@router.delete("/submissions/{sub_id}")
def delete_submission(sub_id: int, db: Session = Depends(dependencies.get_db)):
    sub = db.query(Submission).filter(Submission.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")
    db.delete(sub)
    db.commit()
    return {"message": "Attempt deleted. Student can now retake the test."}

@router.post("/ai/translate")
def translate_test(payload: TranslateRequest):
    target_code = LANGUAGE_MAP.get(payload.target_language)
    if not target_code or target_code == "en":
        return {"questions": payload.questions}

    try:
        translator = GoogleTranslator(source='auto', target=target_code)
        texts_to_translate = []
        for q in payload.questions:
            if "text" in q:
                texts_to_translate.append(q["text"])
            if "options" in q:
                texts_to_translate.extend(q["options"])

        translated_texts = translator.translate_batch(texts_to_translate)
        translated_questions = []
        text_index = 0
        
        for q in payload.questions:
            new_q = q.copy() 
            if "text" in q:
                new_q["text"] = translated_texts[text_index]
                text_index += 1
            if "options" in q:
                new_options = []
                for _ in q["options"]:
                    new_options.append(translated_texts[text_index])
                    text_index += 1
                new_q["options"] = new_options
            translated_questions.append(new_q)

        return {"questions": translated_questions}
        
    except Exception as e:
        print(f"Deep Translator Batching Failed: {e}")
        raise HTTPException(status_code=500, detail="Translation failed.")