module.exports = function(io, Table, userModel) {

    io.on('connection', function (socket) {

        //при старте игры меняем статус стола, рассылаем измененный список столов, начинаем принимать ставки
        socket.on("startGame", function () {
            if (socket.request.session.table) {
                Table.findById(socket.request.session.table._id, function (req, table) {
                    table.startGame();
                    table.save(function () {
                        Table.findActiveTables(function (req, tables) {
                            io.sockets.in('lobby').emit("showTables", tables);
                        });
                        acceptBets(socket);
                    });
                });
            }
        });

        //устанавливаем ставку в базу, отсылаем свой баланс и всем участникам стола информацию об игроках, дальше принимаем ставки
        socket.on("setBet", function (data) {
            if (socket.request.session.table) {
                var userId = socket.request.session.user._id,
                    table = socket.request.session.table,
                    room = 'table-' + table._id;
                Table.findById(table._id, function (req, table) {
                    table.setBet(data.bet, userId);
                    table.save(function () {
                        socket.emit("showBalance", {playerBalance: table.getPlayerBalance(userId)});
                        io.sockets.in(room).emit("showPlayers", table.players);
                        acceptBets(socket);
                    });
                });
            }
        });

        //дальше принимаем ставки, если нет ставки у игрока (вышел игрок или таймер закончился)
        socket.on('acceptBets', function () {
            acceptBets(socket);
        });

        // socket.on('getCardsToEach', function () {
        //     getCardsToEach(socket);
        // });

        //берем дополнительную карту, если есть карты в колоде, если перебор или блекджек сразу переход хода,
        // иначе запрашиваем следующий ход
        //если в колоде нет карт отсылаем сообщение
        socket.on("getCard", function () {
            if (socket.request.session.table) {
                var user = socket.request.session.user,
                    table = socket.request.session.table,
                    room = 'table-' + table._id,
                    msg = "Колода пуста! Перейдите к другому столу.";
                Table.findById(table._id, function (req, table) {
                    if (table.cardsIsPresent()) {
                        table.getCardForPlayer(user._id);
                        table.save(function () {
                            io.sockets.in(room).emit("showPlayers", table.players);
                            if (table.isBusted(user._id)) {
                                socket.emit("showMessage", "Перебор");// нужны таймеры, не всегда успевает отобразиться
                                socket.emit("hideDialog");
                            }
                            if (table.isBlackjack(user._id)) {
                                socket.emit("showMessage", "БлекДжек");
                                socket.emit("hideDialog");
                            }
                            if (table.isBusted(user._id) || table.isBlackjack(user._id)) {
                                setTimeout(function () {
                                    continueGame(socket);
                                }, 2000);
                            } else {
                                socket.emit("yourMove");
                            }
                        });
                    } else {
                        io.sockets.in(room).emit("showMessage", msg);
                    }
                });
            }
        });

        //переход хода, если игрок пасует, вышел или таймер закончился
        socket.on("continueGame", function () {
            continueGame(socket);
        });

        //выход из игры
        socket.on("quitGame", function() {
            doQuitGame(socket);
        });

        //при обрыве соединения
        socket.on("disconnect", function () {
            console.log("socket " + socket.id + " disconnected");
            if (socket.request.session.user && socket.request.session.table) doQuitGame(socket);
        });
    });

    //принимаем ставки у игроков по очереди при условии что есть играки если дошли до крупье, убираем подсветку игроков
    //и переходим к раздаче карт. Если ход следующего игрока, то подсвечиваем его и сообщаем о его ходе
    function acceptBets(socket) {
        if (socket.request.session.table) {
            var table = socket.request.session.table,
                room = 'table-' + table._id;
            Table.findById(table._id, function (req, table) {
                if (table && table.playersIsPresent()) {
                    var nowPlaying = table.whoseTurn();
                    table.save(function () {
                        if (nowPlaying == -1) {
                            io.sockets.in(room).emit("hideActivePlayer", {activePlayer: nowPlaying});
                            getCardsToEach(socket);
                        } else {
                            io.to(table.players[nowPlaying].socketId).emit("yourBet");
                            io.sockets.in(room).emit("showActivePlayer", {activePlayer: nowPlaying});
                        }
                    });
                }
            });
        }
    }

    //Если есть игроки на столе смотрим чей ход. Если ход крупье, то убираем подсветку для игроков, сообщаем что ход крупье
    //переходим на игру крупье и потом подсчет результатов. Если ход игрока, то проверяем на БлекДжек
    //и переход хода. Иначе ждем хода игрока.
    function continueGame(socket) {
        if (socket.request.session.table) {
            var table = socket.request.session.table,
                room = 'table-' + table._id;
            Table.findById(table._id, function (req, table) {
                if (table && table.playersIsPresent()) {
                    var nowPlaying = table.whoseTurn();
                    table.save(function () {
                        if (nowPlaying == -1) {
                            io.sockets.in(room).emit("hideActivePlayer", {activePlayer: nowPlaying});
                            io.sockets.in(room).emit("showMessage", "Ход Крупье");
                            croupierIsPlaying(socket, function () {
                                getResult(socket);
                            });
                        } else {
                            if (table.isBlackjack(table.players[nowPlaying].player)) {
                                io.to(table.players[nowPlaying].socketId).emit("showMessage", "БлекДжек");
                                setTimeout(function () {
                                    continueGame(socket);
                                }, 2000);
                            } else {
                                io.to(table.players[nowPlaying].socketId).emit("yourMove");
                                io.sockets.in(room).emit("showActivePlayer", {activePlayer: nowPlaying});
                            }
                        }
                    });
                }
            });
        }
    }

    //выход из стола. Удаляется (до начала игры) или меняется статус (после начала игры) игрока в Table
    //убирается отметка об игре за столом у пользователя в User и возвращается его баланс и Table в User
    //рассылается обновленный перечень столов в lobby, пользователь переходи из table в lobby,
    //отсылается обновленный список игроков для покинутого стола.
    function doQuitGame(socket) {
        if (socket.request.session.table) {
            var user = socket.request.session.user,
                table = socket.request.session.table,
                room = 'table-' + table._id;
            Table.findById(table._id, function (req, table) {
                if (table) {
                    table.quitPlayer(user._id, function (balance) {
                        userModel.findById(user._id, function (req, user) {
                            user.resetGameTableId(table._id);
                            // user.save();
                            user.updateBalance(balance);
                            user.save();
                        });
                        Table.findActiveTables(function (req, tables) { //тут стол не обновляеться при выходе не последнего
                            // пользователя, а в базе данные обновляються.
                            io.sockets.in('lobby').emit("showTables", tables);
                        });
                        socket.emit("quitGame");
                        socket.leave(room);
                        socket.join('lobby');
                        io.sockets.in(room).emit("showPlayers", table.players);
                        socket.request.session.table = '';
                    });
                }
            });
        }
    }

    //раздаем всем играющим игрокам по 2 карты при условии, что в колоде есть карты, отсылается для стола
    //обновленный перечень данных об игроках для стола. Потом выдаем одну карту крупье и переходим к ходам игроков
    //если в колоде нет карт отсылаем сообщение
    function getCardsToEach(socket) {
        if (socket.request.session.table) {
            var table = socket.request.session.table,
                room = 'table-' + table._id,
                msg = "Колода пуста! Перейдите к другому столу.";
            Table.findById(table._id, function (req, table) {
                table.players.forEach(function (playerData) {
                    if (playerData.isPlaying) {
                        for (var i = 0; i < 2; i++) {
                            if (table.cardsIsPresent()) {
                                table.getCardForPlayer(playerData.player);
                                table.save(function () {
                                    io.sockets.in(room).emit("showPlayers", table.players);
                                });
                            } else {
                                io.sockets.in(room).emit("showMessage", msg);
                            }
                        }
                    }
                });
                if (table.cardsIsPresent()) {
                    table.getCardForCroupier();
                    table.save(function () {
                        io.sockets.in(room).emit("showCroupier", table.croupier);
                        continueGame(socket);
                    });
                } else {
                    io.sockets.in(room).emit("showMessage", msg);
                }
            });
        }
    }

    //крупье берет карты
    function croupierIsPlaying(socket, callback) {
        if (socket.request.session.table) {
            var table = socket.request.session.table;
            Table.findById(table._id, function (req, table) {
                var timer = setInterval( function () {
                    getCardForCroupier(table, callback);
                    if (!(table.isMustDrawCroupier() && table.cardsIsPresent())) {
                        clearInterval(timer);
                        setTimeout(callback, 2000); //Это не всегда отрабатывает/ Нужно переделать
                    }
                }, 1500);
            });
        }
    }
    
    function getCardForCroupier(table) {
        var room = 'table-' + table._id,
            msg = "Колода пуста! Перейдите к другому столу.";
        if (table.cardsIsPresent()) {
            table.getCardForCroupier();
            table.save(function () {
                io.sockets.in(room).emit("showCroupier", table.croupier);
            });
        } else {
            io.sockets.in(room).emit("showMessage", msg);
        }
     }

    //оцениваем результаты для каждого игрока, пересчитываем ставки и потом балансы, рассылаем обновленные балы
    //сообщение о результате игры, переносим карты в архив, сбрасываем очки, отсылаем данные о пользователях и крупье
    //переходим к новым ставкам
    function getResult(socket) {
        if (socket.request.session.table) {
            var table = socket.request.session.table,
                room = 'table-' + table._id;
            Table.findById(table._id, function (req, table) {
                if (table) {
                    table.players.forEach(function (playerData, ind) {
                        if (playerData.isPlaying && table.isLost(playerData.player)) {
                            table.setToZeroBet(playerData.player);
                            io.to(playerData.socketId).emit("showMessage", "Вы проиграли!");
                        }
                        if (playerData.isPlaying && table.isDraw(playerData.player)) {
                            table.returnBet(playerData.player);
                            io.to(playerData.socketId).emit("showMessage", "Ничья!");
                        }
                        if (playerData.isPlaying && table.isWorn(playerData.player)) {
                            table.uppedBet(playerData.player);
                            table.returnBet(playerData.player);
                            io.to(playerData.socketId).emit("showMessage", "Вы выиграли!");
                        }
                        table.movePlayerCardsToArh(playerData.player);
                        table.setPlayerPoints(ind);
                        io.to(playerData.socketId).emit("showBalance", {playerBalance: playerData.balance})
                    });
                    table.moveCroupierCardsToArh();
                    table.setCroupierPoints();
                    table.save(function () {
                        io.sockets.in(room).emit("showPlayers", table.players);
                        io.sockets.in(room).emit("showCroupier", table.croupier);
                        setTimeout(function () {
                            acceptBets(socket);
                        }, 3000);
                    });
                }
            });
        }
    }
};