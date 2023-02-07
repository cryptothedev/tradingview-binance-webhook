import { FuturesService } from './futures.service'
import { TradeCommand } from '../models/command'

export class TradingviewBinanceManager {
  constructor(private futuresService: FuturesService) {}

  async execute(command: TradeCommand) {
    const okToOpenPosition = await this.futuresService.setupTrade(command)
    if (!okToOpenPosition) {
      console.log('skipping')
      return
    }

    const { quantityPrecision, pricePrecision } =
      await this.futuresService.getDecimalsInfo(command.symbol)

    const quantity = await this.futuresService.calculateQuantity(
      command,
      quantityPrecision
    )

    switch (command.side) {
      case 'LONG': {
        return this.futuresService.long(command, pricePrecision, quantity)
      }
      case 'SHORT': {
        return this.futuresService.short(command, pricePrecision, quantity)
      }
    }
  }
}
