# backend/seed_company_weights.py
# Seeds realistic topic importance weights per company.
# weight: 0.0 (irrelevant) to 2.0 (critical) — used to rank
# knowledge gaps by what actually matters for the target company.

from database import SessionLocal
from models import Topic, CompanyTopicWeight

# Topics weighted higher than 1.0 = more critical for that company
# Topics weighted lower than 1.0 = less critical, can be deprioritized
COMPANY_WEIGHTS = {
    "google": {
        "consistency_models": 1.8, "consensus": 1.8, "distributed_systems": 1.7,
        "dynamic_programming": 1.6, "graph_traversal": 1.6, "complexity_analysis": 1.7,
        "system_design": 1.7, "caching": 1.4, "scalability": 1.5,
        "behavioral_storytelling": 0.7, "leadership": 0.8,
    },
    "amazon": {
        "behavioral_storytelling": 1.9, "leadership": 1.8, "ownership": 1.8,
        "decision_making": 1.7, "conflict_resolution": 1.6, "communication": 1.6,
        "system_design": 1.5, "scalability": 1.5, "microservices": 1.4,
        "transformer_architecture": 0.4, "cnn": 0.3,
    },
    "meta": {
        "scalability": 1.7, "caching": 1.6, "distributed_systems": 1.6,
        "machine_learning_basics": 1.5, "model_evaluation": 1.4, "statistics": 1.4,
        "graph_traversal": 1.5, "decision_making": 1.3,
        "behavioral_storytelling": 0.8,
    },
    "microsoft": {
        "growth_mindset": 1.7, "communication": 1.6, "design_patterns": 1.5,
        "solid_principles": 1.5, "oop": 1.4, "concurrency": 1.4,
        "distributed_systems": 1.3, "conflict_resolution": 1.4,
    },
    "apple": {
        "oop": 1.6, "design_patterns": 1.6, "memory_management": 1.5,
        "complexity_analysis": 1.5, "communication": 1.3,
        "behavioral_storytelling": 0.7,
    },
    "netflix": {
        "ownership": 1.8, "decision_making": 1.8, "distributed_systems": 1.7,
        "scalability": 1.6, "caching": 1.5, "consistency_models": 1.4,
        "leadership": 1.3,
    },
    "startup": {
        "ownership": 1.7, "decision_making": 1.6, "growth_mindset": 1.5,
        "rest_apis": 1.5, "sql": 1.4, "oop": 1.3,
        "consensus": 0.4, "transformer_architecture": 0.3,
    },
}


def seed_weights():
    db = SessionLocal()
    print("Seeding company-topic weights...")
    count = 0

    try:
        for company, topic_weights in COMPANY_WEIGHTS.items():
            for topic_name, weight in topic_weights.items():
                topic = db.query(Topic).filter(Topic.name == topic_name).first()
                if not topic:
                    continue

                existing = db.query(CompanyTopicWeight).filter(
                    CompanyTopicWeight.company == company,
                    CompanyTopicWeight.topic_id == topic.id
                ).first()
                if existing:
                    existing.weight = weight
                else:
                    db.add(CompanyTopicWeight(company=company, topic_id=topic.id, weight=weight))
                count += 1

        db.commit()
        print(f"Seeded {count} company-topic weight entries")
    finally:
        db.close()


if __name__ == "__main__":
    seed_weights()