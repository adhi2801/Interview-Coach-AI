from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. Set it in your "
        ".env / deployment environment before running the app."
    )

# Railway gives Postgres URLs starting with "postgres://"
# but SQLAlchemy needs "postgresql://" — this line fixes that automatically
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Only SQLite needs this special connect_args; Postgres doesn't
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    # Cloud Postgres providers (Railway included) silently drop idle
    # connections after a timeout. Without pool_pre_ping, SQLAlchemy can
    # hand out a dead connection from the pool and the app fails with a
    # confusing, intermittent "server closed the connection unexpectedly"
    # error that only shows up after a period of inactivity. pool_pre_ping
    # tests each connection before use and transparently reconnects if it's
    # dead. pool_recycle proactively retires connections before they'd hit
    # that idle timeout in the first place, as a second line of defense.
    pool_pre_ping=True,
    pool_recycle=280,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    from models import Base
    Base.metadata.create_all(bind=engine)