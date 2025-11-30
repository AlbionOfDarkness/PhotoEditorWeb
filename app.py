from flask import Flask
from flask import render_template

app = Flask(__name__)
@app.route('/')
def index():
    return 'Hello, world!'

@app.route('/about')
def about():
  return 'This is the about page'

@app.route('/user/<username>')
def show_user_profile(username):
  return f'User {username}'

@app.route('/hello/<name>')
def hello(name):
  return render_template('test_hello.html', name=name)

if __name__ == '__main__':
    app.run(debug=True)
