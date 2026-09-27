# backend/api/schemas.py
# Request models.
#
# Every free-text field has a hard max_length. Each of these strings is
# forwarded to Claude or Judge0 (both billed per call/token), so without a
# cap a single request could carry megabytes of input. The limits are far
# above anything a real answer or solution needs.

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

SupportedLanguage = Literal["python", "javascript", "java", "cpp", "c", "go"]


class StartSessionRequest(BaseModel):
    user_name: str = Field(max_length=100)
    company: str = Field(min_length=1, max_length=50)
    role: str = Field(min_length=1, max_length=100)
    elo: float = 1200.0
    persona: str = Field(default="standard", max_length=30)
    preview_id: Optional[str] = Field(default=None, max_length=64)


class SubmitAnswerRequest(BaseModel):
    session_id: int
    question: str = Field(min_length=1, max_length=5000)
    answer: str = Field(min_length=1, max_length=20000)
    difficulty: int = Field(ge=1, le=10)
    elo: float
    company: Optional[str] = Field(default=None, max_length=50)
    role: str = Field(default="Software Engineer", max_length=100)
    failed_topic: Optional[str] = Field(default=None, max_length=200)
    category: Optional[str] = Field(default=None, max_length=100)
    persona: str = Field(default="standard", max_length=30)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)
    name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class RunCodeRequest(BaseModel):
    problem_id: int
    code: str = Field(min_length=1, max_length=50000)
    language: SupportedLanguage = "python"


class SubmitCodeRequest(BaseModel):
    problem_id: int
    code: str = Field(min_length=1, max_length=50000)
    language: SupportedLanguage = "python"
    session_id: Optional[int] = None


class HintRequest(BaseModel):
    problem: str = Field(min_length=1, max_length=10000)
    current_code: str = Field(max_length=50000)
    language: SupportedLanguage = "python"


class FeedbackRatingRequest(BaseModel):
    answer_id: int
    helpful: bool


class UpdateProfileRequest(BaseModel):
    name: str = Field(max_length=200)


class UpdatePreferenceRequest(BaseModel):
    key: str = Field(max_length=64)
    value: bool


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(max_length=128)
