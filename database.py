from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

DB_URI='postgresql://Cyclova_owner:npg_5NgAcpLuvYb0@ep-red-grass-a4jcxm9u-pooler.us-east-1.aws.neon.tech/Cyclova?sslmode=require'
engine = create_engine(DB_URI, echo=True)
Base = declarative_base()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:    
        db.close()
    