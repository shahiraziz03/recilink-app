from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Import project settings to get DATABASE_URL from .env
from app.core.config import settings
# Import Base so Alembic knows about all our models/tables
from app.models.user import Base

# Alembic Config object — provides access to values in alembic.ini
config = context.config

# Set up Python logging using the config in alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# This tells Alembic which tables to track for --autogenerate
# Add new model imports here as your project grows
target_metadata = Base.metadata

def get_url():
    """
    Build the synchronous database URL for Alembic.
    We replace asyncpg with psycopg2 because Alembic does not
    support async drivers — it runs migrations synchronously.
    """
    return settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg2")

def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode (without a live DB connection).
    This generates SQL scripts instead of applying them directly.
    Useful for reviewing changes before applying to production.
    """
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode (with a live DB connection).
    This is the default mode used during development.
    Changes are applied directly to the database.
    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

# Alembic checks which mode to run in and calls the appropriate function
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()