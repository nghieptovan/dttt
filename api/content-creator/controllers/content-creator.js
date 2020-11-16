'use strict';
const _ = require('lodash');
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    async getALlByType(ctx) {
        let entities;
        // console.log(strapi.services);
        // ctx.query['active'] = false;
        if (ctx.query._q) {
            entities = await strapi.services['content-creator'].search(ctx.query);
        } else {
            entities = await strapi.services['content-creator'].find(ctx.query);
        }

        entities = entities.map(entity => {            
            entity.type = entity.content_creator_type.code;
            let rObj = sanitizeEntity(entity, { model: strapi.models['content-creator'] });           
            return rObj;
        });
        
        const groupBy = _.groupBy(entities, 'type');
        return groupBy;
    }
    
};
