import { PositionSide } from 'binance'

export enum TradingType {
  Trade = 'trade',
  DCA = 'dca',
  SellDCA = 'sell_dca',
}

export type Command = TradeCommand | DCACommand | SellDCACommand

export interface TradeCommand {
  symbol: string
  side: PositionSide
  amountUSD: number
  setTp: boolean
  setSl: boolean
  onlyOneOrder: boolean
  type: TradingType.Trade
}

export interface DCACommand {
  amount: number
  type: TradingType.DCA
}

export interface SellDCACommand {
  percent: number
  type: TradingType.SellDCA
}
