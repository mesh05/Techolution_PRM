from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from fastapi import HTTPException
from filelock import FileLock

from .config import CONV_DIR, ID_RE, USER_RE, DEFAULT_USER
from .models import ConversationSummary, MessageOut

def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _validate_user(user_id: str | None) -> str:
    user_id = (user_id or DEFAULT_USER).strip()
    if not USER_RE.match(user_id):
        raise HTTPException(status_code=422, detail="invalid user id")
    return user_id

def _user_dir(user_id: str) -> Path:
    uid = _validate_user(user_id)
    p = (CONV_DIR / uid).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p

def _conv_path(user_id: str, cid: str) -> Path:
    if not ID_RE.match(cid):
        raise HTTPException(status_code=422, detail="conversation_id must be uuid hex (32 chars)")
    return (_user_dir(user_id) / f"{cid.lower()}.jsonl").resolve()

def _ensure_exists(path: Path) -> None:
    if not path.exists():
        raise HTTPException(status_code=404, detail="Conversation not found")

def _mtime_iso(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()

def read_all_valid_messages(path: Path) -> List[MessageOut]:
    msgs: List[MessageOut] = []
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                role, content, ts = obj.get("role"), obj.get("content"), obj.get("ts")
                if role in {"system", "user", "assistant"} and isinstance(content, str) and isinstance(ts, str):
                    msgs.append(MessageOut(role=role, content=content, ts=ts))
    except FileNotFoundError:
        pass
    return msgs

def summarize_conversation(path: Path) -> ConversationSummary:
    cid = path.stem
    last_at = _mtime_iso(path)
    count = 0
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    json.loads(line)
                    count += 1
                except json.JSONDecodeError:
                    continue
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationSummary(id=cid, last_at=last_at, count=count)

# Public API (per-user)
def create_conversation(user_id: str | None) -> str:
    uid = _validate_user(user_id)
    cid = uuid.uuid4().hex
    path = _conv_path(uid, cid)
    with path.open("a", encoding="utf-8"):
        pass
    return cid

def delete_conversation(user_id: str | None, cid: str) -> None:
    path = _conv_path(_validate_user(user_id), cid)
    _ensure_exists(path)
    lock = FileLock(str(path) + ".lock")
    with lock:
        try:
            path.unlink()
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Conversation not found")

def list_conversations(user_id: str | None, limit: int) -> List[ConversationSummary]:
    udir = _user_dir(_validate_user(user_id))
    files = sorted(
        (p for p in udir.glob("*.jsonl") if p.is_file()),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return [summarize_conversation(p) for p in files[:limit]]

def get_conversation(user_id: str | None, cid: str) -> ConversationSummary:
    path = _conv_path(_validate_user(user_id), cid)
    _ensure_exists(path)
    return summarize_conversation(path)

def append_message(user_id: str | None, cid: str, role: str, content: str) -> MessageOut:
    path = _conv_path(_validate_user(user_id), cid)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Conversation not found")
    content = content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="content must be non-empty")
    record = MessageOut(role=role, content=content, ts=_utc_iso())
    lock = FileLock(str(path) + ".lock")
    with lock:
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record.dict(), ensure_ascii=False) + "\n")
    return record

def get_messages(user_id: str | None, cid: str, limit: int, offset: int) -> List[MessageOut]:
    path = _conv_path(_validate_user(user_id), cid)
    _ensure_exists(path)
    messages = read_all_valid_messages(path)  # oldest → newest
    n = len(messages)
    start = max(0, n - (offset + limit))
    end = max(0, n - offset)
    if start > end:
        return []
    return messages[start:end]
