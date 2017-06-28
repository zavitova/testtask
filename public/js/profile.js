console.log("client script profile.js");
$(document).ready(function () {

    $("#formProfile").on('submit', function(event) {
        event.preventDefault();
        //var form = $(this);
        //console.log( $(this).serialize() );
        bj.validations.isCorrectProfileData( function () {
       //     $.post('/editProfile', form.serialize())
        });
    });

    $("#formProfile").on('blur', '[name="fName"]', function () {
        var val = $(this).val(),
            elm = $(this).parent();

        bj.validations.checkFNameForSave(val, function (messageArr) {
            bj.showMessage(('fNameErr'), messageArr);
            if (messageArr.length > 0) bj.addErrorDecoration(elm);
        })
    });

    $("#formProfile").on('blur', '[name="lName"]', function () {
        var val = $(this).val(),
            elm = $(this).parent();

        bj.validations.checkLNameForSave(val, function (messageArr) {
            bj.showMessage(('lNameErr'), messageArr);
            if (messageArr.length > 0) bj.addErrorDecoration(elm);
        })
    });

    $("#formProfile").on('blur', '[name="email"]', function () {
        var val = $(this).val(),
            elm = $(this).parent();

        bj.validations.checkNewEmailForSave(val, function (messageArr) {
            bj.showMessage(('emailErr'), messageArr);
            if (messageArr.length > 0) bj.addErrorDecoration(elm);
        })
    });

    $("#formProfile").on('blur', '[name="password"]', function () {
        var val = $(this).val(),
            elm = $(this).parent();

        if (val != '') {
            bj.validations.checkPasswordForSave(val, function (messageArr) {
                bj.showMessage(('passwordErr'), messageArr);
                if (messageArr.length > 0) bj.addErrorDecoration(elm);
            })
        }
    });

    $("#formProfile").on('blur', '[name="confirmPassword"]', function () {
        var val = $(this).val(),
            confirmVal = $('#formProfile [name="password"]').val(),
            elm = $(this).parent();

        bj.validations.checkConfirmPasswordForSave(val, confirmVal, function (messageArr) {
            bj.showMessage(('confirmPasswordErr'), messageArr);
            if (messageArr.length > 0) bj.addErrorDecoration(elm);
        })
    });

    $("#topUpBalance").on('click',function () {
        $.post(('/topUpBalance'), function (data) {
                $("#userBalance").html(data);
            }
        )
    })
});