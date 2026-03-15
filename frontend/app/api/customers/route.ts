import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Server-side proxy for customers.json to avoid CORS on the client.
// Configure with environment variables if needed:
// - XAMPP_CUSTOMERS_URL (e.g. http://localhost/customers.json)
// - XAMPP_HTDOCS_PATH (path to htdocs)
// - XAMPP_CUSTOMERS_FILE (filename in htdocs)

const CUSTOMERS_URL = process.env.XAMPP_CUSTOMERS_URL || "http://localhost/customers.json";
const HTDOCS_PATH = process.env.XAMPP_HTDOCS_PATH || "/Applications/XAMPP/htdocs";
const CUSTOMERS_FILE = process.env.XAMPP_CUSTOMERS_FILE || "customers.json";

type Account = { number: string; currency?: string };
type Customer = { name: string; email?: string; customer_id?: string; accounts?: Account[]; bank?: unknown };

export async function GET() {
  // Try fetching from configured URL first (server-side fetch)
  try {
    const res = await fetch(CUSTOMERS_URL, { cache: "no-store" });
    if (res.ok) {
      const data: Customer[] = await res.json();
      return NextResponse.json({ ok: true, data });
    }
  } catch (_) {
    // fall through to file read
  }

  // Fallback: read from htdocs file
  try {
    const filePath = path.join(HTDOCS_PATH, CUSTOMERS_FILE);
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, data });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
