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
