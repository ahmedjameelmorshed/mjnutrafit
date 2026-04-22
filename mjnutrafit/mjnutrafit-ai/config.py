import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MJNUTRAFIT_AI_PORT = int(os.getenv("MJNUTRAFIT_AI_PORT", "8000"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
