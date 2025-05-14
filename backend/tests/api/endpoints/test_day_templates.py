import pytest
from httpx import AsyncClient
from odmantic import ObjectId  # Added import

from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse
from app.api.schemas.time_window import hhmm_to_minutes
from app.core.config import settings
from app.db.models.category import Category
from app.db.models.time_window import TimeWindow  # Ensure TimeWindow model is imported for type hints
from app.db.models.user import User

API_V1_STR = settings.API_V1_STR
DAY_TEMPLATES_ENDPOINT = f"{API_V1_STR}/day-templates/"

pytestmark = pytest.mark.asyncio


async def test_create_day_template_success(
    async_client: AsyncClient,
    test_db,  # Replaced AsyncSession with test_db
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,  # Fixture for user one's category
    user_one_time_window: TimeWindow,  # Fixture for user one's time window
) -> None:
    """
    Test successful creation of a day template.
    """
    day_template_data = DayTemplateCreateRequest(
        name="Test Day Template Success",
        description="A test day template for success case",
        time_windows=[user_one_time_window.id],  # Changed field name and pass ObjectId directly
    )
    response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data.model_dump(mode="json"),
    )
    assert response.status_code == 201, response.text
    created_day_template = DayTemplateResponse(**response.json())
    assert created_day_template.name == day_template_data.name
    assert created_day_template.description == day_template_data.description
    assert str(created_day_template.user_id) == str(test_user_one.id)
    assert len(created_day_template.time_windows) == 1
    retrieved_tw = created_day_template.time_windows[0]
    assert str(retrieved_tw.id) == str(user_one_time_window.id)
    assert retrieved_tw.name == user_one_time_window.name
    # After parsing the response, TimeWindowResponse.start_time and .end_time are integers
    assert retrieved_tw.start_time == user_one_time_window.start_time, "Parsed start_time should be integer minutes"
    assert retrieved_tw.end_time == user_one_time_window.end_time, "Parsed end_time should be integer minutes"
    assert str(retrieved_tw.category.id) == str(user_one_category.id)
    assert retrieved_tw.category.name == user_one_category.name
    # Ensure category color is also checked if it's part of CategoryResponse and relevant
    if hasattr(retrieved_tw.category, "color") and hasattr(user_one_category, "color"):
        assert retrieved_tw.category.color == user_one_category.color


async def test_create_day_template_name_conflict_same_user(
    async_client: AsyncClient,
    test_db,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindow,
) -> None:
    """
    Test creating a day template with a name that already exists for the same user.
    Should return a 400 error.
    """
    template_name = "Existing Template Same User"
    day_template_data = DayTemplateCreateRequest(
        name=template_name,
        description="First template",
        time_windows=[user_one_time_window.id],  # Changed field name
    )
    # Create the first template
    response1 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data.model_dump(mode="json"),
    )
    assert response1.status_code == 201, response1.text

    # Attempt to create another template with the same name
    day_template_data_conflict = DayTemplateCreateRequest(
        name=template_name,
        description="Second template with same name",
        time_windows=[user_one_time_window.id],  # Changed field name
    )
    response2 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data_conflict.model_dump(mode="json"),
    )
    assert response2.status_code == 400, response2.text
    assert "already exists for this user" in response2.json()["detail"]


async def test_create_day_template_name_conflict_different_user(
    async_client: AsyncClient,
    test_db,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    test_user_two: User,  # Fixture for second user
    auth_headers_user_two: dict[str, str],  # Fixture for second user's auth
    user_one_time_window: TimeWindow,
    user_two_time_window: TimeWindow,  # Fixture for second user's time window
) -> None:
    """
    Test creating a day template with a name that exists for a different user.
    Should be successful.
    """
    template_name = "Shared Name Template Diff User"
    # User 1 creates a template
    day_template_data_user1 = DayTemplateCreateRequest(
        name=template_name,
        description="User 1's template",
        time_windows=[user_one_time_window.id],  # Changed field name
    )
    response_user1 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data_user1.model_dump(mode="json"),
    )
    assert response_user1.status_code == 201, response_user1.text

    # User 2 creates a template with the same name
    day_template_data_user2 = DayTemplateCreateRequest(
        name=template_name,
        description="User 2's template",
        time_windows=[user_two_time_window.id],  # Changed field name
    )
    response_user2 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_two,
        json=day_template_data_user2.model_dump(mode="json"),
    )
    assert response_user2.status_code == 201, response_user2.text
    created_template_user2 = DayTemplateResponse(**response_user2.json())
    assert created_template_user2.name == template_name
    assert str(created_template_user2.user_id) == str(test_user_two.id)
    assert len(created_template_user2.time_windows) == 1
    retrieved_tw_user2 = created_template_user2.time_windows[0]
    assert str(retrieved_tw_user2.id) == str(user_two_time_window.id)
    # After parsing, times are integers
    assert retrieved_tw_user2.start_time == user_two_time_window.start_time
    assert retrieved_tw_user2.end_time == user_two_time_window.end_time


async def test_create_day_template_non_existent_time_window(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
) -> None:
    """
    Test creating a day template with a non-existent time_window_id.
    Should return a 404 error.
    """
    non_existent_time_window_id = "605f585dd5a2a60d39f3b3c9"  # Example non-existent ObjectId
    day_template_data = DayTemplateCreateRequest(
        name="Template With Invalid TW",
        description="This should fail due to non-existent TW",
        time_windows=[ObjectId(non_existent_time_window_id)],  # Changed field name, ensure ObjectId
    )
    response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data.model_dump(mode="json"),
    )
    assert response.status_code == 404, response.text
    assert f"Time window with ID '{non_existent_time_window_id}' not found" in response.json()["detail"]


async def test_create_day_template_time_window_unowned(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_two_time_window: TimeWindow,  # Time window owned by user_two
) -> None:
    """
    Test creating a day template with a time_window_id owned by another user.
    Should return a 404 error (as if it doesn't exist for the current user).
    """
    day_template_data = DayTemplateCreateRequest(
        name="Template With Unowned TW",
        description="This should also fail due to unowned TW",
        time_windows=[user_two_time_window.id],  # Changed field name
    )
    response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data.model_dump(mode="json"),
    )
    assert response.status_code == 404, response.text
    assert (
        f"Time window with ID '{str(user_two_time_window.id)}' not found" in response.json()["detail"]
    )  # Service returns "not found" for unowned


async def test_create_day_template_unauthenticated(
    async_client: AsyncClient,
    user_one_time_window: TimeWindow,
) -> None:
    """
    Test creating a day template without authentication.
    Should return a 401 error.
    """
    day_template_data = DayTemplateCreateRequest(
        name="Unauth Template Create",
        description="This won't be created due to no auth",
        time_windows=[user_one_time_window.id],  # Changed field name
    )
    response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        json=day_template_data.model_dump(mode="json"),
        # No auth headers
    )
    assert response.status_code == 401, response.text
    assert response.json()["detail"] == "Not authenticated"


@pytest.mark.parametrize(
    "name, description, time_window_ids_placeholder, expected_status, expected_detail_part",
    [
        ("", "Valid desc", ["valid_id"], 422, "String should have at least 1 character"),  # name min_length=1
        (
            "a" * 101,
            "Valid desc",
            ["valid_id"],
            422,
            "String should have at most 100 characters",
        ),  # name max_length=100
        (
            "Valid Name",
            "a" * 256,
            ["valid_id"],
            422,
            "String should have at most 255 characters",
        ),  # description max_length=255
        ("Valid Name", "Valid desc", [], 422, "List should have at least 1 item"),  # time_windows min_items=1
        (
            "Valid Name",
            "Valid desc",
            ["invalid-object-id-format"],
            422,
            "Input should be an instance of ObjectId",
        ),  # time_windows item type
    ],
)
async def test_create_day_template_validation_errors(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindow,
    name: str,
    description: str | None,
    time_window_ids_placeholder: list[str],
    expected_status: int,
    expected_detail_part: str,
) -> None:
    """
    Test creating a day template with various validation errors.
    """
    # Convert placeholder strings to ObjectIds or keep as invalid strings for testing
    processed_time_windows_for_dict = []
    if time_window_ids_placeholder:
        for tw_id_str in time_window_ids_placeholder:
            if tw_id_str == "valid_id":
                # For JSON payload, ObjectId needs to be a string
                processed_time_windows_for_dict.append(str(user_one_time_window.id))
            elif ObjectId.is_valid(tw_id_str) and not any(
                c in tw_id_str for c in ["{", "[", '"']
            ):  # Avoid trying to convert JSON-like strings
                # For JSON payload, ObjectId needs to be a string
                processed_time_windows_for_dict.append(str(ObjectId(tw_id_str)))
            else:
                # If it's an invalid format string, keep it as is for validation testing
                processed_time_windows_for_dict.append(tw_id_str)
    else:  # Handle case where time_window_ids_placeholder is empty list for the test
        processed_time_windows_for_dict = []

    day_template_data_dict = {
        "name": name,
        "time_windows": processed_time_windows_for_dict,  # Use the list of strings/ObjectIds
    }
    if description is not None:
        day_template_data_dict["description"] = description
    else:  # Pydantic v2 requires optional fields to be explicitly None or excluded
        day_template_data_dict.pop("description", None)

    response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data_dict,  # Send the dict directly
    )
    assert response.status_code == expected_status, response.text
    response_json = response.json()
    assert "detail" in response_json

    if isinstance(response_json["detail"], list):  # Pydantic v2 error format
        found_error = False
        for error in response_json["detail"]:
            if "msg" in error and expected_detail_part.lower() in error["msg"].lower():
                found_error = True
                break
            # Sometimes the specific error message is nested if it's a custom error
            if "ctx" in error and "error" in error["ctx"]:
                # Check if error["ctx"]["error"] is a string or an object with 'message'
                error_val = error["ctx"]["error"]
                # Ensure error_val itself is checked if it's a string, or its 'message' attribute
                if isinstance(error_val, str) and expected_detail_part.lower() in error_val.lower():
                    found_error = True
                    break
                # Pydantic v2 errors can be objects with a 'message' attribute
                if (
                    hasattr(error_val, "message")
                    and isinstance(error_val.message, str)
                    and expected_detail_part.lower() in error_val.message.lower()
                ):
                    found_error = True
                    break
        assert found_error, f"Expected detail part '{expected_detail_part}' not found in {response_json['detail']}"
    else:  # Older Pydantic or custom error format (string)
        assert (
            expected_detail_part.lower() in response_json["detail"].lower()
        ), f"Expected detail part '{expected_detail_part}' not found in {response_json['detail']}"


# Need to add tests for GET, PATCH, DELETE endpoints that also parse DayTemplateResponse


async def test_get_day_template_by_id_success(
    async_client: AsyncClient,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,
    user_one_time_window: TimeWindow,
    test_db,
):
    # Create a template first
    day_template_data = DayTemplateCreateRequest(
        name="Gettable Template",
        description="Test GET by ID",
        time_windows=[user_one_time_window.id],
    )
    create_response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data.model_dump(mode="json"),
    )
    assert create_response.status_code == 201
    created_template_id = create_response.json()["id"]

    # Get the template by ID
    get_response = await async_client.get(
        f"{DAY_TEMPLATES_ENDPOINT}{created_template_id}",
        headers=auth_headers_user_one,
    )
    assert get_response.status_code == 200, get_response.text
    retrieved_template = DayTemplateResponse(**get_response.json())

    assert retrieved_template.id == ObjectId(created_template_id)
    assert retrieved_template.name == day_template_data.name
    assert str(retrieved_template.user_id) == str(test_user_one.id)
    assert len(retrieved_template.time_windows) == 1
    tw_resp = retrieved_template.time_windows[0]
    assert str(tw_resp.id) == str(user_one_time_window.id)
    assert tw_resp.start_time == user_one_time_window.start_time  # Integer comparison
    assert tw_resp.end_time == user_one_time_window.end_time  # Integer comparison
    assert str(tw_resp.category.id) == str(user_one_category.id)


async def test_get_all_day_templates_success(
    async_client: AsyncClient,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,
    user_one_time_window: TimeWindow,  # Main TW
    test_db,
):
    # Create a couple of templates for user_one
    tw_alt_data = {  # Data for an alternative TimeWindow
        "name": "Alt TW for Get All",
        "start_time": hhmm_to_minutes("10:00"),
        "end_time": hhmm_to_minutes("11:00"),
        "category": user_one_category,  # Pass the Category model instance
        "user": test_user_one,  # Pass the User model instance
    }
    # Need to import TimeWindow model to save directly
    from app.db.models.time_window import TimeWindow as TimeWindowModel

    user_one_time_window_alt = TimeWindowModel(**tw_alt_data)
    await test_db.save(user_one_time_window_alt)

    dt1_data = DayTemplateCreateRequest(name="DT1 for Get All", time_windows=[user_one_time_window.id])
    dt2_data = DayTemplateCreateRequest(name="DT2 for Get All", time_windows=[user_one_time_window_alt.id])

    await async_client.post(
        DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one, json=dt1_data.model_dump(mode="json")
    )
    await async_client.post(
        DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one, json=dt2_data.model_dump(mode="json")
    )

    response = await async_client.get(DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one)
    assert response.status_code == 200
    templates_list = [DayTemplateResponse(**item) for item in response.json()]
    assert len(templates_list) == 2

    dt1_resp = next(t for t in templates_list if t.name == "DT1 for Get All")
    dt2_resp = next(t for t in templates_list if t.name == "DT2 for Get All")

    assert dt1_resp.time_windows[0].start_time == user_one_time_window.start_time  # Integer
    assert dt2_resp.time_windows[0].start_time == user_one_time_window_alt.start_time  # Integer


async def test_update_day_template_full(
    async_client: AsyncClient,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,  # Original category
    user_one_time_window: TimeWindow,  # Original TW
    test_db,
):
    # Create initial template
    initial_data = DayTemplateCreateRequest(
        name="Initial DT for Update", description="Original Desc", time_windows=[user_one_time_window.id]
    )
    create_resp = await async_client.post(
        DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one, json=initial_data.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    template_id_to_update = create_resp.json()["id"]

    # Create a new category and time window for update
    from app.db.models.category import Category as CategoryModel

    new_category_model = CategoryModel(
        name="Updated Category", color="#00FF00", user=test_user_one
    )  # Pass User instance
    await test_db.save(new_category_model)

    from app.db.models.time_window import TimeWindow as TimeWindowModel

    new_tw_model = TimeWindowModel(
        name="Updated TW",
        start_time=hhmm_to_minutes("14:00"),
        end_time=hhmm_to_minutes("15:00"),
        category=new_category_model,  # Pass Category instance
        user=test_user_one,  # Pass User instance
    )
    await test_db.save(new_tw_model)

    update_payload_dict = {
        "name": "Fully Updated DT",
        "description": "New Description",
        "time_windows": [str(new_tw_model.id)],  # Send ObjectId as string
    }

    update_response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}{template_id_to_update}", headers=auth_headers_user_one, json=update_payload_dict
    )
    assert update_response.status_code == 200, update_response.text
    updated_template = DayTemplateResponse(**update_response.json())

    assert updated_template.name == "Fully Updated DT"
    assert updated_template.description == "New Description"
    assert len(updated_template.time_windows) == 1
    updated_tw_resp = updated_template.time_windows[0]
    assert str(updated_tw_resp.id) == str(new_tw_model.id)
    assert updated_tw_resp.start_time == new_tw_model.start_time  # Integer comparison
    assert updated_tw_resp.end_time == new_tw_model.end_time  # Integer comparison
    assert str(updated_tw_resp.category.id) == str(new_category_model.id)
    assert updated_tw_resp.category.name == new_category_model.name


async def test_update_day_template_clear_time_windows(
    async_client: AsyncClient,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindow,  # Original TW
    test_db,
):
    # Create initial template
    initial_data = DayTemplateCreateRequest(name="DT for Clearing TWs", time_windows=[user_one_time_window.id])
    create_resp = await async_client.post(
        DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one, json=initial_data.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    template_id_to_update = create_resp.json()["id"]

    update_payload_dict = {"time_windows": []}  # Clear time windows

    update_response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}{template_id_to_update}", headers=auth_headers_user_one, json=update_payload_dict
    )
    assert update_response.status_code == 200, update_response.text
    updated_template = DayTemplateResponse(**update_response.json())
    assert updated_template.name == "DT for Clearing TWs"  # Name should not change
    assert len(updated_template.time_windows) == 0

    # Verify original time window is still in DB
    from app.db.models.time_window import TimeWindow as TimeWindowModel  # Ensure import

    original_tw_db = await test_db.find_one(TimeWindowModel, TimeWindowModel.id == user_one_time_window.id)
    assert original_tw_db is not None
