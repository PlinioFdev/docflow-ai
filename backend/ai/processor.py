import os
import json
import anthropic

class DocumentProcessor:

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    def _read_file(self, file_path: str) -> str:
        if file_path.lower().endswith('.pdf'):
            try:
                from pypdf import PdfReader
                reader = PdfReader(file_path)
                text = ''
                for page in reader.pages:
                    text += page.extract_text() or ''
                return text[:8192]
            except Exception:
                return ''
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read(8192)

    def extract_fields(self, file_path: str, doc_type: str, custom_fields=None) -> dict:
        text = self._read_file(file_path)

        prompt = f"""You are a document data extraction assistant. Extract structured fields from the document below.

Document type: {doc_type}
Document content:
{text}

Extract all relevant fields for this document type. For each field provide a confidence score between 0 and 1.

Respond ONLY with a JSON object in this exact format, no explanation, no markdown:
{{
  "fields": {{
    "field_name": {{
      "value": "extracted value",
      "confidence": 0.95
    }}
  }},
  "overall_confidence": 0.90
}}

For invoices extract: vendor, invoice_number, date, due_date, amount, currency, description
For contracts extract: parties, effective_date, expiration_date, value, duration, jurisdiction, payment_terms
For reports extract: title, author, date, summary, key_findings
For other documents extract: title, date, content_summary, document_type

If a field cannot be found, set value to null and confidence to 0.0."""

        message = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = message.content[0].text.strip()
        import logging; logging.getLogger(__name__).error("RAW RESPONSE: %s", raw)
        # Strip markdown code fences if present
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
            raw = raw.strip()
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            import re
            raw_clean = re.sub(r',(\s*[}\]])', r'\1', raw)
            result = json.loads(raw_clean)

        if custom_fields:
            result["fields"] = {k: v for k, v in result["fields"].items() if k in custom_fields}

        return result

    def detect_doc_type(self, file_path: str) -> str:
        text = self._read_file(file_path)
        lower = text.lower()
        scores = {
            "invoice":  sum(lower.count(w) for w in ["invoice", "amount due", "vendor", "bill to", "payment due", "nota fiscal", "fatura"]),
            "contract": sum(lower.count(w) for w in ["agreement", "parties", "jurisdiction", "whereas", "hereby", "contrato"]),
            "report":   sum(lower.count(w) for w in ["report", "findings", "analysis", "summary", "conclusion", "relatório"]),
        }
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "other"
