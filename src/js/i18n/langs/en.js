/**
 * English language pack for Sokoban
 */
export default {
  title: "Sokoban",
  menu: {
    newGame: "New Game",
    continue: "Continue",
    selectLevel: "Select Level",
    settings: "Settings",
    help: "Help",
    about: "About",
    play: "Play"
  },
  game: {
    level: "Level",
    moves: "Moves",
    pushes: "Pushes",
    time: "Time",
    restart: "Restart Level",
    undo: "Undo Move",
    completed: "Level Completed!",
    nextLevel: "Press Space to Continue",
    victory: "Congratulations!",
    allLevelsComplete: "Congratulations! You have completed all levels!",
    confirmExit: "Return to main menu?",
    confirmRestart: "Are you sure you want to restart this level?",
    loading: "Loading..."
  },
  gameModes: {
    select: "Select Game Mode",
    normal: "NORMAL MODE",
    timeAttack: "TIME ATTACK",
    challenge: "CHALLENGE MODE",
    normalDescription: "Standard gameplay with no time limits",
    timeAttackDescription: "Race against the clock for best time",
    challengeDescription: "Limited moves and time - can you beat it?"
  },
  settings: {
    language: "Language",
    sound: "Sound",
    music: "Music",
    controls: "Controls",
    back: "Back",
    on: "On",
    off: "Off",
    paused: "PAUSED",
    resumeHint: "Press ESC or P to resume",
    movementSpeed: "Movement Speed",
    playerSpeed: "Player Speed",
    slowSpeed: "Slow",
    normalSpeed: "Normal",
    fastSpeed: "Fast",
    veryFastSpeed: "Very Fast",
    musicOn: "Music On",
    musicOff: "Music Off",
    navigation: "Navigate",
    openSettings: "Open Settings"
  },
  speeds: {
    slow: "Slow",
    normal: "Normal",
    fast: "Fast",
    veryFast: "Very Fast"
  },
  loading: {
    title: "Loading",
    preparing: "Press Space to Load Game",
    loading: "Loading"
  },
  error: {
    loading: "Error loading game resources. Please refresh."
  },
  buttons: {
    play: "Play",
    home: "Home",
    levelSelect: "Level Select",
    restart: "Restart",
    toggleMusic: "Toggle Music",
    pause: "Pause Game",
    close: "Close",
    settings: "Settings",
    undo: "Undo Move",
    levelEditor: "Level Editor",
    back: "Back"
  },
  levelSelect: {
    title: "Select Level"
  },
  editor: {
    title: "Level Editor",
    newLevel: "New Level",
    saveLevel: "Save Level",
    testLevel: "Test Level",
    returnToGame: "Back to Game",
    floorWall: "Floor/Wall",
    boxes: "Boxes",
    goals: "Goals",
    player: "Player",
    confirmNew: "Create a new level? This will clear the current level.",
    confirmReturn: "Return to the main game? Unsaved changes will be lost.",
    savePrompt: "Enter a name for your level:",
    defaultLevelName: "My Custom Level",
    saveSuccess: "Level saved successfully!",
    errorNoPlayer: "Level must have a player.",
    errorNoBoxes: "Level must have at least one box.",
    errorBoxesGoalsMismatch: "Level must have the same number of boxes and goals.",
    errorPlayerPosition: "Player must be placed on a walkable tile."
  },
  auth: {
    signIn: "Sign In",
    signOut: "Sign Out",
    register: "Register",
    account: "Account",
    name: "Name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    signingIn: "Signing in...",
    registering: "Registering...",
    fillAllFields: "Please fill in all fields",
    passwordsDoNotMatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
    loginFailed: "Login failed. Please check your credentials and try again.",
    registrationFailed: "Registration failed. Please try again.",
    progressLoaded: "Progress loaded from cloud",
    welcome: "Welcome",
    clickToSignOut: "Click to sign out",
    confirmSignOut: "Are you sure you want to sign out?",
    registrationSuccess: "Registration successful! You are now logged in."
  },
  testing: {
    running: "Running tests...",
    passed: "Test passed",
    failed: "Test failed",
    levelCompletionTitle: "Level Completion Test",
    movementTitle: "Player Movement Test",
    boxPushTitle: "Box Push Test",
    undoTitle: "Undo Functionality Test",
    goalDetectionTitle: "Goal Detection Test",
    resultsTitle: "Test Results",
    startTesting: "Start Tests",
    stopTesting: "Stop Tests",
    testCompleted: "All tests completed"
  }
};