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

/**
 * returns Promise<portNumber>
 */
async function startService(name) {
  const createOrder = (payload) => {
    console.log(`createOrder(payload=${i(payload)})`)

    // optimistic version locking
    // if the client didn't have the latest orderbook version the order will be rejected
    if (payload.v === orderbook.getOrders().version) {
      orderbook.addOrder(payload.type, payload.price, payload.quantity)
      console.log(`new orderbook state is ... ${i(orderbook.getOrders())}`)
      return { accepted: true }
    } else {
      return { accepted: false }
    }
  }

  const peerServer = new PeerRPCServer(link, { timeout: 300000 })
  peerServer.init()

  const service = peerServer.transport('server')
  service.listen(1024 + Math.floor(Math.random() * 1000))
  service.on('request', (_rid, _key, payload, handler) => {
    const result = {
      get_orderbook: orderbook.getOrders,
      create_order: createOrder,
    }[payload.command](payload.args)

    handler.reply(null, result)
  })

  const ready = new Promise((resolve, reject) => {
    setInterval(
      () =>
        link.announce(name, service.port, { timeout: 1100 }, (err) =>
          err ? reject(err) : resolve(service.port)
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
    getOrderbook: async () => {
      const results = await client.mapAsync(
        'p2p_exchange',
        { command: 'get_orderbook' },
        { timeout: 10000 }
      )

      console.log({ results })

      let max = results.reduce(
        (acc, result) => Math.max(acc, result.version),
        0
      )

      return results.find((x) => x.version === max)
    },
    createOrder: (args) =>
      client.mapAsync(
        'p2p_exchange',
        { command: 'create_order', args },
        { timeout: 10000 }
      ),
  }
}

async function retry(times, fn) {
  for (let i = 0; i < times; i++) {
    try {
      return await fn()
    } catch {
      if (i === times) return Promise.error(`${times} retries failed`)
    }
  }
}

async function main() {
  const _port = await startService('p2p_exchange')
  const client = startClient()

  let newOrders = await client.getOrderbook()
  orderbook.setOrders(newOrders)
  console.log(
    `got fresh orderbook=${i(orderbook.getOrders())} [v=${newOrders.version}]`
  )

  const placeOrder = async (type, price, quantity) => {
    let responses = await client.createOrder({
      v: orderbook.getOrders().version,
      type: 'sell',
      price: 100,
      quantity: 12,
    })

    if (responses.some((response) => !response.accepted)) {
      // update our orderbook version
      newOrders = await client.getOrderbook()
      orderbook.setOrders(newOrders)
      console.log(`fetched a refreshed orderbook=${i(orderbook)}`)
      return Promise.reject('version check failed')
    } else {
      return 'success'
    }
  }

  try {
    const orderOk = await retry(5, () => placeOrder('buy', 100, 5))

    console.log(`created order=${i(orderOk)}`)
  } catch (e) {
    console.error('ERROR', e)
  }
}

main()
