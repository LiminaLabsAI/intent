# API Reference: Flow REST API

Flow exposes a programmatically accessible REST API allowing external applications, CLI tools, and automated agents to submit and manage intents, query the registry, and trigger the lifecycle processing pipeline.

---

## Authentication

All programmatic API endpoints require authentication using an API Key. You can provide your key in one of two ways:

1.  **Bearer Token (Recommended)**: Set the `Authorization` header.
    ```http
    Authorization: Bearer <YOUR_API_KEY>
    ```
2.  **Custom Header**: Set the `x-api-key` header.
    ```http
    x-api-key: <YOUR_API_KEY>
    ```

### Pre-seeded API Keys (Local Dev)
For rapid local testing, you can use these pre-seeded development keys:
*   **Admin User** (Sarah Chen): `key_admin_sarah`
*   **Reviewer User** (Marcus Rivera): `key_reviewer_marcus`
*   **End User** (Alex Johnson): `key_user_alex`

---

## Endpoints

### 1. Submit a New Intent
Create a new intent in the system in `DRAFT` state.

*   **URL**: `POST /api/intents`
*   **Headers**: 
    *   `Content-Type: application/json`
    *   `x-api-key: <API_KEY>`
*   **Payload**:
    ```json
    {
      "rawInput": "Create a new database migration file adding a status column to intents table",
      "priority": "MEDIUM"
    }
    ```
    *   `priority` options: `"LOW"`, `"MEDIUM"`, `"HIGH"`
*   **Response (`200 OK`)**:
    ```json
    {
      "id": "cmrd1abcde0001v0utcw...",
      "rawInput": "Create a new database migration file...",
      "priority": "MEDIUM",
      "status": "DRAFT",
      "currentStage": 1,
      "requesterId": "user_id_here",
      "createdAt": "2026-07-09T12:00:00.000Z"
    }
    ```

---

### 2. Trigger Intent Processing Pipeline
Trigger the 7-stage LLM-based processing pipeline. This endpoint streams progress events using Server-Sent Events (SSE).

*   **URL**: `POST /api/intents/[id]/process`
*   **Headers**:
    *   `x-api-key: <API_KEY>`
*   **Response (`200 OK` - SSE stream)**:
    Streams JSON objects representing stage progress, ending with `data: [DONE]`.
    *   **Format**: `data: {"stage": 2, "stageName": "Intent Parsing", "status": "completed", "data": {...}}`

---

### 3. Upload & Parse Document
Upload a document in any supported format (PDF, DOCX, TXT, MD, CSV, JSON) and extract its text content to be passed as raw intent text.

*   **URL**: `POST /api/intents/parse-document`
*   **Headers**:
    *   `x-api-key: <API_KEY>`
*   **Payload** (`multipart/form-data`):
    *   `file`: The document file bin/object.
*   **Response (`200 OK`)**:
    ```json
    {
      "text": "This is the extracted text content of the uploaded document...",
      "fileName": "requirements.pdf"
    }
    ```

---

### 4. Query Intent Registry
Fetch and filter intents. If authenticated as an `END_USER`, this will only return intents submitted by the requesting user.

*   **URL**: `GET /api/intents`
*   **Headers**:
    *   `x-api-key: <API_KEY>`
*   **Query Parameters**:
    *   `status` (optional): Filter by status (e.g. `APPROVED`, `UNDER_REVIEW`, `DRAFT`).
    *   `search` (optional): Full-text search raw input or standardized intents.
    *   `page` (optional): Defaults to `1`.
    *   `limit` (optional): Defaults to `20`.
*   **Response (`200 OK`)**:
    ```json
    {
      "intents": [ ... ],
      "total": 1,
      "page": 1,
      "limit": 20
    }
    ```

---

### 5. Retrieve Intent Details
Fetch the full lifecycle audit, stage transition logs, comments, and snapshot versions of an intent.

*   **URL**: `GET /api/intents/[id]`
*   **Headers**:
    *   `x-api-key: <API_KEY>`
*   **Response (`200 OK`)**:
    Returns the complete `Intent` object with nested `requester`, `reviewTasks`, `comments`, `versions`, and `auditLogs`.

---

### 6. Review Queue & Decisions

*   **Submit Review Decision**:
    *   **URL**: `POST /api/reviews/[id]/decide`
    *   **Headers**: `x-api-key: <API_KEY>` (Requires `ADMIN` or `REVIEWER` key)
    *   **Payload**:
        ```json
        {
          "decision": "AUTO_APPROVED",
          "notes": "Quality check passed, intent structure matches standards."
        }
        ```
        *   `decision` options: `"AUTO_APPROVED"`, `"NEEDS_CLARIFICATION"`, `"HUMAN_REVIEW_REQUIRED"`, `"CONDITIONAL_APPROVAL"`, `"REJECTED"`
    *   **Response (`200 OK`)**:
        ```json
        {
          "success": true,
          "status": "APPROVED"
        }
        ```
