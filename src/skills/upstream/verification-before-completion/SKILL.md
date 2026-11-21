---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
---

# Verification Before Completion

**Core principle:** Evidence before claims, always. Violating the letter of this rule violates the spirit.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

Before claiming any status, completion, or satisfaction:
1. **IDENTIFY:** What command proves this claim?
2. **RUN:** Execute the FULL command (fresh, complete).
3. **READ:** Full output, exit code, failure count.
4. **VERIFY:** Confirm output supports the claim (if NO, state actual status with evidence; if YES, state claim WITH evidence).
5. **ONLY THEN:** Make the claim.

## Evidence Requirements

| Claim | Requires | Not Sufficient |
|---|---|---|
| Tests pass | Fresh test output: 0 failures | Previous run, "should pass" |
| Linter / Build clean | Fresh command output: exit 0 | Partial check, linter ≠ compiler |
| Bug fixed | Original symptom test passes | Code changed, assumed fixed |
| Regression test works | Red-green verified (fails without fix, passes with fix) | Passes once |
| Agent completed | VCS diff + independent verification | Agent reports "success" |
| Requirements met | Line-by-line spec/plan checklist verified | Tests passing alone |

## Red Flags — STOP

- Using "should", "probably", "seems to", or expressing satisfaction ("Great!", "Done!", "Perfect!") before verifying
- Committing, creating PRs, moving to next task, or delegating without fresh verification
- Trusting subagent success reports without checking VCS diff
- Relying on partial checks or rationalizing "just this once" / "I'm confident" / "spirit over letter"

## When To Apply

Always before any claim of completion, fix, pass, or satisfaction — including paraphrases and synonyms — and before committing, PR creation, or task handoff.
