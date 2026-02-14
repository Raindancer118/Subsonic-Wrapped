import axios from 'axios';
import crypto from 'crypto';

export function createAuthParams(username: string, token: string, salt: string, legacy: boolean = false): string {
    return legacy
        ? `u=${username}&p=enc:${Buffer.from(token).toString('hex')}&v=1.16.1&c=app&f=json`
        : `u=${username}&t=${token}&s=${salt}&v=1.16.1&c=app&f=json`;
}

export async function verifySubsonic(url: string, username: string, token: string, salt: string, legacy: boolean = false): Promise<boolean> {
    try {
        const baseURL = url.endsWith('/') ? url.slice(0, -1) : url;
        const authParams = createAuthParams(username, token, salt, legacy);
        const testUrl = `${baseURL}/rest/ping.view?${authParams}`;

        const response = await axios.get(testUrl);
        return response.data['subsonic-response']?.status === 'ok';
    } catch (e) {
        console.error('Subsonic verification failed:', e);
        return false;
    }
}
