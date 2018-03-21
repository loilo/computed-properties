import { PlainObject } from './data-structures'

/**
 * Checks if value is a plain object
 */
export function isPlainObject (value: any): value is PlainObject {
  return typeof value === 'object' && value !== null && value.prototype == null
}

/**
 * Checks if value is an observable object or array
 */
export function isObservable (value) {
  return !!((Array.isArray(value) || (typeof value === 'object' && value !== null && !value.prototype)) && value.$destroy)
}

/**
 * Use this instead of Object.assign() for compatibility
 */
export function extend (...objects: PlainObject[]) {
  if (objects.length === 0) throw new TypeError('Cannot convert undefined or null to object')

  // @ts-ignore: Empty `objects` is not possible
  if ('assign' in Object) return Object.assign(...objects)

  if (objects.length === 1) return objects[0]

  for (let key in objects[1]) {
    objects[0][key] = objects[1][key]
  }

  return extend(objects[0], ...objects.slice(2))
}
