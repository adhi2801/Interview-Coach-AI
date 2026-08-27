from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
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
    # Real per-user settings — sound effects, live coaching telemetry,
    # high-contrast editor. Nullable/defaults to {} for existing users;
    # the frontend applies its own sensible defaults for any key that
    # isn't present yet rather than assuming NULL means "off".
    preferences = Column(JSON, nullable=True)

    sessions = relationship("InterviewSession", back_populates="user")


class InterviewSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    company_target = Column(String)
    role = Column(String)
    persona = Column(String, nullable=True)  # "standard" | "hostile" | "socratic" | "exhausted" — set once at session start
    difficulty_level = Column(Integer, default=5)
    audio_file_path = Column(String)
    elo_after = Column(Float, nullable=True)  # snapshot of user's ELO after the latest scored answer in this session — powers the Rating History chart with real data instead of always showing the current live ELO
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)

    user = relationship("User", back_populates="sessions")
    answers = relationship("Answer", back_populates="session")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    question_text = Column(Text)
    answer_text = Column(Text)
    score_technical = Column(Float)
    score_communication = Column(Float)
    score_problem_solving = Column(Float)
    score_cultural_fit = Column(Float)
    score_confidence = Column(Float)
    topics_covered = Column(JSON)
    gaps_identified = Column(JSON)
    feedback_helpful = Column(Integer, nullable=True)  # 1 = thumbs up, 0 = thumbs down, null = not rated
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
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"))
    prerequisite_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"))


class CompanyTopicWeight(Base):
    __tablename__ = "company_topic_weights"

    id = Column(Integer, primary_key=True)
    company = Column(String, nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"))
    weight = Column(Float, default=1.0)


class ScoringJob(Base):
    __tablename__ = "scoring_jobs"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"))
    status = Column(String, default="processing")  # processing | done | failed
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ADD THESE THREE CLASSES to backend/models.py
# (append after your existing ScoringJob class — same file, same Base)
#
# Why three tables instead of one: a problem has many test cases (one-to-many),
# and a submission needs to reference both the problem AND the user/session
# independently of the interview track's Answer table, since a coding attempt
# has a different shape (code + language + test results, not a text answer + 5 scores).

class CodingProblem(Base):
    __tablename__ = "coding_problems"

    id = Column(Integer, primary_key=True)
    slug = Column(String, unique=True, nullable=False)  # "two_sum", "lru_cache" — used in the URL and by seed scripts
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    starter_code = Column(JSON)  # {"python": "def two_sum(nums, target):\n    pass", "javascript": "..."}
    difficulty = Column(Integer, default=5)  # 1-10, same scale as Topic.difficulty_level for consistency
    topics = Column(JSON)  # ["arrays", "hash_maps"] — reuses your existing topic taxonomy where it overlaps
    companies = Column(JSON)  # ["google", "amazon"] — same pattern as seed_questions.py
    input_format = Column(Text, nullable=True)
    output_format = Column(Text, nullable=True)
    constraints = Column(JSON, nullable=True)
    time_complexity_target = Column(String, nullable=True)
    space_complexity_target = Column(String, nullable=True)

    test_cases = relationship("CodingTestCase", back_populates="problem")


class CodingTestCase(Base):
    __tablename__ = "coding_test_cases"

    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("coding_problems.id", ondelete="CASCADE"), index=True)
    input_data = Column(Text)  # raw stdin the program will receive
    expected_output = Column(Text)  # raw stdout expected back
    is_hidden = Column(Integer, default=1)  # 0 = visible sample (shown to candidate, used by "Run")
                                            # 1 = hidden grading case (only used by "Submit")

    problem = relationship("CodingProblem", back_populates="test_cases")


class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=True)  # nullable: coding can be practiced standalone, not just inside a full interview session
    problem_id = Column(Integer, ForeignKey("coding_problems.id", ondelete="CASCADE"), index=True)

    code = Column(Text)
    language = Column(String, default="python")

    tests_passed = Column(Integer)
    tests_total = Column(Integer)
    complexity_estimate = Column(String, nullable=True)   # from coding_engine.grade_submission()
    cleanliness_score = Column(Float, nullable=True)
    naming_score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    elo_after = Column(Float, nullable=True)

    submitted_at = Column(DateTime, default=datetime.utcnow)    


# ADD THIS CLASS to backend/models.py
# (append after CodingSubmission, or wherever you put the coding classes)
#
# Replaces the local-disk JSON files in ./replays/. One row per interview
# session, with the full event log stored as a JSON column — same shape
# as the old session_{id}.json manifest, just durable now instead of living
# on Railway's ephemeral filesystem.

class ReplayManifest(Base):
    __tablename__ = "replay_manifests"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_name = Column(String)
    company = Column(String)
    role = Column(String)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    events = Column(JSON, default=list)  # same event shape as before: {"type", "timestamp", "data"}    


class QuestionEmbedding(Base):
    __tablename__ = "question_embeddings"

    id = Column(String, primary_key=True)  # matches QUESTION_BANK's own "id" field, e.g. "q1"
    text = Column(Text, nullable=False)
    difficulty = Column(Integer, nullable=False)
    topics = Column(JSON)      # list of strings
    companies = Column(JSON)   # list of strings
    embedding = Column(JSON, nullable=False)  # list of 384 floats from all-MiniLM-L6-v2