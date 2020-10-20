const functions = require('firebase-functions');
const express = require('express');
const app1 = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const formData = require("express-form-data");

const morgan = require('morgan');
const _ = require('lodash');
const os = require('os')


//    *******************
//    M I D D L E W A R E
//    *******************

app1.use(fileUpload());

const options = {
    uploadDir: os.tmpdir(),
    autoClean: true
  };
   
  // parse data with connect-multiparty. 
  app1.use(formData.parse(options));
  // delete from the request all empty files (size == 0)
  app1.use(formData.format());
  // change the file objects to fs.ReadStream 
  app1.use(formData.stream());
  // union the body and the files
  app1.use(formData.union());

app1.use(cors({ origin: true }))

//express parsing json
app1.use(express.json())

app1.use(morgan('dev'));

//Cookie parser
app1.use(cookieParser());

//Body Parser

// parse application/x-www-form-urlencoded
app1.use(bodyParser.urlencoded({ extended: false, limit: '50MB' }));
 
// parse application/json
app1.use(bodyParser.json());


//Routes setup
const users = require('./routes/users');



//Setting users routes
app1.use(users);

const runtimeOpts = {
       timeoutSeconds: 540,
       memory: '512MB'
    }

exports.app = functions.runWith(runtimeOpts).https.onRequest(app1);


