import { PositionSide } from 'binance'

export interface Command {
  symbol: string
  side: PositionSide
  amountUSD: number
  setTp: boolean
  setSl: boolean
  onlyOneOrder: boolean
}
