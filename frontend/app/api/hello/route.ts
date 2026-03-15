import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Reads a file from the XAMPP htdocs folder and returns its contents.
// Configure with environment variable XAMPP_HTDOCS_PATH. Defaults to
// macOS typical install location: /Applications/XAMPP/htdocs

const HTDOCS_PATH = process.env.XAMPP_HTDOCS_PATH || "/Applications/XAMPP/htdocs";
const FILE_NAME = process.env.HTDOCS_FILE || "hello.txt"; // default file name to read

function errorMessage(err: unknown) {
  if (err && typeof err === 'object' && 'message' in err) return String((err as any).message);
  return String(err);
}

export async function GET() {
  const filePath = path.join(HTDOCS_PATH, FILE_NAME);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return NextResponse.json({ ok: true, content });
  } catch (err: unknown) {
    const msg = errorMessage(err);
    return NextResponse.json(
      { ok: false, error: `Could not read file at ${filePath}: ${msg}` },
      { status: 500 }
    );
  }
}
