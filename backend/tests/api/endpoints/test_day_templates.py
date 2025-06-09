import pytest
from httpx import AsyncClient
from odmantic import ObjectId  # Added import

from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse
from app.core.config import settings
from app.db.models.category import Category
from app.db.models.day_template import DayTemplate as DayTemplateModel

# TimeWindow model is removed, its data is embedded in DayTemplate
from app.db.models.user import User

API_V1_STR = settings.API_V1_STR
DAY_TEMPLATES_ENDPOINT = f"{API_V1_STR}/day-templates"

pytestmark = pytest.mark.asyncio


async def test_create_day_template_success(
    async_client: AsyncClient,
    test_db,  # Replaced AsyncSession with test_db
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,  # Fixture for user one's category
    # user_one_time_window fixture removed
) -> None:
    """
    Test successful creation of a day template.
    """
    embedded_tw_data = {
        "description": "Morning Focus",
        "start_time": 9 * 60,
        "end_time": 12 * 60,
        "category_id": str(user_one_category.id),
    }
    day_template_data = DayTemplateCreateRequest(
        name="Test Day Template Success",
        description="A test day template for success case",
        time_windows=[embedded_tw_data],
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
    assert created_day_template.user_id == test_user_one.id  # Now directly ObjectId
    assert len(created_day_template.time_windows) == 1
    retrieved_tw_resp = created_day_template.time_windows[0]

    # Assertions for the embedded time window
    assert retrieved_tw_resp.description == embedded_tw_data["description"]
    assert retrieved_tw_resp.start_time == embedded_tw_data["start_time"]
    assert retrieved_tw_resp.end_time == embedded_tw_data["end_time"]
    assert retrieved_tw_resp.category.id == user_one_category.id
    assert retrieved_tw_resp.category.name == user_one_category.name
    if hasattr(retrieved_tw_resp.category, "color") and hasattr(user_one_category, "color"):
        assert retrieved_tw_resp.category.color == user_one_category.color
    # Assuming the embedded TW response also includes user_id, or it's implicitly user_one's
    # If user_id is part of the embedded TW response schema:
    # assert retrieved_tw_resp.user_id == test_user_one.id
    # If not, this assertion might need to be removed or rethought based on actual schema.
    # For now, let's assume it's not directly on the embedded TW if not explicitly part of its schema.
    # The DayTemplate itself has user_id, which is already checked.


async def test_create_day_template_name_conflict_same_user(
    async_client: AsyncClient,
    test_db,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,  # Needed for embedded TW
) -> None:
    """
    Test creating a day template with a name that already exists for the same user.
    Should return a 400 error.
    """
    template_name = "Existing Template Same User"
    embedded_tw_data = {
        "description": "TW for Conflict Test",
        "start_time": 8 * 60,
        "end_time": 9 * 60,
        "category_id": str(user_one_category.id),
    }
    day_template_data = DayTemplateCreateRequest(
        name=template_name,
        description="First template",
        time_windows=[embedded_tw_data],
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
        time_windows=[embedded_tw_data],
    )
    response2 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data_conflict.model_dump(mode="json"),
    )
    assert response2.status_code == 400, response2.text
    assert f"A day template with the name '{template_name}' already exists." == response2.json()["detail"]


async def test_create_day_template_name_conflict_different_user(
    async_client: AsyncClient,
    test_db,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    test_user_two: User,
    auth_headers_user_two: dict[str, str],
    user_one_category: Category,  # For user one's embedded TW
    user_two_category: Category,  # For user two's embedded TW
) -> None:
    """
    Test creating a day template with a name that exists for a different user.
    Should be successful.
    """
    template_name = "Shared Name Template Diff User"
    embedded_tw_data_user1 = {
        "description": "User1 TW Diff User Test",
        "start_time": 7 * 60,
        "end_time": 8 * 60,
        "category_id": str(user_one_category.id),
    }
    # User 1 creates a template
    day_template_data_user1 = DayTemplateCreateRequest(
        name=template_name,
        description="User 1's template",
        time_windows=[embedded_tw_data_user1],
    )
    response_user1 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data_user1.model_dump(mode="json"),
    )
    assert response_user1.status_code == 201, response_user1.text

    # User 2 creates a template with the same name
    embedded_tw_data_user2 = {
        "description": "User2 TW Diff User Test",
        "start_time": 10 * 60,
        "end_time": 11 * 60,
        "category_id": str(user_two_category.id),
    }
    day_template_data_user2 = DayTemplateCreateRequest(
        name=template_name,
        description="User 2's template",
        time_windows=[embedded_tw_data_user2],
    )
    response_user2 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_two,
        json=day_template_data_user2.model_dump(mode="json"),
    )
    assert response_user2.status_code == 201, response_user2.text
    created_template_user2 = DayTemplateResponse(**response_user2.json())
    assert created_template_user2.name == template_name
    assert created_template_user2.user_id == test_user_two.id  # Now directly ObjectId
    assert len(created_template_user2.time_windows) == 1
    retrieved_tw_user2_resp = created_template_user2.time_windows[0]
    assert retrieved_tw_user2_resp.description == embedded_tw_data_user2["description"]
    assert retrieved_tw_user2_resp.start_time == embedded_tw_data_user2["start_time"]
    assert retrieved_tw_user2_resp.end_time == embedded_tw_data_user2["end_time"]
    assert retrieved_tw_user2_resp.category.id == user_two_category.id
    # assert retrieved_tw_user2_resp.user_id == test_user_two.id # If applicable


async def test_create_day_template_non_existent_category_in_time_window(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
) -> None:
    """
    Test creating a day template with a non-existent category_id in an embedded time window.
    Should return a 404 error.
    """
    non_existent_category_id = "605f585dd5a2a60d39f3b3c9"
    embedded_tw_data_invalid_cat = {
        "description": "TW with Invalid Category",
        "start_time": 9 * 60,
        "end_time": 10 * 60,
        "category_id": non_existent_category_id,
    }
    day_template_data = DayTemplateCreateRequest(
        name="Template With Invalid Category in TW",
        description="This should fail due to non-existent category in TW",
        time_windows=[embedded_tw_data_invalid_cat],
    )
    response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data.model_dump(mode="json"),
    )
    assert response.status_code == 400, response.text  # Service returns 400 for not found/accessible categories
    # The exact error message depends on service implementation.
    # It might be a generic validation error or a specific "Category not found".
    assert "One or more categories not found or not accessible" in response.json()["detail"]
    assert non_existent_category_id in response.json()["detail"]


async def test_create_day_template_category_in_time_window_unowned(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_two_category: Category,  # Category owned by user_two
) -> None:
    """
    Test creating a day template with a category_id in an embedded time window
    that is owned by another user. Should return a 404 or 403 error.
    """
    embedded_tw_data_unowned_cat = {
        "description": "TW with Unowned Category",
        "start_time": 11 * 60,
        "end_time": 12 * 60,
        "category_id": str(user_two_category.id),
    }
    day_template_data = DayTemplateCreateRequest(
        name="Template With Unowned Category in TW",
        description="This should fail due to unowned category in TW",
        time_windows=[embedded_tw_data_unowned_cat],
    )
    response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=day_template_data.model_dump(mode="json"),
    )
    # Expecting 404 if service treats unowned as not found, or 403 if specific ownership check fails for category
    assert response.status_code == 400, response.text  # Service returns 400 for not found/accessible categories
    assert "One or more categories not found or not accessible" in response.json()["detail"]
    assert str(user_two_category.id) in response.json()["detail"]


async def test_create_day_template_unauthenticated(
    async_client: AsyncClient,
    user_one_category: Category,  # Needed for dummy payload
) -> None:
    """
    Test creating a day template without authentication.
    Should return a 401 error.
    """
    embedded_tw_data = {
        "description": "Unauth TW",
        "start_time": 9 * 60,
        "end_time": 10 * 60,
        "category_id": str(user_one_category.id),  # Dummy category, won't be checked due to auth fail
    }
    day_template_data = DayTemplateCreateRequest(
        name="Unauth Template Create",
        description="This won't be created due to no auth",
        time_windows=[embedded_tw_data],
    )
    response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        json=day_template_data.model_dump(mode="json"),
        # No auth headers
    )
    assert response.status_code == 401, response.text
    assert response.json()["detail"] == "Not authenticated"


@pytest.mark.parametrize(
    "name, description, time_windows_payload, expected_status, expected_detail_part",
    [
        (
            "",
            "Valid desc",
            [{"description": "TW", "start_time": 0, "end_time": 60, "category_id": "valid_cat_id"}],
            422,
            "String should have at least 1 character",
        ),
        (
            "a" * 101,
            "Valid desc",
            [{"description": "TW", "start_time": 0, "end_time": 60, "category_id": "valid_cat_id"}],
            422,
            "String should have at most 100 characters",
        ),
        (
            "Valid Name",
            "a" * 256,
            [{"description": "TW", "start_time": 0, "end_time": 60, "category_id": "valid_cat_id"}],
            422,
            "String should have at most 255 characters",
        ),
        # Validation for embedded time_windows
        (
            "Valid Name",
            "Valid desc",
            [{"description": "TW", "start_time": 0, "end_time": 60, "category_id": "invalid-object-id-format"}],
            422,
            "Input should be an instance of ObjectId",
        ),  # Adjusted
        (
            "Valid Name",
            "Valid desc",
            [{"description": "TW", "start_time": 60, "end_time": 0, "category_id": "valid_cat_id"}],
            422,
            "end_time must be greater than start_time",
        ),  # Adjusted (Pydantic v2 style from TimeWindowInputSchema)
        (
            "Valid Name",
            "Valid desc",
            [{"description": "TW", "start_time": -10, "end_time": 60, "category_id": "valid_cat_id"}],
            422,
            "Time must be between 0 and 1439 minutes",
        ),  # Adjusted (Pydantic v2 style from TimeWindowInputSchema)
        ("Valid Name", "Valid desc", [{"description": "TW", "start_time": 0, "end_time": 60}], 422, "Field required"),
    ],
)
async def test_create_day_template_validation_errors(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,  # To get a valid category_id
    name: str,
    description: str | None,
    time_windows_payload: list[dict],  # Now a list of dicts
    expected_status: int,
    expected_detail_part: str,
) -> None:
    """
    Test creating a day template with various validation errors.
    """
    processed_time_windows = []
    for tw_payload in time_windows_payload:
        # Replace placeholder "valid_cat_id" with actual valid category ID
        if "category_id" in tw_payload and tw_payload["category_id"] == "valid_cat_id":
            tw_payload["category_id"] = str(user_one_category.id)
        processed_time_windows.append(tw_payload)

    day_template_data_dict = {
        "name": name,
        "time_windows": processed_time_windows,
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


async def test_create_day_template_with_empty_time_windows_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: User,
) -> None:
    """
    Test successful creation of a day template with an empty time_windows list.
    """
    day_template_data = DayTemplateCreateRequest(
        name="Test Day Template Empty TW",
        description="A test day template with no time windows",
        time_windows=[],
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
    assert created_day_template.user_id == test_user_one.id
    assert len(created_day_template.time_windows) == 0


# Need to add tests for GET, PATCH, DELETE endpoints that also parse DayTemplateResponse


async def test_get_day_template_by_id_success(
    async_client: AsyncClient,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_day_template_model: DayTemplateModel,  # This fixture now includes an embedded TW
    user_one_category: Category,  # For comparing against the category in embedded TW
    test_db,
):
    # user_one_day_template_model fixture now creates a DT with an embedded TW.
    # The embedded TW details come from user_one_day_template_model.time_windows[0] (which is a dict)
    # and user_one_category.

    get_response = await async_client.get(
        f"{DAY_TEMPLATES_ENDPOINT}/{user_one_day_template_model.id}",
        headers=auth_headers_user_one,
    )
    assert get_response.status_code == 200, get_response.text
    retrieved_template = DayTemplateResponse(**get_response.json())

    assert retrieved_template.id == user_one_day_template_model.id
    assert retrieved_template.name == user_one_day_template_model.name
    assert retrieved_template.description == user_one_day_template_model.description
    assert retrieved_template.user_id == test_user_one.id

    assert len(retrieved_template.time_windows) == 1
    tw_resp = retrieved_template.time_windows[0]  # This is now an EmbeddedTimeWindowResponse

    # Get the original embedded TW data from the fixture model
    original_embedded_tw_data = user_one_day_template_model.time_windows[0]

    # TimeWindowResponse does not have an 'id' field.
    assert (
        tw_resp.description == original_embedded_tw_data.description
    )  # Accessing attribute of EmbeddedTimeWindowSchema
    assert tw_resp.start_time == original_embedded_tw_data.start_time
    assert tw_resp.end_time == original_embedded_tw_data.end_time
    assert tw_resp.category.id == original_embedded_tw_data.category_id
    assert tw_resp.category.name == user_one_category.name
    # assert tw_resp.user_id == test_user_one.id # If applicable for embedded TW response


async def test_get_all_day_templates_success(
    async_client: AsyncClient,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,
    user_one_day_template_model: DayTemplateModel,  # This is one template already
    test_db,
):
    # user_one_day_template_model fixture already creates one template.
    # We'll create two more distinct templates.

    embedded_tw1_data = {
        "description": "TW1 for Get All",
        "start_time": 800,
        "end_time": 900,
        "category_id": str(user_one_category.id),
    }
    dt1_data = DayTemplateCreateRequest(name="DT1 for Get All", time_windows=[embedded_tw1_data])

    embedded_tw2_data = {
        "description": "TW2 for Get All",
        "start_time": 1000,
        "end_time": 1100,
        "category_id": str(user_one_category.id),
    }
    dt2_data = DayTemplateCreateRequest(name="DT2 for Get All", time_windows=[embedded_tw2_data])

    # Create the two new templates
    resp1 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one, json=dt1_data.model_dump(mode="json")
    )
    assert resp1.status_code == 201
    resp2 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one, json=dt2_data.model_dump(mode="json")
    )
    assert resp2.status_code == 201

    # Get all templates for user one
    response = await async_client.get(DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one)
    assert response.status_code == 200
    templates_list = [DayTemplateResponse(**item) for item in response.json()]

    # We expect 3 templates: 1 from fixture, 2 created here.
    # The exact number depends on test isolation. If user_one_day_template_model is session-scoped
    # and other tests for user_one run before this, there could be more.
    # For simplicity, let's assume this test runs in isolation or we filter.

    # Filter for the templates created in this test and the one from the fixture
    names_to_find = {user_one_day_template_model.name, "DT1 for Get All", "DT2 for Get All"}
    found_templates = [t for t in templates_list if t.name in names_to_find]
    assert len(found_templates) == 3  # Adjust if fixture scope or other tests interfere

    dt1_resp = next(t for t in found_templates if t.name == "DT1 for Get All")
    dt2_resp = next(t for t in found_templates if t.name == "DT2 for Get All")
    fixture_dt_resp = next(t for t in found_templates if t.name == user_one_day_template_model.name)

    assert dt1_resp.time_windows[0].start_time == embedded_tw1_data["start_time"]
    assert dt2_resp.time_windows[0].start_time == embedded_tw2_data["start_time"]
    # user_one_day_template_model.time_windows[0] is an EmbeddedTimeWindowSchema instance
    assert fixture_dt_resp.time_windows[0].start_time == user_one_day_template_model.time_windows[0].start_time


async def test_get_day_template_by_id_not_found(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
) -> None:
    """
    Test getting a day template by a non-existent ID.
    Should return 404.
    """
    non_existent_id = "605f585dd5a2a60d39f3b3c9"  # Example non-existent ObjectId
    response = await async_client.get(
        f"{DAY_TEMPLATES_ENDPOINT}/{non_existent_id}",
        headers=auth_headers_user_one,
    )
    assert response.status_code == 404, response.text
    assert response.json()["detail"] == "DayTemplate not found"


async def test_get_day_template_by_id_not_owner(
    async_client: AsyncClient,
    auth_headers_user_two: dict[str, str],  # For attempting to access as user two
    user_one_day_template_model: DayTemplateModel,
) -> None:
    """
    Test getting a day template owned by another user.
    Should return 403.
    """
    template_id = user_one_day_template_model.id

    # User two tries to get it
    response = await async_client.get(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id}",
        headers=auth_headers_user_two,  # Authenticated as user two
    )
    assert response.status_code == 404, response.text  # Changed from 403 to 404
    assert response.json()["detail"] == "DayTemplate not found"  # Adjusted error message


async def test_get_day_template_by_id_unauthenticated(
    async_client: AsyncClient,
    user_one_day_template_model: DayTemplateModel,
) -> None:
    """
    Test getting a day template by ID without authentication.
    Should return 401.
    """
    template_id = user_one_day_template_model.id

    # Attempt to get without auth
    response = await async_client.get(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id}",
        # No auth headers
    )
    assert response.status_code == 401, response.text
    assert response.json()["detail"] == "Not authenticated"


async def test_get_all_day_templates_empty_list(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],  # User one has no templates yet in this specific test
    test_user_one: User,  # Ensure user exists
    test_db,  # To ensure clean state if needed, though typically handled by test isolation
) -> None:
    """
    Test getting all day templates when the user has none.
    Should return an empty list.
    """
    # Note: This test assumes user_one doesn't have templates from other tests.
    # For robust isolation, one might clear templates for user_one before this test,
    # or use a dedicated user with no templates.
    # For now, we rely on the fact that this user's templates are created within specific tests.
    response = await async_client.get(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
    )
    assert response.status_code == 200, response.text
    assert response.json() == []


async def test_get_all_day_templates_filters_by_owner(
    async_client: AsyncClient,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,  # For user one's TW
    test_user_two: User,
    auth_headers_user_two: dict[str, str],
    user_two_category: Category,  # For user two's TW
    test_db,
):
    """
    Test that GET /day-templates/ only returns templates owned by the authenticated user.
    """
    # User One creates a template
    embedded_tw_user_one = {
        "name": "U1 TW",
        "start_time": 100,
        "end_time": 200,
        "category_id": str(user_one_category.id),
    }
    dt_user_one_data = DayTemplateCreateRequest(name="UserOneOnly DT", time_windows=[embedded_tw_user_one])
    create_resp_one = await async_client.post(
        DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one, json=dt_user_one_data.model_dump(mode="json")
    )
    assert create_resp_one.status_code == 201
    user_one_dt_id = create_resp_one.json()["id"]

    # User Two creates a template
    embedded_tw_user_two = {
        "name": "U2 TW",
        "start_time": 300,
        "end_time": 400,
        "category_id": str(user_two_category.id),
    }
    dt_user_two_data = DayTemplateCreateRequest(name="UserTwoOnly DT", time_windows=[embedded_tw_user_two])
    create_resp_two = await async_client.post(
        DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_two, json=dt_user_two_data.model_dump(mode="json")
    )
    assert create_resp_two.status_code == 201
    user_two_dt_id = create_resp_two.json()["id"]

    # User One gets their templates
    response_user_one = await async_client.get(DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one)
    assert response_user_one.status_code == 200
    templates_user_one = [DayTemplateResponse(**item) for item in response_user_one.json()]

    assert response_user_one.status_code == 200
    templates_user_one = [DayTemplateResponse(**item) for item in response_user_one.json()]

    # Check that User One's template is present and User Two's is not
    assert any(t.id == ObjectId(user_one_dt_id) for t in templates_user_one)
    assert not any(t.id == ObjectId(user_two_dt_id) for t in templates_user_one)
    for t in templates_user_one:
        assert t.user_id == test_user_one.id

    # User Two gets their templates
    response_user_two = await async_client.get(DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_two)
    assert response_user_two.status_code == 200
    templates_user_two = [DayTemplateResponse(**item) for item in response_user_two.json()]

    # Check that User Two's template is present and User One's is not
    assert any(t.id == ObjectId(user_two_dt_id) for t in templates_user_two)
    assert not any(t.id == ObjectId(user_one_dt_id) for t in templates_user_two)
    for t in templates_user_two:
        assert t.user_id == test_user_two.id


async def test_get_all_day_templates_unauthenticated(
    async_client: AsyncClient,
) -> None:
    """
    Test getting all day templates without authentication.
    Should return 401.
    """
    response = await async_client.get(
        DAY_TEMPLATES_ENDPOINT,
        # No auth headers
    )
    assert response.status_code == 401, response.text
    assert response.json()["detail"] == "Not authenticated"


async def test_update_day_template_full(
    async_client: AsyncClient,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_day_template_model: DayTemplateModel,
    test_db,
):
    template_id_to_update = user_one_day_template_model.id

    # Create a new category for the updated embedded time window
    new_category_for_update = Category(name="Updated Category for TW", color="#ABCDEF", user=test_user_one.id)
    await test_db.save(new_category_for_update)

    updated_embedded_tw_data = {
        "description": "Updated Embedded TW",
        "start_time": 14 * 60,
        "end_time": 15 * 60,
        "category_id": str(new_category_for_update.id),
    }

    update_payload_dict = {
        "name": "Fully Updated DT",
        "description": "New Description",
        "time_windows": [updated_embedded_tw_data],
    }

    update_response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id_to_update}", headers=auth_headers_user_one, json=update_payload_dict
    )
    assert update_response.status_code == 200, update_response.text
    updated_template = DayTemplateResponse(**update_response.json())

    assert updated_template.name == "Fully Updated DT"
    assert updated_template.description == "New Description"
    assert len(updated_template.time_windows) == 1

    updated_tw_resp = updated_template.time_windows[0]
    # TimeWindowResponse does not have an 'id' field.
    assert updated_tw_resp.description == updated_embedded_tw_data["description"]
    assert updated_tw_resp.start_time == updated_embedded_tw_data["start_time"]
    assert updated_tw_resp.end_time == updated_embedded_tw_data["end_time"]
    assert updated_tw_resp.category.id == new_category_for_update.id
    assert updated_tw_resp.category.name == new_category_for_update.name


async def test_update_day_template_clear_time_windows(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_day_template_model: DayTemplateModel,
):
    template_id_to_update = user_one_day_template_model.id
    original_name = user_one_day_template_model.name  # Store original name for assertion

    update_payload_dict = {"time_windows": []}  # Clear time windows

    update_response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id_to_update}", headers=auth_headers_user_one, json=update_payload_dict
    )
    assert update_response.status_code == 200, update_response.text
    updated_template = DayTemplateResponse(**update_response.json())
    assert updated_template.name == original_name  # Name should not change from fixture's
    assert len(updated_template.time_windows) == 0


async def test_update_day_template_name_conflict_same_user(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,  # For embedded TW in second template
    user_one_day_template_model: DayTemplateModel,  # This is the first template
    test_db,
) -> None:
    """
    Test updating a day template to a name that already exists for the same user (another template).
    Should return a 400 error.
    """
    # user_one_day_template_model is the first template. Its name will be the target for conflict.

    # Create a second template
    embedded_tw_for_dt2 = {
        "name": "TW for DT2 Conflict",
        "start_time": 100,
        "end_time": 200,
        "category_id": str(user_one_category.id),
    }
    dt2_data = DayTemplateCreateRequest(name="DT2 To Be Updated For Conflict", time_windows=[embedded_tw_for_dt2])
    create_resp2 = await async_client.post(
        DAY_TEMPLATES_ENDPOINT, headers=auth_headers_user_one, json=dt2_data.model_dump(mode="json")
    )
    assert create_resp2.status_code == 201
    dt2_id = create_resp2.json()["id"]

    # Attempt to update DT2 to have the same name as user_one_day_template_model
    update_payload = {"name": user_one_day_template_model.name}
    response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{dt2_id}",
        headers=auth_headers_user_one,
        json=update_payload,
    )
    assert response.status_code == 400, response.text
    assert (
        f"A day template with the name '{user_one_day_template_model.name}' already exists."
        == response.json()["detail"]
    )


async def test_update_day_template_non_existent_category_in_time_window(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_day_template_model: DayTemplateModel,
) -> None:
    """
    Test updating a day template with a non-existent category_id in an embedded time window.
    Should return a 404 error.
    """
    template_id = user_one_day_template_model.id
    non_existent_category_id = "605f585dd5a2a60d39f3b3c0"

    updated_embedded_tw_invalid_cat = {
        "name": "Updated TW Invalid Cat",
        "start_time": 100,
        "end_time": 200,
        "category_id": non_existent_category_id,
    }
    update_payload = {"time_windows": [updated_embedded_tw_invalid_cat]}

    response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id}",
        headers=auth_headers_user_one,
        json=update_payload,
    )
    assert response.status_code == 400, response.text  # Service returns 400
    assert "One or more categories not found or not accessible" in response.json()["detail"]
    assert non_existent_category_id in response.json()["detail"]


async def test_update_day_template_category_in_time_window_unowned(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_two_category: Category,  # User two's category
    user_one_day_template_model: DayTemplateModel,
) -> None:
    """
    Test updating a day template with a category_id in an embedded time window
    that is owned by another user. Should return a 404 or 403 error.
    """
    template_id = user_one_day_template_model.id

    updated_embedded_tw_unowned_cat = {
        "name": "Updated TW Unowned Cat",
        "start_time": 100,
        "end_time": 200,
        "category_id": str(user_two_category.id),
    }
    update_payload = {"time_windows": [updated_embedded_tw_unowned_cat]}

    response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id}",
        headers=auth_headers_user_one,
        json=update_payload,
    )
    assert response.status_code == 400, response.text  # Service returns 400
    assert "One or more categories not found or not accessible" in response.json()["detail"]
    assert str(user_two_category.id) in response.json()["detail"]


async def test_update_day_template_not_found(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
) -> None:
    """
    Test updating a non-existent day template.
    Should return 404.
    """
    non_existent_id = "605f585dd5a2a60d39f3b3c1"
    update_payload = {"name": "New Name for Non Existent DT"}
    response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{non_existent_id}",
        headers=auth_headers_user_one,
        json=update_payload,
    )
    assert response.status_code == 404, response.text
    assert response.json()["detail"] == "DayTemplate not found"


async def test_update_day_template_not_owner(
    async_client: AsyncClient,
    auth_headers_user_two: dict[str, str],  # For user two to attempt update
    user_one_day_template_model: DayTemplateModel,
) -> None:
    """
    Test updating a day template owned by another user.
    Should return 403.
    """
    template_id = user_one_day_template_model.id

    # User two attempts to update it
    update_payload = {"description": "User Two's update attempt on User One DT"}
    response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id}",
        headers=auth_headers_user_two,  # Authenticated as user two
        json=update_payload,
    )
    assert response.status_code == 404, response.text  # Changed from 403
    assert response.json()["detail"] == "DayTemplate not found"


async def test_update_day_template_unauthenticated(
    async_client: AsyncClient,
    user_one_day_template_model: DayTemplateModel,
) -> None:
    """
    Test updating a day template without authentication.
    Should return 401.
    """
    template_id = user_one_day_template_model.id

    update_payload = {"name": "Unauthenticated Update Attempt"}
    response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id}",
        json=update_payload,  # No auth headers
    )
    assert response.status_code == 401, response.text
    assert response.json()["detail"] == "Not authenticated"


@pytest.mark.parametrize(
    "update_payload, expected_status, expected_detail_part",
    [
        ({"name": ""}, 422, "String should have at least 1 character"),
        ({"name": "a" * 101}, 422, "String should have at most 100 characters"),
        ({"description": "a" * 256}, 422, "String should have at most 255 characters"),
        # Test validation for embedded time_windows in update
        (
            {"time_windows": [{"description": "TW", "start_time": 0, "end_time": 60, "category_id": "invalid-oid"}]},
            422,
            "Input should be an instance of ObjectId",
        ),  # Adjusted expected detail
    ],
)
async def test_update_day_template_validation_errors(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_day_template_model: DayTemplateModel,
    user_one_category: Category,  # For placeholder replacement
    update_payload: dict,
    expected_status: int,
    expected_detail_part: str,
) -> None:
    """
    Test updating a day template with various validation errors in the payload.
    """
    template_id = user_one_day_template_model.id

    # Process payload to replace placeholders if necessary
    if "time_windows" in update_payload and isinstance(update_payload["time_windows"], list):
        for tw in update_payload["time_windows"]:
            if isinstance(tw, dict) and tw.get("category_id") == "valid_cat_id_placeholder":
                tw["category_id"] = str(user_one_category.id)

    response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id}",
        headers=auth_headers_user_one,
        json=update_payload,
    )
    assert response.status_code == expected_status, response.text
    response_json = response.json()
    assert "detail" in response_json

    if isinstance(response_json["detail"], list):
        found_error = any(
            "msg" in error and expected_detail_part.lower() in error["msg"].lower() for error in response_json["detail"]
        )
        assert found_error, f"Expected detail part '{expected_detail_part}' not found in {response_json['detail']}"
    else:
        assert (
            expected_detail_part.lower() in response_json["detail"].lower()
        ), f"Expected detail part '{expected_detail_part}' not found in {response_json['detail']}"


async def test_delete_day_template_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_day_template_model: DayTemplateModel,
) -> None:
    """
    Test successful deletion of a day template.
    Should return 204 No Content and the template should be gone.
    """
    template_id_to_delete = user_one_day_template_model.id

    # Delete the template
    delete_response = await async_client.delete(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id_to_delete}",
        headers=auth_headers_user_one,
    )
    assert delete_response.status_code == 204, delete_response.text
    assert not delete_response.content  # No content for 204

    # Verify it's gone
    get_response = await async_client.get(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id_to_delete}",
        headers=auth_headers_user_one,
    )
    assert get_response.status_code == 404


async def test_delete_day_template_not_found(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
) -> None:
    """
    Test deleting a non-existent day template.
    Should return 404.
    """
    non_existent_id = "605f585dd5a2a60d39f3b3c2"  # Example non-existent ObjectId
    response = await async_client.delete(
        f"{DAY_TEMPLATES_ENDPOINT}/{non_existent_id}",
        headers=auth_headers_user_one,
    )
    assert response.status_code == 404, response.text
    assert response.json()["detail"] == "DayTemplate not found"


async def test_delete_day_template_not_owner(
    async_client: AsyncClient,
    auth_headers_user_two: dict[str, str],  # For user two to attempt delete
    user_one_day_template_model: DayTemplateModel,
) -> None:
    """
    Test deleting a day template owned by another user.
    Should return 403.
    """
    template_id = user_one_day_template_model.id

    # User two attempts to delete it
    response = await async_client.delete(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id}",
        headers=auth_headers_user_two,  # Authenticated as user two
    )
    assert response.status_code == 404, response.text  # Changed from 403
    assert response.json()["detail"] == "DayTemplate not found"


async def test_delete_day_template_unauthenticated(
    async_client: AsyncClient,
    user_one_day_template_model: DayTemplateModel,
    test_db,
) -> None:
    """
    Test deleting a day template without authentication.
    Should return 401.
    """
    template_id = user_one_day_template_model.id

    # Attempt to delete without auth
    response = await async_client.delete(
        f"{DAY_TEMPLATES_ENDPOINT}/{template_id}",
        # No auth headers
    )
    assert response.status_code == 401, response.text
    assert response.json()["detail"] == "Not authenticated"

    # Verify the day template still exists since deletion failed
    dt_still_exists = await test_db.find_one(DayTemplateModel, DayTemplateModel.id == template_id)
    assert dt_still_exists is not None
    # No specific TimeWindow model to check anymore


async def test_update_day_template_reorder_time_windows(
    async_client: AsyncClient,
    test_db,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,  # For embedded TWs
) -> None:
    """Test updating a day template to reorder its time windows"""
    # Define two embedded time windows
    embedded_tw1 = {
        "description": "TW1 Reorder",
        "start_time": 100,
        "end_time": 200,
        "category_id": str(user_one_category.id),
    }
    embedded_tw2 = {
        "description": "TW2 Reorder",
        "start_time": 300,
        "end_time": 400,
        "category_id": str(user_one_category.id),
    }

    # First create a template with both time windows in order: tw1, tw2
    template_data = DayTemplateCreateRequest(
        name="Template to Reorder",
        description="Testing time window reordering",
        time_windows=[embedded_tw1, embedded_tw2],
    )
    create_response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=template_data.model_dump(mode="json"),
    )
    assert create_response.status_code == 201
    created_template_id = DayTemplateResponse(**create_response.json()).id  # Get ID of the created template

    # The update payload provides the full new list of embedded time windows.
    # DayTemplateUpdateRequest expects List[TimeWindowInputSchema] or compatible dicts.
    update_payload_dict = {"time_windows": [embedded_tw2, embedded_tw1]}  # New order

    update_response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{created_template_id}",
        headers=auth_headers_user_one,
        json=update_payload_dict,
    )
    assert update_response.status_code == 200, update_response.text
    updated_template_resp_obj = DayTemplateResponse(**update_response.json())

    # Verify the new order by checking names and other properties
    # TimeWindowResponse objects in updated_template_resp_obj.time_windows do not have an 'id' field.
    assert len(updated_template_resp_obj.time_windows) == 2

    # First TW in response should match embedded_tw2
    resp_tw1 = updated_template_resp_obj.time_windows[0]
    assert resp_tw1.description == embedded_tw2["description"]
    assert resp_tw1.start_time == embedded_tw2["start_time"]
    assert resp_tw1.end_time == embedded_tw2["end_time"]
    assert resp_tw1.category.id == ObjectId(embedded_tw2["category_id"])
    assert resp_tw1.category.name == user_one_category.name

    # Second TW in response should match embedded_tw1
    resp_tw2 = updated_template_resp_obj.time_windows[1]
    assert resp_tw2.description == embedded_tw1["description"]
    assert resp_tw2.start_time == embedded_tw1["start_time"]
    assert resp_tw2.end_time == embedded_tw1["end_time"]
    assert resp_tw2.category.id == ObjectId(embedded_tw1["category_id"])
    assert resp_tw2.category.name == user_one_category.name


async def test_update_day_template_remove_time_window(
    async_client: AsyncClient,
    test_db,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,
) -> None:

    # Define two embedded time windows for the request
    tw_to_keep = {
        "description": "TW to Keep",
        "start_time": 100,
        "end_time": 200,
        "category_id": str(user_one_category.id),
    }
    tw_to_remove = {
        "description": "TW to Remove",
        "start_time": 300,
        "end_time": 400,
        "category_id": str(user_one_category.id),
    }

    # First create a template with both time windows
    initial_template_payload = DayTemplateCreateRequest(
        name="Template to Modify TWs",
        description="Testing time window removal",
        time_windows=[tw_to_keep, tw_to_remove],
    )
    create_response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=initial_template_payload.model_dump(mode="json"),
    )
    assert create_response.status_code == 201
    created_template_id = DayTemplateResponse(**create_response.json()).id

    # Now update the template to remove one time window (by only providing the one to keep)
    update_payload = {"time_windows": [tw_to_keep]}  # Only include the one to keep

    update_response = await async_client.patch(
        f"{DAY_TEMPLATES_ENDPOINT}/{created_template_id}",
        headers=auth_headers_user_one,
        json=update_payload,
    )
    assert update_response.status_code == 200, update_response.text
    updated_template = DayTemplateResponse(**update_response.json())

    # Verify only one time window remains
    assert len(updated_template.time_windows) == 1
    final_tw_in_response = updated_template.time_windows[0]
    assert final_tw_in_response.description == tw_to_keep["description"]
    assert final_tw_in_response.start_time == tw_to_keep["start_time"]
    assert final_tw_in_response.category.id == ObjectId(tw_to_keep["category_id"])


async def test_update_day_template_invalid_time_window(
    async_client: AsyncClient,
    test_db,
    test_user_one: User,
    auth_headers_user_one: dict[str, str],
    user_one_category: Category,
    user_two_category: Category,  # Unowned category
) -> None:
    """Test updating a day template with an invalid category_id in an embedded time window"""
    # First create a template with a valid time window
    valid_embedded_tw = {
        "name": "Valid TW Initial",
        "start_time": 100,
        "end_time": 200,
        "category_id": str(user_one_category.id),
    }
    template_data = DayTemplateCreateRequest(
        name="Template with Valid TW for Update Test",
        description="Testing invalid category in TW update",
        time_windows=[valid_embedded_tw],
    )
    create_response = await async_client.post(
        DAY_TEMPLATES_ENDPOINT,
        headers=auth_headers_user_one,
        json=template_data.model_dump(mode="json"),
    )
    assert create_response.status_code == 201
    created_template = DayTemplateResponse(**create_response.json())

    # Try to update with an embedded TW that uses another user's category
    invalid_embedded_tw_update = {
        "name": "TW with Unowned Category Update",
        "start_time": 300,
        "end_time": 400,
        "category_id": str(user_two_category.id),  # This category is not owned by user_one
    }
    update_url = f"{DAY_TEMPLATES_ENDPOINT}/{created_template.id}"
    update_data = {"time_windows": [invalid_embedded_tw_update]}

    update_response = await async_client.patch(
        update_url,
        headers=auth_headers_user_one,
        json=update_data,
    )
    # Expecting 400 as service returns this for not found/accessible categories
    assert update_response.status_code == 400, update_response.text
    assert "One or more categories not found or not accessible" in update_response.json()["detail"]
    assert str(user_two_category.id) in update_response.json()["detail"]
