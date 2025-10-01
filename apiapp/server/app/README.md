# AuthService Demo

## Setup

Copy `.env.example` to `.env` and fill in the variables:

```
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=fastapi-client
KEYCLOAK_CLIENT_SECRET=your-secret
CORS_ALLOW_ORIGINS=["http://localhost:3000"]
```

Install:

```bash
pip install -r requirements.txt
```

Run:

```bash
uvicorn api:app --reload
```

Swagger UI: http://localhost:8000/docs
