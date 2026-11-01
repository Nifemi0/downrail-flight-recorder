"use client";

import { useMemo, useRef, useState } from "react";
import { parseStandaloneArchive, type ImportedArchive } from "../lib/dreamdex/archive-import";

type DirectScan = { fromBlock:string; toBlock:string; bank:string; pool:string; note:string; rows:{type:string;blockNumber:string;logIndex:number;transactionHash:string;size:string|null;realizedPricePnl:string|null;amount:string|null}[] };

/** Read-only local file viewer, deliberately independent of market discovery. */
export function ArchiveViewer() {
  const [archive, setArchive] = useState<ImportedArchive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromBlock, setFromBlock] = useState("");
  const [toBlock, setToBlock] = useState("");
  const [scan, setScan] = useState<DirectScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const request = useRef(0);

  async function openFile(file: File | undefined) {
    const current = ++request.current;
    setArchive(null); setError(null); setScan(null);
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Archive exceeds the 5 MB local import limit.");
      const parsed = parseStandaloneArchive(await file.text());
      if (current === request.current) {
        setArchive(parsed); setFromBlock(parsed.startBlock);
        const end = BigInt(parsed.startBlock)+999n;
        setToBlock((end < BigInt(parsed.checkpoint) ? end : BigInt(parsed.checkpoint)).toString());
      }
    } catch (cause) { if (current === request.current) setError(cause instanceof Error ? cause.message : "Could not read the archive."); }
  }

  async function scanChain() {
    if (!archive || scanning) return;
    if (!/^\d{1,16}$/.test(fromBlock) || !/^\d{1,16}$/.test(toBlock) || BigInt(toBlock)<BigInt(fromBlock) || BigInt(toBlock)-BigInt(fromBlock)>999n) { setError("Choose an ordered range of at most 1,000 blocks."); return; }
    const current = request.current;
    setScanning(true); setError(null); setScan(null);
    try {
      const query = new URLSearchParams({market:archive.market,pool:archive.pool,fromBlock,toBlock});
      const response = await fetch(`/api/accounts/${encodeURIComponent(archive.account)}/chain-events?${query}`, {cache:"no-store"});
      const body = await response.json() as DirectScan | {error:string};
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Chain scan failed.");
      if (current === request.current) setScan(body);
    } catch (cause) { if (current === request.current) setError(cause instanceof Error ? cause.message : "Chain scan failed."); }
    finally { setScanning(false); }
  }

  const rows = useMemo(() => archive ? [...archive.rows].sort((a, b) => BigInt(a.blockNumber) < BigInt(b.blockNumber) ? -1 : BigInt(a.blockNumber) > BigInt(b.blockNumber) ? 1 : a.logIndex - b.logIndex) : [], [archive]);
  return <details className="archive-viewer">
    <summary>Open a local chain-event archive</summary>
    <p>Read a previously saved archive without the dreamDEX indexer. The file stays in this browser. It can be edited, so its contents and claimed identity are not authenticated.</p>
    <label>Choose archive JSON <input type="file" accept=".json,application/json" onChange={(event) => void openFile(event.target.files?.[0])} /></label>
    {error ? <p role="alert">{error}</p> : null}
    {archive ? <div role="status">
      <p><strong>Local file · Somnia Hideki testnet · chain {archive.chainId}</strong><br />Account: <code>{archive.account}</code><br />Market label: {archive.market} · pool: <code>{archive.pool}</code><br />Claimed coverage: blocks {archive.startBlock}–{archive.checkpoint} · {rows.length} stored events.</p>
      <p>This is a bounded, editable file; missing events, earlier orders, other fees, gas and unavailable history are not included. The market label is not independently verified. No complete net PnL or current position is inferred.</p>
      <div className="archive-scan"><p>Read position, funding, fee and rebate events directly from the testnet RPC using this file’s pool and account. The pool address is user-supplied; verify it independently.</p>
        <label>First block <input disabled={scanning} inputMode="numeric" value={fromBlock} onChange={(event)=>{setFromBlock(event.target.value);setScan(null);}} /></label>
        <label>Last block <input disabled={scanning} inputMode="numeric" value={toBlock} onChange={(event)=>{setToBlock(event.target.value);setScan(null);}} /></label>
        <button type="button" onClick={() => void scanChain()} disabled={scanning}>{scanning ? "Reading chain…" : "Read this range on chain"}</button>
        {scan ? <div role="status"><p><strong>Direct RPC result</strong> · blocks {scan.fromBlock}–{scan.toBlock} · {scan.rows.length} supported events. Pool: <code>{scan.pool}</code>; bank: <code>{scan.bank}</code>. {scan.note}</p>{scan.rows.slice(0,100).map((row)=><p key={`${row.transactionHash}-${row.logIndex}`}><strong>{row.type}</strong> · block {row.blockNumber}, log {row.logIndex}{row.size!==null ? ` · size ${row.size}` : ""}{row.realizedPricePnl!==null ? ` · realized price PnL ${row.realizedPricePnl}` : ""}{row.amount!==null ? ` · amount ${row.amount}` : ""} · <code>{row.transactionHash}</code></p>)}{scan.rows.length>100 ? <p>Showing the first 100 events.</p> : null}</div> : null}
      </div>
      {rows.length ? <ol className="archive-events">{rows.slice(0, 200).map((row) => <li key={`${row.transactionHash}-${row.logIndex}`}><strong>{row.type}</strong> · block {row.blockNumber}, log {row.logIndex}{row.size !== null ? ` · position size ${row.size}` : ""}{row.realizedPricePnl !== null ? ` · realized price PnL ${row.realizedPricePnl} collateral units` : ""}{row.amount !== null ? ` · event amount ${row.amount} collateral units` : ""}{row.side ? ` · ${row.side}` : ""}{row.role ? ` · ${row.role}` : ""}{row.quantity ? ` · quantity ${row.quantity}` : ""}{row.price ? ` · price ${row.price} collateral units` : ""}<br /><code>{row.transactionHash}</code></li>)}</ol> : <p>No supported events are stored in this range.</p>}
      {rows.length > 200 ? <p>Showing the first 200 of {rows.length} stored events.</p> : null}
    </div> : null}
  </details>;
}
