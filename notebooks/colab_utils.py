"""Shared helpers for Colab notebooks in this repo."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import Iterable

REPO_URL = "https://github.com/safe-t-ai/safe-t-ai.github.io.git"
DEFAULT_REPO_DIR = Path("/content/safe-t-ai.github.io")


def bootstrap_colab_repo(
    repo_dir: str | Path = DEFAULT_REPO_DIR,
    repo_url: str = REPO_URL,
) -> Path:
    """Clone the repo into the Colab workspace if needed."""
    repo_path = Path(repo_dir)
    if not repo_path.exists():
        repo_path.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["git", "clone", "--depth=1", repo_url, str(repo_path)],
            check=True,
        )

    if str(repo_path / "backend") not in sys.path:
        sys.path.insert(0, str(repo_path / "backend"))

    os.chdir(repo_path)
    return repo_path


def prepare_notebook(
    repo_root: str | Path = DEFAULT_REPO_DIR,
    *,
    pull_latest: bool = False,
) -> Path:
    """Bootstrap the repo and optionally pull latest main."""
    repo_path = bootstrap_colab_repo(repo_root)

    if pull_latest:
        try:
            from google.colab import userdata
            token = userdata.get("GITHUB_TOKEN_SAFET")
        except Exception:
            token = None

        if token:
            authed_url = f"https://x-access-token:{token}@github.com/safe-t-ai/safe-t-ai.github.io.git"
            subprocess.run(["git", "remote", "set-url", "origin", authed_url], check=True, cwd=repo_path)
            if (repo_path / ".git" / "shallow").exists():
                subprocess.run(["git", "fetch", "--unshallow", "origin", "main"], check=True, cwd=repo_path)

        try:
            subprocess.run(["git", "pull", "origin", "main"], check=True, cwd=repo_path)
        except subprocess.CalledProcessError:
            print("Warning: git pull failed — continuing with local repo state.")

    return repo_path


def save_notebook(
    notebook_name: str,
    repo_dir: str | Path = DEFAULT_REPO_DIR,
) -> str | None:
    """Capture the current Colab notebook and write it to the repo.

    Uses Colab's internal get_ipynb API to snapshot the running notebook,
    including any cell edits made in this session. Call this before
    publish_artifacts and include the returned path in the paths list.

    Returns the relative path (e.g. 'notebooks/01_fetch_data.ipynb') on
    success, or None if the snapshot fails (non-fatal — publish continues).
    """
    try:
        from google.colab import _message
        import json

        notebook_json = _message.blocking_request("get_ipynb", request="", timeout_sec=30)
        if not notebook_json:
            print("Warning: get_ipynb returned empty — notebook not saved.")
            return None

        # Colab's get_ipynb response omits top-level format fields required by
        # the Jupyter spec. Inject defaults if missing so Colab can open the file.
        notebook_json.setdefault("nbformat", 4)
        notebook_json.setdefault("nbformat_minor", 5)

        repo_path = Path(repo_dir)
        out_path = repo_path / "notebooks" / notebook_name
        with open(out_path, "w") as f:
            json.dump(notebook_json, f, indent=1)

        rel_path = f"notebooks/{notebook_name}"
        print(f"Notebook snapshot saved to {rel_path}")
        return rel_path

    except Exception as e:
        print(f"Warning: could not save notebook — {e}")
        return None


def publish_artifacts(
    paths: Iterable[str | Path],
    message: str,
    repo_dir: str | Path = DEFAULT_REPO_DIR,
    dry_run: bool = False,
) -> bool:
    """Commit and push generated artifacts from Colab back to GitHub.

    Requires a Colab secret named ``GITHUB_TOKEN_SAFET`` with write access to the
    safe-t-ai org. Add it via the key icon in the Colab left sidebar.

    Returns True when a commit was created and pushed.
    """
    try:
        from google.colab import userdata
    except ImportError as exc:
        raise RuntimeError("publish_artifacts only works from Google Colab.") from exc

    token = userdata.get("GITHUB_TOKEN_SAFET")
    if not token:
        raise RuntimeError(
            "Missing Colab secret GITHUB_TOKEN_SAFET. "
            "Add it via the key icon in the Colab left sidebar."
        )

    repo_path = Path(repo_dir)
    rel_paths = [str(Path(p)) for p in paths]

    missing = [p for p in rel_paths if not (repo_path / p).exists()]
    if missing:
        raise FileNotFoundError(
            "Cannot publish — files not found: " + ", ".join(missing)
        )

    repo_url = f"https://x-access-token:{token}@github.com/safe-t-ai/safe-t-ai.github.io.git"

    subprocess.run(["git", "config", "user.email", "colab-bot@safe-t-ai"], check=True, cwd=repo_path)
    subprocess.run(["git", "config", "user.name", "Colab Bot"], check=True, cwd=repo_path)
    subprocess.run(["git", "remote", "set-url", "origin", repo_url], check=True, cwd=repo_path)

    if (repo_path / ".git" / "shallow").exists():
        subprocess.run(["git", "fetch", "--unshallow", "origin", "main"], check=True, cwd=repo_path)

    subprocess.run(["git", "add", "--force", "--", *rel_paths], check=True, cwd=repo_path)

    status = subprocess.run(
        ["git", "status", "--porcelain", "--", *rel_paths],
        cwd=repo_path, capture_output=True, text=True, check=True,
    )
    staged = [l for l in status.stdout.splitlines() if l and l[0] not in (" ", "?")]
    if not staged:
        print("No artifact changes to commit.")
        return False

    if dry_run:
        print(f"[dry_run] Would commit: {', '.join(rel_paths)}")
        print(f"[dry_run] Message: {message}")
        return False

    subprocess.run(["git", "commit", "-m", message], check=True, cwd=repo_path)

    subprocess.run(["git", "rebase", "--abort"], cwd=repo_path, capture_output=True)
    fetch = subprocess.run(
        ["git", "fetch", "origin", "main"],
        cwd=repo_path, capture_output=True, text=True,
    )
    if fetch.returncode != 0:
        raise RuntimeError(
            f"git fetch failed (exit {fetch.returncode}):\n{fetch.stderr or fetch.stdout}"
        )
    rebase = subprocess.run(
        ["git", "rebase", "origin/main"],
        cwd=repo_path, capture_output=True, text=True,
    )
    if rebase.returncode != 0:
        subprocess.run(["git", "rebase", "--abort"], cwd=repo_path, capture_output=True)
        raise RuntimeError(
            f"git rebase failed (exit {rebase.returncode}):\n"
            + (rebase.stderr or rebase.stdout)
        )

    push = subprocess.run(
        ["git", "push", "origin", "main"],
        cwd=repo_path, capture_output=True, text=True,
    )
    if push.returncode != 0:
        raise RuntimeError(
            f"git push failed (exit {push.returncode}):\n"
            + (push.stderr or push.stdout)
        )
    print(f"Pushed: {', '.join(rel_paths)}")
    return True
