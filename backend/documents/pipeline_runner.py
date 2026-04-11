import re
from datetime import datetime

from django.utils import timezone


class PipelineRunner:
    def __init__(self, pipeline, document):
        self.pipeline = pipeline
        self.document = document

    def run(self) -> dict:
        accumulated_fields = {}
        stage_results = []

        for stage in self.pipeline.stages:
            stage_type = stage["type"]
            stage_name = stage["name"]
            config = stage.get("config", {})

            try:
                if stage_type == "extract":
                    output = self._run_extract(config)
                    accumulated_fields.update(output.get("fields", {}))
                elif stage_type == "validate":
                    output = self._run_validate(accumulated_fields, config)
                elif stage_type == "transform":
                    output = self._run_transform(accumulated_fields, config)
                    accumulated_fields.update(output.get("fields", {}))
                elif stage_type == "deliver":
                    output = self._run_deliver(accumulated_fields, config)
                else:
                    output = {}

                stage_results.append({
                    "stage": stage_name,
                    "type": stage_type,
                    "status": "completed",
                    "output": output,
                })
            except Exception as exc:
                stage_results.append({
                    "stage": stage_name,
                    "type": stage_type,
                    "status": "failed",
                    "error": str(exc),
                })

        confidences = [
            v["confidence"]
            for v in accumulated_fields.values()
            if isinstance(v, dict) and "confidence" in v
        ]
        overall_confidence = (
            round(sum(confidences) / len(confidences), 2) if confidences else 0.0
        )

        return {
            "stages": stage_results,
            "fields": accumulated_fields,
            "overall_confidence": overall_confidence,
        }

    # ------------------------------------------------------------------
    # Stage handlers
    # ------------------------------------------------------------------

    def _run_extract(self, config: dict) -> dict:
        from ai.processor import DocumentProcessor

        custom_fields = config.get("fields")
        processor = DocumentProcessor()
        return processor.extract_fields(
            self.document.file.path,
            self.document.doc_type,
            custom_fields=custom_fields,
        )

    def _run_validate(self, fields: dict, config: dict) -> dict:
        errors = []

        for field_name in config.get("required_fields", []):
            field = fields.get(field_name)
            if field is None or (isinstance(field, dict) and field.get("value") is None):
                errors.append(f"Required field '{field_name}' is missing or null.")

        target = config.get("field")
        if target and target in fields:
            raw = fields[target].get("value", "") if isinstance(fields[target], dict) else fields[target]
            try:
                numeric = float(str(raw).replace(",", "").replace("$", ""))
                min_val = config.get("min_value")
                max_val = config.get("max_value")
                if min_val is not None and numeric < min_val:
                    errors.append(
                        f"Field '{target}' value {numeric} is below minimum {min_val}."
                    )
                if max_val is not None and numeric > max_val:
                    errors.append(
                        f"Field '{target}' value {numeric} is above maximum {max_val}."
                    )
            except (ValueError, TypeError):
                pass

        return {
            "validation_passed": len(errors) == 0,
            "errors": errors,
            "fields": fields,
        }

    def _run_transform(self, fields: dict, config: dict) -> dict:
        rules = config.get("rules", {})
        transformed = {}

        for field_name, field_data in fields.items():
            if isinstance(field_data, dict):
                value = field_data.get("value", "")
                meta = {k: v for k, v in field_data.items() if k != "value"}
            else:
                value = field_data
                meta = {}

            # Rules can be a string shorthand ("strip_currency") or a dict with options.
            raw_rule = rules.get(field_name, {})
            if isinstance(raw_rule, str):
                rule = {raw_rule: True}
            else:
                rule = raw_rule

            if rule.get("uppercase"):
                value = str(value).upper()
            elif rule.get("lowercase"):
                value = str(value).lower()

            date_format = rule.get("date_format")
            if date_format is True:
                # String shorthand without a target format — default to ISO
                date_format = "%Y-%m-%d"
            if date_format:
                for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y", "%B %d, %Y", "%d/%m/%Y"):
                    try:
                        value = datetime.strptime(str(value), fmt).strftime(date_format)
                        break
                    except ValueError:
                        continue

            if rule.get("strip_currency"):
                value = re.sub(r"[^\d.,]", "", str(value))

            transformed[field_name] = {"value": value, **meta}

        return {"fields": transformed}

    def _run_deliver(self, fields: dict, config: dict) -> dict:
        return {
            "delivered_to": config.get("destination", "internal"),
            "delivered_at": timezone.now().isoformat(),
            "field_count": len(fields),
            "fields": fields,
        }
