from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.entities import AuditLog, MedicationInformation, PatientProfile, User, UserRole
from app.security.passwords import hash_password

EDUCATIONAL_MEDICATIONS = [
    {
        "condition": "High cholesterol (educational)",
        "medication_name": "Atorvastatin (statin class, example)",
        "purpose": "Statins are commonly used to lower LDL cholesterol as part of cardiovascular risk management prescribed by a clinician.",
        "general_information": (
            "This is educational information about a medication class, not a prescription. "
            "Statins reduce cholesterol production in the liver. Whether any statin is appropriate "
            "depends on a clinician's assessment of labs, other conditions, and current medicines."
        ),
        "warnings": (
            "Do not start, stop, or change any medicine based on this application. "
            "Seek medical care for unexplained muscle pain, weakness, or dark urine while taking a statin. "
            "Always follow the prescriber and the product labeling."
        ),
        "source": "U.S. National Library of Medicine MedlinePlus: Atorvastatin (https://medlineplus.gov/druginfo/meds/a600045.html)",
    },
    {
        "condition": "Hypertension / heart rate control (educational)",
        "medication_name": "Metoprolol (beta blocker class, example)",
        "purpose": "Beta blockers are sometimes prescribed to treat high blood pressure, angina, or certain heart-rhythm and heart-failure conditions.",
        "general_information": (
            "This is educational information about a medication class, not a prescription. "
            "Beta blockers can slow heart rate and reduce the heart's workload. Suitability is a clinical decision."
        ),
        "warnings": (
            "Do not start, stop, or change any medicine based on this application. "
            "Suddenly stopping a beta blocker can be harmful for some people. Discuss all changes with a clinician."
        ),
        "source": "U.S. National Library of Medicine MedlinePlus: Metoprolol (https://medlineplus.gov/druginfo/meds/a682864.html)",
    },
    {
        "condition": "Hypertension / heart failure / post-MI (educational)",
        "medication_name": "Lisinopril (ACE inhibitor class, example)",
        "purpose": "ACE inhibitors are commonly prescribed for high blood pressure, heart failure, and after some heart attacks.",
        "general_information": (
            "This is educational information about a medication class, not a prescription. "
            "ACE inhibitors relax blood vessels and can reduce strain on the heart when a clinician prescribes them."
        ),
        "warnings": (
            "Do not start, stop, or change any medicine based on this application. "
            "ACE inhibitors can affect kidney function and potassium, and they are generally avoided in pregnancy. "
            "Seek care for swelling of the face or difficulty breathing."
        ),
        "source": "U.S. National Library of Medicine MedlinePlus: Lisinopril (https://medlineplus.gov/druginfo/meds/a692051.html)",
    },
    {
        "condition": "Antiplatelet therapy (educational)",
        "medication_name": "Aspirin (when prescribed or recommended by a clinician)",
        "purpose": "Low-dose aspirin is sometimes used to reduce the chance of clot-related events in selected patients after clinician review of bleeding risk.",
        "general_information": (
            "This is educational information, not a recommendation to take aspirin. "
            "Daily aspirin is not appropriate for everyone and can cause bleeding."
        ),
        "warnings": (
            "Do not start daily aspirin because of this application. "
            "People with bleeding disorders, stomach ulcers, or upcoming surgery need individualized advice. "
            "Call emergency services for signs of a heart attack or stroke."
        ),
        "source": "U.S. FDA: Aspirin for Reducing Your Risk of Heart Attack and Stroke (https://www.fda.gov/drugs/safe-use-aspirin/aspirin-reducing-your-risk-heart-attack-and-stroke-know-facts)",
    },
]


def write_audit(db: Session, action: str, user_id: int | None = None, details: dict | None = None) -> None:
    db.add(AuditLog(user_id=user_id, action=action, details=details or {}))


def seed_admin(db: Session) -> None:
    settings = get_settings()
    if not settings.admin_email or not settings.admin_password:
        return
    existing = db.query(User).filter(User.email == settings.admin_email.lower()).first()
    if existing:
        return
    admin = User(
        name="System Administrator",
        email=settings.admin_email.lower(),
        password_hash=hash_password(settings.admin_password),
        role=UserRole.ADMIN.value,
    )
    db.add(admin)
    db.flush()
    write_audit(db, "seed_admin", admin.id, {"email": admin.email})


def seed_medications(db: Session) -> None:
    if db.query(MedicationInformation).count() > 0:
        return
    for row in EDUCATIONAL_MEDICATIONS:
        db.add(MedicationInformation(**row))


def ensure_patient_profile(db: Session, user: User) -> PatientProfile:
    if user.patient_profile:
        return user.patient_profile
    profile = PatientProfile(user_id=user.id)
    db.add(profile)
    db.flush()
    return profile


def seed_database(db: Session) -> None:
    seed_admin(db)
    seed_medications(db)
    db.commit()
