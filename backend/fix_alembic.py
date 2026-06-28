from database import engine
from sqlalchemy import text

conn = engine.connect()
conn.execute(text("UPDATE alembic_version SET version_num = '765609b6549f'"))
conn.commit()
print("Fixed")