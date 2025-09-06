from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: Literal["ok"]
    time: str

class ConversationSummary(BaseModel):
    id: str
    last_at: Optional[str]
    count: int

class CreateConversationResponse(BaseModel):
    id: str

class OkResponse(BaseModel):
    ok: bool

class MessageIn(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)

class MessageOut(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str
    ts: str

# Sign-in
class SignInRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)

class User(BaseModel):
    id: str
    username: str
    conversation_id: str
