import { test as baseTest, beforeEach, describe,it,expect } from 'vitest';
import { SiteGenerator } from '../src/site-generator.js';


/**
 * @typedef {{ routesProvider: PaperTree.RoutesProvider, dataProvider: PaperTree.DataProvider, renderer: PaperTree.Renderer, outputHandler: PaperTree.OutputHandler }} GeneratorTestContext
 */

const test = /** @type {typeof baseTest<GeneratorTestContext>} */ (baseTest);

/** @type {typeof beforeEach<GeneratorTestContext>} */ (beforeEach)(context => {
    /** @type {PaperTree.RoutesProvider} */
    context.routesProvider = {};
    /** @type {PaperTree.DataProvider} */
    context.dataProvider = {};
    /** @type {PaperTree.Renderer} */
    context.renderer = {};
    /** @type {PaperTree.OutputHandler} */
    context.outputHandler = {};
});

test('SiteGenerator#buildAllPaths', async () => {

  const generator = new SiteGenerator({
    taskHandler: ['paper-tree-worker-pool-task-handler', {
      numWorkers: 4
    }],
    routesProvider: ['paper-tree-manual-routes-provider', {
      
    }],
    renderer: ['paper-tree-vite-renderer', {
      htmlTemplatePath: './index.html',
      appOutlet: '<!--ssr-outlet-->',
      preloadLinksOutlet: '<!--preload-links-->',
      appRenderer: ['paper-tree-vue-renderer', {
        appEntry: './src/app.vue'
      }]
    }],
    transforms: [
      ['paper-tree-html-minifier-transform', {}]
    ],
    writer: ['paper-tree-fs-writer', {}]
  });

  generator.buildAllPaths();

});

test('SiteGenerator#buildPath', async () => {

  const generator = new SiteGenerator();

  await generator.buildPath('/my-special-path/is-great/stuff');

});