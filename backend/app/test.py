# smoke_test_db.py
import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, text

# Use your Neon URL by default; env var can override
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_8KH0WJLmsgta"
    "@ep-autumn-firefly-a15fcrlk-pooler.ap-southeast-1.aws.neon.tech"
    "/neondb?sslmode=require&channel_binding=require",
)

print("Connecting to Neon…")
engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)

with engine.begin() as conn:
    # 1) create simple table
    # Drop the specific tables
    conn.execute(text("DROP TABLE IF EXISTS resources CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS projects CASCADE"))
