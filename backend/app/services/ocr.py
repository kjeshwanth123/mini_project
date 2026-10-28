from __future__ import annotations

import io
import re
import logging
from typing import Any, Optional
from PIL import Image

logger = logging.getLogger(__name__)


def extract_text_from_file(content: bytes, filename: str) -> str:
    """Extract raw text from PDF or image using PyMuPDF and Pillow/pytesseract."""
    lower_name = filename.lower()
    extracted_text = ""

    if lower_name.endswith(".pdf"):
        try:
            import fitz  # PyMuPDF

            doc = fitz.open(stream=content, filetype="pdf")
            pages_text = []
            for page in doc:
                text = page.get_text()
                pages_text.append(text)
            extracted_text = "\n".join(pages_text).strip()
            doc.close()
        except Exception as exc:
            logger.warning("PyMuPDF PDF text extraction failed: %s", exc)

        # If PDF was scanned and has little text, try OCR on page images if pytesseract is available
        if len(extracted_text) < 50:
            try:
                import fitz
                import pytesseract

                doc = fitz.open(stream=content, filetype="pdf")
                ocr_pages = []
                for page in doc:
                    pix = page.get_pixmap(dpi=150)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_pages.append(pytesseract.image_to_string(img))
                if ocr_pages:
                    extracted_text = "\n".join(ocr_pages).strip()
                doc.close()
            except Exception as exc:
                logger.info("OCR on scanned PDF pages skipped: %s", exc)

    else:
        # Image file (PNG, JPG, JPEG)
        try:
            import pytesseract

            img = Image.open(io.BytesIO(content))
            extracted_text = pytesseract.image_to_string(img).strip()
        except Exception as exc:
            logger.info("pytesseract image extraction unavailable (%s); attempting heuristic metadata parse.", exc)

    return extracted_text


def parse_medical_parameters(text: str) -> dict[str, Any]:
    """Parse cardiological parameters from extracted medical report text."""
    features: dict[str, Any] = {}
    confidence: dict[str, float] = {}
    flags: list[str] = []

    # 1. Age
    age_match = re.search(r"(?:age|years\s*old|\byp\b)\s*[:=-]?\s*(\d{1,3})", text, re.IGNORECASE)
    if not age_match:
        age_match = re.search(r"(\d{2})\s*(?:yrs|years|yo|y/o)", text, re.IGNORECASE)
    if age_match:
        age_val = int(age_match.group(1))
        if 18 <= age_val <= 110:
            features["age"] = age_val
            confidence["age"] = 0.95

    # 2. Sex (0 = Female, 1 = Male)
    sex_match = re.search(r"(?:gender|sex)\s*[:=-]?\s*(male|female|m\b|f\b)", text, re.IGNORECASE)
    if sex_match:
        val = sex_match.group(1).lower()
        features["sex"] = 1 if "m" in val else 0
        confidence["sex"] = 0.95
    else:
        if re.search(r"\bmale\b|\bgentleman\b|\bmr\b", text, re.IGNORECASE):
            features["sex"] = 1
            confidence["sex"] = 0.8
        elif re.search(r"\bfemale\b|\blady\b|\bms\b|\bmrs\b", text, re.IGNORECASE):
            features["sex"] = 0
            confidence["sex"] = 0.8

    # 3. Resting Blood Pressure (Systolic)
    bp_match = re.search(r"(?:blood\s*pressure|b\.?p\.?|resting\s*bp)\s*[:=-]?\s*(\d{2,3})\s*(?:/|\\|\s+over\s+)\s*(\d{2,3})", text, re.IGNORECASE)
    if bp_match:
        systolic = int(bp_match.group(1))
        diastolic = int(bp_match.group(2))
        if 70 <= systolic <= 250:
            features["resting_bp"] = systolic
            confidence["resting_bp"] = 0.95
            if systolic >= 140 or diastolic >= 90:
                flags.append(f"Hypertension indicator: {systolic}/{diastolic} mmHg")
    else:
        sys_match = re.search(r"(?:systolic(?:\s*bp)?)\s*[:=-]?\s*(\d{2,3})", text, re.IGNORECASE)
        if sys_match:
            systolic = int(sys_match.group(1))
            if 70 <= systolic <= 250:
                features["resting_bp"] = systolic
                confidence["resting_bp"] = 0.85
                if systolic >= 140:
                    flags.append(f"Elevated Systolic BP: {systolic} mmHg")

    # 4. Cholesterol (Total)
    chol_match = re.search(r"(?:total\s*cholesterol|cholesterol(?:\s*total)?|tc)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)", text, re.IGNORECASE)
    if chol_match:
        chol_val = int(float(chol_match.group(1)))
        if 80 <= chol_val <= 600:
            features["cholesterol"] = chol_val
            confidence["cholesterol"] = 0.95
            if chol_val >= 240:
                flags.append(f"High Total Cholesterol: {chol_val} mg/dL")
            elif chol_val >= 200:
                flags.append(f"Borderline High Cholesterol: {chol_val} mg/dL")

    # 5. Fasting Blood Sugar (> 120 mg/dl is 1, else 0)
    fbs_match = re.search(r"(?:fasting\s*blood\s*(?:sugar|glucose)|fbs|glucose\s*fasting)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)", text, re.IGNORECASE)
    if fbs_match:
        fbs_val = float(fbs_match.group(1))
        features["fasting_blood_sugar"] = 1 if fbs_val > 120 else 0
        confidence["fasting_blood_sugar"] = 0.9
        if fbs_val > 120:
            flags.append(f"Elevated Fasting Blood Sugar: {fbs_val} mg/dL (>120 mg/dL)")

    # 6. Max Heart Rate
    hr_match = re.search(r"(?:maximum\s*heart\s*rate|max\s*hr|peak\s*heart\s*rate|max\s*pulse)\s*[:=-]?\s*(\d{2,3})", text, re.IGNORECASE)
    if not hr_match:
        hr_match = re.search(r"(?:heart\s*rate|pulse)\s*[:=-]?\s*(\d{2,3})\s*(?:bpm)?", text, re.IGNORECASE)
    if hr_match:
        hr_val = int(hr_match.group(1))
        if 50 <= hr_val <= 220:
            features["max_heart_rate"] = hr_val
            confidence["max_heart_rate"] = 0.85

    # 7. Chest Pain Type (0 = typical angina, 1 = atypical, 2 = non-anginal, 3 = asymptomatic)
    if re.search(r"typical\s*angina|substernal\s*chest\s*pain", text, re.IGNORECASE):
        features["chest_pain_type"] = 0
        confidence["chest_pain_type"] = 0.85
    elif re.search(r"atypical\s*angina|atypical\s*chest\s*pain", text, re.IGNORECASE):
        features["chest_pain_type"] = 1
        confidence["chest_pain_type"] = 0.85
    elif re.search(r"non[- ]anginal|sharp\s*chest\s*pain|pleuritic", text, re.IGNORECASE):
        features["chest_pain_type"] = 2
        confidence["chest_pain_type"] = 0.85
    elif re.search(r"asymptomatic|no\s*chest\s*pain", text, re.IGNORECASE):
        features["chest_pain_type"] = 3
        confidence["chest_pain_type"] = 0.85

    # 8. Exercise Induced Angina (1 = yes, 0 = no)
    if re.search(r"exercise[- ]induced\s*angina\s*[:=-]?\s*(?:yes|present|positive|true)", text, re.IGNORECASE):
        features["exercise_angina"] = 1
        confidence["exercise_angina"] = 0.9
        flags.append("Exercise-induced angina noted")
    elif re.search(r"exercise[- ]induced\s*angina\s*[:=-]?\s*(?:no|absent|negative|none|false)", text, re.IGNORECASE):
        features["exercise_angina"] = 0
        confidence["exercise_angina"] = 0.9

    # 9. Resting ECG (0 = normal, 1 = ST-T abnormality, 2 = LVH)
    if re.search(r"left\s*ventricular\s*hypertrophy|lvh", text, re.IGNORECASE):
        features["resting_ecg"] = 2
        confidence["resting_ecg"] = 0.9
        flags.append("Resting ECG shows Left Ventricular Hypertrophy (LVH)")
    elif re.search(r"st[- ]t\s*wave\s*abnormal|t[- ]wave\s*inversion|st\s*elevation|st\s*depression", text, re.IGNORECASE):
        features["resting_ecg"] = 1
        confidence["resting_ecg"] = 0.85
        flags.append("Resting ECG shows ST-T wave abnormalities")
    elif re.search(r"normal\s*ecg|normal\s*sinus\s*rhythm|unremarkable\s*ecg", text, re.IGNORECASE):
        features["resting_ecg"] = 0
        confidence["resting_ecg"] = 0.9

    # 10. Oldpeak (ST depression in mm)
    oldpeak_match = re.search(r"(?:st\s*depression|oldpeak)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:mm)?", text, re.IGNORECASE)
    if oldpeak_match:
        val = float(oldpeak_match.group(1))
        if 0.0 <= val <= 8.0:
            features["oldpeak"] = val
            confidence["oldpeak"] = 0.9
            if val >= 1.5:
                flags.append(f"Significant ST depression: {val} mm")

    # 11. ST Slope (0 = upsloping, 1 = flat, 2 = downsloping)
    if re.search(r"(?:st\s*slope|slope)\s*[:=-]?\s*upsloping", text, re.IGNORECASE):
        features["st_slope"] = 0
        confidence["st_slope"] = 0.85
    elif re.search(r"(?:st\s*slope|slope)\s*[:=-]?\s*flat", text, re.IGNORECASE):
        features["st_slope"] = 1
        confidence["st_slope"] = 0.85
    elif re.search(r"(?:st\s*slope|slope)\s*[:=-]?\s*downsloping", text, re.IGNORECASE):
        features["st_slope"] = 2
        confidence["st_slope"] = 0.85
        flags.append("Downsloping ST segment detected on stress test")

    # Build Clinical Summary
    num_found = len(features)
    if num_found == 0:
        summary = "No cardiological biomarkers could be automatically extracted from the uploaded file text. Please ensure the document is clear and contains lab or clinical measurements."
    else:
        parts = [f"Successfully extracted {num_found} cardiological parameters."]
        if flags:
            parts.append("Key findings: " + "; ".join(flags) + ".")
        else:
            parts.append("All parsed parameters appear within conventional baseline ranges.")
        parts.append("Please verify and adjust any fields before submitting for model prediction.")
        summary = " ".join(parts)

    return {
        "extracted_features": features,
        "confidence": confidence,
        "flags": flags,
        "summary": summary,
        "raw_text_snippet": (text[:600] + "...") if len(text) > 600 else text,
    }


def analyze_medical_report(content: bytes, filename: str) -> dict[str, Any]:
    text = extract_text_from_file(content, filename)
    parsed = parse_medical_parameters(text)
    return {
        "filename": filename,
        "file_size": len(content),
        "text_length": len(text),
        **parsed,
    }
