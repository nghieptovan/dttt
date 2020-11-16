"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const _ = require("lodash");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.tag.create(data, { files });
    } else {
      console.log(ctx.request.body);
      let countTag = await strapi.services.tag.count(ctx.query);
      ctx.request.body.increment_id = countTag + 1;

      let slug = ctx.request.body.slug;

      let types = await strapi.services["tag"].find({
        slug: slug,
      });
      console.log(types);
      if (types && types.length > 0) {
        entity = types[0];
      } else {
        entity = await strapi.services.tag.create(ctx.request.body);
      }
    }
    return sanitizeEntity(entity, { model: strapi.models.tag });
  },

  async getList(ctx) {
    let entities = await strapi.services.tag.find(ctx.query);
    const count = await strapi.services.tag.count(ctx.query);

    const tags = entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.tag })
    );
    return {
      list: tags,
      totals: count,
    };
  },

  async listPublic(ctx) {
    const { page = 1, limit = 20 } = ctx.query;
    const max = Math.min(limit, 1000);

    const start = (page - 1) * max;
    const query = {
      _limit: max,
      _start: start,
    };
    if (ctx.query.updatedAt) {
      query.updatedAt_gte = `${ctx.query.updatedAt}T00:00:00.000Z`;
      query.updatedAt_lte = `${ctx.query.updatedAt}T23:59:59.999Z`;
    }
    let entities = await strapi.services.tag.find(query);

    const count = await strapi.services.tag.count(query);
    const tags = entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.tag })
    );
    return {
      list: tags,
      page: page,
      limit: max,
      totals: count,
      pageTotals: Math.ceil(count / max),
    };
  },
};
