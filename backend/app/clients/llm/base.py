from abc import ABC, abstractmethod


class LLMClient(ABC):
    @abstractmethod
    async def generate_text(self, prompt: str) -> str:
        pass
