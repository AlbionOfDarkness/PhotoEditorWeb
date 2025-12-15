from flask import Flask, render_template, jsonify, request, send_file, session
from os import makedirs
import cv2
import numpy as np
import trimesh
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

import secrets
app.secret_key = secrets.token_hex(32)


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


# 3d начинается здесь
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import json
import os
from datetime import datetime
import trimesh
import tempfile
import traceback

# Папка для сохранения сцен
SCENES_FOLDER = 'saved_scenes'
os.makedirs(SCENES_FOLDER, exist_ok=True)

@app.route('/main3d')
def main3d():
    return render_template('main3d.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/save_scene', methods=['POST'])
def save_scene():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Нет данных'}), 400
        
        # Генерируем уникальное имя файла
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scene_{timestamp}.json"
        filepath = os.path.join(SCENES_FOLDER, filename)
        
        # Сохраняем данные сцены
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True, 
            'filename': filename,
            'message': 'Сцена успешно сохранена'
        })
    
    except Exception as e:
        print(f"Save scene error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/load_scene', methods=['POST'])
def load_scene():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Нет данных'}), 400
        
        filename = data.get('filename')
        if not filename:
            return jsonify({'success': False, 'error': 'Не указано имя файла'}), 400
        
        filepath = os.path.join(SCENES_FOLDER, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Файл не найден'}), 404
        
        with open(filepath, 'r', encoding='utf-8') as f:
            scene_data = json.load(f)
        
        return jsonify({'success': True, 'scene': scene_data})
    
    except Exception as e:
        print(f"Load scene error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/list_scenes', methods=['GET'])
def list_scenes():
    try:
        scenes = []
        for filename in os.listdir(SCENES_FOLDER):
            if filename.endswith('.json'):
                filepath = os.path.join(SCENES_FOLDER, filename)
                created_time = os.path.getctime(filepath)
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        scene_data = json.load(f)
                    
                    scenes.append({
                        'filename': filename,
                        'name': scene_data.get('name', filename.replace('.json', '')),
                        'created': datetime.fromtimestamp(created_time).strftime('%Y-%m-%d %H:%M:%S'),
                        'objects_count': len(scene_data.get('objects', [])),
                        'scene_size': scene_data.get('sceneSize', {'width': 10, 'height': 10, 'depth': 10})
                    })
                except Exception as e:
                    print(f"Error reading scene file {filename}: {e}")
                    continue
        
        # Сортируем по дате создания (новые сверху)
        scenes.sort(key=lambda x: x['created'], reverse=True)
        
        return jsonify({'success': True, 'scenes': scenes})
    
    except Exception as e:
        print(f"List scenes error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/export_scene', methods=['POST'])
def export_scene():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Нет данных'}), 400
        
        format_type = request.args.get('format', 'obj')
        
        if format_type == 'obj':
            return export_to_obj(data)
        elif format_type == 'stl':
            return export_to_stl(data)
        elif format_type == 'ply':
            return export_to_ply(data)
        else:
            return jsonify({'success': False, 'error': 'Неподдерживаемый формат'}), 400
    
    except Exception as e:
        print(f"Export scene error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Ошибка экспорта: {str(e)}'}), 500

def create_mesh_from_object(obj):
    """Создает mesh из данных объекта"""
    try:
        mesh = None
        
        obj_type = obj.get('type', 'cube')
        
        if obj_type == 'cube':
            # Создаем куб
            mesh = trimesh.creation.box([
                obj.get('scale', {}).get('x', 1),
                obj.get('scale', {}).get('y', 1), 
                obj.get('scale', {}).get('z', 1)
            ])
        elif obj_type == 'sphere':
            # Создаем сферу
            radius = obj.get('scale', {}).get('x', 1) * 0.5
            mesh = trimesh.creation.icosphere(
                subdivisions=2,
                radius=radius
            )
        elif obj_type == 'cylinder':
            # Создаем цилиндр
            radius = obj.get('scale', {}).get('x', 1) * 0.5
            height = obj.get('scale', {}).get('y', 1)
            mesh = trimesh.creation.cylinder(
                radius=radius,
                height=height,
                sections=16
            )
        elif obj_type == 'cone':
            # Создаем конус
            radius = obj.get('scale', {}).get('x', 1) * 0.5
            height = obj.get('scale', {}).get('y', 1)
            mesh = trimesh.creation.cone(
                radius=radius,
                height=height,
                sections=16
            )
        elif obj_type == 'torus':
            # Создаем тор
            major_radius = obj.get('scale', {}).get('x', 1) * 0.5
            minor_radius = obj.get('scale', {}).get('x', 1) * 0.2
            mesh = trimesh.creation.torus(
                major_radius=major_radius,
                minor_radius=minor_radius,
                sections=16,
                revolutions=16
            )
        elif obj_type == 'plane':
            # Создаем плоскость
            mesh = trimesh.creation.box([
                obj.get('scale', {}).get('x', 5),
                0.1,
                obj.get('scale', {}).get('z', 5)
            ])
        else:
            # По умолчанию создаем куб
            mesh = trimesh.creation.box([1, 1, 1])
        
        if mesh is not None:
            # Применяем трансформации
            position = obj.get('position', {})
            translation = [
                position.get('x', 0),
                position.get('y', 0),
                position.get('z', 0)
            ]
            
            rotation = obj.get('rotation', {})
            # Конвертируем из градусов в радианы
            rx = rotation.get('x', 0) * np.pi / 180
            ry = rotation.get('y', 0) * np.pi / 180
            rz = rotation.get('z', 0) * np.pi / 180
            
            # Создаем матрицу вращения
            rot_matrix = trimesh.transformations.euler_matrix(rx, ry, rz)
            
            # Создаем матрицу трансляции
            trans_matrix = trimesh.transformations.translation_matrix(translation)
            
            # Комбинируем трансформации
            transform = np.dot(trans_matrix, rot_matrix)
            mesh.apply_transform(transform)
            
            # Применяем цвет
            color = obj.get('color', 0xFFFFFF)
            if isinstance(color, int):
                # Конвертируем из int в hex
                hex_color = f"#{color:06x}"
            else:
                hex_color = str(color)
            
            # Конвертируем hex в RGB
            hex_color = hex_color.lstrip('#')
            if len(hex_color) == 6:
                rgb = tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))
                # Применяем цвет ко всем вершинам
                mesh.visual.vertex_colors = rgb + (obj.get('opacity', 1.0),)
        
        return mesh
        
    except Exception as e:
        print(f"Error creating mesh: {str(e)}")
        traceback.print_exc()
        return None

def export_to_obj(data):
    """Экспорт сцены в формат OBJ"""
    temp_file = None
    try:
        objects = data.get('objects', [])
        if not objects:
            # Создаем простой куб если нет объектов
            mesh = trimesh.creation.box([1, 1, 1])
        else:
            combined_mesh = None
            
            for i, obj in enumerate(objects):
                mesh = create_mesh_from_object(obj)
                if mesh is not None:
                    if combined_mesh is None:
                        combined_mesh = mesh
                    else:
                        combined_mesh += mesh
            
            if combined_mesh is None:
                mesh = trimesh.creation.box([1, 1, 1])
            else:
                mesh = combined_mesh
        
        # Создаем временный файл
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.obj', mode='wb')
        temp_file.close()
        
        # Экспортируем
        mesh.export(temp_file.name, file_type='obj')
        
        # Отправляем файл
        response = send_file(
            temp_file.name,
            mimetype='text/plain',
            as_attachment=True,
            download_name=f"scene_{datetime.now().strftime('%Y%m%d_%H%M%S')}.obj"
        )
        
        # Удаляем временный файл после отправки
        @response.call_on_close
        def cleanup():
            try:
                if temp_file and os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
            except:
                pass
        
        return response
    
    except Exception as e:
        # Очистка в случае ошибки
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except:
                pass
        raise e

def export_to_stl(data):
    """Экспорт сцены в формат STL"""
    temp_file = None
    try:
        objects = data.get('objects', [])
        if not objects:
            mesh = trimesh.creation.box([1, 1, 1])
        else:
            combined_mesh = None
            
            for obj in objects:
                mesh = create_mesh_from_object(obj)
                if mesh is not None:
                    if combined_mesh is None:
                        combined_mesh = mesh
                    else:
                        combined_mesh += mesh
            
            if combined_mesh is None:
                mesh = trimesh.creation.box([1, 1, 1])
            else:
                mesh = combined_mesh
        
        # Создаем временный файл
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.stl', mode='wb')
        temp_file.close()
        
        # Экспортируем
        mesh.export(temp_file.name, file_type='stl')
        
        # Отправляем файл
        response = send_file(
            temp_file.name,
            mimetype='application/sla',
            as_attachment=True,
            download_name=f"scene_{datetime.now().strftime('%Y%m%d_%H%M%S')}.stl"
        )
        
        # Удаляем временный файл после отправки
        @response.call_on_close
        def cleanup():
            try:
                if temp_file and os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
            except:
                pass
        
        return response
    
    except Exception as e:
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except:
                pass
        raise e

def export_to_ply(data):
    """Экспорт сцены в формат PLY"""
    temp_file = None
    try:
        objects = data.get('objects', [])
        if not objects:
            mesh = trimesh.creation.box([1, 1, 1])
        else:
            combined_mesh = None
            
            for obj in objects:
                mesh = create_mesh_from_object(obj)
                if mesh is not None:
                    if combined_mesh is None:
                        combined_mesh = mesh
                    else:
                        combined_mesh += mesh
            
            if combined_mesh is None:
                mesh = trimesh.creation.box([1, 1, 1])
            else:
                mesh = combined_mesh
        
        # Создаем временный файл
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.ply', mode='wb')
        temp_file.close()
        
        # Экспортируем
        mesh.export(temp_file.name, file_type='ply')
        
        # Отправляем файл
        response = send_file(
            temp_file.name,
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=f"scene_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ply"
        )
        
        # Удаляем временный файл после отправки
        @response.call_on_close
        def cleanup():
            try:
                if temp_file and os.path.exists(temp_file.name):
                    os.unlink(temp_file.name)
            except:
                pass
        
        return response
    
    except Exception as e:
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except:
                pass
        raise e

@app.route('/api/test', methods=['GET'])
def test_api():
    """Тестовый endpoint для проверки работы API"""
    return jsonify({
        'success': True,
        'message': 'API работает',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    # Создаем тестовую сцену при первом запуске
    test_scene_path = os.path.join(SCENES_FOLDER, 'test_scene.json')
    if not os.path.exists(test_scene_path):
        test_scene = {
            'name': 'Тестовая сцена',
            'sceneSize': {'width': 10, 'height': 10, 'depth': 10},
            'objects': [
                {
                    'type': 'cube',
                    'name': 'Тестовый куб',
                    'position': {'x': 0, 'y': 0.5, 'z': 0},
                    'rotation': {'x': 0, 'y': 0, 'z': 0},
                    'scale': {'x': 1, 'y': 1, 'z': 1},
                    'color': 0x2196f3,
                    'opacity': 1.0
                }
            ]
        }
        with open(test_scene_path, 'w', encoding='utf-8') as f:
            json.dump(test_scene, f, ensure_ascii=False, indent=2)
        print(f"Создана тестовая сцена: {test_scene_path}")
    
    print(f"Сервер запущен: http://localhost:5000")
    print(f"Папка сцен: {SCENES_FOLDER}")
    app.run(debug=True, port=5000)
    
@app.route('/hello/<name>')
def hello(name):
  return render_template('test_hello.html', name=name)


# if __name__ == '__main__':
#     app.run(debug=True)
