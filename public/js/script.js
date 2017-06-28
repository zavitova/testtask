console.log("client script");
$(document).ready(function () {

    $('#linkLogin').on('click', function (event) {
        bj.goToMenu('#menuLogin', event, this);
    });

    $('#linkSignup').on('click', function (event) {
        bj.goToMenu('#menuSignup', event, this);
    });


    $("#formLogin").on('submit', function(event) {
        event.preventDefault();
        bj.validations.isCorrectLoginData();
    });

    $("#formLogin").on('blur', '[name="email"]', function () {
        var val = $(this).val(),
            elm = $(this).parent();

        bj.validations.checkEmailForLogin(val, function (messageArr) {
            bj.showMessage(('emailErr'), messageArr);
            if (messageArr.length > 0) {
                bj.addErrorDecoration(elm);
            } else {
                bj.validations.isCorrectLoginData();
            }
        })
    });

    $("#formLogin").on('blur', '[name="password"]', function () {
        var val = $(this).val(),
            emailVal = $("#formLogin").children().children('[name="email"]').val(),
            elm = $(this).parent();

        bj.validations.checkPasswordForLogin(val, emailVal, function (messageArr) {
            bj.showMessage(('emailErr'), messageArr);
            if (messageArr.length > 0) {
                bj.addErrorDecoration(elm);
            } else {
                bj.validations.isCorrectLoginData();
            }
        })
    });


    $("#formSignup").on('submit', function(event) {
        event.preventDefault();
        bj.validations.isCorrectSignupData();
    });

    $("#formSignup").on('blur', '[name="email"]', function () {
        var val = $(this).val(),
            elm = $(this).parent();

        bj.validations.checkEmailForSave(val, function (messageArr) {
            bj.showMessage(('emailErr'), messageArr);
            if (messageArr.length > 0) {
                bj.addErrorDecoration(elm);
            } else {
                bj.validations.isCorrectSignupData();
            }
        })
    });

    $("#formSignup").on('blur', '[name="password"]', function () {
        var val = $(this).val(),
            elm = $(this).parent();

        bj.validations.checkPasswordForSave(val, function (messageArr) {
            bj.showMessage(('passwordErr'), messageArr);
            if (messageArr.length > 0) {
                bj.addErrorDecoration(elm);
            } else {
                bj.validations.isCorrectSignupData();
            }
        })
    });

    $("#formSignup").on('blur', '[name="confirmPassword"]', function () {
        var val = $(this).val(),
            confirmVal = $("#formSignup").children().children('[name="password"]').val(),
            elm = $(this).parent();

        bj.validations.checkConfirmPasswordForSave(val, confirmVal, function (messageArr) {
            bj.showMessage(('confirmPasswordErr'), messageArr);
            if (messageArr.length > 0) {
                bj.addErrorDecoration(elm);
            } else {
                bj.validations.isCorrectSignupData();
            }
        })
    });

    $('form').on('focus', 'input', function () {
        bj.removeErrorDecoration($(this).parent())
    });

});