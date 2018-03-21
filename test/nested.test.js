const Store = require('../dist/cjs.es5')

test('reacts to arrays as object properties', () => {
  const _ = Store({
    obj: { arr: [ 1, 2, 3 ] },
    str: _ => _.obj.arr.join(':')
  })

  expect(_.str).toBe('1:2:3')
  _.obj.arr.push(4)
  expect(_.str).toBe('1:2:3:4')
})

test('reacts to objects in arrays', () => {
  const _ = Store({
    arr: [ { a: 1 } ],
    str: _ => String(_.arr[0].a)
  })

  expect(_.str).toBe('1')
  _.arr[0].a = 2
  expect(_.str).toBe('2')
})

test('reacts to new objects in arrays', () => {
  const _ = Store({
    arr: [ { a: 1 } ],
    str: _ => String(_.arr[0].a)
  })

  expect(_.str).toBe('1')
  _.arr.unshift({ a: 2 })
  expect(_.str).toBe('2')
})
