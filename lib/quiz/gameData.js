/**
 * Game configuration for gate challenges in HTTYD experience.
 * Games at months 2 and 4.
 */
export const gameData = [
    {
        month: 2,
        gameType: "siege",
        label: "The Cove Challenge",
        preMessage: "A wild dragon blocks the path! Battle through the outskirts to prove your worth as a dragon rider! ",
        postWinMessage: "You've earned the trust of the dragons! Onward to the Training Arena! ",
        postLoseMessage: "Even Hiccup fell off Toothless the first time. Try again, Viking! ",
        targetScore: 10,
    },
    {
        month: 4,
        gameType: "siege",
        label: "Cloud Kingdom Challenge",
        preMessage: " Journey through dangerous lands! Navigate through the forests and islands to reach the sky kingdom! ",
        postWinMessage: "Victory! You'd make Stoick proud. The volcanic islands await! ",
        postLoseMessage: "Your skills need work. Try again, Viking! ",
        targetScore: 100,
    },
];
