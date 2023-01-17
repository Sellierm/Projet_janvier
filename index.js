const express = require('express');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const http = require('http');
const crypto = require('crypto');
const session = require('express-session')({
    secret: "eb8fcc253281389225b4f7872f2336918ddc7f689e1fc41b64d5c4f378cdc438",
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 2 * 60 * 60 * 1000,
        secure: false
    }
});

const app = express();
const server = http.Server(app);
const io = require('socket.io')(server);
const sharedsession = require("express-socket.io-session");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname + '/front/')));
app.use(session);

const data = require('./back/modules/dbModule.js');

if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    session.cookie.secure = true // serve secure cookies
}
io.use(sharedsession(session, {
    // Session automatiquement sauvegardée en cas de modification
    autoSave: true
}));

//vérifie que l'user est bien authentifié
const authMiddleware = (req, res, next) => {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/');
    }
}

app.get('/', function (req, res) {
    req.session.regenerate(function (err) {
        // req.session is now a new session and no longer the original session
        if (err) console.log(err)
    });
    res.sendFile(path.join(__dirname + '/front/html/login.html'));
});

app.get('/home', authMiddleware, function (req, res) {
    res.sendFile(path.join(__dirname + '/front/html/index.html'));
});

app.get('/deco', function (req, res) {
    req.session.destroy(function (err) {
        // req.session is now a new session and no longer the original session
        if (err) console.log(err);
        else res.redirect('/');
    });
})

//login
app.post('/auth', function (req, res) {
    // Capture the input fields
    let username = req.body.username;
    let password = req.body.password;
    // Ensure the input fields exists and are not empty
    if (username && password) {
        const url = data.url;
        const dbName = data.name;
        const client = new MongoClient(url);
        client.connect(function (err) {
            //console.log("Connected successfully to server");
            const db = client.db(dbName);
            const collection = db.collection(data.database_users);
            collection.find({ "username": `${username}` }).toArray(function (err, docs) {
                //console.log(docs);
                client.close();
                if (docs && docs.length === 1) {
                    const hash = crypto.createHash('sha512').update(password).digest('hex');
                    if (hash === docs[0].password) {
                        req.session.isAuthenticated = true;
                        res.redirect('/home')
                    }
                    else {
                        res.redirect('/');
                    }
                }
                else {
                    res.redirect('/');
                }
            });
        });
    }
    else {
        res.redirect('/');
    }
});

io.on('connection', (socket) => {
    socket.on('login', () => {
        let srvSockets = io.sockets.sockets;
        //console.log(srvSockets)
        //io.emit('users', userTab)
    });

});

//start server at localhost:4200
server.listen(4200, () => {
    console.log('Serveur lancé sur le port 4200');
});