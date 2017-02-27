class Item {
    constructor (data, seq) {
        this._data = data;
        this._seq = seq;
    }
    set data (data) {
        this._data = data;
    }
    get data () {
        return this._data;
    }
    set seq (seq) {
        this._seq = seq;
    }
    get seq () {
        return this._seq;
    }
}

class SortedList {
    constructor () {
        this._list = new Array(); 
    }
    putItem (item) {
        let i = 0;
        let len = this._list.length;
        for(i=0; i<len; i++) {
            if (item.seq > this._list[i].seq) {
                break;
            }
        }
        this._list.splice(i, 1, item);
    }
    pullItem () {
        if (this._list.length > 0) {
            return this._list[0];
        }
        else {
            return null;
        }
    }
    removeItem (item) {
        let i = 0;
        let len = this._list.length;
        let ret = false;
        
        for (i=0; i<len; i++) {
            if (item.seq() === this._list[i].seq() && item.data() === this._list[i].data()) {
                this._list.splice(0, 1);
                ret = true;
                break;
            }
        }
        return ret;
    }
}

class SequentialList {
    constructor () {
        this._seqList = new Array();
        this._sortedList = new SortedList();
        this._lastItem = null;
    }

    getNextSeqItem () {
        let item = this._seqList[0];
        if (this._lastItem === null || (this._lastItem !== null && item.seq() === this._lastItem.seq() + 1)) {
            this._lastItem = item;
            this._seqList.splice(0, 1);
            return item;
        }
        else {
            return null;
        }
        
    }
    putItem (item) {
        let len = this._seqList.length;
        if (this._seqList[len-1].seq + 1 === item.seq) {
            this._seqList.push(item);
        }
        else {
            this._sortedList.putItem(item);
        }

        let pulledItem = null;
        while((pulledItem = this._sortedList.pullItem()) !== null) {
            if (this._seqList[this._seqList.length-1].seq+1 === pulledItem.seq) {
                this._seqList.push(pulledItem);
                if (!(this._sortedList.removeItem(pulledItem))) {
                    break;
                }
            }
            else {
                break;
            }
        }
    }
}