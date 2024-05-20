const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const { AuthService } = require('./authService');

const authService = new AuthService()

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            //console.log(this.#sessions);
        } catch(e) {
            this.#sessions = {};
        }
    }

    #storeSessions() {
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8');
    }

    set(key, value) {
        if (!value) {
            value = {};
        }
        this.#sessions[key] = value;
        this.#storeSessions();
    }

    get(key) {
        return this.#sessions[key];
    }

    init(res) {
        const sessionId = uuid.v4();
        this.set(sessionId);

        return sessionId;
    }

    destroy(req, res) {
        const sessionId = req.sessionId;
        delete this.#sessions[sessionId];
        this.#storeSessions();
    }
}

const sessions = new Session();

app.use((req, res, next) => {
    let currentSession = {};
    let sessionId = req.get(SESSION_KEY);

    if (sessionId) {
        currentSession = sessions.get(sessionId);
        if (!currentSession) {
            currentSession = {};
            sessionId = sessions.init(res);
        }
    } else {
        sessionId = sessions.init(res);
    }

    req.session = currentSession;
    req.sessionId = sessionId;

    onFinished(req, () => {
        const currentSession = req.session;
        const sessionId = req.sessionId;
        sessions.set(sessionId, currentSession);
    });

    next();
});

app.use(async (req, res, next) => {
    let expires_in = req.session.expires_in
    let sessionId = req.get(SESSION_KEY);

    
    if (sessionId && expires_in) {
        const getMinutesDiff = (start, end) => {
            const diff = end.getTime() - start.getTime()

            return (diff / 60000)
        }

        const expires = new Date(expires_in);
        const now = new Date()
        
        if (now < expires && getMinutesDiff(now, expires) < 10)
        {
            const refresh_token = req.session.refresh_token;
            
            if (refresh_token) {
                await authService.refreshToken(refresh_token)
                    .then(async response => {
                        if (response.status === 200) {
                            const {access_token, expires_in} = await response.json()
                            req.session.access_token = access_token;

                            let now = new Date()
                            req.session.expires_in = now.setSeconds(now.getSeconds() + expires_in);
                        }
                    })
            } else {
                req.session.username = ''
                req.session.login = ''
                req.session.access_token = '',
                req.session.refresh_token = ''
            }
        }
    }   

    next()
})

app.get('/create', (_, res) => {
    res.sendFile(path.join(__dirname + '/createUser.html'))
})


app.get('/', (req, res) => {
    if (req.session.username) {
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

                res.json({ token: req.sessionId });
            } else {
                res.status(401).send()
            }
        }).catch (_ => res.status(401).send())
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})