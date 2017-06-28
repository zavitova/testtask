
//Создаем элементы страницы-----------------------------------------------------------------------------------------
function prepareChatBox() {

    if ($('#chatBox').length == 0) {
        $('<div>', {
            id: 'chatBox',
            class: 'chatBox'
        }).appendTo('#chat')
    } else {
        $('#chatBox').children().remove()
    }
}

function prepareChatElements(elmId, caption) {

    $('<div>', {
        id: elmId
    }).appendTo('#chatBox');

    $('<h5>', {
        text: caption
    }).appendTo('#' + elmId);

    $('<div>', {
        class: 'chatContainer'
    }).appendTo('#' + elmId);

    $('<div>', {
        class: 'input-group'
    }).appendTo('#' + elmId);

    $('<textarea>', {
        class: 'message form-control',
        type: 'text',
        placeholder: 'Наберите сообщение тут...'
    }).appendTo('#' + elmId  + ' .input-group');

    $('<div>', {
        class: 'input-group-btn'
    }).appendTo('#' + elmId +' .input-group');

    $('<button>', {
        class: 'sendMessageToServer btn btn-default',
        title: 'Отправить сообщение'
    }).appendTo('#' + elmId + ' .input-group .input-group-btn');

    $('<i>', {
        class: 'glyphicon glyphicon-send'
    }).appendTo('#' + elmId + ' .input-group .input-group-btn button')
}

//Подготовим страницу с чатом
function showChatPage() {

    prepareChatBox();

    $('<div>', {
        class: 'nicksContainer',
        append: $('<h5>', {
            text: 'Для приватной беседы кликните по нику:'
        })
            .add($('<div>', {
                id: 'nicksContainer'
            }))
    }).appendTo('#chatBox');

    prepareChatElements('tableChat', '');
}

//Привяжим события к созданым элементам DOMа------------------------------------------------------------------------
//Привяжем события к элементам страницы чата
function bindEventsForChatPage() {
    $("#tableChat .message").keypress(function (event) {
        trackToWriting(event)
    });
    $("#tableChat .sendMessageToServer").on("click", sendMessageToServer);
    $("#nicksContainer").on('click', 'span', function () {
        showPersonalChat($(this).attr('id'), $(this).html());
    })

}

//Обработчики событий на странице пользователя----------------------------------------------------------------------
//Передаем на серверный обработчик событий "userIsWrite" id если пользователь печатает
var isWrite = false;
function trackToWriting(event) {
    if (!isWrite) {
        isWrite = true;
        socket.emit("userIsWrite", { id : socket.id });
        setTimeout(function () { isWrite = false }, 2400)
    }
    if (event.keyCode == 13) {
        event.preventDefault();
        $("#tableChat .sendMessageToServer").click();
    }
}

//Передаем на серверный обработчик событий "sendToChat" набранное сообщение
function sendMessageToServer() {
    socket.emit("sendToChat", { message: $("#tableChat .message").val()});
    $("#tableChat .message").val('');
}

//Формируем область для персональных сообщений
function showPersonalChat(id, nick) {
    var elmId = 'ChatWith-' + id;
    if ($('#' + elmId).length == 0) {
        prepareChatElements(elmId, 'Чат с ' + nick);
        $('#' + elmId).attr('data-id', id);
        $('#' + elmId + ' .sendMessageToServer').on('click', sendPersonalMessage);
        $('#' + elmId + ' .message').keypress(function (event) {
            if (event.keyCode == 13) {
                event.preventDefault();
                $('#' + elmId + ' .sendMessageToServer').click();
            }
        });
    }
}
//Передаем на серверный обработчик событий 'sendToPersonal' тело сообщения, id отправителя и получателя
function sendPersonalMessage() {
    var elmMsg = $(this).parent().parent().children('.message'),
        elmBox = $(this).parent().parent().parent();
    socket.emit('sendToPersonal', { message: elmMsg.val(), toId: elmBox.attr('data-id')});
    elmMsg.val('');
}

//Привяжим события к запросам от сервера----------------------------------------------------------------------------
//Подготовим элементы чата
socket.on('prepareChatElements', function () {
    showChatPage();             //отобразим страницу чата
    bindEventsForChatPage();    //привяжем события к элементам
});

//обрабатываем событие 'newUser'. Отображаем в чате ник нового участника
socket.on('newUser', function (data) {
    var msg = '<li> Присоединился <b>' + data + '</b></li>';
    $("#tableChat .chatContainer").append(msg);
});

//обрабатываем событие "showNick". Отображаем список активных ников
socket.on("showNick", function (data) {
    var nicks = '';

    $.each(data, function (id, playerData) {
        if (playerData.isPlaying) {
            nicks += '<span title="Кликните для отправки сообщения персонально" id="' + playerData.socketId + '">' + playerData.fullName + ', </span>';
        }
    });

    $("#nicksContainer").html(nicks);
});

//обрабатываем событие "userIsWrite". Сообщаем, когда пользователь печатает
var theyWrite = [];
socket.on("userIsWrite", function (data) {
    if (!theyWrite.includes(data.socketId)) theyWrite.push(data.socketId);
    if ($("#tableChat .chatContainer").children('#' + data.socketId).length == 0) {
        $("#tableChat .chatContainer").append("<p id='" + data.socketId + "'>... " + data.fullName + " печатает</p>");
        $("#tableChat .chatContainer").scrollTop(9999);
        checkIsWrite(data.socketId);
    }
});

function checkIsWrite(data) {
    if (theyWrite.includes(data)) theyWrite.splice(theyWrite.indexOf(data),1);
    setTimeout(function () {
        if (!theyWrite.includes(data)) {
            $("#tableChat .chatContainer").children('#' + data).remove();
        } else {
            checkIsWrite(data)
        }
    }, 3000)
}

//обрабатываем событие "showToChat" и добавляем в ленту сообщений новое сообщение с ником отправителя
socket.on("showToChat", function (data) {
    var msg = '<li><b>' + data.nick + '</b> : ' + data.message + '</li>';
    $("#tableChat .chatContainer").append(msg);
    $("#tableChat .chatContainer").scrollTop(9999);
});

//обрабатываем событие 'showToPersonal' и добавляем в ленту сообщений новое персональное сообщение
socket.on('showToPersonal', function (data) {
    showPersonalChat(data.socketId, data.nick);
    var elmId = 'ChatWith-' + data.socketId,
        msg = '<li><b>' + data.nick + '</b> : ' + data.message + '</li>';
    $("#" + elmId).children('.chatContainer').append(msg);
    $("#" + elmId).children('.chatContainer').scrollTop(9999);
});

socket.on('exitUser', function (data) {
    var msg = '<li>Из чата вышел <b>' + data + '</b></li>';
    $("#tableChat .chatContainer").append(msg);
});
