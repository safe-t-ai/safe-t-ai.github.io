/**
 * GitHub OAuth auth module — gates access to the private safe-t-ai repo.
 */

const CLIENT_ID   = 'Ov23li3dnFMUNHbu1SjZ';
const GATE_REPO   = 'safe-t-ai/safe-t-ai'; // private repo — collaborator = access granted
const STORAGE_KEY = 'safe-t-auth';

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

/** Opens a GitHub OAuth popup. Saves auth and reloads on success. */
export function startLogin() {
    const params = new URLSearchParams({
        client_id:    CLIENT_ID,
        redirect_uri: 'https://neevs.io/auth/',
        scope:        'repo',
        state:        crypto.randomUUID(),
    });

    const popup = window.open(
        `https://github.com/login/oauth/authorize?${params}`,
        'gh-oauth',
        'width=600,height=700,popup=1'
    );
    if (!popup) return;

    function onMsg(e) {
        if (e.data?.type !== 'gh-auth') return;
        window.removeEventListener('message', onMsg);
        if (e.data.auth) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: e.data.auth.token, user: e.data.auth.user }));
            location.reload();
        }
        try { popup.close(); } catch {}
    }
    window.addEventListener('message', onMsg);
}
