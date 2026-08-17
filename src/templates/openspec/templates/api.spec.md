# [API Service Name] Contract Specification

- **Base URL**: `/api/v1`
- **Protocol**: REST / JSON
- **Status**: Draft | In Review | Approved

---

## 1. Endpoints

### 1.1 `POST /resource`

**Description**: Create a new resource.

#### Request Headers
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

#### Request Body Schema
```json
{
  "title": "CreateResourceRequest",
  "type": "object",
  "properties": {
    "title": { "type": "string", "minLength": 1 },
    "description": { "type": "string" }
  },
  "required": ["title"]
}
```

#### Response (201 Created)
```json
{
  "id": "res_12345",
  "title": "Example Title",
  "createdAt": "2026-08-15T12:00:00Z"
}
```

#### Error Responses
- **400 Bad Request**: Validation error
- **401 Unauthorized**: Missing/invalid token
- **409 Conflict**: Resource already exists

---

## 2. Acceptance Criteria

### AC 1: Successful Resource Creation
- **Given**: A valid payload with `title`.
- **When**: A `POST /resource` request is sent.
- **Then**: Returns `201 Created` with resource details and generated `id`.

### AC 2: Missing Required Field
- **Given**: A payload missing the `title` field.
- **When**: A `POST /resource` request is sent.
- **Then**: Returns `400 Bad Request` with field validation errors.
