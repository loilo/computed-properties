import { reactify, raw } from './reaction'
import { extend } from './helpers'
import { FlatValue, FlatObject } from './data-structures'

// Using the global Reflect actually is a hack to prevent TypeScript from
// removing raw property access
const accessProp = Reflect
  ? Reflect.get
  : ((object: any, prop: string) => object[prop])

export type ReactiveValue = string | number | boolean | ReactiveObject | ReactiveArray | Function

export interface ReactiveInstance {
  $raw (): any
  $set (...args: any[]): void
  $destroy (): any
}

export interface ReactiveObject extends ReactiveInstance {
  [prop: string]: ReactiveValue

  $raw (): Array<ReactiveValue>
  $set (prop: string, value: FlatValue): void
  $destroy (): FlatObject
}

export interface ReactiveArray extends Array<ReactiveValue>, ReactiveInstance {
  $raw (): Array<ReactiveValue>
  $set (index: number, value: FlatValue): void
  $destroy (): Array<FlatValue>
}

export type StaticProp = FlatValue
export type ReactiveProp = () => any

export interface StoreData {
  [prop: string]: StaticProp | ReactiveProp
}

type Store<U = any> = {
  [T in keyof U]: U[T]
} & {
  $raw (): U
  $watch<T extends keyof U> (prop: T, callback: (now?: U[T], previous?: U[T]) => void): () => void
}

function Store<T> (data: { [U in keyof T]: T[U] | ((this: T) => T[U]) }, { verbose = false } = {}): Store<T> {
  const watchers = Object.create(null)

  // Intermediate tracking data
  let isCurrentlyTrackingPropAccess = false
  let currentlyTrackedProp = null
  let trackedAccessCache = Object.create(null)

  // Per-prop dependency cache
  const propDependencyCache = Object.create(null)

  // Value cache for computed properties
  const computedPropCache = {}
  const outdatedComputedPropCache = {}

  // The returned object
  const reactive = Object.create(null)

  // All (static and computed) properties defined in the store
  const allProps = Object.keys(data)
  const computedProps = []

  /**
   * Sets up the Store
   */
  function init () {
    // Assign all props
    for (const prop of allProps) {
      propDependencyCache[prop] = Object.create(null)

      // Computed
      if (typeof data[prop] === 'function') {
        assignComputedProp(prop)
        computedProps.push(prop)

      // Data
      } else {
        assignStaticProp(prop)
      }
    }

    /**
     * Gets the raw values of the Store
     *
     * @param {Boolean} includeComputed If cached values of computed properties should be included
     */
    function rawObject (includeComputed) {
      return Object.getOwnPropertyNames(reactive)
        .filter(key => key[0] !== '$' && (includeComputed || computedProps.indexOf(key) === -1))
        .reduce((carry, key) =>
          extend(Object.create(null), carry, { [key]: raw(reactive[key]) })
        , Object.create(null))
    }

    // Define the $raw method
    Object.defineProperty(reactive, '$raw', {
      value (includeComputed = true) {
        return rawObject(includeComputed)
      },
      enumerable: false
    })

    // Define the $watch method
    Object.defineProperty(reactive, '$watch', {
      value (prop, listener) {
        if (!(prop in watchers)) {
          watchers[prop] = []
          accessProp(reactive, prop)
        }

        watchers[prop].push(listener)

        return () => {
          watchers[prop].splice(watchers[prop].indexOf(listener), 1)

          if (!watchers[prop].length) {
            delete watchers[prop]
          }
        }
      },
      enumerable: false
    })

    return reactive
  }

  /**
   * Invalidate the cache for a certain property and all its dependencies.
   *
   * @param {String} prop The property to invalidate
   */
  function invalidateCache (prop) {
    if (verbose) console.log('  invalidate cache of property', prop)

    if (computedPropCache.hasOwnProperty(prop)) {
      // Write invalidated value to outdated cache for access by watchers
      outdatedComputedPropCache[prop] = computedPropCache[prop]
      delete computedPropCache[prop]
    }

    // Force re-evaluation if watcher is present
    if (watchers[prop]) {
      accessProp(reactive, prop)
    }

    // Recursively invalidate cache of dependencies
    for (const dependant of Object.keys(propDependencyCache[prop])) invalidateCache(dependant)
  }

  /**
   * Assign a non-reactive property
   *
   * @param {String} prop The property to assign
   */
  function assignStaticProp (prop) {
    if (verbose) console.log('Define static property', prop)

    let currentValue = reactify(() => invalidateCache(prop), data[prop])

    Object.defineProperty(reactive, prop, {
      get () {
        if (verbose) console.log('Accessed property', prop, '=', currentValue)

        if (isCurrentlyTrackingPropAccess) {
          if (verbose) console.log('  through tracking of computed property', currentlyTrackedProp)

          trackedAccessCache[currentlyTrackedProp][prop] = true
        }
        return currentValue
      },

      set (value) {
        if (value === currentValue) return

        const oldValue = currentValue
        currentValue = reactify(() => invalidateCache(prop), value)

        // Invalidate dependant properties' cache
        if (verbose) console.log('Set value of property', prop, '=', currentValue)
        if (verbose) console.log('  dependencies to notify:', Object.keys(propDependencyCache[prop]))

        for (const dependency of Object.keys(propDependencyCache[prop])) {
          invalidateCache(dependency)
        }

        // Notify watchers
        if (watchers[prop]) watchers[prop].forEach(watcher => watcher(currentValue, oldValue))
      }
    })
  }

  /**
   * Re-evaluates a computed property
   *
   * @param {String} prop The property to re-evaluate
   */
  function reevaluateComputedProp (prop) {
    // Check current tracking state
    const wasAlreadyTracking = isCurrentlyTrackingPropAccess
    const previouslyTrackedProp = currentlyTrackedProp

    // Set new tracking state
    isCurrentlyTrackingPropAccess = true
    currentlyTrackedProp = prop

    // Track access
    trackedAccessCache[prop] = Object.create(null)
    const value = (data[prop] as ReactiveProp).call(reactive, reactive)
    const dependencies = Object.keys(trackedAccessCache[prop] || Object.create(null))
    delete trackedAccessCache[prop]

    // Revert tracking state
    if (!wasAlreadyTracking) {
      isCurrentlyTrackingPropAccess = false
    } else {
      currentlyTrackedProp = previouslyTrackedProp
    }

    return { dependencies, value }
  }

  /**
   * Assign a computed property
   *
   * @param {String} prop The computed property to assign
   */
  function assignComputedProp (prop) {
    if (verbose) console.log('Define computed property', prop)

    let computedPropDependencies = []
    Object.defineProperty(reactive, prop, {
      get () {
        if (verbose) console.log('Accessed computed property', prop)

        // Mark property as accessed if tracking
        if (isCurrentlyTrackingPropAccess) {
          if (verbose) console.log('  through tracking of computed property', currentlyTrackedProp)
          trackedAccessCache[currentlyTrackedProp][prop] = true
        }

        // Return cached value if present
        if (computedPropCache.hasOwnProperty(prop)) {
          if (verbose) console.log('  got it from cache')
          return computedPropCache[prop]
        }

        // Check if there's an old value stored
        const hasOutdatedValue = outdatedComputedPropCache.hasOwnProperty(prop)
        if (verbose) {
          console.log(hasOutdatedValue
            ? '  it had already been changed'
            : '  it has never been changed before')
        }

        // Re-evaluate computed property
        const result = reevaluateComputedProp(prop)

        const newDependencies = result.dependencies
        const oldDependencies = computedPropDependencies

        // Remove no longer needed dependencies
        for (const obsoleteDependency of oldDependencies) {
          delete propDependencyCache[obsoleteDependency][prop]
        }

        // Add computed property's new dependencies
        for (const newDependency of newDependencies) {
          propDependencyCache[newDependency][prop] = true
        }

        computedPropDependencies = result.dependencies

        if (verbose) console.log('  re-evaluated the computed property')
        if (verbose) console.log('    dependencies:', computedPropDependencies)
        if (verbose) console.log('    new value:', result.value)

        // Cache new value
        computedPropCache[prop] = result.value

        // Trigger watcher
        if (hasOutdatedValue && outdatedComputedPropCache[prop] !== result.value && watchers[prop]) {
          watchers[prop].forEach(watcher => watcher(result.value, outdatedComputedPropCache[prop]))
        }

        // Purge outdated cache
        if (hasOutdatedValue) {
          delete outdatedComputedPropCache[prop]
        }

        return result.value
      }
    })
  }

  return init()
}

export default Store
