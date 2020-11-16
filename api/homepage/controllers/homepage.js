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
      entity = await strapi.services.homepage.create(data, { files });
    } else {
      let countPost = await strapi.services.homepage.count(ctx.query);
      ctx.request.body.order = countPost + 1;
      ctx.request.body.increment_id = countPost + 1;
      entity = await strapi.services.homepage.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.homepage });
  },

  /**
   * Retrieve posts records.
   *
   * @return {Object|Array}
   */

  async find(ctx) {
    let entities;
    let category = await strapi.query("category").model.find({}, "_id url name",{limit: 100000000});
    // console.log(category);

    if (ctx.query._q) {
      entities = await strapi.query("homepage").search(ctx.query);
    } else {
      entities = await strapi.services.homepage.find(ctx.query);
    }

    entities = entities.map((entity) => {
      let rObj = sanitizeEntity(entity, { model: strapi.models.homepage });
      
      if (rObj.post.categories && rObj.post.categories.length > 0) {
        let tmpCat = rObj.post.categories;
        tmpCat = _.map(tmpCat, (cate) => {
          return _.find(category, (cat) => {
            return cat._id == cate;
          });
        });
        rObj.post.categories = tmpCat;
      }
      return rObj;
    });
    return entities;
  },

  /**
   * Retrieve Posts for Homepage
   * @param {Context} ctx 
   */
  async getPublic(ctx) {
    let entities;
    let category = await strapi.query("category").model.find({}, "_id url name",{limit: 100000000});
    let countPost = 0;
    // console.log(category);
    const query = {
      ...ctx.query,
      _sort:"order:ASC"
    }
    if (ctx.query._q) {
      entities = await strapi.query("homepage").search(query);
      countPost = await strapi.services.homepage.countSearch(query);
    } else {
      entities = await strapi.services.homepage.find(query);
      countPost = await strapi.services.homepage.count(query);
    }

    entities = entities.map(entity => {
      let rObj = sanitizeEntity(entity, { model: strapi.models.homepage });
      rObj.post.order = rObj.order
      return rObj.post
    });

    const homePosts = entities.map(item => {
      return item.increment_id;
    });

    const latestPosts = await strapi.services.post.find({increment_id_nin: homePosts, _limit: 15, _sort: 'publishedAt:desc', posttype: "5e80d484c38ec834dcbd98d0" })
    
    entities = [...entities, ...latestPosts];
    
    entities = entities.map((entity) => {
      if (entity.categories && entity.categories.length > 0) {
        let tmpCat = entity.categories;
        tmpCat = tmpCat.map(cate => {
          const c = category.find(cat => {
            if(cate._id){
              return cate.id == cat._id
            }
            return cate == cat._id
          })
          if(!c){
            return {
              name: "",
              slug: ""
            }
          }
          return {
            name: c.name,
            slug: c.url,
          };
        })
        entity.categories = tmpCat;
      }

      if (entity.primary_category) {
        let tmpCat = entity.primary_category;
        tmpCat = _.find(category, (cat) => {
          return cat._id == (tmpCat.id || tmpCat);
        });
        if(!tmpCat){
          entity.primary_category = {
            name: "",
            slug: ""
          }
        }else{
          entity.primary_category = {
            name: tmpCat.name,
            slug: tmpCat.url,
          };
        }
      }

      if (entity) {
        entity.id = entity.increment_id;
        delete entity.content;
        delete entity.title_google;
        delete entity.description_google;
        delete entity.sourcename;
        delete entity.scheduleAt;
        delete entity.__v;
        delete entity.posttype;
        delete entity.user;
        delete entity.editing_status;
        delete entity.start_editing;
        delete entity.editing;
        delete entity.publisher;
        delete entity.contentpenname;
        delete entity.royalties_editor_value;
        delete entity.royalties_photo_value;
        delete entity.media;
        delete entity._id;
        delete entity.content_creators;
        delete entity.createdAt;
        delete entity.contentdesigner;
        delete entity.contentphoto;
        delete entity.contentsource;
        delete entity.contentvideo;
        delete entity.royalties_editor;
        delete entity.royalties_photographer;
        delete entity.post_ia;
        delete entity.tags;
        delete entity.increment_id;
      }
      return entity;
    });


    if(countPost == 0){
      return {
        posts: null,
        totals: 0
      }
    }

    return {
      posts: entities,
      totals: entities.length
    }
  },
};
