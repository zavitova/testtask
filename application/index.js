module.exports = function (io, userModel) {
    var Table = require("../models/tables.js");
    require("./lobby.js")(io, Table, userModel);
    require("./table.js")(io, Table, userModel);
    require("./chat.js")(io, Table);
};