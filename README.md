# Sokoban

A modern implementation of the classic Sokoban puzzle game using HTML5 Canvas and JavaScript.

## About the Game

Sokoban (倉庫番, "warehouse keeper") is a puzzle game where the player pushes boxes around a maze, viewed from above, and tries to put them in designated locations. The game was created in 1981 by Hiroyuki Imabayashi.

In this implementation, Sokoban features:

- 50 challenging levels
- Smooth animations
- Sound effects and background music
- Score tracking (moves and time)
- Mobile touch controls support

## How to Play

1. Use the arrow keys to move the player character
2. Push boxes onto the goal positions (marked with a different color)
3. Once all boxes are on goal positions, the level is complete
4. Try to complete each level in the minimum number of moves

## Development

This project is built with:
- HTML5 Canvas for rendering
- Vanilla JavaScript (ES modules)
- Vite as the build tool
- SCSS for styling

### Project Structure

```
sokoban/
├── public/               # Static assets
│   └── assets/
│       ├── images/       # Game graphics
│       ├── level/        # Level JSON files
│       └── sound/        # Game audio files
├── src/
│   ├── js/               # Game JavaScript modules
│   │   ├── config/       # Configuration files
│   │   ├── boxes.js      # Box management
│   │   ├── events.js     # Input handling
│   │   ├── fx_stars_3d.js # Background effect
│   │   ├── game.js       # Main game controller
│   │   ├── goal.js       # Goal positions management
│   │   ├── level.js      # Level rendering and management
│   │   ├── main.js       # Entry point
│   │   ├── player.js     # Player character logic
│   │   ├── resources.js  # Asset loading
│   │   └── score.js      # Score tracking
│   ├── styles/           # SCSS styles
│   └── index.html        # Main HTML file
├── package.json          # Dependencies and scripts
└── vite.config.js        # Vite configuration
```

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```
npm install
```

### Development

Run the development server:
```
npm run dev
```

### Building for Production

Build the project for production:
```
npm run build
```

Preview the production build:
```
npm run preview
```

## Level Creation

Levels are stored as JSON files in the `public/assets/level/` directory. Each level file follows this format:

```json
{
  "width": 10,
  "height": 10,
  "layers": [
    {
      "name": "Ground",
      "data": [...]
    },
    {
      "name": "Goals",
      "data": [...]
    },
    {
      "name": "Boxes",
      "data": [...]
    }
  ]
}
```

## Credits

- Graphics: Custom pixel art
- Sound effects: Various sources (see credits in-game)
- Background music: "Dreamcatcher" by [Artist Name]

## License

This project is licensed under the ISC License - see the LICENSE file for details.

---

© 2024 | Version: 0.0.1