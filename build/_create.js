import typescript from 'rollup-plugin-typescript'

export default config => {
  config = Object.assign({}, config)

  const tsOptions = {
    typescript: require('typescript')
  }

  if ('target' in config) {
    tsOptions.target = config.target
    delete config.target
  }

  const base = {
    entry: 'src/index.ts',
    onwarn () {},
    plugins: [
      typescript(tsOptions)
    ]
  }

  if ('plugins' in config) {
    base.plugins.push(...config.plugins)
    delete config.plugins
  }

  return Object.assign({}, base, config)
}
