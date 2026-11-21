---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development (TDD)

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing. Violating the letter of the rules violates the spirit.

**Always use for:** New features, bug fixes, refactoring, behavior changes.
**Exceptions (ask human partner first):** Throwaway prototypes, generated code, configuration files.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote code before the test? **Delete it and start over.** Do not keep it as reference, adapt it, or look at it.

## Red-Green-Refactor

1. **RED — Write Failing Test:**
   - One minimal test per behavior, clear behavior-focused name, real code (mocks only when unavoidable).
   - Follow [writing-good-tests.md](writing-good-tests.md): name the production change that would make the test fail before writing it; assert real behavior, not mock behavior; keep test-only helpers out of production code; understand side effects before mocking.
2. **Verify RED (MANDATORY):**
   - Run the test command (`npm test <path>` / `pytest` / etc.).
   - Confirm: test fails (not syntax/import error), failure message matches the missing feature.
   - Passes immediately? You're testing existing behavior — fix the test.
3. **GREEN — Minimal Code:**
   - Write the simplest code to pass the test (strictly YAGNI — no extra options, features, or premature refactors).
4. **Verify GREEN (MANDATORY):**
   - Run tests and confirm: target test passes, all other tests pass, output is pristine (no warnings/errors).
   - Fails? Fix production code, not the test.
5. **REFACTOR — Clean Up:**
   - Only after green: remove duplication, improve names, extract helpers. Keep all tests green; add no new behavior.
6. **Repeat** for the next behavior/requirement.

## Red Flags — STOP and Start Over

- Production code written before test, or tests added "later"
- Test passes immediately without implementation
- Can't explain why the test failed
- Keeping pre-written code "as reference" or adapting it
- Rationalizing "just this once", "too simple", or "spirit not ritual"

| Common Excuse | Reality |
|---|---|
| "Too simple to test" | Simple code breaks; test takes 30s. |
| "I'll test after" | Tests-after pass immediately and prove nothing; biased by implementation. |
| "Already manually tested" | Manual tests aren't repeatable or comprehensive. |
| "Deleting X hours is wasteful" | Sunk cost fallacy; untested code is untrusted code. |
| "TDD slows me down" | Prevents regressions and production debugging. |

## Verification Checklist

- [ ] Every new function/behavior has a test that failed first for the expected reason
- [ ] Wrote minimal code to pass; no unrequested features
- [ ] Full relevant test suite passes with pristine output
- [ ] Real code tested (mocks only if unavoidable); edge cases and errors covered

## When Stuck & Debugging

| Problem | Solution |
|---|---|
| Don't know how to test | Write wished-for API and assertion first; ask human partner. |
| Test too complicated / huge setup | Simplify the interface or extract helpers. |
| Must mock everything | Code is too coupled — use dependency injection. |

**Bug fixes:** Always write a failing test reproducing the bug first, then follow Red-Green-Refactor. Never fix bugs without a regression test.

## Final Rule

```
Production code → test exists and failed first
Otherwise → not TDD (no exceptions without human partner's permission)
```
