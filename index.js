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
    sessionFunc = session({
        secret: SECRET,
        proxy: true,
        cookie: {
            maxAge: 1000 * 30
        }
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
            socket.req = {
                cookies: data.cookies,
                signedCookies: data.signedCookies,
                originalUrl: url.parse(data.headers.referer).path
            };
            // I'm not sure it's worked...
            socket.res = socket.client.request.res;
            socket.next = function(){};
            
            // excute session cookies function
            (function(req, res, next) {
                sessionFunc(req, res, next);
            })(socket.req, socket.res, socket.next);
            
            // add session object (socket.handshake, sessionID)
            socket.req.session = new session.Session(socket.req, socket.req.sessionID);
            
            // send sessionID to client
            socket.emit('session', socket.req.sessionID);
            
            //#debug
            console.log(socket.req);
            
        })(socket.handshake);
        
        socket.on('session', function(data) {
            socket.emit('session', socket.req.sessionID);
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
