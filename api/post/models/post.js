"use strict";

const QueueService = require("../../../utils/QueueService");
/**
 * Lifecycle callbacks for the `post` model.
 */
const slug = require("slug");

function checkVideo(content) {
  if (
    content.includes("data-oembed-url") ||
    content.includes(".mp4") ||
    content.includes(".m3u8") ||
    content.includes("<iframe")
  ) {
    return true;
  }
  return false;
}
function getFirstVideoURL(content) {
  let pattern = content.match(/(?:(?:https?|http):\/\/)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm);
  let firstVideoURL = "";
  pattern.forEach(content => {
    if(content.includes(".mp4") || content.includes(".m3u8") || content.includes("youtube.com") || content.includes("youtu.be")){
      firstVideoURL = content;
      return firstVideoURL;
    }
  });
  return firstVideoURL;
  
}
module.exports = {
  // Before saving a value.
  // Fired before an `insert` or `update` query.
  // beforeSave: async (model, attrs, options) => {},

  // After saving a value.
  // Fired after an `insert` or `update` query.
  // afterSave: async (model, response, options) => {},

  // Before fetching a value.
  // Fired before a `fetch` operation.
  // beforeFetch: async (model, columns, options) => {},

  // After fetching a value.
  // Fired after a `fetch` operation.
  // afterFetch: async (model, response, options) => {},

  // Before fetching all values.
  // Fired before a `fetchAll` operation.
  // beforeFetchAll: async (model, columns, options) => {},

  // After fetching all values.
  // Fired after a `fetchAll` operation.
  // afterFetchAll: async (model, response, options) => {},

  // Before creating a value.
  // Fired before an `insert` query.
  beforeCreate: async (model, attrs, options) => {
    if (model.title) {
      model.set("title_search", slug(model.title, { lower: true }));
    }
    if (model.content) {
      if(checkVideo(model.content)){        
        model.set("have_video", true);
        model.set("video_url", getFirstVideoURL(model.content));
      }else{
        model.set("video_url", "");
        model.set("have_video", false);
      }
      
    }
    model.set("modifiedAt", new Date());
  },

  // After creating a value.
  // Fired after an `insert` query.
  afterCreate: async (model, attrs, options) => {
    if (model && model.posttype) {
      const posttype = await strapi
        .query("posttype")
        .model.findOne({ type_code: "ready" })
        .select("_id");

      if (model.posttype == posttype.id) {
        const msg = {
          model: "post",
          action: "create",
          data: model,
        };
        QueueService.sendMessage(JSON.stringify(msg));
        console.log("Published post - create: ", post.id);
      }
    }
  },

  // Before updating a value.
  // Fired before an `update` query.
  beforeUpdate: async (model, attrs, options) => {
    const update = model._update;

    if (update && update.title) {
      update.title_search = slug(update.title, { lower: true });
    }
    if (update && update.content) {

      if(checkVideo(update.content)){        
        model.set("have_video", true);
        model.set("video_url", getFirstVideoURL(update.content));
      }else{
        model.set("video_url", "");
        model.set("have_video", false);
      }
      update.content = update.content.replace(/<p>&nbsp;<\/p\>/g, "");
    }

    model._update = update;

    const conditions = model._conditions;

    const post = await strapi
      .query("post")
      .model.findOne({ _id: conditions._id })
      .populate({ path: "posttype", select: "type_code" });

    if (update.posttype && post && post.posttype && post.posttype.type_code == "ready") {
      if (update.posttype !== post.posttype._id) {
        const msg = {
          model: "post",
          action: "delete",
          data: {
            _id: post._id,
            id: post.id,
          },
        };
        QueueService.sendMessage(JSON.stringify(msg));
        console.log("Removed post - update: ", post.id);
      }
    }
  },

  // After updating a value.
  // Fired after an `update` query.
  afterUpdate: async (model, attrs, options) => {
    const update = model._update;
    const conditions = model._conditions;

    if (update) {
      const data = update["$set"];
      data._id = conditions._id;

      if (data.posttype) {
        const posttype = await strapi
          .query("posttype")
          .model.findOne({ type_code: "ready" })
          .select("_id");

        if (data.posttype == posttype.id) {
          const post = await strapi
            .query("post")
            .model.findOne({ _id: data._id });

          if (post) {
            const msg = {
              model: "post",
              action: "update",
              data: post,
            };
            QueueService.sendMessage(JSON.stringify(msg));
            console.log("Published post - update: ", post.id);
          }
        }
      }
    }
  },

  // Before destroying a value.
  // Fired before a `delete` query.
  // beforeDestroy: async (model, attrs, options) => {},

  // After destroying a value.
  // Fired after a `delete` query.
  afterDestroy: async (model, attrs, options) => {
    const msg = {
      model: "post",
      action: "delete",
      data: attrs,
    };
    QueueService.sendMessage(JSON.stringify(msg));
    console.log("Removed post - destroy: ", attrs.id || attrs._id);
  },
};
