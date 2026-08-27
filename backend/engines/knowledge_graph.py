import os
import re
import time
import json
import structlog
import anthropic
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Topic, TopicPrerequisite, CompanyTopicWeight

load_dotenv()

logger = structlog.get_logger()


def _strip_markdown_fence(raw: str) -> str:
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
    return match.group(1).strip() if match else raw


def _call_claude_topic_list(client, context: str, **create_kwargs) -> list:
    last_err = None
    for attempt in range(2):
        try:
            response = client.messages.create(**create_kwargs)
            raw = response.content[0].text.strip()
            raw = _strip_markdown_fence(raw)
            return json.loads(raw)
        except Exception as e:
            last_err = e
            logger.warning(
                "knowledge_graph_claude_call_failed",
                context=context,
                attempt=attempt + 1,
                error=str(e),
                error_type=type(e).__name__,
            )
            if attempt == 0:
                time.sleep(1.5)

    logger.error("knowledge_graph_claude_call_all_attempts_failed", context=context, error=str(last_err))
    return []


_topic_names_cache = None


def _get_cached_topic_names() -> list:
    global _topic_names_cache
    if _topic_names_cache is None:
        db = SessionLocal()
        try:
            _topic_names_cache = [t.name for t in db.query(Topic).all()]
        finally:
            db.close()
    return _topic_names_cache


class KnowledgeGapGraph:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), timeout=30.0)

    def extract_gaps(self, question: str, answer: str, technical_score: float, company: str = None) -> list:
        if technical_score >= 7.0:
            return []

        db_topics = _get_cached_topic_names()
        topic_list_str = ", ".join(db_topics)

        failed_topics = _call_claude_topic_list(
            self.client,
            "extract_gaps",
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=f"""Return only a JSON list of topic strings. No explanation. No markdown.
            You MUST choose only from this exact list of valid topics — do not invent new ones:
            {topic_list_str}
            If none of these topics genuinely apply, return an empty list [].""",
            messages=[{"role": "user", "content":
                f"What CS topics from the list did this answer fail to address properly?\n"
                f"Question: {question}\nAnswer: {answer}\n"
                f"Return maximum 3 topics as a JSON list like: [\"topic_name\", \"topic_name\"]"}]
        )

        db = SessionLocal()
        study_plan = []
        try:
            for topic_name in failed_topics:
                topic_key = topic_name.lower().replace(" ", "_")
                topic = db.query(Topic).filter(Topic.name == topic_key).first()

                if topic:
                    prereqs = self._get_prerequisites(db, topic.id)
                    company_weight = self._get_company_weight(db, topic.id, company)
                    study_plan.append({
                        "gap": topic_name,
                        "prerequisites_to_study_first": prereqs,
                        "urgency": self._compute_urgency(technical_score, company_weight),
                        "category": topic.category,
                        "topic_difficulty": topic.difficulty_level,
                        "company_relevance": company_weight
                    })
        finally:
            db.close()

        return study_plan

    def identify_topics_addressed(self, question: str, answer: str) -> list:
        db_topics = _get_cached_topic_names()
        topic_list_str = ", ".join(db_topics)

        topics = _call_claude_topic_list(
            self.client,
            "identify_topics_addressed",
            model="claude-sonnet-4-6",
            max_tokens=150,
            system=f"""Return only a JSON list of topic strings. No explanation. No markdown.
            You MUST choose only from this exact list of valid topics — do not invent new ones:
            {topic_list_str}
            List every topic this answer meaningfully engaged with, regardless of quality.
            If none apply, return an empty list [].""",
            messages=[{"role": "user", "content":
                f"Which CS topics from the list did this answer engage with?\n"
                f"Question: {question}\nAnswer: {answer}\n"
                f"Return maximum 4 topics as a JSON list like: [\"topic_name\", \"topic_name\"]"}]
        )

        return [t.lower().replace(" ", "_") for t in topics if isinstance(t, str)]

    def _get_company_weight(self, db: Session, topic_id: int, company: str = None) -> float:
        if not company:
            return 1.0
        entry = db.query(CompanyTopicWeight).filter(
            CompanyTopicWeight.topic_id == topic_id,
            CompanyTopicWeight.company == company.lower()
        ).first()
        return entry.weight if entry else 1.0

    def _compute_urgency(self, technical_score: float, company_weight: float) -> str:
        severity = (10 - technical_score) * company_weight
        if severity >= 14:
            return "critical"
        elif severity >= 9:
            return "high"
        elif severity >= 5:
            return "medium"
        return "low"

    def _get_prerequisites(self, db: Session, topic_id: int) -> list:
        links = db.query(TopicPrerequisite).filter(TopicPrerequisite.topic_id == topic_id).all()
        prereq_names = []
        for link in links:
            prereq_topic = db.query(Topic).filter(Topic.id == link.prerequisite_id).first()
            if prereq_topic:
                prereq_names.append(prereq_topic.name)
        return prereq_names

    def get_full_study_path(self, topic_name: str) -> list:
        db = SessionLocal()
        visited = set()
        path = []

        def visit(name):
            if name in visited:
                return
            visited.add(name)
            topic = db.query(Topic).filter(Topic.name == name).first()
            if not topic:
                return
            prereqs = self._get_prerequisites(db, topic.id)
            for p in prereqs:
                visit(p)
            path.append(name)

        try:
            visit(topic_name.lower().replace(" ", "_"))
        finally:
            db.close()

        return path