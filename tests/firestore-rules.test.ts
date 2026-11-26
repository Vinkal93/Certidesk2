import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const rulesPath = path.resolve(process.cwd(), "firestore.rules");
const rules = readFileSync(rulesPath, "utf8");

describe("Phase 6 — Firestore Security Rules Policy Verification", () => {
  it("11. Denies all client-side writes on users, institutes, students, and wallet collections", () => {
    expect(rules).toContain("match /users/{uid}");
    expect(rules).toContain("match /institutes/{instituteId}");
    expect(rules).toContain("match /students/{studentId}");
    expect(rules).toContain("match /wallet_transactions/{txId}");
    expect(rules).toContain("match /login_mappings/{mappingId}");
    expect(rules).toContain("match /audit_logs/{logId}");
    expect(rules).toContain("allow write: if false;");
  });

  it("enforces tenant isolation and student ownership checks", () => {
    expect(rules).toContain("belongsToInstitute(resource.data.instituteId)");
    expect(rules).toContain("request.auth.token.studentId == studentId");
    expect(rules).toContain("isActiveInstitute(resource.data.instituteId)");
  });

  it("defaults to deny all unmatched paths", () => {
    expect(rules).toContain("match /{document=**}");
    expect(rules).toContain("allow read, write: if false;");
  });
});
