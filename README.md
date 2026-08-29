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

```bash
cd vehicle-backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
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
python manage.py test api
```

There's also a functional smoke test that hits a running server directly and checks real request/response behavior — registration, login, RBAC-restricted vehicle CRUD, and booking flows:

```bash
python manage.py runserver                    # in one terminal
python scripts/functional_smoke_test.py       # in another
```

## Known limitations

- CORS is wide open (`CORS_ALLOW_ALL_ORIGINS`) for local development — tighten this before deploying anywhere public.
- The SQLite database file isn't committed (it holds real password hashes); use the fixture above to get sample vehicle data on a fresh clone instead.
- No CI pipeline yet — tests are run manually.

## Author

**Haardik Mago**
[GitHub](https://github.com/Haardik11) · [LinkedIn](https://www.linkedin.com/in/haardik-mago-637972157)
