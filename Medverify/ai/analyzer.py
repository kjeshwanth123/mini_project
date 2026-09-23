import re


REQUIRED_FIELDS = ["patient_name", "hospital", "doctor", "diagnosis", "date"]


def _is_missing(value):
    if not value:
        return True
    return value.strip().lower() in ("not found", "na", "n/a", "-", "")


def _is_valid_date(date_str):
    if _is_missing(date_str):
        return False

    patterns = [
        r"^\d{1,2}[/,\-\.]\d{1,2}[/,\-\.]\d{2,4}$",
        r"^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}$",
        r"^\d{4}[/,\-\.]\d{1,2}[/,\-\.]\d{1,2}$",
    ]
    return any(re.search(p, date_str, re.IGNORECASE) for p in patterns)


def analyze_report(details, ocr_confidence, extracted_text):
    """
    Analyze extracted medical report data and return verification result.
    """
    reasons = []
    score = 100.0

    if not extracted_text or len(extracted_text.strip()) < 20:
        reasons.append("Report text is empty or too short")
        score -= 40

    if _is_missing(details.get("patient_name")):
        reasons.append("Missing patient details")
        score -= 15

    if _is_missing(details.get("doctor")):
        reasons.append("Missing doctor information")
        score -= 15

    if _is_missing(details.get("hospital")):
        reasons.append("Missing hospital information")
        score -= 15

    if _is_missing(details.get("diagnosis")):
        reasons.append("Empty or missing diagnosis")
        score -= 10

    if _is_missing(details.get("date")):
        reasons.append("Missing report date")
        score -= 10
    elif not _is_valid_date(details.get("date", "")):
        reasons.append("Invalid date format")
        score -= 5

    if ocr_confidence < 50:
        reasons.append("Poor OCR confidence")
        score -= 20
    elif ocr_confidence < 70:
        reasons.append("Moderate OCR confidence")
        score -= 10

    score = max(0.0, min(100.0, score))
    status = "VALID REPORT" if score >= 70 and len(reasons) <= 1 else "SUSPICIOUS REPORT"

    if not reasons:
        reasons.append("All key fields detected successfully")

    summary = _build_summary(details, status, score, reasons)

    return {
        "verification_status": status,
        "confidence_score": round(score, 1),
        "reasons": reasons,
        "summary": summary,
    }


def _build_summary(details, status, score, reasons):
    lines = [
        f"Verification Status: {status}",
        f"Verification Score: {score}%",
        "",
        "Extracted Information:",
        f"  Patient: {details.get('patient_name', 'N/A')}",
        f"  Age: {details.get('age', 'N/A')}",
        f"  Gender: {details.get('gender', 'N/A')}",
        f"  Hospital: {details.get('hospital', 'N/A')}",
        f"  Doctor: {details.get('doctor', 'N/A')}",
        f"  Date: {details.get('date', 'N/A')}",
        f"  Diagnosis: {details.get('diagnosis', 'N/A')}",
        f"  Medicines: {details.get('medicines', 'N/A')}",
        f"  Test Results: {details.get('test_results', 'N/A')}",
        "",
        "Analysis Notes:",
    ]
    for reason in reasons:
        lines.append(f"  - {reason}")

    return "\n".join(lines)
