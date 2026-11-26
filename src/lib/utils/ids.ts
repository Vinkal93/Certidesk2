import { randomBytes } from "crypto";

export function generateId(prefix: string): string {
  const token = randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}_${token}`;
}

export function generateInstituteCode(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4)
    .padEnd(3, "X");
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `INS-${cleaned}-${suffix}`;
}

export function generateStudentCode(instituteCode: string): string {
  const shortInst = instituteCode.replace(/[^A-Z0-9]/g, "").slice(-4);
  const year = new Date().getUTCFullYear().toString().slice(-2);
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `STU-${shortInst}${year}-${suffix}`;
}
