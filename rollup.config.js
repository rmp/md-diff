import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const external = [];

const plugins = [
  resolve({ browser: true }),
  commonjs(),
];

const minPlugins = [...plugins, terser()];

export default [
  // ESM bundle (for bundlers / React apps)
  {
    input: 'src/index.js',
    external,
    output: {
      file: 'dist/md-diff.esm.js',
      format: 'es',
      sourcemap: true,
    },
    plugins,
  },
  // CJS bundle (for Node / CommonJS consumers)
  {
    input: 'src/index.js',
    external,
    output: {
      file: 'dist/md-diff.cjs.js',
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
    plugins,
  },
  // UMD bundle unminified (for direct <script> use during development)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/md-diff.umd.js',
      format: 'umd',
      name: 'MdDiff',
      exports: 'named',
      sourcemap: true,
    },
    plugins,
  },
  // UMD minified (production <script> tag)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/md-diff.umd.min.js',
      format: 'umd',
      name: 'MdDiff',
      exports: 'named',
    },
    plugins: minPlugins,
  },
];
