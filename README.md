# cells-genetic-algorithm
Genetic algorithm which simulates 2d cells moving towards a goal (bacteria) and avoiding viruses.

Each organism is represented as a circle on the canvas, by default cells are white and the more mutations a cell has the darker
the cell is. Bacteria is green and the distance of a Cell from the Bacteria or the number of steps it took to reach the
Bacteria determine the fitness of the Cell. Viruses are blue, if a Cell comes into contact with a virus it dies. The best Cell
from the previous generation is black. 

Each Cell has an energy allowance, for each unit of energy the Cell accelerates in a direction. If the Cell runs out of energy,
comes into contact with another organism it is considered dead. 

It takes approx 200 generations for the population to converge. Different mutation methods and energy allowances for cells 
can increase or decrease the number of generations requried for convergence. 
