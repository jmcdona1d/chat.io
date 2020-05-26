var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    io.emit("user joined", socket.id)
    
    socket.on('chat message', (msg) => {

        const messageReturn = {
          'message':msg,
          'sender' :socket.id
        }
        io.emit('chat message', messageReturn);
    });
    
    socket.on('disconnect', ()=> {
        io.emit("user left", socket.id);
    });
});

http.listen(3000, () => {
  console.log('listening on port 3000');
});