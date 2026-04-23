/**
 * @author Craftpick
 * Azuriom Auth Integration - API HTTP Direct
 */

class AzuriomAuth {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.apiUrl = `${this.baseUrl}/api/auth`;
    }

    async login(email, password, twoFactorCode = null) {
        try {
            const payload = {
                email: email,
                password: password
            };

            if (twoFactorCode) {
                payload.code = twoFactorCode;
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${this.apiUrl}/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeout);

            const data = await response.json();

            if (data.status === 'pending' && data.requires2fa) {
                return {
                    status: 'pending',
                    requires2fa: true,
                    message: '2FA required'
                };
            }

            if (data.status === 'success' || data.access_token) {
                return {
                    status: 'success',
                    access_token: data.access_token,
                    username: data.username,
                    uuid: data.uuid,
                    email: data.email,
                    email_verified: data.email_verified,
                    money: data.money,
                    role: data.role,
                    banned: data.banned,
                    created_at: data.created_at,
                    meta: {
                        type: 'azuriom',
                        provider: 'azuriom'
                    }
                };
            }

            return {
                error: true,
                message: data.message || 'Authentication failed'
            };

        } catch (error) {
            if (error.name === 'AbortError') {
                return {
                    error: true,
                    message: 'Request timeout'
                };
            }
            return {
                error: true,
                message: error.message || 'Network error'
            };
        }
    }

    async verify(accessToken) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${this.apiUrl}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ access_token: accessToken }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            const data = await response.json();

            if (data.status === 'success' || data.access_token) {
                return {
                    status: 'success',
                    access_token: data.access_token,
                    username: data.username,
                    uuid: data.uuid,
                    email: data.email,
                    email_verified: data.email_verified,
                    money: data.money,
                    role: data.role,
                    banned: data.banned,
                    created_at: data.created_at
                };
            }

            return {
                error: true,
                message: data.message || 'Verification failed'
            };

        } catch (error) {
            if (error.name === 'AbortError') {
                return {
                    error: true,
                    message: 'Request timeout'
                };
            }
            return {
                error: true,
                message: error.message || 'Network error'
            };
        }
    }

    async logout(accessToken) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            await fetch(`${this.apiUrl}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ access_token: accessToken }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            return { status: 'success' };

        } catch (error) {
            return {
                error: true,
                message: error.message || 'Logout failed'
            };
        }
    }
}

export default AzuriomAuth;
