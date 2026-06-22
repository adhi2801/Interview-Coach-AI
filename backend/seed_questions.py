# backend/seed_questions.py
# This is our curated question bank — 60 real interview questions
# across difficulty levels 1-10 and multiple topics.
# This is what makes RAG meaningful: real, hand-picked questions
# instead of the LLM hallucinating a new one every time.

QUESTION_BANK = [
    # Difficulty 1-3 (Beginner)
    {"id": "q001", "text": "What is the difference between an array and a linked list?", "difficulty": 2, "topics": ["data_structures", "arrays"], "companies": ["google", "amazon", "microsoft"]},
    {"id": "q002", "text": "Explain the difference between a stack and a queue with real-world examples.", "difficulty": 1, "topics": ["data_structures", "stacks", "queues"], "companies": ["amazon", "microsoft", "startup"]},
    {"id": "q003", "text": "What is Big-O notation and why does it matter when writing code?", "difficulty": 2, "topics": ["complexity_analysis"], "companies": ["google", "meta", "amazon"]},
    {"id": "q004", "text": "Write a function to check if a string is a palindrome.", "difficulty": 1, "topics": ["strings"], "companies": ["startup", "microsoft"]},
    {"id": "q005", "text": "What is the difference between a HashMap and a TreeMap?", "difficulty": 3, "topics": ["hash_maps", "data_structures"], "companies": ["google", "amazon"]},
    {"id": "q006", "text": "Explain how binary search works and write its time complexity.", "difficulty": 2, "topics": ["binary_search", "arrays"], "companies": ["google", "meta", "microsoft"]},
    {"id": "q007", "text": "What is recursion? Write a recursive function to calculate factorial.", "difficulty": 2, "topics": ["recursion"], "companies": ["amazon", "startup"]},
    {"id": "q008", "text": "Explain the difference between SQL and NoSQL databases.", "difficulty": 3, "topics": ["databases"], "companies": ["amazon", "microsoft", "startup"]},
    {"id": "q009", "text": "What are the four pillars of Object-Oriented Programming?", "difficulty": 1, "topics": ["oop"], "companies": ["microsoft", "amazon"]},
    {"id": "q010", "text": "Write a function to reverse a singly linked list.", "difficulty": 3, "topics": ["linked_lists"], "companies": ["google", "amazon", "meta"]},

    # Difficulty 4-6 (Intermediate)
    {"id": "q011", "text": "Design a basic LRU (Least Recently Used) cache. What data structures would you use?", "difficulty": 6, "topics": ["caching", "hash_maps", "linked_lists"], "companies": ["google", "amazon", "meta"]},
    {"id": "q012", "text": "Given a list of intervals, merge all overlapping intervals.", "difficulty": 5, "topics": ["arrays", "sorting"], "companies": ["google", "meta", "microsoft"]},
    {"id": "q013", "text": "Explain how a hash table handles collisions. Compare chaining vs open addressing.", "difficulty": 5, "topics": ["hash_maps"], "companies": ["google", "amazon"]},
    {"id": "q014", "text": "Design a URL shortening service like bit.ly. What are the key components?", "difficulty": 6, "topics": ["system_design", "databases", "caching"], "companies": ["amazon", "meta", "microsoft"]},
    {"id": "q015", "text": "Implement a function to find the longest substring without repeating characters.", "difficulty": 5, "topics": ["strings", "sliding_window"], "companies": ["google", "meta", "amazon"]},
    {"id": "q016", "text": "What is the difference between processes and threads? When would you use each?", "difficulty": 5, "topics": ["concurrency", "operating_systems"], "companies": ["google", "microsoft"]},
    {"id": "q017", "text": "Design a rate limiter for an API. What algorithms could you use?", "difficulty": 6, "topics": ["system_design", "distributed_systems"], "companies": ["amazon", "google", "meta"]},
    {"id": "q018", "text": "Explain how you would detect a cycle in a linked list.", "difficulty": 4, "topics": ["linked_lists", "two_pointers"], "companies": ["google", "amazon", "microsoft"]},
    {"id": "q019", "text": "What is database indexing? How does it improve query performance?", "difficulty": 5, "topics": ["databases", "indexing"], "companies": ["amazon", "microsoft", "startup"]},
    {"id": "q020", "text": "Implement a binary search tree and write functions for insert and search.", "difficulty": 4, "topics": ["binary_trees"], "companies": ["google", "amazon"]},
    {"id": "q021", "text": "Tell me about a time you disagreed with a team member. How did you handle it?", "difficulty": 4, "topics": ["behavioral", "teamwork"], "companies": ["amazon", "microsoft", "meta"]},
    {"id": "q022", "text": "Describe a project where you had to make a trade-off between speed and quality.", "difficulty": 5, "topics": ["behavioral", "decision_making"], "companies": ["amazon", "meta", "startup"]},
    {"id": "q023", "text": "What is the CAP theorem? Explain with a real-world distributed system example.", "difficulty": 6, "topics": ["distributed_systems"], "companies": ["google", "amazon"]},
    {"id": "q024", "text": "Explain how garbage collection works in modern programming languages.", "difficulty": 5, "topics": ["memory_management"], "companies": ["google", "microsoft"]},
    {"id": "q025", "text": "Design a notification system that supports email, SMS, and push notifications.", "difficulty": 6, "topics": ["system_design", "microservices"], "companies": ["amazon", "meta", "microsoft"]},

    # Difficulty 7-8 (Advanced)
    {"id": "q026", "text": "Design a distributed cache system like Redis. How do you handle consistency across nodes?", "difficulty": 8, "topics": ["distributed_systems", "caching", "consistency_models"], "companies": ["google", "amazon", "meta"]},
    {"id": "q027", "text": "How would you design Twitter's news feed system to handle millions of users?", "difficulty": 8, "topics": ["system_design", "databases", "caching"], "companies": ["meta", "google"]},
    {"id": "q028", "text": "Explain how you would implement a distributed lock across multiple servers.", "difficulty": 7, "topics": ["distributed_systems", "concurrency"], "companies": ["google", "amazon"]},
    {"id": "q029", "text": "Design a system to detect duplicate content across billions of documents.", "difficulty": 8, "topics": ["system_design", "hashing", "scalability"], "companies": ["google", "meta"]},
    {"id": "q030", "text": "How does a load balancer decide which server to route traffic to? Compare algorithms.", "difficulty": 7, "topics": ["load_balancing", "networking"], "companies": ["amazon", "google", "microsoft"]},
    {"id": "q031", "text": "Design the backend architecture for a ride-sharing app like Uber.", "difficulty": 8, "topics": ["system_design", "geospatial", "microservices"], "companies": ["amazon", "meta", "google"]},
    {"id": "q032", "text": "Explain eventual consistency vs strong consistency with real examples.", "difficulty": 7, "topics": ["consistency_models", "distributed_systems"], "companies": ["google", "amazon"]},
    {"id": "q033", "text": "How would you design a search autocomplete feature for billions of queries?", "difficulty": 8, "topics": ["system_design", "tries", "caching"], "companies": ["google", "meta"]},
    {"id": "q034", "text": "Explain how database sharding works and the challenges of resharding.", "difficulty": 7, "topics": ["databases", "scalability"], "companies": ["amazon", "google"]},
    {"id": "q035", "text": "Design a payment processing system that guarantees exactly-once transaction processing.", "difficulty": 8, "topics": ["system_design", "distributed_systems", "transactions"], "companies": ["amazon", "startup"]},
    {"id": "q036", "text": "Describe a time you had to make a difficult technical decision with incomplete information.", "difficulty": 7, "topics": ["behavioral", "decision_making"], "companies": ["amazon", "meta"]},
    {"id": "q037", "text": "How would you architect a system to process video uploads at YouTube scale?", "difficulty": 8, "topics": ["system_design", "media_processing", "scalability"], "companies": ["google", "meta"]},
    {"id": "q038", "text": "Explain the difference between horizontal and vertical scaling with trade-offs.", "difficulty": 6, "topics": ["scalability", "system_design"], "companies": ["amazon", "microsoft"]},
    {"id": "q039", "text": "Design a real-time multiplayer game server architecture.", "difficulty": 8, "topics": ["system_design", "networking", "real_time_systems"], "companies": ["meta", "startup"]},
    {"id": "q040", "text": "How would you detect and prevent a distributed denial-of-service attack?", "difficulty": 7, "topics": ["security", "networking"], "companies": ["amazon", "google"]},

    # Difficulty 9-10 (Expert)
    {"id": "q041", "text": "Design a globally distributed database that maintains strong consistency with sub-100ms latency.", "difficulty": 10, "topics": ["distributed_systems", "databases", "consensus"], "companies": ["google", "amazon"]},
    {"id": "q042", "text": "Design Google's entire search indexing pipeline, from crawling to ranking, at planet scale.", "difficulty": 10, "topics": ["system_design", "distributed_systems", "ranking_algorithms"], "companies": ["google"]},
    {"id": "q043", "text": "Explain how you would design a consensus algorithm similar to Raft from scratch.", "difficulty": 9, "topics": ["distributed_systems", "consensus"], "companies": ["google", "amazon"]},
    {"id": "q044", "text": "Design a fraud detection system that processes 1 million transactions per second with sub-5ms latency.", "difficulty": 9, "topics": ["system_design", "real_time_systems", "machine_learning"], "companies": ["amazon", "startup"]},
    {"id": "q045", "text": "How would you design the training infrastructure for a large language model across thousands of GPUs?", "difficulty": 10, "topics": ["machine_learning", "distributed_systems", "neural_networks"], "companies": ["google", "meta"]},
    {"id": "q046", "text": "Design a multi-region active-active database architecture that survives a full region outage.", "difficulty": 9, "topics": ["distributed_systems", "databases", "disaster_recovery"], "companies": ["amazon", "google"]},
    {"id": "q047", "text": "Explain how you would build a real-time anomaly detection system for a global cloud infrastructure.", "difficulty": 9, "topics": ["machine_learning", "distributed_systems", "monitoring"], "companies": ["google", "amazon", "microsoft"]},
    {"id": "q048", "text": "Design the matching algorithm for a ride-sharing service to minimize wait time at city scale.", "difficulty": 9, "topics": ["algorithms", "system_design", "optimization"], "companies": ["amazon", "meta"]},
    {"id": "q049", "text": "How would you design a recommendation engine that personalizes for a billion users in real time?", "difficulty": 10, "topics": ["machine_learning", "system_design", "scalability"], "companies": ["meta", "google"]},
    {"id": "q050", "text": "Describe how you would design the transformer attention mechanism to scale efficiently for very long context windows.", "difficulty": 10, "topics": ["neural_networks", "transformer_architecture", "machine_learning"], "companies": ["google", "meta"]},

    # Behavioral and culture-specific
    {"id": "q051", "text": "Tell me about a time you had to deliver bad news to a stakeholder.", "difficulty": 4, "topics": ["behavioral", "communication"], "companies": ["amazon", "microsoft"]},
    {"id": "q052", "text": "Describe a situation where you took ownership of a problem outside your direct responsibility.", "difficulty": 5, "topics": ["behavioral", "ownership"], "companies": ["amazon"]},
    {"id": "q053", "text": "Tell me about a time you failed. What did you learn from it?", "difficulty": 4, "topics": ["behavioral", "growth_mindset"], "companies": ["microsoft", "google"]},
    {"id": "q054", "text": "Describe a time you had to influence a decision without having direct authority.", "difficulty": 6, "topics": ["behavioral", "leadership"], "companies": ["amazon", "meta"]},
    {"id": "q055", "text": "Tell me about a time you simplified a complex problem for a non-technical audience.", "difficulty": 5, "topics": ["behavioral", "communication"], "companies": ["amazon", "google"]},

    # ML/Data specific
    {"id": "q056", "text": "Explain the bias-variance tradeoff in machine learning models.", "difficulty": 5, "topics": ["machine_learning", "statistics"], "companies": ["google", "meta"]},
    {"id": "q057", "text": "How would you handle class imbalance in a fraud detection dataset?", "difficulty": 6, "topics": ["machine_learning", "statistics"], "companies": ["amazon", "startup"]},
    {"id": "q058", "text": "Explain how gradient descent works and why learning rate matters.", "difficulty": 5, "topics": ["machine_learning", "neural_networks"], "companies": ["google", "meta"]},
    {"id": "q059", "text": "What is overfitting and what techniques would you use to prevent it?", "difficulty": 4, "topics": ["machine_learning"], "companies": ["google", "meta", "amazon"]},
    {"id": "q060", "text": "Design an A/B testing framework to evaluate a new product feature.", "difficulty": 6, "topics": ["statistics", "experimentation"], "companies": ["meta", "amazon"]},
]