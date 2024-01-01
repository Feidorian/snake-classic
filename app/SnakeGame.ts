import p5Types from 'p5';
import QuickSettings from './lib/quicksettings.js';
import secureLocalStorage from 'react-secure-storage';

const defaultSettings = {
	'Controls (Desktop Only)': `<div>
  <div class="flex justify-between items-center">
  <p class='text-lg'>up</p>
  <div>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">W</kbd>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">I</kbd>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">▲</kbd>
  </div>
  </div>
  <div class="flex justify-between items-center">
  <p class='text-lg'>down</p>
  <div>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">S</kbd>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">K</kbd>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">▼</kbd>
  </div>
  </div>
  <div class="flex justify-between items-center">
  <p class='text-lg'>left</p>
  <div>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">A</kbd>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">J</kbd>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">◀︎</kbd>
  </div>
  </div>
  <div class="flex justify-between items-center">
  <p class='text-lg'>right</p>
  <div>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">D</kbd>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">L</kbd>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">▶︎</kbd>
  </div>
  </div>
  <div class="flex justify-between items-center">
  <p class='text-lg'>quit</p>
  <div>
  <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">T</kbd>
  </div>
  </div>
</div>`,
	'Padding Color': '#0000ff',
	'Wrap Window Borders': false,
	'Cell Size': 18,
	'Snake Head Color': '#ff0000',
	'Snake Body Color': '#ffffff',
	'Snack (Food) Color': '#00ff00',
	'Show Cell borders': true,
	'Initial Speed': 6,
	'Last Score': '0',
	'Max Score': '0',
};
export default class SnakeGame {
	private p5: p5Types | undefined;
	private quickSettings: typeof QuickSettings | undefined;

	private gameState = {
		gameOver: true,
		score: 0,
		snackScore: 0,
	};
	//layout
	private readonly scoreElemColor = '#a6adbb';
	private readonly windowPadding: number = 10;
	private readonly backgroundColor = '#000000';
	private readonly cellBorderColor = '#323232';
	private readonly frameRateIncrement = 1;
	private readonly scoreIncrement = 10;
	private frameRateStartIncrement = 3; // snackScore at which we start increasing speed
	private frameRateEndIncrement = 60; // maximum speed we can increase to.
	private frameRateIncrementInterval = 4; // snackScore interval at which we update frameRate
	private scoreElem: p5Types.Element | null = null;
	private speedElem: p5Types.Element | null = null;

	private windowPaddingColor: string = defaultSettings['Padding Color'];
	private cellSize: number = defaultSettings['Cell Size'];
	private initFrameRate: number = defaultSettings['Initial Speed'];
	private currentFrameRate: number | undefined;
	private cellBorderOn: boolean = defaultSettings['Show Cell borders'];
	private wrapBorders: boolean = defaultSettings['Wrap Window Borders'];

	//snake
	private readonly initSnakeLength = 3;
	private readonly snakeLengthIncrement = 3;
	private snake: p5Types.Vector[] = [];
	private snakeHeadColor: string = defaultSettings['Snake Head Color'];
	private snakeBodyColor: string = defaultSettings['Snake Body Color'];
	private currentDirection: p5Types.Vector | undefined;

	//Snack
	private snackColor: string = defaultSettings['Snack (Food) Color'];
	private snackLocation: p5Types.Vector | undefined | null;

	// Derived
	private get windowWidth() {
		// subtract the padding left and right from the available width
		let width = this.p5!.windowWidth - this.windowPadding * 2;
		// We want a perfect grid of cells (width must be divisible by cell size)
		// So subtract any extra width and implicitly consider it part of the padding
		return width - (width % this.cellSize);
	}

	private get windowHeight() {
		// subtract the padding top and bottom from the available width
		let height = this.p5!.windowHeight - this.windowPadding * 2;
		// We want a perfect grid of cells (width must be divisible by cell size)
		// So subtract any extra width and implicitly consider it part of the padding
		return height - (height % this.cellSize);
	}

	private get rowCount() {
		return Math.ceil(this.windowHeight / this.cellSize);
	}
	private get colCount() {
		return Math.ceil(this.windowWidth / this.cellSize);
	}

	private get directions() {
		const RIGHT = this.p5!.createVector(1, 0);
		const LEFT = this.p5!.createVector(-1, 0);
		const UP = this.p5!.createVector(0, -1);
		const DOWN = this.p5!.createVector(0, 1);
		return {RIGHT, LEFT, UP, DOWN};
	}

	private vEquals(v1: p5Types.Vector, v2: p5Types.Vector): boolean {
		return v1.x === v2.x && v1.y === v2.y;
	}

	private updateScore(val: number) {
		this.gameState.score = val;
		this.scoreElem?.html(`Score = ${val}`);
	}

	/** returns true if snake is colliding with a border wall */
	private get isBorderCollision(): boolean {
		if (this.gameState.gameOver) return false; // if game is over, game should not be running, hence no collisions
		if (this.wrapBorders) return false;
		const {x, y} = this.snake[0];
		return x < 0 || x >= this.colCount || y < 0 || y >= this.rowCount;
	}

	/** Returns true if snake is colliding with itself */
	private get isSelfCollision(): boolean {
		if (this.gameState.gameOver) return false; // if game is over, game should not be running, hence no collisions
		const head = this.snake[0];
		return this.snake.slice(1).some(segment => this.vEquals(head, segment));
	}

	private updateFrameRate() {
		const atMinThreshold = this.gameState.snackScore == this.frameRateStartIncrement;
		const pastMinThreshold = this.gameState.snackScore > this.frameRateStartIncrement;
		const atInterval = this.gameState.snackScore % this.frameRateIncrementInterval == 0;
		const pastMaxThreshold = this.gameState.snackScore > this.frameRateEndIncrement;
		if (atMinThreshold || (pastMinThreshold && atInterval && !pastMaxThreshold)) {
			this.currentFrameRate! += this.frameRateIncrement;
			this.p5!.frameRate(this.currentFrameRate!);
			this.speedElem?.html(`Speed = ${this.currentFrameRate}`);
		}
	}

	private getWrappedPosition(position: p5Types.Vector) {
		const {x, y} = position;
		const [maxX, maxY] = [this.colCount, this.rowCount];
		const wrappedX = x == -1 ? maxX - 1 : x == maxX ? 0 : x;
		const wrappedY = y == -1 ? maxY - 1 : y == maxY ? 0 : y;
		return this.p5!.createVector(wrappedX, wrappedY);
	}
	/** property changes to canvas made in callback only exist for duration of callback */
	private frameUpdate(callback: Function) {
		this.p5!.push();
		const res = callback();
		this.p5!.pop();
		return res;
	}

	private getRandomSnackCell(): p5Types.Vector {
		let vector: p5Types.Vector;
		const [xMin, xMax] = [1, this.colCount - 2]; // 1 unit from x border
		const [yMin, yMax] = [1, this.rowCount - 2]; // 1 unit from y border
		do {
			let randomCol = Math.floor(Math.random() * this.colCount);
			let randomRow = Math.floor(Math.random() * this.rowCount);
			vector = this.p5!.createVector(randomCol, randomRow);
		} while (
			this.snake.some(v => this.vEquals(v, vector)) ||
			vector.x < xMin ||
			vector.y < yMin ||
			vector.x > xMax ||
			vector.y > yMax
		);
		return vector;
	}

	private handleCollisionDetection() {
		if (this.isBorderCollision || this.isSelfCollision) {
			this.gameState.gameOver = true;
			this.quickSettings!.show();
		}
	}

	private initializeGame() {
		this.p5!.frameRate(this.initFrameRate);
		this.speedElem?.html(`Speed = ${this.initFrameRate}`);
		this.currentFrameRate = this.initFrameRate;
		this.quickSettings!.setValue('Last Score', 0);
		this.gameState.gameOver = false;
		this.gameState.snackScore = 0;
		this.snackLocation = null;
		this.quickSettings!.hide();
		this.currentDirection = this.directions.RIGHT; // set current direction
		this.snake = [];
		const midY = Math.floor(this.rowCount / 2);
		for (let x = this.initSnakeLength - 1; x >= 0; x--) {
			this.snake.push(this.p5!.createVector(x, midY));
		}
	}

	private initializeSettings(parentRef: Element, canvas: p5Types.Element) {
		if (this.quickSettings) this.quickSettings.destroy();

		const {x: xLoc, y: yLoc} = canvas.position() as {[key: string]: number};

		const quickSettings = QuickSettings.create(xLoc, yLoc, 'Snake', parentRef as HTMLElement, secureLocalStorage);
		this.quickSettings = quickSettings;

		// quickSettings.setDraggable(false);

		quickSettings
			.addHTML(
				'Controls (Desktop Only)',
				`<div>
        <div class="flex justify-between items-center">
        <p class='text-lg'>up</p>
        <div>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">W</kbd>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">I</kbd>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">▲</kbd>
        </div>
        </div>
        <div class="flex justify-between items-center">
        <p class='text-lg'>down</p>
        <div>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">S</kbd>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">K</kbd>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">▼</kbd>
        </div>
        </div>
        <div class="flex justify-between items-center">
        <p class='text-lg'>left</p>
        <div>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">A</kbd>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">J</kbd>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">◀︎</kbd>
        </div>
        </div>
        <div class="flex justify-between items-center">
        <p class='text-lg'>right</p>
        <div>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">D</kbd>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">L</kbd>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">▶︎</kbd>
        </div>
        </div>
        <div class="flex justify-between items-center">
        <p class='text-lg'>quit</p>
        <div>
        <kbd class="daisy-kbd daisy-kbd-sm dark:text-white">Q</kbd>
        </div>
        </div>
      </div>`
			)
			.addColor('Padding Color', this.windowPaddingColor, (color: string) => {
				(parentRef.parentElement as HTMLElement).style.backgroundColor = color;
			})
			.addBoolean('Wrap Window Borders', this.wrapBorders, (val: boolean) => {
				this.wrapBorders = val;
				// this.quickSettings!.setValue('Max Score', defaultSettings['Max Score'])
			})
			.addRange('Cell Size', 10, 30, this.cellSize, 1, (size: number) => {
				this.cellSize = size;
				this.p5!.resizeCanvas(this.windowWidth, this.windowHeight);
				const {x: xLoc, y: yLoc} = canvas.position() as {[key: string]: number};
				this.quickSettings!.setPosition(xLoc, yLoc);
			})
			.addColor('Snake Head Color', this.snakeHeadColor, (val: string) => (this.snakeHeadColor = val))
			.addColor('Snake Body Color', this.snakeBodyColor, (val: string) => (this.snakeBodyColor = val))
			.addColor('Snack (Food) Color', this.snackColor, (val: string) => (this.snackColor = val))
			.addBoolean('Show Cell borders', this.cellBorderOn, (val: boolean) => (this.cellBorderOn = val))
			.addNumber('Initial Speed', 6, 60, this.initFrameRate, 1, (val: number) => (this.initFrameRate = val))
			.addButton('Reset All', () => {
				quickSettings.setValuesFromJSON(defaultSettings);
			})
			.addButton('Start', () => this.initializeGame())
			.addText('Last Score', this.gameState.score.toString(), (val: number) => {
				this.updateScore(val);
				const currentMax = parseInt(quickSettings.getValue('Max Score'));
				const newMax = Math.max(val, currentMax);
				if (newMax) {
					quickSettings.setValue('Max Score', newMax);
				}
			})
			.addText('Max Score', this.gameState.score.toString())
			.disableControl('Last Score'); //.hide();

		quickSettings!.saveInLocalStorage('snakeGameSettings');
		// console.log(quickSettings.getValuesAsJSON(false));
	}

	private moveSnake() {
		this.frameUpdate(() => {
			const snakeHeadCopy = this.snake[0].copy();
			let newBodySegment = snakeHeadCopy.add(this.currentDirection!);

			if (this.wrapBorders) newBodySegment = this.getWrappedPosition(newBodySegment);

			if (this.vEquals(newBodySegment, this.snackLocation!)) {
				this.snackLocation = null;
				this.quickSettings!.setValue('Last Score', this.gameState.score + this.scoreIncrement);
				this.gameState.snackScore += 1;
				this.updateFrameRate(); //update speed //TODO: disable or not
				const snakeTail = this.snake[this.snake.length - 1] as p5Types.Vector; //new body segments given tail coordinates
				for (let i = 0; i < this.snakeLengthIncrement; i++) this.snake.push(snakeTail.copy());
			}
			let prevSegment: p5Types.Vector = newBodySegment;

			for (let i = 0; i < this.snake.length; i++) {
				const currSegment = this.snake[i];
				this.snake[i] = prevSegment;
				prevSegment = currSegment;
			}
		});
	}

	private drawSnake() {
		this.frameUpdate(() => {
			for (let i = 0; i < this.snake.length; i++) {
				this.p5!.fill(i === 0 ? this.snakeHeadColor : this.snakeBodyColor);
				this.p5!.stroke(this.snakeBodyColor);
				this.p5!.rect(this.snake[i].x * this.cellSize, this.snake[i].y * this.cellSize, this.cellSize);
			}
		});
	}

	private drawSnack() {
		this.frameUpdate(() => {
			if (this.cellBorderOn) this.p5!.stroke(255);
			else this.p5!.stroke(0);
			if (
				this.snackLocation == null ||
				this.snackLocation.x < 0 ||
				this.snackLocation.x >= this.colCount ||
				this.snackLocation.y < 0 ||
				this.snackLocation.y >= this.rowCount
			)
				this.snackLocation = this.getRandomSnackCell();
			const {x, y} = this.snackLocation;
			this.p5!.fill(this.p5!.second() % 2 === 0 ? 'black' : this.snackColor);
			this.p5!.stroke(this.snackColor);
			this.p5!.rect(x * this.cellSize, y * this.cellSize, this.cellSize);
		});
	}

	private drawBoardFrame() {
		this.frameUpdate(() => {
			this.p5!.fill(this.backgroundColor);
			if (this.cellBorderOn) this.p5!.stroke(this.cellBorderColor);
			for (let y = 0; y < this.rowCount; y++) {
				for (let x = 0; x < this.colCount; x++) {
					this.p5!.rect(x * this.cellSize, y * this.cellSize, this.cellSize);
				}
			}
		});
	}

	private drawGameRunningScreen() {
		this.drawBoardFrame();
		this.drawSnack();
		this.moveSnake();
		this.drawSnake();
		this.handleCollisionDetection();
	}

	private drawGameIdleScreen() {
		this.drawBoardFrame();
		this.snackLocation = this.p5!.createVector(this.colCount - 2, 2);
		this.drawSnack();
		this.snake = [];
		for (let i = 5; i < this.rowCount - 4; i++) {
			this.snake.push(this.p5!.createVector(this.colCount - 2, i));
		}
		this.drawSnake();
	}

	public setup(p5: p5Types, canvasParentRef: Element) {
		this.p5 = p5;
		const canvas = p5.createCanvas(this.windowWidth, this.windowHeight).parent(canvasParentRef);
		this.initializeSettings(canvasParentRef, canvas);
		const [scoreXLoc, scoreYLoc] = [2 * this.cellSize + this.windowPadding, this.cellSize + this.windowPadding];
		const [speedXLoc, speedYLoc] = [2 * this.cellSize + this.windowPadding, 2 * this.cellSize + this.windowPadding];
		this.scoreElem = p5.createDiv('Score = 0');
		this.scoreElem.position(scoreXLoc, scoreYLoc);
		this.scoreElem.id('score');
		this.scoreElem.style('color', this.scoreElemColor);
		this.speedElem = p5.createDiv(`Speed = ${this.initFrameRate}`);
		this.speedElem.position(speedXLoc, speedYLoc);
	}

	public draw(p5: p5Types) {
		if (!this.gameState.gameOver) this.drawGameRunningScreen();
		else this.drawGameIdleScreen();
	}

	public windowResized(p5: p5Types) {
		p5.resizeCanvas(this.windowWidth, this.windowHeight);
	}

	public keyPressed(p5: p5Types) {
		if (!this.currentDirection || this.gameState.gameOver) return;
		// console.log(p5.keyCode);
		switch (p5.keyCode) {
			case 65:
			case 74:
			case 37:
				if (!this.vEquals(this.currentDirection, this.directions.RIGHT)) this.currentDirection = this.directions.LEFT;
				break;
			case 68:
			case 76:
			case 39:
				if (!this.vEquals(this.currentDirection, this.directions.LEFT)) this.currentDirection = this.directions.RIGHT;
				break;
			case 87:
			case 73:
			case 38:
				if (!this.vEquals(this.currentDirection, this.directions.DOWN)) this.currentDirection = this.directions.UP;
				break;
			case 83:
			case 75:
			case 40:
				if (!this.vEquals(this.currentDirection, this.directions.UP)) this.currentDirection = this.directions.DOWN;
				break;
			case 84:
				this.quickSettings!.show();
				this.gameState.gameOver = true;
		}
	}
}

//TODO: second max score functionality, displaying max score with border wrap and without.
//TODO: remove reset of max score with wrap border toggling
