from datetime import datetime, timezone

import pytest
from odmantic import ObjectId
from pydantic import ValidationError

from app.api.schemas.category import CategoryResponse
from app.api.schemas.time_window import TimeWindowCreateRequest, TimeWindowResponse
from app.db.models.category import Category
from app.db.models.time_window import TimeWindow
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
