'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require("express-session");
const cookieParser=require("cookie-parser");
const passport = require("passport");
const passportSocketIo=require("passport.socketio");
const MongoStore = require('connect-mongo')(session);

const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();
const http = require("http").createServer(app);

//! change our server to websocket protocols when it called 
const io = require("socket.io")(http);

//! set new memory store session with mongodb
const store = new MongoStore({ url: process.env.MONGO_URI });

//!  import routes & auth
const routes = require("./routes");
const auth = require("./auth");

fccTesting(app); //! For FCC testing purposes

app.set('view engine','pug');
app.set('views',path.join(__dirname,'./views/'));

app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid',
  store: store
}));

//!authorize socket io connection 
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

app.use(passport.initialize());
app.use(passport.session());

let currentUsers = 0;

//! connect to database 
myDB(async client=>{

  const myDatabase = await client.db('fcc_boilerplate_advancenode').collection('users')
  
  //!invoke routes & auth 
  routes(app,myDatabase);
  auth(app,myDatabase);

  //!when socket in connection 
  io.on('connection', socket => {
    //! increase current user 
    ++currentUsers;
    console.log('user ' + socket.request.user.name + ' connected');

    //!emit it with event name 'user' + 3 values(name user,counted user,connected or not)
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });
    
    //!when socket on disconnect
    socket.on('disconnect',()=>{
      //! decrease current user 
      --currentUsers;
      console.log("A user has been disconnected");

      //!emit it with event name 'user' + 3 values(name user,counted user,connected or not)
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });
    });
    //!socket on event 'chat message'
    socket.on('chat message',(message)=>{
      //!emit it with event name 'chat message' + 2 values (name user & message user sended)
      io.emit('chat message',{
        name:socket.request.user.name,
        message:message
      })
    })
  });

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

//!listening on port 8080
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});


