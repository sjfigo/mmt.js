var SocektController = function () {
    var socekt = io('172.16.39.128:10000');
    socket.on('news', function (data) {
        console.log(data);
        socket.emit('my other event.', {my: 'data'});
    });
};