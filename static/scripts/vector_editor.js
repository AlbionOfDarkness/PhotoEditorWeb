// ========== КЛАСС ТРАНСФОРМАЦИЙ (УПРОЩЕННЫЙ) ==========
class TransformManager {
    constructor(editor) {
        this.editor = editor;
        this.currentHandle = null;
        this.isTransforming = false;
        this.startData = null;
    }

    // Создаем упрощенные маркеры
    createTransformOverlay() {
        this.removeTransformOverlay();
        if (this.editor.selectedElements.size !== 1) return;

        const element = Array.from(this.editor.selectedElements)[0];
        const bbox = this.getElementBBox(element);

        // Просто обновляем панель свойств - маркеры не создаем
        this.editor.updateTransformFields(element);
    }

    getElementBBox(element) {
        try {
            // Получаем локальный BBox (без трансформаций)
            const bbox = element.getBBox ? element.getBBox() :
                { x: 0, y: 0, width: 100, height: 100 };

            const transform = element.getAttribute('transform') || '';
            let matrix = this.editor.canvas.createSVGMatrix();

            if (transform) {
                // Парсим трансформации и создаем матрицу
                const transforms = transform.match(/(\w+)\(([^)]+)\)/g) || [];
                transforms.forEach(t => {
                    const match = t.match(/(\w+)\(([^)]+)\)/);
                    if (match) {
                        const [, type, values] = match;
                        const params = values.split(/[,\s]+/).map(Number);

                        switch(type) {
                            case 'translate':
                                matrix = matrix.translate(params[0], params[1]);
                                break;
                            case 'rotate':
                                matrix = matrix.rotate(params[0]);
                                break;
                            case 'scale':
                                matrix = matrix.scale(params[0], params[1] || params[0]);
                                break;
                            case 'skewX':
                                matrix = matrix.skewX(params[0]);
                                break;
                            case 'skewY':
                                matrix = matrix.skewY(params[0]);
                                break;
                        }
                    }
                });

                // Применяем матрицу к точкам BBox
                const points = [
                    {x: bbox.x, y: bbox.y},
                    {x: bbox.x + bbox.width, y: bbox.y},
                    {x: bbox.x + bbox.width, y: bbox.y + bbox.height},
                    {x: bbox.x, y: bbox.y + bbox.height}
                ];

                const svgPoint = this.editor.canvas.createSVGPoint();
                const transformedPoints = points.map(p => {
                    svgPoint.x = p.x;
                    svgPoint.y = p.y;
                    return svgPoint.matrixTransform(matrix);
                });

                const xs = transformedPoints.map(p => p.x);
                const ys = transformedPoints.map(p => p.y);

                bbox.x = Math.min(...xs);
                bbox.y = Math.min(...ys);
                bbox.width = Math.max(...xs) - bbox.x;
                bbox.height = Math.max(...ys) - bbox.y;
            }

            // Учитываем масштаб интерфейса
            const zoom = this.editor.zoom || 1;
            return {
                x: bbox.x / zoom,
                y: bbox.y / zoom,
                width: bbox.width / zoom,
                height: bbox.height / zoom
            };

        } catch (e) {
            console.error('Ошибка getElementBBox:', e);
            return { x: 0, y: 0, width: 100, height: 100 };
        }
    }

    removeTransformOverlay() {
        // Просто очищаем визуальные элементы если они есть
        const existingOverlay = document.querySelector('.transform-overlay');
        if (existingOverlay) existingOverlay.remove();
    }

    // Обновляем поля трансформаций
    updateTransformFields(element) {
        // Получаем АБСОЛЮТНЫЙ BBox (с учетом всех трансформаций)
        const absoluteBBox = this.getElementBBox(element);

        // Получаем ЛОКАЛЬНЫЙ BBox (без трансформаций)
        const localBBox = this.editor.getLocalBBox(element);

        // Обновляем поля позиции и размера
        if (document.getElementById('transformX')) {
            document.getElementById('transformX').value = Math.round(absoluteBBox.x);
        }
        if (document.getElementById('transformY')) {
            document.getElementById('transformY').value = Math.round(absoluteBBox.y);
        }
        if (document.getElementById('transformWidth')) {
            document.getElementById('transformWidth').value = Math.round(localBBox.width);
        }
        if (document.getElementById('transformHeight')) {
            document.getElementById('transformHeight').value = Math.round(localBBox.height);
        }

        // Парсим трансформации для поворота, масштаба и наклона
        const transform = element.getAttribute('transform') || '';
        const transforms = transform.match(/(\w+)\(([^)]+)\)/g) || [];

        // Сбрасываем значения
        const rotationSlider = document.getElementById('transformRotation');
        const rotationValue = document.getElementById('rotationValue');
        const transformScaleX = document.getElementById('transformScaleX');
        const transformScaleY = document.getElementById('transformScaleY');
        const transformSkewX = document.getElementById('transformSkewX');
        const transformSkewY = document.getElementById('transformSkewY');

        // Устанавливаем значения по умолчанию
        if (rotationSlider) rotationSlider.value = 0;
        if (rotationValue) rotationValue.textContent = '0°';
        if (transformScaleX) transformScaleX.value = 1;
        if (transformScaleY) transformScaleY.value = 1;
        if (transformSkewX) transformSkewX.value = 0;
        if (transformSkewY) transformSkewY.value = 0;

        // Парсим трансформации
        transforms.forEach(t => {
            const match = t.match(/(\w+)\(([^)]+)\)/);
            if (match) {
                const [, type, values] = match;
                const params = values.split(/[,\s]+/).map(Number);

                switch(type) {
                    case 'rotate':
                        if (rotationSlider) rotationSlider.value = params[0];
                        if (rotationValue) rotationValue.textContent = `${params[0]}°`;
                        break;
                    case 'scale':
                        if (transformScaleX) transformScaleX.value = params[0];
                        if (transformScaleY) transformScaleY.value = params[1] || params[0];
                        break;
                    case 'skewX':
                        if (transformSkewX) transformSkewX.value = params[0];
                        break;
                    case 'skewY':
                        if (transformSkewY) transformSkewY.value = params[0];
                        break;
                }
            }
        });
    }

    updateTransformValues(transform) {
        // Парсим простые трансформации
        const transforms = transform.match(/(\w+)\(([^)]+)\)/g) || [];

        transforms.forEach(t => {
            const match = t.match(/(\w+)\(([^)]+)\)/);
            if (match) {
                const [, type, values] = match;
                const params = values.split(/[,\s]+/).map(Number);

                switch(type) {
                    case 'rotate':
                        const rotationSlider = document.getElementById('transformRotation');
                        const rotationValue = document.getElementById('rotationValue');
                        if (rotationSlider) rotationSlider.value = params[0];
                        if (rotationValue) rotationValue.textContent = `${params[0]}°`;
                        break;
                    case 'scale':
                        const scaleX = document.getElementById('transformScaleX');
                        const scaleY = document.getElementById('transformScaleY');
                        if (scaleX) scaleX.value = params[0];
                        if (scaleY) scaleY.value = params[1] || params[0];
                        break;
                    case 'skewX':
                        const skewX = document.getElementById('transformSkewX');
                        if (skewX) skewX.value = params[0];
                        break;
                    case 'skewY':
                        const skewY = document.getElementById('transformSkewY');
                        if (skewY) skewY.value = params[0];
                        break;
                }
            }
        });
    }
}


// ========== КЛАСС СЛОЯ ==========
class Layer {
    constructor(id, name = null) {
        this.id = id;
        this.name = name || `Слой ${id}`;
        this.elements = [];
        this.visible = true;
        this.locked = false;
        this.isActive = false;
        this.group = null;
    }

    createGroupElement() {
        const ns = 'http://www.w3.org/2000/svg';
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('data-layer-id', this.id);
        group.setAttribute('data-layer-name', this.name);
        group.setAttribute('class', 'layer-group');
        group.setAttribute('visibility', this.visible ? 'visible' : 'hidden');

        if (this.locked) {
            group.style.pointerEvents = 'none';
        }

        return group;
    }

    setVisibility(visible) {
        this.visible = visible;
        if (this.group) {
            this.group.setAttribute('visibility', visible ? 'visible' : 'hidden');
        }
    }

    setLocked(locked) {
        this.locked = locked;
        if (this.group) {
            if (locked) {
                this.group.style.pointerEvents = 'none';
            } else {
                this.group.style.pointerEvents = 'auto';
            }
        }
    }

    addElement(element) {
        if (!this.elements.includes(element)) {
            this.elements.push(element);
            // Добавляем данные о слое в элемент
            element.setAttribute('data-layer-id', this.id);

            // Добавляем элемент в группу слоя
            if (this.group && element.parentNode !== this.group) {
                this.group.appendChild(element);
            }
        }
    }

    removeElement(element) {
        const index = this.elements.indexOf(element);
        if (index > -1) {
            this.elements.splice(index, 1);
            element.removeAttribute('data-layer-id');
        }
    }

    clear() {
        // Удаляем все элементы из DOM
        this.elements.forEach(element => {
            if (element.parentNode === this.group) {
                element.remove();
            }
        });
        this.elements = [];
    }

    destroy() {
        this.clear();
        if (this.group && this.group.parentNode) {
            this.group.remove();
        }
        this.group = null;
    }
}

// Основной класс векторного редактора
class VectorEditor {
    constructor() {
        this.canvas = document.getElementById('vectorCanvas');
        this.canvasWrapper = document.getElementById('vectorCanvasWrapper');
        this.currentTool = 'select';
        this.selectedElements = new Set();
        this.isDrawing = false;
        this.startPoint = { x: 0, y: 0 };
        this.currentElement = null;
        this.zoom = 1;
        this.gridVisible = false;
        this.isDragging = false;
        this.dragStart = null;
        this.currentPolygonPoints = [];
        this.currentStarPoints = [];
        this.currentPathPoints = [];

        // Система слоев
        this.layers = [];
        this.currentLayerIndex = 0;
        this.layerCounter = 1;
        this.isDraggingSaved = false;
        this.isAttributeChangeSaved = false;

        // История
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;

        // Свойства для работы с растром
        this.currentRasterImage = null;
        this.isTracing = false;
        this.traceCanvas = null;
        this.traceCtx = null;
        this.originalImageData = null;
        this.tracePreviewElement = null;

        // Добавляем TransformManager
        this.transformManager = new TransformManager(this);
        this.currentTransformMode = 'select'; // select, scale, rotate, skew

        this.initialize();
    }

    initialize() {
        console.log('VectorEditor initializing...');
        this.setupEventListeners();
        this.loadInitialCanvas();
        this.updateStatusBar();
        this.setupInitialLayers();
        this.setupPropertyListeners();
        this.setupModalListeners();
        this.setupTransformListeners();
    }

    // ========== ОБРАБОТКА СОБЫТИЙ ==========

    setupEventListeners() {
        // ОБЪЕДИНЕННЫЙ ОБРАБОТЧИК ДЛЯ ВСЕХ ИНСТРУМЕНТОВ И ДЕЙСТВИЙ
        document.querySelectorAll('[data-tool], [data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('[data-tool], [data-action]');

                if (target.dataset.tool) {
                    // Обычный инструмент рисования (выбор, прямоугольник и т.д.)
                    this.setTool(target.dataset.tool);
                }
                else if (target.dataset.action === 'insertRaster') {
                    // Специальное действие: вставка растрового изображения
                    document.getElementById('rasterFileInput').click();
                }
                // Здесь можно добавлять другие действия по мере необходимости
            });
        });

        document.getElementById('startTraceBtn')?.addEventListener('click', () => {
            if (this.selectedElements.size !== 1) {
                alert('Выберите одно растровое изображение для трассировки');
                return;
            }

            const selectedElement = Array.from(this.selectedElements)[0];
            if (selectedElement.tagName.toLowerCase() !== 'image') {
                alert('Выберите растровое изображение для трассировки');
                return;
            }

            this.showTraceModal(selectedElement);
        });

        // Обработчик закрытия модального окна трассировки
        document.querySelectorAll('[data-dismiss="trace"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeTraceModal());
        });

        // Обработчик для выбора файла изображения (raster)
        document.getElementById('rasterFileInput')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.insertRasterImage(e.target.files[0]);
                e.target.value = ''; // Сбрасываем input
            }
        });

        // Обработчик для выбора файла изображения в панели свойств
        document.getElementById('browseImageBtn')?.addEventListener('click', () => {
            document.getElementById('imageFileInput').click();
        });

        document.getElementById('imageFileInput')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.insertRasterImage(e.target.files[0]);
            }
        });

        // Создание нового холста
        const newCanvasBtn = document.getElementById('newCanvas');
        if (newCanvasBtn) {
            newCanvasBtn.addEventListener('click', () => {
                this.showNewCanvasModal();
            });
        }

        // Импорт SVG
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                await this.importFile(e.target.files[0]);
            }
        });

        // Экспорт
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.showExportModal();
        });

        // Отмена/повтор
        document.getElementById('undoBtn')?.addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('redoBtn')?.addEventListener('click', () => {
            this.redo();
        });

        // Изменение масштаба
        document.getElementById('zoomLevel')?.addEventListener('change', (e) => {
            this.setZoom(parseFloat(e.target.value));
        });

        // Переключение сетки
        document.getElementById('gridToggle')?.addEventListener('click', () => {
            this.toggleGrid();
        });

        // Полноэкранный режим
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // События холста
        if (this.canvas) {
            this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
            this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
            this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
            this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        }

        // Горячие клавиши
        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Кнопки управления слоями
        document.getElementById('addLayerBtn')?.addEventListener('click', () => {
            this.createLayer();
        });

        document.getElementById('deleteLayerBtn')?.addEventListener('click', () => {
            const activeLayer = this.getActiveLayer();
            if (activeLayer) {
                if (confirm(`Удалить слой "${activeLayer.name}"?`)) {
                    this.deleteLayer(activeLayer.id);
                }
            }
        });

        document.getElementById('renameLayerBtn')?.addEventListener('click', () => {
            const activeLayer = this.getActiveLayer();
            if (activeLayer) {
                const newName = prompt('Введите новое имя слоя:', activeLayer.name);
                if (newName && newName.trim()) {
                    activeLayer.name = newName.trim();
                    this.updateLayersUI();
                }
            }
        });

        // Растровые инструменты
        document.getElementById('browseImageBtn')?.addEventListener('click', () => {
            document.getElementById('imageFileInput').click();
        });

        document.getElementById('imageFileInput')?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.insertRasterImage(e.target.files[0]);
            }
        });

        // Анимация
        document.getElementById('addAnimationBtn')?.addEventListener('click', () => {
            this.addAnimationToSelected();
        });

        // Операции с объектами
        document.getElementById('groupBtn')?.addEventListener('click', () => {
            this.groupSelected();
        });

        document.getElementById('ungroupBtn')?.addEventListener('click', () => {
            this.ungroupSelected();
        });

        // Выравнивание
        document.getElementById('alignLeftBtn')?.addEventListener('click', () => {
            this.alignSelected('left');
        });

        document.getElementById('alignCenterBtn')?.addEventListener('click', () => {
            this.alignSelected('center');
        });

        document.getElementById('alignRightBtn')?.addEventListener('click', () => {
            this.alignSelected('right');
        });

        // Закрытие панели свойств
        document.getElementById('closeProperties')?.addEventListener('click', () => {
            document.querySelector('.vector-properties').style.display = 'none';
        });
    }

    setupPropertyListeners() {
        // Общие свойства
        document.getElementById('fillColor')?.addEventListener('input', (e) => {
            this.updateSelectedAttribute('fill', e.target.value);
        });

        document.getElementById('strokeColor')?.addEventListener('input', (e) => {
            this.updateSelectedAttribute('stroke', e.target.value);
        });

        document.getElementById('strokeWidth')?.addEventListener('input', (e) => {
            this.updateSelectedAttribute('stroke-width', e.target.value);
        });

        document.getElementById('strokeDasharray')?.addEventListener('change', (e) => {
            this.updateSelectedAttribute('stroke-dasharray', e.target.value);
        });

        // Свойства фигур
        document.getElementById('posX')?.addEventListener('change', (e) => {
            this.updatePosition('x', parseFloat(e.target.value));
        });

        document.getElementById('posY')?.addEventListener('change', (e) => {
            this.updatePosition('y', parseFloat(e.target.value));
        });

        document.getElementById('width')?.addEventListener('change', (e) => {
            this.updateSelectedAttribute('width', parseFloat(e.target.value));
        });

        document.getElementById('height')?.addEventListener('change', (e) => {
            this.updateSelectedAttribute('height', parseFloat(e.target.value));
        });

        // Свойства текста
        document.getElementById('textContent')?.addEventListener('input', (e) => {
            this.updateSelectedAttribute('textContent', e.target.value);
        });

        document.getElementById('fontFamily')?.addEventListener('change', (e) => {
            this.updateSelectedAttribute('font-family', e.target.value);
        });

        document.getElementById('fontSize')?.addEventListener('input', (e) => {
            this.updateSelectedAttribute('font-size', e.target.value);
        });

        document.getElementById('textAnchor')?.addEventListener('change', (e) => {
            this.updateSelectedAttribute('text-anchor', e.target.value);
        });

        // Свойства растрового изображения
        document.getElementById('imageOpacity')?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.updateSelectedAttribute('opacity', value);
            document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
        });

        document.getElementById('imageFilter')?.addEventListener('change', (e) => {
            this.updateSelectedAttribute('filter', e.target.value);
        });

        // Трассировка
        document.getElementById('traceThreshold')?.addEventListener('input', (e) => {
            document.getElementById('thresholdValue').textContent = e.target.value;
        });
    }

    setupModalListeners() {
        // Кнопки модальных окон
        document.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Создание холста
        document.getElementById('createCanvasBtn')?.addEventListener('click', () => {
            this.createNewCanvas();
            this.closeModal('newCanvasModal');
        });

        // Экспорт
        document.getElementById('confirmExportBtn')?.addEventListener('click', () => {
            this.exportFile();
            this.closeModal('exportModal');
        });

        // Закрытие по клику вне модального окна
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    // ========== МЕТОДЫ ХОЛСТА ==========

    setTool(tool) {
        this.currentTool = tool;

        // Скрываем маркеры при смене инструмента (кроме выбора)
        if (tool !== 'select') {
            this.transformManager.removeTransformOverlay();
        }

        // Обновляем UI
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tool="${tool}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Сбрасываем состояние рисования для сложных фигур
        if (tool !== 'polygon' && tool !== 'star' && tool !== 'path') {
            this.currentPolygonPoints = [];
            this.currentStarPoints = [];
            this.currentPathPoints = [];
        }

        // Обновляем видимость панелей свойств
        this.updatePropertiesPanelVisibility();

        // Обновляем статус бар
        this.updateStatusBar();
    }

    onCanvasClick(e) {
        if (e.target === this.canvas) {
            this.clearSelection();
        }
    }

    onMouseDown(e) {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const point = {
            x: (e.clientX - rect.left) / this.zoom,
            y: (e.clientY - rect.top) / this.zoom
        };
        this.startPoint = point;

        switch(this.currentTool) {
            case 'select':
                this.handleSelectStart(e, point);
                break;
            case 'rectangle':
            case 'circle':
            case 'ellipse':
            case 'line':
                this.startDrawing();
                break;
            case 'polygon':
                this.handlePolygonClick(point);
                break;
            case 'star':
                this.handleStarClick(point);
                break;
            case 'path':
                this.handlePathClick(point);
                break;
            case 'text':
                this.createTextElement(point);
                break;
            case 'raster':
                alert('Используйте кнопку "Выбрать файл" для вставки изображения');
                break;
        }
    }

    // В класс VectorEditor добавьте метод:
    updateTransformPanel() {
        this.transformManager.updateTransformPanel();
    }

    onMouseMove(e) {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
            const currentPoint = {
                x: (e.clientX - rect.left) / this.zoom,  // ДЕЛИМ НА МАСШТАБ!
                y: (e.clientY - rect.top) / this.zoom
            };

        // Обновляем координаты
        const coordsElement = document.querySelector('.coordinates');
        if (coordsElement) {
            coordsElement.textContent = `X: ${Math.round(currentPoint.x)}, Y: ${Math.round(currentPoint.y)}`;
        }

        if (this.isDrawing && this.currentElement) {
            this.updateDrawing(currentPoint);
        }

        // Перетаскивание выбранных элементов
        if (this.isDragging && this.selectedElements.size > 0) {
            const deltaX = currentPoint.x - this.dragStart.x;
            const deltaY = currentPoint.y - this.dragStart.y;
            this.dragSelected(deltaX, deltaY);
            this.dragStart = currentPoint;
        }
    }

    onMouseUp(e) {
        if (this.isDrawing && this.currentTool !== 'polygon' && this.currentTool !== 'star' && this.currentTool !== 'path') {
            this.finishDrawing();
        }
        this.isDragging = false;

        // Сохраняем состояние после завершения перемещения
        if (this.isDraggingSaved) {
            this.saveState('Перемещение объектов завершено');
            this.isDraggingSaved = false;
        }
    }

    onDoubleClick(e) {
        if (this.currentTool === 'polygon' && this.currentPolygonPoints.length >= 3) {
            this.finishPolygon();
        } else if (this.currentTool === 'star' && this.currentStarPoints.length >= 2) {
            this.finishStar();
        } else if (this.currentTool === 'path' && this.currentPathPoints.length >= 2) {
            this.finishPath();
        }
    }

    handleSelectStart(e, point) {
        const target = e.target;

        // Если кликнули на объект
        if (target.classList.contains('vector-object') ||
            target.parentNode?.classList?.contains('vector-object')) {

            const element = target.classList.contains('vector-object') ? target : target.parentNode;

            if (e.ctrlKey || e.metaKey) {
                // Добавляем/удаляем из выделения
                if (this.selectedElements.has(element)) {
                    this.selectedElements.delete(element);
                    element.classList.remove('selected');
                } else {
                    this.selectedElements.add(element);
                    element.classList.add('selected');
                }
            } else {
                // Одиночный выбор
                if (!this.selectedElements.has(element)) {
                    this.clearSelection();
                    this.selectedElements.add(element);
                    element.classList.add('selected');
                }
            }

            // Начинаем перетаскивание
            this.isDragging = true;
            this.dragStart = point;

            this.updatePropertiesPanel();
        } else {
            // Клик по пустому месту - снимаем выделение
            this.clearSelection();
        }

        this.updateStatusBar();
    }

    // ========== РИСОВАНИЕ ФИГУР ==========

    startDrawing() {
        this.isDrawing = true;

        // Сохраняем состояние перед началом рисования
        this.saveState('Начало рисования');

        // Создаем временный элемент
        this.currentElement = this.createShapeElement();
    }

    createShapeElement() {
        const ns = 'http://www.w3.org/2000/svg';
        let element;

        switch(this.currentTool) {
            case 'rectangle':
                element = document.createElementNS(ns, 'rect');
                element.setAttribute('x', this.startPoint.x);
                element.setAttribute('y', this.startPoint.y);
                element.setAttribute('width', '0');
                element.setAttribute('height', '0');
                break;
            case 'circle':
                element = document.createElementNS(ns, 'circle');
                element.setAttribute('cx', this.startPoint.x);
                element.setAttribute('cy', this.startPoint.y);
                element.setAttribute('r', '0');
                break;
            case 'ellipse':
                element = document.createElementNS(ns, 'ellipse');
                element.setAttribute('cx', this.startPoint.x);
                element.setAttribute('cy', this.startPoint.y);
                element.setAttribute('rx', '0');
                element.setAttribute('ry', '0');
                break;
            case 'line':
                element = document.createElementNS(ns, 'line');
                element.setAttribute('x1', this.startPoint.x);
                element.setAttribute('y1', this.startPoint.y);
                element.setAttribute('x2', this.startPoint.x);
                element.setAttribute('y2', this.startPoint.y);
                break;
            default:
                return null;
        }

        // Устанавливаем стили
        element.setAttribute('fill', '#3498db');
        element.setAttribute('stroke', '#2c3e50');
        element.setAttribute('stroke-width', '2');
        element.setAttribute('class', 'vector-object');
        element.setAttribute('id', `elem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        // Добавляем элемент в активный слой
        const activeLayer = this.getActiveLayer();
        if (activeLayer && !activeLayer.locked) {
            if (activeLayer.group) {
                activeLayer.group.appendChild(element);
            } else {
                this.canvas.appendChild(element);
            }
            activeLayer.addElement(element);
        } else if (this.canvas) {
            this.canvas.appendChild(element);
        }

        return element;
    }

    updateDrawing(currentPoint) {
        if (!this.currentElement) return;

        const width = Math.abs(currentPoint.x - this.startPoint.x);
        const height = Math.abs(currentPoint.y - this.startPoint.y);

        switch(this.currentTool) {
            case 'rectangle':
                const x = Math.min(this.startPoint.x, currentPoint.x);
                const y = Math.min(this.startPoint.y, currentPoint.y);
                this.currentElement.setAttribute('x', x);
                this.currentElement.setAttribute('y', y);
                this.currentElement.setAttribute('width', width);
                this.currentElement.setAttribute('height', height);
                break;
            case 'circle':
                const radius = Math.sqrt(width * width + height * height) / 2;
                this.currentElement.setAttribute('r', radius);
                break;
            case 'ellipse':
                this.currentElement.setAttribute('rx', width / 2);
                this.currentElement.setAttribute('ry', height / 2);
                break;
            case 'line':
                this.currentElement.setAttribute('x2', currentPoint.x);
                this.currentElement.setAttribute('y2', currentPoint.y);
                break;
        }
    }

    finishDrawing() {
        this.isDrawing = false;

        if (this.currentElement) {
            // Сохраняем состояние после завершения рисования
            this.saveState(`Создан ${this.getShapeName(this.currentTool)}`);
        }

        this.currentElement = null;
    }

    getShapeName(tool) {
        const names = {
            'rectangle': 'прямоугольник',
            'circle': 'круг',
            'ellipse': 'эллипс',
            'line': 'линия',
            'polygon': 'многоугольник',
            'star': 'звезда',
            'path': 'кривая',
            'text': 'текст'
        };
        return names[tool] || 'объект';
    }

    // ========== СЛОЖНЫЕ ФИГУРЫ ==========

    handlePolygonClick(point) {
        if (this.currentPolygonPoints.length === 0) {
            // Сохраняем состояние перед началом создания полигона
            this.saveState('Начало создания многоугольника');
        }

        this.currentPolygonPoints.push(point);

        if (this.currentPolygonPoints.length === 1) {
            // Первая точка - создаем полигон
            this.currentElement = this.createPolygonElement();
        } else if (this.currentPolygonPoints.length >= 3) {
            // Обновляем полигон
            this.updatePolygon();
        }
    }

    createPolygonElement() {
        const ns = 'http://www.w3.org/2000/svg';
        const polygon = document.createElementNS(ns, 'polygon');

        polygon.setAttribute('points', this.currentPolygonPoints.map(p => `${p.x},${p.y}`).join(' '));
        polygon.setAttribute('fill', '#9b59b6');
        polygon.setAttribute('stroke', '#8e44ad');
        polygon.setAttribute('stroke-width', '2');
        polygon.setAttribute('class', 'vector-object');
        polygon.setAttribute('id', `polygon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        // Добавляем элемент в активный слой
        const activeLayer = this.getActiveLayer();
        if (activeLayer && !activeLayer.locked) {
            if (activeLayer.group) {
                activeLayer.group.appendChild(polygon);
            } else {
                this.canvas.appendChild(polygon);
            }
            activeLayer.addElement(polygon);
        } else if (this.canvas) {
            this.canvas.appendChild(polygon);
        }

        return polygon;
    }

    updatePolygon() {
        if (!this.currentElement) return;
        this.currentElement.setAttribute('points',
            this.currentPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')
        );
    }

    finishPolygon() {
        if (this.currentPolygonPoints.length >= 3) {
            // Сохраняем состояние после завершения полигона
            this.saveState('Создан многоугольник');

            this.currentPolygonPoints = [];
            this.currentElement = null;
        }
    }

    handleStarClick(point) {
        if (this.currentStarPoints.length === 0) {
            // Первая точка - центр звезды
            this.currentStarPoints.push(point);
        } else if (this.currentStarPoints.length === 1) {
            // Вторая точка - внешний радиус
            this.currentStarPoints.push(point);
            this.createStarElement();
        }
    }

    createStarElement() {
        if (this.currentStarPoints.length < 2) return;

        const ns = 'http://www.w3.org/2000/svg';
        const center = this.currentStarPoints[0];
        const radiusPoint = this.currentStarPoints[1];

        const radius = Math.sqrt(
            Math.pow(radiusPoint.x - center.x, 2) +
            Math.pow(radiusPoint.y - center.y, 2)
        );

        // Создаем звезду с 5 лучами
        const spikes = 5;
        const innerRadius = radius * 0.5;
        let points = '';

        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes;
            const r = i % 2 === 0 ? radius : innerRadius;
            const x = center.x + r * Math.sin(angle);
            const y = center.y - r * Math.cos(angle);
            points += `${x},${y} `;
        }

        const polygon = document.createElementNS(ns, 'polygon');
        polygon.setAttribute('points', points.trim());
        polygon.setAttribute('fill', '#f1c40f');
        polygon.setAttribute('stroke', '#f39c12');
        polygon.setAttribute('stroke-width', '2');
        polygon.setAttribute('class', 'vector-object');
        polygon.setAttribute('id', `star_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        // Добавляем элемент в активный слой
        const activeLayer = this.getActiveLayer();
        if (activeLayer && !activeLayer.locked) {
            if (activeLayer.group) {
                activeLayer.group.appendChild(polygon);
            } else {
                this.canvas.appendChild(polygon);
            }
            activeLayer.addElement(polygon);
        } else if (this.canvas) {
            this.canvas.appendChild(polygon);
        }

        // Сохраняем состояние после создания звезды
        this.saveState('Создана звезда');

        this.currentStarPoints = [];
        this.currentElement = null;
    }

    finishStar() {
        this.currentStarPoints = [];
    }

    handlePathClick(point) {
        if (this.currentPathPoints.length === 0) {
            // Сохраняем состояние перед началом пути
            this.saveState('Начало создания кривой');
        }

        this.currentPathPoints.push(point);

        if (this.currentPathPoints.length === 1) {
            // Первая точка - начинаем путь
            this.currentElement = this.createPathElement();
        } else {
            // Продолжаем путь
            this.updatePath();
        }
    }

    createPathElement() {
        const ns = 'http://www.w3.org/2000/svg';
        const path = document.createElementNS(ns, 'path');

        const firstPoint = this.currentPathPoints[0];
        path.setAttribute('d', `M ${firstPoint.x} ${firstPoint.y}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#e74c3c');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('class', 'vector-object');
        path.setAttribute('id', `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        // Добавляем элемент в активный слой
        const activeLayer = this.getActiveLayer();
        if (activeLayer && !activeLayer.locked) {
            if (activeLayer.group) {
                activeLayer.group.appendChild(path);
            } else {
                this.canvas.appendChild(path);
            }
            activeLayer.addElement(path);
        } else if (this.canvas) {
            this.canvas.appendChild(path);
        }

        return path;
    }

    updatePath() {
        if (!this.currentElement || this.currentPathPoints.length < 2) return;

        let d = `M ${this.currentPathPoints[0].x} ${this.currentPathPoints[0].y}`;

        for (let i = 1; i < this.currentPathPoints.length; i++) {
            const prev = this.currentPathPoints[i-1];
            const curr = this.currentPathPoints[i];

            // Создаем кривую Безье
            const cp1x = prev.x + (curr.x - prev.x) * 0.3;
            const cp1y = prev.y;
            const cp2x = curr.x - (curr.x - prev.x) * 0.3;
            const cp2y = curr.y;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        }

        this.currentElement.setAttribute('d', d);
    }

    finishPath() {
        if (this.currentPathPoints.length >= 2) {
            // Сохраняем состояние после завершения пути
            this.saveState('Создана кривая Безье');

            this.currentPathPoints = [];
            this.currentElement = null;
        }
    }

    // ========== ТЕКСТ ==========

    createTextElement(position) {
        // Сохраняем состояние перед созданием текста
        this.saveState('Начало создания текста');

        const ns = 'http://www.w3.org/2000/svg';
        const textElement = document.createElementNS(ns, 'text');

        textElement.setAttribute('x', position.x);
        textElement.setAttribute('y', position.y);
        textElement.setAttribute('fill', '#2c3e50');
        textElement.setAttribute('font-family', 'Arial');
        textElement.setAttribute('font-size', '24');
        textElement.setAttribute('class', 'vector-object');
        textElement.setAttribute('id', `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        textElement.textContent = 'Текст';

        // Добавляем элемент в активный слой
        const activeLayer = this.getActiveLayer();
        if (activeLayer && !activeLayer.locked) {
            if (activeLayer.group) {
                activeLayer.group.appendChild(textElement);
            } else {
                this.canvas.appendChild(textElement);
            }
            activeLayer.addElement(textElement);
        } else if (this.canvas) {
            this.canvas.appendChild(textElement);
        }

        // Сохраняем состояние после создания текста
        this.saveState('Создан текстовый объект');

        // Активируем редактирование
        setTimeout(() => this.activateTextEditing(textElement), 100);
    }

    activateTextEditing(textElement) {
        const text = textElement.textContent;
        const bbox = textElement.getBBox();

        // Создаем input для редактирования
        const input = document.createElement('input');
        input.type = 'text';
        input.value = text;
        input.style.position = 'absolute';
        input.style.left = `${bbox.x + (this.canvasWrapper?.offsetLeft || 0)}px`;
        input.style.top = `${bbox.y + (this.canvasWrapper?.offsetTop || 0)}px`;
        input.style.width = `${Math.max(bbox.width, 100)}px`;
        input.style.fontSize = `${parseInt(textElement.getAttribute('font-size'))}px`;
        input.style.fontFamily = textElement.getAttribute('font-family');
        input.style.zIndex = '1000';
        input.style.background = 'white';
        input.style.border = '2px solid #007bff';
        input.style.padding = '5px';
        input.style.color = 'black';

        document.body.appendChild(input);
        input.focus();
        input.select();

        const finishEditing = () => {
            textElement.textContent = input.value || 'Текст';
            input.remove();
            this.saveState('Редактирование текста');
        };

        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishEditing();
            } else if (e.key === 'Escape') {
                input.remove();
            }
        });
    }

    // ========== РАБОТА С ВЫБРАННЫМИ ЭЛЕМЕНТАМИ ==========

    dragSelected(deltaX, deltaY) {
        // Сохраняем состояние перед перемещением (только если еще не сохранили для этого перемещения)
        if (!this.isDraggingSaved) {
            this.saveState('Начало перемещения объектов');
            this.isDraggingSaved = true;
        }

        this.selectedElements.forEach(element => {
            this.moveElement(element, deltaX, deltaY);
        });

        this.updatePropertiesPanel();
    }

    moveElement(element, deltaX, deltaY) {
        if (deltaX === 0 && deltaY === 0) return;

        const transform = element.getAttribute('transform') || '';
        let newTransform = transform;

        // Ищем существующий translate
        const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);

        if (translateMatch) {
            // Получаем текущие translate значения
            const currentX = parseFloat(translateMatch[1]) || 0;
            const currentY = parseFloat(translateMatch[2]) || 0;

            // Складываем с дельтой
            const newX = currentX + deltaX;
            const newY = currentY + deltaY;

            newTransform = transform.replace(
                /translate\([^)]+\)/,
                `translate(${newX},${newY})`
            );
        } else {
            // Создаем новый translate
            newTransform = `translate(${deltaX},${deltaY}) ${transform}`.trim();
        }

        element.setAttribute('transform', newTransform);
        console.log(`Moved: dx=${deltaX}, dy=${deltaY}, new transform: ${newTransform}`);
    }

    clearSelection() {
        this.selectedElements.forEach(el => el.classList.remove('selected'));
        this.selectedElements.clear();
        this.transformManager.removeTransformOverlay();
        this.updatePropertiesPanel();
        this.updateStatusBar();
    }

    deleteSelected() {
        if (this.selectedElements.size === 0) return;

        // Сохраняем состояние перед удалением
        this.saveState(`Удаление ${this.selectedElements.size} объектов`);

        this.selectedElements.forEach(element => {
            // Удаляем элемент из слоя
            const layerId = element.getAttribute('data-layer-id');
            if (layerId) {
                const layer = this.layers.find(l => l.id == layerId);
                if (layer) {
                    layer.removeElement(element);
                }
            }
            element.remove();
        });
        this.clearSelection();
    }

    // ========== ПАНЕЛЬ СВОЙСТВ И ТРАНСФОРМАЦИИ ==========

setupTransformListeners() {
        // Позиция
        const setupTransformField = (id, type) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.applyTransform(type, parseFloat(e.target.value));
                });
            }
        };

        // Настраиваем все поля
        setupTransformField('transformX', 'translateX');
        setupTransformField('transformY', 'translateY');
        setupTransformField('transformWidth', 'width');
        setupTransformField('transformHeight', 'height');
        setupTransformField('transformScaleX', 'scaleX');
        setupTransformField('transformScaleY', 'scaleY');
        setupTransformField('transformSkewX', 'skewX');
        setupTransformField('transformSkewY', 'skewY');

        // Поворот
        const rotationSlider = document.getElementById('transformRotation');
        if (rotationSlider) {
            rotationSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                const rotationValue = document.getElementById('rotationValue');
                if (rotationValue) {
                    rotationValue.textContent = `${value}°`;
                }
                this.applyTransform('rotate', value);
            });
        }

        // Кнопки отражения
        document.querySelectorAll('[data-transform]').forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    const transform = e.target.closest('[data-transform]').dataset.transform;
                    this.applyTransform(transform);
                });
            }
        });

        // Сброс трансформаций
        const resetTransform = document.getElementById('resetTransform');
        if (resetTransform) {
            resetTransform.addEventListener('click', () => {
                this.resetTransform();
            });
        }

        // Блокировка пропорций (простая реализация)
        const lockAspect = document.getElementById('lockAspect');
        if (lockAspect) {
            lockAspect.addEventListener('change', (e) => {
                // Запомним состояние для будущего использования
                this.lockAspectRatio = e.target.checked;
            });
        }
    }



    updatePropertiesPanel() {
        if (this.selectedElements.size === 1) {
            const element = Array.from(this.selectedElements)[0];
            this.populateProperties(element);

            // Показываем панель свойств
            const propertiesPanel = document.querySelector('.vector-properties');
            if (propertiesPanel) {
                propertiesPanel.style.display = 'block';
            }

            // Обновляем поля трансформаций
            this.transformManager.updateTransformFields(element);

        } else if (this.selectedElements.size > 1) {
            this.showMultipleSelectionProperties();

            const propertiesPanel = document.querySelector('.vector-properties');
            if (propertiesPanel) {
                propertiesPanel.style.display = 'block';
            }

            this.transformManager.removeTransformOverlay();
        } else {
            this.clearProperties();

            const propertiesPanel = document.querySelector('.vector-properties');
            if (propertiesPanel) {
                propertiesPanel.style.display = 'none';
            }

            this.transformManager.removeTransformOverlay();
        }
    }

    // УПРОЩЕННАЯ ФУНКЦИЯ ПРИМЕНЕНИЯ ТРАНСФОРМАЦИЙ
    applyTransform(type, value = null) {
        if (this.selectedElements.size === 0) return;

        // Сохраняем состояние
        this.saveState(`Трансформация: ${type}`);

        this.selectedElements.forEach(element => {
            this.applyTransformToElement(element, type, value);
        });

        // Обновляем UI
        if (this.selectedElements.size === 1) {
            const element = Array.from(this.selectedElements)[0];
            this.transformManager.updateTransformFields(element);
        }
    }

    // Новый метод для масштабирования относительно локального центра
    scaleElementRelativeToLocalCenter(element, type, value) {
        // 1. Получаем локальный центр
        const localBBox = this.getLocalBBox(element);
        const localCenterX = localBBox.x + localBBox.width / 2;
        const localCenterY = localBBox.y + localBBox.height / 2;

        // 2. Получаем текущие трансформации
        let transform = element.getAttribute('transform') || '';

        // 3. Удаляем старые scale трансформации
        transform = transform.replace(/scale\([^)]+\)/g, '');

        // 4. Добавляем новый scale
        if (type === 'scaleX') {
            transform = `scale(${value},1) ${transform}`.trim();
        } else if (type === 'scaleY') {
            transform = `scale(1,${value}) ${transform}`.trim();
        }

        // 5. Применяем трансформацию
        element.setAttribute('transform', transform);
    }

    applyTransformToElement(element, type, value) {
        const tag = element.tagName.toLowerCase();
        const zoom = this.zoom || 1;

        switch(type) {
            case 'translateX':
                const bboxX = this.transformManager.getElementBBox(element);
                const deltaX = (value - bboxX.x) * zoom;
                this.moveElement(element, deltaX, 0);
                break;

            case 'translateY':
                const bboxY = this.transformManager.getElementBBox(element);
                const deltaY = (value - bboxY.y) * zoom;
                this.moveElement(element, 0, deltaY);
                break;

            case 'width':
                const newWidth = value * zoom;
                if (tag === 'rect') {
                    element.setAttribute('width', newWidth);
                } else if (tag === 'image') {
                    element.setAttribute('width', newWidth);
                } else if (tag === 'circle') {
                    element.setAttribute('r', newWidth / 2);
                } else if (tag === 'ellipse') {
                    element.setAttribute('rx', newWidth / 2);
                }
                break;

            case 'height':
                const newHeight = value * zoom;
                if (tag === 'rect') {
                    element.setAttribute('height', newHeight);
                } else if (tag === 'image') {
                    element.setAttribute('height', newHeight);
                } else if (tag === 'circle') {
                    element.setAttribute('r', newHeight / 2);
                } else if (tag === 'ellipse') {
                    element.setAttribute('ry', newHeight / 2);
                }
                break;

            case 'rotate':
                // Используем исправленный метод поворота
                this.rotateElement(element, value);
                break;

            case 'scaleX':
            case 'scaleY':
                // Для scale нужно применять относительно локального центра
                this.scaleElementRelativeToLocalCenter(element, type, value);
                break;

            case 'skewX':
            case 'skewY':
                this.skewElement(element, type, value);
                break;

            case 'flipH':
            case 'flipV':
                this.flipElement(element, type === 'flipH' ? 'horizontal' : 'vertical');
                break;
        }
    }


    resetTransform() {
        if (this.selectedElements.size !== 1) return;

        const element = Array.from(this.selectedElements)[0];
        element.removeAttribute('transform');

        this.transformManager.updateTransformOverlay();
        this.updateTransformPanel();
        this.saveState('Сброс трансформаций');
    }

    updatePropertiesPanelVisibility() {
        // Скрываем все секции
        const sections = document.querySelectorAll('.property-section');
        sections.forEach(section => {
            if (section) {
                section.style.display = 'none';
            }
        });

        // Показываем секцию в зависимости от инструмента
        switch(this.currentTool) {
            case 'text':
                const textProps = document.getElementById('textProperties');
                if (textProps) textProps.style.display = 'block';
                break;
            case 'raster':
                const rasterProps = document.getElementById('rasterProperties');
                if (rasterProps) rasterProps.style.display = 'block';
                break;
            case 'trace':
                const traceProps = document.getElementById('traceProperties');
                if (traceProps) {
                    traceProps.style.display = 'block';

                    }
                break;
            default:
                const shapeProps = document.getElementById('shapeProperties');
                if (shapeProps) shapeProps.style.display = 'block';
                break;
        }

        // Всегда показываем свойства стиля
        const styleProps = document.getElementById('styleProperties');
        if (styleProps) {
            styleProps.style.display = 'block';
        }
    }

    // ПРОСТЫЕ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    moveElement(element, deltaX, deltaY) {
        const transform = element.getAttribute('transform') || '';
        let newTransform = transform;

        // Ищем существующий translate
        const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);

        if (translateMatch) {
            const currentX = parseFloat(translateMatch[1]) + deltaX;
            const currentY = parseFloat(translateMatch[2]) + deltaY;
            newTransform = transform.replace(
                /translate\([^)]+\)/,
                `translate(${currentX},${currentY})`
            );
        } else if (deltaX !== 0 || deltaY !== 0) {
            newTransform = `translate(${deltaX},${deltaY}) ${transform}`.trim();
        }

        element.setAttribute('transform', newTransform);
    }

    // Метод для получения локального BBox (без учета трансформаций)
    getLocalBBox(element) {
        const tag = element.tagName.toLowerCase();

        switch(tag) {
            case 'rect':
                return {
                    x: parseFloat(element.getAttribute('x')) || 0,
                    y: parseFloat(element.getAttribute('y')) || 0,
                    width: parseFloat(element.getAttribute('width')) || 0,
                    height: parseFloat(element.getAttribute('height')) || 0
                };

            case 'circle':
                const cx = parseFloat(element.getAttribute('cx')) || 0;
                const cy = parseFloat(element.getAttribute('cy')) || 0;
                const r = parseFloat(element.getAttribute('r')) || 0;
                return {
                    x: cx - r,
                    y: cy - r,
                    width: r * 2,
                    height: r * 2
                };

            case 'ellipse':
                const ecx = parseFloat(element.getAttribute('cx')) || 0;
                const ecy = parseFloat(element.getAttribute('cy')) || 0;
                const rx = parseFloat(element.getAttribute('rx')) || 0;
                const ry = parseFloat(element.getAttribute('ry')) || 0;
                return {
                    x: ecx - rx,
                    y: ecy - ry,
                    width: rx * 2,
                    height: ry * 2
                };

            case 'text':
                // Для текста получаем BBox через getBBox()
                try {
                    const bbox = element.getBBox();
                    return {
                        x: parseFloat(element.getAttribute('x')) || bbox.x,
                        y: parseFloat(element.getAttribute('y')) || bbox.y,
                        width: bbox.width,
                        height: bbox.height
                    };
                } catch {
                    return {
                        x: parseFloat(element.getAttribute('x')) || 0,
                        y: parseFloat(element.getAttribute('y')) || 0,
                        width: element.textContent.length * 10, // примерная ширина
                        height: parseFloat(element.getAttribute('font-size')) || 24
                    };
                }

            case 'polygon':
            case 'polyline':
                try {
                    return element.getBBox();
                } catch {
                    return { x: 0, y: 0, width: 100, height: 100 };
                }

            case 'path':
                try {
                    return element.getBBox();
                } catch {
                    return { x: 0, y: 0, width: 100, height: 100 };
                }

            case 'image':
                return {
                    x: parseFloat(element.getAttribute('x')) || 0,
                    y: parseFloat(element.getAttribute('y')) || 0,
                    width: parseFloat(element.getAttribute('width')) || 0,
                    height: parseFloat(element.getAttribute('height')) || 0
                };

            default:
                return { x: 0, y: 0, width: 100, height: 100 };
        }
    }

    rotateElement(element, angle) {
        // 1. Получаем ЛОКАЛЬНЫЙ bounding box элемента (без трансформаций)
        const localBBox = this.getLocalBBox(element);

        // 2. Вычисляем центр в локальных координатах
        const localCenterX = localBBox.x + localBBox.width / 2;
        const localCenterY = localBBox.y + localBBox.height / 2;

        // 3. Получаем текущие трансформации
        let transform = element.getAttribute('transform') || '';

        // 4. Удаляем старые повороты
        transform = transform.replace(/rotate\([^)]+\)/g, '');

        // 5. Добавляем новый поворот вокруг локального центра
        if (angle !== 0) {
            transform = `rotate(${angle},${localCenterX},${localCenterY}) ${transform}`.trim();
        }

        element.setAttribute('transform', transform);
    }

    scaleElement(element, type, value) {
        let transform = element.getAttribute('transform') || '';

        // Ищем существующий scale
        const scaleMatch = transform.match(/scale\(([^,]+),([^)]+)\)/);

        if (scaleMatch) {
            const currentScaleX = type === 'scaleX' ? value : parseFloat(scaleMatch[1]);
            const currentScaleY = type === 'scaleY' ? value : parseFloat(scaleMatch[2]);

            transform = transform.replace(
                /scale\([^)]+\)/,
                `scale(${currentScaleX},${currentScaleY})`
            );
        } else {
            const scaleX = type === 'scaleX' ? value : 1;
            const scaleY = type === 'scaleY' ? value : 1;

            if (scaleX !== 1 || scaleY !== 1) {
                transform = `scale(${scaleX},${scaleY}) ${transform}`.trim();
            }
        }

        element.setAttribute('transform', transform);
    }

    skewElement(element, type, value) {
        let transform = element.getAttribute('transform') || '';

        if (type === 'skewX') {
            transform = transform.replace(/skewX\([^)]+\)/g, '');
            if (value !== 0) {
                transform = `skewX(${value}) ${transform}`.trim();
            }
        } else {
            transform = transform.replace(/skewY\([^)]+\)/g, '');
            if (value !== 0) {
                transform = `skewY(${value}) ${transform}`.trim();
            }
        }

        element.setAttribute('transform', transform);
    }

flipElement(element, direction) {
    console.log(`=== MATRIX FLIP ${direction} ===`);

    // 1. Получаем текущую матрицу трансформации
    const svg = this.canvas;
    const ctm = element.getCTM();

    // 2. Получаем BBox элемента в локальных координатах
    const bbox = element.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    console.log('Element center:', centerX, centerY);
    console.log('Current matrix:', ctm ? `${ctm.a},${ctm.b},${ctm.c},${ctm.d},${ctm.e},${ctm.f}` : 'none');

    // 3. Создаем матрицу отражения вокруг центра
    const matrix = svg.createSVGMatrix();

    let flipMatrix;
    if (direction === 'horizontal') {
        // Матрица горизонтального отражения вокруг центра:
        // translate(centerX, centerY) * scale(-1, 1) * translate(-centerX, -centerY)
        flipMatrix = matrix
            .translate(centerX, centerY)
            .scale(-1, 1)
            .translate(-centerX, -centerY);
    } else {
        // Матрица вертикального отражения вокруг центра:
        // translate(centerX, centerY) * scale(1, -1) * translate(-centerX, -centerY)
        flipMatrix = matrix
            .translate(centerX, centerY)
            .scale(1, -1)
            .translate(-centerX, -centerY);
    }

    // 4. Объединяем с текущей матрицей
    let finalMatrix;
    if (ctm) {
        finalMatrix = ctm.multiply(flipMatrix);
    } else {
        finalMatrix = flipMatrix;
    }

    // 5. Преобразуем матрицу в строку transform
    const transformString = `matrix(${finalMatrix.a},${finalMatrix.b},${finalMatrix.c},${finalMatrix.d},${finalMatrix.e},${finalMatrix.f})`;

    console.log('New transform:', transformString);

    // 6. Применяем
    element.setAttribute('transform', transformString);

    // 7. Сохраняем и обновляем
    this.saveState(`Отражение по ${direction}`);
    this.updatePropertiesPanel();
}


    resetTransform() {
        if (this.selectedElements.size === 0) return;

        this.saveState('Сброс трансформаций');

        this.selectedElements.forEach(element => {
            element.removeAttribute('transform');
        });

        // Обновляем UI
        if (this.selectedElements.size === 1) {
            const element = Array.from(this.selectedElements)[0];
            this.transformManager.updateTransformFields(element);
        }
    }

 // ========== ИЗМЕНЕННЫЙ populateProperties ==========
    populateProperties(element) {
        this.clearProperties();
        const tag = element.tagName.toLowerCase();

        // Общие свойства
        const fillColorInput = document.getElementById('fillColor');
        const strokeColorInput = document.getElementById('strokeColor');
        const strokeWidthInput = document.getElementById('strokeWidth');
        const strokeDasharrayInput = document.getElementById('strokeDasharray');

        if (fillColorInput && element.getAttribute('fill')) {
            fillColorInput.value = element.getAttribute('fill');
        }
        if (strokeColorInput && element.getAttribute('stroke')) {
            strokeColorInput.value = element.getAttribute('stroke');
        }
        if (strokeWidthInput && element.getAttribute('stroke-width')) {
            strokeWidthInput.value = element.getAttribute('stroke-width');
        }
        if (strokeDasharrayInput && element.getAttribute('stroke-dasharray')) {
            strokeDasharrayInput.value = element.getAttribute('stroke-dasharray');
        }

        // Показываем соответствующие секции
        this.updatePropertiesPanelVisibility();

        // Обновляем поля трансформаций
        this.transformManager.updateTransformFields(element);
    }

    showMultipleSelectionProperties() {
        this.clearProperties();
        document.getElementById('shapeProperties').style.display = 'block';
        document.getElementById('textProperties').style.display = 'none';
        document.getElementById('rasterProperties').style.display = 'none';

        // Показываем только общие свойства
        document.querySelectorAll('#shapeProperties .form-group').forEach(group => {
            group.style.display = 'none';
        });

        // Показываем только свойства стиля
        document.querySelectorAll('#styleProperties .form-group').forEach(group => {
            group.style.display = 'block';
        });
    }

    clearProperties() {
        // Очищаем поля свойств
        ['posX', 'posY', 'width', 'height', 'fillColor', 'strokeColor', 'strokeWidth',
         'textContent', 'imageHref', 'fillOpacity'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });

        // Скрываем все секции свойств
        document.querySelectorAll('.property-section').forEach(section => {
            section.style.display = 'none';
        });
    }

    updatePosition(axis, value) {
        this.selectedElements.forEach(element => {
            const bbox = this.transformManager.getTransformedBBox(element);
            const currentX = bbox.x;
            const currentY = bbox.y;

            const deltaX = axis === 'x' ? value - currentX : 0;
            const deltaY = axis === 'y' ? value - currentY : 0;

            if (deltaX !== 0 || deltaY !== 0) {
                this.moveElement(element, deltaX, deltaY);
            }
        });

        this.saveState(`Изменение позиции ${axis}`);
    }

    updateSelectedAttribute(attribute, value) {
        const selectedCount = this.selectedElements.size;
        if (selectedCount > 0 && !this.isAttributeChangeSaved) {
            this.saveState(`Изменение свойства ${attribute}`);
            this.isAttributeChangeSaved = true;
            setTimeout(() => { this.isAttributeChangeSaved = false; }, 100);
        }

        this.selectedElements.forEach(element => {
            if (attribute === 'textContent') {
                element.textContent = value;
            } else {
                element.setAttribute(attribute, value);
            }
        });
    }

    // ========== РАБОТА С РАСТРОМ ==========

    async insertRasterImage(file) {
        try {
            // Сохраняем состояние перед вставкой
            this.saveState('Вставка растрового изображения');

            const reader = new FileReader();

            reader.onload = (e) => {
                const imageUrl = e.target.result;

                // Создаем элемент image в SVG
                const ns = 'http://www.w3.org/2000/svg';
                const imageElement = document.createElementNS(ns, 'image');

                imageElement.setAttribute('href', imageUrl);
                imageElement.setAttribute('x', '100');
                imageElement.setAttribute('y', '100');
                imageElement.setAttribute('width', '200');
                imageElement.setAttribute('height', '150');
                imageElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                imageElement.setAttribute('class', 'vector-object raster-image');
                imageElement.setAttribute('id', `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

                // Добавляем в активный слой
                const activeLayer = this.getActiveLayer();
                if (activeLayer && !activeLayer.locked) {
                    if (activeLayer.group) {
                        activeLayer.group.appendChild(imageElement);
                    } else {
                        this.canvas.appendChild(imageElement);
                    }
                    activeLayer.addElement(imageElement);
                }

                // Выделяем вставленное изображение
                this.clearSelection();
                this.selectedElements.add(imageElement);
                imageElement.classList.add('selected');

                this.updatePropertiesPanel();
                this.updateStatusBar();

                // Сохраняем состояние после вставки
                this.saveState(`Вставлено изображение: ${file.name}`);

                // Переключаемся на инструмент выбора
                this.setTool('select');
            };

            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Ошибка при вставке изображения:', error);
            alert('Ошибка при вставке изображения');
        }
    }

    startTrace() {
        if (this.selectedElements.size !== 1) {
            alert('Выберите одно растровое изображение для трассировки');
            return;
        }

        const selectedElement = Array.from(this.selectedElements)[0];
        if (selectedElement.tagName.toLowerCase() !== 'image') {
            alert('Выберите растровое изображение для трассировки');
            return;
        }

        // Показываем модальное окно трассировки
        this.showTraceModal(selectedElement);
    }

    showTraceModal(imageElement) {
        // В реальной реализации здесь будет сложная логика трассировки
        // Сейчас просто показываем уведомление
        alert('Трассировка изображения в вектор - сложная функция. Для реализации требуется подключение библиотеки Potrace.js или аналогичной. Эта функция доступна в полной версии редактора.');
    }

    // ========== АНИМАЦИЯ ==========

    addAnimationToSelected() {
        const type = document.getElementById('animationType').value;
        const duration = document.getElementById('animationDuration').value;

        if (!type) {
            alert('Выберите тип анимации');
            return;
        }

        if (this.selectedElements.size === 0) {
            alert('Выберите элемент для анимации');
            return;
        }

        // Сохраняем состояние перед добавлением анимации
        this.saveState(`Добавление анимации ${type}`);

        this.selectedElements.forEach(element => {
            this.createAnimation(element, type, parseFloat(duration));
        });
    }

    createAnimation(element, type, duration) {
        const ns = 'http://www.w3.org/2000/svg';

        // Удаляем старую анимацию
        const oldAnim = element.querySelector('animate, animateTransform');
        if (oldAnim) {
            oldAnim.remove();
        }

        let animation;

        switch(type) {
            case 'translate':
                animation = document.createElementNS(ns, 'animateTransform');
                animation.setAttribute('attributeName', 'transform');
                animation.setAttribute('type', 'translate');
                animation.setAttribute('from', '0,0');
                animation.setAttribute('to', '50,50');
                animation.setAttribute('dur', `${duration}s`);
                animation.setAttribute('repeatCount', 'indefinite');
                animation.setAttribute('additive', 'sum');
                break;

            case 'rotate':
                animation = document.createElementNS(ns, 'animateTransform');
                animation.setAttribute('attributeName', 'transform');
                animation.setAttribute('type', 'rotate');
                animation.setAttribute('from', '0');
                animation.setAttribute('to', '360');
                animation.setAttribute('dur', `${duration}s`);
                animation.setAttribute('repeatCount', 'indefinite');
                animation.setAttribute('additive', 'sum');
                break;

            case 'scale':
                animation = document.createElementNS(ns, 'animateTransform');
                animation.setAttribute('attributeName', 'transform');
                animation.setAttribute('type', 'scale');
                animation.setAttribute('from', '1');
                animation.setAttribute('to', '1.5');
                animation.setAttribute('dur', `${duration}s`);
                animation.setAttribute('repeatCount', 'indefinite');
                animation.setAttribute('additive', 'sum');
                break;
        }

        if (animation) {
            element.appendChild(animation);
            alert(`Анимация "${type}" добавлена на ${duration} секунд`);
        }
    }

    // ========== ОПЕРАЦИИ С ОБЪЕКТАМИ ==========

    groupSelected() {
        if (this.selectedElements.size < 2) {
            alert('Выберите хотя бы 2 элемента для группировки');
            return;
        }

        // Сохраняем состояние перед группировкой
        this.saveState(`Группировка ${this.selectedElements.size} объектов`);

        const ns = 'http://www.w3.org/2000/svg';
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('id', `group_${Date.now()}`);
        group.setAttribute('class', 'vector-object vector-group');

        // Добавляем выбранные элементы в группу
        this.selectedElements.forEach(element => {
            const clone = element.cloneNode(true);
            group.appendChild(clone);
            element.remove();
        });

        // Добавляем группу на холст
        if (this.canvas) {
            this.canvas.appendChild(group);
        }

        // Выделяем группу
        this.clearSelection();
        this.selectedElements.add(group);
        group.classList.add('selected');

        this.updatePropertiesPanel();
    }

    ungroupSelected() {
        const groups = Array.from(this.selectedElements).filter(el =>
            el.tagName.toLowerCase() === 'g' && el.classList.contains('vector-group'));

        if (groups.length === 0) {
            alert('Выберите группу для разгруппировки');
            return;
        }

        // Сохраняем состояние перед разгруппировкой
        this.saveState(`Разгруппировка ${groups.length} групп`);

        groups.forEach(group => {
            const children = Array.from(group.children);

            children.forEach(child => {
                if (this.canvas) {
                    this.canvas.appendChild(child);
                }
                child.classList.add('vector-object');
            });

            group.remove();
        });

        this.clearSelection();
    }

    alignSelected(alignment) {
        if (this.selectedElements.size < 2) {
            alert('Выберите хотя бы 2 элемента для выравнивания');
            return;
        }

        let referenceX = null;
        const elements = Array.from(this.selectedElements);

        // Находим опорную координату
        elements.forEach(element => {
            const bbox = this.transformManager.getTransformedBBox(element);
            let x = 0;

            switch(alignment) {
                case 'left':
                    x = bbox.x;
                    break;
                case 'center':
                    x = bbox.x + bbox.width / 2;
                    break;
                case 'right':
                    x = bbox.x + bbox.width;
                    break;
            }

            if (referenceX === null || x < referenceX) {
                referenceX = x;
            }
        });

        // Выравниваем элементы
        elements.forEach(element => {
            const bbox = this.transformManager.getTransformedBBox(element);
            const tag = element.tagName.toLowerCase();
            let deltaX = 0;

            switch(alignment) {
                case 'left':
                    deltaX = referenceX - bbox.x;
                    break;
                case 'center':
                    deltaX = referenceX - (bbox.x + bbox.width / 2);
                    break;
                case 'right':
                    deltaX = referenceX - (bbox.x + bbox.width);
                    break;
            }

            if (deltaX !== 0) {
                this.moveElement(element, deltaX, 0);
            }
        });

        this.updatePropertiesPanel();
        this.saveState(`Выравнивание по ${alignment}`);
    }

    // ========== СЛОИ ==========

    setupInitialLayers() {
        const layersList = document.getElementById('layersList');
        if (!layersList) return;

        // Очищаем список
        layersList.innerHTML = '';

        // Создаем слои на холсте
        this.createLayer('Фон', true);
        this.createLayer('Слой 1', true);

        // Устанавливаем активный слой
        this.setActiveLayer(1);
    }

    createLayer(name = null, addToUI = true) {
        const layerId = this.layerCounter++;
        const layer = new Layer(layerId, name);

        // Создаем SVG группу для слоя
        layer.group = layer.createGroupElement();
        if (this.canvas) {
            this.canvas.appendChild(layer.group);
        }

        this.layers.push(layer);

        // Добавляем в UI
        if (addToUI) {
            this.addLayerToUI(layer);
        }

        return layer;
    }

    addLayerToUI(layer) {
        const layersList = document.getElementById('layersList');
        if (!layersList) return;

        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        layerItem.dataset.layerId = layer.id;
        layerItem.innerHTML = `
            <i class="fas fa-eye${layer.visible ? '' : '-slash'}"></i>
            <span>${layer.name}</span>
            <i class="fas ${layer.locked ? 'fa-lock' : 'fa-unlock'}"></i>
        `;

        // Обработчик клика на слой
        layerItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('fa-eye') &&
                !e.target.classList.contains('fa-eye-slash') &&
                !e.target.classList.contains('fa-lock') &&
                !e.target.classList.contains('fa-unlock')) {
                this.setActiveLayer(layer.id);
            }
        });

        // Обработчик видимости
        const eyeIcon = layerItem.querySelector('.fa-eye, .fa-eye-slash');
        eyeIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerVisibility(layer.id);
        });

        // Обработчик блокировки
        const lockIcon = layerItem.querySelector('.fa-lock, .fa-unlock');
        lockIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerLock(layer.id);
        });

        layersList.appendChild(layerItem);

        // Обновляем UI если это активный слой
        if (layer.isActive) {
            layerItem.classList.add('active');
        }
    }

    setActiveLayer(layerId) {
        // Деактивируем все слои
        this.layers.forEach(layer => {
            layer.isActive = false;
        });

        // Находим и активируем нужный слой
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.isActive = true;
            this.currentLayerIndex = this.layers.indexOf(layer);

            // Обновляем UI
            this.updateLayersUI();

            // Снимаем выделение со всех элементов
            this.clearSelection();

            // Выделяем все элементы активного слоя
            layer.elements.forEach(element => {
                if (element && element.classList) {
                    element.classList.add('selected');
                    this.selectedElements.add(element);
                }
            });

            this.updatePropertiesPanel();
            this.updateStatusBar();
        }
    }

    getActiveLayer() {
        // Возвращаем активный слой или первый слой по умолчанию
        const activeLayer = this.layers.find(layer => layer.isActive);
        return activeLayer || this.layers[0];
    }

    toggleLayerVisibility(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.setVisibility(!layer.visible);
            this.updateLayersUI();
        }
    }

    toggleLayerLock(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.setLocked(!layer.locked);
            this.updateLayersUI();
        }
    }

    updateLayersUI() {
        const layersList = document.getElementById('layersList');
        if (!layersList) return;

        Array.from(layersList.children).forEach(layerItem => {
            const layerId = parseInt(layerItem.dataset.layerId);
            const layer = this.layers.find(l => l.id === layerId);

            if (layer) {
                // ОБНОВЛЯЕМ ИМЯ СЛОЯ
                const nameSpan = layerItem.querySelector('span');
                if (nameSpan) {
                    nameSpan.textContent = layer.name;
                }

                // Обновляем видимость
                const eyeIcon = layerItem.querySelector('.fa-eye, .fa-eye-slash');
                if (eyeIcon) {
                    eyeIcon.className = layer.visible ? 'fas fa-eye' : 'fas fa-eye-slash';
                }

                // Обновляем блокировку
                const lockIcon = layerItem.querySelector('.fa-lock, .fa-unlock');
                if (lockIcon) {
                    lockIcon.className = layer.locked ? 'fas fa-lock' : 'fas fa-unlock';
                }

                // Обновляем активность
                if (layer.isActive) {
                    layerItem.classList.add('active');
                } else {
                    layerItem.classList.remove('active');
                }

                // Обновляем прозрачность для заблокированных слоев
                layerItem.style.opacity = layer.locked ? '0.6' : '1';
            }
        });
    }

    deleteLayer(layerId) {
        // Нельзя удалить последний слой
        if (this.layers.length <= 1) {
            alert('Нельзя удалить последний слой');
            return;
        }

        const layerIndex = this.layers.findIndex(l => l.id === layerId);
        if (layerIndex === -1) return;

        const layer = this.layers[layerIndex];

        // Если удаляем активный слой, активируем другой
        if (layer.isActive) {
            const newActiveIndex = layerIndex === 0 ? 1 : layerIndex - 1;
            this.setActiveLayer(this.layers[newActiveIndex].id);
        }

        // Удаляем элементы слоя с холста
        layer.elements.forEach(element => {
            if (element && element.parentNode) {
                element.remove();
            }
        });

        // Удаляем группу слоя
        if (layer.group && layer.group.parentNode === this.canvas) {
            layer.group.remove();
        }

        // Удаляем из массива
        this.layers.splice(layerIndex, 1);

        // Удаляем из UI
        this.removeLayerFromUI(layerId);

        // Очищаем выделение
        this.clearSelection();

        console.log(`Слой "${layer.name}" удален`);
    }

    removeLayerFromUI(layerId) {
        const layersList = document.getElementById('layersList');
        if (!layersList) return;

        const layerItem = layersList.querySelector(`[data-layer-id="${layerId}"]`);
        if (layerItem) {
            layerItem.remove();
        }
    }

    moveElementToFront() {
        if (this.selectedElements.size === 0) return;

        this.saveState('Перемещение на передний план');

        this.selectedElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.appendChild(element);
            }
        });
    }

    moveElementToBack() {
        if (this.selectedElements.size === 0) return;

        this.saveState('Перемещение на задний план');

        this.selectedElements.forEach(element => {
            if (element.parentNode && element.parentNode.firstChild) {
                element.parentNode.insertBefore(element, element.parentNode.firstChild);
            }
        });
    }

    moveElementForward() {
        if (this.selectedElements.size === 0) return;

        this.saveState('Перемещение вперед');

        this.selectedElements.forEach(element => {
            if (element.nextSibling) {
                element.parentNode.insertBefore(element.nextSibling, element);
            }
        });
    }

    moveElementBackward() {
        if (this.selectedElements.size === 0) return;

        this.saveState('Перемещение назад');

        this.selectedElements.forEach(element => {
            if (element.previousSibling) {
                element.parentNode.insertBefore(element, element.previousSibling);
            }
        });
    }

    // ========== МЕТОДЫ ДЛЯ ТРАССИРОВКИ ==========

    showTraceModal(imageElement) {
        this.currentRasterImage = imageElement;

        const modal = document.getElementById('traceModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            // Инициализируем трассировку
            this.initTraceCanvas(imageElement);
        }
    }

    closeTraceModal() {
        const modal = document.getElementById('traceModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
                this.currentRasterImage = null;
            }, 300);
        }
    }

    async initTraceCanvas(imageElement) {
        const imageUrl = imageElement.getAttribute('href') ||
                         imageElement.getAttribute('xlink:href');

        if (!imageUrl) {
            alert('Не удалось получить изображение для трассировки');
            return;
        }

        // Создаем изображение для загрузки
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.getElementById('traceOriginalCanvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            // Рассчитываем размеры для сохранения пропорций
            const maxWidth = 400;
            const maxHeight = 300;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            if (height > maxHeight) {
                width = (maxHeight / height) * width;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            // Рисуем изображение на canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Сохраняем оригинальные данные для обновления превью
            this.originalImageData = ctx.getImageData(0, 0, width, height);

            // Обновляем предпросмотр
            this.updateTracePreview();

            // Обновляем слайдер порога
            document.getElementById('traceThreshold').addEventListener('input', (e) => {
                document.getElementById('traceThresholdValue').textContent = e.target.value;
                this.updateTracePreview();
            });

            // Обновляем при изменении цвета
            document.getElementById('traceColor').addEventListener('input', () => {
                this.updateTracePreview();
            });

            // Обновляем при инверсии
            document.getElementById('traceInvert').addEventListener('change', () => {
                this.updateTracePreview();
            });

        };

        img.onerror = () => {
            alert('Ошибка загрузки изображения для трассировки');
        };

        img.src = imageUrl;
    }

    updateTracePreview() {
        if (!this.originalImageData) return;

        const canvas = document.getElementById('traceOriginalCanvas');
        const ctx = canvas.getContext('2d');

        // Восстанавливаем оригинальное изображение
        ctx.putImageData(this.originalImageData, 0, 0);

        const threshold = parseInt(document.getElementById('traceThreshold').value);
        const traceColor = document.getElementById('traceColor').value;
        const invert = document.getElementById('traceInvert').checked;

        // Получаем данные изображения
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Применяем пороговую фильтрацию
        for (let i = 0; i < data.length; i += 4) {
            // Конвертируем в градации серого
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

            // Применяем инверсию если нужно
            const adjustedGray = invert ? 255 - gray : gray;

            // Применяем порог
            const isBlack = adjustedGray < threshold;

            // Устанавливаем цвет в зависимости от порога
            if (isBlack) {
                // Цвет для черных областей
                const rgb = this.hexToRgb(traceColor);
                data[i] = rgb.r;
                data[i + 1] = rgb.g;
                data[i + 2] = rgb.b;
            } else {
                // Белый для светлых областей
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
            }
            data[i + 3] = 255; // Полная непрозрачность
        }

        ctx.putImageData(imageData, 0, 0);

        // Обновляем SVG превью
        this.updateTraceSVGPreview(canvas, threshold, traceColor, invert);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    async updateTraceSVGPreview(canvas, threshold, color, invert) {
        const previewDiv = document.getElementById('tracePreview');
        if (!previewDiv) return;

        // Проверяем библиотеку
        if (typeof ImageTracer === 'undefined') {
            previewDiv.innerHTML = '<text x="50%" y="50%" text-anchor="middle">Загрузка ImageTracer...</text>';
            return;
        }

        try {
            // 1. КОПИРУЕМ ИЗОБРАЖЕНИЕ НА НОВЫЙ CANVAS
            const processCanvas = document.createElement('canvas');
            processCanvas.width = canvas.width;
            processCanvas.height = canvas.height;
            const processCtx = processCanvas.getContext('2d');
            processCtx.drawImage(canvas, 0, 0);

            // 2. ПРИМЕНЯЕМ ПОРОГОВУЮ ФИЛЬТРАЦИЮ (НО ПО-ДРУГОМУ!)
            const imageData = processCtx.getImageData(0, 0, processCanvas.width, processCanvas.height);
            const data = imageData.data;

            // ВАЖНО: ImageTracer лучше работает с оригинальным изображением
            // или с мягкой фильтрацией, а не с жестким порогом
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const adjustedGray = invert ? 255 - gray : gray;

                // Мягкая фильтрация вместо жесткого порога
                if (adjustedGray < threshold) {
                    // Черные области
                    data[i] = data[i + 1] = data[i + 2] = 0;
                } else {
                    // Белые области
                    data[i] = data[i + 1] = data[i + 2] = 255;
                }
            }
            processCtx.putImageData(imageData, 0, 0);

            // 3. КОРРЕКТНЫЕ ПАРАМЕТРЫ ДЛЯ ImageTracer
            const precision = document.getElementById('tracePrecision').value;

            // БАЗОВЫЕ ПАРАМЕТРЫ (исправленные!)
            let options = {
                ltres: 1,
                qtres: 1,
                pathomit: 8,
                colorsampling: 2,        // ВАЖНО: 2 = использовать цвета из палитры
                numberofcolors: 2,       // ВАЖНО: минимум 2 цвета (черный и выбранный)
                mincolorratio: 0.02,     // Минимальное соотношение цвета
                colorquantcycles: 3,     // Циклы квантования цвета
                layering: 0,             // Порядок слоев (0 = темные поверх светлых)
                strokewidth: 1,          // Ширина обводки
                linefilter: true,        // Фильтровать мелкие линии
                scale: 1,
                viewbox: false,
                desc: false,
                roundcoords: 1,
                lcpr: 0,
                qcpr: 0,
                blurradius: 0,
                blurdelta: 20
            };

            // Настройка точности
            switch(precision) {
                case 'high':
                    options.ltres = 0.1;
                    options.qtres = 0.1;
                    options.pathomit = 2;
                    options.numberofcolors = 16; // Больше цветов для детализации
                    break;
                case 'low':
                    options.ltres = 2;
                    options.qtres = 2;
                    options.pathomit = 20;
                    options.numberofcolors = 2;
                    break;
            }

            // 4. СОЗДАЕМ ПАЛИТРУ ПРАВИЛЬНО
            // ImageTracer ожидает массив цветов в формате [r, g, b]
            const rgbColor = this.hexToRgb(color);
            options.pal = [
                [0, 0, 0],           // Черный (фон)
                [rgbColor.r, rgbColor.g, rgbColor.b], // Выбранный цвет
                [255, 255, 255]      // Белый (резерв)
            ];

            // 5. ВЫЗЫВАЕМ ТРАССИРОВКУ
            const svgString = await ImageTracer.imagedataToSVG(
                processCtx.getImageData(0, 0, processCanvas.width, processCanvas.height),
                options
            );

            // 6. ОБРАБАТЫВАЕМ РЕЗУЛЬТАТ
            previewDiv.innerHTML = svgString;

            const svgElement = previewDiv.querySelector('svg');
            if (svgElement) {
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.setAttribute('viewBox', `0 0 ${processCanvas.width} ${processCanvas.height}`);

                // Применяем стили ко всем элементам
                const allElements = svgElement.querySelectorAll('*');
                allElements.forEach(el => {
                    if (el.hasAttribute('fill')) {
                        // Заменяем черный цвет на выбранный
                        if (el.getAttribute('fill') === '#000000' || el.getAttribute('fill') === 'rgb(0,0,0)') {
                            el.setAttribute('fill', color);
                        }
                    }
                    if (el.hasAttribute('stroke')) {
                        if (el.getAttribute('stroke') === '#000000' || el.getAttribute('stroke') === 'rgb(0,0,0)') {
                            el.setAttribute('stroke', color);
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Ошибка превью трассировки:', error);
            previewDiv.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="red">Ошибка: ${error.message}</text>`;
        }
    }

    async applyTrace() {
        if (!this.currentRasterImage) {
            alert('Нет изображения для трассировки');
            return;
        }

        try {
            // Сохраняем состояние перед трассировкой
            this.saveState('Трассировка изображения');

            const threshold = parseInt(document.getElementById('traceThreshold').value);
            const traceColor = document.getElementById('traceColor').value;
            const invert = document.getElementById('traceInvert').checked;
            const precision = document.getElementById('tracePrecision').value;

            // Проверяем наличие библиотеки
            if (typeof ImageTracer === 'undefined') {
                throw new Error('Библиотека ImageTracer не загружена');
            }

            // Получаем оригинальное изображение
            const img = new Image();
            const imageUrl = this.currentRasterImage.getAttribute('href') ||
                            this.currentRasterImage.getAttribute('xlink:href');

            // Ждем загрузки
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            // Создаем canvas для обработки
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Применяем пороговую фильтрацию
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const adjustedGray = invert ? 255 - gray : gray;
                const value = adjustedGray < threshold ? 0 : 255;
                data[i] = data[i + 1] = data[i + 2] = value;
            }
            ctx.putImageData(imageData, 0, 0);

            // КЛЮЧЕВЫЕ ИСПРАВЛЕНИЯ В ПАРАМЕТРАХ:
            let options = {
                ltres: 1,
                qtres: 1,
                pathomit: 8,
                colorsampling: 2,           // Использовать палитру
                numberofcolors: 3,          // Черный, выбранный цвет, белый
                mincolorratio: 0.02,
                colorquantcycles: 3,
                layering: 0,
                strokewidth: 1,
                linefilter: true,
                scale: 1,
                viewbox: false,
                desc: false
            };

            // Настройка точности
            switch(precision) {
                case 'high':
                    options.ltres = 0.1;
                    options.qtres = 0.1;
                    options.pathomit = 2;
                    options.numberofcolors = 8;
                    break;
                case 'low':
                    options.ltres = 2;
                    options.qtres = 2;
                    options.pathomit = 20;
                    options.numberofcolors = 2;
                    break;
            }

            // ПРАВИЛЬНАЯ ПАЛИТРА
            const rgbColor = this.hexToRgb(traceColor);
            options.pal = [
                [0, 0, 0],           // Черный
                [rgbColor.r, rgbColor.g, rgbColor.b], // Основной цвет
                [255, 255, 255]      // Белый (резерв)
            ];


            // ВЫПОЛНЯЕМ ТРАССИРОВКУ с ImageTracer
            console.log('Начинаем трассировку с параметрами:', options);
            const svgString = await ImageTracer.imagedataToSVG(
                ctx.getImageData(0, 0, canvas.width, canvas.height),
                options
            );

            // Парсим полученный SVG
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
            const tracedSVG = svgDoc.querySelector('svg');

            if (!tracedSVG) {
                throw new Error('Не удалось получить результат трассировки');
            }

            // Создаем группу для результатов
            const ns = 'http://www.w3.org/2000/svg';
            const group = document.createElementNS(ns, 'g');
            group.setAttribute('class', 'vector-object traced-image-group');
            group.setAttribute('id', `traced_${Date.now()}`);

            // Копируем все элементы из результата трассировки
            Array.from(tracedSVG.children).forEach((child, index) => {
                const cloned = child.cloneNode(true);

                // Для путей применяем стили
                if (cloned.tagName === 'path') {
                    cloned.setAttribute('fill', traceColor);
                    cloned.setAttribute('stroke', traceColor);
                    cloned.setAttribute('stroke-width', '1');
                    cloned.setAttribute('id', `traced_path_${index}`);
                    cloned.setAttribute('class', 'vector-object traced-path');
                }

                group.appendChild(cloned);
            });

            // Позиционируем и масштабируем
            const x = parseFloat(this.currentRasterImage.getAttribute('x')) || 0;
            const y = parseFloat(this.currentRasterImage.getAttribute('y')) || 0;
            const width = parseFloat(this.currentRasterImage.getAttribute('width')) || 200;
            const height = parseFloat(this.currentRasterImage.getAttribute('height')) || 150;

            // Масштабируем результат
            const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
            if (viewBoxMatch) {
                const [, viewBoxValues] = viewBoxMatch;
                const [,, vbWidth, vbHeight] = viewBoxValues.split(' ').map(Number);

                if (vbWidth && vbHeight) {
                    const scaleX = width / vbWidth;
                    const scaleY = height / vbHeight;
                    group.setAttribute('transform', `translate(${x}, ${y}) scale(${scaleX}, ${scaleY})`);
                }
            } else {
                // Простой масштаб если нет viewBox
                group.setAttribute('transform', `translate(${x}, ${y})`);
            }

            // Добавляем на холст
            const activeLayer = this.getActiveLayer();
            if (activeLayer && !activeLayer.locked) {
                const container = activeLayer.group || this.canvas;
                container.appendChild(group);
                activeLayer.addElement(group);
            }

            // Опционально: делаем оригинал полупрозрачным
            this.currentRasterImage.style.opacity = '0.3';

            // Выделяем результат
            this.clearSelection();
            this.selectedElements.add(group);
            group.classList.add('selected');

            // Закрываем окно и обновляем интерфейс
            this.closeTraceModal();
            this.saveState('Трассировка завершена');
            this.setTool('select');

            const paths = group.querySelectorAll('path');
            alert(`Трассировка завершена! Создано ${paths.length} векторных элементов.`);

            // ПОСЛЕ ПОЛУЧЕНИЯ SVG - КОРРЕКТИРУЕМ ЦВЕТА:
            Array.from(tracedSVG.children).forEach((child, index) => {
                const cloned = child.cloneNode(true);

                // КОРРЕКЦИЯ ЦВЕТОВ
                if (cloned.hasAttribute('fill')) {
                    const fill = cloned.getAttribute('fill');
                    if (fill === '#000000' || fill === 'rgb(0,0,0)') {
                        cloned.setAttribute('fill', traceColor);
                    }
                }
                if (cloned.hasAttribute('stroke')) {
                    const stroke = cloned.getAttribute('stroke');
                    if (stroke === '#000000' || stroke === 'rgb(0,0,0)') {
                        cloned.setAttribute('stroke', traceColor);
                    }
                }

                cloned.setAttribute('stroke-width', '0.5');
                cloned.setAttribute('class', 'vector-object traced-path');

                group.appendChild(cloned);
            });

        } catch (error) {
            console.error('Ошибка при трассировке:', error);
            alert(`Ошибка трассировки: ${error.message}\nПроверьте консоль для подробностей.`);
        }
    }

    // ========== ИСТОРИЯ ==========

    saveState(description = 'Действие') {
        try {
            if (!this.canvas) return;

            // Инициализируем историю если нужно
            if (!Array.isArray(this.history)) {
                this.history = [];
                this.historyIndex = -1;
            }

            // Ограничиваем размер истории
            if (this.history.length >= this.maxHistorySize) {
                this.history.shift();
                if (this.historyIndex > 0) this.historyIndex--;
            }

            // Удаляем все состояния после текущего индекса
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }

            // Сохраняем текущее состояние холста
            const state = {
                timestamp: Date.now(),
                description: description,
                data: this.canvas.innerHTML,
                zoom: this.zoom,
                selectedIds: Array.from(this.selectedElements).map(el => el.id).filter(id => id)
            };

            this.history.push(state);
            this.historyIndex = this.history.length - 1;

            console.log(`Состояние сохранено: ${description} (${this.historyIndex + 1}/${this.history.length})`);
            this.updateUndoRedoButtons();

        } catch (error) {
            console.error('Ошибка при сохранении состояния:', error);
        }
    }

    undo() {
        try {
            // Проверяем корректность данных
            if (!Array.isArray(this.history) || this.history.length === 0) {
                console.log('История пуста, нечего отменять');
                return;
            }

            if (this.historyIndex <= 0) {
                console.log('Нечего отменять (дошли до начала истории)');
                return;
            }

            this.historyIndex--;
            this.restoreState();

            const currentState = this.history[this.historyIndex];
            const desc = currentState ? currentState.description : 'предыдущее действие';
            console.log(`Отмена действия: ${desc} (${this.historyIndex + 1}/${this.history.length})`);

        } catch (error) {
            console.error('Ошибка при отмене действия:', error);
            alert('Ошибка при отмене действия. Проверьте консоль для подробностей.');
        }
    }

    redo() {
        try {
            // Проверяем корректность данных
            if (!Array.isArray(this.history) || this.history.length === 0) {
                console.log('История пуста, нечего повторять');
                return;
            }

            if (this.historyIndex >= this.history.length - 1) {
                console.log('Нечего повторять (дошли до конца истории)');
                return;
            }

            this.historyIndex++;
            this.restoreState();

            const currentState = this.history[this.historyIndex];
            const desc = currentState ? currentState.description : 'следующее действие';
            console.log(`Повтор действия: ${desc} (${this.historyIndex + 1}/${this.history.length})`);

        } catch (error) {
            console.error('Ошибка при повторении действия:', error);
            alert('Ошибка при повторении действия. Проверьте консоль для подробностей.');
        }
    }

    restoreState() {
        try {
            // Проверяем корректность данных
            if (!this.canvas ||
                !Array.isArray(this.history) ||
                this.history.length === 0 ||
                this.historyIndex < 0 ||
                this.historyIndex >= this.history.length) {
                console.warn('Невозможно восстановить состояние: некорректные данные');
                return;
            }

            const state = this.history[this.historyIndex];
            if (!state || !state.data) {
                console.error('Некорректное состояние в истории');
                return;
            }

            // Восстанавливаем содержимое холста
            this.canvas.innerHTML = state.data;

            // Восстанавливаем масштаб
            this.zoom = state.zoom || 1;
            this.setZoom(this.zoom);

            // Восстанавливаем выделение
            this.clearSelection();
            if (state.selectedIds && Array.isArray(state.selectedIds) && state.selectedIds.length > 0) {
                state.selectedIds.forEach(id => {
                    if (id) {
                        const element = document.getElementById(id);
                        if (element) {
                            this.selectedElements.add(element);
                            element.classList.add('selected');
                        }
                    }
                });
            }

            // Добавляем классы vector-object ко всем элементам
            const elements = this.canvas.querySelectorAll('*');
            elements.forEach(el => {
                if (el.tagName !== 'svg' && !el.classList.contains('vector-object')) {
                    el.classList.add('vector-object');
                }
            });

            // Восстанавливаем информацию о слоях
            setTimeout(() => {
                const layerGroups = this.canvas.querySelectorAll('g[data-layer-id]');
                if (layerGroups.length > 0) {
                    this.restoreLayersFromImportedSVG();
                }
            }, 10);

            this.updatePropertiesPanel();
            this.updateStatusBar();
            this.updateUndoRedoButtons();

        } catch (error) {
            console.error('Ошибка при восстановлении состояния:', error);
            alert('Ошибка при восстановлении состояния. Проверьте консоль для подробностей.');
        }
    }

    updateUndoRedoButtons() {
        try {
            const undoBtn = document.getElementById('undoBtn');
            const redoBtn = document.getElementById('redoBtn');

            // Безопасная проверка истории
            const hasHistory = Array.isArray(this.history) && this.history.length > 0;
            const canUndo = hasHistory && this.historyIndex > 0;
            const canRedo = hasHistory && this.historyIndex < this.history.length - 1;

            if (undoBtn) {
                undoBtn.disabled = !canUndo;
                undoBtn.title = canUndo ?
                    `Отменить: ${this.history[this.historyIndex]?.description || 'предыдущее действие'}` :
                    'Нечего отменять';

                // Визуальная обратная связь
                undoBtn.style.opacity = canUndo ? '1' : '0.5';
                undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
            }

            if (redoBtn) {
                redoBtn.disabled = !canRedo;
                redoBtn.title = canRedo ?
                    `Повторить: ${this.history[this.historyIndex + 1]?.description || 'следующее действие'}` :
                    'Нечего повторять';

                // Визуальная обратная связь
                redoBtn.style.opacity = canRedo ? '1' : '0.5';
                redoBtn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
            }

        } catch (error) {
            console.error('Ошибка при обновлении кнопок отмены/повтора:', error);
        }
    }

    // ========== ИМПОРТ/ЭКСПОРТ ==========

    async importFile(file) {
        try {
            // Сохраняем состояние перед импортом
            this.saveState('Перед импортом файла');

            const extension = file.name.split('.').pop().toLowerCase();

            if (extension === 'svg') {
                // Импорт SVG
                const svgContent = await SVGImportExport.importSVGFromFile(file);
                this.loadSVGContent(svgContent);
            } else if (extension === 'vdraw') {
                // Импорт проекта
                const svgContent = await SVGImportExport.loadProject(file);
                this.loadSVGContent(svgContent);
            } else {
                alert('Неподдерживаемый формат файла. Используйте SVG или .vdraw');
            }

            this.saveState(`Импорт файла ${file.name}`);

        } catch (error) {
            console.error('Ошибка импорта:', error);
            alert('Ошибка при импорте файла');
        }
    }

    loadSVGContent(svgContent) {
        if (this.canvas) {
            // Сохраняем состояние перед очисткой
            this.saveState('Перед загрузкой SVG');

            // Очищаем холст
            this.canvas.innerHTML = '';

            // Загружаем SVG
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const importedSVG = svgDoc.querySelector('svg');

            if (importedSVG) {
                // Копируем атрибуты
                Array.from(importedSVG.attributes).forEach(attr => {
                    if (attr.name !== 'id') {
                        this.canvas.setAttribute(attr.name, attr.value);
                    }
                });

                // Копируем содержимое
                this.canvas.innerHTML = importedSVG.innerHTML;

                // Добавляем классы для элементов
                const elements = this.canvas.querySelectorAll('*');
                elements.forEach(el => {
                    if (el.tagName !== 'svg' && !el.classList.contains('vector-object')) {
                        el.classList.add('vector-object');
                    }
                });

                // Восстанавливаем слои из импортированного SVG
                setTimeout(() => this.restoreLayersFromImportedSVG(), 100);
            }

            this.clearSelection();
            this.updatePropertiesPanel();
            this.updateStatusBar();

            this.saveState('SVG загружен');
        }
    }

    restoreLayersFromImportedSVG() {
        if (!this.canvas) return;

        // Находим все группы слоев в импортированном SVG
        const layerGroups = this.canvas.querySelectorAll('g[data-layer-id]');

        if (layerGroups.length > 0) {
            // Очищаем текущие слои
            this.layers.forEach(layer => layer.destroy());
            this.layers = [];
            this.layerCounter = 1;

            // Восстанавливаем слои из групп
            layerGroups.forEach(group => {
                const layerId = parseInt(group.getAttribute('data-layer-id'));
                const layerName = group.getAttribute('data-layer-name') || `Слой ${layerId}`;

                const layer = new Layer(layerId, layerName);
                layer.group = group;

                // Восстанавливаем свойства слоя
                const visible = group.getAttribute('visibility') !== 'hidden';
                const locked = group.style.pointerEvents === 'none';

                layer.setVisibility(visible);
                layer.setLocked(locked);

                // Собираем элементы слоя
                const elements = group.querySelectorAll('.vector-object');
                elements.forEach(element => {
                    layer.addElement(element);
                });

                this.layers.push(layer);
                this.layerCounter = Math.max(this.layerCounter, layerId + 1);
            });

            // Обновляем UI слоев
            this.updateLayersUI();

            // Активируем первый слой если есть
            if (this.layers.length > 0) {
                this.setActiveLayer(this.layers[0].id);
            }
        }
    }

    exportFile() {
        if (!this.canvas) return;

        const format = document.getElementById('exportFormat')?.value || 'svg';
        const filename = document.getElementById('exportFilename')?.value ||
                         `vector_image_${Date.now()}`;

        try {
            switch(format) {
                case 'svg':
                    SVGImportExport.exportSVGToFile(this.canvas, `${filename}.svg`);
                    break;

                case 'png':
                    const width = this.canvas.getAttribute('width') || 800;
                    const height = this.canvas.getAttribute('height') || 600;
                    SVGImportExport.exportToPNG(this.canvas, width, height, `${filename}.png`);
                    break;

                case 'jpeg':
                    const jpegWidth = this.canvas.getAttribute('width') || 800;
                    const jpegHeight = this.canvas.getAttribute('height') || 600;
                    SVGImportExport.exportToJPEG(this.canvas, jpegWidth, jpegHeight, `${filename}.jpg`);
                    break;

                case 'vdraw':
                    const projectName = document.getElementById('projectName')?.value || 'project';
                    SVGImportExport.saveProject(this.canvas, projectName);
                    break;

                default:
                    alert('Неизвестный формат экспорта');
            }

            console.log(`Экспорт в ${format} выполнен`);

        } catch (error) {
            console.error('Ошибка экспорта:', error);
            alert('Ошибка при экспорте файла');
        }
    }

    // ========== НАСТРОЙКИ ХОЛСТА ==========

    showNewCanvasModal() {
        const modalElement = document.getElementById('newCanvasModal');
        if (modalElement) {
            modalElement.style.display = 'flex';
            setTimeout(() => {
                modalElement.classList.add('show');
            }, 10);

            document.body.style.overflow = 'hidden';
        }
    }

    closeNewCanvasModal() {
        const modalElement = document.getElementById('newCanvasModal');
        if (modalElement) {
            modalElement.classList.remove('show');

            setTimeout(() => {
                modalElement.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }
    }

    createNewCanvas() {
        const width = document.getElementById('canvasWidth')?.value || 800;
        const height = document.getElementById('canvasHeight')?.value || 600;
        const bgColor = document.getElementById('canvasBgColor')?.value || '#ffffff';

        if (!width || !height) {
            alert('Пожалуйста, укажите ширину и высоту');
            return;
        }

        if (this.canvas) {
            // Сохраняем текущее состояние перед очисткой
            this.saveState('Очистка холста');

            // Очищаем холст
            this.canvas.innerHTML = '';

            // Сбрасываем слои
            this.layers.forEach(layer => layer.destroy());
            this.layers = [];
            this.layerCounter = 1;

            // Устанавливаем размеры
            this.canvas.setAttribute('width', width);
            this.canvas.setAttribute('height', height);
            this.canvas.setAttribute('viewBox', `0 0 ${width} ${height}`);

            // Создаем слой для фона
            const bgLayer = this.createLayer('Фон', false);
            bgLayer.setLocked(true);

            // Добавляем фон в группу слоя
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '100%');
            rect.setAttribute('height', '100%');
            rect.setAttribute('fill', bgColor);
            rect.setAttribute('class', 'background-rect');

            if (bgLayer.group) {
                bgLayer.group.appendChild(rect);
            }
            bgLayer.addElement(rect);

            // Создаем основной слой
            this.createLayer('Слой 1', true);
            this.setActiveLayer(1);

            // Обновляем информацию
            const canvasInfo = document.querySelector('.canvas-info');
            if (canvasInfo) {
                canvasInfo.textContent = `${width} × ${height} px`;
            }

            this.clearSelection();

            // Закрываем модальное окно
            this.closeNewCanvasModal();

            // Сохраняем состояние нового холста
            this.saveState('Создание нового холста');
        }
    }

    showExportModal() {
        const modalElement = document.getElementById('exportModal');
        if (modalElement) {
            modalElement.style.display = 'flex';
            modalElement.style.opacity = '0';

            // Принудительно пересчитываем стили
            modalElement.offsetHeight;

            setTimeout(() => {
                modalElement.classList.add('show');
                modalElement.style.opacity = '1';
            }, 10);

            // Блокируем прокрутку фона
            document.body.style.overflow = 'hidden';
        }
    }

    closeExportModal() {
        const modalElement = document.getElementById('exportModal');
        if (modalElement) {
            modalElement.classList.remove('show');
            modalElement.style.opacity = '0';

            // Ждем завершения анимации перед скрытием
            setTimeout(() => {
                modalElement.style.display = 'none';
                // Восстанавливаем прокрутку фона
                document.body.style.overflow = '';
            }, 300);
        }
    }

    closeModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
            modalElement.setAttribute('aria-hidden', 'true');
        }
    }

    // ========== ГОРЯЧИЕ КЛАВИШИ ==========

    onKeyDown(e) {
        // ЕСЛИ МОДАЛЬНОЕ ОКНО ОТКРЫТО - блокируем горячие клавиши
        const modalOpen = document.querySelector('.modal[style*="display: flex"]') ||
                         document.querySelector('.modal:not([style*="display: none"])');

        if (modalOpen) {
            // Разрешаем только основные клавиши внутри модального окна
            const activeElement = document.activeElement;
            const isInput = activeElement.tagName === 'INPUT' ||
                           activeElement.tagName === 'TEXTAREA' ||
                           activeElement.tagName === 'SELECT';

            if (isInput) {
                // Разрешаем стандартное поведение в полях ввода
                if (e.key === 'Escape') {
                    e.preventDefault();
                    // Закрываем все модальные окна
                    document.querySelectorAll('.modal').forEach(modal => {
                        modal.style.display = 'none';
                    });
                }
                return;
            }

            // Для модального окна без активного поля ввода
            if (e.key === 'Escape') {
                e.preventDefault();
                // Закрываем все модальные окна
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
                return;
            }
        }

        // Горячие клавиши
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    this.undo();
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 'n':
                    e.preventDefault();
                    this.showNewCanvasModal();
                    break;
                case 'o':
                    e.preventDefault();
                    document.getElementById('importFile').click();
                    break;
                case 's':
                    e.preventDefault();
                    this.showExportModal();
                    break;
                case 'g':
                    e.preventDefault();
                    this.groupSelected();
                    break;
                case 'u':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.ungroupSelected();
                    }
                    break;
                case 'd':
                    e.preventDefault();
                    this.duplicateSelected();
                    break;
            }
        } else {
            // Инструменты
            switch(e.key.toLowerCase()) {
                case 'v':
                    e.preventDefault();
                    this.setTool('select');
                    break;
                case 'r':
                    e.preventDefault();
                    this.setTool('rectangle');
                    break;
                case 'c':
                    e.preventDefault();
                    this.setTool('circle');
                    break;
                case 'e':
                    e.preventDefault();
                    this.setTool('ellipse');
                    break;
                case 'l':
                    e.preventDefault();
                    this.setTool('line');
                    break;
                case 'p':
                    e.preventDefault();
                    this.setTool('polygon');
                    break;
                case 't':
                    e.preventDefault();
                    this.setTool('text');
                    break;
                case 'b':
                    e.preventDefault();
                    this.setTool('path');
                    break;
                case 's':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.setTool('star');
                    }
                    break;
                case 'i':
                    e.preventDefault();
                    this.setTool('raster');
                    break;
                case 'q':
                    e.preventDefault();
                    this.setTool('trace');
                    break;
                case 'delete':
                case 'backspace':
                    e.preventDefault();
                    this.deleteSelected();
                    break;
                case 'g':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.toggleGrid();
                    }
                    break;
                case 'escape':
                    e.preventDefault();
                    this.clearSelection();
                    break;
            }
        }
    }

    duplicateSelected() {
        if (this.selectedElements.size === 0) return;

        // Сохраняем состояние перед дублированием
        this.saveState('Дублирование объектов');

        const newElements = new Set();

        this.selectedElements.forEach(element => {
            const clone = element.cloneNode(true);
            clone.setAttribute('id', `elem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

            // Сдвигаем копию на 10px вправо и вниз
            const tag = clone.tagName.toLowerCase();
            if (tag === 'rect') {
                const x = parseFloat(clone.getAttribute('x')) + 10;
                const y = parseFloat(clone.getAttribute('y')) + 10;
                clone.setAttribute('x', x);
                clone.setAttribute('y', y);
            } else if (tag === 'circle' || tag === 'ellipse') {
                const cx = parseFloat(clone.getAttribute('cx')) + 10;
                const cy = parseFloat(clone.getAttribute('cy')) + 10;
                clone.setAttribute('cx', cx);
                clone.setAttribute('cy', cy);
            } else if (tag === 'text') {
                const x = parseFloat(clone.getAttribute('x')) + 10;
                const y = parseFloat(clone.getAttribute('y')) + 10;
                clone.setAttribute('x', x);
                clone.setAttribute('y', y);
            } else if (tag === 'image') {
                const x = parseFloat(clone.getAttribute('x')) + 10;
                const y = parseFloat(clone.getAttribute('y')) + 10;
                clone.setAttribute('x', x);
                clone.setAttribute('y', y);
            }

            // Добавляем клон на холст
            if (element.parentNode) {
                element.parentNode.appendChild(clone);
                newElements.add(clone);
            }
        });

        // Выделяем новые элементы
        this.clearSelection();
        newElements.forEach(el => {
            this.selectedElements.add(el);
            el.classList.add('selected');
        });

        this.updatePropertiesPanel();
    }

    // ========== НАСТРОЙКИ ИНТЕРФЕЙСА ==========

    setZoom(level) {
        this.zoom = level;
        if (this.canvas) {
            this.canvas.style.transform = `scale(${level})`;
            this.canvas.style.transformOrigin = '0 0';
        }

        const currentZoomElement = document.getElementById('currentZoom');
        if (currentZoomElement) {
            currentZoomElement.textContent = `${Math.round(level * 100)}%`;
        }
    }

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        const gridOverlay = document.getElementById('gridOverlay');

        if (gridOverlay) {
            gridOverlay.classList.toggle('visible', this.gridVisible);
        }

        const gridToggle = document.getElementById('gridToggle');
        if (gridToggle) {
            gridToggle.classList.toggle('active', this.gridVisible);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Ошибка при переходе в полноэкранный режим: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    loadInitialCanvas() {
        // Создаем белый фон при загрузке
        if (this.canvas) {
            // Создаем слой для фона
            const bgLayer = this.createLayer('Фон', false);
            bgLayer.setLocked(true);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '100%');
            rect.setAttribute('height', '100%');
            rect.setAttribute('fill', 'white');
            rect.setAttribute('class', 'background-rect');

            if (bgLayer.group) {
                bgLayer.group.appendChild(rect);
            }
            bgLayer.addElement(rect);

            // Создаем основной слой
            this.createLayer('Слой 1', true);
            this.setActiveLayer(1);
        }
    }

    updateStatusBar() {
        const toolNames = {
            'select': 'Выбор',
            'rectangle': 'Прямоугольник',
            'circle': 'Круг',
            'ellipse': 'Эллипс',
            'line': 'Линия',
            'polygon': 'Многоугольник',
            'text': 'Текст',
            'path': 'Кривая Безье',
            'star': 'Звезда',
            'raster': 'Растровое изображение',
            'trace': 'Трассировка'
        };

        const currentToolElement = document.getElementById('currentTool');
        const selectedCountElement = document.getElementById('selectedCount');

        if (currentToolElement) {
            currentToolElement.textContent = toolNames[this.currentTool] || this.currentTool;
        }

        if (selectedCountElement) {
            selectedCountElement.textContent = `${this.selectedElements.size} объектов`;
        }
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

document.addEventListener('DOMContentLoaded', () => {
    window.vectorEditor = new VectorEditor();

    // Управление видимостью опций экспорта
    const exportFormat = document.getElementById('exportFormat');
    const pngOptions = document.getElementById('pngOptions');
    const projectOptions = document.getElementById('projectOptions');

    if (exportFormat) {
        exportFormat.addEventListener('change', function() {
            const format = this.value;
            if (pngOptions) pngOptions.style.display = format === 'png' || format === 'jpeg' ? 'block' : 'none';
            if (projectOptions) projectOptions.style.display = format === 'vdraw' ? 'block' : 'none';
        });

        // Инициализация
        const format = exportFormat.value;
        if (pngOptions) pngOptions.style.display = format === 'png' || format === 'jpeg' ? 'block' : 'none';
        if (projectOptions) projectOptions.style.display = format === 'vdraw' ? 'block' : 'none';
    }
});