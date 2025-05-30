from datetime import datetime, timezone

import pytest
from odmantic import ObjectId
from pydantic import ValidationError

from app.api.schemas.category import CategoryResponse
from app.api.schemas.time_window import TimeWindowCreateRequest, TimeWindowResponse, TimeWindowUpdateRequest
from app.db.models.category import Category
from app.db.models.time_window import TimeWindow
from app.mappers.base_mapper import BaseMapper
from app.mappers.time_window_mapper import TimeWindowMapper


@pytest.fixture
def sample_user_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_category_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_day_template_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_category_model(sample_user_id: ObjectId, sample_category_id: ObjectId) -> Category:
    return Category(
        id=sample_category_id,
        name="Test Category for TimeWindow",
        user=sample_user_id,
        description="A test category for time window",
        color="#000000",
        icon="time_icon",
        is_deleted=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_category_response(sample_category_model: Category) -> CategoryResponse:
    return CategoryResponse.model_validate(sample_category_model)


@pytest.fixture
def sample_time_window_create_request(
    sample_category_id: ObjectId, sample_day_template_id: ObjectId
) -> TimeWindowCreateRequest:
    return TimeWindowCreateRequest(
        name="Morning Focus",
        start_time=9 * 60,
        end_time=12 * 60,
        category=sample_category_id,
        day_template_id=sample_day_template_id,
    )


@pytest.fixture
def sample_time_window_model(
    sample_user_id: ObjectId,
    sample_category_id: ObjectId,
    sample_day_template_id: ObjectId,
    sample_time_window_create_request: TimeWindowCreateRequest,
) -> TimeWindow:
    return TimeWindow(
        id=ObjectId(),
        name=sample_time_window_create_request.name,
        start_time=sample_time_window_create_request.start_time,
        end_time=sample_time_window_create_request.end_time,
        category=sample_category_id,
        user=sample_user_id,
        day_template_id=sample_day_template_id,
        is_deleted=False,
    )


class TestTimeWindowMapper:
    def test_to_model_for_create(
        self, sample_time_window_create_request: TimeWindowCreateRequest, sample_user_id: ObjectId
    ):
        time_window_model = TimeWindowMapper.to_model_for_create(sample_time_window_create_request, sample_user_id)

        assert isinstance(time_window_model, TimeWindow)
        assert time_window_model.name == sample_time_window_create_request.name
        assert time_window_model.start_time == sample_time_window_create_request.start_time
        assert time_window_model.end_time == sample_time_window_create_request.end_time
        assert time_window_model.category == sample_time_window_create_request.category
        assert time_window_model.day_template_id == sample_time_window_create_request.day_template_id
        assert time_window_model.user == sample_user_id
        assert not time_window_model.is_deleted

    def test_to_response(
        self,
        sample_time_window_model: TimeWindow,
        sample_category_model: Category,
        sample_category_response: CategoryResponse,
    ):
        time_window_response = TimeWindowMapper.to_response(sample_time_window_model, sample_category_model)

        assert isinstance(time_window_response, TimeWindowResponse)
        assert time_window_response.id == sample_time_window_model.id
        assert time_window_response.name == sample_time_window_model.name
        assert time_window_response.start_time == sample_time_window_model.start_time
        assert time_window_response.end_time == sample_time_window_model.end_time
        assert time_window_response.category.id == sample_category_model.id
        assert time_window_response.user_id == sample_time_window_model.user
        assert time_window_response.day_template_id == sample_time_window_model.day_template_id
        assert time_window_response.is_deleted == sample_time_window_model.is_deleted

        assert time_window_response.category is not None
        assert time_window_response.category.id == sample_category_model.id
        assert time_window_response.category.name == sample_category_model.name
        assert time_window_response.category == sample_category_response

    def test_to_response_category_is_none_should_raise_error(self, sample_time_window_model: TimeWindow):
        # The TimeWindowMapper.to_response expects a valid Category model.
        # If None is passed, CategoryResponse.model_validate(None) will be called,
        # which should raise an error (e.g., AttributeError or ValidationError).
        # The service layer is responsible for ensuring a valid category model is passed.
        with pytest.raises((AttributeError, ValidationError)):  # Pydantic might raise ValidationError
            TimeWindowMapper.to_response(sample_time_window_model, None)  # type: ignore

    def test_to_model_for_update_name(self, sample_time_window_model: TimeWindow):
        schema = TimeWindowUpdateRequest(name="Updated Name")
        # Create a copy to avoid modifying the fixture instance shared across tests
        model_to_update = sample_time_window_model.model_copy(deep=True)
        updated_model = TimeWindowMapper.to_model_for_update(model_to_update, schema)

        assert updated_model.name == "Updated Name"
        # Check other fields remain unchanged
        assert updated_model.start_time == sample_time_window_model.start_time
        assert updated_model.category == sample_time_window_model.category

    def test_to_model_for_update_multiple_fields(self, sample_time_window_model: TimeWindow):
        new_category_id = ObjectId()
        # new_day_template_id = ObjectId() # day_template_id is not updatable
        schema = TimeWindowUpdateRequest(
            name="New Name",
            start_time=100,
            end_time=200,
            category=new_category_id,
            # day_template_id=new_day_template_id, # day_template_id is not in the update schema
        )
        model_to_update = sample_time_window_model.model_copy(deep=True)
        updated_model = TimeWindowMapper.to_model_for_update(model_to_update, schema)

        assert updated_model.name == "New Name"
        assert updated_model.start_time == 100
        assert updated_model.end_time == 200
        assert updated_model.category == new_category_id
        assert updated_model.day_template_id == sample_time_window_model.day_template_id  # Should remain original

    def test_to_model_for_update_partial_fields_unset(self, sample_time_window_model: TimeWindow):
        schema = TimeWindowUpdateRequest(name="Partially Updated Name")
        original_model_copy = sample_time_window_model.model_copy(deep=True)
        updated_model = TimeWindowMapper.to_model_for_update(original_model_copy, schema)

        assert updated_model.name == "Partially Updated Name"
        assert updated_model.start_time == original_model_copy.start_time
        assert updated_model.end_time == original_model_copy.end_time
        assert updated_model.category == original_model_copy.category
        assert updated_model.day_template_id == original_model_copy.day_template_id

    def test_to_model_for_update_setting_required_field_to_none_is_skipped(self, sample_time_window_model: TimeWindow):
        original_name = sample_time_window_model.name
        schema = TimeWindowUpdateRequest(name=None)  # Attempt to set name to None

        assert issubclass(TimeWindowMapper, BaseMapper), "TimeWindowMapper must inherit BaseMapper for this test"

        # Ensure _model_class is set for BaseMapper's __init_subclass__ to work
        assert TimeWindowMapper._model_class is TimeWindow

        # BaseMapper's __init_subclass__ populates these fields.
        # If TimeWindowMapper._non_nullable_fields is empty, it means __init_subclass__ might not have run
        # or the model has no required fields, which is not the case for TimeWindow.
        assert "name" in TimeWindowMapper._non_nullable_fields

        model_to_update = sample_time_window_model.model_copy(deep=True)
        updated_model = TimeWindowMapper.to_model_for_update(model_to_update, schema)

        assert updated_model.name == original_name
