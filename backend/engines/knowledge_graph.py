import os
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

KNOWLEDGE_GRAPH = {
    "dynamic_programming": ["recursion", "memoization", "arrays"],
    "dijkstra": ["graphs", "priority_queue", "greedy_algorithms"],
    "segment_trees": ["binary_trees", "prefix_sums", "arrays"],
    "distributed_systems": ["networking", "consistency_models", "databases"],
    "transformer_architecture": ["attention_mechanism", "embeddings", "neural_networks"],
    "system_design": ["databases", "caching", "load_balancing", "microservices"],
    "kubernetes": ["docker", "containers", "networking"],
    "binary_search": ["arrays", "sorting"],
    "graph_traversal": ["graphs", "recursion", "queues"],
    "concurrency": ["threads", "locks", "operating_systems"],
    "machine_learning": ["statistics", "linear_algebra", "python"],
    "databases": ["sql", "indexing", "normalization"],
    "caching": ["hash_maps", "distributed_systems"],
    "microservices": ["apis", "docker", "networking"],
    "neural_networks": ["linear_algebra", "calculus", "statistics"]
}

class KnowledgeGapGraph:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.graph = KNOWLEDGE_GRAPH
    
    def extract_gaps(self, question: str, answer: str, technical_score: float) -> list:
        if technical_score >= 7.0:
            return []
        
        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system="Return only a JSON list of topic strings. No explanation. No markdown.",
            messages=[{"role": "user", "content":
                f"What CS topics did this answer fail to address properly?\n"
                f"Question: {question}\nAnswer: {answer}\n"
                f"Return maximum 3 topics as a JSON list like: [\"topic1\", \"topic2\"]"}]
        )
        
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        
        failed_topics = json.loads(raw.strip())
        
        study_plan = []
        for topic in failed_topics:
            topic_key = topic.lower().replace(" ", "_")
            prerequisites = self.graph.get(topic_key, [])
            study_plan.append({
                "gap": topic,
                "prerequisites_to_study_first": prerequisites,
                "urgency": "high" if technical_score < 4 else "medium"
            })
        
        return study_plan
    
    def get_full_study_path(self, topic: str) -> list:
        topic_key = topic.lower().replace(" ", "_")
        prerequisites = self.graph.get(topic_key, [])
        
        path = []
        for prereq in prerequisites:
            path.append(prereq)
        path.append(topic)
        
        return path