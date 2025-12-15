// Функции импорта и экспорта SVG
console.log('SVG Import/Export loaded');

const SVGImportExport = {
    // Импорт SVG файла
    importSVGFromFile: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    // Экспорт SVG в файл
    exportSVGToFile: function(svgElement, filename = 'vector_image.svg') {
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgElement);

        // Добавляем XML декларацию если её нет
        if (!source.match(/^<\?xml/)) {
            const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
            const doctype = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
            const finalSource = xmlDeclaration + doctype + source;

            const blob = new Blob([finalSource], { type: 'image/svg+xml;charset=utf-8' });
            this.downloadFile(blob, filename);
        } else {
            const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
            this.downloadFile(blob, filename);
        }
    },

    // Экспорт в PNG
    exportToPNG: function(svgElement, width, height, filename = 'vector_image.png') {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = width || svgElement.clientWidth;
            canvas.height = height || svgElement.clientHeight;

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const img = new Image();
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = function() {
                // Белый фон для PNG
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                canvas.toBlob(function(blob) {
                    SVGImportExport.downloadFile(blob, filename);
                    resolve();
                }, 'image/png');
            };

            img.onerror = reject;
            img.src = url;
        });
    },

    // Экспорт в JPEG
    exportToJPEG: function(svgElement, width, height, filename = 'vector_image.jpg', quality = 0.95) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = width || svgElement.clientWidth;
            canvas.height = height || svgElement.clientHeight;

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const img = new Image();
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = function() {
                // Белый фон для JPEG
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Рисуем SVG
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                canvas.toBlob(function(blob) {
                    SVGImportExport.downloadFile(blob, filename);
                    resolve();
                }, 'image/jpeg', quality);
            };

            img.onerror = reject;
            img.src = url;
        });
    },

    // Скачивание файла
    downloadFile: function(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    },

    // Сохранение проекта в JSON
    saveProject: function(svgElement, projectName = 'project') {
        const serializer = new XMLSerializer();
        const svgContent = serializer.serializeToString(svgElement);

        const project = {
            name: projectName,
            svg: svgContent,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `${projectName}.vdraw`);
    },

    // Загрузка проекта из JSON
    loadProject: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const project = JSON.parse(e.target.result);
                    resolve(project.svg);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
};

// Экспортируем объект
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SVGImportExport;
} else {
    window.SVGImportExport = SVGImportExport;
}