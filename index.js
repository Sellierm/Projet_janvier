const express = require('express');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const http = require('http');
const crypto = require('crypto');
const session = require('express-session')({
    secret: "eb8fcc253281389225b4f7872f2336918ddc7f689e1fc41b64d5c4f378cdc438",
    resave: false,
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

if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    session.cookie.secure = true // serve secure cookies
}
io.use(sharedsession(session, {
    // Session automatiquement sauvegardée en cas de modification
    autoSave: true
}));

//routeur
app.get('/', function (request, response) {
    let sessionData = request.session;
    if (!sessionData.username) {
        response.sendFile(path.join(__dirname + '/front/html/login.html'));
    }
    else {
        response.sendFile(path.join(__dirname + '/front/html/index.html'));
    }
});
const data = require('./back/modules/dbModule.js')

//login
app.post('/auth', function (request, response) {
    // Capture the input fields
    let username = request.body.username;
    let password = request.body.password;

    // Ensure the input fields exists and are not empty
    if (username && password) {
        const url = data.url;
        const dbName = data.name;
        const client = new MongoClient(url);
        client.connect(function (err) {
            console.log("Connected successfully to server");
            const db = client.db(dbName);
            const collection = db.collection(data.database_users);
            collection.find({ "username": `${username}` }).toArray(function (err, docs) {
                //console.log(docs);
                client.close();
                if (docs.length === 1) {
                    const hash = crypto.createHash('sha512').update(password).digest('hex');
                    if (hash === docs[0].password) {
                        request.session.username = username;
                        request.session.save();
                    }
                }
            });
        });
    }
    response.redirect('/');
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