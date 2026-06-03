export interface Item {
  id: string
  name: string
  iconType: string
  quantity: number
  description: string
}

export interface Inventory {
  gold: number
  items: Item[]
}
