from datetime import datetime

from PIL.Image import Image
from flask import Flask, render_template, redirect, url_for, request, send_file
from os import makedirs
import cv2
import numpy as np
from flask import jsonify, session
import json
import svgwrite
import xml.etree.ElementTree as ET
import base64
from io import BytesIO
import PIL
import traceback

# Flask - библиотека для запуска нашего приложения Flask - app
# render_template - нужен для то чтобы ваша страница html отобразилась корреткно
# redirect - нам понадобится для обработки запросы формы где мы перенаприм пользователя на страницу админ панели
# url_for - вспомогательна библиотека для того чтобы сделать правильный переход по ссылке в нашем случеш мы будем ссылаться на adm_panel
# request - обработчик запросов GET/POST и дргуих 

def get_actual_index(error = ""):
  index = "index.html"
  context = {}
  if top_option != "":
    context["option_top_div"] = top_option
  if path_to_current_image != "":
    context["content"] = "contents/image_display.html"
    context["image_path"] = path_to_current_image
  if error != "":
    context["error"] = error
  return render_template(index, **context)

app = Flask(__name__)

path_to_current_image = "" # для выбранной пользователем картикни
top_option = "" # для выбранной опции меню
UPLOAD_PATH = "static/uploads/"

@app.route('/')
def index():
    return get_actual_index()

@app.route('/choose_option')
def choose_option():
    global top_option
    # Получаем GET-параметр 'file'
    top_option = request.args.get('file')  # вернет None, если параметр отсутствует

    if top_option == "":
        return get_actual_index(error="Файл не указан!")

    return get_actual_index()

@app.route('/load', methods=['POST'])
def load():
  global path_to_current_image
  if request.method == 'POST':
    makedirs(UPLOAD_PATH, exist_ok=True)
    # Получаем файл из формы
    file = request.files.get('file')
    if file:
      path_to_current_image = f"{UPLOAD_PATH}{file.filename}"
      file.save(path_to_current_image)
      return get_actual_index()
    return get_actual_index(error="Не удалось загрузить файл!")

@app.route('/download', methods=['GET'])
def download_file():
  global path_to_current_image
  if (path_to_current_image != ""):

    image = cv2.imread(path_to_current_image)
    format = request.args.get('format') 
    quality = request.args.get('quality')
    quality = int(quality) 
    
    params = []
    if format == 'jpeg':
      params = [cv2.IMWRITE_JPEG_QUALITY, quality]
    file_ext = f".{format}"
    
    uload_path = UPLOAD_PATH + "/yourPic" + file_ext
    buffer = cv2.imwrite(uload_path, image, params)

    return send_file(
        uload_path,
        as_attachment=True
    )
  return get_actual_index(error="Нет рабочего изображения, загрузите изображение")

@app.route('/brightcontr', methods=['POST'])
def brightcontr():
    global path_to_current_image
    img = cv2.imread(path_to_current_image)
    alpha = float(request.form.get('contrast'))
    beta = float(request.form.get('brightness'))  # контраст
    img_contrast = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

    path_to_current_image = UPLOAD_PATH + "/yourPic.png"
    cv2.imwrite(path_to_current_image, img_contrast)
    return get_actual_index()

@app.route('/mirror', methods=['POST'])
def mirror():
    global path_to_current_image
    if path_to_current_image == "":
        return get_actual_index(error="Нет изображения для обработки!")

    if request.method == 'POST':
        axis = request.form.get('axis')



        if axis not in ['x', 'y', 'both']:
            return get_actual_index(error="Неверно указана ось отражения!")

        image = cv2.imread(path_to_current_image)

        if axis == 'x':
            mirrored_image = cv2.flip(image, 1)
        elif axis == 'y':
            mirrored_image = cv2.flip(image, 0)
        else:  # both
            mirrored_image = cv2.flip(image, -1)

        # Сохраняем результат
        cv2.imwrite(path_to_current_image, mirrored_image)

        return get_actual_index()

    return get_actual_index(error="Ошибка при обработке изображения!")


@app.route('/rotate', methods=['POST'])
def rotate():
    global path_to_current_image
    if path_to_current_image == "":
        return get_actual_index(error="Нет изображения для обработки!")

    if request.method == 'POST':
        # Получаем параметры из формы
        angle = request.form.get('angle')
        center_x = request.form.get('center_x')
        center_y = request.form.get('center_y')
        keep_size = request.form.get('keep_size') == 'on'  # Новый параметр

        if not angle:
            return get_actual_index(error="Угол поворота не указан!")

        try:
            angle = float(angle)
            # Загружаем изображение
            image = cv2.imread(path_to_current_image)
            height, width = image.shape[:2]

            # Определяем центр вращения
            if center_x and center_y:
                try:
                    center_x = float(center_x)
                    center_y = float(center_y)
                    # Если указаны относительные координаты (0-1), преобразуем в абсолютные
                    if center_x <= 1.0 and center_y <= 1.0:
                        center_x = int(center_x * width)
                        center_y = int(center_y * height)
                    else:
                        center_x = int(center_x)
                        center_y = int(center_y)
                except ValueError:
                    return get_actual_index(error="Неверный формат координат центра!")
            else:
                # Центр по умолчанию - центр изображения
                center_x = width // 2
                center_y = height // 2

            # Получаем матрицу поворота
            rotation_matrix = cv2.getRotationMatrix2D((center_x, center_y), angle, 1.0)

            if keep_size:
                # Сохраняем исходные размеры изображения
                rotated_image = cv2.warpAffine(
                    image,
                    rotation_matrix,
                    (width, height),  # Исходные размеры
                    flags=cv2.INTER_LINEAR,
                    borderMode=cv2.BORDER_CONSTANT,
                    borderValue=(255, 255, 255)  # Белый цвет для фона
                )
            else:
                # Вычисляем новые размеры только если угол не кратен 90 градусам
                if angle % 90 == 0:
                    # Для углов, кратных 90 градусам, используем исходные или транспонированные размеры
                    if angle % 180 == 0:
                        new_width, new_height = width, height
                    else:
                        new_width, new_height = height, width
                else:
                    # Только для нестандартных углов вычисляем новые размеры
                    cos_val = abs(rotation_matrix[0, 0])
                    sin_val = abs(rotation_matrix[0, 1])
                    new_width = int((height * sin_val) + (width * cos_val))
                    new_height = int((height * cos_val) + (width * sin_val))

                    # Корректируем матрицу преобразования для учета новых размеров
                    rotation_matrix[0, 2] += (new_width / 2) - center_x
                    rotation_matrix[1, 2] += (new_height / 2) - center_y

                rotated_image = cv2.warpAffine(
                    image,
                    rotation_matrix,
                    (new_width, new_height),
                    flags=cv2.INTER_LINEAR,
                    borderMode=cv2.BORDER_CONSTANT,
                    borderValue=(255, 255, 255)
                )

            # Сохраняем результат
            cv2.imwrite(path_to_current_image, rotated_image)

            return get_actual_index()

        except ValueError:
            return get_actual_index(error="Неверный формат угла поворота!")
        except Exception as e:
            return get_actual_index(error=f"Ошибка при повороте изображения: {str(e)}")

    return get_actual_index(error="Ошибка при обработке изображения!")


@app.route('/color_balance', methods=['POST'])
def color_balance():
    global path_to_current_image
    if path_to_current_image == "":
        return get_actual_index(error="Нет изображения для обработки!")

    if request.method == 'POST':
        try:
            red = float(request.form.get('red', 0))
            green = float(request.form.get('green', 0))
            blue = float(request.form.get('blue', 0))

            image = cv2.imread(path_to_current_image)

            b, g, r = cv2.split(image)

            r = cv2.add(r, int(red * 255))
            g = cv2.add(g, int(green * 255))
            b = cv2.add(b, int(blue * 255))

            balanced_image = cv2.merge([b, g, r])
            cv2.imwrite(path_to_current_image, balanced_image)

            return get_actual_index()

        except Exception as e:
            return get_actual_index(error=f"Ошибка при изменении цветового баланса: {str(e)}")

    return get_actual_index(error="Ошибка при обработке изображения!")


@app.route('/add_noise', methods=['POST'])
def add_noise():
    global path_to_current_image
    if path_to_current_image == "":
        return get_actual_index(error="Нет изображения для обработки!")

    if request.method == 'POST':
        try:
            noise_type = request.form.get('noise_type')
            amount = float(request.form.get('amount', 0.1))

            image = cv2.imread(path_to_current_image)

            if noise_type == 'gaussian':
                mean = 0
                sigma = amount * 255
                gaussian = np.random.normal(mean, sigma, image.shape).astype(np.uint8)
                noisy_image = cv2.add(image, gaussian)
            elif noise_type == 'salt_pepper':
                prob = amount
                noisy_image = np.copy(image)
                salt = np.random.random(image.shape[:2]) < prob / 2
                pepper = np.random.random(image.shape[:2]) < prob / 2
                noisy_image[salt] = 255
                noisy_image[pepper] = 0
            else:
                return get_actual_index(error="Неверный тип шума!")

            cv2.imwrite(path_to_current_image, noisy_image)
            return get_actual_index()

        except Exception as e:
            return get_actual_index(error=f"Ошибка при добавлении шума: {str(e)}")

    return get_actual_index(error="Ошибка при обработке изображения!")


@app.route('/blur', methods=['POST'])
def blur():
    global path_to_current_image
    if path_to_current_image == "":
        return get_actual_index(error="Нет изображения для обработки!")

    if request.method == 'POST':
        try:
            blur_type = request.form.get('blur_type')
            kernel_size = int(request.form.get('kernel_size', 5))

            image = cv2.imread(path_to_current_image)

            if blur_type == 'average':
                blurred = cv2.blur(image, (kernel_size, kernel_size))
            elif blur_type == 'gaussian':
                blurred = cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)
            elif blur_type == 'median':
                blurred = cv2.medianBlur(image, kernel_size)
            else:
                return get_actual_index(error="Неверный тип размытия!")

            cv2.imwrite(path_to_current_image, blurred)
            return get_actual_index()

        except Exception as e:
            return get_actual_index(error=f"Ошибка при размытии: {str(e)}")

    return get_actual_index(error="Ошибка при обработке изображения!")


@app.route('/resize', methods=['POST'])
def resize():
    global path_to_current_image
    if path_to_current_image == "":
        return get_actual_index(error="Нет изображения для обработки!")

    if request.method == 'POST':
        try:
            resize_type = request.form.get('resize_type')
            value = float(request.form.get('value', 1.0))
            method = request.form.get('method', 'auto')

            image = cv2.imread(path_to_current_image)
            height, width = image.shape[:2]

            if resize_type == 'scale':
                new_width = int(width * value)
                new_height = int(height * value)
            else:
                if resize_type == 'width':
                    new_width = int(value)
                    new_height = int(height * (value / width))
                else:
                    new_height = int(value)
                    new_width = int(width * (value / height))

            if method == 'auto':
                if value > 1:
                    method = 'cubic'
                else:
                    method = 'linear'

            if method == 'nearest':
                interpolation = cv2.INTER_NEAREST
            elif method == 'linear':
                interpolation = cv2.INTER_LINEAR
            else:
                interpolation = cv2.INTER_CUBIC

            resized_image = cv2.resize(image, (new_width, new_height), interpolation=interpolation)
            cv2.imwrite(path_to_current_image, resized_image)

            return get_actual_index()

        except Exception as e:
            return get_actual_index(error=f"Ошибка при изменении размера: {str(e)}")

    return get_actual_index(error="Ошибка при обработке изображения!")


@app.route('/crop', methods=['POST'])
def crop():
    global path_to_current_image
    if path_to_current_image == "":
        return get_actual_index(error="Нет изображения для обработки!")

    if request.method == 'POST':
        try:
            crop_type = request.form.get('crop_type')
            image = cv2.imread(path_to_current_image)
            height, width = image.shape[:2]

            if crop_type == 'rectangular':
                x = int(request.form.get('x', 0))
                y = int(request.form.get('y', 0))
                w = int(request.form.get('width', 100))
                h = int(request.form.get('height', 100))

                if x < 0 or y < 0 or w <= 0 or h <= 0:
                    return get_actual_index(error="Координаты и размеры должны быть положительными!")
                if x + w > width or y + h > height:
                    return get_actual_index(error="Область вырезки выходит за пределы изображения!")

                cropped = image[y:y + h, x:x + w]

            elif crop_type == 'freeform':
                points_str = request.form.get('points', '')
                if not points_str:
                    return get_actual_index(error="Не указаны точки для произвольной вырезки!")

                points = []
                for point in points_str.split(';'):
                    if point:
                        x, y = map(int, point.split(','))
                        points.append([x, y])

                if len(points) < 3:
                    return get_actual_index(error="Нужно указать как минимум 3 точки!")

                mask = np.zeros((height, width), dtype=np.uint8)
                points_array = np.array(points, dtype=np.int32)
                cv2.fillPoly(mask, [points_array], 255)

                cropped = cv2.bitwise_and(image, image, mask=mask)

                x, y, w, h = cv2.boundingRect(points_array)
                cropped = cropped[y:y + h, x:x + w]

            else:
                return get_actual_index(error="Неверный тип вырезки!")

            cv2.imwrite(path_to_current_image, cropped)
            return get_actual_index()

        except Exception as e:
            return get_actual_index(error=f"Ошибка при вырезке: {str(e)}")

    return get_actual_index(error="Ошибка при обработке изображения!")



# Инициализация сессии для хранения истории векторных действий
app.secret_key = 'vector_graphics_secret_key'

@app.route('/vector_editor')
def vector_editor():
    return render_template('vector_editor_full.html')



#Создание нового векторного холста
@app.route('/vector/new_canvas', methods=['POST'])
def create_new_vector_canvas():
    try:
        width = float(request.form.get('width', 800))
        height = float(request.form.get('height', 600))
        units = request.form.get('units', 'px')

        # Конвертация единиц измерения
        if units == 'mm':
            width = width * 3.7795275591  # мм в пиксели
            height = height * 3.7795275591
        elif units == 'cm':
            width = width * 37.795275591  # см в пиксели

        # Создание SVG документа
        dwg = svgwrite.Drawing(size=(f"{width}px", f"{height}px"))
        dwg['viewBox'] = f"0 0 {width} {height}"
        dwg['preserveAspectRatio'] = 'xMidYMid meet'

        # Добавляем белый фон
        dwg.add(dwg.rect(insert=(0, 0), size=(f"{width}px", f"{height}px"),
                         fill='white', stroke='none'))

        svg_content = dwg.tostring()

        # Сохраняем в сессии
        session['vector_canvas'] = svg_content
        session['canvas_size'] = {'width': width, 'height': height}
        session['vector_history'] = []
        session['current_vector_step'] = -1

        return jsonify({
            'success': True,
            'svg': svg_content,
            'size': {'width': width, 'height': height}
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

#Импорт SVG файлов
@app.route('/vector/import', methods=['POST'])
def import_vector_file():
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({'success': False, 'error': 'Файл не загружен'}), 400

        # Проверяем расширение
        if not file.filename.lower().endswith('.svg'):
            return jsonify({'success': False, 'error': 'Только SVG файлы'}), 400

        # Читаем содержимое
        svg_content = file.read().decode('utf-8')

        # Парсим SVG для проверки и извлечения информации
        try:
            root = ET.fromstring(svg_content)

            # Проверяем на наличие неподдерживаемых элементов
            unsupported = []
            for elem in root.iter():
                if elem.tag.endswith('image'):  # Растровые изображения
                    unsupported.append({'element': 'image', 'id': elem.get('id', 'unknown')})
                # Можно добавить другие проверки

            # Извлекаем размеры
            width = root.get('width', '800')
            height = root.get('height', '600')

            # Сохраняем в сессии
            session['vector_canvas'] = svg_content
            session['canvas_size'] = {'width': float(width.replace('px', '')),
                                      'height': float(height.replace('px', ''))}
            session['vector_history'] = [svg_content]
            session['current_vector_step'] = 0

            return jsonify({
                'success': True,
                'svg': svg_content,
                'size': {'width': width, 'height': height},
                'warnings': unsupported if unsupported else None
            })

        except ET.ParseError as e:
            return jsonify({'success': False, 'error': f'Ошибка парсинга SVG: {str(e)}'}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

#Добавление векторной фигуры
@app.route('/vector/add_shape', methods=['POST'])
def add_vector_shape():
    try:
        shape_type = request.form.get('type')
        data = json.loads(request.form.get('data', '{}'))

        # Получаем текущий холст из сессии
        current_svg = session.get('vector_canvas', '')

        if not current_svg:
            # Создаем новый холст если его нет
            dwg = svgwrite.Drawing(size=("800px", "600px"))
            dwg['viewBox'] = "0 0 800 600"
            dwg.add(dwg.rect(insert=(0, 0), size=("800px", "600px"),
                             fill='white', stroke='none'))
            current_svg = dwg.tostring()

        # Парсим SVG
        root = ET.fromstring(current_svg)

        # Создаем новый элемент
        new_element = None

        if shape_type == 'rectangle':
            new_element = ET.Element('rect', {
                'x': str(data.get('x', 100)),
                'y': str(data.get('y', 100)),
                'width': str(data.get('width', 200)),
                'height': str(data.get('height', 150)),
                'fill': data.get('fill', '#3498db'),
                'stroke': data.get('stroke', '#2c3e50'),
                'stroke-width': str(data.get('strokeWidth', 2)),
                'rx': str(data.get('rx', 0)),  # скругление углов
                'ry': str(data.get('ry', 0))
            })

        elif shape_type == 'circle':
            new_element = ET.Element('circle', {
                'cx': str(data.get('cx', 200)),
                'cy': str(data.get('cy', 200)),
                'r': str(data.get('r', 50)),
                'fill': data.get('fill', '#e74c3c'),
                'stroke': data.get('stroke', '#c0392b'),
                'stroke-width': str(data.get('strokeWidth', 2))
            })

        elif shape_type == 'ellipse':
            new_element = ET.Element('ellipse', {
                'cx': str(data.get('cx', 200)),
                'cy': str(data.get('cy', 200)),
                'rx': str(data.get('rx', 80)),
                'ry': str(data.get('ry', 50)),
                'fill': data.get('fill', '#2ecc71'),
                'stroke': data.get('stroke', '#27ae60'),
                'stroke-width': str(data.get('strokeWidth', 2))
            })

        elif shape_type == 'line':
            new_element = ET.Element('line', {
                'x1': str(data.get('x1', 100)),
                'y1': str(data.get('y1', 100)),
                'x2': str(data.get('x2', 300)),
                'y2': str(data.get('y2', 300)),
                'stroke': data.get('stroke', '#34495e'),
                'stroke-width': str(data.get('strokeWidth', 3)),
                'stroke-dasharray': data.get('dashArray', '')
            })

        elif shape_type == 'polygon':
            points = data.get('points', [])
            points_str = ' '.join([f"{p[0]},{p[1]}" for p in points])
            new_element = ET.Element('polygon', {
                'points': points_str,
                'fill': data.get('fill', '#9b59b6'),
                'stroke': data.get('stroke', '#8e44ad'),
                'stroke-width': str(data.get('strokeWidth', 2))
            })

        elif shape_type == 'text':
            new_element = ET.Element('text', {
                'x': str(data.get('x', 100)),
                'y': str(data.get('y', 150)),
                'fill': data.get('fill', '#2c3e50'),
                'font-family': data.get('fontFamily', 'Arial'),
                'font-size': str(data.get('fontSize', 24))
            })
            new_element.text = data.get('text', 'Текст')

        if new_element is not None:
            # Добавляем ID для идентификации
            import uuid
            new_element.set('id', f'elem_{uuid.uuid4().hex[:8]}')
            new_element.set('class', 'vector-object')

            # Добавляем в SVG
            root.append(new_element)

            # Обновляем сессию
            new_svg = ET.tostring(root, encoding='unicode')
            session['vector_canvas'] = new_svg

            # Сохраняем в историю
            history = session.get('vector_history', [])
            history.append(new_svg)
            if len(history) > 10:  # Ограничиваем историю 10 шагами
                history.pop(0)
            session['vector_history'] = history
            session['current_vector_step'] = len(history) - 1

            return jsonify({'success': True, 'svg': new_svg})

        return jsonify({'success': False, 'error': 'Неизвестный тип фигуры'}), 400

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

#Обновление свойств векторного объекта
@app.route('/vector/update_shape', methods=['POST'])
def update_vector_shape():
    try:
        element_id = request.form.get('id')
        updates = json.loads(request.form.get('updates', '{}'))

        current_svg = session.get('vector_canvas', '')
        if not current_svg:
            return jsonify({'success': False, 'error': 'Нет активного холста'}), 400

        root = ET.fromstring(current_svg)

        # Ищем элемент по ID
        target_elem = None
        for elem in root.iter():
            if elem.get('id') == element_id:
                target_elem = elem
                break

        if target_elem is None:
            return jsonify({'success': False, 'error': 'Элемент не найден'}), 404

        # Применяем обновления
        for key, value in updates.items():
            target_elem.set(key, str(value))

        # Обновляем сессию
        new_svg = ET.tostring(root, encoding='unicode')
        session['vector_canvas'] = new_svg

        # Добавляем в историю
        history = session.get('vector_history', [])
        history.append(new_svg)
        if len(history) > 10:
            history.pop(0)
        session['vector_history'] = history
        session['current_vector_step'] = len(history) - 1

        return jsonify({'success': True, 'svg': new_svg})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

#Отмена последнего действия
@app.route('/vector/undo', methods=['POST'])
def vector_undo():
    try:
        history = session.get('vector_history', [])
        current_step = session.get('current_vector_step', -1)

        if current_step > 0:
            current_step -= 1
            session['current_vector_step'] = current_step
            session['vector_canvas'] = history[current_step]

            return jsonify({
                'success': True,
                'svg': history[current_step],
                'canUndo': current_step > 0,
                'canRedo': current_step < len(history) - 1
            })

        return jsonify({'success': False, 'error': 'Нечего отменять'}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

#Повтор отмененного действия
@app.route('/vector/redo', methods=['POST'])
def vector_redo():
    try:
        history = session.get('vector_history', [])
        current_step = session.get('current_vector_step', -1)

        if current_step < len(history) - 1:
            current_step += 1
            session['current_vector_step'] = current_step
            session['vector_canvas'] = history[current_step]

            return jsonify({
                'success': True,
                'svg': history[current_step],
                'canUndo': current_step > 0,
                'canRedo': current_step < len(history) - 1
            })

        return jsonify({'success': False, 'error': 'Нечего повторять'}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

#Экспорт векторной графики
@app.route('/vector/export', methods=['POST'])
def export_vector():
    try:
        export_format = request.form.get('format', 'svg')
        svg_content = session.get('vector_canvas', '')

        if not svg_content:
            return jsonify({'success': False, 'error': 'Нет данных для экспорта'}), 400

        if export_format == 'svg':
            # Возвращаем SVG как файл
            return send_file(
                BytesIO(svg_content.encode()),
                mimetype='image/svg+xml',
                as_attachment=True,
                download_name='vector_image.svg'
            )

        elif export_format == 'png':
            # Конвертируем SVG в PNG
            import cairosvg

            png_data = cairosvg.svg2png(bytestring=svg_content.encode())

            return send_file(
                BytesIO(png_data),
                mimetype='image/png',
                as_attachment=True,
                download_name='vector_image.png'
            )

        elif export_format == 'vdraw':
            # Собственный формат (JSON)
            project_data = {
                'version': '1.0',
                'type': 'vector',
                'svg': svg_content,
                'size': session.get('canvas_size', {'width': 800, 'height': 600}),
                'history': session.get('vector_history', []),
                'timestamp': datetime.now().isoformat()
            }

            return send_file(
                BytesIO(json.dumps(project_data, ensure_ascii=False).encode()),
                mimetype='application/json',
                as_attachment=True,
                download_name='project.vdraw'
            )

        return jsonify({'success': False, 'error': 'Неверный формат экспорта'}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

#Трассировка растрового изображения в вектор
@app.route('/vector/trace', methods=['POST'])
def trace_image_to_vector():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Файл не загружен'}), 400

        file = request.files['file']
        threshold = float(request.form.get('threshold', 0.5))

        # Загружаем изображение
        img = Image.open(file).convert('L')  # Конвертируем в градации серого

        # Применяем пороговое значение для создания маски
        img_array = np.array(img)
        binary_array = (img_array > (threshold * 255)).astype(np.uint8) * 255

        # Конвертируем в SVG (упрощенная трассировка)
        height, width = binary_array.shape

        dwg = svgwrite.Drawing(size=(f"{width}px", f"{height}px"))

        #создаем прямоугольники для черных пикселей
        for y in range(0, height, 5):
            for x in range(0, width, 5):
                if binary_array[y, x] < 128:
                    dwg.add(dwg.rect(insert=(x, y), size=(5, 5),
                                     fill='black', stroke='none'))

        svg_content = dwg.tostring()

        return jsonify({'success': True, 'svg': svg_content})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

#Создание SVG анимации
@app.route('/vector/animate', methods=['POST'])
def create_animation():
    try:
        element_id = request.form.get('element_id')
        animation_type = request.form.get('type')
        duration = float(request.form.get('duration', 2))

        current_svg = session.get('vector_canvas', '')
        if not current_svg:
            return jsonify({'success': False, 'error': 'Нет активного холста'}), 400

        root = ET.fromstring(current_svg)

        # Ищем элемент
        target_elem = None
        for elem in root.iter():
            if elem.get('id') == element_id:
                target_elem = elem
                break

        if target_elem is None:
            return jsonify({'success': False, 'error': 'Элемент не найден'}), 404

        # Добавляем анимацию
        if animation_type == 'translate':
            anim = ET.Element('animateTransform', {
                'attributeName': 'transform',
                'type': 'translate',
                'from': '0,0',
                'to': '100,50',
                'dur': f'{duration}s',
                'repeatCount': 'indefinite'
            })
            target_elem.append(anim)

        elif animation_type == 'rotate':
            anim = ET.Element('animateTransform', {
                'attributeName': 'transform',
                'type': 'rotate',
                'from': '0',
                'to': '360',
                'dur': f'{duration}s',
                'repeatCount': 'indefinite'
            })
            target_elem.append(anim)

        elif animation_type == 'scale':
            anim = ET.Element('animateTransform', {
                'attributeName': 'transform',
                'type': 'scale',
                'from': '1',
                'to': '1.5',
                'dur': f'{duration}s',
                'repeatCount': 'indefinite',
                'values': '1;1.5;1',
                'keyTimes': '0;0.5;1',
                'calcMode': 'spline',
                'keySplines': '0.5 0 0.5 1; 0.5 0 0.5 1'
            })
            target_elem.append(anim)

        # Обновляем сессию
        new_svg = ET.tostring(root, encoding='unicode')
        session['vector_canvas'] = new_svg

        return jsonify({'success': True, 'svg': new_svg})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/hello/<name>')
def hello(name):
  return render_template('test_hello.html', name=name)


if __name__ == '__main__':
    app.run(debug=True)
