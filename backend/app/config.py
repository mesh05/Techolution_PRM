import os
import re
from pathlib import Path

CHAT_DATA_DIR = Path(os.environ.get("CHAT_DATA_DIR", "./data")).resolve()
CONV_DIR = CHAT_DATA_DIR / "conversations"
CONV_DIR.mkdir(parents=True, exist_ok=True)

# UUID hex (32 chars, no dashes)
ID_RE = re.compile(r"^[0-9a-fA-F]{32}$")
# User id: safe token (alnum, underscore, dash)
USER_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
DEFAULT_USER = "default"
