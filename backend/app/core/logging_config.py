import logging
import sys
from logging.handlers import RotatingFileHandler
from typing import Optional

from app.core.config import settings


def setup_logging(log_file: Optional[str] = None) -> None:
    """
    Configure the root logger with appropriate level, format, and handlers.

    Args:
        log_file: Optional path to a log file. If provided, logs will be written to this file
                 in addition to the console.
    """
    # Get log level from settings
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Create a formatter for structured logs
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove any existing handlers to avoid duplicate logs
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Add file handler if log_file is provided
    if log_file:
        file_handler = RotatingFileHandler(log_file, maxBytes=10 * 1024 * 1024, backupCount=5)  # 10 MB
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    # Log startup message
    logging.info(f"Logging configured with level: {settings.LOG_LEVEL}")
