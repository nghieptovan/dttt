'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const _ = require('lodash');
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
    /**
     * Retrieve posts records.
     *
     * @return {Object|Array}
     */
    async config(ctx) {
        let dataReturn = {
          category: {},
          // tag: [],
          count_data: {},
          role: [],
          post_status: [],
          content_creator_type: [],
          banword: "",
          frontendurl: "",
          configuration: []
        };
        
        dataReturn.category = await this.getListCategory(ctx);    
        // dataReturn.tag = await this.getListTag(ctx);    
        // dataReturn.content_creator = await this.getContentCreator(ctx);  
        dataReturn.count_data = await this.countData(ctx);   
        dataReturn.role = await this.getRole(ctx);    
        dataReturn.post_status = await this.getPostStatus(ctx);    
        dataReturn.royalties_list = await this.getRoyaltiesList(ctx);
        dataReturn.content_creator_type = await this.getContentCreatorType(ctx);    
        dataReturn.banword = await this.getBanWord(ctx);   
        dataReturn.frontendurl = await this.getFrontEndUrl(ctx);     
        dataReturn.configuration = await this.getConfiguration(ctx);     
        return dataReturn
    },

    /**
     * count data.
     *
     * @return {Object|Array}
     */

    async countData(ctx) {
      const data = {
        penname: 0,
        photo: 0,
        video: 0,
        source: 0,
        designer: 0
      };
      data.penname = await strapi.services.contentpenname.count({});
      data.photo = await strapi.services.contentphoto.count({});
      data.video = await strapi.services.contentvideo.count({});
      data.source = await strapi.services.contentsource.count({});
      data.designer = await strapi.services.contentdesigner.count({});   
      return data;
    },
    /**
     * Retrieve tags records.
     *
     * @return {Object|Array}
     */

    async getPostStatus(ctx) {
      let entities = await strapi.services.posttype.find();

      entities = entities.map(role => {
        role.value = role._id;
        role.label = role.name;
        return role
      });
      return entities;
    },

    /**
     * Retrieve tags records.
     *
     * @return {Object|Array}
     */

    async getRole(ctx) {
      // console.log(strapi.plugins['users-permissions'].services)
      let entities = await strapi.plugins['users-permissions'].services.userspermissions.getRoles();
      
      entities = entities.filter(role => {
        if(role.type != 'root' && role.type != 'authenticated' && role.type != 'public' && role.type != 'superadmin'){
          role.value = role._id;
          role.label = role.name;
          return role
        }        
      });
      return entities;
    },
    /**
     * Retrieve tags records.
     *
     * @return {Object|Array}
     */

    async getContentCreator(ctx) {
      let entities;

      entities = await strapi.services['content-creator'].find({_limit: -1});

      entities = entities.map(entity => {            
          entity.type = entity.content_creator_type.code;
          let rObj = sanitizeEntity(entity, { model: strapi.models['content-creator'] });           
          return rObj;
      });
      
      const groupBy = _.groupBy(entities, 'type');
      return groupBy;
    },

    /**
     * Retrieve tags records.
     *
     * @return {Object|Array}
     */

    async getListTag(ctx) {
      
      ctx.query = {
        status: true
      };

      const tags = await strapi.services.tag.find(ctx.query);
      return tags;
    },
    /**
     * Retrieve getBanWord
     *
     * @return {string}
     */

    async getBanWord(ctx) {
      
      ctx.query = {
        label: "banword"
      };

      const configuration = await strapi.services.configuration.find(ctx.query);
      return configuration[0].value || "";
    },
    /**
     * Retrieve getBanWord
     *
     * @return {string}
     */

    async getFrontEndUrl(ctx) {
      
      ctx.query = {
        label: "frontendurl"
      };

      const configuration = await strapi.services.configuration.find(ctx.query);
      return configuration[0].value || "";
    },
    /**
     * Retrieve getConfiguration
     *
     * @return {Object|Array}
     */

    async getConfiguration(ctx) {
      
      ctx.query = {
        active: true
      };

      const configuration = await strapi.services.configuration.find(ctx.query);
      return configuration;
    },


    /**
     * Retrieve content creator type records.
     *
     * @return {Object|Array}
     */

    async getContentCreatorType(ctx) {      
      ctx.query = {
        active: true
      };
      const type = await strapi.services['content-creator-type'].find(ctx.query);
      return type;
    },
    /**
     * Retrieve category records.
     *
     * @return {Object|Array}
     */

    async getListCategory(ctx) {

      let data = {
        parent_category: [],
        children_category: []
      }
      
      ctx.query = {
        status: true
      };

      let category = await strapi.services.category.find(ctx.query);

      let parent_category = _.filter(category, (cate) => {
        return cate.is_root_category
      });
      let children_category = _.filter(category, (cate) => {
        return !cate.is_root_category
      });
      data.parent_category = parent_category;
      data.children_category = children_category;
      return data

    },

    async getRoyaltiesList(ctx){

      const royaltiesList = await strapi.services['royalties-list'].find();
      return royaltiesList;
    }

};
