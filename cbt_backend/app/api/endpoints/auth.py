from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import dependencies
from app.crud import crud_user
from app.schemas import user as user_schema
from app.core.security import create_access_token

router = APIRouter()

@router.post("/register", response_model=user_schema.UserResponse)
def register_user(user_in: user_schema.UserCreate, db: Session = Depends(dependencies.get_db)):
    """Endpoint for both teachers and students to create an account."""
    
    # Prevent registration crash if someone uses a massive password
    if len(user_in.password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password is too long. Maximum allowed is 72 characters."
        )
        
    db_user = crud_user.get_user_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email address already exists."
        )
    return crud_user.create_user(db=db, user_in=user_in)

@router.post("/login", response_model=user_schema.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(dependencies.get_db)):
    """
    Standard login endpoint. FastAPI's OAuth2 form expects 'username' (we use email) 
    and 'password'. Returns the JWT token.
    """
    user = crud_user.get_user_by_email(db, email=form_data.username)
    
    # If no user found, throw generic 401
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Try to verify the password, catching bcrypt's 72-byte limit crash
    try:
        is_valid_password = dependencies.pwd_context.verify(form_data.password, user.hashed_password)
    except ValueError:
        is_valid_password = False

    if not is_valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # ==========================================
    # NEW: STRICT ROLE VERIFICATION
    # ==========================================
    # The frontend will pass the intended portal ("student" or "teacher") in the client_id field.
    requested_portal = form_data.client_id
    
    if requested_portal and user.role.value != requested_portal:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. This is a {user.role.value} account, please use the correct login portal."
        )
    
    # Encode their identity and role into the JWT token
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}