print("Testing imports...")

try:
    import flask
    print("Flask imported successfully")
except Exception as e:
    print(f"Error importing Flask: {e}")

try:
    import flask_sqlalchemy
    print("Flask-SQLAlchemy imported successfully")
except Exception as e:
    print(f"Error importing Flask-SQLAlchemy: {e}")

try:
    import apscheduler
    print("APScheduler imported successfully")
except Exception as e:
    print(f"Error importing APScheduler: {e}")

try:
    from datetime import datetime
    print("datetime imported successfully")
except Exception as e:
    print(f"Error importing datetime: {e}")

print("Import test complete")
