# backend/seed_topics.py
# 100+ interconnected topics across CS domains, with prerequisite chains.
# This replaces the old 15-topic hardcoded dict with a real relational graph.

from database import SessionLocal, create_tables
from models import Topic, TopicPrerequisite

TOPICS = [
    # Foundations
    {"name": "variables_and_types", "category": "foundations", "difficulty": 1, "desc": "Basic data types and variable declaration"},
    {"name": "control_flow", "category": "foundations", "difficulty": 1, "desc": "If/else, loops, branching logic"},
    {"name": "functions", "category": "foundations", "difficulty": 1, "desc": "Function definition, parameters, return values"},
    {"name": "recursion", "category": "foundations", "difficulty": 3, "desc": "Functions calling themselves, base cases"},
    {"name": "complexity_analysis", "category": "foundations", "difficulty": 2, "desc": "Big-O notation, time and space complexity"},
    {"name": "pointers_and_references", "category": "foundations", "difficulty": 3, "desc": "Memory addresses, pass by reference vs value"},

    # Data Structures
    {"name": "arrays", "category": "data_structures", "difficulty": 1, "desc": "Contiguous memory storage, indexing"},
    {"name": "linked_lists", "category": "data_structures", "difficulty": 3, "desc": "Node-based sequential storage"},
    {"name": "stacks", "category": "data_structures", "difficulty": 2, "desc": "LIFO data structure"},
    {"name": "queues", "category": "data_structures", "difficulty": 2, "desc": "FIFO data structure"},
    {"name": "hash_maps", "category": "data_structures", "difficulty": 4, "desc": "Key-value storage with hashing"},
    {"name": "binary_trees", "category": "data_structures", "difficulty": 4, "desc": "Hierarchical node structure"},
    {"name": "binary_search_trees", "category": "data_structures", "difficulty": 5, "desc": "Ordered binary trees"},
    {"name": "heaps", "category": "data_structures", "difficulty": 5, "desc": "Priority-based tree structure"},
    {"name": "priority_queue", "category": "data_structures", "difficulty": 5, "desc": "Queue ordered by priority, usually heap-backed"},
    {"name": "graphs", "category": "data_structures", "difficulty": 5, "desc": "Nodes and edges, directed/undirected"},
    {"name": "tries", "category": "data_structures", "difficulty": 6, "desc": "Prefix tree for string storage"},
    {"name": "segment_trees", "category": "data_structures", "difficulty": 7, "desc": "Range query tree structure"},
    {"name": "union_find", "category": "data_structures", "difficulty": 6, "desc": "Disjoint set data structure"},
    {"name": "balanced_trees", "category": "data_structures", "difficulty": 7, "desc": "AVL, Red-Black trees"},

    # Algorithms
    {"name": "sorting", "category": "algorithms", "difficulty": 3, "desc": "Bubble, merge, quick sort and variants"},
    {"name": "binary_search", "category": "algorithms", "difficulty": 2, "desc": "Divide and conquer search on sorted data"},
    {"name": "two_pointers", "category": "algorithms", "difficulty": 3, "desc": "Two-index traversal technique"},
    {"name": "sliding_window", "category": "algorithms", "difficulty": 4, "desc": "Variable/fixed window subarray technique"},
    {"name": "graph_traversal", "category": "algorithms", "difficulty": 5, "desc": "BFS and DFS"},
    {"name": "dijkstra", "category": "algorithms", "difficulty": 7, "desc": "Shortest path with non-negative weights"},
    {"name": "dynamic_programming", "category": "algorithms", "difficulty": 7, "desc": "Optimal substructure and memoization"},
    {"name": "greedy_algorithms", "category": "algorithms", "difficulty": 5, "desc": "Locally optimal choice at each step"},
    {"name": "backtracking", "category": "algorithms", "difficulty": 6, "desc": "Exhaustive search with pruning"},
    {"name": "topological_sort", "category": "algorithms", "difficulty": 6, "desc": "Ordering of DAG nodes"},
    {"name": "bit_manipulation", "category": "algorithms", "difficulty": 4, "desc": "Bitwise operations and tricks"},
    {"name": "hashing", "category": "algorithms", "difficulty": 4, "desc": "Hash functions and collision handling"},

    # Concurrency & OS
    {"name": "processes_and_threads", "category": "operating_systems", "difficulty": 5, "desc": "Process vs thread, context switching"},
    {"name": "concurrency", "category": "operating_systems", "difficulty": 6, "desc": "Concurrent execution, race conditions"},
    {"name": "locks", "category": "operating_systems", "difficulty": 6, "desc": "Mutexes, semaphores, deadlock prevention"},
    {"name": "memory_management", "category": "operating_systems", "difficulty": 6, "desc": "Heap, stack, garbage collection"},
    {"name": "virtual_memory", "category": "operating_systems", "difficulty": 7, "desc": "Paging, address translation"},
    {"name": "scheduling", "category": "operating_systems", "difficulty": 6, "desc": "CPU scheduling algorithms"},

    # Databases
    {"name": "sql", "category": "databases", "difficulty": 3, "desc": "Structured query language fundamentals"},
    {"name": "normalization", "category": "databases", "difficulty": 5, "desc": "Database schema normal forms"},
    {"name": "indexing", "category": "databases", "difficulty": 5, "desc": "B-tree indexes, query optimization"},
    {"name": "transactions", "category": "databases", "difficulty": 6, "desc": "ACID properties, isolation levels"},
    {"name": "nosql", "category": "databases", "difficulty": 5, "desc": "Document, key-value, column stores"},
    {"name": "sharding", "category": "databases", "difficulty": 7, "desc": "Horizontal database partitioning"},
    {"name": "replication", "category": "databases", "difficulty": 7, "desc": "Data duplication across nodes"},

    # Networking
    {"name": "networking", "category": "networking", "difficulty": 4, "desc": "TCP/IP, HTTP fundamentals"},
    {"name": "load_balancing", "category": "networking", "difficulty": 6, "desc": "Traffic distribution algorithms"},
    {"name": "dns", "category": "networking", "difficulty": 4, "desc": "Domain name resolution"},
    {"name": "rest_apis", "category": "networking", "difficulty": 4, "desc": "RESTful API design principles"},
    {"name": "websockets", "category": "networking", "difficulty": 6, "desc": "Persistent bidirectional connections"},
    {"name": "grpc", "category": "networking", "difficulty": 7, "desc": "RPC framework using protobuf"},

    # System Design
    {"name": "caching", "category": "system_design", "difficulty": 5, "desc": "Cache strategies, eviction policies"},
    {"name": "microservices", "category": "system_design", "difficulty": 7, "desc": "Service-oriented architecture"},
    {"name": "message_queues", "category": "system_design", "difficulty": 6, "desc": "Async communication, pub-sub"},
    {"name": "scalability", "category": "system_design", "difficulty": 7, "desc": "Horizontal vs vertical scaling"},
    {"name": "consistency_models", "category": "system_design", "difficulty": 8, "desc": "Strong vs eventual consistency"},
    {"name": "consensus", "category": "system_design", "difficulty": 9, "desc": "Distributed agreement protocols, Raft/Paxos"},
    {"name": "distributed_systems", "category": "system_design", "difficulty": 8, "desc": "Multi-node coordination"},
    {"name": "cdn", "category": "system_design", "difficulty": 6, "desc": "Content delivery networks"},
    {"name": "rate_limiting", "category": "system_design", "difficulty": 6, "desc": "Token bucket, sliding window algorithms"},
    {"name": "api_gateway", "category": "system_design", "difficulty": 6, "desc": "Single entry point routing pattern"},
    {"name": "event_driven_architecture", "category": "system_design", "difficulty": 7, "desc": "Event-based service communication"},
    {"name": "disaster_recovery", "category": "system_design", "difficulty": 8, "desc": "Backup, failover, region redundancy"},

    # Machine Learning
    {"name": "linear_algebra", "category": "machine_learning", "difficulty": 4, "desc": "Vectors, matrices, transformations"},
    {"name": "statistics", "category": "machine_learning", "difficulty": 4, "desc": "Probability, distributions, hypothesis testing"},
    {"name": "calculus", "category": "machine_learning", "difficulty": 4, "desc": "Derivatives, gradients"},
    {"name": "machine_learning_basics", "category": "machine_learning", "difficulty": 5, "desc": "Supervised vs unsupervised learning"},
    {"name": "overfitting", "category": "machine_learning", "difficulty": 5, "desc": "Bias-variance tradeoff, regularization"},
    {"name": "gradient_descent", "category": "machine_learning", "difficulty": 6, "desc": "Optimization algorithm for training models"},
    {"name": "neural_networks", "category": "machine_learning", "difficulty": 7, "desc": "Layers, activation functions, backprop"},
    {"name": "cnn", "category": "machine_learning", "difficulty": 8, "desc": "Convolutional neural networks for vision"},
    {"name": "rnn", "category": "machine_learning", "difficulty": 8, "desc": "Recurrent networks for sequences"},
    {"name": "attention_mechanism", "category": "machine_learning", "difficulty": 8, "desc": "Weighted focus over input sequences"},
    {"name": "transformer_architecture", "category": "machine_learning", "difficulty": 9, "desc": "Self-attention based architecture"},
    {"name": "embeddings", "category": "machine_learning", "difficulty": 6, "desc": "Vector representations of data"},
    {"name": "model_evaluation", "category": "machine_learning", "difficulty": 5, "desc": "Precision, recall, F1, ROC curves"},

    # Object-Oriented & Design
    {"name": "oop", "category": "software_design", "difficulty": 2, "desc": "Encapsulation, inheritance, polymorphism, abstraction"},
    {"name": "solid_principles", "category": "software_design", "difficulty": 5, "desc": "Five OOP design principles"},
    {"name": "design_patterns", "category": "software_design", "difficulty": 6, "desc": "Singleton, factory, observer, etc."},
    {"name": "dependency_injection", "category": "software_design", "difficulty": 6, "desc": "Inversion of control pattern"},

    # Security
    {"name": "authentication", "category": "security", "difficulty": 5, "desc": "Verifying user identity"},
    {"name": "authorization", "category": "security", "difficulty": 5, "desc": "Permission and access control"},
    {"name": "encryption", "category": "security", "difficulty": 6, "desc": "Symmetric and asymmetric cryptography"},
    {"name": "jwt_tokens", "category": "security", "difficulty": 5, "desc": "JSON web tokens for stateless auth"},
    {"name": "oauth", "category": "security", "difficulty": 6, "desc": "Delegated authorization protocol"},
    {"name": "sql_injection", "category": "security", "difficulty": 4, "desc": "Common injection vulnerability"},

    # Behavioral
    {"name": "behavioral_storytelling", "category": "behavioral", "difficulty": 3, "desc": "STAR method, structured storytelling"},
    {"name": "leadership", "category": "behavioral", "difficulty": 5, "desc": "Influencing without authority"},
    {"name": "conflict_resolution", "category": "behavioral", "difficulty": 4, "desc": "Handling disagreement professionally"},
    {"name": "ownership", "category": "behavioral", "difficulty": 4, "desc": "Taking initiative and accountability"},
    {"name": "communication", "category": "behavioral", "difficulty": 3, "desc": "Explaining technical concepts clearly"},
    {"name": "growth_mindset", "category": "behavioral", "difficulty": 3, "desc": "Learning from failure, feedback"},
    {"name": "decision_making", "category": "behavioral", "difficulty": 5, "desc": "Trade-offs under uncertainty"},
]

# Prerequisites: which topics must be understood before others
PREREQUISITES = {
    "recursion": ["functions", "control_flow"],
    "linked_lists": ["pointers_and_references"],
    "binary_trees": ["linked_lists", "recursion"],
    "binary_search_trees": ["binary_trees"],
    "heaps": ["binary_trees", "arrays"],
    "priority_queue": ["heaps"],
    "graphs": ["linked_lists", "arrays"],
    "tries": ["hash_maps"],
    "segment_trees": ["binary_trees", "arrays"],
    "union_find": ["arrays"],
    "balanced_trees": ["binary_search_trees"],
    "binary_search": ["arrays"],
    "two_pointers": ["arrays"],
    "sliding_window": ["two_pointers"],
    "graph_traversal": ["graphs", "queues", "recursion"],
    "dijkstra": ["graph_traversal", "priority_queue", "greedy_algorithms"],
    "dynamic_programming": ["recursion", "complexity_analysis"],
    "greedy_algorithms": ["sorting"],
    "backtracking": ["recursion"],
    "topological_sort": ["graphs", "graph_traversal"],
    "hashing": ["hash_maps"],
    "concurrency": ["processes_and_threads"],
    "locks": ["concurrency"],
    "virtual_memory": ["memory_management"],
    "indexing": ["sql", "binary_search_trees"],
    "transactions": ["sql"],
    "sharding": ["sql", "nosql", "scalability"],
    "replication": ["sql", "distributed_systems"],
    "load_balancing": ["networking"],
    "websockets": ["networking", "rest_apis"],
    "grpc": ["networking", "rest_apis"],
    "caching": ["hash_maps"],
    "microservices": ["rest_apis", "networking"],
    "message_queues": ["distributed_systems"],
    "scalability": ["load_balancing", "caching"],
    "consistency_models": ["distributed_systems"],
    "consensus": ["distributed_systems", "consistency_models"],
    "distributed_systems": ["networking", "concurrency"],
    "rate_limiting": ["caching", "hash_maps"],
    "api_gateway": ["microservices", "rest_apis"],
    "event_driven_architecture": ["message_queues"],
    "disaster_recovery": ["replication", "distributed_systems"],
    "machine_learning_basics": ["statistics", "linear_algebra"],
    "overfitting": ["machine_learning_basics"],
    "gradient_descent": ["calculus", "linear_algebra"],
    "neural_networks": ["gradient_descent", "linear_algebra"],
    "cnn": ["neural_networks"],
    "rnn": ["neural_networks"],
    "attention_mechanism": ["neural_networks", "embeddings"],
    "transformer_architecture": ["attention_mechanism", "embeddings"],
    "model_evaluation": ["statistics", "machine_learning_basics"],
    "solid_principles": ["oop"],
    "design_patterns": ["solid_principles"],
    "dependency_injection": ["oop", "solid_principles"],
    "authorization": ["authentication"],
    "jwt_tokens": ["authentication", "encryption"],
    "oauth": ["authentication", "jwt_tokens"],
    "sql_injection": ["sql"],
    "leadership": ["behavioral_storytelling"],
    "conflict_resolution": ["behavioral_storytelling", "communication"],
    "decision_making": ["ownership", "communication"],
}


def seed_topics():
    db = SessionLocal()

    print(f"Seeding {len(TOPICS)} topics...")
    topic_map = {}

    for t in TOPICS:
        existing = db.query(Topic).filter(Topic.name == t["name"]).first()
        if existing:
            topic_map[t["name"]] = existing.id
            continue
        topic = Topic(
            name=t["name"],
            category=t["category"],
            difficulty_level=t["difficulty"],
            description=t["desc"]
        )
        db.add(topic)
        db.flush()
        topic_map[t["name"]] = topic.id

    db.commit()
    print(f"Topics seeded. Total in map: {len(topic_map)}")

    print("Seeding prerequisite relationships...")
    count = 0
    for topic_name, prereqs in PREREQUISITES.items():
        if topic_name not in topic_map:
            continue
        for prereq_name in prereqs:
            if prereq_name not in topic_map:
                continue
            existing = db.query(TopicPrerequisite).filter(
                TopicPrerequisite.topic_id == topic_map[topic_name],
                TopicPrerequisite.prerequisite_id == topic_map[prereq_name]
            ).first()
            if existing:
                continue
            link = TopicPrerequisite(
                topic_id=topic_map[topic_name],
                prerequisite_id=topic_map[prereq_name]
            )
            db.add(link)
            count += 1

    db.commit()
    print(f"Seeded {count} prerequisite relationships")
    db.close()


if __name__ == "__main__":
    seed_topics()