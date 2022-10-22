import { defineConfig } from 'rollup'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import PostCSS from 'rollup-plugin-postcss'
import Resolve from '@rollup/plugin-node-resolve'
import Commonjs from '@rollup/plugin-commonjs'
import Replace from '@rollup/plugin-replace'

import AutoImport from 'unplugin-auto-import/rollup'
import Components from 'unplugin-vue-components/rollup'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/rollup'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  input: 'src/main.js',
  // https://blog.csdn.net/summer_dou/article/details/123922964
  // external 选项用于确保外部化处理那些你不想打包进库的依赖,解决插件报错问题 (reading 'isCE')
  // Uncaught TypeError: Cannot read properties of null (reading 'isCE')
  // external: ['vue'],
  output: {
    globals: {
      // vue: 'Vue',
      // 构建时已经将 element-plus 打入 js 中，所以暂时不需要使用 iife 定义全局变量了
      // 'element-plus': 'ElementPlus',
    },
    dir: "dist/",
    format: "es",
    chunkFileNames: '[name]-[hash]-[format]-client.js',
    entryFileNames: '[name]-client.js',
    manualChunks: (id) => {
      // Some IDs are not file paths, e.g.
      // 'virtual:vite-plugin-ssr:pageFiles:client:client-routing'
      if (!id.includes(__dirname)) {
        return undefined;
      }
    
      // Rollup ID starts with a weird zero-width character that I was not able
      // to remove using trim() or regex.
      const pathStartIndex = id.indexOf('/');
    
      // Rollup IDs might include search parameters, e.g.
      // 'node_modules/react/cjs/react.production.min.js?commonjs-exports'
      const filePath = path.relative(
        __dirname,
        id.slice(pathStartIndex).split('?')[0]
      );
      
      if (filePath.startsWith('node_modules/')) {
        return 'vendor';
      }
      console.log('😄 filePath', filePath)
      return filePath
    
      // TODO: 打开注释后将指定特定 chunks 名，否则 return filePath 会按照原始文件夹层级进行 Code Splitting
      // if (filePath.startsWith('src/PublicTransfer/index')) {
      //   return 'index';
      // }
    
      // if (filePath.startsWith('src/PublicTransfer/TransferScroller')) {
      //   return 'TransferScroller';
      // }
    
      // return undefined;
    },
  },
  plugins: [
    /**
     * TODO: https://blog.csdn.net/riddle1981/article/details/127112195
     * 👆 这篇文章讲的不错，针对rollup 打包第三方依赖做了大量功课，很好，多读
     */
    // 如果你使用的这个三方库没有默认default，则需要配合@rollup/plugin-commonjs使用
    // 注意commonjs这个模块应当在任何插件调用前调用！
    Commonjs({
      include: /node_modules/
    }),
    // Uncaught ReferenceError: process is not defined
    // 打包后源码中包含 if (process.env.NODE_ENV !== "production") {} 等代码
    // 又因为 rollup 在打包时是不会处理process环境的，这种情况需要插件额外处理 @rollup/plugin-replace
    Replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    // Cannot use import statement outside a module 
    // rollup打包会处理相对路径，对于npm包的绝对路径引用是不会做任何处理的。这种情况可以用 @rollup/plugin-node-resolve 插件处理。
    vue(),
    AutoImport({
      imports: ['vue'], // 自动引入vue
      resolvers: [
        ElementPlusResolver(),
        IconsResolver(),
      ],
    }),
    Components({
      resolvers: [
        ElementPlusResolver(),
        IconsResolver({
          // TODO: 安装 @iconify-json/ep 并配合 unplugin-icons 即可以自动注册 element-plus 组件
          // 前提是 icon 需要以 i-ep-xxx 开头
          enabledCollections: ['ep'],
        }),
      ],
    }),
    Icons({
      autoInstall: true,
    }),
    Resolve(),
    // https://github.com/tuolib/ab-vue/blob/9d4a905efdb71a757a327a0081eae9addcedb12b/build/rollup.config.js#L60
    // Process only `<style module>` blocks.
    PostCSS({
      modules: {
        generateScopedName: '[local]___[hash:base64:5]',
      },
      extract: true, // 分离 scss | css 文件
      include: /&module=.*\.(s?)css$/
    }),
    // Process all `<style>` blocks except `<style module>`.
    PostCSS({
      extract: true, // 分离 scss | css 文件
      include: /(?<!&module=.*)\.(s?)css$/
    }),
  ]
})
