const {
  GAME_SPEED,
  INITIAL_SNAKE_SIZE,
  SNAKE_COLORS,
  DOT_COLORS,
  SNAKE_COLLISIONS
} = require('./constants')

const { Snake } = require('./Snake')
const { Dot } = require('./Dot')

/**
 * @class Game
 *
 * The Game class tracks the state of three things:
 *
 * 1. The snake, including its direction, velocity, and location
 * 2. The dot
 * 3. The score
 *
 * The i/o of the game is handled by a separate UserInterface class, which is
 * responsible for detecting all event handlers (key press), creating the
 * screen, and drawing elements to the screen.
 */
class Game {
  constructor(ui, server) {
    // User interface class for all i/o operations
    this.ui = ui
    this.server = server
    
    this.reset()

    // Bind handlers to UI so we can detect input change from the Game class
    this.ui.bindHandlers(
      () => {}, //this.changeDirection.bind(this),
      this.quit.bind(this),
      this.start.bind(this)
    )

    this.server.bindHandlers(
      this.changeDirection.bind(this),
      this.newPlayer.bind(this),
      this.playerLeft.bind(this)
    )
  }

  reset() {
    // Set up initial state
    this.snakes = []
    this.dots = []
    this.score = 0
    this.timer = null

    // Generate the first dot before the game begins
    // this.generateDot()
    this.ui.resetScore()
    this.ui.render()
  }

  /**
   * Support WASD and arrow key controls. Update the direction of the snake, and
   * do not allow reversal.
   */
  changeDirection(key, client) {
    const snake = this.snakes.find(s => s.client === client)
    if (snake) {
      snake.changeDirection(key.name)
    }
  }

  newPlayer(client) {
    const snake = new Snake(
      client,
      INITIAL_SNAKE_SIZE, 
      this.randomItem(SNAKE_COLORS), 
      this.snakeMoved.bind(this)
    )
    this.snakes.push(snake)
  }

  randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  playerLeft(client) {
    const index = this.snakes.findIndex(s => s.client === client)
    if (index >= 0) this.removeSnake(this.snakes[index], index)
  }

  checkDotHits(position, snake) {
    for (const [i, dot] of this.dots.entries()) {
      if (position.x === dot.x && position.y === dot.y) {
        snake.scored()
        this.ui.updateScore(snake.score)
        this.removeDot(dot, i)
        return
      }
    }
  }

  /**
   * Set the velocity of the snake based on the current direction. Create a new
   * head by adding a new segment to the beginning of the snake array,
   * increasing by one velocity. Remove one item from the end of the array to
   * make the snake move, unless the snake collides with a dot - then increase
   * the score and increase the length of the snake by one.
   *
   */
  snakeMoved(position, snake) {
    // If the snake lands on a dot, increase the score and generate a new dot
    // check collisions with Dots
    this.checkDotHits(position, snake)
  }

  randomNum(min, max) {
    // Get a random coordinate from 0 to max container height/width
    return Math.round(Math.random() * (max - min) + min)
  }

  generateDot() {
    // Generate a dot at a random x/y coordinate
    const x = this.randomNum(0, this.ui.gameContainer.width - 1)
    const y = this.randomNum(1, this.ui.gameContainer.height - 1)
    
    // If the pixel is on a snake, regenerate the dot
    if (this.snakes.some(s => s.isAt({ x, y }))) {
      return this.generateDot()
    } 
    // TODO: If the pixel is on another dot, regenerate the dot
    
    const dot = new Dot(x, y, this.randomItem(DOT_COLORS))
    this.dots.push(dot)
  }

  generateDots() {
    const maxDots = Math.ceil(this.snakes.length / 2)
    const diff = maxDots - this.dots.length
    for (let i = 0; i < diff; i++) this.generateDot()
  }

  drawSnakes() {
    // Render each snake segment as a pixel
    for (let snake of this.snakes) {
      this.drawSnake(snake)
    }
  }

  drawSnake(snake) {
    snake.segments.forEach((segment, i) => {
      this.ui.draw(segment, i === 0 ? 'gray' : snake.color)
    })
  }

  drawDots() {
    // Render the dot as a pixel
    for (const dot of this.dots) {
      this.ui.draw(dot, dot.color)
    }
  }

  removeSnake(snake, index) {
    snake.bye()
    if (index !== undefined && index >= 0) {
      this.snakes.splice(index, 1)
    }
  }

  removeDot(dot, index) {
    if (index !== undefined && index >= 0) {
      this.dots.splice(index, 1)
    }
  }

  checkPlayerHits() {
    const width = this.ui.gameContainer.width
    const height = this.ui.gameContainer.height

    for (let [i, snake] of this.snakes.entries()) {
      if (snake.hit(width, height)) {
        return this.removeSnake(snake, i)
      }

      if (SNAKE_COLLISIONS) {
        for (let [j, otherSnake] of this.snakes.entries()) {
          if (i !== j && snake.hitSnake(otherSnake)) {
            return this.removeSnake(snake, i)
          }
        }
      }
    }
  }

  tick() {
    this.checkPlayerHits()
    this.ui.clearScreen()
    this.generateDots()
    this.drawDots()
    this.drawSnakes()
    this.ui.render()
  }

  start() {
    if (!this.timer) {
      this.reset()

      this.timer = setInterval(this.tick.bind(this), GAME_SPEED)
    }
  }

  quit() {
    process.exit(0)
  }
}

module.exports = { Game }
