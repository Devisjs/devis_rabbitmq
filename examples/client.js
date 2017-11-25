/* Copyright (c) 2017 Devis, MIT License */

"use strict";

const devis = require("devis")
    .use("../index");

const rabbitOptions = {
    host: "localhost",
    port: 5672,
    queue: "1x"
}

const promise = new Promise((resolve, reject) => {
    devis.clientMQ({ rabbitmq: rabbitOptions }, (err, res) => {
        if (err) reject(err);
        else {
            resolve(res);
        }
    });
});

promise.then((result,reject) => {
    devis.callMQ({ queue: "1x", method: "calculato1r", action: "add" }, { ar1: 1, ar2: 2 }, (err, res) => {
        console.log(res);
    })
});