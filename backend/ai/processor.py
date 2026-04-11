# MOCK MODE - Replace with real Anthropic API call for production
import os
import random


class DocumentProcessor:
    _FIELDS_BY_TYPE = {
        "invoice": {
            "vendor": "Acme Corp",
            "invoice_number": "INV-2024-00142",
            "date": "2024-03-15",
            "due_date": "2024-04-15",
            "amount": "4,250.00",
            "currency": "USD",
            "description": "Professional services rendered for Q1 2024",
        },
        "contract": {
            "parties": "Acme Corp and Widget LLC",
            "effective_date": "2024-01-01",
            "expiration_date": "2025-01-01",
            "value": "120,000.00",
            "jurisdiction": "State of Delaware",
        },
        "report": {
            "title": "Q1 2024 Performance Report",
            "author": "Analytics Team",
            "date": "2024-03-31",
            "summary": "Overall performance exceeded targets by 12% across all key metrics.",
            "key_findings": "Revenue up 18%, customer retention at 94%, NPS score improved to 72.",
        },
        "other": {
            "title": "Untitled Document",
            "date": "2024-03-15",
            "content_summary": "General document with mixed content requiring manual review.",
        },
    }

    def _read_file(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    def _confidence(self, base: float) -> float:
        """Return base confidence with a small random variation, clamped to [0.75, 0.99]."""
        value = base + random.uniform(-0.05, 0.05)
        return round(max(0.75, min(0.99, value)), 2)

    def extract_fields(self, file_path: str, doc_type: str, custom_fields=None) -> dict:
        self._read_file(file_path)  # read to surface file-not-found errors early

        template = self._FIELDS_BY_TYPE.get(doc_type, self._FIELDS_BY_TYPE["other"])
        field_names = custom_fields if custom_fields else list(template.keys())

        fields = {
            name: {
                "value": template.get(name, f"<{name} not found>"),
                "confidence": self._confidence(0.88),
            }
            for name in field_names
        }

        overall_confidence = round(
            max(0.80, min(0.95, random.uniform(0.82, 0.94))), 2
        )

        return {"fields": fields, "overall_confidence": overall_confidence}

    def detect_doc_type(self, file_path: str) -> str:
        self._read_file(file_path)
        return random.choice(["invoice", "contract", "report", "other"])
