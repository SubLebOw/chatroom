# Chat Room

A tiny browser chat room with no server of its own. Live: https://sublebow.github.io/chatroom/

## How it works
- Pick a nickname, then **HOST** to open a room. You get a 4-letter code and a shareable link (`?room=CODE`).
- Friends **JOIN** with the code (the link fills it in).
- Uses [PeerJS](https://peerjs.com) (same approach as Coreburn co-op): the free public PeerJS server (0.peerjs.com) only introduces browsers; messages then go directly between devices over WebRTC, with Google's STUN servers to get through home routers.
- The host's browser relays every message to everyone. Text is shown as plain text (no HTML).

## Limits
- The room only exists while the **host's tab is open**. When the host leaves, the room closes.
- **No history**: you only see messages sent while you're in the room.
- About 12 people max. Some strict networks/firewalls block WebRTC without a TURN server.
- Relies on the free public PeerJS server being up.

## Reusable code
Type a 4-letter code in the HOST box, or open `?host=CALB`, to host with that fixed code every week (auto-hosts if your nickname is saved). If someone else is using it, you'll see an error.
