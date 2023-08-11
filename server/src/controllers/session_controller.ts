import WebSocket from 'ws';

import {SessionData} from '../models/session'

export class SessionController {
    private sessionStore: {[key: string]: SessionData;}
    private peerStore: {[key: string]: WebSocket[];}

    constructor() {
        this.sessionStore = {}
        this.peerStore = {}
    }

    newSession(sessionId: string, videoId: string) {
        this.sessionStore[sessionId] = {
            videoId: videoId,
            playing: false,
            videoIdx: 0,
            lastSeekOperation: 0
        }
    }

    getVideoId(sessionId: string) {
        if(!(sessionId in this.sessionStore)) {
            return undefined;
        }

        return this.sessionStore[sessionId].videoId;
    }

    registerSessionUser(ws: WebSocket, msg: { [key: string]: any; }) {
        const source = msg.clientId
        const sessionId = msg['sessionId'];
        const seekIdx = this.getCurrentSeekIdx(sessionId);

        const source_entry = {
            'client': source,
            'socket': ws
        }

        if(!(sessionId in this.peerStore)) {
            this.peerStore[sessionId] = [source_entry]
            this.sessionStore[sessionId].playing = true;
        } else {
            this.peerStore[sessionId].push(source_entry)
        }

        this.seekTo(sessionId, ws, seekIdx, this.sessionStore[sessionId].playing, msg.syncTime)
    }

    syncAction(ws: WebSocket, msg: { [key: string]: any; }) {
        const source = msg.clientId
        const sessionId = msg.sessionId;

        this.peerStore[sessionId].forEach((peer) => {
            if (peer.client !== source && peer.socket.readyState === WebSocket.OPEN) {
                this.seekTo(sessionId, peer.socket, msg.seekIdx, msg.playing, msg.syncTime)
            }
        });
    }

    private seekTo(sessionId: string, ws: WebSocket, seekIdx: number, playing: boolean, seekTime: number) {
        const sessionMeta = this.sessionStore[sessionId]

        ws.send(JSON.stringify({
            'type': 'seek',
            'seekIdx': seekIdx,
            'playing': playing
        }));
        sessionMeta.videoIdx = seekIdx;
        sessionMeta.playing = playing;
        sessionMeta.lastSeekOperation = seekTime;
    }

    private getCurrentSeekIdx(sessionId: string) {
        const sessionMeta = this.sessionStore[sessionId]
        var delta = 0
        if(sessionMeta.playing) {
            delta = (Date.now() - sessionMeta.lastSeekOperation) / 1000
        }
        
        return sessionMeta.videoIdx + delta;
    }
}