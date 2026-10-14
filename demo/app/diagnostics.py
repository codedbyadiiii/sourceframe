"""Safe, low-detail PostgreSQL error descriptions for demo logs and /health."""


def public_database_error(error: BaseException) -> str:
    """Return a useful error category without logging driver connection details."""
    message = str(error).lower()
    if "connection refused" in message:
        return "connection refused"
    if "does not exist" in message and "database" in message:
        return "database does not exist"
    if "password authentication failed" in message or "authentication failed" in message:
        return "database authentication failed"
    if "could not translate host name" in message or "name or service not known" in message:
        return "database hostname could not be resolved"
    if "timeout expired" in message or "timed out" in message:
        return "database connection timed out"
    return f"database query failed ({type(error).__name__})"
