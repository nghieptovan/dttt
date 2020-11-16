"use strict";

/**
 * ImportPosts.js controller
 *
 * @description: A set of functions called "actions" of the `import-posts` plugin.
 */

module.exports = {
  /**
   * Default action.
   *
   * @return {Object}
   */

  index: async (ctx) => {
    // Add your own logic here.

    // Send 200 `ok`
    ctx.send({
      message: "ok",
    });
  },

  importItems: async (ctx) => {
    const services = strapi.plugins["sync-legacy-data"].services;
    const importConfig = ctx.request.body;
    importConfig.ongoing = true;
    // const record = await strapi
    //   .query("importconfig", "import-content")
    //   .create(importConfig);
    // console.log("create", record);
    await services["importdata"].importItems(importConfig, ctx);
    const processes = await services["importdata"].getImportProcesses();

    ctx.send({ code: 200, message: "Data is importing", data: processes });
  },
  getCurrentProcesses: async (ctx) => {
    const services = strapi.plugins["sync-legacy-data"].services;
    const processes = await services["importdata"].getImportProcesses();
    ctx.send({
      code: 200,
      message: "Get processes successfully",
      data: processes,
    });
  },
  stopProcess: async (ctx) => {
    const services = strapi.plugins["sync-legacy-data"].services;
    const data = ctx.request.body;
    const processes = await services["importdata"].stopProcess(data.process);
    ctx.send({
      code: 200,
      message: `Stop process ${data.process} successfully`,
      data: processes,
    });
  }
};
