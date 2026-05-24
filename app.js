// Piped Frontend - Основной JavaScript файл

// Конфигурация
const CONFIG = {
    // Список Piped инстансов для использования
    instances: [
        'https://pipedapi.kavin.rocks',
        'https://pipedapi.in.projectsegfau.lt',
        'https://pipedapi.adminforge.de',
        'https://api.piped.yt'
    ],
    // Скрипты плеера с приоритетом
    playerScripts: [
        'https://cdn.jsdelivr.net/gh/OinkTechLLC/cdnplayerjs@main/playerjs.js',
        'https://cdn.jsdelivr.net/gh/OinkTechLtd/cdnplayerjs@main/playerjs.js',
        'https://cdn.jsdelivr.net/gh/twixoffltdco/cdnplayerjs@main/playerjs.js'
    ]
};

// Глобальное состояние
let state = {
    currentInstance: null,
    currentPlayerScript: 0,
    currentVideoId: null,
    isPlayerLoaded: false
};

// DOM элементы
const elements = {
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    searchType: document.getElementById('searchType'),
    searchResults: document.getElementById('searchResults'),
    trendingVideos: document.getElementById('trendingVideos'),
    searchResultsGrid: document.getElementById('searchResultsGrid'),
    videoPlayer: document.getElementById('videoPlayer'),
    channelPage: document.getElementById('channelPage'),
    playerWrapper: document.getElementById('playerWrapper'),
    playerPlaceholder: document.getElementById('playerPlaceholder'),
    videoTitle: document.getElementById('videoTitle'),
    videoViews: document.getElementById('videoViews'),
    videoDate: document.getElementById('videoDate'),
    channelAvatar: document.getElementById('channelAvatar'),
    channelName: document.getElementById('channelName'),
    videoDescription: document.getElementById('videoDescription'),
    commentsList: document.getElementById('commentsList'),
    backButton: document.getElementById('backButton'),
    backToSearchBtn: document.getElementById('backToSearchBtn'),
    currentInstance: document.getElementById('currentInstance'),
    channelPageAvatar: document.getElementById('channelPageAvatar'),
    channelPageName: document.getElementById('channelPageName'),
    channelPageSubscribers: document.getElementById('channelPageSubscribers'),
    channelPageDescription: document.getElementById('channelPageDescription'),
    channelVideosGrid: document.getElementById('channelVideosGrid')
};

// Инициализация
async function init() {
    // Выбор рабочего инстанса
    state.currentInstance = await findWorkingInstance();
    
    if (state.currentInstance) {
        elements.currentInstance.textContent = state.currentInstance;
        console.log('Используемый инстанс:', state.currentInstance);
        
        // Загрузка трендов
        loadTrending();
    } else {
        showError('Не удалось подключиться ни к одному Piped инстансу');
    }
    
    // Обработчики событий
    setupEventListeners();
}

// Поиск рабочего инстанса
async function findWorkingInstance() {
    for (const instance of CONFIG.instances) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${instance}/trending`, {
                signal: controller.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                return instance;
            }
        } catch (error) {
            console.log(`Инстанс ${instance} не работает:`, error.message);
        }
    }
    return null;
}

// Загрузка трендов
async function loadTrending() {
    try {
        showLoading(elements.trendingVideos);
        
        const response = await fetch(`${state.currentInstance}/trending`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки трендов');
        
        const data = await response.json();
        renderVideos(data, elements.trendingVideos);
    } catch (error) {
        console.error('Ошибка загрузки трендов:', error);
        elements.trendingVideos.innerHTML = '<p class="error-message">Не удалось загрузить тренды</p>';
    }
}

// Поиск
async function search(query, type = 'all') {
    if (!query.trim()) return;
    
    try {
        showLoading(elements.searchResultsGrid);
        
        let url = `${state.currentInstance}/search?q=${encodeURIComponent(query)}`;
        
        if (type !== 'all') {
            url += `&filter=${type}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Ошибка поиска');
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            renderVideos(data.items, elements.searchResultsGrid);
        } else {
            elements.searchResultsGrid.innerHTML = '<p class="loading">Ничего не найдено</p>';
        }
    } catch (error) {
        console.error('Ошибка поиска:', error);
        elements.searchResultsGrid.innerHTML = '<p class="error-message">Ошибка при поиске. Попробуйте позже.</p>';
    }
}

// Рендеринг видео
function renderVideos(videos, container) {
    container.innerHTML = '';
    
    const videoItems = videos.filter(item => 
        item.type === 'stream' || item.type === 'channel'
    );
    
    if (videoItems.length === 0) {
        container.innerHTML = '<p class="loading">Нет результатов</p>';
        return;
    }
    
    videoItems.forEach(item => {
        const card = createVideoCard(item);
        container.appendChild(card);
    });
}

// Создание карточки видео
function createVideoCard(item) {
    const card = document.createElement('div');
    card.className = 'video-card';
    
    if (item.type === 'stream') {
        card.innerHTML = `
            <img src="${item.thumbnail}" alt="${escapeHtml(item.title)}" class="video-thumbnail" loading="lazy">
            <div class="video-info">
                <h3 class="video-title">${escapeHtml(item.title)}</h3>
                <p class="channel-name">${escapeHtml(item.uploaderName)}</p>
                <div class="video-meta">
                    <span>${formatViews(item.views)}</span>
                    <span>${formatDate(item.uploadedDate)}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            loadVideo(item.url.split('=')[1]);
        });
    } else if (item.type === 'channel') {
        card.innerHTML = `
            <img src="${item.thumbnail}" alt="${escapeHtml(item.name)}" class="video-thumbnail" style="aspect-ratio: 1; object-fit: cover;">
            <div class="video-info">
                <h3 class="video-title">${escapeHtml(item.name)}</h3>
                <p class="channel-name">Канал</p>
                <div class="video-meta">
                    <span>${formatSubscribers(item.subscribers)}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            loadChannel(item.url.split('/')[2]);
        });
    }
    
    return card;
}

// Загрузка видео
async function loadVideo(videoId) {
    state.currentVideoId = videoId;
    
    try {
        showSection('videoPlayer');
        showLoading(elements.playerWrapper);
        
        const response = await fetch(`${state.currentInstance}/streams/${videoId}`);
        
        if (!response.ok) throw new Error('Ошибка загрузки видео');
        
        const data = await response.json();
        
        // Обновление информации о видео
        elements.videoTitle.textContent = data.title;
        elements.videoViews.textContent = formatViews(data.views);
        elements.videoDate.textContent = formatDate(data.uploadDate);
        elements.channelName.textContent = data.uploader;
        elements.channelAvatar.src = data.uploaderAvatar;
        elements.videoDescription.textContent = data.description;
        
        // Загрузка комментариев
        loadComments(videoId);
        
        // Инициализация плеера
        initPlayer(videoId, data.hls);
        
    } catch (error) {
        console.error('Ошибка загрузки видео:', error);
        elements.playerWrapper.innerHTML = '<p class="error-message">Не удалось загрузить видео</p>';
    }
}

// Инициализация плеера с переключением между скриптами
async function initPlayer(videoId, hlsUrl) {
    elements.playerWrapper.innerHTML = '';
    
    // Создаем контейнер для плеера
    const playerContainer = document.createElement('div');
    playerContainer.id = 'playerContainer';
    playerContainer.style.width = '100%';
    playerContainer.style.height = '100%';
    elements.playerWrapper.appendChild(playerContainer);
    
    // Добавляем переключатель плееров
    const switcher = document.createElement('div');
    switcher.className = 'player-switcher';
    
    CONFIG.playerScripts.forEach((script, index) => {
        const btn = document.createElement('button');
        btn.className = `player-btn ${index === state.currentPlayerScript ? 'active' : ''}`;
        btn.textContent = `Плеер ${index + 1}`;
        btn.dataset.index = index;
        btn.addEventListener('click', () => switchPlayer(index));
        switcher.appendChild(btn);
    });
    
    elements.playerWrapper.appendChild(switcher);
    
    // Попытка загрузить плеер
    await tryLoadPlayer(videoId, hlsUrl);
}

// Попытка загрузки плеера
async function tryLoadPlayer(videoId, hlsUrl, retryCount = 0) {
    const maxRetries = CONFIG.playerScripts.length;
    
    if (retryCount >= maxRetries) {
        elements.playerPlaceholder = document.createElement('div');
        elements.playerPlaceholder.className = 'player-placeholder';
        elements.playerPlaceholder.innerHTML = `
            <div>
                <p>Все плееры не работают 😔</p>
                <p style="margin-top: 10px; font-size: 14px;">Попробуйте обновить страницу или выбрать другое видео</p>
            </div>
        `;
        elements.playerWrapper.insertBefore(elements.playerPlaceholder, elements.playerWrapper.firstChild);
        return;
    }
    
    const scriptIndex = (state.currentPlayerScript + retryCount) % maxRetries;
    const scriptUrl = CONFIG.playerScripts[scriptIndex];
    
    console.log(`Попытка ${retryCount + 1}: Загрузка плеера из ${scriptUrl}`);
    
    try {
        // Проверяем, загружен ли уже скрипт
        const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
        
        if (existingScript && window.CDNPlayer) {
            // Скрипт уже загружен
            createPlayer(videoId, hlsUrl);
            updatePlayerButtons(scriptIndex);
            return;
        }
        
        // Создаем promise для отслеживания загрузки
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;
            
            script.onload = () => {
                console.log(`Скрипт загружен: ${scriptUrl}`);
                // Даем время на инициализацию
                setTimeout(() => {
                    if (window.CDNPlayer || window.PlayerJS) {
                        resolve();
                    } else {
                        reject(new Error('Скрипт загружен, но объект плеера не найден'));
                    }
                }, 500);
            };
            
            script.onerror = () => {
                console.error(`Ошибка загрузки скрипта: ${scriptUrl}`);
                reject(new Error('Не удалось загрузить скрипт'));
            };
            
            document.head.appendChild(script);
            
            // Таймаут на загрузку
            setTimeout(() => {
                if (!window.CDNPlayer && !window.PlayerJS) {
                    script.remove();
                    reject(new Error('Таймаут загрузки скрипта'));
                }
            }, 10000);
        });
        
        // Создаем плеер
        createPlayer(videoId, hlsUrl);
        updatePlayerButtons(scriptIndex);
        state.currentPlayerScript = scriptIndex;
        
    } catch (error) {
        console.error(`Плеер ${scriptIndex} не работает:`, error.message);
        updatePlayerButtons(scriptIndex, true);
        // Пробуем следующий
        await tryLoadPlayer(videoId, hlsUrl, retryCount + 1);
    }
}

// Создание плеера
function createPlayer(videoId, hlsUrl) {
    const container = document.getElementById('playerContainer');
    
    if (!container) {
        console.error('Контейнер плеера не найден');
        return;
    }
    
    container.innerHTML = '';
    
    // Удаляем placeholder если есть
    const placeholder = elements.playerWrapper.querySelector('.player-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    // Пытаемся использовать CDNPlayer
    if (window.CDNPlayer) {
        try {
            const player = new window.CDNPlayer({
                container: container,
                file: hlsUrl,
                autoplay: true,
                width: '100%',
                height: '100%'
            });
            
            console.log('Плеер CDNPlayer успешно создан');
            state.isPlayerLoaded = true;
            return;
        } catch (error) {
            console.error('Ошибка создания CDNPlayer:', error);
        }
    }
    
    // Пытаемся использовать PlayerJS
    if (window.PlayerJS) {
        try {
            const player = new window.PlayerJS(container, {
                file: hlsUrl,
                autoplay: true
            });
            
            console.log('Плеер PlayerJS успешно создан');
            state.isPlayerLoaded = true;
            return;
        } catch (error) {
            console.error('Ошибка создания PlayerJS:', error);
        }
    }
    
    // Fallback: используем нативный HLS через hls.js
    loadFallbackPlayer(container, hlsUrl);
}

// Загрузка fallback плеера (hls.js)
async function loadFallbackPlayer(container, hlsUrl) {
    try {
        // Загружаем hls.js
        await new Promise((resolve, reject) => {
            const existingScript = document.querySelector('script[src*="hls.js"]');
            if (existingScript && window.Hls) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        if (Hls.isSupported()) {
            const hls = new Hls();
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = true;
            video.style.width = '100%';
            video.style.height = '100%';
            
            container.appendChild(video);
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
            
            console.log('Fallback плеер (hls.js) успешно создан');
            state.isPlayerLoaded = true;
        } else {
            throw new Error('HLS не поддерживается');
        }
    } catch (error) {
        console.error('Ошибка загрузки fallback плеера:', error);
        container.innerHTML = `
            <div class="player-placeholder">
                <p>Не удалось запустить плеер</p>
                <p style="margin-top: 10px; font-size: 14px;">${error.message}</p>
            </div>
        `;
    }
}

// Переключение плеера
async function switchPlayer(index) {
    if (index === state.currentPlayerScript) return;
    
    state.currentPlayerScript = index;
    state.isPlayerLoaded = false;
    
    // Перезагружаем плеер
    if (state.currentVideoId) {
        const response = await fetch(`${state.currentInstance}/streams/${state.currentVideoId}`);
        const data = await response.json();
        await tryLoadPlayer(state.currentVideoId, data.hls);
    }
}

// Обновление кнопок плеера
function updatePlayerButtons(activeIndex, failed = false) {
    const buttons = document.querySelectorAll('.player-btn');
    buttons.forEach((btn, index) => {
        btn.classList.remove('active', 'failed');
        if (index === activeIndex) {
            btn.classList.add('active');
            if (failed) {
                btn.classList.add('failed');
            }
        }
    });
}

// Загрузка комментариев
async function loadComments(videoId) {
    try {
        const response = await fetch(`${state.currentInstance}/comments/${videoId}`);
        
        if (!response.ok) throw new Error('Ошибка загрузки комментариев');
        
        const data = await response.json();
        
        if (data.comments && data.comments.length > 0) {
            renderComments(data.comments);
        } else {
            elements.commentsList.innerHTML = '<p class="loading">Комментариев нет</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
        elements.commentsList.innerHTML = '<p class="loading">Не удалось загрузить комментарии</p>';
    }
}

// Рендеринг комментариев
function renderComments(comments) {
    elements.commentsList.innerHTML = '';
    
    comments.slice(0, 20).forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        commentEl.innerHTML = `
            <img src="${comment.commenterThumbnail}" alt="${escapeHtml(comment.commenter)}" class="comment-avatar">
            <div class="comment-content">
                <p class="comment-author">${escapeHtml(comment.commenter)}</p>
                <p class="comment-text">${escapeHtml(comment.commentText)}</p>
            </div>
        `;
        elements.commentsList.appendChild(commentEl);
    });
}

// Загрузка канала
async function loadChannel(channelId) {
    try {
        showSection('channelPage');
        showLoading(elements.channelVideosGrid);
        
        const response = await fetch(`${state.currentInstance}/channel/${channelId}`);
        
        if (!response.ok) throw new Error('Ошибка загрузки канала');
        
        const data = await response.json();
        
        elements.channelPageAvatar.src = data.avatar;
        elements.channelPageName.textContent = data.name;
        elements.channelPageSubscribers.textContent = formatSubscribers(data.subscriberCount);
        elements.channelPageDescription.textContent = data.description;
        
        if (data.relatedStreams && data.relatedStreams.length > 0) {
            renderVideos(data.relatedStreams, elements.channelVideosGrid);
        } else {
            elements.channelVideosGrid.innerHTML = '<p class="loading">Видео нет</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки канала:', error);
        elements.channelVideosGrid.innerHTML = '<p class="error-message">Не удалось загрузить канал</p>';
    }
}

// Управление секциями
function showSection(sectionId) {
    elements.searchResults.classList.add('hidden');
    elements.videoPlayer.classList.add('hidden');
    elements.channelPage.classList.add('hidden');
    
    document.getElementById(sectionId).classList.remove('hidden');
    window.scrollTo(0, 0);
}

// Показ загрузки
function showLoading(container) {
    container.innerHTML = '<p class="loading">Загрузка...</p>';
}

// Показ ошибки
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => errorDiv.remove(), 5000);
}

// Обработчики событий
function setupEventListeners() {
    elements.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = elements.searchInput.value;
        const type = elements.searchType.value;
        search(query, type);
        showSection('searchResults');
    });
    
    elements.backButton.addEventListener('click', () => {
        showSection('searchResults');
    });
    
    elements.backToSearchBtn.addEventListener('click', () => {
        showSection('searchResults');
    });
}

// Утилиты
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatViews(views) {
    if (!views) return '0';
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    }
    if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
}

function formatSubscribers(count) {
    if (!count) return '0 подписчиков';
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M подписчиков';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K подписчиков';
    }
    return count + ' подписчиков';
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
        return 'Сегодня';
    } else if (diffDays < 7) {
        return `${diffDays} дн. назад`;
    } else if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)} нед. назад`;
    } else if (diffDays < 365) {
        return `${Math.floor(diffDays / 30)} мес. назад`;
    } else {
        return `${Math.floor(diffDays / 365)} лет назад`;
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);
