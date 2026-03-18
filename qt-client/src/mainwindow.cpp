#include "mainwindow.h"
#include "loginwidget.h"
#include "chatwidget.h"
#include "api/apiclient.h"
#include <QApplication>
#include <QCloseEvent>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , m_settings(new QSettings("InternalChat", "InternalChat", this))
{
    setupUi();
    loadSettings();
}

MainWindow::~MainWindow()
{
    saveSettings();
}

void MainWindow::setupUi()
{
    setWindowTitle("内网聊天");
    setMinimumSize(900, 600);
    resize(1100, 700);
    
    // 创建堆叠窗口
    m_stackedWidget = new QStackedWidget(this);
    setCentralWidget(m_stackedWidget);
    
    // 创建登录窗口
    m_loginWidget = new LoginWidget(this);
    m_stackedWidget->addWidget(m_loginWidget);
    
    // 创建聊天窗口
    m_chatWidget = new ChatWidget(this);
    m_stackedWidget->addWidget(m_chatWidget);
    
    // 连接信号
    connect(m_loginWidget, &LoginWidget::loginSuccess, this, &MainWindow::onLoginSuccess);
    connect(m_chatWidget, &ChatWidget::logoutRequested, this, &MainWindow::onLogout);
    
    // 默认显示登录窗口
    m_stackedWidget->setCurrentWidget(m_loginWidget);
}

void MainWindow::loadSettings()
{
    // 加载服务器地址
    QString serverUrl = m_settings->value("server/url", "http://192.168.1.39:3002/api").toString();
    ApiClient::instance()->setBaseUrl(serverUrl);
    
    // 加载窗口大小
    restoreGeometry(m_settings->value("window/geometry").toByteArray());
    restoreState(m_settings->value("window/state").toByteArray());
    
    // 加载 token
    QString token = m_settings->value("auth/token").toString();
    if (!token.isEmpty()) {
        ApiClient::instance()->setToken(token);
        // 验证 token 是否有效
        ApiClient::instance()->getMe([this](bool success, const QJsonObject &data) {
            if (success) {
                m_currentUser = User::fromJson(data);
                m_chatWidget->setCurrentUser(m_currentUser);
                m_stackedWidget->setCurrentWidget(m_chatWidget);
            }
        });
    }
}

void MainWindow::saveSettings()
{
    m_settings->setValue("window/geometry", saveGeometry());
    m_settings->setValue("window/state", saveState());
    m_settings->setValue("auth/token", ApiClient::instance()->token());
}

void MainWindow::onLoginSuccess(const User &user)
{
    m_currentUser = user;
    m_chatWidget->setCurrentUser(user);
    m_stackedWidget->setCurrentWidget(m_chatWidget);
}

void MainWindow::onLogout()
{
    m_currentUser = User();
    ApiClient::instance()->setToken("");
    m_settings->remove("auth/token");
    m_stackedWidget->setCurrentWidget(m_loginWidget);
}

void MainWindow::closeEvent(QCloseEvent *event)
{
    saveSettings();
    event->accept();
}