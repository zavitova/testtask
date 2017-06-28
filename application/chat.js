module.exports = function(io, Table) {
    // var nickArr = {};

    io.on('connection', function(socket){

        // Обрабатываем события "userIsWrite" и отсылаем остальным id на "userIsWrite" того кто печатает
        socket.on("userIsWrite", function () {
            if (socket.request.session.user) {
                var userId = socket.request.session.user._id,
                    table = socket.request.session.table,
                    room = 'table-' + table._id;
                Table.findById(table._id, function (req, table) {
                    if (table) {
                        io.sockets.in(room).emit("userIsWrite", { fullName: table.getPlayerFullName(userId), socketId: socket.id});
                    }
                })
            }
        });

        //Обрабатываем события "sendToChat" и отсылаем всем принятое сообщение с ником в "showToChat"
        socket.on("sendToChat", function (data) {
            if (socket.request.session.user) {
                var userId = socket.request.session.user._id,
                    table = socket.request.session.table,
                    room = 'table-' + table._id;
                Table.findById(table._id, function (req, table) {
                    if (table) {
                        data.nick = table.getPlayerFullName(userId);
                        io.sockets.in(room).emit("showToChat", data);
                    }
                });
            }
        });

        //Обрабатываем события 'sendToPersonal' и отсылаем отправителю и получателю на "showToPersonal"
        socket.on('sendToPersonal', function (data) {
            if (socket.request.session.user) {
                var userId = socket.request.session.user._id,
                    table = socket.request.session.table;
                Table.findById(table._id, function (req, table) {
                    if (table) {
                        data.nick = table.getPlayerFullName(userId);
                        data.socketId = data.toId;
                        socket.emit("showToPersonal", data);
                        data.socketId = socket.id;
                        io.to(data.toId).emit("showToPersonal", data)
                    }
                });
            }
        });

        //при выходе отсылаем обновленный список пользователе, и сообщение о выходе пользователя
        socket.on("quitGame", function() {
            if (socket.request.session.user) {
                var userId = socket.request.session.user._id,
                    table = socket.request.session.table,
                    room = 'table-' + table._id;
                Table.findById(table._id, function (req, table) {
                    if (table) {
                        io.sockets.in(room).emit('exitUser', table.getPlayerFullName(userId));
                        io.sockets.in(room).emit("showNick", table.players); // получаю не сохраненные данные????
                    }
                });
            }
         });

        //При обрыве соединения:
        socket.on('disconnect', function () {
            if (socket.request.session.user) {
                var userId = socket.request.session.user._id,
                    table = socket.request.session.table,
                    room = 'table-' + table._id;
                Table.findById(table._id, function (req, table) {
                    if (table) {
                        io.sockets.in(room).emit('exitUser', table.getPlayerFullName(userId));
                        io.sockets.in(room).emit("showNick", table.players);
                    }
                });
            }
        });
    });
};