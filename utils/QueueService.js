var amqp = require("amqplib/callback_api");
require("dotenv").config();

class QueueService {
  constructor() {
    this.channel;
    this.connection;
    this.queue = process.env.RABBITMQ_QUEUE_NAME;

    if (!!QueueService.instance) {
      return QueueService.instance;
    }
    this.init();

    QueueService.instance = this;
    return this;
  }

  async init() {
    amqp.connect(
      `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`,
      async function (error0, connection) {
        if (error0) {
          throw error0;
        }
        connection.on("error", function (err) {
          if (err.message !== "Connection closing") {
            console.error("[AMQP] conn error", err.message);
          }
        });
        connection.on("close", function () {
          console.error("[AMQP] reconnecting");
          return setTimeout(init, 1000);
        });

        const mChannel = await connection.createChannel(function (
          error1,
          channel
        ) {
          if (error1) {
            throw error1;
          }

          channel.on("error", function (err) {
            console.error("[AMQP] channel error", err.message);
          });
          channel.on("close", function () {
            console.log("[AMQP] channel closed");
          });

          channel.assertQueue(QueueService.instance.queue, {
            durable: true,
          });

          return channel;
        });

        QueueService.instance.channel = mChannel;
        QueueService.instance.connection = connection;
      }
    );
  }

  sendMessage(msg) {
    if(!this.channel){
      console.log("Cannot send queue");
      return;
    }

    this.channel.sendToQueue(this.queue, Buffer.from(msg), {
      persistent: true,
    });

    // console.log(" [x] Sent %s", msg);
  }

  closeConnection() {
    this.connection.close();
  }
}
module.exports = new QueueService();
