const Store = require('../dist/store')

const entries = obj => Object.keys(obj).map(key => [ key, obj[key] ])

test('reacts to replaced objects', () => {
  const _ = Store({
    obj: { a: 1, b: 2, c: 3 },
    str: _ => entries(_.obj).map(item => `${item[0]}:${item[1]}`).join('|')
  })

  expect(_.str).toBe('a:1|b:2|c:3')
  _.obj = { d: 4, e: 5, f: 6 }
  expect(_.str).toBe('d:4|e:5|f:6')
})

test('reacts to changed props', () => {
  const _ = Store({
    obj: { a: 1, b: 2, c: 3 },
    str: _ => entries(_.obj).map(item => `${item[0]}:${item[1]}`).join('|')
  })

  expect(_.str).toBe('a:1|b:2|c:3')
  _.obj.a = 0
  expect(_.str).toBe('a:0|b:2|c:3')
})
