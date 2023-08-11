import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from "uuid";
import * as http from 'http';


import {SessionController} from './controllers/session_controller'

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const sessionController = new SessionController();

app.use(cors());
app.use(bodyParser.json());

app.post('/session', (req: Request, res: Response) => {
  const sessionId = uuidv4()
  sessionController.newSession(sessionId, req.body['videoId']);
  res.json({ 'sessionId': sessionId });
});

app.get('/session/:id', (req: Request, res: Response) => {
  const videoId = sessionController.getVideoId(req.params.id)
  if(!videoId) {
    res.sendStatus(404);
  } else {
    res.json({ 'videoId': videoId});
  }
});

wss.on('connection', (ws: WebSocket, req, client) => {
  ws.on('error', console.error);

  ws.on('message', (data: WebSocket.RawData) => {
    const msg = JSON.parse(data)
    if (msg['type'] == 'init') {
      sessionController.registerSessionUser(ws, msg)
    } else if(msg['type'] == 'seek') {
      sessionController.syncAction(ws, msg)
    }
  });
});

app.listen(PORT, () => {
  console.log(`Starting on port ${PORT}`)
});
server.listen(WS_PORT, () => {
  console.log(`Launching wss on port ${WS_PORT}`)
});