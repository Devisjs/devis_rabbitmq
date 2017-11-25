/* Copyright (c) 2017 Devis, MIT License */

"use strict";

const devis = require("devis")
    .use("../index");

const rabbitOptions = {
    host: "localhost",
    port: 5672,
    queue: "1x"
}

devis.push({ method: "calculator", action: "add" }, (args, done) => {
    done(null, args.ar1 + args.ar2);
});

devis.listenMQ({ rabbitmq: rabbitOptions }, (err, res) => {
    if (err) console.log(err);
});
