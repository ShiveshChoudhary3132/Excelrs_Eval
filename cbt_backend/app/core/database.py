from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Create the SQLAlchemy engine using the URL from our config
engine = create_engine(settings.DATABASE_URL)

# Create a customized Session class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This is the base class all our future database models will inherit from
Base = declarative_base()