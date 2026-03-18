#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QStackedWidget>
#include <QSettings>
#include "models/models.h"

class LoginWidget;
class ChatWidget;

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void onLoginSuccess(const User &user);
    void onLogout();

private:
    void setupUi();
    void loadSettings();
    void saveSettings();
    
    QStackedWidget *m_stackedWidget;
    LoginWidget *m_loginWidget;
    ChatWidget *m_chatWidget;
    QSettings *m_settings;
    User m_currentUser;
};

#endif // MAINWINDOW_H