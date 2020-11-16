'use strict';

/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK] [YEAR (optional)]
 */
const _ = require("lodash");
const moment = require("moment");
module.exports = {
  /**
   * Simple example.
   * Every monday at 1am.
   */
  // '0 1 * * 1': () => {
  //
  // }
  //   *    *    *    *    *    *
  // ┬    ┬    ┬    ┬    ┬    ┬
  // │    │    │    │    │    |
  // │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
  // │    │    │    │    └───── month (1 - 12)
  // │    │    │    └────────── day of month (1 - 31)
  // │    │    └─────────────── hour (0 - 23)
  // │    └──────────────────── minute (0 - 59)
  // └───────────────────────── second (0 - 59, OPTIONAL)

  '30 * * * * *': async () => {
    console.log('1 minute => run cron release lock');
    let entities;
    let lastMinutes = moment().subtract(5, "minutes").format();

    let query = {
      start_editing_lte: lastMinutes,
    };
    entities = await strapi.services.post.find(query);

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

    console.log(new Date());
    console.log(entities.length);
  },

  '*/10 * * * *': async () => {
    console.log('10 minute => run cron checkSchedule');
    let entities;
    let lastMinutes = moment().subtract(60, "minutes").format();
    let nowMinustes = moment().format();

    const post_type_ready = await strapi.services["posttype"].findOne({
      type_code: "ready",
    });


    let query = {
      scheduleAt_gte: lastMinutes,
      scheduleAt_lte: nowMinustes,
    };
    entities = await strapi.services.post.find(query);

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
    
    console.log(entities.length);
  },
};
