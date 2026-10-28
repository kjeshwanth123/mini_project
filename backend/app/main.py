import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import entities as _entities  # noqa: F401  — register tables
from app.routers import (
    admin,
    assistant,
    auth,
    doctor,
    health_records,
    medications,
    model,
    ocr,
    predictions,
    reports,
)
from app.services.seed import seed_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cardio_health_api")

settings = get_settings()

# Initialize tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    description=(
        "Advanced AI-Based Heart Disease Prediction and Personalized Health Support System. "
        "High-performance healthcare decision-support API featuring real-time ML inference, "
        "SHAP explainability, OCR medical report extraction, and RAG medical assistant."
    ),
    openapi_url="/api/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Centralized error handling
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "message": "One or more input fields failed clinical schema validation.",
            "details": exc.errors(),
        },
    )


# Structured Request Logging Middleware
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Response-Time-Ms"] = str(duration_ms)
    logger.info(
        "%s %s -> status=%d duration=%.2fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Response-Time-Ms"],
)

# Register routers
app.include_router(auth.router)
app.include_router(medications.router)
app.include_router(admin.router)
app.include_router(predictions.router)
app.include_router(health_records.router)
app.include_router(reports.router)
app.include_router(ocr.router)
app.include_router(doctor.router)
app.include_router(assistant.router)
app.include_router(model.router)


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "env": settings.app_env,
        "database": "ready",
        "ai_engine": "ready",
        "ocr_engine": "ready",
    }


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "login": "/api/auth/login",
        "register": "/api/auth/register",
        "ocr": "/api/reports/ocr-extract",
        "simulate": "/api/predictions/simulate",
        "assistant": "/api/assistant/chat",
    }
