const express = require('express');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const http = require('http');
const crypto = require('crypto');
const multer = require('multer');
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
const upload = multer();

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
        res.sendFile(path.join(__dirname + '/front/html/homeAdmin.html'));
    }
    else {
        res.sendFile(path.join(__dirname + '/front/html/homeClient.html'));
    }
});
//edit
app.get('/edit', authMiddleware, function (req, res) {
    if (req.session.isAdmin) {
        res.sendFile(path.join(__dirname + '/front/html/edit.html'));
    }
    else {
        res.sendFile(path.join(__dirname + '/front/html/homeClient.html'));
    }
});
//plans
app.get('/plans', authMiddleware, function (req, res) {
    if (req.session.isAdmin) {
        res.sendFile(path.join(__dirname + '/front/html/plansAdmin.html'));
    }
    else {
        res.redirect('/reserver');
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
//reserve
app.get('/reserver', authMiddleware, function (req, res) {
    res.sendFile(path.join(__dirname + '/front/html/plansClient.html'));
});
app.get('/contact', authMiddleware, function (req, res) {
    res.sendFile(path.join(__dirname + '/front/html/contact.html'));
});
//session destroy for decconection
app.get('/deco', function (req, res) {
    req.session.destroy(function (err) {
        // req.session is now a new session and no longer the original session
        if (err) console.log(err);
        res.redirect('/');
    });
})


//login ajax request
app.post('/auth', async (req, res) => {
    // Capture the input fields
    const mail = req.body.mail;
    const password = req.body.password;

    // Ensure the input fields exists and are not empty
    if (!mail || !password) {
        return res.status(401).json({ success: false });
    }

    try {
        const url = data.url;
        const dbName = data.name;

        const client = await new MongoClient(url);

        await client.connect();

        const db = client.db(dbName);

        const collection = db.collection(data.database_users);

        const result = await collection.findOne({ mail });

        client.close();

        if (!result) {
            return res.status(401).json({ success: false });
        }

        const hash = crypto.createHash('sha512').update(password).digest('hex');

        if (hash === result.password) {
            req.session.isAuthenticated = true;
            req.session.mail = mail;

            if (result.admin === "true") {
                req.session.isAdmin = true;
            }

            return res.status(200).json({ success: true });
        } else {
            return res.status(401).json({ success: false });
        }

    } catch (err) { console.log("Error connecting to database", err); }
});
//register ajax request
app.post('/reg', async (req, res) => {
    // Si l'utilisateur n'est pas connecté
    let email = req.body.mail;
    let password = req.body.password;
    let rptpassword = req.body.rptpassword;

    const url = data.url;
    const dbName = data.name;

    try {
        const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();

        const db = client.db(dbName);
        const collection = db.collection(data.database_users);

        if (password === rptpassword) {
            const userExists = await collection.find({ mail: email }).toArray();

            if (!userExists[0]) {
                await collection.insertOne({
                    mail: email,
                    password: crypto.createHash('sha512').update(password).digest('hex'),
                    admin: "false"
                });

                // Redirect the user to the homepage or a signup success page 
                res.status(200).json({ success: true });

            } else {
                res.status(401).json({ success: false });
            }

            client.close();

        } else {
            res.status(401).json({ success: false });

        }

    } catch (err) { console.log(err) };
});

//save plans
app.post('/save', authMiddleware, upload.single('image'), (req, res) => {
    const image = req.file
    //console.log(image)

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

    //console.log(heigth)
    //console.log(width)
    //console.log(name)
    //console.log(salles)

    const url = data.url;
    const dbName = data.name;
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(function (err) {
        console.log(err)
        const db = client.db(dbName);
        let collection = db.collection(data.database_stages);
        const base64Image = Buffer.from(image.buffer).toString('base64')
        collection.find({ idStage: newIdStage }).toArray(function (err, result) {
            if (err) console.log(err)
            else if (result.length == 0) {
                collection.insertOne({
                    idStage: newIdStage,
                    name: name,
                    width: width,
                    height: heigth,
                    b64Img: base64Image
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
app.post('/loadPlans', authMiddleware, (req, res) => {
    const url = data.url;
    const dbName = data.name;
    const client = new MongoClient(url);
    client.connect(function (err) {
        //console.log("Connected successfully to server");
        const db = client.db(dbName);
        const collection = db.collection(data.database_stages);
        collection.find({}).toArray(function (err, result) {
            //console.log(result);
            //console.log(JSON.stringify(result));
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


app.post('/loadPlan', authMiddleware, (req, res) => {
    //console.log(req.body);
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
            //console.log(result1);
            //console.log(JSON.stringify(result1));

            if (result1 && result1.length > 0) {
                collection = db.collection(data.database_rooms);
                collection.find({ stage: idStage }).toArray(function (err, result2) {
                    //console.log(result2);
                    //console.log(JSON.stringify(result2));

                    collection = db.collection(data.database_bookings);
                    collection.find({ idStage: idStage, start: { $lt: dateNow }, end: { $gt: dateNow } }).toArray(function (err, result3) {
                        //console.log(result3);
                        //console.log(JSON.stringify(result3));
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


app.post('/loadSchedule', authMiddleware, (req, res) => {
    //console.log(req.body);
    const idSalle = req.body.salle;
    const dateNow = new Date(req.body.date);
    const startDay = dateNow.setHours(6, 0, 0, 0);
    const endDay = dateNow.setHours(22, 0, 0, 0);
    //console.log(dateNow.getDate());


    const url = data.url;
    const dbName = data.name;
    const client = new MongoClient(url);
    client.connect(function (err) {
        //console.log("Connected successfully to server");
        const db = client.db(dbName);
        let collection = db.collection(data.database_bookings);
        collection.find({ idSalle: idSalle, start: { $gt: startDay }, end: { $lt: endDay } }).toArray(function (err, result) {
            //console.log(result);
            //console.log(JSON.stringify(result));

            client.close();

            res.status(200).json({ result: JSON.stringify(result) });
        });
    });
});




//save plans
app.post('/book', authMiddleware, (req, res) => {
    const idSalle = req.body.idSalle;
    const idStage = req.body.idStage;
    let start = new Date(req.body.start);
    let end = new Date(req.body.end);
    const user = req.session.mail;
    //console.log('test');

    const now = new Date();
    const min = new Date();
    min.setHours(7);
    min.setMinutes(0);
    const max = new Date();
    max.setHours(20);
    max.setMinutes(0);

    console.log('start', start.toISOString(), 'end', end.toISOString());
    if (parseInt(start.getMinutes()) < 30) {
        start.setMinutes(0, 0, 0);
    }
    else {
        start.setMinutes(30, 0, 0);
    }
    if (end <= start) {
        end = start
        end.setMinutes(end.getMinutes() + 30);
    }
    else {
        if (parseInt(end.getMinutes()) < 30) {
            end.setMinutes(0, 0, 0);
        }
        else {
            end.setMinutes(30, 0, 0);
        }
    }
    console.log('start', start.toISOString(), 'end', end.toISOString());

    if (start >= now && end >= now && start.getHours() >= min.getHours() && start.getMinutes() >= min.getMinutes() && end.getHours() <= max.getHours() && end.getMinutes() <= max.getMinutes()) {

        const inputStart = start.getTime();
        const inputEnd = end.getTime();


        const url = data.url;
        const dbName = data.name;
        const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
        client.connect(function (err) {
            //console.log(err)
            const db = client.db(dbName);
            let collection = db.collection(data.database_bookings);

            collection.find({ idSalle: idSalle, start: { $lt: inputStart }, start: { $gt: inputStart }, end: { $lt: inputEnd }, end: { $gt: inputEnd } }).toArray(function (err, verif) {
                console.log('test', verif, verif.length)
                if (verif && verif.length == 0) {
                    collection.insertOne({
                        idSalle: idSalle,
                        idStage: idStage,
                        start: inputStart,
                        end: inputEnd,
                        user: user
                    }, (err, result) => {
                        if (err) {
                            console.log(err);
                        } else {
                            res.status(200).json({ success: true });
                            client.close();
                        }

                    });
                }
            });


        });
    }
});


//start server at localhost:4200
server.listen(8080, () => {
    console.log('Serveur lancé sur le port 8080');
});