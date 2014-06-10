var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    
    compression = require('compression'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    SECRET = 'mySecret',
    PORT = 8000;

// setup middleware
app.use(compression());
app.use(cookieParser());
app.use(bodyParser());
app.use(session({
    secret: SECRET,
    proxy: true
}));

// jade template
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// public static
// app.use('/static', express.static(__dirname + '/public'));

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
        // parse sessionID
        (function(data) {
            cookieParser(SECRET)(data, {}, function(){});
        })(socket.handshake);
        
        // send session to socket.io client
        socket.emit('session', socket.handshake.signedCookies['connect.sid']);
        
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
