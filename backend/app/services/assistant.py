from app.config import get_settings

FALLBACK_REPLIES = [
    {
        "keywords": ("chest pain", "can't breathe", "cannot breathe", "fainted", "fainting", "emergency"),
        "reply": (
            "Those symptoms can be an emergency. This assistant cannot triage or diagnose. "
            "Contact local emergency services or urgent care now."
        ),
        "emergency": True,
    },
    {
        "keywords": ("cholesterol", "ldl"),
        "reply": (
            "Cholesterol values are interpreted by clinicians in context (age, other conditions, medications). "
            "This app does not prescribe statins or any other drug."
        ),
        "emergency": False,
    },
    {
        "keywords": ("blood pressure", "hypertension", "bp"),
        "reply": (
            "Blood pressure targets are individualized. Home readings can be useful to show a clinician. "
            "This assistant does not adjust medication doses."
        ),
        "emergency": False,
    },
    {
        "keywords": ("exercise", "walk", "activity"),
        "reply": (
            "Physical activity is often part of heart-healthy living when a clinician says it is appropriate. "
            "Stop and seek care if activity causes severe chest pain, fainting, or severe breathlessness."
        ),
        "emergency": False,
    },
    {
        "keywords": ("aspirin", "statin", "dose", "tablet", "stop taking"),
        "reply": (
            "I cannot prescribe, stop, or change medicines. Questions about tablets and doses need a licensed clinician."
        ),
        "emergency": False,
    },
]


def answer_health_question(message: str) -> dict:
    settings = get_settings()
    text = message.strip()
    lowered = text.lower()
    disclaimer = (
        "Educational assistant only. Not a diagnosis, prescription, or emergency service. "
        "The ML prediction pipeline is separate and is not overridden by this chat."
    )
    if not text:
        return {"reply": "Please enter a general health-information question.", "emergency": False, "disclaimer": disclaimer, "source": "fallback"}

    if settings.openai_api_key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=settings.openai_api_key)
            completion = client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an educational heart-health assistant. Never diagnose, never prescribe, "
                            "never change doses, never tell users to stop prescribed medication. "
                            "If symptoms may be an emergency, tell them to seek emergency care. "
                            "You cannot override ML model outputs."
                        ),
                    },
                    {"role": "user", "content": text},
                ],
                temperature=0.2,
            )
            reply = completion.choices[0].message.content or "I could not generate a reply."
            emergency = any(word in lowered for word in ("chest pain", "faint", "can't breathe", "cannot breathe"))
            return {"reply": reply, "emergency": emergency, "disclaimer": disclaimer, "source": "openai"}
        except Exception as exc:
            fallback = _fallback(lowered)
            fallback["reply"] = f"(Live AI unavailable: {exc}) {fallback['reply']}"
            fallback["disclaimer"] = disclaimer
            return fallback

    result = _fallback(lowered)
    result["disclaimer"] = disclaimer
    return result


def _fallback(lowered: str) -> dict:
    for item in FALLBACK_REPLIES:
        if any(keyword in lowered for keyword in item["keywords"]):
            return {"reply": item["reply"], "emergency": item["emergency"], "source": "curated_fallback"}
    return {
        "reply": (
            "I can discuss general heart-health education such as activity, food patterns, "
            "and why clinician follow-up matters. I cannot diagnose or prescribe. "
            "If you feel severely unwell, seek in-person emergency care."
        ),
        "emergency": False,
        "source": "curated_fallback",
    }
