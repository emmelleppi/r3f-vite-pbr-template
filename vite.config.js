import { defineConfig } from 'vite';
import { minifyHtml } from 'vite-plugin-html';
import { ViteAliases } from 'vite-aliases';
import reactRefresh from '@vitejs/plugin-react-refresh';

import glslify from 'rollup-plugin-glslify';
import autoprefixer from 'autoprefixer';
import importURL from 'postcss-import-url';

import path from 'path';
const _srcDir = path.resolve(process.cwd(), 'src');
const _publicDir = path.resolve(process.cwd(), 'public');
const _buildDir = path.resolve(process.cwd(), 'build');

export default ({ command, mode }) => {
	const isProduction = mode === 'production';
	console.log(mode); // production/development

	return defineConfig({
		root: _srcDir,
		publicDir: _publicDir,
		jsx: 'react',
		plugins: [
			ViteAliases({
				allowGlobalAlias: true,
				deep: true,
				depth: 1,
				prefix: '@',
				useConfig: true,
				useRelativePaths: true,
			}),
			glslify({
				compress: isProduction,
			}),
			minifyHtml({
				collapseBooleanAttributes: true,
				collapseWhitespace: true,
				minifyCSS: true,
				minifyJS: true,
				minifyURLs: true,
				quoteCharacter: '"',
				removeAttributeQuotes: false,
				removeComments: true,
				removeEmptyAttributes: false,
			}),
			reactRefresh(),
		],
		css: {
			postcss: {
				plugins: [importURL, autoprefixer],
				sourceMap: false,
				minimize: { discardComments: { removeAll: true } },
			},
		},
		server: {
			force: true,
			host: true,
			https: false, //{ maxSessionMemory: 100 }, // https://github.com/vitejs/vite/pull/3895
			open: '/',
			port: 3000,
		},
		build: {
			outDir: _buildDir,
			assetsDir: './',
			brotliSize: false,
			chunkSizeWarningLimit: 5000,
			cssCodeSplit: false,
			emptyOutDir: true,
			minify: 'terser',
			sourcemap: false,
			terserOptions: {
				compress: { arrows: false, passes: 2 },
				ecma: 6,
				format: { comments: false },
				keep_classnames: false,
				keep_fnames: false,
			},
		},
	});
};
