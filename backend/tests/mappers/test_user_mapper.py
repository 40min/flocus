import pytest
from odmantic import ObjectId

from app.api.schemas.user import UserCreateRequest, UserPreferencesUpdateSchema, UserResponse, UserUpdateRequest
from app.db.models.user import User, UserPreferences
from app.mappers.user_mapper import UserMapper


@pytest.fixture
def sample_user_model() -> User:
    return User(
        id=ObjectId(),
        username="testuser",
        email="test@example.com",
        first_name="Test",
        last_name="User",
        hashed_password="hashed_password_value",
        preferences=UserPreferences(
            pomodoro_timeout_minutes=10,
            pomodoro_working_interval=30,
            system_notifications_enabled=False,
        ),
    )


def test_to_response(sample_user_model: User):
    response = UserMapper.to_response(sample_user_model)

    assert isinstance(response, UserResponse)
    assert response.id == sample_user_model.id
    assert response.username == sample_user_model.username
    assert response.email == sample_user_model.email
    assert response.first_name == sample_user_model.first_name
    assert response.last_name == sample_user_model.last_name
    assert response.preferences.pomodoro_timeout_minutes == 10
    assert response.preferences.pomodoro_working_interval == 30
    assert response.preferences.system_notifications_enabled is False


def test_to_model_for_create():
    schema = UserCreateRequest(
        username="newuser",
        email="new@example.com",
        first_name="New",
        last_name="User",
        password="plain_password",
    )

    model = UserMapper.to_model_for_create(schema)

    assert isinstance(model, User)
    assert model.username == schema.username
    assert model.email == schema.email
    assert model.first_name == schema.first_name
    assert model.last_name == schema.last_name
    # The service layer is responsible for hashing, mapper just passes it through
    assert model.hashed_password == "plain_password"
    # Check default preferences are created
    assert isinstance(model.preferences, UserPreferences)
    assert model.preferences.pomodoro_timeout_minutes == 5


def test_apply_update_to_model_full_update(sample_user_model: User):
    update_schema = UserUpdateRequest(
        email="updated@example.com",
        first_name="UpdatedFirst",
        last_name="UpdatedLast",
        preferences=UserPreferencesUpdateSchema(
            pomodoro_timeout_minutes=15,
            system_notifications_enabled=True,
        ),
    )

    updated_model = UserMapper.apply_update_to_model(sample_user_model, update_schema)

    assert updated_model.email == "updated@example.com"
    assert updated_model.first_name == "UpdatedFirst"
    assert updated_model.last_name == "UpdatedLast"
    # Preferences check
    assert updated_model.preferences.pomodoro_timeout_minutes == 15
    assert updated_model.preferences.pomodoro_working_interval == 30  # Unchanged
    assert updated_model.preferences.system_notifications_enabled is True
    # Password should not be touched by this mapper method
    assert updated_model.hashed_password == "hashed_password_value"


def test_apply_update_to_model_partial_update(sample_user_model: User):
    update_schema = UserUpdateRequest(first_name="PartialUpdate")

    updated_model = UserMapper.apply_update_to_model(sample_user_model, update_schema)

    assert updated_model.first_name == "PartialUpdate"
    assert updated_model.email == "test@example.com"  # Unchanged
    assert updated_model.last_name == "User"  # Unchanged


def test_apply_update_to_model_partial_preferences_update(sample_user_model: User):
    update_schema = UserUpdateRequest(preferences=UserPreferencesUpdateSchema(pomodoro_working_interval=45))

    updated_model = UserMapper.apply_update_to_model(sample_user_model, update_schema)

    assert updated_model.preferences.pomodoro_timeout_minutes == 10  # Unchanged
    assert updated_model.preferences.pomodoro_working_interval == 45  # Changed
    assert updated_model.preferences.system_notifications_enabled is False  # Unchanged


def test_apply_update_to_model_ignores_password(sample_user_model: User):
    update_schema = UserUpdateRequest(password="new_plain_password")

    updated_model = UserMapper.apply_update_to_model(sample_user_model, update_schema)

    # The mapper method should NOT change the hashed_password. The service does that.
    assert updated_model.hashed_password == "hashed_password_value"
