import os
import uuid

from flask import (
    Flask,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import LoginManager, current_user, login_required, login_user, logout_user
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from ai.analyzer import analyze_report
from ai.extractor import extract_details
from ai.ocr import extract_text
from config import Config
from models.model import MedicalReport, User, db

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"
login_manager.login_message_category = "warning"


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in app.config["ALLOWED_EXTENSIONS"]
    )


def generate_unique_filename(original_filename):
    ext = original_filename.rsplit(".", 1)[1].lower()
    safe_name = secure_filename(original_filename.rsplit(".", 1)[0]) or "report"
    return f"{safe_name}_{uuid.uuid4().hex[:8]}.{ext}"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not username or not email or not password:
            flash("All fields are required.", "danger")
            return redirect(url_for("register"))

        if len(password) < 6:
            flash("Password must be at least 6 characters.", "danger")
            return redirect(url_for("register"))

        if User.query.filter_by(email=email).first():
            flash("Email already registered!", "danger")
            return redirect(url_for("register"))

        if User.query.filter_by(username=username).first():
            flash("Username already taken!", "danger")
            return redirect(url_for("register"))

        user = User(
            username=username,
            email=email,
            password=generate_password_hash(password),
        )
        db.session.add(user)
        db.session.commit()

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            flash(f"Welcome back, {user.username}!", "success")
            next_page = request.args.get("next")
            return redirect(next_page or url_for("dashboard"))

        flash("Invalid email or password.", "danger")

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Logged out successfully.", "info")
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required
def dashboard():
    reports = (
        MedicalReport.query.filter_by(user_id=current_user.id)
        .order_by(MedicalReport.created_at.desc())
        .limit(5)
        .all()
    )
    return render_template("dashboard.html", reports=reports, user=current_user)


@app.route("/upload", methods=["POST"])
@login_required
def upload():
    if "report" not in request.files:
        flash("No file selected.", "danger")
        return redirect(url_for("dashboard"))

    file = request.files["report"]

    if file.filename == "":
        flash("No file selected.", "danger")
        return redirect(url_for("dashboard"))

    if not allowed_file(file.filename):
        flash("Only JPG, JPEG, PNG, and PDF files are allowed.", "danger")
        return redirect(url_for("dashboard"))

    filename = generate_unique_filename(file.filename)
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    try:
        file.save(filepath)

        ocr_result = extract_text(filepath)
        extracted_text = ocr_result.get("text", "")
        ocr_confidence = ocr_result.get("confidence", 0.0)

        if not extracted_text.strip():
            flash("OCR failed: no text could be extracted from the report.", "warning")
            os.remove(filepath)
            return redirect(url_for("dashboard"))

        details = extract_details(extracted_text)
        analysis = analyze_report(details, ocr_confidence, extracted_text)

        report = MedicalReport(
            user_id=current_user.id,
            filename=filename,
            patient_name=details.get("patient_name", "Not Found"),
            age=details.get("age", "Not Found"),
            gender=details.get("gender", "Not Found"),
            hospital=details.get("hospital", "Not Found"),
            doctor=details.get("doctor", "Not Found"),
            diagnosis=details.get("diagnosis", "Not Found"),
            medicines=details.get("medicines", "Not Found"),
            test_results=details.get("test_results", "Not Found"),
            report_date=details.get("date", "Not Found"),
            extracted_text=extracted_text,
            verification_status=analysis["verification_status"],
            confidence_score=analysis["confidence_score"],
        )

        db.session.add(report)
        db.session.commit()

        flash("Report uploaded and analyzed successfully!", "success")
        return redirect(url_for("report_detail", report_id=report.id))

    except Exception as exc:
        db.session.rollback()
        if os.path.exists(filepath):
            os.remove(filepath)
        flash(f"Error processing report: {str(exc)}", "danger")
        return redirect(url_for("dashboard"))


@app.route("/reports")
@login_required
def reports():
    user_reports = (
        MedicalReport.query.filter_by(user_id=current_user.id)
        .order_by(MedicalReport.created_at.desc())
        .all()
    )
    return render_template("reports.html", reports=user_reports)


@app.route("/reports/<int:report_id>")
@login_required
def report_detail(report_id):
    report = MedicalReport.query.filter_by(id=report_id, user_id=current_user.id).first_or_404()
    return render_template("report_detail.html", report=report)


@app.route("/reports/<int:report_id>/delete", methods=["POST"])
@login_required
def delete_report(report_id):
    report = MedicalReport.query.filter_by(id=report_id, user_id=current_user.id).first_or_404()

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], report.filename)
    if os.path.exists(filepath):
        os.remove(filepath)

    db.session.delete(report)
    db.session.commit()

    flash("Report deleted successfully.", "info")
    return redirect(url_for("reports"))


@app.errorhandler(413)
def too_large(_error):
    flash("File too large. Maximum upload size is 16 MB.", "danger")
    return redirect(url_for("dashboard"))


if __name__ == "__main__":
    with app.app_context():
        db.create_all()

        demo_user = User.query.filter_by(email="demo@medverify.com").first()
        if not demo_user:
            demo_user = User(
                username="demo",
                email="demo@medverify.com",
                password=generate_password_hash("demo123"),
            )
            db.session.add(demo_user)
            db.session.commit()
            print("Demo user created: demo@medverify.com / demo123")

    app.run(host="127.0.0.1", port=5000, debug=False)
