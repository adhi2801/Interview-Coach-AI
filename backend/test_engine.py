from engines.replay_system import ReplaySystem

replay = ReplaySystem()

print("=== Testing Replay System ===\n")

replay.start_recording(session_id=1, user_name="Adhiswauran", company="Google", role="Software Engineer")
print("Recording started")

replay.log_event(1, "question_asked", {"text": "What is the difference between a stack and a queue?"})
replay.log_event(1, "answer_submitted", {"text": "Stack is LIFO, queue is FIFO"})
replay.log_event(1, "scores_calculated", {"score_technical": 5.0, "score_communication": 6.0})
replay.log_event(1, "gaps_identified", [{"gap": "stack operations", "urgency": "medium"}])
replay.log_event(1, "coaching_feedback", {"suggestion": "Speak slower", "wpm": 180})

replay.log_event(1, "question_asked", {"text": "Explain binary search"})
replay.log_event(1, "answer_submitted", {"text": "Binary search divides the array in half each time"})
replay.log_event(1, "scores_calculated", {"score_technical": 8.0, "score_communication": 7.5})

replay.end_recording(1)
print("Recording ended\n")

result = replay.get_replay(1)
print(f"Replay for: {result['user_name']} at {result['company']}")
print(f"Role: {result['role']}")
print(f"Total questions: {result['total_questions']}")
for i, q in enumerate(result['questions'], 1):
    print(f"\nQuestion {i}: {q['question']}")
    print(f"Answer: {q['answer']}")
    print(f"Scores: {q['scores']}")