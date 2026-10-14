from diagnostics import public_database_error


def test_connection_refused_is_described_without_host_or_password():
    message = 'connection to server at "172.21.0.3", port 15432 failed: Connection refused password=hunter2'
    description = public_database_error(RuntimeError(message))
    assert description == "connection refused"
    assert "172.21.0.3" not in description
    assert "hunter2" not in description


def test_missing_database_has_a_useful_safe_description():
    description = public_database_error(RuntimeError('FATAL: database "inventory" does not exist'))
    assert description == "database does not exist"
    assert "inventory" not in description


def test_unrecognized_driver_errors_do_not_leak_details():
    description = public_database_error(RuntimeError("private diagnostic detail"))
    assert description == "database query failed (RuntimeError)"
    assert "private diagnostic detail" not in description
