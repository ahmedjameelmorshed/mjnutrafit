import os
from typing import Optional

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from ai.client_data import fetch_client_bundle_async, bundle_to_prompt_block
from ai.coach_agent import create_coach_agent
from config import GEMINI_API_KEY, GEMINI_MODEL, MJNUTRAFIT_AI_PORT

load_dotenv()

_sessions: dict[str, list] = {}
MAX_STORED_MESSAGES = 24


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not GEMINI_API_KEY:
        print("WARNING: GEMINI_API_KEY not set. AI Coach will fail until configured.")
    else:
        print(f"MJNutraFit AI: GEMINI_MODEL={GEMINI_MODEL!r} (restart after changing .env)")
    yield


app = FastAPI(
    title="MJNutraFit AI Coach",
    description="Personalized fitness and nutrition coach with LangGraph + Gemini",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


def _extract_text_from_ai_message(msg) -> str:
    if hasattr(msg, "content"):
        c = msg.content
        if isinstance(c, str):
            return c
        if isinstance(c, list):
            parts = []
            for block in c:
                if isinstance(block, dict) and block.get("type") == "text":
                    parts.append(block.get("text", ""))
                elif isinstance(block, str):
                    parts.append(block)
            return "".join(parts) if parts else str(c)
    return str(getattr(msg, "text", None) or msg)


def _tail_after_last_human(messages: list) -> list:
    last_idx = -1
    for i in range(len(messages) - 1, -1, -1):
        if isinstance(messages[i], HumanMessage):
            last_idx = i
            break
    return messages[last_idx + 1 :] if last_idx >= 0 else messages


def _final_assistant_text(result_messages: list) -> str:
    default = "I couldn't generate a response."
    tail = _tail_after_last_human(result_messages)
    if not tail:
        return default

    def text_from(msg: AIMessage) -> str:
        t = _extract_text_from_ai_message(msg)
        return (t or "").strip()

    last_tool_idx = -1
    for i in range(len(tail) - 1, -1, -1):
        if isinstance(tail[i], ToolMessage):
            last_tool_idx = i
            break

    after_tools = tail[last_tool_idx + 1 :] if last_tool_idx >= 0 else tail
    for msg in reversed(after_tools):
        if not isinstance(msg, AIMessage):
            continue
        if getattr(msg, "tool_calls", None):
            continue
        t = text_from(msg)
        if t:
            return t

    for msg in reversed(tail):
        if not isinstance(msg, AIMessage):
            continue
        if getattr(msg, "tool_calls", None):
            continue
        t = text_from(msg)
        if t:
            return t

    for msg in reversed(tail):
        if isinstance(msg, AIMessage):
            t = text_from(msg)
            if t:
                return t

    return default


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mjnutrafit-ai"}


@app.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")

    if not authorization or not authorization.strip():
        raise HTTPException(status_code=401, detail="Authorization header required")

    session_id = req.session_id or os.urandom(8).hex()
    history = _sessions.get(session_id, [])
    if len(history) > MAX_STORED_MESSAGES:
        history = history[-MAX_STORED_MESSAGES:]

    try:
        bundle = await fetch_client_bundle_async(authorization)
        client_context = bundle_to_prompt_block(bundle)
        agent = create_coach_agent(authorization, client_context)

        messages = []
        for h in history:
            if h["role"] == "user":
                messages.append(HumanMessage(content=h["content"]))
            else:
                messages.append(AIMessage(content=h["content"]))
        messages.append(HumanMessage(content=req.message))

        result = await agent.ainvoke({"messages": messages})
        response_text = _final_assistant_text(result.get("messages", []))

        new_history = history + [
            {"role": "user", "content": req.message},
            {"role": "assistant", "content": response_text},
        ]
        _sessions[session_id] = new_history[-MAX_STORED_MESSAGES:]

        return ChatResponse(response=response_text, session_id=session_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=MJNUTRAFIT_AI_PORT)
