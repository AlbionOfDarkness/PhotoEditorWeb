// Дополнительные инструменты для работы со сложными фигурами и трансформациями
const SVGTools = {
    // Создание звезды с параметрами
    createStar: function(cx, cy, spikes = 5, outerRadius = 50, innerRadius = 25) {
        let points = '';
        let angle = Math.PI / spikes;

        for (let i = 0; i < spikes * 2; i++) {
            let radius = i % 2 === 0 ? outerRadius : innerRadius;
            let x = cx + radius * Math.sin(i * angle);
            let y = cy - radius * Math.cos(i * angle);
            points += `${x},${y} `;
        }

        return points.trim();
    },

    // Создание многоугольника
    createRegularPolygon: function(cx, cy, sides = 6, radius = 50) {
        let points = '';
        let angle = (2 * Math.PI) / sides;

        for (let i = 0; i < sides; i++) {
            let x = cx + radius * Math.cos(i * angle - Math.PI / 2);
            let y = cy + radius * Math.sin(i * angle - Math.PI / 2);
            points += `${x},${y} `;
        }

        return points.trim();
    },

    // Создание кривой Безье
    createBezierPath: function(points, closed = false) {
        if (points.length < 2) return '';

        let d = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length; i++) {
            const prev = points[i-1];
            const curr = points[i];

            // Создаем контрольные точки для плавной кривой
            const cp1x = prev.x + (curr.x - prev.x) * 0.3;
            const cp1y = prev.y;
            const cp2x = curr.x - (curr.x - prev.x) * 0.3;
            const cp2y = curr.y;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        }

        if (closed && points.length >= 3) {
            // Замыкаем путь
            const first = points[0];
            const last = points[points.length - 1];

            const cp1x = last.x + (first.x - last.x) * 0.3;
            const cp1y = last.y;
            const cp2x = first.x - (first.x - last.x) * 0.3;
            const cp2y = first.y;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${first.x} ${first.y} Z`;
        }

        return d;
    },

    // Анимационные эффекты
    applyPulseAnimation: function(element, duration = 1) {
        const animation = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animation.setAttribute('attributeName', 'opacity');
        animation.setAttribute('values', '1;0.5;1');
        animation.setAttribute('dur', `${duration}s`);
        animation.setAttribute('repeatCount', 'indefinite');
        element.appendChild(animation);
    },

    applyRotationAnimation: function(element, duration = 2) {
        const transform = element.getAttribute('transform') || '';
        const animation = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
        animation.setAttribute('attributeName', 'transform');
        animation.setAttribute('type', 'rotate');
        animation.setAttribute('from', '0');
        animation.setAttribute('to', '360');
        animation.setAttribute('dur', `${duration}s`);
        animation.setAttribute('repeatCount', 'indefinite');
        animation.setAttribute('additive', 'sum');
        element.appendChild(animation);
    },

    // Трансформации объектов
    applyTransformation: function(element, transformData) {
        let transform = '';

        if (transformData.translateX !== 0 || transformData.translateY !== 0) {
            transform += `translate(${transformData.translateX}, ${transformData.translateY}) `;
        }

        if (transformData.rotate !== 0) {
            const bbox = element.getBBox();
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;
            transform += `rotate(${transformData.rotate}, ${centerX}, ${centerY}) `;
        }

        if (transformData.scaleX !== 1 || transformData.scaleY !== 1) {
            transform += `scale(${transformData.scaleX}, ${transformData.scaleY}) `;
        }

        if (transformData.skewX !== 0 || transformData.skewY !== 0) {
            if (transformData.skewX !== 0) transform += `skewX(${transformData.skewX}) `;
            if (transformData.skewY !== 0) transform += `skewY(${transformData.skewY}) `;
        }

        if (transform) {
            // Сохраняем существующие трансформации
            const existingTransform = element.getAttribute('transform') || '';
            element.setAttribute('transform', existingTransform + ' ' + transform.trim());
        }
    },

    // Отражение объектов
    applyReflection: function(element, axis = 'x') {
        const bbox = element.getBBox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;

        let transform = element.getAttribute('transform') || '';

        if (axis === 'x') {
            transform += ` scale(-1, 1) translate(${-2 * centerX}, 0)`;
        } else {
            transform += ` scale(1, -1) translate(0, ${-2 * centerY})`;
        }

        element.setAttribute('transform', transform.trim());
    },

    // Текст по пути
    createTextOnPath: function(text, pathElement, fontSize = 24, fontFamily = 'Arial') {
        const ns = 'http://www.w3.org/2000/svg';

        // Создаем текстовый элемент
        const textElement = document.createElementNS(ns, 'text');
        textElement.setAttribute('font-size', fontSize);
        textElement.setAttribute('font-family', fontFamily);
        textElement.setAttribute('fill', '#000000');

        // Создаем textPath
        const textPath = document.createElementNS(ns, 'textPath');
        textPath.setAttribute('href', `#${pathElement.id}`);
        textPath.textContent = text;

        textElement.appendChild(textPath);
        return textElement;
    },

    // Конвертация текста в контуры (упрощенная версия)
    convertTextToPath: function(textElement) {
        const ns = 'http://www.w3.org/2000/svg';
        const text = textElement.textContent;
        const x = parseFloat(textElement.getAttribute('x')) || 0;
        const y = parseFloat(textElement.getAttribute('y')) || 0;
        const fontSize = parseFloat(textElement.getAttribute('font-size')) || 24;

        // Создаем группу для букв
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('transform', `translate(${x}, ${y})`);
        group.setAttribute('class', 'vector-object');

        // Создаем простые прямоугольники для каждой буквы
        for (let i = 0; i < text.length; i++) {
            const letter = text[i];
            const rect = document.createElementNS(ns, 'rect');

            rect.setAttribute('x', i * fontSize * 0.6);
            rect.setAttribute('y', -fontSize * 0.8);
            rect.setAttribute('width', fontSize * 0.5);
            rect.setAttribute('height', fontSize);
            rect.setAttribute('fill', textElement.getAttribute('fill') || '#000000');
            rect.setAttribute('stroke', textElement.getAttribute('stroke') || 'none');
            rect.setAttribute('stroke-width', textElement.getAttribute('stroke-width') || 0);
            rect.setAttribute('class', 'vector-object');

            group.appendChild(rect);
        }

        return group;
    },

    // Создание градиентов
    createLinearGradient: function(id, x1, y1, x2, y2, stops) {
        const ns = 'http://www.w3.org/2000/svg';
        const gradient = document.createElementNS(ns, 'linearGradient');

        gradient.id = id;
        gradient.setAttribute('x1', x1);
        gradient.setAttribute('y1', y1);
        gradient.setAttribute('x2', x2);
        gradient.setAttribute('y2', y2);

        stops.forEach(stop => {
            const stopElement = document.createElementNS(ns, 'stop');
            stopElement.setAttribute('offset', stop.offset);
            stopElement.setAttribute('stop-color', stop.color);
            if (stop.opacity) {
                stopElement.setAttribute('stop-opacity', stop.opacity);
            }
            gradient.appendChild(stopElement);
        });

        return gradient;
    },

    createRadialGradient: function(id, cx, cy, r, stops) {
        const ns = 'http://www.w3.org/2000/svg';
        const gradient = document.createElementNS(ns, 'radialGradient');

        gradient.id = id;
        gradient.setAttribute('cx', cx);
        gradient.setAttribute('cy', cy);
        gradient.setAttribute('r', r);

        stops.forEach(stop => {
            const stopElement = document.createElementNS(ns, 'stop');
            stopElement.setAttribute('offset', stop.offset);
            stopElement.setAttribute('stop-color', stop.color);
            if (stop.opacity) {
                stopElement.setAttribute('stop-opacity', stop.opacity);
            }
            gradient.appendChild(stopElement);
        });

        return gradient;
    },

    // Создание паттернов
    createPattern: function(id, width, height, patternUnits, patternContent) {
        const ns = 'http://www.w3.org/2000/svg';
        const pattern = document.createElementNS(ns, 'pattern');

        pattern.id = id;
        pattern.setAttribute('width', width);
        pattern.setAttribute('height', height);
        pattern.setAttribute('patternUnits', patternUnits);

        // Добавляем содержимое паттерна
        if (typeof patternContent === 'function') {
            patternContent(pattern);
        } else if (patternContent) {
            pattern.appendChild(patternContent.cloneNode(true));
        }

        return pattern;
    },

    // Фильтры SVG
    createBlurFilter: function(id, stdDeviation = 2) {
        const ns = 'http://www.w3.org/2000/svg';
        const filter = document.createElementNS(ns, 'filter');

        filter.id = id;

        const blur = document.createElementNS(ns, 'feGaussianBlur');
        blur.setAttribute('stdDeviation', stdDeviation);

        filter.appendChild(blur);
        return filter;
    },

    createDropShadowFilter: function(id, dx = 2, dy = 2, stdDeviation = 2, color = 'rgba(0,0,0,0.5)') {
        const ns = 'http://www.w3.org/2000/svg';
        const filter = document.createElementNS(ns, 'filter');

        filter.id = id;

        const dropShadow = document.createElementNS(ns, 'feDropShadow');
        dropShadow.setAttribute('dx', dx);
        dropShadow.setAttribute('dy', dy);
        dropShadow.setAttribute('stdDeviation', stdDeviation);
        dropShadow.setAttribute('flood-color', color);

        filter.appendChild(dropShadow);
        return filter;
    },

    createGlowFilter: function(id, stdDeviation = 5, color = '#00ff00') {
        const ns = 'http://www.w3.org/2000/svg';
        const filter = document.createElementNS(ns, 'filter');

        filter.id = id;

        // Создаем свечение
        const feColorMatrix = document.createElementNS(ns, 'feColorMatrix');
        feColorMatrix.setAttribute('type', 'matrix');
        feColorMatrix.setAttribute('values', '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0');

        const feGaussianBlur = document.createElementNS(ns, 'feGaussianBlur');
        feGaussianBlur.setAttribute('stdDeviation', stdDeviation);
        feGaussianBlur.setAttribute('result', 'coloredBlur');

        const feMerge = document.createElementNS(ns, 'feMerge');
        const feMergeNode1 = document.createElementNS(ns, 'feMergeNode');
        feMergeNode1.setAttribute('in', 'coloredBlur');
        const feMergeNode2 = document.createElementNS(ns, 'feMergeNode');
        feMergeNode2.setAttribute('in', 'SourceGraphic');

        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);

        filter.appendChild(feColorMatrix);
        filter.appendChild(feGaussianBlur);
        filter.appendChild(feMerge);

        return filter;
    },

    // Выравнивание объектов
    alignObjects: function(objects, alignment, axis = 'x') {
        if (objects.length < 2) return;

        let reference = null;

        // Находим опорное значение
        objects.forEach(obj => {
            const bbox = obj.getBBox();
            let value;

            if (axis === 'x') {
                switch(alignment) {
                    case 'left': value = bbox.x; break;
                    case 'center': value = bbox.x + bbox.width / 2; break;
                    case 'right': value = bbox.x + bbox.width; break;
                }
            } else {
                switch(alignment) {
                    case 'top': value = bbox.y; break;
                    case 'middle': value = bbox.y + bbox.height / 2; break;
                    case 'bottom': value = bbox.y + bbox.height; break;
                }
            }

            if (reference === null) {
                reference = value;
            } else {
                if (alignment === 'left' || alignment === 'top') {
                    reference = Math.min(reference, value);
                } else if (alignment === 'right' || alignment === 'bottom') {
                    reference = Math.max(reference, value);
                } else if (alignment === 'center' || alignment === 'middle') {
                    reference = (reference + value) / 2;
                }
            }
        });

        // Применяем выравнивание
        objects.forEach(obj => {
            const bbox = obj.getBBox();

            if (axis === 'x') {
                let deltaX = 0;

                switch(alignment) {
                    case 'left':
                        deltaX = reference - bbox.x;
                        break;
                    case 'center':
                        deltaX = reference - (bbox.x + bbox.width / 2);
                        break;
                    case 'right':
                        deltaX = reference - (bbox.x + bbox.width);
                        break;
                }

                if (deltaX !== 0) {
                    this.moveObject(obj, deltaX, 0);
                }
            } else {
                let deltaY = 0;

                switch(alignment) {
                    case 'top':
                        deltaY = reference - bbox.y;
                        break;
                    case 'middle':
                        deltaY = reference - (bbox.y + bbox.height / 2);
                        break;
                    case 'bottom':
                        deltaY = reference - (bbox.y + bbox.height);
                        break;
                }

                if (deltaY !== 0) {
                    this.moveObject(obj, 0, deltaY);
                }
            }
        });
    },

    // Распределение объектов
    distributeObjects: function(objects, direction) {
        if (objects.length < 3) return;

        // Сортируем объекты
        const sortedObjects = [...objects].sort((a, b) => {
            const bboxA = a.getBBox();
            const bboxB = b.getBBox();

            if (direction === 'horizontal') {
                return bboxA.x - bboxB.x;
            } else {
                return bboxA.y - bboxB.y;
            }
        });

        // Вычисляем общее пространство
        const firstBBox = sortedObjects[0].getBBox();
        const lastBBox = sortedObjects[sortedObjects.length - 1].getBBox();

        let totalSpace, elementSizes = [];

        if (direction === 'horizontal') {
            totalSpace = lastBBox.x + lastBBox.width - firstBBox.x;

            sortedObjects.forEach(obj => {
                elementSizes.push(obj.getBBox().width);
            });
        } else {
            totalSpace = lastBBox.y + lastBBox.height - firstBBox.y;

            sortedObjects.forEach(obj => {
                elementSizes.push(obj.getBBox().height);
            });
        }

        // Вычитаем размеры элементов
        const totalElementSize = elementSizes.reduce((sum, size) => sum + size, 0);
        const spacing = (totalSpace - totalElementSize) / (sortedObjects.length - 1);

        // Распределяем объекты
        let currentPosition = direction === 'horizontal' ? firstBBox.x : firstBBox.y;

        sortedObjects.forEach((obj, index) => {
            const bbox = obj.getBBox();

            if (direction === 'horizontal') {
                const deltaX = currentPosition - bbox.x;
                this.moveObject(obj, deltaX, 0);
                currentPosition += bbox.width + spacing;
            } else {
                const deltaY = currentPosition - bbox.y;
                this.moveObject(obj, 0, deltaY);
                currentPosition += bbox.height + spacing;
            }
        });
    },

    moveObject: function(element, deltaX, deltaY) {
        const tag = element.tagName.toLowerCase();

        switch(tag) {
            case 'rect':
                const x = parseFloat(element.getAttribute('x')) + deltaX;
                const y = parseFloat(element.getAttribute('y')) + deltaY;
                element.setAttribute('x', x);
                element.setAttribute('y', y);
                break;

            case 'circle':
            case 'ellipse':
                const cx = parseFloat(element.getAttribute('cx')) + deltaX;
                const cy = parseFloat(element.getAttribute('cy')) + deltaY;
                element.setAttribute('cx', cx);
                element.setAttribute('cy', cy);
                break;

            case 'text':
                const tx = parseFloat(element.getAttribute('x')) + deltaX;
                const ty = parseFloat(element.getAttribute('y')) + deltaY;
                element.setAttribute('x', tx);
                element.setAttribute('y', ty);
                break;

            case 'polygon':
            case 'polyline':
                const points = element.getAttribute('points').split(' ').map(p => {
                    const [px, py] = p.split(',').map(Number);
                    return `${px + deltaX},${py + deltaY}`;
                }).join(' ');
                element.setAttribute('points', points);
                break;

            case 'g':
                // Для групп перемещаем все дочерние элементы
                Array.from(element.children).forEach(child => {
                    this.moveObject(child, deltaX, deltaY);
                });
                break;

            case 'image':
                const imgX = parseFloat(element.getAttribute('x')) + deltaX;
                const imgY = parseFloat(element.getAttribute('y')) + deltaY;
                element.setAttribute('x', imgX);
                element.setAttribute('y', imgY);
                break;
        }
    },

    // Обрезка объектов
    clipObject: function(element, clipPath) {
        const ns = 'http://www.w3.org/2000/svg';

        // Создаем элемент clipPath
        const clip = document.createElementNS(ns, 'clipPath');
        clip.id = `clip-${Date.now()}`;
        clip.appendChild(clipPath.cloneNode(true));

        // Применяем обрезку
        element.setAttribute('clip-path', `url(#${clip.id})`);

        return clip;
    },

    // Маскирование объектов
    maskObject: function(element, maskElement) {
        const ns = 'http://www.w3.org/2000/svg';

        // Создаем элемент mask
        const mask = document.createElementNS(ns, 'mask');
        mask.id = `mask-${Date.now()}`;
        mask.appendChild(maskElement.cloneNode(true));

        // Применяем маску
        element.setAttribute('mask', `url(#${mask.id})`);

        return mask;
    },

    // Создание сложных форм
    createSpiral: function(cx, cy, revolutions = 3, maxRadius = 100, precision = 0.1) {
        let d = `M ${cx} ${cy}`;

        for (let angle = 0; angle <= revolutions * 2 * Math.PI; angle += precision) {
            const radius = (angle / (revolutions * 2 * Math.PI)) * maxRadius;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            d += ` L ${x} ${y}`;
        }

        return d;
    },

    createHeart: function(cx, cy, size = 50) {
        const d = `
            M ${cx}, ${cy}
            C ${cx + size}, ${cy - size * 0.7},
              ${cx + size * 1.5}, ${cy - size * 0.2},
              ${cx}, ${cy + size}
            C ${cx - size * 1.5}, ${cy - size * 0.2},
              ${cx - size}, ${cy - size * 0.7},
              ${cx}, ${cy}
            Z
        `;

        return d;
    },

    // Преобразование растрового изображения в вектор (упрощенное)
    traceImage: function(imageElement, threshold = 128) {
        const ns = 'http://www.w3.org/2000/svg';
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('class', 'vector-object traced-image');

        // Создаем простой контур вокруг изображения
        const x = parseFloat(imageElement.getAttribute('x')) || 0;
        const y = parseFloat(imageElement.getAttribute('y')) || 0;
        const width = parseFloat(imageElement.getAttribute('width')) || 200;
        const height = parseFloat(imageElement.getAttribute('height')) || 150;

        // Создаем прямоугольный контур
        const path = document.createElementNS(ns, 'path');
        const d = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#000000');
        path.setAttribute('stroke-width', '2');

        group.appendChild(path);
        return group;
    }
};

// Экспортируем объект
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SVGTools;
} else {
    window.SVGTools = SVGTools;
}