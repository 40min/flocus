import json
import logging
import os
from datetime import datetime

from bson import ObjectId
from pymongo import MongoClient

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load settings from config.py (assuming it's in a parent directory or accessible via PYTHONPATH)
try:
    from app.core.config import settings
except ImportError:
    logger.error("Could not import settings. Make sure 'app.core.config' is accessible.")
    exit(1)


class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)


def backup_database():
    backup_dir = settings.BACKUP_DIRECTORY
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    collections_to_backup = ["users", "tasks", "categories", "day_templates", "daily_plans"]

    try:
        logger.info(f"MongoClient type: {type(MongoClient)}")  # Debugging line
        client = MongoClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DATABASE_NAME]
        logger.info(f"Connected to MongoDB database: {settings.MONGODB_DATABASE_NAME}")

        for collection_name in collections_to_backup:
            output_file = os.path.join(backup_dir, f"{collection_name}_{timestamp}.jsonl")
            try:
                collection = db[collection_name]
                count = 0
                with open(output_file, "w") as f:
                    for document in collection.find():
                        f.write(json.dumps(document, cls=CustomEncoder) + "\n")
                        count += 1
                logger.info(f"Successfully backed up {count} documents from '{collection_name}' to {output_file}")
            except Exception as e:
                logger.error(f"Error backing up collection '{collection_name}': {e}")

        client.close()
        logger.info("Database backup completed.")

    except Exception as e:
        logger.error(f"Database backup failed: {e}")


if __name__ == "__main__":
    backup_database()
