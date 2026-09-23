# MedVerify

AI-powered medical report verification system built with Flask, EasyOCR, and SQLite.

## Features

- User registration, login, logout with password hashing
- Upload medical reports (JPG, JPEG, PNG, PDF)
- OCR text extraction using EasyOCR and PyMuPDF
- Automatic field extraction (patient, hospital, doctor, diagnosis, etc.)
- AI verification with confidence score
- Report history with view and delete
- Modern Bootstrap 5 UI

## Project Structure

```
MedVerify/
├── app.py                 # Main Flask application
├── config.py              # App configuration
├── requirements.txt       # Python dependencies
├── ai/
│   ├── ocr.py             # OCR pipeline (images + PDF)
│   ├── extractor.py       # Field extraction from text
│   └── analyzer.py        # Report verification logic
├── models/
│   └── model.py           # User and MedicalReport models
├── templates/             # Jinja2 HTML templates
├── static/css/            # Custom styles
├── uploads/               # Uploaded report files
└── database/              # SQLite database
```

## Installation

1. Install Python 3.10+ (tested on Python 3.14)

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python app.py
   ```

4. Open in browser:
   ```
   http://127.0.0.1:5000
   ```

## Test Credentials

A demo account is created automatically on first run:

| Field    | Value              |
|----------|--------------------|
| Email    | demo@medverify.com |
| Password | demo123            |

You can also register a new account from the Register page.

## Usage

1. Register or login with demo credentials
2. Go to Dashboard
3. Upload a medical report image or PDF
4. View extracted fields and verification result
5. Check Report History for past uploads

## Sample Report

A sample report image is included at `uploads/sample_report.png` for testing OCR.

## Tech Stack

- **Backend:** Python, Flask, Flask-Login, Flask-SQLAlchemy
- **Frontend:** HTML, CSS, Bootstrap 5, Jinja2
- **Database:** SQLite
- **AI/OCR:** EasyOCR, OpenCV, Pillow, PyMuPDF
