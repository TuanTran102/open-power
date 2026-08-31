---
change_id: YYYYMMDDHHmmss-[change-slug]
domain: [domain-name]
type: delta
status: draft
created_at: YYYY-MM-DDTHH:mm:ssZ
---

# Delta Spec: [Domain/Feature Name]

## Overview
Specifies the exact delta requirements (Added, Modified, Removed) introduced by this change proposal.

---

### ADDED Requirements

#### Requirement: [New Requirement Name]
The system SHALL provide [description of new capability].

```markdown
### Scenario: [Scenario Name]
- **Given**: [Precondition]
- **When**: [Action or Event]
- **Then**: [Expected Outcome]
```

---

### MODIFIED Requirements

#### Requirement: [Modified Requirement Name]
- **Before**: [Original behavior or contract]
- **After**: [Updated behavior or contract]

```markdown
### Scenario: [Updated Scenario Name]
- **Given**: [Precondition]
- **When**: [Action or Event]
- **Then**: [Updated Expected Outcome]
```

---

### REMOVED Requirements

#### Requirement: [Removed Requirement Name]
- **Reason for Removal**: [Why this capability or endpoint is deprecated/removed]
- **Migration Path**: [Alternative approach for clients]
