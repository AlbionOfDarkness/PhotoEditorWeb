// Глобальные переменные
let scene, camera, renderer, controls;
let objects = [];
let selectedObject = null;
let editMode = 'select';
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let isDragging = false;
let dragStart = new THREE.Vector2();
let dragObjectStart = {
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    scale: new THREE.Vector3()
};
let sceneSize = { width: 10, height: 10, depth: 10 };
let gridHelper, axesHelper;

// Инициализация 3D сцены
function init3DScene() {
    // Создание сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Настройка камеры
    const container = document.getElementById('scene-container');
    if (!container) {
        console.error('Container not found!');
        return;
    }
    
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(15, 10, 15);
    camera.lookAt(0, 0, 0);

    // Создание рендерера
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // OrbitControls для управления камерой
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enabled = true; // Начальное состояние - включены

    // Освещение
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Сетка и оси
    gridHelper = new THREE.GridHelper(sceneSize.width * 2, sceneSize.width * 2, 0x444444, 0x222222);
    scene.add(gridHelper);

    axesHelper = new THREE.AxesHelper(sceneSize.width);
    scene.add(axesHelper);

    // Создаем базовую плоскость (землю)
    createGroundPlane();

    // Обработчики событий мыши на рендерере
    renderer.domElement.addEventListener('mousedown', onMouseDown, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('mouseup', onMouseUp, false);
    renderer.domElement.addEventListener('dblclick', onDoubleClick, false);
    
    // Обработчики событий для всего окна
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown, false);
    
    // Предотвращаем контекстное меню
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Старт анимации
    animate();
}

// Создание плоскости земли
function createGroundPlane() {
    const geometry = new THREE.PlaneGeometry(sceneSize.width * 2, sceneSize.depth * 2);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x3a3a3a,
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.9
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = "Земля";
    scene.add(ground);
}

// Анимация
function animate() {
    requestAnimationFrame(animate);
    if (controls && controls.enabled) controls.update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Создание новой сцены
function createNewScene() {
    const width = prompt('Ширина сцены (единиц):', sceneSize.width);
    if (width === null) return;
    
    const height = prompt('Высота сцены (единиц):', sceneSize.height);
    if (height === null) return;
    
    const depth = prompt('Глубина сцены (единиц):', sceneSize.depth);
    if (depth === null) return;

    sceneSize = {
        width: parseFloat(width) || 10,
        height: parseFloat(height) || 10,
        depth: parseFloat(depth) || 10
    };

    // Получаем контейнер
    const container = document.getElementById('scene-container');
    if (!container) {
        alert('Ошибка: контейнер сцены не найден');
        return;
    }

    // Удаляем старый рендерер
    if (renderer && renderer.domElement) {
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
    }

    // Очищаем все ссылки
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    gridHelper = null;
    axesHelper = null;
    
    // Сбрасываем объекты
    objects = [];
    selectedObject = null;
    
    // Обновляем UI
    updateObjectsList();
    updateSelectedObjectInfo();
    clearTransformControls();

    // Инициализация новой сцены
    setTimeout(() => {
        try {
            init3DScene();
            alert(`Новая сцена создана!\nРазмер: ${sceneSize.width}×${sceneSize.height}×${sceneSize.depth} единиц`);
        } catch (error) {
            console.error('Error creating new scene:', error);
            alert('Ошибка при создании новой сцены: ' + error.message);
        }
    }, 100);
}

// Очистка контролов трансформации
function clearTransformControls() {
    document.getElementById('posX').value = '';
    document.getElementById('posY').value = '';
    document.getElementById('posZ').value = '';
    
    document.getElementById('scaleX').value = '1';
    document.getElementById('scaleY').value = '1';
    document.getElementById('scaleZ').value = '1';
    
    document.getElementById('rotX').value = '0';
    document.getElementById('rotY').value = '0';
    document.getElementById('rotZ').value = '0';
    
    document.getElementById('objectName').value = '';
    document.getElementById('objectColor').value = '#2196f3';
    document.getElementById('objectOpacity').value = '1';
}

// Создание базовых примитивов
function addCube() {
    if (!scene) {
        alert('Сцена не инициализирована!');
        return;
    }
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x2196f3,
        metalness: 0.3,
        roughness: 0.4
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.name = `Куб_${objects.length + 1}`;
    cube.position.y = 0.5;
    
    // Сохраняем ОРИГИНАЛЬНЫЙ масштаб (базовые размеры геометрии)
    cube.userData = {
        type: 'cube',
        originalScale: { x: 1, y: 1, z: 1 } // Базовый размер куба
    };
    
    cube.castShadow = true;
    cube.receiveShadow = true;
    
    scene.add(cube);
    objects.push(cube);
    selectObject(cube);
    updateObjectsList();
    console.log(`Добавлен ${cube.name} с оригинальным масштабом 1,1,1`);
}



function addSphere() {
    if (!scene) {
        alert('Сцена не инициализирована!');
        return;
    }
    
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xf44336,
        metalness: 0.2,
        roughness: 0.5
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = `Сфера_${objects.length + 1}`;
    sphere.position.y = 0.5;
    sphere.userData = {
        type: 'sphere',
        originalScale: { x: 1, y: 1, z: 1 }
    };
    
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    
    scene.add(sphere);
    objects.push(sphere);
    selectObject(sphere);
    updateObjectsList();
    console.log(`Добавлена ${sphere.name}`);
}

function addCylinder() {
    if (!scene) {
        alert('Сцена не инициализирована!');
        return;
    }
    
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x4caf50,
        metalness: 0.3,
        roughness: 0.4
    });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.name = `Цилиндр_${objects.length + 1}`;
    cylinder.position.y = 0.5;
    cylinder.userData = {
        type: 'cylinder',
        originalScale: { x: 1, y: 1, z: 1 }
    };
    
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    
    scene.add(cylinder);
    objects.push(cylinder);
    selectObject(cylinder);
    updateObjectsList();
    console.log(`Добавлен ${cylinder.name}`);
}

function addCone() {
    if (!scene) {
        alert('Сцена не инициализирована!');
        return;
    }
    
    const geometry = new THREE.ConeGeometry(0.5, 1, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xff9800,
        metalness: 0.3,
        roughness: 0.4
    });
    const cone = new THREE.Mesh(geometry, material);
    cone.name = `Конус_${objects.length + 1}`;
    cone.position.y = 0.5;
    cone.userData = {
        type: 'cone',
        originalScale: { x: 1, y: 1, z: 1 }
    };
    
    cone.castShadow = true;
    cone.receiveShadow = true;
    
    scene.add(cone);
    objects.push(cone);
    selectObject(cone);
    updateObjectsList();
    console.log(`Добавлен ${cone.name}`);
}

function addTorus() {
    if (!scene) {
        alert('Сцена не инициализирована!');
        return;
    }
    
    const geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x9c27b0,
        metalness: 0.4,
        roughness: 0.3
    });
    const torus = new THREE.Mesh(geometry, material);
    torus.name = `Тор_${objects.length + 1}`;
    torus.position.y = 0.5;
    torus.userData = {
        type: 'torus',
        originalScale: { x: 1, y: 1, z: 1 }
    };
    
    torus.castShadow = true;
    torus.receiveShadow = true;
    
    scene.add(torus);
    objects.push(torus);
    selectObject(torus);
    updateObjectsList();
    console.log(`Добавлен ${torus.name}`);
}

function addPlane() {
    if (!scene) {
        alert('Сцена не инициализирована!');
        return;
    }
    
    const geometry = new THREE.PlaneGeometry(5, 5);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x607d8b,
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.8
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.name = `Плоскость_${objects.length + 1}`;
    plane.rotation.x = -Math.PI / 2;
    plane.userData = {
        type: 'plane',
        originalScale: { x: 1, y: 1, z: 1 }
    };
    
    plane.castShadow = true;
    plane.receiveShadow = true;
    
    scene.add(plane);
    objects.push(plane);
    selectObject(plane);
    updateObjectsList();
    console.log(`Добавлена ${plane.name}`);
}

// Выбор объекта
function selectObject(object) {
    // Снимаем выделение с предыдущего объекта
    if (selectedObject && selectedObject.userData && selectedObject.userData.bboxHelper) {
        scene.remove(selectedObject.userData.bboxHelper);
        selectedObject.userData.bboxHelper = null;
    }

    selectedObject = object;
    
    if (selectedObject) {
        // Добавляем bounding box helper
        const bbox = new THREE.Box3().setFromObject(selectedObject);
        const bboxHelper = new THREE.Box3Helper(bbox, 0xffff00);
        scene.add(bboxHelper);
        selectedObject.userData.bboxHelper = bboxHelper;
        
        // Сохраняем начальные значения для трансформаций
        dragObjectStart.position.copy(selectedObject.position);
        dragObjectStart.rotation.copy(selectedObject.rotation);
        dragObjectStart.scale.copy(selectedObject.scale);
        
        console.log(`Выбран объект: ${selectedObject.name}`);
    }

    // Обновляем UI
    updateTransformControls();
    updateSelectedObjectInfo();
    updateObjectsList();
    updateCurrentMode();
}

// Обновление списка объектов
function updateObjectsList() {
    const listContainer = document.getElementById('sceneObjectsList');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';

    objects.forEach((obj, index) => {
        const item = document.createElement('div');
        item.className = `object-item ${obj === selectedObject ? 'selected' : ''}`;
        item.textContent = `${obj.name} (${obj.userData?.type || 'unknown'})`;
        item.onclick = () => selectObject(obj);
        listContainer.appendChild(item);
    });
}

// Обновление контролов трансформации
function updateTransformControls() {
    if (!selectedObject) {
        clearTransformControls();
        return;
    }

    document.getElementById('posX').value = selectedObject.position.x.toFixed(2);
    document.getElementById('posY').value = selectedObject.position.y.toFixed(2);
    document.getElementById('posZ').value = selectedObject.position.z.toFixed(2);

    document.getElementById('scaleX').value = selectedObject.scale.x.toFixed(2);
    document.getElementById('scaleY').value = selectedObject.scale.y.toFixed(2);
    document.getElementById('scaleZ').value = selectedObject.scale.z.toFixed(2);

    document.getElementById('rotX').value = (selectedObject.rotation.x * (180 / Math.PI)).toFixed(1);
    document.getElementById('rotY').value = (selectedObject.rotation.y * (180 / Math.PI)).toFixed(1);
    document.getElementById('rotZ').value = (selectedObject.rotation.z * (180 / Math.PI)).toFixed(1);

    document.getElementById('objectName').value = selectedObject.name;
    document.getElementById('objectColor').value = '#' + selectedObject.material.color.getHexString();
    document.getElementById('objectOpacity').value = selectedObject.material.opacity;
}

// Обновление текущего режима в интерфейсе
function updateCurrentMode() {
    const modeElement = document.getElementById('currentMode');
    if (!modeElement) return;
    
    const modeNames = {
        'select': 'Выбор',
        'move': 'Перемещение',
        'rotate': 'Вращение',
        'scale': 'Масштаб'
    };
    
    modeElement.textContent = modeNames[editMode] || editMode;
    modeElement.style.color = editMode === 'select' ? '#81c784' : '#ff9800';
}

// Обновление позиции объекта
function updateObjectPosition() {
    if (!selectedObject) return;

    selectedObject.position.set(
        parseFloat(document.getElementById('posX').value) || 0,
        parseFloat(document.getElementById('posY').value) || 0,
        parseFloat(document.getElementById('posZ').value) || 0
    );
    
    updateBoundingBox();
}

// Обновление bounding box
function updateBoundingBox() {
    if (!selectedObject || !selectedObject.userData) return;
    
    // Удаляем старый bounding box
    if (selectedObject.userData.bboxHelper) {
        scene.remove(selectedObject.userData.bboxHelper);
    }
    
    // Создаем новый
    const bbox = new THREE.Box3().setFromObject(selectedObject);
    const bboxHelper = new THREE.Box3Helper(bbox, 0xffff00);
    scene.add(bboxHelper);
    selectedObject.userData.bboxHelper = bboxHelper;
}

// Обновление масштаба объекта
function updateObjectScale() {
    if (!selectedObject) return;

    selectedObject.scale.set(
        parseFloat(document.getElementById('scaleX').value) || 1,
        parseFloat(document.getElementById('scaleY').value) || 1,
        parseFloat(document.getElementById('scaleZ').value) || 1
    );
    
    updateBoundingBox();
}

function uniformScale() {
    if (!selectedObject) return;
    
    const currentScale = selectedObject.scale.x.toFixed(2);
    const scale = prompt('Введите единый масштаб (относительный множитель):', currentScale);
    if (scale === null) return;
    
    const scaleValue = parseFloat(scale) || 1;
    selectedObject.scale.set(scaleValue, scaleValue, scaleValue);
    updateTransformControls();
    updateBoundingBox();
    console.log(`Установлен единый масштаб: ${scaleValue}`);
}

// Обновление вращения объекта
function updateObjectRotation() {
    if (!selectedObject) return;

    selectedObject.rotation.set(
        (parseFloat(document.getElementById('rotX').value) || 0) * (Math.PI / 180),
        (parseFloat(document.getElementById('rotY').value) || 0) * (Math.PI / 180),
        (parseFloat(document.getElementById('rotZ').value) || 0) * (Math.PI / 180)
    );
    
    updateBoundingBox();
}

// Обновление имени объекта
function updateObjectName() {
    if (!selectedObject) return;
    selectedObject.name = document.getElementById('objectName').value;
    updateObjectsList();
    updateSelectedObjectInfo();
}

// Обновление цвета объекта
function updateObjectColor() {
    if (!selectedObject) return;
    selectedObject.material.color.set(document.getElementById('objectColor').value);
}

// Обновление непрозрачности объекта
function updateObjectOpacity() {
    if (!selectedObject) return;
    const opacity = parseFloat(document.getElementById('objectOpacity').value);
    selectedObject.material.opacity = opacity;
    selectedObject.material.transparent = opacity < 1;
}

// Удаление выбранного объекта
function deleteSelectedObject() {
    if (!selectedObject) {
        alert('Нет выбранного объекта для удаления');
        return;
    }
    
    if (confirm(`Удалить объект "${selectedObject.name}"?`)) {
        scene.remove(selectedObject);
        if (selectedObject.userData && selectedObject.userData.bboxHelper) {
            scene.remove(selectedObject.userData.bboxHelper);
        }
        
        const index = objects.indexOf(selectedObject);
        if (index > -1) {
            objects.splice(index, 1);
        }
        
        selectedObject = null;
        updateObjectsList();
        updateSelectedObjectInfo();
        clearTransformControls();
        console.log('Объект удален');
    }
}

// Дублирование объекта
function duplicateObject() {
    if (!selectedObject) {
        alert('Нет выбранного объекта для дублирования');
        return;
    }

    const geometry = selectedObject.geometry.clone();
    const material = selectedObject.material.clone();
    const newObject = new THREE.Mesh(geometry, material);
    
    newObject.name = `${selectedObject.name}_копия`;
    newObject.position.copy(selectedObject.position).add(new THREE.Vector3(1, 0, 1));
    newObject.rotation.copy(selectedObject.rotation);
    newObject.scale.copy(selectedObject.scale);
    
    // Клонируем userData
    newObject.userData = JSON.parse(JSON.stringify(selectedObject.userData || {}));
    
    newObject.castShadow = true;
    newObject.receiveShadow = true;
    
    scene.add(newObject);
    objects.push(newObject);
    selectObject(newObject);
    updateObjectsList();
    console.log(`Дублирован объект: ${newObject.name}`);
}

// Сброс трансформаций
function resetTransformations() {
    if (!selectedObject) {
        alert('Нет выбранного объекта для сброса трансформаций');
        return;
    }

    selectedObject.position.set(0, 0, 0);
    selectedObject.rotation.set(0, 0, 0);
    selectedObject.scale.set(1, 1, 1);
    
    updateTransformControls();
    updateBoundingBox();
    console.log('Трансформации сброшены');
}

// Обработчики событий мыши
function onMouseDown(event) {
    // Предотвращаем событие только если это нужно
    if (editMode !== 'select') {
        event.preventDefault();
    }
    
    if (!renderer || !renderer.domElement || !scene || !camera) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    dragStart.set(event.clientX, event.clientY);
    
    console.log(`MouseDown: mode=${editMode}, button=${event.button}`);

    // В режиме select - проверяем попадание в объекты
    if (editMode === 'select') {
        // Временно отключаем OrbitControls для проверки попадания
        controls.enabled = false;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objects, true);
        
        if (intersects.length > 0) {
            // Нашли объект - выбираем его
            selectObject(intersects[0].object);
            console.log(`Выбран объект: ${intersects[0].object.name}`);
            
            // Если это левая кнопка мыши - начинаем перемещение В РЕЖИМЕ SELECT
            if (event.button === 0) {
                isDragging = true;
                dragObjectStart.position.copy(selectedObject.position);
                dragObjectStart.rotation.copy(selectedObject.rotation);
                dragObjectStart.scale.copy(selectedObject.scale);
                // Важно: в режиме select тоже можно перемещать объект!
                console.log('Начало перемещения объекта в режиме SELECT');
            }
        } else {
            // Кликнули на пустое место - снимаем выделение
            if (selectedObject) {
                selectedObject = null;
                updateSelectedObjectInfo();
                clearTransformControls();
                console.log('Снято выделение');
            }
            // Включаем OrbitControls обратно для управления камерой
            controls.enabled = true;
        }
    } 
    // В режимах трансформации - начинаем трансформацию
    else if (editMode !== 'select' && selectedObject && event.button === 0) {
        console.log(`Начало трансформации в режиме ${editMode}`);
        
        // Отключаем OrbitControls
        controls.enabled = false;
        
        // Сохраняем начальное состояние объекта
        dragObjectStart.position.copy(selectedObject.position);
        dragObjectStart.rotation.copy(selectedObject.rotation);
        dragObjectStart.scale.copy(selectedObject.scale);
        
        isDragging = true;
    }
}

function onMouseMove(event) {
    if (!isDragging || !selectedObject) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    
    // Коэффициенты чувствительности для разных режимов
    const sensitivity = {
        select: { move: 10, rotate: Math.PI, scale: 2 },
        move: { move: 10, rotate: Math.PI, scale: 2 },
        rotate: { move: 5, rotate: Math.PI * 2, scale: 2 },
        scale: { move: 5, rotate: Math.PI, scale: 3 }
    };
    
    const sens = sensitivity[editMode] || sensitivity.select;
    
    switch(editMode) {
        case 'select':
        case 'move':
            // Получаем позицию мыши в нормализованных координатах устройства (-1 до 1)
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Создаем raycast для определения плоскости движения
            raycaster.setFromCamera(mouse, camera);
            
            // Определяем плоскость для движения (горизонтальная плоскость на уровне объекта)
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -selectedObject.position.y);
            
            // Находим точку пересечения луча с плоскостью для текущей позиции мыши
            const currentIntersection = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, currentIntersection);
            
            // Находим точку пересечения для начальной позиции мыши
            const startMouseX = ((dragStart.x - rect.left) / rect.width) * 2 - 1;
            const startMouseY = -((dragStart.y - rect.top) / rect.height) * 2 + 1;
            const startMouse = new THREE.Vector2(startMouseX, startMouseY);
            
            raycaster.setFromCamera(startMouse, camera);
            const startIntersection = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, startIntersection);
            
            // Вычисляем смещение в мировых координатах
            const deltaPosition = new THREE.Vector3().subVectors(currentIntersection, startIntersection);
            
            // Применяем смещение к начальной позиции объекта
            selectedObject.position.x = dragObjectStart.position.x + deltaPosition.x;
            selectedObject.position.z = dragObjectStart.position.z + deltaPosition.z;
            // Y остается неизменным (движение только в горизонтальной плоскости)
            selectedObject.position.y = dragObjectStart.position.y;
            break;
            
        case 'rotate':
            // Вращение объекта
            const deltaX = (event.clientX - dragStart.x) / rect.width;
            const deltaY = (event.clientY - dragStart.y) / rect.height;
            
            selectedObject.rotation.x = dragObjectStart.rotation.x + deltaY * sens.rotate;
            selectedObject.rotation.y = dragObjectStart.rotation.y + deltaX * sens.rotate;
            break;
            
        case 'scale':
            // Масштабирование объекта
            const deltaXScale = (event.clientX - dragStart.x) / rect.width;
            const deltaYScale = (event.clientY - dragStart.y) / rect.height;
            
            const scaleFactor = 1 + (deltaXScale + deltaYScale) * sens.scale;
            selectedObject.scale.x = dragObjectStart.scale.x * scaleFactor;
            selectedObject.scale.y = dragObjectStart.scale.y * scaleFactor;
            selectedObject.scale.z = dragObjectStart.scale.z * scaleFactor;
            break;
    }
    
    updateTransformControls();
    updateBoundingBox();
}

function onMouseUp(event) {
    if (isDragging) {
        console.log(`MouseUp: mode=${editMode}, dragging stopped`);
        isDragging = false;
        
        // В режиме select включаем OrbitControls обратно
        if (editMode === 'select') {
            controls.enabled = true;
        }
        // В других режимах OrbitControls остаются выключенными
        // Пользователь должен сам переключиться в режим select
    }
}

// Обработчик клавиатуры
function onKeyDown(event) {
    switch(event.key) {
        case 'Escape':
            switchToSelectMode();
            break;
        case 'Delete':
            deleteSelectedObject();
            break;
        case 'd':
        case 'D':
            if (event.ctrlKey) {
                event.preventDefault();
                duplicateObject();
            }
            break;
    }
}

// Изменение режима редактирования
function changeEditMode() {
    const selectElement = document.getElementById('editMode');
    if (!selectElement) return;
    
    const newMode = selectElement.value;
    const oldMode = editMode;
    
    console.log(`Смена режима: ${oldMode} -> ${newMode}`);
    
    editMode = newMode;
    
    // Управление OrbitControls
    if (editMode === 'select') {
        controls.enabled = true;
        console.log('OrbitControls: ВКЛЮЧЕНЫ');
    } else {
        controls.enabled = false;
        console.log('OrbitControls: ВЫКЛЮЧЕНЫ');
        
        // Если нет выбранного объекта в режимах трансформации
        if (!selectedObject) {
            alert('⚠️ Выберите объект для трансформации!');
            selectElement.value = 'select';
            editMode = 'select';
            controls.enabled = true;
        }
    }
    
    updateCurrentMode();
}

// Функция для переключения в режим select
function switchToSelectMode() {
    const selectElement = document.getElementById('editMode');
    if (selectElement) {
        selectElement.value = 'select';
        editMode = 'select';
        controls.enabled = true;
        updateCurrentMode();
        console.log('Переключено в режим SELECT (ESC)');
    }
}

// Обновление информации о выбранном объекте
function updateSelectedObjectInfo() {
    const infoElement = document.getElementById('selectedObjectInfo');
    if (!infoElement) return;
    
    if (selectedObject) {
        infoElement.textContent = `${selectedObject.name} (${selectedObject.userData?.type || 'unknown'})`;
        infoElement.style.color = '#4fc3f7';
    } else {
        infoElement.textContent = 'Нет';
        infoElement.style.color = '#888';
    }
}

// Вспомогательные функции
function toggleGrid() {
    if (gridHelper) {
        gridHelper.visible = !gridHelper.visible;
        console.log(`Сетка ${gridHelper.visible ? 'включена' : 'выключена'}`);
    }
}

function toggleAxes() {
    if (axesHelper) {
        axesHelper.visible = !axesHelper.visible;
        console.log(`Оси координат ${axesHelper.visible ? 'включены' : 'выключены'}`);
    }
}

function resetCamera() {
    if (controls) {
        controls.reset();
        camera.position.set(15, 10, 15);
        camera.lookAt(0, 0, 0);
        controls.update();
        console.log('Камера сброшена');
    }
}

function onWindowResize() {
    if (!camera || !renderer) return;
    
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function onDoubleClick(event) {
    if (event.target === renderer.domElement && selectedObject && controls) {
        // Временно включаем OrbitControls для фокуса
        const wasEnabled = controls.enabled;
        controls.enabled = true;
        
        // Фокус на выбранном объекте
        controls.target.copy(selectedObject.position);
        camera.position.copy(selectedObject.position).add(new THREE.Vector3(5, 3, 5));
        controls.update();
        
        // Возвращаем предыдущее состояние контролов
        controls.enabled = wasEnabled;
        console.log(`Двойной клик - фокус на ${selectedObject.name}`);
    }
}

// Сохранение сцены
async function saveScene() {
    if (!objects || objects.length === 0) {
        alert('Сцена пуста. Добавьте объекты перед сохранением.');
        return;
    }
    
    const sceneName = prompt('Введите название сцены:', 
        `Сцена_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}`);
    
    if (!sceneName) return;

    const sceneData = {
        name: sceneName,
        sceneSize: sceneSize,
        objects: objects.map(obj => {
            // Получаем ОРИГИНАЛЬНЫЙ масштаб из userData
            const originalScale = obj.userData?.originalScale || { x: 1, y: 1, z: 1 };
            
            return {
                type: obj.userData?.type || 'unknown',
                name: obj.name,
                position: { 
                    x: parseFloat(obj.position.x.toFixed(3)), 
                    y: parseFloat(obj.position.y.toFixed(3)), 
                    z: parseFloat(obj.position.z.toFixed(3))
                },
                rotation: { 
                    x: parseFloat((obj.rotation.x * (180 / Math.PI)).toFixed(2)), 
                    y: parseFloat((obj.rotation.y * (180 / Math.PI)).toFixed(2)), 
                    z: parseFloat((obj.rotation.z * (180 / Math.PI)).toFixed(2))
                },
                // Сохраняем ОТНОСИТЕЛЬНЫЙ масштаб (текущий / оригинальный)
                scale: { 
                    x: parseFloat((obj.scale.x / originalScale.x).toFixed(3)), 
                    y: parseFloat((obj.scale.y / originalScale.y).toFixed(3)), 
                    z: parseFloat((obj.scale.z / originalScale.z).toFixed(3))
                },
                color: obj.material.color.getHex(),
                opacity: obj.material.opacity,
                userData: {
                    ...obj.userData,
                    // Сохраняем оригинальный масштаб отдельно
                    originalScale: originalScale
                }
            };
        })
    };

    try {
        const response = await fetch('/api/save_scene', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sceneData)
        });

        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Сцена "${sceneName}" успешно сохранена!\nФайл: ${result.filename}`);
        } else {
            alert(`❌ Ошибка при сохранении: ${result.error}`);
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('❌ Ошибка сети при сохранении сцены.\nУбедитесь, что сервер Flask запущен.');
    }
}

async function loadScene() {
    try {
        console.log('Начинаем загрузку сцены...');
        
        const response = await fetch('/api/list_scenes');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.scenes || result.scenes.length === 0) {
            alert('Нет сохраненных сцен');
            return;
        }
        
        console.log('Получены сцены:', result.scenes);
        
        // Создаем простой диалог выбора через prompt
        let sceneList = 'Выберите сцену для загрузки:\n\n';
        result.scenes.forEach((scene, index) => {
            sceneList += `${index + 1}. ${scene.name} (${scene.objects_count} объектов, создана: ${scene.created})\n`;
        });
        
        const choice = prompt(`${sceneList}\n\nВведите номер сцены (1-${result.scenes.length}):`);
        if (choice === null) return; // Пользователь нажал отмена
        
        const index = parseInt(choice) - 1;
        
        if (isNaN(index) || index < 0 || index >= result.scenes.length) {
            alert('Неверный выбор');
            return;
        }
        
        const selectedScene = result.scenes[index];
        
        if (!confirm(`Загрузить сцену "${selectedScene.name}"?\nТекущая сцена будет потеряна.`)) {
            return;
        }
        
        // Показываем индикатор загрузки
        const originalButtonText = 'Загрузка...';
        const originalButton = event?.target;
        if (originalButton) {
            originalButton.textContent = 'Загрузка...';
            originalButton.disabled = true;
        }
        
        // Загружаем выбранную сцену
        console.log('Загружаем сцену:', selectedScene.filename);
        const loadResponse = await fetch('/api/load_scene', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: selectedScene.filename })
        });
        
        if (!loadResponse.ok) {
            throw new Error(`HTTP error! status: ${loadResponse.status}`);
        }
        
        const loadResult = await loadResponse.json();
        
        console.log('Результат загрузки:', loadResult);
        
        if (loadResult.success) {
            loadSceneData(loadResult.scene);
            alert(`✅ Сцена "${selectedScene.name}" успешно загружена!`);
        } else {
            alert(`❌ Ошибка при загрузке: ${loadResult.error}`);
        }
        
    } catch (error) {
        console.error('Load scene error:', error);
        alert(`❌ Ошибка при загрузке сцены: ${error.message}\n\nПроверьте:\n1. Сервер Flask запущен\n2. API эндпоинты работают\n3. Файлы сцен существуют в папке saved_scenes/`);
    } finally {
        // Восстанавливаем кнопку
        const originalButton = event?.target;
        if (originalButton) {
            originalButton.textContent = 'Загрузить сцену';
            originalButton.disabled = false;
        }
    }
}

// Загрузка сцены
function loadSceneData(sceneData) {
    console.log('Загружаем данные сцены:', sceneData);
    
    // Сохраняем текущий контейнер
    const container = document.getElementById('scene-container');
    if (!container) {
        console.error('Контейнер не найден!');
        return;
    }
    
    // Удаляем старый рендерер
    if (renderer && renderer.domElement) {
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
    }
    
    // Сбрасываем все
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    gridHelper = null;
    axesHelper = null;
    
    // Устанавливаем размер сцены
    sceneSize = sceneData.sceneSize || { width: 10, height: 10, depth: 10 };
    
    // Сбрасываем объекты
    objects = [];
    selectedObject = null;
    
    // Обновляем UI
    updateObjectsList();
    updateSelectedObjectInfo();
    clearTransformControls();
    
    // Инициализация новой сцены
    setTimeout(() => {
        try {
            console.log('Инициализируем новую сцену с размером:', sceneSize);
            init3DScene();
            
            // Загружаем объекты
            if (sceneData.objects && Array.isArray(sceneData.objects)) {
                console.log(`Загружаем ${sceneData.objects.length} объектов`);
                
                sceneData.objects.forEach((objData, index) => {
                    console.log(`Объект ${index}:`, objData);
                    
                    let geometry, material, mesh;
                    
                    // Получаем оригинальный масштаб из сохраненных данных
                    const originalScale = objData.userData?.originalScale || { x: 1, y: 1, z: 1 };
                    
                    // Получаем относительный масштаб из сохраненных данных
                    const relativeScale = objData.scale || { x: 1, y: 1, z: 1 };
                    
                    console.log(`Объект ${index} - Оригинальный масштаб:`, originalScale);
                    console.log(`Объект ${index} - Относительный масштаб:`, relativeScale);
                    
                    // Создаем геометрию в зависимости от типа с ОРИГИНАЛЬНЫМИ размерами
                    switch(objData.type) {
                        case 'cube':
                            geometry = new THREE.BoxGeometry(
                                originalScale.x,
                                originalScale.y,
                                originalScale.z
                            );
                            break;
                        case 'sphere':
                            geometry = new THREE.SphereGeometry(
                                originalScale.x * 0.5,
                                32,
                                32
                            );
                            break;
                        case 'cylinder':
                            geometry = new THREE.CylinderGeometry(
                                originalScale.x * 0.5,
                                originalScale.x * 0.5,
                                originalScale.y,
                                32
                            );
                            break;
                        case 'cone':
                            geometry = new THREE.ConeGeometry(
                                originalScale.x * 0.5,
                                originalScale.y,
                                32
                            );
                            break;
                        case 'torus':
                            geometry = new THREE.TorusGeometry(
                                originalScale.x * 0.5,
                                originalScale.x * 0.2,
                                16,
                                100
                            );
                            break;
                        case 'plane':
                            geometry = new THREE.PlaneGeometry(
                                originalScale.x,
                                originalScale.z
                            );
                            break;
                        default:
                            geometry = new THREE.BoxGeometry(1, 1, 1);
                            console.warn(`Неизвестный тип объекта: ${objData.type}, создан куб`);
                    }
                    
                    // Создаем материал
                    material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(objData.color),
                        opacity: objData.opacity || 1,
                        transparent: (objData.opacity || 1) < 1,
                        metalness: 0.3,
                        roughness: 0.4
                    });
                    
                    // Создаем mesh
                    mesh = new THREE.Mesh(geometry, material);
                    mesh.name = objData.name;
                    
                    // Устанавливаем позицию
                    mesh.position.set(
                        objData.position.x,
                        objData.position.y,
                        objData.position.z
                    );
                    
                    // Устанавливаем вращение (конвертируем из градусов в радианы)
                    mesh.rotation.set(
                        objData.rotation.x * (Math.PI / 180),
                        objData.rotation.y * (Math.PI / 180),
                        objData.rotation.z * (Math.PI / 180)
                    );
                    
                    // Устанавливаем РЕАЛЬНЫЙ масштаб: оригинальный * относительный
                    mesh.scale.set(
                        relativeScale.x,
                        relativeScale.y,
                        relativeScale.z
                    );
                    
                    // Сохраняем пользовательские данные с оригинальным масштабом
                    mesh.userData = {
                        type: objData.type,
                        originalScale: originalScale,
                        ...(objData.userData || {})
                    };
                    
                    // Удаляем originalScale из userData.userData если он там есть
                    if (mesh.userData.userData && mesh.userData.userData.originalScale) {
                        delete mesh.userData.userData.originalScale;
                    }
                    
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    
                    // Добавляем на сцену
                    scene.add(mesh);
                    objects.push(mesh);
                    
                    console.log(`Объект "${mesh.name}" загружен:`, {
                        position: mesh.position,
                        scale: mesh.scale,
                        originalScale: originalScale,
                        relativeScale: relativeScale,
                        userData: mesh.userData
                    });
                });
                
                // Выбираем первый объект если есть
                if (objects.length > 0) {
                    selectObject(objects[0]);
                    console.log('Выбран первый объект:', objects[0].name);
                }
                
                console.log(`Всего загружено объектов: ${objects.length}`);
            } else {
                console.log('Нет объектов для загрузки');
            }
            
        } catch (error) {
            console.error('Error loading scene data:', error);
            alert('❌ Ошибка при загрузке данных сцены: ' + error.message);
        }
    }, 100);
}

// Экспорт сцены
async function exportScene() {
    if (!objects || objects.length === 0) {
        alert('Нет объектов для экспорта');
        return;
    }
    
    const format = prompt('Выберите формат экспорта (obj/stl/ply):', 'obj')?.toLowerCase()?.trim();
    
    if (!format || !['obj', 'stl', 'ply'].includes(format)) {
        alert('Неверный формат. Доступные форматы: obj, stl, ply');
        return;
    }
    
    const sceneData = {
        sceneSize: sceneSize,
        objects: objects.map(obj => ({
            type: obj.userData?.type || 'unknown',
            name: obj.name,
            position: { 
                x: obj.position.x, 
                y: obj.position.y, 
                z: obj.position.z 
            },
            rotation: { 
                x: obj.rotation.x * (180 / Math.PI), 
                y: obj.rotation.y * (180 / Math.PI), 
                z: obj.rotation.z * (180 / Math.PI) 
            },
            scale: { 
                x: obj.scale.x, 
                y: obj.scale.y, 
                z: obj.scale.z 
            },
            color: obj.material.color.getHex(),
            opacity: obj.material.opacity
        }))
    };
    
    try {
        const response = await fetch(`/api/export_scene?format=${format}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sceneData)
        });
        
        if (response.ok) {
            // Получаем blob
            const blob = await response.blob();
            
            if (blob.size === 0) {
                throw new Error('Получен пустой файл');
            }
            
            // Создаем ссылку для скачивания
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `scene_${new Date().toISOString().slice(0,19).replace(/[:]/g, '-')}.${format}`;
            document.body.appendChild(a);
            a.click();
            
            // Очищаем
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                alert(`✅ Сцена успешно экспортирована в формате ${format.toUpperCase()}!`);
            }, 100);
            
        } else {
            let errorMessage = `Ошибка ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                // Не удалось распарсить JSON
            }
            throw new Error(errorMessage);
        }
        
    } catch (error) {
        console.error('Export error:', error);
        alert(`❌ Ошибка при экспорте: ${error.message}`);
    }
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    try {
        init3DScene();
        updateSelectedObjectInfo();
        updateCurrentMode();
        
        console.log('🎮 3D редактор инициализирован');
        console.log('📝 Режимы работы:');
        console.log('   SELECT - выбор объектов, управление камерой');
        console.log('   MOVE - перемещение объектов (зажать ЛКМ и двигать)');
        console.log('   ROTATE - вращение объектов (зажать ЛКМ и двигать)');
        console.log('   SCALE - масштабирование объектов (зажать ЛКМ и двигать)');
        console.log('🔄 Горячие клавиши:');
        console.log('   ESC - переключение в режим SELECT');
        console.log('   DELETE - удалить выбранный объект');
        console.log('   CTRL+D - дублировать объект');
        console.log('🎯 Двойной клик по объекту - фокус камеры');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации 3D редактора:', error);
        alert('❌ Ошибка инициализации 3D редактора: ' + error.message);
    }
});

// Функция для отладки
function debugScene() {
    console.log('=== 🐞 DEBUG INFO ===');
    console.log('Scene:', scene ? 'OK' : 'NULL');
    console.log('Camera:', camera ? 'OK' : 'NULL');
    console.log('Controls:', controls ? (controls.enabled ? 'ENABLED' : 'DISABLED') : 'NULL');
    console.log('Objects count:', objects.length);
    console.log('Selected object:', selectedObject ? selectedObject.name : 'None');
    console.log('Edit mode:', editMode);
    console.log('Is dragging:', isDragging);
    
    // Детальная информация о масштабах объектов
    console.log('--- Масштабы объектов ---');
    objects.forEach((obj, i) => {
        const originalScale = obj.userData?.originalScale || { x: 1, y: 1, z: 1 };
        console.log(`${i}. ${obj.name}:`);
        console.log(`   Текущий: ${obj.scale.x.toFixed(2)}, ${obj.scale.y.toFixed(2)}, ${obj.scale.z.toFixed(2)}`);
        console.log(`   Оригинальный: ${originalScale.x}, ${originalScale.y}, ${originalScale.z}`);
        console.log(`   Относительный: ${(obj.scale.x / originalScale.x).toFixed(2)}, ${(obj.scale.y / originalScale.y).toFixed(2)}, ${(obj.scale.z / originalScale.z).toFixed(2)}`);
    });
    console.log('=== DEBUG END ===');
}


// Тестовая функция для проверки работы API
async function testSceneLoading() {
    console.log('=== ТЕСТ ЗАГРУЗКИ СЦЕН ===');
    
    try {
        // 1. Проверяем список сцен
        console.log('1. Запрашиваем список сцен...');
        const listResponse = await fetch('/api/list_scenes');
        console.log('Статус ответа:', listResponse.status);
        
        if (!listResponse.ok) {
            console.error('Ошибка при запросе списка сцен:', listResponse.statusText);
            return;
        }
        
        const listData = await listResponse.json();
        console.log('Данные списка сцен:', listData);
        
        if (!listData.success) {
            console.error('API вернуло ошибку:', listData.error);
            return;
        }
        
        console.log(`Найдено сцен: ${listData.scenes?.length || 0}`);
        
        if (listData.scenes && listData.scenes.length > 0) {
            // 2. Проверяем загрузку первой сцены
            const testScene = listData.scenes[0];
            console.log(`2. Тестируем загрузку сцены "${testScene.name}"...`);
            
            const loadResponse = await fetch('/api/load_scene', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: testScene.filename })
            });
            
            console.log('Статус загрузки:', loadResponse.status);
            
            if (!loadResponse.ok) {
                console.error('Ошибка при загрузке сцены:', loadResponse.statusText);
                return;
            }
            
            const loadData = await loadResponse.json();
            console.log('Данные загруженной сцены:', loadData);
            
            if (loadData.success) {
                console.log('✅ Тест пройден! API работает корректно.');
                console.log('Сцена содержит объектов:', loadData.scene?.objects?.length || 0);
                return true;
            } else {
                console.error('❌ Ошибка при загрузке сцены:', loadData.error);
                return false;
            }
        } else {
            console.log('⚠️ Нет сохраненных сцен для теста');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании:', error);
        return false;
    }
}

// Экспортируем для отладки через консоль
window.testSceneLoading = testSceneLoading;

// Экспортируем для отладки
window.debugScene = debugScene;
window.objects = objects;
window.selectedObject = selectedObject;
window.editMode = editMode;