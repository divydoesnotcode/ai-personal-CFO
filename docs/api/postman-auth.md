# Auth API — Postman collection notes

Base URL for local development:

```text
http://localhost:8000
```

Start the backend first:

```bash
docker compose up -d postgres
source .venv/bin/activate
alembic upgrade head
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

All bodies are JSON. Do **not** send passwords in query strings.

---

## Shared headers

Use these on every request unless noted.

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |

Optional after sign-in:

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer <token>` |

The sign-in response also sets an HTTP-only cookie named `cfo_access_token`. In Postman, enable **Settings → General → Automatically follow redirects** and keep cookies for `localhost`. Cookie auth is enough for `GET /api/auth/me` if the cookie is stored; otherwise send the Bearer header.

---

## 1. Sign up — success

**Request**

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/signup`

**Headers**

```http
Content-Type: application/json
Accept: application/json
```

**Body (raw JSON)**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Expected**

- Status: `201 Created`
- Body:

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "USER_UUID",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

`data` never includes a password or hash. Email is stored lowercase.

Postman test snippet:

```javascript
pm.test("signup created the user", function () {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.success).to.eql(true);
  pm.expect(body.data).to.not.have.property("password");
  pm.expect(body.data).to.not.have.property("password_hash");
  pm.collectionVariables.set("userEmail", body.data.email);
  pm.collectionVariables.set("userId", body.data.id);
});
```

---

## 2. Sign up — duplicate email

Repeat request 1 with the same email.

**Expected**

- Status: `409 Conflict`

```json
{
  "success": false,
  "message": "An account with this email already exists"
}
```

Email matching is case-insensitive (`John@Example.com` also conflicts).

---

## 3. Sign up — invalid payload

**Body**

```json
{
  "name": "",
  "email": "not-an-email",
  "password": "short"
}
```

**Expected**

- Status: `422 Unprocessable Entity`
- FastAPI validation envelope:

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "name"],
      "msg": "Value error, Enter your full name"
    }
  ]
}
```

Password rules: at least 8 characters, at least one letter, at least one number.

---

## 4. Sign in — success

**Request**

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/signin`

**Headers**

```http
Content-Type: application/json
Accept: application/json
```

**Body**

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Expected**

- Status: `200 OK`
- Set-Cookie: `cfo_access_token=<jwt>; HttpOnly; Path=/; SameSite=Lax`
- Body:

```json
{
  "success": true,
  "message": "Signed in successfully",
  "data": {
    "user": {
      "id": "USER_UUID",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "AUTH_TOKEN"
  }
}
```

Save the token as a Postman collection variable:

```javascript
pm.test("signin returned a token", function () {
  pm.response.to.have.status(200);
  const body = pm.response.json();
  pm.expect(body.success).to.eql(true);
  pm.expect(body.data.token).to.be.a("string");
  pm.collectionVariables.set("accessToken", body.data.token);
});
```

---

## 5. Sign in — wrong password

**Body**

```json
{
  "email": "john@example.com",
  "password": "WrongPassword123"
}
```

**Expected**

- Status: `401 Unauthorized`

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

The response does not say that the email exists.

---

## 6. Sign in — unknown email

**Body**

```json
{
  "email": "nobody@example.com",
  "password": "SecurePassword123"
}
```

**Expected**

- Status: `401 Unauthorized`

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

Same message as a wrong password.

---

## 7. Sign in — invalid payload

**Body**

```json
{
  "email": "not-an-email",
  "password": ""
}
```

**Expected**

- Status: `422 Unprocessable Entity`

---

## 8. Current user — Bearer token

**Request**

- Method: `GET`
- URL: `{{baseUrl}}/api/auth/me`

**Headers**

```http
Accept: application/json
Authorization: Bearer {{accessToken}}
```

In Postman:

```http
Authorization: Bearer {{accessToken}}
```

**Expected**

- Status: `200 OK`

```json
{
  "success": true,
  "message": "Authenticated",
  "data": {
    "id": "USER_UUID",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

## 9. Current user — cookie only

If Postman stored `cfo_access_token` from sign-in, send:

- Method: `GET`
- URL: `{{baseUrl}}/api/auth/me`
- Headers: `Accept: application/json`
- No Authorization header

**Expected:** `200` with the same body as request 8.

---

## 10. Current user — missing / bad token

`GET {{baseUrl}}/api/auth/me` with no cookie and no Bearer header, or with `Authorization: Bearer not-a-token`.

**Expected**

- Status: `401 Unauthorized`

```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

## Postman environment

| Variable | Example |
| --- | --- |
| `baseUrl` | `http://localhost:8000` |
| `accessToken` | set by the sign-in test script |
| `userEmail` | `john@example.com` |
| `userId` | set by the signup test script |

Import order: create environment → run signup → run duplicate signup → run signin → run `/me`.

Frontend pages that call these APIs:

- Sign up: `http://localhost:3000/signup`
- Sign in: `http://localhost:3000/signin`
