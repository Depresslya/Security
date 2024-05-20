const {authConfig} = require('./config')
const uuid = require('uuid')
const request = require('request');
const fs = require('fs')

class AuthService {
    #accessToken
    async loginAsAdmin() {
        const options = {
            body: new URLSearchParams({
                audience: authConfig.audience,
                grant_type: 'client_credentials',
                client_id: authConfig.clientId,
                client_secret: authConfig.clientSecret
            }),
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }

        await fetch(`https://${authConfig.domain}/oauth/token`, options).then(response => response.json())
            .then(accessToken => {
                const { access_token } = accessToken;

                if (access_token)
                {
                    this.accessToken = access_token;
                }
            })
    }

    async refreshToken(refresh_token) {
        return await fetch(`https://${authConfig.domain}/oauth/token`, {
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                audience: authConfig.audience,
                clientId: authConfig.clientId,
                client_secret: authConfig.clientSecret,
                refresh_token: refresh_token
            }),
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })
    }

    async login(username, password) {
        return await fetch(`https://${authConfig.domain}/oauth/token`, {
            body: new URLSearchParams({
                grant_type: 'password',
                username: username,
                password: password,
                audience: authConfig.audience,
                client_id: authConfig.clientId,
                client_secret: authConfig.clientSecret,
                scope: 'offline_access'
            }),
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
        })
    }

    async register(email, name, username, password) {
        const body = {
            email: email,
            user_metadata: {},
            blocked: false,
            email_verified: false,
            app_metadata: {},
            given_name: name,
            family_name: name,
            name: name,
            nickname: username,
            picture: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/User_icon-cp.svg/828px-User_icon-cp.svg.png',
            user_id: uuid.v4(),
            connection: 'Username-Password-Authentication',
            username: username,
            password: password,
            verify_email: false
        }
        
        return await fetch(`https://${authConfig.domain}/api/v2/users`, {
            body: JSON.stringify(body),
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${this.#accessToken}`,
                "Content-Type": "application/json"
            },
        })
    }

    async getUser(accessToken, userId) {
        return await fetch(`https://${authConfig.domain}/api/v2/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        }).then(response => response.json())
    }

    async getPublicKey()  {
        if (!fs.existsSync('public.key')) {
            const {body: publicKey} = request(`https://${authConfig.domain}/pem`)
            
            await fs.promises.writeFile('public.key', publicKey, 'utf-8')
        }

        const publicKey = await fs.promises.readFile('public.key', 'utf-8')
        console.log(publicKey);
        return publicKey
    }
}

module.exports = {AuthService}
