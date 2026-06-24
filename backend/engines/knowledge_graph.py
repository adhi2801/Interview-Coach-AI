import os
import json
import anthropic
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Topic, TopicPrerequisite, CompanyTopicWeight, CompanyTopicWeight, CompanyTopicWeight, CompanyTopicWeight, CompanyTopicWeight

load_dotenv()

class KnowledgeGapGraph:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def extract_gaps(self, question: str, answer: str, technical_score: float, company: str = None) -> list:
        if technical_score >= 7.0:
            return []

        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system="Return only a JSON list of topic strings using snake_case, matching common CS topic naming. No explanation. No markdown.",
            messages=[{"role": "user", "content":
                f"What CS topics did this answer fail to address properly?\n"
                f"Question: {question}\nAnswer: {answer}\n"
                f"Return maximum 3 topics as a JSON list like: [\"topic_name\", \"topic_name\"]"}]
        )

        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        failed_topics = json.loads(raw.strip())

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
                else:
                    # Topic not in our graph yet — still surface the gap without prerequisites
                    study_plan.append({
                        "gap": topic_name,
                        "prerequisites_to_study_first": [],
                        "urgency": "high" if technical_score < 4 else "medium",
                        "category": None,
                        "topic_difficulty": None
                    })
        finally:
            db.close()

        return study_plan

    def _get_company_weight(self, db: Session, topic_id: int, company: str = None) -> float:
        """
        Returns how important this topic is for the target company.
        Default weight is 1.0 (neutral) if no company specified or no entry exists.
        """
        if not company:
            return 1.0

        entry = db.query(CompanyTopicWeight).filter(
            CompanyTopicWeight.topic_id == topic_id,
            CompanyTopicWeight.company == company.lower()
        ).first()

        return entry.weight if entry else 1.0

    def _compute_urgency(self, technical_score: float, company_weight: float) -> str:
        """
        Combines how badly the candidate scored with how much the company
        actually cares about this topic. A weak score on a critical topic
        (high weight) is "critical" — the same weak score on an irrelevant
        topic (low weight) is just "low" priority.
        """
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
        """Recursively walks the prerequisite chain to build a full study order."""
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