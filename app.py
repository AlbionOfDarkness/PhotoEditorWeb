from flask import Flask, render_template, redirect, url_for, request
# Flask - библиотека для запуска нашего приложения Flask - app
# render_template - нужен для то чтобы ваша страница html отобразилась корреткно
# redirect - нам понадобится для обработки запросы формы где мы перенаприм пользователя на страницу админ панели
# url_for - вспомогательна библиотека для того чтобы сделать правильный переход по ссылке в нашем случеш мы будем ссылаться на adm_panel
# request - обработчик запросов GET/POST и дргуих 

app = Flask(__name__)
@app.route('/')
def index():
    return render_template("index.html")


# @app.route('/choose_option/<option_path>')
# def change_option(option_path):
#   return render_template("index.html", option_top_div=option_path)

@app.route('/choose_option')
def choose_option():
    # Получаем GET-параметр 'file'
    file_path = request.args.get('file')  # вернет None, если параметр отсутствует

    if not file_path:
        return "Файл не указан!", 400  # ошибка, если нет параметра

    # Подключаем нужный файл (например, через render_template)
    return render_template("index.html", option_top_div=file_path)


@app.route('/hello/<name>')
def hello(name):
  return render_template('test_hello.html', name=name)

if __name__ == '__main__':
    app.run(debug=True)
