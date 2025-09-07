# app/db.py
import os
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

NEON_URL = (
    "postgresql://neondb_owner:npg_8KH0WJLmsgta"
    "@ep-autumn-firefly-a15fcrlk-pooler.ap-southeast-1.aws.neon.tech"
    "/neondb?sslmode=require&channel_binding=require"
)
DATABASE_URL = os.getenv("DATABASE_URL", NEON_URL)

ECHO = os.getenv("SQLALCHEMY_ECHO", "0").lower() in ("1", "true", "yes")

parts = urlparse(DATABASE_URL)
host = parts.hostname or ""
port = f":{parts.port}" if parts.port else ""
print(f"[DB] Connecting to: {parts.scheme}://{parts.username or '***'}:***@{host}{port}{parts.path} (echo={ECHO})")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True, echo=ECHO)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
