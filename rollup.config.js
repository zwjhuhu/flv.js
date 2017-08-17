import uglify from 'rollup-plugin-uglify';
import { minify } from 'uglify-es';
import builtins from 'rollup-plugin-node-builtins';

export default {
    entry: 'src/flv.js',
    format: 'iife',
    dest: 'dist/flv.min.js',
    plugins: [
        builtins(),
        uglify({}, minify)
    ],
    moduleName:'flvjs',
    sourceMap: true
}
