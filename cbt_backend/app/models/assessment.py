from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class AssessmentType(str, enum.Enum):
    TEST = "test"
    ASSIGNMENT = "assignment"

class QuestionType(str, enum.Enum):
    MCQ = "mcq"
    ESSAY = "essay"

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    type = Column(Enum(AssessmentType), nullable=False, default=AssessmentType.TEST)
    due_date = Column(DateTime, nullable=False)
    total_points = Column(Integer, nullable=False)

    questions = relationship("Question", back_populates="assessment", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(String, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    options = Column(JSON, nullable=True) # Used for MCQ options list. Nullable for essay questions.
    correct_answer = Column(String, nullable=False) # The correct answer string or key

    assessment = relationship("Assessment", back_populates="questions")