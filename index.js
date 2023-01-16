
const express = require('express');
const path = require('path');

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

// http://localhost:3000/
app.get('/', function (request, response) {
    let sessionData = request.session;
    response.sendFile(path.join(__dirname + '/front/html/login.html'));
});


app.post('/auth', function (request, response) {

    // Capture the input fields
    let username = request.body.username;
    let password = request.body.password;

    // Ensure the input fields exists and are not empty
    if (username && password) {
        response.sendFile(path.join(__dirname + '/front/html/index.html'));

    };
});




io.on('connection', (socket) => {

    socket.on('login', () => {
        let srvSockets = io.sockets.sockets;

        //console.log(srvSockets)
        srvSockets.forEach(user => {
            //userTab.push(user.handshake.session.username);
            //console.log(user)
        });
        //io.emit('users', userTab)
    });

});


//alwaysdata var
//console.log(process.env.PORT, process.env.IP,)
/*server.listen(process.env.PORT, process.env.IP, () => {
    console.log('server start');
});*/
//local var
server.listen(4200, () => {
    console.log('Serveur lancé sur le port 4200');
});