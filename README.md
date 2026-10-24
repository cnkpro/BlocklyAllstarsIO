# Blockly.IO

This is a clone of the original Paper-IO released by Voodoo, except for one aspect. This will attempt to implement a multi-player aspect of the game (like a real IO game). Currently this has a playground at this [link](https://thekidofarcrania.github.io/BlocklyIO). It's a demo version of what to come. Hopefully by that time, the necessary server infrastructure could be obtained.

This is just a fun side-project for me. If you would want to use this code, it would be nice to let me know.



## Running

After cloning this repository, run the following commands to install dependencies and start the server:

```bash
npm install
npm start
```

Then open http://localhost:3000. The page and the game socket are served on the same port.
To use a different host/port, run `node server.js <hostname> <port>` or set the `PORT` environment variable.

### Bots
With the server running, you can add AI players:

```bash
npm run bot -- http://localhost:3000 "[BOT] Bob"
npm run paper-io-bot -- http://localhost:3000
```

### Creating bundle.js
`public/bundle.js` is built from `game-client.js` with browserify. Rebuild it after changing any client code:

```bash
npm run build
```

### Tests
```bash
npm test
```

## License

This is licensed under MIT. As such, please provide due credit and link back to this repository if possible.
