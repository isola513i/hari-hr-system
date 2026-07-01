# Database Schema & Migration Strategy

PostgreSQL (Neon in production). This document maps the **46 tables** by domain and
explains how schema changes are applied. `*` marks a NOT NULL column; only the
load-bearing columns are listed — see `apps/api/src/scripts/init-db.ts` for the full DDL.

## Conventions

- **Primary keys**: UUID via `uuid_generate_v4()`.
- **Timestamps**: `created_at` / `updated_at` (TIMESTAMP WITH TIME ZONE).
- **Soft delete**: high-value tables carry `deleted_at` (NULL = live). Queries filter
  `WHERE deleted_at IS NULL`. Applies to `leave_requests`, `attendance_records`,
  `documents`, `expense_claims`, `employee_training`.
- **Foreign keys**: `ON DELETE CASCADE` for owned children, `ON DELETE SET NULL` for
  soft references (e.g. `created_by`).
- **PII at rest**: `employees.national_id` / `bank_account_number` are AES-256-GCM
  encrypted (`utils/encryption.ts`); `national_id_hash` is an HMAC blind index for
  duplicate detection without decrypting.
- **Money**: DECIMAL columns (never float) for salary/payroll amounts.

---

## Domains

### Auth & Security
| Table | Purpose |
|---|---|
| `users` | Login identities: `email*`, `password_hash*`, `role`, `totp_enabled*`, `totp_secret` (encrypted), `email_notifications` |
| `refresh_tokens` | Rotating refresh tokens (`token_hash*`, `expires_at*`, `revoked`) |
| `password_reset_tokens` | One-time reset tokens (`token_hash*`, `expires_at*`, `used`) |
| `totp_backup_codes` | 2FA recovery codes (`code_hash*`, `used_at`) |
| `audit_logs` | Lightweight in-app activity feed |
| `audit_logs_persistent` | Durable audit trail: `action*`, `resource*`, `method*`, `path*`, `ip`, `success`, `details` (JSON) |

### Employees & Org
| Table | Purpose |
|---|---|
| `employees` | Core record. Identity, `manager_id` (self-FK → org hierarchy), `status`, `join_date`, `work_days*`, offboarding fields (`termination_date`, `last_working_day`, …), encrypted PII |
| `job_history` | Role/department changes over time (`start_date`, `end_date`) |
| `employee_leave_quotas` | Per-employee leave-quota overrides |
| `contacts` | Key company contacts (HR, IT, …) |

### Attendance
| Table | Purpose |
|---|---|
| `attendance_records` | Daily clock-in/out: `status` (On-time/Late/Absent/On-leave enum), GPS (`clock_in_lat/lng/accuracy`), `check_in_type`, `overtime_hours`, `auto_checkout`, `deleted_at` |
| `attendance_regularization_requests` | Employee requests to fix a mis-recorded day (two-tier manager→HR review) |
| `shifts` / `shift_assignments` | Shift definitions + per-employee-per-day assignment |

### Leave
| Table | Purpose |
|---|---|
| `leave_requests` | Requests: `leave_type*`, dates, `status`, two-tier approval (`manager_approved_by`, `approver_id`), `medical_certificate_path`, half-day fields, `deleted_at` |
| `leave_request_history` | Append-only change log of every leave-request mutation (`change_type*`, `changed_by*`) |
| `leave_balances` | Per-employee-per-year used/quota by type |
| `holidays` | Company/public holidays (`is_recurring`, `end_date` for ranges) |

### WFH & Overtime
| Table | Purpose |
|---|---|
| `wfh_requests` | Work-from-home requests (two-tier review) |
| `ot_requests` | Overtime: planned vs `actual_hours`, `ot_type` (regular/holiday multiplier) |

### Payroll
| Table | Purpose |
|---|---|
| `payroll_records` | Monthly run: `base_salary*`, overtime, bonus, tax, `net_pay*`, Thai SSF/PVF employee+employer contributions |
| `salary_history` | Salary changes (`effective_date*`, `previous_salary`, `change_reason`) |

### Performance
| Table | Purpose |
|---|---|
| `performance_reviews` | Self → manager → HR workflow (`status`, `self_review`, `manager_comment`, `hr_comment`, `rating`, `review_period`) |
| `performance_peer_feedback` | 360° peer slots: `rating`, `feedback`, `is_anonymous`, `status` (pending→submitted). Unique `(review_id, reviewer_id)` |

### Onboarding & Offboarding
| Table | Purpose |
|---|---|
| `tasks` | Onboarding checklist items (`stage`, `assignee`, `completed`) |
| `onboarding_documents` | Documents collected from new hires (review workflow) |
| `offboarding_tasks` | Exit checklist (`stage`: Pre-Exit/Last Week/Post-Exit) |
| `exit_interviews` | Exit-interview responses (`satisfaction_rating`, `would_rehire`, feedback) |

### Training
| Table | Purpose |
|---|---|
| `training_modules` | Catalog of modules |
| `employee_training` | Enrollment + progress (`status`, `completion_date`, `score`, `deleted_at`) |

### Documents & Assets
| Table | Purpose |
|---|---|
| `documents` | HR documents (`category`, `file_path`, `status`, `deleted_at`) |
| `company_assets` | Asset register + assignment (`asset_type*`, `status`, `assigned_to`) |

### Expenses & Compliance
| Table | Purpose |
|---|---|
| `expense_claims` | Claims: `amount*`, `category*`, `expense_date*`, receipt, two-tier approval, `deleted_at` |
| `compliance_items` | Compliance tracker (+ `compliance_status_history`, `compliance_evidence` where present) |

### Surveys & Wellbeing
| Table | Purpose |
|---|---|
| `surveys` | ISO 45003 wellbeing surveys (`status`, `allow_retake`) |
| `survey_questions` | Questions (`category`, `sort_order*`) |
| `survey_responses` | Anonymous Likert responses (`rating*`) — no employee link |
| `survey_completions` | Tracks who completed (separate from responses to preserve anonymity) |
| `sentiment_stats` | Cached sentiment aggregates |

### Communication & Misc
| Table | Purpose |
|---|---|
| `announcements` / `events` / `upcoming_events` | Company feed & calendar |
| `notifications` | Per-user in-app notifications (`type`, `read`, `link`) |
| `personal_notes` | Per-user sticky notes |
| `system_configs` | Key-value config (`category*`, `key*`, `value*`, `data_type*`) — leave quotas, review templates, tax brackets, etc. stored as JSON |
| `stats_headcount` | Cached headcount stats |

---

## Migration Strategy

The project uses a **layered, tool-free** approach (no Prisma/TypeORM migrations):

1. **`init-db.ts`** — the base schema. **Drops and recreates all tables**, then seeds
   base config. Run **only on a fresh/empty database**:
   ```bash
   npx ts-node src/scripts/init-db.ts
   ```

2. **`runLightMigrations()`** (in `src/index.ts`) — runs on **every server startup** and
   is **idempotent**: `ALTER TABLE … ADD COLUMN IF NOT EXISTS`,
   `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`. This is the primary way
   incremental schema changes reach existing databases — a new column/table added here
   self-applies on deploy with no manual step. **New incremental changes should go here.**

3. **Standalone scripts** (`src/scripts/*.ts`, ~35 of them) — one-off migrations
   (`add-*.ts`, `migrate-*.ts`, `alter-*.ts`), run manually. Several are wired as npm
   scripts (`db:migrate:soft-delete`, `db:migrate:totp`, `db:migrate:offboarding`,
   `db:migrate:indexes`, …). These are historical; their effects are also folded into
   `init-db.ts` / `runLightMigrations()` so a fresh init doesn't need them.

4. **`seed-demo.ts`** — populates realistic demo data (idempotent guard on the CEO row).

### Adding a schema change (recommended)
- **New column/index/table on an existing deployment** → add an idempotent statement to
  `runLightMigrations()` **and** the canonical DDL in `init-db.ts` (so fresh installs match).
- **Data backfill / one-off transform** → a standalone `src/scripts/migrate-*.ts` run manually.
- Never edit historical migration scripts; add a new step.

### Performance indexes
`add-missing-indexes.ts` (`npm run db:migrate:indexes`) adds `deleted_at` indexes and
partial composite indexes for the highest-traffic list queries. Idempotent.
