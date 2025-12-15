// static/scripts/error_scripts.js

// Автоматическое отображение модального окна с ошибкой
document.addEventListener('DOMContentLoaded', function() {
    const errorModal = document.getElementById('errorModal');
    if (errorModal) {
        // Показываем модальное окно с ошибкой
        setTimeout(() => {
            errorModal.style.display = 'block';
        }, 100);
        
        // Закрытие модального окна
        const closeBtn = errorModal.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                errorModal.style.display = 'none';
            });
        }
        
        // Закрытие при клике вне окна
        window.addEventListener('click', function(event) {
            if (event.target === errorModal) {
                errorModal.style.display = 'none';
            }
        });
    }
    
    // Тестирование API при загрузке
    testApiConnection();
});

// Функция для тестирования соединения с API
async function testApiConnection() {
    try {
        const response = await fetch('/api/test');
        if (!response.ok) {
            console.warn('API test failed:', response.status);
        } else {
            const data = await response.json();
            console.log('API test successful:', data.message);
        }
    } catch (error) {
        console.error('API connection test failed:', error);
        console.log('Совет: Убедитесь, что сервер Flask запущен на порту 5000');
    }
}