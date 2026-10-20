# Vehicle Management System

A full-stack app for managing a small vehicle fleet — tracking vehicles, handling bookings, and giving different levels of access depending on who's logged in (admin, call-center staff, or a regular user).

Angular on the frontend, Django REST Framework on the backend, talking to each other over a JWT-secured REST API.

## What it does

- Admins and call-center staff can add, edit, and remove vehicles from the fleet
- Any logged-in user can browse available vehicles and book one for a date and time
- Call-center staff and admins can see and manage bookings across all users; regular users only see their own
- Role is baked into the JWT on login, and enforced on both ends — the API rejects unauthorized writes, and the Angular routes redirect anyone who doesn't have the right role

## Tech stack

**Frontend** — Angular 19 (standalone components, lazy-loaded routes), TypeScript, Tailwind CSS, PrimeNG, FullCalendar

**Backend** — Django 6 + Django REST Framework, SimpleJWT for authentication, django-cors-headers, django-filter

**Database** — SQLite. Fine for a project this size; would move to Postgres before deploying anywhere real.

## Project structure

```
vehicle-management-system/
├── src/app/
│   ├── pages/            # login, register, and the three role-based dashboards
│   ├── guards/            # route guards for auth + role checks
│   └── services/           # auth service, JWT interceptor
├── vehicle-backend/
│   ├── api/                 # models, views, permissions, serializers, tests
│   │   └── fixtures/          # sample vehicle data for seeding a fresh DB
│   ├── scripts/               # functional smoke test against a live server
│   └── core/                  # Django project settings
├── angular.json
└── package.json
```

## Running it locally

You'll need Node.js and Python 3.

**Backend**

Debug mode is off by default, and the server refuses to start without a secret key unless debug is on. For local development, turn debug on first:

```bash
cd vehicle-backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

# PowerShell:   $env:DJANGO_DEBUG = "true"
# macOS/Linux:  export DJANGO_DEBUG=true

python manage.py migrate
python manage.py loaddata api/fixtures/vehicles.json   # optional: seeds ~120 sample vehicles
python manage.py createsuperuser                         # gets the admin role automatically
python manage.py runserver
```

**Frontend**

```bash
npm install
npm start
```

The frontend runs at `http://localhost:4200` and calls the API at `http://127.0.0.1:8000/api/`.

## Roles

- **admin** — full access: manage vehicles, view and manage all bookings
- **call_center** — can manage vehicles and handle bookings on behalf of customers
- **normal** — the default role for anyone who signs up through the app; can browse vehicles and manage their own bookings

Signing up through the app always creates a `normal` account. Admin and call-center accounts are set up directly, either with `createsuperuser` or through the Django admin at `/admin/`.

## Testing

The backend has an automated test suite covering authentication, role permissions, and booking visibility:

```bash
cd vehicle-backend
python manage.py test api      # with DJANGO_DEBUG=true set, as above
```

There's also a functional smoke test that hits a running server directly and checks real request/response behavior — registration, login, RBAC-restricted vehicle CRUD, and booking flows:

```bash
python manage.py runserver                    # in one terminal
python scripts/functional_smoke_test.py       # in another
```

The smoke test logs in more often than the login limit allows (5 per minute), so start the server with higher limits for that run, for example `DJANGO_THROTTLE_TOKEN_RATE=1000/min DJANGO_THROTTLE_REGISTER_RATE=1000/hour`.

## Configuration

All settings that differ between development and production come from environment variables. `vehicle-backend/.env.example` lists them with placeholder values.

| Variable | Default | Notes |
|---|---|---|
| `DJANGO_DEBUG` | off | Set to `true` only for local development. |
| `DJANGO_SECRET_KEY` | none | Required whenever debug is off; the server will not start without it. |
| `DJANGO_ALLOWED_HOSTS` | `127.0.0.1,localhost` | Comma-separated. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200,http://127.0.0.1:4200` | Comma-separated. Ignored while debug is on, when all origins are allowed. |
| `DJANGO_SECURE_SSL_REDIRECT` | on (when debug is off) | Set to `false` if the host already redirects HTTP to HTTPS. |
| `DJANGO_THROTTLE_TOKEN_RATE` | `5/min` | Login attempts per client address. |
| `DJANGO_THROTTLE_REGISTER_RATE` | `10/hour` | Registrations per client address. |

With debug off, the app also sends HSTS headers and marks session and CSRF cookies as secure.

## Known limitations

- The SQLite database file isn't committed (it holds real password hashes); use the fixture above to get sample vehicle data on a fresh clone instead.
- CI runs tests on every push (see badge/workflow below), but there's no CD yet — deployment is still manual.

## Author

**Haardik Mago**
[GitHub](https://github.com/Haardik11) · [LinkedIn](https://www.linkedin.com/in/haardik-mago-637972157)
