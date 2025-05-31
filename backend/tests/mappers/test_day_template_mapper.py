from typing import Dict, List

import pytest
from odmantic import ObjectId
from pydantic import ValidationError

from app.api.schemas.category import CategoryResponse
from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse
from app.api.schemas.time_window import TimeWindowInputSchema, TimeWindowResponse
from app.db.models.day_template import DayTemplate
from app.mappers.day_template_mapper import DayTemplateMapper


@pytest.fixture
def sample_user_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def common_category_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def common_category_response(sample_user_id: ObjectId, common_category_id: ObjectId) -> CategoryResponse:
    return CategoryResponse(
        id=common_category_id, name="Common Cat", user=sample_user_id, color="#ABCDEF", is_deleted=False
    )


@pytest.fixture
def sample_time_window_input_list(common_category_id: ObjectId) -> List[TimeWindowInputSchema]:
    # Provides TimeWindowInputSchema objects for DayTemplateCreateRequest
    return [
        TimeWindowInputSchema(
            name="TW1",  # Harmonized name
            start_time=540,
            end_time=600,
            category_id=common_category_id,
        ),
        TimeWindowInputSchema(
            name="TW2",  # Harmonized name
            start_time=660,
            end_time=720,
            category_id=common_category_id,
        ),
    ]


@pytest.fixture
def sample_time_window_response_list(common_category_response: CategoryResponse) -> List[TimeWindowResponse]:
    # Provides TimeWindowResponse objects, as expected in DayTemplateResponse
    # These do NOT have an 'id' field for the TW itself.
    return [
        TimeWindowResponse(
            name="TW1",  # Harmonized name
            start_time=540,
            end_time=600,
            category=common_category_response,
        ),
        TimeWindowResponse(
            name="TW2",  # Harmonized name
            start_time=660,
            end_time=720,
            category=common_category_response,
        ),
    ]


@pytest.fixture
def overlapping_time_window_input_list(sample_user_id: ObjectId) -> List[TimeWindowInputSchema]:
    category_id_overlap = ObjectId()
    return [
        TimeWindowInputSchema(
            name="Morning Work",
            start_time=540,  # 9:00
            end_time=660,  # 11:00
            category_id=category_id_overlap,
        ),
        TimeWindowInputSchema(
            name="Late Morning Work",
            start_time=600,  # 10:00 - overlaps with previous
            end_time=720,  # 12:00
            category_id=category_id_overlap,
        ),
    ]


@pytest.fixture
def sample_day_template_model(sample_user_id: ObjectId, sample_time_window_input_list: List[TimeWindowInputSchema]):
    # DayTemplate model stores embedded time_windows as List[EmbeddedTimeWindowSchema].
    # These are created from dictionaries with 'name', 'start_time', 'end_time', 'category_id'.
    time_windows_for_db_model = []
    for tw_input in sample_time_window_input_list:
        time_windows_for_db_model.append(
            {
                "name": tw_input.name,
                "start_time": tw_input.start_time,
                "end_time": tw_input.end_time,
                "category_id": tw_input.category_id,  # This is already ObjectId from TimeWindowInputSchema
            }
        )

    return DayTemplate(
        id=ObjectId(),
        name="Test Template Model",
        description="A model for testing the mapper",
        user_id=sample_user_id,
        time_windows=time_windows_for_db_model,
    )


@pytest.fixture
def sample_day_template_create_request(sample_time_window_input_list: List[TimeWindowInputSchema]):
    return DayTemplateCreateRequest(
        name="Test Template Create",
        description="A create request schema",
        time_windows=sample_time_window_input_list,  # List of TimeWindowInputSchema objects
    )


class TestDayTemplateMapper:
    def test_to_response(
        self, sample_day_template_model: DayTemplate, sample_time_window_response_list: List[TimeWindowResponse]
    ):
        # DayTemplateMapper.to_response expects a categories_map: Dict[ObjectId, CategoryResponse]
        # We need to construct this map from the categories embedded in sample_time_window_response_list
        # or ensure sample_day_template_model's embedded TWs use category_ids present in such a map.

        # For this test, the sample_day_template_model has embedded TWs with category_ids.
        # The sample_time_window_response_list contains TimeWindowResponse objects, each with a CategoryResponse.
        # The mapper's job is to use the category_id from the model's embedded TW
        # to look up the CategoryResponse in the categories_map.

        # Create a categories_map based on the categories in sample_time_window_response_list
        # This assumes the category_ids in sample_day_template_model's time_windows
        # will match the ids of categories in sample_time_window_response_list.
        # The sample_day_template_model fixture uses category_ids from sample_time_window_input_list.
        # The sample_time_window_response_list fixture creates its own CategoryResponse.
        # These need to align.

        # Let's adjust the fixture `sample_day_template_model` to use category_ids
        # that we can then provide in a `categories_map`.
        # Or, more simply for this test, ensure the `categories_map` provided to `to_response`
        # contains the categories referenced by `sample_day_template_model.time_windows[*].category_id`.

        categories_map: Dict[ObjectId, CategoryResponse] = {}
        # Assuming sample_time_window_response_list's categories are the ones we want to map
        # This part is a bit circular if the mapper is *supposed* to use this list to build the response's TWs.
        # The mapper signature is `to_response(template_model: DayTemplate, categories_map:
        # Dict[ObjectId, CategoryResponse])`
        # It uses `categories_map` to find the `CategoryResponse` for each `embedded_tw.category_id`.

        # Let's build categories_map from the categories actually used in sample_day_template_model's embedded TWs.
        # We'll need a CategoryResponse for each unique category_id in sample_day_template_model.time_windows.
        # For simplicity, let's assume all embedded TWs in sample_day_template_model use the *same* category_id
        # from the first item in sample_time_window_input_list (used to build the model).

        if sample_day_template_model.time_windows:
            # Create a map based on the categories that are *expected* in the response.
            for tw_resp in sample_time_window_response_list:
                categories_map[tw_resp.category.id] = tw_resp.category

        # Ensure sample_day_template_model uses category IDs present in this map.
        # The current sample_day_template_model fixture uses category_ids from sample_time_window_input_list.
        # Let's assume sample_time_window_input_list and sample_time_window_response_list
        # are constructed to use compatible category_ids and CategoryResponse objects.
        # The `sample_time_window_input_list` uses `category_id_for_input`.
        # The `sample_time_window_response_list` uses `category_id_for_response` for its `CategoryResponse`.
        # These should be the same ObjectId for the test to pass as written.
        # For the purpose of this fix, we assume they are aligned by the fixture setup.

        response = DayTemplateMapper.to_response(sample_day_template_model, categories_map)

        assert isinstance(response, DayTemplateResponse)
        assert response.id == sample_day_template_model.id
        assert response.name == sample_day_template_model.name
        assert response.description == sample_day_template_model.description
        assert response.user_id == sample_day_template_model.user_id
        assert len(response.time_windows) == len(sample_time_window_response_list)
        for i, tw_resp_from_mapper in enumerate(response.time_windows):
            expected_tw_resp = sample_time_window_response_list[i]
            # TimeWindowResponse does not have its own 'id'.
            assert tw_resp_from_mapper.name == expected_tw_resp.name
            assert tw_resp_from_mapper.start_time == expected_tw_resp.start_time
            assert tw_resp_from_mapper.end_time == expected_tw_resp.end_time
            assert tw_resp_from_mapper.category.id == expected_tw_resp.category.id
            assert tw_resp_from_mapper.category.name == expected_tw_resp.category.name  # Added check

    def test_to_response_empty_time_windows(self, sample_day_template_model: DayTemplate):
        sample_day_template_model.time_windows = []
        response = DayTemplateMapper.to_response(sample_day_template_model, [])

        assert isinstance(response, DayTemplateResponse)
        assert response.id == sample_day_template_model.id
        assert response.name == sample_day_template_model.name
        assert response.time_windows == []

    def test_to_model_for_create(
        self,
        sample_day_template_create_request: DayTemplateCreateRequest,  # This now contains list of dicts for TWs
        sample_user_id: ObjectId,
        # sample_time_window_response_list is no longer relevant here as IDs are not passed separately
    ):
        # The `to_model_for_create` method will take DayTemplateCreateRequest (which has embedded TW data)
        # and convert it to a DayTemplate model instance.
        # The `validated_time_window_data` (previously validated_ids) would now be the list of
        # dictionaries for embedded time windows, possibly after some validation/transformation by the service.
        # For the mapper, it might receive the raw list of dicts from the request.

        # Let's assume the mapper's `to_model_for_create` now takes the request object
        # and user_id, and processes `request.time_windows` internally.
        # The third argument `validated_time_window_objects_or_ids` needs to be rethought.
        # If the service layer prepares the embedded TW data (e.g. converting category_id string to ObjectId),
        # that prepared list would be passed.

        # For simplicity, let's assume the mapper now directly uses `sample_day_template_create_request.time_windows`.
        # The `DayTemplateMapper.to_model_for_create` signature might change.
        # If it still takes a list of processed TW data:
        # The DayTemplateMapper.to_model_for_create now takes the request (which has List[TimeWindowInputSchema]),
        # user_id, and a list of *already validated and processed* embedded time window data (dicts)
        # that will be stored in the DB model.
        # The service layer is responsible for validating TimeWindowInputSchema items and preparing these dicts.

        # The DayTemplateMapper.to_model_for_create takes the schema and user_id.
        # It internally converts schema.time_windows (List[TimeWindowInputSchema])
        # to List[EmbeddedTimeWindowSchema] for the DayTemplate model.
        model = DayTemplateMapper.to_model_for_create(sample_day_template_create_request, sample_user_id)

        assert isinstance(model, DayTemplate)
        assert model.name == sample_day_template_create_request.name
        assert model.description == sample_day_template_create_request.description
        assert model.user_id == sample_user_id

        # model.time_windows will be List[EmbeddedTimeWindowSchema instances]
        assert len(model.time_windows) == len(sample_day_template_create_request.time_windows)
        for i, embedded_tw_instance in enumerate(
            model.time_windows
        ):  # Iterating over EmbeddedTimeWindowSchema instances
            input_tw_schema = sample_day_template_create_request.time_windows[i]
            assert embedded_tw_instance.name == input_tw_schema.name
            assert embedded_tw_instance.start_time == input_tw_schema.start_time
            assert embedded_tw_instance.end_time == input_tw_schema.end_time
            assert embedded_tw_instance.category_id == input_tw_schema.category_id
            # EmbeddedTimeWindowSchema (as an EmbeddedModel) does not auto-generate an 'id' field.
            # If an 'id' is present, it would have been explicitly set during its creation by the mapper,
            # which DayTemplateMapper.to_model_for_create does for EmbeddedTimeWindowSchema.
            # The EmbeddedTimeWindowSchema itself does not define an 'id' field.
            # The mapper creates EmbeddedTimeWindowSchema instances without explicitly adding an 'id'.
            # However, when these are part of a DayTemplate model that is saved and then retrieved,
            # MongoDB might assign an _id if they were treated as sub-documents that get their own _id.
            # But for an EmbeddedModel in ODMantic, they don't get a separate _id unless defined in the schema.
            # The current EmbeddedTimeWindowSchema does not define 'id'.
            # The DayTemplateMapper.to_model_for_create also does not add an 'id' when creating
            # EmbeddedTimeWindowSchema.
            # Thus, this assertion should be removed.

    def test_time_window_order_preserved(
        self, sample_day_template_model: DayTemplate, sample_time_window_response_list: List[TimeWindowResponse]
    ):
        """Test that time windows maintain their order when mapped to response"""
        # The mapper's `to_response` method constructs TimeWindowResponse objects internally
        # based on `template_model.time_windows` and the `categories_map`.
        # The order should be preserved from `template_model.time_windows`.

        # Build the categories_map needed by the mapper
        categories_map: Dict[ObjectId, CategoryResponse] = {}
        if sample_day_template_model.time_windows:  # Ensure there are TWs to get categories from
            # This assumes all embedded TWs in the model might use different categories.
            # For this test, we need a map that covers all category_ids in template_model.time_windows.
            # The `sample_time_window_response_list` contains the expected CategoryResponse objects.
            for tw_resp in sample_time_window_response_list:  # tw_resp is TimeWindowResponse
                categories_map[tw_resp.category.id] = tw_resp.category

        # Reverse the order of time windows in the model itself to test preservation
        if sample_day_template_model.time_windows:  # Make sure there are time windows to reverse
            sample_day_template_model.time_windows = list(reversed(sample_day_template_model.time_windows))
            # The expected output order should also be reversed if based on sample_time_window_response_list
            expected_ordered_tw_responses = list(reversed(sample_time_window_response_list))
        else:  # Handle case with no time windows
            expected_ordered_tw_responses = []

        response = DayTemplateMapper.to_response(sample_day_template_model, categories_map)

        assert len(response.time_windows) == len(expected_ordered_tw_responses)
        for i, tw_resp_in_final_response in enumerate(response.time_windows):
            expected_tw_resp_obj = expected_ordered_tw_responses[i]  # Corrected variable name
            assert tw_resp_in_final_response.name == expected_tw_resp_obj.name
            assert tw_resp_in_final_response.start_time == expected_tw_resp_obj.start_time
            assert tw_resp_in_final_response.end_time == expected_tw_resp_obj.end_time
            assert tw_resp_in_final_response.category.id == expected_tw_resp_obj.category.id

    def test_time_window_category_mapping(
        self,
        sample_day_template_model: DayTemplate,
        sample_time_window_response_list: List[TimeWindowResponse],  # This list contains the expected CategoryResponse
    ):
        """Test that category relationships are properly preserved in the response"""
        # Build the categories_map needed by the mapper
        categories_map: Dict[ObjectId, CategoryResponse] = {}
        for tw_resp in sample_time_window_response_list:
            categories_map[tw_resp.category.id] = tw_resp.category

        # Ensure the sample_day_template_model's embedded TWs use category_ids present in this map.
        # (This alignment should be handled by fixture design).

        response = DayTemplateMapper.to_response(sample_day_template_model, categories_map)

        assert len(response.time_windows) == len(sample_time_window_response_list)
        # The order of response.time_windows should match sample_day_template_model.time_windows.
        # The order of sample_time_window_response_list should align with sample_day_template_model.time_windows
        # for this comparison to be direct by index.
        for i, tw_resp_in_final_response in enumerate(response.time_windows):
            expected_tw_resp_obj = sample_time_window_response_list[i]
            assert tw_resp_in_final_response.category is not None
            assert tw_resp_in_final_response.category.id == expected_tw_resp_obj.category.id
            assert tw_resp_in_final_response.category.name == expected_tw_resp_obj.category.name
            assert tw_resp_in_final_response.category.user_id == expected_tw_resp_obj.category.user_id

    def test_time_window_validation_start_before_end(
        self,
        sample_user_id: ObjectId,
    ):
        """Test validation that start time must be before end time"""
        # DayTemplateCreateRequest takes List[TimeWindowInputSchema].
        # Validation for start_time < end_time is on TimeWindowInputSchema.

        # Test by trying to create DayTemplateCreateRequest with data that would make an invalid TimeWindowInputSchema
        with pytest.raises(ValidationError, match="end_time must be greater than start_time"):
            DayTemplateCreateRequest(
                name="Test Template",
                description="Invalid time window test",
                time_windows=[{"name": "Invalid Time", "start_time": 720, "end_time": 600, "category_id": ObjectId()}],
            )

    def test_time_window_validation_within_24h(
        self,
        sample_user_id: ObjectId,
    ):
        """Test validation that time windows must be within a 24-hour period"""
        # Validation for time range (0-1439) is on TimeWindowInputSchema's fields.
        with pytest.raises(ValidationError, match="Time must be between 0 and 1439 minutes"):
            DayTemplateCreateRequest(
                name="Test Template",
                description="Invalid time range test",
                time_windows=[{"name": "Over 24h", "start_time": 0, "end_time": 1440, "category_id": ObjectId()}],
            )

    # Removing tests that call non-existent DayTemplateMapper.to_model_for_update
    # def test_update_time_windows_order(...)
    # def test_handle_empty_time_windows_update(...)
    # def test_partial_update_preserves_time_windows(...)

    @pytest.mark.parametrize(
        "invalid_start,invalid_end",
        [
            (-1, 60),  # negative start time
            (60, -1),  # negative end time
            (1441, 1500),  # start time > 24h
            (60, 1441),  # end time > 24h
        ],
    )
    def test_invalid_time_ranges(self, sample_user_id: ObjectId, invalid_start: int, invalid_end: int):
        """Test various invalid time range scenarios"""
        # This test uses DayTemplateCreateRequest with TimeWindowInputSchema.
        # The validation is on TimeWindowInputSchema itself.

        # Create a list containing one dict that would fail TimeWindowInputSchema validation
        invalid_tw_dict_list = [
            {
                "name": "Invalid Time Range TW Dict",
                "start_time": invalid_start,
                "end_time": invalid_end,
                "category_id": ObjectId(),  # This is correct for TimeWindowInputSchema
            }
        ]

        with pytest.raises(ValidationError):
            DayTemplateCreateRequest(
                name="Test Template", description="Invalid time range test", time_windows=invalid_tw_dict_list
            )
