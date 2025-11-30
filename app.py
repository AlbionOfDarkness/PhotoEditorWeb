from flask import Flask, render_template, redirect, url_for, request, send_file
from os import makedirs
import cv2
# Flask - библиотека для запуска нашего приложения Flask - app
# render_template - нужен для то чтобы ваша страница html отобразилась корреткно
# redirect - нам понадобится для обработки запросы формы где мы перенаприм пользователя на страницу админ панели
# url_for - вспомогательна библиотека для того чтобы сделать правильный переход по ссылке в нашем случеш мы будем ссылаться на adm_panel
# request - обработчик запросов GET/POST и дргуих 


def get_actual_index():
  index = "index.html"
  context = {}
  if top_option != "":
    context["option_top_div"] = top_option
  if path_to_current_image != "":
    context["content"] = "contents/image_display.html"
    context["image_path"] = path_to_current_image
  return render_template(index, **context)

app = Flask(__name__)

@app.route('/')
def index():
    return render_template("index.html")



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
        return "Файл не указан!", 500  # TODO поменять на модалку

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
    return "Файл не получен" # TODO поменять на модалку

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
  return "Изображение не найдено", 404 # TODO поменять на модалку
  

    

@app.route('/hello/<name>')
def hello(name):
  return render_template('test_hello.html', name=name)

@app.route('/error', methods=['POST'])
def error():
    return render_template('index.html', error="Неправильный форма akdjfbjnadsfnalkdsfnkja fffffffffff fffffffff ffndslkfnak sdnfadnsjflknajт")

if __name__ == '__main__':
    app.run(debug=True)
