const canvas = $('canvas.cells');
let context = canvas[0].getContext('2d');
const canvasWidth = canvas.width();
const canvasHeight = canvas.height();
canvas.attr({height: canvasHeight, width: canvasWidth});


class Vector {
  /**
   * Constructor for 2-dimensional Vector
   * @param x {number} x-coordinate
   * @param y {number} y-coordinate
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Returns new Vector created from the angle theta.
   * @param theta {number} angle in radians
   * @returns {Vector}
   */
  static fromAngle(theta) {
    return new Vector(Math.cos(theta), Math.sin(theta));
  }

  /**
   * Adds the x,y values of other Vector to this Vector and returns it.
   * @param other {Vector}
   * @returns {Vector}
   */
  add(other) {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  /**
   * Multiplies Vector by a constant number n and returns it.
   * @param n {number}
   * @returns {Vector}
   */
  multiply(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  /**
   * Returns the magnitude of the Vector.
   * @returns {number}
   */
  magnitude() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }

  /**
   * Normalizes the vector and returns it.
   * @returns {Vector}
   */
  normalize() {
    let magnitude = this.magnitude();
    this.x /= magnitude;
    this.y /= magnitude;
    return this;
  }
}


class Organism {
  /**
   * Constructor for Organism.
   * @param x {number} x-coordinate that the Organism will be drawn at on the canvas.
   * @param y {number} y-coordinate that the Organism will be drawn at on the canvas.
   * @param radius {number} radius of organism (circle) on canvas.
   * @param fillStyle {string} color of organism (circle) on canvas in rgb or hex.
   */
  constructor(x, y, radius, fillStyle) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.fillStyle = fillStyle;
  }

  /**
   * Draw organism as a colour filled circle on the canvas at the organisms x,y coordinates.
   */
  draw() {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    context.fillStyle = this.fillStyle;
    context.fill();
  }

  /**
   * Return the euclidean distance between this Organism and another organism
   * @param other {Organism}
   * @returns {number}
   */
  dist(other) {
    return Math.sqrt(Math.pow(other.x - this.x, 2) + Math.pow(other.y - this.y, 2));
  }

}


class Cell extends Organism {
  /**
   * Constructor for Cell.
   * @param x {number} x-coordinate on canvas that the Cell will be drawn at.
   * @param y {number} y-coordinate on canvas that the Cell will be drawn at.
   * @param energy {number} the amount of random directions / accelerations that the Cell can have.
   */
  constructor(x, y, energy) {
    super(x, y, 2, '#FFFFFF');

    this.startingX = x;
    this.startingY = y;

    this.velocity = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);

    this.directions = [];
    for (let i = 0; i < energy; i++) {
       this.directions.push(Vector.fromAngle(Math.random() * (2 * Math.PI)));
    }

    this.energy = energy - 1; // energy is used as an index for the directions array
    this.minEnergy = energy; // min amount of energy that this cell has had
    this.maxEnergy = energy;
    this.speed = 5;
    this.fitness = 0;
    this.isDead = false;
    this.reachedGoal = false;
  }

  /**
   * Move the Cell by updating its acceleration, velocity and x,y coordinates.
   */
  move() {
    this.acceleration = this.directions[this.energy]; // get acceleration Vector from directions

    this.velocity
        .add(this.acceleration)
        .normalize() // make velocity vector a unit vector to preserve direction given by acceleration
        .multiply(this.speed); // direction of velocity is different but speed is constant


    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }

  /**
   * Moves the Cell if it is alive, and checks if the Cell is in the boundaries of the canvas and if it has reached the goal.
   * If the Cell goes outside the boundaries of the Canvas or reaches the goal we consider it dead so we no longer update
   * it.
   * @param goal {Bacteria}
   */
  update(goal) {
    if (!this.isDead) {
      if (this.energy > 0) {
        this.move();
        this.energy--;
      } else {
        this.isDead = true;
      }

      if ((this.x + this.radius) >= canvasWidth || (this.x - this.radius) <= 0 || (this.y + this.radius) >= canvasHeight || (this.y - this.radius) <= 0) {
        this.isDead = true;
      }

      if (this.dist(goal) < goal.radius) {
        this.reachedGoal = true;
        this.isDead = true;
      }
    }
  }

  /**
   * Calculates the fitness of the Cell and sets the fitness attribute of the Cell.
   * If a Cell reached the goal it's at least as fit as a Cell that got the minimum distance away, a Cell that reached
   * the goal is fitter if it uses less energy. If a Cell did not reach the goal it is fitter the closer it is to the goal.
   * @param goal {Bacteria}
   */
  calcFitness(goal) {
    let minDist = goal.radius - this.radius; // minimum distance a Cell can be from the goal
    if (this.reachedGoal) { // Cell reached goal so the less energy used the fitter the Cell
      this.fitness = (1 / (minDist*minDist)) + this.energy*this.energy;
    } else { // Cell didn't reach goal so the fitness is determined by distance from goal, closer is fitter
      let dist = this.dist(goal);
      if (dist < minDist) {
        dist = minDist;
      }
      this.fitness = 1 / (dist*dist);
    }

  }

  /**
   * Mutates the cell by changing acceleration Vector in directions, the chance of a mutation is given by mutationRate.
   * For each acceleration Vector in the directions attribute there is a chance given by mutationRate that the
   * acceleration Vector will be replaced with a Vector that was used in the parent of this Cell, if no parent exists a
   * random Vector from directions is selected instead.
   * @param mutationRate {number} percentage chance that a mutation will occur
   */
  mutate(mutationRate) {
    let r = 0;
    let mutationCounter = 0;
    for (let i = 0; i < this.maxEnergy; i++) {
      r = Math.random(); // random number in range [0, 1)
      if (r < mutationRate) {
        mutationCounter++;
        r = Math.random();
        if (r < mutationRate) { // random direction
          this.directions[i] = Vector.fromAngle(Math.random() * (2 * Math.PI));
        } else { // direction that was used by parent of Cell
          this.directions[i] = this.directions[Math.floor(Math.random() * (this.maxEnergy - this.minEnergy) + this.minEnergy)];
        }
      }
    }

    // the more mutations that occur the darker the mutated cell will be
    let rgb = Math.floor(255 * (1 - (mutationCounter / this.maxEnergy))).toString();
    this.fillStyle = 'rgb(' + rgb + ', ' + rgb + ', ' + rgb + ')';
  }

  /**
   * Return clone of this instance and set the minimum energy to be the remaining energy of this instance.
   * @returns {Cell}
   */
  getChild() {
    let clone = this.clone();
    clone.minEnergy = this.energy;
    return clone;
  }

  /**
   * Return Cell that has the same directions, x,y and energy values that this instance had when it was created.
   * @returns {Cell}
   */
  clone() {
    let c = new Cell(this.startingX, this.startingY, this.maxEnergy);
    c.directions = [...this.directions];
    return c;
  }
}


class Bacteria extends Organism {
  /**
   * Constructor for Bacteria.
   * @param x {number} x-coordinate on canvas that Bacteria will be drawn at
   * @param y {number} y-coordinate on canvas that Bacteria will be drawn at
   */
  constructor(x, y) {
    super(x, y, 5, '#67B555');
  }
}


class Virus extends Organism {
  /**
   * Constructor for Virus.
   * @param x {number} x-coordinate on canvas that Virus will be drawn at
   * @param y {number} y-coordinate on canvas that Virus will be drawn at
   */
  constructor(x, y) {
    super(x, y, 4, '#4287F5')
  }
}


class Population {
  /**
   * Constructor for Population.
   * @param size
   * @param mutationRate {number} percentage chance that a mutation will occur
   * @param goal {Bacteria} the x,y coords of the goal is where the population of cells should move towards
   * @param numOfViruses {number}
   * @param viruses {Array} viruses are obstacles for cells in the population
   */
  constructor(size, mutationRate, goal, numOfViruses, viruses) {
    this.size = size;
    this.mutationRate = mutationRate;
    this.cells = [];
    for (let i = 0; i < size; i++) {
      this.cells.push(new Cell(canvasWidth / 2, canvasHeight - 5, 400));
    }
    this.goal = goal;
    this.numOfViruses = numOfViruses;
    this.viruses = viruses;
    this.fitness = 0; // sum of fitness of all cells in population
    this.generation = 1;
  }

  /**
   * Redraws the bacteria, viruses and cells after updating the cell coordinates and if all cells are dead it evolves the
   * population.
   */
  update() {
    context.clearRect(0, 0, canvasWidth, canvasHeight); // clears the canvas
    let allDead = true;
    this.goal.draw();
    this.drawViruses(); // draw the viruses (obstacles) in the canvas

    for (let i = 0; i < this.size; i++) {
      this.cells[i].update(this.goal); // check if cell is within boundaries, alive and move it
      if (this.virusKills(this.cells[i])) { // if cell[i] is too close to a Virus instance x,y coords it is now dead
        this.cells[i].isDead = true;
      }
      this.cells[i].draw();
      if (!this.cells[i].isDead) {
        allDead = false;
      }
    }

    if(allDead) {
      this.evolve(); // perform natural selection and evolve the population
      this.generation++;
      $('#generation').text(this.generation.toString()); // show the updated generation
    }
    window.requestAnimationFrame(() => this.update())
  }

  /**
   * draw each virus on the canvas
   */
  drawViruses() {
    for (let i = 0; i < this.numOfViruses; i++) {
      this.viruses[i].draw();
    }
  }

  /**
   * Returns true if organism has overlapped with a Virus instance
   * @param organism {Organism}
   * @returns {boolean}
   */
  virusKills(organism) {
    for (let i = 0; i < this.numOfViruses; i++) {
      if (organism.dist(this.viruses[i]) < this.viruses[i].radius) {
        return true;
      }
    }
  }

  /**
   * Evolve the population of cells.
   * Finds the fittest cell in the population, selects a parent cell and gets a child from it which is mutated and added
   * to the list of new cells. Fitter cells have a higher chance of being selected as a parent cell.
   */
  evolve() {
    let parent = null; // parent Cell
    let child = null; // child Cell
    let fittestCell = new Cell();
    let newCells = [];

    for (let i = 0; i < this.size - 1; i++) {
      if (this.cells[i].fitness > fittestCell.fitness) { // replace current fittestCell with a fitter Cell
        fittestCell = this.cells[i];
      }

      this.fitness = this.fitnessSum(); // fitness of population is the sum of fitness of all cells in population
      parent = this.selectParent(); // finds parent Cell, fitter cells have a higher chance of being selected
      child = parent.getChild();
      child.mutate(this.mutationRate);
      newCells.push(child);
    }

    fittestCell = fittestCell.clone();
    fittestCell.fillStyle = '#000000';
    newCells.push(fittestCell); // add clone of fittest Cell from the previous generation to our new generation
    this.cells = newCells;
  }

  /**
   * Returns the sum of fitness of all cells in the population
   * @returns {number}
   */
  fitnessSum() {
    let sum = 0;
    for (let i = 0; i < this.size; i++) {
      this.cells[i].calcFitness(this.goal);
      sum += this.cells[i].fitness;
    }
    this.fittness = sum;
    return sum;
  }

  /**
   * Selects a parent Cell from the population of cells where fitter cells have a higher chance of being returned.
   * Random number in range [0, population fitness sum) is selected, fitter cells decrease this number by more so have a
   * higher chance of making the number <= 0 and when this happens the current cell is returned.
   * @returns {Cell}
   */
  selectParent() {
    let randomFitness = Math.random() * this.fitness;  // get random value in range [0, population fitness sum)

    for (let i = 0; i < this.size; i++) {  // will always return a Cell
        randomFitness -= this.cells[i].fitness;
        if (randomFitness <= 0) {
          return this.cells[i];
        }
    }
  }
}


const populationSize = 1000; // number of cells in population
const mutationRate = 0.05;
const numOfViruses = 30; // number of viruses (obstacles for cells)
let viruses = [];
let randomX = 0;
let randomY = 0;
for (let i = 0; i < numOfViruses; i++) {
  randomX = Math.floor(Math.random() * canvasWidth);  // find random x coordinate
  randomY = Math.floor(Math.random() * canvasHeight); // find random y coordinate
  viruses.push(new Virus(randomX, randomY));
}

let population = new Population(populationSize, mutationRate, new Bacteria(canvasWidth / 2, 25), numOfViruses, viruses);

setTimeout(function(){
  window.requestAnimationFrame(() => population.update());
}, 1000);
