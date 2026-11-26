// test/records.rules.test.ts

import { describe, it, expect } from "vitest";
import request from "supertest";

const BASE = process.env.API_URL ?? "http://localhost:3000";
const unique = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

async function post(path: string, body: unknown, expectedStatus = 201) {
  const r = await request(BASE).post(path).send(body as object).set("content-type", "application/json");
  expect(r.status, JSON.stringify(r.body)).toBe(expectedStatus);
  return r.body;
}

async function companyWithBranches(cities: string[]) {
  const company = await post("/companies", { name: unique("Company") });
  const branches = [];
  for (const city of cities) branches.push(await post("/branches", { companyId: company.id, city }));
  return { company, branches };
}

describe("input validation", () => {
  it.each([[""], ["   "]])("rejects company name %j with a 400 and field errors", async (name) => {
    const body = await post("/companies", { name }, 400);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.fields.name).toBeDefined();
  });

  it("reports a missing company name in the same error shape", async () => {
    const body = await post("/companies", {}, 400);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.fields.name).toBeDefined();
  });

  it("reports malformed JSON as a 400", async () => {
    const r = await request(BASE).post("/companies").set("content-type", "application/json").send("{bad");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("BAD_REQUEST");
  });

  it.each(["abc", "-1", "0", "101"])("rejects top-candidates limit=%s", async (limit) => {
    const { company, branches } = await companyWithBranches(["Berlin"]);
    const job = await post("/jobs", { companyId: company.id, title: "Picker", branchIds: [branches[0].id] });
    const r = await request(BASE).get(`/jobs/${job.id}/top-candidates?branchId=${branches[0].id}&limit=${limit}`);
    expect(r.status).toBe(400);
    expect(r.body.error.fields.limit).toBeDefined();
  });
});

describe("applicants", () => {
  it("allows two applicants to share an email", async () => {
    const email = `${unique("shared")}@example.test`;
    const first = await post("/applicants", { name: "First Person", email });
    const second = await post("/applicants", { name: "Second Person", email });
    expect(first.id).not.toBe(second.id);
  });

  it("keeps an applicant with submissions and explains why", async () => {
    const applicant = await post("/applicants", { name: "Tested Person", email: `${unique("a")}@example.test` });
    const template = await post("/assessment-templates", {
      title: "Rules test",
      profileKey: unique("profile"),
      items: [{ text: "Is this a question?", correctOption: 1, weight: 1 }]
    });
    const full = await request(BASE).get(`/assessment-templates/${template.id}`);
    await post("/submissions", {
      applicantId: applicant.id,
      templateId: template.id,
      answers: [{ itemId: full.body.items[0].id, chosenOption: 1 }]
    });

    const r = await request(BASE).delete(`/applicants/${applicant.id}`);
    expect(r.status).toBe(409);
    expect((await request(BASE).get(`/applicants/${applicant.id}`)).status).toBe(200);
  });
});

describe("jobs and branches", () => {
  it("creates a job at the given branches and finds it by branch", async () => {
    const { company, branches } = await companyWithBranches(["Berlin", "Munich"]);
    const job = await post("/jobs", {
      companyId: company.id,
      title: "Driver",
      branchIds: [branches[0].id, branches[0].id]
    });
    expect(job.branchIds).toEqual([branches[0].id]);

    const atBerlin = await request(BASE).get(`/jobs?branchId=${branches[0].id}`);
    const atMunich = await request(BASE).get(`/jobs?branchId=${branches[1].id}`);
    expect(atBerlin.body.data.map((j: any) => j.id)).toContain(job.id);
    expect(atMunich.body.data.map((j: any) => j.id)).not.toContain(job.id);
  });

  it("requires at least one branch", async () => {
    const { company } = await companyWithBranches(["Berlin"]);
    await post("/jobs", { companyId: company.id, title: "Driver" }, 400);
    await post("/jobs", { companyId: company.id, title: "Driver", branchIds: [] }, 400);
  });

  it("rejects another company's branch and creates nothing", async () => {
    const a = await companyWithBranches(["Berlin"]);
    const b = await companyWithBranches(["Hamburg"]);
    const body = await post("/jobs", { companyId: a.company.id, title: "Driver", branchIds: [b.branches[0].id] }, 400);
    expect(body.error.fields.branchIds).toHaveLength(1);

    const jobs = await request(BASE).get(`/jobs?companyId=${a.company.id}`);
    expect(jobs.body.data).toHaveLength(0);
  });

  it("refuses to rank a job at a branch that does not offer it", async () => {
    const { company, branches } = await companyWithBranches(["Berlin", "Munich"]);
    const job = await post("/jobs", { companyId: company.id, title: "Driver", branchIds: [branches[0].id] });
    const body = await post("/matches", { jobId: job.id, branchId: branches[1].id }, 400);
    expect(body.error.message).toMatch(/not offered/i);
  });
});

describe("deleting records", () => {
  it("returns 409 while dependents exist, then deletes in order", async () => {
    const { company, branches } = await companyWithBranches(["Berlin"]);
    const job = await post("/jobs", { companyId: company.id, title: "Driver", branchIds: [branches[0].id] });

    expect((await request(BASE).delete(`/companies/${company.id}`)).status).toBe(409);
    expect((await request(BASE).delete(`/branches/${branches[0].id}`)).status).toBe(409);

    expect((await request(BASE).delete(`/jobs/${job.id}`)).status).toBe(204);
    expect((await request(BASE).delete(`/branches/${branches[0].id}`)).status).toBe(204);
    expect((await request(BASE).delete(`/companies/${company.id}`)).status).toBe(204);
  });

  it.each(["companies", "branches", "jobs", "applicants"])("returns 404 for an unknown id in /%s", async (resource) => {
    const r = await request(BASE).delete(`/${resource}/does-not-exist`);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("NOT_FOUND");
  });
});

describe("submissions", () => {
  async function applicantAndOneItemTemplate() {
    const applicant = await post("/applicants", { name: "Test Taker", email: `${unique("s")}@example.test` });
    const template = await post("/assessment-templates", {
      title: "Duplicate answers",
      profileKey: unique("profile"),
      items: [{ text: "Is this a question?", correctOption: 1, weight: 3 }]
    });
    const full = await request(BASE).get(`/assessment-templates/${template.id}`);
    return { applicantId: applicant.id, templateId: template.id, itemId: full.body.items[0].id };
  }

  it("rejects a question answered twice and saves nothing", async () => {
    const { applicantId, templateId, itemId } = await applicantAndOneItemTemplate();
    const answer = { itemId, chosenOption: 1 };
    const body = await post("/submissions", { applicantId, templateId, answers: [answer, answer] }, 400);
    expect(body.error.fields["answers.1.itemId"]).toBeDefined();

    // An applicant with a saved submission can't be deleted, so 204 proves nothing was stored
    expect((await request(BASE).delete(`/applicants/${applicantId}`)).status).toBe(204);
  });

  it("counts each question's weight once", async () => {
    const { applicantId, templateId, itemId } = await applicantAndOneItemTemplate();
    const body = await post("/submissions", { applicantId, templateId, answers: [{ itemId, chosenOption: 1 }] });
    expect(body.summary).toEqual({ answered: 1, correctWeight: 3, wrongWeight: 0 });
  });
});
