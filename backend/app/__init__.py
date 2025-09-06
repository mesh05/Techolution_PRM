from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

def create_app() -> FastAPI:
    app = FastAPI(title="Techolution", version="1.0.0")

    # CORS: allow all for easy prototyping
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)
    return app
