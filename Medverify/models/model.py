from datetime import datetime, timezone

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    reports = db.relationship("MedicalReport", backref="owner", lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"


class MedicalReport(db.Model):
    __tablename__ = "medical_reports"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    filename = db.Column(db.String(255), nullable=False)

    patient_name = db.Column(db.String(120), default="Not Found")
    age = db.Column(db.String(20), default="Not Found")
    gender = db.Column(db.String(20), default="Not Found")
    hospital = db.Column(db.String(200), default="Not Found")
    doctor = db.Column(db.String(120), default="Not Found")
    diagnosis = db.Column(db.Text, default="Not Found")
    medicines = db.Column(db.Text, default="Not Found")
    test_results = db.Column(db.Text, default="Not Found")
    report_date = db.Column(db.String(50), default="Not Found")

    extracted_text = db.Column(db.Text, default="")
    verification_status = db.Column(db.String(50), default="PENDING")
    confidence_score = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<MedicalReport {self.id} - {self.patient_name}>"
