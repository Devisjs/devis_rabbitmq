# Devis rabbitMQ transport
 <img  src="https://avatars3.githubusercontent.com/u/21971184?v=4&amp;s=200" href="http://devisjs.surge.sh" width="250" />

>An amqp transport plugin for Devis

<p align="center">
  <a href="https://www.npmjs.com/package/devis_rabbitmq"><img src="https://img.shields.io/npm/v/devis_rabbitmq.svg" alt="Version"></a>
  <a href="https://github.com/Devisjs/devis_rabbitmq/actions/workflows/ci.yml"><img src="https://github.com/Devisjs/devis_rabbitmq/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

## Install 
Node.js 22 or later and a RabbitMQ server are required. Devis is a peer dependency, so install both:

```bash
    $ npm install --save devis
    $ npm install --save devis_rabbitmq
```

## Example 
* Server.js
```js
const devis = require("devis")
    .plug("devis_rabbitmq");

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

```
* Client.js

```js
const devis = require("devis")
    .plug("devis_rabbitmq");

const rabbitOptions = {
    host: "localhost",
    port: 5672,
    queue: "1x"
}

devis.clientMQ({ rabbitmq: rabbitOptions }, async (err) => {
    if (err) return console.log(err);
    const sum = await devis.callMQ({ queue: "1x", method: "calculator", action: "add" }, { ar1: 1, ar2: 2 });
    console.log(sum); // 3
});
```

Without a callback, `callMQ` returns a Promise that resolves the handler's result and rejects with an `Error`. With a callback, it receives the result as a JSON string, as in 2.0.

If the handler answers with an error, or no handler matches the pattern, the callback receives it as `err` (for example `"No handle found"`) and the server keeps running.

## How replies are routed

Requests go to the `<queue>Consumer` queue. Each client declares its own exclusive reply queue and tags every call with a correlation id, so concurrent calls always receive their own result.
Errors travel in the `error` header of the reply, so older clients still read the body as before.

## Upgrading from 1.x

* Node.js 22 or later and Devis 3 or 4 are required. Devis is now a peer dependency.
* 1.x clients shared the `<queue>Producer` reply queue, so concurrent calls could receive another call's result or none at all. A 2.x server still answers 1.x clients on that queue, but upgrade clients too.
* Up to 2.0.0, an unknown pattern or a handler error crashed the server and left the caller without an answer. Since 2.0.1 the caller receives the error.
