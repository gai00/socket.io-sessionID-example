var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    
    compression = require('compression'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    SECRET = 'mastoneSecret',
    sessionArgs = {
        secret: SECRET,
        proxy: true,
        cookie: {
            maxAge: 1000 * 60
        }
    },
    sessionFunc = session(sessionArgs),
    mwSession = require('./lib/session.js')({
        session: session,
        args: sessionArgs,
        func: sessionFunc
    }),
    
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

// require './lib/session.js'
io.use(mwSession);

io.on('connection',
    function(socket) {
        // when your session is worked will invoke 'ok' event.
        socket.req.sessionEvents.on('ok', function(sess) {
            socket.emit('session', socket.req.sessionID);
            // console.log(socket.req);
        });
        // if cannot get session from sessionStore then invoke 'fail' event.
        socket.req.sessionEvents.on('fail', function(err) {
            console.log("fail");
            console.log(err);
            socket.disconnect();
        });
        
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
