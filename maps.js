// База данных карт
const MAPS_DATABASE = {
    forest_park: {
        id: 'forest_park',
        name: 'Лесной парк',
        description: 'Идеальная карта для начинающих ориентировщиков. Ровный рельеф с четкими просеками и тропинками. Отличное место для отработки базовых навыков чтения карты и работы с компасом.',
        difficulty: 'beginner',
        size: 500,
        terrain: 'Холмистый',
        cps: 5,
        timeLimit: 1800,
        features: [
            'Четкие тропинки',
            'Просеки',
            'Небольшие холмы',
            'Ручьи',
            'Мосты'
        ],
        bestTimes: [
            { player: 'Алексей', time: 872 },
            { player: 'Мария', time: 945 },
            { player: 'Иван', time: 1012 }
        ]
    },
    hilly_terrain: {
        id: 'hilly_terrain',
        name: 'Холмистая местность',
        description: 'Карта средней сложности с разнообразным рельефом. Множество холмов и оврагов требуют внимательного планирования маршрута и учета перепадов высот.',
        difficulty: 'advanced',
        size: 800,
        terrain: 'Горный',
        cps: 7,
        timeLimit: 2700,
        features: [
            'Крутые склоны',
            'Овраги',
            'Платформы',
            'Каменные гряды',
            'Родники'
        ],
        bestTimes: [
            { player: 'Профессионал', time: 1325 },
            { player: 'Навигатор', time: 1450 },
            { player: 'Спринтер', time: 1515 }
        ]
    },
    mountain_pass: {
        id: 'mountain_pass',
        name: 'Горный перевал',
        description: 'Экстремально сложная карта для опытных ориентировщиков. Крутые подъемы, скальные участки и изменчивые погодные условия делают этот маршрут настоящим вызовом.',
        difficulty: 'expert',
        size: 1000,
        terrain: 'Скалистый',
        cps: 10,
        timeLimit: 3600,
        features: [
            'Скальные выходы',
            'Крутые обрывы',
            'Горные ручьи',
            'Осыпи',
            'Перевалы'
        ],
        bestTimes: [
            { player: 'Альпинист', time: 2148 },
            { player: 'Скалолаз', time: 2280 },
            { player: 'Экстремал', time: 2355 }
        ]
    },
    swamp_area: {
        id: 'swamp_area',
        name: 'Болотистая местность',
        description: 'Сложная карта с множеством водных преград и заболоченных участков. Требует внимательного выбора маршрута и использования природных ориентиров.',
        difficulty: 'expert',
        size: 700,
        terrain: 'Равнинный',
        cps: 8,
        timeLimit: 3000,
        features: [
            'Болота',
            'Озера',
            'Редкий лес',
            'Кочки',
            'Топи'
        ],
        bestTimes: [
            { player: 'Болотник', time: 1895 },
            { player: 'Проводник', time: 2010 },
            { player: 'Следопыт', time: 2155 }
        ]
    }
};

// Функции для работы с картами
function getMapById(mapId) {
    return MAPS_DATABASE[mapId];
}

function getAllMaps() {
    return Object.values(MAPS_DATABASE);
}

function getMapsByDifficulty(difficulty) {
    return getAllMaps().filter(map => map.difficulty === difficulty);
}

function getMapRecord(mapId) {
    const map = getMapById(mapId);
    if (!map || !map.bestTimes || map.bestTimes.length === 0) return '--:--';
    
    const bestTime = map.bestTimes[0].time;
    const minutes = Math.floor(bestTime / 60);
    const seconds = Math.floor(bestTime % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Генерация контрольных пунктов для карт
function generateCheckpointsForMap(mapId, count) {
    const map = MAPS_DATABASE[mapId];
    if (!map) return [];
    
    const checkpoints = [];
    const halfSize = map.size / 2;
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = halfSize * 0.7 * (0.3 + 0.7 * (i / count));
        
        const checkpoint = {
            id: i + 1,
            position: {
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius,
                y: 0
            },
            name: `КП ${i + 1}`,
            difficulty: calculateCPDifficulty(i, count, map.difficulty)
        };
        
        checkpoints.push(checkpoint);
    }
    
    return checkpoints;
}

function calculateCPDifficulty(index, total, mapDifficulty) {
    const baseDifficulty = {
        'beginner': 1,
        'advanced': 2,
        'expert': 3
    }[mapDifficulty] || 1;
    
    const progression = (index / total) * 0.5;
    return Math.min(baseDifficulty + progression, 5);
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MAPS_DATABASE,
        getMapById,
        getAllMaps,
        getMapsByDifficulty,
        getMapRecord,
        generateCheckpointsForMap
    };
}