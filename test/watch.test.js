const Store = require('../dist/store')

test('triggers $watch callbacks on static properties', () => {
  const _ = Store({
    a: 1
  })

  const mockWatcher = jest.fn()
  _.$watch('a', mockWatcher)

  _.a = 2
  _.a = 3

  expect(mockWatcher).toHaveBeenCalledTimes(2)
  expect(mockWatcher).toHaveBeenNthCalledWith(1, 2, 1)
  expect(mockWatcher).toHaveBeenNthCalledWith(2, 3, 2)
})

test('triggers $watch callbacks on depended-on computed properties', () => {
  const _ = Store({
    a: 1,
    b: _ => _.a + 1,
    c: _ => _.b + 1
  })

  const mockWatcher = jest.fn()
  _.$watch('b', mockWatcher)

  _.a = 2

  expect(mockWatcher).toHaveBeenCalledTimes(1)
  expect(mockWatcher).toHaveBeenLastCalledWith(3, 2)
})

test('triggers $watch callbacks on dependant-free properties', () => {
  const _ = Store({
    a: 1,
    b: _ => _.a + 1,
    c: _ => _.b + 1
  })

  const mockWatcher = jest.fn()
  _.$watch('c', mockWatcher)

  _.a = 2

  expect(mockWatcher).toHaveBeenCalledTimes(1)
  expect(mockWatcher).toHaveBeenLastCalledWith(4, 3)
})

test('removes $watch callbacks when calling the unwatcher', () => {
  const _ = Store({
    a: 1
  })

  const mockWatcher = jest.fn()
  const unwatch = _.$watch('a', mockWatcher)

  _.a = 2
  unwatch()
  _.a = 3

  expect(mockWatcher).toHaveBeenCalledTimes(1)
  expect(mockWatcher).toHaveBeenLastCalledWith(2, 1)
})
