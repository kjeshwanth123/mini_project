from __future__ import annotations

import math
import re
from typing import Any, Optional
from app.config import get_settings

# Curated Cardiological Knowledge Base Chunks for RAG
KNOWLEDGE_BASE = [
    {
        "id": "kb_emergency_01",
        "category": "Emergency Warning",
        "keywords": ["chest pain", "pressure", "crushing", "left arm", "jaw pain", "shortness of breath", "fainting", "syncope", "dizziness"],
        "title": "Acute Coronary Syndrome & Red Flag Symptoms",
        "content": (
            "Symptoms of acute myocardial infarction or ischemia include sudden crushing or squeezing chest pressure, "
            "pain radiating to the left arm, jaw, neck, or back, associated with dyspnea (shortness of breath), diaphoresis (cold sweats), "
            "and presyncope/syncope. If you or someone else experiences these symptoms, call emergency services immediately (911/112). "
            "Do not drive yourself to the emergency department."
        ),
        "is_emergency": True,
    },
    {
        "id": "kb_bp_01",
        "category": "Blood Pressure",
        "keywords": ["blood pressure", "bp", "hypertension", "systolic", "diastolic", "mmhg", "high bp"],
        "title": "AHA/ACC Blood Pressure Categories and Management",
        "content": (
            "According to the ACC/AHA guidelines: Normal BP is systolic <120 and diastolic <80 mmHg. "
            "Elevated BP is 120-129/<80 mmHg. Stage 1 Hypertension is 130-139 / 80-89 mmHg. "
            "Stage 2 Hypertension is >=140 / >=90 mmHg. Hypertensive crisis is >180 / >120 mmHg. "
            "Managing blood pressure involves sodium restriction (<2,300 mg/day, ideally <1,500 mg/day), regular aerobic exercise, "
            "weight management, stress reduction, and adherence to prescribed antihypertensives."
        ),
        "is_emergency": False,
    },
    {
        "id": "kb_chol_01",
        "category": "Lipids & Cholesterol",
        "keywords": ["cholesterol", "lipid", "ldl", "hdl", "triglycerides", "statin", "fats", "hyperlipidemia"],
        "title": "Lipid Panel Interpretation & Atherosclerosis Prevention",
        "content": (
            "Total cholesterol under 200 mg/dL is desirable. Borderline high is 200-239 mg/dL; high is >=240 mg/dL. "
            "LDL ('bad' cholesterol) contributes to atheroma plaque formation in coronary arteries; target is often <100 mg/dL "
            "or <70 mg/dL for high-risk individuals. HDL ('good' cholesterol) is protective when >=50 mg/dL for women and >=40 mg/dL for men. "
            "Nutritional interventions include replacing saturated/trans fats with monounsaturated and polyunsaturated fats, "
            "increasing soluble fiber (oats, legumes, flaxseed), and discussing lipid-lowering therapy with a physician."
        ),
        "is_emergency": False,
    },
    {
        "id": "kb_ecg_01",
        "category": "ECG & Diagnostics",
        "keywords": ["ecg", "ekg", "st depression", "oldpeak", "st slope", "resting ecg", "hypertrophy", "lvh", "t wave"],
        "title": "Resting and Stress Electrocardiogram (ECG) Markers",
        "content": (
            "Resting ECG assessments detect electrical conduction patterns, arrhythmias, and structural changes such as Left Ventricular "
            "Hypertrophy (LVH). During exercise stress testing, ST-segment depression (Oldpeak) quantified in millimeters indicates potential "
            "subendocardial myocardial ischemia. Downsloping or horizontal ST depression is more predictive of significant coronary stenosis "
            "than rapid upsloping changes. Definitive diagnosis requires angiographic correlation or stress imaging."
        ),
        "is_emergency": False,
    },
    {
        "id": "kb_hr_01",
        "category": "Heart Rate & Fitness",
        "keywords": ["heart rate", "max hr", "bpm", "pulse", "tachycardia", "bradycardia", "exercise", "aerobic", "cardio"],
        "title": "Heart Rate Dynamics and Aerobic Fitness",
        "content": (
            "Estimated maximum heart rate is conventionally approximated as 220 minus age. Higher peak heart rate achieved during exercise "
            "often reflects favorable cardiac reserve and aerobic conditioning. Inability to reach at least 85% of age-predicted maximum heart rate "
            "(chronotropic incompetence) can be an independent prognostic risk marker. Moderate cardiovascular training (150 minutes/week) "
            "enhances stroke volume and improves resting bradycardia."
        ),
        "is_emergency": False,
    },
    {
        "id": "kb_fbs_01",
        "category": "Metabolic Health",
        "keywords": ["glucose", "blood sugar", "fasting blood sugar", "diabetes", "fbs", "insulin", "a1c", "metabolic"],
        "title": "Fasting Blood Sugar & Diabetes Cardiovascular Interplay",
        "content": (
            "Fasting blood glucose >=126 mg/dL on multiple tests indicates diabetes; 100-125 mg/dL indicates prediabetes. "
            "Hyperglycemia accelerates endothelial injury, arterial stiffness, and advanced glycation end-products that worsen atherosclerosis. "
            "Tight glycemic control combined with lipid and blood pressure management reduces long-term macrovascular complications."
        ),
        "is_emergency": False,
    },
    {
        "id": "kb_angina_01",
        "category": "Chest Pain & Angina",
        "keywords": ["angina", "chest pain type", "exercise angina", "substernal", "atypical", "ischemia", "nitroglycerin"],
        "title": "Classification of Angina and Symptom Profiles",
        "content": (
            "Typical angina fulfills 3 criteria: substernal discomfort with characteristic quality and duration, provoked by exertion or emotional stress, "
            "and relieved by rest or nitroglycerin within minutes. Atypical angina meets 2 criteria; non-anginal pain meets 1 or none. "
            "Exercise-induced angina warrants thorough evaluation by a cardiologist, including functional stress testing."
        ),
        "is_emergency": False,
    },
    {
        "id": "kb_lifestyle_01",
        "category": "Lifestyle & Prevention",
        "keywords": ["diet", "prevention", "dash", "mediterranean", "smoking", "weight", "bmi", "sleep", "stress"],
        "title": "Cardiovascular Prevention & Lifestyle Modification",
        "content": (
            "Primary prevention centers on Mediterranean or DASH diets rich in vegetables, legumes, whole grains, nuts, and lean proteins. "
            "Smoking cessation is the single most impactful modifiable behavioral intervention, cutting coronary risk by 50% within one year. "
            "Adequate restorative sleep (7-8 hours/night) and structured stress reduction mitigate chronic sympathetic activation."
        ),
        "is_emergency": False,
    },
]


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"\w+", text.lower())
    stop_words = {"the", "a", "an", "is", "in", "it", "of", "and", "or", "to", "for", "with", "on", "at", "by", "what", "how", "why", "my", "i"}
    return {w for w in words if w not in stop_words and len(w) > 1}


def retrieve_relevant_context(query: str, top_k: int = 2) -> list[dict[str, Any]]:
    """RAG retrieval over medical knowledge base using keyword + token overlap scoring."""
    query_tokens = _tokenize(query)
    if not query_tokens:
        return KNOWLEDGE_BASE[:top_k]

    scored = []
    for item in KNOWLEDGE_BASE:
        score = 0.0
        # Keyword matches (high weight)
        for kw in item["keywords"]:
            if kw in query.lower():
                score += 3.0
            kw_tokens = _tokenize(kw)
            overlap = query_tokens.intersection(kw_tokens)
            score += len(overlap) * 1.5

        # Content token overlap
        content_tokens = _tokenize(item["content"]).union(_tokenize(item["title"]))
        overlap = query_tokens.intersection(content_tokens)
        score += len(overlap) * 0.5

        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    if scored:
        return [item for _, item in scored[:top_k]]
    return KNOWLEDGE_BASE[:top_k]


def answer_health_question(
    message: str,
    patient_context: Optional[dict[str, Any]] = None,
    report_text: Optional[str] = None,
) -> dict[str, Any]:
    """
    RAG-powered conversational medical assistant.
    Combines retrieved knowledge chunks + patient metrics + report text.
    """
    settings = get_settings()
    text = message.strip()
    lowered = text.lower()
    disclaimer = (
        "Medical Educational Assistant only. Not a substitute for professional clinical diagnosis, "
        "prescription, or emergency medical treatment. In an emergency, contact emergency medical services immediately."
    )

    if not text:
        return {
            "reply": "Hello! I am your Heart Health AI Assistant. You can ask me questions about blood pressure, cholesterol, ECG markers, diet, exercise guidelines, or how to interpret your medical test results.",
            "emergency": False,
            "disclaimer": disclaimer,
            "source": "greeting",
            "retrieved_sources": [],
        }

    # Emergency check
    emergency_tokens = ["chest pain", "crushing", "cant breathe", "can't breathe", "fainted", "fainting", "heart attack", "call ambulance"]
    is_emergency = any(token in lowered for token in emergency_tokens)

    # Retrieve relevant RAG context
    retrieved = retrieve_relevant_context(text, top_k=2)
    retrieved_sources = [f"{item['title']} ({item['category']})" for item in retrieved]

    # Check for live OpenAI integration if key is provided
    if settings.openai_api_key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=settings.openai_api_key)

            rag_context_str = "\n\n".join([f"[{item['title']}]: {item['content']}" for item in retrieved])
            patient_context_str = f"Patient Parameters: {patient_context}" if patient_context else "No active patient record loaded."
            report_str = f"Medical Report Snippet: {report_text[:1000]}" if report_text else "No uploaded report text."

            system_prompt = (
                "You are an expert, compassionate AI Heart Health Assistant in an educational decision-support web platform. "
                "Adhere strictly to these principles:\n"
                "1. Educational and decision-support guidance only. NEVER diagnose diseases or prescribe drug dosages.\n"
                "2. Ground your explanations in the provided clinical knowledge base and patient context.\n"
                "3. If emergency symptoms are mentioned, immediately advise contacting emergency services.\n"
                "4. Structure your response clearly using bullet points and accessible language.\n\n"
                f"Retrieved Clinical Knowledge:\n{rag_context_str}\n\n"
                f"{patient_context_str}\n{report_str}"
            )

            completion = client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text},
                ],
                temperature=0.3,
            )
            reply = completion.choices[0].message.content or "I could not generate an answer at this time."
            return {
                "reply": reply,
                "emergency": is_emergency,
                "disclaimer": disclaimer,
                "source": "openai_rag",
                "retrieved_sources": retrieved_sources,
            }
        except Exception as exc:
            pass  # Fall through to robust offline RAG engine

    # Offline RAG Synthesis Engine
    synthesis_parts = []

    if is_emergency:
        synthesis_parts.append(
            "⚠️ **URGENT SAFETY NOTICE**: The symptoms described can represent a cardiac emergency. "
            "Please call local emergency services (911 / 112) or go to the nearest emergency department immediately. "
            "Do not wait or drive yourself."
        )

    # Add synthesized answers from retrieved RAG knowledge
    for item in retrieved:
        synthesis_parts.append(f"### {item['title']}\n{item['content']}")

    # If patient context was supplied, add personalized educational relevance
    if patient_context:
        ctx_notes = []
        if "resting_bp" in patient_context and ("bp" in lowered or "pressure" in lowered or "hypertension" in lowered):
            bp = patient_context["resting_bp"]
            status = "normal" if bp < 120 else "elevated" if bp < 130 else "stage 1 hypertensive range" if bp < 140 else "stage 2 hypertensive range"
            ctx_notes.append(f"- Your last recorded resting blood pressure was **{bp} mmHg**, which falls into the **{status}**.")
        if "cholesterol" in patient_context and ("cholesterol" in lowered or "lipid" in lowered):
            chol = patient_context["cholesterol"]
            c_status = "desirable" if chol < 200 else "borderline high" if chol < 240 else "high"
            ctx_notes.append(f"- Your recorded total cholesterol was **{chol} mg/dL**, categorized as **{c_status}**.")
        if "max_heart_rate" in patient_context and ("heart rate" in lowered or "pulse" in lowered or "exercise" in lowered):
            hr = patient_context["max_heart_rate"]
            ctx_notes.append(f"- Your recorded peak heart rate was **{hr} bpm**.")

        if ctx_notes:
            synthesis_parts.append("### Personalized Context from Your Profile\n" + "\n".join(ctx_notes))

    if report_text and ("report" in lowered or "result" in lowered or "lab" in lowered):
        synthesis_parts.append(
            "### Medical Report Analysis\n"
            "Your uploaded report parameters have been mapped into the clinical feature model. "
            "Please review individual values with your consulting physician to discuss appropriate confirmatory diagnostic tests."
        )

    # General conclusion
    synthesis_parts.append(
        "💡 *Tip: Regular cardiovascular check-ups, maintaining a balanced Mediterranean/DASH diet, and 150 minutes of weekly aerobic exercise are proven ways to maintain heart health.*"
    )

    return {
        "reply": "\n\n".join(synthesis_parts),
        "emergency": is_emergency,
        "disclaimer": disclaimer,
        "source": "rag_engine",
        "retrieved_sources": retrieved_sources,
    }
