'use strict';

/**
 * Minimal implementation of an observable array
 */
function ObservableArray(callback) {
    var source = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        source[_i - 1] = arguments[_i];
    }
    var silent = true;
    var items = [];
    var notify = function () {
        if (!silent)
            callback();
    };
    var reactifyItem = function (item) { return reactify(callback, item); };
    // Execute the original method
    var x = function (method) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return (_a = Array.prototype[method]).call.apply(_a, [items].concat(args));
        var _a;
    };
    Object.defineProperty(items, 'push', {
        value: function push() {
            var newItems = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                newItems[_i] = arguments[_i];
            }
            var result = x.apply(void 0, ['push'].concat(newItems.map(reactifyItem)));
            if (newItems.length)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'pop', {
        value: function pop() {
            var affected = items.length;
            var result = x('pop');
            if (affected)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'shift', {
        value: function shift() {
            var affected = items.length;
            var result = x('shift');
            if (affected)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'unshift', {
        value: function unshift() {
            var newItems = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                newItems[_i] = arguments[_i];
            }
            var result = x.apply(void 0, ['unshift'].concat(newItems.map(reactifyItem)));
            if (newItems.length)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'splice', {
        value: function splice(start, deleteCount) {
            var newItems = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                newItems[_i - 2] = arguments[_i];
            }
            var result = x.apply(void 0, ['splice', start, deleteCount].concat(newItems.map(reactifyItem)));
            if (result.length || newItems.length)
                notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'sort', {
        value: function sort(sorter) {
            var result = x('sort', sorter);
            notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, 'reverse', {
        value: function reverse() {
            var result = x('reverse');
            notify();
            return result;
        },
        enumerable: false
    });
    Object.defineProperty(items, '$raw', {
        value: function () {
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
    items.push.apply(items, source);
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
function extend() {
    var objects = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        objects[_i] = arguments[_i];
    }
    if (objects.length === 0)
        throw new TypeError('Cannot convert undefined or null to object');
    // @ts-ignore: Empty `objects` is not possible
    if ('assign' in Object)
        return Object.assign.apply(Object, objects);
    if (objects.length === 1)
        return objects[0];
    for (var key in objects[1]) {
        objects[0][key] = objects[1][key];
    }
    return extend.apply(void 0, [objects[0]].concat(objects.slice(2)));
}

/**
 * Minimal implementation of an observable object
 */
function ObservableObject(callback, source) {
    var iface = Object.create(null);
    var silent = true;
    var props = [];
    var notify = function () {
        if (!silent)
            callback();
    };
    function init() {
        for (var _i = 0, _a = Object.keys(source); _i < _a.length; _i++) {
            var key = _a[_i];
            defineProperty(key, source[key]);
        }
    }
    function rawObject() {
        return Object.getOwnPropertyNames(iface)
            .filter(function (key) { return key[0] !== '$'; })
            .reduce(function (carry, key) {
            return extend(Object.create(null), carry, (_a = {}, _a[key] = raw(iface[key]), _a));
            var _a;
        }, Object.create(null));
    }
    function defineProperty(prop, value) {
        if (props.indexOf(prop) !== -1) {
            throw new Error("Property " + prop + " is already defined");
        }
        var currentValue = value;
        Object.defineProperty(iface, prop, {
            get: function () {
                return currentValue;
            },
            set: function (newValue) {
                var affected = newValue !== currentValue;
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
        value: function (prop, value) {
            defineProperty(prop, value);
        },
        enumerable: false
    });
    Object.defineProperty(iface, '$raw', {
        value: function () {
            return rawObject();
        },
        enumerable: false
    });
    Object.defineProperty(iface, '$destroy', {
        value: function () {
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
        var copy = value.slice(0);
        for (var i = 0; i < copy.length; i++) {
            copy[i] = reactify(callback, copy[i]);
        }
        var observable = ObservableArray.apply(void 0, [callback].concat(copy));
        return observable;
    }
    else if (isPlainObject(value)) {
        var copy = extend({}, value);
        for (var key in copy) {
            copy[key] = reactify(callback, copy[key]);
        }
        var observable = ObservableObject(callback, copy);
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

function Store(data, _a) {
    var _b = (_a === void 0 ? {} : _a).verbose, verbose = _b === void 0 ? false : _b;
    var watchers = Object.create(null);
    // Intermediate tracking data
    var isCurrentlyTrackingPropAccess = false;
    var currentlyTrackedProp = null;
    var trackedAccessCache = Object.create(null);
    // Per-prop dependency cache
    var propDependencyCache = Object.create(null);
    // Value cache for computed properties
    var computedPropCache = {};
    var outdatedComputedPropCache = {};
    // The returned object
    var reactive = Object.create(null);
    // All (static and computed) properties defined in the store
    var allProps = Object.keys(data);
    var computedProps = [];
    /**
     * Sets up the Store
     */
    function init() {
        // Assign all props
        for (var _i = 0, allProps_1 = allProps; _i < allProps_1.length; _i++) {
            var prop = allProps_1[_i];
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
                .filter(function (key) { return key[0] !== '$' && (includeComputed || computedProps.indexOf(key) === -1); })
                .reduce(function (carry, key) {
                return extend(Object.create(null), carry, (_a = {}, _a[key] = raw(reactive[key]), _a));
                var _a;
            }, Object.create(null));
        }
        // Define the $raw method
        Object.defineProperty(reactive, '$raw', {
            value: function (includeComputed) {
                if (includeComputed === void 0) { includeComputed = true; }
                return rawObject(includeComputed);
            },
            enumerable: false
        });
        // Define the $watch method
        Object.defineProperty(reactive, '$watch', {
            value: function (prop, listener) {
                if (!(prop in watchers)) {
                    watchers[prop] = [];
                    // tslint:disable-next-line
                    reactive[prop];
                }
                watchers[prop].push(listener);
                return function () {
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
            reactive[Symbol.iterator] = function () {
                var i;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            i = 0;
                            _a.label = 1;
                        case 1:
                            if (!(i < allProps.length)) return [3 /*break*/, 4];
                            return [4 /*yield*/, allProps[i]];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
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
        for (var _i = 0, _a = Object.keys(propDependencyCache[prop]); _i < _a.length; _i++) {
            var dependant = _a[_i];
            invalidateCache(dependant);
        }
    }
    /**
     * Assign a non-reactive property
     *
     * @param {String} prop The property to assign
     */
    function assignStaticProp(prop) {
        var currentValue = reactify(function () { return invalidateCache(prop); }, data[prop]);
        Object.defineProperty(reactive, prop, {
            get: function () {
                if (verbose)
                    console.log('Accessed property', prop, '=', currentValue);
                if (isCurrentlyTrackingPropAccess) {
                    if (verbose)
                        console.log('  through tracking of computed property', currentlyTrackedProp);
                    trackedAccessCache[currentlyTrackedProp][prop] = true;
                }
                return currentValue;
            },
            set: function (value) {
                if (value === currentValue)
                    return;
                var oldValue = currentValue;
                currentValue = reactify(function () { return invalidateCache(prop); }, value);
                // Invalidate dependant properties' cache
                if (verbose)
                    console.log('Set value of property', prop, '=', currentValue);
                if (verbose)
                    console.log('  dependencies to notify:', Object.keys(propDependencyCache[prop]));
                for (var _i = 0, _a = Object.keys(propDependencyCache[prop]); _i < _a.length; _i++) {
                    var dependency = _a[_i];
                    invalidateCache(dependency);
                }
                // Notify watchers
                if (watchers[prop])
                    watchers[prop].forEach(function (watcher) { return watcher(currentValue, oldValue); });
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
        var wasAlreadyTracking = isCurrentlyTrackingPropAccess;
        var previouslyTrackedProp = currentlyTrackedProp;
        // Set new tracking state
        isCurrentlyTrackingPropAccess = true;
        currentlyTrackedProp = prop;
        // Track access
        trackedAccessCache[prop] = Object.create(null);
        var value = data[prop].call(reactive, reactive);
        var dependencies = Object.keys(trackedAccessCache[prop] || Object.create(null));
        delete trackedAccessCache[prop];
        // Revert tracking state
        if (!wasAlreadyTracking) {
            isCurrentlyTrackingPropAccess = false;
        }
        else {
            currentlyTrackedProp = previouslyTrackedProp;
        }
        return { dependencies: dependencies, value: value };
    }
    /**
     * Assign a computed property
     *
     * @param {String} prop The computed property to assign
     */
    function assignComputedProp(prop) {
        var computedPropDependencies = [];
        Object.defineProperty(reactive, prop, {
            get: function () {
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
                var hasOutdatedValue = outdatedComputedPropCache.hasOwnProperty(prop);
                if (verbose) {
                    console.log(hasOutdatedValue
                        ? '  it had already been changed'
                        : '  it has never been changed before');
                }
                // Re-evaluate computed property
                var result = reevaluateComputedProp(prop);
                var newDependencies = result.dependencies;
                var oldDependencies = computedPropDependencies;
                // Remove no longer needed dependencies
                for (var _i = 0, oldDependencies_1 = oldDependencies; _i < oldDependencies_1.length; _i++) {
                    var obsoleteDependency = oldDependencies_1[_i];
                    delete propDependencyCache[obsoleteDependency][prop];
                }
                // Add computed property's new dependencies
                for (var _a = 0, newDependencies_1 = newDependencies; _a < newDependencies_1.length; _a++) {
                    var newDependency = newDependencies_1[_a];
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
                    watchers[prop].forEach(function (watcher) { return watcher(result.value, outdatedComputedPropCache[prop]); });
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
