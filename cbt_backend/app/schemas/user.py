from pydantic import BaseModel
from typing import Optional
from app.models.user import UserRole

# Core fields shared across user data
class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole

# What data is required when registering a new user
class UserCreate(UserBase):
    password: str

# What data we safely send BACK to the frontend (notice password is excluded)
class UserResponse(UserBase):
    id: int

    # This tells Pydantic to read data even if it comes directly from a database model
    model_config = {"from_attributes": True}

# Schemas for handling Login authentication tokens
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None