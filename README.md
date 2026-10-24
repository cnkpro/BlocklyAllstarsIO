# Blockly.IO

This is a clone of the original Paper-IO released by Voodoo, except for one aspect. This will attempt to implement a multi-player aspect of the game (like a real IO game). Currently this has a playground at this [link](https://thekidofarcrania.github.io/BlocklyIO). It's a demo version of what to come. Hopefully by that time, the necessary server infrastructure could be obtained.

This is just a fun side-project for me. If you would want to use this code, it would be nice to let me know.

## Playing

- Steer with the arrow keys or WASD. On phones and tablets, swipe or use the on-screen arrows.
- Leave your land to draw a tail, then come back to claim the area it encloses. Hitting another player's tail kills them; if someone hits yours, you're out.
- When you die, you see your final and best land share, kills, best rank and time alive before the next round.
- Each server room holds up to 81 players. New rooms open when the others are full (up to 8), and empty ones are closed again.


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
