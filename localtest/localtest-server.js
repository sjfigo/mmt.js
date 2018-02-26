let Http = require("http");
let Fs = require("fs");

let server = Http.createServer(function (req, res) {
    let path = "/Users/daehee/Git/MMT-WebPlayer/Client" + req.url;
    
    if(req.url === "/" || req.url ==="/favicon.ico") {
        path = "/Users/daehee/Git/MMT-WebPlayer/Client/index.html";
    }
    console.log("path: " + path);
    console.log("url: " + req.url);
    let stat = Fs.statSync(path);
    console.log("stat: " + stat);
    let total = stat.size;
    console.log("total: " + total);

    if (req.headers["range"]) {
        let range = req.headers.range;
        let parts = range.replace(/bytes=/, "").split("-");
        let partialstart = parts[0];
        let partialend = parts[1];

        let start = parseInt(partialstart, 10);
        let end = partialend ? parseInt(partialend, 10) : total-1;
        let chunksize = (end-start)+1;
        console.log("RANGE: " + start + " - " + end + " = " + chunksize);

        let file = Fs.createReadStream(path, {start: start, end: end});
        res.writeHead(206, { "Content-Range": "bytes " + start + "-" + end + "/" + total, "Accept-Ranges": "bytes", "Content-Length": chunksize, "Content-Type": "text/html" });
        file.pipe(res);
    } else {
        console.log("ALL: " + total);
        res.writeHead(200, { "Content-Length": total, "Content-Type": "text/html" });
        Fs.createReadStream(path).pipe(res);
    }
});
//server.listen(1337, "192.168.1.4");