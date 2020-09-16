const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
//Routes setup
const users = require('./routes/users');

//    *******************
//    M I D D L E W A R E
//    *******************

//express parsing json
app.use(express.json())

//Cookie parser
app.use(cookieParser());

//Body Parser

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
 
// parse application/json
app.use(bodyParser.json());

//Setting users Router
app.use('/',users);



app.listen(3000,()=>{
  console.log('server is on 3000')
})




