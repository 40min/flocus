from app.api.schemas.user import UserCreateRequest, UserResponse, UserUpdateRequest
from app.db.models.user import User
from app.mappers.base_mapper import BaseMapper


class UserMapper(BaseMapper):
    _model_class = User

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

    @classmethod
    def apply_update_to_model(cls, user: User, schema: UserUpdateRequest) -> User:
        """Applies fields from a UserUpdateRequest to an existing User model."""
        update_data = schema.model_dump(exclude_unset=True)

        for field_name, value in update_data.items():
            if field_name in cls._nullable_fields or field_name in cls._non_nullable_fields:
                if field_name == "preferences":
                    # Handle preferences separately to merge updates
                    if schema.preferences:
                        prefs_update_data = schema.preferences.model_dump(exclude_unset=True)
                        for key, val in prefs_update_data.items():
                            setattr(user.preferences, key, val)
                else:
                    setattr(user, field_name, value)

        return user
