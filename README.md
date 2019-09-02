wsrooms
=======

A [Gorilla WebSocket](https://github.com/gorilla/websocket) implementation with support for rooms.

[![GoDoc](https://godoc.org/github.com/joncody/wsrooms?status.svg)](https://godoc.org/github.com/joncody/wsrooms)

## Installation
`go get -u github.com/joncody/wsrooms`

## Browser API
- [wsrooms](#wsroomsurl---room)
- [Room](#room)
  - [on](#onevent-executable)
  - [name](#name---string)
  - [open](#open---boolean)
  - [members](#members---array)
  - [id](#id---string)
  - [send](#sendevent-payload-dst)
  - [join](#joinroomname---room)
  - [leave](#leave)
  - [parse](#parsepacket)
  - [purge](#purge-root-room-only)
  - [rooms](#rooms-root-room-only)

### wsrooms(url) _-> {Room}_
> Connects to a wsrooms WebSocket server and returns the root Room.
###### Parameters
Name | Type | Description
---- | ---- | -----------
url | String | The WebSocket URL to connect to.
<br />

### Room
> A wsrooms communication channel.
#### Properties
##### name _-> {String}_
> The Room name.

<br />

#### Methods
##### on(event, executable)
> Adds an event listener to the Room.
###### Parameters
Name | Type | Description
---- | ---- | -----------
event | String | The event to listen for.
executable | Function | The callback to run.
<br />

##### open() _-> {Boolean}_
> Gets the Room connection status.

<br />

##### members() _-> {Array}_
> Gets the Room members (a list of their uuids).

<br />

##### id() _-> {String}_
> Gets the local WebSocket connection uuid.

<br />

##### send(event, payload, dst)
> Sends a message to the server.
###### Parameters
Name | Type | Description
---- | ---- | -----------
event | String | The name of the event.
payload | Any | The message data.
dst | String (optional, default: "") | The destination uuid.
<br />

##### join(roomname) _-> {Room}_
> Joins a Room. If the Room does not exist, it is created.
###### Parameters
Name | Type | Description
---- | ---- | -----------
roomname | String | The name of the room.
<br />

##### leave()
> Leaves the Room.

<br />

##### parse(packet)
> Handles received messages after they have been converted to an object. The Room emits the event, payload, and source of the message if the event name is not reserved.
###### Parameters
Name | Type | Description
---- | ---- | -----------
packet | Object | The message adhering to the wsrooms protocol.
<br />

##### purge() *_root room only_
> Leaves all Rooms other than the root Room.

<br />

##### rooms() *_root room only_
> Returns all currently joined rooms.

<br />

#### Events
Name | Parameters | Description
---- | ---------- | -----------
open | | Fired when the Room has been successfully joined.
joined | id (String) | Fired when another connection is made to the Room.
left | id (String) | Fired when another member disconnects from the Room.
close | | Fired when the Room has been successfully left.
