
import {
    RTCPeerConnection,
    MediaStreamTrack,
    getUserMedia,
    RTCSessionDescription
} from 'react-native-webrtc';


let pc = null;
const ICE_CONFIG = { iceServers: [{ url: 'stun:47.91.149.159:3478' }] };


export function startCommunication(_sendMessage, _name, callback) {
    getLocalStream(true, stream => {
        var pc = createPC(_sendMessage, _name, true, stream);
        callback(stream, pc);
    });
}


export function getLocalStream(isFront, callback) {
    MediaStreamTrack.getSources(sourceInfos => {
        let videoSourceId;
        for (let i = 0; i < sourceInfos.length; i++) {
            const sourceInfo = sourceInfos[i];
            if (sourceInfo.kind === 'video' && sourceInfo.facing === (isFront ? 'front' : 'back')) {
                videoSourceId = sourceInfo.id;
                break;
            }
        }

        getUserMedia({
            audio: true,
            video: {
                mandatory: {
                    minFrameRate: 30
                }
            },
            facingMode: (isFront ? 'user' : 'environment'),
            optional: (videoSourceId ? [{ sourceId: videoSourceId }] : [])
        }, (stream) => {
            callback(stream);
        }, logError);
    });
}

export function createPC(sendMessage, name, isOffer, localStream, callback) {
    pc = new RTCPeerConnection(ICE_CONFIG);

    pc.onnegotiationneeded = () => {
        console.log('onnegotiationneeded');
        if (isOffer) {
            createOffer();
        }
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            var msg = {
                'id': 'onIceCandidate',
                'candidate': event.candidate,
                'name': name
            };
            sendMessage(msg);
        }
    } 

    pc.oniceconnectionstatechange = (event) => {
        console.log('oniceconnectionstatechange:', event.target.iceConnectionState);
    };

    pc.onsignalingstatechange = (event) => {
        console.log('onsignalingstatechange: ', event.target.signalingState);
    };

    pc.addStream(localStream);

    function createOffer() {
        pc.createOffer(desc => {
            pc.setLocalDescription(desc, () => {
                console.log(pc.localDescription);
                var msg = {
                    'id': 'receiveVideoFrom',
                    'sender': name,
                    'sdpOffer': pc.localDescription.sdp
                };
                sendMessage(msg);
            }, logError);
        }, logError);
    }

    return pc;
}


export function addIceCandidate(candidate) {
    console.log('received ICE');
    if (pc) {
        pc.addIceCandidate(candidate);
    } else {
        console.log('pc.addIceCandidate failed');
    }
}

export function ProcessAnswer(sdp, callback) {
    var answer = {
        'type': 'answer',
        'sdp': sdp
    };
    if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(answer));
        callback();
    }
}


function logError(error) {
    console.log('logError', error);
}