"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const _ = require("lodash");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const fs = require("fs");
const csv = require("csv-parser");
const slugify = require('@sindresorhus/slugify');

let userQueue = [];
let categories = [];
let pennames = [];
let users = [];
let tags = [];
let designers = [];
let photos = [];
let videos = [];
let postQueue = [];
let editors = [];
let photographers = [];
let postStatuses = [];
let contentSources = [];
let royaltiesList = [];

const executeImportUsers = async () => {
  const user = userQueue.shift();
  if (!user) {
    console.log("import complete");
    return;
  }
  // console.log("user: ", user.category);

  let cates = categories.filter(item => {
    return user.category.includes(item.url);
  });

  if (cates) {
    cates = cates.map(item => {
      return item._id;
    });
  }
  // console.log("categories: ", cates);

  user.categories = cates;
  user.password = "12345678";
  user.confirmed = false;
  user.blocked = false;
  user.username = user.username.trim();
  user.provider = "local";
  delete user.role;

  const savedContent = await strapi.plugins[
    "users-permissions"
  ].services.user.add(user);

  console.log(`User ${savedContent.username} has been created`);

  setTimeout(() => {
    executeImportUsers();
  }, 100);
};

const executeImportPosts = async () => {
  const post = postQueue.shift();
  if (!post) {
    console.log("import complete");
    return;
  }

  const cates = categories.filter(item => {
    return post.category.includes(item.name);
  });

  let cateIds = [];
  let cateSlugs = []
  if (cates) {
    cateIds = cates.map(item => {
      return item._id;
    });
    cateSlugs = cates.map(item => {
      return item.url;
    });
  }

  const penname = pennames.find(item => item.label == post['but-danh']) || {};
  const video = videos.find(item => item.label == post['video-creator']) || {};
  const photo = photos.find(item => item.label == post['photo-creator']) || {};
  const designer = designers.find(item => item.label == post['designer']) || {};
  const status = postStatuses.find(item => item.type_code == post['posttype']) || {};
  const primary_category = categories.find(item => item.name == post["primary_category"]) || {};
  const photographer = photographers.find(item => item.label == post["photographer"]) || {};
  const editor = editors.find(item => item.label == post["editor"]) || {};
  const source = contentSources.find(item => item.label == post["source"]) || {};
  const publisher = users.find(item => item.username == post["user_publish"])||{};
  const user = users.find(item => item.username == post["username"])||{};
  const publishedAt = (post['posttype'] == 'ready' && post['publishedAt'] != "") ? new Date(post['publishedAt']).toString() : null;
  const editorRoyalties = royaltiesList.find(item => item.value == post["nhuan_bai"])||{}
  const photoRoyalties = royaltiesList.find(item => item.value == post["nhuan_anh"])||{}
  let slug = slugify(post['title']);
  let url = `/${cateSlugs.join('/')}/${slug}-${post['increment_id']}.html`;

  if(post['posttype'] == 'ready'){
    const regex_slug = /(\/[\w|\d|\-]+)(\/[\w|\d|\-]+)?\/([\w|\d|\-]+)\-(\d+).html$/;
    const matches = (post['url'] || "").match(regex_slug);
    if(matches && matches.length >= 4){
      slug = matches[3];
    }
  }
  let ptags = tags.filter(item => {
    return post.tag.indexOf(item.label) > -1;
  })
  
  if(ptags){
    ptags = ptags.map(item => {return item._id})
  }
  const pData = {
    ...post,
    "categories": cateIds,
    "tags": ptags,
    "contentsource": source._id,
    "contentdesigner": designer._id,
    "contentpenname": penname._id,
    "contentphoto": photo._id,
    "contentvideo": video._id,
    "contentdesigner": designer._id,
    "posttype": status._id,
    "primary_category": primary_category._id,
    "royalties_photographer": photographer._id,
    "royalties_editor": editor._id,
    "publisher": publisher._id,
    "editor_type":post["editor_type"] || "normal",
    "user": user._id,
    "publishedAt": publishedAt,
    "royalties_editor_value": editorRoyalties._id,
    "royalties_photo_value": photoRoyalties._id,
    "url": url,
    "slug": slug,
    "old_url": post['url']
  }
  try {
    const savedContent = await strapi.services['post'].create(pData)  
    console.log(`Post ${savedContent.title} has been created`);
  } catch (error) {
    console.error("ERROR: ",error);
  }
  setTimeout(() => {
    executeImportPosts();
  }, 100);
};

module.exports = {
  /**
   * Retrieve posts records.
   *
   * @return {Object|Array}
   */
  async importCSV(ctx) {
    const data = ctx.request.body;
    const list = data.data;
    const collection = data.contentType.model;
    const id = data.contentType.id;
    const ref = data.contentType.ref;
    // const typeId = list[0].content_creator_type
    // const type = await strapi.services['content-creator-type'].findOne({"_id":typeId});
    // console.log("collection: ", strapi.services[collection]);

    if (!strapi.services[collection]) {
      return [];
    }

    let result = [];
    list.map(async entity => {
      if (ref && id && id != "") {
        entity[ref] = id;
      }

      result.push(await strapi.services[collection].create(entity));
    });
    return result;
  },
  async importUsers(ctx) {
    const data = ctx.request.body;
    const list = data.data;
    userQueue = list;
    categories = await strapi.query("category").model.find({}, "_id url name");

    return new Promise(async (resolve, reject) => {
      resolve({
        status: "import started"
      });
      executeImportUsers();
    });
  },
  async importPosts(ctx) {
    const data = ctx.request.body;
    const list = data.data;
    postQueue = list;
    categories = await strapi.query("category").model.find({}, "_id url name",{limit: 100000000});
    pennames = await strapi.query("contentpenname").model.find({}, "_id label",{limit: 100000000});
    designers = await strapi.query("contentdesigner").model.find({}, "_id label",{limit: 100000000});
    photos = await strapi.query("contentphoto").model.find({}, "_id label",{limit: 100000000});
    videos = await strapi.query("contentvideo").model.find({}, "_id label",{limit: 100000000});
    contentSources = await strapi.query("contentsource").model.find({}, "_id label", {limit: 100000000});
    tags = await strapi.query("tag").model.find({}, "_id label", {limit: 100000000});

    editors = await strapi.query("royalties-editor").model.find({}, "_id label");
    photographers = await strapi.query("royalties-photographer").model.find({}, "_id label", {limit: 100000000});
    users = await strapi.plugins["users-permissions"].services.user.fetchAll({_limit: 1000000})
    postStatuses = await strapi.query("posttype").model.find({},"_id type_code");
    royaltiesList = await strapi.query("royalties-list").model.find({},"_id value",{_limit: 1000000});

    // console.log("tags: ", tags.length);
    // console.log("categories: ", categories.length);
    
    return new Promise(async (resolve, reject) => {
      resolve({
        status: "import started"
      });
      executeImportPosts();
    });
  }
};
