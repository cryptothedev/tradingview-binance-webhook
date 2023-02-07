import {
  Command,
  DCACommand,
  SellDCACommand,
  TradeCommand,
  TradingType,
} from '../models/command'
import { PositionSide } from 'binance'

export function parseRawCommand(rawCommand: string): Command {
  const lowerCaseRawCommand = rawCommand.toLowerCase()

  // spot - dca
  const isDCA = rawCommand.startsWith('dca')
  if (isDCA) {
    const [_, sell, amount] = lowerCaseRawCommand.split('_')

    // sell - amount is percentage (0 - 100)
    if (sell === 'sell') {
      return {
        percent: Number(amount),
        type: TradingType.SellDCA,
      } as SellDCACommand
    }

    // buy - amount is USD
    return {
      amountUSD: Number(amount),
      type: TradingType.DCA,
    } as DCACommand
  }

  // futures
  const [symbol, side, amountUSD, setTp, setSl, onlyOneOrder] =
    lowerCaseRawCommand.split('_')

  return {
    symbol,
    side: side.toUpperCase() as PositionSide,
    amountUSD: Number(amountUSD),
    setTp: setTp === 'true',
    setSl: setSl === 'true',
    onlyOneOrder: onlyOneOrder === 'true',
    type: TradingType.Trade,
  } as TradeCommand
}
