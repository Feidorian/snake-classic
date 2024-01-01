'use client';

import SnakeGame from './SnakeGame';


import dynamic from 'next/dynamic'


export default function Canvas() {


	const Sketch = dynamic(() => import('react-p5').then((mod) => mod.default), {
		ssr: false,
	})
	const game = new SnakeGame();
	const setup = game!.setup.bind(game);
	const draw = game!.draw.bind(game);
	const keyPressed = game.keyPressed.bind(game);
	const windowResized = game.windowResized.bind(game);
	return <Sketch setup={setup} draw={draw} keyPressed={keyPressed} windowResized={windowResized} />;
}
