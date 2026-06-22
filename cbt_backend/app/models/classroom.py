from sqlalchemy import Column, Integer, String, ForeignKey, Table, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

# 1. The Bridge Tables for Many-to-Many Relationships
classroom_student = Table(
    'classroom_student', Base.metadata,
    Column('classroom_id', Integer, ForeignKey('classrooms.id', ondelete="CASCADE")),
    Column('user_id', Integer, ForeignKey('users.id', ondelete="CASCADE"))
)

# --- NEW: Bridge table to allow multiple teachers to share a classroom ---
classroom_teacher = Table(
    'classroom_teacher', Base.metadata,
    Column('classroom_id', Integer, ForeignKey('classrooms.id', ondelete="CASCADE")),
    Column('user_id', Integer, ForeignKey('users.id', ondelete="CASCADE"))
)

# 2. The Classroom Model
class Classroom(Base):
    __tablename__ = "classrooms"
    
    id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String, index=True)
    
    # Relationships
    students = relationship("User", secondary=classroom_student, backref="enrolled_classes")
    teachers = relationship("User", secondary=classroom_teacher, backref="teaching_classes")
    
    tests = relationship("Test", back_populates="classroom", cascade="all, delete-orphan")


# 3. The Test Model
class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    due_date = Column(String)
    duration = Column(Integer, default=60)
    
    max_attempts = Column(Integer, default=1) 
    
    total_points = Column(Integer)
    questions = Column(JSON)
    
    # --- NEW: Added ondelete="CASCADE" to prevent DB crashes when a classroom is deleted ---
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="CASCADE"))

    classroom = relationship("Classroom", back_populates="tests")
    submissions = relationship("Submission", back_populates="test", cascade="all, delete-orphan")