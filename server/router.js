function run(app, passport, userModel){

    //Создадим объект для передачи данных в template
    var dataToTemplate = {
    };

    //middleware подготовим информацию вошел ли пользователь в систему
    app.use(function (req, res, next) {
       dataToTemplate.auth = req.isAuthenticated();
       next();
    });

    //Отображаем главную страницу
	app.get("/", function(req, res){
	    dataToTemplate.page = "main";
	    dataToTemplate.message = req.flash('loginMessage').concat(req.flash('signupMessage'));// не красиво
		res.render('template', dataToTemplate );
	});

    //Отображаем /about
	app.get("/about", function(req, res){
	    dataToTemplate.page = "about";
	    dataToTemplate.message = "";
		res.render('template', dataToTemplate );
	});

	//Отображаем страницу игры для зарегестрированного пользователя
    app.get("/game", isLoggedIn, function(req, res){
        dataToTemplate.page = "game";
        res.render('template', dataToTemplate );
    });

    //Обработаем форму входа
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/', // redirect back to the main page if there is an error
        failureFlash : true // allow flash messages
    }));

    //Обработаем форму регистрации
    app.post('/signup', isValidFormsData, passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/', // redirect back to the main page if there is an error
        failureFlash : true // allow flash messages
    }));

    app.post('/findEmail', function (req, res) {
        userModel.findOne({ 'local.email' : req.query.email }, function (req, user) {
            if (user) {
                res.send(true)
            } else {
                res.send(false)
            }
        })
    });

    app.post('/checkEmail', function (req, res) {
        if (req.user.local.email != req.query.email) {
            userModel.findOne({'local.email': req.query.email}, function (req, user) {
                if (user) {
                    res.send(false)
                } else {
                    res.send(true)
                }
            })
        } else {
            res.send(true)
        }
    });

    app.post('/checkPassword', function (req, res) {
        var pass = req.query.pass;
        userModel.findOne({ 'local.email' : req.query.email }, function (req, user) {
            if ( user && user.validPassword(pass)) {
                res.send(true)
            } else {
                res.send(false)
            }
        })
    });

    //Отображаем профиль пользователя для зарегестрированного пользователя
    app.get('/profile', isLoggedIn, function(req, res) {
        req.session.user = req.user; // для socket
        dataToTemplate.page = "profile";
        dataToTemplate.message = req.flash('profileMessage');
        dataToTemplate.user = req.user;
        res.render('template', dataToTemplate);
    });

    //пополняем баланс
    app.post('/topUpBalance', function (req, res) {
        var sessionUser = req.session.user; // для socket

        userModel.findById(req.user._id, function (req, user) {
            user.local.balance += 1000;
            user.save(function (err) {
                if (err) {
                    console.error(err);
                    res.status(500);
                    res.send("");
                    return;
                } else {
                    sessionUser.local.balance = user.local.balance;
                    res.send('' + user.local.balance)
                }

            })
        })
    });

    //Обработаем форму профиля пользователя
    app.post('/editProfile', function (req, res) {
        req.check('fName', "Fname is invalid").isLength({min: 2});
        req.check('lName', "Lname is invalid").isLength({min: 2});
        req.check('email', "Invalid email address").notEmpty().withMessage('Email is required').isEmail();
        if (req.body.password != "") {
            var passwdRegexp = /^(?=.*\d)(?=.*\W)(?=.*[a-z])(?=.*[A-Z])[A-Za-z\d\W]{8,}$/;
            req.check('password', 'Invalid password').matches(passwdRegexp).equals(req.body.confirmPassword);
        }
        if (req.validationErrors()) {
            req.flash('profileMessage', req.validationErrors());
        } else {

            var formData = req.body,
                formFiles = req.files;
            userModel.findById(req.user._id, function (req, user) {

                user.local.fName = formData.fName;
                user.local.lName = formData.lName;
                user.local.email = formData.email;
                if (formData.password != "") user.local.password = user.local.generateHash(formData.password);

                //upload avatar files
                if (formFiles.avatarFile) {
                    var avatarFile = formFiles.avatarFile,
                        avatarFileForSave = user._id + avatarFile.name.slice(avatarFile.name.indexOf("."));

                    avatarFile.mv(( './public/avatars/' + avatarFileForSave), function (err) {
                        if (err) return res.status(500).send(err);
                        console.log('File uploaded!');
                    });
                    user.local.avatarFile = '/avatars/' + avatarFileForSave;
                }

                user.save(function (err) {
                    if (err) {
                        console.error(err);
                        res.status(500);
                        res.send("");
                        return;
                    }
                })
            });
        }
        res.redirect('/profile')

    });

    //Пользователь выходит
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

	//404
	app.use(function(req, res){
        dataToTemplate.page = "404";
		res.status(404);
		res.render('template', dataToTemplate );
	});

	//500
	app.use(function(err, req, res, next){
        if(err) console.log(err);
        dataToTemplate.page = "500";
        res.status(500);
		res.render('template', dataToTemplate );
	})
}

//Валидация для резистрации
function isValidFormsData(req, res, next) {

    //check email
    req.check('email', "Invalid email address").notEmpty().withMessage('Email is required').isEmail();

    //check password
    var passwdRegexp = /^(?=.*\d)(?=.*\W)(?=.*[a-z])(?=.*[A-Z])[A-Za-z\d\W]{8,}$/;
    req.check('password', 'Password is required').notEmpty();
    req.check('password', 'Invalid password').matches(passwdRegexp);
    req.check('password', 'Confirm password not equals password').equals(req.body.confirmPassword);

    if (!req.validationErrors())
        return next();

    req.flash('signupMessage', req.validationErrors());
    res.redirect('/');
}

//middleware чтобы убедиться, что пользователь вошел в систему
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}

module.exports = run;