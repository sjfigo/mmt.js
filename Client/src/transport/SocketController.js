var SocektController = function () {
    var socekt = io('http://localhost');
    socket.on('news', function (data) {
        console.log(data);
        socket.emit('my other event.', {my: 'data'});
    });
};