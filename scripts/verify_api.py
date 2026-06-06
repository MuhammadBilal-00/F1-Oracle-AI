import sys
sys.path.insert(0, ".")
from backend.main import app
print("FastAPI app loaded successfully")
print(f"Routes: {len(app.routes)}")
for route in app.routes:
    if hasattr(route, "path"):
        methods = getattr(route, "methods", {"-"})
        print(f"  {list(methods)[0] if methods else '-':6s} {route.path}")
