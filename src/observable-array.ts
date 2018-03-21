import { reactify, unreactify } from './reaction'

/**
 * Minimal implementation of an observable array
 */
export default function ObservableArray (callback, ...source) {
  let silent = true
  const items = []
  const notify = () => {
    if (!silent) callback()
  }
  const reactifyItem = item => reactify(callback, item)

  // Execute the original method
  const x = (method, ...args) => Array.prototype[method].call(items, ...args)

  Object.defineProperty(items, 'push', {
    value: function push (...newItems) {
      const result = x('push', ...newItems.map(reactifyItem))
      if (newItems.length) notify()
      return result
    },
    enumerable: false
  })

  Object.defineProperty(items, 'pop', {
    value: function pop () {
      const affected = items.length
      const result = x('pop')
      if (affected) notify()
      return result
    },
    enumerable: false
  })

  Object.defineProperty(items, 'shift', {
    value: function shift () {
      const affected = items.length
      const result = x('shift')
      if (affected) notify()
      return result
    },
    enumerable: false
  })

  Object.defineProperty(items, 'unshift', {
    value: function unshift (...newItems) {
      const result = x('unshift', ...newItems.map(reactifyItem))
      if (newItems.length) notify()
      return result
    },
    enumerable: false
  })

  Object.defineProperty(items, 'splice', {
    value: function splice (start, deleteCount, ...newItems) {
      const result = x('splice', start, deleteCount, ...newItems.map(reactifyItem))
      if (result.length || newItems.length) notify()
      return result
    },
    enumerable: false
  })

  Object.defineProperty(items, 'sort', {
    value: function sort (sorter) {
      const result = x('sort', sorter)
      notify()
      return result
    },
    enumerable: false
  })

  Object.defineProperty(items, 'reverse', {
    value: function reverse () {
      const result = x('reverse')
      notify()
      return result
    },
    enumerable: false
  })

  Object.defineProperty(items, '$raw', {
    value () {
      return items.slice(0)
    },
    enumerable: false
  })

  Object.defineProperty(items, '$set', {
    value: function $set (index, value) {
      items[index] = reactifyItem(value)
      notify()
    },
    enumerable: false
  })

  Object.defineProperty(items, '$destroy', {
    value: function $destroy () {
      silent = true
      return items.map(unreactify)
    },
    enumerable: false
  })

  // Initially add items
  items.push(...source)

  // Cancel silence
  silent = false

  return items
}
