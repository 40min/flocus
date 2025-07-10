from app.api.schemas.user import UserCreateRequest, UserResponse, UserUpdateRequest
from app.db.models.user import User


class UserMapper:
    @staticmethod
    def to_response(user: User) -> UserResponse:
        """Maps a User model to a UserResponse schema."""
        return UserResponse.model_validate(user)

    @staticmethod
    def to_model_for_create(schema: UserCreateRequest) -> User:
        """
        Maps a UserCreateRequest schema to a User model instance for creation.
        The service is responsible for hashing the password.
        """
        user_dict = schema.model_dump()
        # The service will overwrite this with the real hash
        user_dict["hashed_password"] = user_dict.pop("password")
        return User(**user_dict)

    @staticmethod
    def apply_update_to_model(user: User, schema: UserUpdateRequest) -> User:
        """Applies fields from a UserUpdateRequest to an existing User model."""
        update_data = schema.model_dump(exclude_unset=True)

        if "email" in update_data:
            user.email = update_data["email"]
        if "first_name" in update_data:
            user.first_name = update_data["first_name"]
        if "last_name" in update_data:
            user.last_name = update_data["last_name"]

        if "preferences" in update_data and schema.preferences:
            prefs_update_data = schema.preferences.model_dump(exclude_unset=True)
            for key, value in prefs_update_data.items():
                if hasattr(user.preferences, key):
                    setattr(user.preferences, key, value)

        return user
