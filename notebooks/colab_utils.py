"""Shared helpers for Colab notebooks in this repo."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import Iterable

REPO_URL = "https://github.com/safe-t-ai/safe-t-ai.github.io.git"
DEFAULT_REPO_DIR = Path("/content/safe-t-ai.github.io")


def _browser_github_auth() -> str:
    """Authenticate via the safe-t-ai GitHub OAuth flow.

    Displays a 'Sign in with GitHub' button in the cell output. When clicked,
    runs the same connectGitHub flow used by the team page. Uses eval_js to
    suspend Python cleanly until the Promise resolves with the token.
    """
    from IPython.display import display, HTML
    from google.colab import output

    display(HTML("""
    <style>
      #safet-auth-btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 20px; border: none; border-radius: 6px;
        background: #24292f; color: #fff; font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        cursor: pointer; transition: background 0.15s;
      }
      #safet-auth-btn:hover:not(:disabled) { background: #32383f; }
      #safet-auth-btn:disabled { opacity: 0.7; cursor: default; }
      #safet-auth-status { margin-top: 8px; font-size: 13px;
        font-family: monospace; color: #555; }
    </style>
    <button id="safet-auth-btn">
      <svg width="18" height="18" viewBox="0 0 98 96" fill="white"
           xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd"
          d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405
          46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127
          -13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17
          -4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052
          4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6
          -10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2
          -.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052
          a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63
          9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038
          3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283
          1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526
          0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691
          C97.707 22 75.788 0 48.854 0z"/>
      </svg>
      Sign in with GitHub
    </button>
    <div id="safet-auth-status"></div>
    """))

    # eval_js suspends Python and waits for the Promise to resolve —
    # no polling loop needed, and the kernel stays idle for the callback.
    token = output.eval_js("""
    new Promise(async (resolve, reject) => {
      const { connectGitHub } = await import('https://neevs.io/auth/lib.js');
      const btn = document.getElementById('safet-auth-btn');
      const status = document.getElementById('safet-auth-status');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        status.textContent = 'Waiting for GitHub authorization\u2026';
        try {
          const { token } = await connectGitHub('repo', 'safe-t-ai');
          btn.style.background = '#2da44e';
          btn.innerHTML = '\u2713 Authorized';
          status.textContent = '';
          resolve(token);
        } catch (e) {
          btn.disabled = false;
          btn.style.background = '';
          status.textContent = 'Authorization failed \u2014 try again.';
          reject(e);
        }
      });
    })
    """, timeout_sec=300)

    if not token:
        raise RuntimeError("GitHub authentication timed out — run the cell again.")

    return token


def _resolve_github_token() -> str:
    """Return a GitHub token, prompting interactively if no secret is set."""
    try:
        from google.colab import userdata
        token = userdata.get("GITHUB_TOKEN_SAFET")
        if token:
            return token
    except Exception:
        pass

    return _browser_github_auth()


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

        # Repo is public — auth only needed to unshallow the clone.
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

        # get_ipynb wraps the notebook under an 'ipynb' key at the top level.
        # Extract the actual notebook content before writing.
        if "ipynb" in notebook_json:
            notebook_json = notebook_json["ipynb"]

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

    Uses ``GITHUB_TOKEN_SAFET`` from Colab secrets if set; otherwise prompts
    with a 'Sign in with GitHub' button using the safe-t-ai OAuth flow.

    Returns True when a commit was created and pushed.
    """
    try:
        import google.colab  # noqa: F401
    except ImportError as exc:
        raise RuntimeError("publish_artifacts only works from Google Colab.") from exc

    token = _resolve_github_token()

    repo_path = Path(repo_dir)
    rel_paths = [str(Path(p)) for p in paths]

    missing = [p for p in rel_paths if not (repo_path / p).exists()]
    if missing:
        raise FileNotFoundError(
            "Cannot publish — files not found: " + ", ".join(missing)
        )

    # Heal any notebooks that were written with the get_ipynb wrapper structure
    # ({ipynb: <notebook>, nbformat, nbformat_minor}) instead of the notebook itself.
    import json as _json
    for rel in rel_paths:
        if not rel.endswith(".ipynb"):
            continue
        nb_path = repo_path / rel
        with open(nb_path) as f:
            nb = _json.load(f)
        if "ipynb" in nb and "cells" not in nb:
            nb = nb["ipynb"]
            nb.setdefault("nbformat", 4)
            nb.setdefault("nbformat_minor", 5)
            with open(nb_path, "w") as f:
                _json.dump(nb, f, indent=1)
                f.write("\n")
            print(f"Fixed notebook wrapper structure: {rel}")

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
