# Installing and Running

```sh
npm install

# start 2 grape instances
npm run grapes

# run as many nodes/peers as you want
node ./src/peer.js
```

# Implementation

This takes a very basic approach in order to achieve proof-of-concept. Each peer has an orderbook which is versioned. An order can only be placed if you have the latest version. If any peers have a version higher than yours, it means they have already accepted an order and you need to update your orderbook before placing an order. This isn't ideal "at scale", but it's basic enough to implement in a day, and does the job for the sake of this exercise.

## Limitations and issues

If a peer stops and is restarted (on a different port), grape doesn't "drop it". Need to look into why/what's wrong. Right now I'm re-running `npm run grapes` command and it's not great DX.

### Orderbook

It's a very simplistic implementation. The whole orderbook is stored as a JS object. Storage / perf would be an issue.

The prices are stored "as is", it would make sense either store cents as whol integers or alternatively use a currency number type from an npm lib.

This implementation doesn't strictly update the local orderbook - it does so through the p2p mechanism by sending ourselves the same `create_order` message. We could simplify that by doing that update in place, and ignoring or not sending the create_order message to ourselves.

# Next steps


### Features
Currently the creating of a new order is hardcoded in the `./src/peer.js`. I'd like to extend it to read `stdin` and be able to process commands such as:

```
buy 100 10
buy 105 7
buy 110 4
```

Add ability to cancel orders - need order.peer_id, so can only cancel our own orders


### Security
Defensive programming -> fail early for invalid inputs (for example payload.command)
doesn't deal with bad actor peers

### Perf
Streamlining placing orders and distributing orderbook updates. This is a



