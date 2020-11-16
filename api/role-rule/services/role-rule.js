'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */

const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');
module.exports = {

    findRuleByRoleRule: (params, populate) => {
    const filters = convertRestQueryParams(params);
    const populateOpt = populate || RoleRule.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias);
    return buildQuery({
      model: RoleRule,
      filters,
      populate: populateOpt,
    });
  }
};
