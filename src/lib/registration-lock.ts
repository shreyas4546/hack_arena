import fs from "fs";
import path from "path";

const LOCK_FILE = path.join(process.cwd(), ".registration-lock.json");

function readLockFile(): { locked: boolean } {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const raw = fs.readFileSync(LOCK_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch { /* ignore parse errors */ }
  return { locked: false };
}

function writeLockFile(data: { locked: boolean }) {
  fs.writeFileSync(LOCK_FILE, JSON.stringify(data), "utf-8");
}

export function isRegistrationLocked(): boolean {
  return readLockFile().locked;
}

export function setRegistrationLocked(locked: boolean): void {
  writeLockFile({ locked });
}
