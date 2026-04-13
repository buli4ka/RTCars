---
description: Run TypeScript type check and ESLint on both backend and frontend. Reports all type errors and lint violations.
allowed-tools: Bash(npx *) Bash(npm *)
---

Run TypeScript type checks and ESLint on the full RTCars codebase.

## Steps

Run all checks and collect results:

**Backend — TypeScript:**
```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/backend && npx tsc --noEmit
```

**Backend — ESLint:**
```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/backend && npx eslint "src/**/*.ts"
```

**Frontend — TypeScript:**
```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/frontend && npx tsc --noEmit
```

**Frontend — ESLint:**
```bash
cd /Users/andrewbuli4ka/work/personal/RTCars/frontend && npx eslint "src/**/*.{ts,tsx}"
```

## Reporting

After all checks run, report:

1. **Backend TS errors** — file:line, error message
2. **Backend lint errors** — file:line, rule name
3. **Frontend TS errors** — file:line, error message
4. **Frontend lint errors** — file:line, rule name
5. **Summary** — total error count per section, or "All clear ✓"

Identify root causes before listing cascading errors — often one wrong type or missing import generates dozens of downstream errors. Fix root causes first.
