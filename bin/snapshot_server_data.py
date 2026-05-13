#!/usr/bin/env python3
"""
Manifest-driven snapshot of the auspice-shaped server datasets.

Reads `<base-url>/datasets.json`, then fetches the per-dataset
`clones.{id}.json` and per-tree `tree.{ident}.json` files referenced
indirectly through it. Preserves the URL layout under the output dir
so the result can be served back via `npm run start:local <out>`.

Defaults target the production olmstedviz.org bucket; both the base
URL and the output dir are CLI-overridable for staging buckets or
alternate local layouts.
"""

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError, URLError

DEFAULT_BASE_URL = "http://www.olmstedviz.org/data"
DEFAULT_OUT_DIR = Path(__file__).resolve().parent.parent / "_data" / "server-snapshot"
DEFAULT_PARALLELISM = 16
DEFAULT_TIMEOUT = 30


def fetch(base_url: str, path: str, timeout: int) -> bytes:
    url = f"{base_url}/{path}"
    with urlopen(url, timeout=timeout) as resp:
        return resp.read()


def save(out_dir: Path, path: str, data: bytes) -> int:
    out = out_dir / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    return len(data)


def fetch_and_save(base_url: str, out_dir: Path, timeout: int, path: str):
    try:
        data = fetch(base_url, path, timeout)
        size = save(out_dir, path, data)
        return path, size, None
    except (HTTPError, URLError, TimeoutError) as e:
        return path, 0, str(e)


def parse_args():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "-u",
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"URL prefix for the manifest and dataset files (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help="Directory to save the snapshot into (default: %(default)s)",
    )
    parser.add_argument(
        "-p",
        "--parallelism",
        type=int,
        default=DEFAULT_PARALLELISM,
        help=f"Concurrent tree-file fetches (default: {DEFAULT_PARALLELISM})",
    )
    parser.add_argument(
        "-t",
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help=f"Per-request timeout in seconds (default: {DEFAULT_TIMEOUT})",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    out_dir = args.output
    print(f"Source:         {base_url}")
    print(f"Snapshot target: {out_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)

    print("\n[1/3] Fetching manifest…")
    manifest_bytes = fetch(base_url, "datasets.json", args.timeout)
    save(out_dir, "datasets.json", manifest_bytes)
    manifest = json.loads(manifest_bytes)
    print(f"  → datasets.json ({len(manifest_bytes):,} bytes, {len(manifest)} datasets)")

    print("\n[2/3] Fetching clones.* files…")
    clones_paths = [f"clones.{d['dataset_id']}.json" for d in manifest]
    tree_idents: set[str] = set()
    total_clone_bytes = 0
    for path in clones_paths:
        data = fetch(base_url, path, args.timeout)
        save(out_dir, path, data)
        clones = json.loads(data)
        for clone in clones:
            for tree in clone.get("trees", []):
                if "ident" in tree:
                    tree_idents.add(tree["ident"])
        total_clone_bytes += len(data)
        print(f"  → {path} ({len(data):,} bytes, {len(clones)} clones)")

    print(f"\n  total clones-file bytes: {total_clone_bytes:,}")
    print(f"  unique tree idents to fetch: {len(tree_idents)}")

    print(f"\n[3/3] Fetching {len(tree_idents)} tree files in parallel (×{args.parallelism})…")
    tree_paths = [f"tree.{ident}.json" for ident in sorted(tree_idents)]
    ok = 0
    failed: list[tuple[str, str]] = []
    total_tree_bytes = 0
    start = time.time()

    with ThreadPoolExecutor(max_workers=args.parallelism) as ex:
        futures = {ex.submit(fetch_and_save, base_url, out_dir, args.timeout, p): p for p in tree_paths}
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
