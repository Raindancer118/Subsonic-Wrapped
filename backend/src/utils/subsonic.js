"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthParams = createAuthParams;
exports.verifySubsonic = verifySubsonic;
const axios_1 = __importDefault(require("axios"));
function createAuthParams(username, token, salt, legacy = false) {
    return legacy
        ? `u=${username}&p=enc:${Buffer.from(token).toString('hex')}&v=1.16.1&c=app&f=json`
        : `u=${username}&t=${token}&s=${salt}&v=1.16.1&c=app&f=json`;
}
async function verifySubsonic(url, username, token, salt, legacy = false) {
    try {
        const baseURL = url.endsWith('/') ? url.slice(0, -1) : url;
        const authParams = createAuthParams(username, token, salt, legacy);
        const testUrl = `${baseURL}/rest/ping.view?${authParams}`;
        const response = await axios_1.default.get(testUrl);
        return response.data['subsonic-response']?.status === 'ok';
    }
    catch (e) {
        console.error('Subsonic verification failed:', e);
        return false;
    }
}
//# sourceMappingURL=subsonic.js.map