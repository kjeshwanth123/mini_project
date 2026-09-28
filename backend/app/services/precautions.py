DISCLAIMER = (
    "This result is a statistical model score for education and decision support. "
    "It is not a diagnosis, not medical certainty, and not a reason to start, stop, "
    "or change medication. Discuss concerning results with a qualified clinician."
)

EMERGENCY_TEXT = (
    "The information you entered includes symptoms that may require immediate medical attention. "
    "This application cannot diagnose an emergency. Contact local emergency services or go to "
    "urgent care now. Do not wait for this website."
)


def emergency_triggered(symptoms: dict | None) -> bool:
    if not symptoms:
        return False
    flags = (
        "severe_chest_pain",
        "difficulty_breathing",
        "fainting",
        "sudden_weakness",
    )
    return any(bool(symptoms.get(name)) for name in flags)


def build_precautions(features: dict, risk_level: str) -> list[dict]:
    items = [
        {
            "category": "professional_care",
            "recommendation": (
                "Share these numbers with a qualified clinician. Do not interpret this score as a diagnosis."
            ),
        },
        {
            "category": "activity",
            "recommendation": (
                "Regular physical activity is generally associated with heart health when a clinician says it is appropriate for you."
            ),
        },
        {
            "category": "diet",
            "recommendation": (
                "Heart-healthy eating patterns typically emphasize vegetables, fruit, whole grains, and limited ultra-processed food. Individual diet advice belongs with a clinician or dietitian."
            ),
        },
        {
            "category": "substances",
            "recommendation": (
                "Avoiding tobacco and limiting excessive alcohol are general public-health recommendations related to cardiovascular risk."
            ),
        },
    ]
    if features.get("resting_bp", 0) >= 130:
        items.append(
            {
                "category": "blood_pressure",
                "recommendation": (
                    "The entered resting blood pressure is in a range often discussed as elevated. "
                    "Home or clinic monitoring and clinician review are educational next steps — not a treatment plan from this app."
                ),
            }
        )
    if features.get("cholesterol", 0) >= 200:
        items.append(
            {
                "category": "cholesterol",
                "recommendation": (
                    "The entered cholesterol value may warrant clinician-ordered labs and interpretation. "
                    "This app does not prescribe lipid-lowering therapy."
                ),
            }
        )
    if features.get("fasting_blood_sugar") == 1:
        items.append(
            {
                "category": "glucose",
                "recommendation": (
                    "A fasting blood sugar flag of 1 in this form means the value was recorded as elevated on the educational scale used by the dataset. Discuss glucose testing with a clinician."
                ),
            }
        )
    if features.get("exercise_angina") == 1:
        items.append(
            {
                "category": "symptoms",
                "recommendation": (
                    "Exercise-related chest discomfort should be reviewed by a clinician promptly. Stop activity that brings on severe pain and seek urgent care if pain is severe or persistent."
                ),
            }
        )
    if risk_level == "high":
        items.append(
            {
                "category": "follow_up",
                "recommendation": (
                    "The model placed this input in the high score band. That is not a confirmed disease label. Arrange professional medical review rather than self-treatment."
                ),
            }
        )
    return items
