import asyncio
import asyncpg
from app.core.config import settings

async def create_database():
    """
    Connects to the default 'postgres' database and creates the target 'recilink'
    database if it does not already exist on the server.
    """
    print(f"Connecting to PostgreSQL server at {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}...")
    try:
        # Establish connection to standard default 'postgres' database
        conn = await asyncpg.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            database="postgres"
        )
        
        # Check if target database exists
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", 
            settings.POSTGRES_DB
        )
        
        if not exists:
            # CREATE DATABASE must be executed outside of any transaction blocks
            await conn.execute(f'CREATE DATABASE "{settings.POSTGRES_DB}"')
            print(f"Database '{settings.POSTGRES_DB}' created successfully!")
        else:
            print(f"Database '{settings.POSTGRES_DB}' already exists on this server.")
            
        await conn.close()
    except Exception as e:
        print(f"\n[ERROR] Connection failed: {e}")
        print("-" * 60)
        print("Please verify that:")
        print("1. Your PostgreSQL server is running.")
        print(f"2. The password in 'backend/.env' matches your database password.")
        print("-" * 60)

if __name__ == "__main__":
    asyncio.run(create_database())
