import Item from "../../util/SequentialList.js";
import SequentialList from "../../util/SequentialList.js";

class UDP_Buffer {
    constructor () {
        this._seqList = new SequentialList();
    }

    get packet () {

    }
    set packet (packet) {
        let item = new Item();
        item.seq();
        item.data();
    }
}