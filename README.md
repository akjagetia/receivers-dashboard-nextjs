# Receivers Dashboard (Next.js)

This repository is a small Next.js app that demonstrates a transactions dashboard which can read JSON produced from a PHP/XAMPP htdocs location (or from bundled sample JSON). It includes a transactions UI, a customer details modal with account filters, and a small SSE endpoint to stream updates during development.

## Quick checklist

- Install deps
- (Optional) copy sample JSON into XAMPP htdocs if you want Apache to serve it
- Run the dev server
- Open the transactions UI at `/transactions`

## Requirements

- Node.js 18+ (same major used by your Next.js version)
- npm (or yarn/pnpm)
- Optional: XAMPP/Apache to serve `customers.json`/`transactions.json` on port 80

## Install and run (development)

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the dashboard in your browser:

```
http://localhost:3000/transactions
```

## Environment configuration

The app supports a few environment variables to control where the server-side APIs read transactions/customers from. Create a `.env.local` at the project root to override any of these.

- `XAMPP_PHP_URL` — full URL to a PHP endpoint that returns JSON (e.g. `http://localhost/transactions.php`). When set, `/api/transactions` will proxy this URL.
- `XAMPP_HTDOCS_PATH` — path to your XAMPP htdocs directory (default on macOS in this repo: `/Applications/XAMPP/htdocs`).
- `XAMPP_FILE_NAME` — fallback filename in htdocs for transactions (default: `transactions.json`).
- `XAMPP_CUSTOMERS_URL` — server-side fetch URL for customers (default: `http://localhost/customers.json`).
- `XAMPP_CUSTOMERS_FILE` — filename in htdocs for customers (default: `customers.json`).

Example `.env.local` for quick local testing (use the bundled sample JSON served by Next):

```env
XAMPP_PHP_URL=http://localhost:3000/transactions.json
```

## Using Apache/XAMPP files

If you want the app to read files from XAMPP's `htdocs` folder (so a separate PHP script can generate them), copy the sample files into the htdocs location. On macOS the path used by default in this repo is `/Applications/XAMPP/htdocs`.

Copy sample files (requires sudo for system-wide XAMPP installs):

Copy backend/transactions.json to /Applications/XAMPP/htdocs/transactions.json
Copy backend/customers.json /Applications/XAMPP/htdocs/customers.json


If you don't want to copy files, you can point `XAMPP_PHP_URL` at the bundled `transactions.json` as shown above.

## Server API endpoints

- `GET /api/transactions` — returns JSON from `XAMPP_PHP_URL` if configured, otherwise reads `XAMPP_HTDOCS_PATH/XAMPP_FILE_NAME`.
- `GET /api/customers` — server-side proxy for customers JSON (tries `XAMPP_CUSTOMERS_URL` then htdocs fallback).
- `GET /api/transactions/stream` — server-sent events (SSE) endpoint that polls the same source and broadcasts updates to connected clients.

These endpoints are intended for development/testing and include helpful fallbacks.

## How the UI behaves

- Open `/transactions` to see a table of transactions.
- Click `View` on a row to open the customer modal. The modal lists accounts and shows transactions related to that customer.
- The modal contains three small account filters (currencies AED / USD / CAD). Enter an account number in any box to filter the transactions shown in the modal.
- The modal attempts to prefill the search box that matches the clicked transaction's currency/account.
- The page subscribes to `/api/transactions/stream` via EventSource for live updates during development; updated rows are briefly highlighted when their status changes.

## Troubleshooting

- Permission denied when copying to XAMPP htdocs: use `sudo` as shown above.
- If Apache is using port 80 and you also try to host files there, ensure Apache is running and serving files at `http://localhost/customers.json`.
- To test without XAMPP, set `XAMPP_PHP_URL` to `http://localhost:3000/transactions.json` in `.env.local` and restart the dev server.
- Lint/type checks:

```bash
npm run lint
npx tsc --noEmit
```

## Developer notes & next steps

- The code includes small server-side helpers in `app/api/*` for proxying htdocs data and an SSE test endpoint; these are intended for development only.
- If you want SVG flags, better icons, or split the modal into separate components, it's straightforward to extract `app/transactions/page.tsx` into smaller components.

If you'd like, I can:
- Add SVG flag assets and wire them into the modal inputs.
- Extract the modal into a separate component and add unit tests for the account matching logic.

---

If anything in this README should be expanded or adapted to your local setup (different XAMPP path, custom PHP endpoint, etc.), tell me the details and I'll update the instructions.
