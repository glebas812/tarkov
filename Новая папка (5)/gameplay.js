// Менеджер игрового процесса
class GameplayManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.playerStats = {
            speed: 0,
            stamina: 100,
            accuracy: 100,
            distance: 0,
            errors: 0,
            lastPosition: null
        };
        
        this.route = {
            waypoints: [],
            distance: 0,
            elevationGain: 0
        };
        
        this.weather = {
            timeOfDay: 'day',
            weather: 'clear',
            temperature: 20,
            wind: { speed: 2, direction: 0 }
        };
        
        this.navigation = {
            currentBearing: 0,
            targetBearing: 0,
            distanceToTarget: 0,
            hints: [],
            lastHintDistance: Infinity
        };
        
        this.init();
    }
    
    init() {
        this.setupRealisticMovement();
        this.setupNavigationSystem();
        this.setupWeatherSystem();
    }
    
    setupRealisticMovement() {
        this.movementModel = {
            baseSpeed: 5.0,
            terrainModifiers: {
                'road': 1.0,
                'trail': 0.8,
                'forest': 0.6,
                'rocky': 0.4,
                'uphill': 0.5,
                'downhill': 1.2
            },
            stamina: {
                max: 100,
                drainRate: 0.1,
                recoveryRate: 0.05,
                effectOnSpeed: 0.5
            }
        };
    }
    
    calculateMovementSpeed(terrainType, slope) {
        let speed = this.movementModel.baseSpeed;
        
        // Модификатор местности
        speed *= this.movementModel.terrainModifiers[terrainType] || 0.6;
        
        // Модификатор уклона
        if (slope > 10) {
            speed *= this.movementModel.terrainModifiers.uphill;
        } else if (slope < -10) {
            speed *= this.movementModel.terrainModifiers.downhill;
        }
        
        // Модификатор выносливости
        if (this.playerStats.stamina < 30) {
            speed *= this.movementModel.stamina.effectOnSpeed;
        }
        
        // Модификатор погоды
        if (this.weather.weather === 'rain') {
            speed *= 0.8;
        } else if (this.weather.weather === 'storm') {
            speed *= 0.6;
        }
        
        return Math.max(speed, 0.5);
    }
    
    setupNavigationSystem() {
        this.navigationSystem = {
            compassAccuracy: 2,
            mapReadingSkill: 1.0,
            lastKnownPosition: null,
            breadcrumbs: [],
            
            calculateBearing(from, to) {
                const dx = to.x - from.x;
                const dz = to.z - from.z;
                const bearing = Math.atan2(dx, dz) * (180 / Math.PI);
                return bearing < 0 ? bearing + 360 : bearing;
            },
            
            getHint(currentPos, targetPos, terrain) {
                const distance = Math.sqrt(
                    Math.pow(targetPos.x - currentPos.x, 2) + 
                    Math.pow(targetPos.z - currentPos.z, 2)
                );
                
                const bearing = this.calculateBearing(currentPos, targetPos);
                const direction = this.getDirectionName(bearing);
                
                let hint = `Двигайтесь ${direction}`;
                
                if (distance > 200) {
                    hint += ` около ${Math.round(distance)} метров`;
                } else if (distance > 50) {
                    hint += ` примерно ${Math.round(distance)} метров`;
                } else {
                    hint += `, КП уже близко`;
                }
                
                // Добавляем информацию о местности
                if (terrain === 'road') {
                    hint += ` по дороге`;
                } else if (terrain === 'trail') {
                    hint += ` по тропинке`;
                } else if (terrain === 'swamp') {
                    hint += ` через болото (двигайтесь осторожно)`;
                }
                
                return hint;
            },
            
            getDirectionName(bearing) {
                const directions = [
                    'на север', 'на северо-восток', 'на восток', 'на юго-восток',
                    'на юг', 'на юго-запад', 'на запад', 'на северо-запад'
                ];
                const index = Math.round(bearing / 45) % 8;
                return directions[index];
            }
        };
    }
    
    setupWeatherSystem() {
        this.weatherSystem = {
            timeOfDay: 'day',
            weatherConditions: ['clear', 'cloudy', 'rain', 'fog', 'storm'],
            currentWeather: 'clear',
            temperature: 20,
            visibility: 1000,
            
            update(deltaTime) {
                // Симуляция изменения погоды
                if (Math.random() < 0.001 * deltaTime) {
                    this.changeWeather();
                }
                
                // Симуляция времени суток
                this.updateTimeOfDay(deltaTime);
            },
            
            changeWeather() {
                const newWeather = this.weatherConditions[
                    Math.floor(Math.random() * this.weatherConditions.length)
                ];
                
                if (newWeather !== this.currentWeather) {
                    this.currentWeather = newWeather;
                    this.updateWeatherEffects();
                }
            },
            
            updateTimeOfDay(deltaTime) {
                // Упрощенная модель времени
                const time = this.game ? this.game.gameTime : 0;
                const hour = (time / 60) % 24;
                
                if (hour >= 20 || hour <= 6) {
                    this.timeOfDay = 'night';
                } else if (hour >= 18 || hour <= 8) {
                    this.timeOfDay = 'dusk';
                } else {
                    this.timeOfDay = 'day';
                }
            },
            
            updateWeatherEffects() {
                switch(this.currentWeather) {
                    case 'clear':
                        this.visibility = 1000;
                        break;
                    case 'cloudy':
                        this.visibility = 800;
                        break;
                    case 'rain':
                        this.visibility = 500;
                        break;
                    case 'fog':
                        this.visibility = 100;
                        break;
                    case 'storm':
                        this.visibility = 300;
                        break;
                }
            }
        };
    }
    
    update(deltaTime) {
        if (!this.game || this.game.isPaused) return;
        
        // Обновляем погоду
        this.weatherSystem.update(deltaTime);
        
        // Обновляем статистику игрока
        this.updatePlayerStats(deltaTime);
        
        // Обновляем навигацию
        this.updateNavigation();
        
        // Обновляем маршрут
        this.updateRoute();
    }
    
    updatePlayerStats(deltaTime) {
        // Расчет скорости
        if (this.game && this.game.camera) {
            const currentPos = this.game.camera.position;
            const lastPos = this.playerStats.lastPosition || { x: currentPos.x, z: currentPos.z };
            const distance = Math.sqrt(
                Math.pow(currentPos.x - lastPos.x, 2) + 
                Math.pow(currentPos.z - lastPos.z, 2)
            );
            
            this.playerStats.speed = distance / deltaTime;
            this.playerStats.distance += distance;
            this.playerStats.lastPosition = { x: currentPos.x, z: currentPos.z };
            
            // Расчет выносливости
            if (this.playerStats.speed > 2) {
                this.playerStats.stamina -= this.movementModel.stamina.drainRate * deltaTime;
            } else {
                this.playerStats.stamina += this.movementModel.stamina.recoveryRate * deltaTime;
            }
            
            this.playerStats.stamina = Math.max(0, Math.min(100, this.playerStats.stamina));
        }
    }
    
    updateNavigation() {
        if (this.game && this.game.currentCheckpoint < this.game.checkpoints.length) {
            const currentCP = this.game.checkpoints[this.game.currentCheckpoint];
            const playerPos = this.game.camera.position;
            const cpPos = currentCP.position;
            
            // Расчет азимута
            this.navigation.currentBearing = this.navigationSystem.calculateBearing(
                {x: playerPos.x, z: playerPos.z},
                {x: cpPos.x, z: cpPos.z}
            );
            
            // Расчет расстояния
            this.navigation.distanceToTarget = Math.sqrt(
                Math.pow(cpPos.x - playerPos.x, 2) + 
                Math.pow(cpPos.z - playerPos.z, 2)
            );
            
            // Генерация подсказки
            if (this.navigation.hints.length === 0 || 
                this.navigation.distanceToTarget < this.navigation.lastHintDistance * 0.7) {
                
                const terrain = this.getCurrentTerrainType(playerPos);
                const hint = this.navigationSystem.getHint(
                    {x: playerPos.x, z: playerPos.z},
                    {x: cpPos.x, z: cpPos.z},
                    terrain
                );
                
                this.navigation.hints.push({
                    text: hint,
                    distance: this.navigation.distanceToTarget,
                    time: this.game.gameTime
                });
                
                this.navigation.lastHintDistance = this.navigation.distanceToTarget;
                
                // Обновляем подсказку в UI
                this.updateNavigationHint(hint);
            }
        }
    }
    
    getCurrentTerrainType(position) {
        if (!this.game) return 'forest';
        
        const height = this.game.getTerrainHeight(position.x, position.z);
        
        if (height < 1) return 'swamp';
        if (height > 15) return 'rocky';
        if (this.game.isOnRoad(position.x, position.z)) return 'road';
        
        return 'forest';
    }
    
    updateNavigationHint(hint) {
        const hintElement = document.getElementById('navigationHint');
        if (hintElement) {
            hintElement.textContent = hint;
            
            // Анимация появления
            hintElement.style.opacity = '0';
            setTimeout(() => {
                hintElement.style.transition = 'opacity 0.5s';
                hintElement.style.opacity = '1';
            }, 10);
        }
    }
    
    updateRoute() {
        if (this.game && this.game.camera) {
            // Добавляем точку в маршрут
            const point = {
                position: { x: this.game.camera.position.x, z: this.game.camera.position.z },
                time: this.game.gameTime,
                speed: this.playerStats.speed
            };
            
            this.route.waypoints.push(point);
            
            // Ограничиваем количество точек
            if (this.route.waypoints.length > 1000) {
                this.route.waypoints.shift();
            }
            
            // Пересчитываем дистанцию
            if (this.route.waypoints.length > 1) {
                const lastPoint = this.route.waypoints[this.route.waypoints.length - 2];
                const segmentDistance = Math.sqrt(
                    Math.pow(point.position.x - lastPoint.position.x, 2) + 
                    Math.pow(point.position.z - lastPoint.position.z, 2)
                );
                this.route.distance += segmentDistance;
            }
        }
    }
    
    addNavigationError() {
        this.playerStats.errors++;
        
        // Обновляем статистику точности
        if (this.navigation.hints.length > 0) {
            const recentHints = this.navigation.hints.slice(-5);
            const errorRate = this.playerStats.errors / (recentHints.length + this.playerStats.errors);
            this.playerStats.accuracy = Math.max(0, 100 - (errorRate * 100));
        }
    }
    
    getFinalStats() {
        if (!this.game) return null;
        
        return {
            time: this.game.gameTime,
            distance: this.playerStats.distance,
            avgSpeed: this.game.gameTime > 0 ? (this.playerStats.distance / this.game.gameTime) * 3.6 : 0,
            accuracy: this.playerStats.accuracy,
            errors: this.playerStats.errors,
            staminaUsed: 100 - this.playerStats.stamina,
            routeEfficiency: this.calculateRouteEfficiency()
        };
    }
    
    calculateRouteEfficiency() {
        if (this.route.waypoints.length < 2) return 100;
        
        const firstPoint = this.route.waypoints[0];
        const lastPoint = this.route.waypoints[this.route.waypoints.length - 1];
        
        const straightLineDistance = Math.sqrt(
            Math.pow(lastPoint.position.x - firstPoint.position.x, 2) + 
            Math.pow(lastPoint.position.z - firstPoint.position.z, 2)
        );
        
        const efficiency = (straightLineDistance / this.route.distance) * 100;
        return Math.min(100, Math.round(efficiency));
    }
}

// Глобальный экземпляр менеджера геймплея
let gameplayManager;

// Инициализация менеджера геймплея
function initGameplay(gameInstance) {
    gameplayManager = new GameplayManager(gameInstance);
    return gameplayManager;
}

// Обновление геймплея
function updateGameplay(deltaTime) {
    if (gameplayManager) {
        gameplayManager.update(deltaTime);
    }
}

// Экспорт для использования в основном игровом цикле
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameplayManager,
        initGameplay,
        updateGameplay
    };
}