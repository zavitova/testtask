var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
    res.sendfile('index.html');
});

var nickArr = {};

io.on('connection', function(socket){
    console.log('A user connected with socket.id = ' + socket.id);

    //Обрабатываем события "saveNick":
    socket.on("saveNick", function (data) {
        socket.emit('sayHello', (data.nick + ', Добро пожаловать в наш чат!')); //отсылаем приветствие пользователю от которого поступило событие  на обработчик 'sayHello'
        socket.broadcast.emit('newUser', data.nick);                            //всем остальным сообщаем о присоединившимся пользователе на обработчик 'newUser'
        nickArr[data.id] = data.nick ;                                          //запоминаем соответствие ника и id
        io.emit("showNick", nickArr);                                           //Отсылаем всем актуальный список участников на обработчик "showNick"
    });

    //Обрабатываем события "userIsWrite" и отсылаем остальным id на "userIsWrite" того кто печатает
    socket.on("userIsWrite", function (data) {
        socket.broadcast.emit("userIsWrite", nickArr[data.id]);
    });

    //Обрабатываем события "sendToChat" и отсылаем всем принятое сообщение с ником в "showToChat"
    socket.on("sendToChat", function (data) {
        data.nick = nickArr[data.id];
        io.emit("showToChat", data)
    });

    //Обрабатываем события 'sendToPersonal' и отсылаем отправителю и получателю на "showToPersonal"
    socket.on('sendToPersonal', function (data) {
        data.nick = nickArr[data.id];
        socket.emit("showToPersonal", data);
        io.to(data.toId).emit("showToPersonal", data)
    });

    //При обрыве соединения:
    socket.on('disconnect', function () {
        console.log('A user with socket.id = ' + socket.id + ' disconnected');
        if (nickArr[socket.id]) socket.broadcast.emit('exitUser', nickArr[socket.id]);  //отсылаем остальным на 'exitUser' кто вышел
        delete nickArr[socket.id];                                                      //удаляем из массива
        io.emit("showNick", nickArr);                                                   //всем отсылаем на "showNick" обновленный список активных ников
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});