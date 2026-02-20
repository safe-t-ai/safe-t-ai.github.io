/**
 * GitHub OAuth auth module — gates access to the private safe-t-ai repo.
 *
 * Setup:
 *   1. Create private GitHub repo: safe-t-ai/safe-t-ai
 *   2. Register GitHub OAuth App — callback: https://safe-t-ai.github.io/team/
 *   3. Set CLIENT_ID below, add secret to Cloudflare via:
 *        wrangler secret put safe_t_ai_github_io
 *      with value: {"clientId":"<id>","clientSecret":"<secret>"}
 */

const CLIENT_ID = 'Iv23liJac8Tv3k49gcGU';
const PROXY_URL = 'https://cors-proxy.jonasneves.workers.dev';
const GATE_REPO = 'safe-t-ai/safe-t-ai'; // private repo — collaborator = access granted
const STORAGE_KEY = 'safe-t-auth';
const REDIRECT_URI = () => `${window.location.origin}/team/`;

/** @returns {{ token: string, user: object } | null} */
export function getAuth() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
        return null;
    }
}

export function logout() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/team/';
}

/**
 * Verifies the stored token still has access to the gate repo.
 * Throws 'TOKEN_EXPIRED' or 'ACCESS_DENIED' on failure.
 */
export async function verifyAccess(token) {
    const res = await fetch(`https://api.github.com/repos/${GATE_REPO}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    });
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    if (!res.ok) throw new Error('ACCESS_DENIED');
}

/** Redirects to GitHub OAuth authorization. */
export function startLogin() {
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI(),
        scope: 'repo',
        state,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
}

/**
 * Handles the OAuth callback (code + state in URL).
 * Exchanges code for token, saves to localStorage.
 * Returns { token, user } or null if no callback params present.
 */
export async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) return null;

    const storedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    window.history.replaceState({}, '', window.location.pathname);

    if (state !== storedState) throw new Error('STATE_MISMATCH');

    const res = await fetch(`${PROXY_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, code, redirect_uri: REDIRECT_URI() }),
    });
    const data = await res.json();
    if (data.error || !data.access_token) {
        throw new Error(data.error_description || data.error || 'TOKEN_EXCHANGE_FAILED');
    }

    const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/vnd.github+json' }
    });
    if (!userRes.ok) throw new Error('USER_FETCH_FAILED');
    const user = await userRes.json();

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.access_token, user }));
    return { token: data.access_token, user };
}
