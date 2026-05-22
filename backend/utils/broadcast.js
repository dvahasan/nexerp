/**
 * Socket.IO broadcast utility.
 *
 * In server.js:
 *   const { setBroadcastIO } = require("./utils/broadcast");
 *   setBroadcastIO(io);
 *
 * In any route file:
 *   const { broadcast } = require("../utils/broadcast");
 *   broadcast(req, "item_added", doc);
 */

let _io = null;

const setBroadcastIO = (io) => {
  _io = io;
};

const broadcast = (req, event, data) => {
  if (_io && req.user?.companyId) {
    _io.to(req.user.companyId.toString()).emit(event, data);
  }
};

module.exports = { setBroadcastIO, broadcast };
