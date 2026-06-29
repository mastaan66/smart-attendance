# University Attendance Service Roadmap

Updated: 2026-06-29

## Product position

Treat this system as an attendance evidence service, not an automated disciplinary decision-maker. A biometric match, QR token, or GPS reading is evidence that can be wrong or spoofed. Students must have an accessible non-biometric path and a documented correction and appeal process.

## Completed in the first production-hardening tranche

- Public signup can create only student accounts; teacher and administrator privilege escalation was removed.
- Institution creation requires a service-owner onboarding token, a university-domain administrator email, and a 12-character minimum password.
- The cosmetic face-login step, hidden bypass, insecure legacy JWT endpoint, and unconfigured Google provider were removed.
- Student-to-class enrollment is persisted and scoped by tenant; students see only active enrollments.
- Only the owning teacher can issue a rotating session code. Check-in requires active enrollment.
- Attendance writes are idempotent with a database uniqueness constraint on student and session.
- Statistics use all eligible completed sessions since enrollment, so missing attendance records count as absences.
- PostgreSQL, Redis, required secrets, migrations, dependency security updates, and deployment configuration now agree.
- The production build, Prisma schema, TypeScript check, Compose configuration, and rotating-token tests are validated.

## Release gates before any real-student pilot

### 1. Biometric safety and alternatives

- Add standards-based presentation-attack detection and liveness testing. Do not market the current single-image verification as liveness detection.
- Encrypt biometric templates with a dedicated key-management service, rotate keys, and separate template identifiers from academic identity records.
- Define template retention, deletion, re-enrollment, breach response, and verified data-subject request workflows.
- Offer an equally usable non-biometric check-in route, such as a supervised one-time code or staff confirmation.
- Measure false match and false non-match rates by camera class, lighting, skin tone, disability/accessibility condition, and device tier before launch.

Exit evidence: documented threat model; independent presentation-attack test; approved privacy impact assessment; tested opt-out; deletion proof; subgroup error report.

### 2. Authoritative identity and roster lifecycle

- Replace the shared institution token with a service-owner approval workflow, verified domain ownership, expiring single-use invitation, and mandatory administrator MFA.
- Add teacher invitations; never allow public teacher or administrator self-registration.
- Integrate the university identity provider through OIDC or SAML and provision users through SCIM where available.
- Import terms, courses, sections, and enrollments from the student information system using OneRoster or a controlled CSV staging workflow.
- Make self-join codes optional and administrator-controlled; production enrollment must come from the authoritative roster.
- Add suspension, withdrawal, transfer, graduation, and account-recovery states.

Exit evidence: two-person institution approval; IdP test tenant; roster reconciliation report; orphan-account report; recovery runbook.

### 3. Attendance policy and auditability

- Model scheduled start/end, grace periods, late, partial, excused, absent, corrected, and voided states explicitly.
- Finish the presence state machine: check-in, signed periodic presence signals, checkout, network interruption handling, and server-side duration calculation.
- Add teacher correction and student appeal workflows with reason codes and immutable before/after audit events.
- Version attendance policies by institution, faculty, term, and course. Never recalculate historical records using a later policy without an explicit migration.
- Record who viewed, exported, corrected, or deleted attendance and biometric data.

Exit evidence: policy fixtures; concurrency tests; correction/appeal SLA; append-only audit export; dean and registrar sign-off.

### 4. Anti-spoofing without surveillance creep

- Replace typed rotating codes with an in-app QR scanner and bind the token to session, short time window, and a server nonce.
- Treat GPS as a weak signal because it can be spoofed and performs poorly indoors. Calibrate per room and provide a supervised fallback.
- Evaluate campus Wi-Fi assertions, BLE room beacons, or managed-device attestation only after privacy review; use the minimum combination needed.
- Detect impossible travel, rapid multi-device reuse, token sharing, and replay, then route anomalies to human review rather than auto-punishment.
- Store coarse verification outcomes where possible instead of raw location trails.

Exit evidence: replay/share test; indoor location false-rejection study; abuse-review playbook; documented data-minimization decision.

### 5. Operations, resilience, and security

- Add health/readiness endpoints, structured security logs, metrics, traces, alerting, and an on-call runbook.
- Run PostgreSQL with encrypted backups, point-in-time recovery, restore drills, high availability, and tenant-aware capacity limits.
- Run Redis with authentication/TLS and define fail-open versus fail-closed behavior for rate limits, streams, and caches.
- Package or contract the external ML service with a versioned API, health checks, model/version reporting, timeouts, and rollback.
- Add CI gates for lint, tests, migrations, dependency review, secret scanning, SAST, container scanning, and software bills of materials.
- Perform tenant-isolation, IDOR, rate-limit, session, file-export, and privilege-escalation penetration tests.

Exit evidence: load test at expected peak plus 2x; restore drill; dependency/SBOM report; external penetration-test closure; incident exercise.

## Pilot features

- Teacher roster with live confirmed/pending/failed counts and privacy-safe failure reasons.
- Student camera/permission preflight, QR scanner, clear retry guidance, and receipt with timestamp and appeal link.
- Registrar dashboard for enrollment reconciliation, corrections, policy versions, and audit export.
- Term calendar, holidays, room/timezone handling, recurring schedules, and automatic session lifecycle.
- Accessible responsive flows conforming to WCAG 2.2 AA, including keyboard, screen-reader, low-bandwidth, and no-camera alternatives.
- Notifications for low attendance and corrected records, with configurable channels and quiet hours.
- CSV/PDF exports generated asynchronously with authorization, watermarking, expiration, and export audit logs.

## Later platform work

- OneRoster, LTI, SCIM, OIDC/SAML, and signed webhook integrations.
- Multi-campus hierarchy, departments, programs, cross-listed sections, substitute teachers, and delegated administration.
- Privacy-preserving analytics with minimum cohort sizes, suppression, policy explanations, and no opaque risk scoring.
- Model registry, drift monitoring, threshold versioning, reproducible evaluation datasets, and controlled rollback.
- Native/offline-capable check-in only after conflict resolution, encrypted local queues, and device-loss behavior are specified.

## Research and evaluation plan

Before launch, preregister a pilot evaluation with the university ethics/privacy body. Participation in biometric evaluation must not affect grades or access. Compare biometric and non-biometric routes on:

- completion and retry time;
- false acceptance and false rejection;
- presentation-attack acceptance;
- geofence false rejection and indoor accuracy;
- accessibility completion rate;
- subgroup performance gaps with confidence intervals;
- help-desk and correction rates;
- student trust, perceived coercion, and opt-out usage;
- availability, peak latency, and recovery time.

Use a staged rollout: staff-only lab, consenting volunteer study, one-course shadow mode with no official decisions, limited pilot with manual reconciliation, then production review.

## Standards and primary references to track

- NIST Face Recognition Technology Evaluation, including demographic-effects reports: https://pages.nist.gov/frvt/html/frvt_demographics.html
- NIST AI Risk Management Framework: https://www.nist.gov/itl/ai-risk-management-framework
- NIST SP 800-63B digital identity guidance on biometrics and presentation-attack detection: https://pages.nist.gov/800-63-4/sp800-63b.html
- ISO/IEC 30107-3 presentation attack detection testing and reporting: https://www.iso.org/standard/79520.html
- India Ministry of Electronics and IT data-protection framework and official notifications: https://www.meity.gov.in/data-protection-framework
- GDPR Article 9 biometric special-category data, where applicable: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- W3C Web Content Accessibility Guidelines 2.2: https://www.w3.org/TR/WCAG22/
- 1EdTech OneRoster: https://www.1edtech.org/standards/oneroster
- OWASP Application Security Verification Standard: https://owasp.org/www-project-application-security-verification-standard/

## Recommended delivery sequence

1. Close all release gates and complete the non-biometric fallback.
2. Run a consented shadow-mode pilot and publish the evaluation results internally.
3. Integrate IdP and SIS rosters; remove public self-enrollment for official courses.
4. Complete operations, security testing, recovery, and support readiness.
5. Obtain university legal, privacy, accessibility, registrar, and information-security approval.
6. Launch a limited production term with daily reconciliation and a rollback plan.
