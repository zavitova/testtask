;(function() {

    function goToMenu(menu, event, link) {
        event.preventDefault();
        event.stopPropagation();
        $(menu).click();
        $(link).parent().parent().parent().hide();
        $(menu).parent().show();
    }

    function showMessage(className, messageArr) {
        var elm = $('#templateMessage');
        elm.children().children().children('li.' + className).remove();
        if (messageArr.length > 0) {
            if (elm.children().length == 0) elm.append('<div class="alert alert-danger"><ul></ul></div>');
            messageArr.forEach(function (message) {
                elm.children().children().append('<li class="' + className +'">' + message + '</li>')
            })
        }
        if (elm.children().children().children('li').length == 0) elm.children().remove();
    }

    function removeErrorDecoration(elm) {
        elm.removeClass("has-feedback has-error");
        elm.children('span').remove();
    }

    function addErrorDecoration(elm) {
        elm.addClass("has-feedback has-error");
        elm.append('<span>');
        elm.children('span').addClass("glyphicon glyphicon-warning-sign form-control-feedback");
    }
    var export_my = {
        "goToMenu" : goToMenu,
        "showMessage" : showMessage,
        "removeErrorDecoration" : removeErrorDecoration,
        "addErrorDecoration" : addErrorDecoration
    };

    window.bj = export_my;
})();