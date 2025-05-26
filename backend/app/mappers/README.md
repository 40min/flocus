# Mapper Layer Conventions

This directory contains mappers responsible for transforming data between database models and API response schemas, or from API request schemas to database models.

## Core Principles

1.  **Pure Data Transformation:** Mappers are solely for data transformation of already loaded objects. They **must not** perform I/O operations (e.g., database queries, external API calls).
2.  **Stateless:** Mappers should be stateless. Their output must depend only on their input arguments.
3.  **Service Layer Responsibility for Data Fetching:** The service layer is responsible for fetching all necessary data (main entities and any related entities) *before* calling a mapper.

## Structure and Naming

1.  **Directory:** All mappers reside in `backend/app/mappers/`.
2.  **File Naming:** Each primary entity should have its own mapper file, named `[EntityName]Mapper.py` (e.g., `CategoryMapper.py`, `DailyPlanMapper.py`).
3.  **Class Structure:** Mappers are implemented as classes containing only static methods.

    ```python
    # Example: backend/app/mappers/category_mapper.py
    from app.db.models.category import Category
    from app.api.schemas.category import CategoryResponse, CategoryCreateRequest
    from odmantic import ObjectId

    class CategoryMapper:
        @staticmethod
        def to_response(category: Category) -> CategoryResponse:
            # ... mapping logic ...
            return CategoryResponse.model_validate(category) # Or manual mapping

        @staticmethod
        def to_model_for_create(schema: CategoryCreateRequest, user_id: ObjectId) -> Category:
            # ... mapping logic ...
            # Ensure all required fields for the Category model are populated
            return Category(**schema.model_dump(), user=user_id, is_deleted=False) # Example
    ```

## Method Signatures and Usage

1.  **Model to Response Schema (`to_response`)**:
    *   Signature: `def to_response(model: ModelType, related_model_1: Optional[RelatedModel1Type] = None, related_model_2: Optional[RelatedModel2Type] = None, ..., **kwargs) -> ResponseSchemaType:`
    *   `model`: The primary database model instance to map.
    *   `related_model_1`, `related_model_2`, etc.: Optional, specifically named arguments for pre-fetched related model instances needed to populate the response schema. The service layer is responsible for fetching and passing this data. The exact names and types depend on the specific mapper and the data it needs.
        *   Example: `TaskMapper.to_response(task_model: Task, category_model: Optional[Category]) -> TaskResponse:`
        *   Example: `TimeWindowMapper.to_response(time_window_model: TimeWindow, category_model: Category) -> TimeWindowResponse:`
    *   `**kwargs`: For any other necessary parameters not covered by specific related model arguments.

2.  **Request Schema to Model (`to_model_for_create` / `to_model_for_update`)**:
    *   Signature: `def to_model_for_create(schema: RequestSchemaType, **kwargs) -> ModelType:`
    *   `schema`: The Pydantic request schema instance.
    *   `**kwargs`: Used to pass additional data required to construct the model instance that is not present in the schema itself (e.g., `user_id`, default values for new records).
    *   These methods return an unsaved model instance. The service layer is responsible for persisting it.

## Handling Missing or Optional Data

*   **Service Responsibility:** If a related model required for a response schema is optional and not found (or not applicable), the service layer should pass `None` for that specific named argument to the mapper.
*   **Mapper Responsibility:** The mapper, upon receiving `None` for an expected related model argument, should ensure the corresponding field in the response schema is also set to `None` (or its default if appropriate, as defined by the Pydantic schema). Mappers should not attempt to fetch missing data.

## Example Workflow (Service using Mapper)

```python
# In a service method (e.g., DailyPlanService)

# 1. Fetch all necessary data
main_model = await self.engine.find_one(...)
related_model_1 = await self.engine.find_one(...) # if needed for main_model's response
# ... fetch other related data ...

# 2. Fetch related models (if any)
# Example:
# task_category_model = await self.engine.find_one(Category, Category.id == task_model.category_id)

# 3. Call the mapper, passing related models as named arguments
# Example for TaskMapper:
# task_response = TaskMapper.to_response(task_model, category_model=task_category_model)

# Example for a hypothetical mapper requiring two related models:
# other_related_model = await self.engine.find_one(...)
# response_schema = SomeEntityMapper.to_response(
#     main_model,
#     related_model_foo=related_model_1,
#     related_model_bar=other_related_model
# )

return response_schema # or task_response in the example above
