from fastapi import APIRouter, Header, Query, HTTPException
from datetime import datetime, timezone

from .models import (
    HealthResponse,
    CreateConversationResponse,
    ConversationSummary,
    OkResponse,
    MessageIn,
    MessageOut,
    SignInRequest,
    User,
)
from . import storage
from .config import DEFAULT_USER

router = APIRouter()

def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _resolve_user(user_q: str | None, x_user_id: str | None) -> str:
    return (x_user_id or user_q or DEFAULT_USER)

@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", time=_utc_iso())

# --- Hardcoded users for demo sign-in ---
_USERS = {
    "admin": "secret",
    "demo": "demo",
    "ramsha": "pass123",
}

@router.post("/auth/signin", response_model=User)
def signin(body: SignInRequest) -> User:
    expected = _USERS.get(body.username)
    if expected is None or expected != body.password:
        raise HTTPException(status_code=401, detail="invalid credentials")
    # create a fresh conversation within this user's folder
    cid = storage.create_conversation(user_id=body.username)
    return User(id=body.username, username=body.username, conversation_id=cid)

@router.post("/conversations", response_model=CreateConversationResponse)
def create_conversation(
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> CreateConversationResponse:
    uid = _resolve_user(user, x_user_id)
    cid = storage.create_conversation(user_id=uid)
    return CreateConversationResponse(id=cid)

@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(
    limit: int = Query(default=50, ge=1),
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> list[ConversationSummary]:
    uid = _resolve_user(user, x_user_id)
    return storage.list_conversations(user_id=uid, limit=limit)

@router.get("/conversations/{conversation_id}", response_model=ConversationSummary)
def get_conversation(
    conversation_id: str,
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> ConversationSummary:
    uid = _resolve_user(user, x_user_id)
    return storage.get_conversation(user_id=uid, cid=conversation_id)

@router.delete("/conversations/{conversation_id}", response_model=OkResponse)
def delete_conversation(
    conversation_id: str,
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> OkResponse:
    uid = _resolve_user(user, x_user_id)
    storage.delete_conversation(user_id=uid, cid=conversation_id)
    return OkResponse(ok=True)

@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut)
def append_message(
    conversation_id: str,
    body: MessageIn,
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> MessageOut:
    uid = _resolve_user(user, x_user_id)
    return storage.append_message(user_id=uid, cid=conversation_id, role=body.role, content=body.content)

@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(
    conversation_id: str,
    limit: int = Query(default=50, ge=1),
    offset: int = Query(default=0, ge=0),
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> list[MessageOut]:
    uid = _resolve_user(user, x_user_id)
    return storage.get_messages(user_id=uid, cid=conversation_id, limit=limit, offset=offset)
