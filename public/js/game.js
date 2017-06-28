var socket = io();

//для контроля за очищением интервалов заводим переменные (пока не придумала без переменных)
var timerForBit,
    timerForMove,
    timer;

//переделать. пока скрываем и показываем lobby/table
$('.game').hide();
//

// сообщения от сервера для страницы game
socket.on("showMessageForGame", function (msg) {
    $("#messageBoxForGame").html(msg).attr("class", "alert alert-info").show();
});

// lobby ================================================
//клик "Новый стол" запускает на сервере событие "newTable"
$("#createNewTable").on("click", createNewTable);

function createNewTable() {
    $("#messageBoxForGame").html('').hide();
    socket.emit("newTable");
}

//обрабатываем событие "showTables". Отображаем список активных столов
socket.on("showTables", function (data) {
    var tables = '',
        str;
    $.each(data, function (id, val) {
        str = (val.players.length == 1) ? ' игрок' : ' игрока';
        tables += '<li title="Кликните для присоединения к столу" data-id="' + val._id + '"> Стол : ' + val.players.length + str + '</li>';
    });
    $("#tablesContainer").html(tables);
});

$("#tablesContainer").on('click', 'li', joinThisTable);

//Передаем на серверный обработчик событий 'joinThisTable' id игрока, присоединяющегося к столу
function joinThisTable() {
    $("#messageBoxForGame").html('').hide();
    var wantJoin = confirm("Вы хотите присоедениться к " + $(this).html());
    if (wantJoin) socket.emit('joinThisTable', { tableId: $(this).attr('data-id')});
}

// table ==================================================
//отображаем кнопку "Начать игру" (только для пользователя создавшего стол)
socket.on("showStartGame", function () {
    $('#startGame').show();
});

//очищаем информацию по пользователям
function clearPlayersOnTable() {
    var elm;
    for (var ind = 0; ind < 5; ind++) {
        elm = $('#player-' + (ind + 1));
        elm.children('.bet').children('span').html('');
        elm.children('.points').children('span').html('');
        elm.children('.playerInfo').children('.avatar').children('img').attr('src', '');
        elm.children('.playerInfo').children('.name').html('');
        elm.children('.hand').html('');
        elm.removeClass('activePlayer');
    }
}

//очищаем стол. информацию об игроках, о крупье и очищаем таймеры
function clearTable() {
    var elm;
    clearPlayersOnTable();
    elm = $("#croupier");
    elm.children('.points').children('span').html('');
    elm.children('.hand').html('');
    if (timerForBit) {
        clearInterval(timerForBit);
        timerForBit = null;
    }
    if (timerForMove) {
        clearInterval(timerForMove);
        timerForMove = null;
    }
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    $('#messageBox').html('').hide();
}

//очищаем, скрываем и отображаем нужные компоненты игрового стола
socket.on("goToTable", function () {
    //переделать. пока скрываем и показываем lobby/table
    $('.lobby').hide();
    clearTable();
    $('.game').show();
    $('#chip-container').hide();
    $('#dialog').hide();
});

//отображаем баланс текущего игрока
socket.on("showBalance", function (data) {
    $('#playerBalance').html(data.playerBalance);
});

//отображаем карты со сдвигом
function showCard(ind, card, elm) {
    elm.append('<div class="card ' + card.class + '"></div>');
    var shiftCard = ind * 15;
    elm.children().last().css("left", ""+shiftCard+"px");
}

//отображаем информацию по игрокам стола (аватар, имя, карты, ставка, очки)
socket.on("showPlayers", function (data) {
    clearPlayersOnTable();
    var players = '';
    $.each(data, function (ind, val) {
        var elm = $('#player-' + (ind + 1));
        if (val.isPlaying) {
            players += '<li>' + val.player + '</li>';
            elm.children('.bet').children('span').html(val.bet);
            elm.children('.points').children('span').html(val.points);
            elm.children('.playerInfo').children('.avatar').children('img').attr('src', val.avatarFile);
            elm.children('.playerInfo').children('.name').html(val.fullName);
            var elmCards = elm.children('.hand');
            elmCards.html('');
            $.each(val.hand, function (ind, card) {
                showCard(ind, card, elmCards)
            })
        } else {
            elm.children('.playerInfo').children('.name').html("Не играет");
            elm.children('.hand').html('');
        }
    });
    $('#playersContainer').html(players);
});

//отображаем информацию по крупье(карты, очки)
socket.on("showCroupier", function (croupier) {
    var elm = $("#croupier");
    elm.children('.points').children('span').html(croupier.points);
    var elmCards =elm.children('.hand');
    elmCards.html('');
    $.each(croupier.hand, function (ind, card) {
        showCard(ind, card, elmCards)
    })
});

//отображаем сообщения от сервера
socket.on("showMessage", function (msg) {
    $("#messageBox").html(msg).attr("class", "alert alert-danger").show();
    clearInterval(timer);
    timer = setTimeout(function () {
        $("#messageBox").hide();
    }, 2000)
});

//при старте игры скрываем кнопку "начать игру"
$("#startGame").on('click', function () {
    socket.emit("startGame");
    $('#startGame').hide();
});

//при выходе из игры очищаются запущенные интервалы сообщений, скрываются сообщения
$("#quitGame").on('click', function () {
    if (timerForBit) {
        clearInterval(timerForBit);
        socket.emit("acceptBets");
        timerForBit = null;
    }
    if (timerForMove) {
        clearInterval(timerForMove);
        socket.emit('continueGame');
        timerForMove = null;
    }
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    $("#messageBox").hide();
    socket.emit("quitGame");
});

//после выполнения выхода на сервере переходим в lobby
socket.on("quitGame", function () {
    //переделать. пока скрываем и показываем lobby/table
    $('.lobby').show();
    $('.game').hide();
    //
});

//для ставок отображаем фишки, высвечиваем сообщение с таймером. Если таймер вышел
//очищаем таймер, выходим из игры, переход хода, скрываем сообщение.
socket.on('yourBet', function () {
    $('#chip-container').show();
    $("#messageBox").html('Ваша ставка.').attr("class", "alert alert-info").show();
    var countDownBit = сountDown();
    timerForBit = setInterval(function () {
        var seconds = countDownBit();
        var msg = "Ваша ставка. При отсутствии ставки выход через " + seconds + " сек.";
        $("#messageBox").html(msg);
        if (seconds == 0) {
            clearInterval(timerForBit);
            $("#messageBox").hide();
            socket.emit("quitGame");
            socket.emit("acceptBets");
            timerForBit = '';
        }
    }, 1000);
});

//замыкание со счетчиком
function сountDown() {
    var i = 30;
    return function () {
        return i--;
    }
}

//фиксируем ставку, очищаем таймер, скрываем сообщения
$('#chip-5').on('click', function () {
    bet(5)
});

$('#chip-25').on('click', function () {
    bet(25)
});

$('#chip-100').on('click', function () {
    bet(100)
});

$('#chip-500').on('click', function () {
    bet(500)
});

function bet(bet) {
    socket.emit("setBet", {bet: bet});
    $('#chip-container').hide();
    clearInterval(timerForBit);
    $("#messageBox").hide();
    timerForBit = '';
}

//Для хода отображаем "Взять карту" и "Пасс", высвечиваем сообщение с таймером.
//если таймер вышел, то авто пасс, скрываем кнопки и сообщения
socket.on("yourMove", function () {
    $('#dialog').show();
    $("#messageBox").html('Ваш ход.').attr("class", "alert alert-info").show();
    var countDownMove = сountDown();
    timerForMove = setInterval(function () {
        var seconds = countDownMove();
        var msg = "Ваш ход. При отсутствии хода автоматический 'пасс' через " + seconds + " сек.";
        $("#messageBox").html(msg);
        if (seconds == 0) {
            clearInterval(timerForMove);
            $("#messageBox").hide();
            $('#dialog').hide();
            socket.emit('continueGame');
            timerForMove = '';
        }
    }, 1000);
});

//если переход хода по инициативе сервера скрываем  "Взять карту" и "Пасс"
socket.on("hideDialog", function () {
    $('#dialog').hide();
});

//берем карты, очищаем таймер, скрываем сообщения
$("#getCard").on('click', function () {
    socket.emit("getCard");
    clearInterval(timerForMove);
    $("#messageBox").hide();
    timerForMove = '';

});

//пасс, очищаем таймер, скрываем сообщения
$('#stand').on('click', function () {
    socket.emit('continueGame');
    $('#dialog').hide();
    clearInterval(timerForMove);
    $("#messageBox").hide();
    timerForMove = '';
});

//декорируем игрока, который сейчас ходит
socket.on("showActivePlayer", function (data) {
    var elm;
    for (var ind = 0; ind < 5; ind++) {
        elm = $('#player-' + (ind + 1));
        elm.removeClass('activePlayer');
    }
    elm = $('#player-' + (data.activePlayer + 1));
    elm.addClass('activePlayer');
});

//убираем декор с игрока, который сейчас не ходит
socket.on("hideActivePlayer", function (data) {
    var elm;
    for (var ind = 0; ind < 5; ind++) {
        elm = $('#player-' + (ind + 1));
        elm.removeClass('activePlayer');
    }
});
