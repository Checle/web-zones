import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import nodeGlobals from 'rollup-plugin-node-globals'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
  entry: 'src/browser.js',
  dest: 'dist/browser.js',
  format: 'iife',
  moduleName: 'zones',

  plugins: [
    babel({
      babelrc: false,
      runtimeHelpers: true,
      plugins: ['transform-class-properties'],
      presets: ['es2017', 'es2016', 'es2015-rollup'],
      include: 'src/**',
    }),

    nodeResolve(),
    commonjs(),
    nodeGlobals(),
  ],
}
