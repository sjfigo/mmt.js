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
exports.Item = Item;

/*
var itemTest = function () {
    let item = new Item("a1", 1);
    console.log(item);
    item.seq=2;
    item.data="a2";
    console.log(item);
};

itemTest();
*/

class SortedList {
    constructor () {
        this._list = []; 
    }
    putItem (item) {
        let i = 0;
        let len = this._list.length;

    //    console.log("putItem - 0 - " + item.seq);

        if (len > 0){
            for (i=0; i<len; i++) {
                if (item.seq <= this._list[i].seq) {
                    break;
                }
            }

            if (i === len) {
                this._list.push(item);
            }
            else {
                this._list.splice(i, 0, item);
            }
        }
        else {
            this._list.push(item);
        }

        /*let str = "";
        len = this._list.length;
        for (i=0; i<len; i++) {
            str += this._list[i].seq + "-";
        }
        console.log("SortedList - putItem: " + str);*/
    }
    pullItem (num) {
        if (num === undefined) {
            if (this._list.length > 0) {
                let item = this._list[0];
            //  console.log("sortedList-pullItem: " + item.seq);
                return item;
            }
            else {
                return null;
            }
        }
        else if(typeof num === "number") {
            return this._list[num];
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
            if (item.seq === this._list[i].seq && item.data === this._list[i].data) {
                this._list.splice(0, 1);
                ret = true;
                break;
            }
        }
        return ret;
    }
    get length () {
        return this._list.length;
    }
}
exports.SortedList =  SortedList;

/*
var seed = 1;
var getRndInteger = function (min, max) {
    var x = Math.sin(seed++);
    var ret = Math.floor(x * (max-min) + min);
    if (ret < 0) {
        ret *= -1;
    }
    return ret;
};
*/

/*
var sortedListTest = function () {
    let i = 0;
    let len = 10;
    let item = null;
    let randNum = 0;
    let sortedList = new SortedList();
    

    for (i=0; i<len; i++) {
        item = new Item();
        randNum = getRndInteger(0, len);
        item.seq = randNum;
        item.data = "A" + randNum;
        console.log(item.seq + ", " + item.data);
        sortedList.putItem(item);
    }
    for (i=0; i<len; i++) {
        item = sortedList.pullItem(i);
        console.log(item.seq + ", " + item.data);
    }
    for (i=0; i<1000; i++) {
        item = sortedList.pullItem();
        if (item === null) {
            console.log("Fail - item seq: " + item.seq);
            break;
        }
        if (!sortedList.removeItem(item)) {
            console.log("Remove fail");
        }
        console.log("pulled item seq: "+item.seq);
    }
};

sortedListTest();
*/

class SequentialList {
    constructor () {
        this._seqList = [];
        this._sortedList = new SortedList();
        this._lastItem = null;
    }

    getNextSeqItem () {
        let item = this._seqList[0];
        if (item !== null && item !== undefined) {
            if (this._lastItem === null || (this._lastItem !== null && item.seq === this._lastItem.seq + 1)) {
                this._lastItem = item;
                this._seqList.splice(0, 1);
                return item;
            }
            else {
                console.log("putItem error");
                return null;
            }
        }
        else if (this._seqList.length === 0 && this._sortedList.length > 0){
            // drop this seq num
            let i = 0;
            let lastItem = null;
            let len = this._sortedList.length;
            for(i=0; i<len; i++) {
                item = this._sortedList.pullItem();
                if (lastItem !== null && lastItem.seq + 1 !== item.seq){
                    break;
                }
                this._seqList.push(item);
                lastItem = item;
                this._sortedList.removeItem(item);
            }
            item = this._seqList[0];
            this._lastItem = item;
            this._seqList.splice(0, 1);

            return item;
        }
        else {
            console.log("no item");
            return null;
        }
    }
    putItem (item) {
        let len = this._seqList.length;
        if(len <= 0) {
            this._seqList.push(item);
        } else {
            let lastItem = this._seqList[len - 1];
            if (lastItem.seq + 1 === item.seq) {
                this._seqList.push(item);
                lastItem = item;
            }
            else if (lastItem.seq > item.seq) {
                return false;
            }
            else {
                this._sortedList.putItem(item);
            }

            let pulledItem = null;
            while((pulledItem = this._sortedList.pullItem()) !== null) {
                if (lastItem.seq + 1 === pulledItem.seq) {
                    this._seqList.push(pulledItem);
                    this._sortedList.removeItem(pulledItem);
                    lastItem = pulledItem;
                }
                else {
                    break;
                }
            }
        }

        let i = 0;
        let str = "";
        len = this._seqList.length;
        for (i = 0; i < len; i++) {
            str += this._seqList[i].seq + " - ";
        }
        console.log("Sequential putItems: " + str);
        str = "";
        len = this._sortedList.length;
        for (i=0; i<len; i++) {
            str += this._sortedList.pullItem(i).seq + " - ";
        }
        console.log("SortedList putItems: " + str);

        return true;
    }
}
exports.SequentialList = SequentialList;

/*
var sequentialListTest = function () {
    let arr = [];
    let i = 0;
    let len = 100;
    let swap = function (n, m) {
        [arr[n], arr[m]] = [arr[m], arr[n]];
    };

    for(i=0; i<len; i++) {
        let item = new Item("a" + i, i);
        arr.push(item);
    }

    let str = "";
    for (i=0; i<len; i++) {
        str += arr[i].seq + "-";
    }
    console.log("Input Items: " + str);

    for(i=0; i<len/10; i++) {
        let n = getRndInteger(0, len-1);
        let m = getRndInteger(0, len-1);
        swap(n, m);
        console.log("swap: " + n + ", " + m);
    }

    for(i=0; i<len/10; i++) {
        let drop = getRndInteger(0, arr.length-1);
        console.log("drop: " + drop + ", seq: " + arr[drop].seq + ", data: " + arr[drop].data);
        arr.splice(drop, 1);
    }
    
    len = arr.length;

    str = "";
    for (i=0; i<len; i++) {
        str += arr[i].seq + "-";
    }
    console.log("Swaped Items: " + str);
    

    var seqList = new SequentialList();
    for(i = 0; i < len; i++) {
        seqList.putItem(arr[i]);
    }

    for(i = 0; i < len; i++) {
        let item = seqList.getNextSeqItem();
        console.log("getNextSeqItem - seq: " + item._seq + ", data: " + item._data);
    }
};

sequentialListTest();
*/