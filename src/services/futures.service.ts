import { ConfigService } from './config.service'
import { OrderResult, PositionSide, USDMClient } from 'binance'
import { TradeCommand } from '../models/command'
import { wait } from '../libs/wait'

export class FuturesService {
  private client: USDMClient

  constructor(private configService: ConfigService) {
    const { key, secret } = this.configService.getBinanceConfig()
    this.client = new USDMClient({ api_key: key, api_secret: secret })
  }

  async setupTrade(command: TradeCommand) {
    const { symbol, onlyOneOrder } = command

    const positionOrders = await this.getPositionOrders(command)

    if (onlyOneOrder && positionOrders.length > 0) {
      return false
    }

    await this.cancelOpenOrders(command, positionOrders)

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

    const hedgeMode = this.configService.getHedgeMode() === 'yes' ? 'true' : 'false'

    await this.client
      .setPositionMode({ dualSidePosition: hedgeMode })
      .catch((error) => {
        const isAlreadyHedgeMode =
          error.message === 'No need to change position side.'
        if (!isAlreadyHedgeMode) {
          process.exit()
        }
      })

    return true
  }

  async getDecimalsInfo(symbol: string) {
    const exchangeInfo = await this.client.getExchangeInfo()
    const { pricePrecision, quantityPrecision } = exchangeInfo.symbols.find(
      (symbolInfo) => symbolInfo.symbol === symbol
    )
    return { pricePrecision, quantityPrecision }
  }

  async calculateQuantity(command: TradeCommand, quantityPrecision: number) {
    const { symbol, amountUSD } = command
    const leverage = this.configService.getLeverage()

    const { markPrice } = await this.client.getMarkPrice({
      symbol,
      isIsolated: 'TRUE',
    })

    const currentPrice = Number(markPrice)

    const quantity = Number((amountUSD / currentPrice) * leverage).toFixed(
      quantityPrecision
    )

    return Number(quantity)
  }

  async long(command: TradeCommand, pricePrecision: number, quantity: number) {
    const { symbol, setTp, setSl } = command

    await this.client.submitNewOrder({
      symbol,
      quantity,
      side: 'BUY',
      positionSide: 'LONG',
      type: 'MARKET',
    })

    console.log('long position opened')

    if (!setTp && !setSl) {
      return
    }

    await wait(2)

    const { takeProfit, stopLoss } = await this.calculateTpSl(
      symbol,
      'LONG',
      pricePrecision
    )

    if (setTp) {
      await this.client.submitNewOrder({
        symbol,
        side: 'SELL',
        positionSide: 'LONG',
        type: 'TAKE_PROFIT_MARKET' as any,
        stopPrice: takeProfit,
        closePosition: 'true',
        timeInForce: 'GTC',
        workingType: 'MARK_PRICE',
        priceProtect: 'TRUE',
      })
      console.log(`set take profit: ${takeProfit}`)
    }

    if (setSl) {
      await this.client.submitNewOrder({
        symbol,
        side: 'SELL',
        positionSide: 'LONG',
        type: 'STOP_MARKET' as any,
        stopPrice: stopLoss,
        closePosition: 'true',
        timeInForce: 'GTC',
        workingType: 'MARK_PRICE',
        priceProtect: 'TRUE',
      })
      console.log(`set stop loss: ${stopLoss}`)
    }
  }

  async short(command: TradeCommand, pricePrecision: number, quantity: number) {
    const { symbol, setTp, setSl } = command

    await this.client.submitNewOrder({
      symbol,
      quantity: quantity,
      side: 'SELL',
      positionSide: 'SHORT',
      type: 'MARKET',
    })

    console.log('short position opened')

    if (!setTp && !setSl) {
      return
    }

    await wait(2)

    const { takeProfit, stopLoss } = await this.calculateTpSl(
      symbol,
      'SHORT',
      pricePrecision
    )

    if (setTp) {
      await this.client.submitNewOrder({
        symbol,
        side: 'BUY',
        positionSide: 'SHORT',
        type: 'TAKE_PROFIT_MARKET' as any,
        stopPrice: takeProfit,
        closePosition: 'true',
        timeInForce: 'GTC',
        workingType: 'MARK_PRICE',
        priceProtect: 'TRUE',
      })
      console.log(`set take profit: ${takeProfit}`)
    }

    if (setSl) {
      await this.client.submitNewOrder({
        symbol,
        side: 'BUY',
        positionSide: 'SHORT',
        type: 'STOP_MARKET' as any,
        stopPrice: stopLoss,
        closePosition: 'true',
        timeInForce: 'GTC',
        workingType: 'MARK_PRICE',
        priceProtect: 'TRUE',
      })
      console.log(`set stop loss: ${stopLoss}`)
    }
  }

  private async calculateTpSl(
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

  private async getPositionOrders(command: TradeCommand) {
    const { symbol, side } = command

    const openOrders = await this.client.getAllOpenOrders({ symbol })
    const positionOrders = openOrders.filter(
      (order) => order.positionSide == side
    )

    return positionOrders
  }

  private async cancelOpenOrders(
    command: TradeCommand,
    positionOrders: OrderResult[]
  ) {
    const { symbol } = command

    for (const order of positionOrders) {
      await this.client.cancelOrder({ symbol, orderId: order.orderId })
    }
  }
}
