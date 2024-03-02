// basic orderbook implementation
// taken from Gemini

const orders = {
  buy: [],
  sell: [],
}

function addOrder(type, price, quantity) {
  console.log('addOrder', { type, price, quantity })
  // Validate order type (buy/sell) and quantity
  if (type !== 'buy' && type !== 'sell') {
    throw new Error('Invalid order type')
  }
  if (quantity <= 0) {
    throw new Error('Order quantity must be positive')
  }

  orders[type].push({ price, quantity })
  sortOrders(type, orders[type]) // Sort orders by price (ascending for buy, descending for sell)
  matchOrders() // Try to match buy and sell orders after adding a new order
}

function sortOrders(type, orderList) {
  orderList.sort((a, b) => {
    if (type === 'buy') {
      return a.price - b.price // ascending for buy
    } else {
      return b.price - a.price // descending for sell
    }
  })
}

function matchOrders() {
  let buyOrders = orders.buy
  let sellOrders = orders.sell

  // Loop through buy and sell orders to find matches
  for (let i = 0; i < buyOrders.length; i++) {
    const buyOrder = buyOrders[i]
    for (let j = sellOrders.length - 1; j >= 0; j--) {
      // iterate sell orders in reverse
      const sellOrder = sellOrders[j]

      if (buyOrder.price >= sellOrder.price) {
        const tradeQuantity = Math.min(buyOrder.quantity, sellOrder.quantity)
        buyOrder.quantity -= tradeQuantity
        sellOrder.quantity -= tradeQuantity

        // Handle trade execution logic (e.g., update user balances)
        console.log(
          `Matched order: Buy ${tradeQuantity} at ${sellOrder.price} with Sell ${tradeQuantity}`
        )

        // Remove fully executed orders
        if (buyOrder.quantity === 0) {
          buyOrders.splice(i, 1)
          i-- // adjust loop index since an element was removed
        }
        if (sellOrder.quantity === 0) {
          sellOrders.splice(j, 1)
        }
      } else {
        break // No more matches possible with this buy order (prices don't meet)
      }
    }
  }
}

console.log(orders)

// Example usage
addOrder('buy', 100, 10)
addOrder('sell', 110, 5)
addOrder('buy', 95, 20) // Should match with the sell order at 100
addOrder('sell', 100, 5)

console.log(orders)

// This is a simplified example. Real-world order matching systems
// would handle more complex scenarios like order types (market, stop-loss),
// partial fills, and order cancellation.
