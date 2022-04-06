import { FuturesService } from './futures.service'
import { FuturesShortService } from './futures.short.service'
import { FuturesLongService } from './futures.long.service'
import { Command } from '../models/command'

export class TradingviewBinanceManager {
  constructor(
    private futuresService: FuturesService,
    private futuresLongService: FuturesLongService,
    private futuresShortService: FuturesShortService
  ) {}

  async execute(command: Command) {
    await this.futuresService.setupTrade(command)

    const { quantityPrecision, pricePrecision } =
      await this.futuresService.getDecimalsInfo(command.symbol)

    const quantity = await this.futuresService.calculateQuantity(
      command,
      quantityPrecision
    )

    switch (command.side) {
      case 'LONG': {
        return this.futuresLongService.execute(command, pricePrecision, quantity)
      }
      case 'SHORT': {
        return this.futuresShortService.execute(command, pricePrecision, quantity)
      }
    }
  }
}
