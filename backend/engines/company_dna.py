import os
import time
import redis
import json as json_module
import structlog
from llm import CLAUDE_MODEL, make_client, strip_markdown_fence
from dotenv import load_dotenv

load_dotenv()

logger = structlog.get_logger()

try:
    redis_client = redis.from_url(os.getenv("REDIS_URL"), decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
except Exception:
    redis_client = None

REQUIRED_PROFILE_KEYS = ["name", "focus_areas", "behavioral_framework", "question_style", "red_flags", "green_flags", "values", "typical_rounds", "difficulty_bias"]

COMPANY_PROFILES = {
    "google": {
        "name": "Google", "focus_areas": "algorithms data-structures system-design scalability",
        "behavioral_framework": "STAR method aligned with Google's 4 core attributes",
        "typical_rounds": "2x Coding · 1x System Design · 1x Googley", "difficulty_bias": 1.3,
        "question_style": "Open-ended, ambiguous, expects clarifying questions",
        "red_flags": ["No clarifying questions", "Skips edge cases", "Can't estimate complexity"],
        "green_flags": ["Structured approach", "Thinks out loud", "Tests their own solution"],
        "values": ["Googleyness", "General Cognitive Ability", "Leadership", "Role-Related Knowledge"]
    },
    "amazon": {
        "name": "Amazon", "focus_areas": "leadership-principles behavioral system-design ownership",
        "behavioral_framework": "14 Leadership Principles — every answer must map to one",
        "typical_rounds": "1x System Design · 3x Leadership Principles", "difficulty_bias": 1.0,
        "question_style": "Tell me about a time... situation-based, evidence-required",
        "red_flags": ["Vague examples", "No measurable impact", "Blames teammates"],
        "green_flags": ["Specific metrics", "Ownership mindset", "Customer-first thinking"],
        "values": ["Customer Obsession", "Ownership", "Invent and Simplify", "Dive Deep"]
    },
    "meta": {
        "name": "Meta", "focus_areas": "product-sense data-analysis growth coding impact",
        "behavioral_framework": "Impact-focused, move fast, data-driven decisions",
        "typical_rounds": "2x Coding · 1x System Design · 1x Behavioral", "difficulty_bias": 1.1,
        "question_style": "Product-first, how would you build X for 3 billion users",
        "red_flags": ["No data-driven thinking", "Over-engineering", "Ignores scale"],
        "green_flags": ["Ships fast", "A/B testing mindset", "Social impact awareness"],
        "values": ["Move Fast", "Be Bold", "Focus on Impact", "Be Open"]
    },
    "microsoft": {
        "name": "Microsoft", "focus_areas": "growth-mindset collaboration design-patterns cloud-azure",
        "behavioral_framework": "Growth mindset, learn from failure, team player",
        "typical_rounds": "2x Coding · 2x System Design · 1x Hiring Manager", "difficulty_bias": 0.9,
        "question_style": "Collaborative problem solving, explain your reasoning",
        "red_flags": ["Fixed mindset", "Not asking for help", "Dismissing feedback"],
        "green_flags": ["Iterative improvement", "Cross-team collaboration", "Azure awareness"],
        "values": ["Growth Mindset", "Diversity and Inclusion", "One Microsoft", "Integrity"]
    },
    "apple": {
        "name": "Apple", "focus_areas": "design-thinking quality system-design user-experience",
        "behavioral_framework": "Attention to detail, privacy-first, craftsmanship",
        "typical_rounds": "3x Technical Deep Dive · 1x Behavioral", "difficulty_bias": 1.2,
        "question_style": "Deep technical dives, focus on quality over speed",
        "red_flags": ["Sloppy solutions", "Ignoring user experience", "Privacy oversight"],
        "green_flags": ["Pixel-perfect thinking", "Performance obsession", "Simplicity"],
        "values": ["Privacy", "Quality", "Innovation", "Simplicity"]
    },
    "netflix": {
        "name": "Netflix", "focus_areas": "streaming distributed-systems freedom-responsibility culture",
        "behavioral_framework": "Freedom and Responsibility — high autonomy, high accountability",
        "typical_rounds": "1x Core Tech · 2x System Design · 1x Culture", "difficulty_bias": 1.2,
        "question_style": "Context not control, judgment over rules",
        "red_flags": ["Needs micromanagement", "Avoids hard decisions", "Process-dependent"],
        "green_flags": ["Independent thinking", "Data-driven", "Candid communication"],
        "values": ["Freedom", "Responsibility", "Candor", "Innovation"]
    },
    "startup": {
        "name": "Startup", "focus_areas": "practical-coding culture-fit adaptability speed",
        "behavioral_framework": "Move fast, wear many hats, ship it",
        "typical_rounds": "1x Pairing · 1x Architecture · 1x Founder Fit", "difficulty_bias": 0.8,
        "question_style": "Practical take-home style, real problems we face",
        "red_flags": ["Rigid thinking", "Needs big team support", "Slow decision making"],
        "green_flags": ["Scrappy", "Full-stack thinking", "Entrepreneurial mindset"],
        "values": ["Speed", "Impact", "Adaptability", "Ownership"]
    }
}


LIST_KEYS = ("red_flags", "green_flags", "values")
MAX_LOCAL_CACHE = 256


def is_known_company(company_name: str) -> bool:
    return company_name.lower().strip() in COMPANY_PROFILES


def _sanitize_profile(profile: dict, company_name: str) -> dict:
    """Generated profiles are rendered in the UI and fed into later prompts,
    so types are enforced rather than trusted: lists are lists of short
    strings, and difficulty_bias is a number in its documented range."""
    clean = {k: profile[k] for k in REQUIRED_PROFILE_KEYS if k in profile}
    for key in LIST_KEYS:
        value = clean.get(key)
        items = value if isinstance(value, list) else [value] if value else []
        clean[key] = [str(item)[:120] for item in items][:8]
    for key in set(REQUIRED_PROFILE_KEYS) - set(LIST_KEYS) - {"difficulty_bias"}:
        clean[key] = str(clean.get(key) or "")[:300]
    clean["name"] = clean["name"] or company_name.title()
    try:
        bias = float(clean.get("difficulty_bias"))
    except (TypeError, ValueError):
        bias = 1.0
    clean["difficulty_bias"] = round(min(1.4, max(0.7, bias)), 2)
    return clean


class CompanyDNAEngine:
    def __init__(self):
        self.client = make_client()
        # Fallback cache for when Redis is down or not configured: without
        # it, every request for the same unknown company paid for a new
        # Claude call.
        self._local_cache: dict[str, dict] = {}

    def get_profile(self, company_name: str) -> dict:
        key = company_name.lower().strip()
        if key in COMPANY_PROFILES:
            return dict(COMPANY_PROFILES[key])
        if key in self._local_cache:
            return dict(self._local_cache[key])

        cache_key = f"company_dna:{key}"
        if redis_client:
            cached = redis_client.get(cache_key)
            if cached:
                return json_module.loads(cached)

        profile, generated_successfully = self._generate_dynamic_profile(company_name)

        if generated_successfully:
            profile = _sanitize_profile(profile, company_name)
            if len(self._local_cache) >= MAX_LOCAL_CACHE:
                self._local_cache.pop(next(iter(self._local_cache)))
            self._local_cache[key] = profile
            if redis_client:
                redis_client.setex(cache_key, 60 * 60 * 24 * 7, json_module.dumps(profile))

        return dict(profile)

    def _generate_dynamic_profile(self, company_name: str) -> tuple:
        for attempt in range(2):
            try:
                response = self.client.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=500,
                    system="Return only valid JSON. No preamble. No markdown.",
                    messages=[{"role": "user", "content":
                        f"Generate an interview profile for {company_name} with exactly these keys: "
                        f"name, focus_areas, behavioral_framework, question_style, red_flags, green_flags, values, "
                        f"typical_rounds, difficulty_bias "
                        f"(typical_rounds should be a short string like '2x Coding · 1x System Design · 1x Behavioral', "
                        f"difficulty_bias should be a float between 0.7 and 1.4 reflecting how demanding this company's "
                        f"interviews are relative to average, 1.0 = average)"}]
                )
                raw = response.content[0].text.strip()
                raw = strip_markdown_fence(raw)

                profile = json_module.loads(raw)
                if all(k in profile for k in REQUIRED_PROFILE_KEYS):
                    return profile, True
                logger.warning("company_dna_incomplete_profile", company=company_name, attempt=attempt + 1, missing=[k for k in REQUIRED_PROFILE_KEYS if k not in profile])
            except Exception as e:
                logger.warning("company_dna_generation_failed", company=company_name, attempt=attempt + 1, error=str(e))
            if attempt == 0:
                time.sleep(1.5)

        logger.error("company_dna_all_attempts_failed", company=company_name)
        return {
            "name": company_name.title(),
            "focus_areas": "general software engineering practices",
            "behavioral_framework": "Standard behavioral interview approach",
            "question_style": "Realistic scenario-based questions",
            "red_flags": ["Vague reasoning", "No trade-off analysis"],
            "green_flags": ["Structured thinking", "Clear communication"],
            "values": ["Problem Solving", "Collaboration"],
            "typical_rounds": "2x Technical · 1x Behavioral",
            "difficulty_bias": 1.0,
        }, False

    def get_interviewer_prompt(self, company_name: str, role: str) -> str:
        profile = self.get_profile(company_name)
        return f"""You are a {profile['name']} interviewer hiring for {role}.
        Focus areas: {profile['focus_areas']}
        Interview style: {profile['question_style']}
        Green flags to reward: {', '.join(profile['green_flags'])}
        Red flags to watch: {', '.join(profile['red_flags'])}
        Company values: {', '.join(profile['values'])}"""

    def list_companies(self) -> list:
        return list(COMPANY_PROFILES.keys())