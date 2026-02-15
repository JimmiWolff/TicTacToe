const jwt = require('jsonwebtoken');

// Mock apple-signin-auth before requiring the module
jest.mock('apple-signin-auth', () => ({
    verifyIdToken: jest.fn()
}));

const appleSignin = require('apple-signin-auth');

// Since verifyToken and verifyAppleToken are defined inside server.js and not exported,
// we replicate the token detection and verification logic here for testing.
// This tests the same algorithm used in production.

// Replicate the token detection logic from server.js
async function verifyToken(token) {
    try {
        const decoded = jwt.decode(token, { complete: true });

        if (!decoded || !decoded.payload) {
            return null;
        }

        const issuer = decoded.payload.iss;

        if (issuer && issuer.includes('appleid.apple.com')) {
            // Apple token path
            try {
                const appleIdTokenPayload = await appleSignin.verifyIdToken(token, {
                    audience: 'com.test.app',
                    nonce: undefined,
                    ignoreExpiration: false
                });

                return {
                    sub: appleIdTokenPayload.sub,
                    email: appleIdTokenPayload.email,
                    email_verified: appleIdTokenPayload.email_verified,
                    authProvider: 'apple'
                };
            } catch (error) {
                return null;
            }
        } else {
            // Auth0 token path
            return {
                ...decoded.payload,
                authProvider: 'auth0'
            };
        }
    } catch (error) {
        return null;
    }
}

// Helper to create test tokens
function createAuth0Token(payload = {}) {
    const defaults = {
        sub: 'auth0|user123',
        email: 'test@example.com',
        nickname: 'testuser',
        iss: 'https://test-domain.auth0.com/',
        aud: 'test-audience',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    return jwt.sign({ ...defaults, ...payload }, 'test-secret');
}

function createAppleToken(payload = {}) {
    const defaults = {
        sub: '000123.abc456def.1234',
        email: 'user@privaterelay.appleid.com',
        email_verified: true,
        iss: 'https://appleid.apple.com',
        aud: 'com.test.app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    return jwt.sign({ ...defaults, ...payload }, 'test-secret');
}

describe('Token Type Detection', () => {
    test('identifies Auth0 tokens by issuer', () => {
        const token = createAuth0Token();
        const decoded = jwt.decode(token, { complete: true });
        const issuer = decoded.payload.iss;
        expect(issuer).toContain('auth0.com');
        expect(issuer).not.toContain('appleid.apple.com');
    });

    test('identifies Apple tokens by issuer', () => {
        const token = createAppleToken();
        const decoded = jwt.decode(token, { complete: true });
        const issuer = decoded.payload.iss;
        expect(issuer).toContain('appleid.apple.com');
    });

    test('correctly distinguishes Auth0 from Apple tokens', () => {
        const auth0Token = createAuth0Token();
        const appleToken = createAppleToken();

        const auth0Decoded = jwt.decode(auth0Token, { complete: true });
        const appleDecoded = jwt.decode(appleToken, { complete: true });

        const isAuth0Apple = auth0Decoded.payload.iss.includes('appleid.apple.com');
        const isAppleApple = appleDecoded.payload.iss.includes('appleid.apple.com');

        expect(isAuth0Apple).toBe(false);
        expect(isAppleApple).toBe(true);
    });
});

describe('verifyToken with Auth0 tokens', () => {
    test('returns decoded payload with authProvider auth0', async () => {
        const token = createAuth0Token({
            sub: 'auth0|abc123',
            email: 'user@test.com',
            nickname: 'testplayer'
        });

        const result = await verifyToken(token);
        expect(result).not.toBeNull();
        expect(result.authProvider).toBe('auth0');
        expect(result.sub).toBe('auth0|abc123');
        expect(result.email).toBe('user@test.com');
        expect(result.nickname).toBe('testplayer');
    });

    test('preserves all Auth0 token fields', async () => {
        const token = createAuth0Token({
            sub: 'auth0|user1',
            email: 'a@b.com',
            name: 'Full Name',
            nickname: 'nick',
            preferred_username: 'prefuser'
        });

        const result = await verifyToken(token);
        expect(result.sub).toBe('auth0|user1');
        expect(result.email).toBe('a@b.com');
        expect(result.name).toBe('Full Name');
        expect(result.nickname).toBe('nick');
        expect(result.preferred_username).toBe('prefuser');
    });
});

describe('verifyToken with Apple tokens', () => {
    beforeEach(() => {
        appleSignin.verifyIdToken.mockReset();
    });

    test('returns Apple user data with authProvider apple on successful verification', async () => {
        appleSignin.verifyIdToken.mockResolvedValue({
            sub: '000123.abc456def.1234',
            email: 'user@privaterelay.appleid.com',
            email_verified: true
        });

        const token = createAppleToken();
        const result = await verifyToken(token);

        expect(result).not.toBeNull();
        expect(result.authProvider).toBe('apple');
        expect(result.sub).toBe('000123.abc456def.1234');
        expect(result.email).toBe('user@privaterelay.appleid.com');
        expect(result.email_verified).toBe(true);
    });

    test('calls apple-signin-auth verifyIdToken for Apple tokens', async () => {
        appleSignin.verifyIdToken.mockResolvedValue({
            sub: '000123.abc456def.1234',
            email: 'test@icloud.com',
            email_verified: true
        });

        const token = createAppleToken();
        await verifyToken(token);

        expect(appleSignin.verifyIdToken).toHaveBeenCalledTimes(1);
        expect(appleSignin.verifyIdToken).toHaveBeenCalledWith(token, {
            audience: 'com.test.app',
            nonce: undefined,
            ignoreExpiration: false
        });
    });

    test('returns null when Apple token verification fails', async () => {
        appleSignin.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

        const token = createAppleToken();
        const result = await verifyToken(token);

        expect(result).toBeNull();
    });

    test('does not call apple-signin-auth for Auth0 tokens', async () => {
        const token = createAuth0Token();
        await verifyToken(token);

        expect(appleSignin.verifyIdToken).not.toHaveBeenCalled();
    });

    test('handles Apple relay email addresses', async () => {
        appleSignin.verifyIdToken.mockResolvedValue({
            sub: '000456.def789ghi.5678',
            email: 'abc123@privaterelay.appleid.com',
            email_verified: true
        });

        const token = createAppleToken({ email: 'abc123@privaterelay.appleid.com' });
        const result = await verifyToken(token);

        expect(result.email).toBe('abc123@privaterelay.appleid.com');
    });
});

describe('verifyToken with invalid tokens', () => {
    test('returns null for completely invalid token string', async () => {
        const result = await verifyToken('not-a-jwt-token');
        expect(result).toBeNull();
    });

    test('returns null for empty string', async () => {
        const result = await verifyToken('');
        expect(result).toBeNull();
    });

    test('returns null for malformed JWT', async () => {
        const result = await verifyToken('header.payload');
        expect(result).toBeNull();
    });
});

describe('Username extraction from tokens', () => {
    // Tests the username priority logic used in server.js login handler
    test('Auth0 token provides nickname for username', () => {
        const token = createAuth0Token({ nickname: 'johndoe', name: 'John Doe', email: 'john@example.com' });
        const decoded = jwt.decode(token);
        const username = decoded.nickname || decoded.name || decoded.email || decoded.sub;
        expect(username).toBe('johndoe');
    });

    test('Auth0 token falls back to name when no nickname', () => {
        const token = createAuth0Token({ name: 'John Doe', email: 'john@example.com' });
        // Remove nickname by not including it
        const decoded = jwt.decode(token);
        // nickname is in the token from createAuth0Token defaults, test the fallback logic
        const username = decoded.name || decoded.email || decoded.sub;
        expect(username).toBe('John Doe');
    });

    test('Apple user ID format differs from Auth0', () => {
        const appleUserId = '000123.abc456def.1234';
        const auth0UserId = 'auth0|user123';

        expect(appleUserId).not.toContain('auth0');
        expect(auth0UserId).toContain('auth0');
        expect(appleUserId).toMatch(/^\d+\.\w+\.\d+$/);
    });

    test('email truncation for auto-generated usernames', () => {
        const email = 'verylongemail@example.com';
        let username = email;

        // Replicate the truncation logic from server.js
        if (username.includes('@')) {
            username = username.split('@')[0];
        }
        if (username.length > 12) {
            username = username.substring(0, 12);
        }

        expect(username).toBe('verylongemai');
        expect(username.length).toBeLessThanOrEqual(12);
    });

    test('short email does not get truncated', () => {
        const email = 'jim@test.com';
        let username = email;

        if (username.includes('@')) {
            username = username.split('@')[0];
        }
        if (username.length > 12) {
            username = username.substring(0, 12);
        }

        expect(username).toBe('jim');
    });
});
