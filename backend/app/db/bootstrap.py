from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


USER_COLUMN_MIGRATIONS = [
    ("email_integration_mode", "ALTER TABLE users ADD COLUMN email_integration_mode VARCHAR(20) DEFAULT 'disabled'"),
    ("email_imap_host", "ALTER TABLE users ADD COLUMN email_imap_host VARCHAR(255)"),
    ("email_imap_port", "ALTER TABLE users ADD COLUMN email_imap_port INTEGER DEFAULT 993"),
    ("email_imap_username", "ALTER TABLE users ADD COLUMN email_imap_username VARCHAR(255)"),
    ("email_imap_password", "ALTER TABLE users ADD COLUMN email_imap_password TEXT"),
    ("email_imap_mailbox", "ALTER TABLE users ADD COLUMN email_imap_mailbox VARCHAR(255) DEFAULT 'INBOX'"),
    ("email_imap_use_ssl", "ALTER TABLE users ADD COLUMN email_imap_use_ssl BOOLEAN DEFAULT TRUE"),
    ("email_imap_search", "ALTER TABLE users ADD COLUMN email_imap_search VARCHAR(255) DEFAULT 'UNSEEN'"),
    ("email_smtp_host", "ALTER TABLE users ADD COLUMN email_smtp_host VARCHAR(255)"),
    ("email_smtp_port", "ALTER TABLE users ADD COLUMN email_smtp_port INTEGER DEFAULT 465"),
    ("email_smtp_username", "ALTER TABLE users ADD COLUMN email_smtp_username VARCHAR(255)"),
    ("email_smtp_password", "ALTER TABLE users ADD COLUMN email_smtp_password TEXT"),
    ("email_smtp_use_ssl", "ALTER TABLE users ADD COLUMN email_smtp_use_ssl BOOLEAN DEFAULT TRUE"),
    ("email_smtp_from", "ALTER TABLE users ADD COLUMN email_smtp_from VARCHAR(255)"),
]


def ensure_runtime_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    if "users" not in set(inspector.get_table_names()):
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as connection:
        for column_name, statement in USER_COLUMN_MIGRATIONS:
            if column_name not in columns:
                connection.execute(text(statement))
