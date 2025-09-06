from fastapi import APIRouter, Header, Query, HTTPException, UploadFile, File, Form
from datetime import datetime, timezone
from typing import List
from pathlib import Path
import os
import httpx

from .models import (
    HealthResponse,
    CreateConversationResponse,
    ConversationSummary,
    OkResponse,
    MessageIn,
    MessageOut,
    SignInRequest,
    User,
    FileItem,
    FileUploadResponse,
    FileListResponse,
    AskRequest,
    AskResponse,
)
from . import storage
from .config import DEFAULT_USER, UPLOADS_DIR, SAFE_NAME_RE, ID_RE

router = APIRouter()
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")  # optional

def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _resolve_user(user_q: str | None, x_user_id: str | None) -> str:
    return (x_user_id or user_q or DEFAULT_USER)

def _user_upload_dir(user_id: str, cid: str) -> Path:
    if not ID_RE.match(cid):
        raise HTTPException(status_code=422, detail="conversation_id must be uuid hex (32 chars)")
    p = (UPLOADS_DIR / user_id / cid).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p

def _sanitize_name(name: str) -> str:
    name = name.strip().replace(" ", "_")
    name = SAFE_NAME_RE.sub("-", name)
    return name or "file"

@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", time=_utc_iso())

# --- Hardcoded users for demo sign-in ---
_USERS = {
    "admin": "secret",
    "demo": "demo",
    "hello": "pass123",
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

# ---------- NEW: Upload files tied to a conversation ----------
@router.post("/files/upload", response_model=FileUploadResponse)
async def upload_files(
    conversation_id: str = Form(...),
    files: List[UploadFile] = File(...),
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> FileUploadResponse:
    uid = _resolve_user(user, x_user_id)
    # ensure conversation exists
    storage.get_conversation(user_id=uid, cid=conversation_id)
    updir = _user_upload_dir(uid, conversation_id)

    uploaded: List[FileItem] = []
    for uf in files:
        safe = _sanitize_name(uf.filename or "file")
        target = (updir / safe).resolve()
        # avoid overwrite
        i = 1
        base, ext = os.path.splitext(safe)
        while target.exists():
            target = (updir / f"{base}_{i}{ext}").resolve()
            i += 1
        data = await uf.read()
        with target.open("wb") as f:
            f.write(data)
        uploaded.append(FileItem(filename=target.name, size=len(data)))
    return FileUploadResponse(uploaded=uploaded)

@router.get("/files/{conversation_id}", response_model=FileListResponse)
def list_files(
    conversation_id: str,
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> FileListResponse:
    uid = _resolve_user(user, x_user_id)
    # ensure conversation exists
    storage.get_conversation(user_id=uid, cid=conversation_id)
    updir = _user_upload_dir(uid, conversation_id)
    items: List[FileItem] = []
    for p in sorted(updir.glob("*")):
        if p.is_file():
            items.append(FileItem(filename=p.name, size=p.stat().st_size))
    return FileListResponse(files=items)

# ---------- NEW: Ask (chat) with optional n8n proxy ----------
@router.post("/ai/ask/{conversation_id}", response_model=AskResponse)
async def ask(
    conversation_id: str,
    body: AskRequest,
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> AskResponse:
    uid = _resolve_user(user, x_user_id)
    # append the user question to the transcript
    storage.append_message(user_id=uid, cid=conversation_id, role="user", content=body.question)

    # pull some history (last 20)
    history = storage.get_messages(user_id=uid, cid=conversation_id, limit=20, offset=0)

    answer_text = None
    if N8N_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    N8N_WEBHOOK_URL,
                    json={
                        "user": uid,
                        "conversation_id": conversation_id,
                        "question": body.question,
                        "history": [m.dict() for m in history],
                    },
                )
            resp.raise_for_status()
            # accept {"answer": "..."} or plain text
            payload = resp.json() if resp.headers.get("content-type","").startswith("application/json") else {"answer": resp.text}
            answer_text = payload.get("answer") or payload.get("result") or resp.text
        except Exception as e:
            # fall back to a friendly error message
            answer_text = f"(n8n error: {e})"
    else:
        # local echo fallback
        answer_text = f"You asked: {body.question}"

    # append assistant answer
    storage.append_message(user_id=uid, cid=conversation_id, role="assistant", content=answer_text)
    return AskResponse(answer=answer_text)
