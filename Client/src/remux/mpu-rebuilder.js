var mpu_rebulider = function () {
    var packets = new Array ();
    var packetSizes = new Array ();
    var lastSeq = null;
    var putPacket = function (packet, size, seq) {
        if (lastSeq != null && lastSeq != 0 && lastSeq+1 === seq) {
            packets.push(packet);
            packetSizes.push(size);
        }

    };
};