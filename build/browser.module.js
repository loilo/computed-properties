import create from './_create'
import uglify from 'rollup-plugin-uglify'

export default create({
  target: 'es2015',
  format: 'es',
  dest: 'dist/browser.module.min.js',
  plugins: [
    uglify()
  ]
})
