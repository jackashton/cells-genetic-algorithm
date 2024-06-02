import { Vector2D } from './utils/vector';
import { rgbToHex } from './utils/color';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const context = canvas.getContext('2d');

class Organism {
  position: Vector2D;
  radius: number;
  color: string;

  /**
   * Constructor for Organism.
   * @param position - coordinates that the Organism will be drawn at on the canvas.
   * @param radius - radius of organism (circle) on canvas.
   * @param color - color of organism (circle) on canvas in rgb or hex.
   */
  constructor(position: Vector2D, radius: number, color: string) {
    this.position = position;
    this.radius = radius;
    this.color = color;
  }

  /**
   * Draw organism as a colour filled circle on the canvas at the organisms x,y coordinates.
   */
  draw() {
    if (!context) return;
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI, false);
    context.fillStyle = this.color;
    context.fill();
  }

  /**
   * Return the Euclidean distance between this Organism and another organism
   */
  dist(other: Organism) {
    return this.position.distance(other.position);
  }
}

class Cell extends Organism {
  startPosition: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  directions: Vector2D[];
  energy: number;
  minEnergy: number;
  maxEnergy: number;
  speed: number;
  fitness: number;
  isDead: boolean;
  reachedGoal: boolean;

  /**
   * Constructor for Cell.
   * @param position - coordinates on canvas that the Cell will be drawn at.
   * @param energy - the amount of random directions / accelerations that the Cell can have.
   */
  constructor(position: Vector2D, energy: number) {
    super(position, 2, '#FFFFFF');

    this.startPosition = position.clone();

    this.velocity = new Vector2D(0, 0);
    this.acceleration = new Vector2D(0, 0);

    this.directions = [];
    for (let i = 0; i < energy; i++) {
      this.directions.push(Vector2D.fromAngle(Math.random() * (2 * Math.PI)));
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
    this.acceleration = this.directions[this.energy]; // get acceleration Vector2D from directions

    this.velocity = this.velocity
      .add(this.acceleration)
      .normalize() // make velocity vector a unit vector to preserve direction given by acceleration
      .multiply(this.speed); // direction of velocity is different but speed is constant

    this.position = this.position.add(this.velocity);
  }

  /**
   * Moves the Cell if it is alive, and checks if the Cell is in the boundaries of the canvas and if it has reached the goal.
   * If the Cell goes outside the boundaries of the Canvas or reaches the goal we consider it dead so we no longer update
   * it.
   * @param goal
   */
  update(goal: Bacteria) {
    if (!this.isDead) {
      if (this.energy > 0) {
        this.move();
        this.energy--;
      } else {
        this.isDead = true;
      }

      if (
        this.position.x + this.radius >= canvas.width ||
        this.position.x - this.radius <= 0 ||
        this.position.y + this.radius >= canvas.height ||
        this.position.y - this.radius <= 0
      ) {
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
   * @param goal
   */
  calcFitness(goal: Bacteria) {
    const minDist = goal.radius - this.radius; // minimum distance a Cell can be from the goal
    if (this.reachedGoal) {
      // Cell reached goal so the less energy used the fitter the Cell
      this.fitness = 1 / (minDist * minDist) + this.energy * this.energy;
    } else {
      // Cell didn't reach goal so the fitness is determined by distance from goal, closer is fitter
      let dist = this.dist(goal);
      if (dist < minDist) {
        dist = minDist;
      }
      this.fitness = 1 / (dist * dist);
    }
  }

  /**
   * Mutates the cell by changing acceleration Vector2D in directions, the chance of a mutation is given by mutationRate.
   * For each acceleration Vector2D in the directions attribute there is a chance given by mutationRate that the
   * acceleration Vector2D will be replaced with a Vector2D that was used in the parent of this Cell, if no parent exists a
   * random Vector2D from directions is selected instead.
   * @param mutationRate - percentage chance that a mutation will occur
   */
  mutate(mutationRate: number) {
    let r = 0;
    let mutationCounter = 0;
    for (let i = 0; i < this.maxEnergy; i++) {
      r = Math.random(); // random number in range [0, 1)
      if (r < mutationRate) {
        mutationCounter++;
        r = Math.random();
        if (r < mutationRate) {
          // random direction
          this.directions[i] = Vector2D.fromAngle(Math.random() * (2 * Math.PI));
        } else {
          // direction that was used by parent of Cell
          this.directions[i] =
            this.directions[Math.floor(Math.random() * (this.maxEnergy - this.minEnergy) + this.minEnergy)];
        }
      }
    }

    // the more mutations that occur the darker the mutated cell will be
    const channel = Math.floor(255 * (1 - mutationCounter / this.maxEnergy));
    this.color = rgbToHex(channel, channel, channel);
  }

  /**
   * Return clone of this instance and set the minimum energy to be the remaining energy of this instance.
   */
  getChild() {
    const clone = this.clone();
    clone.minEnergy = this.energy;
    return clone;
  }

  /**
   * Return Cell that has the same directions, x,y and energy values that this instance had when it was created.
   */
  clone() {
    const clone = new Cell(this.startPosition, this.maxEnergy);
    clone.directions = [...this.directions];
    return clone;
  }
}

class Bacteria extends Organism {
  /**
   * Constructor for Bacteria.
   * @param position - coordinates on canvas that Bacteria will be drawn at
   */
  constructor(position: Vector2D) {
    super(position, 5, '#67B555');
  }
}

class Virus extends Organism {
  /**
   * Constructor for Virus.
   * @param position - coordinates on canvas that Virus will be drawn at
   */
  constructor(position: Vector2D) {
    super(position, 4, '#4287F5');
  }
}

class Population {
  size: number;
  mutationRate: number;
  cells: Cell[];
  goal: Bacteria;
  numOfViruses: number;
  viruses: Virus[];
  fitness: number;
  generation: number;

  /**
   * Constructor for Population.
   * @param size
   * @param mutationRate - percentage chance that a mutation will occur
   * @param goal - the x,y coords of the goal is where the population of cells should move towards
   * @param numOfViruses
   * @param viruses - viruses are obstacles for cells in the population
   */
  constructor(size: number, mutationRate: number, goal: Bacteria, numOfViruses: number, viruses: Virus[]) {
    this.size = size;
    this.mutationRate = mutationRate;
    this.cells = [];
    for (let i = 0; i < size; i++) {
      this.cells.push(new Cell(new Vector2D(canvas.width / 2, canvas.height - 5), 400));
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
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);

    this.goal.draw();
    this.drawViruses(); // draw the viruses (obstacles) in the canvas

    let allDead = true;
    for (let i = 0; i < this.size; i++) {
      this.cells[i].update(this.goal); // check if cell is within boundaries, alive and move it
      if (this.virusKills(this.cells[i])) {
        // if cell[i] is too close to a Virus instance x,y coords it is now dead
        this.cells[i].isDead = true;
      }
      this.cells[i].draw();
      if (!this.cells[i].isDead) {
        allDead = false;
      }
    }

    // evolve population, update generation and display label
    if (allDead) {
      // perform natural selection and evolve the population
      this.evolve();
      this.generation++;
      const label = document.getElementById('generation');
      if (label) label.innerText = this.generation.toString();
    }
    window.requestAnimationFrame(() => this.update());
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
   * @param organism
   */
  virusKills(organism: Organism) {
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
    let parent: Cell;
    let child: Cell;
    let fittestCell = new Cell(new Vector2D(0, 0), 0);
    const newCells = [];

    for (let i = 0; i < this.size - 1; i++) {
      if (this.cells[i].fitness > fittestCell.fitness) {
        // replace current fittestCell with a fitter Cell
        fittestCell = this.cells[i];
      }

      this.fitness = this.fitnessSum(); // fitness of population is the sum of fitness of all cells in population
      parent = this.selectParent(); // finds parent Cell, fitter cells have a higher chance of being selected
      child = parent.getChild();
      child.mutate(this.mutationRate);
      newCells.push(child);
    }

    fittestCell = fittestCell.clone();
    fittestCell.color = '#000000';
    newCells.push(fittestCell); // add clone of fittest Cell from the previous generation to our new generation
    this.cells = newCells;
  }

  /**
   * Returns the sum of fitness of all cells in the population
   */
  fitnessSum() {
    let sum = 0;
    for (let i = 0; i < this.size; i++) {
      this.cells[i].calcFitness(this.goal);
      sum += this.cells[i].fitness;
    }
    this.fitness = sum;
    return sum;
  }

  /**
   * Selects a parent Cell from the population of cells where fitter cells have a higher chance of being returned.
   * Random number in range [0, population fitness sum) is selected, fitter cells decrease this number by more so have a
   * higher chance of making the number <= 0 and when this happens the current cell is returned.
   */
  selectParent() {
    let randomFitness = Math.random() * this.fitness; // get random value in range [0, population fitness sum)

    for (let i = 0; i < this.size; i++) {
      // will always return a Cell
      randomFitness -= this.cells[i].fitness;
      if (randomFitness <= 0) {
        return this.cells[i];
      }
    }

    // should never be called just here to satisfy type requirements
    return this.cells[0];
  }
}

const populationSize = 1000; // number of cells in population
const mutationRate = 0.05;
const numOfViruses = 30; // number of viruses (obstacles for cells)
const viruses = [];
let randomX = 0;
let randomY = 0;
for (let i = 0; i < numOfViruses; i++) {
  randomX = Math.floor(Math.random() * canvas.width); // find random x coordinate
  randomY = Math.floor(Math.random() * canvas.height); // find random y coordinate
  viruses.push(new Virus(new Vector2D(randomX, randomY)));
}

const population = new Population(
  populationSize,
  mutationRate,
  new Bacteria(new Vector2D(canvas.width / 2, 25)),
  numOfViruses,
  viruses,
);

population.update();
