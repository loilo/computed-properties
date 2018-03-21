import create from './_create'
import uglify from 'rollup-plugin-uglify'

export default create({
  target: 'es2015',
  format: 'iife',
  moduleName: 'Store',
  dest: 'dist/browser.es2015.min.js',
  plugins: [
    uglify()
  ]
})
