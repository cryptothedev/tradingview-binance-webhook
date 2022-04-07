import express from 'express'
import { ConfigService } from './services/config.service'
import { Controller } from './controllers/controller'
import bodyParser from 'body-parser'
import { FuturesService } from './services/futures.service'
import { TradingviewBinanceManager } from './services/tradingview-binance.manager'

async function main() {
  const app = express()

  // middlewares
  app.use(bodyParser.text())

  // services
  const configService = new ConfigService()
  const futuresService = new FuturesService(configService)

  // managers
  const tradingviewBinanceManager = new TradingviewBinanceManager(
    futuresService
  )

  // controllers
  new Controller(app, configService, tradingviewBinanceManager)

  const port = configService.getPort()
  await app.listen(port)
  console.log('Server started on port:', port)
}

main()
