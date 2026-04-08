/**
 * seed-demo.ts — Comprehensive demo seed data for HARI HR System
 *
 * Usage:
 *   npx ts-node src/scripts/seed-demo.ts          (standalone)
 *   POST /api/system/seed-demo                     (via API, if wired)
 *
 * All employees use password: Demo123!
 * Admin remains: admin@aiya.ai / Welcome123!
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import pool, { query } from "../db";
import bcrypt from "bcrypt";

// ============================================================
// CONSTANTS & FIXED UUIDs
// ============================================================

const ADMIN_USER_ID = "11111111-1111-1111-1111-111111111111";
const ADMIN_EMP_ID = "00000000-0000-0000-0000-000000000001";
const SURVEY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

// Employee UUIDs (deterministic for FK references)
const E = {
  CEO: "eeeeeeee-0000-0000-0000-000000000001",
  VP_ENG: "eeeeeeee-0000-0000-0000-000000000002",
  VP_OPS: "eeeeeeee-0000-0000-0000-000000000003",
  ENG_MGR: "eeeeeeee-0000-0000-0000-000000000004",
  SR_ENG: "eeeeeeee-0000-0000-0000-000000000005",
  FS_DEV: "eeeeeeee-0000-0000-0000-000000000006",
  JR_DEV: "eeeeeeee-0000-0000-0000-000000000007",
  DESIGN_DIR: "eeeeeeee-0000-0000-0000-000000000008",
  UX: "eeeeeeee-0000-0000-0000-000000000009",
  UI: "eeeeeeee-0000-0000-0000-000000000010",
  MKT_MGR: "eeeeeeee-0000-0000-0000-000000000011",
  CONTENT: "eeeeeeee-0000-0000-0000-000000000012",
  FIN_MGR: "eeeeeeee-0000-0000-0000-000000000013",
  ACCT: "eeeeeeee-0000-0000-0000-000000000014",
  HR_SPEC: "eeeeeeee-0000-0000-0000-000000000015",
  DEVOPS: "eeeeeeee-0000-0000-0000-000000000016",
  INTERN: "eeeeeeee-0000-0000-0000-000000000017",
};

// Matching user UUIDs
const U = {
  CEO: "dddddddd-0000-0000-0000-000000000001",
  VP_ENG: "dddddddd-0000-0000-0000-000000000002",
  VP_OPS: "dddddddd-0000-0000-0000-000000000003",
  ENG_MGR: "dddddddd-0000-0000-0000-000000000004",
  SR_ENG: "dddddddd-0000-0000-0000-000000000005",
  FS_DEV: "dddddddd-0000-0000-0000-000000000006",
  JR_DEV: "dddddddd-0000-0000-0000-000000000007",
  DESIGN_DIR: "dddddddd-0000-0000-0000-000000000008",
  UX: "dddddddd-0000-0000-0000-000000000009",
  UI: "dddddddd-0000-0000-0000-000000000010",
  MKT_MGR: "dddddddd-0000-0000-0000-000000000011",
  CONTENT: "dddddddd-0000-0000-0000-000000000012",
  FIN_MGR: "dddddddd-0000-0000-0000-000000000013",
  ACCT: "dddddddd-0000-0000-0000-000000000014",
  HR_SPEC: "dddddddd-0000-0000-0000-000000000015",
  DEVOPS: "dddddddd-0000-0000-0000-000000000016",
  INTERN: "dddddddd-0000-0000-0000-000000000017",
};

type EmpKey = keyof typeof E;

// Full roster definition
interface EmpDef {
  key: EmpKey;
  name: string;
  email: string;
  role: string;
  department: string;
  managerKey: EmpKey | "ADMIN" | null;
  salary: number | null;
  dailyRate: number | null;
  joinDate: string;
  location: string;
  skills: string[];
  bio: string;
  phone: string;
  code: string;
  status: string;
  onboardingStatus: string;
  onboardingPct: number;
}

const ROSTER: EmpDef[] = [
  {
    key: "CEO",
    name: "Somchai Prasert",
    email: "somchai@aiya.ai",
    role: "Chief Executive Officer",
    department: "Executive",
    managerKey: null,
    salary: 250000,
    dailyRate: null,
    joinDate: "2020-03-01",
    location: "Bangkok, TH",
    skills: ["Leadership", "Strategy", "Business Development"],
    bio: "Visionary leader with 20+ years of experience in tech industry. Founded the company to revolutionize HR management in Southeast Asia.",
    phone: "+66-81-234-5678",
    code: "EMP-0002",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "VP_ENG",
    name: "Nattapong Wiset",
    email: "nattapong@aiya.ai",
    role: "VP of Engineering",
    department: "Engineering",
    managerKey: "CEO",
    salary: 180000,
    dailyRate: null,
    joinDate: "2020-06-15",
    location: "Bangkok, TH",
    skills: ["System Architecture", "Cloud Infrastructure", "Team Management", "Agile"],
    bio: "Engineering leader passionate about building scalable systems. Leads a team of talented engineers across multiple product lines.",
    phone: "+66-82-345-6789",
    code: "EMP-0003",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "VP_OPS",
    name: "Kannika Srisuk",
    email: "kannika@aiya.ai",
    role: "VP of Operations",
    department: "Operations",
    managerKey: "CEO",
    salary: 160000,
    dailyRate: null,
    joinDate: "2020-09-01",
    location: "Bangkok, TH",
    skills: ["Operations Management", "HR Strategy", "Compliance", "Process Improvement"],
    bio: "Operations expert ensuring smooth company-wide processes. Oversees HR, Finance, and Marketing functions.",
    phone: "+66-83-456-7890",
    code: "EMP-0004",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "ENG_MGR",
    name: "Priya Sharma",
    email: "priya@aiya.ai",
    role: "Engineering Manager",
    department: "Engineering",
    managerKey: "VP_ENG",
    salary: 140000,
    dailyRate: null,
    joinDate: "2021-04-01",
    location: "Bangkok, TH",
    skills: ["React", "Node.js", "PostgreSQL", "Project Management", "Code Review"],
    bio: "Experienced engineering manager bridging the gap between technical excellence and team growth. Mentors junior engineers and drives code quality.",
    phone: "+66-84-567-8901",
    code: "EMP-0005",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "SR_ENG",
    name: "Tanaka Hiroshi",
    email: "tanaka@aiya.ai",
    role: "Senior Software Engineer",
    department: "Engineering",
    managerKey: "ENG_MGR",
    salary: 120000,
    dailyRate: null,
    joinDate: "2022-01-10",
    location: "Bangkok, TH",
    skills: ["TypeScript", "React", "Go", "Kubernetes", "CI/CD"],
    bio: "Backend-focused senior engineer with deep expertise in distributed systems and API design.",
    phone: "+66-85-678-9012",
    code: "EMP-0006",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "FS_DEV",
    name: "Lin Mei Chen",
    email: "linmei@aiya.ai",
    role: "Full Stack Developer",
    department: "Engineering",
    managerKey: "ENG_MGR",
    salary: 95000,
    dailyRate: null,
    joinDate: "2023-03-15",
    location: "Bangkok, TH",
    skills: ["React", "TypeScript", "Node.js", "TailwindCSS", "PostgreSQL"],
    bio: "Versatile full stack developer who enjoys building beautiful UIs backed by clean APIs.",
    phone: "+66-86-789-0123",
    code: "EMP-0007",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "JR_DEV",
    name: "Arisa Nakamura",
    email: "arisa@aiya.ai",
    role: "Junior Developer",
    department: "Engineering",
    managerKey: "ENG_MGR",
    salary: 65000,
    dailyRate: null,
    joinDate: "2025-11-01",
    location: "Bangkok, TH",
    skills: ["JavaScript", "React", "HTML/CSS", "Git"],
    bio: "Eager junior developer fresh from a coding bootcamp. Quick learner with a passion for front-end development.",
    phone: "+66-87-890-1234",
    code: "EMP-0008",
    status: "Active",
    onboardingStatus: "In Progress",
    onboardingPct: 60,
  },
  {
    key: "DESIGN_DIR",
    name: "Wanchai Thongkam",
    email: "wanchai@aiya.ai",
    role: "Design Director",
    department: "Design",
    managerKey: "CEO",
    salary: 150000,
    dailyRate: null,
    joinDate: "2021-01-15",
    location: "Bangkok, TH",
    skills: ["Design Systems", "Figma", "Brand Identity", "User Research", "Motion Design"],
    bio: "Award-winning design leader who believes in the power of human-centered design to transform enterprise software.",
    phone: "+66-88-901-2345",
    code: "EMP-0009",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "UX",
    name: "Sarah Johnson",
    email: "sarah@aiya.ai",
    role: "UX Designer",
    department: "Design",
    managerKey: "DESIGN_DIR",
    salary: 90000,
    dailyRate: null,
    joinDate: "2023-06-01",
    location: "Bangkok, TH",
    skills: ["UX Research", "Wireframing", "Prototyping", "Figma", "User Testing"],
    bio: "User experience designer who combines data-driven insights with creative problem solving.",
    phone: "+66-89-012-3456",
    code: "EMP-0010",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "UI",
    name: "Patcharee Wongsri",
    email: "patcharee@aiya.ai",
    role: "UI Designer",
    department: "Design",
    managerKey: "DESIGN_DIR",
    salary: 85000,
    dailyRate: null,
    joinDate: "2024-02-01",
    location: "Bangkok, TH",
    skills: ["Visual Design", "Figma", "Illustration", "TailwindCSS", "Design Tokens"],
    bio: "Pixel-perfect UI designer with a keen eye for typography and color. Creates cohesive visual experiences across platforms.",
    phone: "+66-90-123-4567",
    code: "EMP-0011",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "MKT_MGR",
    name: "Marcus Lee",
    email: "marcus@aiya.ai",
    role: "Marketing Manager",
    department: "Marketing",
    managerKey: "VP_OPS",
    salary: 110000,
    dailyRate: null,
    joinDate: "2022-08-01",
    location: "Bangkok, TH",
    skills: ["Digital Marketing", "SEO/SEM", "Content Strategy", "Analytics", "Social Media"],
    bio: "Data-driven marketing professional specializing in B2B SaaS growth. Manages brand positioning and lead generation.",
    phone: "+66-91-234-5678",
    code: "EMP-0012",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "CONTENT",
    name: "Areeya Chaiyaporn",
    email: "areeya@aiya.ai",
    role: "Content Strategist",
    department: "Marketing",
    managerKey: "MKT_MGR",
    salary: 70000,
    dailyRate: null,
    joinDate: "2024-05-01",
    location: "Bangkok, TH",
    skills: ["Copywriting", "Content Marketing", "Social Media", "SEO", "Video Production"],
    bio: "Creative storyteller who crafts compelling content that resonates with HR professionals across Southeast Asia.",
    phone: "+66-92-345-6789",
    code: "EMP-0013",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "FIN_MGR",
    name: "Napat Kittisak",
    email: "napat@aiya.ai",
    role: "Finance Manager",
    department: "Finance",
    managerKey: "VP_OPS",
    salary: 130000,
    dailyRate: null,
    joinDate: "2021-07-01",
    location: "Bangkok, TH",
    skills: ["Financial Planning", "Budgeting", "Payroll", "Tax Compliance", "Excel"],
    bio: "Detail-oriented finance professional ensuring fiscal responsibility and transparent financial reporting.",
    phone: "+66-93-456-7890",
    code: "EMP-0014",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "ACCT",
    name: "Yuki Tanabe",
    email: "yuki@aiya.ai",
    role: "Accountant",
    department: "Finance",
    managerKey: "FIN_MGR",
    salary: 75000,
    dailyRate: null,
    joinDate: "2023-09-01",
    location: "Bangkok, TH",
    skills: ["Accounting", "QuickBooks", "Reconciliation", "Tax Filing", "Payroll Processing"],
    bio: "Meticulous accountant with expertise in Thai tax regulations and international accounting standards.",
    phone: "+66-94-567-8901",
    code: "EMP-0015",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "HR_SPEC",
    name: "Siriporn Maneerat",
    email: "siriporn@aiya.ai",
    role: "HR Specialist",
    department: "Human Resources",
    managerKey: "ADMIN",
    salary: 80000,
    dailyRate: null,
    joinDate: "2024-01-15",
    location: "Bangkok, TH",
    skills: ["Recruitment", "Employee Relations", "Onboarding", "HRIS", "Training"],
    bio: "Passionate HR specialist focused on creating a positive employee experience and nurturing company culture.",
    phone: "+66-95-678-9012",
    code: "EMP-0016",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "DEVOPS",
    name: "David Kim",
    email: "david@aiya.ai",
    role: "DevOps Engineer",
    department: "Engineering",
    managerKey: "VP_ENG",
    salary: 130000,
    dailyRate: null,
    joinDate: "2022-05-01",
    location: "Bangkok, TH",
    skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Monitoring"],
    bio: "Infrastructure and reliability engineer. Keeps the platform running 24/7 with 99.9% uptime.",
    phone: "+66-96-789-0123",
    code: "EMP-0017",
    status: "Active",
    onboardingStatus: "Completed",
    onboardingPct: 100,
  },
  {
    key: "INTERN",
    name: "Ploy Rattanawan",
    email: "ploy@aiya.ai",
    role: "Software Engineering Intern",
    department: "Engineering",
    managerKey: "ENG_MGR",
    salary: null,
    dailyRate: 500,
    joinDate: "2026-01-13",
    location: "Bangkok, TH",
    skills: ["Python", "JavaScript", "React", "SQL"],
    bio: "Computer science intern eager to learn real-world software development practices.",
    phone: "+66-97-890-1234",
    code: "EMP-0018",
    status: "Active",
    onboardingStatus: "In Progress",
    onboardingPct: 40,
  },
];

// All employee IDs including admin
const ALL_EMP_IDS = [ADMIN_EMP_ID, ...Object.values(E)];

// ============================================================
// HELPERS
// ============================================================

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDec(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function dateFmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function resolveManager(key: EmpKey | "ADMIN" | null): string | null {
  if (key === null) return null;
  if (key === "ADMIN") return ADMIN_EMP_ID;
  return E[key];
}

function avatar(name: string, bg: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=128`;
}

const BG_COLORS = [
  "6366f1", "06b6d4", "10b981", "f59e0b", "ef4444",
  "8b5cf6", "ec4899", "14b8a6", "f97316", "3b82f6",
  "84cc16", "a855f7", "e11d48", "0891b2", "059669",
  "d946ef", "0ea5e9",
];

// ============================================================
// SECTION 1: USERS + EMPLOYEES
// ============================================================

async function seedUsersAndEmployees(hash: string) {
  console.log("  [1/20] Users & Employees...");

  // Insert users
  const userValues: string[] = [];
  const userParams: any[] = [];
  let pi = 1;

  for (let i = 0; i < ROSTER.length; i++) {
    const r = ROSTER[i];
    const uid = U[r.key];
    userValues.push(`($${pi++}, $${pi++}, $${pi++}, $${pi++})`);
    userParams.push(uid, r.email, hash, r.key === "CEO" || r.key === "VP_OPS" ? "HR_ADMIN" : "EMPLOYEE");
  }

  await query(
    `INSERT INTO users (id, email, password_hash, role) VALUES ${userValues.join(", ")}
     ON CONFLICT (id) DO NOTHING`,
    userParams
  );

  // Insert employees (order matters for manager FK — parents first)
  for (let i = 0; i < ROSTER.length; i++) {
    const r = ROSTER[i];
    const eid = E[r.key];
    const uid = U[r.key];
    await query(
      `INSERT INTO employees (
        id, user_id, name, email, role, department, avatar, status,
        onboarding_status, onboarding_percentage, join_date, location,
        skills, bio, phone, salary, daily_rate, manager_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (id) DO NOTHING`,
      [
        eid, uid, r.name, r.email, r.role, r.department,
        avatar(r.name, BG_COLORS[i % BG_COLORS.length]),
        r.status, r.onboardingStatus, r.onboardingPct,
        r.joinDate, r.location, r.skills, r.bio, r.phone,
        r.salary, r.dailyRate, resolveManager(r.managerKey),
      ]
    );
  }

  // Update existing admin's manager to VP of Operations
  await query(
    `UPDATE employees SET manager_id = $1 WHERE id = $2`,
    [E.VP_OPS, ADMIN_EMP_ID]
  );
}

// ============================================================
// SECTION 2: ATTENDANCE RECORDS (past 30 working days)
// ============================================================

async function seedAttendance() {
  console.log("  [2/20] Attendance Records...");

  const today = new Date();
  const rows: string[] = [];
  const params: any[] = [];
  let pi = 1;

  // All active employees (skip intern for weekends logic)
  const empIds = ALL_EMP_IDS;

  for (let dayOffset = 1; dayOffset <= 45; dayOffset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    if (isWeekend(d)) continue;

    const dateStr = dateFmt(d);

    for (const empId of empIds) {
      const luck = Math.random();
      let status: string;
      let clockIn: string | null = null;
      let clockOut: string | null = null;
      let totalHours: number | null = null;
      let breakMin = 60;

      if (luck < 0.08) {
        // 8% absent
        status = "Absent";
      } else if (luck < 0.22) {
        // 14% late
        status = "Late";
        const h = 9;
        const m = rand(5, 30);
        clockIn = `${dateStr}T0${h}:${m < 10 ? "0" + m : m}:00+07:00`;
        const outH = rand(17, 19);
        const outM = rand(0, 59);
        clockOut = `${dateStr}T${outH}:${outM < 10 ? "0" + outM : outM}:00+07:00`;
        totalHours = parseFloat(((outH * 60 + outM - (h * 60 + m) - breakMin) / 60).toFixed(2));
      } else {
        // 78% on-time
        status = "On-time";
        const h = 8;
        const m = rand(15, 55);
        clockIn = `${dateStr}T0${h}:${m < 10 ? "0" + m : m}:00+07:00`;
        const outH = rand(17, 19);
        const outM = rand(0, 59);
        clockOut = `${dateStr}T${outH}:${outM < 10 ? "0" + outM : outM}:00+07:00`;
        totalHours = parseFloat(((outH * 60 + outM - (h * 60 + m) - breakMin) / 60).toFixed(2));
      }

      rows.push(
        `($${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++})`
      );
      params.push(empId, dateStr, clockIn, clockOut, breakMin, totalHours, status);
    }
  }

  // Batch insert in chunks (avoid too many params)
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunkRows = rows.slice(i, i + CHUNK);
    const chunkStart = i * 7; // 7 params per row
    const chunkParams = params.slice(chunkStart, chunkStart + chunkRows.length * 7);

    // Re-index placeholders
    let idx = 1;
    const reindexed = chunkRows.map((r) =>
      r.replace(/\$\d+/g, () => `$${idx++}`)
    );

    await query(
      `INSERT INTO attendance_records (employee_id, date, clock_in, clock_out, break_duration, total_hours, status)
       VALUES ${reindexed.join(", ")}
       ON CONFLICT (employee_id, date) DO NOTHING`,
      chunkParams
    );
  }
}

// ============================================================
// SECTION 3: LEAVE REQUESTS
// ============================================================

async function seedLeaveRequests() {
  console.log("  [3/20] Leave Requests...");

  const leaves = [
    // Approved leaves
    { emp: E.SR_ENG, type: "Vacation", start: "2026-03-16", end: "2026-03-20", reason: "Family trip to Chiang Mai", status: "Approved", approver: E.ENG_MGR, days: 5 },
    { emp: E.UX, type: "Sick Leave", start: "2026-03-10", end: "2026-03-11", reason: "Flu and fever", status: "Approved", approver: E.DESIGN_DIR, days: 2 },
    { emp: E.CONTENT, type: "Personal Day", start: "2026-03-25", end: "2026-03-25", reason: "Moving to new apartment", status: "Approved", approver: E.MKT_MGR, days: 1 },
    { emp: E.FS_DEV, type: "Vacation", start: "2026-02-17", end: "2026-02-21", reason: "Chinese New Year celebration", status: "Approved", approver: E.ENG_MGR, days: 5 },
    { emp: E.ACCT, type: "Sick Leave", start: "2026-03-05", end: "2026-03-05", reason: "Dental appointment", status: "Approved", approver: E.FIN_MGR, days: 1, isHalfDay: true, halfDayPeriod: "AM" },
    // Pending leaves
    { emp: E.DEVOPS, type: "Vacation", start: "2026-04-20", end: "2026-04-24", reason: "Planned holiday to Japan", status: "Pending", approver: null, days: 5 },
    { emp: E.UI, type: "Personal Day", start: "2026-04-15", end: "2026-04-15", reason: "Personal errands", status: "Pending", approver: null, days: 1 },
    { emp: E.MKT_MGR, type: "Vacation", start: "2026-05-04", end: "2026-05-08", reason: "Annual family vacation", status: "Pending", approver: null, days: 5 },
    { emp: E.HR_SPEC, type: "Sick Leave", start: "2026-04-09", end: "2026-04-09", reason: "Medical check-up", status: "Pending", approver: null, days: 0.5, isHalfDay: true, halfDayPeriod: "PM" },
    // Rejected leaves
    { emp: E.JR_DEV, type: "Vacation", start: "2026-03-03", end: "2026-03-07", reason: "Trip with friends", status: "Rejected", approver: E.ENG_MGR, rejReason: "Sprint deadline — please reschedule to next sprint", days: 5 },
    { emp: E.INTERN, type: "Personal Day", start: "2026-03-28", end: "2026-03-28", reason: "University exam preparation", status: "Rejected", approver: E.ENG_MGR, rejReason: "Demo day is on this date, please choose another day", days: 1 },
  ];

  for (const lv of leaves) {
    await query(
      `INSERT INTO leave_requests (
        employee_id, leave_type, start_date, end_date, reason, status,
        approver_id, rejection_reason, business_days, is_half_day, half_day_period
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        lv.emp, lv.type, lv.start, lv.end, lv.reason, lv.status,
        lv.approver, (lv as any).rejReason || null, lv.days,
        (lv as any).isHalfDay || false, (lv as any).halfDayPeriod || null,
      ]
    );
  }
}

// ============================================================
// SECTION 4: HOLIDAYS (Thai 2026)
// ============================================================

async function seedHolidays() {
  console.log("  [4/20] Thai Holidays 2026...");

  const holidays = [
    ["2026-01-01", "New Year's Day", true],
    ["2026-02-17", "Makha Bucha Day", true],
    ["2026-04-06", "Chakri Memorial Day", true],
    ["2026-04-13", "Songkran Festival", true],
    ["2026-04-14", "Songkran Festival", true],
    ["2026-04-15", "Songkran Festival", true],
    ["2026-05-01", "National Labour Day", true],
    ["2026-05-04", "Coronation Day", true],
    ["2026-05-12", "Visakha Bucha Day", true],
    ["2026-06-03", "Queen Suthida's Birthday", true],
    ["2026-07-10", "Asalha Bucha Day", true],
    ["2026-07-28", "King Vajiralongkorn's Birthday", true],
    ["2026-08-12", "Queen Mother's Birthday / Mother's Day", true],
    ["2026-10-13", "King Bhumibol Memorial Day", true],
    ["2026-10-23", "Chulalongkorn Day", true],
    ["2026-12-05", "King Bhumibol's Birthday / Father's Day", true],
    ["2026-12-10", "Constitution Day", true],
    ["2026-12-31", "New Year's Eve", true],
  ] as const;

  for (const [date, name, recurring] of holidays) {
    await query(
      `INSERT INTO holidays (date, name, is_recurring) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [date, name, recurring]
    );
  }
}

// ============================================================
// SECTION 5: PAYROLL RECORDS (3 months)
// ============================================================

async function seedPayroll() {
  console.log("  [5/20] Payroll Records...");

  const periods = [
    { start: "2026-01-01", end: "2026-01-31", status: "Paid", payDate: "2026-01-31" },
    { start: "2026-02-01", end: "2026-02-28", status: "Paid", payDate: "2026-02-28" },
    { start: "2026-03-01", end: "2026-03-31", status: "Processed", payDate: "2026-03-31" },
  ];

  // All salaried employees (with admin)
  const salariedEmps = [
    { id: ADMIN_EMP_ID, salary: 90000 },
    ...ROSTER.filter((r) => r.salary).map((r) => ({ id: E[r.key], salary: r.salary! })),
  ];

  for (const period of periods) {
    for (const emp of salariedEmps) {
      const base = emp.salary;
      const ssfEmp = Math.min(base * 0.05, 750);
      const ssfEr = ssfEmp;
      const pvfEmp = base * 0.03;
      const pvfEr = pvfEmp;
      const annualTax = calcAnnualTax(base * 12);
      const monthlyTax = parseFloat((annualTax / 12).toFixed(2));
      const overtime = Math.random() < 0.2 ? randDec(2, 8) : 0;
      const overtimePay = parseFloat((overtime * (base / 30 / 8) * 1.5).toFixed(2));
      const bonus = period.end === "2026-01-31" && Math.random() < 0.3 ? rand(5000, 20000) : 0;
      const net = parseFloat(
        (base + overtimePay + bonus - ssfEmp - pvfEmp - monthlyTax).toFixed(2)
      );

      await query(
        `INSERT INTO payroll_records (
          employee_id, pay_period_start, pay_period_end, base_salary,
          overtime_hours, overtime_pay, bonus, deductions, tax_amount,
          ssf_employee, ssf_employer, pvf_employee, pvf_employer,
          net_pay, status, payment_date, payment_method
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT DO NOTHING`,
        [
          emp.id, period.start, period.end, base,
          overtime, overtimePay, bonus, 0, monthlyTax,
          ssfEmp, ssfEr, pvfEmp, pvfEr,
          net, period.status, period.payDate, "Bank Transfer",
        ]
      );
    }
  }
}

function calcAnnualTax(annual: number): number {
  // Thai progressive income tax (simplified)
  const taxable = annual - 150000 - 100000 - 60000; // personal + expense + SSF allowances
  if (taxable <= 0) return 0;
  let tax = 0;
  const brackets = [
    [150000, 0.05],
    [350000, 0.10],
    [500000, 0.15],
    [750000, 0.20],
    [1000000, 0.25],
    [2000000, 0.30],
    [Infinity, 0.35],
  ] as const;
  let remaining = taxable;
  for (const [width, rate] of brackets) {
    const taxable = Math.min(remaining, width);
    tax += taxable * rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return parseFloat(tax.toFixed(2));
}

// ============================================================
// SECTION 6: SALARY HISTORY
// ============================================================

async function seedSalaryHistory() {
  console.log("  [6/20] Salary History...");

  const histories = [
    { emp: E.SR_ENG, date: "2024-01-01", current: 120000, prev: 100000, reason: "Annual Increase", approver: E.VP_ENG },
    { emp: E.FS_DEV, date: "2025-01-01", current: 95000, prev: 80000, reason: "Promotion", approver: E.ENG_MGR },
    { emp: E.MKT_MGR, date: "2024-07-01", current: 110000, prev: 95000, reason: "Market Adjustment", approver: E.VP_OPS },
    { emp: E.DEVOPS, date: "2024-01-01", current: 130000, prev: 110000, reason: "Promotion", approver: E.VP_ENG },
    { emp: E.HR_SPEC, date: "2025-07-01", current: 80000, prev: 70000, reason: "Annual Increase", approver: ADMIN_EMP_ID },
  ];

  for (const h of histories) {
    await query(
      `INSERT INTO salary_history (employee_id, effective_date, base_salary, previous_salary, change_reason, approved_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [h.emp, h.date, h.current, h.prev, h.reason, h.approver]
    );
  }
}

// ============================================================
// SECTION 7: TRAINING MODULES + ASSIGNMENTS
// ============================================================

async function seedTraining() {
  console.log("  [7/20] Training Modules & Assignments...");

  const modules = [
    { id: "cccccccc-0000-0000-0000-000000000001", title: "Information Security Awareness", desc: "Learn about phishing, password hygiene, and data protection policies.", duration: "2 hours", type: "Course", status: "Published" },
    { id: "cccccccc-0000-0000-0000-000000000002", title: "React 19 — New Features Workshop", desc: "Hands-on workshop covering React 19 concurrent features, server components, and actions.", duration: "4 hours", type: "Video", status: "Published" },
    { id: "cccccccc-0000-0000-0000-000000000003", title: "Effective Communication Skills", desc: "Improve workplace communication, active listening, and giving constructive feedback.", duration: "1.5 hours", type: "Course", status: "Published" },
    { id: "cccccccc-0000-0000-0000-000000000004", title: "Thai Labour Law Essentials", desc: "Overview of Thai Labour Protection Act, employee rights, and employer obligations.", duration: "3 hours", type: "Reading", status: "Published" },
    { id: "cccccccc-0000-0000-0000-000000000005", title: "Cloud Infrastructure with AWS", desc: "Deep dive into AWS services: EC2, S3, RDS, Lambda, and best practices.", duration: "6 hours", type: "Course", status: "Published" },
    { id: "cccccccc-0000-0000-0000-000000000006", title: "Design Systems Fundamentals", desc: "Building and maintaining scalable design systems with Figma and design tokens.", duration: "3 hours", type: "Video", status: "Published" },
  ];

  for (const m of modules) {
    await query(
      `INSERT INTO training_modules (id, title, description, duration, type, status, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.title, m.desc, m.duration, m.type, m.status, true, ADMIN_EMP_ID]
    );
  }

  // Assignments
  const assignments = [
    // Security training — everyone
    { emp: E.SR_ENG, mod: modules[0].id, status: "Completed", score: 95, compDate: "2026-02-15", due: "2026-03-01" },
    { emp: E.FS_DEV, mod: modules[0].id, status: "Completed", score: 88, compDate: "2026-02-20", due: "2026-03-01" },
    { emp: E.JR_DEV, mod: modules[0].id, status: "In Progress", score: null, compDate: null, due: "2026-04-15" },
    { emp: E.DEVOPS, mod: modules[0].id, status: "Completed", score: 92, compDate: "2026-02-10", due: "2026-03-01" },
    { emp: E.INTERN, mod: modules[0].id, status: "Not Started", score: null, compDate: null, due: "2026-04-30" },
    { emp: E.UX, mod: modules[0].id, status: "Completed", score: 90, compDate: "2026-02-25", due: "2026-03-01" },
    // React workshop — engineering
    { emp: E.SR_ENG, mod: modules[1].id, status: "Completed", score: 98, compDate: "2026-03-01", due: "2026-03-15" },
    { emp: E.FS_DEV, mod: modules[1].id, status: "Completed", score: 85, compDate: "2026-03-10", due: "2026-03-15" },
    { emp: E.JR_DEV, mod: modules[1].id, status: "In Progress", score: null, compDate: null, due: "2026-04-15" },
    { emp: E.INTERN, mod: modules[1].id, status: "Not Started", score: null, compDate: null, due: "2026-05-01" },
    // Communication — managers
    { emp: E.ENG_MGR, mod: modules[2].id, status: "Completed", score: 91, compDate: "2026-01-20", due: "2026-02-01" },
    { emp: E.DESIGN_DIR, mod: modules[2].id, status: "Completed", score: 87, compDate: "2026-01-25", due: "2026-02-01" },
    { emp: E.MKT_MGR, mod: modules[2].id, status: "In Progress", score: null, compDate: null, due: "2026-04-30" },
    // Thai Labour Law — HR
    { emp: E.HR_SPEC, mod: modules[3].id, status: "Completed", score: 94, compDate: "2026-02-05", due: "2026-02-28" },
    { emp: ADMIN_EMP_ID, mod: modules[3].id, status: "Completed", score: 96, compDate: "2026-02-01", due: "2026-02-28" },
    // AWS — DevOps + engineering
    { emp: E.DEVOPS, mod: modules[4].id, status: "Completed", score: 97, compDate: "2026-01-15", due: "2026-02-01" },
    { emp: E.SR_ENG, mod: modules[4].id, status: "In Progress", score: null, compDate: null, due: "2026-04-30" },
    // Design Systems — design team
    { emp: E.UX, mod: modules[5].id, status: "Completed", score: 89, compDate: "2026-03-05", due: "2026-03-15" },
    { emp: E.UI, mod: modules[5].id, status: "Completed", score: 93, compDate: "2026-03-08", due: "2026-03-15" },
  ];

  for (const a of assignments) {
    const modTitle = modules.find((m) => m.id === a.mod)?.title || "";
    const modDur = modules.find((m) => m.id === a.mod)?.duration || "";
    await query(
      `INSERT INTO employee_training (
        employee_id, module_id, title, duration, status, completion_date, score, due_date, assigned_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [a.emp, a.mod, modTitle, modDur, a.status, a.compDate, a.score, a.due, ADMIN_EMP_ID]
    );
  }
}

// ============================================================
// SECTION 8: JOB HISTORY
// ============================================================

async function seedJobHistory() {
  console.log("  [8/20] Job History...");

  const history = [
    // CEO
    { emp: E.CEO, role: "Chief Executive Officer", dept: "Executive", start: "2020-03-01", end: null, desc: "Founded the company and leads overall strategy, fundraising, and organizational growth." },
    // VP Engineering
    { emp: E.VP_ENG, role: "VP of Engineering", dept: "Engineering", start: "2022-01-01", end: null, desc: "Promoted to VP, overseeing all engineering teams and technical strategy." },
    { emp: E.VP_ENG, role: "Engineering Manager", dept: "Engineering", start: "2020-06-15", end: "2021-12-31", desc: "Led the initial engineering team, built core platform architecture." },
    // Engineering Manager
    { emp: E.ENG_MGR, role: "Engineering Manager", dept: "Engineering", start: "2023-07-01", end: null, desc: "Promoted to manage the growing engineering team." },
    { emp: E.ENG_MGR, role: "Senior Engineer", dept: "Engineering", start: "2021-04-01", end: "2023-06-30", desc: "Key contributor to platform core features and API design." },
    // DevOps
    { emp: E.DEVOPS, role: "DevOps Engineer", dept: "Engineering", start: "2022-05-01", end: null, desc: "Manages CI/CD pipelines, cloud infrastructure, and system reliability." },
    // Design Director
    { emp: E.DESIGN_DIR, role: "Design Director", dept: "Design", start: "2023-01-01", end: null, desc: "Promoted to lead the design team and establish company-wide design system." },
    { emp: E.DESIGN_DIR, role: "Senior Designer", dept: "Design", start: "2021-01-15", end: "2022-12-31", desc: "Led product design for core HR modules." },
    // Marketing Manager
    { emp: E.MKT_MGR, role: "Marketing Manager", dept: "Marketing", start: "2024-01-01", end: null, desc: "Promoted to lead marketing strategy and team." },
    { emp: E.MKT_MGR, role: "Digital Marketing Specialist", dept: "Marketing", start: "2022-08-01", end: "2023-12-31", desc: "Drove digital marketing campaigns and established SEO strategy." },
    // Finance Manager
    { emp: E.FIN_MGR, role: "Finance Manager", dept: "Finance", start: "2021-07-01", end: null, desc: "Oversees financial planning, budgeting, payroll, and compliance." },
  ];

  for (const h of history) {
    await query(
      `INSERT INTO job_history (employee_id, role, department, start_date, end_date, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [h.emp, h.role, h.dept, h.start, h.end, h.desc, ADMIN_USER_ID]
    );
  }
}

// ============================================================
// SECTION 9: PERFORMANCE REVIEWS
// ============================================================

async function seedPerformanceReviews() {
  console.log("  [9/20] Performance Reviews...");

  const reviews = [
    { emp: E.SR_ENG, date: "2025-12-15", reviewer: "Priya Sharma", rating: 5, notes: "Outstanding performance. Tanaka consistently delivers high-quality code, mentors juniors, and proactively identifies architectural improvements." },
    { emp: E.FS_DEV, date: "2025-12-15", reviewer: "Priya Sharma", rating: 4, notes: "Strong performer. Lin Mei has grown significantly in backend skills this year. Recommended for more ownership of features." },
    { emp: E.JR_DEV, date: "2026-02-15", reviewer: "Priya Sharma", rating: 3, notes: "Good progress for a new hire. Arisa shows strong learning ability but needs to improve code review discipline and testing practices." },
    { emp: E.DEVOPS, date: "2025-12-15", reviewer: "Nattapong Wiset", rating: 5, notes: "Exceptional. David achieved 99.95% uptime and reduced deployment time by 40%. Critical to our infrastructure reliability." },
    { emp: E.UX, date: "2025-12-15", reviewer: "Wanchai Thongkam", rating: 4, notes: "Sarah's user research has directly improved our NPS score. Strong analytical skills paired with creative solutions." },
    { emp: E.UI, date: "2025-12-15", reviewer: "Wanchai Thongkam", rating: 4, notes: "Patcharee's design consistency and attention to detail is impressive. The new design token system she implemented is excellent." },
    { emp: E.MKT_MGR, date: "2025-12-15", reviewer: "Kannika Srisuk", rating: 4, notes: "Marcus has successfully grown our brand presence by 65% this year. Strong strategic thinking and execution." },
    { emp: E.CONTENT, date: "2025-12-15", reviewer: "Marcus Lee", rating: 3, notes: "Areeya produces quality content but needs to improve on deadlines. Good potential with more project management skills." },
    { emp: E.FIN_MGR, date: "2025-12-15", reviewer: "Kannika Srisuk", rating: 5, notes: "Napat's financial oversight has been crucial during our growth phase. Excellent budget forecasting and cost optimization." },
    { emp: E.ACCT, date: "2025-12-15", reviewer: "Napat Kittisak", rating: 4, notes: "Yuki is reliable and accurate. Has taken on additional payroll responsibilities with great competence." },
    { emp: E.HR_SPEC, date: "2025-12-15", reviewer: "System Admin", rating: 4, notes: "Siriporn has streamlined the onboarding process significantly. Employee satisfaction scores for onboarding improved by 25%." },
    { emp: ADMIN_EMP_ID, date: "2025-12-15", reviewer: "Kannika Srisuk", rating: 4, notes: "System Admin has maintained excellent HR operations and successfully implemented the HARI platform." },
    { emp: E.ENG_MGR, date: "2025-12-15", reviewer: "Nattapong Wiset", rating: 5, notes: "Priya is an exceptional engineering manager. Her team consistently delivers on time and she has built a strong engineering culture." },
    { emp: E.DESIGN_DIR, date: "2025-12-15", reviewer: "Somchai Prasert", rating: 5, notes: "Wanchai has elevated our product design to world-class standards. The design system he built is a competitive advantage." },
    { emp: E.VP_ENG, date: "2025-12-15", reviewer: "Somchai Prasert", rating: 5, notes: "Nattapong's technical leadership and hiring decisions have been instrumental in building a strong engineering organization." },
  ];

  for (const r of reviews) {
    await query(
      `INSERT INTO performance_reviews (employee_id, date, reviewer, rating, notes)
       VALUES ($1,$2,$3,$4,$5)`,
      [r.emp, r.date, r.reviewer, r.rating, r.notes]
    );
  }
}

// ============================================================
// SECTION 10: DOCUMENTS
// ============================================================

async function seedDocuments() {
  console.log("  [10/20] Documents...");

  const docs = [
    { name: "Employment Contract - Somchai Prasert.pdf", type: "pdf", cat: "Contract", size: "245 KB", owner: "Somchai Prasert", emp: E.CEO },
    { name: "Employment Contract - Nattapong Wiset.pdf", type: "pdf", cat: "Contract", size: "238 KB", owner: "Nattapong Wiset", emp: E.VP_ENG },
    { name: "Company Policy Handbook 2026.pdf", type: "pdf", cat: "Policy", size: "1.2 MB", owner: "System Admin", emp: ADMIN_EMP_ID },
    { name: "Information Security Policy.pdf", type: "pdf", cat: "Policy", size: "890 KB", owner: "System Admin", emp: ADMIN_EMP_ID },
    { name: "Employee Code of Conduct.pdf", type: "pdf", cat: "Policy", size: "456 KB", owner: "System Admin", emp: ADMIN_EMP_ID },
    { name: "ID Card - Tanaka Hiroshi.jpg", type: "jpg", cat: "ID", size: "1.8 MB", owner: "Tanaka Hiroshi", emp: E.SR_ENG },
    { name: "AWS Certification - David Kim.pdf", type: "pdf", cat: "Certificate", size: "320 KB", owner: "David Kim", emp: E.DEVOPS },
    { name: "React Certification - Lin Mei Chen.pdf", type: "pdf", cat: "Certificate", size: "290 KB", owner: "Lin Mei Chen", emp: E.FS_DEV },
    { name: "Annual Budget Report 2025.xlsx", type: "xlsx", cat: "Report", size: "2.1 MB", owner: "Napat Kittisak", emp: E.FIN_MGR },
    { name: "Tax Filing Q1 2026.pdf", type: "pdf", cat: "Tax", size: "1.5 MB", owner: "Yuki Tanabe", emp: E.ACCT },
    { name: "NDA - Priya Sharma.pdf", type: "pdf", cat: "Contract", size: "180 KB", owner: "Priya Sharma", emp: E.ENG_MGR },
    { name: "Onboarding Checklist Template.docx", type: "docx", cat: "Template", size: "85 KB", owner: "Siriporn Maneerat", emp: E.HR_SPEC },
  ];

  for (const d of docs) {
    await query(
      `INSERT INTO documents (name, type, category, size, owner_name, employee_id, file_path, uploaded_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() - interval '${rand(1, 90)} days', 'Active')`,
      [d.name, d.type, d.cat, d.size, d.owner, d.emp, `documents/${d.name}`]
    );
  }
}

// ============================================================
// SECTION 11: ONBOARDING TASKS
// ============================================================

async function seedOnboardingTasks() {
  console.log("  [11/20] Onboarding Tasks...");

  const onboardingFor = [
    { emp: E.JR_DEV, name: "Arisa Nakamura" },
    { emp: E.INTERN, name: "Ploy Rattanawan" },
  ];

  const taskTemplates = [
    { title: "Complete personal information form", stage: "Before Start", priority: "High" },
    { title: "Set up company email and Slack", stage: "Day 1", priority: "High" },
    { title: "Read Employee Handbook", stage: "Day 1", priority: "Medium" },
    { title: "Meet with direct manager", stage: "Day 1", priority: "High" },
    { title: "Set up development environment", stage: "Week 1", priority: "High" },
    { title: "Complete security awareness training", stage: "Week 1", priority: "High" },
    { title: "Review codebase and documentation", stage: "Week 1", priority: "Medium" },
    { title: "Meet team members one-on-one", stage: "Week 1", priority: "Medium" },
    { title: "Submit first pull request", stage: "Month 1", priority: "Medium" },
    { title: "Complete 30-day check-in with HR", stage: "Month 1", priority: "Low" },
  ];

  for (const ob of onboardingFor) {
    const completedCount = ob.emp === E.JR_DEV ? 6 : 4; // Arisa further along
    for (let i = 0; i < taskTemplates.length; i++) {
      const t = taskTemplates[i];
      const completed = i < completedCount;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (i < 4 ? -30 : i < 8 ? -14 : 14));

      await query(
        `INSERT INTO tasks (title, description, stage, assignee, due_date, completed, priority, employee_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          t.title,
          `Onboarding task for ${ob.name}`,
          t.stage,
          ob.name,
          dateFmt(dueDate),
          completed,
          t.priority,
          ob.emp,
        ]
      );
    }
  }
}

// ============================================================
// SECTION 12: ANNOUNCEMENTS
// ============================================================

async function seedAnnouncements() {
  console.log("  [12/20] Announcements...");

  const announcements = [
    { title: "Songkran Holiday Schedule 2026", desc: "The office will be closed from April 13-15 for Songkran. Please plan your work accordingly. We wish everyone a happy and safe celebration!", type: "Holiday", dateStr: "April 6" },
    { title: "Q1 2026 All-Hands Meeting", desc: "Join us for the Q1 all-hands meeting on April 10th at 2:00 PM in the main conference room. We'll review company progress and upcoming goals.", type: "Meeting", dateStr: "March 28" },
    { title: "New Health Insurance Benefits", desc: "We're pleased to announce enhanced health insurance coverage starting May 1st. Details will be shared via email. Contact HR for questions.", type: "Benefits", dateStr: "March 20" },
    { title: "Welcome New Team Members!", desc: "Please welcome Arisa Nakamura (Junior Developer) and Ploy Rattanawan (Engineering Intern) to our team! Say hi when you see them around the office.", type: "Team", dateStr: "March 15" },
    { title: "Office Renovation Notice", desc: "The 3rd floor meeting rooms will be under renovation from April 20-30. Please use the 2nd floor conference rooms during this period.", type: "Facility", dateStr: "March 10" },
    { title: "Annual Company Retreat", desc: "Save the date! Our annual company retreat will be held June 20-22 at Hua Hin. More details coming soon.", type: "Social", dateStr: "March 5" },
  ];

  for (const a of announcements) {
    await query(
      `INSERT INTO announcements (title, description, type, date_str, created_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [a.title, a.desc, a.type, a.dateStr, ADMIN_USER_ID]
    );
  }
}

// ============================================================
// SECTION 13: UPCOMING EVENTS
// ============================================================

async function seedUpcomingEvents() {
  console.log("  [13/20] Upcoming Events...");

  const events = [
    { title: "Songkran Festival", date: "2026-04-13", type: "Social", color: "#f59e0b" },
    { title: "Sprint Planning", date: "2026-04-14", type: "Meeting", color: "#3b82f6" },
    { title: "Tanaka Hiroshi's Birthday", date: "2026-04-18", type: "Birthday", color: "#ec4899" },
    { title: "Q2 OKR Review", date: "2026-04-20", type: "Meeting", color: "#3b82f6" },
    { title: "Design System Workshop", date: "2026-04-25", type: "Meeting", color: "#8b5cf6" },
    { title: "Sarah Johnson's Birthday", date: "2026-05-02", type: "Birthday", color: "#ec4899" },
    { title: "Company Retreat - Hua Hin", date: "2026-06-20", type: "Social", color: "#10b981" },
    { title: "Mid-Year Performance Reviews", date: "2026-07-01", type: "Meeting", color: "#ef4444" },
  ];

  for (const ev of events) {
    await query(
      `INSERT INTO upcoming_events (title, date, type, color, created_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [ev.title, ev.date, ev.type, ev.color, ADMIN_USER_ID]
    );
  }
}

// ============================================================
// SECTION 14: COMPLIANCE ITEMS
// ============================================================

async function seedCompliance() {
  console.log("  [14/20] Compliance Items...");

  const items = [
    { title: "Annual Fire Safety Drill", desc: "Conduct mandatory fire safety drill for all employees per Thai Building Control Act.", cat: "Safety", status: "Completed", priority: "High", risk: "Medium", assignedTo: E.VP_OPS, dept: "Operations", due: "2026-03-31" },
    { title: "PDPA Data Processing Audit", desc: "Annual audit of personal data processing activities to ensure compliance with Thailand's Personal Data Protection Act (PDPA).", cat: "Privacy", status: "In Progress", priority: "High", risk: "High", assignedTo: E.DEVOPS, dept: "Engineering", due: "2026-04-30" },
    { title: "Employee Handbook Update 2026", desc: "Update employee handbook with latest policy changes, new benefits, and revised code of conduct.", cat: "Policy", status: "In Progress", priority: "Medium", risk: "Low", assignedTo: E.HR_SPEC, dept: "Human Resources", due: "2026-05-15" },
    { title: "ISO 27001 Gap Assessment", desc: "Perform gap analysis against ISO 27001:2022 requirements for information security management.", cat: "Security", status: "Draft", priority: "High", risk: "High", assignedTo: E.DEVOPS, dept: "Engineering", due: "2026-06-30" },
    { title: "Workplace Ergonomics Assessment", desc: "Evaluate workstation setups for all employees to prevent repetitive strain injuries.", cat: "Safety", status: "Completed", priority: "Medium", risk: "Low", assignedTo: E.HR_SPEC, dept: "Human Resources", due: "2026-02-28" },
    { title: "Tax Compliance Review Q1", desc: "Review withholding tax calculations and SSF contributions for Q1 2026.", cat: "Financial", status: "Completed", priority: "High", risk: "Medium", assignedTo: E.FIN_MGR, dept: "Finance", due: "2026-04-15" },
    { title: "Anti-Harassment Training", desc: "Mandatory anti-harassment and workplace respect training for all employees.", cat: "Training", status: "Draft", priority: "Medium", risk: "Medium", assignedTo: ADMIN_EMP_ID, dept: "Human Resources", due: "2026-07-31" },
  ];

  for (const item of items) {
    await query(
      `INSERT INTO compliance_items (
        title, description, category, status, priority, risk_level,
        assigned_to, assigned_department, due_date, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [item.title, item.desc, item.cat, item.status, item.priority, item.risk, item.assignedTo, item.dept, item.due, ADMIN_USER_ID]
    );
  }
}

// ============================================================
// SECTION 15: EXPENSE CLAIMS
// ============================================================

async function seedExpenseClaims() {
  console.log("  [15/20] Expense Claims...");

  const claims = [
    { emp: E.SR_ENG, title: "Conference Registration - React Summit 2026", cat: "Training", amount: 15000, date: "2026-03-01", desc: "Registration fee for React Summit Bangkok", status: "Approved", approver: E.ENG_MGR },
    { emp: E.MKT_MGR, title: "Client Dinner - ABC Corp", cat: "Meals", amount: 3500, date: "2026-03-10", desc: "Business dinner with potential client", status: "Approved", approver: E.VP_OPS },
    { emp: E.DEVOPS, title: "Server Monitoring Tools License", cat: "Equipment", amount: 8500, date: "2026-02-15", desc: "Annual license for Datadog monitoring", status: "Approved", approver: E.VP_ENG },
    { emp: E.UX, title: "Figma FigJam License", cat: "Equipment", amount: 4200, date: "2026-03-05", desc: "Annual FigJam license for UX workshops", status: "Approved", approver: E.DESIGN_DIR },
    { emp: E.ENG_MGR, title: "Team Building Lunch", cat: "Meals", amount: 5600, date: "2026-03-20", desc: "Engineering team monthly lunch", status: "Pending", approver: null },
    { emp: E.CONTENT, title: "Photography Equipment Rental", cat: "Equipment", amount: 2800, date: "2026-03-15", desc: "Camera rental for product shoot", status: "Pending", approver: null },
    { emp: E.FS_DEV, title: "Taxi to Client Office", cat: "Travel", amount: 450, date: "2026-03-18", desc: "Taxi fare for on-site meeting", status: "Pending", approver: null },
    { emp: E.ACCT, title: "Accounting Software Subscription", cat: "Equipment", amount: 6000, date: "2026-02-01", desc: "Annual QuickBooks subscription", status: "Approved", approver: E.FIN_MGR },
    { emp: E.JR_DEV, title: "Online Course - Advanced TypeScript", cat: "Training", amount: 1900, date: "2026-03-01", desc: "Udemy course for skill development", status: "Rejected", approver: E.ENG_MGR, rejReason: "Company provides free access to Udemy Business" },
  ];

  for (const c of claims) {
    await query(
      `INSERT INTO expense_claims (
        employee_id, title, category, amount, expense_date, description,
        status, approver_id, rejection_reason
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [c.emp, c.title, c.cat, c.amount, c.date, c.desc, c.status, c.approver || null, (c as any).rejReason || null]
    );
  }
}

// ============================================================
// SECTION 16: NOTIFICATIONS
// ============================================================

async function seedNotifications() {
  console.log("  [16/20] Notifications...");

  const notifs = [
    { userId: ADMIN_USER_ID, title: "New Leave Request", msg: "Tanaka Hiroshi has submitted a vacation request (Mar 16-20).", type: "leave", link: "/leave", read: false },
    { userId: ADMIN_USER_ID, title: "Expense Claim Submitted", msg: "Priya Sharma submitted an expense claim for team building lunch (฿5,600).", type: "info", link: "/expenses", read: false },
    { userId: ADMIN_USER_ID, title: "New Employee Onboarded", msg: "Ploy Rattanawan has completed initial onboarding setup.", type: "employee", link: "/employees", read: true },
    { userId: ADMIN_USER_ID, title: "Compliance Item Due Soon", msg: "PDPA Data Processing Audit is due on April 30.", type: "warning", link: "/compliance", read: false },
    { userId: ADMIN_USER_ID, title: "Payroll Processed", msg: "March 2026 payroll has been processed for 17 employees.", type: "success", link: "/payroll", read: true },
    { userId: U.SR_ENG, title: "Leave Approved", msg: "Your vacation request (Mar 16-20) has been approved by Priya Sharma.", type: "success", link: "/leave", read: true },
    { userId: U.SR_ENG, title: "Training Assigned", msg: "You have been assigned 'Cloud Infrastructure with AWS' training. Due: April 30.", type: "info", link: "/training", read: false },
    { userId: U.JR_DEV, title: "Leave Rejected", msg: "Your vacation request (Mar 3-7) was rejected. Reason: Sprint deadline.", type: "warning", link: "/leave", read: true },
    { userId: U.JR_DEV, title: "Welcome to HARI!", msg: "Welcome aboard! Complete your onboarding tasks to get started.", type: "info", link: "/onboarding", read: true },
    { userId: U.DEVOPS, title: "New Training Assigned", msg: "You've been assigned 'Information Security Awareness' training.", type: "info", link: "/training", read: true },
    { userId: U.UX, title: "Performance Review Completed", msg: "Your annual performance review has been submitted by Wanchai Thongkam.", type: "success", link: "/employees", read: true },
    { userId: U.INTERN, title: "Welcome to HARI!", msg: "Welcome aboard, Ploy! Start with your onboarding tasks.", type: "info", link: "/onboarding", read: false },
    { userId: U.MKT_MGR, title: "Expense Approved", msg: "Your expense claim 'Client Dinner - ABC Corp' (฿3,500) has been approved.", type: "success", link: "/expenses", read: true },
    { userId: U.FIN_MGR, title: "Payroll Reminder", msg: "March 2026 payroll is due for processing.", type: "warning", link: "/payroll", read: true },
    { userId: U.HR_SPEC, title: "Onboarding Task Reminder", msg: "2 new employees have pending onboarding tasks.", type: "info", link: "/onboarding", read: false },
  ];

  for (const n of notifs) {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link, read)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [n.userId, n.title, n.msg, n.type, n.link, n.read]
    );
  }
}

// ============================================================
// SECTION 17: PERSONAL NOTES
// ============================================================

async function seedPersonalNotes() {
  console.log("  [17/20] Personal Notes...");

  const notes = [
    { content: "Review Q2 hiring budget with Kannika before the board meeting.", color: "yellow", pinned: true },
    { content: "Follow up with Priya about the new microservices architecture proposal.", color: "blue", pinned: false },
    { content: "Schedule 1-on-1 with Arisa for onboarding check-in — she's making great progress!", color: "green", pinned: false },
    { content: "Prepare company retreat logistics: venue deposit, transport, team activities.", color: "pink", pinned: true },
    { content: "PDPA compliance audit deadline: April 30. Need to coordinate with David.", color: "yellow", pinned: false },
  ];

  for (const n of notes) {
    await query(
      `INSERT INTO personal_notes (user_id, content, color, pinned) VALUES ($1,$2,$3,$4)`,
      [ADMIN_USER_ID, n.content, n.color, n.pinned]
    );
  }
}

// ============================================================
// SECTION 18: SURVEY RESPONSES + COMPLETIONS
// ============================================================

async function seedSurveyData() {
  console.log("  [18/20] Survey Responses & Completions...");

  // Get survey question IDs
  const qResult = await query(
    `SELECT id FROM survey_questions WHERE survey_id = $1 ORDER BY sort_order`,
    [SURVEY_ID]
  );
  const questionIds = qResult.rows.map((r: any) => r.id);
  if (questionIds.length === 0) {
    console.log("    No survey questions found. Skipping.");
    return;
  }

  // 10 employees complete the survey
  const completers = [
    E.SR_ENG, E.FS_DEV, E.DEVOPS, E.UX, E.UI,
    E.MKT_MGR, E.CONTENT, E.HR_SPEC, E.ACCT, E.ENG_MGR,
  ];

  for (const empId of completers) {
    // Check if already completed
    const existing = await query(
      `SELECT id FROM survey_completions WHERE survey_id = $1 AND employee_id = $2`,
      [SURVEY_ID, empId]
    );
    if (existing.rows.length > 0) continue;

    // Insert anonymous responses (25 per completer)
    for (const qId of questionIds) {
      // Realistic distribution: mostly 3-5, occasionally 2
      const rating = Math.random() < 0.05 ? 2 : Math.random() < 0.25 ? 3 : Math.random() < 0.55 ? 4 : 5;
      await query(
        `INSERT INTO survey_responses (question_id, rating) VALUES ($1, $2)`,
        [qId, rating]
      );
    }

    // Record completion
    await query(
      `INSERT INTO survey_completions (survey_id, employee_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [SURVEY_ID, empId]
    );
  }
}

// ============================================================
// SECTION 19: STATS (headcount + sentiment)
// ============================================================

async function seedStats() {
  console.log("  [19/20] Dashboard Stats...");

  // Headcount by month
  const headcounts = [
    { name: "Oct", value: 14 },
    { name: "Nov", value: 15 },
    { name: "Dec", value: 15 },
    { name: "Jan", value: 16 },
    { name: "Feb", value: 17 },
    { name: "Mar", value: 18 },
  ];

  for (const h of headcounts) {
    await query(
      `INSERT INTO stats_headcount (name, value) VALUES ($1, $2)`,
      [h.name, h.value]
    );
  }

  // Sentiment stats
  const sentiments = [
    { name: "Happy", value: 62 },
    { name: "Neutral", value: 25 },
    { name: "Stressed", value: 10 },
    { name: "Burned Out", value: 3 },
  ];

  for (const s of sentiments) {
    await query(
      `INSERT INTO sentiment_stats (name, value) VALUES ($1, $2)`,
      [s.name, s.value]
    );
  }
}

// ============================================================
// SECTION 20: SYSTEM CONFIGS
// ============================================================

async function seedSystemConfigs() {
  console.log("  [20/20] System Configs...");

  // Ensure table exists
  await query(`
    CREATE TABLE IF NOT EXISTS system_configs (
      id SERIAL PRIMARY KEY,
      category VARCHAR(100) NOT NULL,
      key VARCHAR(100) NOT NULL,
      value TEXT NOT NULL,
      data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category, key)
    )
  `);

  const configs = [
    { cat: "app", key: "name", val: "HARI HR System", type: "string", desc: "Application display name" },
    { cat: "app", key: "currency", val: "THB", type: "string", desc: "Default currency" },
    { cat: "app", key: "timezone", val: "Asia/Bangkok", type: "string", desc: "Default timezone" },
    { cat: "app", key: "language", val: "en", type: "string", desc: "Default language (en/th)" },
    { cat: "leave", key: "quotas", val: JSON.stringify([
      { type: "Vacation", total: 7 },
      { type: "Sick Leave", total: 30 },
      { type: "Personal Day", total: 6 },
      { type: "Maternity Leave", total: 120 },
      { type: "Compensatory Leave", total: -1 },
      { type: "Military Leave", total: 60 },
      { type: "Leave Without Pay", total: -1 },
    ]), type: "json", desc: "Leave quotas by type. -1 = unlimited" },
    { cat: "attendance", key: "late_threshold", val: "09:00", type: "string", desc: "Late threshold (HH:mm) Bangkok timezone" },
    { cat: "attendance", key: "work_end", val: "18:00", type: "string", desc: "Work end time (HH:mm)" },
    { cat: "attendance", key: "standard_hours", val: "8", type: "number", desc: "Standard working hours per day" },
    { cat: "payroll", key: "ssf_rate", val: "0.05", type: "number", desc: "Social Security Fund rate (employee)" },
    { cat: "payroll", key: "ssf_cap", val: "750", type: "number", desc: "Max SSF contribution per month (THB)" },
    { cat: "payroll", key: "pvf_rate", val: "0.03", type: "number", desc: "Provident Fund rate (employee)" },
    { cat: "payroll", key: "payment_method", val: "Bank Transfer", type: "string", desc: "Default payment method" },
  ];

  for (const c of configs) {
    await query(
      `INSERT INTO system_configs (category, key, value, data_type, description)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (category, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [c.cat, c.key, c.val, c.type, c.desc]
    );
  }
}

// ============================================================
// MAIN
// ============================================================

export async function seedDemoData() {
  // Idempotency check
  const existing = await query(
    `SELECT COUNT(*)::int AS c FROM employees WHERE id = $1`,
    [E.CEO]
  );
  if (existing.rows[0].c > 0) {
    console.log("Demo data already seeded. Skipping.");
    return;
  }

  console.log("Seeding comprehensive demo data...\n");
  const hash = await bcrypt.hash("Demo123!", 10);

  await seedUsersAndEmployees(hash);
  await seedAttendance();
  await seedLeaveRequests();
  await seedHolidays();
  await seedPayroll();
  await seedSalaryHistory();
  await seedTraining();
  await seedJobHistory();
  await seedPerformanceReviews();
  await seedDocuments();
  await seedOnboardingTasks();
  await seedAnnouncements();
  await seedUpcomingEvents();
  await seedCompliance();
  await seedExpenseClaims();
  await seedNotifications();
  await seedPersonalNotes();
  await seedSurveyData();
  await seedStats();
  await seedSystemConfigs();

  console.log("\nDemo data seeded successfully!");
  console.log("──────────────────────────────────────");
  console.log("  Admin:     admin@aiya.ai / Welcome123!");
  console.log("  Employees: <name>@aiya.ai / Demo123!");
  console.log("  Total:     18 employees across 6 departments");
  console.log("──────────────────────────────────────");
}

// Standalone execution
if (require.main === module) {
  seedDemoData()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
