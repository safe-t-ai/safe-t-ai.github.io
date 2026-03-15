/**
 * GitHub OAuth auth module — gates access to the private safe-t-ai repo.
 */

const STORAGE_KEY = 'safe-t-auth';

export const GATE_REPO = 'safe-t-ai/safe-t-ai'; // private repo — collaborator = access granted
export const githubHeaders = token => ({ Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' });

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

export function clearAuth() {
    localStorage.removeItem(STORAGE_KEY);
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
export async function startLogin() {
    // @ts-ignore — external ES module URL, no type declarations
    const { connectGitHub } = await import('https://neevs.io/auth/lib.js');
    try {
        const { token, username, avatarUrl } = await connectGitHub('repo', 'safe-t-ai');
        const user = { login: username, avatar_url: avatarUrl };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
        location.reload();
    } catch (err) {
        if (!err.message.includes('cancelled')) throw err;
    }
}
