# MOCK MODE - Replace with real Anthropic API call for production
import random
import re
from datetime import date, timedelta


class DocumentProcessor:
    # Per-type confidence ranges (min, max)
    _CONFIDENCE_RANGES = {
        "invoice":  (0.85, 0.95),
        "contract": (0.80, 0.92),
        "report":   (0.82, 0.93),
        "other":    (0.75, 0.88),
    }

    def _read_file(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read(8192)  # read up to 8 KB

    def _confidence(self, base: float, spread: float = 0.05) -> float:
        value = base + random.uniform(-spread, spread)
        return round(max(0.50, min(0.99, value)), 2)

    def _overall_confidence(self, doc_type: str) -> float:
        lo, hi = self._CONFIDENCE_RANGES.get(doc_type, (0.75, 0.88))
        return round(random.uniform(lo, hi), 2)

    # ------------------------------------------------------------------
    # Content parsing helpers
    # ------------------------------------------------------------------

    def _search(self, text: str, *patterns) -> str | None:
        """Return first non-empty capture group matched in text."""
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if m:
                return m.group(1).strip()
        return None

    def _first_line(self, text: str) -> str:
        for line in text.splitlines():
            line = line.strip()
            if len(line) > 3:
                return line[:120]
        return "Untitled"

    def _today_offset(self, days: int = 0) -> str:
        return (date.today() + timedelta(days=days)).strftime("%Y-%m-%d")

    # ------------------------------------------------------------------
    # Per-type extraction
    # ------------------------------------------------------------------

    def _extract_invoice(self, text: str) -> dict:
        vendor = (
            self._search(text, r"(?:vendor|from|seller|billed?\s+by)[:\s]+([^\n,]{3,60})")
            or self._search(text, r"^([A-Z][A-Za-z\s&.,]{3,50}(?:Inc|LLC|Ltd|Corp|Co)\.?)")
            or "Acme Corp"
        )
        invoice_number = (
            self._search(text, r"(?:invoice\s*#?|inv\.?\s*#?|invoice\s+number)[:\s]+([A-Z0-9\-]{3,30})")
            or f"INV-{date.today().year}-{random.randint(10000, 99999)}"
        )
        doc_date = (
            self._search(text, r"(?:invoice\s+date|date\s+issued|date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})")
            or self._today_offset()
        )
        due_date = (
            self._search(text, r"(?:due\s+date|payment\s+due)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})")
            or self._today_offset(30)
        )
        amount = (
            self._search(text, r"(?:total|amount\s+due|grand\s+total|subtotal)[:\s]+[\$£€]?\s*([\d,]+\.\d{2})")
            or self._search(text, r"[\$£€]\s*([\d,]+\.\d{2})")
            or f"{random.randint(500, 50000):,}.00"
        )
        currency = (
            self._search(text, r"\b(USD|EUR|GBP|CAD|AUD|BRL)\b")
            or ("EUR" if "€" in text else "GBP" if "£" in text else "USD")
        )
        description = (
            self._search(text, r"(?:description|for\s+services?|re:)[:\s]+([^\n]{5,120})")
            or "Professional services"
        )
        base = random.uniform(0.82, 0.94)
        return {
            "vendor":          {"value": vendor,         "confidence": self._confidence(base)},
            "invoice_number":  {"value": invoice_number, "confidence": self._confidence(base + 0.04)},
            "date":            {"value": doc_date,        "confidence": self._confidence(base)},
            "due_date":        {"value": due_date,        "confidence": self._confidence(base - 0.03)},
            "amount":          {"value": amount,          "confidence": self._confidence(base + 0.02)},
            "currency":        {"value": currency,        "confidence": self._confidence(base + 0.05)},
            "description":     {"value": description,     "confidence": self._confidence(base - 0.05)},
        }

    def _extract_contract(self, text: str) -> dict:
        parties = (
            self._search(text, r"(?:between|parties)[:\s]+([^\n]{5,120})")
            or self._search(text, r"(?:this\s+agreement\s+is\s+(?:entered\s+into\s+)?by\s+and\s+between)[:\s]+([^\n]{5,120})")
            or "Party A and Party B"
        )
        effective_date = (
            self._search(text, r"(?:effective\s+date|commencement\s+date|start\s+date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})")
            or self._today_offset()
        )
        expiration_date = (
            self._search(text, r"(?:expir(?:ation|y)\s+date|end\s+date|termination\s+date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})")
            or self._today_offset(365)
        )
        value = (
            self._search(text, r"(?:contract\s+value|total\s+value|consideration)[:\s]+[\$£€]?\s*([\d,]+(?:\.\d{2})?)")
            or self._search(text, r"[\$£€]\s*([\d,]+(?:\.\d{2})?)")
            or f"{random.randint(10000, 500000):,}.00"
        )
        duration = (
            self._search(text, r"(?:term|duration)[:\s]+([^\n]{3,60})")
            or "12 months"
        )
        jurisdiction = (
            self._search(text, r"(?:jurisdiction|governing\s+law|governed\s+by(?:\s+the\s+laws\s+of)?)[:\s]+([^\n,\.]{3,60})")
            or "State of Delaware"
        )
        payment_terms = (
            self._search(text, r"(?:payment\s+terms?)[:\s]+([^\n]{3,80})")
            or "Net 30"
        )
        base = random.uniform(0.78, 0.90)
        return {
            "parties":         {"value": parties,          "confidence": self._confidence(base)},
            "effective_date":  {"value": effective_date,   "confidence": self._confidence(base + 0.03)},
            "expiration_date": {"value": expiration_date,  "confidence": self._confidence(base - 0.02)},
            "value":           {"value": value,            "confidence": self._confidence(base)},
            "duration":        {"value": duration,         "confidence": self._confidence(base - 0.03)},
            "jurisdiction":    {"value": jurisdiction,     "confidence": self._confidence(base + 0.02)},
            "payment_terms":   {"value": payment_terms,    "confidence": self._confidence(base - 0.04)},
        }

    def _extract_report(self, text: str) -> dict:
        title = (
            self._search(text, r"(?:title|report\s+title|subject)[:\s]+([^\n]{3,120})")
            or self._first_line(text)
        )
        author = (
            self._search(text, r"(?:author|prepared\s+by|written\s+by|by)[:\s]+([^\n]{3,80})")
            or "Unknown Author"
        )
        doc_date = (
            self._search(text, r"(?:date|published|issued|as\s+of)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})")
            or self._today_offset()
        )
        # summary: use first substantial paragraph (>60 chars) not matching a label pattern
        summary = None
        for para in re.split(r"\n{2,}", text):
            para = para.strip()
            if len(para) >= 60 and not re.match(r"^(?:title|author|date|subject)[:\s]", para, re.I):
                summary = para[:200]
                break
        summary = summary or "Summary not available in document content."

        key_findings = (
            self._search(text, r"(?:key\s+findings?|conclusions?|highlights?|results?)[:\s]+([^\n]{10,200})")
            or "See document for detailed findings."
        )
        base = random.uniform(0.80, 0.91)
        return {
            "title":        {"value": title,        "confidence": self._confidence(base + 0.05)},
            "author":       {"value": author,       "confidence": self._confidence(base)},
            "date":         {"value": doc_date,      "confidence": self._confidence(base + 0.02)},
            "summary":      {"value": summary,       "confidence": self._confidence(base - 0.04)},
            "key_findings": {"value": key_findings,  "confidence": self._confidence(base - 0.06)},
        }

    def _extract_other(self, text: str) -> dict:
        title = (
            self._search(text, r"(?:title|subject|re:)[:\s]+([^\n]{3,120})")
            or self._first_line(text)
        )
        doc_date = (
            self._search(text, r"(\d{4}-\d{2}-\d{2})")
            or self._search(text, r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})")
            or self._today_offset()
        )
        # content_summary: first non-trivial paragraph
        content_summary = None
        for para in re.split(r"\n{2,}", text):
            para = para.strip()
            if len(para) >= 40:
                content_summary = para[:200]
                break
        content_summary = content_summary or text.strip()[:200] or "No content available."

        document_type = (
            self._search(text, r"(?:document\s+type|type)[:\s]+([^\n]{3,40})")
            or "General document"
        )
        base = random.uniform(0.72, 0.85)
        return {
            "title":          {"value": title,          "confidence": self._confidence(base + 0.05)},
            "date":           {"value": doc_date,        "confidence": self._confidence(base)},
            "content_summary":{"value": content_summary, "confidence": self._confidence(base - 0.05)},
            "document_type":  {"value": document_type,   "confidence": self._confidence(base - 0.02)},
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract_fields(self, file_path: str, doc_type: str, custom_fields=None) -> dict:
        text = self._read_file(file_path)

        extractor = {
            "invoice":  self._extract_invoice,
            "contract": self._extract_contract,
            "report":   self._extract_report,
        }.get(doc_type, self._extract_other)

        all_fields = extractor(text)

        if custom_fields:
            all_fields = {k: v for k, v in all_fields.items() if k in custom_fields}

        return {
            "fields": all_fields,
            "overall_confidence": self._overall_confidence(doc_type),
        }

    def detect_doc_type(self, file_path: str) -> str:
        text = self._read_file(file_path)
        lower = text.lower()
        scores = {
            "invoice":  sum(lower.count(w) for w in ["invoice", "amount due", "vendor", "bill to", "payment due"]),
            "contract": sum(lower.count(w) for w in ["agreement", "parties", "jurisdiction", "whereas", "hereby"]),
            "report":   sum(lower.count(w) for w in ["report", "findings", "analysis", "summary", "conclusion"]),
        }
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "other"
