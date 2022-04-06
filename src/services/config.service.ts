import dotenv from 'dotenv'
dotenv.config()

export class ConfigService {
  getBinanceConfig() {
    return {
      key: process.env['BINANCE_API_KEY'],
      secret: process.env['BINANCE_API_SECRET'],
    }
  }

  getLeverage() {
    return Number(process.env['LEVERAGE'])
  }

  getTpPercentage() {
    return Number(process.env['TAKE_PROFIT_PERCENTAGE'])
  }

  getSlPercentage() {
    return Number(process.env['STOP_LOSS_PERCENTAGE'])
  }

  getPort() {
    return Number(process.env['PORT'])
  }

  getToken() {
    return process.env['TOKEN']
  }
}
