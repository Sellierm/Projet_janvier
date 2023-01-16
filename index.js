
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
});


app.post('/auth', function (request, response) {
    // Capture the input fields
    let username = request.body.username;
    let password = request.body.password;

    // Ensure the input fields exists and are not empty
    if (username && password) {
        // Execute SQL query that'll select the account from the database based on the specified username and password
        connection.query('SELECT * FROM user WHERE name = ?', [username], function (error, results) {
            // If there is an issue with the query, output the error
            if (error) throw error;
            // If the account exists

            if (results.length == 1) {
                const hash = crypto.createHash('sha384').update(password).digest('hex');
                if (hash === results[0].password) {
                    // Authenticate the user
                    request.session.save();
                    request.session.username = username;
                    // Redirect to home page
                    const crypt = Buffer.from(sM.applicationId + ':' + sM.applicationSecret).toString('base64');
                    //get token for sencrop data
                    const askAccessData =
                        fetch(`${sM.endPoint}/oauth2/token`, {
                            body: '{"grant_type": "client_credentials", "scope": "user"}',
                            headers: {
                                Authorization: `Basic ${crypt}`,
                                "Content-Type": "application/json"
                            },
                            method: "POST"
                        }).then((response) => {
                            return response.json();
                        })
                    //beyond this point token is necessary
                    const getAccessData = async () => {
                        let accessData = await askAccessData;
                        //console.log(accessData);
                        //token
                        sM.accessToken = accessData.access_token;
                        //console.log(sM.accessToken);
                        response.redirect('/');
                    }; getAccessData();
                }
                else {
                    response.redirect('/');
                }

            }
            else {
                response.redirect('/');
            }

        });
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