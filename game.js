// Register service worker for offline support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageEl = document.getElementById('message');
const instructionsEl = document.getElementById('instructions');

// Fullscreen toggle
document.getElementById('fullscreenBtn').addEventListener('click', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } else {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
});
document.addEventListener('fullscreenchange', () => setTimeout(resizeCanvas, 150));
document.addEventListener('webkitfullscreenchange', () => setTimeout(resizeCanvas, 150));

// Responsive canvas sizing
function resizeCanvas() {
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 150);
});

// Game state
let currentAnswer = 0;
let selectedNumber = 1;
let items = [];
let currentCreature = 'mermaid';
let startTime = 0;
let particles = [];
let bubbles = [];
let boats = [];
let waveOffset = 0;
let totalScore = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let roundTimeLimit = 15000; // 15 seconds in milliseconds
let roundEnded = false;
let lives = 3;
let gameOver = false;

const creatures = ['mermaid', 'shark', 'crab', 'turtle'];

// Colors
const colors = {
    purple500: '#790ECB',
    purple400: '#9D3FE0',
    purple300: '#B87AED',
    prey750: '#2a2a2a',
    prey700: '#3a3a3a',
    white: '#ffffff',
    prey300: '#a0a0a0'
};

// Initialize bubbles for background
function initBubbles() {
    bubbles = [];
    for (let i = 0; i < 20; i++) {
        bubbles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.2
        });
    }
}

// Initialize boats
function initBoats() {
    boats = [];
    // Start with one boat
    boats.push({
        x: -100,
        y: 60,
        speed: 0.5 + Math.random() * 0.5,
        type: Math.random() > 0.5 ? 'sailboat' : 'ship'
    });
}

// Draw sky above water
function drawSky() {
    const skyHeight = 60;
    const waterLine = 80;
    
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, waterLine);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, waterLine);
    
    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    drawCloud(150, 30, 20);
    drawCloud(400, 20, 18);
    drawCloud(650, 35, 22);
}

// Draw cloud
function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.7, y, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 1.4, y, size * 0.9, 0, Math.PI * 2);
    ctx.arc(x + size * 2, y, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
}

// Draw water surface with waves
function drawWaterSurface() {
    ctx.save();
    
    const waterLine = 80;
    
    // Animate wave offset
    waveOffset += 0.02;
    
    // Draw waves
    ctx.beginPath();
    ctx.moveTo(0, waterLine);
    
    for (let x = 0; x <= canvas.width; x += 10) {
        const y = waterLine + Math.sin(x * 0.02 + waveOffset) * 3 + Math.sin(x * 0.05 + waveOffset * 1.5) * 2;
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(canvas.width, waterLine + 20);
    ctx.lineTo(0, waterLine + 20);
    ctx.closePath();
    
    // Water surface color
    ctx.fillStyle = 'rgba(0, 100, 150, 0.3)';
    ctx.fill();
    
    // Wave highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
}

// Draw sailboat
function drawSailboat(x, y) {
    ctx.save();
    ctx.translate(x, y);
    
    // Hull
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-15, 10);
    ctx.lineTo(15, 10);
    ctx.lineTo(20, 0);
    ctx.closePath();
    ctx.fill();
    
    // Mast
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -30);
    ctx.stroke();
    
    // Sail
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(15, -15);
    ctx.lineTo(0, -5);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
}

// Draw ship
function drawShip(x, y) {
    ctx.save();
    ctx.translate(x, y);
    
    // Hull
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(-30, 0, 60, 15);
    
    // Cabin
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-15, -10, 30, 10);
    
    // Windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(-10, -7, 6, 5);
    ctx.fillRect(4, -7, 6, 5);
    
    // Smokestack
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(10, -18, 6, 8);
    
    // Smoke
    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
    ctx.beginPath();
    ctx.arc(13, -22, 4, 0, Math.PI * 2);
    ctx.arc(15, -26, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Update and draw boats
function updateBoats() {
    // Update existing boats
    boats.forEach(boat => {
        boat.x += boat.speed;
        
        // Add bobbing motion
        const bobY = Math.sin(Date.now() * 0.002 + boat.x * 0.01) * 2;
        
        if (boat.type === 'sailboat') {
            drawSailboat(boat.x, boat.y + bobY);
        } else {
            drawShip(boat.x, boat.y + bobY);
        }
    });
    
    // Remove boats that are off screen
    boats = boats.filter(boat => boat.x < canvas.width + 100);
    
    // Randomly add new boats
    if (boats.length === 0 || (boats[boats.length - 1].x > 200 && Math.random() < 0.01)) {
        boats.push({
            x: -100,
            y: 60,
            speed: 0.5 + Math.random() * 0.5,
            type: Math.random() > 0.5 ? 'sailboat' : 'ship'
        });
    }
}

// Draw sand at bottom
function drawSand() {
    const sandHeight = 80;
    const sandY = canvas.height - sandHeight;
    
    // Sand base
    ctx.fillStyle = '#C2B280';
    ctx.fillRect(0, sandY, canvas.width, sandHeight);
    
    // Sand texture (darker spots)
    ctx.fillStyle = '#A89968';
    for (let i = 0; i < 30; i++) {
        const x = (i * 37) % canvas.width;
        const y = sandY + (i * 23) % sandHeight;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 3 + 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw coral
function drawCoral(x, y) {
    ctx.save();
    ctx.translate(x, y);
    
    // Coral branches
    const colors = ['#FF6B9D', '#FF1493', '#FF69B4', '#FFA07A'];
    ctx.strokeStyle = colors[Math.floor(x / 200) % colors.length];
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Main stem
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -30);
    ctx.stroke();
    
    // Branches
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, -10 - i * 8);
        ctx.lineTo(-10 - i * 2, -20 - i * 8);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -10 - i * 8);
        ctx.lineTo(10 + i * 2, -20 - i * 8);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw shipwreck
function drawShipwreck(x, y) {
    ctx.save();
    ctx.translate(x, y);
    
    // Ship hull
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(-40, -20, 80, 30);
    
    // Deck
    ctx.fillStyle = '#5C4033';
    ctx.fillRect(-35, -25, 70, 5);
    
    // Broken mast
    ctx.strokeStyle = '#3D2817';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, -25);
    ctx.lineTo(-15, -45);
    ctx.stroke();
    
    // Windows
    ctx.fillStyle = '#2C1810';
    ctx.fillRect(-25, -10, 8, 8);
    ctx.fillRect(-10, -10, 8, 8);
    ctx.fillRect(5, -10, 8, 8);
    
    // Seaweed on wreck
    ctx.strokeStyle = '#2E8B57';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, -20);
    ctx.quadraticCurveTo(35, -30, 32, -40);
    ctx.stroke();
    
    ctx.restore();
}

// Draw rocks
function drawRock(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    ctx.fillStyle = '#696969';
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rock highlights
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.ellipse(-size * 0.3, -size * 0.2, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Moss on rock
    ctx.fillStyle = '#556B2F';
    ctx.beginPath();
    ctx.arc(size * 0.2, size * 0.3, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Draw seabed decorations
function drawSeabed() {
    drawSand();
    
    const sandY = canvas.height - 80;
    
    // Coral
    drawCoral(100, sandY);
    drawCoral(250, sandY);
    drawCoral(650, sandY);
    
    // Shipwreck
    drawShipwreck(400, sandY - 10);
    
    // Rocks
    drawRock(50, sandY + 10, 15);
    drawRock(180, sandY + 15, 20);
    drawRock(320, sandY + 12, 12);
    drawRock(580, sandY + 18, 18);
    drawRock(720, sandY + 10, 16);
}

// Draw ocean background
function drawBackground() {
    const waterLine = 80;
    
    // Sky above water
    drawSky();
    
    // Underwater gradient background
    const gradient = ctx.createLinearGradient(0, waterLine, 0, canvas.height);
    gradient.addColorStop(0, '#004d66');
    gradient.addColorStop(0.5, '#003d66');
    gradient.addColorStop(1, '#00264d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, waterLine, canvas.width, canvas.height - waterLine);
    
    // Draw bubbles (only underwater)
    bubbles.forEach(bubble => {
        if (bubble.y > waterLine) {
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        }
        
        // Move bubble up
        bubble.y -= bubble.speed;
        if (bubble.y < waterLine - 10) {
            bubble.y = canvas.height + 10;
            bubble.x = Math.random() * canvas.width;
        }
    });
    
    // Draw water surface and boats
    drawWaterSurface();
    updateBoats();
}

// Draw creatures
function drawCreature(x, y, type) {
    ctx.save();
    ctx.translate(x, y);
    
    switch(type) {
        case 'mermaid':
            // Mermaid (simplified)
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.arc(0, -20, 15, 0, Math.PI * 2);
            ctx.fill();
            // Hair
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-15, -30, 30, 20);
            // Body
            ctx.fillStyle = '#FFB6C1';
            ctx.fillRect(-10, -5, 20, 25);
            // Tail
            ctx.fillStyle = colors.purple500;
            ctx.beginPath();
            ctx.moveTo(-10, 20);
            ctx.lineTo(10, 20);
            ctx.lineTo(0, 40);
            ctx.closePath();
            ctx.fill();
            break;
            
        case 'shark':
            // Shark
            ctx.fillStyle = '#708090';
            ctx.beginPath();
            ctx.ellipse(0, 0, 30, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            // Fin
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(-10, -25);
            ctx.lineTo(10, -15);
            ctx.closePath();
            ctx.fill();
            // Tail
            ctx.beginPath();
            ctx.moveTo(25, 0);
            ctx.lineTo(40, -10);
            ctx.lineTo(40, 10);
            ctx.closePath();
            ctx.fill();
            break;
            
        case 'crab':
            // Crab
            ctx.fillStyle = '#FF6347';
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            // Claws
            ctx.fillRect(-25, -5, 10, 8);
            ctx.fillRect(15, -5, 10, 8);
            // Eyes
            ctx.fillStyle = colors.white;
            ctx.beginPath();
            ctx.arc(-5, -10, 3, 0, Math.PI * 2);
            ctx.arc(5, -10, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'turtle':
            // Turtle
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.ellipse(0, 0, 25, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            // Shell pattern
            ctx.strokeStyle = '#006400';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.stroke();
            // Head
            ctx.fillStyle = '#32CD32';
            ctx.beginPath();
            ctx.arc(20, -5, 8, 0, Math.PI * 2);
            ctx.fill();
            break;
    }
    
    ctx.restore();
}

// Draw number bar
function drawNumberBar() {
    const barY = 30;
    const startX = 50;
    const spacing = 70;
    
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 1; i <= 10; i++) {
        const x = startX + (i - 1) * spacing;
        
        // Draw box
        if (i === selectedNumber) {
            ctx.fillStyle = colors.purple500;
            ctx.shadowColor = colors.purple500;
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = colors.prey750;
            ctx.shadowBlur = 0;
        }
        
        ctx.fillRect(x - 20, barY - 20, 40, 40);
        
        // Draw number
        ctx.fillStyle = colors.white;
        ctx.shadowBlur = 0;
        ctx.fillText(i, x, barY);
    }
    
    // Draw checkmark button for selected number
    if (selectedNumber > 0) {
        const checkX = startX + (selectedNumber - 1) * spacing;
        const checkY = barY + 35;
        
        ctx.fillStyle = colors.purple400;
        ctx.beginPath();
        ctx.arc(checkX, checkY, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = colors.white;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(checkX - 5, checkY);
        ctx.lineTo(checkX - 2, checkY + 4);
        ctx.lineTo(checkX + 6, checkY - 4);
        ctx.stroke();
    }
}

// Draw score and timer
function drawScoreAndTimer() {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, roundTimeLimit - elapsed);
    const secondsLeft = Math.ceil(remaining / 1000);
    
    // Draw score
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.white;
    ctx.fillText('Score: ' + totalScore, 10, canvas.height - 20);
    ctx.fillStyle = colors.prey300;
    ctx.fillText('Best: ' + highScore, 180, canvas.height - 20);
    
    // Draw lives (hearts)
    ctx.font = '24px Arial';
    let heartsText = '';
    for (let i = 0; i < lives; i++) {
        heartsText += '❤️';
    }
    for (let i = lives; i < 3; i++) {
        heartsText += '🖤';
    }
    ctx.fillText(heartsText, 10, canvas.height - 50);
    
    // Draw timer
    ctx.textAlign = 'right';
    const timerColor = secondsLeft <= 5 ? '#FF6347' : colors.purple300;
    ctx.fillStyle = timerColor;
    ctx.fillText('Time: ' + secondsLeft + 's', canvas.width - 10, canvas.height - 20);
    
    // Auto-fail if time runs out
    if (remaining === 0 && !roundEnded) {
        roundEnded = true;
        lives--;
        
        if (lives <= 0) {
            gameOver = true;
            if (totalScore > highScore) {
                highScore = totalScore;
                localStorage.setItem('highScore', highScore);
            }
            showMessage('Game Over! Final Score: ' + totalScore);
        } else {
            showMessage('Time\'s up! Lives left: ' + lives);
            setTimeout(newRound, 2000);
        }
    }
}

// Particle system for fireworks
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1;
        this.color = [colors.purple500, colors.purple400, colors.purple300, '#FFD700'][Math.floor(Math.random() * 4)];
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // Gravity
        this.life -= 0.02;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function createFireworks() {
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle(canvas.width / 2, canvas.height / 2));
    }
}

// Generate new round
function newRound() {
    if (gameOver) return;
    
    currentAnswer = Math.floor(Math.random() * 10) + 1;
    currentCreature = creatures[Math.floor(Math.random() * creatures.length)];
    selectedNumber = 1;
    startTime = Date.now();
    particles = [];
    roundEnded = false;
    
    // Position items randomly (avoid top 120px for sky/water and bottom 100px for seabed)
    items = [];
    for (let i = 0; i < currentAnswer; i++) {
        items.push({
            x: Math.random() * (canvas.width - 100) + 50,
            y: Math.random() * (canvas.height - 220) + 120,
            bobOffset: Math.random() * Math.PI * 2,
            bobSpeed: Math.random() * 0.005 + 0.003
        });
    }
}

// Check answer
function checkAnswer() {
    if (roundEnded || gameOver) return;
    
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, roundTimeLimit - elapsed);
    const secondsLeft = Math.ceil(remaining / 1000);
    
    if (selectedNumber === currentAnswer) {
        roundEnded = true;
        
        // Calculate score: seconds remaining + correct answer
        const roundScore = secondsLeft + currentAnswer;
        totalScore += roundScore;
        
        if (secondsLeft >= 10) {
            createFireworks();
            showMessage('🎉 Amazing! +' + roundScore);
        } else {
            showMessage('✓ Correct! +' + roundScore);
        }
        setTimeout(newRound, 2000);
    } else {
        showMessage('Try again!');
    }
}

// Restart game
function restartGame() {
    totalScore = 0;
    lives = 3;
    gameOver = false;
    newRound();
}

function showMessage(text) {
    messageEl.textContent = text;
    messageEl.classList.add('show');
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 1500);
}

// Input handling - Keyboard
document.addEventListener('keydown', (e) => {
    if (gameOver && e.key === ' ') {
        e.preventDefault();
        restartGame();
        return;
    }
    
    if (e.key === 'ArrowLeft') {
        selectedNumber = Math.max(1, selectedNumber - 1);
    } else if (e.key === 'ArrowRight') {
        selectedNumber = Math.min(10, selectedNumber + 1);
    } else if (e.key === ' ') {
        e.preventDefault();
        checkAnswer();
    }
});

// Touch/Click handling for mobile
canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    handleCanvasTouch(x, y);
});

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    handleCanvasTouch(x, y);
}

function handleCanvasTouch(x, y) {
    if (gameOver) {
        restartGame();
        return;
    }
    
    const barY = 30;
    const startX = 50;
    const spacing = 70;
    
    // Check if clicking on number bar
    if (y >= barY - 20 && y <= barY + 20) {
        for (let i = 1; i <= 10; i++) {
            const numX = startX + (i - 1) * spacing;
            if (x >= numX - 20 && x <= numX + 20) {
                selectedNumber = i;
                checkAnswer();
                return;
            }
        }
    }
}

// Game loop
function gameLoop() {
    drawBackground();
    drawSeabed();
    
    if (!gameOver) {
        // Draw items with bobbing animation
        items.forEach((item, index) => {
            const bobY = Math.sin(Date.now() * item.bobSpeed + item.bobOffset) * 4;
            drawCreature(item.x, item.y + bobY, currentCreature);
        });
        
        drawNumberBar();
        drawScoreAndTimer();
    } else {
        // Game over screen
        drawGameOverScreen();
    }
    
    // Draw and update particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    requestAnimationFrame(gameLoop);
}

// Draw game over screen
function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.purple500;
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);
    
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = colors.white;
    ctx.fillText('Final Score: ' + totalScore, canvas.width / 2, canvas.height / 2);

    ctx.font = '24px Arial';
    ctx.fillStyle = colors.purple300;
    ctx.fillText('Best: ' + highScore, canvas.width / 2, canvas.height / 2 + 40);

    ctx.fillStyle = colors.prey300;
    ctx.fillText('Press SPACE or tap to play again', canvas.width / 2, canvas.height / 2 + 80);
}

// Start game
initBubbles();
initBoats();
newRound();
gameLoop();
