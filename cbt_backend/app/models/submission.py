from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Float, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum
from datetime import datetime

class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    GRADED = "graded"

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    # Linked directly to the 'tests' table we created in classroom.py
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    student_email = Column(String, nullable=False) 
    score = Column(Float, nullable=True) 
    status = Column(Enum(SubmissionStatus), nullable=False, default=SubmissionStatus.PENDING)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    # Inside class Submission(Base):
    test = relationship("Test", back_populates="submissions")
    # We store the React frontend's answers block right here
    answers = Column(JSON, nullable=False)