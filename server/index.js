function run(){

// set up ======================================================================
// get all the tools we need
	var express  = require("express");
	var app 	 = express();
    var port     = process.env.PORT || 8080;
    var passport = require('passport');
    var flash    = require('connect-flash');
    var morgan       = require('morgan');
    var cookieParser = require('cookie-parser')();
    var bodyParser   = require('body-parser');
    var session      = require('express-session');
    var http        = require('http').createServer(app);
    var io          = require('socket.io')(http);
    var fileUpload = require('express-fileupload');
    var expressValidator = require('express-validator');

// load up the models
    var userModel            = require('../models/users');

// pass passport for configuration
    require('./passport')(passport, userModel);

// set up our application
    app.use(morgan('dev')); // log every request to the console

    app.set('view engine', 'ejs');
    app.use(expressValidator());
    app.use(fileUpload());


    var sessionMiddleware = session({ secret: 'test!23:"?<>6787zimayfgkz;ttcnLETTO'});

    app.use(cookieParser); // read cookies (needed for auth)
    app.use(bodyParser()); // get information from html forms


    app.use(sessionMiddleware); // session secret
    var passportInit = passport.initialize();
    app.use(passportInit);
    var passportSession = passport.session();
    app.use(passportSession); // persistent login sessions
    app.use(flash()); // use connect-flash for flash messages stored in session


    io.use(function(socket, next){
        socket.client.request.originalUrl = socket.client.request.url;
        cookieParser(socket.client.request, socket.client.request.res, next);
    });

    io.use(function(socket, next){
        socket.client.request.originalUrl = socket.client.request.url;
        sessionMiddleware(socket.client.request,   socket.client.request.res, next);
    });

    io.use(function(socket, next){
        passportInit(socket.client.request, socket.client.request.res, next);
    });

    io.use(function(socket, next){
        passportSession(socket.client.request, socket.client.request.res, next);
    });


    app.use('/', express.static(__dirname + '/../public'));

    var router   = require("./router");
    router(app, passport, userModel);
    require('../application/index.js')(io, userModel);

// launch ======================================================================
	http.listen(port, function(){
		console.log("listening "+ port +" port");
	})

}

module.exports = run;
