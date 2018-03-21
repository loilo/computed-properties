'use strict';

/**
 * Minimal implementation of an observable array
 */
function ObservableArray(callback, ...source) {
    let silent = true;
    const items = [];
    const notify = () => {
        if (!silent)
            callback();
    };
    const reactifyItem = item => reactify(callback, item);
    // Execute the original method
    const x = (method, ...args) => Array.prototype[method].call(items, ...args);
    Object.defineProperty(items, 'push', {
        value: function push(...newItems) {
            const result = x('push', ...newItems.map(reactifyItem));
            if (newItems.length)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'pop', {
        value: function pop() {
            const affected = items.length;
            const result = x('pop');
            if (affected)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'shift', {
        value: function shift() {
            const affected = items.length;
            const result = x('shift');
            if (affected)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'unshift', {
        value: function unshift(...newItems) {
            const result = x('unshift', ...newItems.map(reactifyItem));
            if (newItems.length)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'splice', {
        value: function splice(start, deleteCount, ...newItems) {
            const result = x('splice', start, deleteCount, ...newItems.map(reactifyItem));
            if (result.length || newItems.length)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'sort', {
        value: function sort(sorter) {
            const result = x('sort', sorter);
            notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'reverse', {
        value: function reverse() {
            const result = x('reverse');
            notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, '$raw', {
        value() {
            return items.slice(0);
        },
        enumerable: false
    });
    Object.defineProperty(items, '$set', {
        value: function $set(index, value) {
            items[index] = reactifyItem(value);
            notify();
        },
        enumerable: false
    });
    Object.defineProperty(items, '$destroy', {
        value: function $destroy() {
            silent = true;
            return items.map(unreactify);
        },
        enumerable: false
    });
    // Initially add items
    items.push(...source);
    // Cancel silence
    silent = false;
    return items;
}

/**
 * Checks if value is a plain object
 */
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && value.prototype == null;
}
/**
 * Checks if value is an observable object or array
 */
function isObservable(value) {
    return !!((Array.isArray(value) || (typeof value === 'object' && value !== null && !value.prototype)) && value.$destroy);
}
/**
 * Use this instead of Object.assign() for compatibility
 */
function extend(...objects) {
    if (objects.length === 0)
        throw new TypeError('Cannot convert undefined or null to object');
    // @ts-ignore: Empty `objects` is not possible
    if ('assign' in Object)
        return Object.assign(...objects);
    if (objects.length === 1)
        return objects[0];
    for (let key in objects[1]) {
        objects[0][key] = objects[1][key];
    }
    return extend(objects[0], ...objects.slice(2));
}

/**
 * Minimal implementation of an observable object
 */
function ObservableObject(callback, source) {
    const iface = Object.create(null);
    let silent = true;
    const props = [];
    const notify = () => {
        if (!silent)
            callback();
    };
    function init() {
        for (const key of Object.keys(source)) {
            defineProperty(key, source[key]);
        }
    }
    function rawObject() {
        return Object.getOwnPropertyNames(iface)
            .filter(key => key[0] !== '$')
            .reduce((carry, key) => extend(Object.create(null), carry, { [key]: raw(iface[key]) }), Object.create(null));
    }
    function defineProperty(prop, value) {
        if (props.indexOf(prop) !== -1) {
            throw new Error(`Property ${prop} is already defined`);
        }
        let currentValue = value;
        Object.defineProperty(iface, prop, {
            get() {
                return currentValue;
            },
            set(newValue) {
                const affected = newValue !== currentValue;
                currentValue = reactify(callback, newValue);
                if (affected)
                    notify();
            },
            enumerable: true,
            configurable: true
        });
        props.push(prop);
        notify();
    }
    Object.defineProperty(iface, '$set', {
        value(prop, value) {
            defineProperty(prop, value);
        },
        enumerable: false
    });
    Object.defineProperty(iface, '$raw', {
        value() {
            return rawObject();
        },
        enumerable: false
    });
    Object.defineProperty(iface, '$destroy', {
        value() {
            silent = true;
            return rawObject();
        },
        enumerable: false
    });
    init();
    silent = false;
    return iface;
}

function reactify(callback, value) {
    if (isObservable(value)) {
        return value;
    }
    else if (Array.isArray(value)) {
        const copy = value.slice(0);
        for (let i = 0; i < copy.length; i++) {
            copy[i] = reactify(callback, copy[i]);
        }
        const observable = ObservableArray(callback, ...copy);
        return observable;
    }
    else if (isPlainObject(value)) {
        const copy = extend({}, value);
        for (const key in copy) {
            copy[key] = reactify(callback, copy[key]);
        }
        const observable = ObservableObject(callback, copy);
        return observable;
    }
    else {
        return value;
    }
}
function raw(value) {
    return isObservable(value) ? value.$raw() : value;
}
function unreactify(value) {
    return isObservable(value) ? value.$destroy() : value;
}

function Store(data, { verbose = false } = {}) {
    const watchers = Object.create(null);
    // Intermediate tracking data
    let isCurrentlyTrackingPropAccess = false;
    let currentlyTrackedProp = null;
    let trackedAccessCache = Object.create(null);
    // Per-prop dependency cache
    const propDependencyCache = Object.create(null);
    // Value cache for computed properties
    const computedPropCache = {};
    const outdatedComputedPropCache = {};
    // The returned object
    const reactive = Object.create(null);
    // All (static and computed) properties defined in the store
    const allProps = Object.keys(data);
    const computedProps = [];
    /**
     * Sets up the Store
     */
    function init() {
        // Assign all props
        for (const prop of allProps) {
            propDependencyCache[prop] = Object.create(null);
            // Computed
            if (typeof data[prop] === 'function') {
                assignComputedProp(prop);
                computedProps.push(prop);
                // Data
            }
            else {
                assignStaticProp(prop);
            }
        }
        /**
         * Gets the raw values of the Store
         *
         * @param {Boolean} includeComputed If cached values of computed properties should be included
         */
        function rawObject(includeComputed) {
            return Object.getOwnPropertyNames(reactive)
                .filter(key => key[0] !== '$' && (includeComputed || computedProps.indexOf(key) === -1))
                .reduce((carry, key) => extend(Object.create(null), carry, { [key]: raw(reactive[key]) }), Object.create(null));
        }
        // Define the $raw method
        Object.defineProperty(reactive, '$raw', {
            value(includeComputed = true) {
                return rawObject(includeComputed);
            },
            enumerable: false
        });
        // Define the $watch method
        Object.defineProperty(reactive, '$watch', {
            value(prop, listener) {
                if (!(prop in watchers)) {
                    watchers[prop] = [];
                    // tslint:disable-next-line
                    reactive[prop];
                }
                watchers[prop].push(listener);
                return () => {
                    watchers[prop].splice(watchers[prop].indexOf(listener), 1);
                    if (!watchers[prop].length) {
                        delete watchers[prop];
                    }
                };
            },
            enumerable: false
        });
        // Offer an iterator
        if (Symbol) {
            reactive[Symbol.iterator] = function* () {
                for (let i = 0; i < allProps.length; i++) {
                    yield allProps[i];
                }
            };
        }
        return reactive;
    }
    /**
     * Invalidate the cache for a certain property and all its dependencies.
     *
     * @param {String} prop The property to invalidate
     */
    function invalidateCache(prop) {
        if (verbose)
            console.log('  invalidate cache of property', prop);
        if (computedPropCache.hasOwnProperty(prop)) {
            // Write invalidated value to outdated cache for access by watchers
            outdatedComputedPropCache[prop] = computedPropCache[prop];
            delete computedPropCache[prop];
        }
        // Force re-evaluation if watcher is present
        if (watchers[prop]) {
            // tslint:disable-next-line
            reactive[prop];
        }
        // Recursively invalidate cache of dependencies
        for (const dependant of Object.keys(propDependencyCache[prop]))
            invalidateCache(dependant);
    }
    /**
     * Assign a non-reactive property
     *
     * @param {String} prop The property to assign
     */
    function assignStaticProp(prop) {
        let currentValue = reactify(() => invalidateCache(prop), data[prop]);
        Object.defineProperty(reactive, prop, {
            get() {
                if (verbose)
                    console.log('Accessed property', prop, '=', currentValue);
                if (isCurrentlyTrackingPropAccess) {
                    if (verbose)
                        console.log('  through tracking of computed property', currentlyTrackedProp);
                    trackedAccessCache[currentlyTrackedProp][prop] = true;
                }
                return currentValue;
            },
            set(value) {
                if (value === currentValue)
                    return;
                const oldValue = currentValue;
                currentValue = reactify(() => invalidateCache(prop), value);
                // Invalidate dependant properties' cache
                if (verbose)
                    console.log('Set value of property', prop, '=', currentValue);
                if (verbose)
                    console.log('  dependencies to notify:', Object.keys(propDependencyCache[prop]));
                for (const dependency of Object.keys(propDependencyCache[prop])) {
                    invalidateCache(dependency);
                }
                // Notify watchers
                if (watchers[prop])
                    watchers[prop].forEach(watcher => watcher(currentValue, oldValue));
            }
        });
    }
    /**
     * Re-evaluates a computed property
     *
     * @param {String} prop The property to re-evaluate
     */
    function reevaluateComputedProp(prop) {
        // Check current tracking state
        const wasAlreadyTracking = isCurrentlyTrackingPropAccess;
        const previouslyTrackedProp = currentlyTrackedProp;
        // Set new tracking state
        isCurrentlyTrackingPropAccess = true;
        currentlyTrackedProp = prop;
        // Track access
        trackedAccessCache[prop] = Object.create(null);
        const value = data[prop].call(reactive, reactive);
        const dependencies = Object.keys(trackedAccessCache[prop] || Object.create(null));
        delete trackedAccessCache[prop];
        // Revert tracking state
        if (!wasAlreadyTracking) {
            isCurrentlyTrackingPropAccess = false;
        }
        else {
            currentlyTrackedProp = previouslyTrackedProp;
        }
        return { dependencies, value };
    }
    /**
     * Assign a computed property
     *
     * @param {String} prop The computed property to assign
     */
    function assignComputedProp(prop) {
        let computedPropDependencies = [];
        Object.defineProperty(reactive, prop, {
            get() {
                if (verbose)
                    console.log('Accessed computed property', prop);
                // Mark property as accessed if tracking
                if (isCurrentlyTrackingPropAccess) {
                    if (verbose)
                        console.log('  through tracking of computed property', currentlyTrackedProp);
                    trackedAccessCache[currentlyTrackedProp][prop] = true;
                }
                // Return cached value if present
                if (computedPropCache.hasOwnProperty(prop)) {
                    if (verbose)
                        console.log('  got it from cache');
                    return computedPropCache[prop];
                }
                // Check if there's an old value stored
                const hasOutdatedValue = outdatedComputedPropCache.hasOwnProperty(prop);
                if (verbose) {
                    console.log(hasOutdatedValue
                        ? '  it had already been changed'
                        : '  it has never been changed before');
                }
                // Re-evaluate computed property
                const result = reevaluateComputedProp(prop);
                const newDependencies = result.dependencies;
                const oldDependencies = computedPropDependencies;
                // Remove no longer needed dependencies
                for (const obsoleteDependency of oldDependencies) {
                    delete propDependencyCache[obsoleteDependency][prop];
                }
                // Add computed property's new dependencies
                for (const newDependency of newDependencies) {
                    propDependencyCache[newDependency][prop] = true;
                }
                computedPropDependencies = result.dependencies;
                if (verbose)
                    console.log('  re-evaluated the computed property');
                if (verbose)
                    console.log('    dependencies:', computedPropDependencies);
                if (verbose)
                    console.log('    new value:', result.value);
                // Cache new value
                computedPropCache[prop] = result.value;
                // Trigger watcher
                if (hasOutdatedValue && outdatedComputedPropCache[prop] !== result.value && watchers[prop]) {
                    watchers[prop].forEach(watcher => watcher(result.value, outdatedComputedPropCache[prop]));
                }
                // Purge outdated cache
                if (hasOutdatedValue) {
                    delete outdatedComputedPropCache[prop];
                }
                return result.value;
            }
        });
    }
    return init();
}

module.exports = Store;
