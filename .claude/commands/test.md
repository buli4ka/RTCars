---
description: Run tests for backend, frontend, or both. Pass a scope to narrow down (e.g. /test backend, /test frontend, /test vehicles.service).
allowed-tools: Bash(npm *) Bash(npx *)
---

Run tests. Scope: **$ARGUMENTS**

## Logic

If `$ARGUMENTS` is empty or `all` → run both backend and frontend tests.  
If `$ARGUMENTS` is `backend` → run backend tests only.  
If `$ARGUMENTS` is `frontend` → run frontend tests only.  
Otherwise treat `$ARGUMENTS` as a test name pattern and run:
```bash
cd backend && npm run test -- --testPathPattern="$ARGUMENTS"
```

## Commands

**Backend unit tests:**
```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/backend && npm run test
```

**Backend with coverage:**
```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/backend && npm run test:cov
```

**Backend E2E:**
```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/backend && npm run test:e2e
```

**Frontend tests:**
```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/frontend && npm run test
```

## Reporting

After tests complete:
1. Pass/fail count per suite
2. Failed tests: test name + error message + file:line
3. Coverage summary (if run with `:cov`)
4. If failures exist: identify root cause and suggest the fix
