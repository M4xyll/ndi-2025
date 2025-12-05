const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const cellSize = 50;
let gridWidth = 0;
let gridHeight = 0;

let direction = "RIGHT";
let coords = [
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 3, y: 7 }
];

let started = false;

let coordsapple = { x: 0 , y: 0};

let score = 0;

// Pour modifier le score
// document.getElementById("score").textContent = 5;

// Draw
// ctx.fillRect(barX, barY, barWidth, barHeight);


// Anim
// setInterval(() => { ... });

function resizeCanvas() {
    const cols = Math.max(10, Math.floor(window.innerWidth / cellSize));
    const headerSpace = 120; // reserve a bit for header text
    const rows = Math.max(10, Math.floor((window.innerHeight - headerSpace) / cellSize));

    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    gridWidth = cols;
    gridHeight = rows;

    // clamp snake inside bounds when resizing
    coords = coords.map(({ x, y }) => ({
        x: Math.min(gridWidth - 1, Math.max(0, x)),
        y: Math.min(gridHeight - 1, Math.max(0, y))
    }));

    apple();
    draw();
}

function apple() {
    while (true){
        coordsapple.x = Math.floor(Math.random() * gridWidth);
        coordsapple.y = Math.floor(Math.random() * gridHeight);
        let onSnake = false;

        for (let valeur of coords){
            if (valeur.x == coordsapple.x && valeur.y == coordsapple.y){
                onSnake = true;
                break;
            }
        }
        if (!onSnake) {
            return;
        }
    }
}

function draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let valeur of coords) {
        ctx.fillStyle = "green";
        ctx.fillRect(valeur.x * cellSize, valeur.y * cellSize, cellSize, cellSize);
    }

    ctx.fillStyle = "red";
    ctx.fillRect(coordsapple.x * cellSize, coordsapple.y * cellSize, cellSize, cellSize);
}

function loop(){
    loopID = setInterval(() => {
        snake();
        avance();
        draw();
    }, 125);
}

function snake() {
    document.addEventListener("keydown", function (event) {

        // ➤ Démarrer le jeu au premier appui sur une flèche
        if (!started && (event.key === "ArrowUp" || event.key === "ArrowDown" ||
                         event.key === "ArrowLeft" || event.key === "ArrowRight")) {
            started = true;
            loop();   // on lance la boucle ici
        }

        switch (event.key) {
            case "ArrowUp":
                direction = "UP";
                break;

            case "ArrowDown":
                direction = "DOWN";
                break;
        
            case "ArrowLeft":
                direction = "LEFT";
                break;

            case "ArrowRight":
                direction = "RIGHT";
                break;
        }
    });
}


//coords[0].x +=10
/* let coords = [
  { x: 5, y: 0 },
  { x: 5, y: 1 },
  { x: 4, y: 2 }
]; */

function isDead(newHead) {
    // 1. Touche un bord
    if (
        newHead.x < 0 ||
        newHead.y < 0 ||
        newHead.x >= gridWidth ||
        newHead.y >= gridHeight
    ) {
        return true;
    }

    // 2. Se mord soi-même
    for (let segment of coords) {
        if (segment.x === newHead.x && segment.y === newHead.y) {
            return true;
        }
    }

    return false;
}

function gameOver() {
    clearInterval(loopID); // stoppe la boucle
    alert("Perdu !");
    // plus tard : bouton rejouer, reset(), etc.
}


function avance() {
    const head = coords[coords.length - 1];
    let newHead = { x: head.x, y: head.y };

    if (direction === "UP")    newHead.y -= 1;
    if (direction === "DOWN")  newHead.y += 1;
    if (direction === "LEFT")  newHead.x -= 1;
    if (direction === "RIGHT") newHead.x += 1;

    // 👉 ici on vérifie si on meurt AVANT de pousser la tête
    if (isDead(newHead)) {
        gameOver();
        return;
    }
    coords.push(newHead);
    
    if (coordsapple.x === newHead.x && coordsapple.y === newHead.y) {
        score++;
        document.getElementById("score").textContent = score;
        apple();
    }
    else{
        coords.shift();
    }
}

apple();
draw();
document.getElementById("score").textContent = score;
snake();

// Initial sizing and resize handling
resizeCanvas();
window.addEventListener("resize", resizeCanvas);