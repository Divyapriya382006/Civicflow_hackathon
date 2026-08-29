"""
OCR Fallback — Extracts text from a Playwright page screenshot using Tesseract OCR.

Used as a supplementary input alongside the Ollama Vision Model (llava) inside
the vision_fallback() node. OCR provides raw text extraction while the vision
model provides semantic understanding of page layout and form state.
"""
from __future__ import annotations

from pathlib import Path
from playwright.async_api import Page
from ..browser.screenshots import ScreenshotCapture


class OCRFallback:
    def __init__(self) -> None:
        self.capture = ScreenshotCapture()

    async def inspect(self, page: Page, directory: Path) -> dict:
        """
        Capture screenshot → run Tesseract OCR → return extracted text.

        Returns dict with keys:
            text:       extracted visible text (up to 4000 chars)
            bytes:      screenshot size in bytes
            confidence: rough confidence (0.0 if OCR unavailable, 0.5 if text found)
        """
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / 'ocr_observation.png'
        image_bytes = await self.capture.capture(page, path)
        text = ''
        confidence = 0.0

        try:
            import pytesseract
            from PIL import Image
            pil_image = Image.open(path)
            raw_text = pytesseract.image_to_string(pil_image)
            text = raw_text.strip()[:4000]
            if text:
                confidence = 0.5
        except ImportError:
            # pytesseract or Pillow not installed — graceful degradation
            text = '[OCR unavailable: pytesseract or Pillow not installed]'
            confidence = 0.0
        except Exception as exc:
            text = f'[OCR error: {exc}]'
            confidence = 0.0
        finally:
            path.unlink(missing_ok=True)

        return {
            'text': text,
            'bytes': len(image_bytes),
            'confidence': confidence,
        }
