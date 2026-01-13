// Шум Перлина для генерации рельефа
class SimplexNoise {
    constructor() {
        this.grad3 = [
            [1,1,0], [-1,1,0], [1,-1,0], [-1,-1,0],
            [1,0,1], [-1,0,1], [1,0,-1], [-1,0,-1],
            [0,1,1], [0,-1,1], [0,1,-1], [0,-1,-1]
        ];
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        this.perm = new Array(512);
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }
    
    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }
    
    noise2D(xin, yin) {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const G2 = (3 - Math.sqrt(3)) / 6;
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        
        let i1, j1;
        if (x0 > y0) {
            i1 = 1; j1 = 0;
        } else {
            i1 = 0; j1 = 1;
        }
        
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;
        
        const ii = i & 255;
        const jj = j & 255;
        
        const gi0 = this.perm[ii + this.perm[jj]] % 12;
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
        
        let n0 = 0, n1 = 0, n2 = 0;
        
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }
        
        return 70 * (n0 + n1 + n2);
    }
}

// Основной игровой класс
class VirtualOGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        this.player = {
            position: { x: 0, y: 1.7, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            speed: 5.0,
            stamina: 100,
            training: {
                distance: 0,
                speedBonus: 0,
                staminaBonus: 0,
                level: 1
            }
        };
        
        this.checkpoints = [];
        this.currentCheckpoint = 0;
        this.gameTime = 0;
        this.gameStarted = false;
        this.isPaused = false;
        
        this.keys = {};
        this.mouse = { x: 0, y: 0, isLocked: false };
        this.mapDrag = { isDragging: false, startX: 0, startY: 0 };
        
        this.selectedMap = null;
        this.gameState = 'loading';
        
        this.terrainData = null;
        this.objects = [];
        this.trees = [];
        this.rocks = [];
        this.fallenTrees = [];
        this.roads = [];
        this.rivers = [];
        this.grassInstances = [];
        this.showPlayerMarker = true;
        this.mapFollowsPlayer = true;
        this.showFullMap = false;
        
        this.mapZoom = 1.0;
        this.mapOffset = { x: 0, y: 0 };
        
        this.terrainSize = 500;
        this.terrainSegments = 128;
        
        this.noise = new SimplexNoise();
        
        this.currentBearing = 0;
        this.targetBearing = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showLoadingScreen();
    }
    
    showLoadingScreen() {
        let progress = 0;
        const progressBar = document.getElementById('loaderProgress');
        const loadingText = document.getElementById('loadingText');
        
        const interval = setInterval(() => {
            progress += 10;
            if (progress > 100) progress = 100;
            
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            const texts = [
                "Загрузка игрового движка...",
                "Генерация реалистичного рельефа...",
                "Создание леса и дорог...",
                "Размещение объектов...",
                "Настройка навигации...",
                "Готово к игре!"
            ];
            
            const textIndex = Math.floor(progress / (100 / (texts.length - 1)));
            if (loadingText) {
                loadingText.textContent = texts[textIndex] || texts[texts.length - 1];
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    this.hideAllScreens();
                    const mainMenu = document.getElementById('mainMenu');
                    if (mainMenu) {
                        mainMenu.classList.add('active');
                    }
                    this.gameState = 'menu';
                }, 500);
            }
        }, 200);
    }
    
    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    }
    
    showMainMenu() {
        this.hideAllScreens();
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu) {
            mainMenu.classList.add('active');
        }
        this.gameState = 'menu';
    }
    
    showLevelSelect() {
        this.hideAllScreens();
        const levelSelect = document.getElementById('levelSelect');
        if (levelSelect) {
            levelSelect.classList.add('active');
        }
        this.loadMaps();
    }
    
    showTraining() {
        this.hideAllScreens();
        const trainingMenu = document.getElementById('trainingMenu');
        if (trainingMenu) {
            trainingMenu.classList.add('active');
        }
    }
    
    showSettings() {
        this.hideAllScreens();
        const settingsMenu = document.getElementById('settingsMenu');
        if (settingsMenu) {
            settingsMenu.classList.add('active');
        }
    }
    
    loadMaps() {
        const mapsGrid = document.getElementById('mapsGrid');
        if (!mapsGrid) return;
        
        mapsGrid.innerHTML = '';
        
        const maps = [
            {
                id: 'small_detailed',
                name: 'Маленькая детализированная',
                description: 'Маленькая, но очень детализированная карта размером 100x100 метров. Идеально для отработки точности навигации и внимания к деталям. Множество разных деревьев, камней и мелких объектов.',
                difficulty: 'beginner',
                size: 100,
                cps: 3,
                terrain: 'Холмистый',
                record: '05:30',
                features: ['Очень детализирована', 'Много деревьев', 'Камни', 'Тропинки', 'Небольшие холмы']
            },
            {
                id: 'forest_park',
                name: 'Лесной парк',
                description: 'Карта размером 200x200 метров для начинающих ориентировщиков. Ровный рельеф с четкими просеками и тропинками. Много разных видов деревьев и кустов.',
                difficulty: 'beginner',
                size: 200,
                cps: 5,
                terrain: 'Равнинный',
                record: '08:15',
                features: ['Густой лес', 'Разные деревья', 'Тропинки', 'Поваленные деревья', 'Камни']
            },
            {
                id: 'hilly_terrain',
                name: 'Холмистая местность',
                description: 'Карта 300x300 метров средней сложности с разнообразным рельефом. Множество холмов и оврагов требуют внимательного планирования маршрута.',
                difficulty: 'advanced',
                size: 300,
                cps: 7,
                terrain: 'Холмистый',
                record: '12:45',
                features: ['Скалы', 'Ручьи', 'Овраги', 'Лощины', 'Подъемы']
            },
            {
                id: 'mountain_pass',
                name: 'Горный перевал',
                description: 'Карта 400x400 метров для опытных ориентировщиков. Крутые подъемы, скальные участки и изменчивый рельеф.',
                difficulty: 'expert',
                size: 400,
                cps: 8,
                terrain: 'Горный',
                record: '18:30',
                features: ['Крутые склоны', 'Скальные выходы', 'Горные реки', 'Перевалы', 'Траверсы']
            },
            {
                id: 'swamp_area',
                name: 'Болотистая местность',
                description: 'Карта 500x500 метров с множеством водных преград и заболоченных участков. Требует внимательного выбора маршрута.',
                difficulty: 'expert',
                size: 500,
                cps: 10,
                terrain: 'Равнинный',
                record: '25:15',
                features: ['Болота', 'Озера', 'Редкий лес', 'Кочки', 'Топи']
            },
            {
                id: 'large_wilderness',
                name: 'Большая дикая местность',
                description: 'Огромная карта 1000x1000 метров для настоящих экспертов. Дикая природа, разнообразный рельеф и большие расстояния.',
                difficulty: 'expert',
                size: 1000,
                cps: 15,
                terrain: 'Разнообразный',
                record: '45:00',
                features: ['Дикий лес', 'Горы', 'Реки', 'Скалы', 'Большие расстояния']
            }
        ];
        
        maps.forEach(map => {
            const card = document.createElement('div');
            card.className = 'map-card';
            card.dataset.mapId = map.id;
            card.innerHTML = `
                <h3>${map.name}</h3>
                <p>${map.description.substring(0, 80)}...</p>
                <div class="map-difficulty difficulty-${map.difficulty}">
                    ${map.difficulty === 'beginner' ? 'Начинающий' : 
                      map.difficulty === 'advanced' ? 'Продвинутый' : 'Эксперт'}
                </div>
            `;
            
            card.addEventListener('click', () => this.selectMap(map));
            mapsGrid.appendChild(card);
        });
        
        if (maps.length > 0) {
            this.selectMap(maps[0]);
        }
    }
    
    selectMap(map) {
        this.selectedMap = map;
        
        const updateElement = (id, text) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        };
        
        updateElement('selectedMapName', map.name);
        updateElement('mapSize', `${map.size}x${map.size} м`);
        updateElement('mapCPs', map.cps);
        updateElement('mapTerrain', map.terrain);
        updateElement('mapRecord', map.record);
        updateElement('mapDescription', map.description);
        
        const playBtn = document.getElementById('playMapBtn');
        if (playBtn) {
            playBtn.disabled = false;
        }
        
        document.querySelectorAll('.map-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.mapId === map.id) {
                card.classList.add('selected');
            }
        });
    }
    
    startGame() {
        if (!this.selectedMap) {
            this.showMessage('Выберите карту для начала игры!', 'Внимание');
            return;
        }
        
        this.hideAllScreens();
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.classList.add('active');
        }
        
        this.gameState = 'playing';
        this.currentCheckpoint = 0;
        this.gameTime = 0;
        this.gameStarted = true;
        this.player.training.distance = 0;
        this.player.training.level = 1;
        this.player.training.speedBonus = 0;
        this.player.training.staminaBonus = 0;
        this.player.stamina = 100;
        this.mapFollowsPlayer = true;
        this.showPlayerMarker = true;
        
        this.initGameWorld();
        this.createCheckpoints();
        this.startGameLoop();
        this.updateUI();
        this.showNavigationTip();
    }
    
    initGameWorld() {
        if (this.scene) {
            while(this.scene.children.length > 0) { 
                this.scene.remove(this.scene.children[0]); 
            }
        }
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, this.selectedMap.size * 0.8);
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            this.selectedMap.size * 2
        );
        this.camera.position.set(0, 1.7, 0);
        this.camera.rotation.order = 'YXZ';
        
        const canvasContainer = document.getElementById('gameCanvasContainer');
        if (!canvasContainer) return;
        
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        const canvas = this.renderer.domElement;
        canvasContainer.innerHTML = '';
        canvasContainer.appendChild(canvas);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(200, 300, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3D7B42, 0.6);
        this.scene.add(hemiLight);
        
        this.createDetailedTerrain();
        this.createDetailedRoads();
        this.createRiversAndStreams();
        this.createDetailedForest();
        this.createRocksAndCliffs();
        this.createFallenTrees();
        this.createGroundDetails();
        
        this.setupMouseControls();
        this.setupMapControls();
        
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createDetailedTerrain() {
        const size = this.selectedMap.size;
        const segments = Math.min(128, size);
        
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        this.generateDetailedTerrain(geometry);
        
        const grassTexture = this.createGrassTexture();
        const material = new THREE.MeshLambertMaterial({ 
            map: grassTexture,
            side: THREE.DoubleSide,
            color: 0x4CAF50
        });
        
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.position.y = 0;
        terrain.receiveShadow = true;
        this.scene.add(terrain);
        
        this.terrainData = geometry.attributes.position.array;
        this.terrainSize = size;
        this.terrainSegments = segments;
    }
    
    generateDetailedTerrain(geometry) {
        const positions = geometry.attributes.position.array;
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            
            let height = 0;
            
            const noiseScale = 0.005;
            height += this.noise.noise2D(x * noiseScale, z * noiseScale) * 20;
            height += this.noise.noise2D(x * noiseScale * 2, z * noiseScale * 2) * 10;
            height += this.noise.noise2D(x * noiseScale * 4, z * noiseScale * 4) * 5;
            
            const distanceFromCenter = Math.sqrt(x*x + z*z);
            height += Math.exp(-distanceFromCenter / halfSize) * 10;
            
            if (distanceFromCenter < halfSize * 0.3) {
                height += 3;
            }
            
            const valleyNoise = this.noise.noise2D(x * 0.003, z * 0.003);
            if (valleyNoise < -0.3) {
                height -= 5 * Math.abs(valleyNoise);
            }
            
            positions[i + 1] = Math.max(0, height);
        }
        
        geometry.computeVertexNormals();
    }
    
    createGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, 256, 256);
        
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const length = 2 + Math.random() * 4;
            const angle = Math.random() * Math.PI * 2;
            
            ctx.strokeStyle = `rgba(${76 + Math.random() * 20}, ${175 + Math.random() * 20}, ${80 + Math.random() * 20}, 0.8)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(this.selectedMap.size / 50, this.selectedMap.size / 50);
        
        return texture;
    }
    
    createDetailedRoads() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        
        this.roads = [];
        
        const roadCount = Math.min(5, Math.floor(size / 100));
        
        for (let i = 0; i < roadCount; i++) {
            const angle = (i / roadCount) * Math.PI * 2;
            const roadWidth = 4 + Math.random() * 4;
            const roadLength = halfSize * 0.8;
            
            const x1 = Math.cos(angle) * -roadLength;
            const z1 = Math.sin(angle) * -roadLength;
            const x2 = Math.cos(angle) * roadLength;
            const z2 = Math.sin(angle) * roadLength;
            
            this.createRoadOnTerrain(x1, z1, x2, z2, roadWidth, 0x8D6E63);
        }
        
        if (this.selectedMap.id === 'small_detailed' || this.selectedMap.id === 'forest_park') {
            this.createParkPaths();
        }
    }
    
    createRoadOnTerrain(x1, z1, x2, z2, width, color) {
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
        const angle = Math.atan2(z2 - z1, x2 - x1);
        
        const roadGeometry = new THREE.PlaneGeometry(length, width);
        const roadMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            side: THREE.DoubleSide
        });
        
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.rotation.y = -angle;
        
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const groundHeight = this.getTerrainHeight(midX, midZ) + 0.02;
        
        road.position.set(midX, groundHeight, midZ);
        road.receiveShadow = true;
        this.scene.add(road);
        
        this.roads.push({
            x1: x1 - Math.cos(angle) * width/2,
            z1: z1 - Math.sin(angle) * width/2,
            x2: x2 + Math.cos(angle) * width/2,
            z2: z2 + Math.sin(angle) * width/2,
            width: width,
            color: color
        });
    }
    
    createParkPaths() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        
        const pathPoints = [
            {x: -halfSize * 0.4, z: -halfSize * 0.6},
            {x: -halfSize * 0.2, z: -halfSize * 0.4},
            {x: 0, z: -halfSize * 0.5},
            {x: halfSize * 0.2, z: -halfSize * 0.3},
            {x: halfSize * 0.4, z: -halfSize * 0.5}
        ];
        
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const p1 = pathPoints[i];
            const p2 = pathPoints[i + 1];
            this.createRoadOnTerrain(p1.x, p1.z, p2.x, p2.z, 3, 0xA1887F);
        }
    }
    
    createRiversAndStreams() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        
        this.rivers = [];
        
        if (this.selectedMap.id === 'swamp_area') {
            this.createSwampWater();
        } else {
            const riverCount = Math.min(3, Math.floor(size / 200));
            
            for (let i = 0; i < riverCount; i++) {
                const startSide = Math.floor(Math.random() * 4);
                let x1, z1, x2, z2;
                
                switch(startSide) {
                    case 0: // сверху
                        x1 = Math.random() * size - halfSize;
                        z1 = -halfSize;
                        x2 = Math.random() * size - halfSize;
                        z2 = halfSize;
                        break;
                    case 1: // справа
                        x1 = halfSize;
                        z1 = Math.random() * size - halfSize;
                        x2 = -halfSize;
                        z2 = Math.random() * size - halfSize;
                        break;
                    case 2: // снизу
                        x1 = Math.random() * size - halfSize;
                        z1 = halfSize;
                        x2 = Math.random() * size - halfSize;
                        z2 = -halfSize;
                        break;
                    case 3: // слева
                        x1 = -halfSize;
                        z1 = Math.random() * size - halfSize;
                        x2 = halfSize;
                        z2 = Math.random() * size - halfSize;
                        break;
                }
                
                const riverWidth = 3 + Math.random() * 7;
                this.createRiverOnTerrain(x1, z1, x2, z2, riverWidth, 0x2196F3);
            }
        }
    }
    
    createRiverOnTerrain(x1, z1, x2, z2, width, color) {
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
        const angle = Math.atan2(z2 - z1, x2 - x1);
        
        const riverGeometry = new THREE.PlaneGeometry(length, width);
        const riverMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const river = new THREE.Mesh(riverGeometry, riverMaterial);
        river.rotation.x = -Math.PI / 2;
        river.rotation.y = -angle;
        
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const groundHeight = this.getTerrainHeight(midX, midZ) + 0.01;
        
        river.position.set(midX, groundHeight, midZ);
        this.scene.add(river);
        
        this.rivers.push({
            x1: x1 - Math.cos(angle) * width/2,
            z1: z1 - Math.sin(angle) * width/2,
            x2: x2 + Math.cos(angle) * width/2,
            z2: z2 + Math.sin(angle) * width/2,
            width: width,
            color: color
        });
    }
    
    createSwampWater() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * size - halfSize;
            const z = Math.random() * size - halfSize;
            const radius = 10 + Math.random() * 20;
            
            const waterGeometry = new THREE.CircleGeometry(radius, 16);
            const waterMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x2196F3,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            
            const water = new THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            
            const groundHeight = this.getTerrainHeight(x, z) + 0.01;
            water.position.set(x, groundHeight, z);
            this.scene.add(water);
            
            this.rivers.push({
                x1: x - radius,
                z1: z - radius,
                x2: x + radius,
                z2: z + radius,
                width: radius * 2,
                color: 0x2196F3,
                isCircle: true
            });
        }
    }
    
    createDetailedForest() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        const treeCount = Math.min(500, Math.floor(size * size / 100));
        
        this.trees = [];
        
        const treeTypes = ['pine', 'oak', 'birch', 'spruce', 'poplar', 'willow'];
        
        for (let i = 0; i < treeCount; i++) {
            let x, z;
            let attempts = 0;
            
            do {
                x = Math.random() * size - halfSize;
                z = Math.random() * size - halfSize;
                attempts++;
            } while ((this.isOnRoad(x, z) || this.isOnRiver(x, z)) && attempts < 100);
            
            if (attempts >= 100) continue;
            
            const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            const tree = this.createTreeOfType(treeType);
            const height = this.getTerrainHeight(x, z);
            
            tree.position.set(x, height, z);
            
            const scale = 0.5 + Math.random() * 1.0;
            tree.scale.set(scale, scale, scale);
            tree.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(tree);
            this.trees.push(tree);
        }
        
        console.log(`Создано ${this.trees.length} деревьев на карте ${this.selectedMap.name}`);
    }
    
    createTreeOfType(type) {
        const group = new THREE.Group();
        
        let trunkColor, leavesColor, trunkHeight, leavesSize, trunkRadius;
        
        switch(type) {
            case 'pine':
                trunkColor = 0x5D4037;
                leavesColor = 0x2E7D32;
                trunkHeight = 4 + Math.random() * 3;
                leavesSize = 1.5 + Math.random() * 1.5;
                trunkRadius = 0.3 + Math.random() * 0.2;
                break;
            case 'oak':
                trunkColor = 0x795548;
                leavesColor = 0x4CAF50;
                trunkHeight = 3 + Math.random() * 4;
                leavesSize = 2 + Math.random() * 2;
                trunkRadius = 0.4 + Math.random() * 0.3;
                break;
            case 'birch':
                trunkColor = 0xF5F5F5;
                leavesColor = 0xC8E6C9;
                trunkHeight = 4 + Math.random() * 3;
                leavesSize = 1.5 + Math.random() * 1.5;
                trunkRadius = 0.2 + Math.random() * 0.2;
                break;
            case 'spruce':
                trunkColor = 0x6D4C41;
                leavesColor = 0x388E3C;
                trunkHeight = 5 + Math.random() * 4;
                leavesSize = 1.2 + Math.random() * 1.2;
                trunkRadius = 0.25 + Math.random() * 0.2;
                break;
            case 'poplar':
                trunkColor = 0x5D4037;
                leavesColor = 0x81C784;
                trunkHeight = 6 + Math.random() * 4;
                leavesSize = 1 + Math.random() * 1;
                trunkRadius = 0.3 + Math.random() * 0.2;
                break;
            case 'willow':
                trunkColor = 0x795548;
                leavesColor = 0xA5D6A7;
                trunkHeight = 3 + Math.random() * 2;
                leavesSize = 2.5 + Math.random() * 2;
                trunkRadius = 0.5 + Math.random() * 0.3;
                break;
            default:
                trunkColor = 0x795548;
                leavesColor = 0x4CAF50;
                trunkHeight = 4;
                leavesSize = 2;
                trunkRadius = 0.3;
        }
        
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: trunkColor });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        group.add(trunk);
        
        if (type === 'willow') {
            const leavesGeometry = new THREE.SphereGeometry(leavesSize, 8, 6);
            const leavesMaterial = new THREE.MeshLambertMaterial({ color: leavesColor });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = trunkHeight * 0.7;
            leaves.castShadow = true;
            group.add(leaves);
        } else {
            const leavesGeometry = new THREE.ConeGeometry(leavesSize, leavesSize * 1.5, 8);
            const leavesMaterial = new THREE.MeshLambertMaterial({ color: leavesColor });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = trunkHeight + leavesSize * 0.75;
            leaves.castShadow = true;
            group.add(leaves);
        }
        
        return group;
    }
    
    createRocksAndCliffs() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        const rockCount = Math.min(200, Math.floor(size * size / 500));
        
        this.rocks = [];
        
        for (let i = 0; i < rockCount; i++) {
            const rockSize = 0.3 + Math.random() * 2.0;
            const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
            const rockMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x424242
            });
            
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            
            let x, z;
            let attempts = 0;
            
            do {
                x = Math.random() * size - halfSize;
                z = Math.random() * size - halfSize;
                attempts++;
            } while ((this.isOnRoad(x, z) || this.isOnRiver(x, z)) && attempts < 50);
            
            if (attempts >= 50) continue;
            
            const height = this.getTerrainHeight(x, z);
            
            rock.position.set(x, height + rockSize, z);
            
            rock.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            rock.castShadow = true;
            this.scene.add(rock);
            this.rocks.push(rock);
        }
        
        if (this.selectedMap.id === 'mountain_pass' || this.selectedMap.id === 'large_wilderness') {
            this.createCliffs();
        }
    }
    
    createCliffs() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        const cliffCount = Math.floor(size / 200);
        
        for (let i = 0; i < cliffCount; i++) {
            const cliffHeight = 10 + Math.random() * 20;
            const cliffWidth = 20 + Math.random() * 30;
            const cliffDepth = 5 + Math.random() * 10;
            
            const cliffGeometry = new THREE.BoxGeometry(cliffWidth, cliffHeight, cliffDepth);
            const cliffMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x795548
            });
            
            const cliff = new THREE.Mesh(cliffGeometry, cliffMaterial);
            
            const angle = Math.random() * Math.PI * 2;
            const distance = halfSize * 0.6;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const height = this.getTerrainHeight(x, z);
            
            cliff.position.set(x, height + cliffHeight/2, z);
            cliff.rotation.y = angle + Math.PI/2;
            cliff.castShadow = true;
            
            this.scene.add(cliff);
        }
    }
    
    createFallenTrees() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        const fallenTreeCount = Math.min(50, Math.floor(size / 10));
        
        this.fallenTrees = [];
        
        for (let i = 0; i < fallenTreeCount; i++) {
            const treeLength = 3 + Math.random() * 5;
            const treeRadius = 0.2 + Math.random() * 0.3;
            
            const trunkGeometry = new THREE.CylinderGeometry(treeRadius, treeRadius, treeLength, 8);
            const trunkMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x795548
            });
            
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            
            let x, z;
            let attempts = 0;
            
            do {
                x = Math.random() * size - halfSize;
                z = Math.random() * size - halfSize;
                attempts++;
            } while ((this.isOnRoad(x, z) || this.isOnRiver(x, z)) && attempts < 50);
            
            if (attempts >= 50) continue;
            
            const height = this.getTerrainHeight(x, z);
            
            trunk.position.set(x, height + treeRadius, z);
            
            const rotationY = Math.random() * Math.PI * 2;
            const rotationX = (Math.random() - 0.5) * 0.5;
            const rotationZ = (Math.random() - 0.5) * 0.5;
            
            trunk.rotation.set(rotationX, rotationY, rotationZ);
            
            trunk.castShadow = true;
            this.scene.add(trunk);
            this.fallenTrees.push(trunk);
        }
    }
    
    createGroundDetails() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        const bushCount = Math.min(100, Math.floor(size / 5));
        
        for (let i = 0; i < bushCount; i++) {
            const bush = this.createBush();
            
            let x, z;
            let attempts = 0;
            
            do {
                x = Math.random() * size - halfSize;
                z = Math.random() * size - halfSize;
                attempts++;
            } while ((this.isOnRoad(x, z) || this.isOnRiver(x, z)) && attempts < 50);
            
            if (attempts >= 50) continue;
            
            const height = this.getTerrainHeight(x, z);
            bush.position.set(x, height, z);
            
            const scale = 0.3 + Math.random() * 0.4;
            bush.scale.set(scale, scale, scale);
            bush.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(bush);
            this.objects.push(bush);
        }
        
        this.createGrassField();
    }
    
    createBush() {
        const group = new THREE.Group();
        
        const bushGeometry = new THREE.SphereGeometry(1, 6, 4);
        const bushMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x388E3C
        });
        
        const bush = new THREE.Mesh(bushGeometry, bushMaterial);
        bush.position.y = 1;
        bush.castShadow = true;
        group.add(bush);
        
        return group;
    }
    
    createGrassField() {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        const grassCount = Math.min(1000, Math.floor(size * size / 10));
        
        this.grassInstances = [];
        
        const grassGeometry = new THREE.PlaneGeometry(0.1, 0.5);
        const grassMaterial = new THREE.MeshLambertMaterial({
            color: 0x4CAF50,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5
        });
        
        for (let i = 0; i < grassCount; i++) {
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);
            
            let x, z;
            
            do {
                x = Math.random() * size - halfSize;
                z = Math.random() * size - halfSize;
            } while (this.isOnRoad(x, z) || this.isOnRiver(x, z));
            
            const height = this.getTerrainHeight(x, z);
            grass.position.set(x, height, z);
            
            grass.rotation.y = Math.random() * Math.PI * 2;
            grass.rotation.x = (Math.random() - 0.5) * 0.2;
            grass.rotation.z = (Math.random() - 0.5) * 0.2;
            
            const scale = 0.5 + Math.random() * 0.5;
            grass.scale.set(scale, scale, scale);
            
            this.scene.add(grass);
            this.grassInstances.push(grass);
        }
    }
    
    isOnRoad(x, z) {
        if (!this.roads || this.roads.length === 0) return false;
        
        for (const road of this.roads) {
            const distance = this.distanceToLineSegment(x, z, road.x1, road.z1, road.x2, road.z2);
            if (distance < road.width / 2) {
                return true;
            }
        }
        
        return false;
    }
    
    isOnRiver(x, z) {
        if (!this.rivers || this.rivers.length === 0) return false;
        
        for (const river of this.rivers) {
            if (river.isCircle) {
                const centerX = (river.x1 + river.x2) / 2;
                const centerZ = (river.z1 + river.z2) / 2;
                const radius = river.width / 2;
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
                
                if (distance < radius) {
                    return true;
                }
            } else {
                const distance = this.distanceToLineSegment(x, z, river.x1, river.z1, river.x2, river.z2);
                if (distance < river.width / 2) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    distanceToLineSegment(px, pz, x1, z1, x2, z2) {
        const A = px - x1;
        const B = pz - z1;
        const C = x2 - x1;
        const D = z2 - z1;
        
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        
        if (len_sq !== 0) {
            param = dot / len_sq;
        }
        
        let xx, zz;
        
        if (param < 0) {
            xx = x1;
            zz = z1;
        } else if (param > 1) {
            xx = x2;
            zz = z2;
        } else {
            xx = x1 + param * C;
            zz = z1 + param * D;
        }
        
        const dx = px - xx;
        const dz = pz - zz;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    getTerrainHeight(x, z) {
        if (!this.terrainData) return 0;
        
        const size = this.terrainSize;
        const segments = this.terrainSegments;
        const halfSize = size / 2;
        
        const u = (x + halfSize) / size;
        const v = (z + halfSize) / size;
        
        if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
        
        const i = Math.floor(u * (segments - 1));
        const j = Math.floor(v * (segments - 1));
        
        const index = (i + j * segments) * 3;
        
        if (index >= 0 && index < this.terrainData.length) {
            return this.terrainData[index + 1] || 0;
        }
        
        return 0;
    }
    
    createCheckpoints() {
        this.checkpoints = [];
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        const cpCount = this.selectedMap.cps;
        
        const cpGeometry = new THREE.CylinderGeometry(1.5, 1.5, 3, 8);
        const cpMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFF9800,
            transparent: true,
            opacity: 0.9
        });
        
        for (let i = 0; i < cpCount; i++) {
            let x, z;
            let attempts = 0;
            
            do {
                const angle = (i / cpCount) * Math.PI * 2;
                const radius = halfSize * 0.7 * (0.3 + 0.7 * (i / cpCount));
                const variation = halfSize * 0.1;
                
                x = Math.cos(angle) * radius + (Math.random() * 2 - 1) * variation;
                z = Math.sin(angle) * radius + (Math.random() * 2 - 1) * variation;
                attempts++;
            } while ((this.isOnRoad(x, z) || this.isOnRiver(x, z)) && attempts < 100);
            
            if (attempts >= 100) {
                x = Math.random() * size - halfSize;
                z = Math.random() * size - halfSize;
            }
            
            const height = this.getTerrainHeight(x, z);
            
            const cp = {
                id: i + 1,
                position: { x, y: height, z },
                collected: false,
                name: `КП ${i + 1}`,
                mesh: null
            };
            
            const cpMesh = new THREE.Mesh(cpGeometry, cpMaterial);
            cpMesh.position.set(x, height + 1.5, z);
            cpMesh.castShadow = true;
            this.scene.add(cpMesh);
            
            const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4);
            const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x795548 });
            const poleMesh = new THREE.Mesh(poleGeometry, poleMaterial);
            poleMesh.position.set(x, height, z);
            poleMesh.castShadow = true;
            this.scene.add(poleMesh);
            
            const flagGeometry = new THREE.PlaneGeometry(1.5, 1);
            const flagMaterial = new THREE.MeshLambertMaterial({ 
                color: i === 0 ? 0x4CAF50 : 0xFF9800,
                side: THREE.DoubleSide 
            });
            const flag = new THREE.Mesh(flagGeometry, flagMaterial);
            flag.position.set(x + 0.75, height + 2, z);
            flag.rotation.y = -Math.PI / 4;
            this.scene.add(flag);
            
            cp.mesh = cpMesh;
            cp.pole = poleMesh;
            cp.flag = flag;
            this.checkpoints.push(cp);
        }
        
        this.updateCheckpointsList();
    }
    
    setupMouseControls() {
        const canvas = this.renderer ? this.renderer.domElement : null;
        if (!canvas) return;
        
        canvas.addEventListener('click', () => {
            if (!this.mouse.isLocked) {
                canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.mouse.isLocked = document.pointerLockElement === canvas;
            
            if (this.mouse.isLocked) {
                document.addEventListener('mousemove', this.onMouseMove.bind(this));
                const directionText = document.getElementById('directionText');
                if (directionText) {
                    directionText.textContent = 'Управление активно';
                }
            } else {
                document.removeEventListener('mousemove', this.onMouseMove.bind(this));
                const directionText = document.getElementById('directionText');
                if (directionText) {
                    directionText.textContent = 'Кликните для захвата мыши';
                }
            }
        });
    }
    
    setupMapControls() {
        const mapCanvas = document.getElementById('fullMapCanvas');
        if (!mapCanvas) return;
        
        mapCanvas.addEventListener('mousedown', (e) => {
            this.mapDrag.isDragging = true;
            this.mapDrag.startX = e.clientX;
            this.mapDrag.startY = e.clientY;
            this.mapFollowsPlayer = false;
            
            const btn = document.querySelector('[onclick="toggleMapFollow()"]');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                btn.title = 'Следовать за игроком (выключено)';
            }
        });
        
        mapCanvas.addEventListener('mousemove', (e) => {
            if (this.mapDrag.isDragging) {
                const dx = (e.clientX - this.mapDrag.startX) / this.mapZoom;
                const dy = (e.clientY - this.mapDrag.startY) / this.mapZoom;
                
                this.mapOffset.x -= dx;
                this.mapOffset.y -= dy;
                
                this.mapDrag.startX = e.clientX;
                this.mapDrag.startY = e.clientY;
                
                this.updateMap();
            }
        });
        
        mapCanvas.addEventListener('mouseup', () => {
            this.mapDrag.isDragging = false;
        });
        
        mapCanvas.addEventListener('mouseleave', () => {
            this.mapDrag.isDragging = false;
        });
        
        const topoMapCanvas = document.getElementById('topoMapCanvas');
        if (topoMapCanvas) {
            topoMapCanvas.addEventListener('mousedown', (e) => {
                this.mapDrag.isDragging = true;
                this.mapDrag.startX = e.clientX;
                this.mapDrag.startY = e.clientY;
                this.mapFollowsPlayer = false;
                
                const btn = document.querySelector('[onclick="toggleMapFollow()"]');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    btn.title = 'Следовать за игроком (выключено)';
                }
            });
            
            topoMapCanvas.addEventListener('mousemove', (e) => {
                if (this.mapDrag.isDragging) {
                    const dx = (e.clientX - this.mapDrag.startX) / this.mapZoom;
                    const dy = (e.clientY - this.mapDrag.startY) / this.mapZoom;
                    
                    this.mapOffset.x -= dx;
                    this.mapOffset.y -= dy;
                    
                    this.mapDrag.startX = e.clientX;
                    this.mapDrag.startY = e.clientY;
                    
                    this.updateMap();
                }
            });
            
            topoMapCanvas.addEventListener('mouseup', () => {
                this.mapDrag.isDragging = false;
            });
            
            topoMapCanvas.addEventListener('mouseleave', () => {
                this.mapDrag.isDragging = false;
            });
        }
    }
    
    onMouseMove(event) {
        if (!this.gameStarted || this.isPaused) return;
        
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        this.camera.rotation.y -= movementX * 0.002;
        this.camera.rotation.x -= movementY * 0.002;
        this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === 'Escape') {
                this.togglePause();
            }
            
            if (e.key === 'm' || e.key === 'ь') {
                this.toggleMap();
            }
            
            if (e.key === 'c' || e.key === 'с') {
                this.toggleCompass();
            }
            
            if (e.key === 'Shift') {
                this.keys['shift'] = true;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            
            if (e.key === 'Shift') {
                this.keys['shift'] = false;
            }
        });
    }
    
    startGameLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            if (!this.isPaused && this.gameStarted) {
                this.update();
                this.render();
            }
        };
        
        animate();
    }
    
    update() {
        if (!this.gameStarted || this.isPaused) return;
        
        this.gameTime += 0.016;
        
        this.updatePlayerMovement();
        this.updateTraining();
        this.animateObjects();
        this.checkCheckpointCollision();
        this.updateUI();
        this.updateMap();
        this.updateCompass();
        this.updateElevationProfile();
    }
    
    updatePlayerMovement() {
        const baseSpeed = this.player.speed + this.player.training.speedBonus;
        const speed = baseSpeed * 0.016;
        
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();
        
        const right = new THREE.Vector3();
        right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
        
        if (this.keys['w'] || this.keys['ц']) {
            this.camera.position.add(direction.clone().multiplyScalar(speed));
            this.player.training.distance += speed;
        }
        if (this.keys['s'] || this.keys['ы']) {
            this.camera.position.add(direction.clone().multiplyScalar(-speed * 0.7));
            this.player.training.distance += speed * 0.7;
        }
        
        if (this.keys['a'] || this.keys['ф']) {
            this.camera.position.add(right.clone().multiplyScalar(-speed * 0.8));
            this.player.training.distance += speed * 0.8;
        }
        if (this.keys['d'] || this.keys['в']) {
            this.camera.position.add(right.clone().multiplyScalar(speed * 0.8));
            this.player.training.distance += speed * 0.8;
        }
        
        if (this.keys['shift'] && this.player.stamina > 0) {
            this.camera.position.add(direction.clone().multiplyScalar(speed * 0.5));
            this.player.stamina -= 0.5;
            this.player.training.distance += speed * 0.5;
        } else if (!this.keys['shift'] && this.player.stamina < 100) {
            this.player.stamina = Math.min(100, this.player.stamina + 0.2);
        }
        
        const groundHeight = this.getTerrainHeight(this.camera.position.x, this.camera.position.z);
        this.camera.position.y = groundHeight + 1.7;
        
        const halfSize = this.selectedMap.size / 2;
        this.camera.position.x = Math.max(-halfSize + 10, Math.min(halfSize - 10, this.camera.position.x));
        this.camera.position.z = Math.max(-halfSize + 10, Math.min(halfSize - 10, this.camera.position.z));
        
        const updateElement = (id, text) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        };
        
        updateElement('currentHeight', Math.round(groundHeight));
        updateElement('terrainSlope', Math.round(this.calculateSlope(this.camera.position.x, this.camera.position.z)));
    }
    
    calculateSlope(x, z) {
        const h1 = this.getTerrainHeight(x - 0.5, z);
        const h2 = this.getTerrainHeight(x + 0.5, z);
        const h3 = this.getTerrainHeight(x, z - 0.5);
        const h4 = this.getTerrainHeight(x, z + 0.5);
        
        const dx = (h2 - h1) / 1.0;
        const dz = (h4 - h3) / 1.0;
        
        return Math.atan(Math.sqrt(dx*dx + dz*dz)) * (180 / Math.PI);
    }
    
    updateTraining() {
        const progress = Math.min(100, (this.player.training.distance / 10000) * 100);
        
        const progressFill = document.getElementById('trainingProgress');
        const trainingPercent = document.getElementById('trainingPercent');
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (trainingPercent) trainingPercent.textContent = `${Math.round(progress)}%`;
        
        if (this.player.training.distance > 1000 && this.player.training.level < 2) {
            this.player.training.level = 2;
            this.player.training.speedBonus = 0.5;
            this.showMessage('🎉 Уровень 2 достигнут! Скорость +0.5', 'Тренировка');
        }
        
        if (this.player.training.distance > 3000 && this.player.training.level < 3) {
            this.player.training.level = 3;
            this.player.training.speedBonus = 1.0;
            this.player.training.staminaBonus = 10;
            this.player.stamina += 10;
            this.showMessage('🏆 Уровень 3 достигнут! Скорость +1.0, Выносливость +10', 'Тренировка');
        }
        
        if (this.player.training.distance > 7000 && this.player.training.level < 4) {
            this.player.training.level = 4;
            this.player.training.speedBonus = 1.5;
            this.player.training.staminaBonus = 20;
            this.player.stamina += 10;
            this.showMessage('🚀 Уровень 4 достигнут! Максимальные характеристики!', 'Тренировка');
        }
        
        const updateElement = (id, text) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        };
        
        updateElement('trainingLevel', this.player.training.level);
        updateElement('trainingDistance', `${Math.round(this.player.training.distance)} м`);
        updateElement('playerStamina', Math.round(this.player.stamina));
        updateElement('playerSpeed', (this.player.speed + this.player.training.speedBonus).toFixed(1));
    }
    
    animateObjects() {
        const time = Date.now() * 0.001;
        
        this.checkpoints.forEach((cp, index) => {
            if (!cp.collected && cp.mesh) {
                cp.mesh.position.y = cp.position.y + 1.5 + Math.sin(time * 2 + index) * 0.3;
                cp.mesh.rotation.y = time;
            }
        });
        
        this.grassInstances.forEach((grass, i) => {
            const wave = Math.sin(time * 2 + i * 0.1) * 0.1;
            grass.rotation.x = (Math.random() - 0.5) * 0.2 + wave;
        });
        
        this.checkpoints.forEach(cp => {
            if (cp.flag) {
                cp.flag.rotation.y = Math.sin(time) * 0.1 - Math.PI/4;
            }
        });
    }
    
    checkCheckpointCollision() {
        if (this.currentCheckpoint >= this.checkpoints.length) return;
        
        const cp = this.checkpoints[this.currentCheckpoint];
        const distance = Math.sqrt(
            Math.pow(this.camera.position.x - cp.position.x, 2) +
            Math.pow(this.camera.position.z - cp.position.z, 2)
        );
        
        if (distance < 8 && !cp.collected) {
            cp.collected = true;
            
            if (cp.mesh) {
                cp.mesh.material.color.setHex(0x4CAF50);
                cp.mesh.material.opacity = 0.5;
            }
            
            if (cp.flag) {
                cp.flag.material.color.setHex(0x4CAF50);
            }
            
            this.showMessage(`Контрольный пункт ${cp.id} найден!`, 'Успех');
            
            if (this.currentCheckpoint === this.checkpoints.length - 1) {
                this.completeLevel();
            } else {
                this.currentCheckpoint++;
                this.updateCheckpointsList();
                this.updateNavigationHint();
            }
        }
    }
    
    updateUI() {
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const updateElement = (id, text) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        };
        
        updateElement('gameTimer', timeStr);
        updateElement('pauseTime', timeStr);
        updateElement('finalTime', timeStr);
        
        const cpStr = `${this.currentCheckpoint + 1}/${this.checkpoints.length}`;
        updateElement('currentCP', cpStr);
        updateElement('pauseCPs', cpStr);
        updateElement('finalCps', cpStr);
        
        if (this.currentCheckpoint < this.checkpoints.length) {
            const cp = this.checkpoints[this.currentCheckpoint];
            const distance = Math.sqrt(
                Math.pow(this.camera.position.x - cp.position.x, 2) +
                Math.pow(this.camera.position.z - cp.position.z, 2)
            );
            updateElement('distanceToCP', `${Math.round(distance)} м`);
        }
        
        updateElement('routeCovered', this.currentCheckpoint);
        updateElement('routeRemaining', this.checkpoints.length - this.currentCheckpoint - 1);
        updateElement('trainingDistance', `${Math.round(this.player.training.distance)} м`);
        updateElement('pauseDistance', `${Math.round(this.player.training.distance)} м`);
        updateElement('pauseLevel', this.player.training.level);
        updateElement('finalDistance', `${Math.round(this.player.training.distance)} м`);
        updateElement('finalLevel', this.player.training.level);
        
        updateElement('playerSpeed', (this.player.speed + this.player.training.speedBonus).toFixed(1));
        updateElement('playerStamina', Math.round(this.player.stamina));
        updateElement('trainingLevel', this.player.training.level);
    }
    
    updateCheckpointsList() {
        const cpsList = document.getElementById('cpsList');
        if (!cpsList) return;
        
        cpsList.innerHTML = '';
        
        this.checkpoints.forEach((cp, index) => {
            const cpItem = document.createElement('div');
            cpItem.className = 'cp-item';
            
            if (cp.collected) {
                cpItem.classList.add('completed');
            } else if (index === this.currentCheckpoint) {
                cpItem.classList.add('active');
            }
            
            cpItem.innerHTML = `
                <div class="cp-number">${cp.id}</div>
                <div class="cp-info">
                    <div class="cp-name">${cp.name}</div>
                    <div class="cp-status">
                        ${cp.collected ? 'Найден' : 
                          index === this.currentCheckpoint ? 'Текущий' : 
                          'Впереди'}
                    </div>
                </div>
            `;
            
            cpsList.appendChild(cpItem);
        });
    }
    
    updateMap() {
        const canvases = [
            { id: 'topoMapCanvas', isFull: false },
            { id: 'fullMapCanvas', isFull: true }
        ];
        
        canvases.forEach(({ id, isFull }) => {
            const mapCanvas = document.getElementById(id);
            if (!mapCanvas) return;
            
            const ctx = mapCanvas.getContext('2d');
            const width = mapCanvas.clientWidth || 300;
            const height = mapCanvas.clientHeight || 300;
            
            mapCanvas.width = width;
            mapCanvas.height = height;
            
            ctx.fillStyle = '#C5E1A5';
            ctx.fillRect(0, 0, width, height);
            
            const size = this.selectedMap.size;
            let scale, centerX, centerY;
            
            if (isFull && this.showFullMap) {
                scale = Math.min(width, height) / size;
                centerX = width / 2;
                centerY = height / 2;
            } else {
                if (this.mapFollowsPlayer) {
                    scale = (width / size) * 3 * this.mapZoom;
                    centerX = width / 2;
                    centerY = height / 2;
                } else {
                    scale = (width / size) * 3 * this.mapZoom;
                    centerX = width / 2 - (this.camera.position.x - this.mapOffset.x) * scale;
                    centerY = height / 2 - (this.camera.position.z - this.mapOffset.y) * scale;
                }
            }
            
            this.drawContourLines(ctx, scale, centerX, centerY);
            this.drawRiversOnMap(ctx, scale, centerX, centerY);
            this.drawRoadsOnMap(ctx, scale, centerX, centerY);
            this.drawCliffsOnMap(ctx, scale, centerX, centerY);
            this.drawForestZones(ctx, scale, centerX, centerY);
            this.drawRocksOnMap(ctx, scale, centerX, centerY);
            this.drawFallenTreesOnMap(ctx, scale, centerX, centerY);
            this.drawCheckpointsOnMap(ctx, scale, centerX, centerY);
            
            if (this.showPlayerMarker) {
                this.drawPlayerOnMap(ctx, scale, centerX, centerY);
            }
            
            this.updateMapCompass();
        });
    }
    
    drawContourLines(ctx, scale, centerX, centerY) {
        const size = this.selectedMap.size;
        const step = this.selectedMap.size <= 200 ? 5 : 10;
        
        ctx.strokeStyle = '#8D6E63';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        for (let h = 0; h < 50; h += step) {
            ctx.beginPath();
            const radius = (h / 50) * (size / 2) * 0.8 * scale;
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
    
    drawRiversOnMap(ctx, scale, centerX, centerY) {
        ctx.strokeStyle = '#2196F3';
        ctx.fillStyle = '#2196F3';
        ctx.lineWidth = 2;
        
        this.rivers.forEach(river => {
            if (river.isCircle) {
                const x = (river.x1 + river.x2) / 2 * scale + centerX;
                const y = (river.z1 + river.z2) / 2 * scale + centerY;
                const radius = river.width / 2 * scale;
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const x1 = river.x1 * scale + centerX;
                const y1 = river.z1 * scale + centerY;
                const x2 = river.x2 * scale + centerX;
                const y2 = river.z2 * scale + centerY;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        });
    }
    
    drawRoadsOnMap(ctx, scale, centerX, centerY) {
        this.roads.forEach(road => {
            ctx.strokeStyle = '#8D6E63';
            ctx.lineWidth = road.width * scale;
            
            const x1 = road.x1 * scale + centerX;
            const y1 = road.z1 * scale + centerY;
            const x2 = road.x2 * scale + centerX;
            const y2 = road.z2 * scale + centerY;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
    }
    
    drawCliffsOnMap(ctx, scale, centerX, centerY) {
        if (this.selectedMap.id === 'mountain_pass' || this.selectedMap.id === 'large_wilderness') {
            ctx.fillStyle = '#795548';
            
            const size = this.selectedMap.size;
            const halfSize = size / 2;
            const cliffCount = Math.floor(size / 200);
            
            for (let i = 0; i < cliffCount; i++) {
                const angle = (i / cliffCount) * Math.PI * 2;
                const distance = halfSize * 0.6;
                const x = Math.cos(angle) * distance * scale + centerX;
                const y = Math.sin(angle) * distance * scale + centerY;
                const width = 30 * scale;
                const height = 15 * scale;
                
                ctx.fillRect(x - width/2, y - height/2, width, height);
                
                ctx.strokeStyle = '#5D4037';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.strokeRect(x - width/2, y - height/2, width, height);
                ctx.setLineDash([]);
            }
        }
    }
    
    drawForestZones(ctx, scale, centerX, centerY) {
        const size = this.selectedMap.size;
        const halfSize = size / 2;
        
        ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        
        const forestZones = Math.min(5, Math.floor(size / 100));
        for (let i = 0; i < forestZones; i++) {
            const angle = (i / forestZones) * Math.PI * 2;
            const distance = halfSize * 0.4;
            const x = Math.cos(angle) * distance * scale + centerX;
            const y = Math.sin(angle) * distance * scale + centerY;
            const zoneSize = halfSize * 0.3 * scale;
            
            ctx.beginPath();
            ctx.arc(x, y, zoneSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawRocksOnMap(ctx, scale, centerX, centerY) {
        ctx.fillStyle = '#000000';
        
        this.rocks.forEach(rock => {
            const x = rock.position.x * scale + centerX;
            const y = rock.position.z * scale + centerY;
            const size = rock.geometry.parameters.radius * scale * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, Math.max(2, size), 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    drawFallenTreesOnMap(ctx, scale, centerX, centerY) {
        ctx.fillStyle = '#4CAF50';
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 1;
        
        this.fallenTrees.forEach(tree => {
            const x = tree.position.x * scale + centerX;
            const y = tree.position.z * scale + centerY;
            const length = tree.geometry.parameters.height * scale * 0.5;
            const angle = tree.rotation.y;
            
            const endX = x + Math.sin(angle) * length;
            const endY = y - Math.cos(angle) * length;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    drawCheckpointsOnMap(ctx, scale, centerX, centerY) {
        this.checkpoints.forEach((cp, index) => {
            const x = cp.position.x * scale + centerX;
            const y = cp.position.z * scale + centerY;
            
            if (cp.collected) {
                ctx.fillStyle = '#4CAF50';
            } else if (index === this.currentCheckpoint) {
                ctx.fillStyle = '#FF9800';
            } else {
                ctx.fillStyle = '#F44336';
            }
            
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cp.id.toString(), x, y);
        });
    }
    
    drawPlayerOnMap(ctx, scale, centerX, centerY) {
        const playerX = this.camera.position.x * scale + centerX;
        const playerY = this.camera.position.z * scale + centerY;
        
        ctx.beginPath();
        ctx.fillStyle = '#2196F3';
        ctx.shadowColor = '#2196F3';
        ctx.shadowBlur = 15;
        ctx.arc(playerX, playerY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const angle = this.camera.rotation.y;
        const arrowLength = 12;
        const endX = playerX + Math.sin(angle) * arrowLength;
        const endY = playerY - Math.cos(angle) * arrowLength;
        
        ctx.beginPath();
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.moveTo(playerX, playerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.fillStyle = '#2196F3';
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - Math.sin(angle - 0.3) * 5,
            endY + Math.cos(angle - 0.3) * 5
        );
        ctx.lineTo(
            endX - Math.sin(angle + 0.3) * 5,
            endY + Math.cos(angle + 0.3) * 5
        );
        ctx.closePath();
        ctx.fill();
    }
    
    updateMapCompass() {
        const compassArrow = document.querySelector('.compass-mini-arrow');
        if (compassArrow && this.camera) {
            let angle = this.camera.rotation.y * (180 / Math.PI);
            if (angle < 0) angle += 360;
            compassArrow.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        }
    }
    
    updateCompass() {
        if (!this.camera) return;
        
        let angle = this.camera.rotation.y * (180 / Math.PI);
        if (angle < 0) angle += 360;
        if (angle >= 360) angle -= 360;
        
        this.currentBearing = angle;
        
        const needles = document.querySelectorAll('.compass-arrow');
        needles.forEach(needle => {
            needle.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        });
        
        const miniCompassArrow = document.querySelector('.compass-mini-arrow');
        if (miniCompassArrow) {
            miniCompassArrow.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        }
        
        const bearings = ['#compassBearing', '#fullCompassBearing', '#fullCompassDegree'];
        bearings.forEach(id => {
            const element = document.querySelector(id);
            if (element) element.textContent = `${Math.round(angle)}°`;
        });
        
        const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        const directionNames = ['Север', 'Северо-Восток', 'Восток', 'Юго-Восток', 
                               'Юг', 'Юго-Запад', 'Запад', 'Северо-Запад'];
        const index = Math.round(angle / 45) % 8;
        
        const compassDirection = document.getElementById('compassDirection');
        const fullCompassDirection = document.getElementById('fullCompassDirection');
        if (compassDirection) compassDirection.textContent = directions[index];
        if (fullCompassDirection) fullCompassDirection.textContent = directionNames[index];
        
        const directionText = document.getElementById('directionText');
        if (directionText) {
            directionText.textContent = `Направление: ${directionNames[index]}`;
        }
    }
    
    takeBearing() {
        if (this.currentCheckpoint < this.checkpoints.length) {
            const cp = this.checkpoints[this.currentCheckpoint];
            const dx = cp.position.x - this.camera.position.x;
            const dz = cp.position.z - this.camera.position.z;
            let bearing = Math.atan2(dx, dz) * (180 / Math.PI);
            
            if (bearing < 0) bearing += 360;
            this.targetBearing = Math.round(bearing);
            
            this.showMessage(`Азимут на КП ${cp.id}: ${this.targetBearing}°`, 'Компас');
            
            const compassBearing = document.getElementById('compassBearing');
            const fullCompassBearing = document.getElementById('fullCompassBearing');
            if (compassBearing) compassBearing.textContent = `${this.targetBearing}°`;
            if (fullCompassBearing) fullCompassBearing.textContent = `${this.targetBearing}°`;
            
            setTimeout(() => {
                this.updateCompass();
            }, 3000);
        } else {
            this.showMessage('Все КП пройдены!', 'Компас');
        }
    }
    
    resetBearing() {
        this.targetBearing = 0;
        this.updateCompass();
    }
    
    updateElevationProfile() {
        const canvas = document.getElementById('elevationCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.clientWidth || 200;
        const height = canvas.clientHeight || 100;
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
        
        const profile = [];
        const steps = 50;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = t * Math.PI * 2;
            const distance = Math.min(100, this.selectedMap.size / 5);
            const x = this.camera.position.x + Math.sin(this.camera.rotation.y + angle) * distance;
            const z = this.camera.position.z + Math.cos(this.camera.rotation.y + angle) * distance;
            
            profile.push(this.getTerrainHeight(x, z));
        }
        
        const minHeight = Math.min(...profile);
        const maxHeight = Math.max(...profile);
        const range = Math.max(maxHeight - minHeight, 1);
        
        ctx.beginPath();
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        
        profile.forEach((height, i) => {
            const x = (i / steps) * width;
            const normalizedY = ((height - minHeight) / range) * (height * 0.8);
            const graphY = height - normalizedY * 0.7;
            
            if (i === 0) {
                ctx.moveTo(x, graphY);
            } else {
                ctx.lineTo(x, graphY);
            }
        });
        
        ctx.stroke();
        
        const playerHeight = this.getTerrainHeight(this.camera.position.x, this.camera.position.z);
        const playerGraphY = height - ((playerHeight - minHeight) / range) * (height * 0.8);
        
        ctx.beginPath();
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.moveTo(0, playerGraphY);
        ctx.lineTo(width, playerGraphY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.fillStyle = '#2196F3';
        ctx.arc(width / 2, playerGraphY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    updateNavigationHint() {
        if (this.currentCheckpoint < this.checkpoints.length) {
            const cp = this.checkpoints[this.currentCheckpoint];
            const distance = Math.sqrt(
                Math.pow(this.camera.position.x - cp.position.x, 2) +
                Math.pow(this.camera.position.z - cp.position.z, 2)
            );
            
            const direction = this.getDirectionToCP(cp);
            let terrainType = 'местности';
            
            const height = this.getTerrainHeight(this.camera.position.x, this.camera.position.z);
            if (height > 15) terrainType = 'горной местности';
            else if (height < 2) terrainType = 'низины';
            else if (this.isOnRoad(this.camera.position.x, this.camera.position.z)) terrainType = 'дороги';
            else if (this.isOnRiver(this.camera.position.x, this.camera.position.z)) terrainType = 'реки';
            
            const hint = `КП ${cp.id}: ${direction}, ${Math.round(distance)}м по ${terrainType}`;
            const navHint = document.getElementById('navigationHint');
            if (navHint) {
                navHint.textContent = hint;
            }
        }
    }
    
    getDirectionToCP(cp) {
        const dx = cp.position.x - this.camera.position.x;
        const dz = cp.position.z - this.camera.position.z;
        const angle = Math.atan2(dx, dz) * (180 / Math.PI);
        const playerAngle = this.camera.rotation.y * (180 / Math.PI);
        const relativeAngle = ((angle - playerAngle) + 360) % 360;
        
        if (relativeAngle < 22.5 || relativeAngle >= 337.5) return "прямо";
        if (relativeAngle < 67.5) return "справа-впереди";
        if (relativeAngle < 112.5) return "справа";
        if (relativeAngle < 157.5) return "справа-сзади";
        if (relativeAngle < 202.5) return "сзади";
        if (relativeAngle < 247.5) return "слева-сзади";
        if (relativeAngle < 292.5) return "слева";
        return "слева-впереди";
    }
    
    render() {
        if (this.scene && this.camera && this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseMenu = document.getElementById('pauseMenu');
        
        if (this.isPaused) {
            if (pauseMenu) pauseMenu.style.display = 'flex';
        } else {
            if (pauseMenu) pauseMenu.style.display = 'none';
        }
    }
    
    togglePlayerMarker() {
        this.showPlayerMarker = !this.showPlayerMarker;
        
        const btns = document.querySelectorAll('[onclick="togglePlayerMarker()"]');
        btns.forEach(btn => {
            btn.innerHTML = this.showPlayerMarker ? 
                '<i class="fas fa-user-slash"></i>' :
                '<i class="fas fa-user"></i>';
            btn.title = this.showPlayerMarker ? 'Скрыть метку игрока' : 'Показать метку игрока';
        });
        
        this.updateMap();
    }
    
    toggleMapFollow() {
        this.mapFollowsPlayer = !this.mapFollowsPlayer;
        
        const btns = document.querySelectorAll('[onclick="toggleMapFollow()"]');
        btns.forEach(btn => {
            if (this.mapFollowsPlayer) {
                btn.innerHTML = '<i class="fas fa-location-arrow" style="color: #4CAF50"></i>';
                btn.title = 'Следовать за игроком (включено)';
            } else {
                btn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                btn.title = 'Следовать за игроком (выключено)';
            }
        });
        
        if (this.mapFollowsPlayer) {
            this.mapOffset = { x: 0, y: 0 };
        }
        
        this.updateMap();
    }
    
    toggleMap() {
        const map = document.getElementById('fullscreenMap');
        if (map) {
            if (map.style.display === 'none' || !map.style.display) {
                map.style.display = 'flex';
                this.showFullMap = true;
                this.updateMap();
            } else {
                map.style.display = 'none';
                this.showFullMap = false;
            }
        }
    }
    
    toggleFullMap() {
        this.showFullMap = !this.showFullMap;
        this.updateMap();
    }
    
    toggleCompass() {
        const compass = document.getElementById('fullscreenCompass');
        if (compass) {
            compass.style.display = compass.style.display === 'none' || !compass.style.display ? 'flex' : 'none';
        }
    }
    
    hideMap() {
        const map = document.getElementById('fullscreenMap');
        if (map) {
            map.style.display = 'none';
            this.showFullMap = false;
        }
    }
    
    hideCompass() {
        const compass = document.getElementById('fullscreenCompass');
        if (compass) {
            compass.style.display = 'none';
        }
    }
    
    centerOnPlayer() {
        this.mapFollowsPlayer = true;
        this.mapOffset = { x: 0, y: 0 };
        
        const btns = document.querySelectorAll('[onclick="toggleMapFollow()"]');
        btns.forEach(btn => {
            btn.innerHTML = '<i class="fas fa-location-arrow" style="color: #4CAF50"></i>';
            btn.title = 'Следовать за игроком (включено)';
        });
        
        this.updateMap();
    }
    
    resumeGame() {
        this.isPaused = false;
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
    }
    
    restartGame() {
        this.currentCheckpoint = 0;
        this.gameTime = 0;
        this.isPaused = false;
        this.player.training.distance = 0;
        this.player.training.level = 1;
        this.player.training.speedBonus = 0;
        this.player.training.staminaBonus = 0;
        this.player.stamina = 100;
        this.mapFollowsPlayer = true;
        this.showPlayerMarker = true;
        this.mapOffset = { x: 0, y: 0 };
        
        this.checkpoints.forEach(cp => {
            cp.collected = false;
            if (cp.mesh) {
                cp.mesh.material.color.setHex(0xFF9800);
                cp.mesh.material.opacity = 0.9;
            }
            if (cp.flag) {
                cp.flag.material.color.setHex(0xFF9800);
            }
        });
        
        this.camera.position.set(0, 1.7, 0);
        this.camera.rotation.set(0, 0, 0);
        
        this.updateCheckpointsList();
        this.updateUI();
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
    }
    
    completeLevel() {
        this.gameState = 'completed';
        this.gameStarted = false;
        
        this.hideAllScreens();
        const completionScreen = document.getElementById('completionScreen');
        if (completionScreen) {
            completionScreen.classList.add('active');
        }
        
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const maxTime = this.selectedMap.cps * 180;
        const timeScore = Math.max(0, 100 - (this.gameTime / maxTime) * 100);
        const trainingBonus = this.player.training.level * 5;
        const finalScore = Math.min(100, Math.round(timeScore + trainingBonus));
        
        let medal = 'bronze';
        let medalColor = '#CD7F32';
        if (finalScore >= 80) {
            medal = 'gold';
            medalColor = '#FFD700';
        } else if (finalScore >= 60) {
            medal = 'silver';
            medalColor = '#C0C0C0';
        }
        
        const updateElement = (id, text) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        };
        
        updateElement('finalTime', timeStr);
        updateElement('completedMapName', this.selectedMap.name);
        updateElement('finalScore', `${finalScore}/100`);
        
        const medalElement = document.querySelector('.result-medal i');
        if (medalElement) {
            medalElement.className = `fas fa-medal ${medal}`;
            medalElement.style.color = medalColor;
        }
        
        const medalText = document.querySelector('.result-medal span');
        if (medalText) {
            medalText.textContent = medal === 'gold' ? 'ЗОЛОТО' : medal === 'silver' ? 'СЕРЕБРО' : 'БРОНЗА';
        }
    }
    
    quitToMenu() {
        this.gameStarted = false;
        this.isPaused = false;
        this.hideAllScreens();
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu) {
            mainMenu.classList.add('active');
        }
    }
    
    showMessage(message, title = 'Уведомление') {
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const messageModal = document.getElementById('messageModal');
        
        if (modalTitle) modalTitle.textContent = title;
        if (modalMessage) modalMessage.textContent = message;
        if (messageModal) messageModal.style.display = 'flex';
    }
    
       showNavigationTip() {
        const tips = [
            "Используйте компас для определения направления на север",
            "Следите за горизонталями на карте - они показывают рельеф",
            "Дороги и тропинки - самый быстрый путь между КП",
            "Используйте Shift для бега, но следите за выносливостью",
            "Чем больше дистанция вы пробежите, тем лучше будут ваши характеристики",
            "КП расположены в интересных местах - у скал, на холмах, в лесу",
            "Включайте и выключайте свою позицию на карте для тренировки",
            "Изучайте карту перед стартом - планируйте маршрут заранее",
            "Используйте кнопку 'Взять азимут' для точной навигации к КП",
            "Обращайте внимание на реки и ручьи - они хорошие ориентиры",
            "Каменные скалы помечены черными точками на карте",
            "Поваленные деревья отмечены зелеными крестиками на карте",
            "На маленькой карте обращайте внимание на детали - там много объектов"
        ];
        
        const tip = tips[Math.floor(Math.random() * tips.length)];
        const navHint = document.getElementById('navigationHint');
        if (navHint) {
            navHint.textContent = tip;
        }
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        const canvasContainer = document.getElementById('gameCanvasContainer');
        if (canvasContainer) {
            this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        }
        
        this.updateMap();
        this.updateElevationProfile();
    }
}

// Глобальный экземпляр игры
let game;

// Функции для управления картой
function zoomMap(direction) {
    if (!game) return;
    
    if (direction === 'in') {
        game.mapZoom *= 1.2;
    } else {
        game.mapZoom *= 0.8;
    }
    
    game.mapZoom = Math.max(0.5, Math.min(5, game.mapZoom));
    game.updateMap();
}

function centerMap() {
    if (!game) return;
    
    game.mapOffset = { x: 0, y: 0 };
    game.mapZoom = 1.0;
    game.mapFollowsPlayer = true;
    game.updateMap();
}

function centerOnPlayer() {
    if (!game) return;
    game.centerOnPlayer();
}

function toggleMapFollow() {
    if (!game) return;
    game.toggleMapFollow();
}

// Функции для кнопок HTML
function initGame() {
    game = new VirtualOGame();
}

function showMainMenu() {
    if (game) game.showMainMenu();
}

function showLevelSelect() {
    if (game) game.showLevelSelect();
}

function showTraining() {
    if (game) game.showTraining();
}

function showSettings() {
    if (game) game.showSettings();
}

function showMultiplayer() {
    alert('Мультиплеер будет доступен в следующем обновлении!');
}

function showEditor() {
    alert('Редактор карт будет доступен в следующем обновлении!');
}

function filterMaps(category) {
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => btn.classList.remove('active'));
    
    const eventBtn = event.currentTarget;
    if (eventBtn) {
        eventBtn.classList.add('active');
    }
    
    const allCards = document.querySelectorAll('.map-card');
    if (category === 'all') {
        allCards.forEach(card => card.style.display = 'block');
    } else {
        allCards.forEach(card => {
            if (card.querySelector(`.difficulty-${category}`)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
}

function selectMap(map) {
    if (game) game.selectMap(map);
}

function startSelectedMap() {
    if (game) game.startGame();
}

function togglePause() {
    if (game) game.togglePause();
}

function resumeGame() {
    if (game) game.resumeGame();
}

function restartGame() {
    if (game) game.restartGame();
}

function quitToMenu() {
    if (game) game.quitToMenu();
}

function toggleMap() {
    if (game) game.toggleMap();
}

function toggleCompass() {
    if (game) game.toggleCompass();
}

function togglePlayerMarker() {
    if (game) game.togglePlayerMarker();
}

function toggleFullMap() {
    if (game) game.toggleFullMap();
}

function hideMap() {
    if (game) game.hideMap();
}

function hideCompass() {
    if (game) game.hideCompass();
}

function closeModal() {
    const messageModal = document.getElementById('messageModal');
    if (messageModal) {
        messageModal.style.display = 'none';
    }
}

function quitGame() {
    if (confirm('Вы уверены, что хотите выйти из игры?')) {
        window.close();
    }
}

function openTab(tabId) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    const eventBtn = event.currentTarget;
    if (eventBtn) {
        eventBtn.classList.add('active');
    }
}

function saveSettings() {
    alert('Настройки сохранены!');
    showMainMenu();
}

function resetSettings() {
    if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
        alert('Настройки сброшены!');
    }
}

function selectLesson(lessonNumber) {
    const lessons = document.querySelectorAll('.lesson');
    lessons.forEach(lesson => {
        lesson.classList.remove('active');
    });
    
    const lessonContents = document.querySelectorAll('.lesson-content');
    lessonContents.forEach(content => {
        content.classList.remove('active');
    });
    
    const eventBtn = event.currentTarget;
    if (eventBtn) {
        eventBtn.classList.add('active');
    }
    
    const selectedLesson = document.getElementById(`lesson${lessonNumber}`);
    if (selectedLesson) {
        selectedLesson.classList.add('active');
    }
}

function retryMap() {
    if (game) {
        game.quitToMenu();
        setTimeout(() => {
            game.showLevelSelect();
        }, 100);
    }
}

function backToMainMenu() {
    if (game) {
        game.quitToMenu();
    } else {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu) {
            mainMenu.classList.add('active');
        }
    }
}

function shareResult() {
    alert('Функция "Поделиться" будет доступена в полной версии!');
}

function addToFavorites() {
    alert('Карта добавлена в избранное!');
}

function takeBearing() {
    if (game) game.takeBearing();
}

function resetBearing() {
    if (game) game.resetBearing();
}

function takeBearingFromMap() {
    takeBearing();
}

function togglePlayerMarkerFromMap() {
    togglePlayerMarker();
}

// Адаптивная настройка при загрузке
function setupResponsiveLayout() {
    function adjustLayout() {
        const gameMain = document.querySelector('.game-main');
        const elevationSection = document.querySelector('.elevation-section');
        
        if (!gameMain || !elevationSection) return;
        
        const windowHeight = window.innerHeight;
        const gameTopbar = document.querySelector('.game-topbar');
        const gameBottombar = document.querySelector('.game-bottombar');
        
        const topbarHeight = gameTopbar ? gameTopbar.offsetHeight : 70;
        const bottombarHeight = gameBottombar ? gameBottombar.offsetHeight : 70;
        
        const availableHeight = windowHeight - topbarHeight - bottombarHeight - 40;
        
        if (availableHeight < 600) {
            gameMain.style.gridTemplateColumns = '220px 1fr';
            elevationSection.style.display = 'none';
        } else {
            gameMain.style.gridTemplateColumns = '220px 1fr 300px';
            elevationSection.style.display = 'flex';
        }
        
        if (availableHeight < 500) {
            gameMain.style.gridTemplateColumns = '1fr';
            document.querySelectorAll('.game-leftpanel, .game-rightpanel').forEach(panel => {
                panel.style.maxHeight = '200px';
            });
        }
        
        if (game && game.updateElevationProfile) {
            setTimeout(() => game.updateElevationProfile(), 100);
        }
    }
    
    window.addEventListener('resize', adjustLayout);
    window.addEventListener('load', adjustLayout);
    
    setTimeout(adjustLayout, 1000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    setupResponsiveLayout();
    
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        const valueSpan = document.getElementById(slider.id + 'Value');
        if (valueSpan) {
            valueSpan.textContent = slider.value;
            
            slider.addEventListener('input', () => {
                valueSpan.textContent = slider.value;
            });
        }
    });
});