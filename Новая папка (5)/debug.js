// Инструменты отладки игры

class GameDebugger {
    constructor(game) {
        this.game = game;
        this.setupDebugUI();
    }
    
    setupDebugUI() {
        // Добавляем панель отладки
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debugPanel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            max-width: 300px;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        debugPanel.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #4CAF50;">Debug Panel</h3>
            <button onclick="debug.toggleWireframe()" style="margin: 2px; padding: 4px 8px;">Wireframe</button>
            <button onclick="debug.toggleStats()" style="margin: 2px; padding: 4px 8px;">Stats</button>
            <button onclick="debug.resetCamera()" style="margin: 2px; padding: 4px 8px;">Reset Cam</button>
            <button onclick="debug.toggleDebugView()" style="margin: 2px; padding: 4px 8px;">Debug View</button>
            <div id="debugInfo" style="margin-top: 10px;"></div>
        `;
        
        document.body.appendChild(debugPanel);
        
        // Статистика
        this.stats = null;
        if (typeof Stats !== 'undefined') {
            this.stats = new Stats();
            this.stats.showPanel(0);
            this.stats.dom.style.cssText = 'position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000;';
            document.body.appendChild(this.stats.dom);
            this.stats.dom.style.display = 'none';
        }
        
        // Запускаем обновление отладочной информации
        this.updateDebugInfo();
    }
    
    toggleWireframe() {
        if (!this.game.scene) return;
        
        this.game.scene.traverse((child) => {
            if (child.isMesh) {
                child.material.wireframe = !child.material.wireframe;
            }
        });
    }
    
    toggleStats() {
        if (this.stats) {
            this.stats.dom.style.display = this.stats.dom.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    resetCamera() {
        if (this.game.camera) {
            this.game.camera.position.set(0, 1.7, 0);
            this.game.camera.rotation.set(0, 0, 0);
        }
    }
    
    toggleDebugView() {
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.border = canvas.style.border ? '' : '2px solid red';
        }
    }
    
    updateDebugInfo() {
        setInterval(() => {
            const info = document.getElementById('debugInfo');
            if (!info || !this.game) return;
            
            let debugText = '';
            
            if (this.game.camera) {
                debugText += `Camera: X:${this.game.camera.position.x.toFixed(1)} `;
                debugText += `Y:${this.game.camera.position.y.toFixed(1)} `;
                debugText += `Z:${this.game.camera.position.z.toFixed(1)}<br>`;
            }
            
            if (this.game.gameStarted) {
                debugText += `Time: ${this.game.gameTime.toFixed(1)}s<br>`;
                debugText += `CP: ${this.game.currentCheckpoint + 1}/${this.game.checkpoints ? this.game.checkpoints.length : 0}<br>`;
                debugText += `Speed: ${this.game.player.speed.toFixed(1)}<br>`;
            }
            
            if (this.game.scene) {
                debugText += `Objects: ${this.game.scene.children.length}<br>`;
            }
            
            if (this.game.renderer) {
                debugText += `Renderer: OK<br>`;
            }
            
            info.innerHTML = debugText;
            
            // Обновляем статистику
            if (this.stats) {
                this.stats.update();
            }
        }, 100);
    }
}

// Глобальный экземпляр дебаггера
let debug;

// Инициализация дебаггера
function initDebugger() {
    if (game && !debug) {
        debug = new GameDebugger(game);
        console.log('Debugger initialized');
    }
}

// Автоматическая инициализация дебаггера
setTimeout(() => {
    initDebugger();
}, 2000);