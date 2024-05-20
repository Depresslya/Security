const jwt = require('jsonwebtoken');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';
const JWT_SECRET = 'your_jwt_secret';

class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            console.log(this.#sessions);
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

    init(res, payload) {
        const token = jwt.sign(payload, JWT_SECRET);
        this.set(token, payload);
        return token;
    }

    destroy(token) {
        delete this.#sessions[token];
        this.#storeSessions();
    }
}

const sessions = new Session();

app.use((req, res, next) => {
    let currentSession = {};
    let token = req.get(SESSION_KEY);

    if (token) {
        currentSession = sessions.get(token);
        if (!currentSession) {
            currentSession = {};
            token = sessions.init(res, currentSession);
        }
    } else {
        token = sessions.init(res, currentSession);
    }

    req.session = currentSession;

    onFinished(req, () => {
        const currentSession = req.session;
        sessions.set(token, currentSession);
    });

    next();
});

app.get('/', (req, res) => {
    if (req.session.username) {
        return res.json({
            username: req.session.username,
            logout: 'http://localhost:3000/logout'
        });
    }
    res.sendFile(path.join(__dirname+'/index.html'));
});

app.get('/logout', (req, res) => {
    const token = req.get(SESSION_KEY);
    sessions.destroy(token);
    res.redirect('/');
});

const users = [
    {
        login: 'Login',
        password: 'Password',
        username: 'Username',
    },
    {
        login: 'Login1',
        password: 'Password1',
        username: 'Username1',
    }
];

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    const user = users.find((user) => {
        if (user.login === login && user.password === password) {
            return true;
        }
        return false;
    });

    if (user) {
        const payload = { login: user.login, username: user.username };
        const token = sessions.init(res, payload);
        res.json({ token });
    } else {
        res.status(401).send();
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
