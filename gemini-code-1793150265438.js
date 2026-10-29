// --- ESTADO GLOBAL ---
let particles = [];
let numParticles = 500;
let vectorSpeed = 2.5;
let noiseScale = 0.008;
let colorScheme = 'HSB_OCEAN';
let ecosystemMode = 'PRISTINE';
let zOff = 0; // Tercera dimensión de ruido para dinamismo continuo

// --- CLASE PARTÍCULA (Vectores, Física y Vida) ---
class MarineParticle {
    constructor() {
        this.reset();
    }

    reset() {
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.prevPos = this.pos.copy();
        this.life = random(150, 255);
        this.maxSpeed = vectorSpeed;
        this.size = random(0.8, 2.2);
    }

    update() {
        this.prevPos = this.pos.copy();
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
        this.life -= (ecosystemMode === 'ACIDIFICATION') ? 1.2 : 0.6;

        // Re-inicio si sale de límites o se agota su vida
        if (this.pos.x > width || this.pos.x < 0 || this.pos.y > height || this.pos.y < 0 || this.life <= 0) {
            this.reset();
        }
    }

    applyForce(force) {
        this.acc.add(force);
    }

    draw() {
        strokeWeight(this.size);
        
        let h, s, b, a;
        
        // Mapeo de color según modo y espacio seleccionado
        if (colorScheme === 'HSB_OCEAN') {
            let nColor = noise(this.pos.x * 0.002, this.pos.y * 0.002);
            h = map(nColor, 0, 1, 170, 230);
            s = (ecosystemMode === 'ACIDIFICATION') ? 25 : 85;
            b = (ecosystemMode === 'ACIDIFICATION') ? 50 : 95;
        } else if (colorScheme === 'HSB_BIOLUM') {
            let nColor = noise(this.pos.x * 0.003, this.pos.y * 0.003);
            h = map(nColor, 0, 1, 140, 280);
            s = 90;
            b = 100;
        } else { // RGB HIGH CONTRAST
            h = (this.pos.x / width) * 360;
            s = 100;
            b = 90;
        }

        // Inyección de colores sintéticos en modo contaminación
        if (ecosystemMode === 'PLASTIC' && random() < 0.08) {
            h = 340;
            s = 100;
            strokeWeight(this.size * 2);
        }

        a = map(this.life, 0, 255, 0, 0.5);
        stroke(h, s, b, a);
        line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
    }
}

// --- SETUP P5.JS ---
function setup() {
    const container = document.getElementById('canvas-container');
    const canvas = createCanvas(container.clientWidth, container.clientHeight);
    canvas.parent('canvas-container');
    
    colorMode(HSB, 360, 100, 100, 1.0);
    background(230, 40, 6);
    
    initParticles();
}

// --- DRAW P5.JS ---
function draw() {
    let bgAlpha = (ecosystemMode === 'PLASTIC') ? 0.12 : 0.06;
    background(230, (ecosystemMode === 'ACIDIFICATION') ? 10 : 30, 5, bgAlpha);

    // Obtener puntos de entrada de interacción (ratón o toques táctiles)
    const interactionPoints = [];
    const interactionMode = document.getElementById('interaction-mode').value;

    if (interactionMode !== 'none') {
        if (mouseIsPressed && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
            interactionPoints.push(createVector(mouseX, mouseY));
        }
        if (typeof touches !== 'undefined' && touches && touches.length > 0) {
            for (let t of touches) {
                if (t.x >= 0 && t.x <= width && t.y >= 0 && t.y <= height) {
                    interactionPoints.push(createVector(t.x, t.y));
                }
            }
        }
    }

    for (let p of particles) {
        let angle = noise(p.pos.x * noiseScale, p.pos.y * noiseScale, zOff) * TWO_PI * 4;
        let force = p5.Vector.fromAngle(angle);
        
        if (ecosystemMode === 'PLASTIC') {
            force.mult(0.4);
        } else {
            force.mult(0.8);
        }

        // Aplicar fuerzas de interacción para cada punto táctil o de ratón activo
        for (let inputVec of interactionPoints) {
            const dir = p5.Vector.sub(inputVec, p.pos);
            const distSq = dir.magSq();
            if (distSq < 40000 && distSq > 0) { // Radio de influencia de 200px
                dir.setMag(1.5);
                if (interactionMode === 'repel') dir.mult(-1);
                p.applyForce(dir);
            }
        }

        p.applyForce(force);
        p.update();
        p.draw();
    }

    zOff += 0.003;
}

// --- EVITAR SCROLL EN CELULARES MIENTRAS SE TOCA EL CANVAS ---
function touchStarted() {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        return false;
    }
}

function touchMoved() {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        return false;
    }
}

// --- FUNCIONES AUXILIARES ---
function initParticles() {
    particles = [];
    for (let i = 0; i < numParticles; i++) {
        particles.push(new MarineParticle());
    }
}

function randomizeArtwork() {
    numParticles = floor(random(200, 1001));
    vectorSpeed = random(1, 5).toFixed(1) * 1;
    noiseScale = random(0.003, 0.020);

    document.getElementById('slider-density').value = numParticles;
    document.getElementById('slider-speed').value = vectorSpeed;
    document.getElementById('slider-noise').value = noiseScale;
    document.getElementById('val-density').textContent = numParticles;
    document.getElementById('val-speed').textContent = vectorSpeed.toFixed(1);
    document.getElementById('val-noise').textContent = noiseScale.toFixed(3);

    particles.forEach(p => p.maxSpeed = vectorSpeed);
    initParticles();
}

function setEcosystemMode(mode) {
    ecosystemMode = mode;
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('border-cyan-500/50', 'border-amber-500/50', 'border-rose-500/50', 'bg-slate-800');
        btn.classList.add('border-slate-700', 'bg-slate-800/50');
    });

    const activeBtn = document.getElementById(`btn-${mode}`);
    activeBtn.classList.remove('border-slate-700', 'bg-slate-800/50');
    activeBtn.classList.add('bg-slate-800');

    if (mode === 'PRISTINE') activeBtn.classList.add('border-cyan-500/50');
    if (mode === 'ACIDIFICATION') activeBtn.classList.add('border-amber-500/50');
    if (mode === 'PLASTIC') activeBtn.classList.add('border-rose-500/50');

    resetCanvasArt();
}

function resetCanvasArt() {
    background(230, 40, 6);
    initParticles();
}

function downloadArtwork() {
    saveCanvas(`ArtesPlasticas_ODS14_VidaSubmarina_${ecosystemMode}`, 'png');
}

// --- EVENTOS DE INTERFAZ ---
document.getElementById('slider-density').addEventListener('input', (e) => {
    numParticles = parseInt(e.target.value);
    document.getElementById('val-density').textContent = numParticles;
    initParticles();
});

document.getElementById('slider-speed').addEventListener('input', (e) => {
    vectorSpeed = parseFloat(e.target.value);
    document.getElementById('val-speed').textContent = vectorSpeed.toFixed(1);
    particles.forEach(p => p.maxSpeed = vectorSpeed);
});

document.getElementById('slider-noise').addEventListener('input', (e) => {
    noiseScale = parseFloat(e.target.value);
    document.getElementById('val-noise').textContent = noiseScale.toFixed(3);
});

document.getElementById('color-mode-select').addEventListener('change', (e) => {
    colorScheme = e.target.value;
});

function windowResized() {
    const container = document.getElementById('canvas-container');
    resizeCanvas(container.clientWidth, container.clientHeight);
    background(230, 40, 6);
}