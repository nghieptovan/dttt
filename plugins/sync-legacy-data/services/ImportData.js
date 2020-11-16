"use strict";

/**
 * ImportPosts.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */
const _ = require("lodash");
const { getDataFromUrl } = require("./utils/utils");

const import_queues = {};
let categories = [];
let pennames = [];
let users = [];
let tags = [];
let designers = [];
let photos = [];
let videos = [];
let editors = [];
let photographers = [];
let postStatuses = [];
let contentSources = [];
let royaltiesList = [];
let role = "";

const importNextItem = async (config) => {
  const contentType = import_queues[config.type];
  // console.log("importNextItem => config: ", contentType);
  if (!contentType) {
    return;
  }

  let sourceItem;
  if (contentType.items && contentType.items.length > 0) {
    sourceItem = contentType.items.shift();
  }

  if (!sourceItem) {
    await getItemsNextPage(config);
    if (import_queues[config.type].items.length == 0) {
      console.log("Import Data DONE ==================>");
      return;
    }
  }

  try {
    switch (contentType.type) {
      case "contentpenname":
      case "contentvideo":
      case "contentdesigner":
      case "contentsource":
      case "contentphoto":
      case "royalties-editor":
      case "royalties-photographer":
      case "tag":
        await importContentCreator(config.contentType, sourceItem);
        break;
      case "category":
        await importCategory(config.contentType, sourceItem);
        break;
      case "post":
        await importPost(config.contentType, sourceItem);
        break;
      case "user":
        await importUser(config.contentType, sourceItem);
      default:
        break;
    }
  } catch (error) {
    console.log("error: ", error);
  }

  const { IMPORT_THROTTLE } = strapi.plugins["import-content"].config;
  setTimeout(() => importNextItem(config), IMPORT_THROTTLE);
};

const getItemsNextPage = async (config) => {
  const contentType = import_queues[config.type];
  // console.log("getItemsNextPage => import_queues: ", import_queues);
  const limitPage = contentType.pagination.end_page;
  if (contentType.page > limitPage) return;

  const url = new URL(contentType.url);
  // `${contentType.url}&page=${contentType.pagination.page + 1}`;
  url.searchParams.set("page", parseInt(contentType.pagination.page) + 1);
  url.searchParams.set("per_page", contentType.pagination.per_page);
  try {
    const { items, pagination } = await getDataFromUrl(url.href);
    // pagination.page = contentType.pagination.page + 1;
    contentType.items = items;
    contentType.pagination = pagination;
    import_queues[contentType.type] = {
      ...import_queues[contentType.type],
      ...contentType,
    };
  } catch (error) {
    console.log(`import ${contentType.type}: `, error);
  }
};

const importContentCreator = async (type, source) => {
  if (!source) return;

  const data = {
    slug: source.slug,
    label: source.name,
    increment_id: source.id,
  };
  try {
    const curItem = await strapi
      .query(type)
      .model.findOne({ increment_id: source.id });
    if (curItem) {
      const updated = await strapi
        .query(type)
        .update({ increment_id: data.increment_id }, data);
      console.log(`importContentCreator - Updated ${type} ${data.id}`);
    } else {
      const savedContent = await strapi.query(type).create(data);
      console.log(`importContentCreator - Created ${type} ${savedContent.id}`);
    }
  } catch (error) {
    console.log("error: ", error);
  }
};

const importCategory = async (type, source) => {
  const data = {
    url: source.slug,
    name: source.name,
    increment_id: source.id,
    description: source.description,
    is_root_category: source.parent == 0,
  };

  try {
    if (source.parent == 0) {
      const curCat = await strapi
        .query(type)
        .model.findOne({ increment_id: data.increment_id });

      if (curCat) {
        const catUpdated1 = await strapi
          .query(type)
          .update({ increment_id: data.increment_id }, data);
        console.log(`ImportCategory - Updated category ${data.increment_id}`);
      } else {
        const catSaved1 = await strapi.query(type).create(data);
        console.log(`ImportCategory - Created category ${data.catSaved1}`);
      }

      if (source.child_cat && source.child_cat.length > 0) {
        source.child_cat.forEach(async (cate) => {
          const data1 = {
            url: cate.slug,
            name: cate.name,
            increment_id: cate.cat_ID,
            description: cate.description,
            category: savedContent.id,
            is_root_category: false,
          };

          const curCat1 = await strapi
            .query(type)
            .model.findOne({ increment_id: data1.increment_id });

          if (curCat1) {
            const catUpdated2 = await strapi
              .query(type)
              .update({ increment_id: data1.increment_id }, data1);
            console.log(
              `ImportCategory - Updated category ${data1.increment_id}`
            );
          } else {
            const savedCate2 = await strapi.query(type).create(data1);
            console.log(`ImportCategory - Created category ${savedCate2.id}`);
          }
          // const cate1 = await strapi.query(type).create(data1);

          if (cate.child_cat && cate.child_cat.length > 0) {
            cate.child_cat.forEach(async (_cate) => {
              const data2 = {
                url: _cate.slug,
                name: _cate.name,
                increment_id: _cate.cat_ID,
                description: _cate.description,
                category: cate1.id,
                is_root_category: false,
              };
              const curCat2 = await strapi
                .query(type)
                .model.findOne({ increment_id: data2.increment_id });

              if (curCat2) {
                const catUpdated3 = await strapi
                  .query(type)
                  .update({ increment_id: data2.increment_id }, data2);
                console.log(
                  `ImportCategory - Updated category ${data2.increment_id}`
                );
              } else {
                const savedContent3 = await strapi.query(type).create(data2);
                console.log(
                  `ImportCategory - Created category ${savedContent3.id}`
                );
              }
            });
          }
        });
      }
    }
  } catch (error) {
    console.log("error: ", error);
  }
};

const importPost = async (type, source) => {
  if(!source) return;

  const postCate = categories
    .filter((item) => {
      return source.category_object.find((i) => i.cat_ID == item.increment_id);
    })
    .map((item) => item._id);

  const primary_cate =
    categories.find(
      (item) => item.increment_id == source.primary_cat.term_id
    ) || {};

  const sourceTags = source.tags_string || []
  const postTags = tags
    .filter((item) => {
      return sourceTags.find((i) => i.term_id == item.increment_id);
    })
    .map((item) => item._id);

  let content_source = {};
  if (source.source) {
    content_source =
      contentSources.find(
        (item) => item.increment_id == source.source.term_id
      ) || {};
  }

  let tenbientap_obj = _.get(source, "ten_bien_tap", {}) || {};
  tenbientap_obj =
    editors.find((item) => item.increment_id == tenbientap_obj.term_id) || {};

  let butdanh_obj = _.get(source, "but-danh", {}) || {};
  butdanh_obj =
    pennames.find((item) => item.increment_id == butdanh_obj.term_id) || {};

  let photographer_obj = _.get(source, "photo-creator", {}) || {};
  photographer_obj =
    photographers.find(
      (item) => item.increment_id == photographer_obj.term_id
    ) || {};

  let videoeditor_obj = _.get(source, "video-creator", {}) || {};
  videoeditor_obj =
    videos.find((item) => item.increment_id == videoeditor_obj.term_id) || {};

  let designer_obj = _.get(source, "designer", {}) || {};
  designer_obj =
    designers.find((item) => item.increment_id == designer_obj.term_id) || {};

  let user_obj = _.get(source, "username.data", {}) || {};
  user_obj =
    users.find((item) => item.username == user_obj.user_nicename) || {};

  let seri = _.get(source, "seri", {}) || {};
  seri = tags.find((item) => item.increment_id == seri.term_id) || {};

  let status = _.get(source, "post_type", {}) || {};
  status = postStatuses.find((item) => item.type_code == status) || {};

  let nhuan_bai = _.get(source, "nhuan_bai", 0);
  nhuan_bai = royaltiesList.find((item) => item.value == nhuan_bai) || {};

  let nhuan_anh = _.get(source, "nhuan_anh", 0);
  nhuan_anh = royaltiesList.find((item) => item.value == nhuan_anh) || {};

  let publish_by = _.get(source, "publish_by", {}) || {};
  publish_by = users.find((item) => item.increment_id == publish_by.ID) || {};

  // const regex_slug = /(\/[\w|\d|\-]+)(\/[\w|\d|\-]+)?\/([\w|\d|\-]+)\-(\d+).html$/;
  const post_url = `/${primary_cate.url}/${source.slug}-${source.id}.html`;
  let title = (source.title && source.title.rendered) || "";
  title = title.replace(/&#(\d+);/g, function (match, dec) {
    return String.fromCharCode(dec);
  });

  const data = {
    increment_id: source.id,
    categories: postCate,
    primary_category: primary_cate._id,
    tags: postTags,
    contentsource: content_source.id,
    royalties_editor: tenbientap_obj.id,
    contentpenname: butdanh_obj._id,
    royalties_photographer: photographer_obj._id,
    contentvideo: videoeditor_obj._id,
    contentdesigner: designer_obj._id,
    user: user_obj._id,
    content: source.content_modifier || "",
    series: seri._id,
    title: title,
    title_google: source.title_google,
    posttype: status._id,
    editor_type: source.editor_type || "normal",
    keyword: source.keywords,
    publishedAt: source.publish_time,
    sourcename: source.url_source,
    description: source.article_summary,
    img_ver: source.img_ver,
    img_hor: source.img_hor,
    royalties_editor_value: nhuan_bai._id,
    royalties_photo_value: nhuan_anh._id,
    post_url: post_url,
    url: source.slug,
    publisher: publish_by._id,
    modifiedAt: source.modified,
    cover_m: source.mini_cover || "",
    cover_pc: source.mini_cover || "",
    post_ia: source.ia_status > 0 ? true : false,
    post_ads: source.adsene_status > 0 ? true : false,
    pr_type: source.zones_post_pr == "" ? "0" : source.zones_post_pr,
    video_url: source.video_url,
    have_video: source.video_url == "" ? false : true,
  };

  try {
    const curPost = await strapi
      .query(type)
      .model.findOne({ increment_id: data.increment_id });

    if (curPost) {
      console.log("Update Post: ", curPost._id);
      const updatedPost = await strapi
        .query(type)
        .update({ _id: curPost._id }, data);
    } else {
      const savedContent = await strapi.query(type).create(data);
      console.log("Created Post: ", savedContent._id);
    }
  } catch (error) {
    console.log("error: ", error);
  }
};

const importUser = async (type, source) => {
  const cates = categories
    .filter((item) => {
      return source.categories.find((i) => i.cat_ID == item.increment_id);
    })
    .map((item) => item._id);

  const user = {};
  user.categories = cates;
  user.password = "12345678";
  user.confirmed = false;
  user.blocked = false;
  user.username = source.slug.trim();
  user.email = `${user.username}@saostar.vn`;
  user.fullname = source.name;
  user.provider = "local";
  user.increment_id = source.id;
  user.role = role._id;
  user.disabled = true;

  try {
    const savedContent = await strapi.plugins[
      "users-permissions"
    ].services.user.add(user);
  } catch (error) {
    console.log("error: ", error);
  }
};

module.exports = {
  importItems: (importConfig, ctx) =>
    new Promise(async (resolve, reject) => {
      let { url, contentType } = importConfig;
      const type = contentType.split(".")[1];
      importConfig.type = type;
      const urlParse = new URL(url);

      try {
        const { items, pagination } = await getDataFromUrl(url);
        // pagination.page = 1;
        if (!import_queues[type]) {
          import_queues[type] = {};
        }

        import_queues[type].items = items;
        import_queues[type].pagination = pagination;
        import_queues[type].type = type;
        import_queues[type].url = url;

        // console.log("type import: ", type);

        if (type == "post") {
          categories = await strapi
            .query("category")
            .model.find({}, "_id increment_id url name", { limit: 100000000 });
          pennames = await strapi
            .query("contentpenname")
            .model.find({}, "_id increment_id label", { limit: 100000000 });
          designers = await strapi
            .query("contentdesigner")
            .model.find({}, "_id increment_id label", { limit: 100000000 });
          photos = await strapi
            .query("contentphoto")
            .model.find({}, "_id increment_id label", { limit: 100000000 });
          videos = await strapi
            .query("contentvideo")
            .model.find({}, "_id increment_id label", { limit: 100000000 });
          contentSources = await strapi
            .query("contentsource")
            .model.find({}, "_id increment_id label", { limit: 100000000 });

          tags = await strapi
            .query("tag")
            .model.find({}, "_id increment_id label", { limit: 100000000 });

          editors = await strapi
            .query("royalties-editor")
            .model.find({}, "_id increment_id label");
          photographers = await strapi
            .query("royalties-photographer")
            .model.find({}, "_id increment_id label", { limit: 100000000 });
          users = await strapi.plugins[
            "users-permissions"
          ].services.user.fetchAll({ _limit: 1000000 });
          postStatuses = await strapi
            .query("posttype")
            .model.find({}, "_id increment_id type_code");
          royaltiesList = await strapi
            .query("royalties-list")
            .model.find({}, "_id increment_id value", { _limit: 1000000 });
        } else if (type == "user") {
          categories = await strapi
            .query("category")
            .model.find({}, "_id increment_id url name", { limit: 100000000 });
          role =
            (await strapi.plugins["users-permissions"].models.role.findOne({
              type: "pv",
            })) || {};
        }
        // console.log("category: ",categories.length);
      } catch (error) {
        console.log("import error ==> : ", error);
        reject(error);
      }
      resolve({
        status: "import started",
        importConfigId: type,
      });

      importNextItem(importConfig);
    }),

  getImportProcesses: () => {
    const processes = import_queues;
    let keys = [];

    for (const process in processes) {
      if (processes.hasOwnProperty(process)) {
        keys.push(process);
      }
    }
    console.log("getImportProcesses: ===> ", keys);
    return keys;
  },
  stopProcess: (proc) => {
    delete import_queues[proc];

    const processes = import_queues;
    let keys = [];

    for (const process in processes) {
      if (processes.hasOwnProperty(process)) {
        keys.push(process);
      }
    }
    console.log("stopProcess: ===> ", keys);
    return keys;
  },
};
