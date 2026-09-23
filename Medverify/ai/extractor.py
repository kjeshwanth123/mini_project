import re


def _search(patterns, text):
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            value = match.group(1).strip()
            if value and value.lower() not in ("na", "n/a", "-"):
                return value
    return "Not Found"


def extract_details(text):
    if not text or not text.strip():
        return _empty_details()

    details = {
        "patient_name": _search(
            [
                r"(?:Patient\s*Name|Patient|Name)\s*[:\-]\s*(.+)",
                r"(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Za-z][A-Za-z\s\.]{2,40})",
            ],
            text,
        ),
        "age": _search(
            [
                r"(?:Age|Pge|Aqe)\s*[:\-]?\s*(\d{1,3})",
                r"(\d{1,3})\s*(?:years?\s*old|yrs?\.?|Y\.?O\.?)",
            ],
            text,
        ),
        "gender": _search(
            [
                r"(?:Gender|Sex)\s*[:\-]\s*(Male|Female|M|F|Other)",
                r"\b(Male|Female)\b",
            ],
            text,
        ),
        "hospital": _extract_hospital(text),
        "doctor": _extract_doctor(text),
        "date": _search(
            [
                r"(?:Date|Report\s*Date|Date\s*of\s*Report|Issued\s*on)\s*[:\-]\s*(.+)",
                r"\b(\d{1,2}[/,\-\.]\d{1,2}[/,\-\.]\d{2,4})\b",
                r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b",
            ],
            text,
        ),
        "diagnosis": _extract_diagnosis(text),
        "medicines": _search(
            [
                r"(?:Medicines?|Medications?|Prescription|Rx)\s*[:\-]?\s*(.+)",
                r"(?:Prescribed\s*Medicines?)\s*[:\-]\s*(.+)",
            ],
            text,
        ),
        "test_results": _search(
            [
                r"(?:Test\s*Results?|Lab\s*Results?|Investigation\s*Results?)\s*[:\-]?\s*(.+)",
                r"(?:Findings?|Result)\s*[:\-]\s*(.+)",
            ],
            text,
        ),
    }

    return details


def _extract_hospital(text):
    match = re.search(
        r"(?:Hospital|H[o0]spital|Hcspital|Clinic|Medical\s*Center)\s*[:\-]?\s*(.+)",
        text,
        re.IGNORECASE,
    )
    if match:
        return match.group(1).strip()

    match = re.search(
        r"(?:Hospital|H[o0]spital|Hcspital)\s+(.+)",
        text,
        re.IGNORECASE,
    )
    if match:
        return match.group(1).strip()

    return "Not Found"


def _extract_doctor(text):
    match = re.search(
        r"(?:Doctor|Physician|Consultant)\s*[:\-]\s*(?:Dr\.?\s*:?\s*)?(.+)",
        text,
        re.IGNORECASE,
    )
    if match:
        name = match.group(1).strip()
        name = re.sub(r"^Dr\.?\s*:?\s*", "", name, flags=re.IGNORECASE)
        return name.strip() or "Not Found"

    match = re.search(r"Dr\.?\s+([A-Za-z][A-Za-z\s\.]{2,40})", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    return "Not Found"


def _extract_diagnosis(text):
    match = re.search(
        r"(?:Diagnosis|Diagncsis|Disease|Condition|Impression)\s*[:\-]?\s*(.+)",
        text,
        re.IGNORECASE,
    )
    if match:
        value = match.group(1).strip()
        value = re.sub(r"^(?:Pcute|Acute)\s+", "Acute ", value, flags=re.IGNORECASE)
        return value

    return "Not Found"


def _empty_details():
    return {
        "patient_name": "Not Found",
        "age": "Not Found",
        "gender": "Not Found",
        "hospital": "Not Found",
        "doctor": "Not Found",
        "date": "Not Found",
        "diagnosis": "Not Found",
        "medicines": "Not Found",
        "test_results": "Not Found",
    }
