var BrowserCode = require("../Client/src/browser-code.js");
var that = null;

class WebRtcSet {
    constructor () {
        this.sendChannel = null;
        this.recvConnection = null;
        this.recvChannel = null;
    }
}
 
class UDPController {
    constructor (socketType) {
        this.useWebRTC = false;

        if (socketType === "node") {
            this.dgram = require("dgram");
        }
        else if (socketType === "webrtc") {
            this.useWebRTC = true;
            //var RTCPeerConnection = require("rtc");
            this.webRTCServer = false;
            this.webRTCClient = false;
            console.log("Use Web-RTC");
        }
        else {
            return null;
        }
        
        this.udpSock = null;
        this.onError = null;
        this.onRecv = null;
        this.onListen = null;

        this.addr_ = null;
        this.port_ = null;

        this.recvPktCnt = 0;

        this.webRtcCandidateListener_ = null;
        this.remoteWebRtcCandidate_ = null;

        that = this;
    }

    createUDPSock () {
        if (this.useWebRTC === false) { //dgram
            this.createNodeDgramSock();
        }
        else { // WebRTC
            this.createWebRtcSock();
        }
    }

    set webRtcCandidateListener (func) {
        this.webRtcCandidateListener_ = func;
    }

    set remoteWebRtcCandidate (candidate) {
        this.remoteWebRtcCandidate_ = candidate;
    }

    createWebRtcSock () {
        const config = {
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };

        if (this.useWebRTC === false) {
            return null;
        }

        this.udpSock = new WebRtcSet();
        
        if (this.webRTCServer === true) {
            let wrtc = require("wrtc");
            let RTCPeerConnection = wrtc.RTCPeerConnection;
            
            this.udpSock.sendConnection = new RTCPeerConnection(config);
            if (this.udpSock.sendConnection == null) {
                return null;
            }

            this.udpSock.sendConnection.createOffer(function (offer_sdp) {
                this.udpSock.sendConnection.setLocalDescription(offer_sdp, function () {
                    that.webRtcCandidateListener_(offer_sdp);
                })
            });

            /*this.udpSock.sendConnection.onicecandidate = ({ candidate }) => {
                if (candidate && that.webRtcCandidateListener_) {
                    that.webRtcCandidateListener_(candidate);
                }
            };*/
        }
        else if (this.webRTCClient === true) {
            this.udpSock.recvConnection = new RTCPeerConnection(config);
            if (this.udpSock.recvConnection == null) {
                return null;
            }

            this.udpSock.recvConnection.createAnswer(function (answer_sdp) {
                this.udpSock.recvConnection.setLocalDescription(answer_sdp, function() {
                    that.webRtcCandidateListener_(answer_sdp);
                });
            });

            /*this.udpSock.recvConnection.onicecandidate = ({ candidate }) => {
                if (candidate && that.webRtcCandidateListener_) {
                    that.webRtcCandidateListener_(candidate);
                }
            };*/
        }
    }

    readyWebRtcSock (channelName, candidate) {
        if (this.useWebRTC === false) {
            return null;
        }
        
        if (this.webRTCServer === true) {
            const dataChannelConfig = { ordered: false, maxRetransmits: 0 };
            const channelLabel = "mmt-stream-channel";// + channelName; //mmt-stream-channel-server-xxxxx
            
            this.udpSock.sendChannel = this.udpSock.sendConnection.createDataChannel(channelLabel, dataChannelConfig);

            //this.udpSock.sendChannel.onmessage = this.handleSendMessage;
            this.udpSock.sendChannel.onopen = this.handleSendChannelStatusChange;
            this.udpSock.sendChannel.onclose = this.handleSendChannelStatusChange;

            //let remoteConnection = new RTCPeerConnection();
            //remoteConnection.ondatachannel = this.receiveChannelCallback;

            //this.udpSock.sendConnection.onicecandidate = e => !e.candidate
            /*|| remoteConnection.addIceCandidate(e.candidate)
            .catch(this.handleAddCandidateError);*/

            /*this.udpSock.sendConnection.createOffer()
                .then(offer => this.udpSock.sendConnection.setLocalDescription(offer))
                .then(() => remoteConnection.setRemoteDescription(this.udpSock.sendConnection.localDescription))
                .then(() => remoteConnection.createAnswer())
                .then(answer => remoteConnection.setLocalDescription(answer))
                .then(() => this.udpSock.sendConnection.setRemoteDescription(remoteConnection.localDescription)) //RemoteConnection!!! client로부터 받아야 하나?
                .catch(this.handleCreateDescriptionError);*/
        }
        else if (this.webRTCClient === true) {
            const dataChannelConfig = { ordered: false, maxRetransmits: 0 };
            const channelLabel = "mmt-stream-channel";// + channelName; //mmt-stream-channel-client-xxxxx
            
            this.udpSock.recvChannel = this.udpSock.recvConnection.createDataChannel(channelLabel, dataChannelConfig);
            this.udpSock.recvConnection.ondatachannel = this.receiveChannelCallback;
            
            this.udpSock.recvChannel.onmessage = this.handleReceiveMessage;
            this.udpSock.recvChannel.onopen = this.handleReceiveChannelStatusChange;
            this.udpSock.recvChannel.onclose = this.handleReceiveChannelStatusChange;

            /*const sdpConstraints = {
                mandatory: {
                    OfferToReceiveAudio: false,
                    OfferToReceiveVideo: false,
                },
            };
            
            this.udpSock.recvConnection.onicecandidate = this.onIceCandidate;
            this.udpSock.recvConnection.createOffer(this.onOfferCreated, () => {}, sdpConstraints);*/
        }
    }

    handleCreateDescriptionError (event) {
        console.log(event);
    }

    handleAddCandidateError (event) {
        console.log(evnet);
    }
    
    receiveChannelCallback (event) {
        that.recvPktCnt ++;
        console.log("Recv:" + that.recvPktCnt);
        
        that.udpSock.recvChannel = event.channel;
        that.udpSock.recvChannel.onmessage = that.handleReceiveMessage;
        that.udpSock.recvChannel.onopen = that.handleReceiveChannelStatusChange;
        that.udpSock.recvChannel.onclose = that.handleReceiveChannelStatusChange;
    }

    onIceCandidate (event) {
        console.log("onIceCandidate - " + event.candidate);
        /*if (event && event.candidate) {
            webSocketConnection.send(JSON.stringify({type: 'candidate', payload: event.candidate}));
        }*/
    }

    onOfferCreated(description) {
        console.log("onOfferCreated - SDP - " + description.sdp);
        console.log("onOfferCreated - type - " + description.type);
        that.udpSock.recvConnection.setLocalDescription(description);
        //webSocketConnection.send(JSON.stringify({type: 'offer', payload: description}));
    }

    set MediaStreamType (type) {
        if (this.useWebRTC == true) {
            if (type == "sender") {
                this.webRTCServer = true;
                this.webRTCClient = false;
            }
            else if (type === "receiver") {
                this.webRTCServer = false;
                this.webRTCClient = true;
            }
        }
    }

    handleSendChannelStatusChange (event) {
        if (that.udpSock.sendChannel) {
            let state = that.udpSock.sendChannel.readyState;
        
            if (state === "open") {
                /** example
                messageInputBox.disabled = false;
                messageInputBox.focus();
                sendButton.disabled = false;
                disconnectButton.disabled = false;
                connectButton.disabled = true;
                */
               
            } 
            else {
                /** example
                messageInputBox.disabled = true;
                sendButton.disabled = true;
                connectButton.disabled = false;
                disconnectButton.disabled = true;
                */
            }
        }
    }

    handleReceiveMessage(event) {
        /* example
        let el = document.createElement("p");
        let txtNode = document.createTextNode(event.data);
        
        el.appendChild(txtNode);
        receiveBox.appendChild(el);
        */

        console.log("Got from server: "+ event.data);
        if (that.onRecv !== null) {
            that.onRecv(event.data, null);
        }
    }

    handleReceiveChannelStatusChange (event) {
        console.log("Receive channel's status has changed to ");// + receiveChannel.readyState);
        if (that.udpSock.recvChannel.readyState == "open") {
            
        }
        else {
            
        }
    }

    getConnectInfo() {
        return this.connectInfo;
    }
    
    createNodeDgramSock () {
        if (this.dgram == undefined || this.dgram == null) {
            return null;
        }

        this.udpSock = this.dgram.createSocket({type:"udp6", recvBufferSize:1024*1024*5, sendBufferSize:1024*1024*5});
        
        this.udpSock.on("error", (err) => {
            if (err !== null) {
                console.log("server error:\n${err.stack}");
                console.log(err);
                if (this.onError !== null) {
                    this.onError(err);
                }
                this.udpSock.close();
            }
        });

        this.udpSock.on("message", (msg, rinfo) => {
            //console.log("server got: "+msg+" from "+rinfo.address+":"+rinfo.port);
            if (this.onRecv !== null) {
                this.onRecv(msg, rinfo);
            }
        });

        this.udpSock.on("listening", () => {
            let address = this.udpSock.address();
            this.addr_ = address.address;
            this.port_ = address.port;
            console.log("udp listening "+address.address+" "+address.port);
        });

        //this.udpSock.setRecvBufferSize(1024*1024);
    }

    setRecvBufferSize (size) {
        this.udpSock.setRecvBufferSize(size);
    }

    bind (ipAddr, port, cbFunc) {
        if (this.useWebRTC !== true) {
            if (port === null || port === undefined) {
                port = this.port_;
            }
            if (ipAddr === null || ipAddr === undefined) {
                ipAddr = this.addr_;
            }
            console.log("udp controller - bind - port: "+port+", addr: "+ipAddr);
            this.udpSock.bind(port, ipAddr, cbFunc);
        }
        else {
            this.readyWebRtcSock("test");        
        }
    }

    sendUDPSock (data, port, ipAddr) {
        if (port === null || port === undefined || ipAddr === null || ipAddr === undefined || data === undefined) {
            return false;
        }
        if (this.useWebRTC == true) {
            if (this.udpSock === null) {
                if (this.createWebRtcSock("" + port + ipAddr) === null) {
                    return false;
                }
            }
            if (this.udpSock.sendChannel.readyState === "open") {
                this.udpSock.sendChannel.send(data);
            }
        }
        else {
            //console.log("udp controller - send - port: "+port+", addr: "+ipAddr+", data:");
            this.udpSock.send(data, port, ipAddr, (err) => {
                if (err !== null) {
                    console.log("sendUDPSock - "+err);
                    if (this.onError !== null) {
                        this.onError();
                    }
                    this.udpSock.close();
                }
            });
        }
    }

    set onListenCB (func) {
        console.log("Set onListenCB");
        this.onListen = func;
    }

    set onRecvCB (func) {
        this.onRecv = func;
    }

    set onErrorCB (func) {
        this.onError = func;
    }

    get address () {
        return this.addr_;
    }

    get port () {
        return this.port_;
    }
}

module.exports = UDPController;

//var udpController = new UDPController(new BrowserCode().chrome);