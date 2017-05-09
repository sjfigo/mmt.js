class MMTPlayer {
    constructor(video, controller) {
        //var SocketController = require("./transport/SocketController.js").SocketController;
        this.callSetup("172.16.39.165", 10000);
    }

    callSetup(host, port) {
        //var sockController = new SocketController();
        //var tcpSock = sockController.createTCPSock(host, port);
    }

    onPlay() {}
}

exports.MMTPlayer = MMTPlayer;

export const ERROR = {
    // Unknown error
    UNKNOWN_ERROR: 0x01,
    // Call function with invalid parameter 
    INVALID_PARAM: 0x02
};
var Error = require("../errors.js").Error;

class MMTPPacketParser {
    constructor(packet, size) {
        this._MTU = 1500;
        this._packet = packet;
        this._packetSize = size;

        // Version
        this._V_pos = 0;
        this._V_size = 2;

        this._V0 = {
            // C
            C_pos: 2,
            C_size: 1,

            // RES
            FEC_pos: 3,
            FEC_size: 2,

            P_pos: 5,
            P_size: 1,

            E_pos: 6,
            E_size: 1,

            RES_pos: 7,
            RES_size: 9,

            packet_id_pos: 16,
            packet_id_size: 16,

            packet_sequence_number_pos: 32,
            packet_sequence_number_size: 32,

            timestamp_pos: 64,
            timestamp_size: 32,

            packet_counter_pos: 96,
            packet_counter_size: 32,

            private_user_data_pos: 128,
            private_user_data_size: 16,

            payload_pos: 144,
            payload_size: this._packetSize - this._V0.source_FEC_payload_ID_size - this._V0.payload_pos,

            source_FEC_payload_ID_pos: this._packetSize - this._V0.source_FEC_payload_ID_size,
            source_FEC_payload_ID_size: 32
        };

        try {
            if (packet === null || packet === undefined || size <= 0 || size >= this._MTU) {
                throw Error.INVALID_PARAM;
            }
            this._packet = packet;
            this._packetSize = size;
        } catch (exeption) {
            return exeption;
        }
    }

    static getBits(data, dataSize, pos, size) {
        return data << pos >>> dataSize - pos - size;
    }

    set packet(packet) {
        this._packet = packet;
    }

    set packetSize(size) {
        this._packetSize = size;
    }

    get parseV() {
        return this.getBits(this._packet, this._size, this._V_pos, this._V_size);
    }

    get parseV0_C() {
        return this.getBits(this._packet, this._size, this._V0.C_pos, this._V0.C_size);
    }

    get parseV0_FEC() {
        return this.getBits(this._packet, this._size, this._V0.FEC_pos, this._V0.FEC_size);
    }

    get parseV0_P() {
        return this.getBits(this._packet, this._size, this._V0.P_pos, this._V0.P_size);
    }

    get parseV0_E() {
        return this.getBits(this._packet, this._size, this._V0.E_pos, this._V0.E_size);
    }

    get parseV0_RES() {
        return this.getBits(this._packet, this._size, this._V0.RES_pos, this._V0.RES_size);
    }

    get parseV0_packet_id() {
        return this.getBits(this._packet, this._size, this._V0.packet_id_pos, this._V0.packet_id_size);
    }

    get parseV0_packet_sequence_number() {
        return this.getBits(this._packet, this._size, this._V0.packet_sequence_number_pos, this._V0.packet_sequence_number_size);
    }

    get parseV0_timestamp() {
        return this.getBits(this._packet, this._size, this._V0.timestamp_pos, this._V0.timestamp_size);
    }

    get parseV0_packet_counter() {
        return this.getBits(this._packet, this._size, this._V0.packet_counter_pos, this._V0.packet_counter_size);
    }

    get parseV0_private_user_data() {
        return this.getBits(this._packet, this._size, this._V0.private_user_data_pos, this._V0.private_user_data_size);
    }

    get parseV0_payload() {
        return this.getBits(this._packet, this._size, this._V0.payload_pos, this._V0.payload_size);
    }

    get parseV0_source_FEC_payload_ID() {
        return this.getBits(this._pakcet, this._size, this._V0.source_FEC_payload_ID_pos, this._V0.source_FEC_payload_ID_size);
    }
}
exports.MMTPPacketParser = MMTPPacketParser;
class PayloadParser {
    constructor(payload, size) {
        this._payload = payload;
        this._size = size;

        this._type_pos = 0;
        this._type_size = 8;

        this._f_i_pos = 8;
        this._f_i_size = 2;

        this._A_pos = 10;
        this._A_size = 1;

        this._R_pos = 11;
        this._R_size = 1;

        this._M_pos = 12;
        this._M_size = 1;

        this._S_pos = 13;
        this._S_size = 3;

        this._MPU_sequence_number_pos = 16;
        this._MPU_sequence_number_size = 32;

        this._frag_count_pos = 48;
        this._frag_count_size = 8;

        this._DU_length_pos = 56;
        this._DU_length_size = 16;

        this._DU_Header_pos = 72;
        this._DU_Header_size = undefined;

        this._DU_payload_pos = undefined;
        this._DU_payload_size = undefined;
    }

    static getBits(data, dataSize, pos, size) {
        return data << pos >>> dataSize - pos - size;
    }

    set packet(payload) {
        this._payload = payload;
    }

    set packetSize(size) {
        this._size = size;
    }

    get parse_type() {
        return this.getBits(this._payload, this._size, this._type_pos, this._type_size);
    }

    get parse_f_i() {
        return this.getBits(this._payload, this._size, this._f_i_pos, this._f_i_size);
    }

    get parse_A() {
        return this.getBits(this._payload, this._size, this._A_pos, this._A_size);
    }

    get parse_R() {
        return this.getBits(this._payload, this._size, this._R_pos, this._R_size);
    }

    get parse_M() {
        return this.getBits(this._payload, this._size, this._M_pos, this._M_size);
    }

    get parse_S() {
        return this.getBits(this._payload, this._size, this._S_pos, this._S_size);
    }

    get parse_MPU_sequence_number() {
        return this.getBits(this._payload, this._size, this._MPU_sequence_number_pos, this._MPU_sequence_number_size);
    }

    get parse_frag_count() {
        return this.getBits(this._payload, this._size, this._frag_count_pos, this._frag_count_size);
    }

    get parse_DU_length() {
        return this.getBits(this._payload, this._size, this._DU_length_pos, this._DU_length_size);
    }

    get parse_DU_Header() {
        return this.getBits(this._payload, this._size, this._DU_Header_pos, this._DU_Header_size);
    }

    get parse_DU_payload() {
        return this.getBits(this._payload, this._size, this._DU_payload_pos, this._DU_payload_size);
    }
}

exports.PayloadParser = PayloadParser;
class MP4Remuxer {
    constructor(mpu) {
        this._mpu = mpu;
    }

    get MPU() {
        return this._mpu;
    }
    set MPU(mpu) {
        this._mpu = mpu;
    }

    remux() {}
}
exports.MP4Remuxer = MP4Remuxer;
var mpu_rebulider = function () {
    var packets = new Array();
    var packetSizes = new Array();
    var lastSeq = null;
    var putPacket = function (packet, size, seq) {
        if (lastSeq != null && lastSeq != 0 && lastSeq + 1 === seq) {
            packets.push(packet);
            packetSizes.push(size);
        }
    };
};
let Http = require("http");
let Fs = require("fs");

let server = Http.createServer(function (req, res) {
    let path = "/Users/daehee/Git/MMT-WebPlayer/Client" + req.url;

    if (req.url === "/" || req.url === "/favicon.ico") {
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
        let end = partialend ? parseInt(partialend, 10) : total - 1;
        let chunksize = end - start + 1;
        console.log("RANGE: " + start + " - " + end + " = " + chunksize);

        let file = Fs.createReadStream(path, { start: start, end: end });
        res.writeHead(206, { "Content-Range": "bytes " + start + "-" + end + "/" + total, "Accept-Ranges": "bytes", "Content-Length": chunksize, "Content-Type": "text/html" });
        file.pipe(res);
    } else {
        console.log("ALL: " + total);
        res.writeHead(200, { "Content-Length": total, "Content-Type": "text/html" });
        Fs.createReadStream(path).pipe(res);
    }
});
server.listen(1337, "127.0.0.1");
var FileController = require("../../util/file-controller.js").FileController;
var MSEController = require("mse-controller.js").MSEController;

class LocalTestStream {
    constructor(mpuPathList, video) {
        this._mpuPathList = mpuPathList;
        this._fileController = new FileController();
        this._mseController = new MSEController();

        this._commonMimeCodec = "video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"";
        this._video = video;
    }

    onCreate() {
        let i = 0;
        let len = this._mpuPathList.length;
        for (i = 0; i < len; i++) {
            let path = this._mpuPathList[i];
            let mpu = this._fileController.readBinFile(path);
            let mimeCodec = this._commonMimeCodec;

            this._mseController.appendSegment(mimeCodec, mpu);
        }
        this._video.play();
    }

    test() {
        let mimeCodec = this._commonMimeCodec;
        this._mseController.createSourceBuffer(mimeCodec, this.onCreate);
    }
}
exports.LocalTestStream = LocalTestStream;

let video = document.querySelector("video");
let commonPath = "";
let paths = [];
paths[0] = commonPath + "/1.mpu";

let localTestStream = new LocalTestStream(paths, video);
localTestStream.test();
var Error = require("../error.js").Error;

class MSEController {
    constructor() {
        if ("MediaSource" in window) {
            this._mse = new MediaSource();
            this._mimeCodecs = [];
        }
    }

    static addSourceBuffer(mimeCodec, onCreate) {
        if (!this._mimeCodecs[mimeCodec]) {
            let sourceBuffer = this._mse.addSourceBuffer(mimeCodec);
            this._mimeCodecs[mimeCodec] = sourceBuffer;
            onCreate.bind(this);
        }
    }

    createSourceBuffer(mimeCodec, onCreate) {
        if (this._mse) {
            this._mse.addEventListener("sourceopen", this.addSourceBuffer.bind(this, mimeCodec, onCreate));
        }
    }

    appendSegment(mimeCodec, segment) {
        if (this._mse) {
            if (!this._mimeCodecs[mimeCodec]) {
                return Error.INVALID_PARAM;
            }
            let sourceBuffer = this._mimeCodecs[mimeCodec];
            sourceBuffer.appendBuffer(segment);
        }
    }
}

exports.MSEController = MSEController;
let Http = require("http");
let Fs = require("fs");

let server = Http.createServer(function (req, res) {
    let path = "/Users/daehee/Git/MMT-WebPlayer/Client" + req.url;

    if (req.url === "/" || req.url === "/favicon.ico") {
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
        let end = partialend ? parseInt(partialend, 10) : total - 1;
        let chunksize = end - start + 1;
        console.log("RANGE: " + start + " - " + end + " = " + chunksize);

        let file = Fs.createReadStream(path, { start: start, end: end });
        res.writeHead(206, { "Content-Range": "bytes " + start + "-" + end + "/" + total, "Accept-Ranges": "bytes", "Content-Length": chunksize, "Content-Type": "text/html" });
        file.pipe(res);
    } else {
        console.log("ALL: " + total);
        res.writeHead(200, { "Content-Length": total, "Content-Type": "text/html" });
        Fs.createReadStream(path).pipe(res);
    }
});
server.listen(1337, "127.0.0.1");
let http = require("http");
let fs = require("fs");
let server = http.createServer(function (req, res) {
    let path = "/Users/daehee/Git/MMT-WebPlayer/Client" + req.url;

    if (req.url === "/" || req.url === "/favicon.ico") {
        path = "/Users/daehee/Git/MMT-WebPlayer/Client/index.html";
    }
    console.log("path: " + path);
    console.log("url: " + req.url);
    let stat = fs.statSync(path);
    console.log("stat: " + stat);
    let total = stat.size;
    console.log("total: " + total);

    if (req.headers["range"]) {
        let range = req.headers.range;
        let parts = range.replace(/bytes=/, "").split("-");
        let partialstart = parts[0];
        let partialend = parts[1];

        let start = parseInt(partialstart, 10);
        let end = partialend ? parseInt(partialend, 10) : total - 1;
        let chunksize = end - start + 1;
        console.log("RANGE: " + start + " - " + end + " = " + chunksize);

        let file = fs.createReadStream(path, { start: start, end: end });
        res.writeHead(206, { "Content-Range": "bytes " + start + "-" + end + "/" + total, "Accept-Ranges": "bytes", "Content-Length": chunksize, "Content-Type": "text/html" });
        file.pipe(res);
    } else {
        console.log("ALL: " + total);
        res.writeHead(200, { "Content-Length": total, "Content-Type": "text/html" });
        fs.createReadStream(path).pipe(res);
    }
});
server.listen(1337, "127.0.0.1");
let http = require("http");
let fs = require("fs");
let server = http.createServer(function (req, res) {
    let path = "/Users/daehee/Git/MMT-WebPlayer/Client" + req.url;

    if (req.url === "/" || req.url === "/favicon.ico") {
        path = "/Users/daehee/Git/MMT-WebPlayer/Client/index.html";
    }
    console.log("path: " + path);
    console.log("url: " + req.url);
    let stat = fs.statSync(path);
    console.log("stat: " + stat);
    let total = stat.size;
    console.log("total: " + total);

    if (req.headers["range"]) {
        let range = req.headers.range;
        let parts = range.replace(/bytes=/, "").split("-");
        let partialstart = parts[0];
        let partialend = parts[1];

        let start = parseInt(partialstart, 10);
        let end = partialend ? parseInt(partialend, 10) : total - 1;
        let chunksize = end - start + 1;
        console.log("RANGE: " + start + " - " + end + " = " + chunksize);

        let file = fs.createReadStream(path, { start: start, end: end });
        res.writeHead(206, { "Content-Range": "bytes " + start + "-" + end + "/" + total, "Accept-Ranges": "bytes", "Content-Length": chunksize, "Content-Type": "text/html" });
        file.pipe(res);
    } else {
        console.log("ALL: " + total);
        res.writeHead(200, { "Content-Length": total, "Content-Type": "text/html" });
        fs.createReadStream(path).pipe(res);
    }
});
server.listen(1337, "127.0.0.1");
class SocketController {
    constructor() {}

    /**
     * Create and connect to server by tcp socket
     * @param server ip address
     * @param server port number
     */
    createTCPSock(host, port) {
        var Net = require("net");
        var tcpSock = Net.connect({ host: host, port: port });

        tcpSock.on("connect", function () {
            console.log("TCP connect!");
        });

        tcpSock.on("data", function (chunk) {
            console.log("recv: " + chunk);
            if (chunk.toString() === "socket test") {
                tcpSock.write("ok");
            } else {
                var udpSock = createUDPSock(host, chunk);
                sendUDPSock(udpSock, "UDP socket test", chunk, host);
            }
        });

        tcpSock.on("end", function () {
            console.log("disconnected.");
        });

        tcpSock.on("error", function (err) {
            console.log(err);
        });

        tcpSock.on("timeout", function () {
            console.log("connection timeout");
        });

        return tcpSock;
    }

    createUDPSock(ipAddr, port) {
        var dgram = require("dgram");
        var udpSock = dgram.createSocket("udp4");

        udpSock.on("error", err => {
            console.log("server error:\n${err.stack}");
            udpSock.close();
        });

        udpSock.on("message", (msg, rinfo) => {
            console.log("server got: ${msg} from ${rinfo.address}:${rinfo.port}");
        });

        udpSock.on("listening", () => {
            var address = udpSock.address();
            console.log("server listening ${address.address}:${address.port}");
        });

        udpSock.bind(port);

        return udpSock;
    }

    sendUDPSock(udpSock, data, port, ipAddr) {
        udpSock.send(data, port, ipAddr, err => {
            udpSock.close();
        });
    }
}

exports.SocketController = SocketController;
//import Item from "../../util/SequentialList.js";
//import SequentialList from "../../util/SequentialList.js";
//import MMTPPacketParser from "../parser/mmtp-packet-parser.js";

var Item = require("../../util/SequentialList.js").Item;
var SequentialList = require("../../util/SequentialList.js").SequentialList;
var MMTPPacketParser = require("../parser/mmtp-packet-parser.js").MMTPPacketParser;

class UDP_Buffer {
    constructor() {

        this._seqList = new SequentialList();
    }

    getFirstPacket() {
        return this._seqList.getNextSeqItem();
    }
    setPacket(packet, size) {
        let item = new Item();
        let packetParser = new MMTPPacketParser(packet, size);
        item.seq(packetParser.parseV0_packet_sequence_number);
        item.data(packet);
        if (!this._seqList.putItem(item)) {
            console.log("Drop packet. seq: " + item.seq);
        }

        return true;
    }
}

exports.UDP_Buffer = UDP_Buffer;
