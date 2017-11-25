# Devis rabbitMQ transport
 <img  src="https://avatars3.githubusercontent.com/u/21971184?v=4&amp;s=200" href="http://devisjs.surge.sh" width="250" />

>An amqp transport plugin for Devis

## Install 
```bash
    $ npm install --save devis
    $ npm install --save devis_rabbitmq
```

## Example 
* Server.js
```js
const devis = require("devis")
    .use("devis_rabbitmq");

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
    .use("devis_rabbitmq");

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

promise.then((result) => {
    devis.callMQ({ queue: "1x", method: "calculator", action: "add" }, { ar1: 1, ar2: 2 }, (err, res) => {
        console.log(res);
    })
});
```