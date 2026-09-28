from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.config import REPO_ROOT, get_settings
from app.models.entities import PatientProfile, Prediction
from app.services.ml_runtime import resolve_repo_path
from app.services.precautions import DISCLAIMER


def write_prediction_pdf(prediction: Prediction, patient: PatientProfile) -> Path:
    settings = get_settings()
    reports_dir = resolve_repo_path(settings.reports_dir)
    reports_dir.mkdir(parents=True, exist_ok=True)
    path = reports_dir / f"prediction-{prediction.id}.pdf"
    styles = getSampleStyleSheet()
    story = []
    record = prediction.health_record
    user = patient.user
    story.append(Paragraph("Heart Health AI — Assessment report", styles["Title"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Educational decision-support report. Not a diagnosis.", styles["Italic"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(f"Patient name: {user.name}", styles["Normal"]))
    story.append(Paragraph(f"Patient email: {user.email}", styles["Normal"]))
    story.append(Paragraph(f"Assessment date (UTC): {prediction.created_at}", styles["Normal"]))
    story.append(Paragraph(f"Model version: {prediction.model_version.version if prediction.model_version else 'unknown'}", styles["Normal"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Entered parameters", styles["Heading2"]))
    fields = [
        ("Age", record.age),
        ("Sex (0=female, 1=male in this form)", record.sex),
        ("Chest pain type", record.chest_pain_type),
        ("Resting blood pressure", record.resting_bp),
        ("Cholesterol", record.cholesterol),
        ("Fasting blood sugar flag", record.fasting_blood_sugar),
        ("Resting ECG", record.resting_ecg),
        ("Maximum heart rate", record.max_heart_rate),
        ("Exercise angina", record.exercise_angina),
        ("Oldpeak", record.oldpeak),
        ("ST slope", record.st_slope),
    ]
    for label, value in fields:
        story.append(Paragraph(f"{label}: {value}", styles["Normal"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Model result", styles["Heading2"]))
    story.append(Paragraph(f"Label: {prediction.prediction}", styles["Normal"]))
    story.append(Paragraph(f"Estimated probability of the positive class: {prediction.probability}", styles["Normal"]))
    story.append(Paragraph(f"Risk band (configurable thresholds, not medical certainty): {prediction.risk_level}", styles["Normal"]))
    if prediction.emergency_warning:
        story.append(Paragraph("Emergency guidance was displayed for the symptoms entered. Seek immediate care.", styles["Heading2"]))
    story.append(Paragraph("Model contribution notes (not medical causation)", styles["Heading2"]))
    for item in prediction.explanation or []:
        story.append(Paragraph(str(item.get("text", item)), styles["Normal"]))
    story.append(Paragraph("General precautions", styles["Heading2"]))
    for rec in prediction.recommendations:
        story.append(Paragraph(f"[{rec.category}] {rec.recommendation}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(DISCLAIMER, styles["Italic"]))
    doc = SimpleDocTemplate(str(path), pagesize=A4)
    doc.build(story)
    return path
