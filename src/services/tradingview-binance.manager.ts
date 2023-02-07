import { FuturesService } from './futures.service'
import { DCACommand, SellDCACommand, TradeCommand } from '../models/command'
import { SpotService } from './spot.service'
import { ConfigService } from './config.service'
import { wait } from '../libs/wait'

export class TradingviewBinanceManager {
  constructor(
    private futuresService: FuturesService,
    private spotService: SpotService,
    private configService: ConfigService
  ) {}

  async trade(command: TradeCommand) {
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

  async dca(command: DCACommand) {
    const { amountUSD } = command
    const pairs = this.configService.getDCAPairs()
    for (const pair of pairs) {
      try {
        await this.spotService.buy(pair, amountUSD)
        console.log(`dca ${pair} amount ${amountUSD}`)
      } catch (e) {
        console.error('failed to dca', pair, e)
      } finally {
        await wait(1)
      }
    }
  }

  async sellDCA(command: SellDCACommand) {
    const { percent } = command
    const pairs = this.configService.getDCAPairs()

    const balances = await this.spotService.getMyBalances()
    const symbolAmountDict = balances.reduce((dict, balance) => {
      dict[`${balance.coin}`] = Number(balance.free)
      return dict
    }, {} as Record<string, number>)

    const pricesDict = await this.spotService.getPricesDict()
    for (const pair of pairs) {
      try {
        const currentPrice = pricesDict[pair]
        const currentAmount =
          symbolAmountDict[pair.replace('USDT', '').replace('BUSD', '')]
        if (!currentPrice || !currentAmount) {
          console.log('skipped', pair)
          continue
        }

        const amountUSD = Math.ceil(
          (currentPrice * currentAmount * percent) / 100
        )
        console.log(amountUSD)

        await this.spotService.sell(pair, amountUSD)
        console.log(`dca sell ${pair} amount ${amountUSD}`)
      } catch (e) {
        console.error('failed to dca sell', pair, e)
      } finally {
        await wait(1)
      }
    }
  }
}
