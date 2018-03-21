export type FlatValue = string | number | boolean | FlatObject | FlatArray

export interface FlatObject {
  [x: string]: FlatValue
}

export interface FlatArray extends Array<FlatValue> { }

export interface PlainObject<T = any> {
  [key: string]: T
}
