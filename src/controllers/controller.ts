import { Express } from 'express'
import { ConfigService } from '../services/config.service'
import { parseRawCommand } from '../libs/parseRawCommand'
import { TradingviewBinanceManager } from '../services/tradingview-binance.manager'
import { wait } from '../libs/wait'

export class Controller {
  private commandsInProgressDict: Record<string, boolean> = {}

  constructor(
    private app: Express,
    private configService: ConfigService,
    private tradingviewBinanceManager: TradingviewBinanceManager
  ) {
    this.init()
  }

  init() {
    this.app.post('/tradingview/:token', async (req, res) => {
      const { token } = req.params
      if (token !== this.configService.getToken()) {
        throw new Error('Token is invalid')
      }

      const rawCommand = req.body

      console.log(`raw command ${rawCommand}`)

      try {
        if (this.commandsInProgressDict[rawCommand]) {
          console.log('Command is in progress')
          return
        }

        this.commandsInProgressDict[rawCommand] = true
        const command = parseRawCommand(rawCommand)

        console.log(command)

        await this.tradingviewBinanceManager.execute(command)

        res.sendStatus(200)

        await wait(2)
      } finally {
        this.commandsInProgressDict[rawCommand] = false
      }
    })
  }
}
