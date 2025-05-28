from typing import List

import pytest
from odmantic import ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse
from app.api.schemas.time_window import TimeWindowResponse
from app.db.models.day_template import DayTemplate
from app.mappers.day_template_mapper import DayTemplateMapper


@pytest.fixture
def sample_user_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_time_window_response_list(sample_user_id: ObjectId) -> List[TimeWindowResponse]:
    category_resp = CategoryResponse(id=ObjectId(), name="Cat1", user=sample_user_id)
    return [
        TimeWindowResponse(
            id=ObjectId(),
            name="TW1",
            start_time=540,
            end_time=600,
            category=category_resp,
            day_template_id=ObjectId(),
            user_id=sample_user_id,
        ),
        TimeWindowResponse(
            id=ObjectId(),
            name="TW2",
            start_time=660,
            end_time=720,
            category=category_resp,
            day_template_id=ObjectId(),
            user_id=sample_user_id,
        ),
    ]


@pytest.fixture
def sample_day_template_model(sample_user_id: ObjectId, sample_time_window_response_list: List[TimeWindowResponse]):
    return DayTemplate(
        id=ObjectId(),
        name="Test Template Model",
        description="A model for testing the mapper",
        user=sample_user_id,
        time_windows=[tw.id for tw in sample_time_window_response_list],
    )


@pytest.fixture
def sample_day_template_create_request(sample_time_window_response_list: List[TimeWindowResponse]):
    return DayTemplateCreateRequest(
        name="Test Template Create",
        description="A create request schema",
        time_windows=[tw.id for tw in sample_time_window_response_list],
    )


class TestDayTemplateMapper:
    def test_to_response(
        self, sample_day_template_model: DayTemplate, sample_time_window_response_list: List[TimeWindowResponse]
    ):
        response = DayTemplateMapper.to_response(sample_day_template_model, sample_time_window_response_list)

        assert isinstance(response, DayTemplateResponse)
        assert response.id == sample_day_template_model.id
        assert response.name == sample_day_template_model.name
        assert response.description == sample_day_template_model.description
        assert response.user_id == sample_day_template_model.user
        assert len(response.time_windows) == len(sample_time_window_response_list)
        for i, tw_resp in enumerate(response.time_windows):
            assert tw_resp.id == sample_time_window_response_list[i].id
            assert tw_resp.name == sample_time_window_response_list[i].name

    def test_to_response_empty_time_windows(self, sample_day_template_model: DayTemplate):
        sample_day_template_model.time_windows = []
        response = DayTemplateMapper.to_response(sample_day_template_model, [])

        assert isinstance(response, DayTemplateResponse)
        assert response.id == sample_day_template_model.id
        assert response.name == sample_day_template_model.name
        assert response.time_windows == []

    def test_to_model_for_create(
        self,
        sample_day_template_create_request: DayTemplateCreateRequest,
        sample_user_id: ObjectId,
        sample_time_window_response_list: List[TimeWindowResponse],
    ):
        validated_ids = [tw.id for tw in sample_time_window_response_list]
        model = DayTemplateMapper.to_model_for_create(sample_day_template_create_request, sample_user_id, validated_ids)

        assert isinstance(model, DayTemplate)
        assert model.name == sample_day_template_create_request.name
        assert model.description == sample_day_template_create_request.description
        assert model.user == sample_user_id
        assert model.time_windows == validated_ids
