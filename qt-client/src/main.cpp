#include <QApplication>
#include <QFile>
#include <QFont>
#include "mainwindow.h"

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    
    // 设置应用信息
    app.setApplicationName("内网聊天");
    app.setApplicationVersion("1.0.0");
    app.setOrganizationName("InternalChat");
    
    // 加载样式
    QFile styleFile(":/styles/style.qss");
    if (styleFile.open(QFile::ReadOnly)) {
        QString styleSheet = QLatin1String(styleFile.readAll());
        app.setStyleSheet(styleSheet);
        styleFile.close();
    }
    
    // 设置默认字体
    QFont font("Microsoft YaHei", 9);
    app.setFont(font);
    
    // 创建主窗口
    MainWindow window;
    window.show();
    
    return app.exec();
}