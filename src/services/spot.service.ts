import { ConfigService } from './config.service'
import { MainClient, USDMClient } from 'binance'

export class SpotService {
  private client: MainClient

  constructor(private configService: ConfigService) {
    const { key, secret } = this.configService.getBinanceConfig()
    this.client = new MainClient({ api_key: key, api_secret: secret })
  }

  buy(symbol: string, amountUSD: number) {
    return this.client.submitNewOrder({
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quoteOrderQty: amountUSD,
    })
  }

  sell(symbol: string, amountUSD: number) {
    return this.client.submitNewOrder({
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quoteOrderQty: amountUSD,
    })
  }

  getMyBalances() {
    return this.client
      .getBalances()
      .then((balances) =>
        balances.filter((balance) => Number(balance.free) > 0)
      )
  }

  getPricesDict() {
    return this.client.getSymbolPriceTicker().then((pairs) => {
      if (!Array.isArray(pairs)) {
        return {}
      }

      return pairs
        .filter(
          ({ symbol }) => symbol.includes('USDT') || symbol.includes('BUSD')
        )
        .reduce((dict, pair) => {
          const { symbol, price } = pair
          dict[symbol] = Number(price)
          return dict
        }, {} as Record<string, number>)
    })
  }
}
