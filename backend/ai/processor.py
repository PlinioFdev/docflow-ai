import os

from anthropic import Anthropic


class DocumentProcessor:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

    def process(self, document_path: str, prompt: str) -> dict:
        if not self.client.api_key:
            raise RuntimeError("Anthropic API key is not configured.")

        response = self.client.completions.create(
            model="claude-v1",
            prompt=prompt,
            max_tokens_to_sample=1024,
        )

        return {
            "output": response.completion,
            "metadata": response,
        }
