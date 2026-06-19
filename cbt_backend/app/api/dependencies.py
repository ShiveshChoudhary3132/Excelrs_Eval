from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import pwd_context
from app.models.user import User, UserRole
from app.schemas.user import TokenData

# Tells FastAPI where to look for the security token (the /auth/login endpoint)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_db() -> Generator:
    """
    Creates a temporary database session for a single request, 
    and automatically closes it when the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    """
    Decodes the user's JWT token, verifies they exist in the system, 
    and returns their current User database object.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the encrypted token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=role)
    except JWTError:
        raise credentials_exception
        
    # Look up the user in the database
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    """Guards an endpoint; throws an error if the logged-in user is a student."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The requested action requires teacher privileges."
        )
    return current_user

def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    """Guards an endpoint; throws an error if the logged-in user is a teacher."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The requested action requires student privileges."
        )
    return current_user