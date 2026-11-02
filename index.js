/* Copyright (c) 2017 Devis, MIT License */

"use strict";

const devis = require("devis");
const { styleText } = require("node:util");
const { randomUUID } = require("node:crypto");
const amqp = require('amqplib/callback_api');
let rabbitmqOptions = [];
let channel = [];
let replyQueue = [];
let pending = new Map();

//Producer
function listen(args, callback) {
    //connect to RabbitMQ
    if (args.rabbitmq.port === undefined) args.rabbitmq.port = "5672";
    amqp.connect('amqp://' + args.rabbitmq.host + ":" + args.rabbitmq.port, function (err, conn) {
        if (err) {
            callback(err, null);
        }
        else {
            //create a channel
            conn.createChannel(function (err, ch) {
                if (err) {
                    callback(err, null);
                }
                else {
                    ch.assertQueue(args.rabbitmq.queue + "Producer");
                    ch.assertQueue(args.rabbitmq.queue + "Consumer");

                    ch.consume(args.rabbitmq.queue + "Consumer", function (msg) {
                        let data = msg.content.toString();
                        data = JSON.parse(data);
                        delete data.path["queue"];
                        // 1.x clients send no replyTo and read the shared Producer queue.
                        let replyTo = msg.properties.replyTo || args.rabbitmq.queue + "Producer";
                        devis.call(data.path, data.args, (err, res) => {
                            ch.sendToQueue(replyTo, Buffer.from(JSON.stringify(res)), { correlationId: msg.properties.correlationId });
                        });
                    }, { noAck: true });
                    let transportInfors={host:args.rabbitmq.host,port:args.rabbitmq.port};
                    console.log(styleText("green", "server launched using the following informations : rabbitMQ " + JSON.stringify(transportInfors)));
                    callback(null, "Hello producer!");
                }
            });
        }
    });
    return devis;
}

function client(args, callback) {
    rabbitmqOptions[args.rabbitmq.queue] = args.rabbitmq;

    if (args.rabbitmq.port === undefined) args.rabbitmq.port = "5672";

    amqp.connect('amqp://' + args.rabbitmq.host + ":" + args.rabbitmq.port, function (err, conn) {
        if (err) {
            callback(err, null);
        }
        else {
            //create a channel
            conn.createChannel(function (err, ch) {
                if (err) {
                    callback(err, null);
                }
                else {
                    // Each client reads replies from its own queue so concurrent calls get their own answer.
                    ch.assertQueue("", { exclusive: true }, function (err, q) {
                        if (err) {
                            return callback(err, null);
                        }
                        ch.consume(q.queue, function (msg) {
                            let reply = pending.get(msg.properties.correlationId);
                            if (reply) {
                                pending.delete(msg.properties.correlationId);
                                reply(null, msg.content.toString());
                            }
                        }, { noAck: true });
                        let transportInfors={host:args.rabbitmq.host,port:args.rabbitmq.port};
                        console.log(styleText("green", "connected using the following informations : " + JSON.stringify(transportInfors)));
                        channel[args.rabbitmq.queue] = ch;
                        replyQueue[args.rabbitmq.queue] = q.queue;
                        callback(null, channel);
                    });
                }
            });
        }
    });
    return devis;
}

function call(path, args, callback) {
    let dataToSend = {
        path: path,
        args: args
    }
    let correlationId = randomUUID();
    pending.set(correlationId, callback);
    channel[path.queue].sendToQueue(path.queue + "Consumer", Buffer.from(JSON.stringify(dataToSend)), {
        replyTo: replyQueue[path.queue],
        correlationId: correlationId
    });
    return devis;
}

devis.listenMQ = listen;
devis.clientMQ = client;
devis.callMQ = call;

module.exports = devis;