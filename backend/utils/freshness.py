"""Fetch freshness utilities — read/write _meta.json sidecars, skip stale checks."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


def meta_path_for(data_file: Path) -> Path:
    """Return the _meta.json sidecar path for a data file."""
    return data_file.with_suffix(data_file.suffix + '.meta.json')


def write_meta(data_file: Path, *, source_url: str, record_count: int,
               extra: Optional[dict] = None):
    """Write a _meta.json sidecar recording fetch provenance."""
    meta = {
        'fetched_at': datetime.now(timezone.utc).isoformat(),
        'source_url': source_url,
        'record_count': record_count,
    }
    if extra:
        meta.update(extra)

    path = meta_path_for(data_file)
    with open(path, 'w') as f:
        json.dump(meta, f, indent=2)
    return meta


def is_fresh(data_file: Path, max_age_days: int) -> bool:
    """Check if a data file's sidecar indicates it's fresh enough to skip re-fetch."""
    path = meta_path_for(data_file)
    if not path.exists() or not data_file.exists():
        return False

    with open(path) as f:
        meta = json.load(f)

    fetched_at = datetime.fromisoformat(meta['fetched_at'])
    age_days = (datetime.now(timezone.utc) - fetched_at).days
    return age_days < max_age_days


def read_meta(data_file: Path) -> Optional[dict]:
    """Read a _meta.json sidecar, or None if it doesn't exist."""
    path = meta_path_for(data_file)
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)
