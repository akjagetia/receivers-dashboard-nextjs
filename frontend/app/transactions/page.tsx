"use client";

import { useEffect, useRef, useState } from "react";

type Transaction = {
  date_time: string;
  request_id: string;
  type: string;
  to: string;
  customer_id?: string;
  amount: string;
  currency?: string;
  to_account?: string;
  status: string;
};

type Account = { number: string; currency?: string };
type Bank = { country?: string; bank_name?: string; branch?: string; swift?: string };
type Customer = { name: string; email?: string; customer_id?: string; accounts?: Account[]; bank?: Bank };

export default function TransactionsPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const prevStatuses = useRef<Record<string, string>>({});
  const [highlighted, setHighlighted] = useState<Record<string, boolean>>({});
  const initialLoaded = useRef(false);
  const [searchQuery] = useState("");
  const [customerTxns, setCustomerTxns] = useState<Transaction[]>([]);
  const [searchBoxes, setSearchBoxes] = useState(
    () => [
      { currency: "AED", account: "" },
      { currency: "USD", account: "" },
      { currency: "CAD", account: "" },
    ] as { currency: string; account: string }[]
  );

  const currencyFlag = (c: string) => {
    const code = (c || "").toUpperCase();
    switch (code) {
      case "AED":
        return "🇦🇪";
      case "USD":
        return "🇺🇸";
      case "CAD":
        return "🇨🇦";
      case "USDT":
        return "🔗";
      default:
        return "🏳️";
    }
  };

  useEffect(() => {
    let mounted = true;
    const es = new EventSource("/api/transactions/stream");
  es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data || "null") || [];
        if (!mounted) return;
        const next = Array.isArray(payload) ? payload : (payload.data || []);
        const newHighlights: Record<string, boolean> = {};
        try {
          for (const item of next) {
            const id = item.request_id;
            const prevStatus = prevStatuses.current[id];
            if (prevStatus && prevStatus !== item.status) {
              newHighlights[id] = true;
            }
            prevStatuses.current[id] = item.status;
          }
        } catch (e) {
          console.error('Error while comparing statuses', e);
        }

        if (Object.keys(newHighlights).length > 0) {
          setHighlighted((h) => ({ ...h, ...newHighlights }));
          setTimeout(() => {
            setHighlighted((h) => {
              const copy = { ...h };
              for (const k of Object.keys(newHighlights)) delete copy[k];
              return copy;
            });
          }, 2000);
        }

        try {
          const prevStr = JSON.stringify(data || []);
          const nextStr = JSON.stringify(next || []);
          if (prevStr !== nextStr) setData(next);
        } catch (e) {
          console.error('Failed to compare data snapshots, replacing data', e);
          setData(next);
        }

        if (!initialLoaded.current) {
          initialLoaded.current = true;
          setLoading(false);
        }
      } catch (e) {
        // ignore parse errors
      }
    };
  // Ignore connection errors client-side; the stream will attempt reconnects.
  es.onerror = () => {};

    return () => {
      mounted = false;
      es.close();
    };
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Receivers</h2>
      </div>

      <div className="overflow-x-auto rounded bg-white p-4 shadow">
        <table className="w-full table-auto text-left">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-3">Date & Time</th>
              <th className="py-3">Request ID</th>
              <th className="py-3">Type</th>
              <th className="py-3">To</th>
              <th className="py-3">Amount</th>
              <th className="py-3">Status</th>
              <th className="py-3">Actions</th>
            </tr>
          </thead>
    <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  Loading...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && data.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-500">
                  No transactions
                </td>
              </tr>
            )}

        {data.map((t) => {
          const isHighlighted = highlighted[t.request_id];
          return (
          <tr key={t.request_id} className={`border-t ${isHighlighted ? 'bg-yellow-50' : ''}`}>
                <td className="py-4 align-top">{t.date_time}</td>
                <td className="py-4 align-top">{t.request_id}</td>
                <td className="py-4 align-top">
                  <div className="font-semibold">{t.type}</div>
                </td>
                <td className="py-4 align-top">{t.to}</td>
                <td className="py-4 align-top">{t.amount}</td>
                <td className="py-4 align-top">
                  <StatusBadge status={t.status} />
                </td>
                <td className="py-4 align-top">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/customers`);
                        const json = await res.json();
                        const list: Customer[] = json?.data && Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];

                        // 1) try match by customer_id
                        let found: Customer | null = null;
                        if (t.customer_id) {
                          found = list.find((c) => c.customer_id === t.customer_id) || null;
                        }

                        // 2) try match by name
                        if (!found) {
                          found = list.find((c) => c.name === t.to) || null;
                        }

                        // 3) try match by account numbers appearing in the clicked transaction fields
                        if (!found && list.length) {
                          const txStr = JSON.stringify(t);
                          for (const c of list) {
                            if (!c.accounts) continue;
                            for (const acc of c.accounts) {
                              if (txStr.includes(String(acc.number))) {
                                found = c;
                                break;
                              }
                            }
                            if (found) break;
                          }
                        }

                        // 4) if still not found, try to find a customer whose account appears in any related transaction for this 'to' name
                        if (!found && list.length) {
                          const related = data.filter((x) => x.to === t.to || x.customer_id === t.customer_id);
                          const relatedStr = JSON.stringify(related);
                          for (const c of list) {
                            if (!c.accounts) continue;
                            for (const acc of c.accounts) {
                              if (relatedStr.includes(String(acc.number))) {
                                found = c;
                                break;
                              }
                            }
                            if (found) break;
                          }
                        }

                        const selected: Customer = found || { name: t.to, customer_id: t.customer_id };

                        // compute customer transactions from full `data`
                        const matched = data.filter((tx) => {
                          if (tx.customer_id && selected.customer_id && tx.customer_id === selected.customer_id) return true;
                          if (selected?.accounts?.length) {
                            const accNums = (selected.accounts || []).map((a: Account) => String(a.number));
                            for (const val of Object.values(tx)) {
                              if (typeof val !== "string") continue;
                              for (const acc of accNums) {
                                if (acc && val.includes(acc)) return true;
                              }
                            }
                          }
                          // also match by 'to' name as fallback
                          if (tx.to && selected.name && tx.to === selected.name) return true;
                          return false;
                        });

                          // prefill the three search boxes based on the clicked transaction and selected customer
                          try {
                            const txStr = JSON.stringify(t || "");
                            const custAccounts = (selected?.accounts || []).map((a: Account) => ({ number: String(a.number), currency: a.currency || "" }));

                            // try to find an account on the customer that appears in the transaction
                            let matchedAcc: { number: string; currency?: string } | null = null;
                            for (const a of custAccounts) {
                              if (a.number && txStr.includes(a.number)) {
                                matchedAcc = a;
                                break;
                              }
                            }

                            const firstAccount = matchedAcc?.number || t?.to_account || (custAccounts[0] && custAccounts[0].number) || "";

                            // Prefill only the box matching the transaction/matched account currency
                            const template = [
                              { currency: "AED", account: "" },
                              { currency: "USD", account: "" },
                              { currency: "CAD", account: "" },
                            ];

                            const targetCurrency = (matchedAcc && matchedAcc.currency) || t.currency || "";
                            let idx = template.findIndex((b) => b.currency === (targetCurrency || "").toUpperCase());
                            if (idx === -1) {
                              // if transaction currency not one of the defaults, try to place in first empty slot
                              idx = 0;
                            }

                            template[idx] = { currency: template[idx].currency, account: firstAccount || "" };
                            setSearchBoxes(template);
                          } catch (e) {
                            // ignore prefill errors
                          }

                          setCustomer(selected);
                          setCustomerTxns(matched as Transaction[]);
                          setModalOpen(true);
                      } catch (err) {
                        setCustomer({ name: t.to, customer_id: t.customer_id });
                        setCustomerTxns(data.filter((tx) => tx.to === t.to));
                        setModalOpen(true);
                      }
                    }}
                    className="text-blue-600 hover:underline mr-2"
                  >
                    View
                  </button>
                  <a className="text-blue-600 hover:underline">Download File</a>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto">
          <div className="min-h-screen p-8 bg-black/40 flex items-start justify-center">
            <div className="w-[90%] max-w-5xl rounded bg-white p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{customer?.name}</h2>
                  <div className="text-sm text-zinc-600">{customer?.email}</div>
                </div>
                <div>
                  <button
                    className="rounded-full border px-3 py-1"
                    onClick={() => {
                      setModalOpen(false);
                      setCustomer(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* accounts chips */}
                <div className="mt-4 flex gap-3">
                {customer?.accounts?.map((acc: Account, idx: number) => (
                  <div key={idx} className="rounded border px-3 py-2">
                    <div className="text-sm font-medium">{acc.number}</div>
                    <div className="text-xs text-zinc-500">{acc.currency}</div>
                  </div>
                ))}
              </div>

              {/* three search boxes: currency + account */}
              <div className="mt-4 flex gap-3">
                {searchBoxes.map((box, idx) => (
                  <div key={idx} className="inline-flex items-stretch">
                    <input
                      placeholder="account number"
                      value={box.account}
                      onChange={(e) => {
                        const next = [...searchBoxes];
                        next[idx] = { ...next[idx], account: e.target.value };
                        setSearchBoxes(next);
                      }}
                      className="rounded-l-md border border-r-0 px-3 text-sm w-64 h-9"
                    />
                    <div className="flex items-center rounded-r-md border border-l-0 bg-white px-2 h-9">
                      <div className="text-sm mr-1">{currencyFlag(box.currency)}</div>
                      <div className="text-xs font-medium">{box.currency}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* bank / address grid */}
              <div className="mt-6 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-zinc-500">Country</div>
                  <div className="font-medium">{customer?.bank?.country}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Bank name</div>
                  <div className="font-medium">{customer?.bank?.bank_name}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Branch</div>
                  <div className="font-medium">{customer?.bank?.branch}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">SWIFT/BIC</div>
                  <div className="font-medium">{customer?.bank?.swift}</div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Transactions With {customer?.name}</h3>
                <div className="flex items-center gap-2">{/* search removed per request */}</div>
              </div>

              <div className="mt-4 overflow-x-auto rounded bg-zinc-50 p-4">
                <table className="w-full text-left">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="py-2">#</th>
                      <th className="py-2">Date & Time</th>
                      <th className="py-2">Request ID</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">To</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const all = customerTxns || [];
                      const q = (searchQuery || "").trim();
                      // compute filter based on the three search boxes first
                      const activeBoxes = (searchBoxes || []).filter((b) => (b.account || "").trim() !== "");

                      const normalizeDigits = (s: string) => (s || "").replace(/\D/g, "");

                      const matchesByBoxes = (t: Transaction) => {
                        if (!activeBoxes.length) return false;
                        const txStr = JSON.stringify(t) || "";
                        const txDigits = normalizeDigits(txStr);

                        for (const b of activeBoxes) {
                          const accRaw = (b.account || "").trim();
                          if (!accRaw) continue;
                          const accDigits = normalizeDigits(accRaw);
                          if (!accDigits) continue;

                          // match digits-first (robust to formatting like spaces/dashes)
                          if (txDigits.includes(accDigits)) {
                            const cur = (b.currency || "").toUpperCase();
                            if (!cur) return true;

                            // prefer explicit transaction currency field if present
                            const txCurrency = (t.currency || "" ) .toUpperCase();
                            if (txCurrency && txCurrency.includes(cur)) return true;

                            // fallback: check amount text for currency code
                            if ((t.amount || "").toUpperCase().includes(cur)) return true;

                            // not matched on currency, continue to next box
                          }
                        }
                        return false;
                      };

                      if (activeBoxes.length > 0) {
                        const filtered = all.filter((t) => matchesByBoxes(t));
                        return filtered.map((t: Transaction, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="py-3 align-top">{idx + 1}</td>
                            <td className="py-3 align-top">{t.date_time}</td>
                            <td className="py-3 align-top">{t.request_id}</td>
                            <td className="py-3 align-top">{t.type}</td>
                            <td className="py-3 align-top">{t.to}</td>
                            <td className="py-3 align-top">{t.amount}</td>
                            <td className="py-3 align-top"><StatusBadge status={t.status} /></td>
                            <td className="py-3 align-top">
                              <a className="text-blue-600 hover:underline">View</a>
                            </td>
                          </tr>
                        ));
                      }

                      // fallback: use original searchQuery behavior (currency filter)
                      if (!q) {
                        return all.map((t: Transaction, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="py-3 align-top">{idx + 1}</td>
                            <td className="py-3 align-top">{t.date_time}</td>
                            <td className="py-3 align-top">{t.request_id}</td>
                            <td className="py-3 align-top">{t.type}</td>
                            <td className="py-3 align-top">{t.to}</td>
                            <td className="py-3 align-top">{t.amount}</td>
                            <td className="py-3 align-top"><StatusBadge status={t.status} /></td>
                            <td className="py-3 align-top">
                              <a className="text-blue-600 hover:underline">View</a>
                            </td>
                          </tr>
                        ));
                      }

                      const uq = q.toUpperCase();
                      const byCurrency = all.filter((t) => (t.amount || "").toUpperCase().includes(uq));

                      return byCurrency.map((t: Transaction, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="py-3 align-top">{idx + 1}</td>
                          <td className="py-3 align-top">{t.date_time}</td>
                          <td className="py-3 align-top">{t.request_id}</td>
                          <td className="py-3 align-top">{t.type}</td>
                          <td className="py-3 align-top">{t.to}</td>
                          <td className="py-3 align-top">{t.amount}</td>
                          <td className="py-3 align-top"><StatusBadge status={t.status} /></td>
                          <td className="py-3 align-top">
                            <a className="text-blue-600 hover:underline">View</a>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const classes =
    s === "success"
      ? "inline-block rounded-full bg-emerald-100 px-3 py-1 text-emerald-700"
      : s === "failed"
      ? "inline-block rounded-full bg-rose-100 px-3 py-1 text-rose-700"
      : "inline-block rounded-full bg-zinc-100 px-3 py-1 text-zinc-700";
  return <span className={classes}>{status}</span>;
}
