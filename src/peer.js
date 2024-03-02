'use strict'

const { PeerRPCServer, PeerRPCClient } = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link')
const util = require('util')

const i = (obj) =>
  util.inspect(obj, {
    showHidden: false,
    depth: null,
    colors: true,
  })

const orderbook = require('./simple-orderbook')

const link = new Link({
  grape: 'http://127.0.0.1:40001',
})
link.start()

function createOrder(payload) {
  console.log(`createOrder(payload=${i(payload)})`)
  orderbook.addOrder(payload.type, payload.price, payload.quantity)

  return { ack: true }
}

function cancelOrder(_rid, _key, payload, handler) {
  console.log(`removeOrder(payload=${i(payload)})`)
  return { ack: true }
}

function getOrderbook(_rid, _key, payload, handler) {
  console.log(`getOrderbook(payload=${i(payload)})`)
  return orderbook.getOrders()
}

/**
 * returns Promise<portNumber>
 */
async function makeService(name) {
  const peerServer = new PeerRPCServer(link, { timeout: 300000 })
  peerServer.init()

  const service = peerServer.transport('server')
  service.listen(1024 + Math.floor(Math.random() * 1000))
  service.on('request', (_rid, _key, payload, handler) => {
    console.log('servicing request', i(payload))

    const result = {
      get_orderbook: getOrderbook,
      create_order: createOrder,
      cancel_order: cancelOrder,
    }[payload.command](payload)

    handler.reply(null, result)
  })

  const ready = new Promise((resolve, reject) => {
    // TODO: add error handling -> call the reject cb
    setInterval(
      () =>
        link.announce(name, service.port, { timeout: 1100 }, () =>
          resolve(service.port)
        ),
      1000
    )
  })

  return ready
}

function startClient() {
  const client = new PeerRPCClient(link, {})
  client.init()

  client.requestAsync = util.promisify(client.request)
  client.mapAsync = util.promisify(client.map)

  return {
    getOrderbook: () =>
      client.requestAsync(
        'p2p_exchange',
        { command: 'get_orderbook' },
        { timeout: 10000 }
      ),
    createOrder: (payload) =>
      client.mapAsync(
        'p2p_exchange',
        { command: 'create_order', payload },
        { timeout: 10000 }
      ),
    cancelOrder: (payload) =>
      client.mapAsync(
        'p2p_exchange',
        { command: 'cancel_order', payload },
        { timeout: 10000 }
      ),
  }
}

async function main() {
  try {
    const _port = await makeService('p2p_exchange')
    const client = startClient()
    const orderbook = await client.getOrderbook()

    console.log(`got orderbook=${i(orderbook)}`)

    const order = await createOrder({
      v: orderbook.version,
      type: 'buy',
      price: 100,
      quantity: 5,
    })

    console.log(`created order=${i(order)}`)

    const orderCancelled = await cancelOrder('TODO')

    console.log(`cancelled order=${i(orderCancelled)}`)
  } catch (e) {
    console.error('ERROR', e)
  }
}

main()
