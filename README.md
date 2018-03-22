# Computed Properties

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Travis](https://img.shields.io/travis/Loilo/computed-properties.svg)](https://travis-ci.org/Loilo/computed-properties)
[![npm](https://img.shields.io/npm/v/computed-properties.svg)](https://www.npmjs.com/package/computed-properties)

This package helps   deriving data from other data. It's especially well suited for computation-heavier dependencies since it caches and lazy-evaluates computed properties.

It conceptually borrows heavily from [Vue.js](https://vuejs.org)' computed properties, supports all evergreen browsers and IE 11 and features a reasonably small size (1.6 KB minified & gzipped).

## Installation
Install it from npm:

```bash
npm install --save computed-properties
```

### Include in the Browser
You can use this package in your browser with one of the following snippets:

* The most common version. Compiled to ES5, runs in all major browsers down to IE 11:

  ```html
  <script src="node_modules/computed-properties/dist/browser.min.js"></script>

  <!-- or from CDN: -->

  <script src="https://unpkg.com/computed-properties"></script>
  ```

* Not transpiled to ES5, runs in browsers that support ES2015:

  ```html
  <script src="node_modules/computed-properties/dist/browser.es2015.min.js"></script>

  <!-- or from CDN: -->

  <script src="https://unpkg.com/computed-properties/dist/browser.es2015.min.js"></script>
  ```

* If you're really living on the bleeding edge and use ES modules directly in the browser, you can `import` the package as well:

  ```javascript
  import Store from "./node_modules/computed-properties/dist/browser.module.min.js"

  // or from CDN:

  import Store from "https://unpkg.com/computed-properties/dist/browser.module.min.js"
  ```

  As opposed to the snippets above, this will not create a global `Store` function.

### Include in Node.js
Include this package in Node.js like you usually do:

```javascript
const Store = require('computed-properties')
```

If you need this to work in Node.js v4 or below, try this instead:

```javascript
var Store = require('computed-properties/dist/cjs.es5')
```

## Usage
Create a store by passing a configuration object to the `Store` function:

```javascript
const programmer = Store({
  firstName: 'Jane',
  lastName: 'Doe',
  hobbies: [ 'programming', 'reading' ],
  skills: {
    communication: 3,
    cleverness: 4
  },
  fullName () {
    return this.firstName + ' ' + this.lastName
  },
  bestAt () {
    return Object.entries(this.skills).sort(([,ratingA], [,ratingB]) => ratingB - ratingA)[0][0]
  },
  developerStory () {
    return `Hi, I'm ${this.fullName}.
I like ${this.hobbies.slice(0, -1).join(', ')}${this.hobbies.length > 1 ? ' and ' : ''}${this.hobbies[this.hobbies.length - 1]}.
I'm especially good with ${this.bestAt}.`
  }
})
```

> You can play with this example [on JS Bin](https://jsbin.com/pizigehadi/edit?js,console).

All functions in the configuration object (`fullName`, `bestAt` and `developerStory` in our case) will be treated as computed properties. You can get their values just like with any regular property:

```javascript
programmer.fullName // "Jane Doe"
```

Now if we adjust the first name of our programmer, the `fullName` will also be updated:

```javascript
programmer.firstName = 'John'
programmer.fullName // "John Doe"
```

## Context-free Computed Properties
If you don't like the style of computed properties accessing the `this` object, they also get passed the store as their first parameter.

The `programmer.fullName` computed property, for example, could also have been written as follows:

```javascript
Store({
  // ...

  fullName: store => store.firstName + ' ' + store.lastName

  // or even:

  fullName: ({ firstName, lastName }) => firstName + ' ' + lastName
})
```

## Watch Properties
You can watch any regular or computed property on the created `programmer` using the `$watch()` method:

```javascript
const unwatch = programmer.$watch('fullName', (newValue, oldValue) => {
  // This is executed when the `fullName` computed property changes
})

// Calling unwatch() will stop watching the `fullName` property
```


## Set a new Property in an Object
All properties of an object present at initialization time will be tracked. However, if you want to add a new property, you have to use the `$set()` method:

```javascript
programmer.skills.$set('experience', 5)
```

## Set an Array Item's Value
While all array methods (e.g. `push()`) are tracked, setting an array's item via bracket access cannot be tracked:

```javascript
programmer.hobbies[0] = 'Cycling' // Will not update the `developerStory`
```

To trigger dependency changes you'd either have to replace the whole `hobbies` array, or set the respective item via the `$set()` method:

```javascript
programmer.hobbies.$set(0, 'Cycling') // Will update the `developerStory`
```

## Functions as Properties
Since all functions in a `Store`'s configuration object are treated as computed properties, there's no way that a regular property can contain a function.

```
Store({
  // Evaluated as a computed property
  someProp: function () {
    // ...
  }
})
```

However, there's a very simple workaround: Create a computed property that returns the desired function.

```
Store({
  someProp () {
    return function () {
      // ...
    }
  }
})
```


## Methods
The `Store` function has no built-in way to attach methods to it, but you can assign them onto the created store:

```
// Possibly update last name on marriage
programmer.marry = function (newLastName) {
  if (newLastName) {
    this.lastName = newLastName
  }
}
```