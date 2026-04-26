# KDD Document Review & Validation Prompt Framework
### *KDD: OAuth2 Implementation — Forum Presentation Review*

> **How to use this file:**
> Paste your KDD document content beneath each prompt and work through them in order.
> Use the status tags at the bottom to annotate your findings.
> This framework is designed to be run before any Architecture Review Forum.

---

## 📌 PROMPT 1 — Document Completeness & Missing Points

Review the KDD document in full and identify any missing sections or gaps.
Specifically check for the presence of the following and flag anything absent:

- [ ] **Problem Statement / Context** — Is it clearly defined?
- [ ] **Decision Made** — Is the final decision explicitly stated?
- [ ] **Decision Owner** — Is a named individual or team listed?
- [ ] **Date of Decision** — Is a decision date recorded?
- [ ] **Alternatives Considered** — Are at least 2–3 options listed with pros/cons?
- [ ] **Rationale** — Is there a clear explanation of WHY this option was chosen?
- [ ] **Assumptions** — Are all assumptions underpinning the decision listed?
- [ ] **Dependencies** — Are upstream/downstream dependencies identified?
- [ ] **Risks & Mitigations** — Are known risks documented with mitigation plans?
- [ ] **Impact Assessment** — Does it cover security, performance, scalability impact?
- [ ] **Stakeholders & Sign-off** — Are reviewers, approvers, and informed parties listed?
- [ ] **Next Steps / Action Items** — Are follow-up actions with owners and dates present?
- [ ] **References** — Are relevant RFCs, standards, or prior decisions linked?

**Commenting Convention:**
> ⚠️ MISSING: `[section name]` — Required because `[reason]`.

---

## ✏️ PROMPT 2 — Sharpness & Clarity of Content

Read through the KDD document and identify areas that are vague, ambiguous,
or underdeveloped. For each section, assess:

1. Is the language precise or does it use general terms like **"should"**, **"might"**, **"could"** without commitment?
2. Are there statements that lack supporting evidence or data?
3. Are technical decisions backed by benchmarks, PoC results, or documented research?
4. Are there any sections where the reasoning feels incomplete or rushed?

**For each issue found, provide:**

| Field | Detail |
|-------|--------|
| 📍 **Location** | Section name or paragraph reference |
| ❌ **Issue** | What is weak or unclear |
| ✅ **Recommendation** | What should be added or reworded to sharpen it |

---

## 🎯 PROMPT 3 — Outcome Clarity

Evaluate whether the KDD document has a clear, measurable, and actionable outcome.
Check for the following:

1. Is the expected outcome of implementing this decision explicitly stated?
2. Is the outcome **measurable**? *(e.g. "Token expiry reduced to 15 mins" vs "improve security")*
3. Is there a **definition of success** or acceptance criteria?
4. Does the document state what changes in system behaviour are expected post-implementation?
5. Is there a **rollback plan** or fallback strategy if the decision proves incorrect?
6. Is a **timeline or milestone** for the outcome defined?

**Flag outcome statements as follows:**

| Status | Comment |
|--------|---------|
| Too broad | 🔴 **VAGUE OUTCOME:** Needs a measurable success criterion. |
| Missing entirely | 🔴 **NO OUTCOME DEFINED:** Add expected result with metrics. |
| Well defined | ✅ **CLEAR OUTCOME:** Meets standard. |

---

## 👥 PROMPT 4 — Stakeholder Understandability

Assess whether the KDD document is understandable by **ALL** intended stakeholders,
including both technical and non-technical readers
*(e.g. Product Owners, Business Analysts, Security Leads, Architects, Developers).*

Check for:

1. Is there an **executive summary or TL;DR** section for non-technical readers?
2. Does the document assume too much prior knowledge without explanation?
3. Are **diagrams, flowcharts, or sequence diagrams** used where helpful?
   *(e.g. OAuth2 Authorization Code Flow diagram)*
4. Is the document structured logically — does it flow from **problem → options → decision → outcome**?
5. Would a non-technical stakeholder understand **why this decision matters to the business**?

**For each concern, comment:**

> 🟡 **ACCESSIBILITY ISSUE:** `[What is hard to understand and for whom]`
> ✅ **Suggestion:** `[How to make it clearer for that audience]`

---

## 🔤 PROMPT 5 — Abbreviations & Terminology Check

Scan the **entire** KDD document and list every abbreviation, acronym, and
technical term used. For each one, verify:

1. Is it **defined or expanded** on first use?
2. Is there a **glossary section** at the end of the document?
3. Could it be **misinterpreted** by a non-technical stakeholder?

**Flag accordingly:**

> 🔴 **UNDEFINED ABBREVIATION:** `"[TERM]"` — First appears in `[section]`.
> Add definition: `"[Full form + brief explanation]."`

> 🟡 **JARGON RISK:** `"[TERM]"` — May confuse non-technical readers.
> Suggest plain-language alternative or footnote.

**OAuth2-specific abbreviations to check:**

| Abbreviation | Full Form |
|---|---|
| JWT | JSON Web Token |
| PKCE | Proof Key for Code Exchange |
| SSO | Single Sign-On |
| IdP | Identity Provider |
| SP | Service Provider |
| OIDC | OpenID Connect |
| RBAC | Role-Based Access Control |
| ABAC | Attribute-Based Access Control |
| MFA | Multi-Factor Authentication |
| TLS | Transport Layer Security |
| RFC | Request for Comments |
| aud | Audience claim in JWT |
| Bearer Token | Token type used in Authorization header |
| Access Token | Short-lived token granting resource access |
| Refresh Token | Long-lived token to obtain new access tokens |
| Authorization Code Flow | OAuth2 flow for user-facing apps |
| Client Credentials Flow | OAuth2 flow for machine-to-machine |
| Introspection | Token validation via authorisation server |
| Scopes | Permissions requested by a client |
| Claims | Assertions made within a JWT |

---

## 📖 PROMPT 6 — Full Document Read-Through & Recommendations

Perform a full end-to-end read of the KDD document as if you are a
**senior architect presenting it in a formal Architecture Review Forum.**
After reading, produce a structured recommendation report covering the sections below.

---

### SECTION A — Overall Assessment

- **Overall quality rating:** `[ Poor / Needs Work / Acceptable / Strong ]`
- **Is this document ready for forum presentation?** `[ Yes / No / Conditional ]`
- **Key strengths of the document:**
  - *(List here)*
- **Top 3 critical gaps that must be fixed before the forum:**
  1. *(Gap 1)*
  2. *(Gap 2)*
  3. *(Gap 3)*

---

### SECTION B — Required Inputs Before Forum

List any information that is currently missing but **MUST** be provided
before this KDD can be formally reviewed and approved:

| # | Missing Input | Who Should Provide It |
|---|---------------|-----------------------|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |

---

### SECTION C — Recommended Improvements

For each section of the document, provide a specific recommendation:

| Section Name | Recommendation |
|---|---|
| Problem Statement | *(e.g. Add business impact context)* |
| Alternatives Considered | *(e.g. Include cost/complexity comparison table)* |
| Rationale | *(e.g. Reference PoC results or security review findings)* |
| Risks & Mitigations | *(e.g. Add token leakage and replay attack scenarios)* |
| Impact Assessment | *(e.g. Include performance benchmarks for token validation)* |
| Next Steps | *(e.g. Assign owners and add target dates)* |
| *(Add more rows as needed)* | |

---

### SECTION D — Forum Readiness Checklist

- [ ] Document has been **peer-reviewed** by at least one other architect
- [ ] All alternatives have been documented with **honest trade-offs**
- [ ] **Security implications** have been reviewed by the security team
- [ ] All stakeholders have been given **review access** prior to the forum
- [ ] Presenter can confidently answer: *"Why not [alternative X]?"*
- [ ] Decision can be summarised in **one clear sentence**
- [ ] All **abbreviations are defined** on first use or in a glossary
- [ ] **Diagrams** are included to illustrate the OAuth2 flow
- [ ] **Action items** post-approval are clearly assigned with owners and dates
- [ ] A **rollback or contingency plan** is documented

---

## 🚦 Quick Reference — Review Status Tags

| Tag | Meaning |
|-----|---------|
| ✅ **CLEAR** | Section is complete and well-written |
| 🟡 **NEEDS SHARPENING** | Present but weak — improve before forum |
| 🔴 **MISSING** | Not present — must be added before forum |
| ⚠️ **RISK** | Potential issue that needs discussion in the forum |
| 💡 **RECOMMENDATION** | Suggested improvement to strengthen the document |

---

## 📝 Notes & Reviewer Comments

*Use this section to capture free-form notes during your review.*

| # | Reviewer | Section | Comment | Status |
|---|----------|---------|---------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

*Document prepared for: Architecture Review Forum*
*KDD Reference: OAuth2 Implementation*
*Review Framework Version: 1.0*
*Date: April 2026*
