from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum
from datetime import datetime
from sqlalchemy import DateTime

class SubmissionStatus(enum.Enum):
    PENDING = "pending"
    GRADED = "graded"

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id")) # <--- Ensure you have this ForeignKey
    student_email = Column(String, index=True)
    answers = Column(JSON)
    score = Column(Integer, nullable=True)
    status = Column(SQLEnum(SubmissionStatus), default=SubmissionStatus.PENDING)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    # --- ADD THIS LINE TO COMPLETE THE BRIDGE ---
    test = relationship("Test", back_populates="submissions")
    # ------------------------------------------