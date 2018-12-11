const Store = require('../dist/store')

test('performs initial computation (from context)', () => {
  const _ = Store({
    a: 1,
    b: 2,
    c () { return this.a + this.b }
  })

  expect(_.c).toBe(3)
})

test('performs initial computation (from argument)', () => {
  const _ = Store({
    a: 1,
    b: 2,
    c: _ => _.a + _.b
  })

  expect(_.c).toBe(3)
})

test('reacts to simple changes', () => {
  const add = (...numbers) => numbers.reduce((carry, current) => carry + current, 0)
  const _ = Store({
    a: 1,
    b: 2,
    c: _ => _.a + _.b
  })

  expect(_.c).toBe(3)
  _.a = 3
  expect(_.c).toBe(5)
})

test('reacts to chained changes', () => {
  const add = (...numbers) => numbers.reduce((carry, current) => carry + current, 0)
  const _ = Store({
    a: 1,
    b: 2,
    c: _ => _.a + _.b,
    d: _ => _.c * _.c
  })

  expect(_.d).toBe(9)
  _.a = 3
  expect(_.d).toBe(25)
})
