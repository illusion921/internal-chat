#ifndef LOGINWIDGET_H
#define LOGINWIDGET_H

#include <QWidget>
#include <QLineEdit>
#include <QPushButton>
#include <QLabel>
#include <QCheckBox>
#include "models/models.h"

class LoginWidget : public QWidget
{
    Q_OBJECT

public:
    explicit LoginWidget(QWidget *parent = nullptr);

signals:
    void loginSuccess(const User &user);

private slots:
    void onLoginClicked();
    void onRegisterClicked();
    void onSettingsClicked();

private:
    void setupUi();
    void loadSettings();
    void saveSettings();
    
    QLineEdit *m_serverEdit;
    QLineEdit *m_usernameEdit;
    QLineEdit *m_passwordEdit;
    QLineEdit *m_nicknameEdit;
    QPushButton *m_loginBtn;
    QPushButton *m_registerBtn;
    QPushButton *m_settingsBtn;
    QCheckBox *m_rememberCheck;
    
    bool m_isRegisterMode;
};

#endif // LOGINWIDGET_H