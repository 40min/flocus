# Flocus Backend

This directory contains the Python/FastAPI backend application for the Personal Scheduler Application.

For an overview of the entire project, please see the main [README.md](../README.md:1).

## Setup Instructions

### Environment Setup

1.  **Create a virtual environment:**

    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```
2.  **Copy the `.env.example` file to `.env`:**

    ```bash
    cp .env.example .env
    ```
3.  **Update the `.env` file with your actual configuration values.**
    This includes settings for MongoDB connection, and optionally for LLM text improvement features.

    **LLM Configuration (Optional):**
    If you plan to use the LLM-based text improvement feature, configure the following:
    -   `LLM_PROVIDER`: Set to `"OpenAI"` or `"GoogleGemini"` (defaults to `"OpenAI"`). Determines which LLM service to use.
    -   `LLM_API_KEY`: Your API key for the chosen provider. This is required to use the feature.
    -   `LLM_TEXT_IMPROVEMENT_PROMPT`: (Optional) The default base prompt for text improvement actions. A default is provided in the application.
    -   `LLM_MODEL_NAME`: (Optional) Specify an exact model name for the chosen provider (e.g., "gpt-4", "gemini-1.5-pro"). If empty, a default model for the provider is used.

    Refer to the main project [README.md](../README.md#llm-text-improvement) for more details on these settings and the feature itself.

4.  **Set the `SECRET_KEY` environment variable:**
    The `SECRET_KEY` is crucial for securing the application and is a mandatory setting. The application will not start if it's not provided.
    You can generate a strong, random key using the following command:
    ```bash
    openssl rand -hex 32
    ```
    Add this key to your `.env` file:
    ```
    SECRET_KEY=your_generated_secret_key
    ```
## Installation

1.  **Install dependencies using Poetry:**

    ```bash
    uv sync
    ```

## Running the Server

1.  **Run the FastAPI server:**

    ```bash
    uv run uvicorn app.main:app --reload
    ```

## Accessing the API Documentation

1.  **Open your browser and navigate to:**

    ```
    http://localhost:8000/docs
    ```
    You can also access the Redoc documentation at:

    ```
    http://localhost:8000/redoc
    ```

## API Usage Examples

### Example: Get Users

```bash
curl http://localhost:8000/users/
```

### Example: Create User

```bash
curl -X POST -H "Content-Type: application/json" -d '{"email": "test@example.com", "first_name": "Test", "last_name": "User"}' http://localhost:8000/users/
```

## Database Backup

The `backend/scripts/backup_database.py` script is designed to create a backup of your MongoDB database. It connects to the database using the `MONGODB_URL` environment variable and saves a compressed archive of the database to a specified directory.

### Configuration

The backup script requires the `BACKUP_DIRECTORY` environment variable to be set. This variable specifies the absolute path where database backups will be stored.

Example in `.env` file:
```
BACKUP_DIRECTORY=/path/to/your/backup/location
```

**Security Note:** It is crucial to set strict filesystem permissions on your `BACKUP_DIRECTORY` to protect sensitive data. We recommend setting permissions to `700` (read, write, and execute for owner only) to prevent unauthorized access.

```bash
chmod 700 /path/to/your/backup/location
```

### Database Backup

To run the database backup script, execute the following command from the project root directory:

```bash
make backup-db
```

**Note:**
- Replace `/usr/bin/python` with the actual path to your Pythonexecutable if it's different.
- Ensure the path to `backup_database.py` is absolute.
- The `>> /var/log/flocus_backup.log 2>&1` part redirects both standard output and standard error to a log file, which is useful for monitoring backup operations.
