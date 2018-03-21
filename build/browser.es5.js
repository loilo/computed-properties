import create from './_create'
import uglify from 'rollup-plugin-uglify'

export default create({
  target: 'es5',
  format: 'iife',
  moduleName: 'Store',
  dest: 'dist/browser.min.js',
  plugins: [
    uglify()
  ]
})
