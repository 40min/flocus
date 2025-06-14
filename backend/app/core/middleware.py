import logging
import traceback

from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    EmailAlreadyExistsException,
    ForbiddenException,
    InvalidCredentialsException,
    InvalidTokenException,
    TaskCategoryMismatchException,
    UsernameAlreadyExistsException,
    UserNotFoundException,
    UserServiceException,
)

logger = logging.getLogger(__name__)


async def error_handling_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except UserNotFoundException as e:
        logger.info(f"UserNotFoundException: {e.detail}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": e.detail},
        )
    except (UsernameAlreadyExistsException, EmailAlreadyExistsException) as e:
        logger.info(f"{e.__class__.__name__}: {e.detail}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": e.detail},
        )
    except (InvalidTokenException, InvalidCredentialsException) as e:
        logger.info(f"{e.__class__.__name__}: {e.detail}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": e.detail},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ForbiddenException as e:
        logger.info(f"ForbiddenException: {e.detail}")
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": e.detail},
        )
    except TaskCategoryMismatchException as e:
        logger.info(f"TaskCategoryMismatchException: {e.detail}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": e.detail},
        )
    except UserServiceException as e:
        logger.error(f"Unhandled UserServiceException: {e.detail}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": e.detail},
        )
    except Exception as e:
        logger.error(f"Unhandled error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal Server Error"},
        )
