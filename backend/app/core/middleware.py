from fastapi import Request, Response
from fastapi.responses import JSONResponse
import logging
import traceback

logger = logging.getLogger(__name__)

async def error_handling_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"message": str(e)},
        )