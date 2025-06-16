from enum import Enum

class LLMActionType(str, Enum):
    """
    Defines the types of actions that can be performed by the LLM service
    for or on a task.
    """
    IMPROVE_TITLE = "improve_title"
    IMPROVE_DESCRIPTION = "improve_description"
    GENERATE_DESCRIPTION_FROM_TITLE = "generate_description_from_title"

    def __str__(self):
        return self.value
