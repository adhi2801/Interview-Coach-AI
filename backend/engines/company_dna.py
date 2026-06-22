import os
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

COMPANY_PROFILES = {
    "google": {
        "name": "Google",
        "focus_areas": "algorithms data-structures system-design scalability",
        "behavioral_framework": "STAR method aligned with Google's 4 core attributes",
        "difficulty_bias": 1.3,
        "question_style": "Open-ended, ambiguous, expects clarifying questions",
        "red_flags": ["No clarifying questions", "Skips edge cases", "Can't estimate complexity"],
        "green_flags": ["Structured approach", "Thinks out loud", "Tests their own solution"],
        "values": ["Googleyness", "General Cognitive Ability", "Leadership", "Role-Related Knowledge"]
    },
    "amazon": {
        "name": "Amazon",
        "focus_areas": "leadership-principles behavioral system-design ownership",
        "behavioral_framework": "14 Leadership Principles — every answer must map to one",
        "difficulty_bias": 1.0,
        "question_style": "Tell me about a time... situation-based, evidence-required",
        "red_flags": ["Vague examples", "No measurable impact", "Blames teammates"],
        "green_flags": ["Specific metrics", "Ownership mindset", "Customer-first thinking"],
        "values": ["Customer Obsession", "Ownership", "Invent and Simplify", "Dive Deep"]
    },
    "meta": {
        "name": "Meta",
        "focus_areas": "product-sense data-analysis growth coding impact",
        "behavioral_framework": "Impact-focused, move fast, data-driven decisions",
        "difficulty_bias": 1.1,
        "question_style": "Product-first, how would you build X for 3 billion users",
        "red_flags": ["No data-driven thinking", "Over-engineering", "Ignores scale"],
        "green_flags": ["Ships fast", "A/B testing mindset", "Social impact awareness"],
        "values": ["Move Fast", "Be Bold", "Focus on Impact", "Be Open"]
    },
    "microsoft": {
        "name": "Microsoft",
        "focus_areas": "growth-mindset collaboration design-patterns cloud-azure",
        "behavioral_framework": "Growth mindset, learn from failure, team player",
        "difficulty_bias": 0.9,
        "question_style": "Collaborative problem solving, explain your reasoning",
        "red_flags": ["Fixed mindset", "Not asking for help", "Dismissing feedback"],
        "green_flags": ["Iterative improvement", "Cross-team collaboration", "Azure awareness"],
        "values": ["Growth Mindset", "Diversity and Inclusion", "One Microsoft", "Integrity"]
    },
    "apple": {
        "name": "Apple",
        "focus_areas": "design-thinking quality system-design user-experience",
        "behavioral_framework": "Attention to detail, privacy-first, craftsmanship",
        "difficulty_bias": 1.2,
        "question_style": "Deep technical dives, focus on quality over speed",
        "red_flags": ["Sloppy solutions", "Ignoring user experience", "Privacy oversight"],
        "green_flags": ["Pixel-perfect thinking", "Performance obsession", "Simplicity"],
        "values": ["Privacy", "Quality", "Innovation", "Simplicity"]
    },
    "netflix": {
        "name": "Netflix",
        "focus_areas": "streaming distributed-systems freedom-responsibility culture",
        "behavioral_framework": "Freedom and Responsibility — high autonomy, high accountability",
        "difficulty_bias": 1.2,
        "question_style": "Context not control, judgment over rules",
        "red_flags": ["Needs micromanagement", "Avoids hard decisions", "Process-dependent"],
        "green_flags": ["Independent thinking", "Data-driven", "Candid communication"],
        "values": ["Freedom", "Responsibility", "Candor", "Innovation"]
    },
    "startup": {
        "name": "Startup",
        "focus_areas": "practical-coding culture-fit adaptability speed",
        "behavioral_framework": "Move fast, wear many hats, ship it",
        "difficulty_bias": 0.8,
        "question_style": "Practical take-home style, real problems we face",
        "red_flags": ["Rigid thinking", "Needs big team support", "Slow decision making"],
        "green_flags": ["Scrappy", "Full-stack thinking", "Entrepreneurial mindset"],
        "values": ["Speed", "Impact", "Adaptability", "Ownership"]
    }
}

class CompanyDNAEngine:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    def get_profile(self, company_name: str) -> dict:
        key = company_name.lower().strip()
        if key in COMPANY_PROFILES:
            return COMPANY_PROFILES[key]
        return self._generate_dynamic_profile(company_name)
    
    def _generate_dynamic_profile(self, company_name: str) -> dict:
        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            system="Return only valid JSON. No preamble. No markdown.",
            messages=[{"role": "user", "content":
                f"Generate an interview profile for {company_name} with exactly these keys: "
                f"name, focus_areas, behavioral_framework, question_style, red_flags, green_flags, values"}]
        )
        return json.loads(response.content[0].text)
    
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