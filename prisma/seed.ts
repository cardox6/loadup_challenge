// prisma/seed.ts
import { PrismaClient } from "../src/generated/prisma";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// ---- Tunables (override via env) ----
const COMPANY_COUNT         = Number(process.env.SEED_COMPANIES ?? 4);
const BRANCHES_PER_COMPANY  = Number(process.env.SEED_BRANCHES ?? 2);
const JOBS_PER_COMPANY      = Number(process.env.SEED_JOBS ?? 2);
const APPLICANTS            = Number(process.env.SEED_APPLICANTS ?? 1000);
const TEMPLATES             = Number(process.env.SEED_TEMPLATES ?? 3);
const ITEMS_PER_TEMPLATE    = Number(process.env.SEED_ITEMS ?? 10);

const CITY_POOL = ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"];
const pickCity = () =>
  Math.random() < 0.7 ? CITY_POOL[Math.floor(Math.random() * CITY_POOL.length)] : faker.location.city();

// Realistic logistics company names
const COMPANY_NAMES = [
  "DB Schenker", 
  "DHL Logistics", 
  "Hermes Group", 
  "GLS Germany",
  "DPD Deutschland",
  "UPS Supply Chain"
];

// Logistics job profiles
const JOB_PROFILES = [
  { title: "Warehouse Manager",      template: "warehouse_management" },
  { title: "Delivery Driver",        template: "driving_logistics" },
  { title: "Logistics Coordinator",  template: "logistics_coordination" }
];

const TEMPLATE_CONFIGS = [
  {
    title: "Warehouse Management Skills",
    profileKey: "warehouse_management",
    questionTypes: ["inventory", "safety", "management", "processes"]
  },
  {
    title: "Driving & Logistics Skills",
    profileKey: "driving_logistics",
    questionTypes: ["navigation", "vehicle_safety", "customer_service", "time_management"]
  },
  {
    title: "Logistics Coordination Skills",
    profileKey: "logistics_coordination",
    questionTypes: ["planning", "communication", "problem_solving", "systems"]
  }
];

function pick<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; }
function ri(n: number)   { return Math.floor(Math.random() * n); }
function rb(p = 0.5)     { return Math.random() < p; }

async function main() {
  console.log("🌱 Seeding…");

  // 1) Companies, branches
  const companies = [];
  for (let c = 0; c < COMPANY_COUNT; c++) {
    const companyName = COMPANY_NAMES[c % COMPANY_NAMES.length] || `Company ${c + 1}`;
    const company = await prisma.company.create({ data: { name: companyName } });
    companies.push(company);
    for (let b = 0; b < BRANCHES_PER_COMPANY; b++) {
      await prisma.branch.create({ data: { companyId: company.id, city: pickCity() } });
    }
  }

  // 2) Templates & items (with weighted question categories)
  const templates = [];
  for (let t = 0; t < TEMPLATES; t++) {
    const cfg = TEMPLATE_CONFIGS[t % TEMPLATE_CONFIGS.length];
    const template = await prisma.assessmentTemplate.create({
      data: { title: cfg.title, profileKey: cfg.profileKey }
    });
    templates.push(template);

    const questions = Array.from({ length: ITEMS_PER_TEMPLATE }).map(() => {
      const qt = pick(cfg.questionTypes);
      const weight = qt === "safety" ? 3 : qt === "management" ? 2 : 1;
      return {
        templateId: template.id,
        text: `${qt.toUpperCase()}: ${faker.lorem.sentence({ min: 8, max: 15 })}?`,
        correctOption: ri(4),
        weight
      };
    });
    await prisma.assessmentItem.createMany({ data: questions });
  }

  // ---- Prefetch items per template (avoid N+1) ----
  const itemsByTemplate = new Map<string, { id: string; correctOption: number; weight: number }[]>();
  for (const t of templates) {
    const items = await prisma.assessmentItem.findMany({
      where: { templateId: t.id },
      select: { id: true, correctOption: true, weight: true }
    });
    itemsByTemplate.set(t.id, items);
  }

  // 3) Jobs → link to templates by profileKey
  let jobIndex = 0;
  for (const company of companies) {
    for (let j = 0; j < JOBS_PER_COMPANY; j++) {
      const profile = JOB_PROFILES[jobIndex % JOB_PROFILES.length];
      const template = templates.find((t) => t.profileKey === profile.template);
      await prisma.job.create({
        data: {
          companyId: company.id,
          title: `${profile.title} - ${company.name}`,
          templateId: template?.id ?? null
        }
      });
      jobIndex++;
    }
  }

  // 4) Applicants
  for (let i = 1; i <= APPLICANTS; i += 500) {
    await prisma.applicant.createMany({
      data: Array.from({ length: Math.min(500, APPLICANTS - (i - 1)) }).map((_, k) => {
        const n = i + k;
        return {
          name: faker.person.fullName(),
          email: `applicant_${n}@example.test`,
          city: pickCity(),
          createdAt: faker.date.recent({ days: 90 })
        };
      }),
      skipDuplicates: true
    });
  }

  // 5) Submissions + answers (snapshot isCorrect & weight)
  const applicants = await prisma.applicant.findMany({ select: { id: true } });

  for (const a of applicants) {
    if (!rb(0.85)) continue; // ~85% take at least one assessment
    const numAssessments = rb(0.3) ? 2 : 1;
    const chosen = faker.helpers.arrayElements(templates, numAssessments);

    for (const t of chosen) {
      const items = itemsByTemplate.get(t.id)!; // from prefetch
      const submission = await prisma.submission.create({
        data: { applicantId: a.id, templateId: t.id, submittedAt: faker.date.recent({ days: 30 }) }
      });

      const answers = items.map((it) => {
        const correct = rb(0.65);
        const chosenOpt = correct ? it.correctOption : (it.correctOption + 1 + ri(3)) % 4;
        return {
          submissionId: submission.id,
          itemId: it.id,
          chosenOption: chosenOpt,
          isCorrect: correct,
          itemWeight: it.weight
        };
      });
      await prisma.submissionAnswer.createMany({ data: answers });
    }
  }

  console.log("✅ Seed done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
