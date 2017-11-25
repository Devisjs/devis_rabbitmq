/* Copyright (c) 2017 Devis, MIT License */

"use strict";

const devis = require("devis");
const colors = require("colors/safe");
const amqp = require('amqplib/callback_api');
let rabbitmqOptions = [];
let channel = [];

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
                        devis.call(data.path, data.args, (err, res) => {
                            ch.sendToQueue(args.rabbitmq.queue + "Producer", new Buffer(JSON.stringify(res)));
                        });
                    }, { noAck: true });
                    let transportInfors={host:args.rabbitmq.host,port:args.rabbitmq.port};
                    console.log(colors.green("server launched using the following informations : rabbitMQ ", JSON.stringify(transportInfors)));
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
                    let transportInfors={host:args.rabbitmq.host,port:args.rabbitmq.port};
                    console.log(colors.green("connected using the following informations : ", JSON.stringify(transportInfors)));
                    channel[args.rabbitmq.queue] = ch;
                    callback(null, channel);
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
    channel[path.queue].sendToQueue(path.queue + "Consumer", new Buffer(JSON.stringify(dataToSend)));
    channel[path.queue].assertQueue(path.queue);

    channel[path.queue].consume(path.queue + "Producer", function (msg) {
        callback(null, msg.content.toString());
    }, { noAck: true });
    return devis;
}

devis.listenMQ = listen;
devis.clientMQ = client;
devis.callMQ = call;

module.exports = devis;