'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/3.0.0-beta.x/configurations/configurations.html#bootstrap
 */
require('dotenv').config({ path: require('find-config')('.env') })
const sockets = require('socket.io')
module.exports = () => {
    var allowedOrigins = "http://localhost:* http://127.0.0.1:* http://cms.sgtimes.xyz:*";
    var io = sockets((strapi.server),{transports: [ 'websocket', 'polling' ]});
    // var redisAdapter = require('socket.io-redis');
    // io.adapter(redisAdapter({ host: "127.0.0.1" , port: "6379" }));

    strapi.io = io;
    // send to all users connected
    strapi.emitToAllUsers = post => io.emit('updated_post', post);

    strapi.emitLockToAllUsers = post => io.emit('locked_post', post);
};
