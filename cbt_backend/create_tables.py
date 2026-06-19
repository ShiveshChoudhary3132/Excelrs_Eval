from app.core.database import Base, engine
# We must import all models here so SQLAlchemy registers them before building
from app.models.user import User
from app.models.classroom import Classroom
from app.models.assessment import Assessment, Question
from app.models.submission import Submission, StudentAnswer

print("Connecting to PostgreSQL and creating tables...")
# This line tells SQLAlchemy to look at 'Base' and physically build everything in the database
Base.metadata.create_all(bind=engine)
print("🎉 Success! Your CBT database tables have been built flawlessly.")