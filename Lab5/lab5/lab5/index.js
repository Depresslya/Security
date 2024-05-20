const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const jwt = require('jsonwebtoken')
const { AuthService } = require('./authService');
const { authConfig } = require('./config');

const authService = new AuthService()


const verifyToken = async (accessToken) => {
    const verifyOptions = {
        issuer: `https://${authConfig.domain}/`,
        audience: authConfig.audience,
        algorithms: ['RS256']
    };

    try {
        const publicKey = await authService.getPublicKey()
        authConfig.publicKey = publicKey;
        const payload = jwt.verify(accessToken, publicKey, verifyOptions)

        return payload;
    } catch {return null}
}

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const TOKEN_HEADER = 'Authorization';


app.use((req, res, next) => {
    let token = req.get(TOKEN_HEADER)
    
    req.session = {}
    if (token) {
        req.session.token = token;
    }

    next();
});

app.get('/create', (_, res) => {
    res.sendFile(path.join(__dirname + '/createUser.html'))
})

app.get('/me', async (req, res) => {
    if (req.session.token) {
        const payload = await verifyToken(req.session.token)
        if (!payload)
            return res.status(401).send()

        const {sub} = jwt.decode(req.session.token)
        
        const response = await authService.getUser(req.session.token, sub)
        
        res.send(response)
    }
})

app.get('/', (req, res) => {
    if (req.session.token) {
        return res.json({
            username: req.session.username,
            logout: 'http://localhost:3000/logout'
        })
    }
    res.sendFile(path.join(__dirname+'/index.html'));
})

app.get('/logout', (req, res) => {
    sessions.destroy(req, res);
    res.redirect('/');
});

app.post('/api/register', async (req, res) => {
    const { email, name, username, password } = req.body;

    await authService.loginAsAdmin()

    await authService.register(email, name, username, password)
        .then(async response => {
            if (response.status === 201)
            {
                res.send({isSuccess: true})
            } else {
                const reason = await response.json();
                res.send({isSuccess: false, error: reason.message})
            }
        }).catch(err => {
            res.send({isSuccess: false, error: err})
        })
})

app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    await authService.login(login, password)
        .then(async response => {
            if (response.status === 200)
            {
                req.session.username = login;
                req.session.login = login;

                const {access_token, expires_in, refresh_token} = await response.json()
                req.session.access_token = access_token;
                req.session.refresh_token = refresh_token;

                let now = new Date()
                req.session.expires_in = now.setSeconds(now.getSeconds() + expires_in);
                
                res.json({ token: access_token });
            } else {
                res.status(401).send()
            }
        }).catch (err => {
            console.log(err);
            res.status(401).send()
        })
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})