import { FuturesService } from './futures.service'
import { Command } from '../models/command'
import { USDMClient } from 'binance'
import { wait } from '../libs/wait'

export class FuturesLongService {
  private client: USDMClient

  constructor(private futuresService: FuturesService) {
    this.client = this.futuresService.getClient()
  }

  async execute(command: Command, pricePrecision: number, quantity: number) {
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

    const { takeProfit, stopLoss } = await this.futuresService.calculateTpSl(
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
}
