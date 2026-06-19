from sqlalchemy import Column, Integer, String, ForeignKey, Table, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

# 1. The Bridge Table
classroom_student = Table(
    'classroom_student', Base.metadata,
    Column('classroom_id', Integer, ForeignKey('classrooms.id', ondelete="CASCADE")),
    Column('user_id', Integer, ForeignKey('users.id', ondelete="CASCADE"))
)

# 2. The Classroom Model
class Classroom(Base):
    __tablename__ = "classrooms"
    
    id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    
    students = relationship("User", secondary=classroom_student, backref="enrolled_classes")
    # Tell the classroom it owns multiple tests
    tests = relationship("Test", back_populates="classroom", cascade="all, delete-orphan")

# 3. THE NEW TEST MODEL
class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    due_date = Column(String)
    duration = Column(Integer, default=60)
    
    # --- ADD THIS MISSING LINE ---
    max_attempts = Column(Integer, default=1) 
    # -----------------------------
    
    total_points = Column(Integer)
    questions = Column(JSON)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"))

    classroom = relationship("Classroom", back_populates="tests")
    
    # Note: If your submissions relationship looks slightly different, keep yours!
    submissions = relationship("Submission", back_populates="test", cascade="all, delete-orphan")