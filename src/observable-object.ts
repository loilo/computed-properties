import { reactify, raw } from './reaction'
import { extend } from './helpers'

/**
 * Minimal implementation of an observable object
 */
export default function ObservableObject (callback, source) {
  const iface = Object.create(null)

  let silent = true

  const props = []

  const notify = () => {
    if (!silent) callback()
  }

  function init () {
    for (const key of Object.keys(source)) {
      defineProperty(key, source[key])
    }
  }

  function rawObject () {
    return Object.getOwnPropertyNames(iface)
      .filter(key => key[0] !== '$')
      .reduce((carry, key) =>
        extend(Object.create(null), carry, { [key]: raw(iface[key]) })
      , Object.create(null))
  }

  function defineProperty (prop, value) {
    if (props.indexOf(prop) !== -1) {
      throw new Error(`Property ${prop} is already defined`)
    }

    let currentValue = value
    Object.defineProperty(iface, prop, {
      get () {
        return currentValue
      },
      set (newValue) {
        const affected = newValue !== currentValue
        currentValue = reactify(callback, newValue)
        if (affected) notify()
      },
      enumerable: true,
      configurable: true
    })

    props.push(prop)

    notify()
  }

  Object.defineProperty(iface, '$set', {
    value (prop, value) {
      defineProperty(prop, value)
    },
    enumerable: false
  })

  Object.defineProperty(iface, '$raw', {
    value () {
      return rawObject()
    },
    enumerable: false
  })

  Object.defineProperty(iface, '$destroy', {
    value () {
      silent = true
      return rawObject()
    },
    enumerable: false
  })

  init()

  silent = false

  return iface
}
