from typing import Optional

from pydantic import BaseModel, Field

from app.core.enums import LLMActionType


class LLMImprovementRequest(BaseModel):
    action: LLMActionType
    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None)


class LLMImprovementResponse(BaseModel):
    improved_title: Optional[str] = None
    improved_description: Optional[str] = None
