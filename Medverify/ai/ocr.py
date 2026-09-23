import os

import cv2
import fitz
import numpy as np
from PIL import Image

_reader = None


def _get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _reader


def _pdf_to_images(pdf_path):
    images = []
    doc = fitz.open(pdf_path)
    try:
        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(np.array(img))
    finally:
        doc.close()
    return images


def _read_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        with Image.open(image_path) as pil_img:
            img = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)
    return img


def extract_text(file_path):
    """
    Extract text from image or PDF.
    Returns dict with text, average confidence, and page count.
    """
    ext = os.path.splitext(file_path)[1].lower()
    reader = _get_reader()

    all_lines = []
    confidences = []

    if ext == ".pdf":
        images = _pdf_to_images(file_path)
        if not images:
            return {"text": "", "confidence": 0.0, "pages": 0}

        for img in images:
            results = reader.readtext(img)
            for _, text, conf in results:
                if text.strip():
                    all_lines.append(text.strip())
                    confidences.append(float(conf))
        pages = len(images)
    else:
        img = _read_image(file_path)
        if img is None:
            return {"text": "", "confidence": 0.0, "pages": 1}

        results = reader.readtext(img)
        for _, text, conf in results:
            if text.strip():
                all_lines.append(text.strip())
                confidences.append(float(conf))
        pages = 1

    avg_confidence = (sum(confidences) / len(confidences) * 100) if confidences else 0.0
    return {
        "text": "\n".join(all_lines),
        "confidence": round(avg_confidence, 2),
        "pages": pages,
    }
