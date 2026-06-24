from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    hashed_password = Column(String, nullable=False)
    elo_rating = Column(Float, default=1200.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("InterviewSession", back_populates="user")


class InterviewSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_target = Column(String)
    role = Column(String)
    difficulty_level = Column(Integer, default=5)
    audio_file_path = Column(String)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)

    user = relationship("User", back_populates="sessions")
    answers = relationship("Answer", back_populates="session")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    question_text = Column(Text)
    answer_text = Column(Text)
    score_technical = Column(Float)
    score_communication = Column(Float)
    score_problem_solving = Column(Float)
    score_cultural_fit = Column(Float)
    score_confidence = Column(Float)
    topics_covered = Column(JSON)
    gaps_identified = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="answers")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    category = Column(String)
    difficulty_level = Column(Integer, default=5)
    description = Column(Text)


class TopicPrerequisite(Base):
    __tablename__ = "topic_prerequisites"

    id = Column(Integer, primary_key=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    prerequisite_id = Column(Integer, ForeignKey("topics.id"))


class CompanyTopicWeight(Base):
    __tablename__ = "company_topic_weights"

    id = Column(Integer, primary_key=True)
    company = Column(String, nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    weight = Column(Float, default=1.0)