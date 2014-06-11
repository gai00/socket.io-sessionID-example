var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    
    url = require('url'),
    compression = require('compression'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    SECRET = 'mastoneSecret',
    sessionArgs = {
        secret: SECRET,
        proxy: true,
        cookie: {
            maxAge: 1000 * 5
        }
    },
    sessionFunc = session(sessionArgs),
    PORT = 8000;

// setup middleware
app.use(compression());
app.use(cookieParser());
app.use(bodyParser());
app.use(sessionFunc);

// jade template
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// output html
app.get('/', 
    function(req, res) {
        res.render('index',
            {
                sessionID: req.sessionID
            }
        );
    }
);

io.on('connection',
    function(socket) {
        // parse sessionID by session
        // @param data = socket.handshake
        (function(data) {
            // parse cookies
            cookieParser(SECRET)(data, {}, function(){});
            
            // add needed arguments in express-session exports function
            socket.req = data;
            socket.req.originalUrl = url.parse(data.headers.referer).path;
            // I'm not sure it's worked...
            socket.res = socket.client.request.res;
            socket.next = function(){};
            
            // excute express-session middleware function
            (function(req, res, next) {
                sessionFunc(req, res, next);
            })(socket.req, socket.res, socket.next);
            
            // if session is not exists then get from sessionStore
            if(!socket.req.session) {
                // this function is asynchronous!!
                // get session data(pure data! no method!)
                socket.req.sessionStore.get(socket.req.sessionID, function(err, sess) {
                    if(!sess) {
                        // send error message to client and disconnect
                        socket.emit('session', 'no session');
                        socket.disconnect();
                    } else {
                        // create a sesion object with method
                        socket.req.session = new session.Session(socket.req, sess);
                        // send sessionID to client
                        socket.emit('session', socket.req.sessionID);
                        
                        //#debug
                        // console.log("#socket.io, on'connection', socket.req")
                        // console.log(socket.req);
                    }
                });
            } // end of if(!socket.req.session)
            
        })(socket.handshake); // end of socket connection init and emit 'session'
        
        socket.on('session', function(data) {
            socket.emit('session', socket.req.sessionID);
        });
        
        socket.on('count', function(data) {
            var sess = socket.req.session;
            sess.count = (!!sess.count)? sess.count: 0;
            sess.count += 1;
            // you must need to save the state after change session variable
            sess.save();
            socket.emit('count', sess.count);
            //#debug
            // console.log("#count");
            // console.log(sess);
            // console.log("#sessionStore");
            // console.log(socket.req.sessionStore);
        });
        
        socket.on('login', function(data) {
            // check user and pass
            switch(true)
            {
                case !data.user:
                case data.user != 'test':
                case !data.pass:
                case data.pass != 'pass':
                    socket.emit('login', 'user or pass is wrong.');
                    break;
                default:
                    socket.emit('login', 'login successful.');
            }
            
        });
    }
);

// listen
http.listen(PORT,
    function() {
        console.log('server sstarted @ port:' + PORT + ', secret:' + SECRET);
    }
);
