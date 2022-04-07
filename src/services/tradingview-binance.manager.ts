import { FuturesService } from './futures.service'
import { Command } from '../models/command'

export class TradingviewBinanceManager {
  constructor(private futuresService: FuturesService) {}

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
        return this.futuresService.long(command, pricePrecision, quantity)
      }
      case 'SHORT': {
        return this.futuresService.short(command, pricePrecision, quantity)
      }
    }
  }
}
