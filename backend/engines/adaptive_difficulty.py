import os
import json
import anthropic
from dotenv import load_dotenv
from rag.vector_store import QuestionVectorStore
from database import SessionLocal
from models import Topic, TopicPrerequisite

load_dotenv()

# The only categories the frontend badge is allowed to render.
# Keeps Claude's classification consistent with your Topic.category values
# instead of inventing new labels every call.
VALID_CATEGORIES = [
    "algorithms", "data_structures", "system_design", "distributed_systems",
    "databases", "behavioral", "leadership", "communication",
    "machine_learning", "concurrency", "security", "networking", "oop"
]

# Persona instructions layer ON TOP of the company-DNA mutation, not instead
# of it — a Hostile Google interview is still recognizably a Google interview,
# just delivered with more edge. "standard" adds nothing extra, since the
# company mutation alone already defines the baseline tone.
PERSONA_INSTRUCTIONS = {
    "standard": "",
    "hostile": (
        "Deliver this in a hostile, skeptical interviewer voice. Push back harder on "
        "assumptions, introduce a tougher constraint sooner than you normally would, "
        "and show little patience for vague or hand-wavy reasoning."
    ),
    "socratic": (
        "Deliver this in a Socratic voice: frame the problem as a guiding question "
        "that leads the candidate to discover the right approach themselves, rather "
        "than stating requirements directively."
    ),
    "exhausted": (
        "Deliver this in a terse, low-energy voice, as if this is the fifth interview "
        "of the day. Keep the scenario and the ask short and blunt. Minimal enthusiasm, "
        "no encouragement, just the facts of the problem."
    ),
}


def _parse_json_response(raw: str) -> dict:
    """Claude sometimes wraps JSON in ```json fences despite instructions. Strip defensively."""
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    return json.loads(clean.strip())


class AdaptiveDifficultyEngine:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), timeout=30.0)
        self.vector_store = QuestionVectorStore()

    def select_question(self, elo: float, company: str, role: str, failed_topic: str = None,
                         persona: str = "standard") -> dict:
        """
        Returns: {"question": str, "category": str, "sub_category": str, "difficulty": int}
        """
        difficulty = min(10, max(1, int((elo - 800) / 100)))

        if failed_topic:
            return self._generate_prerequisite_question(failed_topic, company, role, persona)

        search_query = f"{role} real-world scenario {company} interview difficulty {difficulty}"
        candidates = self.vector_store.search(
            query=search_query,
            difficulty_min=max(1, difficulty - 1),
            difficulty_max=min(10, difficulty + 1),
            company=company,
            n_results=5
        )

        base = candidates[0] if candidates else None
        base_question = base["text"] if base else None

        # Real metadata from your seeded 60-question bank beats an LLM guess every time.
        # seed_questions.py stores "topics": [...] per question — use it if the vector
        # store surfaces it back.
        seeded_topics = base.get("topics") if base else None

        return self._mutate_with_company_dna(base_question, company, role, difficulty, seeded_topics, persona)

    def select_followup_question(self, previous_question: str, previous_answer: str, elo: float,
                                  company: str, role: str, previous_category: str = None,
                                  persona: str = "standard") -> dict:
        """
        Hostile follow-up on the SAME question track. Inherits the parent question's
        category rather than reclassifying, since it's testing the same underlying skill.
        """
        difficulty = min(10, max(1, int((elo - 800) / 100)))

        if difficulty >= 7:
            constraint_type = "scale"
        elif difficulty >= 5:
            constraint_type = "tradeoff"
        else:
            constraint_type = "clarify"

        CONSTRAINT_PROMPTS = {
            "clarify": f"Add a constraint that pushes the candidate to be more precise and rigorous — appropriate to a {role}'s actual domain (e.g. algorithmic complexity for engineering roles, statistical rigor or evaluation methodology for ML roles, measurable business impact for behavioral/communication scenarios). Do not force a complexity-analysis framing onto a role or scenario where it doesn't naturally fit.",
            "tradeoff": f"Add a realistic operational constraint relevant to a {role} (e.g. a latency budget for engineering roles, a model accuracy/fairness tradeoff for ML roles, a stakeholder buy-in constraint for communication scenarios). How does their approach change?",
            "scale": f"Add a hostile constraint that scales up the hardest real-world pressure a {role} would face in this exact scenario — not a generic 'more data, more servers' constraint unless that's genuinely what a {role} would encounter. How does their approach change?"
        }

        persona_instruction = PERSONA_INSTRUCTIONS.get(persona, "")

        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            system=f"""You are a senior {company} interviewer hiring for a {role} position. The candidate just answered a question.
            Your job is to push back with a harder follow-up constraint that stays relevant to what a {role} actually works on.
            {CONSTRAINT_PROMPTS[constraint_type]}
            {persona_instruction}

            Return ONLY valid JSON, no markdown, no preamble, exactly this shape:
            {{"scenario": "<1 sentence setting up the new pressure>", "constraints": ["<constraint>"], "ask": "<the follow-up question itself>", "sub_category": "<2-4 word specific topic>"}}""",
            messages=[{
                "role": "user",
                "content": f"Original question: {previous_question}\nCandidate's answer: {previous_answer}\nGenerate the hostile follow-up."
            }]
        )
        parsed = _parse_json_response(response.content[0].text)

        return {
            "scenario": parsed.get("scenario", ""),
            "constraints": parsed.get("constraints", []),
            "ask": parsed.get("ask", ""),
            "question": f"{parsed.get('scenario','')} {parsed.get('ask','')}".strip(),
            "category": previous_category or "system_design",
            "sub_category": parsed.get("sub_category", constraint_type),
            "difficulty": difficulty
        }

    def _generate_prerequisite_question(self, failed_topic: str, company: str, role: str,
                                         persona: str = "standard") -> dict:
        db = SessionLocal()
        try:
            topic_key = failed_topic.lower().replace(" ", "_")
            topic = db.query(Topic).filter(Topic.name == topic_key).first()
            prereq_name = None
            prereq_category = None

            if topic:
                link = db.query(TopicPrerequisite).filter(
                    TopicPrerequisite.topic_id == topic.id
                ).first()
                if link:
                    prereq = db.query(Topic).filter(Topic.id == link.prerequisite_id).first()
                    if prereq:
                        prereq_name = prereq.name.replace("_", " ")
                        prereq_category = prereq.category
        finally:
            db.close()

        target = prereq_name if prereq_name else failed_topic
        persona_instruction = PERSONA_INSTRUCTIONS.get(persona, "")

        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            system=f"""You are a {company} interviewer. The candidate just failed a question on {failed_topic}.
            Generate a real-world scenario question that tests their foundational understanding of {target}.
            Use a concrete, realistic scenario — not a definition question.
            {persona_instruction}

            Return ONLY valid JSON, no markdown, no preamble, exactly this shape:
            {{"question": "<question text>", "sub_category": "<2-4 word specific topic>"}}""",
            messages=[{
                "role": "user",
                "content": f"Generate a prerequisite scenario question about {target} for a {role} candidate."
            }]
        )
        parsed = _parse_json_response(response.content[0].text)

        # Trust the Topic table's own category column over an LLM guess when we have it.
        category = prereq_category if prereq_category else self._classify_topic_name(target)

        return {
            "question": parsed["question"],
            "category": category,
            "sub_category": parsed.get("sub_category", target),
            "difficulty": None  # prerequisite questions are intentionally not difficulty-scored
        }

    def _mutate_with_company_dna(self, base_question: str, company: str, role: str,
                                  difficulty: int, seeded_topics: list = None,
                                  persona: str = "standard") -> dict:
        COMPANY_MUTATIONS = {
            "google": "Frame this as an open-ended problem. The candidate must ask clarifying questions and think about edge cases at massive scale.",
            "amazon": "Add a constraint tied to Amazon Leadership Principles — specifically Frugality or Bias for Action. Include a deadline or budget pressure.",
            "meta": "Add a constraint: the system must handle 100,000 requests per second by Friday. Emphasize speed of execution and data-driven decisions.",
            "microsoft": "Frame this collaboratively — the candidate is working with a cross-functional team. Emphasize growth mindset and iterative improvement.",
            "apple": "Add a constraint around quality and user experience. The solution must be elegant, private, and performant.",
            "netflix": "Add a constraint emphasizing autonomy — the candidate must make a hard call with incomplete information and own the outcome.",
            "startup": "Add time and resource pressure — limited engineers, tight deadline, must decide what to cut and why.",
        }
        mutation = COMPANY_MUTATIONS.get(company.lower(), "Make this a real-world scenario with concrete constraints.")
        persona_instruction = PERSONA_INSTRUCTIONS.get(persona, "")

        DIFFICULTY_SCOPE = (
            "Keep the scope tightly bounded to a single, well-defined component with modest scale — appropriate for an early-career engineer."
            if difficulty <= 3 else
            "Moderate scope with some ambiguity — the candidate should need to make a few reasonable assumptions and consider one or two trade-offs."
            if difficulty <= 6 else
            "Broad, ambiguous scope with significant scale, cross-system trade-offs, and organizational complexity — appropriate for a senior or staff-level candidate."
        )

        json_instruction = f"""Return ONLY valid JSON, no markdown, no preamble, exactly this shape:
        {{"scenario": "<2 sentences setting the scene>", "constraints": ["<constraint 1>", "<constraint 2>", "<constraint 3>"], "ask": "<one bolded-style sentence stating exactly what is expected>", "category": "<one of: {', '.join(VALID_CATEGORIES)}>", "sub_category": "<2-4 word specific topic>"}}

        Category selection rule — classify by what skill is actually being evaluated, not the surface narrative:
        - "behavioral" is ONLY for team conflict, interpersonal judgment, or leadership decisions between people.
        - "communication" is for explaining technical concepts to a non-technical audience, writing docs, or presenting data/results — even if there's no conflict involved.
        - If the ask is really about root-causing, architecture, testing strategy, or system design — even wrapped in an incident story — use a technical category instead (system_design, concurrency, oop, algorithms, etc.), NOT "behavioral".
        - Do not default to "behavioral" just because the scenario mentions a bug, incident, or stakeholders. Pick the category that matches what the candidate is actually being asked to demonstrate."""

        if not base_question:
            prompt = f"Generate a difficulty {difficulty}/10 real-world scenario interview question for a {role} targeting {company}. {mutation} {DIFFICULTY_SCOPE}\n\n{json_instruction}"
            messages = [{"role": "user", "content": prompt}]
        else:
            messages = [{"role": "user", "content":
                f"Base question: {base_question}\n\nMutation instruction: {mutation}\n\n{DIFFICULTY_SCOPE}\n\nRewrite this as a scenario-based question specifically tailored for a {role} candidate — the scenario, constraints, and ask should reflect problems a {role} would realistically face in that role, not a generic backend/systems question.\n\n{json_instruction}"}]

        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            system=f"You are a {company} interviewer hiring for a {role} position. Generate or mutate interview questions into scenario-based, trade-off testing questions that are realistic and specific to what a {role} actually works on. No markdown, no asterisks. {persona_instruction}",
            messages=messages
        )
        parsed = _parse_json_response(response.content[0].text)

        # Prefer Claude's fresh classification of the FINAL mutated scenario over
        # a stale seed tag — the seed question may have been rewritten so heavily
        # (different role, different framing) that its original topic tag no longer
        # describes what's actually being asked.
        claude_category = parsed.get("category", "")
        if claude_category in VALID_CATEGORIES:
            category = claude_category
        elif seeded_topics:
            category = self._pick_primary_category(seeded_topics)
        else:
            category = "system_design"

        return {
            "scenario": parsed.get("scenario", ""),
            "constraints": parsed.get("constraints", []),
            "ask": parsed.get("ask", ""),
            "question": f"{parsed.get('scenario','')} {parsed.get('ask','')}".strip(),
            "category": category,
            "sub_category": parsed.get("sub_category", ", ".join(seeded_topics) if seeded_topics else ""),
            "difficulty": difficulty
        }

    def _pick_primary_category(self, topics: list) -> str:
        for t in topics:
            if t in VALID_CATEGORIES:
                return t
        return topics[0] if topics else "system_design"

    def _classify_topic_name(self, topic_name: str) -> str:
        name = topic_name.lower()
        for cat in VALID_CATEGORIES:
            if cat in name:
                return cat
        return "system_design"

    def update_elo(self, current_elo: float, question_difficulty: int, score: float) -> float:
        K = 32
        question_elo = 800 + (question_difficulty * 100)
        expected = 1 / (1 + 10 ** ((question_elo - current_elo) / 400))
        actual = score / 10
        new_elo = current_elo + K * (actual - expected)
        return round(new_elo, 1)