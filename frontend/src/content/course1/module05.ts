import type { Module } from '../types'

export const module05: Module = {
  id: 'm05-backend',
  title: 'Backend Fundamentals with FastAPI',
  summary: 'HTTP, REST, your first FastAPI app, Pydantic models, errors, middleware, and secrets.',
  lessons: [
    {
      id: 'http-rest',
      title: 'What an API Is: HTTP & REST',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# HTTP: How Programs Talk

An **API** (Application Programming Interface) over the web is just an agreement: send an HTTP request shaped like *this*, get a response shaped like *that*. When your code calls OpenAI or Anthropic, it's doing exactly what a browser does — sending HTTP.

## Anatomy of a request

\`\`\`
POST /v1/messages HTTP/1.1          ← method + path
Host: api.anthropic.com             ← headers (metadata)
x-api-key: sk-ant-...
Content-Type: application/json

{"model": "claude-sonnet-5", ...}   ← body (the payload)
\`\`\`

## The verbs

| Method | Meaning | Body? | Idempotent? |
|---|---|---|---|
| GET | read data | no | yes |
| POST | create / trigger an action | yes | no |
| PUT | replace a resource entirely | yes | yes |
| PATCH | partially update | yes | usually |
| DELETE | remove | rarely | yes |

**Idempotent** = safe to repeat: sending the same GET twice changes nothing; sending the same POST twice might create two orders. This is why payment forms warn you not to refresh.

## Status codes — the response's first word

| Range | Meaning | Codes you'll actually meet |
|---|---|---|
| 2xx | success | 200 OK · 201 Created · 204 No Content |
| 4xx | *you* messed up | 400 Bad Request · 401 Unauthorized · 403 Forbidden · 404 Not Found · 422 Unprocessable · 429 Too Many Requests |
| 5xx | *the server* messed up | 500 Internal Error · 502 Bad Gateway · 503 Unavailable |

Memorize 401 vs 403: **401 = who are you?** (bad/missing credentials) vs **403 = I know who you are, and no** (valid credentials, insufficient rights). And 429 — you *will* meet it the first day you loop over an LLM API.

## REST in one paragraph

REST is a convention for arranging endpoints around **resources** (nouns) manipulated by the verbs above: \`GET /users\` lists users, \`POST /users\` creates one, \`GET /users/42\` reads one, \`DELETE /users/42\` removes it. URLs name things, methods act on them — no \`/getUserData\` or \`/doDelete\` verbs in paths.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-http',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'A request with a valid API key tries to access an admin-only endpoint. Correct status code?',
                choices: ['400', '401', '403', '404'],
                answerIndex: 2,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Which method should `create a new user` use, RESTfully?',
                choices: ['`GET /createUser`', '`POST /users`', '`PUT /users`', '`POST /users/new`'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'short',
                id: 'q3',
                prompt: 'Which status code means "you are being rate-limited"? (number)',
                acceptableAnswers: ['429'],
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'A 5xx status code means…',
                choices: [
                  'The client sent something invalid',
                  'The server failed while handling a possibly-valid request',
                  'The request succeeded with a warning',
                  'The resource moved',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'first-fastapi',
      title: 'Your First FastAPI App',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# FastAPI

FastAPI is a modern Python web framework built on type hints and asyncio. You're literally using it right now — this app's backend is FastAPI. Install and run:

\`\`\`bash
pip install fastapi uvicorn
uvicorn main:app --reload        # uvicorn = the ASGI server that runs your app
\`\`\`

The smallest real app:

\`\`\`python
# main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "hello"}        # dicts auto-serialize to JSON

@app.get("/items/{item_id}")           # path parameter
async def read_item(item_id: int, q: str | None = None):   # q = query param
    return {"item_id": item_id, "q": q}
\`\`\`

Notice what the **type hints do**: \`item_id: int\` makes FastAPI parse and validate the path segment — \`GET /items/abc\` is rejected with a 422 *before your code runs*. Parameters not in the path (\`q\`) automatically become query parameters (\`/items/5?q=hello\`).

Visit \`/docs\` and FastAPI gives you interactive Swagger documentation for free, generated from your code. This is why type hints aren't optional style points in FastAPI — they're the API contract.

## Request bodies with Pydantic

For POST bodies, declare the shape as a Pydantic model:

\`\`\`python
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1)
    temperature: float = Field(default=0.7, ge=0, le=2)   # ge/le = bounds

@app.post("/chat")
async def chat(req: ChatRequest):
    return {"echo": req.prompt, "temp": req.temperature}
\`\`\`

Send \`{"prompt": "", "temperature": 9}\` and FastAPI responds **422** with a precise machine-readable list of what's wrong — no validation code written by you. Pydantic models are the single most important FastAPI concept: they are simultaneously documentation, validation, and parsing.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-fastapi1',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'In `async def read_item(item_id: int)`, what does the `int` annotation cause?',
                choices: [
                  'Nothing — hints are ignored at runtime',
                  'FastAPI parses/validates the path segment and returns 422 on failure',
                  'Python raises TypeError automatically anywhere in the code',
                  'The parameter becomes optional',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'What is uvicorn?',
                choices: [
                  'A database',
                  'The ASGI server that actually runs your FastAPI app',
                  'A Python package manager',
                  'FastAPI’s template engine',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'A request body fails Pydantic validation. The client receives…',
                choices: ['200 with `null`', '500 Internal Server Error', '422 with details about each invalid field', '404'],
                answerIndex: 2,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'In `/items/5?q=hello`, `q` is a…',
                choices: ['path parameter', 'query parameter', 'header', 'body field'],
                answerIndex: 1,
                difficulty: 1,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-route-logic',
            title: 'Route handler logic',
            instructions: `
You can't run a web server inside this exercise box — but handler *logic* is just functions, which is
the point: keep logic separable from the framework.

Write \`paginate(items, page, per_page)\` — the logic behind \`GET /items?page=2&per_page=10\`:

- Pages are 1-indexed
- Return a dict: \`{"items": <that page's slice>, "page": page, "total_pages": <ceil of len/per_page>}\`
- If \`page < 1\` or \`per_page < 1\`, raise \`ValueError\` (FastAPI would turn this into a 4xx)
- A page past the end returns an empty items list (but still correct metadata)
`,
            starterCode: `import math

def paginate(items, page, per_page):
    ...
`,
            tests: [
              {
                name: 'first page',
                code: 'r = paginate(list(range(10)), 1, 3)\nassert r == {"items": [0,1,2], "page": 1, "total_pages": 4}',
              },
              {
                name: 'last ragged page',
                code: 'r = paginate(list(range(10)), 4, 3)\nassert r["items"] == [9]',
              },
              { name: 'past the end', code: 'assert paginate([1,2], 5, 2)["items"] == []' },
              {
                name: 'invalid input raises',
                code: 'try:\n    paginate([1], 0, 5)\n    assert False\nexcept ValueError:\n    pass',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'errors-middleware',
      title: 'Errors, Middleware & Secrets',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Failing Well

## HTTPException — deliberate error responses

\`\`\`python
from fastapi import HTTPException

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = db.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
\`\`\`

Raising \`HTTPException\` anywhere in a handler short-circuits into a clean JSON error response. For app-wide error shapes, register an **exception handler** that converts your own exception types into consistent responses — this app's backend converts every \`ProviderError\` into \`{"error": {"type": ..., "message": ...}}\` that way.

## Middleware — code around every request

Middleware wraps the whole request/response cycle. Logging, timing, and CORS all live here:

\`\`\`python
import time

@app.middleware("http")
async def add_timing(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)             # run the actual handler
    response.headers["X-Process-Time"] = str(time.perf_counter() - start)
    return response
\`\`\`

**CORS** deserves a mention because every frontend developer hits it: browsers block JS on origin A from reading responses from origin B unless B's server sends permission headers. FastAPI's \`CORSMiddleware\` sets those headers — it's why this app's backend lists the dev frontend origin explicitly.

## Environment variables & secrets

API keys **never** go in source code. They live in the process environment:

\`\`\`python
import os

api_key = os.environ.get("OPENAI_API_KEY")   # None if unset
if not api_key:
    raise RuntimeError("Set OPENAI_API_KEY")
\`\`\`

\`\`\`bash
# .env file (add to .gitignore!)
OPENAI_API_KEY=sk-...
\`\`\`

Rules that prevent real disasters:

1. \`.env\` goes in \`.gitignore\` **before** the first commit — keys pushed to GitHub get scraped by bots within minutes.
2. Never log secrets, never echo them back in error messages.
3. Different keys for dev and prod, rotate on any suspicion of leak.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-errors-mw',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'What does raising `HTTPException(status_code=404, detail="...")` in a handler do?',
                choices: [
                  'Crashes the server with a 500',
                  'Returns a clean 404 JSON response to the client',
                  'Retries the request',
                  'Logs the error and returns 200',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Middleware runs…',
                choices: [
                  'Only when a handler raises',
                  'Around every request, before and/or after the handler',
                  'Once at server startup',
                  'Only for POST requests',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Why do API keys belong in environment variables instead of code?',
                choices: [
                  'Environment variables are faster to read',
                  'Code gets committed and shared — secrets in it leak; env vars stay on the machine',
                  'Python cannot store strings that start with "sk-"',
                  'It is required by HTTP',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'CORS errors in the browser mean…',
                choices: [
                  'The server is down',
                  'The server did not send headers permitting your origin to read the response',
                  'Your JSON is malformed',
                  'The API key is wrong',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'm05-checkpoint',
      title: 'Checkpoint: API Design',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# 🏁 Module 5 Checkpoint

You know HTTP verbs and status codes, FastAPI routing, Pydantic validation, error handling, middleware, and secret hygiene. This checkpoint has a design quiz plus a validation exercise that mirrors what Pydantic does under the hood — so you understand what the framework is doing *for* you.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-5',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'RESTfully, "fetch todo #7" is…',
                choices: ['`POST /getTodo {"id": 7}`', '`GET /todos/7`', '`GET /todos?action=fetch&id=7`', '`FETCH /todos/7`'],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Your LLM-proxy endpoint calls a provider that takes ~4s. Why must the handler use `await` with an async HTTP client?',
                choices: [
                  'Sync calls are not allowed in Python web servers',
                  'So the server can serve other requests during those 4 seconds instead of blocking the event loop',
                  'Because await makes the provider respond faster',
                  'To avoid CORS errors',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'A client sends `{"temperature": "hot"}` where a float 0–2 was declared in the Pydantic model. What happens?',
                choices: [
                  'The handler runs with temperature="hot"',
                  'FastAPI returns 422 before the handler runs',
                  'The server returns 500',
                  'The value silently becomes 0.0',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'You accidentally committed your `.env` with a live API key, then deleted it in the next commit. What now?',
                choices: [
                  'Nothing — the delete removed it',
                  'Rotate/revoke the key immediately: git history (and scrapers) still have it',
                  'Rename the file so bots can’t find it',
                  'Add .gitignore retroactively; that scrubs history',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-checkpoint-5',
            title: 'Checkpoint: request validator',
            instructions: `
Build the validation layer for a chat endpoint by hand (what Pydantic automates).

Write \`validate_chat_request(data)\` where data is a dict. Rules:
- \`"prompt"\`: required, must be a non-empty string after stripping
- \`"temperature"\`: optional, defaults to 0.7; must be an int/float with 0 ≤ t ≤ 2
- \`"max_tokens"\`: optional, defaults to 256; must be an int with 1 ≤ n ≤ 4096

Return a **list of error strings** (empty list = valid). Each error should name the offending field
(e.g. \`"prompt: required"\`, \`"temperature: out of range"\` — exact wording up to you, but it must
contain the field name).
`,
            starterCode: `def validate_chat_request(data):
    errors = []
    ...
    return errors
`,
            tests: [
              {
                name: 'valid request',
                code: 'assert validate_chat_request({"prompt": "hi", "temperature": 1.0, "max_tokens": 100}) == []',
              },
              {
                name: 'defaults are fine',
                code: 'assert validate_chat_request({"prompt": "hi"}) == []',
              },
              {
                name: 'missing prompt',
                code: 'errs = validate_chat_request({})\nassert len(errs) == 1 and "prompt" in errs[0]',
              },
              {
                name: 'empty prompt',
                code: 'errs = validate_chat_request({"prompt": "   "})\nassert len(errs) == 1 and "prompt" in errs[0]',
              },
              {
                name: 'temperature bounds',
                code: 'errs = validate_chat_request({"prompt": "x", "temperature": 3})\nassert len(errs) == 1 and "temperature" in errs[0]',
              },
              {
                name: 'max_tokens type',
                code: 'errs = validate_chat_request({"prompt": "x", "max_tokens": "many"})\nassert len(errs) == 1 and "max_tokens" in errs[0]',
              },
              {
                name: 'multiple errors reported together',
                code: 'errs = validate_chat_request({"temperature": -1, "max_tokens": 0})\nassert len(errs) == 3',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
