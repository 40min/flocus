from typing import ClassVar, Optional, Set, Type

from odmantic import Model


class BaseMapper:
    _model_class: ClassVar[Optional[Type[Model]]] = None
    _nullable_fields: ClassVar[Set[str]] = set()
    _non_nullable_fields: ClassVar[Set[str]] = set()

    def __init_subclass__(cls) -> None:
        """Initialize field classifications when the mapper class is created."""
        super().__init_subclass__()
        if not cls._model_class:
            raise ValueError("_model_class must be set in child mapper class")

        model_fields = cls._model_class.model_fields

        for field_name, field in model_fields.items():
            if field.is_required:
                cls._non_nullable_fields.add(field_name)
            else:
                cls._nullable_fields.add(field_name)
