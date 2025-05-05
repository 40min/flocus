# Backend Setup Instructions

## Environment Setup

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

## Installation

1.  **Install dependencies using Poetry:**

    ```bash
    poetry install
    ```

## Running the Server

1.  **Run the FastAPI server:**

    ```bash
    poetry run uvicorn app.main:app --reload
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