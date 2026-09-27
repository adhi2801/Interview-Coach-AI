# backend/api/services.py
# Process-wide singletons every router shares: the engines, external
# clients, and the per-user daily token budget. Routers reference these as
# `services.<name>` (not `from api.services import <name>`) so tests can
# swap any of them in one place.

import os

import redis
from dotenv import load_dotenv

from code_executor import CodeExecutor
from coding_engine import CodingEngine
from engines.adaptive_difficulty import AdaptiveDifficultyEngine
from engines.company_dna import CompanyDNAEngine
from engines.knowledge_graph import KnowledgeGapGraph
from engines.peer_comparison import PeerComparisonEngine
from engines.replay_system import ReplaySystem
from engines.scoring import MultiDimensionalScorer
from engines.transcriber import Transcriber
from timeutil import utcnow

load_dotenv()

try:
    redis_client = redis.from_url(os.getenv("REDIS_URL"), decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
except Exception:
    redis_client = None  # same fail-open pattern as company_dna.py — don't crash the app if Redis is down

difficulty_engine = AdaptiveDifficultyEngine()
scorer = MultiDimensionalScorer()
company_engine = CompanyDNAEngine()
gap_engine = KnowledgeGapGraph()
peer_engine = PeerComparisonEngine()
replay_system = ReplaySystem()
coding_engine = CodingEngine()
code_executor = CodeExecutor()
transcriber = Transcriber()

DAILY_TOKEN_BUDGET = 20000  # tune this — rough starting point for a free-tier user


def estimate_tokens(text: str) -> int:
    # Rough approximation: ~4 characters per token for English text.
    # Not exact, but doesn't need to be — this is a budget GUARD, not billing.
    return len(text) // 4


def check_and_charge_token_budget(user_id: int, estimated_tokens: int) -> bool:
    """Returns True if the user is under budget and the charge was applied,
    False if they're over budget and should be rejected."""
    if not redis_client or not user_id:
        return True  # fail open — same philosophy as the caching layer

    key = f"token_budget:{user_id}:{utcnow().strftime('%Y-%m-%d')}"
    current = redis_client.get(key)
    current = int(current) if current else 0

    if current + estimated_tokens > DAILY_TOKEN_BUDGET:
        return False

    pipe = redis_client.pipeline()
    pipe.incrby(key, estimated_tokens)
    pipe.expire(key, 60 * 60 * 26)  # slightly over 24h so it always outlives "today" in any timezone
    pipe.execute()
    return True
