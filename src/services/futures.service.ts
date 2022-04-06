import { ConfigService } from './config.service'
import { PositionSide, USDMClient } from 'binance'
import { Command } from '../models/command'

export class FuturesService {
  private client: USDMClient

  constructor(private configService: ConfigService) {
    const { key, secret } = this.configService.getBinanceConfig()
    this.client = new USDMClient({ api_key: key, api_secret: secret })
  }

  getClient() {
    return this.client
  }

  async setupTrade(command: Command) {
    const { symbol } = command

    await this.cancelOpenOrders(command)

    const leverage = this.configService.getLeverage()
    await this.client.setLeverage({ symbol, leverage })

    await this.client
      .setMarginType({ symbol, marginType: 'ISOLATED' })
      .catch((error) => {
        const isAlreadyIsolated =
          error.message === 'No need to change margin type.'
        if (!isAlreadyIsolated) {
          process.exit()
        }
      })

    await this.client
      .setPositionMode({ dualSidePosition: 'true' })
      .catch((error) => {
        const isAlreadyHedgeMode =
          error.message === 'No need to change position side.'
        if (!isAlreadyHedgeMode) {
          process.exit()
        }
      })
  }

  async getDecimalsInfo(symbol: string) {
    const exchangeInfo = await this.client.getExchangeInfo()
    const { pricePrecision, quantityPrecision } = exchangeInfo.symbols.find(
      (symbolInfo) => symbolInfo.symbol === symbol
    )
    return { pricePrecision, quantityPrecision }
  }

  async calculateQuantity(command: Command, quantityPrecision: number) {
    const { symbol, amountUSD } = command
    const leverage = this.configService.getLeverage()

    const { markPrice } = await this.client.getMarkPrice({
      symbol,
      isIsolated: 'TRUE',
    })

    const currentPrice = Number(markPrice)

    const quantity = Number(amountUSD / currentPrice).toFixed(quantityPrecision)

    return Number(quantity) * leverage
  }

  async calculateTpSl(
    symbol: string,
    side: PositionSide,
    pricePrecision: number
  ) {
    const positions = await this.client.getPositions({ symbol })
    const longPosition = positions.find(
      (position) => position.positionSide === side
    )
    const price = Number(longPosition.entryPrice)

    const slPercentage = this.configService.getSlPercentage()
    const tpPercentage = this.configService.getTpPercentage()

    // long position
    if (side === 'LONG') {
      const stopLoss = ((price * (100 - slPercentage)) / 100).toFixed(
        pricePrecision
      )

      const takeProfit = ((price * (100 + tpPercentage)) / 100).toFixed(
        pricePrecision
      )

      return { stopLoss: Number(stopLoss), takeProfit: Number(takeProfit) }
    }

    const stopLoss = ((price * (100 + slPercentage)) / 100).toFixed(
      pricePrecision
    )

    // short position
    const takeProfit = ((price * (100 - tpPercentage)) / 100).toFixed(
      pricePrecision
    )

    return { stopLoss: Number(stopLoss), takeProfit: Number(takeProfit) }
  }

  private async cancelOpenOrders(command: Command) {
    const { symbol, side } = command

    const openOrders = await this.client.getAllOpenOrders({ symbol })
    const positionOrders = openOrders.filter(
      (order) => order.positionSide == side
    )

    for (const order of positionOrders) {
      await this.client.cancelOrder({ symbol, orderId: order.orderId })
    }
  }
}
