# app/models_db.py
from sqlalchemy import Column, String, Integer, Date, Numeric, Text, Enum
from sqlalchemy.dialects.postgresql import ARRAY
import enum
from .db import Base  # ✅ relative import

class Proficiency(str, enum.Enum):
    Beginner = "Beginner"
    Intermediate = "Intermediate"
    Advanced = "Advanced"
    Expert = "Expert"

class EmploymentType(str, enum.Enum):
    Intern = "Intern"
    FullTime = "Full-time"
    Contractor = "Contractor"

class Priority(str, enum.Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"

class Resource(Base):
    __tablename__ = "resources"
    resource_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    skills = Column(ARRAY(Text), nullable=False)
    proficiency_level = Column(Enum(Proficiency), nullable=True)
    capacity_hrs_per_week = Column(Integer)
    current_commitments = Column(Text)
    availability_date = Column(Date)
    location_timezone = Column(String)
    employment_type = Column(Enum(EmploymentType), nullable=True)
    cost_per_hour_inr = Column(Numeric(12, 2))
    conversation_id = Column(String, index=True, nullable=True)
    user_id = Column(String, index=True, nullable=True)

class Project(Base):
    __tablename__ = "projects"
    project_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    required_skills = Column(ARRAY(Text), nullable=True)
    staffing_mix = Column(String, nullable=True)
    start_date = Column(Date)
    end_date = Column(Date)
    milestones = Column(Text)
    required_roles = Column(String, nullable=True)
    priority = Column(Enum(Priority), nullable=True)
    budget_inr = Column(Integer, nullable=True)
    compliance = Column(String, nullable=True)
    conversation_id = Column(String, index=True, nullable=True)
    user_id = Column(String, index=True, nullable=True)
