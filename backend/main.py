from app import create_app
from fastapi.middleware.cors import CORSMiddleware

# uvicorn main:app --reload --port 8000
app = create_app()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
