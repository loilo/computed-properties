const Store = require('../dist/cjs.es5')

test('can tack methods to stores', () => {
  const _ = Store({
    a: 1,
    b: 2,
    c () { return this.a + this.b }
  })

  _.multiplyA = function (factor) {
    this.a *= factor
  }

  _.multiplyA(2)

  expect(_.a).toBe(2)
  expect(_.c).toBe(4)
})
