from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default=UserRole.PATIENT.value)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    patient_profile: Mapped[Optional["PatientProfile"]] = relationship(back_populates="user", uselist=False)
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    date_of_birth: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    sex: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="patient_profile")
    health_records: Mapped[list["HealthRecord"]] = relationship(back_populates="patient")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="patient")
    notes: Mapped[list["DoctorNote"]] = relationship(back_populates="patient")


class DoctorPatientAssignment(Base):
    __tablename__ = "doctor_patient_assignments"
    __table_args__ = (UniqueConstraint("doctor_id", "patient_user_id", name="uq_doctor_patient"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    patient_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class HealthRecord(Base):
    __tablename__ = "health_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient_profiles.id"), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    sex: Mapped[int] = mapped_column(Integer, nullable=False)
    chest_pain_type: Mapped[int] = mapped_column(Integer, nullable=False)
    resting_bp: Mapped[float] = mapped_column(Float, nullable=False)
    cholesterol: Mapped[float] = mapped_column(Float, nullable=False)
    fasting_blood_sugar: Mapped[int] = mapped_column(Integer, nullable=False)
    resting_ecg: Mapped[int] = mapped_column(Integer, nullable=False)
    max_heart_rate: Mapped[int] = mapped_column(Integer, nullable=False)
    exercise_angina: Mapped[int] = mapped_column(Integer, nullable=False)
    oldpeak: Mapped[float] = mapped_column(Float, nullable=False)
    st_slope: Mapped[int] = mapped_column(Integer, nullable=False)
    emergency_symptoms: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    patient: Mapped[PatientProfile] = relationship(back_populates="health_records")
    prediction: Mapped[Optional["Prediction"]] = relationship(back_populates="health_record", uselist=False)


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[str] = mapped_column(String(64), nullable=False)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    metrics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    predictions: Mapped[list["Prediction"]] = relationship(back_populates="model_version")


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient_profiles.id"), nullable=False)
    health_record_id: Mapped[int] = mapped_column(ForeignKey("health_records.id"), nullable=False)
    model_version_id: Mapped[Optional[int]] = mapped_column(ForeignKey("model_versions.id"), nullable=True)
    prediction: Mapped[str] = mapped_column(String(64), nullable=False)
    probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    explanation: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    emergency_warning: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    patient: Mapped[PatientProfile] = relationship(back_populates="predictions")
    health_record: Mapped[HealthRecord] = relationship(back_populates="prediction")
    model_version: Mapped[Optional[ModelVersion]] = relationship(back_populates="predictions")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="prediction")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prediction_id: Mapped[int] = mapped_column(ForeignKey("predictions.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    prediction: Mapped[Prediction] = relationship(back_populates="recommendations")


class MedicationInformation(Base):
    __tablename__ = "medication_information"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    condition: Mapped[str] = mapped_column(String(128), nullable=False)
    medication_name: Mapped[str] = mapped_column(String(128), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    general_information: Mapped[str] = mapped_column(Text, nullable=False)
    warnings: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class DoctorNote(Base):
    __tablename__ = "doctor_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient_profiles.id"), nullable=False)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    patient: Mapped[PatientProfile] = relationship(back_populates="notes")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    user: Mapped[Optional[User]] = relationship(back_populates="audit_logs")
