<!--
Sync Impact Report
==================
Version change: TEMPLATE → 1.0.0 (initial ratification)
Modified principles: n/a (first concrete adoption; placeholders replaced)
Added sections:
  - Core Principles I-V (Incremental & Atomic Delivery, Environment Parity via
    Containers, Test- & Quality-Gated Changes, Security by Default, Documentation
    as a Deliverable)
  - Technology & Modernization Constraints
  - Phase-Ordered Delivery Workflow
  - Governance
Removed sections: none (template placeholders only)
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (Constitution Check gates align with
    principles I-V; no edits required, generic placeholder already compatible)
  - .specify/templates/spec-template.md ✅ (no constitution-specific references)
  - .specify/templates/tasks-template.md ✅ (no constitution-specific references)
  - .specify/templates/commands/*.md ⚠ pending (no such directory found in this
    repo; re-check if/when command templates are added)
Follow-up TODOs: none
-->

# mk.js Modernization Constitution

## Core Principles

### I. Incremental & Atomic Delivery (NON-NEGOTIABLE)
Work MUST be committed in small, atomic, functionally-coherent increments spaced
out over time, with each commit mapped to a single concern or grading phase
(e.g., "add Dockerfile.dev with hot-reload", "add lint job to CI"). Batching
multiple phases — or an entire phase's worth of changes — into one commit near
the deadline is explicitly forbidden.
Rationale: `README.md` states the grading rubric directly penalizes commits
"realizados todos juntos na data de entrega"; atomic, time-spaced history is
itself graded evidence of process, not just a style preference.

### II. Environment Parity via Containers
Every runtime environment (development and production) MUST be defined as code
through Dockerfiles and `docker-compose.yml`. The development container MUST
support hot-reload (local code edits reflected immediately without a rebuild).
Production containers MUST use multi-stage builds on Alpine images, with Nginx
serving static assets and reverse-proxying the backend. No environment may rely
on undocumented local machine state — bringing the stack up MUST be possible
solely via the documented Docker/Compose commands.
Rationale: Phases 1, 2, and 8 of the rubric grade exactly this: a reproducible
dev container with hot-reload, a Compose stack with Postgres, and an optimized
multi-stage Alpine + Nginx production build.

### III. Test- & Quality-Gated Changes
A phase is not complete until its automated checks pass in CI: lint (front and
back), unit tests, fuzzing, and the SonarCloud quality gate. The pipeline MUST
fail the build on lint errors or test failures — gates MUST be enforced, not
advisory. For unit testing, the rubric requires a visible red→green sequence
(a commit where the new test fails in CI, followed by a commit where it passes
after the fix); this sequence MUST remain intact in history and MUST NOT be
squashed or rewritten away.
Rationale: Phases 3, 4, 5, and 7 explicitly grade CI enforcement of build/lint,
unit tests (including the failing→passing commit pair), fuzzing, and SonarCloud
coverage/quality metrics.

### IV. Security by Default (DevSecOps)
Dependencies MUST be kept current and scanned for known vulnerabilities (SCA,
e.g., `npm audit` or Snyk), and source code MUST be scanned with a SAST tool in
CI. Production deployments MUST minimize exposed network surface: Nginx MUST
redirect port 80 to 443, HTTPS MUST be provisioned via cert-manager, and no
ports other than 443 may be reachable from outside the container/cluster
network.
Rationale: Phases 6 and 10 grade SAST/SCA integration and network-level
security (HTTPS, port redirection, minimal exposure) as first-class deliverables,
not afterthoughts bolted on at the end.

### V. Documentation as a Deliverable
`README.md` and `ComoRodar.md` MUST accurately describe how to stand up the
current development environment and how to view the current production
environment. Whenever a change alters how the project is run, built, or
deployed, the documentation update MUST land in the same commit or an
immediately adjacent one — not deferred to a later "docs" pass.
Rationale: The rubric requires the final `README.md` to contain the dev
setup and prod viewing steps; documentation that lags the code under test
cannot be graded as accurate, and stale docs actively mislead evaluators.

## Technology & Modernization Constraints

- The Express 3.x / Socket.io 0.9.x stack in `server/` MUST be upgraded to
  current stable major versions (Express 4+, Socket.io 4+), and deprecated APIs
  (`app.configure(...)`, `io.sockets.on(...)`) MUST be replaced with their
  modern equivalents in both `server/` and the client-side transport in
  `game/src/mk.js`.
- Persistence MUST be implemented against PostgreSQL (e.g., fight history or
  player names), wired through `docker-compose.yml`.
- Infrastructure MUST be expressed as Kubernetes manifests; Terraform may
  additionally be used to provision supporting infrastructure.
- `server/package.json` MUST define `build`, `lint`, and `test` scripts so CI
  can invoke them uniformly; equivalent tooling MUST exist for the front-end
  (`game/`) even though it has no build step today.

## Phase-Ordered Delivery Workflow

Work MUST proceed in the rubric's phase order (containerization → compose +
Postgres → CI build/lint → CI unit tests → fuzzing → SAST/SCA → SonarCloud →
prod containerization → K8s/Terraform → CD + HTTPS), because later phases
structurally depend on earlier ones (CI cannot lint/test a stack whose
container layout is still unstable; CD cannot publish images that prod
containerization hasn't produced). Each phase's commits MUST be coherent and
reviewable on their own before the next phase's work begins, even though a
single person is doing both the implementation and the review.

## Governance

This constitution governs how work on this assignment is planned, committed,
and reviewed; it supersedes ad hoc habits whenever they conflict with a
principle above. Because this is a solo assignment, "review" means a deliberate
self-check against these principles before each commit is made — in particular
principle I (atomicity/spacing) and principle III (gates green before moving on).

Amendments are made by editing this file directly: update the affected
section(s), record the change in the Sync Impact Report comment at the top of
the file, set `Last Amended` to the date of the change, and bump
`CONSTITUTION_VERSION` per semantic versioning — MAJOR for removing or
redefining a principle in a backward-incompatible way, MINOR for adding a
principle or materially expanding guidance, PATCH for wording or clarification
fixes. `Ratified` stays fixed at the original adoption date.

**Version**: 1.0.0 | **Ratified**: 2026-06-08 | **Last Amended**: 2026-06-08
