const functions = require('firebase-functions');
const express = require('express');
const app1 = express();
// const bodyParser = require('body-parser');
// const cookieParser = require('cookie-parser');
// const cors = require('cors');



//Routes setup
const users = require('./routes/users');



//Setting users Router
app1.use('/',users);


// app1.listen(3000);
exports.app = functions.https.onRequest(app1);


