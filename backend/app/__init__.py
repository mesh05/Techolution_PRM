# app/__init__.py
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router as core_router
from .routes_data import router as data_router  # make sure this import works

def create_app() -> FastAPI:
    # show our custom logs + uvicorn logs
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
    )
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).setLevel(logging.INFO)
    logging.getLogger("ingest").setLevel(logging.INFO)  # our routes_data logger

    app = FastAPI(title="Techolution", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(core_router)
    app.include_router(data_router)
    return app

# so `uvicorn app:app --reload` also works
app = create_app()
