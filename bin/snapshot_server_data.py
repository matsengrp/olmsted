#!/usr/bin/env python3
"""
One-shot snapshot of the legacy olmstedviz.org datasets.

Crawls http://www.olmstedviz.org/data/, starting from the manifest, and
saves a local copy under _data/server-snapshot/ preserving the URL layout.
"""

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError, URLError

BASE_URL = "http://www.olmstedviz.org/data"
OUT_DIR = Path(__file__).resolve().parent.parent / "_data" / "server-snapshot"
PARALLELISM = 16
TIMEOUT = 30


def fetch(path: str) -> bytes:
    url = f"{BASE_URL}/{path}"
    with urlopen(url, timeout=TIMEOUT) as resp:
        return resp.read()


def save(path: str, data: bytes) -> int:
    out = OUT_DIR / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    return len(data)


def fetch_and_save(path: str) -> tuple[str, int, str | None]:
    try:
        data = fetch(path)
        size = save(path, data)
        return path, size, None
    except (HTTPError, URLError, TimeoutError) as e:
        return path, 0, str(e)


def main():
    print(f"Snapshot target: {OUT_DIR}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("\n[1/3] Fetching manifest…")
    manifest_bytes = fetch("datasets.json")
    save("datasets.json", manifest_bytes)
    manifest = json.loads(manifest_bytes)
    print(f"  → datasets.json ({len(manifest_bytes):,} bytes, {len(manifest)} datasets)")

    print("\n[2/3] Fetching clones.* files…")
    clones_paths = [f"clones.{d['dataset_id']}.json" for d in manifest]
    tree_idents: set[str] = set()
    total_clone_bytes = 0
    for path in clones_paths:
        data = fetch(path)
        save(path, data)
        clones = json.loads(data)
        for clone in clones:
            for tree in clone.get("trees", []):
                if "ident" in tree:
                    tree_idents.add(tree["ident"])
        total_clone_bytes += len(data)
        print(f"  → {path} ({len(data):,} bytes, {len(clones)} clones)")

    print(f"\n  total clones-file bytes: {total_clone_bytes:,}")
    print(f"  unique tree idents to fetch: {len(tree_idents)}")

    print(f"\n[3/3] Fetching {len(tree_idents)} tree files in parallel (×{PARALLELISM})…")
    tree_paths = [f"tree.{ident}.json" for ident in sorted(tree_idents)]
    ok = 0
    failed: list[tuple[str, str]] = []
    total_tree_bytes = 0
    start = time.time()

    with ThreadPoolExecutor(max_workers=PARALLELISM) as ex:
        futures = {ex.submit(fetch_and_save, p): p for p in tree_paths}
        for i, fut in enumerate(as_completed(futures), 1):
            path, size, err = fut.result()
            if err:
                failed.append((path, err))
            else:
                ok += 1
                total_tree_bytes += size
            if i % 100 == 0 or i == len(tree_paths):
                elapsed = time.time() - start
                rate = i / elapsed if elapsed else 0
                print(f"  [{i:>5}/{len(tree_paths)}] {ok} ok, {len(failed)} failed ({rate:.1f}/s)")

    print("\n=== Summary ===")
    print(f"  datasets:   1 ({len(manifest_bytes):,} bytes)")
    print(f"  clones:     {len(clones_paths)} ({total_clone_bytes:,} bytes)")
    print(f"  trees:      {ok} ({total_tree_bytes:,} bytes)")
    if failed:
        print(f"\n  {len(failed)} failures:")
        for path, err in failed[:10]:
            print(f"    {path}: {err}")
        if len(failed) > 10:
            print(f"    … and {len(failed) - 10} more")
        sys.exit(1)
    total = len(manifest_bytes) + total_clone_bytes + total_tree_bytes
    print(f"\n  total:      {total:,} bytes ({total / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
