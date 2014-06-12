var cookieParser = require('cookie-parser'),
    url = require('url'),
    
    // assign from function 'exports'
    session,
    sessionArgs,
    sessionFunc,
    SECRET;
    
    // create an session event handler
var events = require('events'),
    util = require('util'),
    SessionEvents = function(){};
    util.inherits(SessionEvents, events.EventEmitter);
    
    // socket.io middleware
var mw = function(socket, next) {
        var req = socket.handshake,
            res = socket.client.request.res;
        // parse cookie and add needed argument 'originalUrl'
        cookieParser(SECRET)(req, res, function(){});
        req.originalUrl = url.parse(req.headers.referer).path;
        
        req.sessionEvents = new SessionEvents();
        // excute express-session middlware function
        sessionFunc(req, res, function(){});
        
        // check req.session is created or not.
        if(!req.session) {
            req.sessionStore.get(req.sessionID, function(err, sess) {
                if(!sess) {
                    req.sessionEvents.emit('fail', 'Load session fail.');
                } else {
                    req.session = new session.Session(req, sess);
                    req.sessionEvents.emit('ok', sess);
                }
            });
        }
        // if session is created by auto-generate then will enter this scope
        // Notice: signedCookies['connect.sid] and session is different.
        else {
            req.sessionEvents.emit('ok', req.session);
        }
        
        // assign back to socket.
        socket.req = req;
        socket.res = res;
        
        next();
    },
    // init session object
    exports = function(opt) {
        session = opt.session;
        sessionArgs = opt.args;
        SECRET = sessionArgs.secret;
        sessionFunc = opt.func;
        
        return mw;
    };

module.exports = exports;
module.exports.SessionEvents = SessionEvents;
