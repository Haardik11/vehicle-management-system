"""
Functional smoke test: fires real HTTP requests at a running instance of the
backend (default http://127.0.0.1:8000) and checks that each one returns the
status code a correctly-behaving API should return -- including requests that
are *supposed* to be rejected (wrong password, role without permission, etc).

Usage:
    python manage.py runserver
    (in another shell) python scripts/functional_smoke_test.py

Prints a pass/fail per request and a final success rate. Cleans up every
user/vehicle/booking it creates before exiting.
"""
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000/api"
results = []


def call(method, path, body=None, token=None, expect=None, label=""):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            payload = json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            payload = json.loads(e.read() or b"{}")
        except Exception:
            payload = {}
    ok = (status == expect)
    results.append((label, method, path, expect, status, ok))
    print(f"{'OK  ' if ok else 'FAIL'} {label:45s} expected={expect} got={status}")
    return status, payload


def get_token(username, password):
    _, payload = call("POST", "/token/", {"username": username, "password": password}, expect=200,
                       label=f"login as {username}")
    return payload.get("access")


created_usernames = []
created_vehicle_ids = []
created_booking_ids = []

# --- registration & auth ---
for i in range(5):
    uname = f"smoke_normal_{i}"
    created_usernames.append(uname)
    call("POST", "/register/", {"username": uname, "email": f"{uname}@example.com", "password": "SmokePass123!"},
         expect=201, label=f"register normal user #{i}")

_, dup_payload = call("POST", "/register/",
                       {"username": created_usernames[0], "email": "dup@example.com", "password": "SmokePass123!"},
                       expect=400, label="register duplicate username (should be rejected)")

call("POST", "/token/", {"username": created_usernames[0], "password": "WRONG_PASSWORD"},
     expect=401, label="login with wrong password (should be rejected)")

call("GET", "/vehicles/", expect=401, label="access vehicles without token (should be rejected)")

normal_tokens = [get_token(u, "SmokePass123!") for u in created_usernames]

# admin / call_center users need to be created directly since register forces 'normal'
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()
from api.models import User, Vehicle, Booking  # noqa: E402

admin_user, _ = User.objects.get_or_create(username="smoke_admin", defaults={"role": "admin"})
admin_user.set_password("SmokePass123!")
admin_user.role = "admin"
admin_user.save()
created_usernames.append("smoke_admin")

cc_user, _ = User.objects.get_or_create(username="smoke_cc", defaults={"role": "call_center"})
cc_user.set_password("SmokePass123!")
cc_user.role = "call_center"
cc_user.save()
created_usernames.append("smoke_cc")

admin_token = get_token("smoke_admin", "SmokePass123!")
cc_token = get_token("smoke_cc", "SmokePass123!")

# --- vehicle listing across roles ---
for role, tok in [("normal", normal_tokens[0]), ("admin", admin_token), ("call_center", cc_token)]:
    call("GET", "/vehicles/", token=tok, expect=200, label=f"list vehicles as {role}")

# --- vehicle create: allowed for admin/call_center, denied for normal ---
for i, (role, tok, expected) in enumerate([
    ("admin", admin_token, 201),
    ("call_center", cc_token, 201),
    ("normal", normal_tokens[1], 403),
    ("normal", normal_tokens[2], 403),
]):
    status, payload = call("POST", "/vehicles/", {
        "make": "SmokeMake", "model": "SmokeModel", "year": 2024,
        "chassis_number": f"SMOKECH{i}", "vehicle_type": "Sedan", "capacity": 5
    }, token=tok, expect=expected, label=f"create vehicle as {role}")
    if status == 201:
        created_vehicle_ids.append(payload["id"])

# --- vehicle update / delete permissions ---
if created_vehicle_ids:
    vid = created_vehicle_ids[0]
    call("PATCH", f"/vehicles/{vid}/", {"status": "Under Maintenance"}, token=admin_token,
         expect=200, label="update vehicle as admin")
    call("DELETE", f"/vehicles/{vid}/", token=normal_tokens[0], expect=403,
         label="delete vehicle as normal (should be rejected)")

# --- bookings: create + visibility ---
if created_vehicle_ids:
    target_vehicle = created_vehicle_ids[-1]
    status, payload = call("POST", "/bookings/", {
        "vehicle": target_vehicle, "pickup_location": "Smoke A",
        "drop_location": "Smoke B", "date": "2026-09-10"
    }, token=normal_tokens[0], expect=201, label="create booking as normal user")
    if status == 201:
        created_booking_ids.append(payload["id"])

    call("GET", "/bookings/", token=normal_tokens[1], expect=200,
         label="list bookings as different normal user (should only see own)")
    call("GET", "/bookings/", token=admin_token, expect=200,
         label="list bookings as admin (should see all)")

# --- cleanup ---
for bid in created_booking_ids:
    Booking.objects.filter(id=bid).delete()
for vid in created_vehicle_ids:
    Vehicle.objects.filter(id=vid).delete()
for uname in created_usernames:
    User.objects.filter(username=uname).delete()

total = len(results)
passed = sum(1 for r in results if r[5])
rate = (passed / total * 100) if total else 0
print(f"\n{passed}/{total} requests behaved as expected ({rate:.1f}% success rate)")
