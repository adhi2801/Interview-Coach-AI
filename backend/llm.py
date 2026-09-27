# backend/llm.py
# One place for everything the engines share about calling Claude: the model
# id, client construction, and parsing JSON out of a text reply. Previously
# the model string was hardcoded at 9 call sites and the fence-stripping
# regex was copy-pasted into 3 files.

import os
import re

import anthropic
from dotenv import load_dotenv

load_dotenv()

# Override per environment (e.g. CLAUDE_MODEL=claude-sonnet-5) without a
# code change. The default is the model the app has been tuned against.
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")


def make_client(timeout: float = 30.0) -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), timeout=timeout)


def strip_markdown_fence(raw: str) -> str:
    """Finds a ```json fenced block anywhere in the text (Claude sometimes adds
    a preamble like "Here's the JSON:"), else returns the text unchanged."""
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
    return match.group(1).strip() if match else raw
