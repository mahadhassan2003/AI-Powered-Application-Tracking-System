import sqlite3
import os

def migrate_database():
    # Database is in Backend directory
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ats_local.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    print(f"Connecting to database at {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Add proposed_time column
        print("Adding proposed_time column to interviews table...")
        cursor.execute("ALTER TABLE interviews ADD COLUMN proposed_time DATETIME")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("proposed_time column already exists, skipping...")
        else:
            print(f"Error adding proposed_time: {e}")
            raise e

    try:
        # Add reschedule_reason column
        print("Adding reschedule_reason column to interviews table...")
        cursor.execute("ALTER TABLE interviews ADD COLUMN reschedule_reason VARCHAR(1000)")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("reschedule_reason column already exists, skipping...")
        else:
            print(f"Error adding reschedule_reason: {e}")
            raise e

    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate_database()
