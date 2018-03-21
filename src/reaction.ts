import ObservableArray from './observable-array'
import ObservableObject from './observable-object'
import { isObservable, isPlainObject, extend } from './helpers'

export function reactify (callback, value) {
  if (isObservable(value)) {
    return value
  } else if (Array.isArray(value)) {
    const copy = value.slice(0)

    for (let i = 0; i < copy.length; i++) {
      copy[i] = reactify(callback, copy[i])
    }

    const observable = ObservableArray(callback, ...copy)

    return observable
  } else if (isPlainObject(value)) {
    const copy = extend({}, value)

    for (const key in copy) {
      copy[key] = reactify(callback, copy[key])
    }

    const observable = ObservableObject(callback, copy)

    return observable
  } else {
    return value
  }
}

export function raw (value) {
  return isObservable(value) ? value.$raw() : value
}

export function unreactify (value) {
  return isObservable(value) ? value.$destroy() : value
}
