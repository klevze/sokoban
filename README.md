# Sokoban

A modern implementation of the classic Sokoban puzzle game using HTML5 Canvas and JavaScript.

![Sokoban Game](src/assets/images/logo.webp)

## About the Game

Sokoban (倉庫番, "warehouse keeper") is a puzzle game where the player pushes boxes around a maze, viewed from above, and tries to put them in designated locations. The game was created in 1981 by Hiroyuki Imabayashi.

![Sokoban Gameplay](src/assets/images/gameplay.webp)

## Features

- **50 challenging levels** - From beginner to expert difficulty
- **Smooth animations** - Fluid player and box movements
- **Multiple languages** - Supports English, Spanish, German, French, and many more
- **Sound effects and music** - Immersive audio experience with toggle options
- **Score tracking** - Time, moves, and pushes are tracked for each level
- **Responsive design** - Play on any device with adaptive layout
- **Touch controls** - Mobile-friendly interface with virtual buttons
- **Level select** - Pick any level to play
- **Auto-save** - Your progress is saved automatically
- **Idle animations** - The character performs special animations when idle

## How to Play

1. Use the **arrow keys** (keyboard) or **touch controls** (mobile) to move the player character
2. Push boxes onto the goal positions (marked with a different color)
3. Once all boxes are on goal positions, the level is complete
4. Try to complete each level in the minimum number of moves

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn

### Installation

1. Clone the repository:
```
git clone https://github.com/klevze/sokoban.git
cd sokoban
```

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

## Technologies Used

- HTML5 Canvas for rendering
- Vanilla JavaScript with ES modules
- Vite as the build tool
- SCSS for styling
- i18n for internationalization

## Browser Support

The game works on all modern browsers including:
- Chrome
- Firefox
- Safari
- Edge
- Mobile browsers (iOS/Android)

## Credits

- Game Design & Development: GK
- Graphics: Custom pixel art
- Sound effects: Various sources with appropriate licensing
- Background music: "Dreamcatcher"

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

© 2025 | Version: 0.1.0