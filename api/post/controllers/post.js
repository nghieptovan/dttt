"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const _ = require("lodash");
const moment = require("moment");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const fetch = require("node-fetch");
const slug = require("slug");

function checkPermission(user, post) {
  // bai viet dang edit thi ko dc vao, khoa lai edit = not ok
  // bai chua ai edit

  // neu ready, schedule: can_edit_publish => edit = ok

  // cho duyet:  can_edit_publish, can_publish => edit = ok

  // draft =>
  //    + bai cua may => edit = ok
  //    + ko phai bai cua may:
  //       # can_edit_other, can_edit_publish, can_publish => edit = ok

  // trash => chi admin
  let can_edit = false;
  let is_locking = false;
  let you_editing = false;

  // if (post.editing_status && post.editing) {

  //   you_editing = user.id == post.editing.id;
  // }

  if (post.editing_status) {
    // if(user.id == post.user.id){
    //   can_edit = true;
    // }else{
    // can_edit = false;
    // }
    is_locking = true;
    can_edit = false;
  } else {
    switch (post.posttype.type_code) {
      case "ready":
        can_edit = user.can_edit_publish;
        break;
      case "schedule":
        can_edit = user.can_edit_publish;
        break;

      case "waiting":
        // chuyen lai, user có thể edit bài khi chờ duyệt :-s
        if (user.id == post.user.id) {
          can_edit = true;
        } else {
          if (user.can_edit_publish || user.can_publish) {
            can_edit = true;
          }
        }
        break;

      case "draft":
        if (user.id == post.user.id) {
          can_edit = true;
        } else {
          if (
            user.can_edit_publish ||
            user.can_publish ||
            user.can_edit_other
          ) {
            can_edit = true;
          }
        }
        break;
      case "trash":
        if (user.role.type == "superadmin") {
          can_edit = true;
        }
        break;

      default:
        break;
    }
  }

  return {
    can_edit: can_edit,
    can_preview: true,
    is_locking: is_locking,
    you_editing: you_editing,
  };
}

function defineCategory(cat) {
  return {
    _id: cat._id,
    status: cat.status,
    is_root_category: cat.is_root_category,
    name: cat.name,
    label: cat.name,
    url: cat.url,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
    id: cat.id,
  };
}

function buildCategory(categories, primary_category) {
  let dataReturn = [];
  let findRoot = _.find(categories, (cat) => {
    return cat.is_root_category;
  });

  _.map(findRoot, (cat) => {
    let findL1 = _.find(categories, (cat) => {
      return cat.category == cat.id;
    });
    cat.categories = findL1;
  });

  if (findRoot) {
    let datalevel1 = _.filter(categories, (cat) => {
      return cat.category == findRoot.id;
    });

    findRoot.categories = datanew;
  }

  return findRoot;
}

module.exports = {
  /**
   * Retrieve posts records.
   *
   * @return {Object|Array}
   */

  async find(ctx) {
    let entities;
    let { id: idUser } = ctx.state.user;
    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id: idUser,
    });

    let type_code = "";
    const type = ctx.query.type;
    switch (type) {
      case "da-dang":
        type_code = "ready";
        break;
      case "da-len-lich":
        type_code = "schedule";
        break;
      case "cho-duyet":
        type_code = "waiting";
        break;
      case "nhap":
        type_code = "draft";
        break;
      case "thung-rac":
        type_code = "trash";
        break;
      default:
        break;
    }

    delete ctx.query.type;

    if (user.id) {
      if (!user.can_read_other || type === "bai-cua-toi") {
        ctx.query["user"] = user._id;
      }
      // filter pr_type
      if (ctx.query.editor_type && ctx.query.editor_type == "pr") {
        ctx.query.pr_type_gt = 0;
        delete ctx.query.editor_type;
      }
      // handle post status
      let types = await strapi.services["posttype"].find();
      if (type_code != "") {
        let findType = _.filter(types, (ctv) => {
          return ctv.type_code == type_code;
        });

        ctx.query.posttype = findType[0]._id;
      }
      // handle post status

      // handle category
      let userCates = user.categories;
      if (ctx.query.categories) {
        let urlSlug = ctx.query.categories;
        delete ctx.query.categories;
        _.remove(userCates, (ctv) => {
          return ctv.url != urlSlug;
        });
      }

      let catFilter = [];
      _.forEach(userCates, (cat) => {
        catFilter.push(cat._id);
      });
      if (catFilter.length > 0) {
        ctx.query.categories_in = catFilter;
      }
      // handle category

      if (ctx.query.royalties_editor) {
        const editor = ctx.query.royalties_editor;
        delete ctx.query.royalties_editor;
        ctx.query["royalties_editor.slug"] = editor;
      }
      let countPost = 0;

      // handle _q params
      if (ctx.query._q) {
        // change to find, not use search any more
        let searchtxt = ctx.query._q;
        ctx.query.title_search_contains = slug(searchtxt, { lower: true });
        delete ctx.query._q;
      }

      if (ctx.query.title_search_contains) {
        // change to find, not use search any more
        ctx.query.title_search_contains = slug(
          ctx.query.title_search_contains,
          { lower: true }
        );
      }
      //handle _q param
      // console.log(ctx.query);
      if (ctx.query._q) {
        entities = await strapi.query("post").search(ctx.query);
        countPost = await strapi.query("post").countSearch(ctx.query);
      } else {
        entities = await strapi.services.post.find(ctx.query);
        countPost = await strapi.services.post.count(ctx.query);
      }

      entities = entities.map((entity) => {
        // ngoai admin ra khong thay dc bai rac
        let rObj = sanitizeEntity(entity, { model: strapi.models.post });

        delete rObj.content;
        delete rObj.keyword;
        delete rObj.tags;
        delete rObj.title_google;
        delete rObj.increment_id;
        delete rObj.description;
        delete rObj.description_google;
        rObj.permission = checkPermission(user, rObj);
        return rObj;
      });
      // remove trash if not admin
      if (user.role.name != "SuperAdmin") {
        _.remove(entities, (etm) => {
          return etm.posttype.type_code == "trash";
        });
      }

      return {
        posts: entities,
        totals: countPost ? countPost : 0,
      };
    } else {
      console.log("get post null ====>: ", idUser);

      return {
        posts: [],
        totals: 0,
      };
    }
  },

  /**
   * getlists records.
   *
   * @return {Object|Array}
   */

  async getlists(ctx) {
    let entities;
    let { id: idUser } = ctx.state.user;
    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id: idUser,
    });
    // handle post status
    let types = await strapi.services["posttype"].find();
    let findType = _.find(types, (ctv) => {
      return ctv.type_code == "ready";
    });
    ctx.query.posttype = findType._id;

    let countPost = 0;

    // handle _q params
    if (ctx.query._q) {
      // change to find, not use search any more
      let searchtxt = ctx.query._q;
      ctx.query.title_contains = searchtxt;
      delete ctx.query._q;
    }

    // handle _q params
    if (ctx.query._q) {
      // change to find, not use search any more
      let searchtxt = ctx.query._q;
      ctx.query.title_contains = searchtxt;
      delete ctx.query._q;
    }

    //handle _q param
    // console.log(ctx.query);
    if (ctx.query._q) {
      entities = await strapi.query("post").search(ctx.query);
      countPost = await strapi.query("post").countSearch(ctx.query);
    } else {
      entities = await strapi.services.post.find(ctx.query);
      countPost = await strapi.services.post.count(ctx.query);
    }

    entities = entities.map((entity) => {
      // ngoai admin ra khong thay dc bai rac
      let rObj = sanitizeEntity(entity, { model: strapi.models.post });
      // rObj["rule"] = rules;

      delete rObj.content;
      delete rObj.keyword;
      delete rObj.tags;
      delete rObj.title_google;
      delete rObj.increment_id;
      delete rObj.description;
      delete rObj.description_google;
      return rObj;
    });
    // remove trash if not admin
    if (user.role.name != "SuperAdmin") {
      _.remove(entities, (etm) => {
        return etm.posttype.type_code == "trash";
      });
    }

    return {
      posts: entities,
      totals: countPost ? countPost : 0,
    };
  },

  /**
   * rolyalties posts records.
   *
   * @return {Object|Array}
   */

  async rolyalties(ctx) {
    let entities;
    let { id: idUser } = ctx.state.user;
    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id: idUser,
    });

    delete ctx.query.type;

    // console.log(ctx.state.user)
    if (user.id) {
      if (!user.can_read_other) {
        ctx.query["user"] = user;
      }

      // handle post status
      let types = await strapi.services["posttype"].find();
      let findType = _.find(types, (ctv) => {
        return ctv.type_code == "ready";
      });
      ctx.query.posttype = findType._id;
      // handle post status

      // handle category
      let userCates = user.categories;
      if (ctx.query.categories) {
        let urlSlug = ctx.query.categories;
        delete ctx.query.categories;
        _.remove(userCates, (ctv) => {
          return ctv.url != urlSlug;
        });
      }

      let catFilter = [];
      _.forEach(userCates, (cat) => {
        catFilter.push(cat._id);
      });

      ctx.query.categories_in = catFilter;
      // handle category

      if (ctx.query.royalties_editor) {
        const editor = ctx.query.royalties_editor;
        delete ctx.query.royalties_editor;
        const royaltiesEditors = await strapi.services[
          "royalties-editor"
        ].find({ slug: editor });
        if (royaltiesEditors && royaltiesEditors.length > 0) {
          ctx.query.royalties_editor_in = royaltiesEditors[0]._id;
        }
      }

      if (ctx.query.pay_money) {
        const pay_money = ctx.query.pay_money;
        delete ctx.query.pay_money;
        if (pay_money == "no") {
          ctx.query["royalties_editor_value_null"] = true;
          // ctx.query["royalties_editor_null"] = true
        }
      }

      let countPost = 0;
      let totalMoneyEditor = 0;
      let totalMoneyPhoto = 0;
      // handle _q params
      if (ctx.query._q) {
        // change to find, not use search any more
        let searchtxt = ctx.query._q;
        ctx.query.title_contains = searchtxt;
        delete ctx.query._q;
      }
      //handle _q param

      // console.log(ctx.query);

      // handle _q params
      if (ctx.query._q) {
        // change to find, not use search any more
        let searchtxt = ctx.query._q;
        ctx.query.title_search_contains = slug(searchtxt, { lower: true });
        delete ctx.query._q;
      }

      if (ctx.query.title_search_contains) {
        // change to find, not use search any more
        ctx.query.title_search_contains = slug(
          ctx.query.title_search_contains,
          { lower: true }
        );
      }

      if (ctx.query._q) {
        entities = await strapi.query("post").search(ctx.query);
        countPost = await strapi.query("post").countSearch(ctx.query);
      } else {
        entities = await strapi.services.post.find(ctx.query);
        countPost = await strapi.services.post.count(ctx.query);
      }
      entities = entities.map((entity) => {
        let rObj = sanitizeEntity(entity, { model: strapi.models.post });
        if (entity.royalties_editor_value) {
          totalMoneyEditor +=
            parseInt(entity.royalties_editor_value.value) || 0;
        }
        if (entity.royalties_photo_value) {
          totalMoneyPhoto += parseInt(entity.royalties_photo_value.value) || 0;
        }

        delete rObj.content;
        delete rObj.keyword;
        delete rObj.tags;
        delete rObj.title_google;
        delete rObj.increment_id;
        delete rObj.description;
        delete rObj.description_google;
        return rObj;
      });
      return {
        posts: entities,
        totals: countPost ? countPost : 0,
        totalMoneyEditor: totalMoneyEditor ? totalMoneyEditor : 0,
        totalMoneyPhoto: totalMoneyPhoto ? totalMoneyPhoto : 0,
        totalMoney: totalMoneyEditor + totalMoneyPhoto,
      };
    } else {
      return {
        posts: [],
        totals: 0,
        totalMoneyEditor: 0,
        totalMoneyPhoto: 0,
        totalMoney: 0,
      };
    }
  },

  /**
   * rolyalties posts records.
   *
   * @return {Object|Array}
   */

  async clearlock(ctx) {
    let entities;
    let lastMinutes = moment().subtract(5, "minutes").format();

    ctx.query = {
      start_editing_lte: lastMinutes,
    };
    entities = await strapi.services.post.find(ctx.query);

    entities = entities.map((entity) => {
      strapi.query("post").update(
        { id: entity.id },
        {
          editing: null,
          editing_status: null,
          start_editing: "",
        }
      );
    });
    return {
      message: "done",
      date: lastMinutes,
      lengths: entities.length,
    };
  },

  /**
   * test posts records.
   *
   * @return {Object|Array}
   */

  async checkSchedule(ctx) {
    let entities;
    let lastMinutes = moment().subtract(60, "minutes").format();
    let nowMinustes = moment().format();
    ctx.query = {
      scheduleAt_gte: lastMinutes,
      scheduleAt_lte: nowMinustes,
    };
    entities = await strapi.services.post.find(ctx.query);
    const post_type_ready = await strapi.services["posttype"].findOne({
      type_code: "ready",
    });
    entities.forEach((entity) => {
      let tmpscheduleAt = entity.scheduleAt;
      strapi.query("post").update(
        { id: entity.id },
        {
          scheduleAt: null,
          publishedAt: tmpscheduleAt,
          posttype: post_type_ready,
        }
      );
    });

    return {
      message: "done",
      date: lastMinutes,
      lengths: entities.length,
      query: ctx.query,
    };
  },

  /**
   * Retrieve posts records.
   *
   * @return {Boolean}
   */

  async checkedit(ctx) {
    ctx.query = {
      editing_status: true,
    };
    let entities = await strapi.services.post.find(ctx.query);
    entities.forEach((entity) => {
      strapi.query("post").update(
        { id: entity.id },
        {
          editing: null,
          editing_status: null,
          start_editing: "",
        }
      );
    });
    return true;
  },

  /**
   * Retrieve a posts record.
   *
   * @return {Object}
   */

  async findOne(ctx) {
    let { id: idUser } = ctx.state.user;
    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id: idUser,
    });

    let entity = await strapi.services.post.findOne(ctx.params);
    entity = sanitizeEntity(entity, { model: strapi.models.post });

    entity.permission = checkPermission(user, entity);
    return entity;
  },

  /**
   * Retrieve a posts record.
   *
   * @return {Object}
   */

  async getDetailPost(ctx) {
    let { id: idUser } = ctx.state.user;
    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id: idUser,
    });

    let entity = await strapi.services.post.findOne(ctx.params);
    let permission = checkPermission(user, entity);

    // if(!entity.editing_status){

    //   // entity = await strapi.services.post.update(ctx.params, {
    //   //   editing_status: true,
    //   //   editing : user,
    //   //   start_editing: new Date()
    //   // });
    //   entity.just_init_lock = true;
    // }else{
    //   entity.just_init_lock = false;
    // }

    entity = sanitizeEntity(entity, { model: strapi.models.post });
    entity.permission = permission;
    return entity;
  },

  /**
   * Count posts records.
   *
   * @return {Number}
   */

  async count(ctx) {
    let { id: idUser } = ctx.state.user;
    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id: idUser,
    });

    let type_code = "";
    const type = ctx.query.type;
    switch (type) {
      case "da-dang":
        type_code = "ready";
        break;
      case "da-len-lich":
        type_code = "schedule";
        break;
      case "cho-duyet":
        type_code = "waiting";
        break;
      case "nhap":
        type_code = "draft";
        break;
      default:
        break;
    }
    delete ctx.query.type;
    if (user.id) {
      // let getRoleRule = await strapi.services["role-rule"].findOne({
      //   roles: user.role
      // });

      // console.log('user.can_read_other',user.can_read_other);

      let types = await strapi.services["posttype"].find();
      // let rules = _.filter(getRoleRule.rules, { status: true });
      // let readOther = _.find(rules, { rule_code: "read_other" });
      if (!user.can_read_other || type === "bai-cua-toi") {
        ctx.query["user"] = user;
      }

      if (ctx.query.categories_in) {
        const cates = ctx.query.categories_in;
        delete ctx.query.categories_in;
        const categories = _.filter(user.categories, {
          id: cates,
          status: true,
        });
        if (categories && categories.length > 0) {
          ctx.query["categories"] = categories;
        }
      } else {
        ctx.query["categories"] = user.categories;
      }
      let typeCode = _.find(types, { type_code: type_code });
      if (typeCode && typeCode.id) {
        ctx.query["posttype"] = typeCode.id;
      }
      return strapi.services.post.count(ctx.query);
    } else {
      return 0;
    }
  },

  // /**
  //  * Create a record.
  //  *
  //  * @return {Object}
  //  */

  // async create(ctx) {
  //   let entity;
  //   if (ctx.is('multipart')) {
  //     const { data, files } = parseMultipartData(ctx);
  //     entity = await strapi.services.post.create(data, { files });
  //   } else {
  //     entity = await strapi.services.post.create(ctx.request.body);
  //   }
  //   return sanitizeEntity(entity, { model: strapi.models.post });
  // },

  /**
   * Update a/an posts record.
   *
   * @return {Object}
   */

  async update(ctx) {
    let entity;

    let { id: idUser } = ctx.state.user;
    let preType = "";
    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id: idUser,
    });
    const clickButton = ctx.request.body.clickButton;
    delete ctx.request.body.clickButton;

    if (ctx.request.body.posttype) {
      if (
        ctx.request.body.posttype.type_code == "ready" &&
        !ctx.request.body.publishedAt
      ) {
        ctx.request.body.publishedAt = new Date();
      }
    }
    if (clickButton) {
      //remove editing from be
      ctx.request.body.editing_status = false;
      ctx.request.body.editing = null;
      ctx.request.body.start_editing = null;
    }

    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.post.update(ctx.params, data, {
        files,
      });
    } else {
      entity = await strapi.services.post.update(ctx.params, ctx.request.body);
    }
    //
    if (clickButton) {
      entity.userAction = {
        email: user.email,
      };
      entity.permission = checkPermission(user, entity);
      strapi.emitToAllUsers(entity);
    } else {
    }
    // clear cache facebook
    // Khi save Call Get tới URL: https://graph.facebook.com?id=[link cần xóa]&scrape=true
    if (entity.posttype.type_code == "ready") {
      const configuration = await strapi.services.configuration.find();
      let _frontendurl = _.find(
        configuration,
        (conf) => conf.label == "frontendurl"
      );
      let _frontendurlM = _.find(
        configuration,
        (conf) => conf.label == "frontendurlm"
      );
      let urlClear = `id=${_frontendurl.value + entity.post_url}&scrape=true`;
      let urlClearM = `id=${_frontendurlM.value + entity.post_url}&scrape=true`;
      fetch(`https://graph.facebook.com?${urlClear}`);
      fetch(`https://graph.facebook.com?${urlClearM}`);
    }

    return sanitizeEntity(entity, { model: strapi.models.post });
  },
  /**
   * updatelock a/an posts record.
   *
   * @return {Object}
   */

  async updatelock(ctx) {
    let entity;

    let { id: idUser } = ctx.state.user;
    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id: idUser,
    });

    let editing = null;
    if (ctx.request.body.editing) {
      editing = ctx.request.body.editing._id;
    }
    let dataupdate = {
      start_editing: ctx.request.body.start_editing,
      editing_status: ctx.request.body.editing_status,
      editing: editing,
    };

    entity = await strapi.services.post.update(ctx.params, dataupdate);
    strapi.emitLockToAllUsers(entity);
    return sanitizeEntity(entity, { model: strapi.models.post });
  },

  /**
   * Destroy a/an posts record.
   *
   * @return {Object}
   */

  async delete(ctx) {
    const entity = await strapi.services.post.delete(ctx.params);
    return sanitizeEntity(entity, { model: strapi.models.post });
  },

  async getListPublic(ctx) {
    let entities = [];
    let countPost = 0;
    let category_detail = {};
    let tag_detail = {};

    const start = parseInt(ctx.query.start) || 0;
    const limit = parseInt(ctx.query.limit) || 20;

    const post_type_ready = await strapi.services["posttype"].findOne({
      type_code: "ready",
    });

    if (!post_type_ready) {
      return {
        posts: null,
        totals: 0,
      };
    }

    const query = {
      posttype: post_type_ready._id,
      _limit: limit,
      _start: start,
      _sort: "publishedAt:desc",
    };

    if (ctx.query._sort) {
      query._sort = ctx.query._sort;
    }
    if (ctx.query._filter) {
      query._filter = ctx.query._filter;
    }

    if (typeof ctx.query.is_pr != undefined) {
      if (ctx.query.is_pr) {
        query.pr_type_gt = 0;
      } else {
        query.pr_type = 0;
      }
    }

    if (ctx.query.tag) {
      const tag = await strapi.services["tag"].findOne({ slug: ctx.query.tag });
      if (!tag) {
        return {
          posts: null,
          totals: 0,
        };
      }
      query.tags_in = [tag];
      tag_detail = tag;
    } else if (ctx.query.category) {
      const category = await strapi.services["category"].findOne({
        url: ctx.query.category,
      });
      if (!category) {
        return {
          posts: null,
          totals: 0,
        };
      }
      category_detail = category;
      query.categories_in = [category._id];
    } else if (ctx.query.q) {
      query.content_contains = ctx.query.q;
      // query.title_contains = ctx.query.q;
    } else if (ctx.query.updatedAt) {
      query.updatedAt_gte = `${ctx.query.updatedAt}T00:00:00.000Z`;
      query.updatedAt_lte = `${ctx.query.updatedAt}T23:59:59.999Z`;
    }

    if (query._q) {
      entities = await strapi.query("post").search(query);
      countPost = await strapi.query("post").countSearch(query);
    } else {
      entities = await strapi.services.post.find(query);
      countPost = await strapi.services.post.count(query);
    }

    entities = entities.map((entity) => {
      let rObj = sanitizeEntity(entity, { model: strapi.models.post });
      delete rObj.content;
      // delete rObj.keyword;
      // delete rObj.tags;
      delete rObj.title_google;
      // delete rObj.increment_id;
      delete rObj.description_google;
      delete rObj.sourcename;
      delete rObj.scheduleAt;
      delete rObj.__v;
      delete rObj.posttype;
      delete rObj.user;
      delete rObj.editing_status;
      delete rObj.start_editing;
      delete rObj.editing;
      delete rObj.publisher;
      delete rObj.contentpenname;
      delete rObj.royalties_editor_value;
      delete rObj.royalties_photo_value;
      delete rObj.media;
      delete rObj._id;
      delete rObj.content_creators;
      delete rObj.createdAt;
      delete rObj.contentdesigner;
      delete rObj.contentphoto;
      delete rObj.contentsource;
      delete rObj.contentvideo;
      delete rObj.royalties_editor;
      delete rObj.royalties_photographer;
      delete rObj.post_ia;

      rObj.tags = rObj.tags.map((item) => {
        return {
          label: item.label,
          slug: item.slug,
        };
      });
      rObj.categories = rObj.categories.map((item) => {
        return {
          name: item.name,
          slug: item.url,
        };
      });
      if (rObj.primary_category) {
        rObj.primary_category = {
          name: rObj.primary_category.name,
          slug: rObj.primary_category.url,
        };
      }

      rObj.slug = rObj.url;
      // delete rObj.url;
      rObj.id = rObj.increment_id;
      delete rObj.increment_id;
      return rObj;
    });

    let returndata = {
      posts: entities,
      totals: countPost ? countPost : 0,
    };

    // Show category detail
    if (category_detail.id) {
      let categorytmp = {
        name: category_detail.name,
        slug: category_detail.url,
        banner_top: category_detail.banner_top,
        banner_sidebar: category_detail.banner_sidebar,
        banner_endpost: category_detail.banner_endpost,
      };

      categorytmp.child = [];
      if (category_detail.categories && category_detail.categories.length > 0) {
        categorytmp.child = _.map(
          category_detail.categories,
          ({ name, url, banner_top, banner_sidebar, banner_endpost }) => ({
            name: name,
            slug: url,
            banner_top,
            banner_sidebar,
            banner_endpost,
          })
        );
      }

      returndata.category = categorytmp;
    }

    //Show tag detail
    if (tag_detail.id) {
      const tempTag = tag_detail;
      tempTag.id = tempTag.increment_id;

      delete tempTag._id;
      delete tempTag.status;
      delete tempTag.increment_id;

      returndata.tag = tag_detail;
    }

    if (returndata.posts && returndata.posts.length == 0) {
      return {
        posts: null,
        totals: 0,
      };
    }
    return returndata;
  },
  async getListPublicFacebookIA(ctx) {
    let entities = [];
    let countPost = 0;
    let category_detail = {};

    const start = parseInt(ctx.query.start) || 0;
    const limit = parseInt(ctx.query.limit) || 20;

    const post_type_ready = await strapi.services["posttype"].findOne({
      type_code: "ready",
    });

    if (!post_type_ready) {
      return {
        posts: null,
        totals: 0,
      };
    }

    const query = {
      posttype: post_type_ready._id,
      _limit: limit,
      _start: start,
    };

    if (ctx.query._sort) {
      query._sort = ctx.query._sort;
    }
    if (ctx.query._filter) {
      query._filter = ctx.query._filter;
    }

    if (ctx.query.tag) {
      const tag = await strapi.services["tag"].findOne({ slug: ctx.query.tag });
      query.tags_in = [tag];
    } else if (ctx.query.category) {
      const category = await strapi.services["category"].findOne({
        url: ctx.query.category,
      });
      category_detail = category;
      query.categories_in = [category._id];
    } else if (ctx.query.q) {
      query.content_contains = ctx.query.q;
      // query.title_contains = ctx.query.q;
    }

    if (query._q) {
      entities = await strapi.query("post").search(query);
      countPost = await strapi.query("post").countSearch(query);
    } else {
      entities = await strapi.services.post.find(query);
      countPost = await strapi.services.post.count(query);
    }

    entities = entities.map((entity) => {
      let rObj = sanitizeEntity(entity, { model: strapi.models.post });
      delete entity.scheduleAt;
      delete entity.__v;
      delete entity.posttype;
      delete entity.user;
      delete entity.editing_status;
      delete entity.start_editing;
      delete entity.editing;
      delete entity.publisher;
      delete entity.royalties_editor_value;
      delete entity.royalties_photo_value;
      delete entity.media;
      delete entity._id;
      delete entity.createdAt;
      entity.tags = entity.tags.map((item) => {
        return {
          label: item.label,
          slug: item.slug,
        };
      });
      entity.categories = entity.categories.map((item) => {
        return {
          name: item.name,
          slug: item.url,
        };
      });

      if (entity.primary_category) {
        entity.primary_category = {
          name: entity.primary_category.name,
          slug: entity.primary_category.url,
        };
      }

      rObj.slug = rObj.url;
      delete rObj.url;
      rObj.id = rObj.increment_id;
      delete rObj.increment_id;
      return rObj;
    });

    let returndata = {
      posts: entities,
      totals: countPost ? countPost : 0,
    };
    if (category_detail.id) {
      let categorytmp = {
        name: category_detail.name,
        slug: category_detail.url,
      };
      categorytmp.child = [];
      if (category_detail.categories && category_detail.categories.length > 0) {
        categorytmp.child = _.map(
          category_detail.categories,
          ({ name, url }) => ({ name: name, slug: url })
        );
      }

      returndata.category = categorytmp;
    }

    return returndata;
  },
  async getDetailPublic(ctx) {
    const id = ctx.params.id;
    const post_type_ready = await strapi.services["posttype"].findOne({
      type_code: "ready",
    });
    if (!post_type_ready) {
      return {};
    }

    let entity = await strapi.services.post.findOne({
      increment_id: id,
      posttype: post_type_ready._id,
    });
    entity = sanitizeEntity(entity, { model: strapi.models.post });
    if (entity) {
      delete entity.scheduleAt;
      delete entity.__v;
      delete entity.posttype;
      delete entity.user;
      delete entity.editing_status;
      delete entity.start_editing;
      delete entity.editing;
      delete entity.publisher;
      delete entity.royalties_editor_value;
      delete entity.royalties_photo_value;
      delete entity.media;
      delete entity._id;
      delete entity.createdAt;
      entity.tags = entity.tags.map((item) => {
        return {
          label: item.label,
          slug: item.slug,
        };
      });
      entity.categories = entity.categories.map((item) => {
        return {
          name: item.name,
          slug: item.url,
        };
      });

      entity.primary_category = {
        name: entity.primary_category.name,
        slug: entity.primary_category.url,
      };

      entity.id = entity.increment_id;
      delete entity.increment_id;
    }

    return entity;
  },
  async checkUrlPublic(ctx) {
    const { page = 1 } = ctx.query;
    const limit = 1000;

    const start = (page - 1) * limit;

    let entities = await strapi.services.post.find({
      _limit: limit,
      _start: start,
    });
    const count = await strapi.services.post.count();
    let wrongID = [];

    _.forEach(entities, (entity) => {
      if (
        !entity.increment_id ||
        entity.increment_id == "0" ||
        entity.increment_id == ""
      ) {
        entity.increment_id = moment().format("YYYYMMDDhmmss");
      }

      if (
        !entity.post_url ||
        entity.post_url == "" ||
        !entity.post_url.includes(entity.increment_id)
      ) {
        entity.post_url =
          "/" +
          entity.primary_category.url +
          "/" +
          entity.url +
          "-" +
          entity.increment_id +
          ".html";
        strapi.query("post").update(
          { id: entity.id },
          {
            increment_id: entity.increment_id,
            post_url: entity.post_url.toLowerCase(),
          }
        );
        wrongID.push(entity.post_url);
      }
    });

    return {
      list: wrongID,
      totals: count,
    };
  },
};
