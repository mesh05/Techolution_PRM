# app/routes_data.py
from __future__ import annotations

"""
FastAPI routes for:
- Data ingestion of Resources & Projects from CSV/XLSX
- Compact dataset fetch for dashboards
- Full CRUD for Resources & Projects

Notes:
- Endpoints, shapes, and behaviors kept backward compatible.
- Improved logging, validation, error handling, and code structure.
"""

import logging
from typing import Any, Dict, List, Tuple, Optional, Union, Iterable
from datetime import datetime, date

import pandas as pd
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Depends,
    Header,
    Query,
    HTTPException,
)
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from sqlalchemy import text

from .db import Base, engine, get_db
from .models_db import Resource, Project, Proficiency, EmploymentType, Priority

# -----------------------------------------------------------------------------
# Router & DB bootstrap
# -----------------------------------------------------------------------------

router = APIRouter(prefix="/data", tags=["data"])
Base.metadata.create_all(bind=engine)

logger = logging.getLogger(__name__)
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("[DATA] %(levelname)s: %(message)s"))
    logger.addHandler(_h)
logger.setLevel(logging.INFO)

ROW_ERROR_LIMIT = 10

# -----------------------------------------------------------------------------
# Helpers: parsing, enums, resolution
# -----------------------------------------------------------------------------

def _read_any_table(upload: UploadFile) -> pd.DataFrame:
    """
    Reads a CSV or XLSX UploadFile into a DataFrame.
    Concatenates non-empty sheets for Excel.
    """
    name = (upload.filename or "").lower()
    logger.info("Reading upload: %s", name or "<unnamed>")
    try:
        upload.file.seek(0)
    except Exception:
        pass

    if name.endswith(".csv"):
        try:
            df = pd.read_csv(upload.file)
        finally:
            try:
                upload.file.seek(0)
            except Exception:
                pass
        logger.info("CSV parsed: shape=%s", df.shape)
        return df

    # Excel path
    xls = pd.ExcelFile(upload.file)
    frames: List[pd.DataFrame] = []
    for sheet in xls.sheet_names:
        tmp = xls.parse(sheet)
        # Keep only non-empty (after dropping all-NaN rows)
        if tmp.dropna(how="all").shape[0] > 0:
            logger.info("Excel sheet kept: %s shape=%s", sheet, tmp.shape)
            frames.append(tmp)
        else:
            logger.info("Excel sheet skipped (empty): %s", sheet)
    out = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    logger.info("Excel combined shape=%s", out.shape)
    return out


def _norm_header(h: Any) -> str:
    return (
        str(h).strip().lower()
        .replace(" ", "_")
        .replace("(", "")
        .replace(")", "")
        .replace("₹", "inr")
        .replace("/", "_")
    )


def _split_list(val: Any) -> List[str]:
    if val is None:
        return []
    s = str(val).strip()
    if not s:
        return []
    return [x.strip() for x in s.replace(";", ",").split(",") if x.strip()]


def _to_date(val: Any) -> Optional[date]:
    if val is None:
        return None
    # Handle pandas NaN/NaT and blank strings
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    s = str(val).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            pass
    try:
        return pd.to_datetime(val).date()  # robust fallback
    except Exception:
        return None


def _parse_int(val: Any) -> Optional[int]:
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    s = str(val).strip().replace(",", "")
    if not s:
        return None
    try:
        return int(float(s))
    except Exception:
        return None


def _parse_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    s = str(val).strip().replace(",", "")
    if not s:
        return None
    try:
        return float(s)
    except Exception:
        return None


def _enum_or_none(enum_cls, value: Optional[str]):
    if not value:
        return None
    try:
        return enum_cls(value)  # works if you're using Python Enum
    except Exception:
        # fall back to case-insensitive match by name
        value_lower = value.lower()
        for member in enum_cls:
            if getattr(member, "value", str(member)).lower() == value_lower or member.name.lower() == value_lower:
                return member
        return None


def _resolve_columns(df: pd.DataFrame, mapping: Dict[str, Any]) -> Tuple[Dict[str, str], List[str]]:
    """
    Given a df and mapping like {"field": ("alias1","alias2"...)} returns:
    - resolved: {field: actual_col_name}
    - missing: fields that couldn't be resolved
    """
    resolved: Dict[str, str] = {}
    for key, candidates in mapping.items():
        if isinstance(candidates, tuple):
            for c in candidates:
                if c in df.columns:
                    resolved[key] = c
                    break
        else:
            if candidates in df.columns:
                resolved[key] = candidates
    missing = [k for k in mapping.keys() if k not in resolved]
    return resolved, missing


def _df_preview(df: pd.DataFrame, n: int = 3) -> List[Dict[str, Any]]:
    try:
        return df.head(n).to_dict(orient="records")
    except Exception:
        return []


def _filter_by_conversation_and_user(query, model, conversation_id: str, x_user_id: Optional[str], user: Optional[str]):
    q = query.filter(model.conversation_id == conversation_id)
    if x_user_id or user:
        q = q.filter(model.user_id == (x_user_id or user))
    return q


# -----------------------------------------------------------------------------
# Ingestion: Resources
# -----------------------------------------------------------------------------

_RES_MAPPING = {
    "resource_id": ("resource_id", "id"),
    "name": ("name", "full_name"),
    "role": ("role", "designation"),
    "skills": ("skills", "skillset"),
    "proficiency_level": ("proficiency_level", "proficiency", "skill_level"),
    "capacity_hrs_per_week": ("capacity_hrs_per_week", "capacity", "weekly_capacity"),
    "current_commitments": ("current_commitments", "commitments"),
    "availability_date": ("availability_date", "available_from"),
    "location_timezone": ("location_timezone", "location_time_zone", "timezone", "location"),
    "employment_type": ("employment_type", "employment", "emp_type"),
    "cost_per_hour_inr": ("cost_per_hour_inr", "cost_per_hour", "rate_inr", "hourly_rate_inr"),
}


@router.post(
    "/resources/upload",
    summary="Ingest resources from CSV/XLSX",
    description="Parses the uploaded file and upserts Resources (by resource_id) for the given conversation/user.",
)
async def upload_resources_xlsx(
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    logger.info("RESOURCES INGEST START cid=%s user=%s x=%s", conversation_id, user, x_user_id)

    try:
        df = _read_any_table(file)
    finally:
        try:
            file.file.close()
        except Exception:
            pass

    if df.empty:
        logger.warning("No rows found")
        return {
            "ok": True,
            "rows_ingested": 0,
            "rows_failed": 0,
            "note": "No non-empty sheets",
            "columns_seen": [],
        }

    df.columns = [_norm_header(c) for c in df.columns]
    columns_seen = list(df.columns)
    logger.info("Columns seen: %s", columns_seen)
    logger.debug("Preview: %s", _df_preview(df))

    resolved, _ = _resolve_columns(df, _RES_MAPPING)
    logger.info("Resolved: %s", resolved)

    required = [k for k in ("resource_id", "name", "role", "skills") if k not in resolved]
    if required:
        logger.error("Missing required: %s", required)
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Missing required columns",
                "required_missing": required,
                "columns_seen": columns_seen,
                "resolved": resolved,
            },
        )

    ok = failed = 0
    row_errors: List[Dict[str, Any]] = []

    try:
        for idx, r in df.iterrows():
            try:
                obj = Resource(
                    resource_id=str(r[resolved["resource_id"]]).strip(),
                    name=str(r.get(resolved.get("name"), "")).strip(),
                    role=str(r.get(resolved.get("role"), "")).strip(),
                    skills=_split_list(r.get(resolved.get("skills"))),
                    proficiency_level=_enum_or_none(Proficiency, r.get(resolved.get("proficiency_level"))),
                    capacity_hrs_per_week=_parse_int(r.get(resolved.get("capacity_hrs_per_week"))),
                    current_commitments=str(r.get(resolved.get("current_commitments"), "")).strip() or None,
                    availability_date=_to_date(r.get(resolved.get("availability_date"))),
                    location_timezone=str(r.get(resolved.get("location_timezone"), "")).strip() or None,
                    employment_type=_enum_or_none(EmploymentType, r.get(resolved.get("employment_type"))),
                    cost_per_hour_inr=_parse_float(r.get(resolved.get("cost_per_hour_inr"))),
                    conversation_id=conversation_id,
                    user_id=x_user_id or user or "default",
                )
                db.merge(obj)        # upsert by PK
                db.flush()           # surface row-level errors early
                ok += 1
            except Exception as e:
                failed += 1
                if len(row_errors) < ROW_ERROR_LIMIT:
                    row_errors.append({"row_index": int(idx), "error": str(e)})
                logger.exception("Row %s failed", idx)

        db.commit()
    except Exception as e:
        logger.exception("Commit failed; rolling back")
        db.rollback()
        raise

    logger.info("RESOURCES DONE ok=%s failed=%s", ok, failed)
    return {
        "ok": True,
        "rows_ingested": ok,
        "rows_failed": failed,
        "columns_seen": columns_seen,
        "resolved_map": resolved,
        "sample_errors": row_errors,
    }


# -----------------------------------------------------------------------------
# Ingestion: Projects
# -----------------------------------------------------------------------------

_PROJ_MAPPING = {
    "id": ("project_id", "id", "p_id"),
    "name": ("project_name", "name", "title"),
    "problemStatement": ("summary", "problem_statement", "description"),
    "requiredSkills": ("required_skills", "skills"),
    "requiredSeniorityMix": ("staffing_mix", "target_staffing_mix"),
    "startDate": ("start_date", "kickoff", "start"),
    "endDate": ("end_date", "finish", "end"),
    "milestones": ("milestones", "phases", "plan"),
    "targetStaffing": ("required_roles", "roles"),
    "priority": ("priority", "prio"),
    "budget": ("budget_inr", "budget", "cost_inr"),
    "compliance": ("compliance", "constraints"),
}


@router.post(
    "/projects/upload",
    summary="Ingest projects from CSV/XLSX",
    description="Parses the uploaded file and upserts Projects (by project_id) for the given conversation/user.",
)
async def upload_projects_xlsx(
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    logger.info("PROJECTS INGEST START cid=%s user=%s x=%s", conversation_id, user, x_user_id)

    try:
        df = _read_any_table(file)
    finally:
        try:
            file.file.close()
        except Exception:
            pass

    if df.empty:
        logger.warning("No rows found")
        return {
            "ok": True,
            "rows_ingested": 0,
            "rows_failed": 0,
            "note": "No non-empty sheets",
            "columns_seen": [],
        }

    df.columns = [_norm_header(c) for c in df.columns]
    columns_seen = list(df.columns)
    logger.info("Columns seen: %s", columns_seen)
    logger.debug("Preview: %s", _df_preview(df))

    resolved, _ = _resolve_columns(df, _PROJ_MAPPING)
    logger.info("Resolved: %s", resolved)

    required = [k for k in ("project_id", "name") if k not in resolved]
    if required:
        logger.error("Missing required: %s", required)
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Missing required columns",
                "required_missing": required,
                "columns_seen": columns_seen,
                "resolved": resolved,
            },
        )

    ok = failed = 0
    row_errors: List[Dict[str, Any]] = []

    try:
        for idx, r in df.iterrows():
            try:
                obj = Project(
                    project_id=str(r[resolved["project_id"]]).strip(),
                    name=str(r.get(resolved.get("name"), "")).strip(),
                    summary=str(r.get(resolved.get("summary"), "")).strip() or None,
                    required_skills=_split_list(r.get(resolved.get("required_skills"))),
                    staffing_mix=str(r.get(resolved.get("staffing_mix"), "")).strip() or None,
                    start_date=_to_date(r.get(resolved.get("start_date"))),
                    end_date=_to_date(r.get(resolved.get("end_date"))),
                    milestones=str(r.get(resolved.get("milestones"), "")).strip() or None,
                    required_roles=str(r.get(resolved.get("required_roles"), "")).strip() or None,
                    priority=_enum_or_none(Priority, r.get(resolved.get("priority"))),
                    budget_inr=_parse_int(r.get(resolved.get("budget_inr"))),
                    compliance=str(r.get(resolved.get("compliance"), "")).strip() or None,
                    conversation_id=conversation_id,
                    user_id=x_user_id or user or "default",
                )
                db.merge(obj)  # upsert
                db.flush()
                ok += 1
            except Exception as e:
                failed += 1
                if len(row_errors) < ROW_ERROR_LIMIT:
                    row_errors.append({"row_index": int(idx), "error": str(e)})
                logger.exception("Row %s failed", idx)

        db.commit()
    except Exception as e:
        logger.exception("Commit failed; rolling back")
        db.rollback()
        raise

    logger.info("PROJECTS DONE ok=%s failed=%s", ok, failed)
    return {
        "ok": True,
        "rows_ingested": ok,
        "rows_failed": failed,
        "columns_seen": columns_seen,
        "resolved_map": resolved,
        "sample_errors": row_errors,
    }


# -----------------------------------------------------------------------------
# Compact dataset for dashboards
# -----------------------------------------------------------------------------

@router.get(
    "/dataset",
    summary="Get compact dataset",
    description="Returns a compact list of resources & projects for a conversation (optionally scoped to a user).",
)
def dataset(
    conversation_id: str = Query(...),
    limit: int = Query(200, ge=1, le=1000),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    res_cnt = db.execute(text("SELECT COUNT(*) FROM resources")).scalar()
    proj_cnt = db.execute(text("SELECT COUNT(*) FROM projects")).scalar()
    logger.info("[DATASET] counts: resources=%s projects=%s (cid=%s)", res_cnt, proj_cnt, conversation_id)

    resources_q = _filter_by_conversation_and_user(
        db.query(Resource), Resource, conversation_id, x_user_id, user
    )
    projects_q = _filter_by_conversation_and_user(
        db.query(Project), Project, conversation_id, x_user_id, user
    )

    resources = resources_q.order_by(Resource.resource_id).limit(limit).all()
    projects = projects_q.order_by(Project.project_id).limit(limit).all()

    return {
        "resources": [{
            "id": r.resource_id,
            "name": r.name,
            "role": r.role,
            "skills": r.skills,
            "proficiency": r.proficiency_level.value if r.proficiency_level else None,
            "capacity": r.capacity_hrs_per_week,
            "commitments": r.current_commitments,
            "availability_date": r.availability_date.isoformat() if r.availability_date else None,
            "timezone": r.location_timezone,
            "type": r.employment_type.value if r.employment_type else None,
            "cost_hour": float(r.cost_per_hour_inr) if r.cost_per_hour_inr is not None else None,
        } for r in resources],
        "projects": [{
            "project_id": p.project_id,
            "name": p.name,
            "summary": p.summary,
            "required_skills": p.required_skills,
            "staffing_mix": p.staffing_mix,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "milestones": p.milestones,
            "required_roles": p.required_roles,
            "priority": p.priority.value if p.priority else None,
            "budget_inr": p.budget_inr,
            "compliance": p.compliance,
        } for p in projects],
    }


@router.get("/debug/status", summary="Lightweight DB counts")
def debug_status(db: Session = Depends(get_db)):
    res = db.execute(text("SELECT COUNT(*) FROM resources")).scalar()
    proj = db.execute(text("SELECT COUNT(*) FROM projects")).scalar()
    return {"resources_count": res, "projects_count": proj}


# -----------------------------------------------------------------------------
# CRUD Schemas & Mappers
# -----------------------------------------------------------------------------

# Reuse the local helpers defined above: _split_list, _to_date, _enum_or_none

def _to_list(val: Union[str, List[str], None]) -> List[str]:
    if isinstance(val, list):
        return [str(x).strip() for x in val if str(x).strip()]
    return _split_list(val)


def _to_opt_date(val: Union[str, date, None]) -> Optional[date]:
    if isinstance(val, date):
        return val
    return _to_date(val)


# ----- Resource schemas -----

class ResourceBase(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    skills: Optional[Union[str, List[str]]] = None
    proficiency_level: Optional[str] = Field(None, description="Beginner|Intermediate|Advanced|Expert")
    capacity_hrs_per_week: Optional[int] = None
    current_commitments: Optional[str] = None
    availability_date: Optional[Union[str, date]] = None
    location_timezone: Optional[str] = None
    employment_type: Optional[str] = Field(None, description="Intern|Full-time|Contractor")
    cost_per_hour_inr: Optional[float] = None

    @validator("skills", pre=True)
    def _norm_skills(cls, v):
        return _to_list(v)

    @validator("availability_date", pre=True)
    def _norm_avail(cls, v):
        return _to_opt_date(v)


class ResourceCreate(ResourceBase):
    resource_id: str
    name: str
    role: str
    skills: Union[str, List[str]]


class ResourceUpdate(ResourceBase):
    pass


class ResourceOut(BaseModel):
    resource_id: str
    name: str
    role: str
    skills: List[str]
    proficiency_level: Optional[str] = None
    capacity_hrs_per_week: Optional[int] = None
    current_commitments: Optional[str] = None
    availability_date: Optional[str] = None
    location_timezone: Optional[str] = None
    employment_type: Optional[str] = None
    cost_per_hour_inr: Optional[float] = None


# ----- Project schemas -----

class ProjectBase(BaseModel):
    name: Optional[str] = None
    summary: Optional[str] = None
    required_skills: Optional[Union[str, List[str]]] = None
    staffing_mix: Optional[str] = None
    start_date: Optional[Union[str, date]] = None
    end_date: Optional[Union[str, date]] = None
    milestones: Optional[str] = None
    required_roles: Optional[str] = None
    priority: Optional[str] = Field(None, description="Low|Medium|High")
    budget_inr: Optional[int] = None
    compliance: Optional[str] = None

    @validator("required_skills", pre=True)
    def _norm_req_skills(cls, v):
        return _to_list(v)

    @validator("start_date", "end_date", pre=True)
    def _norm_dates(cls, v):
        return _to_opt_date(v)


class ProjectCreate(ProjectBase):
    project_id: str
    name: str


class ProjectUpdate(ProjectBase):
    pass


class ProjectOut(BaseModel):
    project_id: str
    name: str
    summary: Optional[str] = None
    required_skills: List[str] = []
    staffing_mix: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    milestones: Optional[str] = None
    required_roles: Optional[str] = None
    priority: Optional[str] = None
    budget_inr: Optional[int] = None
    compliance: Optional[str] = None


# ----- mappers -----

def _resource_to_dict(r: Resource) -> dict:
    return {
        "id": r.resource_id,
        "name": r.name,
        "role": r.role,
        "skills": r.skills or [],
        "proficiency": r.proficiency_level.value if r.proficiency_level else None,
        "capacity": r.capacity_hrs_per_week,
        "commitments": r.current_commitments,
        "availability_date": r.availability_date.isoformat() if r.availability_date else None,
        "timezone": r.location_timezone,
        "type": r.employment_type.value if r.employment_type else None,
        "cost_hour": float(r.cost_per_hour_inr) if r.cost_per_hour_inr is not None else None,
    }


def _project_to_dict(p: Project) -> dict:
    # keep whatever fields you already expose; these are common ones:
    return {
        "id": getattr(p, "id", None) or getattr(p, "project_id", None) or getattr(p, "external_id", None),
        "name": p.name,
        "problemStatement": getattr(p, "summary", None),
        "startDate": getattr(p, "start_date", None),
        "endDate": getattr(p, "end_date", None),
        "milestones": getattr(p, "milestones", None),
        "priority": getattr(p, "priority", None) or getattr(p, "priority_level", None),
        "budget": getattr(p, "budget_inr", None),
        "requiredSkills": getattr(p, "required_roles", None),
        "compliance": getattr(p, "compliance", None),
        "geoEligibility": getattr(p, "geo_eligibility", None),
        # add more if you’d like
    }



# -----------------------------------------------------------------------------
# CRUD: Resources
# -----------------------------------------------------------------------------

@router.post("/resources", response_model=ResourceOut, summary="Create resource")
def create_resource(
    body: ResourceCreate,
    conversation_id: str = Query(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    # Conflict if the id already exists for this conversation+user
    existing = _filter_by_conversation_and_user(
        db.query(Resource).filter(Resource.resource_id == body.resource_id),
        Resource, conversation_id, x_user_id, user,
    )
    if existing.first():
        raise HTTPException(status_code=409, detail="resource_id already exists in this conversation")

    obj = Resource(
        resource_id=body.resource_id.strip(),
        name=body.name.strip(),
        role=body.role.strip(),
        skills=_to_list(body.skills),
        proficiency_level=_enum_or_none(Proficiency, body.proficiency_level),
        capacity_hrs_per_week=body.capacity_hrs_per_week,
        current_commitments=(body.current_commitments or None),
        availability_date=_to_opt_date(body.availability_date),
        location_timezone=(body.location_timezone or None),
        employment_type=_enum_or_none(EmploymentType, body.employment_type),
        cost_per_hour_inr=body.cost_per_hour_inr,
        conversation_id=conversation_id,
        user_id=x_user_id or user or "default",
    )
    db.add(obj)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(obj)
    return _resource_to_dict(obj)

@router.get("/resources", response_model=dict, summary="List resources (paginated)")
def list_resources(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    name: Optional[str] = Query(default=None, description="substring match"),
    db: Session = Depends(get_db),
):
    q = db.query(Resource)
    if name:
        q = q.filter(Resource.name.ilike(f"%{name}%"))
    total = q.count()
    items = q.order_by(Resource.resource_id).offset(offset).limit(limit).all()
    return {"total": total, "items": [_resource_to_dict(r) for r in items]}


@router.get("/resources/{resource_id}", response_model=ResourceOut, summary="Get one resource")
def get_resource(
    resource_id: str,
    conversation_id: str = Query(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    q = _filter_by_conversation_and_user(
        db.query(Resource).filter(Resource.resource_id == resource_id),
        Resource, conversation_id, x_user_id, user,
    )
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="resource not found")
    return _resource_to_dict(obj)


@router.patch("/resources/{resource_id}", response_model=ResourceOut, summary="Update resource (partial)")
def update_resource(
    resource_id: str,
    body: ResourceUpdate,
    conversation_id: str = Query(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    q = _filter_by_conversation_and_user(
        db.query(Resource).filter(Resource.resource_id == resource_id),
        Resource, conversation_id, x_user_id, user,
    )
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="resource not found")

    # Apply partial updates
    if body.name is not None:
        obj.name = body.name.strip()
    if body.role is not None:
        obj.role = body.role.strip()
    if body.skills is not None:
        obj.skills = _to_list(body.skills)
    if body.proficiency_level is not None:
        obj.proficiency_level = _enum_or_none(Proficiency, body.proficiency_level)
    if body.capacity_hrs_per_week is not None:
        obj.capacity_hrs_per_week = body.capacity_hrs_per_week
    if body.current_commitments is not None:
        obj.current_commitments = (body.current_commitments or None)
    if body.availability_date is not None:
        obj.availability_date = _to_opt_date(body.availability_date)
    if body.location_timezone is not None:
        obj.location_timezone = (body.location_timezone or None)
    if body.employment_type is not None:
        obj.employment_type = _enum_or_none(EmploymentType, body.employment_type)
    if body.cost_per_hour_inr is not None:
        obj.cost_per_hour_inr = body.cost_per_hour_inr

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(obj)
    return _resource_to_dict(obj)


@router.delete("/resources/{resource_id}", response_model=dict, summary="Delete resource")
def delete_resource(
    resource_id: str,
    conversation_id: str = Query(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    q = _filter_by_conversation_and_user(
        db.query(Resource).filter(Resource.resource_id == resource_id),
        Resource, conversation_id, x_user_id, user,
    )
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="resource not found")
    db.delete(obj)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"ok": True}


# -----------------------------------------------------------------------------
# CRUD: Projects
# -----------------------------------------------------------------------------

@router.post("/projects", response_model=ProjectOut, summary="Create project")
def create_project(
    body: ProjectCreate,
    conversation_id: str = Query(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    existing = _filter_by_conversation_and_user(
        db.query(Project).filter(Project.project_id == body.project_id),
        Project, conversation_id, x_user_id, user,
    )
    if existing.first():
        raise HTTPException(status_code=409, detail="project_id already exists in this conversation")

    obj = Project(
        project_id=body.project_id.strip(),
        name=body.name.strip(),
        summary=(body.summary or None),
        required_skills=_to_list(body.required_skills),
        staffing_mix=(body.staffing_mix or None),
        start_date=_to_opt_date(body.start_date),
        end_date=_to_opt_date(body.end_date),
        milestones=(body.milestones or None),
        required_roles=(body.required_roles or None),
        priority=_enum_or_none(Priority, body.priority),
        budget_inr=body.budget_inr,
        compliance=(body.compliance or None),
        conversation_id=conversation_id,
        user_id=x_user_id or user or "default",
    )
    db.add(obj)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(obj)
    return _project_to_dict(obj)


@router.get("/projects", response_model=dict, summary="List projects (paginated, simple)")
def list_projects(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    name: Optional[str] = Query(default=None, description="substring match"),
    priority: Optional[str] = Query(default=None, description="e.g., High/Medium/Low"),
    db: Session = Depends(get_db),
):
    q = db.query(Project)
    if name:
        q = q.filter(Project.name.ilike(f"%{name}%"))
    if priority:
        enum_val = _enum_or_none(Priority, priority)
        if enum_val is not None:
            q = q.filter(Project.priority == enum_val)

    total = q.count()
    items = q.order_by(Project.name.asc()).offset(offset).limit(limit).all()
    return {"total": total, "items": [_project_to_dict(p) for p in items]}

@router.get("/projects/{project_id}", response_model=ProjectOut, summary="Get one project")
def get_project(
    project_id: str,
    conversation_id: str = Query(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    q = _filter_by_conversation_and_user(
        db.query(Project).filter(Project.project_id == project_id),
        Project, conversation_id, x_user_id, user,
    )
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="project not found")
    return _project_to_dict(obj)


@router.patch("/projects/{project_id}", response_model=ProjectOut, summary="Update project (partial)")
def update_project(
    project_id: str,
    body: ProjectUpdate,
    conversation_id: str = Query(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    q = _filter_by_conversation_and_user(
        db.query(Project).filter(Project.project_id == project_id),
        Project, conversation_id, x_user_id, user,
    )
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="project not found")

    if body.name is not None:
        obj.name = body.name.strip()
    if body.summary is not None:
        obj.summary = (body.summary or None)
    if body.required_skills is not None:
        obj.required_skills = _to_list(body.required_skills)
    if body.staffing_mix is not None:
        obj.staffing_mix = (body.staffing_mix or None)
    if body.start_date is not None:
        obj.start_date = _to_opt_date(body.start_date)
    if body.end_date is not None:
        obj.end_date = _to_opt_date(body.end_date)
    if body.milestones is not None:
        obj.milestones = (body.milestones or None)
    if body.required_roles is not None:
        obj.required_roles = (body.required_roles or None)
    if body.priority is not None:
        obj.priority = _enum_or_none(Priority, body.priority)
    if body.budget_inr is not None:
        obj.budget_inr = body.budget_inr
    if body.compliance is not None:
        obj.compliance = (body.compliance or None)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(obj)
    return _project_to_dict(obj)


@router.delete("/projects/{project_id}", response_model=dict, summary="Delete project")
def delete_project(
    project_id: str,
    conversation_id: str = Query(...),
    user: Optional[str] = Query(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    q = _filter_by_conversation_and_user(
        db.query(Project).filter(Project.project_id == project_id),
        Project, conversation_id, x_user_id, user,
    )
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="project not found")
    db.delete(obj)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"ok": True}
