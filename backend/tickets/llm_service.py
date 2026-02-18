import json
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {'billing', 'technical', 'account', 'general'}
VALID_PRIORITIES = {'low', 'medium', 'high', 'critical'}

SAFE_DEFAULT = {
    'suggested_category': 'general',
    'suggested_priority': 'low',
}

GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODEL = 'llama-3.1-8b-instant'

CLASSIFY_PROMPT = """You are a support ticket classifier.

Categories:
billing, technical, account, general

Priorities:
low, medium, high, critical

Based on the user description below, return ONLY valid JSON in this exact format with no explanation:

{{
  "category": "...",
  "priority": "..."
}}

Description:
\"\"\"
{description}
\"\"\"
"""


def classify_ticket(description: str) -> dict:
    """
    Call Groq LLM to classify a ticket description.
    Returns suggested category and priority.
    Falls back to safe defaults on any failure.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set; returning safe defaults.")
        return SAFE_DEFAULT

    try:
        prompt = CLASSIFY_PROMPT.format(description=description)
        payload = {
            'model': GROQ_MODEL,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.1,
            'max_tokens': 64,
        }
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }

        response = requests.post(
            GROQ_API_URL,
            json=payload,
            headers=headers,
            timeout=15,
        )
        response.raise_for_status()

        raw = response.json()['choices'][0]['message']['content'].strip()
        data = json.loads(raw)

        category = str(data.get('category', '')).lower()
        priority = str(data.get('priority', '')).lower()

        if category not in VALID_CATEGORIES or priority not in VALID_PRIORITIES:
            logger.warning(
                "LLM returned invalid values: category=%s priority=%s", category, priority
            )
            return SAFE_DEFAULT

        return {
            'suggested_category': category,
            'suggested_priority': priority,
        }

    except json.JSONDecodeError:
        logger.error("LLM returned non-JSON response; using safe defaults.")
        return SAFE_DEFAULT
    except Exception as exc:
        logger.error("LLM classification failed: %s", exc)
        return SAFE_DEFAULT
