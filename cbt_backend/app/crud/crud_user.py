from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash

def get_user_by_email(db: Session, email: str):
    """Finds a user in the database by their email address."""
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user_in: UserCreate):
    """Hashes a user's password and saves them to the database."""
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        name=user_in.name,
        role=user_in.role,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user