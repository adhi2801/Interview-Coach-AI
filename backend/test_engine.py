from engines.knowledge_graph import KnowledgeGapGraph

graph = KnowledgeGapGraph()

print("=== Full study path for transformer_architecture ===")
path = graph.get_full_study_path("transformer_architecture")
print(" -> ".join(path))

print("\n=== Full study path for consensus ===")
path = graph.get_full_study_path("consensus")
print(" -> ".join(path))