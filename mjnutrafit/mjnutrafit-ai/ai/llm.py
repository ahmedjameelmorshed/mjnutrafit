import threading
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from config import GEMINI_API_KEY, GEMINI_MODEL

_COACH_MAX_OUTPUT = 720
_COACH_TEMP = 0.28

_coach_llm: Optional[ChatGoogleGenerativeAI] = None
_coach_llm_lock = threading.Lock()


def get_llm(temperature: float = 0.7):
    return ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GEMINI_API_KEY or None,
        temperature=temperature,
        max_output_tokens=4096,
        convert_system_message_to_human=True,
    )


def get_coach_llm() -> ChatGoogleGenerativeAI:
    global _coach_llm
    if _coach_llm is not None:
        return _coach_llm
    with _coach_llm_lock:
        if _coach_llm is None:
            _coach_llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                google_api_key=GEMINI_API_KEY or None,
                temperature=_COACH_TEMP,
                max_output_tokens=_COACH_MAX_OUTPUT,
                convert_system_message_to_human=True,
                thinking_budget=0,
                include_thoughts=False,
            )
    return _coach_llm
