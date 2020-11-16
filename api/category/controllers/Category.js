"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const _ = require("lodash");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");

module.exports = {
  /**
   * Retrieve posts records.
   *
   * @return {Object|Array}
   */
  async config(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.posts.search(ctx.query);
    } else {
      entities = await strapi.services.posts.find(ctx.query);
    }

    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.posts })
    );
  },
  /**
   * Retrieve posts records.
   *
   * @return {Object|Array}
   */
  async getList(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.posts.search(ctx.query);
    } else {
      entities = await strapi.services.posts.find(ctx.query);
    }

    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.posts })
    );
  },

  async getListPublic(ctx) {
    const entities = await strapi
      .query("category")
      .model.find()
      .populate({ path: "category", select: "url _id is_root_category name" })
      .populate({ path: "categories", select: "url _id is_root_category name" })
      .select("url is_root_category name");
    let result = []
    entities.map((item) => {
      if(item.is_root_category == true){
        if(item.categories && item.categories.length > 0){
          for (let i = 0; i < item.categories.length; i++) {
            const element = item.categories[i];
            const child = entities.find(e => {
              return e.id == element.id
            })

            if(child){
              item.categories[i] = child;
            }
          }
          result.push(item);
        }
      }
    });

    return result;
  },
};
