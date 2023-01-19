const express = require('express');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const http = require('http');
const crypto = require('crypto');
//import { generateId } from './back/fonctions/id.js'
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
const { ResultWithContext } = require('express-validator/src/chain/context-runner-impl.js');

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
//login page
app.get('/', function (req, res) {
    req.session.regenerate(function (err) {
        // req.session is now a new session and no longer the original session
        if (err) console.log(err)
    });
    res.sendFile(path.join(__dirname + '/front/html/login.html'));
});
//register page
app.get('/reg', function (req, res) {
    res.sendFile(path.join(__dirname + '/front/html/register.html'));
});
//home page
app.get('/home', authMiddleware, function (req, res) {
    if (req.session.isAdmin) {
        res.sendFile(path.join(__dirname + '/front/html/index.html'));
    }
    else {
        res.sendFile(path.join(__dirname + '/front/html/indexClient.html'));
    }
});
//edit
app.get('/edit', authMiddleware, function (req, res) {
    if (req.session.isAdmin) {
        res.sendFile(path.join(__dirname + '/front/html/edit.html'));
    }
    else {
        res.sendFile(path.join(__dirname + '/front/html/indexClient.html'));
    }
});
//plans
app.get('/plans', authMiddleware, function (req, res) {
    if (req.session.isAdmin) {
        res.sendFile(path.join(__dirname + '/front/html/plans.html'));
    }
    else {
        res.sendFile(path.join(__dirname + '/front/html/plansClient.html'));
    }
});
//planning 
app.get('/planning', authMiddleware, function (req, res) {
    if (req.session.isAdmin) {
        res.sendFile(path.join(__dirname + '/front/html/planning.html'));
    }
    else {
        res.sendFile(path.join(__dirname + '/front/html/planning.html'));
    }
});


//session destroy for decconection
app.get('/deco', function (req, res) {
    req.session.destroy(function (err) {
        // req.session is now a new session and no longer the original session
        if (err) console.log(err);
        else res.redirect('/');
    });
})
//login ajax request
app.post('/auth', function (req, res) {
    // Capture the input fields
    let mail = req.body.mail;
    let password = req.body.password;

    // Ensure the input fields exists and are not empty
    if (mail && password) {
        const url = data.url;
        const dbName = data.name;
        const client = new MongoClient(url);
        client.connect(function (err) {
            //console.log("Connected successfully to server");
            const db = client.db(dbName);
            const collection = db.collection(data.database_users);
            collection.find({ "mail": `${mail}` }).toArray(function (err, result) {
                //console.log(result);
                client.close();
                if (result && result.length === 1) {
                    const hash = crypto.createHash('sha512').update(password).digest('hex');
                    if (hash === result[0].password) {
                        req.session.isAuthenticated = true;
                        req.session.mail = mail;
                        if (result[0].admin === "true") {
                            req.session.isAdmin = true;
                        }
                        res.status(200).json({ success: true });
                    }
                    else {
                        res.status(401).json({ success: false });
                    }
                }
                else {
                    res.status(401).json({ success: false });
                }
            });
        });
    }
    else {
        res.status(401).json({ success: false });
    }
});
//register ajax request
app.post('/reg', (req, res) => {
    // Si l'utilisateur n'est pas connecté
    let email = req.body.mail;
    let password = req.body.password;
    let rptpassword = req.body.rptpassword;

    const url = data.url;
    const dbName = data.name;
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(function (err) {
        console.log(err)
        const db = client.db(dbName);
        const collection = db.collection(data.database_users);
        if (password === rptpassword) {
            collection.find({ mail: email }).toArray(function (err, result) {
                if (err) console.log(err)
                else if (!result[0]) {
                    collection.insertOne({
                        mail: email,
                        password: crypto.createHash('sha512').update(password).digest('hex'),
                        admin: "false"
                    }, (err, result) => {
                        if (err) {
                            console.log(err);
                        } else {
                            //console.log("Inserted new user into the collection");
                            // Redirect the user to the homepage or a signup success page
                            res.status(200).json({ success: true });
                            client.close();
                        }
                    });
                }
                else {
                    res.status(401).json({ success: false });
                }
            });
        }
        else res.status(401).json({ success: false });
    });
});
//save plans
app.post('/save', (req, res) => {
    const name = req.body.name;
    let salles = JSON.parse(req.body.salles);
    const width = req.body.width
    const heigth = req.body.height

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let newIdStage = '';
    for (let i = 0; i < 20; i++) {
        newIdStage += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    salles.forEach(element => {
        element.stage = newIdStage;
    });

    console.log(heigth)
    console.log(width)
    console.log(name)
    console.log(salles)

    const url = data.url;
    const dbName = data.name;
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(function (err) {
        console.log(err)
        const db = client.db(dbName);
        let collection = db.collection(data.database_stages);
        collection.find({ idStage: newIdStage }).toArray(function (err, result) {
            if (err) console.log(err)
            else if (result.length == 0) {
                collection.insertOne({
                    idStage: newIdStage,
                    name: name,
                    width: width,
                    height: heigth
                }, (err, result) => {
                    if (err) {
                        console.log(err);
                    } else {
                        //console.log("Inserted new user into the collection");
                        // Redirect the user to the homepage or a signup success page
                        //res.status(200).json({ success: true });
                        collection = db.collection(data.database_rooms);
                        collection.insertMany(salles, (err, result) => {
                            if (err) {
                                console.log(err);
                            } else {
                                //console.log("Inserted new user into the collection");
                                // Redirect the user to the homepage or a signup success page
                                res.status(200).json({ success: true });
                                client.close();
                            }
                        });
                    }

                });
            }
            else {
                res.status(401).json({ success: false });
            }
        });
    });
});

//load plans
app.post('/loadPlans', (req, res) => {
    const url = data.url;
    const dbName = data.name;
    const client = new MongoClient(url);
    client.connect(function (err) {
        //console.log("Connected successfully to server");
        const db = client.db(dbName);
        const collection = db.collection(data.database_stages);
        collection.find({}).toArray(function (err, result) {
            console.log(result);
            console.log(JSON.stringify(result));
            client.close();
            if (result && result.length > 0) {
                res.status(200).json({ result: JSON.stringify(result) });
            }
            else {
                res.status(401).json({ result: JSON.stringify(result) });
            }
        });
    });
});


app.post('/loadPlan', (req, res) => {
    console.log(req.body);
    const idStage = req.body.stage;
    const dateNow = Date.parse(req.body.date);
    

    const url = data.url;
    const dbName = data.name;
    const client = new MongoClient(url);
    client.connect(function (err) {
        //console.log("Connected successfully to server");
        const db = client.db(dbName);
        let collection = db.collection(data.database_stages);
        collection.find({ idStage: idStage }).toArray(function (err, result1) {
            console.log(result1);
            console.log(JSON.stringify(result1));

            if (result1 && result1.length > 0) {
                collection = db.collection(data.database_rooms);
                collection.find({ stage: idStage }).toArray(function (err, result2) {
                    console.log(result2);
                    console.log(JSON.stringify(result2));
                    
                    collection = db.collection(data.database_bookings);
                    collection.find({ idStage: idStage, start:{$lt:dateNow}, end:{$gt:dateNow}}).toArray(function (err, result3) {
                        console.log(result3);
                        console.log(JSON.stringify(result3));
                        client.close();

                        res.status(200).json({ result1: JSON.stringify(result1), result2: JSON.stringify(result2), result3: JSON.stringify(result3) });
                    });
                });

            }
            else {
                res.status(401).json({ result: JSON.stringify(result1) });
            }
        });
    });
});




//save plans
app.post('/book', (req, res) => {
    const idSalle = req.body.idSalle;
    const idStage = req.body.idStage;
    const start = Date.parse(req.body.start);
    const end = Date.parse(req.body.end);
    const user = req.session.mail;
    

    const url = data.url;
    const dbName = data.name;
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(function (err) {
        console.log(err)
        const db = client.db(dbName);
        let collection = db.collection(data.database_bookings);
        
        collection.insertOne({
            idSalle: idSalle,
            idStage: idStage,
            start: start,
            end: end,
            user: user
        }, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                res.status(200).json({ success: true });
                client.close();
            }

        });
    });
});


//start server at localhost:4200
server.listen(8080, () => {
    console.log('Serveur lancé sur le port 8080');
});