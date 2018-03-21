const Store = require('../dist/cjs.es5')

test('reacts to replaced arrays', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list = [ 3, 2, 1 ]
  expect(_.str).toBe('3:2:1')
})


test('does not react to changes via index access', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list[0] = 0
  expect(_.str).not.toBe('0:2:3')
})


test('reacts to changes via $set()', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list.$set(0, 0)
  expect(_.str).toBe('0:2:3')
})


test('correctly performs reverse()', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list.reverse()
  expect(_.str).toBe('3:2:1')
})


test('correctly performs sort()', () => {
  const _ = Store({
    list: [ 3, 2, 1 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list.sort()
  expect(_.str).toBe('1:2:3')
})


test('correctly performs push()', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list.push(4)
  expect(_.str).toBe('1:2:3:4')
})


test('correctly performs unshift()', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list.unshift(0)
  expect(_.str).toBe('0:1:2:3')
})


test('correctly performs pop()', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list.pop()
  expect(_.str).toBe('1:2')
})


test('correctly performs unshift()', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list.shift()
  expect(_.str).toBe('2:3')
})


test('correctly performs splice()', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list.splice(1, 1)
  expect(_.str).toBe('1:3')
})

test('gets the original array via $raw()', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  expect(_.list.$raw()).toEqual([ 1, 2, 3 ])
})

test('destroys the observable array via $destroy()', () => {
  const _ = Store({
    list: [ 1, 2, 3 ],
    str: _ => _.list.join(':')
  })

  _.str
  _.list.$destroy()
  _.list.push(4)

  expect(_.str).toBe('1:2:3')
})


