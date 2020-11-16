'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */

const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = {

  /**
   * Promise to fetch all posts.
   *
   * @return {Promise}
   */

//   fetchAll: (params, populate) => {
//     const filters = convertRestQueryParams(params);
//     const populateOpt = populate || Posts.associations
//       .filter(ast => ast.autoPopulate !== false)
//       .map(ast => ast.alias);
//     return buildQuery({
//       model: Posts,
//       filters,
//       populate: populateOpt,
//     });
//   },

//   /**
//    * Promise to fetch a/an posts.
//    *
//    * @return {Promise}
//    */

//   fetch: (params) => {
//     // Select field to populate.
//     const populate = Posts.associations
//       .filter(ast => ast.autoPopulate !== false)
//       .map(ast => ast.alias)
//       .join(' ');

//     return Posts
//       .findOne(_.pick(params, _.keys(Posts.schema.paths)))
//       .populate(populate);
//   }
}
