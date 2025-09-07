from fastapi import APIRouter, Header, Query, HTTPException, UploadFile, File, Form, Request
from datetime import datetime, timezone
from typing import List
from pathlib import Path
import os
import httpx
import json

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
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")  # set this in .env if you want to use n8n

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
    name = (name or "file").strip().replace(" ", "_")
    return SAFE_NAME_RE.sub("-", name) or "file"

@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", time=_utc_iso())

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

@router.post("/files/upload", response_model=FileUploadResponse)
async def upload_files(
    request: Request,
    conversation_id: str = Form(...),
    files: List[UploadFile] = File(...),
    auto_ingest: bool = Query(False),
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> FileUploadResponse:
    uid = _resolve_user(user, x_user_id)
    storage.get_conversation(user_id=uid, cid=conversation_id)

    updir = _user_upload_dir(uid, conversation_id)
    uploaded: List[FileItem] = []

    # save files
    for uf in files:
        safe = _sanitize_name(uf.filename or "file")
        target = (updir / safe).resolve()
        i = 1
        base, ext = os.path.splitext(safe)
        while target.exists():
            target = (updir / f"{base}_{i}{ext}").resolve()
            i += 1
        data = await uf.read()
        with target.open("wb") as f:
            f.write(data)
        uploaded.append(FileItem(filename=target.name, size=len(data)))

    # optional auto-ingest
    if auto_ingest:
        base = str(request.base_url).rstrip("/")
        async with httpx.AsyncClient(timeout=60) as client:
            for item in uploaded:
                path = updir / item.filename
                name = item.filename.lower()
                endpoints = (
                    ["/data/resources/upload"] if "resource" in name else
                    ["/data/projects/upload"] if "project" in name else
                    ["/data/resources/upload", "/data/projects/upload"]
                )
                ingested = False
                for ep in endpoints:
                    with path.open("rb") as fp:
                        form = {
                            "conversation_id": (None, conversation_id),
                            "file": (item.filename, fp, "application/octet-stream"),
                        }
                        resp = await client.post(f"{base}{ep}", files=form)
                        payload = {}
                        try:
                            payload = resp.json()
                        except Exception:
                            payload = {"status": resp.status_code, "text": resp.text}
                        print("[AUTO_INGEST]", ep, payload)
                        if isinstance(payload, dict) and int(payload.get("rows_ingested", 0)) > 0:
                            ingested = True
                            break
                if not ingested:
                    print("[AUTO_INGEST] no rows ingested for", item.filename)

    return FileUploadResponse(uploaded=uploaded)

@router.get("/files/{conversation_id}", response_model=FileListResponse)
def list_files(
    conversation_id: str,
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> FileListResponse:
    uid = _resolve_user(user, x_user_id)
    storage.get_conversation(user_id=uid, cid=conversation_id)
    updir = _user_upload_dir(uid, conversation_id)
    items: List[FileItem] = []
    for p in sorted(updir.glob("*")):
        if p.is_file():
            items.append(FileItem(filename=p.name, size=p.stat().st_size))
    return FileListResponse(files=items)

def _coerce_answer_from_any(obj) -> str | None:
    """
    Accepts many shapes:
      {"answer": "..."}
      {"text": "..."} / {"content": "..."} / {"message": "..."} / {"result": "..."} / {"response": "..."}
      {"choices":[{"message":{"content":"..."}}]}  # OpenAI style
      {"data":{"text":"..."}} etc.
    Returns a stripped string or None.
    """
    if obj is None:
        return None
    if isinstance(obj, str):
        return obj.strip() or None
    if not isinstance(obj, dict):
        # best-effort: stringify
        try:
            return json.dumps(obj, ensure_ascii=False)
        except Exception:
            return str(obj)

    # common direct keys
    for k in ("answer", "text", "content", "message", "result", "response"):
        v = obj.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
        if isinstance(v, dict):
            # nested common fields
            for kk in ("answer", "text", "content", "message"):
                vv = v.get(kk)
                if isinstance(vv, str) and vv.strip():
                    return vv.strip()

    # OpenAI chat-completions shape
    choices = obj.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            msg = first.get("message")
            if isinstance(msg, dict):
                cc = msg.get("content")
                if isinstance(cc, str) and cc.strip():
                    return cc.strip()

    # last resort: compact JSON
    try:
        s = json.dumps(obj, ensure_ascii=False)
        return s.strip() or None
    except Exception:
        return None

@router.post("/ai/ask/{conversation_id}", response_model=AskResponse)
async def ask(
    conversation_id: str,
    body: AskRequest,
    user: str | None = Query(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> AskResponse:
    uid = _resolve_user(user, x_user_id)
    storage.append_message(user_id=uid, cid=conversation_id, role="user", content=body.question)

    n8n_url = os.getenv("N8N_WEBHOOK_URL")
    n8n_auth_header = os.getenv("N8N_AUTH_HEADER")
    n8n_auth_value  = os.getenv("N8N_AUTH_VALUE")

    answer_text: str | None = None
    if n8n_url:
        payload = {"user": uid, "conversation_id": conversation_id, "question": body.question}
        headers = {}
        if n8n_auth_header and n8n_auth_value:
            headers[n8n_auth_header] = n8n_auth_value
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(n8n_url, json=payload, headers=headers)
            resp.raise_for_status()
            ctype = (resp.headers.get("content-type") or "").lower()
            if ctype.startswith("application/json"):
                try:
                    data = resp.json()
                except Exception:
                    data = None
                answer_text = _coerce_answer_from_any(data)
            else:
                answer_text = (resp.text or "").strip() or None
        except Exception as e:
            answer_text = f"(n8n error: {e})"
    else:
        answer_text = f"You asked: {body.question}"

    # Final safety: never let None/empty through to storage
    if not isinstance(answer_text, str) or not answer_text.strip():
        answer_text = "(No answer returned by AI.)"

    storage.append_message(user_id=uid, cid=conversation_id, role="assistant", content=answer_text)
    return AskResponse(answer=answer_text)