import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// This API returns transactions JSON from a PHP endpoint hosted in XAMPP
// or from a JSON file in the XAMPP htdocs folder.
// Configuration (optional via environment):
// - XAMPP_PHP_URL: full URL to the PHP endpoint that outputs JSON (e.g. http://localhost/transactions.php)
// - XAMPP_HTDOCS_PATH: path to XAMPP htdocs (default: /Applications/XAMPP/htdocs)
// - XAMPP_FILE_NAME: name of the fallback JSON file (default: transactions.json)

const DEFAULT_HTDOCS = process.env.XAMPP_HTDOCS_PATH || "/Applications/XAMPP/htdocs";
const FALLBACK_FILE = process.env.XAMPP_FILE_NAME || "transactions.json";

export async function GET() {
  function errorMessage(err: unknown) {
    if (err && typeof err === 'object' && 'message' in err) return String((err as any).message);
    return String(err);
  }
  const phpUrl = process.env.XAMPP_PHP_URL;

  if (phpUrl) {
    try {
      const res = await fetch(phpUrl, { cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: `Upstream returned ${res.status}` },
          { status: 502 }
        );
      }
      const data = await res.json();
      return NextResponse.json({ ok: true, data });
    } catch (err: unknown) {
      return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 502 });
    }
  }

  // Fallback: read JSON file from htdocs
  const filePath = path.join(DEFAULT_HTDOCS, FALLBACK_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, data });
  } catch (err: unknown) {
    const msg = errorMessage(err);
    return NextResponse.json(
      { ok: false, error: `Could not read transactions from ${filePath}: ${msg}` },
      { status: 500 }
    );
  }
}
