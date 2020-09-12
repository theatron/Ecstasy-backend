const express = require('express');
const app = express();
const bodyParser = require('body-parser')

//    ****************
//    Initializing app
//    **************** 

//Routes setup
const pages = require('../routes/pages');

//Setting Pages Router
app.use('/',pages);

//Firebase functions
const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

//Admin control
const  admin = require("firebase-admin");

//Service Account access
const serviceAccount = require("../path/Ecstasy/theatronfinal-firebase-adminsdk-b3s0e-39afec9164.json");

//Firebase app initialization
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://theatronfinal.firebaseio.com"
});

//Database 
const db = admin.database();

//    *******************
//    M I D D L E W A R E
//    *******************

//Body Parser

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())

//Public dir path set
app.use(express.static(publicDirPath));







