import json
import os
import shutil
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from bson import ObjectId


@pytest.fixture
def temp_backup_dir(tmp_path):
    """Fixture to create a temporary backup directory."""
    # This fixture now only provides the temporary path
    temp_path = str(tmp_path / "test_backups")
    os.makedirs(temp_path, exist_ok=True)
    yield temp_path
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def mock_mongo_client_and_backup_function(temp_backup_dir):
    """Fixture to mock MongoClient, patch BACKUP_DIRECTORY, and provide the backup_database function."""
    # Patch settings.BACKUP_DIRECTORY directly in the module where it's used
    with (
        patch("backend.scripts.backup_database.settings.BACKUP_DIRECTORY", new=temp_backup_dir),
        patch("backend.scripts.backup_database.MongoClient") as MockMongoClient,
    ):

        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_client.__getitem__.return_value = mock_db  # client[db_name]
        MockMongoClient.return_value = mock_client

        # Mock collections and their find methods
        mock_users_collection = MagicMock()
        mock_tasks_collection = MagicMock()
        mock_categories_collection = MagicMock()
        mock_day_templates_collection = MagicMock()
        mock_daily_plans_collection = MagicMock()

        mock_db.__getitem__.side_effect = {
            "users": mock_users_collection,
            "tasks": mock_tasks_collection,
            "categories": mock_categories_collection,
            "day_templates": mock_day_templates_collection,
            "daily_plans": mock_daily_plans_collection,
        }.get

        # Dummy data for collections
        mock_users_collection.find.return_value = [
            {
                "_id": ObjectId("60c72b2f9b1e8c001c8e4d1a"),
                "username": "testuser",
                "created_at": datetime(2023, 1, 1, 10, 0, 0),
            },
        ]
        mock_tasks_collection.find.return_value = [
            {
                "_id": ObjectId("60c72b2f9b1e8c001c8e4d1b"),
                "title": "Test Task",
                "status": "pending",
                "created_at": datetime(2023, 1, 2, 11, 0, 0),
            },
        ]
        mock_categories_collection.find.return_value = [
            {"_id": ObjectId("60c72b2f9b1e8c001c8e4d1c"), "name": "Work", "color": "#FF0000"},
        ]
        mock_day_templates_collection.find.return_value = [
            {"_id": ObjectId("60c72b2f9b1e8c001c8e4d1d"), "name": "Morning Routine", "time_windows": []},
        ]
        mock_daily_plans_collection.find.return_value = [
            {"_id": ObjectId("60c72b2f9b1e8c001c8e4d1e"), "date": datetime(2023, 1, 3, 0, 0, 0), "tasks": []},
        ]

        # Import backup_database and CustomEncoder AFTER all patches are applied
        from backend.scripts.backup_database import CustomEncoder, backup_database

        yield mock_client, backup_database, CustomEncoder


def test_backup_script_executes_successfully(temp_backup_dir, mock_mongo_client_and_backup_function):
    """Verify the backup script executes successfully without raising exceptions."""
    mock_client, backup_database, CustomEncoder = mock_mongo_client_and_backup_function
    try:
        backup_database()
        assert True  # If no exception is raised, the script executed successfully
    except Exception as e:
        pytest.fail(f"backup_database failed with an unexpected exception: {e}")


def test_timestamped_subdirectories_created(temp_backup_dir, mock_mongo_client_and_backup_function):
    """Verify timestamped subdirectories are created within the configured BACKUP_DIRECTORY."""
    mock_client, backup_database, CustomEncoder = mock_mongo_client_and_backup_function
    backup_database()

    # Check if the backup directory exists and contains files
    assert os.path.exists(temp_backup_dir)

    # Get list of files in the backup directory
    backup_files = os.listdir(temp_backup_dir)
    assert len(backup_files) > 0, "No backup files were created."

    # Check if files match the expected pattern (e.g., users_YYYYMMDD_HHMMSS.jsonl)
    # We need to extract the timestamp from one of the created files
    sample_file = backup_files[0]
    parts = sample_file.split("_")
    assert len(parts) >= 2, "Backup file name does not contain timestamp."

    timestamp_str = f"{parts[-2]}_{parts[-1].split('.')[0]}"  # e.g., 20231027_123456
    assert len(timestamp_str) == 15, "Timestamp format is incorrect."

    # Verify that all expected collection files exist with the same timestamp
    collections_to_backup = ["users", "tasks", "categories", "day_templates", "daily_plans"]
    for collection_name in collections_to_backup:
        expected_file = os.path.join(temp_backup_dir, f"{collection_name}_{timestamp_str}.jsonl")
        assert os.path.exists(expected_file), f"Backup file for {collection_name} not found: {expected_file}"


def test_backup_files_contain_valid_jsonl_and_serialized_fields(temp_backup_dir, mock_mongo_client_and_backup_function):
    """Verify backup files contain valid JSON objects with correctly serialized ObjectId and datetime fields."""
    mock_client, backup_database, CustomEncoder = mock_mongo_client_and_backup_function
    backup_database()

    collections_to_backup = ["users", "tasks", "categories", "day_templates", "daily_plans"]

    # Get the timestamp from a created file
    backup_files = os.listdir(temp_backup_dir)
    sample_file = backup_files[0]
    parts = sample_file.split("_")  # Add this line to define 'parts'
    timestamp_str = f"{parts[-2]}_{parts[-1].split('.')[0]}"  # Corrected line

    for collection_name in collections_to_backup:
        file_path = os.path.join(temp_backup_dir, f"{collection_name}_{timestamp_str}.jsonl")
        assert os.path.exists(file_path), f"File {file_path} does not exist."

        with open(file_path, "r") as f:
            for line_num, line in enumerate(f, 1):
                try:
                    data = json.loads(line)
                    assert isinstance(data, dict), f"Line {line_num} in {file_path} is not a valid JSON object."

                    # Check ObjectId serialization
                    if "_id" in data:
                        assert isinstance(
                            data["_id"], str
                        ), f"ObjectId in {file_path} line {line_num} not serialized as string."
                        # Attempt to convert back to ObjectId to ensure it's a valid ObjectId string
                        try:
                            ObjectId(data["_id"])
                        except Exception:
                            pytest.fail(
                                f"ObjectId '{data['_id']}' in {file_path} line {line_num} is not a valid ObjectId."
                            )

                    # Check datetime serialization (assuming 'created_at' or 'date' fields)
                    if "created_at" in data:
                        try:
                            datetime.fromisoformat(data["created_at"])
                        except ValueError:
                            pytest.fail(
                                f"datetime field 'created_at' in {file_path} line {line_num} not in ISO format."
                            )
                    if "date" in data:
                        try:
                            datetime.fromisoformat(data["date"])
                        except ValueError:
                            pytest.fail(f"datetime field 'date' in {file_path} line {line_num} not in ISO format.")

                except json.JSONDecodeError:
                    pytest.fail(f"Line {line_num} in {file_path} is not valid JSON.")
